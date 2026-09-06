-- Тестовые данные, чтобы экраны можно было посмотреть сразу после установки.
-- На боевой базе выполнять не нужно.

insert into profiles (id, full_name, phone, role) values
  ('11111111-1111-1111-1111-111111111111', 'Диспетчер', '77080246236', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'Валихан',   '77011234567', 'master'),
  ('33333333-3333-3333-3333-333333333333', 'Ерлан',     '77017654321', 'master'),
  ('44444444-4444-4444-4444-444444444444', 'Азамат',    '77019998877', 'master');

insert into leads (channel, source, page_anchor, utm_campaign, created_at) values
  ('whatsapp', 'google_ads', '#stiralnye',      'Leads-Search-2', now() - interval '12 minutes'),
  ('phone',    '2gis',       null,               null,            now() - interval '3 hours'),
  ('whatsapp', 'organic',    '#posudomoechnye',  null,            now() - interval '1 day');

insert into orders
  (client_name, client_phone, address, appliance, problem, status, master_id, source, total_amount)
values
  ('Айгерим', '77012223344', 'ул. Кабанбай батыра, 53, кв. 12',
   'washer', 'Не отжимает, гудит при сливе', 'assigned',
   '22222222-2222-2222-2222-222222222222', 'google_ads', null),

  ('Дмитрий', '77015556677', 'пр. Мангилик Ел, 8, кв. 145',
   'dishwasher', 'Ошибка на табло, вода на дне', 'on_the_way',
   '33333333-3333-3333-3333-333333333333', '2gis', null),

  ('Мадина', '77018889900', 'ул. Сыганак, 29, кв. 78',
   'dryer', 'Не греет, бельё остаётся влажным', 'in_progress',
   '22222222-2222-2222-2222-222222222222', 'direct', null),

  ('Ерлан', '77014443322', 'ул. Достык, 5, кв. 34',
   'fridge', 'Не морозит нижняя камера', 'done',
   '44444444-4444-4444-4444-444444444444', 'google_ads', 18000),

  ('Шолпан', '77013334455', 'пр. Республики, 58/2',
   'washer', 'Замена подшипников', 'done',
   '33333333-3333-3333-3333-333333333333', 'organic', 24500);
