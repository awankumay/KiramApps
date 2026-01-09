/**
 * Payment Manager
 * Handles all payment method-related database operations
 */
export class PaymentManager {
  private db: ReturnType<typeof import("better-sqlite3")>;

  constructor(db: ReturnType<typeof import("better-sqlite3")>) {
    this.db = db;
  }

  /**
   * Get all payment methods with optional filters
   */
  getAll(
    filters: {
      name?: string;
      is_active?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { name, is_active, page = 1, limit = 20 } = filters;

    let query = "SELECT * FROM payment_methods WHERE 1=1";
    const params: (string | number | boolean)[] = [];

    if (name) {
      query += " AND name LIKE ?";
      params.push(`%${name}%`);
    }

    if (is_active !== undefined) {
      query += " AND is_active = ?";
      params.push(is_active ? 1 : 0);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const paymentMethods = this.db.prepare(query).all(...params);

    // Get total count
    let countQuery = "SELECT COUNT(*) as total FROM payment_methods WHERE 1=1";
    const countParams: (string | number | boolean)[] = [];

    if (name) {
      countQuery += " AND name LIKE ?";
      countParams.push(`%${name}%`);
    }

    if (is_active !== undefined) {
      countQuery += " AND is_active = ?";
      countParams.push(is_active ? 1 : 0);
    }

    const countResult = this.db.prepare(countQuery).get(...countParams);
    const total = (countResult as { total: number }).total;

    return {
      paymentMethods: (paymentMethods as unknown[]).map((p) => {
        const pm = p as {
          id: number;
          name: string;
          is_active: number;
          created_at: string;
        };
        return {
          id: pm.id,
          name: pm.name,
          is_active: Boolean(pm.is_active),
          created_at: pm.created_at,
        };
      }),
      total,
      page,
      limit,
    };
  }

  /**
   * Get payment method by ID
   */
  getById(id: number) {
    const paymentMethod = this.db
      .prepare("SELECT * FROM payment_methods WHERE id = ?")
      .get(id) as {
      id: number;
      name: string;
      is_active: number;
      created_at: string;
    } | null;
    if (!paymentMethod) return null;

    return {
      id: paymentMethod.id,
      name: paymentMethod.name,
      is_active: Boolean(paymentMethod.is_active),
      created_at: paymentMethod.created_at,
    };
  }

  /**
   * Create new payment method
   */
  create(data: { name: string; is_active?: boolean }) {
    const stmt = this.db.prepare(`
      INSERT INTO payment_methods (name, is_active)
      VALUES (?, ?)
    `);

    const result = stmt.run(
      data.name,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
    );

    const newPaymentMethod = this.getById(result.lastInsertRowid as number);
    if (!newPaymentMethod) {
      throw new Error("Failed to create payment method");
    }

    return newPaymentMethod;
  }

  /**
   * Update existing payment method
   */
  update(id: number, data: { name?: string; is_active?: boolean }) {
    // Build dynamic update query
    const updates: string[] = [];
    const params: (string | number | boolean)[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      params.push(data.name);
    }

    if (data.is_active !== undefined) {
      updates.push("is_active = ?");
      params.push(data.is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    params.push(id);
    const query = `UPDATE payment_methods SET ${updates.join(
      ", "
    )} WHERE id = ?`;
    this.db.prepare(query).run(...params);

    return this.getById(id);
  }

  /**
   * Delete payment method
   */
  delete(id: number) {
    const stmt = this.db.prepare(`
      DELETE FROM payment_methods
      WHERE id = ?
    `);

    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get active payment methods only
   */
  getActive() {
    const paymentMethods = this.db
      .prepare(
        "SELECT * FROM payment_methods WHERE is_active = 1 ORDER BY name"
      )
      .all();

    return (paymentMethods as unknown[]).map((p) => {
      const pm = p as {
        id: number;
        name: string;
        is_active: number;
        created_at: string;
      };
      return {
        id: pm.id,
        name: pm.name,
        is_active: Boolean(pm.is_active),
        created_at: pm.created_at,
      };
    });
  }
}
