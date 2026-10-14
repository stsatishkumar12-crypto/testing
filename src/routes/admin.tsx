import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/common";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Zari & Thread" }, { name: "description", content: "Admin at Zari & Thread." }, { property: "og:title", content: "Admin — Zari & Thread" }, { property: "og:description", content: "Admin at Zari & Thread." }] }),
  component: () => <PageHero eyebrow="Zari & Thread" title="Admin" subtitle="This page is being prepared." />,
});
