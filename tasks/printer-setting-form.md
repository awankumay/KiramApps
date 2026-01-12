```markdown
# OpenSpec: Printer Settings Form for POS Application (ElectronJS + Windows)

## 1. Overview

Implement a complete **Printer Settings form** in the desktop POS application (ElectronJS + React) that allows users to:

- View all printers installed on their Windows machine.
- Select a target printer for receipt printing.
- Enable “Print to PDF” mode for development or fallback use.
- Save settings persistently.
- Trigger a print test to validate configuration.

This form is a foundational step before integrating printing into sales, payment, or receipt workflows.

## 2. Motivation

- Client environment is **Windows-based**, and printers are typically pre-installed via Windows Printers & Scanners.
- Users must be able to **choose which printer** to use for receipts without code changes.
- During early deployment or testing, physical printers may not be ready → **PDF fallback is essential**.
- Avoid runtime errors during live transactions by validating printer setup in advance.

## 3. Requirements

### 3.1 Functional

#### A. Printer Detection

- On opening the Printer Settings form, the app **automatically lists all printers installed on the Windows system**.
- Each printer entry must show:
  - `name` (e.g., "EPSON TM-T20II")
  - `description` (optional)
  - `status` (e.g., "offline", "idle") — if available

> ⚠️ Note: Use Electron’s `webContents.getPrinters()` API, which relies on OS-level printer enumeration (fully supported on Windows).

#### B. User Selection & Mode Toggle

- Dropdown menu to **select active printer** from detected list.
- Checkbox: **☑️ Gunakan Print ke PDF (untuk uji coba)**
  - When checked, disables printer dropdown and uses PDF output instead.
- Settings are **saved immediately** on change (no “Save” button required, or optional auto-save with confirmation toast).

#### C. Persistent Storage

- Selected printer name and PDF mode preference must persist across app restarts.
- Store in a local config file (e.g., `app-data/printer-config.json`) or via `electron-store`.

#### D. Print Test Button

- Button labeled **“Cetak Uji Coba”** below the form.
- On click:
  - If PDF mode → generate `print-test-{YYYYMMDD-HHMMSS}.pdf` in `Downloads` folder.
  - If printer selected → send minimal test receipt to that device.
- Show user feedback: success message or error (e.g., “Printer tidak merespons”).

### 3.2 Technical

- **Main Process**:

  - Expose IPC handler `get-printers` → returns array from `BrowserWindow.webContents.getPrinters()`.
  - Handle `print-test` IPC with selected config.
  - Manage config read/write via `electron-store` or `fs`.

- **Renderer (React)**:

  - Fetch printers on mount via `ipcRenderer.invoke('get-printers')`.
  - Render dropdown + checkbox + test button.
  - Send print command via `ipcRenderer.send('print-test', config)`.

- **No external libraries** for printer detection—rely on Electron + Windows native support.

### 3.3 UI/UX (Windows-Centric)

- Form location: **Settings > Printer** (in-app menu).
- Layout:
```

[Dropdown] Pilih Printer: ▼
• EPSON TM-T20II (Default)
• Microsoft Print to PDF
• HP LaserJet ...

[ ] Gunakan Print ke PDF (untuk uji coba)

[ Cetak Uji Coba ]

```
- Error/success messages shown via non-blocking toast (e.g., using `react-toastify` or simple alert).

## 4. Out of Scope
- Installing new printers from within the app.
- ESC/POS command customization (reserved for future receipt engine).
- Cloud/network printer discovery beyond what Windows already exposes.
- Multi-language printer names handling (assume UTF-8 compatible).

## 5. Verification Criteria
- [ ] Printer list matches Windows > Settings > Bluetooth & devices > Printers.
- [ ] Changing selection updates saved config.
- [ ] Toggling PDF mode disables printer dropdown.
- [ ] “Print Test” works in both modes (physical + PDF).
- [ ] Config persists after app restart.

## 6. Notes
- This feature assumes client runs **Windows 10/11** (standard for POS terminals).
- Thermal printers (e.g., EPSON, STAR) appear as standard printers in Windows → no special handling needed at this stage.
- Future phase: add paper size (e.g., 80mm) and encoding options once hardware is confirmed.
```

---
