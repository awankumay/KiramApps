import { BrowserWindow, app } from "electron";
import Store from "electron-store";
import * as fs from "fs";
import * as path from "path";
import { createTemplateManager, TemplateManager } from "../templates";
import type {
  ReceiptData,
  SuratKirimData,
  PrintResult,
  TemplateType,
  TemplateData,
} from "../../src/Shared/Types/PrintTemplate";

/**
 * Printer information from Electron API
 */
export interface Printer {
  name: string;
  description?: string;
  status?: number;
  isDefault?: boolean;
  options?: {
    [key: string]: string;
  };
}

/**
 * Printer configuration stored in app settings
 */
export interface PrinterConfig {
  printerName: string;
  usePdfMode: boolean;
  lastUpdated?: number;
}

/**
 * Print test result
 */
export interface PrintTestResult {
  success: boolean;
  error?: string;
  pdfPath?: string;
}

/**
 * Store schema for electron-store
 */
interface StoreSchema {
  printerConfig: PrinterConfig;
}

/**
 * PrinterManager handles printer configuration and operations
 * Uses electron-store for persistent storage
 */
export class PrinterManager {
  private store: Store<StoreSchema>;
  private mainWindow: BrowserWindow | null;
  private templateManager: TemplateManager;

  constructor(mainWindow: BrowserWindow | null) {
    this.mainWindow = mainWindow;

    // Initialize electron-store with schema
    this.store = new Store<StoreSchema>({
      name: "printer-config",
      defaults: {
        printerConfig: {
          printerName: "",
          usePdfMode: false,
          lastUpdated: Date.now(),
        },
      },
    });

    // Initialize template manager
    this.templateManager = createTemplateManager();
    console.log("[PrinterManager] Initialized with templates");
  }

  /**
   * Get all printers installed on the system
   */
  async getPrinters(): Promise<Printer[]> {
    try {
      if (!this.mainWindow) {
        throw new Error("Main window not available");
      }

      // Use webContents.getPrintersAsync() which is available in Electron
      const printers = await this.mainWindow.webContents.getPrintersAsync();
      console.log("[PrinterManager] Detected printers:", printers);

      return printers.map((printer) => {
        const printerData = printer as unknown as {
          name: string;
          description: string;
          status?: number;
          isDefault?: boolean;
          options?: { [key: string]: string };
        };

        return {
          name: printerData.name,
          description: printerData.description,
          status: printerData.status,
          isDefault: printerData.isDefault,
          options: printerData.options,
        };
      });
    } catch (error) {
      console.error("[PrinterManager] Failed to get printers:", error);
      throw error;
    }
  }

  /**
   * Get current printer configuration
   */
  getPrinterConfig(): PrinterConfig {
    try {
      const config = this.store.get("printerConfig");
      console.log("[PrinterManager] Retrieved config:", config);
      return config;
    } catch (error) {
      console.error("[PrinterManager] Failed to get printer config:", error);
      // Return default config on error
      return {
        printerName: "",
        usePdfMode: false,
        lastUpdated: Date.now(),
      };
    }
  }

  /**
   * Save printer configuration
   */
  savePrinterConfig(config: PrinterConfig): boolean {
    try {
      // Validate config
      if (typeof config.printerName !== "string") {
        throw new Error("Invalid printerName");
      }
      if (typeof config.usePdfMode !== "boolean") {
        throw new Error("Invalid usePdfMode");
      }

      // Add timestamp
      const configWithTimestamp: PrinterConfig = {
        ...config,
        lastUpdated: Date.now(),
      };

      this.store.set("printerConfig", configWithTimestamp);
      console.log("[PrinterManager] Saved config:", configWithTimestamp);
      return true;
    } catch (error) {
      console.error("[PrinterManager] Failed to save printer config:", error);
      throw error;
    }
  }

  /**
   * Print test receipt
   */
  async printTest(
    config: PrinterConfig,
    userName?: string
  ): Promise<PrintTestResult> {
    try {
      if (!this.mainWindow) {
        throw new Error("Main window not available");
      }

      // Validate config
      if (!config.usePdfMode && !config.printerName) {
        return {
          success: false,
          error:
            "No printer selected. Please select a printer or enable PDF mode.",
        };
      }

      // Generate test receipt HTML
      const testReceiptHtml = this.generateTestReceiptHtml(userName);

      // Create a hidden BrowserWindow for printing
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: true,
        },
      });

      await printWindow.loadURL(
        `data:text/html,${encodeURIComponent(testReceiptHtml)}`
      );

      if (config.usePdfMode) {
        // Print to PDF
        return await this.printToPdf(printWindow);
      } else {
        // Print to physical printer
        return await this.printToPhysicalPrinter(
          printWindow,
          config.printerName
        );
      }
    } catch (error) {
      console.error("[PrinterManager] Print test failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Print to PDF file
   */
  private async printToPdf(
    printWindow: BrowserWindow,
    pageSize: "A4" | "A5" | "Letter" | "Legal" = "A4",
    landscape: boolean = false
  ): Promise<PrintTestResult> {
    try {
      // Generate unique filename
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .split("T")
        .join("-")
        .split("-")
        .slice(0, 6)
        .join("");
      const filename = `print-test-${timestamp}.pdf`;

      // Get downloads folder
      const downloadsPath = app.getPath("downloads");
      const pdfPath = path.join(downloadsPath, filename);

      // Print to PDF with dynamic page size and orientation
      const data = await printWindow.webContents.printToPDF({
        pageSize: pageSize,
        landscape: landscape,
        printBackground: true,
        margins: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      });

      // Save PDF file
      fs.writeFileSync(pdfPath, data);

      // Close print window
      printWindow.close();

      console.log(
        `[PrinterManager] PDF saved to: ${pdfPath} (size: ${pageSize}, orientation: ${
          landscape ? "landscape" : "portrait"
        })`
      );

      return {
        success: true,
        pdfPath: pdfPath,
      };
    } catch (error) {
      printWindow.close();
      console.error("[PrinterManager] Failed to print to PDF:", error);
      throw error;
    }
  }

  /**
   * Print to physical printer
   */
  private async printToPhysicalPrinter(
    printWindow: BrowserWindow,
    printerName: string,
    pageSize?: "A4" | "A5" | "Letter" | "Legal",
    landscape: boolean = false
  ): Promise<PrintTestResult> {
    try {
      // Check if printer exists
      const printers = this.mainWindow
        ? await this.mainWindow.webContents.getPrintersAsync()
        : [];
      const printer = printers.find((p) => p.name === printerName);

      if (!printer) {
        printWindow.close();
        return {
          success: false,
          error: `Printer "${printerName}" not found. Please check printer installation.`,
        };
      }

      // Build print options with dynamic page size and orientation
      const printOptions: {
        silent: boolean;
        deviceName: string;
        printBackground: boolean;
        margins: {
          marginType: "none" | "default" | "printableArea" | "custom";
        };
        pageSize?: "A4" | "A5" | "Letter" | "Legal";
        landscape?: boolean;
      } = {
        silent: true,
        deviceName: printerName,
        printBackground: true,
        margins: {
          marginType: "none",
        },
      };

      // Add page size if specified
      if (pageSize) {
        printOptions.pageSize = pageSize;
      }

      // Add orientation if specified
      if (landscape) {
        printOptions.landscape = true;
        console.log(
          `[PrinterManager] Printing with page size: ${pageSize}, orientation: landscape`
        );
      } else if (pageSize) {
        console.log(
          `[PrinterManager] Printing with page size: ${pageSize}, orientation: portrait`
        );
      }

      // Print silently (no print dialog)
      const printResult = await new Promise<{
        success: boolean;
        error?: string;
      }>((resolve) => {
        printWindow.webContents.print(
          printOptions,
          (success, failureReason) => {
            printWindow.close();

            if (!success) {
              console.error("[PrinterManager] Print failed:", failureReason);
              resolve({
                success: false,
                error: failureReason || "Print failed",
              });
            } else {
              console.log("[PrinterManager] Print successful");
              resolve({ success: true });
            }
          }
        );
      });

      return printResult;
    } catch (error) {
      printWindow.close();
      console.error(
        "[PrinterManager] Failed to print to physical printer:",
        error
      );
      throw error;
    }
  }

  /**
   * Parse paper size string to extract size and orientation
   * Supports formats: "A5", "A5 landscape", "A5 portrait"
   */
  private parsePaperSize(paperSize?: string): {
    size: "A4" | "A5" | "Letter" | "Legal";
    landscape: boolean;
  } {
    // Default to A4 portrait if not specified
    if (!paperSize) {
      return { size: "A4", landscape: false };
    }

    // Parse size and orientation
    const parts = paperSize.toLowerCase().split(" ").filter(Boolean);
    let size: "A4" | "A5" | "Letter" | "Legal" = "A4";
    let landscape = false;

    // Map common paper sizes to Electron format
    const sizeMap: Record<string, "A4" | "A5" | "Letter" | "Legal"> = {
      a4: "A4",
      a5: "A5",
      letter: "Letter",
      legal: "Legal",
      "80mm": "A4", // Thermal printer uses A4 as base
    };

    // Extract size from parts
    for (const part of parts) {
      if (sizeMap[part]) {
        size = sizeMap[part];
        break;
      }
    }

    // Check for landscape orientation
    landscape = parts.includes("landscape");

    return { size, landscape };
  }

  /**
   * Generate test receipt HTML
   */
  private generateTestReceiptHtml(userName?: string): string {
    const now = new Date();
    const dateStr = now.toLocaleDateString("id-ID");
    const timeStr = now.toLocaleTimeString("id-ID");
    const cashierName = userName || "System";

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              margin: 20px;
              padding: 0;
              width: 280px;
            }
            .header {
              text-align: center;
              margin-bottom: 10px;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
            }
            .title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .info {
              margin-bottom: 10px;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
            }
            .content {
              margin-bottom: 10px;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 10px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">TEST RECEIPT</div>
            <div>KIRAM APPS POS</div>
          </div>
          <div class="info">
            <div class="row">
              <span>Date:</span>
              <span>${dateStr}</span>
            </div>
            <div class="row">
              <span>Time:</span>
              <span>${timeStr}</span>
            </div>
            <div class="row">
              <span>Kasir:</span>
              <span>${cashierName}</span>
            </div>
          </div>
          <div class="content">
            <p>This is a test receipt to verify your printer configuration.</p>
            <p>If you can read this, your printer is working correctly!</p>
          </div>
          <div class="footer">
            <p>Thank you for using KiramApps</p>
            <p>www.kiramapps.com</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Print using template
   */
  async print(
    templateId: TemplateType,
    data: TemplateData,
    config?: PrinterConfig
  ): Promise<PrintResult> {
    try {
      if (!this.mainWindow) {
        throw new Error("Main window not available");
      }

      // Use provided config or get saved config
      let printConfig = config || this.getPrinterConfig();

      // If no printer configured, try to use default printer
      if (!printConfig.usePdfMode && !printConfig.printerName) {
        console.log(
          "[PrinterManager] No printer configured, attempting to use default printer"
        );

        // Get list of printers and use the first one (usually default)
        const printers = await this.mainWindow.webContents.getPrintersAsync();

        if (printers.length > 0) {
          printConfig = {
            ...printConfig,
            printerName: printers[0].name,
          };
          console.log(
            `[PrinterManager] Using default printer: ${printers[0].name}`
          );
        } else {
          return {
            success: false,
            message:
              "No printer found. Please install a printer or enable PDF mode in settings.",
          };
        }
      }

      // Get template info to determine page size and orientation
      const templateInfo = this.templateManager.getTemplateInfo(templateId);
      const { size, landscape } = this.parsePaperSize(templateInfo?.paperSize);

      console.log(
        `[PrinterManager] Printing template ${templateId} with page size: ${size}, orientation: ${
          landscape ? "landscape" : "portrait"
        }`
      );

      // Generate HTML from template
      const html = this.templateManager.generateHTML(templateId, data);

      // Create hidden print window
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: true,
        },
      });

      await printWindow.loadURL(`data:text/html,${encodeURIComponent(html)}`);

      if (printConfig.usePdfMode) {
        // Print to PDF with dynamic page size and orientation
        const result = await this.printToPdf(printWindow, size, landscape);
        return {
          success: result.success,
          message: result.error,
          filePath: result.pdfPath,
        };
      } else {
        // Print to physical printer with dynamic page size and orientation
        const result = await this.printToPhysicalPrinter(
          printWindow,
          printConfig.printerName,
          size,
          landscape
        );
        return {
          success: result.success,
          message: result.error,
        };
      }
    } catch (error) {
      console.error(`[PrinterManager] Print failed for ${templateId}:`, error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Print receipt
   */
  async printReceipt(
    data: ReceiptData,
    config?: PrinterConfig
  ): Promise<PrintResult> {
    console.log("[PrinterManager] Printing receipt...");
    return this.print("receipt", data as unknown as TemplateData, config);
  }

  /**
   * Print surat kirim
   */
  async printSuratKirim(
    data: SuratKirimData,
    config?: PrinterConfig
  ): Promise<PrintResult> {
    console.log("[PrinterManager] Printing surat kirim...");
    return this.print("surat-kirim", data as unknown as TemplateData, config);
  }

  /**
   * Get available templates
   */
  getTemplates() {
    return this.templateManager.getTemplatesInfo();
  }

  /**
   * Preview template without printing
   */
  previewTemplate(templateId: TemplateType, data: TemplateData): string {
    return this.templateManager.generateHTML(templateId, data);
  }
}
