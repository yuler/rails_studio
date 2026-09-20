require_relative "lib/rails_studio/version"

Gem::Specification.new do |spec|
  spec.name        = "rails_studio"
  spec.version     = RailsStudio::VERSION
  spec.authors     = [ "yuler" ]
  spec.email       = [ "is.yuler@gmail.com" ]
  spec.homepage    = "https://github.com/yuler/rails_studio"
  spec.summary     = "A modern, beautiful Web Database Studio for Rails development."
  spec.description = "Rails Studio is a mountable Rails engine providing a modern, spreadsheet-like Web UI for exploring, querying, and editing your database in development."
  spec.license     = "MIT"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = "https://github.com/yuler/rails_studio"

  spec.files = Dir.chdir(File.expand_path(__dir__)) do
    Dir["{app,config,db,lib,public}/**/*", "MIT-LICENSE", "Rakefile", "README.md"]
  end

  spec.add_dependency "rails", ">= 7.0.0"
end
