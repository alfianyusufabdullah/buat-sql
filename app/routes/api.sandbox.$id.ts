import { type LoaderFunctionArgs, type ActionFunctionArgs, data } from "react-router";
import { sandboxService } from "~/services/sandbox.service";

/**
 * GET /api/sandbox/:id - Get sandbox status
 */
export async function loader({ params }: LoaderFunctionArgs) {
    const diagramId = params.id;
    if (!diagramId) {
        throw new Response("Diagram ID required", { status: 400 });
    }

    const status = await sandboxService.getSandboxStatus(diagramId);
    return data(status);
}

/**
 * POST /api/sandbox/:id - Initialize or reset sandbox
 * DELETE /api/sandbox/:id - Delete sandbox
 */
export async function action({ request, params }: ActionFunctionArgs) {
    const diagramId = params.id;
    if (!diagramId) {
        throw new Response("Diagram ID required", { status: 400 });
    }

    if (request.method === "POST") {
        const result = await sandboxService.initializeSandbox(diagramId);
        return data(result);
    }

    if (request.method === "DELETE") {
        await sandboxService.deleteSandbox(diagramId);
        return data({ success: true });
    }

    throw new Response("Method not allowed", { status: 405 });
}
