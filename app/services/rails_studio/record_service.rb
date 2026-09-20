# frozen_string_literal: true

module RailsStudio
  class RecordService
    class ReadOnlyError < StandardError; end

    class << self
      def query_records(table_name, page: 1, per_page: 50, sort_by: nil, sort_order: "asc", filters: [])
        SchemaService.ensure_valid_table!(table_name)
        model = dynamic_model_for(table_name)
        valid_cols = model.column_names

        page = [page.to_i, 1].max
        per_page_config = RailsStudio.configuration.default_per_page
        max_per_page = RailsStudio.configuration.max_per_page
        per_page = [[(per_page || per_page_config).to_i, 1].max, max_per_page].min

        scope = model.all

        # Apply filters
        scope = apply_filters(scope, model, valid_cols, filters)

        total_count = scope.count rescue 0

        # Apply sorting
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

        # Pagination
        offset = (page - 1) * per_page
        records = scope.limit(per_page).offset(offset).to_a

        total_pages = (total_count.to_f / per_page).ceil

        {
          records: records.map(&:attributes),
          total_count: total_count,
          page: page,
          per_page: per_page,
          total_pages: [total_pages, 1].max
        }
      end

      def find_record(table_name, id)
        SchemaService.ensure_valid_table!(table_name)
        model = dynamic_model_for(table_name)
        record = find_by_id(model, id)
        record ? record.attributes : nil
      end

      def create_record(table_name, attributes)
        ensure_writable!
        SchemaService.ensure_valid_table!(table_name)
        model = dynamic_model_for(table_name)

        sanitized = sanitize_attributes(model, attributes)
        record = model.new(sanitized)
        record.save!
        record.attributes
      end

      def update_record(table_name, id, attributes)
        ensure_writable!
        SchemaService.ensure_valid_table!(table_name)
        model = dynamic_model_for(table_name)

        record = find_by_id!(model, id)
        sanitized = sanitize_attributes(model, attributes)
        record.assign_attributes(sanitized)
        record.save!
        record.attributes
      end

      def destroy_record(table_name, id)
        ensure_writable!
        SchemaService.ensure_valid_table!(table_name)
        model = dynamic_model_for(table_name)

        record = find_by_id!(model, id)
        record.destroy!
        true
      end

      def batch_process(table_name, updates: [], creates: [], deletes: [])
        ensure_writable!
        SchemaService.ensure_valid_table!(table_name)
        model = dynamic_model_for(table_name)

        results = { updated: 0, created: 0, deleted: 0 }

        ActiveRecord::Base.transaction do
          # 1. Process deletes
          Array(deletes).each do |id|
            record = find_by_id(model, id)
            if record
              record.destroy!
              results[:deleted] += 1
            end
          end

          # 2. Process updates
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

          # 3. Process creates
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

      def dynamic_model_for(table_name)
        pks = SchemaService.primary_keys_for(table_name)

        Class.new(ActiveRecord::Base) do
          self.table_name = table_name
          self.inheritance_column = nil # Disables STI

          if pks.size == 1
            self.primary_key = pks.first
          elsif pks.size > 1
            self.primary_key = pks
          end
        end
      end

      private

      def ensure_writable!
        if RailsStudio.configuration.read_only?
          raise ReadOnlyError, "Rails Studio is currently in read-only mode."
        end
      end

      def find_by_id(model, id)
        pks = Array(model.primary_key)
        if pks.size <= 1
          model.find_by(model.primary_key => id)
        else
          # Composite primary key
          id_hash = parse_composite_id(pks, id)
          model.find_by(id_hash)
        end
      end

      def find_by_id!(model, id)
        record = find_by_id(model, id)
        raise ActiveRecord::RecordNotFound, "Record with id #{id.inspect} not found in #{model.table_name}" unless record
        record
      end

      def parse_composite_id(pks, id)
        if id.is_a?(Hash)
          id.symbolize_keys.slice(*pks.map(&:to_sym))
        elsif id.is_a?(Array)
          pks.each_with_index.each_with_object({}) { |(pk, i), h| h[pk.to_sym] = id[i] }
        elsif id.is_a?(String) && id.include?(",")
          parts = id.split(",")
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

        attributes.each_with_object({}) do |(key, value), hash|
          col_name = key.to_s
          next unless valid_cols.include?(col_name)

          col = cols_map[col_name]
          hash[col_name] = cast_value_for_column(col, value)
        end
      end

      def cast_value_for_column(col, value)
        return nil if value.nil? || (value == "" && col.null && col.type != :string && col.type != :text)

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

        filters.each do |filter|
          next unless filter.is_a?(Hash)

          col = filter[:column] || filter["column"]
          op = (filter[:op] || filter["op"]).to_s.downcase
          val = filter[:value] || filter["value"]

          next unless valid_cols.include?(col.to_s)

          col_arel = arel[col.to_sym]
          col_type = model.columns_hash[col.to_s]&.type

          case op
          when "eq", "="
            scope = scope.where(col_arel.eq(val))
          when "not_eq", "!="
            scope = scope.where(col_arel.not_eq(val))
          when "contains", "like"
            scope = if scope.connection.adapter_name =~ /postgres/i
                      scope.where(col_arel.matches("%#{sanitize_like(val)}%", nil, true))
                    else
                      scope.where(col_arel.matches("%#{sanitize_like(val)}%"))
                    end
          when "starts_with"
            scope = scope.where(col_arel.matches("#{sanitize_like(val)}%"))
          when "ends_with"
            scope = scope.where(col_arel.matches("%#{sanitize_like(val)}"))
          when "gt", ">"
            scope = scope.where(col_arel.gt(val))
          when "gte", ">="
            scope = scope.where(col_arel.gteq(val))
          when "lt", "<"
            scope = scope.where(col_arel.lt(val))
          when "lte", "<="
            scope = scope.where(col_arel.lteq(val))
          when "is_null"
            scope = scope.where(col_arel.eq(nil))
          when "is_not_null"
            scope = scope.where(col_arel.not_eq(nil))
          when "in"
            vals = val.is_a?(Array) ? val : val.to_s.split(",").map(&:strip)
            scope = scope.where(col_arel.in(vals))
          end
        end

        scope
      end

      def sanitize_like(string)
        string.to_s.gsub(/([%_])/) { "\\#{$1}" }
      end
    end
  end
end
