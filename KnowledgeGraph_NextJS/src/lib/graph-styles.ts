

export const GRAPH_STYLES: any[] = [
  {
    selector: "node",
    style: {
      "background-color": "#64748b",
      label: "data(label)",
      "text-valign": "bottom",
      "text-halign": "center",
      "font-size": "11px",
      "font-family": "'JetBrains Mono', monospace",
      color: "#1a1a1a",
      "text-max-width": "120px",
      "text-wrap": "ellipsis",
      width: 12,
      height: 12,
      "border-width": 2,
      "border-color": "#fafafa",
      "transition-property": "background-color, width, height, opacity",
      "transition-duration": "200ms",
    },
  },
  {
    selector: "node[type='person']",
    style: { "background-color": "#64748b" },
  },
  {
    selector: "node[type='organization']",
    style: { "background-color": "#78716c" },
  },
  {
    selector: "node[type='concept']",
    style: { "background-color": "#d4a574" },
  },
  {
    selector: "node[type='location']",
    style: { "background-color": "#8b8ca0" },
  },
  {
    selector: "node[type='event']",
    style: { "background-color": "#94a3b8" },
  },
  {
    selector: "node[type='technology']",
    style: { "background-color": "#d4a574" },
  },
  {
    selector: "node[type='theory']",
    style: { "background-color": "#a0a0b0" },
  },
  {
    selector: "node[type='metric']",
    style: { "background-color": "#b0a090" },
  },
  {
    selector: "node:selected",
    style: {
      width: 20,
      height: 20,
      "border-width": 3,
      "border-color": "#2c3e6b",
    },
  },
  {
    selector: "node.dimmed",
    style: { opacity: 0.15 },
  },
  {
    selector: "node.highlighted",
    style: {
      opacity: 1,
      "border-color": "#2c3e6b",
      "border-width": 3,
    },
  },
  {
    selector: "edge",
    style: {
      width: 1,
      "line-color": "#d1d5db",
      "target-arrow-color": "#d1d5db",
      "target-arrow-shape": "triangle",
      "arrow-scale": 0.8,
      "curve-style": "bezier",
      label: "data(label)",
      "font-size": "9px",
      "font-family": "'JetBrains Mono', monospace",
      color: "#9ca3af",
      "text-opacity": 0,
      "transition-property": "line-color, width, text-opacity",
      "transition-duration": "200ms",
    },
  },
  {
    selector: "edge.dimmed",
    style: { opacity: 0.05 },
  },
  {
    selector: "edge.highlighted",
    style: {
      width: 2.5,
      "line-color": "#2c3e6b",
      "target-arrow-color": "#2c3e6b",
      "text-opacity": 1,
    },
  },
  {
    selector: "edge.hover",
    style: {
      width: 2,
      "line-color": "#6b7280",
      "target-arrow-color": "#6b7280",
      "text-opacity": 1,
    },
  },
];
