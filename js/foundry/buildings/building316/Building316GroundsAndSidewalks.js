import * as THREE from 'three';
import { createLumaGrassMaterial } from '../../materials/GrassMaterial.js';

export function buildBuilding316GroundsAndSidewalks(ctx) {
    const {
        building, groundArch,
        bldgCx316, bldgCz316, sinT316, cosT316, terrainY, getTerrainHeightFn,
        getDouglasLocalGroundY, addContouredDouglasStrip,
        frontZ, douglasX,
        whiteTrimMat, darkBronzeMat, galvSteelMat
    } = ctx;
    const arch = groundArch;
    const addBox = (w, h, d, mat, x, y, z, cast = true) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z);
        m.castShadow = cast;
        m.receiveShadow = true;
        m.userData = { isSelectableBuilding: true, building };
        groundArch.add(m);
        return m;
    };

        const sidewalkConcreteMat = new THREE.MeshStandardMaterial({
            color: '#e2dcd0',
            roughness: 0.86,
            metalness: 0.03,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        });
        const whiteCurbMat = new THREE.MeshStandardMaterial({
            color: '#f2eee6',
            roughness: 0.75,
            metalness: 0.04,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        });
        const swScoreMat = new THREE.MeshBasicMaterial({
            color: '#9c9588',
            polygonOffset: true,
            polygonOffsetFactor: -3,
            polygonOffsetUnits: -3
        });
        const sidewalkJointMat = new THREE.MeshStandardMaterial({
            color: '#8c867a',
            roughness: 0.92,
            metalness: 0.02,
            polygonOffset: true,
            polygonOffsetFactor: -3,
            polygonOffsetUnits: -3
        });
        const whitePebbleMat = new THREE.MeshStandardMaterial({
            color: '#e8e5dd',
            roughness: 0.95,
            metalness: 0.01,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        });
        const railPipeMat = new THREE.MeshStandardMaterial({
            color: '#5c6166',
            roughness: 0.45,
            metalness: 0.68
        });
        const lawnMat = createLumaGrassMaterial({
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        });
        const shrubMat = new THREE.MeshStandardMaterial({
            color: '#365c24',
            roughness: 0.90,
            metalness: 0.02
        });

        // 1. ZONE 1 — ENTRANCE VESTIBULE LANDING & SLOPED ADA ENTRANCE WALKWAY (lz = frontZ .. frontZ + 1.90m)
        // Seamlessly connects Building 300's Circular Courtyard Landing (lx = -11.155m, topY = 0.62m) and Building 316's Entry Doors
        // all the way across to the Douglas St Public Sidewalk (lx = +10.25m, topY = 0.34m)!
        const getWalkwayTopY = (lx) => {
            if (lx <= -3.65) return 0.62;
            if (lx >= 10.25) return 0.34;
            const t = (lx - (-3.65)) / (10.25 - (-3.65));
            return 0.62 - t * (0.62 - 0.34);
        };

        // Thin 0.18m white crushed-rock drip strip right against the precast wall base (lx = -3.65m..+7.91m)
        {
            const dripGeo = new THREE.BoxGeometry(11.56, 0.48, 0.18, 24, 1, 1);
            const dPos = dripGeo.attributes.position;
            for (let i = 0; i < dPos.count; i++) {
                const vx = dPos.getX(i);
                const vy = dPos.getY(i);
                const lx = 2.13 + vx;
                const topY = getWalkwayTopY(lx) + 0.01;
                dPos.setY(i, vy > 0 ? topY : 0.06);
            }
            dPos.needsUpdate = true;
            dripGeo.computeVertexNormals();
            const dripMesh = new THREE.Mesh(dripGeo, whitePebbleMat);
            dripMesh.position.set(2.13, 0, frontZ + 0.09);
            dripMesh.receiveShadow = true;
            groundArch.add(dripMesh);
        }

        // Main Concrete Entrance Vestibule Landing along the building front (lx = -11.20m..-3.65m, lz = frontZ .. frontZ + 1.90m, topY = 0.62m flush with Building 300 Courtyard Landing!)
        addBox(7.55, 0.56, 1.90, sidewalkConcreteMat, -7.425, 0.34, frontZ + 0.95, false);
        for (let jx = -9.60; jx <= -4.20; jx += 1.75) {
            addBox(0.025, 0.012, 1.82, swScoreMat, jx, 0.626, frontZ + 0.95, false);
        }

        // Sloped Concrete Entrance Walkway / ADA Ramp from the Entrance Vestibule (lx = -3.65m, topY = 0.62m) to the Douglas St Sidewalk (lx = +10.28m, topY = 0.34m)
        const walkX0 = -3.65;
        const walkX1 = 10.28;
        const walkW = walkX1 - walkX0;
        const walkCx = (walkX0 + walkX1) * 0.5;
        const walkD = 1.72; // lz = frontZ + 0.18m .. frontZ + 1.90m
        const walkCenterZ = frontZ + 1.04;
        {
            const walkGeo = new THREE.BoxGeometry(walkW, 0.50, walkD, 32, 1, 2);
            const wPos = walkGeo.attributes.position;
            for (let i = 0; i < wPos.count; i++) {
                const vx = wPos.getX(i);
                const vy = wPos.getY(i);
                const lx = walkCx + vx;
                const topY = getWalkwayTopY(lx);
                wPos.setY(i, vy > 0 ? topY : 0.06);
            }
            wPos.needsUpdate = true;
            walkGeo.computeVertexNormals();
            const walkMesh = new THREE.Mesh(walkGeo, sidewalkConcreteMat);
            walkMesh.position.set(walkCx, 0, walkCenterZ);
            walkMesh.receiveShadow = true;
            walkMesh.userData = { isSelectableBuilding: true, building };
            groundArch.add(walkMesh);
        }
        // Transverse concrete expansion score joints on the entrance walkway (matching Building 400's pattern)
        const rampAngleZ = -Math.atan2(0.62 - 0.34, 10.25 - (-3.65));
        for (let jx = -3.65; jx <= 10.10; jx += 1.75) {
            const jy = getWalkwayTopY(jx);
            const jBar = addBox(0.025, 0.012, walkD - 0.08, swScoreMat, jx, jy + 0.006, walkCenterZ, false);
            jBar.rotation.z = rampAngleZ;
        }

        // Single-Top-Rail Weathered Galvanized Steel Pipe Handrail along the outer edge of the Entrance Walkway (lz = frontZ + 1.84m, lx = -7.05m..+8.25m)
        const railZ = frontZ + 1.84;
        const railH = 0.86;
        // Level top rail segment over Vestibule Landing (lx = -7.05m..-3.65m)
        const flatRailSpan = 3.40;
        const flatRailGeo = new THREE.CylinderGeometry(0.026, 0.026, flatRailSpan + 0.04, 12);
        flatRailGeo.rotateZ(Math.PI * 0.5);
        const flatRailMesh = new THREE.Mesh(flatRailGeo, railPipeMat);
        flatRailMesh.position.set(-5.35, 0.62 + railH, railZ);
        flatRailMesh.castShadow = true;
        arch.add(flatRailMesh);
        // Sloped top rail segment along the ADA Ramp (lx = -3.65m..+8.25m)
        const slopedRailX0 = -3.65;
        const slopedRailX1 = 8.25;
        const slopedRailY0 = getWalkwayTopY(slopedRailX0) + railH;
        const slopedRailY1 = getWalkwayTopY(slopedRailX1) + railH;
        const slopedRailLen = Math.hypot(slopedRailX1 - slopedRailX0, slopedRailY1 - slopedRailY0);
        const slopedRailGeo = new THREE.CylinderGeometry(0.026, 0.026, slopedRailLen, 12);
        slopedRailGeo.rotateZ(Math.PI * 0.5);
        const slopedRailMesh = new THREE.Mesh(slopedRailGeo, railPipeMat);
        slopedRailMesh.position.set((slopedRailX0 + slopedRailX1) * 0.5, (slopedRailY0 + slopedRailY1) * 0.5, railZ);
        slopedRailMesh.rotation.z = rampAngleZ;
        slopedRailMesh.castShadow = true;
        arch.add(slopedRailMesh);
        // Vertical tubular steel handrail posts anchored into the outer concrete walkway curb every 1.70m
        for (let rx = -7.05; rx <= 8.26; rx += 1.70) {
            const baseY = getWalkwayTopY(rx);
            const postMesh = new THREE.Mesh(
                new THREE.CylinderGeometry(0.024, 0.024, railH + 0.04, 10),
                railPipeMat
            );
            postMesh.position.set(rx, baseY + railH * 0.5, railZ);
            postMesh.castShadow = true;
            arch.add(postMesh);
        }

        // 2. ZONE 2 — THE SMALL LAWN PATCH (lz = frontZ + 1.90m .. frontZ + 4.15m, lx = -13.45m .. +9.35m — trimmed at +9.35m for the widened rounded corner apron!)
        // Smoothly graded green turf grass berm between the Entrance Walkway and the Washington St Public Sidewalk
        const lawnW = 22.80;
        const lawnD = 2.25;
        {
            const lawnGeo = new THREE.BoxGeometry(lawnW, 0.24, lawnD, 36, 1, 6);
            const lPos = lawnGeo.attributes.position;
            for (let i = 0; i < lPos.count; i++) {
                const vx = lPos.getX(i);
                const vy = lPos.getY(i);
                const vz = lPos.getZ(i);
                const lx = -2.05 + vx;
                const tz = (vz + lawnD * 0.5) / lawnD; // 0 at back (walkway), 1 at front (Washington St sidewalk)
                const backY = Math.min(0.46, getWalkwayTopY(lx) - 0.04);
                const topY = THREE.MathUtils.lerp(backY, 0.33, tz);
                lPos.setY(i, vy > 0 ? topY : 0.06);
            }
            lPos.needsUpdate = true;
            lawnGeo.computeVertexNormals();
            const lawnMesh = new THREE.Mesh(lawnGeo, lawnMat);
            lawnMesh.position.set(-2.05, 0, frontZ + 3.025);
            lawnMesh.receiveShadow = true;
            arch.add(lawnMesh);
        }

        // Municipal Yellow Fire Hydrant with Weathered Red/Green Bonnet Cap at the Douglas & Washington corner of the Small Lawn Patch (lx = +8.85m, lz = frontZ + 3.55m, fea05cee.jpg left!)
        const hydGrp = new THREE.Group();
        hydGrp.position.set(8.85, 0.34, frontZ + 3.55);
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

        // 3. ZONE 3 — THE STRAIGHT WASHINGTON ST PUBLIC CONCRETE SIDEWALK (lz = frontZ + 4.15m .. frontZ + 6.45m, lx = -13.50m .. +8.40m)
        // Stops at lx = +8.40m where the Rounded Corner & Dual ADA Curb Ramp assembly begins (fea05cee.jpg left)!
        const swWidth = 21.90; // Spans lx = -13.50m .. +8.40m
        const swDepth = 2.30;  // lz316 = 29.55m..31.85m (matches Building 300 lz300 = 37.12m..39.42m)
        const swCenterX = -2.55;
        const swCenterZ = frontZ + 5.30;
        addBox(swWidth, 0.28, swDepth, sidewalkConcreteMat, swCenterX, 0.20, swCenterZ, false);
        // Transverse expansion score joints every 1.75m matching Building 400's pattern
        for (let sx = -13.38; sx <= 8.20; sx += 1.75) {
            addBox(0.025, 0.012, swDepth - 0.22, swScoreMat, sx, 0.346, swCenterZ - 0.06, false);
        }
        // Raised Concrete Street Curb along the straight Washington St edge of the sidewalk (lz = frontZ + 6.37m = 31.77m, lx = -13.50m .. +8.40m)
        addBox(swWidth, 0.31, 0.16, whiteCurbMat, swCenterX, 0.215, frontZ + 6.37, false);

        // 4. DOUGLAS STREET (+X RIGHT SIDE) TERRAIN-CONTOURED GRASS STRIP & PUBLIC SIDEWALK (lx = douglasX = +7.91m .. +12.50m, lz = -10.55m .. +29.55m)
        // Follows the 3D topographic terrain contour along Douglas Street from Washington St (lz = +29.55m) up to the SW rear of Building 316 (lz = -10.55m)!
        // Thin white crushed-rock drip strip along the base of the Douglas St wall (lx = +7.91m..+8.09m, lz = -6.05m..+25.40m)
        addContouredDouglasStrip(douglasX, douglasX + 0.18, -6.05, 25.40, 0.33, -0.18, whitePebbleMat, 56);
        // Contoured Green Grass Lawn Strip along the right side of Building 316 facing Douglas Street (lx = +8.09m..+10.25m, lz = -6.05m..+25.40m, stopping cleanly at the SW Fire Exit stairs!)
        addContouredDouglasStrip(douglasX + 0.18, 10.25, -6.05, 25.40, 0.32, -0.18, lawnMat, 56);

        // =========================================================================
        // 5. SW REAR FIRE EXIT STAIRWELL, EXPANDED-METAL MESH GUARDRAIL, BRICK PAVER PATIO,
        //    EXPOSED-AGGREGATE PARK BENCH, 6 EDGING BLOCKS, MATURE SHADE TREE & BOLLARDS
        //    (lz = -10.55m .. -6.05m, lx = +4.56m .. +10.25m — matched to 3f533fc5.jpg, 3b6e29ad.jpg, 4aabc7f3.jpg, be709037.jpg & 9ac82efd.jpg!)
        // =========================================================================
        {
            const swStairY = getDouglasLocalGroundY(11.375, -6.75) + 0.34; // Sidewalk top elevation at the stair throat
            const patioY = getDouglasLocalGroundY(11.375, -8.85) + 0.35;   // Brick paver patio & bench elevation
            const landingY = 0.43; // Sunken concrete landing elevation (flush with the Fire Exit Door threshold!)

            // (a) Concrete Stair Throat Apron connecting Douglas St Sidewalk (lx = 10.25m) to top of steps (lx = 9.15m, lz = -7.48m..-6.00m)
            addBox(1.12, 0.38, 1.48, sidewalkConcreteMat, 9.70, swStairY - 0.19, -6.74, false);
            addBox(1.10, 0.015, 0.025, sidewalkJointMat, 9.70, swStairY + 0.006, -6.74, false);

            // (b) 5 Concrete Steps descending from lx = 9.15m (swStairY) down to Sunken Landing at lx = 6.55m (landingY, 3f533fc5.jpg!)
            const numExitSteps = 5;
            const exitStepRun = (9.15 - 6.55) / numExitSteps; // 0.52m per tread
            const exitTotalDrop = Math.max(0.45, swStairY - landingY);
            const exitStepRise = exitTotalDrop / (numExitSteps + 1);
            for (let s = 0; s < numExitSteps; s++) {
                const treadTopY = swStairY - (s + 1) * exitStepRise;
                const treadX = 9.15 - (s + 0.5) * exitStepRun;
                const stepH = Math.max(0.24, treadTopY + 0.15);
                addBox(exitStepRun + 0.02, stepH, 1.38, sidewalkConcreteMat, treadX, treadTopY - stepH * 0.5, -6.74);
                // Subtle riser shadow line
                addBox(0.02, 0.025, 1.36, sidewalkJointMat, treadX + exitStepRun * 0.5, treadTopY + 0.005, -6.74, false);
            }

            // (c) Sunken Concrete Fire Exit Landing Floor (lx = 4.56m..6.58m, lz = -10.18m..-6.02m) with expansion joint grid (3f533fc5.jpg!)
            addBox(2.04, 0.58, 4.18, sidewalkConcreteMat, 5.57, landingY - 0.29, -8.10, false);
            addBox(2.02, 0.015, 0.025, sidewalkJointMat, 5.57, landingY + 0.006, -7.48, false);
            addBox(0.025, 0.015, 4.14, sidewalkJointMat, 5.57, landingY + 0.006, -8.10, false);

            // (d) North (+Z) Sloped Concrete Stair Cheek Wall along the recessed building wall (lz = -6.00m, lx = 6.55m..9.55m, 3f533fc5.jpg & 4aabc7f3.jpg)
            const northWallLen = Math.hypot(3.00, exitTotalDrop);
            const northCheek = addBox(northWallLen, 0.36, 0.15, sidewalkConcreteMat, 8.05, (swStairY + landingY) * 0.5 + 0.14, -6.00);
            northCheek.rotation.z = Math.atan2(exitTotalDrop, 3.00);

            // (e) South (-Z) Cast-in-Place Concrete Retaining Wall separating sunken stairs from brick patio & grass (lz = -7.50m, lx = 6.55m..9.35m, 3f533fc5.jpg!)
            const southRetWallTopY = patioY + 0.36;
            const southRetWallH = southRetWallTopY - (landingY - 0.15);
            addBox(2.82, southRetWallH, 0.18, sidewalkConcreteMat, 7.95, landingY - 0.15 + southRetWallH * 0.5, -7.50);

            // (f) Pale-Yellow Painted Tubular Steel Pipe Handrail inside the South Stair Retaining Wall (lz = -7.30m, lx = 6.72m..9.18m, 3f533fc5.jpg & 4aabc7f3.jpg!)
            const yellowRailMat = new THREE.MeshStandardMaterial({ color: '#e2cf84', roughness: 0.48, metalness: 0.35 });
            const railSpanX = 2.46;
            const railLen = Math.hypot(railSpanX, exitTotalDrop * 0.82);
            const railAngle = Math.atan2(exitTotalDrop * 0.82, railSpanX);
            const yellowTopRail = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, railLen, 10), yellowRailMat);
            yellowTopRail.rotation.z = Math.PI * 0.5 - railAngle;
            yellowTopRail.position.set(7.95, (swStairY + landingY) * 0.5 + 0.78, -7.30);
            yellowTopRail.castShadow = true;
            arch.add(yellowTopRail);
            // Vertical yellow handrail posts & rusty base flanges at top and bottom steps
            [
                [9.12, swStairY - exitStepRise],
                [7.95, (swStairY + landingY) * 0.5],
                [6.78, landingY]
            ].forEach(([px, py]) => {
                const postH = 0.82;
                const pMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, postH, 10), yellowRailMat);
                pMesh.position.set(px, py + postH * 0.5, -7.30);
                pMesh.castShadow = true;
                arch.add(pMesh);
                const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.015, 12), sidewalkJointMat);
                flange.position.set(px, py + 0.008, -7.30);
                arch.add(flange);
            });

            // (g) Concrete Perimeter Curb Walls around Sunken Fire Exit Well (East wall at lx = 6.60m, South wall at lz = -10.20m, 3b6e29ad.jpg!)
            const curbTopY = patioY + 0.14;
            const curbH = curbTopY - (landingY - 0.15);
            addBox(0.18, curbH, 2.86, sidewalkConcreteMat, 6.60, landingY - 0.15 + curbH * 0.5, -8.84);
            addBox(2.14, curbH, 0.18, sidewalkConcreteMat, 5.62, landingY - 0.15 + curbH * 0.5, -10.20);

            // (h) Weathered Rust-Brown Tubular Steel Guardrail with 5 Framed Tan/Bronze Expanded-Metal Diamond Mesh Panels (3b6e29ad.jpg, 3f533fc5.jpg & be709037.jpg!)
            const rustPipeMat = new THREE.MeshStandardMaterial({ color: '#5a3d31', roughness: 0.62, metalness: 0.45 });
            const bronzeFrameMat = new THREE.MeshStandardMaterial({ color: '#9c714c', roughness: 0.55, metalness: 0.38 });
            const meshCanvas = document.createElement('canvas');
            meshCanvas.width = 128;
            meshCanvas.height = 128;
            const mCtx = meshCanvas.getContext('2d');
            mCtx.fillStyle = '#735a46';
            mCtx.fillRect(0, 0, 128, 128);
            mCtx.strokeStyle = '#b88c64';
            mCtx.lineWidth = 2.2;
            for (let d = -128; d < 256; d += 12) {
                mCtx.beginPath();
                mCtx.moveTo(d, 0);
                mCtx.lineTo(d + 128, 128);
                mCtx.moveTo(d + 128, 0);
                mCtx.lineTo(d, 128);
                mCtx.stroke();
            }
            const expandedMeshTex = new THREE.CanvasTexture(meshCanvas);
            expandedMeshTex.wrapS = THREE.RepeatWrapping;
            expandedMeshTex.wrapT = THREE.RepeatWrapping;
            expandedMeshTex.repeat.set(3, 2);
            expandedMeshTex.colorSpace = THREE.SRGBColorSpace;
            const expandedMeshMat = new THREE.MeshStandardMaterial({
                map: expandedMeshTex,
                roughness: 0.65,
                metalness: 0.35
            });

            const addMeshGuardPanel = (x0, z0, x1, z1, baseY, railH = 0.88) => {
                const dx = x1 - x0;
                const dz = z1 - z0;
                const span = Math.hypot(dx, dz);
                const cx = (x0 + x1) * 0.5;
                const cz = (z0 + z1) * 0.5;
                const rotY = Math.atan2(dx, dz);

                const pGrp = new THREE.Group();
                pGrp.position.set(cx, baseY, cz);
                pGrp.rotation.y = rotY;

                // Top dark rust-brown tubular rail & end posts
                const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, span + 0.05), rustPipeMat);
                topBar.position.set(0, railH, 0);
                pGrp.add(topBar);
                [-span * 0.5, span * 0.5].forEach((pz) => {
                    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, railH + 0.02, 10), rustPipeMat);
                    post.position.set(0, railH * 0.5, pz);
                    pGrp.add(post);
                });

                // Framed tan/bronze expanded-metal mesh inner panel
                const panelW = Math.max(0.2, span - 0.12);
                const panelH = railH - 0.14;
                const panelY = railH * 0.5 - 0.01;
                const meshPlate = new THREE.Mesh(new THREE.BoxGeometry(0.016, panelH, panelW), expandedMeshMat);
                meshPlate.position.set(0, panelY, 0);
                pGrp.add(meshPlate);
                // 4 bronze angle-iron perimeter frame bars
                const fTop = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.032, panelW + 0.04), bronzeFrameMat);
                fTop.position.set(0, panelY + panelH * 0.5, 0);
                pGrp.add(fTop);
                const fBot = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.032, panelW + 0.04), bronzeFrameMat);
                fBot.position.set(0, panelY - panelH * 0.5, 0);
                pGrp.add(fBot);
                [-panelW * 0.5, panelW * 0.5].forEach((fz) => {
                    const fSide = new THREE.Mesh(new THREE.BoxGeometry(0.032, panelH, 0.032), bronzeFrameMat);
                    fSide.position.set(0, panelY, fz);
                    pGrp.add(fSide);
                });

                arch.add(pGrp);
            };

            // 1. North short return panel atop stair dividing wall (lz = -7.50m, lx = 6.60m..7.72m, 3b6e29ad.jpg!)
            addMeshGuardPanel(7.72, -7.50, 6.60, -7.50, southRetWallTopY, 0.66);
            // 2. Two East (+X) panels along lx = 6.60m behind the park bench (lz = -7.50m..-8.85m & -8.85m..-10.20m)
            addMeshGuardPanel(6.60, -7.50, 6.60, -8.85, curbTopY, 0.88);
            addMeshGuardPanel(6.60, -8.85, 6.60, -10.20, curbTopY, 0.88);
            // 3. Two South (-Z) panels along lz = -10.20m returning to the stairwell tower wall (lx = 6.60m..5.65m & 5.65m..4.70m)
            addMeshGuardPanel(6.60, -10.20, 5.65, -10.20, curbTopY, 0.88);
            addMeshGuardPanel(5.65, -10.20, 4.70, -10.20, curbTopY, 0.88);

            // (i) Red-Brown Running-Bond Brick Paver Patio (lx = 6.69m..8.32m, lz = -10.22m..-7.55m, 3b6e29ad.jpg & 3f533fc5.jpg!)
            const paverCanvas = document.createElement('canvas');
            paverCanvas.width = 256;
            paverCanvas.height = 256;
            const pvCtx = paverCanvas.getContext('2d');
            pvCtx.fillStyle = '#8b8278';
            pvCtx.fillRect(0, 0, 256, 256);
            const basePaver = new THREE.Color('#8c584c');
            for (let r = 0; r < 16; r++) {
                const off = (r % 2) * 16;
                for (let c = -1; c <= 8; c++) {
                    const j = ((Math.sin(r * 19.1 + c * 29.3) * 43758.5) % 1) * 0.05 - 0.025;
                    const col = basePaver.clone().offsetHSL(0, j * 0.25, j);
                    pvCtx.fillStyle = `#${col.getHexString()}`;
                    pvCtx.fillRect(c * 32 + off + 2, r * 16 + 2, 28, 12);
                }
            }
            const brickPaverTex = new THREE.CanvasTexture(paverCanvas);
            brickPaverTex.wrapS = THREE.RepeatWrapping;
            brickPaverTex.wrapT = THREE.RepeatWrapping;
            brickPaverTex.repeat.set(2.5, 4.0);
            brickPaverTex.colorSpace = THREE.SRGBColorSpace;
            const brickPaverMat = new THREE.MeshStandardMaterial({
                map: brickPaverTex,
                roughness: 0.88,
                metalness: 0.02,
                polygonOffset: true,
                polygonOffsetFactor: -2,
                polygonOffsetUnits: -2
            });
            addBox(1.64, 0.45, 2.68, brickPaverMat, 7.50, patioY - 0.225, -8.88, false);
            // Concrete rear driveway curb bordering the south edge of the brick patio & grass patch (lz = -10.30m, lx = 6.60m..10.25m)
            addBox(3.65, 0.48, 0.16, sidewalkConcreteMat, 8.425, patioY - 0.21, -10.30, false);

            // (j) 6 Gray Beveled Concrete Landscape Edging Blocks separating the Brick Patio from the Grass Patch (lx = 8.35m, lz = -10.05m..-7.75m, 3b6e29ad.jpg & 3f533fc5.jpg!)
            for (let b = 0; b < 6; b++) {
                const bz = -7.80 - b * 0.44;
                addBox(0.28, 0.16, 0.38, sidewalkJointMat, 8.35, patioY - 0.02, bz);
                addBox(0.24, 0.04, 0.34, sidewalkConcreteMat, 8.35, patioY + 0.06, bz);
            }

            // (k) Ornate Precast Concrete & Exposed-Aggregate Park Bench on the Brick Patio (lx = 7.22m, lz = -8.88m, 3b6e29ad.jpg & 3f533fc5.jpg!)
            {
                const benchX = 7.22;
                const benchZ = -8.88;
                // Procedural exposed river-pebble aggregate texture for bench top slab
                const aggCanvas = document.createElement('canvas');
                aggCanvas.width = 128;
                aggCanvas.height = 128;
                const agCtx = aggCanvas.getContext('2d');
                agCtx.fillStyle = '#b8b2a6';
                agCtx.fillRect(0, 0, 128, 128);
                const pebbleColors = ['#6d6860', '#968f84', '#d8d2c7', '#524e48', '#afa89c'];
                for (let i = 0; i < 420; i++) {
                    agCtx.fillStyle = pebbleColors[i % pebbleColors.length];
                    const px = (i * 37) % 124;
                    const py = (i * 53) % 124;
                    agCtx.fillRect(px, py, 4, 3);
                }
                const benchAggTex = new THREE.CanvasTexture(aggCanvas);
                benchAggTex.wrapS = THREE.RepeatWrapping;
                benchAggTex.wrapT = THREE.RepeatWrapping;
                benchAggTex.repeat.set(3, 1);
                benchAggTex.colorSpace = THREE.SRGBColorSpace;
                const benchAggMat = new THREE.MeshStandardMaterial({ map: benchAggTex, roughness: 0.90, metalness: 0.02 });

                // Two sculpted white precast concrete pedestal legs (at lz = benchZ - 0.46m and benchZ + 0.46m)
                [-0.46, 0.46].forEach((dz) => {
                    const lzPos = benchZ + dz;
                    // Base foot plinth, fluted waist column & top capital support
                    addBox(0.40, 0.08, 0.18, whiteTrimMat, benchX, patioY + 0.04, lzPos);
                    addBox(0.32, 0.24, 0.14, whiteTrimMat, benchX, patioY + 0.20, lzPos);
                    addBox(0.38, 0.07, 0.17, whiteTrimMat, benchX, patioY + 0.355, lzPos);
                });
                // Exposed-aggregate pebble bench seat slab (1.42m long x 0.44m wide x 0.085m thick)
                addBox(0.44, 0.085, 1.42, benchAggMat, benchX, patioY + 0.43, benchZ);
            }

            // (l) Contoured South Grass Patch between the 6 Edging Stones (lx = 8.48m) and Douglas St Sidewalk (lx = 10.25m, lz = -10.22m..-7.52m, 4aabc7f3.jpg!)
            addContouredDouglasStrip(8.46, 10.25, -10.25, -7.52, 0.33, -0.18, lawnMat, 16);

            // (m) South Grass Patch left clear of pre-made trees for user planting via TreePlanterFoundry

            // (n) Two Yellow/Cream Steel Protective Bollards & Tall Rust-Brown Utility Post at the Driveway Corner (lx = 8.88m..9.82m, lz = -10.45m, 4aabc7f3.jpg, be709037.jpg & 9ac82efd.jpg!)
            const bollardBaseY = getDouglasLocalGroundY(11.375, -10.45) + 0.26;
            const bollardYellowMat = new THREE.MeshStandardMaterial({ color: '#e5be3c', roughness: 0.45, metalness: 0.22 });
            [8.88, 9.82].forEach((bx) => {
                const bPost = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.92, 14), bollardYellowMat);
                bPost.position.set(bx, bollardBaseY + 0.46, -10.45);
                bPost.castShadow = true;
                arch.add(bPost);
            });
            // Tall rust-brown steel standpipe / card-reader post between the two bollards (4aabc7f3.jpg & be709037.jpg!)
            const utilPost = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 1.14, 14), rustPipeMat);
            utilPost.position.set(9.35, bollardBaseY + 0.57, -10.45);
            utilPost.castShadow = true;
            arch.add(utilPost);
            addBox(0.16, 0.22, 0.14, rustPipeMat, 9.35, bollardBaseY + 0.98, -10.45);
        }

        // Terrain-Contoured Straight Douglas Street Concrete Public Sidewalk (lx = +10.25m..+12.50m, lz = -10.55m..+26.50m — meets the Rounded Corner Bulb & ADA Ramp at lz = +26.50m!)
        const dougSwW = 2.25;
        const dougSwCenterX = 10.25 + dougSwW * 0.5; // +11.375m
        addContouredDouglasStrip(10.25, 12.50, -10.55, 26.50, 0.34, -0.20, sidewalkConcreteMat, 68);
        // Transverse expansion score joints every 1.75m matching Building 400's pattern (no longitudinal center line, inset from outer curb)
        for (let sz = -9.60; sz <= 26.20; sz += 1.75) {
            const yHere = getDouglasLocalGroundY(dougSwCenterX, sz);
            const yPrev = getDouglasLocalGroundY(dougSwCenterX, sz - 0.35);
            const yNext = getDouglasLocalGroundY(dougSwCenterX, sz + 0.35);
            const jMesh = addBox(dougSwW - 0.22, 0.012, 0.025, swScoreMat, dougSwCenterX - 0.06, yHere + 0.346, sz, false);
            jMesh.rotation.x = Math.atan2(yPrev - yNext, 0.70);
        }
        // Terrain-Contoured Raised Concrete Street Curb along the straight Douglas St edge of the sidewalk (lx = +12.34m..+12.50m, lz = -10.55m..+23.50m)
        addContouredDouglasStrip(12.34, 12.50, -10.55, 23.50, 0.37, -0.20, whiteCurbMat, 62);
        // Yellow-painted no-parking street curb zone ahead of the parked SUV on Douglas St (lz = +23.50m..+26.50m, fea05cee.jpg left!)
        const yellowCurb316Mat = new THREE.MeshStandardMaterial({
            color: '#d9a726',
            roughness: 0.72,
            metalness: 0.05,
            polygonOffset: true,
            polygonOffsetFactor: -3,
            polygonOffsetUnits: -3
        });
        addContouredDouglasStrip(12.34, 12.50, 23.50, 26.50, 0.37, -0.20, yellowCurb316Mat, 10);
        // Flared Concrete Driveway Curb Return at the SW rear end of the Douglas St sidewalk (lz = -10.55m)
        const swEndY = getDouglasLocalGroundY(dougSwCenterX, -10.55);
        addBox(dougSwW + 0.02, 0.45, 0.16, whiteCurbMat, dougSwCenterX, swEndY + 0.145, -10.47, false);

        // =========================================================================
        // DOUGLAS ST & WASHINGTON ST ROUNDED CORNER BULB-OUT, DUAL SLOPED ADA CURB RAMPS,
        // RED-BRICK TACTILE WARNING PADS, 3 BLACK BOLLARDS & STOP/STREET SIGN (fea05cee.jpg left!)
        // =========================================================================
        {
            const tactileBrick316Mat = new THREE.MeshStandardMaterial({
                color: '#8e3b2e',
                roughness: 0.86,
                metalness: 0.04,
                polygonOffset: true,
                polygonOffsetFactor: -4,
                polygonOffsetUnits: -4
            });
            const stopRedMat = new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.48, metalness: 0.15 });
            const stopBackMat = new THREE.MeshStandardMaterial({ color: '#7d858d', roughness: 0.52, metalness: 0.35 });

            const pushSlabQuad316 = (arr, ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) => {
                arr.push(ax, ay, az, bx, by, bz, cx, cy, cz);
                arr.push(ax, ay, az, cx, cy, cz, dx, dy, dz);
            };
            const buildVertexSlab316 = (verts, mat) => {
                const g = new THREE.BufferGeometry();
                g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
                g.computeVertexNormals();
                const m = new THREE.Mesh(g, mat);
                m.receiveShadow = true;
                m.userData = { isSelectableBuilding: true, building };
                groundArch.add(m);
                return m;
            };

            // 1. S-Curve Curb Bulb-Out Transition along Douglas St (lz = 26.50m .. 27.65m,
            //    flaring outer curb from lx = 12.50m out to lx = 13.35m beside the fire hydrant & STOP sign in fea05cee.jpg left!)
            const flareZ0 = 26.50;
            const flareZ1 = 27.65;
            const flareInnerX = 9.35;
            const flareSteps = 8;
            const flareOuterX = (z) => {
                const t = THREE.MathUtils.clamp((z - flareZ0) / (flareZ1 - flareZ0), 0, 1);
                const s = 0.5 - 0.5 * Math.cos(Math.PI * t);
                return THREE.MathUtils.lerp(12.50, 13.35, s);
            };

            const bulbVerts316 = [];
            const bulbCurbVerts316 = [];
            for (let i = 0; i < flareSteps; i++) {
                const zA = flareZ0 + (i / flareSteps) * (flareZ1 - flareZ0);
                const zB = flareZ0 + ((i + 1) / flareSteps) * (flareZ1 - flareZ0);
                const xOutA = flareOuterX(zA);
                const xOutB = flareOuterX(zB);
                const xCurbInA = xOutA - 0.16;
                const xCurbInB = xOutB - 0.16;
                const topY = 0.34;
                const botY = -0.20;

                pushSlabQuad316(bulbVerts316, flareInnerX, topY, zA, flareInnerX, topY, zB, xCurbInB, topY, zB, xCurbInA, topY, zA);
                const cTop = topY + 0.03;
                pushSlabQuad316(bulbCurbVerts316, xCurbInA, cTop, zA, xCurbInB, cTop, zB, xOutB, cTop, zB, xOutA, cTop, zA);
                pushSlabQuad316(bulbCurbVerts316, xOutA, cTop, zA, xOutB, cTop, zB, xOutB, botY, zB, xOutA, botY, zA);
                pushSlabQuad316(bulbCurbVerts316, xCurbInB, cTop, zB, xCurbInA, cTop, zA, xCurbInA, botY, zA, xCurbInB, botY, zB);
            }
            buildVertexSlab316(bulbVerts316, sidewalkConcreteMat);
            buildVertexSlab316(bulbCurbVerts316, whiteCurbMat);

            // 2. Smooth Quarter-Ellipse Rounded Corner & Dual Sloped ADA Curb Ramps (theta = 0 .. PI/2,
            //    from (lx = 13.35m, lz = 27.65m) around to (lx = 8.40m, lz = 31.85m), centered at (8.40m, 27.65m))
            const cCX = 8.40;
            const cCZ = 27.65;
            const cRX = 4.95; // 8.40 + 4.95 = 13.35m (flush with Douglas St bulb-out nose)
            const cRZ = 4.20; // 27.65 + 4.20 = 31.85m (flush with Washington St sidewalk outer edge)
            const cSegs = 24;
            const cRadSteps = 6;

            const getAdaDrop316 = (theta) => {
                const dougRamp =
                    THREE.MathUtils.smoothstep(theta, 0.02, 0.09) *
                    (1.0 - THREE.MathUtils.smoothstep(theta, 0.28, 0.36));
                const washRamp =
                    THREE.MathUtils.smoothstep(theta, 0.44, 0.54) *
                    (1.0 - THREE.MathUtils.smoothstep(theta, 1.12, 1.24));
                return Math.max(dougRamp, washRamp);
            };

            const cornerSlabVerts316 = [];
            const cornerCurbVerts316 = [];
            for (let s = 0; s < cSegs; s++) {
                const th0 = (s / cSegs) * (Math.PI * 0.5);
                const th1 = ((s + 1) / cSegs) * (Math.PI * 0.5);
                const drop0 = getAdaDrop316(th0);
                const drop1 = getAdaDrop316(th1);

                for (let r = 0; r < cRadSteps; r++) {
                    const u0 = r / cRadSteps;
                    const u1 = (r + 1) / cRadSteps;
                    const samplePt = (th, u, drop) => {
                        const px = cCX + u * (cRX - 0.16) * Math.cos(th);
                        const pz = cCZ + u * (cRZ - 0.16) * Math.sin(th);
                        const rampFactor = THREE.MathUtils.smoothstep(u, 0.42, 1.0) * drop;
                        const py = 0.34 - rampFactor * 0.075;
                        return [px, py, pz];
                    };
                    const p00 = samplePt(th0, u0, drop0);
                    const p10 = samplePt(th1, u0, drop1);
                    const p11 = samplePt(th1, u1, drop1);
                    const p01 = samplePt(th0, u1, drop0);
                    pushSlabQuad316(
                        cornerSlabVerts316,
                        p00[0], p00[1], p00[2],
                        p10[0], p10[1], p10[2],
                        p11[0], p11[1], p11[2],
                        p01[0], p01[1], p01[2]
                    );
                }

                // Outer curved white concrete street curb (lowered flush at ADA ramp throats!)
                const cInX0 = cCX + (cRX - 0.16) * Math.cos(th0);
                const cInZ0 = cCZ + (cRZ - 0.16) * Math.sin(th0);
                const cOutX0 = cCX + cRX * Math.cos(th0);
                const cOutZ0 = cCZ + cRZ * Math.sin(th0);
                const cInX1 = cCX + (cRX - 0.16) * Math.cos(th1);
                const cInZ1 = cCZ + (cRZ - 0.16) * Math.sin(th1);
                const cOutX1 = cCX + cRX * Math.cos(th1);
                const cOutZ1 = cCZ + cRZ * Math.sin(th1);

                const cTop0 = 0.34 + THREE.MathUtils.lerp(0.03, -0.072, drop0);
                const cTop1 = 0.34 + THREE.MathUtils.lerp(0.03, -0.072, drop1);
                const botY = -0.20;

                pushSlabQuad316(cornerCurbVerts316, cInX0, cTop0, cInZ0, cInX1, cTop1, cInZ1, cOutX1, cTop1, cOutZ1, cOutX0, cTop0, cOutZ0);
                pushSlabQuad316(cornerCurbVerts316, cOutX0, cTop0, cOutZ0, cOutX1, cTop1, cOutZ1, cOutX1, botY, cOutZ1, cOutX0, botY, cOutZ0);
                pushSlabQuad316(cornerCurbVerts316, cInX1, cTop1, cInZ1, cInX0, cTop0, cInZ0, cInX0, botY, cInZ0, cInX1, botY, cInZ1);
            }
            buildVertexSlab316(cornerSlabVerts316, sidewalkConcreteMat);
            buildVertexSlab316(cornerCurbVerts316, whiteCurbMat);

            // 3. Radial & Concentric Expansion Score Joints across Building 316's Rounded Corner (fea05cee.jpg left)
            for (const thJ of [0.18, 0.48, 0.84, 1.18, 1.44]) {
                const dropJ = getAdaDrop316(thJ);
                const rInner = 1.65;
                const x0 = cCX + rInner * Math.cos(thJ);
                const z0 = cCZ + rInner * Math.sin(thJ);
                const x1 = cCX + (cRX - 0.22) * Math.cos(thJ);
                const z1 = cCZ + (cRZ - 0.22) * Math.sin(thJ);
                const mx = (x0 + x1) * 0.5;
                const mz = (z0 + z1) * 0.5;
                const len = Math.hypot(x1 - x0, z1 - z0);
                const my = 0.34 - dropJ * 0.035 + 0.008;
                const jBar = addBox(0.025, 0.012, len, swScoreMat, mx, my, mz, false);
                jBar.rotation.y = Math.atan2(x1 - x0, z1 - z0);
            }
            for (let s = 0; s < 12; s++) {
                const thM = ((s + 0.5) / 12) * (Math.PI * 0.5);
                const ax = cCX + (cRX - 1.38) * Math.cos(thM);
                const az = cCZ + (cRZ - 1.38) * Math.sin(thM);
                const aBar = addBox(0.025, 0.012, 0.42, swScoreMat, ax, 0.348, az, false);
                aBar.rotation.y = Math.atan2(-(cRX - 1.38) * Math.sin(thM), (cRZ - 1.38) * Math.cos(thM));
            }

            // 4. Two Red-Brick / Terracotta Tactile Warning Pads on Building 316's Rounded Corner (fea05cee.jpg left):
            //    (a) Douglas St Crosswalk Tactile Pad (2 arc segments at theta = 0.08..0.32)
            //    (b) Washington St Corner ADA Ramp Curved Tactile Pad (4 arc segments at theta = 0.52..1.14)
            const addCurvedTactile316 = (thStart, thEnd, segCount) => {
                for (let i = 0; i < segCount; i++) {
                    const tA = thStart + (i / segCount) * (thEnd - thStart);
                    const tB = thStart + ((i + 1) / segCount) * (thEnd - thStart);
                    const tM = 0.5 * (tA + tB);
                    const dropM = getAdaDrop316(tM);
                    const tx = cCX + (cRX - 0.52) * Math.cos(tM);
                    const tz = cCZ + (cRZ - 0.52) * Math.sin(tM);
                    const ty = 0.34 - dropM * 0.068 + 0.012;
                    const segLen = Math.hypot(
                        (cRX - 0.52) * (Math.cos(tB) - Math.cos(tA)),
                        (cRZ - 0.52) * (Math.sin(tB) - Math.sin(tA))
                    ) - 0.03;
                    const pad = addBox(0.56, 0.022, segLen, tactileBrick316Mat, tx, ty, tz, false);
                    pad.rotation.y = Math.atan2(
                        -(cRX - 0.52) * Math.sin(tM),
                        (cRZ - 0.52) * Math.cos(tM)
                    );
                }
            };
            addCurvedTactile316(0.07, 0.31, 2); // Douglas St tactile warning pad
            addCurvedTactile316(0.50, 1.14, 4); // Washington St corner ADA ramp curved tactile pad

            // 5. Three Black Cylindrical Steel Pipe Bollards on Building 316's Rounded Corner (fea05cee.jpg left:
            //    1 behind the Douglas St tactile pad, and 2 along the Washington St curb to the left of the ADA ramp)
            for (const [bx, bz] of [
                [12.15, 28.25],
                [8.45, 31.18],
                [6.85, 31.18]
            ]) {
                const bGrp = new THREE.Group();
                bGrp.position.set(bx, 0.34, bz);
                const bFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.03, 16), darkBronzeMat);
                bFlange.position.y = 0.015;
                bGrp.add(bFlange);
                const bShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.88, 16), darkBronzeMat);
                bShaft.position.y = 0.44;
                bShaft.castShadow = true;
                bGrp.add(bShaft);
                const bCap = new THREE.Mesh(new THREE.SphereGeometry(0.082, 12, 8), darkBronzeMat);
                bCap.position.y = 0.88;
                bGrp.add(bCap);
                groundArch.add(bGrp);
            }

            // 6. Octagonal STOP Sign + Green "Washington St / Douglas St" Street Name Blades at the Corner (fea05cee.jpg left)
            const signX = 10.35;
            const signZ = 27.65;
            const streetSignMat = new THREE.MeshStandardMaterial({ color: '#1b6b3a', roughness: 0.45, metalness: 0.18 });
            addBox(0.048, 2.55, 0.048, galvSteelMat, signX, 0.34 + 1.275, signZ);
            addBox(0.82, 0.18, 0.03, streetSignMat, signX, 0.34 + 2.52, signZ);
            addBox(0.03, 0.18, 0.74, streetSignMat, signX, 0.34 + 2.32, signZ);
            // Octagonal STOP sign plate mounted below the green street name blades (facing northbound Douglas St traffic)
            const stopOct = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.025, 8), [stopBackMat, stopRedMat, stopBackMat]);
            stopOct.rotation.z = Math.PI * 0.5;
            stopOct.rotation.y = Math.PI / 8;
            stopOct.position.set(signX + 0.02, 0.34 + 1.85, signZ);
            stopOct.castShadow = true;
            groundArch.add(stopOct);
        }

        // Street Parking Signpost along Washington St sidewalk curb (lx = -1.40m, lz = frontZ + 6.18m)
        addBox(0.05, 2.45, 0.05, galvSteelMat, -1.40, 1.45, frontZ + 6.18);
        addBox(0.32, 0.46, 0.02, whiteTrimMat, -1.40, 2.35, frontZ + 6.18); // Upper parking sign plate
        addBox(0.32, 0.38, 0.02, whiteTrimMat, -1.40, 1.88, frontZ + 6.18); // Lower parking sign plate

        // =========================================================================
        // 6. TERRAIN-SLOPING CONCRETE PARKING LOT IN FRONT OF THE GYM & BEHIND BUILDING 316
        //    (lx = -14.70m .. +12.50m, lz = -43.51m .. -6.05m)
        //    Uses the exact subdivided terrain-conforming concrete algorithm (`addGradedQuad` + `addGradedWallSegment` + `concreteMat`)
        //    from Building 411/412 & Building 400 so the entire parking lot in front of the Gym & Sallyport and behind Building 316
        //    slopes naturally with the 3D terrain contour and connects seamlessly to all building foundations and Douglas Street.
        // =========================================================================
        {
            const walkCan = document.createElement('canvas');
            walkCan.width = 512;
            walkCan.height = 512;
            const wCtx = walkCan.getContext('2d');
            wCtx.fillStyle = '#cbc8c0';
            wCtx.fillRect(0, 0, 512, 512);
            for (let i = 0; i < 3000; i++) {
                wCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(70,68,62,0.06)';
                wCtx.fillRect((i * 73) % 512, (i * 137) % 512, 5, 2);
            }
            wCtx.strokeStyle = 'rgba(85, 82, 76, 0.38)';
            wCtx.lineWidth = 2;
            for (let g = 128; g < 512; g += 128) {
                wCtx.beginPath();
                wCtx.moveTo(g, 0);
                wCtx.lineTo(g, 512);
                wCtx.moveTo(0, g);
                wCtx.lineTo(512, g);
                wCtx.stroke();
            }
            const walkTex = new THREE.CanvasTexture(walkCan);
            walkTex.wrapS = THREE.RepeatWrapping;
            walkTex.wrapT = THREE.RepeatWrapping;
            walkTex.repeat.set(2, 2);
            walkTex.colorSpace = THREE.SRGBColorSpace;

            const concreteMat = new THREE.MeshStandardMaterial({
                map: walkTex,
                roughness: 0.85,
                metalness: 0.03,
                polygonOffset: true,
                polygonOffsetFactor: -2,
                polygonOffsetUnits: -2
            });

            const yLotTerrainGrade = (lx, lz) => {
                if (typeof getTerrainHeightFn === 'function') {
                    const wx = bldgCx316 + lx * cosT316 + lz * sinT316;
                    const wz = bldgCz316 - lx * sinT316 + lz * cosT316;
                    return getTerrainHeightFn(wx, wz) - terrainY;
                }
                return 0.0;
            };

            const yGymParkingLot = (lx, lz) => {
                const terrY = yLotTerrainGrade(lx, lz);
                // Smoothly transition from +0.18m at the Gym/Sallyport wall & 316 rear foundation to +0.14m across the sloped terrain
                const tWallX = THREE.MathUtils.smoothstep(lx, -13.35, -7.50);
                const hBias = THREE.MathUtils.lerp(0.185, 0.14, tWallX);
                const yBase = Math.max(0.18, terrY + hBias);
                // At the Douglas St sidewalk return (lz = -10.30m, lx = 8.40m .. 12.50m), blend cleanly to the sidewalk/driveway apron grade
                const wDougApron =
                    THREE.MathUtils.smoothstep(lx, 7.50, 10.25) *
                    THREE.MathUtils.smoothstep(lz, -13.50, -10.30);
                const yDougApron = getDouglasLocalGroundY(11.375, -10.55) + 0.28;
                return THREE.MathUtils.lerp(yBase, Math.max(yBase, yDougApron), wDougApron);
            };

            const addGradedQuad = (p00, p10, p11, p01, mat, yBias = 0) => {
                const geom = new THREE.BufferGeometry();
                const crossY = (p10[2] - p00[2]) * (p11[0] - p00[0]) - (p10[0] - p00[0]) * (p11[2] - p00[2]);
                const [a, b, c, d] = crossY >= 0 ? [p00, p10, p11, p01] : [p00, p01, p11, p10];
                const verts = new Float32Array([
                    a[0], a[1] + yBias, a[2],
                    b[0], b[1] + yBias, b[2],
                    c[0], c[1] + yBias, c[2],
                    a[0], a[1] + yBias, a[2],
                    c[0], c[1] + yBias, c[2],
                    d[0], d[1] + yBias, d[2]
                ]);
                const uvs = new Float32Array([
                    a[0] * 0.25, a[2] * 0.25,
                    b[0] * 0.25, b[2] * 0.25,
                    c[0] * 0.25, c[2] * 0.25,
                    a[0] * 0.25, a[2] * 0.25,
                    c[0] * 0.25, c[2] * 0.25,
                    d[0] * 0.25, d[2] * 0.25
                ]);
                geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
                geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
                geom.computeVertexNormals();
                const m = new THREE.Mesh(geom, mat);
                m.receiveShadow = true;
                m.userData = { isSelectableBuilding: true, building };
                arch.add(m);
                return m;
            };

            const addGradedWallSegment = (x0, z0, x1, z1, thick, yTopOrFn, wallMat) => {
                const dx = x1 - x0;
                const dz = z1 - z0;
                const len = Math.hypot(dx, dz);
                const steps = Math.max(1, Math.ceil(len / 2.2));
                const angle = Math.atan2(dz, dx);
                const evalTop = (px, pz) => (typeof yTopOrFn === 'function' ? yTopOrFn(px, pz) : yTopOrFn);
                for (let i = 0; i < steps; i++) {
                    const t0 = i / steps;
                    const t1 = (i + 1) / steps;
                    const tm = 0.5 * (t0 + t1);
                    const xA = x0 + dx * t0, zA = z0 + dz * t0;
                    const xB = x0 + dx * t1, zB = z0 + dz * t1;
                    const mx = x0 + dx * tm, mz = z0 + dz * tm;
                    const segLen = (len / steps) + 0.02;
                    const topA = evalTop(xA, zA);
                    const topB = evalTop(xB, zB);
                    const yTop = 0.5 * (topA + topB);
                    const yBot = Math.min(yLotTerrainGrade(mx, mz) - 0.22, yTop - 0.38);
                    const bodyH = Math.max(0.20, yTop - yBot);
                    const slopeAlong = Math.atan2(topB - topA, len / steps);

                    const segGroup = new THREE.Group();
                    segGroup.position.set(mx, 0, mz);
                    segGroup.rotation.y = -angle;

                    const body = new THREE.Mesh(new THREE.BoxGeometry(segLen, bodyH, thick), wallMat);
                    body.position.set(0, yBot + bodyH * 0.5, 0);
                    body.rotation.z = slopeAlong;
                    body.castShadow = true;
                    body.receiveShadow = true;
                    segGroup.add(body);
                    arch.add(segGroup);
                }
            };

            // Multi-span grid hugging the stepped walls of the Sallyport, Gym (+X wall at lx = -14.70m / -13.35m),
            // Building 316 Rear Wall (lz = -6.05m), Stairwell Core Tower (lz = -10.30m), South Driveway Curb (lz = -10.30m),
            // and Douglas Street (lx = +12.50m) down to the SW rear corner of the Gym (lz = -43.51m)
            const gymParkingSpans = [
                // 1. Sallyport Garage Door Alcove (lx = -14.70m .. -13.35m, lz = -10.49m .. -2.12m)
                { xStart: -14.70, xEnd: -13.35, zStart: -10.49, zEnd: -2.12, xSteps: 2, zSteps: 6 },
                // 2. Connector Pocket between Sallyport & Building 316 SE Courtyard Wall (lx = -13.35m .. -11.07m, lz = -10.30m .. -2.12m)
                { xStart: -13.35, xEnd: -11.07, zStart: -10.30, zEnd: -2.12, xSteps: 2, zSteps: 6 },
                // 3. Bay directly behind Building 316 East Rear Wing (lx = -11.07m .. -3.66m, lz = -10.30m .. -6.05m)
                { xStart: -11.07, xEnd: -3.66, zStart: -10.30, zEnd: -6.05, xSteps: 6, zSteps: 4 },
                // 4. Main Parking Lot in front of the Gym & Sallyport, behind Building 316 out to Douglas St (lx = -13.35m .. +12.50m, lz = -43.51m .. -10.30m)
                { xStart: -13.35, xEnd: 12.50, zStart: -43.51, zEnd: -10.30, xSteps: 18, zSteps: 22 }
            ];

            gymParkingSpans.forEach(({ xStart, xEnd, zStart, zEnd, xSteps, zSteps }) => {
                for (let ix = 0; ix < xSteps; ix++) {
                    const x0 = xStart + ((xEnd - xStart) * ix) / xSteps;
                    const x1 = xStart + ((xEnd - xStart) * (ix + 1)) / xSteps;
                    for (let iz = 0; iz < zSteps; iz++) {
                        const z0 = zStart + ((zEnd - zStart) * iz) / zSteps;
                        const z1 = zStart + ((zEnd - zStart) * (iz + 1)) / zSteps;
                        addGradedQuad(
                            [x0, yGymParkingLot(x0, z0), z0],
                            [x1, yGymParkingLot(x1, z0), z0],
                            [x1, yGymParkingLot(x1, z1), z1],
                            [x0, yGymParkingLot(x0, z1), z1],
                            concreteMat
                        );
                    }
                }
            });

            // Perimeter concrete edge skirts along the SW service road edge (lz = -43.51m) and Douglas St edge (lx = +12.50m)
            addGradedWallSegment(-13.35, -43.51, 12.50, -43.51, 0.18, (px, pz) => yGymParkingLot(px, pz), concreteMat);
            addGradedWallSegment(12.50, -43.51, 12.50, -10.30, 0.18, (px, pz) => yGymParkingLot(px, pz), concreteMat);
        }
}