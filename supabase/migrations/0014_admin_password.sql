-- Пароль администратора — в системе, а не в переменной окружения.
--
-- Раньше сменить его можно было только на Vercel: положить новый хеш в
-- ADMIN_PASSWORD_HASH и передеплоить. Для человека, который не заходит в
-- панель хостинга, это означало «сменить нельзя».
--
-- Теперь хеш живёт здесь, рядом с паролями мастеров, и меняется из настроек.
-- Переменная окружения остаётся запасным входом: пока пароль не сменили
-- ни разу, работает она.

alter table app_settings
  add column admin_password_hash    text,
  add column admin_password_version integer not null default 1;

comment on column app_settings.admin_password_hash is
  'Пароль администратора (scrypt). Пусто — вход по ADMIN_PASSWORD_HASH из окружения';
comment on column app_settings.admin_password_version is
  'Растёт при смене пароля: входы на старом пароле сразу становятся недействительны';

notify pgrst, 'reload schema';
