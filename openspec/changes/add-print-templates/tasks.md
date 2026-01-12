# Implementation Tasks: Print Templates System

## Phase 1: Core Template System

### 1. TypeScript Type Definitions

- [x] 1.1 Create `src/Shared/Types/PrintTemplate.ts` with template interfaces
- [x] 1.2 Define `ReceiptData` interface
- [x] 1.3 Define `SuratKirimData` interface
- [x] 1.4 Define `Template` base interface
- [x] 1.5 Define `TemplateData` generic type
- [x] 1.6 Add template types to Electron.d.ts

### 2. Template Manager

- [x] 2.1 Create `electron/templates/` directory
- [x] 2.2 Create `electron/templates/TemplateManager.ts`
- [x] 2.3 Implement template registration system
- [x] 2.4 Implement template retrieval methods
- [x] 2.5 Implement HTML generation from template
- [x] 2.6 Add error handling for missing templates
- [x] 2.7 Add logging for debugging

### 3. Receipt Template

- [x] 3.1 Create `electron/templates/receipt-template.ts`
- [x] 3.2 Implement HTML structure for receipt
- [x] 3.3 Add CSS styling for 80mm thermal printer
- [x] 3.4 Implement header section (store info)
- [x] 3.5 Implement transaction info section
- [x] 3.6 Implement customer info section
- [x] 3.7 Implement items table with dynamic rows
- [x] 3.8 Implement payment summary section
- [x] 3.9 Implement footer section
- [x] 3.10 Add number formatting (currency)
- [x] 3.11 Test with sample data

### 4. Surat Kirim Template

- [x] 4.1 Create `electron/templates/surat-kirim-template.ts`
- [x] 4.2 Implement HTML structure for A5 Landscape layout (210mm x 148mm)
- [x] 4.3 Add CSS styling for A5 Landscape paper (@page { size: A5 landscape; margin: 0; })
- [x] 4.4 Implement header section (CV. KIRAMANA SURAT KIRIM)
- [x] 4.5 Implement truck and destination info
- [x] 4.6 Implement table structure (NO, JENIS MATERIAL, JUMLAH, KETERANGAN)
- [x] 4.7 Implement dynamic table rows (minimum 3 rows)
- [x] 4.8 Implement date section
- [x] 4.9 Implement signature section (Sopir & Pengawas)
- [x] 4.10 Add proper page breaks for printing
- [x] 4.11 Test with sample data (Browser: Paper Size = A5 Landscape, Margin = None)

### 5. Template Export/Index

- [x] 5.1 Create `electron/templates/index.ts` to export all templates
- [x] 5.2 Register default templates in TemplateManager
- [x] 5.3 Add template metadata (name, description, paper size)

## Phase 2: Integration dengan PrinterManager

### 6. Update PrinterManager

- [x] 6.1 Import TemplateManager in PrinterManager
- [x] 6.2 Initialize TemplateManager in constructor
- [x] 6.3 Add `print(templateId, data, config)` method
- [x] 6.4 Add `printReceipt(receiptData, config)` convenience method
- [x] 6.5 Add `printSuratKirim(suratKirimData, config)` convenience method
- [x] 6.6 Update test print to use new template system
- [x] 6.7 Add validation for template data
- [x] 6.8 Update error handling

### 7. IPC Handlers

- [x] 7.1 Add `printer:printReceipt` IPC handler
- [x] 7.2 Add `printer:printSuratKirim` IPC handler
- [x] 7.3 Add `printer:previewTemplate` IPC handler
- [x] 7.4 Add `printer:getTemplates` IPC handler
- [x] 7.5 Update Electron preload.ts with new API methods
- [x] 7.6 Add proper TypeScript types for IPC

### 8. Frontend API Types

- [x] 8.1 Update `src/Shared/Types/Electron.d.ts` with template methods
- [x] 8.2 Add ReceiptData type export
- [x] 8.3 Add SuratKirimData type export

## Phase 3: UI Components

### 9. Template Preview Component

- [x] 9.1 Create `src/Shared/Components/TemplatePreviewer.tsx`
- [x] 9.2 Implement HTML preview in iframe
- [x] 9.3 Add zoom controls
- [x] 9.4 Add print button from preview
- [x] 9.5 Add close/cancel button
- [x] 9.6 Style with Tailwind CSS

### 10. Template Selector Component

- [x] 10.1 Create `src/Shared/Components/TemplateSelector.tsx`
- [x] 10.2 Implement dropdown untuk pilih template
- [x] 10.3 Show template metadata (size, description)
- [x] 10.4 Add preview button per template
- [x] 10.5 Integrate with shadcn Select component

## Phase 4: Feature Integration

### 11. Transaction Receipt Integration

- [x] 11.1 Add "Print Receipt" button to Transaction Detail page
- [x] 11.2 Map transaction data to ReceiptData format
- [x] 11.3 Call `window.api.printer.printReceipt()`
- [x] 11.4 Show preview before print (optional)
- [x] 11.5 Handle success/error with toast
- [ ] 11.6 Add print history/log (optional)
- [x] 11.7 Add auto-print receipt after creating transaction (direct print, no preview)
- [x] 11.8 Fix print button to handle ApiResponse wrapper properly
- [x] 11.9 Add disabled state to Print button when loading/error

### 12. Loader Surat Kirim Integration

- [x] 12.1 Add "Print Surat Kirim" button to Loader Assignment page
- [x] 12.2 Map loader data to SuratKirimData format
- [x] 12.3 Call `window.api.printer.printSuratKirim()`
- [x] 12.4 Show preview before print
- [x] 12.5 Handle success/error with toast
- [ ] 12.6 Save print timestamp to database

### 13. Update Printer Settings Page

- [x] 13.1 Update test print to show template selector
- [x] 13.2 Add "Test Receipt" button
- [x] 13.3 Add "Test Surat Kirim" button
- [x] 13.4 Show template preview in settings

## Phase 5: Testing

### 14. Unit Testing

- [x] 14.1 Test receipt template with various data
- [x] 14.2 Test surat kirim template with various data
- [x] 14.3 Test TemplateManager registration
- [x] 14.4 Test TemplateManager retrieval
- [x] 14.5 Test HTML generation
- [x] 14.6 Test error handling for invalid data

### 15. Integration Testing

- [ ] 15.1 Test print receipt from Transaction feature
- [ ] 15.2 Test print surat kirim from Loader feature
- [ ] 15.3 Test template preview functionality
- [ ] 15.4 Test print to PDF mode
- [ ] 15.5 Test print to physical printer (thermal 80mm)
- [ ] 15.6 Test print to physical printer (A5)

### 16. Manual Testing

- [ ] 16.1 Print receipt ke thermal printer dengan real data
- [ ] 16.2 Print surat kirim ke printer A5 dengan real data
- [ ] 16.3 Verify layout di thermal printer 80mm
- [ ] 16.4 Verify layout di A5 paper
- [ ] 16.5 Test dengan transaksi banyak item (pagination)
- [ ] 16.6 Test dengan nama item panjang (text wrapping)
- [ ] 16.7 Test dengan berbagai currency values

## Phase 6: Polish & Documentation

### 17. Code Quality

- [ ] 17.1 Run ESLint dan fix semua issues
- [ ] 17.2 Add proper JSDoc comments
- [ ] 17.3 Add error boundaries
- [ ] 17.4 Remove console.log, use proper logging
- [ ] 17.5 Ensure TypeScript strict mode compliance

### 18. Documentation

- [ ] 18.1 Document template structure dan format
- [ ] 18.2 Add comments untuk complex template logic
- [ ] 18.3 Document data mapping untuk setiap template
- [ ] 18.4 Add troubleshooting guide
- [ ] 18.5 Document cara menambah template baru

### 19. Performance Optimization

- [ ] 19.1 Profile template generation time
- [ ] 19.2 Optimize HTML size untuk faster print
- [ ] 19.3 Cache template instances
- [ ] 19.4 Optimize CSS untuk print media

## Phase 7: Final Verification

### 20. Acceptance Testing

- [ ] 20.1 Verify semua requirements dari proposal terpenuhi
- [ ] 20.2 Test complete workflow: transaction → print receipt
- [ ] 20.3 Test complete workflow: loader → print surat kirim
- [ ] 20.4 Verify template quality di real printer
- [ ] 20.5 Get user feedback on template layout
- [ ] 20.6 Make adjustments based on feedback

### 21. Deployment Preparation

- [ ] 21.1 Update CHANGELOG.md
- [ ] 21.2 Update version number
- [ ] 21.3 Create migration guide (jika perlu)
- [ ] 21.4 Prepare release notes
- [ ] 21.5 Tag release in git
