# Knowledge Graph Explorer

Upload text documents (txt, md, pdf, docx) and let AI automatically extract entities and relationships into an interactive knowledge graph. Built for tech intern screening — demonstrates AI-native development with DeepSeek V4, D3.js, and FastAPI.

## Features

- **Multi-format Upload**: txt, md, pdf, docx with automatic text extraction (including PDF tables)
- **Dual Extraction**: Named entity extraction (people, organizations, locations, events) and concept relationship extraction (technologies, theories, metrics) — run in parallel
- **Interactive Graph**: D3.js force simulation with drag, zoom, click-to-highlight-neighbors, double-click-to-reset. Node size scales by connectivity. JetBrains Mono labels.
- **Hybrid Search**: Instant frontend keyword filter + backend semantic search with BGE-small-zh embeddings
- **Workspace Management**: Create multiple workspaces, upload files per workspace, switch between them. Files auto-trigger extraction on upload.
- **Per-file Status Tracking**: Each file shows real-time extraction status (pending / processing / done / error) with color-coded indicators
- **Export**: Download graph as PNG
- **Floating Panel**: Draggable sidebar overlay with zoom slider (20%-1000%), graph reset button
- **Dynamic Background**: Ambient canvas with drifting light blobs and connecting particles
- **Semantic Chunking**: LangChain RecursiveCharacterTextSplitter with sentence-boundary-aware separators
- **Async Architecture**: Background extraction via `asyncio.create_task`, non-blocking HTTP endpoints

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS + D3.js v7 |
| Backend | FastAPI (Python 3.12) + LangChain |
| LLM | DeepSeek V4 Flash (primary) with multi-provider adapter |
| Embeddings | BGE-small-zh (local, CPU) |
| Storage | LanceDB (embedded) |
| Reverse Proxy | Nginx |
| Deployment | Docker Compose on cloud server (2 vCPU, 4 GB RAM) |

## Quick Start (Local Dev)

```bash
# 1. Prerequisites
# - Python 3.12 with conda
# - Node.js 22

# 2. Create conda environment
conda create -n kgraph python=3.12 -y
conda activate kgraph

# 3. Install PyTorch (conda is required for Windows DLL compatibility)
conda install pytorch==2.6.0 cpuonly -c pytorch -y

# 4. Install backend dependencies
cd KnowledgeGraph_FastAPI
pip install -r requirements.txt
pip install pandas

# 5. Configure environment
nano .env
# Set DEEPSEEK_API_KEY=sk-your-key
# Set DEEPSEEK_MODEL=deepseek-chat (or deepseek-v4-flash)

# 6. Install frontend dependencies
cd ../KnowledgeGraph_NextJS
npm install

# 7. Start backend (port 8765)
cd ../KnowledgeGraph_FastAPI
uvicorn main:app --port 8765 --reload

# 8. Start frontend (port 3000, separate terminal)
cd KnowledgeGraph_NextJS
npm run dev

# 9. Open http://localhost:3000
# Login: interviewer / demo123
```

## Production Deployment

```bash
# 1. Upload to server
scp -r docker-compose.yml .env nginx KnowledgeGraph_FastAPI KnowledgeGraph_NextJS demo-data root@your-server:/opt/knowledge-graph/

# 2. Start
ssh root@your-server
cd /opt/knowledge-graph
nano .env  # set DEEPSEEK_API_KEY and SECRET_KEY
docker compose up -d --build

# 3. Access at http://your-server:8765
```

### Nginx reverse proxy (optional, for custom domain)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://127.0.0.1:8765;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Login → JWT token |
| POST | `/api/workspaces` | Create workspace |
| POST | `/api/workspaces/{id}/upload` | Upload file(s) |
| GET | `/api/workspaces/{id}/status` | Poll extraction progress |
| GET | `/api/workspaces/{id}/graph?type=named` | Get graph (named or concept) |
| GET | `/api/workspaces/{id}/files` | List files in workspace |
| DELETE | `/api/workspaces/{id}/files/{fileId}` | Delete file |
| GET | `/api/workspaces/{id}/search?q=` | Semantic search |
| GET | `/api/workspaces` | List user's workspaces |
| DELETE | `/api/workspaces/{id}` | Delete workspace |
| POST | `/api/demo` | Create demo workspace |

## Project Structure

```
interview_demo/
├── docker-compose.yml
├── nginx/                          # Nginx reverse proxy
├── KnowledgeGraph_FastAPI/         # Backend
│   ├── main.py                     # FastAPI entry point
│   ├── config.py                   # Environment loading
│   ├── agent/
│   │   ├── extractor.py            # LangChain ReAct extraction agent
│   │   ├── chunker.py              # Semantic text chunking
│   │   ├── merger.py               # Entity deduplication
│   │   ├── prompts.py              # Chinese extraction prompts
│   │   └── providers/              # Multi-model adapter (DeepSeek, OpenAI, Claude)
│   ├── routes/                     # API routes (auth, workspaces, search)
│   ├── services/
│   │   ├── extract_service.py      # Async extraction orchestration
│   │   ├── file_parser.py          # txt/md/pdf/docx parser
│   │   └── embedder.py             # BGE-small-zh embedding service
│   └── db/
│       ├── models.py               # Pydantic data models
│       └── lancedb_client.py       # LanceDB CRUD operations
├── KnowledgeGraph_NextJS/          # Frontend
│   └── src/
│       ├── app/                    # Next.js pages (home, workspace/[id], history)
│       ├── components/             # React components (GraphCanvas, Sidebar, SearchBar, ...)
│       └── lib/                    # API client, types, D3 styles
└── demo-data/                      # Built-in demo text
```

## Known Limitations

- No conversational RAG / chat interface
- PDF image extraction not supported (text and tables only)
- Single user with shared test account (no multi-tenant auth)
- LanceDB uses full-table read/write pattern (not optimized for concurrent writes)
- BGE-small-zh model download requires HuggingFace access (use HF_ENDPOINT mirror in China)
- Max single file size: 10MB
- Zoom range limited to 50%-300% via scroll wheel (20%-1000% available via slider)
