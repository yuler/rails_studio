# frozen_string_literal: true

module RailsStudio
  module Api
    class OverviewController < ApplicationController
      def show
        render json: Database.current.overview
      end
    end
  end
end
