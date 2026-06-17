from abc import ABC, abstractmethod
from langchain_core.language_models.chat_models import BaseChatModel


class BaseProvider(ABC):
    @abstractmethod
    def get_llm(self, temperature: float = 0.1) -> BaseChatModel:
        ...

    def get_name(self) -> str:
        return self.__class__.__name__.replace("Provider", "").lower()
