import { useState, useCallback, useMemo } from "react";
import { type LoaderFunctionArgs, type ActionFunctionArgs, useLoaderData, useFetcher } from "react-router";
import { diagramService } from "~/services/diagram.service";
import { Button } from "~/components/ui/button";
import { Plus, Minus, RotateCcw } from "lucide-react";

import { RelationArrows } from "~/components/diagram/relation-arrows";
import { DraggableTable } from "~/components/diagram/draggable-table";
import { EnumNode } from "~/components/diagram/enum-node";
import { useTheme } from "~/components/theme-provider";

import { useDiagramCanvas } from "~/hooks/use-diagram-canvas";
import { useDiagramRelations } from "~/hooks/use-diagram-relations";
import { DiagramHeader } from "~/components/diagram/diagram-header";
import { addTableAction } from "~/actions/diagram/add-table";
import { updateTableAction } from "~/actions/diagram/update-table";
import { deleteTableAction } from "~/actions/diagram/delete-table";
import { moveTableAction } from "~/actions/diagram/move-table";
import { addColumnAction } from "~/actions/diagram/add-column";
import { updateColumnAction } from "~/actions/diagram/update-column";
import { deleteColumnAction } from "~/actions/diagram/delete-column";
import { addRelationAction } from "~/actions/diagram/add-relation";
import { addEnumAction } from "~/actions/diagram/add-enum";
import { updateEnumAction } from "~/actions/diagram/update-enum";
import { deleteEnumAction } from "~/actions/diagram/delete-enum";
import { moveEnumAction } from "~/actions/diagram/move-enum";

export async function loader({ params }: LoaderFunctionArgs) {
    const diagramId = params.id;
    if (!diagramId) throw new Response("Not Found", { status: 404 });

    const diagram = await diagramService.getDiagramById(diagramId);
    if (!diagram) throw new Response("Not Found", { status: 404 });

    const [tables, columns, relations, enums, enumValues] = await Promise.all([
        diagramService.getTablesByDiagramId(diagramId),
        diagramService.getColumnsByDiagramId(diagramId),
        diagramService.getRelationsByDiagramId(diagramId),
        diagramService.getEnumsByDiagramId(diagramId),
        diagramService.getEnumValuesByDiagramId(diagramId)
    ]);

    return { diagram, tables, columns, relations, enums, enumValues };
}

export async function action({ request, params }: ActionFunctionArgs) {
    const formData = await request.formData();
    const intent = formData.get("intent");
    const diagramId = params.id!;

    switch (intent) {
        case "addTable":
            return addTableAction(formData, diagramId);
        case "updateTable":
            return updateTableAction(formData);
        case "deleteTable":
            return deleteTableAction(formData);
        case "moveTable":
            return moveTableAction(formData);
        case "addColumn":
            return addColumnAction(formData, diagramId);
        case "updateColumn":
            return updateColumnAction(formData, diagramId);
        case "deleteColumn":
            return deleteColumnAction(formData);
        case "addRelation":
            return addRelationAction(formData, diagramId);
        case "addEnum":
            return addEnumAction(formData, diagramId);
        case "updateEnum":
            return updateEnumAction(formData);
        case "deleteEnum":
            return deleteEnumAction(formData);
        case "moveEnum":
            return moveEnumAction(formData);
        default:
            return null;
    }
}

export default function DiagramEditor() {
    const { diagram, tables, columns, relations, enums, enumValues } = useLoaderData<typeof loader>();
    const fetcher = useFetcher();

    const relationState = useDiagramRelations(columns);
    const { updateArrows, arrowUpdateTrigger } = relationState;

    const {
        scale,
        pan,
        isPanning,
        canvasRef,
        handleZoomIn,
        handleZoomOut,
        handleResetZoom,
        handleCanvasMouseDown,
        handleCanvasMouseMove,
        setIsPanning
    } = useDiagramCanvas(tables, enums);

    const handleStop = useCallback((e: any, data: any, id: string) => {
        const isEnum = enums.some(en => en.id === id);
        fetcher.submit(
            { intent: isEnum ? "moveEnum" : "moveTable", id, x: data.x, y: data.y },
            { method: "post" }
        );
    }, [enums, fetcher]);

    // Pre-compute column lookups once - O(1) instead of O(n) per table
    const columnsByTable = useMemo(() => {
        const map = new Map<string, typeof columns>();
        for (const col of columns) {
            if (!map.has(col.tableId)) {
                map.set(col.tableId, []);
            }
            map.get(col.tableId)!.push(col);
        }
        return map;
    }, [columns]);

    // Pre-compute enum values lookups once
    const valuesByEnum = useMemo(() => {
        const map = new Map<string, typeof enumValues>();
        for (const val of enumValues) {
            if (!map.has(val.enumId)) {
                map.set(val.enumId, []);
            }
            map.get(val.enumId)!.push(val);
        }
        return map;
    }, [enumValues]);

    const { theme } = useTheme();
    // Direct computation - no need for useEffect + setTimeout
    const dotColor = useMemo(() => {
        return theme === "dark" ? "#334155" : "#cbd5e1";
    }, [theme]);


    return (
        <div className="h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
            <DiagramHeader
                diagram={diagram}
                tables={tables}
                fetcher={fetcher}
            />

            {/* Wrapper for canvas and floating controls */}
            <div className="flex-1 overflow-hidden relative">
                {/* Canvas */}
                <div
                    className={`h-full w-full overflow-hidden p-0 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                    id="canvas"
                    ref={canvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={() => setIsPanning(false)}
                    onMouseLeave={() => setIsPanning(false)}
                    style={{
                        backgroundImage: `radial-gradient(${dotColor} ${Math.max(0.5, 0.8 * scale)}px, transparent 0)`,
                        backgroundSize: `${20 * scale}px ${20 * scale}px`,
                        backgroundPosition: `${pan.x}px ${pan.y}px`,
                        opacity: scale < 0.4 ? 0.4 : (scale < 0.7 ? 0.7 : 1), // Optional: fade the whole background slightly if very zoomed out
                    }}
                >
                    {/* Arrows rendered first so they appear below nodes */}
                    <RelationArrows
                        relations={relations}
                        columns={columns}
                        scale={scale}
                        pan={pan}
                        canvasRef={canvasRef}
                        updateTrigger={arrowUpdateTrigger}
                    />

                    {/* Transformed container for tables - z-index higher than arrows */}
                    <div
                        id="transform-container"
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                            transformOrigin: '0 0',
                            width: '100%',
                            height: '100%',
                            position: 'relative',
                            zIndex: 10,
                        }}
                    >
                        {tables.map(table => {
                            const tableColumns = columnsByTable.get(table.id) ?? [];
                            return (
                                <DraggableTable
                                    key={table.id}
                                    table={table}
                                    columns={tableColumns}
                                    allTables={tables}
                                    allColumns={columns}
                                    relations={relations}
                                    onStop={handleStop}
                                    updateArrows={updateArrows}
                                    fetcher={fetcher}
                                    scale={scale}
                                    enums={enums}
                                    allEnumValues={enumValues}
                                />
                            );
                        })}

                        {enums.map(en => {
                            const values = valuesByEnum.get(en.id) ?? [];
                            return (
                                <EnumNode
                                    key={en.id}
                                    enumData={en}
                                    enumValues={values}
                                    allEnums={enums}
                                    allTables={tables}
                                    allColumns={columns}
                                    allEnumValues={enumValues}
                                    onStop={handleStop}
                                    updateArrows={updateArrows}
                                    fetcher={fetcher}
                                    scale={scale}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Floating controls - outside canvas to avoid event conflicts */}
                <div
                    className="absolute bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-auto"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl rounded-full p-1.5 ring-1 ring-slate-900/5 dark:ring-white/10">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={handleZoomOut} title="Zoom Out">
                            <Minus className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </Button>
                        <div className="w-12 text-center">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                                {Math.round(scale * 100)}%
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={handleZoomIn} title="Zoom In">
                            <Plus className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </Button>
                        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-1" />
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={handleResetZoom} title="Reset View">
                            <RotateCcw className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

