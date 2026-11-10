import * as THREE from 'three';

/**
 * Building 350 (Chelan County Courthouse) — Orondo Ave (+Z) Front Fascia & Classical Pavilion Returns
 * Builds the 5-bay Beaux-Arts front facade at lz = +26.125m (lx = -15.26m .. +10.18m, midX = -2.54m)
 * plus the 1-bay classical pavilion wrap on the front 9.72m (lz = +16.40m .. +26.125m) of the SW & NE sides.
 */
export function buildBuilding350FrontFascia(arch, mats) {
    const {
        rusticatedGraniteMat,
        smoothGraniteMat,
        terraCottaMat,
        terraCottaTrimMat,
        tapestryBrickMat,
        verdigrisMat,
        verdigrisDarkMat,
        darkFrameMat,
        glassMat,
        oakDoorMat,
        transomMat,
        countyBuildingFriezeMat,
        shieldCartoucheMat
    } = mats;

    const frontZ = 26.125;
    const minX = -15.26;
    const maxX = 10.18;
    const midX = -2.54;
    const width = maxX - minX; // 25.44m

    // 1. Six Giant Cream Terra-Cotta Paneled Pilasters on the Orondo Ave Front Facade (y = 4.65m .. 13.55m)
    // Plus corner return pilasters at minX and maxX
    const pilasterXs = [-14.42, -9.52, -4.86, -0.22, 4.44, 9.34];
    pilasterXs.forEach((px, idx) => {
        const isOuter = idx === 0 || idx === pilasterXs.length - 1;
        const pilW = isOuter ? 1.56 : 1.02;
        buildClassicalPilaster(arch, px, frontZ, pilW, 4.65, 13.55, 0, terraCottaMat, terraCottaTrimMat);
    });

    // 2. Three Central Two-Story Arched Courtroom Bays (Bays 2, 3, 4 at lx = -7.19m, -2.54m, +2.11m)
    const centralBayXs = [-7.19, -2.54, 2.11];
    centralBayXs.forEach((bx) => {
        buildTwoStoryArchedCourtroomBay(
            arch,
            bx,
            frontZ,
            3.12,
            0,
            mats
        );
    });

    // 3. Two Outer Side Bays on Floors 3, 4, 5 (Bay 1 at lx = -11.97m, Bay 5 at lx = +6.89m)
    const outerBayXs = [-11.97, 6.89];
    outerBayXs.forEach((bx) => {
        // Floor 3 narrow rectangular window (y = 5.10m .. 7.70m)
        buildRecessedRectWindow(arch, bx, 6.40, frontZ, 1.22, 2.60, 0, darkFrameMat, glassMat, terraCottaTrimMat, true);

        // Cream terra-cotta sculpted shield/crest cartouche plaque between Floors 3 & 4 (y = 8.15m .. 9.15m)
        const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.16, 1.02, 0.14), shieldCartoucheMat);
        plaque.position.set(bx, 8.65, frontZ + 0.05);
        plaque.castShadow = true;
        arch.add(plaque);

        // Floor 4 narrow rectangular window (y = 9.60m .. 12.20m)
        buildRecessedRectWindow(arch, bx, 10.90, frontZ, 1.22, 2.60, 0, darkFrameMat, glassMat, terraCottaTrimMat, true);

        // Floor 5 square attic window in frieze story (y = 14.55m .. 15.95m)
        buildFriezeAtticWindow(arch, bx, 15.25, frontZ, 1.20, 1.40, 0, darkFrameMat, glassMat, terraCottaTrimMat);
    });

    // 4. Floor 2 Rusticated Gray Granite Windows (Outer single windows & Inner paired windows)
    // Outer single windows on Floor 2 (lx = -11.97m, +6.89m, y = 1.15m .. 3.50m)
    outerBayXs.forEach((bx) => {
        buildGraniteBaseWindow(arch, bx, 2.32, frontZ, 1.62, 2.35, 0, rusticatedGraniteMat, darkFrameMat, glassMat);
    });

    // Inner paired windows on Floor 2 in Bays 2 & 4 (centered around -7.19m and +2.11m)
    [-7.19, 2.11].forEach((bx) => {
        buildGraniteBaseWindow(arch, bx - 0.88, 2.32, frontZ, 1.26, 2.35, 0, rusticatedGraniteMat, darkFrameMat, glassMat);
        buildGraniteBaseWindow(arch, bx + 0.88, 2.32, frontZ, 1.26, 2.35, 0, rusticatedGraniteMat, darkFrameMat, glassMat);
        // Central rusticated granite mullion pier between the paired windows
        const pier = new THREE.Mesh(new THREE.BoxGeometry(0.46, 2.50, 0.16), rusticatedGraniteMat);
        pier.position.set(bx, 2.32, frontZ + 0.04);
        pier.castShadow = true;
        arch.add(pier);
    });

    // 5. Monumental Carved Terra-Cotta Main Entrance Portal (Center Bay 3 at lx = midX = -2.54m, y = 0.0m .. 4.65m)
    buildMainOrondoEntrancePortal(arch, midX, frontZ, mats);

    // 6. Floor 5 (Attic / Frieze Story, y = 14.05m .. 16.45m) Recessed Brick Panels & Terra-Cotta Frames in Central Bays 2, 3, 4
    centralBayXs.forEach((bx) => {
        [-0.84, 0.84].forEach((dx) => {
            buildFriezeRecessedBrickPanel(arch, bx + dx, 15.25, frontZ, 1.36, 1.56, 0, tapestryBrickMat, terraCottaTrimMat);
        });
    });

    // Vertical terra-cotta frieze pilasters aligned over the 6 main pilasters on Floor 5 (y = 14.05m .. 16.45m)
    pilasterXs.forEach((px, idx) => {
        const isOuter = idx === 0 || idx === pilasterXs.length - 1;
        const fw = isOuter ? 1.52 : 0.96;
        const friezePil = new THREE.Mesh(new THREE.BoxGeometry(fw, 2.36, 0.14), terraCottaMat);
        friezePil.position.set(px, 15.25, frontZ + 0.06);
        friezePil.castShadow = true;
        arch.add(friezePil);
    });

    // 7. Classical Architrave Band (y = 13.55m .. 14.05m) & Heavy Floor 2-3 Belt Course (y = 4.10m .. 4.65m)
    // Wrapping across the Orondo Ave Front Facade AND the 9.72m Front Classical Pavilion on SW (-X) & NE (+X) sides!
    const pavStartZ = 16.40;
    const pavLenZ = frontZ - pavStartZ; // 9.725m
    const pavMidZ = (frontZ + pavStartZ) * 0.5;

    // Front belt course (y = 4.10m .. 4.65m)
    const beltFront = new THREE.Mesh(new THREE.BoxGeometry(width + 0.64, 0.55, 0.42), terraCottaTrimMat);
    beltFront.position.set(midX, 4.375, frontZ + 0.12);
    beltFront.castShadow = true;
    beltFront.receiveShadow = true;
    arch.add(beltFront);

    // Lower sub-molding under belt course
    const beltSubFront = new THREE.Mesh(new THREE.BoxGeometry(width + 0.44, 0.18, 0.28), terraCottaMat);
    beltSubFront.position.set(midX, 4.02, frontZ + 0.08);
    arch.add(beltSubFront);

    // Front classical architrave above pilaster capitals (y = 13.55m .. 14.08m)
    const architraveFront = new THREE.Mesh(new THREE.BoxGeometry(width + 0.68, 0.52, 0.44), terraCottaTrimMat);
    architraveFront.position.set(midX, 13.81, frontZ + 0.14);
    architraveFront.castShadow = true;
    arch.add(architraveFront);

    // 8. Projecting Classical Modillion Cornice (y = 16.45m .. 17.25m) across Front Facade
    buildClassicalModillionCornice(arch, midX, frontZ, width + 1.36, 0, terraCottaMat, terraCottaTrimMat);

    // 9. Symmetrical Front & Rear Classical End Pavilions on SW (Washington St, lx = -15.26m) & NE (Park, lx = +10.18m) Sides!
    // Visible in f4021356.jpg, 9915b876.jpg, 20905550.jpg, 9728efd3.jpg, and aerial view a2489d57.jpg:
    // - Front Pavilion: lz = +19.50m .. +26.125m (len = 6.625m, center = +22.8125m)
    // - Rear Pavilion:  lz = -17.425m .. -10.80m (len = 6.625m, center = -14.1125m)
    const endPavilions = [
        { zMin: 19.50, zMax: 26.125, p1Z: 25.32, p2Z: 20.30, bayZ: 22.81 },
        { zMin: -17.425, zMax: -10.80, p1Z: -16.62, p2Z: -11.60, bayZ: -14.11 }
    ];

    [-1, 1].forEach((sideSign) => {
        const sideX = sideSign < 0 ? minX : maxX;
        const rotY = sideSign < 0 ? -Math.PI * 0.5 : Math.PI * 0.5;

        endPavilions.forEach((pav) => {
            const pLen = pav.zMax - pav.zMin;
            const pMidZ = (pav.zMin + pav.zMax) * 0.5;

            // Two giant cream terra-cotta pilasters with Attic base & Corinthian capital (20905550.jpg)
            buildClassicalPilaster(arch, sideX, pav.p1Z, 1.38, 4.65, 13.55, rotY, terraCottaMat, terraCottaTrimMat);
            buildClassicalPilaster(arch, sideX, pav.p2Z, 1.28, 4.65, 13.55, rotY, terraCottaMat, terraCottaTrimMat);

            // Floor 2 single granite window in pavilion bay
            buildGraniteBaseWindow(arch, sideX, 2.32, pav.bayZ, 1.56, 2.35, rotY, rusticatedGraniteMat, darkFrameMat, glassMat);
            // Floor 3 tall narrow window
            buildRecessedRectWindow(arch, sideX, 6.40, pav.bayZ, 1.22, 2.62, rotY, darkFrameMat, glassMat, terraCottaTrimMat, true);
            // Sculpted cream terra-cotta shield cartouche plaque between Floors 3 & 4 (20905550.jpg)
            const sidePlaque = new THREE.Mesh(new THREE.BoxGeometry(1.16, 1.02, 0.14), shieldCartoucheMat);
            sidePlaque.rotation.y = rotY;
            sidePlaque.position.set(sideX + sideSign * 0.05, 8.65, pav.bayZ);
            sidePlaque.castShadow = true;
            arch.add(sidePlaque);
            // Floor 4 tall narrow window
            buildRecessedRectWindow(arch, sideX, 10.90, pav.bayZ, 1.22, 2.62, rotY, darkFrameMat, glassMat, terraCottaTrimMat, true);
            // Floor 5 square attic window in frieze story
            buildFriezeAtticWindow(arch, sideX, 15.25, pav.bayZ, 1.18, 1.42, rotY, darkFrameMat, glassMat, terraCottaTrimMat);

            // 4 vertical carved floral-scroll terra-cotta relief strips on Floor 5 (2 flanking the window + 2 over the outer pilasters — 20905550.jpg!)
            [pav.p1Z, pav.bayZ - 0.86, pav.bayZ + 0.86, pav.p2Z].forEach((fz, fIdx) => {
                const stripW = (fIdx === 0 || fIdx === 3) ? 0.34 : 0.24;
                const fp = new THREE.Mesh(new THREE.BoxGeometry(stripW, 1.48, 0.12), terraCottaTrimMat);
                fp.rotation.y = rotY;
                fp.position.set(sideX + sideSign * 0.06, 15.25, fz);
                arch.add(fp);
            });

            // Pavilion belt course return (y = 4.10m .. 4.65m)
            const sideBelt = new THREE.Mesh(new THREE.BoxGeometry(pLen + 0.44, 0.55, 0.42), terraCottaTrimMat);
            sideBelt.rotation.y = rotY;
            sideBelt.position.set(sideX + sideSign * 0.12, 4.375, pMidZ);
            sideBelt.castShadow = true;
            arch.add(sideBelt);

            // Pavilion architrave & modillion cornice return (y = 13.55m .. 17.25m)
            const sideArchitrave = new THREE.Mesh(new THREE.BoxGeometry(pLen + 0.52, 0.52, 0.44), terraCottaTrimMat);
            sideArchitrave.rotation.y = rotY;
            sideArchitrave.position.set(sideX + sideSign * 0.14, 13.81, pMidZ);
            arch.add(sideArchitrave);

            buildClassicalModillionCornice(arch, sideX, pMidZ, pLen + 1.05, rotY, terraCottaMat, terraCottaTrimMat);
        });
    });
}

/**
 * Giant fluted/paneled cream terra-cotta pilaster with Attic base, 5 recessed vertical shaft panels, and Corinthian foliate capital
 */
export function buildClassicalPilaster(parent, x, z, width, botY, topY, rotY, terraMat, trimMat) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;

    const totalH = topY - botY;
    const baseH = 0.52;
    const capH = 0.72;
    const shaftH = totalH - baseH - capH;
    const shaftMidY = botY + baseH + shaftH * 0.5;

    // 1. Molded Attic Base
    const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(width + 0.16, 0.28, 0.28), trimMat);
    basePlinth.position.set(0, botY + 0.14, 0.10);
    g.add(basePlinth);

    const baseTorus = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 0.24, 0.22), terraMat);
    baseTorus.position.set(0, botY + 0.40, 0.09);
    g.add(baseTorus);

    // 2. Main Pilaster Shaft with 5 Recessed Vertical Panels (matching 4ee09d25.jpg & e1887b4f.jpg)
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(width, shaftH, 0.18), terraMat);
    shaft.position.set(0, shaftMidY, 0.07);
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    g.add(shaft);

    const panelCount = 5;
    const segH = shaftH / panelCount;
    const innerPanelW = width * 0.62;
    for (let i = 0; i < panelCount; i++) {
        const py = botY + baseH + (i + 0.5) * segH;
        // Raised border frame around recessed panel
        const panelInset = new THREE.Mesh(new THREE.BoxGeometry(innerPanelW, segH - 0.22, 0.05), trimMat);
        panelInset.position.set(0, py, 0.155);
        g.add(panelInset);
    }

    // 3. Sculpted Corinthian / Acanthus Capital (y = topY - capH .. topY)
    const capY = topY - capH * 0.5;
    const capBell = new THREE.Mesh(new THREE.BoxGeometry(width + 0.10, capH * 0.72, 0.26), terraMat);
    capBell.position.set(0, capY - 0.06, 0.11);
    capBell.castShadow = true;
    g.add(capBell);

    // Abacus crown slab
    const abacus = new THREE.Mesh(new THREE.BoxGeometry(width + 0.24, capH * 0.28, 0.34), trimMat);
    abacus.position.set(0, topY - capH * 0.14, 0.14);
    abacus.castShadow = true;
    g.add(abacus);

    // Corner volute scrolls & central acanthus leaf bosses on the capital
    [-width * 0.36, 0, width * 0.36].forEach((lx, idx) => {
        const leaf = new THREE.Mesh(
            new THREE.BoxGeometry(width * 0.22, capH * 0.52, 0.10),
            trimMat
        );
        leaf.position.set(lx, capY - 0.04, 0.24);
        g.add(leaf);
        if (idx !== 1) {
            const volute = new THREE.Mesh(
                new THREE.CylinderGeometry(0.11, 0.11, 0.12, 10),
                trimMat
            );
            volute.rotation.x = Math.PI * 0.5;
            volute.position.set(lx * 1.15, topY - 0.22, 0.25);
            g.add(volute);
        }
    });

    parent.add(g);
}

/**
 * Two-Story Arched Courtroom Bay (Floors 3 & 4) with:
 * - Ornate patinated-green iron balcony grille at base of Floor 3 (y = 4.65m .. 5.25m)
 * - 3-part Floor 3 window (y = 4.65m .. 8.05m)
 * - Verdigris patinated-copper spandrel panel between Floors 3 & 4 (y = 8.05m .. 9.35m)
 * - Semicircular Palladian arched Floor 4 window (y = 9.35m .. 12.55m) with radial fanlight bars
 * - Cream terra-cotta semicircular archivolt molding & scrolled central keystone
 */
export function buildTwoStoryArchedCourtroomBay(parent, x, z, bayW, rotY, mats) {
    const {
        terraCottaMat,
        terraCottaTrimMat,
        verdigrisMat,
        verdigrisDarkMat,
        darkFrameMat,
        glassMat
    } = mats;

    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;

    const archRadius = bayW * 0.5; // 1.56m
    const archCenterY = 10.95;

    // 1. Recessed Window Backing Glass (spanning Floor 3 & Floor 4 up into the semicircular arch)
    const rectGlassH = archCenterY - 4.68;
    const rectGlass = new THREE.Mesh(new THREE.PlaneGeometry(bayW - 0.12, rectGlassH), glassMat);
    rectGlass.position.set(0, 4.68 + rectGlassH * 0.5, 0.02);
    g.add(rectGlass);

    const archGlassGeo = new THREE.CircleGeometry(archRadius - 0.06, 28, 0, Math.PI);
    const archGlass = new THREE.Mesh(archGlassGeo, glassMat);
    archGlass.position.set(0, archCenterY, 0.02);
    g.add(archGlass);

    // 2. Floor 3 Window Mullions (y = 4.68m .. 8.05m: wide center lite + 2 side lites + horizontal sash bars)
    const f3Bot = 4.68;
    const f3Top = 8.05;
    const f3H = f3Top - f3Bot;
    const f3MidY = (f3Bot + f3Top) * 0.5;

    // Outer frame jambs
    [-bayW * 0.48, bayW * 0.48].forEach((jx) => {
        const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.09, rectGlassH, 0.08), darkFrameMat);
        jamb.position.set(jx, 4.68 + rectGlassH * 0.5, 0.04);
        g.add(jamb);
    });

    // 2 main vertical mullions dividing the bay into Side - Center - Side (matching 5e38395b.jpg & 4ee09d25.jpg)
    const mullionX = bayW * 0.25;
    [-mullionX, mullionX].forEach((mx) => {
        const vm = new THREE.Mesh(new THREE.BoxGeometry(0.08, f3H, 0.08), darkFrameMat);
        vm.position.set(mx, f3MidY, 0.045);
        g.add(vm);
    });

    // Horizontal transom/sash bar in side lites & top of Floor 3 window
    const topBar3 = new THREE.Mesh(new THREE.BoxGeometry(bayW, 0.08, 0.08), darkFrameMat);
    topBar3.position.set(0, f3Top - 0.55, 0.045);
    g.add(topBar3);

    [-bayW * 0.365, bayW * 0.365].forEach((sx) => {
        const sashBar = new THREE.Mesh(new THREE.BoxGeometry(bayW * 0.23, 0.06, 0.07), darkFrameMat);
        sashBar.position.set(sx, f3Bot + f3H * 0.44, 0.045);
        g.add(sashBar);
    });

    // 3. Ornate Patinated-Green Cast-Iron Balcony Grille at Base of Floor 3 (y = 4.68m .. 5.26m)
    const grilleH = 0.58;
    const grilleY = 4.68 + grilleH * 0.5;
    const grilleTopRail = new THREE.Mesh(new THREE.BoxGeometry(bayW, 0.05, 0.10), verdigrisMat);
    grilleTopRail.position.set(0, 4.68 + grilleH, 0.09);
    g.add(grilleTopRail);

    const grilleBotRail = new THREE.Mesh(new THREE.BoxGeometry(bayW, 0.05, 0.10), verdigrisMat);
    grilleBotRail.position.set(0, 4.71, 0.09);
    g.add(grilleBotRail);

    // Vertical & X-scrollwork bars in the balcony grille
    const numPanels = 6;
    const pW = bayW / numPanels;
    for (let i = 0; i <= numPanels; i++) {
        const px = -bayW * 0.5 + i * pW;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, grilleH, 0.06), verdigrisMat);
        post.position.set(px, grilleY, 0.09);
        g.add(post);
        if (i < numPanels) {
            const cx = px + pW * 0.5;
            const ring = new THREE.Mesh(new THREE.TorusGeometry(pW * 0.32, 0.022, 6, 12), verdigrisMat);
            ring.position.set(cx, grilleY, 0.09);
            g.add(ring);
        }
    }

    // 4. Ornate Verdigris Patinated-Copper Spandrel Panel between Floors 3 & 4 (y = 8.05m .. 9.35m)
    const spandrelBot = 8.05;
    const spandrelTop = 9.35;
    const spandrelH = spandrelTop - spandrelBot;
    const spandrelMidY = (spandrelBot + spandrelTop) * 0.5;

    const spandrelPlate = new THREE.Mesh(new THREE.BoxGeometry(bayW + 0.04, spandrelH, 0.11), verdigrisDarkMat);
    spandrelPlate.position.set(0, spandrelMidY, 0.055);
    spandrelPlate.castShadow = true;
    g.add(spandrelPlate);

    // Molded horizontal cornice rails at top, middle, and bottom of verdigris spandrel (4ee09d25.jpg)
    [spandrelBot + 0.08, spandrelMidY + 0.18, spandrelTop - 0.08].forEach((ry, idx) => {
        const rail = new THREE.Mesh(
            new THREE.BoxGeometry(bayW + 0.08, idx === 2 ? 0.14 : 0.09, idx === 2 ? 0.18 : 0.14),
            verdigrisMat
        );
        rail.position.set(0, ry, 0.08);
        g.add(rail);
    });

    // Fluted vertical bronze pilasters & recessed panels across the verdigris spandrel
    const fluteCount = 9;
    for (let i = 0; i < fluteCount; i++) {
        const fx = -bayW * 0.44 + (i / (fluteCount - 1)) * (bayW * 0.88);
        const flute = new THREE.Mesh(new THREE.BoxGeometry(0.09, spandrelH * 0.52, 0.05), verdigrisMat);
        flute.position.set(fx, spandrelBot + spandrelH * 0.36, 0.11);
        g.add(flute);
    }

    // 5. Floor 4 Semicircular Palladian Arched Window Mullions (y = 9.35m .. 12.51m)
    // Inner Palladian arch & side mullions in patinated green (edf7b17e.jpg)
    const f4RectH = archCenterY - spandrelTop; // 1.60m
    const innerArchR = archRadius * 0.52;
    [-innerArchR, innerArchR].forEach((mx) => {
        const vm4 = new THREE.Mesh(new THREE.BoxGeometry(0.08, f4RectH + 0.95, 0.08), verdigrisMat);
        vm4.position.set(mx, spandrelTop + (f4RectH + 0.95) * 0.5, 0.05);
        g.add(vm4);
    });

    // Horizontal springline bar at y = archCenterY
    const springBar = new THREE.Mesh(new THREE.BoxGeometry(bayW - 0.12, 0.07, 0.08), verdigrisMat);
    springBar.position.set(0, archCenterY, 0.05);
    g.add(springBar);

    // Mid-height sash bar in Floor 4 rectangular section
    const midBar4 = new THREE.Mesh(new THREE.BoxGeometry(bayW - 0.12, 0.05, 0.07), verdigrisMat);
    midBar4.position.set(0, spandrelTop + f4RectH * 0.5, 0.045);
    g.add(midBar4);

    // Inner concentric semicircular mullion ring inside the Floor 4 arch
    const innerRing = new THREE.Mesh(
        new THREE.TorusGeometry(innerArchR, 0.04, 8, 20, Math.PI),
        verdigrisMat
    );
    innerRing.position.set(0, archCenterY, 0.055);
    g.add(innerRing);

    // Outer semicircular window frame ring
    const outerFrameRing = new THREE.Mesh(
        new THREE.TorusGeometry(archRadius - 0.08, 0.05, 8, 24, Math.PI),
        verdigrisMat
    );
    outerFrameRing.position.set(0, archCenterY, 0.055);
    g.add(outerFrameRing);

    // Radial fanlight muntin bars in the semicircular arch
    [0.22, 0.50, 0.78].forEach((t) => {
        const ang = t * Math.PI;
        const rLen = archRadius - innerArchR - 0.06;
        const rMid = innerArchR + rLen * 0.5;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(rLen, 0.035, 0.05), verdigrisMat);
        bar.position.set(Math.cos(ang) * rMid, archCenterY + Math.sin(ang) * rMid, 0.05);
        bar.rotation.z = ang;
        g.add(bar);
    });

    // 6. Cream Terra-Cotta Semicircular Archivolt Arch Molding & Scrolled Central Keystone (edf7b17e.jpg)
    const archivoltRing = new THREE.Mesh(
        new THREE.TorusGeometry(archRadius + 0.12, 0.14, 10, 28, Math.PI),
        terraCottaTrimMat
    );
    archivoltRing.scale.set(1, 1, 0.65);
    archivoltRing.position.set(0, archCenterY, 0.06);
    archivoltRing.castShadow = true;
    g.add(archivoltRing);

    // Impost moldings at the springline of the terra-cotta arch
    [-archRadius - 0.12, archRadius + 0.12].forEach((ix) => {
        const impost = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.20), terraCottaTrimMat);
        impost.position.set(ix, archCenterY, 0.08);
        g.add(impost);
    });

    // Projecting Scrolled Keystone at top of the arch (y = archCenterY + archRadius + 0.15m)
    const keystone = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.54, 0.26), terraCottaTrimMat);
    keystone.position.set(0, archCenterY + archRadius + 0.12, 0.11);
    keystone.castShadow = true;
    g.add(keystone);

    const keystoneScroll = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.36, 12), terraCottaMat);
    keystoneScroll.rotation.z = Math.PI * 0.5;
    keystoneScroll.position.set(0, archCenterY + archRadius + 0.32, 0.18);
    g.add(keystoneScroll);

    parent.add(g);
}

/**
 * Monumental Carved Cream Terra-Cotta Entrance Portal on Orondo Ave (e1887b4f.jpg, 79f8f182.jpg, 5e38395b.jpg):
 * - Recessed oak double glass doors + gold-lettered dark-green transom ("Chelan County Courthouse / 350 Orondo Ave.")
 * - 3 red-and-white safety bollards in front of doors
 * - Carved rosette medallion surround
 * - "COUNTY BUILDING" inscribed frieze
 * - 2 large scrolled acanthus console brackets (ancones) supporting projecting cornice hood
 * - 2 corner palmette acroteria + central classical square pedestal with white globe lantern atop the hood
 * - Red fire-alarm strobe on left rusticated granite wall
 */
function buildMainOrondoEntrancePortal(parent, cx, frontZ, mats) {
    const {
        terraCottaMat,
        terraCottaTrimMat,
        oakDoorMat,
        transomMat,
        countyBuildingFriezeMat,
        glassMat,
        darkFrameMat
    } = mats;

    const g = new THREE.Group();
    g.position.set(cx, 0, frontZ);

    const openW = 2.48;
    const openH = 3.56;

    // 1. Recessed Vestibule Alcove Backing, Threshold Sill & Surround Reveal
    //    (Positioned in front of f2Body [z=0] and waterTableCap [z=+0.12] so the granite wall never clips through the doors!)
    const vestBackMat = new THREE.MeshStandardMaterial({ color: '#181c20', roughness: 0.75, metalness: 0.1 });
    const vestBack = new THREE.Mesh(new THREE.BoxGeometry(openW + 0.08, openH + 0.08, 0.04), vestBackMat);
    vestBack.position.set(0, openH * 0.5 + 0.02, 0.115);
    g.add(vestBack);

    const thresholdSill = new THREE.Mesh(new THREE.BoxGeometry(openW + 0.16, 0.42, 0.24), terraCottaTrimMat);
    thresholdSill.position.set(0, 0.21, 0.14);
    g.add(thresholdSill);

    const topSoffit = new THREE.Mesh(new THREE.BoxGeometry(openW + 0.20, 0.18, 0.28), terraCottaMat);
    topSoffit.position.set(0, openH + 0.05, 0.16);
    g.add(topSoffit);

    // 2. Oak Double Entrance Doors (y = 0.08m .. 2.40m, placed at z = +0.16m .. +0.22m inside the +0.30m terra-cotta surround)
    const doorH = 2.32;
    const doorW = (openW - 0.16) * 0.5;
    [-doorW * 0.5 - 0.02, doorW * 0.5 + 0.02].forEach((dx, idx) => {
        const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.06), oakDoorMat);
        doorFrame.position.set(dx, 0.08 + doorH * 0.5, 0.165);
        doorFrame.castShadow = true;
        doorFrame.receiveShadow = true;
        g.add(doorFrame);

        // Upper & lower glass lites in each oak door (proud of the oak door face at z = +0.198m)
        const upperGlass = new THREE.Mesh(new THREE.PlaneGeometry(doorW - 0.24, 1.16), glassMat);
        upperGlass.position.set(dx, 1.58, 0.198);
        g.add(upperGlass);

        const lowerGlass = new THREE.Mesh(new THREE.PlaneGeometry(doorW - 0.24, 0.58), glassMat);
        lowerGlass.position.set(dx, 0.56, 0.198);
        g.add(lowerGlass);

        // Molded oak glazing beads around upper & lower glass lites
        const midRail = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.16, 0.14, 0.016), oakDoorMat);
        midRail.position.set(dx, 0.92, 0.198);
        g.add(midRail);

        // Silver push/pull handle bar
        const handleX = idx === 0 ? dx + doorW * 0.34 : dx - doorW * 0.34;
        const handle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8),
            new THREE.MeshStandardMaterial({ color: '#d8dee4', roughness: 0.2, metalness: 0.85 })
        );
        handle.position.set(handleX, 1.08, 0.215);
        g.add(handle);
    });

    // Center oak astragal mullion between the double doors
    const centerAstragal = new THREE.Mesh(new THREE.BoxGeometry(0.07, doorH, 0.075), oakDoorMat);
    centerAstragal.position.set(0, 0.08 + doorH * 0.5, 0.172);
    g.add(centerAstragal);

    // Dark-green horizontal transom bar between oak doors and glass transom
    const transomBar = new THREE.Mesh(new THREE.BoxGeometry(openW, 0.14, 0.12), darkFrameMat);
    transomBar.position.set(0, 2.44, 0.185);
    g.add(transomBar);

    // 3. Gold-Lettered Dark-Green Glass Transom ("Chelan County Courthouse / 350 Orondo Ave.") (y = 2.50m .. 3.54m)
    const transomMesh = new THREE.Mesh(new THREE.PlaneGeometry(openW - 0.08, 1.04), transomMat);
    transomMesh.position.set(0, 3.02, 0.185);
    g.add(transomMesh);

    // 4. Three Red-and-White Striped Safety Bollard Posts in front of the entrance doors (79f8f182.jpg, a2489d57.jpg)
    const redBollardMat = new THREE.MeshStandardMaterial({ color: '#d62828', roughness: 0.45 });
    const whiteStripeMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 });
    [-0.86, 0, 0.86].forEach((bx) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.05, 10), redBollardMat);
        post.position.set(bx, 0.525, 0.42);
        g.add(post);
        [0.36, 0.78].forEach((sy) => {
            const band = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.09, 10), whiteStripeMat);
            band.position.set(bx, sy, 0.42);
            g.add(band);
        });
    });

    // 5. Carved Cream Terra-Cotta Portal Surround with Rosette Medallions (e1887b4f.jpg)
    const jambW = 0.54;
    const portalOuterW = openW + jambW * 2; // 3.56m
    [-openW * 0.5 - jambW * 0.5, openW * 0.5 + jambW * 0.5].forEach((jx) => {
        const jamb = new THREE.Mesh(new THREE.BoxGeometry(jambW, openH + 0.48, 0.30), terraCottaMat);
        jamb.position.set(jx, (openH + 0.48) * 0.5, 0.16);
        jamb.castShadow = true;
        g.add(jamb);

        // Carved circular rosette medallions along vertical jambs
        for (let ry = 0.65; ry <= 3.45; ry += 0.56) {
            const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 12), terraCottaTrimMat);
            rosette.rotation.x = Math.PI * 0.5;
            rosette.position.set(jx, ry, 0.32);
            g.add(rosette);
        }
    });

    // Horizontal lintel architrave with rosette medallions (y = 3.56m .. 4.02m)
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(portalOuterW, 0.46, 0.32), terraCottaMat);
    lintel.position.set(0, 3.79, 0.17);
    lintel.castShadow = true;
    g.add(lintel);

    for (let rx = -1.12; rx <= 1.12; rx += 0.56) {
        const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 12), terraCottaTrimMat);
        rosette.rotation.x = Math.PI * 0.5;
        rosette.position.set(rx, 3.79, 0.34);
        g.add(rosette);
    }

    // 6. Carved "COUNTY BUILDING" Frieze Panel above Lintel (y = 4.02m .. 4.46m)
    const friezePanel = new THREE.Mesh(new THREE.BoxGeometry(openW + 0.20, 0.44, 0.30), countyBuildingFriezeMat);
    friezePanel.position.set(0, 4.24, 0.18);
    friezePanel.castShadow = true;
    g.add(friezePanel);

    // 7. Two Large Scrolled Acanthus Console Brackets (Ancones) flanking the Portal (e1887b4f.jpg)
    [-openW * 0.5 - 0.30, openW * 0.5 + 0.30].forEach((bx) => {
        const consoleBody = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.18, 0.46), terraCottaTrimMat);
        consoleBody.position.set(bx, 3.92, 0.28);
        consoleBody.castShadow = true;
        g.add(consoleBody);

        // Upper & lower volute scroll cylinders on the console bracket
        const topScroll = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.35, 12), terraCottaMat);
        topScroll.rotation.z = Math.PI * 0.5;
        topScroll.position.set(bx, 4.34, 0.46);
        g.add(topScroll);

        const botScroll = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 12), terraCottaMat);
        botScroll.rotation.z = Math.PI * 0.5;
        botScroll.position.set(bx, 3.40, 0.42);
        g.add(botScroll);
    });

    // 8. Projecting Dentiled Cornice Hood over the Entrance (y = 4.46m .. 4.86m)
    const hoodW = portalOuterW + 0.48;
    const hoodCorona = new THREE.Mesh(new THREE.BoxGeometry(hoodW, 0.28, 0.68), terraCottaTrimMat);
    hoodCorona.position.set(0, 4.68, 0.32);
    hoodCorona.castShadow = true;
    g.add(hoodCorona);

    // Dentil course under the entrance cornice hood
    const numHoodDentils = 18;
    for (let i = 0; i < numHoodDentils; i++) {
        const dx = -hoodW * 0.45 + (i / (numHoodDentils - 1)) * (hoodW * 0.90);
        const dent = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.46), terraCottaMat);
        dent.position.set(dx, 4.49, 0.26);
        g.add(dent);
    }

    // 9. Sculpted Corner Palmette Acroteria & Central Pedestal with White Globe Lantern atop Hood (e1887b4f.jpg, edf7b17e.jpg)
    [-hoodW * 0.44, hoodW * 0.44].forEach((ax) => {
        const acroBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.28), terraCottaTrimMat);
        acroBase.position.set(ax, 4.95, 0.48);
        g.add(acroBase);

        const acroFan = new THREE.Mesh(new THREE.ConeGeometry(0.20, 0.36, 7), terraCottaMat);
        acroFan.scale.set(1.0, 1.0, 0.5);
        acroFan.position.set(ax, 5.20, 0.48);
        g.add(acroFan);
    });

    // Central classical sculpted pedestal + white globe lamp at y = 4.82m .. 5.82m (e1887b4f.jpg)
    const pedBase = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.46), terraCottaTrimMat);
    pedBase.position.set(0, 5.10, 0.38);
    pedBase.castShadow = true;
    g.add(pedBase);

    const pedCap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.20, 12), terraCottaMat);
    pedCap.position.set(0, 5.46, 0.38);
    g.add(pedCap);

    const globeMat = new THREE.MeshStandardMaterial({
        color: '#f8f6f0',
        emissive: '#ffe6a3',
        emissiveIntensity: 0.35,
        roughness: 0.25
    });
    globeMat.userData = {
        isNightLitLantern: true,
        baseEmissive: 0.35,
        maxEmissive: 2.8,
        nightEmissiveHex: '#ffe6a3'
    };
    const globeOrb = new THREE.Mesh(
        new THREE.SphereGeometry(0.20, 14, 12),
        globeMat
    );
    globeOrb.position.set(0, 5.68, 0.38);
    g.add(globeOrb);

    // Warm architectural entrance light for the Orondo Ave Main Entrance Portal & Double Oak Doors at night
    const portalLight = new THREE.PointLight('#ffcf86', 0, 14, 1.7);
    portalLight.position.set(0, 2.85, 1.35);
    portalLight.visible = false;
    portalLight.userData = { isEntranceNightLight: true, maxIntensity: 2.4 };
    g.add(portalLight);

    // 10. Red Fire-Alarm Horn/Strobe mounted on the rusticated granite to the left of the portal (e1887b4f.jpg)
    const fireStrobe = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.20, 0.10),
        new THREE.MeshStandardMaterial({ color: '#c1121f', roughness: 0.35 })
    );
    fireStrobe.position.set(-openW * 0.5 - jambW - 0.38, 3.68, 0.06);
    g.add(fireStrobe);

    parent.add(g);
}

/**
 * Floor 2 Window set into the Rusticated Gray Granite Ashlar Base
 */
export function buildGraniteBaseWindow(parent, x, y, z, w, h, rotY, graniteMat, frameMat, glassMat) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;

    // Glass pane
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.10, h - 0.10), glassMat);
    glass.position.set(0, 0, 0.02);
    g.add(glass);

    // Dark bronze outer frame + double-hung meeting rail
    const topF = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.08), frameMat);
    topF.position.set(0, h * 0.5 - 0.04, 0.04);
    g.add(topF);

    const botF = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.08), frameMat);
    botF.position.set(0, -h * 0.5 + 0.04, 0.04);
    g.add(botF);

    [-w * 0.5 + 0.04, w * 0.5 - 0.04].forEach((jx) => {
        const sideF = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, 0.08), frameMat);
        sideF.position.set(jx, 0, 0.04);
        g.add(sideF);
    });

    const meetRail = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, 0.07, 0.085), frameMat);
    meetRail.position.set(0, 0.05, 0.045);
    g.add(meetRail);

    // Projecting granite window sill
    const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.22, 0.14, 0.18), graniteMat);
    sill.position.set(0, -h * 0.5 - 0.06, 0.07);
    sill.castShadow = true;
    g.add(sill);

    parent.add(g);
}

/**
 * Recessed Rectangular Window in Golden Brick Upper Stories (Floors 3 & 4)
 */
export function buildRecessedRectWindow(parent, x, y, z, w, h, rotY, frameMat, glassMat, trimMat, hasSill = true) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.08, h - 0.08), glassMat);
    glass.position.set(0, 0, 0.02);
    g.add(glass);

    // Frame + meeting rail
    [-w * 0.5 + 0.04, w * 0.5 - 0.04].forEach((jx) => {
        const jf = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, 0.08), frameMat);
        jf.position.set(jx, 0, 0.04);
        g.add(jf);
    });
    [-h * 0.5 + 0.04, 0.06, h * 0.5 - 0.04].forEach((ry) => {
        const rf = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, 0.08), frameMat);
        rf.position.set(0, ry, 0.04);
        g.add(rf);
    });

    if (hasSill && trimMat) {
        const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.18, 0.12, 0.16), trimMat);
        sill.position.set(0, -h * 0.5 - 0.05, 0.06);
        g.add(sill);
    }

    parent.add(g);
}

/**
 * Floor 5 Attic Window framed in Cream Terra-Cotta Molding
 */
export function buildFriezeAtticWindow(parent, x, y, z, w, h, rotY, frameMat, glassMat, trimMat) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;

    // Cream terra-cotta surround border
    const border = new THREE.Mesh(new THREE.BoxGeometry(w + 0.24, h + 0.24, 0.08), trimMat);
    border.position.set(0, 0, 0.03);
    g.add(border);

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, h - 0.06), glassMat);
    glass.position.set(0, 0, 0.075);
    g.add(glass);

    // Dark window sash frame
    [-w * 0.5 + 0.035, w * 0.5 - 0.035].forEach((jx) => {
        const jf = new THREE.Mesh(new THREE.BoxGeometry(0.07, h, 0.04), frameMat);
        jf.position.set(jx, 0, 0.08);
        g.add(jf);
    });
    [-h * 0.5 + 0.035, h * 0.5 - 0.035].forEach((ry) => {
        const rf = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, 0.04), frameMat);
        rf.position.set(0, ry, 0.08);
        g.add(rf);
    });

    parent.add(g);
}

/**
 * Floor 5 Recessed Brick Spandrel Panel framed in Raised Cream Terra-Cotta Moldings (edf7b17e.jpg)
 */
function buildFriezeRecessedBrickPanel(parent, x, y, z, w, h, rotY, brickMat, trimMat) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;

    // Outer cream terra-cotta molding frame
    const frameThick = 0.12;
    [-w * 0.5 + frameThick * 0.5, w * 0.5 - frameThick * 0.5].forEach((fx) => {
        const vBar = new THREE.Mesh(new THREE.BoxGeometry(frameThick, h, 0.10), trimMat);
        vBar.position.set(fx, 0, 0.05);
        g.add(vBar);
    });
    [-h * 0.5 + frameThick * 0.5, h * 0.5 - frameThick * 0.5].forEach((fy) => {
        const hBar = new THREE.Mesh(new THREE.BoxGeometry(w, frameThick, 0.10), trimMat);
        hBar.position.set(0, fy, 0.05);
        g.add(hBar);
    });

    parent.add(g);
}

/**
 * Projecting Classical Cream Terra-Cotta Cornice with Dentil Band & Scrolled Modillion Brackets (y = 16.45m .. 17.25m)
 */
export function buildClassicalModillionCornice(parent, x, z, length, rotY, terraMat, trimMat) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;

    // 1. Lower Bed Molding & Dentil Course (y = 16.45m .. 16.72m)
    const bedMold = new THREE.Mesh(new THREE.BoxGeometry(length - 0.40, 0.24, 0.36), terraMat);
    bedMold.position.set(0, 16.57, 0.16);
    bedMold.castShadow = true;
    g.add(bedMold);

    // 2. Overhanging Corona & Cymatium Cap (y = 16.92m .. 17.26m, projecting +0.76m outward)
    const corona = new THREE.Mesh(new THREE.BoxGeometry(length, 0.34, 0.86), trimMat);
    corona.position.set(0, 17.09, 0.38);
    corona.castShadow = true;
    corona.receiveShadow = true;
    g.add(corona);

    // 3. Closely-Spaced Scrolled Modillion Brackets under the Corona Overhang (y = 16.68m .. 16.94m)
    const spacing = 0.72;
    const count = Math.max(4, Math.floor((length - 0.80) / spacing));
    const span = (count - 1) * spacing;
    for (let i = 0; i < count; i++) {
        const bx = -span * 0.5 + i * spacing;
        const modBracket = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.62), trimMat);
        modBracket.position.set(bx, 16.81, 0.30);
        modBracket.castShadow = true;
        g.add(modBracket);

        const modScroll = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.24, 8), terraMat);
        modScroll.rotation.z = Math.PI * 0.5;
        modScroll.position.set(bx, 16.72, 0.52);
        g.add(modScroll);
    }

    parent.add(g);
}

