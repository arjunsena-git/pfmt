import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export interface MonthSnapshot {
  monthId: string; // "2026-04"
  monthLabel: string; // "April 2026"
  income: {
    salary: number;
    bonusOldBalance: number;
    freelance: number;
    interest: number;
    dividend: number;
    businessIncome: number;
    passiveIncome: number;
    total: number;
  };
  expenses: {
    total: number;
    freelanceExpenses: number;
    combinedTotal: number;
    byCategory: Record<string, number>;
    items: Array<{ label: string; amount: number; category: string }>;
  };
  savings: {
    fromSalary: number;
    fromFreelance: number;
    total: number;
    items: Array<{ label: string; amount: number; category: string }>;
  };
  summary: {
    savingsRate: number;
    netBalance: number;
    balanceRemainingFromSalary: number;
    balanceRemainingFromFreelance: number;
  };
}

interface InsightsRequest {
  period: string;
  periodLabel: string;
  months: MonthSnapshot[];
}

function buildPrompt(req: InsightsRequest): string {
  const dataJson = JSON.stringify(req.months, null, 2);

  return `You are a personal finance advisor analyzing an Indian professional's monthly financial data. All amounts are in Indian Rupees (₹).

## Period: ${req.periodLabel}
## Months of data: ${req.months.length}

## Raw Data
${dataJson}

## Your Task

Generate a comprehensive financial report with clear, actionable insights. Use Indian financial conventions (lakhs, savings rate benchmarks for India). Structure your response in clean markdown with these sections:

### 1. Executive Summary
A 2-3 sentence overview of the financial health during this period.

### 2. Income Analysis
- Total and average monthly income
- Salary vs freelance breakdown
- Notable trends or changes

### 3. Expense Analysis
- Total and average monthly expenses
- Top spending categories (with approximate ₹ amounts)
- Month-over-month expense trends
- Any concerning patterns

### 4. Savings & Investment Analysis
- Average savings rate (target benchmark: 30-40% for Indian professionals)
- Savings rate trend (improving/declining/stable)
- Top investment categories
- Highlight months with exceptional or poor savings

### 5. Financial Health Score
Rate overall financial health as: Excellent / Good / Needs Attention / Critical
Justify the score in 2-3 lines.

### 6. Key Insights
3-5 bullet points of the most important observations.

### 7. Actionable Recommendations
3-5 specific, practical steps to improve financial health based on this data.

---
Keep the report concise but insightful. Use ₹ with Indian number formatting (e.g. ₹1.2L for ₹1,20,000). Be direct and specific, not generic.`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      "ANTHROPIC_API_KEY is not configured. Add it to your Vercel environment variables.",
      { status: 503 }
    );
  }

  let body: InsightsRequest;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!body.months || body.months.length === 0) {
    return new Response("No financial data found for the selected period.", { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  const prompt = buildPrompt(body);

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    try {
      const stream = await client.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          await writer.write(encoder.encode(chunk.delta.text));
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await writer.write(encoder.encode(`\n\n**Error generating report:** ${msg}`));
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
