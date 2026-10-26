// F1 Race: pseudo-3D road with curves and hills (cockpit/chase camera).
// Hold GAS, steer LEFT/RIGHT, stay on the tarmac. 3 laps vs 3 rivals.
const F1 = (() => {
  const canvas = document.getElementById("f1-canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  const SEG = 200;          // length of one road segment (world units)
  const ROAD_HALF = 2000;   // half road width in world units
  const CAM_H = 1000;       // camera height above road
  const CAM_DEPTH = 0.84;   // field of view
  const DRAW = 260;         // segments drawn in front of camera
  const LAPS = 3;

  // [length in segments, curve (+ right, - left), hill change per segment]
  const SECTIONS = [
    [60, 0, 0], [30, 2, 0], [50, 0, 20], [25, -3, 0], [50, 0, -20], [30, 3, 0],
    [20, 0, 0], [45, -2, 0], [40, 0, 0], [30, -3, 0], [50, 0, 0], [30, 2, 0]
  ];

  // Build the segment list
  const segs = [];
  let height = 0;
  SECTIONS.forEach(([len, curve, hill]) => {
    for (let i = 0; i < len; i++) {
      segs.push({ curve, y: height, stripe: Math.floor(segs.length / 3) % 2 === 0 });
      height += hill;
    }
  });
  const N = segs.length;
  const TRACK_LEN = N * SEG;

  // Race state
  let running = false, gas = false, steer = 0, last = 0, startTime = 0, rafId = 0;
  let cars = [], player = null, onFinishCb = null;

  function makeCar(build, carDef, isPlayer, lane, aiFactor) {
    return {
      isPlayer, car: carDef, build, lane, aiFactor,
      dist: 0, speed: 0, finished: false, finishTime: 0,
      maxSpeed: 3200 + carDef.top * 260,          // world units per second
      accel: 1200 + carDef.accel * 110,
      x: 0                                         // lateral position on road (-1..1 = edges)
    };
  }

  function start(carDef, build, onFinish) {
    onFinishCb = onFinish;
    const rivals = CARS.filter(c => c.id !== carDef.id).slice(0, 3);
    player = makeCar(build, carDef, true, 0, 1);
    cars = [player];
    [-0.45, 0.45, 0].forEach((lane, i) => {
      const r = rivals[i];
      cars.push(makeCar({ paint: r.color }, r, false, lane, 0.86 + Math.random() * 0.1));
      cars[cars.length - 1].dist = -(i + 1) * 900; // stagger the grid
    });
    player.dist = 0;
    document.getElementById("f1-overlay").classList.add("hidden");
    running = true; startTime = performance.now(); last = startTime;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function wrap(p) { return ((p % TRACK_LEN) + TRACK_LEN) % TRACK_LEN; }

  function update(dt) {
    cars.forEach(c => {
      if (c.finished) { c.speed *= 0.96; c.dist += c.speed * dt; return; }
      const pos = wrap(c.dist);
      const seg = segs[Math.floor(pos / SEG)];
      const speedRatio = c.speed / c.maxSpeed;

      if (c.isPlayer) {
        const offRoad = Math.abs(c.x) > 1;
        const target = gas ? c.maxSpeed * (offRoad ? 0.4 : 1) : 0;
        c.speed += Math.sign(target - c.speed) * Math.min(Math.abs(target - c.speed), c.accel * dt * 2);
        if (steer !== 0) c.x += steer * dt * (0.7 + speedRatio);
        // centrifugal push on curves
        c.x -= seg.curve * 0.22 * speedRatio * dt;
        c.x = Math.max(-1.6, Math.min(1.6, c.x));
      } else {
        const target = c.maxSpeed * c.aiFactor * (1 - Math.abs(seg.curve) * 0.03);
        c.speed += Math.sign(target - c.speed) * Math.min(Math.abs(target - c.speed), c.accel * dt);
        // AI keeps its lane and drifts toward it
        c.x += (c.lane - c.x) * 0.8 * dt;
      }

      c.dist += c.speed * dt;
      if (!c.finished && c.dist >= LAPS * TRACK_LEN) {
        c.finished = true;
        c.finishTime = (performance.now() - startTime) / 1000;
      }
    });
    if (player.finished && running) endRace();
  }

  // ---------- Rendering ----------
  function project(worldX, worldY, z, camX, camY) {
    const scale = CAM_DEPTH / z;
    return {
      sx: W / 2 + scale * (worldX - camX) * (W / 2),
      sy: H / 2 - scale * (worldY - camY) * (H / 2),
      sw: scale * ROAD_HALF * (W / 2),
      scale
    };
  }

  function drawSky(baseY) {
    const g = ctx.createLinearGradient(0, 0, 0, baseY);
    g.addColorStop(0, "#2b7bd6");
    g.addColorStop(1, "#bfe6ff");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, baseY + 4);
    // distant hills
    ctx.fillStyle = "#4f8f4f";
    ctx.beginPath(); ctx.moveTo(0, baseY);
    for (let x = 0; x <= W; x += 60) ctx.lineTo(x, baseY - 30 - Math.sin(x * 0.02 + player.dist * 0.00005) * 18);
    ctx.lineTo(W, baseY); ctx.fill();
  }

  function render() {
    const pos = wrap(player.dist);
    const baseIdx = Math.floor(pos / SEG);
    const camZ = pos;
    const camX = player.x * ROAD_HALF;
    const camY = segs[baseIdx].y + CAM_H;

    // Forward pass: project each segment and accumulate the curve offset
    const bands = [];
    let xOffset = 0, dx = 0;
    const baseHorizon = H / 2;
    for (let n = 0; n < DRAW; n++) {
      const absIdx = baseIdx + n;
      const seg = segs[absIdx % N];
      const z1 = absIdx * SEG - camZ;
      const z2 = z1 + SEG;
      if (z2 <= 1) { xOffset += dx; dx += seg.curve; continue; }
      const near = project(-xOffset, seg.y, Math.max(z1, 1), camX, camY);
      const far = project(-(xOffset + dx), segs[(absIdx + 1) % N].y, Math.max(z2, 1), camX, camY);
      bands.push({ n, seg, near, far, cx: -xOffset });
      xOffset += dx;
      dx += seg.curve;
    }

    drawSky(baseHorizon);

    // Paint far to near
    for (let i = bands.length - 1; i >= 0; i--) {
      const b = bands[i];
      const { near, far, seg } = b;
      const grassA = seg.stripe ? "#2e9e3a" : "#2a8f35";
      const rumbleA = seg.stripe ? "#e53b3b" : "#f5f5f5";
      const roadA = seg.stripe ? "#6b6f78" : "#666a72";
      quad(grassA, near.sx, near.sy, W, far.sx, far.sy, W);
      quad(rumbleA, near.sx, near.sy, near.sw * 1.12, far.sx, far.sy, far.sw * 1.12);
      quad(roadA, near.sx, near.sy, near.sw, far.sx, far.sy, far.sw);
      if (seg.stripe) quad("#ffffff", near.sx, near.sy, near.sw * 0.02, far.sx, far.sy, far.sw * 0.02);

      // Cars that sit in this band
      cars.forEach(c => {
        if (c.isPlayer) return;
        const rel = wrap(c.dist) - pos;
        const relWrapped = rel > TRACK_LEN / 2 ? rel - TRACK_LEN : rel < -TRACK_LEN / 2 ? rel + TRACK_LEN : rel;
        if (Math.floor(relWrapped / SEG) !== b.n) return;
        const z = Math.max(relWrapped, 1);
        const p = project(b.cx + c.x * ROAD_HALF, b.seg.y, z, camX, camY);
        drawRivalSprite(c, p.sx, p.sy, p.scale);
      });
    }

    // Player car, from behind, at the bottom
    drawPlayerCar();
  }

  function quad(color, x1, y1, w1, x2, y2, w2) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1 - w1, y1);
    ctx.lineTo(x2 - w2, y2);
    ctx.lineTo(x2 + w2, y2);
    ctx.lineTo(x1 + w1, y1);
    ctx.closePath();
    ctx.fill();
  }

  function drawRivalSprite(c, sx, sy, scale) {
    const s = scale * 9000;     // sprite size
    if (!isFinite(sx) || s < 3) return;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = c.car.color;
    ctx.fillRect(-s * 0.5, -s * 0.55, s, s * 0.45);   // body
    ctx.fillStyle = "#111";
    ctx.fillRect(-s * 0.6, -s * 0.15, s * 0.18, s * 0.18);
    ctx.fillRect(s * 0.42, -s * 0.15, s * 0.18, s * 0.18);
    ctx.fillStyle = "#222"; ctx.fillRect(-s * 0.35, -s * 0.72, s * 0.7, s * 0.2); // rear wing
    ctx.restore();
  }

  function drawPlayerCar() {
    const cx = W / 2 + (player.x * 0) * 0;
    const bx = cx + player.x * 30;
    const by = H - 40;
    const paint = player.build.paint || player.car.color;
    // shadow
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath(); ctx.ellipse(bx, by + 6, 140, 16, 0, 0, Math.PI * 2); ctx.fill();
    // rear wing (tall/wing spoiler)
    if (player.build.spoiler !== "none") {
      ctx.fillStyle = paint;
      ctx.fillRect(bx - 110, by - 92, 220, 12);
    }
    // wheels
    const wheelHex = (WHEELS.find(w => w.id === player.build.wheels) || WHEELS[0]).hex;
    [-118, 88].forEach(wx => {
      ctx.fillStyle = "#111"; ctx.fillRect(bx + wx, by - 58, 30, 52);
      ctx.fillStyle = wheelHex; ctx.fillRect(bx + wx + 6, by - 48, 18, 32);
    });
    // body
    ctx.fillStyle = paint;
    ctx.beginPath();
    ctx.moveTo(bx - 110, by);
    ctx.lineTo(bx - 90, by - 70);
    ctx.lineTo(bx + 90, by - 70);
    ctx.lineTo(bx + 110, by);
    ctx.closePath();
    ctx.fill();
    // stripe
    if (player.build.stripe) { ctx.fillStyle = player.build.stripe; ctx.fillRect(bx - 12, by - 70, 24, 70); }
    // rear light bar
    ctx.fillStyle = "#ff2a2a"; ctx.fillRect(bx - 70, by - 24, 140, 8);
    // sticker
    const st = STICKERS.find(s => s.id === player.build.sticker);
    if (st && st.glyph) {
      ctx.fillStyle = "#fff"; ctx.font = "bold 28px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(st.glyph, bx, by - 40);
    }
  }

  // ---------- HUD ----------
  function drawTacho() {
    const cx = W - 90, cy = H - 70, r = 52;
    const ratio = Math.min(1, player.speed / player.maxSpeed);
    ctx.fillStyle = "rgba(0,0,0,.55)";
    ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#333";
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke();
    ctx.strokeStyle = ratio > 0.8 ? "#ff3b3b" : "#ffd23f";
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * (0.75 + 1.5 * ratio)); ctx.stroke();
  }

  function hud() {
    const sorted = cars.slice().sort((a, b) => b.dist - a.dist);
    const pos = sorted.indexOf(player) + 1;
    const lap = Math.min(Math.floor(player.dist / TRACK_LEN) + 1, LAPS);
    document.getElementById("f1-pos").textContent = `Pos ${pos}/${cars.length}`;
    document.getElementById("f1-lap").textContent = `Lap ${lap}/${LAPS}`;
    document.getElementById("f1-speed").textContent = Math.round(player.speed / 25);
    document.getElementById("f1-timer").textContent = ((performance.now() - startTime) / 1000).toFixed(1) + "s";
    drawTacho();
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
    const order = cars.slice().sort((a, b) => (a.finished && b.finished) ? a.finishTime - b.finishTime : b.dist - a.dist);
    const place = order.indexOf(player) + 1;
    const suffix = ["st", "nd", "rd"][place - 1] || "th";
    const msg = place === 1 ? "🏆 You won the race!" : `You finished ${place}${suffix}!`;
    setTimeout(() => {
      document.getElementById("f1-overlay-title").textContent = msg;
      document.getElementById("f1-overlay-text").textContent = `Time: ${player.finishTime.toFixed(1)}s. Want another go?`;
      document.getElementById("f1-go").textContent = "Race Again";
      document.getElementById("f1-overlay").classList.remove("hidden");
      if (onFinishCb) onFinishCb(place);
    }, 500);
  }

  // ---------- Controls ----------
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

  return { start, stop: () => { running = false; cancelAnimationFrame(rafId); } };
})();
