-- ============================================================
-- Storage Bucket 配置（在 SQL Editor 中执行）
-- ============================================================

-- 创建文档上传 bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-docs',
  'product-docs',
  false,
  52428800,   -- 50 MB
  array['application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;

-- 创建生成视频 bucket（公开读取，方便预览）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-videos',
  'product-videos',
  true,
  524288000,  -- 500 MB
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do nothing;

-- Storage RLS：用户只能读写自己目录下的文件
-- 路径约定：{user_id}/{filename}

create policy "Users upload own docs"
  on storage.objects for insert
  with check (
    bucket_id = 'product-docs' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users read own docs"
  on storage.objects for select
  using (
    bucket_id = 'product-docs' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own docs"
  on storage.objects for delete
  using (
    bucket_id = 'product-docs' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Public read videos"
  on storage.objects for select
  using (bucket_id = 'product-videos');

create policy "Users upload own videos"
  on storage.objects for insert
  with check (
    bucket_id = 'product-videos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
