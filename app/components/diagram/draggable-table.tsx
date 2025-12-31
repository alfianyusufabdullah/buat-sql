import { useState, useRef, useEffect } from "react";
import Draggable from "react-draggable";
import { GripVertical, Trash, Palette } from "lucide-react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSub,
    ContextMenuSubTrigger,
    ContextMenuSubContent,
    ContextMenuSeparator,
} from "~/components/ui/context-menu";
import { EditColumnDialog } from "./edit-column-dialog";
import { AddColumnDialog } from "./add-column-dialog";
import type { DraggableTableProps, ColumnData } from "./types";
import { CONFIG, snapToGrid } from "~/lib/utils";

const TABLE_WIDTH = CONFIG.TABLE_WIDTH;
const ENUM_WIDTH = CONFIG.ENUM_WIDTH;
const TABLE_PADDING = CONFIG.TABLE_PADDING;

const colors = [
    { name: 'Slate', value: 'slate', bg: 'bg-slate-50', darkBg: 'dark:bg-slate-900', border: 'border-slate-200', darkBorder: 'dark:border-slate-800', text: 'text-slate-900', darkText: 'dark:text-slate-100' },
    { name: 'Blue', value: 'blue', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-900/30', border: 'border-blue-200', darkBorder: 'dark:border-blue-800/50', text: 'text-blue-900', darkText: 'dark:text-blue-100' },
    { name: 'Green', value: 'green', bg: 'bg-green-50', darkBg: 'dark:bg-green-900/30', border: 'border-green-200', darkBorder: 'dark:border-green-800/50', text: 'text-green-900', darkText: 'dark:text-green-100' },
    { name: 'Red', value: 'red', bg: 'bg-red-50', darkBg: 'dark:bg-red-900/30', border: 'border-red-200', darkBorder: 'dark:border-red-800/50', text: 'text-red-900', darkText: 'dark:text-red-100' },
    { name: 'Yellow', value: 'yellow', bg: 'bg-yellow-50', darkBg: 'dark:bg-yellow-900/30', border: 'border-yellow-200', darkBorder: 'dark:border-yellow-800/50', text: 'text-yellow-900', darkText: 'dark:text-yellow-100' },
    { name: 'Purple', value: 'purple', bg: 'bg-purple-50', darkBg: 'dark:bg-purple-900/30', border: 'border-purple-200', darkBorder: 'dark:border-purple-800/50', text: 'text-purple-900', darkText: 'dark:text-purple-100' },
    { name: 'Pink', value: 'pink', bg: 'bg-pink-50', darkBg: 'dark:bg-pink-900/30', border: 'border-pink-200', darkBorder: 'dark:border-pink-800/50', text: 'text-pink-900', darkText: 'dark:text-pink-100' },
    { name: 'Orange', value: 'orange', bg: 'bg-orange-50', darkBg: 'dark:bg-orange-900/30', border: 'border-orange-200', darkBorder: 'dark:border-orange-800/50', text: 'text-orange-900', darkText: 'dark:text-orange-100' },
];

export function DraggableTable({ table, columns, allTables, allColumns, relations, onStop, updateArrows, fetcher, scale, enums, allEnumValues }: DraggableTableProps) {
    // ... logic remains same ...
    const nodeRef = useRef<HTMLDivElement>(null);
    const [isFk, setIsFk] = useState(false);
    const [selectedFkTableId, setSelectedFkTableId] = useState<string>("");
    const [position, setPosition] = useState({ x: table.x, y: table.y });

    useEffect(() => {
        setIsFk(false);
        setSelectedFkTableId("");
    }, []);

    const getTableHeight = (columnCount: number) => {
        const headerHeight = 40;
        const columnHeight = 28;
        const addButtonHeight = 36;
        return headerHeight + (columnCount * columnHeight) + addButtonHeight;
    };

    const getEnumHeight = (valueCount: number) => {
        const headerHeight = 36;
        const valueHeight = 25;
        return headerHeight + (valueCount * valueHeight) + 8;
    };

    const checkCollision = (
        x1: number, y1: number, w1: number, h1: number,
        x2: number, y2: number, w2: number, h2: number
    ) => {
        return !(x1 + w1 + TABLE_PADDING <= x2 ||
            x2 + w2 + TABLE_PADDING <= x1 ||
            y1 + h1 + TABLE_PADDING <= y2 ||
            y2 + h2 + TABLE_PADDING <= y1);
    };

    const handleDrag = (e: any, data: any) => {
        const currentHeight = getTableHeight(columns.length);
        const newX = data.x;
        const newY = data.y;

        for (const otherTable of allTables) {
            if (otherTable.id === table.id) continue;

            const otherColumns = allColumns.filter((c: ColumnData) => c.tableId === otherTable.id);
            const otherHeight = getTableHeight(otherColumns.length);

            const wouldCollide = checkCollision(
                newX, newY, TABLE_WIDTH, currentHeight,
                otherTable.x, otherTable.y, TABLE_WIDTH, otherHeight
            );

            const alreadyColliding = checkCollision(
                position.x, position.y, TABLE_WIDTH, currentHeight,
                otherTable.x, otherTable.y, TABLE_WIDTH, otherHeight
            );

            if (wouldCollide && !alreadyColliding) {
                return false;
            }
        }

        for (const en of enums) {
            const evs = allEnumValues.filter(v => v.enumId === en.id);
            const enHeight = getEnumHeight(evs.length);

            const wouldCollide = checkCollision(
                newX, newY, TABLE_WIDTH, currentHeight,
                en.x, en.y, ENUM_WIDTH, enHeight
            );

            const alreadyColliding = checkCollision(
                position.x, position.y, TABLE_WIDTH, currentHeight,
                en.x, en.y, ENUM_WIDTH, enHeight
            );

            if (wouldCollide && !alreadyColliding) {
                return false;
            }
        }

        setPosition({ x: newX, y: newY });
        updateArrows();
    };

    const handleDragStop = () => {
        const snapped = snapToGrid(position.x, position.y);
        setPosition(snapped);
        onStop({} as any, { x: snapped.x, y: snapped.y }, table.id);
    };

    const currentColor = colors.find(c => c.value === table.color) || colors[0];

    const handleDelete = () => {
        if (confirm("Are you sure you want to delete this table?")) {
            fetcher.submit(
                { intent: "deleteTable", id: table.id },
                { method: "post" }
            );
        }
    };

    const handleColorChange = (color: string) => {
        fetcher.submit(
            { intent: "updateTable", id: table.id, color },
            { method: "post" }
        );
    };

    const eligibleTables = allTables.filter((t) => t.id !== table.id);

    return (
        <Draggable
            nodeRef={nodeRef}
            position={position}
            onDrag={handleDrag}
            onStop={handleDragStop}
            handle=".drag-handle"
            scale={scale}
        >
            <div
                ref={nodeRef}
                id={table.id}
                className={`absolute w-64 bg-white dark:bg-slate-900/95 border rounded-lg shadow-sm z-10 transition-colors ${currentColor.border} ${currentColor.darkBorder}`}
            >
                <ContextMenu>
                    <ContextMenuTrigger>
                        <div className={`p-2 border-b rounded-t-lg flex items-center justify-between drag-handle cursor-grab active:cursor-grabbing transition-colors ${currentColor.bg} ${currentColor.darkBg} ${currentColor.border} ${currentColor.darkBorder}`}>
                            <span className={`font-bold text-sm truncate ${currentColor.text} ${currentColor.darkText}`}>{table.name}</span>
                            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                        <div className="py-2 bg-white dark:bg-slate-900 rounded-b-lg">
                            {columns.map((col) => (
                                <EditColumnDialog
                                    key={col.id}
                                    column={col}
                                    table={table}
                                    eligibleTables={eligibleTables}
                                    allColumns={allColumns}
                                    relations={relations}
                                    fetcher={fetcher}
                                    enums={enums}
                                />
                            ))}
                            <AddColumnDialog
                                table={table}
                                eligibleTables={eligibleTables}
                                allColumns={allColumns}
                                fetcher={fetcher}
                                isFk={isFk}
                                setIsFk={setIsFk}
                                selectedFkTableId={selectedFkTableId}
                                setSelectedFkTableId={setSelectedFkTableId}
                                enums={enums}
                            />
                        </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                        <ContextMenuSub>
                            <ContextMenuSubTrigger>
                                <Palette className="w-4 h-4 mr-2" /> Color
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent className="w-48">
                                {colors.map(c => (
                                    <ContextMenuItem key={c.value} onClick={() => handleColorChange(c.value)}>
                                        <div className={`w-4 h-4 rounded-full mr-2 ${c.bg.replace('100', '500')}`} />
                                        {c.name}
                                    </ContextMenuItem>
                                ))}
                            </ContextMenuSubContent>
                        </ContextMenuSub>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={handleDelete} variant="destructive">
                            <Trash className="w-4 h-4 mr-2" /> Delete Table
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>
            </div>
        </Draggable>
    );
}
