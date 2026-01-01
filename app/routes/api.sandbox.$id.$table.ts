import { type LoaderFunctionArgs, type ActionFunctionArgs, data } from "react-router";
import { sandboxService } from "~/services/sandbox.service";

/**
 * GET /api/sandbox/:id/:table - Get all rows from table
 */
export async function loader({ params }: LoaderFunctionArgs) {
    const { id: diagramId, table: tableName } = params;
    if (!diagramId || !tableName) {
        throw new Response("Diagram ID and table name required", { status: 400 });
    }

    const result = await sandboxService.getRows(diagramId, tableName);
    if (!result.success) {
        throw new Response(result.error || "Failed to get rows", { status: 500 });
    }

    return data({ rows: result.data });
}

/**
 * POST /api/sandbox/:id/:table - Insert new row
 * PUT /api/sandbox/:id/:table - Update row (requires pkColumn and pkValue in body)
 * DELETE /api/sandbox/:id/:table - Delete row (requires pkColumn and pkValue in body)
 */
export async function action({ request, params }: ActionFunctionArgs) {
    const { id: diagramId, table: tableName } = params;
    if (!diagramId || !tableName) {
        throw new Response("Diagram ID and table name required", { status: 400 });
    }

    const formData = await request.formData();
    const intent = formData.get("intent") as string;

    if (request.method === "POST" || intent === "insert") {
        // Get all form fields except intent
        const rowData: Record<string, any> = {};
        for (const [key, value] of formData.entries()) {
            if (key !== "intent" && key !== "pkColumn") {
                if (value === "__NULL__") {
                    rowData[key] = null;
                } else if (value !== "") {
                    rowData[key] = value;
                }
                // We omit empty strings for insertion to allow DB defaults to kick in
            }
        }

        const result = await sandboxService.insertRow(diagramId, tableName, rowData);
        return data(result);
    }

    if (intent === "update") {
        const pkColumn = formData.get("pkColumn") as string;
        const pkValue = formData.get("pkValue") as string;

        if (!pkColumn || pkValue === null) {
            throw new Response("Primary key column and value required", { status: 400 });
        }

        const rowData: Record<string, any> = {};
        for (const [key, value] of formData.entries()) {
            if (key !== "intent" && key !== "pkColumn" && key !== "pkValue") {
                rowData[key] = value === "" ? null : value;
            }
        }

        const result = await sandboxService.updateRow(diagramId, tableName, pkColumn, pkValue, rowData);
        return data(result);
    }

    if (intent === "delete") {
        const pkColumn = formData.get("pkColumn") as string;
        const pkValue = formData.get("pkValue") as string;

        if (!pkColumn || pkValue === null) {
            throw new Response("Primary key column and value required", { status: 400 });
        }

        const result = await sandboxService.deleteRow(diagramId, tableName, pkColumn, pkValue);
        return data(result);
    }

    throw new Response("Invalid intent", { status: 400 });
}
