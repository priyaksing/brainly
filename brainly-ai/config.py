"""
Shared configuration for the brainly-ai scripts.

Reads .env once and fails immediately if something required is missing, rather
than crashing halfway through a run. This is the Python counterpart of
brainly-backend/src/config/env.ts.
"""

from openai import OpenAI
from pydantic_settings import BaseSettings, SettingsConfigDict
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import ConfigurationError


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    db_connection: str
    openai_api_key: str

    # Whose bookmarks to search. Optional - if unset and only one user exists,
    # that one is used.
    brainly_username: str | None = None

    # Stage 0 - enrichment
    openai_model: str = "gpt-4o-mini"
    batch_limit: int = 10
    max_text_chars: int = 6000
    request_timeout: int = 15

    # Phase 1 - chunking and embedding
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536
    chunk_size: int = 800
    chunk_overlap: int = 100
    embed_batch_size: int = 100

    # Phase 1 - retrieval
    top_k: int = 5

    # Phase 1 - evaluation. Deliberately a stronger model than openai_model:
    # a model grading its own answers tends to favour them.
    judge_model: str = "gpt-4o"


settings = Settings()
openai_client = OpenAI(api_key=settings.openai_api_key)

# USD per 1,000,000 tokens. Check https://openai.com/api/pricing/ if these drift.
PRICES = {
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "text-embedding-3-small": {"input": 0.02, "output": 0.0},
}


def cost_usd(model: str, input_tokens: int, output_tokens: int = 0) -> float:
    """What a call cost. Returns 0.0 for models not in PRICES."""
    rate = PRICES.get(model)
    if rate is None:
        return 0.0
    return input_tokens / 1e6 * rate["input"] + output_tokens / 1e6 * rate["output"]


def get_db() -> Database:
    """Open the database named in DB_CONNECTION. Close it with db.client.close()."""
    client = MongoClient(settings.db_connection)
    try:
        return client.get_default_database()
    except ConfigurationError:
        raise SystemExit("DB_CONNECTION needs a database name, e.g. .../brainlyDB")
