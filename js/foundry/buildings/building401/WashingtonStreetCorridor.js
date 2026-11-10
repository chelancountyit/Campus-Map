import * as THREE from 'three';

let _cachedAsphaltTex = null;
let _cachedConcreteTableTex = null;
let _cachedAdaAsphaltStencilTex = null;
let _cachedTurnArrowLeftTex = null;
let _cachedTurnArrowRightTex = null;
let _cachedBikeLaneStencilTex = null;

function getAsphaltTexture() {
    if (_cachedAsphaltTex) return _cachedAsphaltTex;
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#252930';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 4200; i++) {
        const x = (i * 73) % 256;
        const y = (i * 137) % 256;
        const v = 30 + ((i * 29) % 24);
        ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
        ctx.fillRect(x, y, 2, 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 28);
    _cachedAsphaltTex = tex;
    return tex;
}

function getConcreteTableTexture() {
    if (_cachedConcreteTableTex) return _cachedConcreteTableTex;
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#5c626b';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 2800; i++) {
        const x = (i * 61) % 256;
        const y = (i * 113) % 256;
        const v = 82 + ((i * 19) % 22);
        ctx.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
        ctx.fillRect(x, y, 2, 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    _cachedConcreteTableTex = tex;
    return tex;
}

/**
 * High-contrast white road-paint stencil of the International Symbol of Access (♿)
 * painted directly on dark asphalt (matching e02d9449.jpg lower-left parallel stall).
 */
function getAdaAsphaltStencilTexture() {
    if (_cachedAdaAsphaltStencilTex) return _cachedAdaAsphaltStencilTex;
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);

    ctx.strokeStyle = '#f8fafc';
    ctx.fillStyle = '#f8fafc';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(114, 154, 46, 0.22 * Math.PI, 1.42 * Math.PI, false);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(122, 62, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(122, 84);
    ctx.lineTo(122, 136);
    ctx.lineTo(166, 136);
    ctx.lineTo(184, 184);
    ctx.lineTo(202, 178);
    ctx.stroke();

    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.moveTo(122, 112);
    ctx.lineTo(158, 112);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    _cachedAdaAsphaltStencilTex = tex;
    return tex;
}

/**
 * Curved white pavement turn-arrow texture ('left' or 'right').
 * With PlaneGeometry rotated by R_y(-travelAngle - PI/2) * R_x(-PI/2):
 *  - Local +Y (canvas top, y = 0) points along forward travel (cos(travelAngle), 0, sin(travelAngle)).
 *  - Local -X (canvas left, x = 0) points to the driver's LEFT (sin(travelAngle), 0, -cos(travelAngle)).
 *  - Local +X (canvas right, x = 256) points to the driver's RIGHT (-sin(travelAngle), 0, cos(travelAngle)).
 */
function getTurnArrowTexture(direction = 'left') {
    if (direction === 'left' && _cachedTurnArrowLeftTex) return _cachedTurnArrowLeftTex;
    if (direction === 'right' && _cachedTurnArrowRightTex) return _cachedTurnArrowRightTex;
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);

    ctx.save();
    if (direction === 'right') {
        ctx.translate(256, 0);
        ctx.scale(-1, 1);
    }

    ctx.strokeStyle = '#f1f5f9';
    ctx.fillStyle = '#f1f5f9';
    ctx.lineWidth = 26;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';

    // Stem rising and curving toward driver's left (canvas -X, x = 34)
    ctx.beginPath();
    ctx.moveTo(156, 228);
    ctx.lineTo(156, 132);
    ctx.quadraticCurveTo(156, 78, 102, 78);
    ctx.lineTo(78, 78);
    ctx.stroke();

    // Arrowhead pointing left (x = 34)
    ctx.beginPath();
    ctx.moveTo(34, 78);
    ctx.lineTo(92, 38);
    ctx.lineTo(92, 118);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    if (direction === 'left') _cachedTurnArrowLeftTex = tex;
    else _cachedTurnArrowRightTex = tex;
    return tex;
}

/**
 * White Bike-Lane Cyclist + Directional Arrow Pavement Stencil (seen along Orondo Ave & S. Okanogan St in a81b7dad.jpg).
 */
function getBikeLaneStencilTexture() {
    if (_cachedBikeLaneStencilTex) return _cachedBikeLaneStencilTex;
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 256);

    ctx.strokeStyle = '#f1f5f9';
    ctx.fillStyle = '#f1f5f9';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Forward directional arrow at top (y = 20 .. 76)
    ctx.beginPath();
    ctx.moveTo(64, 76);
    ctx.lineTo(64, 34);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(64, 16);
    ctx.lineTo(42, 44);
    ctx.lineTo(86, 44);
    ctx.closePath();
    ctx.fill();

    // Bicycle wheels (y = 196)
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(38, 198, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(90, 198, 20, 0, Math.PI * 2);
    ctx.stroke();

    // Frame & rider silhouette
    ctx.beginPath();
    ctx.moveTo(38, 198);
    ctx.lineTo(58, 166);
    ctx.lineTo(84, 166);
    ctx.lineTo(90, 198);
    ctx.moveTo(58, 166);
    ctx.lineTo(66, 198);
    ctx.stroke();

    // Rider torso & head
    ctx.beginPath();
    ctx.arc(62, 124, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(60, 138);
    ctx.lineTo(56, 166);
    ctx.lineTo(76, 152);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    _cachedBikeLaneStencilTex = tex;
    return tex;
}

/**
 * Builds a terrain-conforming subdivided ribbon/quad strip in Building 401 local coordinates.
 */
function buildGradedStripGeometry(lx0, lx1, lz0, lz1, segsX, segsZ, yGrade, yOffset) {
    const geom = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    for (let ix = 0; ix <= segsX; ix++) {
        const u = ix / segsX;
        const lx = lx0 + (lx1 - lx0) * u;
        for (let iz = 0; iz <= segsZ; iz++) {
            const v = iz / segsZ;
            const lz = lz0 + (lz1 - lz0) * v;
            const ly = yGrade(lx, lz) + yOffset;
            positions.push(lx, ly, lz);
            normals.push(0, 1, 0);
            uvs.push(u, v);
        }
    }

    const stride = segsZ + 1;
    for (let ix = 0; ix < segsX; ix++) {
        for (let iz = 0; iz < segsZ; iz++) {
            const a = ix * stride + iz;
            const b = (ix + 1) * stride + iz;
            const c = (ix + 1) * stride + (iz + 1);
            const d = ix * stride + (iz + 1);
            indices.push(a, c, b);
            indices.push(a, d, c);
        }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
}

/**
 * Builds a terrain-conforming arbitrary oriented ribbon along centerline P0 -> P1 with width W.
 */
function buildOrientedRoadRibbonGeometry(x0, z0, x1, z1, halfW0, halfW1, segsAlong, segsAcross, yGrade, yOffset) {
    const geom = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    // Perpendicular unit vector across road
    const nx = -dz / len;
    const nz = dx / len;

    for (let i = 0; i <= segsAlong; i++) {
        const u = i / segsAlong;
        const cx = x0 + dx * u;
        const cz = z0 + dz * u;
        const hw = halfW0 + (halfW1 - halfW0) * u;
        for (let j = 0; j <= segsAcross; j++) {
            const v = j / segsAcross;
            const off = (v * 2 - 1) * hw;
            const px = cx + nx * off;
            const pz = cz + nz * off;
            const py = yGrade(px, pz) + yOffset;
            positions.push(px, py, pz);
            normals.push(0, 1, 0);
            uvs.push(u * (len / 12.0), v);
        }
    }

    const stride = segsAcross + 1;
    for (let i = 0; i < segsAlong; i++) {
        for (let j = 0; j < segsAcross; j++) {
            const a = i * stride + j;
            const b = (i + 1) * stride + j;
            const c = (i + 1) * stride + (j + 1);
            const d = i * stride + (j + 1);
            indices.push(a, b, c);
            indices.push(a, c, d);
        }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
}

/**
 * Builds the complete Washington Street, Orondo Avenue (all the way to 428 Orondo Ave),
 * and S. Okanogan Street 3D Asphalt Roadway Network, Raised Concrete Speed-Table Intersection,
 * Continental Crosswalks, Parallel Parking Lanes, On-Street Asphalt ADA Wheelchair Stencils (♿),
 * Bike Lanes, Painted Yellow Gore Island, and Turn Lanes.
 */
export function buildWashingtonStreetCorridor(arch, mats, yGrade) {
    const roadGrp = new THREE.Group();
    roadGrp.name = 'WashingtonOrondoOkanoganCorridor';

    const asphaltMat = new THREE.MeshStandardMaterial({
        color: '#282c34',
        map: getAsphaltTexture(),
        roughness: 0.86,
        metalness: 0.04,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
    });

    const concreteTableMat = new THREE.MeshStandardMaterial({
        color: '#636973',
        map: getConcreteTableTexture(),
        roughness: 0.80,
        metalness: 0.04,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
    });

    const tableJointMat = new THREE.MeshStandardMaterial({
        color: '#434850',
        roughness: 0.90,
        metalness: 0.02,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3
    });

    const paintWhiteMat = new THREE.MeshStandardMaterial({
        color: '#f1f5f9',
        roughness: 0.52,
        metalness: 0.05,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4
    });

    const paintYellowMat = new THREE.MeshStandardMaterial({
        color: '#eab308',
        roughness: 0.50,
        metalness: 0.05,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4
    });

    const manholeIronMat = new THREE.MeshStandardMaterial({
        color: '#2b2927',
        roughness: 0.65,
        metalness: 0.55,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4
    });

    const manholeCollarMat = new THREE.MeshStandardMaterial({
        color: '#d6d3cb',
        roughness: 0.78,
        metalness: 0.05,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3
    });

    const sidewalkConcreteMat = new THREE.MeshStandardMaterial({
        color: '#e2dcd0',
        roughness: 0.86,
        metalness: 0.03,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
    });

    const curbWhiteMat = new THREE.MeshStandardMaterial({
        color: '#f2eee6',
        roughness: 0.75,
        metalness: 0.04,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3
    });

    const addGradedStripe = (lx0, lx1, lz0, lz1, mat, yOff = 0.036, segsX = 4, segsZ = 1) => {
        const sX = Math.max(1, Math.min(segsX, Math.ceil(Math.abs(lx1 - lx0) / 3.0)));
        const sZ = Math.max(1, Math.min(segsZ, Math.ceil(Math.abs(lz1 - lz0) / 3.0)));
        const geom = buildGradedStripGeometry(lx0, lx1, lz0, lz1, sX, sZ, yGrade, yOff);
        const mesh = new THREE.Mesh(geom, mat);
        mesh.receiveShadow = true;
        roadGrp.add(mesh);
        return mesh;
    };

    const addOrientedStripe = (x0, z0, x1, z1, halfW, mat, yOff = 0.038, segs = 4) => {
        const geom = buildOrientedRoadRibbonGeometry(x0, z0, x1, z1, halfW, halfW, segs, 1, yGrade, yOff);
        const mesh = new THREE.Mesh(geom, mat);
        mesh.receiveShadow = true;
        roadGrp.add(mesh);
        return mesh;
    };

    const addTwinBarPair = (cx, cz, lengthX, widthZ, rotY = 0) => {
        const wy = yGrade(cx, cz) + 0.038;
        const pairGrp = new THREE.Group();
        pairGrp.position.set(cx, wy, cz);
        pairGrp.rotation.y = rotY;
        for (const offset of [-0.26, 0.26]) {
            const bar = new THREE.Mesh(new THREE.BoxGeometry(lengthX, 0.016, widthZ), paintWhiteMat);
            bar.position.set(0, 0, offset);
            bar.receiveShadow = true;
            pairGrp.add(bar);
        }
        roadGrp.add(pairGrp);
    };

    const leftArrowTex = getTurnArrowTexture('left');
    const rightArrowTex = getTurnArrowTexture('right');
    const bikeStencilTex = getBikeLaneStencilTexture();

    const leftArrowMat = new THREE.MeshBasicMaterial({
        map: leftArrowTex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -5,
        polygonOffsetUnits: -5
    });
    const rightArrowMat = new THREE.MeshBasicMaterial({
        map: rightArrowTex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -5,
        polygonOffsetUnits: -5
    });
    const bikeStencilMat = new THREE.MeshBasicMaterial({
        map: bikeStencilTex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -5,
        polygonOffsetUnits: -5
    });

    /**
     * Places a flat terrain-conforming decal oriented along travel heading `travelAngle`
     * (where travelAngle = 0 means +lx401, PI/2 means +lz401, -PI/2 means -lz401).
     */
    const addRoadDecal = (cx, cz, w, h, mat, travelAngle, yOff = 0.041) => {
        const cy = yGrade(cx, cz) + yOff;
        const decal = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        decal.rotation.order = 'YXZ';
        decal.rotation.x = -Math.PI / 2;
        // When rotation.x = -PI/2 and rotation.y = 0, Plane local +Y points along -Z (-lz401).
        // To make Plane local +Y point along (dx = cos(travelAngle), dz = sin(travelAngle)):
        // rotation.y = -travelAngle - Math.PI / 2
        decal.rotation.y = -travelAngle - Math.PI / 2;
        decal.position.set(cx, cy, cz);
        roadGrp.add(decal);
    };

    // =========================================================================
    // 1. WASHINGTON STREET DARK ASPHALT ROADWAY BED (King St lx=-63.5m to Orondo Ave lx=+124.5m)
    // =========================================================================
    // 1A. South-West Asphalt Block: King St (-63.5m) to Speed Table South Edge (+19.45m), plus rounded-corner spandrel fills
    {
        const swAsphalt = new THREE.Mesh(
            buildGradedStripGeometry(-63.5, 19.45, 24.70, 38.65, 36, 6, yGrade, 0.016),
            asphaltMat
        );
        swAsphalt.receiveShadow = true;
        roadGrp.add(swAsphalt);

        // Rounded-corner asphalt spandrel fills at Washington St & King St (West Wing SE corner & Building 411/412 NW corner)
        for (const [cx0, cx1, cz0, cz1] of [
            [-63.8, -55.8, 19.20, 25.00],
            [-62.0, -55.0, 38.40, 44.20]
        ]) {
            const cornerFill = new THREE.Mesh(
                buildGradedStripGeometry(cx0, cx1, cz0, cz1, 4, 4, yGrade, 0.016),
                asphaltMat
            );
            cornerFill.receiveShadow = true;
            roadGrp.add(cornerFill);
        }
    }

    // 1B. North-East Asphalt Block: Speed Table North Edge (+42.85m) all the way into Orondo Ave (+125.05m),
    //     plus rounded-corner spandrel fills at Courthouse 350, Building 300 corner, and Building 300 disabled parking bay
    {
        const neAsphalt = new THREE.Mesh(
            buildGradedStripGeometry(42.85, 125.05, 24.70, 38.75, 34, 6, yGrade, 0.016),
            asphaltMat
        );
        neAsphalt.receiveShadow = true;
        roadGrp.add(neAsphalt);

        for (const [cx0, cx1, cz0, cz1, nx, nz] of [
            [116.5, 125.05, 20.00, 25.60, 14, 10], // Courthouse 350 rounded corner spandrel
            [117.5, 123.38, 38.50, 43.35, 14, 10], // Building 300 rounded corner spandrel
            [91.5,  114.80, 38.50, 40.85, 20, 6]   // Building 300 recessed disabled parking turnout bay
        ]) {
            const cornerFill = new THREE.Mesh(
                buildGradedStripGeometry(cx0, cx1, cz0, cz1, nx, nz, yGrade, 0.016),
                asphaltMat
            );
            cornerFill.receiveShadow = true;
            roadGrp.add(cornerFill);
        }
    }

    // 1C. Full 3D Douglas Street Roadway Corridor (Washington St Speed Table lz=43.25m all the way to the 428 Orondo Ave stop level lz=175.0m!)
    //     Spans between Building 400's SW curb (lx=24.62m) and Building 316's NE curb (lx=38.46m), flaring slightly under both rounded corners.
    {
        const getDouglasSWCurbX = (lz) => {
            if (lz <= 44.5) return 24.45;
            return 24.62;
        };
        const getDouglasNECurbX = (lz) => {
            if (lz <= 44.5) return 38.65;
            return 38.46;
        };
        const dzStart = 43.20;
        const dzEnd = 175.0;
        const dzSegs = 68;
        const dxSegs = 6;

        const dougGeom = new THREE.BufferGeometry();
        const dPos = [];
        const dNorm = [];
        const dUv = [];
        const dIdx = [];

        for (let iz = 0; iz <= dzSegs; iz++) {
            const v = iz / dzSegs;
            const lz = dzStart + (dzEnd - dzStart) * v;
            const xMin = getDouglasSWCurbX(lz);
            const xMax = getDouglasNECurbX(lz);
            for (let ix = 0; ix <= dxSegs; ix++) {
                const u = ix / dxSegs;
                const lx = xMin + (xMax - xMin) * u;
                const ly = yGrade(lx, lz) + 0.016;
                dPos.push(lx, ly, lz);
                dNorm.push(0, 1, 0);
                dUv.push(u, v * 8);
            }
        }
        for (let iz = 0; iz < dzSegs; iz++) {
            for (let ix = 0; ix < dxSegs; ix++) {
                const a = iz * (dxSegs + 1) + ix;
                const b = a + 1;
                const c = (iz + 1) * (dxSegs + 1) + ix;
                const d = c + 1;
                dIdx.push(a, c, b);
                dIdx.push(b, c, d);
            }
        }
        dougGeom.setAttribute('position', new THREE.Float32BufferAttribute(dPos, 3));
        dougGeom.setAttribute('normal', new THREE.Float32BufferAttribute(dNorm, 3));
        dougGeom.setAttribute('uv', new THREE.Float32BufferAttribute(dUv, 2));
        dougGeom.setIndex(dIdx);
        dougGeom.computeVertexNormals();

        const douglasRoadMesh = new THREE.Mesh(dougGeom, asphaltMat);
        douglasRoadMesh.receiveShadow = true;
        roadGrp.add(douglasRoadMesh);

        // Douglas Street SW Sidewalk & Curb past Building 400's rear parking lot (lz = 87.35m .. 175.0m, lx = 22.40m .. 24.62m)
        const dougSWSidewalk = new THREE.Mesh(
            buildGradedStripGeometry(22.40, 24.62, 87.35, 175.0, 2, 36, yGrade, 0.085),
            sidewalkConcreteMat
        );
        dougSWSidewalk.receiveShadow = true;
        roadGrp.add(dougSWSidewalk);

        const dougSWCurb = new THREE.Mesh(
            buildGradedStripGeometry(24.44, 24.64, 87.35, 175.0, 1, 36, yGrade, 0.125),
            curbWhiteMat
        );
        dougSWCurb.receiveShadow = true;
        roadGrp.add(dougSWCurb);

        // Douglas Street NE Sidewalk & Curb past Building 316's Gym lot (split around the Service Road throat at lz = 130.5m .. 138.2m)
        for (const [neZ0, neZ1, neSteps] of [
            [113.95, 130.50, 8],
            [138.20, 175.00, 16]
        ]) {
            const dougNESidewalk = new THREE.Mesh(
                buildGradedStripGeometry(38.46, 40.68, neZ0, neZ1, 2, neSteps, yGrade, 0.085),
                sidewalkConcreteMat
            );
            dougNESidewalk.receiveShadow = true;
            roadGrp.add(dougNESidewalk);

            const dougNECurb = new THREE.Mesh(
                buildGradedStripGeometry(38.44, 38.64, neZ0, neZ1, 1, neSteps, yGrade, 0.125),
                curbWhiteMat
            );
            dougNECurb.receiveShadow = true;
            roadGrp.add(dougNECurb);
        }

        // Douglas Street Traffic Markings:
        // - Dashed Yellow Centerline (lx = 31.54m, lz = 45.5m .. 171.0m)
        for (let lz = 45.5; lz <= 171.0; lz += 7.5) {
            if (lz > 128.5 && lz < 139.0) continue; // Gap across the curved Service Road throat
            addGradedStripe(31.47, 31.61, lz, lz + 2.95, paintYellowMat, 0.036, 1, 2);
        }

        // - SW Parallel Parking Lane Line + 'T' Ticks along Building 400 (lx = 27.05m, lz = 47.0m .. 71.8m, 3195fbc5.jpg)
        addGradedStripe(26.99, 27.11, 47.0, 71.8, paintWhiteMat, 0.036, 1, 10);
        for (let tz = 47.0; tz <= 71.8; tz += 6.2) {
            addGradedStripe(26.35, 27.11, tz - 0.06, tz + 0.06, paintWhiteMat, 0.036, 1, 1);
        }

        // - SW Parallel Parking Lane Line beyond Building 400's rear lot (lx = 27.05m, lz = 89.0m .. 168.0m continuous!)
        addGradedStripe(26.99, 27.11, 89.0, 168.0, paintWhiteMat, 0.036, 1, 28);
        for (let tz = 89.0; tz <= 168.0; tz += 6.08) {
            addGradedStripe(26.35, 27.11, tz - 0.06, tz + 0.06, paintWhiteMat, 0.036, 1, 1);
        }

        // - NE Parallel Parking Lane Line + 'T' Ticks along Building 316 (lx = 36.02m, lz = 45.5m .. 79.8m)
        addGradedStripe(35.96, 36.08, 45.5, 79.8, paintWhiteMat, 0.036, 1, 14);
        for (let tz = 45.5; tz <= 79.8; tz += 5.71) {
            addGradedStripe(35.96, 36.68, tz - 0.06, tz + 0.06, paintWhiteMat, 0.036, 1, 1);
        }

        // - NE Parallel Parking Lane Line past the Service Road throat (lx = 36.02m, lz = 139.0m .. 168.0m)
        addGradedStripe(35.96, 36.08, 139.0, 168.0, paintWhiteMat, 0.036, 1, 12);
        for (let tz = 139.0; tz <= 168.0; tz += 5.8) {
            addGradedStripe(35.96, 36.68, tz - 0.06, tz + 0.06, paintWhiteMat, 0.036, 1, 1);
        }

        // - End Stop Crosswalk & Stop Bar at the 428 Orondo Ave Level (lz = 172.80m, symmetrically centered at lx = 31.54m)
        addGradedStripe(27.15, 31.45, 170.35, 170.75, paintWhiteMat, 0.038, 2, 1);
        for (let s = 0; s < 5; s++) {
            const sx = 27.50 + s * 2.02;
            addTwinBarPair(sx, 172.80, 2.65, 0.22, Math.PI / 2);
        }
    }

    // =========================================================================
    // 2. MID-BLOCK RAISED CONCRETE SPEED-TABLE INTERSECTION (Washington St & Douglas St)
    //    Proportionally spanned between Building 400's corner (lx = 19.30m) and Building 316's corner (lx = 42.95m),
    //    and extending up Douglas St throat to lz = 43.35m (af9e2178.jpg, 3195fbc5.jpg, 3f5febdd.jpg)
    // =========================================================================
    {
        const mainTable = new THREE.Mesh(
            buildGradedStripGeometry(19.30, 42.95, 24.80, 38.60, 14, 6, yGrade, 0.025),
            concreteTableMat
        );
        mainTable.receiveShadow = true;
        roadGrp.add(mainTable);

        const douglasTable = new THREE.Mesh(
            buildGradedStripGeometry(19.30, 42.95, 38.45, 43.35, 14, 4, yGrade, 0.025),
            concreteTableMat
        );
        douglasTable.receiveShadow = true;
        roadGrp.add(douglasTable);

        for (const jx of [19.35, 25.24, 31.13, 37.01, 42.90]) {
            addGradedStripe(jx - 0.04, jx + 0.04, 24.85, 38.50, tableJointMat, 0.028, 1);
        }
        for (const jz of [28.20, 31.65, 35.10]) {
            addGradedStripe(19.35, 42.90, jz - 0.04, jz + 0.04, tableJointMat, 0.028, 8);
        }
    }

    // =========================================================================
    // 3. SPEED-TABLE CONTINENTAL CROSSWALKS & V-CHEVRON RAMP MARKINGS
    //    Exact 1:1 alignment with Building 400's tactile pads (lx=22.55m, lz=42.20m),
    //    Building 316's tactile pads (lx=39.69m, lz=42.07m), and Building 401's tactile pads (lx=22.55m & 39.69m)!
    // =========================================================================
    {
        // SW Crosswalk (lx = 22.55m) & NE Crosswalk (lx = 39.69m) centered symmetrically across Washington St (lz = 24.85m..38.60m, mid = 31.725m)
        for (let s = 0; s < 6; s++) {
            const sz = 26.725 + s * 2.00;
            addTwinBarPair(22.55, sz, 2.85, 0.22, 0);
            addTwinBarPair(39.69, sz, 2.85, 0.22, 0);
        }
        // Douglas St Throat Crosswalk (lz = 41.65m) centered symmetrically between Building 400 (lx=25.75m) & Building 316 (lx=37.61m) tactile pads (mid = 31.68m)
        for (let s = 0; s < 5; s++) {
            const sx = 27.68 + s * 2.00;
            addTwinBarPair(sx, 41.65, 2.65, 0.22, Math.PI / 2);
        }
        // Solid White Stop Bar on Douglas St immediately North of the Douglas St crosswalk (lz = 43.55m..43.95m, af9e2178.jpg!)
        addGradedStripe(31.68, 35.80, 43.55, 43.95, paintWhiteMat, 0.038, 2);

        const addSpeedTableChevron = (apexX, baseX, cz) => {
            const cy = yGrade((apexX + baseX) * 0.5, cz) + 0.036;
            const grp = new THREE.Group();
            grp.position.set(0, cy, 0);
            const dir = apexX > baseX ? 1 : -1;
            const len = Math.abs(apexX - baseX);
            const halfW = 0.78;
            for (const side of [-1, 1]) {
                const dx = len * dir;
                const dz = -side * halfW;
                const armLen = Math.hypot(dx, dz);
                const angle = Math.atan2(dz, dx);
                const arm = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.016, 0.18), paintWhiteMat);
                arm.position.set(baseX + dx * 0.5, 0, cz + side * halfW * 0.5);
                arm.rotation.y = -angle;
                arm.receiveShadow = true;
                grp.add(arm);

                const arm2 = new THREE.Mesh(new THREE.BoxGeometry(armLen * 0.55, 0.016, 0.14), paintWhiteMat);
                arm2.position.set(baseX + dx * 0.30, 0, cz + side * halfW * 0.28);
                arm2.rotation.y = -angle;
                arm2.receiveShadow = true;
                grp.add(arm2);
            }
            roadGrp.add(grp);
        };

        // Right-hand travel lane approaching from SW (+lx): lz = 33.55m
        addSpeedTableChevron(20.90, 19.45, 33.55);
        // Right-hand travel lane approaching from NE (-lx): lz = 29.65m
        addSpeedTableChevron(41.35, 42.80, 29.65);
    }

    // =========================================================================
    // 4. CAST-IRON UTILITY MANHOLE COVERS ON SPEED TABLE & ASPHALT
    // =========================================================================
    for (const [mx, mz] of [
        [29.80, 30.85],
        [35.40, 33.85],
        [28.15, 38.85],
        [54.80, 33.25],
        [63.40, 29.10]
    ]) {
        const my = yGrade(mx, mz) + 0.036;
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.014, 20), manholeCollarMat);
        collar.position.set(mx, my, mz);
        collar.receiveShadow = true;
        roadGrp.add(collar);

        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.018, 20), manholeIronMat);
        lid.position.set(mx, my + 0.002, mz);
        lid.receiveShadow = true;
        roadGrp.add(lid);
    }

    // =========================================================================
    // 5. SOUTH-WEST BLOCK MARKINGS: KING ST CROSSWALKS, DASHED YELLOW CENTERLINE
    //    & PARALLEL PARKING LANES (lx = -61.85m to +18.0m, 3f5febdd.jpg & 677e6cdc.jpg)
    // =========================================================================
    {
        // Washington St Crosswalk at King St (lx = -61.85m, aligned with West Wing's yellow tactile pad & centered across Washington St!)
        for (let s = 0; s < 6; s++) {
            const sz = 26.725 + s * 2.00;
            addTwinBarPair(-61.85, sz, 2.75, 0.22, 0);
        }
        // Solid white stop bar at King St for SW-bound (-lx) right-hand lane (lz = 27.35m .. 31.65m)
        addGradedStripe(-58.80, -58.40, 27.35, 31.65, paintWhiteMat, 0.038, 1);

        // Dashed Yellow Centerline (lz = 31.65m, lx = -54.5m .. +15.2m, stopping cleanly before the speed table at +19.30m)
        for (let lx = -54.5; lx <= 15.2; lx += 7.5) {
            addGradedStripe(lx, lx + 2.95, 31.58, 31.72, paintYellowMat, 0.036, 1);
        }

        // SE Parallel Parking Lane Line + 'T' Ticks (along West Wing & 401 South, lz = 27.35m)
        addGradedStripe(-53.5, -16.5, 27.29, 27.41, paintWhiteMat, 0.036, 12);
        for (let tx = -53.5; tx <= -16.5; tx += 7.4) {
            addGradedStripe(tx - 0.06, tx + 0.06, 26.75, 27.41, paintWhiteMat, 0.036, 1);
        }
        addGradedStripe(-10.5, 17.5, 27.29, 27.41, paintWhiteMat, 0.036, 10);
        for (let tx = -10.5; tx <= 17.5; tx += 7.0) {
            addGradedStripe(tx - 0.06, tx + 0.06, 26.75, 27.41, paintWhiteMat, 0.036, 1);
        }

        // NW Parallel Parking Lane Line + 'T' Ticks (along 411/412 & 400, lz = 35.85m, stopping at lx = +17.5m before the speed table)
        addGradedStripe(-53.5, 17.5, 35.79, 35.91, paintWhiteMat, 0.036, 24);
        for (let tx = -53.5; tx <= 17.5; tx += 6.45) {
            addGradedStripe(tx - 0.06, tx + 0.06, 35.79, 36.45, paintWhiteMat, 0.036, 1);
        }
    }

    // =========================================================================
    // 6. NORTH-EAST BLOCK MARKINGS: DASHED -> DOUBLE-YELLOW CENTERLINE,
    //    PARALLELS, AND RIGHT-HAND APPROACH DUAL TURN LANES TO ORONDO AVE
    //    (a81b7dad.jpg, e02d9449.jpg, fbe72920.jpg, c64c606e.jpg)
    // =========================================================================
    {
        // 6A. Dashed Yellow Centerline from Speed Table (lx = +45.5m) to Courthouse Mid-Block (lx = +70.5m)
        for (let lx = 45.5; lx <= 69.5; lx += 7.4) {
            addGradedStripe(lx, lx + 2.85, 31.18, 31.32, paintYellowMat, 0.036, 1);
        }

        // 6B. Double Solid Yellow Centerline approaching Orondo Ave (lx = +73.2m .. +117.3m, lz = 31.05m & 31.32m)
        // Extends right up to the Orondo Ave stop bar at lx = +117.30m (matching b406cdcf.png & a81b7dad.jpg!)
        addGradedStripe(73.2, 117.3, 30.98, 31.11, paintYellowMat, 0.036, 15);
        addGradedStripe(73.2, 117.3, 31.25, 31.38, paintYellowMat, 0.036, 15);

        // 6C. SE Parallel Parking Lane Line in front of Building 401 North (lx = +45.2m .. +65.4m, lz = 27.45m, af9e2178.jpg & e02d9449.jpg)
        addGradedStripe(45.2, 65.4, 27.39, 27.51, paintWhiteMat, 0.036, 8);
        for (const tx of [45.2, 54.2, 60.0, 65.4]) {
            addGradedStripe(tx - 0.06, tx + 0.06, 26.65, 27.51, paintWhiteMat, 0.036, 1);
        }

        // 6D. SE Parallel Parking Lane Line in front of Courthouse 350 (lx = +69.5m .. +98.5m, lz = 27.25m, c64c606e.jpg)
        addGradedStripe(69.5, 98.5, 27.19, 27.31, paintWhiteMat, 0.036, 10);
        for (const tx of [69.5, 76.5, 83.5, 91.0, 98.5]) {
            addGradedStripe(tx - 0.06, tx + 0.06, 26.55, 27.31, paintWhiteMat, 0.036, 1);
        }

        // 6E. NW Parallel Parking Lane Line in front of Building 316 (lx = +45.5m .. +76.8m, lz = 36.05m)
        addGradedStripe(45.5, 76.8, 35.99, 36.11, paintWhiteMat, 0.036, 11);
        for (let tx = 45.5; tx <= 76.8; tx += 6.26) {
            addGradedStripe(tx - 0.06, tx + 0.06, 35.99, 36.68, paintWhiteMat, 0.036, 1);
        }

        // 6F. Right-Hand Approach Dual Turn-Lane White Divider Line (lx = +91.5m .. +117.3m, lz = 34.90m, a81b7dad.jpg & b406cdcf.png)
        // Located on the Building 300 (+lz = 31.38m .. 38.55m) side of the double-yellow line, meeting the stop bar at lx = +117.3m!
        addGradedStripe(91.5, 117.3, 34.84, 34.96, paintWhiteMat, 0.036, 9);

        // 6G. Properly Oriented Left-Turn (↰) & Right-Turn (↱) Pavement Arrows in the Right-Hand Approach Lanes
        // Inner Lane (lz = 33.12m, next to double-yellow line) = LEFT-TURN LANE (↰ pointing LEFT toward Courthouse 350)
        // Outer Lane (lz = 36.68m, next to Building 300 curb) = RIGHT-TURN LANE (↱ pointing RIGHT toward Building 300)
        for (const ax of [96.8, 108.8]) {
            addRoadDecal(ax, 33.12, 2.15, 2.50, leftArrowMat, 0, 0.041);
            addRoadDecal(ax, 36.68, 2.15, 2.50, rightArrowMat, 0, 0.041);
        }

        // 6H. Solid White Stop Bar at Orondo Ave for the Right-Hand Approach Lanes (lx = +117.30m..+117.72m, lz = 31.32m .. 38.45m)
        addGradedStripe(117.30, 117.72, 31.32, 38.45, paintWhiteMat, 0.038, 1, 3);

        // 6I. Orondo Ave & Washington St Throat Continental Crosswalk (lx = +120.60m, 6 twin-bar pairs centered across lz = 25.24m..38.66m, connecting Courthouse 350 & Building 300 corners!)
        for (let s = 0; s < 6; s++) {
            const sz = 26.95 + s * 2.00;
            addTwinBarPair(120.60, sz, 2.75, 0.22, 0);
        }
    }

    // =========================================================================
    // 7. ON-STREET ASPHALT ADA WHEELCHAIR PARKING STENCILS (♿) & ACCESS AISLES
    // =========================================================================
    {
        const adaStencilTex = getAdaAsphaltStencilTexture();
        const adaStencilMat = new THREE.MeshBasicMaterial({
            map: adaStencilTex,
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -5,
            polygonOffsetUnits: -5
        });

        // 7A. Primary On-Street Asphalt ADA Parallel Parking Stall in front of Building 401 North (lx = +50.40m, lz = 26.15m, e02d9449.jpg)
        {
            addRoadDecal(50.40, 26.15, 1.55, 1.55, adaStencilMat, 0, 0.042);

            addGradedStripe(47.55, 47.65, 25.00, 27.45, paintWhiteMat, 0.037, 1);
            for (let hz = 25.25; hz <= 27.25; hz += 0.50) {
                addGradedStripe(45.30, 47.55, hz - 0.04, hz + 0.04, paintWhiteMat, 0.037, 1);
            }

            const postX = 50.80, postZ = 24.55;
            const postY = yGrade(postX, postZ);
            const postMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.45, metalness: 0.75 });
            const signFaceMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35, metalness: 0.10 });
            const signBlueMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.40, metalness: 0.10 });

            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 2.25, 8), postMat);
            post.position.set(postX, postY + 1.125, postZ);
            post.castShadow = true;
            roadGrp.add(post);

            const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.46, 0.32), signFaceMat);
            signBoard.position.set(postX, postY + 2.05, postZ);
            roadGrp.add(signBoard);

            const signBadge = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.22, 0.24), signBlueMat);
            signBadge.position.set(postX, postY + 2.12, postZ);
            roadGrp.add(signBadge);
        }

        // 7B. Building 300 Recessed Parallel Disabled Parking Turnout Bay ADA Stencil (lx = +104.5m, lz = 39.55m)
        {
            addRoadDecal(104.50, 39.55, 1.50, 1.50, adaStencilMat, Math.PI, 0.042);
        }
    }

    // =========================================================================
    // 8. FULL 3D ORONDO AVENUE CORRIDOR (Memorial Park lz=-52m -> Courthouse 350 ->
    //    Washington St -> Building 300 -> Unnamed Service Road -> 428 Orondo Ave lz=+175m)
    //    Modeled directly from aerial photo a81b7dad.jpg & 499059e4.jpg!
    // =========================================================================
    {
        // Campus-side (SW) curb profile of Orondo Ave:
        // - lz in [-62.0, 20.2]: Memorial Park & Courthouse 350 straight sidewalk curb (lx = 124.96m)
        // - lz in [20.2, 43.2]: Washington St intersection throat (blends to lx = 123.18m)
        // - lz in [43.2, 175.0]: Building 300 & 428 Orondo Ave sidewalk curb (lx = 123.18m)
        const getOrondoSWCurbX = (lz) => {
            if (lz <= 20.2) return 124.96;
            if (lz <= 43.2) {
                const t = (lz - 20.2) / (43.2 - 20.2);
                return THREE.MathUtils.lerp(124.96, 123.18, t);
            }
            return 123.18;
        };

        const orondoNECurbX = 141.40;
        const zStart = -62.0;
        const zEnd = 175.0;
        const zSegs = 96;
        const xSegs = 8;

        const orondoGeom = new THREE.BufferGeometry();
        const oPos = [];
        const oNorm = [];
        const oUv = [];
        const oIdx = [];

        for (let iz = 0; iz <= zSegs; iz++) {
            const v = iz / zSegs;
            const lz = zStart + (zEnd - zStart) * v;
            const xMin = getOrondoSWCurbX(lz);
            const xMax = orondoNECurbX;
            for (let ix = 0; ix <= xSegs; ix++) {
                const u = ix / xSegs;
                const lx = xMin + (xMax - xMin) * u;
                const ly = yGrade(lx, lz) + 0.016;
                oPos.push(lx, ly, lz);
                oNorm.push(0, 1, 0);
                oUv.push(u, v * 12);
            }
        }
        const stride = xSegs + 1;
        for (let iz = 0; iz < zSegs; iz++) {
            for (let ix = 0; ix < xSegs; ix++) {
                const a = iz * stride + ix;
                const b = (iz + 1) * stride + ix;
                const c = (iz + 1) * stride + (ix + 1);
                const d = iz * stride + (ix + 1);
                oIdx.push(a, b, c);
                oIdx.push(a, c, d);
            }
        }
        orondoGeom.setAttribute('position', new THREE.Float32BufferAttribute(oPos, 3));
        orondoGeom.setAttribute('normal', new THREE.Float32BufferAttribute(oNorm, 3));
        orondoGeom.setAttribute('uv', new THREE.Float32BufferAttribute(oUv, 2));
        orondoGeom.setIndex(oIdx);
        orondoGeom.computeVertexNormals();

        const orondoAsphaltMesh = new THREE.Mesh(orondoGeom, asphaltMat);
        orondoAsphaltMesh.receiveShadow = true;
        roadGrp.add(orondoAsphaltMesh);

        // Unnamed Service Road Throat Asphalt Stub off Orondo Ave between Building 300 & County Parking Lot (lz = 115.8m .. 123.0m, lx = 116.5m .. 123.25m)
        {
            const serviceStub = new THREE.Mesh(
                buildGradedStripGeometry(116.5, 123.25, 115.85, 122.95, 4, 4, yGrade, 0.015),
                asphaltMat
            );
            serviceStub.receiveShadow = true;
            roadGrp.add(serviceStub);
        }

        // Opposite (NE) Concrete Sidewalk & Curb along Orondo Ave (lx = 141.40m .. 143.65m),
        // split cleanly at the exact tangency points of the S. Okanogan St Rounded Corner Curbs (shifted another 30ft / -9.15m closer to S. Chelan Ave: lz = -51.95m and lz = -3.95m)
        for (const [swZ0, swZ1, swSteps] of [
            [-62.0, -51.95, 6],
            [-3.95, 175.0, 76]
        ]) {
            const neSidewalk = new THREE.Mesh(
                buildGradedStripGeometry(141.40, 143.65, swZ0, swZ1, 2, swSteps, yGrade, 0.085),
                sidewalkConcreteMat
            );
            neSidewalk.receiveShadow = true;
            roadGrp.add(neSidewalk);

            const neCurb = new THREE.Mesh(
                buildGradedStripGeometry(141.32, 141.50, swZ0, swZ1, 1, swSteps, yGrade, 0.11),
                curbWhiteMat
            );
            neCurb.receiveShadow = true;
            roadGrp.add(neCurb);
        }

        // 8A. Square White-Concrete-Collared Iron Manhole Cover in center of Orondo & Washington Intersection (a81b7dad.jpg)
        {
            const mhX = 131.60, mhZ = 31.80;
            const mhY = yGrade(mhX, mhZ) + 0.036;
            const collar = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.020, 1.12), manholeCollarMat);
            collar.rotation.y = Math.PI * 0.25;
            collar.position.set(mhX, mhY, mhZ);
            roadGrp.add(collar);
            const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.024, 18), manholeIronMat);
            lid.position.set(mhX, mhY + 0.003, mhZ);
            roadGrp.add(lid);
        }

        // 8B. West Continental Crosswalk across Orondo Ave (at Building 300 corner, lz = +42.40m, connecting Building 300 corner at lz=43.16m to NE sidewalk, a81b7dad.jpg)
        //     Centered symmetrically across the 18.20m Orondo Ave width (lx = 123.20m .. 141.40m, midpoint 132.30m):
        //     7 twin-bar pairs at cx = 125.70 + s * 2.20 (s = 0..6 => 125.70 .. 138.90, midpoint 132.30m!)
        for (let s = 0; s < 7; s++) {
            const cx = 125.70 + s * 2.20;
            addTwinBarPair(cx, 42.40, 2.75, 0.22, Math.PI / 2);
        }
        // Solid white stop bar on Orondo Ave NW of the West Crosswalk (for SE-bound traffic at lz = 45.20m..45.62m, lx = 123.30m..130.65m)
        addGradedStripe(123.30, 130.65, 45.20, 45.62, paintWhiteMat, 0.038, 3, 1);

        // 8C. East Continental Crosswalk across Orondo Ave (at Courthouse 350 corner, lz = +21.20m, connecting Courthouse 350 tactile pad at lz=20.24m..24.14m to S. Okanogan West corner, a81b7dad.jpg)
        //     Centered symmetrically across the 16.40m Orondo Ave width (lx = 125.00m .. 141.40m, midpoint 133.20m):
        //     7 twin-bar pairs at cx = 126.90 + s * 2.10 (s = 0..6 => 126.90 .. 139.50, midpoint 133.20m!)
        for (let s = 0; s < 7; s++) {
            const cx = 126.90 + s * 2.10;
            addTwinBarPair(cx, 21.20, 2.75, 0.22, Math.PI / 2);
        }

        // 8D. Oval/Tapered Yellow Diagonal-Hatched Median Gore Island on Orondo Ave (lz = -4.5m .. +18.8m, lx = 130.8m .. 134.1m, a81b7dad.jpg!)
        {
            const gZ0 = -4.50, gZ1 = 18.80;
            const gX0 = 130.85, gX1 = 134.05;
            // Double yellow perimeter borders of the gore island
            addGradedStripe(gX0, gX0 + 0.12, gZ0, gZ1, paintYellowMat, 0.037, 1, 6);
            addGradedStripe(gX0 + 0.24, gX0 + 0.36, gZ0, gZ1, paintYellowMat, 0.037, 1, 6);
            addGradedStripe(gX1 - 0.12, gX1, gZ0, gZ1, paintYellowMat, 0.037, 1, 6);
            addGradedStripe(gX1 - 0.36, gX1 - 0.24, gZ0, gZ1, paintYellowMat, 0.037, 1, 6);
            // Tapered nose caps at gZ0 and gZ1
            addGradedStripe(gX0, gX1, gZ0, gZ0 + 0.25, paintYellowMat, 0.037, 2, 1);
            addGradedStripe(gX0, gX1, gZ1 - 0.25, gZ1, paintYellowMat, 0.037, 2, 1);

            // Diagonal yellow cross-bars inside the gore island (seen next to the white pickup in a81b7dad.jpg!)
            for (let gz = gZ0 + 1.10; gz <= gZ1 - 1.10; gz += 1.45) {
                addOrientedStripe(gX0 + 0.35, gz - 0.45, gX1 - 0.35, gz + 0.45, 0.09, paintYellowMat, 0.038, 2);
            }
        }

        // 8E. Orondo Ave NW Segment (lz = +46.2m .. +174.0m, from Washington St past Building 300 & Unnamed Road to 428 Orondo Ave):
        //     - Center Two-Way Left-Turn / Turn Pocket (lx = 130.65m .. 133.85m)
        //     - Dedicated Bike Lanes on both sides (SW curb side lx = 124.85m, NE curb side lx = 139.65m)
        {
            // Center Turn Lane / Double-Yellow Lines from lz = +46.2m to +174.0m
            addGradedStripe(130.60, 130.73, 46.2, 174.0, paintYellowMat, 0.036, 1, 42);
            addGradedStripe(130.86, 130.99, 46.2, 96.0, paintYellowMat, 0.036, 1, 18);
            addGradedStripe(133.65, 133.78, 46.2, 96.0, paintYellowMat, 0.036, 1, 18);
            addGradedStripe(133.90, 134.03, 46.2, 174.0, paintYellowMat, 0.036, 1, 42);

            // Dashed yellow inner turn-lane lines from lz = 98.0m to 172.0m (in front of County Lot & 428 Orondo Ave)
            for (let z = 98.0; z <= 170.0; z += 7.5) {
                addGradedStripe(130.86, 130.99, z, z + 2.8, paintYellowMat, 0.036, 1, 1);
                addGradedStripe(133.65, 133.78, z, z + 2.8, paintYellowMat, 0.036, 1, 1);
            }

            // Left-Turn Arrows in the Orondo Ave center turn pocket approaching Washington St (traveling -lz toward Washington St, turning left into Washington St)
            for (const az of [52.0, 65.0]) {
                addRoadDecal(132.30, az, 2.05, 2.40, leftArrowMat, -Math.PI / 2, 0.041);
            }

            // Solid White Bike Lane Lines along SW side (Building 300 -> 428 Orondo, lx = 124.85m) and NE side (lx = 139.65m, welding at lz = -3.95m!)
            addGradedStripe(124.79, 124.91, 46.2, 115.2, paintWhiteMat, 0.036, 1, 24);
            addGradedStripe(124.79, 124.91, 123.5, 174.0, paintWhiteMat, 0.036, 1, 18);
            addGradedStripe(139.59, 139.71, -3.95, 174.0, paintWhiteMat, 0.036, 1, 58);

            // Bike Lane Stencils along Orondo Ave (SW side traveling -lz, NE side traveling +lz)
            for (const bz of [56.0, 82.0, 106.0, 136.0, 160.0]) {
                addRoadDecal(124.05, bz, 1.10, 2.20, bikeStencilMat, -Math.PI / 2, 0.041);
                addRoadDecal(140.45, bz, 1.10, 2.20, bikeStencilMat, Math.PI / 2, 0.041);
            }
        }

        // 8F. Orondo Ave SE Segment (in front of Courthouse 350 & Memorial Park, lz = -60.0m .. +4.5m):
        //     (a81b7dad.jpg bottom-right!)
        {
            // Center turn lane double-yellow borders (lx = 130.85m and 134.05m, lz = -60.0m .. -35.10m)
            addGradedStripe(130.85, 130.98, -60.0, -35.10, paintYellowMat, 0.036, 1, 10);
            addGradedStripe(131.10, 131.23, -60.0, -35.10, paintYellowMat, 0.036, 1, 10);
            addGradedStripe(133.80, 133.93, -60.0, -35.10, paintYellowMat, 0.036, 1, 10);
            addGradedStripe(134.05, 134.18, -60.0, -35.10, paintYellowMat, 0.036, 1, 10);

            // Center lane Left-Turn Arrows on Orondo Ave approaching S. Okanogan St (turning into S. Okanogan St / Washington St)
            addRoadDecal(132.50, -42.10, 2.05, 2.40, leftArrowMat, Math.PI / 2, 0.041);
            addRoadDecal(132.50, -56.50, 2.05, 2.40, leftArrowMat, Math.PI / 2, 0.041);

            // Dashed white lane divider line between inner & outer NW-bound lanes (lx = 137.4m, lz = -58.0m .. -35.10m, a81b7dad.jpg)
            for (let z = -58.0; z <= -38.15; z += 6.8) {
                addGradedStripe(137.34, 137.46, z, z + 2.6, paintWhiteMat, 0.036, 1, 1);
            }

            // Campus-side Bike Lane Line in front of Courthouse 350 & Memorial Park (lz = -60.0m .. +18.5m)
            addGradedStripe(126.55, 126.67, -20.5, 18.5, paintWhiteMat, 0.036, 1, 14);
            for (const bz of [-8.0, 10.0]) {
                addRoadDecal(125.80, bz, 1.10, 2.20, bikeStencilMat, -Math.PI / 2, 0.041);
            }
            // NE-side Bike Lane Line SE of S. Okanogan St (lx = 139.75m, lz = -60.0m .. -51.95m, welding into the East Rounded Corner bike stripe!)
            addGradedStripe(139.69, 139.81, -60.0, -51.95, paintWhiteMat, 0.036, 1, 5);
            for (const bz of [-56.0]) {
                addRoadDecal(140.55, bz, 1.10, 2.20, bikeStencilMat, Math.PI / 2, 0.041);
            }
        }
    }

    // =========================================================================
    // 9. S. OKANOGAN STREET ROADWAY & SEAMLESS ROUNDED-CORNER INTERSECTION WITH ORONDO AVE
    //    Moved another 30 feet (-9.15m in lz_401) closer to S. Chelan Ave!
    //    (a81b7dad.jpg bottom-left, google_sat_campus.png & 499059e4.jpg)
    // =========================================================================
    {
        // S. Okanogan St centerline originates at P0 = (141.40, -25.95) on Orondo Ave's NE edge (moved another 30ft / -9.15m closer to S. Chelan Ave!)
        // along Wenatchee's true North-South grid vector u = (0.59429, 0.80425), normal n = (-0.80425, 0.59429)
        const okX0 = 141.40;
        const okZ0 = -25.95;
        const ux = 0.59429;
        const uz = 0.80425;
        const nx = -uz; // -0.80425 (off > 0 = West/Acute corner side, off < 0 = East/Obtuse corner side)
        const nz = ux;  // +0.59429
        const okHalfW = 8.20; // 16.40m roadway width
        const sJoin = 18.60;  // Station where the C1 rounded-corner throat joins the straight S. Okanogan St corridor
        const okLen = 92.0;   // Extends deep into S. Okanogan St
        const okAngle = Math.atan2(uz, ux);

        const evalOkPt = (s, off) => [
            okX0 + ux * s + nx * off,
            okZ0 + uz * s + nz * off
        ];

        // Exact tangent intersection apexes where S. Okanogan St's offset lines (off) meet Orondo Ave's NE line (lx = 141.40m):
        // Since lx(s, off) = 141.40 + s * ux + off * nx = 141.40 => s_apex(off) = -off * nx / ux = off * (0.80425 / 0.59429) = off * 1.353295
        const getApexZForOff = (off) => {
            const sApex = off * (uz / ux);
            return okZ0 + sApex * uz + off * nz; // = -25.95 + off * 1.68386
        };

        // Orondo Ave tangency start Z for any lateral offset `off`:
        // At off = -8.20 (East curb): zStart = -51.95m (welds to Orondo NE sidewalk stop at -51.95m)
        // At off = +8.20 (West curb): zStart = -3.95m (welds to Orondo NE sidewalk start at -3.95m)
        const getStartZForOff = (off) => {
            const u = (off + okHalfW) / (2 * okHalfW);
            return -51.95 + u * (-3.95 - (-51.95));
        };

        const evalQuadBezier2D = (x0, z0, x1, z1, x2, z2, t) => {
            const omt = 1.0 - t;
            return [
                omt * omt * x0 + 2 * omt * t * x1 + t * t * x2,
                omt * omt * z0 + 2 * omt * t * z1 + t * t * z2
            ];
        };

        // Evaluates any point (t in [0, 1] from Orondo Ave to sJoin, off in [-okHalfW - swW, +okHalfW + swW])
        const evalThroatPoint = (t, off) => {
            // For sidewalks/curbs outside [-okHalfW, +okHalfW], offset perpendicularly from the curb Bézier curve!
            const clampedOff = THREE.MathUtils.clamp(off, -okHalfW, okHalfW);
            const extraOut = off - clampedOff; // < 0 on East sidewalk, > 0 on West sidewalk

            const p0x = okX0;
            const p0z = getStartZForOff(clampedOff);
            const p1x = okX0;
            const p1z = getApexZForOff(clampedOff);
            const [p2x, p2z] = evalOkPt(sJoin, clampedOff);

            const [bx, bz] = evalQuadBezier2D(p0x, p0z, p1x, p1z, p2x, p2z, t);
            if (Math.abs(extraOut) < 1e-5) return [bx, bz];

            // Analytic tangent of the Quadratic Bézier curve to offset the rounded corner sidewalk & curb cleanly
            const tx = 2 * (1 - t) * (p1x - p0x) + 2 * t * (p2x - p1x);
            const tz = 2 * (1 - t) * (p1z - p0z) + 2 * t * (p2z - p1z);
            const tLen = Math.hypot(tx, tz) || 1;
            // At t=0 along Orondo Ave: tangent points from p0 to p1.
            // On West corner (extraOut > 0, p1z < p0z => tz < 0): outward sidewalk normal is (+1, 0) = (-tz/tLen, tx/tLen)
            // On East corner (extraOut < 0, p1z > p0z => tz > 0): outward sidewalk normal is (+1, 0) = (+tz/tLen, -tx/tLen) * sign(extraOut)
            const dirSign = clampedOff >= 0 ? -1 : 1;
            const outNx = dirSign * (tz / tLen);
            const outNz = dirSign * (-tx / tLen);
            return [bx + outNx * Math.abs(extraOut), bz + outNz * Math.abs(extraOut)];
        };

        // 9A. Build Seamless C1-Continuous Bézier Asphalt Throat Mesh (t in [0, 1] from Orondo Ave lx=141.40m to s=sJoin)
        {
            const segsT = 24;
            const segsV = 12;
            const throatGeom = new THREE.BufferGeometry();
            const tPos = [];
            const tNorm = [];
            const tUv = [];
            const tIdx = [];

            for (let it = 0; it <= segsT; it++) {
                const t = -0.02 + (it / segsT) * 1.04;
                for (let iv = 0; iv <= segsV; iv++) {
                    const v = iv / segsV;
                    const off = -(okHalfW + 0.22) + v * (2 * (okHalfW + 0.22));
                    const [px, pz] = evalThroatPoint(t, off);
                    const py = yGrade(px, pz) + 0.0165;
                    tPos.push(px, py, pz);
                    tNorm.push(0, 1, 0);
                    tUv.push(t * 2.0, v);
                }
            }
            const stride = segsV + 1;
            for (let it = 0; it < segsT; it++) {
                for (let iv = 0; iv < segsV; iv++) {
                    const a = it * stride + iv;
                    const b = (it + 1) * stride + iv;
                    const c = (it + 1) * stride + (iv + 1);
                    const d = it * stride + (iv + 1);
                    tIdx.push(a, b, c);
                    tIdx.push(a, c, d);
                }
            }
            throatGeom.setAttribute('position', new THREE.Float32BufferAttribute(tPos, 3));
            throatGeom.setAttribute('normal', new THREE.Float32BufferAttribute(tNorm, 3));
            throatGeom.setAttribute('uv', new THREE.Float32BufferAttribute(tUv, 2));
            throatGeom.setIndex(tIdx);
            throatGeom.computeVertexNormals();

            const throatMesh = new THREE.Mesh(throatGeom, asphaltMat);
            throatMesh.receiveShadow = true;
            roadGrp.add(throatMesh);
        }

        // 9B. Straight S. Okanogan St Asphalt Continuation from s = sJoin (18.60m) to okLen (92.0m)
        {
            const [jx0, jz0] = evalOkPt(sJoin, 0);
            const [jx1, jz1] = evalOkPt(okLen, 0);
            const okStraightAsphalt = new THREE.Mesh(
                buildOrientedRoadRibbonGeometry(jx0, jz0, jx1, jz1, okHalfW, okHalfW, 28, 6, yGrade, 0.016),
                asphaltMat
            );
            okStraightAsphalt.receiveShadow = true;
            roadGrp.add(okStraightAsphalt);
        }

        // 9C. Rounded-Corner Concrete Sidewalks & Raised White Curbs wrapping around BOTH the
        //     West Acute Corner (off = +8.20m .. +10.45m) and East Sweeping Obtuse Corner (off = -10.45m .. -8.20m)
        const buildCurvedCornerStrip = (offInner, offOuter, yOff, mat, segsT = 24) => {
            const geom = new THREE.BufferGeometry();
            const pos = [];
            const norm = [];
            const uv = [];
            const idx = [];
            for (let it = 0; it <= segsT; it++) {
                const t = it / segsT;
                const [x0, z0] = evalThroatPoint(t, offInner);
                const [x1, z1] = evalThroatPoint(t, offOuter);
                pos.push(x0, yGrade(x0, z0) + yOff, z0);
                pos.push(x1, yGrade(x1, z1) + yOff, z1);
                norm.push(0, 1, 0, 0, 1, 0);
                uv.push(t, 0, t, 1);
            }
            for (let it = 0; it < segsT; it++) {
                const a = it * 2;
                const b = a + 1;
                const c = a + 2;
                const d = a + 3;
                idx.push(a, b, d);
                idx.push(a, d, c);
            }
            geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            geom.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
            geom.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
            geom.setIndex(idx);
            geom.computeVertexNormals();
            const m = new THREE.Mesh(geom, mat);
            m.receiveShadow = true;
            roadGrp.add(m);
        };

        // West Acute Rounded Corner Sidewalk & Raised Curb (welds to Orondo NE sidewalk at z=+23.50m and S. Okanogan West sidewalk at s=18.60m)
        buildCurvedCornerStrip(okHalfW, okHalfW + 2.25, 0.085, sidewalkConcreteMat, 24);
        buildCurvedCornerStrip(okHalfW - 0.08, okHalfW + 0.10, 0.11, curbWhiteMat, 24);

        // East Sweeping Rounded Corner Sidewalk & Raised Curb (welds to Orondo NE sidewalk at z=-24.50m and S. Okanogan East sidewalk at s=18.60m)
        buildCurvedCornerStrip(-okHalfW - 2.25, -okHalfW, 0.085, sidewalkConcreteMat, 24);
        buildCurvedCornerStrip(-okHalfW - 0.10, -okHalfW + 0.08, 0.11, curbWhiteMat, 24);

        // Straight Concrete Sidewalks & Raised Curbs flanking both sides of S. Okanogan St from s = sJoin (18.60m) to okLen (92.0m)
        for (const side of [-1, 1]) {
            const [swX0, swZ0] = evalOkPt(sJoin, side * (okHalfW + 1.125));
            const [swX1, swZ1] = evalOkPt(okLen, side * (okHalfW + 1.125));
            const swMesh = new THREE.Mesh(
                buildOrientedRoadRibbonGeometry(swX0, swZ0, swX1, swZ1, 1.125, 1.125, 24, 2, yGrade, 0.085),
                sidewalkConcreteMat
            );
            swMesh.receiveShadow = true;
            roadGrp.add(swMesh);

            const [cbX0, cbZ0] = evalOkPt(sJoin, side * okHalfW);
            const [cbX1, cbZ1] = evalOkPt(okLen, side * okHalfW);
            const cbMesh = new THREE.Mesh(
                buildOrientedRoadRibbonGeometry(cbX0, cbZ0, cbX1, cbZ1, 0.09, 0.09, 24, 1, yGrade, 0.11),
                curbWhiteMat
            );
            cbMesh.receiveShadow = true;
            roadGrp.add(cbMesh);
        }

        // Landscaped Acute V-Corner Boulder & Shrub Bed tucked cleanly behind the West Rounded Corner Sidewalk (shifted another 30ft / -9.15m closer to S. Chelan Ave, a81b7dad.jpg bottom-center!)
        {
            const islandX = 148.2, islandZ = -4.65;
            const islandY = yGrade(islandX, islandZ);
            const mulchMat = new THREE.MeshStandardMaterial({ color: '#4a3b31', roughness: 0.92 });
            const shrubMat = new THREE.MeshStandardMaterial({ color: '#3b622b', roughness: 0.88 });
            const rockMat = new THREE.MeshStandardMaterial({ color: '#7a756c', roughness: 0.85 });

            const mulchBed = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.7, 0.14, 18), mulchMat);
            mulchBed.position.set(islandX, islandY + 0.08, islandZ);
            roadGrp.add(mulchBed);

            for (const [dx, dz, r] of [
                [-0.7, -0.6, 0.48],
                [0.6, -0.4, 0.42],
                [0.1, 0.7, 0.52],
                [-0.8, 0.6, 0.38]
            ]) {
                const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), shrubMat);
                bush.scale.set(1.1, 0.72, 1.1);
                bush.position.set(islandX + dx, islandY + 0.26, islandZ + dz);
                bush.castShadow = true;
                roadGrp.add(bush);
            }
            const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), rockMat);
            boulder.scale.set(1.2, 0.75, 0.95);
            boulder.position.set(islandX - 0.2, islandY + 0.24, islandZ - 1.1);
            roadGrp.add(boulder);
        }

        // 9D. C1-Tangent Curved White Bike-Lane & Channelizing Stripes following the West & East Rounded Corners
        //     from Orondo Ave's bike lane (lx = 139.75m) into S. Okanogan St's bike lanes (off = ±6.85m at s = sJoin)
        const addBezierRibbonStripe = (x0, z0, x1, z1, x2, z2, halfW, mat, yOff = 0.037, segs = 22) => {
            const geom = new THREE.BufferGeometry();
            const pos = [];
            const norm = [];
            const uv = [];
            const idx = [];
            for (let i = 0; i <= segs; i++) {
                const t = i / segs;
                const [cx, cz] = evalQuadBezier2D(x0, z0, x1, z1, x2, z2, t);
                const tx = 2 * (1 - t) * (x1 - x0) + 2 * t * (x2 - x1);
                const tz = 2 * (1 - t) * (z1 - z0) + 2 * t * (z2 - z1);
                const tLen = Math.hypot(tx, tz) || 1;
                const pnx = -tz / tLen;
                const pnz = tx / tLen;
                const lxA = cx - pnx * halfW, lzA = cz - pnz * halfW;
                const lxB = cx + pnx * halfW, lzB = cz + pnz * halfW;
                pos.push(lxA, yGrade(lxA, lzA) + yOff, lzA);
                pos.push(lxB, yGrade(lxB, lzB) + yOff, lzB);
                norm.push(0, 1, 0, 0, 1, 0);
                uv.push(t, 0, t, 1);
            }
            for (let i = 0; i < segs; i++) {
                const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
                idx.push(a, b, d, a, d, c);
            }
            geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            geom.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
            geom.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
            geom.setIndex(idx);
            geom.computeVertexNormals();
            const m = new THREE.Mesh(geom, mat);
            m.receiveShadow = true;
            roadGrp.add(m);
        };

        {
            // East Sweeping Rounded Corner Bike Lane Stripe: Orondo (139.75, -51.95) -> Apex (139.75, -39.71) -> Okanogan (sJoin, -6.85)
            const [eEndX, eEndZ] = evalOkPt(sJoin, -6.85);
            addBezierRibbonStripe(139.75, -51.95, 139.75, -39.71, eEndX, eEndZ, 0.065, paintWhiteMat, 0.037, 22);

            // West Acute Rounded Corner Bike/Channel Stripe: Orondo (139.65, -3.95) -> Apex (139.65, -16.78) -> Okanogan (sJoin, +6.85)
            const [wEndX, wEndZ] = evalOkPt(sJoin, 6.85);
            addBezierRibbonStripe(139.65, -3.95, 139.65, -16.78, wEndX, wEndZ, 0.065, paintWhiteMat, 0.037, 22);
        }

        // 9E. Continental Twin-Bar Crosswalk across S. Okanogan St Throat at the Rounded Corner Junction (t = 0.56, directly in front of the s = 14.2m stop bar, a81b7dad.jpg bottom-center!)
        //     Centered symmetrically across the 16.40m roadway width (inside the ±6.85m bike lane lines: off = -5.25 + k * 2.10 for k = 0..5)
        {
            const tCross = 0.56;
            for (let k = 0; k < 6; k++) {
                const off = -5.25 + k * 2.10;
                const [bx, bz] = evalThroatPoint(tCross, off);
                addTwinBarPair(bx, bz, 2.75, 0.22, -okAngle);
            }
        }

        // 9F. S. Okanogan St Double Solid Yellow Centerline (s = 14.5m .. 90.0m, a81b7dad.jpg bottom-left)
        for (const cOff of [-0.14, 0.14]) {
            const [xA, zA] = evalOkPt(14.5, cOff);
            const [xB, zB] = evalOkPt(90.0, cOff);
            addOrientedStripe(xA, zA, xB, zB, 0.065, paintYellowMat, 0.037, 24);
        }

        // 9G. S. Okanogan St White Turn-Lane Divider, Stop Bar & Approach Turn Arrows toward Orondo Ave (s = 14.5m .. 40.0m)
        {
            const divOff = -3.45;
            const [dx0, dz0] = evalOkPt(14.5, divOff);
            const [dx1, dz1] = evalOkPt(40.0, divOff);
            addOrientedStripe(dx0, dz0, dx1, dz1, 0.065, paintWhiteMat, 0.037, 10);

            // Stop bar at s = 14.2m for traffic approaching Orondo Ave (off = -6.8m .. -0.2m)
            const [sbX0, sbZ0] = evalOkPt(14.2, -6.8);
            const [sbX1, sbZ1] = evalOkPt(14.2, -0.2);
            addOrientedStripe(sbX0, sbZ0, sbX1, sbZ1, 0.22, paintWhiteMat, 0.038, 3);

            const approachAngle = okAngle + Math.PI;
            for (const sArr of [20.5, 32.5]) {
                const [lxArr, lzArr] = evalOkPt(sArr, -1.75);
                addRoadDecal(lxArr, lzArr, 2.00, 2.35, leftArrowMat, approachAngle, 0.041);

                const [rxArr, rzArr] = evalOkPt(sArr, -5.10);
                addRoadDecal(rxArr, rzArr, 2.00, 2.35, rightArrowMat, approachAngle, 0.041);
            }
        }

        // 9H. S. Okanogan St Straight Bike Lane Lines & Stencils on Both Edges (s = sJoin .. 90.0m)
        for (const bOff of [-6.85, 6.85]) {
            const [bx0, bz0] = evalOkPt(sJoin, bOff);
            const [bx1, bz1] = evalOkPt(90.0, bOff);
            addOrientedStripe(bx0, bz0, bx1, bz1, 0.06, paintWhiteMat, 0.037, 24);
        }
        for (const sBike of [26.0, 58.0]) {
            const [b1x, b1z] = evalOkPt(sBike, -7.55);
            addRoadDecal(b1x, b1z, 1.05, 2.10, bikeStencilMat, okAngle + Math.PI, 0.041);
            const [b2x, b2z] = evalOkPt(sBike, 7.55);
            addRoadDecal(b2x, b2z, 1.05, 2.10, bikeStencilMat, okAngle, 0.041);
        }

        // 9I. Second Continental Crosswalk on S. Okanogan St (visible at bottom-left of a81b7dad.jpg at s = 45.0m)
        //     Centered symmetrically across the 16.40m roadway width (inside the ±6.85m bike lane lines: off = -5.25 + k * 2.10 for k = 0..5)
        {
            const sCross2 = 45.0;
            for (let k = 0; k < 6; k++) {
                const [cx2, cz2] = evalOkPt(sCross2, -5.25 + k * 2.10);
                addTwinBarPair(cx2, cz2, 2.75, 0.22, -okAngle);
            }
        }
    }

    // =========================================================================
    // 10. FULL 3D KING STREET CORRIDOR (LEFT SIDE OF CAMPUS —West Wing -52m ->
    //     Washington St -> Building 411/412 -> Oregon St -> 428 Orondo Ave Level +175m)
    //     Plus Oregon Street / Service Road Transverse Connector (King St -> Douglas St -> Orondo Ave)
    // =========================================================================
    {
        // King Street NE (Campus-Side) Curb Profile:
        // - lz in [-52.0, 21.75]: West Wing King St sidewalk curb (lx = -62.94m)
        // - lz in [21.75, 43.84]: Washington St intersection throat (blends smoothly from -62.94m to Building 411/412 curb at -61.62m)
        // - lz in [43.84, 75.04]: Exact 1:1 alignment with Building 411/412 King St sidewalk curb (-61.62m -> -61.43m)
        // - lz in [75.04, 175.0]: NW extension to 428 Orondo Ave level (lx = -61.43m)
        const getKingNECurbX = (lz) => {
            if (lz <= 21.75) return -62.94;
            if (lz <= 43.84) {
                const t = (lz - 21.75) / (43.84 - 21.75);
                return THREE.MathUtils.lerp(-62.94, -61.62, t);
            }
            if (lz <= 75.04) {
                const t = (lz - 43.84) / (75.04 - 43.84);
                return THREE.MathUtils.lerp(-61.62, -61.43, t);
            }
            return -61.43;
        };
        const getKingSWCurbX = (lz) => getKingNECurbX(lz) - 13.80;

        const kzStart = -52.0;
        const kzEnd = 175.0;
        const kzSegs = 96;
        const kxSegs = 6;

        const kingGeom = new THREE.BufferGeometry();
        const kPos = [];
        const kNorm = [];
        const kUv = [];
        const kIdx = [];

        for (let iz = 0; iz <= kzSegs; iz++) {
            const v = iz / kzSegs;
            const lz = kzStart + (kzEnd - kzStart) * v;
            const xMin = getKingSWCurbX(lz);
            const xMax = getKingNECurbX(lz);
            for (let ix = 0; ix <= kxSegs; ix++) {
                const u = ix / kxSegs;
                const lx = xMin + (xMax - xMin) * u;
                const ly = yGrade(lx, lz) + 0.016;
                kPos.push(lx, ly, lz);
                kNorm.push(0, 1, 0);
                kUv.push(u, v * 12);
            }
        }
        const kStride = kxSegs + 1;
        for (let iz = 0; iz < kzSegs; iz++) {
            for (let ix = 0; ix < kxSegs; ix++) {
                const a = iz * kStride + ix;
                const b = a + 1;
                const c = (iz + 1) * kStride + ix;
                const d = c + 1;
                kIdx.push(a, c, b);
                kIdx.push(b, c, d);
            }
        }
        kingGeom.setAttribute('position', new THREE.Float32BufferAttribute(kPos, 3));
        kingGeom.setAttribute('normal', new THREE.Float32BufferAttribute(kNorm, 3));
        kingGeom.setAttribute('uv', new THREE.Float32BufferAttribute(kUv, 2));
        kingGeom.setIndex(kIdx);
        kingGeom.computeVertexNormals();

        const kingRoadMesh = new THREE.Mesh(kingGeom, asphaltMat);
        kingRoadMesh.receiveShadow = true;
        roadGrp.add(kingRoadMesh);

        // 10A. King Street Concrete Sidewalks & Raised White Curbs:
        // - Opposite (SW) Sidewalk & Curb along the entire King Street corridor (lz = -52.0m .. +175.0m)
        {
            const swWalkGeom = new THREE.BufferGeometry();
            const swCurbGeom = new THREE.BufferGeometry();
            const wPos = [], wNorm = [], wUv = [], wIdx = [];
            const cPos = [], cNorm = [], cUv = [], cIdx = [];
            const swSegs = 80;
            for (let iz = 0; iz <= swSegs; iz++) {
                const v = iz / swSegs;
                const lz = kzStart + (kzEnd - kzStart) * v;
                const curbX = getKingSWCurbX(lz);
                const xOuter = curbX - 2.25;
                wPos.push(xOuter, yGrade(xOuter, lz) + 0.085, lz);
                wPos.push(curbX, yGrade(curbX, lz) + 0.085, lz);
                wNorm.push(0, 1, 0, 0, 1, 0);
                wUv.push(0, v * 20, 1, v * 20);

                const isSwRampCut = Math.abs(lz - 23.20) < 1.35 || Math.abs(lz - 40.20) < 1.35;
                const swCurbLift = isSwRampCut ? 0.088 : 0.125;
                cPos.push(curbX - 0.16, yGrade(curbX - 0.16, lz) + swCurbLift, lz);
                cPos.push(curbX + 0.04, yGrade(curbX + 0.04, lz) + swCurbLift, lz);
                cNorm.push(0, 1, 0, 0, 1, 0);
                cUv.push(0, v * 20, 1, v * 20);
            }
            for (let iz = 0; iz < swSegs; iz++) {
                const a = iz * 2, b = a + 1, c = a + 2, d = a + 3;
                wIdx.push(a, c, b, b, c, d);
                cIdx.push(a, c, b, b, c, d);
            }
            swWalkGeom.setAttribute('position', new THREE.Float32BufferAttribute(wPos, 3));
            swWalkGeom.setAttribute('normal', new THREE.Float32BufferAttribute(wNorm, 3));
            swWalkGeom.setAttribute('uv', new THREE.Float32BufferAttribute(wUv, 2));
            swWalkGeom.setIndex(wIdx);
            swWalkGeom.computeVertexNormals();
            const swWalkMesh = new THREE.Mesh(swWalkGeom, sidewalkConcreteMat);
            swWalkMesh.receiveShadow = true;
            roadGrp.add(swWalkMesh);

            swCurbGeom.setAttribute('position', new THREE.Float32BufferAttribute(cPos, 3));
            swCurbGeom.setAttribute('normal', new THREE.Float32BufferAttribute(cNorm, 3));
            swCurbGeom.setAttribute('uv', new THREE.Float32BufferAttribute(cUv, 2));
            swCurbGeom.setIndex(cIdx);
            swCurbGeom.computeVertexNormals();
            const swCurbMesh = new THREE.Mesh(swCurbGeom, curbWhiteMat);
            swCurbMesh.receiveShadow = true;
            roadGrp.add(swCurbMesh);

            // ADA Wheelchair Curb Ramps & Yellow Truncated-Dome Tactile Warning Pads on the SW King St Sidewalk
            // opposite the South Crosswalk (lz = 23.20m) and North Crosswalk (lz = 40.20m)
            for (const rampZ of [23.20, 40.20]) {
                const cX = getKingSWCurbX(rampZ);
                const padX = cX - 0.56;
                const padY = yGrade(padX, rampZ) + 0.092;
                const rGrp = new THREE.Group();
                rGrp.position.set(padX, padY, rampZ);

                const throat = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.018, 2.10), curbWhiteMat);
                throat.position.set(0.06, -0.002, 0);
                throat.rotation.z = -0.04;
                throat.receiveShadow = true;
                rGrp.add(throat);

                const pad = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.024, 1.56), paintYellowMat);
                pad.position.set(0.10, 0.008, 0);
                rGrp.add(pad);

                const rows = 4, cols = 10;
                for (let ix = 0; ix < rows; ix++) {
                    const dx = 0.10 - 0.22 + (ix / (rows - 1)) * 0.44;
                    for (let iz = 0; iz < cols; iz++) {
                        const dz = -0.64 + (iz / (cols - 1)) * 1.28;
                        const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, 0.014, 6), paintYellowMat);
                        dome.position.set(dx, 0.024, dz);
                        rGrp.add(dome);
                    }
                }
                roadGrp.add(rGrp);
            }
        }

        // - Campus-Side (NE) King Street Sidewalk & Curb extensions:
        //   1) SE of West Wing (-52.0m .. -20.735m, flush with West Wing's 3.095m-wide King St sidewalk at lx = -62.88m .. -59.78m)
        //   2) NW of Building 411/412 (+75.00m .. +175.0m, flush with Building 411/412's 2.40m-wide King St sidewalk at lx = -61.43m)
        for (const [neZ0, neZ1, neSteps, neX0, neW] of [
            [-52.0, -20.735, 14, -62.88, 3.10],
            [75.00, 175.0, 44, -61.43, 2.40]
        ]) {
            const neSidewalk = new THREE.Mesh(
                buildGradedStripGeometry(neX0, neX0 + neW, neZ0, neZ1, 2, neSteps, yGrade, 0.085),
                sidewalkConcreteMat
            );
            neSidewalk.receiveShadow = true;
            roadGrp.add(neSidewalk);

            const neCurb = new THREE.Mesh(
                buildGradedStripGeometry(neX0 - 0.04, neX0 + 0.16, neZ0, neZ1, 1, neSteps, yGrade, 0.125),
                curbWhiteMat
            );
            neCurb.receiveShadow = true;
            roadGrp.add(neCurb);
        }

        // 10B. King Street Traffic Markings (Centerline, Parallel Parking Lanes, Crosswalks & Stop Bars):
        // - Dashed Yellow Centerline SE of Washington St (lz = -49.0m .. +16.5m)
        for (let lz = -49.0; lz <= 16.5; lz += 7.4) {
            const cx = getKingNECurbX(lz) - 6.90;
            addGradedStripe(cx - 0.07, cx + 0.07, lz, lz + 2.85, paintYellowMat, 0.036, 1, 2);
        }
        // - Continuous Dashed Yellow Centerline NW of Washington St to the 428 Orondo Ave stop level (lz = +44.5m .. +167.5m)
        for (let lz = 44.5; lz <= 167.5; lz += 7.5) {
            const cx = getKingNECurbX(lz) - 6.90;
            addGradedStripe(cx - 0.07, cx + 0.07, lz, lz + 2.95, paintYellowMat, 0.036, 1, 2);
        }

        // - Parallel Parking Lane Lines + 'T' Ticks along King Street (SE block & NW block)
        //   NE Curb Lane (along West Wing & 411/412):
        addGradedStripe(-65.42, -65.30, -48.0, 18.5, paintWhiteMat, 0.036, 1, 22);
        for (let tz = -48.0; tz <= 18.5; tz += 6.3) {
            addGradedStripe(-65.42, -64.70, tz - 0.06, tz + 0.06, paintWhiteMat, 0.036, 1, 1);
        }
        addGradedStripe(-64.00, -63.88, 44.5, 168.0, paintWhiteMat, 0.036, 1, 42);
        for (let tz = 45.0; tz <= 168.0; tz += 6.15) {
            addGradedStripe(-64.00, -63.28, tz - 0.06, tz + 0.06, paintWhiteMat, 0.036, 1, 1);
        }

        //   SW Curb Lane (opposite side of King St):
        addGradedStripe(-74.38, -74.26, -48.0, 18.5, paintWhiteMat, 0.036, 1, 22);
        for (let tz = -48.0; tz <= 18.5; tz += 6.3) {
            addGradedStripe(-75.00, -74.26, tz - 0.06, tz + 0.06, paintWhiteMat, 0.036, 1, 1);
        }
        addGradedStripe(-72.96, -72.84, 44.5, 168.0, paintWhiteMat, 0.036, 1, 42);
        for (let tz = 45.0; tz <= 168.0; tz += 6.15) {
            addGradedStripe(-73.58, -72.84, tz - 0.06, tz + 0.06, paintWhiteMat, 0.036, 1, 1);
        }

        // - King Street South Leg Crosswalk & Stop Bar at Washington St (lz = 23.20m, aligned with West Wing's King St tactile pad at lz = 23.26m)
        //   Centered symmetrically across the 13.80m King St roadway (-76.74m .. -62.94m, midpoint -69.84m):
        //   5 twin-bar pairs at sx = -73.88 + s * 2.02 (s = 0..4 => -73.88 .. -65.80, midpoint -69.84m!)
        addGradedStripe(-69.84, -65.42, 20.35, 20.75, paintWhiteMat, 0.038, 2, 1);
        for (let s = 0; s < 5; s++) {
            const sx = -73.88 + s * 2.02;
            addTwinBarPair(sx, 23.20, 2.65, 0.22, Math.PI / 2);
        }

        // - King Street North Leg Crosswalk & Stop Bar at Washington St (lz = 40.20m, aligned with Building 411/412's Washington St sidewalk)
        //   Centered symmetrically across the 13.80m King St roadway (-75.60m .. -61.80m, midpoint -68.70m):
        //   5 twin-bar pairs at sx = -72.74 + s * 2.02 (s = 0..4 => -72.74 .. -64.66, midpoint -68.70m!)
        addGradedStripe(-72.84, -68.43, 42.95, 43.35, paintWhiteMat, 0.038, 2, 1);
        for (let s = 0; s < 5; s++) {
            const sx = -72.74 + s * 2.02;
            addTwinBarPair(sx, 40.20, 2.65, 0.22, Math.PI / 2);
        }

        // - King Street End Stop Crosswalk & Stop Bar at the 428 Orondo Ave Level (lz = 172.80m, centered at -68.33m)
        addGradedStripe(-68.33, -63.90, 170.10, 170.50, paintWhiteMat, 0.038, 2, 1);
        for (let s = 0; s < 5; s++) {
            const sx = -72.37 + s * 2.02;
            addTwinBarPair(sx, 172.80, 2.65, 0.22, Math.PI / 2);
        }

        // 10C. S-Curved Campus Service Road Connecting Orondo Ave (lz = 115.6m..123.1m, lx = 123.2m)
        //      Behind the Juvenile Detention Gym (lx = 89.2m) & Down Along the SW Side of the Gym Concrete Lot
        //      Into Douglas Street (lz = 130.5m..138.2m, lx = 38.4m) — Matching 585872f1.jpg!
        {
            const getServiceCenterZ = (lx) => {
                // Smooth C1 cosine S-curve from z = 134.35m (Douglas St throat at lx <= 66.0m, clearing the Gym concrete lot at lz <= 113.95m!)
                // up to z = 119.35m (Orondo Ave throat at lx >= 91.5m, clearing the Gym rear wall at lx <= 89.2m!)
                if (lx <= 66.0) return 134.35;
                if (lx >= 91.5) return 119.35;
                const u = (lx - 66.0) / (91.5 - 66.0);
                const s = 0.5 - 0.5 * Math.cos(Math.PI * u);
                return THREE.MathUtils.lerp(134.35, 119.35, s);
            };
            const getServiceTangent = (lx) => {
                const eps = 0.25;
                const dz = getServiceCenterZ(lx + eps) - getServiceCenterZ(lx - eps);
                const dx = 2 * eps;
                const len = Math.hypot(dx, dz) || 1;
                return [dx / len, dz / len];
            };

            const srvHalfW = 3.80; // 7.60m total roadway width
            const srvX0 = 38.40;
            const srvX1 = 123.25;
            const srvSegsX = 48;
            const srvSegsZ = 6;

            const srvGeom = new THREE.BufferGeometry();
            const sPos = [], sNorm = [], sUv = [], sIdx = [];
            for (let ix = 0; ix <= srvSegsX; ix++) {
                const u = ix / srvSegsX;
                const lx = srvX0 + (srvX1 - srvX0) * u;
                const cz = getServiceCenterZ(lx);
                const [tx, tz] = getServiceTangent(lx);
                const nx = -tz, nz = tx;
                for (let iz = 0; iz <= srvSegsZ; iz++) {
                    const v = iz / srvSegsZ;
                    const off = (v - 0.5) * 2.0 * srvHalfW;
                    const px = lx + nx * off;
                    const pz = cz + nz * off;
                    const py = yGrade(px, pz) + 0.0155;
                    sPos.push(px, py, pz);
                    sNorm.push(0, 1, 0);
                    sUv.push(u * 6, v);
                }
            }
            const sStride = srvSegsZ + 1;
            for (let ix = 0; ix < srvSegsX; ix++) {
                for (let iz = 0; iz < srvSegsZ; iz++) {
                    const a = ix * sStride + iz;
                    const b = a + 1;
                    const c = (ix + 1) * sStride + iz;
                    const d = c + 1;
                    sIdx.push(a, b, c, b, d, c);
                }
            }
            srvGeom.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3));
            srvGeom.setAttribute('normal', new THREE.Float32BufferAttribute(sNorm, 3));
            srvGeom.setAttribute('uv', new THREE.Float32BufferAttribute(sUv, 2));
            srvGeom.setIndex(sIdx);
            srvGeom.computeVertexNormals();
            const srvMesh = new THREE.Mesh(srvGeom, asphaltMat);
            srvMesh.receiveShadow = true;
            roadGrp.add(srvMesh);

            // Raised White Curbs along both edges of the S-curved Service Road (lx = 39.2m .. 122.4m)
            for (const side of [-1, 1]) {
                const cbGeom = new THREE.BufferGeometry();
                const cPos = [], cNorm = [], cUv = [], cIdx = [];
                for (let ix = 0; ix <= srvSegsX; ix++) {
                    const u = ix / srvSegsX;
                    const lx = 39.0 + (122.4 - 39.0) * u;
                    const cz = getServiceCenterZ(lx);
                    const [tx, tz] = getServiceTangent(lx);
                    const nx = -tz, nz = tx;
                    const offA = side * srvHalfW - 0.09;
                    const offB = side * srvHalfW + 0.09;
                    const xA = lx + nx * offA, zA = cz + nz * offA;
                    const xB = lx + nx * offB, zB = cz + nz * offB;
                    cPos.push(xA, yGrade(xA, zA) + 0.095, zA);
                    cPos.push(xB, yGrade(xB, zB) + 0.095, zB);
                    cNorm.push(0, 1, 0, 0, 1, 0);
                    cUv.push(u * 10, 0, u * 10, 1);
                }
                for (let ix = 0; ix < srvSegsX; ix++) {
                    const a = ix * 2, b = a + 1, c = a + 2, d = a + 3;
                    cIdx.push(a, b, d, a, d, c);
                }
                cbGeom.setAttribute('position', new THREE.Float32BufferAttribute(cPos, 3));
                cbGeom.setAttribute('normal', new THREE.Float32BufferAttribute(cNorm, 3));
                cbGeom.setAttribute('uv', new THREE.Float32BufferAttribute(cUv, 2));
                cbGeom.setIndex(cIdx);
                cbGeom.computeVertexNormals();
                const cbMesh = new THREE.Mesh(cbGeom, curbWhiteMat);
                cbMesh.receiveShadow = true;
                roadGrp.add(cbMesh);
            }

            // Dashed Yellow Centerline following the S-Curved Service Road (lx = 43.0m .. 116.5m)
            for (let lx = 43.0; lx <= 116.5; lx += 6.8) {
                const x0 = lx, x1 = lx + 2.55;
                const z0 = getServiceCenterZ(x0);
                const z1 = getServiceCenterZ(x1);
                addOrientedStripe(x0, z0, x1, z1, 0.065, paintYellowMat, 0.036, 4);
            }

            // Crosswalks symmetrically centered across the 7.60m Service Road throats at Douglas St (lx = 40.20m, cz = 134.35m)
            // and Orondo Ave (lx = 121.40m, cz = 119.35m): 3 twin-bar pairs at off = -1.90, 0, +1.90
            for (let s = 0; s < 3; s++) {
                const off = -1.90 + s * 1.90;
                addTwinBarPair(40.20, 134.35 + off, 2.35, 0.20, 0);
                addTwinBarPair(121.40, 119.35 + off, 2.35, 0.20, 0);
            }
        }
    }

    arch.add(roadGrp);
}
