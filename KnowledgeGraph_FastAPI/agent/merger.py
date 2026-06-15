from difflib import SequenceMatcher


class Merger:
    @staticmethod
    def merge(results: list[dict], similarity_threshold: float = 0.8) -> dict:
        all_nodes = []
        all_edges = []

        for result in results:
            if "_error" in result:
                continue
            all_nodes.extend(result.get("nodes", []))
            all_edges.extend(result.get("edges", []))

        # 节点去重
        unique_nodes = []
        seen_labels = {}

        for node in all_nodes:
            label = node["label"].strip()
            matched = False
            for existing_label, idx in seen_labels.items():
                if Merger._similar(label, existing_label, similarity_threshold):
                    if "metadata" in node and node["metadata"]:
                        existing_meta = unique_nodes[idx].get("metadata", {})
                        existing_meta.update(node["metadata"])
                        unique_nodes[idx]["metadata"] = existing_meta
                    matched = True
                    old_id = node["id"]
                    new_id = unique_nodes[idx]["id"]
                    for edge in all_edges:
                        if edge["source"] == old_id:
                            edge["source"] = new_id
                        if edge["target"] == old_id:
                            edge["target"] = new_id
                    break

            if not matched:
                seen_labels[label] = len(unique_nodes)
                unique_nodes.append(node)

        # 边去重
        edge_map = {}
        for edge in all_edges:
            key = (edge["source"], edge["target"], edge["label"])
            if key in edge_map:
                edge_map[key] += edge.get("weight", 1.0)
            else:
                edge_map[key] = edge.get("weight", 1.0)

        unique_edges = [
            {"source": s, "target": t, "label": l, "weight": w}
            for (s, t, l), w in edge_map.items()
        ]

        # 统一重新编号
        id_map = {}
        for i, node in enumerate(unique_nodes):
            old_id = node["id"]
            new_id = f"n{i + 1}"
            id_map[old_id] = new_id
            node["id"] = new_id

        for edge in unique_edges:
            edge["source"] = id_map.get(edge["source"], edge["source"])
            edge["target"] = id_map.get(edge["target"], edge["target"])

        return {"nodes": unique_nodes, "edges": unique_edges}

    @staticmethod
    def _similar(a: str, b: str, threshold: float) -> bool:
        if a == b:
            return True
        if a in b or b in a:
            return True
        return SequenceMatcher(None, a, b).ratio() >= threshold
