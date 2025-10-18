# SerranoBudget

A personal budgeting and expense-tracking web application built on a LAMP stack (Linux / Apache / MySQL / PHP).

Repository: https://github.com/KSerrano88/SerranoBudget  
Default branch: main  
Primary language: PHP

Note: This README has been drafted for the repository based on your note that the project uses a LAMP stack and the repository metadata I could read. I couldn't fetch the file tree in this session — paste your git ls-files or ls -R output and I'll update this README to precisely match the repository files and structure.

## Overview

SerranoBudget helps you plan, track, and analyze personal finances with budgets, categories, transactions, and import/export capabilities. The application uses server-side PHP and a MySQL database and is intended to run on Apache.

## Quick summary of expected files (confirm or paste exact list)

Please confirm or provide the exact files if names differ. Typical LAMP PHP project files in this repo may include:

- public/ or www/ (web root)
  - index.php
  - .htaccess
  - assets/css/, assets/js/, assets/img/
- app/ or src/ (application PHP code)
  - Controllers/, Models/, Views/ or templates/
- config/
  - config.php or database.php
  - config.example.php or .env.example
- database/
  - schema.sql, seeds.sql, migrations/
- composer.json, composer.lock (if Composer is used)
- vendor/ (Composer dependencies, usually .gitignored)
- tests/ (PHPUnit)
- README.md (this file)
- LICENSE (optional)

If the repository uses a framework (e.g., simple custom MVC, Laravel, or another micro-framework) let me know and I’ll adapt the instructions.

## Requirements

- Linux / macOS / Windows (with XAMPP/MAMP/WAMP)
- Apache 2.4+ with mod_rewrite
- PHP 7.4+ (PHP 8.0+ recommended)
  - Extensions: pdo_mysql or mysqli, mbstring, json, curl, fileinfo
- MySQL 5.7+ or MariaDB 10.2+
- Composer (if dependencies in composer.json)

## Local setup (example, adapt to your repo’s files)

1. Clone the repo
```bash
git clone https://github.com/KSerrano88/SerranoBudget.git
cd SerranoBudget
```

2. Install PHP dependencies (if composer.json exists)
```bash
composer install
```

3. Create configuration
- Copy example config or env file:
```bash
cp .env.example .env
# or
cp config/config.example.php config/config.php
```
- Edit .env or config/config.php to set:
  - DB_HOST, DB_NAME, DB_USER, DB_PASS
  - APP_ENV=development
  - APP_DEBUG=true
  - BASE_URL=http://localhost/SerranoBudget

4. Create the database and import schema
```bash
mysql -u root -p
CREATE DATABASE serranobudget CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit

# Import schema (adjust path)
mysql -u <user> -p serranobudget < database/schema.sql
```

5. Configure Apache
- Ensure DocumentRoot points to public/ (or the repo’s web root) and AllowOverride All so .htaccess rewrites work. Example vhost:
```
<VirtualHost *:80>
    ServerName serranobudget.local
    DocumentRoot /var/www/SerranoBudget/public

    <Directory /var/www/SerranoBudget/public>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```
- Enable site and mod_rewrite:
```bash
sudo a2ensite serranobudget.conf
sudo a2enmod rewrite
sudo systemctl reload apache2
```

6. File permissions
```bash
sudo chown -R www-data:www-data storage uploads cache || sudo chown -R _www:_www storage uploads cache
sudo chmod -R 775 storage uploads cache
```

7. Access the app
Open http://serranobudget.local or http://localhost/SerranoBudget (depending on vhost or docroot).

## Tests & tools

- Run PHPUnit (if tests exist):
```bash
vendor/bin/phpunit
```
- Static analysis / linters (if configured):
```bash
vendor/bin/phpcs
vendor/bin/phpstan analyse src --level max
```

## Database strategy

- Raw SQL schema: database/schema.sql
- Seeds: database/seeds.sql
- Migrations: (if using Phinx, Laravel migrations, or similar — add commands here)

## Security and deployment notes

- Never commit .env with secrets.
- Set APP_DEBUG=false and disable verbose errors in production.
- Use HTTPS in production and configure strong TLS.
- Back up your database and use migrations for schema changes.

## Troubleshooting

- 500 or blank page: check Apache and PHP error logs.
- Pretty URLs not working: ensure mod_rewrite is enabled and .htaccess exists in the web root.
- Permission issues: ensure webserver user has write access to storage/uploads.

## Contributing

1. Fork
2. Create a branch: git checkout -b feat/your-feature
3. Implement changes, add tests
4. Run tests and linters
5. Open a pull request describing your changes

## License

Add the license used by the project (e.g., MIT). See LICENSE file.

## Maintainer

KSerrano88 — https://github.com/KSerrano88
