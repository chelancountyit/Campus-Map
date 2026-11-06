import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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
            group.position.set(cx, terrainY, cz);
            return group;
        }

        // Photo-Realistic Custom Architecture for Building 316 (316 Washington St — Community Development & Public Works)
        if (building.id === 'building-316' || building.code === '316') {
            this._buildPhotoRealisticBuilding316(group, building, shape, wallMat, trimMat, terrainY, getTerrainHeightFn);
            group.position.set(cx, terrainY, cz);
            return group;
        }

        // Photo-Realistic Custom Architecture for Building 300 (300 Washington St — Juvenile Justice Center & Rear Gymnasium)
        if (building.id === 'building-300' || building.code === '300') {
            this._buildPhotoRealisticBuilding300(group, building, shape, wallMat, trimMat, terrainY, getTerrainHeightFn);
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
        const storyH = 4.2;

        // Materials matched to /photos of 400 Douglas St
        const whiteRoofMat = new THREE.MeshStandardMaterial({
            color: '#f1f3f5',
            roughness: 0.78,
            metalness: 0.04
        });

        // High-res 512x512 running-bond pale cream brick color & mortar bump textures (353a55d7.jpg, 3b9c07db.jpg)
        const solidBrickCanvas = document.createElement('canvas');
        solidBrickCanvas.width = 512;
        solidBrickCanvas.height = 512;
        const sbCtx = solidBrickCanvas.getContext('2d');
        sbCtx.fillStyle = '#8b8374'; // Recessed historic gray-taupe mortar joint color
        sbCtx.fillRect(0, 0, 512, 512);

        const brickBumpCanvas = document.createElement('canvas');
        brickBumpCanvas.width = 512;
        brickBumpCanvas.height = 512;
        const bbCtx = brickBumpCanvas.getContext('2d');
        bbCtx.fillStyle = '#181818'; // Deep mortar groove in bump map
        bbCtx.fillRect(0, 0, 512, 512);

        const baseBrickCol = new THREE.Color(building.color || '#dfd5bc');
        for (let r = 0; r < 32; r++) {
            const off = (r % 2) * 16;
            for (let c = -1; c <= 16; c++) {
                const jitter = ((Math.sin(r * 19.7 + c * 37.3) * 43758.5) % 1) * 0.045 - 0.022;
                const bc = baseBrickCol.clone().offsetHSL(0, jitter * 0.25, jitter);
                const bx = c * 32 + off + 2;
                const by = r * 16 + 2;
                sbCtx.fillStyle = `#${bc.getHexString()}`;
                sbCtx.fillRect(bx, by, 29, 13);
                // Subtle top highlight & bottom shadow on each brick course
                sbCtx.fillStyle = 'rgba(255,255,255,0.14)';
                sbCtx.fillRect(bx, by, 29, 1.5);
                sbCtx.fillStyle = 'rgba(40,34,26,0.14)';
                sbCtx.fillRect(bx, by + 11.5, 29, 1.5);

                const bGray = Math.round(215 + jitter * 500);
                bbCtx.fillStyle = `rgb(${bGray},${bGray},${bGray})`;
                bbCtx.fillRect(bx, by, 29, 13);
            }
        }
        const solidBrickTex = new THREE.CanvasTexture(solidBrickCanvas);
        solidBrickTex.wrapS = THREE.RepeatWrapping;
        solidBrickTex.wrapT = THREE.RepeatWrapping;
        solidBrickTex.repeat.set(2.5, 2.5);
        solidBrickTex.colorSpace = THREE.SRGBColorSpace;

        const solidBrickBumpTex = new THREE.CanvasTexture(brickBumpCanvas);
        solidBrickBumpTex.wrapS = THREE.RepeatWrapping;
        solidBrickBumpTex.wrapT = THREE.RepeatWrapping;
        solidBrickBumpTex.repeat.set(2.5, 2.5);

        const creamBrickSolidMat = new THREE.MeshStandardMaterial({
            map: solidBrickTex,
            bumpMap: solidBrickBumpTex,
            bumpScale: 0.14,
            roughness: 0.82,
            metalness: 0.04
        });
        const plinthConcreteMat = new THREE.MeshStandardMaterial({
            color: '#d5d0c5',
            roughness: 0.88,
            metalness: 0.03,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
        const slateGableMat = new THREE.MeshStandardMaterial({
            color: '#535961',
            bumpMap: this.baseTextures.brickBump,
            bumpScale: 0.06,
            roughness: 0.82,
            metalness: 0.08
        });
        const plazaConcreteMat = new THREE.MeshStandardMaterial({
            color: '#e2dcd0',
            roughness: 0.86,
            metalness: 0.03,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
        const whiteCurbMat = new THREE.MeshStandardMaterial({
            color: '#f2eee6',
            roughness: 0.75,
            metalness: 0.04
        });
        const turfMat = new THREE.MeshLambertMaterial({
            color: '#4b8638'
        });
        const darkMetalMat = new THREE.MeshStandardMaterial({
            color: '#1e2226',
            roughness: 0.45,
            metalness: 0.65
        });
        const galvSteelMat = new THREE.MeshStandardMaterial({
            color: '#aeb6be',
            roughness: 0.38,
            metalness: 0.75
        });
        const blueTreadMat = new THREE.MeshStandardMaterial({
            color: '#6e8294',
            roughness: 0.7,
            metalness: 0.25
        });
        const bronzePlaqueMat = new THREE.MeshStandardMaterial({
            color: '#3d2f24',
            roughness: 0.42,
            metalness: 0.68
        });
        const globeMat = new THREE.MeshBasicMaterial({
            color: '#fffdf5'
        });
        const glassMat = new THREE.MeshStandardMaterial({
            color: '#1b2e40',
            roughness: 0.2,
            metalness: 0.35
        });

        // Build custom photo-accurate stepped footprint for Building 400 (in group's 2D shape coordinates):
        // - Front Wall (+Z facing Douglas St): central portico wall (lx = -0.35m..+9.35m) projects to lz = +14.62m (wallZ),
        //   while both the Left Front Wing (lx = -3.24m..-0.35m) and Right Front Wing (lx = +9.35m..+12.61m) are indented
        //   back to lz = +14.14m (frontWingZ = wallZ - 0.48m), matching the stepped pavilion profile of the side walls (de2d6e09.jpg & aec26a69.jpg)!
        // - Washington St (+X) & SW (-X) Side Walls: Front & Rear Corner Pavilions step out to lx = +12.61m / -3.24m,
        //   while the Central Arched-Window Bays are indented at lx = +12.25m / -2.86m.
        const cosArch = 0.584197;
        const sinArch = 0.811612;
        const wallZ = 14.62;
        const frontIndentZ = 0.48;
        const frontWingZ = wallZ - frontIndentZ; // 14.14m
        const bldg400LocalPts = [
            [-3.24, frontWingZ], // Front-left wing outer corner
            [-0.35, frontWingZ], // Front-left indentation inner corner
            [-0.35, wallZ],      // Central front wall left corner (behind portico)
            [9.35, wallZ],       // Central front wall right corner (behind portico)
            [9.35, frontWingZ],  // Front-right indentation inner corner
            [12.61, frontWingZ], // Front-right wing outer corner (Washington St Front Pavilion)
            [12.61, 7.30],       // Washington St Front Pavilion step-in
            [12.25, 7.30],       // Washington St Central Bay front corner
            [12.25, -11.20],     // Washington St Central Bay rear corner
            [12.61, -11.20],     // Washington St Rear Pavilion step-out
            [12.61, -16.64],     // Washington St Rear Pavilion rear corner
            [-5.35, -16.64],     // SW Rear Box (Stair/Mechanical Tower) rear corner (+1m toward SW parking area)
            [-5.35, -11.20],     // SW Rear Box front step-out corner (closes SW sunken lightwell trench)
            [-2.86, -11.20],     // SW Central Bay rear corner
            [-2.86, 7.30],       // SW Central Bay front corner
            [-3.24, 7.30]        // SW Front Pavilion step-out
        ];
        const bldg400Shape = new THREE.Shape();
        bldg400LocalPts.forEach(([lx, lz], idx) => {
            const sx = lx * cosArch + lz * sinArch;
            const sy = lx * sinArch - lz * cosArch;
            if (idx === 0) bldg400Shape.moveTo(sx, sy);
            else bldg400Shape.lineTo(sx, sy);
        });
        bldg400Shape.closePath();

        // 1. Sub-grade foundation & smooth concrete water-table plinth (-5.2m to -1.8m)
        const footingGeo = new THREE.ExtrudeGeometry(bldg400Shape, {
            depth: 3.4,
            bevelEnabled: false
        });
        footingGeo.rotateX(-Math.PI / 2);
        const footingMesh = new THREE.Mesh(footingGeo, plinthConcreteMat);
        footingMesh.position.y = -5.2;
        footingMesh.receiveShadow = true;
        group.add(footingMesh);

        // 2. Three Stacked Architectural Story Layers on exact stepped footprint using solid running-bond cream brick
        // (so the front piers, portico back wall, and rear wall have clean solid cream brick with zero fake windows,
        // while the exact 3D round-arched windows & basement windows are placed at their true photo coordinates below):
        // - Layer 1 (Floor 1 Basement: -3.6m to -0.10m)
        // - Layer 2 (Floor 2 Road Level: +0.10m to +4.20m)
        // - Layer 3 (Floor 3 Upper Level: +4.22m to +7.45m)
        const layerSpecs = [
            { idx: 1, name: 'Layer1_Basement', y0: -3.6, h: 3.50, mat: creamBrickSolidMat },
            { idx: 2, name: 'Layer2_RoadLevel', y0: 0.10, h: 4.10, mat: creamBrickSolidMat },
            { idx: 3, name: 'Layer3_UpperLevel', y0: 4.22, h: 3.23, mat: creamBrickSolidMat }
        ];

        layerSpecs.forEach((spec) => {
            const geo = new THREE.ExtrudeGeometry(bldg400Shape, {
                depth: spec.h,
                bevelEnabled: false
            });
            geo.rotateX(-Math.PI / 2);
            this._applyArchitecturalUVs(geo, spec.h, 1);

            const mesh = new THREE.Mesh(geo, [whiteRoofMat, spec.mat]);
            mesh.name = spec.name;
            mesh.position.y = spec.y0;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = { isSelectableBuilding: true, building, floorLayer: spec.idx };
            group.add(mesh);
        });

        // 3. Smooth Concrete Base Water-Table Plinth (y = 0.0m to +0.58m) & Classical Roof Entablature + Parapet
        // Matches 2c0f8950.jpg and de2d6e09.jpg: smooth cream concrete water-table at base, uninterrupted monumental
        // brick walls up to the classical architrave, dentil brick frieze, projecting cornice, and brick parapet
        // wrapping around the front wall indentations and side wall pavilions!
        // Classical Entablature & Brick Parapet Shape: wraps the Front Pavilion (+Z), NE Washington St (+X),
        // NE Rear Pavilion return (lx = +11.20m..+12.61m, seen at left of ef31cc76.jpg), and SW Front Pavilion (lz = +7.30m..+14.14m, right of 3fb3243e.jpg),
        // while leaving the smooth weathered-stucco SW Central Wall, Rear Gable Wall, and Tall Rear Box clean!
        const brickEntablatureLocalPts = [
            [-3.24, frontWingZ],
            [-0.35, frontWingZ],
            [-0.35, wallZ],
            [9.35, wallZ],
            [9.35, frontWingZ],
            [12.61, frontWingZ],
            [12.61, 7.30],
            [12.25, 7.30],
            [12.25, -11.20],
            [12.61, -11.20],
            [12.61, -16.64],
            [11.20, -16.64],
            [11.20, 7.30],
            [-3.24, 7.30]
        ];
        const brickEntablatureShape = new THREE.Shape();
        brickEntablatureLocalPts.forEach(([lx, lz], idx) => {
            const sx = lx * cosArch + lz * sinArch;
            const sy = lx * sinArch - lz * cosArch;
            if (idx === 0) brickEntablatureShape.moveTo(sx, sy);
            else brickEntablatureShape.lineTo(sx, sy);
        });
        brickEntablatureShape.closePath();

        const beltBands = [
            { y: -0.05, depth: 0.62, overhang: 0.08, mat: plinthConcreteMat, fullFootprint: true }, // Smooth concrete water-table plinth at road level
            { y: 7.45, depth: 0.26, overhang: 0.22, mat: trimMat },            // Lower limestone architrave band
            { y: 7.71, depth: 0.52, overhang: 0.12, mat: creamBrickSolidMat }, // Dentil brick frieze band
            { y: 8.23, depth: 0.32, overhang: 0.46, mat: trimMat },            // Main projecting classical limestone cornice ledge
            { y: 8.55, depth: 0.54, overhang: 0.14, mat: creamBrickSolidMat }, // Upper cream-brick roof parapet
            { y: 9.09, depth: 0.18, overhang: 0.22, mat: whiteCurbMat }        // White limestone parapet coping
        ];

        beltBands.forEach((b) => {
            const bGeo = new THREE.ExtrudeGeometry(b.fullFootprint ? bldg400Shape : brickEntablatureShape, {
                depth: b.depth,
                bevelEnabled: true,
                bevelThickness: 0.06,
                bevelSize: b.overhang,
                bevelSegments: 2
            });
            bGeo.rotateX(-Math.PI / 2);
            const bMesh = new THREE.Mesh(bGeo, b.mat);
            bMesh.position.y = b.y;
            bMesh.castShadow = true;
            bMesh.receiveShadow = true;
            group.add(bMesh);
        });

        // 4. Oriented Architectural Detail Group (theta = +0.94692 rad):
        // +Z = Front facing Douglas St (central front wall at lz = +14.62m, indented end wings at lz = +14.14m)
        // +X = Right side facing Washington St (central bay at lx = +12.25m, front/rear pavilions at lx = +12.61m)
        const arch = new THREE.Group();
        arch.name = 'Building400_PhotoDetails';
        arch.rotation.y = Math.atan2(0.8116, 0.5842); // 0.94692 rad
        group.add(arch);

        const addBox = (w, h, d, mat, x, y, z, parent = arch, cast = true) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            m.position.set(x, y, z);
            m.castShadow = cast;
            m.receiveShadow = true;
            parent.add(m);
            return m;
        };

        // --- A. FRONT NEO-CLASSICAL PORTICO, PEDIMENT & FRONT PIERS ON DOUGLAS ST (+Z, centered at lx = +4.50m) ---
        const portX = 4.50;
        const portDepth = 2.95;
        const portW = 9.80;
        const deckY = 0.76;

        // Stepped Corner Brick Quoins on the indented Front Left (lx = -3.24m) and Front Right (lx = +12.61m) corners
        for (let qy = 0.75; qy < 7.35; qy += 0.52) {
            addBox(0.42, 0.28, 0.14, creamBrickSolidMat, -3.05, qy, frontWingZ + 0.04);
            addBox(0.42, 0.28, 0.14, creamBrickSolidMat, 12.42, qy, frontWingZ + 0.04);
        }

        // Sub-grade foundation base under the portico deck (y = -0.60m to 0.0m)
        addBox(portW - 0.2, 0.60, portDepth, trimMat, portX, -0.30, wallZ + portDepth * 0.5);

        // High-res Archimedean Spiral Volute texture + bump map for the Ionic Capital scroll faces (matched to 12b23af8.jpg)
        const voluteCanvas = document.createElement('canvas');
        voluteCanvas.width = 256;
        voluteCanvas.height = 256;
        const vCtx = voluteCanvas.getContext('2d');
        vCtx.fillStyle = '#dcd5c7';
        vCtx.fillRect(0, 0, 256, 256);
        const cxV = 128;
        const cyV = 128;
        // Draw 2.75-turn carved spiral channel (dark recessed shadow + bright raised ridge)
        for (let pass = 0; pass < 2; pass++) {
            vCtx.beginPath();
            const maxSteps = 260;
            for (let i = 0; i <= maxSteps; i++) {
                const t = (i / maxSteps) * Math.PI * 5.5;
                const r = 14 + (t / (Math.PI * 5.5)) * 102;
                const x = cxV + Math.cos(t) * r;
                const y = cyV + Math.sin(t) * r + (pass === 0 ? -3 : 2);
                if (i === 0) vCtx.moveTo(x, y);
                else vCtx.lineTo(x, y);
            }
            vCtx.strokeStyle = pass === 0 ? '#5c5549' : '#f7f3ea';
            vCtx.lineWidth = pass === 0 ? 15 : 10;
            vCtx.lineCap = 'round';
            vCtx.stroke();
        }
        // Central carved eye button (oculus)
        vCtx.beginPath();
        vCtx.arc(cxV, cyV, 16, 0, Math.PI * 2);
        vCtx.fillStyle = '#ebe5d8';
        vCtx.fill();
        vCtx.lineWidth = 4;
        vCtx.strokeStyle = '#6b6355';
        vCtx.stroke();

        const voluteTex = new THREE.CanvasTexture(voluteCanvas);
        voluteTex.colorSpace = THREE.SRGBColorSpace;
        const voluteFaceMat = new THREE.MeshStandardMaterial({
            map: voluteTex,
            bumpMap: voluteTex,
            bumpScale: 0.06,
            roughness: 0.76,
            metalness: 0.04
        });

        // Helper to build a photo-accurate Sculpted Ionic Capital matched to close-up photo 12b23af8.jpg:
        // - Crisp astragal necking ring at top of smooth shaft
        // - Deeply carved 5-egg-and-dart echinus collar tucked between the volutes
        // - Continuous spiral scroll volutes connected by a molded horizontal canalis bridge
        // - Pinched/tapered fluted side bolsters (pulvini) with central foliate balteus band
        // - Two-tier stepped square abacus supporting the architrave
        const addSculptedIonicCapital = (cxPos, capBaseY, czPos, scaleX = 1.0, scaleZ = 1.0) => {
            const capGroup = new THREE.Group();
            capGroup.position.set(cxPos, capBaseY, czPos);
            capGroup.scale.set(scaleX, 1.0, scaleZ);

            // 1. Lower astragal necking ring + fillet directly atop the column shaft (12b23af8.jpg)
            const neckRing = new THREE.Mesh(new THREE.CylinderGeometry(0.405, 0.405, 0.055, 28), trimMat);
            neckRing.position.set(0, -0.03, 0);
            capGroup.add(neckRing);
            const neckFillet = new THREE.Mesh(new THREE.CylinderGeometry(0.385, 0.395, 0.03, 28), plinthConcreteMat);
            neckFillet.position.set(0, -0.065, 0);
            capGroup.add(neckFillet);

            // 2. Flared echinus core + prominent 3D carved Egg-and-Dart relief tucked between the volutes (12b23af8.jpg)
            const echinus = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.38, 0.17, 28), trimMat);
            echinus.position.set(0, 0.085, 0);
            capGroup.add(echinus);

            // 5 prominent carved eggs + vertical darts on both Front (+Z) and Back (-Z) faces between the volutes
            [-1, 1].forEach((zDir) => {
                for (let e = -2; e <= 2; e++) {
                    const ex = e * 0.095;
                    const ez = zDir * Math.sqrt(Math.max(0.05, 0.44 * 0.44 - ex * ex));
                    // Outer carved shell frame (cymatium) around each egg
                    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 10), plinthConcreteMat);
                    shell.scale.set(0.92, 1.45, 0.72);
                    shell.position.set(ex, 0.11, ez);
                    capGroup.add(shell);
                    // Inner convex egg core
                    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), trimMat);
                    egg.scale.set(0.82, 1.38, 0.88);
                    egg.position.set(ex, 0.115, ez + zDir * 0.014);
                    capGroup.add(egg);
                    // Vertical carved dart tongue between adjacent eggs
                    if (e < 2) {
                        addBox(0.018, 0.11, 0.035, trimMat, ex + 0.0475, 0.11, ez + zDir * 0.008, capGroup);
                    }
                }
            });

            // 3. Molded horizontal canalis scroll bridge connecting the left & right volutes (12b23af8.jpg)
            addBox(0.92, 0.13, 0.84, trimMat, 0, 0.21, 0, capGroup);
            addBox(0.96, 0.045, 0.90, plinthConcreteMat, 0, 0.26, 0, capGroup);

            // 4. Left & Right Sculpted Side Bolsters (Pulvini) — pinched hourglass profile with deep water-leaf flutes
            [-0.43, 0.43].forEach((vx) => {
                const signX = Math.sign(vx);
                // Front & rear flared bolster halves tapering toward the pinched center waist (seen in 12b23af8.jpg)
                [-0.23, 0.23].forEach((bzHalf) => {
                    const halfBolster = new THREE.Mesh(
                        new THREE.CylinderGeometry(
                            bzHalf > 0 ? 0.185 : 0.145,
                            bzHalf > 0 ? 0.145 : 0.185,
                            0.46,
                            20
                        ),
                        trimMat
                    );
                    halfBolster.rotation.x = Math.PI * 0.5;
                    halfBolster.position.set(vx, 0.135, bzHalf);
                    halfBolster.castShadow = true;
                    capGroup.add(halfBolster);
                });

                // 9 Deeply carved fluted ribs running front-to-back along the bolster cushion
                for (let f = 0; f < 9; f++) {
                    const fang = -Math.PI * 0.35 + (f / 8) * Math.PI * 1.15 * signX;
                    const flute = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.024, 0.024, 0.92, 8),
                        f % 2 === 0 ? trimMat : plinthConcreteMat
                    );
                    flute.rotation.x = Math.PI * 0.5;
                    flute.position.set(vx + Math.cos(fang) * 0.162, 0.135 + Math.sin(fang) * 0.162, 0);
                    capGroup.add(flute);
                }

                // Sculpted central foliate balteus strap cinching the middle of each bolster (12b23af8.jpg)
                const centerStrap = new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.168, 0.08, 18), trimMat);
                centerStrap.rotation.x = Math.PI * 0.5;
                centerStrap.position.set(vx, 0.135, 0);
                capGroup.add(centerStrap);
                [-0.048, 0.048].forEach((bz) => {
                    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.174, 0.174, 0.022, 18), plinthConcreteMat);
                    cord.rotation.x = Math.PI * 0.5;
                    cord.position.set(vx, 0.135, bz);
                    capGroup.add(cord);
                });

                // Front (+Z) & Back (-Z) Spiral Volute Faces with spiral bump map + 3D carved spiral rings (12b23af8.jpg)
                [-0.46, 0.46].forEach((vz) => {
                    const signZ = Math.sign(vz);
                    // Main spiral-textured volute face drum
                    const voluteDrum = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.195, 0.195, 0.055, 24),
                        [trimMat, voluteFaceMat, voluteFaceMat]
                    );
                    voluteDrum.rotation.x = Math.PI * 0.5;
                    voluteDrum.position.set(vx, 0.135, vz);
                    capGroup.add(voluteDrum);

                    // 3D stepped spiral torus rings & central button eye for true 3D depth from oblique angles
                    [
                        [0.182, 0.024, 0.022],
                        [0.128, 0.020, 0.032],
                        [0.076, 0.017, 0.040]
                    ].forEach(([rad, tube, zOff], idx) => {
                        const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, tube, 10, 22), trimMat);
                        ring.position.set(
                            vx - idx * 0.010 * signX,
                            0.135 - idx * 0.008,
                            vz + signZ * zOff
                        );
                        capGroup.add(ring);
                    });

                    const eyeBtn = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 10), trimMat);
                    eyeBtn.scale.set(1.0, 1.0, 0.55);
                    eyeBtn.position.set(vx - 0.022 * signX, 0.12, vz + signZ * 0.045);
                    capGroup.add(eyeBtn);
                });
            });

            // 5. Two-tier molded square abacus crowning the capital beneath the architrave (12b23af8.jpg)
            addBox(0.92, 0.075, 0.92, plinthConcreteMat, 0, 0.295, 0, capGroup);
            addBox(1.02, 0.075, 1.02, trimMat, 0, 0.365, 0, capGroup);

            arch.add(capGroup);
        };

        // 2 Engaged Brick Pilasters with Sculpted Ionic Volute Capitals on the front brick wall behind the outer columns
        [0.25, 8.75].forEach((px) => {
            addBox(0.92, 0.48, 0.34, trimMat, px, deckY + 0.24, wallZ + 0.17);
            addBox(0.84, 0.14, 0.30, trimMat, px, deckY + 0.55, wallZ + 0.15);
            addBox(0.76, 6.32, 0.22, creamBrickSolidMat, px, deckY + 0.62 + 3.16, wallZ + 0.11);
            addSculptedIonicCapital(px, deckY + 6.82, wallZ + 0.16, 0.94, 0.46);
        });

        // 4 Classical Segmented Limestone Columns with Sculpted Ionic Capitals (lz = +17.09m, 8fabdee1.jpg & 353a55d7.jpg)
        const colXs = [0.25, 3.08, 5.92, 8.75];
        const colH = 6.22;
        const colZ = wallZ + portDepth - 0.48;

        colXs.forEach((cxPos) => {
            // Tall weathered stone pedestal block + stepped plinth + Attic base (lower torus, scotia, upper torus)
            addBox(1.10, 0.46, 1.10, plinthConcreteMat, cxPos, deckY + 0.23, colZ);
            addBox(1.02, 0.12, 1.02, trimMat, cxPos, deckY + 0.52, colZ);
            const lowerTorus = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.52, 0.12, 24), trimMat);
            lowerTorus.position.set(cxPos, deckY + 0.64, colZ);
            arch.add(lowerTorus);
            const upperTorus = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.47, 0.10, 24), trimMat);
            upperTorus.position.set(cxPos, deckY + 0.74, colZ);
            arch.add(upperTorus);

            // Tapered Classical Column Shaft built of 5 stacked limestone drums with subtle horizontal joint rings
            const shaftBaseY = deckY + 0.78;
            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.365, 0.425, colH, 28), trimMat);
            shaft.position.set(cxPos, shaftBaseY + colH * 0.5, colZ);
            shaft.castShadow = true;
            shaft.receiveShadow = true;
            arch.add(shaft);

            for (let d = 1; d <= 4; d++) {
                const frac = d / 5;
                const drumR = 0.425 - frac * (0.425 - 0.365) + 0.004;
                const jointRing = new THREE.Mesh(new THREE.CylinderGeometry(drumR, drumR, 0.022, 24), plinthConcreteMat);
                jointRing.position.set(cxPos, shaftBaseY + frac * colH, colZ);
                arch.add(jointRing);
            }

            // Sculpted Ionic Capital with 4 Corner Scroll Volutes, Fluted Bolsters, Balteus & Abacus
            addSculptedIonicCapital(cxPos, shaftBaseY + colH, colZ, 1.0, 1.0);
        });

        // Helper for Draped Black Link Chains with Realistic Catenary Sag between Stanchion Posts (3b9c07db.jpg & 28f96301.jpg)
        const addSaggingChain = (x0, z0, x1, z1, yEnds = deckY + 0.78, sag = 0.16) => {
            const segs = 10;
            for (let i = 0; i < segs; i++) {
                const t0 = i / segs;
                const t1 = (i + 1) / segs;
                const tm = (t0 + t1) * 0.5;
                const px0 = x0 + (x1 - x0) * t0;
                const pz0 = z0 + (z1 - z0) * t0;
                const py0 = yEnds - 4 * sag * t0 * (1 - t0);
                const px1 = x0 + (x1 - x0) * t1;
                const pz1 = z0 + (z1 - z0) * t1;
                const py1 = yEnds - 4 * sag * t1 * (1 - t1);
                const segLen = Math.hypot(px1 - px0, py1 - py0, pz1 - pz0) + 0.01;
                const link = addBox(
                    segLen,
                    0.032,
                    0.032,
                    darkMetalMat,
                    x0 + (x1 - x0) * tm,
                    (py0 + py1) * 0.5,
                    z0 + (z1 - z0) * tm
                );
                link.rotation.z = Math.atan2(py1 - py0, Math.hypot(px1 - px0, pz1 - pz0));
                link.rotation.y = -Math.atan2(pz1 - pz0, px1 - px0);
            }
        };

        // Black Stanchion Posts & Draped Catenary Chains between the Outer Portico Columns (3b9c07db.jpg, 28f96301.jpg, 29a2721c.jpg)
        [
            [0.25, 3.08],
            [5.92, 8.75]
        ].forEach(([x0, x1]) => {
            const p0x = x0 + 0.56;
            const p1x = x1 - 0.56;
            addBox(0.055, 0.88, 0.055, darkMetalMat, p0x, deckY + 0.44, colZ);
            addBox(0.055, 0.88, 0.055, darkMetalMat, p1x, deckY + 0.44, colZ);
            addSaggingChain(p0x, colZ, p1x, colZ, deckY + 0.82, 0.15);
        });
        // Side chain from Column 1 back to Left Pilaster, and Column 4 back to Right Pilaster
        [0.25, 8.75].forEach((cxPos) => {
            addBox(0.05, 0.88, 0.05, darkMetalMat, cxPos, deckY + 0.44, colZ - 0.58);
            addSaggingChain(cxPos, wallZ + 0.35, cxPos, colZ - 0.58, deckY + 0.82, 0.12);
        });

        // Classical Portico Entablature: Recessed Soffit, 3-Fascia Stepped Architrave, Chiseled "CHELAN COUNTY" Frieze,
        // and 3D Carved Dentil Cornice (8fabdee1.jpg, 353a55d7.jpg)
        const entabW = portW + 0.36;
        const entabH = 1.12;
        const entabD = portDepth + 0.26;
        const entabY = 8.08;

        // Recessed portico ceiling soffit with perimeter stone beam frame & sunken coffered ceiling panel (12b23af8.jpg)
        addBox(portW, 0.08, portDepth, trimMat, portX, entabY - entabH * 0.5 + 0.02, wallZ + portDepth * 0.5);
        addBox(portW - 1.55, 0.06, portDepth - 1.35, plinthConcreteMat, portX, entabY - entabH * 0.5 + 0.07, wallZ + portDepth * 0.5);

        // 3-Fascia Stepped Classical Architrave below the frieze (12b23af8.jpg, 353a55d7.jpg)
        const archBaseY = entabY - entabH * 0.5;
        addBox(entabW + 0.16, 0.11, entabD + 0.16, trimMat, portX, archBaseY + 0.055, wallZ + entabD * 0.5); // Lower fascia 1
        addBox(entabW + 0.24, 0.11, entabD + 0.24, trimMat, portX, archBaseY + 0.165, wallZ + entabD * 0.5); // Middle fascia 2
        addBox(entabW + 0.34, 0.09, entabD + 0.32, trimMat, portX, archBaseY + 0.265, wallZ + entabD * 0.5); // Upper taenia molding

        // Cream Running-Bond Brick Frieze Core (12b23af8.jpg shows 6 courses of cream brick flanking the "CHELAN COUNTY" stone tablet!)
        addBox(entabW, 0.62, entabD, creamBrickSolidMat, portX, entabY + 0.02, wallZ + entabD * 0.5);

        // Chiseled/Incised Roman Serif "CHELAN COUNTY" Warm Sandstone Tablet Plaque + Molded Border Frame (12b23af8.jpg)
        const friezeCanvas = document.createElement('canvas');
        friezeCanvas.width = 1024;
        friezeCanvas.height = 160;
        const fCtx = friezeCanvas.getContext('2d');
        fCtx.fillStyle = '#c8be9e'; // Warm buff sandstone tablet color seen in 12b23af8.jpg
        fCtx.fillRect(0, 0, 1024, 160);
        // Subtle weathered sandstone grain
        for (let i = 0; i < 700; i++) {
            fCtx.fillStyle = i % 2 === 0 ? 'rgba(85,76,60,0.07)' : 'rgba(250,245,232,0.07)';
            fCtx.fillRect((i * 73) % 1024, (i * 41) % 160, 14, 5);
        }
        // Incised perimeter border groove on the stone tablet
        fCtx.strokeStyle = 'rgba(80,72,58,0.45)';
        fCtx.lineWidth = 5;
        fCtx.strokeRect(10, 10, 1004, 140);
        fCtx.font = 'bold 82px "Times New Roman", Georgia, serif';
        fCtx.textAlign = 'center';
        fCtx.textBaseline = 'middle';
        // Deep V-cut chiseled shadow (top-left dark shadow, bottom-right sun highlight)
        fCtx.fillStyle = '#5e5645';
        fCtx.fillText('CHELAN COUNTY', 509, 79);
        fCtx.fillStyle = '#ece5d2';
        fCtx.fillText('CHELAN COUNTY', 515, 85);
        fCtx.fillStyle = '#8b816b';
        fCtx.fillText('CHELAN COUNTY', 512, 82);
        const friezeTex = new THREE.CanvasTexture(friezeCanvas);
        friezeTex.colorSpace = THREE.SRGBColorSpace;
        const friezeMat = new THREE.MeshStandardMaterial({
            map: friezeTex,
            bumpMap: friezeTex,
            bumpScale: -0.05,
            roughness: 0.84
        });
        // Molded stone frame + projecting sandstone tablet mounted on the cream-brick frieze
        addBox(7.82, 0.56, 0.05, trimMat, portX, entabY + 0.02, wallZ + entabD + 0.02);
        const friezePlaque = new THREE.Mesh(new THREE.BoxGeometry(7.68, 0.50, 0.06), friezeMat);
        friezePlaque.position.set(portX, entabY + 0.02, wallZ + entabD + 0.035);
        arch.add(friezePlaque);

        // 3D Carved Dentil Band directly above "CHELAN COUNTY", along Left/Right Entablature Returns,
        // AND along the Main Building Front Cornice wings behind the portico (seen in 12b23af8.jpg!)
        const dentilY = entabY + 0.38;
        const numFrontDentils = 46;
        const dentilSpanX = entabW + 0.24;
        for (let d = 0; d < numFrontDentils; d++) {
            const dx = portX - dentilSpanX * 0.5 + (d + 0.5) * (dentilSpanX / numFrontDentils);
            addBox(0.11, 0.13, 0.14, trimMat, dx, dentilY, wallZ + entabD + 0.10);
        }
        for (let dz = wallZ + 0.20; dz < wallZ + entabD; dz += 0.22) {
            addBox(0.14, 0.13, 0.11, trimMat, portX - entabW * 0.5 - 0.10, dentilY, dz);
            addBox(0.14, 0.13, 0.11, trimMat, portX + entabW * 0.5 + 0.10, dentilY, dz);
        }
        // Main building front wing dentils along the indented left & right front wings (frontWingZ) and step-back returns (12b23af8.jpg & de2d6e09.jpg)
        for (let wx = -3.15; wx <= 12.50; wx += 0.22) {
            if (wx < -0.42 || wx > 9.42) {
                addBox(0.11, 0.13, 0.14, trimMat, wx, 8.15, frontWingZ + 0.12);
            }
        }
        for (let rz = frontWingZ + 0.12; rz <= wallZ + 0.05; rz += 0.20) {
            addBox(0.14, 0.13, 0.11, trimMat, -0.42, 8.15, rz);
            addBox(0.14, 0.13, 0.11, trimMat, 9.42, 8.15, rz);
        }

        // Horizontal Geison / Cornice Ledge above the Dentils
        addBox(entabW + 0.56, 0.20, entabD + 0.44, trimMat, portX, entabY + entabH * 0.5 - 0.04, wallZ + entabD * 0.5);

        // Triangular Classical A-Frame Pediment with Recessed Cream-Brick Tympanum, Inner Raking Dentils & Slate Gable Roof (8fabdee1.jpg, 353a55d7.jpg, b7570195.jpg)
        const pedBaseY = entabY + entabH * 0.5 + 0.04;
        const pedW = entabW + 0.44;
        const pedH = 2.05;
        const pedShape = new THREE.Shape();
        pedShape.moveTo(-pedW * 0.5, 0);
        pedShape.lineTo(pedW * 0.5, 0);
        pedShape.lineTo(0, pedH);
        pedShape.closePath();

        // Recessed cream-brick tympanum triangle inside the limestone pediment frame
        const pedGeo = new THREE.ExtrudeGeometry(pedShape, {
            depth: entabD + 0.08,
            bevelEnabled: false
        });
        const pedMesh = new THREE.Mesh(pedGeo, creamBrickSolidMat);
        pedMesh.position.set(portX, pedBaseY, wallZ - 0.05);
        pedMesh.castShadow = true;
        pedMesh.receiveShadow = true;
        arch.add(pedMesh);

        // Raised rectangular cream-brick attic parapet wall directly behind the triangular A-frame pediment (b7570195.jpg & 048e987a.jpg):
        // Forms the front masonry facade of the rooftop room (lx = -0.35m..+9.35m, lz = wallZ - 1.15m..wallZ) with white coping at y = 10.24m!
        addBox(9.70, 1.55, 1.18, creamBrickSolidMat, portX, pedBaseY + 0.72, wallZ - 0.58);
        addBox(9.92, 0.18, 1.32, whiteCurbMat, portX, pedBaseY + 1.55, wallZ - 0.58);

        // Left & right raking limestone cornices, raking 3D dentil rows (353a55d7.jpg), and pitched slate A-frame gable roof slopes
        const slopeLen = Math.hypot(pedW * 0.5 + 0.28, pedH) + 0.18;
        const slopeAngle = Math.atan2(pedH, pedW * 0.5);
        [-1, 1].forEach((dir) => {
            const rakingGroup = new THREE.Group();
            rakingGroup.position.set(
                portX + dir * (pedW * 0.25 + 0.04),
                pedBaseY + pedH * 0.5 - 0.04,
                wallZ + entabD * 0.5
            );
            rakingGroup.rotation.z = -dir * slopeAngle;

            // Upper projecting raking geison cornice + inner stepped tympanum molding
            addBox(slopeLen, 0.20, entabD + 0.42, trimMat, 0, 0.06, 0.04, rakingGroup);
            addBox(slopeLen - 0.35, 0.12, 0.24, trimMat, 0, -0.14, entabD * 0.5 + 0.04, rakingGroup);

            // 22 Raking 3D Dentil Blocks running up each slope of the A-frame pediment (seen in 8fabdee1.jpg & 353a55d7.jpg)
            const rakingDentilCount = 22;
            const rakingSpan = slopeLen - 0.55;
            for (let rd = 0; rd < rakingDentilCount; rd++) {
                const rdx = -rakingSpan * 0.5 + (rd + 0.5) * (rakingSpan / rakingDentilCount);
                addBox(0.10, 0.12, 0.16, trimMat, rdx, -0.06, entabD * 0.5 + 0.12, rakingGroup);
            }

            // Dark-slate pitched A-frame gable roof above the raking cornice + ridge cap
            addBox(slopeLen + 0.12, 0.15, entabD + 0.50, slateGableMat, 0, 0.21, 0.04, rakingGroup);
            arch.add(rakingGroup);
        });
        // Ridge flashing cap along the apex of the dark-slate A-frame portico roof (b7570195.jpg & 048e987a.jpg)
        addBox(0.32, 0.14, entabD + 0.52, trimMat, portX, pedBaseY + pedH + 0.22, wallZ + entabD * 0.5 + 0.04);

        // --- B. RECESSED PORTICO ENTRY DOORS, S-SCROLL CONSOLE BRACKETS, TRANSOM & ORNATE SCONCES (3b9c07db.jpg, f097f1e6.jpg) ---
        // Raised stone threshold step (+0.14m above deckY) running along the back wall between the columns and entry doors (28f96301.jpg)
        addBox(portW - 0.4, 0.14, 1.35, plazaConcreteMat, portX, deckY + 0.07, wallZ + 0.68);
        const doorBaseY = deckY + 0.14;

        // Central Grand Entrance (lx = +4.50m): Molded Limestone Architrave Surround + Paneled White Double Doors + 12-Pane Transom
        addBox(2.68, 4.75, 0.22, trimMat, portX, doorBaseY + 2.38, wallZ + 0.06);     // Outer carved stone door architrave
        addBox(2.34, 4.52, 0.18, whiteCurbMat, portX, doorBaseY + 2.26, wallZ + 0.08); // White wood door & transom frame
        // Left & right white paneled doors with upper dark glass lites, lower recessed panels & black pull handles
        [-0.54, 0.54].forEach((dx) => {
            addBox(0.98, 2.38, 0.14, whiteCurbMat, portX + dx, doorBaseY + 1.19, wallZ + 0.11); // Door stile/rail leaf
            addBox(0.74, 1.24, 0.16, glassMat, portX + dx, doorBaseY + 1.62, wallZ + 0.12);     // Upper glass window lite
            addBox(0.74, 0.58, 0.12, plinthConcreteMat, portX + dx, doorBaseY + 0.48, wallZ + 0.12); // Lower recessed panel
            // Vertical black iron door pull handle near center astragal
            addBox(0.035, 0.34, 0.06, darkMetalMat, portX + dx * 0.22, doorBaseY + 1.05, wallZ + 0.18);
        });
        addBox(0.10, 2.42, 0.20, whiteCurbMat, portX, doorBaseY + 1.21, wallZ + 0.13); // Center door astragal post
        addBox(2.28, 0.16, 0.22, whiteCurbMat, portX, doorBaseY + 2.46, wallZ + 0.13); // Heavy transom division bar

        // 12-Pane (6x2) Rectangular Transom Window with Crisp White Muntin Grid above Central Doors (3b9c07db.jpg)
        addBox(2.08, 1.38, 0.16, glassMat, portX, doorBaseY + 3.28, wallZ + 0.11);
        addBox(2.10, 0.055, 0.20, whiteCurbMat, portX, doorBaseY + 3.28, wallZ + 0.13); // Horizontal transom muntin
        for (let m = -2; m <= 2; m++) {
            addBox(0.048, 1.38, 0.20, whiteCurbMat, portX + m * 0.345, doorBaseY + 3.28, wallZ + 0.13);
        }

        // Deep Projecting Classical Limestone Cornice Hood & Sculpted S-Scroll Console Brackets (Ancones) (3b9c07db.jpg, f097f1e6.jpg)
        addBox(2.82, 0.18, 0.42, trimMat, portX, doorBaseY + 4.58, wallZ + 0.21); // Lower hood architrave
        addBox(3.02, 0.22, 0.54, trimMat, portX, doorBaseY + 4.76, wallZ + 0.27); // Upper projecting hood corona
        [-1.24, 1.24].forEach((bx) => {
            // Sculpted console bracket with upper & lower S-scroll volute cylinders and acanthus spine
            addBox(0.24, 0.68, 0.36, trimMat, portX + bx, doorBaseY + 4.18, wallZ + 0.18);
            const topRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.26, 14), trimMat);
            topRoll.rotation.z = Math.PI * 0.5;
            topRoll.position.set(portX + bx, doorBaseY + 4.38, wallZ + 0.32);
            arch.add(topRoll);
            const botRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.26, 14), trimMat);
            botRoll.rotation.z = Math.PI * 0.5;
            botRoll.position.set(portX + bx, doorBaseY + 3.92, wallZ + 0.24);
            arch.add(botRoll);
        });

        // 2 Ornate Cast-Iron Wall Sconce Globe Lanterns, White Mail Drop-Box & Red Fire-Alarm Bell (3b9c07db.jpg)
        [2.98, 6.02].forEach((sx) => {
            addBox(0.14, 0.34, 0.06, darkMetalMat, sx, doorBaseY + 2.38, wallZ + 0.05); // Wall backplate
            addBox(0.06, 0.08, 0.28, darkMetalMat, sx, doorBaseY + 2.34, wallZ + 0.16); // Bracket arm
            const sconceGlobe = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 14), globeMat);
            sconceGlobe.position.set(sx, doorBaseY + 2.58, wallZ + 0.26);
            arch.add(sconceGlobe);
            const sconceRing = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.03, 14), darkMetalMat);
            sconceRing.position.set(sx, doorBaseY + 2.58, wallZ + 0.26);
            arch.add(sconceRing);
            const finial = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.12, 10), darkMetalMat);
            finial.position.set(sx, doorBaseY + 2.78, wallZ + 0.26);
            arch.add(finial);
        });
        addBox(0.26, 0.32, 0.16, whiteCurbMat, 3.06, doorBaseY + 1.42, wallZ + 0.10); // White wall drop-box
        addBox(0.18, 0.06, 0.18, darkMetalMat, 3.06, doorBaseY + 1.50, wallZ + 0.11); // Black drop-box slot hood
        const alarmBell = new THREE.Mesh(
            new THREE.SphereGeometry(0.11, 12, 12),
            new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.4, metalness: 0.3 })
        );
        alarmBell.scale.set(1, 1, 0.55);
        alarmBell.position.set(2.58, doorBaseY + 4.55, wallZ + 0.07);
        arch.add(alarmBell);

        // 2 Side Entry Doors (lx = +1.65m and lx = +7.35m) with Molded Stone Surround, Upper/Lower Glass Lites & Lintel (28f96301.jpg)
        [1.65, 7.35].forEach((sx) => {
            addBox(1.52, 3.35, 0.18, trimMat, sx, doorBaseY + 1.67, wallZ + 0.05);      // Stone architrave surround
            addBox(1.28, 3.18, 0.16, whiteCurbMat, sx, doorBaseY + 1.59, wallZ + 0.07); // White door leaf
            addBox(0.88, 1.32, 0.18, glassMat, sx, doorBaseY + 2.18, wallZ + 0.09);     // Upper glass lite
            addBox(0.88, 0.82, 0.18, glassMat, sx, doorBaseY + 0.78, wallZ + 0.09);     // Lower glass lite
            addBox(1.66, 0.26, 0.26, trimMat, sx, doorBaseY + 3.42, wallZ + 0.11);      // Projecting stone lintel
        });

        // Indented Left Front Wing Details (lx = -3.24m..-0.35m, at lz = frontWingZ = 14.14m; 3b9c07db.jpg & 687b2a06.jpg):
        // Sculpted Stone Bench, Bronze Dedication Plaque & Red Fire Strobe mounted on the indented left front brick wall
        addBox(1.48, 0.11, 0.52, trimMat, -2.28, 0.48, frontWingZ + 0.48); // Molded stone seat slab
        addBox(1.42, 0.05, 0.46, plinthConcreteMat, -2.28, 0.41, frontWingZ + 0.48);
        [-2.78, -1.78].forEach((legX) => {
            addBox(0.26, 0.10, 0.46, trimMat, legX, 0.05, frontWingZ + 0.48); // Sculpted paw foot base
            addBox(0.20, 0.28, 0.38, trimMat, legX, 0.24, frontWingZ + 0.48); // Fluted pedestal leg waist
            addBox(0.25, 0.08, 0.44, trimMat, legX, 0.38, frontWingZ + 0.48); // Leg capital
        });
        // Dark Bronze Dedication Plaque with Raised Border & Text Lines + Red Fire Strobe on Indented Left Front Brick Wall
        addBox(0.58, 0.74, 0.05, bronzePlaqueMat, -1.82, 1.72, frontWingZ + 0.04);
        addBox(0.50, 0.66, 0.06, new THREE.MeshStandardMaterial({ color: '#5c4736', roughness: 0.35, metalness: 0.75 }), -1.82, 1.72, frontWingZ + 0.045);
        addBox(0.16, 0.20, 0.08, new THREE.MeshBasicMaterial({ color: '#dc2626' }), -2.68, 1.78, frontWingZ + 0.05);

        // Indented Right Front Wing Details (lx = +9.35m..+12.61m, at lz = frontWingZ = 14.14m; 29a2721c.jpg, 9c557575.jpg & b7570195.jpg):
        // "400 DOUGLAS STREET" Dimensional Lettering, Blue ADA Sign & White Louvered Foundation Vent on the indented right front wall
        const addrTex = this._createTextPlaqueTexture(['400', 'DOUGLAS STREET'], '#dfd5bc', '#1a1917', 512, 160);
        const addrMat = new THREE.MeshStandardMaterial({ map: addrTex, roughness: 0.8 });
        const addrSign = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 0.72), addrMat);
        addrSign.position.set(10.85, 2.55, frontWingZ + 0.06);
        arch.add(addrSign);

        const adaPlaque = new THREE.Mesh(
            new THREE.PlaneGeometry(0.40, 0.48),
            new THREE.MeshBasicMaterial({ color: '#1d4ed8' })
        );
        adaPlaque.position.set(10.85, 1.68, frontWingZ + 0.06);
        arch.add(adaPlaque);

        // White louvered foundation vent near the bottom-right corner of the indented front water-table plinth (9c557575.jpg)
        addBox(0.48, 0.32, 0.06, whiteCurbMat, 11.85, 0.08, frontWingZ + 0.06);
        for (let lv = -2; lv <= 2; lv++) {
            addBox(0.42, 0.025, 0.08, plinthConcreteMat, 11.85, 0.08 + lv * 0.055, frontWingZ + 0.07);
        }

        // --- C. TWO-TIER HISTORIC GRAND STAIRCASE, UPPER TERRACE, RIGHT SQUARE LAWN & RIGHT-SIDE STEPS ---
        // Photo-verified geometry (f097f1e6.jpg, 19f695cf.jpg, 3b9c07db.jpg, 28f96301.jpg, 29a2721c.jpg, 9c557575.jpg, 58d5c80a.jpg, eadec65d.jpg):
        // - Upper Terrace Level (y = 0.0m): sits directly below the 4 portico steps, flush with the Left Lawn and the top of the Right Square Lawn!
        // - Lower Forecourt Plaza & Corner Sidewalk Level (y = -0.51m, 3 steps below Upper Terrace): where the 2 white square planter boxes,
        //   corner bollards, and Washington/Douglas sidewalk sit!
        const lowerPlazaY = -0.51;
        const lowerNumSteps = 3;
        const lowerStepRise = 0.17; // 0.17m per step (0.0m, -0.17m, -0.34m down to -0.51m)
        const lowerStepRun = 0.42;

        // Helper to sample the topography-following concrete top surface height at local (lx, lz)
        const cosT = 0.5842;
        const sinT = 0.8116;
        const getConcreteTopY = (lx, lz) => {
            if (!getTerrainHeightFn) return lowerPlazaY;
            const wx = building.center[0] + lx * cosT + lz * sinT;
            const wz = building.center[1] - lx * sinT + lz * cosT;
            return (getTerrainHeightFn(wx, wz) - terrainY) + 0.06;
        };

        // 1. Upper Terrace Concrete Walkway (y = -0.51m up to 0.0m, spanning from SW sidewalk lx = -3.4m across to Right-Side Steps lx = 10.65m,
        //    and from indented frontWingZ = 14.14m out to lz = wallZ + 4.25m = 18.87m so zero gap exists at the indented front wings!)
        addBox(14.05, 0.51, 4.73, plazaConcreteMat, 3.625, -0.255, frontWingZ + 2.365, arch, false);

        // 2. Lower Forecourt Plaza & Corner Sidewalk (subdivided 60x30 mesh contoured to follow the 3D terrain topography!)
        {
            const plazaW = 21.0;
            const plazaD = 8.8;
            const plazaCX = 6.0;
            const plazaCZ = wallZ + 7.8;
            const plazaGeo = new THREE.BoxGeometry(plazaW, 0.32, plazaD, 60, 1, 30);
            const pPos = plazaGeo.attributes.position;
            for (let i = 0; i < pPos.count; i++) {
                const vx = pPos.getX(i);
                const vy = pPos.getY(i);
                const vz = pPos.getZ(i);
                const lx = plazaCX + vx;
                const lz = plazaCZ + vz;
                const topY = getConcreteTopY(lx, lz);
                pPos.setY(i, vy > 0 ? topY : topY - 0.32);
            }
            pPos.needsUpdate = true;
            plazaGeo.computeVertexNormals();
            const plazaMesh = new THREE.Mesh(plazaGeo, plazaConcreteMat);
            plazaMesh.position.set(plazaCX, 0, plazaCZ);
            plazaMesh.receiveShadow = true;
            arch.add(plazaMesh);
        }

        // 3. Upper 4-Level Portico Staircase (s = 0..3, from Upper Terrace y = 0.0m up to Portico Deck y = +0.76m):
        //    - Every step s has the EXACT same top elevation ((s + 1) * stepRise) across the Left (-X) and Front (+Z) sides.
        //    - On the Left (-X) side between the brick wall (lz = 14.62m) and left column pedestal (lz = 16.52m): 4 flush blue-gray treads & risers.
        //    - On the Front (+Z) side: stepRunZ = 1.30 / 3 (0.433m) so s = 0 ends right at upperTerraceFrontZ (wallZ + 4.25m) with zero skinny ledge,
        //      and frontLeftX = -0.25m so the front steps align cleanly with the Left Lamp Post!
        const numSteps = 4;
        const stepRise = deckY / numSteps;   // 0.19m per step level (0.19m, 0.38m, 0.57m, 0.76m)
        const stepRunX = 0.36;               // 0.36m horizontal tread run on Left (-X) side
        const stepRunZ = 1.30 / 3;           // 0.4333m horizontal tread run on Front (+Z) side (3 * stepRunZ = 1.30m -> wallZ + 4.25m)
        const deckLeftX = -0.32;             // Top deck left edge (s = 3)
        const deckRightX = 9.28;             // Top deck right edge (s = 3)
        const deckFrontZ = wallZ + portDepth; // Top deck front edge (s = 3, lz = 17.57m)
        const blueBayZEnd = wallZ + 1.90;    // Back edge of left/right column pedestals (lz = 16.52m)
        const weatheredStepMat = new THREE.MeshStandardMaterial({
            color: '#c8c2b6',
            roughness: 0.88,
            metalness: 0.03
        });

        for (let s = 0; s < numSteps; s++) {
            const stepsOut = numSteps - 1 - s; // 3 for bottom step (s=0), 0 for top deck (s=3)
            const sy = (s + 0.5) * stepRise;
            const xLeft = deckLeftX - stepsOut * stepRunX;
            const frontLeftX = -0.25; // Flush with lowerStairX0 and Left Lamp Post pedestal on the front flight!
            const xRight = deckRightX + stepsOut * 0.16; // Stepped right end seen in ffcaac33.jpg & 232bfcca.jpg!
            const zFront = deckFrontZ + stepsOut * stepRunZ;

            // A. Rear section (lz = wallZ to blueBayZEnd = 16.52m):
            //    - Leftmost tread/riser strip (lx = xLeft to xLeft + stepRunX) is flush blue-gray non-slip metal (687b2a06.jpg)
            //    - Middle-left & center concrete (lx = xLeft + stepRunX to 6.60m)
            //    - Right-bay darker weathered concrete in front of the right entry door (lx = 6.60m to xRight - 0.08m, seen in ffcaac33.jpg)
            const blueStripW = stepRunX;
            const blueStripX = xLeft + blueStripW * 0.5;
            const rearDepth = blueBayZEnd - wallZ;
            const rearCenterZ = wallZ + rearDepth * 0.5;
            addBox(blueStripW, stepRise, rearDepth, blueTreadMat, blueStripX, sy, rearCenterZ);

            const rearMidX0 = xLeft + blueStripW;
            const rearMidX1 = 6.60;
            addBox(
                rearMidX1 - rearMidX0,
                stepRise,
                rearDepth,
                plazaConcreteMat,
                (rearMidX0 + rearMidX1) * 0.5,
                sy,
                rearCenterZ
            );

            const rearRightX1 = xRight - 0.06;
            addBox(
                rearRightX1 - rearMidX1,
                stepRise,
                rearDepth,
                weatheredStepMat,
                (rearMidX1 + rearRightX1) * 0.5,
                sy,
                rearCenterZ
            );

            // B. Middle section (lz = blueBayZEnd = 16.52m to zFront - stepRunZ): full-width concrete aligned at frontLeftX = -0.25m
            const frontTreadZ0 = zFront - stepRunZ;
            if (frontTreadZ0 > blueBayZEnd + 0.01) {
                const midDepth = frontTreadZ0 - blueBayZEnd;
                const fullW = xRight - frontLeftX;
                addBox(fullW, stepRise, midDepth, plazaConcreteMat, frontLeftX + fullW * 0.5, sy, blueBayZEnd + midDepth * 0.5);
            }

            // C. Frontmost step tread & riser strip (lz = zFront - stepRunZ to zFront):
            //    - Left bay (lx = frontLeftX to 3.12m): brushed concrete
            //    - Center bay (lx = 3.12m to 5.88m, between Column 2 & Column 3): flush blue-gray non-slip metal tread & riser (3b9c07db.jpg & f097f1e6.jpg)
            //    - Right bay (lx = 5.88m to xRight): brushed concrete with vertical expansion joint line at lx = 6.60m (ffcaac33.jpg)
            const frontStripZ = zFront - stepRunZ * 0.5;
            const cBayX0 = 3.12;
            const cBayX1 = 5.88;
            addBox(cBayX0 - frontLeftX, stepRise, stepRunZ, plazaConcreteMat, (frontLeftX + cBayX0) * 0.5, sy, frontStripZ);
            addBox(cBayX1 - cBayX0, stepRise, stepRunZ, blueTreadMat, (cBayX0 + cBayX1) * 0.5, sy, frontStripZ);
            addBox(xRight - cBayX1, stepRise, stepRunZ, plazaConcreteMat, (cBayX1 + xRight) * 0.5, sy, frontStripZ);
        }

        // 4. Lower 3-Step Forecourt Staircase (ls = 0..2, stepping DOWN seamlessly from s=0 at wallZ + 4.25m to Lower Plaza)
        //    ls = 0 is at y = 0.0m, ls = 1 is at y = -0.17m, ls = 2 is at y = -0.34m (no skinny 10cm ledge!)
        const lowerStairX0 = -0.25;
        const lowerStairX1 = 9.76;
        const lowerStairW = lowerStairX1 - lowerStairX0;
        const lowerStairCenterX = (lowerStairX0 + lowerStairX1) * 0.5;
        const upperTerraceFrontZ = wallZ + 4.25;
        const stairBaseY = lowerPlazaY - 0.15;

        for (let ls = 0; ls < lowerNumSteps; ls++) {
            const stepTopY = -ls * lowerStepRise;
            const stepH = stepTopY - stairBaseY;
            const stepZ = upperTerraceFrontZ + (ls + 0.5) * lowerStepRun;
            addBox(lowerStairW, stepH, lowerStepRun + 0.02, plazaConcreteMat, lowerStairCenterX, stairBaseY + stepH * 0.5, stepZ);
        }

        // 5. 4-Step Right-Side Staircase descending toward Washington St (lx = 10.65m..12.61m, outer edge flush with Front Pavilion wall 12.61m):
        //    Tucked between the indented front brick wall (lz = frontWingZ = 14.14m) and the back retaining wall of the Right Square Lawn (lz = 16.47m)
        const rightStairZ0 = frontWingZ;
        const rightStairZ1 = wallZ + 1.85;
        const rightStairDepth = rightStairZ1 - rightStairZ0;
        const rightStairCenterZ = (rightStairZ0 + rightStairZ1) * 0.5;
        const rightNumSteps = 4;
        const rightStepRise = Math.abs(lowerPlazaY) / (rightNumSteps + 1); // 4 intermediate steps above lowerPlazaY
        const rightStepRunX = 0.49;
        const rightStairStartX = 12.61 - rightNumSteps * rightStepRunX; // 10.65m so bottom step ends at exact lx = 12.61m
        for (let rs = 0; rs < rightNumSteps; rs++) {
            const rTopY = -(rs + 1) * rightStepRise;
            const rH = rTopY - stairBaseY;
            const rx = rightStairStartX + (rs + 0.5) * rightStepRunX;
            addBox(rightStepRunX, rH, rightStairDepth, plazaConcreteMat, rx, stairBaseY + rH * 0.5, rightStairCenterZ);
        }

        // 6. Double-Tier Black Wrought-Iron Front Stair Handrails with Middle Landing & Looped P-Returns (f097f1e6.jpg, 19f695cf.jpg, 3b9c07db.jpg)
        //    2 handrail lines (lx = 3.16m, 5.84m flanking the blue-gray center steps; no guard rail on the right stairs)
        const upperStairSpanZ = (numSteps - 1) * stepRunZ; // 1.30m
        const upperStairEndZ = deckFrontZ + upperStairSpanZ; // wallZ + 4.25m = 18.87m
        const lowerStairEndZ = upperTerraceFrontZ + lowerNumSteps * lowerStepRun; // 20.13m

        [3.16, 5.84].forEach((rx) => {
            // Upper tier sloped handrail (from portico deck down to Upper Terrace)
            const uLen = Math.hypot(upperStairSpanZ, deckY) + 0.12;
            const uRail = addBox(0.042, 0.042, uLen, darkMetalMat, rx, deckY * 0.5 + 0.82, deckFrontZ + upperStairSpanZ * 0.5);
            uRail.rotation.x = Math.atan2(deckY, upperStairSpanZ);
            addBox(0.038, 0.84, 0.038, darkMetalMat, rx, deckY + 0.42, deckFrontZ + 0.04);
            addBox(0.038, 0.84, 0.038, darkMetalMat, rx, 0.42, upperStairEndZ);
            // Top & middle horizontal return bends
            addBox(0.042, 0.042, 0.22, darkMetalMat, rx, 0.82, upperStairEndZ + 0.10);

            // Lower tier sloped handrail (stepping down the 3 lower concrete steps to the Lower Plaza, for lx = 3.16m & 5.84m)
            if (rx <= 6.0) {
                const lSpanZ = lowerNumSteps * lowerStepRun;
                const lDropY = Math.abs(lowerPlazaY);
                const lLen = Math.hypot(lSpanZ, lDropY) + 0.12;
                const lRail = addBox(
                    0.042,
                    0.042,
                    lLen,
                    darkMetalMat,
                    rx,
                    -lDropY * 0.5 + 0.82,
                    upperTerraceFrontZ + lSpanZ * 0.5
                );
                lRail.rotation.x = Math.atan2(lDropY, lSpanZ);
                addBox(0.038, 0.84, 0.038, darkMetalMat, rx, 0.42, upperTerraceFrontZ + 0.04);
                addBox(0.038, 0.84, 0.038, darkMetalMat, rx, lowerPlazaY + 0.42, lowerStairEndZ);
                // Looped P-shaped curved end return at bottom post (seen in f097f1e6.jpg & 19f695cf.jpg)
                addBox(0.042, 0.042, 0.18, darkMetalMat, rx, lowerPlazaY + 0.82, lowerStairEndZ + 0.08);
                addBox(0.042, 0.18, 0.042, darkMetalMat, rx, lowerPlazaY + 0.73, lowerStairEndZ + 0.16);
                addBox(0.042, 0.042, 0.18, darkMetalMat, rx, lowerPlazaY + 0.64, lowerStairEndZ + 0.08);
            }
        });

        // 7. RIGHT SQUARE LAWN ("the right square lawn" — ffcaac33.jpg, 6b9c1a26.jpg, 232bfcca.jpg, 28f96301.jpg, 29a2721c.jpg, eadec65d.jpg):
        //    - Grass surface is at y = 0.0m (flush with the Upper Terrace walkway along its inner back-left edge!)
        //    - Retained above the Lower Plaza & Sidewalk (y = -0.51m) by a thick white-painted concrete retaining wall
        //      with a rounded front-right corner (at Douglas & Washington), weathered stone-patch & crack lines (6b9c1a26.jpg & 232bfcca.jpg),
        //      and a distinct 18cm-wide raised concrete coping rim around the perimeter of the grass.
        const weatheredWallCanvas = document.createElement('canvas');
        weatheredWallCanvas.width = 512;
        weatheredWallCanvas.height = 128;
        const wwCtx = weatheredWallCanvas.getContext('2d');
        wwCtx.fillStyle = '#ede8de';
        wwCtx.fillRect(0, 0, 512, 128);
        // Subtle weathered concrete mottling, form-board horizontal seam & diagonal crack line seen in 6b9c1a26.jpg & 232bfcca.jpg
        for (let i = 0; i < 900; i++) {
            wwCtx.fillStyle = i % 2 === 0 ? 'rgba(120,114,104,0.08)' : 'rgba(255,253,248,0.08)';
            wwCtx.fillRect((i * 67) % 512, (i * 29) % 128, 12, 6);
        }
        wwCtx.strokeStyle = 'rgba(95,88,78,0.45)';
        wwCtx.lineWidth = 2.0;
        wwCtx.beginPath();
        wwCtx.moveTo(0, 58);
        wwCtx.lineTo(512, 62);
        wwCtx.moveTo(180, 4);
        wwCtx.lineTo(196, 52);
        wwCtx.lineTo(215, 124);
        wwCtx.stroke();
        const weatheredWallTex = new THREE.CanvasTexture(weatheredWallCanvas);
        weatheredWallTex.wrapS = THREE.RepeatWrapping;
        weatheredWallTex.wrapT = THREE.RepeatWrapping;
        weatheredWallTex.colorSpace = THREE.SRGBColorSpace;
        const rightLawnWallMat = new THREE.MeshStandardMaterial({
            map: weatheredWallTex,
            bumpMap: weatheredWallTex,
            bumpScale: 0.03,
            roughness: 0.85,
            metalness: 0.03
        });

        // Build the elevated planter footprint with the red-marked left region removed (890ee219.jpg):
        // - Back section (lz = wallZ + 1.85m to wallZ + 4.15m): left edge at lx = 10.55m (clearing the Upper Terrace & portico stairs)
        // - Front section (lz = wallZ + 4.15m to wallZ + 7.05m): left edge at lx = 9.76m (aligned with the right edge of the portico stairs)
        // - Right edge at lx = 14.70m (aligned with Washington St fence decoration) with rounded front-right bullnose corner (r = 1.45m)
        const createRightPlanterShape = (inset = 0) => {
            const xBackLeft = 10.55 + inset;
            const xFrontLeft = 9.76 + inset;
            const xRight = 14.70 - inset;
            const zBack = wallZ + 1.85 + inset;
            const zStep = wallZ + 4.15 + inset;
            const zFront = wallZ + 7.05 - inset;
            const r = Math.max(0.2, 1.45 - inset);

            const s = new THREE.Shape();
            // Note: rotateX(-Math.PI / 2) maps Shape (x, y) -> 3D (x, -z), so y = -z
            s.moveTo(xBackLeft, -zBack);
            s.lineTo(xRight, -zBack);
            s.lineTo(xRight, -(zFront - r));
            s.absarc(xRight - r, -(zFront - r), r, 0, -Math.PI * 0.5, true);
            s.lineTo(xFrontLeft, -zFront);
            s.lineTo(xFrontLeft, -zStep);
            s.lineTo(xBackLeft, -zStep);
            s.closePath();
            return s;
        };
        const rightLawnBaseY = lowerPlazaY - 0.30; // extend base into contoured concrete
        const rightLawnWallH = 0.85;               // from rightLawnBaseY (-0.81m) up to +0.04m coping lip

        const outerPlanterShape = createRightPlanterShape(0);
        const outerPlanterGeo = new THREE.ExtrudeGeometry(outerPlanterShape, {
            depth: rightLawnWallH,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.02,
            bevelSegments: 2
        });
        outerPlanterGeo.rotateX(-Math.PI / 2);
        const outerPlanterMesh = new THREE.Mesh(outerPlanterGeo, rightLawnWallMat);
        outerPlanterMesh.position.set(0, rightLawnBaseY, 0);
        outerPlanterMesh.castShadow = true;
        outerPlanterMesh.receiveShadow = true;
        arch.add(outerPlanterMesh);

        // Lush green turf recessed inside the 18cm-wide white concrete curb wall (ffcaac33.jpg, 6b9c1a26.jpg, 232bfcca.jpg)
        const innerTurfGeo = new THREE.ExtrudeGeometry(createRightPlanterShape(0.18), {
            depth: rightLawnWallH + 0.025,
            bevelEnabled: false
        });
        innerTurfGeo.rotateX(-Math.PI / 2);
        const innerTurfMesh = new THREE.Mesh(innerTurfGeo, turfMat);
        innerTurfMesh.position.set(0, rightLawnBaseY, 0);
        innerTurfMesh.receiveShadow = true;
        arch.add(innerTurfMesh);

        // Stamped "DOUGLAS ST" impression in the concrete sidewalk right in front of the rounded corner of the Right Square Lawn (6b9c1a26.jpg)
        const stampTex = this._createTextPlaqueTexture(['DOUGLAS ST'], '#e2dcd0', '#8f887b', 512, 96);
        const stampMat = new THREE.MeshStandardMaterial({ map: stampTex, roughness: 0.88 });
        const stampMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.26), stampMat);
        stampMesh.rotation.x = -Math.PI * 0.5;
        stampMesh.rotation.z = -0.35;
        stampMesh.position.set(13.85, getConcreteTopY(13.85, wallZ + 7.45) + 0.015, wallZ + 7.45);
        arch.add(stampMesh);

        // 8. LEFT-SIDE LAWN (58d5c80a.jpg, 3b9c07db.jpg, b15a030b.jpg & 51a0f668.jpg):
        //    Flush with the Upper Terrace walkway (y = 0.0m, zBack = wallZ + 4.25m) on the back/left, and shortened in front
        //    so its front edge (zFront = wallZ + 7.05m) aligns with the 2 square planters and the Right Square Lawn!
        //    (Circle object leftWalkFillet removed per 51a0f668.jpg)
        addBox(3.15, 0.78, 2.80, whiteCurbMat, -1.85, lowerPlazaY + 0.15, wallZ + 5.65);
        addBox(2.85, 0.80, 2.55, turfMat, -1.92, lowerPlazaY + 0.16, wallZ + 5.62);

        // 9. 2 Hollow White-Painted Concrete Square Planter Boxes on the Lower Forecourt Plaza (f097f1e6.jpg & 19f695cf.jpg):
        //    Aligned with Pillar 2 (lx = 3.08m) and Pillar 3 (lx = 5.92m) at the base of the lower stairs
        const soilMat = new THREE.MeshLambertMaterial({ color: '#3b332a' });
        [3.08, 5.92].forEach((px) => {
            const pz = wallZ + 6.55;
            const pSize = 0.96;
            const pWall = 0.10;
            const pH = 0.62;
            const pBaseY = getConcreteTopY(px, pz);
            const py = pBaseY + pH * 0.5;
            // 4 hollow white concrete walls
            addBox(pSize, pH, pWall, whiteCurbMat, px, py, pz + (pSize - pWall) * 0.5);
            addBox(pSize, pH, pWall, whiteCurbMat, px, py, pz - (pSize - pWall) * 0.5);
            addBox(pWall, pH, pSize - pWall * 2, whiteCurbMat, px - (pSize - pWall) * 0.5, py, pz);
            addBox(pWall, pH, pSize - pWall * 2, whiteCurbMat, px + (pSize - pWall) * 0.5, py, pz);
            // Recessed soil core 14cm below top rim
            addBox(pSize - pWall * 2, pH - 0.14, pSize - pWall * 2, soilMat, px, pBaseY + (pH - 0.14) * 0.5, pz);
        });

        // Helper for Black Pole Globe Lanterns with 4-Ribbed Metal Cages on Tall Concrete Pedestals (f097f1e6.jpg, 3b9c07db.jpg)
        const addCagedGlobeLamp = (lx, ly, lz, poleH = 2.55, pedH = 0.68) => {
            if (pedH > 0) {
                addBox(0.44, pedH, 0.44, whiteCurbMat, lx, ly + pedH * 0.5, lz);
                addBox(0.46, 0.09, 0.46, darkMetalMat, lx, ly + pedH + 0.045, lz);
            }
            const baseTop = ly + pedH + 0.09;
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, poleH, 12), darkMetalMat);
            post.position.set(lx, baseTop + poleH * 0.5, lz);
            post.castShadow = true;
            arch.add(post);

            const globeY = baseTop + poleH + 0.22;
            const globe = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 14), globeMat);
            globe.position.set(lx, globeY, lz);
            arch.add(globe);

            // Black equatorial ring & vertical metal cage ribs around the globe lantern
            const eqRing = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 16), darkMetalMat);
            eqRing.position.set(lx, globeY, lz);
            arch.add(eqRing);
            addBox(0.50, 0.30, 0.03, darkMetalMat, lx, globeY - 0.08, lz);
            addBox(0.03, 0.30, 0.50, darkMetalMat, lx, globeY - 0.08, lz);
        };

        // Forecourt & SW Sidewalk Caged Globe Lamps matching exact photo positions (eadec65d.jpg, 58d5c80a.jpg, 3b9c07db.jpg)
        addCagedGlobeLamp(9.80, lowerPlazaY, wallZ + 4.35, 2.55, 1.05);  // Right lawn corner lamp pedestal at right edge of stairs
        addCagedGlobeLamp(-0.30, lowerPlazaY, wallZ + 4.35, 2.55, 1.05); // Left lawn corner lamp pedestal at left edge of stairs
        addCagedGlobeLamp(-4.65, getConcreteTopY(-4.65, wallZ + 1.85), wallZ + 1.85, 2.75, 0.12); // SW sidewalk front globe lamp (00de5feb.jpg & 09a0228b.jpg)
        addCagedGlobeLamp(-4.65, getConcreteTopY(-4.65, -3.50), -3.50, 2.75, 0.12);               // SW sidewalk middle globe lamp (09a0228b.jpg)
        addCagedGlobeLamp(-4.65, getConcreteTopY(-4.65, -11.50), -11.50, 2.75, 0.12);             // SW sidewalk rear globe lamp (09a0228b.jpg)

        // White Metal Entrance Sign Post & Blue Handicap Parking Sign Post + Red Fire Hydrant (00de5feb.jpg)
        addBox(0.05, 1.35, 0.05, galvSteelMat, -0.32, 0.68, wallZ + 3.15);
        addBox(0.32, 0.44, 0.03, whiteCurbMat, -0.32, 1.25, wallZ + 3.17);
        addBox(0.05, 1.45, 0.05, galvSteelMat, -3.55, 0.72, wallZ + 1.45);
        addBox(0.32, 0.42, 0.03, new THREE.MeshBasicMaterial({ color: '#2563eb' }), -3.55, 1.32, wallZ + 1.47);
        const hydrant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.78, 10), new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.5 }));
        hydrant.position.set(-1.35, getConcreteTopY(-1.35, wallZ + 7.55) + 0.39, wallZ + 7.55);
        arch.add(hydrant);

        // Tall Silver Curved-Arm Streetlight Pole at the Douglas & Washington Corner with Flared Base & Oval Access Cover (6b9c1a26.jpg)
        const streetPoleX = 15.20;
        const streetPoleZ = wallZ + 6.95;
        const streetPoleBaseY = getConcreteTopY(streetPoleX, streetPoleZ);
        const poleBaseCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.21, 0.24, 8), galvSteelMat);
        poleBaseCollar.position.set(streetPoleX, streetPoleBaseY + 0.12, streetPoleZ);
        arch.add(poleBaseCollar);
        const mainPole = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.14, 8.4, 16), galvSteelMat);
        mainPole.position.set(streetPoleX, streetPoleBaseY + 4.2, streetPoleZ);
        mainPole.castShadow = true;
        arch.add(mainPole);
        // Oval hand-hole access cover plate near bottom of pole (seen in 6b9c1a26.jpg)
        const handHole = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.03, 14), galvSteelMat);
        handHole.scale.set(1.0, 1.65, 1.0);
        handHole.rotation.x = Math.PI * 0.5;
        handHole.position.set(streetPoleX, streetPoleBaseY + 0.48, streetPoleZ + 0.13);
        arch.add(handHole);
        const mastArm = addBox(0.08, 0.08, 2.8, galvSteelMat, streetPoleX - 0.6, streetPoleBaseY + 8.35, streetPoleZ + 1.1);
        mastArm.rotation.y = -0.45;
        mastArm.rotation.x = -0.15;
        addBox(0.45, 0.10, 0.26, globeMat, streetPoleX - 1.2, streetPoleBaseY + 8.52, streetPoleZ + 2.2);
        // Yellow Diamond Traffic Sign mounted on the streetlight pole (eadec65d.jpg)
        const diamondSign = addBox(
            0.65,
            0.65,
            0.04,
            new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.4 }),
            streetPoleX - 0.12,
            streetPoleBaseY + 2.55,
            streetPoleZ + 0.12
        );
        diamondSign.rotation.z = Math.PI * 0.25;

        // --- C. 3D MONUMENTAL ROUND-ARCHED WINDOWS, SILL-BALCONIES & SUNKEN LIGHTWELLS ON NE (+X) & SW (-X) SIDES ---
        // Helper to build a true 3D round-arched window with brick archivolt, keystone, white sash & optional bracketed sill-balcony
        const addMonumentalArchedWindow = (wx, wy, wz, sideDir = 1, hasBalcony = false) => {
            const wGroup = new THREE.Group();
            wGroup.position.set(wx, wy, wz);
            // sideDir = +1 for NE Washington St (+X), -1 for SW Parking Lot (-X)
            wGroup.rotation.y = sideDir > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;

            const winW = 1.68;
            const rectH = 2.65;
            const archR = winW * 0.5;

            // Brick soldier-course surround + recessed white sash frame + dark glass pane
            addBox(winW + 0.28, rectH, 0.10, creamBrickSolidMat, 0, rectH * 0.5, 0.02, wGroup);
            addBox(winW + 0.16, rectH, 0.14, whiteCurbMat, 0, rectH * 0.5, 0.03, wGroup);
            addBox(winW, rectH - 0.12, 0.18, glassMat, 0, rectH * 0.5, 0.045, wGroup);
            // Interior light-colored window blind visible in the upper half of the rectangular sash (seen in af89d0d1.jpg & c962dc65.jpg)
            addBox(winW - 0.08, rectH * 0.42, 0.17, plinthConcreteMat, 0, rectH * 0.74, 0.042, wGroup);
            // Prominent horizontal white transom bar separating rectangular sash from semicircular fanlight
            addBox(winW + 0.12, 0.10, 0.24, whiteCurbMat, 0, rectH - 0.03, 0.07, wGroup);

            // Semicircular arched glass fanlight + brick soldier-course archivolt + projecting trapezoidal limestone keystone
            const archDisc = new THREE.Mesh(
                new THREE.CylinderGeometry(archR + 0.16, archR + 0.16, 0.15, 24, 1, false, 0, Math.PI),
                creamBrickSolidMat
            );
            archDisc.rotation.z = Math.PI * 0.5;
            archDisc.rotation.y = Math.PI * 0.5;
            archDisc.position.set(0, rectH, 0.03);
            wGroup.add(archDisc);

            const sashDisc = new THREE.Mesh(
                new THREE.CylinderGeometry(archR + 0.06, archR + 0.06, 0.17, 22, 1, false, 0, Math.PI),
                whiteCurbMat
            );
            sashDisc.rotation.z = Math.PI * 0.5;
            sashDisc.rotation.y = Math.PI * 0.5;
            sashDisc.position.set(0, rectH, 0.04);
            wGroup.add(sashDisc);

            const glassDisc = new THREE.Mesh(
                new THREE.CylinderGeometry(archR - 0.02, archR - 0.02, 0.20, 20, 1, false, 0, Math.PI),
                glassMat
            );
            glassDisc.rotation.z = Math.PI * 0.5;
            glassDisc.rotation.y = Math.PI * 0.5;
            glassDisc.position.set(0, rectH, 0.05);
            wGroup.add(glassDisc);

            // Projecting sculpted limestone keystone at crown of arch (c962dc65.jpg)
            addBox(0.28, 0.44, 0.26, trimMat, 0, rectH + archR + 0.08, 0.08, wGroup);
            addBox(0.34, 0.16, 0.28, trimMat, 0, rectH + archR + 0.24, 0.09, wGroup);

            if (hasBalcony) {
                // Solid Molded Classical Limestone Pedestal Sill-Balcony Apron (seen in close-up 19a77a6c.jpg!):
                // - Projecting top sill cap + torus molding
                // - Recessed rectangular stone dado core (no separate dangling legs!)
                // - Flared multi-stepped lower base molding with side returns
                addBox(2.36, 0.16, 0.48, trimMat, 0, -0.08, 0.20, wGroup);            // Top projecting sill cap
                addBox(2.22, 0.10, 0.42, plinthConcreteMat, 0, -0.21, 0.17, wGroup);  // Upper necking molding
                addBox(2.08, 0.46, 0.34, trimMat, 0, -0.49, 0.14, wGroup);            // Solid stone dado core
                addBox(1.82, 0.30, 0.36, plinthConcreteMat, 0, -0.49, 0.15, wGroup);  // Subtle central stone tablet face
                addBox(2.24, 0.12, 0.42, trimMat, 0, -0.78, 0.17, wGroup);            // Lower torus flare 1
                addBox(2.40, 0.16, 0.50, trimMat, 0, -0.92, 0.21, wGroup);            // Flared bottom plinth molding
                addBox(2.18, 0.08, 0.38, plinthConcreteMat, 0, -1.04, 0.15, wGroup);  // Under-apron drip molding
            } else {
                // Projecting limestone window sill + True 3D Recessed Brick Spandrel Indentation below sill (seen in 19a77a6c.jpg!):
                // - Top projecting stone sill
                // - Recessed brick apron panel framed on left, right, and bottom by raised brick border piers/rails
                addBox(winW + 0.34, 0.15, 0.26, trimMat, 0, -0.075, 0.09, wGroup);
                // Recessed shadow backing + inset brick panel
                addBox(winW - 0.12, 0.58, 0.03, plinthConcreteMat, 0, -0.44, 0.015, wGroup);
                addBox(winW - 0.16, 0.52, 0.04, creamBrickSolidMat, 0, -0.44, 0.02, wGroup);
                // Raised left & right vertical brick border piers + bottom horizontal brick sill rail framing the indentation
                [-winW * 0.5 - 0.04, winW * 0.5 + 0.04].forEach((bx) => {
                    addBox(0.18, 0.64, 0.09, creamBrickSolidMat, bx, -0.44, 0.045, wGroup);
                });
                addBox(winW + 0.26, 0.11, 0.10, creamBrickSolidMat, 0, -0.78, 0.05, wGroup);
            }

            arch.add(wGroup);
        };

        const washX = 12.25;

        // Vertical stepped brick pilaster reveal on the left edge of the Front Pavilion (seen at left of 19a77a6c.jpg)
        addBox(0.08, 6.85, 0.42, creamBrickSolidMat, washX + 0.38, 4.00, frontWingZ - 0.21);

        // Tall smooth concrete water-table plinth with beveled top ledge at sidewalk grade on the Front & Rear Pavilions (19a77a6c.jpg & adc547e2.jpg)
        // Extended down by 2 feet (0.61m) to meet the lowered Washington St grade cleanly!
        const frontPavLen = frontWingZ - 7.30; // 6.84m
        const frontPavMidZ = (frontWingZ + 7.30) * 0.5; // 10.72m
        addBox(0.14, 2.25, frontPavLen + 0.04, plinthConcreteMat, washX + 0.36, lowerPlazaY + 0.425, frontPavMidZ);
        addBox(0.18, 0.08, frontPavLen + 0.08, trimMat, washX + 0.38, lowerPlazaY + 1.56, frontPavMidZ); // Top water-table bevel ledge
        addBox(0.14, 2.25, 5.48, plinthConcreteMat, washX + 0.36, lowerPlazaY + 0.425, -13.92);
        addBox(0.18, 0.08, 5.52, trimMat, washX + 0.38, lowerPlazaY + 1.56, -13.92);

        // 2 Recessed Louvered Foundation Vents in the Front Pavilion concrete water-table base (seen in close-up 19a77a6c.jpg at lz = 11.85m & lz = 9.05m!)
        [11.85, 9.05].forEach((vz) => {
            addBox(0.08, 0.28, 0.52, whiteCurbMat, washX + 0.41, lowerPlazaY + 0.36, vz);
            for (let lv = -2; lv <= 2; lv++) {
                addBox(0.10, 0.025, 0.46, plinthConcreteMat, washX + 0.42, lowerPlazaY + 0.36 + lv * 0.05, vz);
            }
        });

        // Procedural Weathered Tan/Buff Concrete-Stucco Material for SW Central Wall & Rear Gable/Box (0885db8a.jpg, 6aac1e2a.jpg, ef31cc76.jpg, 3fb3243e.jpg)
        const stuccoCanvas = document.createElement('canvas');
        stuccoCanvas.width = 256;
        stuccoCanvas.height = 256;
        const stCtx = stuccoCanvas.getContext('2d');
        stCtx.fillStyle = '#d7ceb8';
        stCtx.fillRect(0, 0, 256, 256);
        for (let x = 0; x < 256; x += 2) {
            const streak = Math.sin(x * 0.23) * 6 + Math.cos(x * 0.71) * 4;
            stCtx.fillStyle = streak > 0 ? `rgba(245,240,228,${streak * 0.012})` : `rgba(95,88,74,${-streak * 0.016})`;
            stCtx.fillRect(x, 0, 2, 256);
        }
        const weatheredStuccoTex = new THREE.CanvasTexture(stuccoCanvas);
        weatheredStuccoTex.wrapS = THREE.RepeatWrapping;
        weatheredStuccoTex.wrapT = THREE.RepeatWrapping;
        weatheredStuccoTex.repeat.set(3, 2);
        weatheredStuccoTex.colorSpace = THREE.SRGBColorSpace;
        const weatheredStuccoMat = new THREE.MeshStandardMaterial({
            map: weatheredStuccoTex,
            roughness: 0.88,
            metalness: 0.02
        });
        const rearBoxStuccoMat = new THREE.MeshStandardMaterial({
            map: weatheredStuccoTex,
            color: '#ebe6d8',
            roughness: 0.86,
            metalness: 0.02
        });

        // Continuous 3D Dentil Band running the entire length of the Washington St (+X) & SW Front Pavilion (-X, lz > 7.25m) Entablature Frieze
        for (let dz = -16.5; dz <= frontWingZ - 0.1; dz += 0.24) {
            const isPavilionZ = dz > 7.25 || dz < -11.15;
            const dentilOutX = isPavilionZ ? washX + 0.46 : washX + 0.12;
            addBox(0.14, 0.13, 0.11, trimMat, dentilOutX, 8.15, dz);
            if (dz > 7.25) {
                addBox(0.14, 0.13, 0.11, trimMat, -3.34, 8.15, dz);
            }
        }

        // Smooth Weathered Concrete/Stucco Cladding on the SW Central Wall (lx = -2.86m, lz = -11.20m..+7.30m, y = -3.60m..+8.85m, 3fb3243e.jpg & 0885db8a.jpg)
        addBox(0.14, 12.45, 18.52, weatheredStuccoMat, -2.84, 2.625, -1.95);
        addBox(0.22, 0.10, 18.56, trimMat, -2.86, 8.88, -1.95); // Clean flat concrete parapet cap along SW Central Wall

        // 8 Monumental Round-Arched Windows along Washington St (+X side, seen in af89d0d1.jpg, 34ff729c.jpg & adc547e2.jpg):
        // 1 on Front Pavilion (with solid molded pedestal balcony), 6 on Central Indented Bay (with recessed brick spandrels), 1 on Rear Pavilion
        addMonumentalArchedWindow(washX + 0.36, 2.55, 10.72, 1, true);
        [5.3, 2.2, -0.9, -4.0, -7.1, -10.0].forEach((wz) => {
            addMonumentalArchedWindow(washX, 2.55, wz, 1, false);
        });
        addMonumentalArchedWindow(washX + 0.36, 2.55, -13.92, 1, true);

        // 6 Monumental Round-Arched Windows along SW Parking Lot Side (-X side, seen in 3fb3243e.jpg, 0885db8a.jpg & 6aac1e2a.jpg):
        // 1 on SW Brick Front Pavilion (lx = -3.24m, lz = +10.72m, with solid molded pedestal balcony) +
        // 5 recessed directly into the smooth weathered concrete/stucco SW Central Wall (lx = -2.86m) with flat concrete sills & lower basement windows!
        addMonumentalArchedWindow(-3.24, 2.55, 10.72, -1, true);
        [4.8, 1.2, -2.4, -6.0, -9.6].forEach((wz) => {
            addMonumentalArchedWindow(-2.86, 2.55, wz, -1, false);
            // Smooth stucco mask over the brick spandrel below each SW central window so only the flat concrete sill shows (3fb3243e.jpg)
            addBox(0.16, 0.78, 2.15, weatheredStuccoMat, -2.86, 2.08, wz);
            // Recessed square basement window directly below each arched window in the SW gravel lightwell (0885db8a.jpg & 3fb3243e.jpg)
            addBox(0.18, 1.05, 1.22, whiteCurbMat, -2.88, -0.52, wz);
            addBox(0.22, 0.88, 1.04, glassMat, -2.90, -0.52, wz);
        });

        // =========================================================================
        // THE TALL SMOOTH-STUCCO REAR BOX ("the box behind 400") & REAR GABLE WALL
        // Moved 1.0m further toward the SW parking area (lx = -5.35m..-0.35m)
        // Matched directly to 0885db8a.jpg, 6aac1e2a.jpg, ef31cc76.jpg & 3fb3243e.jpg
        // =========================================================================
        // 1. Tall Smooth Off-White/Cream Stucco Rear Box (Stair/Mechanical Tower: lx = -5.35m..+4.50m at rear, matching the exact A-Frame roof height y = 10.18m!)
        const rearRoofTopY = 8.42 + 1.76; // 10.18m — exact height of the lifted A-Frame roof ridge
        const rearBoxW = 5.00;
        const rearBoxD = 5.48;
        const rearBoxX = -2.85; // -5.35m to -0.35m (shifted 1.0m toward SW parking area)
        const rearBoxZ = -13.92; // -16.66m to -11.18m
        const rearBoxH = rearRoofTopY - (-3.60); // 13.78m (-3.60m to +10.18m)
        const rearBoxCenterY = (-3.60 + rearRoofTopY) * 0.5; // 3.29m
        addBox(rearBoxW, rearBoxH, rearBoxD, rearBoxStuccoMat, rearBoxX, rearBoxCenterY, rearBoxZ);
        // Dark sheet-metal roof flashing cap crowning the Rear Box flush with the A-Frame roof height (y = 10.18m)
        addBox(rearBoxW + 0.10, 0.08, rearBoxD + 0.10, darkMetalMat, rearBoxX, rearRoofTopY - 0.02, rearBoxZ);
        addBox(rearBoxW - 0.20, 0.06, rearBoxD - 0.20, whiteRoofMat, rearBoxX, rearRoofTopY + 0.01, rearBoxZ);

        // 2. Front (+Z, lz = -11.18m) Step-Out Face of the Rear Box facing the SW Sunken Gravel Lightwell (Photo 1: 0885db8a.jpg)
        //    - Sunken white basement service door at bottom of gravel trench (lx = -3.55m, y = -2.15m..0.0m)
        addBox(0.98, 2.12, 0.10, whiteCurbMat, -3.55, -1.06, -11.14);
        addBox(0.88, 2.02, 0.12, new THREE.MeshStandardMaterial({ color: '#e5e2d9', roughness: 0.7 }), -3.55, -1.06, -11.13);
        addBox(0.08, 0.05, 0.16, darkMetalMat, -3.22, -1.05, -11.11); // Black door lever handle
        //    - Square off-white panel cover above the basement door (lx = -3.65m, y = 2.85m, 0885db8a.jpg)
        addBox(1.02, 1.08, 0.06, whiteCurbMat, -3.65, 2.85, -11.15);
        //    - Two tall vertical galvanized steel conduit pipes climbing the +Z face up to the roof + horizontal conduit bends (0885db8a.jpg)
        addBox(0.055, 10.8, 0.055, galvSteelMat, -5.05, 5.20, -11.13);
        addBox(0.065, 6.8, 0.065, galvSteelMat, -3.02, 7.15, -11.13);
        addBox(1.10, 0.04, 0.04, galvSteelMat, -4.05, 1.55, -11.13);
        //    - Triangular galvanized sheet-metal collector hood / scupper box at the top inner corner (lx = -2.98m, y = 8.92m, 0885db8a.jpg & 3fb3243e.jpg)
        const scupperHood = addBox(0.55, 0.32, 0.45, galvSteelMat, -2.98, 8.92, -11.08);
        scupperHood.rotation.z = -0.22;
        addBox(0.05, 1.85, 0.05, galvSteelMat, -2.96, 9.85, -11.12); // Rooftop vent mast above scupper

        //    - Sunken Gravel Lightwell Trench Floor (lx = -4.25m..-2.86m, lz = -11.20m..+7.30m) + Natural River Boulder (0885db8a.jpg!)
        const gravelMat = new THREE.MeshStandardMaterial({ color: '#6e685c', roughness: 0.96, metalness: 0.02 });
        addBox(1.42, 0.16, 18.50, gravelMat, -3.55, -2.18, -1.95, arch, false);
        addBox(0.30, 2.25, 18.50, plinthConcreteMat, -4.25, -1.08, -1.95, arch, false); // Outer lightwell retaining wall under guardrail
        const boulderGeo = new THREE.DodecahedronGeometry(0.46, 2);
        boulderGeo.scale(0.95, 0.68, 1.45);
        const boulderMesh = new THREE.Mesh(
            boulderGeo,
            new THREE.MeshStandardMaterial({ color: '#847e70', roughness: 0.92, metalness: 0.02 })
        );
        boulderMesh.position.set(-3.88, -1.92, -6.35);
        boulderMesh.rotation.y = 0.25;
        boulderMesh.receiveShadow = true;
        boulderMesh.castShadow = true;
        arch.add(boulderMesh);

        // 3. SW (-X, lx = -5.35m) Face of the Rear Box & Black Chain-Link Fenced Utility Enclosure (Photo 2: 6aac1e2a.jpg)
        //    - Two upper side windows near the rear of the SW face (lz = -15.6m & -14.3m, y = 6.6m..8.0m, 6aac1e2a.jpg)
        [-15.65, -14.35].forEach((wz) => {
            addBox(0.12, 1.42, 0.96, whiteCurbMat, -5.36, 7.30, wz);
            addBox(0.14, 1.26, 0.82, glassMat, -5.37, 7.30, wz);
        });
        //    - Concrete pad + Tall White Double-Door Switchgear Cabinet + Olive-Green Transformer Box inside Black Chain-Link Fence (6aac1e2a.jpg & 0885db8a.jpg)
        const utilPadY = getConcreteTopY(-6.6, -12.6);
        addBox(2.45, 0.24, 4.10, plinthConcreteMat, -6.58, utilPadY + 0.12, -12.65);
        // White double-door metal utility cabinet against Rear Box wall
        addBox(0.82, 2.05, 1.75, new THREE.MeshStandardMaterial({ color: '#e4e8ec', roughness: 0.5, metalness: 0.3 }), -5.82, utilPadY + 1.24, -13.35);
        // Olive-green pad-mounted electrical transformer box in foreground of enclosure
        const greenBoxMat = new THREE.MeshStandardMaterial({ color: '#4d5940', roughness: 0.65, metalness: 0.25 });
        addBox(1.12, 1.52, 1.38, greenBoxMat, -6.75, utilPadY + 0.98, -11.65);
        // Black chain-link fence posts, top/bottom rails & semi-transparent wire mesh panels around [-7.75m..-5.35m, -14.65m..-10.65m]
        const chainMeshMat = new THREE.MeshStandardMaterial({
            color: '#22262a',
            roughness: 0.5,
            metalness: 0.6,
            transparent: true,
            opacity: 0.38,
            side: THREE.DoubleSide
        });
        const fH = 1.95;
        const fY = utilPadY + 0.20 + fH * 0.5;
        // Front (+Z), Outer (-X), and Rear (-Z) chain-link fence panels & rails
        addBox(2.40, fH, 0.02, chainMeshMat, -6.55, fY, -10.65, arch, false);
        addBox(0.02, fH, 4.00, chainMeshMat, -7.75, fY, -12.65, arch, false);
        addBox(2.40, fH, 0.02, chainMeshMat, -6.55, fY, -14.65, arch, false);
        [utilPadY + 0.22, utilPadY + 0.20 + fH].forEach((ry) => {
            addBox(2.42, 0.04, 0.04, darkMetalMat, -6.55, ry, -10.65);
            addBox(0.04, 0.04, 4.02, darkMetalMat, -7.75, ry, -12.65);
            addBox(2.42, 0.04, 0.04, darkMetalMat, -6.55, ry, -14.65);
        });
        [
            [-5.40, -10.65],
            [-6.55, -10.65],
            [-7.75, -10.65],
            [-7.75, -12.65],
            [-7.75, -14.65],
            [-5.40, -14.65]
        ].forEach(([px, pz]) => {
            addBox(0.055, fH + 0.12, 0.055, darkMetalMat, px, fY, pz);
        });

        // 4. Back (-Z, lz = -16.64m) Wall of the Rear Box & Smooth Stucco Pitched-Gable Rear Wall (Photo 3: ef31cc76.jpg)
        //    - Smooth gray-cream painted concrete/stucco cladding across lx = -0.35m..+11.20m (up to the pitched A-frame gable!)
        addBox(11.55, 12.25, 0.18, weatheredStuccoMat, 5.425, 2.525, -16.62);
        //    - Two Upper Square Blue-Reflective Windows on the Rear Box back wall (lx = -4.45m & -2.55m, y = 6.55m..8.15m, ef31cc76.jpg)
        const blueReflGlassMat = new THREE.MeshStandardMaterial({ color: '#3b6e8c', roughness: 0.15, metalness: 0.45 });
        [-4.45, -2.55].forEach((wx) => {
            addBox(1.36, 1.58, 0.12, weatheredStuccoMat, wx, 7.35, -16.68);
            addBox(1.24, 1.44, 0.14, blueReflGlassMat, wx, 7.35, -16.69);
            addBox(1.42, 0.10, 0.18, trimMat, wx, 6.54, -16.71); // Window sill
        });
        //    - Large Projecting Cylindrical Galvanized Exhaust Fan Housing below the right upper window (lx = -4.45m, y = 5.15m, ef31cc76.jpg!)
        const fanDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.50, 0.50, 0.58, 24), galvSteelMat);
        fanDrum.rotation.x = Math.PI * 0.5;
        fanDrum.position.set(-4.45, 5.18, -16.96);
        fanDrum.castShadow = true;
        arch.add(fanDrum);
        const fanCap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.48, 0.16, 24), galvSteelMat);
        fanCap.rotation.x = Math.PI * 0.5;
        fanCap.position.set(-4.45, 5.18, -17.30);
        arch.add(fanCap);
        //    - Painted-Over Blind Window Panels on Rear Box & Gable Wall (ef31cc76.jpg)
        [-4.45, -2.55].forEach((wx) => {
            addBox(1.32, 1.48, 0.06, rearBoxStuccoMat, wx, 3.35, -16.68);
            addBox(1.38, 0.06, 0.09, whiteCurbMat, wx, 2.60, -16.69);
        });
        [3.15, 5.45].forEach((wx) => {
            addBox(1.32, 1.42, 0.06, rearBoxStuccoMat, wx, 6.35, -16.68); // Upper blind panels
            addBox(1.32, 1.48, 0.06, rearBoxStuccoMat, wx, 3.35, -16.68); // Mid blind panels
            addBox(0.92, 1.05, 0.06, rearBoxStuccoMat, wx, 1.10, -16.68); // Lower small blind panels
        });
        //    - Bottom White Louvered Intake Vent Grille + Two White Pipe Guard Bollards with Crossbar + 4 Conduit Boxes (ef31cc76.jpg!)
        addBox(0.96, 1.32, 0.08, whiteCurbMat, -2.45, 0.92, -16.68);
        for (let ly = 0.36; ly <= 1.48; ly += 0.14) {
            addBox(0.84, 0.04, 0.10, darkMetalMat, -2.45, ly, -16.69);
        }
        // Two white steel bollard posts & crossbar in front of the louver vent
        [-2.82, -2.12].forEach((bx) => {
            const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.15, 12), whiteCurbMat);
            bollard.position.set(bx, 0.55, -17.02);
            arch.add(bollard);
        });
        addBox(0.74, 0.06, 0.06, whiteCurbMat, -2.47, 0.85, -17.02);
        // Tilted white access cover + 4 small gray electrical boxes to the right of the louver vent
        const tiltedHatch = addBox(0.56, 0.42, 0.06, whiteCurbMat, -3.55, 0.42, -16.68);
        tiltedHatch.rotation.z = -0.22;
        [-4.05, -4.28, -4.50, -4.72].forEach((bx) => {
            addBox(0.16, 0.42, 0.10, galvSteelMat, bx, 0.28, -16.69);
        });

        // 5. Tall Dark-Brown Creosote Wooden Utility Pole at the SW Rear Corner of the Rear Box (lx = -5.52m, lz = -16.82m, 6aac1e2a.jpg & ef31cc76.jpg)
        const woodPoleMat = new THREE.MeshStandardMaterial({ color: '#3d2b1f', roughness: 0.90, metalness: 0.02 });
        const utilPole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 11.4, 14), woodPoleMat);
        utilPole.position.set(-5.52, 5.50, -16.82);
        utilPole.castShadow = true;
        arch.add(utilPole);
        // Galvanized conduit riser guard along lower half of pole
        const poleRiser = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 4.8, 10), galvSteelMat);
        poleRiser.position.set(-5.42, 2.20, -16.92);
        arch.add(poleRiser);

        // Helper to build a subdivided concrete/asphalt slab contoured to the 3D terrain topography
        const addContouredSlab = (w, h, d, mat, cx, cz, topOffset = 0, segsX = 8, segsZ = 24) => {
            const geo = new THREE.BoxGeometry(w, h, d, segsX, 1, segsZ);
            const pos = geo.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const vx = pos.getX(i);
                const vy = pos.getY(i);
                const vz = pos.getZ(i);
                const topY = getConcreteTopY(cx + vx, cz + vz) + topOffset;
                pos.setY(i, vy > 0 ? topY : topY - h);
            }
            pos.needsUpdate = true;
            geo.computeVertexNormals();
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(cx, 0, cz);
            mesh.receiveShadow = true;
            arch.add(mesh);
            return mesh;
        };

        // SW Side Sunken Basement Stairwell/Areaway & 6-Rail Silver Galvanized Pipe Guardrail + Gate (fe4f41a6.jpg & 9c5e0963.jpg)
        addContouredSlab(3.2, 0.22, 30.0, plazaConcreteMat, -4.5, 1.0, 0, 8, 36); // Contoured SW parking sidewalk
        const railMinZ = -12.2;
        const railMaxZ = frontWingZ + 0.1;
        const railLenSW = railMaxZ - railMinZ;
        const railMidZ = (railMinZ + railMaxZ) * 0.5;
        const railOuterX = -4.25;
        for (let r = 1; r <= 6; r++) {
            const ry = r * 0.17;
            addBox(0.04, 0.04, railLenSW, galvSteelMat, railOuterX, ry, railMidZ);
            addBox(1.02, 0.04, 0.04, galvSteelMat, -3.74, ry, railMaxZ);
        }
        for (let pz = railMinZ; pz <= railMaxZ + 0.1; pz += 2.65) {
            addBox(0.05, 1.08, 0.05, galvSteelMat, railOuterX, 0.54, pz);
        }
        addBox(0.05, 1.08, 0.05, galvSteelMat, -3.26, 0.54, railMaxZ);

        // --- WASHINGTON ST (+X) SUNKEN AREAWAY, EXTERIOR STAIRS, ADA RAMP, DOORS/WINDOWS, BRICK FENCE & SIDEWALK (19a77a6c.jpg & adc547e2.jpg) ---
        // At the Front Pavilion (lz = +10.2m..+14.14m) and Rear Pavilion (lz = -16.64m..-11.2m), the sidewalk comes flush up to the building wall!
        addContouredSlab(2.35, 0.24, 4.2, plazaConcreteMat, washX + 1.15, 12.15, 0, 6, 10);
        addContouredSlab(2.35, 0.24, 5.6, plazaConcreteMat, washX + 1.15, -13.9, 0, 6, 12);

        // Sunken Lightwell Trench Floor (lz = -11.2m to +10.2m)
        addBox(2.35, 0.20, 21.4, plinthConcreteMat, washX + 1.15, -2.45, -0.5, arch, false);

        // Front Sunken Door 1 Landing (lz = +5.4m to +7.8m, y = lowerPlazaY - 0.64m = -1.15m) + 4 Exterior Concrete Steps descending from lz = +10.0m (19a77a6c.jpg!)
        const door1LandingY = lowerPlazaY - 0.64;
        addBox(2.15, 1.35, 2.5, plazaConcreteMat, washX + 1.10, door1LandingY - 0.675, 6.6, arch, false);
        for (let fs = 0; fs < 4; fs++) {
            const fTopY = lowerPlazaY - (fs + 1) * 0.16;
            const fz = 10.0 - (fs + 0.5) * 0.52;
            addBox(2.10, 0.36, 0.54, plazaConcreteMat, washX + 1.10, fTopY - 0.18, fz, arch, false);
        }
        // Sloped black iron handrail mounted on the Front Pavilion wall beside the front sunken stairs (seen in 19a77a6c.jpg!)
        const frontStairRail = addBox(0.04, 0.04, 2.25, darkMetalMat, washX + 0.44, lowerPlazaY + 0.42, 8.95);
        frontStairRail.rotation.x = -0.30;
        addBox(0.035, 0.72, 0.035, darkMetalMat, washX + 0.44, lowerPlazaY + 0.05, 7.90);

        // Rear Sunken Door 2 Exterior Concrete Steps + Curved Black Iron Handrail descending from lz = -11.3m toward Door 2 (seen at right of adc547e2.jpg!)
        for (let rs = 0; rs < 5; rs++) {
            const rTopY = lowerPlazaY - (rs + 1) * 0.28;
            const rz = -11.3 + (rs + 0.5) * 0.34;
            addBox(2.10, 0.40, 0.36, plazaConcreteMat, washX + 1.10, rTopY - 0.20, rz, arch, false);
        }
        const rearStairRail = addBox(0.04, 0.04, 1.95, darkMetalMat, washX + 0.44, lowerPlazaY + 0.22, -10.45);
        rearStairRail.rotation.x = 0.55;

        // Open Pedestrian Entry Walkway (lz = +3.2m to +5.4m, at lowered Washington St sidewalk level) + Sloped Concrete ADA Ramp descending from lz = +3.2m to lz = -8.4m
        const washEntryTopY = getConcreteTopY(washX + 2.22, 4.3);
        addBox(2.20, 1.85, 2.2, plazaConcreteMat, washX + 1.10, washEntryTopY - 0.925, 4.3, arch, false);
        const rampSpanZ = 11.6;
        const rampEndTopY = -1.95;
        const rampDropY = Math.max(0.4, washEntryTopY - rampEndTopY);
        const rampMidY = (washEntryTopY + rampEndTopY) * 0.5;
        const rampLen = Math.hypot(rampSpanZ, rampDropY);
        const adaRamp = addBox(2.15, 0.22, rampLen, plazaConcreteMat, washX + 1.10, rampMidY - 0.10, -2.6, arch, false);
        adaRamp.rotation.x = -Math.atan2(rampDropY, rampSpanZ);
        // Sloped black metal pipe handrail mounted along the brick building wall beside the ADA ramp (19a77a6c.jpg & adc547e2.jpg)
        const wallHandrail = addBox(0.045, 0.045, rampLen + 0.4, darkMetalMat, washX + 0.12, rampMidY + 0.82, -2.6);
        wallHandrail.rotation.x = -Math.atan2(rampDropY, rampSpanZ);

        // Contoured Outer Washington St Concrete Sidewalk (lx = washX + 2.20m out to washX + 5.10m) + Lightwell Retaining Wall
        addContouredSlab(2.90, 0.26, 33.5, plazaConcreteMat, washX + 3.65, -1.0, 0, 8, 44);
        addBox(0.32, 2.20, 21.4, whiteCurbMat, washX + 2.22, -1.40, -0.5, arch, false);

        // 2 White Glazed Entry Doors with 4-Pane Vertical Sidelights (19a77a6c.jpg & adc547e2.jpg):
        // - Door 1 at lz = +6.35m (sunken landing door1LandingY): white door leaf on left (with tall upper glass lite, wide lock rail with red sign strip,
        //   and smaller lower glass lite) + 4-pane vertical sidelight window on right!
        // - Door 2 at lz = -9.45m (bottom of ramp): 4-pane vertical sidelight on left + white glazed door leaf on right!
        [
            { dz: 6.35, by: door1LandingY, sideOffset: -0.52 },
            { dz: -9.45, by: -2.05, sideOffset: 0.52 }
        ].forEach(({ dz, by, sideOffset }) => {
            const doorZ = dz - sideOffset * 0.52;
            const sideZ = dz + sideOffset * 0.86;
            // Outer white door frame + sidelight frame
            addBox(0.16, 2.32, 1.72, whiteCurbMat, washX + 0.04, by + 1.16, dz);
            // Upper & lower glass lites in main door leaf (matched to 19a77a6c.jpg)
            addBox(0.20, 0.96, 0.78, glassMat, washX + 0.06, by + 1.56, doorZ); // Tall upper glass pane
            addBox(0.20, 0.52, 0.78, glassMat, washX + 0.06, by + 0.56, doorZ); // Lower glass pane
            addBox(0.22, 0.22, 0.84, whiteCurbMat, washX + 0.07, by + 0.96, doorZ); // Wide white lock rail
            addBox(0.23, 0.05, 0.42, new THREE.MeshBasicMaterial({ color: '#dc2626' }), washX + 0.08, by + 1.12, doorZ); // Red sign strip on glass
            // 4-pane vertical sidelight window next to door with crisp white horizontal muntin bars (seen in 19a77a6c.jpg!)
            for (let p = 0; p < 4; p++) {
                addBox(0.20, 0.44, 0.36, glassMat, washX + 0.06, by + 0.36 + p * 0.52, sideZ);
            }
        });
        // Round red fire-alarm bell above-left of Door 1 + white wall mailbox/intercom box to the right of Door 1 (seen in 19a77a6c.jpg!)
        const sideBell = new THREE.Mesh(
            new THREE.SphereGeometry(0.11, 12, 12),
            new THREE.MeshBasicMaterial({ color: '#b91c1c' })
        );
        sideBell.scale.set(0.55, 1, 1);
        sideBell.position.set(washX + 0.06, door1LandingY + 2.38, 7.08);
        arch.add(sideBell);
        addBox(0.14, 0.24, 0.22, whiteCurbMat, washX + 0.06, door1LandingY + 1.48, 5.38); // White wall box right of Door 1

        // 4 Square Recessed Basement Windows with White Frames, Dark Glass & Projecting Stone Sills along the Central Bay (19a77a6c.jpg & adc547e2.jpg)
        [
            [3.5, -0.05],
            [0.4, -0.22],
            [-2.6, -0.38],
            [-5.6, -0.52]
        ].forEach(([winZ, winY]) => {
            addBox(0.16, 1.08, 1.18, whiteCurbMat, washX + 0.04, winY, winZ);
            addBox(0.20, 0.90, 1.00, glassMat, washX + 0.06, winY, winZ);
            addBox(0.24, 0.10, 1.28, trimMat, washX + 0.08, winY - 0.56, winZ); // Projecting stone sill
        });

        // 9 Cream-Brick Piers with White Caps, Return Walls, Wrought-Iron Picket Fence & 6 Caged Globe Lamps (19a77a6c.jpg & adc547e2.jpg)
        const fenceX = washX + 2.22;
        const pierSpecs = [
            { z: 10.2, hasLamp: false }, // Pier 1: Front-left pier on sidewalk outside Front Pavilion stairs (19a77a6c.jpg)
            { z: 7.8, hasLamp: true },   // Pier 2: Lamp 1 (left of Door 1, 19a77a6c.jpg)
            { z: 5.4, hasLamp: true },   // Pier 3: Lamp 2 + brick/picket return wall on left of open entry walk (19a77a6c.jpg)
            { z: 3.2, hasLamp: true },   // Pier 4: Lamp 3 on right of open entry walk (19a77a6c.jpg)
            { z: 0.4, hasLamp: false },  // Pier 5: Mid-left pier
            { z: -2.5, hasLamp: false }, // Pier 6: Mid pier
            { z: -5.4, hasLamp: true },  // Pier 7: Lamp 4 (mid-right pier, adc547e2.jpg)
            { z: -8.2, hasLamp: true },  // Pier 8: Lamp 5 (left of Door 2, adc547e2.jpg)
            { z: -10.8, hasLamp: true }, // Pier 9: Lamp 6 (right of Door 2, adc547e2.jpg)
            { z: -12.1, hasLamp: false } // Pier 10: Far-right end pier at Rear Pavilion stairs (adc547e2.jpg)
        ];

        // Cream-brick + wrought-iron picket return wall at Pier 3 (lz = 5.4m, seen in 19a77a6c.jpg!) and Pier 10 (lz = -12.1m)
        [5.4, -12.1].forEach((rz) => {
            const rBaseY = getConcreteTopY(fenceX, rz);
            addBox(2.15, 0.56, 0.30, creamBrickSolidMat, washX + 1.12, rBaseY + 0.28, rz);
            addBox(2.20, 0.07, 0.36, whiteCurbMat, washX + 1.12, rBaseY + 0.59, rz);
            addBox(2.10, 0.04, 0.06, darkMetalMat, washX + 1.12, rBaseY + 1.04, rz);
            addBox(2.10, 0.04, 0.06, darkMetalMat, washX + 1.12, rBaseY + 0.68, rz);
            for (let pkx = washX + 0.20; pkx <= washX + 2.00; pkx += 0.16) {
                addBox(0.03, 0.40, 0.03, darkMetalMat, pkx, rBaseY + 0.86, rz);
            }
        });

        pierSpecs.forEach((p, idx) => {
            const pz = p.z;
            const pBaseY = getConcreteTopY(fenceX, pz);
            // Cream-brick pier with white limestone cap sitting on the contoured Washington St sidewalk
            addBox(0.46, 0.92, 0.46, creamBrickSolidMat, fenceX, pBaseY + 0.46, pz);
            addBox(0.54, 0.09, 0.54, whiteCurbMat, fenceX, pBaseY + 0.96, pz);

            if (p.hasLamp) {
                addCagedGlobeLamp(fenceX, pBaseY + 1.00, pz, 1.65, 0);
            }

            // Low cream-brick wall + black wrought-iron picket fence between consecutive piers (leaving open entry gap between Pier 3 & Pier 4: idx === 2!)
            if (idx < pierSpecs.length - 1 && idx !== 2) {
                const nextZ = pierSpecs[idx + 1].z;
                const span = Math.abs(pz - nextZ) - 0.44;
                const midZ = (pz + nextZ) * 0.5;
                const midBaseY = getConcreteTopY(fenceX, midZ);
                addBox(0.32, 0.56, span, creamBrickSolidMat, fenceX, midBaseY + 0.28, midZ);
                addBox(0.38, 0.07, span, whiteCurbMat, fenceX, midBaseY + 0.59, midZ);
                // Top & bottom wrought-iron rails + vertical pickets
                addBox(0.06, 0.04, span, darkMetalMat, fenceX, midBaseY + 1.04, midZ);
                addBox(0.06, 0.04, span, darkMetalMat, fenceX, midBaseY + 0.68, midZ);
                const numPickets = Math.max(4, Math.floor(span / 0.16));
                for (let pk = 0; pk < numPickets; pk++) {
                    const pkz = Math.min(pz, nextZ) + 0.26 + (pk + 0.5) * ((span - 0.08) / numPickets);
                    addBox(0.03, 0.40, 0.03, darkMetalMat, fenceX, midBaseY + 0.86, pkz);
                }
            }
        });

        // Yellow diamond "15 MPH" street sign post on sidewalk right in front of Pier 3 (seen in 19a77a6c.jpg!)
        const sign15Y = getConcreteTopY(fenceX + 0.35, 5.95);
        addBox(0.05, 2.35, 0.05, galvSteelMat, fenceX + 0.35, sign15Y + 1.18, 5.95);
        const speedDiamond = addBox(
            0.52,
            0.52,
            0.03,
            new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.4 }),
            fenceX + 0.38,
            sign15Y + 2.15,
            5.95
        );
        speedDiamond.rotation.y = Math.PI * 0.5;
        speedDiamond.rotation.z = Math.PI * 0.25;
        addBox(
            0.03,
            0.36,
            0.28,
            new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.4 }),
            fenceX + 0.38,
            sign15Y + 1.55,
            5.95
        );

        // 4 Square Street Tree Pits along the outer edge of the contoured Washington St Sidewalk (19a77a6c.jpg & adc547e2.jpg)
        [8.4, 1.2, -4.5, -10.2].forEach((tz) => {
            const pitY = getConcreteTopY(washX + 3.95, tz);
            addBox(1.15, 0.04, 1.15, soilMat, washX + 3.95, pitY + 0.01, tz, arch, false);
        });

        // --- D. WHITE ROOF ROOM (PENTHOUSE MONITOR WITH PARAPET FRAME), SOLID 3D CENTRAL A-FRAME ROOF, 5 CUPOLAS & HVAC UNITS ---
        // Matched to aerial roof photos b7570195.jpg, 048e987a.jpg, b2658f18.jpg, 21ab28c0.jpg & adc547e2.jpg:
        const roofBaseY = 8.42;

        // 1. Raised White Rectangular Rooftop Room (Penthouse Monitor) over the Front Pavilion (lz = +7.30m to wallZ - 1.15m = +13.47m)
        //    Directly adjoins the raised cream-brick attic parapet wall behind the portico pediment, and has its own raised
        //    perimeter parapet curb frame + internal sloped drainage cricket (048e987a.jpg & b7570195.jpg)!
        const pentRoomX = 4.25;
        const pentRoomZ = 10.42;
        const pentRoomW = 9.20;
        const pentRoomD = 6.25;
        const pentRoomH = 1.48;
        // Main smooth white walls & recessed tan/buff flat roof deck of the rooftop room
        addBox(pentRoomW, pentRoomH, pentRoomD, whiteCurbMat, pentRoomX, roofBaseY + pentRoomH * 0.5, pentRoomZ);
        addBox(pentRoomW - 0.48, 0.08, pentRoomD - 0.48, plinthConcreteMat, pentRoomX, roofBaseY + pentRoomH + 0.02, pentRoomZ);
        // Subtle sloped drainage cricket ridge inside the rooftop room deck (visible in 048e987a.jpg & b7570195.jpg)
        const cricketSlab = addBox(pentRoomW - 0.65, 0.09, pentRoomD * 0.46, whiteCurbMat, pentRoomX, roofBaseY + pentRoomH + 0.08, pentRoomZ + 1.2);
        cricketSlab.rotation.x = -0.04;
        // Raised perimeter parapet wall frame & metal coping crowning the rooftop room (048e987a.jpg & b7570195.jpg)
        const frameT = 0.26;
        const frameH = 0.36;
        const frameY = roofBaseY + pentRoomH + frameH * 0.5;
        addBox(pentRoomW + 0.12, frameH, frameT, whiteCurbMat, pentRoomX, frameY, pentRoomZ + pentRoomD * 0.5 - frameT * 0.5);
        addBox(pentRoomW + 0.12, frameH, frameT, whiteCurbMat, pentRoomX, frameY, pentRoomZ - pentRoomD * 0.5 + frameT * 0.5);
        addBox(frameT, frameH, pentRoomD, whiteCurbMat, pentRoomX - pentRoomW * 0.5 + frameT * 0.5, frameY, pentRoomZ);
        addBox(frameT, frameH, pentRoomD, whiteCurbMat, pentRoomX + pentRoomW * 0.5 - frameT * 0.5, frameY, pentRoomZ);
        // Sheet-metal cap flashing on top of the rooftop room's parapet frame
        addBox(pentRoomW + 0.22, 0.06, frameT + 0.08, whiteRoofMat, pentRoomX, frameY + frameH * 0.5 + 0.02, pentRoomZ + pentRoomD * 0.5 - frameT * 0.5);
        addBox(pentRoomW + 0.22, 0.06, frameT + 0.08, whiteRoofMat, pentRoomX, frameY + frameH * 0.5 + 0.02, pentRoomZ - pentRoomD * 0.5 + frameT * 0.5);
        addBox(frameT + 0.08, 0.06, pentRoomD + 0.12, whiteRoofMat, pentRoomX - pentRoomW * 0.5 + frameT * 0.5, frameY + frameH * 0.5 + 0.02, pentRoomZ);
        addBox(frameT + 0.08, 0.06, pentRoomD + 0.12, whiteRoofMat, pentRoomX + pentRoomW * 0.5 - frameT * 0.5, frameY + frameH * 0.5 + 0.02, pentRoomZ);

        // 2. Solid 3D Extruded Central White Pitched A-Frame Roof Structure behind the Penthouse Room (lifted +1 foot / +0.31m up):
        //    - Has a vertical perimeter curb wall (aFrameEaveH = 0.67m) rising to a pitched A-frame gable peak (aFramePeakH = 1.76m -> y = 10.18m)
        //    - Meets the Rear Box at the exact same roof height (y = 10.18m)!
        const aFrameHalfW = 5.45;
        const aFrameEaveH = 0.67;
        const aFramePeakH = 1.76;
        const aFrameLen = 23.99; // from lz = -16.64m (rear gable wall in ef31cc76.jpg) to lz = +7.35m
        const aFrameZ0 = -16.64;
        const aFrameShape = new THREE.Shape();
        aFrameShape.moveTo(-aFrameHalfW, 0);
        aFrameShape.lineTo(aFrameHalfW, 0);
        aFrameShape.lineTo(aFrameHalfW, aFrameEaveH);
        aFrameShape.lineTo(0, aFramePeakH);
        aFrameShape.lineTo(-aFrameHalfW, aFrameEaveH);
        aFrameShape.closePath();

        const aFrameGeo = new THREE.ExtrudeGeometry(aFrameShape, {
            depth: aFrameLen,
            bevelEnabled: false
        });
        const aFrameMesh = new THREE.Mesh(aFrameGeo, [weatheredStuccoMat, whiteRoofMat]);
        aFrameMesh.position.set(4.50, roofBaseY, aFrameZ0);
        aFrameMesh.castShadow = true;
        aFrameMesh.receiveShadow = true;
        arch.add(aFrameMesh);

        // Raised raking gable-end parapet trim along the rear A-frame triangle (lz = -16.64m, seen in ef31cc76.jpg!)
        const aSlopeLen = Math.hypot(aFrameHalfW, aFramePeakH - aFrameEaveH) + 0.12;
        const aSlopeAng = Math.atan2(aFramePeakH - aFrameEaveH, aFrameHalfW);
        [-1, 1].forEach((dir) => {
            const rakeTrim = addBox(
                aSlopeLen,
                0.14,
                0.26,
                trimMat,
                4.50 + dir * aFrameHalfW * 0.5,
                roofBaseY + (aFrameEaveH + aFramePeakH) * 0.5 + 0.04,
                aFrameZ0 + 0.06
            );
            rakeTrim.rotation.z = -dir * aSlopeAng;
        });
        // Central ridge cap running along the apex of the white A-frame roof (b7570195.jpg)
        addBox(0.38, 0.10, aFrameLen + 0.1, whiteCurbMat, 4.50, roofBaseY + aFramePeakH + 0.03, aFrameZ0 + aFrameLen * 0.5);

        // 3. 5 White Square Cupola Vents with Gray Pyramidal Hip Caps (b7570195.jpg, 048e987a.jpg & adc547e2.jpg)
        const addRoofCupola = (cxPos, cyPos, czPos, size = 0.82, h = 0.92) => {
            addBox(size, h, size, whiteCurbMat, cxPos, cyPos + h * 0.5, czPos);
            const cap = new THREE.Mesh(new THREE.ConeGeometry(size * 0.84, 0.36, 4), galvSteelMat);
            cap.rotation.y = Math.PI * 0.25;
            cap.position.set(cxPos, cyPos + h + 0.18, czPos);
            arch.add(cap);
        };
        // Cupola 1 perched right on the rear-right corner of the raised Penthouse Room parapet (048e987a.jpg & b7570195.jpg!)
        addRoofCupola(8.35, roofBaseY + pentRoomH + 0.12, 7.55, 0.88, 0.98);
        // Cupolas 2 & 3 along the NE (Washington St) lifted A-frame roof eave (b2658f18.jpg & adc547e2.jpg)
        addRoofCupola(9.55, roofBaseY + aFrameEaveH, 1.8, 0.78, 0.88);
        addRoofCupola(9.55, roofBaseY + aFrameEaveH, -7.8, 0.78, 0.88);
        // Cupolas 4 & 5 along the SW (parking lot) lifted A-frame roof eave (b7570195.jpg)
        addRoofCupola(-0.55, roofBaseY + aFrameEaveH, 1.8, 0.78, 0.88);
        addRoofCupola(-0.55, roofBaseY + aFrameEaveH, -7.8, 0.78, 0.88);

        // 4. Rooftop AC Condenser & Twin-Fan Package HVAC Units + Electrical Disconnect Boxes (b7570195.jpg & b2658f18.jpg)
        const hvacMat = new THREE.MeshStandardMaterial({ color: '#8a857e', roughness: 0.55, metalness: 0.35 });
        // Unit 1: Dark louvered square AC condenser right beside the Penthouse Room corner (lz = +6.55m, 048e987a.jpg)
        addBox(1.10, 0.10, 1.10, plinthConcreteMat, 10.2, roofBaseY + 0.05, 6.55);
        addBox(0.88, 0.92, 0.88, darkMetalMat, 10.2, roofBaseY + 0.51, 6.55);
        addBox(0.22, 0.42, 0.16, whiteCurbMat, 8.68, roofBaseY + 0.85, 7.25); // Wall-mounted electrical disconnect box

        // Unit 2: Mid-roof square AC condenser + white electrical disconnect post (lz = -1.6m, b2658f18.jpg)
        addBox(1.05, 0.10, 1.05, plinthConcreteMat, 10.3, roofBaseY + 0.05, -1.6);
        addBox(0.85, 0.88, 0.85, darkMetalMat, 10.3, roofBaseY + 0.49, -1.6);
        addBox(0.20, 0.55, 0.16, whiteCurbMat, 9.75, roofBaseY + 0.72, -1.1);

        // Unit 3: Large twin-fan packaged HVAC unit with 2 circular top fan grilles & dark side louvers (lz = -5.2m, b2658f18.jpg)
        addBox(1.45, 0.96, 2.35, hvacMat, 10.45, roofBaseY + 0.48, -5.2);
        addBox(1.48, 0.72, 1.10, darkMetalMat, 10.45, roofBaseY + 0.46, -5.75); // Dark condenser coil grille half
        [-4.65, -5.70].forEach((fz) => {
            const fanRing = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 18), darkMetalMat);
            fanRing.position.set(10.45, roofBaseY + 0.97, fz);
            arch.add(fanRing);
        });

        // Unit 4: Tall dark-gray vertical HVAC cabinet near rear parapet (lz = -9.8m, 21ab28c0.jpg)
        addBox(0.92, 1.18, 1.25, darkMetalMat, 9.65, roofBaseY + 0.59, -9.8);

        // Background SW eave HVAC units visible in b7570195.jpg
        addBox(0.90, 0.85, 0.90, hvacMat, -0.55, roofBaseY + 0.45, -2.2);
        addBox(1.30, 0.88, 2.10, hvacMat, -0.55, roofBaseY + 0.46, -5.4);
    }

    /**
     * Photo-realistic 4-Level Architectural Reconstruction of Building 316 (316 Washington St — Community Development & Public Works)
     * Modeled directly from the 5 aerial/street reference photographs:
     * - Floor 1 (Basement: y = -4.2m..0.0m) below Washington St grade
     * - Level 2 (Washington St Level: y = 0.0m..4.2m) with left-hand tan-brown running-bond brick entry pier,
     *   silver "316 / WASHINGTON STREET" signage & dark directory box, recessed white-framed glass storefront entry
     *   with open right-hand glass door leaf, bronze dedication plaque, two 5-bay horizontal ribbon windows on Washington St
     *   + Douglas St ribbon windows, continuous white projecting entry/perimeter canopy, and front concrete ADA walk + black handrail + lawn strip
     * - Level 3 (Office Story: y = 4.2m..8.4m) in warm tan/beige architectural precast concrete panels with grid reveal joints,
     *   darker khaki-taupe spandrel band, three 5-bay horizontal ribbon windows on Washington St + Douglas St windows,
     *   and signature white 3D triangular/pyramid architectural wall sconce uplights above the 3rd-floor windows
     * - Level 4 (Clerestory & Recessed Mechanical Roof Court: y = 8.4m..12.65m) with East-side medium-gray stucco core tower bay,
     *   continuous white-mullioned clerestory strip window wrapping NE & NW facades, 5-bay copper/terracotta horizontal louvered
     *   screen wall on NE (Washington St) & 9-bay copper louvered screen wall on NW (Douglas St), recessed gray membrane roof deck,
     *   tall L-shaped light-beige mechanical/elevator penthouse crowned with silver horizontal louvers, pale-yellow double service doors,
     *   caged vertical roof ladder, 2-fan cooling tower/chiller on steel dunnage, and white insulated chilled-water piping across the roof deck
     */
    _buildPhotoRealisticBuilding316(group, building, shape, wallMat, trimMat, terrainY = 0, getTerrainHeightFn = null) {
        const storyH = 4.2;

        // 1. Procedural Warm Precast Concrete Panel Texture with Crisp Grid Joints (for Levels 2 & 3)
        const precastCanvas = document.createElement('canvas');
        precastCanvas.width = 512;
        precastCanvas.height = 512;
        const pCtx = precastCanvas.getContext('2d');
        pCtx.fillStyle = '#c8bca6';
        pCtx.fillRect(0, 0, 512, 512);
        // Subtle architectural aggregate variation
        for (let y = 0; y < 512; y += 64) {
            for (let x = 0; x < 512; x += 128) {
                const j = ((Math.sin(x * 12.3 + y * 27.1) * 43758.5) % 1) * 6 - 3;
                pCtx.fillStyle = `rgb(${200 + j}, ${188 + j}, ${166 + j})`;
                pCtx.fillRect(x + 2, y + 2, 124, 60);
            }
        }
        pCtx.strokeStyle = 'rgba(92, 84, 70, 0.42)';
        pCtx.lineWidth = 3;
        for (let x = 0; x <= 512; x += 128) {
            pCtx.beginPath();
            pCtx.moveTo(x, 0);
            pCtx.lineTo(x, 512);
            pCtx.stroke();
        }
        for (let y = 0; y <= 512; y += 64) {
            pCtx.beginPath();
            pCtx.moveTo(0, y);
            pCtx.lineTo(512, y);
            pCtx.stroke();
        }
        const precastTex = new THREE.CanvasTexture(precastCanvas);
        precastTex.wrapS = THREE.RepeatWrapping;
        precastTex.wrapT = THREE.RepeatWrapping;
        precastTex.repeat.set(0.22, 0.22);
        precastTex.colorSpace = THREE.SRGBColorSpace;

        const tanPrecastMat = new THREE.MeshStandardMaterial({
            map: precastTex,
            roughness: 0.82,
            metalness: 0.04
        });
        const darkSpandrelMat = new THREE.MeshStandardMaterial({
            color: '#9e917b',
            roughness: 0.84,
            metalness: 0.04
        });
        const basementConcreteMat = new THREE.MeshStandardMaterial({
            color: '#a79c88',
            roughness: 0.88,
            metalness: 0.03
        });
        const whiteTrimMat = new THREE.MeshStandardMaterial({
            color: '#f0eee9',
            roughness: 0.65,
            metalness: 0.08
        });
        const grayCoreStuccoMat = new THREE.MeshStandardMaterial({
            color: '#8c908d',
            roughness: 0.80,
            metalness: 0.05
        });
        const roofMembraneMat = new THREE.MeshStandardMaterial({
            color: '#6e7378',
            roughness: 0.88,
            metalness: 0.05
        });
        const penthouseWallMat = new THREE.MeshStandardMaterial({
            color: '#b8b3a8',
            roughness: 0.80,
            metalness: 0.05
        });

        // 2. Procedural Copper/Terracotta Horizontal Louver Texture (Level 4 Screen Wall)
        const copperCanvas = document.createElement('canvas');
        copperCanvas.width = 256;
        copperCanvas.height = 256;
        const cCtx = copperCanvas.getContext('2d');
        cCtx.fillStyle = '#733d20';
        cCtx.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 256; y += 8) {
            cCtx.fillStyle = '#c4794e';
            cCtx.fillRect(0, y, 256, 4);
            cCtx.fillStyle = '#a45d36';
            cCtx.fillRect(0, y + 4, 256, 2);
            cCtx.fillStyle = '#582c15';
            cCtx.fillRect(0, y + 6, 256, 2);
        }
        const copperLouverTex = new THREE.CanvasTexture(copperCanvas);
        copperLouverTex.wrapS = THREE.RepeatWrapping;
        copperLouverTex.wrapT = THREE.RepeatWrapping;
        copperLouverTex.colorSpace = THREE.SRGBColorSpace;
        const copperLouverMat = new THREE.MeshStandardMaterial({
            map: copperLouverTex,
            roughness: 0.52,
            metalness: 0.32
        });
        const copperFrameMat = new THREE.MeshStandardMaterial({
            color: '#b56c43',
            roughness: 0.48,
            metalness: 0.36
        });

        // 3. Procedural Silver/Galvanized Horizontal Louver Texture (Penthouse Crown)
        const silverCanvas = document.createElement('canvas');
        silverCanvas.width = 256;
        silverCanvas.height = 256;
        const sCtx = silverCanvas.getContext('2d');
        sCtx.fillStyle = '#686e75';
        sCtx.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 256; y += 8) {
            sCtx.fillStyle = '#d3d8de';
            sCtx.fillRect(0, y, 256, 4);
            sCtx.fillStyle = '#aeb5bd';
            sCtx.fillRect(0, y + 4, 256, 2);
            sCtx.fillStyle = '#5c6268';
            sCtx.fillRect(0, y + 6, 256, 2);
        }
        const silverLouverTex = new THREE.CanvasTexture(silverCanvas);
        silverLouverTex.wrapS = THREE.RepeatWrapping;
        silverLouverTex.wrapT = THREE.RepeatWrapping;
        silverLouverTex.colorSpace = THREE.SRGBColorSpace;
        const silverLouverMat = new THREE.MeshStandardMaterial({
            map: silverLouverTex,
            roughness: 0.42,
            metalness: 0.55
        });

        // 4. Procedural Tan-Brown Running-Bond Brick Veneer Texture (East Entry Pier & Courtyard Wall)
        const brickCanvas = document.createElement('canvas');
        brickCanvas.width = 256;
        brickCanvas.height = 256;
        const bCtx = brickCanvas.getContext('2d');
        bCtx.fillStyle = '#7c6e5f';
        bCtx.fillRect(0, 0, 256, 256);
        const baseBrick = new THREE.Color('#a87c5f');
        for (let r = 0; r < 16; r++) {
            const off = (r % 2) * 16;
            for (let c = -1; c <= 8; c++) {
                const j = ((Math.sin(r * 17.3 + c * 31.7) * 43758.5) % 1) * 0.06 - 0.03;
                const col = baseBrick.clone().offsetHSL(0, j * 0.3, j);
                bCtx.fillStyle = `#${col.getHexString()}`;
                bCtx.fillRect(c * 32 + off + 2, r * 16 + 2, 29, 13);
            }
        }
        const entryBrickTex = new THREE.CanvasTexture(brickCanvas);
        entryBrickTex.wrapS = THREE.RepeatWrapping;
        entryBrickTex.wrapT = THREE.RepeatWrapping;
        entryBrickTex.repeat.set(2, 2);
        entryBrickTex.colorSpace = THREE.SRGBColorSpace;
        const entryBrickMat = new THREE.MeshStandardMaterial({
            map: entryBrickTex,
            roughness: 0.84,
            metalness: 0.04
        });

        // Glass & Metal Materials
        const officeGlassMat = new THREE.MeshStandardMaterial({
            color: '#4e6e6a',
            roughness: 0.18,
            metalness: 0.35
        });
        const sageBlindGlassMat = new THREE.MeshStandardMaterial({
            color: '#9eb8ad',
            roughness: 0.28,
            metalness: 0.18
        });
        const darkBronzeMat = new THREE.MeshStandardMaterial({
            color: '#26282a',
            roughness: 0.42,
            metalness: 0.62
        });
        const yellowDoorMat = new THREE.MeshStandardMaterial({
            color: '#d9c574',
            roughness: 0.65,
            metalness: 0.08
        });
        const galvSteelMat = new THREE.MeshStandardMaterial({
            color: '#b8bfc6',
            roughness: 0.42,
            metalness: 0.62
        });

        // 5. Extruded Base Footprint Massing for Floor 1 (Basement: -4.2m..0m) & Levels 2–3 (0m..+8.4m)
        // Sub-footing plinth (-6.5m to -4.15m)
        const footingGeo = new THREE.ExtrudeGeometry(shape, { depth: 2.35, bevelEnabled: false });
        footingGeo.rotateX(-Math.PI / 2);
        const footingMesh = new THREE.Mesh(footingGeo, basementConcreteMat);
        footingMesh.position.y = -6.5;
        group.add(footingMesh);

        // Floor 1: Basement below Washington St road grade (-4.2m to 0.0m)
        const bsmtGeo = new THREE.ExtrudeGeometry(shape, { depth: storyH, bevelEnabled: false });
        bsmtGeo.rotateX(-Math.PI / 2);
        const bsmtMesh = new THREE.Mesh(bsmtGeo, basementConcreteMat);
        bsmtMesh.name = 'Layer1_Basement_BelowRoad';
        bsmtMesh.position.y = -storyH;
        bsmtMesh.castShadow = true;
        bsmtMesh.receiveShadow = true;
        bsmtMesh.userData = { isSelectableBuilding: true, building, floorLayer: 1 };
        group.add(bsmtMesh);

        // Levels 2, 3 & 4 Clerestory Base Precast Concrete Body (y = 0.0m to +9.85m across all 8 walls of the footprint)
        const mainBodyGeo = new THREE.ExtrudeGeometry(shape, { depth: 9.85, bevelEnabled: false });
        mainBodyGeo.rotateX(-Math.PI / 2);
        this._applyArchitecturalUVs(mainBodyGeo, 9.85, 2.35);
        const mainBodyMesh = new THREE.Mesh(mainBodyGeo, [roofMembraneMat, tanPrecastMat]);
        mainBodyMesh.name = 'Layer2_3_4_MainPrecastBody';
        mainBodyMesh.position.y = 0.0;
        mainBodyMesh.castShadow = true;
        mainBodyMesh.receiveShadow = true;
        mainBodyMesh.userData = { isSelectableBuilding: true, building, floorLayer: 2 };
        group.add(mainBodyMesh);

        // Darker khaki-taupe architectural spandrel bands wrapping all 8 walls of the footprint
        const addFootprintBand = (yStart, bandH, overhang, mat) => {
            const bGeo = new THREE.ExtrudeGeometry(shape, {
                depth: bandH,
                bevelEnabled: true,
                bevelThickness: 0.03,
                bevelSize: overhang,
                bevelSegments: 1
            });
            bGeo.rotateX(-Math.PI / 2);
            const bMesh = new THREE.Mesh(bGeo, mat);
            bMesh.position.y = yStart;
            bMesh.castShadow = true;
            bMesh.receiveShadow = true;
            group.add(bMesh);
        };
        // Base water-table band (y = 0.0m..0.72m)
        addFootprintBand(0.0, 0.72, 0.05, darkSpandrelMat);
        // Darker khaki spandrel band between Level 2 canopy and Level 3 sill (y = 3.35m..4.32m)
        addFootprintBand(3.35, 0.97, 0.04, darkSpandrelMat);
        // Subtle recessed reveal band at Level 3 window sill (y = 4.92m..5.05m) & head (y = 6.55m..6.68m)
        addFootprintBand(4.92, 0.12, 0.06, darkSpandrelMat);
        addFootprintBand(6.55, 0.12, 0.06, darkSpandrelMat);
        // Crisp white 4th-floor clerestory sill / belt cornice at y = 8.32m..8.50m around all 8 walls
        addFootprintBand(8.32, 0.18, 0.16, whiteTrimMat);
        // Crisp white 4th-floor clerestory head / louver base cornice at y = 9.76m..9.90m around all 8 walls
        addFootprintBand(9.76, 0.14, 0.16, whiteTrimMat);
        // Top copper/terracotta parapet coping cap at y = 12.56m..12.68m around all 8 walls
        addFootprintBand(12.56, 0.12, 0.14, copperFrameMat);

        // 6. Local Axis-Aligned Architectural Detail Group for Building 316
        // theta316 = 2.502907 rad (143.405 deg) aligns:
        //   +Z (lz = +25.40m) -> NE Washington St Front Facade (lx: -11.13m East/Left .. +7.91m North/Right)
        //   +X (lx = +7.91m)  -> NW Douglas St Side Facade (lz: -6.05m Rear .. +25.40m Front)
        //   -X (lx = -11.10m) -> SE Courtyard Side Facade (lz: -6.05m Rear .. +25.40m Front)
        //   -Z (lz = -6.05m / -10.29m) -> SW Rear Facade
        const arch = new THREE.Group();
        arch.name = 'Building316ArchitecturalDetails';
        arch.rotation.y = Math.atan2(0.59621, -0.80283);
        group.add(arch);

        const addBox = (w, h, d, mat, x, y, z, cast = true) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            m.position.set(x, y, z);
            m.castShadow = cast;
            m.receiveShadow = true;
            m.userData = { isSelectableBuilding: true, building };
            arch.add(m);
            return m;
        };

        // Helper: Sample exact terrain contour height along the Douglas St (+X) side of Building 316 relative to Building 316's Washington St base datum
        const bldgCx316 = building.center[0];
        const bldgCz316 = building.center[1];
        const sinT316 = 0.59621006;
        const cosT316 = -0.80282848;
        const getDouglasLocalGroundY = (lx, lz) => {
            if (typeof getTerrainHeightFn !== 'function' || lz >= 25.40) return 0;
            const blend = THREE.MathUtils.smoothstep(25.40 - lz, 0.0, 4.0);
            const wx = bldgCx316 + lx * cosT316 + lz * sinT316;
            const wz = bldgCz316 - lx * sinT316 + lz * cosT316;
            return Math.max(0, (getTerrainHeightFn(wx, wz) - terrainY) * blend);
        };

        // Helper: Build a smooth 3D terrain-contoured slab/strip along the Douglas St (+X) side of Building 316
        const addContouredDouglasStrip = (xMin, xMax, zMin, zMax, topOffset, minBotY, mat, zSteps = 48, sampleX = 11.375) => {
            const positions = [];
            const pushQuad = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) => {
                positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
                positions.push(ax, ay, az, cx, cy, cz, dx, dy, dz);
            };
            for (let i = 0; i < zSteps; i++) {
                const z0 = zMin + (i / zSteps) * (zMax - zMin);
                const z1 = zMin + ((i + 1) / zSteps) * (zMax - zMin);
                const g0 = Math.max(
                    getDouglasLocalGroundY(xMin, z0),
                    getDouglasLocalGroundY(xMax, z0),
                    getDouglasLocalGroundY(sampleX, z0)
                );
                const g1 = Math.max(
                    getDouglasLocalGroundY(xMin, z1),
                    getDouglasLocalGroundY(xMax, z1),
                    getDouglasLocalGroundY(sampleX, z1)
                );
                const yTop0 = g0 + topOffset;
                const yTop1 = g1 + topOffset;
                const yBot0 = Math.min(minBotY, yTop0 - 0.34);
                const yBot1 = Math.min(minBotY, yTop1 - 0.34);

                // Top contoured surface (+Y)
                pushQuad(xMin, yTop0, z0, xMin, yTop1, z1, xMax, yTop1, z1, xMax, yTop0, z0);
                // Outer Douglas St face (+X)
                pushQuad(xMax, yTop0, z0, xMax, yTop1, z1, xMax, yBot1, z1, xMax, yBot0, z0);
                // Inner Building 316 face (-X)
                pushQuad(xMin, yTop1, z1, xMin, yTop0, z0, xMin, yBot0, z0, xMin, yBot1, z1);
                if (i === 0) {
                    pushQuad(xMin, yTop0, z0, xMax, yTop0, z0, xMax, yBot0, z0, xMin, yBot0, z0);
                }
                if (i === zSteps - 1) {
                    pushQuad(xMax, yTop1, z1, xMin, yTop1, z1, xMin, yBot1, z1, xMax, yBot1, z1);
                }
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geo.computeVertexNormals();
            const mesh = new THREE.Mesh(geo, mat);
            mesh.receiveShadow = true;
            mesh.userData = { isSelectableBuilding: true, building };
            arch.add(mesh);
            return mesh;
        };

        // Helper: Multi-Bay White-Mullioned Horizontal Ribbon Window (matches Photos 1, 4, 5)
        const addRibbonWindow = (wallAxis, centerCoord, yBot, totalW, totalH, numBays, hasLowerHopper = true) => {
            const winGrp = new THREE.Group();
            const isZWall = Math.abs(wallAxis.nz) > 0.5;
            if (isZWall) {
                winGrp.position.set(centerCoord, yBot + totalH * 0.5, wallAxis.pos + wallAxis.nz * 0.05);
                if (wallAxis.nz < 0) winGrp.rotation.y = Math.PI;
            } else {
                winGrp.position.set(wallAxis.pos + wallAxis.nx * 0.05, yBot + totalH * 0.5, centerCoord);
                winGrp.rotation.y = wallAxis.nx > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
            }

            // Outer white aluminum perimeter frame
            const frameD = 0.12;
            const frameT = 0.07;
            const topBar = new THREE.Mesh(new THREE.BoxGeometry(totalW + 0.08, frameT, frameD), whiteTrimMat);
            topBar.position.set(0, totalH * 0.5 - frameT * 0.5, 0);
            winGrp.add(topBar);
            const botBar = new THREE.Mesh(new THREE.BoxGeometry(totalW + 0.12, frameT + 0.02, frameD + 0.04), whiteTrimMat);
            botBar.position.set(0, -totalH * 0.5 + frameT * 0.5, 0.02);
            winGrp.add(botBar);

            // Glass panes (alternating subtle blind/glass variation like Photo 1)
            const bayW = totalW / numBays;
            for (let b = 0; b < numBays; b++) {
                const bx = -totalW * 0.5 + (b + 0.5) * bayW;
                const useBlind = (b === 0 || b === 2 || b === numBays - 1);
                const pane = new THREE.Mesh(
                    new THREE.BoxGeometry(bayW - 0.04, totalH - frameT * 2, 0.04),
                    useBlind ? sageBlindGlassMat : officeGlassMat
                );
                pane.position.set(bx, 0, -0.01);
                winGrp.add(pane);
            }

            // Vertical white mullions
            for (let b = 0; b <= numBays; b++) {
                const mx = -totalW * 0.5 + b * bayW;
                const mul = new THREE.Mesh(new THREE.BoxGeometry(0.055, totalH, frameD), whiteTrimMat);
                mul.position.set(mx, 0, 0.01);
                winGrp.add(mul);
            }

            // Horizontal intermediate transom/hopper bar
            if (hasLowerHopper) {
                const hBar = new THREE.Mesh(new THREE.BoxGeometry(totalW, 0.05, frameD), whiteTrimMat);
                hBar.position.set(0, -totalH * 0.22, 0.015);
                winGrp.add(hBar);
            }

            arch.add(winGrp);
        };

        const frontZ = 25.40;
        const douglasX = 7.91;
        const courtX = -11.10;
        const rearZ = -6.05;

        // =========================================================================
        // A. LEVEL 2 (WASHINGTON ST LEVEL: y = 0.0m..3.35m)
        // =========================================================================
        // 1. East-Corner Tan-Brown Running-Bond Brick Veneer Entry Pier (lx: -11.12m..-7.45m, lz = +25.42m)
        addBox(3.68, 3.32, 0.24, entryBrickMat, -9.28, 1.66, frontZ + 0.04);
        // Brick wrap along SE courtyard corner (lz: +18.20m..+25.42m — full length of front core bay as seen in 5e51fcab.jpg!)
        addBox(0.24, 3.32, 7.26, entryBrickMat, courtX - 0.04, 1.66, 21.81);
        // Small warm wall-pack light mounted near top of the brick corner on the SE courtyard side (lz = +23.8m, y = 3.02m, 5e51fcab.jpg!)
        addBox(0.14, 0.16, 0.24, copperFrameMat, courtX - 0.16, 3.02, 23.80);

        // "316 / WASHINGTON STREET" Raised Silver Lettering Plaque on Brick Pier (Photo 1)
        const addrTex = this._createTextPlaqueTexture(
            ['316', 'WASHINGTON STREET'],
            '#a2775b',
            '#f2f4f7',
            512,
            160
        );
        const addrMat = new THREE.MeshStandardMaterial({ map: addrTex, roughness: 0.45, metalness: 0.35 });
        addBox(2.35, 0.58, 0.05, addrMat, -9.28, 2.68, frontZ + 0.17, false);

        // Dark Bronze/Black Directory Sign Box below "316 WASHINGTON STREET" (Photo 1)
        addBox(1.68, 0.88, 0.10, darkBronzeMat, -9.28, 1.65, frontZ + 0.18);
        addBox(1.52, 0.72, 0.03, officeGlassMat, -9.28, 1.65, frontZ + 0.23, false);

        // 2. Recessed White-Framed Aluminum Storefront Entry & Open Double Glass Doors (lx: -7.45m..-3.65m)
        const entryCenterX = -5.55;
        const entryW = 3.80;
        const entryH = 3.15;
        // Recessed vestibule backdrop
        addBox(entryW, entryH, 0.35, officeGlassMat, entryCenterX, entryH * 0.5 + 0.05, frontZ - 0.12);
        // White storefront frame grid (sidelights + transom + center double-door frame)
        addBox(entryW + 0.10, 0.09, 0.18, whiteTrimMat, entryCenterX, entryH + 0.04, frontZ + 0.04);
        addBox(entryW + 0.10, 0.07, 0.18, whiteTrimMat, entryCenterX, 2.28, frontZ + 0.04); // Transom bar
        addBox(0.95, 0.06, 0.16, whiteTrimMat, entryCenterX - 1.42, 0.95, frontZ + 0.04); // Left sidelight mid-rail
        addBox(0.95, 0.06, 0.16, whiteTrimMat, entryCenterX + 1.42, 0.95, frontZ + 0.04); // Right sidelight mid-rail
        [-1.90, -0.95, 0.0, 0.95, 1.90].forEach((dx) => {
            // Skip center mullion inside door opening below transom except thin door stile
            const h = Math.abs(dx) < 0.05 ? entryH - 2.28 : entryH;
            const yPos = Math.abs(dx) < 0.05 ? 2.28 + h * 0.5 : entryH * 0.5 + 0.04;
            addBox(0.07, h, 0.18, whiteTrimMat, entryCenterX + dx, yPos, frontZ + 0.04);
        });
        // Closed Left Door Leaf + Open Right Glass Door Leaf (swung outward at ~55 deg as seen in Photo 1!)
        addBox(0.90, 2.22, 0.05, whiteTrimMat, entryCenterX - 0.48, 1.15, frontZ + 0.02);
        addBox(0.76, 2.02, 0.06, officeGlassMat, entryCenterX - 0.48, 1.15, frontZ + 0.02);
        const openDoorGrp = new THREE.Group();
        openDoorGrp.position.set(entryCenterX + 0.92, 1.15, frontZ + 0.05);
        openDoorGrp.rotation.y = -0.95; // Swung outward toward entry walk
        const doorFrameMesh = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.22, 0.05), whiteTrimMat);
        doorFrameMesh.position.set(-0.46, 0, 0);
        openDoorGrp.add(doorFrameMesh);
        const doorGlassMesh = new THREE.Mesh(new THREE.BoxGeometry(0.76, 2.02, 0.06), officeGlassMat);
        doorGlassMesh.position.set(-0.46, 0, 0);
        openDoorGrp.add(doorGlassMesh);
        arch.add(openDoorGrp);

        // Bronze Historical Plaque + Security Intercom on Precast Pillar to the Right of Entry Doors (lx = -3.15m, Photo 1)
        addBox(0.42, 0.52, 0.05, copperFrameMat, -3.15, 1.48, frontZ + 0.06);
        addBox(0.18, 0.24, 0.04, darkBronzeMat, -3.15, 2.02, frontZ + 0.06);

        // 3. Level 2 Horizontal 5-Bay Ribbon Windows on NE Washington St Facade (Photo 1)
        addRibbonWindow({ pos: frontZ, nz: 1 }, -0.20, 0.78, 4.75, 2.05, 5, true);
        addRibbonWindow({ pos: frontZ, nz: 1 }, 5.00, 0.78, 4.75, 2.05, 5, true);

        // 4. Level 2 Horizontal Ribbon Windows along NW Douglas St (stepped/contoured above the sloped Douglas St water-table plinth!), SE Courtyard & SW Rear Facades
        addContouredDouglasStrip(douglasX - 0.04, douglasX + 0.06, -6.05, 25.40, 0.72, 0.0, darkSpandrelMat, 36);
        [
            [20.6, 5.60, 5],
            [12.8, 5.60, 5],
            [4.8, 5.20, 5],
            [-2.2, 4.20, 4]
        ].forEach(([wz, ww, wbays]) => {
            const localGround = getDouglasLocalGroundY(11.375, wz);
            const winYBot = Math.min(1.68, 0.78 + localGround * 0.52);
            const winH = Math.max(1.35, 2.83 - winYBot);
            addRibbonWindow({ pos: douglasX, nx: 1 }, wz, winYBot, ww, winH, wbays, true);
        });

        // SE Courtyard Facade Level 2 Windows & Panels (lx = -11.10m, matched to 5e51fcab.jpg!):
        // Front bay (lz = 18.2m..25.4m) is solid running-bond brick; behind it at lz = 13.8m is a 2-pane glass window,
        // and at lz = 9.8m & lz = 7.8m are two narrower vertical punched windows, followed by rear ribbon windows.
        addRibbonWindow({ pos: courtX, nx: -1 }, 13.8, 0.78, 2.20, 2.05, 2, true);
        addRibbonWindow({ pos: courtX, nx: -1 }, 9.8, 0.98, 0.85, 1.65, 1, false);
        addRibbonWindow({ pos: courtX, nx: -1 }, 7.8, 0.98, 0.85, 1.65, 1, false);
        addRibbonWindow({ pos: courtX, nx: -1 }, 1.2, 0.78, 5.20, 2.05, 5, true);

        // SW Rear Facade Level 2 Windows (lz = -6.05m & -10.29m)
        addRibbonWindow({ pos: rearZ, nz: -1 }, -7.40, 0.78, 4.80, 2.05, 4, true);
        addRibbonWindow({ pos: -10.29, nz: -1 }, 0.45, 0.78, 5.20, 2.05, 5, true);

        // 5. Continuous Projecting White Overhang Canopy above Level 2 (y = 3.28m, wraps around the SE brick bay to lz = +18.0m as seen in 5e51fcab.jpg!)
        // NE Washington St Canopy (lx: -11.85m..+8.75m, projects 0.95m outward)
        addBox(20.60, 0.22, 1.05, whiteTrimMat, -1.55, 3.28, frontZ + 0.48);
        // NW Douglas St Canopy (lz: -6.15m..+26.00m, projects 0.85m outward)
        addBox(0.95, 0.22, 32.15, whiteTrimMat, douglasX + 0.44, 3.28, 9.92);
        // SE Courtyard Canopy wrapping the front brick bay (lz: +17.90m..+26.00m, projects 0.75m outward over the brick wall, 5e51fcab.jpg!)
        addBox(0.85, 0.22, 8.10, whiteTrimMat, courtX - 0.38, 3.28, 21.95);
        // White-painted fascia band continuing along the SE courtyard wall behind the canopy (lz: -6.05m..+18.00m, y = 3.26m)
        addBox(0.18, 0.20, 24.05, whiteTrimMat, courtX - 0.06, 3.26, 5.98);

        // =========================================================================
        // B. LEVEL 3 (MIDDLE OFFICE STORY: y = 4.20m..8.40m)
        // =========================================================================
        // 1. Three 5-Bay Horizontal Ribbon Windows on NE Washington St Facade (y = 5.05m..6.55m, Photo 1)
        addRibbonWindow({ pos: frontZ, nz: 1 }, -7.25, 5.05, 4.65, 1.50, 5, false);
        addRibbonWindow({ pos: frontZ, nz: 1 }, -1.05, 5.05, 4.65, 1.50, 5, false);
        addRibbonWindow({ pos: frontZ, nz: 1 }, 5.05, 5.05, 4.65, 1.50, 5, false);

        // 2. NW Douglas St Level 3 Ribbon Windows & Punched Windows (Photos 2, 4, 5)
        addRibbonWindow({ pos: douglasX, nx: 1 }, 20.6, 5.05, 5.60, 1.50, 5, false);
        // Two small square punched windows near mid-facade on Douglas St (visible in Photos 2, 4, 5)
        addRibbonWindow({ pos: douglasX, nx: 1 }, 15.2, 5.35, 0.92, 1.15, 1, false);
        addRibbonWindow({ pos: douglasX, nx: 1 }, 13.0, 5.35, 0.92, 1.15, 1, false);
        addRibbonWindow({ pos: douglasX, nx: 1 }, 7.2, 5.05, 5.40, 1.50, 5, false);
        addRibbonWindow({ pos: douglasX, nx: 1 }, -1.5, 5.05, 5.20, 1.50, 5, false);

        // SE Courtyard & SW Rear Level 3 Windows (matched to 5e51fcab.jpg: front bay lz = 18.2m..25.4m is solid scored precast with NO window, only the triangular sconce above!)
        addRibbonWindow({ pos: courtX, nx: -1 }, 12.2, 5.05, 5.40, 1.50, 5, false);
        addRibbonWindow({ pos: courtX, nx: -1 }, 3.8, 5.05, 5.40, 1.50, 5, false);
        addRibbonWindow({ pos: courtX, nx: -1 }, -2.8, 5.05, 4.20, 1.50, 4, false);
        addRibbonWindow({ pos: rearZ, nz: -1 }, -7.40, 5.05, 4.80, 1.50, 4, false);
        addRibbonWindow({ pos: -10.29, nz: -1 }, 0.45, 5.05, 5.20, 1.50, 5, false);

        // 3. Signature White 3D Triangular / Pyramid Architectural Wall Sconces above Level 3 Windows (y = 7.22m, Photos 1, 2, 4, 5 & 5e51fcab.jpg)
        const sconceMat = new THREE.MeshStandardMaterial({
            color: '#f7f8fa',
            emissive: '#fff4d6',
            emissiveIntensity: 0.22,
            roughness: 0.35,
            metalness: 0.1
        });
        // 4 triangular sconces across NE Washington St facade
        [-9.25, -4.05, 1.15, 6.25].forEach((sx) => {
            const sconce = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.56, 3), sconceMat);
            sconce.position.set(sx, 7.22, frontZ + 0.12);
            sconce.rotation.y = Math.PI; // Flat back against +Z wall, triangular prism projecting forward
            sconce.castShadow = true;
            arch.add(sconce);
        });
        // 4 triangular sconces along NW Douglas St facade (Photos 2, 4, 5)
        [23.2, 18.0, 9.8, 1.2].forEach((sz) => {
            const sconce = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.56, 3), sconceMat);
            sconce.position.set(douglasX + 0.12, 7.22, sz);
            sconce.rotation.y = -Math.PI * 0.5;
            sconce.castShadow = true;
            arch.add(sconce);
        });
        // 4 triangular sconces along SE Courtyard facade (front sconce centered on the solid front precast bay at lz = 21.8m as seen in 5e51fcab.jpg!)
        [21.8, 12.2, 3.8, -2.8].forEach((sz) => {
            const sconce = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.56, 3), sconceMat);
            sconce.position.set(courtX - 0.12, 7.22, sz);
            sconce.rotation.y = Math.PI * 0.5;
            sconce.castShadow = true;
            arch.add(sconce);
        });

        // =========================================================================
        // C. LEVEL 4 (CLERESTORY BAND, COPPER LOUVERED SCREEN WALL & SE UPPER WALL: y = 8.40m..12.65m)
        // Matched directly to 5e51fcab.jpg:
        //   On the SE Courtyard facade (lx = -11.10m, facing Building 300):
        //   - Bay 1 (lz = +18.20m..+25.42m): Full-height olive/gray-tan stucco core bay with white vertical panel joints
        //   - Bay 2 (lz = +13.60m..+18.20m): Solid tan stucco panel at clerestory level with 1 single narrow window at lz = +14.60m,
        //     topped by olive/gray-tan stucco panel above (y = 9.88m..12.62m)
        //   - Bays 3 & 4 (lz = +4.40m..+13.60m): Multi-pane white-mullioned clerestory ribbon window (y = 8.48m..9.78m)
        //     topped by 2 framed copper/terracotta horizontal louver bays above (y = 9.88m..12.62m)
        //   - Bay 5 (lz = -6.05m..+4.40m): Solid olive/gray-tan stucco wall with a dark louver grille at the upper rear corner (lz = -4.2m)
        // =========================================================================
        // 1. East-Corner Full-Height Stucco Core Tower Bay (lx: -11.12m..-7.35m, lz: +18.20m..+25.42m, y = 8.40m..12.68m, Photos 1–5 & 5e51fcab.jpg)
        addBox(3.82, 4.28, 7.26, grayCoreStuccoMat, -9.23, 10.54, 21.81);
        // White parapet coping cap on top of the gray core bay
        addBox(3.96, 0.16, 7.40, whiteTrimMat, -9.23, 12.70, 21.81);
        // Crisp white vertical & horizontal panel joint strips on the NE & SE faces of the core bay (Photos 1, 3 & 5e51fcab.jpg!)
        addBox(0.04, 4.26, 0.06, whiteTrimMat, -9.23, 10.525, frontZ + 0.06);
        addBox(3.80, 0.04, 0.06, whiteTrimMat, -9.23, 10.35, frontZ + 0.06);
        [21.80, 18.20, 13.60].forEach((jz) => {
            addBox(0.08, 4.26, 0.04, whiteTrimMat, courtX - 0.04, 10.525, jz);
        });
        // Vertical panel joint scores on the Level 2 & Level 3 SE Courtyard precast wall (aligned with the upper bay joints at lz = 21.8m, 18.2m, 13.6m, 9.0m, 4.4m, 5e51fcab.jpg!)
        [21.80, 18.20, 13.60, 9.00, 4.40].forEach((jz) => {
            addBox(0.06, 4.95, 0.04, darkSpandrelMat, courtX - 0.03, 5.85, jz);
        });

        // 2. Continuous 4th-Floor Clerestory Ribbon Window Band around NE, NW, SE & SW Facades (y = 8.48m..9.78m)
        // NE Washington St Clerestory (from gray core bay lx = -7.34m to North corner lx = +7.91m -> width 15.25m, 15 bays, Photos 1–5)
        addRibbonWindow({ pos: frontZ, nz: 1 }, 0.28, 8.48, 15.20, 1.30, 15, false);
        // NW Douglas St Clerestory (from North corner lz = +25.40m to rear lz = -5.95m -> length 31.35m, 30 bays, Photos 2, 4, 5)
        addRibbonWindow({ pos: douglasX, nx: 1 }, 9.72, 8.48, 31.30, 1.30, 30, false);
        // SE Courtyard Clerestory (matched to 5e51fcab.jpg: single narrow window at lz = +14.65m + 10-bay ribbon window under the 2 copper louver bays at lz = +4.40m..+13.60m!)
        addRibbonWindow({ pos: courtX, nx: -1 }, 14.65, 8.48, 1.05, 1.30, 1, true);
        addRibbonWindow({ pos: courtX, nx: -1 }, 9.00, 8.48, 9.10, 1.30, 10, true);
        // SW Rear Clerestory Windows (lz = -6.05m and rear bay lz = -10.29m)
        addRibbonWindow({ pos: rearZ, nz: -1 }, -7.38, 8.48, 7.10, 1.30, 7, false);
        addRibbonWindow({ pos: rearZ, nz: -1 }, 6.23, 8.48, 3.10, 1.30, 3, false);
        addRibbonWindow({ pos: -10.29, nz: -1 }, 0.45, 8.48, 7.90, 1.30, 8, false);
        addRibbonWindow({ pos: 4.56, nx: 1 }, -8.17, 8.48, 4.00, 1.30, 4, false);
        addRibbonWindow({ pos: -3.66, nx: -1 }, -8.17, 8.48, 4.00, 1.30, 4, false);

        // 3. Level 4 Copper/Terracotta Horizontal Louvered Screen Wall & SE Stucco Wall Bays (y = 9.88m..12.62m)
        const neLouverH = 2.74;
        const neLouverY = 9.88 + neLouverH * 0.5;

        // (a) NE Washington St: 5 framed copper louver bays across lx = -7.34m..+7.91m (total width = 15.25m)
        const neLouverW = 15.25;
        addBox(neLouverW, neLouverH, 0.28, copperLouverMat, 0.28, neLouverY, frontZ - 0.12);
        for (let i = 0; i <= 5; i++) {
            const px = -7.34 + i * (neLouverW / 5);
            addBox(0.11, neLouverH + 0.08, 0.34, copperFrameMat, px, neLouverY, frontZ - 0.10);
        }

        // (b) NW Douglas St: 10 framed copper louver bays along lz = -6.05m..+25.40m (total length = 31.45m)
        const nwLouverL = 31.45;
        addBox(0.28, neLouverH, nwLouverL, copperLouverMat, douglasX - 0.12, neLouverY, 9.68);
        for (let i = 0; i <= 10; i++) {
            const pz = 25.40 - i * (nwLouverL / 10);
            addBox(0.34, neLouverH + 0.08, 0.11, copperFrameMat, douglasX - 0.10, neLouverY, pz);
        }

        // (c) SE Courtyard Upper Wall (lx = -11.10m, matched directly to 5e51fcab.jpg!):
        //   - Bay 2 (lz = +13.60m..+18.20m): Solid gray-tan stucco upper wall panel (length = 4.60m)
        addBox(0.28, neLouverH, 4.60, grayCoreStuccoMat, courtX + 0.12, neLouverY, 15.90);
        addBox(0.36, 0.16, 4.65, whiteTrimMat, courtX + 0.10, 12.70, 15.90);
        //   - Bays 3 & 4 (lz = +4.40m..+13.60m): 2 framed copper/terracotta horizontal louver bays above the 10-pane clerestory ribbon window (length = 9.20m, 5e51fcab.jpg!)
        addBox(0.28, neLouverH, 9.20, copperLouverMat, courtX + 0.12, neLouverY, 9.00);
        [13.60, 9.00, 4.40].forEach((pz) => {
            addBox(0.34, neLouverH + 0.08, 0.11, copperFrameMat, courtX + 0.10, neLouverY, pz);
        });
        //   - Bay 5 (lz = -6.05m..+4.40m): Solid gray-tan stucco rear upper wall (y = 8.40m..12.68m, length = 10.45m) + dark square exhaust louver at upper rear corner (lz = -4.2m, 5e51fcab.jpg!)
        addBox(0.28, 4.28, 10.45, grayCoreStuccoMat, courtX + 0.12, 10.54, -0.825);
        addBox(0.36, 0.16, 10.50, whiteTrimMat, courtX + 0.10, 12.70, -0.825);
        addBox(0.32, 1.35, 1.65, darkBronzeMat, courtX + 0.08, 11.15, -4.15); // Dark square louver at upper left of 316 in 5e51fcab.jpg!

        // (d) SW Rear Walls & Rear Projecting Bay (lz = -6.05m and lx = -3.66m..+4.56m, lz = -10.29m..-6.05m)
        // SW East segment (lx = -11.10m..-3.66m at lz = -6.05m, width = 7.44m)
        addBox(7.44, neLouverH, 0.28, copperLouverMat, -7.38, neLouverY, rearZ + 0.12);
        for (let i = 0; i <= 3; i++) {
            addBox(0.11, neLouverH + 0.08, 0.34, copperFrameMat, -11.10 + i * (7.44 / 3), neLouverY, rearZ + 0.10);
        }
        // SW West segment (lx = +4.56m..+7.91m at lz = -6.05m, width = 3.35m)
        addBox(3.35, neLouverH, 0.28, copperLouverMat, 6.235, neLouverY, rearZ + 0.12);
        addBox(0.11, neLouverH + 0.08, 0.34, copperFrameMat, 4.56, neLouverY, rearZ + 0.10);
        addBox(0.11, neLouverH + 0.08, 0.34, copperFrameMat, 7.91, neLouverY, rearZ + 0.10);
        // SW Projecting Bay Back Wall (lx = -3.66m..+4.56m at lz = -10.29m, width = 8.22m, 3 bays)
        addBox(8.22, neLouverH, 0.28, copperLouverMat, 0.45, neLouverY, -10.29 + 0.12);
        for (let i = 0; i <= 3; i++) {
            addBox(0.11, neLouverH + 0.08, 0.34, copperFrameMat, -3.66 + i * (8.22 / 3), neLouverY, -10.29 + 0.10);
        }
        // SW Projecting Bay Side Walls (lx = -3.66m and lx = +4.56m, lz = -10.29m..-6.05m, length = 4.24m)
        addBox(0.28, neLouverH, 4.24, copperLouverMat, -3.66 + 0.12, neLouverY, -8.17);
        addBox(0.28, neLouverH, 4.24, copperLouverMat, 4.56 - 0.12, neLouverY, -8.17);

        // 4. Recessed 4th-Level Roof Court Deck & Inner Cream Parapet Backing Walls (y = 9.80m..11.20m)
        // Inner white/cream parapet wall backing the NW, SE, and SW screen walls (visible on roof court interior in Photo 3)
        addBox(0.24, 1.40, 31.2, whiteTrimMat, douglasX - 0.36, 10.50, 9.72);
        addBox(0.24, 1.40, 24.0, whiteTrimMat, courtX + 0.36, 10.50, 6.10);
        addBox(7.20, 1.40, 0.24, whiteTrimMat, -7.38, 10.50, rearZ + 0.36);
        addBox(3.15, 1.40, 0.24, whiteTrimMat, 6.23, 10.50, rearZ + 0.36);
        addBox(8.00, 1.40, 0.24, whiteTrimMat, 0.45, 10.50, -10.29 + 0.36);
        addBox(0.24, 1.40, 4.10, whiteTrimMat, -3.66 + 0.36, 10.50, -8.17);
        addBox(0.24, 1.40, 4.10, whiteTrimMat, 4.56 - 0.36, 10.50, -8.17);

        // =========================================================================
        // D. TALL ROOFTOP MECHANICAL & ELEVATOR PENTHOUSE + CHILLER & PIPING (Photos 2, 3, 4, 5)
        // =========================================================================
        // L-shaped Penthouse mass on SE/SW portion of the 4th-level roof court (y = 9.80m..15.25m):
        //   East Wing (front-left in Photos 2–4): lx = -10.8m..-3.2m, lz = +6.0m..+18.4m
        //   Rear Wing (back-right in Photos 2–4): lx = -10.8m..+2.8m, lz = -5.6m..+10.5m
        const pentBaseY = 9.80;
        const pentWallH = 3.65; // y = 9.80m..13.45m smooth beige/gray penthouse wall
        const pentCrownH = 1.75; // y = 13.45m..15.20m silver horizontal louvered crown

        // East Wing Penthouse Lower Wall & Silver Louvered Crown
        addBox(7.60, pentWallH, 12.40, penthouseWallMat, -7.00, pentBaseY + pentWallH * 0.5, 12.20);
        addBox(7.68, 0.14, 12.48, whiteTrimMat, -7.00, pentBaseY + pentWallH, 12.20);
        addBox(7.60, pentCrownH, 12.40, silverLouverMat, -7.00, pentBaseY + pentWallH + pentCrownH * 0.5, 12.20);
        addBox(7.72, 0.14, 12.52, galvSteelMat, -7.00, pentBaseY + pentWallH + pentCrownH + 0.05, 12.20);

        // Rear Wing Penthouse Lower Wall & Silver Louvered Crown
        addBox(13.60, pentWallH, 16.10, penthouseWallMat, -4.00, pentBaseY + pentWallH * 0.5, 2.45);
        addBox(13.68, 0.14, 16.18, whiteTrimMat, -4.00, pentBaseY + pentWallH, 2.45);
        addBox(13.60, pentCrownH, 16.10, silverLouverMat, -4.00, pentBaseY + pentWallH + pentCrownH * 0.5, 2.45);
        addBox(13.72, 0.14, 16.22, galvSteelMat, -4.00, pentBaseY + pentWallH + pentCrownH + 0.05, 2.45);

        // Silver vertical louver bay frame mullions around the penthouse crown (Photos 2, 3, 4)
        for (let lxPos = -10.5; lxPos <= -3.3; lxPos += 3.5) {
            addBox(0.10, pentCrownH + 0.1, 0.12, galvSteelMat, lxPos, pentBaseY + pentWallH + pentCrownH * 0.5, 18.42);
        }
        for (let lzPos = 18.2; lzPos >= 10.6; lzPos -= 2.5) {
            addBox(0.12, pentCrownH + 0.1, 0.10, galvSteelMat, -3.18, pentBaseY + pentWallH + pentCrownH * 0.5, lzPos);
        }
        for (let lxPos = -3.1; lxPos <= 2.8; lxPos += 2.95) {
            addBox(0.10, pentCrownH + 0.1, 0.12, galvSteelMat, lxPos, pentBaseY + pentWallH + pentCrownH * 0.5, 10.52);
        }

        // Pale-Yellow Double Service Doors on Penthouse East Wing Wall facing the NW Roof Court (Photo 2 & 3!)
        // Located on the +X wall of the East Wing (lx = -3.18m, lz = +15.6m)
        addBox(0.08, 2.15, 1.82, yellowDoorMat, -3.18, pentBaseY + 1.12, 15.60);
        addBox(0.10, 2.15, 0.04, darkBronzeMat, -3.18, pentBaseY + 1.12, 15.60); // Center door seam
        addBox(0.12, 0.16, 0.18, darkBronzeMat, -3.16, pentBaseY + 1.15, 15.60); // Black lever handles

        // Galvanized Steel Caged Vertical Access Ladder on Penthouse Rear Wing Wall (lx = -1.6m, lz = +10.58m, Photos 2, 3, 4!)
        const ladderX = -1.60;
        const ladderZ = 10.62;
        addBox(0.06, 6.2, 0.08, galvSteelMat, ladderX - 0.28, pentBaseY + 3.1, ladderZ);
        addBox(0.06, 6.2, 0.08, galvSteelMat, ladderX + 0.28, pentBaseY + 3.1, ladderZ);
        for (let ry = 0.4; ry <= 6.0; ry += 0.35) {
            addBox(0.56, 0.04, 0.05, galvSteelMat, ladderX, pentBaseY + ry, ladderZ);
        }
        // Safety cage hoops around upper half of ladder (y = +2.2m..+6.2m above roof deck)
        for (let cy = 2.2; cy <= 6.1; cy += 0.65) {
            const hoop = new THREE.Mesh(
                new THREE.CylinderGeometry(0.42, 0.42, 0.05, 12, 1, true),
                galvSteelMat
            );
            hoop.position.set(ladderX, pentBaseY + cy, ladderZ + 0.32);
            arch.add(hoop);
        }

        // Galvanized Sheet-Metal Exhaust Hood Box on Right End of Penthouse (lx = +2.85m, lz = +9.2m, Photos 2, 3, 4)
        addBox(1.35, 2.35, 1.85, galvSteelMat, 3.35, pentBaseY + 3.25, 9.20);

        // 2-Fan Square Cooling Tower / Chiller Unit on Structural Steel Dunnage Frame out on the Roof Court (lx = +2.1m, lz = +14.8m, Photos 2, 3, 4)
        const chillerX = 2.10;
        const chillerZ = 14.80;
        // Concrete curb pads & steel legs
        addBox(3.10, 0.16, 3.10, basementConcreteMat, chillerX, pentBaseY + 0.08, chillerZ);
        [-1.2, 1.2].forEach((dx) => {
            [-1.2, 1.2].forEach((dz) => {
                addBox(0.16, 0.55, 0.16, darkBronzeMat, chillerX + dx, pentBaseY + 0.38, chillerZ + dz);
            });
        });
        // Main chiller cabinet
        addBox(2.85, 1.95, 2.85, penthouseWallMat, chillerX, pentBaseY + 1.62, chillerZ);
        // Twin dark circular fan cowls on top
        [-0.65, 0.65].forEach((dx) => {
            const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 16), darkBronzeMat);
            cowl.position.set(chillerX + dx, pentBaseY + 2.68, chillerZ);
            arch.add(cowl);
        });

        // White Insulated Chilled-Water Piping Risers & Horizontal Roof Pipe Rack connecting Chiller to Penthouse (Photos 2, 3, 4!)
        // 3 vertical white riser pipes on the chiller face (+Z face at lz = +16.28m)
        [-0.22, 0.0, 0.22].forEach((px) => {
            addBox(0.11, 2.15, 0.11, whiteTrimMat, chillerX + px, pentBaseY + 1.55, chillerZ + 1.48);
        });
        // Horizontal white pipe run from chiller (lx = +2.1m) across roof deck toward East Wing penthouse wall (lx = -3.15m) at lz = +13.5m
        addBox(5.35, 0.12, 0.12, whiteTrimMat, -0.52, pentBaseY + 0.52, 13.65);
        addBox(5.35, 0.12, 0.12, whiteTrimMat, -0.52, pentBaseY + 0.52, 13.90);
        // Pipe rack supports on roof deck
        [-2.2, -0.5, 1.2].forEach((sx) => {
            addBox(0.12, 0.50, 0.48, galvSteelMat, sx, pentBaseY + 0.25, 13.78);
        });
        // Electrical conduit manifold along East Wing penthouse lower wall (lx = -3.12m, lz = +11.2m..+14.2m, Photo 3)
        addBox(0.18, 0.65, 3.10, galvSteelMat, -3.10, pentBaseY + 0.65, 12.60);

        // =========================================================================
        // E. WASHINGTON ST FRONT ENTRANCE WALKWAY, SMALL LAWN PATCH & PUBLIC SIDEWALK
        // Matched directly to street reference photo (facing toward Orondo St):
        //   Zone 1 (lz = 25.40m..27.30m): Narrow white pebble drip edge along wall base + raised Concrete Entrance Walkway / ADA Ramp + Single-Top-Rail Steel Pipe Handrail + Brick Entrance Planter Wall
        //   Zone 2 (lz = 27.30m..29.55m): Sloped Green Lawn Patch between the Entrance Walkway and the Public Sidewalk + Yellow/Red-Green Fire Hydrant
        //   Zone 3 (lz = 29.55m..31.85m): 2-Panel Scored Washington St Concrete Public Sidewalk + Street Curb + Black Steel Bollard + Perforated Signposts
        // =========================================================================
        const sidewalkConcreteMat = new THREE.MeshStandardMaterial({
            color: '#d8d4cb',
            roughness: 0.85,
            metalness: 0.03
        });
        const sidewalkJointMat = new THREE.MeshStandardMaterial({
            color: '#8c867a',
            roughness: 0.92,
            metalness: 0.02
        });
        const whitePebbleMat = new THREE.MeshStandardMaterial({
            color: '#e8e5dd',
            roughness: 0.95,
            metalness: 0.01
        });
        const railPipeMat = new THREE.MeshStandardMaterial({
            color: '#5c6166',
            roughness: 0.45,
            metalness: 0.68
        });
        const lawnMat = new THREE.MeshStandardMaterial({
            color: '#4e7932',
            roughness: 0.92,
            metalness: 0.02
        });
        const shrubMat = new THREE.MeshStandardMaterial({
            color: '#365c24',
            roughness: 0.90,
            metalness: 0.02
        });

        // 1. ZONE 1 — ENTRANCE WALKWAY / ADA RAMP DIRECTLY ALONG BUILDING FRONT WALL (lz = frontZ .. frontZ + 1.90m)
        // Thin 0.16m white crushed-rock drip strip right against the precast wall base (lx = -3.60m..+7.91m)
        addBox(11.52, 0.28, 0.18, whitePebbleMat, 2.16, 0.29, frontZ + 0.09, false);

        // Concrete Entrance Walkway running right next to the building wall from the Douglas St sidewalk (lx = +10.25m) to the entrance doors (lx = -3.65m)
        const walkW = 13.90; // lx = -3.65m .. +10.25m (connects directly into the Douglas St sidewalk)
        const walkD = 1.72;  // lz = frontZ + 0.18m .. frontZ + 1.90m
        const walkCenterZ = frontZ + 1.04;
        addBox(walkW, 0.28, walkD, sidewalkConcreteMat, 3.30, 0.28, walkCenterZ, false);
        // Transverse concrete expansion joints on the entrance walkway (aligned with handrail posts)
        for (let jx = -3.65; jx <= 10.10; jx += 1.70) {
            addBox(0.03, 0.29, walkD + 0.02, sidewalkJointMat, jx, 0.285, walkCenterZ, false);
        }

        // Main Concrete Entrance Vestibule Landing along the building front (lx = -11.13m..-3.65m, lz = frontZ .. frontZ + 1.90m)
        addBox(7.48, 0.28, 1.90, sidewalkConcreteMat, -7.39, 0.28, frontZ + 0.95, false);

        // Single-Top-Rail Weathered Galvanized Steel Pipe Handrail along the outer edge of the Entrance Walkway (lz = frontZ + 1.84m, lx = -7.05m..+8.25m)
        const railZ = frontZ + 1.84;
        const railSpan = 15.30;
        const railCenterX = 0.60;
        // Single tubular top rail (no mid-rail, matching reference photo!)
        const topRailGeo = new THREE.CylinderGeometry(0.026, 0.026, railSpan, 12);
        topRailGeo.rotateZ(Math.PI * 0.5);
        const topRailMesh = new THREE.Mesh(topRailGeo, railPipeMat);
        topRailMesh.position.set(railCenterX, 1.28, railZ);
        topRailMesh.castShadow = true;
        arch.add(topRailMesh);
        // Vertical tubular steel handrail posts anchored into the outer concrete walkway curb every 1.70m
        for (let rx = -7.05; rx <= 8.26; rx += 1.70) {
            const postMesh = new THREE.Mesh(
                new THREE.CylinderGeometry(0.024, 0.024, 0.90, 10),
                railPipeMat
            );
            postMesh.position.set(rx, 0.83, railZ);
            postMesh.castShadow = true;
            arch.add(postMesh);
        }

        // 2. ZONE 2 — THE SMALL LAWN PATCH (lz = frontZ + 1.90m .. frontZ + 4.15m, lx = -13.45m .. +10.25m — from Building 300 stair cheek wall to Douglas St sidewalk)
        // Sloped green turf grass berm between the Entrance Walkway handrail and the Washington St Public Sidewalk
        const lawnW = 23.70;
        const lawnD = 2.25;
        const lawnGeo = new THREE.BoxGeometry(lawnW, 0.22, lawnD);
        // Tilt slightly so the lawn slopes gently down from the raised entrance walkway (lz = frontZ + 1.90m) to the street sidewalk (lz = frontZ + 4.15m)
        const lawnMesh = new THREE.Mesh(lawnGeo, lawnMat);
        lawnMesh.position.set(-1.60, 0.24, frontZ + 3.025);
        lawnMesh.rotation.x = 0.065;
        lawnMesh.receiveShadow = true;
        arch.add(lawnMesh);

        // Municipal Yellow Fire Hydrant with Weathered Red/Green Bonnet Cap in the foreground of the Small Lawn Patch (lx = +5.55m, lz = frontZ + 3.05m)
        const hydGrp = new THREE.Group();
        hydGrp.position.set(5.55, 0.34, frontZ + 3.05);
        const hydYellowMat = new THREE.MeshStandardMaterial({ color: '#d8a818', roughness: 0.48, metalness: 0.22 });
        const hydRedCapMat = new THREE.MeshStandardMaterial({ color: '#983b38', roughness: 0.62, metalness: 0.25 });
        const hydPatinaMat = new THREE.MeshStandardMaterial({ color: '#567864', roughness: 0.58, metalness: 0.28 });
        // Base flange & lower barrel
        const hydBase = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.08, 14), hydYellowMat);
        hydBase.position.y = 0.04;
        hydGrp.add(hydBase);
        const hydBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.13, 0.52, 16), hydYellowMat);
        hydBarrel.position.y = 0.30;
        hydBarrel.castShadow = true;
        hydGrp.add(hydBarrel);
        // Side 2.5-inch hose nozzles (-X and +X)
        [-1, 1].forEach((dir) => {
            const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.16, 12), hydYellowMat);
            noz.rotation.z = Math.PI * 0.5;
            noz.position.set(dir * 0.16, 0.38, 0);
            hydGrp.add(noz);
        });
        // Front 4.5-inch pumper steamer nozzle facing toward the sidewalk/street
        const pumperNoz = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.16, 14), railPipeMat);
        pumperNoz.rotation.x = Math.PI * 0.5;
        pumperNoz.position.set(0, 0.33, 0.14);
        hydGrp.add(pumperNoz);
        // Weathered red flange collar & patina-green/red domed bonnet cap + operating nut
        const hydCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.05, 16), hydRedCapMat);
        hydCollar.position.y = 0.56;
        hydGrp.add(hydCollar);
        const hydBonnet = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hydPatinaMat);
        hydBonnet.position.y = 0.57;
        hydGrp.add(hydBonnet);
        const hydNut = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.06, 5), hydRedCapMat);
        hydNut.position.y = 0.71;
        hydGrp.add(hydNut);
        arch.add(hydGrp);

        // 3. ZONE 3 — THE WASHINGTON ST PUBLIC CONCRETE SIDEWALK (lz = frontZ + 4.15m .. frontZ + 6.45m, lx = -13.45m .. +12.50m)
        // Follows the Google Map sidewalk & completely covers the outer layer of the foundation concrete (lz316 = 29.55m..31.85m)!
        const swWidth = 25.95; // Spans full Washington St frontage from outer edge of Douglas St sidewalk (lx = +12.50m) to Building 300's sidewalk (lx = -13.45m)
        const swDepth = 2.30;  // Two 1.15m concrete sidewalk panels wide (lz316 = 29.55m..31.85m)
        const swCenterX = -0.475;
        const swCenterZ = frontZ + 5.30;
        addBox(swWidth, 0.26, swDepth, sidewalkConcreteMat, swCenterX, 0.21, swCenterZ, false);
        // Longitudinal center score joint dividing the sidewalk into two rows of panels (visible in reference photo)
        addBox(swWidth, 0.27, 0.03, sidewalkJointMat, swCenterX, 0.215, swCenterZ, false);
        // Transverse control joints every 1.75m along the Washington St public sidewalk
        for (let sx = -13.20; sx <= 12.25; sx += 1.75) {
            addBox(0.03, 0.27, swDepth + 0.02, sidewalkJointMat, sx, 0.215, swCenterZ, false);
        }
        // Raised Concrete Street Curb along the outer Washington St edge of the sidewalk (lz = frontZ + 6.37m = 31.77m)
        addBox(swWidth, 0.29, 0.16, whiteTrimMat, swCenterX, 0.225, frontZ + 6.37, false);

        // 4. DOUGLAS STREET (+X RIGHT SIDE) TERRAIN-CONTOURED GRASS STRIP & PUBLIC SIDEWALK (lx = douglasX = +7.91m .. +12.50m, lz = -10.55m .. +29.55m)
        // Follows the 3D topographic terrain contour along Douglas Street from Washington St (lz = +29.55m) up to the SW rear of Building 316 (lz = -10.55m)!
        // Thin white crushed-rock drip strip along the base of the Douglas St wall (lx = +7.91m..+8.09m, lz = -6.05m..+25.40m)
        addContouredDouglasStrip(douglasX, douglasX + 0.18, -6.05, 25.40, 0.33, -0.08, whitePebbleMat, 40);
        // Contoured Green Grass Lawn Strip along the right side of Building 316 facing Douglas Street (lx = +8.09m..+10.25m, lz = -10.55m..+25.40m)
        addContouredDouglasStrip(douglasX + 0.18, 10.25, -10.55, 25.40, 0.32, -0.08, lawnMat, 48);
        // Additional Rear SW Corner Lawn Fill where Building 316 steps inward from lx = +7.91m to lx = +4.56m (lz = -10.55m..-6.05m)
        addContouredDouglasStrip(4.56, douglasX + 0.18, -10.55, -6.05, 0.32, -0.08, lawnMat, 12);

        // Terrain-Contoured Douglas Street Concrete Public Sidewalk (lx = +10.25m..+12.50m, lz = -10.55m..+29.55m — meets Washington St sidewalk flush at lz = +29.55m!)
        const dougSwW = 2.25;
        const dougSwCenterX = 10.25 + dougSwW * 0.5; // +11.375m
        addContouredDouglasStrip(10.25, 12.50, -10.55, 29.55, 0.34, -0.10, sidewalkConcreteMat, 56);
        // Contoured longitudinal center score joint dividing the Douglas St sidewalk into two rows of panels
        addContouredDouglasStrip(dougSwCenterX - 0.015, dougSwCenterX + 0.015, -10.55, 29.55, 0.346, 0.0, sidewalkJointMat, 56);
        // Transverse control joints every 1.75m along the Douglas St public sidewalk pitched to match the terrain contour
        for (let sz = -10.00; sz <= 29.00; sz += 1.75) {
            const sampleSwY = (zVal) => Math.max(
                getDouglasLocalGroundY(10.25, zVal),
                getDouglasLocalGroundY(12.50, zVal),
                getDouglasLocalGroundY(dougSwCenterX, zVal)
            );
            const yHere = sampleSwY(sz);
            const yPrev = sampleSwY(sz - 0.35);
            const yNext = sampleSwY(sz + 0.35);
            const jMesh = addBox(dougSwW + 0.02, 0.04, 0.03, sidewalkJointMat, dougSwCenterX, yHere + 0.33, sz, false);
            jMesh.rotation.x = Math.atan2(yPrev - yNext, 0.70);
        }
        // Terrain-Contoured Raised Concrete Street Curb along the outer Douglas St edge of the sidewalk (lx = +12.34m..+12.50m, lz = -10.55m..+31.85m)
        addContouredDouglasStrip(12.34, 12.50, -10.55, 31.85, 0.37, -0.10, whiteTrimMat, 60);

        // Green Street Name Sign ("WASHINGTON ST / DOUGLAS ST") at the corner of the grass patch (visible in aerial photo)
        const signGroundY = getDouglasLocalGroundY(8.85, frontZ + 2.35);
        const streetSignMat = new THREE.MeshStandardMaterial({ color: '#1b6b3a', roughness: 0.45, metalness: 0.18 });
        addBox(0.055, 2.35, 0.055, galvSteelMat, 8.85, signGroundY + 1.42, frontZ + 2.35);
        addBox(0.78, 0.18, 0.03, streetSignMat, 8.85, signGroundY + 2.52, frontZ + 2.35);
        addBox(0.03, 0.18, 0.72, streetSignMat, 8.85, signGroundY + 2.32, frontZ + 2.35);

        // Black Cylindrical Steel Bollard Post on the outer sidewalk panel in the foreground left (lx = +5.75m, lz = frontZ + 5.95m)
        const bollardGrp = new THREE.Group();
        bollardGrp.position.set(5.75, 0.32, frontZ + 5.95);
        const bollardFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.03, 16), darkBronzeMat);
        bollardFlange.position.y = 0.015;
        bollardGrp.add(bollardFlange);
        const bollardShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.86, 16), darkBronzeMat);
        bollardShaft.position.y = 0.44;
        bollardShaft.castShadow = true;
        bollardGrp.add(bollardShaft);
        const bollardCap = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.04, 16), darkBronzeMat);
        bollardCap.position.y = 0.87;
        bollardGrp.add(bollardCap);
        arch.add(bollardGrp);

        // Street Parking Signpost along Washington St sidewalk curb (lx = -1.40m, lz = frontZ + 6.18m)
        addBox(0.05, 2.45, 0.05, galvSteelMat, -1.40, 1.45, frontZ + 6.18);
        addBox(0.32, 0.46, 0.02, whiteTrimMat, -1.40, 2.35, frontZ + 6.18); // Upper parking sign plate
        addBox(0.32, 0.38, 0.02, whiteTrimMat, -1.40, 1.88, frontZ + 6.18); // Lower parking sign plate
    }

    /**
     * Photo-realistic Architectural Reconstruction of Building 300 (300 Washington St — Juvenile Justice Center & Rear Gymnasium)
     * Modeled directly from the aerial & street-level reference photographs:
     * - Single-floor high-ceiling Main Wing & Washington St Entrance (y = 0.0m..4.65m) with recessed glass vestibule,
     *   projecting canopy, tan-brown brick entry wall, "300 WASHINGTON ST" signage, and black wrought-iron security gate to Building 316
     * - Two High-Ceiling Detention Wings along the Orondo Ave (SE) side (y = 0.0m..5.65m) in variegated buff/gold/brown/charcoal
     *   running-bond brick, each with 5 lower stepped beige precast concrete wall panels + horizontal transom slot windows,
     *   5 upper clerestory slot windows in a stepped precast frieze band, and bright silver sheet-metal roof flashing
     * - Two Semi-Circular Outdoor Recreation Yard Enclosures (North & South drums, y = 0.0m..4.85m) at the outer ends of the detention
     *   wings with beige concrete base plinths, variegated brick lower walls, white hollow-metal exit doors, and 6-bay off-white
     *   precast open-grid security mesh screen walls (3 vertical tiers x 2 sub-columns per bay with projecting vertical precast fins)
     * - Service & Sallyport Wing behind Building 316 (y = 0.0m..4.45m) with wide white sectional roll-up garage door,
     *   yellow safety bollards, red FDC standpipe wheel, double white utility doors, and upper mechanical penthouse (y = 4.45m..7.25m)
     * - High-Bay Arched-Roof Rear Gymnasium (lx = 0.59m..28.45m, lz = -35.94m..-15.00m) rising to y = 8.40m at the eaves and
     *   crowned with a curved barrel-vault roof reaching y = 10.65m with a dark-gray standing-seam fascia and center silver exhaust flue
     */
    _buildPhotoRealisticBuilding300(group, building, shape, wallMat, trimMat) {
        // 1. Procedural Variegated Buff/Gold/Brown/Charcoal Running-Bond Brick Texture (Orondo St Detention Wings & Rec Yards)
        const brickCanvas = document.createElement('canvas');
        brickCanvas.width = 512;
        brickCanvas.height = 512;
        const bCtx = brickCanvas.getContext('2d');
        bCtx.fillStyle = '#8b8072'; // Mortar bed
        bCtx.fillRect(0, 0, 512, 512);
        const palette = [
            '#c99f62', // Warm gold/ochre brick
            '#be9258', // Tan-buff brick
            '#a37548', // Medium brown brick
            '#865c3b', // Dark russet brown brick
            '#6c5344', // Charcoal-brown accent brick
            '#bfa382', // Pale grey-buff base brick
            '#d2ab6e'  // Honey gold brick
        ];
        for (let r = 0; r < 32; r++) {
            const off = (r % 2) * 16;
            for (let c = -1; c <= 16; c++) {
                const seed = Math.abs(Math.sin(r * 19.7 + c * 37.3) * 43758.5453);
                const idx = Math.floor((seed % 1) * palette.length);
                bCtx.fillStyle = palette[idx];
                bCtx.fillRect(c * 32 + off + 2, r * 16 + 2, 29, 13);
            }
        }
        const varBrickTex = new THREE.CanvasTexture(brickCanvas);
        varBrickTex.wrapS = THREE.RepeatWrapping;
        varBrickTex.wrapT = THREE.RepeatWrapping;
        varBrickTex.repeat.set(2.5, 2.0);
        varBrickTex.colorSpace = THREE.SRGBColorSpace;
        const varBrickMat = new THREE.MeshStandardMaterial({
            map: varBrickTex,
            roughness: 0.84,
            metalness: 0.04
        });

        // 2. Procedural Warm Beige/Tan Scored Precast Concrete Panel Texture (Gymnasium, Sallyport, Connector & Frieze)
        const precastCanvas = document.createElement('canvas');
        precastCanvas.width = 512;
        precastCanvas.height = 512;
        const pCtx = precastCanvas.getContext('2d');
        pCtx.fillStyle = '#cbbba0';
        pCtx.fillRect(0, 0, 512, 512);
        for (let y = 0; y < 512; y += 64) {
            for (let x = 0; x < 512; x += 128) {
                const j = ((Math.sin(x * 13.7 + y * 29.3) * 43758.5) % 1) * 6 - 3;
                pCtx.fillStyle = `rgb(${203 + j}, ${187 + j}, ${160 + j})`;
                pCtx.fillRect(x + 2, y + 2, 124, 60);
            }
        }
        pCtx.strokeStyle = 'rgba(96, 84, 68, 0.42)';
        pCtx.lineWidth = 3;
        for (let x = 0; x <= 512; x += 128) {
            pCtx.beginPath();
            pCtx.moveTo(x, 0);
            pCtx.lineTo(x, 512);
            pCtx.stroke();
        }
        for (let y = 0; y <= 512; y += 64) {
            pCtx.beginPath();
            pCtx.moveTo(0, y);
            pCtx.lineTo(512, y);
            pCtx.stroke();
        }
        const precastTex = new THREE.CanvasTexture(precastCanvas);
        precastTex.wrapS = THREE.RepeatWrapping;
        precastTex.wrapT = THREE.RepeatWrapping;
        precastTex.repeat.set(0.24, 0.24);
        precastTex.colorSpace = THREE.SRGBColorSpace;
        const tanPrecastMat = new THREE.MeshStandardMaterial({
            map: precastTex,
            roughness: 0.80,
            metalness: 0.04
        });

        // 3. Supporting Architectural Materials
        const plinthBeigeMat = new THREE.MeshStandardMaterial({
            color: '#d4c6ac',
            roughness: 0.85,
            metalness: 0.03
        });
        const recCreamMat = new THREE.MeshStandardMaterial({
            color: '#dedcd2',
            roughness: 0.78,
            metalness: 0.04
        });
        const silverFlashingMat = new THREE.MeshStandardMaterial({
            color: '#d6dde4',
            roughness: 0.30,
            metalness: 0.72
        });
        const darkFasciaMat = new THREE.MeshStandardMaterial({
            color: '#4e555c',
            roughness: 0.52,
            metalness: 0.45
        });
        const roofMembraneMat = new THREE.MeshStandardMaterial({
            color: '#dcdad3',
            roughness: 0.86,
            metalness: 0.05
        });
        const gymRoofMat = new THREE.MeshStandardMaterial({
            color: '#6b727a',
            roughness: 0.65,
            metalness: 0.30
        });
        const securityMeshMat = new THREE.MeshStandardMaterial({
            color: '#1f2326',
            roughness: 0.65,
            metalness: 0.45
        });
        const slotGlassMat = new THREE.MeshStandardMaterial({
            color: '#496b73',
            roughness: 0.20,
            metalness: 0.38
        });
        const whiteDoorMat = new THREE.MeshStandardMaterial({
            color: '#e6e7e2',
            roughness: 0.58,
            metalness: 0.12
        });
        const blackIronMat = new THREE.MeshStandardMaterial({
            color: '#222528',
            roughness: 0.42,
            metalness: 0.65
        });
        const bollardYellowMat = new THREE.MeshStandardMaterial({
            color: '#e5b524',
            roughness: 0.50,
            metalness: 0.18
        });
        const plazaConcreteMat = new THREE.MeshStandardMaterial({ color: '#d8d4cb', roughness: 0.85, metalness: 0.03 });
        const plazaJointMat = new THREE.MeshStandardMaterial({ color: '#8c867a', roughness: 0.92, metalness: 0.02 });
        const pipeRailMat = new THREE.MeshStandardMaterial({ color: '#565b60', roughness: 0.42, metalness: 0.68 });
        const hedgeGreenMat = new THREE.MeshStandardMaterial({ color: '#3b6228', roughness: 0.90, metalness: 0.02 });
        const hedgeRedMat = new THREE.MeshStandardMaterial({ color: '#6e352c', roughness: 0.90, metalness: 0.02 });
        const turfLawnMat = new THREE.MeshStandardMaterial({ color: '#4e7932', roughness: 0.92, metalness: 0.02 });

        // 4. Base Footprint Foundation & Single-Floor High-Ceiling Core Massing
        // Sub-grade foundation plinth (-5.5m to 0.0m) so all hillside slopes around Orondo St & Rear Parking Lot are solid
        const footingGeo = new THREE.ExtrudeGeometry(shape, { depth: 5.5, bevelEnabled: false });
        footingGeo.rotateX(-Math.PI / 2);
        const footingMesh = new THREE.Mesh(footingGeo, plinthBeigeMat);
        footingMesh.position.y = -5.5;
        footingMesh.castShadow = true;
        footingMesh.receiveShadow = true;
        group.add(footingMesh);

        // Main Single-Floor High-Ceiling Footprint Extrusion (y = 0.0m to +4.55m across the entire 26-vertex footprint)
        const baseWallH = 4.55;
        const mainBodyGeo = new THREE.ExtrudeGeometry(shape, { depth: baseWallH, bevelEnabled: false });
        mainBodyGeo.rotateX(-Math.PI / 2);
        this._applyArchitecturalUVs(mainBodyGeo, baseWallH, 1.15);
        const mainBodyMesh = new THREE.Mesh(mainBodyGeo, [roofMembraneMat, tanPrecastMat]);
        mainBodyMesh.name = 'Building300_SingleFloorHighCeilingBase';
        mainBodyMesh.position.y = 0.0;
        mainBodyMesh.castShadow = true;
        mainBodyMesh.receiveShadow = true;
        mainBodyMesh.userData = { isSelectableBuilding: true, building, floorLayer: 1 };
        group.add(mainBodyMesh);

        // Smooth beige concrete base water-table plinth band (y = 0.0m..0.72m) around the entire footprint
        const baseBandGeo = new THREE.ExtrudeGeometry(shape, {
            depth: 0.72,
            bevelEnabled: true,
            bevelThickness: 0.03,
            bevelSize: 0.05,
            bevelSegments: 1
        });
        baseBandGeo.rotateX(-Math.PI / 2);
        const baseBandMesh = new THREE.Mesh(baseBandGeo, plinthBeigeMat);
        baseBandMesh.position.y = 0.0;
        group.add(baseBandMesh);

        // 5. Local Axis-Aligned Architectural Group for Building 300
        // Uses the same Washington St alignment angle theta = Math.atan2(0.59621, -0.80283) so all wings align with 316:
        //   +Z (lz = +29.89m..+34.08m) -> NE Washington St Front Entrance Wing
        //   -X (lx = -24.39m..-2.89m)  -> SE Orondo Ave Detention Wings & Semi-Circular Recreation Yards
        //   +X (lx = +24.04m..+28.47m) -> NW Service & Sallyport Wing behind Building 316
        //   -Z (lz = -35.94m..-15.00m) -> SW High-Bay Arched-Roof Rear Gymnasium
        const arch = new THREE.Group();
        arch.name = 'Building300ArchitecturalDetails';
        arch.rotation.y = Math.atan2(0.59621, -0.80283);
        group.add(arch);

        const addBox = (w, h, d, mat, x, y, z, cast = true) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            m.position.set(x, y, z);
            m.castShadow = cast;
            m.receiveShadow = true;
            m.userData = { isSelectableBuilding: true, building };
            arch.add(m);
            return m;
        };

        // =========================================================================
        // A. NE WASHINGTON ST FRONT ENTRANCE WING, CIRCULAR COURTYARD LANDING & STAIRS (lx = 2.70m..30.67m, lz = 18.75m..40.00m)
        // Matched to close-up aerial photos (413c5333.jpg, 7a7de44f.jpg, ffa9146b.jpg, 62c9f897.jpg, 7b1df190.jpg):
        //   - Step-forward brick entry pavilion (lx = 2.71m..22.14m, lz = 29.89m..34.05m, y = 0.0m..3.85m) with stepped cream parapet coping
        //   - Projecting angled glass bay window in the center of the brick pavilion (lx = 8.20m..15.80m, lz = 34.05m..35.35m) with white frames & canopy
        //   - Two circular "porthole" windows with white cross mullions flanking the projecting bay window (lx = 6.0m & lx = 18.2m)
        //   - Raised silver "300 / WASHINGTON STREET" lettering to the right of the right circular window
        //   - Recessed glass entrance doors on the right-hand return wall of the brick pavilion (lx = 22.14m, lz = 29.95m..33.65m) facing the circular plaza!
        //   - Recessed brick courtyard wall behind the entrance (lx = 22.14m..24.08m, lz = 29.89m) with "CHELAN COUNTY / JUVENILE JUSTICE CENTER" lettering,
        //     bronze dedication plaque, white intercom box, and black wall-pack light
        //   - Circular / Radial-Scored Concrete Courtyard Landing Plaza between Building 300 and Building 316 (centered at lx = 26.2m, lz = 31.4m, y = 0.72m)
        //     with center circular concrete medallion, curved brick sitting bench against the black wrought-iron security fence, and wide concrete steps
        //     with center & side pipe handrails descending between two stepped tan-brick cheek walls down to the continuous Washington St public sidewalk
        // =========================================================================
        // 1. Main Roof Parapet & Multi-Level Rooftop Architecture (a1121394.jpg & 3e290850.jpg!)
        //   - Front main parapet behind the brick pavilion (lx = 2.70m..24.08m, lz = 29.89m, y = 3.65m..4.82m)
        //   - Stepped-up East end parapet block (lx = 2.55m..5.10m, y = 3.65m..5.08m) visible on the left of a1121394.jpg
        //   - Central recessed overflow scupper notch in the parapet coping (lx = 11.75m..12.35m) directly behind the bay window!
        addBox(2.55, 1.32, 0.36, plinthBeigeMat, 3.82, 4.31, 29.89); // Left stepped-up parapet wall
        addBox(2.68, 0.14, 0.48, plinthBeigeMat, 3.82, 5.02, 29.89); // Left stepped-up coping cap
        addBox(6.65, 1.08, 0.34, plinthBeigeMat, 8.42, 4.19, 29.89); // Left-center parapet wall
        addBox(6.72, 0.14, 0.46, plinthBeigeMat, 8.42, 4.78, 29.89); // Left-center coping cap (stops at scupper notch lx = 11.78m)
        // Center scupper notch (lx = 11.78m..12.32m) with lower weir & silver sheet-metal scupper box (a1121394.jpg!)
        addBox(0.54, 0.88, 0.34, plinthBeigeMat, 12.05, 4.09, 29.89);
        addBox(0.46, 0.16, 0.48, silverFlashingMat, 12.05, 4.62, 29.92);
        addBox(11.76, 1.08, 0.34, plinthBeigeMat, 18.20, 4.19, 29.89); // Right-center parapet wall (lx = 12.32m..24.08m)
        addBox(11.82, 0.14, 0.46, plinthBeigeMat, 18.20, 4.78, 29.89); // Right-center coping cap

        // Side parapet returns along lx = 2.70m (lz = 18.75m..29.89m) and lx = 24.06m (lz = 5.45m..29.89m)
        addBox(0.36, 1.32, 3.20, plinthBeigeMat, 2.70, 4.31, 28.29);   // Stepped-up front-left return (lz = 26.69m..29.89m)
        addBox(0.48, 0.14, 3.28, plinthBeigeMat, 2.70, 5.02, 28.29);
        addBox(0.34, 1.08, 7.95, plinthBeigeMat, 2.70, 4.19, 22.72);   // Mid-left return (lz = 18.75m..26.69m)
        addBox(0.46, 0.14, 8.05, plinthBeigeMat, 2.70, 4.78, 22.72);
        addBox(0.34, 1.08, 24.45, plinthBeigeMat, 24.06, 4.19, 17.67); // Right (+X) parapet return along courtyard/316 side
        addBox(0.46, 0.14, 24.55, plinthBeigeMat, 24.06, 4.78, 17.67);
        // Vertical expansion/panel joints on the NW (+X) precast side wall visible in a1121394.jpg
        [16.50, 20.20, 24.40, 27.80].forEach((jz) => {
            addBox(0.06, 4.65, 0.04, darkFasciaMat, 24.09, 2.32, jz);
        });
        // Horizontal upper frieze joint line on the NW (+X) wall (y = 3.85m, a1121394.jpg)
        addBox(0.06, 0.04, 14.00, darkFasciaMat, 24.09, 3.85, 22.80);

        // Two green-tinted windows on the NW side wall of Building 300 behind the wrought-iron fence (lx = 24.06m, lz = 22.8m & 26.2m, visible in a1121394.jpg)
        [22.80, 26.20].forEach((wz) => {
            addBox(0.14, 1.75, 2.45, slotGlassMat, 24.08, 2.05, wz);
            addBox(0.16, 0.08, 2.55, whiteDoorMat, 24.09, 2.92, wz);
            addBox(0.16, 0.08, 2.55, whiteDoorMat, 24.09, 1.18, wz);
        });

        // Raised Stepped Brick & Precast Bastion Corner Turret at the junction of the front roof and North Detention Pod (lx = -2.89m..+3.10m, lz = 15.80m..19.10m, y = 0.0m..6.05m, a1121394.jpg upper-left & 3e290850.jpg!)
        addBox(5.95, 4.65, 3.30, varBrickMat, 0.10, 2.325, 17.45);
        addBox(6.08, 0.58, 3.42, plinthBeigeMat, 0.10, 4.94, 17.45); // Lower precast frieze tier
        addBox(6.18, 0.52, 3.52, plinthBeigeMat, 0.10, 5.49, 17.45); // Upper stepped precast entablature tier
        addBox(6.30, 0.22, 3.64, silverFlashingMat, 0.10, 5.86, 17.45); // Bright silver-blue metallic sloped coping cap!
        // Vertical recessed pilaster flutes on the bastion entablature (a1121394.jpg upper-left)
        [-1.80, -0.55, 0.75, 2.05].forEach((px) => {
            addBox(0.28, 1.08, 3.56, plinthBeigeMat, px, 5.22, 17.45);
        });

        // Stepped Dividing Parapet Wall running North-South across the middle of Building 300's roof (lx = 2.70m, lz = 3.80m..16.00m, y = 4.55m..5.68m, 3e290850.jpg!)
        addBox(0.36, 1.12, 12.20, plinthBeigeMat, 2.70, 5.11, 9.90);
        addBox(0.48, 0.14, 12.30, silverFlashingMat, 2.70, 5.72, 9.90);
        // Transverse dividing parapet wall stepping across to the upper mechanical core (lx = 2.70m..15.50m, lz = 3.80m, y = 4.55m..5.68m, 3e290850.jpg)
        addBox(12.80, 1.12, 0.36, plinthBeigeMat, 9.10, 5.11, 3.80);
        addBox(12.90, 0.14, 0.48, silverFlashingMat, 9.10, 5.72, 3.80);

        // TWO Black Steel Vertical Rooftop Access Ladders mounted on the dividing parapet walls (3e290850.jpg center!)
        [
            [2.92, 6.20, 0],             // Ladder 1 on the N-S dividing parapet wall (facing +X lower roof)
            [6.85, 4.02, Math.PI * 0.5]  // Ladder 2 on the E-W transverse parapet wall (facing +Z lower roof)
        ].forEach(([lxPos, lzPos, lRot]) => {
            const ladGrp = new THREE.Group();
            ladGrp.position.set(lxPos, 4.55, lzPos);
            ladGrp.rotation.y = lRot;
            // Side rails rising 1.65m (0.45m above the parapet coping)
            [-0.22, 0.22].forEach((ry) => {
                const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.65, 0.06), blackIronMat);
                rail.position.set(0, 0.825, ry);
                ladGrp.add(rail);
                const topLoop = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.04), blackIronMat);
                topLoop.position.set(-0.14, 1.65, ry);
                ladGrp.add(topLoop);
            });
            // Horizontal ladder rungs every 0.28m
            for (let rY = 0.25; rY <= 1.55; rY += 0.26) {
                const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.44, 8), blackIronMat);
                rung.rotation.x = Math.PI * 0.5;
                rung.position.set(0, rY, 0);
                ladGrp.add(rung);
            }
            arch.add(ladGrp);
        });

        // Rooftop TPO Membrane Seam Lines, Skylight/Ventilator Domes & Plumbing Vent Pipes on the Front Administrative Roof (3e290850.jpg & a1121394.jpg!)
        for (let rz = 7.00; rz <= 28.00; rz += 2.60) {
            addBox(20.80, 0.02, 0.04, darkFasciaMat, 13.40, 4.56, rz, false);
        }
        // Primary Rooftop Curb-Mounted Spun-Aluminum / Translucent Ventilator Dome (lx = 15.85m, lz = 24.80m, a1121394.jpg!)
        addBox(0.86, 0.28, 0.86, plinthBeigeMat, 15.85, 4.69, 24.80);
        addBox(0.94, 0.06, 0.94, silverFlashingMat, 15.85, 4.85, 24.80);
        const roofDome1 = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.26, 18), whiteDoorMat);
        roofDome1.position.set(15.85, 5.00, 24.80);
        arch.add(roofDome1);
        const roofCap1 = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), silverFlashingMat);
        roofCap1.position.set(15.85, 5.10, 24.80);
        arch.add(roofCap1);
        // Secondary Spun-Aluminum Exhaust Hood near the right rear of the front roof (lx = 21.40m, lz = 15.60m, 3e290850.jpg upper-right)
        addBox(0.76, 0.26, 0.76, silverFlashingMat, 21.40, 4.68, 15.60);
        const roofDome2 = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.30, 16), silverFlashingMat);
        roofDome2.position.set(21.40, 4.94, 15.60);
        arch.add(roofDome2);
        // Vertical dark-gray rooftop plumbing & gooseneck vent pipes scattered across the front & detention roofs (3e290850.jpg)
        [
            [8.20, 25.40, 4.55], [12.60, 18.20, 4.55], [17.80, 16.40, 4.55], [20.50, 22.80, 4.55],
            [-6.50, 14.20, 5.55], [-9.80, 11.40, 5.55], [-14.20, 8.60, 5.55], [-16.50, 3.20, 5.55],
            [-8.40, -6.50, 5.55], [-13.50, -11.20, 5.55], [-17.20, -15.80, 5.55]
        ].forEach(([vx, vz, vy]) => {
            const vPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.52, 8), blackIronMat);
            vPipe.position.set(vx, vy + 0.26, vz);
            arch.add(vPipe);
        });

        // 2. Front Brick Entry Pavilion & Three-Level Stepped Parapet (lx = 2.71m..22.14m, lz = 29.89m..34.05m, a1121394.jpg!)
        // Clads the front & left/right walls of the step-forward pavilion in variegated tan-brown brick
        addBox(19.43, 3.68, 0.28, varBrickMat, 12.42, 1.84, 34.05);
        addBox(0.28, 3.68, 4.20, varBrickMat, 2.71, 1.84, 31.97);
        // Flat dark-gray membrane roof deck atop the front brick pavilion (recessed behind the stepped parapet, y = 3.56m, a1121394.jpg!)
        addBox(19.10, 0.12, 3.92, roofMembraneMat, 12.42, 3.56, 31.97);
        // Three-Level Stepped Brick + Cream Precast Parapet along the front of the pavilion (a1121394.jpg!):
        //   - Left Wing Higher Parapet (lx = 2.71m..7.85m, y = 3.68m..4.08m) + Left Return Wall (lx = 2.71m, lz = 29.89m..34.05m)
        addBox(5.14, 0.26, 0.30, varBrickMat, 5.28, 3.81, 34.05);
        addBox(5.26, 0.16, 0.44, plinthBeigeMat, 5.28, 4.02, 34.08);
        addBox(0.30, 0.26, 4.20, varBrickMat, 2.71, 3.81, 31.97);
        addBox(0.44, 0.16, 4.30, plinthBeigeMat, 2.71, 4.02, 31.97);
        //   - Center Stepped-Down Parapet above the Projecting Bay Window (lx = 7.85m..16.15m, y = 3.56m..3.82m)
        addBox(8.30, 0.16, 0.44, plinthBeigeMat, 12.00, 3.74, 34.08);
        //   - Vertical precast step-returns at lx = 7.85m and lx = 16.15m connecting the center coping to the left/right higher copings
        addBox(0.24, 0.32, 0.44, plinthBeigeMat, 7.85, 3.88, 34.08);
        addBox(0.24, 0.32, 0.44, plinthBeigeMat, 16.15, 3.88, 34.08);
        //   - Right Wing Higher Parapet above the right circular window & "300 WASHINGTON STREET" sign (lx = 16.15m..22.14m, y = 3.68m..4.08m)
        addBox(5.99, 0.26, 0.30, varBrickMat, 19.145, 3.81, 34.05);
        addBox(6.12, 0.16, 0.44, plinthBeigeMat, 19.145, 4.02, 34.08);
        // Two small rooftop plumbing vents on the left side of the pavilion roof deck (visible in a1121394.jpg)
        [[5.80, 31.60], [7.90, 30.70]].forEach(([px, pz]) => {
            const pVent = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.38, 8), blackIronMat);
            pVent.position.set(px, 3.78, pz);
            arch.add(pVent);
        });

        // Orondo Ave / Left Side (lx = -2.89m..+2.71m, lz = 18.75m..34.05m) of Building 300:
        // Matched directly to the 3 reference photos (5e51fcab.jpg, 1b3e695e.jpg, b9f0c60c.jpg):
        //   1. Smooth tan precast concrete left wing wall (lx = 2.71m, lz = 18.75m..29.89m, y = 0.0m..4.55m)
        //      with vertical panel joints every ~3.7m, mid-height horizontal score line (y = 2.05m),
        //      and white sheet-metal coping cap along the top parapet (y = 4.68m).
        //   2. Left-most brick return wall of the front entry pavilion (lx = 2.71m, lz = 29.89m..34.05m, y = 0.0m..4.15m)
        //      with smooth beige concrete base plinth (y = 0.0m..0.72m), variegated tan-brown brick, and sloped cream precast coping cap.
        //   3. Projecting left brick fin wall on the +Z side of the corner alcove (lx = -0.55m..+2.71m, lz = 29.89m, y = 0.0m..4.15m)
        //      with sloped cream precast coping cap, framing the 3-bay recessed window alcove!
        //   4. 3-Bay White-Framed Floor-to-Ceiling Window Alcove (lx = 0.05m, lz = 29.95m..33.65m, y = 0.55m..3.35m)
        //      facing the left (-X) lawn with white projecting flat soffit canopy (y = 3.45m), 3 vertical columns x 2 horizontal rows of panes
        //      plus bottom hopper panels, and internal silver-crowned rooftop mechanical unit visible behind the parapet (1b3e695e.jpg & b9f0c60c.jpg!).
        //   5. Curved-Top Black Ornamental Wrought-Iron Fence attaching directly to the left precast wall at lz = 28.85m
        //      and running outward (-X) across the sloped green lawn berm to lx = -6.80m, then turning South (-Z) along the detention pod!

        // (a) Smooth Tan Precast Left Wall (lx = 2.71m, lz = 18.75m..29.89m) with vertical & horizontal panel joints and white coping cap (1b3e695e.jpg & b9f0c60c.jpg!)
        addBox(0.32, 4.55, 11.14, tanPrecastMat, 2.71, 2.275, 24.32);
        addBox(0.38, 0.72, 11.20, plinthBeigeMat, 2.71, 0.36, 24.32);
        addBox(0.44, 0.14, 11.24, whiteDoorMat, 2.71, 4.62, 24.32); // White metal coping cap on top of the tan precast left wall
        // Vertical & horizontal panel joints on the tan precast left wall (1b3e695e.jpg & b9f0c60c.jpg)
        [21.50, 25.20, 28.80].forEach((jz) => {
            addBox(0.36, 4.55, 0.04, darkFasciaMat, 2.68, 2.275, jz);
        });
        addBox(0.36, 0.04, 11.14, darkFasciaMat, 2.68, 2.05, 24.32); // Mid-height horizontal panel joint line

        // (b) Projecting Left Brick Wing Wall at the back of the Left Window Alcove (lx = -0.35m..+2.71m, lz = 29.89m, y = 0.0m..4.15m, 1b3e695e.jpg & b9f0c60c.jpg!)
        addBox(3.06, 0.72, 0.42, plinthBeigeMat, 1.18, 0.36, 29.89);
        addBox(3.02, 3.10, 0.38, varBrickMat, 1.18, 2.27, 29.89);
        addBox(3.12, 0.38, 0.46, plinthBeigeMat, 1.18, 3.98, 29.89); // Cream precast upper frieze & coping on brick wing wall
        addBox(3.18, 0.08, 0.50, whiteDoorMat, 1.18, 4.20, 29.89);

        // (c) 3-Bay White-Framed Window Alcove on the Left Side of the Front Entry Pavilion (lx = 2.55m, lz = 30.10m..33.68m, 1b3e695e.jpg & b9f0c60c.jpg!)
        // Framed on the left by the brick wing wall (lz = 29.89m) and on the right by the front brick corner pier (lz = 33.85m..34.15m)
        addBox(2.95, 0.72, 0.44, plinthBeigeMat, 1.25, 0.36, 33.95); // Front-left brick corner pier base plinth
        addBox(2.90, 3.10, 0.40, varBrickMat, 1.25, 2.27, 33.95);    // Front-left brick corner pier (flanking the right side of the window in 1b3e695e.jpg!)
        addBox(3.00, 0.38, 0.48, plinthBeigeMat, 1.25, 3.98, 33.95); // Cream precast coping on front-left brick pier
        addBox(3.06, 0.08, 0.52, whiteDoorMat, 1.25, 4.20, 33.95);

        // Recessed 3-column x 3-row White-Mullioned Window Assembly inside the Left Alcove (lx = 0.25m, lz = 30.10m..33.70m, y = 0.58m..3.38m)
        const leftWinZ = 31.90;
        const leftWinW = 3.56;
        addBox(0.30, 0.58, leftWinW + 0.10, plinthBeigeMat, 0.28, 0.29, leftWinZ); // Concrete sill wall below window
        addBox(0.18, 2.80, leftWinW, slotGlassMat, 0.28, 1.98, leftWinZ);          // Reflective dark-teal glass panes
        // Projecting white flat soffit/fascia header canopy spanning between the two brick piers above the 3-bay window (y = 3.48m, 1b3e695e.jpg & b9f0c60c.jpg!)
        addBox(2.85, 0.30, leftWinW + 0.16, whiteDoorMat, 1.25, 3.48, leftWinZ);
        addBox(2.92, 0.06, leftWinW + 0.22, silverFlashingMat, 1.25, 3.65, leftWinZ);
        // Horizontal white window frame bars (bottom sill y = 0.62m, lower hopper rail y = 1.05m, upper transom rail y = 2.42m, top frame y = 3.32m)
        [0.62, 1.05, 2.42, 3.32].forEach((hy) => {
            addBox(0.24, 0.075, leftWinW + 0.04, whiteDoorMat, 0.24, hy, leftWinZ);
        });
        // 4 vertical white mullions dividing the alcove window into 3 bays (1b3e695e.jpg & b9f0c60c.jpg!)
        [-1.72, -0.57, 0.57, 1.72].forEach((dz) => {
            addBox(0.24, 2.80, 0.075, whiteDoorMat, 0.24, 1.98, leftWinZ + dz);
        });
        // Rooftop silver-louvered mechanical unit visible behind the left alcove roof in 1b3e695e.jpg & b9f0c60c.jpg
        // Moved 15 feet (+4.57m) away from Orondo Ave (+X direction: from lx = 4.50m to lx = 9.07m)
        addBox(2.40, 0.95, 3.20, silverFlashingMat, 9.07, 4.85, 31.50);

        // (d) Curved-Top Black Ornamental Wrought-Iron Security Fence & Sloped Grass Berm on the Left of Building 300 (1b3e695e.jpg, b9f0c60c.jpg, 5e51fcab.jpg!)
        // In 1b3e695e.jpg & b9f0c60c.jpg, the black wrought-iron fence with curved-top pickets attaches directly to the smooth tan precast left wall
        // just behind the brick pier (at lz = 28.85m, lx = 2.65m), runs straight left (-X) across the grass berm to lx = -6.50m, and turns South (-Z) along the front of the detention lawn!
        const buildCurvedTopIronFence = (x0, z0, x1, z1, fenceBaseY = 0.18, fenceH = 1.85) => {
            const len = Math.hypot(x1 - x0, z1 - z0);
            const cx = (x0 + x1) * 0.5;
            const cz = (z0 + z1) * 0.5;
            const rotY = -Math.atan2(z1 - z0, x1 - x0);
            const fGrp = new THREE.Group();
            fGrp.position.set(cx, fenceBaseY, cz);
            fGrp.rotation.y = rotY;

            // Upper & lower horizontal rails
            const topRail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.055, 0.055), blackIronMat);
            topRail.position.set(0, fenceH - 0.18, 0);
            fGrp.add(topRail);
            const botRail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.055, 0.055), blackIronMat);
            botRail.position.set(0, 0.16, 0);
            fGrp.add(botRail);

            // Square heavy posts every ~2.8m
            const numPosts = Math.max(2, Math.round(len / 2.8) + 1);
            for (let p = 0; p < numPosts; p++) {
                const px = -len * 0.5 + (p / (numPosts - 1)) * len;
                const post = new THREE.Mesh(new THREE.BoxGeometry(0.085, fenceH + 0.06, 0.085), blackIronMat);
                post.position.set(px, fenceH * 0.5, 0);
                post.castShadow = true;
                fGrp.add(post);
            }

            // Vertical pickets with curved-top loop profile every 0.18m (matches 1b3e695e.jpg & b9f0c60c.jpg!)
            const numPickets = Math.floor(len / 0.18);
            for (let k = 1; k < numPickets; k++) {
                const kx = -len * 0.5 + k * 0.18;
                const picket = new THREE.Mesh(new THREE.BoxGeometry(0.025, fenceH - 0.12, 0.025), blackIronMat);
                picket.position.set(kx, (fenceH - 0.12) * 0.5 + 0.08, 0);
                fGrp.add(picket);
                // Curved top loop arch at top of each picket
                const loop = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.013, 6, 10, Math.PI), blackIronMat);
                loop.rotation.y = Math.PI * 0.5;
                loop.position.set(kx, fenceH - 0.06, 0);
                fGrp.add(loop);
            }
            arch.add(fGrp);
        };
        // Transverse fence segment attaching straight into the tan precast left wall at lz = 28.85m (lx = 2.65m -> lx = -6.50m, 1b3e695e.jpg & b9f0c60c.jpg!)
        buildCurvedTopIronFence(2.65, 28.85, -6.50, 28.85, 0.18, 1.85);
        // Perimeter fence turning along the Washington St / Orondo Ave grass lawn (lx = -6.50m, lz = 28.85m -> 18.75m, visible in 5e51fcab.jpg left!)
        buildCurvedTopIronFence(-6.50, 28.85, -6.50, 18.75, 0.18, 1.85);

        // Sloped Green Grass Berm inside the fence along the tan precast left wall (lx = -2.50m..+2.65m, lz = 18.75m..28.85m, visible behind the fence in 1b3e695e.jpg & b9f0c60c.jpg!)
        const bermGeo = new THREE.BoxGeometry(5.15, 0.68, 10.00);
        const bermMesh = new THREE.Mesh(bermGeo, turfLawnMat);
        bermMesh.position.set(0.08, 0.42, 23.80);
        bermMesh.rotation.z = -0.08;
        bermMesh.rotation.x = 0.05;
        bermMesh.receiveShadow = true;
        arch.add(bermMesh);

        // Tall Lush Ornamental Corner Bush at the front-left brick pier (lx = -0.35m, lz = 34.35m, 1b3e695e.jpg & b9f0c60c.jpg!)
        [
            [-0.45, 34.25, 2.35, 2.15, hedgeGreenMat],
            [0.65, 34.65, 1.95, 1.75, hedgeGreenMat],
            [-0.85, 33.45, 1.45, 0.85, hedgeRedMat]
        ].forEach(([bx, bz, bw, bh, bMat]) => {
            const bush = new THREE.Mesh(new THREE.SphereGeometry(bw * 0.55, 12, 10), bMat);
            bush.scale.set(1.15, bh / (bw * 1.1), 1.05);
            bush.position.set(bx, 0.25 + bh * 0.42, bz);
            bush.castShadow = true;
            bush.receiveShadow = true;
            arch.add(bush);
        });

        // Tall dark bronze street/parking light pole + "ONE WAY / NO PARKING" signpost on the left grass strip along Washington St (lx = -3.85m, lz = 35.60m, 5e51fcab.jpg left!)
        const eastPole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 8.20, 12), blackIronMat);
        eastPole.position.set(-3.85, 4.10, 35.60);
        eastPole.castShadow = true;
        arch.add(eastPole);
        // Cobra-head luminaire arm at top of pole + lower floodlight (5e51fcab.jpg left)
        addBox(1.15, 0.08, 0.12, blackIronMat, -3.35, 8.15, 35.60);
        addBox(0.38, 0.12, 0.22, blackIronMat, -3.55, 5.85, 35.60);
        // Street signpost next to light pole ("ONE WAY" + "NO PARKING", 5e51fcab.jpg left)
        addBox(0.05, 2.55, 0.05, silverFlashingMat, -4.65, 1.45, 36.65);
        addBox(0.42, 0.48, 0.03, blackIronMat, -4.65, 2.35, 36.65);
        addBox(0.36, 0.42, 0.03, whiteDoorMat, -4.65, 1.82, 36.65);

        // 3. Projecting White-Framed Glass Bay Window with Stepped/Notched Canopy & Double-Column Center Mullion (lx = 8.00m..16.00m, lz = 34.05m..35.35m, a1121394.jpg!)
        const bayW = 7.80;
        const bayCenterX = 12.00;
        const bayFrontZ = 35.22;
        // Cream precast base sill plinth under the projecting bay window
        addBox(bayW + 0.16, 0.38, 1.26, plinthBeigeMat, bayCenterX, 0.19, 34.62);
        // Main glass bay body & side return glass panes
        addBox(bayW, 2.76, 1.18, slotGlassMat, bayCenterX, 1.72, 34.62);
        // White aluminum horizontal storefront rails (top header y = 3.04m, lower transom bar y = 0.86m, bottom sill bar y = 0.38m)
        addBox(bayW + 0.14, 0.10, 1.24, whiteDoorMat, bayCenterX, 3.04, 34.62);
        addBox(bayW + 0.14, 0.08, 1.24, whiteDoorMat, bayCenterX, 0.86, 34.62);
        addBox(bayW + 0.14, 0.08, 1.24, whiteDoorMat, bayCenterX, 0.38, 34.62);
        // Side return vertical corner mullions & mid-side vertical mullions (visible on left & right returns of bay window in a1121394.jpg!)
        [-3.90, 3.90].forEach((sx) => {
            addBox(0.12, 2.76, 1.24, whiteDoorMat, bayCenterX + sx, 1.72, 34.62);
            addBox(0.14, 0.08, 1.24, whiteDoorMat, bayCenterX + sx, 2.38, 34.62); // Upper transom bar on side return panes
        });
        // Front vertical mullions: 2 main panes on left (-2.15m), twin central architectural columns (-0.36m & +0.36m), 2 main panes on right (+2.15m)
        [-2.15, 2.15].forEach((dx) => {
            addBox(0.09, 2.76, 0.16, whiteDoorMat, bayCenterX + dx, 1.72, bayFrontZ);
        });
        // Central Double-Column Pilaster Feature with narrow vertical glass strip & horizontal ladder bars (a1121394.jpg center of bay window!)
        [-0.36, 0.36].forEach((cxOff) => {
            addBox(0.16, 2.86, 0.26, whiteDoorMat, bayCenterX + cxOff, 1.76, bayFrontZ + 0.04);
        });
        [1.18, 1.48].forEach((hy) => {
            addBox(0.72, 0.07, 0.22, whiteDoorMat, bayCenterX, hy, bayFrontZ + 0.03);
        });
        // Stepped / Notched Overhanging Bay Window Roof Canopy (a1121394.jpg: left & right canopy wings project further than the notched center!)
        //   - Left canopy wing (lx = 7.75m..11.55m, projects to lz = 35.48m)
        addBox(3.80, 0.22, 1.44, whiteDoorMat, 9.65, 3.20, 34.76);
        addBox(3.88, 0.07, 1.50, silverFlashingMat, 9.65, 3.34, 34.76);
        //   - Right canopy wing (lx = 12.45m..16.25m, projects to lz = 35.48m)
        addBox(3.80, 0.22, 1.44, whiteDoorMat, 14.35, 3.20, 34.76);
        addBox(3.88, 0.07, 1.50, silverFlashingMat, 14.35, 3.34, 34.76);
        //   - Center stepped/notched canopy bridge over the double-column feature (lx = 11.55m..12.45m, slightly higher & recessed fascia, a1121394.jpg!)
        addBox(1.02, 0.24, 1.32, whiteDoorMat, bayCenterX, 3.24, 34.68);
        addBox(1.08, 0.07, 1.38, silverFlashingMat, bayCenterX, 3.38, 34.68);
        //   - Small terracotta/bronze crest emblem on the center fascia notch (visible in a1121394.jpg!)
        addBox(0.12, 0.14, 0.06, hedgeRedMat, bayCenterX, 3.24, 35.35);

        // 4. Two Deeply Recessed Circular "Porthole" Windows with Curved Brick Arch Rings & Dual Vertical Mullions (lx = 5.45m & lx = 18.25m, y = 1.68m, a1121394.jpg!)
        [5.45, 18.25].forEach((cxPos) => {
            const portGrp = new THREE.Group();
            portGrp.position.set(cxPos, 1.68, 34.12);
            // Outer curved brick soldier-course arch ring (16 radial brick segments forming a 3D circular brick surround!)
            const numVois = 16;
            for (let v = 0; v < numVois; v++) {
                const ang = (v / numVois) * Math.PI * 2;
                const vBrick = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.24), varBrickMat);
                vBrick.position.set(Math.cos(ang) * 0.98, Math.sin(ang) * 0.98, 0.02);
                vBrick.rotation.z = ang + Math.PI * 0.5;
                portGrp.add(vBrick);
            }
            // Deep recessed dark-bronze circular drum reveal
            const revealRing = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.08, 12, 32), darkFasciaMat);
            revealRing.position.z = 0.02;
            portGrp.add(revealRing);
            // Recessed circular glass disc
            const glassDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.84, 0.08, 28), slotGlassMat);
            glassDisc.rotation.x = Math.PI * 0.5;
            glassDisc.position.z = -0.02;
            portGrp.add(glassDisc);
            // Inner white circular window frame ring
            const rimTorus = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.045, 10, 28), whiteDoorMat);
            rimTorus.position.z = 0.03;
            portGrp.add(rimTorus);
            // Mullion grid matched to a1121394.jpg: 1 horizontal bar (slightly below center) + 2 vertical bars flanking the center pane!
            const hMul = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.055, 0.09), whiteDoorMat);
            hMul.position.set(0, -0.18, 0.03);
            portGrp.add(hMul);
            [-0.24, 0.24].forEach((vx) => {
                const vMul = new THREE.Mesh(new THREE.BoxGeometry(0.055, 1.54, 0.09), whiteDoorMat);
                vMul.position.set(vx, 0, 0.03);
                portGrp.add(vMul);
            });
            arch.add(portGrp);
        });

        // 5. Raised Silver "300 / WASHINGTON STREET" Lettering on the Right Brick Wing next to the Circular Window (lx = 20.15m, y = 2.05m, 413c5333.jpg)
        const addr300Tex = this._createTextPlaqueTexture(
            ['300', 'WASHINGTON STREET'],
            '#9c7552',
            '#f4f5f7',
            512,
            160
        );
        const addr300Mat = new THREE.MeshStandardMaterial({ map: addr300Tex, roughness: 0.45, metalness: 0.32 });
        addBox(2.45, 0.56, 0.05, addr300Mat, 20.15, 2.02, 34.18, false);

        // 6. Right-Hand Return Storefront Entrance Doors facing the Circular Courtyard Landing (lx = 22.14m, lz = 29.95m..33.65m, 413c5333.jpg!)
        // In the aerial photo, the main public glass doors are on the +X return wall of the brick pavilion (lx = 22.14m) sheltered under a projecting flat canopy!
        addBox(0.28, 3.10, 3.55, slotGlassMat, 22.08, 1.62, 31.80);
        addBox(0.32, 0.09, 3.65, whiteDoorMat, 22.14, 3.12, 31.80);
        addBox(0.32, 0.08, 3.65, whiteDoorMat, 22.14, 2.25, 31.80);
        [-1.75, -0.88, 0.0, 0.88, 1.75].forEach((dz) => {
            addBox(0.32, 3.10, 0.07, whiteDoorMat, 22.14, 1.62, 31.80 + dz);
        });
        // Projecting flat entrance roof canopy extending from the brick pavilion out over the doors (lx = 22.14m..23.85m, lz = 29.89m..34.05m, y = 3.38m)
        addBox(1.85, 0.24, 4.18, whiteDoorMat, 23.00, 3.38, 31.97);
        addBox(1.92, 0.08, 4.24, silverFlashingMat, 23.00, 3.52, 31.97);

        // 7. Recessed Brick Courtyard Wall (lx = 22.14m..24.08m, lz = 29.89m) with "CHELAN COUNTY / JUVENILE JUSTICE CENTER" Signage & Plaque (413c5333.jpg!)
        // Stops cleanly at Building 300's NW corner (lx = 24.08m) so it does not extend into the open courtyard behind the circular landing!
        addBox(1.94, 3.68, 0.24, varBrickMat, 23.11, 1.84, 29.89);
        // "CHELAN COUNTY / JUVENILE JUSTICE CENTER" raised silver lettering on the recessed brick wall (lx = 23.38m, y = 2.48m)
        const jjcWallTex = this._createTextPlaqueTexture(
            ['CHELAN COUNTY', 'JUVENILE JUSTICE CENTER'],
            '#9c7552',
            '#f4f5f7',
            512,
            160
        );
        const jjcWallMat = new THREE.MeshStandardMaterial({ map: jjcWallTex, roughness: 0.45, metalness: 0.32 });
        addBox(1.38, 0.42, 0.05, jjcWallMat, 23.38, 2.48, 30.03, false);
        // Dark bronze dedication plaque below the lettering + black wall-pack light above + white directory/intercom box on left
        addBox(0.36, 0.44, 0.05, blackIronMat, 23.38, 1.82, 30.03);
        addBox(0.34, 0.20, 0.22, blackIronMat, 23.38, 3.05, 30.08);
        addBox(0.38, 0.58, 0.10, whiteDoorMat, 22.48, 1.68, 30.04);
        addBox(0.28, 0.28, 0.12, slotGlassMat, 22.48, 1.76, 30.05);

        // Black Ornamental Wrought-Iron Security Fence with Curved Top Pickets spanning the full open courtyard gap between Building 300's corner (lx = 24.08m) and Building 316 (lx = 30.67m) at lz = 29.35m (ac6172be.jpg!)
        addBox(6.60, 0.07, 0.07, blackIronMat, 27.38, 2.38, 29.35);
        addBox(6.60, 0.07, 0.07, blackIronMat, 27.38, 0.30, 29.35);
        for (let fx = 24.15; fx <= 30.60; fx += 0.28) {
            addBox(0.04, 2.15, 0.04, blackIronMat, fx, 1.32, 29.35);
        }

        // 8. THE CIRCULAR COURTYARD LANDING PLAZA & WIDE ENTRANCE STAIRS (lx = 22.14m..30.67m, lz = 29.89m..38.05m, ac6172be.jpg, c0dec448.jpg, 9ced0856.jpg, 3f8236bb.jpg!)
        // Raised Upper Courtyard Landing Slab (lx = 22.10m..30.65m, lz = 29.89m..34.85m, top at y = 0.62m)
        const landingY = 0.62;
        addBox(8.55, landingY, 4.96, plazaConcreteMat, 26.375, landingY * 0.5, 32.37, false);
        // Circular Concrete Medallion & 4-Ring Concentric + Radial Score Pattern in the center of the Courtyard Landing (cx = 26.55m, cz = 32.35m, ac6172be.jpg & c0dec448.jpg!)
        const medCx = 26.55;
        const medCz = 32.35;
        // Center solid circular concrete medallion disc (radius = 1.05m)
        const innerDisk = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.02, 28), plazaConcreteMat);
        innerDisk.position.set(medCx, landingY + 0.01, medCz);
        arch.add(innerDisk);
        // Four concentric circular score rings (radii = 1.05m, 1.95m, 2.25m, and outer perimeter circle 3.15m — exact match to ac6172be.jpg!)
        [1.05, 1.95, 2.25, 3.15].forEach((rad) => {
            const ringTorus = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.020, 8, 36), plazaJointMat);
            ringTorus.rotation.x = Math.PI * 0.5;
            ringTorus.position.set(medCx, landingY + 0.013, medCz);
            arch.add(ringTorus);
        });
        // 8 radial score lines radiating from the center medallion (r = 1.05m) out to the outer circle (r = 3.15m)
        for (let r = 0; r < 8; r++) {
            const ang = (r * Math.PI) / 4;
            const ray = new THREE.Mesh(new THREE.BoxGeometry(2.10, 0.02, 0.024), plazaJointMat);
            ray.rotation.y = -ang;
            ray.position.set(medCx + Math.cos(ang) * 2.10, landingY + 0.013, medCz + Math.sin(ang) * 2.10);
            arch.add(ray);
        }

        // TWO Smoothly Curved Brick Sitting Benches with Precast Concrete Seat Caps flanking a square concrete trash receptacle along the back of the Circular Landing (ac6172be.jpg & c0dec448.jpg!)
        //   - Left Curved Brick Bench (7 smooth arc segments around the back-left perimeter of the circular landing)
        [-2.14, -2.00, -1.86, -1.72, -1.58, -1.44, -1.30].forEach((ang) => {
            const bx = medCx + Math.cos(ang) * 3.22;
            const bz = medCz + Math.sin(ang) * 2.85;
            const bSeg = new THREE.Group();
            bSeg.position.set(bx, landingY, bz);
            bSeg.rotation.y = -ang + Math.PI * 0.5;
            const bBase = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.44, 0.54), varBrickMat);
            bBase.position.y = 0.22;
            bSeg.add(bBase);
            const bCap = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.08, 0.62), plinthBeigeMat);
            bCap.position.y = 0.46;
            bSeg.add(bCap);
            arch.add(bSeg);
        });
        //   - Right Curved Brick Bench (7 smooth arc segments curving toward Building 316's brick corner)
        [-1.08, -0.97, -0.86, -0.75, -0.64, -0.53, -0.42].forEach((ang) => {
            const bx = medCx + Math.cos(ang) * 3.28;
            const bz = medCz + Math.sin(ang) * 2.85;
            const bSeg = new THREE.Group();
            bSeg.position.set(bx, landingY, bz);
            bSeg.rotation.y = -ang + Math.PI * 0.5;
            const bBase = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.44, 0.54), varBrickMat);
            bBase.position.y = 0.22;
            bSeg.add(bBase);
            const bCap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.62), plinthBeigeMat);
            bCap.position.y = 0.46;
            bSeg.add(bCap);
            arch.add(bSeg);
        });
        // Square aggregate-concrete trash receptacle between the two curved brick benches + round planter behind it + tall lamppost (ac6172be.jpg!)
        addBox(0.48, 0.68, 0.48, plinthBeigeMat, medCx + 0.82, landingY + 0.34, medCz - 2.65);
        const backPlanter = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.48, 14), blackIronMat);
        backPlanter.position.set(medCx + 1.55, landingY + 0.24, medCz - 2.85);
        arch.add(backPlanter);
        const poleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 7.80, 12), blackIronMat);
        poleMesh.position.set(medCx + 1.25, landingY + 3.90, medCz - 2.75);
        poleMesh.castShadow = true;
        arch.add(poleMesh);

        // Wide 7-Step Concrete Entrance Stairway descending from the Upper Courtyard Landing (lz = 34.85m, y = 0.62m) down to the Washington St Sidewalk (lz = 36.85m, y = 0.20m)
        // Located between lx = 24.45m (East Brick Cheek Wall) and lx = 28.35m (West Brick Cheek Wall), width = 3.90m (ac6172be.jpg & 9ced0856.jpg!)
        const stairX = 26.40;
        const stairW = 3.85;
        const numSteps = 7;
        const stepDepth = 2.04 / numSteps;
        const stepRise = (landingY - 0.20) / numSteps;
        for (let st = 0; st < numSteps; st++) {
            const stH = landingY - (st + 0.5) * stepRise;
            const stZ = 34.85 + (st + 0.5) * stepDepth;
            addBox(stairW, stH, stepDepth + 0.02, plazaConcreteMat, stairX, stH * 0.5, stZ, false);
            addBox(stairW, 0.02, 0.025, plazaJointMat, stairX, stH + 0.005, stZ + stepDepth * 0.5, false);
        }

        // Angled / Flared Tan-Brick Cheek Walls with Precast Concrete Coping Caps flanking Both Sides of the Entrance Stairs (ac6172be.jpg, 9ced0856.jpg, 3f8236bb.jpg!)
        //   - Left (East) Brick Cheek Wall (flares from the circular landing out along the left side of the stairs, lx = 24.18m, lz = 34.35m..37.00m)
        addBox(0.52, 0.96, 1.40, varBrickMat, 24.18, 0.48, 34.95);
        addBox(0.60, 0.09, 1.48, plinthBeigeMat, 24.18, 1.00, 34.95);
        addBox(0.52, 0.74, 1.45, varBrickMat, 24.18, 0.37, 36.32);
        addBox(0.60, 0.09, 1.52, plinthBeigeMat, 24.18, 0.78, 36.32);
        //   - Right (West) L-Shaped Brick Cheek Wall & Retaining Wing Wall (lx = 28.62m..30.15m, lz = 34.35m..37.05m, 3f8236bb.jpg!)
        addBox(0.52, 0.98, 1.45, varBrickMat, 28.62, 0.49, 34.98);
        addBox(0.60, 0.09, 1.54, plinthBeigeMat, 28.62, 1.02, 34.98);
        addBox(0.52, 0.76, 1.45, varBrickMat, 28.62, 0.38, 36.38);
        addBox(0.60, 0.09, 1.54, plinthBeigeMat, 28.62, 0.80, 36.38);
        // Return brick retaining wall extending toward Building 316's lawn (lx = 28.62m..30.25m, lz = 34.55m, visible in ac6172be.jpg)
        addBox(1.65, 0.96, 0.48, varBrickMat, 29.42, 0.48, 34.55);
        addBox(1.74, 0.09, 0.56, plinthBeigeMat, 29.42, 1.00, 34.55);
        // Small square concrete utility pedestal with rust-brown cast-iron meter cover tucked in the grass corner next to the right brick cheek wall (ac6172be.jpg!)
        addBox(0.58, 0.48, 0.58, plinthBeigeMat, 29.55, 0.38, 35.15);
        addBox(0.46, 0.05, 0.46, hedgeRedMat, 29.55, 0.64, 35.15);
        // Green turf fill in the L-corner between the right stair cheek wall (lx = 28.62m), return wall (lz = 34.55m), and sidewalk (lz = 37.12m)
        addBox(2.05, 0.22, 2.57, turfLawnMat, 29.645, 0.19, 35.835, false);

        // Two Side Tubular Steel Pipe Handrails along the Left and Right Cheek Walls of the Entrance Stairs + Top Landing Guardrail (ac6172be.jpg & 9ced0856.jpg!)
        [24.58, 28.22].forEach((rx) => {
            const rGrp = new THREE.Group();
            rGrp.position.set(rx, 0, 35.85);
            // Sloped top rail descending the stairs
            const railBar = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 2.38, 10), pipeRailMat);
            railBar.rotation.x = Math.PI * 0.5 + 0.19;
            railBar.position.set(0, 1.18, 0);
            rGrp.add(railBar);
            // Top & bottom vertical posts
            const postTop = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.82, 10), pipeRailMat);
            postTop.position.set(0, landingY + 0.41, -0.95);
            rGrp.add(postTop);
            const postBot = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.82, 10), pipeRailMat);
            postBot.position.set(0, 0.22 + 0.41, 0.95);
            rGrp.add(postBot);
            arch.add(rGrp);
        });
        // Picketed steel guardrail section at the top of the stairs/landing visible in 9ced0856.jpg & ac6172be.jpg
        addBox(1.45, 0.04, 0.04, pipeRailMat, 29.85, landingY + 0.88, 34.35);
        addBox(0.04, 0.88, 0.04, pipeRailMat, 29.15, landingY + 0.44, 34.35);
        addBox(0.04, 0.88, 0.04, pipeRailMat, 30.55, landingY + 0.44, 34.35);

        // 9. Foundation Shrubs & Lawn Strip along the Front & Left of Building 300 + Continuous Washington St Public Sidewalk (5e51fcab.jpg, 1b3e695e.jpg, b9f0c60c.jpg)
        // Green turf grass border between the front pavilion/shrubs and the Washington St sidewalk (lx = -6.80m..24.18m, lz = 34.05m..37.12m — flush with Building 316's lawn at lz300 = 37.12m!)
        addBox(30.98, 0.22, 3.07, turfLawnMat, 8.69, 0.19, 35.585, false);
        // Lush green Left-Side Lawn & Foreground Grass Triangle in front of the 3-bay window alcove and black wrought-iron fence (lx = -6.80m..+2.71m, lz = 18.75m..34.05m, 1b3e695e.jpg & b9f0c60c.jpg!)
        addBox(9.51, 0.22, 15.30, turfLawnMat, -2.045, 0.19, 26.40, false);
        // Lush foundation shrub & ornamental bush row along the base of the front brick pavilion & bay window (lx = 2.40m..23.80m, lz = 34.55m..35.85m)
        const bushCoords = [
            [3.2, 34.8, 1.35, 1.25, hedgeGreenMat],
            [4.8, 35.0, 1.45, 1.35, hedgeGreenMat],
            [6.4, 35.1, 1.15, 0.95, hedgeRedMat],
            [8.0, 35.5, 1.10, 0.82, hedgeGreenMat],
            [9.8, 35.6, 1.15, 0.78, hedgeRedMat],
            [11.6, 35.6, 1.20, 0.80, hedgeGreenMat],
            [13.4, 35.6, 1.15, 0.78, hedgeGreenMat],
            [15.2, 35.5, 1.20, 0.85, hedgeRedMat],
            [16.8, 35.1, 1.35, 1.05, hedgeRedMat],
            [18.6, 35.0, 1.45, 1.25, hedgeGreenMat],
            [20.4, 35.0, 1.50, 1.32, hedgeGreenMat],
            [22.0, 35.1, 1.35, 1.18, hedgeGreenMat]
        ];
        bushCoords.forEach(([bx, bz, bw, bh, bMat]) => {
            const bush = new THREE.Mesh(new THREE.SphereGeometry(bw * 0.55, 10, 8), bMat);
            bush.scale.set(1.15, bh / (bw * 1.1), 0.95);
            bush.position.set(bx, 0.25 + bh * 0.42, bz);
            bush.castShadow = true;
            bush.receiveShadow = true;
            arch.add(bush);
        });

        // Continuous Washington St Public Concrete Sidewalk in front of Building 300 Perfectly Collinear with Building 316's Sidewalk (lx = -6.80m..28.40m, lz = 37.12m..39.42m = lz316 29.55m..31.85m!)
        const sw300W = 35.20;
        const sw300D = 2.30;
        const sw300Cx = 10.80;
        const sw300Cz = 38.27;
        addBox(sw300W, 0.26, sw300D, plazaConcreteMat, sw300Cx, 0.21, sw300Cz, false);
        // Longitudinal center score joint & transverse control joints every 1.75m (strictly collinear with Building 316's center score joint at lz316 = 30.70m -> lz300 = 38.27m!)
        addBox(sw300W, 0.27, 0.03, plazaJointMat, sw300Cx, 0.215, sw300Cz, false);
        for (let sx = -6.65; sx <= 28.35; sx += 1.75) {
            addBox(0.03, 0.27, sw300D + 0.02, plazaJointMat, sx, 0.215, sw300Cz, false);
        }
        // Raised Concrete Street Curb along the outer Washington St edge of the sidewalk (lz = 39.34m = lz316 31.77m — zero step!)
        addBox(sw300W, 0.29, 0.16, whiteDoorMat, sw300Cx, 0.225, 39.34, false);
        // Angled Concrete Sidewalk Walk curving around the left grass lawn (lx = -6.80m..-3.80m, lz = 24.15m..37.12m, visible in foreground of 1b3e695e.jpg!)
        addBox(2.40, 0.25, 12.97, plazaConcreteMat, -5.60, 0.205, 30.635, false);
        for (let sz = 25.00; sz <= 36.00; sz += 1.75) {
            addBox(2.42, 0.26, 0.03, plazaJointMat, -5.60, 0.21, sz, false);
        }

        // =========================================================================
        // B. ORONDO AVE (SE SIDE) DETENTION WINGS & STEPPED PRECAST/BRICK FACADES
        // Matched to reference photos (023cf72c.jpg, e30288ab.jpg, e2c0619e.jpg, b087bbfe.jpg, f438894b.jpg):
        //   1. North Detention Pod Wing (lx = -24.20m..-2.89m, lz = -0.20m..+18.78m, height = 5.65m)
        //   2. Central Recessed Smooth-Precast Connector (lx = -20.96m..-14.00m, lz = -4.20m..+0.40m, height = 5.10m)
        //      with 2 horizontal security slot windows + circular exhaust port (b087bbfe.jpg)
        //   3. South Detention Pod Wing (lx = -24.39m..-2.90m, lz = -22.19m..-3.64m, height = 5.65m)
        // =========================================================================
        const detPodH = 5.65;
        const detBrickTop = 4.65;

        // Helper to build a Detention Pod Wing with its 5 lower stepped precast panels + slot windows & 5 upper clerestory windows
        const buildDetentionPodWing = (xMin, xMax, zMin, zMax) => {
            const w = xMax - xMin;
            const d = zMax - zMin;
            const cx = (xMin + xMax) * 0.5;
            const cz = (zMin + zMax) * 0.5;

            // Main variegated brick mass (y = 0.72m..4.65m)
            addBox(w, detBrickTop - 0.72, d, varBrickMat, cx, 0.72 + (detBrickTop - 0.72) * 0.5, cz);
            // Smooth beige concrete base plinth (y = 0.0m..0.72m)
            addBox(w + 0.08, 0.72, d + 0.08, plinthBeigeMat, cx, 0.36, cz);
            // Upper beige precast frieze band (y = 4.65m..5.50m)
            addBox(w + 0.12, 0.85, d + 0.12, tanPrecastMat, cx, 5.075, cz);
            // Bright silver/galvanized sheet-metal roof flashing cap (y = 5.50m..5.72m, e30288ab.jpg & b087bbfe.jpg)
            addBox(w + 0.24, 0.22, d + 0.24, silverFlashingMat, cx, 5.61, cz);
            // Flat light-gray membrane roof deck inside parapet
            addBox(w - 0.30, 0.10, d - 0.30, roofMembraneMat, cx, 5.52, cz);

            // 5 Stepped Precast Lower Wall Panels + Horizontal Security Slot Windows & 5 Upper Clerestory Windows along the -X (Orondo Ave) wall
            const numBays = 5;
            const baySpan = (d - 2.40) / numBays;
            for (let b = 0; b < numBays; b++) {
                const bz = zMin + 1.20 + (b + 0.5) * baySpan;

                // Lower stepped beige precast concrete panel (y = 0.0m..2.18m, width = 1.65m)
                addBox(0.14, 2.18, 1.65, plinthBeigeMat, xMin - 0.04, 1.09, bz);
                // Lower horizontal security transom/slot window at top of panel (y = 1.82m..2.06m)
                addBox(0.16, 0.24, 1.48, whiteDoorMat, xMin - 0.06, 1.94, bz);
                addBox(0.18, 0.18, 1.40, slotGlassMat, xMin - 0.07, 1.94, bz);
                // Precast lintel cap over lower slot window (y = 2.08m..2.26m)
                addBox(0.18, 0.18, 1.72, plinthBeigeMat, xMin - 0.06, 2.17, bz);
                // Vertical brick control joint rising from the center of the lower lintel to the upper frieze
                addBox(0.09, 2.40, 0.05, blackIronMat, xMin - 0.02, 3.45, bz);

                // Upper Clerestory Horizontal Slot Window in the frieze band (y = 4.92m..5.20m)
                addBox(0.18, 0.28, 1.42, whiteDoorMat, xMin - 0.07, 5.06, bz);
                addBox(0.20, 0.20, 1.34, slotGlassMat, xMin - 0.08, 5.06, bz);
                // Stepped precast pilaster capital between upper clerestory bays
                if (b < numBays - 1) {
                    const pilZ = bz + baySpan * 0.5;
                    addBox(0.22, 0.92, 0.52, plinthBeigeMat, xMin - 0.08, 5.08, pilZ);
                    addBox(0.28, 0.72, 0.34, plinthBeigeMat, xMin - 0.10, 5.08, pilZ);
                }
            }

            // Corner stepped precast pilaster capitals at zMin and zMax (visible in e2c0619e.jpg & b087bbfe.jpg)
            [zMin + 0.35, zMax - 0.35].forEach((czPos) => {
                addBox(0.24, 0.92, 0.65, plinthBeigeMat, xMin - 0.08, 5.08, czPos);
            });

            // Additional lower precast panel + slot window on the short return wall facing the recessed connector (e2c0619e.jpg right foreground)
            const returnZ = zMin > -2.0 ? zMin : zMax;
            const returnDir = zMin > -2.0 ? -1 : 1;
            addBox(1.65, 2.18, 0.14, plinthBeigeMat, xMin + 2.35, 1.09, returnZ + returnDir * 0.04);
            addBox(1.48, 0.24, 0.16, whiteDoorMat, xMin + 2.35, 1.94, returnZ + returnDir * 0.06);
            addBox(1.40, 0.18, 0.18, slotGlassMat, xMin + 2.35, 1.94, returnZ + returnDir * 0.07);
        };

        // 1. North Detention Pod Wing (lx = -24.18m..-2.89m, lz = +0.40m..+18.60m)
        buildDetentionPodWing(-24.18, -2.89, 0.40, 18.60);

        // 2. South Detention Pod Wing (lx = -24.38m..-2.90m, lz = -22.19m..-3.64m)
        buildDetentionPodWing(-24.38, -2.90, -22.19, -3.64);

        // 3. Recessed Smooth Beige Precast Connector Wall between the North & South Detention Pods (lx = -20.96m..-2.90m, lz = -3.65m..+0.40m, b087bbfe.jpg)
        addBox(18.06, 5.05, 4.05, tanPrecastMat, -11.93, 2.525, -1.625);
        addBox(18.18, 0.20, 4.16, silverFlashingMat, -11.93, 5.12, -1.625);
        // Two narrow horizontal security slot windows at y = 1.92m on the recessed connector wall (lx = -20.96m, b087bbfe.jpg)
        [-2.75, -0.55].forEach((wz) => {
            addBox(0.14, 0.24, 1.38, whiteDoorMat, -20.98, 1.92, wz);
            addBox(0.16, 0.18, 1.30, slotGlassMat, -20.99, 1.92, wz);
        });
        // Small black circular exhaust port high on the recessed connector wall (b087bbfe.jpg)
        const ventCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.14, 12), blackIronMat);
        ventCyl.rotation.z = Math.PI * 0.5;
        ventCyl.position.set(-20.98, 3.65, -2.15);
        arch.add(ventCyl);

        // =========================================================================
        // C. TWO SEMI-CIRCULAR OUTDOOR RECREATION YARD ENCLOSURES (023cf72c.jpg, e30288ab.jpg, f438894b.jpg)
        // Attached to the outer ends of the North Detention Pod (lz = +18.60m..+22.31m) and South Detention Pod (lz = -25.63m..-22.19m):
        //   - Curved 7-facet drum (height = 4.88m)
        //   - Smooth beige concrete base plinth (y = 0.0m..0.68m)
        //   - Variegated tan/gold/brown brick lower drum wall (y = 0.68m..2.85m)
        //   - White hollow-metal security exit door with overhead light fixture at the junction with the brick detention pod
        //   - Upper off-white precast concrete open-grid security screen wall (y = 2.85m..4.88m):
        //     6–7 bays wide, 3 vertical tiers of dark security mesh louvers per bay, divided into 2 sub-columns per bay,
        //     with projecting vertical precast fins extending down onto the upper brick course
        // =========================================================================
        const buildSemiCircularRecYard = (centerX, centerZ, radiusX, radiusZ, startAngle, endAngle, doorX, doorZ) => {
            const segments = 10;
            const dTheta = (endAngle - startAngle) / segments;

            for (let s = 0; s < segments; s++) {
                const a0 = startAngle + s * dTheta;
                const a1 = startAngle + (s + 1) * dTheta;

                const x0 = centerX + Math.cos(a0) * radiusX;
                const z0 = centerZ + Math.sin(a0) * radiusZ;
                const x1 = centerX + Math.cos(a1) * radiusX;
                const z1 = centerZ + Math.sin(a1) * radiusZ;

                const segW = Math.hypot(x1 - x0, z1 - z0) + 0.06;
                const mx = (x0 + x1) * 0.5;
                const mz = (z0 + z1) * 0.5;
                const rotY = -Math.atan2(z1 - z0, x1 - x0);

                const bayGrp = new THREE.Group();
                bayGrp.position.set(mx, 0, mz);
                bayGrp.rotation.y = rotY;

                // 1. Beige concrete base plinth (y = 0.0m..0.68m)
                const plinthM = new THREE.Mesh(new THREE.BoxGeometry(segW, 0.68, 0.36), plinthBeigeMat);
                plinthM.position.y = 0.34;
                bayGrp.add(plinthM);

                // 2. Variegated tan/brown brick lower wall (y = 0.68m..2.82m)
                const brickM = new THREE.Mesh(new THREE.BoxGeometry(segW, 2.14, 0.32), varBrickMat);
                brickM.position.y = 1.75;
                brickM.castShadow = true;
                brickM.receiveShadow = true;
                bayGrp.add(brickM);

                // 3. Off-white precast intermediate band below screen bays (y = 2.82m..3.32m) & top cornice band (y = 4.62m..4.92m)
                const midBandM = new THREE.Mesh(new THREE.BoxGeometry(segW + 0.04, 0.50, 0.38), recCreamMat);
                midBandM.position.y = 3.07;
                bayGrp.add(midBandM);
                const topBandM = new THREE.Mesh(new THREE.BoxGeometry(segW + 0.06, 0.30, 0.42), recCreamMat);
                topBandM.position.y = 4.77;
                bayGrp.add(topBandM);
                const topFlashM = new THREE.Mesh(new THREE.BoxGeometry(segW + 0.10, 0.08, 0.46), silverFlashingMat);
                topFlashM.position.y = 4.94;
                bayGrp.add(topFlashM);

                // 4. Dark security mesh / clerestory backdrop (y = 3.32m..4.62m)
                const meshM = new THREE.Mesh(new THREE.BoxGeometry(segW - 0.06, 1.30, 0.14), securityMeshMat);
                meshM.position.y = 3.97;
                bayGrp.add(meshM);

                // 5. Center vertical sub-mullion & 2 horizontal grill bars dividing each bay into 2x3 open mesh/window cells (04836fd7.jpg & 023cf72c.jpg)
                const subMul = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.30, 0.26), recCreamMat);
                subMul.position.set(0, 3.97, 0.04);
                bayGrp.add(subMul);
                [3.75, 4.19].forEach((hy) => {
                    const hBar = new THREE.Mesh(new THREE.BoxGeometry(segW - 0.04, 0.07, 0.26), recCreamMat);
                    hBar.position.set(0, hy, 0.04);
                    bayGrp.add(hBar);
                });

                // 6. Projecting vertical precast fin at the bay joint (extends down to y = 2.72m as seen in 023cf72c.jpg & 04836fd7.jpg!)
                const finM = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.02, 0.46), recCreamMat);
                finM.position.set(-segW * 0.5 + 0.04, 3.73, 0.06);
                finM.castShadow = true;
                bayGrp.add(finM);
                if (s === segments - 1) {
                    const endFinM = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.02, 0.46), recCreamMat);
                    endFinM.position.set(segW * 0.5 - 0.04, 3.73, 0.06);
                    endFinM.castShadow = true;
                    bayGrp.add(endFinM);
                }

                arch.add(bayGrp);
            }

            // Smoothly curved elliptical drum roof deck over the semi-circular recreation yard (04836fd7.jpg upper-left!)
            const capGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.14, 32);
            const capMesh = new THREE.Mesh(capGeo, roofMembraneMat);
            capMesh.scale.set(radiusX * 0.98, 1.0, radiusZ * 0.98);
            capMesh.position.set(centerX, 4.78, centerZ);
            arch.add(capMesh);

            // Full-height White Precast Pilaster Column & Hollow-Metal Security Exit Door at the junction with the brick wing (04836fd7.jpg upper-left & 023cf72c.jpg!)
            addBox(0.32, 4.92, 1.32, recCreamMat, doorX + 0.04, 2.46, doorZ);
            addBox(0.26, 2.42, 1.02, whiteDoorMat, doorX - 0.02, 1.24, doorZ);
            addBox(0.34, 0.14, 0.36, recCreamMat, doorX - 0.06, 2.62, doorZ - 0.32); // Overhead security light fixture
        };

        // 1. North Semi-Circular Recreation Yard Drum (at North end of North Detention Pod: lx = -24.17m..-14.5m, lz = +18.2m..+23.4m)
        buildSemiCircularRecYard(-18.60, 18.80, 5.65, 4.25, Math.PI * 0.05, Math.PI * 1.05, -24.16, 19.25);

        // 2. South Semi-Circular Recreation Yard Drum (at South end of South Detention Pod: lx = -24.39m..-14.5m, lz = -26.4m..-21.8m)
        buildSemiCircularRecYard(-18.80, -22.20, 5.65, 4.25, -Math.PI * 1.05, -Math.PI * 0.05, -24.36, -22.75);

        // =========================================================================
        // D. SERVICE / SALLYPORT WING BEHIND BUILDING 316 & UPPER MECHANICAL PENTHOUSE
        // Matched to newly uploaded photos (616315c3.jpg, f4e9b73e.jpg, aac937c6.jpg, feb19765.jpg, 0ceff18d.jpg, 3e290850.jpg):
        //   - Single-story scored tan precast sallyport wing (lx = 10.50m..28.47m, lz = -15.00m..+5.45m, y = 0.0m..4.55m)
        //   - Wide white horizontal-ribbed sectional roll-up garage door on the +X wall facing the parking lot behind 316
        //   - Two yellow safety bollards flanking the garage door + red Fire Department Connection (FDC) wheel + double white utility doors
        //   - Recessed personnel entrance alcove at the junction with the Gymnasium (lx = 27.10m, lz = -13.80m)
        //   - Second-level windowless tan precast Mechanical / Detention Core Box (lx = 4.20m..21.80m, lz = -14.80m..+3.80m, y = 4.55m..7.35m)
        //     with white rooftop access door, East-facing intake louvers & electrical cabinets (3e290850.jpg), and galvanized HVAC duct rack
        // =========================================================================
        // 1. Wide White Sectional Roll-Up Sallyport Garage Door on +X wall (lx = 27.12m, lz = -3.20m..+2.60m, 616315c3.jpg)
        const garZ = -0.30;
        const garW = 5.40;
        const garH = 3.05;
        addBox(0.18, garH + 0.16, garW + 0.24, plinthBeigeMat, 27.14, garH * 0.5 + 0.04, garZ);
        addBox(0.14, garH, garW, whiteDoorMat, 27.18, garH * 0.5 + 0.02, garZ);
        // Horizontal sectional door panel ribs
        for (let py = 0.50; py < garH; py += 0.50) {
            addBox(0.18, 0.04, garW - 0.08, darkFasciaMat, 27.20, py, garZ);
        }
        // Two yellow-tan safety bollards protecting the garage door opening (616315c3.jpg)
        [-3.15, 3.15].forEach((dz) => {
            const bol = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 1.05, 12), bollardYellowMat);
            bol.position.set(27.85, 0.52, garZ + dz);
            bol.castShadow = true;
            arch.add(bol);
        });

        // 2. Double White Utility Doors + Red Fire Standpipe (FDC) to the right of the Garage Door (lx = 28.45m, lz = -6.5m..-11.5m, 616315c3.jpg & f4e9b73e.jpg)
        addBox(0.16, 2.25, 1.88, whiteDoorMat, 28.46, 1.15, -9.20);
        addBox(0.18, 2.25, 0.04, darkFasciaMat, 28.47, 1.15, -9.20); // Center door seam
        // Red Fire Standpipe wheel & Siamese connection (between garage door and double white doors at lz = -6.2m)
        const fdcRedMat = new THREE.MeshStandardMaterial({ color: '#9e2a28', roughness: 0.5, metalness: 0.3 });
        addBox(0.22, 0.28, 0.28, fdcRedMat, 28.50, 0.95, -6.40);
        // Small lower louver grilles next to the garage door & FDC (616315c3.jpg)
        addBox(0.16, 0.62, 0.42, darkFasciaMat, 27.18, 0.55, 3.35);
        addBox(0.16, 0.62, 0.42, darkFasciaMat, 28.47, 0.55, -5.20);

        // 3. Recessed Personnel Doorway Alcove at the junction with the Gym (lx = 27.60m, lz = -13.60m, f4e9b73e.jpg & feb19765.jpg)
        addBox(1.60, 2.45, 2.10, blackIronMat, 27.75, 1.25, -13.60);
        addBox(0.16, 2.20, 0.96, whiteDoorMat, 27.20, 1.12, -13.60);

        // 4. Second-Story Windowless Tan Precast Mechanical / Detention Core Square Box (moved 15 feet = +4.57m away from Orondo Ave: lx = 8.77m..26.37m, lz = -14.80m..+3.80m, y = 4.55m..7.35m, 616315c3.jpg & 3e290850.jpg!)
        const coreShiftX = 4.572; // 15 feet away from Orondo Ave (+X direction)
        addBox(17.60, 2.80, 18.60, tanPrecastMat, 13.00 + coreShiftX, 5.95, -5.50);
        addBox(17.78, 0.16, 18.78, plinthBeigeMat, 13.00 + coreShiftX, 7.38, -5.50); // Cream-beige perimeter coping cap (3e290850.jpg)
        addBox(17.20, 0.08, 18.20, roofMembraneMat, 13.00 + coreShiftX, 7.34, -5.50); // Flat dark-gray membrane roof deck
        // Vertical precast panel score lines on the East (-X) and North (+Z) faces of the upper box (3e290850.jpg!)
        [-11.50, -7.80, -4.10, -0.40].forEach((jz) => {
            addBox(0.06, 2.80, 0.04, darkFasciaMat, 4.18 + coreShiftX, 5.95, jz);
        });
        [7.50, 11.20, 14.90, 18.60].forEach((jx) => {
            addBox(0.04, 2.80, 0.06, darkFasciaMat, jx + coreShiftX, 5.95, 3.82);
        });
        // East-facing (-X = 8.75m) square white louver vent & twin grey electrical junction boxes visible in 3e290850.jpg!
        addBox(0.12, 0.56, 0.68, whiteDoorMat, 4.16 + coreShiftX, 6.28, 0.85);
        addBox(0.14, 0.62, 0.42, silverFlashingMat, 4.15 + coreShiftX, 5.65, -5.80);
        addBox(0.14, 0.62, 0.42, silverFlashingMat, 4.15 + coreShiftX, 5.65, -6.40);
        // Rooftop exhaust hoods & equipment curbs on the upper core roof (visible at upper right of 3e290850.jpg!)
        addBox(1.85, 0.38, 1.15, silverFlashingMat, 8.80 + coreShiftX, 7.56, -3.20);
        addBox(0.95, 0.48, 0.95, silverFlashingMat, 9.20 + coreShiftX, 7.62, -6.40);
        // White double access door on the +X face of the upper box opening onto the lower sallyport roof (616315c3.jpg)
        addBox(0.16, 2.15, 1.65, whiteDoorMat, 21.82 + coreShiftX, 5.65, 0.80);
        // Rectangular louver grille on the upper core wall (feb19765.jpg)
        addBox(0.16, 0.85, 1.35, silverFlashingMat, 21.82 + coreShiftX, 6.35, -10.50);
        // Rooftop Galvanized HVAC Ductwork & Equipment Screen on the lower sallyport roof in front of the upper box
        addBox(1.40, 0.95, 8.80, silverFlashingMat, 27.25, 5.25, -4.80);
        for (let dz = -8.80; dz <= -0.80; dz += 2.00) {
            addBox(0.12, 1.25, 0.12, darkFasciaMat, 27.95, 5.18, dz);
        }

        // =========================================================================
        // E. HIGH-BAY ARCHED-ROOF REAR GYMNASIUM (lx = 0.59m..28.45m, lz = -35.94m..-15.00m)
        // Matched directly to reference photos (f4e9b73e.jpg, feb19765.jpg, 0ceff18d.jpg, f438894b.jpg):
        //   - Tall scored tan precast concrete walls rising to y = 8.40m at the side eaves (lz = -15.00m & lz = -35.94m)
        //   - Curved barrel-vault arch rising across the 20.94m span (from lz = -35.94m to lz = -15.00m) to a crown height of y = 10.65m at lz = -25.47m
        //   - Dark charcoal/slate standing-seam metal fascia cap following the curved arch on both the +X (NW Parking Lot) and -X (SE Orondo) gable walls
        //   - Vertical silver stainless-steel exhaust flue pipe + cap at the center apex of the +X arched wall (f4e9b73e.jpg)
        //   - White triangular wall sconce at mid-height on the +X wall, green-tinted square window on the left, white exit door, and large silver intake louver on the right (feb19765.jpg)
        //   - Two large upper horizontal louver vents + one lower louver vent on the SW rear wall (lz = -35.94m, f4e9b73e.jpg right side)
        // =========================================================================
        const gymXMin = 0.59;
        const gymXMax = 28.44;
        const gymW = gymXMax - gymXMin; // 27.85m
        const gymCenterX = (gymXMin + gymXMax) * 0.5; // +14.515m
        const gymZMin = -35.94;
        const gymZMax = -15.00;
        const gymSpanZ = gymZMax - gymZMin; // 20.94m
        const gymCenterZ = (gymZMin + gymZMax) * 0.5; // -25.47m
        const gymEaveY = 8.40;
        const gymArchRise = 2.25; // Crown reaches y = 10.65m

        // 1. Rectangular High-Bay Gym Lower/Main Box up to Eave Height (y = 0.0m..8.40m)
        addBox(gymW, gymEaveY, gymSpanZ, tanPrecastMat, gymCenterX, gymEaveY * 0.5, gymCenterZ);
        // Smooth beige base plinth around the Gym (y = 0.0m..0.72m)
        addBox(gymW + 0.10, 0.72, gymSpanZ + 0.10, plinthBeigeMat, gymCenterX, 0.36, gymCenterZ);

        // 2. Curved Barrel-Vault Upper Arch & Standing-Seam Roof (y = 8.40m..10.65m across lz = -35.94m..-15.00m)
        // Construct an exact 2D arch profile in the YZ plane and extrude it along X (length = gymW = 27.85m)
        const archShape = new THREE.Shape();
        const halfSpan = gymSpanZ * 0.5; // 10.47m
        const archSteps = 24;
        archShape.moveTo(-halfSpan, 0);
        for (let i = 0; i <= archSteps; i++) {
            const u = -1 + (2 * i) / archSteps; // -1 .. +1 across lz
            const zLocal = u * halfSpan;
            const yLocal = gymArchRise * (1 - u * u); // Smooth parabolic/circular barrel arch
            archShape.lineTo(zLocal, yLocal);
        }
        archShape.lineTo(halfSpan, 0);
        archShape.closePath();

        const barrelGeo = new THREE.ExtrudeGeometry(archShape, { depth: gymW, bevelEnabled: false });
        // Rotate so shape X (zLocal) maps to Z, shape Y (yLocal) maps to Y, and extrusion depth maps to +X
        barrelGeo.rotateY(Math.PI * 0.5);
        this._applyArchitecturalUVs(barrelGeo, gymArchRise, 0.6);
        const barrelMesh = new THREE.Mesh(barrelGeo, tanPrecastMat);
        barrelMesh.position.set(gymXMin, gymEaveY, gymCenterZ);
        barrelMesh.castShadow = true;
        barrelMesh.receiveShadow = true;
        barrelMesh.userData = { isSelectableBuilding: true, building };
        arch.add(barrelMesh);

        // Curved Dark-Gray Standing-Seam Roof Deck & Overhanging Gable Fascia Trim along the Barrel Arch (f4e9b73e.jpg & feb19765.jpg)
        for (let i = 0; i < archSteps; i++) {
            const u0 = -1 + (2 * i) / archSteps;
            const u1 = -1 + (2 * (i + 1)) / archSteps;
            const z0 = gymCenterZ + u0 * halfSpan;
            const z1 = gymCenterZ + u1 * halfSpan;
            const y0 = gymEaveY + gymArchRise * (1 - u0 * u0);
            const y1 = gymEaveY + gymArchRise * (1 - u1 * u1);
            const segLen = Math.hypot(z1 - z0, y1 - y0) + 0.04;
            const mz = (z0 + z1) * 0.5;
            const my = (y0 + y1) * 0.5;
            const tiltX = -Math.atan2(y1 - y0, z1 - z0);

            // Roof membrane/metal panel segment spanning full Gym width
            const roofSeg = new THREE.Mesh(
                new THREE.BoxGeometry(gymW + 0.36, 0.18, segLen),
                gymRoofMat
            );
            roofSeg.position.set(gymCenterX, my + 0.08, mz);
            roofSeg.rotation.x = tiltX;
            roofSeg.castShadow = true;
            roofSeg.receiveShadow = true;
            arch.add(roofSeg);

            // Projecting dark-slate arched fascia trim band on +X (NW Parking Lot) and -X (SE Orondo) gable ends
            [gymXMax + 0.14, gymXMin - 0.14].forEach((fx) => {
                const fasciaSeg = new THREE.Mesh(
                    new THREE.BoxGeometry(0.24, 0.34, segLen + 0.02),
                    darkFasciaMat
                );
                fasciaSeg.position.set(fx, my - 0.02, mz);
                fasciaSeg.rotation.x = tiltX;
                arch.add(fasciaSeg);
            });
        }

        // 3. +X (NW Rear Parking Lot) Gymnasium Facade Details (f4e9b73e.jpg, feb19765.jpg, 0ceff18d.jpg):
        //   - Vertical silver stainless-steel exhaust flue pipe + cap at the center apex of the arch (lz = -25.47m, y = 8.95m..11.45m)
        const fluePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.45, 14), silverFlashingMat);
        fluePipe.position.set(gymXMax + 0.22, 10.15, gymCenterZ);
        fluePipe.castShadow = true;
        arch.add(fluePipe);
        const flueCap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.10, 14), silverFlashingMat);
        flueCap.position.set(gymXMax + 0.22, 11.42, gymCenterZ);
        arch.add(flueCap);

        //   - White 3D triangular/pyramid wall sconce at the center of the +X Gym wall (lz = -25.47m, y = 3.85m, feb19765.jpg)
        const gymSconce = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.46, 3), whiteDoorMat);
        gymSconce.position.set(gymXMax + 0.10, 3.85, gymCenterZ);
        gymSconce.rotation.y = -Math.PI * 0.5;
        arch.add(gymSconce);

        //   - Square green-tinted window near the left side of the +X Gym wall (lz = -18.20m, y = 1.95m, f4e9b73e.jpg & feb19765.jpg)
        addBox(0.16, 1.35, 1.35, whiteDoorMat, gymXMax + 0.04, 1.95, -18.20);
        addBox(0.18, 1.22, 1.22, slotGlassMat, gymXMax + 0.05, 1.95, -18.20);

        //   - White hollow-metal exit door on the right half of the +X Gym wall (lz = -29.60m, y = 1.12m, feb19765.jpg)
        addBox(0.16, 2.22, 1.05, whiteDoorMat, gymXMax + 0.04, 1.12, -29.60);

        //   - Large horizontal-slatted silver mechanical intake louver near the far right corner of the +X Gym wall (lz = -33.20m, y = 1.35m, feb19765.jpg)
        addBox(0.18, 2.25, 2.85, silverFlashingMat, gymXMax + 0.05, 1.35, -33.20);
        for (let ly = 0.35; ly <= 2.35; ly += 0.22) {
            addBox(0.20, 0.05, 2.75, darkFasciaMat, gymXMax + 0.06, ly, -33.20);
        }

        //   - Concrete sidewalk apron along the base of the +X Gym & Sallyport wall (lx = 28.45m..29.95m, lz = -35.94m..-5.00m, f4e9b73e.jpg)
        addBox(1.55, 0.18, 31.00, plinthBeigeMat, 29.20, 0.09, -20.47, false);

        // 4. -Z (SW Rear) Gymnasium Wall Louvers (lz = -35.94m, visible on right side of f4e9b73e.jpg):
        //   - Pair of large upper aluminum intake/exhaust louvers (lx = 23.0m & 26.0m, y = 6.25m) + lower louver (y = 2.65m)
        [22.90, 25.90].forEach((lxPos) => {
            addBox(2.45, 1.55, 0.18, silverFlashingMat, lxPos, 6.25, gymZMin - 0.05);
            for (let ly = 5.60; ly <= 6.90; ly += 0.22) {
                addBox(2.35, 0.05, 0.20, darkFasciaMat, lxPos, ly, gymZMin - 0.06);
            }
        });
        addBox(2.45, 1.25, 0.18, silverFlashingMat, 25.90, 2.65, gymZMin - 0.05);
    }
}
