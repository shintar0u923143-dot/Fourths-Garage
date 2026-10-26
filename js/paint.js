// Draws a side-view car on a canvas context using the player's build choices.
// drawCar(ctx, car, build, x, y, scale) — (x, y) is the centre of the car's base line.
function drawCar(ctx, car, build, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const paint = build.paint || car.color;
  const wheelHex = (WHEELS.find(w => w.id === build.wheels) || WHEELS[0]).hex;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.beginPath(); ctx.ellipse(0, 4, 120, 10, 0, 0, Math.PI * 2); ctx.fill();

  // Body outline per style
  ctx.fillStyle = paint;
  ctx.strokeStyle = "rgba(0,0,0,.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (car.body === "f1") {
    // Long, low, open-wheel
    ctx.moveTo(-120, -6);
    ctx.lineTo(-70, -18);
    ctx.lineTo(-30, -26);
    ctx.lineTo(10, -22);
    ctx.lineTo(40, -26);
    ctx.lineTo(70, -20);
    ctx.lineTo(120, -8);
    ctx.lineTo(120, 0);
    ctx.lineTo(-120, 0);
    ctx.closePath();
  } else if (car.body === "roadster") {
    // Low, short, rounded
    ctx.moveTo(-105, 0);
    ctx.lineTo(-100, -18);
    ctx.quadraticCurveTo(-60, -40, -20, -36);
    ctx.lineTo(30, -34);
    ctx.quadraticCurveTo(80, -30, 105, -10);
    ctx.lineTo(108, 0);
    ctx.closePath();
  } else {
    // Coupe: taller cabin
    ctx.moveTo(-118, 0);
    ctx.lineTo(-112, -22);
    ctx.lineTo(-70, -26);
    ctx.quadraticCurveTo(-40, -58, 10, -56);
    ctx.quadraticCurveTo(60, -52, 88, -26);
    ctx.lineTo(116, -18);
    ctx.lineTo(118, 0);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();

  // Stripe
  if (build.stripe) {
    ctx.fillStyle = build.stripe;
    ctx.fillRect(-110, -14, 220, 5);
  }

  // Windows (not for F1)
  if (car.body !== "f1") {
    ctx.fillStyle = "rgba(120,190,255,.55)";
    ctx.beginPath();
    if (car.body === "coupe") {
      ctx.moveTo(-40, -28); ctx.quadraticCurveTo(-18, -50, 8, -50); ctx.quadraticCurveTo(40, -48, 64, -26); ctx.closePath();
    } else {
      ctx.moveTo(-40, -28); ctx.quadraticCurveTo(-20, -34, 0, -32); ctx.lineTo(24, -28); ctx.closePath();
    }
    ctx.fill();
  }

  // Spoiler
  if (build.spoiler === "wing") {
    ctx.fillStyle = paint;
    ctx.fillRect(-108, -44, 34, 4);
    ctx.fillRect(-100, -40, 4, 16);
  } else if (build.spoiler === "tall") {
    ctx.fillStyle = paint;
    ctx.fillRect(-106, -60, 40, 6);
    ctx.fillRect(-94, -54, 5, 26);
    ctx.fillRect(-72, -54, 5, 26);
  }

  // Wheels
  const wheelXs = car.body === "f1" ? [-78, 80] : [-72, 72];
  const wheelR = car.body === "f1" ? 15 : 17;
  wheelXs.forEach(wx => {
    ctx.fillStyle = "#111";
    ctx.beginPath(); ctx.arc(wx, -wheelR + 2, wheelR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = wheelHex;
    ctx.beginPath(); ctx.arc(wx, -wheelR + 2, wheelR * 0.58, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath(); ctx.arc(wx, -wheelR + 2, wheelR * 0.18, 0, Math.PI * 2); ctx.fill();
  });

  // Sticker on the side
  const st = STICKERS.find(s => s.id === build.sticker);
  if (st && st.glyph) {
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(st.glyph, -10, -20);
  }

  ctx.restore();
}
