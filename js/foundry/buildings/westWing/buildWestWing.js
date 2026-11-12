import * as THREE from 'three';

/**
 * Photo-realistic 2-Story Reconstruction of the Regional Justice Center — West Wing (`regional-jail-west` / `CCRJ-W`)
 * Address: 413–415 Washington St & King St, Wenatchee, WA 98801
 *
 * Modeled directly from user-provided reference photographs:
 * - 2-story painted stucco/concrete massing (`#c7cbcf`) with stepped central parapets, corner parapet piers,
 *   dark-grey coping caps, and carved "CHELAN COUNTY" parapet frieze plaque (`f27ff023.jpg`, `6b872bac.jpg`)
 * - Floor 1 (1st Floor) graded directly along the sloping Washington St (+Z) and King St (-X) sidewalks so all
 *   1st-floor entries ("415" glass door, white roll-up garage door, "413" white door, right service door, and
 *   2 sallyport doors) sit flush with the accessible perimeter walkways
 * - Non-overlapping L-shaped 2-story main block + South corrugated warehouse wing + SE glass-block connector wing
 *   + Washington St 2-bay sallyport connecting cleanly to Building 401 (`regional-jail-east`) with zero exposed
 *   gaps or buried doors
 */
export function buildPhotoRealisticWestWing(
    foundry,
    group,
    building,
    shape,
    wallMat,
    trimMat,
    terrainY = -0.59,
    getTerrainHeightFn = null
) {
    const arch = new THREE.Group();
    arch.name = 'WestWing_PhotoRealistic';
    // Local orthogonal frame aligned with the Washington St (+Z) & King St (-X) facades
    const cosT = 0.80425;
    const sinT = -0.59429;
    arch.rotation.y = Math.atan2(sinT, cosT);

    const cx = building.center[0]; // -30.73
    const cz = building.center[1]; // -55.70
    const yGrade = (lx, lz) => {
        if (!getTerrainHeightFn) return 0.0;
        const wx = cx + lx * cosT + lz * sinT;
        const wz = cz - lx * sinT + lz * cosT;
        return getTerrainHeightFn(wx, wz) - terrainY;
    };

    // --- PBR Materials ---
    const stuccoMat = new THREE.MeshStandardMaterial({
        color: '#c8cccf',
        roughness: 0.84,
        metalness: 0.04,
        bumpMap: foundry.baseTextures?.brickBump || null,
        bumpScale: 0.008
    });
    const stuccoPlinthMat = new THREE.MeshStandardMaterial({
        color: '#b5b9bd',
        roughness: 0.88,
        metalness: 0.04
    });
    const copingMat = new THREE.MeshStandardMaterial({
        color: '#7c8187',
        roughness: 0.55,
        metalness: 0.28
    });
    const roofMembraneMat = new THREE.MeshStandardMaterial({
        color: '#e5e9ed',
        roughness: 0.78,
        metalness: 0.05
    });
    const corrugatedGreyMat = _createCorrugatedMetalMaterial('#b8bcc0', '#969ba0');
    const corrugatedTanMat = _createCorrugatedMetalMaterial('#cbb89d', '#a9957a');
    const awningMat = _createCorrugatedMetalMaterial('#f2f5f7', '#cfd5da', 32);

    // Night-lit window & door glass materials (automatically illuminated at dusk/night by _updateBuildingNightLights)
    const darkGlassMat = new THREE.MeshStandardMaterial({
        color: '#202b34',
        roughness: 0.14,
        metalness: 0.78,
        emissive: new THREE.Color('#ffcf82'),
        emissiveIntensity: 0.06
    });
    darkGlassMat.userData.isNightLitGlass = true;
    darkGlassMat.userData.dayColorHex = 0x202b34;
    darkGlassMat.userData.baseEmissiveHex = 0xffcf82;
    darkGlassMat.userData.dayEmissiveIntensity = 0.06;
    darkGlassMat.userData.nightEmissiveIntensity = 1.42;

    const warmInteriorGlassMat = new THREE.MeshStandardMaterial({
        color: '#2b363e',
        roughness: 0.18,
        metalness: 0.65,
        emissive: new THREE.Color('#ffd68a'),
        emissiveIntensity: 0.10
    });
    warmInteriorGlassMat.userData.isNightLitGlass = true;
    warmInteriorGlassMat.userData.dayColorHex = 0x2b363e;
    warmInteriorGlassMat.userData.baseEmissiveHex = 0xffd68a;
    warmInteriorGlassMat.userData.dayEmissiveIntensity = 0.10;
    warmInteriorGlassMat.userData.nightEmissiveIntensity = 1.55;

    const glassBlockMat = new THREE.MeshStandardMaterial({
        color: '#9db0ad',
        roughness: 0.25,
        metalness: 0.30,
        emissive: new THREE.Color('#ffe09e'),
        emissiveIntensity: 0.08
    });
    glassBlockMat.userData.isNightLitGlass = true;
    glassBlockMat.userData.dayColorHex = 0x9db0ad;
    glassBlockMat.userData.baseEmissiveHex = 0xffe09e;
    glassBlockMat.userData.dayEmissiveIntensity = 0.08;
    glassBlockMat.userData.nightEmissiveIntensity = 1.15;

    const darkFrameMat = new THREE.MeshStandardMaterial({
        color: '#2b3035',
        roughness: 0.42,
        metalness: 0.55
    });
    const oliveMullionMat = new THREE.MeshStandardMaterial({
        color: '#464d48',
        roughness: 0.52,
        metalness: 0.40
    });
    const silverFrameMat = new THREE.MeshStandardMaterial({
        color: '#d4d9de',
        roughness: 0.32,
        metalness: 0.72
    });
    const whiteMetalMat = new THREE.MeshStandardMaterial({
        color: '#eef1f4',
        roughness: 0.38,
        metalness: 0.22
    });
    const sallyportDoorMat = new THREE.MeshStandardMaterial({
        color: '#3c3934',
        roughness: 0.55,
        metalness: 0.38
    });
    const hvacBodyMat = new THREE.MeshStandardMaterial({
        color: '#b4b8bc',
        roughness: 0.55,
        metalness: 0.35
    });
    const gooseneckMat = new THREE.MeshStandardMaterial({
        color: '#9e8f76',
        roughness: 0.50,
        metalness: 0.45
    });
    const yellowSafetyMat = new THREE.MeshStandardMaterial({
        color: '#eab308',
        roughness: 0.45,
        metalness: 0.15
    });
    const sidewalkMat = new THREE.MeshStandardMaterial({
        color: '#e2dcd0',
        roughness: 0.86,
        metalness: 0.03,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
    });
    const curbMat = new THREE.MeshStandardMaterial({
        color: '#f2eee6',
        roughness: 0.75,
        metalness: 0.04,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
    });

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

    const addRoofParapet = (minX, maxX, minZ, maxZ, deckY, wallH, wallMatToUse, capMatToUse) => {
        const w = maxX - minX;
        const d = maxZ - minZ;
        const cxP = (minX + maxX) * 0.5;
        const czP = (minZ + maxZ) * 0.5;
        const t = 0.34;
        const py = deckY + wallH * 0.5;
        const cy = deckY + wallH + 0.035;
        // +Z & -Z parapets
        addBox(w, wallH, t, cxP, py, maxZ - t * 0.5, wallMatToUse);
        addBox(w + 0.06, 0.07, t + 0.06, cxP, cy, maxZ - t * 0.5, capMatToUse);
        addBox(w, wallH, t, cxP, py, minZ + t * 0.5, wallMatToUse);
        addBox(w + 0.06, 0.07, t + 0.06, cxP, cy, minZ + t * 0.5, capMatToUse);
        // -X & +X parapets
        addBox(t, wallH, d, minX + t * 0.5, py, czP, wallMatToUse);
        addBox(t + 0.06, 0.07, d + 0.06, minX + t * 0.5, cy, czP, capMatToUse);
        addBox(t, wallH, d, maxX - t * 0.5, py, czP, wallMatToUse);
        addBox(t + 0.06, 0.07, d + 0.06, maxX - t * 0.5, cy, czP, capMatToUse);
    };

    // =========================================================================
    // 1. 2-STORY STRUCTURAL MASSING (NON-OVERLAPPING EXACT OSM FOOTPRINT V0..V7)
    //    - Floor 1 extends from sub-grade (-4.50m) up to floor2Y = 4.45m (zero coplanar z-fighting)
    //    - Floor 2 extends from floor2Y = 4.45m up to roofDeckY = 8.40m
    //    - West Main Block: lx = -28.38m .. +3.36m, lz = -6.04m .. +19.64m
    //    - East "413" Courtyard Block: lx = +3.36m .. +7.83m, lz = -3.46m .. +19.64m (matches 27a5ce33.jpg)
    // =========================================================================
    const mainMinX = -28.38, mainMidX = 3.36, mainMaxX = 7.83;
    const mainMinZ = -6.04,  eastMinZ = -3.46, mainMaxZ = 19.64;
    const floor2Y = 4.45;
    const roofDeckY = 8.40;
    const parapetTopY = 8.86;
    const baseBottomY = -4.50;
    const floor1H = floor2Y - baseBottomY; // 8.95m
    const floor1CY = (baseBottomY + floor2Y) * 0.5;
    const floor2H = roofDeckY - floor2Y; // 3.95m
    const floor2CY = (floor2Y + roofDeckY) * 0.5;

    // 1A. West Main 2-Story Volume (lx = -28.38m .. +3.36m, lz = -6.04m .. +19.64m)
    const wMainW = mainMidX - mainMinX; // 31.74m
    const wMainD = mainMaxZ - mainMinZ; // 25.68m
    const wMainCX = (mainMinX + mainMidX) * 0.5;
    const wMainCZ = (mainMinZ + mainMaxZ) * 0.5;
    const f1West = addBox(wMainW, floor1H, wMainD, wMainCX, floor1CY, wMainCZ, stuccoMat, arch, true);
    f1West.userData.floorLayer = 1;
    const f2West = addBox(wMainW, floor2H, wMainD, wMainCX, floor2CY, wMainCZ, stuccoMat, arch, true);
    f2West.userData.floorLayer = 2;
    addBox(wMainW - 0.60, 0.14, wMainD - 0.60, wMainCX, roofDeckY + 0.07, wMainCZ, roofMembraneMat);

    // 1B. East "413" Courtyard 2-Story Volume (lx = +3.36m .. +7.83m, lz = -3.46m .. +19.64m, V0-V1-V2)
    const eMainW = mainMaxX - mainMidX; // 4.47m
    const eMainD = mainMaxZ - eastMinZ; // 23.10m
    const eMainCX = (mainMidX + mainMaxX) * 0.5;
    const eMainCZ = (eastMinZ + mainMaxZ) * 0.5;
    const f1East = addBox(eMainW, floor1H, eMainD, eMainCX, floor1CY, eMainCZ, stuccoMat, arch, true);
    f1East.userData.floorLayer = 1;
    const f2East = addBox(eMainW, floor2H, eMainD, eMainCX, floor2CY, eMainCZ, stuccoMat, arch, true);
    f2East.userData.floorLayer = 2;
    addBox(eMainW - 0.30, 0.14, eMainD - 0.60, eMainCX, roofDeckY + 0.07, eMainCZ, roofMembraneMat);

    // Graded Base Water-Table Plinth & Stepped Structural Foundation Footing Curb around the entire West Wing
    const fndFootingMat = new THREE.MeshStandardMaterial({
        color: '#b6b0a4',
        roughness: 0.88,
        metalness: 0.03
    });
    const mainW = mainMaxX - mainMinX;
    const mainCX = (mainMinX + mainMaxX) * 0.5;
    const washSegs = 16;
    for (let i = 0; i < washSegs; i++) {
        const x0 = mainMinX + (i / washSegs) * mainW;
        const x1 = mainMinX + ((i + 1) / washSegs) * mainW;
        const xm = (x0 + x1) * 0.5;
        const yg = yGrade(xm, mainMaxZ);
        addBox(x1 - x0 + 0.02, 0.72, 0.12, xm, yg + 0.04, mainMaxZ + 0.04, stuccoPlinthMat);
        // Stepped concrete foundation footing sill at grade (recessed at garage bay lx = -15.4..-12.3)
        const isGarage = xm > -15.50 && xm < -12.20;
        const footTop = isGarage ? yg + 0.10 : yg + 0.18;
        addBox(x1 - x0 + 0.03, 0.58, 0.24, xm, footTop - 0.29, mainMaxZ + 0.10, fndFootingMat);
    }
    // King St (-X) graded foundation plinth & stepped footing across full length (lz = -19.84m .. +19.64m, covering both Main Block & South Corrugated Wing!)
    const kingFullMinZ = -19.84, kingFullMaxZ = mainMaxZ;
    const kingFullD = kingFullMaxZ - kingFullMinZ;
    const kingSegs = 16;
    for (let i = 0; i < kingSegs; i++) {
        const z0 = kingFullMinZ + (i / kingSegs) * kingFullD;
        const z1 = kingFullMinZ + ((i + 1) / kingSegs) * kingFullD;
        const zm = (z0 + z1) * 0.5;
        const kx = zm < mainMinZ ? -28.34 : mainMinX;
        const yg = yGrade(kx, zm);
        addBox(0.12, 0.74, z1 - z0 + 0.02, kx - 0.04, yg + 0.05, zm, stuccoPlinthMat);
        addBox(0.24, 0.58, z1 - z0 + 0.03, kx - 0.10, yg - 0.11, zm, fndFootingMat);
    }
    // East Courtyard (+X, lx = +7.83m, lz = -3.46m .. +13.50m) & SE Connector Courtyard Face (+Z, lz = -6.04m, lx = +3.36m .. +15.80m) foundation plinth & footing
    for (let i = 0; i < 6; i++) {
        const z0 = -3.46 + (i / 6) * (13.50 - (-3.46));
        const z1 = -3.46 + ((i + 1) / 6) * (13.50 - (-3.46));
        const zm = (z0 + z1) * 0.5;
        const yg = yGrade(mainMaxX, zm);
        addBox(0.12, 0.72, z1 - z0 + 0.02, mainMaxX + 0.04, yg + 0.04, zm, stuccoPlinthMat);
        addBox(0.24, 0.58, z1 - z0 + 0.03, mainMaxX + 0.10, yg - 0.11, zm, fndFootingMat);
    }
    for (let i = 0; i < 5; i++) {
        const x0 = 3.36 + (i / 5) * (15.80 - 3.36);
        const x1 = 3.36 + ((i + 1) / 5) * (15.80 - 3.36);
        const xm = (x0 + x1) * 0.5;
        const yg = yGrade(xm, -6.04);
        addBox(x1 - x0 + 0.02, 0.72, 0.12, xm, yg + 0.04, -6.00, stuccoPlinthMat);
        addBox(x1 - x0 + 0.03, 0.58, 0.24, xm, yg - 0.11, -5.94, fndFootingMat);
    }
    // Rear South (-Z) Corrugated Wing & SE Connector Wing stepped concrete foundation footing sill at grade (lx = -28.34m .. +15.80m)
    const rearFootSegs = 16;
    for (let i = 0; i < rearFootSegs; i++) {
        const x0 = -28.34 + (i / rearFootSegs) * (15.80 - (-28.34));
        const x1 = -28.34 + ((i + 1) / rearFootSegs) * (15.80 - (-28.34));
        const xm = (x0 + x1) * 0.5;
        const rz = xm < 3.36 ? -19.84 : -20.095;
        const yg = yGrade(xm, rz);
        addBox(x1 - x0 + 0.03, 0.64, 0.28, xm, yg - 0.10, rz - 0.12, fndFootingMat);
    }

    // Perimeter Roof Parapets & Metal Coping around the 2-Story Main Roof
    const pThick = 0.38;
    const baseParapetH = parapetTopY - roofDeckY; // 0.46m
    // Washington St (+Z) parapet across full 2-story frontage (lx = -28.38 .. +7.83)
    addBox(mainW, baseParapetH, pThick, mainCX, roofDeckY + baseParapetH * 0.5, mainMaxZ - pThick * 0.5, stuccoMat);
    addBox(mainW + 0.06, 0.07, pThick + 0.06, mainCX, parapetTopY + 0.035, mainMaxZ - pThick * 0.5, copingMat);
    // King St (-X) parapet (lz = -6.04 .. +19.64)
    addBox(pThick, baseParapetH, wMainD, mainMinX + pThick * 0.5, roofDeckY + baseParapetH * 0.5, wMainCZ, stuccoMat);
    addBox(pThick + 0.06, 0.07, wMainD + 0.06, mainMinX + pThick * 0.5, parapetTopY + 0.035, wMainCZ, copingMat);
    // NE Courtyard (+X) parapet (lz = -3.46 .. +19.64)
    addBox(pThick, baseParapetH, eMainD, mainMaxX - pThick * 0.5, roofDeckY + baseParapetH * 0.5, eMainCZ, stuccoMat);
    addBox(pThick + 0.06, 0.07, eMainD + 0.06, mainMaxX - pThick * 0.5, parapetTopY + 0.035, eMainCZ, copingMat);
    // South (-Z) parapet segments along V1-V2 (lz = -3.46) and V2-V3-West (lz = -6.04)
    addBox(eMainW, baseParapetH, pThick, eMainCX, roofDeckY + baseParapetH * 0.5, eastMinZ + pThick * 0.5, stuccoMat);
    addBox(eMainW + 0.06, 0.07, pThick + 0.06, eMainCX, parapetTopY + 0.035, eastMinZ + pThick * 0.5, copingMat);
    addBox(wMainW, baseParapetH, pThick, wMainCX, roofDeckY + baseParapetH * 0.5, mainMinZ + pThick * 0.5, stuccoMat);
    addBox(wMainW + 0.06, 0.07, pThick + 0.06, wMainCX, parapetTopY + 0.035, mainMinZ + pThick * 0.5, copingMat);

    // Stepped-Up Central Parapet on King St (-X) Facade (`6b872bac.jpg`: spans above Bays 2..5, lz = -1.60m .. +14.40m)
    const kingStepMinZ = -1.60, kingStepMaxZ = 14.40;
    const kingStepD = kingStepMaxZ - kingStepMinZ;
    const kingStepCZ = (kingStepMinZ + kingStepMaxZ) * 0.5;
    addBox(pThick + 0.02, 0.56, kingStepD, mainMinX + pThick * 0.5, parapetTopY + 0.28, kingStepCZ, stuccoMat);
    addBox(pThick + 0.08, 0.08, kingStepD + 0.06, mainMinX + pThick * 0.5, parapetTopY + 0.58, kingStepCZ, copingMat);
    for (const pz of [kingStepMinZ + 0.48, kingStepMaxZ - 0.48]) {
        addBox(pThick + 0.06, 0.74, 0.96, mainMinX + pThick * 0.5, parapetTopY + 0.37, pz, stuccoMat);
        addBox(pThick + 0.12, 0.08, 1.04, mainMinX + pThick * 0.5, parapetTopY + 0.76, pz, copingMat);
    }

    // Stepped-Up Parapet on Washington St (+Z) "415" Section (`f27ff023.jpg`: spans lx = -20.60m .. -8.80m)
    const washStepMinX = -20.60, washStepMaxX = -8.80;
    const washStepW = washStepMaxX - washStepMinX;
    const washStepCX = (washStepMinX + washStepMaxX) * 0.5;
    addBox(washStepW, 0.54, pThick + 0.02, washStepCX, parapetTopY + 0.27, mainMaxZ - pThick * 0.5, stuccoMat);
    addBox(washStepW + 0.06, 0.08, pThick + 0.08, washStepCX, parapetTopY + 0.56, mainMaxZ - pThick * 0.5, copingMat);
    for (const px of [mainMinX + 0.48, washStepMinX + 0.48]) {
        addBox(0.96, 0.72, pThick + 0.06, px, parapetTopY + 0.36, mainMaxZ - pThick * 0.5, stuccoMat);
        addBox(1.04, 0.08, pThick + 0.12, px, parapetTopY + 0.74, mainMaxZ - pThick * 0.5, copingMat);
    }

    // Carved "CHELAN COUNTY" Frieze Plaque on Washington St Parapet (`f27ff023.jpg`, centered at lx = -15.80m)
    const chelanPlaqueMat = new THREE.MeshStandardMaterial({
        map: _createChelanCountyFriezeTexture(),
        roughness: 0.65,
        metalness: 0.08
    });
    addBox(4.85, 0.56, 0.10, -15.80, 8.76, mainMaxZ + 0.05, copingMat);
    addBox(4.72, 0.46, 0.12, -15.80, 8.76, mainMaxZ + 0.07, chelanPlaqueMat);

    // Interior Roof Divider Wall separating the 415 (West) and 413 (East) Roof Decks (`d74a3daf.jpg`)
    const divX = -10.80;
    addBox(0.34, 0.38, wMainD - 0.80, divX, roofDeckY + 0.19, wMainCZ, stuccoMat);
    addBox(0.42, 0.06, wMainD - 0.76, divX, roofDeckY + 0.40, wMainCZ, copingMat);

    // Vertical Downspout Pipe between 415 and 413 on the Washington St Facade (`f27ff023.jpg`)
    const dsY0 = yGrade(-7.35, mainMaxZ);
    const dsH = parapetTopY - dsY0;
    addBox(0.09, dsH, 0.09, -7.35, dsY0 + dsH * 0.5, mainMaxZ + 0.06, whiteMetalMat);

    // =========================================================================
    // 2. SOUTH CORRUGATED METAL ADDITION WING ALONG KING ST (`6b872bac.jpg`, `8b8b2903.jpg`, `d74a3daf.jpg`)
    //    Spans lx = -28.34m .. +3.36m, lz = -19.84m .. -6.04m (abuts West Main Block at lz = -6.04m)
    // =========================================================================
    const southMinX = -28.34, southMaxX = 3.36;
    const southMinZ = -19.84, southMaxZ = -6.04;
    const southW = southMaxX - southMinX; // 31.70m
    const southD = southMaxZ - southMinZ; // 13.80m
    const southCX = (southMinX + southMaxX) * 0.5;
    const southCZ = (southMinZ + southMaxZ) * 0.5;
    const southRoofY = 7.35;

    // Main north section of the corrugated metal wing (`lz = -14.40m .. -6.04m`, full height 7.35m)
    addBox(southW, southRoofY - baseBottomY, 8.36, southCX, (southRoofY + baseBottomY) * 0.5, -10.22, corrugatedGreyMat, arch, true);
    // South recessed bay section (`lz = -19.84m .. -14.40m`, full roof height 7.35m over inner depth, recessed ground bay on King St)
    addBox(southW - 3.20, southRoofY - baseBottomY, 5.44, southCX + 1.60, (southRoofY + baseBottomY) * 0.5, -17.12, corrugatedGreyMat, arch, true);
    // Overhanging upper fascia over the recessed King St bay (`8b8b2903.jpg`)
    addBox(3.20, southRoofY - 3.15, 5.44, southMinX + 1.60, (southRoofY + 3.15) * 0.5, -17.12, corrugatedGreyMat);
    // South corner support pier on King St (`8b8b2903.jpg`)
    addBox(0.55, 3.15 - baseBottomY, 0.65, southMinX + 0.275, (3.15 + baseBottomY) * 0.5, southMinZ + 0.325, corrugatedGreyMat);
    // Recessed interior shadow & roll-up service door inside the King St bay opening
    addBox(0.18, 3.20, 4.75, southMinX + 3.12, 1.55, -17.12, darkFrameMat);

    // Roof membrane & full perimeter parapet on the South Addition (`d74a3daf.jpg`)
    addBox(southW - 0.50, 0.12, southD - 0.50, southCX, southRoofY + 0.06, southCZ, roofMembraneMat);
    addRoofParapet(southMinX, southMaxX, southMinZ, southMaxZ, southRoofY, 0.38, corrugatedTanMat, copingMat);
    // Decorative breeze-block / lattice screen wall visible at roof step (`d74a3daf.jpg`)
    addBox(0.24, 1.15, 4.20, -6.20, southRoofY + 0.58, -6.30, corrugatedTanMat);

    // =========================================================================
    // 3. SE CONNECTOR WING & WASHINGTON ST SALLYPORT (`69d4ba47.jpg`, `8f231f9e.jpg`, `27a5ce33.jpg`, `40a3a812.jpg`, `946aea5c.jpg`, `ed5b0d70.jpg`)
    //    - Exact local offset to Building 401 (`regional-jail-east`): `lx_401 = lx_west - 31.40m`, `lz_401 = lz_west + 2.11m`
    //    - SE Connector Wing (`lx = +3.36m .. +15.80m, lz = -20.09m .. -6.04m`): meets Building 401's SW corner &
    //      the 1-Story Square Corner Evidence Room (`lx_401 = -15.60m, lz_401 = -17.98m`) directly and flush, leaving the
    //      service courtyard (`lx = +7.83m .. +15.80m, lz = -6.04m .. +13.50m`) open as seen in `69d4ba47.jpg`!
    //    - Washington St Sallyport Garage Door Jail Entrance (`lx = +7.83m .. +17.55m, lz = +13.50m .. +19.05m`):
    //      connects the 2-story white stucco East wall (`lx = +7.83m`) to Building 401's chain-link gate (`lx = +17.55m .. +19.40m`)
    // =========================================================================
    const connMinX = 3.36, connMaxX = 15.80;
    const connMinZ = -20.09, connMaxZ = -6.04;
    const connW = connMaxX - connMinX; // 12.44m
    const connD = connMaxZ - connMinZ; // 14.05m
    const connCX = (connMinX + connMaxX) * 0.5;
    const connCZ = (connMinZ + connMaxZ) * 0.5;
    const connRoofY = 7.35;

    addBox(connW, connRoofY - baseBottomY, connD, connCX, (connRoofY + baseBottomY) * 0.5, connCZ, corrugatedTanMat, arch, true);
    addBox(connW - 0.40, 0.12, connD - 0.40, connCX, connRoofY + 0.06, connCZ, roofMembraneMat);
    addRoofParapet(connMinX, connMaxX, connMinZ, connMaxZ, connRoofY, 0.34, corrugatedTanMat, copingMat);

    // 3 Horizontal Bands of Glass-Block Windows on the Connector Wing facing the NE Courtyard (`d74a3daf.jpg` bottom right)
    for (const gbx of [5.25, 8.65, 12.05]) {
        addBox(2.55, 0.62, 0.14, gbx, 3.85, connMaxZ + 0.05, silverFrameMat);
        addBox(2.42, 0.50, 0.16, gbx, 3.85, connMaxZ + 0.07, glassBlockMat);
    }

    // 1-Story Tan Horizontal-Ribbed Sallyport Garage Door Jail Entrance along Washington St
    // Modeled directly from 8f231f9e.jpg & 27a5ce33.jpg:
    // - Spans from East wall of 2-story white stucco West Wing (`lx = +7.83m`) to `lx = +17.55m` (`lx_401 = -13.85m`),
    //   leaving a clean 1.85m chain-link gated alley (`lx_401 = -13.85m .. -12.00m`) next to Building 401's brick wing wall
    // - Front wall at `sallyMaxZ = +19.05m` (recessed 0.59m behind 413 stucco facade `19.64m`, and 1.11m ahead of 401 brick wall)
    // - 1-story height `sallyRoofY = 4.65m` so Building 401's NW curved precast concrete drum rises prominently behind it
    const sallyMinX = 7.83, sallyMaxX = 17.55;
    const sallyMinZ = 13.50, sallyMaxZ = 19.05;
    const sallyW = sallyMaxX - sallyMinX; // 9.72m
    const sallyD = sallyMaxZ - sallyMinZ; // 5.55m
    const sallyCX = (sallyMinX + sallyMaxX) * 0.5; // +12.69m
    const sallyCZ = (sallyMinZ + sallyMaxZ) * 0.5; // +16.275m
    const sallyRoofY = 4.65;

    const sallyTanSidingMat = new THREE.MeshStandardMaterial({
        color: '#baa892',
        roughness: 0.68,
        metalness: 0.14
    });
    const sallyRibShadowMat = new THREE.MeshStandardMaterial({
        color: '#8c7b67',
        roughness: 0.78,
        metalness: 0.10
    });
    const sallyLeftDoorMat = new THREE.MeshStandardMaterial({
        color: '#7d7c64', // Olive-sage / warm grey-tan roll-up door on left (`8f231f9e.jpg`, `27a5ce33.jpg`)
        roughness: 0.58,
        metalness: 0.32
    });
    const sallyRightDoorMat = new THREE.MeshStandardMaterial({
        color: '#54392d', // Dark chocolate-brown / bronze roll-up door on right (`8f231f9e.jpg`, `27a5ce33.jpg`)
        roughness: 0.55,
        metalness: 0.34
    });
    const sallyPedDoorMat = new THREE.MeshStandardMaterial({
        color: '#7c8288', // Medium-grey steel pedestrian door on far right pier (`8f231f9e.jpg`, `27a5ce33.jpg`)
        roughness: 0.52,
        metalness: 0.38
    });

    // Main 1-story sallyport mass & flat roof deck
    addBox(sallyW, sallyRoofY - baseBottomY, sallyD, sallyCX, (sallyRoofY + baseBottomY) * 0.5, sallyCZ, sallyTanSidingMat, arch, true);
    addBox(sallyW - 0.36, 0.10, sallyD - 0.36, sallyCX, sallyRoofY + 0.05, sallyCZ, roofMembraneMat);
    addRoofParapet(sallyMinX, sallyMaxX, sallyMinZ, sallyMaxZ, sallyRoofY, 0.22, sallyTanSidingMat, copingMat);

    // Concrete foundation plinth base along the front (+Z) & right (+X) walls of the sallyport (`8f231f9e.jpg`)
    {
        const sallyBaseY = yGrade(sallyCX, sallyMaxZ);
        addBox(sallyW + 0.04, 0.26, 0.08, sallyCX, sallyBaseY + 0.13, sallyMaxZ + 0.02, stuccoPlinthMat);
        // Horizontal lap-siding shadow ribs across the upper header frieze (`y = 3.82m .. 4.65m`) & right (+X) return wall (`8f231f9e.jpg`)
        for (let ry = sallyBaseY + 0.32; ry <= sallyRoofY + 0.12; ry += 0.22) {
            if (ry >= sallyBaseY + 3.68) {
                addBox(sallyW + 0.04, 0.03, 0.05, sallyCX, ry, sallyMaxZ + 0.02, sallyRibShadowMat);
            } else {
                // Horizontal ribs on Left Pier (`7.83..9.55`), Center Pier (`12.65..13.25`), and Right Pier (`16.15..17.55`)
                addBox(1.72, 0.03, 0.05, 8.69, ry, sallyMaxZ + 0.02, sallyRibShadowMat);
                addBox(0.60, 0.03, 0.05, 12.95, ry, sallyMaxZ + 0.02, sallyRibShadowMat);
                addBox(1.40, 0.03, 0.05, 16.85, ry, sallyMaxZ + 0.02, sallyRibShadowMat);
            }
            // Horizontal ribs along the right (+X) side wall facing the chain-link gate (`27a5ce33.jpg`)
            addBox(0.05, 0.03, sallyD + 0.02, sallyMaxX + 0.02, ry, sallyCZ, sallyRibShadowMat);
        }
        // Vertical panel joint seams at pier edges (`8f231f9e.jpg`)
        for (const vx of [9.55, 12.65, 13.25, 16.15]) {
            addBox(0.04, sallyRoofY - sallyBaseY + 0.20, 0.06, vx, (sallyRoofY + sallyBaseY) * 0.5 + 0.10, sallyMaxZ + 0.025, sallyRibShadowMat);
        }
    }

    // 2 Deeply-Recessed Coiling Roll-Up Sallyport Garage Doors (`8f231f9e.jpg` & `27a5ce33.jpg`):
    // - Left Bay (`lx = 9.55m .. 12.65m`, width `3.10m`): Olive-sage coiling steel roll-up door
    // - Right Bay (`lx = 13.25m .. 16.15m`, width `2.90m`): Dark chocolate-brown coiling steel roll-up door
    const sallyDoorH = 3.62;
    for (const [doorCX, doorW, doorMat] of [
        [11.10, 3.10, sallyLeftDoorMat],
        [14.70, 2.90, sallyRightDoorMat]
    ]) {
        const dy0 = yGrade(doorCX, sallyMaxZ);
        // Deep dark recessed portal shadow & header/jamb trim (`8f231f9e.jpg`)
        addBox(doorW + 0.08, sallyDoorH + 0.10, 0.24, doorCX, dy0 + sallyDoorH * 0.5 + 0.04, sallyMaxZ - 0.02, darkFrameMat);
        // Coiling steel roll-up door curtain recessed slightly behind the tan pier face
        addBox(doorW - 0.08, sallyDoorH, 0.14, doorCX, dy0 + sallyDoorH * 0.5 + 0.04, sallyMaxZ + 0.02, doorMat);
        // Fine horizontal coiling slat lines (18 slats) + bottom black weatherseal bar
        for (let r = 1; r <= 18; r++) {
            addBox(doorW - 0.08, 0.022, 0.16, doorCX, dy0 + (r / 19) * sallyDoorH + 0.04, sallyMaxZ + 0.025, darkFrameMat);
        }
        addBox(doorW - 0.06, 0.08, 0.17, doorCX, dy0 + 0.06, sallyMaxZ + 0.025, darkFrameMat);
    }

    // 4 White Steel Pipe Bollards protecting the sallyport jambs (`1 | 2 | 1` pattern in `8f231f9e.jpg` & `27a5ce33.jpg`!)
    for (const bx of [9.52, 12.62, 13.28, 16.12]) {
        const by0 = yGrade(bx, sallyMaxZ);
        const bPost = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 1.06, 12), whiteMetalMat);
        bPost.position.set(bx, by0 + 0.53, sallyMaxZ + 0.26);
        bPost.castShadow = true;
        arch.add(bPost);
    }

    // Left Pier Intercom/Speaker Box (`x = 8.95m`) + Center Pier Amber Strobe (`y = 3.25m`) & Keycard Reader (`y = 1.58m`) (`8f231f9e.jpg`!)
    {
        const lpY = yGrade(8.95, sallyMaxZ);
        addBox(0.28, 0.22, 0.08, 8.95, lpY + 1.48, sallyMaxZ + 0.05, darkFrameMat);

        const cpY = yGrade(12.95, sallyMaxZ);
        const strobeMat = new THREE.MeshStandardMaterial({ color: '#e65c19', emissive: new THREE.Color('#ff6a00'), emissiveIntensity: 0.35, roughness: 0.35 });
        const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), strobeMat);
        strobe.position.set(12.95, cpY + 3.25, sallyMaxZ + 0.06);
        arch.add(strobe);
        // Black & red badge/siren box on center pier (`8f231f9e.jpg`)
        addBox(0.20, 0.26, 0.07, 12.95, cpY + 1.58, sallyMaxZ + 0.05, darkFrameMat);
        addBox(0.10, 0.10, 0.08, 12.95, cpY + 1.58, sallyMaxZ + 0.055, strobeMat);
    }

    // Right Pier Flush Medium-Grey Steel Pedestrian Service Door, Keycard Pad, Wall-Pack Light & Security Camera (`x = 16.88m`, `8f231f9e.jpg` & `27a5ce33.jpg`)
    {
        const pDoorX = 16.88;
        const dy0 = yGrade(pDoorX, sallyMaxZ);
        addBox(0.94, 2.18, 0.12, pDoorX, dy0 + 1.09, sallyMaxZ + 0.03, darkFrameMat);
        addBox(0.84, 2.08, 0.10, pDoorX, dy0 + 1.05, sallyMaxZ + 0.05, sallyPedDoorMat);
        // Door handle & left jamb keycard pad (`8f231f9e.jpg`)
        addBox(0.08, 0.04, 0.12, pDoorX - 0.32, dy0 + 1.02, sallyMaxZ + 0.06, silverFrameMat);
        addBox(0.08, 0.14, 0.06, 16.32, dy0 + 1.18, sallyMaxZ + 0.05, darkFrameMat);
        // Dark wall-pack light & white dome security camera above the pedestrian door (`8f231f9e.jpg` & `27a5ce33.jpg`)
        addBox(0.24, 0.16, 0.18, pDoorX - 0.05, dy0 + 3.52, sallyMaxZ + 0.08, darkFrameMat);
        const sallyCam = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), whiteMetalMat);
        sallyCam.position.set(pDoorX + 0.08, dy0 + 3.12, sallyMaxZ + 0.08);
        arch.add(sallyCam);
    }

    // =========================================================================
    // 3B. REAR (-Z, lz = -19.84m .. -20.09m) PARKING-LOT FACADE, RAISED ENTRY
    //     ALCOVE, LEFT CONCRETE STAIRS & LONG RIGHT ADA WHEELCHAIR RAMP
    //     Modeled directly from reference photos:
    //     - 99745cf1.jpg, dcacbc2d.jpg, 4ebb6a25.jpg, 23ac0e45.jpg, c51536dc.jpg
    // =========================================================================
    {
        const rearConcreteMat = new THREE.MeshStandardMaterial({
            color: '#989b96',
            roughness: 0.85,
            metalness: 0.04
        });

        // Exposed poured-concrete foundation base wall along the entire South (-Z) facade (`y = 0 .. +1.55m`, `dcacbc2d.jpg`, `4ebb6a25.jpg`)
        addBox(southW - 3.20, 2.20, 0.22, southCX + 1.60, 0.45, southMinZ - 0.04, rearConcreteMat);
        addBox(connW, 2.20, 0.22, connCX, 0.45, connMinZ - 0.04, rearConcreteMat);

        // 1) Left (East) Group of 4 Rectangular Glass-Block Security Windows on SE Connector (`lx = +8.80m .. +12.25m`, right next to the Evidence Room at `lx = +15.80m`, `40a3a812.jpg`, `946aea5c.jpg`, `99745cf1.jpg`, `dcacbc2d.jpg`)
        for (let i = 0; i < 4; i++) {
            const gx = 8.80 + i * 1.15;
            addBox(0.96, 0.56, 0.12, gx, 3.85, connMinZ - 0.04, silverFrameMat);
            addBox(0.86, 0.46, 0.14, gx, 3.85, connMinZ - 0.06, glassBlockMat);
        }

        // 4 Small Rooftop Exhaust Hoods on the SE Connector Roof (`358e2515.jpg` top-right)
        for (const [hx, hz] of [
            [12.20, -9.50],
            [9.80, -12.20],
            [10.80, -15.60],
            [6.80, -16.40]
        ]) {
            addBox(0.98, 0.62, 0.98, hx, connRoofY + 0.38, hz, silverFrameMat);
            addBox(1.10, 0.12, 1.10, hx, connRoofY + 0.72, hz, copingMat);
        }

        // 2) Middle Pair of 2 Glass-Block Windows + Small Square Louver Vent (`lx = -1.65m, -0.35m`, `dcacbc2d.jpg`)
        for (const gx of [-1.65, -0.35]) {
            addBox(1.12, 0.62, 0.12, gx, 3.92, southMinZ - 0.04, silverFrameMat);
            addBox(1.02, 0.52, 0.14, gx, 3.92, southMinZ - 0.06, glassBlockMat);
        }
        addBox(0.38, 0.42, 0.12, -3.10, 4.45, southMinZ - 0.04, darkFrameMat);

        // 3) Deeply Recessed Rear Entrance Alcove at `lx = -6.80m` (`dcacbc2d.jpg`, `23ac0e45.jpg`, `4ebb6a25.jpg`)
        const doorX = -6.80;
        const landingTopY = yGrade(doorX, southMinZ) + 1.32;
        // Dark recessed vestibule shadow & commercial glass/metal entrance door with transom
        addBox(2.35, 2.75, 0.36, doorX, landingTopY + 1.375, southMinZ + 0.06, darkFrameMat);
        addBox(1.08, 2.35, 0.14, doorX + 0.32, landingTopY + 1.175, southMinZ - 0.02, silverFrameMat);
        addBox(0.92, 1.05, 0.16, doorX + 0.32, landingTopY + 1.45, southMinZ - 0.03, warmInteriorGlassMat);
        // Red fire alarm strobe to the left of the recessed doorway (`dcacbc2d.jpg`, `23ac0e45.jpg`)
        const fireRedMat = new THREE.MeshStandardMaterial({ color: '#d92626', roughness: 0.40 });
        addBox(0.14, 0.18, 0.08, doorX + 1.48, landingTopY + 1.62, southMinZ - 0.06, fireRedMat);

        // 4) Right (West) Group of 3 Wide Rectangular Glass-Block Windows (`6×3` grid, `lx = -10.40m, -12.95m, -15.50m`, `dcacbc2d.jpg`, `23ac0e45.jpg`)
        for (const gx of [-10.40, -12.95, -15.50]) {
            addBox(2.15, 0.74, 0.12, gx, 3.85, southMinZ - 0.04, silverFrameMat);
            addBox(2.02, 0.62, 0.14, gx, 3.85, southMinZ - 0.06, glassBlockMat);
            for (let c = 1; c < 6; c++) {
                addBox(0.03, 0.62, 0.16, gx - 1.01 + (c / 6) * 2.02, 3.85, southMinZ - 0.07, silverFrameMat);
            }
        }

        // 5) 5 Dark-Bronze Hooded LED Wall-Pack Security Lights along the Rear Ribbed Wall (`dcacbc2d.jpg`, `23ac0e45.jpg`, `c51536dc.jpg`)
        for (const [lxLight, lyLight] of [
            [8.40, 4.15],
            [-0.10, 4.65],
            [-4.25, 4.65],
            [-9.60, 4.95],
            [-19.80, 5.15]
        ]) {
            const lzWall = lxLight < 3.36 ? southMinZ : connMinZ;
            addBox(0.32, 0.18, 0.24, lxLight, lyLight, lzWall - 0.10, darkFrameMat);
        }

        // 6) Raised Concrete Landing Platform (`lx = -8.60m .. -4.80m`), Left Concrete Steps (`lx = -4.80m .. -2.60m`),
        //    and Long Right Sloped Concrete ADA Wheelchair Ramp (`lx = -22.80m .. -8.60m`, `4ebb6a25.jpg`, `23ac0e45.jpg`, `c51536dc.jpg`)!
        const rampOuterZ = southMinZ - 1.65;
        const rampCZ = (southMinZ + rampOuterZ) * 0.5;
        const rampD = 1.65;

        // Center raised concrete landing platform in front of the recessed doorway (`lx = -8.60m .. -4.80m`)
        const landBaseY = yGrade(doorX, rampCZ) - 0.20;
        const landH = landingTopY - landBaseY;
        addBox(3.80, landH, rampD, -6.70, landBaseY + landH * 0.5, rampCZ, sidewalkMat);

        // Left (East) 6-step concrete stair flight descending from `lx = -4.80m` to `lx = -2.60m` (`dcacbc2d.jpg`)
        const stepCount = 6;
        const stairSpanX = 2.20;
        const stepW = stairSpanX / stepCount;
        for (let s = 0; s < stepCount; s++) {
            const sx = -4.80 + (s + 0.5) * stepW;
            const sTopY = THREE.MathUtils.lerp(landingTopY - 0.14, yGrade(sx, rampCZ) + 0.12, s / (stepCount - 1));
            const sBotY = yGrade(sx, rampCZ) - 0.15;
            addBox(stepW + 0.02, sTopY - sBotY, rampD, sx, (sTopY + sBotY) * 0.5, rampCZ, sidewalkMat);
        }

        // Right (West) 14.2m Sloped Concrete ADA Wheelchair Ramp descending from `lx = -8.60m` down to `lx = -22.80m` (`4ebb6a25.jpg`, `23ac0e45.jpg`, `c51536dc.jpg`)
        const rampSegs = 12;
        const rampStartX = -8.60;
        const rampEndX = -22.80;
        for (let i = 0; i < rampSegs; i++) {
            const t0 = i / rampSegs;
            const t1 = (i + 1) / rampSegs;
            const tm = (t0 + t1) * 0.5;
            const x0 = THREE.MathUtils.lerp(rampStartX, rampEndX, t0);
            const x1 = THREE.MathUtils.lerp(rampStartX, rampEndX, t1);
            const xm = (x0 + x1) * 0.5;
            const segW = Math.abs(x1 - x0) + 0.02;
            const topY = THREE.MathUtils.lerp(landingTopY, yGrade(rampEndX, rampCZ) + 0.10, tm);
            const botY = yGrade(xm, rampCZ) - 0.20;
            addBox(segW, topY - botY, rampD, xm, (topY + botY) * 0.5, rampCZ, sidewalkMat);

            // Galvanized steel pipe guardrail posts + top/mid rails along the outer edge (`lz = rampOuterZ + 0.06`, `4ebb6a25.jpg`, `23ac0e45.jpg`)
            addBox(0.05, 1.06, 0.05, x0, topY + 0.53, rampOuterZ + 0.06, silverFrameMat);
            addBox(segW, 0.045, 0.045, xm, topY + 1.05, rampOuterZ + 0.06, silverFrameMat);
            addBox(segW, 0.035, 0.035, xm, topY + 0.55, rampOuterZ + 0.06, silverFrameMat);
            // Inner wall-mounted galvanized pipe handrail (`4ebb6a25.jpg`, `c51536dc.jpg`)
            addBox(0.04, 0.88, 0.04, x0, topY + 0.44, southMinZ - 0.12, silverFrameMat);
            addBox(segW, 0.04, 0.04, xm, topY + 0.88, southMinZ - 0.12, silverFrameMat);
        }
        // Guardrail around the raised center landing & left stairs (`dcacbc2d.jpg`, `23ac0e45.jpg`)
        addBox(3.84, 0.045, 0.045, -6.70, landingTopY + 1.05, rampOuterZ + 0.06, silverFrameMat);
        addBox(3.84, 0.035, 0.035, -6.70, landingTopY + 0.55, rampOuterZ + 0.06, silverFrameMat);
        for (const lpx of [-8.60, -6.70, -4.80]) {
            addBox(0.05, 1.06, 0.05, lpx, landingTopY + 0.53, rampOuterZ + 0.06, silverFrameMat);
        }

        // Yellow-Striped ADA Van Access Aisle & Handicap Parking Sign Post in front of the Ramp (`lx = -17.80m, lz = -24.80m`, `23ac0e45.jpg`, `4ebb6a25.jpg`)
        const hcSignX = -18.20, hcSignZ = -23.45;
        const hcY = yGrade(hcSignX, hcSignZ) + 0.08;
        addBox(0.045, 1.85, 0.045, hcSignX, hcY + 0.925, hcSignZ, silverFrameMat);
        addBox(0.36, 0.48, 0.03, hcSignX, hcY + 1.65, hcSignZ - 0.02, whiteMetalMat);
        for (let s = 0; s < 5; s++) {
            const sz = -24.10 - s * 0.85;
            addBox(2.40, 0.02, 0.08, -16.20, hcY - 0.02, sz, yellowSafetyMat);
        }
    }

    // =========================================================================
    // 4. WASHINGTON STREET (+Z, lz = +19.64m) 2-STORY FRONT ELEVATION (`f27ff023.jpg`)
    // =========================================================================
    const washZ = mainMaxZ; // +19.64m

    // Helper: 3D Sloped White Corrugated Metal Awning with Triangular Side Valances (`6b872bac.jpg`, `f27ff023.jpg`)
    const addWhiteMetalAwning = (x, yTop, z, width, side = '+Z') => {
        const awningGrp = new THREE.Group();
        awningGrp.userData.hideOnCutaway = true;
        awningGrp.position.set(x, yTop, z);
        if (side === '-X') awningGrp.rotation.y = -Math.PI / 2;

        const proj = 0.78;
        const drop = 0.46;
        const slopeLen = Math.hypot(proj, drop);
        const slopeAng = Math.atan2(drop, proj);

        const slopeMesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.045, slopeLen), awningMat);
        slopeMesh.position.set(0, -drop * 0.5, proj * 0.5);
        slopeMesh.rotation.x = slopeAng;
        slopeMesh.castShadow = true;
        awningGrp.add(slopeMesh);

        const valMesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.14, 0.04), awningMat);
        valMesh.position.set(0, -drop - 0.05, proj - 0.02);
        valMesh.castShadow = true;
        awningGrp.add(valMesh);

        for (const sx of [-width * 0.5 + 0.025, width * 0.5 - 0.025]) {
            const sidePanel = new THREE.Mesh(new THREE.BoxGeometry(0.04, drop * 0.72, proj * 0.85), awningMat);
            sidePanel.position.set(sx, -drop * 0.55, proj * 0.42);
            awningGrp.add(sidePanel);

            const strut = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, proj * 0.92), darkFrameMat);
            strut.position.set(sx, -drop - 0.04, proj * 0.46);
            awningGrp.add(strut);
        }
        arch.add(awningGrp);
    };

    // Helper: Multi-Pane Industrial Steel-Sash Window (`6b872bac.jpg`, `f27ff023.jpg`)
    const addMultiPaneWindow = (x, yCenter, z, width, height, cols, rows, side = '+Z', opts = {}) => {
        const winGrp = new THREE.Group();
        winGrp.userData.hideOnCutaway = true;
        winGrp.position.set(x, yCenter, z);
        if (side === '-X') winGrp.rotation.y = -Math.PI / 2;
        else if (side === '+X') winGrp.rotation.y = Math.PI / 2;

        // Concrete sill projecting proud of wall
        const sill = new THREE.Mesh(new THREE.BoxGeometry(width + 0.14, 0.08, 0.18), copingMat);
        sill.position.set(0, -height * 0.5 - 0.03, 0.06);
        winGrp.add(sill);

        // Outer frame proud of wall face (z = +0.04) so it never z-fights with wall
        const frame = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.10), opts.silverFrame ? silverFrameMat : oliveMullionMat);
        frame.position.set(0, 0, 0.03);
        winGrp.add(frame);

        // Night-lit glass pane proud of frame
        const glassMatToUse = opts.warmInterior ? warmInteriorGlassMat : darkGlassMat;
        const glass = new THREE.Mesh(new THREE.BoxGeometry(width - 0.10, height - 0.10, 0.08), glassMatToUse);
        glass.position.set(0, 0, 0.05);
        winGrp.add(glass);

        if (opts.hasBlinds) {
            const blindMat = new THREE.MeshStandardMaterial({
                color: '#cfd4d8',
                roughness: 0.65,
                metalness: 0.10,
                emissive: new THREE.Color('#ffe29e'),
                emissiveIntensity: 0.08
            });
            blindMat.userData.isNightLitGlass = true;
            blindMat.userData.dayColorHex = 0xcfd4d8;
            blindMat.userData.baseEmissiveHex = 0xffe29e;
            blindMat.userData.dayEmissiveIntensity = 0.08;
            blindMat.userData.nightEmissiveIntensity = 1.25;
            const blind = new THREE.Mesh(new THREE.BoxGeometry(width - 0.16, height * 0.82, 0.02), blindMat);
            blind.position.set(0, -height * 0.05, 0.082);
            winGrp.add(blind);
        }

        // Grid mullions
        const mMat = opts.silverFrame ? silverFrameMat : oliveMullionMat;
        for (let c = 1; c < cols; c++) {
            const mx = -width * 0.5 + (c / cols) * width;
            const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, height - 0.06, 0.08), mMat);
            vBar.position.set(mx, 0, 0.065);
            winGrp.add(vBar);
        }
        for (let r = 1; r < rows; r++) {
            const my = -height * 0.5 + (r / rows) * height;
            const hBar = new THREE.Mesh(new THREE.BoxGeometry(width - 0.06, 0.04, 0.08), mMat);
            hBar.position.set(0, my, 0.065);
            winGrp.add(hBar);
        }

        if (opts.hasWindowAC) {
            const acW = width / Math.max(cols, 3) + 0.08;
            const acH = height / Math.max(rows, 3) + 0.06;
            const acBox = new THREE.Mesh(new THREE.BoxGeometry(acW, acH, 0.28), whiteMetalMat);
            acBox.position.set(0, height * 0.5 - acH * 0.5 - 0.04, 0.14);
            winGrp.add(acBox);
        }

        arch.add(winGrp);
    };

    // --- 4A. Washington St West "415" Section (`lx = -28.38m .. -7.35m`, `f27ff023.jpg`) ---
    for (const [bx, w1, w2, hasBlinds] of [
        [-24.85, 4.45, 2.35, false],
        [-19.85, 3.65, 2.25, true]
    ]) {
        const yg = yGrade(bx, washZ);
        addMultiPaneWindow(bx, yg + 2.15, washZ, w1, 2.35, 5, 4, '+Z', { hasBlinds });
        addMultiPaneWindow(bx, 6.22, washZ, w2, 1.32, 3, 1, '+Z', { warmInterior: true });
        addWhiteMetalAwning(bx, 7.05, washZ, w1 + 0.25, '+Z');
    }

    // Bay 3 (`lx = -16.80m`): "415" Main Entrance Door + 2nd-Floor Multi-Pane Stairwell Window (`f27ff023.jpg`)
    {
        const doorX = -16.80;
        const yg = yGrade(doorX, washZ);
        const doorH = 2.85;
        // Proud dark-bronze entrance frame & storefront glass door in front of washZ
        addBox(1.36, doorH + 0.10, 0.14, doorX, yg + doorH * 0.5, washZ + 0.04, darkFrameMat);
        addBox(1.16, doorH - 0.70, 0.10, doorX, yg + (doorH - 0.70) * 0.5, washZ + 0.07, warmInteriorGlassMat);
        addBox(1.16, 0.58, 0.10, doorX, yg + doorH - 0.34, washZ + 0.07, darkGlassMat);
        addBox(1.20, 0.06, 0.14, doorX, yg + doorH - 0.66, washZ + 0.08, darkFrameMat);
        addBox(0.95, 0.04, 0.14, doorX, yg + 1.05, washZ + 0.09, silverFrameMat);

        // "415" black/white address plaque + yellow informational sign on left pier (`f27ff023.jpg`)
        const sign415Mat = new THREE.MeshStandardMaterial({
            map: _createAddressSignTexture('415', '#1d2226', '#f5f7fa'),
            roughness: 0.45
        });
        addBox(0.42, 0.54, 0.06, doorX - 0.92, yg + 1.68, washZ + 0.05, sign415Mat);
        addBox(0.38, 0.46, 0.05, doorX - 0.92, yg + 1.12, washZ + 0.05, yellowSafetyMat);

        // 2nd-floor vertical 2x4 multi-pane stairwell window directly above "415" door (`f27ff023.jpg`)
        addMultiPaneWindow(doorX, 6.28, washZ, 1.18, 1.72, 2, 4, '+Z', { silverFrame: true, warmInterior: true });
    }

    // Bay 4 (`lx = -13.85m`): White Sectional Roll-Up Garage Door with 2 Yellow Bollards + 2nd-Floor Window (`f27ff023.jpg`)
    {
        const garX = -13.85;
        const yg = yGrade(garX, washZ);
        const garW = 3.15;
        const garH = 2.92;
        // Proud garage portal surround & bright white sectional roll-up door in front of washZ
        addBox(garW + 0.22, garH + 0.12, 0.14, garX, yg + garH * 0.5, washZ + 0.04, copingMat);
        addBox(garW, garH, 0.12, garX, yg + garH * 0.5, washZ + 0.07, whiteMetalMat);
        for (let r = 1; r <= 6; r++) {
            addBox(garW, 0.03, 0.14, garX, yg + (r / 7) * garH, washZ + 0.08, copingMat);
        }
        // Two yellow steel pipe bollards protecting the garage jambs (`f27ff023.jpg`)
        for (const bx of [garX - garW * 0.5 - 0.14, garX + garW * 0.5 + 0.14]) {
            const bMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.96, 12), yellowSafetyMat);
            bMesh.position.set(bx, yg + 0.48, washZ + 0.28);
            bMesh.castShadow = true;
            arch.add(bMesh);
        }
        // 2nd-floor dark window above garage bay (`f27ff023.jpg`)
        addMultiPaneWindow(garX, 6.18, washZ, 1.65, 1.24, 1, 1, '+Z');
    }

    // Bay 5 (`lx = -9.55m`): 1st-Floor Multi-Pane Industrial Window + 2nd-Floor Window (`f27ff023.jpg`)
    {
        const bx = -9.55;
        const yg = yGrade(bx, washZ);
        addMultiPaneWindow(bx, yg + 1.88, washZ, 3.25, 2.05, 4, 4, '+Z', { hasWindowAC: true });
        addMultiPaneWindow(bx, 6.18, washZ, 1.48, 1.20, 1, 1, '+Z');
    }

    // --- 4B. Washington St East "413" Section (`lx = -7.35m .. +7.83m`, `27a5ce33.jpg`, `f27ff023.jpg`) ---
    for (const [wx, ww] of [
        [-6.10, 0.88],
        [-4.45, 0.78],
        [-3.05, 1.38],
        [-0.35, 1.38],
        [2.35, 1.38],
        [4.85, 1.38]
    ]) {
        addMultiPaneWindow(wx, 5.95, washZ, ww, 1.12, 1, 1, '+Z', { warmInterior: wx > -1.0 });
    }

    // 1) Left "413" White Entrance Door with Transom & Address Plaque (`lx = -5.85m`, `f27ff023.jpg`)
    {
        const d413X = -5.85;
        const yg = yGrade(d413X, washZ);
        addBox(1.18, 2.68, 0.14, d413X, yg + 1.34, washZ + 0.04, copingMat);
        addBox(1.02, 2.05, 0.12, d413X, yg + 1.025, washZ + 0.07, whiteMetalMat);
        addBox(0.52, 0.82, 0.14, d413X, yg + 1.42, washZ + 0.08, warmInteriorGlassMat);
        addMultiPaneWindow(d413X, yg + 2.38, washZ + 0.02, 1.02, 0.52, 3, 1, '+Z', { silverFrame: true });
        const sign413Mat = new THREE.MeshStandardMaterial({
            map: _createAddressSignTexture('413', '#23282d', '#f5f7fa'),
            roughness: 0.45
        });
        addBox(0.34, 0.44, 0.05, d413X + 0.82, yg + 1.55, washZ + 0.05, sign413Mat);
    }

    // 2) "We are Hiring" Black/White Banner above Horizontal Glass-Block Window (`lx = -2.85m`, `f27ff023.jpg`)
    {
        const gbX = -2.85;
        const yg = yGrade(gbX, washZ);
        addMultiPaneWindow(gbX, yg + 1.65, washZ, 2.45, 0.92, 6, 3, '+Z', { silverFrame: true });
        addBox(2.36, 0.84, 0.12, gbX, yg + 1.65, washZ + 0.04, glassBlockMat);
        const hiringBannerMat = new THREE.MeshStandardMaterial({
            map: _createHiringBannerTexture(),
            roughness: 0.50
        });
        addBox(1.92, 0.96, 0.06, gbX, yg + 3.45, washZ + 0.05, hiringBannerMat);
    }

    // 3) Small 1st-floor square window (`lx = +2.35m`), Right White Service Door with louvered transom (`lx = +5.15m`),
    //    and Vertical Mechanical Louver Grille at East edge (`lx = +6.95m`, `27a5ce33.jpg` & `8f231f9e.jpg`!)
    {
        const swX = 2.35;
        const ygSw = yGrade(swX, washZ);
        addMultiPaneWindow(swX, ygSw + 1.65, washZ, 0.76, 0.88, 1, 1, '+Z');

        const rDoorX = 5.15;
        const ygRd = yGrade(rDoorX, washZ);
        addBox(1.12, 2.58, 0.14, rDoorX, ygRd + 1.29, washZ + 0.04, copingMat);
        addBox(0.98, 2.04, 0.12, rDoorX, ygRd + 1.02, washZ + 0.07, whiteMetalMat);
        addBox(0.98, 0.44, 0.13, rDoorX, ygRd + 2.32, washZ + 0.07, copingMat);

        // Tall vertical wall louver grille near the East edge of the 413 stucco facade (`lx = +6.95m`, `27a5ce33.jpg`, `8f231f9e.jpg`)
        const lvX = 6.95;
        const ygLv = yGrade(lvX, washZ);
        addBox(0.56, 1.38, 0.08, lvX, ygLv + 1.35, washZ + 0.03, copingMat);
        for (let l = 0; l < 8; l++) {
            addBox(0.48, 0.03, 0.10, lvX, ygLv + 0.76 + l * 0.16, washZ + 0.04, darkFrameMat);
        }
    }

    // =========================================================================
    // 5. KING STREET (-X, lx = -28.38m) 2-STORY ELEVATION (`6b872bac.jpg`, `8b8b2903.jpg`, `a7727544.jpg`)
    // =========================================================================
    const kingX = mainMinX; // -28.38m
    const kingBayZs = [-4.10, 0.18, 4.46, 8.74, 13.02, 17.30];

    kingBayZs.forEach((bz, idx) => {
        const bayNum = idx + 1;
        const yg = yGrade(kingX, bz);

        addMultiPaneWindow(kingX, 6.22, bz, 2.28, 1.28, 3, 1, '-X', {
            warmInterior: bayNum === 2 || bayNum === 4 || bayNum === 6
        });
        addWhiteMetalAwning(kingX, 7.04, bz, 3.62, '-X');

        if (bayNum === 3) {
            addMultiPaneWindow(kingX, yg + 2.08, bz, 3.50, 2.28, 2, 1, '-X', {
                silverFrame: true,
                warmInterior: true
            });
        } else {
            addMultiPaneWindow(kingX, yg + 2.08, bz, 3.50, 2.28, 5, 4, '-X', {
                hasWindowAC: bayNum === 1 || bayNum === 2,
                hasBlinds: bayNum === 4,
                warmInterior: bayNum === 5 || bayNum === 6
            });
        }
    });

    // Round Metal Wall Louver Vent above Left Corner of Bay 1 (`6b872bac.jpg`)
    {
        const ventMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.10, 20), copingMat);
        ventMesh.rotation.z = Math.PI / 2;
        ventMesh.position.set(kingX - 0.04, yGrade(kingX, -5.55) + 3.62, -5.55);
        arch.add(ventMesh);
    }

    // White Wall-Mounted Mini-Split AC Condenser Unit on Brackets between Bays 5 & 6 (`6b872bac.jpg`, `a7727544.jpg`)
    {
        const acZ = 15.16;
        const yg = yGrade(kingX, acZ);
        addBox(0.36, 0.72, 0.98, kingX - 0.20, yg + 2.75, acZ, whiteMetalMat);
        const fanDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 20), darkFrameMat);
        fanDisc.rotation.z = Math.PI / 2;
        fanDisc.position.set(kingX - 0.39, yg + 2.75, acZ - 0.12);
        arch.add(fanDisc);
        addBox(0.32, 0.06, 0.06, kingX - 0.16, yg + 2.36, acZ - 0.35, silverFrameMat);
        addBox(0.32, 0.06, 0.06, kingX - 0.16, yg + 2.36, acZ + 0.35, silverFrameMat);
        addBox(0.08, 0.45, 0.10, kingX - 0.06, yg + 2.15, acZ + 0.25, whiteMetalMat);
    }

    // Horizontal Electrical Conduit & Wall-Pack Light above Bay 4 on King St (`6b872bac.jpg`)
    addBox(0.05, 0.05, 14.50, kingX - 0.04, 3.65, 1.50, silverFrameMat);
    const kingWallPackMat = new THREE.MeshStandardMaterial({
        color: '#2c3034',
        emissive: new THREE.Color('#ffdf94'),
        emissiveIntensity: 0.25
    });
    kingWallPackMat.userData.isNightLitGlass = true;
    kingWallPackMat.userData.dayColorHex = 0x2c3034;
    kingWallPackMat.userData.baseEmissiveHex = 0xffdf94;
    kingWallPackMat.userData.dayEmissiveIntensity = 0.25;
    kingWallPackMat.userData.nightEmissiveIntensity = 2.40;
    addBox(0.16, 0.18, 0.26, kingX - 0.09, 3.74, 9.85, kingWallPackMat);

    // =========================================================================
    // 6. NE COURTYARD WALL (+X, lx = +5.65m) & ROOFTOP MECHANICAL UNITS (`27a5ce33.jpg`, `d74a3daf.jpg`)
    // =========================================================================
    const courtX = mainMaxX; // +5.65m
    // 2nd-floor wide dark-brown mechanical louver on the East (+X) stucco wall directly above the Sallyport roof (`lz = +17.25m`, `27a5ce33.jpg`!)
    addBox(0.14, 1.18, 2.35, courtX + 0.04, 5.95, 17.25, sallyRightDoorMat);
    // Lower courtyard window (`lz = +12.40m`) & upper paired window (`lz = +10.20m`)
    addMultiPaneWindow(courtX, yGrade(courtX, 12.40) + 1.85, 12.40, 2.65, 1.45, 2, 1, '+X', { warmInterior: true });
    addMultiPaneWindow(courtX, 5.15, 10.20, 2.75, 1.25, 2, 1, '+X', { warmInterior: true });
    // Center gray steel service door (`lz = +7.50m`) with conduit & floodlight above (`d74a3daf.jpg`)
    {
        const cdZ = 7.50;
        const yg = yGrade(courtX, cdZ);
        addBox(0.14, 2.25, 1.12, courtX + 0.05, yg + 1.125, cdZ, copingMat);
        addBox(0.06, 2.65, 0.06, courtX + 0.06, yg + 3.45, cdZ, silverFrameMat);
        addBox(0.18, 0.18, 0.24, courtX + 0.11, yg + 4.80, cdZ, kingWallPackMat);
    }
    // 4 Upper Courtyard Windows on the right (`lz = +4.80m, +2.30m, -0.20m, -2.30m`, `d74a3daf.jpg`)
    for (const czWin of [4.80, 2.30, -0.20, -2.30]) {
        addMultiPaneWindow(courtX, 5.85, czWin, 1.55, 1.15, 1, 1, '+X');
    }
    addBox(0.12, 0.10, 9.40, courtX + 0.05, 5.22, 1.15, copingMat);

    // Green Pad-Mounted Utility Transformer in the NE Courtyard (`d74a3daf.jpg` bottom right)
    const greenTransMat = new THREE.MeshStandardMaterial({ color: '#485b47', roughness: 0.55, metalness: 0.35 });
    const trY = yGrade(9.60, -2.20);
    addBox(1.55, 0.18, 1.65, 9.60, trY + 0.09, -2.20, curbMat);
    addBox(1.28, 1.32, 1.38, 9.60, trY + 0.84, -2.20, greenTransMat);

    // Corner Satellite Dish at NE/Washington St Roof Corner (`d74a3daf.jpg` bottom left)
    {
        const dishPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.35, 10), darkFrameMat);
        dishPole.position.set(mainMaxX - 0.25, parapetTopY + 0.45, mainMaxZ - 0.65);
        arch.add(dishPole);
        const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.08, 18), copingMat);
        dish.rotation.x = 0.55;
        dish.rotation.z = -0.35;
        dish.position.set(mainMaxX - 0.20, parapetTopY + 1.05, mainMaxZ - 0.65);
        arch.add(dish);
    }

    // 2 Curved Metal Gooseneck Exhaust Hoods on the East (`413`) Roof Deck (`d74a3daf.jpg`)
    for (const [gx, gz] of [
        [0.85, 12.20],
        [-3.40, 2.80]
    ]) {
        addBox(0.86, 0.22, 0.86, gx, roofDeckY + 0.18, gz, copingMat);
        addBox(0.68, 0.58, 0.68, gx, roofDeckY + 0.56, gz, gooseneckMat);
        const hoodTop = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.72, 14, 1, false, 0, Math.PI), gooseneckMat);
        hoodTop.rotation.z = Math.PI / 2;
        hoodTop.position.set(gx, roofDeckY + 0.86, gz + 0.14);
        arch.add(hoodTop);
    }

    // Packaged Rooftop HVAC Units (`d74a3daf.jpg`: 6 units on main 2-story roof + 4 units along South Addition roof)
    const mainRoofHvacCoords = [
        [-9.20, 14.50, 2.10, 1.15, 1.65],
        [-10.10, 4.20, 2.05, 1.10, 1.55],
        [-13.50, 17.60, 1.95, 0.95, 1.25],
        [-24.20, 16.80, 1.75, 0.92, 1.25],
        [-25.50, 6.20, 1.65, 0.88, 1.20],
        [-25.20, -2.50, 1.65, 0.88, 1.20]
    ];
    for (const [hx, hz, hw, hh, hd] of mainRoofHvacCoords) {
        addBox(hw + 0.16, 0.18, hd + 0.16, hx, roofDeckY + 0.18, hz, copingMat);
        addBox(hw, hh, hd, hx, roofDeckY + 0.27 + hh * 0.5, hz, hvacBodyMat);
        addBox(hw * 0.42, hh * 0.72, hd * 0.86, hx + hw * 0.24, roofDeckY + 0.27 + hh * 0.52, hz, darkFrameMat);
    }
    for (const shx of [-2.50, -7.80, -13.10, -18.40]) {
        addBox(1.75, 0.95, 1.35, shx, southRoofY + 0.55, -8.55, hvacBodyMat);
        addBox(0.65, 0.75, 1.15, shx + 0.35, southRoofY + 0.56, -8.55, darkFrameMat);
    }

    // =========================================================================
    // 7. ACCESSIBLE PERIMETER WALKWAYS, YELLOW CURBS, CROSSWALK & STREET SIGNS
    // =========================================================================
    const walkW = 3.095; // WashZ (19.64m) + 3.095m = 22.735m (lz_401 = 24.85m, exact match to Building 401 Washington St curbZ!)

    const addGradedQuad = (x0, z0, x1, z1, x2, z2, x3, z3, yOff, mat) => {
        const lift = yOff + 0.04; // Extra +4cm clearance above the 4m terrain mesh facets so walkways never submerge!
        const y0 = yGrade(x0, z0) + lift;
        const y1 = yGrade(x1, z1) + lift;
        const y2 = yGrade(x2, z2) + lift;
        const y3 = yGrade(x3, z3) + lift;
        const drop = 0.34;
        // Correct upward (+Y) normal check in Three.js right-handed coordinates:
        // (p1 - p0) x (p2 - p0) has Y component = (z1 - z0)*(x2 - x0) - (x1 - x0)*(z2 - z0).
        // When crossY >= 0, (p0, p1, p2) has +Y upward normal; when crossY < 0, (p0, p2, p1) has +Y upward normal!
        const crossY = (z1 - z0) * (x2 - x0) - (x1 - x0) * (z2 - z0);
        // Order perimeter vertices [a, b, c, d] in CCW order when viewed from +Y above
        const [ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz] = crossY >= 0
            ? [x0, y0, z0,  x1, y1, z1,  x2, y2, z2,  x3, y3, z3]
            : [x0, y0, z0,  x3, y3, z3,  x2, y2, z2,  x1, y1, z1];

        const sOff = 0.008;
        const pos = new Float32Array([
            // Top surface (CCW from +Y -> strict +Y upward normal)
            ax, ay, az,  bx, by, bz,  cx, cy, cz,
            ax, ay, az,  cx, cy, cz,  dx, dy, dz,
            // 4 outward-facing perimeter skirt walls (top lowered by 8mm so shared internal seams never poke through)
            ax, ay - sOff, az,  ax, ay - drop, az,  bx, by - drop, bz,
            ax, ay - sOff, az,  bx, by - drop, bz,  bx, by - sOff, bz,
            bx, by - sOff, bz,  bx, by - drop, bz,  cx, cy - drop, cz,
            bx, by - sOff, bz,  cx, cy - drop, cz,  cx, cy - sOff, cz,
            cx, cy - sOff, cz,  cx, cy - drop, cz,  dx, dy - drop, dz,
            cx, cy - sOff, cz,  dx, dy - drop, dz,  dx, dy - sOff, dz,
            dx, dy - sOff, dz,  dx, dy - drop, dz,  ax, ay - drop, az,
            dx, dy - sOff, dz,  ax, ay - drop, az,  ax, ay - sOff, az
        ]);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, mat);
        m.receiveShadow = true;
        m.castShadow = true;
        arch.add(m);
        return m;
    };

    // 7A. Washington St Accessible Sidewalk (`lx = -28.38m .. +17.55m`, connects seamlessly to Building 401 sidewalk at `lx_401 = -13.85m`!)
    const washWalkMinX = -28.38, washWalkMaxX = 17.55;
    const washPanels = 25;
    const jointMat = new THREE.MeshBasicMaterial({
        color: '#9c9588',
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3
    });
    for (let i = 0; i < washPanels; i++) {
        const xA = washWalkMinX + (i / washPanels) * (washWalkMaxX - washWalkMinX);
        const xB = washWalkMinX + ((i + 1) / washPanels) * (washWalkMaxX - washWalkMinX);
        const innerZ = xA >= 7.80 ? sallyMaxZ - 0.05 : washZ - 0.05;
        addGradedQuad(
            xA, innerZ,
            xB, innerZ,
            xB, washZ + walkW,
            xA, washZ + walkW,
            0.09,
            sidewalkMat
        );
        const jY = yGrade(xB, washZ + walkW * 0.5) + 0.136;
        addBox(0.032, 0.016, walkW - 0.08, xB, jY, washZ + walkW * 0.5, jointMat);

        const xm = (xA + xB) * 0.5;
        const isGarageCut = xm > -15.60 && xm < -11.90;
        const isSallyportCut = xm > 9.00 && xm < 16.50;
        const curbH = (isGarageCut || isSallyportCut) ? 0.035 : 0.14;
        const cMat = xm < -11.80 ? yellowSafetyMat : curbMat;
        const cY = yGrade(xm, washZ + walkW) + curbH * 0.5 + 0.035;
        const wSlopeZ = Math.atan2(yGrade(xB, washZ + walkW) - yGrade(xA, washZ + walkW), xB - xA);
        const wCurb = addBox(xB - xA + 0.02, curbH, 0.18, xm, cY, washZ + walkW + 0.06, cMat);
        wCurb.rotation.z = wSlopeZ;
    }

    // Yellow diagonal no-parking hash stripes on the garage driveway apron (`lx = -15.4m .. -12.3m`, `f27ff023.jpg`)
    for (let s = 0; s < 5; s++) {
        const sx = -15.05 + s * 0.62;
        const sy = yGrade(sx, washZ + 1.65) + 0.138;
        const stripe = addBox(0.08, 0.015, 2.85, sx, sy, washZ + 1.65, yellowSafetyMat);
        stripe.rotation.y = 0.35;
    }

    // 7B. King St Accessible Sidewalk (`lx = -31.48m .. -28.38m, lz = -22.85m .. +19.64m`, `6b872bac.jpg`, `a7727544.jpg`, connects flush at SW corner to Rear Sidewalk!)
    const kingWalkMinZ = -22.85, kingWalkMaxZ = 19.64;
    const kingPanels = 24;
    for (let i = 0; i < kingPanels; i++) {
        const zA = kingWalkMinZ + (i / kingPanels) * (kingWalkMaxZ - kingWalkMinZ);
        const zB = kingWalkMinZ + ((i + 1) / kingPanels) * (kingWalkMaxZ - kingWalkMinZ);
        addGradedQuad(
            kingX + 0.05, zA,
            kingX + 0.05, zB,
            kingX - walkW, zB,
            kingX - walkW, zA,
            0.09,
            sidewalkMat
        );
        const zm = (zA + zB) * 0.5;
        const jY = yGrade(kingX - walkW * 0.5, zB) + 0.136;
        const kJoint = addBox(walkW - 0.08, 0.016, 0.032, kingX - walkW * 0.5, jY, zB, jointMat);
        kJoint.rotation.z = Math.atan2(yGrade(kingX + 0.05, zB) - yGrade(kingX - walkW, zB), walkW);

        const isSouthDriveway = zm < -13.50;
        const curbH = isSouthDriveway ? 0.038 : 0.14;
        const cMat = (zm > 9.50 && zm <= 19.64) ? yellowSafetyMat : curbMat;
        const cY = yGrade(kingX - walkW, zm) + curbH * 0.5 + 0.035;
        const kSlopeX = Math.atan2(yGrade(kingX - walkW, zB) - yGrade(kingX - walkW, zA), zB - zA);
        const kCurb = addBox(0.18, curbH, zB - zA + 0.02, kingX - walkW - 0.06, cY, zm, cMat);
        kCurb.rotation.x = -kSlopeX;
    }

    // 7D. Rear (-Z) Accessible Concrete Sidewalk (`lx = -28.38m .. +15.80m`, welding King St Sidewalk at SW corner seamlessly to Building 401 South Sidewalk at `lx = +15.80m` / `lx_401 = -15.60m`!)
    {
        const rearMinX = kingX + 0.05; // -28.33m (flush with inner edge of King St Sidewalk!)
        const rearMaxX = 15.80;        // +15.80m (exact lx_401 = -15.60m seam!)
        const rearPanels = 22;
        const rampOuterZ = southMinZ - 1.65; // -21.49m
        for (let i = 0; i < rearPanels; i++) {
            const t0 = i / rearPanels;
            const t1 = (i + 1) / rearPanels;
            const xA = THREE.MathUtils.lerp(rearMinX, rearMaxX, t0);
            const xB = THREE.MathUtils.lerp(rearMinX, rearMaxX, t1);
            const xm = (xA + xB) * 0.5;

            const getInnerRearZ = (px) => {
                if (px >= -23.00 && px <= -2.40) return rampOuterZ;
                if (px < 3.36) return southMinZ;
                return connMinZ; // -20.095m (lz_401 = -17.98m, exact match to Building 401 South Sidewalk inner edge!)
            };
            const getOuterRearZ = (px) => {
                // Smoothly transitions from -22.85m along the ADA ramp to -21.215m at lx = +15.80m (lz_401 = -19.10m, exact match to Building 401 South Sidewalk outer edge!)
                const u = THREE.MathUtils.smoothstep(px, 3.36, 15.80);
                return THREE.MathUtils.lerp(-22.85, -21.215, u);
            };

            const zInA = getInnerRearZ(xA);
            const zInB = getInnerRearZ(xB);
            const zOutA = getOuterRearZ(xA);
            const zOutB = getOuterRearZ(xB);
            const zMid = (zInA + zOutA) * 0.5;
            const depthZ = Math.abs(zOutA - zInA);

            addGradedQuad(
                xA, zInA,
                xB, zInB,
                xB, zOutB,
                xA, zOutA,
                0.10,
                sidewalkMat
            );

            const jY = yGrade(xB, zMid) + 0.146;
            addBox(0.032, 0.016, depthZ - 0.10, xB, jY, zMid, jointMat);

            const cY = yGrade(xm, (zOutA + zOutB) * 0.5) + 0.148;
            const segW = xB - xA;
            const cSlope = Math.atan2(yGrade(xB, zOutB) - yGrade(xA, zOutA), segW);
            const cAng = Math.atan2(zOutB - zOutA, segW);
            const rearCurb = addBox(Math.hypot(segW, zOutB - zOutA) + 0.02, 0.032, 0.14, xm, cY, (zOutA + zOutB) * 0.5 + 0.07, curbMat);
            rearCurb.rotation.y = -cAng;
            rearCurb.rotation.z = cSlope;
        }
    }

    // 7E. Terrain-Graded Poured Concrete NE Service Courtyard Foundation Pad (`lx = +5.60m .. +19.45m, lz = -6.04m .. +19.05m`,
    //     seamlessly connecting the West Wing East "413" wall, Sallyport, SE Connector Wing, and Building 401 West Wall!)
    {
        const courtMinX = 5.60, courtMaxX = 19.45;
        const courtMinZ = -6.04, courtMaxZ = 19.05;
        const cSegsX = 6, cSegsZ = 8;
        for (let ix = 0; ix < cSegsX; ix++) {
            const xA = courtMinX + (ix / cSegsX) * (courtMaxX - courtMinX);
            const xB = courtMinX + ((ix + 1) / cSegsX) * (courtMaxX - courtMinX);
            for (let iz = 0; iz < cSegsZ; iz++) {
                const zA = courtMinZ + (iz / cSegsZ) * (courtMaxZ - courtMinZ);
                const zB = courtMinZ + ((iz + 1) / cSegsZ) * (courtMaxZ - courtMinZ);
                addGradedQuad(
                    xA, zA,
                    xA, zB,
                    xB, zB,
                    xB, zA,
                    0.075,
                    sidewalkMat
                );
            }
        }
    }

    // Sidewalk Utility Vault Cover with Iron Lid on King St near Bay 5/6 (`lz = +13.80m`, `a7727544.jpg`)
    {
        const uz = 13.80;
        const uy = yGrade(kingX - 2.45, uz) + 0.138;
        addBox(1.15, 0.02, 1.85, kingX - 2.45, uy, uz, curbMat);
        addBox(0.42, 0.025, 0.62, kingX - 2.60, uy + 0.005, uz + 0.15, sallyportDoorMat);
    }

    // 7C. Rounded Corner Plaza & Dual ADA Wheelchair Curb Ramps at Washington St & King St Intersection
    {
        const cornerSegs = 24;
        const radRings = 6;
        const rCorner = walkW;        // 3.095m radius matching both Washington St and King St sidewalk widths!
        const rCurb = walkW + 0.06;   // 3.155m curved curb centerline
        const pivX = kingX;           // -28.38m
        const pivZ = washZ;           // +19.64m

        // Smooth ADA ramp depression profile across the two crosswalk approaches:
        // - Washington St Crosswalk ADA Ramp: t in [0.10, 0.42]
        // - King St South Crosswalk ADA Ramp: t in [0.58, 0.90]
        const getCornerAdaDrop = (t) => {
            const washRamp =
                THREE.MathUtils.smoothstep(t, 0.08, 0.15) *
                (1.0 - THREE.MathUtils.smoothstep(t, 0.37, 0.44));
            const kingRamp =
                THREE.MathUtils.smoothstep(t, 0.56, 0.63) *
                (1.0 - THREE.MathUtils.smoothstep(t, 0.85, 0.92));
            return Math.max(washRamp, kingRamp);
        };

        const evalCornerPt = (t, u) => {
            const ang = Math.PI * 0.5 + Math.PI * 0.5 * t;
            const r = THREE.MathUtils.lerp(0.06, rCorner, u);
            const px = pivX + Math.cos(ang) * r;
            const pz = pivZ + Math.sin(ang) * r;
            const drop = getCornerAdaDrop(t);
            const rampSlope = THREE.MathUtils.smoothstep(u, 0.38, 1.0) * drop;
            const py = yGrade(px, pz) + 0.130 - rampSlope * 0.052;
            return [px, py, pz];
        };

        // Single unified polar-subdivided corner slab (no internal radial skirt walls -> zero internal crease lines!)
        const cPos = [];
        const pushTri = (ax, ay, az, bx, by, bz, cx0, cy0, cz0) => {
            cPos.push(ax, ay, az, bx, by, bz, cx0, cy0, cz0);
        };
        const pushQuadCCW = (p00, p10, p11, p01) => {
            const crossY = (p10[2] - p00[2]) * (p11[0] - p00[0]) - (p10[0] - p00[0]) * (p11[2] - p00[2]);
            if (crossY >= 0) {
                pushTri(p00[0], p00[1], p00[2], p10[0], p10[1], p10[2], p11[0], p11[1], p11[2]);
                pushTri(p00[0], p00[1], p00[2], p11[0], p11[1], p11[2], p01[0], p01[1], p01[2]);
            } else {
                pushTri(p00[0], p00[1], p00[2], p11[0], p11[1], p11[2], p10[0], p10[1], p10[2]);
                pushTri(p00[0], p00[1], p00[2], p01[0], p01[1], p01[2], p11[0], p11[1], p11[2]);
            }
        };

        for (let i = 0; i < cornerSegs; i++) {
            const t0 = i / cornerSegs;
            const t1 = (i + 1) / cornerSegs;
            const tm = (t0 + t1) * 0.5;
            const a0 = Math.PI * 0.5 + Math.PI * 0.5 * t0;
            const a1 = Math.PI * 0.5 + Math.PI * 0.5 * t1;

            for (let r = 0; r < radRings; r++) {
                const u0 = r / radRings;
                const u1 = (r + 1) / radRings;
                pushQuadCCW(
                    evalCornerPt(t0, u0),
                    evalCornerPt(t0, u1),
                    evalCornerPt(t1, u1),
                    evalCornerPt(t1, u0)
                );
            }

            // Outer street-edge vertical concrete skirt along r = rCorner (no internal radial skirts!)
            const pOut0 = evalCornerPt(t0, 1.0);
            const pOut1 = evalCornerPt(t1, 1.0);
            const sDrop = 0.34;
            pushTri(pOut0[0], pOut0[1] - 0.008, pOut0[2], pOut0[0], pOut0[1] - sDrop, pOut0[2], pOut1[0], pOut1[1] - sDrop, pOut1[2]);
            pushTri(pOut0[0], pOut0[1] - 0.008, pOut0[2], pOut1[0], pOut1[1] - sDrop, pOut1[2], pOut1[0], pOut1[1] - 0.008, pOut1[2]);

            // Seamless curved yellow safety curb (drops to a flush 0.036m lip across both ADA wheelchair curb ramps!)
            const dropM = getCornerAdaDrop(tm);
            const cx0 = pivX + Math.cos(a0) * rCurb;
            const cz0 = pivZ + Math.sin(a0) * rCurb;
            const cx1 = pivX + Math.cos(a1) * rCurb;
            const cz1 = pivZ + Math.sin(a1) * rCurb;
            const cmx = (cx0 + cx1) * 0.5;
            const cmz = (cz0 + cz1) * 0.5;
            const cLen = Math.hypot(cx1 - cx0, cz1 - cz0) + 0.025;
            const cAng = Math.atan2(cz1 - cz0, cx1 - cx0);
            const yC0 = yGrade(cx0, cz0);
            const yC1 = yGrade(cx1, cz1);
            const cSlope = Math.atan2(yC1 - yC0, cLen);
            const curbH = THREE.MathUtils.lerp(0.14, 0.036, dropM);
            const cMesh = addBox(cLen, curbH, 0.18, cmx, (yC0 + yC1) * 0.5 + curbH * 0.5 + 0.032, cmz, yellowSafetyMat);
            cMesh.rotation.y = -cAng;
            cMesh.rotation.z = cSlope;
        }

        const cornerGeo = new THREE.BufferGeometry();
        cornerGeo.setAttribute('position', new THREE.Float32BufferAttribute(cPos, 3));
        cornerGeo.computeVertexNormals();
        const cornerMesh = new THREE.Mesh(cornerGeo, sidewalkMat);
        cornerMesh.receiveShadow = true;
        cornerMesh.castShadow = true;
        arch.add(cornerMesh);

        // Clean Radial & Concentric Expansion Score Joints + ADA Ramp Cheek Flare Score Lines on the Rounded Corner
        for (const tJ of [0.10, 0.42, 0.50, 0.58, 0.90]) {
            const pIn = evalCornerPt(tJ, 0.08);
            const pOut = evalCornerPt(tJ, 0.97);
            const jmx = (pIn[0] + pOut[0]) * 0.5;
            const jmz = (pIn[2] + pOut[2]) * 0.5;
            const jmy = (pIn[1] + pOut[1]) * 0.5 + 0.008;
            const jLen = Math.hypot(pOut[0] - pIn[0], pOut[2] - pIn[2]);
            const jAng = Math.atan2(pOut[2] - pIn[2], pOut[0] - pIn[0]);
            const jSlope = Math.atan2(pOut[1] - pIn[1], jLen);
            const jMesh = addBox(jLen, 0.014, 0.028, jmx, jmy, jmz, jointMat);
            jMesh.rotation.y = -jAng;
            jMesh.rotation.z = jSlope;
        }
        for (let s = 0; s < 12; s++) {
            const tA = s / 12;
            const tB = (s + 1) / 12;
            const pA = evalCornerPt(tA, 0.52);
            const pB = evalCornerPt(tB, 0.52);
            const mx = (pA[0] + pB[0]) * 0.5;
            const mz = (pA[2] + pB[2]) * 0.5;
            const my = (pA[1] + pB[1]) * 0.5 + 0.008;
            const segLen = Math.hypot(pB[0] - pA[0], pB[2] - pA[2]) + 0.015;
            const segAng = Math.atan2(pB[2] - pA[2], pB[0] - pA[0]);
            const segSlope = Math.atan2(pB[1] - pA[1], segLen);
            const arcBar = addBox(segLen, 0.014, 0.028, mx, my, mz, jointMat);
            arcBar.rotation.y = -segAng;
            arcBar.rotation.z = segSlope;
        }

        // Curved, Terrain-Contoured Yellow ADA Tactile Warning Pads with 3D Truncated Domes
        // (Strictly inside rCorner = 3.095m so nothing ever pokes outside the rounded yellow curb!)
        const tactilePadMat = new THREE.MeshStandardMaterial({
            color: '#eab308',
            roughness: 0.42,
            metalness: 0.12,
            polygonOffset: true,
            polygonOffsetFactor: -4,
            polygonOffsetUnits: -4
        });
        const addCurvedTactilePad = (tStart, tEnd, segCount = 4) => {
            const uPadMid = 0.84; // r = 2.61m (radial depth 0.56m spans r = 2.33m .. 2.89m, strictly inside rCorner = 3.095m!)
            const padDepthR = 0.56;
            for (let i = 0; i < segCount; i++) {
                const tA = tStart + (i / segCount) * (tEnd - tStart);
                const tB = tStart + ((i + 1) / segCount) * (tEnd - tStart);
                const tM = (tA + tB) * 0.5;
                const pA = evalCornerPt(tA, uPadMid);
                const pB = evalCornerPt(tB, uPadMid);
                const pM = evalCornerPt(tM, uPadMid);
                const arcLen = Math.hypot(pB[0] - pA[0], pB[2] - pA[2]) - 0.02;
                const tangAng = Math.atan2(pB[2] - pA[2], pB[0] - pA[0]);
                const tangSlope = Math.atan2(pB[1] - pA[1], arcLen);

                const segGrp = new THREE.Group();
                segGrp.position.set(pM[0], pM[1] + 0.012, pM[2]);
                segGrp.rotation.y = -tangAng;
                segGrp.rotation.z = tangSlope;

                const padSeg = new THREE.Mesh(new THREE.BoxGeometry(arcLen, 0.022, padDepthR), tactilePadMat);
                padSeg.castShadow = true;
                padSeg.receiveShadow = true;
                segGrp.add(padSeg);

                // 3x3 raised truncated domes on each curved pad segment
                for (let ix = -1; ix <= 1; ix++) {
                    for (let iz = -1; iz <= 1; iz++) {
                        const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.028, 0.014, 6), tactilePadMat);
                        dome.position.set(ix * (arcLen * 0.30), 0.016, iz * (padDepthR * 0.30));
                        segGrp.add(dome);
                    }
                }
                arch.add(segGrp);
            }
        };

        // 1) Curved ADA Tactile Warning Pad facing the Washington St Crosswalk (t = 0.13 .. 0.39)
        addCurvedTactilePad(0.13, 0.39, 4);

        // 2) Curved ADA Tactile Warning Pad facing the King St South Crosswalk (t = 0.61 .. 0.87)
        addCurvedTactilePad(0.61, 0.87, 4);

        // Street Name Blade Pole & Stop Sign positioned cleanly inside the rounded corner plaza behind the tactile pads
        const signPostX = kingX - 1.32;
        const signPostZ = washZ + 1.32;
        const spY = yGrade(signPostX, signPostZ) + 0.09;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.75, 10), silverFrameMat);
        pole.position.set(signPostX, spY + 1.375, signPostZ);
        pole.castShadow = true;
        arch.add(pole);

        const washSignMat = new THREE.MeshStandardMaterial({
            map: _createStreetBladeTexture('Washington St'),
            roughness: 0.35
        });
        const kingSignMat = new THREE.MeshStandardMaterial({
            map: _createStreetBladeTexture('King St'),
            roughness: 0.35
        });
        addBox(0.92, 0.18, 0.025, signPostX, spY + 2.68, signPostZ, washSignMat);
        addBox(0.025, 0.18, 0.72, signPostX, spY + 2.48, signPostZ, kingSignMat);

        const stopX = kingX - 0.52;
        const stopZ = washZ + 2.18;
        const stY = yGrade(stopX, stopZ) + 0.09;
        const stopPole = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 2.35, 10), silverFrameMat);
        stopPole.position.set(stopX, stY + 1.175, stopZ);
        stopPole.castShadow = true;
        arch.add(stopPole);

        const stopSignMat = new THREE.MeshStandardMaterial({
            map: _createStopSignTexture(),
            roughness: 0.35
        });
        const stopDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.025, 8), stopSignMat);
        stopDisc.rotation.x = Math.PI / 2;
        stopDisc.rotation.z = Math.PI / 8;
        stopDisc.position.set(stopX, stY + 2.22, stopZ);
        arch.add(stopDisc);
    }

    group.add(arch);
}

// =============================================================================
// PROCEDURAL CANVAS TEXTURE HELPERS
// =============================================================================

function _createCorrugatedMetalMaterial(lightHex, shadowHex, ribs = 48) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const step = canvas.width / ribs;
    for (let i = 0; i < ribs; i++) {
        const grad = ctx.createLinearGradient(i * step, 0, (i + 1) * step, 0);
        grad.addColorStop(0.0, lightHex);
        grad.addColorStop(0.5, shadowHex);
        grad.addColorStop(1.0, lightHex);
        ctx.fillStyle = grad;
        ctx.fillRect(i * step, 0, step + 0.5, canvas.height);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.48,
        metalness: 0.32
    });
}

function _createChelanCountyFriezeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#d3d6d9';
    ctx.fillRect(0, 0, 512, 96);
    ctx.strokeStyle = '#585d63';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 84);
    ctx.fillStyle = '#2d3237';
    ctx.font = 'bold 40px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('•  CHELAN   COUNTY  •', 256, 50);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function _createAddressSignTexture(numStr, bgHex, fgHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, 128, 160);
    ctx.strokeStyle = fgHex;
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 116, 148);
    ctx.fillStyle = fgHex;
    ctx.font = 'bold 52px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(numStr, 64, 52);
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText('CHELAN', 64, 108);
    ctx.fillText('COUNTY', 64, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function _createHiringBannerTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#181c20';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 120);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CHELAN COUNTY RJ', 128, 30);
    ctx.font = 'italic bold 28px Georgia, serif';
    ctx.fillText('We are Hiring', 128, 68);
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText('CORRECTIONS DEPUTIES', 128, 102);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function _createStreetBladeTexture(label) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0e6b38';
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 56);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 128, 34);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function _createStopSignTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#c81e1e';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 112, 112);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('STOP', 64, 66);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}
