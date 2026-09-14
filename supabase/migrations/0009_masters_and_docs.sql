-- Личные пароли мастеров, их проценты и подписи; новая техника; сервисный центр.
--
-- Главное здесь — пароли. Раньше пароль был один на всех мастеров, и любой
-- мог зайти под чужим именем: в отчётах получалась каша. Теперь у каждого
-- свой пароль, а логина по-прежнему нет — система сама узнаёт, кто вошёл.

-- ── Мастера ──────────────────────────────────────────────────────────────────
alter table profiles
  add column password_hash    text,
  add column password_version integer not null default 1,
  add column share_percent    integer check (share_percent between 0 and 100),
  add column signature_image  text,
  add column updated_at       timestamptz not null default now();

comment on column profiles.password_hash is
  'Личный пароль мастера (scrypt). Пусто — войти не может';
comment on column profiles.password_version is
  'Растёт при смене пароля: старые сессии этого мастера сразу отваливаются';
comment on column profiles.share_percent is
  'Доля компании для этого мастера. Пусто — берётся общая из настроек';
comment on column profiles.signature_image is
  'Подпись мастера картинкой (data:image/...;base64) для печати в акте';

-- ── Новая техника ────────────────────────────────────────────────────────────
-- Значения добавляются по одному и становятся доступны после фиксации
-- миграции — в этом же файле их использовать нельзя.
alter type appliance_kind add value if not exists 'iron';
alter type appliance_kind add value if not exists 'vacuum';
alter type appliance_kind add value if not exists 'hair_dryer';
alter type appliance_kind add value if not exists 'microwave';
alter type appliance_kind add value if not exists 'ice_maker';

-- ── Приём техники в сервисный центр ──────────────────────────────────────────
-- Мелкую технику часто приносят в офис. Адрес выезда тогда не нужен.
alter table orders
  add column at_service_center boolean not null default false;

comment on column orders.at_service_center is
  'Технику принесли в сервисный центр: адрес клиента для выезда не нужен';

-- ── Налог и фирменный бланк ──────────────────────────────────────────────────
alter table app_settings
  add column tax_percent     numeric(5,2) not null default 3
    check (tax_percent >= 0 and tax_percent <= 100),
  add column logo_image      text,
  add column stamp_image     text,
  add column kaspi_qr_image  text;

comment on column app_settings.tax_percent is
  'Ставка налога с оборота, %. Упрощённая декларация в РК — 3%';
comment on column app_settings.logo_image is
  'Логотип для шапки документов (data:image/...;base64)';
comment on column app_settings.stamp_image is
  'Печать компании картинкой';
comment on column app_settings.kaspi_qr_image is
  'QR из Kaspi Business для оплаты переводом';

notify pgrst, 'reload schema';
