import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/common";

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: "Categories — Zari & Thread" }, { name: "description", content: "Categories at Zari & Thread." }, { property: "og:title", content: "Categories — Zari & Thread" }, { property: "og:description", content: "Categories at Zari & Thread." }] }),
  component: () => <PageHero eyebrow="Zari & Thread" title="Categories" subtitle="This page is being prepared." />,
});
