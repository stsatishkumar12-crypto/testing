import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/common";

export const Route = createFileRoute("/product/$slug")({
  head: () => ({ meta: [{ title: "Product — Zari & Thread" }, { name: "description", content: "Hand-embroidered design." }] }),
  component: () => <PageHero eyebrow="Product" title="Design details" subtitle="This page is being prepared." />,
});
