import { type ActionFunctionArgs, data, Link, useFetcher, useLoaderData } from "react-router";
import { db } from "~/db";
import { diagrams } from "~/db/schema";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Database, Plus, Trash2 } from "lucide-react";
import { eq, desc } from "drizzle-orm";
import { useEffect, useState } from "react";

export function meta() {
  return [
    { title: "DrawSQL Clone - Dashboard" },
    { name: "description", content: "Manage your database diagrams" },
  ];
}

export async function loader() {
  const allDiagrams = await db.select().from(diagrams).orderBy(desc(diagrams.createdAt));
  return { allDiagrams };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const name = formData.get("name") as string;
    if (!name) {
      return data({ error: "Name is required" }, { status: 400 });
    }
    const databaseType = formData.get("databaseType") as string;
    const id = crypto.randomUUID();
    await db.insert(diagrams).values({
      id,
      name,
      databaseType,
      createdAt: new Date(),
    });
    return data({ success: true });
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    await db.delete(diagrams).where(eq(diagrams.id, id));
    return data({ success: true });
  }

  return null;
}

export default function Home() {
  const { allDiagrams } = useLoaderData<typeof loader>();
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.data?.success && fetcher.state === "idle") {
      setOpen(false);
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Diagrams</h1>
          <p className="text-muted-foreground mt-2">
            Manage and organize your database schemas.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Diagram
            </Button>
          </DialogTrigger>
          <DialogContent>
            <fetcher.Form method="post">
              <DialogHeader>
                <DialogTitle>Create New Diagram</DialogTitle>
                <DialogDescription>
                  Give your new database diagram a name.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g. E-commerce DB"
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="databaseType" className="text-right">
                    Database
                  </Label>
                  <select
                    id="databaseType"
                    name="databaseType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 col-span-3"
                  >
                    <option value="generic">Generic SQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="postgres">PostgreSQL</option>
                    <option value="sqlite">SQLite</option>
                    <option value="mariadb">MariaDB</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" name="intent" value="create">
                  {fetcher.state === "submitting" ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </fetcher.Form>
          </DialogContent>
        </Dialog>
      </div>

      {allDiagrams.length === 0 ? (
        <div className="text-center py-20 border rounded-lg bg-muted/20 border-dashed">
          <Database className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No diagrams yet</h3>
          <p className="text-muted-foreground">Get started by creating your first diagram.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {allDiagrams.map((diagram) => (
            <Card key={diagram.id} className="group relative hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <Link to={`/diagram/${diagram.id}`} className="hover:underline stretched-link">
                    {diagram.name}
                  </Link>
                </CardTitle>
                <CardDescription>
                  Created on {new Date(diagram.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted/30 rounded-md flex items-center justify-center border border-dashed">
                  <Database className="h-8 w-8 text-muted-foreground/40" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/diagram/${diagram.id}`}>Open</Link>
                </Button>
                <fetcher.Form method="post" onSubmit={(e) => {
                  if (!confirm("Are you sure?")) e.preventDefault();
                }}>
                  <input type="hidden" name="id" value={diagram.id} />
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" type="submit" name="intent" value="delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </fetcher.Form>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

