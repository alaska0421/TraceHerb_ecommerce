import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), category: text("category").notNull(),
  origin: text("origin").notNull(), price: real("price").notNull(),
  stock: integer("stock").notNull().default(0), sales: integer("sales").notNull().default(0),
  rating: real("rating").notNull().default(5), traceCode: text("trace_code").notNull().unique(),
  badge: text("badge").notNull(), description: text("description").notNull(), icon: text("icon").notNull(),
  merchantId: integer("merchant_id"),
});
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(), amount: real("amount").notNull(),
  itemsJson: text("items_json").notNull(), status: text("status").notNull().default("待发货"),
  createdAt: text("created_at").notNull(), userId: integer("user_id"),
  paymentMethod: text("payment_method"), transactionId: text("transaction_id"),
  paidAt: text("paid_at"), shippedAt: text("shipped_at"), completedAt: text("completed_at"),
});
export const paymentTransactions = sqliteTable("payment_transactions", {
  id: text("id").primaryKey(), orderId: text("order_id").notNull(),
  userId: integer("user_id").notNull(), username: text("username").notNull(),
  method: text("method").notNull(), amount: real("amount").notNull(),
  status: text("status").notNull(), environment: text("environment").notNull().default("sandbox"),
  createdAt: text("created_at").notNull(), paidAt: text("paid_at"),
});
export const pointEvents = sqliteTable("point_events", {
  id: integer("id").primaryKey({ autoIncrement: true }), userKey: text("user_key").notNull(),
  kind: text("kind").notNull(), delta: integer("delta").notNull(), createdAt: text("created_at").notNull(),
  eventDate: text("event_date"),
});
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  points: integer("points").notNull().default(0),
  role: text("role").notNull().default("buyer"), shopName: text("shop_name"),
  createdAt: text("created_at").notNull(),
});
export const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: integer("user_id").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});
export const merchantOrderStatus = sqliteTable("merchant_order_status", {
  orderId: text("order_id").notNull(), merchantId: integer("merchant_id").notNull(),
  amount: real("amount").notNull(), status: text("status").notNull().default("待发货"),
  shippedAt: text("shipped_at"), completedAt: text("completed_at"),
});
