# TAURUS - IT Support System Backend

Backend REST API & Real-time WebSocket Server untuk aplikasi IT Support **TAURUS**, dibangun menggunakan Node.js, Express, TypeScript, TypeORM, MariaDB, Socket.IO, JWT, dan bcryptjs.

## Fitur Utama
- **Autentikasi**: Login & Registrasi berbasis JWT dan enkripsi bcrypt (username & password).
- **Manajemen Tiket**: CRUD tiket, penugasan staff (assignee), status tiket (Open, InProgress, Resolved, Closed), prioritas (Low, Medium, High, Critical), SLA datetime, dan attachment lampiran file.
- **Komentar Tiket**: Fitur diskusi/log komentar per tiket.
- **Manajemen Job (Log Pekerjaan)**: Pencatatan pekerjaan teknisi IT dengan kategori, detail masalah, tindakan yang diambil, status (Pending/Completed), tanggal kerja, hari kerja (dihitung otomatis), jam mulai, dan jam selesai.
- **Otomatisasi Status**: Saat job diselesaikan (`Completed`), tiket terkait otomatis berstatus `Closed`.
- **Upload File**: Endpoint upload lampiran file (`/api/upload`) menggunakan Multer yang disimpan ke folder `./uploads/` dan disajikan secara statis.
- **Real-Time Notification**: Socket.IO memancarkan event `ticketCreated`, `ticketUpdated`, `jobCreated`, `jobUpdated`, `commentAdded`, dan `notification` secara langsung ke web dan aplikasi mobile.

## Konfigurasi Lingkungan (`.env`)
Pastikan file `.env` berada di root folder `backend/`:
```env
PORT=4000
DB_HOST=172.16.5.254
DB_PORT=3306
DB_USER=root
DB_PASSWORD=4dm1nlm4
DB_NAME=taurus
JWT_SECRET=taurus2024secret
```

## Persiapan Database
1. Pastikan server MariaDB di `172.16.5.254:3306` aktif.
2. Jalankan skrip inisialisasi tabel SQL:
```bash
mysql -h 172.16.5.254 -u root -p4dm1nlm4 < migrations/init_schema.sql
```

## Instalasi Dependensi & Menjalankan Server
```bash
# Masuk ke direktori backend
cd backend

# Install package dependensi
npm install

# Jalankan seeder akun default (admin / admin123)
npm run seed

# Jalankan server dalam mode development (live reload)
npm run dev

# Untuk build production
npm run build
npm start
```

## Akun Default
- **Username**: `admin`
- **Password**: `admin123`
