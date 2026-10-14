import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/common";

export const Route = createFileRoute("/custom-design")({
  head: () => ({ meta: [{ title: "Custom Design — Zari & Thread" }, { name: "description", content: "Custom Design at Zari & Thread." }, { property: "og:title", content: "Custom Design — Zari & Thread" }, { property: "og:description", content: "Custom Design at Zari & Thread." }] }),
  component: () => <PageHero eyebrow="Zari & Thread" title="Custom Design" subtitle="This page is being prepared." />,
});
