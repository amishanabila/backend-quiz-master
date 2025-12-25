# Setup Email untuk Reset Password

## ⚠️ PENTING: Setup Email di Railway

Untuk fitur reset password berfungsi, Anda **HARUS** menambahkan App Password Gmail di Railway environment variables.

### Langkah-langkah Setup:

### 1. Generate Gmail App Password

1. Buka [Google Account Security](https://myaccount.google.com/security)
2. Aktifkan **2-Step Verification** jika belum aktif
3. Setelah 2FA aktif, kembali ke halaman Security
4. Cari **"App passwords"** atau **"Sandi aplikasi"**
5. Klik **"App passwords"**
6. Pilih aplikasi: **"Mail"** 
7. Pilih perangkat: **"Other (Custom name)"** → ketik: **"Quiz Master Backend"**
8. Klik **"Generate"**
9. Copy password 16 digit yang muncul (contoh: `abcd efgh ijkl mnop`)
10. **PENTING:** Simpan password ini, tidak akan ditampilkan lagi!

### 2. Setup di Railway

1. Login ke [Railway Dashboard](https://railway.app/)
2. Pilih project: **backend-quiz-master-production**
3. Klik tab **"Variables"**
4. Tambahkan environment variables berikut:

```
EMAIL_USER=ipplquizmaster@gmail.com
EMAIL_PASSWORD=your-16-digit-app-password-here
JWT_SECRET=7f8a9b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2
FRONTEND_URL=https://ippl-quiz-master.vercel.app
CORS_ORIGIN=https://ippl-quiz-master.vercel.app
NODE_ENV=production
PORT=5000
```

5. Ganti `your-16-digit-app-password-here` dengan App Password yang Anda generate di step 1
6. Klik **"Save"** atau Railway akan auto-save
7. Railway akan **otomatis restart** service Anda dengan konfigurasi baru

### 3. Verifikasi

Setelah Railway restart (sekitar 1-2 menit):

1. Test reset password di: https://ippl-quiz-master.vercel.app/lupa-password
2. Masukkan email yang terdaftar
3. Periksa inbox email untuk link reset password
4. Link akan mengarah ke: https://ippl-quiz-master.vercel.app/password-baru?token=...

## Troubleshooting

### Email tidak terkirim?

1. **Cek Railway logs:**
   ```
   - Buka Railway Dashboard → Your Service → "Deployments"
   - Klik deployment terakhir → "View Logs"
   - Cari log dengan emoji: 📧 atau ❌
   ```

2. **Cek error messages:**
   - `❌ Not set` → Environment variable tidak ada di Railway
   - `Invalid login` → App Password salah
   - `Timeout` → Cek koneksi Railway ke Gmail

3. **Solusi umum:**
   - Pastikan EMAIL_PASSWORD menggunakan **App Password**, bukan password Gmail biasa
   - Pastikan tidak ada spasi di App Password
   - Pastikan 2FA sudah aktif di akun Gmail
   - Coba generate App Password baru jika masih error

### Testing Lokal

Jika ingin test di local development:

1. Copy `.env.local.example` ke `.env.local`
2. Isi dengan nilai yang sama seperti di Railway
3. Jalankan: `npm start`
4. Test di: http://localhost:5000

## Status Deployment

- ✅ Backend: Pushed to GitHub → Auto-deploy to Railway
- ✅ Frontend: Pushed to GitHub → Auto-deploy to Vercel
- ⚠️ **ACTION REQUIRED:** Setup EMAIL_PASSWORD di Railway (lihat instruksi di atas)

## Fitur yang Diperbaiki

1. ✅ **Error Handling**: Logging detail untuk debugging
2. ✅ **Timeout Protection**: Request tidak akan stuck selamanya (30 detik timeout)
3. ✅ **Email Validation**: Validasi format email di frontend
4. ✅ **Better Error Messages**: Pesan error yang lebih jelas dan informatif
5. ✅ **Network Error Detection**: Deteksi masalah koneksi internet
6. ✅ **Configuration Validation**: Backend akan cek apakah EMAIL_USER dan EMAIL_PASSWORD sudah diset

---

**Last Updated:** December 25, 2025
