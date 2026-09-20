# frozen_string_literal: true

module RailsStudio
  module Api
    class RecordsController < ApplicationController
      def index
        filters = parse_filters(params[:filters])

        result = RecordService.query_records(
          params[:table_name],
          page: params[:page],
          per_page: params[:per_page],
          sort_by: params[:sort_by],
          sort_order: params[:sort_order],
          filters: filters
        )

        render json: result
      end

      def show
        record = RecordService.find_record(params[:table_name], params[:id])
        if record
          render json: { record: record }
        else
          render json: { error: "Record not found" }, status: :not_found
        end
      end

      def create
        record = RecordService.create_record(params[:table_name], record_params)
        render json: { success: true, record: record }, status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { success: false, error: e.message, errors: e.record.errors.full_messages }, status: :unprocessable_entity
      end

      def update
        record = RecordService.update_record(params[:table_name], params[:id], record_params)
        render json: { success: true, record: record }
      rescue ActiveRecord::RecordInvalid => e
        render json: { success: false, error: e.message, errors: e.record.errors.full_messages }, status: :unprocessable_entity
      end

      def destroy
        RecordService.destroy_record(params[:table_name], params[:id])
        render json: { success: true }
      end

      def batch
        updates = params[:updates] || []
        creates = params[:creates] || []
        deletes = params[:deletes] || []

        results = RecordService.batch_process(
          params[:table_name],
          updates: updates,
          creates: creates,
          deletes: deletes
        )

        render json: { success: true, results: results }
      rescue StandardError => e
        render json: { success: false, error: e.message }, status: :unprocessable_entity
      end

      private

      def record_params
        params.require(:record).permit!.to_h rescue (params[:record] || {}).to_unsafe_h rescue {}
      end

      def parse_filters(raw_filters)
        return [] if raw_filters.blank?

        if raw_filters.is_a?(String)
          JSON.parse(raw_filters) rescue []
        elsif raw_filters.is_a?(Array)
          raw_filters.map { |f| f.respond_to?(:to_unsafe_h) ? f.to_unsafe_h : f }
        else
          []
        end
      end
    end
  end
end
