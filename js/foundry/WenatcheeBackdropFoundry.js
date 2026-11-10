import * as THREE from 'three';

/**
 * WenatcheeBackdropFoundry — 360° Wenatchee Valley Foothills, Saddle Rock,
 * Columbia River Basalt Cliffs & Cascade Mountain Horizon Panorama +
 * Museum-Grade Dark Digital-Twin Showcase Sky Dome
 *
 * Provides three instant "Wow-Factor" background modes:
 *   1. 'foothills-day'   — Crisp Wenatchee blue sky + 3-layer 3D Saddle Rock,
 *                          Burch Mountain, Basalt Cliffs & snow-capped Cascades
 *   2. 'golden-hour'     — 5:45 PM Sunset over Saddle Rock with warm amber alpenglow,
 *                          long architectural shadows & softly lit building windows
 *   3. 'dark-showcase'   — Executive Digital-Twin Showcase: deep radial indigo-slate
 *                          vignette dome, subtle starfield, glowing horizon rim behind
 *                          silhouetted Wenatchee mountains, and illuminated campus windows
 */
export class WenatcheeBackdropFoundry {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.name = 'WenatcheeBackdropPanorama';
        this.mode = 'foothills-day';

        this.nearRingMat = null;
        this.midRingMat = null;
        this.farRingMat = null;
        this.showcaseDomeMat = null;
        this.showcaseDomeMesh = null;
        this.cloudFarMat = null;
        this.cloudNearMat = null;
        this.cloudFarCyl = null;
        this.cloudNearCyl = null;
        this.horizonCloudBanksGroup = null;
        this.horizonCloudBankMat = null;
        this.horizonCloudBanks = [];
        this.elapsedTime = 0;

        this._buildBackdrop();
        this.scene.add(this.group);
    }

    _buildBackdrop() {
        // 1. Dark Digital-Twin Showcase & Night Starfield Sky Dome (R = 3600m)
        const domeGeo = new THREE.SphereGeometry(3600, 48, 32);
        this.showcaseDomeMat = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            depthWrite: false,
            transparent: true,
            uniforms: {
                uTopColor: { value: new THREE.Color('#050914') },
                uMidColor: { value: new THREE.Color('#0d192b') },
                uHorizonColor: { value: new THREE.Color('#1e3352') },
                uWarmGlowColor: { value: new THREE.Color('#3b2d4a') },
                uSunAzimuth: { value: new THREE.Vector2(-0.7, -0.7) },
                uOpacity: { value: 0.0 },
                uStarIntensity: { value: 0.85 }
            },
            vertexShader: `
                varying vec3 vWorldPos;
                void main() {
                    vec4 wp = modelMatrix * vec4(position, 1.0);
                    vWorldPos = wp.xyz;
                    gl_Position = projectionMatrix * viewMatrix * wp;
                }
            `,
            fragmentShader: `
                varying vec3 vWorldPos;
                uniform vec3 uTopColor;
                uniform vec3 uMidColor;
                uniform vec3 uHorizonColor;
                uniform vec3 uWarmGlowColor;
                uniform vec2 uSunAzimuth;
                uniform float uOpacity;
                uniform float uStarIntensity;

                float hash(vec3 p) {
                    p = fract(p * 0.3183099 + 0.1);
                    p *= 17.0;
                    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
                }

                void main() {
                    vec3 dir = normalize(vWorldPos);
                    float h = clamp(dir.y, 0.0, 1.0);

                    // Smooth architectural vignette gradient from horizon to zenith
                    vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.28, h));
                    col = mix(col, uTopColor, smoothstep(0.22, 0.85, h));

                    // Directional warm sunset/dusk horizon glow toward western foothills
                    vec2 horizDir = normalize(dir.xz + vec2(0.0001));
                    float sunAlign = max(0.0, dot(horizDir, normalize(uSunAzimuth)));
                    float rimGlow = pow(sunAlign, 2.5) * (1.0 - smoothstep(0.0, 0.32, h));
                    col = mix(col, uWarmGlowColor, rimGlow * 0.65);

                    // Subtle crisp starfield in upper sky dome
                    if (uStarIntensity > 0.01 && h > 0.08) {
                        vec3 starCell = floor(dir * 420.0);
                        float s = hash(starCell);
                        if (s > 0.9965) {
                            float brightness = smoothstep(0.9965, 1.0, s) * smoothstep(0.08, 0.35, h);
                            col += vec3(0.85, 0.92, 1.0) * brightness * uStarIntensity * 1.35;
                        }
                    }

                    gl_FragColor = vec4(col, uOpacity);
                }
            `
        });
        this.showcaseDomeMesh = new THREE.Mesh(domeGeo, this.showcaseDomeMat);
        this.showcaseDomeMesh.renderOrder = -12;
        this.group.add(this.showcaseDomeMesh);

        // 2. Distant High Cascades & Enchantments Snow-Capped Silhouette Ring (R = 2950m)
        const farTex = this._createMountainPanoramaTexture('far');
        this.farRingMat = new THREE.MeshBasicMaterial({
            map: farTex,
            transparent: true,
            side: THREE.BackSide,
            depthWrite: false,
            fog: false
        });
        const farCyl = new THREE.Mesh(
            new THREE.CylinderGeometry(2950, 2950, 920, 128, 1, true),
            this.farRingMat
        );
        farCyl.position.y = 360;
        farCyl.renderOrder = -10;
        this.group.add(farCyl);

        // 2b. High-Altitude Horizon Stratocumulus Cloud Ring (R = 2740m, slowly drifting behind midground ridges)
        const cloudFarTex = this._createHorizonCloudPanoramaTexture('far');
        this.cloudFarMat = new THREE.MeshBasicMaterial({
            map: cloudFarTex,
            transparent: true,
            opacity: 0.88,
            side: THREE.BackSide,
            depthWrite: false,
            fog: false
        });
        this.cloudFarCyl = new THREE.Mesh(
            new THREE.CylinderGeometry(2740, 2740, 580, 128, 1, true),
            this.cloudFarMat
        );
        this.cloudFarCyl.position.y = 305;
        this.cloudFarCyl.renderOrder = -9;
        this.group.add(this.cloudFarCyl);

        // 3. Midground Burch Mountain & Columbia Basalt Escarpment Ring (R = 2550m)
        const midTex = this._createMountainPanoramaTexture('mid');
        this.midRingMat = new THREE.MeshBasicMaterial({
            map: midTex,
            transparent: true,
            side: THREE.BackSide,
            depthWrite: false,
            fog: false
        });
        const midCyl = new THREE.Mesh(
            new THREE.CylinderGeometry(2550, 2550, 680, 128, 1, true),
            this.midRingMat
        );
        midCyl.position.y = 245;
        midCyl.renderOrder = -8;
        this.group.add(midCyl);

        // 4. Foreground Wenatchee Shrub-Steppe Foothills & Iconic Saddle Rock Twin Pinnacles (R = 2200m)
        const nearTex = this._createMountainPanoramaTexture('near');
        this.nearRingMat = new THREE.MeshBasicMaterial({
            map: nearTex,
            transparent: true,
            side: THREE.BackSide,
            depthWrite: false,
            fog: false
        });
        const nearCyl = new THREE.Mesh(
            new THREE.CylinderGeometry(2200, 2200, 480, 128, 1, true),
            this.nearRingMat
        );
        nearCyl.position.y = 150;
        nearCyl.renderOrder = -7;
        this.group.add(nearCyl);

        // 5. Lower Horizon Valley Cumulus Cloud Ring (R = 2040m, slowly drifting along the foothills horizon)
        const cloudNearTex = this._createHorizonCloudPanoramaTexture('near');
        this.cloudNearMat = new THREE.MeshBasicMaterial({
            map: cloudNearTex,
            transparent: true,
            opacity: 0.92,
            side: THREE.BackSide,
            depthWrite: false,
            fog: false
        });
        this.cloudNearCyl = new THREE.Mesh(
            new THREE.CylinderGeometry(2040, 2040, 440, 128, 1, true),
            this.cloudNearMat
        );
        this.cloudNearCyl.position.y = 175;
        this.cloudNearCyl.renderOrder = -6;
        this.group.add(this.cloudNearCyl);

        // 6. 3D Soft Volumetric-Style Horizon Cloud Banks (R = 1600m .. 1920m) for multi-depth horizon parallax
        this._buildHorizonCloudBanks();
    }

    /**
     * Generates a seamless 2048x512 procedural panorama texture profiling:
     * - Saddle Rock's twin craggy basalt spires to the SW
     * - Burch Mountain & Wenatchee River confluence to the NW
     * - Columbia River Basalt Plateau cliffs to the East
     * - Snow-capped High Cascades & Enchantments to the West
     */
    _createMountainPanoramaTexture(layer) {
        const w = 2048;
        const h = 512;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);

        const ridgeY = new Float32Array(w);

        for (let x = 0; x < w; x++) {
            const u = x / w; // 0..1 around 360° horizon
            const ang = u * Math.PI * 2.0;

            if (layer === 'far') {
                // High Cascades & Enchantment Peaks concentrated in West/NW (u ≈ 0.55..0.92)
                const westWeight = Math.pow(Math.max(0, Math.cos(ang - 4.4)), 1.6);
                const jagged =
                    Math.sin(ang * 7.0) * 0.28 +
                    Math.sin(ang * 15.0 + 1.2) * 0.18 +
                    Math.cos(ang * 31.0 - 0.7) * 0.11 +
                    Math.abs(Math.sin(ang * 47.0)) * 0.09;
                const normH = 0.22 + westWeight * 0.44 + jagged * (0.25 + westWeight * 0.35);
                ridgeY[x] = h * (1.0 - THREE.MathUtils.clamp(normH, 0.12, 0.88));
            } else if (layer === 'mid') {
                // Burch Mountain (NW) & Waterville Basalt Plateau (East)
                const burchBump = Math.exp(-Math.pow(((u - 0.82 + 1.0) % 1.0) - 0.5, 2) * 28.0) * 0.32;
                const eastPlateau = Math.exp(-Math.pow(((u - 0.28 + 1.0) % 1.0) - 0.5, 2) * 18.0) * 0.26;
                const rolling =
                    Math.sin(ang * 5.0 + 0.4) * 0.14 +
                    Math.cos(ang * 11.0 - 1.1) * 0.09 +
                    Math.sin(ang * 23.0) * 0.04;
                const normH = 0.26 + burchBump + eastPlateau + rolling;
                ridgeY[x] = h * (1.0 - THREE.MathUtils.clamp(normH, 0.14, 0.78));
            } else {
                // Foreground Wenatchee Foothills + Iconic Saddle Rock Twin Spires at SW (u ≈ 0.62)
                const dSaddle1 = (u - 0.612);
                const dSaddle2 = (u - 0.628);
                const saddleSpire1 = Math.exp(-(dSaddle1 * dSaddle1) * 4200.0) * 0.34;
                const saddleSpire2 = Math.exp(-(dSaddle2 * dSaddle2) * 4800.0) * 0.31;
                const saddleSaddle = Math.exp(-Math.pow(u - 0.620, 2) * 850.0) * 0.22;
                const hills =
                    Math.sin(ang * 4.0 + 1.7) * 0.12 +
                    Math.cos(ang * 9.0 - 0.5) * 0.08 +
                    Math.sin(ang * 19.0 + 0.9) * 0.035;
                const normH = 0.24 + Math.max(saddleSpire1 + saddleSpire2, saddleSaddle) + hills;
                ridgeY[x] = h * (1.0 - THREE.MathUtils.clamp(normH, 0.12, 0.76));
            }
        }

        // Fill silhouette body with vertical atmospheric gradient
        const grad = ctx.createLinearGradient(0, h * 0.15, 0, h);
        if (layer === 'far') {
            grad.addColorStop(0.0, 'rgba(218, 230, 245, 0.92)'); // Snow-dusted Cascade peaks
            grad.addColorStop(0.28, 'rgba(138, 162, 194, 0.88)');
            grad.addColorStop(0.68, 'rgba(104, 128, 162, 0.72)');
            grad.addColorStop(1.0, 'rgba(145, 168, 196, 0.0)');
        } else if (layer === 'mid') {
            grad.addColorStop(0.0, 'rgba(126, 138, 148, 0.94)'); // Basalt & pine midground ridge
            grad.addColorStop(0.45, 'rgba(106, 118, 128, 0.86)');
            grad.addColorStop(0.82, 'rgba(122, 134, 142, 0.45)');
            grad.addColorStop(1.0, 'rgba(122, 134, 142, 0.0)');
        } else {
            grad.addColorStop(0.0, 'rgba(166, 144, 108, 0.96)'); // Warm Wenatchee golden-sage foothills
            grad.addColorStop(0.42, 'rgba(138, 122, 92, 0.90)');
            grad.addColorStop(0.78, 'rgba(116, 106, 84, 0.50)');
            grad.addColorStop(1.0, 'rgba(116, 106, 84, 0.0)');
        }

        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x < w; x++) {
            ctx.lineTo(x, ridgeY[x]);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Crisp sunlit ridgeline rim highlight along the crest of the mountains
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
            if (x === 0) ctx.moveTo(x, ridgeY[x]);
            else ctx.lineTo(x, ridgeY[x]);
        }
        ctx.strokeStyle =
            layer === 'far'
                ? 'rgba(248, 252, 255, 0.65)'
                : layer === 'mid'
                ? 'rgba(215, 224, 235, 0.35)'
                : 'rgba(232, 206, 162, 0.42)';
        ctx.lineWidth = layer === 'far' ? 2.5 : 2.0;
        ctx.stroke();

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        return tex;
    }

    /**
     * Generates a seamless 2048x512 procedural horizon cloud panorama texture with
     * sunlit cumulus domes, soft silver-blue undersides, and wispy trailing edges.
     */
    _createHorizonCloudPanoramaTexture(layer) {
        const w = 2048;
        const h = 512;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);

        // Deterministic PRNG so cloud formations are rich and seamless across the 360° wrap
        let seed = layer === 'far' ? 1337 : 7919;
        const rand = () => {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        };

        const drawSeamlessPuff = (uCenter, yCenter, rx, ry, innerCol, midCol, outerCol) => {
            for (const offset of [-1, 0, 1]) {
                const cx = (uCenter + offset) * w;
                if (cx + rx < 0 || cx - rx > w) continue;

                ctx.save();
                ctx.translate(cx, yCenter);
                ctx.scale(rx, ry);
                const g = ctx.createRadialGradient(0, -0.15, 0.05, 0, 0, 1.0);
                g.addColorStop(0.0, innerCol);
                g.addColorStop(0.52, midCol);
                g.addColorStop(1.0, outerCol);
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(0, 0, 1.0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        };

        const bankCount = layer === 'far' ? 11 : 9;
        for (let b = 0; b < bankCount; b++) {
            const uBase = (b + 0.18 + rand() * 0.64) / bankCount;
            const yBase = layer === 'far' ? h * (0.42 + rand() * 0.20) : h * (0.48 + rand() * 0.18);
            const bankSpanU = (layer === 'far' ? 0.055 : 0.068) * (0.75 + rand() * 0.55);

            // 1. Soft atmospheric cloud underbelly shadow
            const shadowPuffs = 5 + Math.floor(rand() * 4);
            for (let p = 0; p < shadowPuffs; p++) {
                const t = shadowPuffs > 1 ? p / (shadowPuffs - 1) - 0.5 : 0;
                const u = (uBase + t * bankSpanU + 1.0) % 1.0;
                const rx = w * (0.016 + rand() * 0.018);
                const ry = h * (0.055 + rand() * 0.045);
                const py = yBase + h * (0.035 + rand() * 0.025);
                drawSeamlessPuff(
                    u,
                    py,
                    rx,
                    ry,
                    'rgba(203, 218, 238, 0.52)',
                    'rgba(216, 228, 244, 0.28)',
                    'rgba(226, 236, 248, 0.0)'
                );
            }

            // 2. Billowing sunlit cumulus cauliflower domes rising above the base
            const domeCount = 7 + Math.floor(rand() * 6);
            for (let d = 0; d < domeCount; d++) {
                const t = domeCount > 1 ? d / (domeCount - 1) - 0.5 : 0;
                const arch = Math.cos(t * Math.PI * 0.92);
                const u = (uBase + t * bankSpanU * 0.92 + (rand() - 0.5) * 0.008 + 1.0) % 1.0;
                const rx = w * (0.014 + arch * 0.018 + rand() * 0.010);
                const ry = h * (0.065 + arch * 0.095 + rand() * 0.045);
                const py = yBase - arch * h * 0.085 + (rand() - 0.5) * h * 0.025;
                drawSeamlessPuff(
                    u,
                    py,
                    rx,
                    ry,
                    'rgba(255, 255, 255, 0.92)',
                    'rgba(248, 252, 255, 0.56)',
                    'rgba(240, 248, 255, 0.0)'
                );
            }
        }

        // 3. Delicate high-altitude wispy altocumulus streaks along the horizon
        const streakCount = layer === 'far' ? 16 : 10;
        for (let s = 0; s < streakCount; s++) {
            const u = rand();
            const py = h * (0.24 + rand() * 0.32);
            const rx = w * (0.028 + rand() * 0.035);
            const ry = h * (0.018 + rand() * 0.022);
            drawSeamlessPuff(
                u,
                py,
                rx,
                ry,
                'rgba(255, 255, 255, 0.48)',
                'rgba(245, 250, 255, 0.22)',
                'rgba(240, 248, 255, 0.0)'
            );
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        return tex;
    }

    /**
     * Generates a soft sunlit 3D cumulus cloud-bank billboard texture (512x256).
     */
    _createSingleCloudBankTexture() {
        const w = 512;
        const h = 256;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);

        const puffs = [
            // Soft silver-blue base puffs
            { x: 0.28, y: 0.66, rx: 0.20, ry: 0.18, c0: 'rgba(206, 220, 238, 0.55)', c1: 'rgba(220, 232, 246, 0.0)' },
            { x: 0.50, y: 0.68, rx: 0.26, ry: 0.19, c0: 'rgba(198, 214, 234, 0.60)', c1: 'rgba(218, 230, 245, 0.0)' },
            { x: 0.72, y: 0.66, rx: 0.20, ry: 0.18, c0: 'rgba(206, 220, 238, 0.55)', c1: 'rgba(220, 232, 246, 0.0)' },
            // Sunlit snow-white upper cumulus domes
            { x: 0.24, y: 0.56, rx: 0.18, ry: 0.22, c0: 'rgba(255, 255, 255, 0.88)', c1: 'rgba(255, 255, 255, 0.0)' },
            { x: 0.38, y: 0.46, rx: 0.22, ry: 0.28, c0: 'rgba(255, 255, 255, 0.95)', c1: 'rgba(255, 255, 255, 0.0)' },
            { x: 0.52, y: 0.40, rx: 0.25, ry: 0.32, c0: 'rgba(255, 255, 255, 0.98)', c1: 'rgba(255, 255, 255, 0.0)' },
            { x: 0.66, y: 0.48, rx: 0.21, ry: 0.26, c0: 'rgba(255, 255, 255, 0.92)', c1: 'rgba(255, 255, 255, 0.0)' },
            { x: 0.78, y: 0.58, rx: 0.16, ry: 0.20, c0: 'rgba(255, 255, 255, 0.84)', c1: 'rgba(255, 255, 255, 0.0)' }
        ];

        for (const p of puffs) {
            ctx.save();
            ctx.translate(p.x * w, p.y * h);
            ctx.scale(p.rx * w, p.ry * h);
            const g = ctx.createRadialGradient(0, -0.12, 0.04, 0, 0, 1.0);
            g.addColorStop(0.0, p.c0);
            g.addColorStop(0.55, p.c0.replace(/0\.\d+\)$/, '0.45)'));
            g.addColorStop(1.0, p.c1);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, 1.0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    /**
     * Builds 14 soft 3D horizon cumulus cloud banks around the valley rim (R = 1620m .. 1940m)
     * that slowly drift along the horizon for multi-plane depth and parallax.
     */
    _buildHorizonCloudBanks() {
        this.horizonCloudBanksGroup = new THREE.Group();
        this.horizonCloudBanksGroup.name = 'WenatcheeHorizonCloudBanks';
        this.group.add(this.horizonCloudBanksGroup);

        const cloudBankTex = this._createSingleCloudBankTexture();
        this.horizonCloudBankMat = new THREE.MeshBasicMaterial({
            map: cloudBankTex,
            transparent: true,
            opacity: 0.86,
            side: THREE.DoubleSide,
            depthWrite: false,
            fog: false
        });

        const count = 14;
        const planeGeo = new THREE.PlaneGeometry(1, 1);

        for (let i = 0; i < count; i++) {
            const baseAngle = (i / count) * Math.PI * 2 + (i % 3) * 0.09;
            const radius = 1640 + (i % 4) * 75;
            const baseY = 128 + (i % 3) * 34;
            const width = 420 + (i % 5) * 65;
            const height = width * 0.44;
            const angularSpeed = 0.0055 + (i % 4) * 0.0012; // Gentle slow horizon drift

            const mesh = new THREE.Mesh(planeGeo, this.horizonCloudBankMat);
            mesh.scale.set(width, height, 1);
            mesh.renderOrder = -5;
            this.horizonCloudBanksGroup.add(mesh);

            this.horizonCloudBanks.push({
                mesh,
                angle: baseAngle,
                radius,
                baseY,
                angularSpeed,
                bobPhase: i * 1.37
            });
        }

        this._syncHorizonCloudBanksPositions();
    }

    _syncHorizonCloudBanksPositions() {
        for (let i = 0; i < this.horizonCloudBanks.length; i++) {
            const b = this.horizonCloudBanks[i];
            const x = Math.cos(b.angle) * b.radius;
            const z = Math.sin(b.angle) * b.radius;
            const y = b.baseY + Math.sin(this.elapsedTime * 0.25 + b.bobPhase) * 4.5;
            b.mesh.position.set(x, y, z);
            b.mesh.lookAt(0, y * 0.85, 0);
        }
    }

    /**
     * Animates the slow-moving horizon cloud rings and 3D horizon cumulus banks.
     */
    update(dt, reducedMotion = false) {
        if (reducedMotion || !(dt > 0)) return;
        this.elapsedTime += dt;

        // Slowly rotate the two panoramic horizon cloud cylinders at different speeds for parallax
        if (this.cloudFarCyl) {
            this.cloudFarCyl.rotation.y = (this.cloudFarCyl.rotation.y + dt * 0.0038) % (Math.PI * 2);
        }
        if (this.cloudNearCyl) {
            this.cloudNearCyl.rotation.y = (this.cloudNearCyl.rotation.y + dt * 0.0064) % (Math.PI * 2);
        }

        // Slowly drift the individual 3D horizon cumulus cloud banks along the valley horizon
        for (let i = 0; i < this.horizonCloudBanks.length; i++) {
            const b = this.horizonCloudBanks[i];
            b.angle = (b.angle + dt * b.angularSpeed) % (Math.PI * 2);
        }
        this._syncHorizonCloudBanksPositions();
    }

    /**
     * Updates the mountain panorama & sky dome colors dynamically based on sun elevation,
     * golden hour, and Dark Digital-Twin Showcase mode.
     */
    updateAtmosphere({ elevationDeg = 42, nightFactor = 0, darkShowcase = false, sunPos = null }) {
        const isGoldenHour = !darkShowcase && elevationDeg > -2 && elevationDeg < 18;

        if (this.showcaseDomeMat) {
            if (darkShowcase) {
                this.showcaseDomeMat.uniforms.uTopColor.value.set('#050a14');
                this.showcaseDomeMat.uniforms.uMidColor.value.set('#0e1b30');
                this.showcaseDomeMat.uniforms.uHorizonColor.value.set('#1f385c');
                this.showcaseDomeMat.uniforms.uWarmGlowColor.value.set('#38bdf8');
                this.showcaseDomeMat.uniforms.uOpacity.value = 1.0;
                this.showcaseDomeMat.uniforms.uStarIntensity.value = 0.90;
            } else if (nightFactor > 0.35) {
                this.showcaseDomeMat.uniforms.uTopColor.value.set('#060b17');
                this.showcaseDomeMat.uniforms.uMidColor.value.set('#101c33');
                this.showcaseDomeMat.uniforms.uHorizonColor.value.set('#263859');
                this.showcaseDomeMat.uniforms.uWarmGlowColor.value.set('#d97736');
                this.showcaseDomeMat.uniforms.uOpacity.value = 0.96;
                this.showcaseDomeMat.uniforms.uStarIntensity.value = nightFactor;
            } else if (isGoldenHour) {
                // Rich twilight indigo zenith -> warm rose-violet mid -> glowing amber sunset horizon
                this.showcaseDomeMat.uniforms.uTopColor.value.set('#1a274d');
                this.showcaseDomeMat.uniforms.uMidColor.value.set('#5e4368');
                this.showcaseDomeMat.uniforms.uHorizonColor.value.set('#eb985b');
                this.showcaseDomeMat.uniforms.uWarmGlowColor.value.set('#ffd166');
                this.showcaseDomeMat.uniforms.uOpacity.value = 0.92;
                this.showcaseDomeMat.uniforms.uStarIntensity.value = 0.12;
            } else {
                // Deep Wenatchee blue sky dome gradient from zenith to valley horizon
                this.showcaseDomeMat.uniforms.uTopColor.value.set('#184382');
                this.showcaseDomeMat.uniforms.uMidColor.value.set('#3e78c2');
                this.showcaseDomeMat.uniforms.uHorizonColor.value.set('#b8d6f5');
                this.showcaseDomeMat.uniforms.uWarmGlowColor.value.set('#ffe8ba');
                this.showcaseDomeMat.uniforms.uOpacity.value = 0.94;
                this.showcaseDomeMat.uniforms.uStarIntensity.value = 0.0;
            }
            if (sunPos) {
                this.showcaseDomeMat.uniforms.uSunAzimuth.value.set(sunPos.x, sunPos.z);
            }
            this.showcaseDomeMesh.visible = true;
        }

        // Tint the 3-layer Wenatchee Foothills & Saddle Rock rings to match Day, Golden Hour, or Dark Showcase
        if (darkShowcase || nightFactor > 0.55) {
            this.nearRingMat.color.set('#1b2d48');
            this.midRingMat.color.set('#15243b');
            this.farRingMat.color.set('#1d3354');
            if (this.cloudFarMat) {
                this.cloudFarMat.color.set('#2b4263');
                this.cloudFarMat.opacity = 0.34;
            }
            if (this.cloudNearMat) {
                this.cloudNearMat.color.set('#253957');
                this.cloudNearMat.opacity = 0.38;
            }
            if (this.horizonCloudBankMat) {
                this.horizonCloudBankMat.color.set('#2c4466');
                this.horizonCloudBankMat.opacity = 0.35;
            }
        } else if (isGoldenHour) {
            this.nearRingMat.color.set('#d99b66');
            this.midRingMat.color.set('#a8727c');
            this.farRingMat.color.set('#e0a890');
            if (this.cloudFarMat) {
                this.cloudFarMat.color.set('#fed7aa');
                this.cloudFarMat.opacity = 0.85;
            }
            if (this.cloudNearMat) {
                this.cloudNearMat.color.set('#ffedd5');
                this.cloudNearMat.opacity = 0.88;
            }
            if (this.horizonCloudBankMat) {
                this.horizonCloudBankMat.color.set('#fde68a');
                this.horizonCloudBankMat.opacity = 0.82;
            }
        } else {
            this.nearRingMat.color.set('#f5efe6');
            this.midRingMat.color.set('#e2ebf5');
            this.farRingMat.color.set('#ffffff');
            if (this.cloudFarMat) {
                this.cloudFarMat.color.set('#ffffff');
                this.cloudFarMat.opacity = 0.88;
            }
            if (this.cloudNearMat) {
                this.cloudNearMat.color.set('#ffffff');
                this.cloudNearMat.opacity = 0.92;
            }
            if (this.horizonCloudBankMat) {
                this.horizonCloudBankMat.color.set('#ffffff');
                this.horizonCloudBankMat.opacity = 0.86;
            }
        }
    }
}
