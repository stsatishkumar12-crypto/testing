import { Link } from "@tanstack/react-router";
import { Instagram, MessageCircle } from "lucide-react";
import { SITE, instagramUrl, whatsappUrl } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-24 bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-4 md:px-8">
        <div>
          <div className="font-display text-3xl">{SITE.name}</div>
          <p className="mt-3 text-sm text-ink-foreground/70">{SITE.tagline}. Every stitch by hand, by artisans who have done this for generations.</p>
          <div className="mt-5 flex gap-3">
            <a href={instagramUrl()} target="_blank" rel="noreferrer" aria-label="Instagram" className="rounded-full border border-ink-foreground/30 p-2 hover:border-gold"><Instagram className="size-4" /></a>
            <a href={whatsappUrl(`Hello ${SITE.name}!`)} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="rounded-full border border-ink-foreground/30 p-2 hover:border-gold"><MessageCircle className="size-4" /></a>
          </div>
        </div>
        <FooterCol title="Shop" links={[["/shop", "All designs"], ["/categories", "Categories"], ["/gallery", "Gallery"], ["/cart", "Cart"]]} />
        <FooterCol title="Services" links={[["/custom-design", "Custom design"], ["/book", "Book your order"], ["/faq", "FAQ"], ["/contact", "Contact us"]]} />
        <FooterCol title="Policies" links={[["/about", "About us"], ["/privacy", "Privacy policy"], ["/terms", "Terms & conditions"], ["/cancellation-policy", "Cancellation policy"]]} />
      </div>
      <div className="border-t border-ink-foreground/10 py-5 text-center text-xs text-ink-foreground/50">© {new Date().getFullYear()} {SITE.name}. Handcrafted with love.</div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="eyebrow mb-4">{title}</div>
      <ul className="space-y-2 text-sm text-ink-foreground/80">
        {links.map(([to, label]) => (
          <li key={to}><Link to={to} className="hover:text-gold">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
