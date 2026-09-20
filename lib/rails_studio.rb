# frozen_string_literal: true

require "rails_studio/version"
require "rails_studio/configuration"
require "rails_studio/engine"

# Ensure JSON.parse compatibility with older Rails versions when json gem >= 3.0 is loaded.
# In json 3.0+, JSON.parse only accepts keyword arguments (**options), but older Rails
# ActiveSupport::JSON.decode passes options as a positional Hash, causing ArgumentError.
if defined?(::JSON)
  begin
    ::JSON.parse("{}", {})
  rescue ArgumentError
    module JSON
      class << self
        alias_method :_rails_studio_orig_parse, :parse
        def parse(source, opts = nil, **kwargs)
          if opts.is_a?(Hash)
            _rails_studio_orig_parse(source, **opts.merge(kwargs))
          elsif opts
            _rails_studio_orig_parse(source, opts, **kwargs)
          else
            _rails_studio_orig_parse(source, **kwargs)
          end
        end
      end
    end
  end
end


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
