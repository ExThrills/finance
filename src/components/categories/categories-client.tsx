"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson } from "@/lib/api-client";
import { categoryKinds } from "@/lib/validators";
import type { CategoryRecord } from "@/types/finance";

export function CategoriesClient() {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>("expense");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchJson<CategoryRecord[]>("/api/categories");
        setCategories(data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load categories.";
        toast.error(message);
      }
    };
    load();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    try {
      const category = await fetchJson<CategoryRecord>("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), kind }),
      });
      setCategories((prev) => [...prev, category]);
      setName("");
      toast.success("Category created.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create category.";
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetchJson(`/api/categories/${id}`, { method: "DELETE" });
      setCategories((prev) => prev.filter((category) => category.id !== id));
      toast.success("Category removed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete category.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Organize spending and income across buckets.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add category</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 lg:grid-cols-[1fr_200px_auto]"
          >
            <div className="space-y-1">
              <Label htmlFor="category-name">Category name</Label>
              <Input
                id="category-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Rent, Groceries, Salary"
              />
            </div>
            <div className="space-y-1">
              <Label>Kind</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {categoryKinds.map((categoryKind) => (
                    <SelectItem key={categoryKind} value={categoryKind}>
                      {categoryKind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit">Add category</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categories yet.</p>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{category.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {category.kind}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => handleDelete(category.id)}
                >
                  Remove
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
