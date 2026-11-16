# CYBER ARENA: ZERO HOUR - 3D Arena FPS

A high-performance, fully functional, tactical 3D Arena First-Person Shooter (FPS) built with Three.js and WebGL.

---

## ⚡ Quick Start (Instant Play)

### Option 1: 1-Click Launch (Recommended)
Double-click `start.bat` in this folder. It launches the local game server and immediately opens the game in your default browser at `http://localhost:3000`.

### Option 2: Run via Node.js
Open your terminal in this directory and execute:
```bash
node server.js
```
Then navigate to `http://localhost:3000` in Chrome, Edge, Brave, or Firefox.

### Option 3: Direct File Play
You can also open `index.html` directly in any modern browser! The game is completely self-contained with offline procedural textures and synthesized Web Audio.

---

## 🎮 Controls

| Action | Key / Input |
| :--- | :--- |
| **Move** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or Arrow Keys |
| **Look Around** | Mouse (Pointer Lock) |
| **Sprint** | <kbd>Shift</kbd> (Increases speed & dynamic FOV) |
| **Jump** | <kbd>Space</kbd> (Includes ground check physics) |
| **Shoot (Primary Fire)** | <kbd>Left Mouse Button (LMB)</kbd> |
| **Aim Down Sights (ADS)** | <kbd>Right Mouse Button (RMB)</kbd> (Zooms FOV + Center Alignment) |
| **Reload** | <kbd>R</kbd> (Mechanical reload animation & audio) |
| **Weapon Selection** | <kbd>1</kbd> Viper AR-47 \| <kbd>2</kbd> Bulldog 12G \| <kbd>3</kbd> Shadow .50 Cal |
| **Cycle Weapons** | Mouse Scroll Wheel |
| **Scoreboard (Hold)** | <kbd>Tab</kbd> (Live rankings, kills, deaths, K/D, scores) |
| **Pause / Resume** | <kbd>P</kbd> or <kbd>Esc</kbd> |

---

## 🔫 Weapons Arsenal

### 1. Viper AR-47 (Assault Rifle)
- **Fire Mode:** Full Automatic (600 RPM / 10 rps)
- **Damage:** 26 body / 65 headshot (x2.5 multiplier)
- **Magazine:** 30 rounds | **Reserve:** 150 rounds
- **Reload Time:** 1.8 seconds
- **Features:** Picatinny rail, holographic red dot sight, steady controllable recoil.

### 2. Bulldog 12G (Tactical Shotgun)
- **Fire Mode:** Semi-Automatic Pump (75 RPM)
- **Damage:** 8 pellets per shell × 15 damage = 120 max point-blank damage
- **Magazine:** 8 shells | **Reserve:** 40 shells
- **Reload Time:** 2.2 seconds
- **Features:** Heavy close-quarters impact, wide conical pellet spread, green fiber-optic bead.

### 3. Shadow .50 Cal (Heavy Sniper Rifle)
- **Fire Mode:** Bolt-Action (46 RPM)
- **Damage:** 95 body / 285 headshot (Instant lethal elimination)
- **Magazine:** 5 rounds | **Reserve:** 25 rounds
- **Reload Time:** 2.6 seconds
- **Features:** High magnification zoom (22° FOV), tactical mil-dot sniper scope reticle with range finder, supersonic bullet tracer.

---

## 🤖 Tactical Enemy Bot AI

The arena features intelligent AI bots governed by a robust Finite State Machine:
- **PATROL:** Bots roam between tactical waypoints in the arena, checking corners and scanning 360°.
- **INVESTIGATE / SEARCH:** If gunfire is heard or player is sighted, bots rotate towards the alert origin.
- **CHASE:** Bots pursue their target while navigating obstacles using raycast avoidance whiskers.
- **ATTACK:** Bots strafe unpredictably, maintain optimal combat distance, and fire with human-like aim dispersion and burst patterns.
- **TAKE COVER:** When low on health (<30%) or reloading, bots fall back behind shipping containers and crates.
- **DIE & RESPAWN:** Dynamic collapse ragdoll, guaranteed ammo/health drop, and automatic respawn at distant spawn points.

---

## 🏟️ Arena Map ("Outpost Alpha")

- **Dimensions:** 70m × 70m tactical arena.
- **Multi-Level Layout:** 4 corner lookout sniper towers (height 4.5m) connected by catwalk bridges and access ramps.
- **Cover Layout:** 4 heavy shipping containers, 15+ stacked military supply crates, concrete Jersey barricades.
- **Pickups:**
  - **Health Kits:** Glowing green crosses that restore +50 HP.
  - **Ammo Crates:** Glowing yellow crates that replenish all reserve ammunition.
  - 15-second respawn timers with holographic fade-in.

---

## 🛠️ Technical Highlights & Bug Prevention

1. **Zero External Asset Dependencies:**
   - 100% of textures (floors, walls, crates, hazard banners, particles) are rendered procedurally via Canvas.
   - 100% of sound effects (gunshots, headshots, footsteps, jumps, reloads, pickups) are synthesized via the Web Audio API.
2. **Robust Error Handling:**
   - Empty magazine dry-fire click triggers automatic reload.
   - Firing during reload or weapon swap is strictly guarded.
   - Semi-automatic weapons prevent runaway continuous fire.
   - Delta time is clamped to 50ms to prevent physics teleportation when switching browser tabs.
   - All particle emitters, tracers, and damage numbers have strict TTL (Time-To-Live) cleanup to guarantee zero memory leaks.
