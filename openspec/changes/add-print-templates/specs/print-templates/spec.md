# Print Templates System Specification

## ADDED Requirements

### Requirement: Template Manager Core

System MUST provide a TemplateManager class for managing print templates that can register, retrieve, and generate HTML from templates enabling centralized management of all print templates in the application

#### Scenario: Register and retrieve template

**Given** TemplateManager is initialized
**When** a template is registered with ID "receipt"
**Then** the template can be retrieved using the same ID
**And** the template metadata is available

#### Scenario: Generate HTML from template

**Given** a template is registered with ID "receipt"
**And** valid receipt data is provided
**When** generateHTML is called with template ID and data
**Then** HTML string is returned
**And** HTML contains all data fields formatted correctly

#### Scenario: Handle missing template

**Given** TemplateManager is initialized
**When** generateHTML is called with non-existent template ID
**Then** an error is thrown with descriptive message
**And** error includes list of available template IDs

---

### Requirement: Receipt Template

System MUST provide receipt template for transaction printing optimized for 80mm thermal printers with transaction details, customer info, items list, and payment summary formatted for Indonesian Rupiah

#### Scenario: Generate receipt with single item

**Given** transaction has 1 item
**And** customer and payment data is complete
**When** receipt template is generated
**Then** HTML contains store header
**And** HTML contains transaction info
**And** HTML contains 1 item row with correct calculations
**And** HTML contains payment summary
**And** HTML is formatted for 80mm width

#### Scenario: Generate receipt with multiple items

**Given** transaction has 5 items
**And** total price exceeds 1 million rupiah
**When** receipt template is generated
**Then** HTML contains all 5 items in order
**And** each item shows quantity, price, and subtotal
**And** total calculation is correct
**And** currency formatting uses thousand separators

#### Scenario: Generate receipt with long item name

**Given** transaction has item with name longer than 30 characters
**When** receipt template is generated
**Then** item name is properly wrapped
**And** layout remains within 80mm width
**And** text is readable

---

### Requirement: Surat Kirim Template

System MUST provide surat kirim (delivery note) template for A5 paper with company header, truck/destination info, materials table, and signature sections for Sopir and Pengawas

#### Scenario: Generate surat kirim with materials

**Given** delivery has truck "TRUCK-001" and destination "Jakarta"
**And** delivery has 3 material items
**When** surat kirim template is generated
**Then** HTML contains company header
**And** HTML contains truck and destination info
**And** HTML contains table with 3 material rows
**And** HTML contains date section
**And** HTML contains signature sections
**And** HTML is formatted for A5 paper

#### Scenario: Generate surat kirim with many items

**Given** delivery has 10 material items
**When** surat kirim template is generated
**Then** all 10 items are included in table
**And** table rows are properly numbered 1-10
**And** layout fits on single A5 page
**And** table remains readable

#### Scenario: Generate empty surat kirim template

**Given** delivery data has truck and destination
**And** no material items are added yet
**When** surat kirim template is generated
**Then** HTML contains empty table rows for manual fill
**And** table structure is complete
**And** signature sections are ready for signing

---

### Requirement: PrinterManager Template Integration

PrinterManager MUST integrate with template system to support template-based printing with print(), printReceipt(), and printSuratKirim() methods for both physical printer and PDF output

#### Scenario: Print receipt to thermal printer

**Given** receipt template is registered
**And** valid receipt data is provided
**And** thermal printer is configured
**When** printReceipt is called
**Then** HTML is generated from receipt template
**And** print job is sent to thermal printer
**And** success result is returned

#### Scenario: Print surat kirim to PDF

**Given** surat kirim template is registered
**And** valid delivery data is provided
**And** PDF mode is enabled
**When** printSuratKirim is called
**Then** HTML is generated from surat kirim template
**And** PDF file is created in Downloads folder
**And** PDF path is returned in result

#### Scenario: Print with invalid template ID

**Given** PrinterManager is initialized
**When** print is called with non-existent template ID
**Then** error is returned with clear message
**And** list of available templates is provided
**And** no print job is created

---

### Requirement: IPC API for Templates

Renderer process MUST be able to trigger template printing through IPC handlers for printReceipt, printSuratKirim, getTemplates, and previewTemplate operations with TypeScript-safe definitions

#### Scenario: Frontend prints receipt via IPC

**Given** user completes a transaction
**And** receipt data is prepared
**When** window.api.printer.printReceipt is called
**Then** IPC message is sent to main process
**And** receipt is printed using configured printer
**And** success/error response is returned to frontend

#### Scenario: Preview template before printing

**Given** user wants to preview surat kirim
**And** delivery data is prepared
**When** window.api.printer.previewTemplate is called
**Then** HTML is generated and returned
**And** no print job is created
**And** HTML can be displayed in iframe

---

### Requirement: Transaction Receipt Integration

Transaction detail page MUST provide print receipt functionality with button that maps transaction data to ReceiptData format and triggers printing using receipt template

- Receipt includes all items from transaction
- Receipt includes customer and vehicle info
- Receipt includes payment information
- Success/error is shown via toast notification
- Button shows loading state during print

#### Scenario: Print receipt from transaction detail

**Given** user views completed transaction
**And** transaction has customer, items, and payment data
**When** user clicks "Print Receipt" button
**Then** receipt data is prepared from transaction
**And** printReceipt is called with data
**And** success toast is shown
**And** receipt is printed to configured printer

#### Scenario: Print receipt for transaction without customer

**Given** transaction has no customer assigned
**When** user clicks "Print Receipt" button
**Then** receipt shows "Walk-in Customer" as default
**And** vehicle field shows "-"
**And** receipt prints successfully

---

### Requirement: Loader Surat Kirim Integration

Loader assignment page MUST provide print surat kirim functionality with button that maps loader data (truck, destination, materials) to SuratKirimData format with print timestamp recording

#### Scenario: Print surat kirim from loader assignment

**Given** user views loader assignment
**And** assignment has truck, destination, and items
**When** user clicks "Print Surat Kirim" button
**Then** surat kirim data is prepared from assignment
**And** printSuratKirim is called with data
**And** success toast is shown
**And** document is printed to configured printer
**And** print timestamp is recorded

#### Scenario: Print surat kirim preview

**Given** user wants to verify surat kirim layout
**When** user clicks "Preview" before printing
**Then** preview modal opens
**And** HTML is displayed in iframe
**And** user can zoom in/out
**And** user can print from preview

---

### Requirement: Template Testing

Printer Settings page MUST provide template testing functionality with Test Receipt and Test Surat Kirim buttons using realistic sample data respecting current printer configuration

#### Scenario: Test receipt template

**Given** user is on printer settings page
**And** printer is configured
**When** user clicks "Test Receipt" button
**Then** sample receipt data is generated
**And** receipt template is used for printing
**And** test receipt is printed to configured printer
**And** success message is shown

#### Scenario: Test surat kirim template

**Given** user is on printer settings page
**And** PDF mode is enabled
**When** user clicks "Test Surat Kirim" button
**Then** sample surat kirim data is generated
**And** surat kirim template is used
**And** PDF is created in Downloads folder
**And** PDF path is shown to user
