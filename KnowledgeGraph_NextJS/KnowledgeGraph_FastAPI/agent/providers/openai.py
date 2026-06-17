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
