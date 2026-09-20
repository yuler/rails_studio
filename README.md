# Rails Studio 💎

A modern, fast, and beautiful Web Database Studio for Rails development — inspired by Prisma Studio and Notion spreadsheets.

Rails Studio is packaged as a **mountable Rails Engine** with zero dependencies required by the host application (pre-compiled SPA bundled with the gem — **no Node.js or NPM needed in your Rails app!**).

---

## ✨ Features

- **🚀 One-Line Integration**: Mount directly inside your Rails `routes.rb` under development.
- **📦 Zero-Dependency Delivery**: Comes with pre-built React + Tailwind SPA assets. No Node.js, Webpack, or asset pipeline setup needed in host applications.
- **📊 Spreadsheet-like UX**:
  - Interactive table grid with sticky headers and column-type badges (`#` int, `Abc` string, `📅` datetime, `✓` boolean, `🔑` primary key, `🔗` foreign key).
  - Double-click inline cell editing.
  - Multi-column sorting and advanced filtering (equals, contains, starts with, >, <, is null).
- **🔗 Foreign Key Drawer**: Click any foreign key pill (e.g. `users #42 ↗`) to open a side drawer showing the referenced record, with support for nested relation navigation.
- **💾 Git-like Staging for Edits**: Changes are staged locally and highlighted in amber. Commit multiple updates atomically in a single transaction with one click.
- **⚡ SQL Query Runner**: Built-in interactive SQL console with query templates, execution timers, and CSV export.
- **🛡️ Development Safety Guard**: Automatically blocks production requests unless explicitly configured.
- **🧩 Composite Primary Key & Rails 7/8 Support**: Fully compatible with Rails 7.1+, 8.0, and 8.1 composite keys, SQLite, PostgreSQL, and MySQL.

---

## 🚀 Quickstart

### 1. Add to your `Gemfile`

```ruby
group :development do
  gem "rails_studio"
end
```

Then run:
```bash
bundle install
```

### 2. Mount in `config/routes.rb`

```ruby
# config/routes.rb
Rails.application.routes.draw do
  mount RailsStudio::Engine => "/rails_studio" if Rails.env.development?
end
```

### 3. Open in your browser

Start your Rails server:
```bash
bin/rails server
```

Visit:
👉 [http://localhost:3000/rails_studio](http://localhost:3000/rails_studio)

---

## ⚙️ Configuration (Optional)

You can customize Rails Studio by adding an initializer: `config/initializers/rails_studio.rb`:

```ruby
RailsStudio.configure do |config|
  # Allow access in production (Default: false, strongly recommended to keep false)
  config.allow_in_production = false

  # Read-only mode: prevents updates, creates, and deletes (Default: false)
  config.read_only = false

  # Default pagination records per page (Default: 50)
  config.default_per_page = 50

  # Maximum records allowed per page (Default: 200)
  config.max_per_page = 200

  # Tables excluded from sidebar and inspection
  config.excluded_tables += %w[my_secret_table]
end
```

---

## 🛠️ Developing Rails Studio

If you want to contribute or modify the frontend Studio UI:

```bash
# 1. Clone the repository
git clone https://github.com/yuler/rails_studio.git
cd rails_studio

# 2. Install Ruby dependencies
bundle install

# 3. Setup test dummy app database
cd test/dummy
bin/rails db:migrate
bin/rails db:seed
cd ../..

# 4. Install frontend dependencies and build
cd frontend
pnpm install
pnpm run build   # Compiles into ../public/assets/
```

To run automated tests:
```bash
bin/rails test
```

---

## 📄 License

The gem is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).
