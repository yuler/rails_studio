<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="assets/logo-light.svg">
    <img alt="Rails Studio" src="assets/logo.svg" width="540">
  </picture>
</p>

<p align="center">
  <strong>A modern, fast, and beautiful Web Database Studio for Rails development.</strong><br>
  Inspired by <a href="https://github.com/prisma/studio">Prisma Studio</a> and <a href="https://orm.drizzle.team/drizzle-studio/overview">Drizzle Studio</a>.
</p>

<p align="center">
  <a href="https://rubygems.org/gems/rails_studio"><img src="https://img.shields.io/gem/v/rails_studio?color=e11d48&label=gem" alt="Gem Version"></a>
  <a href="https://github.com/yuler/rails_studio/blob/main/MIT-LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://rubyonrails.org/"><img src="https://img.shields.io/badge/rails-%3E%3D%207.0-red.svg" alt="Rails 7+"></a>
  <a href="#-inspiration"><img src="https://img.shields.io/badge/inspired%20by-Prisma%20%26%20Drizzle%20Studio-6366f1.svg" alt="Inspiration"></a>
</p>

---

Rails Studio is packaged as a **mountable Rails Engine** with zero dependencies required by the host application (pre-compiled SPA bundled with the gem — **no Node.js or NPM needed in your Rails app!**).

## 💡 Inspiration

Rails Studio was heavily inspired by the remarkable developer experience of two pioneering tools in the modern TypeScript & full-stack ecosystem:

- **[Prisma Studio](https://github.com/prisma/studio)** — The visual, spreadsheet-like database browser for the Prisma ecosystem.
- **[Drizzle Studio](https://orm.drizzle.team/drizzle-studio/overview)** — The lightning-fast, modern database studio for Drizzle ORM.

We wanted to bring that exact same fluid, intuitive, spreadsheet-like database exploration and editing experience to the **Ruby on Rails** and **Active Record** ecosystem — with zero configuration, packaged cleanly as a mountable Rails engine.

---

## ✨ Features

- **🚀 One-Line Integration**: Mount directly inside your Rails `routes.rb` under development.
- **📦 Zero-Dependency Delivery**: Comes with pre-built React + Tailwind SPA assets. No Node.js, Webpack, or asset pipeline setup needed in host applications.
- **📊 Spreadsheet-like UX**:
  - Interactive table grid with sticky headers and column-type badges (`#` int, `Abc` string, `📅` datetime, `✓` boolean, `🔑` primary key, `🔗` foreign key).
  - Double-click inline cell editing.
  - Multi-column sorting and advanced filtering (equals, contains, starts with, `>`, `<`, is null).
- **🔗 Foreign Key Drawer**: Click any foreign key pill (e.g. `users #42 ↗`) to open a side drawer showing the referenced record, with support for nested relation navigation.
- **💾 Git-like Staging for Edits**: Changes are staged locally and highlighted in amber. Commit multiple updates atomically in a single transaction with one click.
- **⚡ SQL Query Runner**: Built-in interactive SQL console with query templates, execution timers, and CSV export.
- **💻 Interactive Rails Console Terminal**: A fixed-bottom web terminal right inside your browser. Run any Ruby / Active Record code (e.g. `User.all`, `Article.first`, `Rails.env`) with intelligent model/method auto-completions, syntax highlighting, query timing, command history, and live SQL execution traces (toggle with ``Ctrl+` `` or the Header button).
- **🔎 Command Palette & Quick Search (`Ctrl + K` / `Cmd + K`)**: Raycast/Spotlight-style command panel to jump instantly to any table, execute common actions, toggle themes, and navigate with pure keyboard commands.
- **⌨️ Keyboard-First Shortcuts**: Full keyboard shortcuts support (`Ctrl+K` for command palette, ``Ctrl+` `` for console, `Ctrl+S` to save changes, `N` for new record, `R` to refresh, `F` for filters, `?` for shortcuts cheat sheet).
- **🎨 Theme Support**: Full Light & Dark mode support with persistent user preferences, zero-FOUC reload, and theme-adaptive SVG branding.
- **🗄️ Any Database (PostgreSQL, MySQL, SQLite, Trilogy, etc.)**: Natively compatible with **any database supported by Active Record** (PostgreSQL, MySQL / MariaDB, SQLite, Trilogy, Oracle, SQL Server, etc.). Zero adapter configuration needed — Rails Studio automatically uses your host application's database connection.
- **🧩 Composite Primary Key & Rails 7/8 Multi-DB Support**: Fully compatible with Rails 7.1+, 8.0, and 8.1 composite primary keys, and multi-database architectures.

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

## ⌨️ Keyboard Shortcuts

| Shortcut | Scope | Description |
| :--- | :--- | :--- |
| `Ctrl + K` / `Cmd + K` | Global | Open **Command Palette** / Quick Search |
| ``Ctrl + ` `` / ``Cmd + ` `` | Global | Toggle **Rails Console Web Terminal** |
| `Ctrl + S` / `Cmd + S` | Global | **Save pending database edits** atomically |
| `?` / `Shift + /` | Global | Show **Keyboard Shortcuts** cheat sheet |
| `Esc` | Global | Close open modal, command palette, or drawer |
| `N` | Table View | **Add new row** / insert record |
| `R` | Table View | **Refresh table** schema and current page records |
| `F` | Table View | Toggle **column filters** bar |
| `Double Click` | Table Grid | Start inline cell editing |
| `Enter` | Table Grid | Commit inline cell edit |
| `Ctrl + Enter` | Console / SQL | Run query or evaluate Ruby expression |

---

## 🛠️ Developing Rails Studio

You can use [`mise`](https://mise.jdx.dev/) to run development tasks with ease:

```bash
# 1. Setup environment and test dummy database
mise run setup

# 2. Build frontend assets into public/assets/
mise run build

# 3. Preview Rails Studio at http://localhost:3000/rails_studio
mise run preview

# Other helpful tasks:
mise run dev:frontend   # Start Vite dev server with HMR (http://localhost:5173)
mise run build:watch    # Recompile frontend assets automatically on change
mise run test           # Run automated test suite
```

Or run commands manually:

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

# 5. Run tests
bin/rails test
```

---

## 📦 Releasing

Maintainers: bump `lib/rails_studio/version.rb`, update `CHANGELOG.md`, run `mise run build`, then `bundle exec rake release`. See [RELEASING.md](RELEASING.md).

---

## 📄 License

The gem is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).
