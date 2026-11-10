import * as THREE from 'three';

/**
 * Photo-realistic 3D reconstruction of 428 Orondo Avenue (Chelan County Campus Annex, id: "building-428").
 * Modeled directly from street-view reference photograph:
 * - Single-story Craftsman/ranch annex clad in pale sage-green horizontal lap siding (#b8c5ae) with white corner boards & trim (#f2f4f0)
 * - Exact 8-vertex OSM footprint aligned with Orondo Avenue (theta = Math.atan2(0.813733, 0.581238) = 0.950547 rad):
 *   * Left (-X) projecting front-gabled wing (lx = -5.61m..+0.93m, lz = -5.73m..+6.34m) with twin 2-lite front window & gable louver vent
 *   * Center nested secondary front-facing entry gable (lx = -0.85m..+2.45m, lz = +1.20m..+4.85m) sheltering the recessed porch
 *   * Recessed white 6-lite paneled front entry door (lx = +1.38m, lz = +2.78m) with dark wall mailbox
 *   * Right (+X) recessed side-gabled wing (lx = +0.30m..+7.21m, lz = -6.55m..+2.78m) with wide front picture window & right corner window
 * - Front ADA wheelchair ramp extending from the entry landing across the left wing with white/silver 2-rail tubular metal handrails
 * - Tall flagpole at the inner corner of the ramp/landing flying a 3D United States flag above the roofline
 * - Front concrete walkways, Orondo Avenue sidewalk & curb, A-frame sandwich signs, dry summer grass front yard panels,
 *   left weathered cedar privacy fence, and right chain-link fence bordering the County parking lot
 */
export function buildPhotoRealisticBuilding428(foundry, group, building, shape, wallMat, trimMat, terrainY = 0, getTerrainHeightFn = null) {
    const arch = new THREE.Group();
    arch.name = 'Building428ArchitecturalDetails';
    // Exact Orondo Avenue alignment (collinear with Building 300's Orondo Ave sidewalk at lz = 11.91m)
    arch.rotation.y = Math.atan2(0.80282848, 0.59621006);
    group.add(arch);

    // =========================================================================
    // 1. PROCEDURAL TEXTURES & MATERIALS
    // =========================================================================

    // A. Pale Sage-Green Horizontal Lap / Clapboard Siding Texture (#b8c5ae)
    const sidingCan = document.createElement('canvas');
    sidingCan.width = 512;
    sidingCan.height = 512;
    const sCtx = sidingCan.getContext('2d');
    sCtx.fillStyle = '#b8c5ae';
    sCtx.fillRect(0, 0, 512, 512);

    const courseH = 16; // 32 horizontal clapboard courses per 512px
    for (let y = 0; y < 512; y += courseH) {
        const shade = ((Math.sin(y * 19.7) * 43758.5) % 1) * 4 - 2;
        sCtx.fillStyle = `rgb(${Math.round(184 + shade)}, ${Math.round(197 + shade)}, ${Math.round(174 + shade)})`;
        sCtx.fillRect(0, y, 512, courseH - 2);
        // Sunlit top bevel highlight
        sCtx.fillStyle = 'rgba(242, 247, 238, 0.42)';
        sCtx.fillRect(0, y, 512, 2);
        // Crisp under-lap shadow line at bottom of each clapboard course
        sCtx.fillStyle = 'rgba(72, 82, 66, 0.58)';
        sCtx.fillRect(0, y + courseH - 2, 512, 2);
    }
    const sidingTex = new THREE.CanvasTexture(sidingCan);
    sidingTex.wrapS = THREE.RepeatWrapping;
    sidingTex.wrapT = THREE.RepeatWrapping;
    sidingTex.repeat.set(1.5, 1.0);
    sidingTex.colorSpace = THREE.SRGBColorSpace;

    const sageSidingMat = new THREE.MeshStandardMaterial({
        map: sidingTex,
        bumpMap: sidingTex,
        bumpScale: 0.018,
        roughness: 0.78,
        metalness: 0.04
    });

    // B. Dark Charcoal Architectural Asphalt Shingle Roof Texture (#3d4147)
    const roofCan = document.createElement('canvas');
    roofCan.width = 512;
    roofCan.height = 512;
    const rCtx = roofCan.getContext('2d');
    rCtx.fillStyle = '#3b3f45';
    rCtx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 16) {
        const rowShift = ((y / 16) % 2) * 32;
        for (let x = -32; x < 512; x += 64) {
            const v = (((x * 13 + y * 31) % 17) - 8) * 1.3;
            rCtx.fillStyle = `rgb(${Math.round(60 + v)}, ${Math.round(64 + v)}, ${Math.round(70 + v)})`;
            rCtx.fillRect(x + rowShift + 1, y + 1, 62, 13);
            rCtx.fillStyle = 'rgba(22, 24, 28, 0.65)';
            rCtx.fillRect(x + rowShift, y + 14, 64, 2);
        }
    }
    const shingleTex = new THREE.CanvasTexture(roofCan);
    shingleTex.wrapS = THREE.RepeatWrapping;
    shingleTex.wrapT = THREE.RepeatWrapping;
    shingleTex.repeat.set(3.5, 2.5);
    shingleTex.colorSpace = THREE.SRGBColorSpace;

    const shingleRoofMat = new THREE.MeshStandardMaterial({
        map: shingleTex,
        bumpMap: shingleTex,
        bumpScale: 0.025,
        roughness: 0.88,
        metalness: 0.05,
        side: THREE.DoubleSide
    });

    // C. Crisp White Trim, Concrete Foundation, Glass, Ramp & Yard Materials
    const whiteTrimMat = new THREE.MeshStandardMaterial({
        color: '#f2f4f0',
        roughness: 0.58,
        metalness: 0.06
    });
    const foundationConcreteMat = new THREE.MeshStandardMaterial({
        color: '#9c9e99',
        roughness: 0.88,
        metalness: 0.03
    });
    const darkWindowGlassMat = new THREE.MeshStandardMaterial({
        color: '#222f38',
        roughness: 0.18,
        metalness: 0.72
    });
    const warmCornerGlassMat = new THREE.MeshStandardMaterial({
        color: '#6e493e',
        roughness: 0.25,
        metalness: 0.45
    });
    const rampDeckMat = new THREE.MeshStandardMaterial({
        color: '#e2dcd0',
        roughness: 0.86,
        metalness: 0.03,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
    });
    const handrailPipeMat = new THREE.MeshStandardMaterial({
        color: '#eef2f5',
        roughness: 0.35,
        metalness: 0.55
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
        color: '#2b3036',
        roughness: 0.48,
        metalness: 0.55
    });

    // D. Brushed Concrete Sidewalk & Walkway Material (unified with Building 400's plazaConcreteMat #e2dcd0)
    const concreteWalkMat = new THREE.MeshStandardMaterial({
        color: '#e2dcd0',
        roughness: 0.86,
        metalness: 0.03,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
    });

    // E. Dry Golden-Tan Summer Grass Front Yard Texture (matches street view photo)
    const yardCan = document.createElement('canvas');
    yardCan.width = 512;
    yardCan.height = 512;
    const yCtx = yardCan.getContext('2d');
    yCtx.fillStyle = '#cbb386';
    yCtx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 6000; i++) {
        const px = (i * 97) % 512;
        const py = (i * 173) % 512;
        yCtx.fillStyle = i % 3 === 0
            ? 'rgba(222, 202, 162, 0.28)'
            : (i % 5 === 0 ? 'rgba(138, 148, 92, 0.22)' : 'rgba(156, 124, 82, 0.24)');
        yCtx.fillRect(px, py, 6, 4);
    }
    const dryYardTex = new THREE.CanvasTexture(yardCan);
    dryYardTex.wrapS = THREE.RepeatWrapping;
    dryYardTex.wrapT = THREE.RepeatWrapping;
    dryYardTex.repeat.set(2, 2);
    dryYardTex.colorSpace = THREE.SRGBColorSpace;

    const dryYardMat = new THREE.MeshStandardMaterial({
        map: dryYardTex,
        roughness: 0.94,
        metalness: 0.01,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
    });

    // F. Weathered Cedar Wood Privacy Fence Texture
    const cedarCan = document.createElement('canvas');
    cedarCan.width = 256;
    cedarCan.height = 256;
    const cCtx = cedarCan.getContext('2d');
    cCtx.fillStyle = '#8f6745';
    cCtx.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 16) {
        const d = ((x * 7) % 15) - 7;
        cCtx.fillStyle = `rgb(${143 + d}, ${103 + d}, ${69 + d})`;
        cCtx.fillRect(x + 1, 0, 14, 256);
        cCtx.fillStyle = 'rgba(48, 32, 18, 0.55)';
        cCtx.fillRect(x, 0, 1, 256);
    }
    const cedarTex = new THREE.CanvasTexture(cedarCan);
    cedarTex.wrapS = THREE.RepeatWrapping;
    cedarTex.wrapT = THREE.RepeatWrapping;
    cedarTex.repeat.set(4, 1);
    cedarTex.colorSpace = THREE.SRGBColorSpace;

    const cedarFenceMat = new THREE.MeshStandardMaterial({
        map: cedarTex,
        roughness: 0.88,
        metalness: 0.02
    });
    const fencePostMat = new THREE.MeshStandardMaterial({
        color: '#4d3726',
        roughness: 0.90,
        metalness: 0.02
    });

    // Helper: Add Box in local (lx, y, lz) coordinates
    const addBox = (w, h, d, mat, lx, y, lz, cast = true) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(lx, y, lz);
        m.castShadow = cast;
        m.receiveShadow = true;
        m.userData = { isSelectableBuilding: true, building };
        arch.add(m);
        return m;
    };

    // =========================================================================
    // 2. FOUNDATION PLINTH & MAIN SAGE-GREEN CLAPBOARD WALL MASSING
    // =========================================================================
    const baseElev = 0.36; // Exposed concrete foundation height above yard grade
    const eaveY = 3.08;    // Wall eave height (single story)
    const wallH = eaveY - baseElev;

    // Left Projecting Wing: lx in [-5.61, +0.93], lz in [-5.73, +6.34]
    const leftWingW = 0.93 - (-5.61); // 6.54m
    const leftWingD = 6.34 - (-5.73); // 12.07m
    const leftWingCx = (-5.61 + 0.93) * 0.5; // -2.34m
    const leftWingCz = (-5.73 + 6.34) * 0.5; // +0.305m

    // Right Recessed Wing: lx in [+0.30, +7.21], lz in [-6.55, +2.78]
    const rightWingW = 7.21 - 0.30; // 6.91m
    const rightWingD = 2.78 - (-6.55); // 9.33m
    const rightWingCx = (0.30 + 7.21) * 0.5; // +3.755m
    const rightWingCz = (-6.55 + 2.78) * 0.5; // -1.885m

    // Concrete Foundation Stem Walls (extending 3.6m below grade so slopes never show gaps)
    const fndH = 3.6 + baseElev;
    const fndCenterY = -3.6 + fndH * 0.5;
    addBox(leftWingW + 0.06, fndH, leftWingD + 0.06, foundationConcreteMat, leftWingCx, fndCenterY, leftWingCz);
    addBox(rightWingW + 0.06, fndH, rightWingD + 0.06, foundationConcreteMat, rightWingCx, fndCenterY, rightWingCz);

    // Main Sage-Green Horizontal Lap Siding Wall Volumes
    const wallCenterY = baseElev + wallH * 0.5;
    addBox(leftWingW, wallH, leftWingD, sageSidingMat, leftWingCx, wallCenterY, leftWingCz);
    addBox(rightWingW, wallH, rightWingD, sageSidingMat, rightWingCx, wallCenterY, rightWingCz);

    // Crisp White Corner Boards at all exterior corners
    const cornerPostCoords = [
        [-5.61, 6.34],
        [0.93, 6.34],
        [0.93, 2.78],
        [7.21, 2.78],
        [7.21, -6.55],
        [0.30, -6.55],
        [-5.61, -5.73]
    ];
    for (const [cx, cz] of cornerPostCoords) {
        addBox(0.14, wallH + 0.02, 0.14, whiteTrimMat, cx, wallCenterY, cz);
    }
    // White horizontal frieze board directly under the eaves
    addBox(leftWingW + 0.06, 0.14, leftWingD + 0.06, whiteTrimMat, leftWingCx, eaveY - 0.07, leftWingCz);
    addBox(rightWingW + 0.06, 0.14, rightWingD + 0.06, whiteTrimMat, rightWingCx, eaveY - 0.07, rightWingCz);

    // =========================================================================
    // 3. INTERSECTING GABLE ROOFS & NESTED FRONT ENTRY GABLE
    // =========================================================================
    // Helper: Build a pitched gable roof with triangular gable-end walls, white rake fascia, soffit, and shingle slopes
    const buildGableRoof = ({
        axis,       // 'Z' (ridge along Z, front/back gables) or 'X' (ridge along X, left/right gables)
        spanMin,    // wall min along cross-ridge axis
        spanMax,    // wall max along cross-ridge axis
        lenMin,     // wall min along ridge axis
        lenMax,     // wall max along ridge axis
        eaveOverhang = 0.42,
        rakeOverhang = 0.42,
        baseY = eaveY,
        ridgeRise = 1.56,
        buildGableWallMin = true,
        buildGableWallMax = true,
        gableVentMax = false,
        gableVentMin = false
    }) => {
        const spanCenter = (spanMin + spanMax) * 0.5;
        const halfWallSpan = (spanMax - spanMin) * 0.5;
        const halfEaveSpan = halfWallSpan + eaveOverhang;
        const slopeRise = ridgeRise * (halfEaveSpan / halfWallSpan);
        const eaveDropY = baseY - (slopeRise - ridgeRise);
        const peakY = baseY + ridgeRise;
        const slopeLen = Math.hypot(halfEaveSpan, slopeRise);
        const slopeAngle = Math.atan2(slopeRise, halfEaveSpan);
        const roofLength = (lenMax - lenMin) + rakeOverhang * 2;
        const lenCenter = (lenMin + lenMax) * 0.5;
        const deckThick = 0.12;

        // 1. Triangular Gable-End Tympanum Walls
        const buildTriangularWall = (posAlongRidge, isMaxEnd) => {
            const triShape = new THREE.Shape();
            triShape.moveTo(-halfWallSpan, 0);
            triShape.lineTo(halfWallSpan, 0);
            triShape.lineTo(0, ridgeRise);
            triShape.closePath();
            const triGeo = new THREE.ExtrudeGeometry(triShape, { depth: 0.16, bevelEnabled: false });
            // Scale UVs so horizontal lap siding courses match the lower walls
            const uv = triGeo.attributes.uv;
            for (let i = 0; i < uv.count; i++) {
                uv.setXY(i, uv.getX(i) * 0.25, uv.getY(i) * 0.35);
            }
            const triMesh = new THREE.Mesh(triGeo, sageSidingMat);
            if (axis === 'Z') {
                triMesh.position.set(spanCenter, baseY, posAlongRidge - (isMaxEnd ? 0.16 : 0));
            } else {
                triMesh.rotation.y = Math.PI * 0.5;
                triMesh.position.set(posAlongRidge - (isMaxEnd ? 0.16 : 0), baseY, spanCenter);
            }
            triMesh.castShadow = true;
            triMesh.receiveShadow = true;
            triMesh.userData = { isSelectableBuilding: true, building };
            arch.add(triMesh);
        };

        if (buildGableWallMin) buildTriangularWall(lenMin, false);
        if (buildGableWallMax) buildTriangularWall(lenMax, true);

        // 2. Two Pitched Shingle Roof Slopes + Under-Eave White Soffit Panels
        for (const side of [-1, 1]) {
            const midOffset = side * (halfEaveSpan * 0.5);
            const midY = (eaveDropY + peakY) * 0.5;

            if (axis === 'Z') {
                const slopeMesh = new THREE.Mesh(
                    new THREE.BoxGeometry(slopeLen, deckThick, roofLength),
                    shingleRoofMat
                );
                slopeMesh.position.set(spanCenter + midOffset, midY + deckThick * 0.5, lenCenter);
                slopeMesh.rotation.z = -side * slopeAngle;
                slopeMesh.castShadow = true;
                slopeMesh.receiveShadow = true;
                slopeMesh.userData = { isSelectableBuilding: true, building };
                arch.add(slopeMesh);

                // White horizontal eave fascia board along the outer eave edge
                addBox(0.08, 0.18, roofLength, whiteTrimMat, spanCenter + side * halfEaveSpan, eaveDropY + 0.04, lenCenter);
            } else {
                const slopeMesh = new THREE.Mesh(
                    new THREE.BoxGeometry(roofLength, deckThick, slopeLen),
                    shingleRoofMat
                );
                slopeMesh.position.set(lenCenter, midY + deckThick * 0.5, spanCenter + midOffset);
                slopeMesh.rotation.x = side * slopeAngle;
                slopeMesh.castShadow = true;
                slopeMesh.receiveShadow = true;
                slopeMesh.userData = { isSelectableBuilding: true, building };
                arch.add(slopeMesh);

                // White horizontal eave fascia board along the outer eave edge
                addBox(roofLength, 0.18, 0.08, whiteTrimMat, lenCenter, eaveDropY + 0.04, spanCenter + side * halfEaveSpan);
            }

            // Crisp White Rake Fascia Boards on Front & Rear Gable Overhangs
            for (const endZ of [lenMin - rakeOverhang + 0.06, lenMax + rakeOverhang - 0.06]) {
                if (axis === 'Z') {
                    const rake = new THREE.Mesh(
                        new THREE.BoxGeometry(slopeLen + 0.06, 0.18, 0.12),
                        whiteTrimMat
                    );
                    rake.position.set(spanCenter + midOffset, midY + 0.01, endZ);
                    rake.rotation.z = -side * slopeAngle;
                    rake.castShadow = true;
                    arch.add(rake);
                } else {
                    const rake = new THREE.Mesh(
                        new THREE.BoxGeometry(0.12, 0.18, slopeLen + 0.06),
                        whiteTrimMat
                    );
                    rake.position.set(endZ, midY + 0.01, spanCenter + midOffset);
                    rake.rotation.x = side * slopeAngle;
                    rake.castShadow = true;
                    arch.add(rake);
                }
            }
        }

        // Ridge Cap Shingle Strip
        if (axis === 'Z') {
            addBox(0.28, 0.10, roofLength, shingleRoofMat, spanCenter, peakY + 0.10, lenCenter);
        } else {
            addBox(roofLength, 0.10, 0.28, shingleRoofMat, lenCenter, peakY + 0.10, spanCenter);
        }

        // Rectangular Louvered Gable Attic Vent below the peak (visible in photo!)
        const addGableVent = (posAlongRidge, normalSign) => {
            const ventY = baseY + ridgeRise * 0.62;
            if (axis === 'Z') {
                addBox(0.38, 0.52, 0.06, whiteTrimMat, spanCenter, ventY, posAlongRidge + normalSign * 0.03);
                addBox(0.28, 0.42, 0.07, darkMetalMat, spanCenter, ventY, posAlongRidge + normalSign * 0.04);
            } else {
                addBox(0.06, 0.52, 0.38, whiteTrimMat, posAlongRidge + normalSign * 0.03, ventY, spanCenter);
                addBox(0.07, 0.42, 0.28, darkMetalMat, posAlongRidge + normalSign * 0.04, ventY, spanCenter);
            }
        };
        if (gableVentMax) addGableVent(lenMax, +1);
        if (gableVentMin) addGableVent(lenMin, -1);
    };

    // 3A. Main Left Projecting Wing Front-to-Back Gable Roof (ridge along Z at lx = -2.34m)
    buildGableRoof({
        axis: 'Z',
        spanMin: -5.61,
        spanMax: 0.93,
        lenMin: -5.73,
        lenMax: 6.34,
        eaveOverhang: 0.42,
        rakeOverhang: 0.44,
        baseY: eaveY,
        ridgeRise: 1.58,
        buildGableWallMin: true,
        buildGableWallMax: true,
        gableVentMax: true,
        gableVentMin: true
    });

    // 3B. Right Wing Side-Gabled Roof (ridge along X at lz = -1.885m, intersecting main wing roof)
    buildGableRoof({
        axis: 'X',
        spanMin: -6.55,
        spanMax: 2.78,
        lenMin: -2.10,
        lenMax: 7.21,
        eaveOverhang: 0.42,
        rakeOverhang: 0.42,
        baseY: eaveY,
        ridgeRise: 1.54,
        buildGableWallMin: false,
        buildGableWallMax: true,
        gableVentMax: true,
        gableVentMin: false
    });

    // 3C. Nested Secondary Front Entry Gable (tucked into the step-back over the entry porch, lx = -0.82m..+2.48m, lz = +1.10m..+4.72m)
    buildGableRoof({
        axis: 'Z',
        spanMin: -0.82,
        spanMax: 2.48,
        lenMin: 1.10,
        lenMax: 4.72,
        eaveOverhang: 0.32,
        rakeOverhang: 0.34,
        baseY: eaveY - 0.08,
        ridgeRise: 1.12,
        buildGableWallMin: false,
        buildGableWallMax: true,
        gableVentMax: false,
        gableVentMin: false
    });
    // White porch support post at the outer right corner of the nested entry gable (lx = +2.38m, lz = +4.65m)
    addBox(0.14, eaveY - 0.42, 0.14, whiteTrimMat, 2.38, 0.42 + (eaveY - 0.42) * 0.5, 4.65);

    // =========================================================================
    // 4. WINDOWS & RECESSED WHITE 6-LITE FRONT ENTRY DOOR (Photo-Matched)
    // =========================================================================
    const addFramedWindow = ({
        wallNormal, // 'Z+', 'Z-', 'X+', 'X-'
        x, y, z,
        w, h,
        bays = 1,
        glassMat = darkWindowGlassMat
    }) => {
        const grp = new THREE.Group();
        grp.position.set(x, y, z);
        if (wallNormal === 'Z-') grp.rotation.y = Math.PI;
        else if (wallNormal === 'X+') grp.rotation.y = Math.PI * 0.5;
        else if (wallNormal === 'X-') grp.rotation.y = -Math.PI * 0.5;

        // Outer white window casing trim
        const casingW = 0.10;
        const frameD = 0.09;
        const outer = new THREE.Mesh(new THREE.BoxGeometry(w + casingW * 2, h + casingW * 2, frameD), whiteTrimMat);
        outer.position.set(0, 0, 0.02);
        grp.add(outer);

        // Projecting white window sill
        const sill = new THREE.Mesh(new THREE.BoxGeometry(w + casingW * 2 + 0.08, 0.06, frameD + 0.06), whiteTrimMat);
        sill.position.set(0, -h * 0.5 - casingW * 0.5, 0.04);
        grp.add(sill);

        // Glass panes + center white mullion(s)
        const mullionW = 0.11;
        const paneW = (w - (bays - 1) * mullionW) / bays;
        for (let b = 0; b < bays; b++) {
            const bx = -w * 0.5 + paneW * 0.5 + b * (paneW + mullionW);
            const glass = new THREE.Mesh(new THREE.BoxGeometry(paneW, h - 0.06, 0.04), glassMat);
            glass.position.set(bx, 0, 0.055);
            grp.add(glass);
        }

        grp.traverse((c) => {
            if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;
                c.userData = { isSelectableBuilding: true, building };
            }
        });
        arch.add(grp);
    };

    // 4A. Left Projecting Wing — Large Front 2-Bay Twin Picture Window (lx = -2.34m, lz = +6.34m)
    addFramedWindow({
        wallNormal: 'Z+',
        x: -2.34,
        y: 1.88,
        z: 6.34,
        w: 2.74,
        h: 1.42,
        bays: 2,
        glassMat: darkWindowGlassMat
    });

    // 4B. Recessed Front Entry Porch — White 6-Lite Paneled Entry Door (lx = +1.48m, lz = +2.78m)
    {
        const doorX = 1.48;
        const doorZ = 2.78;
        const doorW = 0.98;
        const doorH = 2.10;
        const doorY = 0.42 + doorH * 0.5;

        // White door casing & leaf
        addBox(doorW + 0.18, doorH + 0.10, 0.09, whiteTrimMat, doorX, doorY + 0.02, doorZ + 0.02);
        addBox(doorW, doorH, 0.06, whiteTrimMat, doorX, doorY, doorZ + 0.05);

        // Upper 6-lite window grid (2 cols x 3 rows) in top half of door
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 2; col++) {
                const gx = doorX + (col === 0 ? -0.18 : 0.18);
                const gy = doorY + 0.22 + row * 0.25;
                addBox(0.24, 0.19, 0.03, darkWindowGlassMat, gx, gy, doorZ + 0.075, false);
            }
        }
        // Brass/dark door handle + dark wall-mounted mailbox to the left of the door
        addBox(0.04, 0.14, 0.05, darkMetalMat, doorX - 0.38, doorY - 0.08, doorZ + 0.09, false);
        addBox(0.24, 0.34, 0.10, darkMetalMat, 0.72, 1.56, doorZ + 0.06);
    }

    // 4C. Right Wing — Wide Single Picture Window to the right of the entry porch (lx = +3.48m, lz = +2.78m)
    addFramedWindow({
        wallNormal: 'Z+',
        x: 3.48,
        y: 1.92,
        z: 2.78,
        w: 1.84,
        h: 1.28,
        bays: 1,
        glassMat: darkWindowGlassMat
    });

    // 4D. Right Wing — Far-Right Corner Window (lx = +6.72m, lz = +2.78m, warm interior blind tint as in photo)
    addFramedWindow({
        wallNormal: 'Z+',
        x: 6.72,
        y: 1.96,
        z: 2.78,
        w: 0.74,
        h: 1.06,
        bays: 1,
        glassMat: warmCornerGlassMat
    });

    // 4E. Side & Rear Elevation Windows for 360-degree completeness
    addFramedWindow({ wallNormal: 'X-', x: -5.61, y: 1.88, z: 2.40, w: 1.45, h: 1.25, bays: 2 });
    addFramedWindow({ wallNormal: 'X-', x: -5.61, y: 1.88, z: -2.20, w: 1.45, h: 1.25, bays: 2 });
    addFramedWindow({ wallNormal: 'X+', x: 7.21, y: 1.92, z: 1.85, w: 0.78, h: 1.06, bays: 1, glassMat: warmCornerGlassMat });
    addFramedWindow({ wallNormal: 'X+', x: 7.21, y: 1.88, z: -2.10, w: 1.50, h: 1.25, bays: 2 });
    addFramedWindow({ wallNormal: 'Z-', x: -2.34, y: 1.88, z: -5.73, w: 1.60, h: 1.25, bays: 2 });
    addFramedWindow({ wallNormal: 'Z-', x: 3.80, y: 1.88, z: -6.55, w: 1.80, h: 1.25, bays: 2 });

    // =========================================================================
    // 5. FRONT ADA WHEELCHAIR RAMP, ENTRY LANDING & WHITE METAL PIPE HANDRAILS
    // =========================================================================
    // 5A. Raised Front Entry Landing in front of the recessed entry door (lx = +0.52m..+2.36m, lz = +2.78m..+5.18m, y = 0..0.42m)
    const landingY = 0.42;
    addBox(1.84, landingY, 2.40, rampDeckMat, 1.44, landingY * 0.5, 3.98);
    // Two steps on the right side of the landing (+X = +2.36m..+2.92m) leading down to the front yard
    addBox(0.28, 0.28, 1.25, rampDeckMat, 2.50, 0.14, 3.55);
    addBox(0.28, 0.14, 1.25, rampDeckMat, 2.78, 0.07, 3.55);

    // 5B. Sloped ADA Wheelchair Ramp extending from the landing (lx = +0.52m, y = 0.42m) across the Left Wing to lx = -4.98m (y = 0.04m)
    const rampX0 = -4.98; // bottom of ramp on Left (-X)
    const rampX1 = 0.52;  // top of ramp at landing (+X)
    const rampLen = rampX1 - rampX0; // 5.50m
    const rampW = 1.08;              // lz = +5.14m..+6.22m
    const rampCz = 5.68;
    const rampY0 = 0.05;
    const rampY1 = landingY;
    const rampSlopeAngle = Math.atan2(rampY1 - rampY0, rampLen);

    // Sloped ramp deck + solid concrete wedge base
    const rampShape = new THREE.Shape();
    rampShape.moveTo(rampX0, 0);
    rampShape.lineTo(rampX1, 0);
    rampShape.lineTo(rampX1, rampY1);
    rampShape.lineTo(rampX0, rampY0);
    rampShape.closePath();
    const rampGeo = new THREE.ExtrudeGeometry(rampShape, { depth: rampW, bevelEnabled: false });
    const rampMesh = new THREE.Mesh(rampGeo, rampDeckMat);
    rampMesh.position.set(0, 0, rampCz - rampW * 0.5);
    rampMesh.castShadow = true;
    rampMesh.receiveShadow = true;
    rampMesh.userData = { isSelectableBuilding: true, building };
    arch.add(rampMesh);

    // 5C. White/Silver Two-Rail Tubular Metal Handrails & Vertical Posts along both sides of the ADA Ramp & Landing
    const postRadius = 0.022;
    const railRadius = 0.022;
    const railTopH = 0.90;
    const railMidH = 0.46;

    for (const railZ of [rampCz - rampW * 0.46, rampCz + rampW * 0.46]) {
        // 5 vertical posts along the sloped ramp
        const numPosts = 5;
        for (let i = 0; i < numPosts; i++) {
            const t = i / (numPosts - 1);
            const px = THREE.MathUtils.lerp(rampX0 + 0.08, rampX1, t);
            const baseRampY = THREE.MathUtils.lerp(rampY0, rampY1, t);
            const post = new THREE.Mesh(
                new THREE.CylinderGeometry(postRadius, postRadius, railTopH, 8),
                handrailPipeMat
            );
            post.position.set(px, baseRampY + railTopH * 0.5, railZ);
            post.castShadow = true;
            arch.add(post);
        }

        // Top and mid sloped rails along the ramp
        for (const rH of [railMidH, railTopH]) {
            const railLen = Math.hypot(rampLen, rampY1 - rampY0);
            const rail = new THREE.Mesh(
                new THREE.CylinderGeometry(railRadius, railRadius, railLen, 8),
                handrailPipeMat
            );
            rail.position.set((rampX0 + rampX1) * 0.5, (rampY0 + rampY1) * 0.5 + rH, railZ);
            rail.rotation.z = -(Math.PI * 0.5 - rampSlopeAngle);
            rail.castShadow = true;
            arch.add(rail);
        }
    }

    // Horizontal guardrails & posts around the front and right side of the entry landing
    const landingPosts = [
        [0.52, 5.14],
        [1.15, 5.14],
        [1.75, 5.14],
        [2.32, 5.14],
        [2.32, 4.18]
    ];
    for (const [px, pz] of landingPosts) {
        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(postRadius, postRadius, railTopH, 8),
            handrailPipeMat
        );
        post.position.set(px, landingY + railTopH * 0.5, pz);
        post.castShadow = true;
        arch.add(post);
    }
    // Front landing horizontal rails (lx = +0.52m..+1.15m and +1.75m..+2.32m, leaving a central opening at lx = +1.15m..+1.75m for the front walkway!)
    for (const rH of [railMidH, railTopH]) {
        addBox(0.63, 0.04, 0.04, handrailPipeMat, 0.835, landingY + rH, 5.14);
        addBox(0.57, 0.04, 0.04, handrailPipeMat, 2.035, landingY + rH, 5.14);
        addBox(0.04, 0.04, 0.96, handrailPipeMat, 2.32, landingY + rH, 4.66);
    }

    // =========================================================================
    // 6. TALL FLAGPOLE WITH 3D PROCEDURAL U.S. FLAG (Photo-Matched)
    // =========================================================================
    {
        const poleX = 0.56;
        const poleZ = 5.08;
        const poleH = 6.95;

        const poleMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.032, 0.052, poleH, 12),
            handrailPipeMat
        );
        poleMesh.position.set(poleX, poleH * 0.5, poleZ);
        poleMesh.castShadow = true;
        arch.add(poleMesh);

        // Gold finial ball atop the flagpole
        const finialMat = new THREE.MeshStandardMaterial({ color: '#e5b842', roughness: 0.25, metalness: 0.82 });
        const finial = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), finialMat);
        finial.position.set(poleX, poleH + 0.05, poleZ);
        arch.add(finial);

        // Procedural United States Flag Canvas Texture
        const flagCan = document.createElement('canvas');
        flagCan.width = 256;
        flagCan.height = 144;
        const fCtx = flagCan.getContext('2d');
        const stripeH = 144 / 13;
        for (let s = 0; s < 13; s++) {
            fCtx.fillStyle = s % 2 === 0 ? '#bf1e2e' : '#f7f8fa';
            fCtx.fillRect(0, s * stripeH, 256, stripeH + 0.5);
        }
        // Blue canton on the hoist side (right side of texture since flag flies to the left -X in photo!)
        const cantonW = 104;
        const cantonH = stripeH * 7;
        fCtx.fillStyle = '#1b3664';
        fCtx.fillRect(256 - cantonW, 0, cantonW, cantonH);
        fCtx.fillStyle = '#ffffff';
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 6; c++) {
                fCtx.fillRect(256 - cantonW + 10 + c * 15, 7 + r * 14, 4, 4);
            }
        }
        const flagTex = new THREE.CanvasTexture(flagCan);
        flagTex.colorSpace = THREE.SRGBColorSpace;
        const flagMat = new THREE.MeshStandardMaterial({
            map: flagTex,
            roughness: 0.65,
            metalness: 0.02,
            side: THREE.DoubleSide
        });

        // Gently waving 3D flag geometry extending to the Left (-X) of the pole as in the photo
        const flagW = 1.42;
        const flagH = 0.82;
        const flagGeo = new THREE.PlaneGeometry(flagW, flagH, 20, 10);
        const pos = flagGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const distFromPole = (flagW * 0.5) - x; // 0 at pole (+flagW/2), flagW at fly (-flagW/2)
            const waveZ = Math.sin(distFromPole * 4.2) * 0.08 * (distFromPole / flagW);
            const droopY = -0.08 * Math.pow(distFromPole / flagW, 1.3);
            pos.setXYZ(i, x, pos.getY(i) + droopY, waveZ);
        }
        flagGeo.computeVertexNormals();
        const flagMesh = new THREE.Mesh(flagGeo, flagMat);
        flagMesh.position.set(poleX - flagW * 0.5 - 0.03, poleH - flagH * 0.5 - 0.12, poleZ);
        flagMesh.castShadow = true;
        flagMesh.userData = {
            isAnimatedFlag: true,
            flagWidth: flagW,
            flagHeight: flagH,
            hoistSide: 1,
            phaseOffset: 1.15,
            droop: -0.08,
            ampZ: 0.11,
            ampY: 0.025
        };
        arch.add(flagMesh);
    }

    // =========================================================================
    // 7. FRONT YARD, CONCRETE WALKWAYS, FENCES & SIGNS (Terrain-Contoured to Meet Orondo Ave Sidewalk at lz = 11.91m)
    // =========================================================================
    const bldgCx428 = building.center[0];
    const bldgCz428 = building.center[1];
    const sinT428 = 0.80282848;
    const cosT428 = 0.59621006;

    const sample428TerrainLocalY = (lx, lz) => {
        if (typeof getTerrainHeightFn !== 'function') return 0;
        const wx = bldgCx428 + lx * cosT428 + lz * sinT428;
        const wz = bldgCz428 - lx * sinT428 + lz * cosT428;
        return getTerrainHeightFn(wx, wz) - terrainY;
    };

    const buildContoured428Patch = (xMin, xMax, zMin, zMax, xSteps, zSteps, topOffset, mat) => {
        const pos = [];
        const pushQ = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) => {
            pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
            pos.push(ax, ay, az, cx, cy, cz, dx, dy, dz);
        };
        const evalY = (x, z) => sample428TerrainLocalY(x, z) + topOffset;
        for (let ix = 0; ix < xSteps; ix++) {
            const x0 = xMin + (ix / xSteps) * (xMax - xMin);
            const x1 = xMin + ((ix + 1) / xSteps) * (xMax - xMin);
            for (let iz = 0; iz < zSteps; iz++) {
                const z0 = zMin + (iz / zSteps) * (zMax - zMin);
                const z1 = zMin + ((iz + 1) / zSteps) * (zMax - zMin);
                const y00 = evalY(x0, z0);
                const y01 = evalY(x0, z1);
                const y11 = evalY(x1, z1);
                const y10 = evalY(x1, z0);
                const b00 = y00 - 0.50;
                const b01 = y01 - 0.50;
                const b11 = y11 - 0.50;
                const b10 = y10 - 0.50;

                // Top (+Y)
                pushQ(x0, y00, z0, x0, y01, z1, x1, y11, z1, x1, y10, z0);
                if (ix === 0) pushQ(x0, y01, z1, x0, y00, z0, x0, b00, z0, x0, b01, z1);
                if (ix === xSteps - 1) pushQ(x1, y10, z0, x1, y11, z1, x1, b11, z1, x1, b10, z0);
                if (iz === 0) pushQ(x1, y10, z0, x0, y00, z0, x0, b00, z0, x1, b10, z0);
                if (iz === zSteps - 1) pushQ(x0, y01, z1, x1, y11, z1, x1, b11, z1, x0, b01, z1);
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

    // 7A. Central Concrete Walkway (contoured from entry landing at lz = +5.15m down to the Orondo Ave sidewalk at lz = +12.05m)
    buildContoured428Patch(0.77, 2.13, 5.15, 12.05, 2, 16, 0.16, concreteWalkMat);

    // 7B. Left-Side Concrete Walkway (contoured from foot of ADA ramp at lx = -5.55m down to the Orondo Ave sidewalk at lz = +12.05m & back along left side)
    buildContoured428Patch(-6.26, -4.84, 5.05, 12.05, 2, 16, 0.16, concreteWalkMat);
    addBox(1.10, 0.08, 6.20, concreteWalkMat, -6.22, 0.04, 2.20, false);

    // 7C. Dry Golden-Tan Summer Grass Front Yard Panels (contoured across the sloped front yard right up to the inner edge of the Orondo Ave sidewalk at lz = +11.91m)
    // Left front yard patch (between left ramp walkway lx = -4.84m and central walkway lx = +0.77m)
    buildContoured428Patch(-4.84, 0.77, 6.22, 11.91, 10, 14, 0.11, dryYardMat);
    // Right front yard patch (between central walkway lx = +2.13m and right property line lx = +7.50m)
    buildContoured428Patch(2.13, 7.50, 2.90, 11.91, 10, 18, 0.11, dryYardMat);

    // 7D. Two Small White A-Frame Sandwich Board Sidewalk Signs along the Orondo Ave sidewalk edge
    for (const signX of [-3.45, 5.85]) {
        const signY = sample428TerrainLocalY(signX, 12.35) + 0.16;
        const signGrp = new THREE.Group();
        signGrp.position.set(signX, signY, 12.35);
        const board1 = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.76, 0.03), whiteTrimMat);
        board1.position.set(0, 0.36, 0.12);
        board1.rotation.x = -0.22;
        const board2 = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.76, 0.03), whiteTrimMat);
        board2.position.set(0, 0.36, -0.12);
        board2.rotation.x = 0.22;
        signGrp.add(board1, board2);
        arch.add(signGrp);
    }

    // 7E. Left (-X) Weathered Cedar Wood Privacy Fence (along lx = -6.85m, lz = -5.80m..+11.80m)
    {
        const fenceX = -6.85;
        const fenceZMin = -5.80;
        const fenceZMax = 11.80;
        const fenceLen = fenceZMax - fenceZMin;
        const fenceH = 1.82;

        // Main cedar board panel (with deep sub-grade skirt so sloped front yard never leaves a gap)
        addBox(0.08, fenceH + 0.55, fenceLen, cedarFenceMat, fenceX, (fenceH - 0.55) * 0.5, (fenceZMin + fenceZMax) * 0.5);
        // Horizontal backer rails
        addBox(0.12, 0.09, fenceLen, fencePostMat, fenceX + 0.04, 0.42, (fenceZMin + fenceZMax) * 0.5);
        addBox(0.12, 0.09, fenceLen, fencePostMat, fenceX + 0.04, 1.48, (fenceZMin + fenceZMax) * 0.5);
        // Vertical 4x4 dark wood fence posts every ~2.20m
        for (let pz = fenceZMin; pz <= fenceZMax + 0.05; pz += 2.20) {
            addBox(0.15, fenceH + 0.65, 0.15, fencePostMat, fenceX + 0.03, (fenceH - 0.45) * 0.5, pz);
        }
    }

    // 7F. Right (+X) Concrete Retaining Wall & Galvanized Chain-Link Fence bordering the County Parking Lot (lz = -6.50m..+11.80m — 8c976c55.jpg & e522048d.jpg!)
    {
        const curbX = 7.62;
        const curbZMin = -6.50;
        const curbZMax = 11.80;
        const curbLen = curbZMax - curbZMin;
        const curbCz = (curbZMin + curbZMax) * 0.5;

        // Concrete retaining curb wall extending -0.95m below lot grade to retain the sloped front yard above the parking lot
        addBox(0.24, 1.34, curbLen, foundationConcreteMat, curbX, -0.28, curbCz);

        // Galvanized chain-link top rail & vertical posts
        const clFenceH = 1.25;
        const topRail = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, curbLen, 8),
            handrailPipeMat
        );
        topRail.position.set(curbX, 0.36 + clFenceH, curbCz);
        topRail.rotation.x = Math.PI * 0.5;
        arch.add(topRail);

        for (let pz = curbZMin; pz <= curbZMax + 0.05; pz += 2.70) {
            const p = new THREE.Mesh(
                new THREE.CylinderGeometry(0.024, 0.024, clFenceH, 8),
                handrailPipeMat
            );
            p.position.set(curbX, 0.36 + clFenceH * 0.5, pz);
            arch.add(p);
        }

        const chainMeshMat = new THREE.MeshStandardMaterial({
            color: '#b8c0c8',
            roughness: 0.45,
            metalness: 0.65,
            transparent: true,
            opacity: 0.32,
            side: THREE.DoubleSide
        });
        const chainPanel = new THREE.Mesh(new THREE.PlaneGeometry(curbLen, clFenceH), chainMeshMat);
        chainPanel.rotation.y = Math.PI * 0.5;
        chainPanel.position.set(curbX, 0.36 + clFenceH * 0.5, curbCz);
        arch.add(chainPanel);
    }
}

