import * as THREE from 'three';

export function buildBuilding316GroundsAndSidewalks(ctx) {
    const {
        building, groundArch,
        getDouglasLocalGroundY, addContouredDouglasStrip,
        frontZ, douglasX,
        whiteTrimMat, darkBronzeMat, galvSteelMat
    } = ctx;
    const arch = groundArch;
    const addBox = (w, h, d, mat, x, y, z, cast = true) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z);
        m.castShadow = cast;
        m.receiveShadow = true;
        m.userData = { isSelectableBuilding: true, building };
        groundArch.add(m);
        return m;
    };

        const sidewalkConcreteMat = new THREE.MeshStandardMaterial({
            color: '#d8d4cb',
            roughness: 0.85,
            metalness: 0.03
        });
        const sidewalkJointMat = new THREE.MeshStandardMaterial({
            color: '#8c867a',
            roughness: 0.92,
            metalness: 0.02
        });
        const whitePebbleMat = new THREE.MeshStandardMaterial({
            color: '#e8e5dd',
            roughness: 0.95,
            metalness: 0.01
        });
        const railPipeMat = new THREE.MeshStandardMaterial({
            color: '#5c6166',
            roughness: 0.45,
            metalness: 0.68
        });
        const lawnMat = new THREE.MeshStandardMaterial({
            color: '#4e7932',
            roughness: 0.92,
            metalness: 0.02
        });
        const shrubMat = new THREE.MeshStandardMaterial({
            color: '#365c24',
            roughness: 0.90,
            metalness: 0.02
        });

        // 1. ZONE 1 — ENTRANCE WALKWAY / ADA RAMP DIRECTLY ALONG BUILDING FRONT WALL (lz = frontZ .. frontZ + 1.90m)
        // Thin 0.16m white crushed-rock drip strip right against the precast wall base (lx = -3.60m..+7.91m)
        addBox(11.52, 0.28, 0.18, whitePebbleMat, 2.16, 0.29, frontZ + 0.09, false);

        // Concrete Entrance Walkway running right next to the building wall from the Douglas St sidewalk (lx = +10.25m) to the entrance doors (lx = -3.65m)
        const walkW = 13.90; // lx = -3.65m .. +10.25m (connects directly into the Douglas St sidewalk)
        const walkD = 1.72;  // lz = frontZ + 0.18m .. frontZ + 1.90m
        const walkCenterZ = frontZ + 1.04;
        addBox(walkW, 0.28, walkD, sidewalkConcreteMat, 3.30, 0.28, walkCenterZ, false);
        // Transverse concrete expansion joints on the entrance walkway (aligned with handrail posts)
        for (let jx = -3.65; jx <= 10.10; jx += 1.70) {
            addBox(0.03, 0.29, walkD + 0.02, sidewalkJointMat, jx, 0.285, walkCenterZ, false);
        }

        // Main Concrete Entrance Vestibule Landing along the building front (lx = -11.13m..-3.65m, lz = frontZ .. frontZ + 1.90m)
        addBox(7.48, 0.28, 1.90, sidewalkConcreteMat, -7.39, 0.28, frontZ + 0.95, false);

        // Single-Top-Rail Weathered Galvanized Steel Pipe Handrail along the outer edge of the Entrance Walkway (lz = frontZ + 1.84m, lx = -7.05m..+8.25m)
        const railZ = frontZ + 1.84;
        const railSpan = 15.30;
        const railCenterX = 0.60;
        // Single tubular top rail (no mid-rail, matching reference photo!)
        const topRailGeo = new THREE.CylinderGeometry(0.026, 0.026, railSpan, 12);
        topRailGeo.rotateZ(Math.PI * 0.5);
        const topRailMesh = new THREE.Mesh(topRailGeo, railPipeMat);
        topRailMesh.position.set(railCenterX, 1.28, railZ);
        topRailMesh.castShadow = true;
        arch.add(topRailMesh);
        // Vertical tubular steel handrail posts anchored into the outer concrete walkway curb every 1.70m
        for (let rx = -7.05; rx <= 8.26; rx += 1.70) {
            const postMesh = new THREE.Mesh(
                new THREE.CylinderGeometry(0.024, 0.024, 0.90, 10),
                railPipeMat
            );
            postMesh.position.set(rx, 0.83, railZ);
            postMesh.castShadow = true;
            arch.add(postMesh);
        }

        // 2. ZONE 2 — THE SMALL LAWN PATCH (lz = frontZ + 1.90m .. frontZ + 4.15m, lx = -13.45m .. +10.25m — from Building 300 stair cheek wall to Douglas St sidewalk)
        // Sloped green turf grass berm between the Entrance Walkway handrail and the Washington St Public Sidewalk
        const lawnW = 23.70;
        const lawnD = 2.25;
        const lawnGeo = new THREE.BoxGeometry(lawnW, 0.22, lawnD);
        // Tilt slightly so the lawn slopes gently down from the raised entrance walkway (lz = frontZ + 1.90m) to the street sidewalk (lz = frontZ + 4.15m)
        const lawnMesh = new THREE.Mesh(lawnGeo, lawnMat);
        lawnMesh.position.set(-1.60, 0.24, frontZ + 3.025);
        lawnMesh.rotation.x = 0.065;
        lawnMesh.receiveShadow = true;
        arch.add(lawnMesh);

        // Municipal Yellow Fire Hydrant with Weathered Red/Green Bonnet Cap in the foreground of the Small Lawn Patch (lx = +5.55m, lz = frontZ + 3.05m)
        const hydGrp = new THREE.Group();
        hydGrp.position.set(5.55, 0.34, frontZ + 3.05);
        const hydYellowMat = new THREE.MeshStandardMaterial({ color: '#d8a818', roughness: 0.48, metalness: 0.22 });
        const hydRedCapMat = new THREE.MeshStandardMaterial({ color: '#983b38', roughness: 0.62, metalness: 0.25 });
        const hydPatinaMat = new THREE.MeshStandardMaterial({ color: '#567864', roughness: 0.58, metalness: 0.28 });
        // Base flange & lower barrel
        const hydBase = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.08, 14), hydYellowMat);
        hydBase.position.y = 0.04;
        hydGrp.add(hydBase);
        const hydBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.13, 0.52, 16), hydYellowMat);
        hydBarrel.position.y = 0.30;
        hydBarrel.castShadow = true;
        hydGrp.add(hydBarrel);
        // Side 2.5-inch hose nozzles (-X and +X)
        [-1, 1].forEach((dir) => {
            const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.16, 12), hydYellowMat);
            noz.rotation.z = Math.PI * 0.5;
            noz.position.set(dir * 0.16, 0.38, 0);
            hydGrp.add(noz);
        });
        // Front 4.5-inch pumper steamer nozzle facing toward the sidewalk/street
        const pumperNoz = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.16, 14), railPipeMat);
        pumperNoz.rotation.x = Math.PI * 0.5;
        pumperNoz.position.set(0, 0.33, 0.14);
        hydGrp.add(pumperNoz);
        // Weathered red flange collar & patina-green/red domed bonnet cap + operating nut
        const hydCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.05, 16), hydRedCapMat);
        hydCollar.position.y = 0.56;
        hydGrp.add(hydCollar);
        const hydBonnet = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hydPatinaMat);
        hydBonnet.position.y = 0.57;
        hydGrp.add(hydBonnet);
        const hydNut = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.06, 5), hydRedCapMat);
        hydNut.position.y = 0.71;
        hydGrp.add(hydNut);
        arch.add(hydGrp);

        // 3. ZONE 3 — THE WASHINGTON ST PUBLIC CONCRETE SIDEWALK (lz = frontZ + 4.15m .. frontZ + 6.45m, lx = -13.45m .. +12.50m)
        // Follows the Google Map sidewalk & completely covers the outer layer of the foundation concrete (lz316 = 29.55m..31.85m)!
        const swWidth = 25.95; // Spans full Washington St frontage from outer edge of Douglas St sidewalk (lx = +12.50m) to Building 300's sidewalk (lx = -13.45m)
        const swDepth = 2.30;  // Two 1.15m concrete sidewalk panels wide (lz316 = 29.55m..31.85m)
        const swCenterX = -0.475;
        const swCenterZ = frontZ + 5.30;
        addBox(swWidth, 0.26, swDepth, sidewalkConcreteMat, swCenterX, 0.21, swCenterZ, false);
        // Longitudinal center score joint dividing the sidewalk into two rows of panels (visible in reference photo)
        addBox(swWidth, 0.27, 0.03, sidewalkJointMat, swCenterX, 0.215, swCenterZ, false);
        // Transverse control joints every 1.75m along the Washington St public sidewalk
        for (let sx = -13.20; sx <= 12.25; sx += 1.75) {
            addBox(0.03, 0.27, swDepth + 0.02, sidewalkJointMat, sx, 0.215, swCenterZ, false);
        }
        // Raised Concrete Street Curb along the outer Washington St edge of the sidewalk (lz = frontZ + 6.37m = 31.77m)
        addBox(swWidth, 0.29, 0.16, whiteTrimMat, swCenterX, 0.225, frontZ + 6.37, false);

        // 4. DOUGLAS STREET (+X RIGHT SIDE) TERRAIN-CONTOURED GRASS STRIP & PUBLIC SIDEWALK (lx = douglasX = +7.91m .. +12.50m, lz = -10.55m .. +29.55m)
        // Follows the 3D topographic terrain contour along Douglas Street from Washington St (lz = +29.55m) up to the SW rear of Building 316 (lz = -10.55m)!
        // Thin white crushed-rock drip strip along the base of the Douglas St wall (lx = +7.91m..+8.09m, lz = -6.05m..+25.40m)
        addContouredDouglasStrip(douglasX, douglasX + 0.18, -6.05, 25.40, 0.33, -0.08, whitePebbleMat, 40);
        // Contoured Green Grass Lawn Strip along the right side of Building 316 facing Douglas Street (lx = +8.09m..+10.25m, lz = -10.55m..+25.40m)
        addContouredDouglasStrip(douglasX + 0.18, 10.25, -10.55, 25.40, 0.32, -0.08, lawnMat, 48);
        // Additional Rear SW Corner Lawn Fill where Building 316 steps inward from lx = +7.91m to lx = +4.56m (lz = -10.55m..-6.05m)
        addContouredDouglasStrip(4.56, douglasX + 0.18, -10.55, -6.05, 0.32, -0.08, lawnMat, 12);

        // Terrain-Contoured Douglas Street Concrete Public Sidewalk (lx = +10.25m..+12.50m, lz = -10.55m..+29.55m — meets Washington St sidewalk flush at lz = +29.55m!)
        const dougSwW = 2.25;
        const dougSwCenterX = 10.25 + dougSwW * 0.5; // +11.375m
        addContouredDouglasStrip(10.25, 12.50, -10.55, 29.55, 0.34, -0.10, sidewalkConcreteMat, 56);
        // Contoured longitudinal center score joint dividing the Douglas St sidewalk into two rows of panels
        addContouredDouglasStrip(dougSwCenterX - 0.015, dougSwCenterX + 0.015, -10.55, 29.55, 0.346, 0.0, sidewalkJointMat, 56);
        // Transverse control joints every 1.75m along the Douglas St public sidewalk pitched to match the terrain contour
        for (let sz = -10.00; sz <= 29.00; sz += 1.75) {
            const sampleSwY = (zVal) => Math.max(
                getDouglasLocalGroundY(10.25, zVal),
                getDouglasLocalGroundY(12.50, zVal),
                getDouglasLocalGroundY(dougSwCenterX, zVal)
            );
            const yHere = sampleSwY(sz);
            const yPrev = sampleSwY(sz - 0.35);
            const yNext = sampleSwY(sz + 0.35);
            const jMesh = addBox(dougSwW + 0.02, 0.04, 0.03, sidewalkJointMat, dougSwCenterX, yHere + 0.33, sz, false);
            jMesh.rotation.x = Math.atan2(yPrev - yNext, 0.70);
        }
        // Terrain-Contoured Raised Concrete Street Curb along the outer Douglas St edge of the sidewalk (lx = +12.34m..+12.50m, lz = -10.55m..+31.85m)
        addContouredDouglasStrip(12.34, 12.50, -10.55, 31.85, 0.37, -0.10, whiteTrimMat, 60);

        // Green Street Name Sign ("WASHINGTON ST / DOUGLAS ST") at the corner of the grass patch (visible in aerial photo)
        const signGroundY = getDouglasLocalGroundY(8.85, frontZ + 2.35);
        const streetSignMat = new THREE.MeshStandardMaterial({ color: '#1b6b3a', roughness: 0.45, metalness: 0.18 });
        addBox(0.055, 2.35, 0.055, galvSteelMat, 8.85, signGroundY + 1.42, frontZ + 2.35);
        addBox(0.78, 0.18, 0.03, streetSignMat, 8.85, signGroundY + 2.52, frontZ + 2.35);
        addBox(0.03, 0.18, 0.72, streetSignMat, 8.85, signGroundY + 2.32, frontZ + 2.35);

        // Black Cylindrical Steel Bollard Post on the outer sidewalk panel in the foreground left (lx = +5.75m, lz = frontZ + 5.95m)
        const bollardGrp = new THREE.Group();
        bollardGrp.position.set(5.75, 0.32, frontZ + 5.95);
        const bollardFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.03, 16), darkBronzeMat);
        bollardFlange.position.y = 0.015;
        bollardGrp.add(bollardFlange);
        const bollardShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.86, 16), darkBronzeMat);
        bollardShaft.position.y = 0.44;
        bollardShaft.castShadow = true;
        bollardGrp.add(bollardShaft);
        const bollardCap = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.04, 16), darkBronzeMat);
        bollardCap.position.y = 0.87;
        bollardGrp.add(bollardCap);
        arch.add(bollardGrp);

        // Street Parking Signpost along Washington St sidewalk curb (lx = -1.40m, lz = frontZ + 6.18m)
        addBox(0.05, 2.45, 0.05, galvSteelMat, -1.40, 1.45, frontZ + 6.18);
        addBox(0.32, 0.46, 0.02, whiteTrimMat, -1.40, 2.35, frontZ + 6.18); // Upper parking sign plate
        addBox(0.32, 0.38, 0.02, whiteTrimMat, -1.40, 1.88, frontZ + 6.18); // Lower parking sign plate
}