import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), category: text("category").notNull(),
  origin: text("origin").notNull(), price: real("price").notNull(),
  stock: integer("stock").notNull().default(0), sales: integer("sales").notNull().default(0),
  rating: real("rating").notNull().default(5), traceCode: text("trace_code").notNull().unique(),
  badge: text("badge").notNull(), description: text("description").notNull(), icon: text("icon").notNull(),
});
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(), amount: real("amount").notNull(),
  itemsJson: text("items_json").notNull(), status: text("status").notNull().default("待发货"),
  createdAt: text("created_at").notNull(),
});
export const pointEvents = sqliteTable("point_events", {
  id: integer("id").primaryKey({ autoIncrement: true }), userKey: text("user_key").notNull(),
  kind: text("kind").notNull(), delta: integer("delta").notNull(), createdAt: text("created_at").notNull(),
});
