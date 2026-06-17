"use client";

export default function ExportButton({ filename }: { filename: string }) {
  async function handleClick() {
    const svgEl = document.getElementById("graph-svg") as any;
    if (!svgEl) return;

    const w = svgEl.clientWidth;
    const h = svgEl.clientHeight;

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll("text").forEach((t: any) => { t.style.fontFamily = "sans-serif"; });
    clone.setAttribute("width", String(w));
    clone.setAttribute("height", String(h));

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", "100%"); rect.setAttribute("height", "100%");
    rect.setAttribute("fill", "#fafafa");
    clone.insertBefore(rect, clone.firstChild);

    const svgStr = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w * 2; canvas.height = h * 2;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(2, 2);
      ctx.fillStyle = "#fafafa"; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => {
        if (!b) return;
        const a = document.createElement("a");
        a.download = (filename || "knowledge-graph") + ".png";
        a.href = URL.createObjectURL(b);
        a.click();
      }, "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); };
    img.src = url;
  }

  return (
    <button onClick={handleClick}
      className="block w-full rounded border border-border px-2 py-1 text-xs text-muted hover:bg-bg hover:text-text transition-colors">
      导出 PNG
    </button>
  );
}
