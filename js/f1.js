// F1 Race: top-down oval track, 3 laps, 3 AI rivals.
// Player holds GAS to accelerate, LEFT/RIGHT to change lane. Stay on track!
const F1 = (() => {
  const canvas = document.getElementById("f1-canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const CX = W / 2, CY = H / 2, RX = 330, RY = 190, TRACK_HALF = 42;
  const LAPS = 3;
  const TAU = Math.PI * 2;

  let running = false, gas = false, steer = 0, last = 0, startTime = 0;
  let cars = [], player = null, onFinishCb = null, rafId = 0;

  function pointAt(angle, lateral) {
    return { x: CX + (RX + lateral) * Math.cos(angle), y: CY + (RY + lateral) * Math.sin(angle) };
  }

  function makeCar(build, carDef, isPlayer, lane, speedFactor) {
    return {
      isPlayer, car: carDef, build,
      angle: -0.15, total: 0, lane, lateral: lane,
      speed: 0, maxSpeed: 0.9 + carDef.top * 0.12, accel: 0.25 + carDef.accel * 0.03,
      aiFactor: speedFactor, laps: 0, finished: false, finishTime: 0
    };
  }

  function start(carDef, build, onFinish) {
    onFinishCb = onFinish;
    const rivals = CARS.filter(c => c.id !== carDef.id).slice(0, 3);
    player = makeCar(build, carDef, true, 0, 1);
    cars = [player];
    rivals.forEach((r, i) => {
      cars.push(makeCar({ paint: r.color }, r, false, [-22, 22, 0][i], 0.82 + Math.random() * 0.14));
    });
    cars.forEach(c => { c.angle = -0.15; c.total = 0; });
    document.getElementById("f1-overlay").classList.add("hidden");
    running = true; startTime = performance.now(); last = startTime;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function update(dt) {
    cars.forEach(c => {
      if (c.finished) { c.speed *= 0.97; }
      else if (c.isPlayer) {
        const offTrack = Math.abs(c.lateral) > TRACK_HALF;
        const target = gas ? c.maxSpeed * (offTrack ? 0.45 : 1) : 0;
        c.speed += (target - c.speed) * Math.min(1, c.accel * dt * 2.5);
        if (steer !== 0) c.lateral = Math.max(-TRACK_HALF - 12, Math.min(TRACK_HALF + 12, c.lateral + steer * 90 * dt));
      } else {
        c.speed += (c.maxSpeed * c.aiFactor - c.speed) * Math.min(1, c.accel * dt * 1.2);
      }
      const dAngle = (c.speed * dt) / (RY + 60) * 1.25;
      c.angle += dAngle;
      c.total += dAngle;
      c.laps = Math.floor(c.total / TAU);
      if (!c.finished && c.laps >= LAPS) {
        c.finished = true;
        c.finishTime = (performance.now() - startTime) / 1000;
      }
    });
    // Player lane drifts back toward centre for AI (kept simple)
    cars.filter(c => !c.isPlayer && !c.finished).forEach(c => {
      c.lateral += (c.lane - c.lateral) * 0.02;
    });
    if (player.finished && running) endRace();
  }

  function drawTrack() {
    ctx.fillStyle = "#1e5a2a";
    ctx.fillRect(0, 0, W, H);
    // Asphalt
    ctx.strokeStyle = "#3a3f4a";
    ctx.lineWidth = TRACK_HALF * 2 + 6;
    ctx.beginPath(); ctx.ellipse(CX, CY, RX, RY, 0, 0, TAU); ctx.stroke();
    // Kerbs
    ctx.strokeStyle = "#f5f5f5"; ctx.setLineDash([12, 12]); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(CX, CY, RX + TRACK_HALF + 2, RY + TRACK_HALF + 2, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(CX, CY, RX - TRACK_HALF - 2, RY - TRACK_HALF - 2, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    // Centre line
    ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(CX, CY, RX, RY, 0, 0, TAU); ctx.stroke();
    // Start/finish line
    const a = pointAt(-0.15, -TRACK_HALF), b = pointAt(-0.15, TRACK_HALF);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  function drawCarTop(c) {
    const p = pointAt(c.angle, c.lateral);
    const heading = c.angle + Math.PI / 2;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(heading);
    ctx.fillStyle = c.isPlayer ? (c.build.paint || c.car.color) : c.car.color;
    ctx.strokeStyle = "#000"; ctx.lineWidth = 2;
    ctx.fillRect(-9, -16, 18, 32);
    ctx.strokeRect(-9, -16, 18, 32);
    ctx.fillStyle = "#111";
    ctx.fillRect(-13, -12, 4, 8); ctx.fillRect(9, -12, 4, 8);
    ctx.fillRect(-13, 6, 4, 8); ctx.fillRect(9, 6, 4, 8);
    if (c.build.stripe) { ctx.fillStyle = c.build.stripe; ctx.fillRect(-2, -16, 4, 32); }
    ctx.restore();
    if (c.isPlayer) {
      ctx.fillStyle = "#ffd23f"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("YOU", p.x, p.y - 24);
    }
  }

  function render() {
    drawTrack();
    cars.slice().sort((a, b) => a.total - b.total).forEach(drawCarTop);
  }

  function hud() {
    const sorted = cars.slice().sort((a, b) => b.total - a.total);
    const pos = sorted.indexOf(player) + 1;
    document.getElementById("f1-pos").textContent = `Pos ${pos}/${cars.length}`;
    document.getElementById("f1-lap").textContent = `Lap ${Math.min(player.laps + 1, LAPS)}/${LAPS}`;
    document.getElementById("f1-speed").textContent = Math.round(player.speed * 180);
    document.getElementById("f1-timer").textContent = ((performance.now() - startTime) / 1000).toFixed(1) + "s";
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    hud();
    rafId = requestAnimationFrame(loop);
  }

  function endRace() {
    running = false;
    const order = cars.slice().sort((a, b) => a.finishTime - b.finishTime || b.total - a.total);
    const place = order.indexOf(player) + 1;
    const msg = place === 1 ? "🏆 You won the race!" : `You finished ${place}${["st","nd","rd"][place-1] || "th"}!`;
    setTimeout(() => {
      document.getElementById("f1-overlay-title").textContent = msg;
      document.getElementById("f1-overlay-text").textContent = `Time: ${player.finishTime.toFixed(1)}s. Want another go?`;
      document.getElementById("f1-go").textContent = "Race Again";
      document.getElementById("f1-overlay").classList.remove("hidden");
      if (onFinishCb) onFinishCb(place);
    }, 400);
  }

  // Controls
  function bindControls() {
    document.querySelectorAll("#f1-controls .ctl").forEach(btn => {
      const key = btn.dataset.key;
      const down = e => {
        e.preventDefault(); btn.classList.add("pressed");
        if (key === "gas") gas = true;
        if (key === "left") steer = -1;
        if (key === "right") steer = 1;
      };
      const up = e => {
        e.preventDefault(); btn.classList.remove("pressed");
        if (key === "gas") gas = false;
        if (key === "left" || key === "right") steer = 0;
      };
      btn.addEventListener("pointerdown", down);
      btn.addEventListener("pointerup", up);
      btn.addEventListener("pointerleave", up);
      btn.addEventListener("pointercancel", up);
    });
    window.addEventListener("keydown", e => {
      if (!document.getElementById("f1").classList.contains("active")) return;
      if (e.code === "ArrowUp" || e.code === "Space") gas = true;
      if (e.code === "ArrowLeft") steer = -1;
      if (e.code === "ArrowRight") steer = 1;
    });
    window.addEventListener("keyup", e => {
      if (e.code === "ArrowUp" || e.code === "Space") gas = false;
      if (e.code === "ArrowLeft" && steer === -1) steer = 0;
      if (e.code === "ArrowRight" && steer === 1) steer = 0;
    });
  }
  bindControls();

  return { start, render, stop: () => { running = false; cancelAnimationFrame(rafId); } };
})();
