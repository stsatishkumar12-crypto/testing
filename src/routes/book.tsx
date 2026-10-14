import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/common";

export const Route = createFileRoute("/book")({
  head: () => ({ meta: [{ title: "Book — Zari & Thread" }, { name: "description", content: "Book at Zari & Thread." }, { property: "og:title", content: "Book — Zari & Thread" }, { property: "og:description", content: "Book at Zari & Thread." }] }),
  component: () => <PageHero eyebrow="Zari & Thread" title="Book" subtitle="This page is being prepared." />,
});
