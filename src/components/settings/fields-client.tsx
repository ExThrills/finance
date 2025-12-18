"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fetchJson } from "@/lib/api-client";
import { fieldTypes } from "@/lib/validators";
import type { FieldDefinitionRecord } from "@/types/finance";

export function FieldsClient() {
  const [fields, setFields] = useState<FieldDefinitionRecord[]>([]);
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState<string>("text");
  const [options, setOptions] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchJson<FieldDefinitionRecord[]>("/api/fields");
        setFields(data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load fields.";
        toast.error(message);
      }
    };
    load();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Field name is required.");
      return;
    }
    const payload = {
      name: name.trim(),
      fieldType,
      selectOptions:
        fieldType === "select"
          ? options
              .split(",")
              .map((opt) => opt.trim())
              .filter(Boolean)
          : null,
    };
    try {
      const field = await fetchJson<FieldDefinitionRecord>("/api/fields", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setFields((prev) => [...prev, field]);
      setName("");
      setOptions("");
      toast.success("Field created.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create field.";
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetchJson(`/api/fields/${id}`, { method: "DELETE" });
      setFields((prev) => prev.filter((field) => field.id !== id));
      toast.success("Field removed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete field.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Custom fields</h1>
        <p className="text-sm text-muted-foreground">
          Add columns to your transactions without database migrations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add field</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="field-name">Field name</Label>
                <Input
                  id="field-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Merchant, Project, Receipt"
                />
              </div>
              <div className="space-y-1">
                <Label>Field type</Label>
                <Select value={fieldType} onValueChange={setFieldType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {fieldType === "select" && (
              <div className="space-y-1">
                <Label htmlFor="field-options">Select options</Label>
                <Textarea
                  id="field-options"
                  value={options}
                  onChange={(event) => setOptions(event.target.value)}
                  placeholder="Option A, Option B, Option C"
                />
              </div>
            )}
            <div>
              <Button type="submit">Add field</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Field definitions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom fields yet.</p>
          ) : (
            fields.map((field) => (
              <div
                key={field.id}
                className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{field.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {field.fieldType}
                  </p>
                </div>
                <Button variant="ghost" onClick={() => handleDelete(field.id)}>
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
