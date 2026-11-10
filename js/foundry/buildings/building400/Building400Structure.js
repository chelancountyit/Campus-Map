import * as THREE from 'three';

export function buildBuilding400Structure(ctx) {
    const {
        foundry, group, building, trimMat, arch, addBox,
        cosArch, sinArch, wallZ, frontWingZ, lowerPlazaY, portX, portDepth, portW, deckY, getConcreteTopY,
        whiteRoofMat, creamBrickSolidMat, plinthConcreteMat, slateGableMat,
        plazaConcreteMat, whiteCurbMat, darkMetalMat, galvSteelMat, bronzePlaqueMat, globeMat, glassMat,
        weatheredStuccoMat, rearBoxStuccoMat
    } = ctx;

        const bldg400LocalPts = [
            [-3.24, frontWingZ], // Front-left wing outer corner
            [-0.35, frontWingZ], // Front-left indentation inner corner
            [-0.35, wallZ],      // Central front wall left corner (behind portico)
            [9.35, wallZ],       // Central front wall right corner (behind portico)
            [9.35, frontWingZ],  // Front-right indentation inner corner
            [12.61, frontWingZ], // Front-right wing outer corner (Washington St Front Pavilion)
            [12.61, 7.30],       // Washington St Front Pavilion step-in
            [12.25, 7.30],       // Washington St Central Bay front corner
            [12.25, -11.20],     // Washington St Central Bay rear corner
            [12.61, -11.20],     // Washington St Rear Pavilion step-out
            [12.61, -16.64],     // Washington St Rear Pavilion rear corner
            [-5.35, -16.64],     // SW Rear Box (Stair/Mechanical Tower) rear corner (+1m toward SW parking area)
            [-5.35, -11.20],     // SW Rear Box front step-out corner (closes SW sunken lightwell trench)
            [-2.86, -11.20],     // SW Central Bay rear corner
            [-2.86, 7.30],       // SW Central Bay front corner
            [-3.24, 7.30]        // SW Front Pavilion step-out
        ];
        const bldg400Shape = new THREE.Shape();
        bldg400LocalPts.forEach(([lx, lz], idx) => {
            const sx = lx * cosArch + lz * sinArch;
            const sy = lx * sinArch - lz * cosArch;
            if (idx === 0) bldg400Shape.moveTo(sx, sy);
            else bldg400Shape.lineTo(sx, sy);
        });
        bldg400Shape.closePath();

        // 1. Sub-grade foundation & smooth concrete water-table plinth (-5.2m to -1.8m)
        const footingGeo = new THREE.ExtrudeGeometry(bldg400Shape, {
            depth: 3.4,
            bevelEnabled: false
        });
        footingGeo.rotateX(-Math.PI / 2);
        const footingMesh = new THREE.Mesh(footingGeo, plinthConcreteMat);
        footingMesh.position.y = -5.2;
        footingMesh.receiveShadow = true;
        group.add(footingMesh);

        // 2. Three Stacked Architectural Story Layers on exact stepped footprint using solid running-bond cream brick
        // (so the front piers, portico back wall, and rear wall have clean solid cream brick with zero fake windows,
        // while the exact 3D round-arched windows & basement windows are placed at their true photo coordinates below):
        // - Layer 1 (Floor 1 Basement: -3.6m to -0.10m)
        // - Layer 2 (Floor 2 Road Level: +0.10m to +4.20m)
        // - Layer 3 (Floor 3 Upper Level: +4.22m to +7.45m)
        const layerSpecs = [
            { idx: 1, name: 'Layer1_Basement', y0: -3.6, h: 3.50, mat: creamBrickSolidMat },
            { idx: 2, name: 'Layer2_RoadLevel', y0: 0.10, h: 4.10, mat: creamBrickSolidMat },
            { idx: 3, name: 'Layer3_UpperLevel', y0: 4.22, h: 3.23, mat: creamBrickSolidMat }
        ];

        layerSpecs.forEach((spec) => {
            const geo = new THREE.ExtrudeGeometry(bldg400Shape, {
                depth: spec.h,
                bevelEnabled: false
            });
            geo.rotateX(-Math.PI / 2);
            foundry._applyArchitecturalUVs(geo, spec.h, 1);

            const mesh = new THREE.Mesh(geo, [whiteRoofMat, spec.mat]);
            mesh.name = spec.name;
            mesh.position.y = spec.y0;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = { isSelectableBuilding: true, building, floorLayer: spec.idx };
            group.add(mesh);
        });

        // 3. Smooth Concrete Base Water-Table Plinth (y = 0.0m to +0.58m) & Classical Roof Entablature + Parapet
        // Matches 2c0f8950.jpg and de2d6e09.jpg: smooth cream concrete water-table at base, uninterrupted monumental
        // brick walls up to the classical architrave, dentil brick frieze, projecting cornice, and brick parapet
        // wrapping around the front wall indentations and side wall pavilions!
        // Classical Entablature & Brick Parapet Shape: wraps the Front Pavilion (+Z), NE Washington St (+X),
        // NE Rear Pavilion return (lx = +11.20m..+12.61m, seen at left of ef31cc76.jpg), and SW Front Pavilion (lz = +7.30m..+14.14m, right of 3fb3243e.jpg),
        // while leaving the smooth weathered-stucco SW Central Wall, Rear Gable Wall, and Tall Rear Box clean!
        const brickEntablatureLocalPts = [
            [-3.24, frontWingZ],
            [-0.35, frontWingZ],
            [-0.35, wallZ],
            [9.35, wallZ],
            [9.35, frontWingZ],
            [12.61, frontWingZ],
            [12.61, 7.30],
            [12.25, 7.30],
            [12.25, -11.20],
            [12.61, -11.20],
            [12.61, -16.64],
            [11.20, -16.64],
            [11.20, 7.30],
            [-3.24, 7.30]
        ];
        const brickEntablatureShape = new THREE.Shape();
        brickEntablatureLocalPts.forEach(([lx, lz], idx) => {
            const sx = lx * cosArch + lz * sinArch;
            const sy = lx * sinArch - lz * cosArch;
            if (idx === 0) brickEntablatureShape.moveTo(sx, sy);
            else brickEntablatureShape.lineTo(sx, sy);
        });
        brickEntablatureShape.closePath();

        // Front Pavilion Water-Table Plinth Shape (wraps only the front pavilion lz >= 7.30m so it never cuts across
        // the sunken basement windows or sunken entry doors in the NE and SW lightwells!)
        const frontPlinthLocalPts = [
            [-3.24, frontWingZ],
            [-0.35, frontWingZ],
            [-0.35, wallZ],
            [9.35, wallZ],
            [9.35, frontWingZ],
            [12.61, frontWingZ],
            [12.61, 7.30],
            [-3.24, 7.30]
        ];
        const frontPlinthShape = new THREE.Shape();
        frontPlinthLocalPts.forEach(([lx, lz], idx) => {
            const sx = lx * cosArch + lz * sinArch;
            const sy = lx * sinArch - lz * cosArch;
            if (idx === 0) frontPlinthShape.moveTo(sx, sy);
            else frontPlinthShape.lineTo(sx, sy);
        });
        frontPlinthShape.closePath();

        const beltBands = [
            { y: -0.05, depth: 0.62, overhang: 0.08, mat: plinthConcreteMat, shape: frontPlinthShape }, // Smooth concrete water-table plinth along front wings
            { y: 7.45, depth: 0.26, overhang: 0.22, mat: trimMat },            // Lower limestone architrave band
            { y: 7.71, depth: 0.52, overhang: 0.12, mat: creamBrickSolidMat }, // Dentil brick frieze band
            { y: 8.23, depth: 0.32, overhang: 0.46, mat: trimMat },            // Main projecting classical limestone cornice ledge
            { y: 8.55, depth: 0.54, overhang: 0.14, mat: creamBrickSolidMat }, // Upper cream-brick roof parapet
            { y: 9.09, depth: 0.18, overhang: 0.22, mat: whiteCurbMat }        // White limestone parapet coping
        ];

        beltBands.forEach((b) => {
            const bGeo = new THREE.ExtrudeGeometry(b.shape || brickEntablatureShape, {
                depth: b.depth,
                bevelEnabled: true,
                bevelThickness: 0.06,
                bevelSize: b.overhang,
                bevelSegments: 2
            });
            bGeo.rotateX(-Math.PI / 2);
            const bMesh = new THREE.Mesh(bGeo, b.mat);
            bMesh.position.y = b.y;
            bMesh.castShadow = true;
            bMesh.receiveShadow = true;
            group.add(bMesh);
        });

        // Smooth concrete water-table foundation plinth along the Rear Alley Wall (lz = -16.64m, lx = -5.35m..+12.61m),
        // Washington St Rear Pavilion (lx = +11.20m..+12.61m, lz = -16.64m..-11.20m), SW Rear Box (lx = -5.35m, lz = -16.64m..-11.20m),
        // and SW Front Pavilion (lx = -3.24m, lz = +7.30m..+14.14m)
        addBox(18.04, 2.38, 0.24, plinthConcreteMat, 3.63, -0.61, -16.64);
        addBox(1.48, 2.38, 5.52, plinthConcreteMat, 11.92, -0.61, -13.92);
        addBox(0.24, 2.38, 5.52, plinthConcreteMat, -5.35, -0.61, -13.92);
        addBox(0.24, 2.38, 6.90, plinthConcreteMat, -3.24, -0.61, 10.72);

        // Stepped Corner Brick Quoins on the indented Front Left (lx = -3.24m) and Front Right (lx = +12.61m) corners
        for (let qy = 0.75; qy < 7.35; qy += 0.52) {
            addBox(0.42, 0.28, 0.14, creamBrickSolidMat, -3.05, qy, frontWingZ + 0.04);
            addBox(0.42, 0.28, 0.14, creamBrickSolidMat, 12.42, qy, frontWingZ + 0.04);
        }

        // Sub-grade foundation base under the portico deck (y = -0.60m to 0.0m)
        addBox(portW - 0.2, 0.60, portDepth, trimMat, portX, -0.30, wallZ + portDepth * 0.5);

        // High-res Archimedean Spiral Volute texture + bump map for the Ionic Capital scroll faces (matched to 12b23af8.jpg)
        const voluteCanvas = document.createElement('canvas');
        voluteCanvas.width = 256;
        voluteCanvas.height = 256;
        const vCtx = voluteCanvas.getContext('2d');
        vCtx.fillStyle = '#dcd5c7';
        vCtx.fillRect(0, 0, 256, 256);
        const cxV = 128;
        const cyV = 128;
        // Draw 2.75-turn carved spiral channel (dark recessed shadow + bright raised ridge)
        for (let pass = 0; pass < 2; pass++) {
            vCtx.beginPath();
            const maxSteps = 260;
            for (let i = 0; i <= maxSteps; i++) {
                const t = (i / maxSteps) * Math.PI * 5.5;
                const r = 14 + (t / (Math.PI * 5.5)) * 102;
                const x = cxV + Math.cos(t) * r;
                const y = cyV + Math.sin(t) * r + (pass === 0 ? -3 : 2);
                if (i === 0) vCtx.moveTo(x, y);
                else vCtx.lineTo(x, y);
            }
            vCtx.strokeStyle = pass === 0 ? '#5c5549' : '#f7f3ea';
            vCtx.lineWidth = pass === 0 ? 15 : 10;
            vCtx.lineCap = 'round';
            vCtx.stroke();
        }
        // Central carved eye button (oculus)
        vCtx.beginPath();
        vCtx.arc(cxV, cyV, 16, 0, Math.PI * 2);
        vCtx.fillStyle = '#ebe5d8';
        vCtx.fill();
        vCtx.lineWidth = 4;
        vCtx.strokeStyle = '#6b6355';
        vCtx.stroke();

        const voluteTex = new THREE.CanvasTexture(voluteCanvas);
        voluteTex.colorSpace = THREE.SRGBColorSpace;
        const voluteFaceMat = new THREE.MeshStandardMaterial({
            map: voluteTex,
            bumpMap: voluteTex,
            bumpScale: 0.06,
            roughness: 0.76,
            metalness: 0.04
        });

        // Helper to build a photo-accurate Sculpted Ionic Capital matched to close-up photo 12b23af8.jpg:
        // - Crisp astragal necking ring at top of smooth shaft
        // - Deeply carved 5-egg-and-dart echinus collar tucked between the volutes
        // - Continuous spiral scroll volutes connected by a molded horizontal canalis bridge
        // - Pinched/tapered fluted side bolsters (pulvini) with central foliate balteus band
        // - Two-tier stepped square abacus supporting the architrave
        const addSculptedIonicCapital = (cxPos, capBaseY, czPos, scaleX = 1.0, scaleZ = 1.0) => {
            const capGroup = new THREE.Group();
            capGroup.position.set(cxPos, capBaseY, czPos);
            capGroup.scale.set(scaleX, 1.0, scaleZ);

            // 1. Lower astragal necking ring + fillet directly atop the column shaft (12b23af8.jpg)
            const neckRing = new THREE.Mesh(new THREE.CylinderGeometry(0.405, 0.405, 0.055, 28), trimMat);
            neckRing.position.set(0, -0.03, 0);
            capGroup.add(neckRing);
            const neckFillet = new THREE.Mesh(new THREE.CylinderGeometry(0.385, 0.395, 0.03, 28), plinthConcreteMat);
            neckFillet.position.set(0, -0.065, 0);
            capGroup.add(neckFillet);

            // 2. Flared echinus core + prominent 3D carved Egg-and-Dart relief tucked between the volutes (12b23af8.jpg)
            const echinus = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.38, 0.17, 28), trimMat);
            echinus.position.set(0, 0.085, 0);
            capGroup.add(echinus);

            // 5 prominent carved eggs + vertical darts on both Front (+Z) and Back (-Z) faces between the volutes
            [-1, 1].forEach((zDir) => {
                for (let e = -2; e <= 2; e++) {
                    const ex = e * 0.095;
                    const ez = zDir * Math.sqrt(Math.max(0.05, 0.44 * 0.44 - ex * ex));
                    // Outer carved shell frame (cymatium) around each egg
                    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 10), plinthConcreteMat);
                    shell.scale.set(0.92, 1.45, 0.72);
                    shell.position.set(ex, 0.11, ez);
                    capGroup.add(shell);
                    // Inner convex egg core
                    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), trimMat);
                    egg.scale.set(0.82, 1.38, 0.88);
                    egg.position.set(ex, 0.115, ez + zDir * 0.014);
                    capGroup.add(egg);
                    // Vertical carved dart tongue between adjacent eggs
                    if (e < 2) {
                        addBox(0.018, 0.11, 0.035, trimMat, ex + 0.0475, 0.11, ez + zDir * 0.008, capGroup);
                    }
                }
            });

            // 3. Molded horizontal canalis scroll bridge connecting the left & right volutes (12b23af8.jpg)
            addBox(0.92, 0.13, 0.84, trimMat, 0, 0.21, 0, capGroup);
            addBox(0.96, 0.045, 0.90, plinthConcreteMat, 0, 0.26, 0, capGroup);

            // 4. Left & Right Sculpted Side Bolsters (Pulvini) — pinched hourglass profile with deep water-leaf flutes
            [-0.43, 0.43].forEach((vx) => {
                const signX = Math.sign(vx);
                // Front & rear flared bolster halves tapering toward the pinched center waist (seen in 12b23af8.jpg)
                [-0.23, 0.23].forEach((bzHalf) => {
                    const halfBolster = new THREE.Mesh(
                        new THREE.CylinderGeometry(
                            bzHalf > 0 ? 0.185 : 0.145,
                            bzHalf > 0 ? 0.145 : 0.185,
                            0.46,
                            20
                        ),
                        trimMat
                    );
                    halfBolster.rotation.x = Math.PI * 0.5;
                    halfBolster.position.set(vx, 0.135, bzHalf);
                    halfBolster.castShadow = true;
                    capGroup.add(halfBolster);
                });

                // 9 Deeply carved fluted ribs running front-to-back along the bolster cushion
                for (let f = 0; f < 9; f++) {
                    const fang = -Math.PI * 0.35 + (f / 8) * Math.PI * 1.15 * signX;
                    const flute = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.024, 0.024, 0.92, 8),
                        f % 2 === 0 ? trimMat : plinthConcreteMat
                    );
                    flute.rotation.x = Math.PI * 0.5;
                    flute.position.set(vx + Math.cos(fang) * 0.162, 0.135 + Math.sin(fang) * 0.162, 0);
                    capGroup.add(flute);
                }

                // Sculpted central foliate balteus strap cinching the middle of each bolster (12b23af8.jpg)
                const centerStrap = new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.168, 0.08, 18), trimMat);
                centerStrap.rotation.x = Math.PI * 0.5;
                centerStrap.position.set(vx, 0.135, 0);
                capGroup.add(centerStrap);
                [-0.048, 0.048].forEach((bz) => {
                    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.174, 0.174, 0.022, 18), plinthConcreteMat);
                    cord.rotation.x = Math.PI * 0.5;
                    cord.position.set(vx, 0.135, bz);
                    capGroup.add(cord);
                });

                // Front (+Z) & Back (-Z) Spiral Volute Faces with spiral bump map + 3D carved spiral rings (12b23af8.jpg)
                [-0.46, 0.46].forEach((vz) => {
                    const signZ = Math.sign(vz);
                    // Main spiral-textured volute face drum
                    const voluteDrum = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.195, 0.195, 0.055, 24),
                        [trimMat, voluteFaceMat, voluteFaceMat]
                    );
                    voluteDrum.rotation.x = Math.PI * 0.5;
                    voluteDrum.position.set(vx, 0.135, vz);
                    capGroup.add(voluteDrum);

                    // 3D stepped spiral torus rings & central button eye for true 3D depth from oblique angles
                    [
                        [0.182, 0.024, 0.022],
                        [0.128, 0.020, 0.032],
                        [0.076, 0.017, 0.040]
                    ].forEach(([rad, tube, zOff], idx) => {
                        const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, tube, 10, 22), trimMat);
                        ring.position.set(
                            vx - idx * 0.010 * signX,
                            0.135 - idx * 0.008,
                            vz + signZ * zOff
                        );
                        capGroup.add(ring);
                    });

                    const eyeBtn = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 10), trimMat);
                    eyeBtn.scale.set(1.0, 1.0, 0.55);
                    eyeBtn.position.set(vx - 0.022 * signX, 0.12, vz + signZ * 0.045);
                    capGroup.add(eyeBtn);
                });
            });

            // 5. Two-tier molded square abacus crowning the capital beneath the architrave (12b23af8.jpg)
            addBox(0.92, 0.075, 0.92, plinthConcreteMat, 0, 0.295, 0, capGroup);
            addBox(1.02, 0.075, 1.02, trimMat, 0, 0.365, 0, capGroup);

            arch.add(capGroup);
        };

        // 2 Engaged Brick Pilasters with Sculpted Ionic Volute Capitals on the front brick wall behind the outer columns
        [0.25, 8.75].forEach((px) => {
            addBox(0.92, 0.48, 0.34, trimMat, px, deckY + 0.24, wallZ + 0.17);
            addBox(0.84, 0.14, 0.30, trimMat, px, deckY + 0.55, wallZ + 0.15);
            addBox(0.76, 6.32, 0.22, creamBrickSolidMat, px, deckY + 0.62 + 3.16, wallZ + 0.11);
            addSculptedIonicCapital(px, deckY + 6.82, wallZ + 0.16, 0.94, 0.46);
        });

        // 4 Classical Segmented Limestone Columns with Sculpted Ionic Capitals (lz = +17.09m, 8fabdee1.jpg & 353a55d7.jpg)
        const colXs = [0.25, 3.08, 5.92, 8.75];
        const colH = 6.22;
        const colZ = wallZ + portDepth - 0.48;

        colXs.forEach((cxPos) => {
            // Tall weathered stone pedestal block + stepped plinth + Attic base (lower torus, scotia, upper torus)
            addBox(1.10, 0.46, 1.10, plinthConcreteMat, cxPos, deckY + 0.23, colZ);
            addBox(1.02, 0.12, 1.02, trimMat, cxPos, deckY + 0.52, colZ);
            const lowerTorus = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.52, 0.12, 24), trimMat);
            lowerTorus.position.set(cxPos, deckY + 0.64, colZ);
            arch.add(lowerTorus);
            const upperTorus = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.47, 0.10, 24), trimMat);
            upperTorus.position.set(cxPos, deckY + 0.74, colZ);
            arch.add(upperTorus);

            // Tapered Classical Column Shaft built of 5 stacked limestone drums with subtle horizontal joint rings
            const shaftBaseY = deckY + 0.78;
            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.365, 0.425, colH, 28), trimMat);
            shaft.position.set(cxPos, shaftBaseY + colH * 0.5, colZ);
            shaft.castShadow = true;
            shaft.receiveShadow = true;
            arch.add(shaft);

            for (let d = 1; d <= 4; d++) {
                const frac = d / 5;
                const drumR = 0.425 - frac * (0.425 - 0.365) + 0.004;
                const jointRing = new THREE.Mesh(new THREE.CylinderGeometry(drumR, drumR, 0.022, 24), plinthConcreteMat);
                jointRing.position.set(cxPos, shaftBaseY + frac * colH, colZ);
                arch.add(jointRing);
            }

            // Sculpted Ionic Capital with 4 Corner Scroll Volutes, Fluted Bolsters, Balteus & Abacus
            addSculptedIonicCapital(cxPos, shaftBaseY + colH, colZ, 1.0, 1.0);
        });

        // Helper for Draped Black Link Chains with Realistic Catenary Sag between Stanchion Posts (3b9c07db.jpg & 28f96301.jpg)
        const addSaggingChain = (x0, z0, x1, z1, yEnds = deckY + 0.78, sag = 0.16) => {
            const segs = 10;
            for (let i = 0; i < segs; i++) {
                const t0 = i / segs;
                const t1 = (i + 1) / segs;
                const tm = (t0 + t1) * 0.5;
                const px0 = x0 + (x1 - x0) * t0;
                const pz0 = z0 + (z1 - z0) * t0;
                const py0 = yEnds - 4 * sag * t0 * (1 - t0);
                const px1 = x0 + (x1 - x0) * t1;
                const pz1 = z0 + (z1 - z0) * t1;
                const py1 = yEnds - 4 * sag * t1 * (1 - t1);
                const segLen = Math.hypot(px1 - px0, py1 - py0, pz1 - pz0) + 0.01;
                const link = addBox(
                    segLen,
                    0.032,
                    0.032,
                    darkMetalMat,
                    x0 + (x1 - x0) * tm,
                    (py0 + py1) * 0.5,
                    z0 + (z1 - z0) * tm
                );
                link.rotation.z = Math.atan2(py1 - py0, Math.hypot(px1 - px0, pz1 - pz0));
                link.rotation.y = -Math.atan2(pz1 - pz0, px1 - px0);
            }
        };

        // Black Stanchion Posts & Draped Catenary Chains between the Outer Portico Columns (3b9c07db.jpg, 28f96301.jpg, 29a2721c.jpg)
        [
            [0.25, 3.08],
            [5.92, 8.75]
        ].forEach(([x0, x1]) => {
            const p0x = x0 + 0.56;
            const p1x = x1 - 0.56;
            addBox(0.055, 0.88, 0.055, darkMetalMat, p0x, deckY + 0.44, colZ);
            addBox(0.055, 0.88, 0.055, darkMetalMat, p1x, deckY + 0.44, colZ);
            addSaggingChain(p0x, colZ, p1x, colZ, deckY + 0.82, 0.15);
        });
        // Side chain from Column 1 back to Left Pilaster, and Column 4 back to Right Pilaster
        [0.25, 8.75].forEach((cxPos) => {
            addBox(0.05, 0.88, 0.05, darkMetalMat, cxPos, deckY + 0.44, colZ - 0.58);
            addSaggingChain(cxPos, wallZ + 0.35, cxPos, colZ - 0.58, deckY + 0.82, 0.12);
        });

        // Classical Portico Entablature: Recessed Soffit, 3-Fascia Stepped Architrave, Chiseled "CHELAN COUNTY" Frieze,
        // and 3D Carved Dentil Cornice (8fabdee1.jpg, 353a55d7.jpg)
        const entabW = portW + 0.36;
        const entabH = 1.12;
        const entabD = portDepth + 0.26;
        const entabY = 8.08;

        // Recessed portico ceiling soffit with perimeter stone beam frame & sunken coffered ceiling panel (12b23af8.jpg)
        addBox(portW, 0.08, portDepth, trimMat, portX, entabY - entabH * 0.5 + 0.02, wallZ + portDepth * 0.5);
        addBox(portW - 1.55, 0.06, portDepth - 1.35, plinthConcreteMat, portX, entabY - entabH * 0.5 + 0.07, wallZ + portDepth * 0.5);

        // 3-Fascia Stepped Classical Architrave below the frieze (12b23af8.jpg, 353a55d7.jpg)
        const archBaseY = entabY - entabH * 0.5;
        addBox(entabW + 0.16, 0.11, entabD + 0.16, trimMat, portX, archBaseY + 0.055, wallZ + entabD * 0.5); // Lower fascia 1
        addBox(entabW + 0.24, 0.11, entabD + 0.24, trimMat, portX, archBaseY + 0.165, wallZ + entabD * 0.5); // Middle fascia 2
        addBox(entabW + 0.34, 0.09, entabD + 0.32, trimMat, portX, archBaseY + 0.265, wallZ + entabD * 0.5); // Upper taenia molding

        // Cream Running-Bond Brick Frieze Core (12b23af8.jpg shows 6 courses of cream brick flanking the "CHELAN COUNTY" stone tablet!)
        addBox(entabW, 0.62, entabD, creamBrickSolidMat, portX, entabY + 0.02, wallZ + entabD * 0.5);

        // Chiseled/Incised Roman Serif "CHELAN COUNTY" Warm Sandstone Tablet Plaque + Molded Border Frame (12b23af8.jpg)
        const friezeCanvas = document.createElement('canvas');
        friezeCanvas.width = 1024;
        friezeCanvas.height = 160;
        const fCtx = friezeCanvas.getContext('2d');
        fCtx.fillStyle = '#c8be9e'; // Warm buff sandstone tablet color seen in 12b23af8.jpg
        fCtx.fillRect(0, 0, 1024, 160);
        // Subtle weathered sandstone grain
        for (let i = 0; i < 700; i++) {
            fCtx.fillStyle = i % 2 === 0 ? 'rgba(85,76,60,0.07)' : 'rgba(250,245,232,0.07)';
            fCtx.fillRect((i * 73) % 1024, (i * 41) % 160, 14, 5);
        }
        // Incised perimeter border groove on the stone tablet
        fCtx.strokeStyle = 'rgba(80,72,58,0.45)';
        fCtx.lineWidth = 5;
        fCtx.strokeRect(10, 10, 1004, 140);
        fCtx.font = 'bold 82px "Times New Roman", Georgia, serif';
        fCtx.textAlign = 'center';
        fCtx.textBaseline = 'middle';
        // Deep V-cut chiseled shadow (top-left dark shadow, bottom-right sun highlight)
        fCtx.fillStyle = '#5e5645';
        fCtx.fillText('CHELAN COUNTY', 509, 79);
        fCtx.fillStyle = '#ece5d2';
        fCtx.fillText('CHELAN COUNTY', 515, 85);
        fCtx.fillStyle = '#8b816b';
        fCtx.fillText('CHELAN COUNTY', 512, 82);
        const friezeTex = new THREE.CanvasTexture(friezeCanvas);
        friezeTex.colorSpace = THREE.SRGBColorSpace;
        const friezeMat = new THREE.MeshStandardMaterial({
            map: friezeTex,
            bumpMap: friezeTex,
            bumpScale: -0.05,
            roughness: 0.84
        });
        // Molded stone frame + projecting sandstone tablet mounted on the cream-brick frieze
        addBox(7.82, 0.56, 0.05, trimMat, portX, entabY + 0.02, wallZ + entabD + 0.02);
        const friezePlaque = new THREE.Mesh(new THREE.BoxGeometry(7.68, 0.50, 0.06), friezeMat);
        friezePlaque.position.set(portX, entabY + 0.02, wallZ + entabD + 0.035);
        arch.add(friezePlaque);

        // 3D Carved Dentil Band directly above "CHELAN COUNTY", along Left/Right Entablature Returns,
        // AND along the Main Building Front Cornice wings behind the portico (seen in 12b23af8.jpg!)
        const dentilY = entabY + 0.38;
        const numFrontDentils = 46;
        const dentilSpanX = entabW + 0.24;
        for (let d = 0; d < numFrontDentils; d++) {
            const dx = portX - dentilSpanX * 0.5 + (d + 0.5) * (dentilSpanX / numFrontDentils);
            addBox(0.11, 0.13, 0.14, trimMat, dx, dentilY, wallZ + entabD + 0.10);
        }
        for (let dz = wallZ + 0.20; dz < wallZ + entabD; dz += 0.22) {
            addBox(0.14, 0.13, 0.11, trimMat, portX - entabW * 0.5 - 0.10, dentilY, dz);
            addBox(0.14, 0.13, 0.11, trimMat, portX + entabW * 0.5 + 0.10, dentilY, dz);
        }
        // Main building front wing dentils along the indented left & right front wings (frontWingZ) and step-back returns (12b23af8.jpg & de2d6e09.jpg)
        for (let wx = -3.15; wx <= 12.50; wx += 0.22) {
            if (wx < -0.42 || wx > 9.42) {
                addBox(0.11, 0.13, 0.14, trimMat, wx, 8.15, frontWingZ + 0.12);
            }
        }
        for (let rz = frontWingZ + 0.12; rz <= wallZ + 0.05; rz += 0.20) {
            addBox(0.14, 0.13, 0.11, trimMat, -0.42, 8.15, rz);
            addBox(0.14, 0.13, 0.11, trimMat, 9.42, 8.15, rz);
        }

        // Horizontal Geison / Cornice Ledge above the Dentils
        addBox(entabW + 0.56, 0.20, entabD + 0.44, trimMat, portX, entabY + entabH * 0.5 - 0.04, wallZ + entabD * 0.5);

        // Triangular Classical A-Frame Pediment with Recessed Cream-Brick Tympanum, Inner Raking Dentils & Slate Gable Roof (8fabdee1.jpg, 353a55d7.jpg, b7570195.jpg)
        const pedBaseY = entabY + entabH * 0.5 + 0.04;
        const pedW = entabW + 0.44;
        const pedH = 2.05;
        const pedShape = new THREE.Shape();
        pedShape.moveTo(-pedW * 0.5, 0);
        pedShape.lineTo(pedW * 0.5, 0);
        pedShape.lineTo(0, pedH);
        pedShape.closePath();

        // Recessed cream-brick tympanum triangle inside the limestone pediment frame
        const pedGeo = new THREE.ExtrudeGeometry(pedShape, {
            depth: entabD + 0.08,
            bevelEnabled: false
        });
        const pedMesh = new THREE.Mesh(pedGeo, creamBrickSolidMat);
        pedMesh.position.set(portX, pedBaseY, wallZ - 0.05);
        pedMesh.castShadow = true;
        pedMesh.receiveShadow = true;
        arch.add(pedMesh);

        // Raised rectangular cream-brick attic parapet wall directly behind the triangular A-frame pediment (b7570195.jpg & 048e987a.jpg):
        // Forms the front masonry facade of the rooftop room (lx = -0.35m..+9.35m, lz = wallZ - 1.15m..wallZ) with white coping at y = 10.24m!
        addBox(9.70, 1.55, 1.18, creamBrickSolidMat, portX, pedBaseY + 0.72, wallZ - 0.58);
        addBox(9.92, 0.18, 1.32, whiteCurbMat, portX, pedBaseY + 1.55, wallZ - 0.58);

        // Left & right raking limestone cornices, raking 3D dentil rows (353a55d7.jpg), and pitched slate A-frame gable roof slopes
        const slopeLen = Math.hypot(pedW * 0.5 + 0.28, pedH) + 0.18;
        const slopeAngle = Math.atan2(pedH, pedW * 0.5);
        [-1, 1].forEach((dir) => {
            const rakingGroup = new THREE.Group();
            rakingGroup.position.set(
                portX + dir * (pedW * 0.25 + 0.04),
                pedBaseY + pedH * 0.5 - 0.04,
                wallZ + entabD * 0.5
            );
            rakingGroup.rotation.z = -dir * slopeAngle;

            // Upper projecting raking geison cornice + inner stepped tympanum molding
            addBox(slopeLen, 0.20, entabD + 0.42, trimMat, 0, 0.06, 0.04, rakingGroup);
            addBox(slopeLen - 0.35, 0.12, 0.24, trimMat, 0, -0.14, entabD * 0.5 + 0.04, rakingGroup);

            // 22 Raking 3D Dentil Blocks running up each slope of the A-frame pediment (seen in 8fabdee1.jpg & 353a55d7.jpg)
            const rakingDentilCount = 22;
            const rakingSpan = slopeLen - 0.55;
            for (let rd = 0; rd < rakingDentilCount; rd++) {
                const rdx = -rakingSpan * 0.5 + (rd + 0.5) * (rakingSpan / rakingDentilCount);
                addBox(0.10, 0.12, 0.16, trimMat, rdx, -0.06, entabD * 0.5 + 0.12, rakingGroup);
            }

            // Dark-slate pitched A-frame gable roof above the raking cornice + ridge cap
            addBox(slopeLen + 0.12, 0.15, entabD + 0.50, slateGableMat, 0, 0.21, 0.04, rakingGroup);
            arch.add(rakingGroup);
        });
        // Ridge flashing cap along the apex of the dark-slate A-frame portico roof (b7570195.jpg & 048e987a.jpg)
        addBox(0.32, 0.14, entabD + 0.52, trimMat, portX, pedBaseY + pedH + 0.22, wallZ + entabD * 0.5 + 0.04);

        // --- B. RECESSED PORTICO ENTRY DOORS, S-SCROLL CONSOLE BRACKETS, TRANSOM & ORNATE SCONCES (3b9c07db.jpg, f097f1e6.jpg) ---
        const doorBaseY = deckY;

        // Central Grand Entrance (lx = +4.50m): Molded Limestone Architrave Surround + Paneled White Double Doors + 12-Pane Transom
        addBox(2.68, 4.75, 0.20, trimMat, portX, doorBaseY + 2.38, wallZ + 0.05);     // Outer carved stone door architrave
        addBox(2.34, 4.52, 0.16, whiteCurbMat, portX, doorBaseY + 2.26, wallZ + 0.07); // White wood door & transom frame
        // Left & right white paneled doors with upper dark glass lites, lower recessed panels & black pull handles
        [-0.54, 0.54].forEach((dx) => {
            addBox(0.98, 2.38, 0.14, whiteCurbMat, portX + dx, doorBaseY + 1.19, wallZ + 0.10); // Door stile/rail leaf
            addBox(0.74, 1.24, 0.18, glassMat, portX + dx, doorBaseY + 1.62, wallZ + 0.14);     // Upper glass window lite
            addBox(0.74, 0.58, 0.16, plinthConcreteMat, portX + dx, doorBaseY + 0.48, wallZ + 0.13); // Lower recessed panel
            // Vertical black iron door pull handle near center astragal
            addBox(0.035, 0.34, 0.06, darkMetalMat, portX + dx * 0.22, doorBaseY + 1.05, wallZ + 0.20);
        });
        addBox(0.10, 2.42, 0.22, whiteCurbMat, portX, doorBaseY + 1.21, wallZ + 0.14); // Center door astragal post
        addBox(2.28, 0.16, 0.24, whiteCurbMat, portX, doorBaseY + 2.46, wallZ + 0.15); // Heavy transom division bar

        // 12-Pane (6x2) Rectangular Transom Window with Crisp White Muntin Grid above Central Doors (3b9c07db.jpg)
        addBox(2.08, 1.38, 0.18, glassMat, portX, doorBaseY + 3.28, wallZ + 0.13);
        addBox(2.10, 0.055, 0.22, whiteCurbMat, portX, doorBaseY + 3.28, wallZ + 0.15); // Horizontal transom muntin
        for (let m = -2; m <= 2; m++) {
            addBox(0.048, 1.38, 0.22, whiteCurbMat, portX + m * 0.345, doorBaseY + 3.28, wallZ + 0.15);
        }

        // Deep Projecting Classical Limestone Cornice Hood & Sculpted S-Scroll Console Brackets (Ancones) (3b9c07db.jpg, f097f1e6.jpg)
        addBox(2.82, 0.18, 0.42, trimMat, portX, doorBaseY + 4.58, wallZ + 0.21); // Lower hood architrave
        addBox(3.02, 0.22, 0.54, trimMat, portX, doorBaseY + 4.76, wallZ + 0.27); // Upper projecting hood corona
        [-1.24, 1.24].forEach((bx) => {
            // Sculpted console bracket with upper & lower S-scroll volute cylinders and acanthus spine
            addBox(0.24, 0.68, 0.36, trimMat, portX + bx, doorBaseY + 4.18, wallZ + 0.18);
            const topRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.26, 14), trimMat);
            topRoll.rotation.z = Math.PI * 0.5;
            topRoll.position.set(portX + bx, doorBaseY + 4.38, wallZ + 0.32);
            arch.add(topRoll);
            const botRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.26, 14), trimMat);
            botRoll.rotation.z = Math.PI * 0.5;
            botRoll.position.set(portX + bx, doorBaseY + 3.92, wallZ + 0.24);
            arch.add(botRoll);
        });

        // 2 Ornate Cast-Iron Wall Sconce Globe Lanterns, White Mail Drop-Box & Red Fire-Alarm Bell (3b9c07db.jpg)
        [2.98, 6.02].forEach((sx) => {
            addBox(0.14, 0.34, 0.06, darkMetalMat, sx, doorBaseY + 2.38, wallZ + 0.05); // Wall backplate
            addBox(0.06, 0.08, 0.28, darkMetalMat, sx, doorBaseY + 2.34, wallZ + 0.16); // Bracket arm
            const sconceGlobe = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 14), globeMat);
            sconceGlobe.position.set(sx, doorBaseY + 2.58, wallZ + 0.26);
            arch.add(sconceGlobe);
            const sconceRing = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.03, 14), darkMetalMat);
            sconceRing.position.set(sx, doorBaseY + 2.58, wallZ + 0.26);
            arch.add(sconceRing);
            const finial = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.12, 10), darkMetalMat);
            finial.position.set(sx, doorBaseY + 2.78, wallZ + 0.26);
            arch.add(finial);
        });
        addBox(0.26, 0.32, 0.16, whiteCurbMat, 3.06, doorBaseY + 1.42, wallZ + 0.10); // White wall drop-box
        addBox(0.18, 0.06, 0.18, darkMetalMat, 3.06, doorBaseY + 1.50, wallZ + 0.11); // Black drop-box slot hood
        const alarmBell = new THREE.Mesh(
            new THREE.SphereGeometry(0.11, 12, 12),
            new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.4, metalness: 0.3 })
        );
        alarmBell.scale.set(1, 1, 0.55);
        alarmBell.position.set(2.58, doorBaseY + 4.55, wallZ + 0.07);
        arch.add(alarmBell);

        // 2 Side Entry Doors (lx = +1.65m and lx = +7.35m) with Molded Stone Surround, Upper/Lower Glass Lites & Lintel (28f96301.jpg)
        [1.65, 7.35].forEach((sx) => {
            addBox(1.52, 3.35, 0.16, trimMat, sx, doorBaseY + 1.67, wallZ + 0.05);      // Stone architrave surround
            addBox(1.28, 3.18, 0.16, whiteCurbMat, sx, doorBaseY + 1.59, wallZ + 0.08); // White door leaf
            addBox(0.88, 1.32, 0.18, glassMat, sx, doorBaseY + 2.18, wallZ + 0.12);     // Upper glass lite
            addBox(0.88, 0.82, 0.18, glassMat, sx, doorBaseY + 0.78, wallZ + 0.12);     // Lower glass lite
            addBox(1.66, 0.26, 0.28, trimMat, sx, doorBaseY + 3.42, wallZ + 0.12);      // Projecting stone lintel
        });

        // Indented Left Front Wing Details (lx = -3.24m..-0.35m, at lz = frontWingZ = 14.14m; 3b9c07db.jpg & 687b2a06.jpg):
        // Sculpted Stone Bench, Bronze Dedication Plaque & Red Fire Strobe mounted on the indented left front brick wall
        addBox(1.48, 0.11, 0.52, trimMat, -2.28, 0.48, frontWingZ + 0.48); // Molded stone seat slab
        addBox(1.42, 0.05, 0.46, plinthConcreteMat, -2.28, 0.41, frontWingZ + 0.48);
        [-2.78, -1.78].forEach((legX) => {
            addBox(0.26, 0.10, 0.46, trimMat, legX, 0.05, frontWingZ + 0.48); // Sculpted paw foot base
            addBox(0.20, 0.28, 0.38, trimMat, legX, 0.24, frontWingZ + 0.48); // Fluted pedestal leg waist
            addBox(0.25, 0.08, 0.44, trimMat, legX, 0.38, frontWingZ + 0.48); // Leg capital
        });
        // Dark Bronze Dedication Plaque with Raised Border & Text Lines + Red Fire Strobe on Indented Left Front Brick Wall
        addBox(0.58, 0.74, 0.05, bronzePlaqueMat, -1.82, 1.72, frontWingZ + 0.04);
        addBox(0.50, 0.66, 0.06, new THREE.MeshStandardMaterial({ color: '#5c4736', roughness: 0.35, metalness: 0.75 }), -1.82, 1.72, frontWingZ + 0.045);
        addBox(0.16, 0.20, 0.08, new THREE.MeshBasicMaterial({ color: '#dc2626' }), -2.68, 1.78, frontWingZ + 0.05);

        // Indented Right Front Wing Details (lx = +9.35m..+12.61m, at lz = frontWingZ = 14.14m; 29a2721c.jpg, 9c557575.jpg & b7570195.jpg):
        // "400 DOUGLAS STREET" Dimensional Lettering, Blue ADA Sign & White Louvered Foundation Vent on the indented right front wall
        const addrTex = foundry._createTextPlaqueTexture(['400', 'DOUGLAS STREET'], '#dfd5bc', '#1a1917', 512, 160);
        const addrMat = new THREE.MeshStandardMaterial({ map: addrTex, roughness: 0.8 });
        const addrSign = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 0.72), addrMat);
        addrSign.position.set(10.85, 2.55, frontWingZ + 0.06);
        arch.add(addrSign);

        const adaPlaque = new THREE.Mesh(
            new THREE.PlaneGeometry(0.40, 0.48),
            new THREE.MeshBasicMaterial({ color: '#1d4ed8' })
        );
        adaPlaque.position.set(10.85, 1.68, frontWingZ + 0.06);
        arch.add(adaPlaque);

        // White louvered foundation vent near the bottom-right corner of the indented front water-table plinth (9c557575.jpg)
        addBox(0.48, 0.32, 0.06, whiteCurbMat, 11.85, 0.08, frontWingZ + 0.06);
        for (let lv = -2; lv <= 2; lv++) {
            addBox(0.42, 0.025, 0.08, plinthConcreteMat, 11.85, 0.08 + lv * 0.055, frontWingZ + 0.07);
        }

        // --- C. 3D MONUMENTAL ROUND-ARCHED WINDOWS, SILL-BALCONIES & SUNKEN LIGHTWELLS ON NE (+X) & SW (-X) SIDES ---
        // Helper to build a true 3D round-arched window with brick archivolt, keystone, white sash & optional bracketed sill-balcony
        const addMonumentalArchedWindow = (wx, wy, wz, sideDir = 1, hasBalcony = false, showBrickSpandrel = true) => {
            const wGroup = new THREE.Group();
            wGroup.position.set(wx, wy, wz);
            // sideDir = +1 for NE Washington St (+X), -1 for SW Parking Lot (-X)
            wGroup.rotation.y = sideDir > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;

            const winW = 1.68;
            const rectH = 2.65;
            const archR = winW * 0.5;

            // Brick soldier-course surround + recessed white sash frame + unobstructed dark glass pane
            addBox(winW + 0.28, rectH, 0.12, creamBrickSolidMat, 0, rectH * 0.5, 0.04, wGroup);
            addBox(winW + 0.16, rectH, 0.16, whiteCurbMat, 0, rectH * 0.5, 0.06, wGroup);
            addBox(winW, rectH - 0.12, 0.20, glassMat, 0, rectH * 0.5, 0.09, wGroup);
            // Crisp white horizontal meeting rail across mid-sash
            addBox(winW + 0.04, 0.045, 0.22, whiteCurbMat, 0, rectH * 0.52, 0.10, wGroup);
            // Prominent horizontal white transom bar separating rectangular sash from semicircular fanlight
            addBox(winW + 0.12, 0.10, 0.26, whiteCurbMat, 0, rectH - 0.03, 0.11, wGroup);

            // Semicircular arched glass fanlight + brick soldier-course archivolt + projecting trapezoidal limestone keystone
            const archDisc = new THREE.Mesh(
                new THREE.CylinderGeometry(archR + 0.16, archR + 0.16, 0.16, 24, 1, false, 0, Math.PI),
                creamBrickSolidMat
            );
            archDisc.rotation.z = Math.PI * 0.5;
            archDisc.rotation.y = Math.PI * 0.5;
            archDisc.position.set(0, rectH, 0.05);
            wGroup.add(archDisc);

            const sashDisc = new THREE.Mesh(
                new THREE.CylinderGeometry(archR + 0.06, archR + 0.06, 0.18, 22, 1, false, 0, Math.PI),
                whiteCurbMat
            );
            sashDisc.rotation.z = Math.PI * 0.5;
            sashDisc.rotation.y = Math.PI * 0.5;
            sashDisc.position.set(0, rectH, 0.07);
            wGroup.add(sashDisc);

            const glassDisc = new THREE.Mesh(
                new THREE.CylinderGeometry(archR - 0.02, archR - 0.02, 0.22, 20, 1, false, 0, Math.PI),
                glassMat
            );
            glassDisc.rotation.z = Math.PI * 0.5;
            glassDisc.rotation.y = Math.PI * 0.5;
            glassDisc.position.set(0, rectH, 0.09);
            wGroup.add(glassDisc);

            // Projecting sculpted limestone keystone at crown of arch (c962dc65.jpg)
            addBox(0.28, 0.44, 0.28, trimMat, 0, rectH + archR + 0.08, 0.11, wGroup);
            addBox(0.34, 0.16, 0.30, trimMat, 0, rectH + archR + 0.24, 0.12, wGroup);

            if (hasBalcony) {
                // Solid Molded Classical Limestone Pedestal Sill-Balcony Apron (seen in close-up 19a77a6c.jpg!):
                // - Projecting top sill cap + torus molding
                // - Recessed rectangular stone dado core (no separate dangling legs!)
                // - Flared multi-stepped lower base molding with side returns
                addBox(2.36, 0.16, 0.48, trimMat, 0, -0.08, 0.20, wGroup);            // Top projecting sill cap
                addBox(2.22, 0.10, 0.42, plinthConcreteMat, 0, -0.21, 0.17, wGroup);  // Upper necking molding
                addBox(2.08, 0.46, 0.34, trimMat, 0, -0.49, 0.14, wGroup);            // Solid stone dado core
                addBox(1.82, 0.30, 0.36, plinthConcreteMat, 0, -0.49, 0.15, wGroup);  // Subtle central stone tablet face
                addBox(2.24, 0.12, 0.42, trimMat, 0, -0.78, 0.17, wGroup);            // Lower torus flare 1
                addBox(2.40, 0.16, 0.50, trimMat, 0, -0.92, 0.21, wGroup);            // Flared bottom plinth molding
                addBox(2.18, 0.08, 0.38, plinthConcreteMat, 0, -1.04, 0.15, wGroup);  // Under-apron drip molding
            } else {
                // Projecting limestone window sill
                addBox(winW + 0.34, 0.15, 0.28, trimMat, 0, -0.075, 0.11, wGroup);
                if (showBrickSpandrel) {
                    // True 3D Recessed Brick Spandrel Indentation below sill on NE Washington St brick wall (seen in 19a77a6c.jpg!)
                    addBox(winW - 0.12, 0.58, 0.03, plinthConcreteMat, 0, -0.44, 0.015, wGroup);
                    addBox(winW - 0.16, 0.52, 0.04, creamBrickSolidMat, 0, -0.44, 0.02, wGroup);
                    // Raised left & right vertical brick border piers + bottom horizontal brick sill rail framing the indentation
                    [-winW * 0.5 - 0.04, winW * 0.5 + 0.04].forEach((bx) => {
                        addBox(0.18, 0.64, 0.09, creamBrickSolidMat, bx, -0.44, 0.045, wGroup);
                    });
                    addBox(winW + 0.26, 0.11, 0.10, creamBrickSolidMat, 0, -0.78, 0.05, wGroup);
                }
            }

            arch.add(wGroup);
        };

        const washX = 12.25;

        // Vertical stepped brick pilaster reveal on the left edge of the Front Pavilion (seen at left of 19a77a6c.jpg)
        addBox(0.08, 6.85, 0.42, creamBrickSolidMat, washX + 0.38, 4.00, frontWingZ - 0.21);

        // Tall smooth concrete water-table plinth with beveled top ledge at sidewalk grade on the Front & Rear Pavilions (19a77a6c.jpg & adc547e2.jpg)
        // Extended down by 2 feet (0.61m) to meet the lowered Washington St grade cleanly!
        const frontPavLen = frontWingZ - 7.30; // 6.84m
        const frontPavMidZ = (frontWingZ + 7.30) * 0.5; // 10.72m
        addBox(0.14, 2.25, frontPavLen + 0.04, plinthConcreteMat, washX + 0.36, lowerPlazaY + 0.425, frontPavMidZ);
        addBox(0.18, 0.08, frontPavLen + 0.08, trimMat, washX + 0.38, lowerPlazaY + 1.56, frontPavMidZ); // Top water-table bevel ledge
        addBox(0.14, 2.25, 5.48, plinthConcreteMat, washX + 0.36, lowerPlazaY + 0.425, -13.92);
        addBox(0.18, 0.08, 5.52, trimMat, washX + 0.38, lowerPlazaY + 1.56, -13.92);

        // 2 Recessed Louvered Foundation Vents in the Front Pavilion concrete water-table base (seen in close-up 19a77a6c.jpg at lz = 11.85m & lz = 9.05m!)
        [11.85, 9.05].forEach((vz) => {
            addBox(0.08, 0.28, 0.52, whiteCurbMat, washX + 0.41, lowerPlazaY + 0.36, vz);
            for (let lv = -2; lv <= 2; lv++) {
                addBox(0.10, 0.025, 0.46, plinthConcreteMat, washX + 0.42, lowerPlazaY + 0.36 + lv * 0.05, vz);
            }
        });

        // Continuous 3D Dentil Band running the entire length of the Washington St (+X) & SW Front Pavilion (-X, lz > 7.25m) Entablature Frieze
        for (let dz = -16.5; dz <= frontWingZ - 0.1; dz += 0.24) {
            const isPavilionZ = dz > 7.25 || dz < -11.15;
            const dentilOutX = isPavilionZ ? washX + 0.46 : washX + 0.12;
            addBox(0.14, 0.13, 0.11, trimMat, dentilOutX, 8.15, dz);
            if (dz > 7.25) {
                addBox(0.14, 0.13, 0.11, trimMat, -3.34, 8.15, dz);
            }
        }

        // Smooth Weathered Concrete/Stucco Cladding on the SW Central Wall (lx = -2.86m, lz = -11.20m..+7.30m, y = -3.60m..+8.85m, 3fb3243e.jpg & 0885db8a.jpg)
        addBox(0.14, 12.45, 18.52, weatheredStuccoMat, -2.84, 2.625, -1.95);
        addBox(0.22, 0.10, 18.56, trimMat, -2.86, 8.88, -1.95); // Clean flat concrete parapet cap along SW Central Wall

        // 8 Monumental Round-Arched Windows along Washington St (+X side, seen in af89d0d1.jpg, 34ff729c.jpg & adc547e2.jpg):
        // 1 on Front Pavilion (with solid molded pedestal balcony), 6 on Central Indented Bay (with recessed brick spandrels), 1 on Rear Pavilion
        addMonumentalArchedWindow(washX + 0.36, 2.55, 10.72, 1, true);
        [5.3, 2.2, -0.9, -4.0, -7.1, -10.0].forEach((wz) => {
            addMonumentalArchedWindow(washX, 2.55, wz, 1, false);
        });
        addMonumentalArchedWindow(washX + 0.36, 2.55, -13.92, 1, true);

        // 6 Monumental Round-Arched Windows along SW Parking Lot Side (-X side, seen in 3fb3243e.jpg, 0885db8a.jpg & 6aac1e2a.jpg):
        // 1 on SW Brick Front Pavilion (lx = -3.24m, lz = +10.72m, with solid molded pedestal balcony) +
        // 5 mounted on the outer face of the smooth weathered concrete/stucco SW Central Wall (lx = -2.91m) with flat concrete sills & lower basement windows!
        addMonumentalArchedWindow(-3.24, 2.55, 10.72, -1, true, false);
        [4.8, 1.2, -2.4, -6.0, -9.6].forEach((wz) => {
            addMonumentalArchedWindow(-2.91, 2.55, wz, -1, false, false);
            // Recessed square basement window directly below each arched window in the SW gravel lightwell (0885db8a.jpg & 3fb3243e.jpg)
            addBox(0.16, 1.05, 1.22, whiteCurbMat, -2.93, -0.52, wz);
            addBox(0.20, 0.88, 1.04, glassMat, -2.96, -0.52, wz);
            addBox(0.24, 0.10, 1.32, trimMat, -2.97, -1.08, wz); // Projecting stone sill
        });

        // =========================================================================
        // THE TALL SMOOTH-STUCCO REAR BOX ("the box behind 400") & REAR GABLE WALL
        // Moved 1.0m further toward the SW parking area (lx = -5.35m..-0.35m)
        // Matched directly to 0885db8a.jpg, 6aac1e2a.jpg, ef31cc76.jpg & 3fb3243e.jpg
        // =========================================================================
        // 1. Tall Smooth Off-White/Cream Stucco Rear Box (Stair/Mechanical Tower: lx = -5.35m..+4.50m at rear, matching the exact A-Frame roof height y = 10.18m!)
        const rearRoofTopY = 8.42 + 1.76; // 10.18m — exact height of the lifted A-Frame roof ridge
        const rearBoxW = 5.00;
        const rearBoxD = 5.48;
        const rearBoxX = -2.85; // -5.35m to -0.35m (shifted 1.0m toward SW parking area)
        const rearBoxZ = -13.92; // -16.66m to -11.18m
        const rearBoxH = rearRoofTopY - (-3.60); // 13.78m (-3.60m to +10.18m)
        const rearBoxCenterY = (-3.60 + rearRoofTopY) * 0.5; // 3.29m
        addBox(rearBoxW, rearBoxH, rearBoxD, rearBoxStuccoMat, rearBoxX, rearBoxCenterY, rearBoxZ);
        // Dark sheet-metal roof flashing cap crowning the Rear Box flush with the A-Frame roof height (y = 10.18m)
        addBox(rearBoxW + 0.10, 0.08, rearBoxD + 0.10, darkMetalMat, rearBoxX, rearRoofTopY - 0.02, rearBoxZ);
        addBox(rearBoxW - 0.20, 0.06, rearBoxD - 0.20, whiteRoofMat, rearBoxX, rearRoofTopY + 0.01, rearBoxZ);

        // 2. Front (+Z, lz = -11.18m) Step-Out Face of the Rear Box facing the SW Sunken Gravel Lightwell (Photo 1: 0885db8a.jpg)
        //    - Sunken white basement service door at bottom of gravel trench (lx = -3.55m, y = -2.15m..0.0m)
        addBox(0.98, 2.12, 0.10, whiteCurbMat, -3.55, -1.06, -11.14);
        addBox(0.88, 2.02, 0.12, new THREE.MeshStandardMaterial({ color: '#e5e2d9', roughness: 0.7 }), -3.55, -1.06, -11.13);
        addBox(0.08, 0.05, 0.16, darkMetalMat, -3.22, -1.05, -11.11); // Black door lever handle
        //    - Square off-white panel cover above the basement door (lx = -3.65m, y = 2.85m, 0885db8a.jpg)
        addBox(1.02, 1.08, 0.06, whiteCurbMat, -3.65, 2.85, -11.15);
        //    - Two tall vertical galvanized steel conduit pipes climbing the +Z face up to the roof + horizontal conduit bends (0885db8a.jpg)
        addBox(0.055, 10.8, 0.055, galvSteelMat, -5.05, 5.20, -11.13);
        addBox(0.065, 6.8, 0.065, galvSteelMat, -3.02, 7.15, -11.13);
        addBox(1.10, 0.04, 0.04, galvSteelMat, -4.05, 1.55, -11.13);
        //    - Triangular galvanized sheet-metal collector hood / scupper box at the top inner corner (lx = -2.98m, y = 8.92m, 0885db8a.jpg & 3fb3243e.jpg)
        const scupperHood = addBox(0.55, 0.32, 0.45, galvSteelMat, -2.98, 8.92, -11.08);
        scupperHood.rotation.z = -0.22;
        addBox(0.05, 1.85, 0.05, galvSteelMat, -2.96, 9.85, -11.12); // Rooftop vent mast above scupper

        //    - Sunken Gravel Lightwell Trench Floor (lx = -4.25m..-2.86m, lz = -11.20m..+7.30m) + Natural River Boulder (0885db8a.jpg!)
        const gravelMat = new THREE.MeshStandardMaterial({ color: '#6e685c', roughness: 0.96, metalness: 0.02 });
        addBox(1.42, 0.16, 18.50, gravelMat, -3.55, -2.18, -1.95, arch, false);
        addBox(0.30, 2.25, 18.50, plinthConcreteMat, -4.25, -1.08, -1.95, arch, false); // Outer lightwell retaining wall under guardrail
        const boulderGeo = new THREE.DodecahedronGeometry(0.46, 2);
        boulderGeo.scale(0.95, 0.68, 1.45);
        const boulderMesh = new THREE.Mesh(
            boulderGeo,
            new THREE.MeshStandardMaterial({ color: '#847e70', roughness: 0.92, metalness: 0.02 })
        );
        boulderMesh.position.set(-3.88, -1.92, -6.35);
        boulderMesh.rotation.y = 0.25;
        boulderMesh.receiveShadow = true;
        boulderMesh.castShadow = true;
        arch.add(boulderMesh);

        // 3. SW (-X, lx = -5.35m) Face of the Rear Box & Black Chain-Link Fenced Utility Enclosure (Photo 2: 6aac1e2a.jpg)
        //    - Two upper side windows near the rear of the SW face (lz = -15.6m & -14.3m, y = 6.6m..8.0m, 6aac1e2a.jpg)
        [-15.65, -14.35].forEach((wz) => {
            addBox(0.12, 1.42, 0.96, whiteCurbMat, -5.38, 7.30, wz);
            addBox(0.16, 1.26, 0.82, glassMat, -5.42, 7.30, wz);
            addBox(0.20, 0.08, 1.04, trimMat, -5.43, 6.56, wz);
        });
        //    - Concrete pad + Tall White Double-Door Switchgear Cabinet + Olive-Green Transformer Box inside Black Chain-Link Fence (6aac1e2a.jpg & 0885db8a.jpg)
        const utilPadY = getConcreteTopY(-6.6, -12.6);
        addBox(2.45, 0.24, 4.10, plinthConcreteMat, -6.58, utilPadY + 0.12, -12.65);
        // White double-door metal utility cabinet against Rear Box wall
        addBox(0.82, 2.05, 1.75, new THREE.MeshStandardMaterial({ color: '#e4e8ec', roughness: 0.5, metalness: 0.3 }), -5.82, utilPadY + 1.24, -13.35);
        // Olive-green pad-mounted electrical transformer box in foreground of enclosure
        const greenBoxMat = new THREE.MeshStandardMaterial({ color: '#4d5940', roughness: 0.65, metalness: 0.25 });
        addBox(1.12, 1.52, 1.38, greenBoxMat, -6.75, utilPadY + 0.98, -11.65);
        // Black chain-link fence posts, top/bottom rails & semi-transparent wire mesh panels around [-7.75m..-5.35m, -14.65m..-10.65m]
        const chainMeshMat = new THREE.MeshStandardMaterial({
            color: '#22262a',
            roughness: 0.5,
            metalness: 0.6,
            transparent: true,
            opacity: 0.38,
            side: THREE.DoubleSide
        });
        const fH = 1.95;
        const fY = utilPadY + 0.20 + fH * 0.5;
        // Front (+Z), Outer (-X), and Rear (-Z) chain-link fence panels & rails
        addBox(2.40, fH, 0.02, chainMeshMat, -6.55, fY, -10.65, arch, false);
        addBox(0.02, fH, 4.00, chainMeshMat, -7.75, fY, -12.65, arch, false);
        addBox(2.40, fH, 0.02, chainMeshMat, -6.55, fY, -14.65, arch, false);
        [utilPadY + 0.22, utilPadY + 0.20 + fH].forEach((ry) => {
            addBox(2.42, 0.04, 0.04, darkMetalMat, -6.55, ry, -10.65);
            addBox(0.04, 0.04, 4.02, darkMetalMat, -7.75, ry, -12.65);
            addBox(2.42, 0.04, 0.04, darkMetalMat, -6.55, ry, -14.65);
        });
        [
            [-5.40, -10.65],
            [-6.55, -10.65],
            [-7.75, -10.65],
            [-7.75, -12.65],
            [-7.75, -14.65],
            [-5.40, -14.65]
        ].forEach(([px, pz]) => {
            addBox(0.055, fH + 0.12, 0.055, darkMetalMat, px, fY, pz);
        });

        // 4. Back (-Z, lz = -16.64m) Wall of the Rear Box & Smooth Stucco Pitched-Gable Rear Wall (Photo 3: ef31cc76.jpg)
        //    - Smooth gray-cream painted concrete/stucco cladding across lx = -0.35m..+11.20m (up to the pitched A-frame gable!)
        addBox(11.55, 12.25, 0.18, weatheredStuccoMat, 5.425, 2.525, -16.62);
        //    - Two Upper Square Blue-Reflective Windows on the Rear Box back wall (lx = -4.45m & -2.55m, y = 6.55m..8.15m, ef31cc76.jpg)
        const blueReflGlassMat = new THREE.MeshStandardMaterial({
            color: '#3b6e8c',
            roughness: 0.15,
            metalness: 0.45,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
        [-4.45, -2.55].forEach((wx) => {
            addBox(1.36, 1.58, 0.12, whiteCurbMat, wx, 7.35, -16.69);
            addBox(1.24, 1.44, 0.16, blueReflGlassMat, wx, 7.35, -16.73);
            addBox(1.42, 0.10, 0.22, trimMat, wx, 6.54, -16.75); // Window sill
        });
        //    - Large Projecting Cylindrical Galvanized Exhaust Fan Housing below the right upper window (lx = -4.45m, y = 5.15m, ef31cc76.jpg!)
        const fanDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.50, 0.50, 0.58, 24), galvSteelMat);
        fanDrum.rotation.x = Math.PI * 0.5;
        fanDrum.position.set(-4.45, 5.18, -16.96);
        fanDrum.castShadow = true;
        arch.add(fanDrum);
        const fanCap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.48, 0.16, 24), galvSteelMat);
        fanCap.rotation.x = Math.PI * 0.5;
        fanCap.position.set(-4.45, 5.18, -17.30);
        arch.add(fanCap);
        //    - Painted-Over Blind Window Panels on Rear Box & Gable Wall (ef31cc76.jpg)
        [-4.45, -2.55].forEach((wx) => {
            addBox(1.32, 1.48, 0.08, rearBoxStuccoMat, wx, 3.35, -16.72);
            addBox(1.38, 0.08, 0.12, whiteCurbMat, wx, 2.60, -16.74);
        });
        [3.15, 5.45].forEach((wx) => {
            addBox(1.32, 1.42, 0.08, rearBoxStuccoMat, wx, 6.35, -16.73); // Upper blind panels
            addBox(1.38, 0.08, 0.12, trimMat, wx, 5.62, -16.75);
            addBox(1.32, 1.48, 0.08, rearBoxStuccoMat, wx, 3.35, -16.73); // Mid blind panels
            addBox(1.38, 0.08, 0.12, trimMat, wx, 2.60, -16.75);
            addBox(0.92, 1.05, 0.08, rearBoxStuccoMat, wx, 1.10, -16.73); // Lower small blind panels
            addBox(0.98, 0.08, 0.12, trimMat, wx, 0.56, -16.75);
        });
        //    - Bottom White Louvered Intake Vent Grille + Two White Pipe Guard Bollards with Crossbar + 4 Conduit Boxes (ef31cc76.jpg!)
        addBox(0.96, 1.32, 0.08, whiteCurbMat, -2.45, 0.92, -16.68);
        for (let ly = 0.36; ly <= 1.48; ly += 0.14) {
            addBox(0.84, 0.04, 0.10, darkMetalMat, -2.45, ly, -16.69);
        }
        // Two white steel bollard posts & crossbar in front of the louver vent
        [-2.82, -2.12].forEach((bx) => {
            const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.15, 12), whiteCurbMat);
            bollard.position.set(bx, 0.55, -17.02);
            arch.add(bollard);
        });
        addBox(0.74, 0.06, 0.06, whiteCurbMat, -2.47, 0.85, -17.02);
        // Tilted white access cover + 4 small gray electrical boxes to the right of the louver vent
        const tiltedHatch = addBox(0.56, 0.42, 0.06, whiteCurbMat, -3.55, 0.42, -16.68);
        tiltedHatch.rotation.z = -0.22;
        [-4.05, -4.28, -4.50, -4.72].forEach((bx) => {
            addBox(0.16, 0.42, 0.10, galvSteelMat, bx, 0.28, -16.69);
        });

        // 5. Tall Dark-Brown Creosote Wooden Utility Pole at the SW Rear Corner of the Rear Box (lx = -5.52m, lz = -16.82m, 6aac1e2a.jpg & ef31cc76.jpg)
        const woodPoleMat = new THREE.MeshStandardMaterial({ color: '#3d2b1f', roughness: 0.90, metalness: 0.02 });
        const utilPole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 11.4, 14), woodPoleMat);
        utilPole.position.set(-5.52, 5.50, -16.82);
        utilPole.castShadow = true;
        arch.add(utilPole);
        // Galvanized conduit riser guard along lower half of pole
        const poleRiser = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 4.8, 10), galvSteelMat);
        poleRiser.position.set(-5.42, 2.20, -16.92);
        arch.add(poleRiser);

        // --- D. WHITE ROOF ROOM (PENTHOUSE MONITOR WITH PARAPET FRAME), SOLID 3D CENTRAL A-FRAME ROOF, 5 CUPOLAS & HVAC UNITS ---
        // Matched to aerial roof photos b7570195.jpg, 048e987a.jpg, b2658f18.jpg, 21ab28c0.jpg & adc547e2.jpg:
        const roofBaseY = 8.42;

        // 1. Raised White Rectangular Rooftop Room (Penthouse Monitor) over the Front Pavilion (lz = +7.30m to wallZ - 1.15m = +13.47m)
        //    Directly adjoins the raised cream-brick attic parapet wall behind the portico pediment, and has its own raised
        //    perimeter parapet curb frame + internal sloped drainage cricket (048e987a.jpg & b7570195.jpg)!
        const pentRoomX = 4.25;
        const pentRoomZ = 10.42;
        const pentRoomW = 9.20;
        const pentRoomD = 6.25;
        const pentRoomH = 1.48;
        // Main smooth white walls & recessed tan/buff flat roof deck of the rooftop room
        addBox(pentRoomW, pentRoomH, pentRoomD, whiteCurbMat, pentRoomX, roofBaseY + pentRoomH * 0.5, pentRoomZ);
        addBox(pentRoomW - 0.48, 0.08, pentRoomD - 0.48, plinthConcreteMat, pentRoomX, roofBaseY + pentRoomH + 0.02, pentRoomZ);
        // Subtle sloped drainage cricket ridge inside the rooftop room deck (visible in 048e987a.jpg & b7570195.jpg)
        const cricketSlab = addBox(pentRoomW - 0.65, 0.09, pentRoomD * 0.46, whiteCurbMat, pentRoomX, roofBaseY + pentRoomH + 0.08, pentRoomZ + 1.2);
        cricketSlab.rotation.x = -0.04;
        // Raised perimeter parapet wall frame & metal coping crowning the rooftop room (048e987a.jpg & b7570195.jpg)
        const frameT = 0.26;
        const frameH = 0.36;
        const frameY = roofBaseY + pentRoomH + frameH * 0.5;
        addBox(pentRoomW + 0.12, frameH, frameT, whiteCurbMat, pentRoomX, frameY, pentRoomZ + pentRoomD * 0.5 - frameT * 0.5);
        addBox(pentRoomW + 0.12, frameH, frameT, whiteCurbMat, pentRoomX, frameY, pentRoomZ - pentRoomD * 0.5 + frameT * 0.5);
        addBox(frameT, frameH, pentRoomD, whiteCurbMat, pentRoomX - pentRoomW * 0.5 + frameT * 0.5, frameY, pentRoomZ);
        addBox(frameT, frameH, pentRoomD, whiteCurbMat, pentRoomX + pentRoomW * 0.5 - frameT * 0.5, frameY, pentRoomZ);
        // Sheet-metal cap flashing on top of the rooftop room's parapet frame
        addBox(pentRoomW + 0.22, 0.06, frameT + 0.08, whiteRoofMat, pentRoomX, frameY + frameH * 0.5 + 0.02, pentRoomZ + pentRoomD * 0.5 - frameT * 0.5);
        addBox(pentRoomW + 0.22, 0.06, frameT + 0.08, whiteRoofMat, pentRoomX, frameY + frameH * 0.5 + 0.02, pentRoomZ - pentRoomD * 0.5 + frameT * 0.5);
        addBox(frameT + 0.08, 0.06, pentRoomD + 0.12, whiteRoofMat, pentRoomX - pentRoomW * 0.5 + frameT * 0.5, frameY + frameH * 0.5 + 0.02, pentRoomZ);
        addBox(frameT + 0.08, 0.06, pentRoomD + 0.12, whiteRoofMat, pentRoomX + pentRoomW * 0.5 - frameT * 0.5, frameY + frameH * 0.5 + 0.02, pentRoomZ);

        // 2. Solid 3D Extruded Central White Pitched A-Frame Roof Structure behind the Penthouse Room (lifted +1 foot / +0.31m up):
        //    - Has a vertical perimeter curb wall (aFrameEaveH = 0.67m) rising to a pitched A-frame gable peak (aFramePeakH = 1.76m -> y = 10.18m)
        //    - Meets the Rear Box at the exact same roof height (y = 10.18m)!
        const aFrameHalfW = 5.45;
        const aFrameEaveH = 0.67;
        const aFramePeakH = 1.76;
        const aFrameLen = 23.99; // from lz = -16.64m (rear gable wall in ef31cc76.jpg) to lz = +7.35m
        const aFrameZ0 = -16.64;
        const aFrameShape = new THREE.Shape();
        aFrameShape.moveTo(-aFrameHalfW, 0);
        aFrameShape.lineTo(aFrameHalfW, 0);
        aFrameShape.lineTo(aFrameHalfW, aFrameEaveH);
        aFrameShape.lineTo(0, aFramePeakH);
        aFrameShape.lineTo(-aFrameHalfW, aFrameEaveH);
        aFrameShape.closePath();

        const aFrameGeo = new THREE.ExtrudeGeometry(aFrameShape, {
            depth: aFrameLen,
            bevelEnabled: false
        });
        const aFrameMesh = new THREE.Mesh(aFrameGeo, [weatheredStuccoMat, whiteRoofMat]);
        aFrameMesh.position.set(4.50, roofBaseY, aFrameZ0);
        aFrameMesh.castShadow = true;
        aFrameMesh.receiveShadow = true;
        arch.add(aFrameMesh);

        // Raised raking gable-end parapet trim along the rear A-frame triangle (lz = -16.64m, seen in ef31cc76.jpg!)
        const aSlopeLen = Math.hypot(aFrameHalfW, aFramePeakH - aFrameEaveH) + 0.12;
        const aSlopeAng = Math.atan2(aFramePeakH - aFrameEaveH, aFrameHalfW);
        [-1, 1].forEach((dir) => {
            const rakeTrim = addBox(
                aSlopeLen,
                0.14,
                0.26,
                trimMat,
                4.50 + dir * aFrameHalfW * 0.5,
                roofBaseY + (aFrameEaveH + aFramePeakH) * 0.5 + 0.04,
                aFrameZ0 + 0.06
            );
            rakeTrim.rotation.z = -dir * aSlopeAng;
        });
        // Central ridge cap running along the apex of the white A-frame roof (b7570195.jpg)
        addBox(0.38, 0.10, aFrameLen + 0.1, whiteCurbMat, 4.50, roofBaseY + aFramePeakH + 0.03, aFrameZ0 + aFrameLen * 0.5);

        // 3. 5 White Square Cupola Vents with Gray Pyramidal Hip Caps (b7570195.jpg, 048e987a.jpg & adc547e2.jpg)
        const addRoofCupola = (cxPos, cyPos, czPos, size = 0.82, h = 0.92) => {
            addBox(size, h, size, whiteCurbMat, cxPos, cyPos + h * 0.5, czPos);
            const cap = new THREE.Mesh(new THREE.ConeGeometry(size * 0.84, 0.36, 4), galvSteelMat);
            cap.rotation.y = Math.PI * 0.25;
            cap.position.set(cxPos, cyPos + h + 0.18, czPos);
            arch.add(cap);
        };
        // Cupola 1 perched right on the rear-right corner of the raised Penthouse Room parapet (048e987a.jpg & b7570195.jpg!)
        addRoofCupola(8.35, roofBaseY + pentRoomH + 0.12, 7.55, 0.88, 0.98);
        // Cupolas 2 & 3 along the NE (Washington St) lifted A-frame roof eave (b2658f18.jpg & adc547e2.jpg)
        addRoofCupola(9.55, roofBaseY + aFrameEaveH, 1.8, 0.78, 0.88);
        addRoofCupola(9.55, roofBaseY + aFrameEaveH, -7.8, 0.78, 0.88);
        // Cupolas 4 & 5 along the SW (parking lot) lifted A-frame roof eave (b7570195.jpg)
        addRoofCupola(-0.55, roofBaseY + aFrameEaveH, 1.8, 0.78, 0.88);
        addRoofCupola(-0.55, roofBaseY + aFrameEaveH, -7.8, 0.78, 0.88);

        // 4. Rooftop AC Condenser & Twin-Fan Package HVAC Units + Electrical Disconnect Boxes (b7570195.jpg & b2658f18.jpg)
        const hvacMat = new THREE.MeshStandardMaterial({ color: '#8a857e', roughness: 0.55, metalness: 0.35 });
        // Unit 1: Dark louvered square AC condenser right beside the Penthouse Room corner (lz = +6.55m, 048e987a.jpg)
        addBox(1.10, 0.10, 1.10, plinthConcreteMat, 10.2, roofBaseY + 0.05, 6.55);
        addBox(0.88, 0.92, 0.88, darkMetalMat, 10.2, roofBaseY + 0.51, 6.55);
        addBox(0.22, 0.42, 0.16, whiteCurbMat, 8.68, roofBaseY + 0.85, 7.25); // Wall-mounted electrical disconnect box

        // Unit 2: Mid-roof square AC condenser + white electrical disconnect post (lz = -1.6m, b2658f18.jpg)
        addBox(1.05, 0.10, 1.05, plinthConcreteMat, 10.3, roofBaseY + 0.05, -1.6);
        addBox(0.85, 0.88, 0.85, darkMetalMat, 10.3, roofBaseY + 0.49, -1.6);
        addBox(0.20, 0.55, 0.16, whiteCurbMat, 9.75, roofBaseY + 0.72, -1.1);

        // Unit 3: Large twin-fan packaged HVAC unit with 2 circular top fan grilles & dark side louvers (lz = -5.2m, b2658f18.jpg)
        addBox(1.45, 0.96, 2.35, hvacMat, 10.45, roofBaseY + 0.48, -5.2);
        addBox(1.48, 0.72, 1.10, darkMetalMat, 10.45, roofBaseY + 0.46, -5.75); // Dark condenser coil grille half
        [-4.65, -5.70].forEach((fz) => {
            const fanRing = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 18), darkMetalMat);
            fanRing.position.set(10.45, roofBaseY + 0.97, fz);
            arch.add(fanRing);
        });

        // Unit 4: Tall dark-gray vertical HVAC cabinet near rear parapet (lz = -9.8m, 21ab28c0.jpg)
        addBox(0.92, 1.18, 1.25, darkMetalMat, 9.65, roofBaseY + 0.59, -9.8);

        // Background SW eave HVAC units visible in b7570195.jpg
        addBox(0.90, 0.85, 0.90, hvacMat, -0.55, roofBaseY + 0.45, -2.2);
        addBox(1.30, 0.88, 2.10, hvacMat, -0.55, roofBaseY + 0.46, -5.4);
}