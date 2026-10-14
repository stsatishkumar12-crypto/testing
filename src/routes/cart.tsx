import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/common";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — Zari & Thread" }, { name: "description", content: "Cart at Zari & Thread." }, { property: "og:title", content: "Cart — Zari & Thread" }, { property: "og:description", content: "Cart at Zari & Thread." }] }),
  component: () => <PageHero eyebrow="Zari & Thread" title="Cart" subtitle="This page is being prepared." />,
});
