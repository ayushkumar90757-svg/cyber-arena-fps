/**
 * Cyber Arena: Zero Hour - Tactical Bot AI
 * Robust Finite State Machine (PATROL, SEARCH, CHASE, ATTACK, COVER, DIE).
 * Distinct head/body hitboxes, procedural 3D cyborg mesh, weapon handling,
 * line-of-sight raycasting, and obstacle avoidance.
 */

const BOT_STATES = {
    PATROL: 'PATROL',
    SEARCH: 'SEARCH',
    CHASE: 'CHASE',
    ATTACK: 'ATTACK',
    COVER: 'COVER',
    DIE: 'DIE'
};

class Bot {
    constructor(id, name, spawnPos, scene, vfx, waypoints, difficulty = 'medium') {
        this.id = id;
        this.name = name;
        this.scene = scene;
        this.vfx = vfx;
        this.waypoints = waypoints || [];
        this.difficulty = difficulty;

        // Position & Physics
        this.position = spawnPos.clone();
        this.velocity = new THREE.Vector3();
        this.rotationY = Math.random() * Math.PI * 2;
        this.walkSpeed = 6.0;
        this.runSpeed = 10.0;
        this.radius = 0.55;

        // Combat Stats
        this.maxHealth = 100;
        this.health = 100;
        this.isAlive = true;
        this.kills = 0;
        this.deaths = 0;

        // Weapon Configuration
        const weapons = ['ar', 'shotgun', 'sniper'];
        this.weaponType = weapons[Math.floor(Math.random() * weapons.length)];
        this.damage = this.weaponType === 'ar' ? 14 : (this.weaponType === 'shotgun' ? 10 : 45);
        this.fireInterval = this.weaponType === 'ar' ? 0.18 : (this.weaponType === 'shotgun' ? 0.9 : 1.6);
        this.lastShotTime = 0;
        this.burstCount = 0;
        this.burstCooldown = 0;

        // Accuracy settings based on difficulty
        if (difficulty === 'easy') {
            this.accuracySpread = 0.08;
            this.reactionTime = 0.45;
        } else if (difficulty === 'hard') {
            this.accuracySpread = 0.025;
            this.reactionTime = 0.15;
        } else { // medium
            this.accuracySpread = 0.045;
            this.reactionTime = 0.25;
        }

        // FSM & Navigation
        this.state = BOT_STATES.PATROL;
        this.stateTimer = 0;
        this.target = null;
        this.lastSeenTargetPos = null;
        this.currentWaypointIndex = Math.floor(Math.random() * Math.max(1, this.waypoints.length));
        this.currentCoverPos = null;

        // Limb animation timers
        this.animTime = 0;

        // Raycasting
        this.raycaster = new THREE.Raycaster();

        // Build 3D mesh
        this._buildMesh();
        this._buildHealthBar();
    }

    _buildMesh() {
        this.mesh = new THREE.Group();
        this.mesh.position.copy(this.position);

        const matArmor = new THREE.MeshStandardMaterial({ color: 0x333940, roughness: 0.4, metalness: 0.6 });
        const matJoints = new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.8 });
        const matVisor = new THREE.MeshStandardMaterial({
            color: 0xff0033,
            emissive: 0xff0022,
            emissiveIntensity: 0.9,
            roughness: 0.1
        });

        // 1. Torso (Body Hitbox)
        const torsoGeo = new THREE.BoxGeometry(0.55, 0.7, 0.32);
        this.torsoMesh = new THREE.Mesh(torsoGeo, matArmor);
        this.torsoMesh.position.set(0, 1.05, 0);
        this.torsoMesh.userData = { bot: this, isHead: false };
        this.mesh.add(this.torsoMesh);

        // 2. Head (Headshot Hitbox)
        const headGeo = new THREE.BoxGeometry(0.3, 0.3, 0.32);
        this.headMesh = new THREE.Mesh(headGeo, matArmor);
        this.headMesh.position.set(0, 1.62, 0);
        this.headMesh.userData = { bot: this, isHead: true };

        // Glowing Tactical Visor on Head
        const visorGeo = new THREE.BoxGeometry(0.24, 0.08, 0.06);
        const visorMesh = new THREE.Mesh(visorGeo, matVisor);
        visorMesh.position.set(0, 0.02, -0.16);
        this.headMesh.add(visorMesh);

        this.mesh.add(this.headMesh);

        // 3. Arms
        const armGeo = new THREE.BoxGeometry(0.14, 0.55, 0.14);
        this.leftArm = new THREE.Mesh(armGeo, matArmor);
        this.leftArm.position.set(-0.36, 1.1, 0);
        this.mesh.add(this.leftArm);

        this.rightArm = new THREE.Mesh(armGeo, matArmor);
        this.rightArm.position.set(0.36, 1.1, 0);
        this.mesh.add(this.rightArm);

        // 4. Bot Weapon in Right Hand
        const gunGeo = new THREE.BoxGeometry(0.08, 0.1, 0.45);
        this.gunMesh = new THREE.Mesh(gunGeo, matJoints);
        this.gunMesh.position.set(0.24, 1.0, -0.28);
        this.mesh.add(this.gunMesh);

        this.muzzleNode = new THREE.Object3D();
        this.muzzleNode.position.set(0, 0, -0.3);
        this.gunMesh.add(this.muzzleNode);

        // 5. Legs
        const legGeo = new THREE.BoxGeometry(0.18, 0.7, 0.18);
        this.leftLeg = new THREE.Mesh(legGeo, matJoints);
        this.leftLeg.position.set(-0.16, 0.35, 0);
        this.mesh.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeo, matJoints);
        this.rightLeg.position.set(0.16, 0.35, 0);
        this.mesh.add(this.rightLeg);

        this.scene.add(this.mesh);
    }

    _buildHealthBar() {
        // Overhead 3D Health Bar
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 16;
        this.hbCtx = canvas.getContext('2d');
        this.hbTex = new THREE.CanvasTexture(canvas);

        const hbMat = new THREE.SpriteMaterial({ map: this.hbTex, depthTest: false });
        this.hbSprite = new THREE.Sprite(hbMat);
        this.hbSprite.position.set(0, 2.05, 0);
        this.hbSprite.scale.set(0.9, 0.12, 1);
        this.mesh.add(this.hbSprite);

        this._updateHealthBarGraphic();
    }

    _updateHealthBarGraphic() {
        if (!this.hbCtx) return;
        const ctx = this.hbCtx;
        ctx.clearRect(0, 0, 128, 16);

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, 128, 16);

        // Health fill
        const pct = Math.max(0, this.health / this.maxHealth);
        ctx.fillStyle = pct > 0.5 ? '#00ff66' : (pct > 0.25 ? '#ffcc00' : '#ff1133');
        ctx.fillRect(2, 2, Math.floor(124 * pct), 12);

        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(1, 1, 126, 14);

        this.hbTex.needsUpdate = true;
    }

    getHitboxes() {
        if (!this.isAlive) return [];
        return [this.headMesh, this.torsoMesh];
    }

    takeDamage(amount, isHeadshot = false, attackerPos = null) {
        if (!this.isAlive) return;

        this.health -= amount;
        this._updateHealthBarGraphic();

        // If attacked, instantly face and target the attacker
        if (attackerPos && this.state !== BOT_STATES.DIE) {
            this.lastSeenTargetPos = attackerPos.clone();
            this.state = BOT_STATES.ATTACK;
            this.stateTimer = 0;
        }

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.isAlive = false;
        this.state = BOT_STATES.DIE;
        this.stateTimer = 0;
        this.deaths++;

        // Hide health bar
        if (this.hbSprite) this.hbSprite.visible = false;

        // Death physics tumble
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.y = 0.2;
    }

    respawn(pos) {
        this.isAlive = true;
        this.health = this.maxHealth;
        this.position.copy(pos);
        this.mesh.position.copy(pos);
        this.mesh.rotation.set(0, Math.random() * Math.PI * 2, 0);
        this.state = BOT_STATES.PATROL;
        this.stateTimer = 0;
        this.target = null;
        if (this.hbSprite) this.hbSprite.visible = true;
        this._updateHealthBarGraphic();
    }

    /**
     * Check clear line of sight to target
     */
    hasLineOfSightTo(targetPos, colliders) {
        const eyePos = new THREE.Vector3(this.position.x, this.position.y + 1.6, this.position.z);
        const targetEye = new THREE.Vector3(targetPos.x, targetPos.y + 1.5, targetPos.z);
        const dir = new THREE.Vector3().subVectors(targetEye, eyePos);
        const dist = dir.length();

        if (dist > 65) return false; // Out of visual range

        dir.normalize();
        this.raycaster.set(eyePos, dir);
        this.raycaster.far = dist;

        const hits = this.raycaster.intersectObjects(colliders, true);
        return hits.length === 0; // Clear if no walls/crates in the way
    }

    /**
     * Update AI State Machine
     */
    update(dt, player, colliders, allBots) {
        if (!this.isAlive) return;
        if (dt > 0.1) dt = 0.1;

        this.stateTimer += dt;
        const distToPlayer = this.position.distanceTo(player.position);
        const canSeePlayer = player.isAlive && this.hasLineOfSightTo(player.position, colliders);

        // State Machine Transitions
        switch (this.state) {
            case BOT_STATES.PATROL:
                if (canSeePlayer && distToPlayer < 45) {
                    this.state = BOT_STATES.ATTACK;
                    this.target = player;
                    this.stateTimer = 0;
                } else if (this.stateTimer > 12.0) {
                    // Pick next patrol waypoint
                    this.currentWaypointIndex = (this.currentWaypointIndex + 1) % Math.max(1, this.waypoints.length);
                    this.stateTimer = 0;
                }
                break;

            case BOT_STATES.SEARCH:
                if (canSeePlayer) {
                    this.state = BOT_STATES.ATTACK;
                    this.target = player;
                    this.stateTimer = 0;
                } else if (this.stateTimer > 6.0) {
                    this.state = BOT_STATES.PATROL;
                    this.stateTimer = 0;
                }
                break;

            case BOT_STATES.ATTACK:
                if (!player.isAlive) {
                    this.state = BOT_STATES.PATROL;
                    this.stateTimer = 0;
                } else if (!canSeePlayer) {
                    this.state = BOT_STATES.CHASE;
                    this.lastSeenTargetPos = player.position.clone();
                    this.stateTimer = 0;
                } else if (this.health < 30 && distToPlayer < 20) {
                    // Low health retreat to cover
                    this.state = BOT_STATES.COVER;
                    this.stateTimer = 0;
                }
                break;

            case BOT_STATES.CHASE:
                if (canSeePlayer) {
                    this.state = BOT_STATES.ATTACK;
                    this.stateTimer = 0;
                } else if (this.stateTimer > 8.0) {
                    this.state = BOT_STATES.PATROL;
                    this.stateTimer = 0;
                }
                break;

            case BOT_STATES.COVER:
                if (this.stateTimer > 4.5 || canSeePlayer) {
                    this.state = BOT_STATES.ATTACK;
                    this.stateTimer = 0;
                }
                break;
        }

        // State Action Execution
        let moveTarget = null;
        let isRunning = false;
        let shouldShoot = false;

        if (this.state === BOT_STATES.PATROL && this.waypoints.length > 0) {
            moveTarget = this.waypoints[this.currentWaypointIndex];
            isRunning = false;
            if (moveTarget && this.position.distanceTo(moveTarget) < 2.5) {
                this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
            }
        } else if (this.state === BOT_STATES.SEARCH && this.lastSeenTargetPos) {
            moveTarget = this.lastSeenTargetPos;
            isRunning = true;
        } else if (this.state === BOT_STATES.CHASE && this.lastSeenTargetPos) {
            moveTarget = this.lastSeenTargetPos;
            isRunning = true;
        } else if (this.state === BOT_STATES.ATTACK && player.isAlive) {
            // Strafe or maintain distance while attacking
            shouldShoot = true;
            if (distToPlayer > 18) {
                moveTarget = player.position; // Close distance
                isRunning = true;
            } else if (distToPlayer < 6) {
                // Backpedal slightly
                const awayDir = new THREE.Vector3().subVectors(this.position, player.position).normalize();
                moveTarget = this.position.clone().addScaledVector(awayDir, 4);
                isRunning = false;
            } else {
                // Tactical strafe left/right
                const strafeDir = new THREE.Vector3(Math.cos(this.rotationY + Math.PI / 2), 0, Math.sin(this.rotationY + Math.PI / 2));
                const strafeSign = Math.sin(this.stateTimer * 2.0) > 0 ? 1 : -1;
                moveTarget = this.position.clone().addScaledVector(strafeDir, strafeSign * 3);
                isRunning = false;
            }
        } else if (this.state === BOT_STATES.COVER) {
            // Move away from player
            const awayDir = new THREE.Vector3().subVectors(this.position, player.position).normalize();
            moveTarget = this.position.clone().addScaledVector(awayDir, 8);
            isRunning = true;
        }

        // Navigate towards moveTarget
        if (moveTarget) {
            this._navigateTowards(moveTarget, dt, isRunning, colliders);
        }

        // Handle Aiming & Shooting
        if (shouldShoot && canSeePlayer) {
            this._aimAndShoot(dt, player, colliders);
        }

        // Animate limbs
        this._animateLimbs(dt, moveTarget !== null);

        // Update mesh position & rotation
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotationY;
    }

    _navigateTowards(targetPos, dt, isRunning, colliders) {
        const toTarget = new THREE.Vector3().subVectors(targetPos, this.position);
        toTarget.y = 0;
        const dist = toTarget.length();

        if (dist > 0.2) {
            toTarget.normalize();

            // Obstacle Avoidance using side whisker raycasts
            const forward = toTarget.clone();
            const leftWhisker = forward.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.5);
            const rightWhisker = forward.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.5);

            const rayOrigin = new THREE.Vector3(this.position.x, this.position.y + 0.8, this.position.z);
            this.raycaster.far = 2.2;

            this.raycaster.set(rayOrigin, forward);
            const frontHits = this.raycaster.intersectObjects(colliders, true);

            if (frontHits.length > 0) {
                // Blocked in front, check whiskers to steer
                this.raycaster.set(rayOrigin, leftWhisker);
                const leftHits = this.raycaster.intersectObjects(colliders, true);
                if (leftHits.length === 0) {
                    toTarget.copy(leftWhisker);
                } else {
                    toTarget.copy(rightWhisker);
                }
            }

            // Smooth rotation towards target
            const targetYaw = Math.atan2(toTarget.x, toTarget.z) + Math.PI; // Face forward
            this.rotationY = THREE.MathUtils.lerp(this.rotationY, targetYaw, dt * 8.0);

            // Move
            const speed = isRunning ? this.runSpeed : this.walkSpeed;
            this.position.x += Math.sin(this.rotationY + Math.PI) * speed * dt;
            this.position.z += Math.cos(this.rotationY + Math.PI) * speed * dt;

            // Keep within arena boundaries
            const limit = 33.5;
            this.position.x = Math.max(-limit, Math.min(limit, this.position.x));
            this.position.z = Math.max(-limit, Math.min(limit, this.position.z));
        }
    }

    _aimAndShoot(dt, player, colliders) {
        const now = performance.now() * 0.001;

        // Face player smoothly
        const toPlayer = new THREE.Vector3().subVectors(player.position, this.position);
        toPlayer.y = 0;
        const targetYaw = Math.atan2(toPlayer.x, toPlayer.z) + Math.PI;
        this.rotationY = THREE.MathUtils.lerp(this.rotationY, targetYaw, dt * 10.0);

        // Gun cooldown check
        if (now - this.lastShotTime < this.fireInterval) return;

        this.lastShotTime = now;

        // Bot shoots towards player chest with realistic dispersion
        const eyePos = new THREE.Vector3(this.position.x, this.position.y + 1.2, this.position.z);
        const playerChest = new THREE.Vector3(player.position.x, player.position.y + 1.2, player.position.z);

        const spread = this.accuracySpread;
        playerChest.x += (Math.random() - 0.5) * spread * 20;
        playerChest.y += (Math.random() - 0.5) * spread * 10;
        playerChest.z += (Math.random() - 0.5) * spread * 20;

        const shootDir = new THREE.Vector3().subVectors(playerChest, eyePos).normalize();

        // Get world muzzle pos
        const muzzlePos = new THREE.Vector3();
        this.muzzleNode.getWorldPosition(muzzlePos);

        // Raycast shot
        this.raycaster.set(eyePos, shootDir);
        this.raycaster.far = 70;

        const collidersWithPlayer = [...colliders];
        // Trace to see if hits wall or player
        const hits = this.raycaster.intersectObjects(colliders, true);

        let hitPoint = playerChest;
        let blockedByWall = false;

        if (hits.length > 0 && hits[0].distance < eyePos.distanceTo(player.position)) {
            hitPoint = hits[0].point;
            blockedByWall = true;
            this.vfx.spawnSparks(hitPoint, hits[0].face.normal, 6);
        }

        if (!blockedByWall) {
            // Check if bullet hits player bounding capsule
            const dist = eyePos.distanceTo(player.position);
            const shootRay = new THREE.Ray(eyePos, shootDir);
            const playerSphere = new THREE.Sphere(new THREE.Vector3(player.position.x, player.position.y + 1.0, player.position.z), 0.8);

            if (shootRay.intersectsSphere(playerSphere)) {
                player.takeDamage(this.damage, this.position);
                hitPoint = playerChest;
            }
        }

        // VFX & SFX
        window.Sound.playShoot(this.weaponType);
        this.vfx.spawnTracer(muzzlePos, hitPoint, 0xff3344); // Red laser tracer for bot shots
    }

    _animateLimbs(dt, isMoving) {
        if (isMoving) {
            this.animTime += dt * 10.0;
            const swing = Math.sin(this.animTime) * 0.45;
            this.leftLeg.rotation.x = swing;
            this.rightLeg.rotation.x = -swing;
            this.leftArm.rotation.x = -swing * 0.5;
        } else {
            this.leftLeg.rotation.x = 0;
            this.rightLeg.rotation.x = 0;
            this.leftArm.rotation.x = 0;
        }
    }

    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
        if (this.hbTex) this.hbTex.dispose();
    }
}
