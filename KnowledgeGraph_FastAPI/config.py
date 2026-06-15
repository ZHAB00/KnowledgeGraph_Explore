import os

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
TEST_USERNAME = os.getenv("TEST_USERNAME", "interviewer")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "demo123")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

import tempfile
LANCE_DB_PATH = os.getenv("LANCE_DB_PATH", os.path.join(tempfile.gettempdir(), "kg_lancedb_data"))
