# Pathfinder Loot Maker

Pathfinder 1e 战役物资管理系统，前后端一体化实现。

- 前端：`Vue 3 + Naive UI + Vue Router + Vite`
- 后端：`Express + express-session + SQLite`
- 部署：本地 Node.js / Docker / PaaS

## 功能介绍

### 1. 登录与权限
- 普通密码登录：通过 `USER_PASSWORD` 进入系统。
- 管理员二次验证：设置页需要额外输入 `ADMIN_PASSWORD`。
- 会话机制：`Session + Cookie`，开启 `rolling` 自动续期。

### 2. 页面功能
- 登录页（`/login`）
  - 密码登录，成功后进入主界面。
- 主控制台（`/dashboard`）
  - 展示战役名称、GM 信息、PL 列表。
  - 展示总 GP 收入、仓库总估值、PL 角色价值。
- 角色展示（`/cards`）
  - 以卡片形式展示每个 PL 的 Buff、装备、药水/卷轴和其他物品。
  - 支持 `display_description` 的 HTML 渲染。
- 总数据（`/data`）
  - 仓库数据
    - 物品增删改查、表格内联编辑、筛选/排序、批量删除。
    - 物品分配给角色（覆盖/叠加/抢占），支持槽位冲突提示。
    - 删除时可勾选“同步生成支出流水”。
  - 角色管理
    - 新建/编辑/删除角色（删除需输入角色名确认）。
    - 上传角色立绘。
    - Buff 维护（天级/小时级/十分钟级/分钟级/轮级）。
  - 流水记录
    - 收入/支出流水 CRUD。
    - 自动汇总收入、支出、余额。
  - Loot 记录
    - 展示历史 Loot 快照（含分配与价值统计）。
    - 支持只编辑备忘录文本。
- 数据登记（`/loot-register`）
  - Loot 模式
    - 新增 Loot、拖拽分配到角色、拆分数量、自动分配。
    - 自动分配规则：平均分 / 按价值 / 按角色权重 / 随机 / 轮流。
    - 本地草稿自动保存（LocalStorage）。
  - 支出模式
    - 从仓库选取或手动输入支出项。
    - 右侧实时预览支出后仓库数量变化。
    - 发布后扣减仓库并写入支出流水。
- 设置（`/settings`）
  - 战役名称设置（用于顶部标题）。
  - AI Provider 管理（新增/编辑/删除/默认/多模态/图片转述模型/拉取模型列表）。

### 3. AI 能力
- Provider 类型：
  - OpenAI 兼容（`/chat/completions`）
  - Google 格式（`/models/{model}:generateContent`）
- 支持文本与图片输入。
- 非多模态模型可指定“图片转述 Provider”。
- 解析接口：
  - `/api/ai/parse-loot`
  - `/api/ai/parse-expense`
  - `/api/ai/parse-character`
- AI 调试追溯数据会写入 `temp/YYYY-MM-DD/*.json`。

### 4. 数据与存储规则
- 数据库：`data/app.sqlite`。
- 角色立绘：`data/image/`。
- Session：`data/sessions.sqlite`。
- 临时目录：`temp/`，启动时清理，并每 12 小时清理一次过期目录。
- 关键业务规则：
  - 角色删除后，其物品分配关系会被级联删除。
  - 物品支持分配数量统计（已分配/剩余）。
  - 发布 Loot：写入仓库 + Loot 记录 + 收入流水。
  - 发布支出：从仓库扣减/删除物品 + 写入支出流水（不写 Loot 记录）。

### 5. 目录结构

```text
.
├─ frontend/                  # Vue 前端
├─ server/                    # Express 后端
├─ data/                      # SQLite 与持久化资源
├─ temp/                      # AI 临时追溯目录
├─ Dockerfile
├─ docker-compose.yml
├─ start.cmd
├─ .env.example
└─ .github/workflows/         # CI 工作流
```

## 部署方式

### 1. 环境变量

必须配置（安全相关）：

- `USER_PASSWORD`：普通登录密码
- `ADMIN_PASSWORD`：管理员密码
- `SESSION_SECRET`：Session 签名密钥（请使用高强度随机串）

可选配置：

- `APP_PORT`：服务端口（优先级：`APP_PORT > PORT > 3000`）
- `SESSION_MAX_AGE_HOURS`：会话有效小时数（滚动续期）
- `FRONTEND_ORIGIN`：开发模式前端地址（默认 `http://localhost:5173`）
- `DATA_DIR`：数据目录（默认 `./data`）
- `TEMP_DIR`：临时目录（默认 `./temp`）
- `TEMP_RETENTION_DAYS`：临时目录保留天数（默认 `3`）

### 2. 本地开发

```bash
npm install
cp .env.example .env
npm run dev
```

访问地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:<APP_PORT>`（默认 `3000`）

### 3. Windows 一键启动

```bat
start.cmd
```

脚本会自动：

- 创建 `data/`、`data/image/`、`temp/`
- 若无 `.env` 则从 `.env.example` 复制
- 首次自动安装依赖并启动 `npm run dev`

### 4. Node.js 生产部署（非 Docker）

先构建前端：

```bash
npm run build
```

再以生产模式启动（必须设置 `NODE_ENV=production`，否则不会托管前端静态资源）：

```bash
NODE_ENV=production npm start
```

Windows PowerShell：

```powershell
$env:NODE_ENV='production'; npm start
```

### 5. Docker / Docker Compose 部署

```bash
docker compose up -d --build
```

说明：

- 对外端口：`${APP_PORT}`（默认 `3000`）
- 数据持久化：`./data -> /app/data`
- `temp` 未挂载 volume，容器重建后可清空

### 6. PaaS 部署建议

- Build Command：`npm ci && npm run build`
- Start Command：`NODE_ENV=production node server/index.js`
- 在平台环境变量中至少配置：
  - `USER_PASSWORD`
  - `ADMIN_PASSWORD`
  - `SESSION_SECRET`
  - `APP_PORT`（或由平台注入 `PORT`）

### 7. GitHub Actions 自动构建 Docker

仓库已提供工作流：`.github/workflows/docker-build.yml`

触发条件：

- `push`
- `pull_request`

行为：

- 自动执行 Docker Build（多阶段构建）
- 使用 GitHub Actions 缓存加速后续构建
- 当前默认只做构建校验，不推送镜像
