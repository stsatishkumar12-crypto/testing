import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/common";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About — Zari & Thread" }, { name: "description", content: "About at Zari & Thread." }, { property: "og:title", content: "About — Zari & Thread" }, { property: "og:description", content: "About at Zari & Thread." }] }),
  component: () => <PageHero eyebrow="Zari & Thread" title="About" subtitle="This page is being prepared." />,
});
