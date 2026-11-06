import * as THREE from 'three';

export function createBuilding316Context(foundry, group, building, shape, terrainY, getTerrainHeightFn) {
        const storyH = 4.2;

        // 1. Procedural Warm Precast Concrete Panel Texture with Crisp Grid Joints (for Levels 2 & 3)
        const precastCanvas = document.createElement('canvas');
        precastCanvas.width = 512;
        precastCanvas.height = 512;
        const pCtx = precastCanvas.getContext('2d');
        pCtx.fillStyle = '#c8bca6';
        pCtx.fillRect(0, 0, 512, 512);
        // Subtle architectural aggregate variation
        for (let y = 0; y < 512; y += 64) {
            for (let x = 0; x < 512; x += 128) {
                const j = ((Math.sin(x * 12.3 + y * 27.1) * 43758.5) % 1) * 6 - 3;
                pCtx.fillStyle = `rgb(${200 + j}, ${188 + j}, ${166 + j})`;
                pCtx.fillRect(x + 2, y + 2, 124, 60);
            }
        }
        pCtx.strokeStyle = 'rgba(92, 84, 70, 0.42)';
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
        precastTex.repeat.set(0.22, 0.22);
        precastTex.colorSpace = THREE.SRGBColorSpace;

        const tanPrecastMat = new THREE.MeshStandardMaterial({
            map: precastTex,
            roughness: 0.82,
            metalness: 0.04
        });
        const darkSpandrelMat = new THREE.MeshStandardMaterial({
            color: '#9e917b',
            roughness: 0.84,
            metalness: 0.04
        });
        const basementConcreteMat = new THREE.MeshStandardMaterial({
            color: '#a79c88',
            roughness: 0.88,
            metalness: 0.03
        });
        const whiteTrimMat = new THREE.MeshStandardMaterial({
            color: '#f0eee9',
            roughness: 0.65,
            metalness: 0.08
        });
        const grayCoreStuccoMat = new THREE.MeshStandardMaterial({
            color: '#8c908d',
            roughness: 0.80,
            metalness: 0.05
        });
        const roofMembraneMat = new THREE.MeshStandardMaterial({
            color: '#6e7378',
            roughness: 0.88,
            metalness: 0.05
        });
        const penthouseWallMat = new THREE.MeshStandardMaterial({
            color: '#b8b3a8',
            roughness: 0.80,
            metalness: 0.05
        });

        // 2. Procedural Copper/Terracotta Horizontal Louver Texture (Level 4 Screen Wall)
        const copperCanvas = document.createElement('canvas');
        copperCanvas.width = 256;
        copperCanvas.height = 256;
        const cCtx = copperCanvas.getContext('2d');
        cCtx.fillStyle = '#733d20';
        cCtx.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 256; y += 8) {
            cCtx.fillStyle = '#c4794e';
            cCtx.fillRect(0, y, 256, 4);
            cCtx.fillStyle = '#a45d36';
            cCtx.fillRect(0, y + 4, 256, 2);
            cCtx.fillStyle = '#582c15';
            cCtx.fillRect(0, y + 6, 256, 2);
        }
        const copperLouverTex = new THREE.CanvasTexture(copperCanvas);
        copperLouverTex.wrapS = THREE.RepeatWrapping;
        copperLouverTex.wrapT = THREE.RepeatWrapping;
        copperLouverTex.colorSpace = THREE.SRGBColorSpace;
        const copperLouverMat = new THREE.MeshStandardMaterial({
            map: copperLouverTex,
            roughness: 0.52,
            metalness: 0.32
        });
        const copperFrameMat = new THREE.MeshStandardMaterial({
            color: '#b56c43',
            roughness: 0.48,
            metalness: 0.36
        });

        // 3. Procedural Silver/Galvanized Horizontal Louver Texture (Penthouse Crown)
        const silverCanvas = document.createElement('canvas');
        silverCanvas.width = 256;
        silverCanvas.height = 256;
        const sCtx = silverCanvas.getContext('2d');
        sCtx.fillStyle = '#686e75';
        sCtx.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 256; y += 8) {
            sCtx.fillStyle = '#d3d8de';
            sCtx.fillRect(0, y, 256, 4);
            sCtx.fillStyle = '#aeb5bd';
            sCtx.fillRect(0, y + 4, 256, 2);
            sCtx.fillStyle = '#5c6268';
            sCtx.fillRect(0, y + 6, 256, 2);
        }
        const silverLouverTex = new THREE.CanvasTexture(silverCanvas);
        silverLouverTex.wrapS = THREE.RepeatWrapping;
        silverLouverTex.wrapT = THREE.RepeatWrapping;
        silverLouverTex.colorSpace = THREE.SRGBColorSpace;
        const silverLouverMat = new THREE.MeshStandardMaterial({
            map: silverLouverTex,
            roughness: 0.42,
            metalness: 0.55
        });

        // 4. Procedural Tan-Brown Running-Bond Brick Veneer Texture (East Entry Pier & Courtyard Wall)
        const brickCanvas = document.createElement('canvas');
        brickCanvas.width = 256;
        brickCanvas.height = 256;
        const bCtx = brickCanvas.getContext('2d');
        bCtx.fillStyle = '#7c6e5f';
        bCtx.fillRect(0, 0, 256, 256);
        const baseBrick = new THREE.Color('#a87c5f');
        for (let r = 0; r < 16; r++) {
            const off = (r % 2) * 16;
            for (let c = -1; c <= 8; c++) {
                const j = ((Math.sin(r * 17.3 + c * 31.7) * 43758.5) % 1) * 0.06 - 0.03;
                const col = baseBrick.clone().offsetHSL(0, j * 0.3, j);
                bCtx.fillStyle = `#${col.getHexString()}`;
                bCtx.fillRect(c * 32 + off + 2, r * 16 + 2, 29, 13);
            }
        }
        const entryBrickTex = new THREE.CanvasTexture(brickCanvas);
        entryBrickTex.wrapS = THREE.RepeatWrapping;
        entryBrickTex.wrapT = THREE.RepeatWrapping;
        entryBrickTex.repeat.set(2, 2);
        entryBrickTex.colorSpace = THREE.SRGBColorSpace;
        const entryBrickMat = new THREE.MeshStandardMaterial({
            map: entryBrickTex,
            roughness: 0.84,
            metalness: 0.04
        });

        // Glass & Metal Materials
        const officeGlassMat = new THREE.MeshStandardMaterial({
            color: '#4e6e6a',
            roughness: 0.18,
            metalness: 0.35
        });
        const sageBlindGlassMat = new THREE.MeshStandardMaterial({
            color: '#9eb8ad',
            roughness: 0.28,
            metalness: 0.18
        });
        const darkBronzeMat = new THREE.MeshStandardMaterial({
            color: '#26282a',
            roughness: 0.42,
            metalness: 0.62
        });
        const yellowDoorMat = new THREE.MeshStandardMaterial({
            color: '#d9c574',
            roughness: 0.65,
            metalness: 0.08
        });
        const galvSteelMat = new THREE.MeshStandardMaterial({
            color: '#b8bfc6',
            roughness: 0.42,
            metalness: 0.62
        });
        const bldgLift316 = 0.6096; // +2 feet vertical building lift
        let arch = new THREE.Group();
        arch.name = 'Building316ArchitecturalDetails';
        arch.rotation.y = Math.atan2(0.59621, -0.80283);
        arch.position.y = bldgLift316;
        group.add(arch);

        const groundArch = new THREE.Group();
        groundArch.name = 'Building316GroundGrassAndConcrete';
        groundArch.rotation.y = Math.atan2(0.59621, -0.80283);
        groundArch.position.y = 0.0;
        group.add(groundArch);

        const addBox = (w, h, d, mat, x, y, z, cast = true) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            m.position.set(x, y, z);
            m.castShadow = cast;
            m.receiveShadow = true;
            m.userData = { isSelectableBuilding: true, building };
            arch.add(m);
            return m;
        };

        // Helper: Sample exact terrain contour height along the Douglas St (+X) side of Building 316 relative to Building 316's Washington St base datum
        const bldgCx316 = building.center[0];
        const bldgCz316 = building.center[1];
        const sinT316 = 0.59621006;
        const cosT316 = -0.80282848;
        const getDouglasLocalGroundY = (lx, lz) => {
            if (typeof getTerrainHeightFn !== 'function' || lz >= 25.40) return 0;
            const blend = THREE.MathUtils.smoothstep(25.40 - lz, 0.0, 4.0);
            const wx = bldgCx316 + lx * cosT316 + lz * sinT316;
            const wz = bldgCz316 - lx * sinT316 + lz * cosT316;
            return Math.max(0, (getTerrainHeightFn(wx, wz) - terrainY) * blend);
        };

        // Helper: Build a smooth 3D terrain-contoured slab/strip along the Douglas St (+X) side of Building 316
        const addContouredDouglasStrip = (xMin, xMax, zMin, zMax, topOffset, minBotY, mat, zSteps = 48, sampleX = 11.375, targetGroup = groundArch) => {
            const positions = [];
            const pushQuad = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) => {
                positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
                positions.push(ax, ay, az, cx, cy, cz, dx, dy, dz);
            };
            for (let i = 0; i < zSteps; i++) {
                const z0 = zMin + (i / zSteps) * (zMax - zMin);
                const z1 = zMin + ((i + 1) / zSteps) * (zMax - zMin);
                const g0 = Math.max(
                    getDouglasLocalGroundY(xMin, z0),
                    getDouglasLocalGroundY(xMax, z0),
                    getDouglasLocalGroundY(sampleX, z0)
                );
                const g1 = Math.max(
                    getDouglasLocalGroundY(xMin, z1),
                    getDouglasLocalGroundY(xMax, z1),
                    getDouglasLocalGroundY(sampleX, z1)
                );
                const yTop0 = g0 + topOffset;
                const yTop1 = g1 + topOffset;
                const yBot0 = Math.min(minBotY, yTop0 - 0.34);
                const yBot1 = Math.min(minBotY, yTop1 - 0.34);

                // Top contoured surface (+Y)
                pushQuad(xMin, yTop0, z0, xMin, yTop1, z1, xMax, yTop1, z1, xMax, yTop0, z0);
                // Outer Douglas St face (+X)
                pushQuad(xMax, yTop0, z0, xMax, yTop1, z1, xMax, yBot1, z1, xMax, yBot0, z0);
                // Inner Building 316 face (-X)
                pushQuad(xMin, yTop1, z1, xMin, yTop0, z0, xMin, yBot0, z0, xMin, yBot1, z1);
                if (i === 0) {
                    pushQuad(xMin, yTop0, z0, xMax, yTop0, z0, xMax, yBot0, z0, xMin, yBot0, z0);
                }
                if (i === zSteps - 1) {
                    pushQuad(xMax, yTop1, z1, xMin, yTop1, z1, xMin, yBot1, z1, xMax, yBot1, z1);
                }
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geo.computeVertexNormals();
            const mesh = new THREE.Mesh(geo, mat);
            mesh.receiveShadow = true;
            mesh.userData = { isSelectableBuilding: true, building };
            targetGroup.add(mesh);
            return mesh;
        };

        // Helper: Multi-Bay White-Mullioned Horizontal Ribbon Window (matches Photos 1, 4, 5)
        const addRibbonWindow = (wallAxis, centerCoord, yBot, totalW, totalH, numBays, hasLowerHopper = true) => {
            const winGrp = new THREE.Group();
            const isZWall = Math.abs(wallAxis.nz) > 0.5;
            if (isZWall) {
                winGrp.position.set(centerCoord, yBot + totalH * 0.5, wallAxis.pos + wallAxis.nz * 0.05);
                if (wallAxis.nz < 0) winGrp.rotation.y = Math.PI;
            } else {
                winGrp.position.set(wallAxis.pos + wallAxis.nx * 0.05, yBot + totalH * 0.5, centerCoord);
                winGrp.rotation.y = wallAxis.nx > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
            }

            // Outer white aluminum perimeter frame
            const frameD = 0.12;
            const frameT = 0.07;
            const topBar = new THREE.Mesh(new THREE.BoxGeometry(totalW + 0.08, frameT, frameD), whiteTrimMat);
            topBar.position.set(0, totalH * 0.5 - frameT * 0.5, 0);
            winGrp.add(topBar);
            const botBar = new THREE.Mesh(new THREE.BoxGeometry(totalW + 0.12, frameT + 0.02, frameD + 0.04), whiteTrimMat);
            botBar.position.set(0, -totalH * 0.5 + frameT * 0.5, 0.02);
            winGrp.add(botBar);

            // Glass panes (alternating subtle blind/glass variation like Photo 1)
            const bayW = totalW / numBays;
            for (let b = 0; b < numBays; b++) {
                const bx = -totalW * 0.5 + (b + 0.5) * bayW;
                const useBlind = (b === 0 || b === 2 || b === numBays - 1);
                const pane = new THREE.Mesh(
                    new THREE.BoxGeometry(bayW - 0.04, totalH - frameT * 2, 0.04),
                    useBlind ? sageBlindGlassMat : officeGlassMat
                );
                pane.position.set(bx, 0, -0.01);
                winGrp.add(pane);
            }

            // Vertical white mullions
            for (let b = 0; b <= numBays; b++) {
                const mx = -totalW * 0.5 + b * bayW;
                const mul = new THREE.Mesh(new THREE.BoxGeometry(0.055, totalH, frameD), whiteTrimMat);
                mul.position.set(mx, 0, 0.01);
                winGrp.add(mul);
            }

            // Horizontal intermediate transom/hopper bar
            if (hasLowerHopper) {
                const hBar = new THREE.Mesh(new THREE.BoxGeometry(totalW, 0.05, frameD), whiteTrimMat);
                hBar.position.set(0, -totalH * 0.22, 0.015);
                winGrp.add(hBar);
            }

            arch.add(winGrp);
        };

        const frontZ = 25.40;
        const douglasX = 7.91;
        const courtX = -11.10;
        const rearZ = -6.05;
        return {
            foundry, group, building, shape, terrainY, getTerrainHeightFn,
            storyH, bldgLift316, arch, groundArch, addBox,
            bldgCx316, bldgCz316, sinT316, cosT316, getDouglasLocalGroundY, addContouredDouglasStrip, addRibbonWindow,
            frontZ, douglasX, courtX, rearZ,
            tanPrecastMat, darkSpandrelMat, basementConcreteMat, whiteTrimMat, grayCoreStuccoMat,
            roofMembraneMat, penthouseWallMat, copperLouverMat, copperFrameMat, silverLouverMat,
            entryBrickMat, officeGlassMat, sageBlindGlassMat, darkBronzeMat, yellowDoorMat, galvSteelMat
        };
}