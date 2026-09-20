# frozen_string_literal: true

module RailsStudio
  class QueryService
    class << self
      def execute(sql)
        clean_sql = sql.to_s.strip
        if clean_sql.blank?
          return { columns: [], rows: [], count: 0, duration_ms: 0 }
        end

        if RailsStudio.configuration.read_only?
          first_word = clean_sql.split(/\s+/).first.to_s.upcase
          unless %w[SELECT EXPLAIN SHOW DESC DESCRIBE WITH PRAGMA].include?(first_word)
            raise RecordService::ReadOnlyError, "Only read queries (SELECT, EXPLAIN) are permitted in read-only mode."
          end
        end

        start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
        result = ActiveRecord::Base.connection.exec_query(clean_sql)
        duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time) * 1000).round(2)

        {
          columns: result.columns,
          rows: result.rows,
          count: result.rows.size,
          duration_ms: duration_ms
        }
      end
    end
  end
end
