import * as THREE from 'three';

/**
 * ChelanWelcomeBillboard
 *
 * Pure floating sky typography ("WELCOME TO CHELAN COUNTY") — no ribbon, no background box,
 * no borders, and no stand. Stays hidden while the camera looks down at the campus, then
 * pops crisp and bold the instant the soaring chase camera pitches up and hits it.
 *
 * All geometries, materials, and the 2048x640 transparent typography texture are allocated
 * once and reused across flights (zero runtime GPU buffer/texture churn).
 */
export class ChelanWelcomeBillboard {
    constructor(scene) {
        this.scene = scene;
        this.revealFactor = 0.0;
        this.popScale = 1.0;

        this.fogColorUniform = { value: new THREE.Color('#0d1729') };
        this.fogRevealUniform = { value: 0.0 };

        this._materials = [];
        this._bannerMat = null;
        this._signTexture = null;

        this.group = this._buildBannerGroup();
        this.group.visible = false;
        this.scene.add(this.group);
    }

    /**
     * Attaches the custom GLSL pop-emergence stage so the floating text emerges cleanly
     * and reaches 100% zero-fog crispness (`fogVeil = 0`) as soon as `uFogReveal` hits 1.
     */
    _makePopTextMaterial(params, customCacheKey) {
        const mat = new THREE.MeshStandardMaterial({
            ...params,
            transparent: true,
            alphaTest: 0.015,
            depthWrite: false,
            side: THREE.DoubleSide,
            fog: false
        });

        const uFogCol = this.fogColorUniform;
        const uReveal = this.fogRevealUniform;

        mat.customProgramCacheKey = () => `chelan_welcome_text_pop_${customCacheKey}`;
        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uBillboardFogColor = uFogCol;
            shader.uniforms.uFogReveal = uReveal;

            shader.fragmentShader =
                `uniform vec3 uBillboardFogColor;\n` +
                `uniform float uFogReveal;\n` +
                shader.fragmentShader.replace(
                    '#include <fog_fragment>',
                    `vec3 fogSrgb = linearToOutputTexel(vec4(uBillboardFogColor, 1.0)).rgb;
                    float r = clamp(uFogReveal, 0.0, 1.0);
                    float fogVeil = pow(1.0 - r, 2.4);
                    gl_FragColor.rgb = mix(gl_FragColor.rgb, fogSrgb, fogVeil);
                    gl_FragColor.a *= smoothstep(0.0, 0.22, r);
                    if (gl_FragColor.a < 0.015) discard;`
                );
        };

        this._materials.push(mat);
        return mat;
    }

    _buildTextOnlyTexture() {
        if (typeof document === 'undefined') return null;
        const W = 2048;
        const H = 640;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        // 100% transparent everywhere outside the letters (zero ribbon, zero card, zero border)
        ctx.clearRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 1. Upper Lead-In Text: "WELCOME TO"
        ctx.save();
        if ('letterSpacing' in ctx) {
            ctx.letterSpacing = '14px';
        }
        ctx.font = '900 94px "Segoe UI", system-ui, -apple-system, sans-serif';
        ctx.shadowColor = 'rgba(2, 6, 23, 0.95)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 7;
        ctx.strokeStyle = '#040b16';
        ctx.lineWidth = 22;
        ctx.strokeText('WELCOME TO', W * 0.5, 190);

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('WELCOME TO', W * 0.5, 190);
        ctx.restore();

        // 2. Hero Sky Text: "CHELAN COUNTY"
        ctx.save();
        if ('letterSpacing' in ctx) {
            ctx.letterSpacing = '4px';
        }
        ctx.font = '900 184px "Segoe UI", system-ui, -apple-system, sans-serif';

        // Deep contrast drop shadow + crisp dark edge stroke so letters pop on both dark & bright skies
        ctx.shadowColor = 'rgba(2, 6, 23, 0.96)';
        ctx.shadowBlur = 32;
        ctx.shadowOffsetY = 11;
        ctx.strokeStyle = '#040b16';
        ctx.lineWidth = 30;
        ctx.strokeText('CHELAN COUNTY', W * 0.5, 412);

        // Bright warm gold-ivory vertical fill
        const titleGrad = ctx.createLinearGradient(0, 305, 0, 510);
        titleGrad.addColorStop(0.0, '#ffffff');
        titleGrad.addColorStop(0.32, '#fef08a');
        titleGrad.addColorStop(0.72, '#facc15');
        titleGrad.addColorStop(1.0, '#f59e0b');
        ctx.shadowColor = 'rgba(250, 204, 21, 0.45)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = titleGrad;
        ctx.fillText('CHELAN COUNTY', W * 0.5, 412);
        ctx.restore();

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        tex.needsUpdate = true;
        return tex;
    }

    _buildBannerGroup() {
        const root = new THREE.Group();
        root.name = 'WelcomeToChelanCountyBanner';

        this._signTexture = this._buildTextOnlyTexture();

        this._bannerMat = this._makePopTextMaterial(
            {
                color: '#ffffff',
                map: this._signTexture,
                emissive: '#ffffff',
                emissiveMap: this._signTexture,
                emissiveIntensity: 0.62,
                roughness: 0.32,
                metalness: 0.06
            },
            'pure_text_face'
        );

        const textW = 46.0;
        const textH = 14.375;

        // Clean flat plane carrying only the transparent floating typography
        const textGeo = new THREE.PlaneGeometry(textW, textH, 1, 1);
        const textMesh = new THREE.Mesh(textGeo, this._bannerMat);
        textMesh.renderOrder = 8;
        root.add(textMesh);

        return root;
    }

    /**
     * Positions and orients the floating sky text along the Bald Eagle's forward soar corridor
     * so regardless of the random 360° spawn azimuth, it faces the approaching camera squarely.
     */
    placeForEagleCorridor({ cx, cz, dirX, dirZ, perpX, perpZ, exitLat = 0 }) {
        const alongDist = 308.0; // 58m ahead of the eagle's +250m horizon exit point
        const centerY = 124.5;
        const wx = cx + dirX * alongDist + perpX * exitLat;
        const wz = cz + dirZ * alongDist + perpZ * exitLat;

        this.group.position.set(wx, centerY, wz);
        this.group.rotation.set(0, Math.atan2(-dirX, -dirZ), 0);
        this.group.scale.setScalar(1.0);

        this.setReveal(0.0, null, 1.0, 0.0);
    }

    /**
     * Updates the reveal factor, spring pop scale, and HDR emissive pop flash.
     */
    setReveal(reveal, liveFogColor = null, popScale = 1.0, popFlash = 0.0) {
        const clamped = THREE.MathUtils.clamp(reveal, 0.0, 1.0);
        this.revealFactor = clamped;
        this.popScale = popScale;
        this.fogRevealUniform.value = clamped;

        if (liveFogColor && liveFogColor.isColor) {
            this.fogColorUniform.value.copy(liveFogColor);
        } else if (this.scene?.fog?.color) {
            this.fogColorUniform.value.copy(this.scene.fog.color);
        }

        if (this._bannerMat) {
            this._bannerMat.emissiveIntensity = 0.62 + THREE.MathUtils.clamp(popFlash, 0.0, 1.0) * 0.72;
        }

        this.group.scale.setScalar(popScale);
        this.group.visible = clamped > 0.002;
    }

    hide() {
        this.setReveal(0.0, null, 1.0, 0.0);
    }
}
