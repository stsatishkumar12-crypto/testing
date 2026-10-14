
create type public.app_role as enum ('admin','user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, address text, city text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id or public.has_role(auth.uid(),'admin'));
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, name text not null, description text, image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "public read categories" on public.categories for select to anon, authenticated using (true);
create policy "admin write categories" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, name text not null,
  category_id uuid references public.categories(id) on delete set null,
  price numeric(10,2) not null default 0,
  description text, images text[] not null default '{}',
  colors text[] not null default '{}',
  fabric text, handwork_type text, delivery_days int not null default 14,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public read products" on public.products for select to anon, authenticated using (is_active or public.has_role(auth.uid(),'admin'));
create policy "admin write products" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null default 'booking',
  product_id uuid references public.products(id) on delete set null,
  full_name text not null, phone text not null, email text,
  handwork_type text, fabric_details text, measurements text,
  budget text, preferred_date date, instructions text,
  design_images text[] not null default '{}',
  status text not null default 'pending',
  admin_notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "own bookings read" on public.bookings for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "own bookings insert" on public.bookings for insert to authenticated with check (auth.uid() = user_id and status = 'pending');
create policy "admin bookings update" on public.bookings for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin bookings delete" on public.bookings for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  full_name text not null, phone text not null, address text not null, city text not null,
  notes text, payment_method text not null default 'cod',
  total numeric(10,2) not null default 0,
  status text not null default 'placed',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own orders read" on public.orders for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "own orders insert" on public.orders for insert to authenticated with check (auth.uid() = user_id and status = 'placed');
create policy "admin orders update" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null, color text, price numeric(10,2) not null, quantity int not null default 1
);
grant select, insert on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "order items read" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(),'admin'))));
create policy "order items insert" on public.order_items for insert to authenticated with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text, phone text, message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
grant insert on public.inquiries to anon, authenticated;
grant select, update, delete on public.inquiries to authenticated;
grant all on public.inquiries to service_role;
alter table public.inquiries enable row level security;
create policy "anyone can send inquiry" on public.inquiries for insert to anon, authenticated with check (status = 'new' and length(message) between 1 and 2000 and length(name) between 1 and 100);
create policy "admin read inquiries" on public.inquiries for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin update inquiries" on public.inquiries for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin delete inquiries" on public.inquiries for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "admin manage product images" on storage.objects for all to authenticated using (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin')) with check (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'));
create policy "user upload own designs" on storage.objects for insert to authenticated with check (bucket_id = 'design-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user read own designs" on storage.objects for select to authenticated using (bucket_id = 'design-uploads' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));

insert into public.categories (slug, name, description, image_url, sort_order) values
('suits','Suits','Hand-embroidered suits for every occasion','/images/p-anarkali.jpg',1),
('neck-designs','Neck Designs','Intricate necklines in zari, resham and mirror work','/images/p-neck.jpg',2),
('sleeve-designs','Sleeve Designs','Statement sleeves with delicate borders','/images/p-sleeve.jpg',3),
('dupatta-work','Dupatta Work','Heirloom dupattas with gota and cutwork','/images/p-dupatta.jpg',4),
('bridal-handwork','Bridal Handwork','Zardozi and dabka for your big day','/images/p-bridal.jpg',5),
('embroidery-patterns','Embroidery Patterns','Pattern library for custom pieces','/images/p-chikan.jpg',6),
('custom-handwork','Custom Handwork','Bring your idea — we stitch it by hand','/images/hero.jpg',7);

insert into public.products (slug, name, category_id, price, description, images, colors, fabric, handwork_type, delivery_days, is_featured) values
('maroon-zardozi-bridal-suit','Maroon Zardozi Bridal Suit',(select id from public.categories where slug='bridal-handwork'),18500,'A regal maroon suit hand-worked with antique gold zardozi, dabka and sequins across the yoke and hem.','{/images/p-bridal.jpg,/images/hero.jpg}','{Maroon,Wine,Deep Red}','Raw Silk','Zardozi & Dabka',25,true),
('ivory-chikankari-suit','Ivory Chikankari Suit',(select id from public.categories where slug='suits'),6800,'Soft ivory georgette with fine hand chikankari shadow work, light and timeless.','{/images/p-chikan.jpg}','{Ivory,Mint,Powder Pink}','Georgette','Chikankari',14,true),
('emerald-mirror-neck','Emerald Mirror-Work Neckline',(select id from public.categories where slug='neck-designs'),2400,'Hand-applied mirror and resham neckline that can be added to any suit.','{/images/p-neck.jpg}','{Emerald,Black,Navy}','Cotton Silk','Mirror & Resham',7,true),
('gota-patti-dupatta','Gota Patti Dupatta',(select id from public.categories where slug='dupatta-work'),3900,'Chanderi dupatta with all-over gota patti butis and a scalloped border.','{/images/p-dupatta.jpg}','{Mustard,Rani Pink,Teal}','Chanderi','Gota Patti',10,true),
('pearl-cutdana-sleeves','Pearl & Cutdana Sleeves',(select id from public.categories where slug='sleeve-designs'),1800,'Sleeve borders worked with pearls, cutdana and fine zari outline.','{/images/p-sleeve.jpg}','{Blush,Ivory,Lilac}','Organza','Pearl & Cutdana',7,true),
('rose-resham-anarkali','Rose Resham Anarkali Suit',(select id from public.categories where slug='suits'),9200,'Flowing anarkali with floral resham embroidery and a hand-finished dupatta.','{/images/p-anarkali.jpg}','{Rose,Peach,Sage}','Silk Blend','Resham',18,true);
