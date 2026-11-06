import * as THREE from 'three';

export function buildBuilding300GroundsAndGrading(ctx) {
    const {
        foundry, arch, addBox, getLawnGradeY,
        varBrickMat, plinthBeigeMat, silverFlashingMat, whiteDoorMat, blackIronMat,
        plazaConcreteMat, plazaJointMat, pipeRailMat, hedgeGreenMat, hedgeRedMat, turfLawnMat
    } = ctx;

        // Tall Lush Ornamental Corner Bush at the front-left brick pier (lx = -0.35m, lz = 34.35m, 1b3e695e.jpg & b9f0c60c.jpg!)
        [
            [1.65, 33.25, 2.45, 2.15, hedgeGreenMat],
            [2.85, 34.15, 1.95, 1.75, hedgeGreenMat],
            [0.85, 32.45, 1.45, 0.85, hedgeRedMat]
        ].forEach(([bx, bz, bw, bh, bMat]) => {
            const bush = new THREE.Mesh(new THREE.SphereGeometry(bw * 0.55, 12, 10), bMat);
            bush.scale.set(1.15, bh / (bw * 1.1), 1.05);
            bush.position.set(bx, getLawnGradeY(bx, bz) + bh * 0.40, bz);
            bush.castShadow = true;
            bush.receiveShadow = true;
            arch.add(bush);
        });

        // Tall dark bronze street/parking light pole + concrete footing + "ONE WAY / NO PARKING" signpost on the left grass strip along Washington St (lx = -3.85m, lz = 35.60m, 5e51fcab.jpg & 3474ae91.jpg!)
        const eastPoleGradeY = getLawnGradeY(-3.85, 35.60);
        addBox(0.42, 0.16, 0.42, plazaConcreteMat, -3.85, eastPoleGradeY + 0.03, 35.60);
        const eastPole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 8.20, 12), blackIronMat);
        eastPole.position.set(-3.85, eastPoleGradeY + 4.10, 35.60);
        eastPole.castShadow = true;
        arch.add(eastPole);
        // Cobra-head luminaire arm at top of pole + lower floodlight (5e51fcab.jpg left)
        addBox(1.15, 0.08, 0.12, blackIronMat, -3.35, eastPoleGradeY + 8.15, 35.60);
        addBox(0.38, 0.12, 0.22, blackIronMat, -3.55, eastPoleGradeY + 5.85, 35.60);
        // Street signpost next to light pole ("ONE WAY" + "NO PARKING", 5e51fcab.jpg & 3474ae91.jpg)
        addBox(0.05, 2.55, 0.05, silverFlashingMat, -4.65, 1.55, 36.65);
        addBox(0.42, 0.48, 0.03, blackIronMat, -4.65, 2.45, 36.65);
        addBox(0.36, 0.42, 0.03, whiteDoorMat, -4.65, 1.92, 36.65);


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
                [-29.20, -25.60, 10],
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
                        for (let iz = 0; iz < nzSteps; iz++) {
                            const za = z0 + (iz / nzSteps) * (z1 - z0);
                            const zb = z0 + ((iz + 1) / nzSteps) * (z1 - z0);
                            const zm = (za + zb) * 0.5;
                            // Skip interior triangles deep inside the solid Orondo Detention Wing mass
                            if (c === 0 && xm > -20.20 && zm > -24.80 && zm < 21.60) continue;

                            // Winding: (xa, za) -> (xa, zb) -> (xb, zb) and (xa, za) -> (xb, zb) -> (xb, za) gives +Y upward normal
                            pushSmoothTri(xa, za, xa, zb, xb, zb);
                            pushSmoothTri(xa, za, xb, zb, xb, za);
                        }
                    }

                    // Emit perimeter vertical skirts along exterior boundaries of active cells
                    if (!isCellActive(c - 1, r)) {
                        for (let iz = 0; iz < nzSteps; iz++) {
                            const za = z0 + (iz / nzSteps) * (z1 - z0);
                            const zb = z0 + ((iz + 1) / nzSteps) * (z1 - z0);
                            pushSkirtSegment(x0, zb, x0, za, -1, 0);
                        }
                    }
                    if (!isCellActive(c + 1, r)) {
                        for (let iz = 0; iz < nzSteps; iz++) {
                            const za = z0 + (iz / nzSteps) * (z1 - z0);
                            const zb = z0 + ((iz + 1) / nzSteps) * (z1 - z0);
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
                            pushSkirtSegment(xb, z1, xa, z1, 0, 1);
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
            bush.position.set(bx, getLawnGradeY(bx, bz) + bh * 0.40, bz);
            bush.castShadow = true;
            bush.receiveShadow = true;
            arch.add(bush);
        });

        // Continuous Washington St Public Concrete Sidewalk in front of Building 300 Perfectly Collinear with Building 316's Sidewalk (lx = -28.20m..28.40m, lz = 37.12m..39.42m = lz316 29.55m..31.85m!)
        const sw300W = 56.60;
        const sw300D = 2.30;
        const sw300Cx = 0.10;
        const sw300Cz = 38.27;
        addBox(sw300W, 0.26, sw300D, plazaConcreteMat, sw300Cx, 0.21, sw300Cz, false);
        // Longitudinal center score joint & transverse control joints every 1.75m (strictly collinear with Building 316's center score joint at lz316 = 30.70m -> lz300 = 38.27m!)
        addBox(sw300W, 0.27, 0.03, plazaJointMat, sw300Cx, 0.215, sw300Cz, false);
        for (let sx = -27.65; sx <= 28.35; sx += 1.75) {
            addBox(0.03, 0.27, sw300D + 0.02, plazaJointMat, sx, 0.215, sw300Cz, false);
        }
        // Raised Concrete Street Curb along the outer Washington St edge of the sidewalk (lz = 39.34m = lz316 31.77m — zero step!)
        addBox(sw300W, 0.29, 0.16, whiteDoorMat, sw300Cx, 0.225, 39.34, false);


        // Gravel-lined drainage swale along the South Rec Yard and South Detention Wall (28619543.jpg, c5e2718f.jpg & b5ec68b4.jpg)
        const swaleMat = new THREE.MeshStandardMaterial({ color: '#6e655c', roughness: 0.95, metalness: 0.02 });
        [
            [-26.20, -21.80, 1.15, 5.20, -0.35],
            [-24.40, -25.80, 1.15, 5.40, -0.85],
            [-20.20, -27.60, 1.15, 5.60, -1.35],
            [-10.50, -27.80, 3.40, 11.50, -1.57]
        ].forEach(([sx, sz, sw, sd, sRot]) => {
            const swaleSeg = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.06, sd), swaleMat);
            swaleSeg.position.set(sx, getLawnGradeY(sx, sz) - 0.01, sz);
            swaleSeg.rotation.y = sRot;
            swaleSeg.receiveShadow = true;
            arch.add(swaleSeg);
        });

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