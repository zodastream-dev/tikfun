# 部署说明 - VideoGen 产品视频生成平台

## 概览

- **项目路径**：`c:/Users/陆峻/WorkBuddy/20260324070827/app/`
- **目标域名**：`workbuddy.yookeer.com/video`
- **GitHub 仓库**：`zodastream-dev/workbuddy-site`
- **Supabase 项目**：`godogsxnkktxdrmnichb`

---

## 第一步：初始化 Supabase 数据库

1. 打开 [Supabase Dashboard](https://app.supabase.com/project/godogsxnkktxdrmnichb/sql/new)
2. 将 `app/supabase/schema.sql` 内容粘贴并执行（创建 products 表 + RLS）
3. 将 `app/supabase/storage.sql` 内容粘贴并执行（创建 Storage bucket）

---

## 第二步：配置 GitHub 仓库 Secrets

在 GitHub → `zodastream-dev/workbuddy-site` → **Settings → Secrets and variables → Actions** 添加：

| Secret 名称 | 值 |
|---|---|
| `VITE_SUPABASE_URL` | `https://godogsxnkktxdrmnichb.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（你的 anon key）` |

---

## 第三步：启用 GitHub Pages

在 GitHub → `zodastream-dev/workbuddy-site` → **Settings → Pages**：

1. **Source** 选择 `GitHub Actions`
2. **Custom domain** 填写 `workbuddy.yookeer.com`
3. 勾选 **Enforce HTTPS**

---

## 第四步：配置阿里云 DNS

登录阿里云 DNS 控制台，为 `yookeer.com` 添加解析记录：

| 记录类型 | 主机记录 | 记录值 |
|---|---|---|
| `CNAME` | `workbuddy` | `zodastream-dev.github.io` |

> ⚠️ DNS 生效需要 5～30 分钟

---

## 第五步：推送代码触发部署

```bash
# 进入项目目录
cd c:/Users/陆峻/WorkBuddy/20260324070827/app

# 初始化 git（如果还没有）
git init
git remote add origin https://github.com/zodastream-dev/workbuddy-site.git

# 提交并推送（触发 GitHub Actions 自动构建）
git add .
git commit -m "feat: VideoGen 产品视频生成平台"
git push -u origin main
```

Push 后约 1～2 分钟，GitHub Actions 自动构建并部署。

---

## Supabase Auth 配置

在 Supabase Dashboard → **Authentication → URL Configuration**：

- **Site URL**：`https://workbuddy.yookeer.com/video`
- **Redirect URLs** 添加：`https://workbuddy.yookeer.com/video/*`

---

## 访问地址

部署完成后访问：**https://workbuddy.yookeer.com/video/**
