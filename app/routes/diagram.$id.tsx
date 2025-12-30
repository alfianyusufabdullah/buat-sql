import { type LoaderFunctionArgs, type ActionFunctionArgs, data, useLoaderData, useFetcher } from "react-router";
import { diagramService } from "~/services/diagram.service";
import { Button } from "~/components/ui/button";
import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, ArrowLeft, Minus, RotateCcw } from "lucide-react";
import { Link } from "react-router";

import { RelationArrows } from "~/components/diagram/relation-arrows";
import { DraggableTable } from "~/components/diagram/draggable-table";
import { AddRelationDialog } from "~/components/diagram/add-relation-dialog";
import { AddTableDialog } from "~/components/diagram/add-table-dialog";
import { AddEnumDialog } from "~/components/diagram/add-enum-dialog";
import { EnumNode } from "~/components/diagram/enum-node";

import { useDiagramCanvas } from "~/hooks/use-diagram-canvas";
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
    const [arrowUpdateTrigger, setArrowUpdateTrigger] = useState(0);

    const [sourceTableId, setSourceTableId] = useState<string>("");
    const [targetTableId, setTargetTableId] = useState<string>("");

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
    } = useDiagramCanvas(tables);

    const handleStop = (e: any, data: any, id: string) => {
        const isEnum = enums.some(en => en.id === id);
        fetcher.submit(
            { intent: isEnum ? "moveEnum" : "moveTable", id, x: data.x, y: data.y },
            { method: "post" }
        );
    };

    const sourceColumns = sourceTableId ? columns.filter(c => c.tableId === sourceTableId) : [];
    const targetColumns = targetTableId ? columns.filter(c => c.tableId === targetTableId) : [];

    const updateArrows = useCallback(() => {
        setArrowUpdateTrigger(t => t + 1);
    }, []);

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
            {/* Header */}
            <header className="flex-none h-16 border-b px-6 flex items-center justify-between bg-white/80 backdrop-blur-md z-20 sticky top-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="rounded-full h-8 w-8 hover:bg-slate-100 transition-colors">
                        <Link to="/"><ArrowLeft className="h-4 w-4 text-slate-600" /></Link>
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-slate-900 leading-tight">{diagram.name}</h1>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                                {tables.length} tables
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[200px]" title={tables.map(t => t.name).join(", ")}>
                                {tables.map(t => t.name).join(", ")}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-100/50 p-1 rounded-lg border border-slate-200/60 shadow-sm transition-all hover:bg-slate-100">
                        <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-medium text-slate-700 hover:bg-white hover:shadow-sm">
                            <a href={`/api/export/${diagram.id}`} download>Export SQL</a>
                        </Button>
                        <div className="w-[1px] h-4 bg-slate-300 mx-1" />
                        <AddRelationDialog
                            tables={tables}
                            columns={columns}
                            sourceTableId={sourceTableId}
                            setSourceTableId={setSourceTableId}
                            targetTableId={targetTableId}
                            setTargetTableId={setTargetTableId}
                            sourceColumns={sourceColumns}
                            targetColumns={targetColumns}
                            fetcher={fetcher}
                        />
                    </div>

                    <AddTableDialog fetcher={fetcher} />
                    <AddEnumDialog fetcher={fetcher} />
                </div>
            </header>

            <div
                className={`flex-1 overflow-hidden relative p-0 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                id="canvas"
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={() => setIsPanning(false)}
                onMouseLeave={() => setIsPanning(false)}
                style={{
                    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                    backgroundSize: `${20 * scale}px ${20 * scale}px`,
                    backgroundPosition: `${pan.x}px ${pan.y}px`,
                }}
            >
                {/* Floating controls */}
                <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-2">
                    <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-full p-1.5 ring-1 ring-slate-900/5">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100" onClick={handleZoomOut} title="Zoom Out">
                            <Minus className="h-4 w-4 text-slate-600" />
                        </Button>
                        <div className="w-12 text-center">
                            <span className="text-xs font-bold text-slate-700 tabular-nums">
                                {Math.round(scale * 100)}%
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100" onClick={handleZoomIn} title="Zoom In">
                            <Plus className="h-4 w-4 text-slate-600" />
                        </Button>
                        <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100" onClick={handleResetZoom} title="Reset View">
                            <RotateCcw className="h-4 w-4 text-slate-600" />
                        </Button>
                    </div>
                </div>
                {/* Transformed container for tables */}
                <div
                    id="transform-container"
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                        transformOrigin: '0 0',
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        zIndex: 50
                    }}
                >
                    {tables.map(table => {
                        const tableColumns = columns.filter(c => c.tableId === table.id);
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
                        const values = enumValues.filter(v => v.enumId === en.id);
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

                <RelationArrows
                    relations={relations}
                    columns={columns}
                    scale={scale}
                    pan={pan}
                    canvasRef={canvasRef}
                    updateTrigger={arrowUpdateTrigger}
                />
            </div>
        </div>
    );
}

