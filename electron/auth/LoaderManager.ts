/**
 * Loader Manager
 * Handles all loader-related database operations
 */
export class LoaderManager {
  private db: ReturnType<typeof import("better-sqlite3")>;

  constructor(db: ReturnType<typeof import("better-sqlite3")>) {
    this.db = db;
  }

  /**
   * Get all loaders with optional filters
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

    let query = "SELECT * FROM loaders WHERE 1=1";
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

    const loaders = this.db.prepare(query).all(...params);

    // Get total count
    let countQuery = "SELECT COUNT(*) as total FROM loaders WHERE 1=1";
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
      loaders: (loaders as unknown[]).map((l) => {
        const loader = l as {
          id: number;
          name: string;
          is_active: number;
          created_at: string;
        };
        return {
          id: loader.id,
          name: loader.name,
          is_active: Boolean(loader.is_active),
          created_at: loader.created_at,
        };
      }),
      total,
      page,
      limit,
    };
  }

  /**
   * Get loader by ID
   */
  getById(id: number) {
    const loader = this.db
      .prepare("SELECT * FROM loaders WHERE id = ?")
      .get(id) as {
      id: number;
      name: string;
      is_active: number;
      created_at: string;
    } | null;
    if (!loader) return null;

    return {
      id: loader.id,
      name: loader.name,
      is_active: Boolean(loader.is_active),
      created_at: loader.created_at,
    };
  }

  /**
   * Create new loader
   */
  create(data: { name: string; is_active?: boolean }) {
    const stmt = this.db.prepare(`
      INSERT INTO loaders (name, is_active)
      VALUES (?, ?)
    `);

    const result = stmt.run(
      data.name,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
    );

    const newLoader = this.getById(result.lastInsertRowid as number);
    if (!newLoader) {
      throw new Error("Failed to create loader");
    }

    return newLoader;
  }

  /**
   * Update existing loader
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
    const query = `UPDATE loaders SET ${updates.join(", ")} WHERE id = ?`;
    this.db.prepare(query).run(...params);

    return this.getById(id);
  }

  /**
   * Delete loader
   */
  delete(id: number) {
    const stmt = this.db.prepare(`
      DELETE FROM loaders
      WHERE id = ?
    `);

    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get active loaders only
   */
  getActive() {
    const loaders = this.db
      .prepare("SELECT * FROM loaders WHERE is_active = 1 ORDER BY name")
      .all();

    return (loaders as unknown[]).map((l) => {
      const loader = l as {
        id: number;
        name: string;
        is_active: number;
        created_at: string;
      };
      return {
        id: loader.id,
        name: loader.name,
        is_active: Boolean(loader.is_active),
        created_at: loader.created_at,
      };
    });
  }
}
