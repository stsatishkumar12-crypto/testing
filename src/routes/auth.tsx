import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/common";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Auth — Zari & Thread" }, { name: "description", content: "Auth at Zari & Thread." }, { property: "og:title", content: "Auth — Zari & Thread" }, { property: "og:description", content: "Auth at Zari & Thread." }] }),
  component: () => <PageHero eyebrow="Zari & Thread" title="Auth" subtitle="This page is being prepared." />,
});
