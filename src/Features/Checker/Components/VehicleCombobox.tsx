import { useState, useEffect, useCallback } from "react";
import { Search, Plus } from "lucide-react";
import { Input } from "@Shared/Components/UI/Input";
import type { VehicleData } from "@Shared/Types/Electron";

interface VehicleComboboxProps {
  value: number | null;
  customerId: number | null;
  onChange: (vehicle: VehicleData) => void;
  disabled?: boolean;
}

export function VehicleCombobox({
  value,
  customerId,
  onChange,
  disabled = false,
}: VehicleComboboxProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const searchVehicles = useCallback(
    async (query: string) => {
      if (!customerId) {
        setVehicles([]);
        return;
      }

      if (!query || query.length < 2) {
        setVehicles([]);
        return;
      }

      try {
        const result = await window.api.vehicles.search(query);
        if (result.success && result.data) {
          const filtered = result.data.filter(
            (v) => v.customer_id === customerId
          );
          setVehicles(filtered);
        }
      } catch (error) {
        console.error("Error searching vehicles:", error);
      }
    },
    [customerId]
  );

  const createVehicle = useCallback(
    async (plateNumber: string) => {
      if (!customerId) return;

      setLoading(true);
      try {
        const result = await window.api.vehicles.create({
          plate_number: plateNumber,
          customer_id: customerId,
        });

        if (result.success && result.data) {
          onChange(result.data);
          setIsOpen(false);
          setSearchQuery(result.data.plate_number);
          // Refresh vehicles list to show the newly created vehicle
          setVehicles([result.data]);
        }
      } catch (error) {
        console.error("Error creating vehicle:", error);
      } finally {
        setLoading(false);
      }
    },
    [customerId, onChange]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchVehicles(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchVehicles]);

  const selectedVehicle = vehicles.find((v) => v.id === value);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari kendaraan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          disabled={disabled || !customerId}
          className="pl-9"
        />
      </div>

      {isOpen && !disabled && customerId && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Memuat...
            </div>
          ) : (
            <div className="p-1">
              {/* Show search results first */}
              {vehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => {
                    onChange(vehicle);
                    setIsOpen(false);
                    setSearchQuery(vehicle.plate_number);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-md transition-colors text-left"
                >
                  <div className="flex-1">
                    <div className="font-medium">{vehicle.plate_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {vehicle.customer_name}
                    </div>
                  </div>
                </button>
              ))}
              {/* Show create option when there's a search query */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => createVehicle(searchQuery.toUpperCase())}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-accent rounded-md transition-colors border-t border-border mt-1 pt-2"
                  disabled={loading}
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah Kendaraan: {searchQuery.toUpperCase()}</span>
                </button>
              )}
              {/* Show hint when no search query */}
              {!searchQuery && vehicles.length === 0 && (
                <div className="p-3 text-center text-sm text-muted-foreground">
                  Ketik minimal 2 karakter untuk mencari
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedVehicle && !isOpen && (
        <div className="mt-1 p-2 bg-muted border rounded-md text-sm">
          <div className="font-medium">{selectedVehicle.plate_number}</div>
          <div className="text-xs text-muted-foreground">
            {selectedVehicle.customer_name}
          </div>
        </div>
      )}
    </div>
  );
}
