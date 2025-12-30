import { type LoaderFunctionArgs } from "react-router";
import { db } from "~/db";
import { diagrams, tables, columns, relations } from "~/db/schema";
import { eq } from "drizzle-orm";

export async function loader({ params }: LoaderFunctionArgs) {
    const diagramId = params.id;
    if (!diagramId) throw new Response("Not Found", { status: 404 });

    const [diagram] = await db.select().from(diagrams).where(eq(diagrams.id, diagramId));
    if (!diagram) throw new Response("Not Found", { status: 404 });

    const fetchedTables = await db.select().from(tables).where(eq(tables.diagramId, diagramId));
    const fetchedColumns = await db.select().from(columns);
    const fetchedRelations = await db.select().from(relations).where(eq(relations.diagramId, diagramId));

    const dbType = diagram.databaseType || "generic";
    const q = dbType === "mysql" || dbType === "mariadb" ? "`" : '"';
    let sql = `-- Exported from DrawSQL Clone
        -- Diagram: ${diagram.name}
        -- Database: ${dbType}
        -- Date: ${new Date().toISOString()}

        `;

    for (const table of fetchedTables) {
        const tableColumns = fetchedColumns.filter(c => c.tableId === table.id);
        const tableRelations = fetchedRelations.filter(r => r.fromTableId === table.id);

        sql += `CREATE TABLE ${q}${table.name}${q} (\n`;

        const lines = [];

        for (const col of tableColumns) {
            let line = `  ${q}${col.name}${q} ${col.type}`;

            if (col.isPk) {
                line += " PRIMARY KEY";
            }

            if (!col.isNullable) {
                line += " NOT NULL";
            }

            lines.push(line);
        }

        sql += lines.join(",\n");
        sql += "\n);\n\n";
    }

    if (fetchedRelations.length > 0) {
        sql += "-- Foreign Keys\n";
        for (const rel of fetchedRelations) {
            const fromTable = fetchedTables.find(t => t.id === rel.fromTableId);
            const fromCol = fetchedColumns.find(c => c.id === rel.fromColumnId);
            const toTable = fetchedTables.find(t => t.id === rel.toTableId);
            const toCol = fetchedColumns.find(c => c.id === rel.toColumnId);

            if (fromTable && fromCol && toTable && toCol) {
                sql += `ALTER TABLE ${q}${fromTable.name}${q} ADD CONSTRAINT ${q}fk_${fromTable.name}_${fromCol.name}${q} FOREIGN KEY (${q}${fromCol.name}${q}) REFERENCES ${q}${toTable.name}${q}(${q}${toCol.name}${q});\n`;
            }
        }
    }

    return new Response(sql, {
        headers: {
            "Content-Type": "application/sql",
            "Content-Disposition": `attachment; filename="${diagram.name.replace(/\s+/g, '_')}.sql"`,
        },
    });
}
