import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/common";

export const Route = createFileRoute("/cancellation-policy")({
  head: () => ({ meta: [{ title: "Cancellation Policy — Zari & Thread" }, { name: "description", content: "Cancellation Policy at Zari & Thread." }, { property: "og:title", content: "Cancellation Policy — Zari & Thread" }, { property: "og:description", content: "Cancellation Policy at Zari & Thread." }] }),
  component: () => <PageHero eyebrow="Zari & Thread" title="Cancellation Policy" subtitle="This page is being prepared." />,
});
