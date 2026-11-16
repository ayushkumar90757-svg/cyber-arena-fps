/**
 * Cyber Arena: Zero Hour - Player Controller
 * First-person controller with physics, bounding capsule collision, jumping, sprinting,
 * pointer-lock look controls, health/armor systems, and weapon interactions.
 */
class PlayerController {
    constructor(camera, domElement, scene, vfx) {
        this.camera = camera;
        this.domElement = domElement;
        this.scene = scene;
        this.vfx = vfx;

        // Player Physical Dimensions & State
        this.position = new THREE.Vector3(0, 1.8, 0);
        this.velocity = new THREE.Vector3();
        this.radius = 0.5;
        this.height = 1.8;
        this.eyeHeight = 1.7;

        this.walkSpeed = 9.0;
        this.sprintSpeed = 14.5;
        this.jumpForce = 11.5;
        this.gravity = 28.0;
        this.isGrounded = false;
        this.isSprinting = false;
        this.isMoving = false;

        // Stats
        this.maxHealth = 100;
        this.health = 100;
        this.maxArmor = 50;
        this.armor = 50;
        this.isAlive = true;
        this.kills = 0;
        this.deaths = 0;
        this.headshots = 0;
        this.damageDealt = 0;

        // Combat Timers
        this.lastDamageTakenTime = 0;
        this.regenDelay = 5.0; // seconds before shield/health regen
        this.footstepTimer = 0;

        // Camera Look Pitch & Yaw
        this.yaw = 0;
        this.pitch = 0;
        this.mouseSensitivity = 0.0022;
        this.isPointerLocked = false;

        this.hasShotCurrentClick = false;

        // Keys state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            sprint: false,
            fire: false,
            aim: false
        };

        // Weapon Manager
        this.weaponManager = new WeaponManager(this.camera, this.scene, this.vfx);

        // Raycaster for shooting & collisions
        this.raycaster = new THREE.Raycaster();

        // Directional damage indicator angle (for UI)
        this.lastDamageAngle = null;
        this.damageIndicatorTimer = 0;

        // Mobile / Touch controls state
        this.touchMove = { x: 0, z: 0 };
        this.isTouchActive = false;

        // Bound event listeners
        this._bindInput();
        this._bindTouch();
    }

    _bindTouch() {
        // Detect touch environment
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
        if (isTouch) {
            document.body.classList.add('touch-enabled');
        }

        // Virtual Joystick
        const joystickZone = document.getElementById('touch-joystick-zone');
        const joystickKnob = document.getElementById('touch-joystick-knob');
        let joyTouchId = null;
        let joyCenter = { x: 0, y: 0 };
        const joyMaxRadius = 45;

        if (joystickZone && joystickKnob) {
            joystickZone.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.changedTouches[0];
                joyTouchId = touch.identifier;
                const rect = joystickZone.getBoundingClientRect();
                joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            }, { passive: false });

            joystickZone.addEventListener('touchmove', (e) => {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    if (touch.identifier === joyTouchId) {
                        let dx = touch.clientX - joyCenter.x;
                        let dy = touch.clientY - joyCenter.y;
                        const dist = Math.hypot(dx, dy);

                        if (dist > joyMaxRadius) {
                            dx = (dx / dist) * joyMaxRadius;
                            dy = (dy / dist) * joyMaxRadius;
                        }

                        joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;

                        // Normalise to -1..1
                        this.touchMove.x = dx / joyMaxRadius;
                        this.touchMove.z = dy / joyMaxRadius;
                        this.isTouchActive = true;
                        this.isSprinting = (dist / joyMaxRadius) > 0.8;
                    }
                }
            }, { passive: false });

            const resetJoy = (e) => {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === joyTouchId) {
                        joyTouchId = null;
                        joystickKnob.style.transform = 'translate(0px, 0px)';
                        this.touchMove.x = 0;
                        this.touchMove.z = 0;
                        this.isTouchActive = false;
                        this.isSprinting = false;
                    }
                }
            };
            joystickZone.addEventListener('touchend', resetJoy);
            joystickZone.addEventListener('touchcancel', resetJoy);
        }

        // Touch Aim Drag Surface (Right Half)
        const aimZone = document.getElementById('touch-aim-zone');
        let aimTouchId = null;
        let lastAim = { x: 0, y: 0 };

        if (aimZone) {
            aimZone.addEventListener('touchstart', (e) => {
                const touch = e.changedTouches[0];
                aimTouchId = touch.identifier;
                lastAim = { x: touch.clientX, y: touch.clientY };
            }, { passive: false });

            aimZone.addEventListener('touchmove', (e) => {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    if (touch.identifier === aimTouchId) {
                        const deltaX = touch.clientX - lastAim.x;
                        const deltaY = touch.clientY - lastAim.y;
                        lastAim = { x: touch.clientX, y: touch.clientY };

                        const sens = this.weaponManager.isAiming ? 0.003 : 0.0055;
                        this.yaw -= deltaX * sens;
                        this.pitch -= deltaY * sens;

                        const maxPitch = Math.PI / 2 - 0.02;
                        this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
                        this._updateCameraRotation();
                    }
                }
            }, { passive: false });

            const resetAim = (e) => {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === aimTouchId) {
                        aimTouchId = null;
                    }
                }
            };
            aimZone.addEventListener('touchend', resetAim);
            aimZone.addEventListener('touchcancel', resetAim);
        }

        // Action Buttons
        const btnFire = document.getElementById('touch-fire-btn');
        if (btnFire) {
            btnFire.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys.fire = true;
                this.hasShotCurrentClick = false;
            }, { passive: false });
            btnFire.addEventListener('touchend', () => { this.keys.fire = false; });
            btnFire.addEventListener('touchcancel', () => { this.keys.fire = false; });
        }

        const btnAds = document.getElementById('touch-ads-btn');
        if (btnAds) {
            btnAds.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.weaponManager.setAiming(!this.weaponManager.isAiming);
            }, { passive: false });
        }

        const btnJump = document.getElementById('touch-jump-btn');
        if (btnJump) {
            btnJump.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.isGrounded) {
                    this.velocity.y = this.jumpForce;
                    this.isGrounded = false;
                    window.Sound.playJump();
                }
            }, { passive: false });
        }

        const btnReload = document.getElementById('touch-reload-btn');
        if (btnReload) {
            btnReload.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.weaponManager.startReload();
            }, { passive: false });
        }

        const btnSwitch = document.getElementById('touch-switch-btn');
        if (btnSwitch) {
            btnSwitch.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const weaponOrder = ['ar', 'shotgun', 'sniper'];
                let idx = weaponOrder.indexOf(this.weaponManager.currentWeaponId);
                idx = (idx + 1) % weaponOrder.length;
                this.weaponManager.equip(weaponOrder[idx]);
            }, { passive: false });
        }
    }

    _bindInput() {
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onWheel = this._onWheel.bind(this);

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        window.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('mousedown', this._onMouseDown);
        window.addEventListener('mouseup', this._onMouseUp);
        window.addEventListener('wheel', this._onWheel, { passive: false });
    }

    destroy() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('mousedown', this._onMouseDown);
        window.removeEventListener('mouseup', this._onMouseUp);
        window.removeEventListener('wheel', this._onWheel);
    }

    _onKeyDown(e) {
        if (!this.isAlive) return;

        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = true;
                break;
            case 'Space':
                this.keys.jump = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.sprint = true;
                break;
            case 'KeyR':
                this.weaponManager.startReload();
                break;
            case 'Digit1':
                this.weaponManager.equip('ar');
                break;
            case 'Digit2':
                this.weaponManager.equip('shotgun');
                break;
            case 'Digit3':
                this.weaponManager.equip('sniper');
                break;
        }
    }

    _onKeyUp(e) {
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = false;
                break;
            case 'Space':
                this.keys.jump = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.sprint = false;
                break;
        }
    }

    _onMouseMove(e) {
        if (!this.isPointerLocked || !this.isAlive) return;

        const sens = this.weaponManager.isAiming ? this.mouseSensitivity * 0.5 : this.mouseSensitivity;
        this.yaw -= e.movementX * sens;
        this.pitch -= e.movementY * sens;

        // Clamp pitch to prevent camera flips (-89 deg to +89 deg)
        const maxPitch = Math.PI / 2 - 0.02;
        this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

        this._updateCameraRotation();
    }

    _onMouseDown(e) {
        if (!this.isPointerLocked || !this.isAlive) return;

        if (e.button === 0) { // LMB: Fire
            this.keys.fire = true;
            this.hasShotCurrentClick = false;
        } else if (e.button === 2) { // RMB: ADS
            this.keys.aim = true;
            this.weaponManager.setAiming(true);
        }
    }

    _onMouseUp(e) {
        if (e.button === 0) {
            this.keys.fire = false;
            this.hasShotCurrentClick = false;
        } else if (e.button === 2) {
            this.keys.aim = false;
            this.weaponManager.setAiming(false);
        }
    }

    _onWheel(e) {
        if (!this.isPointerLocked || !this.isAlive) return;
        e.preventDefault();

        const weaponOrder = ['ar', 'shotgun', 'sniper'];
        let idx = weaponOrder.indexOf(this.weaponManager.currentWeaponId);
        if (e.deltaY > 0) {
            idx = (idx + 1) % weaponOrder.length;
        } else {
            idx = (idx - 1 + weaponOrder.length) % weaponOrder.length;
        }
        this.weaponManager.equip(weaponOrder[idx]);
    }

    _updateCameraRotation() {
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;
        this.camera.rotation.z = 0;
    }

    setPointerLock(locked) {
        this.isPointerLocked = locked;
        if (!locked) {
            this.keys.fire = false;
            this.keys.aim = false;
            this.weaponManager.setAiming(false);
        }
    }

    teleport(pos, yaw = 0) {
        this.position.copy(pos);
        this.velocity.set(0, 0, 0);
        this.yaw = yaw;
        this.pitch = 0;
        this._updateCameraRotation();
        this.camera.position.set(this.position.x, this.position.y + this.eyeHeight, this.position.z);
    }

    takeDamage(amount, attackerPosition = null) {
        if (!this.isAlive) return;

        this.lastDamageTakenTime = performance.now() * 0.001;
        window.Sound.playHurt();

        // Calculate incoming damage angle for directional indicator
        if (attackerPosition) {
            const hitVector = new THREE.Vector3().subVectors(attackerPosition, this.position).normalize();
            // Project onto horizontal plane
            const camForward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, this.yaw, 0)).normalize();
            const camRight = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, this.yaw, 0)).normalize();

            const dotF = camForward.dot(hitVector);
            const dotR = camRight.dot(hitVector);
            this.lastDamageAngle = Math.atan2(dotR, dotF); // in radians
            this.damageIndicatorTimer = 1.2;
        }

        // Armor absorbs 50% of damage
        if (this.armor > 0) {
            const absorbed = Math.min(this.armor, amount * 0.5);
            this.armor -= absorbed;
            amount -= absorbed;
        }

        this.health = Math.max(0, this.health - amount);

        // Screen shake
        this.pitch += (Math.random() - 0.5) * 0.06;
        this.yaw += (Math.random() - 0.5) * 0.06;
        this._updateCameraRotation();

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.isAlive = false;
        this.deaths++;
        this.keys.fire = false;
        this.keys.aim = false;
        this.weaponManager.setAiming(false);
        window.Sound.playFanfare(false);
    }

    respawn(spawnPos) {
        this.isAlive = true;
        this.health = this.maxHealth;
        this.armor = this.maxArmor;
        this.teleport(spawnPos);
        this.weaponManager.equip('ar');
        this.weaponManager.addAmmo(999);
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        window.Sound.playPickup('health');
    }

    replenishAmmo() {
        this.weaponManager.addAmmo(999);
        window.Sound.playPickup('ammo');
    }

    /**
     * Physics, Movement & Arena Collision Update
     */
    update(dt, colliders) {
        if (dt > 0.1) dt = 0.1;
        const now = performance.now() * 0.001;

        if (!this.isAlive) {
            // Death camera fall animation
            this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, this.position.y + 0.25, dt * 5.0);
            this.camera.rotation.z = THREE.MathUtils.lerp(this.camera.rotation.z, 0.45, dt * 4.0);
            return;
        }

        // Damage indicator decay
        if (this.damageIndicatorTimer > 0) {
            this.damageIndicatorTimer -= dt;
        }

        // Passive Health/Shield Regen after delay
        if (now - this.lastDamageTakenTime > this.regenDelay) {
            if (this.health < 50) {
                this.health = Math.min(50, this.health + dt * 10.0);
            }
            if (this.armor < 25) {
                this.armor = Math.min(25, this.armor + dt * 5.0);
            }
        }

        // 1. Process Movement Inputs (Keyboard & Mobile Touch Joystick)
        const moveDir = new THREE.Vector3();
        if (this.keys.forward) moveDir.z -= 1;
        if (this.keys.backward) moveDir.z += 1;
        if (this.keys.left) moveDir.x -= 1;
        if (this.keys.right) moveDir.x += 1;

        if (this.isTouchActive) {
            moveDir.x += this.touchMove.x;
            moveDir.z += this.touchMove.z;
        }

        this.isMoving = moveDir.lengthSq() > 0.001;
        if (!this.isTouchActive) {
            this.isSprinting = this.keys.sprint && this.keys.forward && !this.weaponManager.isAiming;
        }

        const targetSpeed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;

        if (this.isMoving) {
            moveDir.normalize();
            // Transform movement direction relative to camera yaw
            const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, this.yaw, 0)).normalize();
            const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, this.yaw, 0)).normalize();

            const desiredVelX = (right.x * moveDir.x + forward.x * -moveDir.z) * targetSpeed;
            const desiredVelZ = (right.z * moveDir.x + forward.z * -moveDir.z) * targetSpeed;

            const accel = this.isGrounded ? 18.0 : 6.0;
            this.velocity.x += (desiredVelX - this.velocity.x) * Math.min(1.0, dt * accel);
            this.velocity.z += (desiredVelZ - this.velocity.z) * Math.min(1.0, dt * accel);

            // Footsteps
            if (this.isGrounded) {
                this.footstepTimer += dt * (this.isSprinting ? 1.5 : 1.0);
                if (this.footstepTimer >= 0.4) {
                    window.Sound.playFootstep();
                    this.footstepTimer = 0;
                }
            }
        } else {
            // Apply ground friction
            const friction = this.isGrounded ? 16.0 : 3.0;
            this.velocity.x += (0 - this.velocity.x) * Math.min(1.0, dt * friction);
            this.velocity.z += (0 - this.velocity.z) * Math.min(1.0, dt * friction);
            this.footstepTimer = 0.2;
        }

        // 2. Jumping & Gravity
        if (this.keys.jump && this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
            window.Sound.playJump();
        }

        this.velocity.y -= this.gravity * dt;

        // 3. Resolve Collisions against Arena Geometry
        this._resolveCollisions(dt, colliders);

        // 4. Update Camera Position
        this.camera.position.set(this.position.x, this.position.y + this.eyeHeight, this.position.z);

        // 5. Weapon Update
        this.weaponManager.update(dt, this.isMoving, this.isSprinting);
    }

    /**
     * Bounding cylinder & floor collision resolution
     */
    _resolveCollisions(dt, colliders) {
        // Vertical step
        const nextY = this.position.y + this.velocity.y * dt;
        let groundY = 0; // Default arena ground plane

        // Raycast downward from above player to check catwalks/platforms
        this.raycaster.set(new THREE.Vector3(this.position.x, this.position.y + 1.2, this.position.z), new THREE.Vector3(0, -1, 0));
        const downHits = this.raycaster.intersectObjects(colliders, true);

        if (downHits.length > 0) {
            const hit = downHits[0];
            if (hit.distance <= 1.2 + Math.abs(this.velocity.y * dt) + 0.1) {
                groundY = Math.max(groundY, hit.point.y);
            }
        }

        if (nextY <= groundY) {
            if (!this.isGrounded && this.velocity.y < -3.0) {
                window.Sound.playLand();
            }
            this.position.y = groundY;
            this.velocity.y = 0;
            this.isGrounded = true;
        } else {
            this.position.y = nextY;
            this.isGrounded = false;
        }

        // Horizontal step & Wall/Crate Obstacle Pushout
        const nextX = this.position.x + this.velocity.x * dt;
        const nextZ = this.position.z + this.velocity.z * dt;

        // Arena Boundaries (-34 to +34)
        const arenaLimit = 33.5;
        this.position.x = Math.max(-arenaLimit, Math.min(arenaLimit, nextX));
        this.position.z = Math.max(-arenaLimit, Math.min(arenaLimit, nextZ));

        // Horizontal cylinder obstacle collision check (8 radial rays)
        const checkHeights = [0.4, 1.2]; // knees and chest
        const rayAngles = 8;
        const radius = this.radius;

        for (const h of checkHeights) {
            const origin = new THREE.Vector3(this.position.x, this.position.y + h, this.position.z);
            for (let i = 0; i < rayAngles; i++) {
                const angle = (i / rayAngles) * Math.PI * 2;
                const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
                this.raycaster.set(origin, dir);
                this.raycaster.far = radius + 0.1;

                const hits = this.raycaster.intersectObjects(colliders, true);
                if (hits.length > 0 && hits[0].distance < radius) {
                    const penetration = radius - hits[0].distance;
                    this.position.addScaledVector(dir, -penetration);
                }
            }
        }
    }
}
