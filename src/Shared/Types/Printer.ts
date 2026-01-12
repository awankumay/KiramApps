/**
 * Printer Type Definitions
 * Types for printer configuration and management
 */

/**
 * Printer information from Electron API
 */
export interface Printer {
  /**
   * The name of the printer (e.g., "EPSON TM-T20II")
   */
  name: string;

  /**
   * The description of the printer
   */
  description?: string;

  /**
   * The status of the printer (e.g., "idle", "offline")
   */
  status?: number;

  /**
   * Whether this is the default printer
   */
  isDefault?: boolean;

  /**
   * Additional printer options
   */
  options?: {
    [key: string]: string;
  };
}

/**
 * Printer configuration stored in app settings
 */
export interface PrinterConfig {
  /**
   * Selected printer name (empty if none selected)
   */
  printerName: string;

  /**
   * Whether to use PDF mode instead of physical printer
   */
  usePdfMode: boolean;

  /**
   * Timestamp of last configuration update
   */
  lastUpdated?: number;
}

/**
 * Print test options
 */
export interface PrintTestOptions {
  /**
   * Printer configuration to use for test
   */
  config: PrinterConfig;
}

/**
 * Print test result
 */
export interface PrintTestResult {
  /**
   * Whether the test was successful
   */
  success: boolean;

  /**
   * Error message if test failed
   */
  error?: string;

  /**
   * Path to generated PDF file (if in PDF mode)
   */
  pdfPath?: string;
}
