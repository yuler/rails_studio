# frozen_string_literal: true

RailsStudio::Engine.routes.draw do
  root to: "dashboard#index"
  get "assets/*path", to: "dashboard#asset", format: false, as: :asset

  namespace :api do
    get "overview", to: "overview#show"
    get "tables/:table_name/schema", to: "tables#schema"
    get "tables/:table_name/records", to: "records#index"
    post "tables/:table_name/records", to: "records#create"
    get "tables/:table_name/records/:id", to: "records#show"
    patch "tables/:table_name/records/:id", to: "records#update"
    delete "tables/:table_name/records/:id", to: "records#destroy"
    post "tables/:table_name/records/batch", to: "records#batch"
    post "query", to: "query#execute"
  end

  get "*path", to: "dashboard#index", constraints: ->(req) { !req.xhr? && req.format.html? }
end
