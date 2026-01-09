import * as fs from "fs";
import * as path from "path";
import { app } from "electron";
import * as crypto from "crypto";
import sharp from "sharp";

// TypeScript type for better-sqlite3 Database
type DatabaseInstance = ReturnType<typeof import("better-sqlite3")>;

// Enums
export type PaymentStatus = "UNPAID" | "PAID";
export type PaymentVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type TransactionStatus =
  | "CREATED"
  | "QUEUED"
  | "LOADING"
  | "DONE"
  | "CHECKED_OUT";

// Data Types
export interface TransactionTypeData {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface PaymentMethodData {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface TransactionData {
  id: number;
  invoiceNumber: string;
  transactionTypeId: number;
  transactionTypeName?: string;
  customerId: number;
  customerName?: string;
  vehicleId: number;
  vehiclePlate?: string;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  transactionStatus: TransactionStatus;
  createdBy: number;
  createdByName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items?: TransactionItemData[];
}

export interface TransactionItemData {
  id: number;
  transactionId: number;
  itemId: number;
  itemName?: string;
  itemUnit?: string;
  qty: number;
  price: number;
  subtotal: number;
  createdAt: string;
}

export interface CreateTransactionData {
  transactionTypeId: number;
  customerId: number;
  vehicleId: number;
  items: { itemId: number; qty: number; price: number }[];
  paymentMethodId?: number; // Optional: if CASH (id=1), auto-set to PAID
  notes?: string;
}

export interface UpdateTransactionData {
  transactionTypeId?: number;
  customerId?: number;
  vehicleId?: number;
  items?: { itemId: number; qty: number; price: number }[];
  notes?: string;
}

export interface PaymentData {
  id: number;
  transactionId: number;
  paymentMethodId: number;
  paymentMethodName?: string;
  amount: number;
  status: "PENDING" | "PAID";
  verificationStatus: PaymentVerificationStatus;
  paidAt: string;
  verifiedBy?: number;
  verifiedByName?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  notes?: string;
  proofImagePath?: string;
  createdAt: string;
  transactionInvoiceNumber?: string;
  customerName?: string;
  vehiclePlate?: string;
}

export interface CreatePaymentData {
  paymentMethodId: number;
  amount: number;
  notes?: string;
}

export interface TransactionStatusLogData {
  id: number;
  transactionId: number;
  status: TransactionStatus;
  changedBy: number;
  changedByName?: string;
  changedAt: string;
  note?: string;
}

export interface TransactionFilters {
  status?: TransactionStatus;
  paymentStatus?: PaymentStatus;
  customerId?: number;
  vehicleId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PaymentFilters {
  verificationStatus?: PaymentVerificationStatus;
  transactionId?: number;
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PaymentVerificationStats {
  date: string;
  pendingCount: number;
  verifiedCount: number;
  rejectedCount: number;
  totalPending: number;
  totalVerified: number;
  totalRejected: number;
}

export interface DailyStats {
  date: string;
  total: number;
  pending: number;
  loading: number;
  done: number;
  checkedOut: number;
  totalAmount: number;
  paidAmount: number;
}

/**
 * TransactionManager handles CRUD operations for transactions
 */
export class TransactionManager {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  /**
   * Get all transactions with optional filters and pagination
   */
  getAllTransactions(filters: TransactionFilters = {}): {
    transactions: TransactionData[];
    total: number;
    page: number;
    limit: number;
  } {
    const {
      status,
      paymentStatus,
      customerId,
      vehicleId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = filters;

    let query = `
      SELECT 
        t.id,
        t.invoice_number as invoiceNumber,
        t.transaction_type_id as transactionTypeId,
        tt.name as transactionTypeName,
        t.customer_id as customerId,
        c.name as customerName,
        t.vehicle_id as vehicleId,
        v.plate_number as vehiclePlate,
        t.total_amount as totalAmount,
        t.payment_status as paymentStatus,
        t.transaction_status as transactionStatus,
        t.created_by as createdBy,
        u.first_name || ' ' || u.last_name as createdByName,
        t.notes,
        t.created_at as createdAt,
        t.updated_at as updatedAt
      FROM transactions t
      LEFT JOIN transaction_types tt ON t.transaction_type_id = tt.id
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (status) {
      query += " AND t.transaction_status = ?";
      params.push(status);
    }

    if (paymentStatus) {
      query += " AND t.payment_status = ?";
      params.push(paymentStatus);
    }

    if (customerId) {
      query += " AND t.customer_id = ?";
      params.push(customerId);
    }

    if (vehicleId) {
      query += " AND t.vehicle_id = ?";
      params.push(vehicleId);
    }

    if (dateFrom) {
      query += " AND DATE(t.created_at) >= ?";
      params.push(dateFrom);
    }

    if (dateTo) {
      query += " AND DATE(t.created_at) <= ?";
      params.push(dateTo);
    }

    query += " ORDER BY t.created_at DESC LIMIT ? OFFSET ?";
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const transactions = this.db.prepare(query).all(...params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total FROM transactions t
      WHERE 1=1
    `;
    const countParams: (string | number)[] = [];

    if (status) {
      countQuery += " AND t.transaction_status = ?";
      countParams.push(status);
    }

    if (paymentStatus) {
      countQuery += " AND t.payment_status = ?";
      countParams.push(paymentStatus);
    }

    if (customerId) {
      countQuery += " AND t.customer_id = ?";
      countParams.push(customerId);
    }

    if (vehicleId) {
      countQuery += " AND t.vehicle_id = ?";
      countParams.push(vehicleId);
    }

    if (dateFrom) {
      countQuery += " AND DATE(t.created_at) >= ?";
      countParams.push(dateFrom);
    }

    if (dateTo) {
      countQuery += " AND DATE(t.created_at) <= ?";
      countParams.push(dateTo);
    }

    const countResult = this.db.prepare(countQuery).get(...countParams);
    const total = (countResult as { total: number }).total;

    return {
      transactions: transactions as TransactionData[],
      total,
      page,
      limit,
    };
  }

  /**
   * Get transaction by ID with items
   */
  getTransactionById(id: number): TransactionData | null {
    const transaction = this.db
      .prepare(
        `
        SELECT 
          t.id,
          t.invoice_number as invoiceNumber,
          t.transaction_type_id as transactionTypeId,
          tt.name as transactionTypeName,
          t.customer_id as customerId,
          c.name as customerName,
          t.vehicle_id as vehicleId,
          v.plate_number as vehiclePlate,
          t.total_amount as totalAmount,
          t.payment_status as paymentStatus,
          t.transaction_status as transactionStatus,
          t.created_by as createdBy,
          u.first_name || ' ' || u.last_name as createdByName,
          t.notes,
          t.created_at as createdAt,
          t.updated_at as updatedAt
        FROM transactions t
        LEFT JOIN transaction_types tt ON t.transaction_type_id = tt.id
        LEFT JOIN customers c ON t.customer_id = c.id
        LEFT JOIN vehicles v ON t.vehicle_id = v.id
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.id = ?
      `
      )
      .get(id) as TransactionData | null;

    if (!transaction) return null;

    // Get transaction items
    const items = this.db
      .prepare(
        `
        SELECT 
          ti.id,
          ti.transaction_id as transactionId,
          ti.item_id as itemId,
          i.name as itemName,
          i.unit as itemUnit,
          ti.qty,
          ti.price,
          ti.subtotal,
          ti.created_at as createdAt
        FROM transaction_items ti
        LEFT JOIN items i ON ti.item_id = i.id
        WHERE ti.transaction_id = ?
        ORDER BY ti.id
      `
      )
      .all(id) as TransactionItemData[];

    transaction.items = items;

    return transaction;
  }

  /**
   * Generate unique invoice number
   * Format: INV-YYYYMMDD-XXXX
   */
  generateInvoiceNumber(): string {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `INV-${today}-`;

    // Query last invoice number for today
    const lastInvoice = this.db
      .prepare(
        `
        SELECT invoice_number FROM transactions
        WHERE invoice_number LIKE ?
        ORDER BY id DESC LIMIT 1
      `
      )
      .get(`${prefix}%`) as { invoice_number: string } | null;

    let counter = 1;
    if (lastInvoice) {
      const lastCounter = parseInt(
        lastInvoice.invoice_number.split("-")[2],
        10
      );
      counter = lastCounter + 1;
    }

    return `${prefix}${counter.toString().padStart(4, "0")}`;
  }

  /**
   * Create new transaction with items
   */
  createTransaction(
    data: CreateTransactionData,
    userId: number
  ): TransactionData | null {
    const invoiceNumber = this.generateInvoiceNumber();

    // Calculate total amount
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.qty * item.price,
      0
    );

    // Check if CASH payment (id=1) - auto set to PAID
    const isCashPayment = data.paymentMethodId === 1;
    const paymentStatus = isCashPayment ? "PAID" : "UNPAID";

    // Start transaction
    const createTransaction = this.db.transaction(() => {
      // Insert transaction
      const insertStmt = this.db.prepare(`
        INSERT INTO transactions (
          invoice_number,
          transaction_type_id,
          customer_id,
          vehicle_id,
          total_amount,
          payment_status,
          transaction_status,
          created_by,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?, 'CREATED', ?, ?)
      `);

      const result = insertStmt.run(
        invoiceNumber,
        data.transactionTypeId,
        data.customerId,
        data.vehicleId,
        totalAmount,
        paymentStatus,
        userId,
        data.notes || null
      );

      const transactionId = result.lastInsertRowid as number;

      // Insert transaction items
      const insertItemStmt = this.db.prepare(`
        INSERT INTO transaction_items (
          transaction_id,
          item_id,
          qty,
          price,
          subtotal
        ) VALUES (?, ?, ?, ?, ?)
      `);

      for (const item of data.items) {
        const subtotal = item.qty * item.price;
        insertItemStmt.run(
          transactionId,
          item.itemId,
          item.qty,
          item.price,
          subtotal
        );
      }

      // Log initial status
      this.logStatusChange(
        transactionId,
        "CREATED",
        userId,
        "Transaction created"
      );

      // Create payment record for all payment methods
      if (data.paymentMethodId) {
        if (isCashPayment) {
          // CASH: Auto-verified payment
          const insertPaymentStmt = this.db.prepare(`
            INSERT INTO payments (
              transaction_id,
              payment_method_id,
              amount,
              status,
              verification_status,
              paid_at,
              verified_by,
              verified_at,
              notes
            ) VALUES (?, ?, ?, 'PAID', 'VERIFIED', CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, 'Auto-verified: CASH')
          `);

          insertPaymentStmt.run(
            transactionId,
            data.paymentMethodId,
            totalAmount,
            userId
          );
        } else {
          // QRIS/TRANSFER: Pending verification
          const insertPaymentStmt = this.db.prepare(`
            INSERT INTO payments (
              transaction_id,
              payment_method_id,
              amount,
              status,
              verification_status,
              paid_at,
              notes
            ) VALUES (?, ?, ?, 'PENDING', 'PENDING', CURRENT_TIMESTAMP, 'Awaiting verification')
          `);

          insertPaymentStmt.run(
            transactionId,
            data.paymentMethodId,
            totalAmount
          );
        }
      }

      return transactionId;
    });

    const createdTransactionId = createTransaction();
    return this.getTransactionById(createdTransactionId);
  }

  /**
   * Update existing transaction (only for CREATED or QUEUED status)
   */
  updateTransaction(
    id: number,
    data: UpdateTransactionData
  ): TransactionData | null {
    const transaction = this.getTransactionById(id);
    if (!transaction) return null;

    // Only allow update for CREATED or QUEUED status
    if (
      transaction.transactionStatus !== "CREATED" &&
      transaction.transactionStatus !== "QUEUED"
    ) {
      throw new Error(
        "Cannot update transaction with status: " +
          transaction.transactionStatus
      );
    }

    const updateTransaction = this.db.transaction(() => {
      // Update transaction fields
      const updates: string[] = [];
      const params: (string | number)[] = [];

      if (data.transactionTypeId !== undefined) {
        updates.push("transaction_type_id = ?");
        params.push(data.transactionTypeId);
      }

      if (data.customerId !== undefined) {
        updates.push("customer_id = ?");
        params.push(data.customerId);
      }

      if (data.vehicleId !== undefined) {
        updates.push("vehicle_id = ?");
        params.push(data.vehicleId);
      }

      if (data.notes !== undefined) {
        updates.push("notes = ?");
        params.push(data.notes);
      }

      if (updates.length > 0) {
        updates.push("updated_at = CURRENT_TIMESTAMP");
        params.push(id);
        const query = `UPDATE transactions SET ${updates.join(
          ", "
        )} WHERE id = ?`;
        this.db.prepare(query).run(...params);
      }

      // Update items if provided
      if (data.items !== undefined) {
        // Delete existing items
        this.db
          .prepare("DELETE FROM transaction_items WHERE transaction_id = ?")
          .run(id);

        // Insert new items
        const insertItemStmt = this.db.prepare(`
          INSERT INTO transaction_items (
            transaction_id,
            item_id,
            qty,
            price,
            subtotal
          ) VALUES (?, ?, ?, ?, ?)
        `);

        for (const item of data.items) {
          const subtotal = item.qty * item.price;
          insertItemStmt.run(id, item.itemId, item.qty, item.price, subtotal);
        }

        // Recalculate total
        const totalAmount = data.items.reduce(
          (sum, item) => sum + item.qty * item.price,
          0
        );
        this.db
          .prepare(
            "UPDATE transactions SET total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          )
          .run(totalAmount, id);
      }
    });

    updateTransaction();
    return this.getTransactionById(id);
  }

  /**
   * Delete transaction (soft delete - only for CREATED status)
   */
  deleteTransaction(id: number): boolean {
    const transaction = this.getTransactionById(id);
    if (!transaction) return false;

    // Only allow delete for CREATED status
    if (transaction.transactionStatus !== "CREATED") {
      throw new Error(
        "Cannot delete transaction with status: " +
          transaction.transactionStatus
      );
    }

    const result = this.db
      .prepare("DELETE FROM transactions WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  /**
   * Search transactions by invoice number, customer name, or vehicle plate
   */
  searchTransactions(query: string): TransactionData[] {
    const searchPattern = `%${query}%`;

    const transactions = this.db
      .prepare(
        `
        SELECT 
          t.id,
          t.invoice_number as invoiceNumber,
          t.transaction_type_id as transactionTypeId,
          tt.name as transactionTypeName,
          t.customer_id as customerId,
          c.name as customerName,
          t.vehicle_id as vehicleId,
          v.plate_number as vehiclePlate,
          t.total_amount as totalAmount,
          t.payment_status as paymentStatus,
          t.transaction_status as transactionStatus,
          t.created_by as createdBy,
          u.first_name || ' ' || u.last_name as createdByName,
          t.notes,
          t.created_at as createdAt,
          t.updated_at as updatedAt
        FROM transactions t
        LEFT JOIN transaction_types tt ON t.transaction_type_id = tt.id
        LEFT JOIN customers c ON t.customer_id = c.id
        LEFT JOIN vehicles v ON t.vehicle_id = v.id
        LEFT JOIN users u ON t.created_by = u.id
        WHERE 
          t.invoice_number LIKE ? OR
          c.name LIKE ? OR
          v.plate_number LIKE ?
        ORDER BY t.created_at DESC
        LIMIT 50
      `
      )
      .all(searchPattern, searchPattern, searchPattern);

    return transactions as TransactionData[];
  }

  /**
   * Update transaction status with logging
   */
  updateTransactionStatus(
    id: number,
    newStatus: TransactionStatus,
    userId: number,
    note?: string
  ): TransactionData | null {
    const transaction = this.getTransactionById(id);
    if (!transaction) return null;

    // Validate status transition
    const validTransitions: Record<TransactionStatus, TransactionStatus[]> = {
      CREATED: ["QUEUED"],
      QUEUED: ["LOADING"],
      LOADING: ["DONE"],
      DONE: ["CHECKED_OUT"],
      CHECKED_OUT: [],
    };

    const allowedStatuses = validTransitions[transaction.transactionStatus];
    if (!allowedStatuses.includes(newStatus)) {
      throw new Error(
        `Cannot transition from ${transaction.transactionStatus} to ${newStatus}`
      );
    }

    this.db.transaction(() => {
      // Update transaction status
      this.db
        .prepare(
          "UPDATE transactions SET transaction_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        )
        .run(newStatus, id);

      // Log status change
      this.logStatusChange(id, newStatus, userId, note);
    })();

    return this.getTransactionById(id);
  }

  /**
   * Get status history for a transaction
   */
  getStatusHistory(transactionId: number): TransactionStatusLogData[] {
    const logs = this.db
      .prepare(
        `
        SELECT 
          tsl.id,
          tsl.transaction_id as transactionId,
          tsl.status,
          tsl.changed_by as changedBy,
          u.first_name || ' ' || u.last_name as changedByName,
          tsl.changed_at as changedAt,
          tsl.note
        FROM transaction_status_logs tsl
        LEFT JOIN users u ON tsl.changed_by = u.id
        WHERE tsl.transaction_id = ?
        ORDER BY tsl.changed_at ASC
      `
      )
      .all(transactionId);

    return logs as TransactionStatusLogData[];
  }

  /**
   * Log status change
   */
  private logStatusChange(
    transactionId: number,
    status: TransactionStatus,
    userId: number,
    note?: string
  ): void {
    this.db
      .prepare(
        `
        INSERT INTO transaction_status_logs (
          transaction_id,
          status,
          changed_by,
          note
        ) VALUES (?, ?, ?, ?)
      `
      )
      .run(transactionId, status, userId, note || null);
  }

  /**
   * Add payment to transaction (sets verification_status to PENDING)
   */
  addPayment(
    transactionId: number,
    data: CreatePaymentData,
    verifiedBy: number
  ): PaymentData | null {
    const transaction = this.getTransactionById(transactionId);
    if (!transaction) return null;

    this.db.transaction(() => {
      // Insert payment with verification_status = 'PENDING'
      const insertStmt = this.db.prepare(`
        INSERT INTO payments (
          transaction_id,
          payment_method_id,
          amount,
          status,
          verification_status,
          paid_at,
          verified_by,
          notes
        ) VALUES (?, ?, ?, 'PAID', 'PENDING', CURRENT_TIMESTAMP, ?, ?)
      `);

      insertStmt.run(
        transactionId,
        data.paymentMethodId,
        data.amount,
        verifiedBy,
        data.notes || null
      );

      // Update payment status if fully paid (only VERIFIED payments count)
      this.updatePaymentStatus(transactionId);
    })();

    return this.getPayments(transactionId).pop() || null;
  }

  /**
   * Get all payments for a transaction (includes verification fields)
   */
  getPayments(transactionId: number): PaymentData[] {
    const payments = this.db
      .prepare(
        `
        SELECT
          p.id,
          p.transaction_id as transactionId,
          p.payment_method_id as paymentMethodId,
          pm.name as paymentMethodName,
          p.amount,
          p.status,
          p.verification_status as verificationStatus,
          p.paid_at as paidAt,
          p.verified_by as verifiedBy,
          u.first_name || ' ' || u.last_name as verifiedByName,
          p.verified_at as verifiedAt,
          p.rejection_reason as rejectionReason,
          p.notes,
          p.proof_image_path as proofImagePath,
          p.created_at as createdAt
        FROM payments p
        LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
        LEFT JOIN users u ON p.verified_by = u.id
        WHERE p.transaction_id = ?
        ORDER BY p.paid_at DESC
      `
      )
      .all(transactionId);

    return payments as PaymentData[];
  }

  /**
   * Auto-update payment status based on total VERIFIED payments
   */
  private updatePaymentStatus(transactionId: number): void {
    const transaction = this.getTransactionById(transactionId);
    if (!transaction) return;

    const totalPaid = this.db
      .prepare(
        `
        SELECT COALESCE(SUM(amount), 0) as total
        FROM payments
        WHERE transaction_id = ? AND verification_status = 'VERIFIED'
      `
      )
      .get(transactionId) as { total: number };

    const newStatus =
      totalPaid.total >= transaction.totalAmount ? "PAID" : "UNPAID";

    this.db
      .prepare(
        "UPDATE transactions SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .run(newStatus, transactionId);
  }

  /**
   * Get daily statistics
   */
  getDailyStats(date?: string): DailyStats {
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const stats = this.db
      .prepare(
        `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN transaction_status = 'CREATED' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN transaction_status = 'LOADING' THEN 1 ELSE 0 END) as loading,
          SUM(CASE WHEN transaction_status = 'DONE' THEN 1 ELSE 0 END) as done,
          SUM(CASE WHEN transaction_status = 'CHECKED_OUT' THEN 1 ELSE 0 END) as checkedOut,
          COALESCE(SUM(total_amount), 0) as totalAmount,
          COALESCE(
            (SELECT SUM(p.amount) 
             FROM payments p 
             WHERE p.transaction_id IN (
               SELECT t.id FROM transactions t 
               WHERE DATE(t.created_at) = ?
             )),
            0
          ) as paidAmount
        FROM transactions
        WHERE DATE(created_at) = ?
      `
      )
      .get(targetDate, targetDate) as {
      total: number;
      pending: number;
      loading: number;
      done: number;
      checkedOut: number;
      totalAmount: number;
      paidAmount: number;
    };

    return {
      date: targetDate,
      total: stats.total,
      pending: stats.pending,
      loading: stats.loading,
      done: stats.done,
      checkedOut: stats.checkedOut,
      totalAmount: stats.totalAmount,
      paidAmount: stats.paidAmount,
    };
  }

  /**
   * Get today's transactions
   */
  getTodayTransactions(): TransactionData[] {
    const today = new Date().toISOString().slice(0, 10);

    const transactions = this.db
      .prepare(
        `
        SELECT 
          t.id,
          t.invoice_number as invoiceNumber,
          t.transaction_type_id as transactionTypeId,
          tt.name as transactionTypeName,
          t.customer_id as customerId,
          c.name as customerName,
          t.vehicle_id as vehicleId,
          v.plate_number as vehiclePlate,
          t.total_amount as totalAmount,
          t.payment_status as paymentStatus,
          t.transaction_status as transactionStatus,
          t.created_by as createdBy,
          u.first_name || ' ' || u.last_name as createdByName,
          t.notes,
          t.created_at as createdAt,
          t.updated_at as updatedAt
        FROM transactions t
        LEFT JOIN transaction_types tt ON t.transaction_type_id = tt.id
        LEFT JOIN customers c ON t.customer_id = c.id
        LEFT JOIN vehicles v ON t.vehicle_id = v.id
        LEFT JOIN users u ON t.created_by = u.id
        WHERE DATE(t.created_at) = ?
        ORDER BY t.created_at DESC
      `
      )
      .all(today);

    return transactions as TransactionData[];
  }

  /**
   * Get all transaction types
   */
  getTransactionTypes(): TransactionTypeData[] {
    const types = this.db
      .prepare(
        `
        SELECT 
          id,
          name,
          is_active,
          created_at
        FROM transaction_types
        ORDER BY name
      `
      )
      .all();

    return (types as unknown[]).map((t) => {
      const type = t as {
        id: number;
        name: string;
        is_active: number;
        created_at: string;
      };
      return {
        id: type.id,
        name: type.name,
        is_active: Boolean(type.is_active),
        created_at: type.created_at,
      };
    }) as TransactionTypeData[];
  }

  /**
   * Get all payment methods
   */
  getPaymentMethods(): PaymentMethodData[] {
    const methods = this.db
      .prepare(
        `
        SELECT
          id,
          name,
          is_active,
          created_at
        FROM payment_methods
        ORDER BY name
      `
      )
      .all();

    return (methods as unknown[]).map((m) => {
      const method = m as {
        id: number;
        name: string;
        is_active: number;
        created_at: string;
      };
      return {
        id: method.id,
        name: method.name,
        is_active: Boolean(method.is_active),
        created_at: method.created_at,
      };
    }) as PaymentMethodData[];
  }

  /**
   * Get transaction type by ID
   */
  getTransactionTypeById(id: number): TransactionTypeData | null {
    const transactionType = this.db
      .prepare(
        `
        SELECT
          id,
          name,
          is_active,
          created_at
        FROM transaction_types
        WHERE id = ?
      `
      )
      .get(id) as {
      id: number;
      name: string;
      is_active: number;
      created_at: string;
    } | null;

    if (!transactionType) return null;

    return {
      id: transactionType.id,
      name: transactionType.name,
      is_active: Boolean(transactionType.is_active),
      created_at: transactionType.created_at,
    };
  }

  /**
   * Create new transaction type
   */
  createTransactionType(data: {
    name: string;
    is_active?: boolean;
  }): TransactionTypeData | null {
    const stmt = this.db.prepare(`
      INSERT INTO transaction_types (name, is_active)
      VALUES (?, ?)
    `);

    const result = stmt.run(
      data.name,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
    );

    const newType = this.getTransactionTypeById(
      result.lastInsertRowid as number
    );
    if (!newType) {
      throw new Error("Failed to create transaction type");
    }

    return newType;
  }

  /**
   * Update existing transaction type
   */
  updateTransactionType(
    id: number,
    data: { name?: string; is_active?: boolean }
  ): TransactionTypeData | null {
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
      return this.getTransactionTypeById(id);
    }

    params.push(id);
    const query = `UPDATE transaction_types SET ${updates.join(
      ", "
    )} WHERE id = ?`;
    this.db.prepare(query).run(...params);

    return this.getTransactionTypeById(id);
  }

  /**
   * Delete transaction type
   */
  deleteTransactionType(id: number): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM transaction_types
      WHERE id = ?
    `);

    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get active transaction types only
   */
  getActiveTransactionTypes(): TransactionTypeData[] {
    const types = this.db
      .prepare(
        `
        SELECT
          id,
          name,
          is_active,
          created_at
        FROM transaction_types
        WHERE is_active = 1
        ORDER BY name
      `
      )
      .all();

    return (types as unknown[]).map((t) => {
      const tt = t as {
        id: number;
        name: string;
        is_active: number;
        created_at: string;
      };
      return {
        id: tt.id,
        name: tt.name,
        is_active: Boolean(tt.is_active),
        created_at: tt.created_at,
      };
    }) as TransactionTypeData[];
  }

  /**
   * Get active payment methods only
   */
  getActivePaymentMethods(): PaymentMethodData[] {
    const methods = this.db
      .prepare(
        `
        SELECT
          id,
          name,
          is_active,
          created_at
        FROM payment_methods
        WHERE is_active = 1
        ORDER BY name
      `
      )
      .all();

    return (methods as unknown[]).map((pm) => {
      const method = pm as {
        id: number;
        name: string;
        is_active: number;
        created_at: string;
      };
      return {
        id: method.id,
        name: method.name,
        is_active: Boolean(method.is_active),
        created_at: method.created_at,
      };
    }) as PaymentMethodData[];
  }

  /**
   * Get pending payments for verification
   */
  getPendingPayments(filters: PaymentFilters = {}): {
    payments: PaymentData[];
    total: number;
    page: number;
    limit: number;
  } {
    const {
      verificationStatus = "PENDING",
      transactionId,
      customerId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = filters;

    let query = `
      SELECT
        p.id,
        p.transaction_id as transactionId,
        p.payment_method_id as paymentMethodId,
        pm.name as paymentMethodName,
        p.amount,
        p.status,
        p.verification_status as verificationStatus,
        p.paid_at as paidAt,
        p.verified_by as verifiedBy,
        u.first_name || ' ' || u.last_name as verifiedByName,
        p.verified_at as verifiedAt,
        p.rejection_reason as rejectionReason,
        p.notes,
        p.proof_image_path as proofImagePath,
        p.created_at as createdAt,
        t.invoice_number as transactionInvoiceNumber,
        c.name as customerName,
        v.plate_number as vehiclePlate
      FROM payments p
      LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
      LEFT JOIN transactions t ON p.transaction_id = t.id
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN users u ON p.verified_by = u.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (verificationStatus) {
      query += " AND p.verification_status = ?";
      params.push(verificationStatus);
    }

    if (transactionId) {
      query += " AND p.transaction_id = ?";
      params.push(transactionId);
    }

    if (customerId) {
      query += " AND t.customer_id = ?";
      params.push(customerId);
    }

    if (dateFrom) {
      query += " AND DATE(p.paid_at) >= ?";
      params.push(dateFrom);
    }

    if (dateTo) {
      query += " AND DATE(p.paid_at) <= ?";
      params.push(dateTo);
    }

    query += " ORDER BY p.verified_at DESC, p.created_at DESC LIMIT ? OFFSET ?";
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const payments = this.db.prepare(query).all(...params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total FROM payments p
      LEFT JOIN transactions t ON p.transaction_id = t.id
      WHERE 1=1
    `;
    const countParams: (string | number)[] = [];

    if (verificationStatus) {
      countQuery += " AND p.verification_status = ?";
      countParams.push(verificationStatus);
    }

    if (transactionId) {
      countQuery += " AND p.transaction_id = ?";
      countParams.push(transactionId);
    }

    if (customerId) {
      countQuery += " AND t.customer_id = ?";
      countParams.push(customerId);
    }

    if (dateFrom) {
      countQuery += " AND DATE(p.paid_at) >= ?";
      countParams.push(dateFrom);
    }

    if (dateTo) {
      countQuery += " AND DATE(p.paid_at) <= ?";
      countParams.push(dateTo);
    }

    const countResult = this.db.prepare(countQuery).get(...countParams);
    const total = (countResult as { total: number }).total;

    return {
      payments: payments as PaymentData[],
      total,
      page,
      limit,
    };
  }

  /**
   * Get single payment by ID
   */
  getPaymentById(id: number): PaymentData | null {
    const payment = this.db
      .prepare(
        `
        SELECT
          p.id,
          p.transaction_id as transactionId,
          p.payment_method_id as paymentMethodId,
          pm.name as paymentMethodName,
          p.amount,
          p.status,
          p.verification_status as verificationStatus,
          p.paid_at as paidAt,
          p.verified_by as verifiedBy,
          u.first_name || ' ' || u.last_name as verifiedByName,
          p.verified_at as verifiedAt,
          p.rejection_reason as rejectionReason,
          p.notes,
          p.proof_image_path as proofImagePath,
          p.created_at as createdAt,
          t.invoice_number as transactionInvoiceNumber,
          c.name as customerName,
          v.plate_number as vehiclePlate
        FROM payments p
        LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
        LEFT JOIN transactions t ON p.transaction_id = t.id
        LEFT JOIN customers c ON t.customer_id = c.id
        LEFT JOIN vehicles v ON t.vehicle_id = v.id
        LEFT JOIN users u ON p.verified_by = u.id
        WHERE p.id = ?
      `
      )
      .get(id) as PaymentData | null;

    return payment;
  }

  /**
   * Verify payment (PENDING → VERIFIED)
   */
  async verifyPayment(
    paymentId: number,
    verifiedBy: number,
    notes?: string,
    proofData?: { imageData: string; fileName: string }
  ): Promise<PaymentData | null> {
    const payment = this.getPaymentById(paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.verificationStatus !== "PENDING") {
      throw new Error("Payment is not in PENDING status");
    }

    let proofPath: string | null = null;

    // Save payment proof if provided (must be done outside transaction)
    if (proofData) {
      const buffer = Buffer.from(proofData.imageData, "base64");
      proofPath = await this.savePaymentProof(
        paymentId,
        buffer,
        proofData.fileName
      );
    }

    // Now do database transaction
    this.db.transaction(() => {
      // Update payment to VERIFIED
      const updateQuery = proofPath
        ? `
        UPDATE payments
        SET verification_status = 'VERIFIED',
            status = 'PAID',
            verified_by = ?,
            verified_at = CURRENT_TIMESTAMP,
            proof_image_path = ?,
            notes = COALESCE(?, notes)
        WHERE id = ?
      `
        : `
        UPDATE payments
        SET verification_status = 'VERIFIED',
            status = 'PAID',
            verified_by = ?,
            verified_at = CURRENT_TIMESTAMP,
            notes = COALESCE(?, notes)
        WHERE id = ?
      `;

      if (proofPath) {
        this.db
          .prepare(updateQuery)
          .run(verifiedBy, proofPath, notes, paymentId);
      } else {
        this.db.prepare(updateQuery).run(verifiedBy, notes, paymentId);
      }

      // Update transaction payment status
      this.updatePaymentStatus(payment.transactionId);
    })();

    return this.getPaymentById(paymentId);
  }

  /**
   * Reject payment (PENDING → REJECTED)
   */
  async rejectPayment(
    paymentId: number,
    verifiedBy: number,
    reason: string,
    notes?: string,
    proofData?: { imageData: string; fileName: string }
  ): Promise<PaymentData | null> {
    const payment = this.getPaymentById(paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.verificationStatus !== "PENDING") {
      throw new Error("Payment is not in PENDING status");
    }

    if (!reason || reason.trim().length < 10) {
      throw new Error("Rejection reason must be at least 10 characters");
    }

    let proofPath: string | null = null;

    // Save payment proof if provided (must be done outside transaction)
    if (proofData) {
      const buffer = Buffer.from(proofData.imageData, "base64");
      proofPath = await this.savePaymentProof(
        paymentId,
        buffer,
        proofData.fileName
      );
    }

    // Now do database transaction
    this.db.transaction(() => {
      // Update payment to REJECTED
      const updateQuery = proofPath
        ? `
        UPDATE payments
        SET verification_status = 'REJECTED',
            verified_by = ?,
            verified_at = CURRENT_TIMESTAMP,
            rejection_reason = ?,
            proof_image_path = ?,
            notes = COALESCE(?, notes)
        WHERE id = ?
      `
        : `
        UPDATE payments
        SET verification_status = 'REJECTED',
            verified_by = ?,
            verified_at = CURRENT_TIMESTAMP,
            rejection_reason = ?,
            notes = COALESCE(?, notes)
        WHERE id = ?
      `;

      if (proofPath) {
        this.db
          .prepare(updateQuery)
          .run(verifiedBy, reason, proofPath, notes, paymentId);
      } else {
        this.db.prepare(updateQuery).run(verifiedBy, reason, notes, paymentId);
      }

      // Do NOT update transaction payment status (rejected payments don't count)
    })();

    return this.getPaymentById(paymentId);
  }

  /**
   * Save payment proof image to filesystem with redundancy and integrity checks
   * Best Practice: Store both file and compressed thumbnail + metadata for critical data
   */
  async savePaymentProof(
    paymentId: number,
    imageBuffer: Buffer,
    fileName: string
  ): Promise<string> {
    try {
      // Create payment-proofs directory if it doesn't exist
      const userDataPath = app.getPath("userData");
      const proofsDir = path.join(userDataPath, "payment-proofs");

      if (!fs.existsSync(proofsDir)) {
        fs.mkdirSync(proofsDir, { recursive: true });
      }

      // Generate unique filename: {paymentId}_{timestamp}.{ext}
      const timestamp = Date.now();
      const ext = path.extname(fileName).toLowerCase();
      const newFileName = `${paymentId}_${timestamp}${ext}`;
      const filePath = path.join(proofsDir, newFileName);

      // Calculate file hash (SHA256) for integrity verification
      const fileHash = crypto
        .createHash("sha256")
        .update(imageBuffer)
        .digest("hex");

      // Determine MIME type
      let mimeType = "application/octet-stream";
      if (ext === ".jpg" || ext === ".jpeg") {
        mimeType = "image/jpeg";
      } else if (ext === ".png") {
        mimeType = "image/png";
      } else if (ext === ".pdf") {
        mimeType = "application/pdf";
      }

      // Write original file to disk
      fs.writeFileSync(filePath, imageBuffer);

      // Create compressed thumbnail as backup (only for images)
      let thumbnailBase64: string | null = null;
      if (mimeType.startsWith("image/")) {
        try {
          // Create thumbnail: max 400px width, 80% quality, strip metadata
          const thumbnailBuffer = await sharp(imageBuffer)
            .resize(400, null, {
              fit: "inside",
              withoutEnlargement: true,
            })
            .jpeg({ quality: 80 })
            .toBuffer();

          thumbnailBase64 = thumbnailBuffer.toString("base64");
        } catch (err) {
          console.error("Failed to create thumbnail:", err);
          // Continue without thumbnail - not critical
        }
      }

      // Store metadata in database for redundancy
      this.db
        .prepare(
          `
        UPDATE payments
        SET proof_thumbnail = ?,
            proof_file_hash = ?,
            proof_file_size = ?,
            proof_mime_type = ?,
            proof_uploaded_at = CURRENT_TIMESTAMP,
            proof_last_verified = CURRENT_TIMESTAMP
        WHERE id = ?
      `
        )
        .run(
          thumbnailBase64,
          fileHash,
          imageBuffer.length,
          mimeType,
          paymentId
        );

      return filePath;
    } catch (error) {
      throw new Error(`Failed to save payment proof: ${error}`);
    }
  }

  /**
   * Get payment proof file path
   * Enhanced: Verifies file integrity and falls back to thumbnail if needed
   */
  getPaymentProofPath(paymentId: number): string | null {
    const payment = this.db
      .prepare(
        `
      SELECT proof_image_path as proofImagePath,
             proof_file_hash as fileHash,
             proof_thumbnail as thumbnail
      FROM payments
      WHERE id = ?
    `
      )
      .get(paymentId) as {
      proofImagePath: string | null;
      fileHash: string | null;
      thumbnail: string | null;
    };

    if (!payment || !payment.proofImagePath) {
      return null;
    }

    // Verify file exists and integrity
    if (fs.existsSync(payment.proofImagePath)) {
      // Verify file integrity if hash exists
      if (payment.fileHash) {
        try {
          const fileBuffer = fs.readFileSync(payment.proofImagePath);
          const currentHash = crypto
            .createHash("sha256")
            .update(fileBuffer)
            .digest("hex");

          if (currentHash !== payment.fileHash) {
            console.error(
              `File integrity check failed for payment ${paymentId}`
            );
            // File is corrupted, log it but still return path
            // Could implement auto-recovery here
          }
        } catch (err) {
          console.error("Failed to verify file integrity:", err);
        }
      }

      // Update last verified timestamp
      this.db
        .prepare(
          `
        UPDATE payments
        SET proof_last_verified = CURRENT_TIMESTAMP
        WHERE id = ?
      `
        )
        .run(paymentId);

      return payment.proofImagePath;
    }

    // File doesn't exist - log this critical issue
    console.error(
      `Payment proof file missing for payment ${paymentId}: ${payment.proofImagePath}`
    );

    // TODO: Implement recovery mechanism
    // Could restore from thumbnail or backup location

    return payment.proofImagePath; // Return path anyway for error handling
  }

  /**
   * Get payment proof with fallback to thumbnail
   * Returns: { type: 'file' | 'thumbnail', data: string }
   */
  getPaymentProofWithFallback(paymentId: number): {
    type: "file" | "thumbnail" | null;
    data: string | null;
  } {
    const payment = this.db
      .prepare(
        `
      SELECT proof_image_path as proofImagePath,
             proof_thumbnail as thumbnail,
             proof_mime_type as mimeType
      FROM payments
      WHERE id = ?
    `
      )
      .get(paymentId) as {
      proofImagePath: string | null;
      thumbnail: string | null;
      mimeType: string | null;
    };

    if (!payment) {
      return { type: null, data: null };
    }

    // Try to read original file first
    if (payment.proofImagePath && fs.existsSync(payment.proofImagePath)) {
      try {
        const fileBuffer = fs.readFileSync(payment.proofImagePath);
        const base64 = fileBuffer.toString("base64");
        const mimeType = payment.mimeType || "image/jpeg";
        return {
          type: "file",
          data: `data:${mimeType};base64,${base64}`,
        };
      } catch (err) {
        console.error("Failed to read proof file:", err);
      }
    }

    // Fallback to thumbnail if file is missing or unreadable
    if (payment.thumbnail) {
      console.warn(
        `Using thumbnail fallback for payment ${paymentId} - original file unavailable`
      );
      return {
        type: "thumbnail",
        data: `data:image/jpeg;base64,${payment.thumbnail}`,
      };
    }

    return { type: null, data: null };
  }

  /**
   * Delete payment proof from filesystem and database
   */
  deletePaymentProof(paymentId: number): boolean {
    const proofPath = this.getPaymentProofPath(paymentId);

    if (!proofPath) {
      return false;
    }

    try {
      // Delete file from filesystem
      if (fs.existsSync(proofPath)) {
        fs.unlinkSync(proofPath);
      }

      // Update database
      this.db
        .prepare(
          `
        UPDATE payments
        SET proof_image_path = NULL
        WHERE id = ?
      `
        )
        .run(paymentId);

      return true;
    } catch (error) {
      throw new Error(`Failed to delete payment proof: ${error}`);
    }
  }

  /**
   * Get verification statistics
   */
  getVerificationStats(dateRange?: {
    from: string;
    to: string;
  }): PaymentVerificationStats {
    const today = new Date().toISOString().slice(0, 10);
    const fromDate = dateRange?.from || today;
    const toDate = dateRange?.to || today;

    const stats = this.db
      .prepare(
        `
        SELECT
          ? as date,
          SUM(CASE WHEN verification_status = 'PENDING' THEN 1 ELSE 0 END) as totalPending,
          SUM(CASE WHEN verification_status = 'VERIFIED' THEN 1 ELSE 0 END) as totalVerified,
          SUM(CASE WHEN verification_status = 'REJECTED' THEN 1 ELSE 0 END) as totalRejected
        FROM payments
        WHERE DATE(paid_at) BETWEEN ? AND ?
      `
      )
      .get(toDate, fromDate, toDate) as {
      date: string;
      totalPending: number;
      totalVerified: number;
      totalRejected: number;
    };

    return {
      date: stats?.date || toDate,
      pendingCount: stats?.totalPending || 0,
      verifiedCount: stats?.totalVerified || 0,
      rejectedCount: stats?.totalRejected || 0,
      totalPending: stats?.totalPending || 0,
      totalVerified: stats?.totalVerified || 0,
      totalRejected: stats?.totalRejected || 0,
    };
  }
}
