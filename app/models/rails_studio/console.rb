# frozen_string_literal: true

require "stringio"
require "pp"

module RailsStudio
  class Console
    EVAL_MUTEX = Mutex.new

    DANGEROUS_PATTERNS = [
      /\b(create!|create|destroy_all|destroy|delete_all|delete|update_all|update!|update|drop_table|execute|truncate)\b/,
      /\b(save!|save|update_attribute|update_column|update_columns|toggle!)\b/
    ].freeze

    class << self
      def execute(command)
        clean_code = command.to_s.strip
        if clean_code.blank?
          return { result: nil, result_type: "NilClass", stdout: "", queries: [], duration_ms: 0 }
        end

        if RailsStudio.configuration.read_only?
          validate_read_only_code!(clean_code)
        end

        queries = []
        current_thread = Thread.current
        subscriber = ActiveSupport::Notifications.subscribe("sql.active_record") do |*args|
          next unless Thread.current == current_thread

          event = ActiveSupport::Notifications::Event.new(*args)
          unless event.payload[:name] == "SCHEMA"
            queries << {
              sql: event.payload[:sql],
              duration_ms: event.duration.round(2)
            }
          end
        end

        stdout_buf = StringIO.new
        duration_ms = 0

        begin
          result = nil
          start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)

          EVAL_MUTEX.synchronize do
            old_stdout = $stdout
            $stdout = stdout_buf
            begin
              result = if RailsStudio.configuration.read_only? && ActiveRecord::Base.respond_to?(:while_preventing_writes)
                         ActiveRecord::Base.while_preventing_writes do
                           TOPLEVEL_BINDING.eval(clean_code)
                         end
              else
                         TOPLEVEL_BINDING.eval(clean_code)
              end
            ensure
              $stdout = old_stdout
            end
          end

          duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time) * 1000).round(2)

          formatted_result = if result.nil?
                               "nil"
          elsif result.is_a?(String)
                               result.inspect
          else
                               PP.pp(result, String.new, 100).strip
          end

          {
            result: formatted_result,
            result_type: result.class.name,
            stdout: stdout_buf.string,
            queries: queries,
            duration_ms: duration_ms
          }
        rescue Exception => e
          duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time) * 1000).round(2) rescue 0
          {
            error: {
              class: e.class.name,
              message: e.message,
              backtrace: clean_backtrace(e.backtrace)
            },
            stdout: stdout_buf.string,
            queries: queries,
            duration_ms: duration_ms
          }
        ensure
          ActiveSupport::Notifications.unsubscribe(subscriber)
        end
      end

      def completions
        Rails.application.eager_load! rescue nil

        all_models = ActiveRecord::Base.descendants.reject(&:abstract_class?).select { |m| m.name.present? }
        app_models = all_models.reject { |m| m.name.to_s.start_with?("Action", "ActiveStorage") }
        framework_models = all_models.select { |m| m.name.to_s.start_with?("Action", "ActiveStorage") }
        sorted_models = app_models + framework_models

        models = sorted_models.map do |model|
          {
            name: model.name,
            table_name: model.table_name,
            columns: (model.column_names rescue []),
            associations: (model.reflect_on_all_associations.map(&:name).map(&:to_s) rescue [])
          }
        end

        common_methods = %w[
          all count first last find find_by where pluck order limit
          group having select distinct joins includes create create!
          new build destroy_all delete_all update_all to_sql explain
          columns column_names table_name primary_key
        ]

        rails_globals = %w[
          Rails.env Rails.application Rails.version Rails.root
          ActiveRecord::Base
        ]

        {
          models: models,
          common_methods: common_methods,
          globals: rails_globals
        }
      end

      private

      def validate_read_only_code!(code)
        if DANGEROUS_PATTERNS.any? { |pattern| code =~ pattern }
          raise RailsStudio::ReadOnlyError, "Modifying operations are disabled in read-only mode."
        end
      end

      def clean_backtrace(backtrace)
        return [] unless backtrace.is_a?(Array)

        backtrace.first(6).map do |line|
          line.sub(Rails.root.to_s, ".")
        end
      end
    end
  end
end
