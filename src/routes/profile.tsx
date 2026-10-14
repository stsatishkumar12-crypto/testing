import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/common";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Zari & Thread" }, { name: "description", content: "Profile at Zari & Thread." }, { property: "og:title", content: "Profile — Zari & Thread" }, { property: "og:description", content: "Profile at Zari & Thread." }] }),
  component: () => <PageHero eyebrow="Zari & Thread" title="Profile" subtitle="This page is being prepared." />,
});
