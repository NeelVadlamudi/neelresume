(function () {
  const spin = document.querySelector(".rotor-spin");
  const links = Array.from(document.querySelectorAll(".chapter-list a"));
  const ticks = Array.from(document.querySelectorAll(".ticks line"));
  const scroller = document.querySelector(".chapter-scroller");
  const order = links.map(function (link) {
    return link.getAttribute("href").slice(1);
  });

  let current = order[0];
  let lock = null;
  let settleTimer = 0;
  let frame = 0;

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function setActive(id) {
    if (!order.includes(id)) return;
    current = id;
    const link = links.find(function (item) {
      return item.getAttribute("href") === "#" + id;
    });
    const angle = link ? link.getAttribute("data-angle") : "-76";
    if (spin) spin.style.setProperty("--angle", angle + "deg");

    links.forEach(function (item) {
      if (item === link) item.setAttribute("aria-current", "true");
      else item.removeAttribute("aria-current");
    });

    ticks.forEach(function (tick) {
      tick.classList.toggle("is-on", tick.getAttribute("data-chapter") === id);
    });

    pinActiveLink(link);
  }

  function pinActiveLink(link) {
    if (!scroller || !link) return;
    if (scroller.scrollWidth <= scroller.clientWidth + 4) return;
    const delta = link.getBoundingClientRect().left - scroller.getBoundingClientRect().left;
    const target = scroller.scrollLeft + delta - (scroller.clientWidth - link.offsetWidth) / 2;
    scroller.scrollTo({
      left: Math.max(0, target),
      behavior: reducedMotion() ? "auto" : "smooth"
    });
  }

  function go(id, push) {
    const el = document.getElementById(id);
    if (!el) return;
    lock = id;
    setActive(id);
    el.scrollIntoView({
      behavior: reducedMotion() ? "auto" : "smooth",
      block: "start"
    });
    const url = "#" + id;
    if (location.hash === url) return;
    if (push) history.pushState(null, "", url);
    else history.replaceState(null, "", url);
  }

  function syncFromScroll() {
    if (lock) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (window.scrollY >= max - 2) {
      setActive(order[order.length - 1]);
      return;
    }
    const marker = window.innerHeight * 0.38;
    let id = order[0];
    order.forEach(function (chapterId) {
      const el = document.getElementById(chapterId);
      if (!el) return;
      if (el.getBoundingClientRect().top <= marker) id = chapterId;
    });
    setActive(id);
  }

  function requestSync() {
    if (frame) return;
    frame = window.requestAnimationFrame(function () {
      frame = 0;
      syncFromScroll();
    });
  }

  links.forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      go(link.getAttribute("href").slice(1), true);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    const tag = event.target && event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (event.target && event.target.isContentEditable) return;

    let dir = 0;
    if (event.key === "ArrowDown" || event.key === "ArrowRight" || event.key === "PageDown") dir = 1;
    if (event.key === "ArrowUp" || event.key === "ArrowLeft" || event.key === "PageUp") dir = -1;
    if (event.key === "Home") {
      event.preventDefault();
      go(order[0], false);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      go(order[order.length - 1], false);
      return;
    }
    if (!dir) return;
    event.preventDefault();
    const index = Math.max(0, order.indexOf(current));
    const next = order[Math.min(order.length - 1, Math.max(0, index + dir))];
    go(next, false);
  });

  window.addEventListener("scroll", function () {
    requestSync();
    if (!lock) return;
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(function () {
      lock = null;
      syncFromScroll();
    }, 160);
  }, { passive: true });

  window.addEventListener("wheel", function () { lock = null; }, { passive: true });
  window.addEventListener("touchmove", function () { lock = null; }, { passive: true });
  window.addEventListener("popstate", function () {
    const id = location.hash.slice(1);
    if (!order.includes(id)) return;
    lock = id;
    setActive(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "auto", block: "start" });
  });
  window.addEventListener("resize", requestSync);

  const hashed = location.hash.slice(1);
  spin.style.transition = "none";
  setActive(order.includes(hashed) ? hashed : order[0]);
  spin.getBoundingClientRect();
  if (!reducedMotion()) spin.style.transition = "";
  requestSync();
})();

(function () {
  const root = document.getElementById("contact");
  if (!root) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !("IntersectionObserver" in window)) {
    root.classList.add("is-in");
  } else {
    const watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        root.classList.add("is-in");
        watch.disconnect();
      });
    }, { threshold: 0.4 });
    watch.observe(root);
  }

  const status = document.getElementById("copy-status");
  let timer = 0;

  function fallbackCopy(value) {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }

  function writeClipboard(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value);
    }
    return fallbackCopy(value) ? Promise.resolve() : Promise.reject();
  }

  function reset(button) {
    button.classList.remove("is-copied");
    const label = button.querySelector(".copy-label");
    if (label) label.textContent = "Copy";
    button.setAttribute("aria-label", button.getAttribute("data-label") || "Copy");
  }

  root.querySelectorAll(".copy").forEach(function (button) {
    button.addEventListener("click", function () {
      const value = button.getAttribute("data-copy");
      writeClipboard(value).then(function () {
        root.querySelectorAll(".copy.is-copied").forEach(function (other) {
          if (other !== button) reset(other);
        });
        button.classList.add("is-copied");
        const label = button.querySelector(".copy-label");
        if (label) label.textContent = "Copied";
        button.setAttribute("aria-label", "Copied");
        if (status) status.textContent = "Copied";
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          reset(button);
          if (status) status.textContent = "";
        }, 1600);
      }).catch(function () {
        if (status) status.textContent = "Copy failed";
      });
    });
  });
})();
