import * as THREE from 'three';

export function buildCampusFoundationPads(groundFoundry, parent) {
        const lotLevelY = groundFoundry.getRawTerrainHeight(-22.0, 10.0);
        const fndGroup = new THREE.Group();
        fndGroup.name = 'Building400ConcreteFoundation';
        fndGroup.position.set(-36.91, lotLevelY, 5.92);
        fndGroup.rotation.y = Math.atan2(0.8116, 0.5842); // Exact local (lx, lz) alignment of Building 400

        // Procedural brushed & cured concrete texture with expansion control joints
        const can = document.createElement('canvas');
        can.width = 1024;
        can.height = 1024;
        const ctx = can.getContext('2d');
        ctx.fillStyle = '#cfc9be';
        ctx.fillRect(0, 0, 1024, 1024);

        // Subtle trowel / broom-finish concrete grain
        for (let i = 0; i < 6000; i++) {
            ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(60,55,48,0.05)';
            ctx.fillRect((i * 73) % 1024, (i * 137) % 1024, 8, 3);
        }

        // Control joint grid lines across the poured concrete slab
        ctx.strokeStyle = 'rgba(75, 70, 62, 0.38)';
        ctx.lineWidth = 3;
        for (let g = 64; g < 1024; g += 64) {
            ctx.beginPath();
            ctx.moveTo(g, 0);
            ctx.lineTo(g, 1024);
            ctx.moveTo(0, g);
            ctx.lineTo(1024, g);
            ctx.stroke();
        }

        const concreteTex = new THREE.CanvasTexture(can);
        concreteTex.wrapS = THREE.RepeatWrapping;
        concreteTex.wrapT = THREE.RepeatWrapping;
        concreteTex.repeat.set(3, 3);
        concreteTex.colorSpace = THREE.SRGBColorSpace;

        const subMatSlabMat = new THREE.MeshStandardMaterial({
            map: concreteTex,
            bumpMap: concreteTex,
            bumpScale: 0.015,
            color: '#d8d2c7',
            roughness: 0.86,
            metalness: 0.03,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });

        const structuralFootingMat = new THREE.MeshStandardMaterial({
            map: concreteTex,
            bumpMap: concreteTex,
            bumpScale: 0.02,
            color: '#c2bcb0',
            roughness: 0.82,
            metalness: 0.05,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        });

        const stemWallMat = new THREE.MeshStandardMaterial({
            color: '#ded8ce',
            roughness: 0.78,
            metalness: 0.04,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        });

        // 1. Broad Poured Concrete Sub-Base Apron across the 400 lot (trimmed on +Z to lz = 21.65m so no slab protrudes past the front lawns,
        //    and set at y = -0.10m so the Building 400 forecourt and Washington St sidewalk slabs sit cleanly on top)
        const apronW = 24.4;
        const apronD = 41.85; // lz: -20.20m .. +21.65m (flush with wallZ + 7.05m = 21.67m)
        const apronH = 0.28;
        const apronMesh = new THREE.Mesh(
            new THREE.BoxGeometry(apronW, apronH, apronD),
            subMatSlabMat
        );
        apronMesh.position.set(5.2, -0.10, 0.725);
        apronMesh.receiveShadow = true;
        apronMesh.castShadow = true;
        fndGroup.add(apronMesh);

        // 2. Stepped 16-Point Poured Structural Foundation Slab matching Building 400's exact footprint
        //    (including the 0.48m front wall indentations on each end and the side pavilion step-outs!)
        const wallZ = 14.62;
        const frontWingZ = 14.14;
        const bldg400LocalPts = [
            [-3.24, frontWingZ],
            [-0.35, frontWingZ],
            [-0.35, wallZ],
            [9.35, wallZ],
            [9.35, frontWingZ],
            [12.61, frontWingZ],
            [12.61, 7.30],
            [12.25, 7.30],
            [12.25, -11.20],
            [12.61, -11.20],
            [12.61, -16.64],
            [-5.35, -16.64],
            [-5.35, -11.20],
            [-2.86, -11.20],
            [-2.86, 7.30],
            [-3.24, 7.30]
        ];

        const fndShape = new THREE.Shape();
        bldg400LocalPts.forEach(([lx, lz], idx) => {
            // Note: rotateX(-Math.PI / 2) maps Shape (x, y) -> 3D (x, 0, -y), so pass (lx, -lz)
            if (idx === 0) fndShape.moveTo(lx, -lz);
            else fndShape.lineTo(lx, -lz);
        });
        fndShape.closePath();

        const slabGeo = new THREE.ExtrudeGeometry(fndShape, {
            depth: 0.24,
            bevelEnabled: true,
            bevelThickness: 0.03,
            bevelSize: 0.04,
            bevelSegments: 2
        });
        slabGeo.rotateX(-Math.PI / 2);
        const slabMesh = new THREE.Mesh(slabGeo, structuralFootingMat);
        slabMesh.position.set(0, 0.14, 0);
        slabMesh.receiveShadow = true;
        slabMesh.castShadow = true;
        fndGroup.add(slabMesh);

        // 3. Raised Perimeter Concrete Stem-Wall Footing Curb along the 16-point stepped building perimeter
        for (let i = 0; i < bldg400LocalPts.length; i++) {
            const [x0, z0] = bldg400LocalPts[i];
            const [x1, z1] = bldg400LocalPts[(i + 1) % bldg400LocalPts.length];
            const segLen = Math.hypot(x1 - x0, z1 - z0);
            const cx = (x0 + x1) * 0.5;
            const cz = (z0 + z1) * 0.5;
            const ang = Math.atan2(x1 - x0, z1 - z0);
            const curb = new THREE.Mesh(
                new THREE.BoxGeometry(0.42, 0.14, segLen + 0.42),
                stemWallMat
            );
            curb.position.set(cx, 0.43, cz);
            curb.rotation.y = ang;
            curb.castShadow = true;
            curb.receiveShadow = true;
            fndGroup.add(curb);
        }

        // 4. Front Portico Foundation Pad (lx: -0.35m..+9.35m, lz: +14.62m..+18.87m)
        const portFnd = new THREE.Mesh(
            new THREE.BoxGeometry(9.70, 0.22, 4.25),
            structuralFootingMat
        );
        portFnd.position.set(4.50, 0.25, wallZ + 2.125);
        portFnd.receiveShadow = true;
        portFnd.castShadow = true;
        fndGroup.add(portFnd);

        parent.add(fndGroup);

        // 5. Poured Concrete Foundations for Building 316 & Building 300 (graded on Washington St, extending 2.0m outward on all sides)
        const buildWashGradedFoundation = (code, bldgPts, apronPts, gradeY) => {
            const grp = new THREE.Group();
            grp.name = `Building${code}ConcreteFoundation`;
            grp.position.set(0, gradeY, 0);

            // A. Outer Poured Concrete Apron extended 2.0 meters outward from the building on all sides
            const apronShape = new THREE.Shape();
            apronPts.forEach(([px, pz], idx) => {
                if (idx === 0) apronShape.moveTo(px, -pz);
                else apronShape.lineTo(px, -pz);
            });
            apronShape.closePath();

            const aGeo = new THREE.ExtrudeGeometry(apronShape, {
                depth: 0.28,
                bevelEnabled: true,
                bevelThickness: 0.02,
                bevelSize: 0.04,
                bevelSegments: 2
            });
            aGeo.rotateX(-Math.PI / 2);
            const aMesh = new THREE.Mesh(aGeo, subMatSlabMat);
            aMesh.position.set(0, -0.12, 0);
            aMesh.receiveShadow = true;
            aMesh.castShadow = true;
            grp.add(aMesh);

            // B. Inner Stepped Structural Foundation Slab matching the exact building footprint
            const bShape = new THREE.Shape();
            bldgPts.forEach(([px, pz], idx) => {
                if (idx === 0) bShape.moveTo(px, -pz);
                else bShape.lineTo(px, -pz);
            });
            bShape.closePath();

            const sGeo = new THREE.ExtrudeGeometry(bShape, {
                depth: 0.24,
                bevelEnabled: true,
                bevelThickness: 0.03,
                bevelSize: 0.04,
                bevelSegments: 2
            });
            sGeo.rotateX(-Math.PI / 2);
            const sMesh = new THREE.Mesh(sGeo, structuralFootingMat);
            sMesh.position.set(0, 0.14, 0);
            sMesh.receiveShadow = true;
            sMesh.castShadow = true;
            grp.add(sMesh);

            // C. Raised Perimeter Concrete Stem-Wall Footing Curb tracing every wall segment of the building
            for (let i = 0; i < bldgPts.length; i++) {
                // Skip Building 316's Douglas St side (i=1), Washington St front entrance facade (i=2), the open courtyard bridge between 316 & 300 (i=3, 24), and Building 300's custom-plinth perimeter (i=4..23)
                if (code === '316_300_Connected' && ((i >= 1 && i <= 24))) continue;
                const [x0, z0] = bldgPts[i];
                const [x1, z1] = bldgPts[(i + 1) % bldgPts.length];
                const segLen = Math.hypot(x1 - x0, z1 - z0);
                const cx = (x0 + x1) * 0.5;
                const cz = (z0 + z1) * 0.5;
                const ang = Math.atan2(x1 - x0, z1 - z0);
                const curb = new THREE.Mesh(
                    new THREE.BoxGeometry(0.42, 0.14, segLen + 0.42),
                    stemWallMat
                );
                curb.position.set(cx, 0.43, cz);
                curb.rotation.y = ang;
                curb.castShadow = true;
                curb.receiveShadow = true;
                grp.add(curb);
            }

            parent.add(grp);
        };

        // 5. Connected Poured Concrete Foundation Slab for Building 316 & Building 300
        //    Graded to Washington St and extending 2.0m outward on all sides as one continuous connected slab
        const connectedStructuralPts = [
            // Building 316 NW & Washington St frontage
            [-12.34, 50.31],
            [-15.06, 48.30],
            [3.73, 23.08],
            [19.00, 34.42],
            // Connected across Washington St frontage to Building 300
            [26.48, 38.66],
            [42.11, 50.20],
            // Building 300 SE, S, and SW stepped perimeter
            [32.99, 62.52],
            [37.49, 65.83],
            [39.56, 63.03],
            [53.85, 73.58],
            [54.70, 76.01],
            [54.46, 78.66],
            [43.65, 93.27],
            [41.03, 91.35],
            [38.62, 94.61],
            [41.36, 96.63],
            [30.32, 111.54],
            [28.58, 112.23],
            [25.68, 112.30],
            [11.03, 101.49],
            [13.44, 98.22],
            [10.61, 96.14],
            [2.12, 107.62],
            [-20.28, 91.09],
            [-0.63, 64.55],
            // Connected to Building 316 SW perimeter
            [0.20, 59.63],
            [-5.74, 55.21],
            [-8.28, 58.62],
            [-14.88, 53.72]
        ];

        const connectedApronPts = groundFoundry._connected316_300ApronPts;

        buildWashGradedFoundation(
            '316_300_Connected',
            connectedStructuralPts,
            connectedApronPts,
            groundFoundry.getBuildingRoadHeight('building-316')
        );
}