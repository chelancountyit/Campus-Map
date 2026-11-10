import * as THREE from 'three';

/**
 * Procedural PBR Materials & Canvas Textures for Building 401 (Law & Justice / Regional Justice Center, 401 Washington St)
 * Modeled directly from reference photographs:
 * - f17b4121.jpg, f0a3a41e.jpg, 109ba9fd.jpg (Washington St brick sidewall, twin security window bands,
 *   5th-floor clerestory & light-grey precast fascia, NW cylindrical concrete tower, and 401/350 precast connector)
 * - 7871898b.jpg, e4286399.jpg, 7099590c.jpg, 785542cb.jpg (Overhead views of the two-tone red-brick paver &
 *   concrete sidewalk, dark basalt gravel bed, tan-slatted fence compound with teal generator, utility bay,
 *   3 concrete benches, 6 black bollards, blue mailbox, and twin-bar crosswalks)
 */
export function createBuilding401Materials(foundry) {
    const brickMaps = _createRunningBondBrickTextures('#926246', '#7a4f36', '#b8afa4');
    const brickWallMat = new THREE.MeshStandardMaterial({
        map: brickMaps.map,
        bumpMap: brickMaps.bumpMap,
        bumpScale: 0.022,
        roughness: 0.84,
        metalness: 0.04
    });

    const precastMaps = _createPrecastPanelTextures('#b7b6af', '#8e8f89');
    const precastPanelMat = new THREE.MeshStandardMaterial({
        map: precastMaps.map,
        roughnessMap: precastMaps.roughnessMap,
        bumpMap: precastMaps.bumpMap,
        bumpScale: 0.012,
        roughness: 0.88,
        metalness: 0.02
    });

    const cylinderMaps = _createCylindricalConcreteTextures('#aaa99f', '#85867f');
    const cylindricalTowerMat = new THREE.MeshStandardMaterial({
        map: cylinderMaps.map,
        bumpMap: cylinderMaps.bumpMap,
        bumpScale: 0.012,
        roughness: 0.88,
        metalness: 0.02
    });

    const concretePlinthMat = new THREE.MeshStandardMaterial({
        color: '#b8b5ad',
        roughness: 0.86,
        metalness: 0.04
    });

    const copingDarkMat = new THREE.MeshStandardMaterial({
        color: '#32363b',
        roughness: 0.46,
        metalness: 0.52
    });

    const roofMembraneMat = new THREE.MeshStandardMaterial({
        color: '#dfe3e8',
        roughness: 0.78,
        metalness: 0.05
    });

    // Night-lit window materials (automatically illuminated at dusk/night by _updateBuildingNightLights)
    const darkSecurityGlassMat = new THREE.MeshStandardMaterial({
        color: '#1b242c',
        roughness: 0.14,
        metalness: 0.78,
        emissive: new THREE.Color('#ffcf84'),
        emissiveIntensity: 0.05
    });
    darkSecurityGlassMat.userData = {
        isNightLitGlass: true,
        nightEmissiveHex: '#ffcf84',
        maxEmissive: 1.35
    };

    const frostedSecurityGlassMat = new THREE.MeshStandardMaterial({
        color: '#8e98a0',
        roughness: 0.28,
        metalness: 0.35,
        emissive: new THREE.Color('#ffe2a8'),
        emissiveIntensity: 0.08
    });
    frostedSecurityGlassMat.userData = {
        isNightLitGlass: true,
        nightEmissiveHex: '#ffe2a8',
        maxEmissive: 1.45
    };

    const clerestoryGlassMat = new THREE.MeshStandardMaterial({
        color: '#18222b',
        roughness: 0.12,
        metalness: 0.82,
        emissive: new THREE.Color('#ffd48a'),
        emissiveIntensity: 0.06
    });
    clerestoryGlassMat.userData = {
        isNightLitGlass: true,
        nightEmissiveHex: '#ffd48a',
        maxEmissive: 1.40
    };

    const darkBronzeFrameMat = new THREE.MeshStandardMaterial({
        color: '#25282c',
        roughness: 0.42,
        metalness: 0.58
    });

    const louverDarkMat = new THREE.MeshStandardMaterial({
        color: '#202428',
        roughness: 0.55,
        metalness: 0.48
    });

    // Sidewalk & Grounds Materials
    const redBrickPaverMat = _createRedBrickPaverMaterial();

    const concreteSidewalkMat = new THREE.MeshStandardMaterial({
        color: '#e2dcd0',
        roughness: 0.86,
        metalness: 0.03,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
    });

    const whiteConcreteApronMat = new THREE.MeshStandardMaterial({
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

    const whiteCurbMat = new THREE.MeshStandardMaterial({
        color: '#f2eee6',
        roughness: 0.75,
        metalness: 0.04,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
    });

    const yellowCurbMat = new THREE.MeshStandardMaterial({
        color: '#eab308',
        roughness: 0.48,
        metalness: 0.12
    });

    const tactilePadMat = new THREE.MeshStandardMaterial({
        color: '#7e3b31',
        roughness: 0.78,
        metalness: 0.08
    });

    const basaltGravelMat = _createGravelMaterial('#2a2d32', '#1d1f23', '#383c42');
    const peaGravelMat = _createGravelMaterial('#767874', '#5e605c', '#8e908b');

    const tanFenceSlatMat = _createTanSlattedFenceMaterial();
    const chainLinkGateMat = _createChainLinkGateMaterial();

    const blackMetalMat = new THREE.MeshStandardMaterial({
        color: '#1c2024',
        roughness: 0.38,
        metalness: 0.68
    });

    const silverMetalMat = new THREE.MeshStandardMaterial({
        color: '#cfd5dc',
        roughness: 0.32,
        metalness: 0.75
    });

    const whiteMetalMat = new THREE.MeshStandardMaterial({
        color: '#f1f4f7',
        roughness: 0.38,
        metalness: 0.22
    });

    const tealGeneratorMat = new THREE.MeshStandardMaterial({
        color: '#1f9e86',
        roughness: 0.42,
        metalness: 0.38
    });

    const tealLouverTopMat = _createGeneratorTopTextureMaterial();

    const oliveTransformerMat = new THREE.MeshStandardMaterial({
        color: '#5a6351',
        roughness: 0.52,
        metalness: 0.36
    });

    const yellowGreenBoxMat = new THREE.MeshStandardMaterial({
        color: '#95a33c',
        roughness: 0.50,
        metalness: 0.32
    });

    const fireHydrantRedMat = new THREE.MeshStandardMaterial({
        color: '#cc2929',
        roughness: 0.38,
        metalness: 0.35
    });

    const uspsBlueMat = _createUspsMailboxMaterial();

    const concreteBenchMat = new THREE.MeshStandardMaterial({
        color: '#c9c6be',
        roughness: 0.80,
        metalness: 0.04
    });

    const shrubGreenMat = new THREE.MeshStandardMaterial({
        color: '#3f6a34',
        roughness: 0.88,
        metalness: 0.02
    });

    const directoryWoodMat = new THREE.MeshStandardMaterial({
        color: '#8c6239',
        roughness: 0.62,
        metalness: 0.12
    });

    const directoryBoardMat = _createDirectoryBoardMaterial();
    const pedCrossingSignMat = _createPedCrossingSignMaterial();
    const noParkingSignMat = _createNoParkingSignMaterial();
    const evidenceConcreteMat = _createEvidenceConcreteMaterial();
    const swRibbedSidingMat = _createSwRibbedSidingMaterial();
    const circularLouverMat = _createCircularLouverMaterial();
    const lawEnforcementArrowSignMat = _createLawEnforcementArrowSignMaterial();

    const crosswalkWhiteMat = new THREE.MeshStandardMaterial({
        color: '#f1f5f9',
        roughness: 0.72,
        metalness: 0.02,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
    });

    return {
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
        evidenceConcreteMat,
        swRibbedSidingMat,
        circularLouverMat,
        lawEnforcementArrowSignMat,
        crosswalkWhiteMat
    };
}

function _createRunningBondBrickTextures(baseHex, darkHex, mortarHex) {
    const w = 512, h = 512;
    const diffCan = document.createElement('canvas');
    const bumpCan = document.createElement('canvas');
    diffCan.width = bumpCan.width = w;
    diffCan.height = bumpCan.height = h;
    const dCtx = diffCan.getContext('2d');
    const bCtx = bumpCan.getContext('2d');

    dCtx.fillStyle = mortarHex;
    dCtx.fillRect(0, 0, w, h);
    bCtx.fillStyle = '#383838';
    bCtx.fillRect(0, 0, w, h);

    const baseCol = new THREE.Color(baseHex);
    const darkCol = new THREE.Color(darkHex);
    const rows = 32;
    const cols = 12;
    const rowH = h / rows;
    const colW = w / cols;

    for (let r = 0; r < rows; r++) {
        const offset = (r % 2) * (colW * 0.5);
        for (let c = -1; c <= cols; c++) {
            const x = c * colW + offset;
            const y = r * rowH;
            const hash = Math.abs(Math.sin(r * 31.7 + c * 73.1) * 43758.5453) % 1;
            const col = baseCol.clone().lerp(darkCol, hash * 0.42);
            dCtx.fillStyle = `#${col.getHexString()}`;
            dCtx.fillRect(x + 1.4, y + 1.4, colW - 2.8, rowH - 2.8);

            bCtx.fillStyle = '#c8c8c8';
            bCtx.fillRect(x + 1.6, y + 1.6, colW - 3.2, rowH - 3.2);
        }
    }

    const map = new THREE.CanvasTexture(diffCan);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(8, 3);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;

    const bumpMap = new THREE.CanvasTexture(bumpCan);
    bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
    bumpMap.repeat.set(8, 3);
    bumpMap.anisotropy = 8;

    return { map, bumpMap };
}

function _createPrecastPanelTextures(baseHex, jointHex) {
    const w = 1024, h = 512;
    const diffCan = document.createElement('canvas');
    const bumpCan = document.createElement('canvas');
    const roughCan = document.createElement('canvas');
    diffCan.width = bumpCan.width = roughCan.width = w;
    diffCan.height = bumpCan.height = roughCan.height = h;
    const dCtx = diffCan.getContext('2d');
    const bCtx = bumpCan.getContext('2d');
    const rCtx = roughCan.getContext('2d');

    dCtx.fillStyle = baseHex;
    dCtx.fillRect(0, 0, w, h);
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, w, h);
    rCtx.fillStyle = '#e2e2e2';
    rCtx.fillRect(0, 0, w, h);

    // Fine, low-contrast aggregate and weathering based on the campus photo survey.
    for (let i = 0; i < 12000; i++) {
        const x = (i * 79) % w;
        const y = (i * 131) % h;
        const grain = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
        const shade = Math.round(112 + grain * 48);
        dCtx.fillStyle = grain > 0.5
            ? 'rgba(255,255,255,0.035)'
            : 'rgba(62,64,61,0.035)';
        dCtx.fillRect(x, y, 2 + (i % 3), 1 + (i % 2));
        bCtx.fillStyle = `rgb(${shade},${shade},${shade})`;
        bCtx.fillRect(x, y, 2 + (i % 3), 1 + (i % 2));
        rCtx.fillStyle = grain > 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(40,40,40,0.12)';
        rCtx.fillRect(x, y, 3, 2);
    }

    // Recessed, lightly weathered reveals between the large precast panels.
    for (let x = 0; x < w; x += 256) {
        dCtx.fillStyle = jointHex;
        dCtx.fillRect(x, 0, 3, h);
        dCtx.fillStyle = 'rgba(255,255,255,0.24)';
        dCtx.fillRect(x + 3, 0, 2, h);
        bCtx.fillStyle = '#444444';
        bCtx.fillRect(x, 0, 3, h);
        bCtx.fillStyle = '#a0a0a0';
        bCtx.fillRect(x + 3, 0, 2, h);
    }
    dCtx.fillStyle = jointHex;
    dCtx.fillRect(w - 3, 0, 3, h);
    dCtx.fillStyle = 'rgba(255,255,255,0.24)';
    dCtx.fillRect(w - 5, 0, 2, h);
    bCtx.fillStyle = '#444444';
    bCtx.fillRect(w - 3, 0, 3, h);
    bCtx.fillStyle = '#a0a0a0';
    bCtx.fillRect(w - 5, 0, 2, h);

    for (let y = 0; y < h; y += 256) {
        dCtx.fillStyle = jointHex;
        dCtx.fillRect(0, y, w, 3);
        dCtx.fillStyle = 'rgba(255,255,255,0.22)';
        dCtx.fillRect(0, y + 3, w, 2);
        bCtx.fillStyle = '#484848';
        bCtx.fillRect(0, y, w, 3);
        bCtx.fillStyle = '#9a9a9a';
        bCtx.fillRect(0, y + 3, w, 2);
    }
    dCtx.fillStyle = jointHex;
    dCtx.fillRect(0, h - 3, w, 3);
    dCtx.fillStyle = 'rgba(255,255,255,0.22)';
    dCtx.fillRect(0, h - 5, w, 2);
    bCtx.fillStyle = '#484848';
    bCtx.fillRect(0, h - 3, w, 3);
    bCtx.fillStyle = '#9a9a9a';
    bCtx.fillRect(0, h - 5, w, 2);

    const map = new THREE.CanvasTexture(diffCan);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(4, 1);
    map.colorSpace = THREE.SRGBColorSpace;

    const bumpMap = new THREE.CanvasTexture(bumpCan);
    bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
    bumpMap.repeat.set(4, 1);

    const roughnessMap = new THREE.CanvasTexture(roughCan);
    roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(4, 1);

    return { map, bumpMap, roughnessMap };
}

function _createCylindricalConcreteTextures(baseHex, seamHex) {
    const w = 256, h = 256;
    const diffCan = document.createElement('canvas');
    const bumpCan = document.createElement('canvas');
    diffCan.width = bumpCan.width = w;
    diffCan.height = bumpCan.height = h;
    const dCtx = diffCan.getContext('2d');
    const bCtx = bumpCan.getContext('2d');

    dCtx.fillStyle = baseHex;
    dCtx.fillRect(0, 0, w, h);
    bCtx.fillStyle = '#a8a8a8';
    bCtx.fillRect(0, 0, w, h);

    dCtx.strokeStyle = seamHex;
    dCtx.lineWidth = 2;
    bCtx.strokeStyle = '#404040';
    bCtx.lineWidth = 2;
    for (let y = 32; y < h; y += 32) {
        dCtx.beginPath();
        dCtx.moveTo(0, y);
        dCtx.lineTo(w, y);
        dCtx.stroke();
        bCtx.beginPath();
        bCtx.moveTo(0, y);
        bCtx.lineTo(w, y);
        bCtx.stroke();
    }

    const map = new THREE.CanvasTexture(diffCan);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.colorSpace = THREE.SRGBColorSpace;
    const bumpMap = new THREE.CanvasTexture(bumpCan);
    bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
    return { map, bumpMap };
}

function _createRedBrickPaverMaterial() {
    const w = 256, h = 256;
    const can = document.createElement('canvas');
    can.width = w;
    can.height = h;
    const ctx = can.getContext('2d');
    ctx.fillStyle = '#5c423c';
    ctx.fillRect(0, 0, w, h);

    const rows = 16;
    const cols = 8;
    const rH = h / rows;
    const cW = w / cols;
    const c1 = new THREE.Color('#984e42');
    const c2 = new THREE.Color('#7d3d33');

    for (let r = 0; r < rows; r++) {
        const off = (r % 2) * (cW * 0.5);
        for (let c = -1; c <= cols; c++) {
            const x = c * cW + off;
            const y = r * rH;
            const t = Math.abs(Math.sin(r * 19.3 + c * 47.7)) % 1;
            const col = c1.clone().lerp(c2, t * 0.65);
            ctx.fillStyle = `#${col.getHexString()}`;
            ctx.fillRect(x + 1.5, y + 1.5, cW - 3, rH - 3);
        }
    }

    const tex = new THREE.CanvasTexture(can);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;

    return new THREE.MeshStandardMaterial({
        map: tex,
        bumpMap: tex,
        bumpScale: 0.015,
        roughness: 0.84,
        metalness: 0.03,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
    });
}

function _createGravelMaterial(c1Hex, c2Hex, c3Hex) {
    const can = document.createElement('canvas');
    can.width = 256;
    can.height = 256;
    const ctx = can.getContext('2d');
    ctx.fillStyle = c1Hex;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4000; i++) {
        ctx.fillStyle = i % 2 === 0 ? c2Hex : c3Hex;
        ctx.fillRect((i * 53) % 256, (i * 97) % 256, 3, 3);
    }
    const tex = new THREE.CanvasTexture(can);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({
        map: tex,
        bumpMap: tex,
        bumpScale: 0.025,
        roughness: 0.94,
        metalness: 0.02,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
    });
}

function _createTanSlattedFenceMaterial() {
    const can = document.createElement('canvas');
    can.width = 256;
    can.height = 256;
    const ctx = can.getContext('2d');
    ctx.fillStyle = '#b99c78';
    ctx.fillRect(0, 0, 256, 256);

    // Diagonal & vertical tan privacy slats woven through dark chain-link wire mesh (e4286399.jpg, f0a3a41e.jpg)
    ctx.strokeStyle = '#8a6f4d';
    ctx.lineWidth = 3;
    for (let x = 0; x < 256; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 256);
        ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(35, 38, 42, 0.45)';
    ctx.lineWidth = 2;
    for (let d = -256; d < 256; d += 16) {
        ctx.beginPath();
        ctx.moveTo(d, 0);
        ctx.lineTo(d + 256, 256);
        ctx.moveTo(d + 256, 0);
        ctx.lineTo(d, 256);
        ctx.stroke();
    }
    // Dark green/charcoal top mesh band visible in f0a3a41e.jpg & 109ba9fd.jpg
    ctx.fillStyle = '#2c3d35';
    ctx.fillRect(0, 0, 256, 28);

    const tex = new THREE.CanvasTexture(can);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.72,
        metalness: 0.18
    });
}

function _createChainLinkGateMaterial() {
    const can = document.createElement('canvas');
    can.width = 128;
    can.height = 128;
    const ctx = can.getContext('2d');
    ctx.fillStyle = '#484d52';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#9aa0a6';
    ctx.lineWidth = 2;
    for (let d = -128; d < 128; d += 12) {
        ctx.beginPath();
        ctx.moveTo(d, 0);
        ctx.lineTo(d + 128, 128);
        ctx.moveTo(d + 128, 0);
        ctx.lineTo(d, 128);
        ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(can);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.55,
        metalness: 0.45
    });
}

function _createGeneratorTopTextureMaterial() {
    const can = document.createElement('canvas');
    can.width = 256;
    can.height = 128;
    const ctx = can.getContext('2d');
    ctx.fillStyle = '#25a88e';
    ctx.fillRect(0, 0, 256, 128);
    // Dark exhaust radiator grilles on top of the teal generator (7871898b.jpg, e4286399.jpg)
    ctx.fillStyle = '#143d35';
    ctx.fillRect(16, 14, 72, 100);
    ctx.strokeStyle = '#0e2924';
    ctx.lineWidth = 3;
    for (let y = 20; y < 110; y += 8) {
        ctx.beginPath();
        ctx.moveTo(18, y);
        ctx.lineTo(86, y);
        ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(can);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.45,
        metalness: 0.35
    });
}

function _createUspsMailboxMaterial() {
    const can = document.createElement('canvas');
    can.width = 128;
    can.height = 160;
    const ctx = can.getContext('2d');
    ctx.fillStyle = '#1b5698';
    ctx.fillRect(0, 0, 128, 160);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(18, 42, 92, 22);
    ctx.fillStyle = '#1b5698';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('U.S. MAIL', 64, 58);
    const tex = new THREE.CanvasTexture(can);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.36,
        metalness: 0.42
    });
}

function _createDirectoryBoardMaterial() {
    const can = document.createElement('canvas');
    can.width = 128;
    can.height = 128;
    const ctx = can.getContext('2d');
    ctx.fillStyle = '#262b30';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#90663e';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 120, 120);
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(18, 22, 42, 54);
    ctx.fillRect(68, 22, 42, 54);
    ctx.fillRect(18, 84, 92, 24);
    const tex = new THREE.CanvasTexture(can);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.35,
        metalness: 0.25
    });
}

function _createPedCrossingSignMaterial() {
    const can = document.createElement('canvas');
    can.width = 128;
    can.height = 128;
    const ctx = can.getContext('2d');
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 116, 116);
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.arc(64, 34, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(64, 44);
    ctx.lineTo(64, 78);
    ctx.lineTo(44, 108);
    ctx.moveTo(64, 78);
    ctx.lineTo(84, 108);
    ctx.moveTo(42, 62);
    ctx.lineTo(86, 56);
    ctx.stroke();
    const tex = new THREE.CanvasTexture(can);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.38,
        metalness: 0.15
    });
}

function _createNoParkingSignMaterial() {
    const can = document.createElement('canvas');
    can.width = 96;
    can.height = 128;
    const ctx = can.getContext('2d');
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 96, 128);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 88, 120);
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NO', 48, 38);
    ctx.fillText('PARKING', 48, 66);
    ctx.fillText('ANY', 48, 92);
    ctx.fillText('TIME', 48, 114);
    const tex = new THREE.CanvasTexture(can);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.40
    });
}

function _createEvidenceConcreteMaterial() {
    const w = 512, h = 256;
    const can = document.createElement('canvas');
    can.width = w;
    can.height = h;
    const ctx = can.getContext('2d');
    ctx.fillStyle = '#929690';
    ctx.fillRect(0, 0, w, h);

    // Weathered architectural concrete mottling & form-board texture (531a43ab.jpg, b6dfc1a0.jpg)
    for (let i = 0; i < 4500; i++) {
        const x = (i * 89) % w;
        const y = (i * 137) % h;
        ctx.fillStyle = i % 3 === 0
            ? 'rgba(215, 220, 212, 0.08)'
            : (i % 3 === 1 ? 'rgba(72, 76, 70, 0.07)' : 'rgba(130, 136, 126, 0.06)');
        ctx.fillRect(x, y, 8, 5);
    }

    // Horizontal form-joint reveal groove near upper third (531a43ab.jpg)
    ctx.fillStyle = '#5c605a';
    ctx.fillRect(0, 58, w, 4);
    ctx.fillStyle = '#b4b8b2';
    ctx.fillRect(0, 62, w, 2);

    // Vertical form-panel seams & form tie-rod dimples
    for (const vx of [128, 256, 384]) {
        ctx.fillStyle = '#686c66';
        ctx.fillRect(vx, 0, 3, h);
        for (const ty of [30, 110, 190]) {
            ctx.beginPath();
            ctx.arc(vx - 64, ty, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const tex = new THREE.CanvasTexture(can);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 1);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;

    return new THREE.MeshStandardMaterial({
        map: tex,
        bumpMap: tex,
        bumpScale: 0.02,
        roughness: 0.85,
        metalness: 0.05
    });
}

function _createSwRibbedSidingMaterial() {
    const w = 256, h = 256;
    const can = document.createElement('canvas');
    can.width = w;
    can.height = h;
    const ctx = can.getContext('2d');
    ctx.fillStyle = '#b8ac99';
    ctx.fillRect(0, 0, w, h);

    // Vertical ribs matching the 2-story SW wing cladding in a0a53c74.jpg & b6dfc1a0.jpg
    for (let x = 0; x < w; x += 8) {
        ctx.fillStyle = '#998d7b';
        ctx.fillRect(x, 0, 2, h);
        ctx.fillStyle = '#c8bdab';
        ctx.fillRect(x + 2, 0, 2, h);
    }

    const tex = new THREE.CanvasTexture(can);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;

    return new THREE.MeshStandardMaterial({
        map: tex,
        bumpMap: tex,
        bumpScale: 0.018,
        roughness: 0.68,
        metalness: 0.14
    });
}

function _createCircularLouverMaterial() {
    const w = 128, h = 128;
    const can = document.createElement('canvas');
    can.width = w;
    can.height = h;
    const ctx = can.getContext('2d');
    ctx.fillStyle = '#25282c';
    ctx.fillRect(0, 0, w, h);

    // Horizontal louver slats inside the circular mechanical vents (502846cd.jpg, b6dfc1a0.jpg)
    for (let y = 6; y < h; y += 8) {
        ctx.fillStyle = '#3b4046';
        ctx.fillRect(0, y, w, 3);
        ctx.fillStyle = '#141619';
        ctx.fillRect(0, y + 3, w, 4);
    }

    // Outer circular rim shadow
    ctx.strokeStyle = '#181a1d';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(can);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({
        map: tex,
        bumpMap: tex,
        bumpScale: 0.025,
        roughness: 0.52,
        metalness: 0.45
    });
}

function _createLawEnforcementArrowSignMaterial() {
    const can = document.createElement('canvas');
    can.width = 96;
    can.height = 128;
    const ctx = can.getContext('2d');
    ctx.fillStyle = '#4a2e20';
    ctx.fillRect(0, 0, 96, 128);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 88, 120);

    // Upward white arrow (531a43ab.jpg, b6dfc1a0.jpg)
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(48, 16);
    ctx.lineTo(66, 38);
    ctx.lineTo(54, 38);
    ctx.lineTo(54, 64);
    ctx.lineTo(42, 64);
    ctx.lineTo(42, 38);
    ctx.lineTo(30, 38);
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LAW', 48, 82);
    ctx.fillText('ENFORCEMENT', 48, 98);
    ctx.fillText('ONLY', 48, 114);

    const tex = new THREE.CanvasTexture(can);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.38
    });
}
