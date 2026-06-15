# 知识图谱文件分析工具 — 设计文档

**日期：** 2026-06-15
**状态：** 草稿
**项目：** 技术实习生筛选项目 — 方向 C（自己的想法）

---

## 概述

一个单页 Web 工具。用户上传文本文档，AI 自动抽取实体和关系，生成交互式知识图谱，支持关键词搜索和语义检索。部署在个人云服务器上，使用 Docker Compose 编排。

**核心流程：**
1. 用测试账号登录
2. 创建工作区，上传一个或多个文件
3. 选择抽取模式（命名实体 / 概念关系）
4. AI 抽取出实体和关系 → 生成交互式图谱
5. 拖拽、缩放、点击探索；输入关键词即时过滤；按回车触发语义搜索
6. 关掉浏览器再打开，历史记录还在 — 所有图谱数据持久化

---

## 架构

```
                    yourdomain.com
                         │
                    ┌────▼────┐
                    │  Nginx  │  (HTTPS 终止 + /api/* → FastAPI)
                    └────┬────┘
                         │
              ┌──────────┼──────────┐
              ▼                     ▼
        ┌──────────┐         ┌──────────┐
        │ Next.js  │         │ FastAPI  │
        │ :3000    │ ─内网─▶ │ :8000    │
        │ 前端页面  │         │ AI 抽取   │
        │          │         │ 语义搜索  │
        └──────────┘         └────┬─────┘
                                  │
                             ┌────▼─────┐
                             │ LanceDB  │
                             │ 图谱+向量 │
                             └──────────┘
```

### Docker Compose 服务

```yaml
services:
  nginx:       # nginx:alpine，挂载 Let's Encrypt 证书
  nextjs:      # node:22，生产构建
  fastapi:     # python:3.12-slim
```

LanceDB 嵌入在 FastAPI 进程内运行，不需要独立容器。

### Nginx 路由

```
/           → Next.js :3000
/api/*      → FastAPI :8000
/_next/*    → Next.js :3000（静态资源）
```

---

## 数据模型

```
User（用户）
├── id: str (uuid)
├── username: str
└── password_hash: str

Workspace（工作区）
├── id: str (uuid)
├── user_id: str → User
├── name: str                 ← 例如"三国人物关系"
├── entity_type: "named" | "concept"
├── created_at: datetime
└── status: "processing" | "ready" | "error"

File（文件）
├── id: str (uuid)
├── workspace_id: str → Workspace
├── filename: str
├── content: str              ← 解析后的纯文本
└── uploaded_at: datetime

GraphSnapshot（图谱快照）
├── id: str (uuid)
├── workspace_id: str → Workspace
├── nodes: [{id, label, type, metadata}]
├── edges: [{source, target, label, weight}]
├── embedding_cache: {node_id: [float]}  ← BGE-small-zh 向量
└── created_at: datetime
```

**关系：** 一个 Workspace = 多个 File → 合并为一张 GraphSnapshot。

---

## API 契约

### FastAPI（:8000）

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/auth/login` | 登录 → `{token}` |
| POST | `/api/workspaces` | 创建工作区 → `{workspace_id}` |
| POST | `/api/workspaces/{id}/upload` | 上传文件 |
| POST | `/api/workspaces/{id}/extract` | 触发抽取，body: `{entity_type}` → `{job_id}` |
| GET | `/api/workspaces/{id}/status` | 轮询抽取进度 |
| GET | `/api/workspaces/{id}/graph` | 获取最新图谱快照 |
| GET | `/api/workspaces/{id}/search?q=` | 语义搜索 → 返回子图 |
| GET | `/api/workspaces` | 列出用户所有工作区 |
| DELETE | `/api/workspaces/{id}` | 删除工作区 |

### 抽取流程（异步）

```
POST /extract → 202 Accepted {job_id}
                 │
                 ▼
          后台任务
          ├── 阶段 1：文本分块
          ├── 阶段 2：AI 逐块抽取（并行）
          ├── 阶段 3：跨块合并去重
          └── 阶段 4：生成 embedding（BGE-small-zh）
                 │
                 ▼
          状态变为: "ready" / "error"
```

前端每 2 秒轮询 `GET /status`，直到 `ready` 或 `error`。

---

## Agent 层（`agent/`）

独立的 LangChain 模块，放在 FastAPI 内部。零耦合，可脱离 Web 框架单独测试。

```
agent/
├── __init__.py
├── extractor.py       # ReAct agent：text → {nodes, edges}
├── chunker.py         # 按段落边界分块，带重叠窗口
├── merger.py          # 跨块去重合并（SequenceMatcher）
├── prompts.py         # 中文 prompt 模板
└── providers/
    ├── base.py        # 抽象接口
    ├── deepseek.py    # deepseek-chat（主力）
    ├── openai.py      # gpt-4o（备用）
    └── claude.py      # claude-sonnet（备用）
```

### Provider 接口

```python
class BaseProvider(ABC):
    def get_llm(self) -> BaseChatModel: ...
    def get_embedding(self) -> BaseEmbeddings: ...  # 仅在本地 BGE 挂掉时用
```

### 分块策略

| 参数 | 值 | 理由 |
|------|-----|------|
| 单块上限 | 12,000 字符（约 3,000 token） | DeepSeek 67B 上下文绰绰有余 |
| 重叠窗口 | 300 字符 | 句子级重叠，防止实体被截断在分块边界 |
| 切分优先级 | 段落边界（`\n\n`） | 绝不在段落中间截断 |

### 合并去重

- 实体去重：`difflib.SequenceMatcher`，标签相似度 > 0.8 → 合并
- 边去重：同一（来源、目标、关系）→ 权重 +1
- 不调用 embedding API，零额外开销

### 重试策略

- API 报错或 JSON 解析失败 → 静默重试最多 2 次
- 3 次均失败 → 返回错误 + 原始 AI 输出，方便调试

---

## 前端

### 路由

| 路由 | 用途 |
|------|------|
| `/` | 首页：登录、Demo 入口、上传 |
| `/workspace/[id]` | 图谱页：核心交互界面 |
| `/history` | 历史工作区列表 |

### 组件树 — 图谱页

```
/workspace/[id]
│
├── Sidebar（可收起侧栏）
│   ├── WorkspaceInfo      — 名称、文件列表、实体/概念切换
│   ├── UploadZone         — 拖拽上传追加文件
│   └── SearchBar          — 关键词输入 + 语义搜索触发
│
├── GraphCanvas（主体画布） — cytoscape.js 挂载点
│   ├── 节点渲染           — 按类型着色（人物/组织/概念/地点）
│   ├── 边渲染             — 关系标签
│   ├── cose-bilkent 布局  — 力导向，学术论文级算法
│   └── 交互               — 拖拽、缩放、点击展开邻居节点
│
├── NodeDetail（浮层）     — 节点属性 + 原文片段出处
│
└── StatusBar（底部状态栏） — 抽取进度、节点数、边数
```

### 视觉设计 — 极简学术风

| 元素 | 规格 |
|------|------|
| 底色 | `#fafafa` 暖白 |
| 节点 | 圆形，4-5 种柔和色：人物=灰蓝 / 组织=灰绿 / 概念=淡琥珀 / 地点=灰紫 |
| 边 | 细灰线 + 方向箭头，hover 加深并显示关系标签 |
| 选中态 | 节点放大 + 1 度邻居高亮 + 其余节点 opacity 降至 0.15 |
| 字体 | 无衬线 11px，标签超过 20 字符截断 |
| 动效 | 尊重 `prefers-reduced-motion`；用户偏好减少动效时跳过力导向入场动画 |

### 节点上限

- 默认展示 top-300 核心节点
- 剩余节点折叠为"展开更多（+N）"按钮
- 核心度排序：按边度数中心性（连接最多的节点排最前）

---

## 文件解析

| 格式 | 解析库 | 备注 |
|------|--------|------|
| `.txt` | Python 标准库 | 直接读取 |
| `.md` | Python 标准库 | 保留标题层级，作为分块边界的软提示 |
| `.pdf` | `pdfplumber` | 中文支持优于 pdf-parse |
| `.docx` | `python-docx` | 提取文本，含表格内容 |

---

## Embedding 与搜索

### Embedding 模型

- **BGE-small-zh**（本地运行，约 100MB 磁盘，约 400MB 运行时内存）
- 运行在 FastAPI 容器内
- CPU 推理，单条 embedding <10ms

### 搜索行为

| 触发方式 | 行为 | 实现 |
|----------|------|------|
| 搜索框中输入文字 | 即时过滤 | 前端：节点标签匹配查询字符串，不匹配的变淡 |
| 按回车键 | 语义搜索 | 后端：将查询词向量化 → 与 `embedding_cache` 做余弦相似度 → 返回 top-5 节点 + 2 跳邻居子图 |

---

## 错误处理

| 场景 | 行为 |
|------|------|
| AI 抽取返回 0 个实体 | 显示错误提示 + 附带原始 AI 输出链接 |
| 文件过大超出单块上限 | Chunker 自动分块 |
| API 超时 / JSON 畸形 | 静默重试 2 次，仍失败则返回错误 + 原始输出 |
| 不支持的文件格式 | 返回 400 + 列出支持的格式 |
| 工作区不存在 | 返回 404，前端跳转到首页 |

---

## Demo 模式

- 内置一段示例文本（例如一篇中文科技新闻）
- 首页"一键体验"按钮
- 自动创建临时工作区并预填示例文本
- 面试官不用上传文件，点一下就能看到完整图谱

---

## 登录

- 单一共享测试账号：`interviewer` / 密码通过环境变量配置
- 简易 JWT token（无 refresh 轮换 — 内部工具不折腾）
- 首页登录表单；所有 API 需 `Authorization: Bearer <token>`

---

## 技术栈总表

| 层 | 选型 |
|----|------|
| 前端框架 | Next.js（App Router） |
| 图谱可视化 | cytoscape.js + cose-bilkent 布局 |
| 样式 | Tailwind CSS |
| 后端框架 | FastAPI（Python 3.12） |
| AI 编排 | LangChain（ReAct agent） |
| 主力 LLM | DeepSeek Chat（`deepseek-chat`） |
| Embedding | BGE-small-zh（本地运行） |
| 向量存储 | LanceDB（嵌入 FastAPI 进程） |
| 反向代理 | Nginx（Let's Encrypt 自动 HTTPS） |
| 容器化 | Docker Compose |
| 部署 | 个人云服务器（2 vCPU, 4 GB RAM） |

---

## 范围边界

### 全部做完
- txt / md / pdf / docx 文件上传
- 命名实体 + 概念关系两种抽取模式
- 交互式图谱：拖拽、缩放、点击展开
- 前端关键词过滤 + 后端语义搜索
- Demo 模式，内置示例一键体验
- 单工作区多文件合并
- 图谱持久化 + 历史记录
- 测试账号登录
- PDF 表格内容抽取
- 图谱导出（PNG / SVG）
- 英文 README + 真实 commit 历史

### 故意不做
- 对话式 / Chat 式 RAG — 用户明确不做
- 多人协作编辑 — 单人工具
- 用户注册 / 真实鉴权系统 — 仅需测试账号
