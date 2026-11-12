import * as THREE from 'three';

/**
 * Building 401 (Law & Justice / Regional Justice Center, 401 Washington St) — 5-Story Structural Massing,
 * Washington St & South Sidewalls, NW Cylindrical Tower, 2-Story SW Addition, Square Corner Evidence Room,
 * 401–350 Precast Skybridge Connector, and Detailed Bright White Elastomeric Rooftop
 *
 * Modeled directly from reference photographs:
 * - f17b4121.jpg, f0a3a41e.jpg, 109ba9fd.jpg (Washington St brick sidewall, twin security ribbon window bands,
 *   5th-floor continuous dark clerestory & light-grey precast concrete fascia, NW cylindrical concrete tower,
 *   and recessed precast connector to Building 350)
 * - 358e2515.jpg & 4fd0b292.jpg (Aerial view of bright white roof deck, East square elevator/mechanical penthouse
 *   with door & stairs, long central raised roof monitor, West D-shaped security grille recreation deck,
 *   8-fan HVAC chiller unit, South sidewall arched detention window groups, 2-story SW addition wing, and the
 *   1-story Square Corner Evidence Room with fenced roof deck & center exhaust unit)
 */
export function buildBuilding401Structure(arch, building, mats, yGrade) {
    const {
        brickWallMat,
        precastPanelMat,
        cylindricalTowerMat,
        concretePlinthMat,
        copingDarkMat,
        roofMembraneMat,
        darkSecurityGlassMat,
        frostedSecurityGlassMat,
        clerestoryGlassMat,
        darkBronzeFrameMat,
        louverDarkMat,
        blackMetalMat,
        silverMetalMat,
        whiteMetalMat,
        chainLinkGateMat,
        evidenceConcreteMat,
        swRibbedSidingMat,
        circularLouverMat,
        lawEnforcementArrowSignMat,
        noParkingSignMat
    } = mats;

    const addBox = (w, h, d, x, y, z, mat, parent = arch, selectable = false) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (selectable) {
            mesh.userData = { isSelectableBuilding: true, building };
        }
        parent.add(mesh);
        return mesh;
    };

    // =========================================================================
    // 1. MAIN 5-STORY RECTANGULAR BLOCK (lx = -12.00m .. +51.70m, lz = -9.20m .. +17.85m)
    //    - Sub-grade + concrete plinth base: y = -5.50m .. +0.42m
    //    - Main reddish-brown brick shaft (Floors 1–4): y = +0.42m .. +14.60m
    //    - 5th-Floor recessed dark clerestory window band: y = +14.60m .. +16.10m (wraps all 4 sides!)
    //    - Top light-grey precast concrete penthouse fascia: y = +16.10m .. +19.10m (wraps all 4 sides!)
    // =========================================================================
    const mainMinX = -12.00;
    const mainMaxX = 51.70;
    const mainW = mainMaxX - mainMinX; // 63.70m
    const mainCX = (mainMinX + mainMaxX) * 0.5; // +19.85m

    const mainMinZ = -9.20;
    const mainMaxZ = 17.85;
    const mainD = mainMaxZ - mainMinZ; // 27.05m
    const mainCZ = (mainMinZ + mainMaxZ) * 0.5; // +4.325m

    const subBottomY = -5.50;
    const plinthTopY = 0.42;
    const brickTopY = 14.60;
    const clerestoryTopY = 16.10;
    const parapetTopY = 19.10;
    const roofDeckY = 18.35;

    // 1A. Sub-grade & Concrete Foundation Water-Table Plinth (y = -5.50m .. +0.42m)
    const plinthH = plinthTopY - subBottomY;
    addBox(mainW + 0.12, plinthH, mainD, mainCX, subBottomY + plinthH * 0.5, mainCZ + 0.06, concretePlinthMat, arch, true);

    const fndFootingMat = new THREE.MeshStandardMaterial({
        color: '#b8b2a6',
        roughness: 0.88,
        metalness: 0.03
    });

    // Graded concrete water-table ledge & stepped foundation footing curb along the Washington St (+Z) sidewall (109ba9fd.jpg)
    const plinthSegs = 18;
    for (let i = 0; i < plinthSegs; i++) {
        const x0 = mainMinX + (i / plinthSegs) * mainW;
        const x1 = mainMinX + ((i + 1) / plinthSegs) * mainW;
        const xm = (x0 + x1) * 0.5;
        const yg = yGrade(xm, mainMaxZ);
        const topP = Math.max(plinthTopY, yg + 0.38);
        const hP = topP - (yg - 0.45);
        addBox(x1 - x0 + 0.02, hP, 0.12, xm, (yg - 0.45) + hP * 0.5, mainMaxZ + 0.05, concretePlinthMat);
        // Stepped structural foundation footing sill at grade
        const hF = (yg + 0.18) - (yg - 0.55);
        addBox(x1 - x0 + 0.03, hF, 0.24, xm, (yg - 0.55) + hF * 0.5, mainMaxZ + 0.11, fndFootingMat);
    }

    // Graded concrete water-table plinth & stepped foundation footing along the South (-Z) wall (lx = -7.40m .. +51.70m, lz = -9.20m)
    const southPlinthMinX = -7.40;
    const southPlinthW = mainMaxX - southPlinthMinX;
    const southPlinthSegs = 24;
    for (let i = 0; i < southPlinthSegs; i++) {
        const x0 = southPlinthMinX + (i / southPlinthSegs) * southPlinthW;
        const x1 = southPlinthMinX + ((i + 1) / southPlinthSegs) * southPlinthW;
        const xm = (x0 + x1) * 0.5;
        const yg = yGrade(xm, mainMinZ);
        // Cap the plinth top below the lower-level window sill (y = +0.15m) along the lawn/lava-rock bed,
        // and drop to the First Floor slab level (-0.95m) inside the sunken East 1st-floor entrance courtyard (lx >= +35.60m)
        const topP = xm < -4.00
            ? (yg + 0.08)
            : (xm < 35.60 ? Math.min(yg + 0.14, 0.12) : -0.95);
        const botP = Math.min(yg - 0.65, -1.40);
        const hP = Math.max(0.15, topP - botP);
        addBox(x1 - x0 + 0.02, hP, 0.14, xm, botP + hP * 0.5, mainMinZ - 0.05, concretePlinthMat);
        const topF = xm < -4.00
            ? (yg + 0.04)
            : (xm < 35.60 ? Math.min(yg + 0.08, 0.06) : -0.99);
        const hF = Math.max(0.15, topF - (botP - 0.10));
        addBox(x1 - x0 + 0.03, hF, 0.24, xm, (botP - 0.10) + hF * 0.5, mainMinZ - 0.10, fndFootingMat);
    }

    // Graded concrete water-table plinth & stepped foundation footing along the East (+X) wall (lx = +51.70m, lz = -9.20m .. +17.85m)
    const eastPlinthSegs = 10;
    for (let i = 0; i < eastPlinthSegs; i++) {
        const z0 = mainMinZ + (i / eastPlinthSegs) * mainD;
        const z1 = mainMinZ + ((i + 1) / eastPlinthSegs) * mainD;
        const zm = (z0 + z1) * 0.5;
        const yg = yGrade(mainMaxX, zm);
        const topP = Math.max(plinthTopY, yg + 0.38);
        const hP = topP - (yg - 0.50);
        addBox(0.14, hP, z1 - z0 + 0.02, mainMaxX + 0.05, (yg - 0.50) + hP * 0.5, zm, concretePlinthMat);
        const hF = (yg + 0.18) - (yg - 0.60);
        addBox(0.26, hF, z1 - z0 + 0.03, mainMaxX + 0.11, (yg - 0.60) + hF * 0.5, zm, fndFootingMat);
    }

    // Graded concrete foundation plinth & stepped footing around the 1-Story Utility Bay (lx = 13.60..20.40, lz = 17.85..20.45)
    {
        const uMinX = 13.60, uMaxX = 20.40, uMaxZ = 20.45;
        const uW = uMaxX - uMinX, uCX = (uMinX + uMaxX) * 0.5;
        const ygU = yGrade(uCX, uMaxZ);
        addBox(uW + 0.16, 0.68, 0.14, uCX, ygU + 0.04, uMaxZ + 0.05, concretePlinthMat);
        addBox(uW + 0.28, 0.58, 0.26, uCX, ygU - 0.10, uMaxZ + 0.11, fndFootingMat);
        for (const ux of [uMinX, uMaxX]) {
            const sgn = ux === uMinX ? -1 : 1;
            const ygS = yGrade(ux, 19.15);
            addBox(0.14, 0.68, 2.65, ux + sgn * 0.05, ygS + 0.04, 19.15, concretePlinthMat);
            addBox(0.26, 0.58, 2.75, ux + sgn * 0.11, ygS - 0.10, 19.15, fndFootingMat);
        }
    }

    // Graded concrete foundation plinth & stepped footing around the 90° Quarter-Circle Curved West Corner,
    // Straight West Precast Wall (lx = -12.00m, lz = -1.20m .. +10.85m), SW Brick Wing (lx = -15.60m .. -12.00m, lz = -9.20m .. -1.20m),
    // and 1-Story Square Corner Evidence Room (lx = -15.60m .. -7.40m, lz = -17.98m .. -9.20m)
    {
        // 1) 90° Quarter-Circle Curved West Corner Foundation Plinth & Stepped Footing (R = 7.00m around (-5.00, +10.85))
        const cArcCX = -5.00, cArcCZ = 10.85, cArcR = 7.00, cArcSegs = 12;
        for (let i = 0; i < cArcSegs; i++) {
            const a0 = Math.PI * 0.5 + (i / cArcSegs) * (Math.PI * 0.5);
            const a1 = Math.PI * 0.5 + ((i + 1) / cArcSegs) * (Math.PI * 0.5);
            const am = (a0 + a1) * 0.5;
            const segLen = 2 * (cArcR + 0.08) * Math.sin((a1 - a0) * 0.5) + 0.04;
            const px = cArcCX + (cArcR + 0.06) * Math.cos(am);
            const pz = cArcCZ + (cArcR + 0.06) * Math.sin(am);
            const yg = yGrade(px, pz);
            const pMesh = addBox(segLen, 0.78, 0.14, px, yg + 0.02, pz, concretePlinthMat);
            pMesh.rotation.y = Math.PI * 0.5 - am;
            const fx = cArcCX + (cArcR + 0.13) * Math.cos(am);
            const fz = cArcCZ + (cArcR + 0.13) * Math.sin(am);
            const fMesh = addBox(segLen + 0.04, 0.62, 0.26, fx, yg - 0.12, fz, fndFootingMat);
            fMesh.rotation.y = Math.PI * 0.5 - am;
        }
        // 2) Straight West Precast Wall Foundation Plinth & Footing (lx = -12.00m, lz = -1.20m .. +10.85m)
        const westSegs = 5;
        for (let i = 0; i < westSegs; i++) {
            const z0 = -1.20 + (i / westSegs) * 12.05;
            const z1 = -1.20 + ((i + 1) / westSegs) * 12.05;
            const zm = (z0 + z1) * 0.5;
            const yg = yGrade(-12.00, zm);
            addBox(0.14, 0.78, z1 - z0 + 0.02, -12.06, yg + 0.02, zm, concretePlinthMat);
            addBox(0.26, 0.62, z1 - z0 + 0.03, -12.12, yg - 0.12, zm, fndFootingMat);
        }
        // 3) SW Brick Wing North Return (lz = -1.20m, lx = -15.60m .. -12.00m) & West Face (lx = -15.60m, lz = -9.20m .. -1.20m)
        const ygSwN = yGrade(-13.80, -1.20);
        addBox(3.64, 0.78, 0.14, -13.80, ygSwN + 0.02, -1.14, concretePlinthMat);
        addBox(3.72, 0.62, 0.26, -13.80, ygSwN - 0.12, -1.08, fndFootingMat);
        for (let i = 0; i < 4; i++) {
            const z0 = -9.20 + (i / 4) * 8.00;
            const z1 = -9.20 + ((i + 1) / 4) * 8.00;
            const zm = (z0 + z1) * 0.5;
            const yg = yGrade(-15.60, zm);
            addBox(0.14, 0.78, z1 - z0 + 0.02, -15.65, yg + 0.02, zm, concretePlinthMat);
            addBox(0.26, 0.62, z1 - z0 + 0.03, -15.71, yg - 0.12, zm, fndFootingMat);
        }
        // 4) 1-Story Square Corner Evidence Room South (lz = -17.98m, lx = -15.60m .. -7.40m) & East (lx = -7.40m, lz = -17.98m .. -9.20m)
        for (let i = 0; i < 4; i++) {
            const x0 = -15.60 + (i / 4) * 8.20;
            const x1 = -15.60 + ((i + 1) / 4) * 8.20;
            const xm = (x0 + x1) * 0.5;
            const yg = yGrade(xm, -17.98);
            addBox(x1 - x0 + 0.02, 0.78, 0.14, xm, yg + 0.02, -18.03, concretePlinthMat);
            addBox(x1 - x0 + 0.03, 0.62, 0.26, xm, yg - 0.12, -18.09, fndFootingMat);
        }
        for (let i = 0; i < 4; i++) {
            const z0 = -17.98 + (i / 4) * 8.78;
            const z1 = -17.98 + ((i + 1) / 4) * 8.78;
            const zm = (z0 + z1) * 0.5;
            const yg = yGrade(-7.40, zm);
            addBox(0.14, 0.78, z1 - z0 + 0.02, -7.35, yg + 0.02, zm, concretePlinthMat);
            addBox(0.26, 0.62, z1 - z0 + 0.03, -7.29, yg - 0.12, zm, fndFootingMat);
        }
    }

    // Small dark foundation vent grilles along the east half of the Washington St plinth (109ba9fd.jpg)
    for (const vx of [23.5, 31.0, 39.5, 47.0]) {
        const yg = yGrade(vx, mainMaxZ);
        addBox(0.58, 0.24, 0.12, vx, yg + 0.20, mainMaxZ + 0.05, louverDarkMat);
    }

    // 1B. Main Running-Bond Reddish-Brown Brick Body (y = +0.42m .. +14.60m)
    const brickH = brickTopY - plinthTopY; // 14.18m
    const mainBrickMesh = addBox(
        mainW,
        brickH,
        mainD,
        mainCX,
        plinthTopY + brickH * 0.5,
        mainCZ,
        brickWallMat,
        arch,
        true
    );
    mainBrickMesh.userData.floorLayer = 2;

    // Vertical masonry control-joint reveal strips dividing the 63.7m brick wall into 10 structural bays
    const bayCount = 10;
    const baySpan = mainW / bayCount; // 6.37m
    const jointMat = new THREE.MeshStandardMaterial({ color: '#63412c', roughness: 0.90 });
    for (let b = 1; b < bayCount; b++) {
        const jx = mainMinX + b * baySpan;
        addBox(0.05, brickH, 0.04, jx, plinthTopY + brickH * 0.5, mainMaxZ + 0.015, jointMat);
        addBox(0.05, brickH, 0.04, jx, plinthTopY + brickH * 0.5, mainMinZ - 0.015, jointMat);
    }

    const winCoverGrp = new THREE.Group();
    winCoverGrp.userData.hideOnCutaway = true;
    arch.add(winCoverGrp);

    // 1C. Floor 5 Recessed Dark-Tinted Clerestory Ribbon Window Band (y = +14.60m .. +16.10m, wraps all 4 sides — 358e2515.jpg, 109ba9fd.jpg)
    const clereH = clerestoryTopY - brickTopY; // 1.50m
    const clereCY = brickTopY + clereH * 0.5; // +15.35m
    // Inset slightly (0.18m) behind the brick & upper precast faces so the upper precast fascia overhangs crisp and deep
    addBox(mainW - 0.36, clereH, mainD - 0.36, mainCX, clereCY, mainCZ, clerestoryGlassMat, winCoverGrp, true);

    // Precast sill ledge at y = +14.60m under the 5th-floor clerestory band
    addBox(mainW + 0.08, 0.12, mainD + 0.08, mainCX, brickTopY + 0.04, mainCZ, concretePlinthMat);

    // Dark vertical structural mullions along the 5th-floor clerestory ribbon window on North (+Z), South (-Z), East (+X) & West (-X)
    const mullionStep = 1.32;
    for (let mx = mainMinX + 1.20; mx <= mainMaxX - 1.20; mx += mullionStep) {
        addBox(0.06, clereH, 0.12, mx, clereCY, mainMaxZ - 0.14, darkBronzeFrameMat, winCoverGrp);
        addBox(0.06, clereH, 0.12, mx, clereCY, mainMinZ + 0.14, darkBronzeFrameMat, winCoverGrp);
    }
    for (let mz = mainMinZ + 1.20; mz <= mainMaxZ - 1.20; mz += mullionStep) {
        addBox(0.12, clereH, 0.06, mainMaxX - 0.14, clereCY, mz, darkBronzeFrameMat, winCoverGrp);
        addBox(0.12, clereH, 0.06, mainMinX + 0.14, clereCY, mz, darkBronzeFrameMat, winCoverGrp);
    }
    // Corner brick piers at the 4 corners of the 5th-floor clerestory level (visible in 358e2515.jpg & 109ba9fd.jpg)
    for (const [cxCorner, czCorner] of [
        [mainMinX + 0.55, mainMaxZ - 0.55],
        [mainMaxX - 0.55, mainMaxZ - 0.55],
        [mainMinX + 0.55, mainMinZ + 0.55],
        [mainMaxX - 0.55, mainMinZ + 0.55]
    ]) {
        addBox(1.10, clereH, 1.10, cxCorner, clereCY, czCorner, brickWallMat);
    }

    // 1D. Top Light-Grey Precast Concrete Penthouse Fascia & Parapet (y = +16.10m .. +19.10m, 358e2515.jpg, f0a3a41e.jpg, 109ba9fd.jpg)
    const precastH = roofDeckY - clerestoryTopY; // 2.25m solid up to roofDeckY
    addBox(mainW + 0.08, precastH, mainD + 0.08, mainCX, clerestoryTopY + precastH * 0.5, mainCZ, precastPanelMat, arch, true);

    // Bright White Elastomeric Main Roof Deck Slab at y = roofDeckY (18.35m, 358e2515.jpg)
    addBox(mainW - 0.70, 0.24, mainD - 0.70, mainCX, roofDeckY + 0.12, mainCZ, roofMembraneMat);

    // Perimeter Precast Parapet Walls rising above roofDeckY to parapetTopY (19.10m) with white inner lining & dark metal coping cap
    const paraWallH = parapetTopY - roofDeckY; // 0.75m
    const paraWallCY = roofDeckY + paraWallH * 0.5;
    const pThick = 0.42;
    // North (+Z) & South (-Z) parapet walls
    addBox(mainW + 0.08, paraWallH, pThick, mainCX, paraWallCY, mainMaxZ - pThick * 0.5 + 0.04, precastPanelMat);
    addBox(mainW + 0.16, 0.09, pThick + 0.08, mainCX, parapetTopY + 0.045, mainMaxZ - pThick * 0.5 + 0.04, copingDarkMat);
    addBox(mainW + 0.08, paraWallH, pThick, mainCX, paraWallCY, mainMinZ + pThick * 0.5 - 0.04, precastPanelMat);
    addBox(mainW + 0.16, 0.09, pThick + 0.08, mainCX, parapetTopY + 0.045, mainMinZ + pThick * 0.5 - 0.04, copingDarkMat);
    // East (+X) & West (-X) parapet walls
    addBox(pThick, paraWallH, mainD + 0.08, mainMaxX - pThick * 0.5 + 0.04, paraWallCY, mainCZ, precastPanelMat);
    addBox(pThick + 0.08, 0.09, mainD + 0.16, mainMaxX - pThick * 0.5 + 0.04, parapetTopY + 0.045, mainCZ, copingDarkMat);
    addBox(pThick, paraWallH, mainD + 0.08, mainMinX + pThick * 0.5 - 0.04, paraWallCY, mainCZ, precastPanelMat);
    addBox(pThick + 0.08, 0.09, mainD + 0.16, mainMinX + pThick * 0.5 - 0.04, parapetTopY + 0.045, mainCZ, copingDarkMat);

    // Vertical panel joint grooves on the light-grey precast top fascia (f0a3a41e.jpg, 109ba9fd.jpg)
    const precastJointMat = new THREE.MeshStandardMaterial({ color: '#8d939a', roughness: 0.85 });
    for (let b = 1; b < bayCount; b++) {
        const jx = mainMinX + b * baySpan;
        addBox(0.06, parapetTopY - clerestoryTopY, 0.05, jx, (clerestoryTopY + parapetTopY) * 0.5, mainMaxZ + 0.045, precastJointMat);
        addBox(0.06, parapetTopY - clerestoryTopY, 0.05, jx, (clerestoryTopY + parapetTopY) * 0.5, mainMinZ - 0.045, precastJointMat);
    }

    // Rooftop Corner J-Mount Security Cameras at NW & NE Parapet Corners (f0a3a41e.jpg, 109ba9fd.jpg)
    for (const camX of [mainMinX + 0.25, mainMaxX - 0.25]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.85, 8), whiteMetalMat);
        pole.position.set(camX, parapetTopY + 0.42, mainMaxZ + 0.08);
        arch.add(pole);
        const arm = addBox(0.04, 0.04, 0.32, camX, parapetTopY + 0.82, mainMaxZ + 0.22, whiteMetalMat);
        arm.castShadow = false;
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), whiteMetalMat);
        dome.position.set(camX, parapetTopY + 0.74, mainMaxZ + 0.34);
        arch.add(dome);
    }

    // =========================================================================
    // 2. WASHINGTON ST (+Z) TWO CONTINUOUS NARROW SECURITY RIBBON WINDOW BANDS
    //    (f17b4121.jpg, f0a3a41e.jpg, 109ba9fd.jpg)
    //    - Lower Ribbon Band (Floor 3): y = +5.85m, height = 0.76m
    //    - Upper Ribbon Band (Floor 4): y = +10.15m, height = 0.76m
    //    - Alternating dark tinted & frosted/translucent security glazing panes
    // =========================================================================
    const ribbonStartX = mainMinX + 1.15; // -10.85m
    const ribbonEndX = mainMaxX - 1.15;   // +50.55m
    const ribbonW = ribbonEndX - ribbonStartX; // 61.40m
    const ribbonCX = (ribbonStartX + ribbonEndX) * 0.5;
    const ribbonH = 0.76;
    const paneCount = 52;
    const paneW = ribbonW / paneCount;

    for (const bandY of [5.85, 10.15]) {
        // Continuous dark-bronze window frame & sloped sill along Washington St (+Z)
        addBox(ribbonW + 0.16, ribbonH + 0.12, 0.10, ribbonCX, bandY, mainMaxZ + 0.02, darkBronzeFrameMat, winCoverGrp);
        addBox(ribbonW + 0.20, 0.08, 0.16, ribbonCX, bandY - ribbonH * 0.5 - 0.04, mainMaxZ + 0.05, copingDarkMat, winCoverGrp);

        for (let p = 0; p < paneCount; p++) {
            const px = ribbonStartX + (p + 0.5) * paneW;
            // Deterministic pattern of frosted translucent panes vs dark tinted glass matching f0a3a41e.jpg & 109ba9fd.jpg
            const isFrosted = ((p * 7 + (bandY > 8 ? 3 : 0)) % 5 === 0) || ((p + 2) % 9 === 0);
            const gMat = isFrosted ? frostedSecurityGlassMat : darkSecurityGlassMat;
            addBox(paneW - 0.06, ribbonH - 0.08, 0.08, px, bandY, mainMaxZ + 0.045, gMat, winCoverGrp);
            // Vertical mullion bar
            if (p > 0) {
                addBox(0.05, ribbonH + 0.04, 0.12, ribbonStartX + p * paneW, bandY, mainMaxZ + 0.05, darkBronzeFrameMat, winCoverGrp);
            }
        }
    }

    // =========================================================================
    // 3. SOUTH / REAR SIDEWALL (lz = -9.20m) — MODELED DIRECTLY FROM
    //    502846cd.jpg, a0a53c74.jpg, 531a43ab.jpg, b6dfc1a0.jpg, 40a3a812.jpg, 946aea5c.jpg & ed5b0d70.jpg:
    //    - Three continuous narrow security ribbon window bands at y = +4.65m, +7.35m, +11.65m
    //    - 16 Large Circular Louvered Mechanical Vents (3 groups: 5 West above Evidence Room,
    //      6 Center, 5 East) at y = +9.50m between the middle and upper security ribbon bands
    //    - 4 Dark rectangular LED floodlights along the top South precast coping + SW corner camera
    //    - Poured-concrete lower base wall (y = -1.50m .. +3.55m, lx = -3.80m .. +51.70m) with
    //      deeply recessed "LAW ENFORCEMENT ONLY" entrance alcove right next to the Evidence Room
    //      and continuous lower-level dark-tinted window band
    // =========================================================================
    const southRibbonStartX = -14.55; // Spans full South brick wall from SW corner (-15.60m) behind Evidence Room fence (69d4ba47.jpg, 946aea5c.jpg, ed5b0d70.jpg)
    const southRibbonEndX = mainMaxX - 1.15; // +50.55m
    const southRibbonW = southRibbonEndX - southRibbonStartX; // 65.10m
    const southRibbonCX = (southRibbonStartX + southRibbonEndX) * 0.5;
    const southRibbonH = 0.62;
    const southPaneCount = 52;
    const southPaneW = southRibbonW / southPaneCount;

    for (const sBandY of [4.65, 7.35, 11.65]) {
        // Continuous dark-bronze frame & sloped sill along South brick wall (-Z)
        addBox(southRibbonW + 0.16, southRibbonH + 0.10, 0.10, southRibbonCX, sBandY, mainMinZ - 0.02, darkBronzeFrameMat, winCoverGrp);
        addBox(southRibbonW + 0.20, 0.07, 0.15, southRibbonCX, sBandY - southRibbonH * 0.5 - 0.035, mainMinZ - 0.045, copingDarkMat, winCoverGrp);

        for (let p = 0; p < southPaneCount; p++) {
            const px = southRibbonStartX + (p + 0.5) * southPaneW;
            const isFrosted = ((p * 5 + Math.round(sBandY)) % 4 !== 0);
            const gMat = isFrosted ? frostedSecurityGlassMat : darkSecurityGlassMat;
            addBox(southPaneW - 0.06, southRibbonH - 0.08, 0.08, px, sBandY, mainMinZ - 0.04, gMat, winCoverGrp);
            if (p > 0) {
                addBox(0.05, southRibbonH + 0.04, 0.12, southRibbonStartX + p * southPaneW, sBandY, mainMinZ - 0.045, darkBronzeFrameMat, winCoverGrp);
            }
        }
    }

    // 16 Large Circular Louvered Mechanical Vents on the South Brick Wall at y = +9.50m (502846cd.jpg, 40a3a812.jpg, 946aea5c.jpg, ed5b0d70.jpg!)
    // - West group of 5 vents (directly above the Square Corner Evidence Room at lx = -15.60m .. -7.40m & Law Enforcement Entry)
    // - Center group of 6 vents
    // - East group of 5 vents (125e9212.jpg, d48a4086.jpg, a32eb85e.jpg)
    const southCircularVentXs = [
        // West group (5 circular vents directly above the Evidence Room — 40a3a812.jpg, 946aea5c.jpg, ed5b0d70.jpg)
        -13.20, -11.10, -9.00, -6.90, -4.80,
        // Center group (6 circular vents — 502846cd.jpg, d48a4086.jpg)
        14.80, 16.90, 19.00, 21.10, 23.20, 25.30,
        // East group (5 circular vents — 125e9212.jpg, d48a4086.jpg, a32eb85e.jpg)
        37.40, 39.50, 41.60, 43.70, 45.80
    ];
    const ventY = 9.50;
    const ventR = 0.78;
    for (const vx of southCircularVentXs) {
        // Outer dark-bronze circular collar ring
        const rim = new THREE.Mesh(
            new THREE.CylinderGeometry(ventR + 0.06, ventR + 0.06, 0.12, 24),
            darkBronzeFrameMat
        );
        rim.rotation.x = Math.PI / 2;
        rim.position.set(vx, ventY, mainMinZ - 0.03);
        arch.add(rim);

        // Inner circular horizontal-slatted louver grille disc
        const disc = new THREE.Mesh(
            new THREE.CylinderGeometry(ventR, ventR, 0.14, 24),
            circularLouverMat
        );
        disc.rotation.x = Math.PI / 2;
        disc.rotation.y = Math.PI / 2; // Orient canvas texture louver lines horizontally
        disc.position.set(vx, ventY, mainMinZ - 0.04);
        arch.add(disc);
    }

    // 4 Dark Rectangular LED Wall/Floodlight Fixtures along the South Precast Parapet Coping (502846cd.jpg, 946aea5c.jpg)
    for (const flX of [-5.20, 10.20, 24.60, 39.00]) {
        addBox(0.42, 0.14, 0.28, flX, parapetTopY + 0.12, mainMinZ - 0.12, copingDarkMat);
    }
    // SW Corner Rooftop J-Mount Dome Camera at lx = -15.35m, lz = -9.20m (40a3a812.jpg, 946aea5c.jpg)
    {
        const swCamPole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.75, 8), whiteMetalMat);
        swCamPole.position.set(-15.35, parapetTopY + 0.38, mainMinZ - 0.06);
        arch.add(swCamPole);
        const swCamDome = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 10), whiteMetalMat);
        swCamDome.position.set(-15.35, parapetTopY + 0.68, mainMinZ - 0.22);
        arch.add(swCamDome);
    }

    // Poured-Concrete Lower Base Wall & Lintel along the South Wall east of the Evidence Room (lx = -7.40m .. +51.70m, y = -1.50m .. +3.55m, 502846cd.jpg, b6dfc1a0.jpg)
    // 1) Continuous upper concrete lintel beam (y = +1.60m .. +3.55m) spanning lx = -7.40m .. +51.70m
    addBox(59.10, 1.95, 0.26, 22.15, 2.575, mainMinZ - 0.08, precastPanelMat, arch, true);
    // 2) Deeply Recessed "LAW ENFORCEMENT ONLY" Entrance Alcove immediately east of the Evidence Room (lx = -7.40m .. -4.15m, 531a43ab.jpg & b6dfc1a0.jpg!)
    addBox(3.25, 2.80, 0.22, -5.775, 0.20, mainMinZ - 0.04, louverDarkMat); // Dark recessed entry vestibule shadow
    // Double dark-bronze glass entrance doors inside the alcove (proud of mainBrickMesh & plinth so never occluded!)
    addBox(1.95, 2.25, 0.12, -5.65, 0.45, mainMinZ - 0.10, darkBronzeFrameMat);
    addBox(0.84, 2.08, 0.10, -6.12, 0.45, mainMinZ - 0.12, darkSecurityGlassMat);
    addBox(0.84, 2.08, 0.10, -5.18, 0.45, mainMinZ - 0.12, darkSecurityGlassMat);
    addBox(0.06, 2.18, 0.13, -5.65, 0.45, mainMinZ - 0.12, darkBronzeFrameMat);
    addBox(1.78, 0.05, 0.14, -5.65, 0.40, mainMinZ - 0.15, silverMetalMat);
    // 3) Lower-Level (Floor 1) Dark-Tinted Window Band along the Lawn & Lava Rock Bed (lx = -3.80m .. +35.20m, y = +0.15m .. +1.55m, 502846cd.jpg, a32eb85e.jpg!)
    addBox(0.55, 3.10, 0.26, -4.08, 0.05, mainMinZ - 0.08, precastPanelMat); // Concrete pier between West door alcove & windows
    const sLowWinW = 39.00;
    const sLowWinCX = 15.70;
    addBox(sLowWinW, 1.42, 0.14, sLowWinCX, 0.86, mainMinZ - 0.08, darkSecurityGlassMat, winCoverGrp);
    for (let sx = -3.80; sx <= 35.20; sx += 1.62) {
        addBox(0.06, 1.46, 0.18, sx, 0.86, mainMinZ - 0.09, darkBronzeFrameMat, winCoverGrp);
    }

    // White Wall-Mounted Mini-Split AC Condenser Unit on Brackets on the South Concrete Wall (lx = +30.60m, y = +2.38m, a32eb85e.jpg, 4dee9861.jpg, d48a4086.jpg!)
    addBox(0.92, 0.66, 0.34, 30.60, 2.38, mainMinZ - 0.26, whiteMetalMat);
    addBox(0.06, 0.06, 0.32, 30.22, 2.02, mainMinZ - 0.24, blackMetalMat);
    addBox(0.06, 0.06, 0.32, 30.98, 2.02, mainMinZ - 0.24, blackMetalMat);

    // 4) Sunken 1st-Floor Entrance Alcove & Double Glass Doors at the Red 1st-Floor Courtyard (lx = +35.60m .. +38.80m, full 1st-floor depth y = -0.95m!)
    //    Since the 1st-floor ceiling lintel begins at y = +1.60m, y = -0.95m gives a full 2.55m (8.4ft) 1st-floor story height!
    addBox(0.45, 2.55, 0.26, 35.40, 0.325, mainMinZ - 0.08, precastPanelMat); // West jamb pier of 1st-floor entrance (y = -0.95m .. +1.60m)
    addBox(3.15, 2.50, 0.20, 37.20, 0.30, mainMinZ - 0.04, louverDarkMat);    // Dark recessed Floor 1 doorway alcove (y = -0.95m .. +1.55m)
    // Overhead soffit reveal and threshold sill of the 1st-floor entrance alcove
    addBox(3.15, 0.12, 0.28, 37.20, 1.54, mainMinZ - 0.09, precastPanelMat);
    addBox(3.15, 0.06, 0.30, 37.20, -0.92, mainMinZ - 0.10, concretePlinthMat);
    // Double dark-bronze glass entrance doors & transom sitting directly on the y = -0.95m 1st-floor courtyard slab (y = -0.95m .. +1.45m)
    addBox(2.04, 2.40, 0.14, 37.20, 0.25, mainMinZ - 0.09, darkBronzeFrameMat);
    addBox(0.88, 2.06, 0.12, 36.72, 0.12, mainMinZ - 0.11, darkSecurityGlassMat); // Left door glass
    addBox(0.88, 2.06, 0.12, 37.68, 0.12, mainMinZ - 0.11, darkSecurityGlassMat); // Right door glass
    addBox(1.88, 0.22, 0.12, 37.20, 1.32, mainMinZ - 0.11, darkSecurityGlassMat); // Overhead transom glass
    addBox(0.07, 2.36, 0.15, 37.20, 0.25, mainMinZ - 0.11, darkBronzeFrameMat);   // Center door mullion
    addBox(1.96, 0.06, 0.15, 37.20, 1.18, mainMinZ - 0.11, darkBronzeFrameMat);   // Transom horizontal bar
    addBox(1.80, 0.05, 0.16, 37.20, 0.08, mainMinZ - 0.14, silverMetalMat);       // ADA push-bar hardware at 1st-floor waist height
    // White dome security camera & conduit above the jamb of the East Floor 1 alcove + red fire alarm strobe (18f6e2fc.jpg!)
    const eastAlcoveCam = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 10), whiteMetalMat);
    eastAlcoveCam.position.set(35.85, 2.68, mainMinZ - 0.22);
    arch.add(eastAlcoveCam);
    addBox(0.12, 0.14, 0.08, 35.42, 1.92, mainMinZ - 0.14, new THREE.MeshStandardMaterial({ color: '#d92626', roughness: 0.40 }));

    // 5) Continuation of the Floor 1 Wall, Knee-Wall & Ribbon Windows along the Red 1st-Floor Courtyard (lx = +38.80m .. +51.70m, y = -0.95m .. +1.60m!)
    addBox(0.45, 2.55, 0.26, 39.00, 0.325, mainMinZ - 0.08, precastPanelMat); // Concrete pier between doorway & 1st-floor windows
    // Precast concrete 1st-floor knee-wall below the windows (y = -0.95m .. +0.19m, height = 1.14m / 3.7ft above 1st-floor courtyard slab)
    addBox(10.30, 1.14, 0.26, 44.35, -0.38, mainMinZ - 0.08, precastPanelMat);
    addBox(10.34, 0.07, 0.30, 44.35, 0.17, mainMinZ - 0.10, concretePlinthMat); // Projected concrete window sill cap
    // 1st-floor dark-tinted ribbon windows (y = +0.19m .. +1.57m)
    addBox(10.30, 1.38, 0.14, 44.35, 0.88, mainMinZ - 0.08, darkSecurityGlassMat, winCoverGrp);
    for (let sx = 39.20; sx <= 49.50; sx += 1.47) {
        addBox(0.06, 1.42, 0.18, sx, 0.88, mainMinZ - 0.09, darkBronzeFrameMat, winCoverGrp);
    }
    // East corner 1st-floor concrete wall pier (lx = +49.50m .. +51.70m, y = -0.95m .. +1.60m)
    addBox(2.20, 2.55, 0.26, 50.60, 0.325, mainMinZ - 0.08, precastPanelMat);
    // Continuous concrete base plinth baseboard along the 1st-floor courtyard wall (lx = +38.80m .. +51.70m, y = -0.95m .. -0.77m)
    addBox(12.90, 0.18, 0.30, 45.25, -0.86, mainMinZ - 0.10, concretePlinthMat);

    // West Wall & Stepped Quarter-Round West End: Modeled directly from 69d4ba47.jpg, db99c825.jpg & uploaded_media_1794108940808.jpg!
    // - On the North-West side (lz = +9.20m .. +17.85m), the building's West (-X) wall is at lx = -12.00m,
    //   with the reddish-brown brick and 5th-floor dark clerestory window wrapping around the NW corner.
    // - At lz = +9.20m, the building steps Westward (-X) via a single 90° QUARTER-CIRCLE CURVED PRECAST CORNER
    //   (centered at lx = -12.00m, lz = +5.60m, radius = 3.60m) from (lx = -12.00m, lz = +9.20m) to (lx = -15.60m, lz = +5.60m)!
    // - From (lx = -15.60m, lz = +5.60m) all the way South to the SW corner (lx = -15.60m, lz = -9.20m),
    //   the West (-X) wall runs STRAIGHT along lx = -15.60m:
    //   * Precast concrete along the straight West edge of the Security Grille (lz = -1.20m .. +5.60m),
    //   * Reddish-brown brick + 5th-floor dark clerestory window + top precast fascia from lz = -1.20m to the SW corner (lz = -9.20m)!
    // 5th-floor dark clerestory window wrap-around on the NW corner West (-X) face at lx = -12.00m (lz = +9.20m .. +17.40m, 69d4ba47.jpg & db99c825.jpg!)
    addBox(0.16, clerestoryTopY - brickTopY, 8.20, mainMinX - 0.03, (clerestoryTopY + brickTopY) * 0.5, 13.30, clerestoryGlassMat, winCoverGrp);
    for (let wz = 10.20; wz <= 16.80; wz += 1.10) {
        addBox(0.20, clerestoryTopY - brickTopY + 0.04, 0.06, mainMinX - 0.04, (clerestoryTopY + brickTopY) * 0.5, wz, darkBronzeFrameMat, winCoverGrp);
    }

    // East Wall (lx = +51.70m): In c71d2af9.jpg, the center section (lz = -2.20m .. +12.20m) is clad in
    // smooth light-grey precast concrete panels up to the 5th-floor dark clerestory band, flanked by the
    // SE and NE reddish-brown brick corner piers!
    const eastPrecastD = 14.40; // lz = -2.20m .. +12.20m
    const eastPrecastCZ = 5.00;
    addBox(
        0.18,
        brickTopY - plinthTopY,
        eastPrecastD,
        mainMaxX + 0.04,
        plinthTopY + (brickTopY - plinthTopY) * 0.5,
        eastPrecastCZ,
        precastPanelMat,
        arch,
        true
    );

    // =========================================================================
    // 4. STEPPED WEST END: 90° QUARTER-CIRCLE PRECAST CORNER, STRAIGHT WEST
    //    PRECAST WALL & SW BRICK/CLERESTORY WING (lx = -15.60m .. -12.00m, lz = -9.20m .. +9.20m)
    //    Modeled directly from overhead photo 69d4ba47.jpg, db99c825.jpg, uploaded_media_1794108940808.jpg & 8f231f9e.jpg:
    //    - 4A. 90° Quarter-Circle Curved Precast Corner (centered at lx = -12.00m, lz = +5.60m, radius = 3.60m)
    //          curving from (lx = -12.00m, lz = +9.20m) to (lx = -15.60m, lz = +5.60m)
    //    - 4B. Straight West Precast Concrete Wall (lx = -15.60m .. -12.00m, lz = -1.20m .. +5.60m)
    //          running straight South along the West edge of the Security Grille
    //    - 4C. Straight SW Brick & Clerestory Wing (lx = -15.60m .. -12.00m, lz = -9.20m .. -1.20m)
    //          continuing straight South along lx = -15.60m to the SW corner (lx = -15.60m, lz = -9.20m)!
    // =========================================================================
    const qCurveX = -12.00;
    const qCurveZ = 5.60;
    const qCurveR = 3.60; // Spans lx = -15.60m .. -12.00m and lz = +5.60m .. +9.20m (exact 90° NW quadrant!)
    const qWallTopY = roofDeckY; // 18.35m — crowned by the Quarter-Round Security Grille parapet (18.35m .. 19.27m)
    const qWallH = qWallTopY - subBottomY;

    // 4A. 90° Quarter-Circle Curved Precast Concrete Corner (thetaStart = 1.5*PI, thetaLength = 0.5*PI -> dx in [-R..0], dz in [0..+R])
    const qCylWall = new THREE.Mesh(
        new THREE.CylinderGeometry(qCurveR, qCurveR, qWallH, 24, 1, false, Math.PI * 1.5, Math.PI * 0.5),
        precastPanelMat
    );
    qCylWall.position.set(qCurveX, subBottomY + qWallH * 0.5, qCurveZ);
    qCylWall.castShadow = true;
    qCylWall.receiveShadow = true;
    qCylWall.userData = { isSelectableBuilding: true, building };
    arch.add(qCylWall);

    // 4B. Straight West Precast Concrete Section (lx = -15.60m .. -12.00m, lz = -1.20m .. +5.60m, depth = 6.80m)
    addBox(
        qCurveR,
        qWallH,
        6.80,
        -13.80,
        subBottomY + qWallH * 0.5,
        2.20, // lz = -1.20m .. +5.60m
        precastPanelMat,
        arch,
        true
    );

    // 6 Horizontal Precast Panel Joint Reveal Bands around the 90° Quarter-Circle Corner & Straight West Precast Wall (8f231f9e.jpg!)
    const drumJointMat = new THREE.MeshStandardMaterial({
        color: '#8e8a82',
        roughness: 0.78,
        metalness: 0.08
    });
    for (const jy of [7.40, 9.65, 11.90, 14.15, 16.10, 18.35]) {
        const jArc = new THREE.Mesh(
            new THREE.CylinderGeometry(qCurveR + 0.018, qCurveR + 0.018, 0.045, 24, 1, false, Math.PI * 1.5, Math.PI * 0.5),
            drumJointMat
        );
        jArc.position.set(qCurveX, jy, qCurveZ);
        arch.add(jArc);
        addBox(0.04, 0.045, 6.82, -15.60 - 0.015, jy, 2.20, drumJointMat);
    }

    // Dark horizontal mechanical louver band wrapping the lower-middle of the 90° Quarter-Circle Corner & Straight West Precast Wall (y = +5.35m .. +6.45m, db99c825.jpg & uploaded_media_1794108940808.jpg!)
    const qCylLouver = new THREE.Mesh(
        new THREE.CylinderGeometry(qCurveR + 0.03, qCurveR + 0.03, 1.10, 24, 1, false, Math.PI * 1.5, Math.PI * 0.5),
        louverDarkMat
    );
    qCylLouver.position.set(qCurveX, 5.90, qCurveZ);
    arch.add(qCylLouver);
    addBox(0.08, 1.10, 6.80, -15.60 - 0.02, 5.90, 2.20, louverDarkMat);

    // 4C. Straight South-West Brick & Clerestory Wing (lx = -15.60m .. -12.00m, lz = -9.20m .. -1.20m, depth = 8.00m)
    //     Continues straight South along lx = -15.60m from the SW corner of the Security Grille (lz = -1.20m)
    //     to the SW corner of Building 401 (lx = -15.60m, lz = -9.20m, 69d4ba47.jpg & uploaded_media_1794108940808.jpg!)
    const swExtW = 3.60; // lx = -15.60m .. -12.00m
    const swExtCX = -13.80;
    const swExtD = 8.00; // lz = -9.20m .. -1.20m
    const swExtCZ = -5.20;

    // Concrete plinth & reddish-brown brick body of SW section
    addBox(swExtW, plinthTopY - subBottomY, swExtD, swExtCX, (plinthTopY + subBottomY) * 0.5, swExtCZ, concretePlinthMat, arch, true);
    addBox(swExtW, brickTopY - plinthTopY, swExtD, swExtCX, (brickTopY + plinthTopY) * 0.5, swExtCZ, brickWallMat, arch, true);
    // 5th-floor recessed dark clerestory window band on SW section (y = 14.60m .. 16.10m)
    addBox(swExtW - 0.14, clerestoryTopY - brickTopY, swExtD - 0.14, swExtCX + 0.07, (clerestoryTopY + brickTopY) * 0.5, swExtCZ + 0.07, clerestoryGlassMat);
    for (let wz = -8.20; wz <= -2.20; wz += 1.20) {
        addBox(0.18, clerestoryTopY - brickTopY + 0.04, 0.06, -15.60 + 0.02, (clerestoryTopY + brickTopY) * 0.5, wz, darkBronzeFrameMat);
    }
    // Top 5th-floor precast concrete fascia (y = 16.10m .. 19.10m), dark coping & flat white roof deck (y = 18.35m)
    addBox(swExtW, parapetTopY - clerestoryTopY, swExtD, swExtCX, (parapetTopY + clerestoryTopY) * 0.5, swExtCZ, precastPanelMat, arch, true);
    addBox(swExtW - 0.30, 0.14, swExtD - 0.30, swExtCX + 0.15, roofDeckY + 0.07, swExtCZ, roofMembraneMat);
    addBox(0.38, parapetTopY - roofDeckY, swExtD, -15.60 + 0.19, (parapetTopY + roofDeckY) * 0.5, swExtCZ, precastPanelMat);
    addBox(swExtW, parapetTopY - roofDeckY, 0.38, swExtCX, (parapetTopY + roofDeckY) * 0.5, mainMinZ + 0.19, precastPanelMat);
    addBox(0.46, 0.10, swExtD + 0.08, -15.60 + 0.19, parapetTopY + 0.05, swExtCZ, copingDarkMat);
    addBox(swExtW + 0.08, 0.10, 0.46, swExtCX, parapetTopY + 0.05, mainMinZ + 0.19, copingDarkMat);

    // =========================================================================
    // 5. 1-STORY SQUARE CORNER EVIDENCE ROOM BUNKER
    //    Modeled directly from close-up photos 531a43ab.jpg, b6dfc1a0.jpg, a0a53c74.jpg,
    //    40a3a812.jpg, 946aea5c.jpg & ed5b0d70.jpg:
    //    - Sits at the SW corner of the 5-story brick building (lx = -12.00m .. -3.80m, lz = -17.98m .. -9.20m)
    //      directly beneath the West group of 5 circular louver vents
    //    - Connects directly and flush at lx = -12.00m, lz = -17.98m with the East wall of the
    //      West Wing's tan corrugated SE Connector Wing (no fake intermediate 2-story block!)
    //    - Horizontal form-joint reveal groove 0.85m below top edge (y = +3.00m)
    //    - East wall scupper slot, flared collector box & vertical bronze-tan downspout pipe with straps & PVC boot
    //    - SE corner PTZ dome security camera on white corner bracket + 2 wall security lights
    //    - Brown/white "↑ LAW ENFORCEMENT ONLY" directional sign plaque at SE corner
    //    - Black chain-link security fence around the roof deck with 45° outward 3-strand barbed-wire outrigger arms
    //    - West tall galvanized chain-link security screen at lx = -12.00m connecting up to the SE Connector Wing
    //    - Center square rooftop exhaust fan unit on the flat dark-grey roof deck
    // =========================================================================
    const evMinX = -15.60; // Collinear with Building 401 SW corner (-15.60m) and West Wing SE Connector East wall (connMaxX = +15.80m = lx_401 = -15.60m)!
    const evMaxX = -7.40;
    const evW = evMaxX - evMinX; // 8.20m
    const evCX = (evMinX + evMaxX) * 0.5; // -11.50m
    const evMinZ = -17.98; // Flush with West Wing SE Connector South wall (connMinZ = -20.09m = lz_401 = -17.98m)!
    const evMaxZ = -9.20;
    const evD = evMaxZ - evMinZ; // 8.78m
    const evCZ = (evMinZ + evMaxZ) * 0.5; // -13.59m
    const evRoofY = 3.85; // 1-story bunker roof height

    const evidenceRoofMat = new THREE.MeshStandardMaterial({
        color: '#6e7680',
        roughness: 0.82,
        metalness: 0.08
    });
    const downspoutBronzeMat = new THREE.MeshStandardMaterial({
        color: '#6b604e',
        roughness: 0.48,
        metalness: 0.52
    });

    // Solid 1-Story Square Corner Evidence Room Poured-Concrete Bunker Mass
    addBox(
        evW,
        evRoofY - subBottomY,
        evD,
        evCX,
        (evRoofY + subBottomY) * 0.5,
        evCZ,
        evidenceConcreteMat,
        arch,
        true
    );

    // Physical 3D Horizontal Form-Joint Reveal Groove at y = +3.00m around East & South faces (531a43ab.jpg!)
    addBox(evW + 0.05, 0.04, 0.04, evCX, 3.00, evMinZ - 0.015, copingDarkMat);
    addBox(0.04, 0.04, evD + 0.05, evMaxX + 0.015, 3.00, evCZ, copingDarkMat);

    // Flat Dark-Grey Roof Deck & Perimeter Concrete Curb on the Evidence Room (4fd0b292.jpg)
    addBox(evW - 0.36, 0.12, evD - 0.36, evCX, evRoofY + 0.06, evCZ, evidenceRoofMat);
    const evCurbH = 0.22;
    addBox(evW, evCurbH, 0.24, evCX, evRoofY + evCurbH * 0.5, evMinZ + 0.12, evidenceConcreteMat);
    addBox(0.24, evCurbH, evD, evMaxX - 0.12, evRoofY + evCurbH * 0.5, evCZ, evidenceConcreteMat);

    // East Face Scupper Slot, Leader-Head Collector Box & Vertical Bronze-Tan Downspout (531a43ab.jpg & b6dfc1a0.jpg!)
    const dsZ = -13.10;
    // Dark rectangular scupper opening in the concrete wall at y = +2.92m
    addBox(0.08, 0.18, 0.38, evMaxX + 0.02, 2.92, dsZ, copingDarkMat);
    // Flared metal collector box (leader head) below scupper
    addBox(0.22, 0.28, 0.34, evMaxX + 0.10, 2.72, dsZ, downspoutBronzeMat);
    // Vertical downspout pipe running down to the concrete apron
    const dsBotY = yGrade(evMaxX + 0.10, dsZ);
    const dsPipeH = 2.60 - dsBotY;
    const dsPipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.048, dsPipeH, 10),
        downspoutBronzeMat
    );
    dsPipe.position.set(evMaxX + 0.10, dsBotY + dsPipeH * 0.5, dsZ);
    dsPipe.castShadow = true;
    arch.add(dsPipe);
    // White PVC lower drain boot at the bottom of the downspout (531a43ab.jpg!)
    const dsBoot = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.32, 10), whiteMetalMat);
    dsBoot.position.set(evMaxX + 0.10, dsBotY + 0.16, dsZ);
    arch.add(dsBoot);
    // 3 horizontal pipe-clamp straps securing the downspout to the concrete wall
    for (const strapY of [0.85, 1.65, 2.35]) {
        addBox(0.14, 0.04, 0.16, evMaxX + 0.06, strapY, dsZ, blackMetalMat);
    }

    // SE Corner PTZ Security Dome Camera on White Wrap-Around Corner Bracket (531a43ab.jpg, b6dfc1a0.jpg, 40a3a812.jpg!)
    addBox(0.22, 0.20, 0.22, evMaxX + 0.04, evRoofY - 0.18, evMinZ - 0.04, whiteMetalMat);
    addBox(0.10, 0.08, 0.28, evMaxX + 0.14, evRoofY - 0.14, evMinZ - 0.14, whiteMetalMat);
    const evDomeHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.14, 12), whiteMetalMat);
    evDomeHousing.position.set(evMaxX + 0.16, evRoofY - 0.24, evMinZ - 0.18);
    arch.add(evDomeHousing);
    const evDomeLens = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 10), copingDarkMat);
    evDomeLens.position.set(evMaxX + 0.16, evRoofY - 0.31, evMinZ - 0.18);
    arch.add(evDomeLens);

    // Two small wall-mounted security floodlights at the top of the Evidence Room walls (531a43ab.jpg)
    addBox(0.14, 0.18, 0.20, evMaxX + 0.05, evRoofY + 0.02, -11.65, whiteMetalMat);
    addBox(0.20, 0.18, 0.14, evCX + 1.35, evRoofY + 0.02, evMinZ - 0.05, whiteMetalMat);

    // SE Corner Brown/White Directional Sign Plaque ("↑ LAW ENFORCEMENT ONLY") & Red/White Notice Sign (531a43ab.jpg, 40a3a812.jpg!)
    if (lawEnforcementArrowSignMat) {
        addBox(0.03, 0.56, 0.38, evMaxX + 0.02, 1.52, evMinZ + 0.55, lawEnforcementArrowSignMat);
    }
    if (noParkingSignMat) {
        addBox(0.03, 0.24, 0.28, evMaxX + 0.02, 1.08, evMinZ + 0.55, noParkingSignMat);
    }

    // Black Chain-Link Security Fence with 45° Outward 3-Strand Barbed-Wire Outrigger Arms on Top of the Evidence Room Roof (531a43ab.jpg, 40a3a812.jpg, 946aea5c.jpg, ed5b0d70.jpg!)
    const evFenceBaseY = evRoofY + evCurbH;
    const evFenceH = 1.62;
    const evFenceCY = evFenceBaseY + evFenceH * 0.5;
    const evFenceTopY = evFenceBaseY + evFenceH;
    const fSouthZ = evMinZ + 0.10;
    const fEastX = evMaxX - 0.10;

    // South (-Z) & East (+X) chain-link mesh panels & top/bottom black rails
    addBox(evW - 0.16, evFenceH, 0.04, evCX, evFenceCY, fSouthZ, chainLinkGateMat);
    addBox(evW, 0.045, 0.055, evCX, evFenceTopY, fSouthZ, blackMetalMat);
    addBox(evW, 0.04, 0.05, evCX, evFenceBaseY + 0.04, fSouthZ, blackMetalMat);

    addBox(0.04, evFenceH, evD - 0.16, fEastX, evFenceCY, evCZ, chainLinkGateMat);
    addBox(0.055, 0.045, evD, fEastX, evFenceTopY, evCZ, blackMetalMat);
    addBox(0.05, 0.04, evD, fEastX, evFenceBaseY + 0.04, evCZ, blackMetalMat);

    // Fence posts + 45° outward-angled barbed-wire extension arms along South (-Z) edge (4 posts)
    const southPostXs = [evMinX + 0.12, -12.90, -10.20, fEastX];
    for (const px of southPostXs) {
        addBox(0.06, evFenceH + 0.08, 0.06, px, evFenceCY, fSouthZ, blackMetalMat);
        // 45° outward (-Z) barbed-wire extension arm
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.46, 0.035), blackMetalMat);
        arm.position.set(px, evFenceTopY + 0.16, fSouthZ - 0.14);
        arm.rotation.x = -Math.PI / 4;
        arch.add(arm);
    }
    // 3 taut horizontal strands of silver barbed wire along the South (-Z) outrigger arms
    for (let s = 1; s <= 3; s++) {
        const off = s * 0.10;
        addBox(evW + 0.10, 0.016, 0.016, evCX, evFenceTopY + off, fSouthZ - off, silverMetalMat);
    }

    // Fence posts + 45° outward-angled barbed-wire extension arms along East (+X) edge (4 posts)
    const eastPostZs = [fSouthZ, -15.05, -12.15, evMaxZ - 0.12];
    for (const pz of eastPostZs) {
        addBox(0.06, evFenceH + 0.08, 0.06, fEastX, evFenceCY, pz, blackMetalMat);
        // 45° outward (+X) barbed-wire extension arm
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.46, 0.035), blackMetalMat);
        arm.position.set(fEastX + 0.14, evFenceTopY + 0.16, pz);
        arm.rotation.z = -Math.PI / 4;
        arch.add(arm);
    }
    // 3 taut horizontal strands of silver barbed wire along the East (+X) outrigger arms
    for (let s = 1; s <= 3; s++) {
        const off = s * 0.10;
        addBox(0.016, 0.016, evD + 0.10, fEastX + off, evFenceTopY + off, evCZ, silverMetalMat);
    }

    // Tall Galvanized Chain-Link Security Screen Panel on the West edge of the Evidence Room connecting up to the SE Connector Wing (40a3a812.jpg, 946aea5c.jpg, ed5b0d70.jpg!)
    addBox(0.05, 3.80, 2.40, evMinX + 0.04, evRoofY + 1.90, evMinZ + 1.20, chainLinkGateMat);
    addBox(0.06, 3.85, 0.06, evMinX + 0.04, evRoofY + 1.92, evMinZ + 0.06, silverMetalMat);

    // Center Square Rooftop Exhaust Fan Unit on the Evidence Room Roof Deck (visible in the center of the red circle in 4fd0b292.jpg!)
    addBox(1.15, 0.22, 1.15, evCX, evRoofY + 0.18, evCZ, copingDarkMat);
    addBox(0.92, 0.48, 0.92, evCX, evRoofY + 0.52, evCZ, silverMetalMat);
    addBox(1.04, 0.10, 1.04, evCX, evRoofY + 0.78, evCZ, copingDarkMat);

    // Upper-Level Access Door & Wall Lights on the East Wall of the SE Connector Wing opening onto the Evidence Room Roof (4fd0b292.jpg, b6dfc1a0.jpg)
    addBox(0.12, 2.10, 1.05, evMinX + 0.04, evRoofY + 1.05, evCZ + 1.10, copingDarkMat);
    addBox(0.14, 0.18, 0.24, evMinX + 0.06, evRoofY + 1.65, evCZ - 1.20, copingDarkMat);
    addBox(0.14, 0.18, 0.24, evMinX + 0.06, evRoofY + 1.65, evCZ + 2.30, copingDarkMat);

    // =========================================================================
    // 6. TWO SEPARATE EAST CONNECTOR BRIDGES TO BUILDING 350 (c71d2af9.jpg & 109ba9fd.jpg)
    //    - 6A. North (Washington St) Precast Connector Tower (lx = +51.70m .. +58.92m, lz = +12.20m .. +16.50m)
    //          with ground-level dark underpass & central support column (109ba9fd.jpg)
    //    - 6B. South (Courthouse Park / Parking Lot) Skybridge Connector (lx = +51.70m .. +58.92m, lz = -6.80m .. -2.20m)
    //          leaving the central courtyard lightwell (lz = -2.20m .. +12.20m) open as seen in c71d2af9.jpg!
    // =========================================================================
    const connMinX = mainMaxX; // +51.70m
    const connMaxX = 58.92;    // Meets Building 350's Rear NW Wall at lx = +58.91m
    const connW = connMaxX - connMinX; // 7.22m
    const connCX = (connMinX + connMaxX) * 0.5; // +55.31m

    // 6A. North (Washington St) 3×3 Precast Concrete Panel Connector Bridge & Open Covered Breezeway Entrance
    //     Set back 10 feet (~3.05m) further from Washington St road (lz = +8.55m .. +14.00m)!
    //     Modeled directly from close-up photos media_1794271546977_6613a6a1.jpg, media_1794271547080_c00b5cb4.jpg,
    //     media_1794271635668_a9d4584b.jpg, media_1794271665627_a0514665.jpg & media_1794271688856_e8b00085.jpg!
    const nConnMinZ = 8.55, nConnMaxZ = 14.00;
    const nConnD = nConnMaxZ - nConnMinZ; // 5.45m deep covered breezeway & overhead bridge
    const nConnCZ = (nConnMinZ + nConnMaxZ) * 0.5; // +11.275m
    const connUnderpassTopY = 3.85; // Aligns with the top of Building 350's grey rusticated Floor-2 stone base!
    const nConnRoofY = 16.10;       // Aligns with the top of Building 401's 5th-floor clerestory band & under 350's cornice!
    const nConnH = nConnRoofY - connUnderpassTopY; // 12.25m

    // Overhead precast concrete bridge mass spanning clear from Building 401 (lx = +51.70m) to Building 350 (lx = +58.92m)
    addBox(
        connW + 0.10,
        nConnH,
        nConnD,
        connCX,
        (nConnRoofY + connUnderpassTopY) * 0.5,
        nConnCZ,
        precastPanelMat,
        arch,
        true
    );
    // Crisp 3 × 3 Precast Panel Grid on the Washington St (+Z) Face (2 horizontal joints + 2 vertical joints = 9 square panels!)
    for (const jy of [connUnderpassTopY + nConnH / 3, connUnderpassTopY + (2 * nConnH) / 3]) {
        addBox(connW + 0.14, 0.065, 0.06, connCX, jy, nConnMaxZ + 0.02, precastJointMat);
    }
    for (const jx of [connMinX + connW / 3, connMinX + (2 * connW) / 3]) {
        addBox(0.065, nConnH + 0.04, 0.06, jx, (nConnRoofY + connUnderpassTopY) * 0.5, nConnMaxZ + 0.02, precastJointMat);
    }
    // Bridge roof membrane & front/rear parapet curbs
    addBox(connW - 0.24, 0.14, nConnD - 0.36, connCX, nConnRoofY + 0.07, nConnCZ, roofMembraneMat);
    addBox(connW + 0.14, 0.28, 0.28, connCX, nConnRoofY + 0.14, nConnMaxZ - 0.14, precastPanelMat);
    addBox(connW + 0.14, 0.28, 0.28, connCX, nConnRoofY + 0.14, nConnMinZ + 0.14, precastPanelMat);

    // Open Covered Breezeway Soffit Ceiling & Recessed Glass Storefront Entrance at lz = +8.55m (media_1794271546977_6613a6a1.jpg!)
    {
        const bzFloorY = yGrade(connCX, 11.50) + 0.09;
        // Dark soffit ceiling under the 3x3 precast bridge with 3 recessed ceiling light troffers
        addBox(connW, 0.12, nConnD - 0.08, connCX, connUnderpassTopY - 0.04, nConnCZ, copingDarkMat, winCoverGrp);
        for (const lxLight of [connMinX + 1.45, connCX, connMaxX - 1.45]) {
            addBox(0.65, 0.04, 1.10, lxLight, connUnderpassTopY - 0.09, nConnCZ + 0.35, whiteMetalMat, winCoverGrp);
        }

        // Open vestibule interior behind the glass storefront (opaque middle/backing wall removed)
        const sfH = connUnderpassTopY - bzFloorY;
        const sfCY = bzFloorY + sfH * 0.5;

        // Projecting silver-grey horizontal transom canopy/fascia beam across the storefront (y = bzFloorY + 2.42m .. +2.68m, media_1794271546977_6613a6a1.jpg!)
        const canopyY = bzFloorY + 2.54;
        addBox(connW - 0.06, 0.26, 0.56, connCX, canopyY, nConnMinZ + 0.24, silverMetalMat, winCoverGrp);
        addBox(connW - 0.04, 0.06, 0.58, connCX, canopyY - 0.12, nConnMinZ + 0.24, darkBronzeFrameMat, winCoverGrp);

        // Upper clerestory glass transom band above the canopy beam (y = canopyY + 0.14m .. connUnderpassTopY - 0.08m)
        const trBotY = canopyY + 0.13;
        const trTopY = connUnderpassTopY - 0.08;
        const trH = trTopY - trBotY;
        const trCY = (trBotY + trTopY) * 0.5;
        addBox(connW - 0.16, trH, 0.12, connCX, trCY, nConnMinZ + 0.04, darkSecurityGlassMat, winCoverGrp);
        addBox(connW, 0.08, 0.16, connCX, trTopY, nConnMinZ + 0.05, darkBronzeFrameMat, winCoverGrp);
        for (const mx of [connMinX + 0.08, connMinX + 1.85, connMinX + 3.65, connMinX + 5.45, connMaxX - 0.08]) {
            addBox(0.07, trH + 0.06, 0.16, mx, trCY, nConnMinZ + 0.05, darkBronzeFrameMat, winCoverGrp);
        }

        // Lower Storefront Glass Sidelights & Double Dark-Bronze Entrance Doors (y = bzFloorY .. canopyY - 0.12m)
        const lowTopY = canopyY - 0.12;
        const lowH = lowTopY - bzFloorY;
        const lowCY = bzFloorY + lowH * 0.5;
        // Full-width dark-bronze storefront frame & glass plane
        addBox(connW - 0.12, lowH, 0.12, connCX, lowCY, nConnMinZ + 0.04, darkSecurityGlassMat, winCoverGrp);
        addBox(connW, 0.10, 0.16, connCX, bzFloorY + 0.05, nConnMinZ + 0.06, darkBronzeFrameMat, winCoverGrp); // Bottom kickplate rail
        // Vertical storefront mullions dividing Left 2 Sidelight Bays (51.70..54.70), Double Entrance Doors (54.70..56.70), and Right Sidelight Bay (56.70..58.92)
        for (const mx of [connMinX + 0.08, 53.20, 54.70, 55.70, 56.70, 57.85, connMaxX - 0.08]) {
            const mW = (mx === 54.70 || mx === 55.70 || mx === 56.70) ? 0.09 : 0.065;
            addBox(mW, lowH, 0.16, mx, lowCY, nConnMinZ + 0.06, darkBronzeFrameMat, winCoverGrp);
        }
        // Horizontal mid-rails on the left sidelights & silver push bars + white lettering on the double doors (54.70..56.70)
        addBox(3.00, 0.05, 0.15, 53.20, bzFloorY + 1.02, nConnMinZ + 0.06, darkBronzeFrameMat, winCoverGrp);
        addBox(1.84, 0.05, 0.18, 55.70, bzFloorY + 1.02, nConnMinZ + 0.09, silverMetalMat, winCoverGrp);
        addBox(0.36, 0.18, 0.02, 56.18, bzFloorY + 1.48, nConnMinZ + 0.12, whiteMetalMat, winCoverGrp);

        // Left Breezeway Wall Details along Building 401's East Brick Wall (lx = +51.70m, lz = +8.55m .. +17.85m, media_1794271546977_6613a6a1.jpg & media_1794271635668_a9d4584b.jpg!):
        // 1) Dark-bronze side personnel door + white card-reader plaque at lz = +10.10m
        addBox(0.14, 2.22, 1.06, connMinX + 0.06, bzFloorY + 1.11, 10.10, darkBronzeFrameMat);
        addBox(0.12, 2.08, 0.90, connMinX + 0.07, bzFloorY + 1.08, 10.10, darkSecurityGlassMat);
        addBox(0.04, 0.22, 0.14, connMinX + 0.09, bzFloorY + 1.28, 10.77, whiteMetalMat);
        // 2) Wall-mounted black directory/announcement case at lz = +13.10m, y = bzFloorY + 1.58m
        addBox(0.12, 0.78, 1.05, connMinX + 0.08, bzFloorY + 1.58, 13.10, blackMetalMat);
        // 3) Square aggregate-concrete trash bin with black hooded lid at lx = +52.12m, lz = +12.05m
        addBox(0.58, 0.74, 0.58, connMinX + 0.44, bzFloorY + 0.37, 12.05, concretePlinthMat);
        addBox(0.60, 0.22, 0.60, connMinX + 0.44, bzFloorY + 0.85, 12.05, blackMetalMat);
        // 4) Black 3-loop serpentine wave bike rack at lx = +52.08m, lz = +13.30m .. +14.40m
        for (const bkz of [13.30, 13.67, 14.03, 14.40]) {
            addBox(0.045, 0.78, 0.045, connMinX + 0.38, bzFloorY + 0.39, bkz, blackMetalMat);
        }
        addBox(0.045, 0.045, 0.42, connMinX + 0.38, bzFloorY + 0.76, 13.485, blackMetalMat);
        addBox(0.045, 0.045, 0.42, connMinX + 0.38, bzFloorY + 0.76, 14.215, blackMetalMat);

        // Right Breezeway Wall Details along Building 350's Grey Rusticated Stone Base (lx = +58.35m .. +58.92m, lz = +8.55m .. +17.45m,
        // media_1794271546977_6613a6a1.jpg, media_1794271665627_a0514665.jpg & media_1794271688856_e8b00085.jpg!):
        // 1) White ground-mounted mini-split AC condenser unit at lx = +58.62m, lz = +12.10m
        addBox(0.36, 0.64, 0.86, connMaxX - 0.28, bzFloorY + 0.34, 12.10, whiteMetalMat);
        addBox(0.38, 0.52, 0.52, connMaxX - 0.29, bzFloorY + 0.34, 12.00, copingDarkMat);
        // 2) Silver Fire Department Connection (FDC) standpipe + backflow assembly at the front-right corner (lx = +58.55m, lz = +13.80m)
        addBox(0.08, 0.78, 0.08, connMaxX - 0.36, bzFloorY + 0.39, 13.80, silverMetalMat);
        addBox(0.08, 0.68, 0.08, connMaxX - 0.36, bzFloorY + 0.34, 13.40, silverMetalMat);
        addBox(0.14, 0.14, 0.52, connMaxX - 0.36, bzFloorY + 0.68, 13.60, silverMetalMat);
        addBox(0.26, 0.16, 0.24, connMaxX - 0.42, bzFloorY + 0.78, 13.80, silverMetalMat);
    }

    // 6B. South Precast Skybridge Connector, Recessed Grid-Jointed Concrete Core Wall, and Two-Tier Glass Entrance Vestibule
    //     are now modeled in full photo-faithful detail inside `Building350Grounds.js` (`buildParkSideGrounds`, `ea374598.jpg`, `780f317e.jpg`, `9c4bd790.jpg`, `6496ecdd.jpg`, `207f8d8c.jpg`).
    //     Add the SE corner plinth foundation vent louver and chain-link security fence return with 45° barbed-wire outriggers shown at the right edge of `6496ecdd.jpg`:
    addBox(1.85, 0.55, 0.08, mainMaxX - 4.20, 0.85, mainMinZ - 0.04, louverDarkMat);
    for (let fi = 0; fi <= 3; fi++) {
        const fz = mainMinZ - 0.15 - fi * 2.15;
        addBox(0.06, 2.40, 0.06, mainMaxX - 0.15, 1.20, fz, darkBronzeFrameMat);
        // 45° barbed-wire outrigger arm at top of post (`6496ecdd.jpg`)
        addBox(0.04, 0.42, 0.28, mainMaxX - 0.15, 2.52, fz - 0.08, darkBronzeFrameMat);
    }
    addBox(0.04, 0.04, 6.45, mainMaxX - 0.15, 2.38, mainMinZ - 3.38, darkBronzeFrameMat);
    addBox(0.04, 0.04, 6.45, mainMaxX - 0.15, 1.25, mainMinZ - 3.38, darkBronzeFrameMat);

    // =========================================================================
    // 7. DETAILED ROOFTOP STRUCTURES ON MAIN WHITE ROOF DECK (y = 18.35m, 358e2515.jpg)
    //    7A. East Square Elevator / Mechanical Penthouse (lx = +36.20m .. +46.40m, lz = +1.80m .. +11.60m)
    //    7B. Long Central Raised Roof Monitor / Ductchase Deck (lx = +6.20m .. +36.20m, lz = -1.20m .. +9.20m)
    //    7C. West D-Shaped Security Grille Outdoor Recreation Deck (lx = -9.40m .. +2.20m, lz = +6.40m .. +15.80m)
    //    7D. 8-Fan Industrial Chiller / HVAC Unit (lx = -5.20m .. +4.20m, lz = +1.20m .. +5.80m)
    // =========================================================================

    // 7A. East Square Elevator / Mechanical Penthouse (358e2515.jpg bottom-left of roof)
    const swWingMat = swRibbedSidingMat || new THREE.MeshStandardMaterial({
        color: '#b8ac99',
        roughness: 0.72,
        metalness: 0.12
    });
    const swParapetCapMat = new THREE.MeshStandardMaterial({
        color: '#e8e4dc',
        roughness: 0.65,
        metalness: 0.10
    });
    const pentMinX = 36.20, pentMaxX = 46.40;
    const pentW = pentMaxX - pentMinX; // 10.20m
    const pentCX = (pentMinX + pentMaxX) * 0.5; // +41.30m
    const pentMinZ = 1.80, pentMaxZ = 11.60;
    const pentD = pentMaxZ - pentMinZ; // 9.80m
    const pentCZ = (pentMinZ + pentMaxZ) * 0.5; // +6.70m
    const pentH = 3.65;
    const pentTopY = roofDeckY + pentH; // 22.00m

    addBox(pentW, pentH, pentD, pentCX, roofDeckY + pentH * 0.5, pentCZ, swWingMat, arch, true);
    // Recessed white roof & parapet cap on East Penthouse
    addBox(pentW - 0.50, 0.14, pentD - 0.50, pentCX, pentTopY - 0.22, pentCZ, roofMembraneMat);
    addBox(pentW + 0.10, 0.08, pentD + 0.10, pentCX, pentTopY + 0.04, pentCZ, swParapetCapMat);
    // Silver rectangular exhaust unit in center of East Penthouse roof
    addBox(2.45, 0.65, 1.85, pentCX - 0.40, pentTopY + 0.25, pentCZ + 0.30, silverMetalMat);
    // Rooftop access door, small 4-step metal stair & louver vent on the East (+X) face of the Penthouse (358e2515.jpg!)
    addBox(0.10, 2.05, 1.02, pentMaxX + 0.03, roofDeckY + 1.45, pentCZ - 0.80, copingDarkMat);
    addBox(0.08, 1.35, 1.45, pentMaxX + 0.03, roofDeckY + 2.15, pentCZ + 1.85, louverDarkMat);
    for (let s = 0; s < 4; s++) {
        addBox(0.28, 0.12, 1.15, pentMaxX + 0.22 + s * 0.26, roofDeckY + 0.42 - s * 0.10, pentCZ - 0.80, silverMetalMat);
    }
    // Communications antenna mast on the SE corner of the Penthouse (358e2515.jpg)
    const antPole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.80, 8), silverMetalMat);
    antPole.position.set(pentMaxX - 0.45, pentTopY + 1.10, pentMinZ + 0.45);
    arch.add(antPole);

    // 7B. Long Central Raised White Roof Monitor Platform (lx = +3.60m .. +36.20m, lz = -2.20m .. +10.20m, 5a05b611.jpg & 358e2515.jpg)
    const monMinX = 3.60, monMaxX = 36.20;
    const monW = monMaxX - monMinX; // 32.60m
    const monCX = (monMinX + monMaxX) * 0.5; // +19.90m
    const monMinZ = -2.20, monMaxZ = 10.20;
    const monD = monMaxZ - monMinZ; // 12.40m
    const monCZ = (monMinZ + monMaxZ) * 0.5; // +4.00m
    const monH = 0.88;
    const monTopY = roofDeckY + monH;

    addBox(monW, monH, monD, monCX, roofDeckY + monH * 0.5, monCZ, precastPanelMat);
    addBox(monW - 0.40, 0.12, monD - 0.40, monCX, monTopY + 0.06, monCZ, roofMembraneMat);
    // White parapet curb around the raised central monitor
    addBox(monW + 0.06, 0.24, 0.24, monCX, monTopY + 0.12, monMaxZ - 0.12, roofMembraneMat);
    addBox(monW + 0.06, 0.24, 0.24, monCX, monTopY + 0.12, monMinZ + 0.12, roofMembraneMat);
    addBox(0.24, 0.24, monD + 0.06, monMinX + 0.12, monTopY + 0.12, monCZ, roofMembraneMat);
    // Two rooftop exhaust hoods on a white curb pad near the center of the monitor (5a05b611.jpg & 358e2515.jpg)
    addBox(4.20, 0.28, 3.60, 20.60, monTopY + 0.20, monCZ + 0.40, roofMembraneMat);
    addBox(1.45, 0.72, 1.35, 19.85, monTopY + 0.65, monCZ - 0.20, silverMetalMat);
    addBox(1.35, 0.58, 1.25, 21.45, monTopY + 0.58, monCZ + 0.85, silverMetalMat);

    // 4 Small Perimeter Roof Vents on the North & South lower roof decks (visible in top view 5a05b611.jpg!)
    for (const [vx, vz] of [
        [10.50, 14.10],
        [24.80, 14.10],
        [12.20, -5.60],
        [27.50, -5.60]
    ]) {
        addBox(0.62, 0.42, 0.62, vx, roofDeckY + 0.32, vz, silverMetalMat);
    }

    // 7C. Quarter-Round Corner Security Grille Outdoor Recreation Court (69d4ba47.jpg, db99c825.jpg, 19ab2c09.jpg & 5a05b611.jpg!)
    //     Modeled directly from close-up overhead photo 69d4ba47.jpg:
    //     - Spans lx = -15.60m .. -6.00m (width = 9.60m, 5 grid columns) and lz = -1.20m .. +9.20m (depth = 10.40m, 5 grid rows).
    //     - THREE sharp 90° square corners: SW (-15.60m, -1.20m), SE (-6.00m, -1.20m), and NE (-6.00m, +9.20m)!
    //     - ONE 90° quarter-circle curved NW corner: centered at (qCurveX = -12.00m, qCurveZ = +5.60m) with radius = 3.60m,
    //       curving smoothly from (-15.60m, +5.60m) to (-12.00m, +9.20m) directly atop the 90° precast corner wall below!
    //     - Crisp white 5×5 open structural grid across the recessed dark recreation court + angled grey stair/access hood inside!
    const recMinX = -15.60;
    const recMaxX = -6.00;
    const recMinZ = -1.20;
    const recMaxZ = 9.20;
    const recWallH = 0.92; // Rises from roofDeckY (18.35m) to 19.27m

    const securityShaftMat = new THREE.MeshStandardMaterial({
        color: '#22252a',
        roughness: 0.82,
        metalness: 0.22
    });

    // 1) Recessed dark recreation court floor & straight walls of the Quarter-Round Rectangle:
    //    - East sub-rectangle (lx = -12.00m .. -6.00m, lz = -1.20m .. +9.20m, width = 6.00m, depth = 10.40m)
    addBox(6.00, recWallH, 10.40, -9.00, roofDeckY + recWallH * 0.5, 4.00, precastPanelMat);
    addBox(5.40, 0.16, 9.60, -9.10, roofDeckY + recWallH - 0.20, 4.00, securityShaftMat);
    //    - South-West straight sub-rectangle (lx = -15.60m .. -12.00m, lz = -1.20m .. +5.60m, width = 3.60m, depth = 6.80m)
    addBox(3.60, recWallH, 6.80, -13.80, roofDeckY + recWallH * 0.5, 2.20, precastPanelMat);
    addBox(3.20, 0.16, 6.40, -13.60, roofDeckY + recWallH - 0.20, 2.40, securityShaftMat);
    //    - North-West 90° Quarter-Circle Curved Quadrant (centered at lx = -12.00m, lz = +5.60m, radius = 3.60m)
    const qRecWall = new THREE.Mesh(
        new THREE.CylinderGeometry(qCurveR, qCurveR, recWallH, 24, 1, false, Math.PI * 1.5, Math.PI * 0.5),
        precastPanelMat
    );
    qRecWall.position.set(qCurveX, roofDeckY + recWallH * 0.5, qCurveZ);
    qRecWall.castShadow = true;
    arch.add(qRecWall);

    const qRecShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(qCurveR - 0.40, qCurveR - 0.40, 0.16, 24, 1, false, Math.PI * 1.5, Math.PI * 0.5),
        securityShaftMat
    );
    qRecShaft.position.set(qCurveX, roofDeckY + recWallH - 0.20, qCurveZ);
    arch.add(qRecShaft);

    // 2) Small Angled Grey Stair / Access Penthouse Hood inside the Security Grille Court (visible in 69d4ba47.jpg!)
    {
        const hoodGroup = new THREE.Group();
        hoodGroup.position.set(-12.85, roofDeckY + recWallH - 0.18, 1.55);
        hoodGroup.rotation.y = 0.52; // ~30° angle matching 69d4ba47.jpg
        const hoodBody = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.42, 2.15), precastPanelMat);
        hoodBody.castShadow = true;
        hoodGroup.add(hoodBody);
        const hoodRoof = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.08, 2.22), silverMetalMat);
        hoodRoof.position.y = 0.24;
        hoodGroup.add(hoodRoof);
        arch.add(hoodGroup);
    }

    // 3) Crisp White 5×5 Open Structural Grid Crossbars across the Quarter-Round Security Grille (69d4ba47.jpg!)
    //    - 4 internal North-South (Z-direction) bars dividing the 9.60m width into 5 columns of 1.92m:
    for (let c = 1; c <= 4; c++) {
        const gx = recMinX + c * 1.92; // -13.68, -11.76, -9.84, -7.92
        const zSouth = recMinZ + 0.18;
        // For gx < qCurveX (-12.00m), clip the North end cleanly at the 90° quarter-circle arc!
        const zNorth = gx < qCurveX
            ? qCurveZ + Math.sqrt(Math.max(0.20, (qCurveR - 0.20) * (qCurveR - 0.20) - (gx - qCurveX) * (gx - qCurveX)))
            : (recMaxZ - 0.18);
        const barLenZ = zNorth - zSouth;
        addBox(0.18, 0.22, barLenZ, gx, roofDeckY + recWallH - 0.03, (zSouth + zNorth) * 0.5, roofMembraneMat);
    }
    //    - 4 internal East-West (X-direction) bars dividing the 10.40m depth into 5 rows of 2.08m:
    for (let r = 1; r <= 4; r++) {
        const gz = recMinZ + r * 2.08; // +0.88, +2.96, +5.04, +7.12
        const xEast = recMaxX - 0.18;
        // For gz > qCurveZ (+5.60m), clip the West end cleanly at the 90° quarter-circle arc!
        const xWest = gz > qCurveZ
            ? qCurveX - Math.sqrt(Math.max(0.20, (qCurveR - 0.20) * (qCurveR - 0.20) - (gz - qCurveZ) * (gz - qCurveZ)))
            : (recMinX + 0.18);
        const barLenX = xEast - xWest;
        addBox(barLenX, 0.20, 0.18, (xWest + xEast) * 0.5, roofDeckY + recWallH - 0.03, gz, roofMembraneMat);
    }

    // 7D. 10-Fan Industrial Chiller / HVAC Unit (2×5 fan array) in Beveled Housing positioned immediately East
    //     of the Security Grille and West of the central roof monitor (lx = -3.80m .. -0.10m, 69d4ba47.jpg!)
    const chillCX = -1.95, chillCZ = 5.40;
    const chillW = 3.70, chillH = 1.95, chillD = 8.40;
    addBox(chillW, chillH, chillD, chillCX, roofDeckY + chillH * 0.5, chillCZ, swParapetCapMat);
    for (let col = 0; col < 2; col++) {
        for (let row = 0; row < 5; row++) {
            const fx = chillCX - 0.82 + col * 1.64;
            const fz = chillCZ - 3.10 + row * 1.55;
            const fanShroud = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.60, 0.26, 16), copingDarkMat);
            fanShroud.position.set(fx, roofDeckY + chillH + 0.13, fz);
            arch.add(fanShroud);
        }
    }
}
