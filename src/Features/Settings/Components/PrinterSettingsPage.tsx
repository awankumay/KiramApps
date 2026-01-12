import { useState, useEffect } from "react";
import { Printer, FileText, Check, X, Loader2 } from "lucide-react";
import { Button } from "@Shared/Components/UI/Button";
import { Label } from "@Shared/Components/UI/Label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@Shared/Components/UI/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@Shared/Components/UI/Select";
import { Checkbox } from "@Shared/Components/UI/Checkbox";
import { toast } from "sonner";
import type {
  Printer as PrinterType,
  PrinterConfig,
} from "@Shared/Types/Printer";

export function PrinterSettingsPage() {
  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [config, setConfig] = useState<PrinterConfig>({
    printerName: "",
    usePdfMode: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  // Load printers and config on mount
  useEffect(() => {
    loadPrintersAndConfig();
  }, []);

  const loadPrintersAndConfig = async () => {
    setIsLoading(true);
    try {
      // Get installed printers
      const printersResponse = await window.api.printer.getPrinters();
      if (printersResponse.success && printersResponse.data) {
        setPrinters(printersResponse.data);
      } else {
        toast.error("Gagal memuat daftar printer");
      }

      // Get saved config
      const configResponse = await window.api.printer.getPrinterConfig();
      if (configResponse.success && configResponse.data) {
        setConfig(configResponse.data);
      }
    } catch (error) {
      console.error("Failed to load printer settings:", error);
      toast.error("Terjadi kesalahan saat memuat pengaturan printer");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrinterChange = async (printerName: string) => {
    const newConfig: PrinterConfig = {
      ...config,
      printerName,
    };
    setConfig(newConfig);
    await saveConfig(newConfig);
  };

  const handlePdfModeChange = async (checked: boolean) => {
    const newConfig: PrinterConfig = {
      ...config,
      usePdfMode: checked,
    };
    setConfig(newConfig);
    await saveConfig(newConfig);
  };

  const saveConfig = async (configToSave: PrinterConfig) => {
    try {
      const response = await window.api.printer.savePrinterConfig(configToSave);
      if (response.success) {
        toast.success("Pengaturan printer berhasil disimpan");
      } else {
        toast.error("Gagal menyimpan pengaturan printer");
      }
    } catch (error) {
      console.error("Failed to save printer config:", error);
      toast.error("Terjadi kesalahan saat menyimpan pengaturan");
    }
  };

  const handlePrintTest = async () => {
    if (!config.usePdfMode && !config.printerName) {
      toast.error("Pilih printer atau aktifkan mode PDF terlebih dahulu");
      return;
    }

    setIsPrinting(true);
    try {
      const response = await window.api.printer.printTest(config);

      if (response.success && response.data) {
        if (response.data.success) {
          if (config.usePdfMode && response.data.pdfPath) {
            toast.success(
              `Test print berhasil! PDF disimpan di: ${response.data.pdfPath}`
            );
          } else {
            toast.success("Test print berhasil dikirim ke printer");
          }
        } else {
          toast.error(response.data.error || "Test print gagal");
        }
      } else {
        toast.error("Gagal melakukan test print");
      }
    } catch (error) {
      console.error("Failed to print test:", error);
      toast.error("Terjadi kesalahan saat test print");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleTestReceipt = async () => {
    if (!config.usePdfMode && !config.printerName) {
      toast.error("Pilih printer atau aktifkan mode PDF terlebih dahulu");
      return;
    }

    setIsPrinting(true);
    try {
      // Generate sample receipt data
      const now = new Date();
      const sampleData = {
        transactionNumber: `TRX-${now.getTime()}`,
        date: now.toISOString(),
        time: now.toISOString(),
        storeName: "KIRAM APPS POS",
        storeAddress: "Jl. Contoh No. 123, Jakarta",
        storePhone: "021-12345678",
        customerName: "Sample Customer",
        vehiclePlate: "B 1234 XYZ",
        items: [
          {
            name: "Item Sample 1",
            quantity: 2,
            unitPrice: 50000,
            subtotal: 100000,
          },
          {
            name: "Item Sample 2",
            quantity: 1,
            unitPrice: 75000,
            subtotal: 75000,
          },
        ],
        subtotal: 175000,
        tax: 0,
        total: 175000,
        paymentMethod: "Tunai",
        amountPaid: 200000,
        change: 25000,
        cashierName: "System Test",
        notes: "Terima Kasih\nAtas Kunjungan Anda",
      };

      const response = await window.api.printer.printReceipt(
        sampleData,
        config
      );

      if (response.success && response.data) {
        if (response.data.success) {
          if (config.usePdfMode && response.data.filePath) {
            toast.success(
              `Receipt template berhasil! PDF: ${response.data.filePath}`
            );
          } else {
            toast.success("Receipt template berhasil dicetak");
          }
        } else {
          toast.error(response.data.message || "Print receipt gagal");
        }
      } else {
        toast.error("Gagal mencetak receipt template");
      }
    } catch (error) {
      console.error("Failed to test receipt:", error);
      toast.error("Terjadi kesalahan saat test receipt");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleTestSuratKirim = async () => {
    if (!config.usePdfMode && !config.printerName) {
      toast.error("Pilih printer atau aktifkan mode PDF terlebih dahulu");
      return;
    }

    setIsPrinting(true);
    try {
      // Generate sample surat kirim data
      const now = new Date();
      const sampleData = {
        companyName: "CV. KIRAMANA",
        truckName: "TRUCK-001",
        destination: "Jakarta Pusat",
        materials: [
          {
            no: 1,
            jenisMaterial: "Pasir",
            jumlah: "10 m³",
            keterangan: "Pasir halus",
          },
          {
            no: 2,
            jenisMaterial: "Batu",
            jumlah: "5 m³",
            keterangan: "Batu split",
          },
          {
            no: 3,
            jenisMaterial: "Semen",
            jumlah: "50 sak",
            keterangan: "Semen Gresik",
          },
        ],
        date: now.toISOString(),
        driverName: "Driver Test",
        supervisorName: "Supervisor Test",
      };

      const response = await window.api.printer.printSuratKirim(
        sampleData,
        config
      );

      if (response.success && response.data) {
        if (response.data.success) {
          if (config.usePdfMode && response.data.filePath) {
            toast.success(
              `Surat Kirim template berhasil! PDF: ${response.data.filePath}`
            );
          } else {
            toast.success("Surat Kirim template berhasil dicetak");
          }
        } else {
          toast.error(response.data.message || "Print surat kirim gagal");
        }
      } else {
        toast.error("Gagal mencetak surat kirim template");
      }
    } catch (error) {
      console.error("Failed to test surat kirim:", error);
      toast.error("Terjadi kesalahan saat test surat kirim");
    } finally {
      setIsPrinting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Pengaturan Printer
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Pengaturan Printer
          </CardTitle>
          <CardDescription>
            Pilih printer untuk mencetak struk transaksi atau gunakan mode PDF
            untuk uji coba. Pengaturan akan tersimpan otomatis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto-save Info */}
          <div className="rounded-lg border bg-blue-50 dark:bg-blue-950 p-3 text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium">ℹ️ Pengaturan Otomatis Tersimpan</p>
            <p className="text-xs mt-1">
              Setiap perubahan akan langsung tersimpan tanpa perlu klik tombol
              Save
            </p>
          </div>

          {/* Printer Selection */}
          <div className="space-y-2">
            <Label htmlFor="printer-select">Pilih Printer</Label>
            <Select
              value={config.printerName}
              onValueChange={handlePrinterChange}
              disabled={config.usePdfMode}
            >
              <SelectTrigger id="printer-select" className="w-full">
                <SelectValue placeholder="Pilih printer..." />
              </SelectTrigger>
              <SelectContent>
                {printers.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    Tidak ada printer yang terdeteksi
                  </div>
                ) : (
                  printers.map((printer) => (
                    <SelectItem key={printer.name} value={printer.name}>
                      <div className="flex items-center gap-2">
                        <Printer className="h-4 w-4" />
                        <span>{printer.name}</span>
                        {printer.isDefault && (
                          <span className="text-xs text-muted-foreground">
                            (Default)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {printers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Pastikan printer sudah terinstall di Windows Settings → Printers
                & Scanners
              </p>
            )}
          </div>

          {/* PDF Mode Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="pdf-mode"
              checked={config.usePdfMode}
              onCheckedChange={handlePdfModeChange}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="pdf-mode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Gunakan Print ke PDF (untuk uji coba)
              </label>
              <p className="text-sm text-muted-foreground">
                File PDF akan disimpan di folder Downloads
              </p>
            </div>
          </div>

          {/* Print Test Button */}
          <div className="pt-4 space-y-3">
            <Button
              onClick={handlePrintTest}
              disabled={
                isPrinting || (!config.usePdfMode && !config.printerName)
              }
              className="w-full sm:w-auto"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mencetak...
                </>
              ) : (
                <>
                  {config.usePdfMode ? (
                    <FileText className="mr-2 h-4 w-4" />
                  ) : (
                    <Printer className="mr-2 h-4 w-4" />
                  )}
                  Cetak Uji Coba
                </>
              )}
            </Button>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleTestReceipt}
                disabled={
                  isPrinting || (!config.usePdfMode && !config.printerName)
                }
                variant="outline"
              >
                {isPrinting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Test Receipt Template
              </Button>

              <Button
                onClick={handleTestSuratKirim}
                disabled={
                  isPrinting || (!config.usePdfMode && !config.printerName)
                }
                variant="outline"
              >
                {isPrinting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Test Surat Kirim Template
              </Button>
            </div>
          </div>

          {/* Status Info */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-2 text-sm">
              {config.usePdfMode ? (
                <>
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span>
                    Mode: <strong>Print ke PDF</strong>
                  </span>
                </>
              ) : config.printerName ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span>
                    Printer aktif: <strong>{config.printerName}</strong>
                  </span>
                </>
              ) : (
                <>
                  <X className="h-4 w-4 text-amber-500" />
                  <span>Belum ada printer yang dipilih</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • Printer thermal (EPSON, STAR) akan muncul sebagai printer standar
            di Windows
          </p>
          <p>• Mode PDF berguna untuk testing tanpa printer fisik</p>
          <p>
            • Pengaturan akan tersimpan otomatis dan berlaku untuk semua
            transaksi
          </p>
          <p>• Test print akan mencetak struk uji coba sederhana</p>
        </CardContent>
      </Card>
    </div>
  );
}
