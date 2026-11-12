import * as THREE from 'three';
import { getBrushedParkingConcreteTexture } from '../building401/WashingtonStreetCorridor.js';

/**
 * Photo-realistic 3D reconstruction of Building 411/412 (410 / 411 / 412 Washington St —
 * Chelan County Natural Resources Department & WSU Chelan County Extension, id: "building-411-412").
 *
 * Modeled directly from 8 side-to-front ground-level reference photographs:
 * - Weathered gray-taupe vertical grooved T1-11 wood siding (#8d8e87) with warm tan-olive roof fascia (#a59e84)
 *   and crisp white window/door trim (#efede6)
 * - Exact L-shaped multi-wing single-story massing + raised central clerestory monitor & rooftop Carrier HVAC unit:
 *   1. NE Side Wing (411 Washington rear/side, lx = +0.04m..+15.73m, lz = +1.05m..+11.60m):
 *      - NE side wall (lx = +15.73m) with 2 dark-framed sliding windows, white 6-panel service door,
 *        pad-mounted green electrical transformer box on concrete pad, and 2 wood utility poles with guy wires
 *      - NE inside L-corner entrance (411 Washington) with 2-step concrete landing, flat corner canopy on square post,
 *        tall glass/transom entry unit, venetian-blind window, twin electric meters + breaker box, and 411 entry door
 *   2. SE Main Wing (410 / 411 Washington, lx = +0.04m..+11.68m, lz = -14.95m..+1.05m):
 *      - NE parking-lot wall (lx = +11.68m) with 5-bay horizontal sliding window ribbon & pebble-stucco spandrel
 *      - SE front wall (lz = -14.95m) with recessed crawlspace reveal, square picture window, diagonal black "410"
 *        numbers, and landscaped rockery bed with basalt boulders, evergreen shrubs & sculptural driftwood stump
 *      - SW walkway wall (lx = +0.04m) with 3 sliding windows, red/white "RESERVED PARKING" signs, dried ornamental
 *        border plants, concrete sidewalk + 2 front steps with black pipe handrail, and concrete wheel stops
 *      - Covered 410 corner porch supported by a brown cedar post, "410" customer door under a sloped black awning,
 *        storefront window with "OPEN" sign, 2 concrete steps, and curved concrete curb planter with 3-post black pipe guardrail
 *   3. Recessed Link Wall (lz = +4.45m, lx = -3.80m..+0.36m):
 *      - Small white-framed window with wall AC unit above, and 2-tier split-face stone block planter bed
 *   4. SW Extension Wing (412 Washington — WSU Chelan County Extension, lx = -20.25m..+0.04m, lz = +4.45m..+11.60m):
 *      - Full-width covered walkway canopy on 6 square posts with yellow reserved parking signs & 2 upper wall-pack lights
 *      - East & West white entry doors with arched fanlight lites, 4 dark-tinted windows, "412" numbers,
 *        and "WASHINGTON STATE UNIVERSITY — CHELAN COUNTY EXTENSION / 412 Washington" sign banner
 */
export function buildPhotoRealisticBuilding411_412(
    foundry,
    group,
    building,
    shape,
    wallMat,
    trimMat,
    terrainY = 0,
    getTerrainHeightFn = null
) {
    const arch = new THREE.Group();
    arch.name = 'Building411_412ArchitecturalDetails';
    // Exact alignment of the 411/412 complex:
    // +lx points Northeast (0.80801, 0.58917), -lx points Southwest (toward 412 wing / King St)
    // -lz points Southeast (toward Washington St & front parking lot), +lz points Northwest
    const cosA = 0.80801;
    const sinA = -0.58917;
    arch.rotation.y = Math.atan2(sinA, cosA);
    group.add(arch);

    // =========================================================================
    // 1. PROCEDURAL TEXTURES & MATERIALS
    // =========================================================================

    // A. Weathered Gray-Taupe Vertical Grooved T1-11 Wood Siding Texture (#8d8e87)
    const sidingCan = document.createElement('canvas');
    sidingCan.width = 512;
    sidingCan.height = 512;
    const sCtx = sidingCan.getContext('2d');
    sCtx.fillStyle = '#8e8f88';
    sCtx.fillRect(0, 0, 512, 512);

    const grooveSpan = 16; // 32 vertical T1-11 board grooves per 512px
    for (let x = 0; x < 512; x += grooveSpan) {
        const variation = ((Math.sin(x * 17.3) * 43758.5) % 1) * 8 - 4;
        sCtx.fillStyle = `rgb(${Math.round(142 + variation)}, ${Math.round(143 + variation)}, ${Math.round(136 + variation)})`;
        sCtx.fillRect(x + 2, 0, grooveSpan - 3, 512);
        // Subtle vertical wood grain streaks
        for (let g = 0; g < 18; g++) {
            const gy = ((x * 37 + g * 83) % 512);
            const gh = 28 + ((g * 19) % 45);
            sCtx.fillStyle = g % 2 === 0 ? 'rgba(110, 108, 100, 0.16)' : 'rgba(168, 166, 158, 0.12)';
            sCtx.fillRect(x + 3 + (g % (grooveSpan - 5)), gy, 1.5, gh);
        }
        // Vertical T1-11 kerf groove shadow + highlight
        sCtx.fillStyle = 'rgba(54, 55, 50, 0.72)';
        sCtx.fillRect(x, 0, 2, 512);
        sCtx.fillStyle = 'rgba(175, 176, 168, 0.32)';
        sCtx.fillRect(x + 2, 0, 1, 512);
    }
    // Subtle horizontal panel seam at mid-height
    sCtx.fillStyle = 'rgba(65, 66, 60, 0.35)';
    sCtx.fillRect(0, 254, 512, 2);

    const t111Tex = new THREE.CanvasTexture(sidingCan);
    t111Tex.wrapS = THREE.RepeatWrapping;
    t111Tex.wrapT = THREE.RepeatWrapping;
    t111Tex.repeat.set(2.5, 1.0);
    t111Tex.colorSpace = THREE.SRGBColorSpace;

    const t111SidingMat = new THREE.MeshStandardMaterial({
        map: t111Tex,
        bumpMap: t111Tex,
        bumpScale: 0.022,
        roughness: 0.84,
        metalness: 0.03
    });

    // Lighter weathered cream-gray T1-11 siding for the left half of the NE end wall (seen in Photo 4: 3ac62a15.jpg)
    const lightT111Mat = new THREE.MeshStandardMaterial({
        map: t111Tex,
        bumpMap: t111Tex,
        bumpScale: 0.022,
        color: '#b8b5a8',
        roughness: 0.84,
        metalness: 0.03
    });

    // B. Pebble-Dash / Exposed-Aggregate Stucco Spandrel & Plinth Texture (seen in Photo 1 & Photo 2)
    const stuccoCan = document.createElement('canvas');
    stuccoCan.width = 256;
    stuccoCan.height = 256;
    const stCtx = stuccoCan.getContext('2d');
    stCtx.fillStyle = '#9e998e';
    stCtx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4500; i++) {
        const px = (i * 53) % 256;
        const py = (i * 97) % 256;
        stCtx.fillStyle = i % 3 === 0 ? 'rgba(70,66,60,0.28)' : (i % 2 === 0 ? 'rgba(210,204,192,0.25)' : 'rgba(130,118,102,0.22)');
        stCtx.fillRect(px, py, 2, 2);
    }
    const stuccoTex = new THREE.CanvasTexture(stuccoCan);
    stuccoTex.wrapS = THREE.RepeatWrapping;
    stuccoTex.wrapT = THREE.RepeatWrapping;
    stuccoTex.repeat.set(3, 1);
    stuccoTex.colorSpace = THREE.SRGBColorSpace;

    const pebbleStuccoMat = new THREE.MeshStandardMaterial({
        map: stuccoTex,
        bumpMap: stuccoTex,
        bumpScale: 0.025,
        roughness: 0.90,
        metalness: 0.02
    });

    // C. Brushed Concrete Walkway & Step Material (unified with Building 400's plazaConcreteMat #e2dcd0)
    const concreteMat = new THREE.MeshStandardMaterial({
        color: '#e2dcd0',
        roughness: 0.86,
        metalness: 0.03,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
    });

    // C2. Brushed Concrete Parking Surface Material (unified 1:1 with newly added B400ConcreteParking bays)
    const parkingConcreteMat = new THREE.MeshStandardMaterial({
        color: '#d4cfc5',
        map: getBrushedParkingConcreteTexture(),
        roughness: 0.84,
        metalness: 0.03,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
    });

    // D. Standard Architectural & Site Materials
    const fasciaTrimMat = new THREE.MeshStandardMaterial({
        color: '#9e977e', // Warm olive-tan fascia trim seen in Photos 1, 2, 4
        roughness: 0.68,
        metalness: 0.08
    });
    const whiteTrimMat = new THREE.MeshStandardMaterial({
        color: '#eeece4',
        roughness: 0.55,
        metalness: 0.06
    });
    const puttyDoorMat = new THREE.MeshStandardMaterial({
        color: '#a8a291', // Warm putty-beige doors in Photos 1 & 7
        roughness: 0.62,
        metalness: 0.08
    });
    const darkSashMat = new THREE.MeshStandardMaterial({
        color: '#26292c',
        roughness: 0.42,
        metalness: 0.48
    });
    const windowGlassMat = new THREE.MeshStandardMaterial({
        color: '#2c3d44',
        roughness: 0.16,
        metalness: 0.72
    });
    const blindGlassMat = new THREE.MeshStandardMaterial({
        color: '#bfc4be', // Interior light venetian blinds visible behind glass in Photos 1, 2, 4
        roughness: 0.52,
        metalness: 0.15
    });

    // Procedural Clean Warm Beige/Tan TPO Flat Roof Membrane Texture with Subtle Lap Seams (no patch marks)
    const roofCan = document.createElement('canvas');
    roofCan.width = 512;
    roofCan.height = 512;
    const rCtx = roofCan.getContext('2d');
    rCtx.fillStyle = '#dad2c2';
    rCtx.fillRect(0, 0, 512, 512);
    // Subtle membrane sheet seams
    rCtx.strokeStyle = 'rgba(130, 122, 108, 0.22)';
    rCtx.lineWidth = 2;
    for (let y = 64; y < 512; y += 64) {
        rCtx.beginPath();
        rCtx.moveTo(0, y);
        rCtx.lineTo(512, y);
        rCtx.stroke();
    }
    const beigeRoofTex = new THREE.CanvasTexture(roofCan);
    beigeRoofTex.wrapS = THREE.RepeatWrapping;
    beigeRoofTex.wrapT = THREE.RepeatWrapping;
    beigeRoofTex.repeat.set(0.055, 0.055);
    beigeRoofTex.colorSpace = THREE.SRGBColorSpace;

    const roofMembraneMat = new THREE.MeshStandardMaterial({
        map: beigeRoofTex,
        roughness: 0.84,
        metalness: 0.05
    });
    const whiteRoofMembraneMat = new THREE.MeshStandardMaterial({
        color: '#ebeff4', // Bright white TPO roof membrane on 412 wing (6b05b3a1.jpg)
        roughness: 0.78,
        metalness: 0.06
    });
    const canopyRoofMat = new THREE.MeshStandardMaterial({
        color: '#4c5258', // Dark slate-gray canopy roof over 412 porch walkway (6b05b3a1.jpg)
        roughness: 0.72,
        metalness: 0.18
    });
    const skylightLensMat = new THREE.MeshStandardMaterial({
        color: '#dbeafe',
        roughness: 0.22,
        metalness: 0.25
    });
    const autumnLeafGoldMat = new THREE.MeshStandardMaterial({
        color: '#c48f36', // Golden-amber autumn foliage in top-view photos (6b05b3a1.jpg)
        roughness: 0.88,
        metalness: 0.02
    });
    const autumnLeafBronzeMat = new THREE.MeshStandardMaterial({
        color: '#9e6d28',
        roughness: 0.90,
        metalness: 0.02
    });
    const crimsonBushMat = new THREE.MeshStandardMaterial({
        color: '#b83b32', // Crimson-red autumn burning bush in front rockery (8eca3c16.jpg)
        roughness: 0.88,
        metalness: 0.02
    });
    const darkAwningMat = new THREE.MeshStandardMaterial({
        color: '#22262a',
        roughness: 0.65,
        metalness: 0.25
    });
    const cedarPostMat = new THREE.MeshStandardMaterial({
        color: '#8c5832', // Warm cedar post on 410 corner porch (Photos 3, 5, 6)
        roughness: 0.78,
        metalness: 0.04
    });
    const utilityWoodPoleMat = new THREE.MeshStandardMaterial({
        color: '#4a3628', // Dark creosote utility poles (Photos 1, 4, 7)
        roughness: 0.90,
        metalness: 0.02
    });
    const transformerGreenMat = new THREE.MeshStandardMaterial({
        color: '#354636', // Pad-mounted utility transformer green (Photos 1 & 4)
        roughness: 0.52,
        metalness: 0.35
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
        color: '#1e2226',
        roughness: 0.45,
        metalness: 0.60
    });
    const galvMetalMat = new THREE.MeshStandardMaterial({
        color: '#9da3a8',
        roughness: 0.42,
        metalness: 0.65
    });
    const cmuBlockMat = new THREE.MeshStandardMaterial({
        color: '#8a8882',
        roughness: 0.92,
        metalness: 0.02
    });
    const basaltRockMat = new THREE.MeshStandardMaterial({
        color: '#5a5955',
        roughness: 0.94,
        metalness: 0.02
    });
    const driftwoodMat = new THREE.MeshStandardMaterial({
        color: '#9c9588',
        roughness: 0.88,
        metalness: 0.02
    });
    const shrubGreenMat = new THREE.MeshStandardMaterial({
        color: '#3d5432',
        roughness: 0.88,
        metalness: 0.02
    });
    const driedStalkMat = new THREE.MeshStandardMaterial({
        color: '#b8a06a',
        roughness: 0.90,
        metalness: 0.02
    });
    const asphaltLotMat = new THREE.MeshStandardMaterial({
        color: '#4a4c4f',
        roughness: 0.92,
        metalness: 0.02,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
    });
    const yellowGuyMat = new THREE.MeshStandardMaterial({
        color: '#eab308',
        roughness: 0.5,
        metalness: 0.1
    });
    const warmLightMat = new THREE.MeshBasicMaterial({ color: '#fde68a' });

    // Helper: Add Box in local (lx, y, lz) coordinates
    const addBox = (w, h, d, mat, lx, y, lz, cast = true) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(lx, y, lz);
        m.castShadow = cast;
        m.receiveShadow = true;
        m.userData = { isSelectableBuilding: true, building };
        arch.add(m);
        return m;
    };

    // Helper: Create Sign / Banner Texture
    const createSignMat = (bgHex, borderHex, lines, w = 256, h = 128) => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        ctx.fillStyle = bgHex;
        ctx.fillRect(0, 0, w, h);
        if (borderHex) {
            ctx.strokeStyle = borderHex;
            ctx.lineWidth = 6;
            ctx.strokeRect(4, 4, w - 8, h - 8);
        }
        lines.forEach((ln) => {
            ctx.fillStyle = ln.color || '#1f2937';
            ctx.font = ln.font || 'bold 28px Arial, sans-serif';
            ctx.textAlign = ln.align || 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(ln.text, ln.x !== undefined ? ln.x : w * 0.5, ln.y);
        });
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.08 });
    };

    // Helper: Add 2-Lite Horizontal Sliding Window with White Outer Frame & Dark Bronze Sash
    const addSlidingWindow = (lx, y, lz, w, h, facing, hasBlinds = true) => {
        const g = new THREE.Group();
        g.userData.hideOnCutaway = true;
        g.position.set(lx, y, lz);
        if (facing === '+X') g.rotation.y = Math.PI * 0.5;
        else if (facing === '-X') g.rotation.y = -Math.PI * 0.5;
        else if (facing === '-Z') g.rotation.y = Math.PI;

        const paneW = (w - 0.10) * 0.5;
        const paneH = h - 0.08;
        [-paneW * 0.5 - 0.015, paneW * 0.5 + 0.015].forEach((px, idx) => {
            // Glass pane
            const gm = new THREE.Mesh(new THREE.BoxGeometry(paneW, paneH, 0.06), windowGlassMat);
            gm.position.set(px, 0, 0.045);
            g.add(gm);
            // Interior venetian blinds on upper/full pane
            if (hasBlinds) {
                const bh = idx === 0 ? paneH * 0.85 : paneH * 0.72;
                const bm = new THREE.Mesh(new THREE.BoxGeometry(paneW - 0.04, bh, 0.04), blindGlassMat);
                bm.position.set(px, (paneH - bh) * 0.5, 0.035);
                g.add(bm);
            }
        });
        // Center vertical meeting rail
        const mr = new THREE.Mesh(new THREE.BoxGeometry(0.035, paneH, 0.09), darkSashMat);
        mr.position.set(0, 0, 0.045);
        g.add(mr);

        const trimBox = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, h + 0.14, 0.06), whiteTrimMat);
        trimBox.position.set(0, 0, 0.02);
        g.add(trimBox);
        const sashBox = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), darkSashMat);
        sashBox.position.set(0, 0, 0.03);
        g.add(sashBox);

        arch.add(g);
    };

    // =========================================================================
    // 2. MAIN STRUCTURAL MASSING, FOUNDATION PLINTHS & CONTINUOUS STEPPED ROOFS
    // =========================================================================

    // Helper: Extrude a horizontal 2D roof/slab polygon in (lx, lz) at elevation y0 with thickness h
    const addExtrudedPolygon = (pts, y0, h, mat, cast = true) => {
        const shp = new THREE.Shape();
        pts.forEach(([px, pz], idx) => {
            if (idx === 0) shp.moveTo(px, -pz);
            else shp.lineTo(px, -pz);
        });
        shp.closePath();
        const geo = new THREE.ExtrudeGeometry(shp, { depth: h, bevelEnabled: false });
        geo.rotateX(-Math.PI * 0.5);
        const m = new THREE.Mesh(geo, mat);
        m.position.y = y0;
        m.castShadow = cast;
        m.receiveShadow = true;
        m.userData = { isSelectableBuilding: true, building };
        arch.add(m);
        return m;
    };

    // Helper: Add a perimeter fascia or parapet wall segment between (x0, z0) and (x1, z1)
    const addEdgeBand = (x0, z0, x1, z1, yCenter, height, thick, mat, capMat = null, capH = 0.05) => {
        const len = Math.hypot(x1 - x0, z1 - z0);
        const cx = (x0 + x1) * 0.5;
        const cz = (z0 + z1) * 0.5;
        const ang = Math.atan2(x1 - x0, z1 - z0);
        const band = new THREE.Mesh(new THREE.BoxGeometry(thick, height, len + thick), mat);
        band.position.set(cx, yCenter, cz);
        band.rotation.y = ang;
        band.castShadow = true;
        band.receiveShadow = true;
        band.userData = { isSelectableBuilding: true, building };
        arch.add(band);
        if (capMat) {
            const cap = new THREE.Mesh(new THREE.BoxGeometry(thick + 0.06, capH, len + thick + 0.06), capMat);
            cap.position.set(cx, yCenter + height * 0.5 + capH * 0.5, cz);
            cap.rotation.y = ang;
            cap.castShadow = true;
            cap.receiveShadow = true;
            arch.add(cap);
        }
    };

    // --- VOLUME 1: NE Upper Roof Wing (411 Washington, lx = +4.20m..+15.73m, lz = +1.05m..+8.60m) ---
    // Top-view photo (80e3459a.jpg) shows Volume 1's beige roof spans lx = +4.20m..+15.73m, lz = +1.05m..+8.60m
    // at y = 3.92m..4.14m with an overhanging fascia + white drip edge on its front (-Z), left (+X), and right (-X) sides.
    addBox(15.69, 3.34, 10.55, pebbleStuccoMat, 7.885, -1.33, 6.325); // Sub-grade & exposed concrete foundation plinth (up to y = 0.34m)
    addBox(8.00, 3.58, 7.55, t111SidingMat, 8.20, 2.13, 4.825);       // Upper wing core (lx = +4.20m..+12.20m, lz = +1.05m..+8.60m)
    addBox(12.16, 3.58, 3.00, t111SidingMat, 6.12, 2.13, 10.10);      // Rear wing wall body under white roof (lx = +0.04m..+12.20m, lz = +8.60m..+11.60m)
    addBox(3.55, 3.58, 5.35, t111SidingMat, 13.955, 2.13, 3.725);     // Front-left half of NE wing (Photo 1 & 4)
    addBox(3.55, 3.58, 5.22, lightT111Mat, 13.955, 2.13, 8.99);       // Rear-left half of NE wing with lighter siding (Photo 4)

    // Upper Beige TPO Roof Slab over Volume 1 (lx = +3.94m..+16.02m, lz = +0.76m..+8.60m, y = 3.92m..4.14m)
    const upperBeigeRoofPts = [
        [16.02, 8.60],
        [16.02, 0.76],
        [3.94, 0.76],
        [3.94, 8.60]
    ];
    addExtrudedPolygon(upperBeigeRoofPts, 3.92, 0.22, roofMembraneMat);
    // Overhanging olive-gray fascia + crisp white top drip edge along Left (+X), Front (-Z), and Right (-X) of Volume 1 (80e3459a.jpg)
    addEdgeBand(15.96, 8.60, 15.96, 0.76, 4.03, 0.22, 0.12, fasciaTrimMat, whiteTrimMat, 0.04);
    addEdgeBand(15.96, 0.82, 4.00, 0.82, 4.03, 0.22, 0.12, fasciaTrimMat, whiteTrimMat, 0.04);
    addEdgeBand(4.00, 0.82, 4.00, 8.60, 4.03, 0.22, 0.12, fasciaTrimMat, whiteTrimMat, 0.04);

    // Low White-Flashed Counterflashing Curb Step where the Lower Beige Roof meets Volume 1's front step wall (lx = +4.20m..+11.68m, lz = +0.52m..+1.05m, 80e3459a.jpg)
    addBox(7.48, 0.18, 0.54, whiteTrimMat, 7.94, 3.53, 0.78);

    // 2-Lite Clerestory Windows on Volume 1's right step wall facing -X above the lower roof (lx = +4.19m, lz = +2.45m & +4.25m, Photo 7 & 80e3459a.jpg)
    addSlidingWindow(4.19, 3.68, 2.45, 1.35, 0.38, '-X', false);
    addSlidingWindow(4.19, 3.68, 4.15, 1.35, 0.38, '-X', false);

    // 4 Curb-Mounted Flat White Skylights on Volume 1's Upper Beige Roof (80e3459a.jpg)
    [
        [12.55, 3.65, 2.15, 0.86],
        [9.45, 4.55, 1.55, 0.86],
        [6.15, 5.15, 1.45, 0.86],
        [10.25, 6.85, 1.25, 0.82]
    ].forEach(([sx, sz, sw, sd]) => {
        addBox(sw, 0.14, sd, whiteTrimMat, sx, 4.21, sz);
        addBox(sw - 0.14, 0.04, sd - 0.14, skylightLensMat, sx, 4.29, sz);
    });
    // Galvanized Rooftop Packaged HVAC Unit on Light-Blue/White Curb straddling the rear step at lx = +9.15m, lz = +8.35m (80e3459a.jpg)
    addBox(1.26, 0.28, 1.18, skylightLensMat, 9.15, 4.28, 8.35);
    addBox(1.18, 0.88, 1.08, galvMetalMat, 9.15, 4.86, 8.35);
    addBox(0.54, 0.32, 1.15, galvMetalMat, 9.15, 4.30, 7.35);

    // --- VOLUME 2: SE Front Wing, 410 Corner Porch, 410 Vestibule & Recessed Link Notch (Continuous Lower Beige Roof, y = 3.22m..3.44m) ---
    // Recessed dark crawlspace under-cut along the SE (lz = -14.95m) and SW (lx = +0.04m) edges (Photo 5: c4499cc4.jpg)
    addBox(11.52, 3.80, 15.88, darkMetalMat, 5.86, -1.52, -6.95);       // Recessed dark crawlspace shadow core + concrete piers
    addBox(4.20, 2.52, 16.00, pebbleStuccoMat, 9.58, -0.90, -6.95);     // Solid concrete/pebble-stucco base along sloped NE alley parking side (Photo 2)
    addBox(11.64, 2.88, 16.00, t111SidingMat, 5.86, 1.78, -6.95);       // Main front wing T1-11 wall body (lx = +0.04m..+11.68m, lz = -14.95m..+1.05m)
    addBox(4.16, 2.88, 7.55, t111SidingMat, 2.12, 1.78, 4.825);         // Recessed link bay under lower roof (lx = +0.04m..+4.20m, lz = +1.05m..+8.60m)
    addBox(3.84, 2.88, 4.15, t111SidingMat, -1.88, 1.78, 6.525);        // Recessed link wall section behind 2-tier stone planter (lx = -3.80m..+0.04m, lz = +4.45m..+8.60m)
    // Lower skirt trim board at y = 0.36m along SE and SW walls (Photo 5)
    addBox(11.68, 0.14, 0.06, fasciaTrimMat, 5.86, 0.38, -14.95);
    addBox(0.06, 0.14, 16.00, fasciaTrimMat, 0.04, 0.38, -6.95);

    // Enclosed 410 Customer Entry Vestibule Wing (lx = -1.68m..+0.04m, lz = -1.28m..+4.45m) + Signature Cedar Corner Post at (-1.62, -4.25)
    addBox(1.72, 3.20, 5.73, pebbleStuccoMat, -0.82, -1.26, 1.585);
    addBox(1.72, 2.88, 5.73, t111SidingMat, -0.82, 1.78, 1.585);
    addBox(0.14, 3.24, 0.14, cedarPostMat, -1.62, 1.62, -4.25);

    // Single Seamless Extruded Lower Beige TPO Roof Polygon (y = 3.22m..3.44m — zero internal fascia seams, 80e3459a.jpg!)
    const lowerBeigeRoofPts = [
        [12.00, 1.05],
        [12.00, -15.25],
        [-0.28, -15.25],
        [-0.28, -4.55],
        [-1.95, -4.55],
        [-1.95, 4.48],
        [0.04, 4.48],
        [0.04, 8.60],
        [4.20, 8.60],
        [4.20, 1.05]
    ];
    addExtrudedPolygon(lowerBeigeRoofPts, 3.22, 0.22, roofMembraneMat);
    // Continuous outer perimeter fascia + dark drip edge around the exposed eaves of the Lower Beige Roof
    [
        [11.94, 1.05, 11.94, -15.19],
        [11.94, -15.19, -0.22, -15.19],
        [-0.22, -15.19, -0.22, -4.49],
        [-0.22, -4.49, -1.89, -4.49],
        [-1.89, -4.49, -1.89, 4.42]
    ].forEach(([x0, z0, x1, z1]) => {
        addEdgeBand(x0, z0, x1, z1, 3.33, 0.22, 0.12, fasciaTrimMat, darkSashMat, 0.04);
    });

    // Lower Beige Roof Equipment: Dark Charcoal Carrier Condenser Unit + White Curb Skylight + Vent Pipes (80e3459a.jpg)
    // Dark Carrier condenser unit sits in the inside corner right next to Volume 1's right wall (lx = +3.35m, lz = +1.55m)
    const carrierUnit = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.84, 12), darkSashMat);
    carrierUnit.position.set(3.35, 3.86, 1.55);
    carrierUnit.castShadow = true;
    arch.add(carrierUnit);
    // White curb-mounted rectangular skylight right in front of the Carrier unit & right end of white counterflashing (lx = +3.85m, lz = -0.35m, 80e3459a.jpg)
    addBox(1.68, 0.16, 0.92, whiteTrimMat, 3.85, 3.52, -0.35);
    addBox(1.52, 0.04, 0.76, skylightLensMat, 3.85, 3.61, -0.35);
    // Plumbing vent stacks & roof drain exhaust hood on Lower Beige Roof
    addBox(0.32, 0.18, 0.32, whiteTrimMat, 4.85, 3.52, 0.15);
    [
        [5.45, -2.40],
        [4.85, -4.90],
        [6.15, -8.80]
    ].forEach(([vx, vz]) => {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.38, 8), galvMetalMat);
        pipe.position.set(vx, 3.62, vz);
        arch.add(pipe);
    });

    // --- VOLUME 4 & REAR WHITE PARAPET BAY: Continuous Bright-White TPO Roof & White-Coped Parapet (80e3459a.jpg) ---
    // Covers the rear bay of Volume 1 (lx = +0.04m..+15.73m, lz = +8.60m..+11.60m) AND the entire 412 WSU Extension Wing (lx = -20.25m..+0.04m, lz = +4.45m..+11.60m)
    addBox(20.29, 3.20, 7.15, pebbleStuccoMat, -10.105, -1.40, 8.025);
    addBox(20.29, 3.72, 7.15, t111SidingMat, -10.105, 2.06, 8.025);

    const whiteRoofPts = [
        [15.73, 8.60],
        [15.73, 11.60],
        [-20.25, 11.60],
        [-20.25, 4.45],
        [0.04, 4.45],
        [0.04, 8.60]
    ];
    addExtrudedPolygon(whiteRoofPts, 3.86, 0.18, whiteRoofMembraneMat);

    // Continuous Raised Parapet Wall & Crisp White Metal Coping around the White Roof (80e3459a.jpg)
    // 1. Rear step parapet across Volume 1 at lz = +8.60m (white-faced wall with white metal coping)
    addEdgeBand(15.73, 8.60, 0.04, 8.60, 4.18, 0.46, 0.22, whiteTrimMat, whiteTrimMat, 0.06);
    // 2. Step-forward parapet along lx = +0.04m from lz = +8.60m to +4.45m
    addEdgeBand(0.04, 8.60, 0.04, 4.45, 4.13, 0.52, 0.24, t111SidingMat, whiteTrimMat, 0.06);
    // 3. 412 Front parapet wall along lz = +4.45m from lx = +0.04m to -20.25m
    addEdgeBand(0.04, 4.52, -20.25, 4.52, 4.10, 0.48, 0.24, t111SidingMat, whiteTrimMat, 0.06);
    // 4. West end parapet at lx = -20.25m, Rear wall parapet at lz = +11.60m, and East rear parapet at lx = +15.73m
    addEdgeBand(-20.18, 4.45, -20.18, 11.60, 4.10, 0.48, 0.24, t111SidingMat, whiteTrimMat, 0.06);
    addEdgeBand(-20.25, 11.52, 15.73, 11.52, 4.13, 0.52, 0.24, t111SidingMat, whiteTrimMat, 0.06);
    addEdgeBand(15.68, 11.60, 15.68, 8.60, 4.18, 0.46, 0.24, lightT111Mat, whiteTrimMat, 0.06);

    // Full-Width 6-Post Covered Walkway Porch Canopy on 412 Wing (lx = -20.30m..-3.65m, lz = +2.15m..+4.45m, Photo 8 & Top Views)
    // Lower step-down dark slate-gray canopy roof (y = 2.68m..2.86m) below the 412 front parapet wall where the 2 wall-pack lights are mounted
    addBox(16.75, 0.16, 2.38, darkSashMat, -11.975, 2.76, 3.30).userData.hideOnCutaway = true;
    addBox(16.65, 0.05, 2.30, canopyRoofMat, -11.975, 2.86, 3.30).userData.hideOnCutaway = true;
    addBox(16.60, 0.04, 2.26, whiteTrimMat, -11.975, 2.67, 3.30).userData.hideOnCutaway = true;

    // 6 Square Porch Support Posts along lz = +2.25m with concrete base collars & yellow "RESERVED PARKING" signs (Photo 8)
    const postXs412 = [-4.05, -7.25, -10.45, -13.65, -16.85, -20.00];
    const yellowResSignMat = createSignMat('#facc15', '#1f2937', [
        { text: 'RESERVED', y: 42, font: 'bold 28px Arial' },
        { text: 'PARKING', y: 82, font: 'bold 28px Arial' }
    ], 160, 128);
    const whitePermitSignMat = createSignMat('#f8fafc', '#991b1b', [
        { text: 'WSU EXT.', y: 38, color: '#991b1b', font: 'bold 26px Arial' },
        { text: 'ONLY', y: 82, color: '#991b1b', font: 'bold 28px Arial' }
    ], 160, 128);

    postXs412.forEach((px, idx) => {
        addBox(0.11, 2.68, 0.11, fasciaTrimMat, px, 1.34, 2.25);
        addBox(0.16, 0.14, 0.16, concreteMat, px, 0.07, 2.25);
        // Yellow reserved parking signs on posts 3 & 4, white sign on post 5 (seen in Photo 8: b5a2cfd7.jpg)
        if (idx === 2 || idx === 3) {
            addBox(0.24, 0.32, 0.02, yellowResSignMat, px, 1.62, 2.18, false);
        } else if (idx === 4 || idx === 5) {
            addBox(0.24, 0.32, 0.02, whitePermitSignMat, px, 1.68, 2.18, false);
        }
    });

    // 2 Warm-Glowing Wall-Pack Lights on the upper 412 front wall above the porch canopy (lx = -7.25m & -15.25m, lz = +4.34m, Top-View Photos & Photo 8)
    [-7.25, -15.25].forEach((wlx) => {
        addBox(0.36, 0.24, 0.14, darkMetalMat, wlx, 3.38, 4.34);
        addBox(0.28, 0.14, 0.04, warmLightMat, wlx, 3.36, 4.26, false);
    });

    // =========================================================================
    // 3. FACADE DOORS, WINDOWS, SIGNAGE & UTILITY DETAILS (PHOTOS 1 – 8)
    // =========================================================================

    // --- A. NE SIDE WALL (lx = +15.73m, lz = +1.05m..+11.60m — Photo 4: 3ac62a15.jpg) ---
    addSlidingWindow(15.73, 1.65, 9.55, 1.48, 1.32, '+X', true);
    addSlidingWindow(15.73, 1.65, 7.75, 1.48, 1.32, '+X', true);
    // Low concrete window well box + rocks below the left window (lz = 9.65m, Photo 4)
    addBox(0.55, 0.42, 1.65, concreteMat, 16.00, 0.21, 9.65);
    addBox(0.52, 0.22, 0.75, basaltRockMat, 16.35, 0.11, 10.65);

    // White 6-Panel Service Door (lz = +5.65m, lx = +15.73m, Photo 4 — stoop, transformer pad & poles seated on yAlleyLot below)
    addBox(0.08, 2.18, 1.12, whiteTrimMat, 15.75, 1.25, 5.65);
    addBox(0.10, 2.08, 0.98, new THREE.MeshStandardMaterial({ color: '#f5f4ee', roughness: 0.5 }), 15.77, 1.23, 5.65);
    addBox(0.04, 0.18, 0.26, whiteTrimMat, 15.83, 1.48, 5.65, false); // Door notice sign
    addBox(0.05, 0.05, 0.08, galvMetalMat, 15.83, 1.05, 6.02, false); // Door handle

    // --- B. NE INSIDE L-CORNER ENTRANCE (411 WASHINGTON — Photo 1: 3c9928f3.jpg) ---
    // 2-Step Concrete Porch Landing (lx = +11.68m..+15.65m, lz = -2.25m..+1.05m)
    addBox(3.95, 0.34, 2.35, concreteMat, 13.66, 0.17, -0.12); // Upper porch slab (y = 0.34m)
    addBox(2.45, 0.17, 1.15, concreteMat, 13.15, 0.085, -1.78); // Lower wide step tread (y = 0.17m)

    // Projecting Flat-Roofed Corner Canopy on Square Post (lx = +11.68m..+14.55m, lz = -2.15m..+1.05m, Photo 1 & Top Views)
    addBox(2.90, 0.22, 3.22, fasciaTrimMat, 13.12, 2.98, -0.55).userData.hideOnCutaway = true;
    addBox(2.96, 0.05, 3.28, darkSashMat, 13.12, 3.10, -0.55).userData.hideOnCutaway = true;
    addBox(2.84, 0.06, 3.16, roofMembraneMat, 13.12, 3.12, -0.55).userData.hideOnCutaway = true;
    addBox(2.78, 0.04, 3.10, whiteTrimMat, 13.12, 2.86, -0.55).userData.hideOnCutaway = true;
    addBox(0.12, 2.54, 0.12, whiteTrimMat, 14.38, 1.61, -1.96); // Square corner support post

    // Tall Storefront Door + Sidelight + 2-Pane Upper Transom on South-Facing Wall (lx = +14.85m, lz = +1.05m, Photo 1)
    addBox(1.38, 2.86, 0.08, whiteTrimMat, 14.85, 1.77, 1.02).userData.hideOnCutaway = true;
    addBox(0.84, 1.98, 0.10, puttyDoorMat, 15.08, 1.33, 1.00).userData.hideOnCutaway = true; // Putty-beige solid door leaf
    addBox(0.40, 1.98, 0.10, windowGlassMat, 14.42, 1.33, 1.00).userData.hideOnCutaway = true; // Narrow dark glass sidelight
    addBox(0.82, 0.72, 0.10, blindGlassMat, 15.08, 2.74, 1.00).userData.hideOnCutaway = true; // Upper transom pane 1 with blinds
    addBox(0.40, 0.72, 0.10, blindGlassMat, 14.42, 2.74, 1.00).userData.hideOnCutaway = true; // Upper transom pane 2 with blinds

    // Square Window with Venetian Blinds next to storefront (lx = +13.48m, lz = +1.05m, Photo 1)
    addSlidingWindow(13.48, 2.02, 1.03, 1.15, 1.28, '-Z', true);

    // Twin Electric Meters & Gray Breaker Panel Box in the inside corner (lx = +12.35m, lz = +1.00m, Photo 1)
    addBox(0.68, 0.62, 0.14, galvMetalMat, 12.35, 1.12, 0.98);
    [-0.16, 0.16].forEach((mx) => {
        const meter = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.14, 14), windowGlassMat);
        meter.rotation.x = Math.PI * 0.5;
        meter.position.set(12.35 + mx, 1.62, 0.96);
        arch.add(meter);
    });

    // Recessed 411 Putty-Beige Entry Door on East-Facing Wall (lx = +11.68m, lz = -0.55m, Photo 1)
    addBox(0.08, 2.12, 1.06, whiteTrimMat, 11.70, 1.40, -0.55);
    addBox(0.10, 2.04, 0.94, puttyDoorMat, 11.72, 1.36, -0.55);
    addBox(0.12, 0.18, 0.18, darkMetalMat, 11.74, 2.38, -1.32); // Wall sconce light
    addBox(0.04, 0.12, 0.24, whiteTrimMat, 11.73, 1.72, -1.32, false); // Upper plaque
    addBox(0.04, 0.12, 0.24, whiteTrimMat, 11.73, 1.54, -1.32, false); // Lower plaque

    // --- C. NE PARKING LOT 5-WINDOW RIBBON (lx = +11.68m, lz = -14.95m..-1.80m — Photo 2: bbe4f137.jpg) ---
    // Continuous white frame band from lz = -12.15m to -2.25m containing 5 two-lite sliding windows
    addBox(0.06, 1.42, 9.95, whiteTrimMat, 11.70, 1.96, -7.20);
    [-3.20, -5.20, -7.20, -9.20, -11.20].forEach((wz) => {
        addSlidingWindow(11.71, 1.96, wz, 1.68, 1.28, '+X', true);
    });
    // Small wall-pack light near right end of NE wall (lz = -14.05m, Photo 2)
    addBox(0.14, 0.20, 0.22, darkMetalMat, 11.73, 2.52, -14.05);

    // --- D. SE FRONT WALL & ROCKERY LANDSCAPING (410 WASHINGTON, lz = -14.95m — Photo 5: c4499cc4.jpg) ---
    // Square white-trimmed picture window at lx = +3.10m, lz = -14.95m
    addBox(1.42, 1.46, 0.08, whiteTrimMat, 3.10, 2.05, -14.97);
    addBox(1.26, 1.30, 0.10, windowGlassMat, 3.10, 2.05, -14.99);
    addBox(1.22, 0.34, 0.08, blindGlassMat, 3.10, 2.52, -14.98); // Upper blind header

    // Diagonal Black "410" Dimensional Numbers on SE front wall (lx = +0.72m, lz = -14.95m, Photo 5)
    const num410FrontMat = createSignMat('#8e8f88', null, [
        { text: '4', x: 36, y: 38, color: '#1e2226', font: 'bold 54px Arial' },
        { text: '1', x: 80, y: 64, color: '#1e2226', font: 'bold 54px Arial' },
        { text: '0', x: 124, y: 92, color: '#1e2226', font: 'bold 54px Arial' }
    ], 160, 128);
    addBox(0.52, 0.42, 0.02, num410FrontMat, 0.72, 2.02, -14.97, false);

    // Gray utility meter box on SE front wall left (lx = +5.15m, lz = -14.95m, Photo 5)
    addBox(0.32, 0.48, 0.14, galvMetalMat, 5.15, 0.72, -15.02);

    // --- E. SW WALKWAY, 3 WINDOWS, ORNAMENTAL BORDER & COVERED 410 ENTRANCE (Photos 3, 5, 6, 7 & Street View ad11dfd1.jpg) ---
    // Natural street grade (relative to terrainY = 2.62m), sidewalk top, 1-foot (0.305m) retaining wall top,
    // and terrain-sloping concrete parking surfaces for both 412 (SW) and 411 (NE alley)
    const bCenter = (building && Array.isArray(building.center)) ? building.center : [-73.89, -11.51];
    const yStreetGrade = (lx, lz) => {
        const wx = bCenter[0] + lx * cosA + lz * sinA;
        const wz = bCenter[1] - lx * sinA + lz * cosA;
        if (typeof getTerrainHeightFn === 'function') {
            return getTerrainHeightFn(wx, wz) - terrainY;
        }
        return -0.52;
    };
    // Washington St sidewalk top surface at lx
    const ySwTop = (lx) => yStreetGrade(lx, -23.50) + 0.09;
    // 1-foot (0.305m) retaining wall top elevation above the Washington St sidewalk
    const yWallTop = (lx) => ySwTop(lx) + 0.305;

    // 412 SW Concrete Parking Platform surface: slopes smoothly with terrain from y = +0.01m at lz = +2.15m
    // down to the 1-foot retaining wall / gravel bed level (yWallTop(lx) - 0.025) at lz = -19.15m
    const yLotSurface = (lx, lz) => {
        const tZ = THREE.MathUtils.clamp((lz - (-19.15)) / (2.15 - (-19.15)), 0, 1);
        const yFront = yWallTop(lx) - 0.025;
        const yRear = 0.01;
        const yLin = THREE.MathUtils.lerp(yFront, yRear, tZ);
        return Math.max(yLin, yStreetGrade(lx, lz) + 0.06);
    };

    // Exact outer weld line in 411 local coords matching lz401 = 74.415m (overlaps B400ConcreteParking_LowerBay / B400ConcreteRearAlley at lz401 = 74.40m by 1.5cm)
    const zOuter411 = (lx) => 11.11 + 0.00635 * lx;

    // 411 NE Alley & Building 400 SW Foundation Concrete Platform surface (lx = +11.68m .. +64.60m, lz = -22.03m .. zOuter411(lx)):
    // Slopes both longitudinally (from y = +0.01m at the 411 rear entrance down to the Washington St sidewalk at lz = -22.03m)
    // and laterally across the alley (from Building 411's wall at lx = +11.68m/+15.73m to Building 400's concrete
    // foundation plinth and rear parking plaza at lx = +23.62m), and welds with 0.0000m step/gap along lx = 23.62m
    // into Building400ConcreteParkingGround and along zOuter411(lx) into B400ConcreteRearAlley & B400ConcreteParking_LowerBay!
    const yAlleyLot = (lx, lz) => {
        if (lx >= 23.62) {
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
        }
        const zOut = zOuter411(lx);
        const zOut23 = zOuter411(23.62);
        const tZ = THREE.MathUtils.clamp((lz - (-22.03)) / (1.05 - (-22.03)), 0, 1);
        // Left edge elevation along Building 411's NE walls (lx = 11.68m for main wing, lx = 15.73m for rear wing)
        const yLeft = lz >= 1.05 ? 0.01 : THREE.MathUtils.lerp(ySwTop(11.68), 0.01, tZ);
        // Right edge elevation along Building 400's Rear Wall & concrete foundation plinth (lx = 23.62m — 100% identical to Building400ConcreteParkingGround)
        const yFound400 =
            yStreetGrade(23.62, lz) +
            THREE.MathUtils.lerp(0.12, 0.106, THREE.MathUtils.smoothstep(lz, 6.00, zOut23));
        const zBlendFront = THREE.MathUtils.smoothstep(lz, -22.03, -19.50);
        const yRight = THREE.MathUtils.lerp(ySwTop(23.62), yFound400, zBlendFront);
        // Lateral interpolation from Building 411's wall/steps (xAnchorLeft) to Building 400's foundation/parking seam (x = 23.62m)
        const xAnchorLeft = THREE.MathUtils.lerp(11.68, 15.73, THREE.MathUtils.smoothstep(lz, 0.50, 2.50));
        const tX = THREE.MathUtils.clamp((lx - xAnchorLeft) / (23.62 - xAnchorLeft), 0, 1);
        const yCross = THREE.MathUtils.lerp(yLeft, yRight, tX);
        // Smooth full-width ramp blend across the rear alley drive lane (lx = 15.85 .. 18.55, lz = 2.50 .. zOut)
        // so the alley mouth lands flush on B400ConcreteRearAlley (+0.106m) with zero internal cliff
        const rearAlleyWeld =
            THREE.MathUtils.smoothstep(lx, 15.85, 18.55) *
            THREE.MathUtils.smoothstep(lz, 2.50, zOut);
        const yTargetRear =
            yStreetGrade(lx, lz) +
            THREE.MathUtils.lerp(0.12, 0.106, THREE.MathUtils.smoothstep(lz, 6.00, zOut));
        const yWelded = THREE.MathUtils.lerp(yCross, yTargetRear, rearAlleyWeld);
        // At lz = -22.03m, match Washington St sidewalk ySwTop(lx) across the entire alley mouth
        return THREE.MathUtils.lerp(ySwTop(lx), yWelded, zBlendFront);
    };

    // Seat the 411 service door stoop, transformer pad, and utility poles on the auto-graded alley concrete surface
    {
        const stoopY = yAlleyLot(16.15, 5.65);
        addBox(0.85, 0.16, 1.35, concreteMat, 16.15, stoopY + 0.06, 5.65); // Concrete door stoop
        const xfmrPadY = yAlleyLot(16.75, 3.15);
        addBox(1.18, 0.18, 1.45, concreteMat, 16.75, xfmrPadY + 0.08, 3.15);
        addBox(1.04, 1.02, 1.32, transformerGreenMat, 16.75, xfmrPadY + 0.67, 3.15);
        addBox(0.02, 0.08, 0.22, yellowGuyMat, 17.28, xfmrPadY + 1.08, 3.15, false); // Yellow caution decal
    }
    [10.85, 4.45].forEach((pz, pIdx) => {
        const px = pIdx === 0 ? 16.85 : 16.65;
        const pGroundY = yAlleyLot(px, pz);
        const poleH = 8.8;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, poleH, 12), utilityWoodPoleMat);
        pole.position.set(px, pGroundY + poleH * 0.5 - 0.2, pz);
        pole.castShadow = true;
        arch.add(pole);
        addBox(0.12, 0.14, 1.85, utilityWoodPoleMat, px, pGroundY + poleH - 0.65, pz);
        if (pIdx === 1) {
            const cond = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 7.8, 8), galvMetalMat);
            cond.position.set(px + 0.18, pGroundY + 3.8, pz - 0.15);
            arch.add(cond);
            const guyGuard = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 3.1, 8), yellowGuyMat);
            guyGuard.position.set(px + 0.08, pGroundY + 1.45, 2.55);
            guyGuard.rotation.x = 0.68;
            arch.add(guyGuard);
        } else {
            const transCan = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.92, 14), galvMetalMat);
            transCan.position.set(px - 0.34, pGroundY + poleH - 1.35, pz);
            arch.add(transCan);
        }
    });

    // 1. Contour-Following 410 SW Concrete Walkway (lx = -1.68m..-0.32m, lz = -20.85m..-0.20m)
    // Stays flush with yWallTop(-1.68) across the gravel bed span (lz = -20.85m .. -19.15m) so the left return wall
    // and inner gravel curb meet the walkway cheek curb seamlessly with zero height step (Top-Left Circle in 003ff193.png),
    // then slopes smoothly up from lz = -19.15m to y = +0.16m at lz = -0.20m.
    const walkZRear = -0.20;
    const walkZFront = -20.85;
    const walkSegs = 16;
    const yWalkBase = yWallTop(-1.68);
    const yWalk410 = (lz) => {
        if (lz <= -19.15) return yWalkBase;
        const t = THREE.MathUtils.clamp((lz - (-19.15)) / (walkZRear - (-19.15)), 0, 1);
        const yLin = THREE.MathUtils.lerp(yWalkBase, 0.16, t);
        return Math.max(yLin, yLotSurface(-1.68, lz) + 0.02);
    };

    // 410 Front Rockery / Soil Bed Surface (lx = -0.32m .. +11.68m, lz = -22.03m .. -14.95m):
    // Directly follows the natural terrain contour (yStreetGrade(rx, rz) + 0.04) while meeting the
    // Washington St sidewalk flush at rz = -22.03m, the 411 alley parking lot flush at rx = +11.68m,
    // and staying at or slightly below the 410 concrete walkway along rx = -0.32m.
    const yRockerySurface = (rx, rz) => {
        const zFrac = THREE.MathUtils.clamp((rz - (-22.03)) / (-14.95 - (-22.03)), 0, 1);
        const xFrac = THREE.MathUtils.clamp((rx - (-0.32)) / (11.68 - (-0.32)), 0, 1);
        const ySw = ySwTop(rx);
        const yTerr = yStreetGrade(rx, rz) + 0.04;
        // Blend smoothly from exact sidewalk elevation at rz = -22.03m into the natural terrain contour
        const frontBlend = THREE.MathUtils.smoothstep(zFrac, 0.0, 0.22);
        let ySoil = THREE.MathUtils.lerp(ySw, yTerr, frontBlend);
        // Blend right edge (rx -> +11.68m) smoothly into the 411 concrete alley parking lot surface
        const rightBlend = THREE.MathUtils.smoothstep(xFrac, 0.82, 1.0);
        ySoil = THREE.MathUtils.lerp(ySoil, yAlleyLot(11.68, rz), rightBlend);
        // Near the left edge (rx -> -0.32m), keep soil tucked neatly at or below the 410 walkway / steps
        const leftBlend = 1.0 - THREE.MathUtils.smoothstep(xFrac, 0.0, 0.18);
        const yLeftCap = rz <= -20.85 ? ySwTop(-0.32) + 0.08 : yWalk410(rz) - 0.02;
        if (leftBlend > 0 && ySoil > yLeftCap) {
            ySoil = THREE.MathUtils.lerp(ySoil, yLeftCap, leftBlend);
        }
        return ySoil;
    };

    // Landscaped Rockery Bed in front of SE wall left clear of pre-made shrubs for user planting via TreePlanterFoundry
    // Angular Basalt Boulders seated on the contoured soil surface (Photo 5)
    [
        [3.15, 0.16, -15.95, 0.65, 0.45, 0.55],
        [2.15, 0.13, -16.15, 0.48, 0.35, 0.45],
        [0.45, 0.12, -17.05, 0.42, 0.30, 0.40]
    ].forEach(([bx, byOff, bz, sx, sy, sz]) => {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), basaltRockMat);
        rock.scale.set(sx, sy, sz);
        rock.rotation.set(bx, byOff, bz);
        rock.position.set(bx, yRockerySurface(bx, bz) + byOff, bz);
        rock.castShadow = true;
        arch.add(rock);
    });
    // Signature Gnarled Driftwood / Sculptural Deadwood Stump at lx = +1.42m, lz = -15.95m seated on contoured soil (Photo 5!)
    const stumpBaseY = yRockerySurface(1.42, -15.95);
    const stumpTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.18, 1.25, 7), driftwoodMat);
    stumpTrunk.position.set(1.42, stumpBaseY + 0.56, -15.95);
    stumpTrunk.rotation.z = -0.18;
    stumpTrunk.castShadow = true;
    arch.add(stumpTrunk);
    const stumpBranch1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.10, 0.72, 6), driftwoodMat);
    stumpBranch1.position.set(1.52, stumpBaseY + 1.09, -15.92);
    stumpBranch1.rotation.z = 0.52;
    arch.add(stumpBranch1);
    const stumpBranch2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.55, 6), driftwoodMat);
    stumpBranch2.position.set(1.34, stumpBaseY + 0.86, -15.98);
    stumpBranch2.rotation.z = -0.65;
    arch.add(stumpBranch2);
    for (let w = 0; w < walkSegs; w++) {
        const z0 = walkZFront + ((walkZRear - walkZFront) * w) / walkSegs;
        const z1 = walkZFront + ((walkZRear - walkZFront) * (w + 1)) / walkSegs;
        const zm = 0.5 * (z0 + z1);
        const segL = (z1 - z0) + 0.025;
        const y0 = yWalk410(z0);
        const y1 = yWalk410(z1);
        const ym = 0.5 * (y0 + y1);
        const yBot = Math.min(yStreetGrade(-1.00, zm) - 0.24, ym - 0.38);
        const segH = Math.max(0.26, ym - yBot);
        const pitch = Math.atan2(y1 - y0, z1 - z0);

        const wBox = addBox(1.36, segH, segL, concreteMat, -1.00, yBot + segH * 0.5, zm);
        wBox.rotation.x = -pitch;

        // Right concrete cheek curb along the parking platform (lx = -1.75m, flush with yWalk410)
        const cBox = addBox(0.18, segH, segL, concreteMat, -1.75, yBot + segH * 0.5, zm);
        cBox.rotation.x = -pitch;
    }

    // 2. Two Contour-Following Concrete Steps (lz = -20.85m .. -22.03m) stepping down the 1-foot (0.305m) rise
    // directly onto the Washington St sidewalk (ySwTop(-1.00)) at lz = -22.03m (matching Street View ad11dfd1.jpg!)
    const ySwWalkConnect = ySwTop(-1.00);
    const step1Top = ySwWalkConnect + 0.205; // Step 1 (lz = -20.85m .. -21.44m)
    const step2Top = ySwWalkConnect + 0.102; // Step 2 (lz = -21.44m .. -22.03m)
    const stepBot = ySwWalkConnect - 0.22;
    addBox(1.36, step1Top - stepBot, 0.61, concreteMat, -1.00, 0.5 * (step1Top + stepBot), -21.145);
    addBox(1.36, step2Top - stepBot, 0.61, concreteMat, -1.00, 0.5 * (step2Top + stepBot), -21.735);
    // Right concrete cheek curb flanking the 2 steps at the left end of the 1-foot retaining wall (flush with yWalkBase)
    addBox(0.18, yWalkBase - stepBot, 1.22, concreteMat, -1.75, 0.5 * (yWalkBase + stepBot), -21.44);

    // Black Tubular Pipe Handrail on left of the 2 front steps at the Washington St sidewalk (lx = -0.42m, ad11dfd1.jpg)
    const railZRear = -20.70;
    const railZFront = -21.85;
    const railYBaseRear = yWallTop(-1.00);
    const railYBaseFront = step2Top;
    const railPostH = 0.86;
    addBox(0.04, railPostH, 0.04, darkMetalMat, -0.42, railYBaseRear + railPostH * 0.5, railZRear);
    addBox(0.04, railPostH, 0.04, darkMetalMat, -0.42, railYBaseFront + railPostH * 0.5, railZFront);
    const railTopRear = railYBaseRear + railPostH;
    const railTopFront = railYBaseFront + railPostH;
    const railSpan = Math.hypot(railZRear - railZFront, railTopRear - railTopFront) + 0.08;
    const frontStepRail = addBox(
        0.04,
        0.04,
        railSpan,
        darkMetalMat,
        -0.42,
        0.5 * (railTopRear + railTopFront),
        0.5 * (railZRear + railZFront)
    );
    frontStepRail.rotation.x = Math.atan2(railTopRear - railTopFront, railZRear - railZFront);

    // Narrow planting strip along the 410 SW wall left clear of pre-made plants for user planting via TreePlanterFoundry

    // 3 Horizontal 2-Lite Sliding Windows on the SW Wall (lx = +0.04m, lz = -12.35m, -9.65m, -7.15m, Photo 3)
    addSlidingWindow(0.03, 1.98, -12.35, 2.05, 1.26, '-X', true);
    addSlidingWindow(0.03, 1.98, -9.65, 1.95, 1.26, '-X', true);
    addSlidingWindow(0.03, 1.98, -7.15, 1.75, 1.26, '-X', true);

    // Red-and-White "RESERVED PARKING" Signs between the SW windows (Photo 3)
    const redWhiteSignMat = createSignMat('#ffffff', '#b91c1c', [
        { text: 'RESERVED', y: 38, color: '#b91c1c', font: 'bold 26px Arial' },
        { text: 'PARKING', y: 82, color: '#b91c1c', font: 'bold 26px Arial' }
    ], 160, 128);
    [-13.65, -8.35].forEach((sz) => {
        addBox(0.02, 0.34, 0.26, redWhiteSignMat, 0.01, 1.65, sz, false);
    });

    // Square Window inside the Covered 410 Corner Porch facing SE (-lz) at lx = -0.82m, lz = -1.29m (Photos 3 & 6)
    addSlidingWindow(-0.82, 1.82, -1.29, 0.96, 1.18, '-Z', false);

    // 410 Customer Entrance on West-Facing Wall of Vestibule (lx = -1.68m, lz = -1.28m..+4.45m — Photo 7: 542f57f8.jpg)
    // Putty-tan entry door at lz = +1.45m
    addBox(0.08, 2.12, 1.04, whiteTrimMat, -1.69, 1.40, 1.45);
    addBox(0.10, 2.04, 0.92, puttyDoorMat, -1.71, 1.36, 1.45);
    // Sloped Black Awning Hood above 410 Entry Door (lx = -2.35m..-1.68m, lz = +0.75m..+2.15m, Photo 7)
    const awningSlope = addBox(0.76, 0.06, 1.44, darkAwningMat, -2.02, 2.62, 1.45);
    awningSlope.userData.hideOnCutaway = true;
    awningSlope.rotation.z = 0.38;
    // Black iron triangular side brackets under awning
    [0.78, 2.12].forEach((az) => {
        addBox(0.68, 0.03, 0.03, darkMetalMat, -2.02, 2.46, az).userData.hideOnCutaway = true;
    });

    // Large Square Storefront Window with "OPEN" sign to the right of the 410 door (lx = -1.68m, lz = +2.98m, Photo 7)
    addBox(0.08, 1.62, 1.46, whiteTrimMat, -1.69, 1.68, 2.98).userData.hideOnCutaway = true;
    addBox(0.10, 1.48, 1.32, windowGlassMat, -1.71, 1.68, 2.98).userData.hideOnCutaway = true;
    const openSignMat = createSignMat('#1e3a8a', '#93c5fd', [
        { text: 'OPEN', y: 64, color: '#ffffff', font: 'bold 42px Arial' }
    ], 160, 96);
    addBox(0.02, 0.18, 0.32, openSignMat, -1.72, 1.68, 2.48, false).userData.hideOnCutaway = true;

    // Vertical "410" Numbers, Customer Parking Plaque, Yellow Notice, Blue ADA Sign & Dark Mailbox left of door (lz = -0.85m..+0.75m, Photo 7)
    const vert410Mat = createSignMat('#8e8f88', null, [
        { text: '4', y: 28, color: '#1e2226', font: 'bold 44px Arial' },
        { text: '1', y: 64, color: '#1e2226', font: 'bold 44px Arial' },
        { text: '0', y: 100, color: '#1e2226', font: 'bold 44px Arial' }
    ], 96, 128);
    addBox(0.02, 0.48, 0.24, vert410Mat, -1.70, 2.08, -0.78, false);
    addBox(0.02, 0.42, 0.32, whiteTrimMat, -1.70, 2.12, -0.35, false); // White customer parking sign
    addBox(0.03, 0.26, 0.30, darkMetalMat, -1.70, 1.72, -0.35, false); // Black oval-topped directory plaque
    addBox(0.02, 0.32, 0.22, yellowResSignMat, -1.70, 1.92, 0.08, false); // Yellow notice sign
    addBox(0.02, 0.28, 0.20, openSignMat, -1.70, 1.82, 0.42, false);      // Blue ADA parking sign
    addBox(0.12, 0.32, 0.26, darkMetalMat, -1.74, 1.38, 0.42);            // Dark wall mailbox

    // 2 Concrete Steps at 410 Porch (lx = -1.68m..-0.32m, lz = -0.95m..+1.95m) + Curved Concrete Planter with 3-Post Black Guardrail (Photos 3, 6, 7)
    addBox(1.36, 0.34, 2.95, concreteMat, -2.15, 0.17, 1.65); // Upper landing in front of 410 door
    addBox(1.36, 0.22, 0.38, concreteMat, -2.15, 0.11, 0.02); // Step 1 stepping down toward -lz

    // Curved-End Concrete Curb Planter & 3-Post Black Pipe Guardrail (lx = -4.65m..-1.68m, lz = -0.35m..+0.95m, Photos 3, 6, 7)
    addBox(2.95, 0.28, 0.14, concreteMat, -3.15, 0.14, -0.35);
    addBox(2.95, 0.28, 0.14, concreteMat, -3.15, 0.14, 0.85);
    addBox(0.14, 0.28, 1.34, concreteMat, -4.58, 0.14, 0.25);
    // 3 Black Vertical Guardrail Posts + Top Horizontal Bar along the planter (Photos 3, 6, 7)
    [-1.85, -3.15, -4.45].forEach((gx) => {
        addBox(0.045, 0.92, 0.045, darkMetalMat, gx, 0.60, 0.78);
    });
    addBox(2.68, 0.045, 0.045, darkMetalMat, -3.15, 1.04, 0.78);
    addBox(0.045, 0.045, 1.12, darkMetalMat, -1.85, 0.92, 0.22); // Side return rail into step

    // --- F. RECESSED LINK WALL WITH WINDOW + AC UNIT & 2-TIER STONE PLANTER (lz = +4.45m, lx = -3.80m..-1.68m — Photo 7) ---
    // White-framed 2-lite window with upper wall AC unit (lx = -2.65m, lz = +4.45m)
    addBox(1.24, 0.68, 0.08, whiteTrimMat, -2.65, 1.56, 4.41);
    addBox(1.08, 0.52, 0.10, windowGlassMat, -2.65, 1.56, 4.39);
    addBox(0.88, 0.56, 0.12, whiteTrimMat, -2.65, 2.14, 4.40);
    addBox(0.72, 0.44, 0.28, darkSashMat, -2.65, 2.14, 4.32); // Wall AC unit grille

    // 2-Tier Split-Face Gray Stone Block Planter Bed in front of the link wall (lx = -3.85m..-1.55m, lz = +3.25m..+4.45m, Photo 7)
    addBox(2.35, 0.28, 1.18, cmuBlockMat, -2.70, 0.14, 3.85); // Tier 1 stone block base
    addBox(1.65, 0.26, 0.82, cmuBlockMat, -2.85, 0.41, 4.02); // Tier 2 raised stone block tier (left clear for user-planted bushes)

    // --- G. 412 WASHINGTON FRONT FACADE — WSU CHELAN COUNTY EXTENSION (lz = +4.45m, lx = -20.25m..-3.80m — Photo 8: b5a2cfd7.jpg) ---
    // Continuous concrete walkway under the 6-post porch canopy (lx = -20.25m..-3.65m, lz = +2.15m..+4.45m)
    addBox(16.65, 0.18, 2.32, concreteMat, -11.975, 0.04, 3.30);

    // 1. East White Entry Door with Arched Fanlight Lite (lx = -4.65m, lz = +4.45m, Photo 8)
    addBox(1.06, 2.12, 0.08, whiteTrimMat, -4.65, 1.18, 4.41);
    addBox(0.94, 2.02, 0.10, new THREE.MeshStandardMaterial({ color: '#f3f2ec', roughness: 0.5 }), -4.65, 1.14, 4.39);
    const fan1 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 16, 1, false, 0, Math.PI), windowGlassMat);
    fan1.rotation.x = Math.PI * 0.5;
    fan1.position.set(-4.65, 1.72, 4.38);
    arch.add(fan1);

    // 2. Four Square Dark-Tinted Windows with White Frames along the 412 facade (Photo 8)
    [-6.15, -10.35, -13.65, -17.05].forEach((wx, wIdx) => {
        const winW = wIdx === 3 ? 1.48 : 1.18;
        addSlidingWindow(wx, 1.56, 4.41, winW, 1.18, '-Z', true);
    });

    // 3. Black "412" Numbers + "WSU Washington State University — Chelan County Extension / 412 Washington" Banner (lx = -8.25m, lz = +4.45m, Photo 8)
    const num412Mat = createSignMat('#8e8f88', null, [
        { text: '4', x: 32, y: 42, color: '#1e2226', font: 'bold 52px Arial' },
        { text: '1', x: 74, y: 64, color: '#1e2226', font: 'bold 52px Arial' },
        { text: '2', x: 118, y: 82, color: '#1e2226', font: 'bold 52px Arial' }
    ], 150, 120);
    addBox(0.46, 0.36, 0.02, num412Mat, -7.05, 1.82, 4.40, false);

    const wsuSignMat = createSignMat('#f8fafc', '#334155', [
        { text: 'WASHINGTON STATE UNIVERSITY', x: 280, y: 34, color: '#991b1b', font: 'bold 20px Arial' },
        { text: 'Chelan County Extension', x: 280, y: 66, color: '#1e293b', font: 'bold 26px Georgia, serif' },
        { text: '412 Washington', x: 256, y: 106, color: '#f8fafc', font: 'bold 22px Arial' }
    ], 512, 128);
    addBox(1.85, 0.44, 0.03, wsuSignMat, -8.35, 1.58, 4.39, false);
    addBox(1.85, 0.14, 0.035, darkMetalMat, -8.35, 1.24, 4.39, false); // Dark bottom bar with "412 Washington"

    // 4. West White Entry Door (412) with Arched Fanlight Lite & Twin Narrow Sidelights (lx = -19.10m, lz = +4.45m, Photo 8)
    addBox(1.76, 2.16, 0.08, whiteTrimMat, -19.10, 1.20, 4.41);
    addBox(0.96, 2.04, 0.10, new THREE.MeshStandardMaterial({ color: '#f3f2ec', roughness: 0.5 }), -19.10, 1.16, 4.39);
    const fan2 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 16, 1, false, 0, Math.PI), windowGlassMat);
    fan2.rotation.x = Math.PI * 0.5;
    fan2.position.set(-19.10, 1.74, 4.38);
    arch.add(fan2);
    // Left & right narrow dark-tinted sidelights flanking the West 412 door (Photo 8)
    [-18.42, -19.78].forEach((slx) => {
        addBox(0.26, 1.22, 0.10, windowGlassMat, slx, 1.56, 4.39);
    });
    // Concrete step platform at West 412 entry door (Photo 8)
    addBox(1.95, 0.20, 1.25, concreteMat, -19.10, 0.06, 2.65);

    // =========================================================================
    // 4. CONCRETE PARKING WHEEL STOPS (BUMPERS) & STRIPING ON TERRAIN-SLOPED LOTS (PHOTOS 3, 6, 7, 8)
    // =========================================================================
    // Helper: local pitch (around X) and roll (around Z) of a surface fn(lx, lz)
    const getSurfaceAngles = (fn, lx, lz) => {
        const dz = fn(lx, lz + 0.5) - fn(lx, lz - 0.5);
        const dx = fn(lx + 0.5, lz) - fn(lx - 0.5, lz);
        return { pitchX: -Math.atan2(dz, 1.0), rollZ: Math.atan2(dx, 1.0) };
    };

    // Helper: builds a smooth terrain-conforming quad mesh with guaranteed +Y upward normal & world-locked 0.24 UVs
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
        // Check 2D cross product in (X, Z): in Three.js, (+Z) x (+X) = +Y
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
        m.userData = { isSelectableBuilding: true, building };
        arch.add(m);
        return m;
    };

    // Concrete wheel stops along the SW walkway of 410 (lx = -2.25m, lz = -12.80m..-3.80m, Photos 3 & 6)
    [-12.20, -9.15, -6.10].forEach((bz) => {
        const { pitchX, rollZ } = getSurfaceAngles(yLotSurface, -2.25, bz);
        const ws = addBox(0.22, 0.14, 1.82, concreteMat, -2.25, yLotSurface(-2.25, bz) + 0.065, bz);
        ws.rotation.x = pitchX;
        ws.rotation.z = rollZ;
    });
    // White parking stall lines extending into the SW parking lot from the 410 wheel stops (Photos 3 & 6)
    [-13.70, -10.68, -7.62, -4.55].forEach((sz) => {
        const { pitchX, rollZ } = getSurfaceAngles(yLotSurface, -4.95, sz);
        const sLine = addBox(4.80, 0.02, 0.10, whiteTrimMat, -4.95, yLotSurface(-4.95, sz) + 0.01, sz, false);
        sLine.rotation.x = pitchX;
        sLine.rotation.z = rollZ;
    });

    // Concrete wheel stops & white stall lines in front of the 412 WSU Extension porch (lz = +1.75m, lx = -20.0m..-6.0m, Photo 8)
    [-6.65, -9.85, -13.05, -16.25, -19.45].forEach((bx) => {
        const { pitchX, rollZ } = getSurfaceAngles(yLotSurface, bx, 1.75);
        const ws = addBox(1.82, 0.14, 0.22, concreteMat, bx, yLotSurface(bx, 1.75) + 0.065, 1.75);
        ws.rotation.x = pitchX;
        ws.rotation.z = rollZ;
    });
    [-8.25, -11.45, -14.65, -17.85].forEach((sx) => {
        const { pitchX, rollZ } = getSurfaceAngles(yLotSurface, sx, -0.80);
        const sLine = addBox(0.10, 0.02, 4.60, whiteTrimMat, sx, yLotSurface(sx, -0.80) + 0.01, -0.80, false);
        sLine.rotation.x = pitchX;
        sLine.rotation.z = rollZ;
    });

    // Diagonal white ADA crosswalk/access striping between 410 and 412 (lx = -3.8m..-1.8m, lz = -3.5m..+1.8m, Photos 6 & 7)
    for (let az = -3.20; az <= 1.40; az += 0.55) {
        const { pitchX, rollZ } = getSurfaceAngles(yLotSurface, -2.85, az);
        const aBar = addBox(1.65, 0.02, 0.10, whiteTrimMat, -2.85, yLotSurface(-2.85, az) + 0.01, az, false);
        aBar.rotation.x = pitchX;
        aBar.rotation.z = rollZ;
    }

    // 1.5m Concrete Pedestrian Walkway before the 5 Angled Yellow Parking Stall Markings along the NE 5-Window Ribbon Wall (lx = +11.68m..+13.18m, lz = -22.03m..-2.25m)
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
    const neWalkX0 = 11.68;
    const neWalkX1 = 13.18; // 1.50m walkway width before the parking stall markings
    const neWalkZ0 = -22.03;
    const neWalkZ1 = -2.25;
    const neWalkSegs = 14;
    for (let iz = 0; iz < neWalkSegs; iz++) {
        const z0 = neWalkZ0 + ((neWalkZ1 - neWalkZ0) * iz) / neWalkSegs;
        const z1 = neWalkZ0 + ((neWalkZ1 - neWalkZ0) * (iz + 1)) / neWalkSegs;
        addGradedQuad(
            [neWalkX0, yAlleyLot(neWalkX0, z0), z0],
            [neWalkX1, yAlleyLot(neWalkX1, z0), z0],
            [neWalkX1, yAlleyLot(neWalkX1, z1), z1],
            [neWalkX0, yAlleyLot(neWalkX0, z1), z1],
            swConcreteMat,
            0.008
        );
        // Transverse expansion score joint every ~1.41m across the 1.5m walkway
        if (iz > 0) {
            addGradedQuad(
                [neWalkX0 + 0.04, yAlleyLot(neWalkX0 + 0.04, z0 - 0.014), z0 - 0.014],
                [neWalkX1 - 0.04, yAlleyLot(neWalkX1 - 0.04, z0 - 0.014), z0 - 0.014],
                [neWalkX1 - 0.04, yAlleyLot(neWalkX1 - 0.04, z0 + 0.014), z0 + 0.014],
                [neWalkX0 + 0.04, yAlleyLot(neWalkX0 + 0.04, z0 + 0.014), z0 + 0.014],
                swJointMat,
                0.014
            );
        }
    }
    // Longitudinal score joint border separating the 1.5m concrete walkway from the angled parking stalls (lx = +13.18m)
    for (let iz = 0; iz < neWalkSegs; iz++) {
        const z0 = neWalkZ0 + ((neWalkZ1 - neWalkZ0) * iz) / neWalkSegs;
        const z1 = neWalkZ0 + ((neWalkZ1 - neWalkZ0) * (iz + 1)) / neWalkSegs;
        addGradedQuad(
            [neWalkX1 - 0.02, yAlleyLot(neWalkX1 - 0.02, z0), z0],
            [neWalkX1 + 0.02, yAlleyLot(neWalkX1 + 0.02, z0), z0],
            [neWalkX1 + 0.02, yAlleyLot(neWalkX1 + 0.02, z1), z1],
            [neWalkX1 - 0.02, yAlleyLot(neWalkX1 - 0.02, z1), z1],
            swJointMat,
            0.014
        );
    }

    // 5 Angled Yellow Parking Stall Lines + Concrete Wheel Stops outside the 1.5m Walkway on the 2D-Sloped Alley Concrete Lot (lx = +13.20m..+17.30m, lz = -13.60m..-2.80m)
    const stallCos = Math.cos(0.36);
    const stallSin = Math.sin(0.36);
    const stallNormalAngle = 0.36 + Math.PI * 0.5;
    [-3.60, -6.10, -8.60, -11.10, -13.60].forEach((yz, sIdx) => {
        const cx = 15.25;
        const hd = 0.05;
        for (let s = 0; s < 3; s++) {
            const u0 = -2.20 + (4.40 * s) / 3;
            const u1 = -2.20 + (4.40 * (s + 1)) / 3;
            const p0x = cx + u0 * stallCos - hd * stallSin, p0z = yz - u0 * stallSin - hd * stallCos;
            const p1x = cx + u1 * stallCos - hd * stallSin, p1z = yz - u1 * stallSin - hd * stallCos;
            const p2x = cx + u1 * stallCos + hd * stallSin, p2z = yz - u1 * stallSin + hd * stallCos;
            const p3x = cx + u0 * stallCos + hd * stallSin, p3z = yz - u0 * stallSin + hd * stallCos;
            addGradedQuad(
                [p0x, yAlleyLot(p0x, p0z), p0z],
                [p1x, yAlleyLot(p1x, p1z), p1z],
                [p2x, yAlleyLot(p2x, p2z), p2z],
                [p3x, yAlleyLot(p3x, p3z), p3z],
                yellowGuyMat,
                0.015
            );
        }
        // Concrete wheel stop bumper at the front of each angled stall, protecting the 1.5m pedestrian walkway
        if (sIdx < 4) {
            const wsZ = yz - 1.25 + 1.85 * stallSin;
            const wsX = cx - 1.85 * stallCos;
            const { pitchX, rollZ } = getSurfaceAngles(yAlleyLot, wsX, wsZ);
            const ws = addBox(1.65, 0.13, 0.20, concreteMat, wsX, yAlleyLot(wsX, wsZ) + 0.065, wsZ);
            ws.rotation.y = stallNormalAngle;
            ws.rotation.x = pitchX;
            ws.rotation.z = rollZ;
        }
    });

    // Yellow Diagonal Crosshatched Access Aisle at Front-Right Entrance (Top-View Photo 6b05b3a1.jpg)
    [-2.35, -4.65].forEach((ax) => {
        const { pitchX, rollZ } = getSurfaceAngles(yLotSurface, ax, -16.10);
        const aLine = addBox(0.12, 0.02, 4.40, yellowGuyMat, ax, yLotSurface(ax, -16.10) + 0.012, -16.10, false);
        aLine.rotation.x = pitchX;
        aLine.rotation.z = rollZ;
    });
    for (let yz = -17.90; yz <= -14.10; yz += 0.65) {
        const { pitchX } = getSurfaceAngles(yLotSurface, -3.50, yz);
        const hBar = addBox(2.45, 0.02, 0.10, yellowGuyMat, -3.50, yLotSurface(-3.50, yz) + 0.012, yz, false);
        hBar.rotation.y = -0.35;
        hBar.rotation.x = pitchX;
    }
    // Front rockery left clear of pre-made crimson bush for user planting via TreePlanterFoundry

    // =========================================================================
    // 5. 1-FOOT (0.305m) SPLIT-FACE CMU RETAINING WALL, RAISED GRAVEL BED,
    //    TERRAIN-SLOPING CONCRETE PARKING PLATFORMS (412 & 411 ALLEY) & SIDEWALKS
    //    (Street View Photos: ad11dfd1.jpg, fb087fd1.jpg, 822548ba.jpg, 2f9581e2.jpg, 8d2bbc2e.jpg)
    // =========================================================================
    // Exact alignment with Building 400's Washington St sidewalk (Building400GroundsAndSidewalks.js):
    //   - Inner sidewalk edge / front face of 1-ft CMU retaining wall: lz = -22.03m
    //   - Outer street curb edge along Washington St:                  lz = -24.98m (2.95m wide)
    //   - Seamless junction with Building 400's SW sidewalk end:       lx = +19.85m

    // Procedural split-face grey CMU block texture & bump map (ad11dfd1.jpg)
    let splitFaceCmuMat = cmuBlockMat;
    if (typeof document !== 'undefined') {
        const cCanvas = document.createElement('canvas');
        cCanvas.width = 512;
        cCanvas.height = 128;
        const cctx = cCanvas.getContext('2d');
        const bCanvas = document.createElement('canvas');
        bCanvas.width = 512;
        bCanvas.height = 128;
        const bctx = bCanvas.getContext('2d');

        cctx.fillStyle = '#585c60';
        cctx.fillRect(0, 0, 512, 128);
        bctx.fillStyle = '#181818';
        bctx.fillRect(0, 0, 512, 128);

        const rows = 4;
        const cols = 8;
        const rowH = 128 / rows;
        const colW = 512 / cols;
        for (let r = 0; r < rows; r++) {
            const offset = (r % 2) * (colW * 0.5);
            for (let c = -1; c <= cols; c++) {
                const bx = c * colW + offset;
                const by = r * rowH;
                const shade = 132 + (((r * 17 + c * 31) & 7) - 3) * 5;
                cctx.fillStyle = `rgb(${shade}, ${shade - 1}, ${shade - 4})`;
                cctx.fillRect(bx + 2, by + 2, colW - 4, rowH - 4);
                bctx.fillStyle = '#d8d8d8';
                bctx.fillRect(bx + 2, by + 2, colW - 4, rowH - 4);
                for (let s = 0; s < 16; s++) {
                    const sx = bx + 4 + ((r * 23 + c * 41 + s * 19) % (colW - 8));
                    const sy = by + 4 + ((r * 29 + c * 13 + s * 37) % (rowH - 8));
                    cctx.fillStyle = (s % 2 === 0) ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.13)';
                    cctx.fillRect(sx, sy, 4, 3);
                }
            }
        }
        const cTex = new THREE.CanvasTexture(cCanvas);
        cTex.wrapS = THREE.RepeatWrapping;
        cTex.wrapT = THREE.ClampToEdgeWrapping;
        cTex.repeat.set(1.25, 1);
        const bTex = new THREE.CanvasTexture(bCanvas);
        bTex.wrapS = THREE.RepeatWrapping;
        bTex.wrapT = THREE.ClampToEdgeWrapping;
        bTex.repeat.set(1.25, 1);
        splitFaceCmuMat = new THREE.MeshStandardMaterial({
            map: cTex,
            bumpMap: bTex,
            bumpScale: 0.035,
            roughness: 0.90,
            metalness: 0.04
        });
    }

    const capStoneMat = new THREE.MeshStandardMaterial({ color: '#f2eee6', roughness: 0.75, metalness: 0.04, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const riverGravelMat = new THREE.MeshStandardMaterial({ color: '#78736a', roughness: 0.95, metalness: 0.02 });
    const mulchBedMat = new THREE.MeshStandardMaterial({ color: '#6b4f35', roughness: 0.95, metalness: 0.02 });
    const curbYellowMat = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.62, metalness: 0.05 });
    const poleSilverMat = new THREE.MeshStandardMaterial({ color: '#b8c0c8', roughness: 0.38, metalness: 0.72 });

    // Helper: builds a variable-bottom retaining wall segment from yBot(lx,lz) up to yTopFn(mx,mz) or scalar yTop
    const addGradedWallSegment = (x0, z0, x1, z1, thick, yTopOrFn, wallMat, capH = 0.045) => {
        const dx = x1 - x0;
        const dz = z1 - z0;
        const len = Math.hypot(dx, dz);
        const steps = Math.max(1, Math.ceil(len / 1.40));
        const angle = Math.atan2(dz, dx);
        const evalTop = (px, pz) => (typeof yTopOrFn === 'function' ? yTopOrFn(px, pz) : yTopOrFn);
        for (let i = 0; i < steps; i++) {
            const t0 = i / steps;
            const t1 = (i + 1) / steps;
            const tm = 0.5 * (t0 + t1);
            const xA = x0 + dx * t0, zA = z0 + dz * t0;
            const xB = x0 + dx * t1, zB = z0 + dz * t1;
            const mx = x0 + dx * tm, mz = z0 + dz * tm;
            const segLen = (len / steps) + 0.02;
            const topA = evalTop(xA, zA);
            const topB = evalTop(xB, zB);
            const yTop = 0.5 * (topA + topB);
            const yBot = Math.min(ySwTop(mx) - 0.16, yStreetGrade(mx, mz) - 0.16, yTop - 0.36);
            const bodyTop = yTop - capH;
            const bodyH = Math.max(0.20, bodyTop - yBot);
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

            if (capH > 0) {
                const cap = new THREE.Mesh(new THREE.BoxGeometry(segLen + 0.02, capH, thick + 0.04), capStoneMat);
                cap.position.set(0, bodyTop + capH * 0.5, 0);
                cap.rotation.z = slopeAlong;
                cap.castShadow = true;
                cap.receiveShadow = true;
                segGroup.add(cap);
            }
            arch.add(segGroup);
        }
    };

    // --- 5A. 1-Foot (0.305m) Split-Face CMU Retaining Wall & Seamless Rounded River-Gravel Bed for 412 Parking Platform ---
    // Exposed height is strictly 1 foot (0.305m) above the Washington St sidewalk contour: yWallTop(lx) = ySwTop(lx) + 0.305
    const wallLeftX = -1.68;
    const wallRightX = -15.90;
    const wallFrontZ = -21.92;
    const wallBackZ = -19.15;
    const nosePivotZ = 0.5 * (wallFrontZ + wallBackZ); // -20.535m
    const noseRadius = 0.5 * (wallBackZ - wallFrontZ); // 1.385m

    // 1. Continuous Front 1-Foot CMU Retaining Wall along Washington St Sidewalk (lx = -15.90m .. -1.68m, lz = -21.92m)
    addGradedWallSegment(wallRightX, wallFrontZ, wallLeftX, wallFrontZ, 0.22, (px) => yWallTop(px), splitFaceCmuMat, 0.045);
    // 2. Left Return 1-Foot CMU Wall flush with the 410 Concrete Walkway Cheek Curb (lx = -1.75m, lz = -21.92m .. -19.15m)
    addGradedWallSegment(-1.75, wallFrontZ, -1.75, wallBackZ, 0.18, () => yWallTop(wallLeftX), splitFaceCmuMat, 0.045);
    // 3. Inner Concrete Curb bordering the 412 Concrete Parking Platform along lz = -19.15m (lx = -15.90m .. -1.66m),
    //    meeting the left return wall & 410 walkway cheek curb seamlessly at (-1.68, -19.15) with zero gap (Top-Left Circle in 003ff193.png)
    addGradedWallSegment(wallRightX, wallBackZ, -1.66, wallBackZ, 0.18, (px) => yWallTop(Math.min(px, wallLeftX)), capStoneMat, 0);

    // 4. Contour-Following River-Gravel Planter Bed behind the 1-Foot CMU Retaining Wall (lx = -15.90m .. -1.75m, lz = -21.92m .. -19.15m)
    const gravSegs = 10;
    for (let ig = 0; ig < gravSegs; ig++) {
        const gx0 = wallRightX + ((wallLeftX - wallRightX) * ig) / gravSegs;
        const gx1 = wallRightX + ((wallLeftX - wallRightX) * (ig + 1)) / gravSegs;
        const gy0 = yWallTop(gx0) - 0.025;
        const gy1 = yWallTop(gx1) - 0.025;
        addGradedQuad([gx0, gy0, wallFrontZ], [gx1, gy1, wallFrontZ], [gx1, gy1, wallBackZ], [gx0, gy0, wallBackZ], riverGravelMat);
    }

    // 5. Seamless 180-Degree Semicircular Gravel Nose & Curb at Right End (lx = -17.285m .. -15.90m, lz = -21.92m .. -19.15m)
    // Connects tangent & flush at (-15.90, -21.92) with the front CMU wall and at (-15.90, -19.15) with the inner curb (Middle-Right Circle in 003ff193.png)
    const noseSegs = 10;
    const yNoseFlat = yWallTop(wallRightX);
    const yNoseGravel = yNoseFlat - 0.025;
    for (let i = 0; i < noseSegs; i++) {
        const a0 = -Math.PI * 0.5 - (Math.PI * i) / noseSegs;
        const a1 = -Math.PI * 0.5 - (Math.PI * (i + 1)) / noseSegs;
        const x0 = wallRightX + Math.cos(a0) * noseRadius;
        const z0 = nosePivotZ + Math.sin(a0) * noseRadius;
        const x1 = wallRightX + Math.cos(a1) * noseRadius;
        const z1 = nosePivotZ + Math.sin(a1) * noseRadius;
        addGradedWallSegment(x0, z0, x1, z1, 0.20, yNoseFlat, splitFaceCmuMat, 0.045);
        addGradedQuad(
            [wallRightX, yNoseGravel, nosePivotZ],
            [x0, yNoseGravel, z0],
            [x1, yNoseGravel, z1],
            [wallRightX, yNoseGravel, nosePivotZ],
            riverGravelMat
        );
    }

    // 6. Two Dark Metal Parking Sign Posts in the Raised Gravel Bed (lx = -7.15m & -11.45m, lz = -20.55m, ad11dfd1.jpg)
    //    + Silver Sign Post in the Semicircular Right Gravel Nose (lx = -16.65m, lz = -20.535m, 822548ba.jpg)
    [-7.15, -11.45].forEach((px) => {
        const pBase = yWallTop(px) - 0.02;
        addBox(0.045, 1.48, 0.045, darkMetalMat, px, pBase + 0.74, -20.535);
        addBox(0.32, 0.40, 0.025, darkMetalMat, px, pBase + 1.32, -20.515);
    });
    addBox(0.045, 1.42, 0.045, poleSilverMat, -16.65, yNoseGravel + 0.71, nosePivotZ);
    addBox(0.30, 0.38, 0.025, poleSilverMat, -16.65, yNoseGravel + 1.27, nosePivotZ);

    // --- 5B. Terrain-Sloping CONCRETE 412 Parking Platform & King St Driveway Entrance (parkingConcreteMat) ---
    // Main 412 Concrete Parking Platform (lx = -16.00m .. -1.68m, lz = -19.15m .. +2.15m): slopes smoothly with the terrain
    // from y = +0.01m at the 412 porch walkway (lz = +2.15m) down to the 1-foot retaining wall height at lz = -19.15m
    const lot412XSteps = 10;
    const lot412ZSteps = 12;
    for (let ix = 0; ix < lot412XSteps; ix++) {
        const x0 = -16.00 + (14.32 * ix) / lot412XSteps;
        const x1 = -16.00 + (14.32 * (ix + 1)) / lot412XSteps;
        for (let iz = 0; iz < lot412ZSteps; iz++) {
            const z0 = -19.15 + (21.30 * iz) / lot412ZSteps;
            const z1 = -19.15 + (21.30 * (iz + 1)) / lot412ZSteps;
            addGradedQuad(
                [x0, yLotSurface(x0, z0), z0],
                [x1, yLotSurface(x1, z0), z0],
                [x1, yLotSurface(x1, z1), z1],
                [x0, yLotSurface(x0, z1), z1],
                parkingConcreteMat
            );
        }
    }
    // West bay & King St Concrete Driveway Transition (lx = -19.45m .. -16.00m, lz = -19.15m .. +2.15m)
    const westZSteps = 12;
    for (let iz = 0; iz < westZSteps; iz++) {
        const z0 = -19.15 + (21.30 * iz) / westZSteps;
        const z1 = -19.15 + (21.30 * (iz + 1)) / westZSteps;
        const yInner0 = yLotSurface(-16.00, z0);
        const yInner1 = yLotSurface(-16.00, z1);
        const yOuter0 = z0 >= -4.50 ? yLotSurface(-19.45, z0) : Math.min(yInner0, yStreetGrade(-19.45, z0) + 0.08);
        const yOuter1 = z1 >= -4.50 ? yLotSurface(-19.45, z1) : Math.min(yInner1, yStreetGrade(-19.45, z1) + 0.08);
        addGradedQuad(
            [-19.45, yOuter0, z0],
            [-16.00, yInner0, z0],
            [-16.00, yInner1, z1],
            [-19.45, yOuter1, z1],
            parkingConcreteMat
        );
    }
    // Solid perimeter edge curb along the west bay edge (lx = -19.45m, lz = -4.50m .. +2.15m)
    addGradedWallSegment(-19.45, -4.50, -19.45, 2.15, 0.18, (px, pz) => yLotSurface(px, pz), parkingConcreteMat, 0);

    // --- 5C. Extended 410 Front Mulch/Rockery Slope & Terrain-Sloping Concrete 411 Alley Parking ---
    // 1. Terrain-conforming 10x10 mulch/soil rockery bed (lx = -0.32m .. +11.68m, lz = -22.03m .. -14.95m)
    const rockXSteps = 10;
    const rockZSteps = 10;
    for (let ix = 0; ix < rockXSteps; ix++) {
        const x0 = -0.32 + (12.00 * ix) / rockXSteps;
        const x1 = -0.32 + (12.00 * (ix + 1)) / rockXSteps;
        for (let iz = 0; iz < rockZSteps; iz++) {
            const z0 = -22.03 + (7.08 * iz) / rockZSteps;
            const z1 = -22.03 + (7.08 * (iz + 1)) / rockZSteps;
            addGradedQuad(
                [x0, yRockerySurface(x0, z0), z0],
                [x1, yRockerySurface(x1, z0), z0],
                [x1, yRockerySurface(x1, z1), z1],
                [x0, yRockerySurface(x0, z1), z1],
                mulchBedMat
            );
        }
    }
    // Contoured narrow soil/mulch planting strip along the 410 SW walkway wall (lx = -0.32m .. +0.04m, lz = -14.95m .. -0.20m)
    const stripSegs = 12;
    for (let is = 0; is < stripSegs; is++) {
        const sz0 = -14.95 + (14.75 * is) / stripSegs;
        const sz1 = -14.95 + (14.75 * (is + 1)) / stripSegs;
        const sy0 = yWalk410(sz0) - 0.015;
        const sy1 = yWalk410(sz1) - 0.015;
        addGradedQuad([-0.32, sy0, sz0], [0.04, sy0, sz0], [0.04, sy1, sz1], [-0.32, sy1, sz1], mulchBedMat);
    }
    // Front-edge Washington St sidewalk border of the 410 rockery left clear of pre-made shrubs for user planting via TreePlanterFoundry
    // Silver street sign post at front of 410 rockery near Washington St sidewalk (lx = +6.25m, lz = -21.75m, 2f9581e2.jpg)
    const signY410 = yRockerySurface(6.25, -21.75);
    addBox(0.045, 1.85, 0.045, poleSilverMat, 6.25, signY410 + 0.92, -21.75);
    addBox(0.32, 0.46, 0.025, poleSilverMat, 6.25, signY410 + 1.62, -21.75);

    // 2. Terrain-Sloping CONCRETE 411/400 Alley Parking Platform (lx = +11.68m .. +23.62m, lz = -22.03m .. zOuter411(x), parkingConcreteMat!)
    //    Split at lz = -2.26m so the rear section (lz = -2.26m .. zOuter411(x), 22 Z-steps) shares the exact same vertices and heights
    //    along lx = +23.62m with Building400ConcreteParkingGround (0.0000m step, 0.0000m gap, zero interior wall bars!).
    const alleyX0 = 11.68;
    const alleyX1 = 23.62;
    const alleyXSteps = 12;
    const alleyZMid = -2.26;
    const alleyFrontZSteps = 14;
    const alleyRearZSteps = 22;
    for (let ix = 0; ix < alleyXSteps; ix++) {
        const x0 = alleyX0 + ((alleyX1 - alleyX0) * ix) / alleyXSteps;
        const x1 = alleyX0 + ((alleyX1 - alleyX0) * (ix + 1)) / alleyXSteps;
        // Front alley section (lz = -22.03m .. -2.26m) along Building 400's SW wall
        for (let iz = 0; iz < alleyFrontZSteps; iz++) {
            const z0 = -22.03 + ((alleyZMid - (-22.03)) * iz) / alleyFrontZSteps;
            const z1 = -22.03 + ((alleyZMid - (-22.03)) * (iz + 1)) / alleyFrontZSteps;
            addGradedQuad(
                [x0, yAlleyLot(x0, z0), z0],
                [x1, yAlleyLot(x1, z0), z0],
                [x1, yAlleyLot(x1, z1), z1],
                [x0, yAlleyLot(x0, z1), z1],
                parkingConcreteMat
            );
        }
        // Rear alley section (lz = -2.26m .. zOuter411(x), 22 Z-steps matching Building400ConcreteParkingGround at lx = 23.62m)
        const zOut0 = zOuter411(x0);
        const zOut1 = zOuter411(x1);
        for (let iz = 0; iz < alleyRearZSteps; iz++) {
            const t0 = iz / alleyRearZSteps;
            const t1 = (iz + 1) / alleyRearZSteps;
            const z00 = alleyZMid + (zOut0 - alleyZMid) * t0;
            const z10 = alleyZMid + (zOut1 - alleyZMid) * t0;
            const z11 = alleyZMid + (zOut1 - alleyZMid) * t1;
            const z01 = alleyZMid + (zOut0 - alleyZMid) * t1;
            addGradedQuad(
                [x0, yAlleyLot(x0, z00), z00],
                [x1, yAlleyLot(x1, z10), z10],
                [x1, yAlleyLot(x1, z11), z11],
                [x0, yAlleyLot(x0, z01), z01],
                parkingConcreteMat
            );
        }
    }
    // Outer perimeter skirts only on non-welded exterior edges:
    // - Short rear skirt between Building 411's rear corner (lx = 15.73m) and the Rear Alley curb (lx = 18.45m)
    // - Front right alley edge alongside Building 400's SW wall (lx = 23.62m, lz = -22.03m .. -2.26m), stopping before the open parking plaza seam!
    for (let ix = 0; ix < 2; ix++) {
        const sx0 = 15.73 + ((18.45 - 15.73) * ix) / 2;
        const sx1 = 15.73 + ((18.45 - 15.73) * (ix + 1)) / 2;
        addGradedWallSegment(sx0, zOuter411(sx0), sx1, zOuter411(sx1), 0.18, (px, pz) => yAlleyLot(px, pz) - 0.02, parkingConcreteMat, 0);
    }
    for (let iz = 0; iz < 10; iz++) {
        const sz0 = -22.03 + ((-2.26 - (-22.03)) * iz) / 10;
        const sz1 = -22.03 + ((-2.26 - (-22.03)) * (iz + 1)) / 10;
        addGradedWallSegment(23.62, sz0, 23.62, sz1, 0.18, (px, pz) => yAlleyLot(px, pz) - 0.02, parkingConcreteMat, 0);
    }

    // --- 5D. Continuous Washington Street Sidewalk (lz = -22.03m .. -24.98m, lx = -16.50m .. +19.85m) ---
    // Connects seamlessly at lx = +19.85m into Building 400's Washington St sidewalk (2f9581e2.jpg, ad11dfd1.jpg, 8d2bbc2e.jpg)
    const washSwX0 = -16.50;
    const washSwX1 = 19.85;
    const washSwSegs = 24;
    for (let i = 0; i < washSwSegs; i++) {
        const x0 = washSwX0 + ((washSwX1 - washSwX0) * i) / washSwSegs;
        const x1 = washSwX0 + ((washSwX1 - washSwX0) * (i + 1)) / washSwSegs;
        const xm = 0.5 * (x0 + x1);
        const segW = (x1 - x0) + 0.015;
        // At lx = +19.85m, match Building 400's sidewalk top elevation seamlessly
        const y0 = yStreetGrade(x0, -23.50) + 0.09;
        const y1 = yStreetGrade(x1, -23.50) + 0.09;
        const ym = 0.5 * (y0 + y1);
        const slopeZ = Math.atan2(y1 - y0, x1 - x0);

        const slab = new THREE.Mesh(new THREE.BoxGeometry(segW, 0.22, 2.95), swConcreteMat);
        slab.position.set(xm, ym - 0.11, -23.505);
        slab.rotation.z = slopeZ;
        slab.receiveShadow = true;
        slab.castShadow = true;
        arch.add(slab);

        // Expansion joint every ~1.5m
        const joint = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.225, 2.96), swJointMat);
        joint.position.set(x0, y0 - 0.11, -23.505);
        arch.add(joint);

        // Street curb along outer edge (lz = -24.90m):
        // Yellow-painted curb along the CMU retaining wall (-16.50m .. -1.20m, ad11dfd1.jpg)
        // and short yellow curb section between 410 rockery & 411 driveway (+9.20m .. +11.68m, 2f9581e2.jpg)
        const isYellow = (xm <= -1.20) || (xm >= 9.20 && xm <= 11.68);
        const isDrivewayCut = (xm > 11.68 && xm < 18.80);
        const isWashCrosswalkCut = (xm < -14.20); // Flush ADA wheelchair ramp cut for Washington St crosswalk!
        const curbH = (isDrivewayCut || isWashCrosswalkCut) ? 0.05 : 0.16;
        const curb = new THREE.Mesh(
            new THREE.BoxGeometry(segW, curbH, 0.18),
            isYellow ? curbYellowMat : concreteMat
        );
        curb.position.set(xm, ym - 0.04, -24.90);
        curb.rotation.z = slopeZ;
        curb.castShadow = true;
        curb.receiveShadow = true;
        arch.add(curb);
    }

    // --- 5E. Seamless Curved Washington St / King St Corner Sidewalk & King Street Sidewalk (003ff193.png) ---
    // Matches the Washington St sidewalk (lx = -16.50m, lz = -24.98m..-22.03m, y = yWashEnd)
    // and the King St sidewalk (lz = -19.60m, lx = -21.65m..-19.25m, y = yKingStart) with zero step or offset!
    const cornerSteps = 16;
    const cornerPivotX = -16.50;
    const cornerPivotZ = -19.60;
    const yWashEnd = yStreetGrade(-16.50, -23.50) + 0.09;
    const yKingStart = yStreetGrade(-20.45, -19.60) + 0.08;

    for (let i = 0; i < cornerSteps; i++) {
        const t0 = i / cornerSteps;
        const t1 = (i + 1) / cornerSteps;
        const tm = (t0 + t1) * 0.5;
        const s0 = t0 * t0 * (3 - 2 * t0);
        const s1 = t1 * t1 * (3 - 2 * t1);

        const a0 = -Math.PI * 0.5 - Math.PI * 0.5 * t0;
        const a1 = -Math.PI * 0.5 - Math.PI * 0.5 * t1;

        // Smoothly interpolate inner radius (2.43m -> 2.75m), outer radius (5.38m -> 5.15m), and curb center radius (5.30m -> 5.06m)
        const rIn0 = THREE.MathUtils.lerp(2.43, 2.75, s0);
        const rIn1 = THREE.MathUtils.lerp(2.75 === 2.43 ? 2.43 : 2.43, 2.75, s1);
        const rOut0 = THREE.MathUtils.lerp(5.38, 5.15, s0);
        const rOut1 = THREE.MathUtils.lerp(5.38, 5.15, s1);
        const rCurb0 = THREE.MathUtils.lerp(5.30, 5.06, s0);
        const rCurb1 = THREE.MathUtils.lerp(5.30, 5.06, s1);

        const y0 = THREE.MathUtils.lerp(yWashEnd, yKingStart, s0);
        const y1 = THREE.MathUtils.lerp(yWashEnd, yKingStart, s1);

        const p00x = cornerPivotX + Math.cos(a0) * rIn0;
        const p00z = cornerPivotZ + Math.sin(a0) * rIn0;
        const p10x = cornerPivotX + Math.cos(a0) * rOut0;
        const p10z = cornerPivotZ + Math.sin(a0) * rOut0;
        const p11x = cornerPivotX + Math.cos(a1) * rOut1;
        const p11z = cornerPivotZ + Math.sin(a1) * rOut1;
        const p01x = cornerPivotX + Math.cos(a1) * rIn1;
        const p01z = cornerPivotZ + Math.sin(a1) * rIn1;

        // Top sidewalk surface quad
        addGradedQuad([p00x, y0, p00z], [p10x, y0, p10z], [p11x, y1, p11z], [p01x, y1, p01z], swConcreteMat);
        // 0.22m-thick outer vertical sidewalk skirt so the curved corner has the exact same 3D slab depth as both straight sidewalks
        const outDx = p11x - p10x;
        const outDz = p11z - p10z;
        const outLen = Math.hypot(outDx, outDz) + 0.015;
        const outAng = Math.atan2(outDz, outDx);
        const outSlope = Math.atan2(y1 - y0, outLen);
        const skirtG = new THREE.Group();
        skirtG.position.set(0.5 * (p10x + p11x), 0.5 * (y0 + y1) - 0.11, 0.5 * (p10z + p11z));
        skirtG.rotation.y = -outAng;
        const skirtM = new THREE.Mesh(new THREE.BoxGeometry(outLen, 0.22, 0.18), swConcreteMat);
        skirtM.rotation.z = outSlope;
        skirtG.add(skirtM);
        arch.add(skirtG);

        // Seamless curved yellow street curb (drops to flush 0.045m wheelchair curb-ramp lip at t < 0.34 and t > 0.66!)
        const isCornerRampCut = (tm < 0.34) || (tm > 0.66);
        const cornerCurbH = isCornerRampCut ? 0.045 : 0.16;
        const c0x = cornerPivotX + Math.cos(a0) * rCurb0;
        const c0z = cornerPivotZ + Math.sin(a0) * rCurb0;
        const c1x = cornerPivotX + Math.cos(a1) * rCurb1;
        const c1z = cornerPivotZ + Math.sin(a1) * rCurb1;
        const cDx = c1x - c0x;
        const cDz = c1z - c0z;
        const cLen = Math.hypot(cDx, cDz) + 0.02;
        const cAng = Math.atan2(cDz, cDx);
        const cSlope = Math.atan2(y1 - y0, cLen);
        const curbG = new THREE.Group();
        curbG.position.set(0.5 * (c0x + c1x), 0.5 * (y0 + y1) - (isCornerRampCut ? 0.08 : 0.04), 0.5 * (c0z + c1z));
        curbG.rotation.y = -cAng;
        const curbM = new THREE.Mesh(new THREE.BoxGeometry(cLen, cornerCurbH, 0.18), curbYellowMat);
        curbM.rotation.z = cSlope;
        curbM.castShadow = true;
        curbM.receiveShadow = true;
        curbG.add(curbM);
        arch.add(curbG);

        // Inner concrete apron connecting the inner edge of the curved sidewalk to the semicircular gravel nose & King St driveway
        const apX = THREE.MathUtils.lerp(-16.00, -19.25, t0);
        const apX1 = THREE.MathUtils.lerp(-16.00, -19.25, t1);
        const apZ = -19.15;
        const yAp0 = yLotSurface(apX, apZ);
        const yAp1 = yLotSurface(apX1, apZ);
        addGradedQuad([p00x, y0, p00z], [p01x, y1, p01z], [apX1, yAp1, apZ], [apX, yAp0, apZ], concreteMat);
    }

    // Dual Curved ADA Wheelchair Curb Ramps & Tactile Truncated-Dome Warning Pads on the 411/412 Rounded Corner
    // (1: Facing Washington St Crosswalk; 2: Facing King St North Crosswalk — strictly inside the curved curb!)
    {
        const eval411CornerArc = (t, rOffsetFromOuter) => {
            const s = t * t * (3 - 2 * t);
            const a = -Math.PI * 0.5 - Math.PI * 0.5 * t;
            const rOut = THREE.MathUtils.lerp(5.38, 5.15, s);
            const r = rOut - rOffsetFromOuter;
            const px = cornerPivotX + Math.cos(a) * r;
            const pz = cornerPivotZ + Math.sin(a) * r;
            const py = THREE.MathUtils.lerp(yWashEnd, yKingStart, s);
            return [px, py, pz];
        };

        // Radial expansion score joints & ADA ramp cheek flare lines on the 411/412 rounded corner
        for (const tJ of [0.06, 0.34, 0.50, 0.66, 0.94]) {
            const pIn = eval411CornerArc(tJ, 2.40);
            const pOut = eval411CornerArc(tJ, 0.14);
            const jmx = 0.5 * (pIn[0] + pOut[0]);
            const jmz = 0.5 * (pIn[2] + pOut[2]);
            const jmy = 0.5 * (pIn[1] + pOut[1]) + 0.008;
            const jLen = Math.hypot(pOut[0] - pIn[0], pOut[2] - pIn[2]);
            const jAng = Math.atan2(pOut[2] - pIn[2], pOut[0] - pIn[0]);
            const jSlope = Math.atan2(pOut[1] - pIn[1], jLen);
            const jG = new THREE.Group();
            jG.position.set(jmx, jmy, jmz);
            jG.rotation.y = -jAng;
            const jM = new THREE.Mesh(new THREE.BoxGeometry(jLen, 0.014, 0.028), swJointMat);
            jM.rotation.z = jSlope;
            jG.add(jM);
            arch.add(jG);
        }

        const addCurved411TactilePad = (tStart, tEnd, segCount = 4) => {
            const rOffMid = 0.54; // Spans rOut - 0.82m .. rOut - 0.26m, strictly inside the curved curb!
            const padDepthR = 0.56;
            for (let i = 0; i < segCount; i++) {
                const tA = tStart + (i / segCount) * (tEnd - tStart);
                const tB = tStart + ((i + 1) / segCount) * (tEnd - tStart);
                const tM = 0.5 * (tA + tB);
                const pA = eval411CornerArc(tA, rOffMid);
                const pB = eval411CornerArc(tB, rOffMid);
                const pM = eval411CornerArc(tM, rOffMid);
                const arcLen = Math.hypot(pB[0] - pA[0], pB[2] - pA[2]) - 0.02;
                const tangAng = Math.atan2(pB[2] - pA[2], pB[0] - pA[0]);
                const tangSlope = Math.atan2(pB[1] - pA[1], arcLen);

                const segGrp = new THREE.Group();
                segGrp.position.set(pM[0], pM[1] + 0.012, pM[2]);
                segGrp.rotation.y = -tangAng;
                segGrp.rotation.z = tangSlope;

                const padSeg = new THREE.Mesh(new THREE.BoxGeometry(arcLen, 0.022, padDepthR), curbYellowMat);
                padSeg.castShadow = true;
                padSeg.receiveShadow = true;
                segGrp.add(padSeg);

                for (let ix = -1; ix <= 1; ix++) {
                    for (let iz = -1; iz <= 1; iz++) {
                        const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.028, 0.014, 6), curbYellowMat);
                        dome.position.set(ix * (arcLen * 0.30), 0.016, iz * (padDepthR * 0.30));
                        segGrp.add(dome);
                    }
                }
                arch.add(segGrp);
            }
        };

        // 1) Facing Washington St Crosswalk (t = 0.08 .. 0.31)
        addCurved411TactilePad(0.08, 0.31, 4);

        // 2) Facing King St North Crosswalk (t = 0.69 .. 0.92)
        addCurved411TactilePad(0.69, 0.92, 4);
    }

    // King Street Sidewalk & Driveway Apron running along the NW side (lx = -21.65m .. -19.25m, lz = -19.60m .. +11.60m, 8d2bbc2e.jpg)
    const kingZ0 = -19.60;
    const kingZ1 = 11.60;
    const kingSegs = 20;
    for (let i = 0; i < kingSegs; i++) {
        const z0 = kingZ0 + ((kingZ1 - kingZ0) * i) / kingSegs;
        const z1 = kingZ0 + ((kingZ1 - kingZ0) * (i + 1)) / kingSegs;
        const zm = 0.5 * (z0 + z1);
        const segL = (z1 - z0) + 0.015;
        const y0 = yStreetGrade(-20.45, z0) + 0.08;
        const y1 = yStreetGrade(-20.45, z1) + 0.08;
        const ym = 0.5 * (y0 + y1);
        const slopeX = Math.atan2(y1 - y0, z1 - z0);

        const kSlab = new THREE.Mesh(new THREE.BoxGeometry(2.40, 0.22, segL), swConcreteMat);
        kSlab.position.set(-20.45, ym - 0.11, zm);
        kSlab.rotation.x = -slopeX;
        kSlab.receiveShadow = true;
        kSlab.castShadow = true;
        arch.add(kSlab);

        const kJoint = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.225, 0.025), swJointMat);
        kJoint.position.set(-20.45, y0 - 0.11, z0);
        arch.add(kJoint);

        // Yellow curb near the corner (-19.60m .. -14.80m), flush driveway apron across the 412 lot entrance (-14.80m .. -2.50m),
        // and standard concrete curb uphill alongside the 412 west wall (-2.50m .. +11.60m, 8d2bbc2e.jpg)
        const isKingYellow = zm < -14.80;
        const isKingDriveway = zm >= -14.80 && zm <= -2.50;
        const kCurbH = isKingDriveway ? 0.05 : 0.16;
        const kCurb = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, kCurbH, segL),
            isKingYellow ? curbYellowMat : concreteMat
        );
        kCurb.position.set(-21.56, ym - 0.04, zm);
        kCurb.rotation.x = -slopeX;
        kCurb.castShadow = true;
        arch.add(kCurb);
    }

    // --- 5F. Tall Silver Streetlight Pole & Washington St / STOP Corner Sign (ad11dfd1.jpg, 822548ba.jpg, 8d2bbc2e.jpg) ---
    // Tall silver metal cobra-head streetlight pole on the Washington St sidewalk in front of the CMU retaining wall (lx = -13.45m, lz = -24.15m)
    const poleBaseY = yStreetGrade(-13.45, -24.15) + 0.09;
    const poleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.20, 0.28, 12), poleSilverMat);
    poleBase.position.set(-13.45, poleBaseY + 0.14, -24.15);
    arch.add(poleBase);
    const poleShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.125, 7.80, 12), poleSilverMat);
    poleShaft.position.set(-13.45, poleBaseY + 4.04, -24.15);
    poleShaft.castShadow = true;
    arch.add(poleShaft);
    // Grey utility control boxes mounted on the streetlight shaft (ad11dfd1.jpg & 822548ba.jpg)
    addBox(0.24, 0.44, 0.22, poleSilverMat, -13.45, poleBaseY + 1.85, -24.05);
    addBox(0.20, 0.32, 0.18, poleSilverMat, -13.45, poleBaseY + 2.38, -24.05);
    // Curved mast arm & cobra-head luminaire extending over Washington St (-lz)
    const mastArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 2.65, 8), poleSilverMat);
    mastArm.position.set(-13.45, poleBaseY + 7.95, -25.30);
    mastArm.rotation.x = Math.PI * 0.38;
    arch.add(mastArm);
    addBox(0.32, 0.10, 0.62, poleSilverMat, -13.45, poleBaseY + 8.35, -26.55);

    // Street Name Sign ("Washington St" green blade + octagonal STOP sign) at the King St Corner (lx = -19.85m, lz = -17.45m, 822548ba.jpg & 8d2bbc2e.jpg)
    const stopBaseY = yStreetGrade(-19.85, -17.45) + 0.09;
    addBox(0.045, 2.85, 0.045, poleSilverMat, -19.85, stopBaseY + 1.42, -17.45);
    const washBladeMat = createSignMat('#15803d', '#ffffff', [
        { text: 'Washington St', y: 42, color: '#ffffff', font: 'bold 28px Arial' }
    ], 256, 64);
    addBox(0.82, 0.18, 0.025, washBladeMat, -19.85, stopBaseY + 2.76, -17.45, false);
    const stopOct = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.34, 0.025, 8),
        new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.5 })
    );
    stopOct.rotation.z = Math.PI * 0.5;
    stopOct.rotation.x = Math.PI / 8;
    stopOct.position.set(-19.88, stopBaseY + 2.18, -17.45);
    arch.add(stopOct);
}
