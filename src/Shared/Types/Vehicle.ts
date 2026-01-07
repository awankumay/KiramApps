/**
 * Vehicle type definition
 * Represents a vehicle entity in the system
 */
export interface Vehicle {
  id: number;
  plate_number: string;
  customer_id: number;
  customer_name?: string;
  customer_category?: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Vehicle input for creation
 */
export interface VehicleCreateInput {
  plate_number: string;
  customer_id: number;
}

/**
 * Vehicle input for update
 */
export interface VehicleUpdateInput {
  id: number;
  plate_number?: string;
  customer_id?: number;
  is_active?: boolean;
}

/**
 * Vehicle filter options
 */
export interface VehicleFilterOptions {
  plate_number?: string;
  customer_id?: number;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Vehicle list response with pagination
 */
export interface VehicleListResponse {
  vehicles: Vehicle[];
  total: number;
  page: number;
  limit: number;
}
