import * as THREE from 'three';

/**
 * TreePlanterFoundry — Interactive 3D Tree & Bush Planter & Detailed Species Generator
 * Uses multi-level recursive branching (`EZ-Tree` algorithm) + downloaded 1K PBR bark textures
 * (`assets/textures/trees/bark/*`) and high-resolution alpha-cutout foliage leaf textures
 * (`assets/textures/trees/leaves/*`) across all 16 species:
 *  1. Birch        2. Oak          3. Willow       4. Pine
 *  5. Palm         6. Maple        7. Cedar        8. Sycamore
 *  9. Spruce      10. Baobab      11. Elm         12. Fir
 * 13. Bush        14. Red Bush    15. Gold Bush   16. Juniper Bush
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

            // Detailed Bush / Shrub Foliage Materials
            bushGreenLeaf: makeLeafMat('ash', '#5d9642', 0.40, true),
            bushRedLeaf: makeLeafMat('aspen', '#e0483b', 0.40, true),
            bushGoldLeaf: makeLeafMat('aspen', '#f2b035', 0.40, true),
            juniperLeaf: makeLeafMat('pine', '#4b8058', 0.32, true),

            // Rich Volumetric Core Foliage Backing Materials (for dense interior crown shadows)
            coreGreen: makeCoreMat('#355923', 0.88, true),
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

        const branches = { verts: [], normals: [], uvs: [], indices: [] };
        const leaves = { verts: [], normals: [], uvs: [], indices: [] };
        const branchQueue = [];

        const pushLeafCross = (origin, orientation, baseSize, sizeVar) => {
            const leafSize = baseSize * (1 + rng.random(sizeVar, -sizeVar));
            const W = leafSize;
            const L = leafSize;
            [0, Math.PI * 0.5].forEach((rotY) => {
                const idx = leaves.verts.length / 3;
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
                quad.forEach((v) => leaves.verts.push(v.x, v.y, v.z));
                const n = new THREE.Vector3(0, 0.35, 0.94).applyEuler(orientation).normalize();
                for (let k = 0; k < 4; k++) leaves.normals.push(n.x, n.y, n.z);
                leaves.uvs.push(0, 1, 0, 0, 1, 0, 1, 1);
                leaves.indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3);
            });
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

        // Normalize geometry to `spec.targetHeight` so all existing planted trees & scales remain 100% accurate
        branchGeo.computeBoundingBox();
        leafGeo.computeBoundingBox();
        const maxY = Math.max(
            branchGeo.boundingBox ? branchGeo.boundingBox.max.y : 1,
            leafGeo.boundingBox ? leafGeo.boundingBox.max.y : 1,
            0.1
        );
        const normScale = (spec.targetHeight || 9.0) / maxY;
        const xzScale = normScale * (spec.widthScale || 1.0);
        branchGeo.scale(xzScale, normScale, xzScale);
        leafGeo.scale(xzScale, normScale, xzScale);
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

        return root;
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
            this.previewGroup.remove(this.previewGroup.children[0]);
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

        const isBush = this.selectedType.includes('bush');
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(isBush ? 0.65 : 1.1, isBush ? 0.85 : 1.35, 24),
            new THREE.MeshBasicMaterial({ color: '#4ade80', side: THREE.DoubleSide })
        );
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
     * Returns a high-detail 3D tree or bush mesh for any of the 16 species (cached & cloned for fast instancing)
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
