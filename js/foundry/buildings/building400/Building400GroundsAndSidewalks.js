import * as THREE from 'three';

export function buildBuilding400GroundsAndSidewalks(ctx) {
    const {
        foundry, arch, addBox, wallZ, frontWingZ,
        lowerPlazaY, lowerNumSteps, lowerStepRise, lowerStepRun, getConcreteTopY,
        washX, portX, portDepth, portW, deckY,
        creamBrickSolidMat, plinthConcreteMat, plazaConcreteMat, whiteCurbMat,
        turfMat, darkMetalMat, galvSteelMat, blueTreadMat, globeMat, glassMat, trimMat, soilMat
    } = ctx;

        // 1. Upper Terrace Concrete Walkway (y = -0.51m up to 0.0m, spanning from SW sidewalk lx = -3.4m across to Right-Side Steps lx = 10.65m,
        //    and from indented frontWingZ = 14.14m out to lz = wallZ + 4.25m = 18.87m so zero gap exists at the indented front wings!)
        addBox(14.05, 0.51, 4.73, plazaConcreteMat, 3.625, -0.255, frontWingZ + 2.365, arch, false);

        // 2. Lower Forecourt Plaza & Douglas St Sidewalk (trimmed at lz = wallZ + 7.05m = 21.67m,
        //    aligning flush with the front edge of the Left Lawn, 2 square planters, and Right Square Lawn,
        //    contoured smoothly to the Douglas St terrain with 0.45m vertical skirts)
        {
            const plazaW = 18.95; // lx: -4.50m .. +14.45m (meets washSidewalk cleanly at lx = 14.45m)
            const plazaD = 5.20;  // lz: wallZ + 1.85m (16.47m) .. wallZ + 7.05m (21.67m)
            const plazaCX = 4.975;
            const plazaCZ = wallZ + 4.45;
            const plazaSkirtH = 0.45;
            const plazaGeo = new THREE.BoxGeometry(plazaW, plazaSkirtH, plazaD, 64, 1, 28);
            const pPos = plazaGeo.attributes.position;
            for (let i = 0; i < pPos.count; i++) {
                const vx = pPos.getX(i);
                const vy = pPos.getY(i);
                const vz = pPos.getZ(i);
                const lx = plazaCX + vx;
                const lz = plazaCZ + vz;
                const topY = getConcreteTopY(lx, lz);
                pPos.setY(i, vy > 0 ? topY : topY - plazaSkirtH);
            }
            pPos.needsUpdate = true;
            plazaGeo.computeVertexNormals();
            const plazaMesh = new THREE.Mesh(plazaGeo, plazaConcreteMat);
            plazaMesh.position.set(plazaCX, 0, plazaCZ);
            plazaMesh.receiveShadow = true;
            arch.add(plazaMesh);
        }

        // 3. Upper 4-Level Portico Staircase (s = 0..3, from Upper Terrace y = 0.0m up to Portico Deck y = +0.76m):
        //    - Every step s has the EXACT same top elevation ((s + 1) * stepRise) across the Left (-X) and Front (+Z) sides.
        //    - On the Left (-X) side between the brick wall (lz = 14.62m) and left column pedestal (lz = 16.52m): 4 flush blue-gray treads & risers.
        //    - On the Front (+Z) side: stepRunZ = 1.30 / 3 (0.433m) so s = 0 ends right at upperTerraceFrontZ (wallZ + 4.25m) with zero skinny ledge,
        //      and frontLeftX = -0.25m so the front steps align cleanly with the Left Lamp Post!
        const numSteps = 4;
        const stepRise = deckY / numSteps;   // 0.19m per step level (0.19m, 0.38m, 0.57m, 0.76m)
        const stepRunX = 0.36;               // 0.36m horizontal tread run on Left (-X) side
        const stepRunZ = 1.30 / 3;           // 0.4333m horizontal tread run on Front (+Z) side (3 * stepRunZ = 1.30m -> wallZ + 4.25m)
        const deckLeftX = -0.30;             // Top deck left edge (s = 3, flush with Column 1 pedestal outer face at lx = -0.30m)
        const deckRightX = 9.30;             // Top deck right edge (s = 3, flush with Column 4 pedestal outer face at lx = 9.30m)
        const stepRunRightX = (10.08 - deckRightX) / (numSteps - 1); // Extended ~1 ft (+0.32m) from 9.76m out to 10.08m (0.26m per step)
        const deckFrontZ = wallZ + portDepth; // Top deck front edge (s = 3, lz = 17.57m)
        const blueBayZEnd = wallZ + 1.90;    // Back edge of left/right column pedestals (lz = 16.52m)

        for (let s = 0; s < numSteps; s++) {
            const stepsOut = numSteps - 1 - s; // 3 for bottom step (s=0), 0 for top deck (s=3)
            const sy = (s + 0.5) * stepRise;
            const xLeft = deckLeftX - stepsOut * stepRunX; // Aligned continuously across rear, middle, and front sections
            const xRight = deckRightX + stepsOut * stepRunRightX; // Aligned continuously across rear, middle, and front sections
            const zFront = deckFrontZ + stepsOut * stepRunZ;

            // A. Rear section (lz = wallZ to blueBayZEnd = 16.52m):
            //    - Leftmost tread/riser strip (lx = xLeft to xLeft + stepRunX) is flush blue-gray non-slip metal (687b2a06.jpg)
            //    - Continuous concrete landing & right steps (lx = xLeft + stepRunX to xRight) aligned with middle/front sections
            const blueStripW = stepRunX;
            const blueStripX = xLeft + blueStripW * 0.5;
            const rearDepth = blueBayZEnd - wallZ;
            const rearCenterZ = wallZ + rearDepth * 0.5;
            addBox(blueStripW, stepRise, rearDepth, blueTreadMat, blueStripX, sy, rearCenterZ);

            const rearMidX0 = xLeft + blueStripW;
            addBox(
                xRight - rearMidX0,
                stepRise,
                rearDepth,
                plazaConcreteMat,
                (rearMidX0 + xRight) * 0.5,
                sy,
                rearCenterZ
            );

            // B. Middle section (lz = blueBayZEnd = 16.52m to zFront - stepRunZ): full-width concrete wrapping left & right column pedestals (xLeft to xRight)
            const frontTreadZ0 = zFront - stepRunZ;
            if (frontTreadZ0 > blueBayZEnd + 0.01) {
                const midDepth = frontTreadZ0 - blueBayZEnd;
                const fullW = xRight - xLeft;
                addBox(fullW, stepRise, midDepth, plazaConcreteMat, xLeft + fullW * 0.5, sy, blueBayZEnd + midDepth * 0.5);
            }

            // C. Frontmost step tread & riser strip (lz = zFront - stepRunZ to zFront):
            //    - Left bay (lx = xLeft to 3.12m): brushed concrete wrapping around Column 1 to meet the left-side stairs
            //    - Center bay (lx = 3.12m to 5.88m, between Column 2 & Column 3): flush blue-gray non-slip metal tread & riser (3b9c07db.jpg & f097f1e6.jpg)
            //    - Right bay (lx = 5.88m to xRight): brushed concrete wrapping around Column 4 to meet the right-side stairs
            const frontStripZ = zFront - stepRunZ * 0.5;
            const cBayX0 = 3.12;
            const cBayX1 = 5.88;
            addBox(cBayX0 - xLeft, stepRise, stepRunZ, plazaConcreteMat, (xLeft + cBayX0) * 0.5, sy, frontStripZ);
            addBox(cBayX1 - cBayX0, stepRise, stepRunZ, blueTreadMat, (cBayX0 + cBayX1) * 0.5, sy, frontStripZ);
            addBox(xRight - cBayX1, stepRise, stepRunZ, plazaConcreteMat, (cBayX1 + xRight) * 0.5, sy, frontStripZ);
        }

        // 4. Lower 3-Step Forecourt Staircase (ls = 0..2, stepping DOWN seamlessly from s=0 at wallZ + 4.25m to Lower Plaza)
        //    ls = 0 is at y = 0.0m, ls = 1 is at y = -0.17m, ls = 2 is at y = -0.34m (no skinny 10cm ledge!)
        const lowerStairX0 = -0.25;
        const lowerStairX1 = 9.76;
        const lowerStairW = lowerStairX1 - lowerStairX0;
        const lowerStairCenterX = (lowerStairX0 + lowerStairX1) * 0.5;
        const upperTerraceFrontZ = wallZ + 4.25;
        const stairBaseY = lowerPlazaY - 0.15;

        for (let ls = 0; ls < lowerNumSteps; ls++) {
            const stepTopY = -ls * lowerStepRise;
            const stepH = stepTopY - stairBaseY;
            const stepZ = upperTerraceFrontZ + (ls + 0.5) * lowerStepRun;
            addBox(lowerStairW, stepH, lowerStepRun + 0.02, plazaConcreteMat, lowerStairCenterX, stairBaseY + stepH * 0.5, stepZ);
        }

        // 5. 4-Step Right-Side Staircase descending toward Washington St (lx = 10.65m..12.61m, outer edge flush with Front Pavilion wall 12.61m):
        //    Tucked between the indented front brick wall (lz = frontWingZ = 14.14m) and the back retaining wall of the Right Square Lawn (lz = 16.47m)
        const rightStairZ0 = frontWingZ;
        const rightStairZ1 = wallZ + 1.85;
        const rightStairDepth = rightStairZ1 - rightStairZ0;
        const rightStairCenterZ = (rightStairZ0 + rightStairZ1) * 0.5;
        const rightNumSteps = 4;
        const rightStepRise = Math.abs(lowerPlazaY) / (rightNumSteps + 1); // 4 intermediate steps above lowerPlazaY
        const rightStepRunX = 0.49;
        const rightStairStartX = 12.61 - rightNumSteps * rightStepRunX; // 10.65m so bottom step ends at exact lx = 12.61m
        for (let rs = 0; rs < rightNumSteps; rs++) {
            const rTopY = -(rs + 1) * rightStepRise;
            const rH = rTopY - stairBaseY;
            const rx = rightStairStartX + (rs + 0.5) * rightStepRunX;
            addBox(rightStepRunX, rH, rightStairDepth, plazaConcreteMat, rx, stairBaseY + rH * 0.5, rightStairCenterZ);
        }

        // 6. Double-Tier Black Wrought-Iron Front Stair Handrails with Middle Landing & Looped P-Returns (f097f1e6.jpg, 19f695cf.jpg, 3b9c07db.jpg)
        //    2 handrail lines (lx = 3.16m, 5.84m flanking the blue-gray center steps; no guard rail on the right stairs)
        const upperStairSpanZ = (numSteps - 1) * stepRunZ; // 1.30m
        const upperStairEndZ = deckFrontZ + upperStairSpanZ; // wallZ + 4.25m = 18.87m
        const lowerStairEndZ = upperTerraceFrontZ + lowerNumSteps * lowerStepRun; // 20.13m

        [3.16, 5.84].forEach((rx) => {
            // Upper tier sloped handrail (from portico deck down to Upper Terrace)
            const uLen = Math.hypot(upperStairSpanZ, deckY) + 0.12;
            const uRail = addBox(0.042, 0.042, uLen, darkMetalMat, rx, deckY * 0.5 + 0.82, deckFrontZ + upperStairSpanZ * 0.5);
            uRail.rotation.x = Math.atan2(deckY, upperStairSpanZ);
            addBox(0.038, 0.84, 0.038, darkMetalMat, rx, deckY + 0.42, deckFrontZ + 0.04);
            addBox(0.038, 0.84, 0.038, darkMetalMat, rx, 0.42, upperStairEndZ);
            // Top & middle horizontal return bends
            addBox(0.042, 0.042, 0.22, darkMetalMat, rx, 0.82, upperStairEndZ + 0.10);

            // Lower tier sloped handrail (stepping down the 3 lower concrete steps to the Lower Plaza, for lx = 3.16m & 5.84m)
            if (rx <= 6.0) {
                const lSpanZ = lowerNumSteps * lowerStepRun;
                const lDropY = Math.abs(lowerPlazaY);
                const lLen = Math.hypot(lSpanZ, lDropY) + 0.12;
                const lRail = addBox(
                    0.042,
                    0.042,
                    lLen,
                    darkMetalMat,
                    rx,
                    -lDropY * 0.5 + 0.82,
                    upperTerraceFrontZ + lSpanZ * 0.5
                );
                lRail.rotation.x = Math.atan2(lDropY, lSpanZ);
                addBox(0.038, 0.84, 0.038, darkMetalMat, rx, 0.42, upperTerraceFrontZ + 0.04);
                addBox(0.038, 0.84, 0.038, darkMetalMat, rx, lowerPlazaY + 0.42, lowerStairEndZ);
                // Looped P-shaped curved end return at bottom post (seen in f097f1e6.jpg & 19f695cf.jpg)
                addBox(0.042, 0.042, 0.18, darkMetalMat, rx, lowerPlazaY + 0.82, lowerStairEndZ + 0.08);
                addBox(0.042, 0.18, 0.042, darkMetalMat, rx, lowerPlazaY + 0.73, lowerStairEndZ + 0.16);
                addBox(0.042, 0.042, 0.18, darkMetalMat, rx, lowerPlazaY + 0.64, lowerStairEndZ + 0.08);
            }
        });

        // 7. RIGHT SQUARE LAWN ("the right square lawn" — ffcaac33.jpg, 6b9c1a26.jpg, 232bfcca.jpg, 28f96301.jpg, 29a2721c.jpg, eadec65d.jpg):
        //    - Grass surface is at y = 0.0m (flush with the Upper Terrace walkway along its inner back-left edge!)
        //    - Retained above the Lower Plaza & Sidewalk (y = -0.51m) by a thick white-painted concrete retaining wall
        //      with a rounded front-right corner (at Douglas & Washington), weathered stone-patch & crack lines (6b9c1a26.jpg & 232bfcca.jpg),
        //      and a distinct 18cm-wide raised concrete coping rim around the perimeter of the grass.
        const weatheredWallCanvas = document.createElement('canvas');
        weatheredWallCanvas.width = 512;
        weatheredWallCanvas.height = 128;
        const wwCtx = weatheredWallCanvas.getContext('2d');
        wwCtx.fillStyle = '#ede8de';
        wwCtx.fillRect(0, 0, 512, 128);
        // Subtle weathered concrete mottling, form-board horizontal seam & diagonal crack line seen in 6b9c1a26.jpg & 232bfcca.jpg
        for (let i = 0; i < 900; i++) {
            wwCtx.fillStyle = i % 2 === 0 ? 'rgba(120,114,104,0.08)' : 'rgba(255,253,248,0.08)';
            wwCtx.fillRect((i * 67) % 512, (i * 29) % 128, 12, 6);
        }
        wwCtx.strokeStyle = 'rgba(95,88,78,0.45)';
        wwCtx.lineWidth = 2.0;
        wwCtx.beginPath();
        wwCtx.moveTo(0, 58);
        wwCtx.lineTo(512, 62);
        wwCtx.moveTo(180, 4);
        wwCtx.lineTo(196, 52);
        wwCtx.lineTo(215, 124);
        wwCtx.stroke();
        const weatheredWallTex = new THREE.CanvasTexture(weatheredWallCanvas);
        weatheredWallTex.wrapS = THREE.RepeatWrapping;
        weatheredWallTex.wrapT = THREE.RepeatWrapping;
        weatheredWallTex.colorSpace = THREE.SRGBColorSpace;
        const rightLawnWallMat = new THREE.MeshStandardMaterial({
            map: weatheredWallTex,
            bumpMap: weatheredWallTex,
            bumpScale: 0.03,
            roughness: 0.85,
            metalness: 0.03
        });

        // Build the elevated planter footprint with the red-marked left region removed (890ee219.jpg):
        // - Back section (lz = wallZ + 1.85m to wallZ + 4.15m): left edge at lx = 10.55m (clearing the Upper Terrace & portico stairs)
        // - Front section (lz = wallZ + 4.15m to wallZ + 7.05m): left edge at lx = 9.76m (aligned with the right edge of the portico stairs)
        // - Right edge at lx = 14.70m (aligned with Washington St fence decoration) with rounded front-right bullnose corner (r = 1.45m)
        const createRightPlanterShape = (inset = 0) => {
            const xBackLeft = 10.55 + inset;
            const xFrontLeft = 9.76 + inset;
            const xRight = 14.70 - inset;
            const zBack = wallZ + 1.85 + inset;
            const zStep = wallZ + 4.25 + inset;
            const zFront = wallZ + 7.05 - inset;
            const r = Math.max(0.2, 1.45 - inset);

            const s = new THREE.Shape();
            // Note: rotateX(-Math.PI / 2) maps Shape (x, y) -> 3D (x, -z), so y = -z
            s.moveTo(xBackLeft, -zBack);
            s.lineTo(xRight, -zBack);
            s.lineTo(xRight, -(zFront - r));
            s.absarc(xRight - r, -(zFront - r), r, 0, -Math.PI * 0.5, true);
            s.lineTo(xFrontLeft, -zFront);
            s.lineTo(xFrontLeft, -zStep);
            s.lineTo(xBackLeft, -zStep);
            s.closePath();
            return s;
        };
        const rightLawnBaseY = lowerPlazaY - 0.30; // extend base into contoured concrete
        const rightLawnWallH = 0.85;               // from rightLawnBaseY (-0.81m) up to +0.04m coping lip

        const outerPlanterShape = createRightPlanterShape(0);
        const outerPlanterGeo = new THREE.ExtrudeGeometry(outerPlanterShape, {
            depth: rightLawnWallH,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.02,
            bevelSegments: 2
        });
        outerPlanterGeo.rotateX(-Math.PI / 2);
        const outerPlanterMesh = new THREE.Mesh(outerPlanterGeo, rightLawnWallMat);
        outerPlanterMesh.position.set(0, rightLawnBaseY, 0);
        outerPlanterMesh.castShadow = true;
        outerPlanterMesh.receiveShadow = true;
        arch.add(outerPlanterMesh);

        // Lush green turf recessed inside the 18cm-wide white concrete curb wall (ffcaac33.jpg, 6b9c1a26.jpg, 232bfcca.jpg)
        const innerTurfGeo = new THREE.ExtrudeGeometry(createRightPlanterShape(0.18), {
            depth: rightLawnWallH + 0.035,
            bevelEnabled: false
        });
        innerTurfGeo.rotateX(-Math.PI / 2);
        const innerTurfMesh = new THREE.Mesh(innerTurfGeo, turfMat);
        innerTurfMesh.position.set(0, rightLawnBaseY, 0);
        innerTurfMesh.receiveShadow = true;
        arch.add(innerTurfMesh);

        // 8. LEFT-SIDE LAWN (58d5c80a.jpg, 3b9c07db.jpg, b15a030b.jpg & 51a0f668.jpg):
        //    Flush with the Upper Terrace walkway (y = 0.0m, zBack = wallZ + 4.25m) on the back/left, and shortened in front
        //    so its front edge (zFront = wallZ + 7.05m) aligns with the 2 square planters and the Right Square Lawn!
        //    (Circle object leftWalkFillet removed per 51a0f668.jpg)
        addBox(3.15, 0.78, 2.80, whiteCurbMat, -1.85, lowerPlazaY + 0.15, wallZ + 5.65);
        addBox(2.85, 0.80, 2.55, turfMat, -1.92, lowerPlazaY + 0.16, wallZ + 5.62);


        [3.08, 5.92].forEach((px) => {
            const pz = wallZ + 6.55;
            const pSize = 0.96;
            const pWall = 0.10;
            const pH = 0.62;
            const pBaseY = getConcreteTopY(px, pz);
            const py = pBaseY + pH * 0.5;
            // 4 hollow white concrete walls
            addBox(pSize, pH, pWall, whiteCurbMat, px, py, pz + (pSize - pWall) * 0.5);
            addBox(pSize, pH, pWall, whiteCurbMat, px, py, pz - (pSize - pWall) * 0.5);
            addBox(pWall, pH, pSize - pWall * 2, whiteCurbMat, px - (pSize - pWall) * 0.5, py, pz);
            addBox(pWall, pH, pSize - pWall * 2, whiteCurbMat, px + (pSize - pWall) * 0.5, py, pz);
            // Recessed soil core 14cm below top rim
            addBox(pSize - pWall * 2, pH - 0.14, pSize - pWall * 2, soilMat, px, pBaseY + (pH - 0.14) * 0.5, pz);
        });

        // Helper for Black Pole Globe Lanterns with 4-Ribbed Metal Cages on Tall Concrete Pedestals (f097f1e6.jpg, 3b9c07db.jpg)
        const addCagedGlobeLamp = (lx, ly, lz, poleH = 2.55, pedH = 0.68) => {
            if (pedH > 0) {
                addBox(0.44, pedH, 0.44, whiteCurbMat, lx, ly + pedH * 0.5, lz);
                addBox(0.46, 0.09, 0.46, darkMetalMat, lx, ly + pedH + 0.045, lz);
            }
            const baseTop = ly + pedH + 0.09;
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, poleH, 12), darkMetalMat);
            post.position.set(lx, baseTop + poleH * 0.5, lz);
            post.castShadow = true;
            arch.add(post);

            const globeY = baseTop + poleH + 0.22;
            const globe = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 14), globeMat);
            globe.position.set(lx, globeY, lz);
            arch.add(globe);

            // Black equatorial ring & vertical metal cage ribs around the globe lantern
            const eqRing = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 16), darkMetalMat);
            eqRing.position.set(lx, globeY, lz);
            arch.add(eqRing);
            addBox(0.50, 0.30, 0.03, darkMetalMat, lx, globeY - 0.08, lz);
            addBox(0.03, 0.30, 0.50, darkMetalMat, lx, globeY - 0.08, lz);
        };

        // Forecourt & SW Sidewalk Caged Globe Lamps matching exact photo positions (eadec65d.jpg, 58d5c80a.jpg, 3b9c07db.jpg)
        addCagedGlobeLamp(9.80, lowerPlazaY, wallZ + 4.35, 2.55, 1.05);  // Right lawn corner lamp pedestal at right edge of stairs
        addCagedGlobeLamp(-0.30, lowerPlazaY, wallZ + 4.35, 2.55, 1.05); // Left lawn corner lamp pedestal at left edge of stairs
        addCagedGlobeLamp(-4.65, getConcreteTopY(-4.65, wallZ + 1.85), wallZ + 1.85, 2.75, 0.12); // SW sidewalk front globe lamp (00de5feb.jpg & 09a0228b.jpg)
        addCagedGlobeLamp(-4.65, getConcreteTopY(-4.65, -3.50), -3.50, 2.75, 0.12);               // SW sidewalk middle globe lamp (09a0228b.jpg)
        addCagedGlobeLamp(-4.65, getConcreteTopY(-4.65, -11.50), -11.50, 2.75, 0.12);             // SW sidewalk rear globe lamp (09a0228b.jpg)

        // Blue Handicap Parking Sign Post (00de5feb.jpg)
        addBox(0.05, 1.45, 0.05, galvSteelMat, -3.55, 0.72, wallZ + 1.45);
        addBox(0.32, 0.42, 0.03, new THREE.MeshBasicMaterial({ color: '#2563eb' }), -3.55, 1.32, wallZ + 1.47);

        // Tall Silver Curved-Arm Streetlight Pole at the Douglas & Washington Corner with Flared Base & Oval Access Cover (6b9c1a26.jpg & fea05cee.jpg)
        const streetPoleX = 15.25;
        const streetPoleZ = 18.85;
        const streetPoleBaseY = getConcreteTopY(streetPoleX, streetPoleZ);
        const poleBaseCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.21, 0.24, 8), galvSteelMat);
        poleBaseCollar.position.set(streetPoleX, streetPoleBaseY + 0.12, streetPoleZ);
        arch.add(poleBaseCollar);
        const mainPole = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.14, 8.4, 16), galvSteelMat);
        mainPole.position.set(streetPoleX, streetPoleBaseY + 4.2, streetPoleZ);
        mainPole.castShadow = true;
        arch.add(mainPole);
        // Oval hand-hole access cover plate near bottom of pole (seen in 6b9c1a26.jpg)
        const handHole = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.03, 14), galvSteelMat);
        handHole.scale.set(1.0, 1.65, 1.0);
        handHole.rotation.x = Math.PI * 0.5;
        handHole.position.set(streetPoleX, streetPoleBaseY + 0.48, streetPoleZ + 0.13);
        arch.add(handHole);
        const mastArm = addBox(0.08, 0.08, 2.8, galvSteelMat, streetPoleX - 0.6, streetPoleBaseY + 8.35, streetPoleZ + 1.1);
        mastArm.rotation.y = -0.45;
        mastArm.rotation.x = -0.15;
        addBox(0.45, 0.10, 0.26, globeMat, streetPoleX - 1.2, streetPoleBaseY + 8.52, streetPoleZ + 2.2);
        // Yellow Diamond Traffic Sign mounted on the streetlight pole (eadec65d.jpg)
        const diamondSign = addBox(
            0.65,
            0.65,
            0.04,
            new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.4 }),
            streetPoleX - 0.12,
            streetPoleBaseY + 2.55,
            streetPoleZ + 0.12
        );
        diamondSign.rotation.z = Math.PI * 0.25;


        // Helper to build a subdivided concrete/asphalt slab contoured to the 3D terrain topography
        const addContouredSlab = (w, h, d, mat, cx, cz, topOffset = 0, segsX = 8, segsZ = 24) => {
            const geo = new THREE.BoxGeometry(w, h, d, segsX, 1, segsZ);
            const pos = geo.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const vx = pos.getX(i);
                const vy = pos.getY(i);
                const vz = pos.getZ(i);
                const topY = getConcreteTopY(cx + vx, cz + vz) + topOffset;
                pos.setY(i, vy > 0 ? topY : topY - h);
            }
            pos.needsUpdate = true;
            geo.computeVertexNormals();
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(cx, 0, cz);
            mesh.receiveShadow = true;
            arch.add(mesh);
            return mesh;
        };

        // SW Side Sunken Basement Stairwell/Areaway & 6-Rail Silver Galvanized Pipe Guardrail + Gate (fe4f41a6.jpg & 9c5e0963.jpg)
        // (The SW concrete surface extending from the 411 alley to Douglas St is built continuously in buildBuilding411_412.js)
        const railMinZ = -11.2;
        const railMaxZ = 7.35;
        const railLenSW = railMaxZ - railMinZ;
        const railMidZ = (railMinZ + railMaxZ) * 0.5;
        const railOuterX = -4.25;
        for (let r = 1; r <= 6; r++) {
            const ry = r * 0.17;
            addBox(0.04, 0.04, railLenSW, galvSteelMat, railOuterX, ry, railMidZ);
            addBox(1.02, 0.04, 0.04, galvSteelMat, -3.74, ry, railMaxZ);
        }
        for (let pz = railMinZ; pz <= railMaxZ + 0.1; pz += 2.65) {
            addBox(0.05, 1.08, 0.05, galvSteelMat, railOuterX, 0.54, pz);
        }
        addBox(0.05, 1.08, 0.05, galvSteelMat, -3.26, 0.54, railMaxZ);

        // --- WASHINGTON ST (+X) SUNKEN AREAWAY, EXTERIOR STAIRS, ADA RAMP, DOORS/WINDOWS, BRICK FENCE & SIDEWALK (19a77a6c.jpg & adc547e2.jpg) ---
        // At the Front Pavilion (lz = +10.2m..+16.47m) and Rear Pavilion (lz = -16.64m..-11.2m), the sidewalk comes flush up to the building wall (lx = 12.25m..14.45m)!
        addContouredSlab(2.20, 0.24, 6.3, plazaConcreteMat, washX + 1.10, 13.32, 0, 6, 14);
        addContouredSlab(2.20, 0.24, 5.44, plazaConcreteMat, washX + 1.10, -13.92, 0, 6, 14);

        // Sunken Lightwell Trench Floor (lz = -11.2m to +10.2m)
        addBox(2.35, 0.20, 21.4, plinthConcreteMat, washX + 1.15, -2.45, -0.5, arch, false);

        // Front Sunken Door 1 Landing (lz = +5.4m to +7.8m, y = lowerPlazaY - 0.64m = -1.15m) + 4 Exterior Concrete Steps descending from lz = +10.0m (19a77a6c.jpg!)
        const door1LandingY = lowerPlazaY - 0.64;
        addBox(2.15, 1.35, 2.5, plazaConcreteMat, washX + 1.10, door1LandingY - 0.675, 6.6, arch, false);
        for (let fs = 0; fs < 4; fs++) {
            const fTopY = lowerPlazaY - (fs + 1) * 0.16;
            const fz = 10.0 - (fs + 0.5) * 0.52;
            addBox(2.10, 0.36, 0.54, plazaConcreteMat, washX + 1.10, fTopY - 0.18, fz, arch, false);
        }
        // Sloped black iron handrail mounted on the Front Pavilion wall beside the front sunken stairs (seen in 19a77a6c.jpg!)
        const frontStairRail = addBox(0.04, 0.04, 2.25, darkMetalMat, washX + 0.44, lowerPlazaY + 0.42, 8.95);
        frontStairRail.rotation.x = -0.30;
        addBox(0.035, 0.72, 0.035, darkMetalMat, washX + 0.44, lowerPlazaY + 0.05, 7.90);

        // Rear Sunken Door 2 Exterior Concrete Steps + Curved Black Iron Handrail descending from lz = -11.3m toward Door 2 (seen at right of adc547e2.jpg!)
        for (let rs = 0; rs < 5; rs++) {
            const rTopY = lowerPlazaY - (rs + 1) * 0.28;
            const rz = -11.3 + (rs + 0.5) * 0.34;
            addBox(2.10, 0.40, 0.36, plazaConcreteMat, washX + 1.10, rTopY - 0.20, rz, arch, false);
        }
        const rearStairRail = addBox(0.04, 0.04, 1.95, darkMetalMat, washX + 0.44, lowerPlazaY + 0.22, -10.45);
        rearStairRail.rotation.x = 0.55;

        // Open Pedestrian Entry Walkway (lz = +3.2m to +5.4m, at lowered Washington St sidewalk level) + Sloped Concrete ADA Ramp descending from lz = +3.2m to lz = -8.4m
        const washEntryTopY = getConcreteTopY(washX + 2.22, 4.3);
        addBox(2.20, 1.85, 2.2, plazaConcreteMat, washX + 1.10, washEntryTopY - 0.925, 4.3, arch, false);
        const rampSpanZ = 11.6;
        const rampEndTopY = -1.95;
        const rampDropY = Math.max(0.4, washEntryTopY - rampEndTopY);
        const rampMidY = (washEntryTopY + rampEndTopY) * 0.5;
        const rampLen = Math.hypot(rampSpanZ, rampDropY);
        const adaRamp = addBox(2.15, 0.22, rampLen, plazaConcreteMat, washX + 1.10, rampMidY - 0.10, -2.6, arch, false);
        adaRamp.rotation.x = -Math.atan2(rampDropY, rampSpanZ);
        // Sloped black metal pipe handrail mounted along the brick building wall beside the ADA ramp (19a77a6c.jpg & adc547e2.jpg)
        const wallHandrail = addBox(0.045, 0.045, rampLen + 0.4, darkMetalMat, washX + 0.12, rampMidY + 0.82, -2.6);
        wallHandrail.rotation.x = -Math.atan2(rampDropY, rampSpanZ);

        // Continuous Outer Washington St Concrete Walkway / Sidewalk (lx = washX + 2.20m out to washX + 5.15m,
        // spanning from rear lot edge lz = -20.20m up to lz = 19.37m where the rounded corner & ADA ramp begins!)
        const washSidewalkZ0 = -20.20;
        const washSidewalkZ1 = 19.37; // Meets the rounded Douglas & Washington corner apron seamlessly at lz = 19.37m
        const washSidewalkD = washSidewalkZ1 - washSidewalkZ0;
        const washSidewalkCZ = (washSidewalkZ0 + washSidewalkZ1) * 0.5;
        const washSidewalkW = 2.95;
        const washSidewalkCX = washX + 3.675; // 15.925m (lx: 14.45m .. 17.40m)
        addContouredSlab(washSidewalkW, 0.42, washSidewalkD, plazaConcreteMat, washSidewalkCX, washSidewalkCZ, 0, 8, 52);

        // Straight Douglas St (+Z) Sidewalk running across the Douglas St frontage in front of the Left Lawn and
        // Lower Forecourt Plaza / 2 Square Planters (lx = -4.35m .. +9.76m, lz = wallZ + 7.05m .. wallZ + 9.75m),
        // meeting the Curb Bulb-Out & Rounded ADA Corner Apron seamlessly at lx = +9.76m!
        const dougSidewalkX0 = -4.35;
        const dougSidewalkX1 = 9.76; // Meets the rounded corner bulb-out at the Right Square Lawn (fea05cee.jpg)
        const dougSidewalkW = dougSidewalkX1 - dougSidewalkX0;
        const dougSidewalkCX = (dougSidewalkX0 + dougSidewalkX1) * 0.5;
        const dougSidewalkZ0 = wallZ + 7.05; // 21.67m
        const dougSidewalkZ1 = wallZ + 9.75; // 24.37m
        const dougSidewalkD = dougSidewalkZ1 - dougSidewalkZ0; // 2.70m
        const dougSidewalkCZ = (dougSidewalkZ0 + dougSidewalkZ1) * 0.5; // 23.02m
        addContouredSlab(dougSidewalkW, 0.45, dougSidewalkD, plazaConcreteMat, dougSidewalkCX, dougSidewalkCZ, 0, 42, 12);

        // Raised outer street curb along the straight Washington St sidewalk (lz = -20.20m .. 19.37m)
        const washCurbD = washSidewalkZ1 - washSidewalkZ0;
        const washCurbCZ = (washSidewalkZ0 + washSidewalkZ1) * 0.5;
        addContouredSlab(0.18, 0.48, washCurbD, whiteCurbMat, washX + 5.06, washCurbCZ, 0.03, 2, 52);

        // Raised outer street curb along the straight Douglas St (+Z) sidewalk (lx = -4.35m .. +9.76m, at lz = 24.28m)
        addContouredSlab(dougSidewalkW, 0.48, 0.18, whiteCurbMat, dougSidewalkCX, dougSidewalkZ1 - 0.09, 0.03, 42, 2);

        // Transverse concrete expansion score joints across the Washington St and Douglas St sidewalks
        const swScoreMat = new THREE.MeshBasicMaterial({
            color: '#9c9588',
            polygonOffset: true,
            polygonOffsetFactor: -3,
            polygonOffsetUnits: -3
        });
        for (let jz = washSidewalkZ0 + 1.75; jz < washSidewalkZ1 - 0.2; jz += 1.75) {
            addContouredSlab(washSidewalkW - 0.22, 0.012, 0.025, swScoreMat, washSidewalkCX - 0.06, jz, 0.008, 4, 1);
        }
        // Single-row transverse score joints across the straight Douglas St (+Z) sidewalk (lx = -4.35m .. +9.76m) every 1.75m
        for (let jx = dougSidewalkX0 + 1.75; jx < dougSidewalkX1 - 0.15; jx += 1.75) {
            addContouredSlab(0.025, 0.012, dougSidewalkD - 0.22, swScoreMat, jx, dougSidewalkCZ - 0.06, 0.008, 1, 6);
        }
        // Transverse score joints along the Forecourt Plaza walk between the Left & Right lawns (lx = -0.20m .. +9.70m)
        for (let jx = 0.20; jx < 9.60; jx += 1.75) {
            addContouredSlab(0.025, 0.012, 2.65, swScoreMat, jx, wallZ + 5.65, 0.008, 1, 6);
        }

        // =========================================================================
        // DOUGLAS ST & WASHINGTON ST ROUNDED CORNER BULB-OUT, DUAL SLOPED ADA CURB RAMPS,
        // RED-BRICK TACTILE WARNING PADS, BLACK STEEL BOLLARDS & DRAIN PLATES (fea05cee.jpg right!)
        // =========================================================================
        {
            const tactileBrickMat = new THREE.MeshStandardMaterial({
                color: '#8e3b2e',
                roughness: 0.86,
                metalness: 0.04,
                polygonOffset: true,
                polygonOffsetFactor: -4,
                polygonOffsetUnits: -4
            });
            const castIronMat = new THREE.MeshStandardMaterial({
                color: '#4a3d36',
                roughness: 0.72,
                metalness: 0.45,
                polygonOffset: true,
                polygonOffsetFactor: -4,
                polygonOffsetUnits: -4
            });

            // 1. S-Curve Curb Bulb-Out Transition in front of the Right Square Lawn (lx = 9.76m .. 11.60m,
            //    flaring outer curb from lz = 24.37m out to lz = 25.65m ahead of the parked SUV in fea05cee.jpg)
            const bulbX0 = 9.76;
            const bulbX1 = 11.60;
            const bulbInnerZ = 21.67;
            const bulbSteps = 10;
            const flareOuterZ = (x) => {
                const t = THREE.MathUtils.clamp((x - bulbX0) / (bulbX1 - bulbX0), 0, 1);
                const s = 0.5 - 0.5 * Math.cos(Math.PI * t);
                return THREE.MathUtils.lerp(24.37, 25.65, s);
            };
            const pushSlabQuad = (arr, ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) => {
                arr.push(ax, ay, az, bx, by, bz, cx, cy, cz);
                arr.push(ax, ay, az, cx, cy, cz, dx, dy, dz);
            };
            const buildVertexSlab = (verts, mat) => {
                const g = new THREE.BufferGeometry();
                g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
                g.computeVertexNormals();
                const m = new THREE.Mesh(g, mat);
                m.receiveShadow = true;
                arch.add(m);
                return m;
            };

            const bulbSlabVerts = [];
            const bulbCurbVerts = [];
            for (let i = 0; i < bulbSteps; i++) {
                const xA = bulbX0 + (i / bulbSteps) * (bulbX1 - bulbX0);
                const xB = bulbX0 + ((i + 1) / bulbSteps) * (bulbX1 - bulbX0);
                const zOutA = flareOuterZ(xA);
                const zOutB = flareOuterZ(xB);
                const zCurbInA = zOutA - 0.18;
                const zCurbInB = zOutB - 0.18;

                const yInA = getConcreteTopY(xA, bulbInnerZ);
                const yInB = getConcreteTopY(xB, bulbInnerZ);
                const yOutA = getConcreteTopY(xA, zOutA);
                const yOutB = getConcreteTopY(xB, zOutB);
                const botY = -1.05;

                // Top & outer skirt of concrete sidewalk bulb
                pushSlabQuad(bulbSlabVerts, xA, yInA, bulbInnerZ, xA, yOutA, zCurbInA, xB, yOutB, zCurbInB, xB, yInB, bulbInnerZ);
                // Raised white concrete curb along the S-curve flare
                const cTopA = yOutA + 0.03;
                const cTopB = yOutB + 0.03;
                pushSlabQuad(bulbCurbVerts, xA, cTopA, zCurbInA, xA, cTopA, zOutA, xB, cTopB, zOutB, xB, cTopB, zCurbInB);
                pushSlabQuad(bulbCurbVerts, xA, cTopA, zOutA, xA, botY, zOutA, xB, botY, zOutB, xB, cTopB, zOutB);
                pushSlabQuad(bulbCurbVerts, xB, cTopB, zCurbInB, xB, botY, zCurbInB, xA, botY, zCurbInA, xA, cTopA, zCurbInA);
            }
            buildVertexSlab(bulbSlabVerts, plazaConcreteMat);
            buildVertexSlab(bulbCurbVerts, whiteCurbMat);

            // 2. Smooth Quarter-Ellipse Rounded Corner & Sloped ADA Curb Ramp (theta = 0 .. PI/2,
            //    from (lx = 11.60m, lz = 25.65m) around to (lx = 17.40m, lz = 19.37m), centered at (11.60m, 19.37m))
            const arcCX = 11.60;
            const arcCZ = 19.37;
            const arcRX = 5.80; // 11.60 + 5.80 = 17.40m (flush with Washington St sidewalk outer edge)
            const arcRZ = 6.28; // 19.37 + 6.28 = 25.65m (flush with Douglas St bulb-out nose)
            const arcSegs = 28;
            const rSteps = 6;

            // ADA Curb Ramp depression profile along angle theta:
            // Depressed flush with street grade at the Douglas St ramp throat (theta = 0.05..0.34)
            // and along the long curved Washington St ADA ramp throat (theta = 0.50..1.34)
            const getAdaRampDrop = (theta) => {
                const dougRamp =
                    THREE.MathUtils.smoothstep(theta, 0.00, 0.07) *
                    (1.0 - THREE.MathUtils.smoothstep(theta, 0.28, 0.38));
                const washRamp =
                    THREE.MathUtils.smoothstep(theta, 0.44, 0.54) *
                    (1.0 - THREE.MathUtils.smoothstep(theta, 1.26, 1.40));
                return Math.max(dougRamp, washRamp);
            };

            const cornerSlabVerts = [];
            const cornerCurbVerts = [];
            for (let s = 0; s < arcSegs; s++) {
                const th0 = (s / arcSegs) * (Math.PI * 0.5);
                const th1 = ((s + 1) / arcSegs) * (Math.PI * 0.5);
                const drop0 = getAdaRampDrop(th0);
                const drop1 = getAdaRampDrop(th1);

                for (let r = 0; r < rSteps; r++) {
                    const u0 = r / rSteps;
                    const u1 = (r + 1) / rSteps;
                    const samplePt = (th, u, drop) => {
                        const px = arcCX + u * (arcRX - 0.18) * Math.sin(th);
                        const pz = arcCZ + u * (arcRZ - 0.18) * Math.cos(th);
                        // Slope outer half of sidewalk (u > 0.45) gently down into the ADA curb ramp throat
                        const rampFactor = THREE.MathUtils.smoothstep(u, 0.40, 1.0) * drop;
                        const py = getConcreteTopY(px, pz) - rampFactor * 0.075;
                        return [px, py, pz];
                    };
                    const p00 = samplePt(th0, u0, drop0);
                    const p01 = samplePt(th0, u1, drop0);
                    const p11 = samplePt(th1, u1, drop1);
                    const p10 = samplePt(th1, u0, drop1);
                    pushSlabQuad(
                        cornerSlabVerts,
                        p00[0], p00[1], p00[2],
                        p01[0], p01[1], p01[2],
                        p11[0], p11[1], p11[2],
                        p10[0], p10[1], p10[2]
                    );
                }

                // Outer curved white concrete street curb (lowered flush at ADA ramp throats!)
                const cInX0 = arcCX + (arcRX - 0.18) * Math.sin(th0);
                const cInZ0 = arcCZ + (arcRZ - 0.18) * Math.cos(th0);
                const cOutX0 = arcCX + arcRX * Math.sin(th0);
                const cOutZ0 = arcCZ + arcRZ * Math.cos(th0);
                const cInX1 = arcCX + (arcRX - 0.18) * Math.sin(th1);
                const cInZ1 = arcCZ + (arcRZ - 0.18) * Math.cos(th1);
                const cOutX1 = arcCX + arcRX * Math.sin(th1);
                const cOutZ1 = arcCZ + arcRZ * Math.cos(th1);

                const cTop0 = getConcreteTopY(cOutX0, cOutZ0) + THREE.MathUtils.lerp(0.03, -0.072, drop0);
                const cTop1 = getConcreteTopY(cOutX1, cOutZ1) + THREE.MathUtils.lerp(0.03, -0.072, drop1);
                const botY = -1.05;

                pushSlabQuad(cornerCurbVerts, cInX0, cTop0, cInZ0, cOutX0, cTop0, cOutZ0, cOutX1, cTop1, cOutZ1, cInX1, cTop1, cInZ1);
                pushSlabQuad(cornerCurbVerts, cOutX0, cTop0, cOutZ0, cOutX0, botY, cOutZ0, cOutX1, botY, cOutZ1, cOutX1, cTop1, cOutZ1);
                pushSlabQuad(cornerCurbVerts, cInX1, cTop1, cInZ1, cInX1, botY, cInZ1, cInX0, botY, cInZ0, cInX0, cTop0, cInZ0);
            }
            buildVertexSlab(cornerSlabVerts, plazaConcreteMat);
            buildVertexSlab(cornerCurbVerts, whiteCurbMat);

            // 3. Radial & Transverse Expansion Score Joints across the Rounded Corner & ADA Ramp Wings (fea05cee.jpg right)
            for (const thJ of [0.16, 0.46, 0.78, 1.08, 1.36]) {
                const dropJ = getAdaRampDrop(thJ);
                const rInner = 2.65;
                const rOuter = 0.96;
                const x0 = arcCX + rInner * Math.sin(thJ);
                const z0 = arcCZ + rInner * Math.cos(thJ);
                const x1 = arcCX + rOuter * (arcRX - 0.22) * Math.sin(thJ);
                const z1 = arcCZ + rOuter * (arcRZ - 0.22) * Math.cos(thJ);
                const mx = (x0 + x1) * 0.5;
                const mz = (z0 + z1) * 0.5;
                const len = Math.hypot(x1 - x0, z1 - z0);
                const my = getConcreteTopY(mx, mz) - dropJ * 0.035 + 0.008;
                const jBar = addBox(0.025, 0.012, len, swScoreMat, mx, my, mz, arch, false);
                jBar.rotation.y = Math.atan2(x1 - x0, z1 - z0);
            }
            // Inner concentric score arc separating the upper sidewalk from the sloped ADA ramp apron
            for (let s = 0; s < 14; s++) {
                const thA = (s / 14) * (Math.PI * 0.5);
                const thB = ((s + 1) / 14) * (Math.PI * 0.5);
                const thM = (thA + thB) * 0.5;
                const ax = arcCX + (arcRX - 1.55) * Math.sin(thM);
                const az = arcCZ + (arcRZ - 1.55) * Math.cos(thM);
                const ay = getConcreteTopY(ax, az) + 0.008;
                const segL = 0.48;
                const aBar = addBox(0.025, 0.012, segL, swScoreMat, ax, ay, az, arch, false);
                aBar.rotation.y = Math.atan2((arcRX - 1.55) * Math.cos(thM), -(arcRZ - 1.55) * Math.sin(thM));
            }

            // 4. Two Red-Brick / Terracotta Tactile Warning Strips along the Curved ADA Curb Ramps (fea05cee.jpg right):
            //    (a) Douglas St Crosswalk Tactile Pad (2 arc segments at theta = 0.08..0.30)
            //    (b) Long Curved Washington St Crosswalk Tactile Strip (5 arc segments at theta = 0.52..1.30)
            const addCurvedTactileStrip = (thStart, thEnd, segCount) => {
                for (let i = 0; i < segCount; i++) {
                    const tA = thStart + (i / segCount) * (thEnd - thStart);
                    const tB = thStart + ((i + 1) / segCount) * (thEnd - thStart);
                    const tM = 0.5 * (tA + tB);
                    const dropM = getAdaRampDrop(tM);
                    const tx = arcCX + (arcRX - 0.56) * Math.sin(tM);
                    const tz = arcCZ + (arcRZ - 0.56) * Math.cos(tM);
                    const ty = getConcreteTopY(tx, tz) - dropM * 0.068 + 0.012;
                    const segLen = Math.hypot(
                        (arcRX - 0.56) * (Math.sin(tB) - Math.sin(tA)),
                        (arcRZ - 0.56) * (Math.cos(tB) - Math.cos(tA))
                    ) - 0.03;
                    const pad = addBox(0.58, 0.022, segLen, tactileBrickMat, tx, ty, tz, arch, false);
                    pad.rotation.y = Math.atan2(
                        (arcRX - 0.56) * Math.cos(tM),
                        -(arcRZ - 0.56) * Math.sin(tM)
                    );
                }
            };
            addCurvedTactileStrip(0.07, 0.31, 2); // Douglas St tactile warning pad
            addCurvedTactileStrip(0.52, 1.30, 5); // Long curved Washington St tactile warning strip

            // 5. Three Black Steel Pipe Bollards on Building 400's Rounded Corner (fea05cee.jpg right:
            //    1 behind the Douglas St tactile pad, and 2 near the tall streetlight pole on the Washington St side)
            for (const [bx, bz] of [
                [12.35, 24.45],
                [16.50, 18.55],
                [16.65, 17.35]
            ]) {
                const by = getConcreteTopY(bx, bz);
                const post = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.94, 14), darkMetalMat);
                post.position.set(bx, by + 0.47, bz);
                post.castShadow = true;
                arch.add(post);
                const cap = new THREE.Mesh(new THREE.SphereGeometry(0.082, 12, 8), darkMetalMat);
                cap.position.set(bx, by + 0.94, bz);
                arch.add(cap);
            }

            // 6. Two Square Cast-Iron Utility/Drain Plates in the Sidewalk + Round Street Manhole Cover (fea05cee.jpg right)
            for (const [ux, uz, uw, ud] of [
                [10.35, 22.15, 0.52, 0.52],
                [11.55, 23.85, 0.58, 0.58]
            ]) {
                const uy = getConcreteTopY(ux, uz) + 0.01;
                addBox(uw, 0.018, ud, castIronMat, ux, uy, uz, arch, false);
            }
            {
                const mhx = 16.35, mhz = 24.15;
                const mhy = getConcreteTopY(mhx, mhz) - 0.08;
                const mh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.02, 18), castIronMat);
                mh.position.set(mhx, mhy, mhz);
                arch.add(mh);
            }
        }
        addBox(0.32, 2.20, 21.4, whiteCurbMat, washX + 2.22, -1.40, -0.5, arch, false);

        // 2 White Glazed Entry Doors with 4-Pane Vertical Sidelights (19a77a6c.jpg & adc547e2.jpg):
        // - Door 1 at lz = +6.35m (sunken landing door1LandingY): white door leaf on left (with tall upper glass lite, wide lock rail with red sign strip,
        //   and smaller lower glass lite) + 4-pane vertical sidelight window on right!
        // - Door 2 at lz = -9.45m (bottom of ramp): 4-pane vertical sidelight on left + white glazed door leaf on right!
        [
            { dz: 6.35, by: door1LandingY, sideOffset: -0.52 },
            { dz: -9.45, by: -2.05, sideOffset: 0.52 }
        ].forEach(({ dz, by, sideOffset }) => {
            const doorZ = dz - sideOffset * 0.52;
            const sideZ = dz + sideOffset * 0.86;
            // Outer white door frame + sidelight frame
            addBox(0.16, 2.32, 1.72, whiteCurbMat, washX + 0.05, by + 1.16, dz);
            // Upper & lower glass lites in main door leaf (matched to 19a77a6c.jpg)
            addBox(0.20, 0.96, 0.78, glassMat, washX + 0.09, by + 1.56, doorZ); // Tall upper glass pane
            addBox(0.20, 0.52, 0.78, glassMat, washX + 0.09, by + 0.56, doorZ); // Lower glass pane
            addBox(0.22, 0.22, 0.84, whiteCurbMat, washX + 0.10, by + 0.96, doorZ); // Wide white lock rail
            addBox(0.23, 0.05, 0.42, new THREE.MeshBasicMaterial({ color: '#dc2626' }), washX + 0.11, by + 1.12, doorZ); // Red sign strip on glass
            // 4-pane vertical sidelight window next to door with crisp white horizontal muntin bars (seen in 19a77a6c.jpg!)
            for (let p = 0; p < 4; p++) {
                addBox(0.20, 0.44, 0.36, glassMat, washX + 0.09, by + 0.36 + p * 0.52, sideZ);
            }
        });
        // Round red fire-alarm bell above-left of Door 1 + white wall mailbox/intercom box to the right of Door 1 (seen in 19a77a6c.jpg!)
        const sideBell = new THREE.Mesh(
            new THREE.SphereGeometry(0.11, 12, 12),
            new THREE.MeshBasicMaterial({ color: '#b91c1c' })
        );
        sideBell.scale.set(0.55, 1, 1);
        sideBell.position.set(washX + 0.08, door1LandingY + 2.38, 7.08);
        arch.add(sideBell);
        addBox(0.14, 0.24, 0.22, whiteCurbMat, washX + 0.08, door1LandingY + 1.48, 5.38); // White wall box right of Door 1

        // 4 Square Recessed Basement Windows with White Frames, Dark Glass & Projecting Stone Sills along the Central Bay (19a77a6c.jpg & adc547e2.jpg):
        // Aligned directly beneath the 4 central Monumental Round-Arched Windows (lz = 2.2, -0.9, -4.0, -7.1) and positioned cleanly above the ADA ramp!
        [
            [2.2, 0.18],
            [-0.9, -0.08],
            [-4.0, -0.34],
            [-7.1, -0.60]
        ].forEach(([winZ, winY]) => {
            addBox(0.16, 1.08, 1.18, whiteCurbMat, washX + 0.06, winY, winZ);
            addBox(0.20, 0.90, 1.00, glassMat, washX + 0.09, winY, winZ);
            addBox(0.24, 0.10, 1.28, trimMat, washX + 0.11, winY - 0.56, winZ); // Projecting stone sill
        });

        // 9 Cream-Brick Piers with White Caps, Return Walls, Wrought-Iron Picket Fence & 6 Caged Globe Lamps (19a77a6c.jpg & adc547e2.jpg)
        const fenceX = washX + 2.22;
        const pierSpecs = [
            { z: 10.2, hasLamp: false }, // Pier 1: Front-left pier on sidewalk outside Front Pavilion stairs (19a77a6c.jpg)
            { z: 7.8, hasLamp: true },   // Pier 2: Lamp 1 (left of Door 1, 19a77a6c.jpg)
            { z: 5.4, hasLamp: true },   // Pier 3: Lamp 2 + brick/picket return wall on left of open entry walk (19a77a6c.jpg)
            { z: 3.2, hasLamp: true },   // Pier 4: Lamp 3 on right of open entry walk (19a77a6c.jpg)
            { z: 0.4, hasLamp: false },  // Pier 5: Mid-left pier
            { z: -2.5, hasLamp: false }, // Pier 6: Mid pier
            { z: -5.4, hasLamp: true },  // Pier 7: Lamp 4 (mid-right pier, adc547e2.jpg)
            { z: -8.2, hasLamp: true },  // Pier 8: Lamp 5 (left of Door 2, adc547e2.jpg)
            { z: -10.8, hasLamp: true }, // Pier 9: Lamp 6 (right of Door 2, adc547e2.jpg)
            { z: -12.1, hasLamp: false } // Pier 10: Far-right end pier at Rear Pavilion stairs (adc547e2.jpg)
        ];

        // Cream-brick + wrought-iron picket return wall at Pier 3 (lz = 5.4m, seen in 19a77a6c.jpg!) and Pier 10 (lz = -12.1m)
        [5.4, -12.1].forEach((rz) => {
            const rBaseY = getConcreteTopY(fenceX, rz);
            addBox(2.15, 0.56, 0.30, creamBrickSolidMat, washX + 1.12, rBaseY + 0.28, rz);
            addBox(2.20, 0.07, 0.36, whiteCurbMat, washX + 1.12, rBaseY + 0.59, rz);
            addBox(2.10, 0.04, 0.06, darkMetalMat, washX + 1.12, rBaseY + 1.04, rz);
            addBox(2.10, 0.04, 0.06, darkMetalMat, washX + 1.12, rBaseY + 0.68, rz);
            for (let pkx = washX + 0.20; pkx <= washX + 2.00; pkx += 0.16) {
                addBox(0.03, 0.40, 0.03, darkMetalMat, pkx, rBaseY + 0.86, rz);
            }
        });

        pierSpecs.forEach((p, idx) => {
            const pz = p.z;
            const pBaseY = getConcreteTopY(fenceX, pz);
            // Cream-brick pier with white limestone cap sitting on the contoured Washington St sidewalk
            addBox(0.46, 0.92, 0.46, creamBrickSolidMat, fenceX, pBaseY + 0.46, pz);
            addBox(0.54, 0.09, 0.54, whiteCurbMat, fenceX, pBaseY + 0.96, pz);

            if (p.hasLamp) {
                addCagedGlobeLamp(fenceX, pBaseY + 1.00, pz, 1.65, 0);
            }

            // Low cream-brick wall + black wrought-iron picket fence between consecutive piers (leaving open entry gap between Pier 3 & Pier 4: idx === 2!)
            if (idx < pierSpecs.length - 1 && idx !== 2) {
                const nextZ = pierSpecs[idx + 1].z;
                const span = Math.abs(pz - nextZ) - 0.44;
                const midZ = (pz + nextZ) * 0.5;
                const midBaseY = getConcreteTopY(fenceX, midZ);
                addBox(0.32, 0.56, span, creamBrickSolidMat, fenceX, midBaseY + 0.28, midZ);
                addBox(0.38, 0.07, span, whiteCurbMat, fenceX, midBaseY + 0.59, midZ);
                // Top & bottom wrought-iron rails + vertical pickets
                addBox(0.06, 0.04, span, darkMetalMat, fenceX, midBaseY + 1.04, midZ);
                addBox(0.06, 0.04, span, darkMetalMat, fenceX, midBaseY + 0.68, midZ);
                const numPickets = Math.max(4, Math.floor(span / 0.16));
                for (let pk = 0; pk < numPickets; pk++) {
                    const pkz = Math.min(pz, nextZ) + 0.26 + (pk + 0.5) * ((span - 0.08) / numPickets);
                    addBox(0.03, 0.40, 0.03, darkMetalMat, fenceX, midBaseY + 0.86, pkz);
                }
            }
        });

        // Yellow diamond "15 MPH" street sign post on sidewalk right in front of Pier 3 (seen in 19a77a6c.jpg!)
        const sign15Y = getConcreteTopY(fenceX + 0.35, 5.95);
        addBox(0.05, 2.35, 0.05, galvSteelMat, fenceX + 0.35, sign15Y + 1.18, 5.95);
        const speedDiamond = addBox(
            0.52,
            0.52,
            0.03,
            new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.4 }),
            fenceX + 0.38,
            sign15Y + 2.15,
            5.95
        );
        speedDiamond.rotation.y = Math.PI * 0.5;
        speedDiamond.rotation.z = Math.PI * 0.25;
        addBox(
            0.03,
            0.36,
            0.28,
            new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.4 }),
            fenceX + 0.38,
            sign15Y + 1.55,
            5.95
        );

        // 4 Square Street Tree Pits along the outer edge of the contoured Washington St Sidewalk (19a77a6c.jpg & adc547e2.jpg)
        [8.4, 1.2, -4.5, -10.2].forEach((tz) => {
            const pitY = getConcreteTopY(washX + 3.95, tz);
            addBox(1.15, 0.04, 1.15, soilMat, washX + 3.95, pitY + 0.01, tz, arch, false);
        });
}