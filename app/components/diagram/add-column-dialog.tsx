import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { Plus, Link2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "~/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import type { AddColumnDialogProps } from "./types";

export function AddColumnDialog({
    table,
    eligibleTables,
    allColumns,
    isFk,
    setIsFk,
    selectedFkTableId,
    setSelectedFkTableId,
    enums,
    fetcher: propFetcher
}: AddColumnDialogProps) {
    const fetcher = useFetcher();
    const [open, setOpen] = useState(false);
    const [selectedType, setSelectedType] = useState("VARCHAR(255)");
    const availableFkColumns = allColumns.filter((c) => c.tableId === selectedFkTableId);

    useEffect(() => {
        if (fetcher.state === "idle" && fetcher.data && (fetcher.data as any).success) {
            setOpen(false);
        }
    }, [fetcher.state, fetcher.data]);

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) {
                setIsFk(false);
                setSelectedFkTableId("");
            }
        }}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs text-muted-foreground dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-dashed border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                    <Plus className="mr-1 h-3 w-3" /> Add Column
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <fetcher.Form method="post">
                    <input type="hidden" name="tableId" value={table.id} />
                    <DialogHeader>
                        <DialogTitle>Add Column</DialogTitle>
                        <DialogDescription>Add a new column to {table.name}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Name & Type */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="add-name">Name</Label>
                                <Input id="add-name" name="name" placeholder="column_name" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="add-type">Type</Label>
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
                                <Label htmlFor="add-enum">Select ENUM</Label>
                                <Select name="enumId" required>
                                    <SelectTrigger id="add-enum">
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
                                <Switch name="isPk" />
                                <span className="text-sm">Primary Key</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Switch name="isNullable" />
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
                                        <Select name="fkTableId" onValueChange={setSelectedFkTableId}>
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
                                        <Select name="fkColumnId" disabled={!selectedFkTableId}>
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
                                        <Select name="onDelete" defaultValue="NO ACTION">
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
                                        <Select name="onUpdate" defaultValue="NO ACTION">
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
                    <DialogFooter>
                        <Button type="submit" name="intent" value="addColumn">Add Column</Button>
                    </DialogFooter>
                </fetcher.Form>
            </DialogContent>
        </Dialog>
    );
}
