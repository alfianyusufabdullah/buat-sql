import { type ActionFunctionArgs, data, Link, useFetcher, useLoaderData } from "react-router";
import { db } from "~/db";
import { diagrams } from "~/db/schema";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Database, Plus, Trash2, Layout } from "lucide-react";
import { eq, desc } from "drizzle-orm";
import { useEffect, useState } from "react";
import { ThemeToggle } from "~/components/diagram/theme-toggle";

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <header className="h-16 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Layout className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">Buat SQL</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto py-12 px-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Your Diagrams</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-3 text-lg">
              Manage and organize your professional database schemas.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg shadow-blue-500/20 px-6">
                <Plus className="mr-2 h-5 w-5" />
                Create New Diagram
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <fetcher.Form method="post">
                <DialogHeader>
                  <DialogTitle>Create New Diagram</DialogTitle>
                  <DialogDescription>
                    Fill in the details for your new database architecture.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Diagram Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="e.g. Core Banking System"
                      className="h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="databaseType">Target Database</Label>
                    <select
                      id="databaseType"
                      name="databaseType"
                      className="flex h-11 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-slate-200 shadow-sm"
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
                  <Button type="submit" name="intent" value="create" className="w-full h-11 text-base">
                    {fetcher.state === "submitting" ? "Creating Architecture..." : "Create Diagram"}
                  </Button>
                </DialogFooter>
              </fetcher.Form>
            </DialogContent>
          </Dialog>
        </div>

        {allDiagrams.length === 0 ? (
          <div className="text-center py-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Database className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">No diagrams yet</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">Click the button above to start building your first database diagram.</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {allDiagrams.map((diagram) => (
              <Card key={diagram.id} className="group overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 py-0">
                <CardHeader>
                  <div className="flex justify-between items-start pt-6">
                    <CardTitle className="text-xl font-bold">
                      <Link to={`/diagram/${diagram.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        {diagram.name}
                      </Link>
                    </CardTitle>
                    <div className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                      {diagram.databaseType || "generic"}
                    </div>
                  </div>
                  <CardDescription className="text-slate-500 dark:text-slate-500 mt-1">
                    Updated {new Date(diagram.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <Link to={`/diagram/${diagram.id}`} className="block">
                    <div className="h-40 bg-slate-50 dark:bg-slate-950/50 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 group-hover:bg-slate-100 dark:group-hover:bg-slate-800/50 transition-colors relative overflow-hidden">
                      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
                      <Database className="h-10 w-10 text-slate-300 dark:text-slate-700 relative z-10" />
                    </div>
                  </Link>
                </CardContent>
                <CardFooter className="px-6 py-4 bg-slate-50/50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <Button variant="ghost" size="sm" asChild className="hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 font-medium">
                    <Link to={`/diagram/${diagram.id}`}>View Editor</Link>
                  </Button>
                  <fetcher.Form method="post" onSubmit={(e) => {
                    if (!confirm("Delete this diagram permanently?")) e.preventDefault();
                  }}>
                    <input type="hidden" name="id" value={diagram.id} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all" type="submit" name="intent" value="delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </fetcher.Form>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
