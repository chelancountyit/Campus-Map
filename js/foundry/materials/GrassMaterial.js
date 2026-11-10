import * as THREE from 'three';

let _cachedProcDiffuseTex = null;
let _cachedProcBumpTex = null;
let _cachedPhotoGrassTex = null;

/**
 * Generates a high-definition 512x512 seamless Luma-grade 3D grass blade diffuse + bump texture pair.
 * Safe to run both inside Web Workers (via offscreen canvas shim) and on the main thread.
 */
export function getProceduralLumaGrassTextures() {
    if (_cachedProcDiffuseTex && _cachedProcBumpTex) {
        return { diffuseMap: _cachedProcDiffuseTex, bumpMap: _cachedProcBumpTex };
    }

    const size = 512;
    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = size;
    diffCanvas.height = size;
    const dCtx = diffCanvas.getContext('2d');

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = size;
    bumpCanvas.height = size;
    const bCtx = bumpCanvas.getContext('2d');

    if (dCtx && bCtx) {
        // Rich organic Luma turf base soil/thatch underlayer
        dCtx.fillStyle = '#355e20';
        dCtx.fillRect(0, 0, size, size);

        bCtx.fillStyle = '#383838';
        bCtx.fillRect(0, 0, size, size);

        // Soft organic turf clumps for natural macro variation
        for (let i = 0; i < 420; i++) {
            const cx = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * size;
            const cy = ((Math.sin(i * 78.233) * 28461.3127) % 1 + 1) % 1 * size;
            const r = 14 + (i % 26);
            dCtx.fillStyle = i % 3 === 0
                ? 'rgba(78, 128, 42, 0.24)'
                : i % 3 === 1
                ? 'rgba(52, 92, 28, 0.22)'
                : 'rgba(98, 148, 48, 0.18)';
            dCtx.beginPath();
            dCtx.arc(cx, cy, r, 0, Math.PI * 2);
            dCtx.fill();
        }

        // Dense 3D multi-layered grass blades with sunlit tips and root shadows
        const bladePalette = [
            '#2e541b',
            '#3b6924',
            '#467a2b',
            '#528b31',
            '#5e9938',
            '#6aa83f',
            '#78b648'
        ];
        const totalBlades = 5200;
        for (let i = 0; i < totalBlades; i++) {
            const h1 = ((Math.sin(i * 19.17 + 0.3) * 43758.5453) % 1 + 1) % 1;
            const h2 = ((Math.sin(i * 47.61 + 1.7) * 19341.8231) % 1 + 1) % 1;
            const h3 = ((Math.sin(i * 91.13 + 2.9) * 31753.1943) % 1 + 1) % 1;

            const x = h1 * size;
            const y = h2 * size;
            const angle = h3 * Math.PI * 2;
            const len = 5.0 + (i % 7) * 1.45;
            const dx = Math.cos(angle) * len;
            const dy = Math.sin(angle) * len;

            const tier = Math.min(bladePalette.length - 1, Math.floor((i / totalBlades) * bladePalette.length));
            dCtx.strokeStyle = bladePalette[tier];
            dCtx.lineWidth = 1.25 + (tier * 0.12);

            const bVal = Math.min(250, 95 + tier * 24);
            bCtx.strokeStyle = `rgb(${bVal},${bVal},${bVal})`;
            bCtx.lineWidth = 1.4;

            // Wrap seamlessly across 512x512 tile edges
            for (const ox of [-size, 0, size]) {
                for (const oy of [-size, 0, size]) {
                    const sx = x + ox;
                    const sy = y + oy;
                    if (sx < -16 || sx > size + 16 || sy < -16 || sy > size + 16) continue;
                    dCtx.beginPath();
                    dCtx.moveTo(sx, sy);
                    dCtx.lineTo(sx + dx, sy + dy);
                    dCtx.stroke();

                    bCtx.beginPath();
                    bCtx.moveTo(sx, sy);
                    bCtx.lineTo(sx + dx, sy + dy);
                    bCtx.stroke();
                }
            }
        }
    }

    _cachedProcDiffuseTex = new THREE.CanvasTexture(diffCanvas);
    _cachedProcDiffuseTex.wrapS = THREE.RepeatWrapping;
    _cachedProcDiffuseTex.wrapT = THREE.RepeatWrapping;
    _cachedProcDiffuseTex.repeat.set(1, 1);
    _cachedProcDiffuseTex.colorSpace = THREE.SRGBColorSpace;

    _cachedProcBumpTex = new THREE.CanvasTexture(bumpCanvas);
    _cachedProcBumpTex.wrapS = THREE.RepeatWrapping;
    _cachedProcBumpTex.wrapT = THREE.RepeatWrapping;
    _cachedProcBumpTex.repeat.set(1, 1);

    return { diffuseMap: _cachedProcDiffuseTex, bumpMap: _cachedProcBumpTex };
}

/**
 * Creates a Luma-grade 3D Turf Grass Material with multi-blade diffuse + micro-blade normal/bump relief.
 */
export function createLumaGrassMaterial(options = {}) {
    const { diffuseMap, bumpMap } = getProceduralLumaGrassTextures();
    const mat = new THREE.MeshStandardMaterial({
        color: options.color || '#ffffff',
        map: diffuseMap,
        bumpMap: bumpMap,
        bumpScale: options.bumpScale ?? 0.085,
        roughness: options.roughness ?? 0.88,
        metalness: options.metalness ?? 0.02,
        polygonOffset: options.polygonOffset ?? true,
        polygonOffsetFactor: options.polygonOffsetFactor ?? -1,
        polygonOffsetUnits: options.polygonOffsetUnits ?? -1
    });
    mat.userData = {
        ...(mat.userData || {}),
        isCampusGrass: true
    };
    return mat;
}

/**
 * Ensures any grass BufferGeometry has metric planar UVs (x * scale, z * scale)
 * so high-res grass blade textures tile uniformly without stretching across large or custom-shaped lawns.
 */
export function ensurePlanarGrassUVs(geometry, scale = 0.45) {
    if (!geometry || !geometry.attributes || !geometry.attributes.position) return geometry;
    const pos = geometry.attributes.position;
    const count = pos.count;
    const uvs = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const vz = pos.getZ(i);
        uvs[i * 2] = (vx + vy * 0.35) * scale;
        uvs[i * 2 + 1] = (vz + vy * 0.35) * scale;
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.attributes.uv.needsUpdate = true;
    return geometry;
}

/**
 * Loads `assets/textures/ground/grass_diffuse.jpg` (the photorealistic Luma-style 3D grass blade texture)
 * and upgrades all grass meshes inside `rootObject` with metric planar UVs + high-res grass blade diffuse & bump maps.
 */
export function upgradeObjectGrassWithLumaTexture(rootObject, textureLoader = null) {
    if (!rootObject) return;
    const { diffuseMap: procDiffuse, bumpMap: procBump } = getProceduralLumaGrassTextures();

    if (!_cachedPhotoGrassTex && typeof window !== 'undefined') {
        const loader = textureLoader || new THREE.TextureLoader();
        _cachedPhotoGrassTex = loader.load(
            './assets/textures/ground/grass_diffuse.jpg',
            (tex) => {
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.anisotropy = 16;
                tex.needsUpdate = true;
            }
        );
        _cachedPhotoGrassTex.wrapS = THREE.RepeatWrapping;
        _cachedPhotoGrassTex.wrapT = THREE.RepeatWrapping;
        _cachedPhotoGrassTex.colorSpace = THREE.SRGBColorSpace;
        _cachedPhotoGrassTex.anisotropy = 16;
    }

    const activeGrassMap = _cachedPhotoGrassTex || procDiffuse;
    const grassHexSet = new Set([
        0x4e7932,
        0x4b8638,
        0x386626,
        0x4a7c36,
        0x4d7c32,
        0x487830,
        0x3f6e2a,
        0x4c7832
    ]);

    rootObject.traverse((obj) => {
        if (!obj.isMesh || !obj.material) return;
        const nameLower = (obj.name || '').toLowerCase();
        const isNamedGrass =
            nameLower.includes('grass') ||
            nameLower.includes('lawn') ||
            nameLower.includes('turf');

        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        let hasGrassMat = false;

        for (let i = 0; i < mats.length; i++) {
            const mat = mats[i];
            if (!mat) continue;
            const hex = mat.color ? mat.color.getHex() : -1;
            const isGrass =
                Boolean(mat.userData && mat.userData.isCampusGrass) ||
                grassHexSet.has(hex) ||
                isNamedGrass;

            if (!isGrass) continue;
            hasGrassMat = true;

            if (mat.isMeshLambertMaterial) {
                const upgraded = new THREE.MeshStandardMaterial({
                    color: '#e8f5dc',
                    map: activeGrassMap,
                    bumpMap: procBump,
                    bumpScale: 0.085,
                    roughness: 0.86,
                    metalness: 0.02,
                    polygonOffset: mat.polygonOffset,
                    polygonOffsetFactor: mat.polygonOffsetFactor || -1,
                    polygonOffsetUnits: mat.polygonOffsetUnits || -1
                });
                upgraded.userData = { ...(mat.userData || {}), isCampusGrass: true };
                if (Array.isArray(obj.material)) {
                    obj.material[i] = upgraded;
                } else {
                    obj.material = upgraded;
                }
            } else {
                mat.map = activeGrassMap;
                mat.bumpMap = procBump;
                mat.bumpScale = 0.085;
                if (mat.color) {
                    mat.color.set('#e8f5dc');
                    if (mat.userData) {
                        mat.userData.baseAlbedoHex = 0xe8f5dc;
                    }
                }
                mat.roughness = 0.86;
                mat.metalness = 0.02;
                mat.userData = { ...(mat.userData || {}), isCampusGrass: true };
                mat.needsUpdate = true;
            }
        }

        if (hasGrassMat && obj.geometry && !obj.geometry.userData?.hasPlanarGrassUVs) {
            ensurePlanarGrassUVs(obj.geometry, 0.45);
            obj.geometry.userData = {
                ...(obj.geometry.userData || {}),
                hasPlanarGrassUVs: true
            };
        }
    });
}
