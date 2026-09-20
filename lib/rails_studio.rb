# frozen_string_literal: true

require "rails_studio/version"
require "rails_studio/configuration"
require "rails_studio/engine"

module RailsStudio
  class << self
    def configuration
      @configuration ||= Configuration.new
    end

    def configure
      yield(configuration)
    end

    def reset_configuration!
      @configuration = Configuration.new
    end
  end
end
