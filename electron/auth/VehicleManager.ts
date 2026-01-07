import {
  VehicleCreateSchema,
  VehicleUpdateSchema,
} from "../../src/Shared/Types/ValidationSchemas";

/**
 * Vehicle Manager
 * Handles all vehicle-related database operations
 */
export class VehicleManager {
  private db: ReturnType<typeof import("better-sqlite3")>;

  constructor(db: ReturnType<typeof import("better-sqlite3")>) {
    this.db = db;
  }

  /**
   * Get all vehicles with optional filters and pagination
   */
  getAll(
    filters: {
      plate_number?: string;
      customer_id?: number;
      is_active?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const {
      plate_number,
      customer_id,
      is_active,
      page = 1,
      limit = 20,
    } = filters;

    let query = `
      SELECT v.*, c.name as customer_name, c.category as customer_category
      FROM vehicles v
      LEFT JOIN customers c ON v.customer_id = c.id
      WHERE 1=1
    `;
    const params: (string | number | boolean)[] = [];

    if (plate_number) {
      query += " AND v.plate_number LIKE ?";
      params.push(`%${plate_number}%`);
    }

    if (customer_id) {
      query += " AND v.customer_id = ?";
      params.push(customer_id);
    }

    if (is_active !== undefined) {
      query += " AND v.is_active = ?";
      params.push(is_active ? 1 : 0);
    }

    query += " ORDER BY v.created_at DESC LIMIT ? OFFSET ?";
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const vehicles = this.db.prepare(query).all(...params);

    // Get total count
    let countQuery = "SELECT COUNT(*) as total FROM vehicles WHERE 1=1";
    const countParams: (string | number | boolean)[] = [];

    if (plate_number) {
      countQuery += " AND plate_number LIKE ?";
      countParams.push(`%${plate_number}%`);
    }

    if (customer_id) {
      countQuery += " AND customer_id = ?";
      countParams.push(customer_id);
    }

    if (is_active !== undefined) {
      countQuery += " AND is_active = ?";
      countParams.push(is_active ? 1 : 0);
    }

    const countResult = this.db.prepare(countQuery).get(...countParams);
    const total = (countResult as { total: number }).total;

    return {
      vehicles: (vehicles as unknown[]).map((v) => {
        const vehicle = v as {
          id: number;
          plate_number: string;
          customer_id: number;
          customer_name: string;
          customer_category: string;
          is_active: number;
          created_at: string;
        };
        return {
          id: vehicle.id,
          plate_number: vehicle.plate_number,
          customer_id: vehicle.customer_id,
          customer_name: vehicle.customer_name,
          customer_category: vehicle.customer_category,
          is_active: Boolean(vehicle.is_active),
          created_at: vehicle.created_at,
        };
      }),
      total,
      page,
      limit,
    };
  }

  /**
   * Get vehicle by ID
   */
  getById(id: number) {
    const vehicle = this.db
      .prepare(
        `
          SELECT v.*, c.name as customer_name, c.category as customer_category
          FROM vehicles v
          LEFT JOIN customers c ON v.customer_id = c.id
          WHERE v.id = ?
        `
      )
      .get(id) as {
      id: number;
      plate_number: string;
      customer_id: number;
      customer_name: string;
      customer_category: string;
      is_active: number;
      created_at: string;
    } | null;

    if (!vehicle) return null;

    return {
      id: vehicle.id,
      plate_number: vehicle.plate_number,
      customer_id: vehicle.customer_id,
      customer_name: vehicle.customer_name,
      customer_category: vehicle.customer_category,
      is_active: Boolean(vehicle.is_active),
      created_at: vehicle.created_at,
    };
  }

  /**
   * Create new vehicle
   */
  create(data: { plate_number: string; customer_id: number }) {
    // Validate input
    const validated = VehicleCreateSchema.parse(data);

    const result = this.db
      .prepare(
        "INSERT INTO vehicles (plate_number, customer_id, is_active) VALUES (?, ?, 1)"
      )
      .run(validated.plate_number, validated.customer_id);

    return this.getById(result.lastInsertRowid as number);
  }

  /**
   * Update existing vehicle
   */
  update(
    id: number,
    data: { plate_number?: string; customer_id?: number; is_active?: boolean }
  ) {
    // Validate input
    const validated = VehicleUpdateSchema.parse({ id, ...data });

    // Build dynamic update query
    const updates: string[] = [];
    const params: (string | number | boolean)[] = [];

    if (validated.plate_number !== undefined) {
      updates.push("plate_number = ?");
      params.push(validated.plate_number);
    }

    if (validated.customer_id !== undefined) {
      updates.push("customer_id = ?");
      params.push(validated.customer_id);
    }

    if (validated.is_active !== undefined) {
      updates.push("is_active = ?");
      params.push(validated.is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    params.push(id);
    const query = `UPDATE vehicles SET ${updates.join(", ")} WHERE id = ?`;
    this.db.prepare(query).run(...params);

    return this.getById(id);
  }

  /**
   * Delete vehicle (soft delete)
   */
  delete(id: number) {
    const result = this.db
      .prepare("UPDATE vehicles SET is_active = 0 WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  /**
   * Search vehicles by plate number
   */
  search(query: string) {
    const vehicles = this.db
      .prepare(
        `
          SELECT v.*, c.name as customer_name, c.category as customer_category
          FROM vehicles v
          LEFT JOIN customers c ON v.customer_id = c.id
          WHERE v.plate_number LIKE ? AND v.is_active = 1
        `
      )
      .all(`%${query}%`);

    return (vehicles as unknown[]).map((v) => {
      const vehicle = v as {
        id: number;
        plate_number: string;
        customer_id: number;
        customer_name: string;
        customer_category: string;
        is_active: number;
        created_at: string;
      };
      return {
        id: vehicle.id,
        plate_number: vehicle.plate_number,
        customer_id: vehicle.customer_id,
        customer_name: vehicle.customer_name,
        customer_category: vehicle.customer_category,
        is_active: Boolean(vehicle.is_active),
        created_at: vehicle.created_at,
      };
    });
  }

  /**
   * Get vehicles by customer ID
   */
  getByCustomerId(customerId: number) {
    const vehicles = this.db
      .prepare(
        `
          SELECT v.*, c.name as customer_name, c.category as customer_category
          FROM vehicles v
          LEFT JOIN customers c ON v.customer_id = c.id
          WHERE v.customer_id = ? AND v.is_active = 1
          ORDER BY v.plate_number
        `
      )
      .all(customerId);

    return (vehicles as unknown[]).map((v) => {
      const vehicle = v as {
        id: number;
        plate_number: string;
        customer_id: number;
        customer_name: string;
        customer_category: string;
        is_active: number;
        created_at: string;
      };
      return {
        id: vehicle.id,
        plate_number: vehicle.plate_number,
        customer_id: vehicle.customer_id,
        customer_name: vehicle.customer_name,
        customer_category: vehicle.customer_category,
        is_active: Boolean(vehicle.is_active),
        created_at: vehicle.created_at,
      };
    });
  }

  /**
   * Get active vehicles only
   */
  getActive() {
    const vehicles = this.db
      .prepare(
        `
          SELECT v.*, c.name as customer_name, c.category as customer_category
          FROM vehicles v
          LEFT JOIN customers c ON v.customer_id = c.id
          WHERE v.is_active = 1
          ORDER BY v.plate_number
        `
      )
      .all();

    return (vehicles as unknown[]).map((v) => {
      const vehicle = v as {
        id: number;
        plate_number: string;
        customer_id: number;
        customer_name: string;
        customer_category: string;
        is_active: number;
        created_at: string;
      };
      return {
        id: vehicle.id,
        plate_number: vehicle.plate_number,
        customer_id: vehicle.customer_id,
        customer_name: vehicle.customer_name,
        customer_category: vehicle.customer_category,
        is_active: Boolean(vehicle.is_active),
        created_at: vehicle.created_at,
      };
    });
  }

  /**
   * Check if plate number exists
   */
  plateNumberExists(plateNumber: string, excludeId?: number) {
    let query = "SELECT id FROM vehicles WHERE plate_number = ?";
    const params: (string | number)[] = [plateNumber];

    if (excludeId) {
      query += " AND id != ?";
      params.push(excludeId);
    }

    const result = this.db.prepare(query).get(...params);
    return result !== undefined;
  }
}
