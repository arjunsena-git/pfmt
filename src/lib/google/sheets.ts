import type { MonthlyEntry } from "@/types/finance";
import { fromINR, getMonthShortLabel, formatDate } from "@/lib/utils";

interface SheetExportResult {
  spreadsheetId: string;
  sheetUrl: string;
  tabName: string;
}

// Build the rows array for a monthly entry tab
export function buildSheetRows(entry: MonthlyEntry): (string | number)[][] {
  const m = getMonthShortLabel(entry.id);
  const income = entry.income;
  const expenses = entry.expenses;
  const savings = entry.savings;
  const summary = entry.summary;

  const rows: (string | number)[][] = [];

  // Title
  rows.push([`${m} — Finance Statement`, "", "", ""]);
  rows.push(["", "", "", ""]);

  // INCOME section
  rows.push(["INCOME", "", "", ""]);
  rows.push(["Salary (Net)", fromINR(income.salary), "", `Credit date: ${formatDate(income.salaryDate)}`]);
  rows.push(["Salary Account Balance", fromINR(income.salaryAccountBalance), "", ""]);
  if (income.bonusOldBalance > 0) rows.push(["Bonus / Old Balance", fromINR(income.bonusOldBalance), "", ""]);
  if (income.interest > 0) rows.push(["Interest", fromINR(income.interest), "", ""]);
  if (income.dividend > 0) rows.push(["Dividend", fromINR(income.dividend), "", ""]);
  if (income.businessIncome > 0) rows.push(["Business Income", fromINR(income.businessIncome), "", ""]);
  if (income.passiveIncome > 0) rows.push(["Passive Income", fromINR(income.passiveIncome), "", ""]);
  if (income.freelanceTotal > 0) rows.push(["Side Income (Freelance)", fromINR(income.freelanceTotal), "", ""]);
  rows.push(["TOTAL INCOME", fromINR(summary.totalIncome), "", ""]);
  rows.push(["", "", "", ""]);

  // FREELANCE DETAIL (if any)
  if (income.freelanceTotal > 0) {
    rows.push(["FREELANCE DETAIL", "", "", ""]);
    for (const item of income.freelanceItems) {
      rows.push([item.source, fromINR(item.amount), "", item.note ?? ""]);
    }
    rows.push(["Freelance Total", fromINR(income.freelanceTotal), "", ""]);
    if (income.freelanceParkedAmount > 0) {
      rows.push([`Parked in ${income.freelanceParkedAccount}`, fromINR(income.freelanceParkedAmount), "", ""]);
    }
    rows.push(["", "", "", ""]);
  }

  // EXPENSES section
  rows.push(["EXPENSES", "Default", "Actual", "Note"]);
  for (const item of expenses.items) {
    if (item.actualAmount > 0 || item.defaultAmount > 0) {
      rows.push([
        item.label,
        fromINR(item.defaultAmount),
        fromINR(item.actualAmount),
        item.isOverridden ? "overridden" : "",
      ]);
    }
  }
  if (expenses.freelanceExpenses.length > 0) {
    rows.push(["--- Freelance Expenses ---", "", "", ""]);
    for (const fe of expenses.freelanceExpenses) {
      if (fe.amount > 0) rows.push([fe.label, "", fromINR(fe.amount), ""]);
    }
  }
  rows.push(["TOTAL EXPENSES", "", fromINR(summary.totalExpenses), ""]);
  rows.push(["", "", "", ""]);

  // SAVINGS section
  rows.push(["SAVINGS & INVESTMENTS", "Default", "Actual", "Purpose"]);
  for (const item of savings.fromSalary) {
    if (item.actualAmount > 0 || item.defaultAmount > 0) {
      rows.push([
        item.label,
        fromINR(item.defaultAmount),
        fromINR(item.actualAmount),
        item.purpose ?? item.platform ?? "",
      ]);
    }
  }
  if (savings.fromFreelance.length > 0) {
    rows.push(["--- From Freelance ---", "", "", ""]);
    for (const fs of savings.fromFreelance) {
      if (fs.amount > 0) rows.push([fs.label, "", fromINR(fs.amount), ""]);
    }
  }
  rows.push(["TOTAL SAVINGS (Salary)", fromINR(savings.totalFromSalary), "", ""]);
  if (savings.totalFromFreelance > 0) {
    rows.push(["TOTAL SAVINGS (Freelance)", fromINR(savings.totalFromFreelance), "", ""]);
  }
  rows.push(["TOTAL SAVINGS", "", fromINR(summary.totalSavings), ""]);
  rows.push(["", "", "", ""]);

  // SUMMARY section
  rows.push(["SUMMARY", "", "", ""]);
  rows.push(["Total Income", fromINR(summary.totalIncome), "", ""]);
  rows.push(["Total Expenses", fromINR(summary.totalExpenses), "", ""]);
  rows.push(["Balance after Expenses", fromINR(summary.balanceAfterExpenses), "", ""]);
  rows.push(["Total Savings (Salary)", fromINR(savings.totalFromSalary), "", ""]);
  rows.push(["Total Savings (Freelance)", fromINR(savings.totalFromFreelance), "", ""]);
  rows.push(["TOTAL SAVINGS", fromINR(summary.totalSavings), "", ""]);
  rows.push(["Net Balance (remaining)", fromINR(summary.netBalance), "", ""]);
  rows.push(["Savings Rate", `${summary.savingsRate.toFixed(2)}%`, "", ""]);
  rows.push(["Balance from Salary", fromINR(summary.balanceRemainingFromSalary), "", ""]);
  if (income.freelanceTotal > 0) {
    rows.push(["Balance from Freelance", fromINR(summary.balanceRemainingFromFreelance), "", ""]);
  }

  return rows;
}

export async function exportToGoogleSheets(
  entry: MonthlyEntry,
  accessToken: string,
  spreadsheetId?: string,
  userName?: string
): Promise<SheetExportResult> {
  const tabName = getMonthShortLabel(entry.id);
  const sheetTitle = userName ? `${userName} — Finance Tracker` : "Personal Finance Monthly Tracker";
  let sheetId = spreadsheetId;

  // Create spreadsheet if it doesn't exist
  if (!sheetId) {
    const createRes = await fetch(
      "https://sheets.googleapis.com/v4/spreadsheets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: { title: sheetTitle },
          sheets: [{ properties: { title: tabName } }],
        }),
      }
    );
    if (!createRes.ok) throw new Error(`Failed to create spreadsheet: ${await createRes.text()}`);
    const created = await createRes.json();
    sheetId = created.spreadsheetId;
  } else {
    // Check if tab exists, create if not
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const exists = meta.sheets?.some((s: { properties: { title: string } }) => s.properties.title === tabName);
      if (!exists) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              requests: [{ addSheet: { properties: { title: tabName } } }],
            }),
          }
        );
      } else {
        // Clear existing tab
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabName)}:clear`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
      }
    }
  }

  // Write data
  const rows = buildSheetRows(entry);
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabName)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: rows }),
    }
  );
  if (!writeRes.ok) throw new Error(`Failed to write data: ${await writeRes.text()}`);

  return {
    spreadsheetId: sheetId!,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=0`,
    tabName,
  };
}

export async function saveToDrive(
  entry: MonthlyEntry,
  accessToken: string,
  folderId?: string,
  existingFileId?: string
): Promise<{ fileId: string; webViewLink: string }> {
  const fileName = `finance_${entry.id}.json`;
  const content = JSON.stringify(entry, null, 2);
  const blob = new Blob([content], { type: "application/json" });

  const metadata: Record<string, unknown> = { name: fileName, mimeType: "application/json" };
  if (folderId && !existingFileId) {
    metadata.parents = [folderId];
  }

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", blob);

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink";

  const res = await fetch(url, {
    method: existingFileId ? "PATCH" : "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (!res.ok) throw new Error(`Drive save failed: ${await res.text()}`);
  const result = await res.json();
  return { fileId: result.id, webViewLink: result.webViewLink ?? "" };
}
