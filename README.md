# EasyTVC — AI 智能视频创作引擎

EasyTVC 是一款全栈 AI 驱动的视频内容创作平台，基于无限画布 + 节点工作流架构，帮助用户从创意文案到分镜图片再到成品视频，实现一站式智能制作。

---

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端 | React 19 · TypeScript · Vite · React Flow · Tailwind CSS · Zustand |
| 后端 | Node.js · Fastify · Prisma ORM · PostgreSQL · Redis |
| AI | OpenAI 兼容接口（支持自部署模型网关） |
| 图像处理 | Sharp（服务端）· Canvas API（客户端） |
| 工程化 | pnpm Workspace · Turborepo |
| 部署 | Docker Compose · Nginx 反向代理 |

---

## 快速开始

### 环境要求

- Node.js >= 20
- pnpm >= 10
- Docker & Docker Compose

### 开发环境

```bash
# 1. 启动数据库（PostgreSQL + Redis）
docker compose -f docker/docker-compose.dev.yml up -d

# 2. 安装依赖
pnpm install

# 3. 初始化数据库
cd packages/api
cp .env.example .env    # 编辑 .env 填写 API Key 等配置
npx prisma migrate dev --name init
cd ../..

# 4. 启动开发服务
pnpm dev
```

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:3000 |
| API | http://localhost:4000 |
| 健康检查 | http://localhost:4000/api/health |

### 生产部署

```bash
docker compose -f docker/docker-compose.yml up --build -d
```

---

## 项目结构

```
EasyTVC/
├── packages/
│   ├── web/                # 前端应用（React + Vite）
│   │   └── src/
│   │       ├── components/
│   │       │   ├── canvas/       # 画布核心（CanvasPage、连接菜单、空画布引导）
│   │       │   ├── nodes/        # 节点组件（文本、图片、视频、音频等）
│   │       │   ├── editor/       # 图片编辑器（26 种工具）
│   │       │   ├── timeline/     # 时间线（片段排列与视频导出）
│   │       │   └── pipeline/     # 一键成片（自动化流水线）
│   │       └── stores/           # Zustand 状态管理
│   ├── api/                # 后端服务（Fastify）
│   │   └── src/
│   │       ├── routes/           # RESTful API 路由
│   │       ├── ai/              # AI Provider 抽象层
│   │       └── middleware/       # 认证中间件
│   └── shared/             # 前后端共享类型与常量
├── docker/                 # Docker 配置与 Nginx
└── docs/                   # 设计文档
```

---

## 核心功能

### 无限画布

- 自由平移、缩放、小地图导航
- 从工具栏拖拽或双击空白区域创建节点
- 节点间连线，建立数据引用关系
- 连线拖至空白区域时弹出快捷创建菜单
- 画布状态自动保存（~2s 防抖）
- 撤销 / 重做（Ctrl+Z / Shift+Ctrl+Z）
- 多选操作（Shift 键）
- 所有节点支持拖拽调整大小

### 节点系统

| 节点类型 | 说明 |
|----------|------|
| 文本 `Text` | 富文本编辑，支持加粗、斜体、列表等格式，内置 AI 生成 |
| 图片 `Image` | 图片上传与展示，支持 AI 生图，可打开图片编辑器 |
| 视频 `Video` | 视频上传与预览，支持 AI 生成视频 |
| 音频 `Audio` | 音频上传与播放，支持 TTS 语音合成与 AI 配乐 |
| 角色 `Character` | 定义角色信息（名称、描述、参考图），供分镜保持一致性 |
| 风格 `Style` | 定义视觉风格关键词与参考图，统一全片风格 |
| 文档 `Document` | 长文档编辑 |
| 表格 `Table` | 数据表格编辑 |
| 涂鸦 `Image Editor` | 手绘涂鸦画板 |
| 分组 `Frame` | 节点分组框架 |

**交互模式：**

- **浏览模式**（默认）：鼠标悬浮显示统一功能工具栏（编辑按钮 + 扩展按钮）
- **编辑模式**：点击编辑按钮进入，显示该节点完整的编辑界面与 AI 提示栏
- 每个节点支持重命名，下游引用自动显示自定义名称
- AI 提示词与模型选择在节点间持久保存

### AI 生成能力

所有 AI 能力通过 **OpenAI 兼容接口** 统一调用，支持自建模型网关。

| 生成类型 | 说明 | 代表模型 |
|----------|------|----------|
| 文生文 | 文本创作、脚本续写 | GPT-4o-mini、GPT-5-mini、Gemini 2.5 Flash/Pro、DeepSeek-V3、Claude Sonnet 4、Qwen3-Max |
| 文生图 | 根据提示词生成图片 | Gemini 3 Pro/Flash Image、GPT-Image-1/1.5、Grok Image、Qwen-Image 2.0、Wan2.7 Image |
| 文生视频 | 根据提示词生成视频 | Wan2.7 T2V、Veo 3.1、Seedance 2.0、Sora 2 NX、Grok Video |
| 文生音频 | TTS 语音合成、AI 配乐 | TTS-1-HD、GPT-4o-mini-TTS、CosyVoice V3、Qwen3-TTS、Suno Music |
| 图生文 | 图片内容分析 | GPT-4o（视觉）、Gemini 2.5 |
| 图生图 | 图片风格转换、编辑 | 通过图片编辑器 AI 工具实现 |
| 图生视频 | 静态图片动画化 | Wan2.7/2.6/2.2 I2V、Veo 3.1、Seedance 2.0 |
| 视频生文 | 视频内容分析 | GPT-4o |
| 视频生视频 | 视频风格编辑 | Wan2.7 VideoEdit |

**节点引用机制**：节点可引用上游节点内容作为 AI 输入。例如：图片节点引用两张参考图 + 提示词，实现多图融合生成。

### 一键成片

文本节点悬浮工具栏上的 ⚡ 按钮触发自动化流水线：

1. **脚本分析** — AI 将文案拆解为分镜脚本（场景描述、镜头语言、时长）
2. **分镜图片** — 逐条分镜生成配图，自动融合角色 / 风格节点信息
3. **视频生成** — 分镜图片动画化为视频片段
4. **音频生成** — 自动生成旁白配音
5. **组装成片** — 创建对应节点并自动布局连线，进入时间线导出

支持**快速模式**与**精细模式**，可自定义每个环节的 AI 模型，支持暂停、重试失败步骤。

### 图片编辑器

从图片节点打开的全屏专业编辑器，提供 **26 种工具**，按手风琴导航分组：

**变换工具**

| 工具 | 说明 |
|------|------|
| 裁剪 | 自由裁剪与比例锁定 |
| 旋转 | 任意角度旋转 |
| 翻转 | 水平 / 垂直翻转 |
| 缩放 | 等比或自由缩放尺寸 |

**调色工具**

| 工具 | 说明 |
|------|------|
| 亮度/对比度 | 基础明暗调节 |
| 饱和度/色相 | 色彩饱和与色调偏移 |
| 色温/色调 | 冷暖色调调整 |
| 锐化/模糊 | 清晰度与柔焦效果 |
| 暗角 | 边缘暗角效果 |
| 噪点/颗粒 | 胶片颗粒质感 |
| 滤镜预设 | 一键套用预设滤镜 |

**标注工具**

| 工具 | 说明 |
|------|------|
| 画笔 | 自由绘制笔刷 |
| 矩形/椭圆 | 几何形状标注 |
| 箭头 | 方向箭头标注 |
| 文字 | 添加文字标注 |
| 马赛克/模糊笔 | 局部马赛克与模糊涂抹 |

**AI 智能工具**

| 工具 | 说明 |
|------|------|
| 智能擦除 | 涂抹选区内容自动移除 |
| 智能扩图 | AI 自动扩展画面边界 |
| 背景移除 | 一键抠图去背景 |
| 背景替换 | AI 替换为指定场景背景 |
| 局部重绘 | 涂抹选区按提示词重新绘制 |
| AI 打光 | 智能调整光照效果 |
| 风格迁移 | 将图片转换为指定艺术风格 |
| AI 超分 | 智能放大提升画质 |
| 物体变色 | 选区内物体颜色替换 |
| 表情调整 | AI 调整人物面部表情 |

- 所有 AI 工具支持自选模型
- 多层画布架构（基础层 + 遮罩层 + 标注层）
- 完整的撤销 / 重做历史记录
- 插件化注册机制，便于扩展新工具

### 时间线

- 底部可折叠面板，从画布视频 / 图片节点添加片段
- 片段排序（前移 / 后移）、删除
- 顺序预览播放（视频连续播放，图片按时长保持）
- **合并导出**：所有片段合成为一个 1920×1080 / 30FPS 的完整视频文件

---

## 后端 API

### 认证体系

- 用户注册 / 登录（bcrypt 密码加密）
- JWT Access Token（~15 分钟有效期）
- Redis 存储 Refresh Token（~7 天有效期，支持轮换）

### API 路由

| 模块 | 前缀 | 主要端点 |
|------|------|----------|
| 认证 | `/api/auth` | 注册、登录、刷新令牌、获取当前用户 |
| 项目 | `/api/projects` | 项目 CRUD |
| 画布 | `/api/canvas` | 节点与连线的增删改查、视口保存、画布批量保存 |
| 上传 | `/api/upload` | 文件上传（图片、视频、音频） |
| AI 生成 | `/api/generate` | 各类 AI 生成接口、分镜解析、流水线图片生成、任务状态查询 |
| 静态文件 | `/api/files` | 上传文件的静态访问 |

---

## 环境变量

在 `packages/api/.env` 中配置：

```bash
# 数据库
DATABASE_URL="postgresql://easytvc:easytvc@localhost:5432/easytvc"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key"

# AI 模型接口（OpenAI 兼容）
OPENAI_API_KEY="sk-..."
OPENAI_API_BASE_URL="https://api.openai.com/v1"

# 默认模型
DEFAULT_TEXT_MODEL="gpt-4o-mini"

# CORS
CORS_ORIGIN="http://localhost:3000"

# 文件上传目录
UPLOAD_DIR="./uploads"
```

支持任何 OpenAI 兼容的 API 网关（如自建模型代理），只需修改 `OPENAI_API_BASE_URL`。

---

## 常用命令

```bash
# 开发
pnpm dev              # 启动前后端开发服务
pnpm dev:web          # 仅启动前端
pnpm dev:api          # 仅启动后端

# 构建
pnpm build            # 构建所有包
pnpm build:web        # 仅构建前端
pnpm build:api        # 仅构建后端

# 数据库
pnpm db:migrate       # 执行数据库迁移
pnpm db:push          # 推送 Schema 变更
pnpm db:studio        # 打开 Prisma Studio

# 清理
pnpm clean            # 清理构建产物
```

---

## Docker 部署

### 开发环境（仅数据库）

```bash
docker compose -f docker/docker-compose.dev.yml up -d
```

### 生产环境（全栈）

```bash
docker compose -f docker/docker-compose.yml up --build -d
```

生产环境包含：
- **web**：Vite 构建 + Nginx 静态托管（端口 3000）
- **api**：Node.js 后端服务（端口 4000）
- **postgres**：PostgreSQL 16 数据库
- **redis**：Redis 7 缓存

Nginx 自动将 `/api/` 请求反向代理到后端服务，支持最大 100MB 文件上传，启用 Gzip 压缩。

---

## 许可证

私有项目，仅限内部使用。
