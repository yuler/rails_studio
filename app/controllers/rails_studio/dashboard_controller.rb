# frozen_string_literal: true

module RailsStudio
  class DashboardController < ApplicationController
    LOGO_FILES = %w[logo.svg logo-light.svg logo-dark.svg].freeze

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

      unless File.file?(file_path)
        logo_dir = File.expand_path(File.join(Engine.root, "assets"))
        logo_path = File.expand_path(File.join(logo_dir, File.basename(relative_path)))
        if LOGO_FILES.include?(File.basename(logo_path)) && logo_path.start_with?("#{logo_dir}/") && File.file?(logo_path)
          file_path = logo_path
        end
      end

      served_from_public = file_path == public_dir || file_path.start_with?("#{public_dir}/")
      served_from_logos = LOGO_FILES.include?(File.basename(file_path)) &&
        file_path.start_with?("#{File.expand_path(File.join(Engine.root, "assets"))}/")

      if (served_from_public || served_from_logos) && File.file?(file_path)
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
