# PostgreSQL Setup on Ubuntu 24.04 LTS (Production)

This guide installs and configures PostgreSQL natively on Ubuntu 24.04.4 LTS for the Sprogeny application. No Docker required.

---

## 1. Install PostgreSQL

Ubuntu 24.04 ships PostgreSQL 16 in its default repos.

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
```

Verify it's running:

```bash
sudo systemctl status postgresql
```

## 2. Create the database and role

The app connects via the `DATABASE_URL` env var. In the dev Docker setup, this uses `root` / `mysecretpassword` / `local`. For production, use a dedicated role with a strong password.

Switch to the `postgres` system user and open psql:

```bash
sudo -u postgres psql
```

Run the following SQL (replace `STRONG_PASSWORD_HERE` with a real password):

```sql
-- Create the application role
CREATE ROLE sprogeny WITH LOGIN PASSWORD 'STRONG_PASSWORD_HERE';

-- Create the database owned by that role
CREATE DATABASE sprogeny OWNER sprogeny;

-- Connect to the new database to set up extensions if needed
\c sprogeny

-- Grant schema usage (the app uses drizzle to manage tables)
GRANT ALL ON SCHEMA public TO sprogeny;

\q
```

## 3. Configure PostgreSQL authentication

Edit the host-based authentication file to allow the app role to connect via password over localhost:

```bash
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

Find the local/IPv4 section and ensure this line exists (it usually does by default):

```
# IPv4 local connections:
host    all             all             127.0.0.1/32            scram-sha-256
```

If you changed it, reload:

```bash
sudo systemctl reload postgresql
```

## 4. Configure PostgreSQL for production

Edit the main config:

```bash
sudo nano /etc/postgresql/16/main/postgresql.conf
```

Key settings to verify or adjust:

```ini
# Listen only on localhost (default). Change to '*' if the app server
# is on a different machine, then restrict access via pg_hba.conf.
listen_addresses = 'localhost'

# Default port
port = 5432

# Connection limits — adjust based on expected load.
# The app uses postgres.js which maintains a connection pool (default 10).
max_connections = 100

# Memory — adjust based on available RAM
shared_buffers = 256MB          # ~25% of available RAM for a small VPS
effective_cache_size = 768MB    # ~75% of available RAM
work_mem = 4MB
maintenance_work_mem = 64MB

# WAL / durability
wal_level = replica
max_wal_size = 1GB

# Logging
log_min_duration_statement = 1000   # log queries slower than 1s
log_line_prefix = '%t [%p] %u@%d '
```

Apply changes:

```bash
sudo systemctl restart postgresql
```

## 5. Test the connection

```bash
psql -h 127.0.0.1 -U sprogeny -d sprogeny
```

Enter the password when prompted. You should get a `sprogeny=>` prompt. Type `\q` to exit.

## 6. Configure PM2 and environment variables

The project uses a single `.env` file for local dev credentials. In production, PM2 loads environment variables from a separate env file so they take precedence over `.env` automatically.

### Install PM2

```bash
sudo npm install -g pm2
```

### Create the production environment file

```bash
sudo mkdir -p /etc/sprogeny
sudo nano /etc/sprogeny/env
```

```bash
DATABASE_URL="postgres://sprogeny:STRONG_PASSWORD_HERE@127.0.0.1:5432/sprogeny"
ORIGIN="https://yourdomain.com"
BETTER_AUTH_SECRET="generate-a-32-char-high-entropy-string"
SPOTIFY_CLIENT_ID="your-spotify-client-id"
SPOTIFY_CLIENT_SECRET="your-spotify-client-secret"
SPOTIFY_REDIRECT_URI="https://yourdomain.com/api/auth/callback/spotify"
```

Lock down permissions:

```bash
sudo chmod 600 /etc/sprogeny/env
sudo chown root:root /etc/sprogeny/env
```

### Create the ecosystem config

```bash
nano /var/www/sprogeny.com/app/ecosystem.config.cjs
```

```js
module.exports = {
	apps: [
		{
			name: 'sprogeny',
			script: './build/index.js',
			env_file: '/etc/sprogeny/env',
			node_args: '--env-file=/etc/sprogeny/env',
			instances: 1,
			autorestart: true,
			max_memory_restart: '512M',
			log_date_format: 'YYYY-MM-DD HH:mm:ss',
			error_file: '/var/log/sprogeny/error.log',
			out_file: '/var/log/sprogeny/app.log',
			merge_logs: true
		}
	]
};
```

### Start the app

```bash
sudo mkdir -p /var/log/sprogeny
sudo chown $(whoami):$(whoami) /var/log/sprogeny

pm2 start ecosystem.config.cjs
```

### Enable PM2 to start on boot

```bash
pm2 startup
# Run the command it outputs (sudo env PATH=... pm2 startup ...)
pm2 save
```

### Common PM2 commands

```bash
pm2 status              # Check app status
pm2 logs sprogeny       # Tail logs
pm2 restart sprogeny    # Restart after deploy
pm2 reload sprogeny     # Zero-downtime reload
pm2 stop sprogeny       # Stop the app
pm2 monit               # Live monitoring dashboard
```

## 7. Run database migrations

From the project directory on the production server, pass the production `DATABASE_URL` inline (the `.env` file contains dev credentials, so override it):

```bash
# Option A: Push schema directly (good for initial setup)
DATABASE_URL="postgres://sprogeny:STRONG_PASSWORD_HERE@127.0.0.1:5432/sprogeny" npx drizzle-kit push

# Option B: Generate and run migrations (better for ongoing changes)
npx drizzle-kit generate
DATABASE_URL="postgres://sprogeny:STRONG_PASSWORD_HERE@127.0.0.1:5432/sprogeny" npx drizzle-kit migrate
```

Or source the env file first:

```bash
set -a && source /etc/sprogeny/env && set +a
npx drizzle-kit migrate
```

This creates the following tables defined in the app schema:

| Table                  | Purpose                          | Source           |
| ---------------------- | -------------------------------- | ---------------- |
| `user`                 | User accounts (better-auth)      | `auth.schema.ts` |
| `session`              | Active sessions                  | `auth.schema.ts` |
| `account`              | OAuth provider links (Spotify)   | `auth.schema.ts` |
| `verification`         | Email verification tokens        | `auth.schema.ts` |
| `task`                 | Application tasks                | `schema.ts`      |
| `used_playlist_tracks` | Dedup tracking per user (hashed) | `schema.ts`      |

Verify the tables were created:

```bash
psql -h 127.0.0.1 -U sprogeny -d sprogeny -c '\dt'
```

## 8. Backups

Set up a daily pg_dump via cron:

```bash
sudo mkdir -p /var/backups/postgresql
sudo chown postgres:postgres /var/backups/postgresql
```

Create the backup script:

```bash
sudo nano /usr/local/bin/backup-sprogeny-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="sprogeny_${TIMESTAMP}.sql.gz"

pg_dump -h 127.0.0.1 -U sprogeny sprogeny | gzip > "${BACKUP_DIR}/${FILENAME}"

# Keep last 14 days
find "${BACKUP_DIR}" -name "sprogeny_*.sql.gz" -mtime +14 -delete
```

```bash
sudo chmod +x /usr/local/bin/backup-sprogeny-db.sh
```

Add a cron job for the postgres user:

```bash
sudo crontab -u postgres -e
```

```cron
0 3 * * * /usr/local/bin/backup-sprogeny-db.sh
```

To store the password for unattended backups, create a `.pgpass` file for the postgres user:

```bash
sudo -u postgres bash -c 'echo "127.0.0.1:5432:sprogeny:sprogeny:STRONG_PASSWORD_HERE" > ~/.pgpass && chmod 600 ~/.pgpass'
```

## 9. Firewall

PostgreSQL should not be exposed to the internet. If using `ufw`:

```bash
# Ensure SSH is allowed first
sudo ufw allow OpenSSH

# Allow the app port
sudo ufw allow 9002/tcp

# Do NOT allow 5432 from outside — only localhost connections
sudo ufw enable
```

If you need remote DB access (e.g., from a separate app server), allow only that IP:

```bash
sudo ufw allow from <APP_SERVER_IP> to any port 5432
```

## 10. Restore from backup

```bash
gunzip -c /var/backups/postgresql/sprogeny_YYYYMMDD_HHMMSS.sql.gz | psql -h 127.0.0.1 -U sprogeny sprogeny
```

---

## Quick reference

| Item               | Value                                                    |
| ------------------ | -------------------------------------------------------- |
| PostgreSQL version | 16 (Ubuntu 24.04 default)                                |
| Config file        | `/etc/postgresql/16/main/postgresql.conf`                |
| HBA file           | `/etc/postgresql/16/main/pg_hba.conf`                    |
| Data directory     | `/var/lib/postgresql/16/main`                            |
| PG log directory   | `/var/log/postgresql`                                    |
| PG service control | `sudo systemctl {start,stop,restart,reload} postgresql`  |
| DB name            | `sprogeny`                                               |
| DB role            | `sprogeny`                                               |
| App connection     | `postgres://sprogeny:<password>@127.0.0.1:5432/sprogeny` |
| Env file           | `/etc/sprogeny/env`                                      |
| PM2 config         | `/var/www/sprogeny.com/app/ecosystem.config.cjs`         |
| PM2 app control    | `pm2 {start,stop,restart,reload,logs} sprogeny`          |
| App log directory  | `/var/log/sprogeny`                                      |
| Backup location    | `/var/backups/postgresql`                                |
