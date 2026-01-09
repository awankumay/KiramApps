my-electron-app/
├── main/ ← BARU: Backend lokal (Node.js)
│ ├── index.ts # Entry point Electron
│ ├── ipc/ # Handler IPC per fitur
│ │ ├── auth.ipc.ts
│ │ ├── user.ipc.ts
│ │ └── ... # Sesuai fitur Anda
│ ├── services/ # OOP Managers (AuthManager, dll)
│ │ ├── AuthManager.ts
│ │ ├── UserManager.ts
│ │ └── ...
│ ├── database/
│ │ ├── connection.ts # Inisialisasi SQLite
│ │ └── migrations/ # Umzug migrations
│ ├── sync/ # Nanti: sinkronisasi ke ERP
│ └── utils/
│
├── src/ ← TETAP DIPERTAHANKAN (frontend React Anda)
│ ├── App/
│ ├── Features/
│ ├── Shared/
│ └── ... # Semua tetap seperti sekarang
│
├── public/ # Assets statis (favicon, dll)
├── preload.ts ← BARU: Bridge aman IPC
├── electron-builder.config.ts # Konfigurasi build .exe
├── package.json
└── tsconfig.node.json # Untuk main process (Node.js)
