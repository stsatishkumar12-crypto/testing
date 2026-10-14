import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = { productId: string; slug: string; name: string; price: number; image?: string; color?: string; quantity: number };

type CartCtx = {
  items: CartItem[];
  add: (item: CartItem) => void;
  update: (productId: string, color: string | undefined, quantity: number) => void;
  remove: (productId: string, color: string | undefined) => void;
  clear: () => void;
  total: number;
  count: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "zt-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { /* ignore */ }
  }, []);
  const save = (next: CartItem[]) => { setItems(next); localStorage.setItem(KEY, JSON.stringify(next)); };
  const same = (i: CartItem, id: string, c?: string) => i.productId === id && i.color === c;

  const value: CartCtx = {
    items,
    add: (item) => {
      const existing = items.find((i) => same(i, item.productId, item.color));
      save(existing
        ? items.map((i) => (i === existing ? { ...i, quantity: i.quantity + item.quantity } : i))
        : [...items, item]);
    },
    update: (id, c, q) => save(items.map((i) => (same(i, id, c) ? { ...i, quantity: Math.max(1, Math.min(20, q)) } : i))),
    remove: (id, c) => save(items.filter((i) => !same(i, id, c))),
    clear: () => save([]),
    total: items.reduce((s, i) => s + i.price * i.quantity, 0),
    count: items.reduce((s, i) => s + i.quantity, 0),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside provider");
  return c;
}
