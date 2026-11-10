import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LumaSplatsThree, LumaSplatsSemantics, LumaSplatsLoader } from '@lumaai/luma-web';
import { upgradeObjectGrassWithLumaTexture } from './materials/GrassMaterial.js';

/**
 * Official Luma Web Library Showcase Captures (https://lumalabs.ai/luma-web-library)
 * Ready to test 3D Gaussian Splatting, Foreground Semantic Masking, Particle Reveal,
 * and Live Cubemap HDR Reflections directly on the Chelan County Campus terrain,
 * or paste any custom Chelan County Luma capture URL / UUID.
 */
export const LUMA_PRESET_CAPTURES = [
    {
        id: 'outdoor-courtyard',
        name: '🏛️ Luma Showcase — Architectural Courtyard & Sculpture',
        source: 'https://lumalabs.ai/capture/d80d4876-cf71-4b8a-8b5b-49ffac44cd4a',
        defaultScale: 4.5,
        yOffset: 1.6,
        foregroundOnly: true
    },
    {
        id: 'civic-plaza-car',
        name: '🚓 Luma Showcase — Photorealistic Street Vehicle',
        source: 'https://lumalabs.ai/capture/ca9ea966-ca24-4ec1-ab0f-af665cb546ff',
        defaultScale: 3.2,
        yOffset: 1.2,
        foregroundOnly: true
    },
    {
        id: 'garden-foliage',
        name: '🌿 Luma Showcase — Botanical Garden & Stonework',
        source: 'https://lumalabs.ai/capture/4da7cf32-865a-4515-8cb9-9dfc574c90c2',
        defaultScale: 4.0,
        yOffset: 1.5,
        foregroundOnly: true
    }
];

export class LumaRealismFoundry {
    constructor(scene, renderer, getTerrainHeightFn) {
        this.scene = scene;
        this.renderer = renderer;
        this.getTerrainHeight = getTerrainHeightFn;

        this.pmremGenerator = null;
        this.defaultEnvTexture = null;

        this.pbrRealismEnabled = false;
        this.envIntensity = 0.55;
        this.bloomEnabled = false;
        this.bloomStrength = 0.10;
        this.bloomRadius = 0.24;
        this.bloomThreshold = 1.45;

        this.composer = null;
        this.renderPass = null;
        this.bloomPass = null;
        this.outputPass = null;

        // Active LumaSplatsThree instances keyed by buildingId or 'campus-showcase'
        this.activeSplats = new Map();
        this.splatGroup = new THREE.Group();
        this.splatGroup.name = 'LumaGaussianSplatsGroup';
        this.scene.add(this.splatGroup);

        this.foregroundOnly = true;
        this.particleReveal = true;
        this.useSplatAsEnvProbe = false;
        this.hideProceduralMeshOnSplat = false;

        this.upgradeCampusGrass();
    }

    /**
     * Upgrades all campus grass meshes across the scene with the Luma 3D grass blade texture & bump map.
     */
    upgradeCampusGrass(targetObj = this.scene) {
        upgradeObjectGrassWithLumaTexture(targetObj);
    }

    /**
     * Spawns the Luma 3D Grass Splat (`https://lumalabs.ai/capture/d80d4876-cf71-4b8a-8b5b-49ffac44cd4a`)
     * across our primary campus grass lawns using a shared LumaSplatsLoader instance.
     */
    spawnCampusGrassSplats({ onStatus = null } = {}) {
        const grassCaptureUrl = 'https://lumalabs.ai/capture/d80d4876-cf71-4b8a-8b5b-49ffac44cd4a';
        if (!this._sharedGrassLoader) {
            this._sharedGrassLoader = new LumaSplatsLoader(grassCaptureUrl, true);
        }

        const lawnAnchors = [
            { key: 'grass-350-park', x: 92.0, z: -18.0, yOffset: 0.45, scale: 4.8, rotY: 15 },
            { key: 'grass-350-front-left', x: 66.5, z: 36.2, yOffset: 0.40, scale: 3.4, rotY: 54 },
            { key: 'grass-350-front-right', x: 75.8, z: 22.8, yOffset: 0.40, scale: 3.4, rotY: 140 },
            { key: 'grass-401-south', x: 10.5, z: -41.5, yOffset: 0.38, scale: 3.2, rotY: -36 },
            { key: 'grass-400-right', x: -17.4, z: 12.0, yOffset: 0.55, scale: 2.6, rotY: 54 },
            { key: 'grass-316-front', x: 12.2, z: 38.4, yOffset: 0.38, scale: 2.8, rotY: -36 }
        ];

        for (const anchor of lawnAnchors) {
            this.removeSplat(anchor.key);
            const ty = this.getTerrainHeight ? this.getTerrainHeight(anchor.x, anchor.z) : 0;
            const splat = new LumaSplatsThree({
                loader: this._sharedGrassLoader,
                loadingAnimationEnabled: true,
                particleRevealEnabled: true,
                enableThreeShaderIntegration: true
            });
            splat.semanticsMask = LumaSplatsSemantics.FOREGROUND;
            splat.position.set(anchor.x, ty + anchor.yOffset, anchor.z);
            splat.scale.setScalar(anchor.scale);
            splat.rotation.y = THREE.MathUtils.degToRad(anchor.rotY);

            this.splatGroup.add(splat);
            this.activeSplats.set(anchor.key, {
                targetKey: anchor.key,
                source: grassCaptureUrl,
                splat,
                x: anchor.x,
                z: anchor.z,
                yOffset: anchor.yOffset,
                scale: anchor.scale,
                rotationYDeg: anchor.rotY,
                foregroundOnly: true
            });
        }

        if (onStatus) {
            onStatus('Spawned Luma 3D Grass Splats across Campus Lawns (350, 401, 400 & 316)!');
        }
    }

    /**
     * Builds a calibrated outdoor Columbia Valley Sky + Sun + Foothills Bounce environment
     * baked into a PMREM cubemap texture for crisp glass/metal specular reflections
     * without washing out diffuse terrain, roads, or architectural shadows.
     */
    _initDefaultPbrEnvironment() {
        if (this.defaultEnvTexture) return;
        try {
            if (!this.pmremGenerator) {
                this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
            }
            const envScene = new THREE.Scene();

            // Upper sky hemisphere dome (rich Wenatchee blue sky)
            const skyDome = new THREE.Mesh(
                new THREE.SphereGeometry(28, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
                new THREE.MeshBasicMaterial({
                    color: new THREE.Color('#3b73b8'),
                    side: THREE.BackSide
                })
            );
            envScene.add(skyDome);

            // Lower ground hemisphere (dark earth/asphalt bounce to preserve downward shadow contrast)
            const groundDome = new THREE.Mesh(
                new THREE.SphereGeometry(27.8, 32, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
                new THREE.MeshBasicMaterial({
                    color: new THREE.Color('#23262a'),
                    side: THREE.BackSide
                })
            );
            envScene.add(groundDome);

            // Warm foothills horizon band for natural architectural side-reflections
            const horizonBand = new THREE.Mesh(
                new THREE.CylinderGeometry(26, 26, 5.5, 32, 1, true),
                new THREE.MeshBasicMaterial({
                    color: new THREE.Color('#b8cbe0'),
                    side: THREE.BackSide
                })
            );
            horizonBand.position.y = 1.6;
            envScene.add(horizonBand);

            // Compact solar specular key disk for realistic window/metal glints
            const sunDisk = new THREE.Mesh(
                new THREE.SphereGeometry(1.35, 16, 16),
                new THREE.MeshBasicMaterial({
                    color: new THREE.Color('#fff5d6').multiplyScalar(4.2)
                })
            );
            sunDisk.position.set(14, 16, 12);
            envScene.add(sunDisk);

            const envRT = this.pmremGenerator.fromScene(envScene, 0.03);
            this.defaultEnvTexture = envRT.texture;
            skyDome.geometry.dispose();
            skyDome.material.dispose();
            groundDome.geometry.dispose();
            groundDome.material.dispose();
            horizonBand.geometry.dispose();
            horizonBand.material.dispose();
            sunDisk.geometry.dispose();
            sunDisk.material.dispose();
        } catch (err) {
            console.warn('PMREM environment initialization skipped:', err);
        }
    }

    /**
     * Initializes the selective HDR Half-Float Post-Processing Pipeline
     * (RenderPass -> UnrealBloomPass -> OutputPass).
     */
    initPostProcessing(camera) {
        if (this.composer || !this.renderer || !camera) return;
        try {
            const size = new THREE.Vector2();
            this.renderer.getSize(size);
            const pixelRatio = this.renderer.getPixelRatio();

            const renderTarget = new THREE.WebGLRenderTarget(
                Math.max(1, Math.floor(size.x * pixelRatio)),
                Math.max(1, Math.floor(size.y * pixelRatio)),
                {
                    type: THREE.HalfFloatType,
                    format: THREE.RGBAFormat,
                    samples: 4
                }
            );

            this.composer = new EffectComposer(this.renderer, renderTarget);
            this.composer.setPixelRatio(pixelRatio);
            this.composer.setSize(size.x, size.y);

            this.renderPass = new RenderPass(this.scene, camera);
            this.bloomPass = new UnrealBloomPass(
                new THREE.Vector2(size.x, size.y),
                this.bloomStrength,
                this.bloomRadius,
                this.bloomThreshold
            );
            this.outputPass = new OutputPass();

            this.composer.addPass(this.renderPass);
            this.composer.addPass(this.bloomPass);
            this.composer.addPass(this.outputPass);
        } catch (err) {
            console.warn('HDR EffectComposer initialization skipped:', err);
            this.composer = null;
        }
    }

    setSize(width, height, pixelRatio = 1) {
        if (!this.composer) return;
        this.composer.setPixelRatio(pixelRatio);
        this.composer.setSize(width, height);
        if (this.bloomPass) {
            this.bloomPass.resolution.set(width, height);
        }
    }

    setBloomStrength(strength) {
        this.bloomStrength = THREE.MathUtils.clamp(strength, 0, 0.35);
        if (this.bloomPass) {
            this.bloomPass.strength = this.bloomStrength;
        }
    }

    /**
     * Renders the scene through the selective HDR Bloom + Tone-Mapping composer when
     * HDR Pop bloom is explicitly active, or uses direct MSAA renderer.render for crisp 4K + IBL.
     */
    render(camera) {
        if (this.pbrRealismEnabled && this.bloomEnabled && this.bloomStrength > 0.01) {
            if (!this.composer) {
                this.initPostProcessing(camera);
            }
            if (this.composer) {
                if (this.renderPass && this.renderPass.camera !== camera) {
                    this.renderPass.camera = camera;
                }
                this.composer.render();
                return;
            }
        }
        this.renderer.render(this.scene, camera);
    }

    /**
     * Enables or disables Luma-style PBR Image-Based Lighting (HDR Environment Map + Reflections +
     * Selective Specular Boost + Roof Albedo Headroom Balancing) across all campus surfaces.
     */
    setPbrRealism(enabled, intensity = this.envIntensity) {
        this.pbrRealismEnabled = Boolean(enabled);
        this.envIntensity = intensity;

        if (this.pbrRealismEnabled && !this.defaultEnvTexture) {
            this._initDefaultPbrEnvironment();
        }

        if (this.pbrRealismEnabled && this.defaultEnvTexture) {
            this.scene.environment = this.defaultEnvTexture;
            if ('environmentIntensity' in this.scene) {
                this.scene.environmentIntensity = 1.0;
            }
        } else {
            this.scene.environment = null;
        }

        const seenMats = new Set();
        this.scene.traverse((obj) => {
            if (!obj.isMesh || !obj.material) return;
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (const mat of mats) {
                if (!mat || !mat.isMeshStandardMaterial || seenMats.has(mat)) continue;
                seenMats.add(mat);

                if (mat.userData.baseEnvMapIntensity === undefined) {
                    mat.userData.baseEnvMapIntensity = mat.envMapIntensity ?? 0.3;
                }
                if (mat.color && !mat.userData.baseAlbedoHex) {
                    mat.userData.baseAlbedoHex = mat.color.getHex();
                }

                if (this.pbrRealismEnabled) {
                    const rough = mat.roughness ?? 0.8;
                    const metal = mat.metalness ?? 0.0;

                    if (rough <= 0.42 || metal >= 0.45) {
                        // Glass windows, copper domes, bronze frames, polished vehicles & metal railings
                        mat.envMapIntensity = this.envIntensity * 1.65;
                    } else if (rough <= 0.82) {
                        // Architectural limestone, brick, stucco, concrete sidewalks & curbs
                        mat.envMapIntensity = this.envIntensity * 0.28;
                    } else {
                        // Matte terrain, asphalt roads & roofs
                        mat.envMapIntensity = this.envIntensity * 0.12;
                    }

                    // Compress ultra-bright flat white roof/surface albedos (> 0.84 luma) by ~10%
                    // so roofs retain crisp architectural detail under sun + IBL
                    if (mat.color && !mat.map && rough >= 0.62) {
                        const baseCol = new THREE.Color(mat.userData.baseAlbedoHex);
                        const luma = baseCol.r * 0.299 + baseCol.g * 0.587 + baseCol.b * 0.114;
                        if (luma > 0.84) {
                            mat.color.copy(baseCol).multiplyScalar(0.90);
                        }
                    }
                } else {
                    mat.envMapIntensity = mat.userData.baseEnvMapIntensity;
                    if (mat.color && mat.userData.baseAlbedoHex !== undefined) {
                        mat.color.setHex(mat.userData.baseAlbedoHex);
                    }
                }
                mat.needsUpdate = true;
            }
        });
    }

    /**
     * Normalizes a user-supplied Luma URL or UUID into a full capture URL.
     */
    normalizeSourceUrl(input) {
        const raw = String(input || '').trim();
        if (!raw) return '';
        if (raw.startsWith('http://') || raw.startsWith('https://')) {
            return raw;
        }
        // UUID only
        return `https://lumalabs.ai/capture/${raw}`;
    }

    /**
     * Loads a Luma 3D Gaussian Splat (`LumaSplatsThree`) at the specified world coordinates
     * (or anchored to a selected campus building).
     */
    spawnLumaSplat({
        targetKey = 'campus-showcase',
        sourceUrl,
        x = -24.8,
        z = 22.8,
        yOffset = 1.6,
        scale = 4.5,
        rotationYDeg = 0,
        foregroundOnly = this.foregroundOnly,
        particleReveal = this.particleReveal,
        useAsEnvProbe = this.useSplatAsEnvProbe,
        onStatus = null
    }) {
        const normalizedSource = this.normalizeSourceUrl(sourceUrl);
        if (!normalizedSource) {
            if (onStatus) onStatus('Please enter a valid Luma Capture URL or UUID.');
            return null;
        }

        // Remove any previous splat on the same targetKey
        this.removeSplat(targetKey);

        const ty = this.getTerrainHeight ? this.getTerrainHeight(x, z) : 0;
        if (onStatus) {
            onStatus(`Streaming Luma 3D Gaussian Splat from ${normalizedSource}...`);
        }

        const splat = new LumaSplatsThree({
            source: normalizedSource,
            loadingAnimationEnabled: true,
            particleRevealEnabled: Boolean(particleReveal),
            enableThreeShaderIntegration: true
        });

        splat.semanticsMask = foregroundOnly
            ? LumaSplatsSemantics.FOREGROUND
            : LumaSplatsSemantics.ALL;

        splat.position.set(x, ty + yOffset, z);
        splat.scale.setScalar(scale);
        splat.rotation.y = THREE.MathUtils.degToRad(rotationYDeg);

        splat.onProgress = (e) => {
            if (onStatus && e && typeof e.progress === 'number') {
                const pct = Math.min(100, Math.round(e.progress * 100));
                onStatus(`Loading Luma 3D Gaussian Splat: ${pct}%`);
            }
        };

        splat.onLoad = () => {
            if (onStatus) {
                onStatus(
                    `Loaded Luma 3D Gaussian Splat (${foregroundOnly ? 'Foreground Isolated' : 'Full Scene'}) at [x: ${x.toFixed(1)}, z: ${z.toFixed(1)}]`
                );
            }
            if (useAsEnvProbe && this.pbrRealismEnabled) {
                splat
                    .captureCubemap(this.renderer)
                    .then((cubemapTexture) => {
                        if (cubemapTexture) {
                            this.scene.environment = cubemapTexture;
                            if ('environmentIntensity' in this.scene) {
                                this.scene.environmentIntensity = this.envIntensity;
                            }
                            if (onStatus) {
                                onStatus(
                                    'Luma Splat loaded + Live HDR Cubemap Probe applied to campus windows & metal!'
                                );
                            }
                        }
                    })
                    .catch(() => {});
            }
        };

        this.splatGroup.add(splat);
        const record = {
            targetKey,
            source: normalizedSource,
            splat,
            x,
            z,
            yOffset,
            scale,
            rotationYDeg,
            foregroundOnly
        };
        this.activeSplats.set(targetKey, record);
        return record;
    }

    /**
     * Updates transform or semantic mask on the most recently active Luma Splat.
     */
    updateActiveSplat(targetKey, { scale, yOffset, rotationYDeg, foregroundOnly } = {}) {
        const rec = this.activeSplats.get(targetKey) || Array.from(this.activeSplats.values()).pop();
        if (!rec || !rec.splat) return null;

        if (typeof scale === 'number') {
            rec.scale = scale;
            rec.splat.scale.setScalar(scale);
        }
        if (typeof yOffset === 'number') {
            rec.yOffset = yOffset;
            const ty = this.getTerrainHeight ? this.getTerrainHeight(rec.x, rec.z) : 0;
            rec.splat.position.y = ty + yOffset;
        }
        if (typeof rotationYDeg === 'number') {
            rec.rotationYDeg = rotationYDeg;
            rec.splat.rotation.y = THREE.MathUtils.degToRad(rotationYDeg);
        }
        if (typeof foregroundOnly === 'boolean') {
            rec.foregroundOnly = foregroundOnly;
            rec.splat.semanticsMask = foregroundOnly
                ? LumaSplatsSemantics.FOREGROUND
                : LumaSplatsSemantics.ALL;
        }
        return rec;
    }

    removeSplat(targetKey) {
        const existing = this.activeSplats.get(targetKey);
        if (!existing) return false;
        if (existing.splat) {
            this.splatGroup.remove(existing.splat);
            try {
                if (typeof existing.splat.dispose === 'function') {
                    existing.splat.dispose();
                }
            } catch (_) {}
        }
        this.activeSplats.delete(targetKey);
        if (this.activeSplats.size === 0 && this.pbrRealismEnabled && this.defaultEnvTexture) {
            this.scene.environment = this.defaultEnvTexture;
        }
        return true;
    }

    clearAllSplats() {
        for (const key of Array.from(this.activeSplats.keys())) {
            this.removeSplat(key);
        }
    }
}
