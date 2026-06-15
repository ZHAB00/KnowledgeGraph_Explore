# 知识图谱文件分析工具 — 实现计划

> **对于 agentic worker：** 使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 来按任务实现此计划。步骤使用 checkbox (`- [ ]`) 语法跟踪。

**目标：** 构建一个单页 Web 工具，用户上传文本文件后 AI 抽取实体关系生成交互式知识图谱，支持关键词搜索和语义检索。

**架构：** Next.js 前端 + FastAPI 后端 + Nginx 反向代理，Docker Compose 编排，部署在个人云服务器。

**技术栈：** Next.js App Router + Tailwind CSS + cytoscape.js | FastAPI + LangChain ReAct + DeepSeek + BGE-small-zh + LanceDB | Nginx + Let's Encrypt

---

## 文件结构

```
interview_demo/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py
│   ├── config.py
│   ├── db/
│   │   ├── __init__.py
│   │   ├── lancedb_client.py
│   │   └── models.py
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── extractor.py
│   │   ├── chunker.py
│   │   ├── merger.py
│   │   ├── prompts.py
│   │   └── providers/
│   │       ├── __init__.py
│   │       ├── base.py
│   │       ├── deepseek.py
│   │       ├── openai.py
│   │       └── claude.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── workspaces.py
│   │   └── search.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── extract_service.py
│   │   ├── file_parser.py
│   │   └── embedder.py
│   └── tests/
│       ├── __init__.py
│       ├── test_chunker.py
│       ├── test_merger.py
│       ├── test_extractor.py
│       └── test_api.py
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── postcss.config.js
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── workspace/[id]/page.tsx
│       │   ├── history/page.tsx
│       │   └── globals.css
│       ├── components/
│       │   ├── LoginForm.tsx
│       │   ├── WorkspaceList.tsx
│       │   ├── WorkspaceCreate.tsx
│       │   ├── Sidebar.tsx
│       │   ├── WorkspaceInfo.tsx
│       │   ├── UploadZone.tsx
│       │   ├── SearchBar.tsx
│       │   ├── GraphCanvas.tsx
│       │   ├── NodeDetail.tsx
│       │   ├── StatusBar.tsx
│       │   ├── DemoButton.tsx
│       │   └── ExportButton.tsx
│       └── lib/
│           ├── api.ts
│           ├── graph-styles.ts
│           ├── graph-layout.ts
│           └── types.ts
└── demo-data/
    └── sample.txt
```

---

## Phase 1: 项目骨架

### Task 1: Git 初始化 + 基础文件

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `demo-data/sample.txt`

- [ ] **Step 1: 创建 .gitignore**

```
node_modules/
.next/
__pycache__/
*.pyc
.env
*.db
lancedb_data/
.pytest_cache/
dist/
```

- [ ] **Step 2: 创建 .env.example**

```
# DeepSeek
DEEPSEEK_API_KEY=sk-your-key-here

# Auth
SECRET_KEY=change-me-to-random-string
TEST_USERNAME=interviewer
TEST_PASSWORD=demo123

# OpenAI (optional fallback)
OPENAI_API_KEY=

# Anthropic (optional fallback)
ANTHROPIC_API_KEY=
```

- [ ] **Step 3: 创建 demo-data/sample.txt**

```
2024年人工智能领域迎来重大变革。OpenAI发布了GPT-4o模型，该模型由Sam Altman领导的团队开发，具备多模态能力，可以同时处理文本、图像和音频。与此同时，Anthropic公司推出了Claude 3.5 Sonnet，由Dario Amodei和Daniela Amodei兄妹创立的团队打造，在编程和推理任务上表现出色。

Google也不甘落后，发布了Gemini 2.0，由DeepMind团队在伦敦研发。微软则与OpenAI深度合作，由Satya Nadella宣布将在Azure云平台深度集成GPT-4o。

在中国，深度求索（DeepSeek）发布了DeepSeek-V3模型，由梁文锋创立的团队开发，以极低的训练成本达到了接近GPT-4的性能。阿里巴巴推出了通义千问2.5，百度发布了文心一言4.0。

这些模型在MMLU基准测试、HumanEval编程测试和GSM8K数学推理测试上展开了激烈竞争。其中GPT-4o在MMLU上得分88.7%，Claude 3.5 Sonnet在HumanEval上得分92.0%，DeepSeek-V3在GSM8K上得分90.3%。

Meta则选择开源路线，Mark Zuckerberg宣布发布Llama 3.1，包含405B参数版本。法国的Mistral AI也不甘示弱，推出了Mistral Large 2。
```

- [ ] **Step 4: 初始化 Git 仓库**

```bash
git init
git add .gitignore .env.example demo-data/
git commit -m "chore: initial project setup with gitignore and demo data"
```

---

### Task 2: Docker Compose + Nginx 配置

**Files:**
- Create: `docker-compose.yml`
- Create: `nginx/Dockerfile`
- Create: `nginx/nginx.conf`

- [ ] **Step 1: 创建 docker-compose.yml**

```yaml
version: "3.8"

services:
  nginx:
    build: ./nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - nextjs
      - fastapi
    restart: unless-stopped

  nextjs:
    build: ./frontend
    environment:
      - NEXT_PUBLIC_API_URL=
    restart: unless-stopped

  fastapi:
    build: ./backend
    environment:
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
      - SECRET_KEY=${SECRET_KEY}
      - TEST_USERNAME=${TEST_USERNAME}
      - TEST_PASSWORD=${TEST_PASSWORD}
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
    volumes:
      - ./lancedb_data:/app/lancedb_data
    restart: unless-stopped
```

- [ ] **Step 2: 创建 nginx/Dockerfile**

```dockerfile
FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
```

- [ ] **Step 3: 创建 nginx/nginx.conf**

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    client_max_body_size 50m;

    # 开发阶段先跑 HTTP；部署时改为 HTTPS + Let's Encrypt
    server {
        listen 80;
        server_name _;

        location /api/ {
            proxy_pass http://fastapi:8000/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_read_timeout 120s;
        }

        location / {
            proxy_pass http://nextjs:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /_next/ {
            proxy_pass http://nextjs:3000;
            proxy_set_header Host $host;
        }
    }
}
```

- [ ] **Step 4: 提交**

```bash
git add docker-compose.yml nginx/
git commit -m "chore: add docker compose and nginx config"
```

---

### Task 3: Backend 骨架

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/requirements.txt`
- Create: `backend/config.py`
- Create: `backend/main.py`
- Create: `backend/db/__init__.py`
- Create: `backend/agent/__init__.py`
- Create: `backend/routes/__init__.py`
- Create: `backend/services/__init__.py`
- Create: `backend/tests/__init__.py`

- [ ] **Step 1: 创建 backend/Dockerfile**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: 创建 backend/requirements.txt**

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
python-multipart==0.0.9
pydantic==2.9.2
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
lancedb==0.15.0
langchain==0.3.0
langchain-openai==0.2.0
langchain-anthropic==0.2.0
langchain-community==0.3.0
sentence-transformers==3.1.1
pdfplumber==0.11.0
python-docx==1.1.2
httpx==0.27.2
pyarrow==17.0.0
```

- [ ] **Step 3: 创建 backend/config.py**

```python
import os

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
TEST_USERNAME = os.getenv("TEST_USERNAME", "interviewer")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "demo123")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

LANCE_DB_PATH = os.getenv("LANCE_DB_PATH", "/app/lancedb_data")
```

- [ ] **Step 4: 创建 backend/main.py**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import router as auth_router
from routes.workspaces import router as ws_router
from routes.search import router as search_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    from services.embedder import Embedder
    app.state.embedder = Embedder()
    yield


app = FastAPI(title="Knowledge Graph API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(ws_router, prefix="/api")
app.include_router(search_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 5: 提交**

```bash
git add backend/
git commit -m "chore: add backend skeleton"
```

---

### Task 4: Frontend 骨架

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/package.json`
- Create: `frontend/next.config.js`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/postcss.config.js`
- Create: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/globals.css`
- Create: `frontend/src/lib/types.ts`

- [ ] **Step 1: 创建 frontend/Dockerfile**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 2: 创建 frontend/package.json**

```json
{
  "name": "knowledge-graph-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "cytoscape": "^3.30.2"
  },
  "devDependencies": {
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.3"
  }
}
```

- [ ] **Step 3: 创建 frontend/next.config.js**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
};

module.exports = nextConfig;
```

- [ ] **Step 4: 创建 frontend/tailwind.config.ts**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#fafafa",
        surface: "#ffffff",
        border: "#e5e5e5",
        text: "#1a1a1a",
        muted: "#6b7280",
        accent: "#374151",
        node: {
          person: "#64748b",
          org: "#78716c",
          concept: "#d4a574",
          location: "#8b8ca0",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 5: 创建 frontend/postcss.config.js**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: 创建 frontend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 7: 创建 frontend/src/app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #fafafa;
  color: #1a1a1a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue",
    sans-serif;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 8: 创建 frontend/src/app/layout.tsx**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Knowledge Graph Explorer",
  description: "Upload documents and explore entity relationships visually",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-bg text-text antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 9: 创建 frontend/src/lib/types.ts**

```typescript
export interface Workspace {
  id: string;
  name: string;
  entity_type: "named" | "concept";
  status: "processing" | "ready" | "error";
  created_at: string;
  file_count: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  metadata: Record<string, string>;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  weight: number;
}

export interface GraphSnapshot {
  id: string;
  workspace_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  created_at: string;
}

export interface SearchResult {
  matched_nodes: GraphNode[];
  subgraph_nodes: GraphNode[];
  subgraph_edges: GraphEdge[];
}

export interface ExtractStatus {
  status: "processing" | "ready" | "error";
  phase: string;
  progress: number;
  error_message?: string;
  raw_output?: string;
}
```

- [ ] **Step 10: 安装依赖并测试构建**

```bash
cd frontend && npm install
npm run build
```

- [ ] **Step 11: 提交**

```bash
git add frontend/
git commit -m "chore: add frontend skeleton with next.js and tailwind"
```

---

## Phase 2: 后端核心

### Task 5: 数据模型

**Files:**
- Create: `backend/db/models.py`

- [ ] **Step 1: 创建 backend/db/models.py**

```python
from __future__ import annotations
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import uuid4
from typing import Literal, Optional


def new_id() -> str:
    return uuid4().hex[:12]


def now() -> str:
    return datetime.utcnow().isoformat()


class User(BaseModel):
    id: str = Field(default_factory=new_id)
    username: str
    password_hash: str


class Workspace(BaseModel):
    id: str = Field(default_factory=new_id)
    user_id: str
    name: str
    entity_type: Literal["named", "concept"] = "named"
    status: Literal["processing", "ready", "error"] = "ready"
    created_at: str = Field(default_factory=now)


class FileRecord(BaseModel):
    id: str = Field(default_factory=new_id)
    workspace_id: str
    filename: str
    content: str
    uploaded_at: str = Field(default_factory=now)


class NodeModel(BaseModel):
    id: str
    label: str
    type: str
    metadata: dict = Field(default_factory=dict)


class EdgeModel(BaseModel):
    source: str
    target: str
    label: str
    weight: float = 1.0


class GraphSnapshot(BaseModel):
    id: str = Field(default_factory=new_id)
    workspace_id: str
    nodes: list[NodeModel] = Field(default_factory=list)
    edges: list[EdgeModel] = Field(default_factory=list)
    embedding_cache: dict[str, list[float]] = Field(default_factory=dict)
    created_at: str = Field(default_factory=now)


# ---- API request/response schemas ----

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str


class WorkspaceCreateRequest(BaseModel):
    name: str
    entity_type: Literal["named", "concept"] = "named"


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    entity_type: str
    status: str
    created_at: str
    file_count: int


class ExtractRequest(BaseModel):
    entity_type: Literal["named", "concept"]


class ExtractResponse(BaseModel):
    job_id: str


class StatusResponse(BaseModel):
    status: str
    phase: str
    progress: float
    error_message: Optional[str] = None
    raw_output: Optional[str] = None


class GraphResponse(BaseModel):
    id: str
    workspace_id: str
    nodes: list[NodeModel]
    edges: list[EdgeModel]
    created_at: str


class SearchResponse(BaseModel):
    matched_nodes: list[NodeModel]
    subgraph_nodes: list[NodeModel]
    subgraph_edges: list[EdgeModel]
```

- [ ] **Step 2: 提交**

```bash
git add backend/db/models.py
git commit -m "feat: add data models"
```

---

### Task 6: LanceDB Client

**Files:**
- Create: `backend/db/lancedb_client.py`

- [ ] **Step 1: 创建 backend/db/lancedb_client.py**

```python
import lancedb
from db.models import Workspace, FileRecord, GraphSnapshot
from config import LANCE_DB_PATH
import json


class LanceDBClient:
    def __init__(self, path: str = LANCE_DB_PATH):
        self.db = lancedb.connect(path)
        self._init_tables()

    def _init_tables(self):
        if "workspaces" not in self.db.table_names():
            self.db.create_table("workspaces", [{"id": "", "user_id": "", "name": "", "entity_type": "named", "status": "ready", "created_at": ""}])

        if "files" not in self.db.table_names():
            self.db.create_table("files", [{"id": "", "workspace_id": "", "filename": "", "content": "", "uploaded_at": ""}])

        if "snapshots" not in self.db.table_names():
            self.db.create_table("snapshots", [{"id": "", "workspace_id": "", "nodes_json": "[]", "edges_json": "[]", "embedding_cache_json": "{}", "created_at": ""}])

    # ---- Workspaces ----

    def create_workspace(self, ws: Workspace) -> Workspace:
        tbl = self.db.open_table("workspaces")
        tbl.add([ws.model_dump()])
        return ws

    def get_workspace(self, ws_id: str) -> Workspace | None:
        tbl = self.db.open_table("workspaces")
        results = tbl.search(ws_id, vector_column_name="id").limit(1).to_list()
        if not results:
            return None
        return Workspace(**results[0])

    def list_workspaces(self, user_id: str) -> list[Workspace]:
        tbl = self.db.open_table("workspaces")
        df = tbl.to_pandas()
        matches = df[df["user_id"] == user_id]
        return [Workspace(**row) for _, row in matches.iterrows()]

    def update_workspace_status(self, ws_id: str, status: str):
        tbl = self.db.open_table("workspaces")
        ws = self.get_workspace(ws_id)
        if ws:
            ws.status = status
            tbl.add([ws.model_dump()])

    def delete_workspace(self, ws_id: str):
        # soft delete by marking status; real delete via overwrite
        tbl_w = self.db.open_table("workspaces")
        df_w = tbl_w.to_pandas()
        df_w = df_w[df_w["id"] != ws_id]
        # recreate table
        self.db.drop_table("workspaces")
        self.db.create_table("workspaces", df_w)

        tbl_f = self.db.open_table("files")
        df_f = tbl_f.to_pandas()
        df_f = df_f[df_f["workspace_id"] != ws_id]
        self.db.drop_table("files")
        self.db.create_table("files", df_f)

        tbl_s = self.db.open_table("snapshots")
        df_s = tbl_s.to_pandas()
        df_s = df_s[df_s["workspace_id"] != ws_id]
        self.db.drop_table("snapshots")
        self.db.create_table("snapshots", df_s)

    # ---- Files ----

    def add_file(self, f: FileRecord) -> FileRecord:
        tbl = self.db.open_table("files")
        tbl.add([f.model_dump()])
        return f

    def list_files(self, ws_id: str) -> list[FileRecord]:
        tbl = self.db.open_table("files")
        df = tbl.to_pandas()
        matches = df[df["workspace_id"] == ws_id]
        return [FileRecord(**row) for _, row in matches.iterrows()]

    def delete_files_for_workspace(self, ws_id: str):
        tbl = self.db.open_table("files")
        df = tbl.to_pandas()
        df = df[df["workspace_id"] != ws_id]
        self.db.drop_table("files")
        self.db.create_table("files", df)

    # ---- Snapshots ----

    def save_snapshot(self, snap: GraphSnapshot):
        tbl = self.db.open_table("snapshots")
        # remove old snapshot for this workspace
        df = tbl.to_pandas()
        df = df[df["workspace_id"] != snap.workspace_id]
        self.db.drop_table("snapshots")
        self.db.create_table("snapshots", df)
        # insert new
        tbl = self.db.open_table("snapshots")
        row = {
            "id": snap.id,
            "workspace_id": snap.workspace_id,
            "nodes_json": json.dumps([n.model_dump() for n in snap.nodes], ensure_ascii=False),
            "edges_json": json.dumps([e.model_dump() for e in snap.edges], ensure_ascii=False),
            "embedding_cache_json": json.dumps(snap.embedding_cache, ensure_ascii=False),
            "created_at": snap.created_at,
        }
        tbl.add([row])

    def get_snapshot(self, ws_id: str) -> GraphSnapshot | None:
        tbl = self.db.open_table("snapshots")
        df = tbl.to_pandas()
        matches = df[df["workspace_id"] == ws_id]
        if matches.empty:
            return None
        row = matches.iloc[-1].to_dict()
        nodes = [NodeModel(**n) for n in json.loads(row["nodes_json"])]  # noqa: F821
        edges = [EdgeModel(**e) for e in json.loads(row["edges_json"])]  # noqa: F821
        embedding_cache = json.loads(row["embedding_cache_json"])
        return GraphSnapshot(
            id=row["id"],
            workspace_id=row["workspace_id"],
            nodes=nodes,
            edges=edges,
            embedding_cache=embedding_cache,
            created_at=row["created_at"],
        )


# Import at bottom to avoid circular import
from db.models import NodeModel, EdgeModel


client = LanceDBClient()
```

- [ ] **Step 2: 提交**

```bash
git add backend/db/lancedb_client.py
git commit -m "feat: add lancedb client"
```

---

### Task 7: 文件解析服务

**Files:**
- Create: `backend/services/file_parser.py`
- Create: `backend/tests/test_file_parser.py`

- [ ] **Step 1: 编写测试 backend/tests/test_file_parser.py**

```python
from services.file_parser import FileParser, UnsupportedFormatError


def test_parse_txt():
    parser = FileParser()
    content = "这是一段测试文本"
    result = parser.parse_from_bytes(content.encode("utf-8"), "test.txt")
    assert result == "这是一段测试文本"


def test_parse_md():
    parser = FileParser()
    content = "# 标题\n\n正文内容"
    result = parser.parse_from_bytes(content.encode("utf-8"), "test.md")
    assert "# 标题" in result
    assert "正文内容" in result


def test_unsupported_format():
    parser = FileParser()
    try:
        parser.parse_from_bytes(b"fake", "test.xyz")
        assert False, "should raise"
    except UnsupportedFormatError as e:
        assert "xyz" in str(e)
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd backend && python -m pytest tests/test_file_parser.py -v
```

Expected: FAIL — module not found.

- [ ] **Step 3: 创建 backend/services/file_parser.py**

```python
import io


class UnsupportedFormatError(Exception):
    def __init__(self, extension: str):
        self.extension = extension
        super().__init__(f"Unsupported file format: .{extension}")


class FileParser:
    SUPPORTED = {"txt", "md", "pdf", "docx"}

    def parse_from_bytes(self, data: bytes, filename: str) -> str:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in self.SUPPORTED:
            raise UnsupportedFormatError(ext)

        if ext == "txt":
            return data.decode("utf-8", errors="replace")
        elif ext == "md":
            return data.decode("utf-8", errors="replace")
        elif ext == "pdf":
            return self._parse_pdf(data)
        elif ext == "docx":
            return self._parse_docx(data)
        return ""

    def _parse_pdf(self, data: bytes) -> str:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
                # 表格提取
                for table in page.extract_tables():
                    for row in table:
                        if row:
                            text_parts.append(" | ".join(
                                str(cell) if cell else "" for cell in row
                            ))
        return "\n\n".join(text_parts)

    def _parse_docx(self, data: bytes) -> str:
        from docx import Document
        doc = Document(io.BytesIO(data))
        parts = []
        for para in doc.paragraphs:
            if para.text.strip():
                parts.append(para.text)
        for table in doc.tables:
            for row in table.rows:
                cells = [cell.text for cell in row.cells]
                parts.append(" | ".join(cells))
        return "\n\n".join(parts)
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd backend && python -m pytest tests/test_file_parser.py -v
```

Expected: 3 PASS.

- [ ] **Step 5: 提交**

```bash
git add backend/services/file_parser.py backend/tests/test_file_parser.py
git commit -m "feat: add file parser service (txt/md/pdf/docx)"
```

---

### Task 8: Embedder 服务

**Files:**
- Create: `backend/services/embedder.py`

- [ ] **Step 1: 创建 backend/services/embedder.py**

```python
from sentence_transformers import SentenceTransformer
import numpy as np


class Embedder:
    def __init__(self, model_name: str = "BAAI/bge-small-zh"):
        self.model = SentenceTransformer(model_name)

    def embed(self, text: str) -> list[float]:
        """返回单个文本的 embedding 向量"""
        vector = self.model.encode(text, normalize_embeddings=True)
        return vector.tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """批量 embedding"""
        vectors = self.model.encode(texts, normalize_embeddings=True)
        return vectors.tolist()

    def similarity(
        self, query_vec: list[float], target_vec: list[float]
    ) -> float:
        """余弦相似度（向量已归一化时等价于点积）"""
        return float(np.dot(query_vec, target_vec))
```

- [ ] **Step 2: 提交**

```bash
git add backend/services/embedder.py
git commit -m "feat: add embedder service (bge-small-zh)"
```

---

## Phase 3: Agent 层

### Task 9: Provider 层 — Base + DeepSeek

**Files:**
- Create: `backend/agent/providers/__init__.py`
- Create: `backend/agent/providers/base.py`
- Create: `backend/agent/providers/deepseek.py`

- [ ] **Step 1: 创建 backend/agent/providers/__init__.py**

```python
from agent.providers.base import BaseProvider
from agent.providers.deepseek import DeepSeekProvider
from agent.providers.openai import OpenAIProvider
from agent.providers.claude import ClaudeProvider
from config import DEEPSEEK_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY


def get_provider(name: str = "deepseek") -> BaseProvider:
    if name == "deepseek" and DEEPSEEK_API_KEY:
        return DeepSeekProvider()
    elif name == "openai" and OPENAI_API_KEY:
        return OpenAIProvider()
    elif name == "claude" and ANTHROPIC_API_KEY:
        return ClaudeProvider()
    elif DEEPSEEK_API_KEY:
        return DeepSeekProvider()
    raise ValueError("No available LLM provider configured")
```

- [ ] **Step 2: 创建 backend/agent/providers/base.py**

```python
from abc import ABC, abstractmethod
from langchain_core.language_models.chat_models import BaseChatModel


class BaseProvider(ABC):
    @abstractmethod
    def get_llm(self, temperature: float = 0.1) -> BaseChatModel:
        ...

    def get_name(self) -> str:
        return self.__class__.__name__.replace("Provider", "").lower()
```

- [ ] **Step 3: 创建 backend/agent/providers/deepseek.py**

```python
from langchain_openai import ChatOpenAI
from agent.providers.base import BaseProvider
from langchain_core.language_models.chat_models import BaseChatModel
from config import DEEPSEEK_API_KEY


class DeepSeekProvider(BaseProvider):
    def get_llm(self, temperature: float = 0.1) -> BaseChatModel:
        return ChatOpenAI(
            model="deepseek-chat",
            api_key=DEEPSEEK_API_KEY,
            base_url="https://api.deepseek.com/v1",
            temperature=temperature,
            max_tokens=4096,
        )
```

- [ ] **Step 4: 提交**

```bash
git add backend/agent/providers/
git commit -m "feat: add provider base + deepseek"
```

---

### Task 10: Agent Prompts

**Files:**
- Create: `backend/agent/prompts.py`

- [ ] **Step 1: 创建 backend/agent/prompts.py**

```python
NAMED_ENTITY_PROMPT = """你是一个命名实体关系抽取专家。分析以下文本，提取所有命名实体及它们之间的关系。

命名实体类型：
- person: 人物（真实或虚构）
- organization: 组织、公司、机构
- location: 地点、地理位置
- event: 事件、活动

对于每个实体，提取其 name（名称）和 type（类型）。
对于每一对相关实体，提取它们之间的关系（用简短动词短语描述，如 "任职于"、"创建"、"位于"、"参加"）。

严格返回 JSON 格式，不要任何额外文字：
{
  "nodes": [
    {"id": "n1", "label": "实体名称", "type": "person", "metadata": {"context": "原文相关片段"}},
    {"id": "n2", "label": "实体名称", "type": "organization", "metadata": {"context": "原文相关片段"}}
  ],
  "edges": [
    {"source": "n1", "target": "n2", "label": "关系描述", "weight": 1.0}
  ]
}

规则：
- 每个实体的 id 必须是唯一字符串（n1, n2, n3...）
- 只提取有意义的实体，忽略代词和泛指词汇
- 关系方向要准确：A 创建了 B 则 source=A, target=B
- 如果文中没有明确关系，不要强行编造
- metadata.context 取原文中包含该实体的一句话

文本如下：
{text}

请直接返回 JSON："""


CONCEPT_EXTRACTION_PROMPT = """你是一个概念关系抽取专家。分析以下文本，提取关键概念及它们之间的逻辑关系。

概念类型：
- technology: 技术、工具、方法
- theory: 理论、原理、思想
- metric: 指标、数据、测量标准
- organization: 组织、公司、机构
- person: 相关人物

对于每个概念，提取其 name（名称）和 type（类型）。
对于每一对相关概念，提取它们之间的逻辑关系（如 "依赖"、"改进"、"提出"、"对比"、"属于"、"应用" 等简短动词短语）。

严格返回 JSON 格式，不要任何额外文字：
{
  "nodes": [
    {"id": "n1", "label": "概念名称", "type": "technology", "metadata": {"context": "原文相关片段"}},
    {"id": "n2", "label": "概念名称", "type": "theory", "metadata": {"context": "原文相关片段"}}
  ],
  "edges": [
    {"source": "n1", "target": "n2", "label": "关系描述", "weight": 1.0}
  ]
}

规则：
- 每个实体的 id 必须是唯一字符串（n1, n2, n3...）
- 只提取有意义的、具体的关键概念
- 关系方向要准确反映逻辑关系
- 如果文中没有明确关系，不要强行编造
- metadata.context 取原文中包含该概念的一句话

文本如下：
{text}

请直接返回 JSON："""


def get_prompt(entity_type: str) -> str:
    if entity_type == "concept":
        return CONCEPT_EXTRACTION_PROMPT
    return NAMED_ENTITY_PROMPT
```

- [ ] **Step 2: 提交**

```bash
git add backend/agent/prompts.py
git commit -m "feat: add chinese extraction prompts"
```

---

### Task 11: Chunker

**Files:**
- Create: `backend/agent/chunker.py`
- Create: `backend/tests/test_chunker.py`

- [ ] **Step 1: 编写测试 backend/tests/test_chunker.py**

```python
from agent.chunker import Chunker


def test_short_text_single_chunk():
    c = Chunker(max_chars=1000, overlap=50)
    text = "这是一段短文本。只有两句话。"
    chunks = c.split(text)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_long_text_multiple_chunks():
    c = Chunker(max_chars=100, overlap=20)
    paragraph = "这是一个测试段落。" * 30
    chunks = c.split(paragraph)
    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk) <= 100 + 20  # max_chars + overlap tolerance


def test_paragraph_boundary_respected():
    c = Chunker(max_chars=200, overlap=30)
    text = "段落一。\n\n段落二。\n\n段落三。"
    chunks = c.split(text)
    assert len(chunks) >= 1


def test_overlap_includes_context():
    c = Chunker(max_chars=150, overlap=30)
    text = "A" * 100 + "\n\n" + "B" * 100 + "\n\n" + "C" * 100
    chunks = c.split(text)
    if len(chunks) > 1:
        first_end = chunks[0][-30:]
        second_start = chunks[1][:30]
        # overlap means there should be some shared context
        assert len(first_end) > 0
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd backend && python -m pytest tests/test_chunker.py -v
```

Expected: FAIL.

- [ ] **Step 3: 创建 backend/agent/chunker.py**

```python
class Chunker:
    def __init__(self, max_chars: int = 12000, overlap: int = 300):
        self.max_chars = max_chars
        self.overlap = overlap

    def split(self, text: str) -> list[str]:
        """按段落边界分块，保持重叠窗口。"""
        if not text.strip():
            return []

        paragraphs = text.split("\n\n")
        chunks = []
        current = ""
        overlap_buffer = ""

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            if len(current) + len(para) + 2 <= self.max_chars:
                if current:
                    current += "\n\n" + para
                else:
                    current = para
            else:
                if current:
                    chunks.append(current)
                    overlap_buffer = current[-self.overlap:] if len(current) > self.overlap else current
                    current = overlap_buffer + "\n\n" + para if overlap_buffer else para
                else:
                    # 单段落超出 max_chars，硬切
                    for i in range(0, len(para), self.max_chars - self.overlap):
                        chunk = para[i:i + self.max_chars]
                        chunks.append(chunk)
                    current = ""
                    overlap_buffer = ""

        if current.strip():
            chunks.append(current)

        return chunks if chunks else [text]
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd backend && python -m pytest tests/test_chunker.py -v
```

Expected: 4 PASS.

- [ ] **Step 5: 提交**

```bash
git add backend/agent/chunker.py backend/tests/test_chunker.py
git commit -m "feat: add text chunker with paragraph-boundary splitting"
```

---

### Task 12: Extractor（核心 Agent）

**Files:**
- Create: `backend/agent/extractor.py`
- Create: `backend/tests/test_extractor.py`

- [ ] **Step 1: 编写测试 backend/tests/test_extractor.py**

```python
import json
from agent.extractor import KnowledgeGraphExtractor, get_provider
from agent.prompts import NAMED_ENTITY_PROMPT


def test_extractor_returns_valid_structure():
    """集成测试——需设置 DEEPSEEK_API_KEY 环境变量"""
    import os
    if not os.getenv("DEEPSEEK_API_KEY"):
        return  # skip if no key

    provider = get_provider("deepseek")
    extractor = KnowledgeGraphExtractor(provider)

    text = "张三在北京创立了字节跳动公司。李四是该公司的首席技术官。"
    result = extractor.extract(text, "named")

    assert "nodes" in result
    assert "edges" in result
    assert len(result["nodes"]) >= 2  # at least 2 entities
    for node in result["nodes"]:
        assert "id" in node
        assert "label" in node
        assert "type" in node


def test_extractor_handles_empty_text():
    """空文本应返回空图"""
    extractor = KnowledgeGraphExtractor(None)  # no provider needed
    result = extractor.extract("", "named")
    assert result == {"nodes": [], "edges": []}
```

- [ ] **Step 2: 创建 backend/agent/extractor.py**

```python
import json
import re
import logging
from langchain.schema import HumanMessage, SystemMessage
from agent.providers.base import BaseProvider
from agent.prompts import get_prompt

logger = logging.getLogger(__name__)


class KnowledgeGraphExtractor:
    def __init__(self, provider: BaseProvider | None = None):
        self.provider = provider

    def extract(self, text: str, entity_type: str, max_retries: int = 2) -> dict:
        """从文本中抽取实体和关系。失败时静默重试。"""
        if not text.strip():
            return {"nodes": [], "edges": []}

        if self.provider is None:
            return {"nodes": [], "edges": []}

        prompt_template = get_prompt(entity_type)
        prompt = prompt_template.format(text=text)
        llm = self.provider.get_llm(temperature=0.1)

        last_raw = ""
        for attempt in range(max_retries + 1):
            try:
                response = llm.invoke([HumanMessage(content=prompt)])
                raw = response.content.strip()
                last_raw = raw
                result = self._parse_json(raw)
                self._validate(result)
                return result
            except (json.JSONDecodeError, ValueError, KeyError) as e:
                logger.warning(
                    f"Extraction attempt {attempt + 1} failed: {e}"
                )
                if attempt == max_retries:
                    return {
                        "nodes": [],
                        "edges": [],
                        "_error": str(e),
                        "_raw_output": last_raw,
                    }

        return {"nodes": [], "edges": []}

    def extract_batch(
        self, chunks: list[str], entity_type: str
    ) -> list[dict]:
        """逐块抽取，返回原始结果列表。"""
        results = []
        for i, chunk in enumerate(chunks):
            logger.info(f"Extracting chunk {i + 1}/{len(chunks)}")
            result = self.extract(chunk, entity_type)
            if "_error" not in result:
                # 重新编号节点 id 以避免跨块冲突
                result = self._reindex(result, prefix=f"c{i}")
            results.append(result)
        return results

    def _parse_json(self, raw: str) -> dict:
        """从 LLM 输出中提取 JSON。"""
        # 尝试直接解析
        raw = raw.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*\n?", "", raw)
            raw = re.sub(r"\n?```\s*$", "", raw)

        # 找到最外层 {}
        start = raw.find("{")
        end = raw.rfind("}")
        if start != -1 and end != -1:
            raw = raw[start : end + 1]

        return json.loads(raw)

    def _validate(self, result: dict):
        """验证抽取结果的结构。"""
        if "nodes" not in result:
            raise ValueError("Missing 'nodes' key")
        if "edges" not in result:
            result["edges"] = []
        for node in result["nodes"]:
            if "id" not in node or "label" not in node:
                raise ValueError(f"Node missing id/label: {node}")

    def _reindex(self, result: dict, prefix: str) -> dict:
        """给节点 id 加前缀以避免跨块冲突。"""
        id_map = {}
        new_nodes = []
        for node in result.get("nodes", []):
            old_id = node["id"]
            new_id = f"{prefix}_{old_id}"
            id_map[old_id] = new_id
            node["id"] = new_id
            new_nodes.append(node)

        new_edges = []
        for edge in result.get("edges", []):
            src = id_map.get(edge["source"], edge["source"])
            tgt = id_map.get(edge["target"], edge["target"])
            edge["source"] = src
            edge["target"] = tgt
            new_edges.append(edge)

        return {"nodes": new_nodes, "edges": new_edges}
```

- [ ] **Step 3: 运行测试**

```bash
cd backend && python -m pytest tests/test_extractor.py -v
```

Expected: test_extractor_handles_empty_text PASS, test_extractor_returns_valid_structure SKIP (no API key set up locally yet — will work in Docker).

- [ ] **Step 4: 提交**

```bash
git add backend/agent/extractor.py backend/tests/test_extractor.py
git commit -m "feat: add knowledge graph extractor agent"
```

---

### Task 13: Merger

**Files:**
- Create: `backend/agent/merger.py`
- Create: `backend/tests/test_merger.py`

- [ ] **Step 1: 编写测试 backend/tests/test_merger.py**

```python
from agent.merger import Merger


def test_merge_deduplicates_similar_nodes():
    results = [
        {
            "nodes": [
                {"id": "c0_n1", "label": "张三", "type": "person", "metadata": {}},
                {"id": "c0_n2", "label": "北京", "type": "location", "metadata": {}},
            ],
            "edges": [
                {"source": "c0_n1", "target": "c0_n2", "label": "住在", "weight": 1.0},
            ],
        },
        {
            "nodes": [
                {"id": "c1_n1", "label": "张三", "type": "person", "metadata": {}},
                {"id": "c1_n2", "label": "上海", "type": "location", "metadata": {}},
            ],
            "edges": [
                {"source": "c1_n1", "target": "c1_n2", "label": "工作", "weight": 1.0},
            ],
        },
    ]

    merged = Merger.merge(results)
    # "张三" should be deduplicated => 3 unique nodes, not 4
    labels = [n["label"] for n in merged["nodes"]]
    assert labels.count("张三") == 1
    assert len(merged["nodes"]) == 3
    assert len(merged["edges"]) == 2


def test_merge_combines_edge_weights():
    results = [
        {
            "nodes": [
                {"id": "c0_n1", "label": "A", "type": "person", "metadata": {}},
                {"id": "c0_n2", "label": "B", "type": "person", "metadata": {}},
            ],
            "edges": [
                {"source": "c0_n1", "target": "c0_n2", "label": "认识", "weight": 1.0},
            ],
        },
        {
            "nodes": [
                {"id": "c1_n1", "label": "A", "type": "person", "metadata": {}},
                {"id": "c1_n2", "label": "B", "type": "person", "metadata": {}},
            ],
            "edges": [
                {"source": "c1_n1", "target": "c1_n2", "label": "认识", "weight": 1.0},
            ],
        },
    ]

    merged = Merger.merge(results)
    assert len(merged["edges"]) == 1
    assert merged["edges"][0]["weight"] == 2.0


def test_merge_preserves_unique_nodes():
    results = [
        {
            "nodes": [
                {"id": "c0_n1", "label": "独有实体", "type": "concept", "metadata": {}},
            ],
            "edges": [],
        },
    ]
    merged = Merger.merge(results)
    assert len(merged["nodes"]) == 1
    assert merged["nodes"][0]["label"] == "独有实体"
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd backend && python -m pytest tests/test_merger.py -v
```

Expected: FAIL.

- [ ] **Step 3: 创建 backend/agent/merger.py**

```python
from difflib import SequenceMatcher


class Merger:
    @staticmethod
    def merge(results: list[dict], similarity_threshold: float = 0.8) -> dict:
        """合并多个抽取结果，去重节点和边。"""
        all_nodes = []
        all_edges = []

        for result in results:
            if "_error" in result:
                continue
            all_nodes.extend(result.get("nodes", []))
            all_edges.extend(result.get("edges", []))

        # 节点去重
        unique_nodes = []
        seen_labels = {}  # normalized_label -> index

        for node in all_nodes:
            label = node["label"].strip()
            matched = False
            for existing_label, idx in seen_labels.items():
                if Merger._similar(label, existing_label, similarity_threshold):
                    # 合并 metadata
                    if "metadata" in node and node["metadata"]:
                        existing_meta = unique_nodes[idx].get("metadata", {})
                        existing_meta.update(node["metadata"])
                        unique_nodes[idx]["metadata"] = existing_meta
                    matched = True
                    # 更新 id 映射 — 所有引用旧 id 的边改指向
                    old_id = node["id"]
                    new_id = unique_nodes[idx]["id"]
                    for edge in all_edges:
                        if edge["source"] == old_id:
                            edge["source"] = new_id
                        if edge["target"] == old_id:
                            edge["target"] = new_id
                    break

            if not matched:
                seen_labels[label] = len(unique_nodes)
                unique_nodes.append(node)

        # 边去重
        edge_map = {}  # (source, target, label) -> weight
        for edge in all_edges:
            key = (edge["source"], edge["target"], edge["label"])
            if key in edge_map:
                edge_map[key] += edge.get("weight", 1.0)
            else:
                edge_map[key] = edge.get("weight", 1.0)

        unique_edges = [
            {"source": s, "target": t, "label": l, "weight": w}
            for (s, t, l), w in edge_map.items()
        ]

        # 给节点统一重新编号
        id_map = {}
        for i, node in enumerate(unique_nodes):
            old_id = node["id"]
            new_id = f"n{i + 1}"
            id_map[old_id] = new_id
            node["id"] = new_id

        for edge in unique_edges:
            edge["source"] = id_map.get(edge["source"], edge["source"])
            edge["target"] = id_map.get(edge["target"], edge["target"])

        return {"nodes": unique_nodes, "edges": unique_edges}

    @staticmethod
    def _similar(a: str, b: str, threshold: float) -> bool:
        if a == b:
            return True
        # 一个完全包含另一个
        if a in b or b in a:
            return True
        return SequenceMatcher(None, a, b).ratio() >= threshold
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd backend && python -m pytest tests/test_merger.py -v
```

Expected: 3 PASS.

- [ ] **Step 5: 提交**

```bash
git add backend/agent/merger.py backend/tests/test_merger.py
git commit -m "feat: add merger with similarity-based deduplication"
```

---

### Task 14: 抽取编排服务

**Files:**
- Create: `backend/services/extract_service.py`

- [ ] **Step 1: 创建 backend/services/extract_service.py**

```python
import logging
from db.lancedb_client import client as db
from db.models import (
    Workspace, GraphSnapshot, NodeModel, EdgeModel
)
from agent.chunker import Chunker
from agent.extractor import KnowledgeGraphExtractor
from agent.merger import Merger
from agent.providers import get_provider

logger = logging.getLogger(__name__)

# 全局抽取状态追踪
_jobs: dict[str, dict] = {}


def get_job_status(job_id: str) -> dict | None:
    return _jobs.get(job_id)


async def run_extraction(workspace_id: str, entity_type: str):
    """后台异步抽取任务。"""
    job_id = workspace_id
    _jobs[job_id] = {
        "status": "processing",
        "phase": "loading",
        "progress": 0.0,
    }

    try:
        # Phase 1: 加载文件
        _jobs[job_id]["phase"] = "loading"
        _jobs[job_id]["progress"] = 0.05
        files = db.list_files(workspace_id)
        if not files:
            raise ValueError("No files in workspace")

        combined_text = "\n\n".join(f.content for f in files)
        db.update_workspace_status(workspace_id, "processing")

        # Phase 2: 分块
        _jobs[job_id]["phase"] = "chunking"
        _jobs[job_id]["progress"] = 0.1
        chunker = Chunker(max_chars=12000, overlap=300)
        chunks = chunker.split(combined_text)
        logger.info(f"Split into {len(chunks)} chunks")

        # Phase 3: AI 抽取
        _jobs[job_id]["phase"] = "extracting"
        _jobs[job_id]["progress"] = 0.2
        provider = get_provider("deepseek")
        extractor = KnowledgeGraphExtractor(provider)
        results = extractor.extract_batch(chunks, entity_type)

        # Phase 4: 合并去重
        _jobs[job_id]["phase"] = "merging"
        _jobs[job_id]["progress"] = 0.7
        merged = Merger.merge(results)

        if "_error" in merged or not merged.get("nodes"):
            # extraction failed entirely
            error_msg = merged.get("_error", "No entities found")
            raw = merged.get("_raw_output", "")
            _jobs[job_id] = {
                "status": "error",
                "phase": "done",
                "progress": 1.0,
                "error_message": error_msg,
                "raw_output": raw,
            }
            db.update_workspace_status(workspace_id, "error")
            return

        # Phase 5: 生成 embeddings
        _jobs[job_id]["phase"] = "embedding"
        _jobs[job_id]["progress"] = 0.85

        from services.embedder import Embedder
        import asyncio
        embedder = Embedder()

        labels = [n["label"] for n in merged["nodes"]]
        vectors = await asyncio.to_thread(embedder.embed_batch, labels)
        embedding_cache = {
            merged["nodes"][i]["id"]: vectors[i] for i in range(len(labels))
        }

        # Phase 6: 保存
        _jobs[job_id]["phase"] = "saving"
        _jobs[job_id]["progress"] = 0.95

        nodes = [
            NodeModel(
                id=n["id"],
                label=n["label"],
                type=n.get("type", "unknown"),
                metadata=n.get("metadata", {}),
            )
            for n in merged["nodes"]
        ]
        edges = [
            EdgeModel(
                source=e["source"],
                target=e["target"],
                label=e["label"],
                weight=e.get("weight", 1.0),
            )
            for e in merged["edges"]
        ]

        snapshot = GraphSnapshot(
            workspace_id=workspace_id,
            nodes=nodes,
            edges=edges,
            embedding_cache=embedding_cache,
        )
        db.save_snapshot(snapshot)
        db.update_workspace_status(workspace_id, "ready")

        _jobs[job_id] = {
            "status": "ready",
            "phase": "done",
            "progress": 1.0,
        }

    except Exception as e:
        logger.exception(f"Extraction failed for workspace {workspace_id}")
        _jobs[job_id] = {
            "status": "error",
            "phase": "done",
            "progress": 1.0,
            "error_message": str(e),
        }
        db.update_workspace_status(workspace_id, "error")
```

- [ ] **Step 2: 提交**

```bash
git add backend/services/extract_service.py
git commit -m "feat: add async extraction orchestration service"
```

---

### Task 15: OpenAI + Claude Provider（备用）

**Files:**
- Create: `backend/agent/providers/openai.py`
- Create: `backend/agent/providers/claude.py`

- [ ] **Step 1: 创建 backend/agent/providers/openai.py**

```python
from langchain_openai import ChatOpenAI
from agent.providers.base import BaseProvider
from langchain_core.language_models.chat_models import BaseChatModel
from config import OPENAI_API_KEY


class OpenAIProvider(BaseProvider):
    def get_llm(self, temperature: float = 0.1) -> BaseChatModel:
        return ChatOpenAI(
            model="gpt-4o",
            api_key=OPENAI_API_KEY,
            temperature=temperature,
            max_tokens=4096,
        )
```

- [ ] **Step 2: 创建 backend/agent/providers/claude.py**

```python
from langchain_anthropic import ChatAnthropic
from agent.providers.base import BaseProvider
from langchain_core.language_models.chat_models import BaseChatModel
from config import ANTHROPIC_API_KEY


class ClaudeProvider(BaseProvider):
    def get_llm(self, temperature: float = 0.1) -> BaseChatModel:
        return ChatAnthropic(
            model="claude-sonnet-4-6-20250514",
            api_key=ANTHROPIC_API_KEY,
            temperature=temperature,
            max_tokens=4096,
        )
```

- [ ] **Step 3: 提交**

```bash
git add backend/agent/providers/openai.py backend/agent/providers/claude.py
git commit -m "feat: add openai and claude backup providers"
```

---

## Phase 4: 后端路由

### Task 16: Auth 路由

**Files:**
- Create: `backend/routes/auth.py`

- [ ] **Step 1: 创建 backend/routes/auth.py**

```python
from fastapi import APIRouter, HTTPException
from passlib.hash import bcrypt
from jose import jwt
from db.models import LoginRequest, LoginResponse
from config import SECRET_KEY, TEST_USERNAME, TEST_PASSWORD

router = APIRouter(tags=["auth"])

# 预计算密码哈希
_password_hash = bcrypt.hash(TEST_PASSWORD)


@router.post("/auth/login", response_model=LoginResponse)
def login(req: LoginRequest):
    if req.username != TEST_USERNAME:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not bcrypt.verify(req.password, _password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = jwt.encode({"sub": req.username}, SECRET_KEY, algorithm="HS256")
    return LoginResponse(token=token)


def verify_token(token: str) -> str:
    """验证 JWT token，返回 username。"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload.get("sub", "")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(authorization: str) -> str:
    """从 Authorization header 提取用户。"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    return verify_token(token)
```

- [ ] **Step 2: 提交**

```bash
git add backend/routes/auth.py
git commit -m "feat: add auth route with jwt login"
```

---

### Task 17: Workspace 路由

**Files:**
- Create: `backend/routes/workspaces.py`

- [ ] **Step 1: 创建 backend/routes/workspaces.py**

```python
import asyncio
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Header
from db.lancedb_client import client as db
from db.models import (
    Workspace, FileRecord, WorkspaceCreateRequest, WorkspaceResponse,
    ExtractRequest, ExtractResponse, StatusResponse, GraphResponse
)
from routes.auth import get_current_user
from services.file_parser import FileParser, UnsupportedFormatError
from services.extract_service import run_extraction, get_job_status

router = APIRouter(tags=["workspaces"])


def _auth(authorization: str = Header(...)) -> str:
    return get_current_user(authorization)


@router.post("/workspaces", response_model=dict)
def create_workspace(
    req: WorkspaceCreateRequest,
    authorization: str = Header(...),
):
    user = _auth(authorization)
    ws = Workspace(user_id=user, name=req.name, entity_type=req.entity_type)
    db.create_workspace(ws)
    return {"workspace_id": ws.id}


@router.post("/workspaces/{ws_id}/upload")
async def upload_file(
    ws_id: str,
    file: UploadFile = File(...),
    authorization: str = Header(...),
):
    _auth(authorization)
    ws = db.get_workspace(ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    data = await file.read()
    parser = FileParser()
    try:
        content = parser.parse_from_bytes(data, file.filename or "untitled.txt")
    except UnsupportedFormatError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format: .{e.extension}. Supported: {', '.join(parser.SUPPORTED)}"
        )

    fr = FileRecord(
        workspace_id=ws_id,
        filename=file.filename or "untitled.txt",
        content=content,
    )
    db.add_file(fr)
    return {"file_id": fr.id, "filename": fr.filename, "size_chars": len(content)}


@router.post("/workspaces/{ws_id}/extract", response_model=ExtractResponse)
def trigger_extract(
    ws_id: str,
    req: ExtractRequest,
    authorization: str = Header(...),
):
    _auth(authorization)
    ws = db.get_workspace(ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    ws.entity_type = req.entity_type
    db.update_workspace_status(ws_id, "processing")

    asyncio.create_task(run_extraction(ws_id, req.entity_type))
    return ExtractResponse(job_id=ws_id)


@router.get("/workspaces/{ws_id}/status", response_model=StatusResponse)
def get_status(ws_id: str, authorization: str = Header(...)):
    _auth(authorization)
    job = get_job_status(ws_id)
    if job:
        return StatusResponse(**job)
    ws = db.get_workspace(ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return StatusResponse(status=ws.status, phase="idle", progress=0.0)


@router.get("/workspaces/{ws_id}/graph", response_model=GraphResponse)
def get_graph(ws_id: str, authorization: str = Header(...)):
    _auth(authorization)
    snap = db.get_snapshot(ws_id)
    if not snap:
        raise HTTPException(status_code=404, detail="No graph found")
    return snap


@router.get("/workspaces")
def list_workspaces(authorization: str = Header(...)):
    user = _auth(authorization)
    workspaces = db.list_workspaces(user)
    return [
        WorkspaceResponse(
            id=ws.id,
            name=ws.name,
            entity_type=ws.entity_type,
            status=ws.status,
            created_at=ws.created_at,
            file_count=len(db.list_files(ws.id)),
        )
        for ws in workspaces
    ]


@router.delete("/workspaces/{ws_id}")
def delete_workspace(ws_id: str, authorization: str = Header(...)):
    _auth(authorization)
    ws = db.get_workspace(ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    db.delete_workspace(ws_id)
    return {"deleted": ws_id}
```

- [ ] **Step 2: 提交**

```bash
git add backend/routes/workspaces.py
git commit -m "feat: add workspace CRUD + upload + extract routes"
```

---

### Task 18: 搜索路由

**Files:**
- Create: `backend/routes/search.py`

- [ ] **Step 1: 创建 backend/routes/search.py**

```python
from fastapi import APIRouter, HTTPException, Query, Request, Header
from db.lancedb_client import client as db
from db.models import SearchResponse, NodeModel, EdgeModel
from routes.auth import get_current_user

router = APIRouter(tags=["search"])


@router.get("/workspaces/{ws_id}/search", response_model=SearchResponse)
def semantic_search(
    ws_id: str,
    q: str = Query(..., min_length=1),
    authorization: str = Header(...),
    request: Request = None,
):
    get_current_user(authorization)

    snap = db.get_snapshot(ws_id)
    if not snap:
        raise HTTPException(status_code=404, detail="No graph found")

    if not q.strip() or not snap.embedding_cache:
        return SearchResponse(
            matched_nodes=[],
            subgraph_nodes=[],
            subgraph_edges=[],
        )

    # Embed query
    embedder = request.app.state.embedder
    query_vec = embedder.embed(q.strip())

    # Compute similarity
    scored = []
    for node in snap.nodes:
        node_vec = snap.embedding_cache.get(node.id)
        if node_vec:
            score = embedder.similarity(query_vec, node_vec)
            scored.append((node, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    top_k = scored[:5]

    if not top_k:
        return SearchResponse(
            matched_nodes=[],
            subgraph_nodes=[],
            subgraph_edges=[],
        )

    matched_ids = {n.id for n, _ in top_k}

    # 展开 2-hop 邻居
    neighbor_ids = set()
    for _ in range(2):
        new_neighbors = set()
        for edge in snap.edges:
            if edge.source in matched_ids and edge.target not in matched_ids:
                new_neighbors.add(edge.target)
            if edge.target in matched_ids and edge.source not in matched_ids:
                new_neighbors.add(edge.source)
        neighbor_ids.update(new_neighbors)
        matched_ids.update(new_neighbors)

    subgraph_nodes = [n for n in snap.nodes if n.id in matched_ids]
    subgraph_edges = [
        e for e in snap.edges
        if e.source in matched_ids and e.target in matched_ids
    ]

    return SearchResponse(
        matched_nodes=[n for n, _ in top_k],
        subgraph_nodes=subgraph_nodes,
        subgraph_edges=subgraph_edges,
    )
```

- [ ] **Step 2: 提交**

```bash
git add backend/routes/search.py
git commit -m "feat: add semantic search route with 2-hop expansion"
```

---

## Phase 5: 前端核心

### Task 19: API 客户端 + Graph 样式

**Files:**
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/graph-styles.ts`
- Create: `frontend/src/lib/graph-layout.ts`

- [ ] **Step 1: 创建 frontend/src/lib/api.ts**

```typescript
import {
  Workspace,
  GraphSnapshot,
  SearchResult,
  ExtractStatus,
} from "./types";

const BASE = "/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(
  username: string,
  password: string
): Promise<string> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  const data = await res.json();
  localStorage.setItem("token", data.token);
  return data.token;
}

export async function createWorkspace(
  name: string,
  entityType: "named" | "concept"
): Promise<string> {
  const res = await fetch(`${BASE}/workspaces`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ name, entity_type: entityType }),
  });
  const data = await res.json();
  return data.workspace_id;
}

export async function uploadFile(
  workspaceId: string,
  file: File
): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/workspaces/${workspaceId}/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error("Upload failed");
}

export async function triggerExtract(
  workspaceId: string,
  entityType: "named" | "concept"
): Promise<void> {
  const res = await fetch(`${BASE}/workspaces/${workspaceId}/extract`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ entity_type: entityType }),
  });
  if (!res.ok) throw new Error("Extract trigger failed");
}

export async function getExtractStatus(
  workspaceId: string
): Promise<ExtractStatus> {
  const res = await fetch(`${BASE}/workspaces/${workspaceId}/status`, {
    headers: authHeaders(),
  });
  return res.json();
}

export async function getGraph(
  workspaceId: string
): Promise<GraphSnapshot> {
  const res = await fetch(`${BASE}/workspaces/${workspaceId}/graph`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Graph not found");
  return res.json();
}

export async function semanticSearch(
  workspaceId: string,
  query: string
): Promise<SearchResult> {
  const res = await fetch(
    `${BASE}/workspaces/${workspaceId}/search?q=${encodeURIComponent(query)}`,
    { headers: authHeaders() }
  );
  return res.json();
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const res = await fetch(`${BASE}/workspaces`, {
    headers: authHeaders(),
  });
  return res.json();
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  await fetch(`${BASE}/workspaces/${workspaceId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export function logout() {
  localStorage.removeItem("token");
}
```

- [ ] **Step 2: 创建 frontend/src/lib/graph-styles.ts**

```typescript
import cytoscape from "cytoscape";

export const GRAPH_STYLES: cytoscape.Stylesheet[] = [
  {
    selector: "node",
    style: {
      "background-color": "#64748b",
      label: "data(label)",
      "text-valign": "bottom",
      "text-halign": "center",
      "font-size": "11px",
      "font-family":
        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: "#1a1a1a",
      "text-max-width": "120px",
      "text-wrap": "ellipsis",
      width: 12,
      height: 12,
      "border-width": 2,
      "border-color": "#fafafa",
      "transition-property": "background-color, width, height, opacity",
      "transition-duration": "200ms",
    },
  },
  {
    selector: "node[type='person']",
    style: { "background-color": "#64748b" },
  },
  {
    selector: "node[type='organization']",
    style: { "background-color": "#78716c" },
  },
  {
    selector: "node[type='concept']",
    style: { "background-color": "#d4a574" },
  },
  {
    selector: "node[type='location']",
    style: { "background-color": "#8b8ca0" },
  },
  {
    selector: "node[type='event']",
    style: { "background-color": "#94a3b8" },
  },
  {
    selector: "node[type='technology']",
    style: { "background-color": "#d4a574" },
  },
  {
    selector: "node[type='theory']",
    style: { "background-color": "#a0a0b0" },
  },
  {
    selector: "node[type='metric']",
    style: { "background-color": "#b0a090" },
  },
  {
    selector: "node:selected",
    style: {
      width: 20,
      height: 20,
      "border-width": 3,
      "border-color": "#374151",
    },
  },
  {
    selector: "node.dimmed",
    style: { opacity: 0.15 },
  },
  {
    selector: "node.highlighted",
    style: { opacity: 1, "border-color": "#374151", "border-width": 3 },
  },
  {
    selector: "edge",
    style: {
      width: 1,
      "line-color": "#d1d5db",
      "target-arrow-color": "#d1d5db",
      "target-arrow-shape": "triangle",
      "arrow-scale": 0.8,
      "curve-style": "bezier",
      label: "data(label)",
      "font-size": "9px",
      color: "#9ca3af",
      "text-opacity": 0,
      "transition-property": "line-color, width, text-opacity",
      "transition-duration": "200ms",
    },
  },
  {
    selector: "edge.dimmed",
    style: { opacity: 0.05 },
  },
  {
    selector: "edge.highlighted",
    style: {
      width: 2.5,
      "line-color": "#374151",
      "target-arrow-color": "#374151",
      "text-opacity": 1,
    },
  },
  {
    selector: "edge.hover",
    style: {
      width: 2,
      "line-color": "#6b7280",
      "target-arrow-color": "#6b7280",
      "text-opacity": 1,
    },
  },
];
```

- [ ] **Step 3: 创建 frontend/src/lib/graph-layout.ts**

```typescript
import cytoscape from "cytoscape";
import { GRAPH_STYLES } from "./graph-styles";

export function createGraphConfig(
  container: HTMLElement,
  elements: cytoscape.ElementDefinition[]
): cytoscape.CytoscapeOptions {
  return {
    container,
    elements,
    style: GRAPH_STYLES,
    layout: {
      name: "cose-bilkent",
      animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      animationDuration: 1000,
      nodeRepulsion: 4500,
      idealEdgeLength: 120,
      gravity: 0.25,
      numIter: 2500,
    } as cytoscape.LayoutOptions,
    minZoom: 0.1,
    maxZoom: 4,
    wheelSensitivity: 0.3,
  };
}

export function setupInteractions(cy: cytoscape.Core, onNodeClick: (id: string) => void) {
  // Hover: highlight edge
  cy.on("mouseover", "edge", (e) => {
    e.target.addClass("hover");
  });
  cy.on("mouseout", "edge", (e) => {
    e.target.removeClass("hover");
  });

  // Click node: highlight neighbors
  cy.on("tap", "node", (e) => {
    const node = e.target;
    const neighbors = node.closedNeighborhood();

    cy.elements().addClass("dimmed");
    neighbors.removeClass("dimmed").addClass("highlighted");

    onNodeClick(node.id());
  });

  // Click background: clear selection
  cy.on("tap", (e) => {
    if (e.target === cy) {
      cy.elements().removeClass("dimmed highlighted");
    }
  });
}

export function filterNodes(
  cy: cytoscape.Core,
  query: string
) {
  if (!query.trim()) {
    cy.elements().removeClass("dimmed");
    return;
  }

  const lower = query.toLowerCase();
  cy.nodes().forEach((node) => {
    const label = (node.data("label") as string).toLowerCase();
    if (label.includes(lower)) {
      node.removeClass("dimmed").addClass("highlighted");
    } else {
      node.addClass("dimmed").removeClass("highlighted");
    }
  });

  cy.edges().forEach((edge) => {
    const src = edge.source();
    const tgt = edge.target();
    if (src.hasClass("dimmed") || tgt.hasClass("dimmed")) {
      edge.addClass("dimmed");
    } else {
      edge.removeClass("dimmed");
    }
  });
}

export function highlightSubgraph(
  cy: cytoscape.Core,
  nodeIds: string[]
) {
  const idSet = new Set(nodeIds);
  cy.elements().addClass("dimmed");

  cy.nodes().forEach((node) => {
    if (idSet.has(node.id())) {
      node.removeClass("dimmed").addClass("highlighted");
    }
  });

  cy.edges().forEach((edge) => {
    if (idSet.has(edge.source().id()) && idSet.has(edge.target().id())) {
      edge.removeClass("dimmed").addClass("highlighted");
    }
  });

  if (nodeIds.length > 0) {
    cy.fit(cy.getElementById(nodeIds[0]), 100);
  }
}

export function exportAsPNG(cy: cytoscape.Core) {
  const b64 = cy.png({ full: true, bg: "#fafafa" });
  const link = document.createElement("a");
  link.download = "knowledge-graph.png";
  link.href = b64;
  link.click();
}

export function exportAsSVG(cy: cytoscape.Core) {
  const svg = cy.svg({ full: true });
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = "knowledge-graph.svg";
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: 提交**

```bash
git add frontend/src/lib/
git commit -m "feat: add api client, graph styles and layout"
```

---

### Task 20: 登录表单

**Files:**
- Create: `frontend/src/components/LoginForm.tsx`

- [ ] **Step 1: 创建 frontend/src/components/LoginForm.tsx**

```tsx
"use client";

import { useState } from "react";
import { login } from "@/lib/api";

export default function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      onLogin();
    } catch {
      setError("登录失败，请检查用户名和密码");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-sm"
      >
        <h1 className="mb-2 text-xl font-semibold text-text">
          Knowledge Graph Explorer
        </h1>
        <p className="mb-6 text-sm text-muted">登录以继续</p>

        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <label className="mb-1 block text-sm text-text">用户名</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-4 w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
          placeholder="用户名"
          required
        />

        <label className="mb-1 block text-sm text-text">密码</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
          placeholder="密码"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "登录中..." : "登录"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/src/components/LoginForm.tsx
git commit -m "feat: add login form component"
```

---

### Task 21: 首页

**Files:**
- Create: `frontend/src/app/page.tsx`
- Create: `frontend/src/components/WorkspaceCreate.tsx`
- Create: `frontend/src/components/WorkspaceList.tsx`

- [ ] **Step 1: 创建 frontend/src/components/WorkspaceCreate.tsx**

```tsx
"use client";

import { useState } from "react";
import { createWorkspace, uploadFile, triggerExtract } from "@/lib/api";

interface Props {
  onCreated: (workspaceId: string) => void;
}

export default function WorkspaceCreate({ onCreated }: Props) {
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState<"named" | "concept">("named");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || files.length === 0) return;

    setLoading(true);
    setProgress("创建工作区...");
    try {
      const wsId = await createWorkspace(name, entityType);

      for (const file of files) {
        setProgress(`上传 ${file.name}...`);
        await uploadFile(wsId, file);
      }

      setProgress("开始抽取...");
      await triggerExtract(wsId, entityType);
      onCreated(wsId);
    } catch (err) {
      setProgress(`出错: ${err instanceof Error ? err.message : "未知错误"}`);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="工作区名称，如：三国人物关系"
        className="w-full rounded border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
        required
      />

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="entityType"
            value="named"
            checked={entityType === "named"}
            onChange={() => setEntityType("named")}
          />
          命名实体
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="entityType"
            value="concept"
            checked={entityType === "concept"}
            onChange={() => setEntityType("concept")}
          />
          概念关系
        </label>
      </div>

      <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
        <input
          type="file"
          multiple
          accept=".txt,.md,.pdf,.docx"
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
          className="text-sm text-muted"
        />
        <p className="mt-1 text-xs text-muted">
          支持 .txt .md .pdf .docx（可多选）
        </p>
      </div>

      {files.length > 0 && (
        <ul className="text-xs text-muted">
          {files.map((f, i) => (
            <li key={i}>
              {f.name} ({(f.size / 1024).toFixed(1)} KB)
            </li>
          ))}
        </ul>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {loading ? progress : "创建并开始分析"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: 创建 frontend/src/components/WorkspaceList.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { listWorkspaces, deleteWorkspace } from "@/lib/api";
import type { Workspace } from "@/lib/types";
import Link from "next/link";

export default function WorkspaceList({ refreshKey }: { refreshKey: number }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    listWorkspaces()
      .then(setWorkspaces)
      .catch(() => {});
  }, [refreshKey]);

  if (workspaces.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="mb-3 text-sm font-medium text-muted">历史工作区</h2>
      <div className="space-y-2">
        {workspaces.map((ws) => (
          <div
            key={ws.id}
            className="flex items-center justify-between rounded border border-border bg-surface p-3"
          >
            <Link
              href={`/workspace/${ws.id}`}
              className="text-sm text-text hover:text-accent"
            >
              {ws.name}
              <span className="ml-2 text-xs text-muted">
                {ws.entity_type === "named" ? "命名实体" : "概念关系"}
                {" · "}
                {ws.file_count} 个文件
                {" · "}
                {ws.status === "ready"
                  ? "就绪"
                  : ws.status === "processing"
                  ? "处理中"
                  : "错误"}
              </span>
            </Link>
            <button
              onClick={async () => {
                await deleteWorkspace(ws.id);
                setWorkspaces((prev) => prev.filter((w) => w.id !== ws.id));
              }}
              className="text-xs text-muted hover:text-red-500"
            >
              删除
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建 frontend/src/app/page.tsx**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import WorkspaceCreate from "@/components/WorkspaceCreate";
import WorkspaceList from "@/components/WorkspaceList";
import DemoButton from "@/components/DemoButton";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("token")) {
      setLoggedIn(true);
    }
  }, []);

  const handleCreated = useCallback(
    (workspaceId: string) => {
      setRefreshKey((k) => k + 1);
      router.push(`/workspace/${workspaceId}`);
    },
    [router]
  );

  if (!loggedIn) {
    return <LoginForm onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">
            Knowledge Graph Explorer
          </h1>
          <p className="mt-1 text-sm text-muted">
            上传文档，AI 自动构建知识图谱
          </p>
        </div>
        <DemoButton onCreated={handleCreated} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-medium text-text">新建工作区</h2>
        <WorkspaceCreate onCreated={handleCreated} />
      </div>

      <WorkspaceList refreshKey={refreshKey} />
    </div>
  );
}
```

- [ ] **Step 4: 提交**

```bash
git add frontend/src/app/page.tsx frontend/src/components/WorkspaceCreate.tsx frontend/src/components/WorkspaceList.tsx
git commit -m "feat: add home page with workspace create and list"
```

---

### Task 22: History 页面

**Files:**
- Create: `frontend/src/app/history/page.tsx`

- [ ] **Step 1: 创建 frontend/src/app/history/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { listWorkspaces, deleteWorkspace } from "@/lib/api";
import type { Workspace } from "@/lib/types";
import Link from "next/link";

export default function HistoryPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    listWorkspaces().then(setWorkspaces).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">历史工作区</h1>
        <Link href="/" className="text-sm text-muted hover:text-accent">
          ← 返回首页
        </Link>
      </div>

      {workspaces.length === 0 && (
        <p className="text-sm text-muted">暂无记录</p>
      )}

      <div className="space-y-3">
        {workspaces.map((ws) => (
          <div
            key={ws.id}
            className="flex items-center justify-between rounded border border-border bg-surface p-4"
          >
            <div>
              <Link
                href={`/workspace/${ws.id}`}
                className="text-sm font-medium text-text hover:text-accent"
              >
                {ws.name}
              </Link>
              <div className="mt-1 text-xs text-muted">
                {ws.entity_type === "named" ? "命名实体" : "概念关系"}
                {" · "}
                {ws.file_count} 个文件
                {" · "}
                {ws.status}
                {" · "}
                {new Date(ws.created_at).toLocaleDateString("zh-CN")}
              </div>
            </div>
            <button
              onClick={async () => {
                await deleteWorkspace(ws.id);
                setWorkspaces((prev) => prev.filter((w) => w.id !== ws.id));
              }}
              className="text-xs text-muted hover:text-red-500"
            >
              删除
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/src/app/history/
git commit -m "feat: add history page"
```

---

## Phase 6: 图谱组件

### Task 23: GraphCanvas（核心图谱画布）

**Files:**
- Create: `frontend/src/components/GraphCanvas.tsx`

- [ ] **Step 1: 创建 frontend/src/components/GraphCanvas.tsx**

```tsx
"use client";

import { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import { createGraphConfig, setupInteractions } from "@/lib/graph-layout";
import type { GraphNode, GraphEdge } from "@/lib/types";

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick: (nodeId: string) => void;
}

export default function GraphCanvas({ nodes, edges, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const elements: cytoscape.ElementDefinition[] = [
      ...nodes.map((n) => ({
        data: {
          id: n.id,
          label: n.label,
          type: n.type,
          metadata: n.metadata,
        },
      })),
      ...edges.map((e) => ({
        data: {
          id: `${e.source}_${e.target}_${e.label}`,
          source: e.source,
          target: e.target,
          label: e.label,
          weight: e.weight,
        },
      })),
    ];

    const cy = cytoscape(createGraphConfig(containerRef.current, elements));
    setupInteractions(cy, onNodeClick);
    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [nodes, edges, onNodeClick]);

  // Expose cy instance to parent via window for export & filter
  useEffect(() => {
    if (cyRef.current && typeof window !== "undefined") {
      (window as Record<string, unknown>).__cy = cyRef.current;
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as Record<string, unknown>).__cy;
      }
    };
  }, [nodes, edges]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ background: "#fafafa" }}
    />
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/src/components/GraphCanvas.tsx
git commit -m "feat: add graph canvas with cytoscape.js"
```

---

### Task 24: NodeDetail 浮层

**Files:**
- Create: `frontend/src/components/NodeDetail.tsx`

- [ ] **Step 1: 创建 frontend/src/components/NodeDetail.tsx**

```tsx
"use client";

import type { GraphNode } from "@/lib/types";

interface Props {
  node: GraphNode | null;
  onClose: () => void;
}

export default function NodeDetail({ node, onClose }: Props) {
  if (!node) return null;

  return (
    <div className="absolute right-4 top-4 w-72 rounded-lg border border-border bg-white p-4 shadow-lg">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-text">{node.label}</h3>
        <button
          onClick={onClose}
          className="text-muted hover:text-text text-lg leading-none"
        >
          ×
        </button>
      </div>
      <div className="mt-2 space-y-1 text-xs text-muted">
        <p>
          类型：<span className="text-text">{node.type}</span>
        </p>
        {node.metadata &&
          Object.entries(node.metadata).map(([key, value]) => (
            <p key={key}>
              <span className="capitalize">{key}：</span>
              <span className="text-text">
                {typeof value === "string" ? value.slice(0, 200) : String(value)}
              </span>
            </p>
          ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/src/components/NodeDetail.tsx
git commit -m "feat: add node detail popover"
```

---

### Task 25: SearchBar（前端过滤 + 语义搜索）

**Files:**
- Create: `frontend/src/components/SearchBar.tsx`

- [ ] **Step 1: 创建 frontend/src/components/SearchBar.tsx**

```tsx
"use client";

import { useState, useCallback } from "react";
import { filterNodes, highlightSubgraph } from "@/lib/graph-layout";
import { semanticSearch } from "@/lib/api";

interface Props {
  workspaceId: string;
}

export default function SearchBar({ workspaceId }: Props) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);

      const cy = (window as Record<string, unknown>).__cy;
      if (cy && typeof (cy as { filterNodes?: unknown }).filterNodes !== "function") {
        filterNodes(cy as Parameters<typeof filterNodes>[0], val);
      }
    },
    []
  );

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter" || !query.trim()) return;
      setSearching(true);
      try {
        const result = await semanticSearch(workspaceId, query.trim());
        const cy = (window as Record<string, unknown>).__cy;
        if (cy) {
          const nodeIds = result.subgraph_nodes.map((n) => n.id);
          highlightSubgraph(
            cy as Parameters<typeof highlightSubgraph>[0],
            nodeIds
          );
        }
      } catch {
        // silently fail
      } finally {
        setSearching(false);
      }
    },
    [query, workspaceId]
  );

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="输入关键词过滤，回车语义搜索..."
        className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
      />
      {searching && (
        <span className="absolute right-3 top-2 text-xs text-muted">
          搜索中...
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/src/components/SearchBar.tsx
git commit -m "feat: add search bar with frontend filter and semantic search"
```

---

### Task 26: Sidebar + 子组件

**Files:**
- Create: `frontend/src/components/Sidebar.tsx`
- Create: `frontend/src/components/WorkspaceInfo.tsx`
- Create: `frontend/src/components/UploadZone.tsx`

- [ ] **Step 1: 创建 frontend/src/components/WorkspaceInfo.tsx**

```tsx
import type { Workspace } from "@/lib/types";

interface Props {
  workspace: Workspace;
  entityType: "named" | "concept";
  onEntityTypeChange: (t: "named" | "concept") => void;
}

export default function WorkspaceInfo({
  workspace,
  entityType,
  onEntityTypeChange,
}: Props) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-text">{workspace.name}</h2>
      <div className="flex gap-3">
        <label className="flex items-center gap-1 text-xs">
          <input
            type="radio"
            checked={entityType === "named"}
            onChange={() => onEntityTypeChange("named")}
          />
          实体
        </label>
        <label className="flex items-center gap-1 text-xs">
          <input
            type="radio"
            checked={entityType === "concept"}
            onChange={() => onEntityTypeChange("concept")}
          />
          概念
        </label>
      </div>
      <p className="text-xs text-muted">
        {workspace.file_count} 个文件 · {workspace.status}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: 创建 frontend/src/components/UploadZone.tsx**

```tsx
"use client";

import { useState } from "react";
import { uploadFile } from "@/lib/api";

interface Props {
  workspaceId: string;
  onUploaded: () => void;
}

export default function UploadZone({ workspaceId, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadFile(workspaceId, file);
      }
      onUploaded();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded border-2 border-dashed border-border p-3 text-center">
      <input
        type="file"
        multiple
        accept=".txt,.md,.pdf,.docx"
        onChange={handleChange}
        disabled={uploading}
        className="text-xs text-muted"
      />
      <p className="text-xs text-muted mt-1">
        {uploading ? "上传中..." : "追加文件"}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: 创建 frontend/src/components/Sidebar.tsx**

```tsx
"use client";

import { useState } from "react";
import WorkspaceInfo from "./WorkspaceInfo";
import UploadZone from "./UploadZone";
import SearchBar from "./SearchBar";
import ExportButton from "./ExportButton";
import type { Workspace } from "@/lib/types";
import Link from "next/link";

interface Props {
  workspace: Workspace;
  workspaceId: string;
  onEntityTypeChange: (t: "named" | "concept") => void;
  onReextract: () => void;
}

export default function Sidebar({
  workspace,
  workspaceId,
  onEntityTypeChange,
  onReextract,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="absolute left-0 top-0 z-10 m-2 rounded border border-border bg-surface p-2 text-xs text-muted hover:text-text"
      >
        ☰
      </button>
    );
  }

  return (
    <div className="absolute left-0 top-0 z-10 m-2 w-64 space-y-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-xs text-muted hover:text-accent">
          ← 返回
        </Link>
        <button
          onClick={() => setCollapsed(true)}
          className="text-xs text-muted hover:text-text"
        >
          ✕
        </button>
      </div>

      <WorkspaceInfo
        workspace={workspace}
        entityType={workspace.entity_type as "named" | "concept"}
        onEntityTypeChange={onEntityTypeChange}
      />

      <SearchBar workspaceId={workspaceId} />

      <UploadZone
        key={uploadKey}
        workspaceId={workspaceId}
        onUploaded={() => {
          setUploadKey((k) => k + 1);
          onReextract();
        }}
      />

      <div className="flex gap-2">
        <ExportButton format="png" />
        <ExportButton format="svg" />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 提交**

```bash
git add frontend/src/components/Sidebar.tsx frontend/src/components/WorkspaceInfo.tsx frontend/src/components/UploadZone.tsx
git commit -m "feat: add sidebar with workspace info, upload zone, and search"
```

---

### Task 27: StatusBar

**Files:**
- Create: `frontend/src/components/StatusBar.tsx`

- [ ] **Step 1: 创建 frontend/src/components/StatusBar.tsx**

```tsx
"use client";

interface Props {
  status: string;
  phase: string;
  progress: number;
  nodeCount: number;
  edgeCount: number;
  errorMessage?: string;
  rawOutput?: string;
}

export default function StatusBar({
  status,
  phase,
  progress,
  nodeCount,
  edgeCount,
  errorMessage,
  rawOutput,
}: Props) {
  const phaseLabels: Record<string, string> = {
    loading: "加载文件...",
    chunking: "文本分块...",
    extracting: "AI 抽取中...",
    merging: "合并去重...",
    embedding: "生成向量...",
    saving: "保存...",
    done: "就绪",
    idle: "就绪",
  };

  return (
    <div className="border-t border-border bg-surface px-4 py-2">
      <div className="flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-3">
          {status === "processing" && (
            <>
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
              <span>{phaseLabels[phase] || phase}</span>
              <span>{Math.round(progress * 100)}%</span>
            </>
          )}
          {status === "ready" && (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
              <span>就绪</span>
            </>
          )}
          {status === "error" && (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
              <span className="text-red-500">
                {errorMessage || "抽取失败"}
              </span>
              {rawOutput && (
                <button
                  onClick={() => {
                    const w = window.open("", "_blank");
                    if (w) {
                      w.document.write(`<pre>${rawOutput}</pre>`);
                    }
                  }}
                  className="underline hover:text-accent"
                >
                  查看原始输出
                </button>
              )}
            </>
          )}
        </div>
        <div className="flex gap-3">
          <span>{nodeCount} 节点</span>
          <span>{edgeCount} 边</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/src/components/StatusBar.tsx
git commit -m "feat: add status bar with progress and error display"
```

---

### Task 28: Export 按钮

**Files:**
- Create: `frontend/src/components/ExportButton.tsx`

- [ ] **Step 1: 创建 frontend/src/components/ExportButton.tsx**

```tsx
"use client";

import { exportAsPNG, exportAsSVG } from "@/lib/graph-layout";

interface Props {
  format: "png" | "svg";
}

export default function ExportButton({ format }: Props) {
  function handleClick() {
    const cy = (window as Record<string, unknown>).__cy;
    if (!cy) return;
    if (format === "png") {
      exportAsPNG(cy as Parameters<typeof exportAsPNG>[0]);
    } else {
      exportAsSVG(cy as Parameters<typeof exportAsSVG>[0]);
    }
  }

  return (
    <button
      onClick={handleClick}
      className="rounded border border-border px-2 py-1 text-xs text-muted hover:bg-bg hover:text-text"
    >
      {format === "png" ? "导出 PNG" : "导出 SVG"}
    </button>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/src/components/ExportButton.tsx
git commit -m "feat: add export buttons (png/svg)"
```

---

### Task 29: Demo 按钮

**Files:**
- Create: `frontend/src/components/DemoButton.tsx`

- [ ] **Step 1: 创建 frontend/src/components/DemoButton.tsx**

```tsx
"use client";

import { useState } from "react";
import { createWorkspace, triggerExtract } from "@/lib/api";

interface Props {
  onCreated: (workspaceId: string) => void;
}

export default function DemoButton({ onCreated }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDemo() {
    setLoading(true);
    try {
      // Use a pre-built workspace from demo-data/sample.txt
      // For simplicity, create workspace then call a special demo endpoint
      const wsId = await createWorkspace("Demo: AI行业速览", "named");

      // Upload demo file via the dedicated route
      const demoRes = await fetch("/api/demo", { method: "POST" });
      const { workspace_id } = await demoRes.json();

      await triggerExtract(workspace_id, "named");
      onCreated(workspace_id);
    } catch (err) {
      console.error("Demo failed:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDemo}
      disabled={loading}
      className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
    >
      {loading ? "加载中..." : "一键体验 Demo"}
    </button>
  );
}
```

- [ ] **Step 2: 需要在后端添加 /api/demo 路由。在 backend/routes/workspaces.py 末尾追加：**

```python
@router.post("/demo")
def create_demo(authorization: str = Header(...)):
    """创建 demo 工作区，预填示例文本。"""
    user = _auth(authorization)
    ws = Workspace(user_id=user, name="Demo: AI行业速览", entity_type="named")
    db.create_workspace(ws)

    # 读取内置 demo 数据
    import os
    demo_path = os.path.join(os.path.dirname(__file__), "..", "..", "demo-data", "sample.txt")
    try:
        with open(demo_path, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        content = "请将 demo-data/sample.txt 放入项目根目录"

    fr = FileRecord(
        workspace_id=ws.id,
        filename="sample.txt",
        content=content,
    )
    db.add_file(fr)
    return {"workspace_id": ws.id}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/DemoButton.tsx backend/routes/workspaces.py
git commit -m "feat: add demo mode with built-in sample data"
```

---

## Phase 7: 图谱页组装

### Task 30: Workspace 页面

**Files:**
- Create: `frontend/src/app/workspace/[id]/page.tsx`

- [ ] **Step 1: 创建 frontend/src/app/workspace/[id]/page.tsx**

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  getGraph,
  getExtractStatus,
  triggerExtract,
  listWorkspaces,
} from "@/lib/api";
import type { Workspace, GraphNode, GraphEdge } from "@/lib/types";
import GraphCanvas from "@/components/GraphCanvas";
import Sidebar from "@/components/Sidebar";
import NodeDetail from "@/components/NodeDetail";
import StatusBar from "@/components/StatusBar";

export default function WorkspacePage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [status, setStatus] = useState("loading");
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [rawOutput, setRawOutput] = useState("");

  const loadGraph = useCallback(async () => {
    try {
      const snap = await getGraph(workspaceId);
      setNodes(snap.nodes);
      setEdges(snap.edges);
    } catch {
      // Graph not ready yet
    }
  }, [workspaceId]);

  const loadWorkspace = useCallback(async () => {
    try {
      const wss = await listWorkspaces();
      const ws = wss.find((w) => w.id === workspaceId);
      if (ws) setWorkspace(ws);
    } catch {
      // ignore
    }
  }, [workspaceId]);

  useEffect(() => {
    loadWorkspace();
    loadGraph();

    // Poll status
    const interval = setInterval(async () => {
      try {
        const st = await getExtractStatus(workspaceId);
        setStatus(st.status);
        setPhase(st.phase);
        setProgress(st.progress);
        setErrorMessage(st.error_message || "");
        setRawOutput(st.raw_output || "");

        if (st.status === "ready" || st.status === "error") {
          loadGraph();
          loadWorkspace();
          if (st.status === "ready") clearInterval(interval);
        }
      } catch {
        // ignore
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [workspaceId, loadGraph, loadWorkspace]);

  const handleReextract = useCallback(async () => {
    if (!workspace) return;
    await triggerExtract(
      workspaceId,
      workspace.entity_type as "named" | "concept"
    );
    setStatus("processing");
    setPhase("extracting");
    setProgress(0);
  }, [workspaceId, workspace]);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      setSelectedNode(node || null);
    },
    [nodes]
  );

  return (
    <div className="relative flex h-screen flex-col">
      <div className="relative flex-1">
        <Sidebar
          workspace={workspace || {
            id: workspaceId,
            name: "加载中...",
            entity_type: "named",
            status: "ready",
            created_at: "",
            file_count: 0,
          }}
          workspaceId={workspaceId}
          onEntityTypeChange={async (t) => {
            if (workspace) {
              await triggerExtract(workspaceId, t);
              setStatus("processing");
            }
          }}
          onReextract={handleReextract}
        />
        <GraphCanvas nodes={nodes} edges={edges} onNodeClick={handleNodeClick} />
        <NodeDetail
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      </div>
      <StatusBar
        status={status}
        phase={phase}
        progress={progress}
        nodeCount={nodes.length}
        edgeCount={edges.length}
        errorMessage={errorMessage}
        rawOutput={rawOutput}
      />
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/src/app/workspace/
git commit -m "feat: add workspace page with graph and polling"
```

---

## Phase 8: 收尾

### Task 31: README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: 创建 README.md**

```markdown
# Knowledge Graph Explorer

Upload text documents (txt, md, pdf, docx) and let AI automatically extract entities and relationships into an interactive knowledge graph. Supports keyword filtering and semantic search.

## Features

- **Multi-format Upload**: txt, md, pdf, docx
- **Dual Extraction Modes**: Named entity or concept relationship extraction
- **Interactive Graph**: Drag, zoom, click to explore neighbors — powered by cytoscape.js
- **Hybrid Search**: Instant frontend keyword filter + backend semantic search (Enter)
- **Workspace**: Multi-file merging, graph persistence, history
- **Export**: Download graph as PNG or SVG
- **Demo Mode**: One-click experience with built-in sample data
- **Minimal Academic Design**: Clean, muted palette, respects `prefers-reduced-motion`

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS + cytoscape.js |
| Backend | FastAPI + LangChain (ReAct agent) |
| LLM | DeepSeek Chat (primary) + OpenAI/Claude fallback |
| Embeddings | BGE-small-zh (local, CPU) |
| Vector DB | LanceDB (embedded) |
| Reverse Proxy | Nginx + Let's Encrypt |
| Deployment | Docker Compose on cloud server |

## Quick Start (Local Dev)

```bash
# 1. Clone and set up environment
cp .env.example .env
# Edit .env with your DEEPSEEK_API_KEY

# 2. Start backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 3. Start frontend (separate terminal)
cd frontend
npm install
npm run dev

# 4. Open http://localhost:3000
```

## Production Deployment

```bash
# On your cloud server
docker compose up -d
```

Login: `interviewer` / password from `.env`

## Known Limitations

- No conversational RAG / chat interface
- PDF image extraction not supported (text and tables only)
- Single-user tool — no registration or multi-tenant
- LanceDB embedded mode — not clustered
- Graph capped at top-300 core nodes displayed (remaining folded)
```

- [ ] **Step 2: 提交**

```bash
git add README.md
git commit -m "docs: add english readme"
```

---

### Task 32: 本地集成测试

- [ ] **Step 1: 启动后端**

```bash
cd backend
# 先设置环境变量
export DEEPSEEK_API_KEY=your-key
export SECRET_KEY=test-secret
uvicorn main:app --reload --port 8000
```

Verify: `curl http://localhost:8000/api/health` → `{"status":"ok"}`

- [ ] **Step 2: 测试 API**

```bash
# 登录
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"interviewer","password":"demo123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# 创建工作区
WS=$(curl -s -X POST http://localhost:8000/api/workspaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"测试","entity_type":"named"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['workspace_id'])")

echo "Workspace: $WS"

# 上传文件
curl -X POST "http://localhost:8000/api/workspaces/$WS/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@../demo-data/sample.txt"

# 触发抽取
curl -X POST "http://localhost:8000/api/workspaces/$WS/extract" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"entity_type":"named"}'

# 轮询状态
curl -s "http://localhost:8000/api/workspaces/$WS/status" \
  -H "Authorization: Bearer $TOKEN"

# 获取图谱
curl -s "http://localhost:8000/api/workspaces/$WS/graph" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -30
```

- [ ] **Step 3: 启动前端**

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`，登录 → 创建工作区 → 上传文件 → 查看图谱。

- [ ] **Step 4: Docker Compose 启动**

```bash
cp .env.example .env
# 编辑 .env

docker compose up -d --build
docker compose ps
```

Verify: `curl http://localhost/api/health` → `{"status":"ok"}`

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "chore: final integration tweaks"
```

---

### Task 33: 最终检查清单

- [ ] `git log` 有真实 commit 历史（不是一次 commit）
- [ ] `.env.example` 完整
- [ ] 所有 API key 不在仓库里
- [ ] `docker compose up -d` 一键启动
- [ ] 移动端打开页面布局不崩（Tailwind responsive）
- [ ] README 英文完整
- [ ] Demo 模式可点开

---

## Plan Completion

计划完成，覆盖设计文档全部需求。准备好后告诉我用哪种方式执行：

1. **Subagent-Driven（推荐）** — 每个 Task 一个独立 subagent，任务间我做 review
2. **Inline Execution** — 在当前 session 里逐个 task 执行，用 executing-plans 管理断点
