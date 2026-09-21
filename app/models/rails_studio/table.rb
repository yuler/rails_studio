# frozen_string_literal: true

require "concurrent"

module RailsStudio
  class Table
    attr_reader :name

    MODEL_CACHE = Concurrent::Map.new

    class << self
      def all
        Database.current.tables
      end

      def find(name)
        table = new(name)
        table.ensure_exists!
        table
      end

      def exists?(name)
        excluded = RailsStudio.configuration.excluded_tables
        (connection.tables - excluded).include?(name.to_s)
      end

      def connection
        ActiveRecord::Base.connection
      end

      def clear_cache!
        MODEL_CACHE.clear
      end
    end

    def initialize(name)
      @name = name.to_s
    end

    def connection
      self.class.connection
    end

    def ensure_exists!
      unless self.class.exists?(name)
        raise ActiveRecord::RecordNotFound, "Table '#{name}' not found or excluded."
      end
    end

    def primary_keys
      @primary_keys ||= begin
        if connection.respond_to?(:primary_keys)
          Array(connection.primary_keys(name)).map(&:to_s).compact
        else
          Array(connection.primary_key(name)).map(&:to_s).compact
        end
      rescue StandardError
        Array(connection.primary_key(name)).map(&:to_s).compact rescue []
      end
    end

    def columns
      @columns ||= connection.columns(name) rescue []
    end

    def row_count
      quoted = connection.quote_table_name(name)
      connection.select_value("SELECT COUNT(*) FROM #{quoted}").to_i
    rescue StandardError
      0
    end

    def summary
      {
        name: name,
        row_count: row_count,
        columns_count: columns.size,
        primary_keys: primary_keys,
        foreign_keys_count: foreign_keys.size
      }
    end

    def schema
      pks = primary_keys
      fks = foreign_keys
      model = app_model
      enums = model&.respond_to?(:defined_enums) ? (model.defined_enums rescue {}) : {}

      columns_data = columns.map do |col|
        fk_info = fks.find { |fk| fk[:column].to_s == col.name.to_s }
        is_pk = pks.include?(col.name.to_s)
        col_enums = enums[col.name.to_s]&.keys || enums[col.name.to_sym]&.keys

        {
          name: col.name,
          type: col.type.to_s,
          sql_type: col.sql_type.to_s,
          null: col.null,
          default: col.default,
          comment: col.respond_to?(:comment) ? col.comment : nil,
          primary: is_pk,
          foreign_key: fk_info,
          enum_values: col_enums
        }
      end

      {
        table_name: name,
        primary_keys: pks,
        columns: columns_data,
        foreign_keys: fks,
        associations: associations,
        indexes: indexes,
        row_count: row_count
      }
    end

    def foreign_keys
      @foreign_keys ||= begin
        fks = connection.foreign_keys(name) rescue []
        result = fks.map do |fk|
          {
            column: fk.options[:column] || fk.column,
            to_table: fk.to_table,
            primary_key: fk.primary_key || "id",
            name: fk.name
          }
        end

        if model = app_model
          model.reflect_on_all_associations(:belongs_to).each do |assoc|
            fk_col = assoc.foreign_key.to_s
            next if result.any? { |f| f[:column].to_s == fk_col }

            target_table = assoc.klass.table_name rescue assoc.plural_name
            target_pk = assoc.klass.primary_key rescue "id"
            result << {
              column: fk_col,
              to_table: target_table.to_s,
              primary_key: target_pk.to_s,
              name: "assoc_#{assoc.name}",
              inferred: true
            }
          end
        end

        result
      end
    end

    def associations
      return [] unless model = app_model

      model.reflect_on_all_associations.map do |assoc|
        {
          name: assoc.name.to_s,
          macro: assoc.macro.to_s,
          foreign_key: assoc.foreign_key.to_s,
          target_table: (assoc.klass.table_name rescue assoc.plural_name).to_s,
          polymorphic: assoc.polymorphic?
        }
      end rescue []
    end

    def indexes
      connection.indexes(name).map do |idx|
        {
          name: idx.name,
          columns: Array(idx.columns).map(&:to_s),
          unique: idx.unique
        }
      end rescue []
    end

    def app_model
      @app_model ||= begin
        found = ActiveRecord::Base.descendants.find { |m| !m.abstract_class? && m.table_name == name }
        if found
          found
        else
          candidate_name = name.singularize.camelize
          candidate = candidate_name.safe_constantize
          candidate if candidate && candidate < ActiveRecord::Base && candidate.table_name == name
        end
      end
    end

    def dynamic_model
      target_table_name = name
      MODEL_CACHE.compute_if_absent(target_table_name) do
        pks = primary_keys
        existing_model = app_model

        parent_class = if existing_model && existing_model < ActiveRecord::Base && existing_model.respond_to?(:connection_pool) && existing_model.connection_specification_name != ActiveRecord::Base.connection_specification_name
                         Class.new(ActiveRecord::Base) do
                           self.abstract_class = true
                           establish_connection existing_model.connection_pool.db_config
                         end
        else
                         ActiveRecord::Base
        end

        Class.new(parent_class) do
          self.table_name = target_table_name
          self.inheritance_column = nil

          if pks.size == 1
            self.primary_key = pks.first
          elsif pks.size > 1
            self.primary_key = pks
          end
        end
      end
    end

    def records(page: 1, per_page: 50, sort_by: nil, sort_order: "asc", filters: [])
      model = dynamic_model
      valid_cols = model.column_names

      page = [ page.to_i, 1 ].max
      per_page_config = RailsStudio.configuration.default_per_page
      max_per_page = RailsStudio.configuration.max_per_page
      per_page = [ [ (per_page || per_page_config).to_i, 1 ].max, max_per_page ].min

      scope = model.all
      scope = apply_filters(scope, model, valid_cols, filters)

      total_count = scope.count rescue 0

      if sort_by.present? && valid_cols.include?(sort_by.to_s)
        direction = sort_order.to_s.downcase == "desc" ? :desc : :asc
        scope = scope.order(model.arel_table[sort_by.to_sym].send(direction))
      else
        pks = Array(model.primary_key)
        if pks.present? && pks.all? { |k| valid_cols.include?(k.to_s) }
          order_hash = pks.each_with_object({}) { |pk, h| h[pk.to_sym] = :desc }
          scope = scope.order(order_hash)
        end
      end

      offset = (page - 1) * per_page
      record_list = scope.limit(per_page).offset(offset).to_a
      total_pages = (total_count.to_f / per_page).ceil

      {
        records: record_list.map(&:attributes),
        total_count: total_count,
        page: page,
        per_page: per_page,
        total_pages: [ total_pages, 1 ].max
      }
    end

    def find_record(id)
      record = find_by_id(dynamic_model, id)
      record&.attributes
    end

    def find_record!(id)
      find_by_id!(dynamic_model, id)
    end

    def create_record(attributes)
      ensure_writable!
      model = dynamic_model
      sanitized = sanitize_attributes(model, attributes)
      record = model.new(sanitized)
      record.save!
      record.attributes
    end

    def update_record(id, attributes)
      ensure_writable!
      model = dynamic_model
      record = find_record!(id)
      sanitized = sanitize_attributes(model, attributes)
      record.assign_attributes(sanitized)
      record.save!
      record.attributes
    end

    def destroy_record(id)
      ensure_writable!
      record = find_record!(id)
      record.destroy!
      true
    end

    def batch_process(updates: [], creates: [], deletes: [])
      ensure_writable!
      model = dynamic_model
      results = { updated: 0, created: 0, deleted: 0 }

      ActiveRecord::Base.transaction do
        Array(deletes).each do |id|
          record = find_by_id(model, id)
          if record
            record.destroy!
            results[:deleted] += 1
          end
        end

        Array(updates).each do |item|
          id = item[:id] || item["id"]
          changes = item[:changes] || item["changes"] || {}
          next if id.blank? || changes.blank?

          record = find_by_id!(model, id)
          sanitized = sanitize_attributes(model, changes)
          record.assign_attributes(sanitized)
          record.save!
          results[:updated] += 1
        end

        Array(creates).each do |item|
          next if item.blank?

          sanitized = sanitize_attributes(model, item)
          record = model.new(sanitized)
          record.save!
          results[:created] += 1
        end
      end

      results
    end

    private

    def ensure_writable!
      if RailsStudio.configuration.read_only?
        raise RailsStudio::ReadOnlyError, "Rails Studio is currently in read-only mode."
      end
    end

    def find_by_id(model, id)
      pks = Array(model.primary_key)
      if pks.size <= 1
        model.find_by(model.primary_key => id)
      else
        id_hash = parse_composite_id(pks, id)
        model.find_by(id_hash)
      end
    end

    def find_by_id!(model, id)
      record = find_by_id(model, id)
      raise ActiveRecord::RecordNotFound, "Record with id #{id.inspect} not found in #{name}" unless record

      record
    end

    def parse_composite_id(pks, id)
      if id.is_a?(String) && id.start_with?("{") && id.end_with?("}")
        parsed = JSON.parse(id) rescue nil
        id = parsed if parsed.is_a?(Hash)
      end

      id = id.to_unsafe_h if id.respond_to?(:to_unsafe_h)

      if id.is_a?(Hash)
        id.symbolize_keys.slice(*pks.map(&:to_sym))
      elsif id.is_a?(Array)
        pks.each_with_index.each_with_object({}) { |(pk, i), h| h[pk.to_sym] = id[i] }
      elsif id.is_a?(String) && id.include?(",")
        parts = id.split(",", pks.size)
        pks.each_with_index.each_with_object({}) { |(pk, i), h| h[pk.to_sym] = parts[i] }
      else
        { pks.first.to_sym => id }
      end
    end

    def sanitize_attributes(model, attributes)
      attributes = attributes.to_unsafe_h if attributes.respond_to?(:to_unsafe_h)
      return {} unless attributes.is_a?(Hash)

      valid_cols = model.column_names
      cols_map = model.columns_hash
      enums = (app_model&.defined_enums rescue {}) || {}

      attributes.each_with_object({}) do |(key, value), hash|
        col_name = key.to_s
        next unless valid_cols.include?(col_name)

        col = cols_map[col_name]
        hash[col_name] = cast_value_for_column(col, value, enums[col_name] || enums[col_name.to_sym])
      end
    end

    def cast_value_for_column(col, value, enum_mapping = nil)
      return nil if value.nil? || (value == "" && col.null && col.type != :string && col.type != :text)

      if enum_mapping.is_a?(Hash)
        str_val = value.to_s
        return enum_mapping[str_val] if enum_mapping.key?(str_val)
      end

      case col.type
      when :json, :jsonb
        value.is_a?(String) ? (JSON.parse(value) rescue value) : value
      when :boolean
        ActiveModel::Type::Boolean.new.cast(value)
      when :integer
        value.to_s.strip.to_i rescue value
      when :float, :decimal
        value.to_s.strip.to_f rescue value
      else
        value
      end
    end

    def apply_filters(scope, model, valid_cols, filters)
      return scope if filters.blank?

      arel = model.arel_table
      is_postgres = scope.connection.adapter_name =~ /postgres/i

      filters.each do |filter|
        next unless filter.is_a?(Hash)

        col = filter[:column] || filter["column"]
        op = (filter[:op] || filter["op"]).to_s.downcase
        val = filter[:value] || filter["value"]

        next unless valid_cols.include?(col.to_s)

        col_arel = arel[col.to_sym]
        col_meta = model.columns_hash[col.to_s]
        col_type = col_meta&.type
        casted_val = cast_filter_value(col_type, val)

        case op
        when "eq", "="
          scope = scope.where(col_arel.eq(casted_val))
        when "not_eq", "!="
          scope = scope.where(col_arel.not_eq(casted_val))
        when "contains", "like"
          sanitized = ActiveRecord::Base.sanitize_sql_like(val.to_s)
          scope = if is_postgres
                    scope.where(col_arel.matches("%#{sanitized}%", nil, false))
          else
                    scope.where(col_arel.matches("%#{sanitized}%"))
          end
        when "starts_with"
          sanitized = ActiveRecord::Base.sanitize_sql_like(val.to_s)
          scope = if is_postgres
                    scope.where(col_arel.matches("#{sanitized}%", nil, false))
          else
                    scope.where(col_arel.matches("#{sanitized}%"))
          end
        when "ends_with"
          sanitized = ActiveRecord::Base.sanitize_sql_like(val.to_s)
          scope = if is_postgres
                    scope.where(col_arel.matches("%#{sanitized}", nil, false))
          else
                    scope.where(col_arel.matches("%#{sanitized}"))
          end
        when "gt", ">"
          scope = scope.where(col_arel.gt(casted_val))
        when "gte", ">="
          scope = scope.where(col_arel.gteq(casted_val))
        when "lt", "<"
          scope = scope.where(col_arel.lt(casted_val))
        when "lte", "<="
          scope = scope.where(col_arel.lteq(casted_val))
        when "is_null"
          scope = scope.where(col_arel.eq(nil))
        when "is_not_null"
          scope = scope.where(col_arel.not_eq(nil))
        when "in"
          vals = val.is_a?(Array) ? val : val.to_s.split(",").map(&:strip)
          vals = vals.map { |v| cast_filter_value(col_type, v) }
          scope = scope.where(col_arel.in(vals))
        end
      end

      scope
    end

    def cast_filter_value(col_type, val)
      return val if val.nil?

      case col_type
      when :integer
        val.to_s.strip.to_i rescue val
      when :float, :decimal
        val.to_s.strip.to_f rescue val
      when :boolean
        ActiveModel::Type::Boolean.new.cast(val)
      else
        val
      end
    end
  end
end
