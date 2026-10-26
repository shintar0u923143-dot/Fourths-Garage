// Drag Race: quarter-mile strip. Wait for the lights, then HOLD the button to launch.
// Release the button to brake. Reach the finish line for your time.
const DRAG = (() => {
  const canvas = document.getElementById("drag-canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const TRACK_LEN = 760;          // px from start to finish line
  const CAR_Y = H * 0.66;
  const START_X = 90;

  let state = "idle";             // idle | countdown | racing | done | false
  let car = null, build = null;
  let x = 0, v = 0, t = 0, holding = false;
  let greenAt = 0, lightStage = 0, runs = 0, bestTime = null;
  let last = 0, rafId = 0, timers = [];

  const lightsEl = () => [...document.querySelectorAll("#tree .light")];

  function resetLights() {
    lightsEl().forEach(l => l.classList.remove("red", "green"));
  }

  function drawStrip() {
    ctx.fillStyle = "#15202e"; ctx.fillRect(0, 0, W, H);
    // Lanes
    ctx.fillStyle = "#2a3446"; ctx.fillRect(0, CAR_Y - 40, W, 80);
    ctx.fillStyle = "#222b3b"; ctx.fillRect(0, CAR_Y + 40, W, 10);
    // Start line
    ctx.fillStyle = "#fff"; ctx.fillRect(START_X, CAR_Y - 40, 6, 80);
    // Finish checkered line
    const fx = START_X + TRACK_LEN;
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? "#fff" : "#111";
      ctx.fillRect(fx + (i % 2) * 6, CAR_Y - 40 + i * 10, 6, 10);
    }
    // Distance markers
    ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.font = "14px sans-serif";
    for (let m = 200; m < TRACK_LEN; m += 200) {
      ctx.fillRect(START_X + m, CAR_Y + 46, 2, 10);
      ctx.fillText(`${m}`, START_X + m - 8, CAR_Y + 70);
    }
  }

  function drawCarStrip() {
    if (!car) return;
    const sx = START_X + x;
    drawCar(ctx, car, build, sx, CAR_Y + 26, 0.9);
    // Flames when going fast
    if (v > 260 && state === "racing") {
      ctx.fillStyle = "rgba(255,140,0,.8)";
      ctx.beginPath(); ctx.moveTo(sx - 110, CAR_Y + 14); ctx.lineTo(sx - 135 - Math.random() * 14, CAR_Y + 18); ctx.lineTo(sx - 110, CAR_Y + 22); ctx.fill();
    }
  }

  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (state === "racing") {
      t = (now - greenAt) / 1000;
      const accel = 180 + car.accel * 38;     // px/s²
      const top = 260 + car.top * 36;         // px/s
      if (holding) v = Math.min(top, v + accel * dt);
      else v = Math.max(0, v - 220 * dt);     // braking when released
      x += v * dt;
      if (x >= TRACK_LEN) finish();
    }
    drawStrip();
    drawCarStrip();
    document.getElementById("drag-time").textContent = t.toFixed(3) + "s";
    document.getElementById("drag-speed").textContent = Math.round(v / 2.2);
    if (state !== "done" && state !== "false" && state !== "racing") {
      rafId = requestAnimationFrame(frame);
    } else {
      rafId = requestAnimationFrame(frame);
    }
  }

  function countdown() {
    state = "countdown";
    resetLights();
    const stage = [400, 800, 1200];
    lightsEl().forEach((el, i) => {
      timers.push(setTimeout(() => el.classList.add("red"), stage[i] - 300));
    });
    const delay = 1400 + Math.random() * 900;
    timers.push(setTimeout(() => {
      if (state !== "countdown") return;
      lightsEl().forEach(l => { l.classList.remove("red"); l.classList.add("green"); });
      state = "waiting-green";
      greenAt = performance.now();
      state = "racing";
      if (holding) { /* already holding, counts from green */ }
    }, delay));
  }

  function beginRun() {
    runs++;
    document.getElementById("drag-round").textContent = `Run ${runs}`;
    x = 0; v = 0; t = 0; holding = false;
    document.getElementById("drag-result").textContent = "";
    document.getElementById("drag-overlay").classList.add("hidden");
    timers.forEach(clearTimeout); timers = [];
    countdown();
  }

  function finish() {
    state = "done";
    holding = false;
    const stop = t;
    const best = bestTime === null || stop < bestTime;
    if (best) bestTime = stop;
    document.getElementById("drag-result").textContent = `${stop.toFixed(3)}s ${best ? "🏆 Best!" : ""}`;
    setTimeout(() => {
      document.getElementById("drag-overlay").querySelector("h3").textContent = best ? "New best time!" : "Nice run!";
      document.getElementById("drag-overlay").querySelector("p").textContent = `Your time: ${stop.toFixed(3)}s. Best: ${bestTime.toFixed(3)}s`;
      const btn = document.getElementById("drag-start");
      btn.textContent = "Go Again";
      document.getElementById("drag-overlay").classList.remove("hidden");
    }, 900);
  }

  function falseStart() {
    state = "false";
    timers.forEach(clearTimeout); timers = [];
    document.getElementById("drag-result").textContent = "FALSE START ❌";
    setTimeout(() => {
      document.getElementById("drag-overlay").querySelector("h3").textContent = "False start!";
      document.getElementById("drag-overlay").querySelector("p").textContent = "You pressed before GREEN. Wait for the green light!";
      document.getElementById("drag-start").textContent = "Try Again";
      document.getElementById("drag-overlay").classList.remove("hidden");
    }, 600);
  }

  function press(e) {
    if (e) e.preventDefault();
    holding = true;
    document.getElementById("drag-gas").classList.add("pressed");
    if (state === "countdown") falseStart();
  }
  function release(e) {
    if (e) e.preventDefault();
    holding = false;
    document.getElementById("drag-gas").classList.remove("pressed");
  }

  function bind() {
    const btn = document.getElementById("drag-gas");
    btn.addEventListener("pointerdown", press);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointerleave", release);
    btn.addEventListener("pointercancel", release);
    window.addEventListener("keydown", e => {
      if (e.code === "Space" && document.getElementById("drag").classList.contains("active") && !e.repeat) press(e);
    });
    window.addEventListener("keyup", e => { if (e.code === "Space") release(e); });
    document.getElementById("drag-start").addEventListener("click", beginRun);
  }
  bind();

  return {
    start(carDef, buildDef) {
      car = carDef; build = buildDef;
      state = "idle"; x = 0; v = 0; t = 0; holding = false;
      resetLights();
      runs = 0; bestTime = null;
      document.getElementById("drag-round").textContent = "Run 1";
      document.getElementById("drag-result").textContent = "";
      document.getElementById("drag-overlay").querySelector("h3").textContent = "Drag Race!";
      document.getElementById("drag-overlay").querySelector("p").textContent = "Wait for GREEN, then HOLD the button. Let go at the finish line to stop the timer.";
      document.getElementById("drag-start").textContent = "Ready";
      document.getElementById("drag-overlay").classList.remove("hidden");
      cancelAnimationFrame(rafId);
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    },
    stop() { cancelAnimationFrame(rafId); timers.forEach(clearTimeout); timers = []; }
  };
})();
