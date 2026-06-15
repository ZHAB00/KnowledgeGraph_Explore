NAMED_ENTITY_PROMPT = """你是一个命名实体关系抽取专家。分析以下文本，提取所有命名实体及它们之间的关系。

命名实体类型：
- person: 人物（真实或虚构）
- organization: 组织、公司、机构
- location: 地点、地理位置
- event: 事件、活动

对于每个实体，提取其 name（名称）和 type（类型）。
对于每一对相关实体，提取它们之间的关系（用简短动词短语描述，如 "任职于"、"创建"、"位于"、"参加"）。

严格返回 JSON 格式，不要任何额外文字：
{
  "nodes": [
    {"id": "n1", "label": "实体名称", "type": "person", "metadata": {"context": "原文相关片段"}},
    {"id": "n2", "label": "实体名称", "type": "organization", "metadata": {"context": "原文相关片段"}}
  ],
  "edges": [
    {"source": "n1", "target": "n2", "label": "关系描述", "weight": 1.0}
  ]
}

规则：
- 每个实体的 id 必须是唯一字符串（n1, n2, n3...）
- 只提取有意义的实体，忽略代词和泛指词汇
- 关系方向要准确：A 创建了 B 则 source=A, target=B
- 如果文中没有明确关系，不要强行编造
- metadata.context 取原文中包含该实体的一句话

文本如下：
{text}

请直接返回 JSON："""


CONCEPT_EXTRACTION_PROMPT = """你是一个概念关系抽取专家。分析以下文本，提取关键概念及它们之间的逻辑关系。

概念类型：
- technology: 技术、工具、方法
- theory: 理论、原理、思想
- metric: 指标、数据、测量标准
- organization: 组织、公司、机构
- person: 相关人物

对于每个概念，提取其 name（名称）和 type（类型）。
对于每一对相关概念，提取它们之间的逻辑关系（如 "依赖"、"改进"、"提出"、"对比"、"属于"、"应用" 等简短动词短语）。

严格返回 JSON 格式，不要任何额外文字：
{
  "nodes": [
    {"id": "n1", "label": "概念名称", "type": "technology", "metadata": {"context": "原文相关片段"}},
    {"id": "n2", "label": "概念名称", "type": "theory", "metadata": {"context": "原文相关片段"}}
  ],
  "edges": [
    {"source": "n1", "target": "n2", "label": "关系描述", "weight": 1.0}
  ]
}

规则：
- 每个实体的 id 必须是唯一字符串（n1, n2, n3...）
- 只提取有意义的、具体的关键概念
- 关系方向要准确反映逻辑关系
- 如果文中没有明确关系，不要强行编造
- metadata.context 取原文中包含该概念的一句话

文本如下：
{text}

请直接返回 JSON："""


def get_prompt(entity_type: str) -> str:
    if entity_type == "concept":
        return CONCEPT_EXTRACTION_PROMPT
    return NAMED_ENTITY_PROMPT
