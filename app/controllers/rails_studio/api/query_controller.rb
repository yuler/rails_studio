# frozen_string_literal: true

module RailsStudio
  module Api
    class QueryController < ApplicationController
      def execute
        result = QueryService.execute(params[:sql])
        render json: result
      rescue ActiveRecord::StatementInvalid => e
        render json: { error: e.message }, status: :unprocessable_entity
      rescue RecordService::ReadOnlyError => e
        render json: { error: e.message }, status: :forbidden
      rescue StandardError => e
        render json: { error: e.message }, status: :internal_server_error
      end
    end
  end
end
