/* Wash 66 live feed.

   Reads the feed from the Hub (hours, notices, prices, which sections show, weather) and applies it to the page.
   The contract is in the Hub's docs/WEBSITE-FEED.md. If the feed can't be reached and nothing is cached, nothing
   changes: the HTML stays exactly as it is, so the site never breaks.

   Safety rules for this file:
   - Text from the feed only ever goes into the page with textContent (never innerHTML).
   - Numbers from the feed are checked (finite, sane range) before they are used.
   - The feed address is fixed. The ?hub= test override works only when the page itself is on localhost. */
(function () {
  "use strict";

  var FEED_URL = "https://hub.cooperpaixao.ca/api/public/website";
  var TZ = "America/Moncton";
  var CACHE_KEY = "w66.feed";
  var DISMISS_KEY = "w66.notices.dismissed";
  var CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
  var REFETCH_MS = 5 * 60 * 1000;
  var TICK_MS = 60 * 1000;
  var TIMEOUT_MS = 5000;
  var MAX_CHARS = 262144;
  var SOON_MS = 7 * 24 * 60 * 60 * 1000;
  var SVG_NS = "http://www.w3.org/2000/svg";

  var root = document.documentElement;
  var feed = null;

  /* ---------- small helpers ---------- */

  function has(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function safe(fn) { try { fn(); } catch (err) { /* one broken part never stops the others */ } }
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt) n.textContent = txt;
    return n;
  }
  function storage(kind) { try { return window[kind]; } catch (err) { return null; } }
  function readKey(kind, key) { try { var s = storage(kind); return s ? s.getItem(key) : null; } catch (err) { return null; } }
  function writeKey(kind, key, val) { try { var s = storage(kind); if (s) s.setItem(key, val); } catch (err) { /* private mode */ } }

  /* ---------- Lucide icons (lucide.dev, ISC licence), drawn with createElementNS ---------- */

  var ICONS = {
    wrench: [["path", { d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z" }]],
    "cloud-snow": [["path", { d: "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" }], ["path", { d: "M8 15h.01" }], ["path", { d: "M8 19h.01" }], ["path", { d: "M12 17h.01" }], ["path", { d: "M12 21h.01" }], ["path", { d: "M16 15h.01" }], ["path", { d: "M16 19h.01" }]],
    "thermometer-snowflake": [["path", { d: "m10 20-1.25-2.5L6 18" }], ["path", { d: "M10 4 8.75 6.5 6 6" }], ["path", { d: "M10.585 15H10" }], ["path", { d: "M2 12h6.5L10 9" }], ["path", { d: "M20 14.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z" }], ["path", { d: "m4 10 1.5 2L4 14" }], ["path", { d: "m7 21 3-6-1.5-3" }], ["path", { d: "m7 3 3 6h2" }]],
    zap: [["path", { d: "M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z" }]],
    cog: [["path", { d: "M11 10.27 7 3.34" }], ["path", { d: "m11 13.73-4 6.93" }], ["path", { d: "M12 22v-2" }], ["path", { d: "M12 2v2" }], ["path", { d: "M14 12h8" }], ["path", { d: "m17 20.66-1-1.73" }], ["path", { d: "m17 3.34-1 1.73" }], ["path", { d: "M2 12h2" }], ["path", { d: "m20.66 17-1.73-1" }], ["path", { d: "m20.66 7-1.73 1" }], ["path", { d: "m3.34 17 1.73-1" }], ["path", { d: "m3.34 7 1.73 1" }], ["circle", { cx: "12", cy: "12", r: "2" }], ["circle", { cx: "12", cy: "12", r: "8" }]],
    "calendar-heart": [["path", { d: "M12.127 21H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v5.125" }], ["path", { d: "M14.62 17.8A2.25 2.25 0 1118 14.836a2.25 2.25 0 113.38 2.966l-2.626 2.856a.998.998 0 01-1.507 0z" }], ["path", { d: "M16 2v3" }], ["path", { d: "M3 9h18" }], ["path", { d: "M8 2v3" }]],
    "calendar-clock": [["path", { d: "M16 14v2.2l1.6 1" }], ["path", { d: "M16 2v3" }], ["path", { d: "M21 7.338V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h2.338" }], ["path", { d: "M3 9h5.859" }], ["path", { d: "M8 2v3" }], ["circle", { cx: "16", cy: "16", r: "6" }]],
    wind: [["path", { d: "M12.8 19.6A2 2 0 1 0 14 16H2" }], ["path", { d: "M17.5 8a2.5 2.5 0 1 1 2 4H2" }], ["path", { d: "M9.8 4.4A2 2 0 1 1 11 8H2" }]],
    "credit-card": [["rect", { width: "20", height: "14", x: "2", y: "5", rx: "2" }], ["line", { x1: "2", x2: "22", y1: "10", y2: "10" }], ["path", { d: "M6 14h2" }]],
    info: [["circle", { cx: "12", cy: "12", r: "10" }], ["path", { d: "M12 16v-4" }], ["path", { d: "M12 8h.01" }]],
    x: [["path", { d: "M18 6 6 18" }], ["path", { d: "m6 6 12 12" }]]
  };
  var KIND_ICON = {
    maintenance: "wrench", weather: "cloud-snow", cold: "thermometer-snowflake", power: "zap", equipment: "cog",
    holiday: "calendar-heart", event: "calendar-clock", vacuums: "wind", payment: "credit-card", info: "info"
  };

  function icon(name, cls) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    if (cls) svg.setAttribute("class", cls);
    ICONS[name].forEach(function (node) {
      var child = document.createElementNS(SVG_NS, node[0]);
      Object.keys(node[1]).forEach(function (k) { child.setAttribute(k, node[1][k]); });
      svg.appendChild(child);
    });
    return svg;
  }

  /* ---------- checking the feed ---------- */

  var DAY_KINDS = { regular: 1, holiday: 1, special: 1 };
  var NOTICE_KINDS = { maintenance: 1, weather: 1, cold: 1, power: 1, equipment: 1, holiday: 1, event: 1, vacuums: 1, payment: 1, info: 1 };
  var TONES = { closed: 1, warning: 1, info: 1 };
  var SECTION_KEYS = ["washes", "membership", "results", "winter", "extras", "detailing", "reviews", "giftCards", "faq"];
  var SECTION_IDS = { washes: "washes", membership: "membership", results: "results", winter: "winter", extras: "extras", detailing: "detailing", reviews: "reviews", giftCards: "gift-cards", faq: "faq" };
  var PRICE_KEYS = [
    "good.single", "better.single", "best.single",
    "good.monthly", "better.monthly", "best.monthly",
    "good.monthlyWithTax", "better.monthlyWithTax", "best.monthlyWithTax",
    "good.prepay3", "better.prepay3", "best.prepay3",
    "good.prepay3Save", "better.prepay3Save", "best.prepay3Save",
    "best.sixPlusOne", "vacuum",
    "detail.p1", "detail.p2", "detail.p3", "detail.interior", "detail.dressing", "detail.garbageMin", "detail.garbageMax",
    "gift.value1", "gift.price1", "gift.value2", "gift.price2"
  ];

  function text(v, max) {
    if (typeof v !== "string") return null;
    v = v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
    return v ? v.slice(0, max) : null;
  }
  function num(v, lo, hi) { return typeof v === "number" && isFinite(v) && v >= lo && v <= hi ? v : null; }
  function minutes(t) {
    var m = typeof t === "string" ? /^([01]\d|2[0-3]):([0-5]\d)$/.exec(t) : null;
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }
  function instant(v) {
    if (typeof v !== "string" || v.length > 40) return null;
    var t = Date.parse(v);
    return isFinite(t) ? t : null;
  }
  function validDate(s) {
    var m = typeof s === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) : null;
    if (!m) return false;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  }

  function cleanDay(d) {
    if (!d || typeof d !== "object" || !validDate(d.date)) return null;
    var out = { date: d.date, closed: d.closed === true, open: null, close: null, kind: has(DAY_KINDS, d.kind) ? d.kind : "regular", label: text(d.label, 80) };
    if (!out.closed) {
      out.open = minutes(d.open);
      out.close = minutes(d.close);
      if (out.open === null || out.close === null || out.close <= out.open) return null;
    }
    return out;
  }

  function cleanNotice(n) {
    if (!n || typeof n !== "object") return null;
    var id = text(n.id, 64), title = text(n.title, 120), startsAt = instant(n.startsAt);
    if (!id || !title || startsAt === null) return null;
    var endsAt = n.endsAt === null || n.endsAt === undefined ? null : instant(n.endsAt);
    if (n.endsAt !== null && n.endsAt !== undefined && endsAt === null) return null;
    return {
      id: id,
      kind: has(NOTICE_KINDS, n.kind) ? n.kind : "info",
      tone: has(TONES, n.tone) ? n.tone : "info",
      title: title,
      message: text(n.message, 400),
      closesWash: n.closesWash === true,
      startsAt: startsAt,
      endsAt: endsAt,
      showEndTime: n.showEndTime === true
    };
  }

  /* Returns a clean copy of the feed, or null when it isn't something this version understands */
  function sanitize(raw) {
    if (!raw || typeof raw !== "object" || raw.version !== 1) return null;
    var out = { days: [], dayMap: {}, regular: null, holiday: null, notices: [], prices: {}, taxRate: 15, sections: null, weather: null };

    if (Array.isArray(raw.days)) {
      raw.days.slice(0, 60).forEach(function (d) {
        var c = cleanDay(d);
        if (c) { out.days.push(c); out.dayMap[c.date] = c; }
      });
    }

    if (Array.isArray(raw.regularHours)) {
      var reg = [], count = 0;
      raw.regularHours.slice(0, 14).forEach(function (r) {
        if (!r || typeof r !== "object" || typeof r.weekday !== "number" || r.weekday % 1 !== 0 || r.weekday < 0 || r.weekday > 6 || reg[r.weekday]) return;
        var c = cleanDay({ date: "2000-01-01", closed: r.closed, open: r.open, close: r.close });
        if (!c) return;
        reg[r.weekday] = { closed: c.closed, open: c.open, close: c.close };
        count++;
      });
      if (count === 7) out.regular = reg;
    }

    if (raw.holidayHours && typeof raw.holidayHours === "object") {
      var ho = minutes(raw.holidayHours.open), hc = minutes(raw.holidayHours.close);
      if (ho !== null && hc !== null && hc > ho) out.holiday = { open: ho, close: hc };
    }

    if (Array.isArray(raw.notices)) {
      raw.notices.slice(0, 12).forEach(function (n) {
        var c = cleanNotice(n);
        if (c) out.notices.push(c);
      });
    }

    if (raw.prices && typeof raw.prices === "object") {
      PRICE_KEYS.forEach(function (k) {
        if (!has(raw.prices, k)) return;
        var v = num(raw.prices[k], 0.01, 1000);
        if (v !== null) out.prices[k] = Math.round(v * 100) / 100;
      });
    }

    var tax = num(raw.taxRate, 0, 30);
    if (tax !== null) out.taxRate = tax;

    if (raw.sections && typeof raw.sections === "object") {
      out.sections = {};
      SECTION_KEYS.forEach(function (k) {
        var s = has(raw.sections, k) ? raw.sections[k] : null;
        var state = s && (s.state === "paused" || s.state === "off") ? s.state : "on";
        out.sections[k] = { state: state, note: s ? text(s.note, 300) : null };
      });
    }

    if (raw.weather && typeof raw.weather === "object" && (raw.weather.effect === "snow" || raw.weather.effect === "rain")) {
      var inten = num(raw.weather.intensity, 0, 1);
      out.weather = { effect: raw.weather.effect, intensity: Math.max(0.2, inten === null ? 0.5 : inten) };
    }

    return out;
  }

  /* ---------- time, always in Moncton (Atlantic) wall-clock time ---------- */

  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var DAYS3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var formatter = null;

  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function dowOf(date) {
    var p = date.split("-");
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
  }
  function addDays(date, n) {
    var p = date.split("-");
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }
  /* {date: "2026-11-13", mins: minutes since midnight, dow: 0 to 6} at the wash, or null if this browser can't do time zones */
  function wall(ms) {
    try {
      if (!formatter) {
        formatter = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
      }
      var p = {};
      formatter.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
      var date = p.year + "-" + p.month + "-" + p.day;
      if (!validDate(date)) return null;
      return { date: date, mins: (Number(p.hour) % 24) * 60 + Number(p.minute), dow: dowOf(date) };
    } catch (err) {
      return null;
    }
  }
  /* 8 am, 7 pm, 10:30 am */
  function clock(mins, tight) {
    var h = Math.floor(mins / 60), m = mins % 60;
    return ((h % 12) || 12) + (m ? ":" + pad(m) : "") + (tight ? " " : " ") + (h >= 12 ? "pm" : "am");
  }
  function shortDate(date) {
    var p = date.split("-");
    return DAYS3[dowOf(date)] + ", " + MONTHS3[+p[1] - 1] + " " + (+p[2]);
  }

  /* ---------- today's hours and the open / closed pill ---------- */

  function dayFor(f, date) {
    if (has(f.dayMap, date)) return f.dayMap[date];
    var r = f.regular && f.regular[dowOf(date)];
    return r ? { date: date, closed: r.closed, open: r.open, close: r.close, kind: "regular", label: null } : null;
  }
  function nextOpen(f, today) {
    for (var i = 1; i <= 21; i++) {
      var date = addDays(today.date, i), d = dayFor(f, date);
      if (d && !d.closed) return { ahead: i, date: date, day: d };
    }
    return null;
  }
  function opensPhrase(nx) {
    var when = nx.ahead === 1 ? "tomorrow" : nx.ahead <= 6 ? DAYS[dowOf(nx.date)] : shortDate(nx.date);
    return when + " at " + clock(nx.day.open);
  }
  function noticeActive(n, now) { return n.startsAt <= now && (n.endsAt === null || now < n.endsAt); }

  /* "2 pm", or "tomorrow at 8 am" / "Sat, Nov 15 at 10 am" when it isn't today */
  function backAt(ms, today) {
    var w = wall(ms);
    if (!w) return "later";
    if (w.date === today.date) return clock(w.mins);
    if (w.date === addDays(today.date, 1)) return "tomorrow at " + clock(w.mins);
    return shortDate(w.date) + " at " + clock(w.mins);
  }

  function feedStatus(f, now, t) {
    var closing = null;
    f.notices.forEach(function (n) {
      if (!n.closesWash || !noticeActive(n, now)) return;
      var end = n.endsAt === null ? Infinity : n.endsAt;
      if (!closing || end > closing.end) closing = { n: n, end: end };
    });
    if (closing) {
      var n = closing.n, title = n.title.replace(/[.!?\s]+$/, "") || n.title;
      var s = (/^closed/i.test(title) ? title : "Closed now: " + title) + ".";
      if (n.endsAt !== null && n.showEndTime) s += " Back around " + backAt(n.endsAt, t) + ".";
      return { open: false, text: s };
    }

    var day = dayFor(f, t.date);
    if (!day) return null;
    var nx;
    if (day.closed) {
      nx = nextOpen(f, t);
      return { open: false, text: "Closed today" + (day.label ? " (" + day.label + ")" : "") + (nx ? ". Opens " + opensPhrase(nx) + "." : ".") };
    }
    if (t.mins < day.open) return { open: false, text: "Closed now. Opens at " + clock(day.open) };
    if (t.mins < day.close) {
      var extra = day.kind === "holiday" ? " (holiday hours)" : day.kind === "special" && day.label ? " (" + day.label + ")" : "";
      return { open: true, text: "Open now until " + clock(day.close) + extra };
    }
    nx = nextOpen(f, t);
    return { open: false, text: nx ? "Closed now. Opens " + opensPhrase(nx) : "Closed now" };
  }

  /* No feed: the usual 8 am to 7 pm, every day */
  function fallbackStatus(t) {
    if (t.mins >= 480 && t.mins < 1140) return { open: true, text: "Open now until 7 pm" };
    return { open: false, text: t.mins < 480 ? "Closed now. Opens at 8 am" : "Closed now. Opens tomorrow at 8 am" };
  }

  function renderStatus() {
    var pill = document.querySelector("[data-open-status]");
    var label = pill && pill.querySelector("[data-open-text]");
    if (!label) return;
    var now = Date.now(), t = wall(now);
    if (!t) return; /* keep the static text */
    var r = null;
    if (feed) { try { r = feedStatus(feed, now, t); } catch (err) { r = null; } }
    if (!r) r = fallbackStatus(t);
    pill.classList.toggle("is-open", r.open);
    pill.classList.toggle("is-closed", !r.open);
    if (label.textContent !== r.text) label.textContent = r.text;
  }

  /* ---------- notice bar ---------- */

  var noticeSig = "";

  function dismissed() {
    try { var a = JSON.parse(readKey("sessionStorage", DISMISS_KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (err) { return []; }
  }
  function dismiss(key) {
    var a = dismissed();
    if (a.indexOf(key) === -1) a.push(key);
    writeKey("sessionStorage", DISMISS_KEY, JSON.stringify(a.slice(-50)));
  }
  function noticeBar() {
    var bar = document.querySelector("[data-notices]");
    if (!bar) {
      bar = el("div", "notice-bar");
      bar.setAttribute("data-notices", "");
      bar.setAttribute("role", "status");
      bar.setAttribute("aria-label", "Notices");
      var header = document.querySelector(".site-header");
      if (header && header.parentNode) header.parentNode.insertBefore(bar, header);
      else document.body.insertBefore(bar, document.body.firstChild);
    }
    return bar;
  }
  function soonWhen(ms, t) {
    var w = wall(ms);
    if (!w) return "soon";
    var from = w.mins === 0 ? "" : " from " + clock(w.mins);
    if (w.date === t.date) return "today" + from;
    if (w.date === addDays(t.date, 1)) return "tomorrow" + from;
    return "on " + shortDate(w.date) + from;
  }
  function untilText(n, t) {
    if (!n.showEndTime) return "";
    if (n.endsAt === null) return "Until further notice";
    return "Until about " + backAt(n.endsAt, t);
  }

  function renderNotices() {
    var now = Date.now(), t = wall(now);
    var skip = dismissed(), rows = [];
    if (feed && t) {
      feed.notices.forEach(function (n) {
        var active = noticeActive(n, now);
        var soon = !active && n.startsAt > now && n.startsAt - now <= SOON_MS;
        if (!active && !soon) return;
        var key = active ? n.id : n.id + "~soon";
        if (skip.indexOf(key) !== -1) return;
        var title = n.title.replace(/[.!?:\s]+$/, "") || n.title;
        if (active) {
          var until = untilText(n, t);
          rows.push({ key: key, rank: n.tone === "closed" ? 0 : n.tone === "warning" ? 1 : 2, tone: n.tone, icon: KIND_ICON[n.kind] || "info",
            title: title + (n.message || until ? "." : ""), body: n.message || "", until: until, label: n.title });
        } else {
          rows.push({ key: key, rank: 3, at: n.startsAt, tone: "soon", icon: KIND_ICON[n.kind] || "info",
            title: "Heads up:", body: title + " " + soonWhen(n.startsAt, t) + "." + (n.message ? " " + n.message : ""), until: "", label: n.title });
        }
      });
      rows.sort(function (a, b) { return a.rank - b.rank || (a.at || 0) - (b.at || 0); });
    }

    var sig = JSON.stringify(rows);
    if (sig === noticeSig) return;
    noticeSig = sig;

    var bar = noticeBar();
    while (bar.firstChild) bar.removeChild(bar.firstChild);
    rows.forEach(function (r, i) {
      var row = el("div", "notice notice--" + r.tone);
      var inner = el("div", "wrap notice-inner");
      inner.appendChild(icon(r.icon, "notice-icon"));
      var p = el("p", "notice-text");
      p.appendChild(el("strong", "notice-title", r.title));
      if (r.body) { p.appendChild(document.createTextNode(" ")); p.appendChild(el("span", "notice-msg", r.body)); }
      if (r.until) { p.appendChild(document.createTextNode(" ")); p.appendChild(el("span", "notice-until", r.until)); }
      inner.appendChild(p);
      var btn = el("button", "notice-close");
      btn.type = "button";
      btn.setAttribute("aria-label", "Close notice: " + r.label);
      btn.appendChild(icon("x"));
      btn.addEventListener("click", function () {
        dismiss(r.key);
        renderNotices();
        var left = bar.querySelectorAll(".notice-close");
        var next = left[Math.min(i, left.length - 1)] || document.querySelector(".site-header .brand");
        if (next) next.focus();
      });
      inner.appendChild(btn);
      row.appendChild(inner);
      bar.appendChild(row);
    });
  }

  /* ---------- opening hours on the page ---------- */

  var hoursDate = "";

  /* The regular week as rows: "Every day", or runs like "Mon to Fri" and "Sat" */
  function regularRows(reg) {
    var order = [1, 2, 3, 4, 5, 6, 0];
    function key(r) { return r.closed ? "closed" : r.open + "-" + r.close; }
    var allSame = order.every(function (d) { return key(reg[d]) === key(reg[1]); });
    if (allSame) return [{ label: "Every day", r: reg[1] }];
    var rows = [];
    order.forEach(function (d) {
      var last = rows[rows.length - 1];
      if (last && key(last.r) === key(reg[d])) last.days.push(d);
      else rows.push({ days: [d], r: reg[d] });
    });
    rows.forEach(function (row) {
      var first = DAYS3[row.days[0]], end = DAYS3[row.days[row.days.length - 1]];
      row.label = row.days.length === 1 ? first : row.days.length === 2 ? first + " and " + end : first + " to " + end;
    });
    return rows;
  }
  function hoursText(r, tight) {
    if (r.closed) return "Closed";
    return clock(r.open, tight) + " to " + clock(r.close, tight);
  }
  function differsFromRegular(f, d) {
    var r = f.regular && f.regular[dowOf(d.date)];
    if (!r) return d.kind !== "regular";
    return d.kind !== "regular" || r.closed !== d.closed || r.open !== d.open || r.close !== d.close;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function renderHours() {
    if (!feed || !feed.regular) return;
    var t = wall(Date.now());
    if (!t) return;
    hoursDate = t.date;

    var rows = regularRows(feed.regular);
    if (feed.holiday) rows.push({ label: "Holidays", r: { closed: false, open: feed.holiday.open, close: feed.holiday.close } });

    var upcoming = feed.days.filter(function (d) { return d.date >= t.date && differsFromRegular(feed, d); })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }).slice(0, 10);

    each(document.querySelectorAll("[data-hours]"), function (dl) {
      clear(dl);
      rows.forEach(function (row) {
        var wrap = el("div");
        wrap.appendChild(el("dt", "", row.label));
        wrap.appendChild(el("dd", "", hoursText(row.r)));
        dl.appendChild(wrap);
      });
      var parent = dl.parentNode;
      each(parent.querySelectorAll("[data-hours-upcoming]"), function (old) { parent.removeChild(old); });
      if (!upcoming.length) return;
      var head = el("h3", "hours-subhead", "Upcoming");
      head.setAttribute("data-hours-upcoming", "");
      var list = el("dl", "hours hours--upcoming");
      list.setAttribute("data-hours-upcoming", "");
      upcoming.forEach(function (d) {
        var wrap = el("div");
        wrap.appendChild(el("dt", "", d.date === t.date ? "Today" : d.date === addDays(t.date, 1) ? "Tomorrow" : shortDate(d.date)));
        var dd = el("dd", "", d.closed ? "Closed" : clock(d.open) + " to " + clock(d.close));
        var label = d.label || (d.kind === "holiday" ? "Holiday hours" : d.kind === "special" ? "Special hours" : "");
        if (label) dd.appendChild(el("small", "", label));
        wrap.appendChild(dd);
        list.appendChild(wrap);
      });
      parent.insertBefore(head, dl.nextSibling);
      parent.insertBefore(list, head.nextSibling);
    });

    each(document.querySelectorAll("[data-hours-footer]"), function (p) {
      clear(p);
      rows.forEach(function (row, i) {
        if (i) p.appendChild(document.createElement("br"));
        p.appendChild(document.createTextNode(row.label + " " + hoursText(row.r, true)));
      });
    });
  }

  /* ---------- prices ---------- */

  function formatPrice(n) {
    var cents = Math.round(n * 100);
    return "$" + (cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2));
  }
  function listValues(attr, prices) {
    var out = [];
    var ok = attr.split(",").every(function (k) {
      k = k.trim();
      if (!has(prices, k)) return false;
      out.push(prices[k]);
      return true;
    });
    return ok && out.length ? out : null;
  }

  function applyPrices() {
    var p = feed.prices;
    each(document.querySelectorAll("[data-price]"), function (node) {
      var k = node.getAttribute("data-price");
      if (has(p, k)) node.textContent = formatPrice(p[k]);
    });
    each(document.querySelectorAll("[data-price-min]"), function (node) {
      var v = listValues(node.getAttribute("data-price-min"), p);
      if (v) node.textContent = formatPrice(Math.min.apply(null, v));
    });
    each(document.querySelectorAll("[data-price-max]"), function (node) {
      var v = listValues(node.getAttribute("data-price-max"), p);
      if (v) node.textContent = formatPrice(Math.max.apply(null, v));
    });

    /* The big price numbers and the membership calculator read these two attributes (see main.js) */
    each(document.querySelectorAll(".price-amt[data-tier]"), function (node) {
      var tier = node.getAttribute("data-tier");
      if (has(p, tier + ".single")) node.setAttribute("data-single", String(p[tier + ".single"]));
      if (has(p, tier + ".monthly")) node.setAttribute("data-monthly", String(p[tier + ".monthly"]));
    });
    if (window.W66 && typeof window.W66.refreshPrices === "function") window.W66.refreshPrices({ taxRate: feed.taxRate });

    /* "Pays off at N washes a month", worked out the same way as the calculator */
    each(document.querySelectorAll("[data-payback]"), function (node) {
      var tier = node.getAttribute("data-payback");
      if (!has(p, tier + ".single") || !has(p, tier + ".monthly")) return;
      var withTax = Math.round(p[tier + ".monthly"] * (1 + feed.taxRate / 100) * 100) / 100;
      var n = Math.floor(withTax / p[tier + ".single"]) + 1;
      if (n >= 1 && n <= 60) node.textContent = n + (n === 1 ? " wash a month" : " washes a month");
    });
  }

  /* ---------- sections: on, paused or off ---------- */

  var DEFAULT_NOTE = "This section is paused for now. Please check back soon.";

  function noteBox() {
    var box = el("div", "season-note");
    box.setAttribute("role", "note");
    var svg = icon("info");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    box.appendChild(svg);
    box.appendChild(document.createElement("p"));
    return box;
  }
  /* The first sentence is bold, like the winter note that was written into the page by hand */
  function fillNote(box, note) {
    var p = box.querySelector("p");
    clear(p);
    var m = /^([\s\S]*?[.!?])(\s+[\s\S]*)?$/.exec(note);
    if (!m) { p.textContent = note; return; }
    p.appendChild(el("strong", "", m[1]));
    if (m[2]) p.appendChild(document.createTextNode(m[2]));
  }
  function headOf(section) {
    for (var i = 0; i < section.children.length; i++) {
      var w = section.children[i];
      if (!w.classList.contains("wrap")) continue;
      for (var j = 0; j < w.children.length; j++) {
        if (w.children[j].classList.contains("section-head")) return w.children[j];
      }
    }
    return null;
  }
  function setNote(section, note) {
    var box = section.querySelector(".season-note");
    if (!box) {
      box = noteBox();
      var head = headOf(section);
      if (head) {
        head.parentNode.insertBefore(box, head.nextSibling);
      } else {
        var wrap = el("div", "wrap season-wrap");
        wrap.appendChild(box);
        section.insertBefore(wrap, section.firstChild);
      }
    }
    fillNote(box, note || DEFAULT_NOTE);
  }
  /* Everything under the section heading: it greys out and stops being clickable while paused */
  function pausedBlocks(section) {
    var out = [];
    each(section.children, function (w) {
      if (!w.classList.contains("wrap") || w.classList.contains("season-wrap")) return;
      each(w.children, function (c) {
        if (c.matches(".section-head, .contact-head, .season-note, [data-pause-keep]")) return;
        out.push(c);
      });
    });
    return out;
  }

  function applySection(section, st) {
    var state = st.state;
    if (section.hasAttribute("data-section-only") && state === "paused") state = "on";
    var stamp = state + "|" + (st.note || "");
    if (section.__w66 === stamp) return;
    section.__w66 = stamp;

    section.hidden = state === "off";
    section.classList.remove("is-paused");
    each(section.querySelectorAll("[data-live-inert]"), function (n) {
      n.removeAttribute("inert");
      n.removeAttribute("data-live-inert");
    });
    if (state === "paused") {
      section.classList.add("is-paused");
      pausedBlocks(section).forEach(function (n) {
        n.setAttribute("inert", "");
        n.setAttribute("data-live-inert", "");
      });
      if (!section.hasAttribute("data-no-note")) setNote(section, st.note);
    } else {
      each(section.querySelectorAll(".season-note"), function (n) {
        var wrap = n.parentNode;
        wrap.removeChild(n);
        if (wrap.classList.contains("season-wrap") && wrap.parentNode) wrap.parentNode.removeChild(wrap);
      });
    }
  }

  function applySections() {
    var s = feed.sections;
    if (!s) return;
    var off = [], offHere = [];
    each(document.querySelectorAll("[data-section]"), function (section) {
      var k = section.getAttribute("data-section");
      if (has(s, k)) applySection(section, s[k]);
    });
    SECTION_KEYS.forEach(function (k) {
      if (s[k].state !== "off") return;
      off.push(SECTION_IDS[k]);
      if (document.querySelector('[data-section="' + k + '"]')) offHere.push(SECTION_IDS[k]);
    });
    /* CSS hides links to a switched-off section (see styles.css) */
    root.setAttribute("data-sec-off", off.join(" "));
    root.setAttribute("data-sec-off-here", offHere.join(" "));

    /* The detailing page has a few extras */
    var offNote = document.querySelector("[data-detailing-off-note]");
    if (offNote) offNote.hidden = s.detailing.state !== "off";
    var action = document.querySelector("[data-detailing-action]");
    if (action) {
      var book = s.detailing.state === "on";
      action.textContent = book ? "Book" : "Prices";
      action.setAttribute("href", book ? "#book" : "/packages/");
    }
  }

  /* ---------- weather over the hero photo ---------- */

  var mqWide = window.matchMedia ? window.matchMedia("(min-width: 900px)") : null;
  var mqCalm = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var fx = null;
  var TAU = Math.PI * 2;

  function makeFlake(w, h, anywhere) {
    var size = Math.random();
    return { x: Math.random() * w, y: anywhere ? Math.random() * h : -6 - Math.random() * 20, r: 1.1 + size * size * 2.9,
      vy: 20 + size * 26 + Math.random() * 14, ph: Math.random() * TAU, sw: 6 + Math.random() * 16, sp: 0.4 + Math.random() * 0.9, a: 0.34 + Math.random() * 0.46 };
  }
  function makeStreak(w, h, anywhere) {
    return { x: Math.random() * (w + 60) - 30, y: anywhere ? Math.random() * h : -30 - Math.random() * 40,
      len: 10 + Math.random() * 14, vy: 620 + Math.random() * 320, b: Math.random() < 0.55 ? 0 : 1 };
  }
  function particleCount() {
    var area = fx.w * fx.h;
    var n = fx.kind === "snow" ? area / 7000 * fx.intensity : area / 6000 * fx.intensity;
    return Math.round(Math.max(12, Math.min(fx.kind === "snow" ? 190 : 210, n)));
  }
  function seedFx(reset) {
    if (reset) fx.parts = [];
    var n = particleCount();
    if (fx.parts.length > n) fx.parts.length = n;
    while (fx.parts.length < n) fx.parts.push(fx.kind === "snow" ? makeFlake(fx.w, fx.h, true) : makeStreak(fx.w, fx.h, true));
  }
  function sizeFx() {
    var r = fx.hero.getBoundingClientRect();
    fx.w = Math.max(1, Math.round(r.width));
    fx.h = Math.max(1, Math.round(r.height));
    fx.dpr = Math.min(2, window.devicePixelRatio || 1);
    fx.canvas.width = Math.round(fx.w * fx.dpr);
    fx.canvas.height = Math.round(fx.h * fx.dpr);
    fx.ctx.setTransform(fx.dpr, 0, 0, fx.dpr, 0, 0);
    seedFx(false);
  }
  function frameFx(ts) {
    fx.raf = requestAnimationFrame(frameFx);
    var dt = fx.last ? Math.min(0.05, (ts - fx.last) / 1000) : 0.016;
    fx.last = ts;
    fx.t += dt;
    var ctx = fx.ctx, w = fx.w, h = fx.h, parts = fx.parts, i, p;
    ctx.clearRect(0, 0, w, h);
    if (fx.kind === "snow") {
      ctx.fillStyle = "#fff";
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        p.y += p.vy * dt;
        if (p.y > h + 8) { parts[i] = p = makeFlake(w, h, false); }
        ctx.globalAlpha = p.a;
        ctx.beginPath();
        ctx.arc(p.x + Math.sin(fx.t * p.sp + p.ph) * p.sw, p.y, p.r, 0, TAU);
        ctx.fill();
      }
    } else {
      var slant = 0.22, b;
      ctx.lineWidth = 1;
      ctx.lineCap = "round";
      for (b = 0; b < 2; b++) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = b ? "rgba(214, 232, 255, 0.4)" : "rgba(214, 232, 255, 0.22)";
        ctx.beginPath();
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          if (p.b !== b) continue;
          p.y += p.vy * dt;
          p.x += p.vy * slant * dt;
          if (p.y > h + 30) { parts[i] = p = makeStreak(w, h, false); p.b = b; }
          if (p.x > w + 30) p.x -= w + 60;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.len * slant, p.y - p.len);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  function syncFx() {
    if (!fx) return;
    var run = fx.inView && !document.hidden;
    if (run && !fx.raf) { fx.last = 0; fx.raf = requestAnimationFrame(frameFx); }
    else if (!run && fx.raf) { cancelAnimationFrame(fx.raf); fx.raf = 0; }
  }
  function stopFx() {
    if (!fx) return;
    if (fx.raf) cancelAnimationFrame(fx.raf);
    if (fx.io) fx.io.disconnect();
    if (fx.ro) fx.ro.disconnect();
    window.removeEventListener("resize", fx.onResize);
    if (fx.canvas.parentNode) fx.canvas.parentNode.removeChild(fx.canvas);
    fx = null;
  }
  function startFx(hero, kind, intensity) {
    if (fx && fx.hero === hero) {
      var changed = fx.kind !== kind;
      fx.kind = kind;
      fx.intensity = intensity;
      seedFx(changed);
      return;
    }
    stopFx();
    var canvas = el("canvas", "hero-fx");
    canvas.setAttribute("aria-hidden", "true");
    var ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) return;
    var overlay = hero.querySelector(".hero-overlay");
    hero.insertBefore(canvas, overlay ? overlay.nextSibling : hero.firstChild);
    fx = { hero: hero, canvas: canvas, ctx: ctx, kind: kind, intensity: intensity, parts: [], w: 1, h: 1, dpr: 1, raf: 0, last: 0, t: 0, inView: true, io: null, ro: null };
    fx.onResize = function () { if (fx) sizeFx(); };
    sizeFx();
    if (window.ResizeObserver) { fx.ro = new ResizeObserver(fx.onResize); fx.ro.observe(hero); }
    else window.addEventListener("resize", fx.onResize);
    if (window.IntersectionObserver) {
      fx.io = new IntersectionObserver(function (entries) { if (fx) { fx.inView = entries[entries.length - 1].isIntersecting; syncFx(); } });
      fx.io.observe(hero);
    }
    syncFx();
  }
  function applyWeather() {
    var w = feed && feed.weather;
    var hero = document.querySelector(".hero:not(.hero--page)");
    var allowed = mqWide && mqWide.matches && mqCalm && !mqCalm.matches;
    if (!w || !hero || !allowed) { stopFx(); return; }
    startFx(hero, w.effect, w.intensity);
  }
  function watch(mq, fn) {
    if (!mq) return;
    if (mq.addEventListener) mq.addEventListener("change", fn);
    else if (mq.addListener) mq.addListener(fn);
  }

  /* ---------- loading the feed ---------- */

  function feedUrl() {
    var host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      var hub = new URLSearchParams(window.location.search).get("hub");
      if (hub) {
        try {
          var u = new URL(hub);
          if (u.protocol === "http:" || u.protocol === "https:") {
            if (u.pathname === "/") u.pathname = "/api/public/website";
            return u.href;
          }
        } catch (err) { /* not a web address: use the real feed */ }
      }
    }
    return FEED_URL;
  }

  function apply(f) {
    feed = f;
    safe(applyPrices);
    safe(applySections);
    safe(renderHours);
    safe(applyWeather);
    tick();
  }
  function tick() {
    safe(renderStatus);
    safe(renderNotices);
    if (feed) {
      var t = wall(Date.now());
      if (t && t.date !== hoursDate) safe(renderHours);
    }
  }

  function readCache() {
    try {
      var c = JSON.parse(readKey("localStorage", CACHE_KEY) || "null");
      if (!c || typeof c.t !== "number" || !isFinite(c.t)) return null;
      var age = Date.now() - c.t;
      if (age < -60000 || age > CACHE_MAX_AGE) return null;
      return sanitize(c.feed);
    } catch (err) {
      return null;
    }
  }

  var loading = false, lastLoad = 0;
  function load() {
    if (loading || !window.fetch) return;
    loading = true;
    lastLoad = Date.now();
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, TIMEOUT_MS);
    var request = fetch(feedUrl(), { method: "GET", credentials: "omit", signal: ctl ? ctl.signal : undefined });
    if (!ctl) {
      request = Promise.race([request, new Promise(function (resolve, reject) { setTimeout(function () { reject(new Error("timeout")); }, TIMEOUT_MS); })]);
    }
    request.then(function (r) {
      if (!r.ok) throw new Error("bad status");
      return r.text();
    }).then(function (body) {
      if (body.length > MAX_CHARS) throw new Error("too big");
      var raw = JSON.parse(body);
      var clean = sanitize(raw);
      if (!clean) throw new Error("not a feed we understand");
      writeKey("localStorage", CACHE_KEY, JSON.stringify({ t: Date.now(), feed: raw }));
      apply(clean);
    }).catch(function () {
      /* offline, slow or broken: keep whatever the page already shows */
    }).then(function () {
      clearTimeout(timer);
      loading = false;
    });
  }

  function start() {
    renderStatus(); /* the usual hours until we know better */
    var cached = readCache();
    if (cached) apply(cached);
    load();

    setInterval(tick, TICK_MS);
    setInterval(function () { if (!document.hidden) load(); }, REFETCH_MS);
    document.addEventListener("visibilitychange", function () {
      syncFx();
      if (document.hidden) return;
      tick();
      if (Date.now() - lastLoad >= REFETCH_MS) load();
    });
    watch(mqWide, function () { safe(applyWeather); });
    watch(mqCalm, function () { safe(applyWeather); });
  }

  start();
})();
