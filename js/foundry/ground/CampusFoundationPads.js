import * as THREE from 'three';
import { getBrushedParkingConcreteTexture } from '../buildings/building401/WashingtonStreetCorridor.js';

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
            polygonOffsetFactor: 2,
            polygonOffsetUnits: 2
        });

        const structuralFootingMat = new THREE.MeshStandardMaterial({
            map: concreteTex,
            bumpMap: concreteTex,
            bumpScale: 0.02,
            color: '#c2bcb0',
            roughness: 0.82,
            metalness: 0.05,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
        });

        const stemWallMat = new THREE.MeshStandardMaterial({
            color: '#ded8ce',
            roughness: 0.78,
            metalness: 0.04,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2
        });

        // 1. Broad Poured Concrete Sub-Base Apron across the 400 lot (trimmed on +Z to lz = 21.65m, on -Z to lz = -16.64m,
        //    and on -X to lx = -3.24m so no flat slab protrudes into the sloped 411 alley or SW concrete drive)
        const apronW = 20.64; // lx: -3.24m .. +17.40m
        const apronD = 38.29; // lz: -16.64m .. +21.65m
        const apronH = 0.28;
        const apronMesh = new THREE.Mesh(
            new THREE.BoxGeometry(apronW, apronH, apronD),
            subMatSlabMat
        );
        apronMesh.position.set(7.08, -0.14, 2.505);
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
        slabMesh.position.set(0, 0.08, 0);
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
            aMesh.position.set(0, -0.22, 0);
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
            sMesh.position.set(0, -0.08, 0);
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

        // 6. Terrain-Graded Poured Concrete Foundation Sub-Base & Stepped Structural Footing
        //    for Building 401 (regional-jail-east) & the West Wing (regional-jail-west / CCRJ-W)
        {
            const fnd401Group = new THREE.Group();
            fnd401Group.name = 'Building401AndWestWingConcreteFoundation';
            const cx401 = -4.22, cz401 = -38.74;
            const cosT = 0.80425, sinT = -0.59429;
            fnd401Group.position.set(cx401, 0, cz401);
            fnd401Group.rotation.y = Math.atan2(sinT, cosT);

            const yTerrain401 = (lx, lz) => {
                const wx = cx401 + lx * cosT + lz * sinT;
                const wz = cz401 - lx * sinT + lz * cosT;
                return groundFoundry.getTerrainHeight(wx, wz);
            };

            const addGradedFoundationStrip = (xMin, xMax, getZMin, getZMax, segsX, segsZ, yTopOff, dropDepth, mat) => {
                const positions = [];
                const uvs = [];
                for (let ix = 0; ix < segsX; ix++) {
                    const u0 = ix / segsX;
                    const u1 = (ix + 1) / segsX;
                    const x0 = xMin + u0 * (xMax - xMin);
                    const x1 = xMin + u1 * (xMax - xMin);
                    const zMin0 = getZMin(x0), zMax0 = getZMax(x0);
                    const zMin1 = getZMin(x1), zMax1 = getZMax(x1);

                    for (let iz = 0; iz < segsZ; iz++) {
                        const v0 = iz / segsZ;
                        const v1 = (iz + 1) / segsZ;
                        const z00 = zMin0 + v0 * (zMax0 - zMin0);
                        const z01 = zMin0 + v1 * (zMax0 - zMin0);
                        const z10 = zMin1 + v0 * (zMax1 - zMin1);
                        const z11 = zMin1 + v1 * (zMax1 - zMin1);

                        const y00 = yTerrain401(x0, z00) + yTopOff;
                        const y01 = yTerrain401(x0, z01) + yTopOff;
                        const y10 = yTerrain401(x1, z10) + yTopOff;
                        const y11 = yTerrain401(x1, z11) + yTopOff;

                        // Top surface triangles (+Y normal)
                        positions.push(
                            x0, y00, z00,  x0, y01, z01,  x1, y11, z11,
                            x0, y00, z00,  x1, y11, z11,  x1, y10, z10
                        );
                        uvs.push(
                            x0 * 0.12, z00 * 0.12,  x0 * 0.12, z01 * 0.12,  x1 * 0.12, z11 * 0.12,
                            x0 * 0.12, z00 * 0.12,  x1 * 0.12, z11 * 0.12,  x1 * 0.12, z10 * 0.12
                        );

                        // South (-Z) foundation skirt wall
                        if (iz === 0) {
                            positions.push(
                                x0, y00, z00,  x1, y10, z10,  x1, y10 - dropDepth, z10,
                                x0, y00, z00,  x1, y10 - dropDepth, z10,  x0, y00 - dropDepth, z00
                            );
                            uvs.push(0, 1,  1, 1,  1, 0,   0, 1,  1, 0,  0, 0);
                        }
                        // North (+Z) foundation skirt wall
                        if (iz === segsZ - 1) {
                            positions.push(
                                x1, y11, z11,  x0, y01, z01,  x0, y01 - dropDepth, z01,
                                x1, y11, z11,  x0, y01 - dropDepth, z01,  x1, y11 - dropDepth, z11
                            );
                            uvs.push(0, 1,  1, 1,  1, 0,   0, 1,  1, 0,  0, 0);
                        }
                        // West (-X) foundation skirt wall
                        if (ix === 0) {
                            positions.push(
                                x0, y01, z01,  x0, y00, z00,  x0, y00 - dropDepth, z00,
                                x0, y01, z01,  x0, y00 - dropDepth, z00,  x0, y01 - dropDepth, z01
                            );
                            uvs.push(0, 1,  1, 1,  1, 0,   0, 1,  1, 0,  0, 0);
                        }
                        // East (+X) foundation skirt wall
                        if (ix === segsX - 1) {
                            positions.push(
                                x1, y10, z10,  x1, y11, z11,  x1, y11 - dropDepth, z11,
                                x1, y10, z10,  x1, y11 - dropDepth, z11,  x1, y10 - dropDepth, z10
                            );
                            uvs.push(0, 1,  1, 1,  1, 0,   0, 1,  1, 0,  0, 0);
                        }
                    }
                }
                const geo = new THREE.BufferGeometry();
                geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
                geo.computeVertexNormals();
                const mesh = new THREE.Mesh(geo, mat);
                mesh.receiveShadow = true;
                mesh.castShadow = true;
                fnd401Group.add(mesh);
            };

            // A. Outer Poured Concrete Foundation Sub-Base Apron across West Wing + NE Courtyard + Building 401
            const getOuterZMin = (lx) => {
                if (lx < -28.00) return -19.55; // West Wing South Corrugated Wing & ADA ramp apron
                if (lx < -4.05) return -18.35;  // SE Connector Wing, Evidence Room & Law Enforcement Entry walk apron
                return -9.10;                   // Tuck inside South Wall (-9.20m) so South Lawn/Lava-Rock, Landing, Ramp & 1st-Floor Courtyard stay 100% clean!
            };
            const getOuterZMax = (lx) => {
                if (lx < -13.85) return 21.85;  // West Wing & Sallyport Washington St foundation apron
                if (lx >= 13.30 && lx <= 20.70) return 20.55; // Building 401 1-story Utility Bay North apron
                return 18.05;                   // Building 401 North foundation apron
            };

            addGradedFoundationStrip(-59.65, 51.90, getOuterZMin, getOuterZMax, 42, 10, 0.03, 1.65, subMatSlabMat);

            // B. Inner Stepped Structural Foundation Footing Pad matching the Building 401 + West Wing + Service Courtyard footprint
            const getFootZMin = (lx) => {
                if (lx < -28.04) return -18.08; // West Wing South Corrugated Wing footing
                if (lx < -7.40) return -18.22;  // SE Connector Wing & Evidence Room footing
                if (lx >= -4.05) return -9.10;  // Keep clear of sub-sill Lava-Rock/Lawn, Ramp & -1.5ft 1st-Floor Courtyard
                return -9.52;                   // Law Enforcement Entry alcove South structural footing
            };
            const getFootZMax = (lx) => {
                if (lx < -23.57) return 21.90;  // West Wing Main 2-Story Block North structural footing
                if (lx < -13.85) return 21.30;  // West Wing Sallyport North structural footing
                if (lx >= 13.40 && lx <= 20.60) return 20.60; // Building 401 Utility Bay structural footing
                return 18.00;                   // Building 401 Main Block North structural footing
            };

            addGradedFoundationStrip(-59.65, 51.85, getFootZMin, getFootZMax, 42, 8, 0.06, 1.45, structuralFootingMat);

            parent.add(fnd401Group);
        }

        // 7. Building 400 Brushed Concrete Parking Lot & Douglas St Sidewalk Extension (Scene Ground Layer — outside all .GLB files)
        //    Covers Building 400's rear/SW parking plaza (lx = +23.62m .. +62.18m) with the exact same brushed parking concrete
        //    texture & material as B400ConcreteParking_LowerBay / UpperBay, plus the Douglas St sidewalk strip (lx = +62.18m .. +64.40m).
        {
            const bCenter = [-73.89, -11.51];
            const cosA = 0.80801;
            const sinA = -0.58917;
            const terrainY = groundFoundry.getTerrainHeight(bCenter[0], bCenter[1]);

            const b400ParkingGroup = new THREE.Group();
            b400ParkingGroup.name = 'Building400ConcreteParkingGround';
            b400ParkingGroup.position.set(bCenter[0], terrainY, bCenter[1]);
            b400ParkingGroup.rotation.y = Math.atan2(sinA, cosA);

            const parkingConcreteTex = getBrushedParkingConcreteTexture();
            const parkingConcreteMat = new THREE.MeshStandardMaterial({
                color: '#d4cfc5',
                map: parkingConcreteTex,
                roughness: 0.84,
                metalness: 0.03,
                side: THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: -2,
                polygonOffsetUnits: -2
            });
            const swConcreteMat = new THREE.MeshStandardMaterial({
                color: '#e2dcd0',
                roughness: 0.86,
                metalness: 0.03,
                polygonOffset: true,
                polygonOffsetFactor: -2,
                polygonOffsetUnits: -2
            });
            const swJointMat = new THREE.MeshBasicMaterial({
                color: '#9c9588',
                polygonOffset: true,
                polygonOffsetFactor: -3,
                polygonOffsetUnits: -3
            });

            const yStreetGrade = (lx, lz) => {
                const wx = bCenter[0] + lx * cosA + lz * sinA;
                const wz = bCenter[1] - lx * sinA + lz * cosA;
                return groundFoundry.getTerrainHeight(wx, wz) - terrainY;
            };
            const ySwTop = (lx) => yStreetGrade(lx, -23.50) + 0.09;
            // Exact outer weld line in 411 local coords matching lz401 = 74.415m (overlaps B400ConcreteParking_LowerBay at lz401 = 74.40m by 1.5cm)
            const zOuter411 = (lx) => 11.11 + 0.00635 * lx;
            const yAlleyLot = (lx, lz) => {
                const zOut = zOuter411(lx);
                const tDoug = THREE.MathUtils.clamp((lx - 23.62) / (64.40 - 23.62), 0, 1);
                const baseBias = THREE.MathUtils.lerp(0.12, 0.085, tDoug);
                const rearWeldBias = THREE.MathUtils.lerp(
                    0.106,
                    0.085,
                    THREE.MathUtils.smoothstep(lx, 62.18, 64.40)
                );
                const hBias = THREE.MathUtils.lerp(
                    baseBias,
                    rearWeldBias,
                    THREE.MathUtils.smoothstep(lz, 6.00, zOut)
                );
                return yStreetGrade(lx, lz) + hBias;
            };

            const evalParkingUv = (px, pz) => {
                const wx = bCenter[0] + px * cosA + pz * sinA;
                const wz = bCenter[1] - px * sinA + pz * cosA;
                const dx401 = wx - (-4.22);
                const dz401 = wz - (-38.74);
                const lx401 = dx401 * 0.80425 + dz401 * 0.59429;
                const lz401 = -dx401 * 0.59429 + dz401 * 0.80425;
                return [lx401 * 0.24, lz401 * 0.24];
            };

            const addGradedQuad = (p00, p10, p11, p01, mat, yBias = 0) => {
                const geom = new THREE.BufferGeometry();
                const crossY = (p10[2] - p00[2]) * (p11[0] - p00[0]) - (p10[0] - p00[0]) * (p11[2] - p00[2]);
                const [a, b, c, d] = crossY >= 0 ? [p00, p10, p11, p01] : [p00, p01, p11, p10];
                const verts = new Float32Array([
                    a[0], a[1] + yBias, a[2],
                    b[0], b[1] + yBias, b[2],
                    c[0], c[1] + yBias, c[2],
                    a[0], a[1] + yBias, a[2],
                    c[0], c[1] + yBias, c[2],
                    d[0], d[1] + yBias, d[2]
                ]);
                let uvs;
                if (mat === parkingConcreteMat) {
                    const [ua, va] = evalParkingUv(a[0], a[2]);
                    const [ub, vb] = evalParkingUv(b[0], b[2]);
                    const [uc, vc] = evalParkingUv(c[0], c[2]);
                    const [ud, vd] = evalParkingUv(d[0], d[2]);
                    uvs = new Float32Array([ua, va, ub, vb, uc, vc, ua, va, uc, vc, ud, vd]);
                } else {
                    uvs = new Float32Array([
                        a[0] * 0.25, a[2] * 0.25,
                        b[0] * 0.25, b[2] * 0.25,
                        c[0] * 0.25, c[2] * 0.25,
                        a[0] * 0.25, a[2] * 0.25,
                        c[0] * 0.25, c[2] * 0.25,
                        d[0] * 0.25, d[2] * 0.25
                    ]);
                }
                geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
                geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
                geom.computeVertexNormals();
                const m = new THREE.Mesh(geom, mat);
                m.receiveShadow = true;
                b400ParkingGroup.add(m);
                return m;
            };

            const addGradedSkirtSegment = (x0, z0, x1, z1, thick, yTopFn, wallMat) => {
                const dx = x1 - x0;
                const dz = z1 - z0;
                const len = Math.hypot(dx, dz);
                const steps = Math.max(1, Math.ceil(len / 1.40));
                const angle = Math.atan2(dz, dx);
                for (let i = 0; i < steps; i++) {
                    const t0 = i / steps;
                    const t1 = (i + 1) / steps;
                    const tm = 0.5 * (t0 + t1);
                    const xA = x0 + dx * t0, zA = z0 + dz * t0;
                    const xB = x0 + dx * t1, zB = z0 + dz * t1;
                    const mx = x0 + dx * tm, mz = z0 + dz * tm;
                    const segLen = (len / steps) + 0.02;
                    const topA = yTopFn(xA, zA);
                    const topB = yTopFn(xB, zB);
                    const yTop = 0.5 * (topA + topB);
                    const yBot = Math.min(ySwTop(mx) - 0.16, yStreetGrade(mx, mz) - 0.16, yTop - 0.36);
                    const bodyH = Math.max(0.20, yTop - yBot);
                    const slopeAlong = Math.atan2(topB - topA, len / steps);

                    const segGroup = new THREE.Group();
                    segGroup.position.set(mx, 0, mz);
                    segGroup.rotation.y = -angle;

                    const body = new THREE.Mesh(new THREE.BoxGeometry(segLen, bodyH, thick), wallMat);
                    body.position.set(0, yBot + bodyH * 0.5, 0);
                    body.rotation.z = slopeAlong;
                    body.castShadow = true;
                    body.receiveShadow = true;
                    segGroup.add(body);
                    b400ParkingGroup.add(segGroup);
                }
            };

            const dougExtSpans = [
                { xStart: 23.62, xEnd: 28.98, zInner: -2.26, xSteps: 5, mat: parkingConcreteMat },
                { xStart: 28.98, xEnd: 47.48, zInner: -3.40, xSteps: 14, mat: parkingConcreteMat },
                { xStart: 47.48, xEnd: 56.65, zInner: -4.52, xSteps: 7, mat: parkingConcreteMat },
                { xStart: 56.65, xEnd: 62.34, zInner: -3.40, xSteps: 6, mat: parkingConcreteMat },
                { xStart: 62.34, xEnd: 64.54, zInner: -3.40, xSteps: 3, mat: swConcreteMat }
            ];
            const dougZSteps = 22;
            const b400WalkWidth = 1.50;
            dougExtSpans.forEach(({ xStart, xEnd, zInner, xSteps, mat }) => {
                for (let ix = 0; ix < xSteps; ix++) {
                    const x0 = xStart + ((xEnd - xStart) * ix) / xSteps;
                    const x1 = xStart + ((xEnd - xStart) * (ix + 1)) / xSteps;
                    const zOut0 = zOuter411(x0);
                    const zOut1 = zOuter411(x1);
                    for (let iz = 0; iz < dougZSteps; iz++) {
                        const t0 = iz / dougZSteps;
                        const t1 = (iz + 1) / dougZSteps;
                        const z00 = zInner + (zOut0 - zInner) * t0;
                        const z10 = zInner + (zOut1 - zInner) * t0;
                        const z11 = zInner + (zOut1 - zInner) * t1;
                        const z01 = zInner + (zOut0 - zInner) * t1;
                        addGradedQuad(
                            [x0, yAlleyLot(x0, z00), z00],
                            [x1, yAlleyLot(x1, z10), z10],
                            [x1, yAlleyLot(x1, z11), z11],
                            [x0, yAlleyLot(x0, z01), z01],
                            mat
                        );
                    }
                    // 1.50m Concrete Pedestrian Walkway strip along Building 400's SW Rear Wall (zInner .. zInner + 1.50m)
                    // connecting seamlessly into the Douglas St sidewalk strip (lx = 62.34..64.54)
                    if (mat !== swConcreteMat) {
                        const zWalk0 = zInner;
                        const zWalk1 = zInner + b400WalkWidth;
                        addGradedQuad(
                            [x0, yAlleyLot(x0, zWalk0), zWalk0],
                            [x1, yAlleyLot(x1, zWalk0), zWalk0],
                            [x1, yAlleyLot(x1, zWalk1), zWalk1],
                            [x0, yAlleyLot(x0, zWalk1), zWalk1],
                            swConcreteMat,
                            0.004
                        );
                        addGradedQuad(
                            [x0, yAlleyLot(x0, zWalk1 - 0.015), zWalk1 - 0.015],
                            [x1, yAlleyLot(x1, zWalk1 - 0.015), zWalk1 - 0.015],
                            [x1, yAlleyLot(x1, zWalk1 + 0.015), zWalk1 + 0.015],
                            [x0, yAlleyLot(x0, zWalk1 + 0.015), zWalk1 + 0.015],
                            swJointMat,
                            0.008
                        );
                        if (ix > 0) {
                            addGradedQuad(
                                [x0 - 0.014, yAlleyLot(x0 - 0.014, zWalk0 + 0.04), zWalk0 + 0.04],
                                [x0 + 0.014, yAlleyLot(x0 + 0.014, zWalk0 + 0.04), zWalk0 + 0.04],
                                [x0 + 0.014, yAlleyLot(x0 + 0.014, zWalk1 - 0.04), zWalk1 - 0.04],
                                [x0 - 0.014, yAlleyLot(x0 - 0.014, zWalk1 - 0.04), zWalk1 - 0.04],
                                swJointMat,
                                0.008
                            );
                        }
                    }
                }
            });

            for (let jz = -1.75; jz < 11.20; jz += 1.75) {
                addGradedQuad(
                    [62.36, yAlleyLot(62.36, jz - 0.014), jz - 0.014],
                    [64.40, yAlleyLot(64.40, jz - 0.014), jz - 0.014],
                    [64.40, yAlleyLot(64.40, jz + 0.014), jz + 0.014],
                    [62.36, yAlleyLot(62.36, jz + 0.014), jz + 0.014],
                    swJointMat,
                    0.006
                );
            }

            // Outer street-side skirt along Douglas St curb edge (lx = 64.54m, lz = -3.40m .. zOuter411(64.54)),
            // with NO interior wall along zOuter411 so the transition into B400ConcreteParking_LowerBay is 100% seamless!
            const zOutDouglas = zOuter411(64.54);
            for (let iz = 0; iz < 16; iz++) {
                const sz0 = -3.40 + ((zOutDouglas - (-3.40)) * iz) / 16;
                const sz1 = -3.40 + ((zOutDouglas - (-3.40)) * (iz + 1)) / 16;
                addGradedSkirtSegment(64.54, sz0, 64.54, sz1, 0.18, (px, pz) => yAlleyLot(px, pz) - 0.015, swConcreteMat);
            }

            parent.add(b400ParkingGroup);
        }
}