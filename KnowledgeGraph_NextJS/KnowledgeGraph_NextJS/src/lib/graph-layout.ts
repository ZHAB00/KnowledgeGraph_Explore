import cytoscape from "cytoscape";
import { GRAPH_STYLES } from "./graph-styles";

export function createGraphConfig(
  container: HTMLElement,
  elements: cytoscape.ElementDefinition[]
): cytoscape.CytoscapeOptions {
  const prefersReduced = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return {
    container,
    elements,
    style: GRAPH_STYLES,
    layout: {
      name: "cose",
      animate: !prefersReduced,
      animationDuration: 1000,
      nodeRepulsion: 4500,
      idealEdgeLength: 120,
      gravity: 0.25,
      numIter: 2500,
    } as cytoscape.LayoutOptions,
    minZoom: 0.1,
    maxZoom: 4,
    wheelSensitivity: 0.3,
  };
}

export function setupInteractions(
  cy: cytoscape.Core,
  onNodeClick: (nodeId: string) => void
) {
  cy.on("mouseover", "edge", (e) => e.target.addClass("hover"));
  cy.on("mouseout", "edge", (e) => e.target.removeClass("hover"));

  cy.on("tap", "node", (e) => {
    const node = e.target;
    const neighbors = node.closedNeighborhood();
    cy.elements().addClass("dimmed");
    neighbors.removeClass("dimmed").addClass("highlighted");
    onNodeClick(node.id());
  });

  cy.on("tap", (e) => {
    if (e.target === cy) {
      cy.elements().removeClass("dimmed highlighted");
    }
  });
}

export function filterNodes(cy: cytoscape.Core, query: string) {
  if (!query.trim()) {
    cy.elements().removeClass("dimmed");
    return;
  }
  const lower = query.toLowerCase();
  cy.nodes().forEach((node) => {
    const label = (node.data("label") as string).toLowerCase();
    if (label.includes(lower)) {
      node.removeClass("dimmed").addClass("highlighted");
    } else {
      node.addClass("dimmed").removeClass("highlighted");
    }
  });
  cy.edges().forEach((edge) => {
    if (edge.source().hasClass("dimmed") || edge.target().hasClass("dimmed")) {
      edge.addClass("dimmed");
    } else {
      edge.removeClass("dimmed");
    }
  });
}

export function highlightSubgraph(cy: cytoscape.Core, nodeIds: string[]) {
  const idSet = new Set(nodeIds);
  cy.elements().addClass("dimmed");
  cy.nodes().forEach((node) => {
    if (idSet.has(node.id())) node.removeClass("dimmed").addClass("highlighted");
  });
  cy.edges().forEach((edge) => {
    if (idSet.has(edge.source().id()) && idSet.has(edge.target().id())) {
      edge.removeClass("dimmed").addClass("highlighted");
    }
  });
  if (nodeIds.length > 0) {
    cy.fit(cy.getElementById(nodeIds[0]), 100);
  }
}

export function exportAsPNG(cy: cytoscape.Core) {
  const b64 = cy.png({ full: true, bg: "#fafafa" });
  const link = document.createElement("a");
  link.download = "knowledge-graph.png";
  link.href = b64;
  link.click();
}

export function exportAsSVG(cy: cytoscape.Core) {
  // cytoscape.js does not have built-in .svg() — use canvas-based PNG as fallback,
  // or install cytoscape-svg extension for real SVG export.
  const b64 = cy.png({ full: true, bg: "#fafafa" });
  const link = document.createElement("a");
  link.download = "knowledge-graph.png";
  link.href = b64;
  link.click();
}
