# frozen_string_literal: true

module RailsStudio
  module Api
    class OverviewController < ApplicationController
      def show
        render json: SchemaService.overview
      end
    end
  end
end
