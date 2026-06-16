import os
from pathlib import Path

# 自动加载同目录下的 .env 文件
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    with open(_env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                key, value = key.strip(), value.strip()
                if key not in os.environ:
                    os.environ[key] = value

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
TEST_USERNAME = os.getenv("TEST_USERNAME", "interviewer")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "demo123")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

import tempfile
LANCE_DB_PATH = os.getenv("LANCE_DB_PATH", os.path.join(tempfile.gettempdir(), "kg_lancedb_data"))
