import * as THREE from 'three';

/**
 * FloorCutawayFoundry — Interactive 3D Floor Band Highlighting & Architectural Section Cutaway
 *
 * Allows users to inspect any individual story (Floor 1 .. Floor N) of the 8 Chelan County
 * campus buildings via:
 *   1. Exterior 3D luminous floor-band collar aligned to the building's exact story datum
 *      (accounting for split-level hillside basements on Buildings 350, 401, 400, and 316).
 *   2. Optional WebGL horizontal section-plane cutaway (`renderer.localClippingEnabled = true`)
 *      that slices upper stories away while strictly preserving surrounding streets, sidewalks,
 *      curbs, and landscaped plazas.
 *   3. Clean architectural floor-plate schematic (structural bay grid, corridor circulation,
 *      elevator/stair core linework, and perimeter wall pochés — zero decorative props).
 */
export class FloorCutawayFoundry {
    constructor(scene, getTerrainHeightFn = null) {
        this.scene = scene;
        this.getTerrainHeight = typeof getTerrainHeightFn === 'function' ? getTerrainHeightFn : null;
        this.rootGroup = new THREE.Group();
        this.rootGroup.name = 'InteractiveFloorCutawayGroup';
        this.rootGroup.visible = false;
        this.scene.add(this.rootGroup);

        this.activeBuildingId = null;
        this.activeFloorNumber = null;
        this.activeZoneId = null;
        this.cutawayEnabled = true;
        this._clippedMeshes = [];
        this._hiddenObjects = [];
        this._disposableTextures = [];
        this._sharedFloorTextures = null;
        this._activeFloorAxis = null;
        this._zonePulseMeshes = [];
        this.clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000);
    }

    /**
     * Pulses the selected department zone outline using the same sine scale pulse
     * (3.2 rad/s, +/-4%) as the campus building selection ring.
     */
    updateAnimation(elapsed, reducedMotion = false) {
        if (this._zonePulseMeshes.length === 0) return;
        const s = reducedMotion ? 1 : 1 + Math.sin(elapsed * 3.2) * 0.04;
        for (const mesh of this._zonePulseMeshes) {
            mesh.scale.set(s, 1, s);
        }
    }

    /**
     * Builds the glowing cyan outline (matching the building selection ring) around a selected zone.
     * The ribbon geometry is centered on the zone centroid so scaling pulses around the zone center.
     */
    _addZoneSelectionPulse(poly, zoneY, zoneId) {
        if (!Array.isArray(poly) || poly.length < 3) return;
        const [cx, cz] = this._computePolygonCentroid(poly);
        const half = 0.3;
        const positions = [];
        for (let i = 0; i < poly.length; i++) {
            const a = poly[i];
            const b = poly[(i + 1) % poly.length];
            const dx = b[0] - a[0];
            const dz = b[1] - a[1];
            const len = Math.hypot(dx, dz);
            if (len < 1e-6) continue;
            const ux = dx / len;
            const uz = dz / len;
            const nx = -uz * half;
            const nz = ux * half;
            // Extend each edge by half its width so adjacent edges overlap cleanly at corners
            const ax = a[0] - cx - ux * half;
            const az = a[1] - cz - uz * half;
            const bx = b[0] - cx + ux * half;
            const bz = b[1] - cz + uz * half;
            positions.push(
                ax + nx, 0, az + nz,
                ax - nx, 0, az - nz,
                bx - nx, 0, bz - nz,
                ax + nx, 0, az + nz,
                bx - nx, 0, bz - nz,
                bx + nx, 0, bz + nz
            );
        }
        if (positions.length === 0) return;

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const mat = new THREE.MeshBasicMaterial({
            color: '#38bdf8',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
            depthTest: false,
            depthWrite: false
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = `CutawayDepartmentZonePulse_${zoneId}`;
        mesh.position.set(cx, zoneY + 0.08, cz);
        mesh.renderOrder = 22;
        this.rootGroup.add(mesh);
        this._zonePulseMeshes.push(mesh);
    }

    /**
     * Determines whether Floor 1 of a campus building is a split-level basement / walk-out
     * below the Washington/Douglas road datum.
     */
    isSplitLevelBasementBuilding(bldg) {
        if (!bldg) return false;
        if (
            bldg.id === 'courthouse-350' ||
            bldg.id === 'regional-jail-east' ||
            bldg.id === 'building-400' ||
            bldg.id === 'building-316'
        ) {
            return true;
        }
        const firstLevel = String(bldg.departments?.[0]?.level || '').toLowerCase();
        return firstLevel.includes('basement') || firstLevel.includes('below road');
    }

    /**
     * Computes world-space [minY, maxY] elevation bands and labels for each story 1..floors.
     */
    getBuildingFloorBands(bldg, bldgGroup, baseTy = 0) {
        const totalFloors = Math.max(1, parseInt(bldg?.floors, 10) || 1);
        const hasBasement = this.isSplitLevelBasementBuilding(bldg) && totalFloors >= 2;
        const bands = [];

        if (hasBasement) {
            const basementH = 4.2;
            const aboveFloors = Math.max(1, totalFloors - 1);
            const totalAboveH = Math.max(aboveFloors * 4.0, (bldg.height || totalFloors * 4.2) - basementH);
            const storyH = totalAboveH / aboveFloors;

            bands.push({
                floor: 1,
                shortLabel: 'F1',
                title: 'Floor 1',
                minY: baseTy - basementH,
                maxY: baseTy,
                isBasement: true
            });

            for (let f = 2; f <= totalFloors; f++) {
                const idxAbove = f - 2;
                const minY = baseTy + idxAbove * storyH;
                const maxY = baseTy + (idxAbove + 1) * storyH;
                bands.push({
                    floor: f,
                    shortLabel: `F${f}`,
                    title: `Floor ${f}`,
                    minY,
                    maxY,
                    isBasement: false
                });
            }
        } else {
            const totalH = Math.max(3.8, bldg?.height || totalFloors * 4.2);
            const storyH = totalH / totalFloors;
            for (let f = 1; f <= totalFloors; f++) {
                const minY = baseTy + (f - 1) * storyH;
                const maxY = baseTy + f * storyH;
                bands.push({
                    floor: f,
                    shortLabel: `F${f}`,
                    title: `Floor ${f}`,
                    minY,
                    maxY,
                    isBasement: false
                });
            }
        }

        return bands;
    }

    /**
     * Maps a department directory entry (`level`, `suite`) to a 1-based floor number.
     */
    parseDepartmentFloor(dept, bldg) {
        const totalFloors = Math.max(1, parseInt(bldg?.floors, 10) || 1);
        if (totalFloors <= 1 || !dept) return 1;

        const levelStr = String(dept.level || '');
        const suiteStr = String(dept.suite || '');
        const combined = `${levelStr} ${suiteStr}`;

        const explicitFloor = combined.match(/(?:floor|level)\s*(\d+)/i);
        if (explicitFloor) {
            return THREE.MathUtils.clamp(parseInt(explicitFloor[1], 10), 1, totalFloors);
        }

        if (/basement|lower|below\s*road/i.test(combined)) {
            return 1;
        }

        const suiteDigits = suiteStr.match(/\b([1-9])\d{2}\b/);
        if (suiteDigits) {
            return THREE.MathUtils.clamp(parseInt(suiteDigits[1], 10), 1, totalFloors);
        }

        return 1;
    }

    /**
     * Restores all previously clipped building materials and clears active floor highlight meshes.
     */
    clear() {
        for (let i = 0; i < this._clippedMeshes.length; i++) {
            const rec = this._clippedMeshes[i];
            if (rec.mesh) {
                rec.mesh.material = rec.origMaterial;
                // Dispose cloned temporary materials
                const clonedList = Array.isArray(rec.clonedMaterial)
                    ? rec.clonedMaterial
                    : [rec.clonedMaterial];
                for (const cm of clonedList) {
                    if (cm && cm !== rec.origMaterial && typeof cm.dispose === 'function') {
                        cm.dispose();
                    }
                }
            }
        }
        this._clippedMeshes = [];

        for (let i = 0; i < this._hiddenObjects.length; i++) {
            const rec = this._hiddenObjects[i];
            if (rec.obj) rec.obj.visible = rec.origVisible;
        }
        this._hiddenObjects = [];

        while (this.rootGroup.children.length > 0) {
            const child = this.rootGroup.children[0];
            this.rootGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((m) => m && m.dispose && m.dispose());
            }
        }

        for (let i = 0; i < this._disposableTextures.length; i++) {
            const tex = this._disposableTextures[i];
            if (tex && typeof tex.dispose === 'function') tex.dispose();
        }
        this._disposableTextures = [];
        this._zonePulseMeshes = [];

        this.rootGroup.visible = false;
        this.activeBuildingId = null;
        this.activeFloorNumber = null;
        this.activeZoneId = null;
    }

    /**
     * Activates (or clears when `floorNumber === null`) the 3D floor highlight & section cutaway.
     */
    setActiveFloor(bldg, bldgGroup, baseTy, floorNumber = null, cutawayEnabled = true, activeZoneId = null) {
        this.clear();
        this.cutawayEnabled = Boolean(cutawayEnabled);

        if (!bldg || !bldgGroup || floorNumber === null || floorNumber === undefined) {
            return null;
        }

        const bands = this.getBuildingFloorBands(bldg, bldgGroup, baseTy);
        const band = bands.find((b) => b.floor === floorNumber) || bands[0];
        if (!band) return null;

        this.activeBuildingId = bldg.id;
        this.activeFloorNumber = band.floor;
        this.activeZoneId = activeZoneId || null;

        const fp = this._getCleanFootprint(bldg.footprint);
        if (fp.length < 3) return band;

        // 1. Exterior 3D Luminous Floor Highlight Band around footprint
        this._buildExteriorFloorBand(fp, band);

        // 2. Optional Horizontal Section Cutaway + Architectural Floor-Plate Schematic
        if (this.cutawayEnabled) {
            const schematicY = this._computeFloorSchematicY(bldg, fp, baseTy, band);
            // Slice flush beneath the active floor-plate slab so multi-box wing/pavilion seams
            // never protrude above the floor as interior divider walls.
            const clipWorldY = schematicY - 0.02;

            this.clipPlane.set(new THREE.Vector3(0, -1, 0), clipWorldY);
            this._applySafeBuildingClipping(bldg, bldgGroup, fp, baseTy, clipWorldY);
            this._buildArchitecturalFloorPlateSchematic(fp, schematicY, band, bldg, this.activeZoneId);
        }

        this.rootGroup.visible = true;
        return band;
    }

    _getMaxFootprintTerrainY(fp, fallbackY = 0) {
        if (!this.getTerrainHeight || !Array.isArray(fp) || fp.length === 0) {
            return fallbackY;
        }
        let maxY = fallbackY;
        let sumX = 0;
        let sumZ = 0;
        const n = fp.length;
        for (let i = 0; i < n; i++) {
            const [x0, z0] = fp[i];
            const [x1, z1] = fp[(i + 1) % n];
            sumX += x0;
            sumZ += z0;
            const y0 = this.getTerrainHeight(x0, z0);
            if (Number.isFinite(y0) && y0 > maxY) maxY = y0;
            const ym = this.getTerrainHeight((x0 + x1) * 0.5, (z0 + z1) * 0.5);
            if (Number.isFinite(ym) && ym > maxY) maxY = ym;
        }
        const yc = this.getTerrainHeight(sumX / n, sumZ / n);
        if (Number.isFinite(yc) && yc > maxY) maxY = yc;
        return maxY;
    }

    _computeFloorSchematicY(bldg, fp, baseTy, band) {
        const defaultY = band.isBasement
            ? baseTy + 0.24
            : Math.max(band.minY + 0.14, baseTy + 0.24);
        if (!bldg) return defaultY;

        if (bldg.id === 'regional-jail-east') {
            const maxGroundY = this._getMaxFootprintTerrainY(fp, baseTy);
            if (band.floor === 1) return Math.max(baseTy + 0.24, maxGroundY + 0.22);
            if (band.floor === 2) return Math.max(baseTy + 1.15, maxGroundY + 0.90);
            if (band.floor === 3) return Math.max(band.minY + 0.14, baseTy + 4.34);
            if (band.floor === 4) return Math.max(band.minY + 0.14, baseTy + 8.54);
            if (band.floor === 5) return Math.max(band.minY + 0.75, baseTy + 13.35);
            return defaultY;
        }

        if (bldg.id === 'regional-jail-west') {
            const maxGroundY = this._getMaxFootprintTerrainY(fp, baseTy);
            if (band.floor === 1) {
                return Math.min(band.maxY - 0.85, Math.max(band.minY + 0.24, maxGroundY + 0.30));
            }
            return Math.max(band.minY + 0.14, maxGroundY + 0.30);
        }

        if (bldg.id === 'building-400') {
            const maxGroundY = this._getMaxFootprintTerrainY(fp, baseTy);
            if (band.floor === 1) return Math.max(baseTy + 0.68, maxGroundY + 0.24);
            if (band.floor === 2) return Math.max(baseTy + 0.92, maxGroundY + 0.90);
            if (band.floor === 3) return Math.max(band.minY + 0.24, baseTy + 4.44);
            return defaultY;
        }

        if (bldg.id === 'building-411-412') {
            const maxGroundY = this._getMaxFootprintTerrainY(fp, baseTy);
            return Math.max(baseTy + 0.44, maxGroundY + 0.28);
        }

        return defaultY;
    }

    _getCleanFootprint(rawFp) {
        if (!Array.isArray(rawFp)) return [];
        const pts = [];
        for (let i = 0; i < rawFp.length; i++) {
            const p = rawFp[i];
            if (!Array.isArray(p) || p.length < 2) continue;
            if (pts.length > 0) {
                const prev = pts[pts.length - 1];
                if (Math.hypot(p[0] - prev[0], p[1] - prev[1]) < 0.05) continue;
            }
            pts.push([p[0], p[1]]);
        }
        if (pts.length > 2) {
            const first = pts[0];
            const last = pts[pts.length - 1];
            if (Math.hypot(first[0] - last[0], first[1] - last[1]) < 0.05) {
                pts.pop();
            }
        }
        return pts;
    }

    _offsetPolygonOutward(fp, offsetDist = 0.28) {
        const n = fp.length;
        if (n < 3) return fp;

        // Signed area in XZ plane to determine winding orientation
        let area2 = 0;
        for (let i = 0; i < n; i++) {
            const [x0, z0] = fp[i];
            const [x1, z1] = fp[(i + 1) % n];
            area2 += x0 * z1 - x1 * z0;
        }
        const sign = area2 >= 0 ? 1 : -1;

        const out = [];
        for (let i = 0; i < n; i++) {
            const prev = fp[(i - 1 + n) % n];
            const curr = fp[i];
            const next = fp[(i + 1) % n];

            let dx1 = curr[0] - prev[0];
            let dz1 = curr[1] - prev[1];
            const l1 = Math.hypot(dx1, dz1) || 1;
            dx1 /= l1;
            dz1 /= l1;

            let dx2 = next[0] - curr[0];
            let dz2 = next[1] - curr[1];
            const l2 = Math.hypot(dx2, dz2) || 1;
            dx2 /= l2;
            dz2 /= l2;

            // Outward edge normals
            const nx1 = dz1 * sign;
            const nz1 = -dx1 * sign;
            const nx2 = dz2 * sign;
            const nz2 = -dx2 * sign;

            let bx = nx1 + nx2;
            let bz = nz1 + nz2;
            const bl = Math.hypot(bx, bz);
            if (bl < 1e-4) {
                out.push([curr[0] + nx1 * offsetDist, curr[1] + nz1 * offsetDist]);
            } else {
                bx /= bl;
                bz /= bl;
                const dot = Math.max(0.45, bx * nx1 + bz * nz1);
                const miter = Math.min(offsetDist * 1.85, offsetDist / dot);
                out.push([curr[0] + bx * miter, curr[1] + bz * miter]);
            }
        }
        return out;
    }

    _buildExteriorFloorBand(fp, band) {
        const outerRing = this._offsetPolygonOutward(fp, 0.34);
        const n = outerRing.length;
        const y0 = band.minY;
        const y1 = band.maxY;

        const positions = [];
        const indices = [];
        const railVerts = [];

        for (let i = 0; i < n; i++) {
            const [ax, az] = outerRing[i];
            const [bx, bz] = outerRing[(i + 1) % n];
            const base = (positions.length / 3);
            positions.push(
                ax, y0, az,
                bx, y0, bz,
                bx, y1, bz,
                ax, y1, az
            );
            indices.push(base, base + 1, base + 2, base, base + 2, base + 3);

            // Bottom & top perimeter highlight rails + corner verticals
            railVerts.push(ax, y0, az, bx, y0, bz);
            railVerts.push(ax, y1, az, bx, y1, bz);
            railVerts.push(ax, y0, az, ax, y1, az);
        }

        const bandGeo = new THREE.BufferGeometry();
        bandGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        bandGeo.setIndex(indices);
        bandGeo.computeVertexNormals();

        const bandMat = new THREE.MeshBasicMaterial({
            color: '#38bdf8',
            transparent: true,
            opacity: 0.22,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: !band.isBasement
        });
        const bandMesh = new THREE.Mesh(bandGeo, bandMat);
        bandMesh.name = 'FloorHighlightCollarMesh';
        bandMesh.renderOrder = 16;
        this.rootGroup.add(bandMesh);

        const railGeo = new THREE.BufferGeometry();
        railGeo.setAttribute('position', new THREE.Float32BufferAttribute(railVerts, 3));
        const railMat = new THREE.LineBasicMaterial({
            color: '#7dd3fc',
            transparent: true,
            opacity: 0.96,
            depthTest: !band.isBasement
        });
        const railLines = new THREE.LineSegments(railGeo, railMat);
        railLines.name = 'FloorHighlightPerimeterRails';
        railLines.renderOrder = 17;
        this.rootGroup.add(railLines);
    }

    /**
     * Applies `this.clipPlane` ONLY to architectural building meshes inside `bldgGroup`,
     * strictly excluding `WashingtonStreetCorridor` roads, sidewalks, curbs, and plazas.
     */
    _applySafeBuildingClipping(bldg, bldgGroup, fp, baseTy, clipWorldY) {
        let fpMinX = Infinity;
        let fpMaxX = -Infinity;
        let fpMinZ = Infinity;
        let fpMaxZ = -Infinity;
        for (const [x, z] of fp) {
            if (x < fpMinX) fpMinX = x;
            if (x > fpMaxX) fpMaxX = x;
            if (z < fpMinZ) fpMinZ = z;
            if (z > fpMaxZ) fpMaxZ = z;
        }
        const fpSpanX = fpMaxX - fpMinX;
        const fpSpanZ = fpMaxZ - fpMinZ;
        const margin = 16.5;

        bldgGroup.updateMatrixWorld(true);
        const worldBox = new THREE.Box3();

        bldgGroup.traverse((obj) => {
            if ((!obj.isMesh && !obj.isLineSegments) || !obj.geometry) return;

            // Hide all explicitly tagged windows, window frames/mullions, skylights, and door covers/vestibules on cutaway
            if (obj.userData?.hideOnCutaway) {
                this._hiddenObjects.push({ obj, origVisible: obj.visible });
                obj.visible = false;
                return;
            }

            if (!obj.isMesh) return;

            if (!obj.geometry.boundingBox) {
                obj.geometry.computeBoundingBox();
            }
            worldBox.copy(obj.geometry.boundingBox).applyMatrix4(obj.matrixWorld);

            // Hide animated flags whose flagpole hoist sits above the cutaway plane
            if (obj.userData?.isAnimatedFlag) {
                if (worldBox.min.y > clipWorldY - 0.25) {
                    this._hiddenObjects.push({ obj, origVisible: obj.visible });
                    obj.visible = false;
                }
                return;
            }

            // 1. Never clip or strip ground-level slabs, curbs, sidewalks, lawns, or road stripes,
            //    while still stripping textures on tall below-grade basement building plinths.
            const meshHeight = worldBox.max.y - worldBox.min.y;
            const isBasementBuildingWall = Boolean(obj.userData?.isSelectableBuilding) && meshHeight > 1.2;
            if (!isBasementBuildingWall && worldBox.max.y <= baseTy + 0.68) return;

            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            if (mats.some((m) => m && m.userData?.isCampusGrass)) return;
            if (mats.some((m) => m && m.polygonOffset === true) && worldBox.max.y <= baseTy + 0.95) return;

            // 2. Never clip wide campus corridor meshes (e.g. WashingtonStreetCorridor on 401)
            const meshSpanX = worldBox.max.x - worldBox.min.x;
            const meshSpanZ = worldBox.max.z - worldBox.min.z;
            if (meshSpanX > fpSpanX + 18.0 || meshSpanZ > fpSpanZ + 18.0) return;

            const cx = (worldBox.min.x + worldBox.max.x) * 0.5;
            const cz = (worldBox.min.z + worldBox.max.z) * 0.5;
            if (
                cx < fpMinX - margin ||
                cx > fpMaxX + margin ||
                cz < fpMinZ - margin ||
                cz > fpMaxZ + margin
            ) {
                return;
            }

            // Hide any remaining architectural glass / night-lit window panes during cutaway
            if (
                mats.some(
                    (m) =>
                        m &&
                        (m.userData?.isNightLitGlass === true ||
                            (m.emissiveMap && (m.metalness ?? 0) >= 0.5 && (m.roughness ?? 1) <= 0.25) ||
                            (m.transparent === true && (m.opacity ?? 1) < 0.92))
                )
            ) {
                this._hiddenObjects.push({ obj, origVisible: obj.visible });
                obj.visible = false;
                return;
            }

            const needsClip = worldBox.max.y > clipWorldY + 0.02;
            const maquetteBase = new THREE.Color('#e6ebf2');
            const bldgTint = new THREE.Color(bldg?.color || '#cbd5e1');
            const defaultCutawayColor = maquetteBase.clone().lerp(bldgTint, 0.14);

            // Clone material(s) per mesh into a clean, texture-free architectural maquette finish during cutaway
            // so facade brick/granite/window textures never clutter the 3D floor-plan schematic.
            const clonedMats = mats.map((m) => {
                if (!m) return m;
                const c = m.clone();
                const hadColorMap = Boolean(c.map);
                c.map = null;
                c.bumpMap = null;
                c.normalMap = null;
                c.roughnessMap = null;
                c.metalnessMap = null;
                c.aoMap = null;
                c.alphaMap = null;
                c.emissiveMap = null;
                c.lightMap = null;

                if (c.color) {
                    const isPureWhite = c.color.r > 0.97 && c.color.g > 0.97 && c.color.b > 0.97;
                    if (hadColorMap && isPureWhite) {
                        c.color.copy(defaultCutawayColor);
                    } else {
                        c.color.lerp(maquetteBase, 0.68);
                    }
                }
                if (c.emissive) {
                    c.emissive.setHex(0x000000);
                    c.emissiveIntensity = 0;
                }
                if ('roughness' in c) c.roughness = 0.86;
                if ('metalness' in c) c.metalness = 0.04;

                if (needsClip) {
                    c.clippingPlanes = [this.clipPlane];
                    c.clipShadows = true;
                    c.side = THREE.DoubleSide;
                }
                c.needsUpdate = true;
                return c;
            });

            const assigned = Array.isArray(obj.material) ? clonedMats : clonedMats[0];
            this._clippedMeshes.push({
                mesh: obj,
                origMaterial: obj.material,
                clonedMaterial: assigned
            });
            obj.material = assigned;
        });
    }

    _computeFootprintAxis(fp) {
        if (!Array.isArray(fp) || fp.length < 2) {
            return { refX: 0, refZ: 0, ux: 0.80425, uz: 0.59429 };
        }
        let bestLen = -1;
        let ux = 0.80425;
        let uz = 0.59429;
        let refX = fp[0][0];
        let refZ = fp[0][1];
        for (let i = 0; i < fp.length; i++) {
            const a = fp[i];
            const b = fp[(i + 1) % fp.length];
            const dx = b[0] - a[0];
            const dz = b[1] - a[1];
            const len = Math.hypot(dx, dz);
            if (len > bestLen) {
                bestLen = len;
                ux = dx / (len || 1);
                uz = dz / (len || 1);
                refX = a[0];
                refZ = a[1];
            }
        }
        return { refX, refZ, ux, uz };
    }

    _applyPlanarFloorUVs(geometry, axis, scaleMeters = 4.0, plateY = 0) {
        if (!geometry || !geometry.attributes?.position) return;
        const pos = geometry.attributes.position;
        const norm = geometry.attributes.normal;
        const count = pos.count;
        const uvs = new Float32Array(count * 2);
        const { refX, refZ, ux, uz } = axis || { refX: 0, refZ: 0, ux: 0.80425, uz: 0.59429 };
        const invScale = 1 / Math.max(0.25, scaleMeters);

        for (let i = 0; i < count; i++) {
            const vx = pos.getX(i);
            const vy = pos.getY(i);
            const vz = pos.getZ(i);
            const dx = vx - refX;
            const dz = vz - refZ;
            const along = dx * ux + dz * uz;
            const across = -dx * uz + dz * ux;
            if (norm && Math.abs(norm.getY(i)) < 0.45) {
                uvs[i * 2] = along * invScale;
                uvs[i * 2 + 1] = (vy - plateY) * invScale;
            } else {
                uvs[i * 2] = along * invScale;
                uvs[i * 2 + 1] = across * invScale;
            }
        }
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    }

    _getFloorTextureKey(bldgId, floorNum, zoneId = null) {
        if (zoneId) {
            if (
                zoneId === 'chambers-400-f2' ||
                zoneId === 'courtroom-1-f4-vestibule' ||
                zoneId === 'courtroom-2-f4-orondo' ||
                zoneId === 'district-court-judges-f4-middle' ||
                zoneId === 'superior-court-401-f5'
            ) {
                return 'oakParquet';
            }
            if (
                zoneId === 'rjc-401-f2' ||
                zoneId === 'rjc-401-f3' ||
                zoneId === 'rjc-401-f4' ||
                zoneId === 'rjc-west-f1' ||
                zoneId === 'rjc-west-f2' ||
                zoneId === 'rjc-411-front'
            ) {
                return 'securityConcrete';
            }
            if (zoneId === 'sheriff-401-f1' || zoneId === 'b316-f1') {
                return 'terrazzoTile';
            }
            if (
                zoneId === 'county-clerk-f5-full' ||
                zoneId === 'b316-f4' ||
                zoneId === 'commissioners-400-f2'
            ) {
                return 'executiveHerringbone';
            }
            return 'carpetModular';
        }

        if (bldgId === 'courthouse-350') {
            if (floorNum === 1) return 'terrazzoTile';
            if (floorNum === 4) return 'oakParquet';
            if (floorNum === 5) return 'executiveHerringbone';
            return 'carpetModular';
        }
        if (bldgId === 'building-400') {
            if (floorNum === 1) return 'terrazzoTile';
            if (floorNum === 2) return 'oakParquet';
            return 'carpetModular';
        }
        if (bldgId === 'regional-jail-east') {
            if (floorNum === 1) return 'terrazzoTile';
            if (floorNum === 5) return 'oakParquet';
            return 'securityConcrete';
        }
        if (bldgId === 'regional-jail-west') {
            return 'securityConcrete';
        }
        if (bldgId === 'building-316') {
            if (floorNum === 1) return 'terrazzoTile';
            if (floorNum === 4) return 'executiveHerringbone';
            return 'carpetModular';
        }
        if (bldgId === 'building-300' || bldgId === 'building-411-412') {
            return 'terrazzoTile';
        }
        return 'carpetModular';
    }

    _getFloorTextureSet(key) {
        if (typeof document === 'undefined') return null;
        if (!this._sharedFloorTextures) {
            this._sharedFloorTextures = this._buildSharedFloorTextures();
        }
        return this._sharedFloorTextures[key] || this._sharedFloorTextures.terrazzoTile;
    }

    _buildSharedFloorTextures() {
        const S = 512;
        const hash2 = (x, y) => {
            const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
            return n - Math.floor(n);
        };

        const finalizePair = (cCan, bCan, scaleMeters, roughness) => {
            const map = new THREE.CanvasTexture(cCan);
            map.colorSpace = THREE.SRGBColorSpace;
            map.wrapS = THREE.RepeatWrapping;
            map.wrapT = THREE.RepeatWrapping;
            map.anisotropy = 8;
            map.needsUpdate = true;

            const bumpMap = new THREE.CanvasTexture(bCan);
            bumpMap.wrapS = THREE.RepeatWrapping;
            bumpMap.wrapT = THREE.RepeatWrapping;
            bumpMap.anisotropy = 8;
            bumpMap.needsUpdate = true;

            return { map, bumpMap, scaleMeters, roughness };
        };

        // 1. Honed Civic Limestone & Terrazzo Tile (4x4 slabs per 4.4m repeat)
        const buildTerrazzo = () => {
            const cCan = document.createElement('canvas');
            const bCan = document.createElement('canvas');
            cCan.width = bCan.width = S;
            cCan.height = bCan.height = S;
            const cCtx = cCan.getContext('2d');
            const bCtx = bCan.getContext('2d');
            const tilePx = S / 4;

            for (let ty = 0; ty < 4; ty++) {
                for (let tx = 0; tx < 4; tx++) {
                    const shade = 224 + Math.round((hash2(tx + 3, ty + 7) - 0.5) * 22) + (((tx + ty) % 2) === 0 ? 8 : -6);
                    cCtx.fillStyle = `rgb(${shade}, ${shade - 4}, ${shade - 10})`;
                    cCtx.fillRect(tx * tilePx, ty * tilePx, tilePx, tilePx);

                    bCtx.fillStyle = `rgb(${155 + (((tx + ty) % 2) * 14)}, ${155 + (((tx + ty) % 2) * 14)}, ${155 + (((tx + ty) % 2) * 14)})`;
                    bCtx.fillRect(tx * tilePx, ty * tilePx, tilePx, tilePx);

                    // Subtle architectural inset border frame per stone tile
                    cCtx.strokeStyle = 'rgba(120, 113, 108, 0.24)';
                    cCtx.lineWidth = 2;
                    cCtx.strokeRect(tx * tilePx + 10, ty * tilePx + 10, tilePx - 20, tilePx - 20);

                    // Terrazzo mineral aggregate chips (quartz, slate, warm marble)
                    for (let k = 0; k < 44; k++) {
                        const rx = tx * tilePx + 6 + hash2(tx * 31 + k, ty * 17 + 1) * (tilePx - 12);
                        const ry = ty * tilePx + 6 + hash2(tx * 19 + 5, ty * 29 + k) * (tilePx - 12);
                        const rw = 2 + hash2(k, tx + ty * 4) * 4.2;
                        const rh = 1.8 + hash2(k + 9, tx * 3 + ty) * 3.6;
                        const chipPick = k % 3;
                        cCtx.fillStyle = chipPick === 0
                            ? 'rgba(255, 255, 255, 0.55)'
                            : chipPick === 1
                                ? 'rgba(100, 116, 139, 0.36)'
                                : 'rgba(180, 148, 112, 0.34)';
                        cCtx.fillRect(rx, ry, rw, rh);
                    }
                }
            }
            // Crisp recessed mortar / brass inlay joints
            for (let i = 0; i <= 4; i++) {
                const p = (i * tilePx) % S;
                cCtx.fillStyle = '#78716c';
                cCtx.fillRect(p, 0, 3, S);
                cCtx.fillRect(0, p, S, 3);
                cCtx.fillStyle = 'rgba(255, 255, 255, 0.55)';
                cCtx.fillRect((p + 3) % S, 0, 1.5, S);
                cCtx.fillRect(0, (p + 3) % S, S, 1.5);

                bCtx.fillStyle = '#383838';
                bCtx.fillRect(p, 0, 4, S);
                bCtx.fillRect(0, p, S, 4);
            }
            return finalizePair(cCan, bCan, 4.4, 0.62);
        };

        // 2. Quarter-Turn Commercial Modular Carpet Tile (4x4 modules per 4.0m repeat)
        const buildCarpetModular = () => {
            const cCan = document.createElement('canvas');
            const bCan = document.createElement('canvas');
            cCan.width = bCan.width = S;
            cCan.height = bCan.height = S;
            const cCtx = cCan.getContext('2d');
            const bCtx = bCan.getContext('2d');
            const tilePx = S / 4;

            for (let ty = 0; ty < 4; ty++) {
                for (let tx = 0; tx < 4; tx++) {
                    const quarterTurn = ((tx + ty) % 2) === 0;
                    const baseV = quarterTurn ? 232 : 204;
                    const x0 = tx * tilePx;
                    const y0 = ty * tilePx;
                    cCtx.fillStyle = `rgb(${baseV - 4}, ${baseV}, ${baseV + 6})`;
                    cCtx.fillRect(x0, y0, tilePx, tilePx);
                    bCtx.fillStyle = '#888888';
                    bCtx.fillRect(x0, y0, tilePx, tilePx);

                    // Directional bouclé carpet ribs (horizontal vs vertical per quarter-turned tile)
                    for (let s = 2; s < tilePx - 2; s += 4) {
                        const ribDark = ((s / 4) % 2) === 0;
                        cCtx.fillStyle = ribDark ? 'rgba(30, 41, 59, 0.14)' : 'rgba(255, 255, 255, 0.22)';
                        bCtx.fillStyle = ribDark ? '#666666' : '#b8b8b8';
                        if (quarterTurn) {
                            cCtx.fillRect(x0 + 1, y0 + s, tilePx - 2, 2);
                            bCtx.fillRect(x0 + 1, y0 + s, tilePx - 2, 2);
                        } else {
                            cCtx.fillRect(x0 + s, y0 + 1, 2, tilePx - 2);
                            bCtx.fillRect(x0 + s, y0 + 1, 2, tilePx - 2);
                        }
                    }
                }
            }
            // Subtle modular carpet seam lines
            for (let i = 0; i < 4; i++) {
                const p = i * tilePx;
                cCtx.fillStyle = 'rgba(51, 65, 85, 0.45)';
                cCtx.fillRect(p, 0, 2, S);
                cCtx.fillRect(0, p, S, 2);
                bCtx.fillStyle = '#303030';
                bCtx.fillRect(p, 0, 3, S);
                bCtx.fillRect(0, p, S, 3);
            }
            return finalizePair(cCan, bCan, 4.0, 0.88);
        };

        // 3. Staggered Wide-Plank Civic Oak Courtroom & Chambers Parquet (8 courses per 4.8m repeat)
        const buildOakParquet = () => {
            const cCan = document.createElement('canvas');
            const bCan = document.createElement('canvas');
            cCan.width = bCan.width = S;
            cCan.height = bCan.height = S;
            const cCtx = cCan.getContext('2d');
            const bCtx = bCan.getContext('2d');
            const rows = 8;
            const rowH = S / rows;
            const plankW = S / 2;

            for (let r = 0; r < rows; r++) {
                const y0 = r * rowH;
                const stagger = ((r * 173) % S);
                for (let p = -1; p <= 2; p++) {
                    const x0 = p * plankW + (stagger % plankW);
                    const tone = 212 + Math.round((hash2(r * 7 + p, r + 11) - 0.5) * 34);
                    cCtx.fillStyle = `rgb(${Math.min(246, tone + 16)}, ${tone + 2}, ${Math.max(150, tone - 22)})`;
                    cCtx.fillRect(x0, y0, plankW, rowH);

                    bCtx.fillStyle = `rgb(${150 + ((r + p) % 2) * 16}, ${150 + ((r + p) % 2) * 16}, ${150 + ((r + p) % 2) * 16})`;
                    bCtx.fillRect(x0, y0, plankW, rowH);

                    // Wood grain fibers along plank
                    for (let g = 3; g < rowH - 2; g += 4) {
                        const alpha = 0.08 + hash2(g, r * 13 + p) * 0.11;
                        cCtx.fillStyle = (g % 8 === 3)
                            ? `rgba(92, 64, 38, ${alpha.toFixed(2)})`
                            : `rgba(255, 248, 235, ${(alpha * 0.9).toFixed(2)})`;
                        cCtx.fillRect(x0 + 2, y0 + g, plankW - 4, 1.6);
                        bCtx.fillStyle = (g % 8 === 3) ? '#787878' : '#b2b2b2';
                        bCtx.fillRect(x0 + 2, y0 + g, plankW - 4, 1.4);
                    }

                    // Plank end joint
                    if (x0 >= 0 && x0 < S) {
                        cCtx.fillStyle = 'rgba(68, 48, 30, 0.62)';
                        cCtx.fillRect(x0, y0, 2.5, rowH);
                        bCtx.fillStyle = '#2c2c2c';
                        bCtx.fillRect(x0, y0, 3, rowH);
                    }
                }
                // Longitudinal plank bevel seam
                cCtx.fillStyle = 'rgba(68, 48, 30, 0.66)';
                cCtx.fillRect(0, y0, S, 2.5);
                cCtx.fillStyle = 'rgba(255, 250, 240, 0.40)';
                cCtx.fillRect(0, y0 + 2.5, S, 1.2);
                bCtx.fillStyle = '#282828';
                bCtx.fillRect(0, y0, S, 3);
            }
            return finalizePair(cCan, bCan, 4.8, 0.56);
        };

        // 4. Civic Herringbone Stone / Parquet Flooring (4.2m repeat)
        const buildExecutiveHerringbone = () => {
            const cCan = document.createElement('canvas');
            const bCan = document.createElement('canvas');
            cCan.width = bCan.width = S;
            cCan.height = bCan.height = S;
            const cCtx = cCan.getContext('2d');
            const bCtx = bCan.getContext('2d');
            const unit = 32; // 16x16 grid of 32px cells; each block is 3x1 cells

            cCtx.fillStyle = '#dce3ec';
            cCtx.fillRect(0, 0, S, S);
            bCtx.fillStyle = '#969696';
            bCtx.fillRect(0, 0, S, S);

            const nCells = S / unit;
            for (let gy = -4; gy < nCells + 4; gy++) {
                for (let gx = -4; gx < nCells + 4; gx++) {
                    const step = ((gx - gy) % 4 + 4) % 4;
                    if (step === 0) {
                        // Horizontal 2-cell block
                        const v = 228 + Math.round((hash2(gx, gy) - 0.5) * 18);
                        cCtx.fillStyle = `rgb(${v}, ${v + 2}, ${v + 6})`;
                        cCtx.fillRect(gx * unit + 1, gy * unit + 1, unit * 2 - 2, unit - 2);
                        cCtx.strokeStyle = 'rgba(71, 85, 105, 0.48)';
                        cCtx.lineWidth = 2;
                        cCtx.strokeRect(gx * unit + 1, gy * unit + 1, unit * 2 - 2, unit - 2);

                        bCtx.fillStyle = '#b4b4b4';
                        bCtx.fillRect(gx * unit + 2, gy * unit + 2, unit * 2 - 4, unit - 4);
                        bCtx.strokeStyle = '#3a3a3a';
                        bCtx.lineWidth = 2;
                        bCtx.strokeRect(gx * unit + 1, gy * unit + 1, unit * 2 - 2, unit - 2);
                    } else if (step === 2) {
                        // Vertical 2-cell block
                        const v = 202 + Math.round((hash2(gx + 9, gy + 5) - 0.5) * 18);
                        cCtx.fillStyle = `rgb(${v - 2}, ${v + 1}, ${v + 7})`;
                        cCtx.fillRect(gx * unit + 1, gy * unit + 1, unit - 2, unit * 2 - 2);
                        cCtx.strokeStyle = 'rgba(71, 85, 105, 0.48)';
                        cCtx.lineWidth = 2;
                        cCtx.strokeRect(gx * unit + 1, gy * unit + 1, unit - 2, unit * 2 - 2);

                        bCtx.fillStyle = '#8e8e8e';
                        bCtx.fillRect(gx * unit + 2, gy * unit + 2, unit - 4, unit * 2 - 4);
                        bCtx.strokeStyle = '#3a3a3a';
                        bCtx.lineWidth = 2;
                        bCtx.strokeRect(gx * unit + 1, gy * unit + 1, unit - 2, unit * 2 - 2);
                    }
                }
            }
            return finalizePair(cCan, bCan, 4.2, 0.68);
        };

        // 5. Saw-Cut Power-Troweled Architectural Concrete Deck (4x4 bays per 4.8m repeat)
        const buildSecurityConcrete = () => {
            const cCan = document.createElement('canvas');
            const bCan = document.createElement('canvas');
            cCan.width = bCan.width = S;
            cCan.height = bCan.height = S;
            const cCtx = cCan.getContext('2d');
            const bCtx = bCan.getContext('2d');
            const bayPx = S / 4;

            for (let by = 0; by < 4; by++) {
                for (let bx = 0; bx < 4; bx++) {
                    const v = 214 + (((bx + by) % 2) === 0 ? 10 : -8) + Math.round((hash2(bx * 5, by * 9) - 0.5) * 12);
                    cCtx.fillStyle = `rgb(${v - 4}, ${v}, ${v + 5})`;
                    cCtx.fillRect(bx * bayPx, by * bayPx, bayPx, bayPx);
                    bCtx.fillStyle = `rgb(${148 + ((bx + by) % 2) * 14}, ${148 + ((bx + by) % 2) * 14}, ${148 + ((bx + by) % 2) * 14})`;
                    bCtx.fillRect(bx * bayPx, by * bayPx, bayPx, bayPx);

                    // Trowel aggregate clouding
                    for (let m = 0; m < 28; m++) {
                        const mx = bx * bayPx + hash2(m, bx + by * 7) * bayPx;
                        const my = by * bayPx + hash2(bx * 3 + by, m + 13) * bayPx;
                        const mr = 6 + hash2(m + 4, bx * 11 + by) * 16;
                        cCtx.fillStyle = (m % 2 === 0) ? 'rgba(255, 255, 255, 0.09)' : 'rgba(71, 85, 105, 0.08)';
                        cCtx.beginPath();
                        cCtx.arc(mx, my, mr, 0, Math.PI * 2);
                        cCtx.fill();
                    }

                    // Structural tie-rod corner dimples
                    cCtx.fillStyle = 'rgba(71, 85, 105, 0.42)';
                    cCtx.fillRect(bx * bayPx + 12, by * bayPx + 12, 4, 4);
                    cCtx.fillRect((bx + 1) * bayPx - 16, (by + 1) * bayPx - 16, 4, 4);
                }
            }
            // Saw-cut control joints
            for (let i = 0; i < 4; i++) {
                const p = i * bayPx;
                cCtx.fillStyle = 'rgba(51, 65, 85, 0.62)';
                cCtx.fillRect(p, 0, 3, S);
                cCtx.fillRect(0, p, S, 3);
                cCtx.fillStyle = 'rgba(248, 250, 252, 0.48)';
                cCtx.fillRect(p + 3, 0, 1.5, S);
                cCtx.fillRect(0, p + 3, S, 1.5);
                bCtx.fillStyle = '#2a2a2a';
                bCtx.fillRect(p, 0, 4, S);
                bCtx.fillRect(0, p, S, 4);
            }
            return finalizePair(cCan, bCan, 4.8, 0.74);
        };

        // 6. Architectural Section-Cut Wall Poché Hatch (2.2m repeat)
        const buildWallPocheHatch = () => {
            const cCan = document.createElement('canvas');
            const bCan = document.createElement('canvas');
            cCan.width = bCan.width = 256;
            cCan.height = bCan.height = 256;
            const cCtx = cCan.getContext('2d');
            const bCtx = bCan.getContext('2d');

            cCtx.fillStyle = '#1e293b';
            cCtx.fillRect(0, 0, 256, 256);
            bCtx.fillStyle = '#808080';
            bCtx.fillRect(0, 0, 256, 256);

            cCtx.strokeStyle = '#64748b';
            cCtx.lineWidth = 3;
            bCtx.strokeStyle = '#c8c8c8';
            bCtx.lineWidth = 3;
            for (let d = -256; d <= 512; d += 24) {
                cCtx.beginPath();
                cCtx.moveTo(d, 0);
                cCtx.lineTo(d + 256, 256);
                cCtx.stroke();

                bCtx.beginPath();
                bCtx.moveTo(d, 0);
                bCtx.lineTo(d + 256, 256);
                bCtx.stroke();
            }
            return finalizePair(cCan, bCan, 2.2, 0.85);
        };

        return {
            terrazzoTile: buildTerrazzo(),
            carpetModular: buildCarpetModular(),
            oakParquet: buildOakParquet(),
            executiveHerringbone: buildExecutiveHerringbone(),
            securityConcrete: buildSecurityConcrete(),
            wallPocheHatch: buildWallPocheHatch()
        };
    }

    /**
     * Builds a crisp textured architectural floor-plate schematic inside `fp` at `plateY`:
     *   - Extruded PBR textured architectural floor slab (`terrazzoTile`, `carpetModular`, `oakParquet`, `executiveHerringbone`, or `securityConcrete`)
     *   - Section-hatched perimeter wall poché (`CutawayWallPocheRing`)
     *   - Textured department floor zones + concise floating department plaques
     */
    _buildArchitecturalFloorPlateSchematic(fp, plateY, band, bldg = null, activeZoneId = null) {
        const polyFp = fp.length > 4 ? this._simplifyFootprintForInset(fp, 0.45) : fp;
        const axis = this._computeFootprintAxis(polyFp);
        this._activeFloorAxis = axis;

        // Shape in XY where shapeY = -worldZ so rotateX(-PI/2) maps (x, -z, 0) -> (x, 0, z)
        const outerShape = new THREE.Shape();
        polyFp.forEach(([x, z], idx) => {
            if (idx === 0) outerShape.moveTo(x, -z);
            else outerShape.lineTo(x, -z);
        });
        outerShape.closePath();

        // 1. Finished Textured Floor-Plate Slab
        const slabTexKey = this._getFloorTextureKey(bldg?.id, band.floor, null);
        const slabTex = this._getFloorTextureSet(slabTexKey);
        const slabGeo = new THREE.ExtrudeGeometry(outerShape, {
            depth: 0.16,
            bevelEnabled: false
        });
        slabGeo.rotateX(-Math.PI / 2);
        slabGeo.translate(0, plateY - 0.16, 0);
        slabGeo.computeVertexNormals();
        this._applyPlanarFloorUVs(slabGeo, axis, slabTex ? slabTex.scaleMeters : 4.2, plateY);

        const slabTint = band.isBasement ? '#dde6f0' : '#f4f7fb';
        const slabMat = new THREE.MeshStandardMaterial({
            color: slabTint,
            map: slabTex ? slabTex.map : null,
            bumpMap: slabTex ? slabTex.bumpMap : null,
            bumpScale: 0.028,
            roughness: slabTex ? slabTex.roughness : 0.80,
            metalness: 0.05,
            emissive: new THREE.Color(slabTint),
            emissiveMap: slabTex ? slabTex.map : null,
            emissiveIntensity: 0.32,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        });
        const slabMesh = new THREE.Mesh(slabGeo, slabMat);
        slabMesh.name = 'CutawayFloorPlateSlab';
        slabMesh.userData = { floorTextureKey: slabTexKey };
        slabMesh.receiveShadow = true;
        slabMesh.renderOrder = 14;
        this.rootGroup.add(slabMesh);

        // 2. Perimeter Section-Cut Wall Poché Band (0.38m inward from exterior footprint)
        const innerRing = this._offsetPolygonOutward(polyFp, -0.38);
        const pocheVerts = [];
        const pocheIdx = [];
        const n = polyFp.length;
        const pocheY = plateY + 0.025;
        if (innerRing.length === n) {
            for (let i = 0; i < n; i++) {
                const [ox0, oz0] = polyFp[i];
                const [ox1, oz1] = polyFp[(i + 1) % n];
                const [ix0, iz0] = innerRing[i];
                const [ix1, iz1] = innerRing[(i + 1) % n];
                const b = pocheVerts.length / 3;
                pocheVerts.push(
                    ox0, pocheY, oz0,
                    ox1, pocheY, oz1,
                    ix1, pocheY, iz1,
                    ix0, pocheY, iz0
                );
                pocheIdx.push(b, b + 1, b + 2, b, b + 2, b + 3);
            }
            const pocheTex = this._getFloorTextureSet('wallPocheHatch');
            const pocheGeo = new THREE.BufferGeometry();
            pocheGeo.setAttribute('position', new THREE.Float32BufferAttribute(pocheVerts, 3));
            pocheGeo.setIndex(pocheIdx);
            pocheGeo.computeVertexNormals();
            this._applyPlanarFloorUVs(pocheGeo, axis, pocheTex ? pocheTex.scaleMeters : 2.2, pocheY);
            const pocheMat = new THREE.MeshStandardMaterial({
                color: '#cbd5e1',
                map: pocheTex ? pocheTex.map : null,
                bumpMap: pocheTex ? pocheTex.bumpMap : null,
                bumpScale: 0.018,
                roughness: 0.85,
                metalness: 0.05,
                emissive: new THREE.Color('#94a3b8'),
                emissiveMap: pocheTex ? pocheTex.map : null,
                emissiveIntensity: 0.26,
                side: THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: -3,
                polygonOffsetUnits: -3
            });
            const pocheMesh = new THREE.Mesh(pocheGeo, pocheMat);
            pocheMesh.name = 'CutawayWallPocheRing';
            pocheMesh.renderOrder = 15;
            this.rootGroup.add(pocheMesh);
        }

        if (bldg && bldg.id === 'courthouse-350') {
            this._buildCourthouseDepartmentZones(fp, innerRing, plateY, band, activeZoneId);
        } else if (bldg && bldg.id === 'building-400') {
            this._buildBuilding400DepartmentZones(innerRing, plateY, band, activeZoneId);
        } else if (bldg && bldg.id === 'regional-jail-east') {
            this._buildBuilding401DepartmentZones(innerRing, plateY, band, activeZoneId);
        } else if (bldg && bldg.id === 'regional-jail-west') {
            this._buildWestWingDepartmentZones(innerRing, plateY, band, activeZoneId);
        } else if (bldg && bldg.id === 'building-411-412') {
            this._buildBuilding411_412DepartmentZones(innerRing, plateY, band, activeZoneId);
        } else if (bldg) {
            this._buildStandardCampusFloorZone(bldg, innerRing, plateY, band, activeZoneId);
        }
    }

    _simplifyFootprintForInset(fp, minEdgeLen = 0.45) {
        if (!Array.isArray(fp) || fp.length <= 4) return fp;
        const simplified = [];
        for (let i = 0; i < fp.length; i++) {
            const p = fp[i];
            if (simplified.length > 0) {
                const prev = simplified[simplified.length - 1];
                if (Math.hypot(p[0] - prev[0], p[1] - prev[1]) < minEdgeLen) {
                    continue;
                }
            }
            simplified.push([p[0], p[1]]);
        }
        if (simplified.length > 3) {
            const first = simplified[0];
            const last = simplified[simplified.length - 1];
            if (Math.hypot(first[0] - last[0], first[1] - last[1]) < minEdgeLen) {
                simplified.pop();
            }
        }
        return simplified.length >= 3 ? simplified : fp;
    }

    /**
     * Sutherland-Hodgman half-plane clip keeping polygon region where `nx * x + nz * z <= offsetD`.
     */
    _clipPolygonHalfPlane(poly, nx, nz, offsetD) {
        if (!Array.isArray(poly) || poly.length < 3) return [];
        const out = [];
        const n = poly.length;
        for (let i = 0; i < n; i++) {
            const a = poly[i];
            const b = poly[(i + 1) % n];
            const da = nx * a[0] + nz * a[1] - offsetD;
            const db = nx * b[0] + nz * b[1] - offsetD;
            const aIn = da <= 1e-6;
            const bIn = db <= 1e-6;

            if (aIn && bIn) {
                out.push([b[0], b[1]]);
            } else if (aIn && !bIn) {
                const t = da / (da - db);
                out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
            } else if (!aIn && bIn) {
                const t = da / (da - db);
                out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
                out.push([b[0], b[1]]);
            }
        }
        return this._getCleanFootprint(out);
    }

    _computePolygonCentroid(poly) {
        if (!Array.isArray(poly) || poly.length === 0) return [0, 0];
        let area2 = 0;
        let cx = 0;
        let cz = 0;
        let avgX = 0;
        let avgZ = 0;
        const n = poly.length;
        for (let i = 0; i < n; i++) {
            const [x0, z0] = poly[i];
            const [x1, z1] = poly[(i + 1) % n];
            avgX += x0;
            avgZ += z0;
            const cross = x0 * z1 - x1 * z0;
            area2 += cross;
            cx += (x0 + x1) * cross;
            cz += (z0 + z1) * cross;
        }
        if (Math.abs(area2) < 1e-4) {
            return [avgX / n, avgZ / n];
        }
        const inv = 1 / (3 * area2);
        return [cx * inv, cz * inv];
    }

    /**
     * Renders seamless polygon department floor zones (zero interior divider lines) + high-DPI plaques.
     */
    _renderPolygonDepartmentZones(zones, plateY, bandFloor, activeZoneId = null) {
        if (!Array.isArray(zones) || zones.length === 0) return;
        const zoneY = plateY + 0.06;

        for (const z of zones) {
            if (!Array.isArray(z.poly) || z.poly.length < 3) continue;
            const isSelectedZone = activeZoneId ? activeZoneId === z.id : false;
            const hasOtherSelected = Boolean(activeZoneId && activeZoneId !== z.id);
            const fillOpacity = isSelectedZone ? 0.94 : (hasOtherSelected ? 0.48 : 0.86);
            const zoneTexKey = this._getFloorTextureKey(this.activeBuildingId, bandFloor, z.id);
            const zoneTex = this._getFloorTextureSet(zoneTexKey);
            const baseCol = new THREE.Color(z.fillColor);
            const tintedCol = baseCol.clone().lerp(new THREE.Color('#ffffff'), isSelectedZone ? 0.30 : 0.42);
            const emissiveCol = baseCol.clone().lerp(new THREE.Color('#ffffff'), 0.28);
            const emissiveInt = isSelectedZone ? 0.48 : (hasOtherSelected ? 0.20 : 0.36);

            const shape = new THREE.Shape();
            z.poly.forEach(([px, pz], idx) => {
                if (idx === 0) shape.moveTo(px, -pz);
                else shape.lineTo(px, -pz);
            });
            shape.closePath();

            const zGeo = new THREE.ShapeGeometry(shape);
            zGeo.rotateX(-Math.PI / 2);
            zGeo.translate(0, zoneY, 0);
            zGeo.computeVertexNormals();
            this._applyPlanarFloorUVs(zGeo, this._activeFloorAxis, zoneTex ? zoneTex.scaleMeters : 4.0, zoneY);

            const zMat = new THREE.MeshStandardMaterial({
                color: tintedCol,
                map: zoneTex ? zoneTex.map : null,
                bumpMap: zoneTex ? zoneTex.bumpMap : null,
                bumpScale: 0.03,
                roughness: zoneTex ? zoneTex.roughness : 0.78,
                metalness: 0.05,
                emissive: emissiveCol,
                emissiveMap: zoneTex ? zoneTex.map : null,
                emissiveIntensity: emissiveInt,
                transparent: true,
                opacity: fillOpacity,
                side: THREE.DoubleSide,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -4,
                polygonOffsetUnits: -4
            });
            const zMesh = new THREE.Mesh(zGeo, zMat);
            zMesh.name = `CutawayDepartmentZone_${z.id}`;
            zMesh.userData = { isDepartmentZone: true, zoneId: z.id, floor: bandFloor, floorTextureKey: zoneTexKey };
            zMesh.receiveShadow = true;
            zMesh.renderOrder = 18;
            this.rootGroup.add(zMesh);
            if (isSelectedZone) this._addZoneSelectionPulse(z.poly, zoneY, z.id);

            const plaqueTex = this._createZoneLabelTexture(
                z.title,
                z.subtitle,
                z.headerBg,
                z.borderColor,
                isSelectedZone
            );
            if (plaqueTex) {
                const centerPt = z.plaquePos || this._computePolygonCentroid(z.poly);
                const pGeo = new THREE.PlaneGeometry(z.plaqueW || 16.0, z.plaqueH || 4.6);
                const pMat = new THREE.MeshBasicMaterial({
                    map: plaqueTex,
                    transparent: true,
                    opacity: hasOtherSelected ? 0.78 : 0.98,
                    depthWrite: false,
                    polygonOffset: true,
                    polygonOffsetFactor: -5,
                    polygonOffsetUnits: -5
                });
                const pMesh = new THREE.Mesh(pGeo, pMat);
                pMesh.name = `CutawayDepartmentZoneLabel_${z.id}`;
                pMesh.rotation.order = 'YXZ';
                pMesh.rotation.x = -Math.PI / 2;
                pMesh.rotation.y = z.plaqueRotY ?? Math.atan2(0.80425, 0.59429);
                pMesh.position.set(centerPt[0], zoneY + 0.03, centerPt[1]);
                pMesh.renderOrder = 20;
                this.rootGroup.add(pMesh);
            }
        }
    }

    /**
     * Concise single-line floor zone for 316, 300, and 428 campus buildings.
     */
    _buildStandardCampusFloorZone(bldg, innerRing, plateY, band, activeZoneId = null) {
        if (!innerRing || innerRing.length < 3) return;
        const plaqueRotY = Math.atan2(0.80425, 0.59429);
        const byBldg = {
            'building-316': {
                1: { id: 'b316-f1', title: 'Operations', fill: '#0284c7', border: '#7dd3fc', bg: '#0c4a6e', w: 10.6 },
                2: { id: 'b316-f2', title: 'Economic Services', fill: '#0d9488', border: '#5eead4', bg: '#134e4a', w: 12.6 },
                3: { id: 'b316-f3', title: 'Community Dev', fill: '#2563eb', border: '#93c5fd', bg: '#1e3a8a', w: 11.8 },
                4: { id: 'b316-f4', title: 'Public Works', fill: '#7c3aed', border: '#c4b5fd', bg: '#4c1d95', w: 11.0 }
            },
            'building-300': {
                1: { id: 'b300-f1', title: 'Juvenile Justice', fill: '#0284c7', border: '#7dd3fc', bg: '#0c4a6e', w: 14.0 }
            },
            'building-428': {
                1: { id: 'b428-f1', title: 'Campus Annex', fill: '#15803d', border: '#86efac', bg: '#14532d', w: 7.4, h: 1.9 }
            }
        };
        const spec = byBldg[bldg.id]?.[band.floor];
        if (!spec) return;

        this._renderPolygonDepartmentZones(
            [
                {
                    id: spec.id,
                    title: spec.title,
                    subtitle: '',
                    poly: innerRing,
                    fillColor: spec.fill,
                    borderColor: spec.border,
                    headerBg: spec.bg,
                    plaqueW: spec.w,
                    plaqueH: spec.h || 2.8,
                    plaqueRotY
                }
            ],
            plateY,
            band.floor,
            activeZoneId
        );
    }

    /**
     * Building 400 (`building-400` — 400 Douglas St County Administration):
     *   - Floor 1: 1/3 Economic Services, 1/3 Public Records, 1/3 Fire Prevention
     *   - Floor 2: Commissioners with Chambers in the middle
     *   - Floor 3: Human Resources occupying 1/3 of the floor next to the rear alley
     */
    _buildBuilding400DepartmentZones(innerRing, plateY, band, activeZoneId = null) {
        if (!innerRing || innerRing.length < 3) return;

        // Longitudinal +lz unit axis of Building 400: Rear Alley (-lz) -> Front Douglas St Portico (+lz)
        const nx = 0.811612;
        const nz = 0.584197;
        let minD = Infinity;
        let maxD = -Infinity;
        for (const [x, z] of innerRing) {
            const d = nx * x + nz * z;
            if (d < minD) minD = d;
            if (d > maxD) maxD = d;
        }
        const spanD = maxD - minD;
        if (spanD <= 1.0) return;

        const d1 = minD + spanD / 3;
        const d2 = minD + (2 * spanD) / 3;

        // Slice exact 1/3 polygons along the building's stepped footprint
        const polyAlleyThird = this._clipPolygonHalfPlane(innerRing, nx, nz, d1);
        const polyMidRaw = this._clipPolygonHalfPlane(innerRing, -nx, -nz, -d1);
        const polyMidThird = this._clipPolygonHalfPlane(polyMidRaw, nx, nz, d2);
        const polyFrontThird = this._clipPolygonHalfPlane(innerRing, -nx, -nz, -d2);

        const plaqueRotY = Math.atan2(0.811612, 0.584197);
        const zones = [];

        if (band.floor === 1) {
            if (polyFrontThird.length >= 3) {
                zones.push({
                    id: 'econ-400-f1',
                    title: 'Economic Services',
                    subtitle: '',
                    poly: polyFrontThird,
                    fillColor: '#0284c7',
                    borderColor: '#7dd3fc',
                    headerBg: '#0c4a6e',
                    plaqueW: 11.8,
                    plaqueH: 2.6,
                    plaqueRotY
                });
            }
            if (polyMidThird.length >= 3) {
                zones.push({
                    id: 'public-records-400-f1',
                    title: 'Public Records',
                    subtitle: '',
                    poly: polyMidThird,
                    fillColor: '#0d9488',
                    borderColor: '#5eead4',
                    headerBg: '#134e4a',
                    plaqueW: 11.0,
                    plaqueH: 2.6,
                    plaqueRotY
                });
            }
            if (polyAlleyThird.length >= 3) {
                zones.push({
                    id: 'fire-prev-400-f1',
                    title: 'Fire Prevention',
                    subtitle: '',
                    poly: polyAlleyThird,
                    fillColor: '#e11d48',
                    borderColor: '#fda4af',
                    headerBg: '#881337',
                    plaqueW: 11.2,
                    plaqueH: 2.6,
                    plaqueRotY
                });
            }
        } else if (band.floor === 2) {
            if (polyFrontThird.length >= 3) {
                zones.push({
                    id: 'commissioners-400-f2',
                    title: 'Commissioners',
                    subtitle: '',
                    poly: polyFrontThird,
                    fillColor: '#0284c7',
                    borderColor: '#7dd3fc',
                    headerBg: '#0c4a6e',
                    plaqueW: 11.2,
                    plaqueH: 2.6,
                    plaqueRotY
                });
            }
            if (polyMidThird.length >= 3) {
                zones.push({
                    id: 'chambers-400-f2',
                    title: 'Chambers',
                    subtitle: '',
                    poly: polyMidThird,
                    fillColor: '#d97706',
                    borderColor: '#fbbf24',
                    headerBg: '#78350f',
                    plaqueW: 9.8,
                    plaqueH: 2.6,
                    plaqueRotY
                });
            }
            if (polyAlleyThird.length >= 3) {
                zones.push({
                    id: 'commissioners-400-f2',
                    title: 'Commissioners',
                    subtitle: '',
                    poly: polyAlleyThird,
                    fillColor: '#0284c7',
                    borderColor: '#7dd3fc',
                    headerBg: '#0c4a6e',
                    plaqueW: 11.2,
                    plaqueH: 2.6,
                    plaqueRotY
                });
            }
        } else if (band.floor === 3) {
            if (polyAlleyThird.length >= 3) {
                zones.push({
                    id: 'hr-400-f3',
                    title: 'Human Resources',
                    subtitle: '',
                    poly: polyAlleyThird,
                    fillColor: '#7c3aed',
                    borderColor: '#c4b5fd',
                    headerBg: '#4c1d95',
                    plaqueW: 12.0,
                    plaqueH: 2.7,
                    plaqueRotY
                });
            }
        }

        if (zones.length > 0) {
            this._renderPolygonDepartmentZones(zones, plateY, band.floor, activeZoneId);
        }
    }

    /**
     * Building 401 (`regional-jail-east` — 401 Washington St):
     *   - Floor 1: Sheriff
     *   - Floors 2, 3, 4: RJC
     *   - Floor 5: Superior Court
     */
    _buildBuilding401DepartmentZones(innerRing, plateY, band, activeZoneId = null) {
        if (!innerRing || innerRing.length < 3) return;
        const plaquePos = [9.17, -23.46];
        const plaqueRotY = Math.atan2(0.80425, 0.59429);

        let zone = null;
        if (band.floor === 1) {
            zone = {
                id: 'sheriff-401-f1',
                title: 'Sheriff',
                subtitle: '',
                poly: innerRing,
                fillColor: '#1d4ed8',
                borderColor: '#60a5fa',
                headerBg: '#1e3a8a',
                plaqueW: 13.0,
                plaqueH: 3.3,
                plaquePos,
                plaqueRotY
            };
        } else if (band.floor === 2) {
            zone = {
                id: 'rjc-401-f2',
                title: 'RJC',
                subtitle: '',
                poly: innerRing,
                fillColor: '#d97706',
                borderColor: '#fbbf24',
                headerBg: '#78350f',
                plaqueW: 11.4,
                plaqueH: 3.3,
                plaquePos,
                plaqueRotY
            };
        } else if (band.floor === 3) {
            zone = {
                id: 'rjc-401-f3',
                title: 'RJC',
                subtitle: '',
                poly: innerRing,
                fillColor: '#d97706',
                borderColor: '#fbbf24',
                headerBg: '#78350f',
                plaqueW: 11.4,
                plaqueH: 3.3,
                plaquePos,
                plaqueRotY
            };
        } else if (band.floor === 4) {
            zone = {
                id: 'rjc-401-f4',
                title: 'RJC',
                subtitle: '',
                poly: innerRing,
                fillColor: '#d97706',
                borderColor: '#fbbf24',
                headerBg: '#78350f',
                plaqueW: 11.4,
                plaqueH: 3.3,
                plaquePos,
                plaqueRotY
            };
        } else if (band.floor === 5) {
            zone = {
                id: 'superior-court-401-f5',
                title: 'Superior Court',
                subtitle: '',
                poly: innerRing,
                fillColor: '#6d28d9',
                borderColor: '#c4b5fd',
                headerBg: '#4c1d95',
                plaqueW: 15.6,
                plaqueH: 3.4,
                plaquePos,
                plaqueRotY
            };
        }

        if (zone) {
            this._renderPolygonDepartmentZones([zone], plateY, band.floor, activeZoneId);
        }
    }

    /**
     * Regional Justice Center West Wing Annex (`regional-jail-west` — 413–415 Washington St):
     *   - Floors 1 & 2: RJC
     */
    _buildWestWingDepartmentZones(innerRing, plateY, band, activeZoneId = null) {
        if (!innerRing || innerRing.length < 3) return;
        const plaqueRotY = Math.atan2(0.80425, 0.59429);
        const zone = {
            id: band.floor === 2 ? 'rjc-west-f2' : 'rjc-west-f1',
            title: 'RJC',
            subtitle: '',
            poly: innerRing,
            fillColor: '#d97706',
            borderColor: '#fbbf24',
            headerBg: '#78350f',
            plaqueW: 11.6,
            plaqueH: 3.2,
            plaqueRotY
        };
        this._renderPolygonDepartmentZones([zone], plateY, band.floor, activeZoneId);
    }

    /**
     * Building 410/411/412 Washington St (`building-411-412`):
     *   - Front Half (`lz <= +3.60m`): RJC
     *   - Rear Half (`lz >= +3.60m`): Natural Resources
     */
    _buildBuilding411_412DepartmentZones(innerRing, plateY, band, activeZoneId = null) {
        if (!innerRing || innerRing.length < 3) return;

        // Local frame of 411/412: center = (-73.89, -11.51), lz = (x - cx)*(-0.58917) + (z - cz)*0.80801
        const nx = -0.58917;
        const nz = 0.80801;
        const baseD = nx * (-73.89) + nz * (-11.51);
        const splitLz = 3.60;

        const frontPoly = this._clipPolygonHalfPlane(innerRing, nx, nz, baseD + splitLz);
        const rearPoly = this._clipPolygonHalfPlane(innerRing, -nx, -nz, -(baseD + splitLz));

        const zones = [];
        if (frontPoly.length >= 3) {
            zones.push({
                id: 'rjc-411-front',
                title: 'RJC',
                subtitle: '',
                poly: frontPoly,
                fillColor: '#d97706',
                borderColor: '#fbbf24',
                headerBg: '#78350f',
                plaqueW: 9.8,
                plaqueH: 2.8,
                plaquePos: [-65.74, -12.75],
                plaqueRotY: Math.atan2(0.80801, 0.58917)
            });
        }
        if (rearPoly.length >= 3) {
            zones.push({
                id: 'natres-411-rear',
                title: 'Natural Resources',
                subtitle: '',
                poly: rearPoly,
                fillColor: '#15803d',
                borderColor: '#86efac',
                headerBg: '#14532d',
                plaqueW: 13.4,
                plaqueH: 2.9,
                plaquePos: [-80.45, -6.36],
                plaqueRotY: Math.atan2(-0.58917, 0.80801)
            });
        }

        this._renderPolygonDepartmentZones(zones, plateY, band.floor, activeZoneId);
    }

    /**
     * Renders Chelan County Courthouse (`courthouse-350`) 3D floor-plan department zones with concise single-line plaques:
     *   - Floor 2: Assessor, Treasurer, Auditor • Licensing
     *   - Floor 3: Auditor • Elections, Prosecutor
     *   - Floor 4: Courtroom 2, District Court, Courtroom 1
     *   - Floor 5: Clerk
     */
    _buildCourthouseDepartmentZones(fp, innerRing, plateY, band, activeZoneId = null) {
        const ring = innerRing && innerRing.length === 4 ? innerRing : fp;
        if (!ring || ring.length < 4) return;

        const Q0 = ring[0];
        const Q1 = ring[1];
        const Q2 = ring[2];
        const Q3 = ring[3];

        const bilerp = (s, t) => [
            (1 - s) * (1 - t) * Q3[0] + (1 - s) * t * Q0[0] + s * (1 - t) * Q2[0] + s * t * Q1[0],
            (1 - s) * (1 - t) * Q3[1] + (1 - s) * t * Q0[1] + s * (1 - t) * Q2[1] + s * t * Q1[1]
        ];

        const zones = [];
        if (band.floor === 2) {
            zones.push(
                {
                    id: 'assessor-f2-orondo',
                    title: 'Assessor',
                    subtitle: '',
                    s0: 0.50,
                    s1: 1.00,
                    t0: 0.00,
                    t1: 1.00,
                    fillColor: '#0284c7',
                    borderColor: '#38bdf8',
                    headerBg: '#0c4a6e',
                    plaqueW: 11.2,
                    plaqueH: 2.8
                },
                {
                    id: 'treasurer-f2-park-vestibule',
                    title: 'Treasurer',
                    subtitle: '',
                    s0: 0.00,
                    s1: 0.50,
                    t0: 0.50,
                    t1: 1.00,
                    fillColor: '#d97706',
                    borderColor: '#fbbf24',
                    headerBg: '#78350f',
                    plaqueW: 9.2,
                    plaqueH: 2.6
                },
                {
                    id: 'auditor-f2-quarter',
                    title: 'Auditor • Licensing',
                    subtitle: '',
                    s0: 0.00,
                    s1: 0.50,
                    t0: 0.00,
                    t1: 0.50,
                    fillColor: '#0d9488',
                    borderColor: '#2dd4bf',
                    headerBg: '#134e4a',
                    plaqueW: 10.2,
                    plaqueH: 2.6
                }
            );
        } else if (band.floor === 3) {
            zones.push(
                {
                    id: 'auditor-elections-f3-orondo',
                    title: 'Auditor • Elections',
                    subtitle: '',
                    s0: 0.50,
                    s1: 1.00,
                    t0: 0.00,
                    t1: 1.00,
                    fillColor: '#0d9488',
                    borderColor: '#2dd4bf',
                    headerBg: '#134e4a',
                    plaqueW: 13.0,
                    plaqueH: 2.9
                },
                {
                    id: 'prosecutor-child-support-f3-vestibule',
                    title: 'Prosecutor',
                    subtitle: '',
                    s0: 0.00,
                    s1: 0.50,
                    t0: 0.00,
                    t1: 1.00,
                    fillColor: '#6366f1',
                    borderColor: '#a5b4fc',
                    headerBg: '#312e81',
                    plaqueW: 11.2,
                    plaqueH: 2.9
                }
            );
        } else if (band.floor === 4) {
            zones.push(
                {
                    id: 'courtroom-2-f4-orondo',
                    title: 'Courtroom 2',
                    subtitle: '',
                    s0: 2 / 3,
                    s1: 1.00,
                    t0: 0.00,
                    t1: 1.00,
                    fillColor: '#2563eb',
                    borderColor: '#60a5fa',
                    headerBg: '#1e3a8a',
                    plaqueW: 11.6,
                    plaqueH: 2.7
                },
                {
                    id: 'district-court-judges-f4-middle',
                    title: 'District Court',
                    subtitle: '',
                    s0: 1 / 3,
                    s1: 2 / 3,
                    t0: 0.00,
                    t1: 1.00,
                    fillColor: '#0284c7',
                    borderColor: '#7dd3fc',
                    headerBg: '#0c4a6e',
                    plaqueW: 12.2,
                    plaqueH: 2.7
                },
                {
                    id: 'courtroom-1-f4-vestibule',
                    title: 'Courtroom 1',
                    subtitle: '',
                    s0: 0.00,
                    s1: 1 / 3,
                    t0: 0.00,
                    t1: 1.00,
                    fillColor: '#be123c',
                    borderColor: '#fda4af',
                    headerBg: '#881337',
                    plaqueW: 11.6,
                    plaqueH: 2.7
                }
            );
        } else if (band.floor === 5) {
            zones.push({
                id: 'county-clerk-f5-full',
                title: 'Clerk',
                subtitle: '',
                s0: 0.00,
                s1: 1.00,
                t0: 0.00,
                t1: 1.00,
                fillColor: '#7c3aed',
                borderColor: '#c4b5fd',
                headerBg: '#4c1d95',
                plaqueW: 11.4,
                plaqueH: 3.1
            });
        }

        if (zones.length === 0) return;

        const fdx = Q1[0] - Q2[0];
        const fdz = Q1[1] - Q2[1];
        const flen = Math.hypot(fdx, fdz) || 1;
        const plaqueRotY = Math.atan2(-(fdz / flen), fdx / flen);

        const zoneY = plateY + 0.06;

        for (const z of zones) {
            const isSelectedZone = activeZoneId ? activeZoneId === z.id : false;
            const hasOtherSelected = Boolean(activeZoneId && activeZoneId !== z.id);
            const fillOpacity = isSelectedZone ? 0.94 : (hasOtherSelected ? 0.48 : 0.86);
            const zoneTexKey = this._getFloorTextureKey('courthouse-350', band.floor, z.id);
            const zoneTex = this._getFloorTextureSet(zoneTexKey);
            const baseCol = new THREE.Color(z.fillColor);
            const tintedCol = baseCol.clone().lerp(new THREE.Color('#ffffff'), isSelectedZone ? 0.30 : 0.42);
            const emissiveCol = baseCol.clone().lerp(new THREE.Color('#ffffff'), 0.28);
            const emissiveInt = isSelectedZone ? 0.48 : (hasOtherSelected ? 0.20 : 0.36);

            const c00 = bilerp(z.s0, z.t0);
            const c01 = bilerp(z.s0, z.t1);
            const c11 = bilerp(z.s1, z.t1);
            const c10 = bilerp(z.s1, z.t0);

            const qGeo = new THREE.BufferGeometry();
            qGeo.setAttribute(
                'position',
                new THREE.Float32BufferAttribute(
                    [
                        c00[0], zoneY, c00[1],
                        c01[0], zoneY, c01[1],
                        c11[0], zoneY, c11[1],
                        c10[0], zoneY, c10[1]
                    ],
                    3
                )
            );
            qGeo.setAttribute(
                'normal',
                new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3)
            );
            qGeo.setIndex([0, 1, 2, 0, 2, 3]);
            this._applyPlanarFloorUVs(qGeo, this._activeFloorAxis, zoneTex ? zoneTex.scaleMeters : 4.0, zoneY);

            const qMat = new THREE.MeshStandardMaterial({
                color: tintedCol,
                map: zoneTex ? zoneTex.map : null,
                bumpMap: zoneTex ? zoneTex.bumpMap : null,
                bumpScale: 0.03,
                roughness: zoneTex ? zoneTex.roughness : 0.78,
                metalness: 0.05,
                emissive: emissiveCol,
                emissiveMap: zoneTex ? zoneTex.map : null,
                emissiveIntensity: emissiveInt,
                transparent: true,
                opacity: fillOpacity,
                side: THREE.DoubleSide,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -4,
                polygonOffsetUnits: -4
            });
            const qMesh = new THREE.Mesh(qGeo, qMat);
            qMesh.name = `CutawayDepartmentZone_${z.id}`;
            qMesh.userData = { isDepartmentZone: true, zoneId: z.id, floor: band.floor, floorTextureKey: zoneTexKey };
            qMesh.receiveShadow = true;
            qMesh.renderOrder = 18;
            this.rootGroup.add(qMesh);
            if (isSelectedZone) this._addZoneSelectionPulse([c00, c01, c11, c10], zoneY, z.id);

            const plaqueTex = this._createZoneLabelTexture(z.title, z.subtitle, z.headerBg, z.borderColor, isSelectedZone);
            if (plaqueTex) {
                const centerPt = bilerp((z.s0 + z.s1) * 0.5, (z.t0 + z.t1) * 0.5);
                const pGeo = new THREE.PlaneGeometry(z.plaqueW, z.plaqueH);
                const pMat = new THREE.MeshBasicMaterial({
                    map: plaqueTex,
                    transparent: true,
                    opacity: hasOtherSelected ? 0.78 : 0.98,
                    depthWrite: false,
                    polygonOffset: true,
                    polygonOffsetFactor: -5,
                    polygonOffsetUnits: -5
                });
                const pMesh = new THREE.Mesh(pGeo, pMat);
                pMesh.name = `CutawayDepartmentZoneLabel_${z.id}`;
                pMesh.rotation.order = 'YXZ';
                pMesh.rotation.x = -Math.PI / 2;
                pMesh.rotation.y = plaqueRotY;
                pMesh.position.set(centerPt[0], zoneY + 0.03, centerPt[1]);
                pMesh.renderOrder = 20;
                this.rootGroup.add(pMesh);
            }
        }
    }

    _createZoneLabelTexture(title, _subtitle, bgHex, borderHex, isHighlighted = false) {
        if (typeof document === 'undefined') return null;
        const can = document.createElement('canvas');
        can.width = 896;
        can.height = 208;
        const ctx = can.getContext('2d');
        if (!ctx) return null;

        const pad = 14;
        const w = can.width - pad * 2;
        const h = can.height - pad * 2;
        const r = 34;

        ctx.clearRect(0, 0, can.width, can.height);
        ctx.beginPath();
        ctx.moveTo(pad + r, pad);
        ctx.lineTo(pad + w - r, pad);
        ctx.quadraticCurveTo(pad + w, pad, pad + w, pad + r);
        ctx.lineTo(pad + w, pad + h - r);
        ctx.quadraticCurveTo(pad + w, pad + h, pad + w - r, pad + h);
        ctx.lineTo(pad + r, pad + h);
        ctx.quadraticCurveTo(pad, pad + h, pad, pad + h - r);
        ctx.lineTo(pad, pad + r);
        ctx.quadraticCurveTo(pad, pad, pad + r, pad);
        ctx.closePath();

        ctx.fillStyle = bgHex || '#0f172a';
        ctx.globalAlpha = 0.94;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        ctx.lineWidth = isHighlighted ? 9 : 6;
        ctx.strokeStyle = borderHex || '#38bdf8';
        ctx.stroke();

        const titleFontPx = title.length > 20 ? 52 : (title.length > 14 ? 58 : 66);
        ctx.fillStyle = '#ffffff';
        ctx.font = `800 ${titleFontPx}px "Segoe UI", system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, can.width * 0.5, can.height * 0.52, w - 48);

        const tex = new THREE.CanvasTexture(can);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        tex.needsUpdate = true;
        this._disposableTextures.push(tex);
        return tex;
    }

    _pointInPolygon(x, z, poly) {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i][0];
            const zi = poly[i][1];
            const xj = poly[j][0];
            const zj = poly[j][1];
            const intersect =
                zi > z !== zj > z &&
                x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
            if (intersect) inside = !inside;
        }
        return inside;
    }
}
