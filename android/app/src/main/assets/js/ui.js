/**
 * Cyber Arena: Zero Hour - User Interface & HUD Engine
 * Renders tactical HUD, dynamic crosshair, 2D radar minimap, sniper scope reticle,
 * hit markers, damage indicators, kill feed, and scoreboard.
 */
class UIEngine {
    constructor() {
        // Elements cache
        this.startMenu = document.getElementById('start-menu');
        this.hud = document.getElementById('hud');
        this.pauseMenu = document.getElementById('pause-menu');
        this.gameOverMenu = document.getElementById('game-over-menu');
        this.sniperScope = document.getElementById('sniper-scope');

        // HUD elements
        this.hpFill = document.getElementById('hp-fill');
        this.hpText = document.getElementById('hp-text');
        this.armorFill = document.getElementById('armor-fill');
        this.armorText = document.getElementById('armor-text');
        this.magAmmo = document.getElementById('mag-ammo');
        this.reserveAmmo = document.getElementById('reserve-ammo');
        this.weaponName = document.getElementById('weapon-name');
        this.weaponMode = document.getElementById('weapon-mode');
        this.reloadBar = document.getElementById('reload-bar');
        this.reloadContainer = document.getElementById('reload-container');

        this.crosshair = document.getElementById('crosshair');
        this.hitMarker = document.getElementById('hit-marker');
        this.damageIndicator = document.getElementById('damage-indicator');
        this.lowHealthVignette = document.getElementById('low-health-vignette');
        this.killFeedContainer = document.getElementById('kill-feed');
        this.matchScoreText = document.getElementById('match-score');
        this.scoreboard = document.getElementById('scoreboard');
        this.scoreboardBody = document.getElementById('scoreboard-body');

        // Minimap canvas
        this.radarCanvas = document.getElementById('radar-canvas');
        this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;

        // Weapon slot buttons
        this.slot1 = document.getElementById('slot-1');
        this.slot2 = document.getElementById('slot-2');
        this.slot3 = document.getElementById('slot-3');

        // State variables
        this.hitMarkerTimer = 0;
        this.isHeadshotHit = false;
        this.killFeedMessages = [];

        // Tab scoreboard listener
        this._bindScoreboardKey();
    }

    _bindScoreboardKey() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Tab' && this.hud && this.hud.style.display !== 'none') {
                e.preventDefault();
                if (this.scoreboard) this.scoreboard.style.display = 'block';
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Tab') {
                if (this.scoreboard) this.scoreboard.style.display = 'none';
            }
        });
    }

    triggerHitMarker(isHeadshot = false) {
        this.hitMarkerTimer = 0.22;
        this.isHeadshotHit = isHeadshot;
        if (this.hitMarker) {
            this.hitMarker.className = isHeadshot ? 'hit-marker headshot active' : 'hit-marker active';
        }
    }

    addKillFeed(killer, victim, weaponName, isHeadshot = false) {
        if (!this.killFeedContainer) return;

        const row = document.createElement('div');
        row.className = 'kill-feed-item';
        const headshotIcon = isHeadshot ? '<span class="kf-headshot">🎯</span> ' : '';
        row.innerHTML = `<span class="kf-killer">${killer}</span> [${weaponName}] ${headshotIcon}<span class="kf-victim">${victim}</span>`;

        this.killFeedContainer.appendChild(row);

        setTimeout(() => {
            row.style.opacity = '0';
            row.style.transform = 'translateX(20px)';
            setTimeout(() => {
                if (row.parentNode) row.parentNode.removeChild(row);
            }, 300);
        }, 4000);
    }

    update(dt, player, botManager, matchScore, targetScore) {
        if (!player) return;

        // 1. Health & Armor HUD
        const hpPct = Math.max(0, (player.health / player.maxHealth) * 100);
        const armorPct = Math.max(0, (player.armor / player.maxArmor) * 100);

        if (this.hpFill) this.hpFill.style.width = `${hpPct}%`;
        if (this.hpText) this.hpText.textContent = `${Math.ceil(player.health)} / 100`;

        if (this.armorFill) this.armorFill.style.width = `${armorPct}%`;
        if (this.armorText) this.armorText.textContent = `${Math.ceil(player.armor)} / 50`;

        // Low health vignette flashing
        if (this.lowHealthVignette) {
            if (player.health <= 35 && player.isAlive) {
                this.lowHealthVignette.style.opacity = `${(1 - player.health / 35) * 0.8}`;
            } else {
                this.lowHealthVignette.style.opacity = '0';
            }
        }

        // 2. Weapon & Ammo HUD
        const currentWeapon = player.weaponManager.getCurrent();
        if (currentWeapon) {
            if (this.weaponName) this.weaponName.textContent = currentWeapon.config.name;
            if (this.weaponMode) this.weaponMode.textContent = currentWeapon.config.fireMode;
            if (this.magAmmo) this.magAmmo.textContent = currentWeapon.magAmmo;
            if (this.reserveAmmo) this.reserveAmmo.textContent = `/ ${currentWeapon.reserveAmmo}`;

            // Highlight active slot
            const wid = currentWeapon.config.id;
            if (this.slot1) this.slot1.className = (wid === 'ar' ? 'slot-item active' : 'slot-item');
            if (this.slot2) this.slot2.className = (wid === 'shotgun' ? 'slot-item active' : 'slot-item');
            if (this.slot3) this.slot3.className = (wid === 'sniper' ? 'slot-item active' : 'slot-item');

            // Reload bar indicator
            if (player.weaponManager.isReloading && this.reloadBar && this.reloadContainer) {
                this.reloadContainer.style.display = 'block';
                const rPct = (player.weaponManager.reloadTimer / player.weaponManager.reloadDuration) * 100;
                this.reloadBar.style.width = `${rPct}%`;
            } else if (this.reloadContainer) {
                this.reloadContainer.style.display = 'none';
            }
        }

        // 3. Dynamic Crosshair & Sniper Scope
        if (player.weaponManager.currentWeaponId === 'sniper' && player.weaponManager.adsAlpha > 0.8) {
            // Full Sniper ADS
            if (this.sniperScope) this.sniperScope.style.display = 'block';
            if (this.crosshair) this.crosshair.style.display = 'none';
        } else {
            if (this.sniperScope) this.sniperScope.style.display = 'none';
            if (this.crosshair) {
                this.crosshair.style.display = 'block';
                // Dynamic spread expansion
                const isSpread = player.isMoving || player.weaponManager.recoilOffset.z > 0.02;
                const spreadPx = isSpread ? (player.isSprinting ? 28 : 18) : 10;
                this.crosshair.style.setProperty('--spread', `${spreadPx}px`);
            }
        }

        // 4. Hit Marker Decay
        if (this.hitMarkerTimer > 0) {
            this.hitMarkerTimer -= dt;
            if (this.hitMarkerTimer <= 0 && this.hitMarker) {
                this.hitMarker.className = 'hit-marker';
            }
        }

        // 5. Directional Damage Arc
        if (this.damageIndicator) {
            if (player.damageIndicatorTimer > 0 && player.lastDamageAngle !== null) {
                this.damageIndicator.style.opacity = `${player.damageIndicatorTimer / 1.2}`;
                const deg = THREE.MathUtils.radToDeg(player.lastDamageAngle);
                this.damageIndicator.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
            } else {
                this.damageIndicator.style.opacity = '0';
            }
        }

        // 6. Match Score Display
        if (this.matchScoreText) {
            this.matchScoreText.textContent = `SCORE: ${player.kills} / ${targetScore}`;
        }

        // 7. Radar Minimap Update
        this._drawRadar(player, botManager);

        // 8. Update Scoreboard Table
        this._updateScoreboardTable(player, botManager);
    }

    _drawRadar(player, botManager) {
        if (!this.radarCtx) return;
        const ctx = this.radarCtx;
        const w = this.radarCanvas.width;
        const h = this.radarCanvas.height;
        const center = w / 2;
        const scale = (w * 0.45) / 35; // 35m radius

        ctx.clearRect(0, 0, w, h);

        // Radar background ring
        ctx.fillStyle = 'rgba(10, 15, 20, 0.75)';
        ctx.beginPath();
        ctx.arc(center, center, center - 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Range rings
        [0.35, 0.7, 1.0].forEach(r => {
            ctx.beginPath();
            ctx.arc(center, center, (center - 4) * r, 0, Math.PI * 2);
            ctx.stroke();
        });

        // Arena boundary square
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.strokeRect(center - 35 * scale, center - 35 * scale, 70 * scale, 70 * scale);

        // Draw Pickups
        if (window.GameArena && window.GameArena.pickups) {
            window.GameArena.pickups.forEach(p => {
                if (!p.isActive) return;
                const rx = center + (p.basePos.x - player.position.x) * scale;
                const rz = center + (p.basePos.z - player.position.z) * scale;

                if (Math.hypot(rx - center, rz - center) < center - 4) {
                    ctx.fillStyle = p.type === 'health' ? '#00ff66' : '#ffaa00';
                    ctx.beginPath();
                    ctx.arc(rx, rz, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }

        // Draw Bots (Enemy Blips)
        if (botManager && botManager.bots) {
            botManager.bots.forEach(b => {
                if (!b.isAlive) return;
                const dx = (b.position.x - player.position.x) * scale;
                const dz = (b.position.z - player.position.z) * scale;
                const rx = center + dx;
                const rz = center + dz;

                if (Math.hypot(dx, dz) < center - 4) {
                    ctx.fillStyle = b.state === 'ATTACK' ? '#ff0033' : '#ff5500';
                    ctx.beginPath();
                    ctx.arc(rx, rz, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }

        // Draw Player in Center with FOV heading cone
        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(-player.yaw);

        // Heading triangle
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(-5, 6);
        ctx.lineTo(5, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    _updateScoreboardTable(player, botManager) {
        if (!this.scoreboardBody || !botManager) return;

        // Build list of all combatants
        const combatants = [
            { name: 'You (Player)', kills: player.kills, deaths: player.deaths, isPlayer: true }
        ];

        botManager.bots.forEach(b => {
            combatants.push({
                name: b.name,
                kills: b.kills,
                deaths: b.deaths,
                isPlayer: false
            });
        });

        // Sort by kills descending
        combatants.sort((a, b) => b.kills - a.kills);

        let html = '';
        combatants.forEach((c, idx) => {
            const kd = (c.deaths === 0 ? c.kills : (c.kills / c.deaths).toFixed(2));
            const rowClass = c.isPlayer ? 'sb-row player' : 'sb-row';
            html += `
                <tr class="${rowClass}">
                    <td>#${idx + 1}</td>
                    <td>${c.name}</td>
                    <td>${c.kills}</td>
                    <td>${c.deaths}</td>
                    <td>${kd}</td>
                    <td>${c.kills * 100}</td>
                </tr>
            `;
        });

        this.scoreboardBody.innerHTML = html;
    }

    showStartMenu() {
        if (this.startMenu) this.startMenu.style.display = 'flex';
        if (this.hud) this.hud.style.display = 'none';
        if (this.pauseMenu) this.pauseMenu.style.display = 'none';
        if (this.gameOverMenu) this.gameOverMenu.style.display = 'none';
    }

    showHud() {
        if (this.startMenu) this.startMenu.style.display = 'none';
        if (this.hud) this.hud.style.display = 'block';
        if (this.pauseMenu) this.pauseMenu.style.display = 'none';
        if (this.gameOverMenu) this.gameOverMenu.style.display = 'none';
    }

    showPauseMenu() {
        if (this.pauseMenu) this.pauseMenu.style.display = 'flex';
    }

    hidePauseMenu() {
        if (this.pauseMenu) this.pauseMenu.style.display = 'none';
    }

    showGameOver(isVictory, stats) {
        if (this.gameOverMenu) {
            this.gameOverMenu.style.display = 'flex';

            const title = document.getElementById('go-title');
            const summary = document.getElementById('go-summary');

            if (title) {
                title.textContent = isVictory ? 'VICTORY ROYALE!' : 'MATCH TERMINATED';
                title.className = isVictory ? 'victory' : 'defeat';
            }

            if (summary) {
                summary.innerHTML = `
                    <div class="stat-box"><span class="val">${stats.kills}</span><span class="lbl">KILLS</span></div>
                    <div class="stat-box"><span class="val">${stats.headshots}</span><span class="lbl">HEADSHOTS</span></div>
                    <div class="stat-box"><span class="val">${stats.damage}</span><span class="lbl">DAMAGE</span></div>
                    <div class="stat-box"><span class="val">${stats.deaths}</span><span class="lbl">DEATHS</span></div>
                `;
            }
        }
    }
}

window.GameUI = new UIEngine();
