// App glue: screen navigation, garage builder, and launching each mode.
(() => {
  let mode = "f1";
  let selectedCar = CARS[0];
  let build = { ...DEFAULT_BUILD };

  const show = id => {
    document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === id));
  };

  // Navigation via data-go attributes
  document.querySelectorAll("[data-go]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.mode) mode = btn.dataset.mode;
      const target = btn.dataset.go;
      if (target === "garage") {
        document.getElementById("garage-title").textContent =
          mode === "f1" ? "Build your F1 racer" : mode === "drag" ? "Build your Drag car" : "Garage";
        document.getElementById("start-btn").style.display = mode === "garage" ? "none" : "";
        renderGarage();
      }
      if (target === "menu") { DRAG.stop(); F1.stop(); }
      show(target);
    });
  });

  // ----- Garage -----
  function renderPicker() {
    const wrap = document.getElementById("car-picker");
    wrap.innerHTML = "";
    CARS.forEach(c => {
      const el = document.createElement("div");
      el.className = "car-card" + (c.id === selectedCar.id ? " selected" : "");
      el.innerHTML = `<div class="emoji">${c.emoji}</div><div class="name">${c.name}</div><div class="brand">${c.brand}</div>`;
      el.addEventListener("click", () => {
        selectedCar = c;
        build.paint = c.color;
        renderGarage();
      });
      wrap.appendChild(el);
    });
  }

  function renderOptions(containerId, items, valueKey, currentValue, onPick, render) {
    const wrap = document.getElementById(containerId);
    wrap.innerHTML = "";
    items.forEach(item => {
      const el = render(item);
      const val = item[valueKey];
      el.classList.toggle("sel", val === currentValue);
      el.addEventListener("click", () => { onPick(val); renderGarage(); });
      wrap.appendChild(el);
    });
  }

  function renderGarage() {
    renderPicker();

    renderOptions("paint-swatches", PAINTS, "hex", build.paint, v => build.paint = v,
      p => { const d = document.createElement("div"); d.className = "swatch"; d.style.background = p.hex; d.title = p.name; return d; });

    renderOptions("stripe-swatches", STRIPES, "hex", build.stripe, v => build.stripe = v,
      p => { const d = document.createElement("div"); d.className = "swatch";
        d.style.background = p.hex || "repeating-linear-gradient(45deg,#555 0 6px,#888 6px 12px)"; d.title = p.name; return d; });

    renderOptions("wheel-options", WHEELS, "id", build.wheels, v => build.wheels = v,
      w => { const b = document.createElement("button"); b.className = "opt"; b.textContent = w.name; return b; });

    renderOptions("spoiler-options", SPOILERS, "id", build.spoiler, v => build.spoiler = v,
      s => { const b = document.createElement("button"); b.className = "opt"; b.textContent = s.name; return b; });

    renderOptions("sticker-options", STICKERS, "id", build.sticker, v => build.sticker = v,
      s => { const b = document.createElement("button"); b.className = "opt"; b.textContent = s.glyph ? `${s.glyph} ${s.name}` : s.name; return b; });

    drawPreview();
  }

  function drawPreview() {
    const c = document.getElementById("preview-canvas");
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#0f1830"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#2a3446"; ctx.fillRect(0, c.height * 0.72, c.width, c.height * 0.28);
    drawCar(ctx, selectedCar, build, c.width / 2, c.height * 0.72, 1.6);
    ctx.fillStyle = "#cdd6e6"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`${selectedCar.brand} ${selectedCar.name}  ${selectedCar.emoji}`, c.width / 2, 28);
  }

  // ----- Launch -----
  document.getElementById("start-btn").addEventListener("click", () => {
    if (mode === "f1") {
      show("f1");
      F1.start(selectedCar, { ...build });
    } else if (mode === "drag") {
      show("drag");
      DRAG.start(selectedCar, { ...build });
    }
  });

  document.getElementById("f1-go").addEventListener("click", () => {
    document.getElementById("f1-overlay").classList.add("hidden");
    F1.start(selectedCar, { ...build });
  });

  // Keep the game on the car that was just built
  renderGarage();
})();
