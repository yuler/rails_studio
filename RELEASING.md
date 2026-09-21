# Releasing rails_studio

Publish to [RubyGems](https://rubygems.org/gems/rails_studio) from a machine that can sign in to the owner account. Do not commit API keys.

## One-time setup

1. Create an account at [rubygems.org/sign_up](https://rubygems.org/sign_up) and enable MFA.
2. Confirm you can publish as **yuler** (the gemspec author). The first successful push owns the gem name.
3. Sign in locally:

   ```bash
   gem signin
   ```

   This writes `~/.gem/credentials` (keep it out of git; mode `600`).
4. Optional later: [Trusted Publishing](https://guides.rubygems.org/trusted-publishing/) for GitHub Actions instead of a long-lived API key.

## Each release

1. Bump `RailsStudio::VERSION` in `lib/rails_studio/version.rb`. Versions on RubyGems are immutable — never reuse a version.
2. Move notes in `CHANGELOG.md` from `[Unreleased]` into a dated `## [x.y.z] - YYYY-MM-DD` section. Update the compare links at the bottom.
3. Compile frontend assets into `public/assets/` (those files are what the gem ships):

   ```bash
   mise run build
   ```

4. Commit everything that should be in the tag (`version.rb`, `CHANGELOG.md`, built assets if they changed).
5. Release:

   ```bash
   bundle exec rake release
   ```

   Bundler will create tag `v<version>`, push the tag, build the `.gem`, and `gem push` to RubyGems.

   Dry-run the package without publishing:

   ```bash
   gem build rails_studio.gemspec
   gem unpack rails_studio-*.gem
   ```

   Confirm `public/assets/` is inside the gem, then delete the local `.gem` / unpacked dir.

6. After the first push, verify: https://rubygems.org/gems/rails_studio

## If `rake release` fails after the tag exists

The git tag may already be on GitHub while RubyGems never received the gem. Do **not** retag the same version. Push the existing package:

```bash
gem build rails_studio.gemspec
gem push rails_studio-x.y.z.gem
```

## Yanking

Only yank a version for a serious security issue. Prefer shipping a new version.
