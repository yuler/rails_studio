# frozen_string_literal: true

# Demo data for the intro video. Run from test/dummy:
#   bin/rails runner ../../video/capture/seed.rb

rng = Random.new(42)

ActiveRecord::Base.connection.execute("DELETE FROM article_tags")
Comment.delete_all
Article.delete_all
Category.delete_all
User.delete_all
if ActiveRecord::Base.connection.adapter_name == "SQLite"
  ActiveRecord::Base.connection.execute("DELETE FROM sqlite_sequence")
end

people = [
  ["Alice Johnson", "alice@rubyonrails.org", :admin, "Rails core contributor and database enthusiast."],
  ["Bob Smith", "bob@example.com", :member, "Full stack developer building cool stuff."],
  ["Chloe Martin", "chloe@basecamp.dev", :admin, "Ships Hotwire apps before breakfast."],
  ["Daniel Kim", "daniel@kim.io", :member, "Postgres tuning and query plans."],
  ["Elena Rossi", "elena@rossi.it", :member, "Design systems for developer tools."],
  ["Farah Ahmed", "farah@shopify.dev", :member, "Scaling Active Record at checkout."],
  ["George Lee", "george@lee.dev", :guest, "Learning Rails one generator at a time."],
  ["Hana Sato", "hana@sato.jp", :member, "Ruby meetups organizer in Tokyo."],
  ["Ivan Petrov", "ivan@petrov.dev", :member, "Background jobs and Solid Queue."],
  ["Julia Gomez", "julia@gomez.mx", :admin, "Maintainer of three open source gems."],
  ["Kofi Mensah", "kofi@mensah.gh", :member, "Building fintech on Rails 8."],
  ["Lena Fischer", "lena@fischer.de", :guest, "Product manager who reads SQL."],
  ["Marco Bianchi", "marco@bianchi.dev", :member, "Kamal deploys and tiny servers."],
  ["Nora Hansen", "nora@hansen.no", :member, "Accessibility advocate."],
  ["Omar Haddad", "omar@haddad.dev", :member, "Turbo Native mobile apps."],
  ["Priya Patel", "priya@patel.in", :admin, "Multi-database architectures."],
  ["Quinn Taylor", "quinn@taylor.dev", :guest, "Bootcamp grad, first Rails job."],
  ["Rosa Silva", "rosa@silva.br", :member, "Testing culture and fast CI."]
]

users = people.each_with_index.map do |(name, email, role, bio), i|
  User.create!(name:, email:, role:, bio:, active: i % 7 != 6, created_at: (120 - i * 6).days.ago)
end

categories = [
  ["Ruby on Rails", "ruby-on-rails"],
  ["Databases", "databases"],
  ["Hotwire", "hotwire"],
  ["Design & UX", "design-ux"],
  ["DevOps", "devops"],
  ["Testing", "testing"]
].map { |name, slug| Category.create!(name:, slug:) }

titles = [
  "Building Modern Rails Engines with Vite SPA",
  "Why Database Studios Matter for Developer Velocity",
  "Dark Mode UX Patterns for Developer Tools",
  "Composite Primary Keys in Rails 7.1",
  "Solid Queue in Production: Six Months Later",
  "Turbo Streams Without the Magic",
  "Indexing Strategies for Busy Postgres Tables",
  "Deploying Rails 8 with Kamal 2",
  "Multi-Database Rails: Replicas and Shards",
  "Writing Fast System Tests with Capybara",
  "Strict Loading: Catch N+1 Before Production",
  "Stimulus Controllers You Can Actually Reuse",
  "The Case for SQLite in Production",
  "Encrypting Attributes with Active Record",
  "Query Objects vs Scopes: A Practical Guide",
  "Designing High-Density Data Tables",
  "Migrating from Sidekiq to Solid Queue",
  "Hotwire Native: One Codebase, Three Apps",
  "Upserts and Bulk Inserts at Scale",
  "Fixtures Are Underrated",
  "Async Queries in Active Record",
  "Normalizes: Cleaner Attribute Input",
  "Zero-Downtime Migrations Checklist",
  "Propshaft and Import Maps in Practice",
  "Counter Caches Done Right",
  "Inline Editing Without a Spreadsheet",
  "Generated Columns in MySQL and Postgres",
  "Authentication Generator Deep Dive",
  "Observability for Rails with OpenTelemetry",
  "Keyboard-First Interfaces for Admin Tools",
  "Parallel Testing on Every Laptop Core",
  "Rails Console Tricks Nobody Told You",
  "Delegated Types for Polymorphic Models",
  "Thruster, Puma, and HTTP/2",
  "Partitioning Event Tables in Postgres",
  "Form Builders That Scale"
]

articles = titles.each_with_index.map do |title, i|
  written_at = (i * 3 + 4).days.ago
  Article.create!(
    created_at: written_at,
    user: users[(i * 5) % users.size],
    category: categories[i % categories.size],
    title:,
    content: "#{title}. Notes, code samples, and lessons learned from shipping it.",
    views_count: [1420, 850, 320].fetch(i) { rng.rand(40..9800) },
    published_at: i % 9 == 8 ? nil : written_at + rng.rand(1..3).days
  )
end

authors = %w[Dave Emma Frank Grace Henry Iris Jack Kira Liam Maya Noah Olive]
bodies = [
  "This engine architecture is so clean!",
  "Can we use this in Rails 8?",
  "Totally agree, inline editing is a huge time saver.",
  "Bookmarked. The SQL examples are gold.",
  "We hit the same N+1 last week.",
  "Would love a follow-up on sharding.",
  "Shipped this to production today, works great.",
  "The benchmarks surprised me.",
  "Clear and practical, thanks for writing it."
]

articles.each_with_index do |article, i|
  (i % 4).times do |j|
    Comment.create!(
      article:,
      author_name: authors[(i + j * 3) % authors.size],
      body: bodies[(i * 2 + j) % bodies.size],
      rating: [5, 5, 4, 3, 5, 4][(i + j) % 6]
    )
  end
end

tags = %w[rails engine database postgres hotwire turbo testing deploy performance ux]
articles.each_with_index do |article, i|
  tags.rotate(i).first(1 + i % 3).each do |tag|
    ActiveRecord::Base.connection.execute(
      "INSERT INTO article_tags (article_id, tag_name, created_at, updated_at) VALUES (#{article.id}, '#{tag}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
    )
  end
end

puts "Demo data: #{User.count} users, #{Article.count} articles, #{Comment.count} comments"
