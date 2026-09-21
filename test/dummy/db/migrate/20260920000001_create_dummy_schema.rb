# frozen_string_literal: true

class CreateDummySchema < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :name, null: false
      t.string :email, null: false
      t.string :role, default: "member"
      t.boolean :active, default: true
      t.text :bio
      t.timestamps
    end

    create_table :categories do |t|
      t.string :name, null: false
      t.string :slug, null: false
      t.timestamps
    end

    create_table :articles do |t|
      t.references :user, null: false, foreign_key: true
      t.references :category, foreign_key: true
      t.string :title, null: false
      t.text :content
      t.integer :views_count, default: 0
      t.datetime :published_at
      t.timestamps
    end

    create_table :comments do |t|
      t.references :article, null: false, foreign_key: true
      t.string :author_name, null: false
      t.text :body, null: false
      t.integer :rating, default: 5
      t.timestamps
    end

    create_table :article_tags, primary_key: [ :article_id, :tag_name ] do |t|
      t.integer :article_id, null: false
      t.string :tag_name, null: false
      t.timestamps
    end
  end
end
