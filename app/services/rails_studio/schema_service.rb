# frozen_string_literal: true

module RailsStudio
  class SchemaService
    class << self
      def connection
        ActiveRecord::Base.connection
      end

      def overview
        excluded = RailsStudio.configuration.excluded_tables
        raw_tables = (connection.tables - excluded).sort

        tables = raw_tables.map do |table_name|
          pks = primary_keys_for(table_name)
          cols = columns_for(table_name)
          fks = foreign_keys_for(table_name)
          row_count = table_row_count(table_name)

          {
            name: table_name,
            row_count: row_count,
            columns_count: cols.size,
            primary_keys: pks,
            foreign_keys_count: fks.size
          }
        end

        {
          database: {
            adapter: connection.adapter_name,
            database_name: current_database_name,
            rails_version: Rails.version,
            ruby_version: RUBY_VERSION,
            read_only: RailsStudio.configuration.read_only?,
            configured_databases: configured_databases
          },
          tables: tables,
          total_tables: tables.size
        }
      end

      def table_schema(table_name)
        ensure_valid_table!(table_name)

        pks = primary_keys_for(table_name)
        fks = foreign_keys_for(table_name)
        cols = columns_for(table_name)
        model = find_model_for(table_name)
        enums = model ? (model.defined_enums rescue {}) : {}

        columns_data = cols.map do |col|
          fk_info = fks.find { |fk| fk[:column].to_s == col.name.to_s }
          is_pk = pks.include?(col.name.to_s)

          {
            name: col.name,
            type: col.type.to_s,
            sql_type: col.sql_type.to_s,
            null: col.null,
            default: col.default,
            comment: col.respond_to?(:comment) ? col.comment : nil,
            primary: is_pk,
            foreign_key: fk_info,
            enum_values: enums[col.name.to_s]&.keys || enums[col.name.to_sym]&.keys
          }
        end

        associations = associations_for(model)
        indexes = indexes_for(table_name)

        {
          table_name: table_name,
          primary_keys: pks,
          columns: columns_data,
          foreign_keys: fks,
          associations: associations,
          indexes: indexes,
          row_count: table_row_count(table_name)
        }
      end

      def primary_keys_for(table_name)
        if connection.respond_to?(:primary_keys)
          Array(connection.primary_keys(table_name)).map(&:to_s).compact
        else
          Array(connection.primary_key(table_name)).map(&:to_s).compact
        end
      rescue StandardError
        Array(connection.primary_key(table_name)).map(&:to_s).compact rescue []
      end

      def columns_for(table_name)
        connection.columns(table_name)
      rescue StandardError
        []
      end

      def foreign_keys_for(table_name)
        fks = connection.foreign_keys(table_name) rescue []
        result = fks.map do |fk|
          {
            column: fk.options[:column] || fk.column,
            to_table: fk.to_table,
            primary_key: fk.primary_key || "id",
            name: fk.name
          }
        end

        # Augment with belongs_to reflections if model exists and fk isn't already declared in DB
        model = find_model_for(table_name)
        if model
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

      def associations_for(model)
        return [] unless model

        model.reflect_on_all_associations.map do |assoc|
          {
            name: assoc.name.to_s,
            macro: assoc.macro.to_s, # :belongs_to, :has_many, :has_one
            foreign_key: assoc.foreign_key.to_s,
            target_table: (assoc.klass.table_name rescue assoc.plural_name).to_s,
            polymorphic: assoc.polymorphic?
          }
        end rescue []
      end

      def indexes_for(table_name)
        connection.indexes(table_name).map do |idx|
          {
            name: idx.name,
            columns: Array(idx.columns).map(&:to_s),
            unique: idx.unique
          }
        end rescue []
      end

      def table_row_count(table_name)
        quoted = connection.quote_table_name(table_name)
        connection.select_value("SELECT COUNT(*) FROM #{quoted}").to_i
      rescue StandardError
        0
      end

      def find_model_for(table_name)
        # Check loaded descendants
        found = ActiveRecord::Base.descendants.find { |m| !m.abstract_class? && m.table_name == table_name }
        return found if found

        # Try to classify
        candidate_name = table_name.to_s.singularize.camelize
        candidate = candidate_name.safe_constantize
        return candidate if candidate && candidate < ActiveRecord::Base && candidate.table_name == table_name

        nil
      end

      def ensure_valid_table!(table_name)
        excluded = RailsStudio.configuration.excluded_tables
        tables = connection.tables - excluded
        unless tables.include?(table_name.to_s)
          raise ActiveRecord::RecordNotFound, "Table '#{table_name}' not found or excluded."
        end
      end

      def configured_databases
        ActiveRecord::Base.configurations.configs_for(env_name: Rails.env).map do |cfg|
          {
            name: cfg.name,
            adapter: cfg.adapter,
            database: cfg.database
          }
        end
      rescue StandardError
        []
      end

      private

      def current_database_name
        if connection.pool&.db_config&.database.present?
          File.basename(connection.pool.db_config.database.to_s)
        elsif connection.respond_to?(:current_database) && connection.current_database.present?
          connection.current_database
        elsif connection.raw_connection.respond_to?(:filename) && connection.raw_connection.filename.present?
          File.basename(connection.raw_connection.filename)
        else
          "database"
        end
      rescue StandardError
        "database"
      end
    end
  end
end
