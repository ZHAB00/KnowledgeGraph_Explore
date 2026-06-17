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
