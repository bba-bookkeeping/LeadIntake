import { createFileRoute } from "@tanstack/react-router";
import { LeadIntakeForm } from "@/components/LeadIntakeForm";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "BBA — Let's see if we're a good fit" },
      {
        name: "description",
        content:
          "Share a few details about your business and current bookkeeping setup. BBA will follow up within one business day.",
      },
    ],
  }),
});

function Index() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* ambient brand gradients */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(closest-side, #cac6e5, transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(closest-side, #b20476, transparent)" }}
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center px-6 py-10 sm:py-14 lg:py-16">
        <section className="flex w-full max-w-3xl flex-col items-center text-center">
          <span className="font-display text-3xl font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-magenta)] sm:text-4xl lg:text-5xl">
            BBA Bookkeeping
          </span>
          <h1 className="mt-5 font-script text-3xl leading-[1.05] text-foreground sm:text-4xl lg:text-5xl">
            Let&apos;s see if we&apos;re
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-brand)" }}
            >
              a good fit.
            </span>
          </h1>
          <p className="mt-5 max-w-md font-display text-base leading-relaxed text-muted-foreground">
            Share a few details about your business and current bookkeeping setup. We&apos;ll
            follow up within one business day.
          </p>
        </section>

        <div className="mt-10 w-full max-w-3xl">
          <LeadIntakeForm />
        </div>
      </div>
    </main>
  );
}
