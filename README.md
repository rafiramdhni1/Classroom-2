# Sistem Informasi Akademik SMK TKJ

Sistem informasi akademik untuk SMK jurusan TKJ (Teknik Jaringan Komputer dan Telekomunikasi) dengan integrasi Google Classroom dan notifikasi Telegram.

## Fitur

- Login (NIS + Password) untuk siswa dan orang tua
- Dashboard nilai per mata pelajaran (ASJ, AIJ, TJBL, PKDK, TJKT)
- Ranking kelas dan angkatan
- Pesan dari admin
- Bot Telegram untuk notifikasi tugas kurang
- Admin panel untuk kelola siswa, pesan, dan kode aktivasi
- Sinkronisasi data dari Google Classroom API
- Notifikasi harian otomatis via Telegram

## Tech Stack

- **Backend**: Node.js + Express + JWT Auth
- **Database**: MongoDB
- **Frontend**: React + Tailwind CSS (Vite)
- **Bot**: Telegram Bot API (long polling)
- **Orkestrasi**: n8n (optional)

## Setup Lokal

### Prasyarat

- Node.js 18+
- MongoDB 7+ (local atau Atlas)
- Telegram Bot Token (dari @BotFather)

### 1. Clone & Install

```bash
cd smk-akademik

# Backend
cd backend
cp .env.example .env   # lalu isi .env
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Konfigurasi .env

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smk_akademik
JWT_SECRET=rahasia-kalian
TELEGRAM_BOT_TOKEN=token-dari-botfather
TELEGRAM_BOT_USERNAME=username-bot
ADMIN_PHONE=628xxxxxxxxxx
FRONTEND_URL=http://localhost:3000
N8N_SECRET=secret-n8n-kalian
```

### 3. Seed Data

```bash
cd backend
node seeds/seed.js
```

Membuat 216 siswa (6 kelas x 36 siswa) + 432 akun user.

### 4. Jalankan

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Bot Polling):
```bash
cd backend
node bot-poll.js
```

Terminal 3 (Frontend):
```bash
cd frontend
npm run dev
```

Buka http://localhost:3000

### 5. Login

| Role | NIS | Password |
|------|-----|----------|
| Siswa | 240001 | 240001 |
| Orang Tua | 240001-OT | 240001 |
| Admin | admin | admin123 |

## Akun Default

- **Admin**: NIS=`admin`, Password=`admin123`
- **Siswa pertama**: NIS=`240001`, Password=`240001`
- **Orang tua**: NIS=`240001-OT`, Password=`240001`

## Deploy ke Production

### VPS (Ubuntu/Debian)

```bash
# Install Node.js & MongoDB
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo apt install -y mongodb

# Clone project
git clone <repo-url>
cd smk-akademik

# Setup backend
cd backend
cp .env.example .env
# Edit .env dengan production values
npm install --production
npm run seed

# Setup PM2
sudo npm install -g pm2
pm2 start server.js --name smk-backend
pm2 start bot-poll.js --name smk-bot
pm2 save
pm2 startup

# Build frontend
cd ../frontend
npm install
npm run build
# Serve dengan nginx atau copy dist ke backend/public
```

### Nginx Config

```nginx
server {
    listen 80;
    server_name akademik.smk-tkj.sch.id;

    location / {
        root /var/www/smk-akademik/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/change-password` - Ganti password
- `POST /api/auth/forgot-password` - Lupa password (OTP ke Telegram)
- `POST /api/auth/verify-otp` - Verifikasi OTP
- `GET /api/auth/me` - Data user saat ini

### Dashboard
- `GET /api/dashboard` - Data dashboard (nilai, ranking, pesan)

### Admin
- `GET /api/admin/students` - List siswa
- `POST /api/admin/students/bulk-create` - Import siswa
- `POST /api/admin/messages` - Kirim pesan
- `POST /api/admin/activation-codes` - Buat kode aktivasi
- `POST /api/admin/activation-codes/bulk` - Generate kode massal

### Webhook
- `POST /api/webhook/telegram` - Telegram webhook
- `GET /api/webhook/sync-and-notify` - Trigger sync + notifikasi (n8n)

## Workflow n8n

Import file JSON dari folder `/n8n`:
1. `workflow-aktivasi.json` - Webhook aktivasi bot
2. `workflow-notifikasi-harian.json` - Jadwal notifikasi harian

## Struktur Folder

```
smk-akademik/
├── backend/
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express routes
│   ├── services/        # Telegram, Classroom, Notifikasi
│   ├── middleware/       # Auth middleware
│   ├── seeds/           # Seed data
│   ├── server.js        # Entry point
│   └── bot-poll.js      # Telegram bot polling
├── frontend/
│   ├── src/
│   │   ├── pages/       # Login, Dashboard, Admin
│   │   ├── contexts/    # Auth context
│   │   └── utils/       # API client
│   └── vite.config.js
└── n8n/                 # Workflow n8n
```

## Mata Pelajaran

| Kode | Nama |
|------|------|
| ASJ | Administrasi Sistem Jaringan |
| AIJ | Administrasi Infrastruktur Jaringan |
| TJBL | Tata Jaringan Berbasis Luas |
| PKDK | Pemodelan dan Komunikasi Data |
| TJKT | Teknologi Jaringan Komputer dan Telekomunikasi |

## License

MIT
