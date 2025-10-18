# Copilot onboarding instructions

Repository: KSerrano88/SerranoBudget
Default branch: main
Primary language: PHP
Repository size (approx): 4292 KB

Purpose

This file tells a Copilot coding agent how to onboard and work efficiently in this repository. It is intentionally concise and broadly applicable to PHP LAMP projects. Follow these instructions first; only search the repository when something below is missing or incorrect.

High-level summary

- What the repo does: SerranoBudget is a personal budgeting and expense-tracking web application implemented for a LAMP stack (Linux, Apache, MySQL/MariaDB, PHP). It is server-rendered PHP with frontend assets (HTML/CSS/JS) and SQL schema files.
- Language and size: Primary language PHP. Repo size ~4.3 MB. Default branch: main.

Build & validation quick checklist (always follow in order)

1. Environment
   - Use PHP 8.0+ (7.4 minimum). Ensure extensions: pdo_mysql or mysqli, mbstring, json, curl, fileinfo.
   - MySQL 5.7+ or MariaDB 10.2+.
   - Composer installed (2.x recommended).
2. Bootstrap (always run)
   - composer install
   - cp .env.example .env  (or copy config/config.example.php to config/config.php if present)
   - Edit .env/config to point to a test database and set APP_ENV=development, APP_DEBUG=true, BASE_URL=http://localhost/SerranoBudget
3. Database (always run before starting app/tests)
   - Create database: CREATE DATABASE serranobudget CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   - Import schema if present: mysql -u <user> -p serranobudget < database/schema.sql
   - If migrations exist, run the project’s migration command instead of raw import.
4. Run the app locally (validate web root)
   - Ensure Apache DocumentRoot points to public/ (or repo’s web root). Ensure AllowOverride All for .htaccess and mod_rewrite is enabled.
   - Example: configure vhost and restart Apache (see README for example commands).
5. Quick validations (always run before creating a PR)
   - Syntax check: find . -name "*.php" -exec php -l {} \; (no parse errors)
   - Dependency vulnerabilities: composer audit
   - Static analysis / coding standards: vendor/bin/phpcs and vendor/bin/phpstan if configured
   - Unit tests: vendor/bin/phpunit (or phpunit) — run all tests and ensure green
   - End-to-end smoke: load the main page and a few key pages (login, transactions list, budget view) if possible
6. Common commands
   - composer install
   - composer update (only when updating deps)
   - vendor/bin/phpunit
   - vendor/bin/phpcs
   - vendor/bin/phpstan analyse src --level max

Project layout & where to make changes

- Web root: public/ or www/ — place for index.php, .htaccess, and built frontend assets.
- Application PHP: app/ or src/ — Controllers, Models, Views (templates). Search these directories for logic to modify.
- Views/templates: resources/views/ or app/Views/ — UI and HTML templates. Small UI changes usually go here.
- Config: config/ or .env — DB connection, base URL, debug flags. Always update .env in development only.
- Database: database/ or sql/ — schema.sql, seeds.sql, migrations/.
- Composer files: composer.json, composer.lock — dependency changes require composer install and CI will run composer install as part of checks.
- Tests: tests/ — PHPUnit tests. Run these locally and keep them green.

CI and pre-merge checks

- Check .github/workflows/ for GitHub Actions workflows. If present, replicate steps locally:
  - composer install --no-interaction --prefer-dist
  - composer test or vendor/bin/phpunit
  - vendor/bin/phpcs (lint)
  - Static analysis (phpstan)
- Before committing: run the full validation checklist above. The most common PR rejection causes are failing tests, lint errors, missing composer install, and environment misconfiguration.

Pitfalls and gotchas

- .env is not committed. Do not expect secrets; set local .env from .env.example.
- mod_rewrite / Pretty URLs: If routes return 404, ensure .htaccess is present and Apache’s mod_rewrite is enabled.
- File permissions: storage, uploads, cache directories must be writable by webserver (www-data or _www). Use chown/chmod as required.
- Database connectivity: CI uses ephemeral DB; ensure migrations or schema import reproducible in CI.
- Composer memory/timeouts: composer install may fail on low-memory CI; use COMPOSER_MEMORY_LIMIT=-1 if necessary.

How the agent should operate (behavioral rules)

- Always follow these instructions first. Only perform repository-wide searches (grep / code search) if:
  1) a required file or directory from this document is missing, or
  2) a command fails with a clear error pointing to missing/alternative files.
- Make minimal, focused changes. Keep PRs small and include tests for behavior changes.
- Run full validation locally before proposing a PR. Include the exact commands you ran in the PR description and their outputs.
- Do not commit secrets (.env). Use example files or environment variables.

If something fails

- Re-run composer install and migrations, capture full error logs.
- For syntax errors, run php -l on the failing file and fix parse errors.
- For failing tests, run the specific test class with --filter to iterate quickly.
- If CI fails with environment issues, replicate CI commands locally and document differences in the PR.

Files & places to check first

Root-level (expected): README.md, composer.json, composer.lock, .env.example or config/, public/ or www/, app/ or src/, database/, tests/, .github/workflows/

Trust these instructions

These notes are authoritative for day-to-day work in this repository. Only search the repository when these instructions are incomplete or an explicit error indicates a mismatch. When in doubt, run the minimal reproducible commands above and include outputs in the PR.