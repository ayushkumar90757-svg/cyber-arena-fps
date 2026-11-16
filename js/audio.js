/**
 * Cyber Arena: Zero Hour - Procedural Web Audio Engine
 * Zero external audio assets required. All sounds synthesized in real-time.
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.isMuted = false;
        this.volume = 0.7;
        this.initialized = false;

        // Auto-initialize on first user gesture
        this._bindUnlock();
    }

    _bindUnlock() {
        const unlock = () => {
            this.init();
            window.removeEventListener('click', unlock);
            window.removeEventListener('keydown', unlock);
            window.removeEventListener('touchstart', unlock);
        };
        window.addEventListener('click', unlock, { once: true });
        window.addEventListener('keydown', unlock, { once: true });
        window.addEventListener('touchstart', unlock, { once: true });
    }

    init() {
        if (this.initialized) {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
            return;
        }

        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) {
                console.warn('Web Audio API not supported in this browser.');
                return;
            }

            this.ctx = new AudioCtx();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
            this.sfxGain.connect(this.masterGain);

            this.initialized = true;
        } catch (e) {
            console.error('Failed to initialize Web Audio Engine:', e);
        }
    }

    setVolume(val) {
        this.volume = Math.max(0, Math.min(1, val));
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.setVolume(this.volume);
        return this.isMuted;
    }

    // Helper: generate buffer of white noise
    _createNoiseBuffer(duration = 0.5) {
        if (!this.ctx) return null;
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    /**
     * Weapon gunfire synthesis
     */
    playShoot(type = 'ar') {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;

        try {
            if (type === 'ar') {
                // Viper AR-47: Punchy mid-high attack with rapid decay
                const osc = this.ctx.createOscillator();
                const oscGain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(260, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.1);
                oscGain.gain.setValueAtTime(0.4, now);
                oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.connect(oscGain);
                oscGain.connect(this.sfxGain);
                osc.start(now);
                osc.stop(now + 0.1);

                // Transient noise punch
                const noiseBuf = this._createNoiseBuffer(0.08);
                if (noiseBuf) {
                    const noise = this.ctx.createBufferSource();
                    noise.buffer = noiseBuf;
                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'bandpass';
                    filter.frequency.value = 1600;
                    filter.Q.value = 2;
                    const noiseGain = this.ctx.createGain();
                    noiseGain.gain.setValueAtTime(0.6, now);
                    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                    noise.connect(filter);
                    filter.connect(noiseGain);
                    noiseGain.connect(this.sfxGain);
                    noise.start(now);
                }
            } else if (type === 'shotgun') {
                // Bulldog 12G: Heavy sub-bass boom + wide noise blast
                const sub = this.ctx.createOscillator();
                const subGain = this.ctx.createGain();
                sub.type = 'triangle';
                sub.frequency.setValueAtTime(140, now);
                sub.frequency.exponentialRampToValueAtTime(25, now + 0.28);
                subGain.gain.setValueAtTime(0.7, now);
                subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
                sub.connect(subGain);
                subGain.connect(this.sfxGain);
                sub.start(now);
                sub.stop(now + 0.28);

                const noiseBuf = this._createNoiseBuffer(0.24);
                if (noiseBuf) {
                    const noise = this.ctx.createBufferSource();
                    noise.buffer = noiseBuf;
                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(2200, now);
                    filter.frequency.exponentialRampToValueAtTime(200, now + 0.24);
                    const noiseGain = this.ctx.createGain();
                    noiseGain.gain.setValueAtTime(0.8, now);
                    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
                    noise.connect(filter);
                    filter.connect(noiseGain);
                    noiseGain.connect(this.sfxGain);
                    noise.start(now);
                }
            } else if (type === 'sniper') {
                // Shadow .50 Cal: Supersonic crack + thunderous low tail
                const crack = this.ctx.createOscillator();
                const crackGain = this.ctx.createGain();
                crack.type = 'square';
                crack.frequency.setValueAtTime(1600, now);
                crack.frequency.exponentialRampToValueAtTime(70, now + 0.12);
                crackGain.gain.setValueAtTime(0.5, now);
                crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                crack.connect(crackGain);
                crackGain.connect(this.sfxGain);
                crack.start(now);
                crack.stop(now + 0.12);

                const boom = this.ctx.createOscillator();
                const boomGain = this.ctx.createGain();
                boom.type = 'sine';
                boom.frequency.setValueAtTime(90, now);
                boom.frequency.exponentialRampToValueAtTime(20, now + 0.45);
                boomGain.gain.setValueAtTime(0.8, now);
                boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
                boom.connect(boomGain);
                boomGain.connect(this.sfxGain);
                boom.start(now);
                boom.stop(now + 0.45);

                const noiseBuf = this._createNoiseBuffer(0.4);
                if (noiseBuf) {
                    const noise = this.ctx.createBufferSource();
                    noise.buffer = noiseBuf;
                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.value = 800;
                    const noiseGain = this.ctx.createGain();
                    noiseGain.gain.setValueAtTime(0.6, now);
                    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                    noise.connect(filter);
                    filter.connect(noiseGain);
                    noiseGain.connect(this.sfxGain);
                    noise.start(now);
                }
            }
        } catch (e) {
            console.warn('Error playing gunshot audio:', e);
        }
    }

    /**
     * Hit marker feedback (body vs headshot)
     */
    playHit(isHeadshot = false) {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;

        try {
            if (isHeadshot) {
                // Crisp dual-tone metallic "CLINK"
                [1900, 2600].forEach(freq => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now);
                    gain.gain.setValueAtTime(0.35, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                    osc.connect(gain);
                    gain.connect(this.sfxGain);
                    osc.start(now);
                    osc.stop(now + 0.22);
                });
            } else {
                // Snappy body hit marker tick
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(950, now);
                osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(now);
                osc.stop(now + 0.08);
            }
        } catch (e) {
            console.warn('Error playing hit audio:', e);
        }
    }

    /**
     * Empty magazine dry fire click
     */
    playDryFire() {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.03);
        } catch (e) {}
    }

    /**
     * Reload mechanical animations
     */
    playReload(step = 'mag_out') {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        try {
            if (step === 'mag_out') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(450, now);
                osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                osc.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (step === 'mag_in') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(320, now);
                osc.frequency.setValueAtTime(540, now + 0.04);
                gain.gain.setValueAtTime(0.35, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
                osc.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(now);
                osc.stop(now + 0.14);
            } else if (step === 'cock') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(700, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.09);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
                osc.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(now);
                osc.stop(now + 0.09);
            }
        } catch (e) {}
    }

    /**
     * Footstep sound
     */
    playFootstep() {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        try {
            const noiseBuf = this._createNoiseBuffer(0.06);
            if (!noiseBuf) return;
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuf;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 350 + Math.random() * 80;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            noise.start(now);
        } catch (e) {}
    }

    /**
     * Jump and Land
     */
    playJump() {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(260, now + 0.15);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.15);
        } catch (e) {}
    }

    playLand() {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(90, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.18);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.18);
        } catch (e) {}
    }

    /**
     * Pickups
     */
    playPickup(type = 'health') {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        try {
            if (type === 'health') {
                // Rising arpeggio
                [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + i * 0.05);
                    gain.gain.setValueAtTime(0.25, now + i * 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);
                    osc.connect(gain);
                    gain.connect(this.sfxGain);
                    osc.start(now + i * 0.05);
                    osc.stop(now + i * 0.05 + 0.15);
                });
            } else {
                // Ammo: double metallic ratchet
                [600, 900].forEach((freq, i) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + i * 0.07);
                    gain.gain.setValueAtTime(0.3, now + i * 0.07);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.1);
                    osc.connect(gain);
                    gain.connect(this.sfxGain);
                    osc.start(now + i * 0.07);
                    osc.stop(now + i * 0.07 + 0.1);
                });
            }
        } catch (e) {}
    }

    /**
     * Player damage / hurt
     */
    playHurt() {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.18);
        } catch (e) {}
    }

    /**
     * Kill confirmation ding
     */
    playKillDing() {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        try {
            [1200, 1600].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.04);
                gain.gain.setValueAtTime(0.3, now + idx * 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.25);
                osc.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(now + idx * 0.04);
                osc.stop(now + idx * 0.04 + 0.25);
            });
        } catch (e) {}
    }

    /**
     * Victory & Defeat Stems
     */
    playFanfare(isVictory = true) {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        try {
            if (isVictory) {
                // Victorious fanfare: G4 -> C5 -> E5 -> G5
                const notes = [392.00, 523.25, 659.25, 783.99];
                notes.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.14);
                    const dur = idx === notes.length - 1 ? 0.8 : 0.2;
                    gain.gain.setValueAtTime(0.3, now + idx * 0.14);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + dur);
                    osc.connect(gain);
                    gain.connect(this.sfxGain);
                    osc.start(now + idx * 0.14);
                    osc.stop(now + idx * 0.14 + dur);
                });
            } else {
                // Defeat drop: C4 -> B3 -> Bb3 -> A3
                const notes = [261.63, 246.94, 233.08, 220.00];
                notes.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.2);
                    const dur = idx === notes.length - 1 ? 0.9 : 0.25;
                    gain.gain.setValueAtTime(0.35, now + idx * 0.2);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.2 + dur);
                    osc.connect(gain);
                    gain.connect(this.sfxGain);
                    osc.start(now + idx * 0.2);
                    osc.stop(now + idx * 0.2 + dur);
                });
            }
        } catch (e) {}
    }
}

// Global singleton
window.Sound = new SoundEngine();
