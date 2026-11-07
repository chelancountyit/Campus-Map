import * as THREE from 'three';

export function buildBuilding300DetentionAndGym(ctx) {
    const {
        foundry, building, arch, addBox,
        varBrickMat, tanPrecastMat, plinthBeigeMat, recCreamMat, silverFlashingMat,
        darkFasciaMat, roofMembraneMat, gymRoofMat, securityMeshMat, slotGlassMat,
        whiteDoorMat, blackIronMat, bollardYellowMat, plazaConcreteMat, plazaJointMat,
        pipeRailMat, hedgeGreenMat, hedgeRedMat, turfLawnMat
    } = ctx;

        // B. ORONDO AVE (SE SIDE) DETENTION WING & CHAMFERED CORNER POCKETS
        // Matched directly to the high-res bird's-eye photo (28619543.jpg) and street-level close-ups (c5e2718f.jpg, b5ec68b4.jpg, c4cb0ae6.jpg, 7836d2e7.jpg):
        //   - Custom 2D polygonal extrusion for the entire Orondo Detention Wing (y = 0.0m..5.55m) with:
        //       * Angled 2-segment chamfers at the North-West corner ((-24.18, 12.20) -> (-18.10, 14.35) -> (-15.80, 18.78))
        //         and South-West corner ((-24.38, -14.80) -> (-18.20, -16.95) -> (-15.80, -21.80))
        //       * Central step-in recess on Orondo Ave (lx = -24.28m stepping in to -20.96m across lz = -3.65m..+0.40m)
        //       * Rear step-in at the Gymnasium junction (lx = -2.89m..+0.59m at lz = -20.20m)
        //   - Continuous silver sheet-metal parapet coping following every straight & diagonal edge of the roof perimeter
        //   - Paired rooftop exhaust vents, rectangular hatch curb, and central E-W roof control seam matching 28619543.jpg!
        // =========================================================================
        const detRoofY = 5.55;
        const detBrickTop = 4.65;

        // Exact 14-vertex polygon (lx, lz) of the Orondo Detention Wing roof matched to DJI drone photo (dji_fly_20230907_112120_109_1694110999879_photo (1).jpg) & green reference lines:
        // Each corner has a 3-segment chamfered pocket:
        //   1. Straight +X segment perpendicular to Orondo Ave (pStart -> pApex)
        //   2. Angled diagonal segment (pApex -> pMid)
        //   3. Straight segment parallel to Orondo Ave along +/-Z (pMid -> pEnd) meeting the North/South wall!
        const detPolyPts = [
            [-2.89, 22.28],   // 0: NE corner (steps 3.50m North of lz = 18.78m!)
            [-17.80, 22.28],  // 1: North wall inner corner at North Rec Yard (pEnd)
            [-17.80, 18.20],  // 2: North Rec Yard intermediate bend (pMid — parallel to Orondo Ave from pEnd!)
            [-20.50, 14.60],  // 3: North Rec Yard inner apex (pApex — diagonal from pMid!)
            [-24.18, 14.60],  // 4: North Rec Yard Orondo (-X) corner (pStart — perpendicular to Orondo Ave!)
            [-24.18, 0.40],   // 5: North Pod South-West corner at Central Notch
            [-20.96, 0.40],   // 6: Central Notch North inner corner
            [-20.96, -3.65],  // 7: Central Notch South inner corner
            [-24.38, -3.65],  // 8: South Pod North-West corner at Central Notch
            [-24.38, -18.00], // 9: South Rec Yard Orondo (-X) corner (pStart — perpendicular to Orondo Ave!)
            [-20.70, -18.00], // 10: South Rec Yard inner apex (pApex — straight +X from pStart!)
            [-18.00, -21.80], // 11: South Rec Yard intermediate bend (pMid — diagonal from pApex!)
            [-18.00, -25.60], // 12: South wall inner corner at South Rec Yard (pEnd — parallel to Orondo Ave!)
            [-2.89, -25.60]   // 13: SE corner (steps 4.04m South of lz = -21.56m!)
        ];

        const detWingShape = new THREE.Shape();
        detPolyPts.forEach(([px, pz], idx) => {
            if (idx === 0) detWingShape.moveTo(px, -pz);
            else detWingShape.lineTo(px, -pz);
        });
        detWingShape.closePath();

        // 1. Sub-grade foundation & Smooth Beige Concrete Base Plinth (y = -5.50m..+0.72m)
        const detPlinthGeo = new THREE.ExtrudeGeometry(detWingShape, { depth: 6.22, bevelEnabled: false });
        detPlinthGeo.rotateX(-Math.PI / 2);
        const detPlinthMesh = new THREE.Mesh(detPlinthGeo, plinthBeigeMat);
        detPlinthMesh.position.y = -5.50;
        detPlinthMesh.receiveShadow = true;
        arch.add(detPlinthMesh);

        // 2. 2-Course Gray/Charcoal Base Accent Brick Band (y = 0.72m..0.88m, c4cb0ae6.jpg & 4ba0e364.jpg)
        const detGrayGeo = new THREE.ExtrudeGeometry(detWingShape, { depth: 0.16, bevelEnabled: false });
        detGrayGeo.rotateX(-Math.PI / 2);
        const detGrayMesh = new THREE.Mesh(detGrayGeo, plazaJointMat);
        detGrayMesh.position.y = 0.72;
        arch.add(detGrayMesh);

        // 3. Main Variegated Tan/Gold/Brown Brick Mass (y = 0.88m..4.65m)
        const detBrickGeo = new THREE.ExtrudeGeometry(detWingShape, { depth: detBrickTop - 0.88, bevelEnabled: false });
        detBrickGeo.rotateX(-Math.PI / 2);
        foundry._applyArchitecturalUVs(detBrickGeo, detBrickTop - 0.88, 1.15);
        const detBrickMesh = new THREE.Mesh(detBrickGeo, varBrickMat);
        detBrickMesh.position.y = 0.88;
        detBrickMesh.castShadow = true;
        detBrickMesh.receiveShadow = true;
        detBrickMesh.userData = { isSelectableBuilding: true, building };
        arch.add(detBrickMesh);

        // 4. Upper Smooth Beige Precast Frieze Band & Light-Gray TPO Membrane Roof Deck (y = 4.65m..5.55m)
        const detFriezeGeo = new THREE.ExtrudeGeometry(detWingShape, { depth: detRoofY - detBrickTop, bevelEnabled: false });
        detFriezeGeo.rotateX(-Math.PI / 2);
        foundry._applyArchitecturalUVs(detFriezeGeo, detRoofY - detBrickTop, 1.0);
        const detFriezeMesh = new THREE.Mesh(detFriezeGeo, [roofMembraneMat, tanPrecastMat]);
        detFriezeMesh.position.y = detBrickTop;
        detFriezeMesh.castShadow = true;
        detFriezeMesh.receiveShadow = true;
        detFriezeMesh.userData = { isSelectableBuilding: true, building };
        arch.add(detFriezeMesh);

        // 5. Continuous Perimeter Parapet Wall, 3-Tier Upper Cornice Molding & Silver Sheet-Metal Coping Cap around all 14 edges of detPolyPts!
        const addEdgeParapetAndCornice = (x0, z0, x1, z1, includeCornice = true, edgeIdx = 0, includeParapet = true) => {
            const len = Math.hypot(x1 - x0, z1 - z0) + 0.34;
            const mx = (x0 + x1) * 0.5;
            const mz = (z0 + z1) * 0.5;
            const rotY = -Math.atan2(z1 - z0, x1 - x0);
            const eGrp = new THREE.Group();
            eGrp.position.set(mx, 0, mz);
            eGrp.rotation.y = rotY;
            const dy = (edgeIdx % 3) * 0.003;
            const dz = (edgeIdx % 2) * 0.006;

            if (includeParapet) {
                const pWall = new THREE.Mesh(new THREE.BoxGeometry(len, 0.20, 0.34 + dz), plinthBeigeMat);
                pWall.position.y = 5.62 + dy;
                eGrp.add(pWall);
                const pCap = new THREE.Mesh(new THREE.BoxGeometry(len + 0.06, 0.10, 0.42 + dz), silverFlashingMat);
                pCap.position.y = 5.75 + dy;
                eGrp.add(pCap);
            }

            if (includeCornice) {
                const c1 = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.38 + dz), plinthBeigeMat);
                c1.position.y = 5.32 + dy;
                eGrp.add(c1);
                const c2 = new THREE.Mesh(new THREE.BoxGeometry(len + 0.04, 0.08, 0.44 + dz), plinthBeigeMat);
                c2.position.y = 5.41 + dy;
                eGrp.add(c2);
                const c3 = new THREE.Mesh(new THREE.BoxGeometry(len + 0.08, 0.08, 0.50 + dz), plinthBeigeMat);
                c3.position.y = 5.49 + dy;
                eGrp.add(c3);
            }
            arch.add(eGrp);
        };

        for (let i = 0; i < detPolyPts.length; i++) {
            const [x0, z0] = detPolyPts[i];
            const [x1, z1] = detPolyPts[(i + 1) % detPolyPts.length];
            addEdgeParapetAndCornice(x0, z0, x1, z1, i < detPolyPts.length - 1, i, true);
        }
        // Add 3-tier cornice only (no duplicate parapet) on the exposed North (lz = 18.78..22.28) and South (lz = -25.60..-21.56) step-outs of the lx = -2.89m back wall (2d99ad17.jpg!)
        addEdgeParapetAndCornice(-2.89, 18.78, -2.89, 22.28, true, 14, false);
        addEdgeParapetAndCornice(-2.89, -25.60, -2.89, -21.56, true, 15, false);

        // 6. Central Recessed Precast Wall Overlay (lx = -20.96m, lz = -3.65m..+0.40m, c4cb0ae6.jpg!)
        addBox(0.18, 4.65, 4.10, tanPrecastMat, -20.96, 2.395, -1.625);
        [-3.05, -1.625, -0.20].forEach((jz) => {
            addBox(0.22, 4.65, 0.03, plazaJointMat, -20.98, 2.395, jz);
        });
        [0.88, 2.08].forEach((jy) => {
            addBox(0.22, 0.03, 4.05, plazaJointMat, -20.98, jy, -1.625);
        });
        addBox(0.26, 0.92, 0.48, plinthBeigeMat, -20.99, 5.08, -1.625);
        addBox(0.30, 0.74, 0.04, plazaJointMat, -21.01, 5.08, -1.625);
        [-2.45, -0.80].forEach((wz) => {
            addBox(0.22, 0.24, 1.28, whiteDoorMat, -21.00, 1.92, wz);
            addBox(0.24, 0.18, 1.20, slotGlassMat, -21.01, 1.92, wz);
        });
        const ventCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.22, 12), blackIronMat);
        ventCyl.rotation.z = Math.PI * 0.5;
        ventCyl.position.set(-21.00, 3.55, -2.32);
        arch.add(ventCyl);
        addBox(0.45, 0.06, 0.45, plazaConcreteMat, -21.45, 0.03, -2.32, false);

        // 7. Rooftop Details on the Orondo Detention Roof (matched directly to DJI drone photo dji_fly_20230907_112120_109_1694110999879_photo (1).jpg!):
        addBox(0.85, 0.18, 1.25, darkFasciaMat, -9.60, 5.64, 10.80);
        addBox(0.68, 0.20, 1.08, plinthBeigeMat, -9.60, 5.66, 10.80);
        [
            [-6.20, 11.80], [-9.60, 16.40], [-19.40, 7.80],
            [-11.80, 0.40], [-13.60, -1.80],
            [-18.80, -11.80], [-6.80, -16.80], [-19.20, -15.80]
        ].forEach(([vx, vz]) => {
            [-0.22, 0.22].forEach((dz) => {
                const vCap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.10, 0.28, 10), blackIronMat);
                vCap.position.set(vx, 5.68, vz + dz);
                arch.add(vCap);
            });
        });

        // 8. Helper for a single 2x4 Grid-Scored Precast Lower Panel + Security Slot Window + Overhanging Lintel + Control Joint + Upper Clerestory Window
        const buildScoredSlotBay = (bx, bz, normalAxis = '-X', includeUpperClerestory = true) => {
            const isX = normalAxis === '-X' || normalAxis === '+X';
            const sign = (normalAxis === '-X' || normalAxis === '-Z') ? -1 : 1;

            if (isX) {
                addBox(0.14, 1.82, 1.54, plinthBeigeMat, bx + sign * 0.04, 0.91, bz);
                addBox(0.16, 1.80, 0.03, plazaJointMat, bx + sign * 0.05, 0.91, bz);
                [0.48, 0.94, 1.38].forEach((jy) => {
                    addBox(0.16, 0.03, 1.52, plazaJointMat, bx + sign * 0.05, jy, bz);
                });
                addBox(0.16, 0.26, 1.48, whiteDoorMat, bx + sign * 0.06, 1.96, bz);
                addBox(0.18, 0.18, 1.40, slotGlassMat, bx + sign * 0.07, 1.96, bz);
                addBox(0.20, 0.18, 1.62, plinthBeigeMat, bx + sign * 0.07, 2.19, bz);
                addBox(0.09, 2.38, 0.045, blackIronMat, bx + sign * 0.02, 3.46, bz);
                if (includeUpperClerestory) {
                    addBox(0.18, 0.28, 1.36, whiteDoorMat, bx + sign * 0.07, 5.04, bz);
                    addBox(0.20, 0.20, 1.28, slotGlassMat, bx + sign * 0.08, 5.04, bz);
                }
            } else {
                addBox(1.54, 1.82, 0.14, plinthBeigeMat, bx, 0.91, bz + sign * 0.04);
                addBox(0.03, 1.80, 0.16, plazaJointMat, bx, 0.91, bz + sign * 0.05);
                [0.48, 0.94, 1.38].forEach((jy) => {
                    addBox(1.52, 0.03, 0.16, plazaJointMat, bx, jy, bz + sign * 0.05);
                });
                addBox(1.48, 0.26, 0.16, whiteDoorMat, bx, 1.96, bz + sign * 0.06);
                addBox(1.40, 0.18, 0.18, slotGlassMat, bx, 1.96, bz + sign * 0.07);
                addBox(1.62, 0.18, 0.20, plinthBeigeMat, bx, 2.19, bz + sign * 0.07);
                addBox(0.045, 2.38, 0.09, blackIronMat, bx, 3.46, bz + sign * 0.02);
                if (includeUpperClerestory) {
                    addBox(1.36, 0.28, 0.18, whiteDoorMat, bx, 5.04, bz + sign * 0.07);
                    addBox(1.28, 0.20, 0.20, slotGlassMat, bx, 5.04, bz + sign * 0.08);
                }
            }
        };

        const buildOrondoFacadeBays = (xMin, zMin, zMax) => {
            const d = zMax - zMin;
            const numBays = 5;
            const baySpan = (d - 1.40) / numBays;
            for (let b = 0; b < numBays; b++) {
                const bz = zMin + 0.70 + (b + 0.5) * baySpan;
                buildScoredSlotBay(xMin, bz, '-X', true);

                if (b < numBays - 1) {
                    const pilZ = bz + baySpan * 0.5;
                    addBox(0.22, 0.92, 0.48, plinthBeigeMat, xMin - 0.08, 5.08, pilZ);
                    addBox(0.28, 0.72, 0.32, plinthBeigeMat, xMin - 0.10, 5.08, pilZ);
                    addBox(0.30, 0.74, 0.04, plazaJointMat, xMin - 0.10, 5.08, pilZ);
                }
            }
            [zMin + 0.32, zMax - 0.32].forEach((czPos) => {
                addBox(0.24, 0.92, 0.58, plinthBeigeMat, xMin - 0.08, 5.08, czPos);
                addBox(0.28, 0.74, 0.04, plazaJointMat, xMin - 0.09, 5.08, czPos);
            });
        };

        // North & South Orondo Ave (-X) 5-Bay Facades (lz = 0.40..14.60 and lz = -18.00..-3.65, 4ba0e364.jpg & 7836d2e7.jpg)
        buildOrondoFacadeBays(-24.18, 0.40, 14.60);
        buildOrondoFacadeBays(-24.38, -18.00, -3.65);

        // North Wall (+Z = 22.28m) 3 Scored Slot/Clerestory Bays (9bf67bc6.jpg & 2d99ad17.jpg)
        [-13.50, -9.55, -5.60].forEach((bx) => {
            buildScoredSlotBay(bx, 22.28, '+Z', true);
        });
        // South Wall (-Z = -25.60m) 4 Scored Slot/Clerestory Bays (b5ec68b4.jpg)
        [-13.80, -10.65, -7.50, -4.35].forEach((bx) => {
            buildScoredSlotBay(bx, -25.60, '-Z', true);
        });

        // Upper Clerestory Slot Windows along the 6 Inner Corner Pocket Walls above the Rec Yard roofs (fb80d49d.jpg, c5e2718f.jpg & b5ec68b4.jpg!)
        [
            [detPolyPts[1], detPolyPts[2]],
            [detPolyPts[2], detPolyPts[3]],
            [detPolyPts[3], detPolyPts[4]],
            [detPolyPts[9], detPolyPts[10]],
            [detPolyPts[10], detPolyPts[11]],
            [detPolyPts[11], detPolyPts[12]]
        ].forEach(([[x0, z0], [x1, z1]]) => {
            const mx = (x0 + x1) * 0.5;
            const mz = (z0 + z1) * 0.5;
            const rotY = -Math.atan2(z1 - z0, x1 - x0);
            const cWinGrp = new THREE.Group();
            cWinGrp.position.set(mx, 5.04, mz);
            cWinGrp.rotation.y = rotY;
            const wFrame = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.28, 0.38), whiteDoorMat);
            cWinGrp.add(wFrame);
            const wGlass = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.20, 0.40), slotGlassMat);
            cWinGrp.add(wGlass);
            arch.add(cWinGrp);
        });

        // C. TWO CHAMFERED / FAN-SHAPED OUTDOOR RECREATION YARD ENCLOSURES IN THE ROOF CORNERS
        // Exact match to DJI drone photo (dji_fly_20230907_112120_109_1694110999879_photo (1).jpg) & close-up photos (9bf67bc6.jpg, 3e0daacd.jpg, 4ba0e364.jpg, c5e2718f.jpg, b5ec68b4.jpg)
        // =========================================================================
        const buildChamferedCornerRecYard = (isNorth) => {
            // Exact 3-segment inner corner pocket vertices from detPolyPts:
            const pStart = isNorth ? [-24.18, 14.60] : [-24.38, -18.00]; // Orondo (-X) wall junction
            const pApex  = isNorth ? [-20.50, 14.60] : [-20.70, -18.00]; // Inner apex (straight +X from pStart!)
            const pMid   = isNorth ? [-17.80, 18.20] : [-18.00, -21.80]; // Intermediate bend (diagonal from pApex!)
            const pEnd   = isNorth ? [-17.80, 22.28] : [-18.00, -25.60]; // Outer (+Z / -Z) wall junction (parallel to Orondo Ave from pMid!)

            // Tangent 90-degree quarter-circle/ellipse arc directly from pStart (ang = PI, tangent to Orondo -X wall) to pEnd (ang = +-PI/2, tangent to North/South wall):
            const centerArcX = pEnd[0];   // -17.80m (North), -18.00m (South)
            const centerArcZ = pStart[1]; // +14.60m (North), -18.00m (South)
            const rx         = Math.abs(pStart[0] - centerArcX); // 6.38m (North), 6.38m (South)
            const rz         = Math.abs(pEnd[1] - centerArcZ);   // 7.68m (North), 7.60m (South)
            const segments   = 8;
            const arcPts     = [];
            for (let s = 0; s <= segments; s++) {
                const u = s / segments;
                const ang = isNorth ? (Math.PI - u * Math.PI * 0.5) : (Math.PI + u * Math.PI * 0.5);
                const ax = centerArcX + Math.cos(ang) * rx;
                const az = centerArcZ + Math.sin(ang) * rz;
                arcPts.push([ax, az]);
            }
            const outZ = isNorth ? -1 : 1; // Ensure fins & grill bars project OUTWARD on both North & South corners!

            for (let s = 0; s < segments; s++) {
                const [x0, z0] = arcPts[s];
                const [x1, z1] = arcPts[s + 1];

                const segW = Math.hypot(x1 - x0, z1 - z0) + 0.08;
                const mx = (x0 + x1) * 0.5;
                const mz = (z0 + z1) * 0.5;
                const rotY = -Math.atan2(z1 - z0, x1 - x0);
                const isDoorBay = (s === 0 || s === segments - 1);

                const bayGrp = new THREE.Group();
                bayGrp.position.set(mx, 0, mz);
                bayGrp.rotation.y = rotY;

                if (isDoorBay) {
                    // White Hollow-Metal Security Exit Door integrated directly into Bay 0 (Orondo side) and Bay 7 (North/South side) below the 2x3 upper grill (3e0daacd.jpg & 4ba0e364.jpg!)
                    const frameM = new THREE.Mesh(new THREE.BoxGeometry(segW, 2.84, 0.36), recCreamMat);
                    frameM.position.y = 1.42;
                    bayGrp.add(frameM);
                    const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.96, 2.48, 0.38), whiteDoorMat);
                    doorLeaf.position.set(0, 1.26, outZ * 0.02);
                    bayGrp.add(doorLeaf);
                    const doorHood = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.10, 0.44), recCreamMat);
                    doorHood.position.set(0, 2.58, outZ * 0.04);
                    bayGrp.add(doorHood);
                } else {
                    const plinthM = new THREE.Mesh(new THREE.BoxGeometry(segW, 0.68, 0.36), plinthBeigeMat);
                    plinthM.position.y = 0.34;
                    bayGrp.add(plinthM);
                    const grayBandM = new THREE.Mesh(new THREE.BoxGeometry(segW + 0.02, 0.14, 0.34), plazaJointMat);
                    grayBandM.position.y = 0.75;
                    bayGrp.add(grayBandM);

                    const brickM = new THREE.Mesh(new THREE.BoxGeometry(segW, 2.00, 0.32), varBrickMat);
                    brickM.position.y = 1.82;
                    brickM.castShadow = true;
                    brickM.receiveShadow = true;
                    bayGrp.add(brickM);
                    const brickJnt = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.00, 0.34), plazaJointMat);
                    brickJnt.position.set(-segW * 0.5 + 0.04, 1.82, outZ * 0.01);
                    bayGrp.add(brickJnt);
                }

                const sillLipM = new THREE.Mesh(new THREE.BoxGeometry(segW + 0.06, 0.08, 0.42), recCreamMat);
                sillLipM.position.y = 2.84;
                bayGrp.add(sillLipM);
                const midBandM = new THREE.Mesh(new THREE.BoxGeometry(segW + 0.04, 0.50, 0.38), recCreamMat);
                midBandM.position.y = 3.07;
                bayGrp.add(midBandM);
                const topBandM = new THREE.Mesh(new THREE.BoxGeometry(segW + 0.06, 0.32, 0.42), recCreamMat);
                topBandM.position.y = 4.78;
                bayGrp.add(topBandM);
                const topFlashM = new THREE.Mesh(new THREE.BoxGeometry(segW + 0.10, 0.08, 0.46), silverFlashingMat);
                topFlashM.position.y = 4.96;
                bayGrp.add(topFlashM);

                const meshM = new THREE.Mesh(new THREE.BoxGeometry(segW - 0.06, 1.30, 0.14), securityMeshMat);
                meshM.position.y = 3.97;
                bayGrp.add(meshM);

                const subMul = new THREE.Mesh(new THREE.BoxGeometry(0.075, 1.30, 0.26), recCreamMat);
                subMul.position.set(0, 3.97, outZ * 0.04);
                bayGrp.add(subMul);
                [3.75, 4.19].forEach((hy) => {
                    const hBar = new THREE.Mesh(new THREE.BoxGeometry(segW - 0.04, 0.07, 0.26), recCreamMat);
                    hBar.position.set(0, hy, outZ * 0.04);
                    bayGrp.add(hBar);
                });

                const finM = new THREE.Mesh(new THREE.BoxGeometry(0.11, 2.04, 0.48), recCreamMat);
                finM.position.set(-segW * 0.5 + 0.04, 3.74, outZ * 0.07);
                finM.castShadow = true;
                bayGrp.add(finM);

                arch.add(bayGrp);
            }

            // Fan-Shaped Translucent-Cream Roof Deck filling the exact polygon between pStart -> pApex -> pMid -> pEnd and the 90-degree tangent outer curve (arcPts)
            const fanShape = new THREE.Shape();
            fanShape.moveTo(pStart[0], -pStart[1]);
            fanShape.lineTo(pApex[0], -pApex[1]);
            fanShape.lineTo(pMid[0], -pMid[1]);
            fanShape.lineTo(pEnd[0], -pEnd[1]);
            for (let s = segments - 1; s >= 1; s--) {
                fanShape.lineTo(arcPts[s][0], -arcPts[s][1]);
            }
            fanShape.closePath();

            const fanGeo = new THREE.ExtrudeGeometry(fanShape, { depth: 0.14, bevelEnabled: false });
            fanGeo.rotateX(-Math.PI / 2);
            const fanMat = new THREE.MeshStandardMaterial({ color: '#ece8dc', roughness: 0.52, metalness: 0.08 });
            const fanMesh = new THREE.Mesh(fanGeo, fanMat);
            fanMesh.position.y = 4.74;
            fanMesh.receiveShadow = true;
            arch.add(fanMesh);

            // Radial structural seam lines on the fan roof from pApex and pMid to the outer arc (matching the DJI drone photo!)
            [
                [pApex, arcPts[3]],
                [pMid, arcPts[5]]
            ].forEach(([pInner, pOuter]) => {
                const seamLen = Math.hypot(pOuter[0] - pInner[0], pOuter[1] - pInner[1]) - 0.20;
                const seamMx = (pInner[0] + pOuter[0]) * 0.5;
                const seamMz = (pInner[1] + pOuter[1]) * 0.5;
                const seamRot = -Math.atan2(pOuter[1] - pInner[1], pOuter[0] - pInner[0]);
                const seamBar = new THREE.Mesh(new THREE.BoxGeometry(seamLen, 0.03, 0.06), plazaJointMat);
                seamBar.position.set(seamMx, 4.89, seamMz);
                seamBar.rotation.y = seamRot;
                arch.add(seamBar);
            });
        };

        buildChamferedCornerRecYard(true);
        buildChamferedCornerRecYard(false);

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
        addBox(17.20, 0.08, 18.20, roofMembraneMat, 13.00 + coreShiftX, 7.43, -5.50); // Flat light-gray membrane roof deck above coping base
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

        // 1. Rectangular High-Bay Gym Upper Wall Box from Main Roof (y = 4.55m) up to Eave Height (y = 8.40m)
        // (Lower 0.0m..4.55m walls & 0.0m..0.72m base plinth are already extruded by mainBodyMesh & baseBandMesh!)
        const gymUpperH = gymEaveY - 4.55;
        addBox(gymW, gymUpperH, gymSpanZ, tanPrecastMat, gymCenterX, 4.55 + gymUpperH * 0.5, gymCenterZ);

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
        foundry._applyArchitecturalUVs(barrelGeo, gymArchRise, 0.6);
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

            const wJitter = (i % 2) * 0.008;
            const yJitter = (i % 2) * 0.002;
            // Roof membrane/metal panel segment spanning full Gym width
            const roofSeg = new THREE.Mesh(
                new THREE.BoxGeometry(gymW + 0.36 + wJitter, 0.18, segLen),
                gymRoofMat
            );
            roofSeg.position.set(gymCenterX, my + 0.08 + yJitter, mz);
            roofSeg.rotation.x = tiltX;
            roofSeg.castShadow = true;
            roofSeg.receiveShadow = true;
            arch.add(roofSeg);

            // Projecting dark-slate arched fascia trim band on +X (NW Parking Lot) and -X (SE Orondo) gable ends
            [gymXMax + 0.14, gymXMin - 0.14].forEach((fx) => {
                const fasciaSeg = new THREE.Mesh(
                    new THREE.BoxGeometry(0.24 + wJitter * 0.5, 0.34, segLen + 0.02),
                    darkFasciaMat
                );
                fasciaSeg.position.set(fx, my - 0.02 + yJitter, mz);
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
        //   - White hollow-metal exit door + twin wall-pack lights on the -X (Orondo Ave) Gym gable wall facing the South Rec Yard (visible in b5ec68b4.jpg left!)
        addBox(0.16, 2.22, 1.05, whiteDoorMat, gymXMin - 0.04, 1.12, -31.80);
        addBox(0.18, 0.14, 0.24, whiteDoorMat, gymXMin - 0.06, 2.55, -24.80);
        addBox(0.18, 0.14, 0.24, whiteDoorMat, gymXMin - 0.06, 2.55, -28.40);

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