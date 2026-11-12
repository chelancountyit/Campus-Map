import * as THREE from 'three';
import {
    buildGraniteBaseWindow,
    buildRecessedRectWindow,
    buildFriezeAtticWindow,
    buildTwoStoryArchedCourtroomBay,
    buildClassicalPilaster,
    buildClassicalModillionCornice
} from './Building350FrontFascia.js';

/**
 * Building 350 (Chelan County Courthouse) — 5-Story Structural Massing, Washington St & Park Side Facades, and White Roof
 * Modeled from reference photos:
 * - Symmetrical Front Pavilion (lz = +19.50m .. +26.125m) & Rear Pavilion (lz = -17.425m .. -10.80m)
 * - Washington St (-X) 7-Bay Central Brick Wall (f4021356.jpg, 9728efd3.jpg, 9915b876.jpg, 0cf908f6.jpg, 20905550.jpg)
 *   with tall outer paired windows (Bays 1, 2, 6, 7), shorter inner paired windows (Bays 3, 4, 5), and the
 *   carved "COUNTY BUILDING" Washington St Side Entrance Portal with rosette surround, Scales-of-Justice cartouches, and wall lanterns (297c2294.jpg).
 * - Courthouse Park (+X) 7-Bay Arched Courtroom Colonnade with "CHELAN COUNTY COURT HOUSE" parapet entablature (ee41fcd9.jpg).
 */
export function buildBuilding350Structure(arch, building, mats) {
    const {
        rusticatedGraniteMat,
        smoothGraniteMat,
        terraCottaMat,
        terraCottaTrimMat,
        tapestryBrickMat,
        darkFrameMat,
        glassMat,
        whiteRoofMat,
        countyBuildingFriezeMat,
        chelanCourthouseParapetMat
    } = mats;

    const minX = -15.26;
    const maxX = 10.18;
    const midX = (minX + maxX) * 0.5; // -2.54m
    const width = maxX - minX; // 25.44m

    const minZ = -17.425;
    const maxZ = 26.125;
    const rearPavEndZ = -10.80;
    const frontPavStartZ = 19.50;
    const midZ = (minZ + maxZ) * 0.5; // +4.35m
    const depth = maxZ - minZ; // 43.55m

    // 1. Floor 1 (Basement / Smooth Light-Gray Granite Water-Table Plinth: y = -4.50m .. +0.38m)
    const f1H = 4.88;
    const f1MidY = -4.50 + f1H * 0.5; // -2.06m
    const plinthMesh = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.16, f1H, depth + 0.16),
        smoothGraniteMat
    );
    plinthMesh.position.set(midX, f1MidY, midZ);
    plinthMesh.castShadow = true;
    plinthMesh.receiveShadow = true;
    plinthMesh.userData = { isSelectableBuilding: true, building };
    arch.add(plinthMesh);

    // Molded granite water-table bevel cap at y = +0.38m around the building
    const waterTableCap = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.24, 0.12, depth + 0.24),
        smoothGraniteMat
    );
    waterTableCap.position.set(midX, 0.36, midZ);
    arch.add(waterTableCap);

    // Small gray electrical/utility box on the front-left granite plinth (visible in 5e38395b.jpg)
    const utilBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.72, 0.22),
        new THREE.MeshStandardMaterial({ color: '#c8cfd4', roughness: 0.5, metalness: 0.3 })
    );
    utilBox.position.set(minX + 1.85, -0.35, maxZ + 0.12);
    arch.add(utilBox);

    // 2-Head Fire Department Standpipe Connection (FDC) at the rear-left corner on Washington St (9915b876.jpg, 20905550.jpg)
    const fdcMat = new THREE.MeshStandardMaterial({ color: '#8a9298', roughness: 0.4, metalness: 0.7 });
    const fdcPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 10), fdcMat);
    fdcPipe.position.set(minX - 0.28, 0.38, minZ + 0.52);
    arch.add(fdcPipe);
    const fdcHead = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.32), fdcMat);
    fdcHead.position.set(minX - 0.28, 0.76, minZ + 0.52);
    arch.add(fdcHead);

    // 2. Floor 2 (Washington St Road Level / Rusticated Light-Gray Granite Base: y = +0.38m .. +4.10m)
    const f2H = 3.72;
    const f2MidY = 0.38 + f2H * 0.5; // +2.24m
    const f2Body = new THREE.Mesh(
        new THREE.BoxGeometry(width, f2H, depth),
        rusticatedGraniteMat
    );
    f2Body.position.set(midX, f2MidY, midZ);
    f2Body.castShadow = true;
    f2Body.receiveShadow = true;
    f2Body.userData = { isSelectableBuilding: true, building };
    arch.add(f2Body);

    // 3. Floors 3, 4 & 5 Front Classical Pavilion Mass (lz = +19.50m .. +26.125m) & Rear Classical Pavilion Mass (lz = -17.425m .. -10.80m)
    const pavUpperH = 18.12 - 4.65; // 13.47m
    [
        [frontPavStartZ, maxZ],
        [minZ, rearPavEndZ]
    ].forEach(([z0, z1]) => {
        const pDepth = z1 - z0;
        const pMidZ = (z0 + z1) * 0.5;
        const pBody = new THREE.Mesh(
            new THREE.BoxGeometry(width, pavUpperH, pDepth),
            tapestryBrickMat
        );
        pBody.position.set(midX, 4.65 + pavUpperH * 0.5, pMidZ);
        pBody.castShadow = true;
        pBody.receiveShadow = true;
        pBody.userData = { isSelectableBuilding: true, building };
        arch.add(pBody);
    });

    // 4. Floors 3, 4 & 5 Central 7-Bay Section Mass (lz = -10.80m .. +19.50m, inset 0.16m on Washington St side as seen in f4021356.jpg & 20905550.jpg)
    const midSpanZ = frontPavStartZ - rearPavEndZ; // 30.30m
    const midSectionZ = (rearPavEndZ + frontPavStartZ) * 0.5; // +4.35m
    const washInset = 0.16;
    const midW = width - washInset; // Inset on -X (Washington St), flush on +X (Park)
    const midCenterX = minX + washInset + midW * 0.5;
    const midUpperH = 17.85 - 4.65; // 13.20m
    const midBody = new THREE.Mesh(
        new THREE.BoxGeometry(midW, midUpperH, midSpanZ),
        tapestryBrickMat
    );
    midBody.position.set(midCenterX, 4.65 + midUpperH * 0.5, midSectionZ);
    midBody.castShadow = true;
    midBody.receiveShadow = true;
    midBody.userData = { isSelectableBuilding: true, building };
    arch.add(midBody);

    // Continuous Belt Course (y = +4.10m .. +4.65m), Architrave Band (y = +13.55m .. +13.98m) & Two-Tier Frieze Cornice Band (y = +16.45m .. +16.92m)
    // along the Washington St Central 7-Bay Section (f4021356.jpg, 0cf908f6.jpg, 20905550.jpg)
    const washCentralX = minX + washInset; // -15.10m
    const washBelt = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.55, midSpanZ + 0.10),
        terraCottaTrimMat
    );
    washBelt.position.set(washCentralX - 0.08, 4.375, midSectionZ);
    washBelt.castShadow = true;
    arch.add(washBelt);

    // Silver-grey metal flashing cap over the belt course above Bays 2 & 3 behind the security fence (lz = -6.25m .. +2.20m, visible in 3188a364.jpg & 0cf908f6.jpg)
    const silverFlashing = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.24, 8.45),
        new THREE.MeshStandardMaterial({ color: '#d0d6dc', roughness: 0.38, metalness: 0.55 })
    );
    silverFlashing.position.set(washCentralX - 0.10, 4.24, -2.02);
    arch.add(silverFlashing);

    const washArchitrave = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.42, midSpanZ + 0.10),
        terraCottaTrimMat
    );
    washArchitrave.position.set(washCentralX - 0.06, 13.76, midSectionZ);
    washArchitrave.castShadow = true;
    arch.add(washArchitrave);

    // Two-tier cream terra-cotta frieze/cornice band above the 5th-floor windows on Washington St (y = 16.45m .. 16.92m, 0cf908f6.jpg & 20905550.jpg)
    const washCorniceLower = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.22, midSpanZ + 0.10),
        terraCottaMat
    );
    washCorniceLower.position.set(washCentralX - 0.06, 16.56, midSectionZ);
    arch.add(washCorniceLower);

    const washCorniceUpper = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.26, midSpanZ + 0.10),
        terraCottaTrimMat
    );
    washCorniceUpper.position.set(washCentralX - 0.12, 16.80, midSectionZ);
    washCorniceUpper.castShadow = true;
    arch.add(washCorniceUpper);

    // 5. Roof Parapet Coping Caps & Recessed Bright White Elastomeric Roof Deck (a2489d57.jpg)
    const parapetThick = 0.55;
    const frontCoping = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.28, 0.18, parapetThick + 0.16),
        terraCottaTrimMat
    );
    frontCoping.position.set(midX, 18.21, maxZ - parapetThick * 0.5);
    arch.add(frontCoping);

    const backCoping = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.28, 0.18, parapetThick + 0.16),
        terraCottaTrimMat
    );
    backCoping.position.set(midX, 18.21, minZ + parapetThick * 0.5);
    arch.add(backCoping);

    // Side coping caps over Front & Rear Pavilions + Central section
    [-1, 1].forEach((s) => {
        [
            [frontPavStartZ, maxZ],
            [minZ, rearPavEndZ]
        ].forEach(([z0, z1]) => {
            const pCop = new THREE.Mesh(
                new THREE.BoxGeometry(parapetThick + 0.16, 0.18, (z1 - z0) + 0.20),
                terraCottaTrimMat
            );
            pCop.position.set(s < 0 ? minX + parapetThick * 0.5 : maxX - parapetThick * 0.5, 18.21, (z0 + z1) * 0.5);
            arch.add(pCop);
        });

        const midCop = new THREE.Mesh(
            new THREE.BoxGeometry(parapetThick + 0.16, 0.18, midSpanZ + 0.10),
            terraCottaTrimMat
        );
        midCop.position.set(
            s < 0 ? washCentralX + parapetThick * 0.5 : maxX - parapetThick * 0.5,
            17.94,
            midSectionZ
        );
        arch.add(midCop);
    });

    // Recessed Bright White Elastomeric Roof Membrane Slab
    const roofSlab = new THREE.Mesh(
        new THREE.BoxGeometry(width - parapetThick * 1.8, 0.40, depth - parapetThick * 1.8),
        whiteRoofMat
    );
    roofSlab.position.set(midX, 17.35, midZ);
    roofSlab.receiveShadow = true;
    arch.add(roofSlab);

    buildRooftopEquipment(arch, midX, whiteRoofMat, terraCottaTrimMat, darkFrameMat);

    // 6. SW Facade (Washington St Side, lx = -15.10m central / -15.26m granite base, lz = -10.80m .. +19.50m)
    // Exact 7-Bay Configuration from 3188a364.jpg, 6cad8200.jpg, f4021356.jpg, 9728efd3.jpg, 9915b876.jpg, 0cf908f6.jpg & 297c2294.jpg!
    const washRotY = -Math.PI * 0.5;
    const washBays = [
        { bz: -8.40, tallUpper: true, singleF5: true, floor2Type: 'singleLeft' }, // Bay 1 (leftmost central bay, 3188a364.jpg)
        { bz: -4.15, tallUpper: true, singleF5: false, floor2Type: 'paired' },    // Bay 2 (behind fence center, 3188a364.jpg)
        { bz: 0.10, tallUpper: false, singleF5: false, floor2Type: 'transom' },   // Bay 3 (behind fence right half, 3188a364.jpg)
        { bz: 4.35, tallUpper: false, singleF5: false, floor2Type: 'portal' },    // Bay 4 (CENTER BAY: Washington St "COUNTY BUILDING" Entrance Portal! 3188a364.jpg & 297c2294.jpg)
        { bz: 8.60, tallUpper: false, singleF5: false, floor2Type: 'transom' },   // Bay 5 (to right of portal, 3188a364.jpg & 9728efd3.jpg)
        { bz: 12.85, tallUpper: true, singleF5: false, floor2Type: 'transom' },   // Bay 6 (9728efd3.jpg)
        { bz: 17.10, tallUpper: true, singleF5: true, floor2Type: 'single' }      // Bay 7 (rightmost central bay, 9728efd3.jpg)
    ];

    washBays.forEach((bay) => {
        const { bz, tallUpper, singleF5, floor2Type } = bay;
        const winH = tallUpper ? 2.60 : 1.68;
        const f3Y = tallUpper ? 6.40 : 6.55;
        const f4Y = tallUpper ? 10.90 : 11.15;

        // Floors 3 & 4 Paired Windows (tall in Bays 1, 2, 6, 7; shorter in Bays 3, 4, 5 — exact match to 3188a364.jpg & f4021356.jpg!)
        [-0.78, 0.78].forEach((dz) => {
            buildRecessedRectWindow(arch, washCentralX, f3Y, bz + dz, 1.12, winH, washRotY, darkFrameMat, glassMat, terraCottaTrimMat, true);
            buildRecessedRectWindow(arch, washCentralX, f4Y, bz + dz, 1.12, winH, washRotY, darkFrameMat, glassMat, terraCottaTrimMat, true);
        });

        // Floor 5 (Attic Frieze Band): single square window in Bays 1 & 7, paired square windows in Bays 2, 3, 4, 5, 6 (3188a364.jpg!)
        if (singleF5) {
            buildFriezeAtticWindow(arch, washCentralX, 15.25, bz, 1.08, 1.34, washRotY, darkFrameMat, glassMat, terraCottaTrimMat);
        } else {
            [-0.76, 0.76].forEach((dz) => {
                buildFriezeAtticWindow(arch, washCentralX, 15.25, bz + dz, 1.04, 1.34, washRotY, darkFrameMat, glassMat, terraCottaTrimMat);
            });
        }

        // Floor 2 (Rusticated Gray Granite Base at lx = minX = -15.26m)
        if (floor2Type === 'singleLeft') {
            // In 3188a364.jpg, Bay 1's Floor 2 window sits under the left window of Bay 1!
            buildGraniteBaseWindow(arch, minX, 2.15, bz - 0.65, 1.14, 2.25, washRotY, rusticatedGraniteMat, darkFrameMat, glassMat);
        } else if (floor2Type === 'single') {
            buildGraniteBaseWindow(arch, minX, 2.15, bz, 1.32, 2.25, washRotY, rusticatedGraniteMat, darkFrameMat, glassMat);
        } else if (floor2Type === 'paired') {
            buildGraniteBaseWindow(arch, minX, 2.15, bz - 0.76, 1.12, 2.25, washRotY, rusticatedGraniteMat, darkFrameMat, glassMat);
            buildGraniteBaseWindow(arch, minX, 2.15, bz + 0.76, 1.12, 2.25, washRotY, rusticatedGraniteMat, darkFrameMat, glassMat);
            // Small red fire alarm strobe above Bay 2's right window (3188a364.jpg & 6cad8200.jpg)
            const alarm = new THREE.Mesh(
                new THREE.BoxGeometry(0.14, 0.16, 0.12),
                new THREE.MeshStandardMaterial({ color: '#c1121f', roughness: 0.4 })
            );
            alarm.position.set(minX - 0.06, 3.58, bz + 0.76);
            arch.add(alarm);
        } else if (floor2Type === 'recessed' || floor2Type === 'transom') {
            // Wide dark upper transom + paired lower windows (visible in 3188a364.jpg, 6cad8200.jpg & 9728efd3.jpg)
            const topDark = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.96, 2.68), darkFrameMat);
            topDark.userData.hideOnCutaway = true;
            topDark.position.set(minX - 0.02, 3.38, bz);
            arch.add(topDark);
            buildGraniteBaseWindow(arch, minX, 1.82, bz - 0.76, 1.10, 1.68, washRotY, rusticatedGraniteMat, darkFrameMat, glassMat);
            buildGraniteBaseWindow(arch, minX, 1.82, bz + 0.76, 1.10, 1.68, washRotY, rusticatedGraniteMat, darkFrameMat, glassMat);
        } else if (floor2Type === 'portal') {
            // Bay 4 (lz = +4.35m): Carved Cream Terra-Cotta "COUNTY BUILDING" Washington St Side Entrance Portal (3188a364.jpg & 297c2294.jpg!)
            buildWashingtonStEntrancePortal(arch, minX, bz, mats);
        }
    });

    // 7. NE Facade (Courthouse Park Side, lx = maxX = +10.18m, lz = -10.80m .. +19.50m)
    // Shown in ee41fcd9.jpg: 7 Two-Story Arched Courtroom Bays separated by Giant Cream Terra-Cotta Pilasters,
    // Paired 5th-floor windows in each bay, continuous modillion cornice, and the raised "CHELAN COUNTY COURT HOUSE" parapet tablet!
    const parkRotY = Math.PI * 0.5;
    const parkBayZs = [-8.40, -4.15, 0.10, 4.35, 8.60, 12.85, 17.10];
    const parkPilasterZs = [-10.52, -6.27, -2.02, 2.22, 6.47, 10.72, 14.97, 19.22];

    parkPilasterZs.forEach((pz) => {
        buildClassicalPilaster(arch, maxX, pz, 0.94, 4.65, 13.55, parkRotY, terraCottaMat, terraCottaTrimMat);
        const fp = new THREE.Mesh(new THREE.BoxGeometry(0.88, 2.36, 0.14), terraCottaMat);
        fp.rotation.y = parkRotY;
        fp.position.set(maxX + 0.06, 15.25, pz);
        arch.add(fp);
    });

    parkBayZs.forEach((bz, idx) => {
        buildTwoStoryArchedCourtroomBay(arch, maxX, bz, 2.96, parkRotY, mats);
        [-0.72, 0.72].forEach((dz) => {
            buildFriezeAtticWindow(arch, maxX, 15.25, bz + dz, 1.00, 1.32, parkRotY, darkFrameMat, glassMat, terraCottaTrimMat);
        });

        // Floor 2 granite windows (or center Park Entrance Portal at idx === 3, lz = +4.35m)
        // Modeled from e637f636.jpg, 3e77aa21.jpg, ac388739.jpg, 45990f7d.jpg & 207f8d8c.jpg:
        // Each non-portal bay in the central colonnade has PAIRED Floor 2 granite windows separated by a rusticated granite mullion!
        if (idx === 3) {
            buildParkSideEntrancePortal(arch, maxX, bz, mats);
        } else {
            buildGraniteBaseWindow(arch, maxX, 2.32, bz - 0.78, 1.16, 2.32, parkRotY, rusticatedGraniteMat, darkFrameMat, glassMat);
            buildGraniteBaseWindow(arch, maxX, 2.32, bz + 0.78, 1.16, 2.32, parkRotY, rusticatedGraniteMat, darkFrameMat, glassMat);
            const pier = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.46, 0.42), rusticatedGraniteMat);
            pier.position.set(maxX + 0.04, 2.32, bz);
            pier.castShadow = true;
            arch.add(pier);
        }

        // Floor 1 Basement windows along the Park side (paired narrow basement windows in outer bays)
        if (idx !== 3) {
            const bsmtWin = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 1.15), glassMat);
            bsmtWin.userData.hideOnCutaway = true;
            bsmtWin.rotation.y = parkRotY;
            bsmtWin.position.set(maxX + 0.10, -0.45, bz);
            arch.add(bsmtWin);
        }
    });

    // Continuous Belt Course, Architrave & Classical Modillion Cornice along the NE Park Central Colonnade (ee41fcd9.jpg)
    const parkBelt = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, midSpanZ + 0.10), terraCottaTrimMat);
    parkBelt.position.set(maxX + 0.12, 4.375, midSectionZ);
    arch.add(parkBelt);

    const parkArchitrave = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.52, midSpanZ + 0.10), terraCottaTrimMat);
    parkArchitrave.position.set(maxX + 0.14, 13.81, midSectionZ);
    arch.add(parkArchitrave);

    buildClassicalModillionCornice(arch, maxX, midSectionZ, midSpanZ + 0.20, parkRotY, terraCottaMat, terraCottaTrimMat);

    // Raised Cream Terra-Cotta Parapet Entablature Tablet Inscribed "CHELAN COUNTY COURT HOUSE" on NE Park Side (ee41fcd9.jpg!)
    const parapetTablet = new THREE.Mesh(
        new THREE.BoxGeometry(19.50, 1.15, 0.28),
        chelanCourthouseParapetMat
    );
    parapetTablet.rotation.y = parkRotY;
    parapetTablet.position.set(maxX + 0.08, 17.85, midSectionZ);
    parapetTablet.castShadow = true;
    arch.add(parapetTablet);

    // 8. Rear NW Facade (lz = minZ = -17.425m, facing Building 401 & Park Vestibule Ramp)
    const rearRotY = Math.PI;
    // 3 Floor-2 rusticated granite windows on the right wall along & underneath the Washington St 3×3 Precast Connector Bridge
    // (rx = -13.15m, -10.45m, -7.85m, visible in media_1794271665627_a0514665.jpg & media_1794271688856_e8b00085.jpg!)
    [-13.15, -10.45, -7.85].forEach((rx) => {
        buildGraniteBaseWindow(arch, rx, 2.18, minZ, 0.92, 2.18, rearRotY, rusticatedGraniteMat, darkFrameMat, glassMat);
    });
    [-11.0, -5.5, 0.0, 4.2].forEach((rx) => {
        if (rx !== -11.0) {
            buildGraniteBaseWindow(arch, rx, 2.32, minZ, 1.50, 2.30, rearRotY, rusticatedGraniteMat, darkFrameMat, glassMat);
        }
        buildRecessedRectWindow(arch, rx, 6.40, minZ, 1.35, 2.45, rearRotY, darkFrameMat, glassMat, terraCottaTrimMat, true);
        buildRecessedRectWindow(arch, rx, 10.90, minZ, 1.35, 2.45, rearRotY, darkFrameMat, glassMat, terraCottaTrimMat, true);
        buildFriezeAtticWindow(arch, rx, 15.25, minZ, 1.25, 1.32, rearRotY, darkFrameMat, glassMat, terraCottaTrimMat);
    });
    // 3 narrow Floor 2 granite windows on the Rear Pavilion wall beside the Park Vestibule Ramp (visible in 6496ecdd.jpg & 9c4bd790.jpg!)
    [6.55, 7.75, 8.95].forEach((rx) => {
        buildGraniteBaseWindow(arch, rx, 2.24, minZ, 0.78, 2.22, rearRotY, rusticatedGraniteMat, darkFrameMat, glassMat);
    });
}

/**
 * Carved Cream Terra-Cotta "COUNTY BUILDING" Side Entrance Portal on Washington St (297c2294.jpg):
 * - Rosette-carved terra-cotta surround + dentiled cornice hood
 * - "COUNTY BUILDING" inscribed frieze flanked by 2 oval Scales-of-Justice cartouche medallions with urn finials
 * - Recessed dark-bronze entrance frame with upper glass transom, left solid dark-brown panel,
 *   center white "PLEASE USE OTHER ENTRANCE" sign, and right glass door
 * - 2 flanking patinated-green hexagonal wall-mounted coach lanterns on scroll brackets + red fire-alarm box
 */
function buildWashingtonStEntrancePortal(parent, sideX, bz, mats) {
    const {
        terraCottaMat,
        terraCottaTrimMat,
        countyBuildingFriezeMat,
        darkFrameMat,
        glassMat,
        verdigrisMat
    } = mats;

    const g = new THREE.Group();
    g.userData.hideOnCutaway = true;
    g.position.set(sideX, 0, bz);
    g.rotation.y = -Math.PI * 0.5;

    const openW = 2.28;
    const openH = 3.42;
    const jambW = 0.44;
    const outerW = openW + jambW * 2; // 3.16m

    // 1. Recessed Vestibule Backing, Threshold Sill & Storefront Frame (solid dark-brown left panel, right glass door, upper glass transom — 297c2294.jpg)
    //    Positioned in front of f2Body [z=0] and waterTableCap [z=+0.12] so the granite wall never clips through the doorway!
    const vestBackMat = new THREE.MeshStandardMaterial({ color: '#181c20', roughness: 0.75, metalness: 0.1 });
    const vestBack = new THREE.Mesh(new THREE.BoxGeometry(openW + 0.08, openH + 0.08, 0.04), vestBackMat);
    vestBack.position.set(0, openH * 0.5 + 0.02, 0.115);
    g.add(vestBack);

    const thresholdSill = new THREE.Mesh(new THREE.BoxGeometry(openW + 0.16, 0.38, 0.24), terraCottaTrimMat);
    thresholdSill.position.set(0, 0.19, 0.14);
    g.add(thresholdSill);

    const brownPanelMat = new THREE.MeshStandardMaterial({ color: '#42352c', roughness: 0.52, metalness: 0.15 });
    const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(openW * 0.46, 2.24, 0.06), brownPanelMat);
    leftPanel.position.set(-openW * 0.25, 0.10 + 1.12, 0.16);
    leftPanel.castShadow = true;
    leftPanel.receiveShadow = true;
    g.add(leftPanel);

    // Molded inset panel trim on the solid left leaf
    const leftInset = new THREE.Mesh(new THREE.BoxGeometry(openW * 0.34, 1.72, 0.018), darkFrameMat);
    leftInset.position.set(-openW * 0.25, 0.10 + 1.12, 0.192);
    g.add(leftInset);

    // Center mullion with white & red "PLEASE USE OTHER ENTRANCE" sign (297c2294.jpg)
    const centerMullion = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.28, 0.08), brownPanelMat);
    centerMullion.position.set(0, 0.10 + 1.14, 0.17);
    g.add(centerMullion);

    const signPlaque = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.32, 0.02),
        new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.4 })
    );
    signPlaque.position.set(0, 1.54, 0.215);
    g.add(signPlaque);

    // Right glass entrance door
    const rightDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(openW * 0.46, 2.24, 0.06), darkFrameMat);
    rightDoorFrame.position.set(openW * 0.25, 0.10 + 1.12, 0.16);
    rightDoorFrame.castShadow = true;
    rightDoorFrame.receiveShadow = true;
    g.add(rightDoorFrame);

    const rightDoorGlass = new THREE.Mesh(new THREE.PlaneGeometry(openW * 0.36, 1.88), glassMat);
    rightDoorGlass.position.set(openW * 0.25, 0.10 + 1.14, 0.194);
    g.add(rightDoorGlass);

    // Silver door pull handle & push bar on the right glass door
    const handleMat = new THREE.MeshStandardMaterial({ color: '#d8dee4', roughness: 0.22, metalness: 0.85 });
    const pullHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.38, 8), handleMat);
    pullHandle.position.set(openW * 0.09, 1.14, 0.212);
    g.add(pullHandle);

    const pushBar = new THREE.Mesh(new THREE.BoxGeometry(openW * 0.34, 0.038, 0.025), handleMat);
    pushBar.position.set(openW * 0.25, 1.06, 0.205);
    g.add(pushBar);

    // Horizontal transom bar & upper glass transom
    const tBar = new THREE.Mesh(new THREE.BoxGeometry(openW, 0.12, 0.10), brownPanelMat);
    tBar.position.set(0, 2.38, 0.18);
    g.add(tBar);

    const transomGlass = new THREE.Mesh(new THREE.PlaneGeometry(openW - 0.08, 1.00), glassMat);
    transomGlass.position.set(0, 2.92, 0.182);
    g.add(transomGlass);

    // 2. Carved Cream Terra-Cotta Surround with Rosette Medallions (297c2294.jpg)
    [-openW * 0.5 - jambW * 0.5, openW * 0.5 + jambW * 0.5].forEach((jx) => {
        const jamb = new THREE.Mesh(new THREE.BoxGeometry(jambW, openH + 0.42, 0.28), terraCottaMat);
        jamb.position.set(jx, (openH + 0.42) * 0.5, 0.15);
        jamb.castShadow = true;
        g.add(jamb);

        for (let ry = 0.62; ry <= 3.30; ry += 0.52) {
            const ros = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.05, 12), terraCottaTrimMat);
            ros.rotation.x = Math.PI * 0.5;
            ros.position.set(jx, ry, 0.30);
            g.add(ros);
        }
    });

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(outerW, 0.42, 0.30), terraCottaMat);
    lintel.position.set(0, openH + 0.21, 0.16);
    lintel.castShadow = true;
    g.add(lintel);

    for (let rx = -1.04; rx <= 1.04; rx += 0.52) {
        const ros = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.05, 12), terraCottaTrimMat);
        ros.rotation.x = Math.PI * 0.5;
        ros.position.set(rx, openH + 0.21, 0.32);
        g.add(ros);
    }

    // 3. Projecting Dentiled Cornice Hood (y = 3.84m .. 4.12m)
    const hood = new THREE.Mesh(new THREE.BoxGeometry(outerW + 0.28, 0.22, 0.46), terraCottaTrimMat);
    hood.position.set(0, 3.98, 0.22);
    hood.castShadow = true;
    g.add(hood);

    // 4. "COUNTY BUILDING" Inscribed Frieze Panel + 2 Oval Scales-of-Justice Cartouche Medallions with Urn Finials (297c2294.jpg!)
    const frieze = new THREE.Mesh(new THREE.BoxGeometry(openW + 0.10, 0.42, 0.28), countyBuildingFriezeMat);
    frieze.position.set(0, 4.34, 0.18);
    frieze.castShadow = true;
    g.add(frieze);

    [-openW * 0.5 - 0.22, openW * 0.5 + 0.22].forEach((cx) => {
        const ovalMedallion = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 14), terraCottaTrimMat);
        ovalMedallion.rotation.x = Math.PI * 0.5;
        ovalMedallion.scale.set(0.85, 1.0, 1.25);
        ovalMedallion.position.set(cx, 4.38, 0.22);
        ovalMedallion.castShadow = true;
        g.add(ovalMedallion);

        const finial = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 8), terraCottaMat);
        finial.position.set(cx, 4.74, 0.22);
        g.add(finial);
    });

    // 5. Two Patinated-Green Wall-Mounted Hexagonal Coach Lanterns flanking the Portal (297c2294.jpg)
    const coachGlassMat = new THREE.MeshStandardMaterial({
        color: '#e8ecea',
        emissive: '#ffe6a3',
        emissiveIntensity: 0.35,
        roughness: 0.25
    });
    coachGlassMat.userData = {
        isNightLitLantern: true,
        baseEmissive: 0.35,
        maxEmissive: 2.8,
        nightEmissiveHex: '#ffe6a3'
    };
    [-outerW * 0.5 - 0.58, outerW * 0.5 + 0.58].forEach((lx) => {
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.24), verdigrisMat);
        bracket.position.set(lx, 2.28, 0.12);
        g.add(bracket);

        const lanternCage = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.10, 0.34, 6),
            coachGlassMat
        );
        lanternCage.position.set(lx, 2.52, 0.22);
        g.add(lanternCage);

        const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.16, 6), verdigrisMat);
        lanternCap.position.set(lx, 2.74, 0.22);
        g.add(lanternCap);
    });

    // Warm architectural doorway & step light for the Washington St "COUNTY BUILDING" Side Entrance at night
    const washPortalLight = new THREE.PointLight('#ffcf86', 0, 12, 1.7);
    washPortalLight.position.set(0, 2.65, 1.25);
    washPortalLight.visible = false;
    washPortalLight.userData = { isEntranceNightLight: true, maxIntensity: 2.1 };
    g.add(washPortalLight);

    // Small red fire-alarm box to the right of the portal (297c2294.jpg)
    const fireBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.10, 0.12, 0.08),
        new THREE.MeshStandardMaterial({ color: '#c1121f', roughness: 0.4 })
    );
    fireBox.position.set(outerW * 0.5 + 0.12, 1.88, 0.05);
    g.add(fireBox);

    parent.add(g);
}

/**
 * NE Courthouse Park Side Entrance Portal with Rosette Surround, Double Glass Doors,
 * Scrolled Console Brackets, Dentiled Cornice Hood, Central Pedestal & White Globe Lantern
 * Modeled directly from reference photos 3e77aa21.jpg, e637f636.jpg & 45990f7d.jpg.
 */
function buildParkSideEntrancePortal(parent, sideX, bz, mats) {
    const {
        terraCottaMat,
        terraCottaTrimMat,
        parkDoorMat,
        darkFrameMat,
        glassMat
    } = mats;

    const g = new THREE.Group();
    g.userData.hideOnCutaway = true;
    g.position.set(sideX, 0, bz);
    g.rotation.y = Math.PI * 0.5;

    const openW = 2.42;
    const openH = 3.56;
    const jambW = 0.50;
    const outerW = openW + jambW * 2; // 3.42m

    // 1. Recessed Vestibule Alcove Backing, Threshold Sill & Soffit (3e77aa21.jpg)
    //    Positioned in front of f2Body [z=0] and waterTableCap [z=+0.12] so the granite wall never clips through the doors!
    const vestBackMat = new THREE.MeshStandardMaterial({ color: '#181c20', roughness: 0.75, metalness: 0.1 });
    const vestBack = new THREE.Mesh(new THREE.BoxGeometry(openW + 0.08, openH + 0.08, 0.04), vestBackMat);
    vestBack.position.set(0, openH * 0.5 + 0.02, 0.115);
    g.add(vestBack);

    const thresholdSill = new THREE.Mesh(new THREE.BoxGeometry(openW + 0.16, 0.40, 0.24), terraCottaTrimMat);
    thresholdSill.position.set(0, 0.20, 0.14);
    g.add(thresholdSill);

    const soffit = new THREE.Mesh(new THREE.BoxGeometry(openW + 0.16, 0.18, 0.30), terraCottaMat);
    soffit.position.set(0, openH + 0.05, 0.16);
    g.add(soffit);

    // 2. Double Grey-Taupe Entrance Doors with Tall Glass Lites & "EMERGENCY EXIT ONLY" Signs (3e77aa21.jpg, e637f636.jpg)
    const doorMat = parkDoorMat || new THREE.MeshStandardMaterial({ color: '#9b958b', roughness: 0.48, metalness: 0.14 });
    const signWhiteMat = new THREE.MeshStandardMaterial({ color: '#f4f6f8', roughness: 0.42 });
    const doorH = 2.32;
    const doorW = (openW - 0.14) * 0.5;

    [-doorW * 0.5 - 0.02, doorW * 0.5 + 0.02].forEach((dx, idx) => {
        const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.06), doorMat);
        doorLeaf.position.set(dx, 0.08 + doorH * 0.5, 0.165);
        doorLeaf.castShadow = true;
        doorLeaf.receiveShadow = true;
        g.add(doorLeaf);

        // Tall dark-tinted glass pane in each door leaf (3e77aa21.jpg)
        const dGlass = new THREE.Mesh(new THREE.PlaneGeometry(doorW - 0.26, 1.54), glassMat);
        dGlass.position.set(dx, 1.32, 0.198);
        g.add(dGlass);

        // White "EMERGENCY EXIT ONLY" sign + paper notice taped inside door glass (3e77aa21.jpg)
        const exitSign = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.01), signWhiteMat);
        exitSign.position.set(dx, 1.40, 0.204);
        g.add(exitSign);

        const paperNote = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.22, 0.01), signWhiteMat);
        paperNote.position.set(dx, 1.10, 0.204);
        g.add(paperNote);

        // Dark vertical push/pull plate near center meeting stile (3e77aa21.jpg)
        const handleX = idx === 0 ? dx + doorW * 0.38 : dx - doorW * 0.38;
        const pushPlate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.025), darkFrameMat);
        pushPlate.position.set(handleX, 1.08, 0.206);
        g.add(pushPlate);
    });

    // Center meeting astragal & horizontal transom bar (3e77aa21.jpg, e637f636.jpg)
    const astragal = new THREE.Mesh(new THREE.BoxGeometry(0.08, doorH, 0.08), darkFrameMat);
    astragal.position.set(0, 0.08 + doorH * 0.5, 0.172);
    g.add(astragal);

    const transomBar = new THREE.Mesh(new THREE.BoxGeometry(openW, 0.14, 0.12), darkFrameMat);
    transomBar.position.set(0, 2.46, 0.185);
    g.add(transomBar);

    // 3-Lite Glass Transom above the Double Doors (3e77aa21.jpg, e637f636.jpg)
    const transomGlass = new THREE.Mesh(new THREE.PlaneGeometry(openW - 0.08, 1.02), glassMat);
    transomGlass.position.set(0, 3.02, 0.185);
    g.add(transomGlass);

    [-openW * 0.18, openW * 0.18].forEach((tx) => {
        const tMull = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.02, 0.09), darkFrameMat);
        tMull.position.set(tx, 3.02, 0.19);
        g.add(tMull);
    });

    // 3. Carved Cream Terra-Cotta Portal Surround with Circular Rosette Medallions (3e77aa21.jpg!)
    [-openW * 0.5 - jambW * 0.5, openW * 0.5 + jambW * 0.5].forEach((jx) => {
        const jamb = new THREE.Mesh(new THREE.BoxGeometry(jambW, openH + 0.48, 0.30), terraCottaMat);
        jamb.position.set(jx, (openH + 0.48) * 0.5, 0.16);
        jamb.castShadow = true;
        g.add(jamb);

        for (let ry = 0.65; ry <= 3.45; ry += 0.56) {
            const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.05, 12), terraCottaTrimMat);
            rosette.rotation.x = Math.PI * 0.5;
            rosette.position.set(jx, ry, 0.32);
            g.add(rosette);
        }
    });

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(outerW, 0.46, 0.32), terraCottaMat);
    lintel.position.set(0, 3.79, 0.17);
    lintel.castShadow = true;
    g.add(lintel);

    for (let rx = -1.08; rx <= 1.08; rx += 0.54) {
        const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.05, 12), terraCottaTrimMat);
        rosette.rotation.x = Math.PI * 0.5;
        rosette.position.set(rx, 3.79, 0.34);
        g.add(rosette);
    }

    // 4. Two Scrolled Acanthus Console Brackets (Ancones) & Projecting Dentiled Cornice Hood (3e77aa21.jpg, e637f636.jpg)
    [-openW * 0.5 - 0.28, openW * 0.5 + 0.28].forEach((bx) => {
        const consoleBody = new THREE.Mesh(new THREE.BoxGeometry(0.30, 1.12, 0.42), terraCottaTrimMat);
        consoleBody.position.set(bx, 3.92, 0.25);
        consoleBody.castShadow = true;
        g.add(consoleBody);

        const topScroll = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.32, 12), terraCottaMat);
        topScroll.rotation.z = Math.PI * 0.5;
        topScroll.position.set(bx, 4.32, 0.42);
        g.add(topScroll);
    });

    const hoodW = outerW + 0.44;
    const hood = new THREE.Mesh(new THREE.BoxGeometry(hoodW, 0.28, 0.62), terraCottaTrimMat);
    hood.position.set(0, 4.62, 0.28);
    hood.castShadow = true;
    g.add(hood);

    // 5. Central Classical Sculpted Pedestal + White Globe Lantern atop the Park Entrance Hood (e637f636.jpg, 45990f7d.jpg!)
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.58, 0.44), terraCottaTrimMat);
    ped.position.set(0, 5.04, 0.34);
    ped.castShadow = true;
    g.add(ped);

    const pedCap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.18, 12), terraCottaMat);
    pedCap.position.set(0, 5.40, 0.34);
    g.add(pedCap);

    const parkGlobeMat = new THREE.MeshStandardMaterial({
        color: '#f8f6f0',
        emissive: '#ffe6a3',
        emissiveIntensity: 0.35,
        roughness: 0.25
    });
    parkGlobeMat.userData = {
        isNightLitLantern: true,
        baseEmissive: 0.35,
        maxEmissive: 2.8,
        nightEmissiveHex: '#ffe6a3'
    };
    const globe = new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 14, 12),
        parkGlobeMat
    );
    globe.position.set(0, 5.62, 0.34);
    g.add(globe);

    // Small red fire-alarm strobe on the rusticated granite wall to the right (-Z) of the portal (e637f636.jpg, 45990f7d.jpg)
    const fireStrobe = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.18, 0.09),
        new THREE.MeshStandardMaterial({ color: '#c1121f', roughness: 0.35 })
    );
    fireStrobe.position.set(outerW * 0.5 + 0.32, 3.62, 0.06);
    g.add(fireStrobe);

    const parkPortalLight = new THREE.PointLight('#ffcf86', 0, 12, 1.7);
    parkPortalLight.position.set(0, 2.65, 1.25);
    parkPortalLight.visible = false;
    parkPortalLight.userData = { isEntranceNightLight: true, maxIntensity: 1.9 };
    g.add(parkPortalLight);

    parent.add(g);
}

function buildRooftopEquipment(arch, midX, whiteRoofMat, trimMat, darkMat) {
    const roofY = 17.55;

    // White-painted rooftop elevator/mechanical penthouse near front-center (visible in a2489d57.jpg)
    const pent1 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.1, 3.6), whiteRoofMat);
    pent1.position.set(midX - 0.8, roofY + 1.05, 16.2);
    pent1.castShadow = true;
    pent1.receiveShadow = true;
    arch.add(pent1);

    // Secondary mechanical housing on rear roof (visible in f4021356.jpg & a2489d57.jpg)
    const pent2 = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.85, 6.8), whiteRoofMat);
    pent2.position.set(midX - 2.2, roofY + 0.925, 1.5);
    pent2.castShadow = true;
    arch.add(pent2);

    // Dark skylight / roof hatch in center of roof (visible in a2489d57.jpg)
    const skylight = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 2.8), darkMat);
    skylight.userData.hideOnCutaway = true;
    skylight.position.set(midX + 1.6, roofY + 0.22, 11.2);
    arch.add(skylight);

    // HVAC duct & condenser units
    const hvacMat = new THREE.MeshStandardMaterial({ color: '#9aa2a8', roughness: 0.5, metalness: 0.45 });
    [
        [midX + 3.2, 17.5, 1.8, 1.1, 1.6],
        [midX - 4.5, 10.5, 2.0, 1.2, 2.2],
        [midX + 2.8, -5.0, 2.4, 1.3, 2.0]
    ].forEach(([hx, hz, w, h, d]) => {
        const unit = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hvacMat);
        unit.position.set(hx, roofY + h * 0.5, hz);
        unit.castShadow = true;
        arch.add(unit);
    });
}
