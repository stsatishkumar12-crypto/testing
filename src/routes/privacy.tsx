import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/common";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy — Zari & Thread" }, { name: "description", content: "Privacy at Zari & Thread." }, { property: "og:title", content: "Privacy — Zari & Thread" }, { property: "og:description", content: "Privacy at Zari & Thread." }] }),
  component: () => <PageHero eyebrow="Zari & Thread" title="Privacy" subtitle="This page is being prepared." />,
});
