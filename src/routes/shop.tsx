import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/common";

export const Route = createFileRoute("/shop")({
  head: () => ({ meta: [{ title: "Shop — Zari & Thread" }, { name: "description", content: "Shop at Zari & Thread." }, { property: "og:title", content: "Shop — Zari & Thread" }, { property: "og:description", content: "Shop at Zari & Thread." }] }),
  component: () => <PageHero eyebrow="Zari & Thread" title="Shop" subtitle="This page is being prepared." />,
});
