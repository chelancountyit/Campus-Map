import * as THREE from 'three';
import { createLumaGrassMaterial, ensurePlanarGrassUVs } from '../../materials/GrassMaterial.js';

/**
 * Building 350 (Chelan County Courthouse) — Orondo Ave Front Grounds, Monumental Stairs,
 * Pedestal Lanterns, Flagpole Plaza, Ribbed Concrete Monument Wall, Fieldstone Wall, Sidewalks & Trees
 * Modeled directly from reference photos 5e38395b.jpg, 6c671f3a.jpg, 9eec3eb2.jpg, 3c96353c.jpg,
 * c95d4e90.jpg, 79f8f182.jpg, f450bcb6.jpg, and aerial view a2489d57.jpg.
 */
export function buildBuilding350Grounds(arch, mats, terrainY, getTerrainHeightFn) {
    const {
        smoothGraniteMat,
        ribbedConcreteMat,
        concreteWalkMat,
        curbYellowMat,
        fieldstoneMat,
        pipeHandrailMat,
        flagpoleMat,
        usFlagMat,
        powFlagMat,
        waFlagMat,
        countyFlagMat,
        securityFenceSlatMat,
        doorsLockedSignMat,
        darkFrameMat,
        glassMat
    } = mats;

    const frontZ = 26.125;
    const minX = -15.26;
    const maxX = 10.18;
    const midX = -2.54;

    const midWalkY = -1.28; // Elevation of the mid-level cross-walkway & flagpole plaza relative to Floor 2 (y = 0.0m)
    const orondoWalkY = -2.35; // Elevation of the Orondo Ave sidewalk relative to Floor 2 (y = 0.0m)

    const sampleLocalY = (lx, lz, fallbackY = 0) => {
        if (!getTerrainHeightFn) return fallbackY;
        const wx = 56.17 + lx * 0.59410 + lz * 0.80439;
        const wz = 7.98 - lx * 0.80439 + lz * 0.59410;
        return getTerrainHeightFn(wx, wz) - terrainY;
    };

    // Lush 3D Luma Turf Grass Material matching Building 300 / 316 / 400
    const turfLawnMat = createLumaGrassMaterial({
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
    });

    // Build Contoured 3D Grass Lawns across the entire Building 350 Grounds (SW Washington St strip,
    // Upper-Left Fieldstone-Retained Lawn, Lower-Left Lawn, Upper-Right Lawn, Lower-Right Lawn & NE Park Lawn)
    buildContoured350GrassLawns(arch, turfLawnMat, sampleLocalY, minX, maxX, midX, frontZ, midWalkY);

    // 1. Upper Entrance Landing & Cheek Piers (lz = 26.125m .. 28.55m, y = 0.0m)
    const stairW = 4.60;
    const cheekW = 0.38;
    const landingD = 2.42;
    const landingH = 1.45;
    const landingMesh = new THREE.Mesh(
        new THREE.BoxGeometry(stairW, landingH, landingD),
        concreteWalkMat
    );
    landingMesh.position.set(midX, -landingH * 0.5 + 0.02, frontZ + landingD * 0.5);
    landingMesh.receiveShadow = true;
    landingMesh.castShadow = true;
    arch.add(landingMesh);

    // Flanking concrete cheek piers at the top of the stairs + 2 Ornate Dark-Green Hexagonal Pedestal Lanterns (4ee09d25.jpg, 79f8f182.jpg)
    [-stairW * 0.5 - cheekW * 0.5, stairW * 0.5 + cheekW * 0.5].forEach((cx) => {
        const pierH = 1.85;
        const pier = new THREE.Mesh(
            new THREE.BoxGeometry(cheekW, pierH, landingD + 0.16),
            ribbedConcreteMat
        );
        pier.position.set(midX + cx, 0.36 - pierH * 0.5, frontZ + landingD * 0.5);
        pier.castShadow = true;
        pier.receiveShadow = true;
        arch.add(pier);

        // Ornate dark-green hexagonal cast-iron pedestal lantern on top of each cheek pier (y = 0.36m)
        buildHexagonalPedestalLantern(arch, midX + cx, 0.36, frontZ + landingD - 0.32);
    });

    // 2. Upper Flight of 8 Wide Concrete Steps (lz = 28.55m .. 31.95m, descending y = 0.0m -> -1.28m)
    const upperStairStartZ = frontZ + landingD; // 28.545m
    const upperStairEndZ = 31.95;
    const upperStairRun = upperStairEndZ - upperStairStartZ; // 3.405m
    const upperSteps = 8;
    const stepRun = upperStairRun / upperSteps;
    const stepRise = (0.0 - midWalkY) / upperSteps; // 0.16m

    for (let i = 0; i < upperSteps; i++) {
        const sy = -stepRise * (i + 1);
        const sz = upperStairStartZ + (i + 0.5) * stepRun;
        const stepH = (sy - (midWalkY - 0.45));
        const stepMesh = new THREE.Mesh(
            new THREE.BoxGeometry(stairW, stepH, stepRun + 0.04),
            concreteWalkMat
        );
        stepMesh.position.set(midX, sy - stepH * 0.5, sz);
        stepMesh.castShadow = true;
        stepMesh.receiveShadow = true;
        arch.add(stepMesh);
    }

    // Sloped concrete cheek walls flanking the upper stair flight (79f8f182.jpg, 9eec3eb2.jpg)
    [-stairW * 0.5 - cheekW * 0.5, stairW * 0.5 + cheekW * 0.5].forEach((cx) => {
        for (let s = 0; s < 8; s++) {
            const t = (s + 0.5) / 8;
            const cz = THREE.MathUtils.lerp(upperStairStartZ, upperStairEndZ, t);
            const topY = THREE.MathUtils.lerp(0.32, midWalkY + 0.36, t);
            const botY = midWalkY - 0.45;
            const ch = topY - botY;
            const seg = new THREE.Mesh(
                new THREE.BoxGeometry(cheekW, ch, upperStairRun / 8 + 0.06),
                ribbedConcreteMat
            );
            seg.position.set(midX + cx, botY + ch * 0.5, cz);
            seg.castShadow = true;
            seg.receiveShadow = true;
            arch.add(seg);
        }
    });

    // 3-Rail Galvanized Pipe Handrails on Upper Flight (Left, Center, Right — matching 79f8f182.jpg & 5e38395b.jpg)
    [-stairW * 0.46, 0, stairW * 0.46].forEach((rx) => {
        buildStairPipeHandrail(
            arch,
            midX + rx,
            upperStairStartZ - 0.35,
            0.0,
            upperStairEndZ + 0.25,
            midWalkY,
            pipeHandrailMat
        );
    });

    // 3. Mid-Level Concrete Cross-Walkway (lz = 31.95m .. 34.55m, y = midWalkY = -1.28m)
    const crossWalkD = 2.60;
    const crossWalkMidZ = 31.95 + crossWalkD * 0.5; // 33.25m
    // Main central landing pad below upper stairs
    const midLanding = new THREE.Mesh(
        new THREE.BoxGeometry(stairW + 1.20, 0.70, crossWalkD),
        concreteWalkMat
    );
    midLanding.position.set(midX, midWalkY - 0.35, crossWalkMidZ);
    midLanding.receiveShadow = true;
    arch.add(midLanding);

    // Cross-walk path extending left (-X) along the base of the fieldstone retaining wall to the Washington St sidewalk (lx = -20.00m)
    const leftCrossSegs = 8;
    const leftStartX = -20.00;
    const leftEndX = midX - stairW * 0.5;
    for (let i = 0; i < leftCrossSegs; i++) {
        const t = (i + 0.5) / leftCrossSegs;
        const sx = THREE.MathUtils.lerp(leftEndX, leftStartX, t);
        const terrY = sampleLocalY(sx, 32.55, THREE.MathUtils.lerp(midWalkY, -1.18, t));
        const sy = Math.max(terrY + 0.04, THREE.MathUtils.lerp(midWalkY, -1.18, t));
        const segW = (leftEndX - leftStartX) / leftCrossSegs + 0.08;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(segW, 0.55, 1.55), concreteWalkMat);
        seg.position.set(sx, sy - 0.25, 32.55);
        seg.receiveShadow = true;
        arch.add(seg);
    }

    // 4. Lower Axial Stepped Concrete Walk to Orondo Ave Sidewalk (lz = 34.55m .. 45.80m, descending y = -1.28m -> -2.35m)
    // Visible in aerial view a2489d57.jpg & 5e38395b.jpg!
    const lowerStartZ = 34.55;
    const lowerEndZ = 45.80;
    const lowerRun = lowerEndZ - lowerStartZ; // 11.25m
    const lowerSegs = 10;
    const lSegD = lowerRun / lowerSegs;
    for (let i = 0; i < lowerSegs; i++) {
        const t = (i + 0.5) / lowerSegs;
        const sz = lowerStartZ + (i + 0.5) * lSegD;
        const sy = THREE.MathUtils.lerp(midWalkY, orondoWalkY, t);
        const stepSlab = new THREE.Mesh(
            new THREE.BoxGeometry(stairW + 0.30, 0.85, lSegD + 0.06),
            concreteWalkMat
        );
        stepSlab.position.set(midX, sy - 0.425, sz);
        stepSlab.receiveShadow = true;
        stepSlab.castShadow = true;
        arch.add(stepSlab);

        // Raised concrete edge curbs on left & right of lower stepped walk
        [-stairW * 0.5 - 0.12, stairW * 0.5 + 0.12].forEach((cx) => {
            const curb = new THREE.Mesh(
                new THREE.BoxGeometry(0.24, 0.96, lSegD + 0.06),
                ribbedConcreteMat
            );
            curb.position.set(midX + cx, sy - 0.40, sz);
            arch.add(curb);
        });
    }

    // Galvanized Pipe Handrails along Lower Stepped Walk (Left, Center, Right — matching a2489d57.jpg, 5e38395b.jpg & 9eec3eb2.jpg)
    [-stairW * 0.46, 0, stairW * 0.46].forEach((rx) => {
        buildStairPipeHandrail(
            arch,
            midX + rx,
            lowerStartZ + 0.20,
            midWalkY,
            lowerEndZ - 1.20,
            orondoWalkY + 0.12,
            pipeHandrailMat
        );
    });

    // 5. Paved Concrete Flagpole Plaza & Stepped Horizontal-Ribbed Concrete Monument/Retaining Wall
    // (lx = -0.10m .. +12.50m, lz = 31.95m .. 39.25m, y = midWalkY = -1.28m)
    // Visible in aerial view a2489d57.jpg, 6c671f3a.jpg, 5dac9123.jpg, c95d4e90.jpg!
    const plazaMinX = -0.10;
    const plazaMaxX = 12.50;
    const plazaW = plazaMaxX - plazaMinX; // 12.60m
    const plazaMidX = (plazaMinX + plazaMaxX) * 0.5; // +6.20m
    const plazaMinZ = 31.95;
    const plazaMaxZ = 39.25;
    const plazaD = plazaMaxZ - plazaMinZ; // 7.30m
    const plazaMidZ = (plazaMinZ + plazaMaxZ) * 0.5; // 35.60m

    const plazaSlab = new THREE.Mesh(
        new THREE.BoxGeometry(plazaW, 1.85, plazaD),
        concreteWalkMat
    );
    plazaSlab.position.set(plazaMidX, midWalkY - 0.925, plazaMidZ);
    plazaSlab.receiveShadow = true;
    plazaSlab.castShadow = true;
    arch.add(plazaSlab);

    // Stepped Horizontal-Ribbed Architectural Concrete Monument/Retaining Wall along the front (+Z) & side edges of Flagpole Plaza
    // In 6c671f3a.jpg & a2489d57.jpg, the front wall has 3 projecting bays aligned with the 3 flagpoles!
    const wallTopY = midWalkY + 0.58; // Rises ~0.58m above the Flagpole Plaza as a low parapet bench wall, and drops 2.2m down to the lower lawn!
    const wallBotY = midWalkY - 2.15;
    const wallH = wallTopY - wallBotY;
    const wallMidY = (wallTopY + wallBotY) * 0.5;

    // Main front monument wall spine at lz = plazaMaxZ (39.25m)
    const frontMonWall = new THREE.Mesh(
        new THREE.BoxGeometry(plazaW + 0.40, wallH, 0.48),
        ribbedConcreteMat
    );
    frontMonWall.position.set(plazaMidX, wallMidY, plazaMaxZ);
    frontMonWall.castShadow = true;
    frontMonWall.receiveShadow = true;
    arch.add(frontMonWall);

    // Top overhanging coping cap on front monument wall (with drainage notches visible in 6c671f3a.jpg & 9eec3eb2.jpg)
    const frontMonCap = new THREE.Mesh(
        new THREE.BoxGeometry(plazaW + 0.56, 0.14, 0.62),
        ribbedConcreteMat
    );
    frontMonCap.position.set(plazaMidX, wallTopY + 0.05, plazaMaxZ);
    frontMonCap.castShadow = true;
    arch.add(frontMonCap);

    // 3 Projecting Ribbed Concrete Pilaster Bays on the front monument wall aligned with the 3 flagpoles (6c671f3a.jpg)
    const flagPoleXs = [2.20, 6.20, 10.20];
    flagPoleXs.forEach((fx) => {
        const bayBump = new THREE.Mesh(
            new THREE.BoxGeometry(3.20, wallH + 0.04, 0.28),
            ribbedConcreteMat
        );
        bayBump.position.set(fx, wallMidY, plazaMaxZ + 0.18);
        bayBump.castShadow = true;
        arch.add(bayBump);

        const bayCap = new THREE.Mesh(
            new THREE.BoxGeometry(3.36, 0.15, 0.36),
            ribbedConcreteMat
        );
        bayCap.position.set(fx, wallTopY + 0.055, plazaMaxZ + 0.20);
        arch.add(bayCap);
    });

    // Left & Right return wing walls of the Flagpole Plaza monument wall (9eec3eb2.jpg, a2489d57.jpg)
    const leftReturnWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, wallH, 4.60),
        ribbedConcreteMat
    );
    leftReturnWall.position.set(plazaMinX, wallMidY, plazaMaxZ - 2.30);
    leftReturnWall.castShadow = true;
    arch.add(leftReturnWall);

    const rightReturnWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, wallH, plazaD),
        ribbedConcreteMat
    );
    rightReturnWall.position.set(plazaMaxX, wallMidY, plazaMidZ);
    rightReturnWall.castShadow = true;
    arch.add(rightReturnWall);

    // 6. Three Tall Tapered Metallic Flagpoles in Yellow-Curbed Square Concrete Pads + Black Ground Floodlights
    // (c95d4e90.jpg, 6c671f3a.jpg, a2489d57.jpg)
    const flagConfigs = [
        { x: 2.20, h: 15.6, mainFlagMat: usFlagMat, subFlagMat: powFlagMat, hasEagle: true },
        { x: 6.20, h: 14.0, mainFlagMat: waFlagMat, subFlagMat: null, hasEagle: false },
        { x: 10.20, h: 14.0, mainFlagMat: countyFlagMat, subFlagMat: null, hasEagle: false }
    ];

    flagConfigs.forEach((cfg, poleIdx) => {
        const fz = 36.85;
        // Yellow-bordered square concrete pad (c95d4e90.jpg)
        const padYellow = new THREE.Mesh(
            new THREE.BoxGeometry(1.68, 0.08, 1.68),
            curbYellowMat
        );
        padYellow.position.set(cfg.x, midWalkY + 0.03, fz);
        padYellow.receiveShadow = true;
        arch.add(padYellow);

        const padInner = new THREE.Mesh(
            new THREE.BoxGeometry(1.42, 0.09, 1.42),
            concreteWalkMat
        );
        padInner.position.set(cfg.x, midWalkY + 0.035, fz);
        padInner.receiveShadow = true;
        arch.add(padInner);

        // Tapered silver/white aluminum flagpole + base collar
        const baseCollar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.22, 0.12, 14),
            flagpoleMat
        );
        baseCollar.position.set(cfg.x, midWalkY + 0.12, fz);
        arch.add(baseCollar);

        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.045, 0.11, cfg.h, 14),
            flagpoleMat
        );
        pole.position.set(cfg.x, midWalkY + cfg.h * 0.5, fz);
        pole.castShadow = true;
        arch.add(pole);

        // Halyard cleat box on pole (visible in c95d4e90.jpg)
        const cleatBox = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.14), flagpoleMat);
        cleatBox.position.set(cfg.x - 0.08, midWalkY + 1.45, fz);
        arch.add(cleatBox);

        // Gold finial ball (+ eagle on US flagpole)
        const goldMat = new THREE.MeshStandardMaterial({ color: '#d4af37', roughness: 0.25, metalness: 0.85 });
        const finialBall = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), goldMat);
        finialBall.position.set(cfg.x, midWalkY + cfg.h + 0.08, fz);
        arch.add(finialBall);

        // Main Flag (subdivided for smooth real-time wind animation)
        const flagGeo = new THREE.PlaneGeometry(2.35, 1.32, 20, 10);
        const pos = flagGeo.attributes.position;
        for (let k = 0; k < pos.count; k++) {
            const u = pos.getX(k) + 1.175;
            pos.setZ(k, Math.sin(u * 2.8) * 0.12 * (u / 2.35));
        }
        flagGeo.computeVertexNormals();
        const mainFlag = new THREE.Mesh(flagGeo, cfg.mainFlagMat);
        mainFlag.position.set(cfg.x + 1.22, midWalkY + cfg.h - 0.85, fz);
        mainFlag.castShadow = true;
        mainFlag.userData = {
            isAnimatedFlag: true,
            flagWidth: 2.35,
            flagHeight: 1.32,
            hoistSide: -1,
            phaseOffset: poleIdx * 1.35,
            droop: -0.05,
            ampZ: 0.16,
            ampY: 0.035
        };
        arch.add(mainFlag);

        // Sub-flag (POW/MIA flag below US flag)
        if (cfg.subFlagMat) {
            const subFlag = new THREE.Mesh(flagGeo.clone(), cfg.subFlagMat);
            subFlag.scale.set(0.82, 0.82, 0.82);
            subFlag.position.set(cfg.x + 1.02, midWalkY + cfg.h - 2.15, fz);
            subFlag.castShadow = true;
            subFlag.userData = {
                isAnimatedFlag: true,
                flagWidth: 2.35,
                flagHeight: 1.32,
                hoistSide: -1,
                phaseOffset: poleIdx * 1.35 + 0.85,
                droop: -0.05,
                ampZ: 0.15,
                ampY: 0.032
            };
            arch.add(subFlag);
        }

        // Black ground floodlight fixture behind each flagpole (c95d4e90.jpg)
        const floodMat = new THREE.MeshStandardMaterial({ color: '#1b1e22', roughness: 0.4, metalness: 0.6 });
        const floodStand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.26, 8), floodMat);
        floodStand.position.set(cfg.x + 0.65, midWalkY + 0.13, fz - 1.15);
        arch.add(floodStand);

        const floodHead = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.26), floodMat);
        floodHead.rotation.x = -0.55;
        floodHead.position.set(cfg.x + 0.65, midWalkY + 0.28, fz - 1.15);
        arch.add(floodHead);
    });

    // 7. Grey Granite Cornerstone / Time-Capsule Monument Block on the right lawn (c95d4e90.jpg & a2489d57.jpg)
    const capsuleBlock = new THREE.Mesh(
        new THREE.BoxGeometry(0.82, 0.78, 0.56),
        smoothGraniteMat
    );
    capsuleBlock.position.set(4.85, midWalkY + 0.26, 30.85);
    capsuleBlock.rotation.y = -0.25;
    capsuleBlock.castShadow = true;
    capsuleBlock.receiveShadow = true;
    arch.add(capsuleBlock);

    // 8. Dry-Stacked Multi-Color Fieldstone Retaining Wall on Left Lawn (f450bcb6.jpg, 5e38395b.jpg, 3c96353c.jpg, a2489d57.jpg)
    // Extends from the left stair cheek wall (-5.22m) out to the inner edge of the Washington St sidewalk (-19.75m)
    const stoneWallSegs = 10;
    const swStartX = midX - stairW * 0.5 - cheekW; // -5.22m
    const swEndX = -19.75;
    for (let i = 0; i < stoneWallSegs; i++) {
        const t = (i + 0.5) / stoneWallSegs;
        const sx = THREE.MathUtils.lerp(swStartX, swEndX, t);
        const terrY = sampleLocalY(sx, 31.55, -0.95);
        const topY = Math.max(terrY + 0.42, THREE.MathUtils.lerp(-0.42, -0.58, t));
        const botY = terrY - 0.35;
        const sh = Math.max(0.55, topY - botY);
        const segW = Math.abs(swEndX - swStartX) / stoneWallSegs + 0.06;
        const stoneSeg = new THREE.Mesh(
            new THREE.BoxGeometry(segW, sh, 0.52),
            fieldstoneMat
        );
        stoneSeg.position.set(sx, botY + sh * 0.5, 31.55);
        stoneSeg.castShadow = true;
        stoneSeg.receiveShadow = true;
        arch.add(stoneSeg);
    }

    // Return of the fieldstone retaining wall along the inner edge of the Washington St sidewalk (lx = -19.75m, lz = 19.5m .. 31.55m, visible in 3c96353c.jpg & a2489d57.jpg)
    const washStoneSegs = 6;
    for (let i = 0; i < washStoneSegs; i++) {
        const t = (i + 0.5) / washStoneSegs;
        const sz = THREE.MathUtils.lerp(19.50, 31.55, t);
        const terrY = sampleLocalY(-19.75, sz, -0.55);
        const stoneRetSeg = new THREE.Mesh(
            new THREE.BoxGeometry(0.52, 0.65, (31.55 - 19.50) / washStoneSegs + 0.06),
            fieldstoneMat
        );
        stoneRetSeg.position.set(-19.75, terrY + 0.12, sz);
        stoneRetSeg.castShadow = true;
        arch.add(stoneRetSeg);
    }

    // 9. Orondo Ave Sidewalk (lz = 45.80m .. 48.80m), Washington St Sidewalk (lx = -20.00m .. -23.16m/-22.80m),
    //    and the 90° Rounded Corner Bulb-Out, ADA Ramp, Yellow Tactile Pad & Continental Crosswalks at Orondo & Washington (1a7cd213.jpg!)
    const washWalkCenterX = -21.40;
    const washWalkW = 2.80; // lx = -22.80m (curb) .. -20.00m (lawn edge)

    const perimCurbMat = new THREE.MeshStandardMaterial({
        color: '#f2eee6',
        roughness: 0.75,
        metalness: 0.04,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
    });
    const perimScoreMat = new THREE.MeshBasicMaterial({
        color: '#9c9588',
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3
    });

    const orondoWalkSegs = 22;
    const oMinX = -18.55; // Meets the 90° rounded corner bulb-out at lx = -18.55m!
    const oMaxX = maxX + 12.00; // +22.18m (welds seamlessly into 4B Left Park Sidewalk Extension!)
    const oSpanX = oMaxX - oMinX;
    const oSegW = oSpanX / orondoWalkSegs;
    for (let i = 0; i < orondoWalkSegs; i++) {
        const x0 = oMinX + i * oSegW;
        const x1 = x0 + oSegW;
        const ox = (x0 + x1) * 0.5;
        const y0 = sampleLocalY(x0, 47.30, -2.20) + 0.10;
        const y1 = sampleLocalY(x1, 47.30, -2.20) + 0.10;
        const oy = (y0 + y1) * 0.5;
        const slopeAng = Math.atan2(y1 - y0, oSegW);
        const segLen = Math.hypot(oSegW, y1 - y0) + 0.03;
        const walkSlab = new THREE.Mesh(
            new THREE.BoxGeometry(segLen, 0.44, 3.00),
            concreteWalkMat
        );
        walkSlab.rotation.z = slopeAng;
        walkSlab.position.set(ox, oy - 0.22, 47.30);
        walkSlab.receiveShadow = true;
        arch.add(walkSlab);

        // Transverse expansion score joint matching Building 400 & Courthouse Park 4B
        const jMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.032, 0.016, 2.84),
            perimScoreMat
        );
        jMesh.position.set(x0, y0 + 0.006, 47.30);
        arch.add(jMesh);

        // Finished #f2eee6 street curb along Orondo Ave (+Z = 48.73m) & inner edge (-Z = 45.87m, leaving opening at Lower Axial Walk lx = -6.20m .. +1.10m)
        const outerCurb = new THREE.Mesh(
            new THREE.BoxGeometry(segLen, 0.16, 0.14),
            perimCurbMat
        );
        outerCurb.rotation.z = slopeAng;
        outerCurb.position.set(ox, oy - 0.05, 48.73);
        outerCurb.castShadow = true;
        arch.add(outerCurb);

        if (ox < -6.20 || ox > 1.10) {
            const innerCurb = new THREE.Mesh(
                new THREE.BoxGeometry(segLen, 0.032, 0.14),
                perimCurbMat
            );
            innerCurb.rotation.z = slopeAng;
            innerCurb.position.set(ox, oy + 0.008, 45.87);
            arch.add(innerCurb);
        }
    }

    // Washington St Sidewalk running from the Building 401 Washington St promenade seam (lz = -17.50m, lx = -23.16m .. -16.50m)
    // to the 90° Orondo/Washington rounded corner transition (lz = 41.20m, lx = -22.80m .. -20.00m)
    const washWalkSegs = 28;
    const wMinZ = -17.50;
    const wMaxZ = 41.20;
    const wSpanZ = wMaxZ - wMinZ;
    const wSegD = wSpanZ / washWalkSegs;
    for (let i = 0; i < washWalkSegs; i++) {
        const z0 = wMinZ + i * wSegD;
        const z1 = z0 + wSegD;
        const wz = (z0 + z1) * 0.5;
        // At the south end (lz = -17.50m .. -14.50m), smoothly flare the outer curb edge from -23.165m (exact Building 401 curbZ = 24.85m!) to -22.80m
        const flareU = 1.0 - THREE.MathUtils.smoothstep(wz, -17.50, -13.50);
        const outerX = THREE.MathUtils.lerp(-22.80, -23.165, flareU);
        const innerX = -20.00;
        const curW = innerX - outerX;
        const curCX = (outerX + innerX) * 0.5;

        const y0 = sampleLocalY(curCX, z0, 0.0) + 0.132;
        const y1 = sampleLocalY(curCX, z1, 0.0) + 0.132;
        const wy = (y0 + y1) * 0.5;
        const slopeX = Math.atan2(y1 - y0, wSegD);
        const segLen = Math.hypot(wSegD, y1 - y0) + 0.04;

        const wSlab = new THREE.Mesh(
            new THREE.BoxGeometry(curW, 0.45, segLen),
            concreteWalkMat
        );
        wSlab.rotation.x = -slopeX;
        wSlab.position.set(curCX, wy - 0.225, wz);
        wSlab.receiveShadow = true;
        arch.add(wSlab);

        // Transverse expansion score joint matching Building 400 & Building 401 sidewalks
        const wJoint = new THREE.Mesh(
            new THREE.BoxGeometry(curW - 0.12, 0.016, 0.032),
            perimScoreMat
        );
        wJoint.position.set(curCX, y0 + 0.006, z0);
        arch.add(wJoint);

        // Finished #f2eee6 street curb along Washington St outer edge (outerX + 0.07m)
        const isYellowLoadZone = wz >= 1.80 && wz <= 7.20;
        const wCurb = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.16, segLen),
            isYellowLoadZone ? curbYellowMat : perimCurbMat
        );
        wCurb.rotation.x = -slopeX;
        wCurb.position.set(outerX + 0.07, wy - 0.05, wz);
        wCurb.castShadow = true;
        arch.add(wCurb);
    }

    // 9B. Orondo Ave & Washington St 90° Rounded Corner Bulb-Out, S-Curved White Landscape Border,
    //     Yellow Tactile Warning Pad, Radial Score Lines & Twin-Bar Continental Crosswalks (1a7cd213.jpg!)
    buildOrondoWashingtonRoundedCorner(
        arch,
        {
            concreteWalkMat,
            ribbedConcreteMat,
            curbYellowMat
        },
        sampleLocalY
    );

    // 10. Washington St Side Grounds (Rear Concrete Plaza Apron, Curved-Curb Rear Grass & Sidewalk Vault Grate,
    // 4-Bay White-Slatted Chain-Link Security Fence Enclosure & Utility Compound, and Bay 5 "COUNTY BUILDING"
    // Side Entrance Yellow Steps, White Portable Ramp, Right Handrail & 2-Tier Stacked-Block Planters)
    // Modeled directly from reference photos 9728efd3.jpg, 9915b876.jpg, 0cf908f6.jpg, f4021356.jpg, 297c2294.jpg, 0c643386.jpg & e275ac5f.jpg!
    buildWashingtonStSideGrounds(
        arch,
        {
            concreteWalkMat,
            ribbedConcreteMat,
            curbYellowMat,
            pipeHandrailMat,
            securityFenceSlatMat
        },
        sampleLocalY,
        minX
    );

    // 11. Courthouse Park (+X) Front Grounds, Monumental Park Staircase, Stepped Stone Cheek Walls,
    //     Twin Fluted Dark-Green Classical Post Lanterns, "(NO PUBLIC ACCESS) DOORS LOCKED" Sign Banner,
    //     Black Wrought-Iron Picket Fence HVAC Enclosure, S-Curved Concrete Landscape Edging Curbs,
    //     Conical Arborvitae Shrubs, Wide Park Promenade, and the 401–350 Skybridge, Recessed Concrete Wall,
    //     Two-Tier Dark-Bronze & Black Glass Park Entrance Vestibule & Sloped Concrete ADA Ramp with Handrails!
    //     Modeled directly from reference photos 3e77aa21.jpg, e637f636.jpg, 456d4b4a.jpg, ac388739.jpg, 45990f7d.jpg,
    //     ea374598.jpg, 780f317e.jpg, 9c4bd790.jpg, 6496ecdd.jpg & 207f8d8c.jpg!
    buildParkSideGrounds(
        arch,
        {
            smoothGraniteMat,
            ribbedConcreteMat,
            concreteWalkMat,
            pipeHandrailMat,
            usFlagMat,
            doorsLockedSignMat,
            darkFrameMat,
            glassMat
        },
        sampleLocalY,
        maxX,
        frontZ,
        midWalkY
    );

    // Tall Concrete Pedestal & Bronze Bird Sculpture inside the Washington St / Orondo Ave Corner (visible in 1a7cd213.jpg, 3c96353c.jpg & a2489d57.jpg)
    const pedX = -18.50;
    const pedZ = 43.80;
    const pedGroundY = sampleLocalY(pedX, pedZ, -1.68);
    const cornerPed = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 1.55, 0.78),
        ribbedConcreteMat
    );
    cornerPed.position.set(pedX, pedGroundY + 0.775, pedZ);
    cornerPed.castShadow = true;
    arch.add(cornerPed);

    const bronzeSculptMat = new THREE.MeshStandardMaterial({ color: '#382e26', roughness: 0.35, metalness: 0.75 });
    const birdSculpt = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.75, 7), bronzeSculptMat);
    birdSculpt.position.set(pedX, pedGroundY + 1.88, pedZ);
    birdSculpt.rotation.z = 0.25;
    arch.add(birdSculpt);
}

/**
 * Builds the detailed Washington St (-X) side grounds from Rear (lz = -17.43m) to Front (lz = +26.125m)
 * modeled directly from reference photos 3188a364.jpg, 6cad8200.jpg, 0c643386.jpg, e275ac5f.jpg, 297c2294.jpg & 9728efd3.jpg:
 * 1. Rear Concrete Plaza Apron (lz = -17.43m .. -15.10m, lx = -20.00m .. -15.26m)
 * 2. Rear Grass Patch under Rear Pavilion window (lz = -15.10m .. -10.30m) + S-Curved White Concrete Landscape Border
 *    meeting the back-left corner post of the fence + Dark Iron Sidewalk Vault Grate (lx = -21.25m, lz = -11.85m)
 * 3. 6-Panel White-Slatted Chain-Link Security Fence Enclosure & Utility Compound in front of Bays 1, 2 & 3
 *    (lz = -10.30m .. +2.15m, lx = -19.85m .. -15.36m):
 *    - 3 wide left panels (Panels 1–3) over a smooth raised concrete pad curb
 *    - 2 narrower center-right hinged gate panels (Panels 4–5) with dark forest-green vertical gate frame tubes
 *    - 1 right end panel (Panel 6) over a 1-course grey split-face concrete-block curb that wraps into the left planter
 *    - 2-bay South & North return fence walls + inner East fence line with 5 orange safety cones, teal switchgear cabinet & 3 olive transformers
 * 4. Washington St "COUNTY BUILDING" Side Entrance at Bay 4 (lz = +4.35m):
 *    Concrete Entrance Walk, 2 Yellow-Painted Concrete Steps ("Parking / Loading Zone"), White Portable Ramp,
 *    Right Pipe Handrail, 2 Flanking Two-Tier Grey Split-Face Block Planters, and Yellow Street Curbs
 */
function buildWashingtonStSideGrounds(arch, mats, sampleLocalY, minX) {
    const {
        concreteWalkMat,
        ribbedConcreteMat,
        curbYellowMat,
        pipeHandrailMat,
        securityFenceSlatMat
    } = mats;

    const darkMulchMat = new THREE.MeshStandardMaterial({ color: '#2b2622', roughness: 0.95 });
    const whiteCurbMat = new THREE.MeshStandardMaterial({ color: '#eceae4', roughness: 0.65 });
    const ironGrateMat = new THREE.MeshStandardMaterial({ color: '#2c3034', roughness: 0.55, metalness: 0.75 });
    const blackFenceFrameMat = new THREE.MeshStandardMaterial({ color: '#1a1e22', roughness: 0.42, metalness: 0.72 });
    const greenGateFrameMat = new THREE.MeshStandardMaterial({ color: '#0d4a34', roughness: 0.38, metalness: 0.62 });
    const tealCabinetMat = new THREE.MeshStandardMaterial({ color: '#1b8a7a', roughness: 0.42, metalness: 0.35 });
    const xformerOliveMat = new THREE.MeshStandardMaterial({ color: '#6d7564', roughness: 0.50, metalness: 0.40 });
    const safetyConeMat = new THREE.MeshStandardMaterial({ color: '#ff5511', roughness: 0.45 });
    const splitBlockMat = new THREE.MeshStandardMaterial({ color: '#9c9890', roughness: 0.88 });
    const whiteRampMat = new THREE.MeshStandardMaterial({ color: '#f2f2ef', roughness: 0.45, metalness: 0.15 });

    // 1. S-Curved White Concrete Landscape Border & Dark Mulch Bed along the entire Rear Pavilion base
    //    from the SW Breezeway Corner (lz = -17.425m) to the Security Fence Compound (lz = -10.30m)
    //    Modeled directly from media_1794271546977_6613a6a1.jpg, media_1794271635668_a9d4584b.jpg & media_1794271688856_e8b00085.jpg!
    const rearLawnY = Math.max(sampleLocalY(-16.20, -13.85, -0.15) + 0.04, -0.16);
    const gravelStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.76, 0.46, 7.12),
        darkMulchMat
    );
    gravelStrip.position.set(minX - 0.38, rearLawnY - 0.21, -13.86);
    gravelStrip.receiveShadow = true;
    arch.add(gravelStrip);

    // Return segment of white landscape curb at the SW Breezeway Corner (lz = -17.425m, lx = minX - 0.76 .. minX)
    const whiteCurbSouthReturn = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.48, 0.14),
        whiteCurbMat
    );
    whiteCurbSouthReturn.position.set(minX - 0.38, rearLawnY - 0.19, -17.42);
    whiteCurbSouthReturn.receiveShadow = true;
    arch.add(whiteCurbSouthReturn);

    // Straight section of white landscape curb along Rear Pavilion base (lz = -17.425m .. -11.00m)
    const whiteCurbStraight = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.48, 6.425),
        whiteCurbMat
    );
    whiteCurbStraight.position.set(minX - 0.76, rearLawnY - 0.19, -14.21);
    whiteCurbStraight.receiveShadow = true;
    arch.add(whiteCurbStraight);

    // S-curve segments of white landscape curb curving outward (-X) to meet the fence's left panel (visible in 3188a364.jpg & 6cad8200.jpg!)
    const curvePts = [
        [minX - 0.76, -11.00],
        [minX - 0.90, -10.72],
        [minX - 1.25, -10.50],
        [minX - 1.75, -10.35]
    ];
    for (let i = 0; i < curvePts.length - 1; i++) {
        const [x0, z0] = curvePts[i];
        const [x1, z1] = curvePts[i + 1];
        const segLen = Math.hypot(x1 - x0, z1 - z0) + 0.04;
        const ang = Math.atan2(x1 - x0, z1 - z0);
        const cSeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, segLen), whiteCurbMat);
        cSeg.rotation.y = ang;
        cSeg.position.set((x0 + x1) * 0.5, rearLawnY - 0.19, (z0 + z1) * 0.5);
        arch.add(cSeg);
    }

    // Dark Rectangular Iron Utility Vault Grate in Concrete Collar set into the Washington St Sidewalk at lz = -11.85m (3188a364.jpg & 0c643386.jpg)
    const grateY = sampleLocalY(-21.25, -11.85, -0.18) + 0.05;
    const grateCollar = new THREE.Mesh(
        new THREE.BoxGeometry(1.36, 0.07, 2.55),
        ribbedConcreteMat
    );
    grateCollar.position.set(-21.25, grateY, -11.85);
    grateCollar.receiveShadow = true;
    arch.add(grateCollar);

    const vaultGrate = new THREE.Mesh(
        new THREE.BoxGeometry(0.84, 0.09, 2.05),
        ironGrateMat
    );
    vaultGrate.position.set(-21.25, grateY + 0.005, -11.85);
    vaultGrate.receiveShadow = true;
    arch.add(vaultGrate);

    // Yellow-painted diagonal curb flare for the parallel parking cutout right in front of Panel 1 of the fence (lz = -9.60m .. -8.10m, 3188a364.jpg!)
    const flareCurb = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.48, 1.85),
        curbYellowMat
    );
    flareCurb.rotation.y = 0.46;
    flareCurb.position.set(-22.25, grateY - 0.20, -8.85);
    arch.add(flareCurb);

    // 3. 6-Panel White-Slatted Chain-Link Security Fence Enclosure & Utility Compound in front of Bays 1, 2 & 3
    // (lz = -10.30m .. +2.15m, lx = -19.85m .. -15.32m, modeled from 3188a364.jpg, 6cad8200.jpg, 0c643386.jpg & e275ac5f.jpg!)
    const fenceMinZ = -10.30; // Directly below Rear Pavilion right pilaster (-10.35m)
    const fenceMaxZ = 2.15;   // Directly below left edge of Bay 4 "COUNTY BUILDING" portal (+2.15m)
    const fenceSpanZ = fenceMaxZ - fenceMinZ; // 12.45m
    const fenceMidZ = (fenceMinZ + fenceMaxZ) * 0.5; // -4.075m
    const fenceWestX = -19.85;
    const fenceEastX = minX - 0.12; // -15.38m
    const fenceDepthX = fenceEastX - fenceWestX; // 4.47m
    const fenceMidX = (fenceEastX + fenceWestX) * 0.5; // -17.615m

    // Keep the compound concrete pad level with the Washington St building grade (y = -0.10m) so the fence top (y = +2.18m)
    // reaches the exact middle of the Floor 2 granite windows just as shown in 3188a364.jpg!
    const compoundWalkY = Math.max(sampleLocalY(fenceMidX, fenceMidZ, -0.15) + 0.04, -0.14);
    const padTopY = compoundWalkY + 0.14; // Raised 0.14m above the sidewalk
    const fenceH = 2.18; // Top of fence at padTopY + 2.18m ≈ +2.18m (mid-height of Floor 2 windows!)

    // Left Half Base (Panels 1, 2 & left half of Panel 3: lz = -10.42m .. -3.50m): Smooth raised grey concrete pad curb (3188a364.jpg)
    const leftPadSpanZ = -3.50 - (fenceMinZ - 0.12); // 6.92m
    const leftPadMidZ = ((fenceMinZ - 0.12) + -3.50) * 0.5;
    const leftRaisedPad = new THREE.Mesh(
        new THREE.BoxGeometry(fenceDepthX + 0.28, 0.65, leftPadSpanZ),
        concreteWalkMat
    );
    leftRaisedPad.position.set(fenceMidX - 0.06, padTopY - 0.325, leftPadMidZ);
    leftRaisedPad.receiveShadow = true;
    leftRaisedPad.castShadow = true;
    arch.add(leftRaisedPad);

    // Right Half Base (Right half of Panel 3 + Panels 4, 5 & 6: lz = -3.50m .. +2.15m):
    // 1-course grey split-face concrete-block curb along the front base of the fence (3188a364.jpg & 6cad8200.jpg!)
    const rightPadSpanZ = fenceMaxZ - (-3.50); // 5.65m
    const rightPadMidZ = (-3.50 + fenceMaxZ) * 0.5;
    const rightInnerPad = new THREE.Mesh(
        new THREE.BoxGeometry(fenceDepthX, 0.62, rightPadSpanZ),
        concreteWalkMat
    );
    rightInnerPad.position.set(fenceMidX, padTopY - 0.32, rightPadMidZ);
    rightInnerPad.receiveShadow = true;
    arch.add(rightInnerPad);

    const rightBlockCurb = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.18, rightPadSpanZ + 0.15),
        splitBlockMat
    );
    rightBlockCurb.position.set(fenceWestX - 0.04, compoundWalkY + 0.09, rightPadMidZ);
    rightBlockCurb.castShadow = true;
    rightBlockCurb.receiveShadow = true;
    arch.add(rightBlockCurb);

    // Exact 6 Front Fence Panels along lx = -19.85m from Left (lz = -10.30m) to Right (lz = +2.15m) matching 3188a364.jpg & 6cad8200.jpg!
    const frontPanels = [
        { z0: -10.30, z1: -7.65, isGreenGate: false, hasDoubleRightPost: true },  // Panel 1 (wide left panel)
        { z0: -7.65,  z1: -5.00, isGreenGate: false, hasDoubleRightPost: true },  // Panel 2 (wide 2nd panel)
        { z0: -5.00,  z1: -2.35, isGreenGate: false, hasDoubleRightPost: false }, // Panel 3 (wide 3rd panel)
        { z0: -2.35,  z1: -1.05, isGreenGate: true,  hasDoubleRightPost: false }, // Panel 4 (narrower left gate leaf with dark-green frame!)
        { z0: -1.05,  z1:  0.20, isGreenGate: true,  hasDoubleRightPost: false }, // Panel 5 (narrower right gate leaf with dark-green frame!)
        { z0:  0.20,  z1:  2.15, isGreenGate: false, hasDoubleRightPost: false }  // Panel 6 (right end panel)
    ];

    frontPanels.forEach((p, idx) => {
        const pSpan = p.z1 - p.z0;
        const pMidZ = (p.z0 + p.z1) * 0.5;
        const frameMat = p.isGreenGate ? greenGateFrameMat : blackFenceFrameMat;

        // White-slatted chain-link panel mesh (inset slightly between posts)
        const slatPanel = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, fenceH - 0.06, pSpan - 0.08),
            securityFenceSlatMat
        );
        slatPanel.position.set(fenceWestX, padTopY + fenceH * 0.5, pMidZ);
        slatPanel.castShadow = true;
        slatPanel.receiveShadow = true;
        arch.add(slatPanel);

        // Top & bottom horizontal pipe rails for this panel
        [0.04, fenceH - 0.02].forEach((ry) => {
            const hRail = new THREE.Mesh(
                new THREE.BoxGeometry(0.065, 0.045, pSpan),
                frameMat
            );
            hRail.position.set(fenceWestX, padTopY + ry, pMidZ);
            arch.add(hRail);
        });

        // Left vertical frame post
        const leftPost = new THREE.Mesh(
            new THREE.CylinderGeometry(p.isGreenGate ? 0.048 : 0.042, p.isGreenGate ? 0.048 : 0.042, fenceH + 0.06, 10),
            frameMat
        );
        leftPost.position.set(fenceWestX, padTopY + fenceH * 0.5, p.z0 + (p.isGreenGate ? 0.03 : 0.0));
        leftPost.castShadow = true;
        arch.add(leftPost);

        // Double-post stiles between modular panels (visible in 3188a364.jpg & 6cad8200.jpg)
        if (p.hasDoubleRightPost) {
            [-0.045, 0.045].forEach((dz) => {
                const dPost = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.038, 0.038, fenceH + 0.06, 10),
                    blackFenceFrameMat
                );
                dPost.position.set(fenceWestX, padTopY + fenceH * 0.5, p.z1 + dz);
                dPost.castShadow = true;
                arch.add(dPost);
            });
        }

        // Rightmost corner post at Panel 6
        if (idx === frontPanels.length - 1) {
            const rightCornerPost = new THREE.Mesh(
                new THREE.CylinderGeometry(0.045, 0.045, fenceH + 0.06, 10),
                blackFenceFrameMat
            );
            rightCornerPost.position.set(fenceWestX, padTopY + fenceH * 0.5, p.z1);
            rightCornerPost.castShadow = true;
            arch.add(rightCornerPost);
        }
    });

    // Extra thick dark-green center meeting stiles on the double gate (lz = -1.05m, clearly visible in 3188a364.jpg & 6cad8200.jpg!)
    [-0.045, 0.045].forEach((dz) => {
        const greenCenterStile = new THREE.Mesh(
            new THREE.BoxGeometry(0.09, fenceH + 0.04, 0.065),
            greenGateFrameMat
        );
        greenCenterStile.position.set(fenceWestX, padTopY + fenceH * 0.5, -1.05 + dz);
        greenCenterStile.castShadow = true;
        arch.add(greenCenterStile);
    });

    // Black right stile of Panel 5 / left stile of Panel 6 at lz = +0.20m
    [-0.04, 0.04].forEach((dz) => {
        const p56Stile = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, fenceH + 0.04, 0.055),
            blackFenceFrameMat
        );
        p56Stile.position.set(fenceWestX, padTopY + fenceH * 0.5, 0.20 + dz);
        arch.add(p56Stile);
    });

    // South (Left) Return Fence Wall (lz = -10.30m) & North (Right) Return Fence Wall (lz = +2.15m) — 2 bays each (0c643386.jpg)
    [fenceMinZ, fenceMaxZ].forEach((fz) => {
        const sideFence = new THREE.Mesh(
            new THREE.BoxGeometry(fenceDepthX, fenceH - 0.06, 0.04),
            securityFenceSlatMat
        );
        sideFence.position.set(fenceMidX, padTopY + fenceH * 0.5, fz);
        sideFence.castShadow = true;
        sideFence.receiveShadow = true;
        arch.add(sideFence);

        // Top & bottom horizontal black steel rails on South & North return walls
        [0.04, fenceH - 0.02].forEach((ry) => {
            const sRail = new THREE.Mesh(
                new THREE.BoxGeometry(fenceDepthX + 0.06, 0.045, 0.065),
                blackFenceFrameMat
            );
            sRail.position.set(fenceMidX, padTopY + ry, fz);
            arch.add(sRail);
        });

        // Middle & back vertical pipe posts on South & North return walls
        [fenceMidX, fenceEastX].forEach((px) => {
            const sPost = new THREE.Mesh(
                new THREE.CylinderGeometry(0.04, 0.04, fenceH + 0.06, 10),
                blackFenceFrameMat
            );
            sPost.position.set(px, padTopY + fenceH * 0.5, fz);
            sPost.castShadow = true;
            arch.add(sPost);
        });
    });

    // Inner East (Building-Side) Fence Wall & Top Rail at lx = -16.12m (visible behind Panels 3–5 in 3188a364.jpg & from above in 0c643386.jpg!)
    const innerEastX = -16.12;
    const innerBackRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.045, fenceSpanZ),
        blackFenceFrameMat
    );
    innerBackRail.position.set(innerEastX, padTopY + fenceH + 0.06, fenceMidZ);
    arch.add(innerBackRail);

    [-7.65, -5.00, -2.35, -0.45, 2.15].forEach((pz) => {
        const backPost = new THREE.Mesh(
            new THREE.CylinderGeometry(0.038, 0.038, fenceH + 0.14, 8),
            blackFenceFrameMat
        );
        backPost.position.set(innerEastX, padTopY + (fenceH + 0.14) * 0.5, pz);
        arch.add(backPost);
    });

    // Tall Teal-Green Switchgear / Utility Cabinet inside the north end of the compound (lz = +0.55m, 0c643386.jpg & e275ac5f.jpg)
    // Kept slightly below fence top (h = 1.98m) so it matches 3188a364.jpg (not poking above the front fence from street level)
    // while clearly visible from the aerial top-down view (0c643386.jpg)!
    const tealCab = new THREE.Mesh(
        new THREE.BoxGeometry(1.32, 1.98, 1.48),
        tealCabinetMat
    );
    tealCab.position.set(-18.10, padTopY + 0.99, 0.65);
    tealCab.castShadow = true;
    tealCab.receiveShadow = true;
    arch.add(tealCab);

    // 3 Olive-Grey Pad-Mounted Electrical Transformers / Utility Boxes inside the compound (0c643386.jpg, e275ac5f.jpg)
    [
        { x: -18.05, z: -1.45, w: 1.15, h: 1.32, d: 1.08 },
        { x: -18.15, z: -2.85, w: 1.25, h: 1.45, d: 1.18 },
        { x: -17.95, z: -4.25, w: 1.05, h: 1.18, d: 0.95 }
    ].forEach((xf) => {
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(xf.w, xf.h, xf.d),
            xformerOliveMat
        );
        box.position.set(xf.x, padTopY + xf.h * 0.5, xf.z);
        box.castShadow = true;
        box.receiveShadow = true;
        arch.add(box);
    });

    // Row of 5 Orange Safety Cones along the south fence wall inside the compound (0c643386.jpg, e275ac5f.jpg)
    for (let c = 0; c < 5; c++) {
        const cx = -16.30 - c * 0.58;
        const cone = new THREE.Mesh(
            new THREE.ConeGeometry(0.16, 0.68, 8),
            safetyConeMat
        );
        cone.position.set(cx, padTopY + 0.34, fenceMinZ + 0.52);
        cone.castShadow = true;
        arch.add(cone);
    }

    // 4. Washington St "COUNTY BUILDING" Side Entrance at Bay 4 (lz = +4.35m, 3188a364.jpg, 6cad8200.jpg, 297c2294.jpg & 9728efd3.jpg)
    const portalZ = 4.35;
    const entryWalkY = Math.max(sampleLocalY(-17.60, portalZ, -0.15) + 0.04, -0.16);

    // Paved concrete entrance walk connecting Bay 4 portal (lx = -15.26m) to the Washington St sidewalk (lx = -20.00m)
    const sideEntryWalk = new THREE.Mesh(
        new THREE.BoxGeometry(4.85, 0.50, 3.30),
        concreteWalkMat
    );
    sideEntryWalk.position.set(-17.60, entryWalkY - 0.23, portalZ + 0.25);
    sideEntryWalk.receiveShadow = true;
    arch.add(sideEntryWalk);

    // 2 Wide Yellow-Painted Concrete Steps ("Parking / Loading Zone") descending from y = +0.36m to entryWalkY (297c2294.jpg)
    const stepW = 2.95;
    const step1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.34, stepW),
        curbYellowMat
    );
    step1.position.set(minX - 0.45, entryWalkY + 0.22, portalZ);
    step1.castShadow = true;
    step1.receiveShadow = true;
    arch.add(step1);

    const step2 = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, 0.20, stepW),
        curbYellowMat
    );
    step2.position.set(minX - 0.75, entryWalkY + 0.08, portalZ);
    step2.castShadow = true;
    step2.receiveShadow = true;
    arch.add(step2);

    // Low concrete cheek blocks flanking the 2 yellow steps (297c2294.jpg)
    [-stepW * 0.5 - 0.22, stepW * 0.5 + 0.22].forEach((czOff) => {
        const cheekBlock = new THREE.Mesh(
            new THREE.BoxGeometry(1.15, 0.46, 0.44),
            ribbedConcreteMat
        );
        cheekBlock.position.set(minX - 0.55, entryWalkY + 0.23, portalZ + czOff);
        cheekBlock.castShadow = true;
        arch.add(cheekBlock);
    });

    // White Portable Threshold Ramp on the left (south) side of the yellow steps (297c2294.jpg)
    const rampMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.75, 0.06, 0.88),
        whiteRampMat
    );
    rampMesh.rotation.z = 0.18;
    rampMesh.position.set(minX - 1.05, entryWalkY + 0.16, portalZ - 0.92);
    rampMesh.castShadow = true;
    rampMesh.receiveShadow = true;
    arch.add(rampMesh);

    // Dark Metal Pipe Handrail on the right (north) side of the yellow steps (297c2294.jpg)
    const railZ = portalZ + stepW * 0.5 - 0.12;
    [-0.25, -1.35].forEach((rxOff, idx) => {
        const postH = 0.88;
        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.022, 0.022, postH, 8),
            pipeHandrailMat
        );
        post.position.set(minX + rxOff, entryWalkY + (idx === 0 ? 0.34 : 0.04) + postH * 0.5, railZ);
        arch.add(post);
    });
    const topRail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 1.25, 8),
        pipeHandrailMat
    );
    topRail.rotation.z = Math.PI * 0.5 + 0.24;
    topRail.position.set(minX - 0.80, entryWalkY + 1.05, railZ);
    arch.add(topRail);

    // Left (South) 2-Tier Grey Split-Face Concrete-Block Planter Bed wrapped directly against the right end of the fence
    // (lz = +2.15m .. +2.95m, visible in 3188a364.jpg, 6cad8200.jpg & 297c2294.jpg!)
    const leftPlanterZ = 2.52;
    const leftTier1Wall = new THREE.Mesh(new THREE.BoxGeometry(4.35, 0.36, 0.82), splitBlockMat);
    leftTier1Wall.position.set(-17.65, entryWalkY + 0.18, leftPlanterZ);
    leftTier1Wall.castShadow = true;
    leftTier1Wall.receiveShadow = true;
    arch.add(leftTier1Wall);

    const leftTier1Soil = new THREE.Mesh(new THREE.BoxGeometry(4.05, 0.38, 0.62), darkMulchMat);
    leftTier1Soil.position.set(-17.65, entryWalkY + 0.18, leftPlanterZ);
    arch.add(leftTier1Soil);

    const leftTier2Wall = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.34, 0.72), splitBlockMat);
    leftTier2Wall.position.set(minX - 1.45, entryWalkY + 0.50, leftPlanterZ);
    leftTier2Wall.castShadow = true;
    arch.add(leftTier2Wall);

    const leftTier2Soil = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.36, 0.54), darkMulchMat);
    leftTier2Soil.position.set(minX - 1.45, entryWalkY + 0.50, leftPlanterZ);
    arch.add(leftTier2Soil);

    // Right (North) 2-Tier Grey Split-Face Concrete-Block Planter Bed on the right side of the entrance walk
    // (lz = +6.05m .. +8.05m, visible in 3188a364.jpg, 297c2294.jpg & 9728efd3.jpg!)
    const rightPlanterZ = 7.05;
    const rightTier1Wall = new THREE.Mesh(new THREE.BoxGeometry(4.45, 0.38, 2.00), splitBlockMat);
    rightTier1Wall.position.set(-17.65, entryWalkY + 0.19, rightPlanterZ);
    rightTier1Wall.castShadow = true;
    rightTier1Wall.receiveShadow = true;
    arch.add(rightTier1Wall);

    const rightTier1Soil = new THREE.Mesh(new THREE.BoxGeometry(4.15, 0.40, 1.70), darkMulchMat);
    rightTier1Soil.position.set(-17.65, entryWalkY + 0.19, rightPlanterZ);
    arch.add(rightTier1Soil);

    const rightTier2Wall = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.36, 1.65), splitBlockMat);
    rightTier2Wall.position.set(minX - 1.45, entryWalkY + 0.54, rightPlanterZ);
    rightTier2Wall.castShadow = true;
    arch.add(rightTier2Wall);

    const rightTier2Soil = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.38, 1.35), darkMulchMat);
    rightTier2Soil.position.set(minX - 1.45, entryWalkY + 0.54, rightPlanterZ);
    arch.add(rightTier2Soil);

    // Yellow-painted street curb along the Washington St Sidewalk in front of the "COUNTY BUILDING" entrance (3188a364.jpg, 6cad8200.jpg, 9728efd3.jpg)
    const entryYellowCurb = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.48, 5.20),
        curbYellowMat
    );
    entryYellowCurb.position.set(-22.72, entryWalkY - 0.19, portalZ + 0.25);
    arch.add(entryYellowCurb);
}

/**
 * Generates a smooth, terrain-conforming 3D grass lawn mesh with perimeter skirts across all Building 350 lawn zones:
 * - Washington St rear grass patch with curved white curb (lx = -20.00m .. -15.94m, lz = -12.50m .. -7.60m)
 * - Washington St front-left lawn strip (lx = -20.00m .. -15.26m, lz = +12.35m .. +26.125m)
 * - Upper-left raised lawn behind the fieldstone retaining wall (lx = -19.75m .. -5.05m, lz = +26.125m .. +31.55m)
 * - Lower-left front lawn (lx = -20.00m .. -4.84m, lz = +33.30m .. +45.80m)
 * - Upper-right front lawn behind Flagpole Plaza (lx = -0.24m .. +12.50m, lz = +26.125m .. +31.95m)
 * - Lower-right front lawn below Flagpole Plaza monument wall (lx = -0.24m .. +22.00m, lz = +39.25m .. +45.80m)
 * - NE Courthouse Park lawn strip (lx = +10.18m .. +22.00m, lz = -17.43m .. +39.25m)
 */
function buildContoured350GrassLawns(arch, turfLawnMat, sampleLocalY, minX, maxX, midX, frontZ, midWalkY) {
    const positions = [];
    const normals = [];

    // Smooth elevation function for the 350 grass lawns (including the raised berm behind the fieldstone retaining wall)
    const getLawnY = (lx, lz) => {
        const baseTerrY = sampleLocalY(lx, lz, -1.2);
        // Inside the upper-left lawn retained by the fieldstone wall (lx < -5.0m, lz = 18.0m .. 31.55m),
        // keep the grass elevated flush with the top of the fieldstone wall!
        if (lx < -4.8 && lz >= 16.0 && lz <= 31.65) {
            const wallBoost =
                THREE.MathUtils.smoothstep(lz, 16.0, 22.0) *
                (1.0 - THREE.MathUtils.smoothstep(lz, 31.20, 31.65)) *
                (1.0 - THREE.MathUtils.smoothstep(lx, -5.8, -4.8));
            const targetTopY = THREE.MathUtils.lerp(-0.42, -0.58, THREE.MathUtils.clamp((-lx - 5.2) / 14.5, 0, 1));
            return Math.max(baseTerrY + 0.03, THREE.MathUtils.lerp(baseTerrY + 0.03, targetTopY, wallBoost));
        }
        return baseTerrY + 0.03;
    };

    const getLawnNormal = (lx, lz) => {
        const eps = 0.25;
        const dydx = (getLawnY(lx + eps, lz) - getLawnY(lx - eps, lz)) / (2 * eps);
        const dydz = (getLawnY(lx, lz + eps) - getLawnY(lx, lz - eps)) / (2 * eps);
        const v = new THREE.Vector3(-dydx, 1.0, -dydz).normalize();
        return [v.x, v.y, v.z];
    };

    const pushSmoothTri = (ax, az, bx, bz, cx, cz) => {
        const ay = getLawnY(ax, az);
        const by = getLawnY(bx, bz);
        const cy = getLawnY(cx, cz);
        const na = getLawnNormal(ax, az);
        const nb = getLawnNormal(bx, bz);
        const nc = getLawnNormal(cx, cz);
        positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
        normals.push(...na, ...nb, ...nc);
    };

    const pushSkirt = (ax, az, bx, bz, nx, nz) => {
        const ayTop = getLawnY(ax, az);
        const byTop = getLawnY(bx, bz);
        const ayBot = ayTop - 0.55;
        const byBot = byTop - 0.55;
        positions.push(
            ax, ayTop, az, ax, ayBot, az, bx, byBot, bz,
            ax, ayTop, az, bx, byBot, bz, bx, byTop, bz
        );
        for (let i = 0; i < 6; i++) normals.push(nx, 0, nz);
    };

    const addLawnPatch = (x0, x1, z0, z1, nx, nz) => {
        for (let ix = 0; ix < nx; ix++) {
            const xa = THREE.MathUtils.lerp(x0, x1, ix / nx);
            const xb = THREE.MathUtils.lerp(x0, x1, (ix + 1) / nx);
            for (let iz = 0; iz < nz; iz++) {
                const za = THREE.MathUtils.lerp(z0, z1, iz / nz);
                const zb = THREE.MathUtils.lerp(z0, z1, (iz + 1) / nz);
                pushSmoothTri(xa, za, xa, zb, xb, zb);
                pushSmoothTri(xa, za, xb, zb, xb, za);
            }
        }
        // Perimeter skirts
        for (let ix = 0; ix < nx; ix++) {
            const xa = THREE.MathUtils.lerp(x0, x1, ix / nx);
            const xb = THREE.MathUtils.lerp(x0, x1, (ix + 1) / nx);
            pushSkirt(xa, z0, xb, z0, 0, -1);
            pushSkirt(xb, z1, xa, z1, 0, 1);
        }
        for (let iz = 0; iz < nz; iz++) {
            const za = THREE.MathUtils.lerp(z0, z1, iz / nz);
            const zb = THREE.MathUtils.lerp(z0, z1, (iz + 1) / nz);
            pushSkirt(x0, zb, x0, za, -1, 0);
            pushSkirt(x1, za, x1, zb, 1, 0);
        }
    };

    // 1A. Washington St Rear Grass Patch under Rear Pavilion window from the 3-column Breezeway Walkway (-17.425m)
    //     to the Security Fence Compound (-10.30m), visible in media_1794271546977_6613a6a1.jpg, media_1794271635668_a9d4584b.jpg & media_1794271688856_e8b00085.jpg!
    addLawnPatch(-20.00, minX - 0.76, -17.425, -10.30, 4, 7);

    // 1B. Washington St Front-Left Side Lawn Strip between North Planter (+8.05m) & Front Corner (+26.125m), visible in 3188a364.jpg & 9728efd3.jpg
    addLawnPatch(-20.00, minX, 8.05, frontZ, 4, 12);

    // 2. Upper-Left Front Lawn above Fieldstone Retaining Wall (lx = -19.75m .. -5.05m, lz = +26.125m .. +31.55m)
    addLawnPatch(-19.75, midX - 2.50, frontZ, 31.55, 10, 5);

    // 3. Lower-Left Front Lawn between Washington St Sidewalk, Cross-Walkway, Center Stepped Walk & Orondo Ave Sidewalk
    // (lx = -20.00m .. -4.90m, lz = +33.25m .. +45.80m, trimmed at the Orondo/Washington S-curve border around the bird sculpture)
    addLawnPatch(-20.00, midX - 2.36, 33.25, 45.80, 10, 10);

    // 4. Upper-Right Front Lawn between Front Facade and Flagpole Plaza (lx = -0.18m .. +12.50m, lz = +26.125m .. +31.95m)
    addLawnPatch(midX + 2.36, 12.50, frontZ, 31.95, 10, 5);

    // 5. Lower-Right Front Lawn between Flagpole Plaza Monument Wall and Orondo Ave Sidewalk (lx = -0.18m .. +22.18m, lz = +39.25m .. +45.80m)
    addLawnPatch(midX + 2.36, 22.18, 39.25, 45.80, 16, 6);

    const lawnGeo = new THREE.BufferGeometry();
    lawnGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    lawnGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    ensurePlanarGrassUVs(lawnGeo, 0.45);
    const lawnMesh = new THREE.Mesh(lawnGeo, turfLawnMat);
    lawnMesh.name = 'Building350_GradedLawnAndPark';
    lawnMesh.receiveShadow = true;
    lawnMesh.castShadow = false;
    arch.add(lawnMesh);
}

/**
 * Exact S-curved outer (+X) boundary of the dark-mulched foundation planting beds on the Park side (+X)
 * of Building 350, modeled from 3e77aa21.jpg, e637f636.jpg, 456d4b4a.jpg, ac388739.jpg, 45990f7d.jpg & 9c4bd790.jpg.
 */
function getParkCurbX(lz) {
    if (lz <= 0.95) {
        // Right (-Z, South-West) foundation bed from right stair cheek wall (lz = +0.95m) to Rear Pavilion corner (lz = -17.425m)
        const u = THREE.MathUtils.clamp((0.95 - lz) / (0.95 - (-17.425)), 0, 1);
        // Starts at 15.25m at the right stair cheek wall, sweeps inward to 13.70m along Bays 2 & 3,
        // flares gently to 14.25m near the Rear Pavilion, and curves in to 12.15m at the ADA ramp handrail
        const base = THREE.MathUtils.lerp(15.25, 13.55, THREE.MathUtils.smoothstep(u, 0.0, 0.32));
        const midWave = Math.sin(u * Math.PI * 1.65) * 0.52;
        const endTaper = THREE.MathUtils.smoothstep(u, 0.78, 1.0) * 1.55;
        return base + midWave - endTaper;
    }
    // Left (+Z, North-East) foundation bed from left stair cheek wall (lz = +7.75m) to Front Pavilion corner (lz = +26.125m)
    const u = THREE.MathUtils.clamp((lz - 7.75) / (26.125 - 7.75), 0, 1);
    const base = THREE.MathUtils.lerp(15.25, 13.95, THREE.MathUtils.smoothstep(u, 0.0, 0.30));
    const frontWave = Math.sin(u * Math.PI * 1.45) * 0.68;
    const cornerTaper = THREE.MathUtils.smoothstep(u, 0.80, 1.0) * 1.35;
    return base + frontWave - cornerTaper;
}

/**
 * Orondo Ave & Washington St 90° Rounded Corner Bulb-Out, S-Curved White Landscape Border around the Bird Sculpture,
 * Yellow Truncated-Dome Tactile Warning Pad, Radial Score Lines, Red Curb Nose & Twin-Bar Continental Crosswalks
 * Modeled directly from overhead reference photo 1a7cd213.jpg!
 */
function buildOrondoWashingtonRoundedCorner(arch, mats, sampleLocalY) {
    const { concreteWalkMat, ribbedConcreteMat, curbYellowMat } = mats;

    const whiteCurbMat = new THREE.MeshStandardMaterial({ color: '#eceae4', roughness: 0.68, metalness: 0.04 });
    const redCurbNoseMat = new THREE.MeshStandardMaterial({ color: '#c8423b', roughness: 0.72, metalness: 0.04 });
    const scoreJointMat = new THREE.MeshBasicMaterial({
        color: '#9c9588',
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3
    });
    const parkConcreteMat = new THREE.MeshStandardMaterial({
        color: '#e2dcd0',
        roughness: 0.86,
        metalness: 0.03,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
    });
    const tactileYellowMat = new THREE.MeshStandardMaterial({
        color: '#eab308',
        roughness: 0.62,
        metalness: 0.05,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3
    });
    const crosswalkWhiteMat = new THREE.MeshStandardMaterial({
        color: '#f4f5f7',
        roughness: 0.65,
        metalness: 0.04,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
    });
    const manholeIronMat = new THREE.MeshStandardMaterial({
        color: '#5a4a3c',
        roughness: 0.72,
        metalness: 0.45
    });

    // 1. 90° Rounded Corner Bulb-Out Fan Mesh centered at (cx = -18.55m, cz = 43.80m, outer radius R = 5.00m)
    //    Connects the Washington St sidewalk (lx = -22.80m .. -20.00m, lz = 41.20m) seamlessly around a 90° arc
    //    to the Orondo Ave sidewalk (lx = -18.55m, lz = 45.80m .. 48.80m) while flaring out to lx = -23.55m (1a7cd213.jpg!)
    const cx = -18.55;
    const cz = 43.80;
    const rOuter = 5.00; // Reaches lx = -23.55m at West (ang = PI) and lz = 48.80m at North (ang = PI/2)
    const rInner = 1.85; // Leaves the rounded lawn corner around the bird sculpture at (-18.50m, 43.80m)
    const arcSteps = 24;
    const fanPos = [];

    const pushTri = (ax, ay, az, bx, by, bz, dx, dy, dz) => {
        fanPos.push(ax, ay, az, bx, by, bz, dx, dy, dz);
    };
    const pushQuad = (ax, ay, az, bx, by, bz, cx0, cy0, cz0, dx, dy, dz) => {
        pushTri(ax, ay, az, bx, by, bz, cx0, cy0, cz0);
        pushTri(ax, ay, az, cx0, cy0, cz0, dx, dy, dz);
    };

    // South-West Bulb-Out Transition Wedge (lz = 41.20m .. 43.80m) flaring from lx = -22.80m out to lx = -23.55m (1a7cd213.jpg)
    const transSteps = 8;
    for (let i = 0; i < transSteps; i++) {
        const t0 = i / transSteps;
        const t1 = (i + 1) / transSteps;
        const z0 = THREE.MathUtils.lerp(41.20, cz, t0);
        const z1 = THREE.MathUtils.lerp(41.20, cz, t1);
        const xOut0 = THREE.MathUtils.lerp(-22.80, cx - rOuter, THREE.MathUtils.smoothstep(t0, 0, 1));
        const xOut1 = THREE.MathUtils.lerp(-22.80, cx - rOuter, THREE.MathUtils.smoothstep(t1, 0, 1));
        const xIn0 = THREE.MathUtils.lerp(-20.00, cx - rInner, t0);
        const xIn1 = THREE.MathUtils.lerp(-20.00, cx - rInner, t1);

        const yOut0 = sampleLocalY(xOut0, z0, -1.65) + 0.095;
        const yOut1 = sampleLocalY(xOut1, z1, -1.65) + 0.095;
        const yIn0 = sampleLocalY(xIn0, z0, -1.65) + 0.095;
        const yIn1 = sampleLocalY(xIn1, z1, -1.65) + 0.095;
        const drop = 0.42;

        pushQuad(xOut0, yOut0, z0, xOut1, yOut1, z1, xIn1, yIn1, z1, xIn0, yIn0, z0);
        pushQuad(xOut1, yOut1, z1, xOut0, yOut0, z0, xOut0, yOut0 - drop, z0, xOut1, yOut1 - drop, z1);

        // Red-painted curb nose along the Washington St bulb-out transition (1a7cd213.jpg!)
        const xm = (xOut0 + xOut1) * 0.5;
        const zm = (z0 + z1) * 0.5;
        const ym = (yOut0 + yOut1) * 0.5;
        const segLen = Math.hypot(xOut1 - xOut0, z1 - z0) + 0.02;
        const curbNose = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.36, segLen),
            t0 > 0.25 ? redCurbNoseMat : whiteCurbMat
        );
        curbNose.rotation.y = Math.atan2(xOut1 - xOut0, z1 - z0);
        curbNose.position.set(xm + 0.07, ym - 0.14, zm);
        arch.add(curbNose);
    }

    // 90° Quarter-Circle Rounded Corner Apron (theta = 0 .. PI/2 from West [-X] around to North [+Z])
    for (let i = 0; i < arcSteps; i++) {
        const u0 = i / arcSteps;
        const u1 = (i + 1) / arcSteps;
        const ang0 = u0 * Math.PI * 0.5;
        const ang1 = u1 * Math.PI * 0.5;

        const xOut0 = cx - Math.cos(ang0) * rOuter;
        const zOut0 = cz + Math.sin(ang0) * rOuter;
        const xOut1 = cx - Math.cos(ang1) * rOuter;
        const zOut1 = cz + Math.sin(ang1) * rOuter;

        const xIn0 = cx - Math.cos(ang0) * rInner;
        const zIn0 = cz + Math.sin(ang0) * rInner;
        const xIn1 = cx - Math.cos(ang1) * rInner;
        const zIn1 = cz + Math.sin(ang1) * rInner;

        // Subtle ADA ramp depression along the crosswalk approach (u ∈ [0.15, 0.55])
        const rampDip0 = (u0 >= 0.12 && u0 <= 0.58) ? Math.sin(((u0 - 0.12) / 0.46) * Math.PI) * 0.05 : 0.0;
        const rampDip1 = (u1 >= 0.12 && u1 <= 0.58) ? Math.sin(((u1 - 0.12) / 0.46) * Math.PI) * 0.05 : 0.0;

        const yOut0 = sampleLocalY(xOut0, zOut0, -1.72) + 0.098 - rampDip0;
        const yOut1 = sampleLocalY(xOut1, zOut1, -1.72) + 0.098 - rampDip1;
        const yIn0 = sampleLocalY(xIn0, zIn0, -1.72) + 0.098;
        const yIn1 = sampleLocalY(xIn1, zIn1, -1.72) + 0.098;
        const drop = 0.42;

        pushQuad(xOut0, yOut0, zOut0, xOut1, yOut1, zOut1, xIn1, yIn1, zIn1, xIn0, yIn0, zIn0);
        pushQuad(xOut1, yOut1, zOut1, xOut0, yOut0, zOut0, xOut0, yOut0 - drop, zOut0, xOut1, yOut1 - drop, zOut1);

        // Curved outer street curb along the 90° arc (lowered at the ADA ramp cut u ∈ [0.18, 0.52])
        const um = (u0 + u1) * 0.5;
        const xm = (xOut0 + xOut1) * 0.5;
        const zm = (zOut0 + zOut1) * 0.5;
        const ym = (yOut0 + yOut1) * 0.5;
        const segLen = Math.hypot(xOut1 - xOut0, zOut1 - zOut0) + 0.025;
        const isRampCut = um >= 0.18 && um <= 0.52;
        const curbSeg = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, isRampCut ? 0.24 : 0.36, segLen),
            um < 0.12 ? redCurbNoseMat : whiteCurbMat
        );
        curbSeg.rotation.y = Math.atan2(xOut1 - xOut0, zOut1 - zOut0);
        curbSeg.position.set(xm, ym - (isRampCut ? 0.11 : 0.14), zm);
        arch.add(curbSeg);

        // Radial concrete expansion score joints across the rounded corner fan (1a7cd213.jpg!)
        if (i > 0 && i % 4 === 0) {
            const rMid = (rInner + rOuter) * 0.5;
            const rLen = rOuter - rInner - 0.18;
            const jx = cx - Math.cos(ang0) * rMid;
            const jz = cz + Math.sin(ang0) * rMid;
            const jy = sampleLocalY(jx, jz, -1.72) + 0.105;
            const rJoint = new THREE.Mesh(new THREE.BoxGeometry(rLen, 0.014, 0.03), scoreJointMat);
            rJoint.rotation.y = ang0;
            rJoint.position.set(jx, jy, jz);
            arch.add(rJoint);
        }
    }

    const fanGeo = new THREE.BufferGeometry();
    fanGeo.setAttribute('position', new THREE.Float32BufferAttribute(fanPos, 3));
    fanGeo.computeVertexNormals();
    const fanMesh = new THREE.Mesh(fanGeo, concreteWalkMat);
    fanMesh.receiveShadow = true;
    fanMesh.castShadow = true;
    arch.add(fanMesh);

    // Concentric middle score arc across the rounded corner bulb-out (1a7cd213.jpg!)
    const rMidArc = 3.45;
    for (let i = 0; i < 12; i++) {
        const a0 = (i / 12) * Math.PI * 0.5;
        const a1 = ((i + 1) / 12) * Math.PI * 0.5;
        const x0 = cx - Math.cos(a0) * rMidArc;
        const z0 = cz + Math.sin(a0) * rMidArc;
        const x1 = cx - Math.cos(a1) * rMidArc;
        const z1 = cz + Math.sin(a1) * rMidArc;
        const xm = (x0 + x1) * 0.5;
        const zm = (z0 + z1) * 0.5;
        const ym = sampleLocalY(xm, zm, -1.72) + 0.105;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.014, Math.hypot(x1 - x0, z1 - z0) + 0.02), scoreJointMat);
        seg.rotation.y = Math.atan2(x1 - x0, z1 - z0);
        seg.position.set(xm, ym, zm);
        arch.add(seg);
    }

    // 2. Bright Yellow Truncated-Dome Tactile Warning Pad on the Building 350 Rounded Corner Ramp (1a7cd213.jpg!)
    {
        const padAng = 0.30 * Math.PI * 0.5; // Faces directly toward the Washington St / Orondo Ave crosswalk
        const padR = rOuter - 0.62;
        const px = cx - Math.cos(padAng) * padR;
        const pz = cz + Math.sin(padAng) * padR;
        const py = sampleLocalY(px, pz, -1.72) + 0.090;
        const yellowPad = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.022, 1.48), tactileYellowMat);
        yellowPad.rotation.y = padAng;
        yellowPad.position.set(px, py, pz);
        yellowPad.receiveShadow = true;
        arch.add(yellowPad);
    }

    // 3. S-Curved White Concrete Landscape Border curving behind the Rounded Corner & around the Bird Sculpture Pedestal (1a7cd213.jpg bottom-right!)
    const sCurvePts = [
        [-20.00, 39.60],
        [-20.00, 41.20],
        [-19.85, 42.35],
        [-19.35, 43.30],
        [-19.45, 44.35],
        [-19.85, 45.20],
        [-18.55, 45.80],
        [-16.80, 45.80]
    ];
    for (let i = 0; i < sCurvePts.length - 1; i++) {
        const [x0, z0] = sCurvePts[i];
        const [x1, z1] = sCurvePts[i + 1];
        const xm = (x0 + x1) * 0.5;
        const zm = (z0 + z1) * 0.5;
        const ym = sampleLocalY(xm, zm, -1.68) + 0.06;
        const segLen = Math.hypot(x1 - x0, z1 - z0) + 0.03;
        const curb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, segLen), whiteCurbMat);
        curb.rotation.y = Math.atan2(x1 - x0, z1 - z0);
        curb.position.set(xm, ym, zm);
        curb.castShadow = true;
        arch.add(curb);
    }

    // Orondo Ave & Washington St intersection asphalt, crosswalks, stop bars, and manhole covers
    // are now built as a unified 3D roadway in WashingtonStreetCorridor.js.
}

/**
 * Builds the Courthouse Park (+X) Front Grounds of Building 350 AND the Park-Facing 401–350 Skybridge,
 * Recessed Concrete Core Wall, Two-Tier Dark-Bronze/Black Glass Entrance Vestibule & Sloped Concrete ADA Ramp:
 * Modeled directly from the 10 user reference photographs:
 * - 3e77aa21.jpg, e637f636.jpg, 456d4b4a.jpg, ac388739.jpg, 45990f7d.jpg (Park Front of Building 350)
 * - ea374598.jpg, 780f317e.jpg, 9c4bd790.jpg, 6496ecdd.jpg, 207f8d8c.jpg (Park-Facing Vestibule, Skybridge & Sloped ADA Ramp)
 */
function buildParkSideGrounds(arch, mats, sampleLocalY, maxX, frontZ, midWalkY) {
    const {
        smoothGraniteMat,
        ribbedConcreteMat,
        concreteWalkMat,
        pipeHandrailMat,
        usFlagMat,
        doorsLockedSignMat,
        darkFrameMat,
        glassMat
    } = mats;

    const darkMulchMat = new THREE.MeshStandardMaterial({
        color: '#2b2520',
        roughness: 0.95,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
    });
    const landscapeCurbMat = new THREE.MeshStandardMaterial({
        color: '#c8c4bc',
        roughness: 0.78,
        metalness: 0.04
    });
    const blackIronMat = new THREE.MeshStandardMaterial({
        color: '#1b1f22',
        roughness: 0.42,
        metalness: 0.72
    });
    const darkGreenRailMat = new THREE.MeshStandardMaterial({
        color: '#2d3b34',
        roughness: 0.38,
        metalness: 0.65
    });
    const hvacBeigeMat = new THREE.MeshStandardMaterial({
        color: '#b7b2a6',
        roughness: 0.55,
        metalness: 0.35
    });
    const arborvitaeMat = new THREE.MeshStandardMaterial({
        color: '#274221',
        roughness: 0.88,
        metalness: 0.02
    });
    const hostaLeafMat = new THREE.MeshStandardMaterial({
        color: '#6e8c48',
        roughness: 0.85,
        metalness: 0.02
    });
    const scoreJointMat = new THREE.MeshBasicMaterial({
        color: '#9c9588',
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3
    });
    const parkConcreteMat = new THREE.MeshStandardMaterial({
        color: '#e2dcd0',
        roughness: 0.86,
        metalness: 0.03,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
    });

    // =========================================================================
    // 1. MONUMENTAL PARK ENTRANCE STAIRCASE, STEPPED CUT-STONE CHEEK WALLS,
    //    TWIN FLUTED DARK-GREEN POST LANTERNS, CENTER LOOPED HANDRAIL &
    //    "(NO PUBLIC ACCESS) DOORS LOCKED" SIGN BANNER (3e77aa21.jpg, e637f636.jpg, 45990f7d.jpg)
    // =========================================================================
    const portalZ = 4.35; // Center Bay 4 on the Park (+X) facade
    const stairW = 5.40;  // Clear width between cheek walls (lz = +1.65m .. +7.05m)
    const cheekW = 0.64;  // Stepped cut-stone cheek wall width (centers at lz = +1.33m and +7.37m)
    const topLandingD = 2.15; // lx = +10.18m .. +12.33m
    const topLandingY = 0.08;
    const parkPromY = Math.max(sampleLocalY(maxX + 6.50, portalZ, -1.42) + 0.05, -1.46);

    // 1A. Top Entrance Landing Slab (lx = +10.18m .. +12.33m, y = topLandingY)
    const topLandingH = topLandingY - (parkPromY - 0.50);
    const topLanding = new THREE.Mesh(
        new THREE.BoxGeometry(topLandingD, topLandingH, stairW),
        concreteWalkMat
    );
    topLanding.position.set(maxX + topLandingD * 0.5, topLandingY - topLandingH * 0.5, portalZ);
    topLanding.castShadow = true;
    topLanding.receiveShadow = true;
    arch.add(topLanding);

    // 1B. 10 Wide Brushed-Concrete/Granite Steps descending from lx = +12.33m (y = +0.08m) to lx = +15.93m (y = parkPromY)
    const numParkSteps = 10;
    const stairStartX = maxX + topLandingD; // 12.33m
    const stairEndX = 15.93;
    const stairRunX = stairEndX - stairStartX; // 3.60m
    const stepTread = stairRunX / numParkSteps; // 0.36m
    const stepRise = (topLandingY - parkPromY) / numParkSteps;

    for (let i = 0; i < numParkSteps; i++) {
        const sy = topLandingY - (i + 1) * stepRise;
        const sx = stairStartX + (i + 0.5) * stepTread;
        const sh = sy - (parkPromY - 0.45);
        const stepMesh = new THREE.Mesh(
            new THREE.BoxGeometry(stepTread + 0.04, sh, stairW),
            concreteWalkMat
        );
        stepMesh.position.set(sx, sy - sh * 0.5, portalZ);
        stepMesh.castShadow = true;
        stepMesh.receiveShadow = true;
        arch.add(stepMesh);
    }

    // 1C. Stepped Cut-Stone / Ashlar Cheek Walls on Left (lz = +7.37m) & Right (lz = +1.33m) of Monumental Stairs
    //     Exact 3-part profile from 3e77aa21.jpg, e637f636.jpg, 456d4b4a.jpg & 45990f7d.jpg:
    //     - Part 1 (Upper Horizontal Pedestal Block): lx = +10.18m .. +12.95m, flat coping top at y = +0.62m
    //     - Part 2 (Sloped Middle Ramp Block): lx = +12.95m .. +15.15m, sloping from y = +0.62m down to y = parkPromY + 0.78m
    //     - Part 3 (Lower Horizontal Front Pier): lx = +15.15m .. +16.15m, flat coping top at y = parkPromY + 0.78m
    const cheekBotY = parkPromY - 0.50;
    const cheekUpperTopY = 0.62;
    const cheekLowerTopY = parkPromY + 0.78;

    [-stairW * 0.5 - cheekW * 0.5, stairW * 0.5 + cheekW * 0.5].forEach((dzOff) => {
        const cz = portalZ + dzOff;

        // Part 1: Upper Horizontal Pedestal Block (lx = 10.18m .. 12.95m)
        const uLen = 12.95 - maxX; // 2.77m
        const uH = cheekUpperTopY - cheekBotY;
        const upperBlock = new THREE.Mesh(
            new THREE.BoxGeometry(uLen, uH, cheekW),
            smoothGraniteMat
        );
        upperBlock.position.set(maxX + uLen * 0.5, cheekBotY + uH * 0.5, cz);
        upperBlock.castShadow = true;
        upperBlock.receiveShadow = true;
        arch.add(upperBlock);

        // Overhanging stone coping cap on upper pedestal block (3e77aa21.jpg)
        const upperCap = new THREE.Mesh(
            new THREE.BoxGeometry(uLen + 0.08, 0.10, cheekW + 0.08),
            smoothGraniteMat
        );
        upperCap.position.set(maxX + uLen * 0.5, cheekUpperTopY + 0.04, cz);
        upperCap.castShadow = true;
        arch.add(upperCap);

        // Part 2: Sloped Middle Ramp Section (lx = 12.95m .. 15.15m)
        const slopeSegs = 8;
        const sStartX = 12.95;
        const sEndX = 15.15;
        const sSpanX = sEndX - sStartX;
        for (let s = 0; s < slopeSegs; s++) {
            const t = (s + 0.5) / slopeSegs;
            const sx = THREE.MathUtils.lerp(sStartX, sEndX, t);
            const topY = THREE.MathUtils.lerp(cheekUpperTopY, cheekLowerTopY, t);
            const sh = topY - cheekBotY;
            const seg = new THREE.Mesh(
                new THREE.BoxGeometry(sSpanX / slopeSegs + 0.05, sh, cheekW),
                smoothGraniteMat
            );
            seg.position.set(sx, cheekBotY + sh * 0.5, cz);
            seg.castShadow = true;
            seg.receiveShadow = true;
            arch.add(seg);
        }
        // Sloped stone coping slab along Part 2
        const slopeLen = Math.hypot(sSpanX, cheekUpperTopY - cheekLowerTopY);
        const slopeAng = Math.atan2(cheekUpperTopY - cheekLowerTopY, sSpanX);
        const slopeCap = new THREE.Mesh(
            new THREE.BoxGeometry(slopeLen + 0.06, 0.10, cheekW + 0.08),
            smoothGraniteMat
        );
        slopeCap.rotation.z = -slopeAng;
        slopeCap.position.set((sStartX + sEndX) * 0.5, (cheekUpperTopY + cheekLowerTopY) * 0.5 + 0.04, cz);
        slopeCap.castShadow = true;
        arch.add(slopeCap);

        // Part 3: Lower Horizontal Front Pier (lx = 15.15m .. 16.15m, e637f636.jpg & 45990f7d.jpg)
        const lLen = 1.00;
        const lH = cheekLowerTopY - cheekBotY;
        const lowerBlock = new THREE.Mesh(
            new THREE.BoxGeometry(lLen, lH, cheekW),
            smoothGraniteMat
        );
        lowerBlock.position.set(15.15 + lLen * 0.5, cheekBotY + lH * 0.5, cz);
        lowerBlock.castShadow = true;
        lowerBlock.receiveShadow = true;
        arch.add(lowerBlock);

        const lowerCap = new THREE.Mesh(
            new THREE.BoxGeometry(lLen + 0.08, 0.10, cheekW + 0.08),
            smoothGraniteMat
        );
        lowerCap.position.set(15.15 + lLen * 0.5, cheekLowerTopY + 0.04, cz);
        lowerCap.castShadow = true;
        arch.add(lowerCap);

        // Twin Fluted Dark-Green Classical Cast-Iron Post Lanterns mounted on the upper cheek pedestals (3e77aa21.jpg, ac388739.jpg, e637f636.jpg!)
        buildFlutedParkPostLantern(arch, 12.42, cheekUpperTopY + 0.08, cz);
    });

    // 1D. Center Double-Loop Pipe Handrail running down the centerline (lz = +4.35m) of the Monumental Park Steps (3e77aa21.jpg, e637f636.jpg!)
    {
        const rStartX = stairStartX - 0.55; // Starts on the top landing (3e77aa21.jpg)
        const rEndX = stairEndX - 0.10;
        // Horizontal top landing rail segment (lx = 11.78m .. 12.33m)
        const topFlatLen = stairStartX - rStartX;
        const topFlatRail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, topFlatLen, 10), darkGreenRailMat);
        topFlatRail.rotation.z = Math.PI * 0.5;
        topFlatRail.position.set((rStartX + stairStartX) * 0.5, topLandingY + 0.88, portalZ);
        arch.add(topFlatRail);

        // Curved P-loop return at the top of the handrail (clearly visible in foreground of 3e77aa21.jpg!)
        const topLoop = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 8, 16, Math.PI * 1.25), darkGreenRailMat);
        topLoop.position.set(rStartX, topLandingY + 0.70, portalZ);
        topLoop.rotation.z = Math.PI * 0.35;
        arch.add(topLoop);

        // Sloped main handrail bar & lower parallel bar descending the 10 steps
        const dX = rEndX - stairStartX;
        const dY = parkPromY - topLandingY;
        const slopeLen = Math.hypot(dX, dY);
        const slopeAng = Math.atan2(dY, dX);
        [0.88, 0.52].forEach((rH) => {
            const sRail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, slopeLen, 10), darkGreenRailMat);
            sRail.rotation.z = Math.PI * 0.5 + slopeAng;
            sRail.position.set((stairStartX + rEndX) * 0.5, (topLandingY + parkPromY) * 0.5 + rH, portalZ);
            sRail.castShadow = true;
            arch.add(sRail);
        });

        // 4 vertical pipe posts supporting the center stair handrail
        [0.0, 0.33, 0.67, 1.0].forEach((t) => {
            const px = THREE.MathUtils.lerp(stairStartX, rEndX, t);
            const py = THREE.MathUtils.lerp(topLandingY, parkPromY, t);
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.90, 10), darkGreenRailMat);
            post.position.set(px, py + 0.45, portalZ);
            post.castShadow = true;
            arch.add(post);
        });
    }

    // 1E. "(NO PUBLIC ACCESS) / DOORS LOCKED" White Banner Sign on Black Metal Legs at the Foot of the Right Stairs (e637f636.jpg, 45990f7d.jpg!)
    if (doorsLockedSignMat) {
        const signX = stairEndX + 0.18; // 16.11m
        const signZ = portalZ - 1.65;   // 2.70m (right half of the bottom step)
        const signY = parkPromY;
        const signW = 1.52;
        const signH = 0.56;

        const banner = new THREE.Mesh(new THREE.BoxGeometry(0.03, signH, signW), doorsLockedSignMat);
        banner.position.set(signX, signY + 0.38 + signH * 0.5, signZ);
        banner.castShadow = true;
        arch.add(banner);

        // Two black metal vertical frame legs + top/bottom horizontal frame bars (e637f636.jpg, 45990f7d.jpg)
        [-signW * 0.48, signW * 0.48].forEach((dzLeg) => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.98, 8), blackIronMat);
            leg.position.set(signX, signY + 0.49, signZ + dzLeg);
            arch.add(leg);
            // Foot cross-base
            const foot = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.025, 0.04), blackIronMat);
            foot.position.set(signX, signY + 0.015, signZ + dzLeg);
            arch.add(foot);
        });
    }

    // =========================================================================
    // 2. BLACK ORNAMENTAL WROUGHT-IRON PICKET FENCE HVAC ENCLOSURE (LEFT OF STAIRS)
    //    & BASEMENT VENT / LOUVER EQUIPMENT (RIGHT OF STAIRS)
    //    (3e77aa21.jpg, e637f636.jpg, 456d4b4a.jpg, ac388739.jpg, 45990f7d.jpg)
    // =========================================================================
    {
        const fMinZ = 8.85;
        const fMaxZ = 13.55;
        const fSpanZ = fMaxZ - fMinZ; // 4.70m
        const fMidZ = (fMinZ + fMaxZ) * 0.5; // 11.20m
        const fOutX = maxX + 2.35; // 12.53m
        const fSpanX = fOutX - maxX; // 2.35m
        const fMidX = maxX + fSpanX * 0.5;
        const fGroundY = Math.max(sampleLocalY(fMidX, fMidZ, -1.15), -1.25);
        const fH = 1.52;

        // Concrete equipment pad inside the black wrought-iron fence
        const eqPad = new THREE.Mesh(new THREE.BoxGeometry(fSpanX, 0.36, fSpanZ), concreteWalkMat);
        eqPad.position.set(fMidX, fGroundY - 0.12, fMidZ);
        eqPad.receiveShadow = true;
        arch.add(eqPad);

        // Front (+X) Wrought-Iron Picket Fence Rails & Vertical Pickets (3e77aa21.jpg, e637f636.jpg, 456d4b4a.jpg)
        [0.12, fH - 0.08, fH].forEach((ry) => {
            const fRail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, fSpanZ), blackIronMat);
            fRail.position.set(fOutX, fGroundY + ry, fMidZ);
            arch.add(fRail);
        });
        const numPicketsZ = 28;
        for (let p = 0; p <= numPicketsZ; p++) {
            const pz = fMinZ + (p / numPicketsZ) * fSpanZ;
            const isPost = p === 0 || p === 14 || p === numPicketsZ;
            const pR = isPost ? 0.026 : 0.011;
            const picket = new THREE.Mesh(new THREE.BoxGeometry(pR * 2, fH + (isPost ? 0.08 : 0.02), pR * 2), blackIronMat);
            picket.position.set(fOutX, fGroundY + fH * 0.5, pz);
            picket.castShadow = true;
            arch.add(picket);
        }

        // Left (-Z at fMinZ) & Right (+Z at fMaxZ) Return Wrought-Iron Picket Fence Walls
        [fMinZ, fMaxZ].forEach((sideZ) => {
            [0.12, fH - 0.08, fH].forEach((ry) => {
                const sRail = new THREE.Mesh(new THREE.BoxGeometry(fSpanX, 0.035, 0.035), blackIronMat);
                sRail.position.set(fMidX, fGroundY + ry, sideZ);
                arch.add(sRail);
            });
            const numPicketsX = 14;
            for (let p = 1; p < numPicketsX; p++) {
                const px = maxX + (p / numPicketsX) * fSpanX;
                const picket = new THREE.Mesh(new THREE.BoxGeometry(0.022, fH + 0.02, 0.022), blackIronMat);
                picket.position.set(px, fGroundY + fH * 0.5, sideZ);
                arch.add(picket);
            }
        });

        // Two Beige/Grey HVAC Condenser Units inside the Wrought-Iron Enclosure (3e77aa21.jpg, e637f636.jpg!)
        [9.95, 11.85].forEach((uz) => {
            const unit = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.08, 1.15), hvacBeigeMat);
            unit.position.set(maxX + 1.15, fGroundY + 0.54, uz);
            unit.castShadow = true;
            unit.receiveShadow = true;
            arch.add(unit);
        });

        // Right-of-Stairs Basement Wall Utility Hood (lz = -0.35m, ac388739.jpg) & Louvered Intake Vent (lz = -4.15m, 45990f7d.jpg)
        const ventHoodMat = new THREE.MeshStandardMaterial({ color: '#e4e6e8', roughness: 0.45 });
        const ventHood = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.28), ventHoodMat);
        ventHood.position.set(maxX + 0.14, -0.42, -0.35);
        arch.add(ventHood);

        const louverVent = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.78, 0.86),
            new THREE.MeshStandardMaterial({ color: '#585e64', roughness: 0.6, metalness: 0.4 })
        );
        louverVent.position.set(maxX + 0.10, -0.48, -4.15);
        arch.add(louverVent);
    }

    // =========================================================================
    // 3. DARK-MULCHED FOUNDATION PLANTING BEDS, S-CURVED CONCRETE LANDSCAPE EDGING
    //    CURBS & CONICAL DARK-GREEN ARBORVITAE SHRUBS
    //    (3e77aa21.jpg, e637f636.jpg, 456d4b4a.jpg, ac388739.jpg, 45990f7d.jpg, 9c4bd790.jpg, 207f8d8c.jpg)
    // =========================================================================
    {
        const buildCurvedMulchBedAndCurb = (zStart, zEnd, segs) => {
            const mulchPos = [];
            for (let i = 0; i < segs; i++) {
                const za = THREE.MathUtils.lerp(zStart, zEnd, i / segs);
                const zb = THREE.MathUtils.lerp(zStart, zEnd, (i + 1) / segs);
                const xOutA = getParkCurbX(za);
                const xOutB = getParkCurbX(zb);
                const xIn = maxX + 0.04;

                const yInA = sampleLocalY(xIn, za, -1.15) + 0.04;
                const yInB = sampleLocalY(xIn, zb, -1.15) + 0.04;
                const yOutA = sampleLocalY(xOutA, za, -1.25) + 0.04;
                const yOutB = sampleLocalY(xOutB, zb, -1.25) + 0.04;

                mulchPos.push(
                    xIn, yInA, za, xIn, yInB, zb, xOutB, yOutB, zb,
                    xIn, yInA, za, xOutB, yOutB, zb, xOutA, yOutA, za
                );

                // Raised S-Curved Grey Concrete Landscape Edging Curb along getParkCurbX(lz) (456d4b4a.jpg, ac388739.jpg, 45990f7d.jpg, 9c4bd790.jpg!)
                const xm = (xOutA + xOutB) * 0.5;
                const zm = (za + zb) * 0.5;
                const ym = (yOutA + yOutB) * 0.5;
                const segLen = Math.hypot(xOutB - xOutA, zb - za) + 0.03;
                const curbSeg = new THREE.Mesh(
                    new THREE.BoxGeometry(0.16, 0.24, segLen),
                    landscapeCurbMat
                );
                curbSeg.rotation.y = Math.atan2(xOutB - xOutA, zb - za);
                curbSeg.position.set(xm, ym - 0.04, zm);
                curbSeg.castShadow = true;
                curbSeg.receiveShadow = true;
                arch.add(curbSeg);
            }
            const mulchGeo = new THREE.BufferGeometry();
            mulchGeo.setAttribute('position', new THREE.Float32BufferAttribute(mulchPos, 3));
            mulchGeo.computeVertexNormals();
            const mulchMesh = new THREE.Mesh(mulchGeo, darkMulchMat);
            mulchMesh.receiveShadow = true;
            arch.add(mulchMesh);
        };

        // 3A. Right (-Z, South-West) Mulch Bed & Curved Concrete Edging Curb (lz = -17.425m .. +0.95m)
        buildCurvedMulchBedAndCurb(-17.425, 0.95, 24);

        // 3B. Left (+Z, North-East) Mulch Bed & Curved Concrete Edging Curb (lz = +7.75m .. +26.125m)
        buildCurvedMulchBedAndCurb(7.75, frontZ, 24);

        // 3C. Four Conical Dark-Green Arborvitae Foundation Shrubs (3e77aa21.jpg, e637f636.jpg, 456d4b4a.jpg, ac388739.jpg, 45990f7d.jpg, 9c4bd790.jpg!)
        const addConicalArborvitae = (sx, sz, h, rBot) => {
            const sy = sampleLocalY(sx, sz, -1.20) + 0.04;
            const grp = new THREE.Group();
            grp.position.set(sx, sy, sz);
            // Layered conical evergreen tiers for realistic arborvitae silhouette
            [0.0, 0.28, 0.55].forEach((t, idx) => {
                const coneH = h * (0.65 - idx * 0.12);
                const coneR = rBot * (1.0 - idx * 0.24);
                const cone = new THREE.Mesh(new THREE.ConeGeometry(coneR, coneH, 10), arborvitaeMat);
                cone.position.y = t * h + coneH * 0.45;
                cone.castShadow = true;
                cone.receiveShadow = true;
                grp.add(cone);
            });
            arch.add(grp);
        };

        // Flanking the Left & Right Monumental Stair Cheek Walls + Bay 1 & NE Corner (exact match to e637f636.jpg, ac388739.jpg, 456d4b4a.jpg, 9c4bd790.jpg!)
        addConicalArborvitae(13.05, 8.20, 2.25, 0.68);  // Immediately left (+Z) of left stair cheek wall (3e77aa21.jpg, e637f636.jpg)
        addConicalArborvitae(11.65, 23.60, 1.85, 0.55); // Near NE Front Pavilion corner (456d4b4a.jpg)
        addConicalArborvitae(13.05, 0.48, 2.20, 0.66);  // Immediately right (-Z) of right stair cheek wall (e637f636.jpg, ac388739.jpg, 45990f7d.jpg)
        addConicalArborvitae(11.45, -7.55, 2.15, 0.62); // Under Bay 1 / Bay 2 right of stairs (ac388739.jpg, 45990f7d.jpg, 9c4bd790.jpg, 207f8d8c.jpg)

        // Low variegated hosta & perennial clumps in the right foundation mulch bed (ac388739.jpg, 45990f7d.jpg, 6496ecdd.jpg)
        [
            [12.35, -1.55, 0.42],
            [11.65, -5.85, 0.46],
            [12.10, -9.20, 0.38],
            [11.80, -13.20, 0.44],
            [12.40, 14.80, 0.42]
        ].forEach(([hx, hz, hr]) => {
            const hy = sampleLocalY(hx, hz, -1.20) + 0.04;
            const clump = new THREE.Mesh(new THREE.DodecahedronGeometry(hr, 1), hostaLeafMat);
            clump.scale.set(1.25, 0.52, 1.15);
            clump.position.set(hx, hy + hr * 0.25, hz);
            clump.castShadow = true;
            arch.add(clump);
        });
    }

    // =========================================================================
    // 4. SEAMLESS, FINISHED BRUSHED-CONCRETE COURTHOUSE PARK PATHWAY NETWORK:
    //    - 4A. 3-Row Monumental Stairs Walkway + Curved Radiused Corner Fillets welded to the Oval Pathway
    //    - 4B. Left Straight Sidewalk Extension along Orondo Ave (welded to Building 350 Orondo Sidewalk at lx = 22.18m)
    //    - 4C. Right Straight Park-to-Parking-Lot Walkway (moved 30 ft right, with flared entrance bellmouth at Building 401 South Sidewalk)
    //    - 4D. Sweeping Oval Courthouse Park Pathway welded tangent-to-edge into 4B & 4C with flared bellmouth aprons & finished concrete edge curbs
    //    (e13507a5.png, 559aaf24.png, fc567dc9.jpg, 21e9f85a.jpg, be4d0630.jpg)
    // =========================================================================
    {
        const walkPos = [];
        const curbPos = [];
        const jointPos = [];

        const curbTrimMat = new THREE.MeshStandardMaterial({
            color: '#f2eee6',
            roughness: 0.75,
            metalness: 0.04,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        });

        const pushTri = (arr, ax, ay, az, bx, by, bz, cx, cy, cz) => {
            arr.push(ax, ay, az, bx, by, bz, cx, cy, cz);
        };
        const pushQuad = (arr, ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) => {
            pushTri(arr, ax, ay, az, bx, by, bz, cx, cy, cz);
            pushTri(arr, ax, ay, az, cx, cy, cz, dx, dy, dz);
        };

        // Unified Auto-Graded Park Walkway Surface Elevation:
        // Uses a 5-point Gaussian-smoothed terrain sample + analytical stair blend so every pathway in Courthouse Park
        // glides smoothly with zero bumps, dips, or steps at any junction!
        const promMinX = 15.90;
        const promMinZ = 1.14;
        const promMaxZ = 7.82;
        const getParkWalkY = (lx, lz) => {
            const cY = sampleLocalY(lx, lz, parkPromY);
            // Smooth 5-point kernel across a 1.8m radius to eliminate any residual DEM facet kinks along the pathways
            const nY = (
                cY * 0.40 +
                sampleLocalY(lx - 1.6, lz, cY) * 0.15 +
                sampleLocalY(lx + 1.6, lz, cY) * 0.15 +
                sampleLocalY(lx, lz - 1.6, cY) * 0.15 +
                sampleLocalY(lx, lz + 1.6, cY) * 0.15
            );
            // At the Building 401 South Sidewalk seam (lx = 20.78m, lz < -18.0m), lock 100% to exact seam height cY + 0.14m
            const seamLock = (lz < -18.0)
                ? (1.0 - THREE.MathUtils.smoothstep(lx, 20.78, 24.50))
                : 0.0;
            const terrY = THREE.MathUtils.lerp(Math.max(cY, nY) + 0.10, cY + 0.14, seamLock);
            const stairBlend =
                (1.0 - THREE.MathUtils.smoothstep(lx, promMinX, promMinX + 3.25)) *
                THREE.MathUtils.smoothstep(lz, promMinZ - 1.5, promMinZ) *
                (1.0 - THREE.MathUtils.smoothstep(lz, promMaxZ, promMaxZ + 1.5));
            return THREE.MathUtils.lerp(terrY, Math.max(terrY, parkPromY + 0.02), stairBlend);
        };

        // Helper: builds a terrain-draped concrete quad (wound counter-clockwise from +Y so normal is +Y)
        // Side skirts start 6mm below the top surface so internal shared edges never Z-fight or show dark lines through the slab!
        const addUnifiedWalkQuad = (ax, az, bx, bz, cx, cz, dx, dz, drop = 0.40) => {
            const ya = getParkWalkY(ax, az);
            const yb = getParkWalkY(bx, bz);
            const yc = getParkWalkY(cx, cz);
            const yd = getParkWalkY(dx, dz);
            const sOff = 0.006;

            pushQuad(walkPos, ax, ya, az, dx, yd, dz, cx, yc, cz, bx, yb, bz);
            pushQuad(walkPos, ax, ya - sOff, az, bx, yb - sOff, bz, bx, yb - drop, bz, ax, ya - drop, az);
            pushQuad(walkPos, bx, yb - sOff, bz, cx, yc - sOff, cz, cx, yc - drop, cz, bx, yb - drop, bz);
            pushQuad(walkPos, cx, yc - sOff, cz, dx, yd - sOff, dz, dx, yd - drop, dz, cx, yc - drop, cz);
            pushQuad(walkPos, dx, yd - sOff, dz, ax, ya - sOff, az, ax, ya - drop, az, dx, yd - drop, dz);
        };

        // Helper: builds a raised finished concrete edge border/curb strip along a pathway edge (x0,z0) -> (x1,z1)
        const addFinishedEdgeCurb = (x0, z0, x1, z1, curbW = 0.14, curbRaise = 0.016, drop = 0.42) => {
            const dx = x1 - x0;
            const dz = z1 - z0;
            const len = Math.hypot(dx, dz) || 1;
            const nx = (-dz / len) * (curbW * 0.5);
            const nz = (dx / len) * (curbW * 0.5);

            const ax = x0 - nx, az = z0 - nz;
            const bx = x1 - nx, bz = z1 - nz;
            const cx = x1 + nx, cz = z1 + nz;
            const dxPt = x0 + nx, dzPt = z0 + nz;

            const ya = getParkWalkY(ax, az) + curbRaise;
            const yb = getParkWalkY(bx, bz) + curbRaise;
            const yc = getParkWalkY(cx, cz) + curbRaise;
            const yd = getParkWalkY(dxPt, dzPt) + curbRaise;

            pushQuad(curbPos, ax, ya, az, dxPt, yd, dzPt, cx, yc, cz, bx, yb, bz);
            pushQuad(curbPos, ax, ya, az, bx, yb, bz, bx, yb - drop, bz, ax, ya - drop, az);
            pushQuad(curbPos, bx, yb, bz, cx, yc, cz, cx, yc - drop, cz, bx, yb - drop, bz);
            pushQuad(curbPos, cx, yc, cz, dxPt, yd, dzPt, dxPt, yd - drop, dzPt, cx, yc - drop, cz);
            pushQuad(curbPos, dxPt, yd, dzPt, ax, ya, az, ax, ya - drop, az, dxPt, yd - drop, dzPt);
        };

        // Helper: builds a terrain-draped expansion score joint strip between (x0, z0) and (x1, z1)
        const addUnifiedScoreJoint = (x0, z0, x1, z1, halfW = 0.016) => {
            const dx = x1 - x0;
            const dz = z1 - z0;
            const len = Math.hypot(dx, dz) || 1;
            const nx = (-dz / len) * halfW;
            const nz = (dx / len) * halfW;
            const y0 = getParkWalkY(x0, z0) + 0.008;
            const y1 = getParkWalkY(x1, z1) + 0.008;
            pushQuad(
                jointPos,
                x0 - nx, y0, z0 - nz,
                x0 + nx, y0, z0 + nz,
                x1 + nx, y1, z1 + nz,
                x1 - nx, y1, z1 - nz
            );
        };

        // Parametric definitions of the Left & Right Straight Walkways so the Oval Pathway welds to their exact inner edges
        const leftStartX = 22.18;
        const leftEndX = 52.00;
        const leftHalfW = 1.50; // 3.00m total width
        const getLeftCenterZ = () => 47.30;
        const getLeftInnerZ = (x) => getLeftCenterZ(x) - leftHalfW;

        const rightStartX = 20.78; // Flush with outer edge of Building 401 South Sidewalk (lz_401 = -19.10m)
        const rightEndX = 56.00;
        const rightHalfW = 1.18; // 2.36m total width
        const getRightCenterZ = (x) => THREE.MathUtils.lerp(-35.75, -36.55, (x - rightStartX) / (rightEndX - rightStartX));
        const getRightInnerZ = (x) => getRightCenterZ(x) + rightHalfW;

        // Parametric definition of the Sweeping Oval Pathway welded from getLeftInnerZ(ovalBaseX) to getRightInnerZ(ovalBaseX)
        const ovalBaseX = 41.80;
        const ovalApexZ = 4.48;
        const ovalLeftZ = getLeftInnerZ(ovalBaseX);   // +44.16m (exact inner edge of Left Orondo Sidewalk!)
        const ovalRightZ = getRightInnerZ(ovalBaseX); // -35.05m (exact inner edge of Right Straight Walkway!)
        const ovalRadiusX = 16.30; // Centerline apex at lx = 41.80 - 16.30 = +25.50m
        const ovalWalkW = 2.40;
        const ovalSegs = 60;
        const angStart = 0.16 * Math.PI;
        const angEnd = 0.84 * Math.PI;
        const cosStart = Math.cos(angStart);
        const sinStart = Math.sin(angStart);

        // Helper: evaluates the unfilleted oval edge point (sign = -1 for inner -X edge, +1 for outer +X edge) at u in [0, 1]
        const getRawOvalEdgeAtU = (u, sign) => {
            const ang = THREE.MathUtils.lerp(angStart, angEnd, u);
            const cNorm = Math.cos(ang) / cosStart;
            const sNorm = (Math.sin(ang) - sinStart) / (1.0 - sinStart);
            const spanZ = cNorm >= 0 ? (ovalLeftZ - ovalApexZ) : (ovalApexZ - ovalRightZ);
            const cx = ovalBaseX - sNorm * ovalRadiusX;
            const cz = ovalApexZ + cNorm * spanZ;

            const dcNorm = -Math.sin(ang) / cosStart;
            const dsNorm = Math.cos(ang) / (1.0 - sinStart);
            const tx = -dsNorm * ovalRadiusX;
            const tz = dcNorm * spanZ;
            const tLen = Math.hypot(tx, tz) || 1;
            const nx = -tz / tLen;
            const nz = tx / tLen;

            return {
                x: cx + sign * nx * (ovalWalkW * 0.5),
                z: cz + sign * nz * (ovalWalkW * 0.5)
            };
        };

        // Exact inner (-X) edge of the Oval Pathway for any z near the Monumental Stairs walkway
        const getOvalInnerXAtZ = (z) => {
            const spanZ = z >= ovalApexZ ? (ovalLeftZ - ovalApexZ) : (ovalApexZ - ovalRightZ);
            const cNorm = THREE.MathUtils.clamp((z - ovalApexZ) / spanZ, -0.999, 0.999);
            const ang = Math.acos(THREE.MathUtils.clamp(cNorm * cosStart, -0.999, 0.999));
            const u = THREE.MathUtils.clamp((ang - angStart) / (angEnd - angStart), 0, 1);
            return getRawOvalEdgeAtU(u, -1).x;
        };

        // 4A. 3-Row Monumental Stairs Walkway (lx = +15.90m .. getOvalInnerXAtZ(z), lz = +1.14m .. +7.82m, 4 columns x 3 rows)
        //     Welds directly and seamlessly into the curved inner edge of the Oval Pathway + curved corner fillets on Left & Right!
        const numRowsX = 3;
        const numColsZ = 4;
        const segD = (promMaxZ - promMinZ) / numColsZ; // 1.67m per slab column

        for (let c = 0; c < numColsZ; c++) {
            const cz0 = promMinZ + c * segD;
            const cz1 = cz0 + segD;
            const endX0 = getOvalInnerXAtZ(cz0);
            const endX1 = getOvalInnerXAtZ(cz1);

            for (let r = 0; r < numRowsX; r++) {
                const t0 = r / numRowsX;
                const t1 = (r + 1) / numRowsX;
                const ax = THREE.MathUtils.lerp(promMinX, endX0, t0);
                const bx = THREE.MathUtils.lerp(promMinX, endX0, t1);
                const cx = THREE.MathUtils.lerp(promMinX, endX1, t1);
                const dx = THREE.MathUtils.lerp(promMinX, endX1, t0);

                addUnifiedWalkQuad(ax, cz0, bx, cz0, cx, cz1, dx, cz1);

                if (c > 0) {
                    addUnifiedScoreJoint(ax, cz0, bx, cz0, 0.015);
                }
                if (r > 0) {
                    addUnifiedScoreJoint(ax, cz0, dx, cz1, 0.015);
                }
                // Crisp curved header score joint where Row 3 welds into the Oval Pathway
                if (r === numRowsX - 1) {
                    addUnifiedScoreJoint(bx, cz0, cx, cz1, 0.018);
                }
            }
        }

        // 1-Meter Concave Rounded Corner Fillets & Finished Edge Curbs on Left (lz = 7.82m..8.82m) & Right (lz = 0.14m..1.14m) of 4A
        const filletSegs = 8;
        const filletSpanZ = 1.00; // 1.0m rounded corner span (44221459.png)
        const filletStartRightX = getOvalInnerXAtZ(promMinZ) - filletSpanZ;
        const filletStartLeftX = getOvalInnerXAtZ(promMaxZ) - filletSpanZ;

        // Straight side curbs along 4A up to the exact start of each 1.0m rounded corner fillet
        addFinishedEdgeCurb(promMinX, promMinZ, filletStartRightX, promMinZ);
        addFinishedEdgeCurb(promMinX, promMaxZ, filletStartLeftX, promMaxZ);

        // Right (-Z) 1.0m Concave Rounded Corner Fillet (lz = 1.14m -> 0.14m)
        for (let f = 0; f < filletSegs; f++) {
            const u0 = f / filletSegs;
            const u1 = (f + 1) / filletSegs;
            const zf0 = promMinZ - u0 * filletSpanZ;
            const zf1 = promMinZ - u1 * filletSpanZ;
            const xOval0 = getOvalInnerXAtZ(zf0);
            const xOval1 = getOvalInnerXAtZ(zf1);
            // Concave quarter-circle curve: 0 at u=0 (xEdge = filletStartRightX, tangent to z=promMinZ) -> 1 at u=1 (xEdge = xOval, tangent to oval)
            const curve0 = Math.sqrt(Math.max(0, 1.0 - (1.0 - u0) * (1.0 - u0)));
            const curve1 = Math.sqrt(Math.max(0, 1.0 - (1.0 - u1) * (1.0 - u1)));
            const xEdge0 = THREE.MathUtils.lerp(filletStartRightX, xOval0, curve0);
            const xEdge1 = THREE.MathUtils.lerp(filletStartRightX, xOval1, curve1);

            addUnifiedWalkQuad(xEdge1, zf1, xOval1, zf1, xOval0, zf0, xEdge0, zf0);
            addFinishedEdgeCurb(xEdge0, zf0, xEdge1, zf1);
            addUnifiedScoreJoint(xOval0, zf0, xOval1, zf1, 0.016);
        }
        // Left (+Z) 1.0m Concave Rounded Corner Fillet (lz = 7.82m -> 8.82m)
        for (let f = 0; f < filletSegs; f++) {
            const u0 = f / filletSegs;
            const u1 = (f + 1) / filletSegs;
            const zf0 = promMaxZ + u0 * filletSpanZ;
            const zf1 = promMaxZ + u1 * filletSpanZ;
            const xOval0 = getOvalInnerXAtZ(zf0);
            const xOval1 = getOvalInnerXAtZ(zf1);
            const curve0 = Math.sqrt(Math.max(0, 1.0 - (1.0 - u0) * (1.0 - u0)));
            const curve1 = Math.sqrt(Math.max(0, 1.0 - (1.0 - u1) * (1.0 - u1)));
            const xEdge0 = THREE.MathUtils.lerp(filletStartLeftX, xOval0, curve0);
            const xEdge1 = THREE.MathUtils.lerp(filletStartLeftX, xOval1, curve1);

            addUnifiedWalkQuad(xEdge0, zf0, xOval0, zf0, xOval1, zf1, xEdge1, zf1);
            addFinishedEdgeCurb(xEdge0, zf0, xEdge1, zf1);
            addUnifiedScoreJoint(xOval0, zf0, xOval1, zf1, 0.016);
        }

        // Precompute Quadratic Bézier 1.0m Rounded Corner Fillet control points where the Oval Pathway (4D)
        // meets the Left Straight Sidewalk (4B, u in [0, uFillet]) and Right Straight Walkway (4C, u in [1-uFillet, 1]).
        const uFillet = 0.08;
        const evalQuadBezier = (p0, p1, p2, t) => {
            const omt = 1.0 - t;
            return {
                x: omt * omt * p0.x + 2.0 * omt * t * p1.x + t * t * p2.x,
                z: omt * omt * p0.z + 2.0 * omt * t * p1.z + t * t * p2.z
            };
        };

        // Left Junction (meeting 4B at z = getLeftInnerZ(x) with 1.0m rounded corners)
        const leftP0In = getRawOvalEdgeAtU(uFillet, -1);
        const leftP0Out = getRawOvalEdgeAtU(uFillet, +1);
        const leftCornerInX = ovalBaseX - 1.25;
        const leftCornerOutX = ovalBaseX + 1.35;
        const leftEndInX = leftCornerInX - 1.00;
        const leftEndOutX = leftCornerOutX + 1.20;
        const leftP1In = { x: leftCornerInX, z: getLeftInnerZ(leftCornerInX) };
        const leftP2In = { x: leftEndInX, z: getLeftInnerZ(leftEndInX) };
        const leftP1Out = { x: leftCornerOutX, z: getLeftInnerZ(leftCornerOutX) };
        const leftP2Out = { x: leftEndOutX, z: getLeftInnerZ(leftEndOutX) };

        // Right Junction (meeting 4C at z = getRightInnerZ(x) with 1.0m rounded corners)
        const rightP0In = getRawOvalEdgeAtU(1.0 - uFillet, -1);
        const rightP0Out = getRawOvalEdgeAtU(1.0 - uFillet, +1);
        const rightCornerInX = ovalBaseX - 1.25;
        const rightCornerOutX = ovalBaseX + 1.35;
        const rightEndInX = rightCornerInX - 1.00;
        const rightEndOutX = rightCornerOutX + 1.20;
        const rightP1In = { x: rightCornerInX, z: getRightInnerZ(rightCornerInX) };
        const rightP2In = { x: rightEndInX, z: getRightInnerZ(rightEndInX) };
        const rightP1Out = { x: rightCornerOutX, z: getRightInnerZ(rightCornerOutX) };
        const rightP2Out = { x: rightEndOutX, z: getRightInnerZ(rightEndOutX) };

        const getOvalSlicePoints = (idx) => {
            const u = idx / ovalSegs;
            let inPt, outPt;
            if (u < uFillet) {
                const t = (uFillet - u) / uFillet; // t=0 at u=uFillet -> t=1 at u=0 (welded onto 4B inner edge!)
                inPt = evalQuadBezier(leftP0In, leftP1In, leftP2In, t);
                outPt = evalQuadBezier(leftP0Out, leftP1Out, leftP2Out, t);
            } else if (u > 1.0 - uFillet) {
                const t = (u - (1.0 - uFillet)) / uFillet; // t=0 at u=1-uFillet -> t=1 at u=1 (welded onto 4C inner edge!)
                inPt = evalQuadBezier(rightP0In, rightP1In, rightP2In, t);
                outPt = evalQuadBezier(rightP0Out, rightP1Out, rightP2Out, t);
            } else {
                inPt = getRawOvalEdgeAtU(u, -1);
                outPt = getRawOvalEdgeAtU(u, +1);
            }
            return { inX: inPt.x, inZ: inPt.z, outX: outPt.x, outZ: outPt.z };
        };

        // 4B. Left Straight Sidewalk Extension along Orondo Ave (lx = +22.18m .. +52.00m)
        //     Welds seamlessly at lx = 22.18m to Building 350's Orondo Ave Sidewalk and receives the Oval Pathway's 1.0m rounded fillets!
        const leftSegs = 24;
        for (let i = 0; i < leftSegs; i++) {
            const t0 = i / leftSegs;
            const t1 = (i + 1) / leftSegs;
            const x0 = THREE.MathUtils.lerp(leftStartX, leftEndX, t0);
            const x1 = THREE.MathUtils.lerp(leftStartX, leftEndX, t1);
            const z0 = getLeftCenterZ(x0);
            const z1 = getLeftCenterZ(x1);

            addUnifiedWalkQuad(
                x0, z0 - leftHalfW,
                x1, z1 - leftHalfW,
                x1, z1 + leftHalfW,
                x0, z0 + leftHalfW
            );
            addUnifiedScoreJoint(x0, z0 - leftHalfW + 0.08, x0, z0 + leftHalfW - 0.08, 0.015);

            // Continuous finished curb along the outer Orondo Ave edge (+Z)
            addFinishedEdgeCurb(x0, z0 + leftHalfW, x1, z1 + leftHalfW);
            // Finished curb along the inner Park lawn edge (-Z), leaving a clean opening across the rounded fillet throat [leftEndInX, leftEndOutX]
            const xm = (x0 + x1) * 0.5;
            if (xm < leftEndInX + 0.15 || xm > leftEndOutX - 0.15) {
                addFinishedEdgeCurb(x0, z0 - leftHalfW, x1, z1 - leftHalfW);
            }
        }

        // 4C. Right Straight Park-to-Parking-Lot Walkway (lx = +20.78m .. +56.00m)
        //     Includes a 1.0m Rounded Entrance Return at lx = 20.78m..21.78m welding flush into Building 401's South Sidewalk!
        const rightSegs = 28;
        const topReturnSpanX = 1.00;
        const topReturnFlareZ = 0.72;
        for (let i = 0; i < rightSegs; i++) {
            const t0 = i / rightSegs;
            const t1 = (i + 1) / rightSegs;
            const x0 = THREE.MathUtils.lerp(rightStartX, rightEndX, t0);
            const x1 = THREE.MathUtils.lerp(rightStartX, rightEndX, t1);
            const z0 = getRightCenterZ(x0);
            const z1 = getRightCenterZ(x1);

            // Smooth quarter-circle rounded corner return at lx = 20.78m .. 23.18m where 4C joins Building 401's South Sidewalk
            const uTop0 = THREE.MathUtils.clamp((x0 - rightStartX) / topReturnSpanX, 0, 1);
            const uTop1 = THREE.MathUtils.clamp((x1 - rightStartX) / topReturnSpanX, 0, 1);
            const flare0 = (1.0 - Math.sqrt(Math.max(0, 1.0 - (1.0 - uTop0) * (1.0 - uTop0)))) * topReturnFlareZ;
            const flare1 = (1.0 - Math.sqrt(Math.max(0, 1.0 - (1.0 - uTop1) * (1.0 - uTop1)))) * topReturnFlareZ;
            const hw0 = rightHalfW + flare0;
            const hw1 = rightHalfW + flare1;

            addUnifiedWalkQuad(
                x0, z0 - hw0,
                x1, z1 - hw1,
                x1, z1 + hw1,
                x0, z0 + hw0
            );
            addUnifiedScoreJoint(x0, z0 - hw0 + 0.08, x0, z0 + hw0 - 0.08, i === 0 ? 0.020 : 0.015);

            // Continuous finished curb along the outer Parking Lot edge (-Z)
            addFinishedEdgeCurb(x0, z0 - hw0, x1, z1 - hw1);
            // Finished curb along the inner Park lawn edge (+Z), leaving a clean opening across the rounded fillet throat [rightEndInX, rightEndOutX]
            const xm = (x0 + x1) * 0.5;
            if (xm < rightEndInX + 0.15 || xm > rightEndOutX - 0.15) {
                addFinishedEdgeCurb(x0, z0 + hw0, x1, z1 + hw1);
            }
        }

        // 4D. Sweeping Oval Courthouse Park Pathway — Welded Flush to 4B & 4C Inner Edges with C1 Rounded Corner Fillets!
        for (let i = 0; i < ovalSegs; i++) {
            const p0 = getOvalSlicePoints(i);
            const p1 = getOvalSlicePoints(i + 1);

            addUnifiedWalkQuad(
                p0.inX, p0.inZ,
                p1.inX, p1.inZ,
                p1.outX, p1.outZ,
                p0.outX, p0.outZ
            );

            // Transverse expansion score joints along the Oval Pathway + header joints at both welded ends
            if (i === 0) {
                addUnifiedScoreJoint(p0.inX, p0.inZ, p0.outX, p0.outZ, 0.020);
            } else {
                addUnifiedScoreJoint(p0.inX, p0.inZ, p0.outX, p0.outZ, 0.015);
            }
            if (i === ovalSegs - 1) {
                addUnifiedScoreJoint(p1.inX, p1.inZ, p1.outX, p1.outZ, 0.020);
            }

            // Finished concrete edge curbs along the Outer (+X) and Inner (-X) edges of the Oval Pathway (including rounded corner fillets!)
            addFinishedEdgeCurb(p0.outX, p0.outZ, p1.outX, p1.outZ);
            // On the inner (-X) edge of the Oval Pathway, leave an opening across the Monumental Stairs walkway + fillets (lz = -0.86m .. +9.82m)
            const midInZ = (p0.inZ + p1.inZ) * 0.5;
            if (midInZ < promMinZ - filletSpanZ || midInZ > promMaxZ + filletSpanZ) {
                addFinishedEdgeCurb(p0.inX, p0.inZ, p1.inX, p1.inZ);
            }
        }

        const parkWalkGeo = new THREE.BufferGeometry();
        parkWalkGeo.setAttribute('position', new THREE.Float32BufferAttribute(walkPos, 3));
        parkWalkGeo.computeVertexNormals();
        const parkWalkMesh = new THREE.Mesh(parkWalkGeo, parkConcreteMat);
        parkWalkMesh.name = 'Building350_ContouredParkWalkways';
        parkWalkMesh.receiveShadow = true;
        parkWalkMesh.castShadow = true;
        arch.add(parkWalkMesh);

        const parkCurbGeo = new THREE.BufferGeometry();
        parkCurbGeo.setAttribute('position', new THREE.Float32BufferAttribute(curbPos, 3));
        parkCurbGeo.computeVertexNormals();
        const parkCurbMesh = new THREE.Mesh(parkCurbGeo, curbTrimMat);
        parkCurbMesh.name = 'Building350_ContouredParkWalkwayCurbs';
        parkCurbMesh.receiveShadow = true;
        parkCurbMesh.castShadow = true;
        arch.add(parkCurbMesh);

        const parkJointGeo = new THREE.BufferGeometry();
        parkJointGeo.setAttribute('position', new THREE.Float32BufferAttribute(jointPos, 3));
        parkJointGeo.computeVertexNormals();
        const parkJointMesh = new THREE.Mesh(parkJointGeo, scoreJointMat);
        parkJointMesh.name = 'Building350_ContouredParkWalkwayJoints';
        arch.add(parkJointMesh);

        // 4E. Contoured Top-Arc Grass Lawns (Left & Right of Monumental Stairs Walkway 4A)
        //     Fills the entire top arc region between Building 350 / Building 401 South Sidewalk and the
        //     inner (-X) edge of the Oval Pathway (4D) + 1.0m rounded corners, flowing smoothly with the terrain!
        const topArcGrassPos = [];
        const topArcGrassMat = createLumaGrassMaterial({
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
        topArcGrassMat.side = THREE.DoubleSide;

        // Precompute the exact inner (-X) polyline of the Oval Pathway (4D) so we can interpolate xOvalIn(z) at any z
        const ovalInnerPts = [];
        for (let i = 0; i <= ovalSegs; i++) {
            const p = getOvalSlicePoints(i);
            ovalInnerPts.push({ x: p.inX, z: p.inZ });
        }
        const interpOvalInnerX = (z) => {
            if (z >= ovalInnerPts[0].z) return ovalInnerPts[0].x;
            if (z <= ovalInnerPts[ovalSegs].z) return ovalInnerPts[ovalSegs].x;
            for (let i = 0; i < ovalSegs; i++) {
                const z0 = ovalInnerPts[i].z;
                const z1 = ovalInnerPts[i + 1].z;
                if ((z <= z0 && z >= z1) || (z >= z0 && z <= z1)) {
                    const span = z1 - z0;
                    const t = Math.abs(span) > 1e-5 ? (z - z0) / span : 0;
                    return THREE.MathUtils.lerp(ovalInnerPts[i].x, ovalInnerPts[i + 1].x, t);
                }
            }
            return getOvalInnerXAtZ(z);
        };

        // Exact outer (+X, park-ward) boundary of the Top-Arc Grass at any z (hugs the 1.0m stair fillets & Oval Pathway inner edge)
        const getTopArcOuterX = (z) => {
            const xOv = interpOvalInnerX(z);
            if (z >= promMaxZ && z <= promMaxZ + filletSpanZ) {
                const u = (z - promMaxZ) / filletSpanZ;
                const curve = Math.sqrt(Math.max(0, 1.0 - (1.0 - u) * (1.0 - u)));
                return THREE.MathUtils.lerp(filletStartLeftX, xOv, curve);
            }
            if (z <= promMinZ && z >= promMinZ - filletSpanZ) {
                const u = (promMinZ - z) / filletSpanZ;
                const curve = Math.sqrt(Math.max(0, 1.0 - (1.0 - u) * (1.0 - u)));
                return THREE.MathUtils.lerp(filletStartRightX, xOv, curve);
            }
            return xOv;
        };

        // Exact inner (-X, building-ward) boundary of the Top-Arc Grass at any z
        const getTopArcInnerX = (z) => {
            if (z >= promMaxZ) {
                if (z <= frontZ) return getParkCurbX(z);
                if (z <= 39.25) return 12.50;
                return 22.15;
            }
            if (z >= -17.425) return getParkCurbX(z);
            if (z >= -18.05) {
                const u = (-17.425 - z) / (18.05 - 17.425);
                return THREE.MathUtils.lerp(getParkCurbX(-17.425), 20.78, u);
            }
            return 20.78;
        };

        const getTopArcGrassY = (lx, lz) => getParkWalkY(lx, lz) - 0.032;

        const addTopArcLawnBand = (zSegments, xCols, isLeftSide) => {
            for (let iz = 0; iz < zSegments.length - 1; iz++) {
                const zaRaw = zSegments[iz];
                const zbRaw = zSegments[iz + 1];
                const xInA = getTopArcInnerX(zaRaw);
                const xInB = getTopArcInnerX(zbRaw);
                const xOutA = Math.max(xInA + 0.05, getTopArcOuterX(zaRaw));
                const xOutB = Math.max(xInB + 0.05, getTopArcOuterX(zbRaw));

                for (let ix = 0; ix < xCols; ix++) {
                    const t0 = ix / xCols;
                    const t1 = (ix + 1) / xCols;
                    const x00 = THREE.MathUtils.lerp(xInA, xOutA, t0);
                    const x10 = THREE.MathUtils.lerp(xInA, xOutA, t1);
                    const x01 = THREE.MathUtils.lerp(xInB, xOutB, t0);
                    const x11 = THREE.MathUtils.lerp(xInB, xOutB, t1);

                    // Clamp z against the Left Straight Sidewalk (4B) or Right Straight Walkway (4C) inner edge
                    const z00 = isLeftSide ? Math.min(zaRaw, getLeftInnerZ(x00)) : Math.max(zaRaw, getRightInnerZ(x00));
                    const z10 = isLeftSide ? Math.min(zaRaw, getLeftInnerZ(x10)) : Math.max(zaRaw, getRightInnerZ(x10));
                    const z01 = isLeftSide ? Math.min(zbRaw, getLeftInnerZ(x01)) : Math.max(zbRaw, getRightInnerZ(x01));
                    const z11 = isLeftSide ? Math.min(zbRaw, getLeftInnerZ(x11)) : Math.max(zbRaw, getRightInnerZ(x11));

                    const y00 = getTopArcGrassY(x00, z00);
                    const y10 = getTopArcGrassY(x10, z10);
                    const y01 = getTopArcGrassY(x01, z01);
                    const y11 = getTopArcGrassY(x11, z11);

                    // Counter-clockwise winding viewed from +Y so face normals point +Y
                    pushQuad(
                        topArcGrassPos,
                        x00, y00, z00,
                        x01, y01, z01,
                        x11, y11, z11,
                        x10, y10, z10
                    );
                }
            }
        };

        // Build Z-breakpoint array for Left Top-Arc Lawn (z = promMaxZ -> leftP2In.z) including exact step boundaries
        const leftZStops = [];
        for (let s = 0; s <= filletSegs; s++) {
            leftZStops.push(promMaxZ + (s / filletSegs) * filletSpanZ);
        }
        const leftMidSteps = 18;
        for (let s = 1; s <= leftMidSteps; s++) {
            leftZStops.push(THREE.MathUtils.lerp(promMaxZ + filletSpanZ, frontZ, s / leftMidSteps));
        }
        const leftPlazaSteps = 14;
        for (let s = 1; s <= leftPlazaSteps; s++) {
            leftZStops.push(THREE.MathUtils.lerp(frontZ, 39.25, s / leftPlazaSteps));
        }
        const leftEndSteps = 8;
        for (let s = 1; s <= leftEndSteps; s++) {
            leftZStops.push(THREE.MathUtils.lerp(39.25, ovalInnerPts[0].z, s / leftEndSteps));
        }
        addTopArcLawnBand(leftZStops, 16, true);

        // Build Z-breakpoint array for Right Top-Arc Lawn (z = ovalInnerPts[ovalSegs].z -> promMinZ)
        const rightZStops = [];
        const rightOuterSteps = 16;
        for (let s = 0; s <= rightOuterSteps; s++) {
            rightZStops.push(THREE.MathUtils.lerp(ovalInnerPts[ovalSegs].z, -18.05, s / rightOuterSteps));
        }
        rightZStops.push(-17.425);
        const rightWallSteps = 18;
        for (let s = 1; s <= rightWallSteps; s++) {
            rightZStops.push(THREE.MathUtils.lerp(-17.425, promMinZ - filletSpanZ, s / rightWallSteps));
        }
        for (let s = 1; s <= filletSegs; s++) {
            rightZStops.push((promMinZ - filletSpanZ) + (s / filletSegs) * filletSpanZ);
        }
        addTopArcLawnBand(rightZStops, 16, false);

        const topArcGrassGeo = new THREE.BufferGeometry();
        topArcGrassGeo.setAttribute('position', new THREE.Float32BufferAttribute(topArcGrassPos, 3));
        topArcGrassGeo.computeVertexNormals();
        ensurePlanarGrassUVs(topArcGrassGeo, 0.45);
        const topArcGrassMesh = new THREE.Mesh(topArcGrassGeo, topArcGrassMat);
        topArcGrassMesh.name = 'Building350_TopArcContouredGrass';
        topArcGrassMesh.receiveShadow = true;
        topArcGrassMesh.castShadow = false;
        arch.add(topArcGrassMesh);
    }

    // =========================================================================
    // 5. PARK-FACING 401–350 SKYBRIDGE, RECESSED GRID-JOINTED CONCRETE CORE WALL,
    //    TWO-TIER DARK-BRONZE & BLACK GLASS ENTRANCE VESTIBULE, AND SLOPED
    //    BRUSHED-CONCRETE ADA WALKWAY / RAMP WITH DOUBLE-RAIL DARK PIPE HANDRAILS,
    //    US FLAG & WHITE A-FRAME SIGN
    //    Modeled directly from ea374598.jpg, 780f317e.jpg, 9c4bd790.jpg, 6496ecdd.jpg, 207f8d8c.jpg & ac388739.jpg!
    // =========================================================================
    {
        const connMinZ = -24.65;  // Building 401's East brick wall in 350 local coords
        const connMaxZ = -17.425; // Building 350's Rear NW wall in 350 local coords
        const connSpanZ = connMaxZ - connMinZ; // 7.225m
        const connMidZ = (connMinZ + connMaxZ) * 0.5; // -21.0375m

        const precastSkyMat = new THREE.MeshStandardMaterial({
            color: '#d5d2ca',
            roughness: 0.76,
            metalness: 0.05
        });
        const precastJointDarkMat = new THREE.MeshStandardMaterial({
            color: '#6e6c66',
            roughness: 0.85
        });
        const soffitDarkMat = new THREE.MeshStandardMaterial({
            color: '#8c8982',
            roughness: 0.82
        });
        const blackVestFrameMat = new THREE.MeshStandardMaterial({
            color: '#1c2024',
            roughness: 0.35,
            metalness: 0.65
        });
        const silverFasciaMat = new THREE.MeshStandardMaterial({
            color: '#b4bcc2',
            roughness: 0.38,
            metalness: 0.58
        });
        const ceilingTrofferMat = new THREE.MeshStandardMaterial({
            color: '#f8fafc',
            emissive: '#e6f0ff',
            emissiveIntensity: 0.85,
            roughness: 0.25
        });

        // 5A. Elevated 3-Panel Light-Grey Precast Concrete Skybridge (ea374598.jpg, 780f317e.jpg, 9c4bd790.jpg, 6496ecdd.jpg, 207f8d8c.jpg!)
        //     - Spans lz = -24.65m .. -17.425m (7.225m) between Building 350's Rear Pavilion pilaster and Building 401's brick wall
        //     - Recessed slightly behind Building 350's Rear Pavilion pilaster (lx = +6.35m .. +9.95m, depth = 3.60m)
        //     - Bottom soffit at y = +4.65m (aligned with top of Floor 2 rusticated granite belt course!), top at y = +11.85m (mid-Floor 4!)
        const skyMinX = 6.35;
        const skyMaxX = 9.95;
        const skyDepthX = skyMaxX - skyMinX; // 3.60m
        const skyMidX = (skyMinX + skyMaxX) * 0.5; // +8.15m
        const skyBotY = 4.65;
        const skyTopY = 11.85;
        const skyH = skyTopY - skyBotY; // 7.20m
        const skyMidY = (skyBotY + skyTopY) * 0.5; // +8.25m

        const skyBody = new THREE.Mesh(
            new THREE.BoxGeometry(skyDepthX, skyH, connSpanZ + 0.08),
            precastSkyMat
        );
        skyBody.position.set(skyMidX, skyMidY, connMidZ);
        skyBody.castShadow = true;
        skyBody.receiveShadow = true;
        arch.add(skyBody);

        // Dark underside soffit slab of the skybridge (780f317e.jpg, 6496ecdd.jpg)
        const skySoffit = new THREE.Mesh(
            new THREE.BoxGeometry(skyDepthX - 0.04, 0.08, connSpanZ + 0.08),
            soffitDarkMat
        );
        skySoffit.position.set(skyMidX, skyBotY + 0.03, connMidZ);
        arch.add(skySoffit);

        // Top metal coping cap along the skybridge roof edge (ea374598.jpg, 780f317e.jpg)
        const skyCoping = new THREE.Mesh(
            new THREE.BoxGeometry(skyDepthX + 0.08, 0.12, connSpanZ + 0.12),
            silverFasciaMat
        );
        skyCoping.position.set(skyMidX, skyTopY + 0.05, connMidZ);
        arch.add(skyCoping);

        // Two Crisp Vertical Panel Expansion Joints dividing the Skybridge into 3 Equal Vertical Panels on Front, Back & Underside Soffit (ea374598.jpg, 780f317e.jpg, 6496ecdd.jpg!)
        [connMinZ + connSpanZ / 3, connMinZ + (connSpanZ * 2) / 3].forEach((jz) => {
            const frontGroove = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, skyH + 0.04, 0.065),
                precastJointDarkMat
            );
            frontGroove.position.set(skyMaxX + 0.01, skyMidY, jz);
            arch.add(frontGroove);

            const backGroove = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, skyH + 0.04, 0.065),
                precastJointDarkMat
            );
            backGroove.position.set(skyMinX - 0.01, skyMidY, jz);
            arch.add(backGroove);

            const soffitGroove = new THREE.Mesh(
                new THREE.BoxGeometry(skyDepthX + 0.02, 0.04, 0.065),
                precastJointDarkMat
            );
            soffitGroove.position.set(skyMidX, skyBotY - 0.01, jz);
            arch.add(soffitGroove);
        });

        // 5B. Open Vestibule Interior (middle core wall removed so the vestibule between 401 and 350 is unobstructed)
        const coreWallX = 2.85;

        // 5C. Two-Tier Dark-Bronze / Black Glass Entrance Vestibule under the Skybridge (780f317e.jpg, 9c4bd790.jpg, 6496ecdd.jpg!)
        const topTerrY = Math.max(
            sampleLocalY(5.45, -23.50, -0.36),
            sampleLocalY(5.45, -21.15, -0.36),
            sampleLocalY(5.45, -18.05, -0.36)
        );
        const vestFloorY = Math.max(0.08, topTerrY + 0.14); // Guaranteed above terrain across the entire vestibule gap
        const leftVestMinZ = -21.05;
        const leftVestMaxZ = connMaxZ; // -17.425m (Building 350 side)
        const leftVestSpanZ = leftVestMaxZ - leftVestMinZ; // 3.625m
        const leftVestMidZ = (leftVestMinZ + leftVestMaxZ) * 0.5; // -19.2375m
        const leftVestFrontX = 5.45;
        const leftVestTopY = vestFloorY + 3.48;
        const leftVestH = leftVestTopY - vestFloorY; // 3.48m

        // Continuous open vestibule interior floor slab spanning across the connector corridor
        const vestOpenFloor = new THREE.Mesh(
            new THREE.BoxGeometry(11.80, 0.14, connSpanZ - 0.08),
            concreteWalkMat
        );
        vestOpenFloor.position.set(0.0, vestFloorY - 0.05, connMidZ);
        vestOpenFloor.receiveShadow = true;
        arch.add(vestOpenFloor);

        // Vestibule roof, canopy fascia, doors & curtain-wall glazing (hidden during floor cutaway so vestibule floor connects cleanly to Treasurer 1/4 zone)
        const vestCoverGroup = new THREE.Group();
        vestCoverGroup.userData.hideOnCutaway = true;
        arch.add(vestCoverGroup);

        // Tier 1 (Left / Building 350 Side): 1-Story Glass Entrance Vestibule with Double Glass Doors, Silver Canopy Fascia & 3-Lite Transom (6496ecdd.jpg!)
        const leftVestDepthX = leftVestFrontX - coreWallX; // 2.60m
        const leftVestRoof = new THREE.Mesh(
            new THREE.BoxGeometry(leftVestDepthX + 0.12, 0.14, leftVestSpanZ),
            blackVestFrameMat
        );
        leftVestRoof.position.set(coreWallX + leftVestDepthX * 0.5, leftVestTopY - 0.07, leftVestMidZ);
        leftVestRoof.castShadow = true;
        vestCoverGroup.add(leftVestRoof);

        const vestThreshold = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.08, leftVestSpanZ + 0.04),
            concreteWalkMat
        );
        vestThreshold.position.set(leftVestFrontX - 0.02, vestFloorY + 0.02, leftVestMidZ);
        arch.add(vestThreshold);

        // Front glazing plane of Left Vestibule (lx = +5.44m, proud of vestInteriorBox!)
        const leftVestGlass = new THREE.Mesh(
            new THREE.PlaneGeometry(leftVestSpanZ - 0.12, leftVestH - 0.14),
            glassMat
        );
        leftVestGlass.rotation.y = Math.PI * 0.5;
        leftVestGlass.position.set(leftVestFrontX + 0.015, vestFloorY + leftVestH * 0.5, leftVestMidZ);
        vestCoverGroup.add(leftVestGlass);

        // Silver/light-grey horizontal aluminum canopy fascia band at vestFloorY + 2.49m (6496ecdd.jpg!)
        const canopyY = vestFloorY + 2.49;
        const canopyBand = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.22, leftVestSpanZ + 0.06),
            silverFasciaMat
        );
        canopyBand.position.set(leftVestFrontX + 0.05, canopyY, leftVestMidZ);
        canopyBand.castShadow = true;
        vestCoverGroup.add(canopyBand);

        // Black vertical mullions & double glass entrance door stiles on Left Vestibule (6496ecdd.jpg)
        const vDoorH = canopyY - vestFloorY - 0.10;
        [leftVestMinZ + 0.06, -19.95, -19.05, -18.15, leftVestMaxZ - 0.06].forEach((mz, idx) => {
            const isDoorCenter = idx === 2;
            const mH = isDoorCenter ? vDoorH : leftVestH;
            const mY = isDoorCenter ? (vestFloorY + mH * 0.5) : (vestFloorY + leftVestH * 0.5);
            const mull = new THREE.Mesh(
                new THREE.BoxGeometry(0.10, mH, isDoorCenter ? 0.12 : 0.085),
                blackVestFrameMat
            );
            mull.position.set(leftVestFrontX + 0.01, mY, mz);
            vestCoverGroup.add(mull);
        });

        // Distinct black aluminum double-door bottom kickplate rails & top door header rails (lz = -19.95m .. -18.15m)
        [-19.50, -18.60].forEach((dzDoor, dIdx) => {
            const kickRail = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.24, 0.82),
                blackVestFrameMat
            );
            kickRail.position.set(leftVestFrontX + 0.015, vestFloorY + 0.14, dzDoor);
            vestCoverGroup.add(kickRail);

            const topDoorRail = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.11, 0.82),
                blackVestFrameMat
            );
            topDoorRail.position.set(leftVestFrontX + 0.015, canopyY - 0.15, dzDoor);
            vestCoverGroup.add(topDoorRail);

            // Inner vertical door leaf stiles
            [-0.36, 0.36].forEach((szOff) => {
                const leafStile = new THREE.Mesh(
                    new THREE.BoxGeometry(0.075, vDoorH, 0.065),
                    blackVestFrameMat
                );
                leafStile.position.set(leftVestFrontX + 0.015, vestFloorY + vDoorH * 0.5, dzDoor + szOff);
                vestCoverGroup.add(leafStile);
            });

            // Silver push bars & vertical pull handles on the double entrance doors
            const pushBar = new THREE.Mesh(
                new THREE.BoxGeometry(0.05, 0.04, 0.68),
                silverFasciaMat
            );
            pushBar.position.set(leftVestFrontX + 0.06, vestFloorY + 1.02, dzDoor);
            vestCoverGroup.add(pushBar);

            const handleZ = dIdx === 0 ? dzDoor + 0.28 : dzDoor - 0.28;
            const pullHandle = new THREE.Mesh(
                new THREE.CylinderGeometry(0.014, 0.014, 0.36, 8),
                silverFasciaMat
            );
            pullHandle.position.set(leftVestFrontX + 0.07, vestFloorY + 1.12, handleZ);
            vestCoverGroup.add(pullHandle);
        });

        // Forward-stepped left side glass bay against Building 350's rear wall (lx = +5.45m .. +6.60m, lz = -17.95m .. -17.425m, 6496ecdd.jpg!)
        const sideBayBox = new THREE.Mesh(
            new THREE.BoxGeometry(1.15, 2.48, 0.52),
            blackVestFrameMat
        );
        sideBayBox.position.set(6.02, vestFloorY + 1.24, connMaxZ - 0.26);
        vestCoverGroup.add(sideBayBox);

        // Grey rectangular trash/ash receptacle bin standing in front of the left side bay (6496ecdd.jpg!)
        const trashBin = new THREE.Mesh(
            new THREE.BoxGeometry(0.46, 0.86, 0.44),
            new THREE.MeshStandardMaterial({ color: '#8a8e92', roughness: 0.6, metalness: 0.25 })
        );
        trashBin.position.set(6.78, vestFloorY + 0.43, connMaxZ - 0.34);
        trashBin.castShadow = true;
        arch.add(trashBin);

        // Tier 2 (Right / Building 401 Side): Taller 1.5-Story Black-Framed Glass Lobby Box (lz = -24.65m .. -21.05m, 780f317e.jpg & 6496ecdd.jpg!)
        const rightVestMinZ = connMinZ; // -24.65m
        const rightVestMaxZ = -21.05;
        const rightVestSpanZ = rightVestMaxZ - rightVestMinZ; // 3.60m
        const rightVestMidZ = (rightVestMinZ + rightVestMaxZ) * 0.5; // -22.85m
        const rightVestFrontX = 5.88;
        const rightVestTopY = 4.38;
        const rightVestH = rightVestTopY - vestFloorY;
        const rightVestDepthX = rightVestFrontX - coreWallX; // 3.03m

        // Projecting black architectural metal roof overhang on Right Lobby Box (780f317e.jpg, 6496ecdd.jpg!)
        const rightRoof = new THREE.Mesh(
            new THREE.BoxGeometry(rightVestDepthX + 0.42, 0.24, rightVestSpanZ + 0.12),
            blackVestFrameMat
        );
        rightRoof.position.set(coreWallX + (rightVestDepthX + 0.42) * 0.5, rightVestTopY - 0.12, rightVestMidZ);
        rightRoof.castShadow = true;
        vestCoverGroup.add(rightRoof);

        // Front & North-East (+Z return) glass curtain walls of Right Lobby Box
        const rightFrontGlass = new THREE.Mesh(
            new THREE.PlaneGeometry(rightVestSpanZ - 0.10, rightVestH - 0.24),
            glassMat
        );
        rightFrontGlass.rotation.y = Math.PI * 0.5;
        rightFrontGlass.position.set(rightVestFrontX - 0.02, vestFloorY + (rightVestH - 0.24) * 0.5, rightVestMidZ);
        vestCoverGroup.add(rightFrontGlass);

        // Glowing white interior ceiling light troffer panels visible through the upper glazing (780f317e.jpg, 6496ecdd.jpg!)
        [-23.55, -22.15].forEach((tz) => {
            const troffer = new THREE.Mesh(
                new THREE.BoxGeometry(1.45, 0.06, 0.85),
                ceilingTrofferMat
            );
            troffer.position.set(rightVestFrontX - 1.10, rightVestTopY - 0.32, tz);
            vestCoverGroup.add(troffer);
        });

        // Black curtain-wall mullions & horizontal transom bars on Right Lobby Box
        [rightVestMinZ + 0.06, -23.45, -22.25, rightVestMaxZ - 0.04].forEach((mz) => {
            const mull = new THREE.Mesh(
                new THREE.BoxGeometry(0.10, rightVestH, 0.08),
                blackVestFrameMat
            );
            mull.position.set(rightVestFrontX, vestFloorY + rightVestH * 0.5, mz);
            vestCoverGroup.add(mull);
        });
        [canopyY, leftVestTopY].forEach((hy) => {
            const hBar = new THREE.Mesh(
                new THREE.BoxGeometry(0.10, 0.08, rightVestSpanZ),
                blackVestFrameMat
            );
            hBar.position.set(rightVestFrontX, hy, rightVestMidZ);
            vestCoverGroup.add(hBar);
        });

        // 5D. L-Shaped Brushed-Concrete Vestibule ADA Pathway & 90° Right Turn into Building 401's South Sidewalk
        //     Modeled directly from 7bf95406.jpg, 6496ecdd.jpg, 9c4bd790.jpg, 207f8d8c.jpg & ac388739.jpg!
        //     - Leg 1 (Vestibule Ramp): lx = +5.45m .. +17.90m, lz = -21.15m .. -18.05m (width = 3.10m)
        //     - Corner & Leg 2 (90° Turn to Building 401 South Sidewalk): lx = +17.90m .. +20.80m (matches 401's lz = -16.20m .. -19.10m!),
        //       turning right from lz = -18.05m across -21.15m to lz = -24.65m (where it meets Building 401's South Sidewalk at lx_401 = +51.70m!)
        const rampStartX = leftVestFrontX; // +5.45m (at vestibule double doors)
        const turnInnerX = 17.90;          // Inner corner of the L-turn (matches 401 South Sidewalk inner edge lz_401 = -16.20m!)
        const turnOuterX = 20.80;          // Outer corner of the L-turn (matches 401 South Sidewalk outer edge lz_401 = -19.10m!)
        const rampLenX = turnInnerX - rampStartX; // 12.45m
        const rampMinZ = -21.15;
        const rampMaxZ = -18.05;
        const rampW = rampMaxZ - rampMinZ; // 3.10m
        const rampMidZ = (rampMinZ + rampMaxZ) * 0.5; // -19.60m
        const rampSegs = 9;
        const rSegLen = rampLenX / rampSegs;

        // Elevation at a given x along Leg 1, guaranteed above terrain on both sides so terrain never clips through!
        const getCornerY = (cx, cz) => {
            const ty = Math.max(
                sampleLocalY(cx, cz, -0.80),
                sampleLocalY(cx, rampMinZ, -0.80),
                sampleLocalY(cx, rampMaxZ, -0.80)
            );
            return ty + 0.14;
        };
        const cornerTargetY = getCornerY(turnInnerX, rampMidZ);

        const getRampY = (rx) => {
            const t = THREE.MathUtils.clamp((rx - rampStartX) / rampLenX, 0, 1);
            const interpY = THREE.MathUtils.lerp(vestFloorY, cornerTargetY, t);
            const localTerrMax = Math.max(
                sampleLocalY(rx, rampMinZ, -0.80),
                sampleLocalY(rx, rampMidZ, -0.80),
                sampleLocalY(rx, rampMaxZ, -0.80)
            );
            return Math.max(interpY, localTerrMax + 0.14);
        };

        const vestEdgeCurbMat = new THREE.MeshStandardMaterial({
            color: '#f2eee6',
            roughness: 0.75,
            metalness: 0.04,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        });

        // Leg 1: Straight Sloped Walkway from Vestibule Doors (lx = +5.45m) to L-Turn Inner Edge (lx = +17.90m)
        for (let i = 0; i < rampSegs; i++) {
            const x0 = rampStartX + i * rSegLen;
            const x1 = rampStartX + (i + 1) * rSegLen;
            const xm = (x0 + x1) * 0.5;
            const y0 = getRampY(x0);
            const y1 = getRampY(x1);
            const ym = (y0 + y1) * 0.5;
            const segSlope = Math.atan2(y1 - y0, rSegLen);

            const rSlab = new THREE.Mesh(
                new THREE.BoxGeometry(rSegLen + 0.04, 0.42, rampW),
                concreteWalkMat
            );
            rSlab.rotation.z = segSlope;
            rSlab.position.set(xm, ym - 0.21, rampMidZ);
            rSlab.receiveShadow = true;
            rSlab.castShadow = true;
            arch.add(rSlab);

            // Finished #f2eee6 edge curbs along both sides of Leg 1
            [rampMaxZ - 0.07, rampMinZ + 0.07].forEach((cz) => {
                const cSeg = new THREE.Mesh(
                    new THREE.BoxGeometry(rSegLen + 0.04, 0.032, 0.14),
                    vestEdgeCurbMat
                );
                cSeg.rotation.z = segSlope;
                cSeg.position.set(xm, ym + 0.008, cz);
                arch.add(cSeg);
            });

            // Transverse control joint across the concrete walkway (6496ecdd.jpg!)
            if (i > 0) {
                const tJoint = new THREE.Mesh(
                    new THREE.BoxGeometry(0.028, 0.014, rampW - 0.12),
                    scoreJointMat
                );
                tJoint.position.set(x0, y0 + 0.005, rampMidZ);
                arch.add(tJoint);
            }

            // Longitudinal center expansion joint down the middle of the concrete walkway (6496ecdd.jpg!)
            const cJoint = new THREE.Mesh(
                new THREE.BoxGeometry(rSegLen + 0.02, 0.014, 0.028),
                scoreJointMat
            );
            cJoint.rotation.z = segSlope;
            cJoint.position.set(xm, ym + 0.005, rampMidZ);
            arch.add(cJoint);

            // Continuous 3-Rail Dark Pipe Handrails along BOTH Left (lz = -18.12m) & Right (lz = -21.08m) sides of Leg 1
            [rampMaxZ - 0.07, rampMinZ + 0.07].forEach((rz) => {
                const post = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.022, 0.022, 0.94, 8),
                    darkGreenRailMat
                );
                post.position.set(x0, y0 + 0.47, rz);
                post.castShadow = true;
                arch.add(post);

                [0.92, 0.58, 0.24].forEach((rH) => {
                    const rail = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.020, 0.020, rSegLen + 0.04, 8),
                        darkGreenRailMat
                    );
                    rail.rotation.z = Math.PI * 0.5 + segSlope;
                    rail.position.set(xm, ym + rH, rz);
                    rail.castShadow = true;
                    arch.add(rail);
                });
            });
        }

        // L-Corner & Leg 2: 90° Right-Turn Pathway (lx = +17.90m .. +20.80m, lz = -18.05m .. -24.65m)
        // Connects Leg 1 seamlessly into Building 401's South Sidewalk at lz = -24.65m (lx_401 = +51.70m), as marked in 7bf95406.jpg!
        const turnWidthX = turnOuterX - turnInnerX; // 2.90m (exact width of 401 South Sidewalk!)
        const turnMidX = (turnInnerX + turnOuterX) * 0.5; // +19.35m
        const turnStartZ = rampMaxZ; // -18.05m (outer left edge of Leg 1)
        const turnEndZ = connMinZ;   // -24.65m (meets 401 South Sidewalk at lx_401 = +51.70m)
        const turnSpanZ = turnStartZ - turnEndZ; // 6.60m
        const turnSegs = 5;
        const tSegD = turnSpanZ / turnSegs;

        const getTurnY = (tz) => {
            // At z >= rampMinZ (-21.15m), match cornerTargetY so the L-corner is flush with the bottom of Leg 1;
            // from z = -21.15m to -24.65m, conform smoothly to sampleLocalY(turnMidX, tz) + 0.14m (exact match to 401 South Sidewalk!)
            const rawTerrY = Math.max(
                sampleLocalY(turnInnerX, tz, -0.80),
                sampleLocalY(turnMidX, tz, -0.80),
                sampleLocalY(turnOuterX, tz, -0.80)
            ) + 0.14;
            if (tz >= rampMinZ) {
                return Math.max(cornerTargetY, rawTerrY);
            }
            const u = THREE.MathUtils.clamp((rampMinZ - tz) / (rampMinZ - turnEndZ), 0, 1);
            return THREE.MathUtils.lerp(Math.max(cornerTargetY, rawTerrY), rawTerrY, u);
        };

        for (let j = 0; j < turnSegs; j++) {
            const z0 = turnStartZ - j * tSegD;
            const z1 = turnStartZ - (j + 1) * tSegD;
            const zm = (z0 + z1) * 0.5;
            const y0 = getTurnY(z0);
            const y1 = getTurnY(z1);
            const ym = (y0 + y1) * 0.5;
            const zSlope = Math.atan2(y1 - y0, tSegD);

            const tSlab = new THREE.Mesh(
                new THREE.BoxGeometry(turnWidthX, 0.42, tSegD + 0.04),
                concreteWalkMat
            );
            tSlab.rotation.x = zSlope;
            tSlab.position.set(turnMidX, ym - 0.21, zm);
            tSlab.receiveShadow = true;
            tSlab.castShadow = true;
            arch.add(tSlab);

            // Finished #f2eee6 edge curbs along the Outer (+X = 20.73m) & Inner (-X = 17.97m below L-corner) edges of Leg 2
            const cOut = new THREE.Mesh(
                new THREE.BoxGeometry(0.14, 0.032, tSegD + 0.04),
                vestEdgeCurbMat
            );
            cOut.rotation.x = zSlope;
            cOut.position.set(turnOuterX - 0.07, ym + 0.008, zm);
            arch.add(cOut);
            if (zm < rampMinZ) {
                const cIn = new THREE.Mesh(
                    new THREE.BoxGeometry(0.14, 0.032, tSegD + 0.04),
                    vestEdgeCurbMat
                );
                cIn.rotation.x = zSlope;
                cIn.position.set(turnInnerX + 0.07, ym + 0.008, zm);
                arch.add(cIn);
            }

            if (j > 0) {
                const jLine = new THREE.Mesh(
                    new THREE.BoxGeometry(turnWidthX - 0.12, 0.014, 0.028),
                    scoreJointMat
                );
                jLine.position.set(turnMidX, y0 + 0.005, z0);
                arch.add(jLine);
            }

            // Outer Corner Extension of Left Handrail along lz = -18.12m from lx = 17.90m to lx = 20.72m (j === 0)
            if (j === 0) {
                const extLen = (turnOuterX - 0.08) - turnInnerX;
                const extMidX = (turnInnerX + turnOuterX - 0.08) * 0.5;
                const extY = y0;
                [turnInnerX, turnOuterX - 0.08].forEach((px) => {
                    const cPost = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.94, 8), darkGreenRailMat);
                    cPost.position.set(px, extY + 0.47, rampMaxZ - 0.07);
                    cPost.castShadow = true;
                    arch.add(cPost);
                });
                [0.92, 0.58, 0.24].forEach((rH) => {
                    const extRail = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, extLen + 0.04, 8), darkGreenRailMat);
                    extRail.rotation.z = Math.PI * 0.5;
                    extRail.position.set(extMidX, extY + rH, rampMaxZ - 0.07);
                    extRail.castShadow = true;
                    arch.add(extRail);
                });
                // Inner corner post where the right handrail of Leg 1 turns 90° right at (turnInnerX + 0.08, rampMinZ + 0.07)
                const inCornerPost = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.94, 8), darkGreenRailMat);
                inCornerPost.position.set(turnInnerX + 0.08, getTurnY(rampMinZ) + 0.47, rampMinZ + 0.07);
                inCornerPost.castShadow = true;
                arch.add(inCornerPost);
            }

            // Outer Handrail along lx = +20.72m (runs across all 5 segments from lz = -18.12m to lz = -24.65m)
            {
                const rxOut = turnOuterX - 0.08;
                const pOut = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.94, 8), darkGreenRailMat);
                pOut.position.set(rxOut, y1 + 0.47, z1);
                pOut.castShadow = true;
                arch.add(pOut);
                [0.92, 0.58, 0.24].forEach((rH) => {
                    const rOut = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, tSegD + 0.04, 8), darkGreenRailMat);
                    rOut.rotation.x = Math.PI * 0.5 + zSlope;
                    rOut.position.set(rxOut, ym + rH, zm);
                    rOut.castShadow = true;
                    arch.add(rOut);
                });
            }

            // Inner Handrail along lx = +17.98m (runs from the inner L-corner lz = -21.08m to lz = -24.65m)
            if (zm < rampMinZ) {
                const rxIn = turnInnerX + 0.08;
                const pIn = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.94, 8), darkGreenRailMat);
                pIn.position.set(rxIn, y1 + 0.47, z1);
                pIn.castShadow = true;
                arch.add(pIn);
                [0.92, 0.58, 0.24].forEach((rH) => {
                    const rIn = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, tSegD + 0.04, 8), darkGreenRailMat);
                    rIn.rotation.x = Math.PI * 0.5 + zSlope;
                    rIn.position.set(rxIn, ym + rH, zm);
                    rIn.castShadow = true;
                    arch.add(rIn);
                });
            }
        }

        // 5E. Small US Flag on Vertical Pole mounted on the Right Handrail near the Vestibule (lx = +10.25m, lz = -21.08m, 6496ecdd.jpg & 45990f7d.jpg!)
        if (usFlagMat) {
            const fx = 10.25;
            const fz = rampMinZ + 0.07;
            const fy = getRampY(fx);
            const flagPole = new THREE.Mesh(
                new THREE.CylinderGeometry(0.016, 0.018, 1.95, 8),
                silverFasciaMat
            );
            flagPole.position.set(fx, fy + 0.975, fz);
            arch.add(flagPole);

            const smallFlag = new THREE.Mesh(
                new THREE.PlaneGeometry(0.55, 0.92, 14, 8),
                usFlagMat
            );
            smallFlag.position.set(fx + 0.12, fy + 1.42, fz);
            smallFlag.rotation.z = -0.18;
            smallFlag.castShadow = true;
            smallFlag.userData = {
                isAnimatedFlag: true,
                flagWidth: 0.55,
                flagHeight: 0.92,
                hoistSide: -1,
                phaseOffset: 2.4,
                droop: -0.02,
                ampZ: 0.045,
                ampY: 0.012
            };
            arch.add(smallFlag);
        }

        // 5F. White A-Frame Sandwich Board Sign beside the Left Handrail (lx = +14.55m, lz = -17.45m, 9c4bd790.jpg!)
        {
            const ax = 14.55;
            const az = -17.45;
            const ay = sampleLocalY(ax, az, -1.25) + 0.04;
            const aFrameMat = new THREE.MeshStandardMaterial({ color: '#f4f5f7', roughness: 0.45 });
            [-0.18, 0.18].forEach((dx, idx) => {
                const board = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.86, 0.56), aFrameMat);
                board.rotation.z = idx === 0 ? -0.22 : 0.22;
                board.position.set(ax + dx, ay + 0.41, az);
                board.castShadow = true;
                arch.add(board);
            });
        }

        // 5G. Dark-Mulched Planting Beds Flanking Both Sides of the Vestibule ADA Walkway (6496ecdd.jpg!)
        //     - Left narrow mulch bed between left handrail (-18.05m) and Building 350's Rear Pavilion granite wall (-17.425m)
        const leftRampMulch = new THREE.Mesh(
            new THREE.BoxGeometry(4.60, 0.42, 0.62),
            darkMulchMat
        );
        leftRampMulch.position.set(7.85, getRampY(7.85) - 0.19, -17.74);
        leftRampMulch.receiveShadow = true;
        arch.add(leftRampMulch);

        [6.80, 7.75, 8.70, 9.55].forEach((hx) => {
            const clump = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 1), hostaLeafMat);
            clump.scale.set(1.2, 0.5, 1.0);
            clump.position.set(hx, getRampY(hx) + 0.08, -17.74);
            arch.add(clump);
        });

        //     - Right wide mulch bed between right handrail (-21.15m) and Building 401's East/South corner (-24.65m, 6496ecdd.jpg!)
        const rightRampMulch = new THREE.Mesh(
            new THREE.BoxGeometry(11.90, 0.45, 3.45),
            darkMulchMat
        );
        const rmY = Math.max(sampleLocalY(11.85, -22.88, -0.60), getRampY(11.85) - 0.08);
        rightRampMulch.position.set(11.85, rmY - 0.18, -22.88);
        rightRampMulch.receiveShadow = true;
        arch.add(rightRampMulch);
    }
}

/**
 * Twin Fluted Dark-Green Classical Cast-Iron Post Lantern on Monumental Park Stair Cheek Walls
 * Modeled directly from close-up photos 3e77aa21.jpg, ac388739.jpg & e637f636.jpg!
 */
function buildFlutedParkPostLantern(parent, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);

    const ironMat = new THREE.MeshStandardMaterial({
        color: '#2b3e34',
        roughness: 0.40,
        metalness: 0.65
    });
    const frostedGlassMat = new THREE.MeshStandardMaterial({
        color: '#e8ecea',
        emissive: '#ffe6a3',
        emissiveIntensity: 0.42,
        roughness: 0.24
    });
    frostedGlassMat.userData = {
        isNightLitLantern: true,
        baseEmissive: 0.42,
        maxEmissive: 2.9,
        nightEmissiveHex: '#ffe6a3'
    };

    // 1. Octagonal / Bell-Shaped Foliate Cast-Iron Base (3e77aa21.jpg, ac388739.jpg)
    const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.08, 8), ironMat);
    basePlinth.position.y = 0.04;
    g.add(basePlinth);

    const baseBell = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.18, 0.24, 12), ironMat);
    baseBell.position.y = 0.20;
    baseBell.castShadow = true;
    g.add(baseBell);

    // 2. Fluted Tapered Cast-Iron Column Shaft (12 flutes, height = 1.18m, ac388739.jpg!)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.095, 1.18, 12), ironMat);
    shaft.position.y = 0.91;
    shaft.castShadow = true;
    g.add(shaft);

    // Molded capital collar ring at top of fluted shaft
    const capCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.10, 8), ironMat);
    capCollar.position.y = 1.54;
    g.add(capCollar);

    // 3. 4-Sided Trapezoidal Frosted-Glass Lantern Head with Dark-Green Corner Ribs & Pyramid Cap (3e77aa21.jpg, ac388739.jpg)
    const glassHead = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.13, 0.44, 4), frostedGlassMat);
    glassHead.rotation.y = Math.PI * 0.25;
    glassHead.position.y = 1.81;
    g.add(glassHead);

    for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.46, 0.024), ironMat);
        rib.position.set(Math.cos(ang) * 0.155, 1.81, Math.sin(ang) * 0.155);
        g.add(rib);
    }

    const roofRim = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.04, 4), ironMat);
    roofRim.rotation.y = Math.PI * 0.25;
    roofRim.position.y = 2.05;
    g.add(roofRim);

    const roofCap = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.18, 4), ironMat);
    roofCap.rotation.y = Math.PI * 0.25;
    roofCap.position.y = 2.16;
    g.add(roofCap);

    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 8), ironMat);
    finial.position.y = 2.30;
    g.add(finial);

    parent.add(g);
}

/**
 * Ornate Dark-Green Hexagonal Cast-Iron Pedestal Lantern (4ee09d25.jpg, 79f8f182.jpg)
 */
function buildHexagonalPedestalLantern(parent, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);

    const ironMat = new THREE.MeshStandardMaterial({
        color: '#23362b',
        roughness: 0.42,
        metalness: 0.65
    });
    const frostedGlassMat = new THREE.MeshStandardMaterial({
        color: '#e8ecea',
        emissive: '#ffe6a3',
        emissiveIntensity: 0.40,
        roughness: 0.25
    });
    frostedGlassMat.userData = {
        isNightLitLantern: true,
        baseEmissive: 0.40,
        maxEmissive: 2.9,
        nightEmissiveHex: '#ffe6a3'
    };

    // Octagonal/hexagonal base plinth + fluted post shaft
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.20, 0.24, 6), ironMat);
    base.position.y = 0.12;
    g.add(base);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 1.05, 8), ironMat);
    shaft.position.y = 0.74;
    shaft.castShadow = true;
    g.add(shaft);

    // Hexagonal lantern cage & frosted glass panels (4ee09d25.jpg)
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.09, 0.12, 6), ironMat);
    collar.position.y = 1.30;
    g.add(collar);

    const glassBody = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.15, 0.42, 6), frostedGlassMat);
    glassBody.position.y = 1.56;
    g.add(glassBody);

    // 6 dark-green vertical corner ribs on the hexagonal lantern
    for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.44, 0.025), ironMat);
        rib.position.set(Math.cos(ang) * 0.175, 1.56, Math.sin(ang) * 0.175);
        g.add(rib);
    }

    // Tiered hexagonal roof cap + finial
    const capRim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 6), ironMat);
    capRim.position.y = 1.79;
    g.add(capRim);

    const capDome = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.20, 6), ironMat);
    capDome.position.y = 1.91;
    g.add(capDome);

    parent.add(g);
}

/**
 * 3-Rail Galvanized Pipe Handrail along concrete steps
 */
function buildStairPipeHandrail(parent, x, zStart, yStart, zEnd, yEnd, mat) {
    const dz = zEnd - zStart;
    const dy = yEnd - yStart;
    const len = Math.hypot(dz, dy);
    const slopeAng = Math.atan2(-dy, dz);
    const midZ = (zStart + zEnd) * 0.5;
    const midY = (yStart + yEnd) * 0.5;

    // 3 sloped horizontal rails (top, mid, lower — matching 79f8f182.jpg)
    [0.92, 0.56, 0.22].forEach((railH) => {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, len, 8), mat);
        rail.rotation.x = Math.PI * 0.5 + slopeAng;
        rail.position.set(x, midY + railH, midZ);
        rail.castShadow = true;
        parent.add(rail);
    });

    // Vertical pipe posts
    const numPosts = Math.max(3, Math.round(Math.abs(dz) / 2.2) + 1);
    for (let i = 0; i < numPosts; i++) {
        const t = i / (numPosts - 1);
        const pz = THREE.MathUtils.lerp(zStart, zEnd, t);
        const py = THREE.MathUtils.lerp(yStart, yEnd, t);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.94, 8), mat);
        post.position.set(x, py + 0.47, pz);
        post.castShadow = true;
        parent.add(post);
    }
}

