document.documentElement.classList.add("js");

const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

function reducedMotion() {
  return reduceQuery.matches;
}

function showLede() {
  document.querySelector(".lede")?.classList.add("is-ready");
}

function observeReveals() {
  const items = document.querySelectorAll(".reveal");
  const timeline = document.querySelector(".timeline");
  if (reducedMotion() || !("IntersectionObserver" in window)) {
    items.forEach((item) => item.setAttribute("data-visible", ""));
    timeline?.setAttribute("data-drawn", "");
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute("data-visible", "");
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.16, rootMargin: "0px 0px -10% 0px" },
  );

  items.forEach((item, index) => {
    item.style.transitionDelay = `${(index % 5) * 50}ms`;
    observer.observe(item);
  });

  if (timeline) {
    const lineObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          timeline.setAttribute("data-drawn", "");
          lineObserver.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    lineObserver.observe(timeline);
  }
}

function layoutTimeline() {
  const root = document.querySelector(".timeline");
  const svg = root?.querySelector(".timeline-svg");
  if (!root || !svg) return;

  const bounds = root.getBoundingClientRect();
  const width = Math.max(1, root.clientWidth);
  const height = Math.max(1, root.clientHeight);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.replaceChildren();

  const nodes = [...root.querySelectorAll(".tl-item > .tl-node")].map((node) => {
    const box = node.getBoundingClientRect();
    return {
      x: box.left + box.width / 2 - bounds.left,
      y: box.top + box.height / 2 - bounds.top,
      edu: Boolean(node.closest(".tl-edu")),
    };
  }).sort((a, b) => a.y - b.y);

  if (!nodes.length) return;

  const stacked = window.matchMedia("(width < 60rem)").matches;
  const work = nodes.filter((node) => !node.edu);
  const edu = nodes.filter((node) => node.edu);
  const main = stacked ? nodes : work;
  if (!main.length) return;

  const lineX = main[0].x;
  const parts = [`M ${lineX.toFixed(1)} ${main[0].y.toFixed(1)}`, `L ${lineX.toFixed(1)} ${main[main.length - 1].y.toFixed(1)}`];

  if (!stacked) {
    for (const node of edu) {
      const mid = (lineX + node.x) / 2;
      parts.push(
        `M ${lineX.toFixed(1)} ${node.y.toFixed(1)} C ${mid.toFixed(1)} ${node.y.toFixed(1)}, ${mid.toFixed(1)} ${node.y.toFixed(1)}, ${node.x.toFixed(1)} ${node.y.toFixed(1)}`,
      );
    }
  }

  const ns = "http://www.w3.org/2000/svg";
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", parts.join(" "));
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.75");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-dasharray", "0.1 6.5");
  path.setAttribute("vector-effect", "non-scaling-stroke");
  svg.append(path);
}

function initTimeline() {
  const root = document.querySelector(".timeline");
  if (!root) return;
  layoutTimeline();
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(() => layoutTimeline());
    observer.observe(root);
    return;
  }
  window.addEventListener("resize", layoutTimeline);
}

showLede();
observeReveals();
initTimeline();
