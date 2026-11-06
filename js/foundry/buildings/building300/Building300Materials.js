import * as THREE from 'three';

export function createBuilding300Context(foundry, group, building, shape) {
        // 1. Procedural Variegated Buff/Gold/Brown/Charcoal Running-Bond Brick Texture (Orondo St Detention Wings & Rec Yards)
        const brickCanvas = document.createElement('canvas');
        brickCanvas.width = 512;
        brickCanvas.height = 512;
        const bCtx = brickCanvas.getContext('2d');
        bCtx.fillStyle = '#8b8072'; // Mortar bed
        bCtx.fillRect(0, 0, 512, 512);
        const palette = [
            '#c99f62', // Warm gold/ochre brick
            '#be9258', // Tan-buff brick
            '#a37548', // Medium brown brick
            '#865c3b', // Dark russet brown brick
            '#6c5344', // Charcoal-brown accent brick
            '#bfa382', // Pale grey-buff base brick
            '#d2ab6e'  // Honey gold brick
        ];
        for (let r = 0; r < 32; r++) {
            const off = (r % 2) * 16;
            for (let c = -1; c <= 16; c++) {
                const seed = Math.abs(Math.sin(r * 19.7 + c * 37.3) * 43758.5453);
                const idx = Math.floor((seed % 1) * palette.length);
                bCtx.fillStyle = palette[idx];
                bCtx.fillRect(c * 32 + off + 2, r * 16 + 2, 29, 13);
            }
        }
        const varBrickTex = new THREE.CanvasTexture(brickCanvas);
        varBrickTex.wrapS = THREE.RepeatWrapping;
        varBrickTex.wrapT = THREE.RepeatWrapping;
        varBrickTex.repeat.set(2.5, 2.0);
        varBrickTex.colorSpace = THREE.SRGBColorSpace;
        const varBrickMat = new THREE.MeshStandardMaterial({
            map: varBrickTex,
            roughness: 0.84,
            metalness: 0.04
        });

        // 2. Procedural Warm Beige/Tan Scored Precast Concrete Panel Texture (Gymnasium, Sallyport, Connector & Frieze)
        const precastCanvas = document.createElement('canvas');
        precastCanvas.width = 512;
        precastCanvas.height = 512;
        const pCtx = precastCanvas.getContext('2d');
        pCtx.fillStyle = '#cbbba0';
        pCtx.fillRect(0, 0, 512, 512);
        for (let y = 0; y < 512; y += 64) {
            for (let x = 0; x < 512; x += 128) {
                const j = ((Math.sin(x * 13.7 + y * 29.3) * 43758.5) % 1) * 6 - 3;
                pCtx.fillStyle = `rgb(${203 + j}, ${187 + j}, ${160 + j})`;
                pCtx.fillRect(x + 2, y + 2, 124, 60);
            }
        }
        pCtx.strokeStyle = 'rgba(96, 84, 68, 0.42)';
        pCtx.lineWidth = 3;
        for (let x = 0; x <= 512; x += 128) {
            pCtx.beginPath();
            pCtx.moveTo(x, 0);
            pCtx.lineTo(x, 512);
            pCtx.stroke();
        }
        for (let y = 0; y <= 512; y += 64) {
            pCtx.beginPath();
            pCtx.moveTo(0, y);
            pCtx.lineTo(512, y);
            pCtx.stroke();
        }
        const precastTex = new THREE.CanvasTexture(precastCanvas);
        precastTex.wrapS = THREE.RepeatWrapping;
        precastTex.wrapT = THREE.RepeatWrapping;
        precastTex.repeat.set(0.24, 0.24);
        precastTex.colorSpace = THREE.SRGBColorSpace;
        const tanPrecastMat = new THREE.MeshStandardMaterial({
            map: precastTex,
            roughness: 0.80,
            metalness: 0.04
        });

        // 3. Supporting Architectural Materials
        const plinthBeigeMat = new THREE.MeshStandardMaterial({
            color: '#d4c6ac',
            roughness: 0.85,
            metalness: 0.03
        });
        const recCreamMat = new THREE.MeshStandardMaterial({
            color: '#dedcd2',
            roughness: 0.78,
            metalness: 0.04
        });
        const silverFlashingMat = new THREE.MeshStandardMaterial({
            color: '#d6dde4',
            roughness: 0.30,
            metalness: 0.72
        });
        const darkFasciaMat = new THREE.MeshStandardMaterial({
            color: '#4e555c',
            roughness: 0.52,
            metalness: 0.45
        });
        const roofMembraneMat = new THREE.MeshStandardMaterial({
            color: '#dcdad3',
            roughness: 0.86,
            metalness: 0.05
        });
        const gymRoofMat = new THREE.MeshStandardMaterial({
            color: '#6b727a',
            roughness: 0.65,
            metalness: 0.30
        });
        const securityMeshMat = new THREE.MeshStandardMaterial({
            color: '#1f2326',
            roughness: 0.65,
            metalness: 0.45
        });
        const slotGlassMat = new THREE.MeshStandardMaterial({
            color: '#496b73',
            roughness: 0.20,
            metalness: 0.38
        });
        const whiteDoorMat = new THREE.MeshStandardMaterial({
            color: '#e6e7e2',
            roughness: 0.58,
            metalness: 0.12
        });
        const blackIronMat = new THREE.MeshStandardMaterial({
            color: '#222528',
            roughness: 0.42,
            metalness: 0.65
        });
        const bollardYellowMat = new THREE.MeshStandardMaterial({
            color: '#e5b524',
            roughness: 0.50,
            metalness: 0.18
        });
        const plazaConcreteMat = new THREE.MeshStandardMaterial({ color: '#d8d4cb', roughness: 0.85, metalness: 0.03 });
        const plazaJointMat = new THREE.MeshStandardMaterial({ color: '#8c867a', roughness: 0.92, metalness: 0.02 });
        const pipeRailMat = new THREE.MeshStandardMaterial({ color: '#565b60', roughness: 0.42, metalness: 0.68 });
        const hedgeGreenMat = new THREE.MeshStandardMaterial({ color: '#3b6228', roughness: 0.90, metalness: 0.02 });
        const hedgeRedMat = new THREE.MeshStandardMaterial({ color: '#6e352c', roughness: 0.90, metalness: 0.02 });
        const turfLawnMat = new THREE.MeshStandardMaterial({ color: '#4e7932', roughness: 0.92, metalness: 0.02 });

        const arch = new THREE.Group();
        arch.name = 'Building300ArchitecturalDetails';
        arch.rotation.y = Math.atan2(0.59621, -0.80283);
        group.add(arch);

        const addBox = (w, h, d, mat, x, y, z, cast = true) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            m.position.set(x, y, z);
            m.castShadow = cast;
            m.receiveShadow = true;
            m.userData = { isSelectableBuilding: true, building };
            arch.add(m);
            return m;
        };

        // Quintic C2-smooth step on [0, 1] (zero 1st and 2nd derivatives at endpoints)
        const smooth01 = (t) => {
            const c = Math.max(0, Math.min(1, t));
            return c * c * c * (c * (c * 6 - 15) + 10);
        };

        // Continuous, C2-smooth 3D grading function for Building 300's landscaped lawn & berms
        // Matched directly to Washington St & Orondo Ave street-level photos (3474ae91.jpg, 9bf67bc6.jpg, 3e0daacd.jpg, e5a79256.jpg):
        //   - Foreground lawn (lz >= 29.89m to Washington St sidewalk at lz = 37.12m): level at y = 0.30m (exposing the full 0.30m..0.72m beige plinth on the front brick pavilion & pier)
        //   - In the rear pocket between the brown brick return wall (lx = -2.89m) and the tan precast left wall (lx = 2.71m), the grass terrace sits at y = 0.72m (flush with the top of the plinth)
        //   - From the crest line zCrest(lx) (lz = 25.40m along the tan precast wall lx = 2.71m, curving smoothly to lz = 22.28m along the North brick wall) forward to lz = 29.89m (the front brick pier line),
        //     the embankment slopes smoothly DOWNWARD in +Z to y = 0.30m with zero vertical steps, zero box edges, and C2-smooth continuity!
        const getLawnGradeY = (lx, lz) => {
            const baseY = 0.30;

            // 1. North / East Embankment (lz = 13.00m .. 29.89m, lx = -26.50m .. +2.85m)
            let hNorthBerm = 0.0;
            if (lz < 29.89 && lx <= 3.00) {
                let wDist = 0.0;
                if (lx >= -16.20) {
                    const zCrest = lx >= -2.89
                        ? 22.28 + 3.12 * smooth01((lx - (-2.89)) / (2.71 - (-2.89)))
                        : 22.28;
                    if (lz <= zCrest) {
                        wDist = 1.0;
                    } else {
                        const rampSpan = Math.max(0.5, 29.89 - zCrest);
                        wDist = 1.0 - smooth01((lz - zCrest) / rampSpan);
                    }
                } else if (lz >= 14.60) {
                    const dx = (-16.20 - lx) / 7.98;
                    const dz = (lz - 14.60) / 7.68;
                    const rEll = Math.hypot(dx, dz);
                    const dEll = Math.max(0, (rEll - 1.0) * 7.68);
                    wDist = 1.0 - smooth01(dEll / 7.61);
                } else {
                    const dWest = Math.max(0, -24.18 - lx);
                    wDist = 1.0 - smooth01(dWest / 4.20);
                }

                const rightBoost = 0.24 * smooth01((lx - (-5.40)) / (-2.89 - (-5.40)));
                const westFade = smooth01((lx - (-25.60)) / (-19.50 - (-25.60)));
                const southFade = smooth01((lz - 13.00) / (16.50 - 13.00));

                hNorthBerm = (0.18 + rightBoost) * wDist * westFade * southFade;
            }

            // 2. Subtle Orondo Ave (-X) & South Rec Yard Plinth Grade (lz <= 16.50m, lx <= -2.89m)
            let hOrondo = 0.0;
            if (lz < 16.50 && lx < -2.89) {
                const northBlend = 1.0 - smooth01((lz - 13.00) / (16.50 - 13.00));
                const dWest = Math.max(0, -24.28 - lx);
                const dSouth = Math.max(0, -25.60 - lz);
                const dOrondo = Math.hypot(dWest, dSouth);
                const wOrondo = 1.0 - smooth01(dOrondo / 3.40);
                hOrondo = 0.10 * wOrondo * northBlend;
            }

            return baseY + hNorthBerm + hOrondo;
        };

        return {
            foundry, group, building, shape, arch, addBox, smooth01, getLawnGradeY,
            varBrickMat, tanPrecastMat, plinthBeigeMat, recCreamMat, silverFlashingMat,
            darkFasciaMat, roofMembraneMat, gymRoofMat, securityMeshMat, slotGlassMat,
            whiteDoorMat, blackIronMat, bollardYellowMat, plazaConcreteMat, plazaJointMat,
            pipeRailMat, hedgeGreenMat, hedgeRedMat, turfLawnMat
        };
}