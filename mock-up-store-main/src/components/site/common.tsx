import { Link } from "@tanstack/react-router";
import { MessageCircle, Instagram, Upload, X } from "lucide-react";
import { type ReactNode, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/data";
import { formatINR, instagramDm, productWhatsappMessage, whatsappUrl } from "@/lib/site";

export function PageHero({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <section className="border-b bg-secondary/40">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center md:py-20">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="fade-up mt-4 text-4xl md:text-6xl">{title}</h1>
        {subtitle && <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{subtitle}</p>}
      </div>
    </section>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl px-4 md:px-8 ${className}`}>{children}</div>;
}

export function ProductCard({ p }: { p: Product }) {
  return (
    <div className="group">
      <Link to="/product/$slug" params={{ slug: p.slug }} className="block overflow-hidden bg-muted">
        <img src={p.images[0] || "/images/hero.jpg"} alt={p.name} loading="lazy" width={800} height={1000}
          className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-105" />
      </Link>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow text-[10px]">{p.handwork_type}</div>
          <Link to="/product/$slug" params={{ slug: p.slug }} className="mt-1 block font-display text-xl leading-tight hover:text-primary">{p.name}</Link>
          <div className="mt-1 text-sm text-muted-foreground">{formatINR(Number(p.price))}</div>
        </div>
        <a href={whatsappUrl(productWhatsappMessage({ name: p.name, price: Number(p.price), slug: p.slug }))} target="_blank" rel="noreferrer"
          aria-label="Order on WhatsApp" className="rounded-full bg-whatsapp p-2 text-whatsapp-foreground opacity-90 hover:opacity-100">
          <MessageCircle className="size-4" />
        </a>
      </div>
    </div>
  );
}

export function SocialOrderButtons({ message }: { message: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button asChild variant="whatsapp" size="lg">
        <a href={whatsappUrl(message)} target="_blank" rel="noreferrer"><MessageCircle /> Order on WhatsApp</a>
      </Button>
      <Button asChild variant="outline" size="lg">
        <a href={instagramDm()} target="_blank" rel="noreferrer"><Instagram /> DM on Instagram</a>
      </Button>
    </div>
  );
}

export function ImagePicker({ files, setFiles, max = 5 }: { files: File[]; setFiles: (f: File[]) => void; max?: number }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <button type="button" onClick={() => ref.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-gold/60 bg-card px-4 py-8 text-sm text-muted-foreground hover:bg-muted">
        <Upload className="size-5 text-gold" />
        Upload reference images (up to {max}, 10MB each)
      </button>
      <input ref={ref} type="file" accept="image/*" multiple hidden
        onChange={(e) => { const add = Array.from(e.target.files || []); setFiles([...files, ...add].slice(0, max)); e.target.value = ""; }} />
      {files.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {files.map((f, i) => (
            <div key={i} className="relative">
              <img src={URL.createObjectURL(f)} alt="" className="aspect-square w-full rounded object-cover" />
              <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5" aria-label="Remove"><X className="size-3" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
      {children}
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </label>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className="inline-block rounded-full bg-accent px-2.5 py-0.5 text-xs capitalize text-accent-foreground">{status.replace("_", " ")}</span>;
}
