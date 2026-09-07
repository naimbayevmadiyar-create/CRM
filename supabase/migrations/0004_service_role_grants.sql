-- Права сервисной роли.
--
-- Приложение ходит в базу только сервисным ключом. Supabase выдаёт этой роли
-- права автоматически лишь при включённой настройке «Automatically expose new
-- tables». Полагаться на переключатель в панели нельзя: схема должна быть
-- самодостаточной и одинаково разворачиваться на любом проекте.
--
-- Анонимной и публичной ролям по-прежнему не выдаётся ничего — их доступ
-- закрыт миграцией 0002 и включённым RLS.

grant usage on schema public to service_role;

grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute        on all functions in schema public to service_role;

-- то же самое для всего, что будет создано позже
alter default privileges in schema public grant all     on tables    to service_role;
alter default privileges in schema public grant all     on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

-- PostgREST держит схему в кеше: без этого новые права подхватятся не сразу
notify pgrst, 'reload schema';
