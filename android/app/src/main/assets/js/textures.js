/**
 * Cyber Arena: Zero Hour - Procedural Canvas Texture Generator
 * Generates high quality PBR-ready textures in memory with zero external image files.
 */
class TextureGenerator {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Create industrial concrete floor with grid seams and grime
     */
    createFloorTexture() {
        if (this.cache.has('floor')) return this.cache.get('floor');

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Base concrete tone
        ctx.fillStyle = '#22262a';
        ctx.fillRect(0, 0, 512, 512);

        // Noise grain
        const imgData = ctx.getImageData(0, 0, 512, 512);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 24;
            data[i] = Math.min(255, Math.max(0, data[i] + noise));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
        }
        ctx.putImageData(imgData, 0, 0);

        // Tile grid lines (4x4 tiles)
        ctx.strokeStyle = '#121517';
        ctx.lineWidth = 4;
        for (let x = 0; x <= 512; x += 128) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 512);
            ctx.stroke();
        }
        for (let y = 0; y <= 512; y += 128) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(512, y);
            ctx.stroke();
        }

        // Tactical edge hazard accent
        ctx.strokeStyle = 'rgba(235, 160, 20, 0.25)';
        ctx.lineWidth = 6;
        ctx.strokeRect(10, 10, 492, 492);

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(12, 12);
        this.cache.set('floor', tex);
        return tex;
    }

    /**
     * Reinforced military wall panel with rivets and carbon composite texture
     */
    createWallTexture() {
        if (this.cache.has('wall')) return this.cache.get('wall');

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Dark gunmetal base
        ctx.fillStyle = '#1c2024';
        ctx.fillRect(0, 0, 512, 512);

        // Subtle diagonal carbon fiber weave
        ctx.fillStyle = '#181b1e';
        for (let y = 0; y < 512; y += 8) {
            for (let x = 0; x < 512; x += 8) {
                if ((x / 8 + y / 8) % 2 === 0) {
                    ctx.fillRect(x, y, 4, 4);
                }
            }
        }

        // Panel borders
        ctx.strokeStyle = '#0d0f11';
        ctx.lineWidth = 6;
        ctx.strokeRect(4, 4, 504, 504);
        ctx.strokeRect(4, 256, 504, 6);

        // Rivets in corners
        const rivets = [
            [20, 20], [492, 20], [20, 492], [492, 492],
            [20, 240], [492, 240], [20, 272], [492, 272]
        ];
        rivets.forEach(([rx, ry]) => {
            ctx.fillStyle = '#454e56';
            ctx.beginPath();
            ctx.arc(rx, ry, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#111416';
            ctx.beginPath();
            ctx.arc(rx, ry, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // Neon warning stripe
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(30, 252, 452, 8);

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        this.cache.set('wall', tex);
        return tex;
    }

    /**
     * Military Supply Crate with Hazard Stripes
     */
    createCrateTexture() {
        if (this.cache.has('crate')) return this.cache.get('crate');

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Olive drab / military dark green-grey base
        ctx.fillStyle = '#2d332d';
        ctx.fillRect(0, 0, 256, 256);

        // Metal frame border
        ctx.fillStyle = '#1b1e1b';
        ctx.fillRect(0, 0, 256, 16);
        ctx.fillRect(0, 240, 256, 16);
        ctx.fillRect(0, 0, 16, 256);
        ctx.fillRect(240, 0, 16, 256);

        // Cross diagonal braces
        ctx.strokeStyle = '#222622';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(16, 16);
        ctx.lineTo(240, 240);
        ctx.moveTo(240, 16);
        ctx.lineTo(16, 240);
        ctx.stroke();

        // Hazard stripes in center banner
        ctx.save();
        ctx.beginPath();
        ctx.rect(30, 100, 196, 56);
        ctx.clip();
        ctx.fillStyle = '#e5a50a';
        ctx.fillRect(30, 100, 196, 56);
        ctx.fillStyle = '#1a1a1a';
        ctx.lineWidth = 12;
        for (let i = -100; i < 350; i += 24) {
            ctx.beginPath();
            ctx.moveTo(i, 100);
            ctx.lineTo(i + 40, 156);
            ctx.lineTo(i + 24, 156);
            ctx.lineTo(i - 16, 100);
            ctx.fill();
        }
        ctx.restore();

        // Stencil text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SUPPLY CACHE', 128, 190);
        ctx.font = '10px monospace';
        ctx.fillStyle = '#a0a0a0';
        ctx.fillText('CLASS-IV TACTICAL', 128, 206);

        const tex = new THREE.CanvasTexture(canvas);
        this.cache.set('crate', tex);
        return tex;
    }

    /**
     * Corrugated Shipping Container Texture
     */
    createContainerTexture(baseColor = '#d94b26') {
        const key = 'container_' + baseColor;
        if (this.cache.has(key)) return this.cache.get(key);

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, 512, 256);

        // Corrugated vertical ridges with shadow and highlight
        const ridgeWidth = 16;
        for (let x = 0; x < 512; x += ridgeWidth) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.fillRect(x, 0, ridgeWidth * 0.4, 256);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fillRect(x + ridgeWidth * 0.4, 0, ridgeWidth * 0.3, 256);
        }

        // Heavy steel outer rim
        ctx.fillStyle = '#1e2226';
        ctx.fillRect(0, 0, 512, 14);
        ctx.fillRect(0, 242, 512, 14);
        ctx.fillRect(0, 0, 14, 256);
        ctx.fillRect(498, 0, 14, 256);

        // Stenciled container ID
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = 'bold 22px monospace';
        ctx.fillText('SEC-740 // CYBER-SYS', 30, 48);

        const tex = new THREE.CanvasTexture(canvas);
        this.cache.set(key, tex);
        return tex;
    }

    /**
     * Jersey Barricade concrete texture
     */
    createBarricadeTexture() {
        if (this.cache.has('barricade')) return this.cache.get('barricade');

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Grey concrete
        ctx.fillStyle = '#656c73';
        ctx.fillRect(0, 0, 256, 128);

        // Slanted reflective hazard stripe on center
        ctx.fillStyle = '#ff7b00';
        ctx.beginPath();
        ctx.moveTo(60, 0);
        ctx.lineTo(95, 0);
        ctx.lineTo(35, 128);
        ctx.lineTo(0, 128);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(180, 0);
        ctx.lineTo(215, 0);
        ctx.lineTo(155, 128);
        ctx.lineTo(120, 128);
        ctx.fill();

        const tex = new THREE.CanvasTexture(canvas);
        this.cache.set('barricade', tex);
        return tex;
    }

    /**
     * Particle textures (Sparks, Blood, Smoke, Muzzle)
     */
    createSparkTexture() {
        if (this.cache.has('spark')) return this.cache.get('spark');

        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.2, '#ffdd44');
        grad.addColorStop(0.6, '#ff6600');
        grad.addColorStop(1, 'rgba(255, 60, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(32, 32, 32, 0, Math.PI * 2);
        ctx.fill();

        const tex = new THREE.CanvasTexture(canvas);
        this.cache.set('spark', tex);
        return tex;
    }

    createBloodTexture() {
        if (this.cache.has('blood')) return this.cache.get('blood');

        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
        grad.addColorStop(0, '#ff1122');
        grad.addColorStop(0.4, '#aa0510');
        grad.addColorStop(0.8, '#550005');
        grad.addColorStop(1, 'rgba(80, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(32, 32, 30, 0, Math.PI * 2);
        ctx.fill();

        const tex = new THREE.CanvasTexture(canvas);
        this.cache.set('blood', tex);
        return tex;
    }

    createSmokeTexture() {
        if (this.cache.has('smoke')) return this.cache.get('smoke');

        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(200, 205, 210, 0.45)');
        grad.addColorStop(0.5, 'rgba(150, 155, 160, 0.2)');
        grad.addColorStop(1, 'rgba(100, 100, 100, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(32, 32, 32, 0, Math.PI * 2);
        ctx.fill();

        const tex = new THREE.CanvasTexture(canvas);
        this.cache.set('smoke', tex);
        return tex;
    }
}

// Global singleton
window.Textures = new TextureGenerator();
