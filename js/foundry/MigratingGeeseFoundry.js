import * as THREE from 'three';
import { preloadHighResBaldEagleGlb, createHighResBaldEagleActor } from './birds/BaldEagleHighRes.js';
import { disposeTransientObject3D } from './system/CrashResilienceWatchdog.js';
import { TREE_SPECIES_CATALOG } from './TreePlanterFoundry.js';
import { ChelanWelcomeBillboard } from './ChelanWelcomeBillboard.js';
import { ChelanWelcomeDroneSwarmEnding } from './ChelanWelcomeDroneSwarmEnding.js';

/**
 * MigratingGeeseFoundry — Wenatchee Valley & Columbia River Sky Bird System
 *
 * Randomly spawns (~once every minute) either:
 *   1. Solo Bald Eagle (white head & tail, yellow hooked beak, broad dark wings, long soaring glides & banking)
 *   2. Solo Red-Tailed Hawk (umber-brown mantle, cream belly, rust-red fan tail, thermal soaring & gentle S-turns)
 *   3. Solo Columbia River Osprey (white belly, dark M-angled wings, steady river-to-foothills cruise)
 *   4. Solo Common Raven (glossy obsidian black, diamond wedge tail, lower rooftop-level flight)
 *   5. Solo Ring-Billed Gull (white body, pearl-gray wings with black tips, sweeping coastal/river glide)
 *   6. Migrating Canada Geese V-Formation ("Skein" of 12–18 geese with black necks & white chinstraps)
 */
export class MigratingGeeseFoundry {
    constructor(scene, campusContext = {}) {
        this.scene = scene;
        this.camera = campusContext.camera || null;
        this._projVec = new THREE.Vector3();
        this.treePlanter = campusContext.treePlanter || null;
        this.campusGroup = campusContext.campusGroup || null;
        this.campusBuildings = campusContext.campusBuildings || [];
        this.getTerrainHeightFn = campusContext.getTerrainHeightFn || (() => 0);
        this.getBuildingRoadHeightFn = campusContext.getBuildingRoadHeightFn || (() => null);
        this.onEagleSpawn = campusContext.onEagleSpawn || null;
        this.onEagleSoarEnd = campusContext.onEagleSoarEnd || null;

        this.rootGroup = new THREE.Group();
        this.rootGroup.name = 'CampusSkyBirdsRootGroup';
        this.scene.add(this.rootGroup);

        this.perchingBirdsGroup = new THREE.Group();
        this.perchingBirdsGroup.name = 'CampusSparrowsAndDovesGroup';
        this.scene.add(this.perchingBirdsGroup);

        this.activeFlights = [];
        this.campusPerchingBirds = [];
        this.treePerches = [];
        this.buildingPerches = [];
        this._raycaster = new THREE.Raycaster();
        this.elapsedTime = 0;

        // Spawn migratory birds periodically (~45s initial, then every 60s)
        this.nextSpawnCountdown = 45.0;
        this.lastSpecies = null;

        this._initMaterials();
        this.welcomeBillboard = new ChelanWelcomeBillboard(this.scene);
        this.welcomeDroneSwarm = new ChelanWelcomeDroneSwarmEnding(this.scene);
        this.eagleEndings = [
            {
                id: 'welcome-text',
                label: 'Welcome to Chelan County — Floating Sky Typography',
                controller: this.welcomeBillboard
            },
            {
                id: 'welcome-drone-swarm',
                label: 'Welcome to Chelan County — Drone Light Show Formation',
                controller: this.welcomeDroneSwarm
            }
        ];
        this.nextEagleEndingIndex = 0;
        this.activeEagleEnding = this.eagleEndings[0];
        preloadHighResBaldEagleGlb();
        this.refreshCampusPerches();
        this._initCampusSparrowsAndDoves();
    }

    /**
     * Registers an additional Bald Eagle flyover ending controller into the growing `eagleEndings` catalog.
     */
    registerEagleEnding(endingSpec) {
        if (!endingSpec || !endingSpec.id || !endingSpec.controller) return;
        const existingIdx = this.eagleEndings.findIndex((e) => e.id === endingSpec.id);
        if (existingIdx >= 0) {
            this.eagleEndings[existingIdx] = endingSpec;
        } else {
            this.eagleEndings.push(endingSpec);
        }
    }

    /**
     * Hides all registered Bald Eagle ending controllers.
     */
    _hideAllEagleEndings() {
        for (let i = 0; i < this.eagleEndings.length; i++) {
            this.eagleEndings[i].controller?.hide?.();
        }
    }

    _initMaterials() {
        const makeMat = (color, roughness = 0.76, metalness = 0.04, doubleSide = false) => {
            const mat = new THREE.MeshStandardMaterial({
                color,
                roughness,
                metalness,
                side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
                fog: false
            });
            mat.userData = { sharedAsset: true };
            return mat;
        };

        this.mats = {
            gooseBody: makeMat('#635647', 0.78, 0.04, true),
            goosePrimary: makeMat('#2c2824', 0.80, 0.04, true),
            blackPlumage: makeMat('#16181b', 0.68, 0.08, true),
            whitePlumage: makeMat('#f8fafc', 0.74, 0.02, true),
            eagleBrown: makeMat('#2d2118', 0.78, 0.04, true),
            hawkBrown: makeMat('#5c4028', 0.78, 0.04, true),
            hawkCream: makeMat('#e8dec8', 0.80, 0.02, true),
            hawkRedTail: makeMat('#b84a27', 0.76, 0.03, true),
            gullGray: makeMat('#94a3b8', 0.74, 0.03, true),
            yellowBeak: makeMat('#eab308', 0.55, 0.08, false),
            orangeBeak: makeMat('#ea580c', 0.52, 0.06, false),
            sparrowChestnut: makeMat('#7c4d2b', 0.80, 0.03, true),
            sparrowWingTip: makeMat('#4a2e19', 0.82, 0.03, true),
            sparrowBuff: makeMat('#d8cbb8', 0.82, 0.02, true),
            dovePearlGray: makeMat('#b5ada3', 0.76, 0.03, true),
            doveRoseBuff: makeMat('#ccb8b0', 0.78, 0.03, true),
            doveSlateTip: makeMat('#52525b', 0.78, 0.03, true),
            // Ducks & Waterfowl materials
            mallardGreenHead: makeMat('#0d6338', 0.42, 0.28, false),
            mallardChestnut: makeMat('#6e2e1e', 0.76, 0.04, true),
            mallardSilverGray: makeMat('#cbd5e1', 0.76, 0.03, true),
            mallardSpeculumBlue: makeMat('#1d4ed8', 0.46, 0.24, true),
            mallardHenMottled: makeMat('#85603f', 0.80, 0.03, true),
            woodDuckTealCrown: makeMat('#115e59', 0.45, 0.26, false),
            woodDuckBurgundy: makeMat('#7f1d1d', 0.74, 0.04, true),
            woodDuckBronze: makeMat('#b45309', 0.76, 0.05, true),
            pintailChocolate: makeMat('#452615', 0.74, 0.04, false),
            canvasbackRustRed: makeMat('#8c2d19', 0.72, 0.04, false),
            heronSlateBlue: makeMat('#475569', 0.76, 0.04, true),
            heronWingTip: makeMat('#1e293b', 0.78, 0.04, true)
        };
    }

    /**
     * Builds an articulated 3D bird actor customized by species
     * (`goose`, `mallard-drake`, `mallard-hen`, `wood-duck`, `pintail`, `canvasback`,
     *  `trumpeter-swan`, `great-blue-heron`, `white-pelican`,
     *  `bald-eagle`, `red-tailed-hawk`, `osprey`, `raven`, `gull`, `sparrow`, `dove`).
     */
    _createBirdActor(species = 'goose', phaseOffset = 0, scale = 1.0) {
        if (species === 'bald-eagle') {
            return createHighResBaldEagleActor(phaseOffset, scale);
        }

        const bird = new THREE.Group();
        bird.scale.setScalar(scale);

        const isEagle = species === 'bald-eagle';
        const isHawk = species === 'red-tailed-hawk';
        const isOsprey = species === 'osprey';
        const isRaven = species === 'raven';
        const isGull = species === 'gull';
        const isGoose = species === 'goose';
        const isSparrow = species === 'sparrow';
        const isDove = species === 'dove';
        const isMallardDrake = species === 'mallard-drake';
        const isMallardHen = species === 'mallard-hen';
        const isWoodDuck = species === 'wood-duck';
        const isPintail = species === 'pintail';
        const isCanvasback = species === 'canvasback';
        const isDuck = isMallardDrake || isMallardHen || isWoodDuck || isPintail || isCanvasback;
        const isSwan = species === 'trumpeter-swan';
        const isHeron = species === 'great-blue-heron';
        const isPelican = species === 'white-pelican';

        const torsoMat = isEagle
            ? this.mats.eagleBrown
            : isHawk
            ? this.mats.hawkCream
            : isOsprey || isGull || isSwan || isPelican || isCanvasback
            ? this.mats.whitePlumage
            : isRaven
            ? this.mats.blackPlumage
            : isSparrow
            ? this.mats.sparrowBuff
            : isDove
            ? this.mats.doveRoseBuff
            : isMallardDrake || isPintail
            ? this.mats.mallardSilverGray
            : isMallardHen
            ? this.mats.mallardHenMottled
            : isWoodDuck
            ? this.mats.woodDuckBronze
            : isHeron
            ? this.mats.heronSlateBlue
            : this.mats.gooseBody;

        const innerWingMat = isEagle
            ? this.mats.eagleBrown
            : isHawk || isOsprey
            ? this.mats.hawkBrown
            : isRaven
            ? this.mats.blackPlumage
            : isGull || isPintail
            ? this.mats.gullGray
            : isSwan || isPelican || isCanvasback
            ? this.mats.whitePlumage
            : isSparrow
            ? this.mats.sparrowChestnut
            : isDove
            ? this.mats.dovePearlGray
            : isMallardDrake
            ? this.mats.gooseBody
            : isMallardHen
            ? this.mats.mallardHenMottled
            : isWoodDuck
            ? this.mats.woodDuckTealCrown
            : isHeron
            ? this.mats.heronSlateBlue
            : this.mats.gooseBody;

        const outerWingMat = isEagle
            ? this.mats.eagleBrown
            : isHawk
            ? this.mats.hawkBrown
            : isOsprey || isRaven || isGull || isPelican || isWoodDuck
            ? this.mats.blackPlumage
            : isSwan
            ? this.mats.whitePlumage
            : isHeron || isCanvasback
            ? this.mats.heronWingTip
            : isSparrow
            ? this.mats.sparrowWingTip
            : isDove
            ? this.mats.doveSlateTip
            : this.mats.goosePrimary;

        const tailMat = isEagle || isGull || isSwan || isPelican
            ? this.mats.whitePlumage
            : isHawk
            ? this.mats.hawkRedTail
            : isHeron
            ? this.mats.heronSlateBlue
            : isMallardHen
            ? this.mats.mallardHenMottled
            : isSparrow
            ? this.mats.sparrowChestnut
            : isDove
            ? this.mats.dovePearlGray
            : this.mats.blackPlumage;

        const headMat = isEagle || isOsprey || isGull || isSwan || isPelican
            ? this.mats.whitePlumage
            : isHawk
            ? this.mats.hawkBrown
            : isMallardDrake
            ? this.mats.mallardGreenHead
            : isMallardHen
            ? this.mats.mallardHenMottled
            : isWoodDuck
            ? this.mats.woodDuckTealCrown
            : isPintail
            ? this.mats.pintailChocolate
            : isCanvasback
            ? this.mats.canvasbackRustRed
            : isHeron
            ? this.mats.heronSlateBlue
            : isSparrow
            ? this.mats.sparrowChestnut
            : isDove
            ? this.mats.dovePearlGray
            : this.mats.blackPlumage;

        const beakMat = isEagle || isHawk || isGull || isMallardDrake || isHeron
            ? this.mats.yellowBeak
            : isWoodDuck || isPelican || isMallardHen
            ? this.mats.orangeBeak
            : this.mats.blackPlumage;

        // 1. Torso
        const torsoGeo = new THREE.SphereGeometry(0.25, 10, 8);
        torsoGeo.scale(
            isSparrow ? 0.92 : isPelican ? 0.96 : isDuck ? 0.88 : 0.85,
            isSparrow ? 0.84 : isDuck ? 0.74 : 0.72,
            isSwan ? 2.25 : isGoose ? 2.15 : isPelican ? 2.05 : isDuck ? 1.88 : isSparrow ? 1.42 : isDove ? 1.68 : 1.75
        );
        const torso = new THREE.Mesh(torsoGeo, torsoMat);
        torso.castShadow = true;
        bird.add(torso);

        if (isSparrow || isDove) {
            // Dorsal mantle saddle over the upper back
            const mantleGeo = new THREE.SphereGeometry(0.23, 8, 6);
            mantleGeo.scale(0.88, 0.55, isSparrow ? 1.32 : 1.55);
            const mantle = new THREE.Mesh(
                mantleGeo,
                isSparrow ? this.mats.sparrowChestnut : this.mats.dovePearlGray
            );
            mantle.position.set(0, 0.06, -0.02);
            bird.add(mantle);
        }

        if (isMallardDrake || isWoodDuck || isCanvasback) {
            // Forward breast plumage patch (chestnut on Mallard Drake, burgundy on Wood Duck, black on Canvasback)
            const breastGeo = new THREE.SphereGeometry(0.21, 8, 6);
            breastGeo.scale(0.92, 0.75, 1.15);
            const breastMat = isMallardDrake
                ? this.mats.mallardChestnut
                : isWoodDuck
                ? this.mats.woodDuckBurgundy
                : this.mats.blackPlumage;
            const breast = new THREE.Mesh(breastGeo, breastMat);
            breast.position.set(0, -0.01, 0.28);
            bird.add(breast);
        }

        // 2. Tail Feathers (-Z)
        const tailSpread = isHawk || isEagle ? 1.65 : isDove ? 1.38 : isRaven ? 1.25 : isPintail ? 0.72 : 1.05;
        const tailLen = isPintail ? 0.64 : isHawk || isEagle ? 0.44 : isDove ? 0.42 : isSparrow ? 0.28 : 0.34;
        const tailGeo = new THREE.ConeGeometry(0.22 * tailSpread, tailLen, 5);
        tailGeo.rotateX(-Math.PI * 0.5);
        tailGeo.scale(isPintail ? 0.75 : 1.15, 0.22, 1.0);
        const tail = new THREE.Mesh(tailGeo, tailMat);
        tail.position.set(0, 0.01, isSwan ? -0.66 : isGoose ? -0.62 : isPintail ? -0.64 : isSparrow ? -0.38 : -0.48);
        bird.add(tail);

        if (isHeron) {
            // Great Blue Heron trailing legs extending past the tail in flight
            const legGeo = new THREE.CylinderGeometry(0.016, 0.014, 0.68, 6);
            legGeo.rotateX(Math.PI * 0.5);
            const leftLeg = new THREE.Mesh(legGeo, this.mats.blackPlumage);
            leftLeg.position.set(0.055, -0.05, -0.72);
            const rightLeg = new THREE.Mesh(legGeo, this.mats.blackPlumage);
            rightLeg.position.set(-0.055, -0.05, -0.72);
            bird.add(leftLeg, rightLeg);
        }

        // 3. Neck, Head & Beak (+Z)
        const headGroup = new THREE.Group();
        bird.add(headGroup);

        if (isGoose || isSwan) {
            const rumpGeo = new THREE.SphereGeometry(0.19, 8, 6);
            rumpGeo.scale(0.82, 0.65, 1.15);
            const rump = new THREE.Mesh(rumpGeo, this.mats.whitePlumage);
            rump.position.set(0, -0.02, -0.46);
            bird.add(rump);

            const neckLen = isSwan ? 0.64 : 0.52;
            const neckGeo = new THREE.CylinderGeometry(0.054, 0.082, neckLen, 8);
            neckGeo.rotateX(Math.PI * 0.45);
            const neck = new THREE.Mesh(neckGeo, isSwan ? this.mats.whitePlumage : this.mats.blackPlumage);
            neck.position.set(0, 0.07, isSwan ? 0.72 : 0.66);
            headGroup.add(neck);

            const headZ = isSwan ? 1.02 : 0.92;
            const headGeo = new THREE.SphereGeometry(0.078, 8, 8);
            headGeo.scale(0.85, 0.85, 1.35);
            const head = new THREE.Mesh(headGeo, isSwan ? this.mats.whitePlumage : this.mats.blackPlumage);
            head.position.set(0, 0.12, headZ);
            headGroup.add(head);

            if (isGoose) {
                const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.068, 0.085), this.mats.whitePlumage);
                cheek.position.set(0, 0.105, 0.90);
                headGroup.add(cheek);
            }

            const beakGeo = new THREE.ConeGeometry(0.044, 0.17, 6);
            beakGeo.rotateX(Math.PI * 0.5);
            const beak = new THREE.Mesh(beakGeo, beakMat);
            beak.position.set(0, 0.115, headZ + 0.14);
            headGroup.add(beak);
        } else if (isDuck) {
            // Streamlined outstretched waterfowl neck, duck head, and flat spatulate duck bill
            const neckGeo = new THREE.CylinderGeometry(0.052, 0.076, 0.36, 8);
            neckGeo.rotateX(Math.PI * 0.43);
            const neckMat = isPintail
                ? this.mats.whitePlumage
                : isMallardDrake
                ? this.mats.mallardGreenHead
                : headMat;
            const neck = new THREE.Mesh(neckGeo, neckMat);
            neck.position.set(0, 0.06, 0.54);
            headGroup.add(neck);

            if (isMallardDrake) {
                // Crisp white collar ring on the Mallard Drake's neck
                const ringGeo = new THREE.CylinderGeometry(0.068, 0.072, 0.055, 8);
                ringGeo.rotateX(Math.PI * 0.43);
                const ring = new THREE.Mesh(ringGeo, this.mats.whitePlumage);
                ring.position.set(0, 0.045, 0.45);
                headGroup.add(ring);
            }

            const headGeo = new THREE.SphereGeometry(0.076, 8, 8);
            headGeo.scale(0.86, 0.84, 1.28);
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.set(0, 0.105, 0.74);
            headGroup.add(head);

            if (isWoodDuck) {
                // Swept-back iridescent crest on the Wood Duck's crown
                const crestGeo = new THREE.ConeGeometry(0.048, 0.14, 6);
                crestGeo.rotateX(-Math.PI * 0.42);
                const crest = new THREE.Mesh(crestGeo, this.mats.woodDuckTealCrown);
                crest.position.set(0, 0.145, 0.67);
                headGroup.add(crest);
            }

            // Flat spatulate duck bill
            const billGeo = new THREE.BoxGeometry(0.068, 0.028, 0.155);
            const bill = new THREE.Mesh(billGeo, beakMat);
            bill.position.set(0, 0.095, 0.87);
            headGroup.add(bill);
        } else {
            const headZ = isSparrow ? 0.34 : isDove ? 0.40 : isPelican || isHeron ? 0.52 : 0.46;
            const headY = isSparrow ? 0.09 : isDove ? 0.08 : isHeron ? 0.11 : 0.06;
            const headRadius = isSparrow ? 0.125 : isDove ? 0.105 : 0.11;
            headGroup.position.set(0, headY, headZ);

            const headGeo = new THREE.SphereGeometry(headRadius, 8, 8);
            headGeo.scale(0.92, 0.88, isSparrow ? 1.08 : 1.22);
            const head = new THREE.Mesh(headGeo, headMat);
            headGroup.add(head);

            if (isSparrow) {
                // Male House Sparrow dark throat bib & pale cheek patch
                const bib = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 6), this.mats.blackPlumage);
                bib.scale.set(0.85, 0.75, 0.90);
                bib.position.set(0, -0.055, 0.055);
                headGroup.add(bib);
            }

            const beakLen = isPelican ? 0.36 : isHeron ? 0.32 : isSparrow ? 0.12 : isDove ? 0.14 : 0.18;
            const beakR = isPelican ? 0.062 : isSparrow ? 0.052 : isDove ? 0.036 : 0.048;
            const beakGeo = new THREE.ConeGeometry(beakR, beakLen, 6);
            beakGeo.rotateX(Math.PI * 0.52);
            const beak = new THREE.Mesh(beakGeo, beakMat);
            beak.position.set(0, -0.015, headRadius + beakLen * 0.45);
            headGroup.add(beak);

            if (isPelican) {
                // Golden-orange throat pouch underneath the American White Pelican's bill
                const pouchGeo = new THREE.SphereGeometry(0.055, 6, 6);
                pouchGeo.scale(0.65, 0.95, 2.5);
                const pouch = new THREE.Mesh(pouchGeo, this.mats.orangeBeak);
                pouch.position.set(0, -0.055, headRadius + beakLen * 0.36);
                headGroup.add(pouch);
            }
        }

        // 4. Articulated Two-Segment Wings (Broad plank wings for Eagle/Hawk/Pelican, swept pointed wings for Ducks)
        const innerSpan = isPelican ? 0.92 : isSwan || isHeron ? 0.86 : isEagle || isHawk ? 0.82 : isOsprey || isGull ? 0.74 : isDuck ? 0.62 : 0.68;
        const outerSpan = isPelican ? 0.90 : isSwan || isHeron ? 0.86 : isEagle || isHawk ? 0.84 : isOsprey || isGull ? 0.80 : isDuck ? 0.66 : 0.72;
        const wingChord = isPelican || isEagle || isHawk || isHeron ? 0.28 : isDuck ? 0.19 : 0.22;

        const createWingAssembly = (sideSign) => {
            const shoulderPivot = new THREE.Group();
            shoulderPivot.position.set(sideSign * 0.18, 0.05, 0.06);

            const s = sideSign;
            const innerShape = new THREE.BufferGeometry();
            const innerVerts = new Float32Array([
                0.0, 0.0, wingChord,
                0.0, 0.0, -wingChord * 1.1,
                s * innerSpan, 0.0, -wingChord * 0.82,

                0.0, 0.0, wingChord,
                s * innerSpan, 0.0, -wingChord * 0.82,
                s * innerSpan, 0.0, wingChord * 0.88
            ]);
            innerShape.setAttribute('position', new THREE.BufferAttribute(innerVerts, 3));
            innerShape.computeVertexNormals();
            const innerMesh = new THREE.Mesh(innerShape, innerWingMat);
            innerMesh.castShadow = true;
            shoulderPivot.add(innerMesh);

            if (isMallardDrake || isMallardHen) {
                // Iridescent cobalt-blue speculum patch on the trailing edge of the Mallard inner wing
                const specGeo = new THREE.PlaneGeometry(innerSpan * 0.56, wingChord * 0.52);
                specGeo.rotateX(-Math.PI * 0.5);
                const specMesh = new THREE.Mesh(specGeo, this.mats.mallardSpeculumBlue);
                specMesh.position.set(s * innerSpan * 0.56, 0.008, -wingChord * 0.36);
                shoulderPivot.add(specMesh);
            }

            const wristPivot = new THREE.Group();
            wristPivot.position.set(s * innerSpan, 0.0, 0.0);

            const outerShape = new THREE.BufferGeometry();
            const outerVerts = new Float32Array([
                0.0, 0.0, wingChord * 0.88,
                0.0, 0.0, -wingChord * 0.82,
                s * outerSpan, 0.0, -wingChord * 1.05,

                0.0, 0.0, wingChord * 0.88,
                s * outerSpan, 0.0, -wingChord * 1.05,
                s * (outerSpan * 0.82), 0.0, 0.02
            ]);
            outerShape.setAttribute('position', new THREE.BufferAttribute(outerVerts, 3));
            outerShape.computeVertexNormals();
            const outerMesh = new THREE.Mesh(outerShape, outerWingMat);
            outerMesh.castShadow = true;
            wristPivot.add(outerMesh);

            shoulderPivot.add(wristPivot);
            bird.add(shoulderPivot);
            return { shoulderPivot, wristPivot };
        };

        const leftWing = createWingAssembly(1);
        const rightWing = createWingAssembly(-1);

        // Species-specific wingbeat frequency & thermal glide tendency
        const flapFreq = isHeron
            ? 7.2
            : isPelican
            ? 8.0
            : isEagle
            ? 8.5
            : isHawk
            ? 9.5
            : isOsprey
            ? 11.0
            : isSwan
            ? 11.5
            : isGull
            ? 12.5
            : isRaven
            ? 15.5
            : isDove
            ? 21.0
            : isDuck
            ? 22.5 + (Math.random() - 0.5) * 2.4 // Ducks have brisk, rapid waterfowl wingbeats
            : isSparrow
            ? 26.5
            : 18.0 + (Math.random() - 0.5) * 2.0;

        const glideThreshold = isEagle || isPelican
            ? -0.25 // Glides ~60% of the time
            : isHawk
            ? -0.15 // Glides ~55% of the time
            : isOsprey || isGull
            ? 0.20  // Glides ~40% of the time
            : isHeron
            ? 0.42
            : isDove
            ? 0.45  // Doves alternate brisk flapping bursts with smooth glides
            : isSparrow
            ? 0.52  // Sparrows do bounding flap-flap-glide flights
            : isRaven
            ? 0.55  // Glides ~25% of the time
            : isDuck
            ? 0.88  // Ducks beat their wings almost continuously in direct flight
            : 0.82; // Geese & Swans flap steadily with occasional short glides

        return {
            mesh: bird,
            headGroup,
            tail,
            leftWing,
            rightWing,
            phaseOffset,
            flapFreq,
            glideThreshold,
            species
        };
    }

    /**
     * Collects 3D tree canopy perches from user-planted trees (`treePlanter.plantedTrees`)
     * plus campus lawn/park trees & shrubs, and building rooftop/parapet/cornice perches
     * across all 8 Chelan County campus buildings.
     */
    refreshCampusPerches() {
        const treePerches = [];

        // 1. Live planted trees from TreePlanterFoundry
        const planted = this.treePlanter?.plantedTrees || [];
        const heightByType = {};
        for (let s = 0; s < TREE_SPECIES_CATALOG.length; s++) {
            const entry = TREE_SPECIES_CATALOG[s];
            heightByType[entry.id] = entry.defaultHeight || 9.2;
        }
        const narrowTypes = new Set(['columnar_poplar', 'arborvitae', 'arborvitae_clump', 'street_sapling']);

        for (let i = 0; i < planted.length; i++) {
            const t = planted[i];
            if (!t || typeof t.x !== 'number' || typeof t.z !== 'number') continue;
            const baseH = heightByType[t.type] || 9.2;
            const isBush = baseH < 3.0;
            const isNarrow = narrowTypes.has(t.type);
            const scale = typeof t.scale === 'number' ? t.scale : 1.0;
            const treeH = baseH * scale;
            const groundY = typeof t.y === 'number' ? t.y : this.getTerrainHeightFn(t.x, t.z);

            const branchCount = isBush ? 1 : (isNarrow ? 2 : 3);
            for (let b = 0; b < branchCount; b++) {
                const ang = (i * 2.1 + b * 2.09) % (Math.PI * 2);
                const rad = (isBush ? 0.32 : (isNarrow ? 0.38 + (b % 2) * 0.22 : 0.85 + (b % 2) * 0.75)) * scale;
                const hFrac = isBush ? 0.85 : 0.56 + b * 0.12;
                treePerches.push({
                    type: 'tree',
                    x: t.x + Math.cos(ang) * rad,
                    y: groundY + treeH * hFrac,
                    z: t.z + Math.sin(ang) * rad
                });
            }
        }

        // 2. Built-in campus lawn, park & street tree/arborvitae canopy anchors across all campus blocks
        const campusTreeSpots = [
            // Courthouse 350 Park, Orondo Ave & Washington St lawns
            { x: 65.5, z: 22.4, h: 7.4 },
            { x: 74.2, z: 8.5, h: 8.2 },
            { x: 52.8, z: 33.6, h: 6.8 },
            { x: 39.4, z: 24.2, h: 7.5 },
            { x: 64.0, z: -4.8, h: 6.6 },
            // Building 400 Douglas St forecourt & Washington St lawns
            { x: -24.5, z: 18.2, h: 6.8 },
            { x: -38.4, z: 21.5, h: 7.2 },
            { x: -46.2, z: 9.8, h: 6.5 },
            // Building 316 & Building 300 Washington / Orondo landscaped terraces
            { x: -11.5, z: 58.4, h: 7.0 },
            { x: 12.8, z: 42.5, h: 7.6 },
            { x: 34.5, z: 56.2, h: 7.4 },
            { x: 16.4, z: 88.5, h: 6.9 },
            // Building 401 Washington St brick promenade & south lawn
            { x: -16.8, z: -24.5, h: 6.4 },
            { x: 18.5, z: -26.2, h: 7.2 },
            { x: 31.2, z: -12.4, h: 6.8 },
            // Building 411/412 & 428 yard shade trees
            { x: -64.5, z: -4.2, h: 6.2 },
            { x: -8.2, z: 146.5, h: 6.4 }
        ];

        for (let i = 0; i < campusTreeSpots.length; i++) {
            const spot = campusTreeSpots[i];
            const gy = this.getTerrainHeightFn(spot.x, spot.z);
            treePerches.push({
                type: 'tree',
                x: spot.x,
                y: gy + spot.h * 0.72,
                z: spot.z
            });
            treePerches.push({
                type: 'tree',
                x: spot.x + 1.1 * Math.cos(i * 1.7),
                y: gy + spot.h * 0.58,
                z: spot.z + 1.1 * Math.sin(i * 1.7)
            });
        }

        this.treePerches = treePerches;

        // 3. Building rooftop parapet, cornice & portico ledges across all campus buildings
        const buildingPerches = [];
        const bldgs = this.campusBuildings || [];

        for (let b = 0; b < bldgs.length; b++) {
            const bldg = bldgs[b];
            const fp = bldg.footprint;
            if (!Array.isArray(fp) || fp.length < 3) continue;

            const splitRoadY = this.getBuildingRoadHeightFn(bldg.id);
            const baseY = splitRoadY !== null
                ? splitRoadY
                : this.getTerrainHeightFn(bldg.center[0], bldg.center[1]);

            const roofRelH = (bldg.id === 'building-300' || bldg.code === '300')
                ? 6.6
                : (bldg.id === 'building-428' || bldg.code === '428')
                ? 4.8
                : (splitRoadY !== null
                    ? ((bldg.floors || 3) - 1) * 4.2 + 0.45
                    : (bldg.height || 12.0));

            const fallbackRoofY = baseY + roofRelH;
            const cx = bldg.center[0];
            const cz = bldg.center[1];

            for (let i = 0; i < fp.length; i++) {
                const p0 = fp[i];
                const p1 = fp[(i + 1) % fp.length];
                const segLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
                if (segLen < 3.5) continue;

                const samples = segLen > 18 ? [0.25, 0.5, 0.75] : [0.5];
                for (let s = 0; s < samples.length; s++) {
                    const u = samples[s];
                    const ex = p0[0] + (p1[0] - p0[0]) * u;
                    const ez = p0[1] + (p1[1] - p0[1]) * u;
                    // Inset slightly toward building center so the bird perches right on the parapet coping / cornice
                    const toCenterLen = Math.hypot(cx - ex, cz - ez) || 1;
                    const px = ex + ((cx - ex) / toCenterLen) * 0.35;
                    const pz = ez + ((cz - ez) / toCenterLen) * 0.35;

                    let py = fallbackRoofY;
                    if (this.campusGroup) {
                        this._raycaster.set(new THREE.Vector3(px, 65, pz), new THREE.Vector3(0, -1, 0));
                        const hits = this._raycaster.intersectObject(this.campusGroup, true);
                        if (hits.length > 0 && hits[0].point.y > baseY + 2.2) {
                            py = hits[0].point.y + 0.08;
                        }
                    }

                    buildingPerches.push({
                        type: 'building',
                        buildingId: bldg.id,
                        x: px,
                        y: py,
                        z: pz
                    });
                }
            }
        }

        this.buildingPerches = buildingPerches;
    }

    _pickPerch(targetType, fromPos = null) {
        // Refresh tree perches dynamically if the user planted new trees in TreePlanterFoundry
        const plantedCount = this.treePlanter?.plantedTrees?.length || 0;
        if (this._lastPlantedTreeCount !== plantedCount) {
            this._lastPlantedTreeCount = plantedCount;
            this.refreshCampusPerches();
        }

        const pool = targetType === 'tree' ? this.treePerches : this.buildingPerches;
        if (!pool || pool.length === 0) {
            return new THREE.Vector3(0, 8, 0);
        }

        if (!fromPos) {
            const p = pool[Math.floor(Math.random() * pool.length)];
            return new THREE.Vector3(p.x, p.y, p.z);
        }

        // Prefer nearby perches (12m .. 95m) so sparrows and doves visibly dart between neighboring trees and buildings
        const nearby = [];
        for (let i = 0; i < pool.length; i++) {
            const p = pool[i];
            const d = Math.hypot(p.x - fromPos.x, p.z - fromPos.z);
            if (d >= 10.0 && d <= 98.0) {
                nearby.push(p);
            }
        }
        const chosenPool = nearby.length > 0 ? nearby : pool;
        const picked = chosenPool[Math.floor(Math.random() * chosenPool.length)];
        return new THREE.Vector3(
            picked.x + (Math.random() - 0.5) * 0.45,
            picked.y,
            picked.z + (Math.random() - 0.5) * 0.45
        );
    }

    _setFoldedWingPose(actor, isFolded) {
        if (isFolded) {
            // Tuck wings neatly back along the torso while perched on a tree branch or building ledge
            actor.leftWing.shoulderPivot.rotation.set(0.12, -1.18, -0.32);
            actor.leftWing.wristPivot.rotation.set(0, -0.35, -0.18);
            actor.rightWing.shoulderPivot.rotation.set(0.12, 1.18, 0.32);
            actor.rightWing.wristPivot.rotation.set(0, 0.35, 0.18);
            actor.mesh.rotation.x = -0.26; // Upright perching posture
        } else {
            actor.leftWing.shoulderPivot.rotation.set(0, 0, 0);
            actor.leftWing.wristPivot.rotation.set(0, 0, 0);
            actor.rightWing.shoulderPivot.rotation.set(0, 0, 0);
            actor.rightWing.wristPivot.rotation.set(0, 0, 0);
            actor.mesh.rotation.x = 0;
        }
    }

    /**
     * Initializes 8 resident campus Sparrows and Doves that continuously fly out from trees
     * to land on buildings, and fly from buildings back into trees.
     */
    _initCampusSparrowsAndDoves() {
        const totalCount = 8; // 5 House Sparrows + 3 Mourning Doves
        for (let i = 0; i < totalCount; i++) {
            const species = i < 5 ? 'sparrow' : 'dove';
            const scale = species === 'sparrow'
                ? 0.58 + Math.random() * 0.08
                : 0.78 + Math.random() * 0.10;

            const actor = this._createBirdActor(species, Math.random() * Math.PI * 2, scale);
            const birdGroup = new THREE.Group();
            birdGroup.name = `CampusPerching_${species}_${i}`;
            birdGroup.add(actor.mesh);
            this.perchingBirdsGroup.add(birdGroup);

            // Alternate starting location between trees and buildings
            const startPerchType = i % 2 === 0 ? 'tree' : 'building';
            const startPos = this._pickPerch(startPerchType, null);
            birdGroup.position.copy(startPos);
            birdGroup.rotation.y = Math.random() * Math.PI * 2;
            this._setFoldedWingPose(actor, true);

            const birdEntry = {
                id: i,
                species,
                group: birdGroup,
                actor,
                state: 'perched', // 'perched' | 'flying'
                perchType: startPerchType, // 'tree' | 'building'
                perchTimer: 0.4 + (i * 0.55) + Math.random() * 1.5, // Staggered initial takeoffs
                startPos: startPos.clone(),
                endPos: startPos.clone(),
                arcHeight: 4.5,
                swerveSign: Math.random() < 0.5 ? 1 : -1,
                swerveAmp: 1.5,
                flightDuration: 4.0,
                flightElapsed: 0,
                lookPhase: Math.random() * 10.0
            };

            this.campusPerchingBirds.push(birdEntry);
        }
    }

    _launchPerchingBird(b, overrideTargetPos = null, overrideTargetType = null) {
        const nextType = overrideTargetType || (b.perchType === 'tree' ? 'building' : 'tree');
        b.startPos.copy(b.group.position);
        const targetPos = overrideTargetPos
            ? overrideTargetPos.clone()
            : this._pickPerch(nextType, b.startPos);

        // If landing on a building, refine the exact 3D roof/parapet height via downward raycast
        if (nextType === 'building' && this.campusGroup) {
            this._raycaster.set(new THREE.Vector3(targetPos.x, 65, targetPos.z), new THREE.Vector3(0, -1, 0));
            const hits = this._raycaster.intersectObject(this.campusGroup, true);
            if (hits.length > 0 && hits[0].point.y > -2.0) {
                targetPos.y = hits[0].point.y + 0.08;
            }
        }

        b.endPos.copy(targetPos);
        b.perchType = nextType;
        b.state = 'flying';
        b.flightElapsed = 0;

        const horizDist = Math.hypot(b.endPos.x - b.startPos.x, b.endPos.z - b.startPos.z);
        const totalDist = Math.max(6.0, b.startPos.distanceTo(b.endPos));
        const cruiseSpeed = b.species === 'sparrow'
            ? 9.2 + Math.random() * 2.4
            : 10.8 + Math.random() * 2.6;

        b.flightDuration = totalDist / cruiseSpeed;
        b.arcHeight = Math.min(10.5, Math.max(3.2, horizDist * 0.14 + Math.random() * 2.4));
        b.swerveSign = Math.random() < 0.5 ? 1 : -1;
        b.swerveAmp = Math.min(4.2, horizDist * 0.06);

        this._setFoldedWingPose(b.actor, false);
    }

    _updateCampusSparrowsAndDoves(dt) {
        for (let i = 0; i < this.campusPerchingBirds.length; i++) {
            const b = this.campusPerchingBirds[i];

            if (b.state === 'perched') {
                b.perchTimer -= dt;

                // Subtle perched life animations: looking around, tail bobbing, slight hop
                const t = this.elapsedTime + b.lookPhase;
                b.actor.headGroup.rotation.y = Math.sin(t * 1.9) * 0.42 + Math.sin(t * 4.3) * 0.15;
                b.actor.headGroup.rotation.x = Math.sin(t * 2.7) * 0.12;
                b.actor.tail.rotation.x = -Math.PI * 0.5 + Math.sin(t * 3.4) * 0.08;

                if (b.perchTimer <= 0) {
                    this._launchPerchingBird(b);

                    // 35% chance a nearby perched sparrow/dove takes off right afterward as a pair/trio
                    if (Math.random() < 0.35) {
                        for (let j = 0; j < this.campusPerchingBirds.length; j++) {
                            const mate = this.campusPerchingBirds[j];
                            if (mate !== b && mate.state === 'perched' && mate.species === b.species) {
                                const d = mate.group.position.distanceTo(b.startPos);
                                if (d < 28.0 && mate.perchTimer > 0.6) {
                                    mate.perchTimer = 0.22 + Math.random() * 0.40;
                                    break;
                                }
                            }
                        }
                    }
                }
                continue;
            }

            // Active flight between tree canopy and building ledge (or building ledge to tree canopy)
            b.flightElapsed += dt;
            const rawU = b.flightElapsed / b.flightDuration;

            if (rawU >= 1.0) {
                b.group.position.copy(b.endPos);
                b.group.rotation.x = 0;
                b.group.rotation.z = 0;
                b.actor.mesh.position.set(0, 0, 0);
                this._setFoldedWingPose(b.actor, true);
                b.state = 'perched';
                // Stay perched on the building or tree for 3.5s .. 11.5s before flying back
                b.perchTimer = 3.5 + Math.random() * 8.0;
                continue;
            }

            // Smooth ease-out near landing so the bird decelerates and flares cleanly onto its perch
            const u = rawU < 0.78
                ? rawU
                : 0.78 + (1.0 - Math.pow(1.0 - (rawU - 0.78) / 0.22, 1.85)) * 0.22;

            const prevPos = b.group.position.clone();
            b.group.position.lerpVectors(b.startPos, b.endPos, u);

            // Parabolic swoop/arc above obstacles + subtle lateral S-weave
            const arcY = Math.sin(u * Math.PI) * b.arcHeight;
            b.group.position.y += arcY;

            const dx = b.endPos.x - b.startPos.x;
            const dz = b.endPos.z - b.startPos.z;
            const hLen = Math.hypot(dx, dz) || 1;
            const perpX = -dz / hLen;
            const perpZ = dx / hLen;
            const latWave = Math.sin(u * Math.PI * 2.0) * b.swerveAmp * b.swerveSign * (1.0 - u * 0.5);
            b.group.position.x += perpX * latWave;
            b.group.position.z += perpZ * latWave;

            // Orient along instantaneous velocity vector
            const vx = b.group.position.x - prevPos.x;
            const vy = b.group.position.y - prevPos.y;
            const vz = b.group.position.z - prevPos.z;
            const vHoriz = Math.hypot(vx, vz);
            if (vHoriz > 0.0005) {
                const targetYaw = Math.atan2(vx, vz);
                b.group.rotation.y = targetYaw;
                // Pitch nose up during landing flare (u > 0.82), otherwise follow climb/dive slope
                const slopePitch = Math.atan2(vy, vHoriz);
                const landingFlare = u > 0.82 ? ((u - 0.82) / 0.18) * 0.38 : 0.0;
                b.group.rotation.x = THREE.MathUtils.clamp(-slopePitch * 0.55 - landingFlare, -0.48, 0.42);
                b.group.rotation.z = -Math.cos(u * Math.PI * 2.0) * 0.16 * b.swerveSign * (1.0 - u);
            }

            // Articulated flapping & landing-flare wing kinematics
            const actor = b.actor;
            const flapPhase = b.flightElapsed * actor.flapFreq + actor.phaseOffset;
            const isLandingFlare = u > 0.82;
            const isTakeoffBurst = u < 0.22;
            const glideWave = Math.sin(b.flightElapsed * 3.8 + actor.phaseOffset);
            const isGliding = !isTakeoffBurst && !isLandingFlare && glideWave > actor.glideThreshold;

            const flapAmp = isLandingFlare ? 1.18 : isTakeoffBurst ? 1.15 : isGliding ? 0.10 : 1.0;
            const s = Math.sin(flapPhase);
            const c = Math.cos(flapPhase);

            const shoulderAngle = s * 0.62 * flapAmp + 0.10;
            const wristAngle = (Math.sin(flapPhase - 0.75) * 0.50 - 0.10) * flapAmp;

            actor.leftWing.shoulderPivot.rotation.set(isLandingFlare ? 0.22 : 0, 0, shoulderAngle);
            actor.leftWing.wristPivot.rotation.set(0, 0, wristAngle);
            actor.rightWing.shoulderPivot.rotation.set(isLandingFlare ? 0.22 : 0, 0, -shoulderAngle);
            actor.rightWing.wristPivot.rotation.set(0, 0, -wristAngle);

            actor.headGroup.rotation.set(0, 0, 0);
            actor.tail.rotation.x = -Math.PI * 0.5 + (isLandingFlare ? 0.28 : 0.0);
            actor.mesh.position.set(0, -c * 0.025 * flapAmp, 0);
        }
    }

    /**
     * Returns display metadata (icon + title + plural unit label) for any migratory sky bird / waterfowl species.
     */
    getSpeciesDisplayInfo(species) {
        const infoMap = {
            'goose': { label: 'Canada Geese V-Flock', icon: '🦆', unit: 'Geese' },
            'geese-v-flock': { label: 'Canada Geese V-Flock', icon: '🦆', unit: 'Geese' },
            'mallard-flock': { label: 'Mallard Duck Flock', icon: '🦆', unit: 'Ducks' },
            'mallard-pair': { label: 'Mallard Drake & Hen Pair', icon: '🦆', unit: 'Ducks' },
            'mallard-drake': { label: 'Mallard Drake', icon: '🦆', unit: 'Ducks' },
            'wood-duck-flock': { label: 'Wood Duck Flock', icon: '🦆', unit: 'Ducks' },
            'pintail-flock': { label: 'Northern Pintail Echelon', icon: '🦆', unit: 'Ducks' },
            'canvasback-flock': { label: 'Canvasback Duck Wedge', icon: '🦆', unit: 'Ducks' },
            'trumpeter-swan-flock': { label: 'Trumpeter Swan V-Flock', icon: '🦢', unit: 'Swans' },
            'white-pelican-flock': { label: 'American White Pelican Squadron', icon: '🦢', unit: 'Pelicans' },
            'great-blue-heron': { label: 'Great Blue Heron', icon: '🦤', unit: 'Heron' },
            'bald-eagle': { label: 'Bald Eagle', icon: '🦅', unit: 'Eagle' },
            'red-tailed-hawk': { label: 'Red-Tailed Hawk', icon: '🦅', unit: 'Hawk' },
            'osprey': { label: 'Columbia River Osprey', icon: '🦅', unit: 'Osprey' },
            'raven': { label: 'Common Raven', icon: '🐦‍⬛', unit: 'Raven' },
            'gull': { label: 'Ring-Billed Gull', icon: '🕊️', unit: 'Gull' }
        };
        return infoMap[species] || { label: 'Migratory Waterfowl', icon: '🦆', unit: 'Birds' };
    }

    /**
     * Picks a random bird / waterfowl type (ducks, geese, swans, pelicans, heron, and raptors)
     * and spawns it on a natural flight path across the campus sky.
     * @param {boolean} forFollowView - If true, starts closer to the campus core for an immediate scenic aerial view.
     */
    spawnRandomBirdEvent(forFollowView = false) {
        const catalog = [
            'bald-eagle',
            'mallard-flock',
            'wood-duck-flock',
            'pintail-flock',
            'canvasback-flock',
            'mallard-pair',
            'trumpeter-swan-flock',
            'white-pelican-flock',
            'great-blue-heron',
            'geese-v-flock',
            'red-tailed-hawk',
            'osprey',
            'raven',
            'gull'
        ];

        if (!this.recentSpecies) this.recentSpecies = [];
        let picked;
        // On background sky spawns, feature the signature Bald Eagle regularly (~30% chance if not the immediately previous bird)
        if (!forFollowView && this.lastSpecies !== 'bald-eagle' && Math.random() < 0.30) {
            picked = 'bald-eagle';
        } else {
            const choices = catalog.filter((s) => !this.recentSpecies.includes(s));
            const pool = choices.length > 0 ? choices : catalog;
            picked = pool[Math.floor(Math.random() * pool.length)];
        }

        this.recentSpecies.push(picked);
        if (this.recentSpecies.length > 7) {
            this.recentSpecies.shift();
        }
        this.lastSpecies = picked;

        let flight;
        if (picked === 'bald-eagle') {
            flight = this.spawnBaldEagleSoar();
        } else if (picked === 'geese-v-flock') {
            flight = this.spawnGeeseVFlock(forFollowView);
        } else if (
            picked === 'mallard-flock' ||
            picked === 'wood-duck-flock' ||
            picked === 'pintail-flock' ||
            picked === 'canvasback-flock' ||
            picked === 'trumpeter-swan-flock' ||
            picked === 'white-pelican-flock'
        ) {
            flight = this.spawnWaterfowlFlock(picked, forFollowView);
        } else if (picked === 'mallard-pair') {
            flight = this.spawnMallardPair(forFollowView);
        } else {
            flight = this.spawnSoloBird(picked, forFollowView);
        }
        this.followedFlight = flight;
        return flight;
    }

    /**
     * Removes a transient flight group from `rootGroup` and disposes all per-flight WebGL
     * `BufferGeometry` / transient material buffers so VRAM never leaks across hours of runtime.
     */
    _disposeFlightGroup(group) {
        if (!group) return;
        this.rootGroup.remove(group);
        disposeTransientObject3D(group);
    }

    /**
     * Disposes any background (non-followed) flights during a soft VRAM purge.
     */
    purgeBackgroundFlights() {
        for (let i = this.activeFlights.length - 1; i >= 0; i--) {
            const fl = this.activeFlights[i];
            if (fl !== this.followedFlight) {
                this._disposeFlightGroup(fl.group);
                this.activeFlights.splice(i, 1);
            }
        }
    }

    /**
     * Ensures there is an active migratory flight suitable for the Bird's-Eye Chase Camera,
     * spawning a new one immediately if none is active (or if `forceNext` is true).
     */
    ensureFollowedFlight(forceNext = false) {
        if (forceNext) {
            if (this.followedFlight) {
                const idx = this.activeFlights.indexOf(this.followedFlight);
                if (idx !== -1) {
                    this._disposeFlightGroup(this.followedFlight.group);
                    this.activeFlights.splice(idx, 1);
                }
            }
            return this.spawnRandomBirdEvent(true);
        }

        // Never cut a 30-second Bald Eagle campus soar short before its full 30.0s completion!
        if (
            this.followedFlight &&
            this.followedFlight.isOrbitalEagleSoar &&
            this.activeFlights.includes(this.followedFlight)
        ) {
            return this.followedFlight;
        }

        if (
            this.followedFlight &&
            this.activeFlights.includes(this.followedFlight) &&
            (this.followedFlight.traveled / this.followedFlight.totalDist) < 0.86
        ) {
            return this.followedFlight;
        }

        for (let i = this.activeFlights.length - 1; i >= 0; i--) {
            const candidate = this.activeFlights[i];
            const limit = candidate.isOrbitalEagleSoar ? 0.999 : 0.82;
            if ((candidate.traveled / candidate.totalDist) < limit) {
                this.followedFlight = candidate;
                return candidate;
            }
        }

        return this.spawnRandomBirdEvent(true);
    }

    /**
     * Returns the current world position, forward heading, bank angle, and species metadata
     * for the active migratory bird / waterfowl flock being followed by the chase camera.
     */
    getFollowedFlightPose() {
        const flight = this.ensureFollowedFlight(false);
        if (!flight) return null;

        const leadActor = flight.birds[0];
        const worldPos = flight.group.position.clone();
        if (leadActor && leadActor.mesh) {
            worldPos.y += leadActor.mesh.position.y * 0.45;
        }

        const heading = flight.group.rotation.y;
        const bank = flight.group.rotation.z || 0;
        const progress = THREE.MathUtils.clamp(flight.traveled / flight.totalDist, 0, 1);
        const info = this.getSpeciesDisplayInfo(flight.species);
        const remainingSeconds = flight.isOrbitalEagleSoar
            ? Math.max(0, flight.totalDist - flight.traveled)
            : null;

        return {
            flight,
            position: worldPos,
            heading,
            bank,
            progress,
            isOrbitalEagleSoar: Boolean(flight.isOrbitalEagleSoar),
            endingId: flight.endingId || null,
            endingLabel: flight.endingLabel || null,
            remainingSeconds,
            type: flight.type,
            species: flight.species,
            label: info.label,
            icon: info.icon,
            unit: info.unit || 'Birds',
            birdCount: flight.birds.length
        };
    }

    /**
     * Spawns a mated pair of Mallard Ducks (Drake with emerald head + Hen with mottled brown plumage)
     * flying wingtip-to-wingtip across the campus.
     */
    spawnMallardPair(forFollowView = false) {
        const pairGroup = new THREE.Group();
        pairGroup.name = 'FlyingMallardPair';

        const headingAngle = Math.random() * Math.PI * 2;
        const altitudeY = forFollowView
            ? 32.0 + Math.random() * 12.0
            : 30.0 + Math.random() * 22.0;

        const targetCenterX = forFollowView ? (Math.random() - 0.5) * 60.0 : (Math.random() - 0.5) * 125.0;
        const targetCenterZ = forFollowView ? 10.0 + (Math.random() - 0.5) * 60.0 : (Math.random() - 0.5) * 125.0;
        const flightHalfSpan = forFollowView ? 140.0 + Math.random() * 20.0 : 200.0 + Math.random() * 45.0;

        const dirX = Math.sin(headingAngle);
        const dirZ = Math.cos(headingAngle);

        const startPos = new THREE.Vector3(
            targetCenterX - dirX * flightHalfSpan,
            altitudeY,
            targetCenterZ - dirZ * flightHalfSpan
        );
        const endPos = new THREE.Vector3(
            targetCenterX + dirX * flightHalfSpan,
            altitudeY + (Math.random() - 0.5) * 5.0,
            targetCenterZ + dirZ * flightHalfSpan
        );

        const drake = this._createBirdActor('mallard-drake', 0.0, 1.38);
        drake.localOffset = new THREE.Vector3(0, 0, 0);
        pairGroup.add(drake.mesh);

        const hen = this._createBirdActor('mallard-hen', 0.65, 1.32);
        hen.localOffset = new THREE.Vector3(1.85, 0.18, -1.65);
        hen.mesh.position.copy(hen.localOffset);
        pairGroup.add(hen.mesh);

        pairGroup.position.copy(startPos);
        pairGroup.rotation.y = headingAngle;
        this.rootGroup.add(pairGroup);

        const speed = 16.5 + Math.random() * 2.5;
        const totalDist = startPos.distanceTo(endPos);
        const initialTraveled = forFollowView ? totalDist * 0.14 : 0;

        const flightObj = {
            type: 'solo',
            species: 'mallard-pair',
            group: pairGroup,
            birds: [drake, hen],
            startPos,
            endPos,
            baseHeading: headingAngle,
            swerveAmp: 6.5,
            swerveFreq: 1.4,
            totalDist,
            traveled: initialTraveled,
            speed,
            age: 0
        };
        if (initialTraveled > 0) {
            pairGroup.position.lerpVectors(startPos, endPos, initialTraveled / totalDist);
        }
        this.activeFlights.push(flightObj);
        return flightObj;
    }

    /**
     * Spawns a diverse flying waterfowl flock:
     * - `mallard-flock`: Mixed Mallard Drakes & Hens in a swift waterfowl wedge/cluster (8–14 ducks)
     * - `wood-duck-flock`: Iridescent crested Wood Ducks in a compact flight cluster (6–10 ducks)
     * - `pintail-flock`: Sleek Northern Pintail ducks in an angled high-speed echelon (8–14 ducks)
     * - `canvasback-flock`: Fast-flying Canvasback diving ducks in a V-wedge (7–12 ducks)
     * - `trumpeter-swan-flock`: Majestic snow-white Trumpeter Swans in a V-line (5–9 swans)
     * - `white-pelican-flock`: Broad-winged American White Pelicans gliding in squadron formation (6–10 pelicans)
     */
    spawnWaterfowlFlock(flockType = 'mallard-flock', forFollowView = false) {
        const flockGroup = new THREE.Group();
        flockGroup.name = `WaterfowlFlock_${flockType}`;

        const headingAngle = Math.random() * Math.PI * 2;
        const isSwan = flockType === 'trumpeter-swan-flock';
        const isPelican = flockType === 'white-pelican-flock';
        const isPintail = flockType === 'pintail-flock';

        const altitudeY = forFollowView
            ? (isPelican || isSwan ? 44.0 + Math.random() * 14.0 : 34.0 + Math.random() * 14.0)
            : (isPelican || isSwan ? 46.0 + Math.random() * 30.0 : 34.0 + Math.random() * 26.0);

        const targetCenterX = forFollowView ? (Math.random() - 0.5) * 68.0 : (Math.random() - 0.5) * 145.0;
        const targetCenterZ = forFollowView ? 10.0 + (Math.random() - 0.5) * 68.0 : (Math.random() - 0.5) * 145.0;
        const flightHalfSpan = forFollowView ? 150.0 + Math.random() * 25.0 : 225.0 + Math.random() * 55.0;

        const dirX = Math.sin(headingAngle);
        const dirZ = Math.cos(headingAngle);

        const startPos = new THREE.Vector3(
            targetCenterX - dirX * flightHalfSpan,
            altitudeY,
            targetCenterZ - dirZ * flightHalfSpan
        );
        const endPos = new THREE.Vector3(
            targetCenterX + dirX * flightHalfSpan,
            altitudeY + (Math.random() - 0.5) * 7.0,
            targetCenterZ + dirZ * flightHalfSpan
        );

        flockGroup.position.copy(startPos);
        flockGroup.rotation.y = headingAngle;

        const baseScale = isSwan
            ? 1.78
            : isPelican
            ? 1.72
            : flockType === 'wood-duck-flock'
            ? 1.24
            : 1.32;

        const count = isSwan
            ? 5 + Math.floor(Math.random() * 5)
            : isPelican
            ? 6 + Math.floor(Math.random() * 5)
            : flockType === 'wood-duck-flock'
            ? 6 + Math.floor(Math.random() * 5)
            : 8 + Math.floor(Math.random() * 6);

        const pickActorSpecies = (idx) => {
            if (flockType === 'mallard-flock') {
                return idx === 0 || idx % 2 === 0 ? 'mallard-drake' : 'mallard-hen';
            }
            if (flockType === 'wood-duck-flock') return 'wood-duck';
            if (flockType === 'pintail-flock') return 'pintail';
            if (flockType === 'canvasback-flock') return 'canvasback';
            if (flockType === 'trumpeter-swan-flock') return 'trumpeter-swan';
            if (flockType === 'white-pelican-flock') return 'white-pelican';
            return 'mallard-drake';
        };

        const birds = [];
        const leader = this._createBirdActor(pickActorSpecies(0), 0.0, baseScale * 1.05);
        leader.localOffset = new THREE.Vector3(0, 0, 0);
        flockGroup.add(leader.mesh);
        birds.push(leader);

        const spacingX = isSwan || isPelican ? 2.75 : 1.95;
        const spacingZ = isSwan || isPelican ? 3.35 : 2.35;

        for (let i = 1; i < count; i++) {
            const actorSpecies = pickActorSpecies(i);
            const actor = this._createBirdActor(
                actorSpecies,
                i * 0.48 + Math.random() * 0.35,
                baseScale * (0.94 + Math.random() * 0.12)
            );

            let offX, offY, offZ;
            if (isPintail) {
                // Sleek diagonal echelon line with a shorter secondary wing
                const isMainLine = i <= Math.ceil(count * 0.68);
                const rank = isMainLine ? i : i - Math.ceil(count * 0.68);
                const side = isMainLine ? 1 : -1;
                offX = side * rank * spacingX + (Math.random() - 0.5) * 0.4;
                offY = (Math.random() - 0.5) * 0.55;
                offZ = -rank * spacingZ + (Math.random() - 0.5) * 0.45;
            } else if (flockType === 'wood-duck-flock' || flockType === 'mallard-flock') {
                // Natural loose waterfowl wedge/cluster with depth variation
                const side = i % 2 === 1 ? 1 : -1;
                const rank = Math.ceil(i / 2);
                offX = side * (rank * spacingX + (Math.random() - 0.5) * 0.85);
                offY = (Math.random() - 0.5) * 0.75;
                offZ = -rank * spacingZ + (Math.random() - 0.5) * 0.90;
            } else {
                // Classic symmetrical V-wedge for Swans, Pelicans, and Canvasbacks
                const side = i % 2 === 1 ? 1 : -1;
                const rank = Math.ceil(i / 2);
                offX = side * rank * spacingX + (Math.random() - 0.5) * 0.35;
                offY = (Math.random() - 0.5) * 0.42;
                offZ = -rank * spacingZ + (Math.random() - 0.5) * 0.40;
            }

            actor.localOffset = new THREE.Vector3(offX, offY, offZ);
            actor.mesh.position.copy(actor.localOffset);
            flockGroup.add(actor.mesh);
            birds.push(actor);
        }

        this.rootGroup.add(flockGroup);

        const speed = flockType === 'canvasback-flock' || isPintail
            ? 18.0 + Math.random() * 2.5
            : isSwan || isPelican
            ? 14.5 + Math.random() * 2.2
            : 16.5 + Math.random() * 2.5;
        const totalDist = startPos.distanceTo(endPos);
        const initialTraveled = forFollowView ? totalDist * 0.14 : 0;

        const flockObj = {
            type: 'flock',
            species: flockType,
            group: flockGroup,
            birds,
            startPos,
            endPos,
            baseHeading: headingAngle,
            swerveAmp: 0,
            swerveFreq: 0,
            totalDist,
            traveled: initialTraveled,
            speed,
            age: 0
        };
        if (initialTraveled > 0) {
            flockGroup.position.lerpVectors(startPos, endPos, initialTraveled / totalDist);
        }
        this.activeFlights.push(flockObj);
        return flockObj;
    }

    /**
     * Spawns the high-resolution Bald Eagle (`assets/models/birds/bald-eagle-hd.glb`) from a random
     * 360° horizon direction on a full active-flapping flyover (~44–50s) at ~300 feet (91.4m):
     * flies slower (~6.9 m/s) with deep steady wingbeats while approaching the Chelan County Campus,
     * then accelerates (~20 m/s, ~2.9x faster) with brisk power-stroke wingbeats once passing the campus.
     * Supports an extensible list of endings (`this.eagleEndings`, e.g., `'welcome-text'` or `'welcome-drone-swarm'`).
     * Automatically triggers `onEagleSpawn` on ALL eagle spawns so the app saves the user's camera
     * position, switches to Bird's-Eye View, and restores it afterward.
     */
    spawnBaldEagleSoar(endingId = null) {
        // Remove & dispose any prior eagle flight if re-spawned directly
        for (let i = this.activeFlights.length - 1; i >= 0; i--) {
            if (this.activeFlights[i].isOrbitalEagleSoar) {
                this._disposeFlightGroup(this.activeFlights[i].group);
                this.activeFlights.splice(i, 1);
            }
        }
        this._hideAllEagleEndings();

        // Select requested ending or cycle through the registered `this.eagleEndings` list
        let chosenEnding = null;
        if (endingId) {
            chosenEnding = this.eagleEndings.find((e) => e.id === endingId) || null;
        }
        if (!chosenEnding && this.eagleEndings.length > 0) {
            const idx = this.nextEagleEndingIndex % this.eagleEndings.length;
            chosenEnding = this.eagleEndings[idx];
            this.nextEagleEndingIndex = (idx + 1) % this.eagleEndings.length;
        }
        this.activeEagleEnding = chosenEnding;

        const flightGroup = new THREE.Group();
        flightGroup.name = 'BaldEagleFullFlyover';

        const durationSec = 44.0 + Math.random() * 6.0;

        // Full 360° random spawn location on the horizon aiming straight across the Chelan County Campus
        const headingAngle = Math.random() * Math.PI * 2.0;
        const dirX = Math.sin(headingAngle);
        const dirZ = Math.cos(headingAngle);
        const perpX = Math.cos(headingAngle);
        const perpZ = -Math.sin(headingAngle);

        const cx = 8.0;
        const cz = 16.0;
        const latBase = (Math.random() - 0.5) * 32.0;
        const weaveSign = Math.random() < 0.5 ? 1 : -1;

        // Full flyover at ~300 ft (91.5m) across the Campus, then soaring higher (~443 ft / 135m) into the horizon mist
        const exitLat = latBase - weaveSign * 3.0;
        const localProfile = [
            [-220,  87.5, latBase - weaveSign * 6.0], // Random horizon entry (~220m out)
            [-135,  89.8, latBase + weaveSign * 4.0], // Slower approach — campus dead ahead
            [ -50,  91.2, latBase + weaveSign * 7.0], // Approaching campus edge (~300 ft)
            [  15,  91.6, latBase + weaveSign * 2.0], // Passing across the heart of Campus (300 ft)
            [  85, 103.5, latBase - weaveSign * 3.0], // Soaring higher past the campus (~340 ft)
            [ 165, 120.5, latBase - weaveSign * 4.0], // Climbing high into the silver horizon mist (~395 ft)
            [ 250, 135.0, exitLat]                    // High-altitude soar across the opposite horizon (~443 ft)
        ];
        if (chosenEnding?.controller) {
            chosenEnding.controller.placeForEagleCorridor({
                cx,
                cz,
                dirX,
                dirZ,
                perpX,
                perpZ,
                exitLat
            });
        }
        const waypoints = localProfile.map(([along, py, lat]) => new THREE.Vector3(
            cx + dirX * along + perpX * lat,
            py,
            cz + dirZ * along + perpZ * lat
        ));

        const flightCurve = new THREE.CatmullRomCurve3(waypoints, false, 'catmullrom', 0.5);
        flightCurve.arcLengthDivisions = 600;
        const totalCurveLen = flightCurve.getLength();
        const pointStart = flightCurve.getPointAt(0);
        const pointEnd = flightCurve.getPointAt(1);
        const tangentStart = flightCurve.getTangentAt(0);
        const tangentEnd = flightCurve.getTangentAt(1);

        // Smooth C1 monotonic speed curve: slower (1.0x ~ 6.9 m/s) while approaching the campus,
        // ramping up to 2.95x faster (~20.3 m/s) once the eagle passes the campus!
        const lutSteps = 256;
        const speedCumLut = new Float64Array(lutSteps + 1);
        const evalRelSpeed = (tau) => 1.0 + 1.95 * THREE.MathUtils.smoothstep(tau, 0.62, 0.78);
        for (let i = 1; i <= lutSteps; i++) {
            const tauMid = (i - 0.5) / lutSteps;
            speedCumLut[i] = speedCumLut[i - 1] + evalRelSpeed(tauMid) / lutSteps;
        }
        const totalCum = speedCumLut[lutSteps] || 1.0;
        for (let i = 1; i <= lutSteps; i++) {
            speedCumLut[i] /= totalCum;
        }
        const startSlope = evalRelSpeed(0) / totalCum;
        const endSlope = evalRelSpeed(1) / totalCum;

        const mapTimeToCurveU = (tau) => {
            if (tau <= 0) return tau * startSlope;
            if (tau >= 1) return 1.0 + (tau - 1.0) * endSlope;
            const scaled = tau * lutSteps;
            const idx = Math.min(lutSteps - 1, Math.floor(scaled));
            const frac = scaled - idx;
            return speedCumLut[idx] + (speedCumLut[idx + 1] - speedCumLut[idx]) * frac;
        };

        const evalOrbitPoint = (tSec) => {
            const tau = tSec / durationSec;
            const uCurve = mapTimeToCurveU(tau);
            if (uCurve <= 0) {
                return pointStart.clone().addScaledVector(tangentStart, uCurve * totalCurveLen);
            }
            if (uCurve >= 1) {
                return pointEnd.clone().addScaledVector(tangentEnd, (uCurve - 1) * totalCurveLen);
            }
            return flightCurve.getPointAt(uCurve);
        };

        const evalOrbitState = (tSec) => {
            const dtSample = 0.06;
            const pPrev = evalOrbitPoint(tSec - dtSample);
            const pCurr = evalOrbitPoint(tSec);
            const pNext = evalOrbitPoint(tSec + dtSample);

            const vx = (pNext.x - pPrev.x) / (2 * dtSample);
            const vy = (pNext.y - pPrev.y) / (2 * dtSample);
            const vz = (pNext.z - pPrev.z) / (2 * dtSample);
            const heading = Math.atan2(vx, vz);

            // Wide 1.4s aerodynamic roll window so wings stay level entering/exiting the horizon
            // and bank smoothly (~20 deg) into the 500-ft campus thermal circle
            const dtBank = 1.4;
            const bPrev = evalOrbitPoint(tSec - dtBank);
            const bCurr = evalOrbitPoint(tSec);
            const bNext = evalOrbitPoint(tSec + dtBank);
            const h1 = Math.atan2(bCurr.x - bPrev.x, bCurr.z - bPrev.z);
            const h2 = Math.atan2(bNext.x - bCurr.x, bNext.z - bCurr.z);
            let dHeading = h2 - h1;
            while (dHeading > Math.PI) dHeading -= Math.PI * 2;
            while (dHeading < -Math.PI) dHeading += Math.PI * 2;
            const yawRate = dHeading / dtBank;

            const bank = THREE.MathUtils.clamp(-yawRate * 2.4, -0.32, 0.32);
            const pitch = THREE.MathUtils.clamp(-Math.atan2(vy, Math.hypot(vx, vz) || 1) * 0.85, -0.34, 0.22);
            return { position: pCurr, heading, bank, pitch };
        };

        // True-to-life ~2.35m (~7.7 ft) wingspan (`0.58 * 4.05m` base rig) so the campus is the star of the view
        const actor = this._createBirdActor('bald-eagle', 0.0, 0.58);
        actor.localOffset = new THREE.Vector3(0, 0, 0);
        flightGroup.add(actor.mesh);

        const initState = evalOrbitState(0);
        flightGroup.position.copy(initState.position);
        flightGroup.rotation.order = 'YXZ';
        flightGroup.rotation.set(initState.pitch, initState.heading, initState.bank);
        this.rootGroup.add(flightGroup);

        const flightObj = {
            type: 'solo',
            species: 'bald-eagle',
            isOrbitalEagleSoar: true,
            endingId: chosenEnding?.id || 'welcome-text',
            endingLabel: chosenEnding?.label || 'Welcome to Chelan County',
            endingController: chosenEnding?.controller || this.welcomeBillboard,
            evalOrbitState,
            group: flightGroup,
            birds: [actor],
            startPos: initState.position.clone(),
            endPos: evalOrbitPoint(durationSec),
            baseHeading: initState.heading,
            swerveAmp: 0,
            swerveFreq: 0,
            totalDist: durationSec, // With speed = 1.0, traveled === elapsed seconds (0..30.0s)
            traveled: 0,
            speed: 1.0,
            age: 0
        };

        this.activeFlights.push(flightObj);
        this.followedFlight = flightObj;
        this.lastSpecies = 'bald-eagle';

        if (typeof this.onEagleSpawn === 'function') {
            this.onEagleSpawn(flightObj);
        }

        return flightObj;
    }

    /**
     * Spawns an individual flying bird (`bald-eagle`, `red-tailed-hawk`, `osprey`, `great-blue-heron`, `raven`, or `gull`)
     * that flies across the campus with smooth S-curve banking & thermal gliding.
     */
    spawnSoloBird(species = 'bald-eagle', forFollowView = false, endingId = null) {
        if (species === 'bald-eagle') {
            return this.spawnBaldEagleSoar(endingId);
        }
        const flightGroup = new THREE.Group();
        flightGroup.name = `SoloFlyingBird_${species}`;

        const headingAngle = Math.random() * Math.PI * 2;
        const isRaven = species === 'raven';
        const isHeron = species === 'great-blue-heron';
        const altitudeY = forFollowView
            ? (isRaven || isHeron ? 30.0 + Math.random() * 10.0 : 38.0 + Math.random() * 16.0)
            : (isRaven || isHeron ? 28.0 + Math.random() * 20.0 : 38.0 + Math.random() * 34.0);

        // Aim through the central campus area so the solo bird has a dramatic view of the buildings
        const targetCenterX = forFollowView
            ? (Math.random() - 0.5) * 65.0
            : (Math.random() - 0.5) * 130.0;
        const targetCenterZ = forFollowView
            ? 10.0 + (Math.random() - 0.5) * 65.0
            : (Math.random() - 0.5) * 130.0;
        const flightHalfSpan = forFollowView
            ? 145.0 + Math.random() * 25.0
            : 210.0 + Math.random() * 50.0;

        const dirX = Math.sin(headingAngle);
        const dirZ = Math.cos(headingAngle);

        const startPos = new THREE.Vector3(
            targetCenterX - dirX * flightHalfSpan,
            altitudeY,
            targetCenterZ - dirZ * flightHalfSpan
        );
        const endPos = new THREE.Vector3(
            targetCenterX + dirX * flightHalfSpan,
            altitudeY + (Math.random() - 0.5) * 6.0,
            targetCenterZ + dirZ * flightHalfSpan
        );

        const scaleMap = {
            'bald-eagle': 0.58,
            'great-blue-heron': 1.75,
            'red-tailed-hawk': 1.60,
            'osprey': 1.65,
            'gull': 1.40,
            'raven': 1.35
        };
        const birdScale = scaleMap[species] || 1.55;
        const actor = this._createBirdActor(species, Math.random() * Math.PI * 2, birdScale);
        actor.localOffset = new THREE.Vector3(0, 0, 0);
        flightGroup.add(actor.mesh);

        flightGroup.position.copy(startPos);
        flightGroup.rotation.y = headingAngle;
        this.rootGroup.add(flightGroup);

        const speed = isHeron ? 12.8 : isRaven ? 13.5 : 14.5 + Math.random() * 3.0;
        const totalDist = startPos.distanceTo(endPos);
        const initialTraveled = forFollowView ? totalDist * 0.14 : 0;

        const flightObj = {
            type: 'solo',
            species,
            group: flightGroup,
            birds: [actor],
            startPos,
            endPos,
            baseHeading: headingAngle,
            swerveAmp: (species === 'bald-eagle' || species === 'red-tailed-hawk') ? 18.0 : 8.5,
            swerveFreq: 1.5 + Math.random() * 1.0,
            totalDist,
            traveled: initialTraveled,
            speed,
            age: 0
        };
        if (initialTraveled > 0) {
            flightGroup.position.lerpVectors(startPos, endPos, initialTraveled / totalDist);
        }
        this.activeFlights.push(flightObj);
        return flightObj;
    }

    /**
     * Spawns a V-formation flock of migrating Canada geese.
     */
    spawnGeeseVFlock(forFollowView = false) {
        const flockGroup = new THREE.Group();
        flockGroup.name = 'MigratingGeeseVFlock';

        const headingAngle = Math.random() * Math.PI * 2;
        const altitudeY = forFollowView
            ? 44.0 + Math.random() * 16.0
            : 46.0 + Math.random() * 36.0;
        const targetCenterX = forFollowView
            ? (Math.random() - 0.5) * 70.0
            : (Math.random() - 0.5) * 160.0;
        const targetCenterZ = forFollowView
            ? 10.0 + (Math.random() - 0.5) * 70.0
            : (Math.random() - 0.5) * 160.0;
        const flightHalfSpan = forFollowView
            ? 155.0 + Math.random() * 25.0
            : 240.0 + Math.random() * 60.0;

        const dirX = Math.sin(headingAngle);
        const dirZ = Math.cos(headingAngle);

        const startPos = new THREE.Vector3(
            targetCenterX - dirX * flightHalfSpan,
            altitudeY,
            targetCenterZ - dirZ * flightHalfSpan
        );
        const endPos = new THREE.Vector3(
            targetCenterX + dirX * flightHalfSpan,
            altitudeY + (Math.random() - 0.5) * 8.0,
            targetCenterZ + dirZ * flightHalfSpan
        );

        flockGroup.position.copy(startPos);
        flockGroup.rotation.y = headingAngle;

        const leftCount = 6 + Math.floor(Math.random() * 5);
        const rightCount = 5 + Math.floor(Math.random() * 5);
        const birds = [];
        const gooseScale = 1.45;

        const leader = this._createBirdActor('goose', 0.0, gooseScale * 1.06);
        leader.localOffset = new THREE.Vector3(0, 0, 0);
        flockGroup.add(leader.mesh);
        birds.push(leader);

        for (let i = 1; i <= leftCount; i++) {
            const actor = this._createBirdActor('goose', i * 0.52 + Math.random() * 0.25, gooseScale * (0.94 + Math.random() * 0.12));
            actor.localOffset = new THREE.Vector3(
                i * 2.30 + (Math.random() - 0.5) * 0.35,
                (Math.random() - 0.5) * 0.45,
                -i * 3.05 + (Math.random() - 0.5) * 0.40
            );
            actor.mesh.position.copy(actor.localOffset);
            flockGroup.add(actor.mesh);
            birds.push(actor);
        }

        for (let i = 1; i <= rightCount; i++) {
            const actor = this._createBirdActor('goose', i * 0.52 + 0.3 + Math.random() * 0.25, gooseScale * (0.94 + Math.random() * 0.12));
            actor.localOffset = new THREE.Vector3(
                -i * 2.30 + (Math.random() - 0.5) * 0.35,
                (Math.random() - 0.5) * 0.45,
                -i * 3.05 + (Math.random() - 0.5) * 0.40
            );
            actor.mesh.position.copy(actor.localOffset);
            flockGroup.add(actor.mesh);
            birds.push(actor);
        }

        this.rootGroup.add(flockGroup);

        const speed = 15.5 + Math.random() * 3.0;
        const totalDist = startPos.distanceTo(endPos);
        const initialTraveled = forFollowView ? totalDist * 0.14 : 0;

        const flockObj = {
            type: 'flock',
            species: 'goose',
            group: flockGroup,
            birds,
            startPos,
            endPos,
            baseHeading: headingAngle,
            swerveAmp: 0,
            swerveFreq: 0,
            totalDist,
            traveled: initialTraveled,
            speed,
            age: 0
        };
        if (initialTraveled > 0) {
            flockGroup.position.lerpVectors(startPos, endPos, initialTraveled / totalDist);
        }
        this.activeFlights.push(flockObj);
        return flockObj;
    }

    /**
     * Updates active flying birds/flocks and triggers a random bird once every ~minute (45s .. 75s).
     */
    update(dt, reducedMotion = false) {
        if (reducedMotion) return;
        const clampedDt = Math.min(dt, 0.1);
        this.elapsedTime += clampedDt;

        // Animate resident campus sparrows and doves flying between trees and buildings
        this._updateCampusSparrowsAndDoves(clampedDt);

        // Trigger 1 migratory sky bird / flock every 1 minute (60.0s)
        this.nextSpawnCountdown -= clampedDt;
        if (this.nextSpawnCountdown <= 0) {
            if (this.activeFlights.length === 0) {
                this.spawnRandomBirdEvent();
            }
            this.nextSpawnCountdown = 60.0;
        }

        let hasActiveEagleSoar = false;

        for (let f = this.activeFlights.length - 1; f >= 0; f--) {
            const flight = this.activeFlights[f];
            flight.age += clampedDt;
            flight.traveled += flight.speed * clampedDt;

            const u = flight.traveled / flight.totalDist;
            if (u >= 1.0) {
                this._disposeFlightGroup(flight.group);
                this.activeFlights.splice(f, 1);
                if (this.followedFlight === flight) {
                    this.followedFlight = null;
                }
                if (flight.isOrbitalEagleSoar) {
                    this._hideAllEagleEndings();
                    if (typeof this.onEagleSoarEnd === 'function') {
                        this.onEagleSoarEnd(flight);
                    }
                }
                continue;
            }

            if (flight.isOrbitalEagleSoar && typeof flight.evalOrbitState === 'function') {
                hasActiveEagleSoar = true;
                const st = flight.evalOrbitState(flight.age);
                flight.group.position.copy(st.position);
                flight.group.rotation.order = 'YXZ';
                flight.group.rotation.set(st.pitch, st.heading, st.bank);

                const endingCtrl = flight.endingController || this.welcomeBillboard;
                if (endingCtrl) {
                    if (st.position.y < 93.2) {
                        flight._welcomePopped = false;
                        flight._welcomePopElapsed = 0;
                        endingCtrl.setReveal(0.0, this.scene?.fog?.color, 1.0, 0.0, 0.0, clampedDt);
                    } else {
                        if (!flight._welcomePopped) {
                            let camHit = st.position.y >= 97.8;
                            if (!camHit && this.camera && endingCtrl.group) {
                                this._projVec.copy(endingCtrl.group.position).project(this.camera);
                                if (
                                    this._projVec.z > 0.0 &&
                                    this._projVec.z < 1.0 &&
                                    Math.abs(this._projVec.x) <= 0.96 &&
                                    this._projVec.y <= 0.92 &&
                                    this._projVec.y >= -0.92
                                ) {
                                    camHit = true;
                                }
                            }
                            if (camHit) {
                                flight._welcomePopped = true;
                                flight._welcomePopElapsed = 0.016;
                            }
                        }

                        if (flight._welcomePopped) {
                            flight._welcomePopElapsed = (flight._welcomePopElapsed || 0) + clampedDt;
                            const popProgress = THREE.MathUtils.clamp(flight._welcomePopElapsed / 0.24, 0.0, 1.0);
                            const popReveal = 1.0 - Math.pow(1.0 - popProgress, 3);

                            const sT = THREE.MathUtils.clamp(flight._welcomePopElapsed / 0.44, 0.0, 1.0);
                            const backC1 = 2.65;
                            const backC3 = backC1 + 1.0;
                            const uBack = sT - 1.0;
                            const easedBack = 1.0 + backC3 * uBack * uBack * uBack + backC1 * uBack * uBack;
                            const popScale = 0.72 + 0.28 * easedBack;

                            const popFlash = Math.max(0.0, 1.0 - flight._welcomePopElapsed / 0.40);
                            const exitDissolve = 1.0 - THREE.MathUtils.smootherstep(u, 0.955, 0.996);
                            // For the drone swarm ending, drones converge smoothly from scattered patrol into the spelled text over 2.6s
                            const formationProgress = THREE.MathUtils.clamp(flight._welcomePopElapsed / 2.60, 0.0, 1.0);
                            endingCtrl.setReveal(
                                popReveal * exitDissolve,
                                this.scene?.fog?.color,
                                popScale,
                                popFlash * exitDissolve,
                                formationProgress,
                                clampedDt
                            );
                        } else {
                            endingCtrl.setReveal(0.0, this.scene?.fog?.color, 1.0, 0.0, 0.0, clampedDt);
                        }
                    }
                }
            } else {
                flight.group.position.lerpVectors(flight.startPos, flight.endPos, u);

                // Solo soaring birds weave gently along an S-curve and bank into turns
                if (flight.type === 'solo' && flight.swerveAmp > 0) {
                    const perpX = Math.cos(flight.baseHeading);
                    const perpZ = -Math.sin(flight.baseHeading);
                    const wavePhase = u * Math.PI * 2.0 * flight.swerveFreq;
                    const lateralOff = Math.sin(wavePhase) * flight.swerveAmp;
                    flight.group.position.x += perpX * lateralOff;
                    flight.group.position.z += perpZ * lateralOff;

                    const yawOffset = Math.atan2(
                        Math.cos(wavePhase) * flight.swerveAmp * (Math.PI * 2.0 * flight.swerveFreq) / flight.totalDist,
                        1.0
                    );
                    flight.group.rotation.y = flight.baseHeading + yawOffset;
                    flight.group.rotation.z = -yawOffset * 0.85; // Natural aerodynamic roll/bank angle
                }
            }

            // Animate each bird's articulated 2-segment wings & thermal glide posture
            for (let i = 0; i < flight.birds.length; i++) {
                const b = flight.birds[i];

                if (b.isHighResEagle) {
                    // Full active flight (no static gliding/soaring):
                    // Slower, deep wingbeats while approaching the campus, accelerating to fast power strokes once past the campus!
                    const accelBlend = THREE.MathUtils.smoothstep(u, 0.62, 0.78);
                    const flapRate = THREE.MathUtils.lerp(4.6, 8.8, accelBlend);
                    flight._eagleWingPhase = (flight._eagleWingPhase || 0) + clampedDt * flapRate;
                    const t = flight._eagleWingPhase + b.phaseOffset;
                    const flapAmp = 0.94 + accelBlend * 0.14;

                    const s = Math.sin(t);
                    const c = Math.cos(t);

                    const shoulderAngle = s * 0.48 * flapAmp + 0.04;
                    const wristAngle = (Math.sin(t - 0.85) * 0.42 - 0.10) * flapAmp;

                    b.leftWing.shoulderPivot.rotation.z = shoulderAngle;
                    b.leftWing.wristPivot.rotation.z = wristAngle;
                    b.rightWing.shoulderPivot.rotation.z = -shoulderAngle;
                    b.rightWing.wristPivot.rotation.z = -wristAngle;

                    // Dynamic aero-elastic flex on the 7 slotted primary wingtip fingers with each wingstroke
                    const tipFlex = -c * 0.11 * flapAmp;
                    if (b.leftWing.primaryTipsGroup) {
                        b.leftWing.primaryTipsGroup.rotation.z = tipFlex;
                    }
                    if (b.rightWing.primaryTipsGroup) {
                        b.rightWing.primaryTipsGroup.rotation.z = -tipFlex;
                    }

                    if (b.headGroup) {
                        b.headGroup.rotation.y = Math.sin(flight.age * 0.55) * 0.08 * (1.0 - accelBlend * 0.6);
                        b.headGroup.rotation.x = -c * 0.03;
                    }
                    if (b.tail) {
                        b.tail.rotation.z = (flight.group.rotation.z || 0) * 0.25;
                        b.tail.rotation.x = -0.02 + c * 0.035;
                    }

                    const bobY = -c * 0.055 * flapAmp;
                    b.mesh.position.set(b.localOffset.x, b.localOffset.y + bobY, b.localOffset.z);
                    continue;
                }

                const t = flight.age * b.flapFreq + b.phaseOffset;

                const glideWave = Math.sin(flight.age * 0.65 + b.phaseOffset * 0.7);
                const isGliding = glideWave > b.glideThreshold;
                const flapAmp = isGliding ? 0.08 : 1.0;

                const s = Math.sin(t);
                const c = Math.cos(t);

                // Soaring dihedral posture when gliding vs active power stroke when flapping
                const dihedralBase = (b.species === 'bald-eagle' || b.species === 'red-tailed-hawk') ? 0.14 : 0.08;
                const shoulderAngle = s * 0.50 * flapAmp + dihedralBase;
                const wristAngle = (Math.sin(t - 0.85) * 0.44 - 0.12) * flapAmp - (isGliding ? 0.06 : 0.0);

                b.leftWing.shoulderPivot.rotation.z = shoulderAngle;
                b.leftWing.wristPivot.rotation.z = wristAngle;

                b.rightWing.shoulderPivot.rotation.z = -shoulderAngle;
                b.rightWing.wristPivot.rotation.z = -wristAngle;

                const bobY = -c * 0.04 * flapAmp + Math.sin(flight.age * 1.8 + i * 0.6) * 0.07;
                b.mesh.position.set(
                    b.localOffset.x,
                    b.localOffset.y + bobY,
                    b.localOffset.z
                );
            }
        }

        if (!hasActiveEagleSoar) {
            for (let i = 0; i < this.eagleEndings.length; i++) {
                const ctrl = this.eagleEndings[i].controller;
                if (ctrl && ctrl.revealFactor > 0) {
                    ctrl.hide();
                }
            }
        }
    }
}
