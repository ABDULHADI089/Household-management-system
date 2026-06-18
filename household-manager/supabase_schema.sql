-- ============================================================
-- Household Manager — Complete Supabase Schema
-- Run this in Supabase > SQL Editor > New Query
-- ============================================================

-- ─────────────────────────────────────────
-- MEMBERS  (custom auth — NOT supabase auth.users)
-- ─────────────────────────────────────────
create table if not exists members (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  email        text        not null unique,
  password     text        not null,          -- bcrypt hash
  role         text        not null default 'member' check (role in ('admin','member')),
  avatar_color text        not null default '#6366f1',
  created_at   timestamptz not null default now()
);

create index if not exists idx_members_email on members (email);

-- ─────────────────────────────────────────
-- TASKS
-- ─────────────────────────────────────────
create table if not exists tasks (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  description text        not null default '',
  assigned_to uuid        references members(id) on delete set null,
  due_date    date,
  status      text        not null default 'pending' check (status in ('pending','in-progress','done')),
  priority    text        not null default 'medium' check (priority in ('low','medium','high')),
  recurring   boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_tasks_assigned_to on tasks (assigned_to);
create index if not exists idx_tasks_status      on tasks (status);

-- ─────────────────────────────────────────
-- TASK LOGS  (member completion history)
-- ─────────────────────────────────────────
create table if not exists task_logs (
  id           uuid        primary key default gen_random_uuid(),
  task_id      uuid        not null references tasks(id) on delete cascade,
  member_id    uuid        not null references members(id) on delete cascade,
  completed_at timestamptz not null default now(),
  note         text        not null default ''
);

create index if not exists idx_task_logs_member_id    on task_logs (member_id);
create index if not exists idx_task_logs_task_id      on task_logs (task_id);
create index if not exists idx_task_logs_completed_at on task_logs (completed_at);

-- ─────────────────────────────────────────
-- EXPENSES  (income + expense entries)
-- ─────────────────────────────────────────
create table if not exists expenses (
  id             uuid        primary key default gen_random_uuid(),
  title          text        not null,
  amount         numeric(12,2) not null check (amount > 0),
  category       text        not null default 'other',
  type           text        not null default 'expense' check (type in ('expense','income')),
  date           date        not null,
  paid_by        uuid        references members(id) on delete set null,
  split_between  uuid[]      not null default '{}',
  created_at     timestamptz not null default now()
);

create index if not exists idx_expenses_date    on expenses (date);
create index if not exists idx_expenses_paid_by on expenses (paid_by);

-- ─────────────────────────────────────────
-- SHOPPING ITEMS
-- ─────────────────────────────────────────
create table if not exists shopping_items (
  id         uuid        primary key default gen_random_uuid(),
  item       text        not null,
  quantity   text        not null default '1',
  category   text        not null default 'other',
  added_by   uuid        references members(id) on delete set null,
  purchased  boolean     not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_shopping_items_purchased on shopping_items (purchased);

-- ─────────────────────────────────────────
-- EVENTS
-- ─────────────────────────────────────────
create table if not exists events (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  description text        not null default '',
  date        date        not null,
  time        text        not null default '',
  category    text        not null default 'general',
  assigned_to uuid        references members(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_events_date on events (date);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- Disable RLS on all tables so the backend
-- service-role key has full unrestricted access.
-- The backend enforces all auth logic itself.
-- ─────────────────────────────────────────
alter table members       disable row level security;
alter table tasks         disable row level security;
alter table task_logs     disable row level security;
alter table expenses      disable row level security;
alter table shopping_items disable row level security;
alter table events        disable row level security;

-- ─────────────────────────────────────────
-- VERIFY
-- After running you should see these tables
-- in Supabase > Table Editor:
--   members, tasks, task_logs, expenses,
--   shopping_items, events
-- ─────────────────────────────────────────
