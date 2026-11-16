/**
 * Cyber Arena: Zero Hour - Master Game Controller
 * Manages Three.js rendering pipeline, game states (MENU, PLAYING, PAUSED, GAMEOVER),
 * PointerLock API, match win/loss conditions, and camera orbits.
 */

const GAME_STATES = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAMEOVER: 'GAMEOVER'
};

class Game {
    constructor() {
        this.state = GAME_STATES.MENU;
        this.targetScore = 15;
        this.difficulty = 'medium';
        this.botCount = 5;

        // Container
        this.container = document.getElementById('game-container');

        // Three.js Core
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0e1115);
        this.scene.fog = new THREE.FogExp2(0x0e1115, 0.015);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Subsystems
        this.vfx = new VFXEngine(this.scene, this.camera);
        this.arena = new Arena(this.scene);
        window.GameArena = this.arena;

        this.player = new PlayerController(this.camera, this.renderer.domElement, this.scene, this.vfx);
        this.botManager = new BotManager(this.scene, this.vfx, this.arena, this.botCount, this.difficulty);

        // Menu Camera Orbit Angle
        this.orbitAngle = 0;

        // Clock & Delta Time
        this.clock = new THREE.Clock();
        this.lastTime = performance.now();

        // Bindings
        this._bindEvents();

        // Initial menu state
        window.GameUI.showStartMenu();

        // Start animation loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    _bindEvents() {
        // Window Resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Pointer Lock Change Events
        document.addEventListener('pointerlockchange', () => {
            const isLocked = document.pointerLockElement === this.renderer.domElement;
            this.player.setPointerLock(isLocked);

            if (!isLocked && this.state === GAME_STATES.PLAYING) {
                this.pauseGame();
            }
        });

        // Click to Lock pointer during play
        this.renderer.domElement.addEventListener('click', () => {
            if (this.state === GAME_STATES.PLAYING && document.pointerLockElement !== this.renderer.domElement) {
                this.renderer.domElement.requestPointerLock();
            }
        });

        // Pause Key (Escape / P)
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyP') {
                if (this.state === GAME_STATES.PLAYING) {
                    this.pauseGame();
                } else if (this.state === GAME_STATES.PAUSED) {
                    this.resumeGame();
                }
            }
        });

        // Start Menu Controls
        const btnStart = document.getElementById('btn-start-game');
        if (btnStart) {
            btnStart.addEventListener('click', () => {
                const diffSelect = document.getElementById('select-difficulty');
                const scoreSelect = document.getElementById('select-score');
                const botSelect = document.getElementById('select-bots');

                if (diffSelect) this.difficulty = diffSelect.value;
                if (scoreSelect) this.targetScore = parseInt(scoreSelect.value, 10) || 15;
                if (botSelect) this.botCount = parseInt(botSelect.value, 10) || 5;

                this.startMatch();
            });
        }

        // Pause Menu Buttons
        const btnResume = document.getElementById('btn-resume');
        if (btnResume) {
            btnResume.addEventListener('click', () => this.resumeGame());
        }

        const btnRestart = document.getElementById('btn-restart');
        if (btnRestart) {
            btnRestart.addEventListener('click', () => this.startMatch());
        }

        const btnMenu = document.getElementById('btn-menu');
        if (btnMenu) {
            btnMenu.addEventListener('click', () => this.returnToMenu());
        }

        // Game Over Buttons
        const btnPlayAgain = document.getElementById('btn-play-again');
        if (btnPlayAgain) {
            btnPlayAgain.addEventListener('click', () => this.startMatch());
        }

        const btnGoMenu = document.getElementById('btn-go-menu');
        if (btnGoMenu) {
            btnGoMenu.addEventListener('click', () => this.returnToMenu());
        }

        // Settings
        const sensSlider = document.getElementById('sens-slider');
        if (sensSlider) {
            sensSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.player.mouseSensitivity = val * 0.001;
            });
        }

        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.addEventListener('click', () => {
                const isMuted = window.Sound.toggleMute();
                soundToggle.textContent = isMuted ? '🔇 SOUND: OFF' : '🔊 SOUND: ON';
            });
        }
    }

    startMatch() {
        this.state = GAME_STATES.PLAYING;
        window.Sound.init();

        // Reset player & arena
        const spawn = this.arena.getRandomPlayerSpawn();
        this.player.respawn(spawn);
        this.player.kills = 0;
        this.player.deaths = 0;
        this.player.headshots = 0;
        this.player.damageDealt = 0;

        // Reset bots with new count/difficulty
        this.botManager.botCount = this.botCount;
        this.botManager.difficulty = this.difficulty;
        this.botManager.reset();

        // Reset VFX
        this.vfx.reset();

        // Show HUD
        window.GameUI.showHud();

        // Request Pointer Lock
        this.renderer.domElement.requestPointerLock();
    }

    pauseGame() {
        if (this.state !== GAME_STATES.PLAYING) return;
        this.state = GAME_STATES.PAUSED;
        window.GameUI.showPauseMenu();
        if (document.exitPointerLock) document.exitPointerLock();
    }

    resumeGame() {
        if (this.state !== GAME_STATES.PAUSED) return;
        this.state = GAME_STATES.PLAYING;
        window.GameUI.hidePauseMenu();
        this.renderer.domElement.requestPointerLock();
    }

    returnToMenu() {
        this.state = GAME_STATES.MENU;
        if (document.exitPointerLock) document.exitPointerLock();
        window.GameUI.showStartMenu();
    }

    triggerGameOver(isVictory) {
        this.state = GAME_STATES.GAMEOVER;
        if (document.exitPointerLock) document.exitPointerLock();

        const stats = {
            kills: this.player.kills,
            headshots: this.player.headshots,
            damage: this.player.damageDealt,
            deaths: this.player.deaths
        };

        window.Sound.playFanfare(isVictory);
        window.GameUI.showGameOver(isVictory, stats);
    }

    /**
     * Main Animation & Simulation Frame
     */
    animate() {
        requestAnimationFrame(this.animate);

        const now = performance.now() * 0.001;
        let dt = this.clock.getDelta();
        if (dt > 0.05) dt = 0.05; // Prevent physics explosions on background tab

        if (this.state === GAME_STATES.MENU) {
            // Cinematic Menu Camera Sweep
            this.orbitAngle += dt * 0.25;
            const orbitDist = 38;
            this.camera.position.set(
                Math.cos(this.orbitAngle) * orbitDist,
                14 + Math.sin(this.orbitAngle * 1.5) * 4,
                Math.sin(this.orbitAngle) * orbitDist
            );
            this.camera.lookAt(0, 3, 0);

            // Animate pickups & lighting in background
            this.arena.update(dt, this.player);
            this.vfx.update(dt);

        } else if (this.state === GAME_STATES.PLAYING) {
            const colliders = this.arena.getColliders();

            // 1. Player Update
            this.player.update(dt, colliders);

            // 2. Primary Fire Processing
            if (this.player.keys.fire && this.player.isAlive) {
                const currentWeapon = this.player.weaponManager.getCurrent();
                const isSemiAuto = currentWeapon && currentWeapon.config.fireMode !== 'AUTO';

                if ((!isSemiAuto || !this.player.hasShotCurrentClick) && this.player.weaponManager.canShoot(now)) {
                    if (isSemiAuto) {
                        this.player.hasShotCurrentClick = true;
                    }

                    // Combine colliders and bot hitboxes for raycasting
                    const botHitboxes = this.botManager.getHitboxObjects();
                    const targets = [...colliders, ...botHitboxes];

                    const hits = this.player.weaponManager.shoot(now, this.player.raycaster, targets);

                    if (hits && hits.length > 0) {
                        // Group bot hits by bot to handle multi-pellet shotguns smoothly
                        const botHitsMap = new Map();

                        hits.forEach(hit => {
                            if (hit.object && hit.object.userData && hit.object.userData.bot) {
                                const bot = hit.object.userData.bot;
                                if (!botHitsMap.has(bot)) {
                                    botHitsMap.set(bot, {
                                        bot: bot,
                                        isHead: false,
                                        totalDamage: 0,
                                        primaryPoint: hit.point,
                                        normal: hit.normal,
                                        hitCount: 0
                                    });
                                }
                                const botData = botHitsMap.get(bot);
                                botData.hitCount++;
                                if (hit.object.userData.isHead) {
                                    botData.isHead = true;
                                    botData.totalDamage += Math.round(hit.damage * hit.headshotMultiplier);
                                    this.player.headshots++;
                                } else {
                                    botData.totalDamage += hit.damage;
                                }
                            } else {
                                // Hit environment wall or crate
                                this.vfx.spawnSparks(hit.point, hit.normal, 8);
                            }
                        });

                        // Process aggregated bot damage
                        botHitsMap.forEach(data => {
                            window.GameUI.triggerHitMarker(data.isHead);
                            this.botManager.handleAggregatedShot(data, this.player);
                        });
                    }
                }
            }

            // 3. Bot Squad Update
            this.botManager.update(dt, this.player, colliders);

            // 4. Arena Pickups Update
            this.arena.update(dt, this.player);

            // 5. VFX & Tracers Update
            this.vfx.update(dt);

            // 6. UI & HUD Update
            window.GameUI.update(dt, this.player, this.botManager, this.player.kills, this.targetScore);

            // 7. Check Victory Condition
            if (this.player.kills >= this.targetScore) {
                this.triggerGameOver(true);
            } else if (!this.player.isAlive && this.player.health <= 0) {
                // Auto respawn player after 3.5 seconds
                if (!this.playerRespawnTimer) {
                    this.playerRespawnTimer = now + 3.5;
                } else if (now >= this.playerRespawnTimer) {
                    this.player.respawn(this.arena.getRandomPlayerSpawn());
                    this.playerRespawnTimer = null;
                }
            }
        }

        // Render Frame
        this.renderer.render(this.scene, this.camera);
    }
}

// Instantiate game on window load
window.addEventListener('DOMContentLoaded', () => {
    window.CyberGame = new Game();
});
