-- Журнал ошибок.
--
-- Когда у человека на экране «Не получилось загрузить», внизу стоит код.
-- Раньше по этому коду искать было негде: логи Vercel на бесплатном тарифе
-- живут около часа, а о сбое сообщают к вечеру. Теперь каждая ошибка
-- сервера и браузера ложится сюда с тем же кодом — её можно найти и через
-- неделю.
--
-- Персональных данных здесь нет: ни тел запросов, ни заголовков, кроме
-- браузера. Только где упало, что за ошибка и когда.

create table app_errors (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  source      text not null check (source in ('server', 'client')),
  digest      text,
  message     text not null,
  path        text,
  method      text,
  route_path  text,
  route_type  text,
  role        text,
  user_agent  text
);

create index app_errors_created_idx on app_errors (created_at desc);
create index app_errors_digest_idx  on app_errors (digest) where digest is not null;

alter table app_errors enable row level security;
revoke all on app_errors from anon, authenticated;
grant all privileges on app_errors to service_role;
grant usage, select on sequence app_errors_id_seq to service_role;

comment on table app_errors is
  'Ошибки сервера и браузера с кодом, который человек видит на экране';

notify pgrst, 'reload schema';
