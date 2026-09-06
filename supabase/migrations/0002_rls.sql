-- Защита данных.
--
-- Приложение ходит в базу только с сервера и только сервисным ключом, который
-- RLS обходит по определению. Публичный и анонимный ключи не должны видеть
-- ничего. Поэтому включаем RLS и НЕ создаём ни одной разрешающей политики:
-- при включённом RLS без политик доступ запрещён полностью.
--
-- Так утечка публичного ключа не даёт злоумышленнику ни строки, а правила
-- доступа живут в одном месте — в серверном коде, а не размазаны по политикам.

alter table profiles      enable row level security;
alter table leads         enable row level security;
alter table orders        enable row level security;
alter table order_events  enable row level security;
alter table app_settings  enable row level security;
alter table auth_attempts enable row level security;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

-- Представление наследует права базовых таблиц, но закроем явно.
revoke all on client_stats from anon, authenticated;

-- Новые объекты по умолчанию тоже закрыты.
alter default privileges in schema public
  revoke all on tables from anon, authenticated;
alter default privileges in schema public
  revoke all on sequences from anon, authenticated;
