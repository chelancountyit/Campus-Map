import * as THREE from 'three';

/**
 * Building 350 (Chelan County Courthouse, 350 Orondo Ave) — Photo-Realistic PBR Materials & Procedural Textures
 * Synthesizes authentic textures matching reference photographs:
 * - Smooth light-gray granite ashlar water-table plinth (Floor 1 / Basement)
 * - Rusticated channeled light-gray granite ashlar (Floor 2 / Washington St grade level)
 * - Warm cream/buff architectural terra-cotta (pilasters, belt courses, carved portal, modillion cornice)
 * - Golden-ochre variegated tapestry brick (Floors 3, 4, 5, and roof parapet)
 * - Verdigris patinated copper/bronze spandrels, arched mullions & iron balcony grilles
 * - Carved "COUNTY BUILDING" portal frieze & "Chelan County Courthouse / 350 Orondo Ave." transom
 * - US, POW/MIA, Washington State, and Chelan County flags
 */
export function createBuilding350Materials() {
    // 1. Rusticated Channeled Light-Gray Granite Ashlar Texture (Floor 2 Base)
    const rustGraniteSet = createRusticatedGraniteTextures();
    const rusticatedGraniteMat = new THREE.MeshStandardMaterial({
        map: rustGraniteSet.map,
        bumpMap: rustGraniteSet.bump,
        bumpScale: 0.045,
        roughness: 0.72,
        metalness: 0.06
    });

    // 2. Smooth Light-Gray Granite Ashlar Texture (Floor 1 Basement Water-Table Plinth)
    const smoothGraniteSet = createSmoothGraniteTextures();
    const smoothGraniteMat = new THREE.MeshStandardMaterial({
        map: smoothGraniteSet.map,
        bumpMap: smoothGraniteSet.bump,
        bumpScale: 0.02,
        roughness: 0.68,
        metalness: 0.06
    });

    // 3. Warm Cream/Buff Architectural Terra-Cotta (Pilasters, Belt Courses, Cornice, Portal)
    const terraSet = createTerraCottaTextures();
    const terraCottaMat = new THREE.MeshStandardMaterial({
        map: terraSet.map,
        bumpMap: terraSet.bump,
        bumpScale: 0.022,
        roughness: 0.64,
        metalness: 0.04
    });

    const terraCottaTrimMat = new THREE.MeshStandardMaterial({
        color: '#e6d8c8',
        bumpMap: terraSet.bump,
        bumpScale: 0.015,
        roughness: 0.60,
        metalness: 0.04
    });

    // 4. Golden-Ochre Variegated Tapestry Brick (Floors 3, 4, 5 & Roof Parapet)
    const brickSet = createGoldenTapestryBrickTextures();
    const tapestryBrickMat = new THREE.MeshStandardMaterial({
        map: brickSet.map,
        bumpMap: brickSet.bump,
        bumpScale: 0.038,
        roughness: 0.80,
        metalness: 0.03
    });

    // 5. Verdigris Patinated Copper/Bronze (Courtroom Spandrels, Arched Window Mullions, Balcony Grilles)
    const verdigrisMat = new THREE.MeshStandardMaterial({
        color: '#3f5d4d',
        roughness: 0.52,
        metalness: 0.35
    });

    const verdigrisDarkMat = new THREE.MeshStandardMaterial({
        color: '#2e4639',
        roughness: 0.48,
        metalness: 0.42
    });

    // 6. Dark Bronze / Charcoal Window Frames
    const darkFrameMat = new THREE.MeshStandardMaterial({
        color: '#222629',
        roughness: 0.42,
        metalness: 0.55
    });

    // 7. Reflective Courtroom & Office Window Glass (with warm interior venetian blind/curtain toning & night-time interior glow)
    const glassTex = createCourtroomGlassTexture();
    const glassEmisTex = createCourtroomGlassEmissiveTexture();
    const glassMat = new THREE.MeshStandardMaterial({
        map: glassTex,
        emissive: new THREE.Color('#ffd894'),
        emissiveMap: glassEmisTex,
        emissiveIntensity: 0.0,
        roughness: 0.16,
        metalness: 0.65,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
    });
    glassMat.userData = {
        isNightLitGlass: true,
        maxEmissive: 1.65,
        nightEmissiveHex: '#ffd894'
    };

    // 8. Oak Entrance Doors & Backlit Transom
    const oakDoorMat = new THREE.MeshStandardMaterial({
        color: '#9c5c2b',
        roughness: 0.46,
        metalness: 0.08
    });

    const transomMat = new THREE.MeshStandardMaterial({
        map: createCourthouseTransomTexture(),
        emissive: new THREE.Color('#ffe2a8'),
        emissiveMap: createCourthouseTransomEmissiveTexture(),
        emissiveIntensity: 0.0,
        roughness: 0.25,
        metalness: 0.35
    });
    transomMat.userData = {
        isNightLitGlass: true,
        maxEmissive: 1.45,
        nightEmissiveHex: '#ffe2a8'
    };

    const countyBuildingFriezeMat = new THREE.MeshStandardMaterial({
        map: createCountyBuildingFriezeTexture(),
        bumpMap: createCountyBuildingFriezeTexture(),
        bumpScale: 0.025,
        roughness: 0.58,
        metalness: 0.04
    });

    const chelanCourthouseParapetMat = new THREE.MeshStandardMaterial({
        map: createChelanCourthouseParapetTexture(),
        bumpMap: createChelanCourthouseParapetTexture(),
        bumpScale: 0.025,
        roughness: 0.58,
        metalness: 0.04
    });

    const securityFenceSlatMat = new THREE.MeshStandardMaterial({
        map: createSecurityFenceSlatTexture(),
        roughness: 0.72,
        metalness: 0.15,
        side: THREE.DoubleSide
    });

    const shieldCartoucheMat = new THREE.MeshStandardMaterial({
        map: createShieldCartoucheTexture(),
        bumpMap: createShieldCartoucheTexture(),
        bumpScale: 0.035,
        roughness: 0.60,
        metalness: 0.04
    });

    // 9. Horizontal-Ribbed Architectural Concrete Monument Wall & Stairs
    const ribbedConcSet = createRibbedConcreteTextures();
    const ribbedConcreteMat = new THREE.MeshStandardMaterial({
        map: ribbedConcSet.map,
        bumpMap: ribbedConcSet.bump,
        bumpScale: 0.04,
        roughness: 0.82,
        metalness: 0.04
    });

    // Same architectural sidewalk/plaza concrete material used on Building 316 & Building 400
    const concreteWalkMat = new THREE.MeshStandardMaterial({
        color: '#e2dcd0',
        roughness: 0.86,
        metalness: 0.03,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
    });

    const curbYellowMat = new THREE.MeshStandardMaterial({
        color: '#e5b832',
        roughness: 0.68,
        metalness: 0.05
    });

    // 10. Dry-Stacked Multi-Color Fieldstone Retaining Wall
    const fieldstoneSet = createFieldstoneTextures();
    const fieldstoneMat = new THREE.MeshStandardMaterial({
        map: fieldstoneSet.map,
        bumpMap: fieldstoneSet.bump,
        bumpScale: 0.055,
        roughness: 0.88,
        metalness: 0.03
    });

    // 11. Roof Membrane & Rooftop Mechanical Materials (matched to Building 401's #dfe3e8 roofMembraneMat)
    const whiteRoofMat = new THREE.MeshStandardMaterial({
        color: '#dfe3e8',
        roughness: 0.78,
        metalness: 0.05
    });

    const pipeHandrailMat = new THREE.MeshStandardMaterial({
        color: '#b8c0c8',
        roughness: 0.32,
        metalness: 0.78
    });

    const flagpoleMat = new THREE.MeshStandardMaterial({
        color: '#d8dee4',
        roughness: 0.25,
        metalness: 0.82
    });

    // 12. Flag Materials (DoubleSide)
    const usFlagMat = new THREE.MeshStandardMaterial({
        map: createUSFlagTexture(),
        roughness: 0.65,
        metalness: 0.02,
        side: THREE.DoubleSide
    });

    const powFlagMat = new THREE.MeshStandardMaterial({
        map: createPOWFlagTexture(),
        roughness: 0.68,
        metalness: 0.02,
        side: THREE.DoubleSide
    });

    const waFlagMat = new THREE.MeshStandardMaterial({
        map: createWAFlagTexture(),
        roughness: 0.65,
        metalness: 0.02,
        side: THREE.DoubleSide
    });

    const countyFlagMat = new THREE.MeshStandardMaterial({
        map: createCountyFlagTexture(),
        roughness: 0.65,
        metalness: 0.02,
        side: THREE.DoubleSide
    });

    const doorsLockedSignMat = new THREE.MeshStandardMaterial({
        map: createDoorsLockedSignTexture(),
        roughness: 0.52,
        metalness: 0.04,
        side: THREE.DoubleSide
    });

    const parkDoorMat = new THREE.MeshStandardMaterial({
        color: '#9b958b',
        roughness: 0.48,
        metalness: 0.14
    });

    return {
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
        parkDoorMat,
        transomMat,
        countyBuildingFriezeMat,
        chelanCourthouseParapetMat,
        securityFenceSlatMat,
        shieldCartoucheMat,
        ribbedConcreteMat,
        concreteWalkMat,
        curbYellowMat,
        fieldstoneMat,
        whiteRoofMat,
        pipeHandrailMat,
        flagpoleMat,
        usFlagMat,
        powFlagMat,
        waFlagMat,
        countyFlagMat,
        doorsLockedSignMat
    };
}

function createRusticatedGraniteTextures() {
    const w = 512, h = 512;
    const diff = document.createElement('canvas');
    const bump = document.createElement('canvas');
    diff.width = bump.width = w;
    diff.height = bump.height = h;
    const dCtx = diff.getContext('2d');
    const bCtx = bump.getContext('2d');

    dCtx.fillStyle = '#c2c8ce';
    dCtx.fillRect(0, 0, w, h);
    bCtx.fillStyle = '#d0d0d0';
    bCtx.fillRect(0, 0, w, h);

    // Fine salt-and-pepper granite crystalline speckle
    for (let i = 0; i < 14000; i++) {
        const x = (i * 73) % w;
        const y = (i * 139) % h;
        const v = i % 3 === 0 ? 'rgba(250,252,255,0.22)' : (i % 3 === 1 ? 'rgba(65,72,80,0.20)' : 'rgba(130,140,150,0.16)');
        dCtx.fillStyle = v;
        dCtx.fillRect(x, y, 2, 2);
    }

    // 7 deep horizontal rustication channels per tile
    const courses = 7;
    const courseH = h / courses;
    for (let r = 0; r < courses; r++) {
        const y = Math.round(r * courseH);
        // Subtle per-course stone tint
        dCtx.fillStyle = r % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
        dCtx.fillRect(0, y, w, courseH);

        // Staggered vertical joints (3 blocks per width)
        const cols = 3;
        const colW = w / cols;
        const offset = (r % 2) * (colW * 0.5);
        for (let c = 0; c <= cols; c++) {
            const vx = Math.round((c * colW + offset) % w);
            dCtx.fillStyle = '#7e858c';
            dCtx.fillRect(vx - 2, y, 4, courseH);
            bCtx.fillStyle = '#404040';
            bCtx.fillRect(vx - 2, y, 4, courseH);
        }

        // Deep horizontal rusticated shadow channel + bottom highlight bevel
        dCtx.fillStyle = '#636a72';
        dCtx.fillRect(0, y, w, 7);
        dCtx.fillStyle = '#dde2e6';
        dCtx.fillRect(0, y + 7, w, 3);

        bCtx.fillStyle = '#181818';
        bCtx.fillRect(0, y, w, 8);
        bCtx.fillStyle = '#ffffff';
        bCtx.fillRect(0, y + 8, w, 4);
    }

    const map = new THREE.CanvasTexture(diff);
    const bumpTex = new THREE.CanvasTexture(bump);
    map.wrapS = map.wrapT = bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;
    map.repeat.set(4, 1);
    bumpTex.repeat.set(4, 1);
    map.colorSpace = THREE.SRGBColorSpace;
    return { map, bump: bumpTex };
}

function createSmoothGraniteTextures() {
    const w = 256, h = 256;
    const diff = document.createElement('canvas');
    const bump = document.createElement('canvas');
    diff.width = bump.width = w;
    diff.height = bump.height = h;
    const dCtx = diff.getContext('2d');
    const bCtx = bump.getContext('2d');

    dCtx.fillStyle = '#b9bfc6';
    dCtx.fillRect(0, 0, w, h);
    bCtx.fillStyle = '#b0b0b0';
    bCtx.fillRect(0, 0, w, h);

    for (let i = 0; i < 6000; i++) {
        dCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(60,66,74,0.18)';
        dCtx.fillRect((i * 59) % w, (i * 113) % h, 2, 2);
    }

    // Fine ashlar joints
    dCtx.strokeStyle = 'rgba(95,102,110,0.45)';
    dCtx.lineWidth = 2;
    bCtx.strokeStyle = '#606060';
    bCtx.lineWidth = 2;
    for (let y = 0; y < h; y += 64) {
        dCtx.beginPath(); dCtx.moveTo(0, y); dCtx.lineTo(w, y); dCtx.stroke();
        bCtx.beginPath(); bCtx.moveTo(0, y); bCtx.lineTo(w, y); bCtx.stroke();
        const off = ((y / 64) % 2) * 64;
        for (let x = off; x < w; x += 128) {
            dCtx.beginPath(); dCtx.moveTo(x, y); dCtx.lineTo(x, y + 64); dCtx.stroke();
            bCtx.beginPath(); bCtx.moveTo(x, y); bCtx.lineTo(x, y + 64); bCtx.stroke();
        }
    }

    const map = new THREE.CanvasTexture(diff);
    const bumpTex = new THREE.CanvasTexture(bump);
    map.wrapS = map.wrapT = bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;
    map.repeat.set(4, 2);
    bumpTex.repeat.set(4, 2);
    map.colorSpace = THREE.SRGBColorSpace;
    return { map, bump: bumpTex };
}

function createTerraCottaTextures() {
    const w = 256, h = 256;
    const diff = document.createElement('canvas');
    const bump = document.createElement('canvas');
    diff.width = bump.width = w;
    diff.height = bump.height = h;
    const dCtx = diff.getContext('2d');
    const bCtx = bump.getContext('2d');

    dCtx.fillStyle = '#e3d4c4';
    dCtx.fillRect(0, 0, w, h);
    bCtx.fillStyle = '#909090';
    bCtx.fillRect(0, 0, w, h);

    for (let i = 0; i < 3000; i++) {
        dCtx.fillStyle = i % 2 === 0 ? 'rgba(255,248,238,0.12)' : 'rgba(145,120,98,0.10)';
        dCtx.fillRect((i * 47) % w, (i * 97) % h, 3, 2);
    }

    // Subtle terra-cotta block joints
    dCtx.strokeStyle = 'rgba(150, 130, 112, 0.35)';
    dCtx.lineWidth = 2;
    bCtx.strokeStyle = '#606060';
    bCtx.lineWidth = 2;
    for (let y = 32; y < h; y += 32) {
        dCtx.beginPath(); dCtx.moveTo(0, y); dCtx.lineTo(w, y); dCtx.stroke();
        bCtx.beginPath(); bCtx.moveTo(0, y); bCtx.lineTo(w, y); bCtx.stroke();
    }

    const map = new THREE.CanvasTexture(diff);
    const bumpTex = new THREE.CanvasTexture(bump);
    map.wrapS = map.wrapT = bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;
    map.colorSpace = THREE.SRGBColorSpace;
    return { map, bump: bumpTex };
}

function createGoldenTapestryBrickTextures() {
    const w = 512, h = 512;
    const diff = document.createElement('canvas');
    const bump = document.createElement('canvas');
    diff.width = bump.width = w;
    diff.height = bump.height = h;
    const dCtx = diff.getContext('2d');
    const bCtx = bump.getContext('2d');

    // Warm cream-tan mortar bed
    dCtx.fillStyle = '#cbbba6';
    dCtx.fillRect(0, 0, w, h);
    bCtx.fillStyle = '#404040';
    bCtx.fillRect(0, 0, w, h);

    const palette = ['#b88450', '#c4925e', '#a67342', '#cc9c68', '#986638', '#bd8b56', '#d1a370'];
    const rows = 32;
    const cols = 12;
    const rowH = h / rows;
    const colW = w / cols;

    for (let r = 0; r < rows; r++) {
        const offset = (r % 2) * (colW * 0.5);
        for (let c = -1; c <= cols; c++) {
            const bx = c * colW + offset;
            const by = r * rowH;
            const idx = Math.abs((r * 17 + c * 31) % palette.length);
            dCtx.fillStyle = palette[idx];
            dCtx.fillRect(bx + 1.5, by + 1.5, colW - 3, rowH - 3);

            // Tapestry brick texture striation
            dCtx.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,235,205,0.08)' : 'rgba(60,35,15,0.09)';
            dCtx.fillRect(bx + 2, by + 3, colW - 4, rowH * 0.4);

            bCtx.fillStyle = '#c8c8c8';
            bCtx.fillRect(bx + 1.5, by + 1.5, colW - 3, rowH - 3);
        }
    }

    const map = new THREE.CanvasTexture(diff);
    const bumpTex = new THREE.CanvasTexture(bump);
    map.wrapS = map.wrapT = bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;
    map.repeat.set(3, 3);
    bumpTex.repeat.set(3, 3);
    map.colorSpace = THREE.SRGBColorSpace;
    return { map, bump: bumpTex };
}

function createCourtroomGlassTexture() {
    const can = document.createElement('canvas');
    can.width = 256;
    can.height = 256;
    const ctx = can.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, '#445560');
    grad.addColorStop(0.45, '#687982');
    grad.addColorStop(0.55, '#8c8878'); // Subtle warm interior reflection / blind tone
    grad.addColorStop(1.0, '#3a464e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Subtle venetian blind horizontal slats in upper half
    ctx.fillStyle = 'rgba(215, 208, 190, 0.16)';
    for (let y = 12; y < 140; y += 8) {
        ctx.fillRect(8, y, 240, 3);
    }

    const tex = new THREE.CanvasTexture(can);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createCourtroomGlassEmissiveTexture() {
    const can = document.createElement('canvas');
    can.width = 256;
    can.height = 256;
    const ctx = can.getContext('2d');

    // Warm interior courtroom/office ceiling & chandelier glow
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, '#ffd484');
    grad.addColorStop(0.45, '#ffeaad');
    grad.addColorStop(0.55, '#fff3c8');
    grad.addColorStop(1.0, '#ffbe66');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Subtle warm venetian blind slats in upper sash + dark perimeter shadow frame
    ctx.fillStyle = 'rgba(135, 88, 34, 0.26)';
    for (let y = 14; y < 132; y += 8) {
        ctx.fillRect(8, y, 240, 3);
    }
    ctx.strokeStyle = '#382410';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 248);

    const tex = new THREE.CanvasTexture(can);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createCourthouseTransomTexture() {
    const can = document.createElement('canvas');
    can.width = 512;
    can.height = 192;
    const ctx = can.getContext('2d');

    ctx.fillStyle = '#24332c';
    ctx.fillRect(0, 0, 512, 192);

    ctx.strokeStyle = '#385245';
    ctx.lineWidth = 10;
    ctx.strokeRect(6, 6, 500, 180);

    ctx.fillStyle = '#d8be72';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 30px Georgia, "Times New Roman", serif';
    ctx.fillText('Chelan County Courthouse', 256, 74);
    ctx.font = 'bold 26px Georgia, "Times New Roman", serif';
    ctx.fillText('350 Orondo Ave.', 256, 126);

    const tex = new THREE.CanvasTexture(can);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createCourthouseTransomEmissiveTexture() {
    const can = document.createElement('canvas');
    can.width = 512;
    can.height = 192;
    const ctx = can.getContext('2d');

    const grad = ctx.createRadialGradient(256, 96, 18, 256, 96, 260);
    grad.addColorStop(0.0, '#fff2c6');
    grad.addColorStop(0.65, '#ffd88a');
    grad.addColorStop(1.0, '#7a5220');
    ctx.fillStyle = grad;
    ctx.fillRect(10, 10, 492, 172);

    ctx.fillStyle = '#fff9e2';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 30px Georgia, "Times New Roman", serif';
    ctx.fillText('Chelan County Courthouse', 256, 74);
    ctx.font = 'bold 26px Georgia, "Times New Roman", serif';
    ctx.fillText('350 Orondo Ave.', 256, 126);

    const tex = new THREE.CanvasTexture(can);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createCountyBuildingFriezeTexture() {
    const can = document.createElement('canvas');
    can.width = 512;
    can.height = 96;
    const ctx = can.getContext('2d');

    ctx.fillStyle = '#e3d4c4';
    ctx.fillRect(0, 0, 512, 96);

    ctx.strokeStyle = '#b59f89';
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, 496, 80);

    ctx.fillStyle = '#8b7765';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 38px Georgia, "Times New Roman", serif';
    ctx.fillText('COUNTY BUILDING', 256, 50);

    const tex = new THREE.CanvasTexture(can);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createChelanCourthouseParapetTexture() {
    const can = document.createElement('canvas');
    can.width = 1024;
    can.height = 128;
    const ctx = can.getContext('2d');

    ctx.fillStyle = '#e3d4c4';
    ctx.fillRect(0, 0, 1024, 128);

    ctx.strokeStyle = '#b59f89';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 1004, 108);

    ctx.fillStyle = '#867260';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 36px Georgia, "Times New Roman", serif';
    ctx.fillText('CHELAN     COUNTY     COURT     HOUSE', 512, 66);

    const tex = new THREE.CanvasTexture(can);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createSecurityFenceSlatTexture() {
    const can = document.createElement('canvas');
    can.width = 256;
    can.height = 256;
    const ctx = can.getContext('2d');

    ctx.fillStyle = '#e4e7ec';
    ctx.fillRect(0, 0, 256, 256);

    // Vertical white privacy slats with chain-link diamond hints in between (matching 0cf908f6.jpg & 9915b876.jpg)
    for (let x = 0; x < 256; x += 8) {
        ctx.fillStyle = '#f2f4f7';
        ctx.fillRect(x + 1, 0, 5, 256);
        ctx.fillStyle = '#6c747e';
        ctx.fillRect(x + 6, 0, 2, 256);
    }
    ctx.strokeStyle = 'rgba(70, 78, 88, 0.28)';
    ctx.lineWidth = 2;
    for (let y = 0; y < 256; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(can);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 1);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createShieldCartoucheTexture() {
    const can = document.createElement('canvas');
    can.width = 256;
    can.height = 256;
    const ctx = can.getContext('2d');

    ctx.fillStyle = '#e3d4c4';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#b09a84';
    ctx.lineWidth = 10;
    ctx.strokeRect(12, 12, 232, 232);

    // Carved classical shield in center
    ctx.fillStyle = '#d5c3b0';
    ctx.strokeStyle = '#99826c';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(64, 52);
    ctx.lineTo(192, 52);
    ctx.lineTo(192, 130);
    ctx.quadraticCurveTo(192, 195, 128, 216);
    ctx.quadraticCurveTo(64, 195, 64, 130);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const tex = new THREE.CanvasTexture(can);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createRibbedConcreteTextures() {
    const w = 256, h = 256;
    const diff = document.createElement('canvas');
    const bump = document.createElement('canvas');
    diff.width = bump.width = w;
    diff.height = bump.height = h;
    const dCtx = diff.getContext('2d');
    const bCtx = bump.getContext('2d');

    dCtx.fillStyle = '#b8b4aa';
    dCtx.fillRect(0, 0, w, h);
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, w, h);

    // 5 prominent horizontal architectural concrete ribs (as seen on the monument wall in 6c671f3a.jpg)
    for (let y = 24; y < h; y += 44) {
        dCtx.fillStyle = '#827e75';
        dCtx.fillRect(0, y, w, 10);
        dCtx.fillStyle = '#d0ccc2';
        dCtx.fillRect(0, y + 10, w, 6);

        bCtx.fillStyle = '#252525';
        bCtx.fillRect(0, y, w, 10);
        bCtx.fillStyle = '#e5e5e5';
        bCtx.fillRect(0, y + 10, w, 6);
    }

    const map = new THREE.CanvasTexture(diff);
    const bumpTex = new THREE.CanvasTexture(bump);
    map.wrapS = map.wrapT = bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;
    map.repeat.set(3, 1);
    bumpTex.repeat.set(3, 1);
    map.colorSpace = THREE.SRGBColorSpace;
    return { map, bump: bumpTex };
}

function createBrushedConcreteTexture() {
    const can = document.createElement('canvas');
    can.width = 512;
    can.height = 512;
    const ctx = can.getContext('2d');
    ctx.fillStyle = '#ccc6bc';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 4000; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(65,60,54,0.06)';
        ctx.fillRect((i * 67) % 512, (i * 131) % 512, 5, 2);
    }

    ctx.strokeStyle = 'rgba(85, 80, 72, 0.35)';
    ctx.lineWidth = 2;
    for (let g = 128; g < 512; g += 128) {
        ctx.beginPath();
        ctx.moveTo(g, 0); ctx.lineTo(g, 512);
        ctx.moveTo(0, g); ctx.lineTo(512, g);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(can);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createFieldstoneTextures() {
    const w = 256, h = 128;
    const diff = document.createElement('canvas');
    const bump = document.createElement('canvas');
    diff.width = bump.width = w;
    diff.height = bump.height = h;
    const dCtx = diff.getContext('2d');
    const bCtx = bump.getContext('2d');

    dCtx.fillStyle = '#4e4942';
    dCtx.fillRect(0, 0, w, h);
    bCtx.fillStyle = '#202020';
    bCtx.fillRect(0, 0, w, h);

    const colors = ['#8c857b', '#a89278', '#75787c', '#9e8268', '#68645e', '#b5a692'];
    for (let r = 0; r < 5; r++) {
        let x = (r % 2) * 14;
        const y = r * 25 + 2;
        while (x < w) {
            const sw = 28 + ((x * 13 + r * 29) % 24);
            const sh = 20;
            dCtx.fillStyle = colors[(x + r) % colors.length];
            dCtx.beginPath();
            dCtx.roundRect(x + 2, y, sw - 4, sh, 5);
            dCtx.fill();

            bCtx.fillStyle = '#dcdcdc';
            bCtx.beginPath();
            bCtx.roundRect(x + 2, y, sw - 4, sh, 5);
            bCtx.fill();
            x += sw;
        }
    }

    const map = new THREE.CanvasTexture(diff);
    const bumpTex = new THREE.CanvasTexture(bump);
    map.wrapS = map.wrapT = bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;
    map.repeat.set(4, 1);
    bumpTex.repeat.set(4, 1);
    map.colorSpace = THREE.SRGBColorSpace;
    return { map, bump: bumpTex };
}

function createUSFlagTexture() {
    const can = document.createElement('canvas');
    can.width = 256;
    can.height = 144;
    const ctx = can.getContext('2d');
    const stripeH = 144 / 13;
    for (let i = 0; i < 13; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#b22234' : '#ffffff';
        ctx.fillRect(0, i * stripeH, 256, stripeH + 0.5);
    }
    ctx.fillStyle = '#3c3b6e';
    ctx.fillRect(0, 0, 104, stripeH * 7);
    ctx.fillStyle = '#ffffff';
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 6; c++) {
            ctx.fillRect(10 + c * 16, 8 + r * 14, 4, 4);
        }
    }
    const tex = new THREE.CanvasTexture(can);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createPOWFlagTexture() {
    const can = document.createElement('canvas');
    can.width = 192;
    can.height = 112;
    const ctx = can.getContext('2d');
    ctx.fillStyle = '#181a1c';
    ctx.fillRect(0, 0, 192, 112);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(96, 56, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POW * MIA', 96, 20);
    const tex = new THREE.CanvasTexture(can);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createWAFlagTexture() {
    const can = document.createElement('canvas');
    can.width = 256;
    can.height = 144;
    const ctx = can.getContext('2d');
    ctx.fillStyle = '#006847';
    ctx.fillRect(0, 0, 256, 144);
    ctx.fillStyle = '#8ecae6';
    ctx.strokeStyle = '#e9c46a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(128, 72, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const tex = new THREE.CanvasTexture(can);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createCountyFlagTexture() {
    const can = document.createElement('canvas');
    can.width = 256;
    can.height = 144;
    const ctx = can.getContext('2d');
    ctx.fillStyle = '#f6f6f4';
    ctx.fillRect(0, 0, 256, 144);
    ctx.strokeStyle = '#b22234';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(128, 72, 38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#264653';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('CHELAN COUNTY', 128, 76);
    const tex = new THREE.CanvasTexture(can);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createDoorsLockedSignTexture() {
    const can = document.createElement('canvas');
    can.width = 512;
    can.height = 192;
    const ctx = can.getContext('2d');

    // Warm off-white vinyl banner background with side grey frame sleeves (e637f636.jpg, 45990f7d.jpg)
    ctx.fillStyle = '#c4c2bc';
    ctx.fillRect(0, 0, 512, 192);
    ctx.fillStyle = '#f4f3ee';
    ctx.fillRect(42, 8, 428, 176);

    ctx.strokeStyle = '#b5b2aa';
    ctx.lineWidth = 4;
    ctx.strokeRect(42, 8, 428, 176);

    ctx.fillStyle = '#2c2f33';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 34px Arial, Helvetica, sans-serif';
    ctx.fillText('(NO PUBLIC ACCESS)', 256, 66);
    ctx.font = 'bold 42px Arial, Helvetica, sans-serif';
    ctx.fillText('DOORS LOCKED', 256, 130);

    const tex = new THREE.CanvasTexture(can);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}


