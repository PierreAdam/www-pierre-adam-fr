/* Optional plug-in: `connect`, a 56k dial-up connection with its (synthesized) sound.
   To remove it: delete this file and its <script> line in index.html. */
(() => {
  const NUMBER = "0836654242";
  const TEXT = {
    en: {
      help: "dial up to the internet, 1998 style (sound on!)",
      ringing: "RINGING",
      carrier: "CARRIER 2100",
      protocol: "PROTOCOL: LAP-M",
      compression: "COMPRESSION: V.42BIS",
      welcome: "Welcome to PierreNet. You've got mail!",
      after: "At this speed, this CV would have taken about 4 minutes to load.",
    },
    fr: {
      help: "connexion à internet façon 1998 (montez le son !)",
      ringing: "SONNERIE",
      carrier: "PORTEUSE 2100",
      protocol: "PROTOCOLE : LAP-M",
      compression: "COMPRESSION : V.42BIS",
      welcome: "Bienvenue sur PierreNet. Vous avez du courrier !",
      after: "À cette vitesse, ce CV aurait mis environ 4 minutes à charger.",
    },
  };

  // Telephone keypad (DTMF) frequency pairs
  const DTMF = {
    1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 5: [770, 1336],
    6: [770, 1477], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477], 0: [941, 1336],
  };

  /* Schedule the whole handshake on an AudioContext. Returns the timeline (seconds from start). */
  function playHandshake(ctx) {
    const master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
    const t0 = ctx.currentTime + 0.05;

    const envelope = (start, dur, vol) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(vol, start + 0.01);
      g.gain.setValueAtTime(vol, start + dur - 0.02);
      g.gain.linearRampToValueAtTime(0, start + dur);
      g.connect(master);
      return g;
    };
    const tone = (freqs, start, dur, vol = 0.6) => {
      const g = envelope(start, dur, vol / freqs.length);
      for (const f of freqs) {
        const o = ctx.createOscillator();
        o.frequency.value = f;
        o.connect(g);
        o.start(start);
        o.stop(start + dur);
      }
    };
    // frequency-shift keying: the "warbling" data bursts
    const fsk = (pair, start, dur, baud, vol = 0.5) => {
      const g = envelope(start, dur, vol);
      const o = ctx.createOscillator();
      o.type = "sine";
      for (let t = start; t < start + dur; t += 1 / baud) o.frequency.setValueAtTime(pair[Math.random() < 0.5 ? 0 : 1], t);
      o.connect(g);
      o.start(start);
      o.stop(start + dur);
    };
    // band-limited noise: the long "shhhhh" of the training phase
    const hiss = (start, dur, vol = 0.9) => {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 1800;
      band.Q.value = 0.6;
      const g = envelope(start, dur, vol);
      // a slow wobble, like the real thing changing modulation
      for (let t = start; t < start + dur; t += 0.25) g.gain.setValueAtTime(vol * (0.6 + Math.random() * 0.4), t);
      src.connect(band).connect(g);
      src.start(start);
      src.stop(start + dur);
    };

    let t = t0;
    const mark = {};
    tone([440], t, 1.1, 0.4); t += 1.25;                         // dial tone
    mark.dial = t - t0;
    for (const d of NUMBER) { tone(DTMF[d], t, 0.08); t += 0.13; } // keypad tones
    t += 0.5;
    mark.ring = t - t0;
    tone([440], t, 1.0, 0.3); t += 1.6;                          // ringing
    mark.answer = t - t0;
    tone([2100], t, 1.6, 0.35); t += 1.7;                        // answer tone
    fsk([980, 1180], t, 0.7, 300); fsk([1650, 1850], t + 0.1, 0.6, 300, 0.4); t += 0.8; // V.8 negotiation
    mark.negotiate = t - t0;
    tone([1200, 2400], t, 0.3); t += 0.35;                       // "bong"
    for (let i = 0; i < 6; i++) { tone([600 + Math.random() * 2400, 400 + Math.random() * 1600], t, 0.09); t += 0.1; } // line probing
    tone([1200, 2400], t, 0.3); t += 0.4;                        // second "bong"
    mark.train = t - t0;
    hiss(t, 2.8); t += 2.9;                                      // training
    mark.connect = t - t0;
    return mark;
  }

  registerCommand("connect", {
    help: { en: TEXT.en.help, fr: TEXT.fr.help },
    run: async (args, api) => {
      const T = TEXT[api.lang] || TEXT.en;
      const signal = api.signal;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = AudioCtx ? new AudioCtx() : null;
      signal?.addEventListener("abort", () => ctx?.close());
      const mark = ctx ? playHandshake(ctx) : { dial: 1.2, ring: 3, answer: 4.6, negotiate: 7, train: 8.3, connect: 11 };

      const start = performance.now();
      const at = async (sec) => { const wait = sec * 1000 - (performance.now() - start); if (wait > 0) await api.sleep(wait); };
      const say = async (sec, text) => { await at(sec); if (!signal?.aborted) api.print(text); };

      api.print("ATZ");
      await say(0.4, "OK");
      await at(mark.dial);
      // type the dial command while the keypad tones play
      const el = api.line();
      el.textContent = "ATDT ";
      for (const d of NUMBER) { if (signal?.aborted) break; el.textContent += d; await api.sleep(130); }
      await say(mark.ring, T.ringing);
      await say(mark.answer, T.carrier);
      await say(mark.negotiate, T.protocol);
      await say(mark.negotiate + 0.6, T.compression);
      await at(mark.connect);
      ctx?.close();
      if (signal?.aborted) return null;
      api.printHTML(`<span class="t-ok">CONNECT 56000/V90</span>`);
      await api.sleep(500);
      api.print(T.welcome);
      api.print(T.after);
      return null;
    },
  });
})();
