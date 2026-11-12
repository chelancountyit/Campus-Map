import * as THREE from 'three';

/**
 * TreePlanterFoundry — Interactive 3D Tree & Bush Planter & Detailed Species Generator
 * Uses multi-level recursive branching (`EZ-Tree` algorithm) + downloaded 1K PBR bark textures
 * (`assets/textures/trees/bark/*`) and high-resolution alpha-cutout foliage leaf textures
 * (`assets/textures/trees/leaves/*`) across all 22 campus tree & shrub species:
 *  1. Birch            2. Oak              3. Willow           4. Pine
 *  5. Palm             6. Maple            7. Cedar            8. Sycamore
 *  9. Spruce          10. Baobab          11. Elm             12. Fir
 * 13. Ash             14. Columnar Poplar 15. Street Sapling  16. Arborvitae
 * 17. Multi Arborvitae 18. Conical Shrub  19. Bush            20. Red Bush
 * 21. Gold Bush       22. Juniper Bush
 *
 * Supports interactive click-to-plant on terrain, Shift+Click to remove nearest tree,
 * live 3D ghost preview, automatic localStorage persistence, and JSON file export/import
 * (`planted-trees.json`) storing { id, type, x, z, y, scale, rotationY }.
 */
export const TREE_SPECIES_CATALOG = [
    { id: 'birch', name: 'Birch', color: '#8ab04b', trunkColor: '#e8e6df', defaultHeight: 9.0 },
    { id: 'oak', name: 'Oak', color: '#466b28', trunkColor: '#4e3c2c', defaultHeight: 9.8 },
    { id: 'willow', name: 'Willow', color: '#789836', trunkColor: '#544332', defaultHeight: 8.8 },
    { id: 'pine', name: 'Pine', color: '#385b28', trunkColor: '#664632', defaultHeight: 11.2 },
    { id: 'palm', name: 'Palm', color: '#5c822c', trunkColor: '#7a5c40', defaultHeight: 9.2 },
    { id: 'maple', name: 'Maple', color: '#d85020', trunkColor: '#4a382b', defaultHeight: 9.2 },
    { id: 'cedar', name: 'Cedar', color: '#2e5727', trunkColor: '#593e2b', defaultHeight: 10.8 },
    { id: 'sycamore', name: 'Sycamore', color: '#6e8636', trunkColor: '#b8b2a6', defaultHeight: 10.2 },
    { id: 'spruce', name: 'Spruce', color: '#355c47', trunkColor: '#4d3b2c', defaultHeight: 10.6 },
    { id: 'baobab', name: 'Baobab', color: '#647e36', trunkColor: '#8c725c', defaultHeight: 9.2 },
    { id: 'elm', name: 'Elm', color: '#4c7028', trunkColor: '#544232', defaultHeight: 10.0 },
    { id: 'fir', name: 'Fir', color: '#264b22', trunkColor: '#4a3728', defaultHeight: 11.0 },
    { id: 'ash', name: 'Ash', color: '#588534', trunkColor: '#6b6054', defaultHeight: 10.0 },
    { id: 'columnar_poplar', name: 'Columnar Poplar', color: '#678c3a', trunkColor: '#d2cdc1', defaultHeight: 11.4 },
    { id: 'street_sapling', name: 'Street Sapling', color: '#8f823a', trunkColor: '#ccc7bc', defaultHeight: 6.8 },
    { id: 'arborvitae', name: 'Arborvitae', color: '#4a7c32', trunkColor: '#5c4330', defaultHeight: 6.2 },
    { id: 'arborvitae_clump', name: 'Multi Arborvitae', color: '#3b692b', trunkColor: '#6e5641', defaultHeight: 5.8 },
    { id: 'cone_bush', name: 'Conical Shrub', color: '#477a33', trunkColor: '#574230', defaultHeight: 1.95 },
    { id: 'bush', name: 'Bush', color: '#437530', trunkColor: '#4a382b', defaultHeight: 1.65 },
    { id: 'red_bush', name: 'Red Bush', color: '#c43b30', trunkColor: '#4a382b', defaultHeight: 1.55 },
    { id: 'gold_bush', name: 'Gold Bush', color: '#cf962a', trunkColor: '#544232', defaultHeight: 1.55 },
    { id: 'juniper_bush', name: 'Juniper Bush', color: '#335c3e', trunkColor: '#593e2b', defaultHeight: 1.25 }
];

const STORAGE_KEY = 'chelan_planted_trees_v1';

class SeededRNG {
    constructor(seed = 12345) {
        this.m_w = (123456789 + seed) & 0xffffffff;
        this.m_z = (987654321 - seed) & 0xffffffff;
    }

    random(max = 1, min = 0) {
        this.m_z = (36969 * (this.m_z & 65535) + (this.m_z >> 16)) & 0xffffffff;
        this.m_w = (18000 * (this.m_w & 65535) + (this.m_w >> 16)) & 0xffffffff;
        let result = ((this.m_z << 16) + (this.m_w & 65535)) >>> 0;
        result /= 4294967296;
        return (max - min) * result + min;
    }
}

export class TreePlanterFoundry {
    constructor(scene, getTerrainHeightFn) {
        this.scene = scene;
        this.getTerrainHeightFn = getTerrainHeightFn;
        this.treesGroup = new THREE.Group();
        this.treesGroup.name = 'UserPlantedTreesGroup';
        this.scene.add(this.treesGroup);

        this.plantedTrees = []; // Array of { id, type, x, z, y, scale, rotationY }
        this.treeMeshes = new Map(); // id -> THREE.Object3D
        this.prototypeCache = new Map(); // species type -> canonical THREE.Group

        this.selectedType = 'maple';
        this.selectedScale = 1.0;

        this.windTimeUniform = { value: 0 };

        this.loader = new THREE.TextureLoader();
        this.textures = this._loadTreeAssets();
        this.materials = this._createMaterials();

        this.previewGroup = new THREE.Group();
        this.previewGroup.name = 'TreePlanterPreviewGhost';
        this.previewGroup.visible = false;
        this.scene.add(this.previewGroup);
        this._rebuildPreviewGhost();
    }

    _loadTreeAssets() {
        const loadBarkSet = (name, repeatX = 1.5, repeatY = 5.0) => {
            const loadMap = (suffix, isColor) => {
                const tex = this.loader.load(`./assets/textures/trees/bark/${name}_${suffix}_1k.jpg`);
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(repeatX, repeatY);
                if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
                tex.anisotropy = 8;
                return tex;
            };
            return {
                color: loadMap('color', true),
                normal: loadMap('normal', false),
                roughness: loadMap('roughness', false),
                ao: loadMap('ao', false)
            };
        };

        const loadLeafTex = (name) => {
            const tex = this.loader.load(`./assets/textures/trees/leaves/${name}_color.png`);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 8;
            return tex;
        };

        return {
            bark: {
                birch: loadBarkSet('birch', 1.2, 4.0),
                oak: loadBarkSet('oak', 1.4, 5.0),
                pine: loadBarkSet('pine', 1.4, 5.0),
                willow: loadBarkSet('willow', 1.4, 5.0)
            },
            leaves: {
                ash: loadLeafTex('ash'),
                aspen: loadLeafTex('aspen'),
                oak: loadLeafTex('oak'),
                pine: loadLeafTex('pine')
            }
        };
    }

    _applyTreeWindShader(mat, { isLeaf = false, isBush = false } = {}) {
        if (!mat) return mat;
        mat.userData = mat.userData || {};
        mat.userData.windOpts = { isLeaf, isBush };
        const windUniform = this.windTimeUniform;
        const cacheTag = `tree_wind_v1_${isLeaf ? 'leaf' : 'bark'}_${isBush ? 'bush' : 'tree'}`;
        mat.customProgramCacheKey = () => cacheTag;
        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uWindTime = windUniform;
            shader.vertexShader = `uniform float uWindTime;\n` + shader.vertexShader;
            const hDiv = isBush ? '1.65' : '8.80';
            const swayAmp = isBush ? '0.048' : '0.240';
            const rDiv = isBush ? '0.95' : '3.20';
            const yMinBough = isBush ? '0.35' : '1.80';
            const boughAmp = isBush ? '0.024' : '0.072';
            const flutterAmp = isBush ? '0.030' : '0.064';
            const leafYMin = isBush ? '0.22' : '0.90';

            const leafFlutterGlsl = isLeaf
                ? `
                float twLeafPhase = dot(transformed.xyz, vec3(2.35, 3.10, 2.65)) + twPhase * 2.6;
                float twFlut1 = sin(uWindTime * 4.85 + twLeafPhase);
                float twFlut2 = cos(uWindTime * 3.65 + twLeafPhase * 1.35);
                float twLeafMask = clamp(transformed.y / ${leafYMin}, 0.0, 1.0) * twGustEnv;
                transformed.x += (twFlut1 * 0.60 + twFlut2 * 0.40) * ${flutterAmp} * twLeafMask;
                transformed.y += sin(uWindTime * 4.25 + twLeafPhase * 0.90) * (${flutterAmp} * 0.65) * twLeafMask;
                transformed.z += (twFlut2 * 0.60 - twFlut1 * 0.40) * ${flutterAmp} * twLeafMask;
                `
                : '';

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                float twPhase = dot(modelMatrix[3].xz, vec2(0.19, 0.13));
                float twGustEnv = 0.82 + 0.26 * sin(uWindTime * 0.72 + twPhase * 0.85);
                float twH = clamp(transformed.y / ${hDiv}, 0.0, 1.35);
                float twBend = twH * twH;
                float twSwayX = sin(uWindTime * 1.42 + twPhase) * 0.65 + sin(uWindTime * 0.61 + twPhase * 1.7) * 0.35;
                float twSwayZ = cos(uWindTime * 1.12 + twPhase * 1.3) * 0.55 + sin(uWindTime * 0.49 - twPhase) * 0.45;
                transformed.x += twBend * ${swayAmp} * twSwayX * twGustEnv;
                transformed.z += twBend * (${swayAmp} * 0.68) * twSwayZ * twGustEnv;

                float twRad = length(transformed.xz);
                float twBough = clamp(twRad / ${rDiv}, 0.0, 1.25) * clamp(transformed.y / ${yMinBough}, 0.0, 1.0);
                float twBoughWave = sin(uWindTime * 2.45 + twPhase * 1.85 + dot(transformed.xz, vec2(0.82, 0.64)));
                transformed.y += twBough * ${boughAmp} * twBoughWave * twGustEnv;
                transformed.x += twBough * (${boughAmp} * 0.75) * twBoughWave * twGustEnv;
                ${leafFlutterGlsl}`
            );
        };
        return mat;
    }

    updateWind(elapsed) {
        this.windTimeUniform.value = elapsed;
    }

    _createMaterials() {
        const makeBarkMat = (barkKey, tintHex = '#ffffff', roughness = 0.88, isBush = false) => {
            const set = this.textures.bark[barkKey];
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(tintHex),
                map: set.color,
                normalMap: set.normal,
                normalScale: new THREE.Vector2(0.85, 0.85),
                roughnessMap: set.roughness,
                aoMap: set.ao,
                roughness,
                metalness: 0.02
            });
            return this._applyTreeWindShader(mat, { isLeaf: false, isBush });
        };

        const makeLeafMat = (leafKey, tintHex = '#ffffff', alphaTest = 0.42, isBush = false) => {
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(tintHex),
                map: this.textures.leaves[leafKey],
                alphaTest,
                side: THREE.DoubleSide,
                roughness: 0.72,
                metalness: 0.02
            });
            return this._applyTreeWindShader(mat, { isLeaf: true, isBush });
        };

        const makeCoreMat = (colorHex, roughness = 0.88, isBush = false) => {
            const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness });
            return this._applyTreeWindShader(mat, { isLeaf: false, isBush });
        };

        return {
            // High-res 1K PBR Bark Materials
            birchBark: makeBarkMat('birch', '#f5f3ec', 0.78),
            poplarBark: makeBarkMat('birch', '#ddd8cc', 0.80),
            ashBark: makeBarkMat('willow', '#a99f93', 0.87),
            clumpBark: makeBarkMat('willow', '#9e8973', 0.86),
            oakBark: makeBarkMat('oak', '#c9b8a4', 0.88),
            bushBark: makeBarkMat('oak', '#c9b8a4', 0.88, true),
            willowBark: makeBarkMat('willow', '#b8a995', 0.86),
            pineBark: makeBarkMat('pine', '#d4ad92', 0.86),
            sycamoreBark: makeBarkMat('birch', '#d2cbbe', 0.80),
            baobabBark: makeBarkMat('willow', '#ccb49e', 0.84),
            palmBark: makeBarkMat('pine', '#bfa082', 0.85),

            // High-res Alpha-Cutout Foliage Leaf Materials (tinted per species)
            birchLeaf: makeLeafMat('aspen', '#a6cc58', 0.42),
            oakLeaf: makeLeafMat('oak', '#689440', 0.42),
            willowLeaf: makeLeafMat('ash', '#96ba46', 0.38),
            pineLeaf: makeLeafMat('pine', '#568540', 0.32),
            palmLeaf: makeLeafMat('ash', '#6e9e38', 0.38),
            mapleLeaf: makeLeafMat('oak', '#ff642b', 0.42),
            mapleGoldLeaf: makeLeafMat('aspen', '#ff9e2c', 0.42),
            cedarLeaf: makeLeafMat('pine', '#4a7c3d', 0.32),
            sycamoreLeaf: makeLeafMat('oak', '#88a448', 0.42),
            spruceLeaf: makeLeafMat('pine', '#4d7d63', 0.32),
            baobabLeaf: makeLeafMat('ash', '#7a9c44', 0.40),
            elmLeaf: makeLeafMat('ash', '#68943c', 0.40),
            firLeaf: makeLeafMat('pine', '#3e6e38', 0.32),
            ashLeaf: makeLeafMat('ash', '#6fa142', 0.38),
            poplarLeaf: makeLeafMat('aspen', '#7da148', 0.40),
            saplingOliveLeaf: makeLeafMat('ash', '#83963f', 0.38),
            saplingBronzeLeaf: makeLeafMat('aspen', '#c9783e', 0.40),
            arborvitaeLeaf: makeLeafMat('pine', '#5b943c', 0.30),
            arborvitaeClumpLeaf: makeLeafMat('pine', '#4a8032', 0.30),

            // Detailed Bush / Shrub Foliage Materials
            conicalShrubLeaf: makeLeafMat('pine', '#568e3a', 0.32, true),
            bushGreenLeaf: makeLeafMat('ash', '#5d9642', 0.40, true),
            bushRedLeaf: makeLeafMat('aspen', '#e0483b', 0.40, true),
            bushGoldLeaf: makeLeafMat('aspen', '#f2b035', 0.40, true),
            juniperLeaf: makeLeafMat('pine', '#4b8058', 0.32, true),

            // Rich Volumetric Core Foliage Backing Materials (for dense interior crown shadows)
            coreGreen: makeCoreMat('#355923', 0.88, true),
            coreConicalShrub: makeCoreMat('#366125', 0.88, true),
            corePoplar: makeCoreMat('#4e6b2b', 0.86, false),
            coreArborvitae: makeCoreMat('#366024', 0.88, false),
            coreArborvitaeDark: makeCoreMat('#2a4e1d', 0.88, false),
            coreBirch: makeCoreMat('#6b8c35', 0.85, false),
            coreMaple: makeCoreMat('#b83818', 0.84, false),
            coreRedBush: makeCoreMat('#8f261e', 0.88, true),
            coreGoldBush: makeCoreMat('#b57e1d', 0.86, true),
            coreJuniper: makeCoreMat('#294a32', 0.88, true)
        };
    }

    /**
     * Generates a detailed 3D procedural branching + textured leaf-cluster tree/bush mesh
     * using the EZ-Tree algorithm, normalized cleanly to `targetHeight` in meters.
     */
    _generateDetailedBranchAndLeafTree(spec) {
        const rng = new SeededRNG(spec.seed || 12345);
        const isEvergreen = spec.treeType === 'evergreen';
        const levels = spec.levels ?? 3;
        const hasTipLeaves = Boolean(spec.tipLeafMat);

        const branches = { verts: [], normals: [], uvs: [], indices: [] };
        const leaves = { verts: [], normals: [], uvs: [], indices: [] };
        const tipLeaves = { verts: [], normals: [], uvs: [], indices: [] };
        const deferredCrosses = hasTipLeaves ? [] : null;
        const branchQueue = [];

        const emitLeafCrossToBucket = (bucket, origin, orientation, leafSize) => {
            const W = leafSize;
            const L = leafSize;
            [0, Math.PI * 0.5].forEach((rotY) => {
                const idx = bucket.verts.length / 3;
                const quad = [
                    new THREE.Vector3(-W * 0.5, L, 0),
                    new THREE.Vector3(-W * 0.5, 0, 0),
                    new THREE.Vector3(W * 0.5, 0, 0),
                    new THREE.Vector3(W * 0.5, L, 0)
                ].map((v) =>
                    v
                        .applyEuler(new THREE.Euler(0, rotY, 0))
                        .applyEuler(orientation)
                        .add(origin)
                );
                quad.forEach((v) => bucket.verts.push(v.x, v.y, v.z));
                const n = new THREE.Vector3(0, 0.35, 0.94).applyEuler(orientation).normalize();
                for (let k = 0; k < 4; k++) bucket.normals.push(n.x, n.y, n.z);
                bucket.uvs.push(0, 1, 0, 0, 1, 0, 1, 1);
                bucket.indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3);
            });
        };

        const pushLeafCross = (origin, orientation, baseSize, sizeVar) => {
            const leafSize = baseSize * (1 + rng.random(sizeVar, -sizeVar));
            if (deferredCrosses) {
                deferredCrosses.push({
                    origin: origin.clone(),
                    orientation: orientation.clone(),
                    leafSize
                });
            } else {
                emitLeafCrossToBucket(leaves, origin, orientation, leafSize);
            }
        };

        branchQueue.push({
            origin: new THREE.Vector3(0, 0, 0),
            orientation: new THREE.Euler(0, 0, 0),
            length: spec.length[0],
            radius: spec.radius[0],
            level: 0,
            sectionCount: spec.sections[0],
            segmentCount: spec.segments[0]
        });

        while (branchQueue.length > 0) {
            const b = branchQueue.shift();
            const indexOffset = branches.verts.length / 3;
            const sectionOrientation = b.orientation.clone();
            const sectionOrigin = b.origin.clone();
            const divisor = !isEvergreen && levels > 1 ? Math.max(1, levels - 1) : 1;
            const sectionLength = b.length / b.sectionCount / divisor;
            const sections = [];

            for (let i = 0; i <= b.sectionCount; i++) {
                let r = b.radius;
                if (i === b.sectionCount && b.level === levels) {
                    r = 0.002;
                } else if (!isEvergreen) {
                    r *= 1 - (spec.taper[b.level] ?? 0.7) * (i / b.sectionCount);
                } else {
                    r *= 1 - (i / b.sectionCount);
                }

                let first = null;
                for (let j = 0; j < b.segmentCount; j++) {
                    const ang = (2.0 * Math.PI * j) / b.segmentCount;
                    const vertex = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang))
                        .multiplyScalar(r)
                        .applyEuler(sectionOrientation)
                        .add(sectionOrigin);
                    const normal = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang))
                        .applyEuler(sectionOrientation)
                        .normalize();
                    const uvY = (i % 2 === 0) ? 0 : 1;
                    const uvX = j / b.segmentCount;
                    branches.verts.push(vertex.x, vertex.y, vertex.z);
                    branches.normals.push(normal.x, normal.y, normal.z);
                    branches.uvs.push(uvX, uvY);
                    if (j === 0) first = { vertex, normal, uvY };
                }
                branches.verts.push(first.vertex.x, first.vertex.y, first.vertex.z);
                branches.normals.push(first.normal.x, first.normal.y, first.normal.z);
                branches.uvs.push(1, first.uvY);

                sections.push({
                    origin: sectionOrigin.clone(),
                    orientation: sectionOrientation.clone(),
                    radius: r
                });

                sectionOrigin.add(new THREE.Vector3(0, sectionLength, 0).applyEuler(sectionOrientation));

                const gnarl = Math.max(1, 1 / Math.sqrt(Math.max(0.02, r))) * (spec.gnarliness[b.level] ?? 0.05);
                sectionOrientation.x += rng.random(gnarl, -gnarl);
                sectionOrientation.z += rng.random(gnarl, -gnarl);

                const qSection = new THREE.Quaternion().setFromEuler(sectionOrientation);
                const qTwist = new THREE.Quaternion().setFromAxisAngle(
                    new THREE.Vector3(0, 1, 0),
                    spec.twist?.[b.level] ?? 0
                );
                const forceDir = new THREE.Vector3(
                    spec.forceDir?.[0] ?? 0,
                    spec.forceDir?.[1] ?? 1,
                    spec.forceDir?.[2] ?? 0
                ).normalize();
                const qForce = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), forceDir);
                qSection.multiply(qTwist);
                qSection.rotateTowards(qForce, (spec.forceStrength ?? 0.01) / Math.max(0.05, r));
                sectionOrientation.setFromQuaternion(qSection);
            }

            // Build cylinder indices for this branch
            const N = b.segmentCount + 1;
            for (let i = 0; i < b.sectionCount; i++) {
                for (let j = 0; j < b.segmentCount; j++) {
                    const v1 = indexOffset + i * N + j;
                    const v2 = indexOffset + i * N + (j + 1);
                    const v3 = v1 + N;
                    const v4 = v2 + N;
                    branches.indices.push(v1, v3, v2, v2, v3, v4);
                }
            }

            if (!isEvergreen) {
                const last = sections[sections.length - 1];
                if (b.level < levels) {
                    branchQueue.push({
                        origin: last.origin,
                        orientation: last.orientation,
                        length: spec.length[b.level + 1],
                        radius: last.radius,
                        level: b.level + 1,
                        sectionCount: b.sectionCount,
                        segmentCount: b.segmentCount
                    });
                } else {
                    pushLeafCross(last.origin, last.orientation, spec.leafSize, spec.leafSizeVar ?? 0.45);
                }
            }

            if (b.level === levels) {
                const radialOffset = rng.random();
                const leafCount = spec.leafCount ?? 14;
                for (let i = 0; i < leafCount; i++) {
                    const leafStart = rng.random(1.0, spec.leafStart ?? 0.1);
                    const sIdx = Math.floor(leafStart * (sections.length - 1));
                    const secA = sections[sIdx];
                    const secB = sIdx === sections.length - 1 ? secA : sections[sIdx + 1];
                    const alpha = (leafStart - sIdx / (sections.length - 1)) / (1 / (sections.length - 1));
                    const leafOrigin = new THREE.Vector3().lerpVectors(secA.origin, secB.origin, alpha);
                    const qA = new THREE.Quaternion().setFromEuler(secA.orientation);
                    const qB = new THREE.Quaternion().setFromEuler(secB.orientation);
                    const parentOrient = new THREE.Euler().setFromQuaternion(qB.slerp(qA, alpha));

                    const radialAngle = 2.0 * Math.PI * (radialOffset + i / leafCount);
                    const q1 = new THREE.Quaternion().setFromAxisAngle(
                        new THREE.Vector3(1, 0, 0),
                        (spec.leafAngle ?? 40) * (Math.PI / 180)
                    );
                    const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), radialAngle);
                    const q3 = new THREE.Quaternion().setFromEuler(parentOrient);
                    const leafOrient = new THREE.Euler().setFromQuaternion(q3.multiply(q2.multiply(q1)));

                    pushLeafCross(leafOrigin, leafOrient, spec.leafSize, spec.leafSizeVar ?? 0.45);
                }
            } else if (b.level < levels) {
                const childCount = spec.children[b.level] ?? 5;
                const nextLevel = b.level + 1;
                const radialOffset = rng.random();
                for (let i = 0; i < childCount; i++) {
                    const startMin = spec.start[nextLevel] ?? 0.3;
                    const childStart = rng.random(1.0, startMin);
                    const sIdx = Math.floor(childStart * (sections.length - 1));
                    const secA = sections[sIdx];
                    const secB = sIdx === sections.length - 1 ? secA : sections[sIdx + 1];
                    const alpha = (childStart - sIdx / (sections.length - 1)) / (1 / (sections.length - 1));
                    const childOrigin = new THREE.Vector3().lerpVectors(secA.origin, secB.origin, alpha);
                    const childRadius =
                        spec.radius[nextLevel] * ((1 - alpha) * secA.radius + alpha * secB.radius);
                    const qA = new THREE.Quaternion().setFromEuler(secA.orientation);
                    const qB = new THREE.Quaternion().setFromEuler(secB.orientation);
                    const parentOrient = new THREE.Euler().setFromQuaternion(qB.slerp(qA, alpha));

                    const radialAngle = 2.0 * Math.PI * (radialOffset + i / childCount);
                    const q1 = new THREE.Quaternion().setFromAxisAngle(
                        new THREE.Vector3(1, 0, 0),
                        (spec.angle[nextLevel] ?? 55) * (Math.PI / 180)
                    );
                    const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), radialAngle);
                    const q3 = new THREE.Quaternion().setFromEuler(parentOrient);
                    const childOrient = new THREE.Euler().setFromQuaternion(q3.multiply(q2.multiply(q1)));

                    const childLen =
                        spec.length[nextLevel] * (isEvergreen ? 1.0 - childStart * 0.82 : 1.0);

                    branchQueue.push({
                        origin: childOrigin,
                        orientation: childOrient,
                        length: childLen,
                        radius: childRadius,
                        level: nextLevel,
                        sectionCount: spec.sections[nextLevel],
                        segmentCount: spec.segments[nextLevel]
                    });
                }
            }
        }

        if (deferredCrosses && deferredCrosses.length > 0) {
            let minLy = Infinity;
            let maxLy = -Infinity;
            for (let i = 0; i < deferredCrosses.length; i++) {
                const cy = deferredCrosses[i].origin.y;
                if (cy < minLy) minLy = cy;
                if (cy > maxLy) maxLy = cy;
            }
            const spanY = Math.max(0.01, maxLy - minLy);
            const tipStartFrac = spec.tipLeafMinYFrac ?? 0.42;
            for (let i = 0; i < deferredCrosses.length; i++) {
                const item = deferredCrosses[i];
                const hFrac = (item.origin.y - minLy) / spanY;
                const radialDist = Math.hypot(item.origin.x, item.origin.z);
                const hash = Math.abs(Math.sin(i * 12.9898 + item.origin.x * 4.13 + item.origin.z * 7.71)) % 1.0;
                const tipScore = THREE.MathUtils.clamp((hFrac - tipStartFrac) / (1.0 - tipStartFrac), 0, 1) * 0.78
                    + (radialDist > spanY * 0.22 ? 0.22 : 0.0);
                const useTip = hFrac >= tipStartFrac && hash < tipScore;
                emitLeafCrossToBucket(useTip ? tipLeaves : leaves, item.origin, item.orientation, item.leafSize);
            }
        }

        const branchGeo = new THREE.BufferGeometry();
        branchGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(branches.verts), 3));
        branchGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(branches.normals), 3));
        branchGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(branches.uvs), 2));
        branchGeo.setIndex(new THREE.BufferAttribute(new Uint32Array(branches.indices), 1));

        const leafGeo = new THREE.BufferGeometry();
        leafGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(leaves.verts), 3));
        leafGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(leaves.normals), 3));
        leafGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(leaves.uvs), 2));
        leafGeo.setIndex(new THREE.BufferAttribute(new Uint32Array(leaves.indices), 1));

        let tipLeafGeo = null;
        if (hasTipLeaves && tipLeaves.verts.length > 0) {
            tipLeafGeo = new THREE.BufferGeometry();
            tipLeafGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tipLeaves.verts), 3));
            tipLeafGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(tipLeaves.normals), 3));
            tipLeafGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(tipLeaves.uvs), 2));
            tipLeafGeo.setIndex(new THREE.BufferAttribute(new Uint32Array(tipLeaves.indices), 1));
        }

        // Normalize geometry to `spec.targetHeight` so all existing planted trees & scales remain 100% accurate
        branchGeo.computeBoundingBox();
        leafGeo.computeBoundingBox();
        if (tipLeafGeo) tipLeafGeo.computeBoundingBox();
        const maxY = Math.max(
            branchGeo.boundingBox ? branchGeo.boundingBox.max.y : 1,
            leafGeo.boundingBox ? leafGeo.boundingBox.max.y : 1,
            tipLeafGeo && tipLeafGeo.boundingBox ? tipLeafGeo.boundingBox.max.y : 0,
            0.1
        );
        const normScale = (spec.targetHeight || 9.0) / maxY;
        const xzScale = normScale * (spec.widthScale || 1.0);
        branchGeo.scale(xzScale, normScale, xzScale);
        leafGeo.scale(xzScale, normScale, xzScale);
        if (tipLeafGeo) {
            tipLeafGeo.scale(xzScale, normScale, xzScale);
            tipLeafGeo.computeBoundingSphere();
        }
        branchGeo.computeVertexNormals();
        branchGeo.computeBoundingSphere();
        leafGeo.computeBoundingSphere();

        const root = new THREE.Group();
        const branchMesh = new THREE.Mesh(branchGeo, spec.barkMat);
        branchMesh.castShadow = true;
        branchMesh.receiveShadow = true;
        root.add(branchMesh);

        const leafMesh = new THREE.Mesh(leafGeo, spec.leafMat);
        leafMesh.castShadow = true;
        leafMesh.receiveShadow = true;
        root.add(leafMesh);

        if (tipLeafGeo) {
            const tipMesh = new THREE.Mesh(tipLeafGeo, spec.tipLeafMat);
            tipMesh.castShadow = true;
            tipMesh.receiveShadow = true;
            root.add(tipMesh);
        }

        return root;
    }

    /**
     * Builds single-spire or multi-stem sculpted evergreen trees & sheared conical shrubs
     * (Emerald Green Arborvitae, Multi-Stem Arborvitae Clump, Conical Foundation Shrub)
     * merged cleanly into root-space bark, volumetric core, and alpha-cutout foliage BufferGeometries.
     */
    _buildSculptedEvergreenSpire({
        seed = 61001,
        spires = [],
        barkMat,
        coreMat,
        leafMat,
        tuftPitchDeg = 32,
        tuftSize = 0.56,
        tuftSizeVar = 0.24,
        profileShape = 'arborvitae' // 'arborvitae' | 'teardrop_cone'
    }) {
        const rng = new SeededRNG(seed);
        const barkAcc = { verts: [], normals: [], uvs: [], indices: [] };
        const coreAcc = { verts: [], normals: [], uvs: [], indices: [] };
        const leafAcc = { verts: [], normals: [], uvs: [], indices: [] };

        const appendBufferGeo = (acc, geo) => {
            const pos = geo.getAttribute('position');
            const norm = geo.getAttribute('normal');
            const uv = geo.getAttribute('uv');
            const idx = geo.getIndex();
            const baseV = acc.verts.length / 3;
            for (let i = 0; i < pos.count; i++) {
                acc.verts.push(pos.getX(i), pos.getY(i), pos.getZ(i));
                acc.normals.push(norm ? norm.getX(i) : 0, norm ? norm.getY(i) : 1, norm ? norm.getZ(i) : 0);
                acc.uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
            }
            if (idx) {
                for (let i = 0; i < idx.count; i++) {
                    acc.indices.push(baseV + idx.getX(i));
                }
            } else {
                for (let i = 0; i < pos.count; i++) {
                    acc.indices.push(baseV + i);
                }
            }
            geo.dispose();
        };

        const evalCrownRadius = (u, maxRadius) => {
            const t = THREE.MathUtils.clamp(u, 0, 1);
            if (profileShape === 'teardrop_cone') {
                // Sheared plump Courthouse foundation shrub: rounded bottom skirt + full lower belly + smooth conical taper
                if (t < 0.16) {
                    const s = t / 0.16;
                    return maxRadius * (0.42 + 0.58 * Math.sin(s * Math.PI * 0.5));
                }
                const k = (t - 0.16) / 0.84;
                return maxRadius * Math.pow(Math.max(0, 1.0 - k), 0.88) + 0.015 * (1.0 - k);
            }
            // Classic Thuja 'Smaragd' / Arborvitae spire: tucked mulch skirt -> full cylindrical-conical body -> pointed spire apex
            if (t < 0.09) {
                const s = t / 0.09;
                return maxRadius * (0.46 + 0.54 * Math.sin(s * Math.PI * 0.5));
            }
            const k = (t - 0.09) / 0.91;
            return maxRadius * Math.pow(Math.max(0, 1.0 - k), 0.78) * (1.0 - 0.14 * k * k) + 0.012 * (1.0 - k);
        };

        const upVec = new THREE.Vector3(0, 1, 0);
        const segDir = new THREE.Vector3();
        const segMid = new THREE.Vector3();
        const segQuat = new THREE.Quaternion();
        const segScale = new THREE.Vector3(1, 1, 1);
        const segMat4 = new THREE.Matrix4();

        for (let s = 0; s < spires.length; s++) {
            const sp = spires[s];
            const basePos = new THREE.Vector3(sp.baseX || 0, 0, sp.baseZ || 0);
            const collarPos = new THREE.Vector3(
                sp.crownX ?? sp.baseX ?? 0,
                sp.foliageBaseY ?? 0.12,
                sp.crownZ ?? sp.baseZ ?? 0
            );
            const topPos = new THREE.Vector3(
                (sp.crownX ?? sp.baseX ?? 0) + (sp.topLeanX || 0),
                sp.height || 6.0,
                (sp.crownZ ?? sp.baseZ ?? 0) + (sp.topLeanZ || 0)
            );
            const trunkTopY = THREE.MathUtils.lerp(collarPos.y, topPos.y, 0.78);
            const trunkTopPos = new THREE.Vector3(
                THREE.MathUtils.lerp(collarPos.x, topPos.x, 0.78),
                trunkTopY,
                THREE.MathUtils.lerp(collarPos.z, topPos.z, 0.78)
            );

            // 1. Lower bare stem (from ground y=0 to foliage collar) + inner upper leader
            const rGround = sp.trunkRadiusBot ?? 0.085;
            const rCollar = sp.trunkRadiusCollar ?? (rGround * 0.78);
            const rTip = 0.016;

            const addTrunkSegment = (pA, pB, rA, rB, radSegs = 7) => {
                segDir.subVectors(pB, pA);
                const len = segDir.length();
                if (len < 0.02) return;
                segMid.addVectors(pA, pB).multiplyScalar(0.5);
                segQuat.setFromUnitVectors(upVec, segDir.clone().normalize());
                segMat4.compose(segMid, segQuat, segScale);
                const cyl = new THREE.CylinderGeometry(rB, rA, len, radSegs, 2);
                cyl.applyMatrix4(segMat4);
                appendBufferGeo(barkAcc, cyl);
            };

            if (collarPos.y > 0.06) {
                // Slight natural bow in bare multi-stem trunks
                const midStem = new THREE.Vector3().lerpVectors(basePos, collarPos, 0.52);
                midStem.x += (collarPos.x - basePos.x) * 0.14;
                midStem.z += (collarPos.z - basePos.z) * 0.14;
                const rMid = THREE.MathUtils.lerp(rGround, rCollar, 0.52);
                addTrunkSegment(basePos, midStem, rGround, rMid, 8);
                addTrunkSegment(midStem, collarPos, rMid, rCollar, 8);
            }
            addTrunkSegment(collarPos, trunkTopPos, rCollar, rTip, 6);

            if (sp.collarBranches) {
                for (let cb = 0; cb < sp.collarBranches; cb++) {
                    const ang = (cb / sp.collarBranches) * Math.PI * 2 + s * 0.7;
                    const pStart = new THREE.Vector3().lerpVectors(basePos, collarPos, 0.45);
                    const pEnd = new THREE.Vector3(
                        collarPos.x + Math.cos(ang) * (sp.maxRadius * 0.42),
                        collarPos.y + 0.14,
                        collarPos.z + Math.sin(ang) * (sp.maxRadius * 0.42)
                    );
                    addTrunkSegment(pStart, pEnd, rCollar * 0.52, rCollar * 0.24, 5);
                }
            }

            // 2. Sculpted inner volumetric core along the spire axis
            const crownH = Math.max(0.35, topPos.y - collarPos.y);
            const latheSteps = 14;
            const lathePts = [];
            for (let i = 0; i <= latheSteps; i++) {
                const u = i / latheSteps;
                const rCore = i === 0 || i === latheSteps
                    ? 0.001
                    : evalCrownRadius(u, sp.maxRadius) * 0.74;
                lathePts.push(new THREE.Vector2(rCore, u * crownH * 0.96));
            }
            const coreGeo = new THREE.LatheGeometry(lathePts, 10);
            segDir.subVectors(topPos, collarPos);
            segQuat.setFromUnitVectors(upVec, segDir.clone().normalize());
            segMat4.compose(collarPos, segQuat, segScale);
            coreGeo.applyMatrix4(segMat4);
            appendBufferGeo(coreAcc, coreGeo);

            // 3. Dense spiral-phyllotaxis upward-cupped evergreen scale/needle foliage sprays
            const tuftCount = sp.tuftCount || 220;
            const goldenAngle = 2.39996323;
            for (let t = 0; t < tuftCount; t++) {
                const u = Math.pow((t + 0.5) / tuftCount, 0.92);
                const axisPt = new THREE.Vector3().lerpVectors(collarPos, topPos, u);
                const baseR = evalCrownRadius(u, sp.maxRadius);
                const theta = t * goldenAngle + s * 1.37 + rng.random(0.16, -0.16);
                const rJitter = baseR * rng.random(1.04, 0.78);

                const tuftOrigin = new THREE.Vector3(
                    axisPt.x + Math.cos(theta) * rJitter * 0.72,
                    axisPt.y - 0.05,
                    axisPt.z + Math.sin(theta) * rJitter * 0.72
                );

                // Taper tuft size smoothly toward the pointed apex
                const apexScale = THREE.MathUtils.lerp(1.06, 0.42, Math.pow(u, 1.25));
                const sz = tuftSize * apexScale * (1.0 + rng.random(tuftSizeVar, -tuftSizeVar));
                const pitchRad = THREE.MathUtils.degToRad(
                    THREE.MathUtils.lerp(tuftPitchDeg + 10, Math.max(14, tuftPitchDeg - 14), u) + rng.random(7, -7)
                );

                const qYaw = new THREE.Quaternion().setFromAxisAngle(upVec, -theta + Math.PI * 0.5);
                const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchRad);
                const tuftOrient = new THREE.Euler().setFromQuaternion(qYaw.multiply(qPitch));

                [0, Math.PI * 0.5].forEach((rotY) => {
                    const idx = leafAcc.verts.length / 3;
                    const W = sz * 0.92;
                    const L = sz * 1.12;
                    const quad = [
                        new THREE.Vector3(-W * 0.5, L, 0),
                        new THREE.Vector3(-W * 0.5, 0, 0),
                        new THREE.Vector3(W * 0.5, 0, 0),
                        new THREE.Vector3(W * 0.5, L, 0)
                    ].map((v) =>
                        v
                            .applyEuler(new THREE.Euler(0, rotY, 0))
                            .applyEuler(tuftOrient)
                            .add(tuftOrigin)
                    );
                    quad.forEach((v) => leafAcc.verts.push(v.x, v.y, v.z));
                    const n = new THREE.Vector3(Math.cos(theta) * 0.68, 0.52, Math.sin(theta) * 0.68).normalize();
                    for (let k = 0; k < 4; k++) leafAcc.normals.push(n.x, n.y, n.z);
                    leafAcc.uvs.push(0, 1, 0, 0, 1, 0, 1, 1);
                    leafAcc.indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3);
                });
            }
        }

        const buildMesh = (acc, mat) => {
            if (!mat || acc.verts.length === 0) return null;
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(acc.verts), 3));
            geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(acc.normals), 3));
            geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(acc.uvs), 2));
            geo.setIndex(new THREE.BufferAttribute(new Uint32Array(acc.indices), 1));
            geo.computeBoundingBox();
            geo.computeBoundingSphere();
            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            return mesh;
        };

        const group = new THREE.Group();
        const barkMesh = buildMesh(barkAcc, barkMat);
        const coreMesh = buildMesh(coreAcc, coreMat);
        const leafMesh = buildMesh(leafAcc, leafMat);
        if (barkMesh) group.add(barkMesh);
        if (coreMesh) group.add(coreMesh);
        if (leafMesh) group.add(leafMesh);
        return group;
    }

    /**
     * Loads saved trees from `./data/planted-trees.json` and merges/falls back to localStorage
     */
    async loadInitialTrees() {
        let localTrees = [];
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) localTrees = parsed;
            }
        } catch (_) {}

        let fileTrees = [];
        if (typeof window !== 'undefined' && window.location && window.location.protocol !== 'file:') {
            try {
                const resp = await fetch(`./data/planted-trees.json?t=${Date.now()}`, { cache: 'no-store' });
                if (resp.ok) {
                    const data = await resp.json();
                    const arr = Array.isArray(data) ? data : (Array.isArray(data?.trees) ? data.trees : []);
                    if (arr.length > 0) fileTrees = arr;
                }
            } catch (_) {}
        }

        const initialList = localTrees.length > 0 ? localTrees : fileTrees;
        if (initialList.length > 0) {
            this.setTreesFromList(initialList, false);
        }
    }

    setTreesFromList(list, persistLocal = true) {
        this.clearAllTrees(false);
        if (!Array.isArray(list)) return;

        list.forEach((item, idx) => {
            if (!item || typeof item.x !== 'number' || typeof item.z !== 'number') return;
            const type = TREE_SPECIES_CATALOG.some((s) => s.id === item.type) ? item.type : 'maple';
            const scale = typeof item.scale === 'number' ? THREE.MathUtils.clamp(item.scale, 0.3, 3.0) : 1.0;
            const rotationY = typeof item.rotationY === 'number' ? item.rotationY : ((idx * 1.73) % (Math.PI * 2));
            const y = this.getTerrainHeightFn ? this.getTerrainHeightFn(item.x, item.z) : (item.y || 0);
            const record = {
                id: item.id || `tree_${Date.now()}_${idx}`,
                type,
                x: Number(item.x.toFixed(2)),
                z: Number(item.z.toFixed(2)),
                y: Number(y.toFixed(2)),
                scale: Number(scale.toFixed(2)),
                rotationY: Number(rotationY.toFixed(3))
            };
            this.plantedTrees.push(record);
            this._spawnTreeMesh(record);
        });

        if (persistLocal) {
            this._saveToLocalStorage();
        }
    }

    plantTreeAt(x, z, type = this.selectedType, scale = this.selectedScale) {
        const y = this.getTerrainHeightFn ? this.getTerrainHeightFn(x, z) : 0;
        const rotationY = Number(((Math.abs(Math.sin(x * 12.9898 + z * 78.233)) * Math.PI * 2) % (Math.PI * 2)).toFixed(3));
        const record = {
            id: `tree_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            type,
            x: Number(x.toFixed(2)),
            z: Number(z.toFixed(2)),
            y: Number(y.toFixed(2)),
            scale: Number(scale.toFixed(2)),
            rotationY
        };
        this.plantedTrees.push(record);
        this._spawnTreeMesh(record);
        this._saveToLocalStorage();
        return record;
    }

    removeNearestTreeAt(x, z, maxRadius = 4.5) {
        if (this.plantedTrees.length === 0) return null;
        let bestIdx = -1;
        let bestDistSq = maxRadius * maxRadius;
        for (let i = 0; i < this.plantedTrees.length; i++) {
            const t = this.plantedTrees[i];
            const dSq = (t.x - x) * (t.x - x) + (t.z - z) * (t.z - z);
            if (dSq <= bestDistSq) {
                bestDistSq = dSq;
                bestIdx = i;
            }
        }
        if (bestIdx === -1) return null;
        const [removed] = this.plantedTrees.splice(bestIdx, 1);
        const mesh = this.treeMeshes.get(removed.id);
        if (mesh) {
            this.treesGroup.remove(mesh);
            this.treeMeshes.delete(removed.id);
        }
        this._saveToLocalStorage();
        return removed;
    }

    undoLastTree() {
        if (this.plantedTrees.length === 0) return null;
        const removed = this.plantedTrees.pop();
        const mesh = this.treeMeshes.get(removed.id);
        if (mesh) {
            this.treesGroup.remove(mesh);
            this.treeMeshes.delete(removed.id);
        }
        this._saveToLocalStorage();
        return removed;
    }

    clearAllTrees(persistLocal = true) {
        this.treeMeshes.forEach((mesh) => {
            this.treesGroup.remove(mesh);
        });
        this.treeMeshes.clear();
        this.plantedTrees = [];
        if (persistLocal) {
            this._saveToLocalStorage();
        }
    }

    refreshTreeElevations() {
        if (!this.getTerrainHeightFn) return;
        this.plantedTrees.forEach((t) => {
            t.y = Number(this.getTerrainHeightFn(t.x, t.z).toFixed(2));
            const mesh = this.treeMeshes.get(t.id);
            if (mesh) {
                mesh.position.set(t.x, t.y, t.z);
            }
        });
    }

    _saveToLocalStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.plantedTrees));
        } catch (_) {}
    }

    async exportToJsonFile() {
        const payload = JSON.stringify(this.plantedTrees, null, 2);
        if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'planted-trees.json',
                    types: [
                        {
                            description: 'Planted Trees JSON File',
                            accept: { 'application/json': ['.json'] }
                        }
                    ]
                });
                const writable = await handle.createWritable();
                await writable.write(payload);
                await writable.close();
                return true;
            } catch (err) {
                if (err && err.name === 'AbortError') return false;
            }
        }

        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'planted-trees.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    }

    setPreviewSpec(type, scale) {
        const changedType = this.selectedType !== type;
        this.selectedType = type;
        this.selectedScale = scale;
        if (changedType) {
            this._rebuildPreviewGhost();
        }
        this.previewGroup.scale.setScalar(this.selectedScale);
    }

    updatePreviewPosition(x, z, visible = true) {
        if (!visible) {
            this.previewGroup.visible = false;
            return;
        }
        const y = this.getTerrainHeightFn ? this.getTerrainHeightFn(x, z) : 0;
        this.previewGroup.position.set(x, y, z);
        this.previewGroup.scale.setScalar(this.selectedScale);
        this.previewGroup.visible = true;
    }

    _rebuildPreviewGhost() {
        while (this.previewGroup.children.length > 0) {
            const oldChild = this.previewGroup.children[0];
            this.previewGroup.remove(oldChild);
            oldChild.traverse((node) => {
                if (node.isMesh) {
                    if (node.userData?.isPreviewRing && node.geometry) {
                        node.geometry.dispose();
                    }
                    if (node.material && typeof node.material.dispose === 'function') {
                        node.material.dispose();
                    }
                }
            });
        }
        const mesh = this.createTreeMeshByType(this.selectedType);
        mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                const windOpts = child.material.userData?.windOpts;
                child.material = child.material.clone();
                child.material.transparent = true;
                child.material.opacity = 0.72;
                child.castShadow = false;
                if (windOpts) {
                    this._applyTreeWindShader(child.material, windOpts);
                }
            }
        });

        const isBush = this.selectedType.includes('bush') || this.selectedType.includes('shrub');
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(isBush ? 0.65 : 1.1, isBush ? 0.85 : 1.35, 24),
            new THREE.MeshBasicMaterial({ color: '#4ade80', side: THREE.DoubleSide })
        );
        ring.userData.isPreviewRing = true;
        ring.rotation.x = -Math.PI * 0.5;
        ring.position.y = 0.06;
        this.previewGroup.add(ring);
        this.previewGroup.add(mesh);
    }

    _spawnTreeMesh(record) {
        const treeObj = this.createTreeMeshByType(record.type);
        treeObj.position.set(record.x, record.y, record.z);
        treeObj.rotation.y = record.rotationY || 0;
        treeObj.scale.setScalar(record.scale || 1.0);
        treeObj.userData = { plantedTree: record };
        this.treesGroup.add(treeObj);
        this.treeMeshes.set(record.id, treeObj);
    }

    /**
     * Returns a high-detail 3D tree or bush mesh for any of the 22 species (cached & cloned for fast instancing)
     */
    createTreeMeshByType(type) {
        if (this.prototypeCache.has(type)) {
            return this.prototypeCache.get(type).clone();
        }
        const proto = this._buildSpeciesPrototype(type);
        this.prototypeCache.set(type, proto);
        return proto.clone();
    }

    _buildSpeciesPrototype(type) {
        const m = this.materials;

        switch (type) {
            case 'birch': {
                // Slender white-barked Birch/Aspen with multi-level branches & fluttering aspen leaf clusters
                return this._generateDetailedBranchAndLeafTree({
                    seed: 18020,
                    treeType: 'deciduous',
                    targetHeight: 9.2,
                    widthScale: 1.05,
                    barkMat: m.birchBark,
                    leafMat: m.birchLeaf,
                    levels: 3,
                    length: [32, 11, 8, 4.5],
                    radius: [1.1, 0.68, 0.68, 0.72],
                    sections: [10, 8, 6, 4],
                    segments: [8, 6, 4, 3],
                    children: [7, 4, 3],
                    angle: [0, 58, 42, 34],
                    start: [0, 0.42, 0.25, 0.15],
                    taper: [0.65, 0.58, 0.68, 0.72],
                    gnarliness: [0.04, 0.10, 0.12, 0.06],
                    forceDir: [0, 1, 0],
                    forceStrength: 0.015,
                    leafCount: 15,
                    leafStart: 0.12,
                    leafSize: 4.8,
                    leafSizeVar: 0.45,
                    leafAngle: 32
                });
            }

            case 'oak': {
                // Majestic spreading Oak with gnarled limbs, 1K furrowed oak bark & dense oak foliage
                return this._generateDetailedBranchAndLeafTree({
                    seed: 35729,
                    treeType: 'deciduous',
                    targetHeight: 9.8,
                    widthScale: 1.15,
                    barkMat: m.oakBark,
                    leafMat: m.oakLeaf,
                    levels: 3,
                    length: [34, 14, 12, 6.5],
                    radius: [1.65, 0.85, 0.72, 0.85],
                    sections: [9, 7, 5, 3],
                    segments: [8, 6, 4, 3],
                    children: [6, 4, 3],
                    angle: [0, 56, 58, 36],
                    start: [0, 0.44, 0.12, 0.12],
                    taper: [0.72, 0.50, 0.68, 0.74],
                    gnarliness: [0.04, -0.10, -0.14, 0.08],
                    twist: [-0.18, 0.32, 0, 0],
                    forceDir: [0, 1, 0],
                    forceStrength: -0.008,
                    leafCount: 18,
                    leafStart: 0.12,
                    leafSize: 5.4,
                    leafSizeVar: 0.48,
                    leafAngle: 42
                });
            }

            case 'willow': {
                // Weeping Willow with drooping branches (-Y gravity force) and cascading ash/willow foliage
                return this._generateDetailedBranchAndLeafTree({
                    seed: 29411,
                    treeType: 'deciduous',
                    targetHeight: 8.8,
                    widthScale: 1.18,
                    barkMat: m.willowBark,
                    leafMat: m.willowLeaf,
                    levels: 3,
                    length: [28, 16, 13, 8.5],
                    radius: [1.55, 0.74, 0.66, 0.68],
                    sections: [9, 8, 7, 5],
                    segments: [8, 6, 4, 3],
                    children: [7, 4, 3],
                    angle: [0, 52, 68, 55],
                    start: [0, 0.46, 0.18, 0.10],
                    taper: [0.70, 0.62, 0.72, 0.78],
                    gnarliness: [0.06, 0.14, 0.18, 0.12],
                    forceDir: [0, -1, 0],
                    forceStrength: 0.022,
                    leafCount: 18,
                    leafStart: 0.05,
                    leafSize: 5.2,
                    leafSizeVar: 0.42,
                    leafAngle: 62
                });
            }

            case 'pine': {
                // Ponderosa / Western Pine with 68 whorled evergreen branches & pine needle sprays
                return this._generateDetailedBranchAndLeafTree({
                    seed: 13977,
                    treeType: 'evergreen',
                    targetHeight: 11.2,
                    widthScale: 1.12,
                    barkMat: m.pineBark,
                    leafMat: m.pineLeaf,
                    levels: 1,
                    length: [50, 22, 12, 1],
                    radius: [1.18, 0.42, 0.7, 0.7],
                    sections: [12, 8, 6, 4],
                    segments: [8, 5, 4, 3],
                    children: [68, 3, 3],
                    angle: [0, 106, 20, 60],
                    start: [0, 0.24, 0.14, 0.3],
                    taper: [0.7, 0.7, 0.7, 0.7],
                    gnarliness: [0.04, 0.08, 0, 0],
                    forceDir: [0, 1, 0],
                    forceStrength: -0.002,
                    leafCount: 24,
                    leafStart: 0.08,
                    leafSize: 2.8,
                    leafSizeVar: 0.25,
                    leafAngle: 38
                });
            }

            case 'palm': {
                // Detailed Tropical / Ornamental Palm with textured ringed trunk & 14 compound pinnate fronds
                // Geometries are baked into root-space coordinates so vertex-shader wind sways the trunk & fronds smoothly!
                const g = new THREE.Group();
                const segs = 14;
                const totalH = 6.6;
                const segH = totalH / segs;
                for (let i = 0; i < segs; i++) {
                    const t = i / segs;
                    const rTop = THREE.MathUtils.lerp(0.30, 0.16, (i + 1) / segs);
                    const rBot = THREE.MathUtils.lerp(0.35, 0.18, t);
                    const ringGeo = new THREE.CylinderGeometry(rTop, rBot, segH + 0.05, 10);
                    ringGeo.translate(Math.sin(t * Math.PI) * 0.22, (i + 0.5) * segH, 0);
                    const ringSeg = new THREE.Mesh(ringGeo, m.palmBark);
                    ringSeg.castShadow = true;
                    ringSeg.receiveShadow = true;
                    g.add(ringSeg);
                }
                const crownX = Math.sin(Math.PI) * 0.22;
                const crownY = totalH + 0.08;
                const bulbGeo = new THREE.DodecahedronGeometry(0.38, 1);
                bulbGeo.translate(crownX, crownY, 0);
                const bulb = new THREE.Mesh(bulbGeo, m.palmBark);
                g.add(bulb);

                const numFronds = 14;
                const frondMat4 = new THREE.Matrix4();
                const planeMat4 = new THREE.Matrix4();
                for (let i = 0; i < numFronds; i++) {
                    const yaw = (i / numFronds) * Math.PI * 2 + (i % 2) * 0.14;
                    const pitch = (i % 3 === 0) ? 0.36 : ((i % 3 === 1) ? 0.12 : -0.10);
                    frondMat4.makeRotationY(yaw).setPosition(crownX, crownY, 0);

                    for (let s = 0; s < 5; s++) {
                        const rDist = 0.48 + s * 0.62;
                        const drop = pitch * rDist - (s * s) * 0.13;
                        const w = 1.45 * (1 - s * 0.14);
                        const planeGeo = new THREE.PlaneGeometry(0.85, w);
                        planeMat4.makeRotationFromEuler(new THREE.Euler(-Math.PI * 0.5, -s * 0.22, 0));
                        planeMat4.setPosition(rDist, drop, 0);
                        planeGeo.applyMatrix4(planeMat4);
                        planeGeo.applyMatrix4(frondMat4);
                        const plane = new THREE.Mesh(planeGeo, m.palmLeaf);
                        plane.castShadow = true;
                        g.add(plane);
                    }
                }
                return g;
            }

            case 'maple': {
                // Autumn Red/Sugar Maple with rich multi-branch scaffold & vibrant crimson-orange leaf canopy
                return this._generateDetailedBranchAndLeafTree({
                    seed: 41820,
                    treeType: 'deciduous',
                    targetHeight: 9.2,
                    widthScale: 1.12,
                    barkMat: m.oakBark,
                    leafMat: m.mapleLeaf,
                    levels: 3,
                    length: [32, 13, 10, 5.5],
                    radius: [1.35, 0.76, 0.68, 0.75],
                    sections: [9, 7, 5, 3],
                    segments: [8, 6, 4, 3],
                    children: [7, 4, 3],
                    angle: [0, 48, 52, 38],
                    start: [0, 0.42, 0.18, 0.12],
                    taper: [0.72, 0.58, 0.68, 0.72],
                    gnarliness: [0.03, 0.08, 0.12, 0.06],
                    forceDir: [0, 1, 0],
                    forceStrength: 0.008,
                    leafCount: 18,
                    leafStart: 0.10,
                    leafSize: 5.2,
                    leafSizeVar: 0.45,
                    leafAngle: 38
                });
            }

            case 'cedar': {
                // Western Red Cedar with sweeping drooping evergreen boughs reaching low on the trunk
                return this._generateDetailedBranchAndLeafTree({
                    seed: 22190,
                    treeType: 'evergreen',
                    targetHeight: 10.8,
                    widthScale: 1.18,
                    barkMat: m.pineBark,
                    leafMat: m.cedarLeaf,
                    levels: 1,
                    length: [48, 25, 12, 1],
                    radius: [1.35, 0.44, 0.7, 0.7],
                    sections: [12, 8, 6, 4],
                    segments: [8, 5, 4, 3],
                    children: [76, 3, 3],
                    angle: [0, 114, 24, 60],
                    start: [0, 0.14, 0.14, 0.3],
                    taper: [0.75, 0.7, 0.7, 0.7],
                    gnarliness: [0.03, 0.07, 0, 0],
                    forceDir: [0, -1, 0],
                    forceStrength: 0.004,
                    leafCount: 24,
                    leafStart: 0.06,
                    leafSize: 3.1,
                    leafSizeVar: 0.28,
                    leafAngle: 42
                });
            }

            case 'sycamore': {
                // American Sycamore with pale mottled bark, high spreading limbs & broad leaf clusters
                return this._generateDetailedBranchAndLeafTree({
                    seed: 36330,
                    treeType: 'deciduous',
                    targetHeight: 10.2,
                    widthScale: 1.14,
                    barkMat: m.sycamoreBark,
                    leafMat: m.sycamoreLeaf,
                    levels: 3,
                    length: [38, 18, 10, 5.2],
                    radius: [1.7, 0.72, 0.74, 0.70],
                    sections: [10, 7, 5, 3],
                    segments: [8, 6, 4, 3],
                    children: [7, 4, 3],
                    angle: [0, 50, 66, 48],
                    start: [0, 0.36, 0.26, 0.10],
                    taper: [0.70, 0.65, 0.70, 0.70],
                    gnarliness: [0.03, 0.16, 0.16, 0.08],
                    forceDir: [0, 1, 0],
                    forceStrength: -0.015,
                    leafCount: 16,
                    leafStart: 0.08,
                    leafSize: 5.5,
                    leafSizeVar: 0.48,
                    leafAngle: 48
                });
            }

            case 'spruce': {
                // Colorado / Engelmann Spruce with dense conical blue-green needle whorls
                return this._generateDetailedBranchAndLeafTree({
                    seed: 11744,
                    treeType: 'evergreen',
                    targetHeight: 10.6,
                    widthScale: 1.05,
                    barkMat: m.oakBark,
                    leafMat: m.spruceLeaf,
                    levels: 1,
                    length: [46, 18, 10, 1],
                    radius: [1.05, 0.38, 0.7, 0.7],
                    sections: [12, 8, 6, 4],
                    segments: [8, 5, 4, 3],
                    children: [80, 3, 3],
                    angle: [0, 112, 60, 60],
                    start: [0, 0.15, 0.3, 0.3],
                    taper: [0.7, 0.7, 0.7, 0.7],
                    gnarliness: [0.03, 0.06, 0, 0],
                    forceDir: [0, 1, 0],
                    forceStrength: 0.0,
                    leafCount: 22,
                    leafStart: 0.04,
                    leafSize: 2.5,
                    leafSizeVar: 0.30,
                    leafAngle: 28
                });
            }

            case 'baobab': {
                // Iconic thick-trunked Baobab with textured furrowed bark & flat-topped spreading branch crown
                return this._generateDetailedBranchAndLeafTree({
                    seed: 51209,
                    treeType: 'deciduous',
                    targetHeight: 9.2,
                    widthScale: 1.18,
                    barkMat: m.baobabBark,
                    leafMat: m.baobabLeaf,
                    levels: 3,
                    length: [26, 11, 8, 4.2],
                    radius: [3.2, 0.65, 0.68, 0.68],
                    sections: [8, 6, 5, 3],
                    segments: [10, 6, 4, 3],
                    children: [7, 4, 3],
                    angle: [0, 68, 58, 45],
                    start: [0, 0.74, 0.25, 0.15],
                    taper: [0.38, 0.65, 0.70, 0.72],
                    gnarliness: [0.02, 0.18, 0.16, 0.10],
                    forceDir: [0, 1, 0],
                    forceStrength: 0.01,
                    leafCount: 15,
                    leafStart: 0.15,
                    leafSize: 4.8,
                    leafSizeVar: 0.40,
                    leafAngle: 45
                });
            }

            case 'elm': {
                // Classic American Elm with vase-shaped overarching limbs & lush ash/elm foliage canopy
                return this._generateDetailedBranchAndLeafTree({
                    seed: 26867,
                    treeType: 'deciduous',
                    targetHeight: 10.0,
                    widthScale: 1.16,
                    barkMat: m.oakBark,
                    leafMat: m.elmLeaf,
                    levels: 3,
                    length: [30, 18, 11, 5.5],
                    radius: [1.45, 0.72, 0.70, 0.70],
                    sections: [9, 7, 5, 3],
                    segments: [8, 6, 4, 3],
                    children: [7, 4, 3],
                    angle: [0, 38, 56, 48],
                    start: [0, 0.45, 0.25, 0.10],
                    taper: [0.68, 0.65, 0.70, 0.72],
                    gnarliness: [0.04, 0.10, 0.12, 0.08],
                    forceDir: [0, 1, 0],
                    forceStrength: -0.012,
                    leafCount: 18,
                    leafStart: 0.08,
                    leafSize: 5.2,
                    leafSizeVar: 0.45,
                    leafAngle: 48
                });
            }

            case 'ash': {
                // Green / White Ash (Fraxinus): furrowed gray-brown trunk, opposite ascending limbs & compound pinnate ash crown
                return this._generateDetailedBranchAndLeafTree({
                    seed: 39214,
                    treeType: 'deciduous',
                    targetHeight: 10.0,
                    widthScale: 1.04,
                    barkMat: m.ashBark,
                    leafMat: m.ashLeaf,
                    levels: 3,
                    length: [34, 15, 10, 5.4],
                    radius: [1.42, 0.72, 0.68, 0.72],
                    sections: [9, 7, 5, 3],
                    segments: [8, 6, 4, 3],
                    children: [7, 4, 3],
                    angle: [0, 42, 46, 36],
                    start: [0, 0.38, 0.20, 0.12],
                    taper: [0.70, 0.60, 0.68, 0.72],
                    gnarliness: [0.03, 0.08, 0.10, 0.06],
                    forceDir: [0, 1, 0],
                    forceStrength: 0.008,
                    leafCount: 18,
                    leafStart: 0.08,
                    leafSize: 5.0,
                    leafSizeVar: 0.42,
                    leafAngle: 38
                });
            }

            case 'columnar_poplar': {
                // Tall Fastigiate Columnar Poplar / Swedish Aspen: pale smooth silvery-gray lower trunk & narrow vertical leafy column
                const poplarGroup = this._generateDetailedBranchAndLeafTree({
                    seed: 58412,
                    treeType: 'deciduous',
                    targetHeight: 11.4,
                    widthScale: 0.36,
                    barkMat: m.poplarBark,
                    leafMat: m.poplarLeaf,
                    levels: 3,
                    length: [42, 22, 13, 7.0],
                    radius: [1.18, 0.56, 0.55, 0.60],
                    sections: [11, 8, 6, 4],
                    segments: [8, 5, 4, 3],
                    children: [11, 4, 3],
                    angle: [0, 23, 18, 15],
                    start: [0, 0.13, 0.14, 0.10],
                    taper: [0.74, 0.65, 0.70, 0.74],
                    gnarliness: [0.02, 0.05, 0.06, 0.05],
                    forceDir: [0, 1, 0],
                    forceStrength: 0.032,
                    leafCount: 20,
                    leafStart: 0.04,
                    leafSize: 4.9,
                    leafSizeVar: 0.38,
                    leafAngle: 26
                });

                // Slim interior vertical crown shadow core starting well above the clear pale lower stem
                const colCoreGeo = new THREE.CylinderGeometry(0.14, 0.38, 7.6, 8, 4);
                colCoreGeo.translate(0, 5.55, 0);
                const colCoreMesh = new THREE.Mesh(colCoreGeo, m.corePoplar);
                colCoreMesh.castShadow = true;
                colCoreMesh.receiveShadow = true;
                poplarGroup.add(colCoreMesh);

                return poplarGroup;
            }

            case 'street_sapling': {
                // Young Upright Courthouse Sidewalk Tree: slender pale-gray trunk + upright oval two-tone olive & russet-bronze crown
                return this._generateDetailedBranchAndLeafTree({
                    seed: 64109,
                    treeType: 'deciduous',
                    targetHeight: 6.8,
                    widthScale: 0.58,
                    barkMat: m.poplarBark,
                    leafMat: m.saplingOliveLeaf,
                    tipLeafMat: m.saplingBronzeLeaf,
                    tipLeafMinYFrac: 0.40,
                    levels: 3,
                    length: [34, 15, 9.5, 5.2],
                    radius: [0.96, 0.62, 0.58, 0.62],
                    sections: [10, 7, 5, 3],
                    segments: [8, 5, 4, 3],
                    children: [8, 4, 3],
                    angle: [0, 34, 28, 24],
                    start: [0, 0.30, 0.18, 0.12],
                    taper: [0.72, 0.62, 0.68, 0.72],
                    gnarliness: [0.02, 0.06, 0.08, 0.05],
                    forceDir: [0, 1, 0],
                    forceStrength: 0.020,
                    leafCount: 18,
                    leafStart: 0.06,
                    leafSize: 4.6,
                    leafSizeVar: 0.40,
                    leafAngle: 32
                });
            }

            case 'arborvitae': {
                // Single-Spire Emerald Green Arborvitae (Thuja 'Smaragd'): dense emerald foliage all the way to ground tapering to a crisp spire
                return this._buildSculptedEvergreenSpire({
                    seed: 71204,
                    barkMat: m.pineBark,
                    coreMat: m.coreArborvitae,
                    leafMat: m.arborvitaeLeaf,
                    tuftPitchDeg: 32,
                    tuftSize: 0.62,
                    tuftSizeVar: 0.22,
                    profileShape: 'arborvitae',
                    spires: [
                        {
                            baseX: 0,
                            baseZ: 0,
                            crownX: 0,
                            crownZ: 0,
                            foliageBaseY: 0.08,
                            height: 6.2,
                            maxRadius: 0.78,
                            trunkRadiusBot: 0.105,
                            trunkRadiusCollar: 0.095,
                            tuftCount: 280
                        }
                    ]
                });
            }

            case 'arborvitae_clump': {
                // Multi-Stem Clustered Arborvitae: 5 bare splayed woody lower trunks (0..0.84m) rising into 5 tightly grouped conical spires
                return this._buildSculptedEvergreenSpire({
                    seed: 78519,
                    barkMat: m.clumpBark,
                    coreMat: m.coreArborvitaeDark,
                    leafMat: m.arborvitaeClumpLeaf,
                    tuftPitchDeg: 30,
                    tuftSize: 0.50,
                    tuftSizeVar: 0.22,
                    profileShape: 'arborvitae',
                    spires: [
                        {
                            baseX: 0.02,
                            baseZ: 0.03,
                            crownX: 0.04,
                            crownZ: 0.06,
                            topLeanX: 0.02,
                            topLeanZ: 0.03,
                            foliageBaseY: 0.82,
                            height: 5.80,
                            maxRadius: 0.48,
                            trunkRadiusBot: 0.068,
                            trunkRadiusCollar: 0.054,
                            tuftCount: 155
                        },
                        {
                            baseX: -0.11,
                            baseZ: 0.07,
                            crownX: -0.34,
                            crownZ: 0.20,
                            topLeanX: -0.06,
                            topLeanZ: 0.04,
                            foliageBaseY: 0.84,
                            height: 5.52,
                            maxRadius: 0.45,
                            trunkRadiusBot: 0.062,
                            trunkRadiusCollar: 0.050,
                            tuftCount: 145
                        },
                        {
                            baseX: 0.12,
                            baseZ: 0.06,
                            crownX: 0.35,
                            crownZ: 0.17,
                            topLeanX: 0.06,
                            topLeanZ: 0.04,
                            foliageBaseY: 0.85,
                            height: 5.36,
                            maxRadius: 0.44,
                            trunkRadiusBot: 0.060,
                            trunkRadiusCollar: 0.048,
                            tuftCount: 140
                        },
                        {
                            baseX: -0.08,
                            baseZ: -0.10,
                            crownX: -0.24,
                            crownZ: -0.30,
                            topLeanX: -0.05,
                            topLeanZ: -0.05,
                            foliageBaseY: 0.83,
                            height: 5.24,
                            maxRadius: 0.43,
                            trunkRadiusBot: 0.058,
                            trunkRadiusCollar: 0.046,
                            tuftCount: 135
                        },
                        {
                            baseX: 0.09,
                            baseZ: -0.10,
                            crownX: 0.27,
                            crownZ: -0.28,
                            topLeanX: 0.05,
                            topLeanZ: -0.05,
                            foliageBaseY: 0.86,
                            height: 5.08,
                            maxRadius: 0.42,
                            trunkRadiusBot: 0.056,
                            trunkRadiusCollar: 0.045,
                            tuftCount: 130
                        }
                    ]
                });
            }

            case 'cone_bush': {
                // Sheared Conical Foundation Shrub / Dwarf Alberta Spruce (along Courthouse 350 granite foundation wall)
                return this._buildSculptedEvergreenSpire({
                    seed: 83417,
                    barkMat: m.bushBark,
                    coreMat: m.coreConicalShrub,
                    leafMat: m.conicalShrubLeaf,
                    tuftPitchDeg: 38,
                    tuftSize: 0.36,
                    tuftSizeVar: 0.20,
                    profileShape: 'teardrop_cone',
                    spires: [
                        {
                            baseX: 0,
                            baseZ: 0,
                            crownX: 0,
                            crownZ: 0,
                            foliageBaseY: 0.20,
                            height: 1.95,
                            maxRadius: 0.64,
                            trunkRadiusBot: 0.068,
                            trunkRadiusCollar: 0.052,
                            collarBranches: 4,
                            tuftCount: 175
                        }
                    ]
                });
            }

            case 'bush':
            case 'red_bush':
            case 'gold_bush':
            case 'juniper_bush': {
                const isRed = type === 'red_bush';
                const isGold = type === 'gold_bush';
                const isJuniper = type === 'juniper_bush';
                const leafMat = isRed
                    ? m.bushRedLeaf
                    : (isGold ? m.bushGoldLeaf : (isJuniper ? m.juniperLeaf : m.bushGreenLeaf));
                const coreMat = isRed
                    ? m.coreRedBush
                    : (isGold ? m.coreGoldBush : (isJuniper ? m.coreJuniper : m.coreGreen));

                // Generate multi-stemmed woody shrub with hundreds of textured alpha-cutout leaf cards (EZ-Tree Bush preset)
                const bushGroup = this._generateDetailedBranchAndLeafTree({
                    seed: isRed ? 45591 : (isGold ? 45592 : (isJuniper ? 31343 : 45590)),
                    treeType: isJuniper ? 'evergreen' : 'deciduous',
                    targetHeight: isJuniper ? 1.35 : 1.72,
                    widthScale: isJuniper ? 1.45 : 1.28,
                    barkMat: m.bushBark,
                    leafMat,
                    levels: 3,
                    length: isJuniper ? [8.5, 16, 11, 5.0] : [2.5, 14, 6.5, 4.8],
                    radius: [0.65, 0.85, 0.72, 0.68],
                    sections: [4, 5, 5, 4],
                    segments: [5, 4, 3, 3],
                    children: isJuniper ? [11, 4, 3] : [8, 3, 3],
                    angle: isJuniper ? [0, 68, 52, 35] : [0, 34, 58, 52],
                    start: [0, 0.12, 0.25, 0.05],
                    taper: [0.7, 0.7, 0.7, 0.7],
                    gnarliness: [0.08, 0.09, 0.06, 0.08],
                    forceDir: [0, 1, 0],
                    forceStrength: -0.015,
                    leafCount: isJuniper ? 8 : 14,
                    leafStart: 0.0,
                    leafSize: isJuniper ? 3.4 : 3.2,
                    leafSizeVar: 0.55,
                    leafAngle: 52
                });

                // Add a compact organic inner foliage core so the bush has rich 3D volume from every angle
                const coreGeo = new THREE.DodecahedronGeometry(0.52, 1);
                coreGeo.scale(1.25, isJuniper ? 0.62 : 0.88, 1.25);
                coreGeo.translate(0, isJuniper ? 0.42 : 0.62, 0);
                const coreMound = new THREE.Mesh(coreGeo, coreMat);
                coreMound.castShadow = true;
                coreMound.receiveShadow = true;
                bushGroup.add(coreMound);

                return bushGroup;
            }

            case 'fir':
            default: {
                // Noble / Douglas Fir with dense symmetrical narrow-conical emerald evergreen boughs
                return this._generateDetailedBranchAndLeafTree({
                    seed: 19402,
                    treeType: 'evergreen',
                    targetHeight: 11.2,
                    widthScale: 0.98,
                    barkMat: m.pineBark,
                    leafMat: m.firLeaf,
                    levels: 1,
                    length: [50, 17, 10, 1],
                    radius: [1.10, 0.38, 0.7, 0.7],
                    sections: [12, 8, 6, 4],
                    segments: [8, 5, 4, 3],
                    children: [86, 3, 3],
                    angle: [0, 108, 55, 55],
                    start: [0, 0.14, 0.3, 0.3],
                    taper: [0.7, 0.7, 0.7, 0.7],
                    gnarliness: [0.03, 0.05, 0, 0],
                    forceDir: [0, 1, 0],
                    forceStrength: 0.002,
                    leafCount: 24,
                    leafStart: 0.04,
                    leafSize: 2.5,
                    leafSizeVar: 0.25,
                    leafAngle: 25
                });
            }
        }
    }
}
