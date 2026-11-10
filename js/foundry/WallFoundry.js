import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { optimizeBuildingGroup } from './workers/BuildingMeshOptimizer.js';
import { buildPhotoRealisticBuilding400 } from './buildings/building400/buildBuilding400.js';
import { buildPhotoRealisticBuilding316 } from './buildings/building316/buildBuilding316.js';
import { buildPhotoRealisticBuilding300 } from './buildings/building300/buildBuilding300.js';
import { buildPhotoRealisticBuilding428 } from './buildings/building428/buildBuilding428.js';
import { buildPhotoRealisticBuilding411_412 } from './buildings/building411_412/buildBuilding411_412.js';
import { buildPhotoRealisticBuilding350 } from './buildings/building350/buildBuilding350.js';
import { buildPhotoRealisticWestWing } from './buildings/westWing/buildWestWing.js';
import { buildPhotoRealisticBuilding401 } from './buildings/building401/buildBuilding401.js';

/**
 * WallFoundry — Procedural + Image-Backed PBR Architectural Wall & Building Generator
 * Generates realistic multi-story building facades, brick/limestone/precast/curtain-wall
 * PBR materials, normal/roughness/emissive maps, cornices, ledges, columns, and rooftop HVAC.
 * Works both over HTTP/HTTPS and directly over file:// protocol without CORS tainting.
 */
export class WallFoundry {
    constructor(textureLoader = new THREE.TextureLoader()) {
        this.loader = textureLoader;
        this.materialCache = new Map();
        this.baseTextures = {};
        this.nightFactor = 0.0; // 0 = day, 1 = night
        this.customConfig = {
            brickScale: 1.0,
            mortarDepth: 0.65,
            windowGlow: 0.35,
            weathering: 0.25
        };
        this._initBaseTextures();
    }

    _initBaseTextures() {
        // Always create a procedural bump texture immediately so roof & masonry work on file:// and http://
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 256; y += 16) {
            const offset = ((y / 16) % 2) * 16;
            for (let x = -16; x < 256; x += 32) {
                ctx.fillStyle = '#9c9c9c';
                ctx.fillRect(x + offset + 1, y + 1, 30, 14);
                ctx.strokeStyle = '#404040';
                ctx.lineWidth = 2;
                ctx.strokeRect(x + offset + 1, y + 1, 30, 14);
            }
        }
        const procBump = new THREE.CanvasTexture(canvas);
        procBump.wrapS = THREE.RepeatWrapping;
        procBump.wrapT = THREE.RepeatWrapping;
        this.baseTextures.brickBump = procBump;

        // If served over http/https, also load the high-res disk textures asynchronously
        if (typeof window !== 'undefined' && window.location && window.location.protocol !== 'file:') {
            this.loader.load(
                './assets/textures/walls/brick_bump.jpg',
                (tex) => {
                    tex.wrapS = THREE.RepeatWrapping;
                    tex.wrapT = THREE.RepeatWrapping;
                    this.baseTextures.brickBump = tex;
                },
                undefined,
                () => {}
            );
        }
    }

    /**
     * Synthesizes a tileable architectural facade texture set (Diffuse, Normal/Bump, Roughness, Emissive)
     * with running-bond masonry, precast concrete panels, pilasters, and multi-pane windows.
     */
    createFacadeTextures(style = 'historic-brick-limestone', primaryHex = '#b85d43', trimHex = '#e6dec8') {
        const width = 512;
        const height = 512;

        const diffCanvas = document.createElement('canvas');
        const bumpCanvas = document.createElement('canvas');
        const roughCanvas = document.createElement('canvas');
        const emisCanvas = document.createElement('canvas');
        diffCanvas.width = bumpCanvas.width = roughCanvas.width = emisCanvas.width = width;
        diffCanvas.height = bumpCanvas.height = roughCanvas.height = emisCanvas.height = height;

        const dCtx = diffCanvas.getContext('2d');
        const bCtx = bumpCanvas.getContext('2d');
        const rCtx = roughCanvas.getContext('2d');
        const eCtx = emisCanvas.getContext('2d');

        // Base wall fill
        dCtx.fillStyle = primaryHex;
        dCtx.fillRect(0, 0, width, height);

        bCtx.fillStyle = '#808080';
        bCtx.fillRect(0, 0, width, height);

        rCtx.fillStyle = '#c8c8c8';
        rCtx.fillRect(0, 0, width, height);

        eCtx.fillStyle = '#000000';
        eCtx.fillRect(0, 0, width, height);

        // 1. Running-bond brick or precast panel joints
        const baseColor = new THREE.Color(primaryHex);
        const trimColor = new THREE.Color(trimHex);
        const isPrecast = style === 'fortified-precast' || style === 'ribbed-concrete-brick';

        const rows = isPrecast ? 16 : 36;
        const cols = isPrecast ? 8 : 18;
        const rowH = height / rows;
        const colW = width / cols;

        for (let r = 0; r < rows; r++) {
            const offset = (r % 2) * (colW * 0.5);
            for (let c = -1; c <= cols; c++) {
                const bx = c * colW + offset;
                const by = r * rowH;

                // Subtle per-unit variation
                const jitter = ((Math.sin(r * 19.7 + c * 43.3) * 43758.5453) % 1) * 0.08 - 0.04;
                const unitColor = baseColor.clone().offsetHSL(0, jitter * 0.4, jitter);
                dCtx.fillStyle = `#${unitColor.getHexString()}`;
                dCtx.fillRect(bx + 1.5, by + 1.5, colW - 3, rowH - 3);

                // Mortar / joint lines in diffuse & bump
                dCtx.strokeStyle = isPrecast ? '#5f6368' : '#cfc6b8';
                dCtx.lineWidth = isPrecast ? 2.0 : 1.4;
                dCtx.strokeRect(bx + 0.5, by + 0.5, colW - 1, rowH - 1);

                bCtx.fillStyle = '#b0b0b0';
                bCtx.fillRect(bx + 2, by + 2, colW - 4, rowH - 4);
                bCtx.strokeStyle = '#303030';
                bCtx.lineWidth = 2.0;
                bCtx.strokeRect(bx + 0.5, by + 0.5, colW - 1, rowH - 1);
            }
        }

        // 2. Horizontal limestone / precast floor band at bottom & top of each story tile
        const bandH = style === 'historic-brick-limestone' ? 38 : 26;
        dCtx.fillStyle = `#${trimColor.getHexString()}`;
        dCtx.fillRect(0, 0, width, bandH);
        dCtx.fillRect(0, height - bandH * 0.6, width, bandH * 0.6);

        bCtx.fillStyle = '#e8e8e8';
        bCtx.fillRect(0, 0, width, bandH);

        rCtx.fillStyle = '#909090';
        rCtx.fillRect(0, 0, width, bandH);

        // 3. Vertical pilasters / ribs
        if (style === 'historic-brick-limestone' || style === 'ribbed-concrete-brick') {
            const pilasterCount = 4;
            const pSpan = width / pilasterCount;
            for (let i = 0; i < pilasterCount; i++) {
                const px = i * pSpan;
                dCtx.fillStyle = `#${trimColor.clone().multiplyScalar(0.95).getHexString()}`;
                dCtx.fillRect(px, 0, 22, height);
                bCtx.fillStyle = '#f2f2f2';
                bCtx.fillRect(px, 0, 22, height);
            }
        }

        // 4. Architectural Windows per style
        const winCols = style === 'fortified-precast' ? 6 : 4;
        const winSpan = width / winCols;

        for (let i = 0; i < winCols; i++) {
            const cx = i * winSpan + winSpan * 0.5;
            let wW = winSpan * 0.54;
            let wH = height * 0.56;
            let wy = bandH + (height - bandH * 1.6 - wH) * 0.5;

            if (style === 'fortified-precast') {
                wW = winSpan * 0.20;
                wH = height * 0.50;
            } else if (style === 'modern-brick-curtainwall') {
                wW = winSpan * 0.72;
                wH = height * 0.62;
            } else if (style === 'classical-cream-brick') {
                wW = winSpan * 0.48;
                wH = height * 0.60;
            }

            const wx = cx - wW * 0.5;
            const isArched = style === 'classical-cream-brick';

            if (isArched) {
                const archR = wW * 0.5;
                const archCy = wy + archR;

                // Limestone sill at bottom of window (wy + wH)
                dCtx.fillStyle = `#${trimColor.getHexString()}`;
                dCtx.fillRect(wx - 8, wy + wH, wW + 16, 14);
                bCtx.fillStyle = '#ffffff';
                bCtx.fillRect(wx - 8, wy + wH, wW + 16, 14);

                // Brick archivolt surround & keystone at top of arch
                dCtx.fillStyle = `#${trimColor.clone().multiplyScalar(0.96).getHexString()}`;
                dCtx.beginPath();
                dCtx.arc(cx, archCy, archR + 9, Math.PI, 0, false);
                dCtx.lineTo(wx + wW + 9, wy + wH);
                dCtx.lineTo(wx - 9, wy + wH);
                dCtx.closePath();
                dCtx.fill();

                // Projecting trapezoidal keystone at crown of arch
                dCtx.fillStyle = `#${trimColor.getHexString()}`;
                dCtx.beginPath();
                dCtx.moveTo(cx - 9, wy - 14);
                dCtx.lineTo(cx + 9, wy - 14);
                dCtx.lineTo(cx + 6, wy + 5);
                dCtx.lineTo(cx - 6, wy + 5);
                dCtx.closePath();
                dCtx.fill();
                bCtx.fillStyle = '#ffffff';
                bCtx.fillRect(cx - 7, wy - 14, 14, 18);

                // Arched recessed glass pane
                const grad = dCtx.createLinearGradient(wx, wy, wx + wW, wy + wH);
                grad.addColorStop(0, '#1f3347');
                grad.addColorStop(0.5, '#2d4963');
                grad.addColorStop(1, '#182838');

                const fillArchedPane = (ctx, fillStyle, inset = 0) => {
                    ctx.fillStyle = fillStyle;
                    ctx.beginPath();
                    ctx.arc(cx, archCy, Math.max(2, archR - inset), Math.PI, 0, false);
                    ctx.lineTo(wx + wW - inset, wy + wH - inset);
                    ctx.lineTo(wx + inset, wy + wH - inset);
                    ctx.closePath();
                    ctx.fill();
                };

                fillArchedPane(dCtx, grad, 0);
                fillArchedPane(rCtx, '#181818', 0);
                fillArchedPane(bCtx, '#151515', 0);

                // White window frame, arched transom bar & blind upper sash matching 400 Douglas photos
                dCtx.strokeStyle = '#ebe6d8';
                dCtx.lineWidth = 4;
                dCtx.beginPath();
                dCtx.arc(cx, archCy, archR - 2, Math.PI, 0, false);
                dCtx.lineTo(wx + wW - 2, wy + wH - 2);
                dCtx.lineTo(wx + 2, wy + wH - 2);
                dCtx.closePath();
                dCtx.stroke();

                dCtx.beginPath();
                dCtx.moveTo(wx + 2, archCy);
                dCtx.lineTo(wx + wW - 2, archCy);
                dCtx.stroke();

                const litSeed = Math.abs(Math.sin((i + 1) * 91.7));
                if (litSeed > 0.22) {
                    const warmColors = ['#ffdfa8', '#ffe9c4', '#ffd28a', '#cfe6ff'];
                    fillArchedPane(eCtx, warmColors[i % warmColors.length], 5);
                    eCtx.fillStyle = '#000000';
                    eCtx.fillRect(wx, archCy - 2, wW, 4);
                }
                continue;
            }

            // Window sill & lintel
            dCtx.fillStyle = `#${trimColor.getHexString()}`;
            dCtx.fillRect(wx - 6, wy - 10, wW + 12, 10);
            dCtx.fillRect(wx - 8, wy + wH, wW + 16, 12);
            bCtx.fillStyle = '#ffffff';
            bCtx.fillRect(wx - 6, wy - 10, wW + 12, 10);
            bCtx.fillRect(wx - 8, wy + wH, wW + 16, 12);

            // Recessed window glass pane
            const grad = dCtx.createLinearGradient(wx, wy, wx + wW, wy + wH);
            grad.addColorStop(0, '#1e354d');
            grad.addColorStop(0.45, '#2c4d6e');
            grad.addColorStop(0.55, '#172a3d');
            grad.addColorStop(1, '#3b648c');
            dCtx.fillStyle = grad;
            dCtx.fillRect(wx, wy, wW, wH);

            rCtx.fillStyle = '#181818';
            rCtx.fillRect(wx, wy, wW, wH);
            bCtx.fillStyle = '#151515';
            bCtx.fillRect(wx, wy, wW, wH);

            // Window mullions / muntins
            dCtx.strokeStyle = style === 'historic-brick-limestone' ? '#ebe5d8' : '#3a434d';
            dCtx.lineWidth = 4;
            dCtx.strokeRect(wx, wy, wW, wH);
            dCtx.beginPath();
            dCtx.moveTo(wx + wW * 0.5, wy);
            dCtx.lineTo(wx + wW * 0.5, wy + wH);
            dCtx.moveTo(wx, wy + wH * 0.45);
            dCtx.lineTo(wx + wW, wy + wH * 0.45);
            dCtx.stroke();

            // Interior warm office glow in emissive map
            const litSeed = Math.abs(Math.sin((i + 1) * 91.7));
            if (litSeed > 0.22) {
                const warmColors = ['#ffdfa8', '#ffe9c4', '#ffd28a', '#cfe6ff'];
                eCtx.fillStyle = warmColors[i % warmColors.length];
                eCtx.fillRect(wx + 4, wy + 4, wW - 8, wH - 8);
                eCtx.fillStyle = '#000000';
                eCtx.fillRect(wx + wW * 0.5 - 2, wy, 4, wH);
                eCtx.fillRect(wx, wy + wH * 0.45 - 2, wW, 4);
            }
        }

        const makeTex = (canvas, isSRGB = false) => {
            const t = new THREE.CanvasTexture(canvas);
            t.wrapS = THREE.RepeatWrapping;
            t.wrapT = THREE.RepeatWrapping;
            t.anisotropy = 8;
            if (isSRGB) t.colorSpace = THREE.SRGBColorSpace;
            return t;
        };

        return {
            map: makeTex(diffCanvas, true),
            bumpMap: makeTex(bumpCanvas, false),
            roughnessMap: makeTex(roughCanvas, false),
            emissiveMap: makeTex(emisCanvas, true)
        };
    }

    getWallMaterial(style, colorHex, trimHex) {
        const key = `${style}_${colorHex}_${trimHex}`;
        if (this.materialCache.has(key)) {
            return this.materialCache.get(key);
        }

        const maps = this.createFacadeTextures(style, colorHex, trimHex);
        const mat = new THREE.MeshStandardMaterial({
            name: `Wall_${style}`,
            map: maps.map,
            bumpMap: maps.bumpMap,
            bumpScale: 0.18 * this.customConfig.mortarDepth,
            roughnessMap: maps.roughnessMap,
            roughness: 0.82,
            metalness: 0.12,
            emissive: new THREE.Color('#ffcf87'),
            emissiveMap: maps.emissiveMap,
            emissiveIntensity: this.customConfig.windowGlow
        });

        this.materialCache.set(key, mat);
        return mat;
    }

    updateFoundrySettings({ mortarDepth, windowGlow, brickScale, nightFactor } = {}) {
        if (mortarDepth !== undefined) this.customConfig.mortarDepth = mortarDepth;
        if (windowGlow !== undefined) this.customConfig.windowGlow = windowGlow;
        if (brickScale !== undefined) this.customConfig.brickScale = brickScale;
        if (nightFactor !== undefined) this.nightFactor = nightFactor;

        for (const mat of this.materialCache.values()) {
            mat.bumpScale = 0.22 * this.customConfig.mortarDepth;
            mat.emissiveIntensity = this.customConfig.windowGlow + this.nightFactor * 1.15;
            mat.needsUpdate = true;
        }
    }

    buildCampusBuildingMesh(building, terrainY = 0, getTerrainHeightFn = null) {
        const group = new THREE.Group();
        group.name = building.id;
        group.userData = { building };

        const pts = building.footprint;
        if (!pts || pts.length < 3) return group;

        const cx = building.center[0];
        const cz = building.center[1];
        const height = building.height || 12;
        const floors = building.floors || Math.max(1, Math.round(height / 4.2));
        const baseElev = building.baseElevation || 0.35;

        const shape = new THREE.Shape();
        pts.forEach((pt, idx) => {
            const lx = pt[0] - cx;
            const ly = -(pt[1] - cz);
            if (idx === 0) shape.moveTo(lx, ly);
            else shape.lineTo(lx, ly);
        });
        shape.closePath();

        const trimMat = new THREE.MeshStandardMaterial({
            color: building.trimColor || '#dcd6cc',
            roughness: 0.78,
            metalness: 0.05
        });

        const wallMat = this.getWallMaterial(
            building.wallStyle || 'civic-brick-precast',
            building.color || '#a45a49',
            building.trimColor || '#dcd6cc'
        );

        const roofMat = new THREE.MeshStandardMaterial({
            color: '#3c4045',
            roughness: 0.9,
            metalness: 0.1,
            bumpMap: this.baseTextures.brickBump,
            bumpScale: 0.04
        });

        // Photo-Realistic Custom Architecture for Building 400 (400 Douglas St — County Administration)
        if (building.id === 'building-400' || building.code === '400') {
            this._buildPhotoRealisticBuilding400(group, building, shape, wallMat, trimMat, terrainY, getTerrainHeightFn);
            optimizeBuildingGroup(group, building);
            group.position.set(cx, terrainY, cz);
            return group;
        }

        // Photo-Realistic Custom Architecture for Building 316 (316 Washington St — Community Development & Public Works)
        if (building.id === 'building-316' || building.code === '316') {
            this._buildPhotoRealisticBuilding316(group, building, shape, wallMat, trimMat, terrainY, getTerrainHeightFn);
            optimizeBuildingGroup(group, building);
            group.position.set(cx, terrainY, cz);
            return group;
        }

        // Photo-Realistic Custom Architecture for Building 300 (300 Washington St — Juvenile Justice Center & Rear Gymnasium)
        if (building.id === 'building-300' || building.code === '300') {
            this._buildPhotoRealisticBuilding300(group, building, shape, wallMat, trimMat, terrainY, getTerrainHeightFn);
            optimizeBuildingGroup(group, building);
            group.position.set(cx, terrainY, cz);
            return group;
        }

        // Photo-Realistic Custom Architecture for Building 428 (428 Orondo Ave — Campus Annex)
        if (building.id === 'building-428' || building.code === '428') {
            this._buildPhotoRealisticBuilding428(group, building, shape, wallMat, trimMat, terrainY, getTerrainHeightFn);
            optimizeBuildingGroup(group, building);
            group.position.set(cx, terrainY, cz);
            return group;
        }

        // Photo-Realistic Custom Architecture for Building 411/412 (410/411/412 Washington St — Natural Resources & WSU Extension)
        if (building.id === 'building-411-412' || building.code === '411/412') {
            this._buildPhotoRealisticBuilding411_412(group, building, shape, wallMat, trimMat, terrainY, getTerrainHeightFn);
            optimizeBuildingGroup(group, building);
            group.position.set(cx, terrainY, cz);
            return group;
        }

        // Photo-Realistic Custom Architecture for Building 350 (350 Orondo Ave — Chelan County Courthouse)
        if (building.id === 'courthouse-350' || building.code === '350') {
            this._buildPhotoRealisticBuilding350(group, building, shape, wallMat, trimMat, terrainY, getTerrainHeightFn);
            optimizeBuildingGroup(group, building);
            group.position.set(cx, terrainY, cz);
            return group;
        }

        // Photo-Realistic Custom Architecture for Regional Justice Center — West Wing (413–415 Washington St / CCRJ-W)
        if (building.id === 'regional-jail-west' || building.code === 'CCRJ-W') {
            this._buildPhotoRealisticWestWing(group, building, shape, wallMat, trimMat, terrainY, getTerrainHeightFn);
            optimizeBuildingGroup(group, building);
            group.position.set(cx, terrainY, cz);
            return group;
        }

        // Photo-Realistic Custom Architecture for Building 401 (401 Washington St — Law & Justice / Regional Justice Center)
        if (building.id === 'regional-jail-east' || building.code === '401') {
            this._buildPhotoRealisticBuilding401(group, building, shape, wallMat, trimMat, terrainY, getTerrainHeightFn);
            optimizeBuildingGroup(group, building);
            group.position.set(cx, terrainY, cz);
            return group;
        }

        // Split-Level Construction for Washington St Buildings (350 and 401):
        // Floor 1 (Layer 1) is the Basement / Lower Level below Washington St road grade (-4.2m to 0m);
        // Floor 2 (Layer 2) sits flush with Washington St road level (0m to +4.2m);
        // Upper floors (Layers 3..N) stack above Floor 2.
        const isSplitRoadBuilding =
            building.id === 'courthouse-350' ||
            building.code === '350' ||
            building.id === 'regional-jail-east' ||
            building.code === '401';

        if (isSplitRoadBuilding) {
            this._buildSplitLevelRoadBuilding(group, building, shape, wallMat, roofMat, trimMat, floors);
            group.position.set(cx, terrainY, cz);
            return group;
        }

        // 1. Foundation Plinth Base (extends 4.5m below terrain grade so hillside slopes never leave gaps)
        const plinthGeo = new THREE.ExtrudeGeometry(shape, {
            depth: baseElev + 5.1,
            bevelEnabled: true,
            bevelThickness: 0.15,
            bevelSize: 0.25,
            bevelSegments: 2
        });
        plinthGeo.rotateX(-Math.PI / 2);

        const plinthMesh = new THREE.Mesh(plinthGeo, trimMat);
        plinthMesh.position.y = -4.5;
        plinthMesh.castShadow = true;
        plinthMesh.receiveShadow = true;
        group.add(plinthMesh);

        // 2. Main Structural Extrusion with World-Space Facade UVs
        const bodyGeo = new THREE.ExtrudeGeometry(shape, {
            depth: height,
            bevelEnabled: false
        });
        bodyGeo.rotateX(-Math.PI / 2);
        this._applyArchitecturalUVs(bodyGeo, height, floors);

        const bodyMesh = new THREE.Mesh(bodyGeo, [roofMat, wallMat]);
        bodyMesh.position.y = baseElev;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        bodyMesh.userData = { isSelectableBuilding: true, building };
        group.add(bodyMesh);

        // 3. Cornice / Roof Parapet Ledge (sits just below roof cap so dark roof deck & HVAC stand out)
        const corniceGeo = new THREE.ExtrudeGeometry(shape, {
            depth: 0.7,
            bevelEnabled: true,
            bevelThickness: 0.18,
            bevelSize: 0.42,
            bevelSegments: 2
        });
        corniceGeo.rotateX(-Math.PI / 2);
        const corniceMesh = new THREE.Mesh(corniceGeo, trimMat);
        corniceMesh.position.y = baseElev + height - 0.82;
        corniceMesh.castShadow = true;
        corniceMesh.receiveShadow = true;
        group.add(corniceMesh);

        // 4. Mid-building floor belt course for tall buildings
        if (floors >= 4) {
            const beltGeo = new THREE.ExtrudeGeometry(shape, {
                depth: 0.35,
                bevelEnabled: true,
                bevelThickness: 0.1,
                bevelSize: 0.22,
                bevelSegments: 1
            });
            beltGeo.rotateX(-Math.PI / 2);
            const beltMesh = new THREE.Mesh(beltGeo, trimMat);
            beltMesh.position.y = baseElev + (height / floors);
            beltMesh.castShadow = true;
            group.add(beltMesh);
        }

        // 5. Rooftop Mechanical Penthouse & HVAC Units
        this._addRooftopDetails(group, building, baseElev + height, trimMat);

        group.position.set(cx, terrainY, cz);
        return group;
    }

    buildContextBuildingsBatch(contextBuildings, getTerrainHeightFn = () => 0) {
        const group = new THREE.Group();
        group.name = 'ContextBuildingsGroup';

        const commGeos = [];
        const resGeos = [];

        contextBuildings.forEach((building) => {
            const pts = building.footprint;
            if (!pts || pts.length < 3) return;

            const cx = building.center[0];
            const cz = building.center[1];
            const height = building.height || 6.5;
            const ty = getTerrainHeightFn(cx, cz);

            const shape = new THREE.Shape();
            pts.forEach((pt, idx) => {
                const lx = pt[0] - cx;
                const ly = -(pt[1] - cz);
                if (idx === 0) shape.moveTo(lx, ly);
                else shape.lineTo(lx, ly);
            });
            shape.closePath();

            const geo = new THREE.ExtrudeGeometry(shape, {
                depth: height + 3.0,
                bevelEnabled: false
            });
            geo.rotateX(-Math.PI / 2);
            geo.translate(cx, ty - 3.0, cz);

            const isCommercial = building.type === 'commercial' || building.type === 'retail';
            if (isCommercial) commGeos.push(geo);
            else resGeos.push(geo);
        });

        if (commGeos.length > 0) {
            const commMesh = new THREE.Mesh(
                mergeGeometries(commGeos, false),
                new THREE.MeshLambertMaterial({ color: '#c8beb2' })
            );
            commMesh.receiveShadow = true;
            group.add(commMesh);
        }

        if (resGeos.length > 0) {
            const resMesh = new THREE.Mesh(
                mergeGeometries(resGeos, false),
                new THREE.MeshLambertMaterial({ color: '#d6d1c9' })
            );
            resMesh.receiveShadow = true;
            group.add(resMesh);
        }

        return group;
    }

    _applyArchitecturalUVs(geometry, height, floors) {
        const pos = geometry.attributes.position;
        const norm = geometry.attributes.normal;
        const uv = geometry.attributes.uv;
        const uScale = 1 / (14.0 * this.customConfig.brickScale);
        const vScale = floors / height;

        for (let i = 0; i < pos.count; i++) {
            const nx = norm.getX(i);
            const ny = norm.getY(i);
            const nz = norm.getZ(i);
            const vx = pos.getX(i);
            const vy = pos.getY(i);
            const vz = pos.getZ(i);

            if (Math.abs(ny) > 0.75) {
                uv.setXY(i, vx * 0.08, vz * 0.08);
            } else {
                const horiz = Math.abs(nx) > Math.abs(nz) ? vz : vx;
                uv.setXY(i, horiz * uScale, vy * vScale);
            }
        }
        uv.needsUpdate = true;
    }

    _addRooftopDetails(group, building, roofY, trimMat) {
        const hvacMat = new THREE.MeshStandardMaterial({
            color: '#7c858e',
            roughness: 0.55,
            metalness: 0.45
        });

        const pentW = building.floors >= 4 ? 9.5 : 6.0;
        const pentD = building.floors >= 4 ? 7.5 : 5.0;
        const pentH = building.floors >= 4 ? 3.4 : 2.2;

        const pentGeo = new THREE.BoxGeometry(pentW, pentH, pentD);
        const pentMesh = new THREE.Mesh(pentGeo, trimMat);
        pentMesh.position.set(0, roofY + pentH * 0.5, 0);
        pentMesh.castShadow = true;
        pentMesh.receiveShadow = true;
        group.add(pentMesh);

        for (let i = -1; i <= 1; i += 2) {
            const unitGeo = new THREE.BoxGeometry(3.2, 1.4, 2.4);
            const unit = new THREE.Mesh(unitGeo, hvacMat);
            unit.position.set(i * (pentW * 0.85), roofY + 0.7, i * 2.5);
            unit.castShadow = true;
            group.add(unit);

            const fanGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.25, 16);
            const fanMat = new THREE.MeshStandardMaterial({ color: '#2b3036', roughness: 0.4, metalness: 0.7 });
            const fan = new THREE.Mesh(fanGeo, fanMat);
            fan.position.set(0, 0.75, 0);
            unit.add(fan);
        }
    }

    /**
     * Constructs Washington St Split-Level Buildings (400, 350, and 401) as stacked architectural layers where:
     * - Layer 1 (Floor 1 — Basement: y = -4.2m to 0.0m) sits below Washington St road grade
     * - Layer 2 (Floor 2 — Road Level: y = 0.0m to +4.2m) sits flush with Washington St road level
     * - Layers 3..N (Upper Levels) stack above Floor 2
     */
    _buildSplitLevelRoadBuilding(group, building, shape, wallMat, roofMat, trimMat, totalFloors = 3) {
        const storyH = 4.2;

        // Slightly darker fortified masonry/stone material for the 1st-Floor Basement Level below road grade
        const baseColorObj = new THREE.Color(building.color || '#a45a49').multiplyScalar(0.76);
        const basementWallMat = this.getWallMaterial(
            building.wallStyle || 'civic-brick-precast',
            `#${baseColorObj.getHexString()}`,
            building.trimColor || '#dcd6cc'
        );

        // Sub-foundation footing below Layer 1 (-6.5m to -4.15m)
        const footingGeo = new THREE.ExtrudeGeometry(shape, {
            depth: 2.35,
            bevelEnabled: true,
            bevelThickness: 0.12,
            bevelSize: 0.22,
            bevelSegments: 2
        });
        footingGeo.rotateX(-Math.PI / 2);
        const footingMesh = new THREE.Mesh(footingGeo, trimMat);
        footingMesh.position.y = -6.5;
        footingMesh.receiveShadow = true;
        group.add(footingMesh);

        // Washington St Road-Level (Floor 2, y = 0.0m) Entry Plazas & Lower Basement Patios (y = -4.2m)
        const courtMat = new THREE.MeshStandardMaterial({
            color: '#cfc9be',
            roughness: 0.85,
            metalness: 0.05
        });
        const courtGroup = new THREE.Group();
        courtGroup.rotation.y = -0.635; // Aligned with Washington St (-36.5 deg)

        if (building.id === 'building-400' || building.code === '400') {
            const lowerPatio = new THREE.Mesh(new THREE.BoxGeometry(20.0, 0.25, 11.0), courtMat);
            lowerPatio.position.set(-3.5, -4.25, 5.2);
            lowerPatio.receiveShadow = true;
            courtGroup.add(lowerPatio);

            const roadBridgeNE = new THREE.Mesh(new THREE.BoxGeometry(31.0, 0.28, 3.6), trimMat);
            roadBridgeNE.position.set(2.0, -0.05, -6.2);
            roadBridgeNE.castShadow = true;
            roadBridgeNE.receiveShadow = true;
            courtGroup.add(roadBridgeNE);

            const roadBridgeSE = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.28, 17.5), trimMat);
            roadBridgeSE.position.set(12.2, -0.05, 1.5);
            roadBridgeSE.castShadow = true;
            roadBridgeSE.receiveShadow = true;
            courtGroup.add(roadBridgeSE);
        } else if (building.id === 'courthouse-350' || building.code === '350') {
            // Road-level 2nd Floor entry apron on SW side facing Washington St (y = 0.0m)
            const washRoadApron = new THREE.Mesh(new THREE.BoxGeometry(43.5, 0.30, 4.5), trimMat);
            washRoadApron.position.set(0.0, -0.05, 14.2);
            washRoadApron.castShadow = true;
            washRoadApron.receiveShadow = true;
            courtGroup.add(washRoadApron);

            // Lower-level Basement walk-out terrace on NE side facing Courthouse Park (y = -4.2m)
            const lowerParkTerrace = new THREE.Mesh(new THREE.BoxGeometry(43.5, 0.25, 6.0), courtMat);
            lowerParkTerrace.position.set(0.0, -4.25, -15.0);
            lowerParkTerrace.receiveShadow = true;
            courtGroup.add(lowerParkTerrace);
        } else if (building.id === 'regional-jail-east' || building.code === '401') {
            // Road-level 2nd Floor entry apron on SW side facing Washington St (y = 0.0m)
            const washRoadApron = new THREE.Mesh(new THREE.BoxGeometry(62.0, 0.30, 4.2), trimMat);
            washRoadApron.position.set(18.0, -0.05, 19.0);
            washRoadApron.castShadow = true;
            washRoadApron.receiveShadow = true;
            courtGroup.add(washRoadApron);

            // Lower-level Basement service apron on NE side (y = -4.2m)
            const lowerServiceApron = new THREE.Mesh(new THREE.BoxGeometry(56.0, 0.25, 6.5), courtMat);
            lowerServiceApron.position.set(18.0, -4.25, -20.5);
            lowerServiceApron.receiveShadow = true;
            courtGroup.add(lowerServiceApron);
        }
        group.add(courtGroup);

        // Build each story layer:
        // Floor 1 (index = 1): yStart = -storyH (-4.2m to -0.16m) -> Basement below Washington St road level
        // Floor 2 (index = 2): yStart = +0.16m (+0.16m to +4.2m) -> Washington St Road Level
        // Floor k (index = k): yStart = (k - 2) * storyH + 0.16m -> Upper floors
        for (let floorIdx = 1; floorIdx <= totalFloors; floorIdx++) {
            const yStart = floorIdx === 1 ? -storyH : (floorIdx - 2) * storyH + 0.16;
            const layerH = storyH - 0.18;

            const layerGeo = new THREE.ExtrudeGeometry(shape, {
                depth: layerH,
                bevelEnabled: false
            });
            layerGeo.rotateX(-Math.PI / 2);
            this._applyArchitecturalUVs(layerGeo, layerH, 1);

            const matForLayer = floorIdx === 1 ? basementWallMat : wallMat;
            const layerMesh = new THREE.Mesh(layerGeo, [roofMat, matForLayer]);
            layerMesh.name = floorIdx === 1
                ? 'Layer1_Basement_BelowRoad'
                : (floorIdx === 2 ? 'Layer2_WashingtonSt_RoadLevel' : `Layer${floorIdx}_UpperLevel`);
            layerMesh.position.y = yStart;
            layerMesh.castShadow = true;
            layerMesh.receiveShadow = true;
            layerMesh.userData = { isSelectableBuilding: true, building, floorLayer: floorIdx };
            group.add(layerMesh);
        }

        // Prominent precast horizontal floor-slab bands between every story:
        // Especially bold water-table ledge at y = 0.0m (separating Floor 1 Basement from Floor 2 Road Level)
        for (let floorIdx = 1; floorIdx < totalFloors; floorIdx++) {
            const isRoadLevelDatum = floorIdx === 1;
            const slabY = isRoadLevelDatum ? -0.18 : (floorIdx - 1) * storyH - 0.04;
            const slabDepth = isRoadLevelDatum ? 0.36 : 0.28;
            const slabOverhang = isRoadLevelDatum ? 0.38 : 0.24;

            const slabGeo = new THREE.ExtrudeGeometry(shape, {
                depth: slabDepth,
                bevelEnabled: true,
                bevelThickness: 0.08,
                bevelSize: slabOverhang,
                bevelSegments: 2
            });
            slabGeo.rotateX(-Math.PI / 2);
            const slabMesh = new THREE.Mesh(slabGeo, trimMat);
            slabMesh.position.y = slabY;
            slabMesh.castShadow = true;
            slabMesh.receiveShadow = true;
            group.add(slabMesh);
        }

        // Top Roof Parapet Cornice above the top story (y = (totalFloors - 1) * storyH)
        const topY = (totalFloors - 1) * storyH;
        const corniceGeo = new THREE.ExtrudeGeometry(shape, {
            depth: 0.65,
            bevelEnabled: true,
            bevelThickness: 0.16,
            bevelSize: 0.40,
            bevelSegments: 2
        });
        corniceGeo.rotateX(-Math.PI / 2);
        const corniceMesh = new THREE.Mesh(corniceGeo, trimMat);
        corniceMesh.position.y = topY - 0.72;
        corniceMesh.castShadow = true;
        corniceMesh.receiveShadow = true;
        group.add(corniceMesh);

        // Rooftop Mechanical Penthouse & HVAC on top of the highest story
        this._addRooftopDetails(group, building, topY, trimMat);
    }

    _createTextPlaqueTexture(lines, bgHex = '#ebe5d6', textHex = '#2a2825', width = 512, height = 128) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = bgHex;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = 'rgba(90, 82, 70, 0.35)';
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, width - 8, height - 8);

        ctx.fillStyle = textHex;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (lines.length === 1) {
            ctx.font = 'bold 48px Georgia, "Times New Roman", serif';
            ctx.fillText(lines[0], width * 0.5, height * 0.52);
        } else {
            ctx.font = 'bold 42px Georgia, "Times New Roman", serif';
            ctx.fillText(lines[0], width * 0.5, height * 0.34);
            ctx.font = 'bold 34px Georgia, "Times New Roman", serif';
            ctx.fillText(lines[1], width * 0.5, height * 0.72);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        return tex;
    }

    /**
     * Photo-realistic reconstruction of Building 400 (400 Douglas St — Chelan County Administration Building)
     * Modeled directly from reference photographs in /photos:
     * - Pale cream/buff running-bond brick (#dfd5bc) with arched main-floor windows & limestone keystones
     * - 3-layer split-level massing (Floor 1 sunken basement, Floor 2 at road level, Floor 3 upper story)
     * - Front Neo-Classical Portico facing Douglas St (+Z in local theta=0.94692 rad frame) with 4 columns,
     *   "CHELAN COUNTY" entablature frieze, slate-shingled triangular pediment, recessed 3-bay entry doors & transoms,
     *   and "400 DOUGLAS STREET" corner wall signage
     * - Front forecourt concrete plaza with 5-step main stairs + side corner stairs, black metal handrails,
     *   raised white-concrete-curbed corner grass planter, left grass strip, 2 square concrete planter boxes,
     *   black pole globe lanterns, and corner sidewalk bollards
     * - Washington St (+X) sunken basement lightwell with 7 cream-brick piers, black wrought-iron picket fencing,
     *   and 6 globe post lamps
     * - Bright white elastomeric roof membrane with raised front penthouse monitor, 4 pyramid-capped white cupolas,
     *   and rooftop AC condenser units
     */

    _buildPhotoRealisticBuilding400(group, building, shape, wallMat, trimMat, terrainY = 0, getTerrainHeightFn = null) {
        buildPhotoRealisticBuilding400(this, group, building, shape, wallMat, trimMat, terrainY, getTerrainHeightFn);
    }

    _buildPhotoRealisticBuilding316(group, building, shape, wallMat, trimMat, terrainY = 0, getTerrainHeightFn = null) {
        buildPhotoRealisticBuilding316(this, group, building, shape, wallMat, trimMat, terrainY, getTerrainHeightFn);
    }

    _buildPhotoRealisticBuilding300(group, building, shape, wallMat, trimMat, terrainY = 0, getTerrainHeightFn = null) {
        buildPhotoRealisticBuilding300(this, group, building, shape, wallMat, trimMat, terrainY, getTerrainHeightFn);
    }

    _buildPhotoRealisticBuilding428(group, building, shape, wallMat, trimMat, terrainY = 0, getTerrainHeightFn = null) {
        buildPhotoRealisticBuilding428(this, group, building, shape, wallMat, trimMat, terrainY, getTerrainHeightFn);
    }

    _buildPhotoRealisticBuilding411_412(group, building, shape, wallMat, trimMat, terrainY = 0, getTerrainHeightFn = null) {
        buildPhotoRealisticBuilding411_412(this, group, building, shape, wallMat, trimMat, terrainY, getTerrainHeightFn);
    }

    _buildPhotoRealisticBuilding350(group, building, shape, wallMat, trimMat, terrainY = 0, getTerrainHeightFn = null) {
        buildPhotoRealisticBuilding350(this, group, building, shape, wallMat, trimMat, terrainY, getTerrainHeightFn);
    }

    _buildPhotoRealisticWestWing(group, building, shape, wallMat, trimMat, terrainY = 0, getTerrainHeightFn = null) {
        buildPhotoRealisticWestWing(this, group, building, shape, wallMat, trimMat, terrainY, getTerrainHeightFn);
    }

    _buildPhotoRealisticBuilding401(group, building, shape, wallMat, trimMat, terrainY = 0, getTerrainHeightFn = null) {
        buildPhotoRealisticBuilding401(this, group, building, shape, wallMat, trimMat, terrainY, getTerrainHeightFn);
    }
}