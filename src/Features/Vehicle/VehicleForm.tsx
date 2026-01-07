import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@Shared/Components/UI/Button";
import { Input } from "@Shared/Components/UI/Input";
import { Label } from "@Shared/Components/UI/Label";
import { Card } from "@Shared/Components/UI/Card";
import { toast } from "sonner";
import type { CreateVehicleData, CustomerData } from "@Shared/Types/Electron";

export function VehicleForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const vehicleId = id ? parseInt(id) : undefined;
  const [formData, setFormData] = useState({
    plate_number: "",
    customer_id: 0,
  });
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [plateError, setPlateError] = useState("");

  const loadVehicle = useCallback(async () => {
    if (!vehicleId) return;

    try {
      const result = await window.api.vehicles.getById(vehicleId);
      if (result.success && result.data) {
        setFormData({
          plate_number: result.data.plate_number,
          customer_id: result.data.customer_id,
        });
      }
    } catch (error) {
      console.error("Error loading vehicle:", error);
      toast.error("Gagal memuat data kendaraan");
    }
  }, [vehicleId]);

  const loadCustomers = useCallback(async () => {
    try {
      const result = await window.api.customers.getAll({ is_active: true });
      if (result.success && result.data) {
        setCustomers(result.data.customers);
      }
    } catch (error) {
      console.error("Error loading customers:", error);
    }
  }, []);

  useEffect(() => {
    if (vehicleId) {
      loadVehicle();
    }
    loadCustomers();
  }, [vehicleId, loadVehicle, loadCustomers]);

  const checkPlateNumber = async (plateNumber: string) => {
    try {
      const result = await window.api.vehicles.plateNumberExists(
        plateNumber,
        vehicleId
      );
      if (result.success && result.data) {
        setPlateError("Nomor plat sudah digunakan");
        return false;
      }
      setPlateError("");
      return true;
    } catch (error) {
      console.error("Error checking plate number:", error);
      return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPlateError("");

    // Check plate number uniqueness
    const isPlateValid = await checkPlateNumber(formData.plate_number);
    if (!isPlateValid) {
      setLoading(false);
      return;
    }

    try {
      if (vehicleId) {
        const result = await window.api.vehicles.update(vehicleId, {
          plate_number: formData.plate_number,
          customer_id: formData.customer_id,
        });

        if (result.success && result.data) {
          toast.success("Kendaraan berhasil diperbarui");
          navigate("/superadmin/vehicles");
        } else {
          toast.error(result.error || "Gagal memperbarui kendaraan");
        }
      } else {
        const result = await window.api.vehicles.create(
          formData as CreateVehicleData
        );
        if (result.success && result.data) {
          toast.success("Kendaraan berhasil dibuat");
          navigate("/superadmin/vehicles");
        } else {
          toast.error(result.error || "Gagal membuat kendaraan");
        }
      }
    } catch (error) {
      console.error("Error saving vehicle:", error);
      toast.error("Terjadi kesalahan saat menyimpan kendaraan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">
          {vehicleId ? "Edit Kendaraan" : "Tambah Kendaraan Baru"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="plate_number">Nomor Plat *</Label>
            <Input
              id="plate_number"
              type="text"
              placeholder="Masukkan nomor plat"
              value={formData.plate_number}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  plate_number: e.target.value.toUpperCase(),
                })
              }
              required
              disabled={loading}
              className="font-mono uppercase"
            />
            {plateError && (
              <p className="text-sm text-red-500 mt-1">{plateError}</p>
            )}
          </div>

          <div>
            <Label htmlFor="customer_id">Customer *</Label>
            <select
              id="customer_id"
              value={formData.customer_id}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  customer_id: parseInt(e.target.value),
                })
              }
              required
              disabled={loading}
              className="w-full px-3 py-2 border rounded-md bg-white"
            >
              <option value={0}>Pilih Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/superadmin/vehicles")}
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
