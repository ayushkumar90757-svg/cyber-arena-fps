/**
 * Cyber Arena: Zero Hour - Bot Squad Manager
 * Manages bot spawning, respawning, target prioritization, and kill feed announcements.
 */

const BOT_NAMES = [
    'Viper_7', 'Ghost_Rider', 'Apex_Cyborg', 'Kage_Ninja',
    'Shadow_Fox', 'Ronin_X', 'Titan_Heavy', 'Spectre_01',
    'Raven_Strike', 'Zero_Cool', 'Blaze_Bane', 'Nova_Core'
];

class BotManager {
    constructor(scene, vfx, arena, count = 5, difficulty = 'medium') {
        this.scene = scene;
        this.vfx = vfx;
        this.arena = arena;
        this.botCount = count;
        this.difficulty = difficulty;

        this.bots = [];
        this.respawnQueue = [];

        this._spawnInitialBots();
    }

    _spawnInitialBots() {
        const spawns = this.arena.getBotSpawnPoints();
        const waypoints = this.arena.getWaypoints();

        for (let i = 0; i < this.botCount; i++) {
            const spawnPos = spawns[i % spawns.length].clone();
            // Jitter spawn pos slightly
            spawnPos.x += (Math.random() - 0.5) * 3;
            spawnPos.z += (Math.random() - 0.5) * 3;

            const name = BOT_NAMES[i % BOT_NAMES.length];
            const bot = new Bot(i + 1, name, spawnPos, this.scene, this.vfx, waypoints, this.difficulty);
            this.bots.push(bot);
        }
    }

    getHitboxObjects() {
        const hitboxes = [];
        this.bots.forEach(b => {
            if (b.isAlive) {
                hitboxes.push(...b.getHitboxes());
            }
        });
        return hitboxes;
    }

    handlePlayerShot(hitResult, player) {
        if (!hitResult || !hitResult.object || !hitResult.object.userData) return false;

        const { bot, isHead } = hitResult.object.userData;
        if (!bot || !bot.isAlive) return false;

        let dmg = hitResult.damage;
        if (isHead) {
            dmg = Math.round(dmg * hitResult.headshotMultiplier);
            player.headshots++;
        }

        player.damageDealt += dmg;

        // Visual and Audio feedback
        window.Sound.playHit(isHead);
        this.vfx.spawnDamageNumber(hitResult.point, dmg, isHead);
        this.vfx.spawnBlood(hitResult.point, hitResult.normal, isHead ? 20 : 12);

        // Apply damage to bot
        bot.takeDamage(dmg, isHead, player.position);

        if (!bot.isAlive) {
            player.kills++;
            window.Sound.playKillDing();

            // Notify UI kill feed
            if (window.GameUI) {
                window.GameUI.addKillFeed(
                    'Player',
                    bot.name,
                    player.weaponManager.getCurrent().config.name,
                    isHead
                );
            }

            // Spawn pickup at bot death location
            if (Math.random() < 0.6) {
                this.arena.spawnDropPickup(bot.position.clone(), Math.random() < 0.5 ? 'health' : 'ammo');
            }

            // Queue respawn
            this.respawnQueue.push({
                bot: bot,
                respawnTime: performance.now() * 0.001 + 6.0 // 6 second respawn delay
            });
        }

        return true;
    }

    handleAggregatedShot(data, player) {
        const { bot, isHead, totalDamage, primaryPoint, normal } = data;
        if (!bot || !bot.isAlive) return false;

        player.damageDealt += totalDamage;

        // Visual and Audio feedback
        window.Sound.playHit(isHead);
        this.vfx.spawnDamageNumber(primaryPoint, totalDamage, isHead);
        this.vfx.spawnBlood(primaryPoint, normal, isHead ? 22 : 14);

        // Apply damage to bot
        bot.takeDamage(totalDamage, isHead, player.position);

        if (!bot.isAlive) {
            player.kills++;
            window.Sound.playKillDing();

            // Notify UI kill feed
            if (window.GameUI) {
                window.GameUI.addKillFeed(
                    'Player',
                    bot.name,
                    player.weaponManager.getCurrent().config.name,
                    isHead
                );
            }

            // Spawn pickup at bot death location
            if (Math.random() < 0.6) {
                this.arena.spawnDropPickup(bot.position.clone(), Math.random() < 0.5 ? 'health' : 'ammo');
            }

            // Queue respawn
            this.respawnQueue.push({
                bot: bot,
                respawnTime: performance.now() * 0.001 + 6.0 // 6 second respawn delay
            });
        }

        return true;
    }

    update(dt, player, colliders) {
        const now = performance.now() * 0.001;

        // Update all active bots
        this.bots.forEach(bot => {
            bot.update(dt, player, colliders, this.bots);
        });

        // Process respawns
        for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
            const item = this.respawnQueue[i];
            if (now >= item.respawnTime) {
                const spawns = this.arena.getBotSpawnPoints();
                // Choose spawn farthest from player
                let bestSpawn = spawns[0];
                let maxDist = -1;
                spawns.forEach(sp => {
                    const d = sp.distanceTo(player.position);
                    if (d > maxDist) {
                        maxDist = d;
                        bestSpawn = sp;
                    }
                });

                item.bot.respawn(bestSpawn);
                this.respawnQueue.splice(i, 1);
            }
        }
    }

    reset() {
        this.bots.forEach(b => b.destroy());
        this.bots = [];
        this.respawnQueue = [];
        this._spawnInitialBots();
    }
}
