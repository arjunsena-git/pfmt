import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

export type ImportCategory = "dividend" | "p2p" | "interest" | "other";

export interface ImportedTransaction {
  id: string;
  date: string;        // "2026-03-02"
  description: string; // clean label
  amount: number;      // rupees (float)
  category: ImportCategory;
  source: string;      // raw transaction text
}

function buildSystemPrompt(
  userName: string,
  employerNames: string[],
  skipKeywords: string[]
): string {
  const nameRef = userName || "the account holder";
  const employerList = employerNames.length > 0
    ? employerNames.map((e) => `  - Salary/income from "${e}"`).join("\n")
    : "  - (No employer configured — skip obvious salary credits)";
  const skipList = skipKeywords.length > 0
    ? skipKeywords.map((k) => `  - Large transfers (≥ ₹10,000) mentioning "${k}"`).join("\n")
    : "";

  return `You are parsing Indian bank statements for ${nameRef} to extract passive income credits.

SKIP these entirely:
${employerList}
${skipList}
- Any debit/withdrawal entries
- Refunds or reversals of prior debits

IMPORTANT — do NOT skip small NEFT/IMPS credits (< ₹10,000) from other banks even if the account holder's name appears — these are often FD maturity payouts or bond interest credited from their account at another bank → category "interest".

CATEGORIZATION RULES:
- "dividend": ACH credits from listed Indian companies (e.g. Oil & Natural Gas, Coal India, IRFC, ONGC, HDFC, Infosys, etc.)
- "p2p": P2P lending interest — look for keywords like TRICKLE FLOOD TECHNOLOGIES, PP INTEREST, INTEREST PAYOUT, KEERTANA FINSERV, UGRO CAPITAL, NAVI FINSERV, IDFB, CCIL, or any platform offering peer-to-peer lending returns
- "interest": Bank savings/FD/bond interest — "Int.Pd", "Interest Capitalized", savings interest, small NEFT credits from other banks
- "other": Any other legitimate income credit not fitting the above categories

OUTPUT: Return ONLY a JSON array, no markdown fences, no explanation:
[{"date":"YYYY-MM-DD","description":"Clean label","amount":123.45,"category":"interest","source":"raw text"}]

If nothing qualifies, return [].`;
}

// ─── Check if a PDF buffer is encrypted ────────────────────────────────────
function isEncryptedPDF(buf: Buffer): boolean {
  // /Encrypt can appear anywhere — scan header AND trailer (XRef is usually at end)
  const len = buf.length;
  const chunkSize = 65536; // 64 KB
  const header  = buf.toString("latin1", 0, Math.min(len, chunkSize));
  const trailer = buf.toString("latin1", Math.max(0, len - chunkSize), len);
  return header.includes("/Encrypt") || trailer.includes("/Encrypt");
}

// ─── Polyfill browser DOM APIs that pdfjs-dist needs in Node.js ────────────
function installDOMPolyfills() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;

  if (!g.DOMMatrix) {
    class DOMMatrix {
      a=1; b=0; c=0; d=1; e=0; f=0;
      m11=1; m12=0; m13=0; m14=0;
      m21=0; m22=1; m23=0; m24=0;
      m31=0; m32=0; m33=1; m34=0;
      m41=0; m42=0; m43=0; m44=1;
      is2D=true; isIdentity=true;
      constructor(_init?: string | number[]) {}
      multiply()            { return new DOMMatrix(); }
      translate()           { return new DOMMatrix(); }
      scale()               { return new DOMMatrix(); }
      rotate()              { return new DOMMatrix(); }
      rotateFromVector()    { return new DOMMatrix(); }
      rotateAxisAngle()     { return new DOMMatrix(); }
      skewX()               { return new DOMMatrix(); }
      skewY()               { return new DOMMatrix(); }
      inverse()             { return new DOMMatrix(); }
      flipX()               { return new DOMMatrix(); }
      flipY()               { return new DOMMatrix(); }
      transformPoint(p?: {x?:number;y?:number;z?:number;w?:number}) { return p ?? {x:0,y:0,z:0,w:1}; }
      toFloat32Array()      { return new Float32Array(16); }
      toFloat64Array()      { return new Float64Array(16); }
      toString()            { return "matrix(1, 0, 0, 1, 0, 0)"; }
      static fromMatrix()        { return new DOMMatrix(); }
      static fromFloat32Array()  { return new DOMMatrix(); }
      static fromFloat64Array()  { return new DOMMatrix(); }
    }
    g.DOMMatrix = DOMMatrix;
  }

  if (!g.DOMPoint) {
    class DOMPoint {
      x=0; y=0; z=0; w=1;
      constructor(x=0,y=0,z=0,w=1){this.x=x;this.y=y;this.z=z;this.w=w;}
      static fromPoint() { return new DOMPoint(); }
      matrixTransform()  { return this; }
      toJSON()           { return {x:this.x,y:this.y,z:this.z,w:this.w}; }
    }
    g.DOMPoint = DOMPoint;
  }

  if (!g.DOMRect) {
    class DOMRect {
      x=0; y=0; width=0; height=0;
      constructor(x=0,y=0,w=0,h=0){this.x=x;this.y=y;this.width=w;this.height=h;}
      get top()    { return this.y; }
      get right()  { return this.x+this.width; }
      get bottom() { return this.y+this.height; }
      get left()   { return this.x; }
      static fromRect() { return new DOMRect(); }
      toJSON()     { return {x:this.x,y:this.y,width:this.width,height:this.height}; }
    }
    g.DOMRect = DOMRect;
  }

  if (!g.Path2D) {
    g.Path2D = class Path2D {
      constructor(_path?: string) {}
      addPath()     {}
      arc()         {}
      arcTo()       {}
      bezierCurveTo() {}
      closePath()   {}
      ellipse()     {}
      lineTo()      {}
      moveTo()      {}
      quadraticCurveTo() {}
      rect()        {}
    };
  }
}

// ─── Extract text from encrypted PDF via pdf-parse ─────────────────────────
async function extractEncryptedPDF(buf: Buffer, password: string): Promise<string> {
  installDOMPolyfills();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await import("pdf-parse");
  const pdfParse: (b: Buffer, o?: Record<string, unknown>) => Promise<{text: string}> =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mod as any).default ?? (mod as any);
  const result = await pdfParse(buf, { password });
  return result.text;
}

// ─── Ask Claude to categorise transactions ─────────────────────────────────
type CategoriseInput =
  | { type: "text"; text: string }
  | { type: "pdf_b64"; data: string }
  | { type: "images"; items: { mediaType: string; data: string }[] };

async function categorise(
  client: Anthropic,
  input: CategoriseInput,
  systemPrompt: string
): Promise<Omit<ImportedTransaction, "id">[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userContent: any[];

  if (input.type === "pdf_b64") {
    userContent = [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: input.data } },
      { type: "text", text: "Parse this bank statement per the instructions." },
    ];
  } else if (input.type === "images") {
    userContent = [
      ...input.items.map((img) => ({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.data },
      })),
      { type: "text", text: "These are screenshots of a bank statement. Parse all visible transactions per the instructions." },
    ];
  } else {
    userContent = [{ type: "text", text: `Bank statement text:\n\n${input.text}` }];
  }

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  const block = msg.content[0];
  if (block.type !== "text") throw new Error("Unexpected AI content type");

  const match = block.text.trim().match(/\[[\s\S]*\]/);
  if (!match) return [];
  return JSON.parse(match[0]);
}

// ─── Route handler ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  // Accept user-supplied API key (stored client-side) or fall back to env
  const userApiKey = (formData.get("apiKey") as string | null)?.trim();
  const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "No Anthropic API key configured. Add your key in Settings → API Key." }, { status: 503 });
  }

  // User profile for dynamic prompt
  const userName      = (formData.get("userName") as string | null) ?? "";
  const employerNames = JSON.parse((formData.get("employerNames") as string | null) ?? "[]") as string[];
  const skipKeywords  = JSON.parse((formData.get("skipKeywords")  as string | null) ?? "[]") as string[];
  const systemPrompt  = buildSystemPrompt(userName, employerNames, skipKeywords);

  const file       = formData.get("file") as File | null;
  const password   = (formData.get("password") as string | null)?.trim() ?? "";
  const imageFiles = formData.getAll("images") as File[];

  if (!file && imageFiles.length === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  let raw: Omit<ImportedTransaction, "id">[] = [];

  try {
    if (imageFiles.length > 0) {
      // Image screenshots path (KVB)
      const SUPPORTED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
      const items = await Promise.all(
        imageFiles.map(async (img) => {
          const buf = Buffer.from(await img.arrayBuffer());
          // iPhones may send image/heic — treat as jpeg for Claude
          const mediaType = SUPPORTED.has(img.type) ? img.type : "image/jpeg";
          return { mediaType, data: buf.toString("base64") };
        })
      );
      raw = await categorise(client, { type: "images", items }, systemPrompt);
    } else {
      // PDF path (ICICI)
      const buffer = Buffer.from(await file!.arrayBuffer());
      if (password) {
        let text: string;
        try {
          text = await extractEncryptedPDF(buffer, password);
        } catch (err) {
          const msg = String((err as Error).message ?? "").toLowerCase();
          if (msg.includes("password") || msg.includes("encrypt") || msg.includes("incorrect")) {
            return NextResponse.json({ error: "Incorrect password. Please check and try again." }, { status: 422 });
          }
          return NextResponse.json({ error: `Could not read PDF: ${(err as Error).message}` }, { status: 400 });
        }
        if (!text?.trim()) {
          return NextResponse.json({ error: "No text extracted — PDF may be image-based." }, { status: 400 });
        }
        raw = await categorise(client, { type: "text", text }, systemPrompt);
      } else {
        if (isEncryptedPDF(buffer)) {
          return NextResponse.json(
            { error: "This PDF is password-protected. Please enter the password." },
            { status: 422 }
          );
        }
        const b64 = buffer.toString("base64");
        raw = await categorise(client, { type: "pdf_b64", data: b64 }, systemPrompt);
      }
    }
  } catch (err) {
    return NextResponse.json({ error: `Error: ${(err as Error).message}` }, { status: 500 });
  }

  const transactions: ImportedTransaction[] = (raw ?? []).map((t, i) => ({
    ...t,
    amount: Number(t.amount) || 0,
    id: `${i}-${t.date}-${t.amount}`,
  }));

  return NextResponse.json({ transactions });
}
