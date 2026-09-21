# frozen_string_literal: true

module RailsStudio
  module Api
    class RecordsController < ApplicationController
      def index
        table = Table.find(params[:table_name])
        filters = parse_filters(params[:filters])

        result = table.records(
          page: params[:page],
          per_page: params[:per_page],
          sort_by: params[:sort_by],
          sort_order: params[:sort_order],
          filters: filters
        )

        render json: result
      end

      def show
        table = Table.find(params[:table_name])
        record = table.find_record(params[:id])
        if record
          render json: { record: record }
        else
          render json: { error: "Record not found" }, status: :not_found
        end
      end

      def create
        table = Table.find(params[:table_name])
        record = table.create_record(record_params)
        render json: { success: true, record: record }, status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { success: false, error: e.message, errors: e.record.errors.full_messages }, status: :unprocessable_entity
      rescue ActiveRecord::StatementInvalid => e
        render json: { success: false, error: e.message }, status: :unprocessable_entity
      end

      def update
        table = Table.find(params[:table_name])
        record = table.update_record(params[:id], record_params)
        render json: { success: true, record: record }
      rescue ActiveRecord::RecordInvalid => e
        render json: { success: false, error: e.message, errors: e.record.errors.full_messages }, status: :unprocessable_entity
      rescue ActiveRecord::StatementInvalid => e
        render json: { success: false, error: e.message }, status: :unprocessable_entity
      end

      def destroy
        table = Table.find(params[:table_name])
        table.destroy_record(params[:id])
        render json: { success: true }
      end

      def batch
        table = Table.find(params[:table_name])
        results = table.batch_process(
          updates: params[:updates] || [],
          creates: params[:creates] || [],
          deletes: params[:deletes] || []
        )

        render json: { success: true, results: results }
      rescue StandardError => e
        render json: { success: false, error: e.message }, status: :unprocessable_entity
      end

      private

      def record_params
        if params[:record].respond_to?(:permit!)
          params.require(:record).permit!.to_h
        elsif params[:record].is_a?(Hash)
          params[:record]
        else
          {}
        end
      end

      def parse_filters(raw_filters)
        return [] if raw_filters.blank?

        if raw_filters.is_a?(String)
          parsed = JSON.parse(raw_filters) rescue []
          parsed.is_a?(Array) ? parsed : []
        elsif raw_filters.is_a?(Array)
          raw_filters.map { |f| f.respond_to?(:to_unsafe_h) ? f.to_unsafe_h : f }
        else
          []
        end
      end
    end
  end
end
