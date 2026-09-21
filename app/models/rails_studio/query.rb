# frozen_string_literal: true

module RailsStudio
  class Query
    attr_reader :sql

    WRITE_COMMANDS = %w[INSERT UPDATE DELETE DROP TRUNCATE ALTER CREATE MERGE REPLACE].freeze

    class << self
      def execute(sql)
        new(sql).execute
      end
    end

    def initialize(sql)
      @sql = sql.to_s.strip
    end

    def execute
      if sql.blank?
        return { columns: [], rows: [], count: 0, duration_ms: 0, message: "Query was empty." }
      end

      validate_expression_type!
      validate_read_only!

      start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)

      result = if RailsStudio.configuration.read_only? && ActiveRecord::Base.respond_to?(:while_preventing_writes)
                 ActiveRecord::Base.while_preventing_writes do
                   ActiveRecord::Base.connection.exec_query(sql)
                 end
      else
                 ActiveRecord::Base.connection.exec_query(sql)
      end

      duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time) * 1000).round(2)

      affected_rows = result.affected_rows if result.respond_to?(:affected_rows)
      message = format_message(result, affected_rows)

      {
        columns: result.columns,
        rows: result.rows,
        count: result.rows.size,
        affected_rows: affected_rows,
        message: message,
        duration_ms: duration_ms
      }
    rescue ActiveRecord::ReadOnlyError => e
      raise RailsStudio::ReadOnlyError, "Write query attempted while in read-only mode: #{e.message}"
    end

    private

    def validate_expression_type!
      if sql =~ /^[A-Z][a-zA-Z0-9_]*(::[A-Z][a-zA-Z0-9_]*)*\.(all|where|find|first|last|count|pluck|limit|order|create|new|destroy|update|delete|group|joins|includes|select)\b/ ||
         sql =~ /^(Rails|ActiveRecord|ENV)\b/
        raise ActiveRecord::StatementInvalid,
              "It appears you entered an Active Record expression ('#{sql}'). " \
              "SQL Runner only executes raw SQL queries. " \
              "Please use the Rails Console terminal at the bottom of the screen to run Ruby & Active Record expressions directly."
      end
    end

    def validate_read_only!
      return unless RailsStudio.configuration.read_only?

      stripped = sql.gsub(%r{/\*.*?\*/}m, "").gsub(/--.*$/, "").strip
      first_word = stripped.split(/\s+/).first.to_s.upcase

      unless %w[SELECT EXPLAIN SHOW DESC DESCRIBE PRAGMA WITH].include?(first_word)
        raise RailsStudio::ReadOnlyError, "Only read queries (SELECT, EXPLAIN) are permitted in read-only mode."
      end

      if first_word == "WITH" || first_word == "EXPLAIN"
        no_literals = stripped.gsub(/'(?:''|[^'])*'/, "")
        if WRITE_COMMANDS.any? { |cmd| no_literals =~ /\b#{cmd}\b/i }
          raise RailsStudio::ReadOnlyError, "Modifying operations inside #{first_word} queries are disabled in read-only mode."
        end
      end
    end

    def format_message(result, affected_rows)
      if result.columns.empty?
        if affected_rows && affected_rows > 0
          "Query executed successfully (#{affected_rows} #{affected_rows == 1 ? 'row' : 'rows'} affected)."
        else
          "Query executed successfully."
        end
      else
        "#{result.rows.size} #{result.rows.size == 1 ? 'row' : 'rows'} returned."
      end
    end
  end
end
