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

test("setup hub account scenarios", { skip: !shouldRun }, async () => {
  const checkingName = unique("checking");
  const savingsName = unique("savings");
  const creditName = unique("credit");
  const loanName = unique("loan");

  const checkingRes = await fetchJson("/api/accounts", {
    method: "POST",
    body: JSON.stringify({
      name: checkingName,
      type: "checking",
      startingBalance: 10000,
    }),
  });
  assert.equal(checkingRes.status, 200);
  assert.equal(checkingRes.data.currentBalance, 10000);

  const savingsRes = await fetchJson("/api/accounts", {
    method: "POST",
    body: JSON.stringify({
      name: savingsName,
      type: "savings",
      startingBalance: 25000,
    }),
  });
  assert.equal(savingsRes.status, 200);

  const creditRes = await fetchJson("/api/accounts", {
    method: "POST",
    body: JSON.stringify({
      name: creditName,
      type: "credit",
      creditLimit: 500000,
      startingBalance: -125000,
    }),
  });
  assert.equal(creditRes.status, 200);
  assert.equal(creditRes.data.creditLimit, 500000);
  assert.equal(creditRes.data.availableCredit, 375000);

  const loanRes = await fetchJson("/api/accounts", {
    method: "POST",
    body: JSON.stringify({
      name: loanName,
      type: "loan",
      startingBalance: 2250000,
      apr: 4.5,
    }),
  });
  assert.equal(loanRes.status, 200);
  assert.equal(loanRes.data.type, "loan");

  const accountsRes = await fetchJson("/api/accounts");
  assert.equal(accountsRes.status, 200);
  const names = accountsRes.data.map((account) => account.name);
  assert.ok(names.includes(checkingName));
  assert.ok(names.includes(savingsName));
  assert.ok(names.includes(creditName));
  assert.ok(names.includes(loanName));
});
