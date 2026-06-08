alter table public.customers
  add column customer_type text not null default 'individual'
  check (customer_type in ('individual', 'corporate'));
