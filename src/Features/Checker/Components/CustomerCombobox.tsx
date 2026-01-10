import { useState, useEffect, useCallback } from "react";
import { Search, Plus } from "lucide-react";
import { Input } from "@Shared/Components/UI/Input";
import type { CustomerData } from "@Shared/Types/Electron";

interface CustomerComboboxProps {
  value: number | null;
  onChange: (customer: CustomerData) => void;
  disabled?: boolean;
}

export function CustomerCombobox({
  value,
  onChange,
  disabled = false,
}: CustomerComboboxProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const searchCustomers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setCustomers([]);
      return;
    }

    try {
      const result = await window.api.customers.search(query);
      if (result.success && result.data) {
        setCustomers(result.data);
      }
    } catch (error) {
      console.error("Error searching customers:", error);
    }
  }, []);

  const createCustomer = useCallback(
    async (name: string) => {
      setLoading(true);
      try {
        const result = await window.api.customers.create({
          name,
          category: "PERSONAL",
          code: name.toUpperCase().replace(/\s+/g, "_"),
        });

        if (result.success && result.data) {
          onChange(result.data);
          setIsOpen(false);
          setSearchQuery(result.data.name);
          // Refresh customers list to show the newly created customer
          setCustomers([result.data]);
        }
      } catch (error) {
        console.error("Error creating customer:", error);
      } finally {
        setLoading(false);
      }
    },
    [onChange]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchCustomers]);

  const selectedCustomer = customers.find((c) => c.id === value);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          className="pl-9"
        />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Memuat...
            </div>
          ) : (
            <div className="p-1">
              {/* Show search results first */}
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => {
                    onChange(customer);
                    setIsOpen(false);
                    setSearchQuery(customer.name);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-md transition-colors text-left"
                >
                  <div className="flex-1">
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {customer.category}
                    </div>
                  </div>
                </button>
              ))}
              {/* Show create option when there's a search query */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => createCustomer(searchQuery)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-accent rounded-md transition-colors border-t border-border mt-1 pt-2"
                  disabled={loading}
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah Customer Baru: {searchQuery}</span>
                </button>
              )}
              {/* Show hint when no search query */}
              {!searchQuery && customers.length === 0 && (
                <div className="p-3 text-center text-sm text-muted-foreground">
                  Ketik minimal 2 karakter untuk mencari
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedCustomer && !isOpen && (
        <div className="mt-1 p-2 bg-muted border rounded-md text-sm">
          <div className="font-medium">{selectedCustomer.name}</div>
          <div className="text-xs text-muted-foreground">
            {selectedCustomer.category}
          </div>
        </div>
      )}
    </div>
  );
}
