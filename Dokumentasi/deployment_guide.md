# M-GYM Deployment Guide (Windows to Ubuntu)

Panduan ini menjelaskan langkah-langkah untuk mendeploy aplikasi M-GYM dari environment *development* (Windows) ke *production* server (Ubuntu).

## 1. Persiapan Server Ubuntu

1. **Update Sistem**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install MySQL Server**
   ```bash
   sudo apt install mysql-server -y
   sudo mysql_secure_installation
   ```
   *Buat user MySQL dan database `m-gym` sesuai dengan `.env`.*

3. **Install Golang**
   ```bash
   wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
   sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
   export PATH=$PATH:/usr/local/go/bin
   ```

4. **Install Nginx & Node.js (via NVM/Nodesource)**
   ```bash
   sudo apt install nginx -y
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

## 2. Deployment Backend (Golang)

1. Clone/Upload *source code* backend ke Ubuntu (misal: `/var/www/mgym/backend`).
2. Build aplikasi Golang:
   ```bash
   go build -o mgym-api main.go
   ```
3. Buat file `.env` di folder backend:
   ```env
   DB_USER=root
   DB_PASS=password_kuat
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_NAME=m-gym
   PORT=3000
   ```
4. Setup *Systemd Service* agar backend berjalan di *background*:
   `sudo nano /etc/systemd/system/mgym.service`
   ```ini
   [Unit]
   Description=M-GYM Backend API

   [Service]
   Type=simple
   Restart=always
   RestartSec=5s
   WorkingDirectory=/var/www/mgym/backend
   ExecStart=/var/www/mgym/backend/mgym-api

   [Install]
   WantedBy=multi-user.target
   ```
5. Start & Enable service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl start mgym
   sudo systemctl enable mgym
   ```

## 3. Deployment Frontend (React + Vite)

1. Di komputer Windows Anda, build frontend:
   ```powershell
   cd frontend
   npm run build
   ```
   *Ini akan menghasilkan folder `dist/`.*
2. Upload folder `dist/` ke Ubuntu (misal: `/var/www/mgym/frontend/dist`).
3. Konfigurasi Nginx untuk men-serve frontend dan reverse-proxy ke backend:
   `sudo nano /etc/nginx/sites-available/mgym`
   ```nginx
   server {
       listen 80;
       server_name domain-gym-anda.com;

       root /var/www/mgym/frontend/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /api/ {
           proxy_pass http://127.0.0.1:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```
4. Enable konfigurasi dan restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/mgym /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## 4. Final Review
- Pastikan firewall (UFW) mengizinkan port 80 dan 443.
- Gunakan Certbot untuk SSL (HTTPS).
  ```bash
  sudo apt install certbot python3-certbot-nginx
  sudo certbot --nginx -d domain-gym-anda.com
  ```
- **Selesai!** Aplikasi "End-to-End" siap digunakan.
