# frozen_string_literal: true

module RailsStudio
  class ApplicationController < ActionController::Base
    skip_forgery_protection
    before_action :ensure_access_allowed

    rescue_from StandardError, with: :handle_standard_error
    rescue_from ActiveRecord::RecordNotFound, with: :handle_not_found
    rescue_from RecordService::ReadOnlyError, with: :handle_read_only

    private

    def ensure_access_allowed
      return if RailsStudio.configuration.allow_in_production?
      return if Rails.env.development? || Rails.env.test?

      render plain: "Rails Studio is only accessible in development or test environment.", status: :forbidden
    end

    def handle_not_found(exception)
      render json: { error: exception.message }, status: :not_found
    end

    def handle_read_only(exception)
      render json: { error: exception.message }, status: :forbidden
    end

    def handle_standard_error(exception)
      logger.error("[RailsStudio] #{exception.class}: #{exception.message}\n#{exception.backtrace&.first(5)&.join("\n")}")
      render json: { error: exception.message }, status: :internal_server_error
    end
  end
end
