# Pathfinder Loot Maker

基于 `Vue 3 + Naive UI + Express + SQLite` 的 Pathfinder 1e Loot 管理器。

## 功能覆盖

- 登录鉴权
  - 普通密码登录（登录后可访问主要页面）
  - 管理员密码二次验证（仅设置页）
  - Session + Cookie 存储，会话滑动续期
- 页面
  - 主控制台：DM、PL、总GP收入、仓库估值
  - 角色数据：角色管理、Buff、仓库物品、物品分配、Loot记录备忘录、AI录入
  - Loot登记：手动录入、AI解析追加、自动分配、拖拽分配、草稿本地存储、发布写入仓库
  - 卡片展示：PL角色立绘 + 装备/物品卡片
  - 设置界面：AI Provider 配置、模型拉取
- 数据
  - SQLite 持久化
  - 角色立绘存储在 `data/image`
  - AI临时追溯文件存储在 `temp/YYYY-MM-DD`，会定期清理

## 目录结构

```text
.
├─ server/               # Express + SQLite 后端
├─ frontend/             # Vue3 + Naive UI 前端
├─ data/                 # 持久化数据目录（数据库、立绘）
├─ temp/                 # AI临时追溯目录
├─ start.cmd             # Windows 一键启动脚本
├─ Dockerfile
├─ docker-compose.yml
├─ .env.example
└─ README.md
```

## 本地开发

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

```bash
cp .env.example .env
```

3. 启动开发模式（前后端一起）

```bash
npm run dev
```

- 前端默认：`http://localhost:5173`
- 后端默认：`http://localhost:3000`

## Windows 启动脚本

直接双击或命令行运行：

```bat
start.cmd
```

脚本会自动准备 `data/`、`temp/`、`.env` 并启动 `npm run dev`。

## 生产构建与运行

```bash
npm run build
npm start
```

> 生产模式下 Express 会托管 `frontend/dist`。

## Docker 部署

1. 准备环境变量（可直接用 `.env`）
2. 构建并启动

```bash
docker compose up -d --build
```

- 对外端口：`3000`
- 持久化：`./data -> /app/data`
- `temp` 不挂载 volume，容器重启后可清空

## 关键环境变量

- `PORT`：服务端口
- `USER_PASSWORD`：普通登录密码
- `ADMIN_PASSWORD`：管理员密码
- `SESSION_SECRET`：会话签名密钥
- `SESSION_MAX_AGE_HOURS`：会话最大时长（小时）
- `DATA_DIR`：数据目录
- `TEMP_DIR`：临时目录
- `TEMP_RETENTION_DAYS`：临时目录清理阈值（天）

## 说明

- 删除角色会自动清理其物品分配关系。
- 物品支持拆分分配给多个角色，并显示剩余数量。
- Loot发布后，仅 Loot 记录备忘录可编辑，不会回写仓库物品与分配。
- AI Provider 支持 OpenAI 兼容接口与 Google 风格接口；非多模态可配置图片转述模型。
