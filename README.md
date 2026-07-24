# ☁️ 云端个人主页 · Cloud Home

一个云端个人主页 TypeScript 项目。流动的云、可定制的头像与签名、可编辑的链接与页脚、8 种天空配色 + 自定义渐变、5 种页面字体、7 种头像动效、密码保护的管理后台，一键部署到 Vercel + Upstash Redis。

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Three.js](https://img.shields.io/badge/Three.js-r185-green) ![Vercel](https://img.shields.io/badge/Vercel-Ready-black)

## ✨ 特性

- 🎨 **云层 + 天空**：基于 Three.js + 自定义 ShaderMaterial，8000 片云层平滑无限循环，雾化渐隐到天空交界处不突兀；鼠标视差、无限循环飞行保留原版逻辑
- 🖼️ **头像**：上传图片或图床链接，7 种动效（无 / 摇铃铛原版 / 呼吸缩放 / 缓慢旋转 / 上下漂浮 / 脉冲光环 / **微光发光**），大小+位置滑动调节
- ✍️ **签名**：5 种动效（无 / 淡入淡出 / **打字机（逐字打印）** / 波浪 / 彩虹），字号+位置滑动调节
- 📛 **昵称**：可选在头像下方显示
- 🌈 **天空配色**：8 种预设 + **自定义渐变色**（顶部/地平线/云雾 3 个颜色选择器），云层 fogColor 自动跟随
- ☁️ **云朵控制**：密度 500-20000 片、速度 0.1×-3× 滑动调节，可一键重置
- 🔤 **页面字体**：霞鹜文楷（网络字体）/ 楷体 / 黑体 / 宋体 / 系统默认
- 🔗 **链接管理**：增删改查、上下排序、emoji 图标 + 颜色
- 📝 **页脚编辑器**：支持 HTML，可开关
- 🔐 **密码保护**：管理后台可设密码，服务器端验证，密码不暴露在前端
- 🗄️ **Upstash Redis 持久化**：所有设置存云端，刷新不丢
- 📊 **数据库状态**：管理后台底部实时显示，每 30 秒自动刷新
- 📱 **响应式**：桌面/平板/手机自适应
- 🎯 **隐形齿轮**：左上角半透明齿轮图标，hover 才变清晰，不破坏空灵感；也支持 **Ctrl+Shift+Z 快捷键**唤出

## 🚀 部署

跟着 [`deploy.md`](./deploy.md) 走即可，约 15 分钟上线。流程概要：

1. 解压代码包，上传到 GitHub
2. 在 Vercel 导入项目
3. 在 Vercel Storage 面板创建 Upstash Redis（自动注入环境变量）
4. 设置 `ADMIN_PASSWORD` 环境变量（强烈推荐）
5. 点 Deploy
6. 打开网站 → 左上角齿轮 → 开始个性化

## 🛠️ 本地开发

```bash
# 1. 安装依赖
bun install   # 或 npm install / pnpm install

# 2. 复制环境变量模板并填写
cp .env.example .env.local
# 编辑 .env.local 填入 KV_REST_API_URL / KV_REST_API_TOKEN / ADMIN_PASSWORD

# 3. 启动开发服务器
bun run dev   # 或 npm run dev
# 打开 http://localhost:3000
```

## 📁 关键文件

| 文件 | 作用 |
|------|------|
| `src/components/CloudBackground.tsx` | Three.js 云层渲染（1:1 复刻 Mr.doob 经典 clouds demo） |
| `src/components/HomepageContent.tsx` | 头像 + 昵称 + 签名 + 链接 + 页脚 |
| `src/components/AdminPanel.tsx` | 左上角管理后台（齿轮图标 + 密码 + DB 状态） |
| `src/lib/redis.ts` | Upstash Redis 客户端 + 读写逻辑 |
| `src/lib/types.ts` | 配置类型 + 8 种天空预设 + 5 种字体 + 7 种头像动效 |
| `src/app/api/profile/route.ts` | GET / POST 读写主页配置（含密码验证） |
| `src/app/api/upload/route.ts` | POST 头像上传（base64 存 Redis） |
| `src/app/api/status/route.ts` | GET 数据库连接 ping |
| `public/cloud.png` | 云朵纹理（原版资源） |
| `vercel.json` | Vercel 部署配置 |
| `deploy.md` | 小白式部署指南 |

## 📜 License

MIT
