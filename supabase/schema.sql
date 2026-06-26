create extension if not exists "pgcrypto";

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  description text not null default '',
  due_date date,
  label text not null default 'Product',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists boards_user_id_idx on public.boards(user_id);
create index if not exists lists_board_id_position_idx on public.lists(board_id, position);
create index if not exists cards_list_id_position_idx on public.cards(list_id, position);

alter table public.boards enable row level security;
alter table public.lists enable row level security;
alter table public.cards enable row level security;

drop policy if exists "Users can manage own boards" on public.boards;
create policy "Users can manage own boards"
on public.boards
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage lists through own boards" on public.lists;
create policy "Users can manage lists through own boards"
on public.lists
for all
using (
  exists (
    select 1
    from public.boards
    where boards.id = lists.board_id
      and boards.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.boards
    where boards.id = lists.board_id
      and boards.user_id = auth.uid()
  )
);

drop policy if exists "Users can manage cards through own boards" on public.cards;
create policy "Users can manage cards through own boards"
on public.cards
for all
using (
  exists (
    select 1
    from public.lists
    join public.boards on boards.id = lists.board_id
    where lists.id = cards.list_id
      and boards.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.lists
    join public.boards on boards.id = lists.board_id
    where lists.id = cards.list_id
      and boards.user_id = auth.uid()
  )
);
