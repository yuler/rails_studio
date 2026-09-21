# frozen_string_literal: true

class User < ApplicationRecord
  has_many :articles, dependent: :destroy
  enum :role, { member: "member", admin: "admin", guest: "guest" }, default: :member
end
