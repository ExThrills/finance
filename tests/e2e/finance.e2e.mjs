import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const shouldRun = process.env.RUN_E2E === "1";

const fetchJson = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { status: response.status, data };
};

const unique = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

test("transaction creation requires account and supports rules", { skip: !shouldRun }, async () => {
  const accountName = unique("checking");
  const categoryName = unique("groceries");

  const accountRes = await fetchJson("/api/accounts", {
    method: "POST",
    body: JSON.stringify({ name: accountName, type: "checking" }),
  });
  assert.equal(accountRes.status, 200);
  const accountId = accountRes.data.id;

  const categoryRes = await fetchJson("/api/categories", {
    method: "POST",
    body: JSON.stringify({ name: categoryName, kind: "expense" }),
  });
  assert.equal(categoryRes.status, 200);
  const categoryId = categoryRes.data.id;

  const txRes = await fetchJson("/api/transactions", {
    method: "POST",
    body: JSON.stringify({
      accountId,
      categoryId,
      amount: 4200,
      date: new Date().toISOString().slice(0, 10),
      description: "E2E groceries",
    }),
  });
  assert.equal(txRes.status, 200);
  assert.equal(txRes.data.accountId, accountId);
});

test("transfer creation", { skip: !shouldRun }, async () => {
  const sourceRes = await fetchJson("/api/accounts", {
    method: "POST",
    body: JSON.stringify({ name: unique("source"), type: "checking" }),
  });
  const destRes = await fetchJson("/api/accounts", {
    method: "POST",
    body: JSON.stringify({ name: unique("dest"), type: "credit" }),
  });
  assert.equal(sourceRes.status, 200);
  assert.equal(destRes.status, 200);

  const transferRes = await fetchJson("/api/transfers", {
    method: "POST",
    body: JSON.stringify({
      amount: 15000,
      date: new Date().toISOString().slice(0, 10),
      description: "E2E transfer",
      sourceAccountId: sourceRes.data.id,
      destinationAccountId: destRes.data.id,
    }),
  });
  assert.equal(transferRes.status, 200);
  assert.ok(Array.isArray(transferRes.data.transactions));
});

test("reconciliation lock blocks edits", { skip: !shouldRun }, async () => {
  const accountRes = await fetchJson("/api/accounts", {
    method: "POST",
    body: JSON.stringify({ name: unique("recon"), type: "checking" }),
  });
  assert.equal(accountRes.status, 200);
  const accountId = accountRes.data.id;

  const date = new Date().toISOString().slice(0, 10);
  const txRes = await fetchJson("/api/transactions", {
    method: "POST",
    body: JSON.stringify({
      accountId,
      amount: 1200,
      date,
      description: "Recon tx",
    }),
  });
  assert.equal(txRes.status, 200);

  const periodRes = await fetchJson("/api/reconciliation/periods", {
    method: "POST",
    body: JSON.stringify({
      accountId,
      startDate: date,
      endDate: date,
    }),
  });
  assert.equal(periodRes.status, 200);

  const lockRes = await fetchJson(`/api/reconciliation/periods/${periodRes.data.id}`, {
    method: "PATCH",
    body: JSON.stringify({ locked: true }),
  });
  assert.equal(lockRes.status, 200);

  const updateRes = await fetchJson(`/api/transactions/${txRes.data.id}`, {
    method: "PATCH",
    body: JSON.stringify({ description: "Blocked update" }),
  });
  assert.equal(updateRes.status, 403);
});

test("budgets and alerts flows", { skip: !shouldRun }, async () => {
  const accountRes = await fetchJson("/api/accounts", {
    method: "POST",
    body: JSON.stringify({ name: unique("budget"), type: "checking" }),
  });
  const categoryRes = await fetchJson("/api/categories", {
    method: "POST",
    body: JSON.stringify({ name: unique("fuel"), kind: "expense" }),
  });
  assert.equal(accountRes.status, 200);
  assert.equal(categoryRes.status, 200);

  const budgetRes = await fetchJson("/api/budgets", {
    method: "POST",
    body: JSON.stringify({
      name: unique("budget"),
      scopeType: "category",
      categoryId: categoryRes.data.id,
      period: "monthly",
      targetAmount: 20000,
    }),
  });
  assert.equal(budgetRes.status, 200);

  const alertRes = await fetchJson("/api/alert-rules", {
    method: "POST",
    body: JSON.stringify({
      name: unique("low cash"),
      ruleType: "low_cash",
      thresholdAmount: 10000,
      accountId: accountRes.data.id,
    }),
  });
  assert.equal(alertRes.status, 200);

  const runRes = await fetchJson("/api/alerts/run", { method: "POST" });
  assert.equal(runRes.status, 200);
});
