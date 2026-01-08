// TypeScript type for better-sqlite3 Database
type DatabaseInstance = ReturnType<typeof import("better-sqlite3")>;

export interface ItemData {
  id: number;
  name: string;
  unit: string;
  price: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateItemData {
  name: string;
  unit: string;
  price: number;
  isActive?: boolean;
}

export interface UpdateItemData {
  name?: string;
  unit?: string;
  price?: number;
  isActive?: boolean;
}

export interface PriceHistoryData {
  id: number;
  itemId: number;
  oldPrice: number | null;
  newPrice: number;
  changedBy: number | null;
  changedAt: string;
}

/**
 * ItemsManager handles CRUD operations for items
 */
export class ItemsManager {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  /**
   * Get all items
   */
  getAllItems(): ItemData[] {
    const stmt = this.db.prepare(`
      SELECT
        id,
        name,
        unit,
        price,
        is_active as isActive,
        created_at as createdAt
      FROM items
      ORDER BY created_at DESC
    `);

    return stmt.all() as ItemData[];
  }

  /**
   * Get single item by ID
   */
  getItemById(itemId: number): ItemData | null {
    const stmt = this.db.prepare(`
      SELECT
        id,
        name,
        unit,
        price,
        is_active as isActive,
        created_at as createdAt
      FROM items
      WHERE id = ?
    `);

    const item = stmt.get(itemId) as ItemData | undefined;
    return item || null;
  }

  /**
   * Get price history for an item
   */
  getPriceHistory(itemId: number): PriceHistoryData[] {
    const stmt = this.db.prepare(`
      SELECT
        id,
        item_id as itemId,
        old_price as oldPrice,
        new_price as newPrice,
        changed_by as changedBy,
        changed_at as changedAt
      FROM item_price_history
      WHERE item_id = ?
      ORDER BY changed_at DESC
    `);

    return stmt.all(itemId) as PriceHistoryData[];
  }

  /**
   * Create new item
   */
  createItem(data: CreateItemData): ItemData {
    const stmt = this.db.prepare(`
      INSERT INTO items (name, unit, price, is_active)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.name,
      data.unit,
      data.price,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1
    );

    const newItem = this.getItemById(result.lastInsertRowid as number);
    if (!newItem) {
      throw new Error("Failed to create item");
    }

    return newItem;
  }

  /**
   * Update existing item
   */
  updateItem(
    itemId: number,
    data: UpdateItemData,
    userId?: number
  ): ItemData | null {
    // Get current item for price history
    const currentItem = this.getItemById(itemId);
    if (!currentItem) {
      return null;
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | number | boolean)[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }

    if (data.unit !== undefined) {
      updates.push("unit = ?");
      values.push(data.unit);
    }

    if (data.price !== undefined) {
      updates.push("price = ?");
      values.push(data.price);
    }

    if (data.isActive !== undefined) {
      updates.push("is_active = ?");
      values.push(data.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return currentItem;
    }

    values.push(itemId);

    const stmt = this.db.prepare(`
      UPDATE items
      SET ${updates.join(", ")}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    // Log price change if price was updated
    if (data.price !== undefined && data.price !== currentItem.price) {
      const insertHistory = this.db.prepare(`
        INSERT INTO item_price_history (item_id, old_price, new_price, changed_by)
        VALUES (?, ?, ?, ?)
      `);
      insertHistory.run(itemId, currentItem.price, data.price, userId || null);
    }

    return this.getItemById(itemId);
  }

  /**
   * Delete item
   */
  deleteItem(itemId: number): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM items
      WHERE id = ?
    `);

    const result = stmt.run(itemId);
    return result.changes > 0;
  }

  /**
   * Toggle item status (active/inactive)
   */
  toggleItemStatus(itemId: number): ItemData | null {
    const item = this.getItemById(itemId);
    if (!item) {
      return null;
    }

    const newStatus = !item.isActive;
    return this.updateItem(itemId, { isActive: newStatus });
  }

  /**
   * Search items by name
   */
  searchItems(query: string): ItemData[] {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        name,
        unit,
        is_active as isActive,
        created_at as createdAt
      FROM items
      WHERE name LIKE ?
      ORDER BY created_at DESC
    `);

    return stmt.all(`%${query}%`) as ItemData[];
  }

  /**
   * Get active items only
   */
  getActiveItems(): ItemData[] {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        name,
        unit,
        price,
        is_active as isActive,
        created_at as createdAt
      FROM items
      WHERE is_active = 1
      ORDER BY name ASC
    `);

    return stmt.all() as ItemData[];
  }
}
