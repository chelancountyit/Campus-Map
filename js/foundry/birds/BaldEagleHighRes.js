import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * BaldEagleHighRes — High-Resolution Anatomically Sculpted 3D Bald Eagle (Haliaeetus leucocephalus)
 *
 * Uses the downloaded U.S. Fish & Wildlife Service high-resolution Bald Eagle asset
 * (`./assets/textures/birds/bald_eagle_usfws_hd.jpg`) to synthesize rich 1024x1024 dark-espresso
 * plumage albedo + feather-barb bump maps, and loads/builds the pre-baked high-resolution
 * glTF 2.0 binary rig (`./assets/models/birds/bald-eagle-hd.glb`) with articulated:
 *   - `HeadGroup` (snow-white feathered head, supraorbital brow ridge, golden irises, hooked beak & cere)
 *   - `TailGroup` (12 individual overlapping white rectrices in a rounded wedge fan + dark coverts)
 *   - `LeftShoulderPivot` -> `LeftWristPivot` -> `LeftPrimaryTips` (cambered airfoil, 14 remiges + 7 slotted fingered primaries)
 *   - `RightShoulderPivot` -> `RightWristPivot` -> `RightPrimaryTips`
 *   - Tucked feathered legs ("trousers") & golden scaly feet with 4 curved obsidian talons per foot
 */

export const BALD_EAGLE_GLB_URL = './assets/models/birds/bald-eagle-hd.glb?v=1';
export const BALD_EAGLE_PHOTO_URL = './assets/textures/birds/bald_eagle_usfws_hd.jpg';

let _cachedPlumageMaps = null;
let _preloadedGlbScene = null;
let _glbLoadPromise = null;

/**
 * Loads an HTMLImageElement from a URL (resolves null in headless/worker contexts if unavailable).
 */
export function loadEagleReferenceImage(url = BALD_EAGLE_PHOTO_URL) {
    return new Promise((resolve) => {
        if (typeof Image === 'undefined') {
            resolve(null);
            return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

/**
 * Synthesizes 1024x1024 high-resolution Bald Eagle dark-espresso covert/remiges plumage albedo
 * and feather-rachis/barb bump textures, sampling real feather tonal variation from the downloaded
 * USFWS soaring Bald Eagle photograph when loaded.
 */
export function getHighResEaglePlumageMaps(usfwsImg = null) {
    if (_cachedPlumageMaps && (!usfwsImg || _cachedPlumageMaps.sampledFromPhoto)) {
        return _cachedPlumageMaps;
    }
    if (typeof document === 'undefined') {
        return { darkAlbedo: null, whiteAlbedo: null, featherBump: null, sampledFromPhoto: false };
    }

    const size = 1024;

    // 1. Dark Espresso / Sepia Wing & Mantle Plumage Albedo (1024x1024)
    const darkCan = document.createElement('canvas');
    darkCan.width = size;
    darkCan.height = size;
    const dCtx = darkCan.getContext('2d');

    dCtx.fillStyle = '#241a13';
    dCtx.fillRect(0, 0, size, size);

    // Sample authentic feather patch colors from the USFWS Bald Eagle wing/mantle region if available
    if (usfwsImg && usfwsImg.width > 400 && usfwsImg.height > 400) {
        try {
            const tmp = document.createElement('canvas');
            tmp.width = 256;
            tmp.height = 256;
            const tCtx = tmp.getContext('2d');
            // Crop central dark-umber wing covert region of bald_eagle_usfws_hd.jpg
            tCtx.drawImage(
                usfwsImg,
                Math.floor(usfwsImg.width * 0.28),
                Math.floor(usfwsImg.height * 0.26),
                Math.floor(usfwsImg.width * 0.14),
                Math.floor(usfwsImg.height * 0.16),
                0,
                0,
                256,
                256
            );
            dCtx.globalAlpha = 0.42;
            for (let y = 0; y < size; y += 256) {
                for (let x = 0; x < size; x += 256) {
                    dCtx.drawImage(tmp, x, y, 256, 256);
                }
            }
            dCtx.globalAlpha = 1.0;
        } catch (_) {
            dCtx.globalAlpha = 1.0;
        }
    }

    // Layered scalloped covert & flight-feather shingle pattern with central shafts & pale warm-sepia edges
    const rows = 18;
    const cols = 16;
    const cellW = size / cols;
    const cellH = size / rows;

    for (let r = 0; r < rows; r++) {
        const yBase = r * cellH;
        const xShift = (r % 2) * (cellW * 0.5);
        for (let c = -1; c <= cols; c++) {
            const cx = c * cellW + xShift + cellW * 0.5;
            const cy = yBase + cellH * 0.52;
            const shade = ((r * 17 + c * 31) & 15) - 7;
            const baseR = Math.max(20, Math.min(68, 39 + shade));
            const baseG = Math.max(14, Math.min(52, 28 + Math.round(shade * 0.8)));
            const baseB = Math.max(10, Math.min(40, 20 + Math.round(shade * 0.6)));

            const grad = dCtx.createRadialGradient(cx, cy - cellH * 0.15, cellW * 0.08, cx, cy + cellH * 0.2, cellW * 0.62);
            grad.addColorStop(0.0, `rgb(${baseR - 6},${baseG - 5},${baseB - 4})`);
            grad.addColorStop(0.76, `rgb(${baseR + 4},${baseG + 3},${baseB + 2})`);
            grad.addColorStop(1.0, `rgb(${baseR + 18},${baseG + 13},${baseB + 9})`);

            dCtx.fillStyle = grad;
            dCtx.beginPath();
            dCtx.ellipse(cx, cy, cellW * 0.54, cellH * 0.62, 0, 0, Math.PI * 2);
            dCtx.fill();

            // Subtle dark outline & central rachis shaft
            dCtx.strokeStyle = 'rgba(12, 8, 5, 0.55)';
            dCtx.lineWidth = 2.0;
            dCtx.stroke();

            dCtx.strokeStyle = 'rgba(18, 12, 8, 0.75)';
            dCtx.lineWidth = 2.2;
            dCtx.beginPath();
            dCtx.moveTo(cx, cy - cellH * 0.52);
            dCtx.lineTo(cx, cy + cellH * 0.56);
            dCtx.stroke();

            // Fine diagonal feather barbs
            dCtx.strokeStyle = 'rgba(78, 58, 42, 0.22)';
            dCtx.lineWidth = 1.0;
            for (let b = -4; b <= 4; b++) {
                const by = cy + b * (cellH * 0.11);
                dCtx.beginPath();
                dCtx.moveTo(cx, by);
                dCtx.lineTo(cx - cellW * 0.42, by + cellH * 0.14);
                dCtx.moveTo(cx, by);
                dCtx.lineTo(cx + cellW * 0.42, by + cellH * 0.14);
                dCtx.stroke();
            }
        }
    }

    // 2. Snow-White Head & Tail Feather Albedo (512x512)
    const whiteCan = document.createElement('canvas');
    whiteCan.width = 512;
    whiteCan.height = 512;
    const wCtx = whiteCan.getContext('2d');
    const wGrad = wCtx.createLinearGradient(0, 0, 0, 512);
    wGrad.addColorStop(0.0, '#fbfcfd');
    wGrad.addColorStop(0.75, '#f4f5f7');
    wGrad.addColorStop(1.0, '#eae6dc');
    wCtx.fillStyle = wGrad;
    wCtx.fillRect(0, 0, 512, 512);

    wCtx.strokeStyle = 'rgba(185, 180, 168, 0.34)';
    wCtx.lineWidth = 1.4;
    for (let i = 0; i < 48; i++) {
        const x = (i + 0.5) * (512 / 48);
        wCtx.beginPath();
        wCtx.moveTo(x, 0);
        wCtx.lineTo(x, 512);
        wCtx.stroke();
    }

    // 3. High-Resolution Feather Barb & Rachis Bump Map (1024x1024)
    const bumpCan = document.createElement('canvas');
    bumpCan.width = size;
    bumpCan.height = size;
    const bCtx = bumpCan.getContext('2d');
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, size, size);

    for (let r = 0; r < rows; r++) {
        const yBase = r * cellH;
        const xShift = (r % 2) * (cellW * 0.5);
        for (let c = -1; c <= cols; c++) {
            const cx = c * cellW + xShift + cellW * 0.5;
            const cy = yBase + cellH * 0.52;
            const bGrad = bCtx.createRadialGradient(cx, cy, cellW * 0.05, cx, cy, cellW * 0.58);
            bGrad.addColorStop(0.0, '#b8b8b8');
            bGrad.addColorStop(0.82, '#7c7c7c');
            bGrad.addColorStop(1.0, '#484848');
            bCtx.fillStyle = bGrad;
            bCtx.beginPath();
            bCtx.ellipse(cx, cy, cellW * 0.52, cellH * 0.60, 0, 0, Math.PI * 2);
            bCtx.fill();

            bCtx.strokeStyle = '#ececec';
            bCtx.lineWidth = 2.4;
            bCtx.beginPath();
            bCtx.moveTo(cx, cy - cellH * 0.5);
            bCtx.lineTo(cx, cy + cellH * 0.54);
            bCtx.stroke();
        }
    }

    const darkAlbedo = new THREE.CanvasTexture(darkCan);
    darkAlbedo.wrapS = THREE.RepeatWrapping;
    darkAlbedo.wrapT = THREE.RepeatWrapping;
    darkAlbedo.colorSpace = THREE.SRGBColorSpace;
    darkAlbedo.anisotropy = 8;

    const whiteAlbedo = new THREE.CanvasTexture(whiteCan);
    whiteAlbedo.wrapS = THREE.RepeatWrapping;
    whiteAlbedo.wrapT = THREE.RepeatWrapping;
    whiteAlbedo.colorSpace = THREE.SRGBColorSpace;
    whiteAlbedo.anisotropy = 8;

    const featherBump = new THREE.CanvasTexture(bumpCan);
    featherBump.wrapS = THREE.RepeatWrapping;
    featherBump.wrapT = THREE.RepeatWrapping;
    featherBump.anisotropy = 8;

    darkAlbedo.userData = { sharedAsset: true };
    whiteAlbedo.userData = { sharedAsset: true };
    featherBump.userData = { sharedAsset: true };

    _cachedPlumageMaps = {
        darkAlbedo,
        whiteAlbedo,
        featherBump,
        sampledFromPhoto: Boolean(usfwsImg)
    };
    return _cachedPlumageMaps;
}

/**
 * Helper: builds a sculpted 3D cambered flight feather blade with central shaft ridge,
 * asymmetric leading/trailing vanes, and rounded aerodynamic tip.
 */
function createFeatherBladeGeometry(length, width, camber = 0.012, tipCurlY = 0.0, segsL = 10, segsW = 4) {
    const geo = new THREE.BufferGeometry();
    const pos = [];
    const uvs = [];
    const idx = [];

    for (let il = 0; il <= segsL; il++) {
        const u = il / segsL; // 0 = root, 1 = tip
        // Natural raptor remex taper: full width across 0.15..0.72, rounded elliptical tip at 1.0
        const widthProfile = u < 0.15
            ? 0.55 + (u / 0.15) * 0.45
            : Math.sqrt(Math.max(0.02, 1.0 - Math.pow((u - 0.15) / 0.85, 2.15)));
        const halfW = width * 0.5 * widthProfile;
        const x = u * length;
        const curlLift = Math.pow(u, 2.4) * tipCurlY;

        for (let iw = 0; iw <= segsW; iw++) {
            const v = iw / segsW; // 0 = trailing vane, 0.38 = shaft, 1 = leading vane
            // Asymmetric vane around central rachis (narrow stiffer leading vane, broader trailing vane)
            const zLocal = (v - 0.58) * 2.0 * halfW;
            const arch = Math.sin(v * Math.PI) * camber * (1.0 - u * 0.45);
            const thickness = (1.0 - u * 0.75) * 0.0055 * Math.sin(v * Math.PI);

            // Upper surface vertex
            pos.push(x, curlLift + arch + thickness, zLocal);
            uvs.push(u, v);
        }
    }

    const rowStride = segsW + 1;
    const upperVertCount = (segsL + 1) * rowStride;

    // Lower surface vertices for true 3D two-sided airfoil thickness
    for (let il = 0; il <= segsL; il++) {
        const u = il / segsL;
        const widthProfile = u < 0.15
            ? 0.55 + (u / 0.15) * 0.45
            : Math.sqrt(Math.max(0.02, 1.0 - Math.pow((u - 0.15) / 0.85, 2.15)));
        const halfW = width * 0.5 * widthProfile;
        const x = u * length;
        const curlLift = Math.pow(u, 2.4) * tipCurlY;

        for (let iw = 0; iw <= segsW; iw++) {
            const v = iw / segsW;
            const zLocal = (v - 0.58) * 2.0 * halfW;
            const arch = Math.sin(v * Math.PI) * camber * (1.0 - u * 0.45);
            const thickness = (1.0 - u * 0.75) * 0.0045 * Math.sin(v * Math.PI);
            pos.push(x, curlLift + arch - thickness, zLocal);
            uvs.push(u, v);
        }
    }

    for (let il = 0; il < segsL; il++) {
        for (let iw = 0; iw < segsW; iw++) {
            const a = il * rowStride + iw;
            const b = a + 1;
            const c = (il + 1) * rowStride + iw;
            const d = c + 1;
            // Upper face
            idx.push(a, c, b, b, c, d);
            // Lower face
            const la = upperVertCount + a;
            const lb = upperVertCount + b;
            const lc = upperVertCount + c;
            const ld = upperVertCount + d;
            idx.push(la, lb, lc, lb, ld, lc);
        }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
}

/**
 * Helper: builds a smooth lofted 3D anatomical tube/fuselage along Z from station profiles
 * `{ z, rx, ryTop, ryBot, yCenter }`.
 */
function createLoftedBodyGeometry(stations, radialSegs = 28) {
    const geo = new THREE.BufferGeometry();
    const pos = [];
    const uvs = [];
    const idx = [];

    for (let is = 0; is < stations.length; is++) {
        const st = stations[is];
        const v = is / (stations.length - 1);
        for (let ir = 0; ir <= radialSegs; ir++) {
            const u = ir / radialSegs;
            const theta = u * Math.PI * 2.0;
            const cosT = Math.cos(theta);
            const sinT = Math.sin(theta);
            const x = sinT * st.rx;
            const ry = cosT >= 0 ? st.ryTop : st.ryBot;
            const y = st.yCenter + cosT * ry;
            pos.push(x, y, st.z);
            uvs.push(u * 2.0, v * 2.0);
        }
    }

    const stride = radialSegs + 1;
    for (let is = 0; is < stations.length - 1; is++) {
        for (let ir = 0; ir < radialSegs; ir++) {
            const a = is * stride + ir;
            const b = a + 1;
            const c = (is + 1) * stride + ir;
            const d = c + 1;
            idx.push(a, b, c, b, d, c);
        }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
}

/**
 * Builds the complete high-resolution articulated Bald Eagle scene graph (~16,500 triangles).
 * Used both to bake `assets/models/birds/bald-eagle-hd.glb` and as an instant zero-latency fallback.
 */
export function buildHighResBaldEagleRig(usfwsImg = null) {
    const maps = getHighResEaglePlumageMaps(usfwsImg);

    const darkPlumageMat = new THREE.MeshStandardMaterial({
        name: 'EagleDarkEspressoPlumage',
        color: '#ffffff',
        map: maps.darkAlbedo,
        bumpMap: maps.featherBump,
        bumpScale: 0.018,
        roughness: 0.78,
        metalness: 0.04,
        side: THREE.DoubleSide,
        fog: false
    });

    const primaryTipMat = new THREE.MeshStandardMaterial({
        name: 'EaglePrimaryRemigesDark',
        color: '#cbbba8',
        map: maps.darkAlbedo,
        bumpMap: maps.featherBump,
        bumpScale: 0.015,
        roughness: 0.74,
        metalness: 0.05,
        side: THREE.DoubleSide,
        fog: false
    });

    const whitePlumageMat = new THREE.MeshStandardMaterial({
        name: 'EagleSnowWhitePlumage',
        color: '#ffffff',
        map: maps.whiteAlbedo,
        bumpMap: maps.featherBump,
        bumpScale: 0.008,
        roughness: 0.72,
        metalness: 0.02,
        side: THREE.DoubleSide,
        fog: false
    });

    const beakAmberMat = new THREE.MeshStandardMaterial({
        name: 'EagleHookedBeakAmber',
        color: '#f59e0b',
        roughness: 0.38,
        metalness: 0.08,
        fog: false
    });

    const cereGoldMat = new THREE.MeshStandardMaterial({
        name: 'EagleWaxyCereGold',
        color: '#facc15',
        roughness: 0.52,
        metalness: 0.04,
        fog: false
    });

    const talonGoldMat = new THREE.MeshStandardMaterial({
        name: 'EagleScalyFootGold',
        color: '#d97706',
        roughness: 0.56,
        metalness: 0.05,
        fog: false
    });

    const clawBlackMat = new THREE.MeshStandardMaterial({
        name: 'EagleObsidianTalonClaw',
        color: '#111317',
        roughness: 0.28,
        metalness: 0.22,
        fog: false
    });

    const irisYellowMat = new THREE.MeshStandardMaterial({
        name: 'EagleFierceIrisYellow',
        color: '#fef08a',
        emissive: '#ca8a04',
        emissiveIntensity: 0.18,
        roughness: 0.22,
        metalness: 0.05,
        fog: false
    });

    const eagleRoot = new THREE.Group();
    eagleRoot.name = 'BaldEagleHighResRig';

    // =========================================================================
    // 1. MUSCULAR RAPTOR TORSO & PECTORAL KEEL (-0.48m .. +0.34m along +Z)
    // =========================================================================
    const torsoStations = [
        { z: -0.50, rx: 0.065, ryTop: 0.052, ryBot: 0.048, yCenter: 0.008 },
        { z: -0.40, rx: 0.125, ryTop: 0.095, ryBot: 0.088, yCenter: 0.006 },
        { z: -0.26, rx: 0.182, ryTop: 0.135, ryBot: 0.145, yCenter: 0.002 },
        { z: -0.10, rx: 0.222, ryTop: 0.162, ryBot: 0.186, yCenter: -0.004 },
        { z:  0.06, rx: 0.236, ryTop: 0.168, ryBot: 0.198, yCenter: -0.006 }, // Broad pectoral chest
        { z:  0.20, rx: 0.212, ryTop: 0.152, ryBot: 0.172, yCenter: 0.005 },
        { z:  0.31, rx: 0.164, ryTop: 0.126, ryBot: 0.132, yCenter: 0.018 },
        { z:  0.37, rx: 0.115, ryTop: 0.095, ryBot: 0.095, yCenter: 0.028 }
    ];
    const torsoMesh = new THREE.Mesh(createLoftedBodyGeometry(torsoStations, 30), darkPlumageMat);
    torsoMesh.name = 'EagleMuscularTorso';
    torsoMesh.castShadow = true;
    eagleRoot.add(torsoMesh);

    // =========================================================================
    // 2. SNOW-WHITE HEAD, RUFF COLLAR, FIERCE BROW, EYES & HOOKED BEAK (`HeadGroup`)
    // =========================================================================
    const headGroup = new THREE.Group();
    headGroup.name = 'HeadGroup';
    headGroup.position.set(0, 0.032, 0.34);
    eagleRoot.add(headGroup);

    // Smooth lofted white feathered neck & cranium (+0.0m .. +0.30m in HeadGroup local +Z)
    const headStations = [
        { z: -0.04, rx: 0.156, ryTop: 0.126, ryBot: 0.132, yCenter: -0.006 },
        { z:  0.03, rx: 0.148, ryTop: 0.124, ryBot: 0.124, yCenter:  0.006 },
        { z:  0.11, rx: 0.136, ryTop: 0.122, ryBot: 0.112, yCenter:  0.018 },
        { z:  0.19, rx: 0.118, ryTop: 0.114, ryBot: 0.096, yCenter:  0.022 }, // Crown / eye plane
        { z:  0.26, rx: 0.086, ryTop: 0.088, ryBot: 0.072, yCenter:  0.016 }, // Forehead / lore
        { z:  0.30, rx: 0.048, ryTop: 0.052, ryBot: 0.042, yCenter:  0.008 }
    ];
    const headCapMesh = new THREE.Mesh(createLoftedBodyGeometry(headStations, 26), whitePlumageMat);
    headCapMesh.name = 'EagleWhiteHeadCape';
    headCapMesh.castShadow = true;
    headGroup.add(headCapMesh);

    // Iconic jagged scalloped white ruff collar overlapping the dark-brown neck/breast (16 pointed hackle feathers)
    const ruffCount = 16;
    const hackleGeo = createFeatherBladeGeometry(0.135, 0.056, 0.006, 0.004, 6, 3);
    // Rotate blade so +X points backward (-Z) along torso
    hackleGeo.rotateY(Math.PI * 0.5);
    for (let i = 0; i < ruffCount; i++) {
        const ang = (i / ruffCount) * Math.PI * 2.0;
        const rx = Math.sin(ang) * 0.152;
        const ry = Math.cos(ang) * 0.126 - 0.005;
        const hackle = new THREE.Mesh(hackleGeo, whitePlumageMat);
        hackle.position.set(rx, ry, 0.015 + (i % 2) * 0.014);
        hackle.rotation.z = -ang;
        hackle.rotation.x = -0.16;
        headGroup.add(hackle);
    }

    // Fierce Supraorbital Brow Ridges + Golden Eyes + Jet-Black Pupils
    for (const side of [-1, 1]) {
        const browGeo = new THREE.BoxGeometry(0.036, 0.018, 0.078);
        const brow = new THREE.Mesh(browGeo, whitePlumageMat);
        brow.position.set(side * 0.098, 0.062, 0.205);
        brow.rotation.z = side * -0.22;
        brow.rotation.y = side * 0.18;
        headGroup.add(brow);

        const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), cereGoldMat);
        eyeSocket.scale.set(0.55, 0.88, 1.05);
        eyeSocket.position.set(side * 0.096, 0.042, 0.205);
        headGroup.add(eyeSocket);

        const iris = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), irisYellowMat);
        iris.scale.set(0.55, 0.92, 0.96);
        iris.position.set(side * 0.102, 0.042, 0.207);
        headGroup.add(iris);

        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.010, 10, 8), clawBlackMat);
        pupil.scale.set(0.55, 0.92, 0.92);
        pupil.position.set(side * 0.108, 0.042, 0.209);
        headGroup.add(pupil);
    }

    // Golden Waxy Cere + Nostrils
    const cereGeo = new THREE.SphereGeometry(0.054, 16, 12);
    cereGeo.scale(0.84, 0.88, 1.12);
    const cereMesh = new THREE.Mesh(cereGeo, cereGoldMat);
    cereMesh.position.set(0, 0.018, 0.295);
    headGroup.add(cereMesh);

    for (const side of [-1, 1]) {
        const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), clawBlackMat);
        nostril.scale.set(0.5, 0.7, 1.4);
        nostril.position.set(side * 0.032, 0.028, 0.308);
        headGroup.add(nostril);
    }

    // Deeply Hooked Golden-Amber Raptor Upper Beak (Maxilla) + Lower Mandible
    const beakCurvePts = [
        { z: 0.31, rx: 0.042, ryTop: 0.044, ryBot: 0.014, yCenter: 0.012 },
        { z: 0.36, rx: 0.035, ryTop: 0.040, ryBot: 0.012, yCenter: 0.010 },
        { z: 0.41, rx: 0.026, ryTop: 0.032, ryBot: 0.010, yCenter: 0.002 },
        { z: 0.445, rx: 0.016, ryTop: 0.022, ryBot: 0.012, yCenter: -0.016 },
        { z: 0.462, rx: 0.007, ryTop: 0.010, ryBot: 0.018, yCenter: -0.042 }, // Sharp downward raptor hook!
        { z: 0.456, rx: 0.002, ryTop: 0.003, ryBot: 0.004, yCenter: -0.062 }
    ];
    const upperBeak = new THREE.Mesh(createLoftedBodyGeometry(beakCurvePts, 18), beakAmberMat);
    upperBeak.name = 'EagleHookedMaxilla';
    headGroup.add(upperBeak);

    const lowerBeakPts = [
        { z: 0.29, rx: 0.038, ryTop: 0.008, ryBot: 0.020, yCenter: -0.006 },
        { z: 0.35, rx: 0.028, ryTop: 0.006, ryBot: 0.016, yCenter: -0.009 },
        { z: 0.405, rx: 0.014, ryTop: 0.004, ryBot: 0.010, yCenter: -0.012 },
        { z: 0.425, rx: 0.004, ryTop: 0.002, ryBot: 0.004, yCenter: -0.014 }
    ];
    const lowerBeak = new THREE.Mesh(createLoftedBodyGeometry(lowerBeakPts, 14), beakAmberMat);
    headGroup.add(lowerBeak);

    // =========================================================================
    // 3. BROAD 12-FEATHER SNOW-WHITE FANNED TAIL (`TailGroup`) + COVERT ROOT
    // =========================================================================
    const tailGroup = new THREE.Group();
    tailGroup.name = 'TailGroup';
    tailGroup.position.set(0, 0.008, -0.45);
    eagleRoot.add(tailGroup);

    // Dark-brown upper & undertail covert saddle overlapping the white tail base
    const tailCovertStations = [
        { z: -0.14, rx: 0.115, ryTop: 0.042, ryBot: 0.038, yCenter: 0.004 },
        { z: -0.06, rx: 0.125, ryTop: 0.056, ryBot: 0.052, yCenter: 0.004 },
        { z:  0.03, rx: 0.095, ryTop: 0.052, ryBot: 0.048, yCenter: 0.002 }
    ];
    const tailCovertMesh = new THREE.Mesh(createLoftedBodyGeometry(tailCovertStations, 18), darkPlumageMat);
    tailGroup.add(tailCovertMesh);

    // 12 individual overlapping white rectrices fanned in a majestic rounded wedge
    const rectrixCount = 12;
    const fanHalfSpread = 0.46; // ~52 deg total wedge spread matching bald_eagle_usfws_hd.jpg
    for (let i = 0; i < rectrixCount; i++) {
        const u = i / (rectrixCount - 1); // 0..1 left-to-right
        const s = (u - 0.5) * 2.0; // -1..+1
        // Central rectrices slightly longer (rounded wedge tail)
        const rLen = 0.52 - Math.pow(Math.abs(s), 1.8) * 0.095;
        const rGeo = createFeatherBladeGeometry(rLen, 0.092, 0.008, -0.008, 9, 4);
        // Point feather along -Z
        rGeo.rotateY(Math.PI * 0.5);
        const rectrix = new THREE.Mesh(rGeo, whitePlumageMat);
        rectrix.position.set(s * 0.055, (0.5 - Math.abs(s)) * 0.012 + (i % 2) * 0.002, -0.03);
        rectrix.rotation.y = s * fanHalfSpread;
        rectrix.rotation.z = s * 0.06;
        rectrix.castShadow = true;
        tailGroup.add(rectrix);
    }

    // =========================================================================
    // 4. TUCKED FEATHERED LEGS ("TROUSERS") & GOLDEN SCALY FEET WITH TALONS
    // =========================================================================
    for (const side of [-1, 1]) {
        const legGrp = new THREE.Group();
        legGrp.position.set(side * 0.088, -0.105, -0.28);

        // Dark feathered crus ("trousers")
        const thighGeo = new THREE.CylinderGeometry(0.036, 0.054, 0.18, 12);
        thighGeo.rotateX(Math.PI * 0.44);
        const thigh = new THREE.Mesh(thighGeo, darkPlumageMat);
        thigh.position.set(0, -0.01, -0.05);
        legGrp.add(thigh);

        // Golden scaly tarsus & clenched knuckles tucked against undertail
        const tarsusGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.13, 10);
        tarsusGeo.rotateX(Math.PI * 0.48);
        const tarsus = new THREE.Mesh(tarsusGeo, talonGoldMat);
        tarsus.position.set(0, -0.022, -0.16);
        legGrp.add(tarsus);

        const footPad = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), talonGoldMat);
        footPad.scale.set(0.95, 0.78, 1.25);
        footPad.position.set(0, -0.028, -0.23);
        legGrp.add(footPad);

        // 3 curled front toes + 1 rear hallux with curved black raptor talons
        for (let t = -1; t <= 1; t++) {
            const toe = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.010, 0.048, 8), talonGoldMat);
            toe.rotation.x = Math.PI * 0.32;
            toe.position.set(t * 0.016, -0.042, -0.255);
            legGrp.add(toe);

            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.036, 8), clawBlackMat);
            claw.rotation.x = -Math.PI * 0.65;
            claw.position.set(t * 0.016, -0.052, -0.275);
            legGrp.add(claw);
        }
        eagleRoot.add(legGrp);
    }

    // =========================================================================
    // 5. HIGH-RESOLUTION CAMBERED AIRFOIL WINGS + REMIGES + 7 SLOTTED PRIMARIES
    // =========================================================================
    const buildWingSide = (sideSign) => {
        const s = sideSign; // +1 = Left (+X), -1 = Right (-X)
        const sideLabel = s > 0 ? 'Left' : 'Right';

        const shoulderPivot = new THREE.Group();
        shoulderPivot.name = `${sideLabel}ShoulderPivot`;
        shoulderPivot.position.set(s * 0.185, 0.052, 0.055);
        eagleRoot.add(shoulderPivot);

        const innerSpan = 0.86;

        // 5A. Sculpted 3D Cambered Inner Wing Airfoil (Propatagium + Lesser/Median/Greater Coverts)
        const innerAirfoilGeo = new THREE.BufferGeometry();
        const iaPos = [], iaUv = [], iaIdx = [];
        const spanSegs = 14;
        const chordSegs = 10;

        const evalInnerChord = (u) => {
            // Broad plank wing chord matching bald_eagle_usfws_hd.jpg
            const zLead = 0.235 - u * 0.025 + Math.sin(u * Math.PI) * 0.022;
            const zTrail = -0.185 - u * 0.035;
            return { zLead, zTrail };
        };

        for (let surface = 0; surface < 2; surface++) {
            const isTop = surface === 0;
            for (let iu = 0; iu <= spanSegs; iu++) {
                const u = iu / spanSegs;
                const x = s * u * innerSpan;
                const { zLead, zTrail } = evalInnerChord(u);
                const thicknessScale = (1.0 - u * 0.32) * 0.052;
                for (let iv = 0; iv <= chordSegs; iv++) {
                    const v = iv / chordSegs; // 0 = leading edge, 1 = covert trailing edge
                    const z = THREE.MathUtils.lerp(zLead, zTrail, v);
                    // Classic NACA-style avian airfoil camber (thick rounded leading edge, thin trailing edge)
                    const foilThickness = Math.sqrt(Math.max(0, v)) * (1.0 - v) * 2.15 * thicknessScale;
                    const meanCamber = Math.sin(v * Math.PI * 0.88) * 0.026 * (1.0 - u * 0.25);
                    const y = meanCamber + (isTop ? foilThickness : -foilThickness * 0.42);
                    iaPos.push(x, y, z);
                    iaUv.push(u * 2.2, v * 1.6);
                }
            }
        }

        const cStride = chordSegs + 1;
        const surfOffset = (spanSegs + 1) * cStride;
        for (let iu = 0; iu < spanSegs; iu++) {
            for (let iv = 0; iv < chordSegs; iv++) {
                const a = iu * cStride + iv;
                const b = a + 1;
                const c = (iu + 1) * cStride + iv;
                const d = c + 1;
                if (s > 0) {
                    iaIdx.push(a, b, c, b, d, c);
                    iaIdx.push(surfOffset + a, surfOffset + c, surfOffset + b, surfOffset + b, surfOffset + c, surfOffset + d);
                } else {
                    iaIdx.push(a, c, b, b, c, d);
                    iaIdx.push(surfOffset + a, surfOffset + b, surfOffset + c, surfOffset + b, surfOffset + d, surfOffset + c);
                }
            }
        }
        innerAirfoilGeo.setAttribute('position', new THREE.Float32BufferAttribute(iaPos, 3));
        innerAirfoilGeo.setAttribute('uv', new THREE.Float32BufferAttribute(iaUv, 2));
        innerAirfoilGeo.setIndex(iaIdx);
        innerAirfoilGeo.computeVertexNormals();

        const innerCovertMesh = new THREE.Mesh(innerAirfoilGeo, darkPlumageMat);
        innerCovertMesh.castShadow = true;
        shoulderPivot.add(innerCovertMesh);

        // 5B. 11 Overlapping Sculpted Secondary Flight Feathers (Secondaries S1..S11 along trailing edge)
        const secCount = 11;
        for (let i = 0; i < secCount; i++) {
            const u = (i + 0.4) / secCount;
            const xPos = s * (0.06 + u * (innerSpan - 0.06));
            const secLen = 0.34 + Math.sin(u * Math.PI * 0.85) * 0.045;
            const secGeo = createFeatherBladeGeometry(secLen, 0.096, 0.010, 0.005, 8, 4);
            secGeo.rotateY(Math.PI * 0.5); // Point trailing (-Z)
            const secMesh = new THREE.Mesh(secGeo, primaryTipMat);
            secMesh.position.set(xPos, -0.003 + (i % 2) * 0.0018, -0.09 - u * 0.025);
            secMesh.rotation.y = s * (-0.06 - u * 0.08);
            secMesh.castShadow = true;
            shoulderPivot.add(secMesh);
        }

        // 5C. Wrist Joint (`WristPivot`), Outer Carpal Covert Deck, Alula & Inner Primaries (P1..P3)
        const wristPivot = new THREE.Group();
        wristPivot.name = `${sideLabel}WristPivot`;
        wristPivot.position.set(s * innerSpan, 0.0, 0.0);
        shoulderPivot.add(wristPivot);

        const outerCovertSpan = 0.44;
        const outerAirfoilGeo = new THREE.BufferGeometry();
        const oaPos = [], oaUv = [], oaIdx = [];
        const oSpanSegs = 10;
        const oChordSegs = 8;

        for (let surface = 0; surface < 2; surface++) {
            const isTop = surface === 0;
            for (let iu = 0; iu <= oSpanSegs; iu++) {
                const u = iu / oSpanSegs;
                const x = s * u * outerCovertSpan;
                const zLead = THREE.MathUtils.lerp(0.21, 0.075, u);
                const zTrail = THREE.MathUtils.lerp(-0.22, -0.10, u);
                const tScale = (1.0 - u * 0.68) * 0.036;
                for (let iv = 0; iv <= oChordSegs; iv++) {
                    const v = iv / oChordSegs;
                    const z = THREE.MathUtils.lerp(zLead, zTrail, v);
                    const foilT = Math.sqrt(Math.max(0, v)) * (1.0 - v) * 2.0 * tScale;
                    const camberY = Math.sin(v * Math.PI * 0.85) * 0.016 * (1.0 - u * 0.4);
                    const y = camberY + (isTop ? foilT : -foilT * 0.4);
                    oaPos.push(x, y, z);
                    oaUv.push(u * 1.4, v * 1.2);
                }
            }
        }
        const ocStride = oChordSegs + 1;
        const oSurfOff = (oSpanSegs + 1) * ocStride;
        for (let iu = 0; iu < oSpanSegs; iu++) {
            for (let iv = 0; iv < oChordSegs; iv++) {
                const a = iu * ocStride + iv;
                const b = a + 1;
                const c = (iu + 1) * ocStride + iv;
                const d = c + 1;
                if (s > 0) {
                    oaIdx.push(a, b, c, b, d, c);
                    oaIdx.push(oSurfOff + a, oSurfOff + c, oSurfOff + b, oSurfOff + b, oSurfOff + c, oSurfOff + d);
                } else {
                    oaIdx.push(a, c, b, b, c, d);
                    oaIdx.push(oSurfOff + a, oSurfOff + b, oSurfOff + c, oSurfOff + b, oSurfOff + d, oSurfOff + c);
                }
            }
        }

        outerAirfoilGeo.setAttribute('position', new THREE.Float32BufferAttribute(oaPos, 3));
        outerAirfoilGeo.setAttribute('uv', new THREE.Float32BufferAttribute(oaUv, 2));
        outerAirfoilGeo.setIndex(oaIdx);
        outerAirfoilGeo.computeVertexNormals();

        const outerCovertMesh = new THREE.Mesh(outerAirfoilGeo, darkPlumageMat);
        outerCovertMesh.castShadow = true;
        wristPivot.add(outerCovertMesh);

        // Alula ("thumb" aerodynamic slot feather at the wrist leading edge)
        const alulaGeo = createFeatherBladeGeometry(0.16, 0.044, 0.006, 0.008, 6, 3);
        if (s < 0) alulaGeo.scale(-1, 1, 1);
        const alula = new THREE.Mesh(alulaGeo, darkPlumageMat);
        alula.position.set(s * 0.06, 0.012, 0.18);
        alula.rotation.y = s * 0.22;
        wristPivot.add(alula);

        // 4 Inner Primary Remiges (P1..P4 transitioning from trailing edge toward the wingtip)
        for (let p = 0; p < 4; p++) {
            const pu = p / 3;
            const pLen = 0.38 + pu * 0.07;
            const pGeo = createFeatherBladeGeometry(pLen, 0.092, 0.010, 0.012 + pu * 0.012, 9, 4);
            pGeo.rotateY(Math.PI * 0.5);
            const pMesh = new THREE.Mesh(pGeo, primaryTipMat);
            pMesh.position.set(s * (0.05 + pu * 0.28), -0.002 + p * 0.0015, -0.11 + pu * 0.04);
            pMesh.rotation.y = s * (-0.20 - pu * 0.34);
            pMesh.castShadow = true;
            wristPivot.add(pMesh);
        }

        // 5D. 7 Deeply Slotted, Fingered Outer Primary Wingtip Feathers (`PrimaryTips`, P5..P10)
        //     Matches the iconic splayed wingtip fingers in bald_eagle_usfws_hd.jpg!
        const primaryTipsGroup = new THREE.Group();
        primaryTipsGroup.name = `${sideLabel}PrimaryTips`;
        primaryTipsGroup.position.set(s * 0.34, 0.004, -0.01);
        wristPivot.add(primaryTipsGroup);

        const fingerSpecs = [
            // { len, width, sweepYaw (0 = straight outboard +X/-X, positive = swept back toward -Z, negative = swept forward toward +Z), tipCurlY, zRoot }
            { len: 0.46, width: 0.076, sweep:  0.64, curl: 0.026, zRoot: -0.055 }, // P4
            { len: 0.53, width: 0.072, sweep:  0.46, curl: 0.036, zRoot: -0.030 }, // P5
            { len: 0.60, width: 0.068, sweep:  0.30, curl: 0.048, zRoot: -0.005 }, // P6
            { len: 0.64, width: 0.064, sweep:  0.15, curl: 0.058, zRoot:  0.020 }, // P7 (longest primary!)
            { len: 0.62, width: 0.058, sweep:  0.01, curl: 0.062, zRoot:  0.044 }, // P8
            { len: 0.54, width: 0.052, sweep: -0.13, curl: 0.054, zRoot:  0.068 }, // P9
            { len: 0.41, width: 0.044, sweep: -0.26, curl: 0.040, zRoot:  0.088 }  // P10 (leading outer finger)
        ];

        for (let f = 0; f < fingerSpecs.length; f++) {
            const sp = fingerSpecs[f];
            // Create blade extending along +X, then mirror/orient for left (+1) vs right (-1)
            const fGeo = createFeatherBladeGeometry(sp.len, sp.width, 0.009, sp.curl, 11, 4);
            if (s < 0) {
                // Mirror X and flip triangle winding so normals stay outward
                const posAttr = fGeo.getAttribute('position');
                for (let k = 0; k < posAttr.count; k++) {
                    posAttr.setX(k, -posAttr.getX(k));
                }
                const index = fGeo.getIndex();
                const arr = index.array;
                for (let k = 0; k < arr.length; k += 3) {
                    const tmp = arr[k + 1];
                    arr[k + 1] = arr[k + 2];
                    arr[k + 2] = tmp;
                }
                fGeo.computeVertexNormals();
            }
            const fingerMesh = new THREE.Mesh(fGeo, primaryTipMat);
            fingerMesh.position.set(s * (f * 0.012), f * 0.0018, sp.zRoot);
            fingerMesh.rotation.y = s * sp.sweep;
            fingerMesh.castShadow = true;
            primaryTipsGroup.add(fingerMesh);
        }

        return { shoulderPivot, wristPivot, primaryTipsGroup };
    };

    const leftWing = buildWingSide(1);
    const rightWing = buildWingSide(-1);

    return {
        mesh: eagleRoot,
        headGroup,
        tail: tailGroup,
        leftWing,
        rightWing
    };
}

/**
 * Re-binds articulated joint references (`HeadGroup`, `TailGroup`, `LeftShoulderPivot`, etc.)
 * on a cloned GLTF scene loaded from `assets/models/birds/bald-eagle-hd.glb`.
 */
export function bindLoadedEagleGlbJoints(clonedScene) {
    clonedScene.traverse((obj) => {
        if (obj.isMesh) {
            obj.castShadow = true;
            if (obj.material) {
                obj.material.fog = false;
            }
        }
    });

    const headGroup = clonedScene.getObjectByName('HeadGroup') || new THREE.Group();
    const tail = clonedScene.getObjectByName('TailGroup') || new THREE.Group();
    const leftShoulder = clonedScene.getObjectByName('LeftShoulderPivot') || new THREE.Group();
    const leftWrist = clonedScene.getObjectByName('LeftWristPivot') || new THREE.Group();
    const leftTips = clonedScene.getObjectByName('LeftPrimaryTips') || null;
    const rightShoulder = clonedScene.getObjectByName('RightShoulderPivot') || new THREE.Group();
    const rightWrist = clonedScene.getObjectByName('RightWristPivot') || new THREE.Group();
    const rightTips = clonedScene.getObjectByName('RightPrimaryTips') || null;

    return {
        mesh: clonedScene,
        headGroup,
        tail,
        leftWing: {
            shoulderPivot: leftShoulder,
            wristPivot: leftWrist,
            primaryTipsGroup: leftTips
        },
        rightWing: {
            shoulderPivot: rightShoulder,
            wristPivot: rightWrist,
            primaryTipsGroup: rightTips
        }
    };
}

/**
 * Preloads `assets/models/birds/bald-eagle-hd.glb` asynchronously via `GLTFLoader`
 * (and warms the USFWS reference image in parallel).
 */
export function preloadHighResBaldEagleGlb() {
    if (_glbLoadPromise) return _glbLoadPromise;
    if (typeof window === 'undefined') return Promise.resolve(null);

    _glbLoadPromise = new Promise((resolve) => {
        let settled = false;
        const finish = (sceneVal) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            resolve(sceneVal);
        };

        const timeoutId = setTimeout(() => {
            finish(null);
        }, 10000);

        const loader = new GLTFLoader();
        loader.load(
            BALD_EAGLE_GLB_URL,
            (gltf) => {
                if (gltf && gltf.scene) {
                    gltf.scene.traverse((obj) => {
                        if (obj.geometry) {
                            obj.geometry.userData = { ...(obj.geometry.userData || {}), sharedAsset: true };
                        }
                        if (obj.material) {
                            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                            mats.forEach((m) => {
                                if (!m) return;
                                m.userData = { ...(m.userData || {}), sharedAsset: true };
                                ['map', 'bumpMap', 'normalMap', 'roughnessMap'].forEach((slot) => {
                                    if (m[slot]) {
                                        m[slot].userData = { ...(m[slot].userData || {}), sharedAsset: true };
                                    }
                                });
                            });
                        }
                    });
                    _preloadedGlbScene = gltf.scene;
                    finish(_preloadedGlbScene);
                } else {
                    finish(null);
                }
            },
            undefined,
            () => {
                // Graceful fallback to live high-res sculpted rig if GLB is still baking
                loadEagleReferenceImage()
                    .then((img) => {
                        if (img) getHighResEaglePlumageMaps(img);
                        finish(null);
                    })
                    .catch(() => finish(null));
            }
        );
    });

    return _glbLoadPromise;
}

/**
 * Instantiates a high-resolution articulated Bald Eagle actor, using the preloaded `.glb`
 * model when ready (or building the identical high-res rig immediately and hot-swapping if needed).
 */
export function createHighResBaldEagleActor(phaseOffset = 0, scale = 1.95) {
    const container = new THREE.Group();
    container.name = 'BaldEagleHighResActor';
    container.scale.setScalar(scale);

    const rig = _preloadedGlbScene
        ? bindLoadedEagleGlbJoints(_preloadedGlbScene.clone(true))
        : buildHighResBaldEagleRig(null);

    container.add(rig.mesh);

    const actor = {
        mesh: container,
        rigRoot: rig.mesh,
        headGroup: rig.headGroup,
        tail: rig.tail,
        leftWing: rig.leftWing,
        rightWing: rig.rightWing,
        phaseOffset,
        flapFreq: 5.2,        // Slow, deep, powerful raptor wingbeats (~0.83 Hz)
        glideThreshold: -0.62, // Glides smoothly on thermals ~82% of the time!
        species: 'bald-eagle',
        isHighResEagle: true,
        loadedFromGlb: Boolean(_preloadedGlbScene)
    };

    // If spawned before GLB finished preloading, hot-swap to the GLB mesh seamlessly once loaded
    if (!_preloadedGlbScene) {
        preloadHighResBaldEagleGlb().then((glbScene) => {
            if (glbScene && container.parent) {
                const oldRigRoot = actor.rigRoot;
                container.remove(oldRigRoot);
                if (oldRigRoot) {
                    oldRigRoot.traverse((obj) => {
                        if (obj.geometry && !obj.geometry.userData?.sharedAsset) {
                            try { obj.geometry.dispose(); } catch (_) {}
                        }
                        if (obj.material) {
                            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                            mats.forEach((m) => {
                                if (m && !m.userData?.sharedAsset) {
                                    try { m.dispose(); } catch (_) {}
                                }
                            });
                        }
                    });
                }
                const glbRig = bindLoadedEagleGlbJoints(glbScene.clone(true));
                container.add(glbRig.mesh);
                actor.rigRoot = glbRig.mesh;
                actor.headGroup = glbRig.headGroup;
                actor.tail = glbRig.tail;
                actor.leftWing = glbRig.leftWing;
                actor.rightWing = glbRig.rightWing;
                actor.loadedFromGlb = true;
            }
        });
    }

    return actor;
}
