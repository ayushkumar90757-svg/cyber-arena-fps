/**
 * Cyber Arena: Zero Hour - Weapon System
 * Realistic FPS weapons with 3D procedural viewmodels, recoil kick, ADS, animations, and stats.
 */

const WEAPON_CONFIGS = {
    ar: {
        id: 'ar',
        name: 'Viper AR-47',
        category: 'Assault Rifle',
        fireMode: 'AUTO',
        damage: 26,
        headshotMultiplier: 2.5,
        fireRate: 0.1, // 600 RPM (10 rounds/sec)
        magSize: 30,
        maxReserve: 150,
        reloadTime: 1.8,
        hipSpread: 0.02,
        adsSpread: 0.003,
        recoilVertical: 0.016,
        recoilHorizontal: 0.008,
        pellets: 1,
        adsFov: 55,
        hipPos: new THREE.Vector3(0.24, -0.22, -0.45),
        adsPos: new THREE.Vector3(0.0, -0.165, -0.32),
        hipRot: new THREE.Euler(0.02, -0.04, 0),
        adsRot: new THREE.Euler(0, 0, 0),
        color: 0x24282e
    },
    shotgun: {
        id: 'shotgun',
        name: 'Bulldog 12G',
        category: 'Tactical Shotgun',
        fireMode: 'PUMP',
        damage: 15, // per pellet
        pellets: 8, // 120 total damage if all pellets hit
        headshotMultiplier: 1.8,
        fireRate: 0.8, // 75 RPM
        magSize: 8,
        maxReserve: 40,
        reloadTime: 2.2,
        hipSpread: 0.065,
        adsSpread: 0.038,
        recoilVertical: 0.055,
        recoilHorizontal: 0.018,
        adsFov: 60,
        hipPos: new THREE.Vector3(0.24, -0.24, -0.45),
        adsPos: new THREE.Vector3(0.0, -0.18, -0.35),
        hipRot: new THREE.Euler(0.02, -0.04, 0),
        adsRot: new THREE.Euler(0, 0, 0),
        color: 0x3d352e
    },
    sniper: {
        id: 'sniper',
        name: 'Shadow .50 Cal',
        category: 'Heavy Sniper',
        fireMode: 'BOLT',
        damage: 95,
        headshotMultiplier: 3.0, // 285 instant lethal headshot
        fireRate: 1.3, // 46 RPM
        magSize: 5,
        maxReserve: 25,
        reloadTime: 2.6,
        hipSpread: 0.09,
        adsSpread: 0.0003, // pinpoint accuracy in ADS
        recoilVertical: 0.08,
        recoilHorizontal: 0.02,
        pellets: 1,
        adsFov: 22, // Heavy magnification zoom
        hipPos: new THREE.Vector3(0.26, -0.24, -0.5),
        adsPos: new THREE.Vector3(0.0, -0.19, -0.28),
        hipRot: new THREE.Euler(0.02, -0.04, 0),
        adsRot: new THREE.Euler(0, 0, 0),
        color: 0x1f2329
    }
};

class WeaponManager {
    constructor(camera, scene, vfx) {
        this.camera = camera;
        this.scene = scene;
        this.vfx = vfx;

        // Container attached to camera for first-person viewmodel
        this.weaponHolder = new THREE.Group();
        this.camera.add(this.weaponHolder);

        // State variables
        this.weapons = {};
        this.currentWeaponId = 'ar';
        this.nextWeaponId = null;

        this.isReloading = false;
        this.reloadTimer = 0;
        this.reloadDuration = 0;
        this.reloadSoundFlags = { out: false, in: false, cock: false };

        this.lastShotTime = 0;
        this.isSwitching = false;
        this.switchProgress = 1.0; // 0 to 1

        this.isAiming = false;
        this.adsAlpha = 0; // 0 (hip) to 1 (full ADS)

        // Viewmodel bobbing & sway
        this.bobTime = 0;
        this.bobOffset = new THREE.Vector3();
        this.swayEuler = new THREE.Euler();
        this.recoilOffset = new THREE.Vector3();
        this.recoilRot = new THREE.Euler();

        // Muzzle flash point light
        this.muzzleLight = new THREE.PointLight(0xffaa22, 0, 8);
        this.weaponHolder.add(this.muzzleLight);
        this.muzzleFlashTimer = 0;

        // Initialize weapons
        this._initWeapons();
        this.equip('ar');
    }

    _initWeapons() {
        Object.keys(WEAPON_CONFIGS).forEach(key => {
            const cfg = WEAPON_CONFIGS[key];
            const mesh = this._createProceduralGunMesh(key);
            mesh.visible = false;
            this.weaponHolder.add(mesh);

            this.weapons[key] = {
                config: cfg,
                mesh: mesh,
                magAmmo: cfg.magSize,
                reserveAmmo: cfg.maxReserve,
                muzzleNode: mesh.userData.muzzleNode || mesh
            };
        });
    }

    /**
     * Procedural 3D Weapon Model Generation
     */
    _createProceduralGunMesh(type) {
        const group = new THREE.Group();
        const matDarkMetal = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.35, metalness: 0.85 });
        const matLightMetal = new THREE.MeshStandardMaterial({ color: 0x484e55, roughness: 0.4, metalness: 0.7 });
        const matAccent = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.2, metalness: 0.9, emissive: 0x005566, emissiveIntensity: 0.6 });
        const matGrip = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.85, metalness: 0.1 });

        if (type === 'ar') {
            // Viper AR-47
            // Receiver / Upper Body
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.09, 0.42), matDarkMetal);
            body.position.set(0, 0, 0);
            group.add(body);

            // Barrel & Handguard
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.32, 12), matLightMetal);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.012, -0.36);
            group.add(barrel);

            // Muzzle Flash Suppressor
            const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.02, 0.06, 8), matDarkMetal);
            muzzle.rotation.x = Math.PI / 2;
            muzzle.position.set(0, 0.012, -0.54);
            group.add(muzzle);

            // Curved Magazine
            const mag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.22, 0.09), matLightMetal);
            mag.position.set(0, -0.13, -0.06);
            mag.rotation.x = 0.25;
            group.add(mag);

            // Grip
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.15, 0.06), matGrip);
            grip.position.set(0, -0.11, 0.12);
            grip.rotation.x = -0.35;
            group.add(grip);

            // Stock
            const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.24), matDarkMetal);
            stock.position.set(0, -0.01, 0.32);
            group.add(stock);

            // Red Dot Sight mount & lens
            const sightBase = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.08), matDarkMetal);
            sightBase.position.set(0, 0.06, -0.05);
            group.add(sightBase);

            const sightRing = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.005, 8, 16), matDarkMetal);
            sightRing.position.set(0, 0.085, -0.05);
            group.add(sightRing);

            const sightDot = new THREE.Mesh(new THREE.SphereGeometry(0.003, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0033 }));
            sightDot.position.set(0, 0.085, -0.05);
            group.add(sightDot);

            // Cyber accent trim
            const trim = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.01, 0.28), matAccent);
            trim.position.set(0, 0.035, -0.06);
            group.add(trim);

            // Muzzle anchor node for tracers & flash
            const muzzleNode = new THREE.Object3D();
            muzzleNode.position.set(0, 0.012, -0.58);
            group.add(muzzleNode);
            group.userData.muzzleNode = muzzleNode;

        } else if (type === 'shotgun') {
            // Bulldog 12G
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.1, 0.44), matDarkMetal);
            group.add(body);

            // Heavy Twin Barrels
            const barrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.4, 12), matLightMetal);
            barrel1.rotation.x = Math.PI / 2;
            barrel1.position.set(0, 0.02, -0.4);
            group.add(barrel1);

            const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.36, 12), matDarkMetal);
            magTube.rotation.x = Math.PI / 2;
            magTube.position.set(0, -0.025, -0.38);
            group.add(magTube);

            // Pump Slide
            const pump = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.16), matGrip);
            pump.position.set(0, -0.02, -0.32);
            group.add(pump);

            // Grip & Stock
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.06), matGrip);
            grip.position.set(0, -0.11, 0.14);
            grip.rotation.x = -0.3;
            group.add(grip);

            const stock = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.12, 0.28), matDarkMetal);
            stock.position.set(0, -0.02, 0.34);
            group.add(stock);

            // Front fiber optic bead
            const bead = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00ff66 }));
            bead.position.set(0, 0.046, -0.59);
            group.add(bead);

            const muzzleNode = new THREE.Object3D();
            muzzleNode.position.set(0, 0.02, -0.62);
            group.add(muzzleNode);
            group.userData.muzzleNode = muzzleNode;

        } else if (type === 'sniper') {
            // Shadow .50 Cal
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.52), matDarkMetal);
            group.add(body);

            // Long Fluted Heavy Barrel
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.65, 12), matLightMetal);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.02, -0.56);
            group.add(barrel);

            // Massive Muzzle Brake
            const brake = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.1), matDarkMetal);
            brake.position.set(0, 0.02, -0.92);
            group.add(brake);

            // Massive Scope Body
            const scopeCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.34, 12), matDarkMetal);
            scopeCyl.rotation.x = Math.PI / 2;
            scopeCyl.position.set(0, 0.095, -0.08);
            group.add(scopeCyl);

            // Scope Mounts
            const mount1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.03), matDarkMetal);
            mount1.position.set(0, 0.065, -0.18);
            group.add(mount1);
            const mount2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.03), matDarkMetal);
            mount2.position.set(0, 0.065, 0.02);
            group.add(mount2);

            // Big Magazine
            const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.12), matDarkMetal);
            mag.position.set(0, -0.12, -0.06);
            group.add(mag);

            // Grip & Sniper Stock with Cheek Pad
            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.14, 0.06), matGrip);
            grip.position.set(0, -0.1, 0.16);
            grip.rotation.x = -0.3;
            group.add(grip);

            const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.32), matDarkMetal);
            stock.position.set(0, 0.0, 0.4);
            group.add(stock);

            const cheekRest = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.04, 0.14), matGrip);
            cheekRest.position.set(0, 0.08, 0.36);
            group.add(cheekRest);

            // Bolt Handle
            const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 8), matLightMetal);
            bolt.rotation.z = Math.PI / 2;
            bolt.position.set(0.045, 0.04, 0.04);
            group.add(bolt);

            const muzzleNode = new THREE.Object3D();
            muzzleNode.position.set(0, 0.02, -0.98);
            group.add(muzzleNode);
            group.userData.muzzleNode = muzzleNode;
        }

        // Add procedural Muzzle Flash mesh to the muzzle
        const flashMat = new THREE.MeshBasicMaterial({
            color: 0xffe066,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });
        const flashMesh = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 6), flashMat);
        flashMesh.rotation.x = -Math.PI / 2;
        if (group.userData.muzzleNode) {
            flashMesh.position.set(0, 0, -0.14);
            group.userData.muzzleNode.add(flashMesh);
        }
        group.userData.flashMesh = flashMesh;

        return group;
    }

    getCurrent() {
        return this.weapons[this.currentWeaponId];
    }

    equip(id) {
        if (!this.weapons[id] || (this.currentWeaponId === id && !this.isSwitching)) return;

        // Cancel reload if active
        this.isReloading = false;
        this.reloadTimer = 0;

        this.nextWeaponId = id;
        this.isSwitching = true;
        this.switchProgress = 0;
    }

    startReload() {
        const weapon = this.getCurrent();
        if (!weapon || this.isReloading || this.isSwitching) return false;

        // Can't reload if mag is already full or no reserve ammo left
        if (weapon.magAmmo >= weapon.config.magSize || weapon.reserveAmmo <= 0) {
            return false;
        }

        this.isReloading = true;
        this.reloadTimer = 0;
        this.reloadDuration = weapon.config.reloadTime;
        this.reloadSoundFlags = { out: false, in: false, cock: false };

        // Exit ADS during reload
        this.isAiming = false;
        return true;
    }

    addAmmo(amount = 999) {
        Object.values(this.weapons).forEach(w => {
            w.reserveAmmo = Math.min(w.config.maxReserve, w.reserveAmmo + (amount === 999 ? w.config.maxReserve : amount));
        });
    }

    setAiming(isAiming) {
        if (this.isReloading) {
            this.isAiming = false;
            return;
        }
        this.isAiming = isAiming;
    }

    canShoot(now) {
        if (this.isReloading || this.isSwitching) return false;
        const weapon = this.getCurrent();
        if (!weapon) return false;
        return (now - this.lastShotTime >= weapon.config.fireRate);
    }

    /**
     * Shoot primary weapon
     * Returns true if shot fired, false otherwise
     */
    shoot(now, raycaster, targetObjects) {
        const weapon = this.getCurrent();
        if (!weapon) return false;

        if (weapon.magAmmo <= 0) {
            window.Sound.playDryFire();
            this.startReload();
            return false;
        }

        // Deduct ammo
        weapon.magAmmo--;
        this.lastShotTime = now;

        // Play audio
        window.Sound.playShoot(weapon.config.id);

        // Visual Muzzle Flash
        this._triggerMuzzleFlash();

        // Eject Shell Casing
        const muzzleWorld = new THREE.Vector3();
        weapon.muzzleNode.getWorldPosition(muzzleWorld);
        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
        this.vfx.spawnCasing(muzzleWorld, camRight, camUp);

        // Apply Recoil Kick
        this.recoilOffset.z += 0.08;
        this.recoilRot.x += weapon.config.recoilVertical;
        this.recoilRot.y += (Math.random() - 0.5) * weapon.config.recoilHorizontal;

        // Calculate Raycast Spread & Pellets
        const pelletCount = weapon.config.pellets || 1;
        const spreadAmount = this.isAiming ? weapon.config.adsSpread : weapon.config.hipSpread;

        const hits = [];

        for (let p = 0; p < pelletCount; p++) {
            // Screen center + spread
            const spreadX = (Math.random() - 0.5) * spreadAmount;
            const spreadY = (Math.random() - 0.5) * spreadAmount;

            const shootDir = new THREE.Vector3(spreadX, spreadY, -1).normalize().applyQuaternion(this.camera.quaternion);
            raycaster.set(this.camera.position, shootDir);

            const intersects = raycaster.intersectObjects(targetObjects, true);

            let hitPoint = null;
            let hitNormal = new THREE.Vector3(0, 1, 0);
            let hitObject = null;

            if (intersects.length > 0) {
                const first = intersects[0];
                hitPoint = first.point;
                hitNormal = first.face ? first.face.normal.clone().applyQuaternion(first.object.getWorldQuaternion(new THREE.Quaternion())) : new THREE.Vector3(0, 1, 0);
                hitObject = first.object;

                hits.push({
                    point: hitPoint,
                    normal: hitNormal,
                    object: hitObject,
                    distance: first.distance,
                    damage: weapon.config.damage,
                    headshotMultiplier: weapon.config.headshotMultiplier
                });
            } else {
                // Miss: travel max distance into the sky
                hitPoint = this.camera.position.clone().addScaledVector(shootDir, 120);
            }

            // Spawn Tracer
            this.vfx.spawnTracer(muzzleWorld, hitPoint, weapon.config.id === 'sniper' ? 0x00f0ff : 0xffdd44);
        }

        return hits;
    }

    _triggerMuzzleFlash() {
        const weapon = this.getCurrent();
        if (!weapon) return;

        this.muzzleLight.intensity = 3.5;
        this.muzzleFlashTimer = 0.05; // 50ms flash

        if (weapon.mesh.userData.flashMesh) {
            weapon.mesh.userData.flashMesh.material.opacity = 0.95;
            weapon.mesh.userData.flashMesh.rotation.z = Math.random() * Math.PI * 2;
        }
    }

    /**
     * Update weapon viewmodel, bobbing, recoil, and reload state
     */
    update(dt, isMoving, isSprinting) {
        if (dt > 0.1) dt = 0.1;

        const weapon = this.getCurrent();
        if (!weapon) return;

        // 1. Muzzle Flash Decay
        if (this.muzzleFlashTimer > 0) {
            this.muzzleFlashTimer -= dt;
            if (this.muzzleFlashTimer <= 0) {
                this.muzzleLight.intensity = 0;
                if (weapon.mesh.userData.flashMesh) {
                    weapon.mesh.userData.flashMesh.material.opacity = 0;
                }
            }
        }

        // 2. Weapon Switch Animation
        if (this.isSwitching) {
            this.switchProgress += dt * 5.0; // 0.2s switch time
            if (this.switchProgress < 0.5) {
                // Lower current weapon
                this.weaponHolder.position.y = -Math.sin(this.switchProgress * Math.PI) * 0.45;
            } else {
                // Swap mesh at midpoint
                if (this.currentWeaponId !== this.nextWeaponId) {
                    this.weapons[this.currentWeaponId].mesh.visible = false;
                    this.currentWeaponId = this.nextWeaponId;
                    this.weapons[this.currentWeaponId].mesh.visible = true;
                }
                this.weaponHolder.position.y = -Math.sin(this.switchProgress * Math.PI) * 0.45;
            }

            if (this.switchProgress >= 1.0) {
                this.isSwitching = false;
                this.switchProgress = 1.0;
                this.weaponHolder.position.y = 0;
            }
        } else {
            this.weapons[this.currentWeaponId].mesh.visible = true;
        }

        // 3. Reload Cycle
        if (this.isReloading) {
            this.reloadTimer += dt;
            const progress = this.reloadTimer / this.reloadDuration;

            // Audio cues at 25%, 60%, 85%
            if (progress >= 0.25 && !this.reloadSoundFlags.out) {
                window.Sound.playReload('mag_out');
                this.reloadSoundFlags.out = true;
            }
            if (progress >= 0.65 && !this.reloadSoundFlags.in) {
                window.Sound.playReload('mag_in');
                this.reloadSoundFlags.in = true;
            }
            if (progress >= 0.85 && !this.reloadSoundFlags.cock) {
                window.Sound.playReload('cock');
                this.reloadSoundFlags.cock = true;
            }

            // Dip weapon down during reload
            const reloadDip = Math.sin(progress * Math.PI) * 0.22;
            const reloadTilt = Math.sin(progress * Math.PI) * 0.35;
            this.recoilOffset.y = -reloadDip;
            this.recoilRot.z = reloadTilt;

            if (this.reloadTimer >= this.reloadDuration) {
                // Complete reload
                const needed = weapon.config.magSize - weapon.magAmmo;
                const toAdd = Math.min(needed, weapon.reserveAmmo);
                weapon.magAmmo += toAdd;
                weapon.reserveAmmo -= toAdd;

                this.isReloading = false;
                this.reloadTimer = 0;
                this.recoilOffset.y = 0;
                this.recoilRot.z = 0;
            }
        }

        // 4. ADS Interpolation
        const targetAds = this.isAiming ? 1.0 : 0.0;
        this.adsAlpha += (targetAds - this.adsAlpha) * Math.min(1.0, dt * 16.0);

        // Smooth FOV zoom
        const targetFov = THREE.MathUtils.lerp(75, weapon.config.adsFov, this.adsAlpha);
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, Math.min(1.0, dt * 14.0));
        this.camera.updateProjectionMatrix();

        // 5. Weapon Bobbing & Breathing Sway
        if (isMoving) {
            const freq = isSprinting ? 14 : 9;
            const ampX = isSprinting ? 0.035 : 0.018;
            const ampY = isSprinting ? 0.045 : 0.022;

            this.bobTime += dt * freq;
            this.bobOffset.set(
                Math.cos(this.bobTime * 0.5) * ampX * (1 - this.adsAlpha * 0.8),
                Math.sin(this.bobTime) * ampY * (1 - this.adsAlpha * 0.8),
                0
            );
        } else {
            // Idle gentle breathing sway
            this.bobTime += dt * 2.0;
            this.bobOffset.set(
                Math.sin(this.bobTime) * 0.003 * (1 - this.adsAlpha * 0.9),
                Math.cos(this.bobTime * 2.0) * 0.004 * (1 - this.adsAlpha * 0.9),
                0
            );
        }

        // 6. Recoil Recovery
        this.recoilOffset.lerp(new THREE.Vector3(0, 0, 0), dt * 10.0);
        this.recoilRot.x = THREE.MathUtils.lerp(this.recoilRot.x, 0, dt * 12.0);
        this.recoilRot.y = THREE.MathUtils.lerp(this.recoilRot.y, 0, dt * 12.0);
        this.recoilRot.z = THREE.MathUtils.lerp(this.recoilRot.z, 0, dt * 12.0);

        // 7. Apply Composite Position & Rotation
        const currentPos = new THREE.Vector3().lerpVectors(weapon.config.hipPos, weapon.config.adsPos, this.adsAlpha);
        currentPos.add(this.bobOffset).add(this.recoilOffset);

        const currentRot = new THREE.Euler(
            THREE.MathUtils.lerp(weapon.config.hipRot.x, weapon.config.adsRot.x, this.adsAlpha) + this.recoilRot.x,
            THREE.MathUtils.lerp(weapon.config.hipRot.y, weapon.config.adsRot.y, this.adsAlpha) + this.recoilRot.y,
            THREE.MathUtils.lerp(weapon.config.hipRot.z, weapon.config.adsRot.z, this.adsAlpha) + this.recoilRot.z
        );

        weapon.mesh.position.copy(currentPos);
        weapon.mesh.rotation.copy(currentRot);

        // Special: If Shadow .50 Cal in full ADS, hide viewmodel so scope reticle covers screen
        if (this.currentWeaponId === 'sniper') {
            weapon.mesh.visible = (this.adsAlpha < 0.85);
        }
    }
}
