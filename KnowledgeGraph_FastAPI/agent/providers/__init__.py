from agent.providers.base import BaseProvider
from agent.providers.deepseek import DeepSeekProvider
from config import DEEPSEEK_API_KEY


def get_provider(name: str = "deepseek") -> BaseProvider:
    if name == "deepseek" and DEEPSEEK_API_KEY:
        return DeepSeekProvider()
    elif name == "openai":
        from agent.providers.openai import OpenAIProvider
        return OpenAIProvider()
    elif name == "claude":
        from agent.providers.claude import ClaudeProvider
        return ClaudeProvider()
    elif DEEPSEEK_API_KEY:
        return DeepSeekProvider()
    raise ValueError("No available LLM provider configured")
