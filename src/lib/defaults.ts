import type {
  DefaultExpenseConfig,
  DefaultSavingsConfig,
  DefaultFreelanceExpenseConfig,
} from "@/types/finance";

// All amounts in paise (integer). ₹1 = 100 paise.
// These are generic starter defaults — users customise them in Settings.

export const DEFAULT_EXPENSES: DefaultExpenseConfig[] = [
  {
    id: "rent_housing",
    label: "Rent / Housing",
    defaultAmount: 0,
    frequency: "monthly",
    category: "housing",
  },
  {
    id: "health_insurance",
    label: "Health Insurance",
    defaultAmount: 0,
    frequency: "variable",
    category: "insurance",
  },
  {
    id: "term_insurance",
    label: "Term Insurance",
    defaultAmount: 0,
    frequency: "variable",
    category: "insurance",
  },
  {
    id: "car_insurance",
    label: "Car Insurance",
    defaultAmount: 0,
    frequency: "annual",
    category: "insurance",
  },
  {
    id: "family_transfer",
    label: "Family Transfer",
    defaultAmount: 0,
    frequency: "monthly",
    category: "family",
  },
  {
    id: "car_loan",
    label: "Car Loan EMI",
    defaultAmount: 0,
    frequency: "monthly",
    category: "loan",
  },
  {
    id: "personal_expense",
    label: "Personal Expense",
    defaultAmount: 0,
    frequency: "monthly",
    category: "personal",
  },
  {
    id: "cc_bill_1",
    label: "Credit Card Bill 1",
    defaultAmount: 0,
    frequency: "variable",
    category: "creditcard",
  },
  {
    id: "cc_bill_2",
    label: "Credit Card Bill 2",
    defaultAmount: 0,
    frequency: "variable",
    category: "creditcard",
  },
  {
    id: "education",
    label: "School / Education Fees",
    defaultAmount: 0,
    frequency: "variable",
    category: "education",
  },
];

export const DEFAULT_SAVINGS: DefaultSavingsConfig[] = [
  {
    id: "mutual_fund_1",
    label: "Mutual Fund SIP",
    defaultAmount: 0,
    category: "mutual_fund",
    purpose: "Wealth",
  },
  {
    id: "ppf",
    label: "PPF",
    defaultAmount: 0,
    category: "ppf",
    purpose: "Retirement",
  },
  {
    id: "stocks",
    label: "Stocks",
    defaultAmount: 0,
    category: "stocks",
    purpose: "Wealth Generation",
  },
  {
    id: "insurance_savings",
    label: "LIC / Insurance Savings",
    defaultAmount: 0,
    category: "insurance",
    purpose: "Emergency",
  },
  {
    id: "p2p",
    label: "P2P Lending",
    defaultAmount: 0,
    category: "p2p",
    purpose: "Passive Income",
  },
  {
    id: "bonds",
    label: "Bonds / Fixed Income",
    defaultAmount: 0,
    category: "bonds",
    purpose: "Passive Income",
  },
];

export const DEFAULT_FREELANCE_SOURCES: string[] = [];

export const DEFAULT_FREELANCE_EXPENSES: DefaultFreelanceExpenseConfig[] = [];

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  family: "Family",
  housing: "Housing",
  insurance: "Insurance",
  loan: "Loan / EMI",
  personal: "Personal",
  creditcard: "Credit Card",
  education: "Education",
  other: "Other",
};

export const SAVINGS_CATEGORY_LABELS: Record<string, string> = {
  mutual_fund: "Mutual Fund",
  insurance: "Insurance",
  stocks: "Stocks",
  reits: "REITs",
  ppf: "PPF",
  crypto: "Crypto",
  p2p: "P2P",
  bonds: "Bonds",
  other: "Other",
};
