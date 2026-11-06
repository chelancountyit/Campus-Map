import * as THREE from 'three';

export function createBuilding400Context(foundry, group, building, trimMat, terrainY, getTerrainHeightFn) {
        const storyH = 4.2;

        // Materials matched to /photos of 400 Douglas St
        const whiteRoofMat = new THREE.MeshStandardMaterial({
            color: '#f1f3f5',
            roughness: 0.78,
            metalness: 0.04
        });

        // High-res 512x512 running-bond pale cream brick color & mortar bump textures (353a55d7.jpg, 3b9c07db.jpg)
        const solidBrickCanvas = document.createElement('canvas');
        solidBrickCanvas.width = 512;
        solidBrickCanvas.height = 512;
        const sbCtx = solidBrickCanvas.getContext('2d');
        sbCtx.fillStyle = '#8b8374'; // Recessed historic gray-taupe mortar joint color
        sbCtx.fillRect(0, 0, 512, 512);

        const brickBumpCanvas = document.createElement('canvas');
        brickBumpCanvas.width = 512;
        brickBumpCanvas.height = 512;
        const bbCtx = brickBumpCanvas.getContext('2d');
        bbCtx.fillStyle = '#181818'; // Deep mortar groove in bump map
        bbCtx.fillRect(0, 0, 512, 512);

        const baseBrickCol = new THREE.Color(building.color || '#dfd5bc');
        for (let r = 0; r < 32; r++) {
            const off = (r % 2) * 16;
            for (let c = -1; c <= 16; c++) {
                const jitter = ((Math.sin(r * 19.7 + c * 37.3) * 43758.5) % 1) * 0.045 - 0.022;
                const bc = baseBrickCol.clone().offsetHSL(0, jitter * 0.25, jitter);
                const bx = c * 32 + off + 2;
                const by = r * 16 + 2;
                sbCtx.fillStyle = `#${bc.getHexString()}`;
                sbCtx.fillRect(bx, by, 29, 13);
                // Subtle top highlight & bottom shadow on each brick course
                sbCtx.fillStyle = 'rgba(255,255,255,0.14)';
                sbCtx.fillRect(bx, by, 29, 1.5);
                sbCtx.fillStyle = 'rgba(40,34,26,0.14)';
                sbCtx.fillRect(bx, by + 11.5, 29, 1.5);

                const bGray = Math.round(215 + jitter * 500);
                bbCtx.fillStyle = `rgb(${bGray},${bGray},${bGray})`;
                bbCtx.fillRect(bx, by, 29, 13);
            }
        }
        const solidBrickTex = new THREE.CanvasTexture(solidBrickCanvas);
        solidBrickTex.wrapS = THREE.RepeatWrapping;
        solidBrickTex.wrapT = THREE.RepeatWrapping;
        solidBrickTex.repeat.set(2.5, 2.5);
        solidBrickTex.colorSpace = THREE.SRGBColorSpace;

        const solidBrickBumpTex = new THREE.CanvasTexture(brickBumpCanvas);
        solidBrickBumpTex.wrapS = THREE.RepeatWrapping;
        solidBrickBumpTex.wrapT = THREE.RepeatWrapping;
        solidBrickBumpTex.repeat.set(2.5, 2.5);

        const creamBrickSolidMat = new THREE.MeshStandardMaterial({
            map: solidBrickTex,
            bumpMap: solidBrickBumpTex,
            bumpScale: 0.14,
            roughness: 0.82,
            metalness: 0.04
        });
        const plinthConcreteMat = new THREE.MeshStandardMaterial({
            color: '#d5d0c5',
            roughness: 0.88,
            metalness: 0.03,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
        const slateGableMat = new THREE.MeshStandardMaterial({
            color: '#535961',
            bumpMap: foundry.baseTextures.brickBump,
            bumpScale: 0.06,
            roughness: 0.82,
            metalness: 0.08
        });
        const plazaConcreteMat = new THREE.MeshStandardMaterial({
            color: '#e2dcd0',
            roughness: 0.86,
            metalness: 0.03,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
        const whiteCurbMat = new THREE.MeshStandardMaterial({
            color: '#f2eee6',
            roughness: 0.75,
            metalness: 0.04
        });
        const turfMat = new THREE.MeshLambertMaterial({
            color: '#4b8638'
        });
        const darkMetalMat = new THREE.MeshStandardMaterial({
            color: '#1e2226',
            roughness: 0.45,
            metalness: 0.65
        });
        const galvSteelMat = new THREE.MeshStandardMaterial({
            color: '#aeb6be',
            roughness: 0.38,
            metalness: 0.75
        });
        const blueTreadMat = new THREE.MeshStandardMaterial({
            color: '#6e8294',
            roughness: 0.7,
            metalness: 0.25
        });
        const bronzePlaqueMat = new THREE.MeshStandardMaterial({
            color: '#3d2f24',
            roughness: 0.42,
            metalness: 0.68
        });
        const globeMat = new THREE.MeshBasicMaterial({
            color: '#fffdf5'
        });
        const glassMat = new THREE.MeshStandardMaterial({
            color: '#1b2e40',
            roughness: 0.2,
            metalness: 0.35
        });

        // Build custom photo-accurate stepped footprint for Building 400 (in group's 2D shape coordinates):
        // - Front Wall (+Z facing Douglas St): central portico wall (lx = -0.35m..+9.35m) projects to lz = +14.62m (wallZ),
        //   while both the Left Front Wing (lx = -3.24m..-0.35m) and Right Front Wing (lx = +9.35m..+12.61m) are indented
        //   back to lz = +14.14m (frontWingZ = wallZ - 0.48m), matching the stepped pavilion profile of the side walls (de2d6e09.jpg & aec26a69.jpg)!
        // - Washington St (+X) & SW (-X) Side Walls: Front & Rear Corner Pavilions step out to lx = +12.61m / -3.24m,
        //   while the Central Arched-Window Bays are indented at lx = +12.25m / -2.86m.
        const cosArch = 0.584197;
        const sinArch = 0.811612;
        const wallZ = 14.62;
        const frontIndentZ = 0.48;
        const frontWingZ = wallZ - frontIndentZ; // 14.14m

        const arch = new THREE.Group();
        arch.name = 'Building400_PhotoDetails';
        arch.rotation.y = Math.atan2(0.8116, 0.5842); // 0.94692 rad
        group.add(arch);

        const addBox = (w, h, d, mat, x, y, z, parent = arch, cast = true) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            m.position.set(x, y, z);
            m.castShadow = cast;
            m.receiveShadow = true;
            parent.add(m);
            return m;
        };

        const lowerPlazaY = -0.51;
        const lowerNumSteps = 3;
        const lowerStepRise = 0.17; // 0.17m per step (0.0m, -0.17m, -0.34m down to -0.51m)
        const lowerStepRun = 0.42;

        // Helper to sample the topography-following concrete top surface height at local (lx, lz)
        const cosT = 0.5842;
        const sinT = 0.8116;
        const getConcreteTopY = (lx, lz) => {
            if (!getTerrainHeightFn) return lowerPlazaY;
            const wx = building.center[0] + lx * cosT + lz * sinT;
            const wz = building.center[1] - lx * sinT + lz * cosT;
            return (getTerrainHeightFn(wx, wz) - terrainY) + 0.06;
        };

        // Procedural Weathered Tan/Buff Concrete-Stucco Material for SW Central Wall & Rear Gable/Box (0885db8a.jpg, 6aac1e2a.jpg, ef31cc76.jpg, 3fb3243e.jpg)
        const stuccoCanvas = document.createElement('canvas');
        stuccoCanvas.width = 256;
        stuccoCanvas.height = 256;
        const stCtx = stuccoCanvas.getContext('2d');
        stCtx.fillStyle = '#d7ceb8';
        stCtx.fillRect(0, 0, 256, 256);
        for (let x = 0; x < 256; x += 2) {
            const streak = Math.sin(x * 0.23) * 6 + Math.cos(x * 0.71) * 4;
            stCtx.fillStyle = streak > 0 ? `rgba(245,240,228,${streak * 0.012})` : `rgba(95,88,74,${-streak * 0.016})`;
            stCtx.fillRect(x, 0, 2, 256);
        }
        const weatheredStuccoTex = new THREE.CanvasTexture(stuccoCanvas);
        weatheredStuccoTex.wrapS = THREE.RepeatWrapping;
        weatheredStuccoTex.wrapT = THREE.RepeatWrapping;
        weatheredStuccoTex.repeat.set(3, 2);
        weatheredStuccoTex.colorSpace = THREE.SRGBColorSpace;
        const weatheredStuccoMat = new THREE.MeshStandardMaterial({
            map: weatheredStuccoTex,
            roughness: 0.88,
            metalness: 0.02
        });
        const rearBoxStuccoMat = new THREE.MeshStandardMaterial({
            map: weatheredStuccoTex,
            color: '#ebe6d8',
            roughness: 0.86,
            metalness: 0.02
        });
        const soilMat = new THREE.MeshLambertMaterial({ color: '#3b332a' });
        const washX = 12.25;
        const portX = 4.50;
        const portDepth = 2.95;
        const portW = 9.80;
        const deckY = 0.76;

        return {
            foundry, group, building, trimMat, terrainY, getTerrainHeightFn,
            arch, addBox, storyH, cosArch, sinArch, wallZ, frontIndentZ, frontWingZ,
            lowerPlazaY, lowerNumSteps, lowerStepRise, lowerStepRun, cosT, sinT, getConcreteTopY,
            washX, portX, portDepth, portW, deckY,
            whiteRoofMat, creamBrickSolidMat, plinthConcreteMat, slateGableMat,
            plazaConcreteMat, whiteCurbMat, turfMat, darkMetalMat, galvSteelMat,
            blueTreadMat, bronzePlaqueMat, globeMat, glassMat, weatheredStuccoMat, rearBoxStuccoMat, soilMat
        };
}