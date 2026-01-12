# Implementation Tasks

## 1. Project Setup and Dependencies

- [x] 1.1 Install electron-store package (`npm install electron-store`)
- [x] 1.2 Install @types/electron-store for TypeScript support
- [x] 1.3 Verify installation in package.json

## 2. TypeScript Type Definitions

- [x] 2.1 Create PrinterConfig interface in src/Shared/Types/Printer.ts
- [x] 2.2 Create Printer interface in src/Shared/Types/Printer.ts
- [x] 2.3 Add PrinterConfig type to Electron.d.ts preload types
- [x] 2.4 Create validation schema using Zod for PrinterConfig

## 3. Electron Main Process - IPC Handlers

- [x] 3.1 Initialize electron-store in electron/main.ts
- [x] 3.2 Implement `get-printers` IPC handler using webContents.getPrinters()
- [x] 3.3 Implement `get-printer-config` IPC handler to read from store
- [x] 3.4 Implement `save-printer-config` IPC handler to write to store
- [x] 3.5 Implement `print-test` IPC handler for physical printer
- [x] 3.6 Implement `print-test` IPC handler for PDF mode
- [x] 3.7 Add error handling and validation in all IPC handlers
- [x] 3.8 Add logging for debugging printer operations

## 4. Electron Preload - Context Bridge

- [x] 4.1 Add printer IPC channels to electron/preload.ts contextBridge
- [x] 4.2 Expose `getPrinters()` function to renderer
- [x] 4.3 Expose `getPrinterConfig()` function to renderer
- [x] 4.4 Expose `savePrinterConfig()` function to renderer
- [x] 4.5 Expose `printTest()` function to renderer
- [x] 4.6 Add TypeScript types for exposed functions

## 5. Printer Settings UI - Component Structure

- [x] 5.1 Create src/Features/Settings/PrinterSettings directory
- [x] 5.2 Create PrinterSettingsPage.tsx as main component
- [x] 5.3 Create PrinterSettingsForm.tsx for form logic
- [x] 5.4 Create PrinterSelect component using shadcn-ui Select
- [x] 5.5 Create PDFModeToggle component using shadcn-ui Checkbox
- [x] 5.6 Create PrintTestButton component using shadcn-ui Button
- [x] 5.7 Add Card wrapper using shadcn-ui Card

## 6. Printer Settings UI - Functionality

- [x] 6.1 Implement printer detection on component mount
- [x] 6.2 Implement printer dropdown with detected printers
- [x] 6.3 Implement printer selection with auto-save
- [x] 6.4 Implement PDF mode toggle with auto-save
- [x] 6.5 Implement disable dropdown when PDF mode is enabled
- [x] 6.6 Implement load saved configuration on mount
- [x] 6.7 Implement print test button handler
- [x] 6.8 Add loading states for async operations
- [x] 6.9 Add form validation (printer must be in detected list)
- [x] 6.10 Add error handling for all operations

## 7. Printer Settings UI - Styling and UX

- [x] 7.1 Style form with Tailwind CSS classes
- [x] 7.2 Add appropriate spacing and layout
- [x] 7.3 Add printer status indicators (if available)
- [x] 7.4 Add default printer badge
- [x] 7.5 Add loading spinner during printer detection
- [x] 7.6 Add disabled states for dropdown when PDF mode is active
- [x] 7.7 Add hover effects and focus states for accessibility
- [x] 7.8 Ensure responsive design for different screen sizes

## 8. Notifications and Feedback

- [x] 8.1 Integrate Sonner toast for notifications
- [x] 8.2 Add success toast for configuration save
- [x] 8.3 Add success toast for print test success
- [x] 8.4 Add error toast for printer detection failure
- [x] 8.5 Add error toast for configuration save failure
- [x] 8.6 Add error toast for print test failure
- [x] 8.7 Add error toast for offline printer
- [x] 8.8 Add error toast for missing configuration
- [x] 8.9 Set appropriate toast durations (3s for success, 5s for error)

## 9. Navigation and Routing

- [x] 9.1 Add Printer Settings route to navigation configuration
- [x] 9.2 Add Printer Settings menu item to sidebar
- [x] 9.3 Add permission guards if needed (all roles should access)
- [x] 9.4 Test navigation to Printer Settings page

## 10. Print Test Implementation

- [x] 10.1 Create test receipt HTML template
- [x] 10.2 Implement print to physical printer using webContents.print()
- [x] 10.3 Implement print to PDF using webContents.print() with printToPDF option
- [x] 10.4 Generate unique filename for PDF test files
- [x] 10.5 Save PDF to Downloads folder
- [x] 10.6 Add error handling for print failures
- [x] 10.7 Add validation for printer availability before print

## 11. Configuration Storage

- [x] 11.1 Initialize electron-store with schema for printerConfig
- [x] 11.2 Implement default config (empty printer name, PDF mode disabled)
- [x] 11.3 Implement config validation on load
- [x] 11.4 Implement config validation on save
- [x] 11.5 Add timestamp tracking for last updated
- [x] 11.6 Test config persistence across app restarts

## 12. Testing - Printer Detection

- [ ] 12.1 Test printer detection with multiple printers installed
- [ ] 12.2 Test printer detection with single printer
- [ ] 12.3 Test printer detection with no printers
- [ ] 12.4 Test printer detection error handling
- [ ] 12.5 Verify printer list matches Windows Printers & Scanners

## 13. Testing - Configuration

- [ ] 13.1 Test printer selection and auto-save
- [ ] 13.2 Test PDF mode toggle and auto-save
- [ ] 13.3 Test configuration persistence after app restart
- [ ] 13.4 Test configuration load on form mount
- [ ] 13.5 Test default configuration (no saved config)
- [ ] 13.6 Test validation for invalid printer selection

## 14. Testing - Print Test

- [ ] 14.1 Test print to physical printer
- [ ] 14.2 Test print to PDF mode
- [ ] 14.3 Test print test without configuration
- [ ] 14.4 Test print test with offline printer
- [ ] 14.5 Verify PDF file is created in Downloads folder
- [ ] 14.6 Verify PDF filename format is correct
- [ ] 14.7 Verify test receipt content is correct

## 15. Testing - UI and UX

- [ ] 15.1 Test form layout and styling
- [ ] 15.2 Test dropdown functionality
- [ ] 15.3 Test checkbox functionality
- [ ] 15.4 Test button interactions
- [ ] 15.5 Test loading states
- [ ] 15.6 Test disabled states
- [ ] 15.7 Test toast notifications
- [ ] 15.8 Test responsive design
- [ ] 15.9 Test accessibility (keyboard navigation, screen reader)

## 16. Testing - Error Scenarios

- [ ] 16.1 Test printer detection failure
- [ ] 16.2 Test configuration save failure
- [ ] 16.3 Test print test failure
- [ ] 16.4 Test offline printer scenario
- [ ] 16.5 Test corrupted config file
- [ ] 16.6 Test network-independent operation (offline)

## 17. Documentation

- [ ] 17.1 Update user guide with Printer Settings instructions
- [ ] 17.2 Add code comments for complex logic
- [ ] 17.3 Document IPC handler signatures
- [ ] 17.4 Document configuration schema
- [ ] 17.5 Add troubleshooting guide for common printer issues

## 18. Code Quality

- [x] 18.1 Run ESLint and fix all linting issues
- [x] 18.2 Ensure TypeScript strict mode compliance
- [x] 18.3 Add error boundaries for React components
- [x] 18.4 Add proper error logging
- [x] 18.5 Review code for consistency with project conventions
- [x] 18.6 Remove any console.log statements (use proper logging)

- [ ] 19.1 Test complete workflow: detect → select → save → test print
- [ ] 19.2 Test workflow with PDF mode: enable → test → verify PDF
- [ ] 19.3 Test workflow switching between printer and PDF mode
- [ ] 19.4 Test with different printer types (thermal, inkjet, laser)
- [ ] 19.5 Test on Windows 10 and Windows 11 (if possible)

## 20. Final Verification

- [ ] 20.1 Verify all requirements from spec.md are implemented
- [ ] 20.2 Verify all tasks.md items are completed
- [ ] 20.3 Run openspec validate add-printer-settings --strict
- [ ] 20.4 Fix any validation issues
- [ ] 20.5 Prepare for code review
