import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LeadIntakeForm } from "@/components/LeadIntakeForm";

export const Route = createFileRoute("/embed")({
  head: () => ({
    meta: [
      { title: "BBA Fit Check" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EmbedPage,
});

function EmbedPage() {
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;

    const post = () => {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: "bba-embed-height", height }, "*");
    };

    post();
    const ro = new ResizeObserver(post);
    ro.observe(document.documentElement);
    window.addEventListener("load", post);

    return () => {
      ro.disconnect();
      window.removeEventListener("load", post);
    };
  }, []);

  return (
    <div className="bg-transparent p-4 sm:p-6">
      <LeadIntakeForm />
    </div>
  );
}
