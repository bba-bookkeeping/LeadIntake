import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listLeads, getLeadPdfUrl } from "@/lib/leads.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "BBA — Lead admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Lead = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  company: string;
  industry: string;
  revenue: string;
  services: string[] | null;
  stage: string;
  why_bookkeeper: string;
  stressors: string | null;
  anything_else: string | null;
  referral: string | null;
  software: string | null;
  clickup_task_id: string | null;
  clickup_error: string | null;
  pdf_path: string | null;
};

function AdminPage() {
  const fetchLeads = useServerFn(listLeads);
  const fetchPdfUrl = useServerFn(getLeadPdfUrl);

  const [password, setPassword] = useState("");
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetchLeads({ data: { password } });
      setLeads(res.leads as Lead[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(path: string) {
    try {
      const { url } = await fetchPdfUrl({ data: { password, path } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign URL");
    }
  }

  if (!leads) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-brand)]"
        >
          <div>
            <h1 className="font-display text-2xl text-foreground">Lead admin</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the admin password to view submissions.
            </p>
          </div>
          <Input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || !password}>
            {loading ? "Loading…" : "Sign in"}
          </Button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header
        className="px-6 py-8 text-white"
        style={{ background: "var(--gradient-brand)" }}
      >
        <div className="mx-auto max-w-5xl">
          <p className="text-xs uppercase tracking-[0.3em] opacity-80">
            BBA Bookkeeping
          </p>
          <h1 className="font-display text-3xl">Lead submissions</h1>
          <p className="mt-1 text-sm opacity-80">{leads.length} total</p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-6 space-y-3">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {leads.length === 0 && (
          <p className="text-muted-foreground">No submissions yet.</p>
        )}
        {leads.map((lead) => {
          const open = openId === lead.id;
          return (
            <div
              key={lead.id}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : lead.id)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/40 transition"
              >
                <div className="min-w-0">
                  <p className="font-display text-base text-foreground truncate">
                    {lead.name}{" "}
                    <span className="text-muted-foreground">· {lead.company}</span>
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {lead.email} · {new Date(lead.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {lead.pdf_path ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(lead.pdf_path!);
                      }}
                    >
                      PDF
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">no PDF</span>
                  )}
                </div>
              </button>
              {open && (
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 border-t border-border bg-background/40 px-5 py-5 text-sm">
                  <Field label="Industry" value={lead.industry} />
                  <Field label="Revenue" value={lead.revenue} />
                  <Field label="Software" value={lead.software} />
                  <Field
                    label="Services"
                    value={(lead.services ?? []).join(", ")}
                  />
                  <Field label="Stage" value={lead.stage} full />
                  <Field
                    label="Why a bookkeeper?"
                    value={lead.why_bookkeeper}
                    full
                  />
                  <Field label="Stressors" value={lead.stressors} full />
                  <Field label="Anything else" value={lead.anything_else} full />
                  <Field label="Referral" value={lead.referral} />
                  <Field
                    label="ClickUp"
                    value={
                      lead.clickup_task_id
                        ? `task ${lead.clickup_task_id}`
                        : lead.clickup_error || "—"
                    }
                  />
                </dl>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  full,
}: {
  label: string;
  value: string | null | undefined;
  full?: boolean;
}) {
  return (
    <div className={full ? "md:col-span-2" : undefined}>
      <dt className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--brand-purple)] font-semibold">
        {label}
      </dt>
      <dd className="mt-1 text-foreground whitespace-pre-wrap">
        {value && value.length ? value : "—"}
      </dd>
    </div>
  );
}