"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ArrowDown, ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import type {
  AccountRecord,
  AutomationRuleRecord,
  CategoryRecord,
  TagRecord,
  TransferSuggestion,
} from "@/types/finance";

type ActionDraft =
  | { id: string; type: "set_category"; categoryId: string }
  | { id: string; type: "add_tag"; tagId: string }
  | { id: string; type: "set_note"; note: string }
  | {
      id: string;
      type: "set_splits";
      splits: {
        id: string;
        amount: string;
        categoryId: string;
        accountId: string;
        description: string;
        notes: string;
      }[];
    };

const actionTypes = ["set_category", "add_tag", "set_note", "set_splits"] as const;

const newAction = (type: (typeof actionTypes)[number]): ActionDraft => {
  const id = `action-${Math.random().toString(36).slice(2)}`;
  if (type === "set_category") {
    return { id, type, categoryId: "" };
  }
  if (type === "add_tag") {
    return { id, type, tagId: "" };
  }
  if (type === "set_note") {
    return { id, type, note: "" };
  }
  return {
    id,
    type: "set_splits",
    splits: [
      {
        id: `split-${Math.random().toString(36).slice(2)}`,
        amount: "",
        categoryId: "",
        accountId: "",
        description: "",
        notes: "",
      },
    ],
  };
};

export function AutomationClient() {
  const [rules, setRules] = useState<AutomationRuleRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [suggestions, setSuggestions] = useState<TransferSuggestion[]>([]);

  const [name, setName] = useState("");
  const [matchDescription, setMatchDescription] = useState("");
  const [matchAmountMin, setMatchAmountMin] = useState("");
  const [matchAmountMax, setMatchAmountMax] = useState("");
  const [matchAccountId, setMatchAccountId] = useState("");
  const [matchCategoryId, setMatchCategoryId] = useState("");
  const [onlyUncategorized, setOnlyUncategorized] = useState(true);
  const [priority, setPriority] = useState("0");
  const [actions, setActions] = useState<ActionDraft[]>([]);

  const templates = useMemo(
    () => [
      {
        label: "Gas stations",
        description: "Auto-categorize gas purchases.",
        matchDescription: "gas",
        categoryName: "Gas",
      },
      {
        label: "Rideshare",
        description: "Auto-categorize rideshare trips.",
        matchDescription: "uber",
        categoryName: "Rideshare",
      },
      {
        label: "Groceries",
        description: "Auto-categorize grocery runs.",
        matchDescription: "grocery",
        categoryName: "Groceries",
      },
    ],
    []
  );

  const applyTemplate = (template: (typeof templates)[number]) => {
    const category =
      categories.find((item) => item.name === template.categoryName) ??
      categories.find((item) => item.kind === "expense") ??
      null;
    setName(template.label);
    setMatchDescription(template.matchDescription);
    setOnlyUncategorized(true);
    setActions(
      category
        ? [{ id: `action-${template.label}`, type: "set_category", categoryId: category.id }]
        : []
    );
  };

  const previewRule = (rule: AutomationRuleRecord) => {
    const account = accounts.find((item) => item.id === rule.matchAccountId);
    const accountName = account ? account.name : "Any account";
    const range =
      rule.matchAmountMin || rule.matchAmountMax
        ? `${rule.matchAmountMin ? formatCurrency(rule.matchAmountMin) : "Any"} to ${
            rule.matchAmountMax ? formatCurrency(rule.matchAmountMax) : "Any"
          }`
        : "Any amount";
    return {
      name: rule.matchDescription
        ? `Contains "${rule.matchDescription}"`
        : rule.onlyUncategorized
        ? "Uncategorized transactions"
        : "Any transaction",
      accountName: `${accountName} · ${range}`,
    };
  };

  const sortedRules = useMemo(
    () => [...rules].sort((a, b) => b.priority - a.priority),
    [rules]
  );

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.kind === "expense"),
    [categories]
  );

  const load = async () => {
    try {
      const [rulesData, accountsData, categoriesData, tagsData, suggestionsData] =
        await Promise.all([
          fetchJson<AutomationRuleRecord[]>("/api/rules"),
          fetchJson<AccountRecord[]>("/api/accounts"),
          fetchJson<CategoryRecord[]>("/api/categories"),
          fetchJson<TagRecord[]>("/api/tags"),
          fetchJson<TransferSuggestion[]>("/api/transfer-suggestions"),
        ]);
      setRules(rulesData);
      setAccounts(accountsData);
      setCategories(categoriesData);
      setTags(tagsData);
      setSuggestions(suggestionsData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load automation.";
      toast.error(message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAddAction = (type: (typeof actionTypes)[number]) => {
    setActions((prev) => [...prev, newAction(type)]);
  };

  const handleRemoveAction = (id: string) => {
    setActions((prev) => prev.filter((action) => action.id !== id));
  };

  const updateAction = (
    id: string,
    updater: (action: ActionDraft) => ActionDraft
  ) => {
    setActions((prev) =>
      prev.map((action) => (action.id === id ? updater(action) : action))
    );
  };

  const updateSplit = (actionId: string, splitId: string, patch: any) => {
    setActions((prev) =>
      prev.map((action) => {
        if (action.id !== actionId || action.type !== "set_splits") {
          return action;
        }
        return {
          ...action,
          splits: action.splits.map((split) =>
            split.id === splitId ? { ...split, ...patch } : split
          ),
        };
      })
    );
  };

  const addSplitRow = (actionId: string) => {
    setActions((prev) =>
      prev.map((action) => {
        if (action.id !== actionId || action.type !== "set_splits") {
          return action;
        }
        return {
          ...action,
          splits: [
            ...action.splits,
            {
              id: `split-${Math.random().toString(36).slice(2)}`,
              amount: "",
              categoryId: "",
              accountId: "",
              description: "",
              notes: "",
            },
          ],
        };
      })
    );
  };

  const handleCreateRule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Rule name is required.");
      return;
    }
    if (!actions.length) {
      toast.error("Add at least one action.");
      return;
    }

    const actionPayloads = actions.map((action) => {
      if (action.type === "set_category") {
        return {
          actionType: action.type,
          actionPayload: { categoryId: action.categoryId },
        };
      }
      if (action.type === "add_tag") {
        return {
          actionType: action.type,
          actionPayload: { tagId: action.tagId },
        };
      }
      if (action.type === "set_note") {
        return {
          actionType: action.type,
          actionPayload: { note: action.note },
        };
      }
      return {
        actionType: action.type,
        actionPayload: {
          splits: action.splits.map((split) => ({
            amount: Math.round(Number.parseFloat(split.amount) * 100),
            categoryId: split.categoryId || null,
            accountId: split.accountId || null,
            description: split.description || null,
            notes: split.notes || null,
          })),
        },
      };
    });

    try {
      const created = await fetchJson<AutomationRuleRecord>("/api/rules", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          enabled: true,
          priority: Number.parseInt(priority, 10) || 0,
          onlyUncategorized,
          matchDescription: matchDescription.trim() || undefined,
          matchAmountMin: matchAmountMin
            ? Math.round(Number.parseFloat(matchAmountMin) * 100)
            : undefined,
          matchAmountMax: matchAmountMax
            ? Math.round(Number.parseFloat(matchAmountMax) * 100)
            : undefined,
          matchAccountId: matchAccountId || null,
          matchCategoryId: matchCategoryId || null,
          actions: actionPayloads,
        }),
      });
      setRules((prev) => [created, ...prev]);
      setName("");
      setMatchDescription("");
      setMatchAmountMin("");
      setMatchAmountMax("");
      setMatchAccountId("");
      setMatchCategoryId("");
      setOnlyUncategorized(true);
      setPriority("0");
      setActions([]);
      toast.success("Rule created.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create rule.";
      toast.error(message);
    }
  };

  const handleToggle = async (rule: AutomationRuleRecord) => {
    try {
      const updated = await fetchJson<AutomationRuleRecord>(`/api/rules/${rule.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      setRules((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update rule.";
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetchJson(`/api/rules/${id}`, { method: "DELETE" });
      setRules((prev) => prev.filter((rule) => rule.id !== id));
      toast.success("Rule removed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete rule.";
      toast.error(message);
    }
  };

  const applyRules = async () => {
    try {
      const response = await fetchJson<{ applied: number }>("/api/rules/apply", {
        method: "POST",
        body: JSON.stringify({ mode: "uncategorized" }),
      });
      toast.success(`Applied rules to ${response.applied} transactions.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to apply rules.";
      toast.error(message);
    }
  };

  const handleTransfer = async (suggestion: TransferSuggestion) => {
    try {
      await fetchJson("/api/transfers", {
        method: "POST",
        body: JSON.stringify({
          amount: suggestion.amount,
          date: new Date().toISOString().slice(0, 10),
          description: suggestion.reason,
          sourceAccountId: suggestion.sourceAccountId,
          destinationAccountId: suggestion.destinationAccountId,
          memo: suggestion.reason,
        }),
      });
      setSuggestions((prev) =>
        prev.filter((item) => item.id !== suggestion.id)
      );
      toast.success("Transfer recorded.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create transfer.";
      toast.error(message);
    }
  };

  const moveRule = async (rule: AutomationRuleRecord, direction: "up" | "down") => {
    const ordered = [...sortedRules];
    const index = ordered.findIndex((item) => item.id === rule.id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) {
      return;
    }
    const swapped = [...ordered];
    [swapped[index], swapped[swapIndex]] = [swapped[swapIndex], swapped[index]];
    const next = swapped.map((item, i) => ({
      ...item,
      priority: swapped.length - i,
    }));
    setRules(next);
    try {
      await Promise.all([
        fetchJson(`/api/rules/${next[index].id}`, {
          method: "PATCH",
          body: JSON.stringify({ priority: next[index].priority }),
        }),
        fetchJson(`/api/rules/${next[swapIndex].id}`, {
          method: "PATCH",
          body: JSON.stringify({ priority: next[swapIndex].priority }),
        }),
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reorder rule.";
      toast.error(message);
      await load();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automation"
        description="Create rules to auto-categorize and tag transactions."
        actions={
          <Button variant="outline" onClick={applyRules}>
            Apply rules to uncategorized
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Rule templates</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {templates.map((template) => (
            <button
              key={template.label}
              type="button"
              className="rounded-lg border bg-muted/20 p-4 text-left transition hover:bg-muted/30"
              onClick={() => applyTemplate(template)}
            >
              <p className="font-semibold">{template.label}</p>
              <p className="text-xs text-muted-strong">{template.description}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create rule</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateRule} className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1">
                <Label>Rule name</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Input
                  inputMode="numeric"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1">
                <Label>Description contains</Label>
                <Input
                  value={matchDescription}
                  onChange={(event) => setMatchDescription(event.target.value)}
                  placeholder="Uber, Netflix"
                />
              </div>
              <div className="space-y-1">
                <Label>Only uncategorized</Label>
                <Select
                  value={onlyUncategorized ? "yes" : "no"}
                  onValueChange={(value) => setOnlyUncategorized(value === "yes")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1">
                <Label>Amount min</Label>
                <Input
                  inputMode="decimal"
                  value={matchAmountMin}
                  onChange={(event) => setMatchAmountMin(event.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label>Amount max</Label>
                <Input
                  inputMode="decimal"
                  value={matchAmountMax}
                  onChange={(event) => setMatchAmountMax(event.target.value)}
                  placeholder="200.00"
                />
              </div>
              <div className="space-y-1">
                <Label>Match account</Label>
                <Select value={matchAccountId || "any"} onValueChange={(value) => setMatchAccountId(value === "any" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any account</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Match category</Label>
                <Select value={matchCategoryId || "any"} onValueChange={(value) => setMatchCategoryId(value === "any" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Label>Actions</Label>
                {actionTypes.map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant="outline"
                    onClick={() => handleAddAction(type)}
                  >
                    Add {type.replace("_", " ")}
                  </Button>
                ))}
              </div>

              {actions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No actions yet.</p>
              ) : (
                <div className="space-y-3">
                  {actions.map((action) => (
                    <div key={action.id} className="rounded-lg border bg-muted/20 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{action.type}</p>
                        <Button variant="ghost" type="button" onClick={() => handleRemoveAction(action.id)}>
                          Remove
                        </Button>
                      </div>
                      {action.type === "set_category" ? (
                        <Select
                          value={action.categoryId}
                          onValueChange={(value) =>
                            updateAction(action.id, (current) =>
                              current.type === "set_category"
                                ? { ...current, categoryId: value }
                                : current
                            )
                          }
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                      {action.type === "add_tag" ? (
                        <Select
                          value={action.tagId}
                          onValueChange={(value) =>
                            updateAction(action.id, (current) =>
                              current.type === "add_tag"
                                ? { ...current, tagId: value }
                                : current
                            )
                          }
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select tag" />
                          </SelectTrigger>
                          <SelectContent>
                            {tags.map((tag) => (
                              <SelectItem key={tag.id} value={tag.id}>
                                {tag.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                      {action.type === "set_note" ? (
                        <Input
                          className="mt-2"
                          value={action.note}
                          onChange={(event) =>
                            updateAction(action.id, (current) =>
                              current.type === "set_note"
                                ? { ...current, note: event.target.value }
                                : current
                            )
                          }
                          placeholder="Add a note"
                        />
                      ) : null}
                      {action.type === "set_splits" ? (
                        <div className="mt-3 space-y-3">
                          {action.splits.map((split) => (
                            <div key={split.id} className="grid gap-2 lg:grid-cols-5">
                              <Input
                                value={split.amount}
                                onChange={(event) =>
                                  updateSplit(action.id, split.id, { amount: event.target.value })
                                }
                                placeholder="Amount"
                                inputMode="decimal"
                              />
                              <Select
                                value={split.categoryId || "none"}
                                onValueChange={(value) =>
                                  updateSplit(action.id, split.id, { categoryId: value === "none" ? "" : value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {expenseCategories.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={split.accountId || "none"}
                                onValueChange={(value) =>
                                  updateSplit(action.id, split.id, { accountId: value === "none" ? "" : value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Account" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Default</SelectItem>
                                  {accounts.map((account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                      {account.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                value={split.description}
                                onChange={(event) =>
                                  updateSplit(action.id, split.id, { description: event.target.value })
                                }
                                placeholder="Description"
                              />
                              <Input
                                value={split.notes}
                                onChange={(event) =>
                                  updateSplit(action.id, split.id, { notes: event.target.value })
                                }
                                placeholder="Notes"
                              />
                            </div>
                          ))}
                          <Button type="button" variant="outline" onClick={() => addSplitRow(action.id)}>
                            Add split line
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit">Create rule</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedRules.length === 0 ? (
            <EmptyState
              title="No rules yet"
              description="Create your first automation rule or pick a template."
            />
          ) : (
            sortedRules.map((rule, index) => {
              const preview = previewRule(rule);
              return (
              <div
                key={rule.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{rule.name}</p>
                  <p className="text-xs text-muted-strong">
                    Priority {rule.priority} · {rule.enabled ? "enabled" : "disabled"}
                  </p>
                  <p className="text-xs text-muted-strong">
                    Preview: {preview.name} · {preview.accountName}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-strong">
                  {rule.matchDescription ? <span>desc: {rule.matchDescription}</span> : null}
                  {rule.matchAmountMin ? <span>min: {formatCurrency(rule.matchAmountMin)}</span> : null}
                  {rule.matchAmountMax ? <span>max: {formatCurrency(rule.matchAmountMax)}</span> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === 0}
                    onClick={() => moveRule(rule, "up")}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === sortedRules.length - 1}
                    onClick={() => moveRule(rule, "down")}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => handleToggle(rule)}>
                    {rule.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button variant="ghost" onClick={() => handleDelete(rule.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transfer suggestions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suggestions yet.</p>
          ) : (
            suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{suggestion.reason}</p>
                  <p className="text-xs text-muted-strong">
                    {formatCurrency(suggestion.amount)}
                  </p>
                </div>
                <Button variant="outline" onClick={() => handleTransfer(suggestion)}>
                  Create transfer
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
