# 前端说明（web）

React + Vite + PocketBase SDK 的单页应用，负责博客展示与后台写作。

## 运行
```bash
npm install
cp .env.example .env   # 或在 PowerShell 使用 copy
npm run dev -- --host
```
默认后端地址 `VITE_PB_URL=http://127.0.0.1:8090`，如有需要自行修改。

## 可用脚本
- `npm run dev`：开发模式
- `npm run build`：生产构建
- `npm run preview`：预览
- `npm run lint`：ESLint
- `npm run test` / `npm run test:run`：Vitest 单元测试（jsdom）
- `npm run seed`：写入示例数据，需要已启动的 PocketBase 和管理员凭据（环境变量 `PB_URL`、`PB_ADMIN_EMAIL`、`PB_ADMIN_PASSWORD`）

## 技术点
- 路由：React Router（首页、文章详情、登录、控制台）
- 数据：PocketBase JS SDK + React Query
- 表单：react-hook-form
- UI：定制渐变风格，卡片/徽章/按钮组件，响应式布局
- 测试：Vitest + Testing Library（示例在 `src/lib/utils.test.ts`、`src/components/PostCard.test.tsx`）

## 重要路径
- `src/lib/pocketbase.ts`：PocketBase 客户端实例
- `src/api/*`：数据读写封装
- `src/providers/AuthProvider.tsx`：登录态上下文
- `src/pages/`：页面
- `src/components/`：通用 UI 组件
