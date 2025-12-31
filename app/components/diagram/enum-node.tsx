import Draggable from 'react-draggable';
import { useState, useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import { Settings2, Trash2, Plus, GripVertical, Palette } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
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
import { type EnumNodeProps } from "./types";

import { CONFIG, snapToGrid } from "~/lib/utils";

const ENUM_WIDTH = CONFIG.ENUM_WIDTH;
const TABLE_WIDTH = CONFIG.TABLE_WIDTH;
const TABLE_PADDING = CONFIG.TABLE_PADDING;

const colors = [
    { name: 'Emerald', value: '#10b981', bg: 'bg-emerald-50', darkBg: 'dark:bg-emerald-900/30', border: 'border-emerald-200', darkBorder: 'dark:border-emerald-800/50', text: 'text-emerald-700', darkText: 'dark:text-emerald-100' },
    { name: 'Blue', value: '#3b82f6', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-900/30', border: 'border-blue-200', darkBorder: 'dark:border-blue-800/50', text: 'text-blue-700', darkText: 'dark:text-blue-100' },
    { name: 'Purple', value: '#a855f7', bg: 'bg-purple-50', darkBg: 'dark:bg-purple-900/30', border: 'border-purple-200', darkBorder: 'dark:border-purple-800/50', text: 'text-purple-700', darkText: 'dark:text-purple-100' },
    { name: 'Orange', value: '#f97316', bg: 'bg-orange-50', darkBg: 'dark:bg-orange-900/30', border: 'border-orange-200', darkBorder: 'dark:border-orange-800/50', text: 'text-orange-700', darkText: 'dark:text-orange-100' },
    { name: 'Pink', value: '#ec4899', bg: 'bg-pink-50', darkBg: 'dark:bg-pink-900/30', border: 'border-pink-200', darkBorder: 'dark:border-pink-800/50', text: 'text-pink-700', darkText: 'dark:text-pink-100' },
    { name: 'Slate', value: '#64748b', bg: 'bg-slate-50', darkBg: 'dark:bg-slate-900/30', border: 'border-slate-200', darkBorder: 'dark:border-slate-800/50', text: 'text-slate-700', darkText: 'dark:text-slate-100' },
];

export function EnumNode({ enumData, enumValues, allEnums, allTables, allColumns, allEnumValues, onStop, updateArrows, fetcher: propFetcher, scale }: EnumNodeProps) {
    const fetcher = useFetcher();
    const nodeRef = useRef<HTMLDivElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(enumData.name);
    const [localValues, setLocalValues] = useState(enumValues);
    const [position, setPosition] = useState({ x: enumData.x, y: enumData.y });

    useEffect(() => {
        setLocalValues(enumValues);
    }, [enumValues]);

    useEffect(() => {
        setPosition({ x: enumData.x, y: enumData.y });
    }, [enumData.x, enumData.y]);

    const getEnumHeight = (valueCount: number) => {
        const headerHeight = 36;
        const valueHeight = 25;
        return headerHeight + (valueCount * valueHeight) + 8;
    };

    const getTableHeight = (columnCount: number) => {
        const headerHeight = 40;
        const columnHeight = 28;
        const addButtonHeight = 36;
        return headerHeight + (columnCount * columnHeight) + addButtonHeight;
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
        const currentHeight = getEnumHeight(enumValues.length);
        const newX = data.x;
        const newY = data.y;

        for (const otherEnum of allEnums) {
            if (otherEnum.id === enumData.id) continue;
            const otherValues = allEnumValues.filter(v => v.enumId === otherEnum.id);
            const otherHeight = getEnumHeight(otherValues.length);

            if (checkCollision(newX, newY, ENUM_WIDTH, currentHeight, otherEnum.x, otherEnum.y, ENUM_WIDTH, otherHeight)) {
                if (!checkCollision(position.x, position.y, ENUM_WIDTH, currentHeight, otherEnum.x, otherEnum.y, ENUM_WIDTH, otherHeight)) {
                    return false;
                }
            }
        }

        for (const table of allTables) {
            const tableColumns = allColumns.filter(c => c.tableId === table.id);
            const tableHeight = getTableHeight(tableColumns.length);

            if (checkCollision(newX, newY, ENUM_WIDTH, currentHeight, table.x, table.y, TABLE_WIDTH, tableHeight)) {
                if (!checkCollision(position.x, position.y, ENUM_WIDTH, currentHeight, table.x, table.y, TABLE_WIDTH, tableHeight)) {
                    return false;
                }
            }
        }

        setPosition({ x: newX, y: newY });
        updateArrows();
    };

    const handleDragStop = () => {
        const snapped = snapToGrid(position.x, position.y);
        setPosition(snapped);
        onStop({} as any, { x: snapped.x, y: snapped.y }, enumData.id);
    };

    const handleAddValue = () => {
        setLocalValues([...localValues, { id: '', enumId: enumData.id, value: '' }]);
    };

    const handleValueChange = (index: number, value: string) => {
        const newValues = [...localValues];
        newValues[index].value = value;
        setLocalValues(newValues);
    };

    const handleRemoveValue = (index: number) => {
        setLocalValues(localValues.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        const formData = new FormData();
        formData.append("intent", "updateEnum");
        formData.append("id", enumData.id);
        formData.append("name", name);
        formData.append("color", enumData.color || "#10b981");
        formData.append("values", JSON.stringify(localValues));
        fetcher.submit(formData, { method: "post" });
        setIsEditing(false);
    };

    const handleDelete = () => {
        if (confirm("Delete this ENUM?")) {
            fetcher.submit({ intent: "deleteEnum", id: enumData.id }, { method: "post" });
        }
    };

    const handleColorChange = (color: string) => {
        fetcher.submit({ intent: "updateEnum", id: enumData.id, color }, { method: "post" });
    };

    useEffect(() => {
        if (fetcher.state === "idle" && fetcher.data && (fetcher.data as any).success) {
            setIsEditing(false);
        }
    }, [fetcher.state, fetcher.data]);

    const currentColor = colors.find(c => c.value === enumData.color) || colors[0];

    return (
        <Draggable
            nodeRef={nodeRef}
            position={position}
            onDrag={handleDrag}
            onStop={handleDragStop}
            scale={scale}
            handle=".enum-handle"
        >
            <div
                ref={nodeRef}
                id={`enum-${enumData.id}`}
                className={`absolute w-48 bg-white dark:bg-slate-900/95 rounded-lg shadow-sm border z-20 overflow-hidden group select-none transition-shadow hover:shadow-md ${currentColor.border} ${currentColor.darkBorder}`}
            >
                <ContextMenu>
                    <ContextMenuTrigger>
                        {/* Header */}
                        <div
                            className={`enum-handle px-3 py-2 flex items-center justify-between cursor-grab active:cursor-grabbing border-b transition-colors ${currentColor.bg} ${currentColor.darkBg} ${currentColor.border} ${currentColor.darkBorder}`}
                        >
                            <div className="flex items-center gap-2">
                                <span className={`font-bold text-xs uppercase tracking-wider truncate max-w-[100px] ${currentColor.text} ${currentColor.darkText}`}>{enumData.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Dialog open={isEditing} onOpenChange={setIsEditing}>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Settings2 className="h-3 w-3 text-slate-400 hover:text-slate-600" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader><DialogTitle>Edit ENUM: {enumData.name}</DialogTitle></DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Name</Label>
                                                <Input value={name} onChange={(e) => setName(e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="flex justify-between items-center">
                                                    Values
                                                    <Button type="button" variant="outline" size="sm" onClick={handleAddValue} className="h-7 text-[10px]"><Plus className="h-3 w-3 mr-1" /> Add Value</Button>
                                                </Label>
                                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                                    {localValues.map((v, i) => (
                                                        <div key={i} className="flex gap-2">
                                                            <Input
                                                                value={v.value}
                                                                onChange={(e) => handleValueChange(i, e.target.value)}
                                                                placeholder="value"
                                                                className="h-8 text-xs"
                                                            />
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveValue(i)} className="h-8 w-8 text-slate-400 hover:text-red-500">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                                            <Button type="button" onClick={handleSave}>Save Changes</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                                <GripVertical className="h-3 w-3 text-muted-foreground/30" />
                            </div>
                        </div>

                        {/* Values */}
                        <div className="py-1 bg-white dark:bg-slate-900 rounded-b-lg">
                            {enumValues.length === 0 ? (
                                <div className="px-4 py-3 text-[10px] text-slate-400 dark:text-slate-500 italic text-center">No values defined</div>
                            ) : (
                                enumValues.map((v) => (
                                    <div key={v.id} className="px-4 py-1.5 flex items-center gap-2 border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className={`w-1 h-1 rounded-full ${currentColor.bg.replace('50', '500').replace('bg-', 'bg-')}`} />
                                        <span className="text-[11px] text-slate-600 dark:text-slate-100 font-medium truncate">{v.value}</span>
                                    </div>
                                ))
                            )}
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
                            <Trash2 className="w-4 h-4 mr-2" /> Delete ENUM
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>
            </div>
        </Draggable>
    );
}
