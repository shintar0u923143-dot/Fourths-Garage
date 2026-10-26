# Car Garage Kids: F1 & Drag Race

A simple browser game for kids who love cars. Build your car, then race it.

## Modes

- **F1 Race**: 3 laps around an oval track against 3 rivals. Hold GAS, steer left and right, and stay on the track.
- **Drag Race**: Quarter-mile sprint. Wait for the lights to turn green, then hold the button. Let go near the finish to brake. Lowest time wins.
- **Just Build**: Play with the garage without racing.

## Cars

Tesla Roadster, Toyota Supra, Mazda Miata, F1 Car, Lamborghini Huracán, and Ferrari.

## Garage customisation

Paint colour, stripe, wheels (chrome, gold, black, neon), spoiler (none, wing, tall), and sticker.

## Controls

- **Touch / mouse**: on-screen buttons (◀ GAS ▲ ▶ for F1, HOLD for Drag)
- **Keyboard**: Up or Space for gas, Left and Right arrows to steer, Space to hold in Drag Race

## Run it

No install needed. Open `index.html` in any modern browser, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

To host it on GitHub Pages, enable Pages on the repo (Settings → Pages → deploy from `main` branch, root folder).

## Files

```
index.html        screens and layout
css/style.css     styling
js/cars.js        car roster, paints, wheels, spoilers, stickers
js/paint.js       draws the side-view car with the chosen build
js/f1.js          F1 top-down oval race
js/drag.js        drag strip, lights, timing
js/main.js        navigation, garage builder, launching modes
```
