export const SITE = {
  name: "Zari & Thread",
  tagline: "Hand-embroidered suits, made for you",
  // Placeholder contact details — replace with the real business numbers.
  whatsapp: "919999999999",
  instagram: "zariandthread",
  email: "hello@zariandthread.in",
  phone: "+91 99999 99999",
  address: "Studio 12, Karol Bagh, New Delhi",
};

export const instagramUrl = () => `https://instagram.com/${SITE.instagram}`;
export const instagramDm = () => `https://ig.me/m/${SITE.instagram}`;

export function whatsappUrl(message: string) {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message.slice(0, 1500))}`;
}

export function productWhatsappMessage(p: { name: string; price: number; slug: string }, extra?: { color?: string }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/product/${p.slug}` : `/product/${p.slug}`;
  return [
    `Hello ${SITE.name}, I'd like to order:`,
    `• Product: ${p.name}`,
    `• Price: ${formatINR(p.price)}`,
    extra?.color ? `• Colour: ${extra.color}` : null,
    `• Link: ${url}`,
  ].filter(Boolean).join("\n");
}

export function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export const STATUS_OPTIONS = {
  booking: ["pending", "confirmed", "in_progress", "ready", "delivered", "cancelled"],
  order: ["placed", "confirmed", "in_progress", "shipped", "delivered", "cancelled"],
  inquiry: ["new", "replied", "closed"],
} as const;
