# CRM «Честный сервис» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CRM для сервиса ремонта бытовой техники: мастер тремя нажатиями ведёт заказ, источник обращения пишется сам, директор видит выручку и конверсию по каналам.

**Architecture:** Next.js App Router на Vercel. Собственная авторизация по общему паролю (без Supabase Auth): сервер проверяет пароль, ставит подписанную httpOnly-куку, `proxy.ts` пускает по ролям. Браузер к Supabase не обращается никогда — только сервер сервисным ключом, поэтому вся авторизация живёт в одном месте. Данные персональные и всегда свежие, поэтому кеширование страниц не включаем; скорость берём серверным рендером, малым бандлом и оптимистичными обновлениями.

**Поставка:** исходный архив. Vercel, Supabase и git заказчик поднимает сам.

**Tech Stack:** Next.js 16.2.9, React 19.2.4, TypeScript 5, Tailwind CSS v4, Supabase (Postgres), `jose` (JWT), `recharts`, `lucide-react`, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-06-chestny-crm-design.md`

## Global Constraints

Требования ниже действуют для каждой задачи и не повторяются в них.

- Next.js `16.2.9`, React `19.2.4`, TypeScript `5`, Tailwind `v4` через `@tailwindcss/postcss`.
- **Файл перехвата запросов называется `proxy.ts`** и лежит в корне проекта. Экспортируемая функция называется `proxy`. `middleware.ts` в Next 16 объявлен устаревшим. Runtime только `nodejs`, настроить его нельзя.
- **`cookies()`, `headers()`, `params`, `searchParams` асинхронные.** Синхронный доступ в Next 16 полностью удалён — всегда `await`.
- Cache Components и `unstable_instant` **не включаем**: все данные персональные и должны быть свежими.
- Браузер никогда не обращается к Supabase напрямую. Только сервер, только сервисным ключом.
- Хеширование паролей — `scrypt` из встроенного модуля `node:crypto`. Спека называла Argon2id; заменено осознанно, чтобы не тащить нативную зависимость на Vercel. Стойкость KDF сохранена.
- Ограничение частоты считаем по таблицам в Postgres, без Redis и сторонних сервисов.
- Валюта — тенге, целое число, без копеек. Формат вывода: `3 500 ₸` (неразрывный пробел).
- Язык интерфейса — русский. Тексты пишем человеческим языком, без «Произошла ошибка №2».
- Коммит после каждой задачи. Сообщения на русском, повелительного наклонения не требуется.
- Тесты запускаются `npm test`. Задача не считается выполненной, пока тесты не зелёные.

---

## Структура файлов

```
chestny-crm/
├── proxy.ts                        маршрутизация по ролям до рендера
├── next.config.ts
├── postcss.config.mjs
├── vitest.config.ts
├── playwright.config.ts
├── supabase/migrations/
│   ├── 0001_schema.sql             таблицы, индексы, триггер истории
│   ├── 0002_rls.sql                запрет всего для анонимного ключа
│   └── 0003_analytics.sql          функция агрегатов
├── src/
│   ├── app/
│   │   ├── layout.tsx              html, шрифт, тема
│   │   ├── globals.css             токены Tailwind v4
│   │   ├── login/                  экран ввода пароля
│   │   ├── who/                    выбор имени мастера
│   │   ├── (master)/my/            экран мастера
│   │   ├── (admin)/orders/         заявки
│   │   ├── (admin)/leads/          необработанные обращения
│   │   ├── (admin)/masters/        мастера и смена пароля
│   │   ├── (admin)/analytics/      цифры для директора
│   │   └── api/track/route.ts      приём кликов с сайта
│   ├── lib/
│   │   ├── status.ts               машина этапов (чистая логика)
│   │   ├── source.ts               определение источника (чистая логика)
│   │   ├── format.ts               деньги, телефон, время
│   │   ├── session.ts              выпуск и проверка куки
│   │   ├── passwords.ts            scrypt
│   │   ├── supabase.ts             серверный клиент
│   │   ├── telegram.ts             уведомления
│   │   └── db/                     запросы: orders, leads, profiles, analytics
│   ├── components/ui/              Button, Card, Field, StatusPill, EmptyState
│   └── types/db.ts                 типы, сгенерированные из схемы
└── tests/
```

Разделение по ответственности, а не по слою: запросы к заявкам лежат рядом с заявками, чистая логика этапов отделена от React и тестируется без браузера.

---

### Task 1: Каркас, дизайн-токены, тестовый стенд

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.gitignore`, `.env.example`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Create: `src/lib/format.ts`, `vitest.config.ts`
- Test: `tests/format.test.ts`

**Interfaces:**
- Consumes: ничего, это первая задача.
- Produces: `formatTenge(n: number): string`, `formatPhone(raw: string): string`, `cn(...classes: (string | false | null | undefined)[]): string` из `src/lib/format.ts`. Дизайн-токены как CSS-переменные в `globals.css`.

- [ ] **Step 1: Создать package.json**

```json
{
  "name": "chestny-crm",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.108.2",
    "jose": "^6.0.11",
    "lucide-react": "^1.21.0",
    "next": "16.2.9",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "recharts": "^3.8.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.9",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^3"
  }
}
```

- [ ] **Step 2: Написать падающий тест на форматирование**

`tests/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatTenge, formatPhone, cn } from "@/lib/format";

describe("formatTenge", () => {
  it("разделяет тысячи неразрывным пробелом", () => {
    expect(formatTenge(3500)).toBe("3\u00a0500\u00a0₸");
  });
  it("не показывает копейки", () => {
    expect(formatTenge(12000)).toBe("12\u00a0000\u00a0₸");
  });
  it("ноль остаётся нулём, а не прочерком", () => {
    expect(formatTenge(0)).toBe("0\u00a0₸");
  });
});

describe("formatPhone", () => {
  it("приводит казахстанский номер к читаемому виду", () => {
    expect(formatPhone("77080246236")).toBe("+7 708 024 62 36");
  });
  it("терпит уже отформатированный ввод", () => {
    expect(formatPhone("+7 708 024 62 36")).toBe("+7 708 024 62 36");
  });
  it("возвращает как есть, если это не 11 цифр", () => {
    expect(formatPhone("12345")).toBe("12345");
  });
});

describe("cn", () => {
  it("склеивает и отбрасывает пустое", () => {
    expect(cn("a", false, null, "b")).toBe("a b");
  });
});
```

- [ ] **Step 3: Запустить тест и убедиться, что он падает**

Run: `npm test`
Expected: FAIL — `Cannot find module '@/lib/format'`

- [ ] **Step 4: Реализовать `src/lib/format.ts`**

```ts
const NBSP = "\u00a0";

export function formatTenge(amount: number): string {
  const whole = Math.round(amount);
  const grouped = String(Math.abs(whole)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${whole < 0 ? "−" : ""}${grouped}${NBSP}₸`;
}

export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 11) return raw;
  const d = digits.replace(/^8/, "7");
  return `+${d[0]} ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
```

- [ ] **Step 5: Создать конфиги**

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
```

`postcss.config.mjs`:

```js
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

`next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: { optimizePackageImports: ["lucide-react", "recharts"] },
};

export default nextConfig;
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`.env.example`:

```
NEXT_PUBLIC_SITE_URL=https://crm.chestny-service.kz
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=
ADMIN_PASSWORD_HASH=
MASTER_PASSWORD_HASH=
IP_HASH_SALT=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TRACK_ALLOWED_ORIGIN=https://chestny-service.kz
```

- [ ] **Step 6: Создать дизайн-токены `src/app/globals.css`**

Палитра строится от фирменного синего сайта `#1550E4`. Светлая тема — основная, тёмная включается системной настройкой.

```css
@import "tailwindcss";

:root {
  --bg: #f6f7fb;
  --surface: #ffffff;
  --surface-2: #f0f2f7;
  --border: #e2e6ef;
  --text: #0f1b2d;
  --muted: #5d6878;
  --primary: #1550e4;
  --primary-ink: #ffffff;
  --success: #0f9d58;
  --warning: #c4410a;
  --danger: #d93025;
  --radius: 14px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0b111d;
    --surface: #131b2b;
    --surface-2: #1a2436;
    --border: #26314a;
    --text: #e8edf7;
    --muted: #93a0b8;
    --primary: #5b8cff;
    --primary-ink: #06152f;
  }
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface2: var(--surface-2);
  --color-border: var(--border);
  --color-text: var(--text);
  --color-muted: var(--muted);
  --color-primary: var(--primary);
  --color-primaryink: var(--primary-ink);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-danger: var(--danger);
  --radius-card: var(--radius);
}

html { -webkit-text-size-adjust: 100%; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
```

- [ ] **Step 7: Создать `src/app/layout.tsx` и заглушку `src/app/page.tsx`**

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM · Честный сервис",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
```

- [ ] **Step 8: Установить зависимости и убедиться, что тесты зелёные**

Run: `npm install && npm test`
Expected: PASS, 7 тестов

- [ ] **Step 9: Убедиться, что проект собирается**

Run: `npm run build`
Expected: сборка без ошибок

- [ ] **Step 10: Коммит**

```bash
git add -A
git commit -m "Каркас проекта, дизайн-токены и тестовый стенд"
```

---

### Task 2: Схема базы и запрет анонимного доступа

**Files:**
- Create: `supabase/migrations/0001_schema.sql`, `supabase/migrations/0002_rls.sql`
- Create: `src/types/db.ts`
- Test: проверка миграции на локальной базе (шаг 4)

**Interfaces:**
- Consumes: ничего.
- Produces: таблицы `profiles`, `leads`, `orders`, `order_events`, `app_settings`; представление `client_stats`; типы `Profile`, `Lead`, `Order`, `OrderEvent` из `@/types/db`.

- [ ] **Step 1: Написать `supabase/migrations/0001_schema.sql`**

```sql
create type user_role as enum ('admin', 'master');
create type order_status as enum
  ('new', 'assigned', 'on_the_way', 'in_progress', 'done', 'canceled');
create type lead_channel as enum ('whatsapp', 'phone');
create type lead_source as enum ('google_ads', '2gis', 'organic', 'referral', 'direct');
create type appliance_kind as enum
  ('washer', 'dishwasher', 'dryer', 'fridge', 'oven', 'hood', 'industrial', 'other');

create table profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  role user_role not null default 'master',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  channel lead_channel not null,
  source lead_source not null default 'direct',
  utm_source text, utm_medium text, utm_campaign text,
  utm_term text, utm_content text,
  gclid text,
  page_anchor text,
  referrer text,
  user_agent text,
  ip_hash text,
  order_id uuid
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  number integer generated always as identity,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_name text,
  client_phone text not null,
  address text,
  appliance appliance_kind not null default 'other',
  problem text,
  status order_status not null default 'new',
  master_id uuid references profiles(id) on delete set null,
  scheduled_at timestamptz,
  total_amount integer,
  source lead_source not null default 'direct',
  lead_id uuid references leads(id) on delete set null,
  cancel_reason text,
  created_by uuid references profiles(id) on delete set null
);

alter table leads add constraint leads_order_fk
  foreign key (order_id) references orders(id) on delete set null;

create table order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status order_status not null,
  actor_id uuid references profiles(id) on delete set null,
  actor_role user_role,
  note text,
  created_at timestamptz not null default now()
);

create table app_settings (
  id boolean primary key default true check (id),
  master_password_version integer not null default 1,
  updated_at timestamptz not null default now()
);
insert into app_settings (id) values (true);

create table auth_attempts (
  id bigserial primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index orders_status_created_idx on orders (status, created_at desc);
create index orders_master_status_idx on orders (master_id, status);
create index orders_phone_idx on orders (client_phone);
create index leads_created_idx on leads (created_at desc);
create index leads_order_idx on leads (order_id);
create index leads_iphash_created_idx on leads (ip_hash, created_at desc);
create index order_events_order_idx on order_events (order_id, created_at);
create index auth_attempts_idx on auth_attempts (ip_hash, created_at desc);

-- история этапов пишется триггером, а не приложением: так её нельзя потерять
create or replace function log_order_status() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    insert into order_events (order_id, from_status, to_status, to_status)
    values (new.id, null, new.status, new.status);
    return new;
  end if;
  if new.status is distinct from old.status then
    insert into order_events (order_id, from_status, to_status)
    values (new.id, old.status, new.status);
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger orders_status_history
  after insert on orders
  for each row execute function log_order_status();

create trigger orders_status_history_upd
  before update on orders
  for each row execute function log_order_status();

create view client_stats as
select client_phone,
       count(*) as orders_count,
       coalesce(sum(total_amount) filter (where status = 'done'), 0) as revenue,
       max(created_at) as last_order_at
from orders
group by client_phone;
```

- [ ] **Step 2: Исправить ошибку в триггере, обнаруженную при чтении**

Во вставке колонка `to_status` указана дважды. Заменить тело `if tg_op = 'INSERT'` на:

```sql
    insert into order_events (order_id, from_status, to_status)
    values (new.id, null, new.status);
```

- [ ] **Step 3: Написать `supabase/migrations/0002_rls.sql`**

Политик не создаём вовсе: при включённом RLS и отсутствии политик анонимный и публичный ключи не видят ничего. Сервисный ключ RLS обходит по определению.

```sql
alter table profiles enable row level security;
alter table leads enable row level security;
alter table orders enable row level security;
alter table order_events enable row level security;
alter table app_settings enable row level security;
alter table auth_attempts enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
```

- [ ] **Step 4: Применить миграции и проверить запрет анонимного доступа**

```bash
supabase start
supabase db reset
```

Затем проверить, что анонимный ключ ничего не отдаёт:

```bash
curl -s "$SUPABASE_URL/rest/v1/orders?select=id" -H "apikey: $ANON_KEY" | head -c 200
```

Expected: пустой массив `[]` либо ошибка доступа — но не строки таблицы.

- [ ] **Step 5: Сгенерировать типы**

```bash
supabase gen types typescript --local > src/types/db.ts
```

- [ ] **Step 6: Коммит**

```bash
git add -A
git commit -m "Схема базы, индексы, история этапов триггером, запрет анонимного доступа"
```

---

### Task 3: Машина этапов

Чистая логика без React и без базы — самая дешёвая в тестировании и самая дорогая в ошибках.

**Files:**
- Create: `src/lib/status.ts`
- Test: `tests/status.test.ts`

**Interfaces:**
- Consumes: ничего.
- Produces:
  - `type Status = 'new'|'assigned'|'on_the_way'|'in_progress'|'done'|'canceled'`
  - `canTransition(from: Status, to: Status): boolean`
  - `nextForMaster(from: Status): Status | null`
  - `masterButtonLabel(from: Status): string | null`
  - `STATUS_LABEL: Record<Status, string>`
  - `ACTIVE_STATUSES: Status[]`

- [ ] **Step 1: Написать падающий тест**

`tests/status.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  canTransition,
  nextForMaster,
  masterButtonLabel,
  STATUS_LABEL,
  ACTIVE_STATUSES,
} from "@/lib/status";

describe("canTransition", () => {
  it("ведёт заявку по прямой цепочке", () => {
    expect(canTransition("new", "assigned")).toBe(true);
    expect(canTransition("assigned", "on_the_way")).toBe(true);
    expect(canTransition("on_the_way", "in_progress")).toBe(true);
    expect(canTransition("in_progress", "done")).toBe(true);
  });
  it("не даёт перепрыгнуть через этап", () => {
    expect(canTransition("new", "done")).toBe(false);
    expect(canTransition("assigned", "in_progress")).toBe(false);
  });
  it("не даёт откатить назад", () => {
    expect(canTransition("done", "in_progress")).toBe(false);
    expect(canTransition("on_the_way", "assigned")).toBe(false);
  });
  it("разрешает отмену с любого рабочего этапа", () => {
    expect(canTransition("new", "canceled")).toBe(true);
    expect(canTransition("in_progress", "canceled")).toBe(true);
  });
  it("из завершённых состояний выхода нет", () => {
    expect(canTransition("done", "canceled")).toBe(false);
    expect(canTransition("canceled", "new")).toBe(false);
  });
});

describe("nextForMaster", () => {
  it("даёт мастеру ровно три шага", () => {
    expect(nextForMaster("assigned")).toBe("on_the_way");
    expect(nextForMaster("on_the_way")).toBe("in_progress");
    expect(nextForMaster("in_progress")).toBe("done");
  });
  it("на нераспределённой и завершённой заявке кнопки нет", () => {
    expect(nextForMaster("new")).toBeNull();
    expect(nextForMaster("done")).toBeNull();
    expect(nextForMaster("canceled")).toBeNull();
  });
});

describe("masterButtonLabel", () => {
  it("подписывает кнопку понятным мастеру словом", () => {
    expect(masterButtonLabel("assigned")).toBe("Выехал");
    expect(masterButtonLabel("on_the_way")).toBe("На месте");
    expect(masterButtonLabel("in_progress")).toBe("Готово");
    expect(masterButtonLabel("done")).toBeNull();
  });
});

describe("справочники", () => {
  it("у каждого этапа есть русская подпись", () => {
    expect(STATUS_LABEL.on_the_way).toBe("В пути");
    expect(Object.keys(STATUS_LABEL)).toHaveLength(6);
  });
  it("активными считаются четыре этапа", () => {
    expect(ACTIVE_STATUSES).toEqual(["new", "assigned", "on_the_way", "in_progress"]);
  });
});
```

- [ ] **Step 2: Запустить и убедиться, что падает**

Run: `npm test -- status`
Expected: FAIL — `Cannot find module '@/lib/status'`

- [ ] **Step 3: Реализовать `src/lib/status.ts`**

```ts
export const STATUSES = [
  "new", "assigned", "on_the_way", "in_progress", "done", "canceled",
] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  new: "Новая",
  assigned: "Назначена",
  on_the_way: "В пути",
  in_progress: "В работе",
  done: "Выполнена",
  canceled: "Отменена",
};

export const ACTIVE_STATUSES: Status[] = ["new", "assigned", "on_the_way", "in_progress"];

const FORWARD: Record<Status, Status | null> = {
  new: "assigned",
  assigned: "on_the_way",
  on_the_way: "in_progress",
  in_progress: "done",
  done: null,
  canceled: null,
};

const CANCELABLE: Status[] = ["new", "assigned", "on_the_way", "in_progress"];

export function canTransition(from: Status, to: Status): boolean {
  if (to === "canceled") return CANCELABLE.includes(from);
  return FORWARD[from] === to;
}

const MASTER_STEPS: Partial<Record<Status, { next: Status; label: string }>> = {
  assigned: { next: "on_the_way", label: "Выехал" },
  on_the_way: { next: "in_progress", label: "На месте" },
  in_progress: { next: "done", label: "Готово" },
};

export function nextForMaster(from: Status): Status | null {
  return MASTER_STEPS[from]?.next ?? null;
}

export function masterButtonLabel(from: Status): string | null {
  return MASTER_STEPS[from]?.label ?? null;
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npm test -- status`
Expected: PASS, 9 тестов

- [ ] **Step 5: Коммит**

```bash
git add src/lib/status.ts tests/status.test.ts
git commit -m "Машина этапов заявки с тестами"
```

---

### Task 4: Определение источника обращения

**Files:**
- Create: `src/lib/source.ts`
- Test: `tests/source.test.ts`

**Interfaces:**
- Consumes: ничего.
- Produces: `type Source = 'google_ads'|'2gis'|'organic'|'referral'|'direct'`, `detectSource(input: SourceInput): Source`, где `SourceInput = { gclid?: string | null; utmSource?: string | null; utmMedium?: string | null; referrer?: string | null }`.

- [ ] **Step 1: Написать падающий тест**

`tests/source.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectSource } from "@/lib/source";

describe("detectSource", () => {
  it("gclid всегда означает Google Ads", () => {
    expect(detectSource({ gclid: "Cj0KCQ", referrer: "https://www.google.com/" }))
      .toBe("google_ads");
  });
  it("метка cpc от google тоже означает рекламу", () => {
    expect(detectSource({ utmSource: "google", utmMedium: "cpc" })).toBe("google_ads");
  });
  it("2ГИС узнаётся по переходу", () => {
    expect(detectSource({ referrer: "https://2gis.kz/astana/firm/70000001113800596" }))
      .toBe("2gis");
  });
  it("2ГИС узнаётся и по метке", () => {
    expect(detectSource({ utmSource: "2gis" })).toBe("2gis");
  });
  it("поиск без gclid — это органика", () => {
    expect(detectSource({ referrer: "https://www.google.com/search?q=ремонт" }))
      .toBe("organic");
    expect(detectSource({ referrer: "https://yandex.kz/search/" })).toBe("organic");
  });
  it("любой другой сайт — переход", () => {
    expect(detectSource({ referrer: "https://instagram.com/chestny.service" }))
      .toBe("referral");
  });
  it("без реферера и меток — прямой заход", () => {
    expect(detectSource({})).toBe("direct");
    expect(detectSource({ referrer: "" })).toBe("direct");
  });
  it("переход с самого сайта считается прямым", () => {
    expect(detectSource({ referrer: "https://chestny-service.kz/" })).toBe("direct");
  });
  it("не падает на мусоре в реферере", () => {
    expect(detectSource({ referrer: "не-ссылка" })).toBe("direct");
  });
});
```

- [ ] **Step 2: Запустить и убедиться, что падает**

Run: `npm test -- source`
Expected: FAIL

- [ ] **Step 3: Реализовать `src/lib/source.ts`**

```ts
export const SOURCES = ["google_ads", "2gis", "organic", "referral", "direct"] as const;
export type Source = (typeof SOURCES)[number];

export type SourceInput = {
  gclid?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  referrer?: string | null;
};

const OWN_HOSTS = ["chestny-service.kz", "www.chestny-service.kz"];
const SEARCH_HOSTS = ["google.", "yandex.", "bing.", "duckduckgo.", "mail.ru"];

function hostOf(referrer: string): string | null {
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function detectSource(input: SourceInput): Source {
  const utmSource = (input.utmSource ?? "").toLowerCase();
  const utmMedium = (input.utmMedium ?? "").toLowerCase();

  if (input.gclid) return "google_ads";
  if (utmSource === "google" && ["cpc", "ppc", "paid"].includes(utmMedium)) return "google_ads";
  if (utmSource.includes("2gis")) return "2gis";

  const host = input.referrer ? hostOf(input.referrer) : null;
  if (!host) return "direct";
  if (OWN_HOSTS.includes(host)) return "direct";
  if (host.includes("2gis")) return "2gis";
  if (SEARCH_HOSTS.some((s) => host.includes(s))) return "organic";
  return "referral";
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npm test -- source`
Expected: PASS, 9 тестов

- [ ] **Step 5: Коммит**

```bash
git add src/lib/source.ts tests/source.test.ts
git commit -m "Определение источника обращения с тестами"
```

---

### Task 5: Пароли и сессия

**Files:**
- Create: `src/lib/passwords.ts`, `src/lib/session.ts`
- Create: `scripts/hash-password.mjs`
- Test: `tests/passwords.test.ts`, `tests/session.test.ts`

**Interfaces:**
- Consumes: ничего.
- Produces:
  - `hashPassword(plain: string): string` — строка вида `scrypt$<saltHex>$<hashHex>`
  - `verifyPassword(plain: string, stored: string): boolean`
  - `type SessionPayload = { role: 'admin' | 'master'; masterId?: string; pv: number }`
  - `signSession(payload: SessionPayload): Promise<string>`
  - `verifySession(token: string): Promise<SessionPayload | null>`
  - `SESSION_COOKIE = 'cs_session'`

- [ ] **Step 1: Написать падающий тест на пароли**

`tests/passwords.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/passwords";

describe("пароли", () => {
  it("проверяет верный пароль", () => {
    const stored = hashPassword("master-2026");
    expect(verifyPassword("master-2026", stored)).toBe(true);
  });
  it("отвергает неверный", () => {
    const stored = hashPassword("master-2026");
    expect(verifyPassword("master-2025", stored)).toBe(false);
  });
  it("каждый раз даёт новую соль", () => {
    expect(hashPassword("одинаковый")).not.toBe(hashPassword("одинаковый"));
  });
  it("не падает на мусоре вместо хеша", () => {
    expect(verifyPassword("любой", "испорчено")).toBe(false);
    expect(verifyPassword("любой", "")).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить и убедиться, что падает**

Run: `npm test -- passwords`
Expected: FAIL

- [ ] **Step 3: Реализовать `src/lib/passwords.ts`**

```ts
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;
const PARAMS = { N: 16384, r: 8, p: 1 };

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, KEYLEN, PARAMS);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  try {
    const salt = Buffer.from(parts[1], "hex");
    const expected = Buffer.from(parts[2], "hex");
    if (expected.length !== KEYLEN) return false;
    const actual = scryptSync(plain, salt, KEYLEN, PARAMS);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Написать падающий тест на сессию**

`tests/session.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.SESSION_SECRET = "тестовый-секрет-достаточной-длины-для-hs256";
});

describe("сессия", () => {
  it("подписывает и читает полезную нагрузку", async () => {
    const { signSession, verifySession } = await import("@/lib/session");
    const token = await signSession({ role: "master", masterId: "m-1", pv: 3 });
    const payload = await verifySession(token);
    expect(payload).toEqual({ role: "master", masterId: "m-1", pv: 3 });
  });
  it("отвергает подделанный токен", async () => {
    const { signSession, verifySession } = await import("@/lib/session");
    const token = await signSession({ role: "admin", pv: 1 });
    expect(await verifySession(token.slice(0, -3) + "abc")).toBeNull();
  });
  it("отвергает мусор", async () => {
    const { verifySession } = await import("@/lib/session");
    expect(await verifySession("не.токен.вовсе")).toBeNull();
    expect(await verifySession("")).toBeNull();
  });
});
```

- [ ] **Step 5: Запустить и убедиться, что падает**

Run: `npm test -- session`
Expected: FAIL

- [ ] **Step 6: Реализовать `src/lib/session.ts`**

```ts
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "cs_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

export type SessionPayload = {
  role: "admin" | "master";
  masterId?: string;
  pv: number;
};

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET не задан");
  return new TextEncoder().encode(value);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const role = payload.role;
    if (role !== "admin" && role !== "master") return null;
    return {
      role,
      masterId: typeof payload.masterId === "string" ? payload.masterId : undefined,
      pv: typeof payload.pv === "number" ? payload.pv : 0,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
```

- [ ] **Step 7: Создать `scripts/hash-password.mjs` для генерации хешей**

```js
import { randomBytes, scryptSync } from "node:crypto";

const plain = process.argv[2];
if (!plain) {
  console.error("Использование: node scripts/hash-password.mjs <пароль>");
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(plain, salt, 64, { N: 16384, r: 8, p: 1 });
console.log(`scrypt$${salt.toString("hex")}$${hash.toString("hex")}`);
```

- [ ] **Step 8: Убедиться, что все тесты зелёные**

Run: `npm test`
Expected: PASS

- [ ] **Step 9: Коммит**

```bash
git add -A
git commit -m "Пароли на scrypt и подписанная сессия с тестами"
```

---

### Task 6: Серверный клиент базы и запросы

**Files:**
- Create: `src/lib/supabase.ts`, `src/lib/db/profiles.ts`, `src/lib/db/orders.ts`, `src/lib/db/leads.ts`, `src/lib/db/settings.ts`
- Create: `src/lib/auth.ts`

**Interfaces:**
- Consumes: `Status`, `ACTIVE_STATUSES` из `@/lib/status`; `Source` из `@/lib/source`; `SessionPayload`, `SESSION_COOKIE` из `@/lib/session`.
- Produces:
  - `db()` — серверный клиент Supabase на сервисном ключе
  - `getSession(): Promise<SessionPayload | null>` — читает куку, сверяет `pv` с базой
  - `requireAdmin(): Promise<SessionPayload>` — редиректит на `/login`, если не админ
  - `requireMaster(): Promise<SessionPayload & { masterId: string }>`
  - `listMasters(): Promise<Profile[]>`, `createMaster(input)`, `setMasterActive(id, active)`
  - `listOrdersForMaster(masterId)`, `listOrdersForAdmin(filter)`, `createOrder(input)`, `advanceOrderStatus(id, to, actor)`, `setOrderAmount(id, amount, actor)`
  - `listUnprocessedLeads()`, `attachLeadToOrder(leadId, orderId)`
  - `getPasswordVersion()`, `bumpPasswordVersion()`

- [ ] **Step 1: Создать `src/lib/supabase.ts`**

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

let client: SupabaseClient<Database> | undefined;

/** Серверный клиент на сервисном ключе. В браузер попадать не должен. */
export function db(): SupabaseClient<Database> {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY не заданы");
  client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
```

- [ ] **Step 2: Создать `src/lib/auth.ts`**

```ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "@/lib/session";
import { getPasswordVersion } from "@/lib/db/settings";

export async function getSession(): Promise<SessionPayload | null> {
  // В Next 16 cookies() асинхронный
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? "";
  const payload = await verifySession(token);
  if (!payload) return null;
  if (payload.role === "master") {
    const current = await getPasswordVersion();
    if (payload.pv !== current) return null; // пароль сменили — сессия недействительна
  }
  return payload;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");
  return session;
}

export async function requireMaster(): Promise<SessionPayload & { masterId: string }> {
  const session = await getSession();
  if (!session || session.role !== "master") redirect("/login");
  if (!session.masterId) redirect("/who");
  return { ...session, masterId: session.masterId };
}
```

- [ ] **Step 3: Создать `src/lib/db/settings.ts`**

```ts
import { db } from "@/lib/supabase";

export async function getPasswordVersion(): Promise<number> {
  const { data, error } = await db()
    .from("app_settings").select("master_password_version").eq("id", true).single();
  if (error) throw error;
  return data.master_password_version;
}

export async function bumpPasswordVersion(): Promise<number> {
  const current = await getPasswordVersion();
  const next = current + 1;
  const { error } = await db()
    .from("app_settings")
    .update({ master_password_version: next, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) throw error;
  return next;
}
```

- [ ] **Step 4: Создать `src/lib/db/profiles.ts`**

```ts
import { db } from "@/lib/supabase";

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: "admin" | "master";
  is_active: boolean;
};

export async function listMasters(onlyActive = true): Promise<Profile[]> {
  let q = db().from("profiles").select("id, full_name, phone, role, is_active")
    .eq("role", "master").order("full_name");
  if (onlyActive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data as Profile[];
}

export async function createMaster(input: { full_name: string; phone?: string }) {
  const { error } = await db().from("profiles")
    .insert({ full_name: input.full_name, phone: input.phone ?? null, role: "master" });
  if (error) throw error;
}

export async function setMasterActive(id: string, is_active: boolean) {
  const { error } = await db().from("profiles").update({ is_active }).eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 5: Создать `src/lib/db/orders.ts`**

```ts
import { db } from "@/lib/supabase";
import { ACTIVE_STATUSES, canTransition, type Status } from "@/lib/status";
import type { Source } from "@/lib/source";

export type Order = {
  id: string;
  number: number;
  created_at: string;
  client_name: string | null;
  client_phone: string;
  address: string | null;
  appliance: string;
  problem: string | null;
  status: Status;
  master_id: string | null;
  scheduled_at: string | null;
  total_amount: number | null;
  source: Source;
};

const COLUMNS =
  "id, number, created_at, client_name, client_phone, address, appliance, problem, status, master_id, scheduled_at, total_amount, source";

export async function listOrdersForMaster(masterId: string): Promise<Order[]> {
  const { data, error } = await db().from("orders").select(COLUMNS)
    .eq("master_id", masterId)
    .in("status", ACTIVE_STATUSES)
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(50);
  if (error) throw error;
  return data as Order[];
}

export async function listOrdersForAdmin(limit = 100): Promise<Order[]> {
  const { data, error } = await db().from("orders").select(COLUMNS)
    .order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data as Order[];
}

export async function getOrder(id: string): Promise<Order | null> {
  const { data, error } = await db().from("orders").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Order) ?? null;
}

export async function createOrder(input: {
  client_phone: string; client_name?: string; address?: string;
  appliance?: string; problem?: string; master_id?: string;
  scheduled_at?: string; source?: Source; lead_id?: string; created_by?: string;
}): Promise<string> {
  const { data, error } = await db().from("orders").insert({
    client_phone: input.client_phone,
    client_name: input.client_name ?? null,
    address: input.address ?? null,
    appliance: input.appliance ?? "other",
    problem: input.problem ?? null,
    master_id: input.master_id ?? null,
    scheduled_at: input.scheduled_at ?? null,
    source: input.source ?? "direct",
    lead_id: input.lead_id ?? null,
    created_by: input.created_by ?? null,
    status: input.master_id ? "assigned" : "new",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

/** Переводит заявку на следующий этап. Проверка перехода — здесь, а не в интерфейсе. */
export async function advanceOrderStatus(
  id: string, to: Status, actor: { id?: string; role: "admin" | "master" }
): Promise<void> {
  const order = await getOrder(id);
  if (!order) throw new Error("Заявка не найдена");
  if (actor.role === "master" && order.master_id !== actor.id) {
    throw new Error("Это чужая заявка");
  }
  if (!canTransition(order.status, to)) {
    throw new Error(`Нельзя перейти из «${order.status}» в «${to}»`);
  }
  const { error } = await db().from("orders").update({ status: to }).eq("id", id);
  if (error) throw error;
}

export async function setOrderAmount(
  id: string, amount: number, actor: { id?: string; role: "admin" | "master" }
): Promise<void> {
  if (!Number.isInteger(amount) || amount < 0) throw new Error("Сумма должна быть целым числом");
  const order = await getOrder(id);
  if (!order) throw new Error("Заявка не найдена");
  if (actor.role === "master" && order.master_id !== actor.id) {
    throw new Error("Это чужая заявка");
  }
  const { error } = await db().from("orders").update({ total_amount: amount }).eq("id", id);
  if (error) throw error;
}

export async function assignMaster(orderId: string, masterId: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) throw new Error("Заявка не найдена");
  const patch: Record<string, unknown> = { master_id: masterId };
  if (order.status === "new") patch.status = "assigned";
  const { error } = await db().from("orders").update(patch).eq("id", orderId);
  if (error) throw error;
}
```

- [ ] **Step 6: Создать `src/lib/db/leads.ts`**

```ts
import { db } from "@/lib/supabase";
import type { Source } from "@/lib/source";

export type Lead = {
  id: string;
  created_at: string;
  channel: "whatsapp" | "phone";
  source: Source;
  page_anchor: string | null;
  utm_campaign: string | null;
  order_id: string | null;
};

export async function insertLead(input: {
  channel: "whatsapp" | "phone"; source: Source;
  utm_source?: string | null; utm_medium?: string | null; utm_campaign?: string | null;
  utm_term?: string | null; utm_content?: string | null; gclid?: string | null;
  page_anchor?: string | null; referrer?: string | null;
  user_agent?: string | null; ip_hash?: string | null;
}): Promise<void> {
  const { error } = await db().from("leads").insert(input);
  if (error) throw error;
}

export async function listUnprocessedLeads(limit = 30): Promise<Lead[]> {
  const { data, error } = await db().from("leads")
    .select("id, created_at, channel, source, page_anchor, utm_campaign, order_id")
    .is("order_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Lead[];
}

export async function countRecentByIp(ipHash: string, seconds: number): Promise<number> {
  const since = new Date(Date.now() - seconds * 1000).toISOString();
  const { count, error } = await db().from("leads")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash).gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}

export async function attachLeadToOrder(leadId: string, orderId: string): Promise<void> {
  const { error } = await db().from("leads").update({ order_id: orderId }).eq("id", leadId);
  if (error) throw error;
}
```

- [ ] **Step 7: Проверить, что проект собирается**

Run: `npm run build`
Expected: сборка без ошибок типов

- [ ] **Step 8: Коммит**

```bash
git add -A
git commit -m "Серверный клиент базы, проверка сессии и запросы к данным"
```

---

### Task 7: Вход, выбор имени и маршрутизация по ролям

**Files:**
- Create: `proxy.ts`
- Create: `src/app/login/page.tsx`, `src/app/login/LoginForm.tsx`, `src/app/login/actions.ts`
- Create: `src/app/who/page.tsx`, `src/app/who/actions.ts`
- Create: `src/components/ui/Button.tsx`, `src/components/ui/Field.tsx`

**Interfaces:**
- Consumes: `hashPassword`/`verifyPassword`, `signSession`, `SESSION_COOKIE`, `SESSION_COOKIE_OPTIONS`, `getPasswordVersion`, `listMasters`.
- Produces: рабочий вход. После входа админ попадает на `/orders`, мастер — на `/who`, затем на `/my`.

- [ ] **Step 1: Создать `proxy.ts` в корне проекта**

Имя файла и имя функции — `proxy`, это требование Next 16.

```ts
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/api/track"];
const ADMIN_PREFIXES = ["/orders", "/leads", "/masters", "/analytics"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const session = await verifySession(token);

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (session.role === "master" && ADMIN_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/my";
    return NextResponse.redirect(url);
  }
  if (session.role === "admin" && pathname.startsWith("/my")) {
    const url = request.nextUrl.clone();
    url.pathname = "/orders";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

Сверка версии пароля здесь не делается сознательно: `proxy` не должен ходить в базу на каждый запрос. Версия проверяется в `getSession()` на странице.

- [ ] **Step 2: Создать базовые компоненты**

`src/components/ui/Button.tsx`:

```tsx
"use client";
import { cn } from "@/lib/format";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  size?: "md" | "lg";
};

export function Button({ variant = "primary", size = "md", className, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-card)] font-medium",
        "transition-transform active:scale-[.98] disabled:opacity-50 disabled:active:scale-100",
        size === "lg" ? "h-14 px-6 text-lg" : "h-11 px-4 text-base",
        variant === "primary" && "bg-primary text-primaryink",
        variant === "ghost" && "bg-surface2 text-text",
        variant === "danger" && "bg-danger text-white",
        className
      )}
    />
  );
}
```

`src/components/ui/Field.tsx`:

```tsx
import { cn } from "@/lib/format";

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label: string };

export function Field({ label, className, ...rest }: Props) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      <input
        {...rest}
        className={cn(
          "h-12 w-full rounded-[var(--radius-card)] border border-border bg-surface px-4",
          "text-text outline-none focus:border-primary",
          className
        )}
      />
    </label>
  );
}
```

- [ ] **Step 3: Создать серверное действие входа `src/app/login/actions.ts`**

```ts
"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { verifyPassword } from "@/lib/passwords";
import { signSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/session";
import { getPasswordVersion } from "@/lib/db/settings";
import { db } from "@/lib/supabase";

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 10;

async function ipHash(): Promise<string> {
  const h = await headers(); // в Next 16 headers() асинхронный
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256").update(ip + (process.env.IP_HASH_SALT ?? "")).digest("hex");
}

export async function login(_prev: { error?: string }, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const hash = await ipHash();
  const since = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();

  const { count } = await db().from("auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", hash).gte("created_at", since);
  if ((count ?? 0) >= MAX_ATTEMPTS) {
    return { error: "Слишком много попыток. Попробуйте через 15 минут." };
  }

  const adminHash = process.env.ADMIN_PASSWORD_HASH ?? "";
  const masterHash = process.env.MASTER_PASSWORD_HASH ?? "";
  const store = await cookies();

  if (verifyPassword(password, adminHash)) {
    const token = await signSession({ role: "admin", pv: 0 });
    store.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    redirect("/orders");
  }
  if (verifyPassword(password, masterHash)) {
    const pv = await getPasswordVersion();
    const token = await signSession({ role: "master", pv });
    store.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    redirect("/who");
  }

  await db().from("auth_attempts").insert({ ip_hash: hash });
  return { error: "Неверный пароль" };
}
```

- [ ] **Step 4: Создать экран входа**

`src/app/login/page.tsx`:

```tsx
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold">Честный сервис</h1>
        <p className="mb-8 text-muted">Введите пароль, чтобы войти</p>
        <LoginForm />
      </div>
    </main>
  );
}
```

`src/app/login/LoginForm.tsx`:

```tsx
"use client";
import { useActionState } from "react";
import { login } from "./actions";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: undefined });
  return (
    <form action={action} className="space-y-4">
      <Field label="Пароль" name="password" type="password" autoFocus required
             autoComplete="current-password" inputMode="text" />
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Проверяем…" : "Войти"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 5: Создать экран выбора имени `/who`**

`src/app/who/page.tsx`:

```tsx
import { listMasters } from "@/lib/db/profiles";
import { chooseMaster } from "./actions";

export default async function WhoPage() {
  const masters = await listMasters();
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-1 text-2xl font-semibold">Кто ты?</h1>
      <p className="mb-6 text-muted">Выбери своё имя. Телефон запомнит и больше не спросит.</p>
      <ul className="space-y-3">
        {masters.map((m) => (
          <li key={m.id}>
            <form action={chooseMaster}>
              <input type="hidden" name="masterId" value={m.id} />
              <button className="h-16 w-full rounded-[var(--radius-card)] border border-border
                                 bg-surface px-5 text-left text-lg font-medium active:scale-[.99]">
                {m.full_name}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

`src/app/who/actions.ts`:

```ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { signSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/session";

export async function chooseMaster(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "master") redirect("/login");
  const masterId = String(formData.get("masterId") ?? "");
  if (!masterId) redirect("/who");
  const token = await signSession({ role: "master", masterId, pv: session.pv });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  redirect("/my");
}
```

- [ ] **Step 6: Проверить вручную**

```bash
node scripts/hash-password.mjs admin-пароль   # в ADMIN_PASSWORD_HASH
node scripts/hash-password.mjs master-пароль  # в MASTER_PASSWORD_HASH
npm run dev
```

Проверить: неверный пароль показывает «Неверный пароль»; пароль админа ведёт на `/orders`; пароль мастера ведёт на `/who`, выбор имени — на `/my`; попытка открыть `/orders` мастером возвращает на `/my`.

- [ ] **Step 7: Коммит**

```bash
git add -A
git commit -m "Вход по паролю, выбор имени мастера, маршрутизация по ролям"
```

---

### Task 8: Экран мастера

Главный экран проекта. Всё остальное можно сделать чуть хуже, этот — нельзя.

**Files:**
- Create: `src/app/(master)/my/page.tsx`, `src/app/(master)/my/OrderCard.tsx`, `src/app/(master)/my/actions.ts`, `src/app/(master)/my/loading.tsx`
- Create: `src/components/ui/EmptyState.tsx`

**Interfaces:**
- Consumes: `requireMaster`, `listOrdersForMaster`, `advanceOrderStatus`, `setOrderAmount`, `nextForMaster`, `masterButtonLabel`, `formatPhone`, `formatTenge`.
- Produces: серверные действия `advance(orderId: string)` и `finish(orderId: string, amount: number)`.

- [ ] **Step 1: Создать серверные действия**

`src/app/(master)/my/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireMaster } from "@/lib/auth";
import { advanceOrderStatus, setOrderAmount, getOrder } from "@/lib/db/orders";
import { nextForMaster } from "@/lib/status";

export async function advance(orderId: string) {
  const session = await requireMaster();
  const order = await getOrder(orderId);
  if (!order) return { error: "Заявка не найдена" };
  const next = nextForMaster(order.status);
  if (!next) return { error: "По этой заявке больше нечего отмечать" };
  try {
    await advanceOrderStatus(orderId, next, { id: session.masterId, role: "master" });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось сохранить" };
  }
  revalidatePath("/my");
  return { ok: true };
}

export async function finish(orderId: string, amount: number) {
  const session = await requireMaster();
  try {
    await setOrderAmount(orderId, amount, { id: session.masterId, role: "master" });
    await advanceOrderStatus(orderId, "done", { id: session.masterId, role: "master" });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось сохранить" };
  }
  revalidatePath("/my");
  return { ok: true };
}
```

- [ ] **Step 2: Создать `src/components/ui/EmptyState.tsx`**

```tsx
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-border
                    bg-surface p-10 text-center">
      <p className="text-lg font-medium">{title}</p>
      {hint && <p className="mt-1 text-muted">{hint}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Создать карточку заявки с оптимистичным переходом**

`src/app/(master)/my/OrderCard.tsx`:

```tsx
"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatPhone } from "@/lib/format";
import { masterButtonLabel, nextForMaster, STATUS_LABEL, type Status } from "@/lib/status";
import { advance, finish } from "./actions";

type Order = {
  id: string; number: number; client_name: string | null; client_phone: string;
  address: string | null; problem: string | null; status: Status;
};

export function OrderCard({ order }: { order: Order }) {
  const [status, setStatus] = useOptimistic<Status>(order.status);
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const label = masterButtonLabel(status);
  const isFinishing = nextForMaster(status) === "done";

  function onAdvance() {
    setError(null);
    startTransition(async () => {
      const next = nextForMaster(status);
      if (next) setStatus(next);
      const res = await advance(order.id);
      if (res?.error) setError(res.error);
    });
  }

  function onFinish() {
    const value = Number(amount.replace(/\D/g, ""));
    if (!value) { setError("Впишите сумму"); return; }
    setError(null);
    startTransition(async () => {
      setStatus("done");
      const res = await finish(order.id, value);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <article className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold">
          {order.client_name || "Клиент"} <span className="text-muted">№{order.number}</span>
        </h2>
        <span className="shrink-0 text-sm text-muted">{STATUS_LABEL[status]}</span>
      </div>

      {order.address && <p className="mb-1">{order.address}</p>}
      {order.problem && <p className="mb-4 text-muted">{order.problem}</p>}

      <div className="mb-4 flex gap-2">
        <a href={`tel:${order.client_phone}`}
           className="inline-flex h-11 flex-1 items-center justify-center gap-2
                      rounded-[var(--radius-card)] bg-surface2 font-medium">
          <Phone size={18} /> {formatPhone(order.client_phone)}
        </a>
        {order.address && (
          <a target="_blank" rel="noopener"
             href={`https://2gis.kz/astana/search/${encodeURIComponent(order.address)}`}
             className="inline-flex h-11 w-11 items-center justify-center
                        rounded-[var(--radius-card)] bg-surface2"
             aria-label="Открыть адрес в 2ГИС">
            <MapPin size={18} />
          </a>
        )}
      </div>

      {isFinishing ? (
        <div className="space-y-3">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            placeholder="Сумма, ₸"
            className="h-14 w-full rounded-[var(--radius-card)] border border-border
                       bg-surface px-4 text-xl outline-none focus:border-primary"
          />
          <Button size="lg" className="w-full" onClick={onFinish} disabled={pending}>
            Готово
          </Button>
        </div>
      ) : label ? (
        <Button size="lg" className="w-full" onClick={onAdvance} disabled={pending}>
          {label}
        </Button>
      ) : null}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </article>
  );
}
```

- [ ] **Step 4: Создать страницу и скелетон**

`src/app/(master)/my/page.tsx`:

```tsx
import { requireMaster } from "@/lib/auth";
import { listOrdersForMaster } from "@/lib/db/orders";
import { OrderCard } from "./OrderCard";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function MyOrdersPage() {
  const session = await requireMaster();
  const orders = await listOrdersForMaster(session.masterId);

  return (
    <main className="mx-auto max-w-lg space-y-4 p-4 pb-16">
      <h1 className="px-1 pt-2 text-2xl font-semibold">Мои заявки</h1>
      {orders.length === 0 ? (
        <EmptyState title="Заявок пока нет" hint="Появится новая — она будет здесь." />
      ) : (
        orders.map((o) => <OrderCard key={o.id} order={o} />)
      )}
    </main>
  );
}
```

`src/app/(master)/my/loading.tsx`:

```tsx
export default function Loading() {
  return (
    <main className="mx-auto max-w-lg space-y-4 p-4">
      {[0, 1].map((i) => (
        <div key={i} className="h-48 animate-pulse rounded-[var(--radius-card)] bg-surface2" />
      ))}
    </main>
  );
}
```

- [ ] **Step 5: Проверить вручную на узком экране**

Открыть `/my` в мобильном виде браузера. Проверить: кнопка этапа не ниже 56 пикселей; нажатие меняет подпись мгновенно, до ответа сервера; на «Готово» появляется поле суммы с цифровой клавиатурой; при ошибке подпись возвращается назад и показывается текст.

- [ ] **Step 6: Коммит**

```bash
git add -A
git commit -m "Экран мастера: три нажатия на заказ и оптимистичные переходы"
```

---

### Task 9: Приём обращений с сайта

**Files:**
- Create: `src/app/api/track/route.ts`
- Test: `tests/track.test.ts`

**Interfaces:**
- Consumes: `detectSource`, `insertLead`, `countRecentByIp`.
- Produces: `POST /api/track`, принимает JSON-строку в теле, отвечает 204.

- [ ] **Step 1: Написать падающий тест на разбор тела**

Логику разбора выносим в чистую функцию, чтобы её можно было проверить без сервера.

`tests/track.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseTrackBody } from "@/app/api/track/parse";

describe("parseTrackBody", () => {
  it("принимает корректное обращение", () => {
    const r = parseTrackBody(JSON.stringify({ channel: "whatsapp", anchor: "#stiralnye" }));
    expect(r).toMatchObject({ channel: "whatsapp", page_anchor: "#stiralnye" });
  });
  it("отвергает неизвестный канал", () => {
    expect(parseTrackBody(JSON.stringify({ channel: "telegram" }))).toBeNull();
  });
  it("отвергает не-JSON", () => {
    expect(parseTrackBody("не json")).toBeNull();
  });
  it("обрезает слишком длинные строки", () => {
    const r = parseTrackBody(JSON.stringify({ channel: "phone", anchor: "x".repeat(500) }));
    expect(r?.page_anchor?.length).toBe(200);
  });
  it("игнорирует лишние поля", () => {
    const r = parseTrackBody(JSON.stringify({ channel: "phone", evil: "<script>" }));
    expect(r).not.toHaveProperty("evil");
  });
});
```

- [ ] **Step 2: Запустить и убедиться, что падает**

Run: `npm test -- track`
Expected: FAIL

- [ ] **Step 3: Реализовать `src/app/api/track/parse.ts`**

```ts
export type TrackInput = {
  channel: "whatsapp" | "phone";
  page_anchor: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  referrer: string | null;
};

function str(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export function parseTrackBody(raw: string): TrackInput | null {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  const channel = data.channel;
  if (channel !== "whatsapp" && channel !== "phone") return null;
  return {
    channel,
    page_anchor: str(data.anchor),
    utm_source: str(data.utm_source),
    utm_medium: str(data.utm_medium),
    utm_campaign: str(data.utm_campaign),
    utm_term: str(data.utm_term),
    utm_content: str(data.utm_content),
    gclid: str(data.gclid),
    referrer: str(data.referrer, 500),
  };
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npm test -- track`
Expected: PASS, 5 тестов

- [ ] **Step 5: Реализовать обработчик `src/app/api/track/route.ts`**

```ts
import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { parseTrackBody } from "./parse";
import { detectSource } from "@/lib/source";
import { insertLead, countRecentByIp } from "@/lib/db/leads";
import { notifyLead } from "@/lib/telegram";

const RATE_LIMIT_PER_MINUTE = 30;

function corsHeaders(origin: string | null) {
  const allowed = process.env.TRACK_ALLOWED_ORIGIN ?? "";
  const ok = origin === allowed;
  return ok ? { "Access-Control-Allow-Origin": allowed } : {};
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders(request.headers.get("origin")),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    },
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);
  // sendBeacon шлёт text/plain, поэтому preflight не нужен, но источник всё равно проверяем
  if (origin && origin !== (process.env.TRACK_ALLOWED_ORIGIN ?? "")) {
    return new NextResponse(null, { status: 204 });
  }

  const input = parseTrackBody(await request.text());
  if (!input) return new NextResponse(null, { status: 204, headers });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = createHash("sha256")
    .update(ip + (process.env.IP_HASH_SALT ?? "")).digest("hex");

  try {
    if (await countRecentByIp(ipHash, 60) >= RATE_LIMIT_PER_MINUTE) {
      return new NextResponse(null, { status: 204, headers });
    }
    const source = detectSource({
      gclid: input.gclid,
      utmSource: input.utm_source,
      utmMedium: input.utm_medium,
      referrer: input.referrer,
    });
    await insertLead({
      ...input,
      source,
      ip_hash: ipHash,
      user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    });
    await notifyLead({ channel: input.channel, source, anchor: input.page_anchor });
  } catch {
    // приём обращения не должен ломать переход пользователя
  }
  return new NextResponse(null, { status: 204, headers });
}
```

- [ ] **Step 6: Создать `src/lib/telegram.ts`**

```ts
type LeadNotice = { channel: "whatsapp" | "phone"; source: string; anchor: string | null };

const SOURCE_LABEL: Record<string, string> = {
  google_ads: "Google Ads",
  "2gis": "2ГИС",
  organic: "поиск",
  referral: "переход",
  direct: "прямой заход",
};

export async function notifyLead(lead: LeadNotice): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  const what = lead.channel === "whatsapp" ? "Клик по WhatsApp" : "Клик по телефону";
  const where = lead.anchor ? `, экран ${lead.anchor}` : "";
  const text = `${what} · ${SOURCE_LABEL[lead.source] ?? lead.source}${where}`;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch {
    // уведомление не критично
  }
}
```

- [ ] **Step 7: Проверить эндпоинт вручную**

```bash
curl -i -X POST http://localhost:3000/api/track \
  -H "Origin: https://chestny-service.kz" \
  -H "Content-Type: text/plain" \
  --data '{"channel":"whatsapp","anchor":"#stiralnye","gclid":"test123"}'
```

Expected: `204`. В таблице `leads` появилась строка с `source = google_ads`.

- [ ] **Step 8: Коммит**

```bash
git add -A
git commit -m "Приём обращений с сайта, определение источника, уведомление в Telegram"
```

---

### Task 10: Отправка обращений с сайта

Правка живого сайта `chestny-service.kz`. Файл лежит в соседнем проекте.

**Files:**
- Modify: `C:\Users\User\Desktop\chestniy-service\index.html` — блок обработчика кликов
- Modify: `C:\Users\User\Desktop\chestniy-service\chestny-service-upload.zip` — пересобрать

**Interfaces:**
- Consumes: `POST /api/track` из Task 9.
- Produces: обращения в базе CRM при каждом клике по WhatsApp и телефону.

- [ ] **Step 1: Найти обработчик в `index.html`**

Искать строку `function fireConv(sendTo,name,url)`. В неё уже входит запись в `dataLayer`.

- [ ] **Step 2: Добавить отправку в CRM внутрь `fireConv`**

Сразу после строки с `dataLayer.push` вставить:

```js
  try{
    var p=new URLSearchParams(location.search);
    navigator.sendBeacon('https://crm.chestny-service.kz/api/track', JSON.stringify({
      channel: name==='whatsapp_click'?'whatsapp':'phone',
      anchor: (document.querySelector('.screen:not(.covered)')||{}).id||null,
      utm_source:p.get('utm_source'), utm_medium:p.get('utm_medium'),
      utm_campaign:p.get('utm_campaign'), utm_term:p.get('utm_term'),
      utm_content:p.get('utm_content'), gclid:p.get('gclid'),
      referrer: document.referrer||null
    }));
  }catch(e){}
```

`sendBeacon` не задерживает переход: браузер отправляет запрос в фоне уже после ухода со страницы.

- [ ] **Step 3: Проверить локально**

Поднять сайт локально и убедиться, что клик по WhatsApp создаёт строку в `leads`, а переход происходит без задержки.

```bash
cd "C:\Users\User\Desktop\chestniy-service" && python -m http.server 8080
```

- [ ] **Step 4: Пересобрать архив для заливки**

```bash
cd "C:\Users\User\Desktop\chestniy-service"
python - <<'PY'
import zipfile, os
files = ['index.html','404.html','favicon.ico','robots.txt','sitemap.xml',
         'site.webmanifest','.htaccess']
files += ['assets/' + f for f in sorted(os.listdir('assets'))]
with zipfile.ZipFile('chestny-service-upload.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for f in files:
        z.write(f, f)
print('готово:', round(os.path.getsize('chestny-service-upload.zip')/1024,1), 'КБ')
PY
```

- [ ] **Step 5: Коммит в проекте CRM**

```bash
cd "C:\Users\User\Desktop\chestny-crm"
git commit --allow-empty -m "Сайт отправляет обращения в CRM (правка в проекте chestniy-service)"
```

---

### Task 11: Экран заявок и обращений для админа

**Files:**
- Create: `src/app/(admin)/layout.tsx`, `src/components/AdminNav.tsx`
- Create: `src/app/(admin)/orders/page.tsx`, `src/app/(admin)/orders/OrdersView.tsx`, `src/app/(admin)/orders/actions.ts`
- Create: `src/app/(admin)/leads/page.tsx`
- Create: `src/components/ui/StatusPill.tsx`

**Interfaces:**
- Consumes: `requireAdmin`, `listOrdersForAdmin`, `createOrder`, `assignMaster`, `listUnprocessedLeads`, `attachLeadToOrder`, `listMasters`, `STATUS_LABEL`.
- Produces: серверные действия `createOrderAction(formData)`, `assignAction(orderId, masterId)`, `fromLeadAction(leadId, formData)`.

- [ ] **Step 1: Создать `src/components/ui/StatusPill.tsx`**

Этап различается подписью и цветом одновременно — на солнце и при дальтонизме читается по тексту.

```tsx
import { STATUS_LABEL, type Status } from "@/lib/status";
import { cn } from "@/lib/format";

const TONE: Record<Status, string> = {
  new: "bg-surface2 text-text",
  assigned: "bg-primary/10 text-primary",
  on_the_way: "bg-warning/10 text-warning",
  in_progress: "bg-warning/15 text-warning",
  done: "bg-success/10 text-success",
  canceled: "bg-danger/10 text-danger",
};

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", TONE[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}
```

- [ ] **Step 2: Создать шапку админки**

`src/components/AdminNav.tsx`:

```tsx
import Link from "next/link";

const LINKS = [
  { href: "/orders", label: "Заявки" },
  { href: "/leads", label: "Обращения" },
  { href: "/masters", label: "Мастера" },
  { href: "/analytics", label: "Аналитика" },
];

export function AdminNav() {
  return (
    <nav className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl gap-1 px-4 py-3">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href}
                className="rounded-[var(--radius-card)] px-3 py-2 font-medium hover:bg-surface2">
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
```

`src/app/(admin)/layout.tsx`:

```tsx
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <AdminNav />
      <div className="mx-auto max-w-5xl p-4">{children}</div>
    </>
  );
}
```

- [ ] **Step 3: Создать серверные действия админа**

`src/app/(admin)/orders/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createOrder, assignMaster } from "@/lib/db/orders";
import { attachLeadToOrder } from "@/lib/db/leads";
import type { Source } from "@/lib/source";

export async function createOrderAction(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const phone = String(formData.get("client_phone") ?? "").trim();
  if (phone.replace(/\D/g, "").length < 10) {
    return { error: "Укажите телефон клиента" };
  }
  const leadId = String(formData.get("lead_id") ?? "") || undefined;
  const masterId = String(formData.get("master_id") ?? "") || undefined;
  const orderId = await createOrder({
    client_phone: phone,
    client_name: String(formData.get("client_name") ?? "") || undefined,
    address: String(formData.get("address") ?? "") || undefined,
    appliance: String(formData.get("appliance") ?? "other"),
    problem: String(formData.get("problem") ?? "") || undefined,
    master_id: masterId,
    source: (String(formData.get("source") ?? "direct") as Source),
    lead_id: leadId,
  });
  if (leadId) await attachLeadToOrder(leadId, orderId);
  revalidatePath("/orders");
  revalidatePath("/leads");
  return { ok: true };
}

export async function assignAction(orderId: string, masterId: string) {
  await requireAdmin();
  await assignMaster(orderId, masterId);
  revalidatePath("/orders");
  return { ok: true };
}
```

- [ ] **Step 4: Создать страницу заявок**

`src/app/(admin)/orders/page.tsx`:

```tsx
import { listOrdersForAdmin } from "@/lib/db/orders";
import { listMasters } from "@/lib/db/profiles";
import { listUnprocessedLeads } from "@/lib/db/leads";
import { OrdersView } from "./OrdersView";

export default async function OrdersPage() {
  const [orders, masters, leads] = await Promise.all([
    listOrdersForAdmin(),
    listMasters(),
    listUnprocessedLeads(5),
  ]);
  return <OrdersView orders={orders} masters={masters} leads={leads} />;
}
```

`src/app/(admin)/orders/OrdersView.tsx` — клиентский компонент: список заявок с группировкой по этапам, форма создания и выпадающий выбор мастера. Использует `StatusPill`, `formatPhone`, `formatTenge` и действия из шага 3. Обращения сверху показываются строкой вида «Клик по WhatsApp · Google Ads · 5 минут назад» с кнопкой «Создать заявку», которая подставляет `lead_id` и `source` в скрытые поля формы.

- [ ] **Step 5: Создать страницу обращений**

`src/app/(admin)/leads/page.tsx` — полный список необработанных обращений (до 30), та же строка и та же кнопка. Пустое состояние: «Обращений нет — значит, с сайта пока не кликали».

- [ ] **Step 6: Проверить вручную**

Кликнуть на сайте по WhatsApp, убедиться, что обращение появилось на `/leads`, нажать «Создать заявку», заполнить телефон, назначить мастера, увидеть заявку у мастера на `/my`.

- [ ] **Step 7: Коммит**

```bash
git add -A
git commit -m "Админка: заявки, необработанные обращения, назначение мастера"
```

---

### Task 12: Мастера и смена пароля

**Files:**
- Create: `src/app/(admin)/masters/page.tsx`, `src/app/(admin)/masters/MastersView.tsx`, `src/app/(admin)/masters/actions.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `listMasters`, `createMaster`, `setMasterActive`, `bumpPasswordVersion`, `hashPassword`.
- Produces: действия `addMaster(formData)`, `toggleMaster(id, active)`, `rotateMasterPassword(formData)`.

- [ ] **Step 1: Создать действия**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createMaster, setMasterActive } from "@/lib/db/profiles";
import { bumpPasswordVersion } from "@/lib/db/settings";
import { hashPassword } from "@/lib/passwords";

export async function addMaster(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("full_name") ?? "").trim();
  if (!name) return { error: "Впишите имя" };
  await createMaster({ full_name: name, phone: String(formData.get("phone") ?? "") || undefined });
  revalidatePath("/masters");
  return { ok: true };
}

export async function toggleMaster(id: string, is_active: boolean) {
  await requireAdmin();
  await setMasterActive(id, is_active);
  revalidatePath("/masters");
  return { ok: true };
}

/**
 * Хеш нового пароля показываем администратору: его нужно руками положить
 * в переменную MASTER_PASSWORD_HASH на Vercel. Версия поднимается сразу,
 * поэтому все мастера разлогиниваются немедленно.
 */
export async function rotateMasterPassword(_prev: unknown, formData: FormData) {
  await requireAdmin();
  const plain = String(formData.get("password") ?? "");
  if (plain.length < 6) return { error: "Пароль короче шести символов" };
  const hash = hashPassword(plain);
  const version = await bumpPasswordVersion();
  revalidatePath("/masters");
  return { ok: true, hash, version };
}
```

- [ ] **Step 2: Создать экран**

`src/app/(admin)/masters/page.tsx` загружает `listMasters(false)` и отдаёт в `MastersView`. Экран показывает: список мастеров с переключателем «активен», форму добавления и отдельный блок «Сменить пароль мастеров» с полем и предупреждением: «После смены все мастера выйдут и должны будут ввести новый пароль».

После смены на экране выводится готовая строка хеша с кнопкой «Скопировать» и подпись: «Положите это значение в переменную `MASTER_PASSWORD_HASH` на Vercel и сделайте передеплой».

- [ ] **Step 3: Проверить вручную**

Добавить мастера, увидеть его в `/who`. Отключить — убедиться, что он пропал из выбора. Сменить пароль — убедиться, что открытая сессия мастера возвращает на `/login`.

- [ ] **Step 4: Коммит**

```bash
git add -A
git commit -m "Управление мастерами и смена пароля с мгновенным разлогином"
```

---

### Task 13: Аналитика

**Files:**
- Create: `supabase/migrations/0003_analytics.sql`
- Create: `src/lib/db/analytics.ts`
- Create: `src/app/(admin)/analytics/page.tsx`, `src/app/(admin)/analytics/AnalyticsView.tsx`

**Interfaces:**
- Consumes: `requireAdmin`, `db`, `formatTenge`.
- Produces: `getAnalytics(from: string, to: string): Promise<Analytics>`, где

```ts
type Analytics = {
  leads: number; orders: number; done: number; canceled: number;
  revenue: number; avg_check: number;
  median_minutes_to_departure: number | null;
  by_source: { source: string; orders: number; revenue: number }[];
  by_master: { master: string; orders: number; revenue: number; avg_minutes: number | null }[];
};
```

- [ ] **Step 1: Написать SQL-функцию агрегатов**

Считаем в Postgres, а не перебором строк в приложении — это требование производительности из спеки.

```sql
create or replace function analytics_summary(p_from timestamptz, p_to timestamptz)
returns json language sql stable as $$
with o as (
  select * from orders where created_at >= p_from and created_at < p_to
),
departure as (
  select e.order_id,
         extract(epoch from (min(e.created_at) - o.created_at)) / 60 as minutes
  from order_events e join o on o.id = e.order_id
  where e.to_status = 'on_the_way'
  group by e.order_id, o.created_at
)
select json_build_object(
  'leads', (select count(*) from leads where created_at >= p_from and created_at < p_to),
  'orders', (select count(*) from o),
  'done', (select count(*) from o where status = 'done'),
  'canceled', (select count(*) from o where status = 'canceled'),
  'revenue', (select coalesce(sum(total_amount), 0) from o where status = 'done'),
  'avg_check', (select coalesce(round(avg(total_amount)), 0) from o where status = 'done'),
  'median_minutes_to_departure',
    (select round(percentile_cont(0.5) within group (order by minutes)::numeric, 1)
     from departure),
  'by_source', (
    select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
      select source,
             count(*) as orders,
             coalesce(sum(total_amount) filter (where status = 'done'), 0) as revenue
      from o group by source order by count(*) desc
    ) t),
  'by_master', (
    select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
      select coalesce(p.full_name, 'Не назначен') as master,
             count(*) as orders,
             coalesce(sum(o.total_amount) filter (where o.status = 'done'), 0) as revenue,
             round(avg(d.minutes)::numeric, 1) as avg_minutes
      from o left join profiles p on p.id = o.master_id
             left join departure d on d.order_id = o.id
      group by p.full_name order by count(*) desc
    ) t)
);
$$;
```

- [ ] **Step 2: Применить миграцию**

Run: `supabase db reset`
Expected: функция создана без ошибок

- [ ] **Step 3: Создать `src/lib/db/analytics.ts`**

```ts
import { db } from "@/lib/supabase";

export type Analytics = {
  leads: number; orders: number; done: number; canceled: number;
  revenue: number; avg_check: number;
  median_minutes_to_departure: number | null;
  by_source: { source: string; orders: number; revenue: number }[];
  by_master: { master: string; orders: number; revenue: number; avg_minutes: number | null }[];
};

export async function getAnalytics(from: string, to: string): Promise<Analytics> {
  const { data, error } = await db().rpc("analytics_summary", { p_from: from, p_to: to });
  if (error) throw error;
  return data as unknown as Analytics;
}
```

- [ ] **Step 4: Создать экран аналитики**

`src/app/(admin)/analytics/page.tsx` — серверный компонент. Период берётся из `searchParams`, который **в Next 16 является промисом**:

```tsx
import { getAnalytics } from "@/lib/db/analytics";
import { AnalyticsView } from "./AnalyticsView";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days } = await searchParams;
  const span = Number(days) || 30;
  const to = new Date();
  const from = new Date(to.getTime() - span * 24 * 60 * 60 * 1000);
  const data = await getAnalytics(from.toISOString(), to.toISOString());
  return <AnalyticsView data={data} days={span} />;
}
```

`AnalyticsView.tsx` показывает: пять плиток (обращений, заявок, выполнено, выручка, средний чек), конверсию обращение → заявка → выполнено, медиану времени до выезда с подписью «обещаем 60 минут», столбчатую диаграмму по источникам и таблицу по мастерам. Переключатель периода: 7, 30, 90 дней — ссылками `?days=7`, чтобы страница оставалась серверной.

- [ ] **Step 5: Проверить на реальных данных**

Создать несколько заявок в разных статусах и убедиться, что цифры сходятся вручную.

- [ ] **Step 6: Коммит**

```bash
git add -A
git commit -m "Аналитика: агрегаты в Postgres и экран для директора"
```

---

### Task 14: Сборка архива и проверка основного пути

Vercel, Supabase и git заказчик поднимает сам. С нашей стороны — рабочий исходник,
миграции, инструкция и зелёные тесты.

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/smoke.spec.ts`
- Create: `supabase/seed.sql`, `README.md`
- Create: `chestny-crm.zip`

**Interfaces:**
- Consumes: всё предыдущее.
- Produces: архив, готовый к `npm install` и деплою чужими руками.

- [ ] **Step 1: Поднять базу локально и применить миграции**

```bash
supabase start
supabase db reset
```

- [ ] **Step 2: Наполнить базу тестовыми данными**

`supabase/seed.sql` — один админ, три мастера, четыре заявки в разных этапах,
несколько обращений. Нужен, чтобы экраны можно было посмотреть сразу после установки.

- [ ] **Step 3: Написать smoke-тест**

`tests/e2e/smoke.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const MASTER_PASSWORD = process.env.E2E_MASTER_PASSWORD ?? "master-test";

test("мастер входит, видит заявки и отмечает выезд", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Пароль").fill(MASTER_PASSWORD);
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page.getByRole("heading", { name: "Кто ты?" })).toBeVisible();
  await page.getByRole("button").first().click();

  await expect(page.getByRole("heading", { name: "Мои заявки" })).toBeVisible();

  const advance = page.getByRole("button", { name: "Выехал" }).first();
  await advance.click();
  await expect(page.getByRole("button", { name: "На месте" }).first())
    .toBeVisible({ timeout: 2000 });
});
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
  use: { baseURL: "http://localhost:3000", ...devices["Pixel 5"] },
});
```

- [ ] **Step 4: Прогнать всё**

Run: `npm test && npm run build && npx playwright test`
Expected: юнит-тесты зелёные, сборка без ошибок, переход «Выехал» → «На месте»
укладывается в две секунды.

- [ ] **Step 5: Написать README**

Разделы: что это, как поднять локально, как завести Supabase и применить миграции,
как сгенерировать хеши паролей, полный список переменных окружения с пояснениями,
как выкатить на Vercel, как добавить мастера, как сменить пароль мастеров,
какой фрагмент вставить на сайт для захвата обращений.

- [ ] **Step 6: Собрать архив**

Без `node_modules`, `.next`, `.git` и локальных `.env`. Скрипт сборки —
`scripts/pack.mjs`, запускается `node scripts/pack.mjs`.

- [ ] **Step 7: Коммит**

```bash
git add -A
git commit -m "Тестовые данные, smoke-тест, README и сборка архива"
```

---

## Самопроверка плана

**Покрытие спеки.** Прошёл по разделам:

| Раздел спеки | Задача |
|---|---|
| 2. Пользователи и роли | 7 |
| 3. Вход без логина, версия пароля, ограничение попыток | 5, 7, 12 |
| 4.1 Экран мастера | 8 |
| 4.2 Заявки и обращения | 11 |
| 4.3 Аналитика | 13 |
| 4.4 Мастера | 12 |
| 5. Модель данных, индексы, триггер | 2 |
| 6. Захват обращений, CORS, ограничение частоты | 9, 10 |
| 7. Telegram | 9 |
| 8. Производительность | 1, 8, 13, 14 |
| 9. Визуальный уровень | 1, 8, 11 |
| 11. Проверка качества | 3, 4, 5, 9, 14 |

Пробелов не осталось.

**Отклонения от спеки, внесённые сознательно:**

- Argon2id заменён на `scrypt` из `node:crypto` — чтобы не тащить нативную зависимость на Vercel. Стойкость сохранена, зафиксировано в Global Constraints.
- Смена пароля мастеров поднимает версию в базе сразу, но новый хеш администратор кладёт в переменную окружения руками. Хранить хеш пароля в базе, к которой имеет доступ приложение, — худший вариант; ручной шаг здесь дешевле риска.

**Согласованность имён.** `Status`, `Source`, `Order`, `Profile`, `Lead`, `Analytics` определены по одному разу и используются под теми же именами. `advanceOrderStatus`, `setOrderAmount`, `assignMaster`, `detectSource`, `parseTrackBody`, `getAnalytics` названы одинаково в объявлении и во всех вызовах.

**Найдено и исправлено при вычитке:** в первой версии триггера `log_order_status` колонка `to_status` была указана в `insert` дважды — исправление вынесено отдельным шагом Task 2, чтобы исполнитель не воспроизвёл ошибку.
