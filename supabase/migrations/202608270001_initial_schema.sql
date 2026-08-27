create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'staff');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'staff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  code text,
  name text not null check (btrim(name) <> ''),
  normalized_name text generated always as (lower(btrim(name))) stored,
  phone text,
  address text,
  region text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_normalized_name_key unique (normalized_name)
);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  amount numeric(16, 2) not null check (amount >= 0),
  order_date date not null,
  due_days integer not null default 30 check (due_days between 0 and 3650),
  due_date date generated always as (order_date + due_days) stored,
  sales_person text,
  delivery_person text,
  product_name text,
  quantity numeric(12, 2) check (quantity is null or quantity >= 0),
  unit_price numeric(16, 2) check (unit_price is null or unit_price >= 0),
  notes text,
  source_sheet text,
  source_row integer,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint debts_source_key unique (source_sheet, source_row)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid not null references public.debts(id) on delete cascade,
  amount numeric(16, 2) not null check (amount > 0),
  paid_at date not null default current_date,
  sales_person text,
  delivery_person text,
  notes text,
  source_sheet text,
  source_row integer,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_source_key unique (source_sheet, source_row)
);

create table public.returns (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid references public.debts(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  product_name text not null,
  quantity numeric(12, 2) not null default 1 check (quantity > 0),
  unit_price numeric(16, 2) not null default 0 check (unit_price >= 0),
  total_amount numeric(16, 2) generated always as (quantity * unit_price) stored,
  returned_at date not null default current_date,
  notes text,
  source_sheet text,
  source_row integer,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint returns_source_key unique (source_sheet, source_row)
);

create table public.organization_settings (
  id smallint primary key default 1 check (id = 1),
  max_debt numeric(16, 2) not null default 0 check (max_debt >= 0),
  debt_terms integer[] not null default array[15, 30, 45, 60],
  updated_at timestamptz not null default now()
);

insert into public.organization_settings (id) values (1) on conflict (id) do nothing;

create index debts_customer_idx on public.debts(customer_id);
create index debts_order_date_idx on public.debts(order_date desc);
create index debts_due_date_idx on public.debts(due_date);
create index debts_sales_person_idx on public.debts(sales_person);
create index debts_delivery_person_idx on public.debts(delivery_person);
create index payments_debt_idx on public.payments(debt_id);
create index payments_paid_at_idx on public.payments(paid_at desc);
create index returns_customer_idx on public.returns(customer_id);
create index returns_debt_idx on public.returns(debt_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers
for each row execute function public.set_updated_at();
create trigger debts_set_updated_at before update on public.debts
for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments
for each row execute function public.set_updated_at();
create trigger returns_set_updated_at before update on public.returns
for each row execute function public.set_updated_at();
create trigger settings_set_updated_at before update on public.organization_settings
for each row execute function public.set_updated_at();

create or replace function public.prevent_overpayment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  debt_total numeric;
  already_paid numeric;
  already_returned numeric;
begin
  -- Dữ liệu lịch sử được giữ nguyên để không làm mất sai lệch cần đối soát.
  if new.source_sheet is not null then
    return new;
  end if;
  select amount into debt_total from public.debts where id = new.debt_id for update;
  select coalesce(sum(amount), 0) into already_paid
    from public.payments where debt_id = new.debt_id and id <> new.id;
  select coalesce(sum(total_amount), 0) into already_returned
    from public.returns where debt_id = new.debt_id;
  if already_paid + already_returned + new.amount > debt_total then
    raise exception 'Số tiền trả vượt dư nợ hiện tại';
  end if;
  return new;
end;
$$;

create trigger payments_prevent_overpayment
before insert or update of debt_id, amount on public.payments
for each row execute function public.prevent_overpayment();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    case when coalesce(new.raw_user_meta_data ->> 'role', 'staff') = 'admin'
      then 'admin'::public.user_role else 'staff'::public.user_role end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace view public.debt_overview
with (security_invoker = true)
as
with paid as (
  select debt_id, sum(amount) as amount
  from public.payments
  group by debt_id
), returned as (
  select debt_id, sum(total_amount) as amount
  from public.returns
  where debt_id is not null
  group by debt_id
)
select
  d.id,
  d.customer_id,
  c.code as customer_code,
  c.name as customer_name,
  c.phone,
  c.address,
  c.region,
  d.amount,
  coalesce(paid.amount, 0)::numeric(16, 2) as paid_amount,
  coalesce(returned.amount, 0)::numeric(16, 2) as returned_amount,
  greatest(d.amount - coalesce(paid.amount, 0) - coalesce(returned.amount, 0), 0)::numeric(16, 2) as remaining_amount,
  d.order_date,
  d.due_days,
  d.due_date,
  d.sales_person,
  d.delivery_person,
  d.product_name,
  d.quantity,
  d.unit_price,
  d.notes,
  d.source_sheet,
  d.source_row,
  d.created_at,
  case
    when d.amount - coalesce(paid.amount, 0) - coalesce(returned.amount, 0) <= 0 then 'paid'
    when d.due_date < current_date then 'overdue'
    when d.due_date <= current_date + 7 then 'due_soon'
    else 'open'
  end as status
from public.debts d
join public.customers c on c.id = d.customer_id
left join paid on paid.debt_id = d.id
left join returned on returned.debt_id = d.id;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.debts enable row level security;
alter table public.payments enable row level security;
alter table public.returns enable row level security;
alter table public.organization_settings enable row level security;

create policy "authenticated users read profiles" on public.profiles
for select to authenticated using (true);
create policy "users update own profile" on public.profiles
for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "authenticated users manage customers" on public.customers
for all to authenticated using (true) with check (true);
create policy "authenticated users manage debts" on public.debts
for all to authenticated using (true) with check (true);
create policy "authenticated users manage payments" on public.payments
for all to authenticated using (true) with check (true);
create policy "authenticated users manage returns" on public.returns
for all to authenticated using (true) with check (true);
create policy "authenticated users read settings" on public.organization_settings
for select to authenticated using (true);
create policy "authenticated users update settings" on public.organization_settings
for update to authenticated using (true) with check (true);

grant usage on schema public to authenticated;
grant select on public.profiles, public.debt_overview to authenticated;
grant select, insert, update, delete on public.customers, public.debts, public.payments, public.returns to authenticated;
grant select, update on public.organization_settings to authenticated;

revoke all on public.profiles, public.customers, public.debts, public.payments, public.returns, public.organization_settings from anon;
revoke all on public.debt_overview from anon;
