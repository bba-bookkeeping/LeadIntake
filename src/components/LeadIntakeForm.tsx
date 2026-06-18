import { useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { submitLead } from "@/lib/leads.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Check } from "lucide-react";

const SERVICES = ["Monthly Bookkeeping", "Catch-Up / Clean-Up", "QuickBooks Setup", "Not sure yet"];

const REVENUE_BANDS = ["Under $350k", "$350k – 750k", "$750k – $1M", "$1M – $3M", "$3M+"];

const STAGES = [
  "Just starting out — no books yet",
  "Just need a one-and-done clean-up",
  "I need someone to take over bookkeeping on a monthly basis",
  "I can handle my books day-to-day but would like someone to check them quarterly",
  "I'm looking for a firm to not only handle my bookkeeping, but also help me improve efficiency and grow my business.",
];

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  company: z.string().trim().min(1, "Company name is required").max(150),
  industry: z.string().trim().min(1, "Industry is required").max(100),
  software: z.string().trim().max(100).optional(),
  revenue: z.string().min(1, "Please select an annual revenue range"),
  referral: z.string().trim().max(500).optional(),
  services: z.array(z.string()).min(1, "Pick at least one service"),
  stage: z.string().min(1, "Please choose where you're at"),
  whyBookkeeper: z.string().trim().min(5, "Please share a bit more (5+ characters)").max(1000),
  stressors: z.string().trim().max(1000).optional(),
  anythingElse: z.string().trim().max(1000).optional(),
});

type FormState = {
  name: string;
  email: string;
  company: string;
  industry: string;
  software: string;
  revenue: string;
  referral: string;
  services: string[];
  stage: string;
  whyBookkeeper: string;
  stressors: string;
  anythingElse: string;
};

const initial: FormState = {
  name: "",
  email: "",
  company: "",
  industry: "",
  software: "",
  revenue: "",
  referral: "",
  services: [],
  stage: "",
  whyBookkeeper: "",
  stressors: "",
  anythingElse: "",
};

export function LeadIntakeForm() {
  const [data, setData] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submitLeadFn = useServerFn(submitLead);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const toggleService = (service: string) => {
    set(
      "services",
      data.services.includes(service) ? data.services.filter((s) => s !== service) : [...data.services, service],
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setSubmitting(true);
    try {
      await submitLeadFn({ data: result.data });
      setSubmitted(true);
      toast.success("Thanks! We'll be in touch within one business day.");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong sending your submission. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        className="relative flex flex-col items-center justify-center rounded-3xl border bg-card p-12 text-center shadow-xl"
        style={{ boxShadow: "var(--shadow-brand)" }}
      >
        <div
          className="mb-6 flex h-16 w-16 items-center justify-center rounded-full text-white"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Check className="h-8 w-8" strokeWidth={3} />
        </div>
        <h2 className="font-script text-4xl text-foreground">Thank you!</h2>
        <p className="mt-4 max-w-sm font-display text-muted-foreground">
          Your details are with the BBA team. Expect to hear from us within one business day.
        </p>
        <Button
          variant="ghost"
          className="mt-8"
          onClick={() => {
            setData(initial);
            setSubmitted(false);
          }}
        >
          Submit another response
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative rounded-3xl border bg-card p-8 shadow-xl sm:p-10"
      style={{ boxShadow: "var(--shadow-brand)" }}
      noValidate
    >
      <div className="space-y-6">
        <Field label="Name (First and Last)" required error={errors.name}>
          <Input
            value={data.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Jane Doe"
            maxLength={100}
          />
        </Field>

        <Field label="Email" required error={errors.email}>
          <Input
            type="email"
            value={data.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="jane@company.com"
            maxLength={255}
          />
        </Field>

        <Field label="Legal Company Name" required error={errors.company}>
          <Input value={data.company} onChange={(e) => set("company", e.target.value)} maxLength={150} />
        </Field>

        <Field label="Industry / Specialty" required error={errors.industry}>
          <Input
            value={data.industry}
            onChange={(e) => set("industry", e.target.value)}
            placeholder="e.g. E-commerce, Construction, SaaS"
            maxLength={100}
          />
        </Field>

        <Field label="Current Bookkeeping Software" error={errors.software}>
          <Input
            value={data.software}
            onChange={(e) => set("software", e.target.value)}
            placeholder="QuickBooks, Xero, Wave, none, etc."
            maxLength={100}
          />
        </Field>

        <Field label="Annual Company Revenue" required error={errors.revenue}>
          <Select value={data.revenue} onValueChange={(v) => set("revenue", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a range" />
            </SelectTrigger>
            <SelectContent>
              {REVENUE_BANDS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="How Did You Hear About Us?"
          hint="If you were referred, please tell us who so we can thank them!"
          error={errors.referral}
        >
          <Textarea value={data.referral} onChange={(e) => set("referral", e.target.value)} rows={3} maxLength={500} />
        </Field>

        <Field
          label="What Services Are You Interested In?"
          hint="Check all that apply"
          required
          error={errors.services}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {SERVICES.map((service) => {
              const checked = data.services.includes(service);
              return (
                <label
                  key={service}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-background/60 px-4 py-3 text-sm transition hover:border-[color:var(--brand-purple)] ${
                    checked ? "border-[color:var(--brand-purple)] bg-[color:var(--brand-lavender)]/30" : ""
                  }`}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggleService(service)} />
                  <span className="font-display">{service}</span>
                </label>
              );
            })}
          </div>
        </Field>

        <Field label="Which Option Best Represents Where You're At Currently?" required error={errors.stage}>
          <RadioGroup value={data.stage} onValueChange={(v) => set("stage", v)} className="space-y-2">
            {STAGES.map((s) => (
              <label
                key={s}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-background/60 px-4 py-3 text-sm transition hover:border-[color:var(--brand-purple)] ${
                  data.stage === s ? "border-[color:var(--brand-purple)] bg-[color:var(--brand-lavender)]/30" : ""
                }`}
              >
                <RadioGroupItem value={s} />
                <span className="font-display">{s}</span>
              </label>
            ))}
          </RadioGroup>
        </Field>

        <Field label="Why Are You Looking for a Bookkeeper?" required error={errors.whyBookkeeper}>
          <Textarea
            value={data.whyBookkeeper}
            onChange={(e) => set("whyBookkeeper", e.target.value)}
            rows={4}
            maxLength={1000}
          />
        </Field>

        <Field label="Top 3 Things That Give You the Most Stress / Anxiety?" error={errors.stressors}>
          <Textarea
            value={data.stressors}
            onChange={(e) => set("stressors", e.target.value)}
            rows={3}
            maxLength={1000}
          />
        </Field>

        <Field label="Anything Else You'd Like Us to Know?" error={errors.anythingElse}>
          <Textarea
            value={data.anythingElse}
            onChange={(e) => set("anythingElse", e.target.value)}
            rows={3}
            maxLength={1000}
          />
        </Field>
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="mt-10 h-12 w-full text-base font-semibold text-white transition hover:opacity-95"
        style={{ background: "var(--gradient-brand)" }}
      >
        {submitting ? "Sending…" : "Submit"}
      </Button>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Thank you for your inquiry. We'll add you to our non-spammy mailing list to keep in touch. You can always opt out, but why would you want to?&nbsp;
      </p>
    </form>
  );
}

function Field({
  label,
  hint,
  required,
  error,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="font-display text-sm font-semibold text-foreground">
        {label}
        {required && <span className="ml-1 text-[color:var(--brand-magenta)]">*</span>}
      </Label>
      {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
