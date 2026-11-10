import * as THREE from 'three';

export function buildBuilding300GroundsAndGrading(ctx) {
    const {
        foundry, building, terrainY, getTerrainHeightFn, arch, addBox, smooth01,
        sampleOrondoTerrainLocalY, getOrondoSidewalkTopY, getLawnGradeY,
        varBrickMat, plinthBeigeMat, silverFlashingMat, whiteDoorMat, blackIronMat,
        bollardYellowMat, plazaConcreteMat, plazaJointMat, pipeRailMat, hedgeGreenMat, hedgeRedMat, turfLawnMat
    } = ctx;

        // Exact curved inner (lawn-side) & outer (curb-side) Z profiles for the Washington St Sidewalk,
        // Orondo Ave & Washington St 90° Rounded Corner Apron (1a7cd213.jpg), & Recessed Disabled Parking Bay:
        const getWashSidewalkBackZ = (lx) => {
            if (lx <= -28.20) return 34.92;
            if (lx < -26.00) {
                const dx = -26.00 - lx; // 0 .. 2.20
                return 34.92 + Math.sqrt(Math.max(0, 2.20 * 2.20 - dx * dx));
            }
            if (lx <= -21.80) return 37.12;
            if (lx < -18.20) return 37.12 - 1.97 * smooth01((lx - (-21.80)) / 3.60);
            if (lx <= -4.60) return 35.15;
            if (lx < -0.80) return 35.15 + 1.97 * smooth01((lx - (-4.60)) / 3.80);
            return 37.12;
        };
        const getWashSidewalkCurbZ = (lx) => {
            if (lx < -26.00) {
                const dx = Math.min(4.50, -26.00 - lx); // 0 .. 4.50
                return 34.92 + Math.sqrt(Math.max(0, 4.50 * 4.50 - dx * dx));
            }
            if (lx <= -21.80) return 39.42;
            if (lx < -18.20) return 39.42 - 2.07 * smooth01((lx - (-21.80)) / 3.60);
            if (lx <= -7.20) return 37.35;
            if (lx < -2.20) return 37.35 + 2.07 * smooth01((lx - (-7.20)) / 5.00);
            return 39.42;
        };
        // Smooth terrain-following top elevation for the Washington St sidewalk, 90° rounded corner, and Orondo Ave sidewalk
        const getWalkTerrainTopY = (lx, lz) => {
            const ty = sampleOrondoTerrainLocalY(lx, lz);
            if (ty >= 0) return Math.max(0.34, ty + 0.16);
            return 0.34 + ty * 0.88;
        };

        // Corner planter bed left open for user-planted bushes via TreePlanterFoundry

        // Tall dark bronze street/parking light pole + concrete footing sitting on the grass strip just behind the curved sidewalk (lx = -4.25m, lz = 34.62m, eeb5c507.jpg & 3474ae91.jpg!)
        const eastPoleGradeY = getLawnGradeY(-4.25, 34.62);
        addBox(0.42, 0.16, 0.42, plazaConcreteMat, -4.25, eastPoleGradeY + 0.03, 34.62);
        const eastPole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 8.20, 12), blackIronMat);
        eastPole.position.set(-4.25, eastPoleGradeY + 4.10, 34.62);
        eastPole.castShadow = true;
        arch.add(eastPole);
        // Cobra-head luminaire arm at top of pole + lower floodlight
        addBox(1.15, 0.08, 0.12, blackIronMat, -3.75, eastPoleGradeY + 8.15, 34.62);
        addBox(0.38, 0.12, 0.22, blackIronMat, -3.95, eastPoleGradeY + 5.85, 34.62);

        // Street signpost near the curb on the flared sidewalk apron ("ONE WAY" + "NO PARKING / 2 HR PARKING", eeb5c507.jpg!)
        addBox(0.045, 2.55, 0.045, silverFlashingMat, -1.25, 1.55, 38.85);
        addBox(0.44, 0.46, 0.03, blackIronMat, -1.25, 2.48, 38.85); // Upper "ONE WAY" sign
        addBox(0.24, 0.42, 0.03, whiteDoorMat, -1.39, 1.92, 38.85); // Left "NO PARKING" plate
        addBox(0.24, 0.42, 0.03, whiteDoorMat, -1.11, 1.92, 38.85); // Right "2 HR PARKING" plate


        // 8. THE CIRCULAR COURTYARD LANDING PLAZA & WIDE ENTRANCE STAIRS (lx = 22.14m..30.67m, lz = 29.89m..38.05m, ac6172be.jpg, c0dec448.jpg, 9ced0856.jpg, 3f8236bb.jpg!)
        // Raised Upper Courtyard Landing Slab (lx = 22.10m..30.65m, lz = 29.89m..34.85m, top at y = 0.62m)
        const landingY = 0.62;
        addBox(8.55, landingY, 4.96, plazaConcreteMat, 26.375, landingY * 0.5, 32.37, false);
        // Circular Concrete Medallion & 4-Ring Concentric + Radial Score Pattern in the center of the Courtyard Landing (cx = 26.55m, cz = 32.35m, ac6172be.jpg & c0dec448.jpg!)
        const medCx = 26.55;
        const medCz = 32.35;
        // Center solid circular concrete medallion disc (radius = 1.05m)
        const innerDisk = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.02, 28), plazaConcreteMat);
        innerDisk.position.set(medCx, landingY + 0.012, medCz);
        arch.add(innerDisk);
        // Four concentric circular score rings (radii = 1.05m, 1.95m, 2.25m, and outer perimeter circle 3.15m — exact match to ac6172be.jpg!)
        [1.05, 1.95, 2.25, 3.15].forEach((rad) => {
            const ringTorus = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.020, 8, 36), plazaJointMat);
            ringTorus.rotation.x = Math.PI * 0.5;
            ringTorus.position.set(medCx, landingY + 0.022, medCz);
            arch.add(ringTorus);
        });
        // 8 radial score lines radiating from the center medallion (r = 1.05m) out to the outer circle (r = 3.15m)
        for (let r = 0; r < 8; r++) {
            const ang = (r * Math.PI) / 4;
            const ray = new THREE.Mesh(new THREE.BoxGeometry(2.10, 0.02, 0.024), plazaJointMat);
            ray.rotation.y = -ang;
            ray.position.set(medCx + Math.cos(ang) * 2.10, landingY + 0.016, medCz + Math.sin(ang) * 2.10);
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

        // Wide 7-Step Concrete Entrance Stairway descending from the Upper Courtyard Landing (lz = 34.85m, y = 0.62m) seamlessly into the Washington St Sidewalk (lz = 37.12m, y = 0.34m)
        // Located between lx = 24.45m (East Brick Cheek Wall) and lx = 28.35m (West Brick Cheek Wall), width = 3.90m (ac6172be.jpg & 9ced0856.jpg!)
        const stairX = 26.40;
        const stairW = 3.85;
        const numSteps = 7;
        const stepDepth = (37.12 - 34.85) / numSteps;
        const stepRise = (landingY - 0.34) / numSteps;
        for (let st = 0; st < numSteps; st++) {
            const stH = landingY - (st + 1) * stepRise;
            const stZ = 34.85 + (st + 0.5) * stepDepth;
            addBox(stairW, stH, stepDepth + 0.03, plazaConcreteMat, stairX, stH * 0.5, stZ, false);
            addBox(stairW, 0.015, 0.025, plazaJointMat, stairX, stH + 0.005, stZ + stepDepth * 0.5, false);
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

        // 9. Unified C2-Smooth Vertex-Graded 3D Lawn & Berm Mesh around Building 300 (3474ae91.jpg, 9bf67bc6.jpg, 3e0daacd.jpg, e5a79256.jpg, b5ec68b4.jpg!)
        // Replaces separate overlapping boxes with a single continuous, analytically normal-smoothed 3D terrain surface:
        //   - Zero vertical step-offs or box cliffs along the precast wall, brick pocket, or North detention wall
        //   - Zero leftover sidewalk joints or cutouts across the front-left & corner lawn
        {
            const xCols = [
                [-28.20, -2.89, 64],
                [-2.89, 2.71, 24],
                [2.71, 4.25, 8],
                [4.25, 24.18, 40]
            ];
            const zRows = [
                [-37.80, -25.60, 28],
                [-25.60, 18.75, 76],
                [18.75, 22.28, 14],
                [22.28, 29.89, 32],
                [29.89, 34.05, 16],
                [34.05, 37.12, 12]
            ];
            const isCellActive = (c, r) => {
                if (c === 0) return true;
                if (c === 1) return r >= 2;
                if (c === 2) return r >= 4;
                if (c === 3) return r === 5;
                return false;
            };

            const positions = [];
            const normals = [];
            const eps = 0.05;
            const evalNormal = (x, z) => {
                const dydx = (getLawnGradeY(x + eps, z) - getLawnGradeY(x - eps, z)) / (2 * eps);
                const dydz = (getLawnGradeY(x, z + eps) - getLawnGradeY(x, z - eps)) / (2 * eps);
                const nx = -dydx;
                const ny = 1.0;
                const nz = -dydz;
                const len = Math.hypot(nx, ny, nz) || 1.0;
                return [nx / len, ny / len, nz / len];
            };
            const pushSmoothTri = (x0, z0, x1, z1, x2, z2) => {
                const y0 = getLawnGradeY(x0, z0);
                const y1 = getLawnGradeY(x1, z1);
                const y2 = getLawnGradeY(x2, z2);
                const n0 = evalNormal(x0, z0);
                const n1 = evalNormal(x1, z1);
                const n2 = evalNormal(x2, z2);
                positions.push(x0, y0, z0, x1, y1, z1, x2, y2, z2);
                normals.push(n0[0], n0[1], n0[2], n1[0], n1[1], n1[2], n2[0], n2[1], n2[2]);
            };
            const pushSkirtSegment = (xa, za, xb, zb, nx, nz) => {
                const ya = getLawnGradeY(xa, za);
                const yb = getLawnGradeY(xb, zb);
                const botY = -0.35;
                positions.push(xa, ya, za, xb, yb, zb, xb, botY, zb);
                normals.push(nx, 0, nz, nx, 0, nz, nx, 0, nz);
                positions.push(xa, ya, za, xb, botY, zb, xa, botY, za);
                normals.push(nx, 0, nz, nx, 0, nz, nx, 0, nz);
            };

            for (let c = 0; c < xCols.length; c++) {
                const [x0, x1, nxSteps] = xCols[c];
                for (let r = 0; r < zRows.length; r++) {
                    if (!isCellActive(c, r)) continue;
                    const [z0, z1, nzSteps] = zRows[r];
                    for (let ix = 0; ix < nxSteps; ix++) {
                        const xa = x0 + (ix / nxSteps) * (x1 - x0);
                        const xb = x0 + ((ix + 1) / nxSteps) * (x1 - x0);
                        const xm = (xa + xb) * 0.5;
                        const zMaxA = r === 5 ? getWashSidewalkBackZ(xa) + (xa < -25.50 ? 0.28 : 0.0) : z1;
                        const zMaxB = r === 5 ? getWashSidewalkBackZ(xb) + (xb < -25.50 ? 0.28 : 0.0) : z1;
                        for (let iz = 0; iz < nzSteps; iz++) {
                            const t0 = iz / nzSteps;
                            const t1 = (iz + 1) / nzSteps;
                            const za0 = z0 + t0 * (zMaxA - z0);
                            const za1 = z0 + t1 * (zMaxA - z0);
                            const zb0 = z0 + t0 * (zMaxB - z0);
                            const zb1 = z0 + t1 * (zMaxB - z0);
                            const zm = (za0 + za1 + zb0 + zb1) * 0.25;
                            // Skip interior triangles deep inside the solid Orondo Detention Wing mass
                            if (c === 0 && xm > -20.20 && zm > -24.80 && zm < 21.60) continue;

                            // Winding: (xa, za0) -> (xa, za1) -> (xb, zb1) and (xa, za0) -> (xb, zb1) -> (xb, zb0) gives +Y upward normal
                            pushSmoothTri(xa, za0, xa, za1, xb, zb1);
                            pushSmoothTri(xa, za0, xb, zb1, xb, zb0);
                        }
                    }

                    // Emit perimeter vertical skirts along exterior boundaries of active cells
                    if (!isCellActive(c - 1, r)) {
                        const zMax0 = r === 5 ? getWashSidewalkBackZ(x0) : z1;
                        for (let iz = 0; iz < nzSteps; iz++) {
                            const za = z0 + (iz / nzSteps) * (zMax0 - z0);
                            const zb = z0 + ((iz + 1) / nzSteps) * (zMax0 - z0);
                            pushSkirtSegment(x0, zb, x0, za, -1, 0);
                        }
                    }
                    if (!isCellActive(c + 1, r)) {
                        const zMax1 = r === 5 ? getWashSidewalkBackZ(x1) : z1;
                        for (let iz = 0; iz < nzSteps; iz++) {
                            const za = z0 + (iz / nzSteps) * (zMax1 - z0);
                            const zb = z0 + ((iz + 1) / nzSteps) * (zMax1 - z0);
                            pushSkirtSegment(x1, za, x1, zb, 1, 0);
                        }
                    }
                    if (!isCellActive(c, r - 1)) {
                        for (let ix = 0; ix < nxSteps; ix++) {
                            const xa = x0 + (ix / nxSteps) * (x1 - x0);
                            const xb = x0 + ((ix + 1) / nxSteps) * (x1 - x0);
                            pushSkirtSegment(xa, z0, xb, z0, 0, -1);
                        }
                    }
                    if (!isCellActive(c, r + 1)) {
                        for (let ix = 0; ix < nxSteps; ix++) {
                            const xa = x0 + (ix / nxSteps) * (x1 - x0);
                            const xb = x0 + ((ix + 1) / nxSteps) * (x1 - x0);
                            const za = r === 5 ? getWashSidewalkBackZ(xa) : z1;
                            const zb = r === 5 ? getWashSidewalkBackZ(xb) : z1;
                            pushSkirtSegment(xb, zb, xa, za, 0, 1);
                        }
                    }
                }
            }

            const lawnGeo = new THREE.BufferGeometry();
            lawnGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            lawnGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            const gradedLawnMesh = new THREE.Mesh(lawnGeo, turfLawnMat);
            gradedLawnMesh.name = 'Building300_GradedLawnAndBerm';
            gradedLawnMesh.receiveShadow = true;
            gradedLawnMesh.castShadow = false;
            arch.add(gradedLawnMesh);
        }

        // Foundation planter strip along the base of the front brick pavilion & bay window left open for user-planted bushes via TreePlanterFoundry

        // 10. Continuous Washington St Public Concrete Sidewalk + Recessed Parallel Disabled Parking Turnout Bay
        // Uses Building 400's exact sidewalk pattern (#e2dcd0 concrete, #f2eee6 raised curb, #9c9588 transverse expansion score joints every 1.75m, no center line)
        // and connects seamlessly with Building 316's Washington St sidewalk at lx = 28.355m and the Orondo Ave sidewalk at lx = -30.50m!
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
        {
            const swTopY = 0.34;
            const swBotY = -0.45;
            const swPos = [];
            const pushQuad = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) => {
                swPos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
                swPos.push(ax, ay, az, cx, cy, cz, dx, dy, dz);
            };

            // (A) 90° Polar-Meshed Rounded Corner Apron at Orondo Ave & Washington St (cx = -26.00m, cz = 34.92m, rInner = 2.20m, rOuter = 4.50m)
            //     Follows the exact terrain contour (`getWalkTerrainTopY`) and welds 1:1 with the Orondo Ave sidewalk at ang = 0 (z = 34.92m)
            //     and the Washington St sidewalk at ang = PI/2 (x = -26.00m) with zero chord cuts!
            const cornerCx = -26.00;
            const cornerCz = 34.92;
            const cornerRIn = 2.20;
            const cornerROut = 4.50;
            const cornerArcSteps = 32;
            const cornerRadialSteps = 6;
            for (let ia = 0; ia < cornerArcSteps; ia++) {
                const a0 = (ia / cornerArcSteps) * Math.PI * 0.5;
                const a1 = ((ia + 1) / cornerArcSteps) * Math.PI * 0.5;
                const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
                const cos1 = Math.cos(a1), sin1 = Math.sin(a1);

                for (let ir = 0; ir < cornerRadialSteps; ir++) {
                    const r0 = cornerRIn + (ir / cornerRadialSteps) * (cornerROut - cornerRIn);
                    const r1 = cornerRIn + ((ir + 1) / cornerRadialSteps) * (cornerROut - cornerRIn);

                    const x00 = cornerCx - cos0 * r0, z00 = cornerCz + sin0 * r0;
                    const x01 = cornerCx - cos0 * r1, z01 = cornerCz + sin0 * r1;
                    const x11 = cornerCx - cos1 * r1, z11 = cornerCz + sin1 * r1;
                    const x10 = cornerCx - cos1 * r0, z10 = cornerCz + sin1 * r0;

                    const y00 = getWalkTerrainTopY(x00, z00);
                    const y01 = getWalkTerrainTopY(x01, z01);
                    const y11 = getWalkTerrainTopY(x11, z11);
                    const y10 = getWalkTerrainTopY(x10, z10);

                    pushQuad(x00, y00, z00, x01, y01, z01, x11, y11, z11, x10, y10, z10);

                    if (ir === cornerRadialSteps - 1) {
                        pushQuad(x01, y01, z01, x01, swBotY, z01, x11, swBotY, z11, x11, y11, z11);
                    }
                    if (ir === 0) {
                        pushQuad(x10, y10, z10, x10, swBotY, z10, x00, swBotY, z00, x00, y00, z00);
                    }
                }
            }

            // (B) Straight & Indented Washington St Sidewalk from lx = -26.00m to +28.36m
            const xMinSw = -26.00;
            const xMaxSw = 28.36;
            const xStepsSw = 108;
            for (let i = 0; i < xStepsSw; i++) {
                const x0 = xMinSw + (i / xStepsSw) * (xMaxSw - xMinSw);
                const x1 = xMinSw + ((i + 1) / xStepsSw) * (xMaxSw - xMinSw);
                const zb0 = getWashSidewalkBackZ(x0);
                const zb1 = getWashSidewalkBackZ(x1);
                const zf0 = getWashSidewalkCurbZ(x0);
                const zf1 = getWashSidewalkCurbZ(x1);

                const yb0 = getWalkTerrainTopY(x0, zb0);
                const yb1 = getWalkTerrainTopY(x1, zb1);
                const yf0 = getWalkTerrainTopY(x0, zf0);
                const yf1 = getWalkTerrainTopY(x1, zf1);

                // Top sidewalk surface (+Y)
                pushQuad(x0, yb0, zb0, x0, yf0, zf0, x1, yf1, zf1, x1, yb1, zb1);
                // Outer street/curb face (+Z)
                pushQuad(x0, yf0, zf0, x0, swBotY, zf0, x1, swBotY, zf1, x1, yf1, zf1);
                // Inner lawn face (-Z)
                pushQuad(x1, yb1, zb1, x1, swBotY, zb1, x0, swBotY, zb0, x0, yb0, zb0);
            }

            const swGeo = new THREE.BufferGeometry();
            swGeo.setAttribute('position', new THREE.Float32BufferAttribute(swPos, 3));
            swGeo.computeVertexNormals();
            const swMesh = new THREE.Mesh(swGeo, plazaConcreteMat);
            swMesh.receiveShadow = true;
            arch.add(swMesh);

            // Transverse expansion score joints every 1.75m matching Building 400's pattern (plus radial joints on the rounded Orondo/Washington corner)
            for (let sx = -25.90; sx <= 28.15; sx += 1.75) {
                const zb = getWashSidewalkBackZ(sx);
                const zf = getWashSidewalkCurbZ(sx);
                const d = zf - zb;
                const zm = (zb + zf) * 0.5 - 0.06;
                const ym = getWalkTerrainTopY(sx, zm);
                addBox(0.025, 0.012, Math.max(0.5, d - 0.22), swScoreMat, sx, ym + 0.006, zm, false);
            }
            // Radial fan score joints across the rounded Orondo Ave & Washington St corner apron (contoured to the terrain slope!)
            [0.22, 0.48, 0.74].forEach((tAng) => {
                const ang = tAng * Math.PI * 0.5;
                const rInner = 2.25;
                const rOuter = 4.35;
                const rMid = (rInner + rOuter) * 0.5;
                const jLen = rOuter - rInner;
                const jx = -26.00 - Math.cos(ang) * rMid;
                const jz = 34.92 + Math.sin(ang) * rMid;
                const xIn = -26.00 - Math.cos(ang) * rInner;
                const zIn = 34.92 + Math.sin(ang) * rInner;
                const xOut = -26.00 - Math.cos(ang) * rOuter;
                const zOut = 34.92 + Math.sin(ang) * rOuter;
                const yIn = getWalkTerrainTopY(xIn, zIn);
                const yOut = getWalkTerrainTopY(xOut, zOut);
                const rJoint = addBox(jLen, 0.012, 0.025, swScoreMat, jx, (yIn + yOut) * 0.5 + 0.006, jz, false);
                rJoint.rotation.order = 'YXZ';
                rJoint.rotation.y = ang;
                rJoint.rotation.z = Math.atan2(yIn - yOut, jLen);
            });

            // Terrain-Contoured Dark Road Asphalt for the Recessed Parallel Disabled Parking Bay & Rounded Corner Spandrel
            // Uses the exact procedural asphalt grain texture & #282c34 color multiplier as WashingtonStreetCorridor.js
            // and samples `sampleOrondoTerrainLocalY(x, z) + 0.0165` on a 2D grid so it follows the terrain slope 100%!
            const bayAsphaltCan = document.createElement('canvas');
            bayAsphaltCan.width = 256;
            bayAsphaltCan.height = 256;
            const baCtx = bayAsphaltCan.getContext('2d');
            baCtx.fillStyle = '#252930';
            baCtx.fillRect(0, 0, 256, 256);
            for (let i = 0; i < 6000; i++) {
                const px = (i * 73) % 256;
                const py = (i * 137) % 256;
                const v = 30 + ((i * 29) % 24);
                baCtx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
                baCtx.fillRect(px, py, 2, 2);
            }
            const bayAsphaltTex = new THREE.CanvasTexture(bayAsphaltCan);
            bayAsphaltTex.wrapS = THREE.RepeatWrapping;
            bayAsphaltTex.wrapT = THREE.RepeatWrapping;
            bayAsphaltTex.repeat.set(8, 8);
            bayAsphaltTex.colorSpace = THREE.SRGBColorSpace;
            const bayAsphaltMat = new THREE.MeshStandardMaterial({
                color: '#282c34',
                map: bayAsphaltTex,
                roughness: 0.86,
                metalness: 0.04,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1
            });

            const bayPos = [];
            const bayUv = [];
            const pushBayQuad = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) => {
                bayPos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
                bayPos.push(ax, ay, az, cx, cy, cz, dx, dy, dz);
                bayUv.push(ax * 0.25, az * 0.25, bx * 0.25, bz * 0.25, cx * 0.25, cz * 0.25);
                bayUv.push(ax * 0.25, az * 0.25, cx * 0.25, cz * 0.25, dx * 0.25, dz * 0.25);
            };
            const bayStepsX = 64;
            const bayStepsZ = 10;
            const bayX0 = -30.52;
            const bayX1 = -2.00;
            const zsMax = 39.48;
            for (let ix = 0; ix < bayStepsX; ix++) {
                const x0 = bayX0 + (ix / bayStepsX) * (bayX1 - bayX0);
                const x1 = bayX0 + ((ix + 1) / bayStepsX) * (bayX1 - bayX0);
                const zc0 = getWashSidewalkCurbZ(x0) - 0.10;
                const zc1 = getWashSidewalkCurbZ(x1) - 0.10;
                for (let iz = 0; iz < bayStepsZ; iz++) {
                    const tz0 = iz / bayStepsZ;
                    const tz1 = (iz + 1) / bayStepsZ;
                    const z00 = zc0 + tz0 * (zsMax - zc0);
                    const z01 = zc0 + tz1 * (zsMax - zc0);
                    const z11 = zc1 + tz1 * (zsMax - zc1);
                    const z10 = zc1 + tz0 * (zsMax - zc1);

                    const y00 = sampleOrondoTerrainLocalY(x0, z00) + 0.0165;
                    const y01 = sampleOrondoTerrainLocalY(x0, z01) + 0.0165;
                    const y11 = sampleOrondoTerrainLocalY(x1, z11) + 0.0165;
                    const y10 = sampleOrondoTerrainLocalY(x1, z10) + 0.0165;

                    pushBayQuad(x0, y00, z00, x0, y01, z01, x1, y11, z11, x1, y10, z10);
                }
            }
            const bayGeo = new THREE.BufferGeometry();
            bayGeo.setAttribute('position', new THREE.Float32BufferAttribute(bayPos, 3));
            bayGeo.setAttribute('uv', new THREE.Float32BufferAttribute(bayUv, 2));
            bayGeo.computeVertexNormals();
            const bayMesh = new THREE.Mesh(bayGeo, bayAsphaltMat);
            bayMesh.receiveShadow = true;
            arch.add(bayMesh);

            // Raised Concrete Curb following getWashSidewalkCurbZ(lx) around the Recessed Disabled Parking Bay (lx = -21.80m .. -2.20m)
            const curbBayX0 = -21.80;
            const curbBayX1 = -2.20;
            for (let i = 0; i < 36; i++) {
                const xa = curbBayX0 + (i / 36) * (curbBayX1 - curbBayX0);
                const xb = curbBayX0 + ((i + 1) / 36) * (curbBayX1 - curbBayX0);
                const za = getWashSidewalkCurbZ(xa) - 0.07;
                const zb = getWashSidewalkCurbZ(xb) - 0.07;
                const xm = (xa + xb) * 0.5;
                const zm = (za + zb) * 0.5;
                const topY = getWalkTerrainTopY(xm, zm) + 0.03;
                const botY = sampleOrondoTerrainLocalY(xm, zm) - 0.06;
                const curbH = Math.max(0.20, topY - botY);
                const segLen = Math.hypot(xb - xa, zb - za) + 0.02;
                const curbSeg = addBox(segLen, curbH, 0.15, whiteCurbMat, xm, botY + curbH * 0.5, zm, false);
                curbSeg.rotation.y = -Math.atan2(zb - za, xb - xa);
            }

            // Polar & Terrain-Contoured Traffic-Yellow & Fire-Lane-Red Painted Rounded Corner Curb at Orondo Ave & Washington St (1a7cd213.jpg, 73722af4.jpg, eeb5c507.jpg!)
            const cornerRedCurbMat = new THREE.MeshStandardMaterial({ color: '#c8322b', roughness: 0.72, metalness: 0.05 });
            const curbRadius = cornerROut - 0.07;
            for (let ia = 0; ia < cornerArcSteps; ia++) {
                const a0 = (ia / cornerArcSteps) * Math.PI * 0.5;
                const a1 = ((ia + 1) / cornerArcSteps) * Math.PI * 0.5;
                const xa = cornerCx - Math.cos(a0) * curbRadius;
                const za = cornerCz + Math.sin(a0) * curbRadius;
                const xb = cornerCx - Math.cos(a1) * curbRadius;
                const zb = cornerCz + Math.sin(a1) * curbRadius;
                const xm = (xa + xb) * 0.5;
                const zm = (za + zb) * 0.5;
                const yaTop = getWalkTerrainTopY(xa, za) + 0.03;
                const ybTop = getWalkTerrainTopY(xb, zb) + 0.03;
                const ymTop = (yaTop + ybTop) * 0.5;
                const ymBot = sampleOrondoTerrainLocalY(xm, zm) - 0.14;
                const curbH = Math.max(0.28, ymTop - ymBot);
                const segLen = Math.hypot(xb - xa, zb - za) + 0.025;
                const cMat = xm < -27.10 ? cornerRedCurbMat : bollardYellowMat;
                const cSeg = addBox(segLen, curbH, 0.16, cMat, xm, ymBot + curbH * 0.5, zm, false);
                cSeg.rotation.order = 'YXZ';
                cSeg.rotation.y = -Math.atan2(zb - za, xb - xa);
                cSeg.rotation.z = Math.atan2(ybTop - yaTop, segLen);
            }
            // Straight yellow curb continuation from lx = -26.00m to -21.65m
            addBox(4.35, 0.38, 0.16, bollardYellowMat, -23.825, 0.18, 39.35, false);
            //   - Right End Yellow Curb (in front of the "ONE WAY / NO PARKING" signpost: lx = -2.20m .. +2.80m)
            addBox(5.00, 0.31, 0.16, bollardYellowMat, 0.30, 0.215, 39.34, false);
            //   - Standard Concrete Curb along the rest of Building 300 (lx = +2.80m .. +28.36m, strictly collinear & flush with Building 316!)
            addBox(25.56, 0.31, 0.16, whiteCurbMat, 15.58, 0.215, 39.34, false);

            // Narrow Concrete Footpath connecting the indented sidewalk (lz = 35.15m) back to the corner monument sign / fence at lx = -15.10m (02151d17.jpg & 73722af4.jpg!)
            const pathFoot = addBox(0.82, 0.08, 4.20, plazaConcreteMat, -15.10, 0.305, 33.20, false);
            pathFoot.rotation.y = -0.14;

            // Procedural ADA Accessible Parking Sign Texture (White Sign with Green/Blue Border & Blue International Wheelchair Symbol ♿)
            const adaSignCan = document.createElement('canvas');
            adaSignCan.width = 128;
            adaSignCan.height = 192;
            const aCtx = adaSignCan.getContext('2d');
            aCtx.fillStyle = '#f8fafc';
            aCtx.fillRect(0, 0, 128, 192);
            aCtx.strokeStyle = '#15803d';
            aCtx.lineWidth = 6;
            aCtx.strokeRect(5, 5, 118, 182);
            aCtx.fillStyle = '#15803d';
            aCtx.font = 'bold 18px Arial, sans-serif';
            aCtx.textAlign = 'center';
            aCtx.fillText('RESERVED', 64, 30);
            aCtx.fillText('PARKING', 64, 50);
            // Blue ADA wheelchair icon box in center
            aCtx.fillStyle = '#1d4ed8';
            aCtx.fillRect(28, 62, 72, 72);
            aCtx.fillStyle = '#ffffff';
            aCtx.font = 'bold 52px Arial, sans-serif';
            aCtx.fillText('♿', 64, 116);
            aCtx.fillStyle = '#15803d';
            aCtx.font = 'bold 15px Arial, sans-serif';
            aCtx.fillText('DISABLED', 64, 156);
            aCtx.fillText('PERMIT ONLY', 64, 174);

            const adaSignTex = new THREE.CanvasTexture(adaSignCan);
            adaSignTex.colorSpace = THREE.SRGBColorSpace;
            const adaSignMat = new THREE.MeshStandardMaterial({
                map: adaSignTex,
                roughness: 0.42,
                metalness: 0.15
            });

            // 3 Vertical Disabled Parking Signposts along the recessed curb edge (lx = -17.60m, -13.10m, -8.60m, lz = 37.12m — 73722af4.jpg & 02151d17.jpg!)
            [-17.60, -13.10, -8.60].forEach((sx) => {
                const post = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.022, 0.022, 1.08, 8),
                    silverFlashingMat
                );
                post.position.set(sx, 0.34 + 0.54, 37.12);
                post.castShadow = true;
                arch.add(post);

                const plate = new THREE.Mesh(
                    new THREE.BoxGeometry(0.30, 0.44, 0.025),
                    [whiteDoorMat, whiteDoorMat, whiteDoorMat, whiteDoorMat, adaSignMat, whiteDoorMat]
                );
                plate.position.set(sx, 0.34 + 0.98, 37.12);
                plate.castShadow = true;
                arch.add(plate);
            });

            // Orondo Ave & Washington St Corner Red Octagonal STOP Sign & Green Street-Name Blades (lx = -24.60m, lz = 38.80m — 73722af4.jpg & b326f8cd.jpg!)
            {
                const stopX = -24.60;
                const stopZ = 38.80;
                const stopPost = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.028, 0.028, 2.75, 10),
                    silverFlashingMat
                );
                stopPost.position.set(stopX, 0.34 + 1.375, stopZ);
                stopPost.castShadow = true;
                arch.add(stopPost);

                // Red Octagonal STOP Sign facing Orondo Ave / Washington St
                const stopMat = new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.45, metalness: 0.15 });
                const stopOct = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.025, 8), stopMat);
                stopOct.rotation.x = Math.PI * 0.5;
                stopOct.rotation.z = Math.PI / 8;
                stopOct.position.set(stopX, 0.34 + 2.08, stopZ);
                stopOct.castShadow = true;
                arch.add(stopOct);

                // Green Street-Name Blades ("Washington St" / "Orondo Ave") at top of post
                const streetBladeMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.45, metalness: 0.18 });
                addBox(0.76, 0.16, 0.025, streetBladeMat, stopX, 0.34 + 2.62, stopZ);
                addBox(0.025, 0.16, 0.72, streetBladeMat, stopX, 0.34 + 2.78, stopZ);
            }

            // Tall Silver Curved-Arm Streetlight Pole at the Orondo Ave & Washington St Corner (lx = -27.40m, lz = 38.25m — 5d82a32a.jpg!)
            {
                const slX = -27.40;
                const slZ = 38.25;
                const slBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.32, 8), silverFlashingMat);
                slBase.position.set(slX, 0.34 + 0.16, slZ);
                arch.add(slBase);
                const slPole = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.13, 8.20, 12), silverFlashingMat);
                slPole.position.set(slX, 0.34 + 4.10, slZ);
                slPole.castShadow = true;
                arch.add(slPole);
                // "SPEED LIMIT 30" + "NO TURN ON RED" signs mounted on the corner streetlight pole
                addBox(0.42, 0.54, 0.03, whiteDoorMat, slX - 0.11, 2.45, slZ);
                addBox(0.40, 0.48, 0.03, whiteDoorMat, slX - 0.11, 3.85, slZ);
            }
        }

        // 11. Continuous Terrain-Contoured Orondo Avenue Sidewalk from Washington St Corner (lz = +37.16m)
        //     all the way across 428 Orondo Avenue (lz = -89.80m), including a seamless concrete driveway apron across the Unnamed Road (lz = -37.80m .. -44.90m)
        //     Uses Building 400's exact sidewalk pattern (#e2dcd0 concrete, #f2eee6 raised curb, #9c9588 transverse expansion score joints every 1.75m, no center line):
        {
            const orondoSwMat = plazaConcreteMat;

            const buildOrondoContouredStrip = (xMin, xMax, zMin, zMax, zSteps, topDelta, mat, useLocalTerrain = false) => {
                const pos = [];
                const pushQ = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) => {
                    pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
                    pos.push(ax, ay, az, cx, cy, cz, dx, dy, dz);
                };
                const evalY = (x, z) => {
                    const swY = getOrondoSidewalkTopY(z) + topDelta;
                    const cornerBlend = smooth01((z - 22.0) / (34.92 - 22.0));
                    const walkY = getWalkTerrainTopY(x, z) + topDelta;
                    const baseSwY = THREE.MathUtils.lerp(swY, walkY, cornerBlend);
                    if (!useLocalTerrain) return baseSwY;
                    const terrY = sampleOrondoTerrainLocalY(x, z) + 0.13 + topDelta;
                    return Math.max(baseSwY, terrY);
                };
                for (let i = 0; i < zSteps; i++) {
                    const z0 = zMin + (i / zSteps) * (zMax - zMin);
                    const z1 = zMin + ((i + 1) / zSteps) * (zMax - zMin);
                    const yTop00 = evalY(xMin, z0);
                    const yTop01 = evalY(xMin, z1);
                    const yTop11 = evalY(xMax, z1);
                    const yTop10 = evalY(xMax, z0);
                    const yBot00 = yTop00 - 0.45;
                    const yBot01 = yTop01 - 0.45;
                    const yBot11 = yTop11 - 0.45;
                    const yBot10 = yTop10 - 0.45;

                    // Top (+Y)
                    pushQ(xMin, yTop00, z0, xMin, yTop01, z1, xMax, yTop11, z1, xMax, yTop10, z0);
                    // Outer Orondo Ave face (-X)
                    pushQ(xMin, yTop01, z1, xMin, yTop00, z0, xMin, yBot00, z0, xMin, yBot01, z1);
                    // Inner property face (+X)
                    pushQ(xMax, yTop10, z0, xMax, yTop11, z1, xMax, yBot11, z1, xMax, yBot10, z0);
                    if (i === 0) {
                        pushQ(xMax, yTop10, z0, xMin, yTop00, z0, xMin, yBot00, z0, xMax, yBot10, z0);
                    }
                    if (i === zSteps - 1) {
                        pushQ(xMin, yTop01, z1, xMax, yTop11, z1, xMax, yBot11, z1, xMin, yBot01, z1);
                    }
                }
                const geo = new THREE.BufferGeometry();
                geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
                geo.computeVertexNormals();
                const m = new THREE.Mesh(geo, mat);
                m.receiveShadow = true;
                m.userData = { isSelectableBuilding: true, building };
                arch.add(m);
                return m;
            };

            const orondoSwXMin = -30.50;
            const orondoSwXMax = -28.20;
            const orondoSwMidX = (orondoSwXMin + orondoSwXMax) * 0.5; // -29.35m
            const orondoSwW = orondoSwXMax - orondoSwXMin;            // 2.30m
            const redCurbMat = new THREE.MeshStandardMaterial({ color: '#c8322b', roughness: 0.72, metalness: 0.05 });

            // Two Main Sidewalk Segments + Seamless Driveway Apron Bridge across the Unnamed Service Road (lz = -44.90m .. -37.80m):
            //   - Segment A: lz = -37.80m .. +34.92m (meets the 90° rounded corner apron at lz = 34.92m!)
            //   - Segment B: lz = -89.80m .. -44.90m (from Unnamed Road past the County parking lot and across the entire front of 428 Orondo Ave!)
            const orondoSegments = [
                { zMin: -37.80, zMax: 34.92, steps: 120 },
                { zMin: -89.80, zMax: -44.90, steps: 72 }
            ];

            orondoSegments.forEach(({ zMin, zMax, steps }) => {
                // Main concrete sidewalk slab (prioritized over terrain)
                buildOrondoContouredStrip(orondoSwXMin, orondoSwXMax, zMin, zMax, steps, 0.0, orondoSwMat, false);
                // Raised outer concrete street curb along Orondo Ave (lx = -30.50m .. -30.34m)
                buildOrondoContouredStrip(orondoSwXMin, orondoSwXMin + 0.16, zMin, zMax, steps, 0.030, whiteCurbMat, false);

                // Transverse expansion score joints every 1.75m matching Building 400's pattern (no longitudinal center line, inset from outer curb)
                for (let sz = zMin + 1.50; sz <= zMax - 0.50; sz += 1.75) {
                    const cBlend = smooth01((sz - 22.0) / (34.92 - 22.0));
                    const yOut = THREE.MathUtils.lerp(getOrondoSidewalkTopY(sz), getWalkTerrainTopY(orondoSwXMin, sz), cBlend);
                    const yIn = THREE.MathUtils.lerp(getOrondoSidewalkTopY(sz), getWalkTerrainTopY(orondoSwXMax, sz), cBlend);
                    const yHere = (yOut + yIn) * 0.5;
                    const yPrev = THREE.MathUtils.lerp(getOrondoSidewalkTopY(sz - 0.35), getWalkTerrainTopY(orondoSwMidX, sz - 0.35), cBlend);
                    const yNext = THREE.MathUtils.lerp(getOrondoSidewalkTopY(sz + 0.35), getWalkTerrainTopY(orondoSwMidX, sz + 0.35), cBlend);
                    const jMesh = addBox(orondoSwW - 0.22, 0.012, 0.025, swScoreMat, orondoSwMidX + 0.06, yHere + 0.006, sz, false);
                    jMesh.rotation.order = 'YXZ';
                    jMesh.rotation.x = Math.atan2(yPrev - yNext, 0.70);
                    jMesh.rotation.z = Math.atan2(yIn - yOut, orondoSwW);
                }
            });

            // Seamless Concrete Driveway Apron & Pedestrian Crosswalk across the Unnamed Service Road Entrance (lz = -44.95m .. -37.75m)
            // Keeps the Orondo Ave sidewalk route 100% continuous between Segment A and Segment B while flaring inward to the service road!
            buildOrondoContouredStrip(orondoSwXMin, -25.40, -44.95, -37.75, 16, -0.004, orondoSwMat, true);
            for (let sz = -44.90; sz <= -37.80; sz += 1.775) {
                const yHere = getOrondoSidewalkTopY(sz);
                const yPrev = getOrondoSidewalkTopY(sz - 0.35);
                const yNext = getOrondoSidewalkTopY(sz + 0.35);
                const jMesh = addBox(orondoSwW - 0.18, 0.012, 0.025, swScoreMat, orondoSwMidX + 0.04, yHere + 0.004, sz, false);
                jMesh.rotation.x = Math.atan2(yPrev - yNext, 0.70);
            }

            // Red-painted Fire Lane Curb along the corner fire hydrant zone on Orondo Ave (lz = 18.00m .. 34.92m — 1a7cd213.jpg & 5d82a32a.jpg!)
            buildOrondoContouredStrip(orondoSwXMin - 0.01, orondoSwXMin + 0.17, 18.00, 34.92, 24, 0.038, redCurbMat, false);

            // Flared Concrete Driveway Curb Returns on Both Sides of the Unnamed Road Entrance (lz = -37.80m and lz = -44.90m — 8ebc6149.jpg!)
            [-37.80, -44.90].forEach((gapZ) => {
                const gy = getOrondoSidewalkTopY(gapZ);
                addBox(2.80, 0.16, 0.18, whiteCurbMat, -26.80, gy + 0.02, gapZ, false);
            });

            // Landscaped Green Grass Tree Strip + Inner Parking Lot Concrete Curb between the Unnamed Road (lz = -44.90m) and 428 Orondo Ave (lz = -73.08m)
            // Seen in 8ebc6149.jpg, e522048d.jpg, and 8c976c55.jpg!
            buildOrondoContouredStrip(-28.20, -25.40, -73.08, -44.90, 48, -0.025, turfLawnMat, true);
            buildOrondoContouredStrip(-25.56, -25.38, -73.08, -44.90, 48, 0.04, whiteCurbMat, true);

            // Two Yellow Municipal Fire Hydrants along Orondo Avenue (at lz = 28.80m near the corner in 5d82a32a.jpg, and at lz = -34.20m near the unnamed road in 8ebc6149.jpg!)
            const hydYellowMat = new THREE.MeshStandardMaterial({ color: '#d89b18', roughness: 0.45, metalness: 0.25 });
            [28.80, -34.20].forEach((hz) => {
                const hy = getLawnGradeY(-27.25, hz);
                const hGrp = new THREE.Group();
                hGrp.position.set(-27.25, hy, hz);
                const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.56, 12), hydYellowMat);
                barrel.position.y = 0.28;
                barrel.castShadow = true;
                hGrp.add(barrel);
                const bonnet = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hydYellowMat);
                bonnet.position.y = 0.56;
                hGrp.add(bonnet);
                const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.28, 10), hydYellowMat);
                noz.rotation.z = Math.PI * 0.5;
                noz.position.y = 0.36;
                hGrp.add(noz);
                arch.add(hGrp);
            });

            // Blue USPS Collection Box on the Orondo Ave sidewalk edge near the corner monument sign (lx = -27.75m, lz = 25.40m — 5d82a32a.jpg!)
            {
                const uspsMat = new THREE.MeshStandardMaterial({ color: '#1d4ed8', roughness: 0.45, metalness: 0.30 });
                const by = getOrondoSidewalkTopY(25.40);
                addBox(0.52, 0.82, 0.52, uspsMat, -27.75, by + 0.41, 25.40);
                const topRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.52, 12, 1, false, 0, Math.PI), uspsMat);
                topRoll.rotation.x = Math.PI * 0.5;
                topRoll.position.set(-27.75, by + 0.82, 25.40);
                arch.add(topRoll);
            }
        }

        // Gravel-lined drainage swale along the South Detention Wall (b5ec68b4.jpg)
        {
            const swaleMat = new THREE.MeshStandardMaterial({ color: '#6e655c', roughness: 0.95, metalness: 0.02 });
            const swaleSeg = new THREE.Mesh(new THREE.BoxGeometry(3.40, 0.06, 11.50), swaleMat);
            swaleSeg.position.set(-10.50, getLawnGradeY(-10.50, -27.80) - 0.01, -27.80);
            swaleSeg.rotation.y = -1.57;
            swaleSeg.receiveShadow = true;
            arch.add(swaleSeg);
        }

        // Freestanding Variegated-Brick Corner Monument Sign ("CHELAN COUNTY / JUVENILE / JUSTICE CENTER") at the Orondo Ave & Washington St Corner (e5a79256.jpg!)
        const monSignGrp = new THREE.Group();
        monSignGrp.position.set(-25.85, getLawnGradeY(-25.85, 24.05) - 0.02, 24.05);
        monSignGrp.rotation.y = -Math.PI * 0.25; // Rotated counter-clockwise to face outward toward the Orondo Ave & Washington St intersection!
        // Red-brown brick paver apron border around the monument sign base (e5a79256.jpg)
        const paverApron = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.08, 1.18), hedgeRedMat);
        paverApron.position.set(0, 0.04, 0.16);
        paverApron.receiveShadow = true;
        monSignGrp.add(paverApron);
        // Smooth beige concrete base plinth
        const monPlinth = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.28, 0.48), plinthBeigeMat);
        monPlinth.position.set(0, 0.18, 0);
        monSignGrp.add(monPlinth);
        // Variegated tan/gold/brown brick monument body
        const monBrick = new THREE.Mesh(new THREE.BoxGeometry(2.18, 1.12, 0.42), varBrickMat);
        monBrick.position.set(0, 0.88, 0);
        monBrick.castShadow = true;
        monBrick.receiveShadow = true;
        monSignGrp.add(monBrick);
        // Overhanging smooth beige precast concrete cap
        const monCap = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.12, 0.54), plinthBeigeMat);
        monCap.position.set(0, 1.50, 0);
        monCap.castShadow = true;
        monSignGrp.add(monCap);
        // 3-Line Raised Silver Lettering Plaque ("CHELAN COUNTY / JUVENILE / JUSTICE CENTER", e5a79256.jpg!)
        const monSignTex = foundry._createTextPlaqueTexture(
            ['CHELAN COUNTY', 'JUVENILE', 'JUSTICE CENTER'],
            '#8d6748',
            '#f4f6f8',
            512,
            220
        );
        const monSignMat = new THREE.MeshStandardMaterial({ map: monSignTex, roughness: 0.42, metalness: 0.35 });
        const monPlaque = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.82, 0.04), monSignMat);
        monPlaque.position.set(0, 0.90, 0.205);
        monSignGrp.add(monPlaque);
        arch.add(monSignGrp);

        // Streetlamp Poles inside the Orondo Ave & North Corner Fence (28619543.jpg, 9bf67bc6.jpg, 3e0daacd.jpg)
        [[-27.20, -10.50], [-27.20, 7.20], [-22.40, 24.80]].forEach(([px, pz]) => {
            const pGradeY = getLawnGradeY(px, pz);
            const oPole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 6.20, 10), blackIronMat);
            oPole.position.set(px, pGradeY + 3.10, pz);
            oPole.castShadow = true;
            arch.add(oPole);
            addBox(0.36, 0.14, 0.24, blackIronMat, px + 0.18, pGradeY + 6.15, pz);
        });

}