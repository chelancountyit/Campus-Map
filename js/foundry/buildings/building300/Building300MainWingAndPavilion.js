import * as THREE from 'three';

export function buildBuilding300MainWingAndPavilion(ctx) {
    const {
        foundry, group, building, arch, addBox,
        varBrickMat, tanPrecastMat, plinthBeigeMat, silverFlashingMat,
        darkFasciaMat, roofMembraneMat, slotGlassMat, whiteDoorMat, blackIronMat, hedgeRedMat
    } = ctx;

        // 4. Base Footprint Foundation & Single-Floor High-Ceiling Core Massing
        // Build mainCoreShape stopping at the lz = 29.89m main front parapet line so the step-forward Front Brick Entry Pavilion (lz = 29.89m..34.05m, lx = 4.25m..22.14m) forms a distinct lower roof tier matching the Washington St aerial view
        const mainCoreShape = new THREE.Shape();
        {
            const cx0 = building.center[0];
            const cz0 = building.center[1];
            const corePts = [];
            building.footprint.forEach((pt, idx) => {
                if (idx >= 4 && idx <= 15) {
                    // Skip OSM Orondo vertices 4..15; mainCoreShape connects idx 2 -> idx 3 (-2.90, -21.56) -> idx 16 (-2.90, 18.78) along the straight lx = -2.89m back wall
                } else if (idx === 18) {
                    corePts.push([39.61, 53.55]); // Front-left corner of Main Roof (lx = 2.70m, lz = 29.89m)
                } else if (idx === 19 || idx === 20) {
                    // Skip step-forward pavilion vertices; the pavilion (lx = 4.25m..22.14m, lz = 29.89m..34.05m) is modeled at y = 0..3.68m in arch group
                } else {
                    corePts.push(pt);
                }
            });
            corePts.forEach((pt, idx) => {
                const sx = pt[0] - cx0;
                const sy = -(pt[1] - cz0);
                if (idx === 0) mainCoreShape.moveTo(sx, sy);
                else mainCoreShape.lineTo(sx, sy);
            });
            mainCoreShape.closePath();
        }

        // Sub-grade foundation plinth (-5.5m to 0.0m) so all hillside slopes around Orondo St & Rear Parking Lot are solid
        const footingGeo = new THREE.ExtrudeGeometry(mainCoreShape, { depth: 5.5, bevelEnabled: false });
        footingGeo.rotateX(-Math.PI / 2);
        const footingMesh = new THREE.Mesh(footingGeo, plinthBeigeMat);
        footingMesh.position.y = -5.5;
        footingMesh.castShadow = true;
        footingMesh.receiveShadow = true;
        group.add(footingMesh);

        // Main Single-Floor High-Ceiling Footprint Extrusion (y = 0.0m to +4.55m across the main core footprint ending at lz = 29.89m)
        const baseWallH = 4.55;
        const mainBodyGeo = new THREE.ExtrudeGeometry(mainCoreShape, { depth: baseWallH, bevelEnabled: false });
        mainBodyGeo.rotateX(-Math.PI / 2);
        foundry._applyArchitecturalUVs(mainBodyGeo, baseWallH, 1.15);
        const mainBodyMesh = new THREE.Mesh(mainBodyGeo, [roofMembraneMat, tanPrecastMat]);
        mainBodyMesh.name = 'Building300_SingleFloorHighCeilingBase';
        mainBodyMesh.position.y = 0.0;
        mainBodyMesh.castShadow = true;
        mainBodyMesh.receiveShadow = true;
        mainBodyMesh.userData = { isSelectableBuilding: true, building, floorLayer: 1 };
        group.add(mainBodyMesh);

        // Smooth beige concrete base water-table plinth band (y = 0.0m..0.72m) around the main core footprint
        const baseBandGeo = new THREE.ExtrudeGeometry(mainCoreShape, {
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

        // 1. Main Roof Parapet & Multi-Level Rooftop Architecture (a1121394.jpg & 3e290850.jpg!)
        //   - Continuous front main parapet behind the brick pavilion (lx = 2.70m..24.08m, lz = 29.89m, y = 3.65m..4.82m)
        //   - Central recessed overflow scupper notch in the parapet coping (lx = 11.78m..12.32m) directly behind the bay window!
        addBox(9.08, 1.08, 0.34, plinthBeigeMat, 7.24, 4.19, 29.89); // Left main parapet wall (lx = 2.70m..11.78m)
        addBox(9.16, 0.14, 0.46, plinthBeigeMat, 7.24, 4.78, 29.89); // Left main coping cap
        // Center scupper notch (lx = 11.78m..12.32m) with lower weir & silver sheet-metal scupper box (a1121394.jpg!)
        addBox(0.54, 0.88, 0.34, plinthBeigeMat, 12.05, 4.09, 29.89);
        addBox(0.46, 0.16, 0.48, silverFlashingMat, 12.05, 4.62, 29.92);
        addBox(11.76, 1.08, 0.34, plinthBeigeMat, 18.20, 4.19, 29.89); // Right main parapet wall (lx = 12.32m..24.08m)
        addBox(11.82, 0.14, 0.46, plinthBeigeMat, 18.20, 4.78, 29.89); // Right main coping cap

        // Side parapet returns along lx = 2.70m (lz = 18.75m..29.89m) and lx = 24.06m (lz = 5.45m..29.89m)
        addBox(0.34, 1.08, 11.14, plinthBeigeMat, 2.70, 4.19, 24.32);   // Left (-X) parapet return along Orondo lawn side
        addBox(0.46, 0.14, 11.24, plinthBeigeMat, 2.70, 4.78, 24.32);
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

        // Multi-Tiered Rooftop Dividing Parapet Walls & Intermediate Roof Deck (matched directly to 28619543.jpg & 2d99ad17.jpg!):
        //   1. Intermediate Rectangular Roof Bay (lx = -2.89m..+8.77m, lz = -3.80m..+3.80m) bridging between the Orondo Detention Wing (lx = -2.89m) and the Tall Precast Core (lx = +8.77m)
        addBox(11.66, 0.52, 7.60, roofMembraneMat, 2.94, 4.81, 0.00);
        addBox(11.66, 1.12, 0.36, plinthBeigeMat, 2.94, 5.11, 3.80);
        addBox(11.76, 0.14, 0.48, silverFlashingMat, 2.94, 5.72, 3.80);
        addBox(11.66, 0.96, 0.36, plinthBeigeMat, 2.94, 5.03, -3.80);
        addBox(11.76, 0.14, 0.48, silverFlashingMat, 2.94, 5.56, -3.80);
        //   2. Lower Rear Roof Bay between the Intermediate Bay (lz = -3.80m), Gym junction (lz = -21.56m), and Orondo Wing (lx = -2.89m)
        addBox(0.34, 0.96, 6.56, plinthBeigeMat, -2.72, 5.03, -18.28);
        addBox(0.72, 0.28, 0.72, silverFlashingMat, -1.10, 4.70, -17.80);

        // TWO Black Steel Vertical Rooftop Access Ladders with Walk-Through Parapet Hoops (exact match to 28619543.jpg & 2d99ad17.jpg!):
        //   - Ladder 1 on the N-S dividing parapet wall (at lx = -2.67m, lz = 6.20m, climbing from the Front Admin Roof up onto the Orondo Detention Roof)
        //   - Ladder 2 on the E-W dividing parapet wall (at lx = 3.20m, lz = 4.02m, climbing from the Front Admin Roof up onto the Intermediate Roof Bay)
        [
            [-2.67, 6.20, 0],             // Ladder 1 on the N-S dividing parapet wall (facing +X lower roof)
            [3.20, 4.02, Math.PI * 0.5]   // Ladder 2 on the E-W transverse parapet wall (facing +Z lower roof)
        ].forEach(([lxPos, lzPos, lRot]) => {
            const ladGrp = new THREE.Group();
            ladGrp.position.set(lxPos, 4.55, lzPos);
            ladGrp.rotation.y = lRot;
            // Side rails rising 1.75m (0.55m walk-through extension above the parapet coping, clearly visible in 2d99ad17.jpg!)
            [-0.24, 0.24].forEach((ry) => {
                const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.75, 0.06), blackIronMat);
                rail.position.set(0, 0.875, ry);
                ladGrp.add(rail);
                const topLoop = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.04), blackIronMat);
                topLoop.position.set(-0.17, 1.75, ry);
                ladGrp.add(topLoop);
                const rearLeg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.58, 0.04), blackIronMat);
                rearLeg.position.set(-0.34, 1.46, ry);
                ladGrp.add(rearLeg);
            });
            // Horizontal ladder rungs every 0.26m
            for (let rY = 0.25; rY <= 1.20; rY += 0.26) {
                const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.48, 8), blackIronMat);
                rung.rotation.x = Math.PI * 0.5;
                rung.position.set(0, rY, 0);
                ladGrp.add(rung);
            }
            arch.add(ladGrp);
        });

        // Rooftop TPO Membrane Seam Lines on the Front Administrative Roof (stopping cleanly at the N-S parapet lx = -2.70m and E-W parapet lz = 6.20m!)
        for (let rz = 8.80; rz <= 28.00; rz += 2.60) {
            const xStart = rz < 18.80 ? -2.70 : 2.85;
            const seamW = 23.85 - xStart;
            const seamCx = (xStart + 23.85) * 0.5;
            addBox(seamW, 0.02, 0.04, darkFasciaMat, seamCx, 4.56, rz, false);
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

        // 2. Step-Forward Front Brick Entry Pavilion & Three-Level Stepped Parapet (lx = 4.25m..22.14m, lz = 29.89m..34.05m)
        // Inset on both the left (lx = 4.25m vs main roof 2.70m — moved 15 ft / +4.57m right from the old -0.35m edge) and right (lx = 22.14m vs main roof 24.08m),
        // forming the exact 3-tier stepped Washington St front profile seen in the top-down aerial view!
        addBox(17.89, 5.50, 4.16, plinthBeigeMat, 13.195, -2.75, 31.97); // Sub-grade foundation plinth under front pavilion
        addBox(17.99, 0.72, 4.24, plinthBeigeMat, 13.195, 0.36, 31.97);  // Beige concrete water-table plinth band (y = 0..0.72m)
        addBox(17.89, 3.68, 4.16, varBrickMat, 13.195, 1.84, 31.97);     // Main variegated tan-brown brick pavilion mass (y = 0..3.68m)
        // Exposed front-left main building wall between lx = 2.70m and lx = 4.25m at lz = 29.89m (symmetric with lx = 22.14m..24.08m on the right!)
        addBox(1.55, 3.68, 0.24, varBrickMat, 3.475, 1.84, 29.89);
        // Flat gray membrane roof deck atop the front brick pavilion (recessed behind the stepped parapet, y = 3.68m)
        addBox(17.55, 0.12, 3.92, roofMembraneMat, 13.195, 3.68, 31.97);
        // Three-Level Stepped Brick + Cream Precast Parapet around the Front Brick Entry Pavilion (lx = 4.25m..22.14m):
        //   - Left Wing Higher Parapet (lx = 4.25m..7.85m, y = 3.68m..4.08m) + Left Return Wall Parapet (lx = 4.25m, lz = 29.89m..34.05m)
        addBox(3.60, 0.26, 0.30, varBrickMat, 6.05, 3.81, 34.05);
        addBox(3.72, 0.16, 0.44, plinthBeigeMat, 6.05, 4.02, 34.08);
        addBox(0.30, 0.26, 4.20, varBrickMat, 4.25, 3.81, 31.97);
        addBox(0.44, 0.16, 4.30, plinthBeigeMat, 4.25, 4.02, 31.97);
        //   - Center Stepped-Down Parapet above the Projecting Bay Window (lx = 7.85m..16.15m, y = 3.56m..3.82m)
        addBox(8.30, 0.16, 0.44, plinthBeigeMat, 12.00, 3.78, 34.08);
        //   - Vertical precast step-returns at lx = 7.85m and lx = 16.15m connecting the center coping to the left/right higher copings
        addBox(0.24, 0.32, 0.44, plinthBeigeMat, 7.85, 3.90, 34.08);
        addBox(0.24, 0.32, 0.44, plinthBeigeMat, 16.15, 3.90, 34.08);
        //   - Right Wing Higher Parapet above the right circular window & "300 WASHINGTON STREET" sign (lx = 16.15m..22.14m, y = 3.68m..4.08m) + Right Return Parapet
        addBox(5.99, 0.26, 0.30, varBrickMat, 19.145, 3.81, 34.05);
        addBox(6.12, 0.16, 0.44, plinthBeigeMat, 19.145, 4.02, 34.08);
        addBox(0.30, 0.26, 4.20, varBrickMat, 22.14, 3.81, 31.97);
        addBox(0.44, 0.16, 4.30, plinthBeigeMat, 22.14, 4.02, 31.97);
        // Two small rooftop plumbing vents on the pavilion roof deck
        [[6.20, 31.60], [19.80, 31.60]].forEach(([px, pz]) => {
            const pVent = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.38, 8), blackIronMat);
            pVent.position.set(px, 3.82, pz);
            arch.add(pVent);
        });

        // (a) Smooth Tan Precast Left Wall of Main Wing (lx = 2.71m, lz = 18.75m..29.89m) with vertical & horizontal panel joints and white coping cap
        addBox(0.32, 4.55, 11.14, tanPrecastMat, 2.71, 2.275, 24.32);
        addBox(0.38, 0.72, 11.20, plinthBeigeMat, 2.71, 0.36, 24.32);
        addBox(0.44, 0.14, 11.24, whiteDoorMat, 2.71, 4.62, 24.32);
        [21.50, 25.20, 28.80].forEach((jz) => {
            addBox(0.36, 4.55, 0.04, darkFasciaMat, 2.68, 2.275, jz);
        });
        addBox(0.36, 0.04, 11.14, darkFasciaMat, 2.68, 2.05, 24.32);

        // (b) 3-Bay White-Framed Window Assembly on the Left Return Wall of the Inset Front Brick Pavilion (lx = 4.25m, lz = 30.15m..33.65m)
        const leftWinZ = 31.90;
        const leftWinW = 3.40;
        addBox(0.18, 2.76, leftWinW, slotGlassMat, 4.22, 1.98, leftWinZ);
        addBox(0.55, 0.24, leftWinW + 0.16, whiteDoorMat, 4.02, 3.44, leftWinZ);
        addBox(0.60, 0.06, leftWinW + 0.22, silverFlashingMat, 4.02, 3.58, leftWinZ);
        [0.62, 1.05, 2.42, 3.32].forEach((hy) => {
            addBox(0.22, 0.075, leftWinW + 0.04, whiteDoorMat, 4.18, hy, leftWinZ);
        });
        [-1.65, -0.55, 0.55, 1.65].forEach((dz) => {
            addBox(0.22, 2.76, 0.075, whiteDoorMat, 4.18, 1.98, leftWinZ + dz);
        });

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
        
        // Perimeter fence turning along the Washington St / Orondo Ave grass lawn (lx = -6.50m, lz = 28.85m -> 18.75m, visible in 5e51fcab.jpg left!)


        // Precast Pocket Rear Wall Details (lx = -2.89m..+2.71m, lz = 18.75m, visible in 3474ae91.jpg between the brown brick wing and tan precast side wall):
        //   - Upper stepped precast frieze band & center pilaster cap + two narrow horizontal green-tinted slot windows (y = 1.96m)
        addBox(5.62, 0.72, 0.34, plinthBeigeMat, -0.09, 4.90, 18.78);
        addBox(5.70, 0.14, 0.44, silverFlashingMat, -0.09, 5.32, 18.78);
        addBox(0.54, 0.88, 0.42, plinthBeigeMat, -0.09, 4.88, 18.84);
        addBox(0.05, 4.55, 0.08, darkFasciaMat, -0.09, 2.275, 18.78);
        addBox(5.60, 0.04, 0.08, darkFasciaMat, -0.09, 2.08, 18.78);
        addBox(5.60, 0.04, 0.08, darkFasciaMat, -0.09, 1.82, 18.78);
        [-1.48, 1.30].forEach((wx) => {
            addBox(1.42, 0.24, 0.16, whiteDoorMat, wx, 1.95, 18.80);
            addBox(1.34, 0.16, 0.18, slotGlassMat, wx, 1.95, 18.82);
        });

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
        [6.05, 18.25].forEach((cxPos) => {
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
        const addr300Tex = foundry._createTextPlaqueTexture(
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
        const jjcWallTex = foundry._createTextPlaqueTexture(
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
}