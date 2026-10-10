-- レッスンの実施形態（店舗／出張／オンライン）。
--
-- これまでは店舗が選ばれていないことでしか出張を見分けられず、
-- 「選び忘れ」と区別がつかなかった。請求書にも印字するため、明示的に持たせる。
--
-- 既存データは店舗扱いにし、オンラインパーソナルのコースだけオンラインに寄せる。
alter table public.lessons
  add column if not exists delivery_mode text not null default 'store';
alter table public.trial_lessons
  add column if not exists delivery_mode text not null default 'store';

alter table public.lessons
  drop constraint if exists lessons_delivery_mode_check;
alter table public.lessons
  add constraint lessons_delivery_mode_check
  check (delivery_mode in ('store', 'onsite', 'online'));

alter table public.trial_lessons
  drop constraint if exists trial_lessons_delivery_mode_check;
alter table public.trial_lessons
  add constraint trial_lessons_delivery_mode_check
  check (delivery_mode in ('store', 'onsite', 'online'));

-- 既存のオンラインパーソナルをオンラインに寄せる（何回実行してもOK）
update public.lessons
   set delivery_mode = 'online'
 where course = 'オンラインパーソナル' and delivery_mode <> 'online';
