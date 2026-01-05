# 📝 **Proposal Integrasi Desktop UI ke Backend DummyJSON (Auth & API)**

## 1. **Pendahuluan**

Seiring kebutuhan pengembangan aplikasi **Desktop UI**, diperlukan integrasi yang efisien serta aman dengan sistem backend. Dalam tahap awal, kita akan menggunakan **DummyJSON Auth API** sebagai backend dummy untuk proses autentikasi dan testing endpoint lain seperti GET Users, Refresh Token, dan sebagainya.

Referensi dokumentasi API:
🔗 [https://dummyjson.com/docs/auth](https://dummyjson.com/docs/auth)

---

## 2. **Tujuan Integrasi**

Tujuan utama integrasi ini adalah:

1. **Menguji end-to-end alur autentikasi** antara aplikasi Desktop dengan backend.
2. **Memvalidasi proses login**, penyimpanan token, serta penggunaan token secara aman.
3. **Membuat standar komunikasi API** sebelum backend final siap.
4. Menyediakan **fixtur dummy data yang bisa diakses tim frontend/UI**.

---

## 3. **Skop Pekerjaan**

Integrasi ini mencakup beberapa bagian utama:

### A. Autentikasi

- Login pengguna dengan username & password
- Tangkap `accessToken` dan `refreshToken`

  **Response contoh:**

  ```json
  {
    "accessToken": "xxxxx",
    "refreshToken": "xxxxx",
    "id": 1,
    "username": "emilys",
    "email": "emily.johnson@x.dummyjson.com"
  }
  ```

### B. Penggunaan Token

- Penyimpanan token di aplikasi Desktop
- Otomatis kirim Token di header Authorization
- Refresh token saat expired

---

## 4. **Flow Integrasi**

### 4.1 **Login**

| Step              | Keterangan                             |
| ----------------- | -------------------------------------- |
| User klik “Login” | UI kirim request ke API auth           |
| Server meresponse | Kirim `accessToken` & `refreshToken`   |
| UI simpan token   | Token disimpan di secure local storage |

**Request**

```
POST https://dummyjson.com/auth/login
```

### 4.2 **Validasi Token**

Setiap request _protected_ API akan membawa header:

```
Authorization: Bearer {{accessToken}}
```

Jika token expired → kirim request ke endpoint refresh:

```
POST https://dummyjson.com/auth/refresh
```

---

## 5. **Teknologi**

Integrasi akan menggunakan teknologi standar berikut:

| Komponen    | Teknologi        |
| ----------- | ---------------- |
| API         | JSON             |
| Transport   | HTTPS            |
| Protokol    | RESTful          |
| Autentikasi | JWT Bearer Token |

---

## 6. **Struktur API**

| Endpoint      | Method | Akses        |
| ------------- | ------ | ------------ |
| /auth/login   | POST   | Public       |
| /auth/me      | GET    | Bearer Token |
| /auth/refresh | POST   | Bearer Token |
| /users        | GET    | Optional     |

---

## 7. **Keamanan**

Karena backend bersifat dummy:

- Segala token **tidak dipakai untuk produksi**
- Hanya untuk **uji integrasi**
- Penggunaan token aman namun tidak terenkripsi

---

## 8. **Manfaat Integrasi**

1. Frontend/UI siap sebelum backend selesai
2. Tim QA bisa melakukan pengujian lengkap
3. Minimal risiko saat backend asli muncul
4. Sistem token otomatis bisa dipakai ulang

---

## 9. **Estimasi Waktu**

| Task                        | Estimasi |
| --------------------------- | -------- |
| Setup API Client di Desktop | 2 Hari   |
| Implement Auth Flow         | 3 Hari   |
| Uji Integrasi               | 1 Hari   |
| Dokumentasi                 | 1 Hari   |

Total estimasi: **7 hari kerja**

---

## 10. **Rencana Uji Coba**

### a. Test Case

| Test                | Expected                  |
| ------------------- | ------------------------- |
| Login valid         | 200 OK, token returned    |
| Login invalid       | 401 Unauthorized          |
| Token in header     | Access API berhasil       |
| Refresh token valid | Generate new access token |

---

## 11. **Penutup**

Dengan integrasi ini, diharapkan tim UI dapat bekerja secara paralel sambil menunggu backend produksi. DummyJSON Auth menjadi titik awal untuk proses autentikasi hingga penggunaan token dalam request API.

Proposal ini siap disetujui dan dilanjutkan ke tahap implementasi.

---

### 📍 Lampiran

Referensi API DummyJSON Auth
🔗 [https://dummyjson.com/docs/auth](https://dummyjson.com/docs/auth)

---
