/* Terminal games for the easter-egg console: snake and tetris.
   Each game draws text into a <pre> and resolves with the final score when the player quits (Esc). */
const Games = (() => {
  const rand = (n) => Math.floor(Math.random() * n);
  const block = (color, ch = "██") => `<span style="color:${color}">${ch}</span>`;
  const best = (name) => Number(localStorage.getItem(`best-${name}`) || 0);
  const saveBest = (name, score) => score > best(name) && localStorage.setItem(`best-${name}`, score);

  // Route keys to the game only (capture phase, so the console shortcuts don't fire)
  function keys(handler) {
    const h = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || /^F\d+$/.test(e.key)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      handler(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    };
    // registered on the next tick so the Enter that launched the game is ignored
    setTimeout(() => addEventListener("keydown", h, true), 0);
    return () => removeEventListener("keydown", h, true);
  }

  // Board (bordered) on the left, info panel on the right
  function frame(rows, width, panel) {
    const top = "┌" + "─".repeat(width * 2) + "┐";
    const bottom = "└" + "─".repeat(width * 2) + "┘";
    return [top, ...rows.map((r) => `│${r}│`), bottom]
      .map((line, i) => `${line}    ${panel[i] || ""}`)
      .join("\n");
  }

  /* ---------- snake ---------- */
  function snake(el, T, signal) {
    return new Promise((resolve) => {
      const W = 22, H = 16;
      let body, dir, queue, food, score, speed, over, paused, timer;

      const free = (x, y) => !body.some((p) => p.x === x && p.y === y);
      const placeFood = () => { do food = { x: rand(W), y: rand(H) }; while (!free(food.x, food.y)); };

      const reset = () => {
        body = [{ x: 6, y: 8 }, { x: 5, y: 8 }, { x: 4, y: 8 }];
        dir = { x: 1, y: 0 };
        queue = [];
        score = 0;
        speed = 140;
        over = paused = false;
        placeFood();
        draw();
        schedule();
      };
      const schedule = () => { clearTimeout(timer); timer = setTimeout(step, speed); };

      const step = () => {
        if (paused || over) return;
        // apply at most one queued turn per tick, ignoring U-turns
        const turn = queue.shift();
        if (turn && !(turn.x === -dir.x && turn.y === -dir.y)) dir = turn;
        const head = { x: body[0].x + dir.x, y: body[0].y + dir.y };
        const eating = head.x === food.x && head.y === food.y;
        const hitsBody = body.slice(0, eating ? body.length : -1).some((p) => p.x === head.x && p.y === head.y);
        if (head.x < 0 || head.y < 0 || head.x >= W || head.y >= H || hitsBody) {
          over = true;
          saveBest("snake", score);
          return draw();
        }
        body.unshift(head);
        if (eating) { score += 10; speed = Math.max(60, speed - 4); placeFood(); } else body.pop();
        draw();
        schedule();
      };

      const draw = () => {
        const rows = [];
        for (let y = 0; y < H; y++) {
          let r = "";
          for (let x = 0; x < W; x++) {
            const i = body.findIndex((p) => p.x === x && p.y === y);
            if (i === 0) r += block("#b8f56b");
            else if (i > 0) r += block("#3ddc97");
            else if (food.x === x && food.y === y) r += block("#ef4444");
            else r += "  ";
          }
          rows.push(r);
        }
        const panel = [
          "", `<b class="g-title">SNAKE</b>`, "",
          `${T.score}: ${score}`, `${T.best}: ${Math.max(best("snake"), score)}`, "",
          over ? `<b class="g-over">${T.over}</b>` : paused ? `<b class="g-pause">${T.paused}</b>` : "",
          over ? T.again : "", "",
          ...T.controlsSnake,
        ];
        el.innerHTML = frame(rows, W, panel);
      };

      const DIRS = {
        ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, z: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, q: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 },
      };
      const stop = keys((k) => {
        if (k === "Escape") return quit();
        if (over) { if (k === "r" || k === "Enter") reset(); return; }
        if (k === "p") { paused = !paused; draw(); if (!paused) schedule(); return; }
        if (DIRS[k] && queue.length < 3) queue.push(DIRS[k]);
      });
      // Esc, or the console being closed while playing
      const quit = () => {
        clearTimeout(timer);
        stop();
        saveBest("snake", score);
        resolve(score);
      };
      signal?.addEventListener("abort", quit, { once: true });
      reset();
    });
  }

  /* ---------- tetris ---------- */
  const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]],
  };
  const COLORS = { I: "#22d3ee", O: "#facc15", T: "#c084fc", S: "#4ade80", Z: "#f87171", J: "#60a5fa", L: "#fb923c" };
  const rotate = (m) => m[0].map((_, i) => m.map((r) => r[i]).reverse());

  function tetris(el, T, signal) {
    return new Promise((resolve) => {
      const W = 10, H = 20;
      let board, piece, nextKey, bag, score, lines, level, over, paused, timer;

      const draw7 = () => {
        if (!bag.length) bag = Object.keys(SHAPES).sort(() => Math.random() - 0.5);
        return bag.pop();
      };
      const collide = (m, px, py) => m.some((row, y) => row.some((v, x) => {
        if (!v) return false;
        const bx = px + x, by = py + y;
        return bx < 0 || bx >= W || by >= H || (by >= 0 && board[by][bx]);
      }));
      const spawn = () => {
        const k = nextKey;
        nextKey = draw7();
        const m = SHAPES[k];
        piece = { k, m, x: Math.floor((W - m[0].length) / 2), y: 0 };
        if (collide(piece.m, piece.x, piece.y)) { over = true; saveBest("tetris", score); }
      };
      const interval = () => Math.max(80, 800 - (level - 1) * 70);
      const schedule = () => { clearTimeout(timer); if (!over && !paused) timer = setTimeout(fall, interval()); };

      const reset = () => {
        board = Array.from({ length: H }, () => Array(W).fill(null));
        bag = [];
        score = lines = 0;
        level = 1;
        over = paused = false;
        nextKey = draw7();
        spawn();
        draw();
        schedule();
      };

      const lock = () => {
        piece.m.forEach((row, y) => row.forEach((v, x) => { if (v && piece.y + y >= 0) board[piece.y + y][piece.x + x] = COLORS[piece.k]; }));
        const full = board.filter((r) => r.every(Boolean)).length;
        if (full) {
          board = board.filter((r) => !r.every(Boolean));
          while (board.length < H) board.unshift(Array(W).fill(null));
          score += [0, 100, 300, 500, 800][full] * level;
          lines += full;
          level = 1 + Math.floor(lines / 10);
        }
        spawn();
      };

      const move = (dx, dy) => {
        if (collide(piece.m, piece.x + dx, piece.y + dy)) return false;
        piece.x += dx;
        piece.y += dy;
        return true;
      };
      const fall = () => {
        if (!move(0, 1)) lock();
        draw();
        schedule();
      };
      const turn = () => {
        const m = rotate(piece.m);
        // simple wall kicks
        for (const dx of [0, -1, 1, -2, 2]) {
          if (!collide(m, piece.x + dx, piece.y)) { piece.m = m; piece.x += dx; return; }
        }
      };
      const ghostY = () => { let y = piece.y; while (!collide(piece.m, piece.x, y + 1)) y++; return y; };

      const draw = () => {
        const gy = ghostY();
        const rows = [];
        for (let y = 0; y < H; y++) {
          let r = "";
          for (let x = 0; x < W; x++) {
            const inPiece = (py) => piece.m[y - py]?.[x - piece.x];
            if (!over && inPiece(piece.y)) r += block(COLORS[piece.k]);
            else if (board[y][x]) r += block(board[y][x]);
            else if (!over && inPiece(gy)) r += block(COLORS[piece.k], "░░");
            else r += `<span class="g-dot"> ·</span>`;
          }
          rows.push(r);
        }
        const nm = SHAPES[nextKey];
        const preview = [0, 1].map((y) => (nm[y] || []).map((v) => (v ? block(COLORS[nextKey]) : "  ")).join(""));
        const panel = [
          "", `<b class="g-title">TETRIS</b>`, "",
          `${T.score}: ${score}`, `${T.lines}: ${lines}`, `${T.level}: ${level}`, `${T.best}: ${Math.max(best("tetris"), score)}`, "",
          `${T.next}:`, preview[0], preview[1], "",
          over ? `<b class="g-over">${T.over}</b>` : paused ? `<b class="g-pause">${T.paused}</b>` : "",
          over ? T.again : "", "",
          ...T.controlsTetris,
        ];
        el.innerHTML = frame(rows, W, panel);
      };

      const stop = keys((k) => {
        if (k === "Escape") return quit();
        if (over) { if (k === "r" || k === "Enter") reset(); return; }
        if (k === "p") { paused = !paused; draw(); schedule(); return; }
        if (paused) return;
        if (k === "ArrowLeft" || k === "a" || k === "q") move(-1, 0);
        else if (k === "ArrowRight" || k === "d") move(1, 0);
        else if (k === "ArrowUp" || k === "w" || k === "z") turn();
        else if (k === "ArrowDown" || k === "s") { if (move(0, 1)) score += 1; else { lock(); schedule(); } }
        else if (k === " ") { const d = ghostY() - piece.y; piece.y += d; score += 2 * d; lock(); schedule(); }
        else return;
        draw();
      });
      // Esc, or the console being closed while playing
      const quit = () => {
        clearTimeout(timer);
        stop();
        saveBest("tetris", score);
        resolve(score);
      };
      signal?.addEventListener("abort", quit, { once: true });
      reset();
    });
  }

  return { snake, tetris, best };
})();
