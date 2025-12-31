import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ListPlus } from "lucide-react";
import { type AddEnumDialogProps } from "./types";

export function AddEnumDialog({ fetcher: propFetcher }: AddEnumDialogProps) {
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
                <Button variant="outline" size="sm" className="h-9 gap-2 font-medium border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all">
                    <ListPlus className="mr-2 h-4 w-4" /> Add ENUM
                </Button>
            </DialogTrigger>
            <DialogContent>
                <fetcher.Form method="post">
                    <DialogHeader><DialogTitle>Add ENUM</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="enumName" className="text-right">Name</Label>
                            <Input id="enumName" name="name" className="col-span-3" required placeholder="e.g. user_role" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" name="intent" value="addEnum">Create ENUM</Button>
                    </DialogFooter>
                </fetcher.Form>
            </DialogContent>
        </Dialog>
    );
}
