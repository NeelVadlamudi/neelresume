/* Fuego preview motion. Off under prefers-reduced-motion and when "Pause motion" is pressed (persisted). */
(function () {
  var KEY = "nv-motion-paused";
  var btn = document.querySelector(".pause");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var paused = reduced || localStorage.getItem(KEY) === "1";
  var lenis = null, ctx = null;

  function setUI() {
    document.documentElement.classList.toggle("motion-off", paused);
    if (btn) { btn.setAttribute("aria-pressed", paused ? "true" : "false"); btn.textContent = reduced ? "Motion off" : (paused ? "Resume motion" : "Pause motion"); }
  }

  function start() {
    if (!window.gsap || !window.ScrollTrigger || !window.Lenis) return;
    gsap.registerPlugin(ScrollTrigger);
    lenis = new Lenis({ lerp: 0.1, anchors: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    ctx = gsap.context(function () {
      document.querySelectorAll(".band-art img").forEach(function (img) {
        var band = img.closest(".band");
        gsap.fromTo(img, { clipPath: "inset(0 0 100% 0)", opacity: 0.2 },
          { clipPath: "inset(0 0 0% 0)", opacity: 1, duration: 1.6, ease: "power2.out",
            scrollTrigger: { trigger: band, start: "top 75%", once: true } });
        gsap.fromTo(img, { yPercent: 6 }, { yPercent: -6, ease: "none",
          scrollTrigger: { trigger: band, start: "top bottom", end: "bottom top", scrub: true } });
      });
      document.querySelectorAll(".dots i").forEach(function (d, i) {
        gsap.to(d, { y: (i % 2 ? -1 : 1) * (6 + (i % 4) * 3), x: (i % 3 - 1) * 4, duration: 2.6 + (i % 5) * 0.5,
          ease: "sine.inOut", repeat: -1, yoyo: true, delay: i * 0.15 });
      });
      document.querySelectorAll(".band h1, .band h2").forEach(function (h) {
        gsap.from(h, { clipPath: "inset(0 100% 0 0)", opacity: 0, x: -12, duration: 1.2, ease: "power3.out", clearProps: "clipPath,transform",
          scrollTrigger: { trigger: h, start: "top 88%", once: true } });
      });
    });
  }
  function raf(t) { if (lenis) lenis.raf(t * 1000); }
  function stop() {
    if (ctx) { ctx.revert(); ctx = null; }
    if (window.gsap) gsap.ticker.remove(raf);
    if (lenis) { lenis.destroy(); lenis = null; }
  }

  setUI();
  if (reduced && btn) { btn.disabled = true; btn.title = "Motion is off because your device asks for reduced motion"; }
  if (btn && !reduced) btn.addEventListener("click", function () {
    paused = !paused;
    localStorage.setItem(KEY, paused ? "1" : "0");
    setUI();
    if (paused) stop(); else start();
  });
  if (!paused) start();
})();
/* Header hides on scroll down, returns on scroll up (always shown when paused / reduced motion). */
(function () {
  var nav = document.querySelector(".spear-nav"), last = 0;
  window.addEventListener("scroll", function () {
    var y = window.scrollY, off = document.documentElement.classList.contains("motion-off");
    nav.classList.toggle("is-hidden", !off && y > 200 && y > last);
    last = y;
  }, { passive: true });
})();
/* Chapters menu: button toggles, Escape or choosing a chapter closes, focus returns to the button. */
(function () {
  var nav = document.querySelector(".spear-nav"), btn = nav && nav.querySelector(".chapters-btn");
  if (!btn) return;
  function set(open, refocus) {
    nav.classList.toggle("menu-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open && refocus) btn.focus();
  }
  btn.addEventListener("click", function () {
    var open = btn.getAttribute("aria-expanded") !== "true";
    set(open);
    if (open) { var cur = nav.querySelector(".chapter-list a[aria-current]") || nav.querySelector(".chapter-list a"); cur.focus(); }
  });
  nav.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("menu-open")) { e.preventDefault(); e.stopPropagation(); set(false, true); return; }
    if (!nav.classList.contains("menu-open") || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
    var ls = Array.prototype.slice.call(nav.querySelectorAll(".chapter-list a")), i = ls.indexOf(document.activeElement);
    e.preventDefault(); ls[(i + (e.key === "ArrowDown" ? 1 : ls.length - 1)) % ls.length].focus();
  });
  nav.querySelectorAll(".chapter-list a").forEach(function (a) { a.addEventListener("click", function () { if (getComputedStyle(btn).display !== "none") set(false); }); });
  document.addEventListener("click", function (e) { if (!nav.contains(e.target)) set(false); });
  nav.addEventListener("focusout", function (e) { if (e.relatedTarget && !nav.contains(e.relatedTarget)) set(false); });
})();
