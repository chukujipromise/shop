create extension if not exists pgcrypto;

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null,
  description text not null,
  price numeric(10, 2) not null check (price >= 0),
  label text not null,
  image_url text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_email text not null,
  customer_name text not null,
  shipping_address text not null,
  shipping_city text not null,
  shipping_postal_code text not null,
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  shipping_amount numeric(10, 2) not null check (shipping_amount >= 0),
  total numeric(10, 2) not null check (total >= 0),
  status text not null default 'placed',
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  product_name text not null,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 20)
);

create table if not exists public.shopping_carts (
  id uuid primary key,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.shopping_carts enable row level security;

drop policy if exists "Anyone can read active products" on public.products;
create policy "Anyone can read active products"
  on public.products for select using (active = true);

create or replace function public.create_shop_order(
  customer_email text,
  customer_name text,
  shipping_address text,
  shipping_city text,
  shipping_postal_code text,
  order_subtotal numeric,
  shipping_amount numeric,
  order_total numeric,
  order_items jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_order_id uuid;
  item jsonb;
begin
  insert into public.orders (
    customer_email, customer_name, shipping_address, shipping_city,
    shipping_postal_code, subtotal, shipping_amount, total
  ) values (
    customer_email, customer_name, shipping_address, shipping_city,
    shipping_postal_code, order_subtotal, shipping_amount, order_total
  ) returning id into new_order_id;

  for item in select value from jsonb_array_elements(order_items)
  loop
    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity)
    values (
      new_order_id,
      item ->> 'product_id',
      item ->> 'product_name',
      (item ->> 'unit_price')::numeric,
      (item ->> 'quantity')::integer
    );
  end loop;

  return new_order_id;
end;
$$;

revoke all on function public.create_shop_order(text, text, text, text, text, numeric, numeric, numeric, jsonb) from public, anon, authenticated;
grant execute on function public.create_shop_order(text, text, text, text, text, numeric, numeric, numeric, jsonb) to service_role;

insert into public.products (id, name, category, description, price, label, image_url)
values
  ('arc-desk-lamp', 'Arc desk lamp', 'Desk', 'Powder-coated steel · Chalk', 148, 'Bestseller', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=82'),
  ('field-notes-set', 'Field notes set', 'Desk', 'Recycled paper · Set of three', 24, 'The daily ritual', 'https://images.unsplash.com/photo-1455390582262-044c6d77cf65?auto=format&fit=crop&w=900&q=82'),
  ('studio-headphones', 'Studio headphones', 'Audio', 'Wireless · Stone / graphite', 189, 'New arrival', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=82'),
  ('weekend-tote', 'Weekend carryall', 'Travel', 'Organic canvas · Cobalt', 76, 'Made to move', 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=82')
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  price = excluded.price,
  label = excluded.label,
  image_url = excluded.image_url;