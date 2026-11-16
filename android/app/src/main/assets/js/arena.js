/**
 * Cyber Arena: Zero Hour - Tactical Arena Environment ("Outpost Alpha")
 * Multi-level tactical FPS map with sniper towers, catwalks, ramps, shipping containers,
 * crates, cover barriers, dynamic lighting, and rotating pickups.
 */
class Arena {
    constructor(scene) {
        this.scene = scene;
        this.colliders = [];
        this.pickups = [];
        this.dropPickups = [];

        this.botSpawns = [];
        this.playerSpawns = [];
        this.waypoints = [];

        this._buildArena();
        this._setupLighting();
        this._setupPickups();
        this._setupWaypoints();
    }

    _buildArena() {
        const floorTex = window.Textures.createFloorTexture();
        const wallTex = window.Textures.createWallTexture();
        const crateTex = window.Textures.createCrateTexture();
        const barricadeTex = window.Textures.createBarricadeTexture();

        // 1. Arena Main Floor (70m x 70m)
        const floorGeo = new THREE.PlaneGeometry(70, 70);
        const floorMat = new THREE.MeshStandardMaterial({
            map: floorTex,
            roughness: 0.8,
            metalness: 0.2
        });
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.receiveShadow = true;
        this.scene.add(floorMesh);
        // Floor is ground level y = 0

        // 2. Perimeter Boundary Walls (4 walls, 70m length, 9m height)
        const wallMat = new THREE.MeshStandardMaterial({
            map: wallTex,
            roughness: 0.5,
            metalness: 0.5
        });

        const wallConfigs = [
            { pos: [0, 4.5, -35], size: [70, 9, 1] }, // North
            { pos: [0, 4.5, 35], size: [70, 9, 1] },  // South
            { pos: [-35, 4.5, 0], size: [1, 9, 70] }, // West
            { pos: [35, 4.5, 0], size: [1, 9, 70] }   // East
        ];

        wallConfigs.forEach(cfg => {
            const pos = Array.isArray(cfg.pos) ? cfg.pos : [cfg.pos, cfg.pos, 0];
            const wMesh = new THREE.Mesh(new THREE.BoxGeometry(cfg.size[0], cfg.size[1], cfg.size[2]), wallMat);
            wMesh.position.set(pos[0], pos[1], pos[2]);
            wMesh.castShadow = true;
            wMesh.receiveShadow = true;
            this.scene.add(wMesh);
            this.colliders.push(wMesh);
        });

        // 3. Four Corner Sniper Towers & Catwalks (Height: 4.5m)
        const towerMat = new THREE.MeshStandardMaterial({ color: 0x272c33, roughness: 0.5, metalness: 0.6 });
        const catwalkMat = new THREE.MeshStandardMaterial({ color: 0x363d47, roughness: 0.6, metalness: 0.7 });

        const towerCorners = [
            [-24, -24], [24, -24], [-24, 24], [24, 24]
        ];

        towerCorners.forEach(([tx, tz]) => {
            // Tower platform floor
            const platform = new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 8), catwalkMat);
            platform.position.set(tx, 4.5, tz);
            platform.castShadow = true;
            platform.receiveShadow = true;
            this.scene.add(platform);
            this.colliders.push(platform);

            // 4 Support Pillars
            const pillarP = [
                [tx - 3.5, tz - 3.5], [tx + 3.5, tz - 3.5],
                [tx - 3.5, tz + 3.5], [tx + 3.5, tz + 3.5]
            ];
            pillarP.forEach(([px, pz]) => {
                const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4.5, 8), towerMat);
                pillar.position.set(px, 2.25, pz);
                pillar.castShadow = true;
                this.scene.add(pillar);
                this.colliders.push(pillar);
            });

            // Guard rails on platforms
            const railGeo = new THREE.BoxGeometry(8, 1.1, 0.15);
            const railMat = new THREE.MeshStandardMaterial({ color: 0xe5a50a });
            const rail1 = new THREE.Mesh(railGeo, railMat);
            rail1.position.set(tx, 5.3, tz - 3.9);
            this.scene.add(rail1);
            this.colliders.push(rail1);

            const rail2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, 8), railMat);
            rail2.position.set(tx - 3.9, 5.3, tz);
            this.scene.add(rail2);
            this.colliders.push(rail2);
        });

        // Catwalk Bridges connecting East-West towers
        const bridge1 = new THREE.Mesh(new THREE.BoxGeometry(40, 0.4, 3.5), catwalkMat);
        bridge1.position.set(0, 4.5, -24);
        this.scene.add(bridge1);
        this.colliders.push(bridge1);

        const bridge2 = new THREE.Mesh(new THREE.BoxGeometry(40, 0.4, 3.5), catwalkMat);
        bridge2.position.set(0, 4.5, 24);
        this.scene.add(bridge2);
        this.colliders.push(bridge2);

        // Access Ramps leading up to bridges (slope from y=0 to y=4.5)
        const rampGeo = new THREE.BoxGeometry(3.5, 0.3, 11);
        const rampMat = new THREE.MeshStandardMaterial({ color: 0x404752, roughness: 0.6 });

        const ramp1 = new THREE.Mesh(rampGeo, rampMat);
        ramp1.position.set(0, 2.25, -18.5);
        ramp1.rotation.x = 0.42; // incline
        this.scene.add(ramp1);
        this.colliders.push(ramp1);

        const ramp2 = new THREE.Mesh(rampGeo, rampMat);
        ramp2.position.set(0, 2.25, 18.5);
        ramp2.rotation.x = -0.42;
        this.scene.add(ramp2);
        this.colliders.push(ramp2);

        // 4. Shipping Containers in Central Courtyard
        const containerColors = ['#d94b26', '#2574a9', '#388e3c', '#e67e22'];
        const containerDefs = [
            { pos: [-10, 1.5, -6], rotY: 0.2, color: containerColors[0] },
            { pos: [12, 1.5, -8], rotY: -0.35, color: containerColors[1] },
            { pos: [-12, 1.5, 9], rotY: -0.15, color: containerColors[2] },
            { pos: [9, 1.5, 8], rotY: 0.4, color: containerColors[3] }
        ];

        containerDefs.forEach(c => {
            const cTex = window.Textures.createContainerTexture(c.color);
            const cMat = new THREE.MeshStandardMaterial({ map: cTex, roughness: 0.5, metalness: 0.6 });
            const cMesh = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.0, 3.0), cMat);
            cMesh.position.set(c.pos[0], c.pos[1], c.pos[2]);
            cMesh.rotation.y = c.rotY;
            cMesh.castShadow = true;
            cMesh.receiveShadow = true;
            this.scene.add(cMesh);
            this.colliders.push(cMesh);
        });

        // 5. Tactical Supply Crates (Various Stacks)
        const crateMat = new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.6, metalness: 0.3 });
        const cratePositions = [
            [-5, 0.75, -2], [-5, 0.75, -3.5], [-5, 2.25, -2.75], // Stack of 3
            [5, 0.75, 3], [5, 0.75, 4.5],
            [-18, 0.75, -12], [-18, 2.25, -12],
            [18, 0.75, 14], [18, 0.75, 15.5],
            [-2, 0.75, 12], [0, 0.75, 12],
            [-14, 0.75, -22], [14, 0.75, -22],
            [-14, 0.75, 22], [14, 0.75, 22]
        ];

        cratePositions.forEach(([cx, cy, cz]) => {
            const crate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), crateMat);
            crate.position.set(cx, cy, cz);
            crate.castShadow = true;
            crate.receiveShadow = true;
            this.scene.add(crate);
            this.colliders.push(crate);
        });

        // 6. Concrete Jersey Barricades
        const barrMat = new THREE.MeshStandardMaterial({ map: barricadeTex, roughness: 0.7 });
        const barricadeDefs = [
            { pos: [0, 0.6, -4], rot: 0 },
            { pos: [0, 0.6, 4], rot: 0 },
            { pos: [-6, 0.6, 0], rot: Math.PI / 2 },
            { pos: [6, 0.6, 0], rot: Math.PI / 2 },
            { pos: [-20, 0.6, 0], rot: 0.3 },
            { pos: [20, 0.6, 0], rot: -0.3 }
        ];

        barricadeDefs.forEach(b => {
            const barr = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.2, 0.8), barrMat);
            barr.position.set(b.pos[0], b.pos[1], b.pos[2]);
            barr.rotation.y = b.rot;
            barr.castShadow = true;
            barr.receiveShadow = true;
            this.scene.add(barr);
            this.colliders.push(barr);
        });
    }

    _setupLighting() {
        // Atmospheric Sky / Ambient Fill
        const hemiLight = new THREE.HemisphereLight(0x88ccff, 0x22252a, 0.75);
        this.scene.add(hemiLight);

        // Main Sun / Tactical Key Light
        const sun = new THREE.DirectionalLight(0xfff5e6, 1.2);
        sun.position.set(35, 50, 25);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 10;
        sun.shadow.camera.far = 110;
        sun.shadow.camera.left = -40;
        sun.shadow.camera.right = 40;
        sun.shadow.camera.top = 40;
        sun.shadow.camera.bottom = -40;
        sun.shadow.bias = -0.0005;
        this.scene.add(sun);

        // Colored Cyber Accent Point Lights
        const lightAccents = [
            { pos: [-24, 6.0, -24], color: 0x00f0ff, dist: 16 }, // Cyan tower
            { pos: [24, 6.0, -24], color: 0xff3366, dist: 16 },  // Crimson tower
            { pos: [-24, 6.0, 24], color: 0xffaa00, dist: 16 },  // Amber tower
            { pos: [24, 6.0, 24], color: 0x00ff88, dist: 16 },   // Emerald tower
            { pos: [0, 3.5, 0], color: 0x00d4ff, dist: 20 }       // Center courtyard
        ];

        lightAccents.forEach(la => {
            const pLight = new THREE.PointLight(la.color, 1.5, la.dist);
            pLight.position.set(la.pos[0], la.pos[1], la.pos[2]);
            this.scene.add(pLight);

            // Small glowing sphere representing lamp bulb
            const bulb = new THREE.Mesh(
                new THREE.SphereGeometry(0.18, 8, 8),
                new THREE.MeshBasicMaterial({ color: la.color })
            );
            bulb.position.copy(pLight.position);
            this.scene.add(bulb);
        });
    }

    _setupPickups() {
        const pickupLocs = [
            { type: 'health', pos: new THREE.Vector3(-24, 5.2, -24) }, // Tower NW
            { type: 'ammo', pos: new THREE.Vector3(24, 5.2, -24) },   // Tower NE
            { type: 'health', pos: new THREE.Vector3(24, 5.2, 24) },   // Tower SE
            { type: 'ammo', pos: new THREE.Vector3(-24, 5.2, 24) },   // Tower SW
            { type: 'health', pos: new THREE.Vector3(0, 0.8, -12) },  // Center North
            { type: 'ammo', pos: new THREE.Vector3(0, 0.8, 12) },    // Center South
            { type: 'health', pos: new THREE.Vector3(-18, 0.8, 0) },  // West Alley
            { type: 'ammo', pos: new THREE.Vector3(18, 0.8, 0) }     // East Alley
        ];

        pickupLocs.forEach(p => {
            const mesh = this._createPickupMesh(p.type);
            mesh.position.copy(p.pos);
            this.scene.add(mesh);

            this.pickups.push({
                type: p.type,
                basePos: p.pos.clone(),
                mesh: mesh,
                isActive: true,
                respawnTimer: 0,
                respawnCooldown: 15.0 // 15 sec respawn
            });
        });
    }

    _createPickupMesh(type) {
        const group = new THREE.Group();

        if (type === 'health') {
            // Glowing Green Medical Cross
            const mat = new THREE.MeshStandardMaterial({
                color: 0x00ff66,
                emissive: 0x00cc44,
                emissiveIntensity: 0.8,
                roughness: 0.2
            });

            const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.24, 0.24), mat);
            const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.24), mat);
            group.add(bar1);
            group.add(bar2);

            // Halo Ring
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.55, 0.03, 8, 24),
                new THREE.MeshBasicMaterial({ color: 0x00ff88 })
            );
            ring.rotation.x = Math.PI / 2;
            group.add(ring);
        } else {
            // Glowing Yellow Ammo Box
            const mat = new THREE.MeshStandardMaterial({
                color: 0xffaa00,
                emissive: 0xff8800,
                emissiveIntensity: 0.8,
                roughness: 0.3
            });

            const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.4), mat);
            group.add(box);

            const handle = new THREE.Mesh(
                new THREE.TorusGeometry(0.18, 0.03, 6, 12),
                new THREE.MeshBasicMaterial({ color: 0xffffff })
            );
            handle.position.set(0, 0.22, 0);
            group.add(handle);
        }

        return group;
    }

    spawnDropPickup(pos, type = 'ammo') {
        const mesh = this._createPickupMesh(type);
        mesh.position.set(pos.x, 0.8, pos.z);
        this.scene.add(mesh);

        this.dropPickups.push({
            type: type,
            mesh: mesh,
            life: 20.0 // Despawns after 20 seconds if not collected
        });
    }

    _setupWaypoints() {
        // AI Navigation Waypoint Network across all tactical zones
        this.waypoints = [
            new THREE.Vector3(0, 0, 0),       // Center Courtyard
            new THREE.Vector3(-10, 0, -10),
            new THREE.Vector3(10, 0, -10),
            new THREE.Vector3(-10, 0, 10),
            new THREE.Vector3(10, 0, 10),
            new THREE.Vector3(-20, 0, -20),
            new THREE.Vector3(20, 0, -20),
            new THREE.Vector3(-20, 0, 20),
            new THREE.Vector3(20, 0, 20),
            new THREE.Vector3(0, 0, -20),
            new THREE.Vector3(0, 0, 20),
            new THREE.Vector3(-20, 0, 0),
            new THREE.Vector3(20, 0, 0),
            new THREE.Vector3(0, 4.5, -24),  // Bridge North
            new THREE.Vector3(0, 4.5, 24)    // Bridge South
        ];

        // Spawns
        this.botSpawns = [
            new THREE.Vector3(-22, 0, -22),
            new THREE.Vector3(22, 0, -22),
            new THREE.Vector3(-22, 0, 22),
            new THREE.Vector3(22, 0, 22),
            new THREE.Vector3(-25, 0, 0),
            new THREE.Vector3(25, 0, 0),
            new THREE.Vector3(0, 0, -28),
            new THREE.Vector3(0, 0, 28)
        ];

        this.playerSpawns = [
            new THREE.Vector3(0, 0, -26),
            new THREE.Vector3(0, 0, 26),
            new THREE.Vector3(-26, 0, 0),
            new THREE.Vector3(26, 0, 0)
        ];
    }

    getColliders() {
        return this.colliders;
    }

    getWaypoints() {
        return this.waypoints;
    }

    getBotSpawnPoints() {
        return this.botSpawns;
    }

    getRandomPlayerSpawn() {
        return this.playerSpawns[Math.floor(Math.random() * this.playerSpawns.length)].clone();
    }

    /**
     * Update rotating pickups and detect player pickup
     */
    update(dt, player) {
        const time = performance.now() * 0.001;

        // 1. Static Respawning Pickups
        this.pickups.forEach(p => {
            if (p.isActive) {
                // Bobbing & Rotation
                p.mesh.rotation.y = time * 2.2;
                p.mesh.position.y = p.basePos.y + Math.sin(time * 3.5) * 0.15;

                // Check distance to player
                if (player.isAlive && p.mesh.position.distanceTo(player.position) < 1.8) {
                    if (p.type === 'health' && player.health < player.maxHealth) {
                        player.heal(50);
                        p.isActive = false;
                        p.mesh.visible = false;
                        p.respawnTimer = p.respawnCooldown;
                    } else if (p.type === 'ammo') {
                        player.replenishAmmo();
                        p.isActive = false;
                        p.mesh.visible = false;
                        p.respawnTimer = p.respawnCooldown;
                    }
                }
            } else {
                p.respawnTimer -= dt;
                if (p.respawnTimer <= 0) {
                    p.isActive = true;
                    p.mesh.visible = true;
                }
            }
        });

        // 2. Dynamic Dropped Pickups from Bot Eliminations
        for (let i = this.dropPickups.length - 1; i >= 0; i--) {
            const dp = this.dropPickups[i];
            dp.life -= dt;
            dp.mesh.rotation.y = time * 2.8;

            if (player.isAlive && dp.mesh.position.distanceTo(player.position) < 1.8) {
                if (dp.type === 'health') {
                    player.heal(35);
                } else {
                    player.replenishAmmo();
                }
                this.scene.remove(dp.mesh);
                this.dropPickups.splice(i, 1);
                continue;
            }

            if (dp.life <= 0) {
                this.scene.remove(dp.mesh);
                this.dropPickups.splice(i, 1);
            }
        }
    }
}
