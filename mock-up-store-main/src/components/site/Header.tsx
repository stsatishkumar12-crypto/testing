import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/lib/site";
import { useQueryClient } from "@tanstack/react-query";

const NAV = [
  { to: "/", label: "JSON Extractor" },
  { to: "/shop", label: "Shop" },
  { to: "/categories", label: "Categories" },
  { to: "/custom-design", label: "Custom Design" },
  { to: "/book", label: "Book Order" },
  { to: "/gallery", label: "Gallery" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="bg-ink py-1.5 text-center text-[11px] uppercase tracking-[0.25em] text-ink-foreground">
        Handcrafted in India · Custom orders on WhatsApp
      </div>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <button className="lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <Link to="/" className="font-display text-2xl tracking-wide text-primary md:text-3xl">{SITE.name}</Link>
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="text-xs uppercase tracking-[0.18em] text-foreground/80 hover:text-primary" activeProps={{ className: "text-primary" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          {isAdmin && <Link to="/admin" className="hidden text-xs uppercase tracking-[0.18em] text-gold md:block">Admin</Link>}
          {user ? (
            <div className="group relative">
              <Link to="/profile" aria-label="Account"><User className="size-5" /></Link>
              <div className="invisible absolute right-0 top-full z-50 w-44 rounded-md border bg-popover p-2 text-sm opacity-0 shadow-soft transition group-hover:visible group-hover:opacity-100">
                <Link to="/profile" className="block rounded px-3 py-2 hover:bg-muted">My profile</Link>
                <Link to="/orders" className="block rounded px-3 py-2 hover:bg-muted">My orders</Link>
                {isAdmin && <Link to="/admin" className="block rounded px-3 py-2 hover:bg-muted">Admin dashboard</Link>}
                <button onClick={signOut} className="block w-full rounded px-3 py-2 text-left hover:bg-muted">Sign out</button>
              </div>
            </div>
          ) : (
            <Link to="/auth" className="text-xs uppercase tracking-[0.18em] hover:text-primary">Sign in</Link>
          )}
          <Link to="/cart" className="relative" aria-label="Cart">
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 grid size-4 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">{count}</span>
            )}
          </Link>
        </div>
      </div>
      {open && (
        <nav className="border-t bg-background px-4 py-4 lg:hidden">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block py-2 text-sm uppercase tracking-[0.18em]">{n.label}</Link>
          ))}
          {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="block py-2 text-sm uppercase tracking-[0.18em] text-gold">Admin</Link>}
        </nav>
      )}
    </header>
  );
}
