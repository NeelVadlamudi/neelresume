/* Vintage preview motion. Everything is skipped under prefers-reduced-motion. No 3D/WebGL. */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.gsap || !window.ScrollTrigger || !window.Lenis) return;
  gsap.registerPlugin(ScrollTrigger);

  const lenis = new Lenis({ lerp: 0.1, anchors: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
  gsap.ticker.lagSmoothing(0);

  // Longer, staggered fades inside each project chapter.
  document.querySelectorAll(".chapter.project .chapter-inner").forEach(function (el) {
    const parts = Array.prototype.slice.call(el.children);
    gsap.from(parts, { opacity: 0, y: 28, duration: 1.1, ease: "power2.out", stagger: 0.14,
      scrollTrigger: { trigger: el, start: "top 85%", once: true } });
  });

  // Subtle parallax on section headings (translate only).
  document.querySelectorAll(".chapter-head").forEach(function (el) {
    gsap.fromTo(el, { y: 18 }, { y: -18, ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
  });

  // Odometer digits. Only plain-number stats roll; afterwards the original text node is restored exactly.
  document.querySelectorAll(".outcome .stat").forEach(function (el) {
    const original = el.textContent;
    if (!/^\D*\d+(?:\.\d+)?\D*$/.test(original)) return;
    const strips = [];
    el.textContent = "";
    const sr = document.createElement("span");
    sr.className = "vh";
    sr.textContent = original;
    const vis = document.createElement("span");
    vis.setAttribute("aria-hidden", "true");
    el.appendChild(sr);
    el.appendChild(vis);
    original.split("").forEach(function (ch) {
      if (!/\d/.test(ch)) { vis.appendChild(document.createTextNode(ch)); return; }
      const win = document.createElement("span");
      win.className = "odo";
      const strip = document.createElement("span");
      strip.className = "odo-strip";
      strip.textContent = "0123456789".split("").join("\n") + "\n" + ch;
      win.appendChild(strip);
      vis.appendChild(win);
      strips.push({ strip: strip, d: +ch });
    });
    const tl = gsap.timeline({ paused: true, onComplete: function () { el.textContent = original; } });
    strips.forEach(function (s, i) {
      tl.fromTo(s.strip, { yPercent: 0 }, { yPercent: -(10 / 11) * 100, duration: 1.4 + i * 0.25, ease: "power3.out" }, 0);
    });
    ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: function () { tl.play(); } });
  });
})();
