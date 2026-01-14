import {
  CustomerCreateSchema,
  CustomerUpdateSchema,
} from "../../src/Shared/Types/ValidationSchemas";

/**
 * Customer Manager
 * Handles all customer-related database operations
 */
export class CustomerManager {
  private db: ReturnType<typeof import("better-sqlite3")>;

  constructor(db: ReturnType<typeof import("better-sqlite3")>) {
    this.db = db;
  }

  /**
   * Get all customers with optional filters and pagination
   */
  getAll(
    filters: {
      name?: string;
      category?: string;
      is_active?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { name, category, is_active, page = 1, limit = 20 } = filters;

    let query = "SELECT * FROM customers WHERE 1=1";
    const params: (string | number | boolean)[] = [];

    if (name) {
      query += " AND name LIKE ?";
      params.push(`%${name}%`);
    }

    if (category) {
      query += " AND category = ?";
      params.push(category);
    }

    if (is_active !== undefined) {
      query += " AND is_active = ?";
      params.push(is_active ? 1 : 0);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const customers = this.db.prepare(query).all(...params);

    // Get total count
    let countQuery = "SELECT COUNT(*) as total FROM customers WHERE 1=1";
    const countParams: (string | number | boolean)[] = [];

    if (name) {
      countQuery += " AND name LIKE ?";
      countParams.push(`%${name}%`);
    }

    if (category) {
      countQuery += " AND category = ?";
      countParams.push(category);
    }

    if (is_active !== undefined) {
      countQuery += " AND is_active = ?";
      countParams.push(is_active ? 1 : 0);
    }

    const countResult = this.db.prepare(countQuery).get(...countParams);
    const total = (countResult as { total: number }).total;

    return {
      customers: (customers as unknown[]).map((c) => {
        const customer = c as {
          id: number;
          name: string;
          category: string;
          code: string;
          is_active: number;
          created_at: string;
        };
        return {
          id: customer.id,
          name: customer.name,
          category: customer.category,
          code: customer.code,
          is_active: Boolean(customer.is_active),
          created_at: customer.created_at,
        };
      }),
      total,
      page,
      limit,
    };
  }

  /**
   * Get customer by ID
   */
  getById(id: number) {
    const customer = this.db
      .prepare("SELECT * FROM customers WHERE id = ?")
      .get(id) as {
      id: number;
      name: string;
      category: string;
      code: string;
      is_active: number;
      created_at: string;
    } | null;
    if (!customer) return null;

    return {
      id: customer.id,
      name: customer.name,
      category: customer.category,
      code: customer.code,
      is_active: Boolean(customer.is_active),
      created_at: customer.created_at,
    };
  }

  /**
   * Create new customer
   */
  create(data: { name: string; category: string; code: string }) {
    // Validate input
    const validated = CustomerCreateSchema.parse(data);

    // Check if code already exists
    const existing = this.db
      .prepare("SELECT id FROM customers WHERE code = ?")
      .get(validated.code);
    if (existing) {
      throw new Error("Code already exists");
    }

    const result = this.db
      .prepare(
        "INSERT INTO customers (name, category, code, is_active) VALUES (?, ?, ?, 1)"
      )
      .run(validated.name, validated.category, validated.code);

    return this.getById(result.lastInsertRowid as number);
  }

  /**
   * Update existing customer
   */
  update(
    id: number,
    data: {
      name?: string;
      category?: string;
      code?: string;
      is_active?: boolean;
    }
  ) {
    // Validate input
    const validated = CustomerUpdateSchema.parse({ id, ...data });

    // Build dynamic update query
    const updates: string[] = [];
    const params: (string | number | boolean)[] = [];

    if (validated.name !== undefined) {
      updates.push("name = ?");
      params.push(validated.name);
    }

    if (validated.category !== undefined) {
      updates.push("category = ?");
      params.push(validated.category);
    }

    if (validated.code !== undefined) {
      // Check if code already exists (excluding current record)
      const existing = this.db
        .prepare("SELECT id FROM customers WHERE code = ? AND id != ?")
        .get(validated.code, id);
      if (existing) {
        throw new Error("Code already exists");
      }
      updates.push("code = ?");
      params.push(validated.code);
    }

    if (validated.is_active !== undefined) {
      updates.push("is_active = ?");
      params.push(validated.is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    params.push(id);
    const query = `UPDATE customers SET ${updates.join(", ")} WHERE id = ?`;
    this.db.prepare(query).run(...params);

    return this.getById(id);
  }

  /**
   * Delete customer (soft delete)
   */
  delete(id: number) {
    const result = this.db
      .prepare("UPDATE customers SET is_active = 0 WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  /**
   * Search customers by name
   */
  search(query: string) {
    const customers = this.db
      .prepare("SELECT * FROM customers WHERE name LIKE ? AND is_active = 1")
      .all(`%${query}%`);

    return (customers as unknown[]).map((c) => {
      const customer = c as {
        id: number;
        name: string;
        category: string;
        code: string;
        is_active: number;
        created_at: string;
      };
      return {
        id: customer.id,
        name: customer.name,
        category: customer.category,
        code: customer.code,
        is_active: Boolean(customer.is_active),
        created_at: customer.created_at,
      };
    });
  }

  /**
   * Get active customers only
   */
  getActive() {
    const customers = this.db
      .prepare("SELECT * FROM customers WHERE is_active = 1 ORDER BY name")
      .all();

    return (customers as unknown[]).map((c) => {
      const customer = c as {
        id: number;
        name: string;
        category: string;
        code: string;
        is_active: number;
        created_at: string;
      };
      return {
        id: customer.id,
        name: customer.name,
        category: customer.category,
        code: customer.code,
        is_active: Boolean(customer.is_active),
        created_at: customer.created_at,
      };
    });
  }

  /**
   * Get active customer count
   */
  getActiveCount(): number {
    const result = this.db
      .prepare("SELECT COUNT(*) as count FROM customers WHERE is_active = 1")
      .get() as { count: number };
    return result.count;
  }

  /**
   * Get inactive customer count
   */
  getInactiveCount(): number {
    const result = this.db
      .prepare("SELECT COUNT(*) as count FROM customers WHERE is_active = 0")
      .get() as { count: number };
    return result.count;
  }
}
