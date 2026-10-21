import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PDFDocument, StandardFonts, rgb, PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CLICKUP_LIST_ID = "71669273";

const leadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  company: z.string().trim().min(1).max(150),
  industry: z.string().trim().min(1).max(100),
  software: z.string().trim().max(100).optional().default(""),
  revenue: z.string().min(1).max(50),
  referral: z.string().trim().max(500).optional().default(""),
  services: z.array(z.string().max(100)).min(1).max(20),
  stage: z.string().min(1).max(500),
  whyBookkeeper: z.string().trim().min(5).max(1000),
  stressors: z.string().trim().max(1000).optional().default(""),
  anythingElse: z.string().trim().max(1000).optional().default(""),
});

type LeadInput = z.infer<typeof leadSchema>;

// Brand palette (matches src/styles.css)
const BRAND = {
  purple: rgb(0x4c / 255, 0x00, 0x8c / 255),
  magenta: rgb(0xb2 / 255, 0x04 / 255, 0x76 / 255),
  lavender: rgb(0xca / 255, 0xc6 / 255, 0xe5 / 255),
  ink: rgb(0x19 / 255, 0x19 / 255, 0x1a / 255),
  mutedInk: rgb(0.42, 0.4, 0.46),
  paper: rgb(0.985, 0.982, 0.99),
  white: rgb(1, 1, 1),
};

// Cache fonts in module scope so the Google Fonts fetch happens once per isolate.
let comfortaaCache:
  | Promise<{ regular: Uint8Array; bold: Uint8Array }>
  | undefined;

async function fetchComfortaa(): Promise<{
  regular: Uint8Array;
  bold: Uint8Array;
}> {
  if (!comfortaaCache) {
    comfortaaCache = (async () => {
      // Request CSS with a legacy UA so Google returns TTF URLs (not woff2)
      const cssRes = await fetch(
        "https://fonts.googleapis.com/css?family=Comfortaa:400,700",
        { headers: { "User-Agent": "Mozilla/4.0" } },
      );
      const css = await cssRes.text();
      const urls = [...css.matchAll(/url\((https:[^)]+\.ttf)\)/g)].map(
        (m) => m[1],
      );
      if (urls.length < 2) throw new Error("Could not resolve Comfortaa TTFs");
      const [reg, bold] = await Promise.all(
        urls.slice(0, 2).map((u) => fetch(u).then((r) => r.arrayBuffer())),
      );
      return {
        regular: new Uint8Array(reg),
        bold: new Uint8Array(bold),
      };
    })().catch((err) => {
      comfortaaCache = undefined;
      throw err;
    });
  }
  return comfortaaCache;
}

// Linear interpolation between two pdf-lib RGB colors
function lerpColor(
  a: ReturnType<typeof rgb>,
  b: ReturnType<typeof rgb>,
  t: number,
) {
  return rgb(
    a.red + (b.red - a.red) * t,
    a.green + (b.green - a.green) * t,
    a.blue + (b.blue - a.blue) * t,
  );
}

function buildTaskDescription(lead: LeadInput): string {
  return [
    `**Name:** ${lead.name}`,
    `**Email:** ${lead.email}`,
    `**Company:** ${lead.company}`,
    `**Industry:** ${lead.industry}`,
    `**Current software:** ${lead.software || "—"}`,
    `**Annual revenue:** ${lead.revenue}`,
    `**Services interested in:** ${lead.services.join(", ")}`,
    `**Stage:** ${lead.stage}`,
    "",
    `**Why a bookkeeper?**`,
    lead.whyBookkeeper,
    "",
    `**Top stressors:**`,
    lead.stressors || "—",
    "",
    `**Anything else:**`,
    lead.anythingElse || "—",
    "",
    `**How they heard about us:**`,
    lead.referral || "—",
  ].join("\n");
}

async function buildLeadPdf(lead: LeadInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  // Try to embed Comfortaa; fall back to Helvetica if Google Fonts unreachable
  let font: PDFFont;
  let bold: PDFFont;
  try {
    const ttf = await fetchComfortaa();
    font = await pdf.embedFont(ttf.regular, { subset: true });
    bold = await pdf.embedFont(ttf.bold, { subset: true });
  } catch (err) {
    console.error("Comfortaa load failed, using Helvetica:", err);
    font = await pdf.embedFont(StandardFonts.Helvetica);
    bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  }

  const margin = 50;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const contentWidth = pageWidth - margin * 2;
  const headerHeight = 130;

  let page = pdf.addPage([pageWidth, pageHeight]);

  // Paper background tint
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: BRAND.paper,
  });

  // Smooth purple -> magenta gradient header using many thin slices
  const slices = 120;
  const sliceWidth = pageWidth / slices;
  for (let i = 0; i < slices; i++) {
    page.drawRectangle({
      x: i * sliceWidth,
      y: pageHeight - headerHeight,
      width: sliceWidth + 0.6,
      height: headerHeight,
      color: lerpColor(BRAND.purple, BRAND.magenta, i / (slices - 1)),
    });
  }

  // Brand mark + title
  page.drawText("BBA BOOKKEEPING", {
    x: margin,
    y: pageHeight - 48,
    size: 10,
    font: bold,
    color: BRAND.lavender,
    
  });
  page.drawText("New Lead Submission", {
    x: margin,
    y: pageHeight - 82,
    size: 26,
    font: bold,
    color: BRAND.white,
  });
  const dateStr = new Date().toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
  page.drawText(dateStr, {
    x: margin,
    y: pageHeight - 108,
    size: 10,
    font,
    color: BRAND.lavender,
  });

  // Thin magenta accent rule under header
  page.drawRectangle({
    x: 0,
    y: pageHeight - headerHeight - 3,
    width: pageWidth,
    height: 3,
    color: BRAND.magenta,
  });

  let y = pageHeight - headerHeight - 40;

  const wrap = (text: string, size: number, f = font): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(test, size) > contentWidth) {
        if (line) lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = pdf.addPage([pageWidth, pageHeight]);
      page.drawRectangle({
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
        color: BRAND.paper,
      });
      // slim brand strip at top of continuation pages
      page.drawRectangle({
        x: 0,
        y: pageHeight - 8,
        width: pageWidth,
        height: 8,
        color: BRAND.purple,
      });
      y = pageHeight - margin;
    }
  };

  const drawField = (label: string, value: string) => {
    const labelSize = 8.5;
    const valueSize = 11;
    const lines = wrap(value || "—", valueSize);
    const blockHeight = 16 + lines.length * 15 + 14;
    ensureSpace(blockHeight);
    // Magenta tick + label
    page.drawRectangle({
      x: margin,
      y: y - 2,
      width: 14,
      height: 1.5,
      color: BRAND.magenta,
    });
    page.drawText(label.toUpperCase(), {
      x: margin + 22,
      y: y - 5,
      size: labelSize,
      font: bold,
      color: BRAND.purple,
      
    });
    y -= 18;
    for (const line of lines) {
      page.drawText(line, {
        x: margin,
        y,
        size: valueSize,
        font,
        color: BRAND.ink,
      });
      y -= 15;
    }
    y -= 12;
  };

  drawField("Name", lead.name);
  drawField("Email", lead.email);
  drawField("Company", lead.company);
  drawField("Industry", lead.industry);
  drawField("Current software", lead.software || "—");
  drawField("Annual revenue", lead.revenue);
  drawField("Services interested in", lead.services.join(", "));
  drawField("Stage", lead.stage);
  drawField("Why a bookkeeper?", lead.whyBookkeeper);
  drawField("Top stressors", lead.stressors || "—");
  drawField("Anything else", lead.anythingElse || "—");
  drawField("How they heard about us", lead.referral || "—");

  // Footer brand strip on the last page
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: 24,
    color: BRAND.purple,
  });
  page.drawText("bbafitcheck.vercel.app", {
    x: margin,
    y: 8,
    size: 9,
    font,
    color: BRAND.lavender,
  });

  return await pdf.save();
}

async function attachPdfToClickUp(
  taskId: string,
  pdfBytes: Uint8Array,
  filename: string,
): Promise<string | undefined> {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) return "CLICKUP_API_TOKEN is not configured";
  try {
    const form = new FormData();
    const ab = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength,
    ) as ArrayBuffer;
    form.append(
      "attachment",
      new Blob([ab], { type: "application/pdf" }),
      filename,
    );
    const res = await fetch(
      `https://api.clickup.com/api/v2/task/${encodeURIComponent(taskId)}/attachment`,
      { method: "POST", headers: { Authorization: token }, body: form },
    );
    if (!res.ok) {
      const text = await res.text();
      return `ClickUp attach ${res.status}: ${text.slice(0, 300)}`;
    }
    return undefined;
  } catch (err) {
    return err instanceof Error ? err.message : "Unknown error attaching PDF";
  }
}

async function createClickUpTask(lead: LeadInput): Promise<{ id?: string; error?: string }> {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) return { error: "CLICKUP_API_TOKEN is not configured" };

  try {
    const res = await fetch(
      `https://api.clickup.com/api/v2/list/${encodeURIComponent(CLICKUP_LIST_ID)}/task`,
      {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `${lead.name} — ${lead.company}`,
          markdown_description: buildTaskDescription(lead),
          tags: ["lead", "website"],
          priority: 3,
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return { error: `ClickUp ${res.status}: ${text.slice(0, 500)}` };
    }
    const data = (await res.json()) as { id?: string };
    return { id: data.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error calling ClickUp" };
  }
}

async function notifySlackNewLead(
  lead: LeadInput,
  taskId: string | undefined,
): Promise<string | undefined> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_NEW_LEADS_CHANNEL;
  if (!token || !channel) return undefined; // soft-disabled when either unset

  const taskUrl = taskId
    ? `https://app.clickup.com/t/${encodeURIComponent(taskId)}`
    : undefined;

  const text = [
    `🆕 *New lead:* ${lead.name} — ${lead.company}`,
    `📧 ${lead.email}`,
    `🏭 ${lead.industry}${lead.software ? ` • ${lead.software}` : ""}`,
    `💰 ${lead.revenue}`,
    `🎯 ${lead.services.join(", ")}`,
    `📈 ${lead.stage}`,
    "",
    `*Why a bookkeeper?* ${lead.whyBookkeeper}`,
    lead.stressors ? `*Top stressors:* ${lead.stressors}` : "",
    lead.referral ? `*Referral:* ${lead.referral}` : "",
    taskUrl ? `<${taskUrl}|Open in ClickUp →>` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel, text, unfurl_links: false }),
    });
    const body = (await res.json()) as { ok?: boolean; error?: string };
    if (!body.ok) {
      return `Slack ${body.error || res.status}`;
    }
    return undefined;
  } catch (err) {
    return err instanceof Error ? err.message : "Unknown Slack error";
  }
}

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => leadSchema.parse(input))
  .handler(async ({ data }) => {
    // Create ClickUp task first (so we can store its id with the lead)
    const clickup = await createClickUpTask(data);

    // Fire Slack notification immediately so Dawn sees new leads
    // regardless of PDF outcome. Non-fatal: Slack errors are logged
    // alongside PDF errors below.
    const slackError = await notifySlackNewLead(data, clickup.id);

    // Generate the PDF of the submission
    let pdfBytes: Uint8Array | null = null;
    let pdfPath: string | null = null;
    const pdfErrors: string[] = [];
    if (slackError) pdfErrors.push(`Slack: ${slackError}`);
    try {
      pdfBytes = await buildLeadPdf(data);
    } catch (err) {
      pdfErrors.push(
        `PDF generation failed: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }

    // Upload PDF to private storage bucket
    if (pdfBytes) {
      const safeName = data.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "lead";
      const path = `${new Date().toISOString().slice(0, 10)}/${Date.now()}-${safeName}.pdf`;
      const pdfBlob = new Blob(
        [pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer],
        { type: "application/pdf" },
      );
      const { error: uploadError } = await supabaseAdmin.storage
        .from("lead-pdfs")
        .upload(path, pdfBlob, { contentType: "application/pdf", upsert: false });
      if (uploadError) {
        pdfErrors.push(`Storage upload failed: ${uploadError.message}`);
      } else {
        pdfPath = path;
      }

      // Attach PDF to the ClickUp task
      if (clickup.id) {
        const attachErr = await attachPdfToClickUp(
          clickup.id,
          pdfBytes,
          `lead-${safeName}.pdf`,
        );
        if (attachErr) pdfErrors.push(attachErr);
      }
    }

    const { error: insertError } = await supabaseAdmin.from("leads").insert({
      name: data.name,
      email: data.email,
      company: data.company,
      industry: data.industry,
      software: data.software || null,
      revenue: data.revenue,
      referral: data.referral || null,
      services: data.services,
      stage: data.stage,
      why_bookkeeper: data.whyBookkeeper,
      stressors: data.stressors || null,
      anything_else: data.anythingElse || null,
      clickup_task_id: clickup.id ?? null,
      clickup_error:
        [clickup.error, ...pdfErrors].filter(Boolean).join(" | ") || null,
      pdf_path: pdfPath,
    });

    if (insertError) {
      console.error("Failed to store lead:", insertError);
      throw new Error("Failed to save submission");
    }

    if (clickup.error) {
      console.error("ClickUp task creation failed:", clickup.error);
    }
    if (pdfErrors.length) {
      console.error("PDF pipeline issues:", pdfErrors);
    }

    return { success: true };
  });

// ---------- Admin: list leads + signed PDF URLs ----------

function checkAdmin(password: string): void {
  const expected = process.env.ADMIN_PASSWORD?.trim();
  if (!expected) throw new Error("ADMIN_PASSWORD is not configured");
  if (password.trim() !== expected) throw new Error("Invalid password");
}

export const listLeads = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ password: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    checkAdmin(data.password);
    const { data: rows, error } = await supabaseAdmin
      .from("leads")
      .select(
        "id, created_at, name, email, company, industry, revenue, services, stage, why_bookkeeper, stressors, anything_else, referral, software, clickup_task_id, clickup_error, pdf_path",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { leads: rows ?? [] };
  });

export const getLeadPdfUrl = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        password: z.string().min(1).max(200),
        path: z.string().min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    checkAdmin(data.password);
    const { data: signed, error } = await supabaseAdmin.storage
      .from("lead-pdfs")
      .createSignedUrl(data.path, 60 * 60);
    if (error || !signed) throw new Error(error?.message ?? "Sign failed");
    return { url: signed.signedUrl };
  });
