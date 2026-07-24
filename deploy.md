# ☁️ 云端个人主页 · 小白部署教程

> 从零开始，跟着步骤点击即可。**完全不需要写代码**。
> 全程约 15 分钟，部署完成后得到一个像 `https://cloud-home-xxxx.vercel.app` 的网址。

---

## 📋 你需要准备的 3 个账号

| 账号 | 网址 | 用途 | 费用 |
|------|------|------|------|
| GitHub | https://github.com | 存放代码 | 免费 |
| Vercel | https://vercel.com | 托管网站 | 免费 |
| Upstash | https://upstash.com | 云数据库（保存你的设置） | 免费（1万次/天） |

> 💡 GitHub 和 Vercel 可以用同一个账号一键登录；Upstash 也可以用 GitHub 登录。所以实际只需要一个 GitHub 账号。

---

## 第一步：解压代码包

1. 你收到的压缩包是 `cloud-home.zip`（或 `cloud-home.tar.gz`）
2. **解压到任意文件夹**，比如桌面上的 `cloud-home` 文件夹
3. 解压后应该看到这些文件：
   ```
   cloud-home/
   ├── src/                    ← 源代码
   ├── public/                 ← 云朵图片等资源
   ├── prisma/
   ├── package.json
   ├── next.config.ts
   ├── vercel.json             ← Vercel 部署配置
   ├── .env.example            ← 环境变量模板
   ├── .gitignore
   ├── README.md
   └── deploy.md               ← 本教程
   ```

---

## 第二步：上传代码到 GitHub

### 方式 A：用 GitHub 网页上传（推荐新手）

1. 登录 GitHub，点右上角 **+** → **New repository**
2. 填写：
   - **Repository name**：`cloud-home`（或任意名字）
   - 选 **Public**（公开）或 **Private**（私有）都行
   - **不要勾** "Add a README file"
3. 点 **Create repository**
4. 在新仓库页面，找到 **"uploading an existing file"** 链接（在 "…or push an existing repository from the command line" 那一行），点击它
5. 把解压后的 `cloud-home` 文件夹里**所有文件**拖到上传区域
   - ⚠️ **不要上传** `node_modules`、`.next`、`bun.lock` 这些（如果有的话）
6. 在底部填写 commit message：`init: cloud home`
7. 点 **Commit changes**

### 方式 B：用 git 命令行（如果你熟悉）

```bash
cd cloud-home
git init
git add .
git commit -m "init: cloud home"
git branch -M main
git remote add origin https://github.com/你的用户名/cloud-home.git
git push -u origin main
```

---

## 第三步：在 Vercel 部署

1. 打开 https://vercel.com，点 **Sign Up** → **Continue with GitHub**
2. 授权 Vercel 访问你的 GitHub
3. 进入 Dashboard 后，点 **Add New...** → **Project**
4. 在 "Import Git Repository" 列表里找到 `cloud-home`，点 **Import**
5. 配置页面**保持默认**（Vercel 会自动识别 Next.js），**先不要点 Deploy**
6. 暂时留着这个页面，进入第四步配数据库

---

## 第四步：创建 Upstash Redis 数据库

> Upstash 用来保存你的头像、签名、链接等所有设置，刷新页面不会丢失。

### 在 Vercel 里一键集成（最简单，推荐）

1. 在刚才 Vercel 的项目配置页面，找到 **"Storage"** 标签（在页面上方或左侧）
2. 点 **Create Database** → 选 **Upstash Redis**
   - 如果第一次用，Vercel 会弹窗让你授权 Upstash（用 GitHub 登录即可）
3. 填写：
   - Database Name：`cloud-home-db`
   - Region：选离你最近的（中国用户选 **Singapore (sin1)** 或 **Hong Kong (hkg1)**）
4. 点 **Create** → **Connect to Project**
5. ✅ Vercel 会**自动**给你的项目注入两个环境变量：
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
6. 你**不需要**手动复制任何东西

---

## 第五步：设置管理后台密码（强烈推荐）

> 部署后**任何人**都能看到网站左上角的齿轮图标（设计为半透明、低对比度，hover 时才会变清晰），并能打开管理后台。为了防止陌生人乱改，强烈建议设置密码。

1. 在 Vercel 项目页面，点 **Settings** 标签
2. 左侧菜单选 **Environment Variables**
3. 点 **Add New**，添加一条：
   - **Key**：`ADMIN_PASSWORD`
   - **Value**：你的密码（建议用一段随机字符串，例如 `my-s3cret-pass-2026`）
   - **Environment**：勾选 **Production**、**Preview**、**Development**（全部勾上）
4. 点 **Save**
5. 密码由服务器验证，**不会出现在前端代码、API 响应或浏览器源码中**

---

## 第六步：点 Deploy！

1. 回到 Vercel 项目配置页面（或顶部 **Deployments** 标签），点 **Deploy**
2. 等 1-2 分钟，看到 **"Congratulations"** 大字就是部署成功了
3. 点 **Visit** 打开你的网站

第一次打开会看到：
- ✅ 蓝天 + 漂浮的云层（鼠标移动会让云朵轻微视差）
- ✅ 左上角有一个**几乎看不见**的齿轮图标（hover 才变清晰）
- ✅ 头像、签名、链接、页脚

---

## 第七步：个性化你的主页

### 1. 打开管理后台
有两种方式：
- **方式 A（鼠标）**：鼠标移到左上角，齿轮图标会变清晰，点击它
- **方式 B（快捷键）**：按 **Ctrl+Shift+Z**（macOS 上是 Cmd+Shift+Z）直接唤出/收起管理后台
  - 快捷键在输入框/文本域内聚焦时会被忽略，不会干扰正常打字

如果设置了密码，会弹出密码输入框 → 输入密码 → 点 **验证并进入**

### 2. 头像（两种方式）
- **上传图片**：点 **上传图片** → 选择本地图片（PNG/JPG/WebP/GIF/SVG，≤450 KB）
- **图床链接**：在 **"或填写图床链接"** 输入框粘贴图片 URL（无大小限制）
  - 例如：`https://www.gravatar.com/avatar/xxx`、`https://avatars.githubusercontent.com/u/xxx`

### 3. 头像动效（7 种）
- **无动效** / **摇铃铛（原版）** / **呼吸缩放** / **缓慢旋转** / **上下漂浮** / **脉冲光环** / **微光发光**
- **微光发光**：头像周围有柔和的呼吸光晕，推荐搭配空灵风格

### 4. 昵称显示
- 在 **昵称** 输入框填入你的名字
- 勾选 **"在主页显示昵称（头像下方）"** 即可在头像下方显示

### 5. 个性签名（5 种动效）
- **无动效** / **淡入淡出** / **打字机** / **波浪起伏** / **彩虹色变**
- **打字机**：逐字打印，光标跟随文字末尾，CJK 字符按全角计算（不会跑到文字后面）

### 6. 天空配色（8 预设 + 自定义）
- **8 种预设**：破晓蓝（原版）/ 暮色紫 / 晨曦橙 / 深海青 / 玫瑰粉 / 子夜深蓝 / 极光绿 / 薰衣草
- **自定义渐变色**：勾选 **"使用自定义渐变色"** → 出现 3 个颜色选择器
  - 顶部色、地平线色、云雾色（云雾色通常与地平线色相同，云朵才能平滑融入天空）

### 7. 云朵渲染（密度 + 速度）
- **云朵密度**：500-20000 片滑动调节（建议 4000-12000）
- **云朵速度**：0.1×-3× 滑动调节（1× = 原版速度）
- 点 **"重置云朵密度 / 速度"** 恢复默认

### 8. 页面字体（5 种）
- **霞鹜文楷**（网络字体，首次加载需联网，手写楷书风格）
- **楷体** / **黑体** / **宋体**（系统字体，依赖访客设备）
- **系统默认**
- 推荐用 **霞鹜文楷**，最契合空灵风格

### 9. 链接管理
- 每个链接：emoji 图标 + 名称 + URL + 图标颜色
- 点 ↑ / ↓ 调整顺序，🗑️ 删除，底部 **添加链接** 新增

### 10. 页脚
- 支持 HTML（备案号、版权信息等）
- 可一键开关

### 11. 保存！
- 所有改动**只在浏览器内存中**，**必须点底部的【保存到云端】**才会写入 Upstash Redis
- 保存后下次打开网站自动加载

---

## 验收清单 ✅

部署完成后，逐项确认：

- [ ] 网站能打开，看到蓝天 + 云层 + 头像 + 签名 + 链接 + 页脚
- [ ] 鼠标移动时云朵有轻微视差
- [ ] 左上角齿轮图标默认几乎看不见，hover 变清晰
- [ ] 点击齿轮能打开管理后台（如设了密码，会先弹密码框）
- [ ] 管理后台底部显示 **数据库（Upstash Redis）已连接**（绿色）
- [ ] 上传头像或填图床链接后，头像正确显示
- [ ] 切换天空配色后，云层颜色平滑过渡
- [ ] 切换字体后，页面文字字体变化
- [ ] 点 **保存到云端** 后，刷新页面设置仍在

---

## 常见问题

### Q1：管理后台显示"未连接"
- 检查 Vercel 项目的 Environment Variables 里是否有 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN`
- 如果没有，回到 **Storage** 面板重新创建 Upstash Redis 并连接项目
- 修改环境变量后需要 **Redeploy**（Deployments → 最近一次 → 右侧 ⋯ → Redeploy）

### Q2：齿轮图标找不到
- 它在屏幕**左上角最顶端**，默认半透明（opacity 0.55）
- 把鼠标移到左上角，图标会变清晰并旋转
- 仔细看就能看到一个 14×14px 的小齿轮轮廓
- **或者直接按 Ctrl+Shift+Z 快捷键**唤出管理后台，不用找图标

### Q3：头像上传失败 / 显示 "Unexpected token '<'"
- 这是头像文件过大导致的。文件大小**必须 ≤ 450 KB**（Redis 1MB 命令限制，base64 编码后约 600KB）
- 用 https://tinypng.com/ 压缩后再试
- 或者改用**图床链接**（无大小限制）—— 在头像区下方的 URL 输入框粘贴图片地址
- 错误信息 "Unexpected token '<'" 意味着服务器返回了 HTML 错误页而非 JSON，通常是文件超限

### Q4：打字机效果光标跑到文字后面
- 已修复。现在光标紧贴文字末尾，逐字打印
- 如果换了签名文字还有问题，刷新页面（会重新测量文字宽度）

### Q5：字体切换后没变化
- **霞鹜文楷**是网络字体，首次加载需 1-3 秒下载字体文件
- **楷体/黑体/宋体**是系统字体，依赖访客设备是否安装：
  - Windows：通常都有 SimSun、SimHei、KaiTi
  - macOS：通常都有 Songti SC、Heiti SC、STKaiti
  - Linux/手机：可能没有，会回退到 Noto 字体
- 如需保证所有设备显示一致，用 **霞鹜文楷**（网络字体）

### Q6：手机上看着不舒服
- 链接区域在小屏上会自动换行（响应式）
- 管理后台在手机上也能用，可以上下滚动

### Q7：想恢复默认设置
- 管理后台底部 → **重置** 按钮

### Q8：部署后页面是白的
- 检查 Vercel 部署日志（Deployments → 点最近的部署 → Build Logs）
- 大概率是某个文件没传上去，对照第二步的文件清单检查

### Q9：想更新网站（改了代码后）
- 把新代码 push 到 GitHub
- Vercel 会**自动检测**并重新部署
- 你的设置数据不会丢失（存在 Upstash Redis 里）

### Q10：想用自定义域名
- Vercel 项目 → **Settings** → **Domains**
- 输入你的域名，点 **Add**
- 按提示去域名注册商处添加 CNAME 记录
- 等 DNS 生效（5-30 分钟）即可

---

## 项目结构速览

```
cloud-home/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── profile/route.ts   # GET/POST 读取/保存设置
│   │   │   ├── upload/route.ts    # POST 头像上传
│   │   │   └── status/route.ts    # GET 数据库连接状态
│   │   ├── layout.tsx             # 全局布局 + 背景渐变
│   │   ├── page.tsx               # 主页：编排云背景 + 内容 + 管理后台
│   │   └── globals.css            # 全局样式 + 头像/签名动效
│   ├── components/
│   │   ├── CloudBackground.tsx    # Three.js 云层（1:1 复刻原版）
│   │   ├── HomepageContent.tsx    # 头像/签名/链接/页脚
│   │   └── AdminPanel.tsx         # 左上角管理后台
│   └── lib/
│       ├── types.ts               # 配置类型 + 8 种天空预设 + 5 种字体
│       └── redis.ts               # Upstash Redis 客户端
├── public/
│   ├── cloud.png                  # 云朵纹理
│   └── puff.svg                   # 备用加载动画
├── package.json
├── vercel.json                    # Vercel 部署配置
├── .env.example                   # 环境变量模板
└── README.md
```

---

## 🎨 致敬

云层渲染致敬了经典的 [Mr.doob three.js clouds demo](https://github.com/mrdoob/three.js/blob/master/examples/webgl_clouds.html)，
原版 HTML 项目来自 Azad 的"我的互联网日志"。本 TypeScript 版本完整保留了原版的空灵感与云朵渐隐逻辑，
并扩展了管理后台、密码保护、7 种头像动效、5 种签名动效、8 种天空配色 + 自定义渐变、5 种页面字体、
云朵密度/速度调节、Upstash Redis 数据持久化等能力。

祝你玩得开心 ☁️
