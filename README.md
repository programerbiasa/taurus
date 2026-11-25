# TAURUS - IT Support Management System

**TAURUS** adalah sistem manajemen operasional IT Support multi-platform (Backend API, Web Dashboard, Mobile App, dan Desktop App) yang dirancang untuk mempercepat pelaporan insiden, pemantauan status tiket, dan pencatatan log pekerjaan teknisi lapangan secara terintegrasi dan real-time.

---

## 🏗️ Arsitektur & Teknologi

| Komponen | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Backend** | Node.js, Express, TypeScript, TypeORM, MariaDB, Socket.IO, JWT, bcryptjs | REST API, WebSocket server, penanganan upload lampiran, dan relasi database. |
| **Web** | React 18, Vite, TypeScript, Material-UI (MUI v5), Axios, React Router v6, Socket.IO Client | Antarmuka web modern, responsif, tema profesional (Biru Gelap `#1a237e` & Oranye `#ff6f00`). |
| **Mobile** | React Native, Expo SDK 50, TypeScript, React Native Paper, React Navigation, SQLite, NetInfo | Aplikasi Android/iOS untuk teknisi, notifikasi push real-time, dan dukungan penyimpanan offline. |
| **Desktop** | Electron, Electron-Builder | Desktop wrapper aplikasi web untuk Windows (.exe installer). |
| **Database** | MariaDB | Berjalan di `172.16.5.254:3306`, konfigurasi kredensial diatur via file `.env`. |

---

## ⚙️ Aturan & Logika Bisnis Utama
1. **Autentikasi Sederhana**: Login menggunakan kombinasi **username & password** (terenkripsi bcrypt dengan JWT token).
2. **Tanpa Hirarki Role**: Semua pengguna terdaftar dapat membuat tiket, mencatat job, memperbarui status, dan berkolaborasi tanpa pembatasan role.
3. **Penyimpanan Offline & Auto-Sync**: Pada perangkat mobile, saat tidak ada jaringan, pencatatan pekerjaan otomatis disimpan ke database SQLite lokal dan langsung disinkronkan saat koneksi internet pulih.
4. **WebSocket Notifikasi Real-Time**: Ketika tiket baru atau pekerjaan baru dibuat/diperbarui, seluruh klien (Web dan Mobile) langsung menerima notifikasi instan.
5. **Otomatisasi Tiket**: Saat sebuah catatan pekerjaan (Job) diselesaikan (`Completed`), tiket yang ditautkan secara otomatis diubah statusnya menjadi `Closed`.

---

## 📁 Struktur Direktori Proyek

```text
TAURUS/
├── backend/                  # Server REST API & WebSocket
│   ├── migrations/           # Skrip SQL inisialisasi tabel
│   │   └── init_schema.sql
│   ├── src/
│   │   ├── config/database.ts# TypeORM MariaDB DataSource
│   │   ├── middleware/auth.ts# JWT Verification
│   │   ├── models/           # Entity: User, Ticket, TicketComment, Job
│   │   ├── routes/           # Routing: auth, tickets, jobs, upload
│   │   ├── app.ts            # Entrypoint Express & Socket.IO
│   │   └── seed.ts           # Seeder akun admin awal
│   ├── uploads/              # Direktori penyimpanan berkas lampiran
│   ├── .env                  # Konfigurasi kredensial MariaDB & JWT
│   ├── package.json
│   └── tsconfig.json
│
├── web/                      # Aplikasi Web Frontend (Vite + React + MUI)
│   ├── src/
│   │   ├── components/       # Layout (Sidebar + Topbar), StatusBadge, PrivateRoute
│   │   ├── pages/            # Login, Dashboard, TicketList, TicketCreate, TicketDetail, JobList, JobCreate, JobDetail
│   │   ├── api.ts            # Axios client dengan interceptor token
│   │   ├── socket.ts         # Socket.IO client
│   │   ├── theme.ts          # Tema MUI Biru Gelap (#1a237e) & Oranye (#ff6f00)
│   │   ├── types/            # TypeScript Interface
│   │   ├── App.tsx           # Router & protected routes
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts        # Proxy konfigurasi ke backend
│   └── package.json
│
├── mobile/                   # Aplikasi Mobile Teknisi (React Native Expo)
│   ├── src/
│   │   ├── db/localdb.ts     # Offline SQLite Storage (jobs_offline)
│   │   ├── sync/syncManager.ts# Auto sync dengan NetInfo
│   │   ├── navigation/       # Stack Navigator
│   │   ├── screens/          # Login, Dashboard, TicketList, TicketCreate, TicketDetail, JobList, JobCreate, JobDetail, PendingJobs
│   │   ├── api.ts            # Axios dengan SecureStore JWT
│   │   ├── socket.ts         # Socket.IO mobile client
│   │   ├── types/index.ts
│   │   └── App.tsx
│   ├── app.json              # Konfigurasi Expo
│   ├── babel.config.js
│   └── package.json
│
├── desktop/                  # Aplikasi Desktop Electron
│   ├── main.js               # Electron main process
│   └── package.json          # Builder configuration (.exe NSIS)
│
└── README.md                 # Dokumentasi umum proyek
```

---

## 🚀 Panduan Menjalankan Semua Komponen

### 1. Inisialisasi Database MariaDB
Pastikan server database di `172.16.5.254` telah aktif, lalu import skema awal:
```bash
# Melalui terminal dengan client MySQL
mysql -h 172.16.5.254 -u root -p < backend/migrations/init_schema.sql
```

### 2. Menjalankan Backend API
```bash
cd backend
npm install

# Jalankan seeder akun default
npm run seed

# Jalankan server API (port 4000)
npm run dev
```

### 3. Menjalankan Web Dashboard
```bash
cd web
npm install

# Jalankan development server (port 3000)
npm run dev
```
Buka browser di `http://localhost:3000`.

### 4. Menjalankan Aplikasi Mobile
```bash
cd mobile
npm install

# Jalankan Expo server
npx expo start
```
- Gunakan aplikasi **Expo Go** pada HP Android/iOS untuk scan QR code.
- Pastikan HP berada di jaringan WiFi yang sama dengan server `172.16.5.254`.

### 5. Menjalankan Aplikasi Desktop (Electron)
```bash
# Opsi 1: Build Web terlebih dahulu
cd web
npm run build

# Opsi 2: Jalankan Electron
cd ../desktop
npm install
npm start

# Untuk membuat installer Windows (.exe):
npm run build:win
```

---

## 🔑 Kredensial Akun Default
- **Username**: `admin`
- **Password**: `admin123`

*(Anda juga dapat mendaftarkan akun baru langsung melalui menu "Daftar Akun" pada halaman login di Web maupun Mobile).*
