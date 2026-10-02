# frozen_string_literal: true

module RailsStudio
  module Api
    class TablesController < ApplicationController
      rescue_from ActiveRecord::StatementInvalid do |e|
        render json: { success: false, error: e.message }, status: :unprocessable_entity
      end

      def schema
        table = Table.find(params[:table_name])
        render json: table.schema
      end

      def truncate
        Table.find(params[:table_name]).truncate!
        render json: { success: true }
      end

      def destroy
        Table.find(params[:table_name]).drop!
        render json: { success: true }
      end
    end
  end
end
