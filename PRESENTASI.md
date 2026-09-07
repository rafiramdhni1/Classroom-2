# Sistem Informasi Akademik SMK TKJ
## Dokumentasi Presentasi Lengkap

---

## 1. Gambaran Umum

Sistem informasi akademik berbasis web untuk SMK TKJ (Teknik Jaringan Komputer). Mengelola data siswa, nilai, dan notifikasi otomatis. Terintegrasi dengan Google Classroom dan Telegram.

**Fitur Utama:**
- Login dengan NIS + Password
- Dashboard nilai dan ranking untuk siswa/orang tua
- Admin Panel lengkap (8 tab fitur)
- Input nilai manual (spreadsheet-like UI)
- Sinkronisasi Google Classroom (otomatis)
- Telegram bot + notifikasi otomatis
- Backup database otomatis
- Monitoring sistem real-time
- CI/CD dengan GitHub Actions

**Scope Sekolah:**
- 3 kelas: X, XI, XII
- 2 rombel per kelas: A, B
- 36 siswa per rombel = 216 siswa total
- 5 mata pelajaran: ASJ, AIJ, TJBL, PKDK, TJKT

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
│                   CLOUDFLARE TUNNEL                         │
│          (akses dari mana saja, gratis, tanpa domain)       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                      API LAYER (Express.js)                 │
│  Port 5000 + Rate Limiting + JWT Auth                       │
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
│ ChatId   │ Activation│ Logs    │ Requests │                │
│ (Telegram)│ Code    │ (Error) │ (Track)  │                │
└──────────┴──────────┴──────────┴──────────┴────────────────┘
```

---

## 3. Tech Stack

| Layer | Teknologi | Kegunaan |
|-------|-----------|----------|
| **Frontend** | React 18 + Tailwind CSS + Vite | UI Dashboard & Admin Panel |
| **Backend** | Node.js + Express.js | REST API Server |
| **Database** | MongoDB + Mongoose | Penyimpanan Data |
| **Auth** | JWT (JSON Web Token) + bcrypt | Autentikasi & Enkripsi Password |
| **Bot** | Telegram Bot API (long-polling) | Notifikasi via Telegram |
| **Classroom** | Google Classroom API (OAuth2) | Sinkronisasi Nilai |
| **Monitoring** | Custom Logger | Logging & Error Tracking |
| **CI/CD** | GitHub Actions + deploy.bat | Otomasi Deploy |
| **Backup** | Node.js native (JSON export) | Backup Database |
| **Tunnel** | Cloudflare Tunnel | Akses publik gratis |

---

## 4. Struktur File

```
smk-akademik/
├── backend/
│   ├── config/
│   │   └── db.js              # Koneksi MongoDB
│   ├── middleware/
│   │   ├── auth.js            # JWT + admin middleware
│   │   └── errorHandler.js    # Global error handler
│   ├── models/
│   │   ├── User.js            # Model user (admin/siswa/orang tua)
│   │   ├── Student.js         # Model data siswa
│   │   ├── Grade.js           # Model nilai manual
│   │   ├── CourseworkCache.js # Cache data Google Classroom
│   │   ├── ChatId.js          # Mapping Telegram chat ID
│   │   ├── ActivationCode.js  # Kode aktivasi
│   │   └── AdminMessage.js    # Pesan dari admin
│   ├── routes/
│   │   ├── auth.js            # Login, OTP, Google OAuth
│   │   ├── dashboard.js       # Dashboard siswa
│   │   ├── admin.js           # CRUD admin
│   │   ├── grades.js          # Input nilai manual
│   │   ├── classroom.js       # Google Classroom sync
│   │   ├── tools.js           # Backup & monitoring
│   │   └── webhook.js         # n8n webhook
│   ├── services/
│   │   ├── classroom.js       # Google OAuth + Classroom API
│   │   ├── telegramBot.js     # Telegram bot commands
│   │   ├── notification.js    # Auto notification
│   │   ├── backup.js          # Backup system
│   │   └── monitoring.js      # Monitoring system
│   ├── backups/               # Folder penyimpanan backup
│   ├── server.js              # Entry point utama
│   ├── bot-poll.js            # Telegram bot runner
│   ├── seed.js                # Database seeder
│   ├── .env                   # Environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx      # Halaman login
│   │   │   ├── Dashboard.jsx  # Dashboard siswa/orang tua
│   │   │   └── AdminPanel.jsx # Panel admin (8 tab)
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx # State autentikasi
│   │   ├── utils/
│   │   │   └── api.js         # Axios instance
│   │   ├── components/
│   │   │   ├── Navbar.jsx     # Navigasi
│   │   │   ├── Modal.jsx      # Modal popup
│   │   │   └── ...
│   │   └── App.jsx            # Router
│   ├── vite.config.js         # Vite config
│   ├── tailwind.config.js     # Tailwind config
│   └── package.json
├── .github/
│   └── workflows/
│       └── deploy.yml         # GitHub Actions CI/CD
├── deploy.bat                 # 1-click deploy script
├── DOKUMENTASI.md             # Dokumentasi lengkap
└── .gitignore
```

---

## 5. Model Data (Database Schema)

### User (Akun Login)
```javascript
{
  nis: String (unique),         // Nomor Induk Siswa
  password: String (bcrypt),    // Password terenkripsi
  role: "admin" | "student" | "parent",
  namaLengkap: String,          // Nama lengkap
  kelas: String,                // "X", "XI", "XII"
  rombel: String,               // "A" atau "B"
  
  // Google OAuth (hanya admin)
  googleAccessToken: String,    // Token akses Google
  googleRefreshToken: String,   // Token refresh Google
  googleEmail: String,          // Email Google
  googleConnected: Boolean,     // Sudah connect Google
  
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Student (Data Siswa)
```javascript
{
  nis: String (unique),
  nama: String,
  kelas: String,                // "X", "XI", "XII"
  rombel: String,               // "A" atau "B"
  classroomId: String,          // ID Google Classroom
  isActive: Boolean
}
```

### Grade (Nilai Manual)
```javascript
{
  studentId: ObjectId (ref: Student),
  nis: String,
  nama: String,
  kelas: String,
  rombel: String,
  mataPelajaran: String,        // "ASJ", "AIJ", "TJBL", "PKDK", "TJKT"
  tipe: String,                 // "UTS", "UAS", "TUGAS", "PRAKTIK"
  nilai: Number (0-100),
  semester: String,             // "Ganjil", "Genap"
  tahunAjaran: String,          // "2024/2025"
  inputBy: ObjectId (ref: User)
}
```

### CourseworkCache (Data Google Classroom)
```javascript
{
  classroomCourseId: String,    // ID kelas dari Google
  classroomWorkId: String,      // ID tugas dari Google
  title: String,                // Judul tugas
  description: String,
  courseName: String,           // Nama kelas di Google
  courseAlias: String,          // "ASJ", "AIJ", dll (auto-detect)
  dueDate: Date,
  maxPoints: Number,
  workType: String,             // "ASSIGNMENT", "QUIZ", "QUESTION"
  studentSubmissions: [{
    classroomStudentId: String,
    state: String,              // "TURNED_IN", "RETURNED", "MISSING"
    late: Boolean,
    grade: Number,
    submittedAt: Date,
    isGraded: Boolean
  }],
  lastSyncedAt: Date
}
```

### ChatId (Telegram User)
```javascript
{
  nis: String,
  chatId: Number,               // Telegram Chat ID
  nama: String,
  kelas: String,
  rombel: String,
  role: String                  // "student" | "parent"
}
```

### ActivationCode
```javascript
{
  code: String (unique),        // crypto.randomBytes (hex)
  nis: String,
  isUsed: Boolean,
  usedBy: Number,               // Telegram Chat ID
  createdAt: Date,
  expiresAt: Date               // 24 jam
}
```

### AdminMessage
```javascript
{
  title: String,
  content: String,
  targetKelas: String,          // "ALL" atau "X", "XI", "XII"
  targetRombel: String,         // "ALL" atau "A", "B"
  priority: String,             // "low", "medium", "high"
  createdAt: Date
}
```

---

## 6. Alur Autentikasi

### Login
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
```

### Lupa Password
```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Input    │───▶│ Kirim    │───▶│ User     │───▶│ Reset    │
│ NIS      │    │ OTP via  │    │ Input    │    │ Password │
│          │    │ Telegram │    │ OTP      │    │ Baru     │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### Password Hashing (bcrypt)
```
1. User input: "rahasia123"
2. Backend hash: bcrypt.hash("rahasia123", 10)
   → "$2b$10$N9qo8uLOickgx2ZMRZoMye..."
3. Simpan hash ke MongoDB (bukan password asli!)
4. Saat login: bcrypt.compare("rahasia123", hash)
   → true (cocok) atau false (tidak cocok)
```

---

## 7. Alur Input Nilai Manual

```
Admin Panel → Tab "Input Nilai"
       │
       ▼
┌──────────────────┐
│ Pilih Filter:    │
│ - Kelas (X/XI/XII)│
│ - Rombel (A/B)   │
│ - Mata Pelajaran │
│ - Tipe (UTS/UAS/Tugas/Praktik)│
│ - Semester       │
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

## 8. Alur Dashboard Siswa

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
```

---

## 9. Alur Google Classroom

### OAuth 2.0 Connection
```
1. Admin klik "Hubungkan dengan Google"
2. Frontend minta URL → GET /api/auth/google
3. Backend generate URL:
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id=...
     &redirect_uri=http://localhost:5000/api/auth/google/callback
     &scope=classroom.courses.readonly+classroom.rosters.readonly
     &response_type=code
     &access_type=offline
     &prompt=consent
4. User login Google + grant permission
5. Google redirect ke callback ?code=xxx
6. Backend tukar code dengan tokens
7. Simpan tokens ke user di MongoDB
8. Redirect ke frontend ?google_auth=success
```

### Sync Flow
```
1. Admin klik "Sinkronisasi Sekarang"
2. POST /api/classroom/sync
3. Backend fetch kelas dari Google Classroom API
4. Deteksi alias otomatis dari nama kelas:
   - "ASJ" → ASJ ✅
   - "X ASJ" → ASJ ✅
   - "TKJ" → ❌ (tidak terdeteksi)
5. Untuk setiap kelas:
   a. Fetch tugas (courseWork)
   b. Fetch submissions siswa (try/catch)
   c. Simpan ke MongoDB (CourseworkCache)
6. Return jumlah kelas tersync
```

**Catatan:**
- Akun Google (`tamasukajajan@gmail.com`) harus ditambahkan sebagai **pengajar** di kelas Google Classroom milik guru lain
- Scope `student-submissions` bersifat restricted (tidak perlu untuk sync dasar)

---

## 10. Alur Notifikasi Telegram

```
┌────────────────────────────────────────────────────────────┐
│  [Cron Job Jam 17:00 Weekdays]                             │
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
└────────────────────────────────────────────────────────────┘
```

**Contoh Pesan:**
```
📋 Tugas Belum Selesai

Halo, Ahmad Fauzi!
Kamu memiliki 2 tugas yang belum dikumpulkan:

• ASJ: Tugas Konfigurasi Router
• TJKT: Praktikum Subnetting

[Buka Dashboard]
```

---

## 11. Alur Aktivasi Telegram

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Admin Panel  │───▶│ Generate     │───▶│ Bagikan kode │
│ Tab "Kode    │    │ Kode Aktivasi│    │ ke Siswa/    │
│ Aktivasi"    │    │ (crypto.     │    │ Orang Tua    │
│              │    │ randomBytes) │    │              │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
                                               ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Bot kirim    │◀───│ Bot verifikasi│◀───│ User kirim   │
│ pesan sukses │    │ kode di DB   │    │ /aktivasi    │
│ + dashboard  │    │              │    │ <kode>       │
│ link         │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 12. Alur Backup Database

```
┌────────────────────────────────────────────────────────────┐
│  [Otomatis Jam 02:00]      [Manual via Admin Panel]        │
│         │                          │                       │
│         ▼                          ▼                       │
│  ┌─────────────────────────────────────────┐              │
│  │ 1. Baca semua collections dari MongoDB  │              │
│  │ 2. Export ke JSON per collection        │              │
│  │ 3. Simpan ke backend/backups/           │              │
│  │ 4. Hapus backup lama (>30 hari)         │              │
│  └─────────────────────────────────────────┘              │
│                                                            │
│  Format: backup-YYYY-MM-DD-HHmmss.json                    │
│  Isi: users, students, grades, courseworkcaches,           │
│        chatids, activationcodes, adminmessages             │
└────────────────────────────────────────────────────────────┘
```

---

## 13. Alur Monitoring

```
Request masuk
     │
     ▼
┌──────────────────┐
│ Track:           │
│ - Method + URL   │
│ - Status code    │
│ - Duration (ms)  │
│ - Timestamp      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│ Simpan di memory │────▶│ Log error ke DB  │
│ (request stats)  │     │                  │
└──────────────────┘     └──────────────────┘

Admin Panel → Tab "Monitoring"
     │
     ▼
┌──────────────────────────────────────────┐
│ Tampilkan:                               │
│ - Uptime server                          │
│ - RAM terpakai vs total                  │
│ - CPU usage                              │
│ - Status MongoDB (connected/disconnected)│
│ - Total request hari ini                 │
│ - Error log terbaru                      │
└──────────────────────────────────────────┘
```

---

## 14. Alur CI/CD

```
┌────────────────────────────────────────────────────────────┐
│  Developer Push ke GitHub                                  │
│       │                                                    │
│       ▼                                                    │
│  ┌──────────────────┐     ┌──────────────────┐           │
│  │ GitHub Actions   │────▶│ Self-hosted      │           │
│  │ (deploy.yml)     │     │ Runner (PC lokal)│           │
│  └──────────────────┘     └────────┬─────────┘           │
│                                    │                      │
│                    ┌───────────────┼───────────────┐      │
│                    ▼               ▼               ▼      │
│              ┌──────────┐   ┌──────────┐   ┌──────────┐  │
│              │ git pull │   │ npm      │   │ npm run  │  │
│              │          │   │ install  │   │ build    │  │
│              └──────────┘   └──────────┘   └──────────┘  │
│                                    │               │      │
│                                    ▼               ▼      │
│                              ┌──────────┐   ┌──────────┐  │
│                              │ pm2      │   │ pm2      │  │
│                              │ restart  │   │ start    │  │
│                              └──────────┘   └──────────┘  │
│                                                            │
│  Alternatif Manual: deploy.bat                             │
│  (klik ganda → otomatis pull + build + deploy)            │
└────────────────────────────────────────────────────────────┘
```

---

## 15. Daftar Endpoint API

### Auth (`/api/auth`)
| Method | Endpoint | Fungsi | Auth |
|--------|----------|--------|------|
| POST | `/login` | Login NIS + Password | ❌ |
| POST | `/forgot-password` | Kirim OTP ke Telegram | ❌ |
| POST | `/verify-otp` | Verifikasi OTP | ❌ |
| POST | `/reset-password` | Reset password baru | ❌ |
| GET | `/google` | Generate Google OAuth URL | ✅ |
| GET | `/google/callback` | Handle callback Google | ❌ |
| GET | `/me` | Data user dari token | ✅ |

### Dashboard (`/api/dashboard`)
| Method | Endpoint | Fungsi | Auth |
|--------|----------|--------|------|
| GET | `/` | Semua data dashboard | ✅ |
| GET | `/grades` | Nilai (GC + manual) | ✅ |
| GET | `/ranking` | Peringkat siswa | ✅ |
| POST | `/change-password` | Ganti password | ✅ |

### Admin (`/api/admin`)
| Method | Endpoint | Fungsi | Auth |
|--------|----------|--------|------|
| GET | `/students` | List semua siswa | ✅ Admin |
| POST | `/students` | Tambah siswa | ✅ Admin |
| PUT | `/students/:id` | Edit siswa | ✅ Admin |
| DELETE | `/students/:id` | Hapus siswa | ✅ Admin |
| GET | `/stats` | Statistik | ✅ Admin |
| GET | `/messages` | List pesan | ✅ Admin |
| POST | `/messages` | Kirim pesan | ✅ Admin |
| DELETE | `/messages/:id` | Hapus pesan | ✅ Admin |
| GET | `/codes` | List kode aktivasi | ✅ Admin |
| POST | `/codes` | Generate kode | ✅ Admin |
| DELETE | `/codes/:id` | Hapus kode | ✅ Admin |
| POST | `/import` | Import Excel | ✅ Admin |

### Grades (`/api/grades`)
| Method | Endpoint | Fungsi | Auth |
|--------|----------|--------|------|
| GET | `/` | Ambil nilai (filter) | ✅ |
| POST | `/` | Simpan 1 nilai | ✅ Admin |
| POST | `/bulk` | Simpan banyak nilai | ✅ Admin |
| DELETE | `/:id` | Hapus nilai | ✅ Admin |

### Classroom (`/api/classroom`)
| Method | Endpoint | Fungsi | Auth |
|--------|----------|--------|------|
| POST | `/sync` | Sinkronisasi Google Classroom | ✅ Admin |
| GET | `/status` | Status koneksi Google | ✅ Admin |

### Tools (`/api/tools`)
| Method | Endpoint | Fungsi | Auth |
|--------|----------|--------|------|
| POST | `/backup` | Manual backup | ✅ Admin |
| GET | `/backup/list` | List semua backup | ✅ Admin |
| GET | `/backup/download/:filename` | Download backup | ✅ Admin |
| DELETE | `/backup/:filename` | Hapus backup | ✅ Admin |
| GET | `/monitoring` | Status sistem | ✅ Admin |
| GET | `/monitoring/errors` | Log error | ✅ Admin |

### Webhook (`/api/webhook`)
| Method | Endpoint | Fungsi | Auth |
|--------|----------|--------|------|
| POST | `/n8n` | Webhook dari n8n | Secret |

---

## 16. Fitur yang Tersedia

| # | Fitur | Status | Keterangan |
|---|-------|--------|------------|
| 1 | Login Admin/Siswa/Orang Tua | ✅ | NIS + Password, JWT |
| 2 | Dashboard Nilai | ✅ | Per mata pelajaran + detail |
| 3 | Ranking Kelas & Angkatan | ✅ | Real-time |
| 4 | Input Nilai Manual | ✅ | Spreadsheet-like UI, bulk save |
| 5 | Google Classroom Sync | ✅ | OAuth2, auto-detect mata pelajaran |
| 6 | Pesan dari Admin | ✅ | Prioritas + target kelas/rombel |
| 7 | Notifikasi Telegram | ✅ | Harian otomatis + inline button |
| 8 | Aktivasi via Telegram | ✅ | Kode unik per siswa |
| 9 | Bot Telegram | ✅ | /start, /help, /aktivasi, /nilai |
| 10 | Kelola Siswa (CRUD) | ✅ | Tambah, edit, hapus, search |
| 11 | Import Excel | ✅ | Upload .xlsx/.xls |
| 12 | Kode Aktivasi | ✅ | Generate per siswa / massal |
| 13 | Ganti Password | ✅ | Dari dashboard |
| 14 | Lupa Password | ✅ | OTP Telegram |
| 15 | Export CSV | ✅ | Download nilai |
| 16 | Backup Database | ✅ | Auto jam 2 pagi + manual |
| 17 | Monitoring | ✅ | Uptime, RAM, CPU, error log |
| 18 | CI/CD | ✅ | GitHub Actions + deploy.bat |
| 19 | Rate Limiting | ✅ | Login (100/15min), forgot-password (5/15min) |
| 20 | Cloudflare Tunnel | ✅ | Akses dari mana saja |

**Yang tidak ada (sesuai scope):**
- ❌ Absensi
- ❌ Cetak raport
- ❌ Jadwal pelajaran

---

## 17. Deployment

### Persiapan Server
```
1. Install Node.js 18+
2. Install MongoDB
3. Install Git
4. Install PM2: npm install -g pm2
5. Install Cloudflared
```

### Step-by-Step
```bash
# 1. Clone repository
git clone https://github.com/rafiramdhni1/Classroom-2.git

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install && npm run build

# 3. Configure .env
cd ../backend
# Edit .env sesuai server

# 4. Seed database
node ../backend/seed.js

# 5. Start server
pm2 start server.js --name "backend"
pm2 start bot-poll.js --name "bot"

# 6. Start Cloudflare tunnel
cloudflared tunnel --url http://127.0.0.1:5000

# 7. Update FRONTEND_URL di .env
# Restart backend: pm2 restart backend
```

### Akun Default
```
Admin:  NIS = admin     | Password = admin123
Siswa:  NIS = 240001    | Password = 240001
```

### Environment Variables (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smk_akademik
JWT_SECRET=smk-tkj-akademik-2024
GOOGLE_CLIENT_ID=<dari Google Cloud Console>
GOOGLE_CLIENT_SECRET=<dari Google Cloud Console>
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
TELEGRAM_BOT_TOKEN=<dari @BotFather>
TELEGRAM_BOT_USERNAME=smktkj_akademik_bot
FRONTEND_URL=<URL Cloudflare tunnel>
N8N_SECRET=smk-tkj-n8n-secret
```

---

## 18. Statistik Project

| Metrik | Nilai |
|--------|-------|
| Total File | ~30 |
| Backend Routes | 7 (auth, dashboard, admin, grades, classroom, tools, webhook) |
| Database Models | 7 (User, Student, Grade, CourseworkCache, ChatId, ActivationCode, AdminMessage) |
| Frontend Pages | 3 (Login, Dashboard, AdminPanel) |
| Admin Panel Tabs | 8 (Siswa, Input Nilai, Pesan, Kode Aktivasi, Import, Google Classroom, Backup, Monitoring) |
| API Endpoints | ~35 |
| Lines of Code | ~5000+ |

---

## 19. Credentials & Tokens

| Service | Credential |
|---------|------------|
| Admin Login | NIS: `admin`, Password: `admin123` |
| Test Student | NIS: `240001`, Password: `240001` |
| Telegram Bot | `@smktkj_akademik_bot` |
| Google Account | `tamasukajajan@gmail.com` |
| Google Cloud Project | `smk-akademik` |
| n8n Webhook Secret | `smk-tkj-n8n-secret` |

---

*Dokumentasi ini untuk presentasi Sistem Informasi Akademik SMK TKJ*
*Terakhir diperbarui: September 2026*
