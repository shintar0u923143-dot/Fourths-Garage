// Drag Race in a CSR-style side view.
// 1. Wait for the GREEN light, then tap GO to launch (tapping early = false start).
// 2. At each gear checkpoint, tap SHIFT when the needle is in the green zone.
// 3. Tap NITRO for a speed boost (limited uses).
// Reach the finish line for your time. A rival car races you in the next lane.
const DRAG = (() => {
  const canvas = document.getElementById("drag-canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  const TRACK = 3600;                 // distance to the finish (world units)
  const CAR_Y = H * 0.66;
  const START_X = 70;
  const CHECKPOINTS = [0.25, 0.5, 0.75];
  const NITRO_USES = 2;
  const NITRO_TIME = 1.6;
  const SWEET = 0.56;                 // centre of the green zone on the gauge

  let state = "idle";                 // idle | countdown | racing | done | false
  let car = null, build = null, rival = null;
  let dist = 0, v = 0, t = 0, greenAt = 0, launched = false;
  let rivalDist = 0, rivalV = 0, rivalFinishT = null;
  let nitroUses = 0, nitroBoost = 0;
  let checkpointIdx = 0, shiftWindow = 0, needle = 0, needleDir = 1, lastGrade = "";
  let runs = 0, bestTime = null, last = 0, rafId = 0, timers = [];
  let bgOffset = 0;

  const el = id => document.getElementById(id);
  const lightsEl = () => [...document.querySelectorAll("#tree .light")];
  function resetLights() { lightsEl().forEach(l => l.classList.remove("red", "green")); }

  // ---------- Drawing ----------
  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    sky.addColorStop(0, "#1b1f3b");
    sky.addColorStop(1, "#f0884a");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // skyline parallax
    ctx.fillStyle = "#2a2d52";
    for (let i = 0; i < 14; i++) {
      const bx = ((i * 120 - bgOffset * 0.2) % (W + 200) + W + 200) % (W + 200) - 100;
      const bh = 80 + ((i * 53) % 90);
      ctx.fillRect(bx, H * 0.55 - bh, 90, bh);
    }
    // ground and lanes
    ctx.fillStyle = "#3a3f4c"; ctx.fillRect(0, H * 0.55, W, H);
    ctx.fillStyle = "#2b303c";
    ctx.fillRect(0, CAR_Y - 36, W, 72);
    ctx.fillRect(0, CAR_Y + 88, W, 72);
    // scrolling lane dashes
    ctx.fillStyle = "rgba(255,255,255,.55)";
    for (let x = -(bgOffset % 80); x < W; x += 80) {
      ctx.fillRect(x, CAR_Y + 34, 40, 4);
      ctx.fillRect(x, CAR_Y + 84, 40, 4);
    }
    // start line and finish line
    ctx.fillStyle = "#fff"; ctx.fillRect(START_X - 6, CAR_Y - 36, 6, 144);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 ? "#fff" : "#111";
      ctx.fillRect(W - 40 + (i % 2) * 8, CAR_Y - 36 + i * 12, 8, 12);
    }
    ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.font = "bold 18px sans-serif";
    ctx.fillText("FINISH", W - 98, CAR_Y - 46);
  }

  function screenX(d) { return START_X + (d / TRACK) * (W - START_X - 110); }

  function drawCars() {
    if (!car) return;
    drawNitro(screenX(dist), CAR_Y + 26);
    drawCar(ctx, car, build, screenX(dist), CAR_Y + 26, 0.85);
    drawCar(ctx, rival, { paint: rival.color }, screenX(rivalDist), CAR_Y + 118, 0.85);
  }

  function drawNitro(sx, y) {
    if (nitroBoost <= 0) return;
    const len = 70 + Math.random() * 30;
    const g = ctx.createLinearGradient(sx - 120, y, sx - 120 - len, y);
    g.addColorStop(0, "rgba(120,200,255,.95)");
    g.addColorStop(1, "rgba(255,120,30,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx - 110, y - 8); ctx.lineTo(sx - 110 - len, y); ctx.lineTo(sx - 110, y + 8);
    ctx.fill();
  }

  function drawSpeedLines() {
    if (v < 200) return;
    ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const y = CAR_Y - 30 + i * 12 + (i % 2) * 6;
      const x = (i * 157 + bgOffset * 3) % W;
      ctx.beginPath(); ctx.moveTo(W - x, y); ctx.lineTo(W - x - 60 - v / 40, y); ctx.stroke();
    }
  }

  function drawGauge() {
    const gx = W / 2 - 220, gy = H - 40, gw = 440;
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(gx - 8, gy - 18, gw + 16, 36);
    ctx.fillStyle = "#e33"; ctx.fillRect(gx, gy - 8, gw * 0.35, 16);
    ctx.fillStyle = "#ffd23f"; ctx.fillRect(gx + gw * 0.35, gy - 8, gw * 0.3, 16);
    ctx.fillStyle = "#2ecc71"; ctx.fillRect(gx + gw * (SWEET - 0.08), gy - 8, gw * 0.16, 16);
    ctx.fillStyle = "#fff"; ctx.fillRect(gx + gw * needle - 3, gy - 14, 6, 28);
    if (state === "racing" && shiftWindow > 0) {
      ctx.fillStyle = "#fff"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("TAP GO in the GREEN!", W / 2, gy - 26);
      ctx.textAlign = "left";
    }
  }

  function drawHUD() {
    ctx.fillStyle = "#fff"; ctx.font = "bold 18px sans-serif";
    ctx.fillText(`NITRO ${NITRO_USES - nitroUses}/${NITRO_USES} (or N)`, 14, 26);
    if (lastGrade) {
      ctx.fillStyle = /PERFECT|NITRO/.test(lastGrade) ? "#2ecc71" : /MISS/.test(lastGrade) ? "#ff4d4d" : "#ffd23f";
      ctx.font = "bold 26px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(lastGrade, W / 2, 46);
      ctx.textAlign = "left";
    }
    if (state === "racing" && !launched) {
      ctx.fillStyle = "#fff"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("TAP GO to launch!", W / 2, CAR_Y - 60);
      ctx.textAlign = "left";
    }
  }

  function render() {
    drawBackground();
    drawSpeedLines();
    drawCars();
    drawGauge();
    drawHUD();
  }

  // ---------- Simulation ----------
  function updateRace(dt) {
    // Rival: steady pace, a bit behind a good player
    rivalV = Math.min(600 + rival.top * 48, rivalV + (360 + rival.accel * 28) * dt);
    rivalDist += rivalV * dt;
    if (rivalDist >= TRACK && rivalFinishT === null) rivalFinishT = t;

    if (!launched) return;

    // Player: acceleration, top speed, nitro boost
    const boost = nitroBoost > 0;
    const accel = 380 + car.accel * 30 + (boost ? 260 : 0);
    const top = 620 + car.top * 52 + (boost ? 180 : 0);
    v = Math.min(top, v + accel * dt);
    dist += v * dt;
    if (nitroBoost > 0) nitroBoost -= dt;

    // Gear-shift checkpoints
    if (checkpointIdx < CHECKPOINTS.length && dist / TRACK >= CHECKPOINTS[checkpointIdx]) {
      shiftWindow = 1.1;
      checkpointIdx++;
      lastGrade = "";
    }
    if (shiftWindow > 0) {
      shiftWindow -= dt;
      if (shiftWindow <= 0) { v *= 0.97; lastGrade = "MISS -3%"; }
    }

    // Needle sweeps back and forth
    needle += needleDir * dt * 1.5;
    if (needle >= 1) { needle = 1; needleDir = -1; }
    if (needle <= 0) { needle = 0; needleDir = 1; }

    if (dist >= TRACK) finish();
  }

  function tapShift() {
    if (shiftWindow <= 0) return;
    const off = Math.abs(needle - SWEET);
    shiftWindow = 0;
    if (off < 0.06) { v *= 1.1; lastGrade = "PERFECT! +10%"; }
    else if (off < 0.14) { v *= 1.03; lastGrade = "GOOD +3%"; }
    else { v *= 0.95; lastGrade = "MISS -5%"; }
  }

  function tapNitro() {
    if (state !== "racing" || !launched || nitroUses >= NITRO_USES || nitroBoost > 0) return;
    nitroUses++;
    nitroBoost = NITRO_TIME;
    lastGrade = "NITRO!";
  }

  function finish() {
    state = "done";
    const stop = t;
    const best = bestTime === null || stop < bestTime;
    if (best) bestTime = stop;
    const won = rivalFinishT === null || stop < rivalFinishT;
    el("drag-result").textContent = `${stop.toFixed(3)}s ${best ? "🏆 Best!" : ""}`;
    setTimeout(() => {
      el("drag-overlay").querySelector("h3").textContent = won ? "You beat the rival!" : "Nice run!";
      el("drag-overlay").querySelector("p").textContent = `Your time: ${stop.toFixed(3)}s. Best: ${bestTime.toFixed(3)}s`;
      el("drag-start").textContent = "Go Again";
      el("drag-overlay").classList.remove("hidden");
    }, 900);
  }

  function falseStart() {
    state = "false";
    timers.forEach(clearTimeout); timers = [];
    el("drag-result").textContent = "FALSE START ❌";
    setTimeout(() => {
      el("drag-overlay").querySelector("h3").textContent = "False start!";
      el("drag-overlay").querySelector("p").textContent = "You tapped before GREEN. Wait for the green light!";
      el("drag-start").textContent = "Try Again";
      el("drag-overlay").classList.remove("hidden");
    }, 600);
  }

  function countdown() {
    state = "countdown";
    resetLights();
    const stage = [400, 800, 1200];
    lightsEl().forEach((light, i) => {
      timers.push(setTimeout(() => light.classList.add("red"), stage[i] - 300));
    });
    timers.push(setTimeout(() => {
      if (state !== "countdown") return;
      lightsEl().forEach(l => { l.classList.remove("red"); l.classList.add("green"); });
      greenAt = performance.now();
      state = "racing";
    }, 1400 + Math.random() * 900));
  }

  function beginRun() {
    runs++;
    el("drag-round").textContent = `Run ${runs}`;
    dist = 0; v = 0; t = 0; launched = false;
    rivalDist = 0; rivalV = 0; rivalFinishT = null;
    nitroUses = 0; nitroBoost = 0;
    checkpointIdx = 0; shiftWindow = 0; needle = 0; needleDir = 1; lastGrade = "";
    el("drag-result").textContent = "";
    el("drag-overlay").classList.add("hidden");
    timers.forEach(clearTimeout); timers = [];
    countdown();
  }

  // GO: false start before green; launch after green (PERFECT LAUNCH within 0.15s); shift otherwise
  function tapGo(e) {
    if (e) e.preventDefault();
    if (state === "countdown") return falseStart();
    if (state !== "racing") return;
    if (!launched) {
      const reaction = (performance.now() - greenAt) / 1000;
      launched = true;
      v = 220;
      lastGrade = reaction < 0.15 ? "PERFECT LAUNCH!" : "";
      return;
    }
    tapShift();
  }

  function bind() {
    const go = el("drag-gas");
    go.addEventListener("pointerdown", e => { go.classList.add("pressed"); tapGo(e); });
    go.addEventListener("pointerup", () => go.classList.remove("pressed"));
    go.addEventListener("pointerleave", () => go.classList.remove("pressed"));
    go.addEventListener("pointercancel", () => go.classList.remove("pressed"));

    el("drag-nitro").addEventListener("pointerdown", e => { e.preventDefault(); tapNitro(); });

    window.addEventListener("keydown", e => {
      if (!el("drag").classList.contains("active") || e.repeat) return;
      if (e.code === "Space") { e.preventDefault(); tapGo(e); }
      if (e.code === "KeyN") tapNitro();
    });
    el("drag-start").addEventListener("click", beginRun);
  }
  bind();

  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (state === "racing") {
      t = (now - greenAt) / 1000;
      updateRace(dt);
    }
    bgOffset += v * dt * 0.2;
    render();
    el("drag-time").textContent = t.toFixed(3) + "s";
    el("drag-speed").textContent = Math.round(v / 6);
    rafId = requestAnimationFrame(frame);
  }

  return {
    start(carDef, buildDef) {
      car = carDef; build = buildDef;
      rival = CARS.find(c => c.id !== carDef.id) || carDef;
      state = "idle"; dist = 0; v = 0; t = 0; launched = false;
      resetLights();
      runs = 0; bestTime = null;
      el("drag-round").textContent = "Run 1";
      el("drag-result").textContent = "";
      el("drag-overlay").querySelector("h3").textContent = "Drag Race!";
      el("drag-overlay").querySelector("p").textContent = "Wait for GREEN, tap GO to launch, then tap GO in the green zone. NITRO gives a boost!";
      el("drag-start").textContent = "Ready";
      el("drag-overlay").classList.remove("hidden");
      cancelAnimationFrame(rafId);
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    },
    stop() { cancelAnimationFrame(rafId); timers.forEach(clearTimeout); timers = []; }
  };
})();
