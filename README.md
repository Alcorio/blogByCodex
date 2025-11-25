# PocketBase Blog（devtest）

基于 PocketBase + React/Vite 的轻量博客。包含文章、标签、评论表结构，带后台写作台与种子数据脚本。

## 目录结构
- `pocketbase_bin/`：已下载的 PocketBase 0.22.4 Windows 可执行文件。
- `pb_migrations/`：数据库迁移（posts、tags、comments）。
- `web/`：前端（React + React Query + React Router + Vitest）。
- `scripts/`：预留后台脚本目录（当前主要使用 web/scripts/seed.mjs）。

## 快速开始（本地）
1) **启动 PocketBase 并迁移**
```powershell
cd C:\tools\pocketbase\devtest
.\pocketbase_bin\pocketbase.exe migrate up --dir pb_data
.\pocketbase_bin\pocketbase.exe serve --http 0.0.0.0:8090 --dir pb_data
```

2) **创建管理员账户**（首次需要，用于 PocketBase 控制台，不用于前台登录）
```powershell
.\pocketbase_bin\pocketbase.exe --dir pb_data admin create admin@example.com Admin123!
```

3) **前端启动**
```powershell
cd web
copy .env.example .env   # 如需自定义后端地址可修改 VITE_PB_URL
npm install               # 已执行过，可重复确保依赖完整
npm run dev -- --host
```
浏览器访问 http://127.0.0.1:5173

4) **导入示例数据（可选）**
确保 PocketBase 服务已启动且管理员账号与下方环境变量一致：
```powershell
cd web
$env:PB_URL="http://127.0.0.1:8090"
$env:PB_ADMIN_EMAIL="admin@example.com"
$env:PB_ADMIN_PASSWORD="Admin123!"
npm run seed
```
前台登录/注册基于 `users` 集合，管理员账号仅用于 PocketBase 控制台。

5) **测试**
```powershell
cd web
npm run test:run
```

## 新增功能
- 头像上传：前台登录后访问 `/profile` 上传头像（`users.avatar` 文件字段）。
- 文章插图：写作页支持上传多张插图（`posts.attachments` 文件字段），正文可插入这些图片的 URL。
- 新标签：在 PocketBase 控制台进入 `tags` 集合，新建记录（name/slug/color），前台会自动拉取。

## 数据模型摘要
- **posts**：标题、slug、摘要、正文(editor)、封面(file)、标签(relation 多选)、状态(draft/published/archived)、发布时间、阅读时长、作者(relation users)；slug 唯一。
- **tags**：name、slug 唯一，带可选 color。
- **comments**：内容、文章(relation posts)、作者(relation users)、状态(visible/hidden)。
- 访问规则：文章仅 published 对未登录可见；创建/更新需登录且作者本人；评论需登录，自己的评论可删改。

## UI/交互
- 首页：标签过滤、卡片栅格、渐变 Hero。
- 文章页：封面、正文渲染、标签、评论区（登录后可发）。
- 控制台：简洁写作表单（标题/slug/摘要/正文/封面/状态/标签/发布时间）。

## 其他
- 环境变量：前端读取 `VITE_PB_URL`（默认 http://127.0.0.1:8090）。
- PocketBase 版本建议与客户端 SDK 一致（本项目使用 0.22.x 系列）。
