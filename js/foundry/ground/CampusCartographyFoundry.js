import * as THREE from 'three';

/**
 * CampusCartographyFoundry — Chelan County Campus-Focused Cartography & Survey Layer
 *
 * Strictly scoped to the Chelan County Campus (zero off-campus parking islands, zero off-campus
 * street ribbons or intersection circles):
 *  1. Campus-Only Road-Aligned 3D Ground Street Typography draped cleanly along our custom
 *     campus street corridors (`WASHINGTON ST`, `ORONDO AVE`, `DOUGLAS ST`, `KING ST`, `S. OKANOGAN AVE`).
 *  2. Toggleable Campus Parcel & Right-of-Way Survey Boundary Layer (`#toggle-parcels`, off by default)
 *     strictly hugging our Chelan County Campus blocks and 8 campus buildings.
 *  3. Toggleable High-Precision Major (`2.5m`) & Minor (`0.5m`) Marching-Squares Topographic Contours
 *     (`#toggle-contours`, off by default) with terrain-aligned ASL Elevation Callout Plaques.
 */

const COS_401 = 0.80425;
const SIN_401 = 0.59429;
const CX_401 = -4.22;
const CZ_401 = -38.74;

export function local401ToWorld(lx, lz) {
    return [
        CX_401 + lx * COS_401 - lz * SIN_401,
        CZ_401 + lx * SIN_401 + lz * COS_401
    ];
}

export function worldTo401(wx, wz) {
    const dx = wx - CX_401;
    const dz = wz - CZ_401;
    return [
        dx * COS_401 + dz * SIN_401,
        -dx * SIN_401 + dz * COS_401
    ];
}

/**
 * Returns true if world point (wx, wz) lies inside a road corridor or building pad
 * modeled by WashingtonStreetCorridor or the 8 custom Chelan County Campus buildings.
 */
export function isInsideCustomCampusCorridor(wx, wz) {
    const [lx, lz] = worldTo401(wx, wz);

    // 1. Washington St custom corridor (King St to Orondo Ave)
    if (lx >= -64.5 && lx <= 125.5 && lz >= 19.2 && lz <= 43.6) return true;

    // 2. Douglas St custom corridor (Washington St speed table to 428 Orondo level)
    if (lx >= 21.6 && lx <= 41.4 && lz >= 38.0 && lz <= 174.5) return true;

    // 3. Orondo Ave custom corridor (Courthouse 350 to 428 Orondo level)
    if (lx >= 120.8 && lx <= 144.4 && lz >= -61.8 && lz <= 174.5) return true;

    // 4. King St custom corridor (West Wing SE to 428 Orondo level)
    if (lx >= -78.2 && lx <= -58.8 && lz >= -51.8 && lz <= 174.5) return true;

    // 5. S. Okanogan St custom rounded-corner throat & campus approach
    const okDx = lx - 141.40;
    const okDz = lz - (-25.95);
    const okS = okDx * 0.59429 + okDz * 0.80425;
    const okOff = -okDx * 0.80425 + okDz * 0.59429;
    if (okS >= -3.5 && okS <= 91.0 && Math.abs(okOff) <= 11.2) return true;

    // 6. Gym Rear Access Road (Douglas St -> Orondo Ave + Rear Alley behind 426/428) & Concrete Parking Lots
    if (lx >= 38.0 && lx <= 123.5 && lz >= 114.0 && lz <= 152.5) return true;
    if (lx >= 77.0 && lx <= 84.8 && lz >= 128.0 && lz <= 174.8) return true;

    // 7. South Campus Core custom building grounds (West Wing, Building 401, Courthouse 350)
    if (lx >= -63.0 && lx <= 124.5 && lz >= -22.5 && lz <= 25.0) return true;

    // 8. NW Campus Core custom building grounds & rear lots (411/412, 400, 316, 300) + Behind-400 Concrete Rear Alley
    if (lx >= -62.0 && lx <= 124.0 && lz >= 38.0 && lz <= 115.5) return true;
    if (lx >= -22.5 && lx <= -16.0 && lz >= 97.0 && lz <= 153.0) return true;

    // 9. Building 428 Orondo Ave Annex custom yard & ramp
    if (Math.hypot(wx - (-11.65), wz - 154.47) < 13.5) return true;

    return false;
}

export class CampusCartographyFoundry {
    constructor(groundFoundry) {
        this.groundFoundry = groundFoundry;
        this.rootGroup = null;
        this.streetTypographyGroup = null;
        this.parcelGroup = null;
        this.contourGroup = null;
        this.minorContourMat = null;
        this.majorContourMat = null;
        this.parcelLineMat = null;
        this._cachedTextures = new Map();
    }

    _makeTextDecalTexture(text, {
        width = 1024,
        height = 160,
        fontSize = 66,
        textColor = '#f8fafc',
        haloColor = 'rgba(15, 23, 42, 0.94)',
        bgPillColor = null,
        borderColor = null
    } = {}) {
        const cacheKey = `txt_${text}_${width}_${height}_${fontSize}_${textColor}_${bgPillColor || 'none'}`;
        if (this._cachedTextures.has(cacheKey)) return this._cachedTextures.get(cacheKey);
        if (typeof document === 'undefined') return null;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);

        if (bgPillColor) {
            const padX = 24;
            const padY = 18;
            const r = (height - padY * 2) * 0.45;
            const w = width - padX * 2;
            const h = height - padY * 2;
            ctx.fillStyle = bgPillColor;
            ctx.beginPath();
            ctx.roundRect(padX, padY, w, h, r);
            ctx.fill();
            if (borderColor) {
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 4;
                ctx.stroke();
            }
        }

        ctx.font = `700 ${fontSize}px "Segoe UI", system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if ('letterSpacing' in ctx) {
            ctx.letterSpacing = '6px';
        }

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = haloColor;
        ctx.lineWidth = bgPillColor ? 6 : 13;
        ctx.strokeText(text, width * 0.5, height * 0.52);

        ctx.fillStyle = textColor;
        ctx.fillText(text, width * 0.5, height * 0.52);

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 16;
        tex.needsUpdate = true;
        this._cachedTextures.set(cacheKey, tex);
        return tex;
    }

    _attachFogIfAvailable(mat) {
        if (this.groundFoundry && typeof this.groundFoundry._attachOuterTileBoundaryFogShader === 'function') {
            this.groundFoundry._attachOuterTileBoundaryFogShader(mat);
        }
        return mat;
    }

    buildAll(parentGroup, campusData) {
        this.campusData = campusData;
        if (this.rootGroup && this.rootGroup.parent) {
            this.rootGroup.parent.remove(this.rootGroup);
        }

        const root = new THREE.Group();
        root.name = 'CampusCartographyAndInfrastructure';
        this.rootGroup = root;

        // 1. Campus-Only Road-Aligned 3D Ground Street Typography
        this.streetTypographyGroup = this._buildRoadAlignedTypography();
        root.add(this.streetTypographyGroup);

        // 2. Toggleable Campus Parcel & Right-of-Way Survey Boundaries (strictly Chelan County Campus)
        this.parcelGroup = this._buildParcelBoundaries(campusData.campusBuildings || []);
        this.parcelGroup.visible = false; // Controlled by #toggle-parcels
        root.add(this.parcelGroup);

        // 3. Toggleable High-Precision Major/Minor Topographic Contours & Elevation Callouts
        this.contourGroup = this._buildHighPrecisionContours();
        this.contourGroup.visible = false; // Controlled by #toggle-contours
        root.add(this.contourGroup);

        parentGroup.add(root);
        return root;
    }

    rebuildTerrainDependentLayers() {
        if (!this.rootGroup || !this.campusData) return;
        const parcelsVis = this.parcelGroup ? this.parcelGroup.visible : false;
        const contoursVis = this.contourGroup ? this.contourGroup.visible : false;
        const typoVis = this.streetTypographyGroup ? this.streetTypographyGroup.visible : true;
        const parent = this.rootGroup.parent;
        if (!parent) return;

        this.buildAll(parent, this.campusData);
        if (this.parcelGroup) this.parcelGroup.visible = parcelsVis;
        if (this.contourGroup) this.contourGroup.visible = contoursVis;
        if (this.streetTypographyGroup) this.streetTypographyGroup.visible = typoVis;
    }

    updateTheme({ topoActive = false, mapDarkness = 0 } = {}) {
        const darkMode = topoActive || mapDarkness > 0.35;
        if (this.majorContourMat) {
            this.majorContourMat.color.set(darkMode ? '#fbbf24' : '#b45309');
            this.majorContourMat.opacity = darkMode ? 0.92 : 0.64;
            this.majorContourMat.needsUpdate = true;
        }
        if (this.minorContourMat) {
            this.minorContourMat.color.set(darkMode ? '#fcd34d' : '#d97706');
            this.minorContourMat.opacity = darkMode ? 0.38 : 0.25;
            this.minorContourMat.needsUpdate = true;
        }
        if (this.parcelLineMat) {
            this.parcelLineMat.color.set(darkMode ? '#38bdf8' : '#0284c7');
            this.parcelLineMat.opacity = darkMode ? 0.88 : 0.72;
            this.parcelLineMat.needsUpdate = true;
        }
    }

    // =========================================================================
    // 1. CAMPUS-ONLY ROAD-ALIGNED 3D GROUND STREET TYPOGRAPHY
    // =========================================================================
    _buildRoadAlignedTypography() {
        const grp = new THREE.Group();
        grp.name = 'RoadAlignedStreetTypography3D';
        const getH = (x, z) => this.groundFoundry.getTerrainHeight(x, z);

        // Strictly Chelan County Campus corridors (in exact 401 street-aligned frame -> world)
        const okPt = (s) => local401ToWorld(141.40 + 0.59429 * s, -25.95 + 0.80425 * s);
        const [okX0, okZ0] = okPt(30.0);
        const [okX1, okZ1] = okPt(74.0);

        const campusCorridorLabels = [
            // Washington St (SW segment between King St & Douglas St, and NE segment between Douglas St & Orondo Ave)
            { label: 'WASHINGTON ST', p0: local401ToWorld(-36.0, 31.72), p1: local401ToWorld(-2.0, 31.72), width: 2.55 },
            { label: 'WASHINGTON ST', p0: local401ToWorld(64.0, 31.72), p1: local401ToWorld(98.0, 31.72), width: 2.55 },
            // Orondo Ave (SE frontage by Courthouse 350 & NW frontage by Building 300 / 428 Orondo)
            { label: 'ORONDO AVE', p0: local401ToWorld(132.35, -38.0), p1: local401ToWorld(132.35, -4.0), width: 2.75 },
            { label: 'ORONDO AVE', p0: local401ToWorld(132.35, 68.0), p1: local401ToWorld(132.35, 106.0), width: 2.75 },
            // Douglas St (between Building 400 & Building 316)
            { label: 'DOUGLAS ST', p0: local401ToWorld(31.54, 56.0), p1: local401ToWorld(31.54, 92.0), width: 2.35 },
            // King St (along West Wing & Building 411/412)
            { label: 'KING ST', p0: local401ToWorld(-68.33, -18.0), p1: local401ToWorld(-68.33, 14.0), width: 2.35 },
            // S. Okanogan Ave (campus approach throat off Orondo Ave)
            { label: 'S. OKANOGAN AVE', p0: [okX0, okZ0], p1: [okX1, okZ1], width: 2.45 }
        ];

        for (const item of campusCorridorLabels) {
            let [x0, z0] = item.p0;
            let [x1, z1] = item.p1;

            // Ensure text reads upright left-to-right from standard campus camera views
            const dx = x1 - x0;
            const dz = z1 - z0;
            if (dx < -4.0 || (Math.abs(dx) <= 4.0 && dz < 0)) {
                [x0, x1] = [x1, x0];
                [z0, z1] = [z1, z0];
            }

            const totalSpan = Math.hypot(x1 - x0, z1 - z0);
            const decalLen = Math.min(totalSpan, Math.max(13.5, item.label.length * 1.42));
            const midX = (x0 + x1) * 0.5;
            const midZ = (z0 + z1) * 0.5;
            const ux = (x1 - x0) / (totalSpan || 1);
            const uz = (z1 - z0) / (totalSpan || 1);
            const nx = -uz;
            const nz = ux;

            const sx0 = midX - ux * decalLen * 0.5;
            const sz0 = midZ - uz * decalLen * 0.5;
            const sx1 = midX + ux * decalLen * 0.5;
            const sz1 = midZ + uz * decalLen * 0.5;

            const halfH = item.width * 0.5;
            const segs = 8;
            const pos = [], norm = [], uv = [], idx = [];

            for (let i = 0; i <= segs; i++) {
                const u = i / segs;
                const cx = sx0 + (sx1 - sx0) * u;
                const cz = sz0 + (sz1 - sz0) * u;
                const txA = cx - nx * halfH, tzA = cz - nz * halfH;
                const bxA = cx + nx * halfH, bzA = cz + nz * halfH;
                pos.push(
                    txA, getH(txA, tzA) + 0.085, tzA,
                    bxA, getH(bxA, bzA) + 0.085, bzA
                );
                norm.push(0, 1, 0, 0, 1, 0);
                uv.push(u, 1, u, 0);
            }
            for (let i = 0; i < segs; i++) {
                const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
                idx.push(a, b, d, a, d, c);
            }

            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
            geo.setIndex(idx);

            const tex = this._makeTextDecalTexture(item.label, {
                width: 1024,
                height: 160,
                fontSize: 62,
                textColor: '#f8fafc',
                haloColor: 'rgba(15, 23, 42, 0.95)',
                bgPillColor: 'rgba(34, 39, 48, 0.86)'
            });

            const mat = this._attachFogIfAvailable(new THREE.MeshBasicMaterial({
                map: tex,
                transparent: true,
                opacity: 0.92,
                side: THREE.DoubleSide,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -7,
                polygonOffsetUnits: -7
            }));

            const mesh = new THREE.Mesh(geo, mat);
            mesh.renderOrder = 4;
            grp.add(mesh);
        }

        return grp;
    }

    // =========================================================================
    // 2. CAMPUS PARCEL & RIGHT-OF-WAY SURVEY BOUNDARY LAYER (#toggle-parcels)
    // =========================================================================
    _buildParcelBoundaries(campusBuildings) {
        const grp = new THREE.Group();
        grp.name = 'CampusParcelSurveyBoundaries';
        const getH = (x, z) => this.groundFoundry.getTerrainHeight(x, z);

        const linePositions = [];
        const setbackPositions = [];
        const monumentPos = [], monumentNorm = [], monumentIdx = [];

        const addSurveyPolygon = (polyPts, isPrimaryCampus = true, insetMeters = 0) => {
            if (!polyPts || polyPts.length < 3) return;
            const n = polyPts.length;

            let cx = 0, cz = 0;
            for (const [px, pz] of polyPts) {
                cx += px;
                cz += pz;
            }
            cx /= n;
            cz /= n;

            const offsetPoly = polyPts.map(([px, pz]) => {
                const dx = px - cx;
                const dz = pz - cz;
                const len = Math.hypot(dx, dz) || 1;
                return [px + (dx / len) * insetMeters, pz + (dz / len) * insetMeters];
            });

            for (let i = 0; i < n; i++) {
                const [ax, az] = offsetPoly[i];
                const [bx, bz] = offsetPoly[(i + 1) % n];
                const segLen = Math.hypot(bx - ax, bz - az);
                const steps = Math.max(1, Math.ceil(segLen / 3.0));

                for (let s = 0; s < steps; s++) {
                    const t0 = s / steps;
                    const t1 = (s + 1) / steps;
                    const x0 = ax + (bx - ax) * t0;
                    const z0 = az + (bz - az) * t0;
                    const x1 = ax + (bx - ax) * t1;
                    const z1 = az + (bz - az) * t1;

                    if (isPrimaryCampus) {
                        linePositions.push(
                            x0, getH(x0, z0) + 0.08, z0,
                            x1, getH(x1, z1) + 0.08, z1
                        );
                    } else if (s % 2 === 0) {
                        setbackPositions.push(
                            x0, getH(x0, z0) + 0.075, z0,
                            x1, getH(x1, z1) + 0.075, z1
                        );
                    }
                }

                if (isPrimaryCampus) {
                    const r = 0.32;
                    const my = getH(ax, az) + 0.09;
                    const base = monumentPos.length / 3;
                    monumentPos.push(
                        ax, my, az - r,
                        ax + r, my, az,
                        ax, my, az + r,
                        ax - r, my, az
                    );
                    monumentNorm.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
                    monumentIdx.push(base, base + 2, base + 1, base, base + 3, base + 2);
                }
            }
        };

        // Strictly Chelan County Campus Right-of-Way Parcel Blocks (in 401 street-aligned frame -> world)
        const toW = local401ToWorld;

        const campusRowBlocks = [
            // Historic Courthouse 350 Parcel (Washington St, Orondo Ave, Courthouse South Lawn, 401 lot line)
            { name: 'PARCEL 350 • COURTHOUSE BLOCK', pts: [toW(66.5, -22.5), toW(122.8, -22.5), toW(122.8, 24.4), toW(66.5, 24.4)] },
            // Law & Justice 401 Parcel
            { name: 'PARCEL 401 • LAW & JUSTICE', pts: [toW(-12.5, -21.5), toW(66.5, -21.5), toW(66.5, 24.4), toW(-12.5, 24.4)] },
            // Regional Justice West Wing Parcel (King St to 401)
            { name: 'PARCEL 413–415 • WEST WING', pts: [toW(-62.6, -21.5), toW(-12.5, -21.5), toW(-12.5, 24.4), toW(-62.6, 24.4)] },
            // County Administration 400 Douglas Parcel
            { name: 'PARCEL 400 • ADMINISTRATION', pts: [toW(-18.0, 38.8), toW(24.4, 38.8), toW(24.4, 87.5), toW(-18.0, 87.5)] },
            // Natural Resources & WSU Extension 410/411/412 Parcel
            { name: 'PARCEL 411/412 • NATURAL RESOURCES', pts: [toW(-61.3, 38.8), toW(-18.0, 38.8), toW(-18.0, 75.5), toW(-61.3, 75.5)] },
            // Community Development 316 & Juvenile Justice 300 Parcel
            { name: 'PARCEL 300/316 • CIVIC & JUVENILE', pts: [toW(38.6, 38.8), toW(123.0, 38.8), toW(123.0, 115.6), toW(38.6, 115.6)] },
            // 428 Orondo Ave Campus Annex Parcel (strictly hugging the 428 Annex lot on Orondo Ave)
            { name: 'PARCEL 428 • CAMPUS ANNEX', pts: [toW(95.5, 144.0), toW(123.0, 144.0), toW(123.0, 173.0), toW(95.5, 173.0)] }
        ];

        for (const blk of campusRowBlocks) {
            addSurveyPolygon(blk.pts, true, 0);
        }

        // Building structural setback envelopes for our 8 Chelan County Campus buildings only
        for (const bldg of campusBuildings) {
            addSurveyPolygon(bldg.footprint, false, 1.8);
        }

        if (linePositions.length > 0) {
            const lineGeo = new THREE.BufferGeometry();
            lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
            this.parcelLineMat = new THREE.LineBasicMaterial({
                color: '#0284c7',
                transparent: true,
                opacity: 0.78,
                depthTest: true
            });
            const lines = new THREE.LineSegments(lineGeo, this.parcelLineMat);
            lines.renderOrder = 4;
            grp.add(lines);
        }

        if (setbackPositions.length > 0) {
            const sbGeo = new THREE.BufferGeometry();
            sbGeo.setAttribute('position', new THREE.Float32BufferAttribute(setbackPositions, 3));
            const sbMat = new THREE.LineBasicMaterial({
                color: '#38bdf8',
                transparent: true,
                opacity: 0.48,
                depthTest: true
            });
            const sbLines = new THREE.LineSegments(sbGeo, sbMat);
            sbLines.renderOrder = 4;
            grp.add(sbLines);
        }

        if (monumentPos.length > 0) {
            const monGeo = new THREE.BufferGeometry();
            monGeo.setAttribute('position', new THREE.Float32BufferAttribute(monumentPos, 3));
            monGeo.setAttribute('normal', new THREE.Float32BufferAttribute(monumentNorm, 3));
            monGeo.setIndex(monumentIdx);
            const monMat = new THREE.MeshBasicMaterial({
                color: '#f59e0b',
                side: THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: -5,
                polygonOffsetUnits: -5
            });
            const monMesh = new THREE.Mesh(monGeo, monMat);
            monMesh.renderOrder = 5;
            grp.add(monMesh);
        }

        return grp;
    }

    // =========================================================================
    // 3. HIGH-PRECISION MAJOR & MINOR TOPOGRAPHIC CONTOURS (#toggle-contours)
    // =========================================================================
    _buildHighPrecisionContours() {
        const grp = new THREE.Group();
        grp.name = 'HighPrecisionTopographicContours';

        const range = 186;
        const step = 2.0; // 2.0m high-resolution marching-squares grid around the campus
        const cols = Math.floor((range * 2) / step) + 1;
        const heights = new Float32Array(cols * cols);

        let minY = Infinity;
        let maxY = -Infinity;
        for (let iz = 0; iz < cols; iz++) {
            const z = -range + iz * step;
            const rowOff = iz * cols;
            for (let ix = 0; ix < cols; ix++) {
                const x = -range + ix * step;
                const h = this.groundFoundry.getTerrainHeight(x, z);
                heights[rowOff + ix] = h;
                if (h < minY) minY = h;
                if (h > maxY) maxY = h;
            }
        }

        const exag = this.groundFoundry.exaggeration || 1.0;
        const datumASL = this.groundFoundry.terrainData?.datum || 223.51;
        const minorInterval = 0.5 * exag; // 0.5m (~1.64 ft) minor contours
        const majorEvery = 5; // Every 5th contour = 2.5m (~8.2 ft) bold index contour

        const minorPositions = [];
        const majorPositions = [];
        const calloutCandidates = new Map();

        const startIdx = Math.ceil(minY / minorInterval);
        const endIdx = Math.floor(maxY / minorInterval);

        for (let k = startIdx; k <= endIdx; k++) {
            const targetY = k * minorInterval;
            const isMajor = (k % majorEvery === 0);
            const outArr = isMajor ? majorPositions : minorPositions;
            const yLift = isMajor ? 0.048 : 0.036;

            for (let iz = 0; iz < cols - 1; iz++) {
                const z0 = -range + iz * step;
                const z1 = z0 + step;
                const r0 = iz * cols;
                const r1 = (iz + 1) * cols;

                for (let ix = 0; ix < cols - 1; ix++) {
                    const y00 = heights[r0 + ix];
                    const y10 = heights[r0 + ix + 1];
                    const y01 = heights[r1 + ix];
                    const y11 = heights[r1 + ix + 1];

                    const cMin = Math.min(y00, y10, y01, y11);
                    const cMax = Math.max(y00, y10, y01, y11);
                    if (targetY < cMin || targetY > cMax || cMax - cMin < 1e-4) continue;
                    if (cMax - cMin > 2.4 * exag) continue;

                    const x0 = -range + ix * step;
                    const x1 = x0 + step;
                    const pts = [];

                    if ((y00 - targetY) * (y10 - targetY) <= 0 && y00 !== y10) {
                        const t = (targetY - y00) / (y10 - y00);
                        if (t >= 0 && t <= 1) pts.push([x0 + t * step, targetY + yLift, z0]);
                    }
                    if ((y10 - targetY) * (y11 - targetY) <= 0 && y10 !== y11) {
                        const t = (targetY - y10) / (y11 - y10);
                        if (t >= 0 && t <= 1) pts.push([x1, targetY + yLift, z0 + t * step]);
                    }
                    if ((y01 - targetY) * (y11 - targetY) <= 0 && y01 !== y11) {
                        const t = (targetY - y01) / (y11 - y01);
                        if (t >= 0 && t <= 1) pts.push([x0 + t * step, targetY + yLift, z1]);
                    }
                    if ((y00 - targetY) * (y01 - targetY) <= 0 && y00 !== y01) {
                        const t = (targetY - y00) / (y01 - y00);
                        if (t >= 0 && t <= 1) pts.push([x0, targetY + yLift, z0 + t * step]);
                    }

                    if (pts.length >= 2) {
                        outArr.push(
                            pts[0][0], pts[0][1], pts[0][2],
                            pts[1][0], pts[1][1], pts[1][2]
                        );

                        if (isMajor && !calloutCandidates.has(k)) {
                            const mx = (pts[0][0] + pts[1][0]) * 0.5;
                            const mz = (pts[0][2] + pts[1][2]) * 0.5;
                            const rad = Math.hypot(mx, mz - 20);
                            if (rad > 68 && rad < 155 && !isInsideCustomCampusCorridor(mx, mz)) {
                                const segDx = pts[1][0] - pts[0][0];
                                const segDz = pts[1][2] - pts[0][2];
                                if (Math.hypot(segDx, segDz) > 0.8) {
                                    calloutCandidates.set(k, {
                                        x: mx,
                                        y: targetY + 0.08,
                                        z: mz,
                                        dx: segDx,
                                        dz: segDz,
                                        unscaledElev: k * 0.5
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        if (minorPositions.length > 0) {
            const minorGeo = new THREE.BufferGeometry();
            minorGeo.setAttribute('position', new THREE.Float32BufferAttribute(minorPositions, 3));
            this.minorContourMat = new THREE.LineBasicMaterial({
                color: '#d97706',
                transparent: true,
                opacity: 0.25
            });
            const minorLines = new THREE.LineSegments(minorGeo, this.minorContourMat);
            minorLines.name = 'MinorTopoContours_0_5m';
            grp.add(minorLines);
        }

        if (majorPositions.length > 0) {
            const majorGeo = new THREE.BufferGeometry();
            majorGeo.setAttribute('position', new THREE.Float32BufferAttribute(majorPositions, 3));
            this.majorContourMat = new THREE.LineBasicMaterial({
                color: '#b45309',
                transparent: true,
                opacity: 0.64
            });
            const majorLines = new THREE.LineSegments(majorGeo, this.majorContourMat);
            majorLines.name = 'MajorIndexContours_2_5m';
            grp.add(majorLines);
        }

        for (const cand of calloutCandidates.values()) {
            const aslMeters = datumASL + cand.unscaledElev;
            const aslFeet = Math.round(aslMeters * 3.28084);
            const labelText = `${aslFeet} FT (${aslMeters.toFixed(1)}m)`;

            const tex = this._makeTextDecalTexture(labelText, {
                width: 512,
                height: 112,
                fontSize: 44,
                textColor: '#fef3c7',
                haloColor: 'rgba(15, 23, 42, 0.95)',
                bgPillColor: 'rgba(15, 23, 42, 0.84)',
                borderColor: 'rgba(251, 191, 36, 0.78)'
            });

            const mat = new THREE.MeshBasicMaterial({
                map: tex,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -7,
                polygonOffsetUnits: -7
            });

            let dx = cand.dx;
            let dz = cand.dz;
            if (dx < 0) {
                dx = -dx;
                dz = -dz;
            }
            const angle = Math.atan2(dz, dx);

            const plaque = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 1.8), mat);
            plaque.rotation.order = 'YXZ';
            plaque.rotation.x = -Math.PI / 2;
            plaque.rotation.y = -angle;
            plaque.position.set(cand.x, cand.y, cand.z);
            plaque.renderOrder = 6;
            grp.add(plaque);
        }

        return grp;
    }
}
