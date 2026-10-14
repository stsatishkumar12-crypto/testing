import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/common";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact — Zari & Thread" }, { name: "description", content: "Contact at Zari & Thread." }, { property: "og:title", content: "Contact — Zari & Thread" }, { property: "og:description", content: "Contact at Zari & Thread." }] }),
  component: () => <PageHero eyebrow="Zari & Thread" title="Contact" subtitle="This page is being prepared." />,
});
