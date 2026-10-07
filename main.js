const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const chips = (list) => `<div class="chips">${list.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>`;

/* ---------- language ---------- */
// A saved choice wins, otherwise take the first supported language from the
// browser's preference list (same order as its Accept-Language header).
function browserLang() {
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language || "en"];
  for (const p of prefs) {
    const base = p.toLowerCase().split("-")[0];
    if (CV[base] && base !== "common") return base;
  }
  return "en";
}
let lang = localStorage.getItem("lang") || browserLang();
const t = () => UI[lang];
const d = () => CV[lang];
const lookup = (obj, path) => path.split(".").reduce((o, k) => o[k], obj);

function setLang(l) {
  if (!CV[l]) return false;
  lang = l;
  localStorage.setItem("lang", l);
  render();
  return true;
}

/* ---------- render content from data.js ---------- */
function render() {
  const c = CV.common;
  document.documentElement.lang = lang;
  document.title = d().title;
  $$("[data-i18n]").forEach((el) => (el.textContent = lookup(t(), el.dataset.i18n)));
  $$("[data-i18n-html]").forEach((el) => (el.innerHTML = lookup(t(), el.dataset.i18nHtml)));
  $$("[data-lang]").forEach((b) => b.classList.toggle("active", b.dataset.lang === lang));

  $("#name").textContent = c.name;
  $("#logo-name").textContent = c.handle;
  $("#pitch").textContent = d().pitch;
  $("#pdf").hidden = !c.pdf;
  if (c.pdf) $("#pdf").href = c.pdf;
  $("#about-text").innerHTML = d().about.map((p) => `<p>${esc(p)}</p>`).join("");

  $("#timeline").innerHTML = d().experience
    .map((e) => `<li><p class="period">${esc(e.period)}</p><h4>${esc(e.title)} <span>@ ${esc(e.company)}</span></h4>
      <p class="muted">${esc(e.text)}</p>${e.points ? `<ul class="points">${e.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}</li>`)
    .join("");

  $("#skills-grid").innerHTML = Object.entries(d().skills)
    .map(([group, list]) => `<div class="skill-group"><h4>// ${esc(group)}</h4>${chips(list)}</div>`)
    .join("");

  $("#projects-grid").innerHTML = c.projects
    .map((p) => `<a class="card" href="${esc(p.url)}" target="_blank" rel="noopener"><h4>${esc(p.name)}</h4><p>${esc(d().projectText[p.name])}</p><p class="print-only card-url">${esc(p.url.replace(/^https?:\/\//, ""))}</p>${chips(p.tags)}</a>`)
    .join("");
  tilt();

  $("#edu").innerHTML = d().education
    .map((e) => `<li><p class="period">${esc(e.period)}</p><h4>${esc(e.title)}</h4><p class="muted">${esc(e.school)}</p></li>`)
    .join("");

  $("#links").innerHTML = c.links.map((l) => `<a class="btn ghost" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("");

  // Only visible when printing: static title and a contact line under the name
  $("#print-role").textContent = d().roles[0];
  const short = (u) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  $("#print-meta").textContent = [c.location, "www.pierre-adam.fr", ...c.links.map((l) => short(l.url))].join("  |  ");
}

/* ---------- neofetch (shared by the intro and the console) ---------- */
function neofetchHTML() {
  const first = d().experience[d().experience.length - 1].period.slice(0, 4);
  const years = new Date().getFullYear() - Number(first);
  const skills = Object.values(d().skills).flat();
  const logo = [
    "        .--.",
    "       |o_o |",
    "       |:_/ |",
    "      //   \\ \\",
    "     (|     | )",
    "    /'\\_   _/`\\",
    "    \\___)=(___/",
  ].join("\n");
  const info = [
    ["OS", "CV Linux x86_64 (Strasbourg)"],
    ["Host", d().experience[0].company],
    ["Kernel", d().roles[0]],
    ["Uptime", t().uptime(years)],
    ["Packages", `${skills.length} (${skills.filter((s) => ["Java", "Scala", "Python", "TypeScript"].includes(s)).join(", ")})`],
    ["Shell", "bash 5.2"],
    ["Locale", lang === "fr" ? "fr_FR.UTF-8" : "en_US.UTF-8"],
    ["Terminal", "pierreadam.js"],
  ];
  const colors = ["#2e3436", "#cc0000", "#4e9a06", "#c4a000", "#3465a4", "#75507b", "#06989a", "#d3d7cf"]
    .map((c) => `<span class="neo-color" style="background:${c}"></span>`).join("");
  return `<div class="neofetch"><pre class="neo-logo">${esc(logo)}</pre><div>
    <b class="neo-key">guest</b>@<b class="neo-key">pierreadam</b><br>----------------<br>
    ${info.map(([k, v]) => `<b class="neo-key">${k}</b>: ${esc(v)}`).join("<br>")}<br><br>${colors}</div></div>`;
}

/* ---------- terminal intro ---------- */
function intro() {
  const box = $("#intro");
  const boot = $("#boot");
  const term = box.querySelector(".term");
  const out = $("#intro-text");
  if (reduceMotion || sessionStorage.getItem("introSeen")) return box.remove();

  const profile = JSON.stringify({
    name: CV.common.name,
    role: d().roles[0],
    company: d().experience[0].company,
    location: CV.common.location,
    languages: ["fr", "en"],
  }, null, 2);
  const lines = [
    { cmd: "whoami" },
    { out: CV.common.handle },
    { cmd: "cat profile.json" },
    { out: profile },
    { cmd: "startx" },
    { out: t().startx.join("\n") },
  ];
  let stopped = false;
  const finish = () => {
    if (stopped) return;
    stopped = true;
    sessionStorage.setItem("introSeen", "1");
    box.classList.add("done");
    setTimeout(() => box.remove(), 700);
  };
  $("#skip").onclick = finish;
  box.querySelector(".win-close").onclick = finish;
  box.querySelector(".win-min").onclick = finish;
  box.querySelector(".win-max").onclick = () => box.querySelector(".term").classList.toggle("maximized");
  addEventListener("keydown", (e) => e.key === "Escape" && finish(), { once: true });

  (async () => {
    // 1. boot log, systemd style
    const counts = {
      experience: d().experience.length,
      skills: Object.values(d().skills).flat().length,
      projects: CV.common.projects.length,
    };
    for (const [ok, text] of t().boot(counts)) {
      if (stopped) return;
      const el = document.createElement("div");
      el.innerHTML = ok ? `[  <span class="ok">OK</span>  ] ${esc(text)}` : esc(text) || "&nbsp;";
      boot.append(el);
      boot.scrollTop = boot.scrollHeight;
      await sleep(ok ? 90 + Math.random() * 160 : 350);
    }
    await sleep(500);
    if (stopped) return;

    // 2. the shell window opens
    boot.remove();
    term.classList.remove("off");
    const add = (html) => {
      const el = document.createElement("div");
      el.innerHTML = html;
      out.append(el);
      out.scrollTop = out.scrollHeight;
      return el;
    };
    // neofetch runs on its own when the shell starts, like from a .bashrc
    await sleep(300);
    add(neofetchHTML());
    await sleep(1200);

    for (const l of lines) {
      if (stopped) return;
      if (l.cmd) {
        const typed = document.createTextNode("");
        add(`<span class="prompt"><b>guest@pierreadam</b>:<i>~</i>$</span> `).append(typed);
        for (const ch of l.cmd) {
          if (stopped) return;
          typed.data += ch;
          await sleep(45 + Math.random() * 60);
        }
        await sleep(250);
      } else {
        add(esc(l.out));
        await sleep(400);
      }
    }
    await sleep(600);
    finish();
  })();
}

/* ---------- rotating typed role ---------- */
async function typeRoles() {
  const el = $("#role");
  if (reduceMotion) {
    el.textContent = d().roles[0];
    return;
  }
  for (let i = 0; ; i++) {
    const roles = d().roles; // re-read each loop so a language switch is picked up
    const word = roles[i % roles.length];
    for (let j = 1; j <= word.length; j++) { el.textContent = word.slice(0, j); await sleep(70); }
    await sleep(1800);
    for (let j = word.length; j >= 0; j--) { el.textContent = word.slice(0, j); await sleep(35); }
    await sleep(300);
  }
}

/* ---------- scroll reveal ---------- */
function reveal() {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("visible"), io.unobserve(e.target))),
    { threshold: 0.1 }
  );
  $$(".reveal").forEach((el) => io.observe(el));
}

/* ---------- 3D tilt on project cards ---------- */
function tilt() {
  if (reduceMotion) return;
  $$(".card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(600px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-4px)`;
    });
    card.addEventListener("mouseleave", () => (card.style.transform = ""));
  });
}

/* ---------- interactive node-graph background ---------- */
function background() {
  const c = $("#bg");
  const ctx = c.getContext("2d");
  let w, h, nodes;
  const mouse = { x: -999, y: -999 };
  const init = () => {
    w = c.width = innerWidth;
    h = c.height = innerHeight;
    const n = Math.min(90, Math.floor((w * h) / 16000));
    nodes = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4 }));
  };
  addEventListener("resize", init);
  // Convert the pointer to canvas pixels: they differ from page pixels when the page
  // is zoomed (CRT mode), so map through the canvas' on-screen box
  addEventListener("mousemove", (e) => {
    const r = c.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) * c.width) / r.width;
    mouse.y = ((e.clientY - r.top) * c.height) / r.height;
  });
  init();

  // colours come from the CSS variables, re-read now and then so themes apply
  const rgbVar = (v) => {
    const hex = getComputedStyle(document.documentElement).getPropertyValue(v).trim().replace("#", "");
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",");
  };
  let colors, frame = 0;
  const draw = () => {
    if (frame++ % 30 === 0) colors = { a: rgbVar("--accent"), b: rgbVar("--accent2") };
    ctx.clearRect(0, 0, w, h);
    for (const p of nodes) {
      if (!reduceMotion) { p.x += p.vx; p.y += p.vy; }
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.fillStyle = `rgb(${colors.a})`;
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 120) { ctx.strokeStyle = `rgba(${colors.b},${(1 - dist / 120) * 0.35})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
      if (dm < 180) { ctx.strokeStyle = `rgba(${colors.a},${(1 - dm / 180) * 0.8})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
    }
    if (!reduceMotion) requestAnimationFrame(draw);
  };
  draw();
}

/* ---------- extra console commands (plug-ins) ----------
   Optional files (themes.js, modem.js, extras.js) call registerCommand() to add commands.
   Deleting one of those files and its <script> tag in index.html removes its commands.
   def = { help: { en, fr }, hidden?: true, run(args, api) } */
const extraCommands = {};
function registerCommand(name, def) {
  extraCommands[name] = def;
}

// Send key presses only to `handler` (capture phase, so page shortcuts don't fire).
// Returns a function that releases the keyboard.
function captureKeys(handler) {
  const h = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || /^F\d+$/.test(e.key)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    handler(e.key.length === 1 ? e.key.toLowerCase() : e.key, e);
  };
  // next tick, so the Enter that started the command is not caught
  setTimeout(() => addEventListener("keydown", h, true), 0);
  return () => removeEventListener("keydown", h, true);
}

/* ---------- easter-egg console (~ key) ---------- */
function consoleEgg() {
  const box = $("#console"), out = $("#console-out"), input = $("#console-in");
  const scroll = () => (out.scrollTop = out.scrollHeight);
  // Keep the last line in view whenever the output changes, including animated lines
  new MutationObserver(scroll).observe(out, { childList: true, subtree: true, characterData: true });
  const print = (s) => { out.append(s + "\n"); scroll(); };
  const printHTML = (html) => { const el = document.createElement("div"); el.innerHTML = html; out.append(el); scroll(); };
  const line = () => { const el = document.createElement("div"); out.append(el); return el; };
  // Echo the typed line with the same coloured prompt as the input line
  const echo = (raw) => {
    const el = line();
    el.innerHTML = `<span class="prompt"><b>guest@pierreadam</b>:<i>~</i>$</span> `;
    el.append(raw);
  };

  // Virtual files: one per section of the page, content in the current language
  const files = {
    "about.txt": () => d().about.join("\n\n"),
    "experience.txt": () => d().experience
      .map((e) => [`${e.period}  ${e.title} @ ${e.company}`, `  ${e.text}`, ...(e.points || []).map((p) => `  - ${p}`)].join("\n"))
      .join("\n\n"),
    "skills.txt": () => Object.entries(d().skills).map(([g, l]) => `${g}: ${l.join(", ")}`).join("\n"),
    "projects.txt": () => CV.common.projects.map((p) => `${p.name}\n  ${d().projectText[p.name]}\n  ${p.url}`).join("\n\n"),
    "education.txt": () => d().education.map((e) => `${e.period}  ${e.title}\n  ${e.school}`).join("\n\n"),
    "contact.txt": () => CV.common.links.map((l) => `${l.label}: ${l.url}`).join("\n"),
  };

  const history = [];

  const neofetch = () => (printHTML(neofetchHTML()), null);

  /* --- pay: fake card terminal --- */
  const dots = async (text, ms = 900) => {
    const el = line();
    el.textContent = text;
    for (let i = 0; i < 3; i++) { await sleep(ms / 3); el.textContent += "."; scroll(); }
    return el;
  };
  const pay = async (args) => {
    const P = t().pay;
    const offline = args.includes("--offline");
    const raw = args.find((a) => !a.startsWith("--"));
    const amount = raw === undefined ? 4.2 : Number(raw.replace(",", "."));
    if (!(amount > 0 && amount < 10000)) return P.invalid;
    const money = new Intl.NumberFormat(lang, { style: "currency", currency: "EUR" }).format(amount);

    print(`${P.amount} ${money}`);
    await dots(P.insert, 1200);
    await dots(P.reading, 600);
    const pin = line();
    pin.textContent = `${P.pin} `;
    for (let i = 0; i < 4; i++) { await sleep(250); pin.textContent += "*"; }
    if (offline) {
      await dots(P.auth, 600);
      printHTML(`<span class="t-warn">${esc(P.offline)}</span>`);
      await sleep(500);
      print(P.offlineOk);
    } else {
      await dots(P.auth, 1200);
    }
    printHTML(`<span class="t-ok">${esc(P.approved)}</span>`);
    await sleep(400);

    const sig = Array.from({ length: 4 }, () => Math.random().toString(16).slice(2, 6).toUpperCase()).join("-");
    const W = 32;
    const row = (l = "", r = "") => `| ${l}${r.padStart(W - 4 - l.length)} |`;
    const center = (s) => `| ${s.padStart((W - 4 + s.length) / 2).padEnd(W - 4)} |`;
    const border = "+" + "-".repeat(W - 2) + "+";
    print([
      border,
      center(P.shop),
      center(new Date().toLocaleString(lang, { dateStyle: "short", timeStyle: "short" })),
      row(),
      row(`1x ${P.item}`, money),
      row("TOTAL", money),
      row("CB **** 4242", P.approved),
      row(),
      row(`NF525 ${sig}`),
      ...(offline ? [row(P.offlineTag)] : []),
      center(P.thanks),
      border,
    ].join("\n"));
    if (offline) print(P.synced);
    return null;
  };

  /* --- matrix rain over the terminal --- */
  const matrix = () => new Promise((resolve) => {
    const m = document.createElement("pre");
    m.className = "matrix";
    box.append(m);
    const cols = Math.floor(m.clientWidth / 8.4);
    const rows = Math.floor(m.clientHeight / 15);
    const heads = Array.from({ length: cols }, () => -Math.floor(Math.random() * rows));
    const chars = "アイウエオカキクケコサシスセソタチツテト0123456789ABCDEF<>/{}$#";
    const grid = Array.from({ length: rows }, () => Array(cols).fill(" "));
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      removeEventListener("keydown", stop);
      m.remove();
      print(t().matrixEnd);
      resolve(null);
    };
    setTimeout(() => addEventListener("keydown", stop), 0);
    setTimeout(stop, 6000);
    (async () => {
      while (!stopped) {
        for (let c = 0; c < cols; c++) {
          const h = heads[c];
          if (h >= 0 && h < rows) grid[h][c] = chars[Math.floor(Math.random() * chars.length)];
          const tail = h - 10;
          if (tail >= 0 && tail < rows) grid[tail][c] = " ";
          heads[c] = h > rows + 10 ? -Math.floor(Math.random() * rows) : h + 1;
        }
        m.textContent = grid.map((r) => r.join("")).join("\n");
        await sleep(60);
      }
    })();
  });

  /* --- hack: fake progress bars --- */
  const hack = async () => {
    const H = t().hack;
    const pad = Math.max(...H.steps.map((s) => s.length)) + 1;
    for (const step of H.steps) {
      const el = line();
      for (let p = 0; p <= 100; p += 5 + Math.floor(Math.random() * 10)) {
        const n = Math.round(p / 5);
        el.textContent = `${step.padEnd(pad)} [${"#".repeat(n)}${".".repeat(20 - n)}] ${p}%`;
        scroll();
        await sleep(70);
      }
      el.textContent = `${step.padEnd(pad)} [${"#".repeat(20)}] 100%`;
    }
    printHTML(`<span class="t-ok">${esc(H.granted)}</span>`);
    await sleep(600);
    print(H.end);
    return null;
  };

  // set while a command runs, so closing the console can stop it (games, plug-ins)
  let runAbort = null;

  /* --- full-size screen over the terminal (games, lynx, sl...) --- */
  const fullscreen = async (run, className = "game") => {
    const wasMax = box.classList.contains("maximized");
    box.classList.add("maximized");
    const screen = document.createElement("pre");
    screen.className = className;
    box.append(screen);
    try {
      return await run(screen, runAbort?.signal);
    } finally {
      screen.remove();
      if (!wasMax) box.classList.remove("maximized");
    }
  };
  const play = async (name) => {
    const score = await fullscreen((screen, signal) => Games[name](screen, t().games, signal));
    return t().games.result(name, score, Games.best(name));
  };

  // what plug-in commands get to work with
  const api = {
    print, printHTML, line, sleep, esc, fullscreen, captureKeys,
    get lang() { return lang; },
    get signal() { return runAbort?.signal; },
  };
  // command names shown in help / man / tab completion: built-ins, then visible plug-ins
  const helpText = (n) => t().cmds[n] ?? extraCommands[n]?.help?.[lang] ?? extraCommands[n]?.help?.en;
  const listed = () => {
    const names = Object.keys(t().cmds);
    const extras = Object.keys(extraCommands).filter((n) => !extraCommands[n].hidden && !names.includes(n));
    names.splice(names.indexOf("lang"), 0, ...extras);
    return names;
  };

  const cmds = {
    help: () => {
      const names = listed();
      const width = Math.max(...names.map((n) => n.length)) + 3;
      return [t().helpTitle, ...names.map((n) => `  ${n.padEnd(width)}${helpText(n)}`)].join("\n");
    },
    whoami: () => `${CV.common.name}, ${d().roles[0]}`,
    ls: () => Object.keys(files).join("  "),
    cat: ([f]) => {
      if (!f) return t().catMissing;
      return files[f] ? files[f]() : t().catNoFile(f);
    },
    neofetch,
    pay,
    matrix,
    hack,
    crt: async ([arg]) => {
      if (arg && !["on", "off"].includes(arg.toLowerCase())) return t().crtUsage;
      const on = arg ? arg.toLowerCase() === "on" : !crtIsOn();
      if (!(await setCrtMode(on))) return on ? t().crtAlreadyOn : t().crtAlreadyOff;
      return on ? t().crtOn : t().crtOff;
    },
    snake: () => play("snake"),
    tetris: () => play("tetris"),
    pwd: () => "/home/guest",
    date: () => new Date().toLocaleString(lang, { dateStyle: "full", timeStyle: "medium" }),
    uname: (args) => (args.includes("-a") ? "Linux pierreadam 6.12.0-cv #1 SMP PREEMPT x86_64 GNU/Linux" : "Linux"),
    echo: (args) => args.join(" "),
    history: () => history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join("\n"),
    man: ([c]) => {
      if (!c) return t().manUsage;
      const desc = listed().includes(c) && helpText(c);
      return desc ? `${c.toUpperCase()}(1)\n\nNAME\n    ${c} - ${desc}` : t().manNone(c);
    },
    lang: ([l]) => {
      const langs = Object.keys(UI);
      if (!l) return t().langUsage(lang, langs);
      if (!setLang(l.toLowerCase())) return `${t().langUnknown(l)}\n${t().langUsage(lang, langs)}`;
      return t().langSet;
    },
    restart: async () => {
      for (const l of t().restart) { print(l); await sleep(450); }
      // replay the intro and start back at the top of the page
      sessionStorage.removeItem("introSeen");
      location.href = location.pathname;
      return null;
    },
    clear: () => ((out.textContent = ""), null),
    exit: () => (toggle(false), null),
    // hidden jokes, not listed in help
    sudo: () => t().sudo,
    rm: () => t().rm,
    vim: () => t().vim,
    vi: () => t().vim,
    nano: () => t().vim,
    emacs: () => t().vim,
    cd: () => t().cd,
    reboot: (args) => cmds.restart(args),
  };

  const toggle = (show = box.classList.contains("hidden")) => {
    box.classList.toggle("hidden", !show);
    if (!show) { input.blur(); runAbort?.abort(); }
    if (show) { if (!out.textContent) print(t().welcome); input.focus(); }
  };
  box.querySelector(".win-close").onclick = () => toggle(false);
  box.querySelector(".win-min").onclick = () => toggle(false);
  box.querySelector(".win-max").onclick = () => { box.classList.toggle("maximized"); input.focus(); };
  // Clicking anywhere in the terminal puts the cursor back in the prompt,
  // unless the click was the end of a text selection (so copy still works)
  box.addEventListener("click", (e) => {
    if (e.target.closest(".win-btns") || input.disabled) return;
    if (getSelection().toString()) return;
    input.focus({ preventScroll: true });
  });
  addEventListener("keydown", (e) => {
    if ((["~", "`", "²"].includes(e.key) || e.code === "Backquote") && e.target !== input) { e.preventDefault(); toggle(); }
    if (e.key === "Escape") toggle(false);
  });

  let hIndex = 0;
  input.addEventListener("keydown", async (e) => {
    // Tab: complete the command name, or the file name after "cat"
    if (e.key === "Tab") {
      e.preventDefault();
      const parts = input.value.trimStart().split(/\s+/);
      const pool = parts.length > 1 ? Object.keys(files) : listed();
      const word = parts[parts.length - 1];
      const hits = pool.filter((n) => n.startsWith(word));
      if (hits.length === 1) {
        parts[parts.length - 1] = hits[0];
        input.value = parts.join(" ") + (parts.length > 1 ? "" : " ");
      } else if (hits.length > 1) {
        echo(input.value);
        print(hits.join("  "));
      }
      return;
    }
    // Up / down: command history
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      hIndex = Math.max(0, Math.min(history.length, hIndex + (e.key === "ArrowUp" ? -1 : 1)));
      input.value = history[hIndex] || "";
      return;
    }
    if (e.key !== "Enter") return;
    const raw = input.value.trim();
    input.value = "";
    echo(raw);
    if (!raw) return scroll();
    history.push(raw);
    hIndex = history.length;
    const [cmd, ...args] = raw.split(/\s+/);
    const name = cmd.toLowerCase();
    const extra = Object.hasOwn(extraCommands, name) && extraCommands[name];
    const fn = Object.hasOwn(cmds, name) ? cmds[name] : extra ? (a) => extra.run(a, api) : null;
    runAbort = new AbortController();
    let res = fn ? fn(args) : t().notFound(cmd);
    if (res instanceof Promise) {
      // animated command: lock the prompt until it's done
      input.disabled = true;
      try {
        res = await res;
      } catch (err) {
        res = String(err?.message || err);
      }
      input.disabled = false;
      if (!box.classList.contains("hidden")) input.focus();
    }
    runAbort = null;
    if (res) print(res);
    scroll();
  });
}

$$("[data-lang]").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));

/* ---------- retro CRT mode (Konami code or `crt` command) ---------- */
// Switch CRT mode on/off with the old-TV power animation.
// Resolves with true if the mode changed, false if it was already in that state.
function setCrtMode(on) {
  const root = document.documentElement;
  if (on === root.classList.contains("crt")) return Promise.resolve(false);
  // the zoom changes the page height: keep the reader at the same place
  const apply = (value) => {
    const ratio = scrollY / (root.scrollHeight - innerHeight || 1);
    root.classList.toggle("crt", value);
    scrollTo({ top: ratio * (root.scrollHeight - innerHeight), behavior: "instant" });
  };
  const power = document.createElement("div");
  power.className = on ? "crt-power" : "crt-power off";
  document.body.append(power);
  // switch on behind the animation, or switch off once it's done
  if (on) apply(true);
  return new Promise((resolve) => setTimeout(() => {
    if (!on) apply(false);
    power.remove();
    resolve(true);
  }, reduceMotion ? 0 : 700));
}
const crtIsOn = () => document.documentElement.classList.contains("crt");

function konami() {
  const code = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let pos = 0;
  addEventListener("keydown", async (e) => {
    if (e.target.matches?.("input, textarea")) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = key === code[pos] ? pos + 1 : key === code[0] ? 1 : 0;
    if (pos < code.length) return;
    pos = 0;
    const on = !crtIsOn();
    await setCrtMode(on);
    toast(on ? t().konamiOn : t().konamiOff);
  });
}

function toast(text) {
  $(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<span class="toast-keys">▲ ▲ ▼ ▼ ◀ ▶ ◀ ▶ B A</span>${esc(text)}`;
  document.body.append(el);
  setTimeout(() => el.classList.add("out"), 3500);
  setTimeout(() => el.remove(), 4200);
}

/* ---------- phone menu ---------- */
const nav = $(".nav");
const setMenu = (open) => {
  nav.classList.toggle("open", open);
  $(".nav-toggle").setAttribute("aria-expanded", open);
};
$(".nav-toggle").addEventListener("click", () => setMenu(!nav.classList.contains("open")));
$$("#menu a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("click", (e) => !nav.contains(e.target) && setMenu(false));

render();
intro();
typeRoles();
reveal();
background();
consoleEgg();
konami();
