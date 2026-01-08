import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@Shared/Components/UI/Button";
import { Input } from "@Shared/Components/UI/Input";
import { Label } from "@Shared/Components/UI/Label";
import { Card } from "@Shared/Components/UI/Card";
import { toast } from "sonner";
import { CustomerCategory } from "@Shared/Types/Customer";
import type { CreateCustomerData } from "@Shared/Types/Electron";

export function CustomerForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customerId = id ? parseInt(id) : undefined;
  const [formData, setFormData] = useState({
    name: "",
    category: CustomerCategory.PERSONAL,
  });
  const [loading, setLoading] = useState(false);

  const loadCustomer = useCallback(async () => {
    if (!customerId) return;

    try {
      const result = await window.api.customers.getById(customerId);
      if (result.success && result.data) {
        setFormData({
          name: result.data.name,
          category: result.data.category as CustomerCategory,
        });
      }
    } catch (error) {
      console.error("Error loading customer:", error);
      toast.error("Gagal memuat data customer");
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId) {
      loadCustomer();
    }
  }, [customerId, loadCustomer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (customerId) {
        const result = await window.api.customers.update(customerId, formData);
        if (result.success && result.data) {
          toast.success("Customer berhasil diperbarui");
          navigate("/superadmin/customers");
        } else {
          toast.error(result.error || "Gagal memperbarui customer");
        }
      } else {
        const result = await window.api.customers.create(
          formData as CreateCustomerData
        );
        if (result.success && result.data) {
          toast.success("Customer berhasil dibuat");
          navigate("/superadmin/customers");
        } else {
          toast.error(result.error || "Gagal membuat customer");
        }
      }
    } catch (error) {
      console.error("Error saving customer:", error);
      toast.error("Terjadi kesalahan saat menyimpan customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">
          {customerId ? "Edit Customer" : "Tambah Customer Baru"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nama Customer *</Label>
            <Input
              id="name"
              type="text"
              placeholder="Masukkan nama customer"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="category">Kategori *</Label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as CustomerCategory,
                })
              }
              required
              disabled={loading}
              className="w-full px-3 py-2 border rounded-md bg-white"
            >
              <option value={CustomerCategory.PERSONAL}>PERSONAL</option>
              <option value={CustomerCategory.COMPANY}>COMPANY</option>
            </select>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/superadmin/customers")}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
