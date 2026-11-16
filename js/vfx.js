/**
 * Cyber Arena: Zero Hour - VFX Engine
 * High performance visual effects: bullet tracers, muzzle flashes, spark/blood impacts,
 * floating damage numbers, and ejected brass shell casings.
 */
class VFXEngine {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        this.particles = [];
        this.tracers = [];
        this.casings = [];
        this.damageTexts = [];

        // Shared geometries & materials
        this.sparkGeo = new THREE.PlaneGeometry(0.12, 0.12);
        this.sparkMat = new THREE.MeshBasicMaterial({
            map: window.Textures.createSparkTexture(),
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        this.bloodGeo = new THREE.PlaneGeometry(0.16, 0.16);
        this.bloodMat = new THREE.MeshBasicMaterial({
            map: window.Textures.createBloodTexture(),
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        this.smokeGeo = new THREE.PlaneGeometry(0.4, 0.4);
        this.smokeMat = new THREE.MeshBasicMaterial({
            map: window.Textures.createSmokeTexture(),
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        this.casingGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.055, 6);
        this.casingMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            metalness: 0.9,
            roughness: 0.2
        });
    }

    /**
     * Spawn high speed bullet tracer
     */
    spawnTracer(startPos, endPos, color = 0xffe066) {
        const dir = new THREE.Vector3().subVectors(endPos, startPos);
        const dist = dir.length();
        if (dist < 0.1) return;

        const tracerLength = Math.min(3.5, dist * 0.4);
        const geo = new THREE.CylinderGeometry(0.02, 0.02, tracerLength, 4);
        geo.rotateX(Math.PI / 2); // orient along Z

        const mat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(startPos);
        mesh.lookAt(endPos);

        this.scene.add(mesh);

        this.tracers.push({
            mesh: mesh,
            dir: dir.clone().normalize(),
            currentPos: startPos.clone(),
            targetPos: endPos.clone(),
            speed: 280, // m/s
            distanceTraveled: 0,
            maxDistance: dist
        });
    }

    /**
     * Spawn spark burst on hard surfaces
     */
    spawnSparks(point, normal, count = 12) {
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(this.sparkGeo, this.sparkMat.clone());
            mesh.position.copy(point).addScaledVector(normal, 0.02);

            // Velocity biased along normal with random cone
            const spread = new THREE.Vector3(
                (Math.random() - 0.5) * 1.6,
                (Math.random() - 0.5) * 1.6,
                (Math.random() - 0.5) * 1.6
            );
            const vel = normal.clone().multiplyScalar(4.0 + Math.random() * 5.0).add(spread);

            this.scene.add(mesh);
            this.particles.push({
                mesh: mesh,
                velocity: vel,
                gravity: -15,
                life: 0.25 + Math.random() * 0.2,
                maxLife: 0.45,
                scaleDecay: true
            });
        }

        // Small smoke puff
        this.spawnSmoke(point, normal);
    }

    /**
     * Spawn blood mist burst on organic/bot hit
     */
    spawnBlood(point, normal, count = 14) {
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(this.bloodGeo, this.bloodMat.clone());
            mesh.position.copy(point).addScaledVector(normal, 0.03);

            const vel = normal.clone().multiplyScalar(2.0 + Math.random() * 3.5).add(
                new THREE.Vector3(
                    (Math.random() - 0.5) * 2.0,
                    (Math.random() - 0.5) * 2.0,
                    (Math.random() - 0.5) * 2.0
                )
            );

            this.scene.add(mesh);
            this.particles.push({
                mesh: mesh,
                velocity: vel,
                gravity: -9.8,
                life: 0.35 + Math.random() * 0.25,
                maxLife: 0.6,
                scaleDecay: false
            });
        }
    }

    /**
     * Spawn soft smoke puff
     */
    spawnSmoke(point, normal) {
        const mesh = new THREE.Mesh(this.smokeGeo, this.smokeMat.clone());
        mesh.position.copy(point).addScaledVector(normal, 0.05);

        const vel = normal.clone().multiplyScalar(0.8).add(
            new THREE.Vector3((Math.random() - 0.5) * 0.4, Math.random() * 0.8, (Math.random() - 0.5) * 0.4)
        );

        this.scene.add(mesh);
        this.particles.push({
            mesh: mesh,
            velocity: vel,
            gravity: 0.2, // rises
            life: 0.6,
            maxLife: 0.6,
            scaleGrow: true
        });
    }

    /**
     * Eject brass bullet shell casing with realistic tumble
     */
    spawnCasing(startPos, rightDir, upDir) {
        const mesh = new THREE.Mesh(this.casingGeo, this.casingMat);
        mesh.position.copy(startPos);

        // Velocity: pops right and slightly up and backwards
        const vel = rightDir.clone().multiplyScalar(2.2 + Math.random() * 0.8)
            .addScaledVector(upDir, 1.8 + Math.random() * 0.6)
            .add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5));

        const rotVel = new THREE.Vector3(
            Math.random() * 20 - 10,
            Math.random() * 20 - 10,
            Math.random() * 20 - 10
        );

        this.scene.add(mesh);
        this.casings.push({
            mesh: mesh,
            velocity: vel,
            rotVelocity: rotVel,
            life: 2.0,
            bounced: 0
        });
    }

    /**
     * Floating RPG damage numbers (e.g. "25" or "HEADSHOT 65")
     */
    spawnDamageNumber(pos, amount, isHeadshot = false) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.font = isHeadshot ? 'bold 44px sans-serif' : 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Outline
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#000000';
        const text = isHeadshot ? `CRIT! ${amount}` : `${amount}`;
        ctx.strokeText(text, 128, 64);

        // Fill
        ctx.fillStyle = isHeadshot ? '#ffcc00' : '#ffffff';
        ctx.fillText(text, 128, 64);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(mat);

        sprite.position.copy(pos).add(new THREE.Vector3(0, 0.4 + Math.random() * 0.2, 0));
        const scale = isHeadshot ? 1.4 : 1.0;
        sprite.scale.set(scale, scale * 0.5, 1);

        this.scene.add(sprite);
        this.damageTexts.push({
            sprite: sprite,
            texture: tex,
            velocity: new THREE.Vector3(0, 1.2, 0),
            life: 0.8,
            maxLife: 0.8
        });
    }

    /**
     * Update all active VFX per frame
     */
    update(dt) {
        if (dt > 0.1) dt = 0.1; // clamp delta spike

        // 1. Update Tracers
        for (let i = this.tracers.length - 1; i >= 0; i--) {
            const tr = this.tracers[i];
            const moveStep = tr.speed * dt;
            tr.distanceTraveled += moveStep;
            tr.mesh.position.addScaledVector(tr.dir, moveStep);

            if (tr.distanceTraveled >= tr.maxDistance) {
                this.scene.remove(tr.mesh);
                if (tr.mesh.geometry) tr.mesh.geometry.dispose();
                if (tr.mesh.material) tr.mesh.material.dispose();
                this.tracers.splice(i, 1);
            }
        }

        // 2. Update Particles (Sparks, Blood, Smoke)
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                if (p.mesh.material) p.mesh.material.dispose();
                this.particles.splice(i, 1);
                continue;
            }

            p.velocity.y += p.gravity * dt;
            p.mesh.position.addScaledVector(p.velocity, dt);

            // Make particles face camera (billboard)
            p.mesh.quaternion.copy(this.camera.quaternion);

            const progress = p.life / p.maxLife;
            p.mesh.material.opacity = progress;

            if (p.scaleDecay) {
                p.mesh.scale.setScalar(Math.max(0.01, progress));
            } else if (p.scaleGrow) {
                const grow = (1 - progress) * 2.0 + 1.0;
                p.mesh.scale.setScalar(grow);
            }
        }

        // 3. Update Casings
        for (let i = this.casings.length - 1; i >= 0; i--) {
            const c = this.casings[i];
            c.life -= dt;

            if (c.life <= 0) {
                this.scene.remove(c.mesh);
                this.casings.splice(i, 1);
                continue;
            }

            c.velocity.y -= 18.0 * dt; // gravity
            c.mesh.position.addScaledVector(c.velocity, dt);

            c.mesh.rotation.x += c.rotVelocity.x * dt;
            c.mesh.rotation.y += c.rotVelocity.y * dt;
            c.mesh.rotation.z += c.rotVelocity.z * dt;

            // Bounce on ground (y <= 0.05)
            if (c.mesh.position.y <= 0.05 && c.bounced < 3) {
                c.mesh.position.y = 0.05;
                c.velocity.y = -c.velocity.y * 0.4;
                c.velocity.x *= 0.6;
                c.velocity.z *= 0.6;
                c.rotVelocity.multiplyScalar(0.5);
                c.bounced++;
            }
        }

        // 4. Update Damage Texts
        for (let i = this.damageTexts.length - 1; i >= 0; i--) {
            const dtText = this.damageTexts[i];
            dtText.life -= dt;

            if (dtText.life <= 0) {
                this.scene.remove(dtText.sprite);
                if (dtText.texture) dtText.texture.dispose();
                if (dtText.sprite.material) dtText.sprite.material.dispose();
                this.damageTexts.splice(i, 1);
                continue;
            }

            dtText.sprite.position.addScaledVector(dtText.velocity, dt);
            const alpha = dtText.life / dtText.maxLife;
            dtText.sprite.material.opacity = alpha;
        }
    }

    /**
     * Clear all active VFX (e.g. on match reset)
     */
    reset() {
        this.tracers.forEach(t => {
            this.scene.remove(t.mesh);
            if (t.mesh.geometry) t.mesh.geometry.dispose();
            if (t.mesh.material) t.mesh.material.dispose();
        });
        this.tracers = [];

        this.particles.forEach(p => {
            this.scene.remove(p.mesh);
            if (p.mesh.material) p.mesh.material.dispose();
        });
        this.particles = [];

        this.casings.forEach(c => {
            this.scene.remove(c.mesh);
        });
        this.casings = [];

        this.damageTexts.forEach(d => {
            this.scene.remove(d.sprite);
            if (d.texture) d.texture.dispose();
            if (d.sprite.material) d.sprite.material.dispose();
        });
        this.damageTexts = [];
    }
}
