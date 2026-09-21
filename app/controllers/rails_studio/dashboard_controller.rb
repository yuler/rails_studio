# frozen_string_literal: true

module RailsStudio
  class DashboardController < ApplicationController
    def index
      script_name = request.script_name.presence || ""
      # Normalizes prefix (removes trailing slash)
      @base_path = script_name.sub(%r{/\z}, "")

      respond_to do |format|
        format.html { render "rails_studio/dashboard/index", layout: false }
        format.all  { render "rails_studio/dashboard/index", layout: false, content_type: "text/html" }
      end
    end

    def asset
      relative_path = params[:path].to_s
      relative_path = "#{relative_path}.#{params[:format]}" if params[:format].present? && !relative_path.end_with?(".#{params[:format]}")
      public_dir = File.expand_path(File.join(Engine.root, "public", "assets"))
      file_path = File.expand_path(File.join(public_dir, relative_path))

      # Prevent directory traversal attacks
      if (file_path == public_dir || file_path.start_with?("#{public_dir}/")) && File.file?(file_path)
        ext = File.extname(file_path).delete_prefix(".")
        content_type = case ext
        when "js", "mjs" then "application/javascript"
        when "css" then "text/css"
        when "svg" then "image/svg+xml"
        when "json" then "application/json"
        when "woff2" then "font/woff2"
        when "woff" then "font/woff"
        when "ttf" then "font/ttf"
        when "png" then "image/png"
        when "jpg", "jpeg" then "image/jpeg"
        when "ico" then "image/x-icon"
        else "application/octet-stream"
        end

        response.headers["Cache-Control"] = "public, max-age=31536000, immutable" if Rails.env.production?
        send_file file_path, type: content_type, disposition: "inline"
      else
        head :not_found
      end
    end
  end
end
