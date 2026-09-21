# frozen_string_literal: true

# Clean up
Comment.destroy_all rescue nil
Article.destroy_all rescue nil
Category.destroy_all rescue nil
User.destroy_all rescue nil

alice = User.create!(name: "Alice Johnson", email: "alice@rubyonrails.org", role: :admin, active: true, bio: "Rails core contributor and database enthusiast.")
bob = User.create!(name: "Bob Smith", email: "bob@example.com", role: :member, active: true, bio: "Full stack developer building cool stuff.")
charlie = User.create!(name: "Charlie Brown", email: "charlie@peanuts.org", role: :guest, active: false, bio: "Occasional reader.")

tech = Category.create!(name: "Technology", slug: "technology")
design = Category.create!(name: "Design & UX", slug: "design-ux")
rails_cat = Category.create!(name: "Ruby on Rails", slug: "ruby-on-rails")

art1 = Article.create!(
  user: alice,
  category: rails_cat,
  title: "Building Modern Rails Engines with Vite SPA",
  content: "Mountable engines provide the cleanest way to embed developer tools directly into Rails applications without polluting dependencies.",
  views_count: 1420,
  published_at: 2.days.ago
)

art2 = Article.create!(
  user: bob,
  category: tech,
  title: "Why Database Studios Matter for Developer Velocity",
  content: "Switching between heavy desktop clients like DBeaver or TablePlus breaks flow. In-browser studios like Prisma Studio and Rails Studio make inspecting records effortless.",
  views_count: 850,
  published_at: 1.day.ago
)

art3 = Article.create!(
  user: alice,
  category: design,
  title: "Dark Mode UX Patterns for Developer Tools",
  content: "Designing high density data tables with keyboard shortcuts, badges, and drawers.",
  views_count: 320,
  published_at: 5.hours.ago
)

Comment.create!(article: art1, author_name: "Dave", body: "This engine architecture is so clean!", rating: 5)
Comment.create!(article: art1, author_name: "Emma", body: "Can we use this in Rails 8?", rating: 5)
Comment.create!(article: art2, author_name: "Frank", body: "Totally agree, inline editing is a huge time saver.", rating: 4)

ActiveRecord::Base.connection.execute("INSERT INTO article_tags (article_id, tag_name, created_at, updated_at) VALUES (#{art1.id}, 'rails', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")
ActiveRecord::Base.connection.execute("INSERT INTO article_tags (article_id, tag_name, created_at, updated_at) VALUES (#{art1.id}, 'engine', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")
ActiveRecord::Base.connection.execute("INSERT INTO article_tags (article_id, tag_name, created_at, updated_at) VALUES (#{art2.id}, 'database', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")

puts "Dummy database seeded successfully!"
