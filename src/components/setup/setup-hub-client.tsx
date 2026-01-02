"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toolbar } from "@/components/ui/toolbar";
import { PlaidLinkButton } from "@/components/setup/plaid-link-button";
import { accountTypes, categoryKinds } from "@/lib/validators";
import { parseAmountToCents, formatCurrency, formatDateInput } from "@/lib/format";
import { fetchJson } from "@/lib/api-client";
import type { AccountRecord, CategoryRecord } from "@/types/finance";

type AccountDraft = {
  id: string;
  name: string;
  type: string;
  startingBalance: string;
  creditLimit: string;
  institution: string;
  last4: string;
  statementCloseDay: string;
  statementDueDay: string;
  rewardCurrency: string;
  apr: string;
  showAdvanced: boolean;
};

type QuickAccountDraft = {
  id: string;
  name: string;
  type: string;
  last4: string;
  startingBalance: string;
  creditLimit: string;
  apr: string;
  statementCloseDay: string;
  statementDueDay: string;
};

type DraftErrors = {
  name?: string;
  startingBalance?: string;
  creditLimit?: string;
  last4?: string;
  statementCloseDay?: string;
  statementDueDay?: string;
  apr?: string;
};

type DebtDraft = {
  id: string;
  name: string;
  currentBalance: string;
  apr: string;
  dueDay: string;
};

type DebtErrors = {
  name?: string;
  currentBalance?: string;
  apr?: string;
  dueDay?: string;
};

type CategoryDraft = {
  id: string;
  name: string;
  kind: "expense" | "income";
};

type CategoryErrors = {
  name?: string;
};

type RuleTemplate = {
  id: string;
  label: string;
  matchDescription: string;
  categoryName: string;
};

type RecurringDraft = {
  id: string;
  description: string;
  amount: string;
  cadence: "weekly" | "monthly";
  nextDate: string;
  accountRef: string;
  categoryKey: string;
};

type RecurringErrors = {
  description?: string;
  amount?: string;
  cadence?: string;
  nextDate?: string;
  accountRef?: string;
};

type SetupSectionId =
  | "setup-accounts"
  | "setup-debts"
  | "setup-income"
  | "setup-categories"
  | "setup-review";

type DraftTouched = Partial<Record<keyof DraftErrors | "name", boolean>>;
type DebtTouched = Partial<Record<keyof DebtErrors | "name", boolean>>;
type CategoryTouched = Partial<Record<keyof CategoryErrors | "name", boolean>>;
type RecurringTouched = Partial<Record<keyof RecurringErrors | "description", boolean>>;

const defaultCategories: Array<{ name: string; kind: "expense" | "income" }> = [
  { name: "Salary", kind: "income" },
  { name: "Interest", kind: "income" },
  { name: "Refunds", kind: "income" },
  { name: "Rent", kind: "expense" },
  { name: "Groceries", kind: "expense" },
  { name: "Utilities", kind: "expense" },
  { name: "Dining", kind: "expense" },
  { name: "Transportation", kind: "expense" },
  { name: "Entertainment", kind: "expense" },
  { name: "Health", kind: "expense" },
  { name: "Insurance", kind: "expense" },
  { name: "Travel", kind: "expense" },
  { name: "Shopping", kind: "expense" },
  { name: "Subscriptions", kind: "expense" },
  { name: "Fees", kind: "expense" },
];

const ruleTemplates: RuleTemplate[] = [
  {
    id: "template-gas",
    label: "Gas stations",
    matchDescription: "gas",
    categoryName: "Gas",
  },
  {
    id: "template-rideshare",
    label: "Rideshare",
    matchDescription: "uber",
    categoryName: "Rideshare",
  },
  {
    id: "template-groceries",
    label: "Groceries",
    matchDescription: "grocery",
    categoryName: "Groceries",
  },
];

const recurringTemplates = [
  {
    id: "recurring-rent",
    label: "Rent",
    cadence: "monthly" as const,
    description: "Rent",
    amount: "-1500.00",
  },
  {
    id: "recurring-payroll",
    label: "Payroll",
    cadence: "weekly" as const,
    description: "Paycheck",
    amount: "2000.00",
  },
  {
    id: "recurring-subscription",
    label: "Subscription",
    cadence: "monthly" as const,
    description: "Subscription",
    amount: "-19.99",
  },
];

const setupStartKey = "setupHubStartedAt";
const setupDraftKey = "setupHubDrafts";

const newDraft = (): AccountDraft => ({
  id: `draft-${Math.random().toString(36).slice(2)}`,
  name: "",
  type: "checking",
  startingBalance: "",
  creditLimit: "",
  institution: "",
  last4: "",
  statementCloseDay: "",
  statementDueDay: "",
  rewardCurrency: "",
  apr: "",
  showAdvanced: false,
});

const newQuickAccountDraft = (): QuickAccountDraft => ({
  id: `quick-${Math.random().toString(36).slice(2)}`,
  name: "",
  type: "checking",
  last4: "",
  startingBalance: "",
  creditLimit: "",
  apr: "",
  statementCloseDay: "",
  statementDueDay: "",
});

const newDebtDraft = (): DebtDraft => ({
  id: `debt-${Math.random().toString(36).slice(2)}`,
  name: "",
  currentBalance: "",
  apr: "",
  dueDay: "",
});

const newCategoryDraft = (): CategoryDraft => ({
  id: `category-${Math.random().toString(36).slice(2)}`,
  name: "",
  kind: "expense",
});

const newRecurringDraft = (): RecurringDraft => ({
  id: `recurring-${Math.random().toString(36).slice(2)}`,
  description: "",
  amount: "",
  cadence: "monthly",
  nextDate: formatDateInput(new Date()),
  accountRef: "",
  categoryKey: "",
});

const isRequiredStartingBalance = (type: string) =>
  ["checking", "savings", "cash", "investment", "loan", "other"].includes(type);

const buildCategoryKey = (name: string, kind: string) =>
  `${name.trim().toLowerCase()}::${kind}`;

const getDraftErrors = (draft: AccountDraft): DraftErrors => {
  const errors: DraftErrors = {};
  if (!draft.name.trim()) {
    errors.name = "Account name is required.";
  }

  const starting = parseAmountToCents(draft.startingBalance);
  const limit = parseAmountToCents(draft.creditLimit);

  if (draft.type === "credit") {
    if (limit === null || limit <= 0) {
      errors.creditLimit = "Credit cards need a limit.";
    }
    if (starting === null) {
      errors.startingBalance = "Current balance is required.";
    }
  } else if (isRequiredStartingBalance(draft.type) && starting === null) {
    errors.startingBalance = "Starting balance is required.";
  }

  if (draft.last4.trim() && !/^\d{4}$/.test(draft.last4.trim())) {
    errors.last4 = "Enter exactly 4 digits.";
  }

  if (draft.statementCloseDay.trim()) {
    const day = Number.parseInt(draft.statementCloseDay, 10);
    if (Number.isNaN(day) || day < 1 || day > 31) {
      errors.statementCloseDay = "Use a day between 1 and 31.";
    }
  }

  if (draft.statementDueDay.trim()) {
    const day = Number.parseInt(draft.statementDueDay, 10);
    if (Number.isNaN(day) || day < 1 || day > 31) {
      errors.statementDueDay = "Use a day between 1 and 31.";
    }
  }

  if (draft.apr.trim()) {
    const apr = Number.parseFloat(draft.apr);
    if (Number.isNaN(apr) || apr < 0) {
      errors.apr = "APR must be zero or higher.";
    }
  }

  return errors;
};

const getDebtErrors = (debt: DebtDraft): DebtErrors => {
  const errors: DebtErrors = {};
  if (!debt.name.trim()) {
    errors.name = "Lender name is required.";
  }

  const balance = parseAmountToCents(debt.currentBalance);
  if (balance === null) {
    errors.currentBalance = "Current balance is required.";
  }

  if (debt.apr.trim()) {
    const apr = Number.parseFloat(debt.apr);
    if (Number.isNaN(apr) || apr < 0) {
      errors.apr = "APR must be zero or higher.";
    }
  }

  if (debt.dueDay.trim()) {
    const day = Number.parseInt(debt.dueDay, 10);
    if (Number.isNaN(day) || day < 1 || day > 31) {
      errors.dueDay = "Use a day between 1 and 31.";
    }
  }

  return errors;
};

const getCategoryErrors = (category: CategoryDraft): CategoryErrors => {
  const errors: CategoryErrors = {};
  if (!category.name.trim()) {
    errors.name = "Category name is required.";
  }
  return errors;
};

const getRecurringErrors = (recurring: RecurringDraft): RecurringErrors => {
  const errors: RecurringErrors = {};
  if (!recurring.description.trim()) {
    errors.description = "Description is required.";
  }

  const amount = parseAmountToCents(recurring.amount);
  if (amount === null) {
    errors.amount = "Amount is required.";
  }

  if (!recurring.cadence) {
    errors.cadence = "Cadence is required.";
  }

  if (!recurring.nextDate.trim()) {
    errors.nextDate = "Next date is required.";
  } else if (Number.isNaN(new Date(recurring.nextDate).getTime())) {
    errors.nextDate = "Use a valid date.";
  }

  if (!recurring.accountRef) {
    errors.accountRef = "Select an account.";
  }

  return errors;
};

export function SetupHubClient() {
  const router = useRouter();
  const quickFormRef = useRef<HTMLDivElement>(null);
  const quickInstitutionRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<AccountDraft[]>([newDraft()]);
  const [quickInstitution, setQuickInstitution] = useState("");
  const [quickAccounts, setQuickAccounts] = useState<QuickAccountDraft[]>([
    newQuickAccountDraft(),
  ]);
  const [debtDrafts, setDebtDrafts] = useState<DebtDraft[]>([]);
  const [customCategories, setCustomCategories] = useState<CategoryDraft[]>([]);
  const [recurringDrafts, setRecurringDrafts] = useState<RecurringDraft[]>([]);
  const [useDefaultCategories, setUseDefaultCategories] = useState(true);
  const [selectedRuleTemplates, setSelectedRuleTemplates] = useState<string[]>([]);
  const [existingCategories, setExistingCategories] = useState<CategoryRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [setupStartedAt, setSetupStartedAt] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [draftTouched, setDraftTouched] = useState<Record<string, DraftTouched>>({});
  const [debtTouched, setDebtTouched] = useState<Record<string, DebtTouched>>({});
  const [categoryTouched, setCategoryTouched] = useState<Record<string, CategoryTouched>>({});
  const [recurringTouched, setRecurringTouched] = useState<
    Record<string, RecurringTouched>
  >({});
  const [collapsedSections, setCollapsedSections] = useState<
    Record<SetupSectionId, boolean>
  >({
    "setup-accounts": false,
    "setup-debts": false,
    "setup-income": false,
    "setup-categories": false,
    "setup-review": false,
  });
  const [activeStep, setActiveStep] = useState<SetupSectionId>("setup-accounts");
  const [hasLoadedDrafts, setHasLoadedDrafts] = useState(false);

  const updateDraft = (id: string, patch: Partial<AccountDraft>) => {
    setDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft))
    );
  };

  const markDraftTouched = (id: string, field: keyof DraftTouched) => {
    setDraftTouched((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: true },
    }));
  };

  const addDraft = () => {
    setDrafts((prev) => [...prev, newDraft()]);
  };

  const removeDraft = (id: string) => {
    setDrafts((prev) => prev.filter((draft) => draft.id !== id));
  };

  const resetQuickAccounts = () => {
    setQuickInstitution("");
    setQuickAccounts([newQuickAccountDraft()]);
  };

  const handleQuickSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!quickInstitution.trim()) {
      toast.error("Bank name is required.");
      return;
    }
    const prepared = quickAccounts
      .map((draft) => ({
        draft,
        name: draft.name.trim(),
      }))
      .filter((entry) => entry.name.length > 0);

    if (prepared.length === 0) {
      toast.error("Add at least one account.");
      return;
    }

    const newDrafts = prepared.map(({ draft }) => {
      const base = newDraft();
      const showAdvanced = Boolean(
        draft.last4.trim() ||
          draft.apr.trim() ||
          draft.statementCloseDay.trim() ||
          draft.statementDueDay.trim()
      );
      return {
        ...base,
        name: draft.name.trim(),
        type: draft.type,
        institution: quickInstitution.trim(),
        last4: draft.last4.trim(),
        startingBalance: draft.startingBalance.trim(),
        creditLimit: draft.creditLimit.trim(),
        apr: draft.apr.trim(),
        statementCloseDay: draft.statementCloseDay.trim(),
        statementDueDay: draft.statementDueDay.trim(),
        showAdvanced,
      };
    });

    setDrafts((prev) => [...prev, ...newDrafts]);
    resetQuickAccounts();
    toast.success("Accounts added to setup.");
  };

  const handleAddUnderBank = (bankName: string) => {
    setQuickInstitution(bankName);
    setQuickAccounts((prev) => {
      const hasEmpty = prev.some((entry) => !entry.name.trim());
      return hasEmpty ? prev : [...prev, newQuickAccountDraft()];
    });
    quickFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => quickInstitutionRef.current?.focus(), 0);
  };

  const updateDebtDraft = (id: string, patch: Partial<DebtDraft>) => {
    setDebtDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft))
    );
  };

  const markDebtTouched = (id: string, field: keyof DebtTouched) => {
    setDebtTouched((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: true },
    }));
  };

  const addDebtDraft = () => {
    setDebtDrafts((prev) => [...prev, newDebtDraft()]);
  };

  const removeDebtDraft = (id: string) => {
    setDebtDrafts((prev) => prev.filter((draft) => draft.id !== id));
  };

  const updateCategoryDraft = (id: string, patch: Partial<CategoryDraft>) => {
    setCustomCategories((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft))
    );
  };

  const markCategoryTouched = (id: string, field: keyof CategoryTouched) => {
    setCategoryTouched((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: true },
    }));
  };

  const addCategoryDraft = () => {
    setCustomCategories((prev) => [...prev, newCategoryDraft()]);
  };

  const removeCategoryDraft = (id: string) => {
    setCustomCategories((prev) => prev.filter((draft) => draft.id !== id));
  };

  const updateRecurringDraft = (id: string, patch: Partial<RecurringDraft>) => {
    setRecurringDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft))
    );
  };

  const markRecurringTouched = (id: string, field: keyof RecurringTouched) => {
    setRecurringTouched((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: true },
    }));
  };

  const addRecurringDraft = (template?: (typeof recurringTemplates)[number]) => {
    if (template) {
      setRecurringDrafts((prev) => [
        ...prev,
        {
          ...newRecurringDraft(),
          description: template.description,
          amount: template.amount,
          cadence: template.cadence,
        },
      ]);
      return;
    }
    setRecurringDrafts((prev) => [...prev, newRecurringDraft()]);
  };

  const removeRecurringDraft = (id: string) => {
    setRecurringDrafts((prev) => prev.filter((draft) => draft.id !== id));
  };

  const toggleRuleTemplate = (id: string) => {
    setSelectedRuleTemplates((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const linkedLoanDrafts = useMemo(
    () => drafts.filter((draft) => draft.type === "loan"),
    [drafts]
  );

  const summary = useMemo(() => {
    let cashTotal = 0;
    let creditLimit = 0;
    let creditBalance = 0;
    let debtTotal = 0;
    let recurringNet = 0;

    drafts.forEach((draft) => {
      const starting = parseAmountToCents(draft.startingBalance) ?? 0;
      const limit = parseAmountToCents(draft.creditLimit) ?? 0;
      if (["checking", "savings", "cash", "investment", "other"].includes(draft.type)) {
        cashTotal += starting;
      }
      if (draft.type === "credit") {
        creditLimit += limit;
        creditBalance += Math.abs(starting);
      }
    });

    debtDrafts.forEach((debt) => {
      const balance = parseAmountToCents(debt.currentBalance) ?? 0;
      debtTotal += balance;
    });

    recurringDrafts.forEach((recurring) => {
      const amount = parseAmountToCents(recurring.amount) ?? 0;
      if (recurring.cadence === "weekly") {
        recurringNet += Math.round(amount * (52 / 12));
      } else {
        recurringNet += amount;
      }
    });

    const utilization = creditLimit > 0 ? creditBalance / creditLimit : 0;
    return { cashTotal, creditLimit, creditBalance, utilization, debtTotal, recurringNet };
  }, [drafts, debtDrafts, recurringDrafts]);

  const draftErrors = useMemo(() => {
    return drafts.reduce<Record<string, DraftErrors>>((acc, draft) => {
      acc[draft.id] = getDraftErrors(draft);
      return acc;
    }, {});
  }, [drafts]);

  const debtErrors = useMemo(() => {
    return debtDrafts.reduce<Record<string, DebtErrors>>((acc, debt) => {
      acc[debt.id] = getDebtErrors(debt);
      return acc;
    }, {});
  }, [debtDrafts]);

  const categoryErrors = useMemo(() => {
    return customCategories.reduce<Record<string, CategoryErrors>>((acc, category) => {
      acc[category.id] = getCategoryErrors(category);
      return acc;
    }, {});
  }, [customCategories]);

  const recurringErrors = useMemo(() => {
    return recurringDrafts.reduce<Record<string, RecurringErrors>>((acc, recurring) => {
      acc[recurring.id] = getRecurringErrors(recurring);
      return acc;
    }, {});
  }, [recurringDrafts]);

  const hasAccountErrors = useMemo(
    () => Object.values(draftErrors).some((errors) => Object.keys(errors).length > 0),
    [draftErrors]
  );

  const hasDebtErrors = useMemo(
    () => Object.values(debtErrors).some((errors) => Object.keys(errors).length > 0),
    [debtErrors]
  );

  const hasCategoryErrors = useMemo(
    () => Object.values(categoryErrors).some((errors) => Object.keys(errors).length > 0),
    [categoryErrors]
  );

  const hasRecurringErrors = useMemo(
    () => Object.values(recurringErrors).some((errors) => Object.keys(errors).length > 0),
    [recurringErrors]
  );

  const hasErrors = hasAccountErrors || hasDebtErrors || hasCategoryErrors || hasRecurringErrors;

  const shouldShowDraftError = (id: string, field: keyof DraftTouched) =>
    hasSubmitted || draftTouched[id]?.[field];

  const shouldShowDebtError = (id: string, field: keyof DebtTouched) =>
    hasSubmitted || debtTouched[id]?.[field];

  const shouldShowCategoryError = (id: string, field: keyof CategoryTouched) =>
    hasSubmitted || categoryTouched[id]?.[field];

  const shouldShowRecurringError = (id: string, field: keyof RecurringTouched) =>
    hasSubmitted || recurringTouched[id]?.[field];

  const categoryOptions = useMemo(() => {
    const entries = [
      ...existingCategories.map((category) => ({
        name: category.name,
        kind: category.kind,
      })),
      ...(useDefaultCategories ? defaultCategories : []),
      ...customCategories
        .filter((category) => category.name.trim())
        .map((category) => ({
          name: category.name.trim(),
          kind: category.kind,
        })),
    ];

    const seen = new Set<string>();
    return entries.filter((entry) => {
      const key = buildCategoryKey(entry.name, entry.kind);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [existingCategories, useDefaultCategories, customCategories]);

  const accountOptions = useMemo(
    () =>
      drafts.map((draft, index) => ({
        id: draft.id,
        label: draft.name.trim() || `Account ${index + 1}`,
      })),
    [drafts]
  );

  const institutions = useMemo(() => {
    const seen = new Set<string>();
    return drafts
      .map((draft) => draft.institution.trim())
      .filter((name) => name.length > 0)
      .filter((name) => {
        if (seen.has(name.toLowerCase())) {
          return false;
        }
        seen.add(name.toLowerCase());
        return true;
      });
  }, [drafts]);

  const steps = [
    { id: "setup-accounts" as const, label: "Accounts" },
    { id: "setup-debts" as const, label: "Debts" },
    { id: "setup-income" as const, label: "Income" },
    { id: "setup-categories" as const, label: "Categories" },
    { id: "setup-review" as const, label: "Review" },
  ];

  const stepIndex = steps.findIndex((step) => step.id === activeStep) + 1;

  const toggleSection = (section: SetupSectionId) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const goToStep = (section: SetupSectionId) => {
    setActiveStep(section);
    const target = document.getElementById(section);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchJson<CategoryRecord[]>("/api/categories");
        setExistingCategories(data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load categories.";
        toast.error(message);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(setupStartKey);
    if (stored) {
      const parsed = Number.parseInt(stored, 10);
      if (!Number.isNaN(parsed)) {
        setSetupStartedAt(parsed);
        return;
      }
    }
    const now = Date.now();
    window.localStorage.setItem(setupStartKey, String(now));
    setSetupStartedAt(now);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(setupDraftKey);
    if (!stored) {
      setHasLoadedDrafts(true);
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed.drafts) && parsed.drafts.length) {
        setDrafts(parsed.drafts);
      }
      if (typeof parsed.quickInstitution === "string") {
        setQuickInstitution(parsed.quickInstitution);
      }
      if (Array.isArray(parsed.quickAccounts) && parsed.quickAccounts.length) {
        setQuickAccounts(parsed.quickAccounts);
      }
      if (Array.isArray(parsed.debtDrafts)) {
        setDebtDrafts(parsed.debtDrafts);
      }
      if (Array.isArray(parsed.customCategories)) {
        setCustomCategories(parsed.customCategories);
      }
      if (Array.isArray(parsed.recurringDrafts)) {
        setRecurringDrafts(parsed.recurringDrafts);
      }
      if (typeof parsed.useDefaultCategories === "boolean") {
        setUseDefaultCategories(parsed.useDefaultCategories);
      }
      if (Array.isArray(parsed.selectedRuleTemplates)) {
        setSelectedRuleTemplates(parsed.selectedRuleTemplates);
      }
    } catch (error) {
      console.warn("Failed to load setup hub drafts", error);
    } finally {
      setHasLoadedDrafts(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedDrafts) {
      return;
    }
    const payload = {
      drafts,
      quickInstitution,
      quickAccounts,
      debtDrafts,
      customCategories,
      recurringDrafts,
      useDefaultCategories,
      selectedRuleTemplates,
    };
    try {
      window.localStorage.setItem(setupDraftKey, JSON.stringify(payload));
    } catch (error) {
      console.warn("Failed to persist setup hub drafts", error);
    }
  }, [
    drafts,
    quickInstitution,
    quickAccounts,
    debtDrafts,
    customCategories,
    recurringDrafts,
    useDefaultCategories,
    selectedRuleTemplates,
    hasLoadedDrafts,
  ]);

  const handleSubmit = async () => {
    if (hasErrors) {
      setHasSubmitted(true);
      toast.error("Fix the highlighted fields before finishing setup.");
      return;
    }

    const payloads = drafts.map((draft) => {
      if (!draft.name.trim()) {
        throw new Error("Every account needs a name.");
      }
      const starting = parseAmountToCents(draft.startingBalance);
      const limit = parseAmountToCents(draft.creditLimit);

      if (draft.type === "credit") {
        if (starting === null || Number.isNaN(starting)) {
          throw new Error("Credit cards need a current balance.");
        }
        if (limit === null || limit <= 0) {
          throw new Error("Credit cards need a credit limit.");
        }
      }
      if (
        draft.type !== "credit" &&
        (starting === null || Number.isNaN(starting))
      ) {
        throw new Error("Checking and savings accounts need a starting balance.");
      }

      const parsedApr = draft.apr ? Number.parseFloat(draft.apr) : null;
      const parsedClose = draft.statementCloseDay
        ? Number.parseInt(draft.statementCloseDay, 10)
        : null;
      const parsedDue = draft.statementDueDay
        ? Number.parseInt(draft.statementDueDay, 10)
        : null;

      return {
        name: draft.name.trim(),
        type: draft.type,
        institution: draft.institution.trim() || undefined,
        last4: draft.last4.trim() || undefined,
        creditLimit: limit ?? undefined,
        startingBalance: starting ?? undefined,
        apr: parsedApr ?? undefined,
        statementCloseDay: parsedClose ?? undefined,
        statementDueDay: parsedDue ?? undefined,
        rewardCurrency: draft.rewardCurrency.trim() || undefined,
      };
    });

    const debtPayloads = debtDrafts.map((debt) => {
      if (!debt.name.trim()) {
        throw new Error("Every debt needs a lender name.");
      }
      const balance = parseAmountToCents(debt.currentBalance);
      if (balance === null || Number.isNaN(balance)) {
        throw new Error("Every debt needs a current balance.");
      }
      const parsedApr = debt.apr ? Number.parseFloat(debt.apr) : null;
      const parsedDue = debt.dueDay ? Number.parseInt(debt.dueDay, 10) : null;

      return {
        name: debt.name.trim(),
        type: "loan",
        startingBalance: balance,
        apr: parsedApr ?? undefined,
        statementDueDay: parsedDue ?? undefined,
      };
    });

    const existingCategoryMap = new Map(
      existingCategories.map((category) => [
        buildCategoryKey(category.name, category.kind),
        category,
      ])
    );

    const defaultCategoryPayloads = useDefaultCategories ? defaultCategories : [];
    const customCategoryPayloads = customCategories
      .filter((category) => category.name.trim())
      .map((category) => ({
        name: category.name.trim(),
        kind: category.kind,
      }));

    const categoryPayloads = [...defaultCategoryPayloads, ...customCategoryPayloads].filter(
      (category, index, all) =>
        index ===
        all.findIndex(
          (item) => buildCategoryKey(item.name, item.kind) === buildCategoryKey(category.name, category.kind)
        )
    );

    setSaving(true);
    try {
      const createdCategories = await Promise.all(
        categoryPayloads
          .filter((category) => !existingCategoryMap.has(buildCategoryKey(category.name, category.kind)))
          .map((category) =>
            fetchJson<CategoryRecord>("/api/categories", {
              method: "POST",
              body: JSON.stringify(category),
            })
          )
      );

      const categoryLookup = new Map(existingCategoryMap);
      createdCategories.forEach((category) => {
        categoryLookup.set(buildCategoryKey(category.name, category.kind), category);
      });

      const selectedTemplates = ruleTemplates.filter((template) =>
        selectedRuleTemplates.includes(template.id)
      );

      for (const template of selectedTemplates) {
        const key = buildCategoryKey(template.categoryName, "expense");
        let category = categoryLookup.get(key);
        if (!category) {
          category = await fetchJson<CategoryRecord>("/api/categories", {
            method: "POST",
            body: JSON.stringify({ name: template.categoryName, kind: "expense" }),
          });
          categoryLookup.set(key, category);
        }

        await fetchJson("/api/rules", {
          method: "POST",
          body: JSON.stringify({
            name: `${template.label} auto-category`,
            enabled: true,
            onlyUncategorized: true,
            matchDescription: template.matchDescription,
            actions: [
              {
                actionType: "set_category",
                actionPayload: { categoryId: category.id },
              },
            ],
          }),
        });
      }

      const accountPayloads = payloads.map((payload, index) => ({
        payload,
        draftId: drafts[index]?.id,
      }));

      const createdAccounts = await Promise.all(
        accountPayloads.map(({ payload }) =>
          fetchJson<AccountRecord>("/api/accounts", {
            method: "POST",
            body: JSON.stringify(payload),
          })
        )
      );

      const accountLookup = new Map(
        accountPayloads.map((entry, index) => [entry.draftId, createdAccounts[index]])
      );

      if (debtPayloads.length) {
        await Promise.all(
          debtPayloads.map((payload) =>
            fetchJson("/api/accounts", {
              method: "POST",
              body: JSON.stringify(payload),
            })
          )
        );
      }

      if (recurringDrafts.length) {
        await Promise.all(
          recurringDrafts.map((recurring) => {
            const account = accountLookup.get(recurring.accountRef);
            if (!account) {
              throw new Error("Recurring entries need a linked account.");
            }
            const amount = parseAmountToCents(recurring.amount);
            if (amount === null) {
              throw new Error("Recurring entries need an amount.");
            }
            const category =
              recurring.categoryKey && categoryLookup.has(recurring.categoryKey)
                ? categoryLookup.get(recurring.categoryKey)
                : null;

            return fetchJson("/api/recurring", {
              method: "POST",
              body: JSON.stringify({
                accountId: account.id,
                categoryId: category?.id ?? null,
                description: recurring.description.trim(),
                amount,
                cadence: recurring.cadence,
                nextDate: recurring.nextDate,
              }),
            });
          })
        );
      }

      if (setupStartedAt) {
        try {
          await fetchJson("/api/setup/complete", {
            method: "POST",
            body: JSON.stringify({
              startedAt: setupStartedAt,
              completedAt: Date.now(),
              accountsCount: payloads.length,
              debtsCount: debtPayloads.length,
              categoriesCount: categoryPayloads.length,
              recurringCount: recurringDrafts.length,
            }),
          });
          window.localStorage.removeItem(setupStartKey);
        } catch (error) {
          console.warn("Failed to record setup completion", error);
        }
      }

      toast.success("Accounts created.");
      window.localStorage.removeItem(setupDraftKey);
      router.push("/transactions");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save accounts.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Start here"
        description="Capture your current financial position in a few quick steps."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Step {stepIndex} of 5</Badge>
            <Button onClick={addDraft} variant="outline">
              Add account row
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {steps.map((step) => (
          <Button
            key={step.id}
            type="button"
            size="sm"
            variant={activeStep === step.id ? "default" : "outline"}
            onClick={() => goToStep(step.id)}
          >
            {step.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-6">

      <section id="setup-accounts" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-strong">
              Step 1 · Accounts
            </p>
            <p className="text-sm text-muted-foreground">
              Add your bank accounts, credit cards, and assets.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => toggleSection("setup-accounts")}
          >
            {collapsedSections["setup-accounts"] ? "Expand" : "Collapse"}
          </Button>
        </div>

        {collapsedSections["setup-accounts"] ? null : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Connect accounts (optional)</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  Link your bank, credit, loan, and investment accounts to auto-sync
                  balances and transactions.
                </div>
                <PlaidLinkButton />
              </CardContent>
            </Card>

            <Card ref={quickFormRef}>
              <CardHeader>
                <CardTitle>Add bank + accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Group multiple checking, savings, and credit accounts under one bank.
                </p>
                {institutions.length ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {institutions.map((name) => (
                      <Button
                        key={name}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddUnderBank(name)}
                      >
                        Add another under {name}
                      </Button>
                    ))}
                  </div>
                ) : null}
                <div className="mt-4">
                  <form onSubmit={handleQuickSubmit} className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                      <div className="space-y-1">
                        <Label htmlFor="quick-institution">Bank or institution</Label>
                        <Input
                          id="quick-institution"
                          ref={quickInstitutionRef}
                          value={quickInstitution}
                          onChange={(event) => setQuickInstitution(event.target.value)}
                          placeholder="Citizens Bank"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setQuickAccounts((prev) => [
                              ...prev,
                              newQuickAccountDraft(),
                            ])
                          }
                        >
                          Add another
                        </Button>
                        <Button type="submit">Add accounts</Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {quickAccounts.map((draft, index) => (
                        <div
                          key={draft.id}
                          className="space-y-3 rounded-lg border bg-background p-3"
                        >
                          <div className="grid gap-4 lg:grid-cols-[1fr_200px_140px_auto] lg:items-end">
                            <div className="space-y-1">
                              <Label
                                htmlFor={`quick-name-${draft.id}`}
                                className={index === 0 ? "" : "sr-only"}
                              >
                                Account name
                              </Label>
                              <Input
                                id={`quick-name-${draft.id}`}
                                value={draft.name}
                                onChange={(event) =>
                                  setQuickAccounts((prev) =>
                                    prev.map((entry) =>
                                      entry.id === draft.id
                                        ? { ...entry, name: event.target.value }
                                        : entry
                                    )
                                  )
                                }
                                placeholder="Checking, Savings 1"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className={index === 0 ? "" : "sr-only"}>
                                Type
                              </Label>
                              <Select
                                value={draft.type}
                                onValueChange={(value) =>
                                  setQuickAccounts((prev) =>
                                    prev.map((entry) =>
                                      entry.id === draft.id
                                        ? { ...entry, type: value }
                                        : entry
                                    )
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accountTypes.map((accountType) => (
                                    <SelectItem key={accountType} value={accountType}>
                                      {accountType}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label
                                htmlFor={`quick-last4-${draft.id}`}
                                className={index === 0 ? "" : "sr-only"}
                              >
                                Last 4
                              </Label>
                              <Input
                                id={`quick-last4-${draft.id}`}
                                value={draft.last4}
                                onChange={(event) =>
                                  setQuickAccounts((prev) =>
                                    prev.map((entry) =>
                                      entry.id === draft.id
                                        ? { ...entry, last4: event.target.value }
                                        : entry
                                    )
                                  )
                                }
                                placeholder="1234"
                                maxLength={4}
                              />
                            </div>
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setQuickAccounts((prev) =>
                                    prev.length === 1
                                      ? prev
                                      : prev.filter((entry) => entry.id !== draft.id)
                                  )
                                }
                                disabled={quickAccounts.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </Button>
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-1">
                              <Label htmlFor={`quick-balance-${draft.id}`}>
                                {draft.type === "credit"
                                  ? "Current balance"
                                  : "Balance"}
                              </Label>
                              <Input
                                id={`quick-balance-${draft.id}`}
                                inputMode="decimal"
                                value={draft.startingBalance}
                                onChange={(event) =>
                                  setQuickAccounts((prev) =>
                                    prev.map((entry) =>
                                      entry.id === draft.id
                                        ? {
                                            ...entry,
                                            startingBalance: event.target.value,
                                          }
                                        : entry
                                    )
                                  )
                                }
                                placeholder="2500.00"
                              />
                              <p className="text-xs text-muted-foreground">
                                Use today’s balance so your totals are accurate.
                              </p>
                            </div>
                            {draft.type === "credit" ? (
                              <>
                                <div className="space-y-1">
                                  <Label htmlFor={`quick-limit-${draft.id}`}>
                                    Credit limit
                                  </Label>
                                  <Input
                                    id={`quick-limit-${draft.id}`}
                                    inputMode="decimal"
                                    value={draft.creditLimit}
                                    onChange={(event) =>
                                      setQuickAccounts((prev) =>
                                        prev.map((entry) =>
                                          entry.id === draft.id
                                            ? {
                                                ...entry,
                                                creditLimit: event.target.value,
                                              }
                                            : entry
                                        )
                                      )
                                    }
                                    placeholder="5000.00"
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Helps calculate utilization.
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <Label htmlFor={`quick-apr-${draft.id}`}>
                                    APR (%)
                                  </Label>
                                  <Input
                                    id={`quick-apr-${draft.id}`}
                                    inputMode="decimal"
                                    value={draft.apr}
                                    onChange={(event) =>
                                      setQuickAccounts((prev) =>
                                        prev.map((entry) =>
                                          entry.id === draft.id
                                            ? { ...entry, apr: event.target.value }
                                            : entry
                                        )
                                      )
                                    }
                                    placeholder="19.99"
                                  />
                                </div>
                              </>
                            ) : null}
                          </div>

                          {draft.type === "credit" ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Label htmlFor={`quick-close-${draft.id}`}>
                                  Statement close day
                                </Label>
                                <Input
                                  id={`quick-close-${draft.id}`}
                                  inputMode="numeric"
                                  value={draft.statementCloseDay}
                                  onChange={(event) =>
                                    setQuickAccounts((prev) =>
                                      prev.map((entry) =>
                                        entry.id === draft.id
                                          ? {
                                              ...entry,
                                              statementCloseDay: event.target.value,
                                            }
                                          : entry
                                      )
                                    )
                                  }
                                  placeholder="25"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`quick-due-${draft.id}`}>
                                  Statement due day
                                </Label>
                                <Input
                                  id={`quick-due-${draft.id}`}
                                  inputMode="numeric"
                                  value={draft.statementDueDay}
                                  onChange={(event) =>
                                    setQuickAccounts((prev) =>
                                      prev.map((entry) =>
                                        entry.id === draft.id
                                          ? {
                                              ...entry,
                                              statementDueDay: event.target.value,
                                            }
                                          : entry
                                      )
                                    )
                                  }
                                  placeholder="15"
                                />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accounts & balances</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Add any additional accounts, assets, or manual balances.
                </p>
                {drafts.map((draft, index) => {
                  const errors = draftErrors[draft.id] ?? {};
                  const showNameError = shouldShowDraftError(draft.id, "name");
                  const showStartError = shouldShowDraftError(draft.id, "startingBalance");
                  const showLimitError = shouldShowDraftError(draft.id, "creditLimit");
                  const showLast4Error = shouldShowDraftError(draft.id, "last4");
                  const showAprError = shouldShowDraftError(draft.id, "apr");
                  const showCloseError = shouldShowDraftError(
                    draft.id,
                    "statementCloseDay"
                  );
                  const showDueError = shouldShowDraftError(
                    draft.id,
                    "statementDueDay"
                  );

                  return (
                    <div key={draft.id} className="rounded-lg border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold">Account {index + 1}</p>
                      {drafts.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDraft(draft.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div className="space-y-1">
                        <Label>Account name</Label>
                        <Input
                          value={draft.name}
                          onChange={(event) => {
                            markDraftTouched(draft.id, "name");
                            updateDraft(draft.id, { name: event.target.value });
                          }}
                          placeholder="Checking, Savings, Amex"
                          className={`min-w-0 ${
                            errors.name && showNameError ? "border-rose-500" : ""
                          }`}
                        />
                        {errors.name && showNameError ? (
                          <p className="text-xs text-rose-600">{errors.name}</p>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        <Label>Type</Label>
                        <Select
                          value={draft.type}
                          onValueChange={(value) => {
                            markDraftTouched(draft.id, "startingBalance");
                            updateDraft(draft.id, { type: value });
                          }}
                        >
                          <SelectTrigger className="min-w-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {accountTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                {draft.type === "credit" ? (
                  <>
                    <div className="space-y-1">
                      <Label>Current balance</Label>
                      <Input
                        inputMode="decimal"
                        value={draft.startingBalance}
                        onChange={(event) => {
                          markDraftTouched(draft.id, "startingBalance");
                          updateDraft(draft.id, {
                            startingBalance: event.target.value,
                          });
                        }}
                        placeholder="1200.00"
                        className={`min-w-0 ${
                          errors.startingBalance && showStartError
                            ? "border-rose-500"
                            : ""
                        }`}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addDraft();
                        }
                      }}
                    />
                      <p className="text-xs text-muted-foreground">
                        Use today’s balance for accurate utilization.
                      </p>
                      {errors.startingBalance && showStartError ? (
                        <p className="text-xs text-rose-600">
                          {errors.startingBalance}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <Label>Credit limit</Label>
                      <Input
                        inputMode="decimal"
                        value={draft.creditLimit}
                        onChange={(event) => {
                          markDraftTouched(draft.id, "creditLimit");
                          updateDraft(draft.id, { creditLimit: event.target.value });
                        }}
                        placeholder="5000.00"
                        className={`min-w-0 ${
                          errors.creditLimit && showLimitError ? "border-rose-500" : ""
                        }`}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addDraft();
                          }
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Required to calculate credit usage.
                      </p>
                      {errors.creditLimit && showLimitError ? (
                        <p className="text-xs text-rose-600">
                          {errors.creditLimit}
                        </p>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <Label>Starting balance</Label>
                    <Input
                      inputMode="decimal"
                      value={draft.startingBalance}
                      onChange={(event) => {
                        markDraftTouched(draft.id, "startingBalance");
                        updateDraft(draft.id, { startingBalance: event.target.value });
                      }}
                      placeholder="1200.00"
                      className={`min-w-0 ${
                        errors.startingBalance && showStartError ? "border-rose-500" : ""
                      }`}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addDraft();
                        }
                        }}
                      />
                    <p className="text-xs text-muted-foreground">
                      Enter the amount you have today.
                    </p>
                    {errors.startingBalance && showStartError ? (
                      <p className="text-xs text-rose-600">{errors.startingBalance}</p>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateDraft(draft.id, { showAdvanced: !draft.showAdvanced })
                  }
                >
                  {draft.showAdvanced ? "Hide advanced" : "Show advanced"}
                </Button>
              </div>

              {draft.showAdvanced ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <p className="md:col-span-2 xl:col-span-3 text-xs text-muted-foreground">
                    Optional details help with utilization, statements, and rewards tracking.
                  </p>
                  <div className="space-y-1">
                    <Label>Institution</Label>
                    <Input
                      value={draft.institution}
                      onChange={(event) =>
                        updateDraft(draft.id, { institution: event.target.value })
                      }
                      placeholder="Chase, Ally"
                      className="min-w-0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Last 4</Label>
                    <Input
                      value={draft.last4}
                      onChange={(event) => {
                        markDraftTouched(draft.id, "last4");
                        updateDraft(draft.id, { last4: event.target.value });
                      }}
                      placeholder="1234"
                      maxLength={4}
                      className={`min-w-0 ${
                        errors.last4 && showLast4Error ? "border-rose-500" : ""
                      }`}
                    />
                    {errors.last4 && showLast4Error ? (
                      <p className="text-xs text-rose-600">{errors.last4}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <Label>APR (%)</Label>
                    <Input
                      inputMode="decimal"
                      value={draft.apr}
                      onChange={(event) => {
                        markDraftTouched(draft.id, "apr");
                        updateDraft(draft.id, { apr: event.target.value });
                      }}
                      placeholder="19.99"
                      className={`min-w-0 ${
                        errors.apr && showAprError ? "border-rose-500" : ""
                      }`}
                    />
                    {errors.apr && showAprError ? (
                      <p className="text-xs text-rose-600">{errors.apr}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <Label>Statement close day</Label>
                    <Input
                      inputMode="numeric"
                      value={draft.statementCloseDay}
                      onChange={(event) => {
                        markDraftTouched(draft.id, "statementCloseDay");
                        updateDraft(draft.id, { statementCloseDay: event.target.value });
                      }}
                      placeholder="25"
                      className={
                        `min-w-0 ${
                          errors.statementCloseDay && showCloseError
                            ? "border-rose-500"
                            : ""
                        }`
                      }
                    />
                    {errors.statementCloseDay && showCloseError ? (
                      <p className="text-xs text-rose-600">{errors.statementCloseDay}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <Label>Statement due day</Label>
                    <Input
                      inputMode="numeric"
                      value={draft.statementDueDay}
                      onChange={(event) => {
                        markDraftTouched(draft.id, "statementDueDay");
                        updateDraft(draft.id, { statementDueDay: event.target.value });
                      }}
                      placeholder="15"
                      className={
                        `min-w-0 ${
                          errors.statementDueDay && showDueError ? "border-rose-500" : ""
                        }`
                      }
                    />
                    {errors.statementDueDay && showDueError ? (
                      <p className="text-xs text-rose-600">{errors.statementDueDay}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <Label>Rewards currency</Label>
                    <Input
                      value={draft.rewardCurrency}
                      onChange={(event) =>
                        updateDraft(draft.id, { rewardCurrency: event.target.value })
                      }
                      placeholder="Points, Miles"
                      className="min-w-0"
                    />
                  </div>
                </div>
              ) : null}
            </div>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}
      </section>

      <section id="setup-debts" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-strong">
              Step 2 · Debts
            </p>
            <p className="text-sm text-muted-foreground">
              Add loans and obligations that are not credit cards.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => toggleSection("setup-debts")}
          >
            {collapsedSections["setup-debts"] ? "Expand" : "Collapse"}
          </Button>
        </div>

        {collapsedSections["setup-debts"] ? null : (
          <Card>
            <CardHeader>
              <CardTitle>Debts & obligations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add loans and obligations that are not credit cards. This helps keep payoff
                and projection views accurate.
              </p>

              {linkedLoanDrafts.length ? (
                <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-3 text-sm">
                  <p className="font-semibold text-foreground">Loan accounts already added</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {linkedLoanDrafts.map((loan) => {
                      const balance =
                        parseAmountToCents(loan.startingBalance) ?? null;
                      return (
                        <div key={loan.id} className="rounded-md border bg-background p-2">
                          <p className="text-sm font-medium">{loan.name || "Loan account"}</p>
                          <p className="text-xs text-muted-foreground">
                            Balance{" "}
                            {balance !== null ? formatCurrency(balance) : "not provided"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    You can update loan balances in the Accounts section above.
                  </p>
                </div>
              ) : null}

              {debtDrafts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-4 text-sm text-muted-foreground">
                  No debts added yet. Add loans, auto notes, or other obligations.
                </div>
              ) : null}

              {debtDrafts.map((debt, index) => {
                const errors = debtErrors[debt.id] ?? {};
                const showNameError = shouldShowDebtError(debt.id, "name");
                const showBalanceError = shouldShowDebtError(
                  debt.id,
                  "currentBalance"
                );
                const showAprError = shouldShowDebtError(debt.id, "apr");
                const showDueError = shouldShowDebtError(debt.id, "dueDay");

                return (
                  <div key={debt.id} className="rounded-lg border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold">Debt {index + 1}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDebtDraft(debt.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div className="space-y-1">
                        <Label>Lender name</Label>
                        <Input
                          value={debt.name}
                          onChange={(event) => {
                            markDebtTouched(debt.id, "name");
                            updateDebtDraft(debt.id, { name: event.target.value });
                          }}
                          placeholder="Student loan, Auto loan"
                          className={`min-w-0 ${
                            errors.name && showNameError ? "border-rose-500" : ""
                          }`}
                        />
                        {errors.name && showNameError ? (
                          <p className="text-xs text-rose-600">{errors.name}</p>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        <Label>Current balance</Label>
                        <Input
                          inputMode="decimal"
                          value={debt.currentBalance}
                          onChange={(event) => {
                            markDebtTouched(debt.id, "currentBalance");
                            updateDebtDraft(debt.id, {
                              currentBalance: event.target.value,
                            });
                          }}
                          placeholder="12000.00"
                          className={`min-w-0 ${
                            errors.currentBalance && showBalanceError
                              ? "border-rose-500"
                              : ""
                          }`}
                        />
                        {errors.currentBalance && showBalanceError ? (
                          <p className="text-xs text-rose-600">{errors.currentBalance}</p>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        <Label>APR (%)</Label>
                        <Input
                          inputMode="decimal"
                          value={debt.apr}
                          onChange={(event) => {
                            markDebtTouched(debt.id, "apr");
                            updateDebtDraft(debt.id, { apr: event.target.value });
                          }}
                          placeholder="5.99"
                          className={`min-w-0 ${
                            errors.apr && showAprError ? "border-rose-500" : ""
                          }`}
                        />
                        {errors.apr && showAprError ? (
                          <p className="text-xs text-rose-600">{errors.apr}</p>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        <Label>Due day</Label>
                        <Input
                          inputMode="numeric"
                          value={debt.dueDay}
                          onChange={(event) => {
                            markDebtTouched(debt.id, "dueDay");
                            updateDebtDraft(debt.id, { dueDay: event.target.value });
                          }}
                          placeholder="1"
                          className={`min-w-0 ${
                            errors.dueDay && showDueError ? "border-rose-500" : ""
                          }`}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addDebtDraft();
                            }
                          }}
                        />
                        {errors.dueDay && showDueError ? (
                          <p className="text-xs text-rose-600">{errors.dueDay}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}

              <Button type="button" variant="outline" onClick={addDebtDraft}>
                Add another debt
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <section id="setup-income" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-strong">
              Step 3 · Income
            </p>
            <p className="text-sm text-muted-foreground">
              Add recurring income and bills for a clear monthly picture.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => toggleSection("setup-income")}
          >
            {collapsedSections["setup-income"] ? "Expand" : "Collapse"}
          </Button>
        </div>

        {collapsedSections["setup-income"] ? null : (
          <Card>
            <CardHeader>
              <CardTitle>Recurring & paydays</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add your predictable income and bills so projections stay accurate.
              </p>
              <div className="flex flex-wrap gap-2">
                {recurringTemplates.map((template) => (
                  <Button
                    key={template.id}
                    type="button"
                    variant="outline"
                    onClick={() => addRecurringDraft(template)}
                  >
                    Add {template.label}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addRecurringDraft()}
                >
                  Add recurring
                </Button>
              </div>

              {recurringDrafts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No recurring entries yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {recurringDrafts.map((recurring, index) => {
                    const errors = recurringErrors[recurring.id] ?? {};
                    const showDescriptionError = shouldShowRecurringError(
                      recurring.id,
                      "description"
                    );
                    const showAmountError = shouldShowRecurringError(
                      recurring.id,
                      "amount"
                    );
                    const showCadenceError = shouldShowRecurringError(
                      recurring.id,
                      "cadence"
                    );
                    const showNextDateError = shouldShowRecurringError(
                      recurring.id,
                      "nextDate"
                    );
                    const showAccountError = shouldShowRecurringError(
                      recurring.id,
                      "accountRef"
                    );

                    return (
                      <div
                        key={recurring.id}
                        className="rounded-lg border bg-muted/20 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-semibold">
                            Recurring {index + 1}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRecurringDraft(recurring.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                        <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          <div className="space-y-1">
                            <Label>Description</Label>
                            <Input
                              value={recurring.description}
                              onChange={(event) => {
                                markRecurringTouched(recurring.id, "description");
                                updateRecurringDraft(recurring.id, {
                                  description: event.target.value,
                                });
                              }}
                              placeholder="Rent, Payroll, Subscription"
                              className={`min-w-0 ${
                                errors.description && showDescriptionError
                                  ? "border-rose-500"
                                  : ""
                              }`}
                            />
                            {errors.description && showDescriptionError ? (
                              <p className="text-xs text-rose-600">
                                {errors.description}
                              </p>
                            ) : null}
                          </div>
                          <div className="space-y-1">
                            <Label>Amount</Label>
                            <Input
                              inputMode="decimal"
                              value={recurring.amount}
                              onChange={(event) => {
                                markRecurringTouched(recurring.id, "amount");
                                updateRecurringDraft(recurring.id, {
                                  amount: event.target.value,
                                });
                              }}
                              placeholder="-1200.00"
                              className={`min-w-0 ${
                                errors.amount && showAmountError
                                  ? "border-rose-500"
                                  : ""
                              }`}
                            />
                            {errors.amount && showAmountError ? (
                              <p className="text-xs text-rose-600">{errors.amount}</p>
                            ) : null}
                          </div>
                          <div className="space-y-1">
                            <Label>Cadence</Label>
                            <Select
                              value={recurring.cadence}
                              onValueChange={(value) => {
                                markRecurringTouched(recurring.id, "cadence");
                                updateRecurringDraft(recurring.id, {
                                  cadence: value as RecurringDraft["cadence"],
                                });
                              }}
                            >
                              <SelectTrigger className="min-w-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="weekly">weekly</SelectItem>
                                <SelectItem value="monthly">monthly</SelectItem>
                              </SelectContent>
                            </Select>
                            {errors.cadence && showCadenceError ? (
                              <p className="text-xs text-rose-600">{errors.cadence}</p>
                            ) : null}
                          </div>
                          <div className="space-y-1">
                            <Label>Account</Label>
                            <Select
                              value={recurring.accountRef}
                              onValueChange={(value) => {
                                markRecurringTouched(recurring.id, "accountRef");
                                updateRecurringDraft(recurring.id, { accountRef: value });
                              }}
                            >
                              <SelectTrigger className="min-w-0">
                                <SelectValue placeholder="Select account" />
                              </SelectTrigger>
                              <SelectContent>
                                {accountOptions.map((account) => (
                                  <SelectItem key={account.id} value={account.id}>
                                    {account.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {errors.accountRef && showAccountError ? (
                              <p className="text-xs text-rose-600">{errors.accountRef}</p>
                            ) : null}
                          </div>
                          <div className="space-y-1">
                            <Label>Category</Label>
                            <Select
                              value={recurring.categoryKey || "none"}
                              onValueChange={(value) =>
                                updateRecurringDraft(recurring.id, {
                                  categoryKey: value === "none" ? "" : value,
                                })
                              }
                            >
                              <SelectTrigger className="min-w-0">
                                <SelectValue placeholder="Optional" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {categoryOptions.map((category) => (
                                  <SelectItem
                                    key={`${category.kind}-${category.name}`}
                                    value={buildCategoryKey(category.name, category.kind)}
                                  >
                                    {category.name} · {category.kind}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label>Next date</Label>
                            <Input
                              type="date"
                              value={recurring.nextDate}
                              onChange={(event) => {
                                markRecurringTouched(recurring.id, "nextDate");
                                updateRecurringDraft(recurring.id, {
                                  nextDate: event.target.value,
                                });
                              }}
                              className={`min-w-0 ${
                                errors.nextDate && showNextDateError
                                  ? "border-rose-500"
                                  : ""
                              }`}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  addRecurringDraft();
                                }
                              }}
                            />
                            {errors.nextDate && showNextDateError ? (
                              <p className="text-xs text-rose-600">{errors.nextDate}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </section>

      <section id="setup-categories" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-strong">
              Step 4 · Categories
            </p>
            <p className="text-sm text-muted-foreground">
              Set up default and custom categories plus quick rules.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => toggleSection("setup-categories")}
          >
            {collapsedSections["setup-categories"] ? "Expand" : "Collapse"}
          </Button>
        </div>

        {collapsedSections["setup-categories"] ? null : (
          <Card>
            <CardHeader>
              <CardTitle>Categories & rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Default categories</p>
                    <p className="text-xs text-muted-foreground">
                      Start with a ready-made set of common income and expense categories.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="h-4 w-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      checked={useDefaultCategories}
                      onChange={(event) => setUseDefaultCategories(event.target.checked)}
                    />
                    Use defaults
                  </label>
                </div>
                {useDefaultCategories ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {defaultCategories.map((category) => (
                      <span
                        key={`${category.kind}-${category.name}`}
                        className="rounded-full border bg-background px-2 py-1"
                      >
                        {category.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Custom categories</p>
                    <p className="text-xs text-muted-foreground">
                      Add any categories you need beyond the defaults.
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={addCategoryDraft}>
                    Add category
                  </Button>
                </div>

                {customCategories.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No custom categories yet.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {customCategories.map((category) => {
                      const errors = categoryErrors[category.id] ?? {};
                      const showNameError = shouldShowCategoryError(category.id, "name");

                      return (
                        <div
                          key={category.id}
                          className="flex flex-wrap items-end gap-3 rounded-lg border bg-background p-3"
                        >
                          <div className="flex-1 space-y-1">
                            <Label>Category name</Label>
                            <Input
                              value={category.name}
                              onChange={(event) => {
                                markCategoryTouched(category.id, "name");
                                updateCategoryDraft(category.id, {
                                  name: event.target.value,
                                });
                              }}
                              placeholder="Childcare, Side income"
                              className={`min-w-0 ${
                                errors.name && showNameError ? "border-rose-500" : ""
                              }`}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  addCategoryDraft();
                                }
                              }}
                            />
                            {errors.name && showNameError ? (
                              <p className="text-xs text-rose-600">{errors.name}</p>
                            ) : null}
                          </div>
                          <div className="w-[160px] space-y-1">
                            <Label>Kind</Label>
                            <Select
                              value={category.kind}
                              onValueChange={(value) =>
                                updateCategoryDraft(category.id, {
                                  kind: value as CategoryDraft["kind"],
                                })
                              }
                            >
                              <SelectTrigger className="min-w-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categoryKinds.map((kind) => (
                                  <SelectItem key={kind} value={kind}>
                                    {kind}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeCategoryDraft(category.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-sm font-semibold">Rule templates (optional)</p>
                <p className="text-xs text-muted-foreground">
                  Pick a couple of starter automation rules to keep categories clean.
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {ruleTemplates.map((template) => (
                    <label
                      key={template.id}
                      className="flex items-start gap-2 rounded-lg border bg-background p-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        checked={selectedRuleTemplates.includes(template.id)}
                        onChange={() => toggleRuleTemplate(template.id)}
                      />
                      <span>
                        <span className="font-medium">{template.label}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Matches "{template.matchDescription}" and sets{" "}
                          {template.categoryName}.
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <Toolbar className="px-4 py-3">
        <div className="text-sm text-muted-foreground">
          You can edit or add more details later in Accounts.
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/accounts")}>
            Review accounts
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/")}>
            Skip for now
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving || hasErrors}>
            {saving ? "Saving..." : "Finish setup"}
          </Button>
        </div>
      </Toolbar>
        </div>

        <section
          id="setup-review"
          className="space-y-4 lg:sticky lg:top-24"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-strong">
                Step 5 · Review
              </p>
              <p className="text-sm text-muted-foreground">
                Confirm your totals before finishing.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => toggleSection("setup-review")}
            >
              {collapsedSections["setup-review"] ? "Expand" : "Collapse"}
            </Button>
          </div>
          {collapsedSections["setup-review"] ? null : (
            <Card>
              <CardHeader>
                <CardTitle>Quick review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-strong">
                    Cash on hand
                  </p>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(summary.cashTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-strong">
                    Credit limits
                  </p>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(summary.creditLimit)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-strong">
                    Utilization
                  </p>
                  <p className="text-2xl font-semibold">
                    {summary.creditLimit > 0
                      ? `${(summary.utilization * 100).toFixed(1)}%`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-strong">
                    Total debt
                  </p>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(summary.debtTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-strong">
                    Recurring net (monthly)
                  </p>
                  <p className="text-2xl font-semibold">
                    {summary.recurringNet ? formatCurrency(summary.recurringNet) : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
