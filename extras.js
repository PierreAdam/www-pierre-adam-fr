/* Optional plug-in: old-school console commands: sl (hidden), cowsay, bsod, lynx.
   To remove them: delete this file and its <script> line in index.html. */
(() => {
  const TEXT = {
    en: {
      cowsay: "a cow says something (cowsay hello)",
      bsod: "blue screen of death",
      lynx: "browse this CV like it's 1993",
      moo: [
        "Moo. Hire Pierre.",
        "I only graze on NF525-certified grass.",
        "Card payment accepted. Cow happy.",
        "It works on my pasture.",
        "There is no cloud, just someone else's field.",
      ],
      bsodLines: [
        "A fatal exception 0E has occurred at 0028:C0011E36 in VXD PAYMENT(01) +",
        "00004242. The current application will be terminated.",
        "",
        "*  Press any key to terminate the current application.",
        "*  Press CTRL+ALT+DEL again to restart your computer. You will",
        "   lose any unsaved information in all applications.",
      ],
      bsodContinue: "Press any key to continue",
      bsodAfter: "just kidding. the CV is fine.",
      lynxBye: "lynx: bye.",
      lynxQuit: "Are you really sure you want to quit? (y) ",
    },
    fr: {
      cowsay: "une vache vous parle (cowsay bonjour)",
      bsod: "écran bleu de la mort",
      lynx: "parcourir ce CV comme en 1993",
      moo: [
        "Meuh. Embauchez Pierre.",
        "Je ne broute que de l'herbe certifiée NF525.",
        "Paiement carte accepté. Vache contente.",
        "Ça marche dans mon pré.",
        "Le cloud, c'est juste le pré de quelqu'un d'autre.",
      ],
      bsodLines: [
        "Une exception fatale 0E s'est produite à 0028:C0011E36 dans VXD PAYMENT(01) +",
        "00004242. L'application en cours va être arrêtée.",
        "",
        "*  Appuyez sur une touche pour arrêter l'application en cours.",
        "*  Appuyez de nouveau sur CTRL+ALT+SUPPR pour redémarrer l'ordinateur.",
        "   Toutes les informations non enregistrées seront perdues.",
      ],
      bsodContinue: "Appuyez sur une touche pour continuer",
      bsodAfter: "je plaisante. le CV va bien.",
      lynxBye: "lynx : au revoir.",
      lynxQuit: "Voulez-vous vraiment quitter ? (y) ",
    },
  };
  const tx = (api) => TEXT[api.lang] || TEXT.en;

  // styles for this file only, so deleting it leaves nothing behind
  document.head.insertAdjacentHTML("beforeend", `<style id="extras-css">
    .bsod { position: fixed; inset: 0; z-index: 1000; background: #0000aa; color: #fff; display: grid; place-items: center;
      font: clamp(13px, 1.6vw, 20px)/1.5 "Lucida Console", Consolas, monospace; cursor: default; }
    .bsod pre { margin: 0; white-space: pre-wrap; max-width: 90vw; }
    .bsod .bsod-title { display: inline-block; background: #aaaaaa; color: #0000aa; padding: 0 .6em; }
    .bsod .bsod-blink { animation: blink 1s steps(1) infinite; }
    .lynx { background: #000 !important; color: #c0c0c0 !important; white-space: pre; }
    .lynx .ly-title { color: #fff; font-weight: bold; }
    .lynx .ly-head { color: #ffff55; font-weight: bold; }
    .lynx .ly-link { color: #55ffff; font-weight: bold; }
    .lynx .ly-sel { background: #55ffff; color: #000; }
    .lynx .ly-status { color: #fff; }
    .lynx .ly-help { color: #55ff55; }
    .sl { overflow: hidden; }
    .sl-train { position: absolute; left: 0; top: 0; margin: 0; line-height: 1.15; color: var(--fg); will-change: transform; }
    .sl-puff { position: absolute; color: var(--muted); white-space: pre; pointer-events: none; animation: sl-puff 1.8s ease-out forwards; }
    .sl-toot { color: var(--accent); font-weight: bold; animation: sl-toot 2s steps(1) forwards; }
    @keyframes sl-toot { 0% { opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; } }
    @keyframes sl-puff { to { transform: translate(2.5em, -5em) scale(1.8); opacity: 0; } }
    @media print { .bsod { display: none !important; } }
  </style>`);

  // character size of the monospace screen, to know how many columns/rows fit
  const measure = (el) => {
    const probe = document.createElement("span");
    probe.textContent = "0000000000";
    el.append(probe);
    const r = probe.getBoundingClientRect();
    probe.remove();
    const cs = getComputedStyle(el);
    const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    return { cols: Math.max(40, Math.floor(w / (r.width / 10))), rows: Math.max(12, Math.floor(h / r.height)) };
  };
  const wrap = (text, width) => {
    const out = [];
    let line = "";
    for (const word of String(text).split(/\s+/)) {
      if (line && (line + " " + word).length > width) { out.push(line); line = word; }
      else line = line ? line + " " + word : word;
    }
    if (line) out.push(line);
    return out.length ? out : [""];
  };

  /* ---------- sl: you typed it wrong, here comes the train ---------- */
  const LOCO = [
    "   ____                     ",
    "  |    |       ______       ",
    " _|____|______|  __  |____  ",
    "|   CV EXPRESS   |  | | [] |",
    "|________________|__|_|____|",
    "  @@@   @@@    @@@   @@@    ",
  ];
  const WAGON = (label) => [
    "                    ",
    "    ______________  ",
    "   | [] [] [] []  | ",
    `===|${label}| `,
    "   |______________| ",
    "     @@@      @@@   ",
  ];
  const TRAIN = LOCO.map((l, i) => l + WAGON(" PIERRE  ADAM ")[i] + WAGON("   HIRE  ME   ")[i]);
  const WHEELS = ["(|)", "(/)", "(-)", "(\\)"];
  // true: the train jumps one character at a time, like a real terminal; false: smooth glide
  const SL_CHOPPY = true;

  registerCommand("sl", {
    hidden: true,
    run: (args, api) => api.fullscreen((el, signal) => new Promise((resolve) => {
      // the train pulls into the "station" in the middle, stops so it can be read, then leaves
      el.textContent = "";
      el.classList.add("sl");
      const train = document.createElement("pre");
      train.className = "sl-train";
      el.append(train);
      const draw = (wheel) => (train.textContent = TRAIN.map((l) => l.replaceAll("@@@", wheel)).join("\n"));
      draw(WHEELS[0]);

      // size: about a third of the screen height, and the whole train fits when it stops
      const W = el.clientWidth, H = el.clientHeight;
      train.style.fontSize = "10px";
      const box = train.getBoundingClientRect();
      const scale = Math.min((H * 0.34) / box.height, (W * 0.95) / box.width);
      train.style.fontSize = `${10 * scale}px`;
      const tw = box.width * scale, th = box.height * scale;
      const charW = tw / TRAIN[0].length, charH = th / TRAIN.length;
      const y = (H - th) / 2 + charH;
      const chimney = 4 * charW; // column of the chimney in the art

      const speed = 18 * charW; // px per second: 18 characters a second
      const station = Math.round((W - tw) / 2 / charW) * charW; // train centred
      const STOP_MS = 2000;
      let x = W, last = performance.now(), lastWheel = 0, lastPuff = 0, wheel = 0, stoppedAt = 0;
      const puff = () => {
        const p = document.createElement("span");
        p.className = "sl-puff";
        p.textContent = ["(@@)", "( @ )", "(  )"][Math.floor(Math.random() * 3)];
        p.style.cssText = `left:${(SL_CHOPPY ? Math.round(x / charW) * charW : x) + chimney}px;top:${y - charH * 1.2}px;font-size:${10 * scale}px`;
        if (SL_CHOPPY) p.style.animationTimingFunction = "steps(7)";
        p.addEventListener("animationend", () => p.remove());
        el.append(p);
      };
      const toot = () => {
        const b = document.createElement("span");
        b.className = "sl-puff sl-toot";
        b.textContent = api.lang === "fr" ? "TUT TUUUT !" : "TOOT TOOT!";
        b.style.cssText = `left:${x + chimney - charW}px;top:${y - charH * 2.6}px;font-size:${10 * scale}px`;
        b.addEventListener("animationend", () => b.remove());
        el.append(b);
      };
      const step = (now) => {
        if (signal?.aborted || x < -tw) { el.classList.remove("sl"); return resolve(null); }
        const dt = now - last;
        last = now;
        const atStation = stoppedAt && now - stoppedAt < STOP_MS;
        if (!atStation) x -= (speed * dt) / 1000;
        if (!stoppedAt && x <= station) {
          // arrived: stand still for a moment, with a whistle
          x = station;
          stoppedAt = now;
          toot();
        }
        if (!atStation && now - lastWheel > 120) { draw(WHEELS[++wheel % WHEELS.length]); lastWheel = now; }
        if (now - lastPuff > (atStation ? 450 : 220)) { puff(); lastPuff = now; }
        const shownX = SL_CHOPPY ? Math.round(x / charW) * charW : x;
        train.style.transform = `translate(${shownX}px, ${y}px)`;
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }), "game"),
  });

  /* ---------- cowsay ---------- */
  const COW = [
    "        \\   ^__^",
    "         \\  (oo)\\_______",
    "            (__)\\       )\\/\\",
    "                ||----w |",
    "                ||     ||",
  ];
  registerCommand("cowsay", {
    help: { en: TEXT.en.cowsay, fr: TEXT.fr.cowsay },
    run: (args, api) => {
      const T = tx(api);
      const text = args.join(" ") || T.moo[Math.floor(Math.random() * T.moo.length)];
      const lines = wrap(text, 40);
      const w = Math.max(...lines.map((l) => l.length));
      const bubble = lines.length === 1
        ? [`< ${lines[0]} >`]
        : lines.map((l, i) => {
          const [a, b] = i === 0 ? ["/", "\\"] : i === lines.length - 1 ? ["\\", "/"] : ["|", "|"];
          return `${a} ${l.padEnd(w)} ${b}`;
        });
      return [` ${"_".repeat(w + 2)}`, ...bubble, ` ${"-".repeat(w + 2)}`, ...COW].join("\n");
    },
  });

  /* ---------- bsod: Windows 95 blue screen over the whole page ---------- */
  registerCommand("bsod", {
    help: { en: TEXT.en.bsod, fr: TEXT.fr.bsod },
    run: (args, api) => new Promise((resolve) => {
      const T = tx(api);
      const screen = document.createElement("div");
      screen.className = "bsod";
      const body = T.bsodLines.map((l) => "  " + l).join("\n");
      screen.innerHTML = `<pre><div style="text-align:center"><span class="bsod-title">Windows</span></div>\n${esc(body)}\n\n<div style="text-align:center">${esc(T.bsodContinue)} <span class="bsod-blink">_</span></div></pre>`;
      document.body.append(screen);
      const close = () => {
        release();
        screen.remove();
        resolve(T.bsodAfter);
      };
      const release = captureKeys(close);
      screen.addEventListener("click", close);
      api.signal?.addEventListener("abort", close);
    }),
  });

  /* ---------- lynx: the CV in a text-mode web browser ---------- */
  // Build the page as lines of segments: plain text, headings, or links
  function buildPage(api, width) {
    const lang = api.lang;
    const d = CV[lang], c = CV.common;
    const lines = [], links = [], anchors = {};
    const text = (s, cls) => lines.push([{ t: s, cls }]);
    const para = (s, indent = "   ") => wrap(s, width - indent.length).forEach((l) => text(indent + l));
    const link = (label, href) => ({ t: label, link: links.push({ label, href, line: lines.length }) - 1 });
    const heading = (id, label) => { text(""); anchors[id] = lines.length; text(label.toUpperCase(), "ly-head"); };
    const nav = (k) => document.querySelector(`#menu a[href="#${k}"]`)?.textContent || k;
    const sectionTitle = (k) => document.querySelector(`#${k} h3 span:last-child`)?.textContent || k;

    text("");
    text(c.name.toUpperCase().padStart((width + c.name.length) / 2), "ly-title");
    text(d.roles[0].padStart((width + d.roles[0].length) / 2));
    text("");
    // menu line(s)
    const ids = ["about", "experience", "skills", "projects", "education", "contact"];
    let row = [{ t: "   " }];
    let len = 3;
    ids.forEach((id, i) => {
      const label = `[${nav(id)}]`;
      if (len + label.length + 3 > width) { lines.push(row); row = [{ t: "   " }]; len = 3; }
      row.push(link(label, "#" + id));
      if (i < ids.length - 1) row.push({ t: " | " });
      len += label.length + 3;
    });
    lines.push(row);

    heading("about", sectionTitle("about"));
    d.about.forEach((p, i) => { if (i) text(""); para(p); });

    heading("experience", sectionTitle("experience"));
    d.experience.forEach((e) => {
      text("");
      text(`   * ${e.period}  ${e.title} @ ${e.company}`);
      para(e.text, "     ");
      (e.points || []).forEach((p) => wrap(p, width - 9).forEach((l, i) => text((i ? "         " : "       - ") + l)));
    });

    heading("skills", sectionTitle("skills"));
    Object.entries(d.skills).forEach(([g, l]) => para(`${g}: ${l.join(", ")}`));

    heading("projects", sectionTitle("projects"));
    c.projects.forEach((p) => {
      text("");
      lines.push([{ t: "   * " }, link(p.name, p.url)]);
      para(d.projectText[p.name], "     ");
    });

    heading("education", sectionTitle("education"));
    d.education.forEach((e) => { text(""); text(`   * ${e.period}  ${e.title}`); text(`     ${e.school}`); });

    heading("contact", sectionTitle("contact"));
    c.links.forEach((l) => lines.push([{ t: "   * " }, link(l.label, l.url)]));
    text("");
    lines.push([{ t: "   " }, link(lang === "fr" ? "[Haut de page]" : "[Back to top]", "#top")]);
    anchors.top = 0;
    return { lines, links, anchors };
  }

  registerCommand("lynx", {
    help: { en: TEXT.en.lynx, fr: TEXT.fr.lynx },
    run: (args, api) => api.fullscreen((el, signal) => new Promise((resolve) => {
      const T = tx(api);
      const { cols, rows } = measure(el);
      const width = Math.min(cols - 1, 100);
      const page = buildPage(api, width);
      const view = rows - 4; // title line + 3 status lines
      let top = 0, sel = 0, quitting = false;
      const history = [];

      const visible = (i) => page.links[i].line >= top && page.links[i].line < top + view;
      const clampTop = (v) => Math.max(0, Math.min(v, Math.max(0, page.lines.length - view)));
      // only links on screen can be selected (-1 = none), like the real lynx
      const firstVisible = () => page.links.findIndex((l, i) => visible(i));
      const lastVisible = () => page.links.findLastIndex((l, i) => visible(i));

      const draw = () => {
        const pages = Math.max(1, Math.ceil(page.lines.length / view));
        const title = `${CV.common.name} (p${Math.min(pages, Math.ceil(top / view) + 1)} of ${pages})`;
        const out = [`<span class="ly-title">${esc(title.padStart(width))}</span>`];
        for (let i = top; i < top + view; i++) {
          const segs = page.lines[i] || [];
          out.push(segs.map((s) => {
            const cls = s.link === undefined ? s.cls : s.link === sel ? "ly-link ly-sel" : "ly-link";
            return cls ? `<span class="${cls}">${esc(s.t)}</span>` : esc(s.t);
          }).join(""));
        }
        const cur = page.links[sel];
        out.push(quitting
          ? `<span class="ly-status">${esc(T.lynxQuit)}</span>`
          : `<span class="ly-status">${esc(cur ? `-- ${cur.href}` : "")}</span>`);
        out.push(`<span class="ly-help">  Arrow keys: Up and Down to move.  Right to follow a link; Left to go back.</span>`);
        out.push(`<span class="ly-help"> H)elp O)ptions P)rint G)o M)ain screen Q)uit /=search [delete]=history list</span>`);
        el.innerHTML = out.join("\n");
      };

      const go = (href) => {
        if (href.startsWith("#")) {
          history.push({ top, sel });
          top = clampTop(page.anchors[href.slice(1)] ?? 0);
          sel = firstVisible();
        } else {
          window.open(href, "_blank", "noopener");
        }
      };
      const quit = (msg) => { release(); resolve(msg); };

      const release = captureKeys((k) => {
        if (quitting) {
          quitting = false;
          if (k === "y" || k === "q" || k === "Enter") return quit(T.lynxBye);
          return draw();
        }
        switch (k) {
          case "ArrowDown":
            if (sel >= 0 && sel < page.links.length - 1 && visible(sel + 1)) sel++;
            else if (sel < 0 && firstVisible() >= 0) sel = firstVisible();
            else if (top + view < page.lines.length) {
              top = clampTop(top + view);
              if (sel < 0 || !visible(sel)) sel = firstVisible();
            }
            break;
          case "ArrowUp":
            if (sel > 0 && visible(sel - 1)) sel--;
            else if (top > 0) {
              top = clampTop(top - view);
              if (sel < 0 || !visible(sel)) sel = lastVisible();
            }
            break;
          case " ": case "PageDown":
            top = clampTop(top + view);
            if (sel < 0 || !visible(sel)) sel = firstVisible();
            break;
          case "b": case "PageUp":
            top = clampTop(top - view);
            if (sel < 0 || !visible(sel)) sel = firstVisible();
            break;
          case "Home": top = 0; sel = 0; break;
          case "End": top = clampTop(page.lines.length); sel = page.links.length - 1; break;
          case "ArrowRight": case "Enter":
            if (sel >= 0) go(page.links[sel].href);
            break;
          case "ArrowLeft": case "Backspace": {
            const h = history.pop();
            if (h) ({ top, sel } = h);
            break;
          }
          case "q": quitting = true; break;
          case "Escape": return quit(T.lynxBye);
          default: return;
        }
        draw();
      });
      signal?.addEventListener("abort", () => quit(null));
      draw();
    }), "game lynx"),
  });
})();
