// All monetary values stored as paise (integer) to avoid floating-point drift
// ₹43,000 → 4300000 paise. Display only divides by 100.

export type MonthId = string; // "2026-04" (YYYY-MM)

// ─── Income ────────────────────────────────────────────────────────────────

export interface FreelanceLineItem {
  id: string;
  source: string;
  amount: number; // paise
  note?: string;
}

export interface IncomeSection {
  salaryDate: string; // ISO date "2026-04-03"
  salary: number; // paise
  bonusOldBalance: number;
  interest: number;
  dividend: number;
  businessIncome: number;
  passiveIncome: number;
  salaryAccountBalance: number;
  freelanceItems: FreelanceLineItem[];
  freelanceTotal: number; // computed sum
  freelanceParkedAmount: number;
  freelanceParkedAccount: string;
}

// ─── Expenses ──────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | "family"
  | "housing"
  | "insurance"
  | "loan"
  | "personal"
  | "creditcard"
  | "education"
  | "other";

export interface ExpenseItem {
  id: string;
  label: string;
  defaultAmount: number; // paise
  actualAmount: number; // paise
  isOverridden: boolean;
  isPaid?: boolean;
  paidDate?: string; // ISO date "2026-04-15" — when the expense was paid
  frequency: "monthly" | "annual" | "variable";
  category: ExpenseCategory;
  note?: string;
}

export interface FreelanceExpenseItem {
  id: string;
  label: string;
  amount: number; // paise
  note?: string;
}

export interface LoanRepaymentItem {
  id: string;
  loanId: string; // references LoanRecord.id in AppSettings
  lenderName: string; // denormalized for display
  amount: number; // paise
  date: string; // ISO date "2026-04-30"
  note?: string;
}

export interface ExpensesSection {
  items: ExpenseItem[];
  freelanceExpenses: FreelanceExpenseItem[];
  loanRepayments: LoanRepaymentItem[];
  totalExpenses: number; // paise
  totalFreelanceExpenses: number; // paise
  totalLoanRepayments: number; // paise — tracked separately, not in totalExpenses
}

// ─── Savings / Investments ─────────────────────────────────────────────────

export type SavingsCategory =
  | "mutual_fund"
  | "insurance"
  | "stocks"
  | "reits"
  | "ppf"
  | "crypto"
  | "p2p"
  | "bonds"
  | "other";

export interface SavingsItem {
  id: string;
  label: string;
  defaultAmount: number; // paise
  actualAmount: number; // paise
  isOverridden: boolean;
  isPaid?: boolean;
  category: SavingsCategory;
  platform?: string;
  purpose?: string;
  note?: string;
}

export interface FreelanceSavingsItem {
  id: string;
  label: string;
  amount: number; // paise
}

export interface SavingsSection {
  fromSalary: SavingsItem[];
  fromFreelance: FreelanceSavingsItem[];
  totalFromSalary: number; // paise
  totalFromFreelance: number; // paise
  totalSavings: number; // paise
}

// ─── Summary (computed, denormalized) ─────────────────────────────────────

export interface MonthlySummary {
  totalIncome: number; // paise
  totalExpenses: number; // paise
  totalSavings: number; // paise
  netBalance: number; // income - expenses - savings
  savingsRate: number; // percentage 0-100
  freelanceTotal: number; // paise
  salaryBalance: number; // paise
  balanceAfterExpenses: number; // paise
  balanceRemainingFromSalary: number; // paise
  balanceRemainingFromFreelance: number; // paise
}

// ─── Sync Status ───────────────────────────────────────────────────────────

export interface SyncStatus {
  sheetsSynced: boolean;
  sheetsLastSync?: string;
  driveSynced: boolean;
  driveLastSync?: string;
  driveFileId?: string;
}

// ─── Monthly Entry (top-level document stored in IndexedDB) ───────────────

export interface MonthlyEntry {
  id: MonthId; // "2026-04"
  createdAt: string; // ISO timestamp
  updatedAt: string;
  version: number;
  income: IncomeSection;
  expenses: ExpensesSection;
  savings: SavingsSection;
  summary: MonthlySummary;
  syncStatus: SyncStatus;
}

// ─── Loans ─────────────────────────────────────────────────────────────────

export interface LoanRecord {
  id: string;
  lenderName: string; // "SBI", "Friend Ravi", etc.
  amountBorrowed: number; // paise
  dateBorrowed: string; // ISO date "2026-04-01"
  notes?: string;
}

// ─── Credit Card EMIs ──────────────────────────────────────────────────────

export type CCBank = "axis" | "icici";

export interface CreditCardEMI {
  id: string;
  bank: CCBank;
  label: string; // e.g. "iPhone 15 Pro", "Laptop EMI"
  totalAmount: number; // paise — original financed amount
  monthlyInstalment: number; // paise
  tenure: number; // total months
  startMonthId: MonthId; // "2026-01"
  notes?: string;
  closedEarly?: boolean; // manually marked as paid off
}

// ─── Subscriptions ────────────────────────────────────────────────────────

export type SubscriptionBillingCycle = "monthly" | "annual";

export interface Subscription {
  id: string;
  name: string; // e.g. "OpenAI", "Netflix"
  amount: number; // paise — per billing cycle
  billingCycle: SubscriptionBillingCycle;
  startDate?: string; // ISO date
  notes?: string;
  isActive: boolean;
}

// ─── User Profile ─────────────────────────────────────────────────────────

export interface BankConfig {
  id: string;
  name: string;          // display name e.g. "ICICI Bank"
  importType: "pdf" | "screenshots";
}

export interface UserProfile {
  name: string;                  // e.g. "Rahul Sharma"
  employerNames: string[];       // salary credits to skip, e.g. ["ACME CORP"]
  skipKeywords: string[];        // large self-transfer keywords to skip
  freelanceEnabled: boolean;
  banks: BankConfig[];
  onboardingComplete: boolean;
}

// ─── App Settings ─────────────────────────────────────────────────────────

export interface DefaultExpenseConfig {
  id: string;
  label: string;
  defaultAmount: number; // paise
  frequency: "monthly" | "annual" | "variable";
  category: ExpenseCategory;
}

export interface DefaultSavingsConfig {
  id: string;
  label: string;
  defaultAmount: number; // paise
  category: SavingsCategory;
  platform?: string;
  purpose?: string;
}

export interface DefaultFreelanceExpenseConfig {
  id: string;
  label: string;
  defaultAmount: number; // paise
}

export interface AppSettings {
  profile: UserProfile;
  anthropicApiKey?: string;      // stored locally, used client-side only
  defaultExpenses: DefaultExpenseConfig[];
  defaultSavings: DefaultSavingsConfig[];
  defaultFreelanceSources: string[];
  defaultFreelanceExpenses: DefaultFreelanceExpenseConfig[];
  creditCardEMIs: CreditCardEMI[];
  loans: LoanRecord[];
  subscriptions: Subscription[];
  googleSheetId?: string;
  googleDriveFolderId?: string;
  theme: "light" | "dark" | "system";
  lastOpenedMonthId?: MonthId;
}

// ─── Wizard Draft ─────────────────────────────────────────────────────────

export interface WizardDraft {
  id: string; // "draft_2026-04"
  monthId: MonthId;
  currentStep: number;
  data: Partial<MonthlyEntry>;
  savedAt: string;
}
