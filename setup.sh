#!/bin/bash

# ==============================================================================
# M-GYM v2 Deployment Script for Ubuntu 24.04
# Run this script with: sudo bash setup.sh
# ==============================================================================

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit
fi

echo "=========================================================="
echo " Starting M-GYM v2 Setup on Ubuntu 24.04..."
echo "=========================================================="

APP_DIR=$(pwd)
DB_NAME="m-gym"

echo ""
read -p "Enter PostgreSQL Username for M-GYM [mgym_user]: " PG_USER
PG_USER=${PG_USER:-mgym_user}
read -s -p "Enter PostgreSQL Password for M-GYM [mgym_pass]: " PG_PASS
echo ""
PG_PASS=${PG_PASS:-mgym_pass}
echo ""

read -p "Enter Initial Web Admin Username [admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}
read -s -p "Enter Initial Web Admin Password [admin123]: " ADMIN_PASS
echo ""
ADMIN_PASS=${ADMIN_PASS:-admin123}
echo ""

# 1. Update and install basic dependencies
echo "[1/7] Updating system and installing basic dependencies..."
apt-get update
apt-get install -y curl wget git build-essential unzip

# 2. Install PostgreSQL
echo "[2/7] Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql


# Setup PostgreSQL Database
echo "Setting up PostgreSQL Database '$DB_NAME'..."
sudo -u postgres psql -c "CREATE USER $PG_USER WITH PASSWORD '$PG_PASS';"
sudo -u postgres psql -c "ALTER ROLE $PG_USER SET client_encoding TO 'utf8';"
sudo -u postgres psql -c "CREATE DATABASE \"$DB_NAME\" OWNER $PG_USER ENCODING 'UTF8' TEMPLATE template0;"
sudo -u postgres psql -c "ALTER DATABASE \"$DB_NAME\" SET client_encoding TO 'utf8';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE \"$DB_NAME\" TO $PG_USER;"
# For PostgreSQL 15+, need to grant schema public privileges
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $PG_USER;"

# Configure Backend .env for PostgreSQL
echo "Configuring backend environment for PostgreSQL..."
cat > "$APP_DIR/backend/.env" << EOF
DB_DRIVER=postgres
DB_USER=$PG_USER
DB_PASS=$PG_PASS
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=$DB_NAME
PORT=3000
DEFAULT_ADMIN_USER=$ADMIN_USER
DEFAULT_ADMIN_PASS=$ADMIN_PASS
EOF

# 3. Install Go (Golang)
echo "[3/7] Installing Golang (1.22.1)..."
GO_VERSION="1.22.1"
wget https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz
rm -rf /usr/local/go
tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz
rm go${GO_VERSION}.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
echo "export PATH=\$PATH:/usr/local/go/bin" >> /etc/profile

# 4. Build Backend
echo "[4/7] Building Backend..."
cd "$APP_DIR/backend"
/usr/local/go/bin/go build -o gym-be main.go
cd "$APP_DIR"

# 5. Install Node.js (LTS) & Build Frontend
echo "[5/7] Installing Node.js and building Frontend..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g serve

cd "$APP_DIR/frontend"
npm install
npm run build
cd "$APP_DIR"

# 6. Create Systemd Services
echo "[6/7] Creating Systemd Services (gym-be & gym-fe)..."

# Backend Service
cat > /etc/systemd/system/gym-be.service << EOF
[Unit]
Description=M-GYM Backend Service (Golang)
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR/backend
ExecStart=$APP_DIR/backend/gym-be
Restart=on-failure
RestartSec=5
Environment="PORT=3000"

[Install]
WantedBy=multi-user.target
EOF

# Frontend Service
cat > /etc/systemd/system/gym-fe.service << EOF
[Unit]
Description=M-GYM Frontend Service (React/Vite)
After=network.target gym-be.service

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR/frontend
ExecStart=/usr/bin/npx serve -s dist -l 5173
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 7. Start Services
echo "[7/7] Reloading daemon and starting services..."
systemctl daemon-reload
systemctl enable gym-be
systemctl enable gym-fe
systemctl restart gym-be
systemctl restart gym-fe

echo "=========================================================="
echo " M-GYM Deployment Completed Successfully!"
echo "=========================================================="
echo "Backend is running on: http://localhost:3000"
echo "Frontend is running on: http://localhost:5173"
echo "To check logs, run: journalctl -u gym-be -f"
echo "or: journalctl -u gym-fe -f"
