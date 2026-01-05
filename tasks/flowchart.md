flowchart TD
%% ========== GATE IN ==========
A[Driver Check In di Gate Masuk]
A --> B[Capture CCTV Gate In]
B --> C[Generate Ticket QR Code]
C --> D[Ticket Status: CREATED]
D --> E[Save Ticket + Images ke SQLite]

    %% ========== CHECKER ==========
    E --> F[Driver Tunjukan QR ke Checker]
    F --> G[Checker Scan QR Ticket]
    G --> H[Load Ticket Data + CCTV Images]
    H --> I{Driver Jadi Order?}

    %% ========== NEGATIVE CASE ==========
    I -- Tidak --> J[Ticket Status: REJECTED]
    J --> K[Catat Alasan Reject]
    K --> L[Arahkan Driver ke Gate Checkout]

    L --> M[Scan QR di Gate Keluar]
    M --> N{Status REJECTED?}
    N -- Ya --> O[Gate Terbuka]
    O --> P[Ticket Status: DONE - REJECTED]
    N -- Tidak --> Q[Gate Ditolak]

    %% ========== POSITIVE CASE ==========
    I -- Ya --> R[Checker Buat Purchase Order]
    R --> S[Driver Validasi PO & Bayar Cash]
    S --> T{Payment Valid?}

    T -- Tidak --> S
    T -- Ya --> U[Print Invoice]
    U --> V[Ticket Status: PAID]

    %% ========== LOADER ==========
    V --> W[Ticket Status: ON PROGRESS LOADER]
    W --> X[Driver Masuk Area Loader]

    X --> Y[Notifikasi ke Operator Loader]
    Y --> Z[Operator Loader Validasi PO]

    Z --> ZA[Proses Muat Material]
    ZA --> ZB[Operator Set Status: LOADER DONE]

    ZB --> ZC[Ticket Status: READY TO CHECKOUT]

    %% ========== GATE OUT ==========
    ZC --> ZD[Driver Menuju Gate Keluar]
    ZD --> ZE[Scan QR di Gate Keluar]

    ZE --> ZF[Capture CCTV Gate Out]
    ZF --> ZG{PAID & LOADER DONE?}

    ZG -- Tidak --> ZH[Gate Ditolak]
    ZG -- Ya --> ZI[Gate Terbuka]

    ZI --> ZJ[Ticket Status: DONE]
    ZJ --> ZK[Order Selesai]
