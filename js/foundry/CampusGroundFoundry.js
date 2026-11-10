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
        this.mapDarkness = 0.0;    // 0.0 (bright) .. 0.90 (dark)
        this.topoDarkBgActive = false;
        this.drawTerrainOnly = false;
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
     * Pure USGS 3DEP + 5.0m Core Grading Survey elevation (relative to 223.51m ASL datum) inside the campus tile bounds,
     * smoothly transitioning to flat (0.0m) at the tile boundary and completely flat outside the tiles.
     */
    getRawTerrainHeight(x, z) {
        if (!this.terrainData) return 0;
        const datum = this.terrainData.datum || 223.51;
        const inner = this.terrainData.inner;
        if (!inner) return 0;

        const halfInner = inner.size * 0.5; // 320m (bounds of the 640m x 640m campus tile)
        const maxCoord = Math.max(Math.abs(x), Math.abs(z));

        // Completely flat terrain outside the bounds of our campus tiles
        if (maxCoord >= halfInner) {
            return 0;
        }

        let elevASL = this._sampleGridSmooth(inner, x, z);
        const core = this.terrainData.core;
        if (core) {
            const halfCore = core.size * 0.5; // 160m high-resolution 5m core grid
            if (maxCoord < halfCore) {
                const coreASL = this._sampleGridSmooth(core, x, z);
                const coreBlend = 1.0 - THREE.MathUtils.smoothstep(maxCoord, halfCore - 28.0, halfCore);
                elevASL = THREE.MathUtils.lerp(elevASL, coreASL, coreBlend);
            }
        }
        const relY = (elevASL - datum) * this.exaggeration;

        // Smoothly feather elevation to 0.0 over the outer 45m perimeter (275m .. 320m)
        // so the inner tile edge meets the flat outer ground plane with zero step or seam
        const edgeFade = 1.0 - THREE.MathUtils.smoothstep(maxCoord, halfInner - 45.0, halfInner);
        return relY * edgeFade;
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
        // Flat, level ground across the building footprint & lower stair landing, while releasing smoothly
        // along the uphill Douglas St (-X / +Z) contour and pushing the street-side blend past the outer curb
        // so 4m terrain grid triangles never poke through the Douglas St or SW sidewalks.
        {
            const dx = x - (-36.91);
            const dz = z - 5.92;
            const lx = dx * 0.5842 - dz * 0.8116;
            const lz = dx * 0.8116 + dz * 0.5842;

            if (lx > -34.0 && lx < 22.5 && lz > -28.0 && lz < 31.5) {
                const lotLevelY = this.getRawTerrainHeight(-22.0, 10.0);
                let padW =
                    THREE.MathUtils.smoothstep(lx, -32.0, -20.0) *
                    (1.0 - THREE.MathUtils.smoothstep(lx, 18.0, 22.0)) *
                    THREE.MathUtils.smoothstep(lz, -28.0, -16.8) *
                    (1.0 - THREE.MathUtils.smoothstep(lz, 24.8, 31.0));

                // Smoothly release the uphill (-X) Douglas St & SW sidewalk corridor (lx < -0.5m)
                // partially toward the natural street slope (capped at +0.28m above lotLevelY inside the lot)
                // so the sidewalk follows a gentle, professional contour along Douglas St without burying the stairs.
                const uphillBlend =
                    (1.0 - THREE.MathUtils.smoothstep(lx, -8.5, -0.5)) *
                    THREE.MathUtils.smoothstep(lz, -16.0, 21.5);
                const targetPadY = THREE.MathUtils.lerp(
                    lotLevelY,
                    Math.min(Math.max(lotLevelY, rawY), lotLevelY + 0.28),
                    uphillBlend * 0.65
                );

                return applyBulldoze(THREE.MathUtils.lerp(rawY, targetPadY, padW));
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
                    // On the Douglas St (+X) side of Building 316 (lx316 > 4.5m, south of Building 316's front corner lz316 < 27.50m),
                    // smoothly release the flat Washington St pad so the terrain, grass strip & sidewalk follow a uniform, professional Douglas St contour,
                    // while keeping the recessed SW Fire Exit stairwell well (lx316 < 8.4m, lz316 = -10.8m..-5.5m) depressed below the sunken landing!
                    if (lx316 > 4.5 && lz316 < 27.50) {
                        const inFireExitWell =
                            (1.0 - THREE.MathUtils.smoothstep(lx316, 7.6, 9.2)) *
                            THREE.MathUtils.smoothstep(lz316, -11.2, -10.0) *
                            (1.0 - THREE.MathUtils.smoothstep(lz316, -5.8, -4.5));
                        const dougContourRelease =
                            THREE.MathUtils.smoothstep(lx316, 4.5, 7.9) *
                            THREE.MathUtils.smoothstep(27.50 - lz316, 0.0, 21.5) *
                            (1.0 - inFireExitWell);
                        padW *= (1.0 - dougContourRelease);
                    }
                    // Convert (x, z) to Building 300 local coordinates (lx300, lz300)
                    const dx300 = x - 23.97;
                    const dz300 = z - 79.18;
                    const lx300 = dx300 * (-0.80282848) - dz300 * 0.59621006;
                    const lz300 = dx300 * 0.59621006 + dz300 * (-0.80282848);
                    // On the Orondo Ave (-X) side of Building 300 (south of lz300 = 26.5m where Orondo Ave climbs uphill above washGradeY)
                    // and across the SW lawn toward the unnamed service road (lz300 < -25.0m, lx300 < -2.0m),
                    // smoothly release the flat Washington St pad so the Orondo Ave sidewalk & lawn follow the natural uphill contour!
                    if (lz300 < 26.5) {
                        const orondoSideRel =
                            THREE.MathUtils.smoothstep(-23.5 - lx300, 0.0, 4.2) *
                            THREE.MathUtils.smoothstep(26.5 - lz300, 0.0, 8.5);
                        const swLawnRel =
                            THREE.MathUtils.smoothstep(-25.0 - lz300, 0.0, 7.0) *
                            THREE.MathUtils.smoothstep(-2.0 - lx300, 0.0, 8.0);
                        const bldgWallRel =
                            0.55 *
                            THREE.MathUtils.smoothstep(-16.0 - lx300, 0.0, 8.0) *
                            THREE.MathUtils.smoothstep(24.0 - lz300, 0.0, 10.0);
                        const orondoRelease = Math.max(orondoSideRel, swLawnRel, bldgWallRel);
                        padW *= (1.0 - orondoRelease);
                    }
                    const washGradeY = this.getBuildingRoadHeight('building-316');
                    return applyBulldoze(THREE.MathUtils.lerp(rawY, washGradeY, padW));
                }
            }
        }

        // 2B. Building 428 Lot (428 Orondo Ave, center [-11.65, 154.47])
        // Level residential house pad that blends smoothly across the sloped front yard before the Orondo Ave sidewalk (lz = 11.91m)
        {
            const dx = x - (-11.65);
            const dz = z - 154.47;
            const lx = dx * 0.59621006 - dz * 0.80282848;
            const lz = dx * 0.80282848 + dz * 0.59621006;
            if (lx > -10.5 && lx < 10.5 && lz > -9.5 && lz < 11.2) {
                const lot428Y = this.getRawTerrainHeight(-11.65, 154.47);
                const padW =
                    THREE.MathUtils.smoothstep(lx, -10.5, -7.8) *
                    (1.0 - THREE.MathUtils.smoothstep(lx, 8.2, 10.5)) *
                    THREE.MathUtils.smoothstep(lz, -9.5, -6.8) *
                    (1.0 - THREE.MathUtils.smoothstep(lz, 5.2, 11.2));
                return applyBulldoze(THREE.MathUtils.lerp(rawY, lot428Y, padW));
            }
        }

        // 2C. Building 411/412 Lot (410/411/412 Washington St, center [-73.89, -11.51])
        // Level under the rear building wings (lz > +1.5m), while sloping smoothly with the terrain
        // across both the 412 SW parking lot and the 411 NE alley parking lot toward Washington St (-lz)
        // so the concrete parking platforms and 1-foot retaining wall follow the natural contour.
        {
            const dx = x - (-73.89);
            const dz = z - (-11.51);
            const lx = dx * 0.80801 + dz * 0.58917;
            const lz = -dx * 0.58917 + dz * 0.80801;
            if (lx > -22.0 && lx < 19.5 && lz > -20.0 && lz < 13.5) {
                const lot411Y = this.getRawTerrainHeight(-73.89, -11.51);
                // Rear wing pad (lz > +1.5m) + central 410/411 building core (lx = -0.5..11.7m, lz > -14.8m)
                const rearBldgW =
                    THREE.MathUtils.smoothstep(lx, -21.2, -19.0) *
                    (1.0 - THREE.MathUtils.smoothstep(lx, 16.0, 19.0)) *
                    THREE.MathUtils.smoothstep(lz, -2.0, 2.0) *
                    (1.0 - THREE.MathUtils.smoothstep(lz, 11.2, 13.5));
                const frontCoreW =
                    THREE.MathUtils.smoothstep(lx, -0.5, 0.8) *
                    (1.0 - THREE.MathUtils.smoothstep(lx, 10.8, 12.2)) *
                    THREE.MathUtils.smoothstep(lz, -15.0, -11.5) *
                    (1.0 - THREE.MathUtils.smoothstep(lz, 2.0, 4.0));
                const padW = Math.max(rearBldgW, frontCoreW);
                return applyBulldoze(THREE.MathUtils.lerp(rawY, lot411Y, padW));
            }
        }

        // 2E & 2F. Unified Auto-Graded Regional Justice Center Corridor:
        //          West Wing (413–415 Washington St, center [-30.73, -55.70]) + Building 401 (401 Washington St, center [-4.22, -38.74])
        //          Both share the exact same orientation (cosT = 0.80425, sinT = -0.59429; lx_WW = lx_401 + 31.40, lz_WW = lz_401 - 2.115).
        //          Using a single continuous piecewise-bilinear auto-graded surface across the entire corridor (lx_401 = -68.0m .. +60.5m,
        //          lz_401 = -23.0m .. +27.5m) eliminates the terrain hump/kink at the West Wing <-> Building 401 seam and ensures
        //          every Washington St, King St, and South/Rear walkway sits 100% above the terrain mesh!
        const getBldg401PlaneY = (lx401, lz401) => {
            // West Wing corners in 401 local coords (lx_401 = -59.78 at King St -> -14.85 at WW/401 seam -> +52.00 at East 401 corner)
            const yKingNW = this.getRawTerrainHeight(-65.23, -56.77); // Washington & King corner (lx_401 = -59.78, lz_401 = +21.75)
            const yKingSW = this.getRawTerrainHeight(-41.70, -88.48); // King St south corner (lx_401 = -59.70, lz_401 = -17.73)
            const ySeamNW = this.getRawTerrainHeight(-28.05, -18.02); // WW/401 Washington St sallyport seam (lx_401 = -14.85, lz_401 = +20.0)
            const ySeamSW = this.getRawTerrainHeight(-6.00, -40.07);  // WW/401 South Evidence Room seam (lx_401 = -14.85, lz_401 = -17.1)
            const yEastNE = this.getRawTerrainHeight(25.71, 21.70);   // East Douglas / Washington St corner (lx_401 = +52.00, lz_401 = +20.0)
            const yEastSE = this.getRawTerrainHeight(47.76, -21.59);  // SE lawn / South Sidewalk corner (lx_401 = +52.00, lz_401 = -17.1)

            const v = THREE.MathUtils.clamp((lz401 - (-17.50)) / (20.50 - (-17.50)), 0, 1);
            let yNorth, ySouth;
            if (lx401 < -14.85) {
                const uWest = THREE.MathUtils.clamp((lx401 - (-59.78)) / (-14.85 - (-59.78)), 0, 1);
                yNorth = THREE.MathUtils.lerp(yKingNW, ySeamNW, uWest);
                ySouth = THREE.MathUtils.lerp(yKingSW, ySeamSW, uWest);
            } else {
                const uEast = THREE.MathUtils.clamp((lx401 - (-14.85)) / (52.00 - (-14.85)), 0, 1);
                yNorth = THREE.MathUtils.lerp(ySeamNW, yEastNE, uEast);
                ySouth = THREE.MathUtils.lerp(ySeamSW, yEastSE, uEast);
            }
            return THREE.MathUtils.lerp(ySouth, yNorth, v) - 0.04;
        };

        {
            const dx = x - (-4.22);
            const dz = z - (-38.74);
            const lx = dx * 0.80425 + dz * 0.59429;
            const lz = -dx * 0.59429 + dz * 0.80425;
            // Covers West Wing (lx = -65.5m .. -13.85m, lz = -21.5m .. +25.5m) AND Building 401 (lx = -15.6m .. +60.0m, lz = -23.2m .. +27.5m)
            const minZBound = lx < 35.5 ? -23.20 : -19.35;
            if (lx > -66.5 && lx < 60.5 && lz > minZBound && lz < 27.5) {
                const planeY = getBldg401PlaneY(lx, lz);
                const zSouthFeather = lx < 35.5 ? minZBound + 2.35 : minZBound + 0.55;
                const padW =
                    THREE.MathUtils.smoothstep(lx, -66.5, -62.5) *
                    (1.0 - THREE.MathUtils.smoothstep(lx, 56.5, 60.5)) *
                    THREE.MathUtils.smoothstep(lz, minZBound, zSouthFeather) *
                    (1.0 - THREE.MathUtils.smoothstep(lz, 24.8, 27.5));
                if (lx >= 35.5 && lz < -19.10) {
                    // Let 2D Courthouse Park handle south of Building 401's South Sidewalk (lz < -19.10m) at the East Park seam
                } else {
                    return applyBulldoze(THREE.MathUtils.lerp(rawY, planeY, padW));
                }
            }
        }

        // 2D. Building 350 Lot & Courthouse Park (350 Orondo Ave — Chelan County Courthouse, center [56.17, 7.98])
        // Floor 2 (wash350Y) is graded flush with Washington St along the SW side (lx ≈ -15.26m, lz < 14.0m),
        // while sloping down smoothly across the Orondo Ave front lawn (lz = 26.1m .. 48.8m) and auto-grading
        // Courthouse Park (lx = +12.0m .. +58.5m, lz = -39.5m .. +48.5m) onto a smooth, mogul-free contour plane
        // welded directly to Building 401's South Sidewalk along lx_350 = +20.78m.
        {
            const dx = x - 56.17;
            const dz = z - 7.98;
            const lx = dx * 0.59410 - dz * 0.80439;
            const lz = dx * 0.80439 + dz * 0.59410;
            if (lx > -24.0 && lx < 16.5 && lz > -20.5 && lz < 48.0) {
                const wash350Y = this.getBuildingRoadHeight('courthouse-350');
                // Level Floor 2 grade along the Washington St rear/mid corridor, releasing smoothly toward Orondo Ave (+Z) and Park (+X)
                const washCorridorW =
                    THREE.MathUtils.smoothstep(lx, -24.0, -20.5) *
                    (1.0 - THREE.MathUtils.smoothstep(lx, -2.0, 10.5)) *
                    THREE.MathUtils.smoothstep(lz, -20.5, -17.0) *
                    (1.0 - THREE.MathUtils.smoothstep(lz, 10.0, 26.0));
                if (washCorridorW > 0.0001) {
                    return applyBulldoze(THREE.MathUtils.lerp(rawY, wash350Y, washCorridorW));
                }
            }

            // Courthouse Park Auto-Graded Contour Plane (in front of Building 350 +X and south of Building 401)
            if (lx > 11.5 && lx < 59.5 && lz > -42.5 && lz < 49.5 && (lx >= 20.78 || lz > -17.2)) {
                const u = THREE.MathUtils.clamp((lx - 15.0) / (56.0 - 15.0), 0, 1);
                const v = THREE.MathUtils.clamp((lz - (-37.0)) / (46.0 - (-37.0)), 0, 1);

                // Anchor the right-inner corner (yInRight) directly to Building 401's South Sidewalk grade so there is 0.000m step!
                const lx401AtSeam = 76.333 + THREE.MathUtils.clamp(lz, -42.0, -18.0);
                const yInRight = getBldg401PlaneY(lx401AtSeam, -19.10);
                const yInMid = this.getRawTerrainHeight(69.11, -2.22);     // Foot of Building 350 Monumental Park Stairs (lx=15.9, lz=+4.35)
                const yInLeft = this.getRawTerrainHeight(101.81, 21.92);   // Orondo Ave NE Park Corner (lx=15.9, lz=+45.0)
                const yOutRight = this.getRawTerrainHeight(59.89, -57.64); // Outer Right Park Walkway end (lx=55.0, lz=-36.0)
                const yOutMid = this.getRawTerrainHeight(92.34, -33.67);   // Outer Center Oval Park Lawn (lx=55.0, lz=+4.35)
                const yOutLeft = this.getRawTerrainHeight(125.04, -9.53);  // Outer Left Orondo Ave Sidewalk end (lx=55.0, lz=+45.0)

                // Piecewise bilinear interpolation across right half (v in [0, 0.5]) and left half (v in [0.5, 1.0])
                let yIn, yOut;
                if (v < 0.5) {
                    const vt = v * 2.0;
                    yIn = THREE.MathUtils.lerp(yInRight, yInMid, vt);
                    yOut = THREE.MathUtils.lerp(yOutRight, yOutMid, vt);
                } else {
                    const vt = (v - 0.5) * 2.0;
                    yIn = THREE.MathUtils.lerp(yInMid, yInLeft, vt);
                    yOut = THREE.MathUtils.lerp(yOutMid, yOutLeft, vt);
                }
                // Near Building 401's South Sidewalk (lz < -18.0, lx near 20.78), start u from lx = 20.78 so y(20.78) === yInRight!
                const uRight = THREE.MathUtils.clamp((lx - 20.78) / (56.0 - 20.78), 0, 1);
                const uEff = THREE.MathUtils.lerp(uRight, u, THREE.MathUtils.smoothstep(lz, -24.0, -14.0));
                const parkPlaneY = THREE.MathUtils.lerp(yIn, yOut, uEff) - 0.04;

                const parkW =
                    THREE.MathUtils.smoothstep(lx, 11.5, 15.5) *
                    (1.0 - THREE.MathUtils.smoothstep(lx, 56.0, 59.5)) *
                    THREE.MathUtils.smoothstep(lz, -42.5, -38.5) *
                    (1.0 - THREE.MathUtils.smoothstep(lz, 46.5, 49.5));

                return applyBulldoze(THREE.MathUtils.lerp(rawY, parkPlaneY, parkW));
            }
        }

        // 3. All other campus buildings: ~1.0m auto-leveled perimeter surrounding each building footprint
        if (this.campusBuildings && this.campusBuildings.length > 0) {
            let totalW = 0;
            let weightedPadY = 0;
            for (let i = 0; i < this.campusBuildings.length; i++) {
                const b = this.campusBuildings[i];
                if (
                    b.id === 'building-400' ||
                    b.id === 'building-428' ||
                    b.id === 'building-411-412' ||
                    b.id === 'courthouse-350' ||
                    b.id === 'regional-jail-west' ||
                    b.id === 'regional-jail-east' ||
                    b.code === 'CCRJ-W' ||
                    b.code === '401' ||
                    b.code === '350' ||
                    b.code === '316' ||
                    b.code === '300'
                ) continue;
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
        const datum = this.terrainData.datum || 223.51;
        const inner = this.terrainData.inner;
        const halfInner = inner.size * 0.5;
        const maxCoord = Math.max(Math.abs(x), Math.abs(z));
        if (maxCoord >= halfInner) {
            return datum;
        }
        const elevASL = this._sampleGridSmooth(inner, x, z);
        const edgeFade = 1.0 - THREE.MathUtils.smoothstep(maxCoord, halfInner - 45.0, halfInner);
        return datum + (elevASL - datum) * edgeFade;
    }

    _sampleGridSmooth(grid, x, z) {
        const size = grid.size;
        const half = size * 0.5;
        const gridN = grid.gridN;
        const segs = grid.segments;

        const u = THREE.MathUtils.clamp((x + half) / size, 0, 1) * segs;
        const v = THREE.MathUtils.clamp((z + half) / size, 0, 1) * segs;

        const ix1 = Math.min(segs - 1, Math.floor(u));
        const iz1 = Math.min(segs - 1, Math.floor(v));
        const fx = u - ix1;
        const fz = v - iz1;

        // 4x4 Bicubic Catmull-Rom spline interpolation for C1-continuous slope & curvature across grid cells
        const catmull = (p0, p1, p2, p3, t) => {
            const t2 = t * t;
            const t3 = t2 * t;
            return 0.5 * (
                (2 * p1) +
                (-p0 + p2) * t +
                (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
                (-p0 + 3 * p1 - 3 * p2 + p3) * t3
            );
        };

        const clampIdx = (idx) => (idx < 0 ? 0 : (idx >= gridN ? gridN - 1 : idx));
        const ix0 = clampIdx(ix1 - 1);
        const ix2 = clampIdx(ix1 + 1);
        const ix3 = clampIdx(ix1 + 2);

        const row0 = clampIdx(iz1 - 1) * gridN;
        const row1 = clampIdx(iz1) * gridN;
        const row2 = clampIdx(iz1 + 1) * gridN;
        const row3 = clampIdx(iz1 + 2) * gridN;

        const h = grid.heights;
        const r0 = catmull(h[row0 + ix0], h[row0 + ix1], h[row0 + ix2], h[row0 + ix3], fx);
        const r1 = catmull(h[row1 + ix0], h[row1 + ix1], h[row1 + ix2], h[row1 + ix3], fx);
        const r2 = catmull(h[row2 + ix0], h[row2 + ix1], h[row2 + ix2], h[row2 + ix3], fx);
        const r3 = catmull(h[row3 + ix0], h[row3 + ix1], h[row3 + ix2], h[row3 + ix3], fx);

        return catmull(r0, r1, r2, r3, fz);
    }

    _getMicroTerrainBumpMap() {
        if (this._microBumpTex) return this._microBumpTex;
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const img = ctx.createImageData(128, 128);
        const d = img.data;
        for (let i = 0; i < 128 * 128; i++) {
            const n = Math.floor(128 + 26 * Math.sin(i * 12.9898) * Math.cos(i * 78.233));
            const idx = i * 4;
            d[idx] = n;
            d[idx + 1] = n;
            d[idx + 2] = n;
            d[idx + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(96, 96);
        this._microBumpTex = tex;
        return tex;
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
        this.applyGroundTheme();
    }

    buildEnvironment(scene, campusData) {
        this.terrainData = campusData.terrain;
        this.campusBuildings = campusData.campusBuildings || [];
        const envGroup = new THREE.Group();
        envGroup.name = 'CampusGroundAndStreets';

        // 1. Outer Wenatchee Foothills & Columbia River Valley DEM Terrain (4400m x 4400m) with Google Maps texture
        this._buildOuterFoothillsMesh(envGroup);

        // 2. High-Resolution Core-Concentrated Inner Campus Topographic Terrain (640m x 640m, 420x420 foveated mesh)
        this._buildInnerCampusTerrainMesh(envGroup);

        // 3. Poured Concrete Foundation Pad & Stepped Footing on the Leveled 400 Lot
        this._buildBuilding400FoundationPad(envGroup);

        // 4. Topographic Elevation Contour Lines (2m intervals)
        this.contourLinesMesh = this._buildTopographicContours(envGroup);

        // 5. Atmospheric Ground Fog Skirt & Mist Ring Outside Our Campus Tiles (|x|, |z| > 265m .. 2200m)
        this._buildOuterTileFogSkirt(envGroup);

        this.applyGroundTheme();

        scene.add(envGroup);
        return envGroup;
    }

    setOuterTileFogColor(colorHex) {
        if (!this.outerTileFogColorUniform) {
            this.outerTileFogColorUniform = { value: new THREE.Color('#ffffff') };
        }
        this.outerTileFogColorUniform.value.set(colorHex);
        if (this.outerFogSkirtMat && this.outerFogSkirtMat.uniforms?.uFogColor) {
            this.outerFogSkirtMat.uniforms.uFogColor.value.set(colorHex);
        }
    }

    setOuterTileFogEnabled(enabled = true) {
        const isEnabled = Boolean(enabled);
        if (!this.outerTileFogEnabledUniform) {
            this.outerTileFogEnabledUniform = { value: 1.0 };
        }
        this.outerTileFogEnabledUniform.value = isEnabled ? 1.0 : 0.0;
        if (this.outerFogSkirtMesh) {
            this.outerFogSkirtMesh.visible = isEnabled;
        }
    }

    _attachOuterTileBoundaryFogShader(mat) {
        if (!this.outerTileFogColorUniform) {
            this.outerTileFogColorUniform = { value: new THREE.Color('#ffffff') };
        }
        if (!this.outerTileFogEnabledUniform) {
            this.outerTileFogEnabledUniform = { value: 1.0 };
        }
        const fogColUniform = this.outerTileFogColorUniform;
        const fogEnabledUniform = this.outerTileFogEnabledUniform;
        mat.onBeforeCompile = (shader) => {
            shader.uniforms.uOuterTileFogColor = fogColUniform;
            shader.uniforms.uOuterTileFogEnabled = fogEnabledUniform;
            shader.vertexShader =
                `varying vec3 vTileWorldPos;\n` +
                shader.vertexShader.replace(
                    '#include <worldpos_vertex>',
                    `#include <worldpos_vertex>
                    vTileWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
                );
            shader.fragmentShader =
                `varying vec3 vTileWorldPos;\nuniform vec3 uOuterTileFogColor;\nuniform float uOuterTileFogEnabled;\n` +
                shader.fragmentShader.replace(
                    '#include <fog_fragment>',
                    `// Feather white fog across a 500-foot (152.40m) perimeter band all around the 320m campus tile edge (167.60m .. 320.00m)
                    vec2 featherOver = max(abs(vTileWorldPos.xz) - vec2(167.60), 0.0);
                    float featherDist = length(featherOver);
                    float edgeBlanket = smoothstep(0.0, 152.40, featherDist) * uOuterTileFogEnabled;
                    gl_FragColor.rgb = mix(gl_FragColor.rgb, uOuterTileFogColor, edgeBlanket);
                    #include <fog_fragment>`
                );
        };
    }

    _buildOuterTileFogSkirt(parent) {
        if (!this.outerTileFogColorUniform) {
            this.outerTileFogColorUniform = { value: new THREE.Color('#ffffff') };
        }
        const skirtGeo = new THREE.PlaneGeometry(4400, 4400, 1, 1);
        skirtGeo.rotateX(-Math.PI / 2);

        this.outerFogSkirtMat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
            uniforms: {
                uFogColor: { value: this.outerTileFogColorUniform.value.clone() }
            },
            vertexShader: `
                varying vec3 vWorldPos;
                void main() {
                    vec4 wp = modelMatrix * vec4(position, 1.0);
                    vWorldPos = wp.xyz;
                    gl_Position = projectionMatrix * viewMatrix * wp;
                }
            `,
            fragmentShader: `
                varying vec3 vWorldPos;
                uniform vec3 uFogColor;

                void main() {
                    // 500-foot (152.40m) smooth feather all around the 320m campus tile boundary (167.60m .. 320.00m)
                    vec2 featherOver = max(abs(vWorldPos.xz) - vec2(167.60), 0.0);
                    float featherDist = length(featherOver);
                    float alpha = smoothstep(0.0, 152.40, featherDist);
                    if (alpha < 0.004) discard;
                    gl_FragColor = vec4(uFogColor, alpha);
                }
            `
        });

        const skirtMesh = new THREE.Mesh(skirtGeo, this.outerFogSkirtMat);
        skirtMesh.name = 'OuterTileAtmosphericFogSkirt';
        skirtMesh.position.y = 0.35;
        skirtMesh.renderOrder = 2;
        this.outerFogSkirtMesh = skirtMesh;
        parent.add(skirtMesh);
    }

    setGroundTheme({
        style,
        darkness = this.mapDarkness,
        topoActive = this.topoDarkBgActive,
        drawTerrainOnly = this.drawTerrainOnly,
        hdrPop = this.hdrPopActive
    } = {}) {
        if (style) this.mapStyle = style;
        if (typeof darkness === 'number') {
            this.mapDarkness = THREE.MathUtils.clamp(darkness, 0, 0.92);
        }
        if (typeof topoActive === 'boolean') {
            this.topoDarkBgActive = Boolean(topoActive);
        }
        if (typeof drawTerrainOnly === 'boolean') {
            this.drawTerrainOnly = Boolean(drawTerrainOnly);
        }
        if (typeof hdrPop === 'boolean') {
            this.hdrPopActive = Boolean(hdrPop);
        }
        this.applyGroundTheme();
    }

    applyGroundTheme() {
        const isSat = this.mapStyle === 'satellite';
        const hideMapTexture = this.drawTerrainOnly || this.topoDarkBgActive;
        const innerTex = hideMapTexture
            ? null
            : (isSat
                ? this._loadGroundTexture('sat_inner', './assets/textures/google_sat_campus.png')
                : this._loadGroundTexture('map_inner', './assets/textures/google_map_campus.png'));
        const outerTex = hideMapTexture
            ? null
            : (isSat
                ? this._loadGroundTexture('sat_outer', './assets/textures/google_sat_outer.png')
                : this._loadGroundTexture('map_outer', './assets/textures/google_map_outer.png'));

        if (hideMapTexture) {
            // Solid shaded 3D topographic terrain surface with NO Google Map texture (only 3D terrain & drawn 3D roads/grounds)
            const effDark = this.topoDarkBgActive ? Math.max(this.mapDarkness, 0.85) : this.mapDarkness;
            const lightInner = new THREE.Color('#d2d8e0');
            const lightOuter = new THREE.Color('#c2c9d2');
            const darkInner = new THREE.Color('#141c2b');
            const darkOuter = new THREE.Color('#0f1623');

            const innerCol = lightInner.lerp(darkInner, effDark);
            const outerCol = lightOuter.lerp(darkOuter, effDark);

            if (this.innerTerrainMat) {
                this.innerTerrainMat.map = null;
                this.innerTerrainMat.color.copy(innerCol);
                this.innerTerrainMat.roughness = THREE.MathUtils.lerp(0.90, 0.96, effDark);
                this.innerTerrainMat.needsUpdate = true;
            }
            if (this.outerTerrainMat) {
                this.outerTerrainMat.map = null;
                this.outerTerrainMat.color.copy(outerCol);
                this.outerTerrainMat.roughness = THREE.MathUtils.lerp(0.93, 0.98, effDark);
                this.outerTerrainMat.needsUpdate = true;
            }
        } else {
            // Anchor bright roadmap luminance when HDR Pop is active so the map never competes with sunlit 3D facades
            const lightInner = new THREE.Color(this.hdrPopActive ? '#dce3ed' : '#ffffff');
            const lightOuter = new THREE.Color(this.hdrPopActive ? '#bcc7d6' : '#f2f5f8');
            const darkInner = new THREE.Color(this.hdrPopActive ? '#1c2638' : '#161e2b');
            const darkOuter = new THREE.Color(this.hdrPopActive ? '#121926' : '#121824');

            const innerTint = lightInner.lerp(darkInner, this.mapDarkness);
            const outerTint = lightOuter.lerp(darkOuter, this.mapDarkness);

            if (this.innerTerrainMat) {
                this.innerTerrainMat.map = innerTex;
                this.innerTerrainMat.color.copy(innerTint);
                this.innerTerrainMat.roughness = THREE.MathUtils.lerp(0.88, 0.97, this.mapDarkness);
                this.innerTerrainMat.needsUpdate = true;
            }
            if (this.outerTerrainMat) {
                this.outerTerrainMat.map = outerTex;
                this.outerTerrainMat.color.copy(outerTint);
                this.outerTerrainMat.roughness = THREE.MathUtils.lerp(0.92, 0.98, this.mapDarkness);
                this.outerTerrainMat.needsUpdate = true;
            }
        }

        if (this.contourLinesMesh && this.contourLinesMesh.material) {
            const cMat = this.contourLinesMesh.material;
            if (this.topoDarkBgActive || this.mapDarkness > 0.35) {
                cMat.color.set('#fbbf24');
                cMat.opacity = 0.88;
            } else {
                cMat.color.set('#d97706');
                cMat.opacity = 0.42;
            }
            cMat.needsUpdate = true;
        }
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
            // Completely flat outside the inner campus tile bounds, depressed inside the inner square to avoid z-fighting
            let vy = -0.05;
            if (Math.abs(vx) < halfInner && Math.abs(vz) < halfInner) {
                vy = Math.min(-0.5, this.getRawTerrainHeight(vx, vz) - 2.2);
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
            metalness: 0.02,
            polygonOffset: true,
            polygonOffsetFactor: 6,
            polygonOffsetUnits: 6
        });
        this._attachOuterTileBoundaryFogShader(this.outerTerrainMat);

        const mesh = new THREE.Mesh(geo, this.outerTerrainMat);
        mesh.receiveShadow = true;
        this.outerTerrainMesh = mesh;
        parent.add(mesh);
    }

    _buildInnerCampusTerrainMesh(parent) {
        const size = this.terrainData?.inner?.size || 640;
        const half = size * 0.5;
        const segs = 420;
        const geo = new THREE.PlaneGeometry(size, size, segs, segs);
        geo.rotateX(-Math.PI / 2);

        // Non-uniform foveated vertex distribution that concentrates resolution (~0.85m vertex spacing)
        // across the campus core [-145m..+145m] where building entrances, curbs, and sidewalks meet,
        // while keeping exact Web-Mercator UVs (u = vx/size + 0.5, v = 0.5 - vz/size).
        const warpCoord = (c) => {
            const t = c / half; // [-1, 1]
            const absT = Math.abs(t);
            const warped = 0.58 * t + 0.42 * t * absT * absT;
            return warped * half;
        };

        const pos = geo.attributes.position;
        const uv = geo.attributes.uv;
        for (let i = 0; i < pos.count; i++) {
            const vx = warpCoord(pos.getX(i));
            const vz = warpCoord(pos.getZ(i));
            const vy = this._getTerrainMeshVertexHeight(vx, vz);
            pos.setXYZ(i, vx, vy, vz);
            if (uv) {
                uv.setXY(i, vx / size + 0.5, 0.5 - vz / size);
            }
        }

        geo.computeVertexNormals();

        const innerTex =
            this.mapStyle === 'satellite'
                ? this._loadGroundTexture('sat_inner', './assets/textures/google_sat_campus.png')
                : this._loadGroundTexture('map_inner', './assets/textures/google_map_campus.png');

        const bumpTex = this._getMicroTerrainBumpMap();

        this.innerTerrainMat = new THREE.MeshStandardMaterial({
            map: innerTex,
            bumpMap: bumpTex,
            bumpScale: 0.035,
            roughness: 0.88,
            metalness: 0.04,
            polygonOffset: true,
            polygonOffsetFactor: 4,
            polygonOffsetUnits: 4
        });
        this._attachOuterTileBoundaryFogShader(this.innerTerrainMat);

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

    _getTerrainMeshVertexHeight(vx, vz) {
        const vy = this.getTerrainHeight(vx, vz);
        // Depress the global terrain mesh beneath Building 401's South Planter Bed, Wheelchair Ramp & Sunken 1st-Floor Entrance Courtyard
        // so `innerTerrainMesh` never pokes through or sends boundary triangles across the descending ramp or 1st-floor courtyard!
        const dx401 = vx - (-4.22);
        const dz401 = vz - (-38.74);
        const lx401 = dx401 * 0.80425 + dz401 * 0.59429;
        const lz401 = -dx401 * 0.59429 + dz401 * 0.80425;
        if (
            (lx401 > -4.00 && lx401 <= 26.20 && lz401 > -16.10 && lz401 < 17.50) ||
            (lx401 > 26.20 && lx401 < 53.20 && lz401 > -17.85 && lz401 < 17.50)
        ) {
            const bldgRoadY = this.getBuildingRoadHeight('regional-jail-east') ?? vy;
            return Math.min(vy, bldgRoadY - 1.65);
        }
        return vy;
    }

    _refreshTerrainRegion(minX, maxX, minZ, maxZ) {
        if (!this.innerTerrainMesh) return;
        const geo = this.innerTerrainMesh.geometry;
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const vx = pos.getX(i);
            const vz = pos.getZ(i);
            if (vx >= minX && vx <= maxX && vz >= minZ && vz <= maxZ) {
                pos.setY(i, this._getTerrainMeshVertexHeight(vx, vz));
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
