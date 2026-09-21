source "https://rubygems.org"

# Specify your gem's dependencies in rails_studio.gemspec.
gemspec

gem "puma"

# Database adapter (defaults to sqlite3 for local zero-config development)
case ENV.fetch("DB_ADAPTER", "sqlite3")
when "postgresql", "postgres", "pg"
  gem "pg"
when "mysql", "mysql2"
  gem "mysql2"
when "trilogy"
  gem "trilogy"
else
  gem "sqlite3"
end

gem "propshaft"
gem "json", "< 3.0"


# Omakase Ruby styling [https://github.com/rails/rubocop-rails-omakase/]
gem "rubocop-rails-omakase", require: false

# Start debugger with binding.b [https://github.com/ruby/debug]
# gem "debug", ">= 1.0.0"
