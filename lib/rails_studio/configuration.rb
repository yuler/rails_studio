# frozen_string_literal: true

module RailsStudio
  class Configuration
    attr_accessor :enabled,
                  :allow_in_production,
                  :read_only,
                  :default_per_page,
                  :max_per_page,
                  :excluded_tables

    def initialize
      @enabled = true
      @allow_in_production = false
      @read_only = false
      @default_per_page = 50
      @max_per_page = 200
      @excluded_tables = %w[
        schema_migrations
        ar_internal_metadata
      ]
    end

    def allow_in_production?
      @allow_in_production == true
    end

    def read_only?
      @read_only == true
    end
  end
end
