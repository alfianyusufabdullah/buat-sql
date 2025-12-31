import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { Link2, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "~/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import type { EditColumnDialogProps } from "./types";

export function EditColumnDialog({ column, table, eligibleTables, allColumns, relations, enums, fetcher: propFetcher }: EditColumnDialogProps) {
    const fetcher = useFetcher();

    const existingRelation = relations?.find((r) => r.fromColumnId === column.id);

    const [isFk, setIsFk] = useState(!!existingRelation);
    const [selectedFkTableId, setSelectedFkTableId] = useState<string>(existingRelation?.toTableId || "");
    const [isPk, setIsPk] = useState(!!column.isPk);
    const [isNullable, setIsNullable] = useState(!!column.isNullable);
    const [selectedType, setSelectedType] = useState(column.type);
    const [selectedFkColumnId, setSelectedFkColumnId] = useState(existingRelation?.toColumnId || "");
    const [onDeleteValue, setOnDeleteValue] = useState(existingRelation?.onDelete || "NO ACTION");
    const [onUpdateValue, setOnUpdateValue] = useState(existingRelation?.onUpdate || "NO ACTION");
    const [selectedEnumId, setSelectedEnumId] = useState(column.enumId || "");
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (fetcher.state === "idle" && fetcher.data && (fetcher.data as any).success) {
            setOpen(false);
        }
    }, [fetcher.state, fetcher.data]);

    const availableFkColumns = allColumns.filter((c) => c.tableId === selectedFkTableId);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div
                    id={column.id}
                    className="flex justify-between text-xs py-1.5 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800/80 group cursor-pointer transition-colors"
                >
                    <div className="flex items-center gap-2">
                        {column.isPk && <div className="w-1 h-3 bg-yellow-400 dark:bg-yellow-500 rounded-full" title="Primary Key" />}
                        {!column.isPk && <div className="w-1 h-3 bg-slate-200 dark:bg-slate-700 rounded-full" />}

                        <span className={`font-medium ${column.isPk ? "text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-200"}`}>{column.name}</span>
                        {column.isPk && <span className="text-[9px] px-1 py-0.5 bg-yellow-100 dark:bg-yellow-900/80 text-yellow-700 dark:text-yellow-100 rounded font-bold uppercase tracking-wide">PK</span>}
                        {existingRelation && <span className="text-[9px] px-1 py-0.5 bg-orange-100 dark:bg-orange-900/80 text-orange-700 dark:text-orange-100 rounded font-bold uppercase tracking-wide">FK</span>}
                    </div>
                    <span className="text-muted-foreground dark:text-slate-400 text-[10px] font-mono tracking-tight">{column.type}</span>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <fetcher.Form method="post">
                    <input type="hidden" name="tableId" value={table.id} />
                    <input type="hidden" name="columnId" value={column.id} />
                    <input type="hidden" name="isPk" value={isPk ? "on" : ""} />
                    <input type="hidden" name="isNullable" value={isNullable ? "on" : ""} />
                    <input type="hidden" name="isFk" value={isFk ? "on" : ""} />
                    <input type="hidden" name="enumId" value={selectedType === "ENUM" ? selectedEnumId : ""} />
                    <DialogHeader>
                        <DialogTitle>Edit Column</DialogTitle>
                        <DialogDescription>Modify {column.name} in {table.name}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Name & Type */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Name</Label>
                                <Input id="edit-name" name="name" defaultValue={column.name} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-type">Type</Label>
                                <Select name="type" value={selectedType} onValueChange={setSelectedType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Numeric</SelectLabel>
                                            <SelectItem value="INT">INT</SelectItem>
                                            <SelectItem value="BIGINT">BIGINT</SelectItem>
                                            <SelectItem value="DECIMAL(10,2)">DECIMAL</SelectItem>
                                            <SelectItem value="FLOAT">FLOAT</SelectItem>
                                        </SelectGroup>
                                        <SelectGroup>
                                            <SelectLabel>String</SelectLabel>
                                            <SelectItem value="VARCHAR(255)">VARCHAR(255)</SelectItem>
                                            <SelectItem value="TEXT">TEXT</SelectItem>
                                            <SelectItem value="CHAR(1)">CHAR</SelectItem>
                                        </SelectGroup>
                                        <SelectGroup>
                                            <SelectLabel>Date/Time</SelectLabel>
                                            <SelectItem value="DATE">DATE</SelectItem>
                                            <SelectItem value="DATETIME">DATETIME</SelectItem>
                                            <SelectItem value="TIMESTAMP">TIMESTAMP</SelectItem>
                                        </SelectGroup>
                                        <SelectGroup>
                                            <SelectLabel>Other</SelectLabel>
                                            <SelectItem value="BOOLEAN">BOOLEAN</SelectItem>
                                            <SelectItem value="JSON">JSON</SelectItem>
                                            <SelectItem value="UUID">UUID</SelectItem>
                                            <SelectItem value="ENUM">ENUM</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Enum Selection */}
                        {selectedType === "ENUM" && (
                            <div className="space-y-2">
                                <Label htmlFor="edit-enum">Select ENUM</Label>
                                <Select value={selectedEnumId} onValueChange={setSelectedEnumId}>
                                    <SelectTrigger id="edit-enum">
                                        <SelectValue placeholder="Select ENUM entity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {enums.map((en) => (
                                            <SelectItem key={en.id} value={en.id}>{en.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Switches */}
                        <div className="flex items-center gap-6 pt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Switch checked={isPk} onCheckedChange={setIsPk} />
                                <span className="text-sm">Primary Key</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Switch checked={isNullable} onCheckedChange={setIsNullable} />
                                <span className="text-sm">Nullable</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Switch checked={isFk} onCheckedChange={setIsFk} />
                                <span className="text-sm">Foreign Key</span>
                            </label>
                        </div>

                        {/* FK Settings */}
                        {isFk && (
                            <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <Link2 className="h-4 w-4" />
                                    Foreign Key Reference
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Reference Table</Label>
                                        <Select name="fkTableId" value={selectedFkTableId} onValueChange={setSelectedFkTableId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select table" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {eligibleTables.map((t) => (
                                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Reference Column</Label>
                                        <Select name="fkColumnId" value={selectedFkColumnId} onValueChange={setSelectedFkColumnId} disabled={!selectedFkTableId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select column" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableFkColumns.map((c) => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        {c.name} {c.isPk && "(PK)"}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">ON DELETE</Label>
                                        <Select name="onDelete" value={onDeleteValue} onValueChange={setOnDeleteValue}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="NO ACTION">NO ACTION</SelectItem>
                                                <SelectItem value="CASCADE">CASCADE</SelectItem>
                                                <SelectItem value="SET NULL">SET NULL</SelectItem>
                                                <SelectItem value="RESTRICT">RESTRICT</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">ON UPDATE</Label>
                                        <Select name="onUpdate" value={onUpdateValue} onValueChange={setOnUpdateValue}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="NO ACTION">NO ACTION</SelectItem>
                                                <SelectItem value="CASCADE">CASCADE</SelectItem>
                                                <SelectItem value="SET NULL">SET NULL</SelectItem>
                                                <SelectItem value="RESTRICT">RESTRICT</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="flex justify-between items-center sm:justify-between">
                        <Button
                            type="submit"
                            name="intent"
                            value="deleteColumn"
                            variant="destructive"
                            size="sm"
                            className="gap-2"
                            onClick={(e) => {
                                if (!confirm("Are you sure you want to delete this column?")) {
                                    e.preventDefault();
                                }
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete
                        </Button>
                        <Button type="submit" name="intent" value="updateColumn">Save Changes</Button>
                    </DialogFooter>
                </fetcher.Form>
            </DialogContent>
        </Dialog>
    );
}
