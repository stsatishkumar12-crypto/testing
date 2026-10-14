import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/common";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "Orders — Zari & Thread" }, { name: "description", content: "Orders at Zari & Thread." }, { property: "og:title", content: "Orders — Zari & Thread" }, { property: "og:description", content: "Orders at Zari & Thread." }] }),
  component: () => <PageHero eyebrow="Zari & Thread" title="Orders" subtitle="This page is being prepared." />,
});
