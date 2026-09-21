# frozen_string_literal: true

module RailsStudio
  class Database
    class << self
      def current
        new
      end

      def connection
        ActiveRecord::Base.connection
      end
    end

    def connection
      self.class.connection
    end

    def adapter
      connection.adapter_name
    end

    def name
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

    def tables
      excluded = RailsStudio.configuration.excluded_tables
      (connection.tables - excluded).sort.map do |table_name|
        Table.new(table_name)
      end
    end

    def table(table_name)
      Table.find(table_name)
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

    def overview
      all_tables = tables
      {
        database: {
          adapter: adapter,
          database_name: name,
          rails_version: Rails.version,
          ruby_version: RUBY_VERSION,
          read_only: RailsStudio.configuration.read_only?,
          configured_databases: configured_databases
        },
        tables: all_tables.map(&:summary),
        total_tables: all_tables.size
      }
    end
  end
end
