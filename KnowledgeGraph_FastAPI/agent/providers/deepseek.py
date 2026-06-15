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
