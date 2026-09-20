# frozen_string_literal: true

module RailsStudio
  module Api
    class TablesController < ApplicationController
      def schema
        render json: SchemaService.table_schema(params[:table_name])
      end
    end
  end
end
