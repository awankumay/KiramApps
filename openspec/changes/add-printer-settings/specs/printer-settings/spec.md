## ADDED Requirements

### Requirement: Printer Detection

The system SHALL automatically detect and list all printers installed on the Windows system when the Printer Settings form is opened.

#### Scenario: List all installed printers

- **WHEN** user opens the Printer Settings form
- **THEN** system retrieves list of all printers installed on Windows using Electron's `webContents.getPrinters()` API
- **AND** system displays each printer with name, description (if available), and status (if available)
- **AND** system marks the default printer with a visual indicator

#### Scenario: Handle printer detection error

- **WHEN** printer detection fails or API is unavailable
- **THEN** system displays error message "Gagal mendeteksi printer"
- **AND** system logs the error for debugging

### Requirement: Printer Selection

The system SHALL allow users to select a target printer from the detected printer list.

#### Scenario: Select printer from dropdown

- **WHEN** user selects a printer from the dropdown menu
- **THEN** system updates the selected printer in the configuration
- **AND** system saves the configuration automatically
- **AND** system displays success toast "Printer tersimpan"

#### Scenario: Validate printer selection

- **WHEN** user attempts to select a printer that is not in the detected list
- **THEN** system rejects the selection
- **AND** system displays validation error "Printer tidak valid"

### Requirement: PDF Mode Toggle

The system SHALL provide a toggle to enable "Print to PDF" mode for testing purposes.

#### Scenario: Enable PDF mode

- **WHEN** user checks the "Gunakan Print ke PDF (untuk uji coba)" checkbox
- **THEN** system disables the printer dropdown
- **AND** system saves the PDF mode preference
- **AND** system displays success toast "Mode PDF diaktifkan"

#### Scenario: Disable PDF mode

- **WHEN** user unchecks the PDF mode checkbox
- **THEN** system enables the printer dropdown
- **AND** system restores the previously selected printer
- **AND** system displays success toast "Mode printer diaktifkan"

#### Scenario: PDF mode disables printer selection

- **WHEN** PDF mode is enabled
- **THEN** printer dropdown is disabled
- **AND** user cannot select a printer until PDF mode is disabled

### Requirement: Persistent Configuration Storage

The system SHALL persist printer configuration across application restarts.

#### Scenario: Save printer configuration

- **WHEN** user selects a printer or toggles PDF mode
- **THEN** system saves the configuration to local storage (electron-store or JSON file)
- **AND** configuration includes: printer name, PDF mode flag, and last updated timestamp

#### Scenario: Load printer configuration on startup

- **WHEN** user opens the Printer Settings form
- **THEN** system loads the saved configuration
- **AND** system pre-fills the form with the saved printer selection and PDF mode state
- **AND** system displays the current configuration to the user

#### Scenario: Handle missing configuration

- **WHEN** no saved configuration exists
- **THEN** system displays the form with default state (no printer selected, PDF mode disabled)
- **AND** user can select a printer or enable PDF mode

### Requirement: Print Test

The system SHALL provide a "Cetak Uji Coba" button to validate printer configuration.

#### Scenario: Print test to physical printer

- **WHEN** user clicks "Cetak Uji Coba" button with a physical printer selected
- **THEN** system sends a minimal test receipt to the selected printer
- **AND** system displays success toast "Test print berhasil" if print succeeds
- **AND** system displays error toast "Printer tidak merespons" if print fails

#### Scenario: Print test to PDF

- **WHEN** user clicks "Cetak Uji Coba" button with PDF mode enabled
- **THEN** system generates a PDF file named `print-test-{YYYYMMDD-HHMMSS}.pdf`
- **AND** system saves the PDF to the Downloads folder
- **AND** system displays success toast "PDF tersimpan di Downloads"

#### Scenario: Print test without configuration

- **WHEN** user clicks "Cetak Uji Coba" button without selecting a printer or enabling PDF mode
- **THEN** system displays error toast "Pilih printer atau aktifkan mode PDF terlebih dahulu"

#### Scenario: Print test with offline printer

- **WHEN** user clicks "Cetak Uji Coba" button and the selected printer is offline
- **THEN** system displays error toast "Printer tidak tersedia atau offline"

### Requirement: User Feedback and Notifications

The system SHALL provide clear feedback for all user actions and system states.

#### Scenario: Display success notification

- **WHEN** user successfully saves printer configuration
- **THEN** system displays a non-blocking toast notification with success message
- **AND** toast disappears automatically after 3 seconds

#### Scenario: Display error notification

- **WHEN** an error occurs during printer detection, configuration save, or print test
- **THEN** system displays a non-blocking toast notification with error message
- **AND** toast includes details about the error
- **AND** toast disappears automatically after 5 seconds

#### Scenario: Display loading state

- **WHEN** system is detecting printers or performing print test
- **THEN** system displays a loading indicator
- **AND** user cannot interact with the form during loading

### Requirement: Printer Settings UI

The system SHALL provide a Printer Settings form accessible from the Settings menu.

#### Scenario: Access Printer Settings

- **WHEN** user navigates to Settings > Printer
- **THEN** system displays the Printer Settings form
- **AND** form includes: printer dropdown, PDF mode checkbox, and test print button
- **AND** form is styled consistently with the rest of the application using shadcn-ui components

#### Scenario: Form layout

- **WHEN** Printer Settings form is displayed
- **THEN** form shows printer dropdown at the top
- **AND** form shows PDF mode checkbox below the dropdown
- **AND** form shows "Cetak Uji Coba" button at the bottom
- **AND** form uses appropriate spacing and labels for accessibility

### Requirement: Printer Status Display

The system SHALL display printer status information when available from the OS.

#### Scenario: Display printer status

- **WHEN** printer status is available from the OS
- **THEN** system displays status indicator next to printer name
- **AND** status indicators include: "idle", "offline", "printing", etc.
- **AND** system uses color coding (green for online, red for offline)

#### Scenario: Handle missing printer status

- **WHEN** printer status is not available from the OS
- **THEN** system displays printer name without status indicator
- **AND** form remains functional without status information
