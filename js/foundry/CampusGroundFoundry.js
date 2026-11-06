import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildCampusFoundationPads } from './ground/CampusFoundationPads.js';

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
        this.innerTerrainMesh = null;
        this.outerTerrainMesh = null;
        this.bulldozedCells = new Map();
        this._bulldozeHistory = [];
        try {
            const savedCells = localStorage.getItem('chelan_bulldozed_cells_v1');
            if (savedCells) {
                const parsed = JSON.parse(savedCells);
                if (Array.isArray(parsed)) {
                    parsed.forEach(([key, steps]) => {
                        if (typeof key === 'string' && typeof steps === 'number' && steps > 0) {
                            this.bulldozedCells.set(key, steps);
                        }
                    });
                }
            }
        } catch (_) {}
        this._connected316_300ApronPts = [
            [-16.54, 50.94],
            [-21.34, 49.19],
            [3.91, 15.19],
            [70.11, 64.34],
            [58.21, 80.37],
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

        // Smoothly apply 1m x 1m Bulldozer Tool excavations (1 foot = 0.3048m per step)
        const applyBulldoze = (baseY) => {
            if (!this.bulldozedCells || this.bulldozedCells.size === 0) return baseY;
            const ix0 = Math.floor(x);
            const iz0 = Math.floor(z);
            const fx = x - ix0;
            const fz = z - iz0;
            const sx = fx * fx * (3 - 2 * fx);
            const sz = fz * fz * (3 - 2 * fz);
            const s00 = this.bulldozedCells.get(`${ix0},${iz0}`) || 0;
            const s10 = this.bulldozedCells.get(`${ix0 + 1},${iz0}`) || 0;
            const s01 = this.bulldozedCells.get(`${ix0},${iz0 + 1}`) || 0;
            const s11 = this.bulldozedCells.get(`${ix0 + 1},${iz0 + 1}`) || 0;
            const steps = (s00 * (1 - sx) + s10 * sx) * (1 - sz) + (s01 * (1 - sx) + s11 * sx) * sz;
            return baseY - steps * 0.3048 * this.exaggeration;
        };

        // 1. Building 400 Lot (400 Douglas St, center [-36.91, 5.92])
        // Flat, level ground across the entire 400 lot (no basement excavation hole or internal step),
        // blending smoothly into the surrounding terrain contour at the lot boundaries.
        {
            const dx = x - (-36.91);
            const dz = z - 5.92;
            const lx = dx * 0.5842 - dz * 0.8116;
            const lz = dx * 0.8116 + dz * 0.5842;

            if (lx > -34.0 && lx < 21.5 && lz > -28.0 && lz < 25.5) {
                const lotLevelY = this.getRawTerrainHeight(-22.0, 10.0);
                const padW =
                    THREE.MathUtils.smoothstep(lx, -32.0, -20.0) *
                    (1.0 - THREE.MathUtils.smoothstep(lx, 17.5, 21.0)) *
                    THREE.MathUtils.smoothstep(lz, -26.0, -20.2) *
                    (1.0 - THREE.MathUtils.smoothstep(lz, 21.65, 25.0));

                return applyBulldoze(THREE.MathUtils.lerp(rawY, lotLevelY, padW));
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
                    return applyBulldoze(THREE.MathUtils.lerp(rawY, washGradeY, padW));
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
                return applyBulldoze(THREE.MathUtils.lerp(rawY, avgPadY, blendW));
            }
        }

        return applyBulldoze(rawY);
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
        this.outerTerrainMesh = mesh;
        parent.add(mesh);
    }

    _buildInnerCampusTerrainMesh(parent) {
        const size = this.terrainData?.inner?.size || 640;
        const segs = 320;
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
        this.innerTerrainMesh = mesh;
        parent.add(mesh);
    }

    /**
     * Bulldozer Tool: Lower a 1m x 1m square at (x, z) by 1 foot (0.3048m)
     */
    bulldoze1mSquare(x, z, deltaSteps = 1) {
        const ix = Math.floor(x);
        const iz = Math.floor(z);
        // Set all 4 corners of the 1m x 1m square [ix, ix + 1] x [iz, iz + 1]
        const corners = [
            `${ix},${iz}`,
            `${ix + 1},${iz}`,
            `${ix},${iz + 1}`,
            `${ix + 1},${iz + 1}`
        ];
        const prevStates = corners.map((k) => [k, this.bulldozedCells.get(k) || 0]);
        this._bulldozeHistory.push(prevStates);
        if (this._bulldozeHistory.length > 200) this._bulldozeHistory.shift();

        // Take the max of the 4 corners and add deltaSteps so the 1m x 1m cell lowers evenly by 1 foot
        const baseStep = Math.max(...prevStates.map(([, v]) => v));
        const nextStep = Math.max(0, baseStep + deltaSteps);
        corners.forEach((k) => {
            if (nextStep === 0) this.bulldozedCells.delete(k);
            else this.bulldozedCells.set(k, nextStep);
        });

        this._saveBulldozedCells();
        this._refreshTerrainRegion(ix - 3, ix + 4, iz - 3, iz + 4);
        return { ix, iz, steps: nextStep, feetLowered: nextStep };
    }

    undoBulldoze() {
        if (this._bulldozeHistory.length === 0) return false;
        const prevStates = this._bulldozeHistory.pop();
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        prevStates.forEach(([k, val]) => {
            const [cx, cz] = k.split(',').map(Number);
            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cz < minZ) minZ = cz;
            if (cz > maxZ) maxZ = cz;
            if (val <= 0) this.bulldozedCells.delete(k);
            else this.bulldozedCells.set(k, val);
        });
        this._saveBulldozedCells();
        this._refreshTerrainRegion(minX - 3, maxX + 3, minZ - 3, maxZ + 3);
        return true;
    }

    clearAllBulldoze() {
        if (this.bulldozedCells.size === 0) return false;
        this.bulldozedCells.clear();
        this._bulldozeHistory = [];
        this._saveBulldozedCells();
        this._refreshTerrainRegion(-320, 320, -320, 320);
        return true;
    }

    _saveBulldozedCells() {
        try {
            localStorage.setItem(
                'chelan_bulldozed_cells_v1',
                JSON.stringify(Array.from(this.bulldozedCells.entries()))
            );
        } catch (_) {}
    }

    _refreshTerrainRegion(minX, maxX, minZ, maxZ) {
        if (!this.innerTerrainMesh) return;
        const geo = this.innerTerrainMesh.geometry;
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const vx = pos.getX(i);
            const vz = pos.getZ(i);
            if (vx >= minX && vx <= maxX && vz >= minZ && vz <= maxZ) {
                pos.setY(i, this.getTerrainHeight(vx, vz));
            }
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
    }

    /**
     * Poured Concrete Foundation Mat & Stepped Structural Footing Slab on the leveled Building 400 lot
     */
    _buildBuilding400FoundationPad(parent) {
        buildCampusFoundationPads(this, parent);
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
