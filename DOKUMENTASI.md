# DOKUMENTASI LENGKAP SISTEM AKADEMIK SMK TKJ

## Daftar Isi
1. [Arsitektur Sistem](#1-arsitektur-sistem)
2. [Tech Stack](#2-tech-stack)
3. [Struktur Database](#3-struktur-database)
4. [Backend - File by File](#4-backend)
5. [Frontend - File by File](#5-frontend)
6. [Alur Autentikasi](#6-alur-autentikasi)
7. [Google Classroom Integration](#7-google-classroom)
8. [Telegram Bot](#8-telegram-bot)
9. [Sistem Backup](#9-sistem-backup)
10. [Sistem Monitoring](#10-sistem-monitoring)
11. [Manual Grade Input](#11-manual-grade-input)
12. [CI/CD Pipeline](#12-cicd)
13. [Deployment Guide](#13-deployment)
14. [API Endpoints Reference](#14-api-reference)

---

## 1. Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                    USER LAYER                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Siswa/   │  │  Admin   │  │ Telegram │              │
│  │ Orang    │  │  (Guru/  │  │   Bot    │              │
│  │ Tua      │  │  Staff)  │  │          │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                    │
├───────┼──────────────┼──────────────┼────────────────────┤
│       │     LAYER JARINGAN          │                    │
│  ┌────┴─────────────────────────────┴─────┐             │
│  │         Cloudflare Tunnel              │             │
│  │    (akses dari mana saja, gratis)      │             │
│  └────────────────┬───────────────────────┘             │
│                   │                                      │
├───────────────────┼──────────────────────────────────────┤
│                   │     APPLICATION LAYER                │
│  ┌────────────────┴───────────────────────┐             │
│  │           Frontend (React)             │             │
│  │         Port: 5173 (dev)               │             │
│  │    Tailwind CSS + React Router         │             │
│  └────────────────┬───────────────────────┘             │
│                   │                                      │
│  ┌────────────────┴───────────────────────┐             │
│  │          Backend (Express.js)          │             │
│  │           Port: 5000                   │             │
│  │    REST API + WebSocket + Cron         │             │
│  └──┬─────────┬──────────┬───────────┬───┘             │
│     │         │          │           │                   │
├─────┼─────────┼──────────┼───────────┼───────────────────┤
│     │    EXTERNAL SERVICES          │                    │
│  ┌──┴───┐  ┌──┴───┐  ┌──┴───┐  ┌───┴──┐               │
│  │MongoDB│  │Google│  │Tele- │  │ n8n  │               │
│  │  DB   │  │Class.│  │gram  │  │Webhok│               │
│  │:27017 │  │ API  │  │ API  │  │      │               │
│  └──────┘  └──────┘  └──────┘  └──────┘               │
└─────────────────────────────────────────────────────────┘
```

### Alur Data:
1. **Siswa login** → Frontend kirim request ke Backend → Backend verifikasi password → Return JWT token
2. **Admin input nilai** → Frontend kirim POST ke Backend → Backend simpan ke MongoDB → Siswa bisa lihat di dashboard
3. **Google Classroom sync** → Backend pakai OAuth token → Fetch data dari Google API → Simpan ke MongoDB
4. **Telegram bot** → Bot polling pesan → Proses command → Kirim response
5. **Backup** → Cron job jalan tiap jam 2 pagi → Export MongoDB ke JSON → Simpan di folder backups/

---

## 2. Tech Stack

### Backend (Server)
| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| Node.js | 18+ | Runtime JavaScript di server |
| Express.js | 4.18+ | Web framework untuk membuat REST API |
| MongoDB | 6+ | Database NoSQL untuk menyimpan data |
| Mongoose | 7+ | ODM (Object Document Mapper) untuk MongoDB |
| jsonwebtoken | 9+ | Membuat dan verifikasi JWT token |
| bcrypt | 5+ | Hashing password (enkripsi) |
| googleapis | 100+ | Google API client untuk Classroom |
| node-telegram-bot-api | 0.64+ | Library Telegram Bot |
| node-cron | 3+ | Scheduler untuk cron job (backup, notifikasi) |
| cors | 2+ | Mengizinkan cross-origin requests |
| express-rate-limit | 7+ | Rate limiting untuk mencegah brute force |
| multer | 1.4+ | Upload file (Excel import) |
| xlsx | 0.18+ | Parsing file Excel |

### Frontend (Client)
| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| React | 18+ | Library untuk membuat UI |
| React Router | 6+ | Routing (navigasi halaman) |
| Tailwind CSS | 3+ | Utility-first CSS framework |
| Axios | 1+ | HTTP client untuk kirim request ke API |
| Vite | 5+ | Build tool dan dev server |

### Infrastructure
| Teknologi | Fungsi |
|-----------|--------|
| Cloudflare Tunnel | Akses publik gratis tanpa domain |
| PM2 | Process manager untuk menjaga server tetap jalan |
| GitHub Actions | CI/CD pipeline untuk auto-deploy |

---

## 3. Struktur Database

### Database: `smk_akademik`

#### Collection: `users`
Menyimpan semua akun (admin, siswa, orang tua).

```javascript
{
  _id: ObjectId,              // ID unik otomatis
  nis: String,                // Nomor Induk Siswa (unique)
  password: String,           // Password yang sudah di-hash (bcrypt)
  role: String,               // "admin" | "student" | "parent"
  namaLengkap: String,        // Nama lengkap
  kelas: String,              // "X", "XI", "XII"
  rombel: String,             // "A" atau "B" (rombel = rombongan belajar)
  
  // Field Google OAuth (hanya untuk admin)
  googleAccessToken: String,  // Token akses Google (untuk Classroom API)
  googleRefreshToken: String, // Token refresh Google (untuk perpanjang akses)
  googleEmail: String,        // Email Google yang dihubungkan
  googleConnected: Boolean,   // Sudah connect Google atau belum
  
  isActive: Boolean,          // Akun aktif atau tidak
  createdAt: Date,            // Waktu dibuat
  updatedAt: Date             // Waktu terakhir diupdate
}
```

#### Collection: `students`
Data detail siswa (terpisah dari user untuk fleksibilitas).

```javascript
{
  _id: ObjectId,
  nis: String,                // NIS (unique)
  nama: String,               // Nama siswa
  kelas: String,              // "X", "XI", "XII"
  rombel: String,             // "A" atau "B"
  classroomId: String,        // ID Google Classroom (jika sync)
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Collection: `courses`
Mata pelajaran yang tersedia.

```javascript
{
  _id: ObjectId,
  nama: String,               // "ASJ", "AIJ", "TJBL", "PKDK", "TJKT"
  deskripsi: String,
  kelas: [String],            // ["X", "XI", "XII"] - kelas yang mengambil
  createdAt: Date
}
```

#### Collection: `grades`
Nilai siswa (manual input oleh admin).

```javascript
{
  _id: ObjectId,
  studentId: ObjectId,        // Reference ke students collection
  nis: String,                // NIS siswa
  nama: String,               // Nama siswa
  kelas: String,              // Kelas
  rombel: String,             // Rombel
  mataPelajaran: String,      // "ASJ", "AIJ", dll
  tipe: String,               // "UTS" | "UAS" | "TUGAS" | "PRAKTIK"
  nilai: Number,              // 0-100
  semester: String,           // "Ganjil" | "Genap"
  tahunAjaran: String,        // "2024/2025"
  inputBy: ObjectId,          // Reference ke admin yang input
  createdAt: Date,
  updatedAt: Date
}
```

#### Collection: `courseworkcaches`
Cache data dari Google Classroom (agar tidak selalu fetch dari Google).

```javascript
{
  _id: ObjectId,
  classroomCourseId: String,  // ID kelas dari Google Classroom
  classroomWorkId: String,    // ID tugas dari Google Classroom
  title: String,              // Judul tugas
  description: String,        // Deskripsi tugas
  courseName: String,         // Nama kelas di Google Classroom
  courseAlias: String,        // "ASJ", "AIJ", dll (deteksi otomatis)
  dueDate: Date,              // Deadline tugas
  maxPoints: Number,          // Poin maksimal
  workType: String,           // "ASSIGNMENT" | "QUIZ" | "QUESTION"
  studentSubmissions: [{      // Array submission siswa
    classroomStudentId: String,
    state: String,            // "TURNED_IN" | "RETURNED" | "MISSING"
    late: Boolean,
    grade: Number,
    submittedAt: Date,
    isGraded: Boolean
  }],
  lastSyncedAt: Date          // Terakhir disync
}
```

#### Collection: `chatids`
Mapping NIS dengan Telegram Chat ID.

```javascript
{
  _id: ObjectId,
  nis: String,
  chatId: Number,             // Telegram Chat ID
  nama: String,
  kelas: String,
  rombel: String,
  role: String,               // "student" | "parent"
  createdAt: Date
}
```

#### Collection: `activationcodes`
Kode aktivasi untuk menghubungkan akun dengan Telegram.

```javascript
{
  _id: ObjectId,
  code: String,               // Kode unik (crypto.randomBytes)
  nis: String,                // NIS yang punya kode
  isUsed: Boolean,
  usedBy: Number,             // Telegram Chat ID yang pakai
  createdAt: Date,
  expiresAt: Date             // Kedaluwarsa (24 jam)
}
```

#### Collection: `adminmessages`
Pesan dari admin ke siswa.

```javascript
{
  _id: ObjectId,
  title: String,              // Judul pesan
  content: String,            // Isi pesan
  targetKelas: String,        // "ALL" atau "X", "XI", "XII"
  targetRombel: String,       // "ALL" atau "A", "B"
  priority: String,           // "low" | "medium" | "high"
  createdAt: Date
}
```

#### Collection: `logs`
Log error untuk monitoring.

```javascript
{
  _id: ObjectId,
  timestamp: Date,
  level: String,              // "error" | "warn" | "info"
  message: String,
  stack: String,              // Stack trace (untuk debugging)
  metadata: Object            // Data tambahan
}
```

#### Collection: `requests`
Log request untuk monitoring.

```javascript
{
  _id: ObjectId,
  method: String,             // "GET" | "POST" | "PUT" | "DELETE"
  url: String,
  statusCode: Number,
  duration: Number,           // Waktu proses (ms)
  ip: String,
  userAgent: String,
  timestamp: Date
}
```

---

## 4. Backend - File by File

### `server.js` - Entry Point Utama
**Fungsi:** Titik masuk utama backend. Menginisialisasi Express, middleware, routes, dan cron jobs.

**Apa yang dilakukan:**
1. Load environment variables dari `.env`
2. Koneksi ke MongoDB
3. Setup middleware (CORS, JSON parser, rate limiter, monitoring)
4. Daftarkan semua routes (auth, dashboard, admin, grades, tools, webhook)
5. Jalankan cron jobs (backup jam 2 pagi, notifikasi jam 5 sore weekdays)
6. Setup error handlers
7. Mulai listen di port 5000

**Flow:**
```
Request masuk → CORS check → Rate limiter → Monitoring middleware → Router → Handler → Response
```

### `config/db.js` - Database Connection
**Fungsi:** Menghubungkan aplikasi ke MongoDB.

```javascript
// Conceptual:
mongoose.connect(MONGODB_URI)
  → success: console.log("MongoDB connected")
  → error: console.error("MongoDB connection error")
```

### `middleware/auth.js` - Autentikasi
**Fungsi:** Middleware untuk melindungi routes yang membutuhkan login.

**Dua middleware:**
1. **`auth`** - Verifikasi JWT token. Semua user yang login wajib lewat ini.
2. **`adminOnly`** - Hanya admin yang boleh akses. Harus pakai `auth` dulu.

**Flow:**
```
Request dengan Authorization: Bearer <token>
  → auth middleware: decode JWT → attach user ke request
    → adminOnly middleware: cek role === "admin"
      → Route handler
```

### `routes/auth.js` - Autentikasi
**Fungsi:** Menangani login, registrasi, OTP, lupa password, Google OAuth.

**Endpoints:**
| Method | Path | Fungsi |
|--------|------|--------|
| POST | `/api/auth/login` | Login dengan NIS + Password |
| POST | `/api/auth/forgot-password` | Kirim OTP ke Telegram |
| POST | `/api/auth/verify-otp` | Verifikasi OTP |
| POST | `/api/auth/reset-password` | Reset password baru |
| GET | `/api/auth/google` | Generate Google OAuth URL |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| GET | `/api/auth/me` | Dapatkan data user dari token |

**Alur Login:**
```
1. Frontend kirim { nis, password } ke POST /api/auth/login
2. Backend cari user berdasarkan nis
3. Bandingkan password dengan bcrypt.compare()
4. Jika cocok: buat JWT token → return { token, user }
5. Jika tidak: return error 401
```

**Alur Lupa Password:**
```
1. User masukkan NIS → POST /api/auth/forgot-password
2. Backend cari user, buat OTP 6 digit
3. Simpan OTP di memory (Map) dengan expiry 5 menit
4. Kirim OTP via Telegram ke user
5. User masukkan OTP → POST /api/auth/verify-otp
6. Backend verifikasi OTP → return resetToken
7. User masukkan password baru → POST /api/auth/reset-password
8. Backend update password → selesai
```

### `routes/dashboard.js` - Dashboard
**Fungsi:** Menyediakan data untuk dashboard siswa/orang tua.

**Endpoints:**
| Method | Path | Fungsi |
|--------|------|--------|
| GET | `/api/dashboard` | Semua data dashboard |
| GET | `/api/dashboard/grades` | Nilai (Google Classroom + manual) |
| GET | `/api/dashboard/ranking` | Peringkat siswa |
| GET | `/api/dashboard/messages` | Pesan dari admin |
| POST | `/api/dashboard/change-password` | Ganti password |

**Data yang dikembalikan:**
```json
{
  "student": { "nis": "240001", "nama": "Ahmad", "kelas": "X", "rombel": "A" },
  "grades": {
    "google": [...],  // Dari Google Classroom
    "manual": [...],  // Dari manual input
    "merged": [...]   // Gabungan
  },
  "ranking": {
    "position": 5,    // Peringkat ke-5
    "total": 36       // Dari 36 siswa
  },
  "messages": [...],
  "stats": {
    "totalAssignments": 20,
    "submitted": 15,
    "pending": 5
  }
}
```

**Alur Ranking:**
```
1. Ambil semua nilai siswa di kelas yang sama
2. Hitung rata-rata nilai per siswa
3. Urutkan dari tertinggi ke terendah
4. Cari posisi siswa yang login
```

### `routes/admin.js` - Panel Admin
**Fungsi:** CRUD siswa, pesan, kode aktivasi, import Excel.

**Endpoints:**
| Method | Path | Fungsi |
|--------|------|--------|
| GET | `/api/admin/students` | List semua siswa |
| POST | `/api/admin/students` | Tambah siswa baru |
| PUT | `/api/admin/students/:id` | Edit siswa |
| DELETE | `/api/admin/students/:id` | Hapus siswa |
| GET | `/api/admin/stats` | Statistik (total siswa, aktif, dll) |
| GET | `/api/admin/messages` | List pesan |
| POST | `/api/admin/messages` | Kirim pesan |
| DELETE | `/api/admin/messages/:id` | Hapus pesan |
| GET | `/api/admin/codes` | List kode aktivasi |
| POST | `/api/admin/codes` | Generate kode baru (crypto.randomBytes) |
| DELETE | `/api/admin/codes/:id` | Hapus kode |
| POST | `/api/admin/import` | Import siswa dari Excel |
| GET | `/api/admin/monitoring` | Data monitoring |

**Import Excel:**
```
1. Upload file .xlsx/.xls via multer
2. Baca file dengan library xlsx
3. Parse baris: NIS, Nama, Kelas, Rombel
4. Validasi data (duplikat, format)
5. Insert ke MongoDB (bulkWrite)
6. Buat user account untuk setiap siswa
7. Return hasil import
```

### `routes/grades.js` - Input Nilai Manual
**Fungsi:** CRUD nilai manual oleh admin.

**Endpoints:**
| Method | Path | Fungsi |
|--------|------|--------|
| GET | `/api/grades` | Ambil nilai (filter: kelas, mapel, semester) |
| POST | `/api/grades` | Simpan satu nilai |
| POST | `/api/grades/bulk` | Simpan banyak nilai sekaligus |
| DELETE | `/api/grades/:id` | Hapus nilai |

**Alur Bulk Save (Spreadsheet-like):**
```
1. Admin buka tab "Input Nilai" di Admin Panel
2. Pilih kelas, rombel, mata pelajaran, tipe, semester
3. Tabel menampilkan semua siswa di kelas tersebut
4. Admin input nilai di tabel (seperti Excel)
5. Klik "Simpan Semua"
6. Frontend kirim POST /api/grades/bulk dengan array nilai
7. Backend hapus nilai lama yang sama (kelas+mapel+tipe+semester)
8. Backend insert nilai baru (bulk insert)
9. Nilai tersimpan, siswa bisa lihat di dashboard
```

### `routes/tools.js` - Backup & Monitoring
**Fungsi:** Backup database dan monitoring sistem.

**Endpoints:**
| Method | Path | Fungsi |
|--------|------|--------|
| POST | `/api/tools/backup` | Manual backup |
| GET | `/api/tools/backup/list` | List semua backup |
| GET | `/api/tools/backup/download/:filename` | Download backup |
| DELETE | `/api/tools/backup/:filename` | Hapus backup |
| GET | `/api/tools/monitoring` | Status sistem |
| GET | `/api/tools/monitoring/errors` | Log error |
| GET | `/api/tools/monitoring/requests` | Log request |

### `routes/webhook.js` - Webhook
**Fungsi:** Menerima webhook dari n8n atau service lain.

**Endpoints:**
| Method | Path | Fungsi |
|--------|------|--------|
| POST | `/api/webhook/n8n` | Terima data dari n8n |

### `routes/classroom.js` - Google Classroom
**Fungsi:** Mengelola koneksi dan sinkronisasi Google Classroom.

**Endpoints:**
| Method | Path | Fungsi |
|--------|------|--------|
| POST | `/api/classroom/sync` | Sinkronisasi semua kelas |
| GET | `/api/classroom/status` | Status koneksi Google |

### `services/classroom.js` - Google Classroom Service
**Fungsi:** Core logic untuk Google OAuth dan Classroom API.

**SCOPES:**
```javascript
[
  'https://www.googleapis.com/auth/classroom.courses.readonly',    // Baca daftar kelas
  'https://www.googleapis.com/auth/classroom.rosters.readonly',    // Baca daftar siswa
]
```

**Alur Sync:**
```
1. Cari user di MongoDB berdasarkan userId
2. Ambil googleAccessToken dan googleRefreshToken
3. Buat OAuth2 client dengan token
4. Fetch semua kelas dari Google Classroom (GET /courses)
5. Untuk setiap kelas:
   a. Deteksi alias (ASJ, AIJ, TJBL, PKDK, TJKT) dari nama kelas
   b. Jika tidak ada alias: skip
   c. Fetch semua tugas/tugas (GET /courseWork)
   d. Untuk setiap tugas:
      - Fetch submissions siswa (GET /studentSubmissions)
      - Simpan ke MongoDB (CourseworkCache)
6. Return jumlah kelas yang berhasil disync
```

**Deteksi Alias:**
```javascript
// Fungsi detectSubjectAlias()
// Mengecek apakah nama kelas mengandung salah satu dari:
// ASJ, AIJ, TJBL, PKDK, TJKT
// Contoh: "X ASJ" → terdeteksi sebagai "ASJ"
// Contoh: "TKJ" → TIDAK terdeteksi (tidak ada alias)
```

**Fallback untuk submission:**
```javascript
// Jika scope student-submissions tidak tersedia:
// - courses.list tetap jalan ✅
// - rosters.list tetap jalan ✅
// - courseWork.list tetap jalan ✅
// - studentSubmissions.list akan error → ditangkap, log, skip
```

### `services/telegramBot.js` - Telegram Bot
**Fungsi:** Bot Telegram untuk interaksi siswa/orang tua.

**Commands:**
| Command | Fungsi |
|---------|--------|
| `/start` | Mulai bot, tampilkan menu |
| `/help` | Tampilkan bantuan |
| `/aktivasi <kode>` | Aktivasi akun dengan kode |
| `/nilai` | Lihat nilai |
| `/info` | Info akun |
| `/status` | Status koneksi |

**Alur Aktivasi:**
```
1. User kirim /aktivasi ABC123
2. Bot cari kode "ABC123" di database
3. Jika kode valid dan belum dipakai:
   a. Tandai kode sebagai "sudah dipakai"
   b. Simpan chatId ke user
   c. Kirim pesan "Aktivasi berhasil!"
4. Jika kode tidak valid: kirim "Kode tidak valid"
```

**Parse Mode: HTML**
```javascript
// Semua pesan bot menggunakan HTML formatting
// Bukan Markdown (yang sering error)
bot.sendMessage(chatId, 
  `<b>Nilai Anda:</b>\n` +
  `<b>ASJ:</b> 85\n` +
  `<b>AIJ:</b> 90`,
  { parse_mode: 'HTML' }
);
```

### `services/notification.js` - Notifikasi
**Fungsi:** Kirim notifikasi otomatis ke user Telegram.

**Alur:**
```
1. Cron job jalan jam 5 sore (weekdays)
2. Fetch semua chatIds dari database
3. Untuk setiap user:
   a. Ambil nilai terbaru
   b. Format pesan
   c. Kirim via Telegram
```

### `services/backup.js` - Backup
**Fungsi:** Backup MongoDB ke file JSON.

**Alur:**
```
1. Cron job jalan jam 2 pagi setiap hari
2. Buat nama file: backup-YYYY-MM-DD-HHmmss.json
3. Fetch semua collections dari MongoDB:
   - users, students, grades, courses
   - courseworkcaches, chatids, activationcodes
   - adminmessages, logs, requests
4. Simpan semua ke satu JSON file
5. Hapus backup lama (lebih dari 30 hari)
6. Return info backup
```

**Kenapa pakai JSON native (bukan mongodump):**
- Tidak perlu install mongodump
- Bisa jalan di mana saja (Windows, Linux, Mac)
- Lebih ringan dan simpel

### `services/monitoring.js` - Monitoring
**Fungsi:** Track semua request dan error untuk monitoring.

**Fungsi utama:**
1. **`trackRequest()`** - Middleware yang mencatat semua request (method, URL, status, duration)
2. **`logError()`** - Log error ke database
3. **`getSystemStatus()`** - Dapatkan status sistem (uptime, RAM, CPU, MongoDB status)
4. **`getErrorLogs()`** - Ambil log error
5. **`getRequestStats()`** - Statistik request

### `bot-poll.js` - Telegram Bot Polling
**Fungsi:** Menjalankan bot Telegram dalam mode polling (long-polling).

```
1. Inisialisasi Telegram Bot
2. Mulai polling (ambil pesan baru terus-menerus)
3. Untuk setiap pesan:
   a. Parse command
   b. Proses sesuai command
   c. Kirim response
4. Handle error (retry, reconnect)
```

### `models/` - Mongoose Models
Setiap file di folder `models/` mendefinisikan schema dan model MongoDB:

| File | Model | Collection |
|------|-------|------------|
| `User.js` | User | users |
| `Student.js` | Student | students |
| `Grade.js` | Grade | grades |
| `CourseworkCache.js` | CourseworkCache | courseworkcaches |
| `ChatId.js` | ChatId | chatids |
| `ActivationCode.js` | ActivationCode | activationcodes |
| `AdminMessage.js` | AdminMessage | adminmessages |

### `middleware/errorHandler.js` - Error Handler
**Fungsi:** Menangani semua error secara global.

```
1. Error terjadi di route handler
2. Masuk ke error handler middleware
3. Log error ke console dan database
4. Kirim response error ke client (tidak bocor detail server)
```

---

## 5. Frontend - File by File

### `src/App.jsx` - Router
**Fungsi:** Definisi semua rute halaman.

```
/ → Login
/dashboard → Dashboard (student/parent only)
/admin → Admin Panel (admin only)
```

**Route Protection:**
- **`StudentRoute`** - Cek token di localStorage, redirect ke / jika tidak ada
- **`AdminRoute`** - Cek token + role === "admin", redirect ke / jika bukan admin

### `src/pages/Login.jsx` - Halaman Login
**Fungsi:** Form login + fitur lupa password.

**State:**
- `nis` - Nomor induk siswa
- `password` - Password
- `loading` - Status loading
- `showForgotPassword` - Tampilkan form lupa password
- `otpStep` - Langkah OTP (1: masukkan NIS, 2: masukkan OTP, 3: password baru)

**Alur Login:**
```
1. User masukkan NIS + Password
2. Kirim POST /api/auth/login
3. Jika berhasil:
   a. Simpan token di localStorage
   b. Redirect ke /dashboard atau /admin (sesuai role)
4. Jika gagal: tampilkan error
```

**Alur Lupa Password:**
```
1. Klik "Lupa Password?"
2. Masukkan NIS → POST /api/auth/forgot-password
3. Terima OTP via Telegram
4. Masukkan OTP → POST /api/auth/verify-otp
5. Masukkan password baru → POST /api/auth/reset-password
6. Redirect ke login
```

### `src/pages/Dashboard.jsx` - Dashboard Siswa/Orang Tua
**Fungsi:** Menampilkan nilai, ranking, pesan, dan fitur lain.

**Tabs:**
1. **Nilai** - Tabel nilai dari Google Classroom + manual
2. **Ranking** - Peringkat di kelas
3. **Pesan** - Pesan dari admin
4. **Akun** - Ganti password, info akun

**Features:**
- Export nilai ke CSV
- Auto-refresh setiap 30 detik
- Tampilan responsif (mobile-friendly)

**Alur Fetch Data:**
```
1. Mount → hit GET /api/dashboard
2. Terima data: student, grades, ranking, messages
3. Render ke UI
4. Auto-refresh setiap 30 detik (useEffect + setInterval)
```

### `src/pages/AdminPanel.jsx` - Panel Admin
**Fungsi:** Panel kontrol lengkap untuk admin.

**8 Tabs:**

#### Tab 1: Siswa
- Tabel semua siswa dengan search
- Tambah siswa (form modal)
- Edit siswa (form modal)
- Hapus siswa (konfirmasi)
- Export ke CSV
- Pagination (10 per halaman)

#### Tab 2: Input Nilai
- Dropdown: Kelas → Rombel → Mata Pelajaran → Tipe → Semester
- Tabel spreadsheet-like (isi nilai per siswa)
- Tombol "Simpan Semua" → bulk save
- Nilai tersimpan otomatis ke database

#### Tab 3: Pesan
- Kirim pesan ke semua siswa atau per kelas/rombel
- Prioritas: low, medium, high
- Hapus pesan

#### Tab 4: Kode Aktivasi
- Generate kode aktivasi baru
- Lihat kode yang sudah ada
- Hapus kode
- Kode dibuat dengan `crypto.randomBytes` (aman)

#### Tab 5: Import
- Upload file Excel (.xlsx/.xls)
- Preview data sebelum import
- Import ke database
- Auto-create user account

#### Tab 6: Google Classroom
- Status koneksi Google
- Tombol "Hubungkan dengan Google" (OAuth flow)
- Tombol "Sinkronisasi Sekarang" (sync data)
- Tombol "Putuskan Koneksi"

#### Tab 7: Backup
- Tombol "Buat Backup Sekarang" (manual backup)
- List semua backup (tanggal, ukuran)
- Download backup
- Hapus backup
- Auto backup jam 2 pagi setiap hari

#### Tab 8: Monitoring
- Status sistem (uptime, RAM, CPU, DB)
- Jumlah request hari ini
- Error log terbaru
- Request log terbaru
- Auto-refresh setiap 10 detik

### `src/contexts/AuthContext.jsx` - Auth State
**Fungsi:** Mengelola state autentikasi global.

```
- user: data user yang login (null jika belum)
- token: JWT token (dari localStorage)
- login(nis, password): fungsi login
- logout(): fungsi logout
- isAdmin: boolean, apakah user admin
- isStudent: boolean, apakah user siswa
```

### `src/utils/api.js` - Axios Instance
**Fungsi:** Instance Axios yang sudah dikonfigurasi.

```
- baseURL: "" (relative, via Vite proxy ke localhost:5000)
- Interceptor request: tambahkan Authorization header
- Interceptor response: handle 401 (redirect ke login)
```

### `src/components/` - Komponen reusable
| Komponen | Fungsi |
|----------|--------|
| `Navbar.jsx` | Navigasi atas |
| `Modal.jsx` | Modal popup |
| `Loading.jsx` | Indikator loading |
| `Pagination.jsx` | Navigasi halaman |
| `SearchInput.jsx` | Input pencarian |

---

## 6. Alur Autentikasi

### JWT (JSON Web Token)
```
1. User login dengan NIS + Password
2. Backend verifikasi password (bcrypt)
3. Backend buat JWT token:
   {
     userId: "...",
     role: "student",
     iat: timestamp,
     exp: timestamp + 7 hari
   }
4. Token dikirim ke frontend
5. Frontend simpan di localStorage
6. Setiap request, frontend kirim token di header:
   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
7. Backend verifikasi token di middleware auth
8. Jika valid: lanjut ke handler
9. Jika expired/invalid: return 401, redirect ke login
```

### Password Hashing (bcrypt)
```
1. User register/login dengan password "rahasia123"
2. Backend hash password: bcrypt.hash("rahasia123", 10)
   → "$2b$10$N9qo8uLOickgx2ZMRZoMye..."
3. Simpan hash ke MongoDB (bukan password asli!)
4. Saat login: bcrypt.compare("rahasia123", hash)
   → true (cocok) atau false (tidak cocok)
```

---

## 7. Google Classroom Integration

### OAuth 2.0 Flow
```
1. Admin klik "Hubungkan dengan Google"
2. Frontend minta URL OAuth ke GET /api/auth/google
3. Backend generate URL:
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id=826503490772-...
     &redirect_uri=http://localhost:5000/api/auth/google/callback
     &scope=classroom.courses.readonly+classroom.rosters.readonly
     &response_type=code
     &access_type=offline
     &prompt=consent
4. User login Google dan grant permission
5. Google redirect ke callback URL dengan ?code=xxx
6. Backend tukar code dengan tokens:
   POST https://oauth2.googleapis.com/token
   {
     code: "xxx",
     client_id: "...",
     client_secret: "...",
     redirect_uri: "...",
     grant_type: "authorization_code"
   }
7. Google return:
   {
     access_token: "ya29...",
     refresh_token: "1//...",
     expires_in: 3600
   }
8. Backend simpan tokens ke user di MongoDB
9. Redirect ke frontend dengan ?google_auth=success
```

### Sync Flow
```
1. Admin klik "Sinkronisasi Sekarang"
2. Frontend POST /api/classroom/sync
3. Backend ambil tokens dari MongoDB
4. Buat OAuth client dengan tokens
5. Fetch kelas:
   GET https://classroom.googleapis.com/v1/courses?pageSize=100
6. Untuk setiap kelas:
   a. Deteksi alias dari nama kelas
   b. Fetch tugas:
      GET /v1/courses/{id}/courseWork?pageSize=100
   c. Fetch submissions (dengan try/catch):
      GET /v1/courses/{id}/courseWork/{workId}/studentSubmissions
   d. Simpan ke CourseworkCache di MongoDB
7. Return hasil sync
```

---

## 8. Telegram Bot

### Setup
```
1. Buat bot via @BotFather di Telegram
2. Dapat token: 8964110722:AAHkEU1s_qG-QXaOzHCW5I7ddc2ica9Sg6Y
3. Simpan di .env: TELEGRAM_BOT_TOKEN=...
4. Jalankan bot-poll.js (long-polling mode)
```

### Command Processing
```
User kirim: /aktivasi ABC123
  → Bot parse: command="aktivasi", args=["ABC123"]
  → Cari kode "ABC123" di database
  → Jika valid: simpan chatId, kirim "Berhasil!"
  → Jika invalid: kirim "Kode tidak valid"

User kirim: /nilai
  → Bot cari chatId di database
  → Ambil data siswa berdasarkan chatId
  → Ambil nilai dari Google Classroom + manual
  → Format sebagai HTML
  → Kirim ke user
```

---

## 9. Sistem Backup

### Auto Backup
```
Cron: 0 2 * * * (jam 2 pagi setiap hari)
1. Kumpulkan semua collections
2. Export ke JSON
3. Simpan: backups/backup-2024-01-15-020000.json
4. Hapus backup > 30 hari
```

### Manual Backup
```
1. Admin klik "Buat Backup Sekarang" di Admin Panel
2. Frontend POST /api/tools/backup
3. Backend jalankan backup yang sama
4. Return info: nama file, ukuran
```

### Restore
```
1. Download file backup (.json)
2. Import ke MongoDB manual (atau buat script restore)
```

---

## 10. Sistem Monitoring

### Request Tracking
```
Setiap request ke server akan dicatat:
- Method (GET, POST, PUT, DELETE)
- URL (/api/auth/login, /api/dashboard, dll)
- Status code (200, 401, 500)
- Duration (ms)
- IP address
- User agent
- Timestamp
```

### Error Logging
```
Ketika error terjadi:
1. Tangkap error di route handler
2. Log ke console
3. Simpan ke collection "logs" di MongoDB:
   - level: "error"
   - message: pesan error
   - stack: stack trace (untuk debugging)
   - metadata: data tambahan
4. Return error response ke client
```

### System Status
```
GET /api/tools/monitoring mengembalikan:
{
  uptime: 3600,           // Server sudah jalan berapa detik
  memory: {
    total: 8GB,
    used: 4GB,
    free: 4GB
  },
  cpu: {
    usage: 25%,           // Penggunaan CPU
    cores: 4
  },
  database: {
    status: "connected",  // Status MongoDB
    collections: 10       // Jumlah collections
  },
  backups: 5,             // Jumlah backup tersimpan
  errors: 3               // Error dalam 24 jam terakhir
}
```

---

## 11. Manual Grade Input

### Konsep
Sistem input nilai manual untuk admin/guru yang tidak pakai Google Classroom.

### Database: Grade Schema
```javascript
{
  studentId: ObjectId,      // Siswa yang punya nilai
  nis: String,              // NIS
  nama: String,             // Nama
  kelas: String,            // X, XI, XII
  rombel: String,           // A, B
  mataPelajaran: String,    // ASJ, AIJ, TJBL, PKDK, TJKT
  tipe: String,             // UTS, UAS, TUGAS, PRAKTIK
  nilai: Number,            // 0-100
  semester: String,         // Ganjil, Genap
  tahunAjaran: String,      // 2024/2025
  inputBy: ObjectId         // Admin yang input
}
```

### Alur Input
```
1. Admin buka Admin Panel → tab "Input Nilai"
2. Pilih filter:
   - Kelas: X
   - Rombel: A
   - Mata Pelajaran: ASJ
   - Tipe: UTS
   - Semester: Ganjil
3. Tabel muncul dengan semua siswa di kelas X-A
4. Admin isi nilai di setiap baris
5. Klik "Simpan Semua"
6. POST /api/grades/bulk:
   {
     grades: [
       { nis: "240001", nama: "Ahmad", kelas: "X", rombel: "A", 
         mataPelajaran: "ASJ", tipe: "UTS", nilai: 85, ... },
       { nis: "240002", ... },
       ...
     ]
   }
7. Backend:
   a. Hapus nilai lama yang sama (kelas + mapel + tipe + semester)
   b. Insert nilai baru (bulk)
8. Nilai muncul di dashboard siswa
```

---

## 12. CI/CD Pipeline

### deploy.bat (1-Click Deploy)
```batch
@echo off
echo ================================
echo  DEPLOY SISTEM AKADEMIK SMK TKJ
echo ================================

echo [1/5] Pull code terbaru...
git pull origin main

echo [2/5] Install dependencies backend...
cd backend && npm install

echo [3/5] Install dependencies frontend...
cd ../frontend && npm install

echo [4/5] Build frontend...
npm run build

echo [5/5] Restart server...
pm2 restart all

echo ================================
echo  DEPLOY SELESAI!
echo ================================
```

### GitHub Actions (.github/workflows/deploy.yml)
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: self-hosted  # Runner di server sekolah
    steps:
      - uses: actions/checkout@v3
      - run: cd backend && npm install
      - run: cd frontend && npm install && npm run build
      - run: pm2 restart all
```

**Alur:**
```
1. Developer push ke GitHub
2. GitHub Actions trigger workflow
3. Self-hosted runner di server sekolah pull code
4. Install dependencies
5. Build frontend
6. Restart server dengan PM2
7. Update selesai!
```

---

## 13. Deployment Guide

### Persiapan Server Sekolah
```
1. Install Node.js 18+ (https://nodejs.org)
2. Install MongoDB (https://www.mongodb.com/try/download/community)
3. Install Git (https://git-scm.com)
4. Install PM2: npm install -g pm2
5. Install Cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
```

### Step-by-Step Deploy
```bash
# 1. Clone repository
git clone https://github.com/rafiramdhni1/Classroom-2.git
cd Classroom-2

# 2. Install backend dependencies
cd backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install

# 4. Build frontend
npm run build

# 5. Configure backend
cd ../backend
# Edit .env sesuai server sekolah

# 6. Seed database
node ../backend/seed.js

# 7. Start backend
cd backend
pm2 start server.js --name "backend"
pm2 start bot-poll.js --name "bot"

# 8. Start Cloudflare tunnel
cloudflared tunnel --url http://localhost:5000

# 9. Catat URL tunnel
# Contoh: https://xxx-yyy-zzz.trycloudflare.com

# 10. Update FRONTEND_URL di .env
# FRONTEND_URL=https://xxx-yyy-zzz.trycloudflare.com

# 11. Restart backend
pm2 restart backend
```

### Cloudflare Tunnel
```
Cloudflare Tunnel adalah cara paling mudah untuk:
- Akses dari mana saja (tanpa domain)
- Gratis
- Tidak perlu setup DNS, SSL, atau firewall

Cara kerja:
1. cloudflared menjalankan tunnel ke Cloudflare
2. Cloudflare berikan URL publik (trycloudflare.com)
3. URL tersebut diteruskan ke localhost:5000
4. Hasilnya: server lokal bisa diakses dari internet
```

### PM2 (Process Manager)
```
PM2 menjaga server tetap jalan:
- Auto-restart jika crash
- Load balancing (jika multi-core)
- Log management
- Monitoring

Commands:
pm2 start server.js --name "backend"   # Start server
pm2 start bot-poll.js --name "bot"     # Start bot
pm2 restart all                         # Restart semua
pm2 stop all                            # Stop semua
pm2 logs                                # Lihat logs
pm2 monit                               # Monitor real-time
```

---

## 14. API Endpoints Reference

### Auth
| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/auth/login` | ❌ | `{ nis, password }` | `{ token, user }` |
| POST | `/api/auth/forgot-password` | ❌ | `{ nis }` | `{ message }` |
| POST | `/api/auth/verify-otp` | ❌ | `{ nis, otp }` | `{ resetToken }` |
| POST | `/api/auth/reset-password` | ❌ | `{ resetToken, newPassword }` | `{ message }` |
| GET | `/api/auth/google` | ✅ | - | `{ url }` |
| GET | `/api/auth/google/callback` | ❌ | `?code=xxx` | Redirect |
| GET | `/api/auth/me` | ✅ | - | `{ user }` |

### Dashboard
| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/api/dashboard` | ✅ | `{ student, grades, ranking, messages, stats }` |
| GET | `/api/dashboard/grades` | ✅ | `{ grades }` |
| GET | `/api/dashboard/ranking` | ✅ | `{ ranking }` |
| POST | `/api/dashboard/change-password` | ✅ | `{ message }` |

### Admin
| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/admin/students` | ✅Admin | - | `{ students }` |
| POST | `/api/admin/students` | ✅Admin | `{ nis, nama, kelas, rombel }` | `{ student }` |
| PUT | `/api/admin/students/:id` | ✅Admin | `{ nama, kelas, ... }` | `{ student }` |
| DELETE | `/api/admin/students/:id` | ✅Admin | - | `{ message }` |
| GET | `/api/admin/stats` | ✅Admin | - | `{ stats }` |
| GET | `/api/admin/messages` | ✅Admin | - | `{ messages }` |
| POST | `/api/admin/messages` | ✅Admin | `{ title, content, target }` | `{ message }` |
| GET | `/api/admin/codes` | ✅Admin | - | `{ codes }` |
| POST | `/api/admin/codes` | ✅Admin | `{ nis }` | `{ code }` |
| POST | `/api/admin/import` | ✅Admin | file Excel | `{ results }` |

### Grades
| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/grades` | ✅ | `?kelas=X&mapel=ASJ` | `{ grades }` |
| POST | `/api/grades` | ✅Admin | `{ nis, mapel, tipe, nilai, ... }` | `{ grade }` |
| POST | `/api/grades/bulk` | ✅Admin | `{ grades: [...] }` | `{ message }` |
| DELETE | `/api/grades/:id` | ✅Admin | - | `{ message }` |

### Tools
| Method | Path | Auth | Response |
|--------|------|------|----------|
| POST | `/api/tools/backup` | ✅Admin | `{ backup }` |
| GET | `/api/tools/backup/list` | ✅Admin | `{ backups }` |
| GET | `/api/tools/backup/download/:filename` | ✅Admin | File JSON |
| DELETE | `/api/tools/backup/:filename` | ✅Admin | `{ message }` |
| GET | `/api/tools/monitoring` | ✅Admin | `{ status }` |

### Classroom
| Method | Path | Auth | Response |
|--------|------|------|----------|
| POST | `/api/classroom/sync` | ✅Admin | `{ result }` |
| GET | `/api/classroom/status` | ✅Admin | `{ connected, email }` |

---

## File Structure
```
smk-akademik/
├── backend/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js            # JWT + admin middleware
│   │   └── errorHandler.js    # Global error handler
│   ├── models/
│   │   ├── User.js            # User model
│   │   ├── Student.js         # Student model
│   │   ├── Grade.js           # Grade model (manual input)
│   │   ├── CourseworkCache.js # Google Classroom cache
│   │   ├── ChatId.js          # Telegram chat mapping
│   │   ├── ActivationCode.js  # Kode aktivasi
│   │   └── AdminMessage.js    # Pesan admin
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
│   ├── backups/               # Backup files storage
│   ├── server.js              # Entry point
│   ├── bot-poll.js            # Telegram bot runner
│   ├── seed.js                # Database seeder
│   ├── .env                   # Environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx      # Login page
│   │   │   ├── Dashboard.jsx  # Dashboard siswa
│   │   │   └── AdminPanel.jsx # Admin panel (8 tabs)
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx # Auth state management
│   │   ├── utils/
│   │   │   └── api.js         # Axios instance
│   │   ├── components/
│   │   │   ├── Navbar.jsx     # Navigation bar
│   │   │   ├── Modal.jsx      # Modal component
│   │   │   └── ...
│   │   └── App.jsx            # Router
│   ├── vite.config.js         # Vite config
│   ├── tailwind.config.js     # Tailwind config
│   └── package.json
├── .github/
│   └── workflows/
│       └── deploy.yml         # GitHub Actions CI/CD
├── deploy.bat                 # 1-click deploy script
├── PRESENTASI.md              # Presentation document
├── DOKUMENTASI.md             # This file
└── .gitignore
```

---

**Dokumentasi ini dibuat untuk membantu memahami seluruh sistem secara mendalam.**
**Terakhir diperbarui: September 2026**
