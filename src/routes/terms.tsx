import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/common";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms — Zari & Thread" }, { name: "description", content: "Terms at Zari & Thread." }, { property: "og:title", content: "Terms — Zari & Thread" }, { property: "og:description", content: "Terms at Zari & Thread." }] }),
  component: () => <PageHero eyebrow="Zari & Thread" title="Terms" subtitle="This page is being prepared." />,
});
