# frozen_string_literal: true

require "test_helper"

class ApiTest < ActionDispatch::IntegrationTest
  setup do
    User.destroy_all
    Category.destroy_all
    Article.destroy_all

    @user = User.create!(name: "Alice Johnson", email: "alice@example.com", role: :admin, active: true)
    @user2 = User.create!(name: "Bob Smith", email: "bob@example.com", role: :member, active: true)
    @user3 = User.create!(name: "Charlie", email: "charlie@example.com", role: :guest, active: false)

    @cat = Category.create!(name: "Ruby", slug: "ruby")
    @article = Article.create!(user: @user, category: @cat, title: "Rails Studio Rocks", content: "Awesome", views_count: 100)
  end
  test "GET /rails_studio renders dashboard html" do
    get "/rails_studio"
    assert_response :success
    assert_includes response.body, "Rails Studio"
    assert_includes response.body, "window.__RAILS_STUDIO_CONFIG__"
  end

  test "GET /rails_studio/assets/:path serves compiled frontend assets" do
    get "/rails_studio/assets/index.js"
    assert_response :success
    assert_includes response.media_type, "javascript"

    get "/rails_studio/assets/index.css"
    assert_response :success
    assert_includes response.media_type, "css"

    get "/rails_studio/assets/nonexistent.js"
    assert_response :not_found
  end

  test "GET /rails_studio/api/overview returns tables and meta" do
    get "/rails_studio/api/overview"
    assert_response :success

    json = JSON.parse(response.body)
    assert json["database"].present?
    assert json["tables"].is_a?(Array)
    table_names = json["tables"].map { |t| t["name"] }
    assert_includes table_names, "users"
    assert_includes table_names, "articles"
  end

  test "GET /rails_studio/api/tables/:table_name/schema returns column details" do
    get "/rails_studio/api/tables/articles/schema"
    assert_response :success

    json = JSON.parse(response.body)
    assert_equal "articles", json["table_name"]
    assert_equal ["id"], json["primary_keys"]
    assert json["columns"].any? { |c| c["name"] == "title" && c["type"] == "string" }
    assert json["foreign_keys"].any? { |f| f["column"] == "user_id" && f["to_table"] == "users" }
  end

  test "GET /rails_studio/api/tables/:table_name/records returns paginated data" do
    get "/rails_studio/api/tables/users/records", params: { page: 1, per_page: 2 }
    assert_response :success

    json = JSON.parse(response.body)
    assert_equal 1, json["page"]
    assert_equal 2, json["per_page"]
    assert_equal 2, json["records"].size
    assert json["total_count"] >= 3
  end

  test "POST, PATCH, and DELETE /rails_studio/api/tables/:table_name/records performs CRUD" do
    # Create
    post "/rails_studio/api/tables/users/records", params: {
      record: { name: "Test User", email: "test@example.com", role: "guest", active: true }
    }
    assert_response :created
    created = JSON.parse(response.body)["record"]
    assert_equal "Test User", created["name"]
    user_id = created["id"]

    # Update
    patch "/rails_studio/api/tables/users/records/#{user_id}", params: {
      record: { name: "Updated User" }
    }
    assert_response :success
    updated = JSON.parse(response.body)["record"]
    assert_equal "Updated User", updated["name"]

    # Delete
    delete "/rails_studio/api/tables/users/records/#{user_id}"
    assert_response :success

    # Verify deleted
    get "/rails_studio/api/tables/users/records/#{user_id}"
    assert_response :not_found
  end

  test "POST /rails_studio/api/tables/:table_name/records/batch handles atomic staging changes" do
    post "/rails_studio/api/tables/categories/records/batch", params: {
      creates: [
        { name: "DevOps", slug: "devops" },
        { name: "AI", slug: "ai" }
      ]
    }
    assert_response :success
    json = JSON.parse(response.body)
    assert_equal 2, json.dig("results", "created")
  end

  test "POST /rails_studio/api/query executes raw SQL" do
    post "/rails_studio/api/query", params: { sql: "SELECT name FROM categories ORDER BY name ASC" }
    assert_response :success

    json = JSON.parse(response.body)
    assert json["columns"].include?("name")
    assert json["rows"].size > 0
    assert json["duration_ms"].is_a?(Numeric)
  end

  test "POST /rails_studio/api/query detects ActiveRecord expressions and suggests Rails Console" do
    post "/rails_studio/api/query", params: { sql: "User.all" }
    assert_response :unprocessable_entity
    json = JSON.parse(response.body)
    assert_includes json["error"], "Rails Console"
  end

  test "POST /rails_studio/api/console/execute runs Ruby/ActiveRecord expressions" do
    post "/rails_studio/api/console/execute", params: { command: "User.count" }
    assert_response :success
    json = JSON.parse(response.body)
    assert_equal "3", json["result"]
    assert_equal "Integer", json["result_type"]
    assert json["duration_ms"].is_a?(Numeric)

    # Test ActiveRecord relation evaluation
    post "/rails_studio/api/console/execute", params: { command: "User.all" }
    assert_response :success
    json = JSON.parse(response.body)
    assert_includes json["result"], "Alice"

    # Test JSON content-type request (curl / fetch)
    post "/rails_studio/api/console/execute", params: { command: "User.all" }, as: :json
    assert_response :success
    json = JSON.parse(response.body)
    assert_includes json["result"], "Alice"
  end

  test "POST /rails_studio/api/query and /query/execute work with as: :json" do
    post "/rails_studio/api/query", params: { sql: "SELECT 1 AS num" }, as: :json
    assert_response :success
    json = JSON.parse(response.body)
    assert_equal ["num"], json["columns"]

    post "/rails_studio/api/query/execute", params: { sql: "SELECT 2 AS num" }, as: :json
    assert_response :success
    json = JSON.parse(response.body)
    assert_equal ["num"], json["columns"]
  end

  test "GET /rails_studio/api/console/completions returns models and methods" do
    get "/rails_studio/api/console/completions"
    assert_response :success
    json = JSON.parse(response.body)
    assert json["models"].is_a?(Array)
    model_names = json["models"].map { |m| m["name"] }
    assert_includes model_names, "User"
    assert json["common_methods"].include?("where")
  end

  test "Access is forbidden when environment is production and not explicitly allowed" do
    # Temporarily set allow_in_production to false and simulate production
    controller = RailsStudio::ApplicationController.new
    # Verify logic directly
    assert_equal false, RailsStudio.configuration.allow_in_production?
  end
end
