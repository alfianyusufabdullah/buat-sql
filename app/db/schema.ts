import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const diagrams = sqliteTable("diagrams", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    databaseType: text("database_type").notNull().default("generic"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const tables = sqliteTable("tables", {
    id: text("id").primaryKey(),
    diagramId: text("diagram_id").notNull().references(() => diagrams.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    x: real("x").notNull().default(0),
    y: real("y").notNull().default(0),
    color: text("color").notNull().default("#3b82f6"), // blue default
});

export const columns = sqliteTable("columns", {
    id: text("id").primaryKey(),
    tableId: text("table_id").notNull().references(() => tables.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    type: text("type").notNull(), // VARCHAR, INT, etc.
    isPk: integer("is_pk", { mode: "boolean" }).default(false),
    isNullable: integer("is_nullable", { mode: "boolean" }).default(false),
    enumId: text("enum_id").references(() => enums.id, { onDelete: 'set null' }),
    defaultValue: text("default_value"), // e.g. "uuid()", "now()", or literal value
});

export const enums = sqliteTable("enums", {
    id: text("id").primaryKey(),
    diagramId: text("diagram_id").notNull().references(() => diagrams.id, { onDelete: 'cascade' }),
    name: text("name").notNull(),
    x: real("x").notNull().default(0),
    y: real("y").notNull().default(0),
    color: text("color").notNull().default("#10b981"),
});

export const enumValues = sqliteTable("enum_values", {
    id: text("id").primaryKey(),
    enumId: text("enum_id").notNull().references(() => enums.id, { onDelete: 'cascade' }),
    value: text("value").notNull(),
});

export const relations = sqliteTable("relations", {
    id: text("id").primaryKey(),
    diagramId: text("diagram_id").notNull().references(() => diagrams.id, { onDelete: 'cascade' }),
    fromTableId: text("from_table_id").notNull().references(() => tables.id, { onDelete: 'cascade' }),
    fromColumnId: text("from_column_id").notNull().references(() => columns.id, { onDelete: 'cascade' }),
    toTableId: text("to_table_id").notNull().references(() => tables.id, { onDelete: 'cascade' }),
    toColumnId: text("to_column_id").notNull().references(() => columns.id, { onDelete: 'cascade' }),
    onDelete: text("on_delete").notNull().default("NO ACTION"),
    onUpdate: text("on_update").notNull().default("NO ACTION"),
});
