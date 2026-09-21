# frozen_string_literal: true

module RailsStudio
  module Api
    class TablesController < ApplicationController
      def schema
        table = Table.find(params[:table_name])
        render json: table.schema
      end
    end
  end
end
