# frozen_string_literal: true

module RailsStudio
  class QueryService
    class << self
      def execute(sql)
        clean_sql = sql.to_s.strip
        if clean_sql.blank?
          return { columns: [], rows: [], count: 0, duration_ms: 0, message: "Query was empty." }
        end

        # Detect if user entered Ruby / ActiveRecord code instead of SQL
        if clean_sql =~ /^[A-Z][a-zA-Z0-9_]*(::[A-Z][a-zA-Z0-9_]*)*\.(all|where|find|first|last|count|pluck|limit|order|create|new|destroy|update|delete|group|joins|includes|select)\b/ ||
           clean_sql =~ /^(Rails|ActiveRecord|ENV)\b/
          raise ActiveRecord::StatementInvalid,
                "It appears you entered an Active Record expression ('#{clean_sql}'). " \
                "SQL Runner only executes raw SQL queries. " \
                "Please use the Rails Console terminal at the bottom of the screen to run Ruby & Active Record expressions directly."
        end

        # Remove comments before checking read-only mode
        stripped_for_check = clean_sql.gsub(%r{/\*.*?\*/}m, "").gsub(/--.*$/, "").strip
        first_word = stripped_for_check.split(/\s+/).first.to_s.upcase

        if RailsStudio.configuration.read_only?
          unless %w[SELECT EXPLAIN SHOW DESC DESCRIBE WITH PRAGMA].include?(first_word)
            raise RecordService::ReadOnlyError, "Only read queries (SELECT, EXPLAIN) are permitted in read-only mode."
          end
        end

        start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
        result = ActiveRecord::Base.connection.exec_query(clean_sql)
        duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time) * 1000).round(2)

        affected_rows = if result.respond_to?(:affected_rows)
                          result.affected_rows
                        end

        message = if result.columns.empty?
                    if affected_rows && affected_rows > 0
                      "Query executed successfully (#{affected_rows} #{affected_rows == 1 ? 'row' : 'rows'} affected)."
                    else
                      "Query executed successfully."
                    end
                  else
                    "#{result.rows.size} #{result.rows.size == 1 ? 'row' : 'rows'} returned."
                  end

        {
          columns: result.columns,
          rows: result.rows,
          count: result.rows.size,
          affected_rows: affected_rows,
          message: message,
          duration_ms: duration_ms
        }
      end
    end
  end
end
