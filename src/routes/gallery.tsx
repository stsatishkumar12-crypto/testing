import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/common";

export const Route = createFileRoute("/gallery")({
  head: () => ({ meta: [{ title: "Gallery — Zari & Thread" }, { name: "description", content: "Gallery at Zari & Thread." }, { property: "og:title", content: "Gallery — Zari & Thread" }, { property: "og:description", content: "Gallery at Zari & Thread." }] }),
  component: () => <PageHero eyebrow="Zari & Thread" title="Gallery" subtitle="This page is being prepared." />,
});
