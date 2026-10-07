/* Optional plug-in: `theme` console command with retro looks.
   To remove it: delete this file, the themes/ folder and its <script> line in index.html.
   To remove a single theme: delete themes/<name>.css and its entry in THEMES below. */
(() => {
  const THEMES = {
    amber: { en: "IBM amber monochrome monitor", fr: "moniteur monochrome ambre IBM" },
    gameboy: { en: "original Game Boy, 4 shades of green", fr: "Game Boy d'origine, 4 nuances de vert" },
    c64: { en: "Commodore 64", fr: "Commodore 64" },
    win95: { en: "Windows 95", fr: "Windows 95" },
  };
  const TEXT = {
    en: {
      help: "retro looks (theme amber, theme off...)",
      list: "available themes:",
      current: (n) => `current: ${n}`,
      none: "none",
      set: (n) => `theme: ${n}`,
      off: "theme: back to normal.",
      unknown: (n) => `theme: unknown theme '${n}'. try 'theme'`,
      loadError: (n) => `theme: could not load ${n}`,
      start: "Start", shutDown: "Shut Down...", dos: "MS-DOS Prompt", task: "Pierre Adam - CV",
      safe: "It's now safe to turn off your computer.",
    },
    fr: {
      help: "looks rétro (theme amber, theme off...)",
      list: "thèmes disponibles :",
      current: (n) => `actuel : ${n}`,
      none: "aucun",
      set: (n) => `thème : ${n}`,
      off: "thème : retour à la normale.",
      unknown: (n) => `theme : thème inconnu '${n}'. essayez 'theme'`,
      loadError: (n) => `theme : impossible de charger ${n}`,
      start: "Démarrer", shutDown: "Arrêter...", dos: "Commandes MS-DOS", task: "Pierre Adam - CV",
      safe: "Vous pouvez maintenant éteindre votre ordinateur.",
    },
  };
  const root = document.documentElement;
  const tx = () => TEXT[lang] || TEXT.en;
  const current = () => root.dataset.theme || null;

  // load a stylesheet once, resolve when it is ready (avoids a flash of half-styled page)
  const loadCss = (href, id) => new Promise((resolve, reject) => {
    if (document.getElementById(id)) return resolve();
    const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href, id });
    link.onload = resolve;
    link.onerror = () => { link.remove(); reject(new Error(tx().loadError(href))); };
    document.head.append(link);
  });

  /* --- Windows 95 extras: taskbar, Start menu, clock --- */
  let w95 = null;
  function win95On() {
    const nav = (k) => document.querySelector(`#menu a[href="#${k}"]`)?.textContent || k;
    const bar = document.createElement("div");
    bar.className = "w95-taskbar";
    bar.innerHTML = `
      <button class="w95-start"><span class="w95-logo"></span>${esc(tx().start)}</button>
      <div class="w95-task">${esc(tx().task)}</div>
      <div class="w95-clock"></div>
      <div class="w95-menu" hidden>
        <div class="w95-banner">Windows<b>95</b></div>
        <ul>
          ${["about", "experience", "skills", "projects", "education", "contact"]
            .map((k) => `<li data-go="${k}">${esc(k === "education" ? $("#education h3 span:last-child").textContent : nav(k))}</li>`).join("")}
          <li class="sep"></li>
          <li data-act="dos">${esc(tx().dos)}</li>
          <li class="sep"></li>
          <li data-act="off">${esc(tx().shutDown)}</li>
        </ul>
      </div>`;
    document.body.append(bar);
    const menu = bar.querySelector(".w95-menu");
    const start = bar.querySelector(".w95-start");
    const clock = bar.querySelector(".w95-clock");
    const tick = () => (clock.textContent = new Date().toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" }));
    tick();
    const timer = setInterval(tick, 10000);
    const toggleMenu = (open = menu.hidden) => { menu.hidden = !open; start.classList.toggle("down", open); };
    start.onclick = (e) => { e.stopPropagation(); toggleMenu(); };
    const closeMenu = () => toggleMenu(false);
    document.addEventListener("click", closeMenu);
    menu.onclick = (e) => {
      const li = e.target.closest("li");
      if (!li || li.classList.contains("sep")) return;
      closeMenu();
      if (li.dataset.go) document.getElementById(li.dataset.go)?.scrollIntoView({ behavior: "smooth" });
      if (li.dataset.act === "dos") dispatchEvent(new KeyboardEvent("keydown", { key: "`" }));
      if (li.dataset.act === "off") shutDown();
    };
    w95 = () => { clearInterval(timer); document.removeEventListener("click", closeMenu); bar.remove(); };
  }
  function shutDown() {
    const s = document.createElement("div");
    s.className = "w95-shutdown";
    s.textContent = tx().safe;
    document.body.append(s);
    setTimeout(() => { setTheme(null); s.remove(); }, 2200);
  }

  async function setTheme(name) {
    if (name) {
      await loadCss("themes/common.css", "theme-common");
      await loadCss(`themes/${name}.css`, `theme-${name}`);
    }
    w95?.();
    w95 = null;
    if (name) root.dataset.theme = name;
    else delete root.dataset.theme;
    if (name === "win95") win95On();
  }

  registerCommand("theme", {
    help: { en: TEXT.en.help, fr: TEXT.fr.help },
    run: async ([arg]) => {
      const T = tx();
      if (!arg) {
        const width = Math.max(...Object.keys(THEMES).map((n) => n.length)) + 3;
        return [
          T.list,
          ...Object.entries(THEMES).map(([n, d]) => `  ${n.padEnd(width)}${d[lang] || d.en}`),
          `  ${"off".padEnd(width)}${T.off.replace(/^.*?: /, "")}`,
          "",
          T.current(current() || T.none),
        ].join("\n");
      }
      const name = arg.toLowerCase();
      if (name === "off" || name === "none") { await setTheme(null); return T.off; }
      if (!THEMES[name]) return T.unknown(arg);
      await setTheme(name);
      return T.set(name);
    },
  });
})();
