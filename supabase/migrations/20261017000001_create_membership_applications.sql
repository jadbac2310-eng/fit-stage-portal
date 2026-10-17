-- 入会申し込み（HPの /store/join/ から届く申込書）
--
-- 顧客マスタにも内容を反映するが、申込書そのものはここに原本として残す。
-- 顧客情報はあとから編集されるため、原本を別に持っておかないと
-- 「申し込みの時点で何に同意したか」が追えなくなるため。
--
-- 健康状態は「ある／ない」だけを受け取る。詳しい内容はフォームでは聞かず、
-- 初回セッションで口頭で伺う運用（要配慮個人情報を必要以上に持たないため）。
create table if not exists public.membership_applications (
  id                 uuid primary key default gen_random_uuid(),
  customer_id        uuid references public.customers(id) on delete set null,
  store_id           uuid references public.stores(id) on delete set null,
  store_name         text,

  full_name          text not null,
  full_name_kana     text,
  date_of_birth      date,
  phone_number       text,
  email              text,
  postal_code        text,
  address            text,

  emergency_name     text,
  emergency_relation text,
  emergency_phone    text,

  plan               text,
  payment_method     text,

  health_condition   text,    -- 持病・通院（ある／ない）
  health_medicine    text,    -- 服薬（ある／ない）
  health_injury      text,    -- 過去のケガ・手術（ある／ない）
  health_maternity   boolean not null default false,

  photo_consent      text,    -- 写真・動画の掲載可否
  request_note       text,

  agreed_to_terms    boolean not null default false,
  agreed_at          timestamptz,
  signature_name     text,    -- 署名の代わりに入力してもらった氏名

  -- 担当者が確認したかどうか。new=未対応 / done=対応済み
  status             text not null default 'new' check (status in ('new', 'done')),
  note               text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists membership_applications_created_idx
  on public.membership_applications (created_at desc);
create index if not exists membership_applications_customer_idx
  on public.membership_applications (customer_id);
create index if not exists membership_applications_status_idx
  on public.membership_applications (status);
