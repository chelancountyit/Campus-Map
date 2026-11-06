import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * CampusGroundFoundry — Contoured 3D USGS 3DEP Terrain Draped with Google Maps Ground Texture
 * Maps real Web-Mercator-aligned Google Maps ground textures (`google_map_campus.png` & `google_map_outer.png`)
 * directly over the smooth 3D topographic elevation surface, plus the split-level walk-out grade around
 * Building 400 (400 Douglas St) so Floor 2 is at road level and Floor 1 opens onto the lower court.
 */
export class CampusGroundFoundry {
    constructor(textureLoader = new THREE.TextureLoader()) {
        this.loader = textureLoader;
        this.terrainData = null;
        this.exaggeration = 1.0;
        this.contourLinesMesh = null;
        this.innerTerrainMat = null;
        this.outerTerrainMat = null;
        this.mapStyle = 'roadmap'; // 'roadmap' or 'satellite'
        this.textures = {};
        this._connected316_300ApronPts = [
            [-16.54, 50.94],
            [-21.34, 49.19],
            [3.91, 15.19],
            [47.70, 47.70],
            [38.63, 59.95],
            [40.66, 60.10],
            [56.37, 71.72],
            [57.75, 75.63],
            [57.37, 79.76],
            [32.23, 114.02],
            [29.20, 115.22],
            [24.34, 115.33],
            [11.58, 100.16],
            [2.75, 111.82],
            [-24.48, 91.72],
            [-3.05, 62.76],
            [-5.12, 59.41],
            [-7.66, 62.82],
            [-19.08, 54.34]
        ];
    }

    /**
     * Pure USGS 3DEP elevation (relative to 223.51m ASL datum) without local building excavation
     */
    getRawTerrainHeight(x, z) {
        if (!this.terrainData) return 0;
        const datum = this.terrainData.datum || 223.51;
        const inner = this.terrainData.inner;
        const outer = this.terrainData.outer;

        const halfInner = inner.size * 0.5;
        let elevASL;
        if (Math.abs(x) <= halfInner && Math.abs(z) <= halfInner) {
            elevASL = this._sampleGridSmooth(inner, x, z);
        } else {
            elevASL = this._sampleGridSmooth(outer, x, z);
        }
        return (elevASL - datum) * this.exaggeration;
    }

    /**
     * Reference Washington St road-level elevation for split-level buildings (400, 350, 401)
     * where Floor 1 is a basement below road level (-4.2m to 0m) and Floor 2 is at Washington St road level (0m).
     */
    getBuildingRoadHeight(buildingId) {
        if (buildingId === 'building-400' || buildingId === '400') {
            // Places Lower Forecourt Plaza & Washington St Sidewalk (y = -0.51m) flush with the Washington/Douglas street contour,
            // and Upper Terrace / SW Sidewalk (y = 0.0m) flush with the upper terrace contour!
            return this.getRawTerrainHeight(-22.0, 10.0) + 0.56 * this.exaggeration;
        }
        if (buildingId === 'courthouse-350' || buildingId === '350') {
            return this.getRawTerrainHeight(42.0, 26.0);
        }
        if (buildingId === 'regional-jail-east' || buildingId === '401') {
            return this.getRawTerrainHeight(-6.0, -14.0);
        }
        if (
            buildingId === 'building-316' ||
            buildingId === '316' ||
            buildingId === 'building-300' ||
            buildingId === '300'
        ) {
            // Shared Washington St frontage grade for the connected 316 & 300 concrete foundation slab
            return this.getRawTerrainHeight(21.0, 35.5);
        }
        return null;
    }

    getBuilding400RoadHeight() {
        return this.getBuildingRoadHeight('building-400');
    }

    /**
     * Unsigned 2D distance from point (x, z) to a closed polygon (0 if inside the polygon)
     */
    _distToPolygon2D(x, z, pts) {
        if (!pts || pts.length < 3) return Infinity;
        let inside = false;
        let minDistSq = Infinity;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const xi = pts[i][0], zi = pts[i][1];
            const xj = pts[j][0], zj = pts[j][1];
            if (((zi > z) !== (zj > z)) && (x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi)) {
                inside = !inside;
            }
            const vx = xj - xi;
            const vz = zj - zi;
            const lenSq = vx * vx + vz * vz;
            const t = lenSq > 1e-8 ? THREE.MathUtils.clamp(((x - xi) * vx + (z - zi) * vz) / lenSq, 0, 1) : 0;
            const px = xi + t * vx;
            const pz = zi + t * vz;
            const dSq = (x - px) * (x - px) + (z - pz) * (z - pz);
            if (dSq < minDistSq) minDistSq = dSq;
        }
        return inside ? 0 : Math.sqrt(minDistSq);
    }

    /**
     * Smooth C1-continuous USGS 3DEP terrain height with ~1.0m auto-leveled perimeter surrounding each building,
     * blending roads and sidewalks naturally into the topographic contour outside the 1m building perimeter.
     */
    getTerrainHeight(x, z) {
        const rawY = this.getRawTerrainHeight(x, z);
        if (!this.terrainData) return rawY;

        // 1. Building 400 Lot (400 Douglas St, center [-36.91, 5.92])
        // Flat, level ground across the entire 400 lot (no basement excavation hole or internal step),
        // blending smoothly into the surrounding terrain contour at the lot boundaries.
        {
            const dx = x - (-36.91);
            const dz = z - 5.92;
            const lx = dx * 0.5842 - dz * 0.8116;
            const lz = dx * 0.8116 + dz * 0.5842;

            if (lx > -34.0 && lx < 21.5 && lz > -28.0 && lz < 26.5) {
                const lotLevelY = this.getRawTerrainHeight(-22.0, 10.0);
                const padW =
                    THREE.MathUtils.smoothstep(lx, -32.0, -20.0) *
                    (1.0 - THREE.MathUtils.smoothstep(lx, 17.5, 21.0)) *
                    THREE.MathUtils.smoothstep(lz, -26.0, -20.2) *
                    (1.0 - THREE.MathUtils.smoothstep(lz, 22.2, 26.0));

                return THREE.MathUtils.lerp(rawY, lotLevelY, padW);
            }
        }

        // 2. Connected Building 316 & Building 300 Lot (graded to Washington St across the front & courtyard,
        //    while allowing the Douglas St side of Building 316 to follow the natural street terrain contour)
        if (this._connected316_300ApronPts) {
            const dx = x - 18.0;
            const dz = z - 68.0;
            if (dx * dx + dz * dz < 6400) {
                const dist = this._distToPolygon2D(x, z, this._connected316_300ApronPts);
                if (dist < 6.5) {
                    let padW = 1.0 - THREE.MathUtils.smoothstep(dist, 0.4, 6.5);
                    // Convert (x, z) to Building 316 local coordinates (lx316, lz316)
                    const dx316 = x - (-5.08);
                    const dz316 = z - 48.18;
                    const lx316 = dx316 * (-0.80283) - dz316 * 0.59621;
                    const lz316 = dx316 * 0.59621 + dz316 * (-0.80283);
                    // On the Douglas St (+X) side of Building 316 (lx316 > 7.5m, south of Building 316's front corner lz316 < 25.40m),
                    // smoothly release the flat Washington St pad so the terrain, grass strip & sidewalk follow the natural Douglas St contour!
                    if (lx316 > 7.5 && lz316 < 25.40) {
                        const dougContourRelease =
                            THREE.MathUtils.smoothstep(lx316, 7.5, 8.2) *
                            THREE.MathUtils.smoothstep(25.40 - lz316, 0.0, 6.0);
                        padW *= (1.0 - dougContourRelease);
                    }
                    const washGradeY = this.getBuildingRoadHeight('building-316');
                    return THREE.MathUtils.lerp(rawY, washGradeY, padW);
                }
            }
        }

        // 3. All other campus buildings: ~1.0m auto-leveled perimeter surrounding each building footprint
        if (this.campusBuildings && this.campusBuildings.length > 0) {
            let totalW = 0;
            let weightedPadY = 0;
            for (let i = 0; i < this.campusBuildings.length; i++) {
                const b = this.campusBuildings[i];
                if (b.id === 'building-400' || b.code === '316' || b.code === '300') continue;
                const bdx = x - b.center[0];
                const bdz = z - b.center[1];
                if (bdx * bdx + bdz * bdz > 3600) continue; // 60m radius cull
                const dist = this._distToPolygon2D(x, z, b.footprint);
                if (dist < 2.5) {
                    const w = 1.0 - THREE.MathUtils.smoothstep(dist, 1.0, 2.5);
                    const bldgPadY = this.getRawTerrainHeight(b.center[0], b.center[1]);
                    totalW += w;
                    weightedPadY += bldgPadY * w;
                }
            }
            if (totalW > 0.0001) {
                const avgPadY = weightedPadY / totalW;
                const blendW = Math.min(1.0, totalW);
                return THREE.MathUtils.lerp(rawY, avgPadY, blendW);
            }
        }

        return rawY;
    }

    getElevationASL(x, z) {
        if (!this.terrainData) return 223.51;
        const inner = this.terrainData.inner;
        const halfInner = inner.size * 0.5;
        if (Math.abs(x) <= halfInner && Math.abs(z) <= halfInner) {
            return this._sampleGridSmooth(inner, x, z);
        }
        return this._sampleGridSmooth(this.terrainData.outer, x, z);
    }

    _sampleGridSmooth(grid, x, z) {
        const size = grid.size;
        const half = size * 0.5;
        const gridN = grid.gridN;
        const segs = grid.segments;

        const u = THREE.MathUtils.clamp((x + half) / size, 0, 1) * segs;
        const v = THREE.MathUtils.clamp((z + half) / size, 0, 1) * segs;

        const ix0 = Math.min(segs - 1, Math.floor(u));
        const iz0 = Math.min(segs - 1, Math.floor(v));
        const fx = u - ix0;
        const fz = v - iz0;

        // Smoothstep (Hermite) weights eliminate sharp grid-cell facets on sloped roads & lawns
        const sx = fx * fx * (3 - 2 * fx);
        const sz = fz * fz * (3 - 2 * fz);

        const h00 = grid.heights[iz0 * gridN + ix0];
        const h10 = grid.heights[iz0 * gridN + (ix0 + 1)];
        const h01 = grid.heights[(iz0 + 1) * gridN + ix0];
        const h11 = grid.heights[(iz0 + 1) * gridN + (ix0 + 1)];

        const h0 = h00 * (1 - sx) + h10 * sx;
        const h1 = h01 * (1 - sx) + h11 * sx;
        return h0 * (1 - sz) + h1 * sz;
    }

    _loadGroundTexture(key, url) {
        if (this.textures[key]) return this.textures[key];
        const tex = this.loader.load(url);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 16;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        this.textures[key] = tex;
        return tex;
    }

    setMapStyle(style = 'roadmap') {
        this.mapStyle = style;
        const isSat = style === 'satellite';
        const innerTex = isSat
            ? this._loadGroundTexture('sat_inner', './assets/textures/google_sat_campus.png')
            : this._loadGroundTexture('map_inner', './assets/textures/google_map_campus.png');
        const outerTex = isSat
            ? this._loadGroundTexture('sat_outer', './assets/textures/google_sat_outer.png')
            : this._loadGroundTexture('map_outer', './assets/textures/google_map_outer.png');

        if (this.innerTerrainMat) {
            this.innerTerrainMat.map = innerTex;
            this.innerTerrainMat.needsUpdate = true;
        }
        if (this.outerTerrainMat) {
            this.outerTerrainMat.map = outerTex;
            this.outerTerrainMat.needsUpdate = true;
        }
    }

    buildEnvironment(scene, campusData) {
        this.terrainData = campusData.terrain;
        this.campusBuildings = campusData.campusBuildings || [];
        const envGroup = new THREE.Group();
        envGroup.name = 'CampusGroundAndStreets';

        // 1. Outer Wenatchee Foothills & Columbia River Valley DEM Terrain (4400m x 4400m) with Google Maps texture
        this._buildOuterFoothillsMesh(envGroup);

        // 2. High-Resolution Inner Campus Topographic Terrain (640m x 640m, 160x160 grid) draped with Google Maps texture
        this._buildInnerCampusTerrainMesh(envGroup);

        // 3. Poured Concrete Foundation Pad & Stepped Footing on the Leveled 400 Lot
        this._buildBuilding400FoundationPad(envGroup);

        // 4. Topographic Elevation Contour Lines (2m intervals)
        this.contourLinesMesh = this._buildTopographicContours(envGroup);

        scene.add(envGroup);
        return envGroup;
    }

    _buildOuterFoothillsMesh(parent) {
        if (!this.terrainData?.outer) return;
        const outer = this.terrainData.outer;
        const geo = new THREE.PlaneGeometry(outer.size, outer.size, 96, 96);
        geo.rotateX(-Math.PI / 2);

        const pos = geo.attributes.position;
        const halfInner = (this.terrainData.inner?.size || 640) * 0.485;

        for (let i = 0; i < pos.count; i++) {
            const vx = pos.getX(i);
            const vz = pos.getZ(i);
            let vy = this.getRawTerrainHeight(vx, vz) - 0.35;

            // Depress outer mesh slightly inside the inner campus square so the high-res inner mesh never z-fights
            if (Math.abs(vx) < halfInner && Math.abs(vz) < halfInner) {
                vy -= 2.2;
            }
            pos.setY(i, vy);
        }

        geo.computeVertexNormals();

        const outerTex =
            this.mapStyle === 'satellite'
                ? this._loadGroundTexture('sat_outer', './assets/textures/google_sat_outer.png')
                : this._loadGroundTexture('map_outer', './assets/textures/google_map_outer.png');

        this.outerTerrainMat = new THREE.MeshStandardMaterial({
            map: outerTex,
            roughness: 0.92,
            metalness: 0.02
        });

        const mesh = new THREE.Mesh(geo, this.outerTerrainMat);
        mesh.receiveShadow = true;
        parent.add(mesh);
    }

    _buildInnerCampusTerrainMesh(parent) {
        const size = this.terrainData?.inner?.size || 640;
        const segs = 240;
        const geo = new THREE.PlaneGeometry(size, size, segs, segs);
        geo.rotateX(-Math.PI / 2);

        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const vx = pos.getX(i);
            const vz = pos.getZ(i);
            const vy = this.getTerrainHeight(vx, vz);
            pos.setY(i, vy);
        }

        geo.computeVertexNormals();

        const innerTex =
            this.mapStyle === 'satellite'
                ? this._loadGroundTexture('sat_inner', './assets/textures/google_sat_campus.png')
                : this._loadGroundTexture('map_inner', './assets/textures/google_map_campus.png');

        this.innerTerrainMat = new THREE.MeshStandardMaterial({
            map: innerTex,
            roughness: 0.88,
            metalness: 0.04,
            polygonOffset: true,
            polygonOffsetFactor: 2,
            polygonOffsetUnits: 2
        });

        const mesh = new THREE.Mesh(geo, this.innerTerrainMat);
        mesh.receiveShadow = true;
        parent.add(mesh);
    }

    /**
     * Poured Concrete Foundation Mat & Stepped Structural Footing Slab on the leveled Building 400 lot
     */
    _buildBuilding400FoundationPad(parent) {
        const lotLevelY = this.getRawTerrainHeight(-22.0, 10.0);
        const fndGroup = new THREE.Group();
        fndGroup.name = 'Building400ConcreteFoundation';
        fndGroup.position.set(-36.91, lotLevelY, 5.92);
        fndGroup.rotation.y = Math.atan2(0.8116, 0.5842); // Exact local (lx, lz) alignment of Building 400

        // Procedural brushed & cured concrete texture with expansion control joints
        const can = document.createElement('canvas');
        can.width = 1024;
        can.height = 1024;
        const ctx = can.getContext('2d');
        ctx.fillStyle = '#cfc9be';
        ctx.fillRect(0, 0, 1024, 1024);

        // Subtle trowel / broom-finish concrete grain
        for (let i = 0; i < 6000; i++) {
            ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(60,55,48,0.05)';
            ctx.fillRect((i * 73) % 1024, (i * 137) % 1024, 8, 3);
        }

        // Control joint grid lines across the poured concrete slab
        ctx.strokeStyle = 'rgba(75, 70, 62, 0.38)';
        ctx.lineWidth = 3;
        for (let g = 64; g < 1024; g += 64) {
            ctx.beginPath();
            ctx.moveTo(g, 0);
            ctx.lineTo(g, 1024);
            ctx.moveTo(0, g);
            ctx.lineTo(1024, g);
            ctx.stroke();
        }

        const concreteTex = new THREE.CanvasTexture(can);
        concreteTex.wrapS = THREE.RepeatWrapping;
        concreteTex.wrapT = THREE.RepeatWrapping;
        concreteTex.repeat.set(3, 3);
        concreteTex.colorSpace = THREE.SRGBColorSpace;

        const subMatSlabMat = new THREE.MeshStandardMaterial({
            map: concreteTex,
            bumpMap: concreteTex,
            bumpScale: 0.015,
            color: '#d8d2c7',
            roughness: 0.86,
            metalness: 0.03,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });

        const structuralFootingMat = new THREE.MeshStandardMaterial({
            map: concreteTex,
            bumpMap: concreteTex,
            bumpScale: 0.02,
            color: '#c2bcb0',
            roughness: 0.82,
            metalness: 0.05,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        });

        const stemWallMat = new THREE.MeshStandardMaterial({
            color: '#ded8ce',
            roughness: 0.78,
            metalness: 0.04,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        });

        // 1. Broad Poured Concrete Sub-Base Apron across the 400 lot (+2m on all 4 sides: lx: -7.0m..+17.4m, lz: -20.2m..+22.2m)
        const apronW = 24.4;
        const apronD = 42.4;
        const apronH = 0.28;
        const apronMesh = new THREE.Mesh(
            new THREE.BoxGeometry(apronW, apronH, apronD),
            subMatSlabMat
        );
        apronMesh.position.set(5.2, 0.02, 1.0);
        apronMesh.receiveShadow = true;
        apronMesh.castShadow = true;
        fndGroup.add(apronMesh);

        // 2. Stepped 16-Point Poured Structural Foundation Slab matching Building 400's exact footprint
        //    (including the 0.48m front wall indentations on each end and the side pavilion step-outs!)
        const wallZ = 14.62;
        const frontWingZ = 14.14;
        const bldg400LocalPts = [
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
            [-5.35, -16.64],
            [-5.35, -11.20],
            [-2.86, -11.20],
            [-2.86, 7.30],
            [-3.24, 7.30]
        ];

        const fndShape = new THREE.Shape();
        bldg400LocalPts.forEach(([lx, lz], idx) => {
            // Note: rotateX(-Math.PI / 2) maps Shape (x, y) -> 3D (x, 0, -y), so pass (lx, -lz)
            if (idx === 0) fndShape.moveTo(lx, -lz);
            else fndShape.lineTo(lx, -lz);
        });
        fndShape.closePath();

        const slabGeo = new THREE.ExtrudeGeometry(fndShape, {
            depth: 0.24,
            bevelEnabled: true,
            bevelThickness: 0.03,
            bevelSize: 0.04,
            bevelSegments: 2
        });
        slabGeo.rotateX(-Math.PI / 2);
        const slabMesh = new THREE.Mesh(slabGeo, structuralFootingMat);
        slabMesh.position.set(0, 0.14, 0);
        slabMesh.receiveShadow = true;
        slabMesh.castShadow = true;
        fndGroup.add(slabMesh);

        // 3. Raised Perimeter Concrete Stem-Wall Footing Curb along the 16-point stepped building perimeter
        for (let i = 0; i < bldg400LocalPts.length; i++) {
            const [x0, z0] = bldg400LocalPts[i];
            const [x1, z1] = bldg400LocalPts[(i + 1) % bldg400LocalPts.length];
            const segLen = Math.hypot(x1 - x0, z1 - z0);
            const cx = (x0 + x1) * 0.5;
            const cz = (z0 + z1) * 0.5;
            const ang = Math.atan2(x1 - x0, z1 - z0);
            const curb = new THREE.Mesh(
                new THREE.BoxGeometry(0.42, 0.14, segLen + 0.42),
                stemWallMat
            );
            curb.position.set(cx, 0.43, cz);
            curb.rotation.y = ang;
            curb.castShadow = true;
            curb.receiveShadow = true;
            fndGroup.add(curb);
        }

        // 4. Front Portico Foundation Pad (lx: -0.35m..+9.35m, lz: +14.62m..+18.87m)
        const portFnd = new THREE.Mesh(
            new THREE.BoxGeometry(9.70, 0.22, 4.25),
            structuralFootingMat
        );
        portFnd.position.set(4.50, 0.25, wallZ + 2.125);
        portFnd.receiveShadow = true;
        portFnd.castShadow = true;
        fndGroup.add(portFnd);

        parent.add(fndGroup);

        // 5. Poured Concrete Foundations for Building 316 & Building 300 (graded on Washington St, extending 2.0m outward on all sides)
        const buildWashGradedFoundation = (code, bldgPts, apronPts, gradeY) => {
            const grp = new THREE.Group();
            grp.name = `Building${code}ConcreteFoundation`;
            grp.position.set(0, gradeY, 0);

            // A. Outer Poured Concrete Apron extended 2.0 meters outward from the building on all sides
            const apronShape = new THREE.Shape();
            apronPts.forEach(([px, pz], idx) => {
                if (idx === 0) apronShape.moveTo(px, -pz);
                else apronShape.lineTo(px, -pz);
            });
            apronShape.closePath();

            const aGeo = new THREE.ExtrudeGeometry(apronShape, {
                depth: 0.28,
                bevelEnabled: true,
                bevelThickness: 0.02,
                bevelSize: 0.04,
                bevelSegments: 2
            });
            aGeo.rotateX(-Math.PI / 2);
            const aMesh = new THREE.Mesh(aGeo, subMatSlabMat);
            aMesh.position.set(0, -0.12, 0);
            aMesh.receiveShadow = true;
            aMesh.castShadow = true;
            grp.add(aMesh);

            // B. Inner Stepped Structural Foundation Slab matching the exact building footprint
            const bShape = new THREE.Shape();
            bldgPts.forEach(([px, pz], idx) => {
                if (idx === 0) bShape.moveTo(px, -pz);
                else bShape.lineTo(px, -pz);
            });
            bShape.closePath();

            const sGeo = new THREE.ExtrudeGeometry(bShape, {
                depth: 0.24,
                bevelEnabled: true,
                bevelThickness: 0.03,
                bevelSize: 0.04,
                bevelSegments: 2
            });
            sGeo.rotateX(-Math.PI / 2);
            const sMesh = new THREE.Mesh(sGeo, structuralFootingMat);
            sMesh.position.set(0, 0.14, 0);
            sMesh.receiveShadow = true;
            sMesh.castShadow = true;
            grp.add(sMesh);

            // C. Raised Perimeter Concrete Stem-Wall Footing Curb tracing every wall segment of the building
            for (let i = 0; i < bldgPts.length; i++) {
                // Skip Building 316's Douglas St side (i=1), Washington St front entrance facade (i=2), the open courtyard bridge between 316 & 300 (i=3, 24), and Building 300's Washington St front pavilion (i=4, 5)
                if (code === '316_300_Connected' && (i === 1 || i === 2 || i === 3 || i === 4 || i === 5 || i === 24)) continue;
                const [x0, z0] = bldgPts[i];
                const [x1, z1] = bldgPts[(i + 1) % bldgPts.length];
                const segLen = Math.hypot(x1 - x0, z1 - z0);
                const cx = (x0 + x1) * 0.5;
                const cz = (z0 + z1) * 0.5;
                const ang = Math.atan2(x1 - x0, z1 - z0);
                const curb = new THREE.Mesh(
                    new THREE.BoxGeometry(0.42, 0.14, segLen + 0.42),
                    stemWallMat
                );
                curb.position.set(cx, 0.43, cz);
                curb.rotation.y = ang;
                curb.castShadow = true;
                curb.receiveShadow = true;
                grp.add(curb);
            }

            parent.add(grp);
        };

        // 5. Connected Poured Concrete Foundation Slab for Building 316 & Building 300
        //    Graded to Washington St and extending 2.0m outward on all sides as one continuous connected slab
        const connectedStructuralPts = [
            // Building 316 NW & Washington St frontage
            [-12.34, 50.31],
            [-15.06, 48.30],
            [3.73, 23.08],
            [19.00, 34.42],
            // Connected across Washington St frontage to Building 300
            [26.48, 38.66],
            [42.11, 50.20],
            // Building 300 SE, S, and SW stepped perimeter
            [32.99, 62.52],
            [37.49, 65.83],
            [39.56, 63.03],
            [53.85, 73.58],
            [54.70, 76.01],
            [54.46, 78.66],
            [43.65, 93.27],
            [41.03, 91.35],
            [38.62, 94.61],
            [41.36, 96.63],
            [30.32, 111.54],
            [28.58, 112.23],
            [25.68, 112.30],
            [11.03, 101.49],
            [13.44, 98.22],
            [10.61, 96.14],
            [2.12, 107.62],
            [-20.28, 91.09],
            [-0.63, 64.55],
            // Connected to Building 316 SW perimeter
            [0.20, 59.63],
            [-5.74, 55.21],
            [-8.28, 58.62],
            [-14.88, 53.72]
        ];

        const connectedApronPts = this._connected316_300ApronPts;

        buildWashGradedFoundation(
            '316_300_Connected',
            connectedStructuralPts,
            connectedApronPts,
            this.getBuildingRoadHeight('building-316')
        );
    }

    _buildTopographicContours(parent) {
        const positions = [];
        const range = 295;
        const step = 6;
        const interval = 2.0; // 2m elevation contour lines

        for (let targetElev = -22; targetElev <= 40; targetElev += interval) {
            const targetY = targetElev * this.exaggeration;
            for (let x = -range; x < range; x += step) {
                for (let z = -range; z < range; z += step) {
                    const x0 = x, x1 = x + step;
                    const z0 = z, z1 = z + step;

                    const y00 = this.getTerrainHeight(x0, z0);
                    const y10 = this.getTerrainHeight(x1, z0);
                    const y01 = this.getTerrainHeight(x0, z1);
                    const y11 = this.getTerrainHeight(x1, z1);

                    const minCell = Math.min(y00, y10, y01, y11);
                    const maxCell = Math.max(y00, y10, y01, y11);
                    if (targetY < minCell || targetY > maxCell) continue;

                    const pts = [];
                    if ((y00 - targetY) * (y10 - targetY) < 0) {
                        const t = (targetY - y00) / (y10 - y00);
                        pts.push([x0 + t * step, targetY + 0.03, z0]);
                    }
                    if ((y00 - targetY) * (y01 - targetY) < 0) {
                        const t = (targetY - y00) / (y01 - y00);
                        pts.push([x0, targetY + 0.03, z0 + t * step]);
                    }
                    if ((y10 - targetY) * (y11 - targetY) < 0) {
                        const t = (targetY - y10) / (y11 - y10);
                        pts.push([x1, targetY + 0.03, z0 + t * step]);
                    }
                    if ((y01 - targetY) * (y11 - targetY) < 0) {
                        const t = (targetY - y01) / (y11 - y01);
                        pts.push([x0 + t * step, targetY + 0.03, z1]);
                    }

                    if (pts.length >= 2) {
                        positions.push(...pts[0], ...pts[1]);
                    }
                }
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const mat = new THREE.LineBasicMaterial({
            color: '#d97706',
            transparent: true,
            opacity: 0.35
        });
        const lines = new THREE.LineSegments(geo, mat);
        parent.add(lines);
        return lines;
    }

    setNightLighting(nightFactor) {
        if (this.bulbMat) {
            this.bulbMat.color.set(nightFactor > 0.25 ? '#ffdf85' : '#e2e8f0');
        }
        if (this.haloMat) {
            this.haloMat.opacity = nightFactor * 0.28;
        }
    }
}
