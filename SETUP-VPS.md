# Setup VPS - SMK TKJ Akademik

## Persiapan VPS

### 1. Buat VPS
- **Provider:** DigitalOcean / Hetzner / Vultr / AWS
- **OS:** Ubuntu 22.04 LTS
- **RAM:** 1 GB minimum (2 GB recommended)
- **Storage:** 20 GB
- **Port yang dibuka:** 22, 80, 443

### 2. Setup Domain
Beli domain (misal: `smk-tkj.com`) lalu tambahkan DNS Record:
```
Type  | Name | Value
A     | @    | IP_VPS_ANDA
A     | www  | IP_VPS_ANDA
```

### 3. Install Docker di VPS
```bash
# Login ke VPS
ssh root@IP_VPS_ANDA

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Docker Compose
apt install -y docker-compose-plugin
```

### 4. Upload Project
```bash
# Clone dari GitHub
cd /opt
git clone https://github.com/YOUR_USERNAME/smk-akademik.git
cd smk-akademik

# Atau upload manual via SCP
scp -r C:\Users\MSI\THIN\15\smk-akademik\* root@IP_VPS:/opt/smk-akademik/
```

### 5. Setup Environment
```bash
cd /opt/smk-akademik/backend

# Copy template
cp .env.production .env

# Edit isi .env
nano .env
```

Isi `.env` dengan data Anda:
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://mongodb:27017/smk_akademik
JWT_SECRET=buat-random-string-disini
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://smk-tkj.com/api/auth/google/callback
TELEGRAM_BOT_TOKEN=8964110722:AAEAxvMmqc-Dgni-nODLwmp4IgtslbOC5m4
FRONTEND_URL=https://smk-tkj.com
N8N_SECRET=buat-random-string-disini
```

### 6. Setup Nginx Config
```bash
cd /opt/smk-akademik/nginx/conf.d

# Edit domain name
sed -i 's/DOMAIN_NAME/smk-tkj.com/g' 00-http.conf
sed -i 's/DOMAIN_NAME/smk-tkj.com/g' 01-https.conf
```

### 7. Build & Jalankan
```bash
cd /opt/smk-akademik

# Build containers
docker-compose up -d --build

# Cek status
docker-compose ps

# Lihat log
docker-compose logs -f backend
```

### 8. Setup SSL (Let's Encrypt)
```bash
# Install certbot di VPS (bukan di container)
apt install -y certbot

# Generate sertifikat
certbot certonly --webroot -w /var/www/certbot -d smk-tkj.com -d www.smk-tkj.com

# Copy sertifikat ke folder nginx
mkdir -p nginx/ssl
cp -r /etc/letsencrypt/live/smk-tkj.com/* nginx/ssl/

# Restart nginx
docker-compose restart nginx
```

### 9. Setup Telegram Webhook
```bash
# Set webhook ke domain
curl -X POST "https://api.telegram.org/botTOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://smk-tkj.com/api/webhook/telegram"}'
```

## Selesai!

Akses:
- **Website:** https://smk-tkj.com
- **Admin:** https://smk-tkj.com/admin
- **API Health:** https://smk-tkj.com/api/health

## Commands Umum

| Command | Fungsi |
|---------|--------|
| `docker-compose logs -f` | Lihat log realtime |
| `docker-compose restart` | Restart semua |
| `docker-compose restart backend` | Restart backend saja |
| `docker-compose down` | Stop semua |
| `docker-compose up -d --build` | Rebuild & start |
| `docker-compose exec backend sh` | Masuk ke container backend |

## Backup Database

```bash
# Backup
docker exec smk-mongodb mongodump --archive --gzip > backup_$(date +%Y%m%d).gz

# Restore
docker exec -i smk-mongodb mongorestore --archive --gzip < backup_20240101.gz
```

## Monitoring

```bash
# Cek resource usage
docker stats

# Cek disk
df -h

# Cek log error
docker-compose logs --tail=100 backend | grep error
```

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Website tidak bisa diakses | Cek port 80/443 terbuka di firewall |
| SSL error | Jalankan `certbot renew` |
| Bot tidak merespon | Cek webhook: `curl https://api.telegram.org/botTOKEN/getWebhookInfo` |
| MongoDB error | `docker-compose restart mongodb` |
| Backend error | `docker-compose logs backend` |
