import { useState } from "react";
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

// Mock data
const mockCustomers = [
  { id: 1, name: "PT. Sumber Makmur" },
  { id: 2, name: "CV. Karya Jaya" },
  { id: 3, name: "UD. Mitra Sejahtera" },
  { id: 4, name: "PT. Bangun Persada" },
];

const mockVehicles = [
  { id: 1, plate: "B 1234 ABC" },
  { id: 2, plate: "D 5678 XYZ" },
  { id: 3, plate: "F 9012 DEF" },
];

const mockItems = [
  { id: 1, name: "Pasir", price: 150000 },
  { id: 2, name: "Batu Split", price: 250000 },
  { id: 3, name: "Batu Kali", price: 200000 },
];

interface TransactionItem {
  id: number;
  itemId: string;
  itemName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export function CreateTransactionPage() {
  const [customer, setCustomer] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<TransactionItem[]>([
    { id: 1, itemId: "", itemName: "", quantity: 1, price: 0, subtotal: 0 },
  ]);

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
          const selectedItem = mockItems.find((i) => i.id === Number(value));
          if (selectedItem) {
            updated.itemName = selectedItem.name;
            updated.price = selectedItem.price;
          }
        }

        // Calculate subtotal
        updated.subtotal = updated.quantity * updated.price;

        return updated;
      })
    );
  };

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  const handleSubmit = () => {
    // Mock submit
    alert("Transaksi berhasil disimpan (mock)");
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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select value={customer} onValueChange={setCustomer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockCustomers.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kendaraan</Label>
                  <Select value={vehicle} onValueChange={setVehicle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kendaraan" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockVehicles.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.plate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                        {mockItems.map((i) => (
                          <SelectItem key={i.id} value={String(i.id)}>
                            {i.name} - Rp {i.price.toLocaleString()}/m³
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
                      value={item.quantity}
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
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Catatan tambahan (opsional)"
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
              <Button className="w-full" onClick={handleSubmit}>
                <Save className="h-4 w-4 mr-2" />
                Simpan Transaksi
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
