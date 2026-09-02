# Sistem Informasi Akademik SMK TKJ
## Ringkasan Alur Kerja untuk Presentasi

---

## 1. Gambaran Umum

Sistem informasi akademik berbasis web yang mengelola data siswa, nilai, dan notifikasi otomatis. Terintegrasi dengan Google Classroom (opsional) dan Telegram untuk notifikasi real-time.

**Tujuan:**
- Memudahkan admin mengelola data siswa dan nilai
- Memberikan notifikasi otomatis ke siswa/orang tua melalui Telegram
- Menampilkan dashboard nilai dan ranking secara real-time

---

## 2. Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                        USER LAYER                          │
├──────────────┬──────────────┬───────────────┬───────────────┤
│  Admin Panel │  Dashboard   │  Telegram Bot │ Google        │
│  (React)     │  Siswa/Ortu  │  (Long Poll)  │ Classroom     │
│              │  (React)     │               │ (OAuth2 API)  │
└──────┬───────┴──────┬───────┴───────┬───────┴───────┬───────┘
       │              │               │               │
       ▼              ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER (Express.js)                 │
│  Port 5000 + Rate Limiting + JWT Auth + Zod Validation     │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│ /auth    │/dashboard│/admin    │/grades   │/tools          │
│ Login    │ Nilai    │ Siswa    │ Input    │ Backup         │
│ OTP      │ Ranking  │ Pesan    │ Bulk     │ Monitoring     │
│ Reset    │ Export   │ Aktivasi │ Delete   │ Health Check   │
│ Google   │ CSV      │ Import   │          │                │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬───────────┘
     │          │          │          │          │
     ▼          ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER (MongoDB)                    │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│ User     │ Student  │ Grade    │ Course-  │ AdminMessage   │
│ (Auth)   │ (Data)   │ (Manual) │ workCache│ (Pesan)        │
│          │          │          │ (GC)     │                │
├──────────┼──────────┼──────────┼──────────┼────────────────┤
│ ChatId   │ Activation│ Backup  │ Logs     │                │
│ (Telegram)│ Code    │ (JSON)  │ (Winston)│                │
└──────────┴──────────┴──────────┴──────────┴────────────────┘
```

---

## 3. Tech Stack

| Layer | Teknologi | Kegunaan |
|-------|-----------|----------|
| **Frontend** | React 18 + Tailwind CSS | UI Dashboard & Admin Panel |
| **Backend** | Node.js + Express.js | REST API Server |
| **Database** | MongoDB + Mongoose | Penyimpanan Data |
| **Auth** | JWT (JSON Web Token) | Autentikasi & Otorisasi |
| **Bot** | Telegram Bot API | Notifikasi via Telegram |
| **Classroom** | Google Classroom API (OAuth2) | Sinkronisasi Nilai |
| **Monitoring** | Winston + Custom Logger | Logging & Error Tracking |
| **CI/CD** | GitHub Actions + deploy.bat | Otomasi Deploy |
| **Backup** | Node.js fs + MongoDB Driver | Backup Database |

---

## 4. Model Data (Database Schema)

### User (Akun Login)
```
{
  nis: String (unique)        // Nomor Induk Siswa
  password: String (bcrypt)   // Password terenkripsi
  role: "admin" | "student" | "parent"
  studentId: ObjectId (ref: Student)
  mustChangePassword: Boolean
  resetPasswordOtp: String
  googleAccessToken: String
  googleRefreshToken: String
}
```

### Student (Data Siswa)
```
{
  nis: String (unique)
  nisn: String
  nama: String
  kelas: "X-TKJ1" | "X-TKJ2" | "XI-TKJ1" | ...
  angkatan: Number
  orangTuaNama: String
  isActive: Boolean
}
```

### Grade (Nilai Manual)
```
{
  studentId: ObjectId (ref: Student)
  subject: "ASJ" | "AIJ" | "TJBL" | "PKDK" | "TJKT"
  title: String               // "Tugas 1", "UTS", "UAS"
  type: "tugas" | "quiz" | "uts" | "uas"
  score: Number (0-100)
  maxScore: Number (default: 100)
  gradedBy: ObjectId (ref: User)
}
```

### CourseworkCache (Data Google Classroom)
```
{
  classroomCourseId: String
  classroomWorkId: String
  title: String
  courseAlias: "ASJ" | "AIJ" | ...
  workType: "ASSIGNMENT" | "QUIZ" | ...
  studentSubmissions: [{
    studentId: ObjectId
    state: "NEW" | "TURNED_IN" | "RETURNED"
    grade: Number
  }]
}
```

### ChatId (Telegram User)
```
{
  studentId: ObjectId (ref: Student)
  chatId: Number              // Telegram Chat ID
  chatType: "student" | "parent"
  isActive: Boolean
  activatedAt: Date
}
```

### ActivationCode
```
{
  code: String (unique)       // "X-TKJ1-001-ST-A1B2C3"
  studentId: ObjectId
  chatType: "student" | "parent"
  isUsed: Boolean
  expiresAt: Date
}
```

### AdminMessage
```
{
  title: String
  content: String
  priority: "low" | "normal" | "high" | "urgent"
  isGlobal: Boolean
  targetKelas: [String]
  targetAngkatan: [Number]
  targetStudents: [ObjectId]
  isReadBy: [{ studentId, readAt }]
}
```

---

## 5. Alur Autentikasi

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌─────────┐
│  Login  │────▶│  Cek    │────▶│ Generate │────▶│ Kirim   │
│  Form   │     │  NIS +  │     │  JWT     │     │ Token   │
│         │     │ Password│     │  Token   │     │ ke Client│
└─────────┘     └─────────┘     └──────────┘     └─────────┘
                     │
                     │ Jika salah
                     ▼
                ┌──────────┐
                │  Error   │
                │ "NIS /   │
                │ Password │
                │ salah"   │
                └──────────┘

Alur Lupa Password:
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Input    │───▶│ Kirim    │───▶│ User     │───▶│ Reset    │
│ NIS      │    │ OTP via  │    │ Input    │    │ Password │
│          │    │ Telegram │    │ OTP      │    │ Baru     │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │
                     │ Telegram tidak aktif
                     ▼
                ┌──────────┐    ┌──────────┐
                │ Verifikasi│───▶│ Kirim   │
                │ NISN +   │    │ OTP     │
                │ Nama Ortu│    │ Lagi    │
                └──────────┘    └──────────┘
```

---

## 6. Alur Input Nilai

```
Admin Panel → Tab "Input Nilai"
       │
       ▼
┌──────────────────┐
│ Pilih Kelas +    │
│ Mata Pelajaran   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│ Load data siswa  │◀───▶│ Tampilkan tabel  │
│ dari MongoDB     │     │ spreadsheet-like  │
└──────────────────┘     └────────┬─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ Tambah   │ │ Input    │ │ Simpan   │
              │ Komponen │ │ Nilai    │ │ Semua    │
              │ (Tugas,  │ │ per      │ │ Nilai    │
              │ UTS,UAS) │ │ Siswa    │ │          │
              └──────────┘ └──────────┘ └──────────┘
                                      │
                                      ▼
                              ┌──────────────────┐
                              │ POST /api/grades │
                              │ /bulk            │
                              │ (upsert per      │
                              │  siswa + judul)  │
                              └──────────────────┘
```

**Spreadsheet UI:**
```
┌──────────────┬──────────┬──────────┬──────────┬──────────┐
│ Nama         │ Tugas 1  │ Tugas 2  │   UTS    │ Rata-rata│
├──────────────┼──────────┼──────────┼──────────┼──────────┤
│ Ahmad Fauzi  │  [85]    │  [90]    │  [78]    │   84.3   │
│ Budi Santoso │  [72]    │  [80]    │  [65]    │   72.3   │
│ Rina Wati    │  [95]    │  [88]    │  [92]    │   91.7   │
└──────────────┴──────────┴──────────┴──────────┴──────────┘
                                        [Simpan Semua Nilai]
```

---

## 7. Alur Dashboard Siswa

```
┌──────────┐     ┌──────────┐     ┌──────────────────────────┐
│  Login   │────▶│  GET     │────▶│  Gabungkan data dari:    │
│  Siswa   │     │/dashboard│     │  1. Google Classroom     │
└──────────┘     └──────────┘     │  2. Grade (manual input) │
                                  │  3. AdminMessage (pesan)  │
                                  └────────────┬─────────────┘
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         │                     │                     │
                         ▼                     ▼                     ▼
                   ┌──────────┐         ┌──────────┐         ┌──────────┐
                   │ Nilai per│         │ Ranking  │         │ Pesan    │
                   │ Mata     │         │ Kelas &  │         │ dari     │
                   │ Pelajaran│         │ Angkatan │         │ Admin    │
                   └──────────┘         └──────────┘         └──────────┘
                         │
                         ▼
                   ┌──────────┐
                   │ Expand   │
                   │ detail   │
                   │ per      │
                   │ tugas/   │
                   │ ujian    │
                   └──────────┘
```

---

## 8. Alur Notifikasi Telegram

```
┌────────────────────────────────────────────────────────────┐
│                     NOTIFICATION FLOW                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  [Cron Job Jam 17:00] atau [Manual via n8n]                │
│         │                                                  │
│         ▼                                                  │
│  ┌──────────────┐     ┌──────────────┐                    │
│  │ Cari semua   │────▶│ Cari tugas   │                    │
│  │ ChatId aktif │     │ yang kosong  │                    │
│  └──────────────┘     └──────┬───────┘                    │
│                              │                             │
│                              ▼                             │
│                    ┌──────────────────┐                    │
│                    │ Kirim pesan ke   │                    │
│                    │ Telegram per     │                    │
│                    │ siswa/orang tua  │                    │
│                    └────────┬─────────┘                    │
│                             │                              │
│                             ▼                              │
│                    ┌──────────────────┐                    │
│                    │ Inline Keyboard  │                    │
│                    │ [Buka Dashboard] │                    │
│                    └──────────────────┘                    │
│                                                            │
└────────────────────────────────────────────────────────────┘

Contoh Pesan:
╔══════════════════════════════════════╗
║ 📋 *Tugas Belum Selesai*            ║
║                                      ║
║ Halo, Ahmad Fauzi!                   ║
║ Kamu memiliki 2 tugas yang belum     ║
║ dikumpulkan:                         ║
║                                      ║
║ • ASJ: Tugas Konfigurasi Router      ║
║ • TJKT: Praktikum Subnetting         ║
║                                      ║
║ [📊 Buka Dashboard]                  ║
╚══════════════════════════════════════╝
```

---

## 9. Alur Aktivasi Telegram

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Admin Panel  │───▶│ Generate     │───▶│ Bagikan kode │
│ Tab "Kode    │    │ Kode Aktivasi│    │ ke Siswa/    │
│ Aktivasi"    │    │ (unique)     │    │ Orang Tua    │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
                                               ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Bot kirim    │◀───│ Bot verifikasi│◀───│ User kirim   │
│ pesan sukses │    │ kode di DB   │    │ "AKTIF       │
│ + dashboard  │    │              │    │  X-TKJ1-..." │
│ link         │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 10. Alur Backup Database

```
┌────────────────────────────────────────────────────────────┐
│                    BACKUP SYSTEM                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  [Otomatis Jam 02:00]      [Manual via Admin Panel]        │
│         │                          │                       │
│         ▼                          ▼                       │
│  ┌─────────────────────────────────────────┐              │
│  │ 1. Baca semua collections dari MongoDB  │              │
│  │ 2. Export ke JSON per collection        │              │
│  │ 3. Simpan ke backend/backups/<timestamp>│              │
│  │ 4. Buat manifest.json (metadata)       │              │
│  │ 5. Cleanup backup lama (>30)           │              │
│  └─────────────────────────────────────────┘              │
│                                                            │
│  Struktur Backup:                                          │
│  backend/backups/                                          │
│  ├── auto_2026-09-02T02-00-00/                            │
│  │   ├── manifest.json                                     │
│  │   ├── users.json                                        │
│  │   ├── students.json                                     │
│  │   ├── grades.json                                       │
│  │   ├── courseworkcaches.json                             │
│  │   ├── chatids.json                                      │
│  │   └── adminmessages.json                                │
│  └── manual_2026-09-02T15-26-06/                          │
│      └── ...                                               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 11. Alur Monitoring

```
┌────────────────────────────────────────────────────────────┐
│                   MONITORING SYSTEM                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Request masuk                                             │
│       │                                                    │
│       ▼                                                    │
│  ┌──────────────────┐                                     │
│  │ Track:           │                                     │
│  │ - Method + URL   │                                     │
│  │ - Status code    │                                     │
│  │ - Duration (ms)  │                                     │
│  │ - Timestamp      │                                     │
│  └────────┬─────────┘                                     │
│           │                                                │
│           ▼                                                │
│  ┌──────────────────┐     ┌──────────────────┐           │
│  │ Simpan di memory │────▶│ Log ke file      │           │
│  │ (request stats)  │     │ (Winston)        │           │
│  └──────────────────┘     └──────────────────┘           │
│                                                            │
│  Admin Panel → Tab "Monitoring" → Refresh                  │
│       │                                                    │
│       ▼                                                    │
│  ┌──────────────────────────────────────────┐             │
│  │ Tampilkan:                               │             │
│  │ - Uptime server                          │             │
│  │ - RAM terpakai vs total                  │             │
│  │ - Status database                        │             │
│  │ - Total request & error rate             │             │
│  │ - Top 10 routes (paling sering diakses)  │             │
│  │ - 20 error terakhir                      │             │
│  │ - Daftar log files                       │             │
│  └──────────────────────────────────────────┘             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 12. Alur CI/CD

```
┌────────────────────────────────────────────────────────────┐
│                    CI/CD PIPELINE                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Developer Push ke GitHub                                  │
│       │                                                    │
│       ▼                                                    │
│  ┌──────────────────┐     ┌──────────────────┐           │
│  │ GitHub Actions   │────▶│ Self-hosted      │           │
│  │ (.github/workflows│    │ Runner (PC lokal)│           │
│  │  /deploy.yml)    │     │                  │           │
│  └──────────────────┘     └────────┬─────────┘           │
│                                    │                      │
│                    ┌───────────────┼───────────────┐      │
│                    │               │               │      │
│                    ▼               ▼               ▼      │
│              ┌──────────┐   ┌──────────┐   ┌──────────┐  │
│              │ git pull │   │ npm      │   │ npm run  │  │
│              │          │   │ install  │   │ build    │  │
│              └──────────┘   └──────────┘   └──────────┘  │
│                                    │               │      │
│                                    ▼               ▼      │
│                              ┌──────────┐   ┌──────────┐  │
│                              │ Stop     │   │ Start    │  │
│                              │ server   │   │ server   │  │
│                              │ lama     │   │ baru     │  │
│                              └──────────┘   └──────────┘  │
│                                              │            │
│                                              ▼            │
│                                     ┌──────────────┐     │
│                                     │ Health Check │     │
│                                     │ GET /health  │     │
│                                     └──────────────┘     │
│                                                            │
│  Alternatif Manual: deploy.bat                             │
│  (klik ganda → otomatis pull + build + deploy)            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 13. Daftar Endpoint API

### Auth (`/api/auth`)
| Method | Endpoint | Fungsi | Auth |
|--------|----------|--------|------|
| POST | `/login` | Login | ❌ |
| POST | `/change-password` | Ganti password | ✅ |
| POST | `/forgot-password` | Kirim OTP | ❌ |
| POST | `/verify-otp` | Verifikasi OTP + reset | ❌ |
| POST | `/fallback-verify` | Verifikasi NISN + nama ortu | ❌ |
| GET | `/me` | Data user saat ini | ✅ |
| GET | `/google` | Redirect ke Google OAuth | ✅ |
| GET | `/google/callback` | Handle callback Google | ❌ |
| POST | `/google/sync` | Sync Google Classroom | ✅ |
| DELETE | `/google/disconnect` | Putus koneksi Google | ✅ |

### Dashboard (`/api/dashboard`)
| Method | Endpoint | Fungsi | Auth |
|--------|----------|--------|------|
| GET | `/` | Data dashboard siswa | ✅ |
| PUT | `/messages/:id/read` | Tandai pesan dibaca | ✅ |
| GET | `/export-csv` | Export nilai ke CSV | ✅ |

### Admin (`/api/admin`)
| Method | Endpoint | Fungsi | Auth |
|--------|----------|--------|------|
| GET | `/students` | List siswa (paginated) | ✅ Admin |
| PUT | `/students/:id` | Edit siswa | ✅ Admin |
| DELETE | `/students/:id` | Hapus siswa | ✅ Admin |
| POST | `/students/bulk-create` | Import CSV | ✅ Admin |
| GET | `/messages` | List pesan | ✅ Admin |
| POST | `/messages` | Kirim pesan | ✅ Admin |
| DELETE | `/messages/:id` | Hapus pesan | ✅ Admin |
| GET | `/activation-codes` | List kode aktivasi | ✅ Admin |
| POST | `/activation-codes` | Generate 1 kode | ✅ Admin |
| POST | `/activation-codes/bulk` | Generate massal | ✅ Admin |
| GET | `/dashboard-stats` | Statistik admin | ✅ Admin |

### Grades (`/api/grades`)
| Method | Endpoint | Fungsi | Auth |
|--------|----------|--------|------|
| GET | `/?kelas=&subject=` | Ambil data nilai | ✅ Admin |
| POST | `/` | Simpan 1 nilai | ✅ Admin |
| POST | `/bulk` | Simpan massal | ✅ Admin |
| DELETE | `/:id` | Hapus 1 nilai | ✅ Admin |
| DELETE | `/?subject=&title=` | Hapus semua nilai judul | ✅ Admin |

### Tools (`/api/tools`)
| Method | Endpoint | Fungsi | Auth |
|--------|----------|--------|------|
| GET | `/backup/list` | List semua backup | ✅ Admin |
| POST | `/backup/create` | Buat backup baru | ✅ Admin |
| POST | `/backup/restore/:name` | Restore backup | ✅ Admin |
| DELETE | `/backup/:name` | Hapus backup | ✅ Admin |
| GET | `/monitoring/status` | Status sistem | ✅ Admin |
| GET | `/monitoring/logs/:file` | Baca file log | ✅ Admin |

### Webhook (`/api/webhook`)
| Method | Endpoint | Fungsi | Auth |
|--------|----------|--------|------|
| POST | `/telegram` | Telegram webhook | ❌ |
| GET | `/sync-and-notify` | Sync + notif (n8n) | Secret |
| POST | `/sync` | Manual sync | Secret |
| POST | `/notify` | Manual notif | Secret |

---

## 14. Fitur yang Tersedia

| # | Fitur | Status | Keterangan |
|---|-------|--------|------------|
| 1 | Login Admin/Siswa/Orang Tua | ✅ | JWT + bcrypt |
| 2 | Dashboard Nilai | ✅ | Per mata pelajaran + detail |
| 3 | Ranking Kelas & Angkatan | ✅ | Real-time |
| 4 | Input Nilai Manual | ✅ | Spreadsheet-like UI |
| 5 | Pesan dari Admin | ✅ | Prioritas + sudah/belum dibaca |
| 6 | Notifikasi Telegram | ✅ | Harian otomatis + inline button |
| 7 | Aktivasi via Telegram | ✅ | Kode unik per siswa |
| 8 | Bot Telegram | ✅ | /start, /help, /status, AKTIF |
| 9 | Kelola Siswa (CRUD) | ✅ | Import CSV, edit, hapus |
| 10 | Kode Aktivasi | ✅ | Generate per siswa / massal |
| 11 | Ganti Password | ✅ | Dari dashboard |
| 12 | Lupa Password | ✅ | OTP Telegram + fallback NISN |
| 13 | Export CSV | ✅ | Download nilai |
| 14 | Google Classroom Sync | ⏸️ | Butuh billing GCP |
| 15 | Backup Database | ✅ | Auto harian + manual |
| 16 | Monitoring | ✅ | Status server + error log |
| 17 | CI/CD | ✅ | GitHub Actions + deploy.bat |
| 18 | Rate Limiting | ✅ | Login, forgot-password |
| 19 | Zod Validation | ✅ | Validasi input |
| 20 | Docker Support | ✅ | docker-compose.yml |

---

## 15. Deployment

### Local Development
```
git clone https://github.com/rafiramdhani1/Classroom-2.git
cd smk-akademik
.\deploy.bat
```

### Production (Server)
```
1. Clone repo di server
2. Jalankan: .\deploy.bat
3. Akses: http://<server-ip>:5000
4. Login: admin / admin123
```

### Environment Variables (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smk_akademik
JWT_SECRET=<secret>
GOOGLE_CLIENT_ID=<dari Google Cloud Console>
GOOGLE_CLIENT_SECRET=<dari Google Cloud Console>
TELEGRAM_BOT_TOKEN=<dari @BotFather>
N8N_SECRET=<secret untuk n8n>
FRONTEND_URL=http://localhost:5000
```

---

## 16. Statistik Project

| Metrik | Nilai |
|--------|-------|
| Total File | ~30 |
| Backend Routes | 6 (auth, dashboard, admin, grades, tools, webhook) |
| Database Models | 7 (User, Student, Grade, CourseworkCache, ChatId, ActivationCode, AdminMessage) |
| Frontend Pages | 3 (Login, Dashboard, AdminPanel) |
| API Endpoints | ~35 |
| Lines of Code | ~5000+ |
| Dependencies (backend) | express, mongoose, jsonwebtoken, bcrypt, node-cron, zod, winston, express-rate-limit |
| Dependencies (frontend) | react, react-router-dom, tailwindcss, axios |

---

*Dokumen ini untuk presentasi Sistem Informasi Akademik SMK TKJ*
*Terakhir diperbarui: September 2026*
