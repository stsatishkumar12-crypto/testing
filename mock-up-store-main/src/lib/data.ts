import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Product = Database["public"]["Tables"]["products"]["Row"] & { categories?: { name: string; slug: string } | null };
export type Category = Database["public"]["Tables"]["categories"]["Row"];

export const categoriesQuery = () =>
  queryOptions({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

export const productsQuery = (opts: { categorySlug?: string; featured?: boolean } = {}) =>
  queryOptions({
    queryKey: ["products", opts],
    queryFn: async () => {
      let q = supabase.from("products").select("*, categories!inner(name, slug)").eq("is_active", true).order("created_at", { ascending: false });
      if (opts.categorySlug) q = q.eq("categories.slug", opts.categorySlug);
      if (opts.featured) q = q.eq("is_featured", true);
      const { data, error } = await q;
      if (error) throw error;
      return data as Product[];
    },
  });

export const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*, categories(name, slug)").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data as Product | null;
    },
  });

/** Upload files to a private bucket under the user's folder; returns storage paths. */
export async function uploadFiles(bucket: "design-uploads" | "product-images", folder: string, files: File[]) {
  const paths: string[] = [];
  for (const f of files) {
    if (!f.type.startsWith("image/")) throw new Error(`${f.name} is not an image`);
    if (f.size > 10 * 1024 * 1024) throw new Error(`${f.name} is larger than 10MB`);
    const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, f, { contentType: f.type });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}

export async function signedUrls(bucket: string, paths: string[], expiresIn = 3600) {
  if (!paths.length) return [];
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, expiresIn);
  return (data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[];
}
