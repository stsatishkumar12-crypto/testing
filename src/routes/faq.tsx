import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/common";

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [{ title: "Faq — Zari & Thread" }, { name: "description", content: "Faq at Zari & Thread." }, { property: "og:title", content: "Faq — Zari & Thread" }, { property: "og:description", content: "Faq at Zari & Thread." }] }),
  component: () => <PageHero eyebrow="Zari & Thread" title="Faq" subtitle="This page is being prepared." />,
});
