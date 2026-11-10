import * as THREE from 'three';
import { optimizeBuildingGroup } from '../workers/BuildingMeshOptimizer.js';
import { ensurePlanarGrassUVs } from '../materials/GrassMaterial.js';

/**
 * BuildingGlbCodec — Spec-Compliant glTF 2.0 Binary (.GLB) Exporter & Fast Runtime Loader
 *
 * - Exports any optimized Chelan County campus building `THREE.Group` (or context batch)
 *   into a standard Khronos glTF 2.0 `.glb` binary file (compatible with Blender, Three.js
 *   `GLTFLoader`, and standard 3D viewers).
 * - Embeds all procedural 2D Canvas textures (`map`, `bumpMap`, `normalMap`, `roughnessMap`,
 *   `emissiveMap`, `alphaMap`) as PNG `bufferViews` in the `.glb` binary chunk.
 * - Preserves 100% of Three.js architectural metadata in glTF `extras` (`castShadow`,
 *   `receiveShadow`, `renderOrder`, `polygonOffset`, `bumpScale`, `isSelectableBuilding`,
 *   `floorLayer`, `isAnimatedFlag`, `isEntranceNightLight` point lights, and `isCampusGrass`).
 */

const GLB_MAGIC = 0x46546c67; // 'glTF'
const GLB_VERSION = 2;
const CHUNK_JSON = 0x4e4f534a; // 'JSON'
const CHUNK_BIN = 0x004e4942; // 'BIN\0'

const COMPONENT_FLOAT = 5126;
const COMPONENT_USHORT = 5123;
const COMPONENT_UINT = 5125;

const TEXTURE_SLOTS = ['map', 'bumpMap', 'normalMap', 'roughnessMap', 'emissiveMap', 'alphaMap'];

const GRASS_HEX_SET = new Set([
    0x4e7932,
    0x4b8638,
    0x386626,
    0x4a7c36,
    0x4d7c32,
    0x487830,
    0x3f6e2a,
    0x4c7832
]);

function padTo4Bytes(byteLength) {
    return (byteLength + 3) & ~3;
}

function base64ToUint8Array(base64) {
    const binStr = atob(base64);
    const len = binStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binStr.charCodeAt(i);
    }
    return bytes;
}

async function imageSourceToPngBytes(img) {
    if (!img) return null;
    const width = img.width || img.videoWidth || 0;
    const height = img.height || img.videoHeight || 0;
    if (width <= 0 || height <= 0) return null;

    if (typeof img.toDataURL === 'function') {
        try {
            const dataUrl = img.toDataURL('image/png');
            const commaIdx = dataUrl.indexOf(',');
            if (commaIdx > 0) {
                return base64ToUint8Array(dataUrl.slice(commaIdx + 1));
            }
        } catch (_) {}
    }

    if (typeof img.convertToBlob === 'function') {
        try {
            const blob = await img.convertToBlob({ type: 'image/png' });
            const ab = await blob.arrayBuffer();
            return new Uint8Array(ab);
        } catch (_) {}
    }

    if (typeof document !== 'undefined') {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            const commaIdx = dataUrl.indexOf(',');
            if (commaIdx > 0) {
                return base64ToUint8Array(dataUrl.slice(commaIdx + 1));
            }
        } catch (_) {}
    }

    return null;
}

function computePositionMinMax(posArray) {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    const len = posArray.length;
    for (let i = 0; i < len; i += 3) {
        const x = posArray[i];
        const y = posArray[i + 1];
        const z = posArray[i + 2];
        if (x < min[0]) min[0] = x;
        if (y < min[1]) min[1] = y;
        if (z < min[2]) min[2] = z;
        if (x > max[0]) max[0] = x;
        if (y > max[1]) max[1] = y;
        if (z > max[2]) max[2] = z;
    }
    if (!Number.isFinite(min[0])) {
        return { min: [0, 0, 0], max: [0, 0, 0] };
    }
    return { min, max };
}

function isGrassMaterial(mat, meshName = '') {
    if (!mat) return false;
    if (mat.userData?.isCampusGrass) return true;
    const hex = mat.color ? mat.color.getHex() : -1;
    if (GRASS_HEX_SET.has(hex)) return true;
    const lower = (meshName || '').toLowerCase();
    return lower.includes('grass') || lower.includes('lawn') || lower.includes('turf');
}

/**
 * Serializes a `THREE.Group` building (or context batch) into a standard glTF 2.0 `.glb` ArrayBuffer.
 */
export async function exportBuildingGroupToGlbBuffer(bldgGroup, building = null) {
    if (!bldgGroup) {
        throw new Error('exportBuildingGroupToGlbBuffer: bldgGroup is required');
    }

    if (!bldgGroup.userData?.workerStats) {
        optimizeBuildingGroup(bldgGroup, building);
    }

    const bufferViews = [];
    const accessors = [];
    const images = [];
    const samplers = [];
    const textures = [];
    const materials = [];
    const meshes = [];
    const nodes = [];
    const rootNodeIndices = [];
    const bakedLights = [];

    const binChunks = [];
    let currentByteOffset = 0;

    const appendBinChunk = (uint8Bytes, target = undefined) => {
        const byteOffset = currentByteOffset;
        const byteLength = uint8Bytes.byteLength;
        const paddedLength = padTo4Bytes(byteLength);
        binChunks.push(uint8Bytes);
        if (paddedLength > byteLength) {
            binChunks.push(new Uint8Array(paddedLength - byteLength));
        }
        currentByteOffset += paddedLength;

        const bv = {
            buffer: 0,
            byteOffset,
            byteLength
        };
        if (target !== undefined) bv.target = target;
        const bvIndex = bufferViews.length;
        bufferViews.push(bv);
        return bvIndex;
    };

    const texUuidToGlbIndex = new Map();
    const texUuidToMeta = new Map();
    const matUuidToGlbIndex = new Map();

    const registerTextureAsync = async (tex) => {
        if (!tex || !tex.isTexture) return null;
        if (texUuidToGlbIndex.has(tex.uuid)) {
            return texUuidToGlbIndex.get(tex.uuid);
        }

        const pngBytes = await imageSourceToPngBytes(tex.image);
        if (!pngBytes) return null;

        const bvIndex = appendBinChunk(pngBytes);
        const imgIndex = images.length;
        images.push({
            bufferView: bvIndex,
            mimeType: 'image/png',
            name: tex.name || `tex_${imgIndex}`
        });

        const samplerIndex = samplers.length;
        samplers.push({
            magFilter: 9729, // LINEAR
            minFilter: 9987, // LINEAR_MIPMAP_LINEAR
            wrapS: tex.wrapS === THREE.RepeatWrapping ? 10497 : 33071,
            wrapT: tex.wrapT === THREE.RepeatWrapping ? 10497 : 33071
        });

        const meta = {
            wrapS: tex.wrapS,
            wrapT: tex.wrapT,
            repeat: [tex.repeat.x, tex.repeat.y],
            offset: [tex.offset.x, tex.offset.y],
            center: [tex.center.x, tex.center.y],
            rotation: tex.rotation || 0,
            anisotropy: tex.anisotropy || 1,
            colorSpace: tex.colorSpace || THREE.NoColorSpace,
            flipY: tex.flipY !== false
        };

        const glbTexIndex = textures.length;
        textures.push({
            sampler: samplerIndex,
            source: imgIndex,
            extras: meta
        });

        texUuidToGlbIndex.set(tex.uuid, glbTexIndex);
        texUuidToMeta.set(tex.uuid, meta);
        return glbTexIndex;
    };

    const registerMaterialAsync = async (mat, meshName = '') => {
        if (!mat) return 0;
        if (matUuidToGlbIndex.has(mat.uuid)) {
            return matUuidToGlbIndex.get(mat.uuid);
        }

        const grassMat = isGrassMaterial(mat, meshName);
        const texRefs = {};

        // For grass materials, upgradeObjectGrassWithLumaTexture() attaches the shared campus grass
        // diffuse & bump textures on load, so we skip duplicating 512x512 grass canvases per .glb.
        if (!grassMat) {
            for (const slot of TEXTURE_SLOTS) {
                if (mat[slot]) {
                    const tIdx = await registerTextureAsync(mat[slot]);
                    if (tIdx !== null) {
                        texRefs[slot] = tIdx;
                    }
                }
            }
        }

        const safeUserData = {};
        if (mat.userData) {
            for (const [k, v] of Object.entries(mat.userData)) {
                if (k !== 'building' && (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean')) {
                    safeUserData[k] = v;
                }
            }
        }
        if (grassMat) {
            safeUserData.isCampusGrass = true;
        }

        const colorObj = mat.color ? mat.color : new THREE.Color(0xffffff);
        const displayColor = grassMat ? new THREE.Color('#4a7c36') : colorObj;
        const opacity = mat.opacity ?? 1.0;
        const emissiveObj = mat.emissive ? mat.emissive : new THREE.Color(0x000000);

        const pbrMetallicRoughness = {
            baseColorFactor: [displayColor.r, displayColor.g, displayColor.b, opacity],
            metallicFactor: mat.metalness ?? 0.1,
            roughnessFactor: mat.roughness ?? 0.8
        };
        if (texRefs.map !== undefined) {
            pbrMetallicRoughness.baseColorTexture = { index: texRefs.map };
        }
        if (texRefs.roughnessMap !== undefined) {
            pbrMetallicRoughness.metallicRoughnessTexture = { index: texRefs.roughnessMap };
        }

        const gltfMat = {
            name: mat.name || `mat_${materials.length}`,
            pbrMetallicRoughness,
            emissiveFactor: [emissiveObj.r, emissiveObj.g, emissiveObj.b],
            doubleSided: mat.side === THREE.DoubleSide,
            extras: {
                threeType: grassMat ? 'MeshStandardMaterial' : (mat.type || 'MeshStandardMaterial'),
                colorHex: grassMat ? 0xe8f5dc : colorObj.getHex(),
                roughness: grassMat ? 0.86 : (mat.roughness ?? 0.8),
                metalness: grassMat ? 0.02 : (mat.metalness ?? 0.1),
                emissiveHex: emissiveObj.getHex(),
                emissiveIntensity: mat.emissiveIntensity ?? 1.0,
                bumpScale: grassMat ? 0.085 : (mat.bumpScale ?? 1.0),
                opacity,
                transparent: Boolean(mat.transparent),
                alphaTest: mat.alphaTest ?? 0,
                side: mat.side ?? THREE.FrontSide,
                depthWrite: mat.depthWrite !== false,
                depthTest: mat.depthTest !== false,
                polygonOffset: Boolean(mat.polygonOffset),
                polygonOffsetFactor: mat.polygonOffsetFactor || 0,
                polygonOffsetUnits: mat.polygonOffsetUnits || 0,
                wireframe: Boolean(mat.wireframe),
                vertexColors: Boolean(mat.vertexColors),
                flatShading: Boolean(mat.flatShading),
                texRefs,
                userData: safeUserData
            }
        };

        if (mat.transparent && opacity < 1.0) {
            gltfMat.alphaMode = 'BLEND';
        } else if (mat.alphaTest && mat.alphaTest > 0) {
            gltfMat.alphaMode = 'MASK';
            gltfMat.alphaCutoff = mat.alphaTest;
        }

        if (texRefs.normalMap !== undefined) {
            gltfMat.normalTexture = { index: texRefs.normalMap };
        } else if (texRefs.bumpMap !== undefined) {
            gltfMat.normalTexture = { index: texRefs.bumpMap };
        }
        if (texRefs.emissiveMap !== undefined) {
            gltfMat.emissiveTexture = { index: texRefs.emissiveMap };
        }

        const matIdx = materials.length;
        materials.push(gltfMat);
        matUuidToGlbIndex.set(mat.uuid, matIdx);
        return matIdx;
    };

    const serializeGeometryToAccessors = (geo) => {
        const gltfAttrs = {};
        const customAttrMap = {};

        for (const [attrName, attr] of Object.entries(geo.attributes)) {
            if (!attr || !attr.array || attr.count === 0) continue;

            const f32 = attr.array instanceof Float32Array
                ? attr.array
                : new Float32Array(attr.array);
            const rawBytes = new Uint8Array(f32.buffer, f32.byteOffset, f32.byteLength);
            const bvIndex = appendBinChunk(rawBytes, 34962); // ARRAY_BUFFER

            const itemSize = attr.itemSize;
            const accType = itemSize === 1
                ? 'SCALAR'
                : itemSize === 2
                    ? 'VEC2'
                    : itemSize === 3
                        ? 'VEC3'
                        : 'VEC4';

            const acc = {
                bufferView: bvIndex,
                byteOffset: 0,
                componentType: COMPONENT_FLOAT,
                count: attr.count,
                type: accType
            };

            if (attrName === 'position' && itemSize === 3) {
                const { min, max } = computePositionMinMax(f32);
                acc.min = min;
                acc.max = max;
            }

            const accIndex = accessors.length;
            accessors.push(acc);

            if (attrName === 'position') {
                gltfAttrs.POSITION = accIndex;
            } else if (attrName === 'normal') {
                gltfAttrs.NORMAL = accIndex;
            } else if (attrName === 'uv') {
                gltfAttrs.TEXCOORD_0 = accIndex;
            } else if (attrName === 'color') {
                gltfAttrs.COLOR_0 = accIndex;
            } else {
                const key = `_${attrName.toUpperCase()}`;
                gltfAttrs[key] = accIndex;
                customAttrMap[key] = attrName;
            }
        }

        let indexAccIndex = undefined;
        if (geo.index && geo.index.array && geo.index.count > 0) {
            const idxArr = geo.index.array;
            const isUint32 = idxArr instanceof Uint32Array;
            const typedIdx = isUint32
                ? idxArr
                : (idxArr instanceof Uint16Array ? idxArr : new Uint32Array(idxArr));
            const rawBytes = new Uint8Array(typedIdx.buffer, typedIdx.byteOffset, typedIdx.byteLength);
            const bvIndex = appendBinChunk(rawBytes, 34963); // ELEMENT_ARRAY_BUFFER

            indexAccIndex = accessors.length;
            accessors.push({
                bufferView: bvIndex,
                byteOffset: 0,
                componentType: typedIdx instanceof Uint32Array ? COMPONENT_UINT : COMPONENT_USHORT,
                count: typedIdx.length,
                type: 'SCALAR'
            });
        }

        const groups = Array.isArray(geo.groups) && geo.groups.length > 0
            ? geo.groups.map((g) => ({
                  start: g.start,
                  count: g.count,
                  materialIndex: g.materialIndex || 0
              }))
            : [];

        return { gltfAttrs, customAttrMap, indexAccIndex, groups };
    };

    for (const child of bldgGroup.children) {
        if (child.isLight) {
            bakedLights.push({
                color: child.color ? child.color.getHex() : 0xffcf86,
                intensity: child.intensity ?? 0,
                distance: child.distance ?? 12,
                decay: child.decay ?? 1.7,
                position: [child.position.x, child.position.y, child.position.z],
                userData: {
                    isEntranceNightLight: Boolean(child.userData?.isEntranceNightLight),
                    maxIntensity: child.userData?.maxIntensity ?? 2.2
                }
            });
            continue;
        }

        if (!child.isMesh && !child.isLineSegments) continue;
        if (!child.geometry || !child.material) continue;

        const mats = Array.isArray(child.material) ? child.material : [child.material];
        const hasGrass = mats.some((m) => isGrassMaterial(m, child.name));
        if (hasGrass && !child.geometry.userData?.hasPlanarGrassUVs) {
            ensurePlanarGrassUVs(child.geometry, 0.45);
            child.geometry.userData = {
                ...(child.geometry.userData || {}),
                hasPlanarGrassUVs: true
            };
        }

        const isMulti = Array.isArray(child.material);
        const matIndices = [];
        for (const m of mats) {
            const mIdx = await registerMaterialAsync(m, child.name);
            matIndices.push(mIdx);
        }

        const { gltfAttrs, customAttrMap, indexAccIndex, groups } = serializeGeometryToAccessors(child.geometry);
        const mode = child.isLineSegments ? 1 : 4; // 1 = LINES, 4 = TRIANGLES

        const primitive = {
            attributes: gltfAttrs,
            material: matIndices[0] ?? 0,
            mode
        };
        if (indexAccIndex !== undefined) {
            primitive.indices = indexAccIndex;
        }

        const meshIdx = meshes.length;
        meshes.push({
            name: child.name || `mesh_${meshIdx}`,
            primitives: [primitive],
            extras: {
                customAttrMap
            }
        });

        child.updateMatrix();
        const nodeIdx = nodes.length;
        nodes.push({
            name: child.name || `node_${nodeIdx}`,
            mesh: meshIdx,
            matrix: child.matrix.toArray(),
            extras: {
                kind: child.isLineSegments ? 'lineSegments' : 'mesh',
                isMultiMat: isMulti,
                matIndices,
                groups,
                hasPlanarGrassUVs: Boolean(child.geometry.userData?.hasPlanarGrassUVs),
                castShadow: Boolean(child.castShadow),
                receiveShadow: Boolean(child.receiveShadow),
                renderOrder: child.renderOrder || 0,
                userData: {
                    isSelectableBuilding: Boolean(child.userData?.isSelectableBuilding),
                    ...(child.userData?.floorLayer !== undefined ? { floorLayer: child.userData.floorLayer } : {}),
                    ...(child.userData?.isAnimatedFlag
                        ? {
                              isAnimatedFlag: true,
                              flagWidth: child.userData.flagWidth,
                              flagHeight: child.userData.flagHeight,
                              hoistSide: child.userData.hoistSide,
                              phaseOffset: child.userData.phaseOffset,
                              droop: child.userData.droop,
                              ampZ: child.userData.ampZ,
                              ampY: child.userData.ampY
                          }
                        : {})
                }
            }
        });
        rootNodeIndices.push(nodeIdx);
    }

    const gltfJson = {
        asset: {
            version: '2.0',
            generator: 'ChelanCountyCampus-BuildingGlbCodec-2.0'
        },
        scene: 0,
        scenes: [
            {
                name: building?.id || bldgGroup.name || 'CampusBuildingScene',
                nodes: rootNodeIndices,
                extras: {
                    buildingId: building?.id || bldgGroup.name || null,
                    groupPosition: [bldgGroup.position.x, bldgGroup.position.y, bldgGroup.position.z],
                    workerStats: bldgGroup.userData?.workerStats || null,
                    bakedLights
                }
            }
        ],
        nodes,
        meshes,
        materials,
        accessors,
        bufferViews,
        buffers: [
            {
                byteLength: currentByteOffset
            }
        ]
    };

    if (textures.length > 0) gltfJson.textures = textures;
    if (images.length > 0) gltfJson.images = images;
    if (samplers.length > 0) gltfJson.samplers = samplers;

    const jsonEncoder = new TextEncoder();
    const rawJsonBytes = jsonEncoder.encode(JSON.stringify(gltfJson));
    const paddedJsonLen = padTo4Bytes(rawJsonBytes.byteLength);
    const jsonChunkBytes = new Uint8Array(paddedJsonLen);
    jsonChunkBytes.set(rawJsonBytes, 0);
    for (let i = rawJsonBytes.byteLength; i < paddedJsonLen; i++) {
        jsonChunkBytes[i] = 0x20; // pad JSON with ASCII space
    }

    const totalByteLength = 12 + 8 + paddedJsonLen + 8 + currentByteOffset;
    const glbBuffer = new ArrayBuffer(totalByteLength);
    const headerView = new DataView(glbBuffer);
    const outBytes = new Uint8Array(glbBuffer);

    // 12-byte GLB Header
    headerView.setUint32(0, GLB_MAGIC, true);
    headerView.setUint32(4, GLB_VERSION, true);
    headerView.setUint32(8, totalByteLength, true);

    // Chunk 0: JSON
    headerView.setUint32(12, paddedJsonLen, true);
    headerView.setUint32(16, CHUNK_JSON, true);
    outBytes.set(jsonChunkBytes, 20);

    // Chunk 1: BIN
    const binHeaderOffset = 20 + paddedJsonLen;
    headerView.setUint32(binHeaderOffset, currentByteOffset, true);
    headerView.setUint32(binHeaderOffset + 4, CHUNK_BIN, true);

    let writePos = binHeaderOffset + 8;
    for (const chunk of binChunks) {
        outBytes.set(chunk, writePos);
        writePos += chunk.byteLength;
    }

    return glbBuffer;
}

async function decodeGlbTextureToCanvasTexture(pngBytes, mimeType, meta = {}) {
    if (typeof createImageBitmap === 'function') {
        const blob = new Blob([pngBytes], { type: mimeType || 'image/png' });
        const shouldFlipY = meta.flipY !== false;
        let bitmap;
        try {
            bitmap = await createImageBitmap(blob, {
                imageOrientation: shouldFlipY ? 'flipY' : 'none',
                premultiplyAlpha: 'none'
            });
        } catch (_) {
            bitmap = await createImageBitmap(blob);
        }

        const tex = new THREE.Texture(bitmap);
        tex.wrapS = meta.wrapS ?? THREE.RepeatWrapping;
        tex.wrapT = meta.wrapT ?? THREE.RepeatWrapping;
        if (Array.isArray(meta.repeat)) tex.repeat.set(meta.repeat[0], meta.repeat[1]);
        if (Array.isArray(meta.offset)) tex.offset.set(meta.offset[0], meta.offset[1]);
        if (Array.isArray(meta.center)) tex.center.set(meta.center[0], meta.center[1]);
        tex.rotation = meta.rotation || 0;
        tex.anisotropy = meta.anisotropy || 1;
        tex.colorSpace = meta.colorSpace || THREE.NoColorSpace;
        tex.flipY = false;
        tex.needsUpdate = true;
        return tex;
    }
    return null;
}

/**
 * Reconstructs a `THREE.Group` directly from a glTF 2.0 `.glb` binary ArrayBuffer.
 */
export async function parseBuildingGroupFromGlbBuffer(arrayBuffer, building = null, wallFoundry = null) {
    const t0 = performance.now();
    const view = new DataView(arrayBuffer);
    const magic = view.getUint32(0, true);
    const version = view.getUint32(4, true);
    if (magic !== GLB_MAGIC || version !== GLB_VERSION) {
        throw new Error('Invalid glTF 2.0 .glb header');
    }

    const jsonLen = view.getUint32(12, true);
    const jsonType = view.getUint32(16, true);
    if (jsonType !== CHUNK_JSON) {
        throw new Error('Missing JSON chunk in .glb');
    }

    const jsonBytes = new Uint8Array(arrayBuffer, 20, jsonLen);
    const gltf = JSON.parse(new TextDecoder().decode(jsonBytes));

    const binHeaderOffset = 20 + jsonLen;
    const binDataOffset = binHeaderOffset + 8;

    const sceneDef = (gltf.scenes && gltf.scenes[gltf.scene || 0]) || {};
    const sceneExtras = sceneDef.extras || {};

    // 1. Decode all embedded PNG textures in parallel via hardware ImageBitmap decoder
    const gltfTextures = gltf.textures || [];
    const gltfImages = gltf.images || [];
    const gltfBufferViews = gltf.bufferViews || [];

    const decodedTextures = await Promise.all(
        gltfTextures.map(async (texDef) => {
            const imgDef = gltfImages[texDef.source];
            if (!imgDef || imgDef.bufferView === undefined) return null;
            const bv = gltfBufferViews[imgDef.bufferView];
            if (!bv) return null;
            const pngBytes = new Uint8Array(arrayBuffer, binDataOffset + (bv.byteOffset || 0), bv.byteLength);
            return decodeGlbTextureToCanvasTexture(pngBytes, imgDef.mimeType, texDef.extras || {});
        })
    );

    // 2. Reconstruct Three.js Materials
    const gltfMaterials = gltf.materials || [];
    const builtMaterials = gltfMaterials.map((matDef) => {
        const ext = matDef.extras || {};
        const pbr = matDef.pbrMetallicRoughness || {};
        const baseFactor = pbr.baseColorFactor || [1, 1, 1, 1];
        const fallbackColorHex = new THREE.Color(baseFactor[0], baseFactor[1], baseFactor[2]).getHex();

        const mType = ext.threeType || 'MeshStandardMaterial';
        const color = ext.colorHex !== undefined ? ext.colorHex : fallbackColorHex;
        const opacity = ext.opacity !== undefined ? ext.opacity : (baseFactor[3] ?? 1.0);
        const transparent = ext.transparent !== undefined ? Boolean(ext.transparent) : (matDef.alphaMode === 'BLEND');
        const side = ext.side !== undefined ? ext.side : (matDef.doubleSided ? THREE.DoubleSide : THREE.FrontSide);

        let mat;
        if (mType === 'MeshBasicMaterial') {
            mat = new THREE.MeshBasicMaterial({
                name: matDef.name || '',
                color,
                opacity,
                transparent,
                alphaTest: ext.alphaTest ?? 0,
                side,
                depthWrite: ext.depthWrite !== false,
                depthTest: ext.depthTest !== false,
                polygonOffset: Boolean(ext.polygonOffset),
                polygonOffsetFactor: ext.polygonOffsetFactor || 0,
                polygonOffsetUnits: ext.polygonOffsetUnits || 0,
                wireframe: Boolean(ext.wireframe),
                vertexColors: Boolean(ext.vertexColors)
            });
        } else if (mType === 'LineBasicMaterial') {
            mat = new THREE.LineBasicMaterial({
                name: matDef.name || '',
                color,
                opacity,
                transparent,
                depthWrite: ext.depthWrite !== false,
                depthTest: ext.depthTest !== false,
                vertexColors: Boolean(ext.vertexColors)
            });
        } else if (mType === 'MeshLambertMaterial') {
            mat = new THREE.MeshLambertMaterial({
                name: matDef.name || '',
                color,
                emissive: ext.emissiveHex ?? 0x000000,
                emissiveIntensity: ext.emissiveIntensity ?? 1.0,
                opacity,
                transparent,
                side,
                polygonOffset: Boolean(ext.polygonOffset),
                polygonOffsetFactor: ext.polygonOffsetFactor || 0,
                polygonOffsetUnits: ext.polygonOffsetUnits || 0,
                flatShading: Boolean(ext.flatShading)
            });
        } else {
            mat = new THREE.MeshStandardMaterial({
                name: matDef.name || '',
                color,
                roughness: ext.roughness ?? pbr.roughnessFactor ?? 0.8,
                metalness: ext.metalness ?? pbr.metallicFactor ?? 0.1,
                emissive: ext.emissiveHex ?? 0x000000,
                emissiveIntensity: ext.emissiveIntensity ?? 1.0,
                bumpScale: ext.bumpScale ?? 1.0,
                opacity,
                transparent,
                alphaTest: ext.alphaTest ?? 0,
                side,
                depthWrite: ext.depthWrite !== false,
                depthTest: ext.depthTest !== false,
                polygonOffset: Boolean(ext.polygonOffset),
                polygonOffsetFactor: ext.polygonOffsetFactor || 0,
                polygonOffsetUnits: ext.polygonOffsetUnits || 0,
                wireframe: Boolean(ext.wireframe),
                vertexColors: Boolean(ext.vertexColors),
                flatShading: Boolean(ext.flatShading)
            });
        }

        if (ext.texRefs) {
            for (const [slot, texIdx] of Object.entries(ext.texRefs)) {
                const tex = decodedTextures[texIdx];
                if (tex) mat[slot] = tex;
            }
        } else if (pbr.baseColorTexture && decodedTextures[pbr.baseColorTexture.index]) {
            mat.map = decodedTextures[pbr.baseColorTexture.index];
        }

        mat.userData = { ...(ext.userData || {}) };

        if (wallFoundry && building && mat.name && mat.name.startsWith('Wall_')) {
            wallFoundry.materialCache.set(`${mat.name}_${building.id}`, mat);
        }

        return mat;
    });

    // 3. Reconstruct Group, Meshes, LineSegments, and PointLights
    const group = new THREE.Group();
    group.name = building?.id || sceneDef.name || 'CampusBuildingGroup';

    const gltfNodes = gltf.nodes || [];
    const gltfMeshes = gltf.meshes || [];
    const gltfAccessors = gltf.accessors || [];

    const readAccessorTypedArray = (accIndex, copyBuffer = false) => {
        const acc = gltfAccessors[accIndex];
        if (!acc || acc.bufferView === undefined) return null;
        const bv = gltfBufferViews[acc.bufferView];
        if (!bv) return null;

        const byteOffset = binDataOffset + (bv.byteOffset || 0) + (acc.byteOffset || 0);
        const itemSize = acc.type === 'SCALAR'
            ? 1
            : acc.type === 'VEC2'
                ? 2
                : acc.type === 'VEC3'
                    ? 3
                    : 4;
        const length = acc.count * itemSize;

        if (acc.componentType === COMPONENT_USHORT) {
            const byteLen = length * 2;
            const array = (copyBuffer || (byteOffset & 1) !== 0)
                ? new Uint16Array(arrayBuffer.slice(byteOffset, byteOffset + byteLen))
                : new Uint16Array(arrayBuffer, byteOffset, length);
            return { array, itemSize };
        }
        if (acc.componentType === COMPONENT_UINT) {
            const byteLen = length * 4;
            const array = (copyBuffer || (byteOffset & 3) !== 0)
                ? new Uint32Array(arrayBuffer.slice(byteOffset, byteOffset + byteLen))
                : new Uint32Array(arrayBuffer, byteOffset, length);
            return { array, itemSize };
        }
        const byteLen = length * 4;
        const array = (copyBuffer || (byteOffset & 3) !== 0)
            ? new Float32Array(arrayBuffer.slice(byteOffset, byteOffset + byteLen))
            : new Float32Array(arrayBuffer, byteOffset, length);
        return { array, itemSize };
    };

    for (const nodeDef of gltfNodes) {
        if (nodeDef.mesh === undefined) continue;
        const meshDef = gltfMeshes[nodeDef.mesh];
        if (!meshDef || !meshDef.primitives || meshDef.primitives.length === 0) continue;

        const prim = meshDef.primitives[0];
        const nodeExt = nodeDef.extras || {};
        const isMutableMesh = Boolean(nodeExt.userData?.isAnimatedFlag);
        const customAttrMap = meshDef.extras?.customAttrMap || {};

        const geo = new THREE.BufferGeometry();
        if (nodeExt.hasPlanarGrassUVs) {
            geo.userData.hasPlanarGrassUVs = true;
        }

        for (const [gltfAttrName, accIdx] of Object.entries(prim.attributes || {})) {
            const parsed = readAccessorTypedArray(accIdx, isMutableMesh);
            if (!parsed) continue;
            let threeAttrName = gltfAttrName.toLowerCase();
            if (gltfAttrName === 'POSITION') threeAttrName = 'position';
            else if (gltfAttrName === 'NORMAL') threeAttrName = 'normal';
            else if (gltfAttrName === 'TEXCOORD_0') threeAttrName = 'uv';
            else if (gltfAttrName === 'COLOR_0') threeAttrName = 'color';
            else if (customAttrMap[gltfAttrName]) threeAttrName = customAttrMap[gltfAttrName];

            geo.setAttribute(threeAttrName, new THREE.BufferAttribute(parsed.array, parsed.itemSize));
        }

        if (prim.indices !== undefined) {
            const parsedIdx = readAccessorTypedArray(prim.indices);
            if (parsedIdx) {
                geo.setIndex(new THREE.BufferAttribute(parsedIdx.array, 1));
            }
        }

        if (Array.isArray(nodeExt.groups)) {
            for (const g of nodeExt.groups) {
                geo.addGroup(g.start, g.count, g.materialIndex || 0);
            }
        }

        const isMulti = Boolean(nodeExt.isMultiMat && Array.isArray(nodeExt.matIndices));
        const resolvedMat = isMulti
            ? nodeExt.matIndices.map((idx) => builtMaterials[idx] || builtMaterials[0])
            : (builtMaterials[prim.material ?? 0] || new THREE.MeshStandardMaterial());

        const isLine = nodeExt.kind === 'lineSegments' || prim.mode === 1;
        const obj = isLine
            ? new THREE.LineSegments(geo, resolvedMat)
            : new THREE.Mesh(geo, resolvedMat);

        obj.name = nodeDef.name || meshDef.name || '';
        obj.castShadow = Boolean(nodeExt.castShadow);
        obj.receiveShadow = Boolean(nodeExt.receiveShadow);
        obj.renderOrder = nodeExt.renderOrder || 0;

        if (Array.isArray(nodeDef.matrix) && nodeDef.matrix.length === 16) {
            obj.matrix.fromArray(nodeDef.matrix);
            obj.matrix.decompose(obj.position, obj.quaternion, obj.scale);
        }

        if (nodeExt.userData?.isSelectableBuilding && building) {
            obj.userData = {
                ...nodeExt.userData,
                isSelectableBuilding: true,
                building
            };
        } else if (nodeExt.userData) {
            obj.userData = { ...nodeExt.userData };
        }

        group.add(obj);
    }

    if (Array.isArray(sceneExtras.bakedLights)) {
        for (const l of sceneExtras.bakedLights) {
            const ptLight = new THREE.PointLight(l.color, l.intensity, l.distance, l.decay);
            ptLight.position.set(l.position[0], l.position[1], l.position[2]);
            ptLight.userData = { ...(l.userData || {}) };
            group.add(ptLight);
        }
    }

    if (Array.isArray(sceneExtras.groupPosition)) {
        group.position.set(
            sceneExtras.groupPosition[0],
            sceneExtras.groupPosition[1],
            sceneExtras.groupPosition[2]
        );
    }

    const elapsedMs = Math.round((performance.now() - t0) * 10) / 10;
    const baseStats = sceneExtras.workerStats || {
        rawMeshCount: group.children.length,
        optimizedMeshCount: group.children.length
    };
    group.userData = {
        building,
        loadedFromGlb: true,
        workerStats: {
            ...baseStats,
            source: 'glb',
            workerBuildMs: elapsedMs,
            workerTimeMs: elapsedMs
        }
    };

    return group;
}

/**
 * Fetches and parses a pre-baked `.glb` file from `./assets/models/buildings/<id>.glb`.
 */
export async function fetchBuildingGroupFromGlb(url, building = null, wallFoundry = null) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching ${url}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return parseBuildingGroupFromGlbBuffer(arrayBuffer, building, wallFoundry);
}

/**
 * Triggers a browser file download for a `.glb` ArrayBuffer.
 */
export function downloadGlbBuffer(glbBuffer, filename) {
    if (typeof document === 'undefined') return;
    const safeName = filename.endsWith('.glb') ? filename : `${filename}.glb`;
    const blob = new Blob([glbBuffer], { type: 'model/gltf-binary' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
}
