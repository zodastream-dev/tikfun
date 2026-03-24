-- ============================================================
-- VideoGen Platform - Supabase 初始化 SQL
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================================

-- 1. 启用 UUID 扩展
create extension if not exists "uuid-ossp";

-- 2. 产品/视频任务表
create table if not exists public.products (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  name          text not null,
  description   text,
  source_type   text not null check (source_type in ('file', 'text')),
  file_name     text,
  file_size     bigint,
  file_path     text,           -- Supabase Storage 路径
  video_status  text not null default 'pending'
                  check (video_status in ('pending', 'processing', 'completed', 'error')),
  video_progress integer not null default 0 check (video_progress between 0 and 100),
  video_url     text,
  video_style   text not null default 'modern',
  video_ratio   text not null default '16:9',
  video_duration integer not null default 30,
  bg_music      boolean not null default true,
  voiceover     boolean not null default true,
  subtitles     boolean not null default true,
  error_msg     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 3. 自动更新 updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- 4. Row Level Security
alter table public.products enable row level security;

-- 用户只能读写自己的记录
create policy "Users can view own products"
  on public.products for select
  using (auth.uid() = user_id);

create policy "Users can insert own products"
  on public.products for insert
  with check (auth.uid() = user_id);

create policy "Users can update own products"
  on public.products for update
  using (auth.uid() = user_id);

create policy "Users can delete own products"
  on public.products for delete
  using (auth.uid() = user_id);

-- 5. 索引
create index if not exists products_user_id_idx on public.products(user_id);
create index if not exists products_status_idx  on public.products(video_status);
create index if not exists products_created_idx on public.products(created_at desc);
