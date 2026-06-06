create table public.session_passes (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references public.customers(id) on delete cascade,
  total_count     integer not null check (total_count > 0),
  remaining_count integer not null check (remaining_count >= 0),
  purchased_at    date not null default current_date,
  expired_at      date,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index session_passes_customer_idx on public.session_passes (customer_id);

-- レッスンと回数券を紐づけ
alter table public.lessons
  add column session_pass_id uuid references public.session_passes(id) on delete set null;

-- アトミックなデクリメント / インクリメント用関数
create or replace function decrement_session_pass(pass_id uuid)
returns void language plpgsql as $$
begin
  update public.session_passes
  set remaining_count = remaining_count - 1,
      updated_at = now()
  where id = pass_id and remaining_count > 0;
end;
$$;

create or replace function increment_session_pass(pass_id uuid)
returns void language plpgsql as $$
begin
  update public.session_passes
  set remaining_count = remaining_count + 1,
      updated_at = now()
  where id = pass_id;
end;
$$;
