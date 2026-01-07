/**
 * Customer type definition
 * Represents a customer entity in the system
 */
export interface Customer {
  id: number;
  name: string;
  category: CustomerCategory;
  is_active: boolean;
  created_at: string;
}

/**
 * Customer category enum
 */
export enum CustomerCategory {
  PERSONAL = "PERSONAL",
  COMPANY = "COMPANY",
}

/**
 * Customer input for creation
 */
export interface CustomerCreateInput {
  name: string;
  category: CustomerCategory;
}

/**
 * Customer input for update
 */
export interface CustomerUpdateInput {
  id: number;
  name?: string;
  category?: CustomerCategory;
  is_active?: boolean;
}

/**
 * Customer filter options
 */
export interface CustomerFilterOptions {
  name?: string;
  category?: CustomerCategory;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Customer list response with pagination
 */
export interface CustomerListResponse {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
}
