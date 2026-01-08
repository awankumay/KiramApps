import { useState, useEffect, useCallback } from "react";
import { FilePlus, Save, Plus, Trash } from "lucide-react";
import { Button } from "@Shared/Components/UI/Button";
import { Input } from "@Shared/Components/UI/Input";
import { Label } from "@Shared/Components/UI/Label";
import { Textarea } from "@Shared/Components/UI/Textarea";
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
import { CustomerCombobox } from "./Components/CustomerCombobox";
import { VehicleCombobox } from "./Components/VehicleCombobox";
import type {
  CreateTransactionData,
  TransactionTypeData,
  ItemData,
  PaymentMethodData,
} from "@Shared/Types/Electron";

interface TransactionFormItem {
  id: number;
  itemId: string;
  itemName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export function CreateTransactionPage() {
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [transactionTypeId, setTransactionTypeId] = useState<number>(1);
  const [paymentMethodId, setPaymentMethodId] = useState<number>(1); // Default CASH
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<TransactionFormItem[]>([
    {
      id: Date.now(),
      itemId: "",
      itemName: "",
      quantity: 1,
      price: 0,
      subtotal: 0,
    },
  ]);
  const [availableItems, setAvailableItems] = useState<ItemData[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<
    TransactionTypeData[]
  >([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchTransactionTypes = useCallback(async () => {
    try {
      const result = await window.api.transactionTypes.getAll();
      if (result.success && result.data) {
        setTransactionTypes(result.data);
      }
    } catch (error) {
      console.error("Error fetching transaction types:", error);
    }
  }, []);

  const fetchActiveItems = useCallback(async () => {
    try {
      const result = await window.api.items.getActive();
      if (result.success && result.data) {
        setAvailableItems(result.data);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  }, []);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const result = await window.api.paymentMethods.getAll();
      if (result.success && result.data) {
        setPaymentMethods(result.data);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    }
  }, []);

  useEffect(() => {
    fetchTransactionTypes();
    fetchActiveItems();
    fetchPaymentMethods();
  }, [fetchTransactionTypes, fetchActiveItems, fetchPaymentMethods]);

  // Reset vehicle when customer changes
  useEffect(() => {
    setVehicleId(null);
  }, [customerId]);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now(),
        itemId: "",
        itemName: "",
        quantity: 1,
        price: 0,
        subtotal: 0,
      },
    ]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: number, field: string, value: string | number) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        // Auto-fill price and name when item is selected
        if (field === "itemId") {
          const selectedItem = availableItems.find(
            (i) => i.id === Number(value)
          );
          if (selectedItem) {
            updated.itemName = selectedItem.name;
            updated.price = selectedItem.price;
          }
        }

        // Calculate subtotal - always recalculate when itemId, quantity, or price changes
        if (field === "itemId" || field === "quantity" || field === "price") {
          updated.subtotal = updated.quantity * (updated.price || 0);
        }

        return updated;
      })
    );
  };

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  const handleSubmit = async () => {
    // Validation
    if (!customerId) {
      alert("Silakan pilih customer");
      return;
    }

    if (!vehicleId) {
      alert("Silakan pilih kendaraan");
      return;
    }

    if (items.some((item) => !item.itemId)) {
      alert("Silakan pilih item untuk semua baris");
      return;
    }

    if (items.some((item) => item.quantity <= 0)) {
      alert("Qty harus lebih dari 0");
      return;
    }

    setSubmitting(true);

    try {
      const transactionData: CreateTransactionData = {
        transactionTypeId,
        customerId,
        vehicleId,
        items: items.map((item) => ({
          itemId: Number(item.itemId),
          qty: item.quantity,
          price: item.price,
        })),
        paymentMethodId, // Pass payment method - CASH (id=1) will auto-set to PAID
        notes: notes || undefined,
      };

      const result = await window.api.transactions.create(
        transactionData,
        1 // TODO: Get user ID from auth context
      );

      if (result.success && result.data) {
        alert("Transaksi berhasil dibuat!");
        window.location.hash = "/checker/transactions";
      } else {
        alert("Gagal membuat transaksi: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      alert("Terjadi kesalahan saat membuat transaksi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FilePlus className="h-8 w-8" />
          Buat Transaksi
        </h1>
        <p className="text-muted-foreground">Masukkan data transaksi baru</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Vehicle */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Transaksi</CardTitle>
              <CardDescription>Pilih customer dan kendaraan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipe Transaksi</Label>
                <Select
                  value={String(transactionTypeId)}
                  onValueChange={(v) => setTransactionTypeId(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe transaksi" />
                  </SelectTrigger>
                  <SelectContent>
                    {transactionTypes.map((type) => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Customer</Label>
                <CustomerCombobox
                  value={customerId}
                  onChange={(customer) => setCustomerId(customer.id)}
                />
              </div>

              <div className="space-y-2">
                <Label>Kendaraan</Label>
                <VehicleCombobox
                  value={vehicleId}
                  customerId={customerId}
                  onChange={(vehicle) => setVehicleId(vehicle.id)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Item Transaksi</CardTitle>
              <CardDescription>
                Tambahkan item yang ditransaksikan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid gap-4 md:grid-cols-5 items-end border-b pb-4 last:border-0"
                >
                  <div className="md:col-span-2 space-y-2">
                    <Label>Item {index + 1}</Label>
                    <Select
                      value={item.itemId}
                      onValueChange={(v) => updateItem(item.id, "itemId", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih item" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableItems.map((i) => (
                          <SelectItem key={i.id} value={String(i.id)}>
                            {i.name} - Rp {(i.price || 0).toLocaleString()}/m³
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Qty (m³)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={String(item.quantity)}
                      onChange={(e) =>
                        updateItem(item.id, "quantity", Number(e.target.value))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Subtotal</Label>
                    <Input
                      value={`Rp ${item.subtotal.toLocaleString()}`}
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  <div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Item
              </Button>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Catatan</CardTitle>
              <CardDescription>Catatan tambahan (opsional)</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Catatan tambahan (opsional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Jumlah Item</span>
                  <span>{items.filter((i) => i.itemId).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Qty</span>
                  <span>
                    {items.reduce((sum, i) => sum + i.quantity, 0)} m³
                  </span>
                </div>
                <hr />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>Rp {total.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-2">
                <Label>Metode Pembayaran</Label>
                <Select
                  value={String(paymentMethodId)}
                  onValueChange={(v) => setPaymentMethodId(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih metode pembayaran" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={String(method.id)}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={submitting}
              >
                <Save className="h-4 w-4 mr-2" />
                {submitting ? "Menyimpan..." : "Simpan Transaksi"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
