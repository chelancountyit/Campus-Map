import * as THREE from 'three';
import { buildWashingtonStreetCorridor } from './WashingtonStreetCorridor.js';
import { createLumaGrassMaterial } from '../../materials/GrassMaterial.js';

/**
 * Building 401 (Law & Justice / Regional Justice Center, 401 Washington St) —
 * Washington St Two-Tone Sidewalk, Utility Compounds, Crosswalks & South Lawn Grounds
 *
 * Modeled directly from reference photographs:
 * - 7871898b.jpg, e4286399.jpg, 7099590c.jpg, 785542cb.jpg (Overhead views of Washington St sidewalk configuration)
 * - f17b4121.jpg, f0a3a41e.jpg, 109ba9fd.jpg (Street-level views of Washington St sidewall & sidewalk)
 * - 358e2515.jpg, 4fd0b292.jpg, c71d2af9.jpg (Aerial views of South curved lawn, Evidence Room corner, SE patio & walkways)
 */
export function buildBuilding401GroundsAndSidewalks(arch, mats, yGrade) {
    const {
        brickWallMat,
        concretePlinthMat,
        copingDarkMat,
        redBrickPaverMat,
        concreteSidewalkMat,
        whiteConcreteApronMat,
        curbMat,
        whiteCurbMat,
        yellowCurbMat,
        tactilePadMat,
        basaltGravelMat,
        peaGravelMat,
        tanFenceSlatMat,
        chainLinkGateMat,
        blackMetalMat,
        silverMetalMat,
        whiteMetalMat,
        tealGeneratorMat,
        tealLouverTopMat,
        oliveTransformerMat,
        yellowGreenBoxMat,
        fireHydrantRedMat,
        uspsBlueMat,
        concreteBenchMat,
        shrubGreenMat,
        directoryWoodMat,
        directoryBoardMat,
        pedCrossingSignMat,
        noParkingSignMat,
        crosswalkWhiteMat
    } = mats;

    const addBox = (w, h, d, x, y, z, mat, parent = arch) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    };

    const addGradedQuad = (x0, z0, x1, z1, x2, z2, x3, z3, yOff, mat, drop = 0.34) => {
        const lift = yOff + 0.04; // Extra +4cm clearance above the 4m terrain mesh facets so walkways never submerge!
        const y0 = yGrade(x0, z0) + lift;
        const y1 = yGrade(x1, z1) + lift;
        const y2 = yGrade(x2, z2) + lift;
        const y3 = yGrade(x3, z3) + lift;
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
        const uvs = new Float32Array([
            ax * 0.25, az * 0.25,  bx * 0.25, bz * 0.25,  cx * 0.25, cz * 0.25,
            ax * 0.25, az * 0.25,  cx * 0.25, cz * 0.25,  dx * 0.25, dz * 0.25,
            0, 1,  0, 0,  1, 0,   0, 1,  1, 0,  1, 1,
            0, 1,  0, 0,  1, 0,   0, 1,  1, 0,  1, 1,
            0, 1,  0, 0,  1, 0,   0, 1,  1, 0,  1, 1,
            0, 1,  0, 0,  1, 0,   0, 1,  1, 0,  1, 1
        ]);
        geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        const m = new THREE.Mesh(geo, mat);
        m.receiveShadow = true;
        m.castShadow = true;
        arch.add(m);
        return m;
    };

    const wallZ = 17.85;
    const curbZ = 24.85;
    const jointMat = new THREE.MeshBasicMaterial({
        color: '#9c9588',
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3
    });

    // =========================================================================
    // ZONE 1: WEST SALLYPORT ALCOVE, CHAIN-LINK DOUBLE GATE & BRICK CHEEK WALL
    //         (lx = -13.85m .. -12.00m, 8f231f9e.jpg, 27a5ce33.jpg & f17b4121.jpg)
    // =========================================================================
    {
        const gateMinX = -13.85, gateMaxX = -12.00;
        const gateZ = 20.95;
        const gy = yGrade(-12.92, gateZ);

        // Concrete apron inside the sallyport gate alcove
        addGradedQuad(
            gateMinX, wallZ - 0.50,
            gateMaxX, wallZ - 0.50,
            gateMaxX, gateZ + 0.15,
            gateMinX, gateZ + 0.15,
            0.08,
            concreteSidewalkMat
        );

        // Galvanized chain-link double gate spanning lx = -13.85m .. -12.18m at lz = 20.95m (8f231f9e.jpg, 27a5ce33.jpg)
        const gateW = gateMaxX - gateMinX - 0.18;
        const gateH = 1.95;
        const gateCX = (gateMinX + gateMaxX - 0.18) * 0.5;
        addBox(gateW, gateH, 0.04, gateCX, gy + gateH * 0.5 + 0.08, gateZ, chainLinkGateMat);
        for (const px of [gateMinX + 0.04, gateCX, gateMaxX - 0.22]) {
            addBox(0.06, gateH + 0.10, 0.06, px, gy + gateH * 0.5 + 0.08, gateZ, silverMetalMat);
        }
        addBox(gateW, 0.05, 0.06, gateCX, gy + gateH + 0.08, gateZ, silverMetalMat);
        addBox(gateW, 0.05, 0.06, gateCX, gy + 0.14, gateZ, silverMetalMat);

        // Red-Brown Brick Cheek Wing Wall on the east side of the chain-link gate (lx = -12.00m, lz = 17.85m .. 20.95m, 8f231f9e.jpg, 27a5ce33.jpg!)
        const wingD = 3.10;
        const wingH = 2.05;
        addBox(0.36, wingH, wingD, -12.00, gy + wingH * 0.5 + 0.05, wallZ + wingD * 0.5, brickWallMat);
        addBox(0.44, 0.09, wingD + 0.08, -12.00, gy + wingH + 0.09, wallZ + wingD * 0.5, concretePlinthMat);
    }

    // =========================================================================
    // ZONE 2: DARK BASALT GRAVEL BED, YELLOW-GREEN UTILITY BOX & WEST SIDEWALK
    //         (lx = -12.00m .. -0.80m, e4286399.jpg, 7871898b.jpg, f17b4121.jpg)
    // =========================================================================
    {
        const gravMinX = -12.00, gravMaxX = -0.80;
        const gravInnerZ = wallZ; // 17.85m
        const gravOuterZ = 21.45;

        // Dark charcoal/black crushed basalt gravel landscape bed (e4286399.jpg top-right)
        const gravSegs = 6;
        for (let i = 0; i < gravSegs; i++) {
            const xA = gravMinX + (i / gravSegs) * (gravMaxX - gravMinX);
            const xB = gravMinX + ((i + 1) / gravSegs) * (gravMaxX - gravMinX);
            addGradedQuad(
                xA, gravInnerZ,
                xB, gravInnerZ,
                xB, gravOuterZ,
                xA, gravOuterZ,
                0.07,
                basaltGravelMat
            );
        }

        // Outer Concrete Sidewalk Panels from lx = -13.85m (connecting flush to West Wing Sallyport sidewalk) to lx = -0.80m
        const wSidewalkMinX = -13.85, wSidewalkMaxX = -0.80;
        const wSidewalkSegs = 7;
        for (let i = 0; i < wSidewalkSegs; i++) {
            const xA = wSidewalkMinX + (i / wSidewalkSegs) * (wSidewalkMaxX - wSidewalkMinX);
            const xB = wSidewalkMinX + ((i + 1) / wSidewalkSegs) * (wSidewalkMaxX - wSidewalkMinX);
            const innerZ = xA < -11.95 ? 20.95 : gravOuterZ;
            addGradedQuad(
                xA, innerZ,
                xB, innerZ,
                xB, curbZ,
                xA, curbZ,
                0.09,
                concreteSidewalkMat
            );
            const jY = yGrade(xB, (innerZ + curbZ) * 0.5) + 0.136;
            addBox(0.035, 0.02, curbZ - innerZ - 0.08, xB, jY, (innerZ + curbZ) * 0.5, jointMat);

            const xm = (xA + xB) * 0.5;
            const cY = yGrade(xm, curbZ) + 0.095;
            addBox(xB - xA + 0.02, 0.14, 0.18, xm, cY, curbZ + 0.06, curbMat);
        }

        // Rectangular utility vault grate in the concrete sidewalk at lx = -6.80m (e4286399.jpg)
        const gY = yGrade(-6.80, 22.65) + 0.136;
        addBox(1.10, 0.02, 0.85, -6.80, gY, 22.65, copingDarkMat);

        // No Parking sign on metal post near curb at lx = -5.60m, lz = 24.45m (e4286399.jpg, f0a3a41e.jpg)
        const npX = -5.60, npZ = 24.40;
        const npY = yGrade(npX, npZ) + 0.09;
        const npPole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 2.25, 8), silverMetalMat);
        npPole.position.set(npX, npY + 1.125, npZ);
        arch.add(npPole);
        addBox(0.34, 0.46, 0.02, npX, npY + 2.05, npZ, noParkingSignMat);
    }

    // =========================================================================
    // ZONE 3: TAN-SLATTED CHAIN-LINK GENERATOR/CHILLER SECURITY COMPOUND
    //         (lx = -0.80m .. +13.60m, lz = +17.85m .. +21.55m)
    //         Modeled from e4286399.jpg, 7871898b.jpg, f0a3a41e.jpg & 109ba9fd.jpg
    // =========================================================================
    {
        const fMinX = -0.80, fMaxX = 13.60;
        const fW = fMaxX - fMinX; // 14.40m
        const fCX = (fMinX + fMaxX) * 0.5; // +6.40m
        const fMinZ = wallZ; // 17.85m
        const fMaxZ = 21.55;
        const fD = fMaxZ - fMinZ; // 3.70m
        const fCZ = (fMinZ + fMaxZ) * 0.5; // +19.70m

        // Concrete compound pad inside the security fence
        const padSegs = 6;
        for (let i = 0; i < padSegs; i++) {
            const xA = fMinX + (i / padSegs) * fW;
            const xB = fMinX + ((i + 1) / padSegs) * fW;
            addGradedQuad(
                xA, fMinZ,
                xB, fMinZ,
                xB, fMaxZ,
                xA, fMaxZ,
                0.085,
                concreteSidewalkMat
            );
        }

        const fenceH = 2.38;
        // Street-facing (+Z) Tan-Slatted Fence Panels & Black-Framed Double Gate (f0a3a41e.jpg, e4286399.jpg)
        const frontPanels = [
            { x0: -0.80, x1: 1.60, isGate: false },
            { x0: 1.60,  x1: 4.00, isGate: false },
            { x0: 4.00,  x1: 5.55, isGate: true },  // Left gate leaf
            { x0: 5.55,  x1: 7.10, isGate: true },  // Right gate leaf
            { x0: 7.10,  x1: 10.35, isGate: false },
            { x0: 10.35, x1: 13.60, isGate: false }
        ];

        for (const p of frontPanels) {
            const pw = p.x1 - p.x0;
            const px = (p.x0 + p.x1) * 0.5;
            const py = yGrade(px, fMaxZ) + 0.09;
            addBox(pw - 0.06, fenceH - 0.06, 0.045, px, py + fenceH * 0.5, fMaxZ, tanFenceSlatMat);
            // Top & bottom black steel horizontal rails
            addBox(pw, 0.045, 0.065, px, py + fenceH - 0.02, fMaxZ, blackMetalMat);
            addBox(pw, 0.045, 0.065, px, py + 0.05, fMaxZ, blackMetalMat);
            // Vertical black steel post at x0
            const post = new THREE.Mesh(
                new THREE.CylinderGeometry(p.isGate ? 0.045 : 0.038, p.isGate ? 0.045 : 0.038, fenceH + 0.14, 10),
                blackMetalMat
            );
            post.position.set(p.x0, py + (fenceH + 0.14) * 0.5, fMaxZ);
            post.castShadow = true;
            arch.add(post);
        }
        // Final east corner post at fMaxX
        {
            const py = yGrade(fMaxX, fMaxZ) + 0.09;
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, fenceH + 0.14, 10), blackMetalMat);
            post.position.set(fMaxX, py + (fenceH + 0.14) * 0.5, fMaxZ);
            post.castShadow = true;
            arch.add(post);
        }

        // West (-X at fMinX) & East (+X at fMaxX) Return Fence Walls (e4286399.jpg, 7871898b.jpg)
        for (const rx of [fMinX, fMaxX]) {
            const ry = yGrade(rx, fCZ) + 0.09;
            addBox(0.045, fenceH - 0.06, fD - 0.06, rx, ry + fenceH * 0.5, fCZ, tanFenceSlatMat);
            addBox(0.065, 0.045, fD, rx, ry + fenceH - 0.02, fCZ, blackMetalMat);
            addBox(0.065, 0.045, fD, rx, ry + 0.05, fCZ, blackMetalMat);
            for (const rz of [fMinZ + 0.08, fCZ]) {
                const sPost = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, fenceH + 0.14, 10), blackMetalMat);
                sPost.position.set(rx, ry + (fenceH + 0.14) * 0.5, rz);
                arch.add(sPost);
            }
        }

        // Low Red-Brown Brick Screen Wall with 2 Rectangular Louver Vents at the East end of the compound (lx = +13.25m, 7871898b.jpg & e4286399.jpg!)
        const bWallX = fMaxX - 0.22;
        const bWallY = yGrade(bWallX, 19.15) + 0.09;
        const bWallD = 2.55; // lz = 17.85m .. 20.40m
        const bWallH = 2.15;
        addBox(0.36, bWallH, bWallD, bWallX, bWallY + bWallH * 0.5, wallZ + bWallD * 0.5, brickWallMat);
        addBox(0.42, 0.08, bWallD + 0.06, bWallX, bWallY + bWallH + 0.04, wallZ + bWallD * 0.5, concretePlinthMat);
        // 2 small rectangular vents near the top of the east brick screen wall (visible in 7871898b.jpg)
        for (const vz of [18.55, 19.75]) {
            addBox(0.40, 0.22, 0.36, bWallX, bWallY + bWallH - 0.32, vz, copingDarkMat);
        }

        // Large Bright Teal-Green Standby Generator / Chiller Unit inside the compound (7871898b.jpg, e4286399.jpg)
        const genX = 6.95, genZ = 20.05;
        const genY = yGrade(genX, genZ) + 0.09;
        const genW = 6.60, genH = 2.12, genD = 1.98;
        addBox(genW + 0.30, 0.16, genD + 0.30, genX, genY + 0.08, genZ, whiteConcreteApronMat);
        const genMaterials = [
            tealGeneratorMat, // +X
            tealGeneratorMat, // -X
            tealLouverTopMat, // +Y (top with dark exhaust radiator grilles!)
            tealGeneratorMat, // -Y
            tealGeneratorMat, // +Z
            tealGeneratorMat  // -Z
        ];
        const genMesh = new THREE.Mesh(new THREE.BoxGeometry(genW, genH, genD), genMaterials);
        genMesh.position.set(genX, genY + 0.16 + genH * 0.5, genZ);
        genMesh.castShadow = true;
        genMesh.receiveShadow = true;
        arch.add(genMesh);

        // White Electrical Transfer / Switch Cabinet behind the Teal Generator against the 401 wall (7871898b.jpg, e4286399.jpg)
        const cabX = 5.10, cabZ = 18.45;
        const cabY = yGrade(cabX, cabZ) + 0.09;
        addBox(2.25, 0.16, 1.05, cabX, cabY + 0.08, cabZ, whiteConcreteApronMat);
        addBox(1.95, 1.55, 0.85, cabX, cabY + 0.16 + 0.775, cabZ, whiteMetalMat);

        // Outer Concrete Sidewalk in front of the Fence Compound (lx = -0.80m .. +13.60m, lz = +21.55m .. +24.85m)
        const cWalkSegs = 8;
        for (let i = 0; i < cWalkSegs; i++) {
            const xA = fMinX + (i / cWalkSegs) * fW;
            const xB = fMinX + ((i + 1) / cWalkSegs) * fW;
            addGradedQuad(
                xA, fMaxZ,
                xB, fMaxZ,
                xB, curbZ,
                xA, curbZ,
                0.09,
                concreteSidewalkMat
            );
            const jY = yGrade(xB, (fMaxZ + curbZ) * 0.5) + 0.136;
            addBox(0.035, 0.02, curbZ - fMaxZ - 0.08, xB, jY, (fMaxZ + curbZ) * 0.5, jointMat);

            const xm = (xA + xB) * 0.5;
            const cY = yGrade(xm, curbZ) + 0.095;
            addBox(xB - xA + 0.02, 0.14, 0.18, xm, cY, curbZ + 0.06, curbMat);
        }
    }

    // =========================================================================
    // ZONE 4: WHITE-CURBED CONCRETE UTILITY BAY (lx = +13.60m .. +20.40m, lz = +17.85m .. +20.45m)
    //         Olive-Green Transformer, Red Fire Hydrant, Silver Switchboard Cabinet & Wall Fire Bell
    //         Modeled from 7871898b.jpg, e4286399.jpg & 109ba9fd.jpg
    // =========================================================================
    {
        const uMinX = 13.60, uMaxX = 20.40;
        const uW = uMaxX - uMinX; // 6.80m
        const uCX = (uMinX + uMaxX) * 0.5; // +17.00m
        const uMinZ = wallZ; // 17.85m
        const uMaxZ = 20.45;
        const uD = uMaxZ - uMinZ; // 2.60m
        const uCZ = (uMinZ + uMaxZ) * 0.5; // +19.15m

        // Concrete utility bay slab
        addGradedQuad(
            uMinX, uMinZ,
            uMaxX, uMinZ,
            uMaxX, uMaxZ,
            uMinX, uMaxZ,
            0.085,
            concreteSidewalkMat
        );

        // Crisp white concrete border curb along the front (+Z at uMaxZ) & east (+X at uMaxX) edges of the utility bay (7871898b.jpg!)
        const uyFront = yGrade(uCX, uMaxZ) + 0.09;
        addBox(uW + 0.16, 0.08, 0.18, uCX, uyFront + 0.02, uMaxZ, whiteCurbMat);
        const uyEast = yGrade(uMaxX, uCZ) + 0.09;
        addBox(0.18, 0.08, uD + 0.16, uMaxX, uyEast + 0.02, uCZ, whiteCurbMat);

        // 1) Olive-Green Double-Door Pad-Mounted Electrical Transformer on the left (lx = +15.10m, lz = +19.35m, 7871898b.jpg & 109ba9fd.jpg)
        const trX = 15.10, trZ = 19.35;
        const trY = yGrade(trX, trZ) + 0.09;
        addBox(1.85, 0.16, 1.65, trX, trY + 0.08, trZ, whiteConcreteApronMat);
        addBox(1.62, 1.48, 1.42, trX, trY + 0.16 + 0.74, trZ, oliveTransformerMat);
        // Center door seam on olive transformer
        addBox(0.03, 1.38, 1.45, trX, trY + 0.16 + 0.74, trZ, copingDarkMat);

        // 2) Red Fire Hydrant in the center of the utility bay (lx = +17.35m, lz = +19.55m, 7871898b.jpg & 109ba9fd.jpg!)
        const fhX = 17.35, fhZ = 19.55;
        const fhY = yGrade(fhX, fhZ) + 0.09;
        const hydBody = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.76, 12), fireHydrantRedMat);
        hydBody.position.set(fhX, fhY + 0.38, fhZ);
        hydBody.castShadow = true;
        arch.add(hydBody);
        const hydBonnet = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), fireHydrantRedMat);
        hydBonnet.position.set(fhX, fhY + 0.76, fhZ);
        arch.add(hydBonnet);
        const hydNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.32, 10), fireHydrantRedMat);
        hydNozzle.rotation.z = Math.PI / 2;
        hydNozzle.position.set(fhX, fhY + 0.52, fhZ);
        arch.add(hydNozzle);

        // 3) Silver/Grey Stainless Switchboard & Meter Cabinet against the 401 brick wall (lx = +18.75m, lz = +18.25m, 7871898b.jpg & 109ba9fd.jpg)
        const swX = 18.75, swZ = 18.25;
        const swY = yGrade(swX, swZ) + 0.09;
        addBox(1.85, 1.32, 0.46, swX, swY + 0.92, swZ, silverMetalMat);
        addBox(0.08, 0.45, 0.32, swX - 0.75, swY + 0.225, swZ, silverMetalMat);
        addBox(0.08, 0.45, 0.32, swX + 0.75, swY + 0.225, swZ, silverMetalMat);

        // 4) Red Wall-Mounted Fire Alarm Gong/Strobe on the 401 brick wall above the utility bay (109ba9fd.jpg)
        const gong = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 14), fireHydrantRedMat);
        gong.rotation.x = Math.PI / 2;
        gong.position.set(17.20, swY + 2.85, wallZ + 0.05);
        arch.add(gong);
    }

    // =========================================================================
    // ZONE 5: TWO-TONE RED-BRICK PAVER INNER PROMENADE + CONCRETE OUTER SIDEWALK
    //         + PEA-GRAVEL STRIP, 3 CONCRETE BENCHES, DIRECTORY CASE, 6 BLACK BOLLARDS,
    //         PEDESTRIAN CROSSING SIGN & BLUE USPS MAILBOX
    //         (lx = +13.60m .. +58.85m, modeled from 7871898b.jpg, 7099590c.jpg & 109ba9fd.jpg!)
    // =========================================================================
    {
        const promMinX = 13.60;
        const promMaxX = 58.85; // Connects directly to Building 350's Washington St sidewalk at lx = +58.84m!
        const gravelOuterZ = 18.68;
        const brickOuterZ = 22.55;
        const whiteApronMinX = 35.80, whiteApronMaxX = 42.95; // 2x4 White Concrete Crosswalk Apron aligned with NE Crosswalk (lx = 39.69m) & Speed Table edge (lx = 42.95m)
        const whiteApronInnerZ = 21.65;

        // 5A. Narrow Pea-Gravel Border Strip along the base of Building 401's brick wall (lx = +20.40m .. +51.70m, lz = +17.85m .. +18.68m, 7871898b.jpg)
        const gStripSegs = 12;
        for (let i = 0; i < gStripSegs; i++) {
            const xA = 20.40 + (i / gStripSegs) * (51.70 - 20.40);
            const xB = 20.40 + ((i + 1) / gStripSegs) * (51.70 - 20.40);
            addGradedQuad(
                xA, wallZ,
                xB, wallZ,
                xB, gravelOuterZ,
                xA, gravelOuterZ,
                0.08,
                peaGravelMat
            );
            const xm = (xA + xB) * 0.5;
            const cy = yGrade(xm, gravelOuterZ) + 0.09;
            addBox(xB - xA + 0.02, 0.04, 0.10, xm, cy, gravelOuterZ, curbMat);
        }

        // 5B. Running-Bond Red-Brick Paver Inner Promenade (lx = +13.60m .. +51.70m) & Outer Concrete Sidewalk Band (lx = +13.60m .. +58.85m)
        const segCount = 24;
        for (let i = 0; i < segCount; i++) {
            const xA = promMinX + (i / segCount) * (promMaxX - promMinX);
            const xB = promMinX + ((i + 1) / segCount) * (promMaxX - promMinX);
            const xm = (xA + xB) * 0.5;

            const inWhiteApron = xm > whiteApronMinX && xm < whiteApronMaxX;
            const outerBrickZ = inWhiteApron ? whiteApronInnerZ : brickOuterZ;

            // Red-Brick Paver Inner Band stops cleanly at Building 401's East brick wall (lx = +51.70m, media_1794271546977_6613a6a1.jpg & media_1794271635668_a9d4584b.jpg!)
            if (xA < 51.70) {
                const bxA = xA;
                const bxB = Math.min(xB, 51.70);
                const bxm = (bxA + bxB) * 0.5;
                const innerBrickZ = bxm < 20.40 ? 20.45 : gravelOuterZ;
                addGradedQuad(
                    bxA, innerBrickZ,
                    bxB, innerBrickZ,
                    bxB, outerBrickZ,
                    bxA, outerBrickZ,
                    0.09,
                    redBrickPaverMat
                );
            }

            // Outer Concrete Sidewalk Band (from outerBrickZ to curbZ = 24.85m)
            const outerMat = inWhiteApron ? whiteConcreteApronMat : concreteSidewalkMat;
            addGradedQuad(
                xA, outerBrickZ,
                xB, outerBrickZ,
                xB, curbZ,
                xA, curbZ,
                0.092,
                outerMat
            );

            // Transverse control joint across the outer concrete sidewalk
            const jY = yGrade(xB, (outerBrickZ + curbZ) * 0.5) + 0.138;
            addBox(0.035, 0.02, curbZ - outerBrickZ - 0.06, xB, jY, (outerBrickZ + curbZ) * 0.5, jointMat);

            // Street Curb along lz = curbZ (aligned with SW Crosswalk at lx=22.55m & NE Crosswalk at lx=39.69m)
            const isYellowCurb = xm >= 40.50 && xm <= 44.20;
            const isCrosswalkCut = (xm >= 20.80 && xm <= 24.30) || (xm >= 36.80 && xm <= 42.20);
            const curbH = isCrosswalkCut ? 0.04 : 0.14;
            const cY = yGrade(xm, curbZ) + curbH * 0.5 + 0.035;
            addBox(xB - xA + 0.02, curbH, 0.18, xm, cY, curbZ + 0.06, isYellowCurb ? yellowCurbMat : curbMat);
        }

        // 5B-2. 3-Column Concrete Breezeway Entrance Walkway in front of & underneath the 3×3 Precast Connector Bridge
        //       (lx = +51.70m .. +58.35m, lz = +8.50m .. +22.55m, media_1794271546977_6613a6a1.jpg, media_1794271635668_a9d4584b.jpg & media_1794271665627_a0514665.jpg!)
        {
            const bwMinX = 51.70, bwMaxX = 58.35;
            const bwMinZ = 8.50, bwMaxZ = brickOuterZ; // +22.55m
            const bwCols = 3;
            const bwRows = 6;
            for (let c = 0; c < bwCols; c++) {
                const cx0 = THREE.MathUtils.lerp(bwMinX, bwMaxX, c / bwCols);
                const cx1 = THREE.MathUtils.lerp(bwMinX, bwMaxX, (c + 1) / bwCols);
                const cxm = (cx0 + cx1) * 0.5;
                for (let r = 0; r < bwRows; r++) {
                    const cz0 = THREE.MathUtils.lerp(bwMinZ, bwMaxZ, r / bwRows);
                    const cz1 = THREE.MathUtils.lerp(bwMinZ, bwMaxZ, (r + 1) / bwRows);
                    addGradedQuad(
                        cx0, cz0,
                        cx1, cz0,
                        cx1, cz1,
                        cx0, cz1,
                        0.092,
                        concreteSidewalkMat
                    );
                    if (r > 0) {
                        const rjY = yGrade(cxm, cz0) + 0.138;
                        addBox(cx1 - cx0 - 0.04, 0.02, 0.032, cxm, rjY, cz0, jointMat);
                    }
                }
                // Longitudinal expansion joint between the 3 concrete walkway columns
                if (c > 0) {
                    for (let r = 0; r < bwRows; r++) {
                        const cz0 = THREE.MathUtils.lerp(bwMinZ, bwMaxZ, r / bwRows);
                        const cz1 = THREE.MathUtils.lerp(bwMinZ, bwMaxZ, (r + 1) / bwRows);
                        const czm = (cz0 + cz1) * 0.5;
                        const cjY = yGrade(cx0, czm) + 0.138;
                        addBox(0.035, 0.02, cz1 - cz0, cx0, cjY, czm, jointMat);
                    }
                }
            }

            // Narrow Dark-Mulch Foundation Strip along the Right Breezeway Wall (lx = +58.35m .. +58.92m, lz = +8.50m .. +17.50m)
            // with the flat brown fieldstone rock at the front corner (media_1794271546977_6613a6a1.jpg!)
            const darkMulchBreezewayMat = new THREE.MeshStandardMaterial({ color: '#2b2520', roughness: 0.95 });
            addGradedQuad(
                58.35, 8.50,
                58.92, 8.50,
                58.92, 17.50,
                58.35, 17.50,
                0.082,
                darkMulchBreezewayMat
            );
            const rockY = yGrade(58.52, 14.10) + 0.09;
            const flatRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 1), directoryWoodMat);
            flatRock.scale.set(1.25, 0.32, 0.95);
            flatRock.position.set(58.52, rockY + 0.05, 14.10);
            arch.add(flatRock);

            // Yellow "SPEED HUMP / 15 MPH" Diamond Sign on Post in front of the 3-column concrete bridge entrance walkway
            // (lx = +54.35m, lz = +22.40m, media_1794271546977_6613a6a1.jpg, media_1794271547080_c00b5cb4.jpg & media_1794271635668_a9d4584b.jpg!)
            const shX = 54.35, shZ = 22.40;
            const shY = yGrade(shX, shZ) + 0.092;
            const shPole = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 2.55, 10), silverMetalMat);
            shPole.position.set(shX, shY + 1.275, shZ);
            shPole.castShadow = true;
            arch.add(shPole);

            const shDiamond = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.025), pedCrossingSignMat);
            shDiamond.rotation.z = Math.PI / 4;
            shDiamond.position.set(shX, shY + 2.32, shZ);
            shDiamond.castShadow = true;
            arch.add(shDiamond);

            const shPlaque = addBox(0.36, 0.42, 0.025, shX, shY + 1.72, shZ, yellowCurbMat);
            shPlaque.castShadow = true;
        }

        // Longitudinal joint down the middle of the 2x4 White Concrete Crosswalk Apron (7099590c.jpg)
        {
            const midZ = (whiteApronInnerZ + curbZ) * 0.5;
            const jY = yGrade((whiteApronMinX + whiteApronMaxX) * 0.5, midZ) + 0.138;
            addBox(whiteApronMaxX - whiteApronMinX, 0.02, 0.035, (whiteApronMinX + whiteApronMaxX) * 0.5, jY, midZ, jointMat);
        }

        // Two Red-Brick Tactile Warning Pads inset into the concrete sidewalk at the exact Crosswalk Landings
        // (lx = 22.55m opposite Building 400's tactile pad, and lx = 39.69m opposite Building 316's tactile pad!)
        for (const tx of [22.55, 39.69]) {
            const ty = yGrade(tx, curbZ - 0.52) + 0.138;
            addBox(1.45, 0.02, 0.68, tx, ty, curbZ - 0.52, tactilePadMat);
        }

        // Small square concrete utility access lid at the corner of the red brick pavers near the utility bay (lx = +20.15m, lz = +20.95m, 7871898b.jpg)
        {
            const lidY = yGrade(20.15, 20.95) + 0.136;
            addBox(0.55, 0.02, 0.55, 20.15, lidY, 20.95, whiteConcreteApronMat);
        }

        // 5C. Six Black Steel Pipe Bollards along the Washington St Curb (proportionally flanking the 22.55m & 39.69m crosswalks along the 19.30m..42.95m speed table)
        const bollardXs = [21.05, 24.15, 28.40, 32.65, 36.90, 41.25];
        for (const bx of bollardXs) {
            const bz = curbZ - 0.45;
            const by = yGrade(bx, bz) + 0.09;
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.96, 14), blackMetalMat);
            post.position.set(bx, by + 0.48, bz);
            post.castShadow = true;
            arch.add(post);
            const cap = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8), blackMetalMat);
            cap.position.set(bx, by + 0.96, bz);
            arch.add(cap);
        }

        // 5D. Yellow Pedestrian Crossing Diamond Sign + Diagonal Arrow Plaque on Post (at lx = +41.85m on the 2x4 white concrete apron)
        {
            const px = 41.85, pz = 24.15;
            const py = yGrade(px, pz) + 0.09;
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 2.55, 10), silverMetalMat);
            pole.position.set(px, py + 1.275, pz);
            pole.castShadow = true;
            arch.add(pole);

            const diamond = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.025), pedCrossingSignMat);
            diamond.rotation.z = Math.PI / 4;
            diamond.position.set(px, py + 2.35, pz);
            diamond.castShadow = true;
            arch.add(diamond);

            const plaque = addBox(0.42, 0.22, 0.025, px, py + 1.85, pz, yellowCurbMat);
            plaque.castShadow = true;
        }

        // 5E. Blue USPS Curbside Drop Mailbox on Rectangular Concrete Pad at the East end of the red brick pavers
        //     (lx = +49.85m, lz = +22.25m, media_1794271688856_e8b00085.jpg, media_1794271635668_a9d4584b.jpg & af9e2178.jpg!)
        {
            const mbX = 49.85, mbZ = 22.25;
            const mbY = yGrade(mbX, mbZ) + 0.094;
            // Rectangular light-grey concrete pad + small storm drain inlet inset into the red brick pavers
            addBox(2.40, 0.025, 0.92, mbX - 0.15, mbY, mbZ, concreteSidewalkMat);
            addBox(0.48, 0.022, 0.48, 51.15, yGrade(51.15, 20.85) + 0.094, 20.85, whiteConcreteApronMat);
            // Blue USPS mailbox body + curved hooded top
            addBox(0.58, 0.92, 0.58, mbX, mbY + 0.46, mbZ, uspsBlueMat);
            const hood = new THREE.Mesh(
                new THREE.CylinderGeometry(0.29, 0.29, 0.58, 14, 1, false, 0, Math.PI),
                uspsBlueMat
            );
            hood.rotation.z = Math.PI / 2;
            hood.position.set(mbX, mbY + 0.92, mbZ);
            hood.castShadow = true;
            arch.add(hood);
        }

        // 5F. Four Precast Concrete Benches, Square East Corner Concrete Bollard Block, Green Shrubs & Covered Directory Case along the Pea-Gravel Border
        //     (7871898b.jpg, 109ba9fd.jpg, media_1794271635668_a9d4584b.jpg & media_1794271665627_a0514665.jpg:
        //      Benches at lx = +22.40m, +27.80m, +37.80m, and +49.15m; Square Corner Block at lx = +51.25m!)
        for (const benchX of [22.40, 27.80, 37.80, 49.15]) {
            const bz = 18.68;
            const by = yGrade(benchX, bz) + 0.09;
            // Concrete seat slab + two concrete support legs
            addBox(1.92, 0.10, 0.52, benchX, by + 0.44, bz, concreteBenchMat);
            addBox(0.18, 0.39, 0.46, benchX - 0.68, by + 0.195, bz, concreteBenchMat);
            addBox(0.18, 0.39, 0.46, benchX + 0.68, by + 0.195, bz, concreteBenchMat);
        }
        // Square aggregate-concrete corner block at the East corner of Building 401's brick wall (lx = +51.25m, lz = +18.35m, media_1794271635668_a9d4584b.jpg!)
        {
            const cbX = 51.25, cbZ = 18.35;
            const cbY = yGrade(cbX, cbZ) + 0.09;
            addBox(0.62, 0.54, 0.62, cbX, cbY + 0.27, cbZ, concreteBenchMat);
        }

        // Small green shrubs & low concrete bollard block between Bench 1 and Bench 2 (lx = +24.60m .. +26.10m, 7871898b.jpg)
        {
            const sy = yGrade(25.20, 18.45) + 0.09;
            addBox(0.28, 0.48, 0.28, 24.55, sy + 0.24, 18.60, concreteBenchMat);
            for (const [sx, sz, sr] of [
                [25.15, 18.42, 0.38],
                [25.85, 18.38, 0.44]
            ]) {
                const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(sr, 1), shrubGreenMat);
                bush.scale.set(1.15, 0.78, 0.95);
                bush.position.set(sx, sy + sr * 0.65, sz);
                bush.castShadow = true;
                arch.add(bush);
            }
        }

        // Covered Outdoor Directory / Bulletin Board Case between Bench 2 & Bench 3 (lx = +32.80m, lz = +18.52m, 7871898b.jpg & 109ba9fd.jpg)
        {
            const dx = 32.80, dz = 18.52;
            const dy = yGrade(dx, dz) + 0.09;
            addBox(0.08, 1.45, 0.08, dx - 0.58, dy + 0.725, dz, directoryWoodMat);
            addBox(0.08, 1.45, 0.08, dx + 0.58, dy + 0.725, dz, directoryWoodMat);
            addBox(1.36, 0.88, 0.12, dx, dy + 1.32, dz, directoryBoardMat);
            addBox(1.48, 0.10, 0.26, dx, dy + 1.80, dz, directoryWoodMat);
        }
    }

    // =========================================================================
    // ZONE 6: WASHINGTON STREET 3D ASPHALT ROADWAY, RAISED CONCRETE SPEED-TABLE
    //         INTERSECTION, TRAFFIC MARKINGS, TURN ARROWS & ASPHALT ADA PARKING
    // =========================================================================
    buildWashingtonStreetCorridor(arch, mats, yGrade);

    // =========================================================================
    // ZONE 7: SOUTH STEPPED LAWN + VOLCANIC LAVA ROCK BED, WHEELCHAIR RAMP,
    //         -1.5 FT SUNKEN COURTYARD & SOUTH SIDEWALK (media_1794267626241_77728cd1.jpg!)
    // =========================================================================
    {
        const turfLawnMat = createLumaGrassMaterial({
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
        const lavaRockMat = new THREE.MeshStandardMaterial({
            color: '#6b3b30',
            roughness: 0.95,
            metalness: 0.03,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
        const boulderMat = new THREE.MeshStandardMaterial({
            color: '#686b6e',
            roughness: 0.88,
            metalness: 0.05
        });
        const bronzeRailMat = new THREE.MeshStandardMaterial({
            color: '#4e4238',
            roughness: 0.45,
            metalness: 0.55
        });

        // Helper for custom 4-corner Y quad with strict upward (+Y) normal check, lowered internal skirt seams & UVs
        const addQuad4Y = (x0, z0, y0, x1, z1, y1, x2, z2, y2, x3, z3, y3, mat, drop = 0.36) => {
            const crossY = (z1 - z0) * (x2 - x0) - (x1 - x0) * (z2 - z0);
            const [ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz] = crossY >= 0
                ? [x0, y0, z0,  x1, y1, z1,  x2, y2, z2,  x3, y3, z3]
                : [x0, y0, z0,  x3, y3, z3,  x2, y2, z2,  x1, y1, z1];
            const sOff = 0.008;
            const pos = new Float32Array([
                // Top surface (strict +Y upward normal)
                ax, ay, az,  bx, by, bz,  cx, cy, cz,
                ax, ay, az,  cx, cy, cz,  dx, dy, dz,
                // 4 outward-facing perimeter skirt walls
                ax, ay - sOff, az,  ax, ay - drop, az,  bx, by - drop, bz,
                ax, ay - sOff, az,  bx, by - drop, bz,  bx, by - sOff, bz,
                bx, by - sOff, bz,  bx, by - drop, bz,  cx, cy - drop, cz,
                bx, by - sOff, bz,  cx, cy - drop, cz,  cx, cy - sOff, cz,
                cx, cy - sOff, cz,  cx, cy - drop, cz,  dx, dy - drop, dz,
                cx, cy - sOff, cz,  dx, dy - drop, dz,  dx, dy - sOff, dz,
                dx, dy - sOff, dz,  dx, dy - drop, dz,  ax, ay - drop, az,
                dx, dy - sOff, dz,  ax, ay - drop, az,  ax, ay - sOff, az
            ]);
            const uvs = new Float32Array([
                ax * 0.25, az * 0.25,  bx * 0.25, bz * 0.25,  cx * 0.25, cz * 0.25,
                ax * 0.25, az * 0.25,  cx * 0.25, cz * 0.25,  dx * 0.25, dz * 0.25,
                0, 1,  0, 0,  1, 0,   0, 1,  1, 0,  1, 1,
                0, 1,  0, 0,  1, 0,   0, 1,  1, 0,  1, 1,
                0, 1,  0, 0,  1, 0,   0, 1,  1, 0,  1, 1,
                0, 1,  0, 0,  1, 0,   0, 1,  1, 0,  1, 1
            ]);
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
            g.computeVertexNormals();
            const m = new THREE.Mesh(g, mat);
            m.castShadow = true;
            m.receiveShadow = true;
            arch.add(m);
            return m;
        };

        const southWallZ = -9.20;
        const lavaStripSouthZ = -11.05; // Brown lava-rock border strip along the building South wall (`lz = -9.20m .. -11.05m`)
        const lawnWestX = -4.10;
        const landingWestX = 22.00;     // Purple ramp landing West edge (`lx = +22.00m`)
        const rampStartX = 26.50;       // Blue wheelchair ramp West start (`lx = +26.50m`)
        const sunkenWestX = 35.60;      // Red 1st-floor ground level West edge (`lx = +35.60m`)
        const sunkenEastX = 51.70;      // Red 1st-floor ground level East edge (`lx = +51.70m`)
        const rampNorthZ = -14.20;
        const walkNorthZ = -16.20;

        // Inner edge along the South building wall is capped at y <= +0.10m so the lower-level window sill (y = +0.15m) is never buried!
        const yBedWall = (x) => Math.min(yGrade(x, southWallZ) + 0.12, 0.10);
        const yBedOuter = (x, z) => yGrade(x, z) + 0.18;
        const yBedWestAt = (x, z) => {
            const tZ = (z - southWallZ) / (walkNorthZ - southWallZ);
            return THREE.MathUtils.lerp(yBedWall(x), yBedOuter(x, walkNorthZ), tZ);
        };
        const yBedEastAt = (x, z) => {
            const tZ = (z - southWallZ) / (rampNorthZ - southWallZ);
            return THREE.MathUtils.lerp(yBedWall(x), yBedOuter(x, rampNorthZ), tZ);
        };

        // ---------------------------------------------------------------------
        // 1) GREEN GRASS LAWN + BROWN VOLCANIC LAVA ROCK BED (lx = -4.10m .. +35.60m, media_1794268854509_b52ec775.jpg!)
        //    - BROWN (`lavaRockMat`): runs along the building South wall (`lz = -9.20m .. -11.05m`) from lx = -4.10m to +28.60m,
        //      and fills the entire East section (`lx = +28.60m .. +35.60m, lz = -14.20m .. -9.20m`).
        //    - GREEN (`turfLawnMat`): fills `lz = -11.05m .. -16.20m` from lx = -4.10m to +22.00m, steps in at lx = +22.00m
        //      above the purple landing, and continues across `lz = -11.05m .. -14.20m` to `lx = +28.60m`.
        // ---------------------------------------------------------------------
        const westLawnSegs = 12;
        for (let i = 0; i < westLawnSegs; i++) {
            const x0 = THREE.MathUtils.lerp(lawnWestX, landingWestX, i / westLawnSegs);
            const x1 = THREE.MathUtils.lerp(lawnWestX, landingWestX, (i + 1) / westLawnSegs);

            // Brown lava-rock strip along the building South wall (`lz = -9.20m .. -11.05m`)
            addQuad4Y(
                x0, southWallZ, yBedWestAt(x0, southWallZ) - 0.01,
                x1, southWallZ, yBedWestAt(x1, southWallZ) - 0.01,
                x1, lavaStripSouthZ, yBedWestAt(x1, lavaStripSouthZ) - 0.01,
                x0, lavaStripSouthZ, yBedWestAt(x0, lavaStripSouthZ) - 0.01,
                lavaRockMat,
                0.38
            );

            // Green grass lawn from the lava-rock strip (`lz = -11.05m`) out to the South Sidewalk (`lz = -16.20m`)
            addQuad4Y(
                x0, lavaStripSouthZ, yBedWestAt(x0, lavaStripSouthZ),
                x1, lavaStripSouthZ, yBedWestAt(x1, lavaStripSouthZ),
                x1, walkNorthZ, yBedWestAt(x1, walkNorthZ),
                x0, walkNorthZ, yBedWestAt(x0, walkNorthZ),
                turfLawnMat,
                0.42
            );

            // Concrete border curb between the brown lava-rock wall strip and the green grass (`lz = -11.05m`)
            const xm = (x0 + x1) * 0.5;
            addBox(x1 - x0 + 0.02, 0.12, 0.10, xm, yBedWestAt(xm, lavaStripSouthZ) - 0.04, lavaStripSouthZ, concretePlinthMat);

            // Concrete outer border curb along the South Sidewalk edge (`lz = -16.12m`)
            const wy = yBedOuter(xm, walkNorthZ);
            addBox(x1 - x0 + 0.02, 0.36, 0.18, xm, wy - 0.14, walkNorthZ + 0.09, concretePlinthMat);
        }

        // West border curb along the Law Enforcement Entrance walk (`lx = -4.02m, lz = -16.20m .. -9.20m`)
        addQuad4Y(
            lawnWestX, southWallZ, yBedWall(lawnWestX) + 0.03,
            lawnWestX + 0.18, southWallZ, yBedWall(lawnWestX + 0.18) + 0.03,
            lawnWestX + 0.18, walkNorthZ, yBedOuter(lawnWestX + 0.18, walkNorthZ) + 0.03,
            lawnWestX, walkNorthZ, yBedOuter(lawnWestX, walkNorthZ) + 0.03,
            concretePlinthMat,
            0.38
        );
        // Step-in concrete border curb at `lx = +22.00m` (`lz = -16.20m .. -14.20m`) along the West edge of the purple ramp landing
        addQuad4Y(
            landingWestX - 0.18, rampNorthZ, yBedOuter(landingWestX, rampNorthZ) + 0.03,
            landingWestX, rampNorthZ, yBedOuter(landingWestX, rampNorthZ) + 0.03,
            landingWestX, walkNorthZ, yBedOuter(landingWestX, walkNorthZ) + 0.03,
            landingWestX - 0.18, walkNorthZ, yBedOuter(landingWestX, walkNorthZ) + 0.03,
            concretePlinthMat,
            0.40
        );

        // Circular concrete tree-well ring & lava-rock basin in the green grass near the West end (`lx = +1.80m, lz = -13.50m`)
        {
            const trX = 1.80, trZ = -13.50;
            const trY = yBedWestAt(trX, trZ);
            const ringGeo = new THREE.CylinderGeometry(1.18, 1.22, 0.18, 24);
            const ringMesh = new THREE.Mesh(ringGeo, concretePlinthMat);
            ringMesh.position.set(trX, trY - 0.02, trZ);
            ringMesh.receiveShadow = true;
            arch.add(ringMesh);
            const mulchGeo = new THREE.CylinderGeometry(0.98, 0.98, 0.19, 24);
            const mulchMesh = new THREE.Mesh(mulchGeo, lavaRockMat);
            mulchMesh.position.set(trX, trY - 0.01, trZ);
            mulchMesh.receiveShadow = true;
            arch.add(mulchMesh);
        }

        // 1B) Stepped-In Planter Section North of the Purple Landing & Blue Ramp (`lx = +22.00m .. +35.60m, lz = -14.20m .. -9.20m`)
        //     - For z in [-9.20m .. -11.05m]: Brown lava rock all the way across `lx = +22.00m .. +35.60m`.
        //     - For z in [-11.05m .. -14.20m]: Green grass from `lx = +22.00m` to `xGrassCurve(z)` (`~27.6m .. 28.8m`),
        //       then brown lava rock from `xGrassCurve(z)` to `lx = +35.60m`!
        addQuad4Y(
            landingWestX, southWallZ, yBedEastAt(landingWestX, southWallZ) - 0.01,
            sunkenWestX, southWallZ, yBedEastAt(sunkenWestX, southWallZ) - 0.01,
            sunkenWestX, lavaStripSouthZ, yBedEastAt(sunkenWestX, lavaStripSouthZ) - 0.01,
            landingWestX, lavaStripSouthZ, yBedEastAt(landingWestX, lavaStripSouthZ) - 0.01,
            lavaRockMat,
            0.38
        );

        const zStripSegs = 8;
        const xGrassCurve = (z) => {
            const u = (z - (-12.625)) / 1.575; // -1 at lavaStripSouthZ (-11.05), 0 at mid (-12.625), +1 at rampNorthZ (-14.20)
            return 28.80 - 1.25 * (u * u);
        };

        for (let j = 0; j < zStripSegs; j++) {
            const z0 = THREE.MathUtils.lerp(lavaStripSouthZ, rampNorthZ, j / zStripSegs);
            const z1 = THREE.MathUtils.lerp(lavaStripSouthZ, rampNorthZ, (j + 1) / zStripSegs);
            const xC0 = xGrassCurve(z0);
            const xC1 = xGrassCurve(z1);

            // Green grass section north of the purple landing (`lx = +22.00m .. xGrassCurve(z), lz = -11.05m .. -14.20m`)
            addQuad4Y(
                landingWestX, z0, yBedEastAt(landingWestX, z0),
                xC0, z0, yBedEastAt(xC0, z0),
                xC1, z1, yBedEastAt(xC1, z1),
                landingWestX, z1, yBedEastAt(landingWestX, z1),
                turfLawnMat,
                0.38
            );

            // Brown volcanic lava rock section (`xGrassCurve(z) .. +35.60m, lz = -11.05m .. -14.20m`)
            addQuad4Y(
                xC0, z0, yBedEastAt(xC0, z0) - 0.012,
                sunkenWestX, z0, yBedEastAt(sunkenWestX, z0) - 0.012,
                sunkenWestX, z1, yBedEastAt(sunkenWestX, z1) - 0.012,
                xC1, z1, yBedEastAt(xC1, z1) - 0.012,
                lavaRockMat,
                0.38
            );

            // Concrete edging curb between the green grass and brown lava rock
            const xm = (xC0 + xC1) * 0.5;
            const zm = (z0 + z1) * 0.5;
            const ym = yBedEastAt(xm, zm);
            const segLen = Math.hypot(xC1 - xC0, z1 - z0) + 0.03;
            const ang = Math.atan2(z1 - z0, xC1 - xC0);
            const curbSeg = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.14, 0.12), concretePlinthMat);
            curbSeg.position.set(xm, ym - 0.04, zm);
            curbSeg.rotation.y = -ang;
            curbSeg.receiveShadow = true;
            arch.add(curbSeg);
        }
        // Concrete edging curb along `lz = -11.05m` from `lx = +22.00m` to `xGrassCurve(-11.05)`
        {
            const xEnd = xGrassCurve(lavaStripSouthZ);
            const xm = (landingWestX + xEnd) * 0.5;
            addBox(xEnd - landingWestX + 0.02, 0.12, 0.10, xm, yBedEastAt(xm, lavaStripSouthZ) - 0.04, lavaStripSouthZ, concretePlinthMat);
        }

        // Decorative river/landscape boulders nestled in the brown lava rock section (`lx = +29.00m .. +34.60m, lz = -13.60m .. -9.80m`)
        for (const [bx, bz, rx, ry, rz] of [
            [29.40, -10.30, 0.42, 0.24, 0.36],
            [30.50, -11.40, 0.50, 0.28, 0.44],
            [31.80, -10.20, 0.46, 0.22, 0.38],
            [31.20, -12.85, 0.55, 0.30, 0.46],
            [32.90, -11.75, 0.48, 0.26, 0.40],
            [33.85, -10.45, 0.52, 0.28, 0.42],
            [34.20, -12.90, 0.44, 0.24, 0.38]
        ]) {
            const by = yBedEastAt(bx, bz);
            const bGeo = new THREE.DodecahedronGeometry(1.0, 1);
            bGeo.scale(rx, ry, rz);
            const bMesh = new THREE.Mesh(bGeo, boulderMat);
            bMesh.position.set(bx, by + ry * 0.35, bz);
            bMesh.rotation.y = bx * 1.7;
            bMesh.castShadow = true;
            bMesh.receiveShadow = true;
            arch.add(bMesh);
        }

        // Law Enforcement Entrance Concrete Walk & Cheek Curb immediately East of the Evidence Room (lx = -7.40m .. -4.10m, lz = -16.60m .. -9.20m)
        addGradedQuad(
            -7.40, southWallZ,
            -4.10, southWallZ,
            -4.10, -16.60,
            -7.40, -16.60,
            0.085,
            concreteSidewalkMat
        );
        {
            const chkY = yGrade(-7.05, -12.80) + 0.09;
            addBox(0.22, 0.36, 5.40, -7.28, chkY + 0.14, -12.10, concretePlinthMat);
        }
        {
            const tdY = yGrade(-5.75, -17.08) + 0.086;
            addBox(3.25, 0.02, 0.22, -5.75, tdY, -17.08, copingDarkMat);
        }
        {
            const hrX = -6.15;
            const hrY = yGrade(hrX, -15.85) + 0.09;
            addBox(0.05, 0.88, 0.05, hrX, hrY + 0.44, -16.55, blackMetalMat);
            addBox(0.05, 0.88, 0.05, hrX, hrY + 0.44, -15.15, blackMetalMat);
            addBox(0.05, 0.05, 1.45, hrX, hrY + 0.88, -15.85, blackMetalMat);
        }
        for (const [sx, sz] of [
            [-8.15, -18.35],
            [-12.45, -18.35],
            [-2.20, -18.35]
        ]) {
            const sy = yGrade(sx, sz) + 0.08;
            addBox(0.045, 1.55, 0.045, sx, sy + 0.775, sz, blackMetalMat);
            addBox(0.42, 0.54, 0.03, sx, sy + 1.38, sz - 0.02, noParkingSignMat);
        }

        // ---------------------------------------------------------------------
        // 2A) PURPLE RAMP LANDING (`lx = +22.00m .. +26.50m, lz = -16.20m .. -14.20m`)
        //     Flush with the South Sidewalk (`lz = -16.20m`) with an open throat along the sidewalk
        //     so wheelchairs enter the landing directly before descending the blue ramp!
        // ---------------------------------------------------------------------
        addGradedQuad(
            landingWestX, rampNorthZ,
            rampStartX, rampNorthZ,
            rampStartX, walkNorthZ,
            landingWestX, walkNorthZ,
            0.10,
            concreteSidewalkMat,
            0.38
        );
        // North concrete retaining curb along the purple landing (`lx = +22.00m .. +26.50m, lz = -14.20m`)
        {
            const lMidX = (landingWestX + rampStartX) * 0.5;
            const lTopY = yBedOuter(lMidX, rampNorthZ) + 0.04;
            const lBotY = yGrade(lMidX, rampNorthZ) - 0.15;
            const lH = Math.max(0.24, lTopY - lBotY);
            addBox(rampStartX - landingWestX + 0.02, lH, 0.20, lMidX, lBotY + lH * 0.5, rampNorthZ + 0.08, concretePlinthMat);
        }

        // ---------------------------------------------------------------------
        // 2B) BLUE ADA WHEELCHAIR RAMP (`lx = +26.50m .. +35.60m, lz = -16.20m .. -14.20m`)
        //     Slopes smoothly from the East edge of the Purple Landing (`lx = +26.50m`) down to the
        //     Red 1st-Floor Ground Level (`sunkenFloorY = -0.95m`, full 1st-floor story depth!) at `lx = +35.60m`!
        // ---------------------------------------------------------------------
        const sunkenFloorY = -0.95; // Full 1st-Floor slab depth (2.55m below the y = +1.60m 1st-floor ceiling lintel, ~1.8m-2.0m below the sidewalk!)
        const rampStartY = yGrade(rampStartX, -15.20) + 0.10;
        const rampEndY = sunkenFloorY;
        const rampSegs = 12;

        for (let s = 0; s < rampSegs; s++) {
            const t0 = s / rampSegs;
            const t1 = (s + 1) / rampSegs;
            const x0 = THREE.MathUtils.lerp(rampStartX, sunkenWestX, t0);
            const x1 = THREE.MathUtils.lerp(rampStartX, sunkenWestX, t1);
            const xm = (x0 + x1) * 0.5;
            const segW = x1 - x0;
            const y0 = THREE.MathUtils.lerp(rampStartY, rampEndY, t0);
            const y1 = THREE.MathUtils.lerp(rampStartY, rampEndY, t1);
            const ym = (y0 + y1) * 0.5;
            const pitchZ = Math.atan2(y1 - y0, segW);

            // Sloped concrete wheelchair ramp deck (`lz = -16.20m .. -14.20m`)
            addQuad4Y(
                x0, rampNorthZ, y0,
                x1, rampNorthZ, y1,
                x1, walkNorthZ, y1,
                x0, walkNorthZ, y0,
                concreteSidewalkMat,
                0.30
            );

            // Transverse score joint across the ramp
            const rJoint = addBox(0.028, 0.02, 1.76, x1, y1 + 0.005, -15.20, jointMat);
            rJoint.rotation.z = pitchZ;

            // North concrete cheek retaining wall between the descending ramp and the raised lawn / lava-rock bed (`lz = -14.20m`)
            const nTopY = yBedOuter(xm, rampNorthZ) + 0.04;
            const nBotY = Math.min(y0, y1) - 0.25;
            const nH = Math.max(0.24, nTopY - nBotY);
            addBox(segW + 0.02, nH, 0.20, xm, nBotY + nH * 0.5, rampNorthZ + 0.08, concretePlinthMat);

            // South concrete cheek retaining wall between the descending ramp and the South Sidewalk (`lz = -16.20m`)
            const sTopY = yGrade(xm, walkNorthZ) + 0.16;
            const sBotY = Math.min(y0, y1) - 0.25;
            const sH = Math.max(0.24, sTopY - sBotY);
            addBox(segW + 0.02, sH, 0.20, xm, sBotY + sH * 0.5, walkNorthZ + 0.08, concretePlinthMat);

            // Dark-bronze 2-rail ADA steel pipe handrails along both edges of the wheelchair ramp (`lx = +26.50m .. +35.60m`)
            for (const rz of [rampNorthZ - 0.06, walkNorthZ + 0.22]) {
                addBox(0.042, 0.86, 0.042, x0, y0 + 0.43, rz, bronzeRailMat);
                const topR = addBox(segW + 0.03, 0.042, 0.042, xm, ym + 0.86, rz, bronzeRailMat);
                topR.rotation.z = pitchZ;
                const midR = addBox(segW + 0.03, 0.035, 0.035, xm, ym + 0.46, rz, bronzeRailMat);
                midR.rotation.z = pitchZ;
            }
        }

        // ---------------------------------------------------------------------
        // 3) RED-BORDERED 1ST-FLOOR GROUND LEVEL COURTYARD & DOORWAY PLAZA
        //    (`lx = +35.60m .. +51.70m, lz = -16.20m .. -9.20m`, flat y = -0.95m at full 1st-Floor slab depth!)
        // ---------------------------------------------------------------------
        addQuad4Y(
            sunkenWestX, southWallZ, sunkenFloorY,
            sunkenEastX, southWallZ, sunkenFloorY,
            sunkenEastX, walkNorthZ, sunkenFloorY,
            sunkenWestX, walkNorthZ, sunkenFloorY,
            concreteSidewalkMat,
            0.45
        );

        // Score lines on the sunken concrete courtyard floor
        for (let sx = 38.00; sx < 51.00; sx += 2.60) {
            addBox(0.03, 0.015, 6.80, sx, sunkenFloorY + 0.004, -12.70, jointMat);
        }
        addBox(15.90, 0.015, 0.03, 43.65, sunkenFloorY + 0.004, -12.70, jointMat);

        // West retaining wall of the sunken courtyard along the East edge of the lava rock section (`lx = +35.60m, lz = -14.20m .. -9.20m`)
        // (Stops at lz = -14.20m so the blue wheelchair ramp mouth at lz = -16.20m .. -14.20m opens directly onto the 1st-floor ground level!)
        {
            const wSegs = 4;
            for (let k = 0; k < wSegs; k++) {
                const z0 = THREE.MathUtils.lerp(southWallZ, rampNorthZ, k / wSegs);
                const z1 = THREE.MathUtils.lerp(southWallZ, rampNorthZ, (k + 1) / wSegs);
                const zm = (z0 + z1) * 0.5;
                const topW = yBedEastAt(sunkenWestX, zm) + 0.06;
                const botW = sunkenFloorY - 0.30;
                const hW = Math.max(0.30, topW - botW);
                addBox(0.24, hW, Math.abs(z1 - z0) + 0.02, sunkenWestX - 0.10, botW + hW * 0.5, zm, concretePlinthMat);
            }
        }

        // South retaining wall of the sunken courtyard along the North edge of the South Sidewalk (`lx = +35.60m .. +51.70m, lz = -16.20m`)
        {
            const sWallSegs = 8;
            for (let k = 0; k < sWallSegs; k++) {
                const x0 = THREE.MathUtils.lerp(sunkenWestX, sunkenEastX, k / sWallSegs);
                const x1 = THREE.MathUtils.lerp(sunkenWestX, sunkenEastX, (k + 1) / sWallSegs);
                const xm = (x0 + x1) * 0.5;
                const topS = yGrade(xm, walkNorthZ) + 0.16;
                const botS = sunkenFloorY - 0.30;
                const hS = Math.max(0.35, topS - botS);
                addBox(x1 - x0 + 0.02, hS, 0.24, xm, botS + hS * 0.5, walkNorthZ + 0.10, concretePlinthMat);
            }
        }

        // East retaining wall of the sunken courtyard along `lx = +51.70m, lz = -16.20m .. -9.20m`
        // + Safety guardrail along the top of the East retaining wall where the raised East L-walkway overlooks the deep 1st-floor courtyard!
        {
            const eWallSegs = 4;
            for (let k = 0; k < eWallSegs; k++) {
                const z0 = THREE.MathUtils.lerp(southWallZ, walkNorthZ, k / eWallSegs);
                const z1 = THREE.MathUtils.lerp(southWallZ, walkNorthZ, (k + 1) / eWallSegs);
                const zm = (z0 + z1) * 0.5;
                const segD = Math.abs(z1 - z0);
                const topE = yGrade(sunkenEastX, zm) + 0.18;
                const botE = sunkenFloorY - 0.30;
                const hE = Math.max(0.35, topE - botE);
                addBox(0.24, hE, segD + 0.02, sunkenEastX - 0.10, botE + hE * 0.5, zm, concretePlinthMat);
                // Guardrail on top of the East retaining wall
                addBox(0.045, 0.92, 0.045, sunkenEastX - 0.06, topE + 0.46, z0, bronzeRailMat);
                addBox(0.04, 0.04, segD + 0.02, sunkenEastX - 0.06, topE + 0.92, zm, bronzeRailMat);
                addBox(0.035, 0.035, segD + 0.02, sunkenEastX - 0.06, topE + 0.58, zm, bronzeRailMat);
                addBox(0.035, 0.035, segD + 0.02, sunkenEastX - 0.06, topE + 0.24, zm, bronzeRailMat);
            }
            const topEndE = yGrade(sunkenEastX, walkNorthZ) + 0.18;
            addBox(0.045, 0.92, 0.045, sunkenEastX - 0.06, topEndE + 0.46, walkNorthZ, bronzeRailMat);
        }

        // White Double-Panel "DIRECTORY / CHELAN COUNTY" Kiosk & Tall Dark-Bronze Lamp Post at the corner between the ramp and sunken courtyard (`lx = +34.40m, lz = -13.65m`)
        {
            const dirX = 34.40, dirZ = -13.65;
            const dirY = yBedEastAt(dirX, dirZ);
            addBox(0.10, 1.65, 0.10, dirX - 0.72, dirY + 0.825, dirZ, whiteMetalMat);
            addBox(0.10, 1.65, 0.10, dirX + 0.72, dirY + 0.825, dirZ, whiteMetalMat);
            addBox(1.62, 0.96, 0.08, dirX, dirY + 1.22, dirZ, whiteMetalMat);
            addBox(0.68, 0.78, 0.10, dirX - 0.36, dirY + 1.20, dirZ, directoryBoardMat);
            addBox(0.68, 0.78, 0.10, dirX + 0.36, dirY + 1.20, dirZ, directoryBoardMat);

            const lampX = 34.80, lampZ = -13.30;
            const lampY = yBedEastAt(lampX, lampZ);
            addBox(0.28, 0.45, 0.28, lampX, lampY + 0.225, lampZ, concretePlinthMat);
            addBox(0.09, 5.20, 0.09, lampX, lampY + 0.45 + 2.60, lampZ, bronzeRailMat);
            addBox(0.42, 0.12, 0.32, lampX, lampY + 5.65, lampZ - 0.16, bronzeRailMat);
        }

        // ---------------------------------------------------------------------
        // 4) MAIN SOUTH CONCRETE SIDEWALK (`lx = -15.60m .. +51.70m, lz = -19.10m .. -16.20m`)
        //    Uses `addGradedQuad` for both the sidewalk slab and the North/South edge curbs so
        //    there are zero sawtooth white triangles on the cross-sloped terrain!
        // ---------------------------------------------------------------------
        const sWalkSegs = 28;
        const bronzeRailMat2 = new THREE.MeshStandardMaterial({ color: '#2d3b34', roughness: 0.40, metalness: 0.60 });
        for (let i = 0; i < sWalkSegs; i++) {
            const xA = -15.60 + (i / sWalkSegs) * (51.70 - (-15.60));
            const xB = -15.60 + ((i + 1) / sWalkSegs) * (51.70 - (-15.60));
            const xm = (xA + xB) * 0.5;
            const segW = xB - xA;
            const innerWalkZ = xA < -7.40 ? -17.98 : walkNorthZ;
            const midWalkZ = (innerWalkZ + (-19.10)) * 0.5;

            // Main sidewalk slab conforming cleanly to terrain grade (yOff = +0.10m)
            addGradedQuad(
                xA, innerWalkZ,
                xB, innerWalkZ,
                xB, -19.10,
                xA, -19.10,
                0.10,
                concreteSidewalkMat,
                0.42
            );

            // Smooth terrain-conforming concrete edge curbs (using addGradedQuad so cross-slope never creates sawtooth triangles!)
            const isParkWalkJunction = xm >= 38.60 && xm <= 42.65;
            if (!isParkWalkJunction) {
                addGradedQuad(
                    xA, -18.96,
                    xB, -18.96,
                    xB, -19.10,
                    xA, -19.10,
                    0.122,
                    whiteCurbMat,
                    0.18
                );
            }
            addGradedQuad(
                xA, innerWalkZ,
                xB, innerWalkZ,
                xB, innerWalkZ - 0.14,
                xA, innerWalkZ - 0.14,
                0.122,
                whiteCurbMat,
                0.18
            );

            // Guardrail along the South Sidewalk where it overlooks the descending wheelchair ramp & sunken courtyard (`lx = +22.00m .. +51.70m`)
            if (xm >= rampStartX && xm <= 51.70) {
                const yA_n = yGrade(xA, innerWalkZ - 0.08) + 0.12;
                const yB_n = yGrade(xB, innerWalkZ - 0.08) + 0.12;
                const ym_n = (yA_n + yB_n) * 0.5;
                const slopeN = Math.atan2(yB_n - yA_n, segW);
                const rzN = innerWalkZ - 0.08;
                addBox(0.045, 0.92, 0.045, xA, yA_n + 0.46, rzN, bronzeRailMat2);
                const r1 = addBox(segW + 0.02, 0.04, 0.04, xm, ym_n + 0.92, rzN, bronzeRailMat2);
                const r2 = addBox(segW + 0.02, 0.035, 0.035, xm, ym_n + 0.58, rzN, bronzeRailMat2);
                const r3 = addBox(segW + 0.02, 0.035, 0.035, xm, ym_n + 0.24, rzN, bronzeRailMat2);
                r1.rotation.z = slopeN;
                r2.rotation.z = slopeN;
                r3.rotation.z = slopeN;
            }
            if (xm >= 35.60 && xm <= 51.70 && !isParkWalkJunction) {
                const yA_s = yGrade(xA, -19.02) + 0.12;
                const yB_s = yGrade(xB, -19.02) + 0.12;
                const ym_s = (yA_s + yB_s) * 0.5;
                const slopeS = Math.atan2(yB_s - yA_s, segW);
                const rzS = -19.02;
                addBox(0.045, 0.92, 0.045, xA, yA_s + 0.46, rzS, bronzeRailMat2);
                const r1 = addBox(segW + 0.02, 0.04, 0.04, xm, ym_s + 0.92, rzS, bronzeRailMat2);
                const r2 = addBox(segW + 0.02, 0.035, 0.035, xm, ym_s + 0.58, rzS, bronzeRailMat2);
                const r3 = addBox(segW + 0.02, 0.035, 0.035, xm, ym_s + 0.24, rzS, bronzeRailMat2);
                r1.rotation.z = slopeS;
                r2.rotation.z = slopeS;
                r3.rotation.z = slopeS;
            }

            // Green grass buffer strip between the South Sidewalk and the perpendicular parking stalls (`lz = -20.80m .. -19.10m`)
            if (xA >= -11.50 && xB <= 39.20) {
                addGradedQuad(
                    xA, -19.10,
                    xB, -19.10,
                    xB, -20.80,
                    xA, -20.80,
                    0.07,
                    turfLawnMat
                );
            }
        }

        // Tall Curved Aluminum Cobra-Head Streetlamp Pole in front of the SE Connector / Evidence Room junction (lx = -13.20m, lz = -20.60m, ed5b0d70.jpg!)
        {
            const lpX = -13.20, lpZ = -20.60;
            const lpY = yGrade(lpX, lpZ) + 0.08;
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 8.20, 10), silverMetalMat);
            pole.position.set(lpX, lpY + 4.10, lpZ);
            pole.castShadow = true;
            arch.add(pole);
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.85), silverMetalMat);
            arm.position.set(lpX, lpY + 8.15, lpZ - 0.85);
            arm.rotation.x = -0.18;
            arch.add(arm);
            addBox(0.32, 0.10, 0.52, lpX, lpY + 8.30, lpZ - 1.72, whiteMetalMat);
        }
    }
}
