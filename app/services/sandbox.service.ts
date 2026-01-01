import Database from "better-sqlite3";
import { db } from "~/db";
import { diagrams, tables, columns, relations, enums, enumValues } from "~/db/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const SANDBOXES_DIR = path.join(process.cwd(), "sandboxes");

// Ensure sandboxes directory exists
function ensureSandboxDir() {
    if (!fs.existsSync(SANDBOXES_DIR)) {
        fs.mkdirSync(SANDBOXES_DIR, { recursive: true });
    }
}

function getSandboxPath(diagramId: string): string {
    return path.join(SANDBOXES_DIR, `sandbox-${diagramId}.db`);
}

function getSandboxDb(diagramId: string): Database.Database | null {
    const dbPath = getSandboxPath(diagramId);
    if (!fs.existsSync(dbPath)) {
        return null;
    }
    const sandboxDb = new Database(dbPath);
    sandboxDb.pragma("foreign_keys = ON");
    return sandboxDb;
}

interface SandboxStatus {
    exists: boolean;
    isStale: boolean;
    tableCount: number;
    schemaHash?: string;
}

interface CrudResult {
    success: boolean;
    data?: any;
    error?: string;
}

export class SandboxService {
    /**
     * Get current status of sandbox for a diagram
     */
    async getSandboxStatus(diagramId: string): Promise<SandboxStatus> {
        const dbPath = getSandboxPath(diagramId);
        const exists = fs.existsSync(dbPath);

        if (!exists) {
            return { exists: false, isStale: false, tableCount: 0 };
        }

        const sandboxDb = getSandboxDb(diagramId);
        if (!sandboxDb) {
            return { exists: false, isStale: false, tableCount: 0 };
        }

        try {
            // Get table count from sandbox
            const tableRows = sandboxDb.prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_schema_hash'"
            ).all() as { name: string }[];

            // Get schema hash to check staleness
            const hashRow = sandboxDb.prepare(
                "SELECT hash FROM _schema_hash LIMIT 1"
            ).get() as { hash: string } | undefined;

            // Calculate current schema hash
            const currentHash = await this.calculateSchemaHash(diagramId);
            const isStale = hashRow?.hash !== currentHash;

            sandboxDb.close();

            return {
                exists: true,
                isStale,
                tableCount: tableRows.length,
                schemaHash: hashRow?.hash
            };
        } catch (e) {
            sandboxDb.close();
            return { exists: true, isStale: true, tableCount: 0 };
        }
    }

    /**
     * Calculate a hash of the current diagram schema
     */
    private async calculateSchemaHash(diagramId: string): Promise<string> {
        const fetchedTables = await db.select().from(tables).where(eq(tables.diagramId, diagramId));
        const allColumns = await db.select().from(columns);
        const fetchedRelations = await db.select().from(relations).where(eq(relations.diagramId, diagramId));

        const tableColumns = allColumns.filter(c =>
            fetchedTables.some(t => t.id === c.tableId)
        );

        // Create a deterministic string representation
        const schemaStr = JSON.stringify({
            tables: fetchedTables.map(t => ({ id: t.id, name: t.name })).sort((a, b) => a.id.localeCompare(b.id)),
            columns: tableColumns.map(c => ({
                id: c.id,
                tableId: c.tableId,
                name: c.name,
                type: c.type,
                isPk: c.isPk,
                isNullable: c.isNullable,
                defaultValue: c.defaultValue
            })).sort((a, b) => a.id.localeCompare(b.id)),
            relations: fetchedRelations.map(r => ({
                fromTableId: r.fromTableId,
                fromColumnId: r.fromColumnId,
                toTableId: r.toTableId,
                toColumnId: r.toColumnId
            })).sort((a, b) => a.fromColumnId.localeCompare(b.fromColumnId))
        });

        // Simple hash function
        let hash = 0;
        for (let i = 0; i < schemaStr.length; i++) {
            const char = schemaStr.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }

    /**
     * Initialize or reset the sandbox database
     */
    async initializeSandbox(diagramId: string): Promise<CrudResult> {
        ensureSandboxDir();

        // Fetch diagram data
        const [diagram] = await db.select().from(diagrams).where(eq(diagrams.id, diagramId));
        if (!diagram) {
            return { success: false, error: "Diagram not found" };
        }

        const fetchedTables = await db.select().from(tables).where(eq(tables.diagramId, diagramId));
        const allColumns = await db.select().from(columns);
        const fetchedRelations = await db.select().from(relations).where(eq(relations.diagramId, diagramId));

        // Filter columns for this diagram's tables
        const tableIds = new Set(fetchedTables.map(t => t.id));
        const tableColumns = allColumns.filter(c => tableIds.has(c.tableId));

        // Delete existing sandbox if any
        const dbPath = getSandboxPath(diagramId);
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }

        // Create new sandbox database
        const sandboxDb = new Database(dbPath);
        sandboxDb.pragma("foreign_keys = ON");

        try {
            // Create schema hash table
            sandboxDb.exec("CREATE TABLE _schema_hash (hash TEXT)");
            const schemaHash = await this.calculateSchemaHash(diagramId);
            sandboxDb.prepare("INSERT INTO _schema_hash (hash) VALUES (?)").run(schemaHash);

            // Sort tables by dependency (tables referenced by FKs should be created first)
            const sortedTables = this.sortTablesByDependency(fetchedTables, fetchedRelations);

            // Create tables
            for (const table of sortedTables) {
                const cols = tableColumns.filter(c => c.tableId === table.id);
                const sql = this.generateCreateTableSql(table, cols, fetchedRelations, fetchedTables, tableColumns);
                sandboxDb.exec(sql);
            }

            sandboxDb.close();
            return { success: true };
        } catch (e: any) {
            sandboxDb.close();
            // Clean up on error
            if (fs.existsSync(dbPath)) {
                fs.unlinkSync(dbPath);
            }
            return { success: false, error: e.message };
        }
    }

    /**
     * Sort tables so that referenced tables come before tables with FKs
     */
    private sortTablesByDependency(
        tableList: any[],
        relationList: any[]
    ): any[] {
        const sorted: any[] = [];
        const remaining = [...tableList];
        const added = new Set<string>();

        // Tables that are referenced by FKs (should be created first)
        const referencedTableIds = new Set(relationList.map(r => r.toTableId));

        // Add referenced tables first
        for (const table of remaining) {
            if (referencedTableIds.has(table.id)) {
                // Check if this table itself has FKs to other referenced tables
                const hasFkToOther = relationList.some(
                    r => r.fromTableId === table.id && referencedTableIds.has(r.toTableId) && r.toTableId !== table.id
                );
                if (!hasFkToOther) {
                    sorted.push(table);
                    added.add(table.id);
                }
            }
        }

        // Add remaining tables
        for (const table of remaining) {
            if (!added.has(table.id)) {
                sorted.push(table);
            }
        }

        return sorted;
    }

    /**
     * Generate CREATE TABLE SQL statement
     */
    private generateCreateTableSql(
        table: any,
        cols: any[],
        relationList: any[],
        allTables: any[],
        allColumns: any[]
    ): string {
        const lines: string[] = [];

        for (const col of cols) {
            let line = `"${col.name}" ${this.mapToSqliteType(col.type)}`;
            if (col.isPk) line += " PRIMARY KEY";
            if (!col.isNullable) line += " NOT NULL";
            if (col.defaultValue) {
                if (col.defaultValue === "uuid()") {
                    line += " DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || lower(hex(randomblob(2))) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2,3) || '-' || lower(hex(randomblob(6))))";
                } else if (col.defaultValue === "now()") {
                    line += " DEFAULT (datetime('now'))";
                } else if (col.defaultValue.toUpperCase() === "NULL") {
                    line += " DEFAULT NULL";
                } else {
                    const type = col.type.toUpperCase();
                    if (["INT", "BIGINT", "INTEGER", "BOOLEAN"].some(t => type.includes(t))) {
                        // Numeric or boolean literal
                        if (col.defaultValue === "true") line += " DEFAULT 1";
                        else if (col.defaultValue === "false") line += " DEFAULT 0";
                        else line += ` DEFAULT ${col.defaultValue}`;
                    } else if (["FLOAT", "DECIMAL", "REAL"].some(t => type.includes(t))) {
                        line += ` DEFAULT ${col.defaultValue}`;
                    } else {
                        // String/Date literal - quote if not already quoted
                        const val = col.defaultValue;
                        const isQuoted = (val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'));
                        line += ` DEFAULT ${isQuoted ? val : `'${val.replace(/'/g, "''")}'`}`;
                    }
                }
            }
            lines.push(line);
        }

        // Add foreign key constraints
        const tableFks = relationList.filter(r => r.fromTableId === table.id);
        for (const fk of tableFks) {
            const fromCol = allColumns.find(c => c.id === fk.fromColumnId);
            const toTable = allTables.find(t => t.id === fk.toTableId);
            const toCol = allColumns.find(c => c.id === fk.toColumnId);

            if (fromCol && toTable && toCol) {
                lines.push(
                    `FOREIGN KEY ("${fromCol.name}") REFERENCES "${toTable.name}"("${toCol.name}")`
                );
            }
        }

        return `CREATE TABLE "${table.name}" (\n  ${lines.join(",\n  ")}\n);`;
    }

    /**
     * Map SQL types to SQLite types
     */
    private mapToSqliteType(sqlType: string): string {
        const t = sqlType.toUpperCase();
        if (t.includes("INT")) return "INTEGER";
        if (t.includes("CHAR") || t.includes("TEXT") || t.includes("UUID") || t.includes("VARCHAR")) return "TEXT";
        if (t.includes("BOOL")) return "INTEGER";
        if (t.includes("DATE") || t.includes("TIME")) return "TEXT";
        if (t.includes("FLOAT") || t.includes("REAL") || t.includes("DECIMAL") || t.includes("DOUBLE")) return "REAL";
        return "TEXT";
    }

    /**
     * Delete sandbox database
     */
    async deleteSandbox(diagramId: string): Promise<void> {
        const dbPath = getSandboxPath(diagramId);
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }
    }

    /**
     * Get all rows from a table
     */
    async getRows(diagramId: string, tableName: string): Promise<CrudResult> {
        const sandboxDb = getSandboxDb(diagramId);
        if (!sandboxDb) {
            return { success: false, error: "Sandbox not initialized" };
        }

        try {
            const rows = sandboxDb.prepare(`SELECT * FROM "${tableName}"`).all();
            sandboxDb.close();
            return { success: true, data: rows };
        } catch (e: any) {
            sandboxDb.close();
            return { success: false, error: e.message };
        }
    }

    /**
     * Insert a new row
     */
    async insertRow(
        diagramId: string,
        tableName: string,
        data: Record<string, any>
    ): Promise<CrudResult> {
        const sandboxDb = getSandboxDb(diagramId);
        if (!sandboxDb) {
            return { success: false, error: "Sandbox not initialized" };
        }

        try {
            let sql = "";
            let values: any[] = [];
            let result: any;

            if (Object.keys(data).length === 0) {
                sql = `INSERT INTO "${tableName}" DEFAULT VALUES`;
                const stmt = sandboxDb.prepare(sql);
                result = stmt.run();
            } else {
                const keys = Object.keys(data);
                values = Object.values(data);
                const placeholders = keys.map(() => "?").join(", ");
                const columnsStr = keys.map(k => `"${k}"`).join(", ");
                sql = `INSERT INTO "${tableName}" (${columnsStr}) VALUES (${placeholders})`;
                const stmt = sandboxDb.prepare(sql);
                result = stmt.run(...values);
            }

            sandboxDb.close();

            return {
                success: true,
                data: { lastInsertRowid: result.lastInsertRowid }
            };
        } catch (e: any) {
            sandboxDb.close();
            return { success: false, error: e.message };
        }
    }

    /**
     * Update an existing row by primary key
     */
    async updateRow(
        diagramId: string,
        tableName: string,
        pkColumn: string,
        pkValue: any,
        data: Record<string, any>
    ): Promise<CrudResult> {
        const sandboxDb = getSandboxDb(diagramId);
        if (!sandboxDb) {
            return { success: false, error: "Sandbox not initialized" };
        }

        try {
            const setClause = Object.keys(data)
                .map(k => `"${k}" = ?`)
                .join(", ");
            const values = [...Object.values(data), pkValue];

            const stmt = sandboxDb.prepare(
                `UPDATE "${tableName}" SET ${setClause} WHERE "${pkColumn}" = ?`
            );
            stmt.run(...values);
            sandboxDb.close();

            return { success: true };
        } catch (e: any) {
            sandboxDb.close();
            return { success: false, error: e.message };
        }
    }

    /**
     * Delete a row by primary key
     */
    async deleteRow(
        diagramId: string,
        tableName: string,
        pkColumn: string,
        pkValue: any
    ): Promise<CrudResult> {
        const sandboxDb = getSandboxDb(diagramId);
        if (!sandboxDb) {
            return { success: false, error: "Sandbox not initialized" };
        }

        try {
            const stmt = sandboxDb.prepare(
                `DELETE FROM "${tableName}" WHERE "${pkColumn}" = ?`
            );
            stmt.run(pkValue);
            sandboxDb.close();

            return { success: true };
        } catch (e: any) {
            sandboxDb.close();
            return { success: false, error: e.message };
        }
    }

    /**
     * Get table info (columns) from sandbox
     */
    async getTableInfo(diagramId: string, tableName: string): Promise<CrudResult> {
        const sandboxDb = getSandboxDb(diagramId);
        if (!sandboxDb) {
            return { success: false, error: "Sandbox not initialized" };
        }

        try {
            const info = sandboxDb.prepare(`PRAGMA table_info("${tableName}")`).all();
            sandboxDb.close();
            return { success: true, data: info };
        } catch (e: any) {
            sandboxDb.close();
            return { success: false, error: e.message };
        }
    }
}

export const sandboxService = new SandboxService();
