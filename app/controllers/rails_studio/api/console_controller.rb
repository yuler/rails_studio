# frozen_string_literal: true

module RailsStudio
  module Api
    class ConsoleController < ApplicationController
      def execute
        result = Console.execute(params[:command])
        render json: result
      end

      def completions
        result = Console.completions
        render json: result
      end
    end
  end
end
