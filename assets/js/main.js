(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header border on scroll */
  var header = document.querySelector("[data-header]");
  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Mobile menu */
  var menuBtn = document.querySelector("[data-menu-btn]");
  var menu = document.querySelector("[data-menu]");
  function setMenu(open) {
    if (!menuBtn || !menu) return;
    menuBtn.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
    document.body.classList.toggle("menu-open", open);
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", function () {
      setMenu(menuBtn.getAttribute("aria-expanded") !== "true");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 1000) setMenu(false);
    });
  }

  /* Before / after sliders */
  document.querySelectorAll("[data-ba]").forEach(function (el) {
    var range = el.querySelector(".ba-range");
    var dragging = false;

    function set(pct) {
      pct = Math.max(0, Math.min(100, pct));
      el.style.setProperty("--pos", pct + "%");
      if (range) range.value = Math.round(pct);
    }
    function fromEvent(e) {
      var rect = el.getBoundingClientRect();
      return ((e.clientX - rect.left) / rect.width) * 100;
    }

    el.addEventListener("pointerdown", function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      el.classList.add("is-dragging", "has-moved");
      if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
      set(fromEvent(e));
    });
    el.addEventListener("pointermove", function (e) {
      if (dragging) set(fromEvent(e));
    });
    function stop() {
      dragging = false;
      el.classList.remove("is-dragging");
    }
    el.addEventListener("pointerup", stop);
    el.addEventListener("pointercancel", stop);
    el.addEventListener("lostpointercapture", stop);

    if (range) {
      range.addEventListener("input", function () {
        el.classList.add("has-moved");
        set(Number(range.value));
      });
    }

    /* A one-time sweep on the hero so people see it moves */
    if (el.hasAttribute("data-ba-intro") && !reduceMotion && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        var start = null;
        var keys = [50, 22, 74, 50];
        var dur = 2200;
        function frame(t) {
          if (el.classList.contains("has-moved")) return;
          if (start === null) start = t;
          var p = Math.min(1, (t - start) / dur);
          var seg = Math.min(keys.length - 2, Math.floor(p * (keys.length - 1)));
          var local = p * (keys.length - 1) - seg;
          var eased = local < 0.5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
          set(keys[seg] + (keys[seg + 1] - keys[seg]) * eased);
          if (p < 1) requestAnimationFrame(frame);
        }
        setTimeout(function () { requestAnimationFrame(frame); }, 700);
      }, { threshold: 0.5 });
      io.observe(el);
    }
  });

  /* Prices: single vs monthly */
  var plan = "single";
  var amounts = document.querySelectorAll(".price-amt");
  var pers = document.querySelectorAll("[data-per]");
  var planNote = document.querySelector("[data-plan-note]");
  var noteSingle = planNote ? planNote.innerHTML : "";
  var noteMonthly = "Memberships are one wash a day, every day, at your tier, plus free vacuums every visit. <a href=\"#membership\">See how the tag works.</a>";

  function price(tier, which) {
    var el = document.querySelector('.price-amt[data-tier="' + tier + '"]');
    return el ? Number(el.getAttribute("data-" + which)) : 0;
  }

  document.querySelectorAll("[data-plan]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      plan = btn.getAttribute("data-plan");
      document.querySelectorAll("[data-plan]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b === btn));
      });
      amounts.forEach(function (a) {
        a.textContent = a.getAttribute("data-" + plan);
        var wrap = a.parentElement;
        wrap.classList.remove("is-swapping");
        void wrap.offsetWidth;
        wrap.classList.add("is-swapping");
      });
      pers.forEach(function (p) {
        p.textContent = plan === "single" ? "/ wash" : "/ month";
      });
      if (planNote) planNote.innerHTML = plan === "single" ? noteSingle : noteMonthly;
    });
  });

  /* Membership math */
  var calc = document.querySelector("[data-calc]");
  if (calc) {
    var tier = "better";
    var rangeEl = calc.querySelector("[data-calc-range]");
    var countEl = calc.querySelector("[data-calc-count]");
    var barSingle = calc.querySelector("[data-bar-single]");
    var barMonthly = calc.querySelector("[data-bar-monthly]");
    var valSingle = calc.querySelector("[data-val-single]");
    var valMonthly = calc.querySelector("[data-val-monthly]");
    var verdict = calc.querySelector("[data-calc-verdict]");

    var money = function (n) { return "$" + Math.round(n); };

    function update() {
      var n = Number(rangeEl.value);
      var single = price(tier, "single");
      var monthly = price(tier, "monthly");
      var payGo = single * n;
      var max = Math.max(payGo, monthly, 1);

      countEl.textContent = n;
      rangeEl.style.setProperty("--fill", ((n - 1) / 29) * 100 + "%");
      valSingle.textContent = money(payGo);
      valMonthly.textContent = money(monthly);
      barSingle.style.width = (payGo / max) * 100 + "%";
      barMonthly.style.width = (monthly / max) * 100 + "%";

      var breakEven = single > 0 ? Math.floor(monthly / single) + 1 : 0;
      if (payGo > monthly) {
        verdict.textContent = "You'd save " + money(payGo - monthly) + " a month with a membership.";
      } else if (payGo === monthly) {
        verdict.textContent = "Dead even. Every wash after this one is free with a membership.";
      } else {
        verdict.textContent = "Pay per wash for now. A membership comes out ahead at " + breakEven + " washes a month.";
      }
    }

    calc.querySelectorAll("[data-calc-tier]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        tier = chip.getAttribute("data-calc-tier");
        calc.querySelectorAll("[data-calc-tier]").forEach(function (c) {
          c.setAttribute("aria-pressed", String(c === chip));
        });
        update();
      });
    });
    rangeEl.addEventListener("input", update);
    update();
  }

  /* Detailing buttons prefill the booking form (same page, or via ?package= on /detailing/) */
  var msg = document.getElementById("cf-msg");
  function prefill(what) {
    if (!msg || msg.value.trim()) return;
    msg.value = "Hi, I'd like to book a " + what + ". My vehicle is a ";
  }
  document.querySelectorAll("[data-inquire]").forEach(function (link) {
    link.addEventListener("click", function (e) {
      var what = link.getAttribute("data-inquire");
      if (!msg) {
        link.href = "/detailing/?package=" + encodeURIComponent(what) + "#book";
        return;
      }
      e.preventDefault();
      prefill(what);
      var book = document.getElementById("book") || msg;
      book.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      setTimeout(function () { msg.focus(); msg.setSelectionRange(msg.value.length, msg.value.length); }, reduceMotion ? 0 : 500);
    });
  });
  var params = new URLSearchParams(window.location.search);
  if (params.get("package")) prefill(params.get("package"));

  /* Map: load Google Maps only when asked, so pages stay fast and free of third-party errors */
  document.querySelectorAll("[data-map]").forEach(function (box) {
    var btn = box.querySelector("[data-map-load]");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var frame = document.createElement("iframe");
      frame.src = box.getAttribute("data-map-src");
      frame.title = "Map showing Wash 66 at 7 Pettingill Road, Quispamsis";
      frame.loading = "lazy";
      frame.referrerPolicy = "no-referrer-when-downgrade";
      box.appendChild(frame);
      box.classList.add("is-loaded");
    });
  });

  /* Contact form: sends through FormSubmit to info@wash66.com */
  var form = document.querySelector("[data-contact-form]");
  if (form && params.get("sent") === "1") {
    var done = form.querySelector("[data-form-status]");
    if (done) { done.className = "form-status is-ok"; done.textContent = "Thanks, your message is on its way. We'll get back to you soon."; }
  }
  if (form && window.fetch && window.FormData) {
    var statusEl = form.querySelector("[data-form-status]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.classList.contains("is-sending")) return;
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      if (data._honey) return;
      form.classList.add("is-sending");
      statusEl.className = "form-status";
      statusEl.textContent = "Sending...";
      fetch("https://formsubmit.co/ajax/info@wash66.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      }).then(function (r) {
        return r.json().then(function (j) { return { ok: r.ok, body: j }; });
      }).then(function (res) {
        if (!res.ok || String(res.body.success) === "false") throw new Error("send failed");
        form.reset();
        statusEl.className = "form-status is-ok";
        statusEl.textContent = "Thanks, your message is on its way. We'll get back to you soon.";
      }).catch(function () {
        statusEl.className = "form-status is-error";
        statusEl.innerHTML = 'Sorry, that didn\'t go through. Please call <a href="tel:+15068477627">506-847-7627</a> or email <a href="mailto:info@wash66.com">info@wash66.com</a>.';
      }).then(function () {
        form.classList.remove("is-sending");
      });
    });
  }

  /* Open / closed right now, in Atlantic time */
  var status = document.querySelector("[data-open-status]");
  if (status && window.Intl && Intl.DateTimeFormat) {
    try {
      var parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Moncton", hour: "numeric", minute: "numeric", hour12: false
      }).formatToParts(new Date());
      var h = 0, m = 0;
      parts.forEach(function (p) {
        if (p.type === "hour") h = Number(p.value) % 24;
        if (p.type === "minute") m = Number(p.value);
      });
      var mins = h * 60 + m;
      var open = 8 * 60, close = 19 * 60;
      var text = status.querySelector("[data-open-text]");
      if (mins >= open && mins < close) {
        status.classList.add("is-open");
        text.textContent = "Open now until 7 pm";
      } else {
        status.classList.add("is-closed");
        text.textContent = mins < open ? "Closed now. Opens at 8 am" : "Closed now. Opens tomorrow at 8 am";
      }
    } catch (err) { /* keep the static text */ }
  }

  /* On phones, the hero facts and the before/after fade in as they scroll into view */
  var reveals = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          revealObs.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    reveals.forEach(function (el) { revealObs.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* Mobile action bar: show once the hero is out of view */
  var bar = document.querySelector("[data-action-bar]");
  var hero = document.querySelector(".hero");
  if (bar && hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      bar.classList.toggle("is-visible", !entries[0].isIntersecting);
    }, { rootMargin: "-120px 0px 0px 0px" }).observe(hero);
  } else if (bar) {
    bar.classList.add("is-visible");
  }

  /* Footer year */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
