import json
import re
import logging
from langchain.schema import HumanMessage
from agent.providers.base import BaseProvider
from agent.prompts import get_prompt

logger = logging.getLogger(__name__)


class KnowledgeGraphExtractor:
    def __init__(self, provider: BaseProvider | None = None):
        self.provider = provider

    def extract(self, text: str, entity_type: str, max_retries: int = 2) -> dict:
        if not text.strip():
            return {"nodes": [], "edges": []}

        if self.provider is None:
            return {"nodes": [], "edges": []}

        prompt_template = get_prompt(entity_type)
        prompt = prompt_template.replace("{text}", text)
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
                logger.warning(f"Extraction attempt {attempt + 1} failed: {e}")
                if attempt == max_retries:
                    return {
                        "nodes": [],
                        "edges": [],
                        "_error": str(e),
                        "_raw_output": last_raw,
                    }

        return {"nodes": [], "edges": []}

    def extract_batch(self, chunks: list[str], entity_type: str) -> list[dict]:
        results = []
        for i, chunk in enumerate(chunks):
            logger.info(f"Extracting chunk {i + 1}/{len(chunks)}")
            result = self.extract(chunk, entity_type)
            if "_error" not in result:
                result = self._reindex(result, prefix=f"c{i}")
            results.append(result)
        return results

    def _parse_json(self, raw: str) -> dict:
        raw = raw.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*\n?", "", raw)
            raw = re.sub(r"\n?```\s*$", "", raw)
        start = raw.find("{")
        end = raw.rfind("}")
        if start != -1 and end != -1:
            raw = raw[start:end + 1]
        # Try direct parse first
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
        # Fix common LLM JSON issues
        raw = re.sub(r",\s*([}\]])", r"\1", raw)
        raw = re.sub(r"}\s*{", "},{", raw)
        raw = re.sub(r"\]\s*{", "],{", raw)
        return json.loads(raw)

    def _validate(self, result: dict):
        if "nodes" not in result:
            raise ValueError("Missing 'nodes' key")
        if "edges" not in result:
            result["edges"] = []
        for node in result["nodes"]:
            if "id" not in node or "label" not in node:
                raise ValueError(f"Node missing id/label: {node}")

    def _reindex(self, result: dict, prefix: str) -> dict:
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
