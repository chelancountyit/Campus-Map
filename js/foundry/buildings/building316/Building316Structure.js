import * as THREE from 'three';

export function buildBuilding316Structure(ctx) {
    const {
        foundry, group, building, shape, storyH, bldgLift316, arch, addBox,
        getDouglasLocalGroundY, addContouredDouglasStrip, addRibbonWindow,
        frontZ, douglasX, courtX, rearZ,
        tanPrecastMat, darkSpandrelMat, basementConcreteMat, whiteTrimMat, grayCoreStuccoMat,
        roofMembraneMat, penthouseWallMat, copperLouverMat, copperFrameMat, silverLouverMat,
        entryBrickMat, officeGlassMat, darkBronzeMat, yellowDoorMat, galvSteelMat
    } = ctx;

        // Sub-footing plinth (-6.5m to -4.15m)
        const footingGeo = new THREE.ExtrudeGeometry(shape, { depth: 2.35, bevelEnabled: false });
        footingGeo.rotateX(-Math.PI / 2);
        const footingMesh = new THREE.Mesh(footingGeo, basementConcreteMat);
        footingMesh.position.y = -6.5 + bldgLift316;
        group.add(footingMesh);

        // Floor 1: Basement below Washington St road grade (-4.2m to 0.0m)
        const bsmtGeo = new THREE.ExtrudeGeometry(shape, { depth: storyH, bevelEnabled: false });
        bsmtGeo.rotateX(-Math.PI / 2);
        const bsmtMesh = new THREE.Mesh(bsmtGeo, basementConcreteMat);
        bsmtMesh.name = 'Layer1_Basement_BelowRoad';
        bsmtMesh.position.y = -storyH + bldgLift316;
        bsmtMesh.castShadow = true;
        bsmtMesh.receiveShadow = true;
        bsmtMesh.userData = { isSelectableBuilding: true, building, floorLayer: 1 };
        group.add(bsmtMesh);

        // Levels 2, 3 & 4 Clerestory Base Precast Concrete Body (y = 0.0m to +9.85m across all 8 walls of the footprint)
        const mainBodyGeo = new THREE.ExtrudeGeometry(shape, { depth: 9.85, bevelEnabled: false });
        mainBodyGeo.rotateX(-Math.PI / 2);
        foundry._applyArchitecturalUVs(mainBodyGeo, 9.85, 2.35);
        const mainBodyMesh = new THREE.Mesh(mainBodyGeo, [roofMembraneMat, tanPrecastMat]);
        mainBodyMesh.name = 'Layer2_3_4_MainPrecastBody';
        mainBodyMesh.position.y = bldgLift316;
        mainBodyMesh.castShadow = true;
        mainBodyMesh.receiveShadow = true;
        mainBodyMesh.userData = { isSelectableBuilding: true, building, floorLayer: 2 };
        group.add(mainBodyMesh);

        // Darker khaki-taupe architectural spandrel bands wrapping all 8 walls of the footprint
        const addFootprintBand = (yStart, bandH, overhang, mat) => {
            const bGeo = new THREE.ExtrudeGeometry(shape, {
                depth: bandH,
                bevelEnabled: true,
                bevelThickness: 0.03,
                bevelSize: overhang,
                bevelSegments: 1
            });
            bGeo.rotateX(-Math.PI / 2);
            const bMesh = new THREE.Mesh(bGeo, mat);
            bMesh.position.y = yStart + bldgLift316;
            bMesh.castShadow = true;
            bMesh.receiveShadow = true;
            group.add(bMesh);
        };
        // Base water-table band (y = 0.0m..0.72m in building local space, lifted by bldgLift316)
        addFootprintBand(0.0, 0.72, 0.05, darkSpandrelMat);
        // Darker khaki spandrel band between Level 2 canopy and Level 3 sill (y = 3.35m..4.32m)
        addFootprintBand(3.35, 0.97, 0.04, darkSpandrelMat);
        // Subtle recessed reveal band at Level 3 window sill (y = 4.92m..5.05m) & head (y = 6.55m..6.68m)
        addFootprintBand(4.92, 0.12, 0.06, darkSpandrelMat);
        addFootprintBand(6.55, 0.12, 0.06, darkSpandrelMat);
        // Crisp white 4th-floor clerestory sill / belt cornice at y = 8.32m..8.50m around all 8 walls
        addFootprintBand(8.32, 0.18, 0.16, whiteTrimMat);
        // Crisp white 4th-floor clerestory head / louver base cornice at y = 9.76m..9.90m around all 8 walls
        addFootprintBand(9.76, 0.14, 0.16, whiteTrimMat);
        // Top copper/terracotta parapet coping cap at y = 12.56m..12.68m around all 8 walls
        addFootprintBand(12.56, 0.12, 0.14, copperFrameMat);

        // =========================================================================
        // A. LEVEL 2 (WASHINGTON ST LEVEL: y = 0.0m..3.35m)
        // =========================================================================
        // 1. East-Corner Tan-Brown Running-Bond Brick Veneer Entry Pier (lx: -11.12m..-7.45m, lz = +25.42m)
        addBox(3.68, 3.32, 0.24, entryBrickMat, -9.28, 1.66, frontZ + 0.04);
        // Brick wrap along SE courtyard corner (lz: +18.20m..+25.42m — full length of front core bay as seen in 5e51fcab.jpg!)
        addBox(0.24, 3.32, 7.26, entryBrickMat, courtX - 0.04, 1.66, 21.81);
        // Small warm wall-pack light mounted near top of the brick corner on the SE courtyard side (lz = +23.8m, y = 3.02m, 5e51fcab.jpg!)
        addBox(0.14, 0.16, 0.24, copperFrameMat, courtX - 0.16, 3.02, 23.80);

        // "316 / WASHINGTON STREET" Raised Silver Lettering Plaque on Brick Pier (Photo 1)
        const addrTex = foundry._createTextPlaqueTexture(
            ['316', 'WASHINGTON STREET'],
            '#a2775b',
            '#f2f4f7',
            512,
            160
        );
        const addrMat = new THREE.MeshStandardMaterial({ map: addrTex, roughness: 0.45, metalness: 0.35 });
        addBox(2.35, 0.58, 0.05, addrMat, -9.28, 2.68, frontZ + 0.17, false);

        // Dark Bronze/Black Directory Sign Box below "316 WASHINGTON STREET" (Photo 1)
        addBox(1.68, 0.88, 0.10, darkBronzeMat, -9.28, 1.65, frontZ + 0.18);
        addBox(1.52, 0.72, 0.03, officeGlassMat, -9.28, 1.65, frontZ + 0.23, false);

        // 2. Recessed White-Framed Aluminum Storefront Entry & Open Double Glass Doors (lx: -7.45m..-3.65m)
        const entryCenterX = -5.55;
        const entryW = 3.80;
        const entryH = 3.15;
        // Recessed vestibule backdrop
        addBox(entryW, entryH, 0.35, officeGlassMat, entryCenterX, entryH * 0.5 + 0.05, frontZ - 0.12);
        // White storefront frame grid (sidelights + transom + center double-door frame)
        addBox(entryW + 0.10, 0.09, 0.18, whiteTrimMat, entryCenterX, entryH + 0.04, frontZ + 0.04);
        addBox(entryW + 0.10, 0.07, 0.18, whiteTrimMat, entryCenterX, 2.28, frontZ + 0.04); // Transom bar
        addBox(0.95, 0.06, 0.16, whiteTrimMat, entryCenterX - 1.42, 0.95, frontZ + 0.04); // Left sidelight mid-rail
        addBox(0.95, 0.06, 0.16, whiteTrimMat, entryCenterX + 1.42, 0.95, frontZ + 0.04); // Right sidelight mid-rail
        [-1.90, -0.95, 0.0, 0.95, 1.90].forEach((dx) => {
            // Skip center mullion inside door opening below transom except thin door stile
            const h = Math.abs(dx) < 0.05 ? entryH - 2.28 : entryH;
            const yPos = Math.abs(dx) < 0.05 ? 2.28 + h * 0.5 : entryH * 0.5 + 0.04;
            addBox(0.07, h, 0.18, whiteTrimMat, entryCenterX + dx, yPos, frontZ + 0.04);
        });
        // Closed Left Door Leaf + Open Right Glass Door Leaf (swung outward at ~55 deg as seen in Photo 1!)
        addBox(0.90, 2.22, 0.05, whiteTrimMat, entryCenterX - 0.48, 1.15, frontZ + 0.02);
        addBox(0.76, 2.02, 0.06, officeGlassMat, entryCenterX - 0.48, 1.15, frontZ + 0.02);
        const openDoorGrp = new THREE.Group();
        openDoorGrp.position.set(entryCenterX + 0.92, 1.15, frontZ + 0.05);
        openDoorGrp.rotation.y = -0.95; // Swung outward toward entry walk
        const doorFrameMesh = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.22, 0.05), whiteTrimMat);
        doorFrameMesh.position.set(-0.46, 0, 0);
        openDoorGrp.add(doorFrameMesh);
        const doorGlassMesh = new THREE.Mesh(new THREE.BoxGeometry(0.76, 2.02, 0.06), officeGlassMat);
        doorGlassMesh.position.set(-0.46, 0, 0);
        openDoorGrp.add(doorGlassMesh);
        arch.add(openDoorGrp);

        // Bronze Historical Plaque + Security Intercom on Precast Pillar to the Right of Entry Doors (lx = -3.15m, Photo 1)
        addBox(0.42, 0.52, 0.05, copperFrameMat, -3.15, 1.48, frontZ + 0.06);
        addBox(0.18, 0.24, 0.04, darkBronzeMat, -3.15, 2.02, frontZ + 0.06);

        // 3. Level 2 Horizontal 5-Bay Ribbon Windows on NE Washington St Facade (Photo 1)
        addRibbonWindow({ pos: frontZ, nz: 1 }, -0.20, 0.78, 4.75, 2.05, 5, true);
        addRibbonWindow({ pos: frontZ, nz: 1 }, 5.00, 0.78, 4.75, 2.05, 5, true);

        // 4. Level 2 Horizontal Ribbon Windows along NW Douglas St (stepped/contoured above the sloped Douglas St water-table plinth!), SE Courtyard & SW Rear Facades
        addContouredDouglasStrip(douglasX - 0.04, douglasX + 0.06, -6.05, 25.40, 0.72, 0.0, darkSpandrelMat, 36, 11.375, arch);
        [
            [20.6, 5.60, 5],
            [12.8, 5.60, 5],
            [4.8, 5.20, 5],
            [-2.2, 4.20, 4]
        ].forEach(([wz, ww, wbays]) => {
            const localGround = getDouglasLocalGroundY(11.375, wz);
            const winYBot = Math.min(1.68, 0.78 + localGround * 0.52);
            const winH = Math.max(1.35, 2.83 - winYBot);
            addRibbonWindow({ pos: douglasX, nx: 1 }, wz, winYBot, ww, winH, wbays, true);
        });

        // SE Courtyard Facade Level 2 Windows & Panels (lx = -11.10m, matched to 5e51fcab.jpg!):
        // Front bay (lz = 18.2m..25.4m) is solid running-bond brick; behind it at lz = 13.8m is a 2-pane glass window,
        // and at lz = 9.8m & lz = 7.8m are two narrower vertical punched windows, followed by rear ribbon windows.
        addRibbonWindow({ pos: courtX, nx: -1 }, 13.8, 0.78, 2.20, 2.05, 2, true);
        addRibbonWindow({ pos: courtX, nx: -1 }, 9.8, 0.98, 0.85, 1.65, 1, false);
        addRibbonWindow({ pos: courtX, nx: -1 }, 7.8, 0.98, 0.85, 1.65, 1, false);
        addRibbonWindow({ pos: courtX, nx: -1 }, 1.2, 0.78, 5.20, 2.05, 5, true);

        // SW Rear Facade Level 2 Window on East Rear Wing (lz = -6.05m, f37b07a4.jpg)
        addRibbonWindow({ pos: rearZ, nz: -1 }, -6.80, 0.78, 3.60, 2.05, 3, true);

        // 5. Continuous Projecting White Overhang Canopy above Level 2 (y = 3.28m, wraps around SE brick bay & SW fire exit corner!)
        // NE Washington St Canopy (lx: -11.85m..+8.75m, projects 0.95m outward)
        addBox(20.60, 0.22, 1.05, whiteTrimMat, -1.55, 3.28, frontZ + 0.48);
        // NW Douglas St Canopy (lz: -6.55m..+26.00m, projects 0.85m outward)
        addBox(0.95, 0.22, 32.55, whiteTrimMat, douglasX + 0.44, 3.28, 9.72);
        // SW Fire Exit Recessed Corner Canopy Return (lx: +4.56m..+8.85m at lz = -6.05m, visible in be709037.jpg, 4aabc7f3.jpg & 3b6e29ad.jpg!)
        addBox(4.30, 0.22, 0.92, whiteTrimMat, 6.71, 3.28, rearZ - 0.42);
        // SE Courtyard Canopy wrapping the front brick bay (lz: +17.90m..+26.00m, projects 0.75m outward over the brick wall, 5e51fcab.jpg!)
        addBox(0.85, 0.22, 8.10, whiteTrimMat, courtX - 0.38, 3.28, 21.95);
        // White-painted fascia band continuing along the SE courtyard wall behind the canopy (lz: -6.05m..+18.00m, y = 3.26m)
        addBox(0.18, 0.20, 24.05, whiteTrimMat, courtX - 0.06, 3.26, 5.98);

        // =========================================================================
        // B. LEVEL 3 (MIDDLE OFFICE STORY: y = 4.20m..8.40m)
        // =========================================================================
        // 1. Three 5-Bay Horizontal Ribbon Windows on NE Washington St Facade (y = 5.05m..6.55m, Photo 1)
        addRibbonWindow({ pos: frontZ, nz: 1 }, -7.25, 5.05, 4.65, 1.50, 5, false);
        addRibbonWindow({ pos: frontZ, nz: 1 }, -1.05, 5.05, 4.65, 1.50, 5, false);
        addRibbonWindow({ pos: frontZ, nz: 1 }, 5.05, 5.05, 4.65, 1.50, 5, false);

        // 2. NW Douglas St Level 3 Ribbon Windows & Punched Windows (Photos 2, 4, 5)
        addRibbonWindow({ pos: douglasX, nx: 1 }, 20.6, 5.05, 5.60, 1.50, 5, false);
        // Two small square punched windows near mid-facade on Douglas St (visible in Photos 2, 4, 5)
        addRibbonWindow({ pos: douglasX, nx: 1 }, 15.2, 5.35, 0.92, 1.15, 1, false);
        addRibbonWindow({ pos: douglasX, nx: 1 }, 13.0, 5.35, 0.92, 1.15, 1, false);
        addRibbonWindow({ pos: douglasX, nx: 1 }, 7.2, 5.05, 5.40, 1.50, 5, false);
        addRibbonWindow({ pos: douglasX, nx: 1 }, -1.5, 5.05, 5.20, 1.50, 5, false);

        // SE Courtyard & SW Rear Level 3 Windows (matched to 5e51fcab.jpg & f37b07a4.jpg)
        addRibbonWindow({ pos: courtX, nx: -1 }, 12.2, 5.05, 5.40, 1.50, 5, false);
        addRibbonWindow({ pos: courtX, nx: -1 }, 3.8, 5.05, 5.40, 1.50, 5, false);
        addRibbonWindow({ pos: courtX, nx: -1 }, -2.8, 5.05, 4.20, 1.50, 4, false);
        addRibbonWindow({ pos: rearZ, nz: -1 }, -7.40, 5.05, 4.80, 1.50, 4, false);

        // 3. Signature White 3D Triangular / Pyramid Architectural Wall Sconces above Level 3 Windows (y = 7.22m, Photos 1, 2, 4, 5 & 5e51fcab.jpg)
        const sconceMat = new THREE.MeshStandardMaterial({
            color: '#f7f8fa',
            emissive: '#fff4d6',
            emissiveIntensity: 0.22,
            roughness: 0.35,
            metalness: 0.1
        });
        // 4 triangular sconces across NE Washington St facade
        [-9.25, -4.05, 1.15, 6.25].forEach((sx) => {
            const sconce = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.56, 3), sconceMat);
            sconce.position.set(sx, 7.22, frontZ + 0.12);
            sconce.rotation.y = Math.PI; // Flat back against +Z wall, triangular prism projecting forward
            sconce.castShadow = true;
            arch.add(sconce);
        });
        // 4 triangular sconces along NW Douglas St facade (Photos 2, 4, 5)
        [23.2, 18.0, 9.8, 1.2].forEach((sz) => {
            const sconce = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.56, 3), sconceMat);
            sconce.position.set(douglasX + 0.12, 7.22, sz);
            sconce.rotation.y = -Math.PI * 0.5;
            sconce.castShadow = true;
            arch.add(sconce);
        });
        // 4 triangular sconces along SE Courtyard facade (front sconce centered on the solid front precast bay at lz = 21.8m as seen in 5e51fcab.jpg!)
        [21.8, 12.2, 3.8, -2.8].forEach((sz) => {
            const sconce = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.56, 3), sconceMat);
            sconce.position.set(courtX - 0.12, 7.22, sz);
            sconce.rotation.y = Math.PI * 0.5;
            sconce.castShadow = true;
            arch.add(sconce);
        });

        // =========================================================================
        // C. LEVEL 4 (CLERESTORY BAND, COPPER LOUVERED SCREEN WALL & SE UPPER WALL: y = 8.40m..12.65m)
        // Matched directly to 5e51fcab.jpg:
        //   On the SE Courtyard facade (lx = -11.10m, facing Building 300):
        //   - Bay 1 (lz = +18.20m..+25.42m): Full-height olive/gray-tan stucco core bay with white vertical panel joints
        //   - Bay 2 (lz = +13.60m..+18.20m): Solid tan stucco panel at clerestory level with 1 single narrow window at lz = +14.60m,
        //     topped by olive/gray-tan stucco panel above (y = 9.88m..12.62m)
        //   - Bays 3 & 4 (lz = +4.40m..+13.60m): Multi-pane white-mullioned clerestory ribbon window (y = 8.48m..9.78m)
        //     topped by 2 framed copper/terracotta horizontal louver bays above (y = 9.88m..12.62m)
        //   - Bay 5 (lz = -6.05m..+4.40m): Solid olive/gray-tan stucco wall with a dark louver grille at the upper rear corner (lz = -4.2m)
        // =========================================================================
        // 1. East-Corner Full-Height Stucco Core Tower Bay (lx: -11.12m..-7.35m, lz: +18.20m..+25.42m, y = 8.40m..12.68m, Photos 1–5 & 5e51fcab.jpg)
        addBox(3.82, 4.28, 7.26, grayCoreStuccoMat, -9.23, 10.54, 21.81);
        // White parapet coping cap on top of the gray core bay
        addBox(3.96, 0.16, 7.40, whiteTrimMat, -9.23, 12.70, 21.81);
        // Crisp white vertical & horizontal panel joint strips on the NE & SE faces of the core bay (Photos 1, 3 & 5e51fcab.jpg!)
        addBox(0.04, 4.26, 0.06, whiteTrimMat, -9.23, 10.525, frontZ + 0.06);
        addBox(3.80, 0.04, 0.06, whiteTrimMat, -9.23, 10.35, frontZ + 0.06);
        [21.80, 18.20, 13.60].forEach((jz) => {
            addBox(0.08, 4.26, 0.04, whiteTrimMat, courtX - 0.04, 10.525, jz);
        });
        // Vertical panel joint scores on the Level 2 & Level 3 SE Courtyard precast wall (aligned with the upper bay joints at lz = 21.8m, 18.2m, 13.6m, 9.0m, 4.4m, 5e51fcab.jpg!)
        [21.80, 18.20, 13.60, 9.00, 4.40].forEach((jz) => {
            addBox(0.06, 4.95, 0.04, darkSpandrelMat, courtX - 0.03, 5.85, jz);
        });

        // 2. Continuous 4th-Floor Clerestory Ribbon Window Band around NE, NW, SE & SW Facades (y = 8.48m..9.78m)
        // NE Washington St Clerestory (from gray core bay lx = -7.34m to North corner lx = +7.91m -> width 15.25m, 15 bays, Photos 1–5)
        addRibbonWindow({ pos: frontZ, nz: 1 }, 0.28, 8.48, 15.20, 1.30, 15, false);
        // NW Douglas St Clerestory (from North corner lz = +25.40m to rear lz = -5.95m -> length 31.35m, 30 bays, Photos 2, 4, 5)
        addRibbonWindow({ pos: douglasX, nx: 1 }, 9.72, 8.48, 31.30, 1.30, 30, false);
        // SE Courtyard Clerestory (matched to 5e51fcab.jpg: single narrow window at lz = +14.65m + 10-bay ribbon window under the 2 copper louver bays at lz = +4.40m..+13.60m!)
        addRibbonWindow({ pos: courtX, nx: -1 }, 14.65, 8.48, 1.05, 1.30, 1, true);
        addRibbonWindow({ pos: courtX, nx: -1 }, 9.00, 8.48, 9.10, 1.30, 10, true);
        // SW Rear Clerestory Windows on main rear walls (lz = -6.05m, f37b07a4.jpg & 9ac82efd.jpg)
        addRibbonWindow({ pos: rearZ, nz: -1 }, -7.38, 8.48, 7.10, 1.30, 7, false);
        addRibbonWindow({ pos: rearZ, nz: -1 }, 6.23, 8.48, 3.10, 1.30, 3, false);

        // 2b. SW Rear Full-Height Olive-Gray Stucco Stairwell Core Tower (lx = -3.66m..+4.56m, lz = -10.29m..-6.05m, y = -0.35m..12.68m)
        // Matched directly to f37b07a4.jpg, be709037.jpg, 9ac82efd.jpg, 3f533fc5.jpg & 3b6e29ad.jpg:
        // Full-height windowless olive-gray stucco core mass with crisp white vertical & horizontal grid joints,
        // triangular pyramid sconces, rear FDC standpipe/drains, and recessed Douglas-facing Fire Exit Door + white hood canopy!
        addBox(8.56, 13.05, 4.44, grayCoreStuccoMat, 0.45, 6.16, -8.17);
        // White parapet coping cap atop the SW Stairwell Core Tower
        addBox(8.70, 0.16, 4.56, whiteTrimMat, 0.45, 12.70, -8.17);
        // Sloped gray concrete base water-table plinth along the rear (-Z) and Douglas (+X) faces of the tower (f37b07a4.jpg & be709037.jpg)
        addBox(8.62, 0.72, 0.16, basementConcreteMat, 0.45, 0.22, -10.36);
        addBox(0.16, 0.65, 2.55, basementConcreteMat, 4.68, 0.20, -9.12);

        // Crisp white horizontal panel joint lines wrapping the SW Stairwell Core Tower (-Z, +X, -X faces) at y = 3.28m, 6.55m, 9.80m
        [3.28, 6.55, 9.80].forEach((jy) => {
            addBox(8.62, 0.045, 0.06, whiteTrimMat, 0.45, jy, -10.39); // -Z rear face
            addBox(0.06, 0.045, 4.46, whiteTrimMat, 4.74, jy, -8.17);  // +X fire exit face
            addBox(0.06, 0.045, 4.46, whiteTrimMat, -3.84, jy, -8.17); // -X courtyard-side face
        });
        // Crisp white vertical panel joint lines on the -Z rear face (dividing into 3 panel columns) & +X face (dividing into 2 columns)
        [-1.02, 1.92].forEach((jx) => {
            addBox(0.045, 12.65, 0.06, whiteTrimMat, jx, 6.35, -10.39);
        });
        addBox(0.06, 12.65, 0.045, whiteTrimMat, 4.74, 6.35, -8.17);
        addBox(0.06, 12.65, 0.045, whiteTrimMat, -3.84, 6.35, -8.17);

        // White 3D Triangular Pyramid Sconces on the SW Stairwell Tower & recessed fire-exit wall (f37b07a4.jpg, be709037.jpg & 31f99ba3.jpg!)
        {
            // Rear (-Z) stairwell tower center sconce
            const scRear = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.56, 3), sconceMat);
            scRear.position.set(0.45, 7.22, -10.48);
            scRear.rotation.y = 0;
            scRear.castShadow = true;
            arch.add(scRear);

            // Douglas (+X) stairwell tower sconce on the center vertical score line (lz = -8.17m)
            const scTowerX = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.56, 3), sconceMat);
            scTowerX.position.set(4.82, 7.22, -8.17);
            scTowerX.rotation.y = -Math.PI * 0.5;
            scTowerX.castShadow = true;
            arch.add(scTowerX);

            // Recessed SW wall (lz = -6.05m, lx = 6.23m) sconce above the fire exit stairs (f37b07a4.jpg & 31f99ba3.jpg!)
            const scRecess = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.56, 3), sconceMat);
            scRecess.position.set(6.23, 7.22, rearZ - 0.14);
            scRecess.rotation.y = 0;
            scRecess.castShadow = true;
            arch.add(scRecess);
        }

        // Fire Exit Door, Projecting White Hood Canopy, Red Fire Alarm Strobe & Card Reader on +X Stairwell Tower Wall (lx = 4.73m, 3f533fc5.jpg & 3b6e29ad.jpg!)
        {
            const doorX = 4.74;
            const doorZ = -7.12;
            // Olive-tan painted hollow-metal door frame & recessed door leaf (w = 1.04m, h = 2.18m)
            addBox(0.10, 2.24, 1.14, darkSpandrelMat, doorX, 0.92, doorZ);
            addBox(0.06, 2.14, 0.98, tanPrecastMat, doorX + 0.03, 0.90, doorZ);
            // Narrow vertical rectangular vision lite glass window in upper-left of door leaf + white/red "NO SMOKING / FIRE EXIT" signs
            addBox(0.08, 0.68, 0.18, officeGlassMat, doorX + 0.04, 1.32, doorZ + 0.22);
            addBox(0.08, 0.16, 0.22, whiteTrimMat, doorX + 0.045, 1.44, doorZ - 0.04, false);
            addBox(0.08, 0.14, 0.22, whiteTrimMat, doorX + 0.045, 1.18, doorZ - 0.04, false);
            // Silver door lever handle
            addBox(0.10, 0.06, 0.12, galvSteelMat, doorX + 0.06, 0.88, doorZ + 0.36);

            // Projecting White Rectangular Overhang Hood Canopy above the Fire Exit Door (lz = -8.08m..-6.05m, y = 2.42m, 3f533fc5.jpg & 3b6e29ad.jpg!)
            addBox(0.46, 0.24, 2.05, whiteTrimMat, doorX + 0.22, 2.42, -7.06);
            addBox(0.48, 0.04, 2.07, darkBronzeMat, doorX + 0.22, 2.54, -7.06);

            // Red Fire Alarm Horn/Strobe Box under canopy to the left (+Z) of the door + Card Reader & Vertical Conduit (3f533fc5.jpg & 3b6e29ad.jpg!)
            const fireRedMat = new THREE.MeshStandardMaterial({ color: '#c82828', roughness: 0.4, metalness: 0.15 });
            addBox(0.09, 0.16, 0.14, fireRedMat, doorX + 0.05, 2.16, -6.38);
            addBox(0.04, 0.06, 0.05, whiteTrimMat, doorX + 0.08, 2.16, -6.38, false);
            // Card reader / pull box below the red strobe with vertical conduit
            addBox(0.08, 0.18, 0.13, whiteTrimMat, doorX + 0.05, 1.24, -6.48);
            addBox(0.06, 0.12, 0.08, darkBronzeMat, doorX + 0.07, 1.24, -6.48);
            addBox(0.03, 1.15, 0.03, galvSteelMat, doorX + 0.04, 1.82, -6.48);
        }

        // Rear (-Z) Wall Fire Department Connection (FDC) Siamese Standpipe & Lower Drain Pipes (be709037.jpg & 3b6e29ad.jpg!)
        addBox(0.18, 0.18, 0.24, darkBronzeMat, 3.15, 0.92, -10.46);
        addBox(0.10, 0.10, 0.18, darkBronzeMat, 3.46, 0.42, -10.44);
        addBox(0.10, 0.10, 0.18, galvSteelMat, 3.70, 0.40, -10.44);

        // 3. Level 4 Copper/Terracotta Horizontal Louvered Screen Wall & SE Stucco Wall Bays (y = 9.88m..12.62m)
        const neLouverH = 2.74;
        const neLouverY = 9.88 + neLouverH * 0.5;

        // (a) NE Washington St: 5 framed copper louver bays across lx = -7.34m..+7.91m (total width = 15.25m)
        const neLouverW = 15.25;
        addBox(neLouverW, neLouverH, 0.28, copperLouverMat, 0.28, neLouverY, frontZ - 0.12);
        for (let i = 0; i <= 5; i++) {
            const px = -7.34 + i * (neLouverW / 5);
            addBox(0.11, neLouverH + 0.08, 0.34, copperFrameMat, px, neLouverY, frontZ - 0.10);
        }

        // (b) NW Douglas St: 10 framed copper louver bays along lz = -6.05m..+25.40m (total length = 31.45m)
        const nwLouverL = 31.45;
        addBox(0.28, neLouverH, nwLouverL, copperLouverMat, douglasX - 0.12, neLouverY, 9.68);
        for (let i = 0; i <= 10; i++) {
            const pz = 25.40 - i * (nwLouverL / 10);
            addBox(0.34, neLouverH + 0.08, 0.11, copperFrameMat, douglasX - 0.10, neLouverY, pz);
        }

        // (c) SE Courtyard Upper Wall (lx = -11.10m, matched directly to 5e51fcab.jpg!):
        //   - Bay 2 (lz = +13.60m..+18.20m): Solid gray-tan stucco upper wall panel (length = 4.60m)
        addBox(0.28, neLouverH, 4.60, grayCoreStuccoMat, courtX + 0.12, neLouverY, 15.90);
        addBox(0.36, 0.16, 4.65, whiteTrimMat, courtX + 0.10, 12.70, 15.90);
        //   - Bays 3 & 4 (lz = +4.40m..+13.60m): 2 framed copper/terracotta horizontal louver bays above the 10-pane clerestory ribbon window (length = 9.20m, 5e51fcab.jpg!)
        addBox(0.28, neLouverH, 9.20, copperLouverMat, courtX + 0.12, neLouverY, 9.00);
        [13.60, 9.00, 4.40].forEach((pz) => {
            addBox(0.34, neLouverH + 0.08, 0.11, copperFrameMat, courtX + 0.10, neLouverY, pz);
        });
        //   - Bay 5 (lz = -6.05m..+4.40m): Solid gray-tan stucco rear upper wall (y = 8.40m..12.68m, length = 10.45m) + dark square exhaust louver at upper rear corner (lz = -4.2m, 5e51fcab.jpg!)
        addBox(0.28, 4.28, 10.45, grayCoreStuccoMat, courtX + 0.12, 10.54, -0.825);
        addBox(0.36, 0.16, 10.50, whiteTrimMat, courtX + 0.10, 12.70, -0.825);
        addBox(0.32, 1.35, 1.65, darkBronzeMat, courtX + 0.08, 11.15, -4.15); // Dark square louver at upper left of 316 in 5e51fcab.jpg!

        // (d) SW Rear Walls & Rear Projecting Bay (lz = -6.05m and lx = -3.66m..+4.56m, lz = -10.29m..-6.05m)
        // SW East segment (lx = -11.10m..-3.66m at lz = -6.05m, width = 7.44m)
        addBox(7.44, neLouverH, 0.28, copperLouverMat, -7.38, neLouverY, rearZ + 0.12);
        for (let i = 0; i <= 3; i++) {
            addBox(0.11, neLouverH + 0.08, 0.34, copperFrameMat, -11.10 + i * (7.44 / 3), neLouverY, rearZ + 0.10);
        }
        // SW West segment (lx = +4.56m..+7.91m at lz = -6.05m, width = 3.35m)
        addBox(3.35, neLouverH, 0.28, copperLouverMat, 6.235, neLouverY, rearZ + 0.12);
        addBox(0.11, neLouverH + 0.08, 0.34, copperFrameMat, 4.56, neLouverY, rearZ + 0.10);
        addBox(0.11, neLouverH + 0.08, 0.34, copperFrameMat, 7.91, neLouverY, rearZ + 0.10);

        // 4. Recessed 4th-Level Roof Court Deck & Inner Cream Parapet Backing Walls (y = 9.80m..11.20m)
        // Inner white/cream parapet wall backing the NW, SE, and SW screen walls (visible on roof court interior in Photo 3)
        addBox(0.24, 1.40, 31.2, whiteTrimMat, douglasX - 0.36, 10.50, 9.72);
        addBox(0.24, 1.40, 24.0, whiteTrimMat, courtX + 0.36, 10.50, 6.10);
        addBox(7.20, 1.40, 0.24, whiteTrimMat, -7.38, 10.50, rearZ + 0.36);
        addBox(3.15, 1.40, 0.24, whiteTrimMat, 6.23, 10.50, rearZ + 0.36);
        addBox(8.00, 1.40, 0.24, whiteTrimMat, 0.45, 10.50, -10.29 + 0.36);
        addBox(0.24, 1.40, 4.10, whiteTrimMat, -3.66 + 0.36, 10.50, -8.17);
        addBox(0.24, 1.40, 4.10, whiteTrimMat, 4.56 - 0.36, 10.50, -8.17);

        // =========================================================================
        // D. TALL ROOFTOP MECHANICAL & ELEVATOR PENTHOUSE + CHILLER & PIPING (Photos 2, 3, 4, 5)
        // =========================================================================
        // L-shaped Penthouse mass on SE/SW portion of the 4th-level roof court (y = 9.80m..15.25m):
        //   East Wing (front-left in Photos 2–4): lx = -10.8m..-3.2m, lz = +6.0m..+18.4m
        //   Rear Wing (back-right in Photos 2–4): lx = -10.8m..+2.8m, lz = -5.6m..+10.5m
        const pentBaseY = 9.80;
        const pentWallH = 3.65; // y = 9.80m..13.45m smooth beige/gray penthouse wall
        const pentCrownH = 1.75; // y = 13.45m..15.20m silver horizontal louvered crown

        // East Wing Penthouse Lower Wall & Silver Louvered Crown (lz = +10.50m..+18.40m, abutting Rear Wing cleanly at lz = +10.50m)
        addBox(7.60, pentWallH, 7.90, penthouseWallMat, -7.00, pentBaseY + pentWallH * 0.5, 14.45);
        addBox(7.68, 0.14, 7.98, whiteTrimMat, -7.00, pentBaseY + pentWallH, 14.45);
        addBox(7.60, pentCrownH, 7.90, silverLouverMat, -7.00, pentBaseY + pentWallH + pentCrownH * 0.5, 14.45);
        addBox(7.72, 0.14, 8.02, galvSteelMat, -7.00, pentBaseY + pentWallH + pentCrownH + 0.05, 14.45);

        // Rear Wing Penthouse Lower Wall & Silver Louvered Crown
        addBox(13.60, pentWallH, 16.10, penthouseWallMat, -4.00, pentBaseY + pentWallH * 0.5, 2.45);
        addBox(13.68, 0.14, 16.18, whiteTrimMat, -4.00, pentBaseY + pentWallH, 2.45);
        addBox(13.60, pentCrownH, 16.10, silverLouverMat, -4.00, pentBaseY + pentWallH + pentCrownH * 0.5, 2.45);
        addBox(13.72, 0.14, 16.22, galvSteelMat, -4.00, pentBaseY + pentWallH + pentCrownH + 0.05, 2.45);

        // Silver vertical louver bay frame mullions around the penthouse crown (Photos 2, 3, 4)
        for (let lxPos = -10.5; lxPos <= -3.3; lxPos += 3.5) {
            addBox(0.10, pentCrownH + 0.1, 0.12, galvSteelMat, lxPos, pentBaseY + pentWallH + pentCrownH * 0.5, 18.42);
        }
        for (let lzPos = 18.2; lzPos >= 10.6; lzPos -= 2.5) {
            addBox(0.12, pentCrownH + 0.1, 0.10, galvSteelMat, -3.18, pentBaseY + pentWallH + pentCrownH * 0.5, lzPos);
        }
        for (let lxPos = -3.1; lxPos <= 2.8; lxPos += 2.95) {
            addBox(0.10, pentCrownH + 0.1, 0.12, galvSteelMat, lxPos, pentBaseY + pentWallH + pentCrownH * 0.5, 10.52);
        }

        // Pale-Yellow Double Service Doors on Penthouse East Wing Wall facing the NW Roof Court (Photo 2 & 3!)
        // Located on the +X wall of the East Wing (lx = -3.18m, lz = +15.6m)
        addBox(0.08, 2.15, 1.82, yellowDoorMat, -3.18, pentBaseY + 1.12, 15.60);
        addBox(0.10, 2.15, 0.04, darkBronzeMat, -3.18, pentBaseY + 1.12, 15.60); // Center door seam
        addBox(0.12, 0.16, 0.18, darkBronzeMat, -3.16, pentBaseY + 1.15, 15.60); // Black lever handles

        // Galvanized Steel Caged Vertical Access Ladder on Penthouse Rear Wing Wall (lx = -1.6m, lz = +10.58m, Photos 2, 3, 4!)
        const ladderX = -1.60;
        const ladderZ = 10.62;
        addBox(0.06, 6.2, 0.08, galvSteelMat, ladderX - 0.28, pentBaseY + 3.1, ladderZ);
        addBox(0.06, 6.2, 0.08, galvSteelMat, ladderX + 0.28, pentBaseY + 3.1, ladderZ);
        for (let ry = 0.4; ry <= 6.0; ry += 0.35) {
            addBox(0.56, 0.04, 0.05, galvSteelMat, ladderX, pentBaseY + ry, ladderZ);
        }
        // Safety cage hoops around upper half of ladder (y = +2.2m..+6.2m above roof deck)
        for (let cy = 2.2; cy <= 6.1; cy += 0.65) {
            const hoop = new THREE.Mesh(
                new THREE.CylinderGeometry(0.42, 0.42, 0.05, 12, 1, true),
                galvSteelMat
            );
            hoop.position.set(ladderX, pentBaseY + cy, ladderZ + 0.32);
            arch.add(hoop);
        }

        // Galvanized Sheet-Metal Exhaust Hood Box on Right End of Penthouse (lx = +2.85m, lz = +9.2m, Photos 2, 3, 4)
        addBox(1.35, 2.35, 1.85, galvSteelMat, 3.35, pentBaseY + 3.25, 9.20);

        // 2-Fan Square Cooling Tower / Chiller Unit on Structural Steel Dunnage Frame out on the Roof Court (lx = +2.1m, lz = +14.8m, Photos 2, 3, 4)
        const chillerX = 2.10;
        const chillerZ = 14.80;
        // Concrete curb pads & steel legs
        addBox(3.10, 0.16, 3.10, basementConcreteMat, chillerX, pentBaseY + 0.08, chillerZ);
        [-1.2, 1.2].forEach((dx) => {
            [-1.2, 1.2].forEach((dz) => {
                addBox(0.16, 0.55, 0.16, darkBronzeMat, chillerX + dx, pentBaseY + 0.38, chillerZ + dz);
            });
        });
        // Main chiller cabinet
        addBox(2.85, 1.95, 2.85, penthouseWallMat, chillerX, pentBaseY + 1.62, chillerZ);
        // Twin dark circular fan cowls on top
        [-0.65, 0.65].forEach((dx) => {
            const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 16), darkBronzeMat);
            cowl.position.set(chillerX + dx, pentBaseY + 2.68, chillerZ);
            arch.add(cowl);
        });

        // White Insulated Chilled-Water Piping Risers & Horizontal Roof Pipe Rack connecting Chiller to Penthouse (Photos 2, 3, 4!)
        // 3 vertical white riser pipes on the chiller face (+Z face at lz = +16.28m)
        [-0.22, 0.0, 0.22].forEach((px) => {
            addBox(0.11, 2.15, 0.11, whiteTrimMat, chillerX + px, pentBaseY + 1.55, chillerZ + 1.48);
        });
        // Horizontal white pipe run from chiller (lx = +2.1m) across roof deck toward East Wing penthouse wall (lx = -3.15m) at lz = +13.5m
        addBox(5.35, 0.12, 0.12, whiteTrimMat, -0.52, pentBaseY + 0.52, 13.65);
        addBox(5.35, 0.12, 0.12, whiteTrimMat, -0.52, pentBaseY + 0.52, 13.90);
        // Pipe rack supports on roof deck
        [-2.2, -0.5, 1.2].forEach((sx) => {
            addBox(0.12, 0.50, 0.48, galvSteelMat, sx, pentBaseY + 0.25, 13.78);
        });
        // Electrical conduit manifold along East Wing penthouse lower wall (lx = -3.12m, lz = +11.2m..+14.2m, Photo 3)
        addBox(0.18, 0.65, 3.10, galvSteelMat, -3.10, pentBaseY + 0.65, 12.60);
}