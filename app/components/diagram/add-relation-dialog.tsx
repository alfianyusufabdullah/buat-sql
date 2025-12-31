import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { type AddRelationDialogProps } from "./types";

export function AddRelationDialog({
    tables,
    sourceTableId,
    setSourceTableId,
    targetTableId,
    setTargetTableId,
    sourceColumns,
    targetColumns,
    fetcher: propFetcher
}: AddRelationDialogProps) {
    const fetcher = useFetcher();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (fetcher.state === "idle" && fetcher.data && (fetcher.data as any).success) {
            setOpen(false);
        }
    }, [fetcher.state, fetcher.data]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm">Add Relation</Button>
            </DialogTrigger>
            <DialogContent>
                <fetcher.Form method="post">
                    <DialogHeader><DialogTitle>Add Relation</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Source Table</Label>
                                <select
                                    name="fromTableId"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground dark:bg-slate-900 dark:border-slate-700"
                                    value={sourceTableId}
                                    onChange={(e) => setSourceTableId(e.target.value)}
                                    required
                                >
                                    <option value="">Select Table</option>
                                    {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Source Column</Label>
                                <select name="fromColumnId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground dark:bg-slate-900 dark:border-slate-700" required disabled={!sourceTableId}>
                                    <option value="">Select Column</option>
                                    {sourceColumns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Target Table</Label>
                                <select
                                    name="toTableId"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground dark:bg-slate-900 dark:border-slate-700"
                                    value={targetTableId}
                                    onChange={(e) => setTargetTableId(e.target.value)}
                                    required
                                >
                                    <option value="">Select Table</option>
                                    {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Target Column</Label>
                                <select name="toColumnId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground dark:bg-slate-900 dark:border-slate-700" required disabled={!targetTableId}>
                                    <option value="">Select Column</option>
                                    {targetColumns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" name="intent" value="addRelation">Create Relation</Button>
                    </DialogFooter>
                </fetcher.Form>
            </DialogContent>
        </Dialog>
    );
}
