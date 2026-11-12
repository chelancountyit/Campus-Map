import * as THREE from 'three';

/**
 * ChelanWelcomeMissVeedolEnding
 *
 * Alternative Bald Eagle flyover ending (`welcome-miss-veedol`):
 * As the Bald Eagle climbs into the high-altitude soar corridor past the Chelan County
 * Campus, the historic crimson-and-silver Bellanca J-300 high-wing monoplane
 * **"Miss Veedol" (NR796W)** — which completed the first non-stop transpacific flight
 * from Misawa, Japan to East Wenatchee's Pangborn Field in October 1931 — flies across
 * the sky ahead of the eagle, pulling a fluttering aerial tow banner reading
 * "WELCOME TO CHELAN COUNTY".
 *
 * Zero runtime GPU buffer churn: all geometries, textures, and materials are allocated
 * once and animated in-place (propeller spin, tow-banner cloth wave, and cruise traversal).
 */
export class ChelanWelcomeMissVeedolEnding {
    constructor(scene) {
        this.scene = scene;
        this.id = 'welcome-miss-veedol';
        this.label = 'Welcome to Chelan County — Miss Veedol Tow Banner';
        this.revealFactor = 0.0;
        this.elapsedTime = 0.0;
        this._fogColor = new THREE.Color('#0d1729');
        this._materials = [];
        this._bannerBasePositions = null;

        this.group = this._buildMissVeedolAndBannerGroup();
        this.group.visible = false;
        this.scene.add(this.group);
    }

    _registerMaterial(mat, baseOpacity = 1.0) {
        mat.transparent = true;
        mat.opacity = 0.0;
        mat.fog = false;
        mat.userData = { sharedAsset: true, baseOpacity };
        this._materials.push(mat);
        return mat;
    }

    /**
     * Builds the 3D Bellanca J-300 "Miss Veedol" monoplane + tow harness + waving aerial banner.
     * In local `this.carryRig` coordinates:
     *   +X = flight direction of Miss Veedol (left-to-right across the eagle's view)
     *   +Y = up
     *   +Z = facing toward the approaching eagle & chase camera
     */
    _buildMissVeedolAndBannerGroup() {
        const root = new THREE.Group();
        root.name = 'WelcomeToChelanCountyMissVeedol';

        this.carryRig = new THREE.Group();
        this.carryRig.name = 'MissVeedolCarryRig';
        root.add(this.carryRig);

        // Shared materials
        const crimsonMat = this._registerMaterial(
            new THREE.MeshStandardMaterial({
                color: '#b91c1c',
                emissive: '#450a0a',
                emissiveIntensity: 0.32,
                roughness: 0.36,
                metalness: 0.18
            }),
            1.0
        );
        const orangeWingMat = this._registerMaterial(
            new THREE.MeshStandardMaterial({
                color: '#ea580c',
                emissive: '#431407',
                emissiveIntensity: 0.28,
                roughness: 0.40,
                metalness: 0.14
            }),
            1.0
        );
        const cowlingSilverMat = this._registerMaterial(
            new THREE.MeshStandardMaterial({
                color: '#cbd5e1',
                emissive: '#1e293b',
                emissiveIntensity: 0.25,
                roughness: 0.28,
                metalness: 0.78
            }),
            1.0
        );
        const darkMetalMat = this._registerMaterial(
            new THREE.MeshStandardMaterial({
                color: '#1e293b',
                roughness: 0.55,
                metalness: 0.65
            }),
            1.0
        );
        const cabinGlassMat = this._registerMaterial(
            new THREE.MeshStandardMaterial({
                color: '#93c5fd',
                emissive: '#1e3a8a',
                emissiveIntensity: 0.35,
                roughness: 0.15,
                metalness: 0.45
            }),
            0.88
        );
        const propDiscMat = this._registerMaterial(
            new THREE.MeshBasicMaterial({
                color: '#e2e8f0',
                side: THREE.DoubleSide,
                depthWrite: false
            }),
            0.52
        );
        const towCableMat = this._registerMaterial(
            new THREE.MeshBasicMaterial({
                color: '#cbd5e1',
                side: THREE.DoubleSide
            }),
            0.90
        );

        // =====================================================================
        // 1. BELLANCA J-300 "MISS VEEDOL" HIGH-WING MONOPLANE (positioned at +X)
        // =====================================================================
        this.planeGroup = new THREE.Group();
        this.planeGroup.name = 'BellancaJ300MissVeedol';
        this.planeGroup.position.set(22.5, 0.0, 0.0);
        this.carryRig.add(this.planeGroup);

        const markShared = (geo) => {
            geo.userData = { sharedAsset: true };
            return geo;
        };

        // 1A. Fuselage (boxy Bellanca cabin tapering to tailcone)
        const fuseMain = new THREE.Mesh(markShared(new THREE.BoxGeometry(4.8, 1.55, 1.32)), crimsonMat);
        fuseMain.position.set(1.2, 0.0, 0.0);
        this.planeGroup.add(fuseMain);

        const tailCone = new THREE.Mesh(
            markShared(new THREE.CylinderGeometry(0.28, 0.78, 5.2, 12)),
            crimsonMat
        );
        tailCone.rotation.z = Math.PI * 0.5;
        tailCone.scale.set(1.15, 1.0, 0.85);
        tailCone.position.set(-3.6, 0.12, 0.0);
        this.planeGroup.add(tailCone);

        // Side fuselage livery plaque ("MISS VEEDOL" / "NR796W")
        const fuseLiveryMat = this._buildFuselageLiveryMaterial();
        const fusePlaqueGeo = markShared(new THREE.PlaneGeometry(4.4, 0.92));
        for (const zSide of [-0.67, 0.67]) {
            const plaque = new THREE.Mesh(fusePlaqueGeo, fuseLiveryMat);
            plaque.position.set(1.15, -0.08, zSide);
            if (zSide < 0) plaque.rotation.y = Math.PI;
            this.planeGroup.add(plaque);
        }

        // Enclosed cockpit windshield & side windows
        const cabinWindshield = new THREE.Mesh(
            markShared(new THREE.BoxGeometry(1.65, 0.72, 1.26)),
            cabinGlassMat
        );
        cabinWindshield.position.set(2.35, 0.56, 0.0);
        cabinWindshield.rotation.z = -0.18;
        this.planeGroup.add(cabinWindshield);

        // 1B. Townend Ring Radial Engine Cowling & 9-Cylinder Pratt & Whitney Wasp Jr.
        const cowlRing = new THREE.Mesh(
            markShared(new THREE.CylinderGeometry(0.86, 0.82, 1.05, 20)),
            cowlingSilverMat
        );
        cowlRing.rotation.z = -Math.PI * 0.5;
        cowlRing.position.set(4.02, 0.04, 0.0);
        this.planeGroup.add(cowlRing);

        const crankcase = new THREE.Mesh(
            markShared(new THREE.CylinderGeometry(0.48, 0.52, 0.85, 16)),
            darkMetalMat
        );
        crankcase.rotation.z = -Math.PI * 0.5;
        crankcase.position.set(4.22, 0.04, 0.0);
        this.planeGroup.add(crankcase);

        // Spinning 2-blade Hamilton Standard propeller + motion-blur disc
        this.propellerGroup = new THREE.Group();
        this.propellerGroup.position.set(4.72, 0.04, 0.0);
        this.planeGroup.add(this.propellerGroup);

        const spinner = new THREE.Mesh(
            markShared(new THREE.ConeGeometry(0.22, 0.45, 14)),
            cowlingSilverMat
        );
        spinner.rotation.z = -Math.PI * 0.5;
        spinner.position.set(0.12, 0, 0);
        this.propellerGroup.add(spinner);

        const blade = new THREE.Mesh(
            markShared(new THREE.BoxGeometry(0.08, 2.75, 0.22)),
            cowlingSilverMat
        );
        this.propellerGroup.add(blade);

        const blurDisc = new THREE.Mesh(
            markShared(new THREE.CircleGeometry(1.38, 24)),
            propDiscMat
        );
        blurDisc.rotation.y = Math.PI * 0.5;
        this.propellerGroup.add(blurDisc);

        // 1C. High-Mounted Monoplane Main Wing + Signature Bellanca Wide Airfoil Lift Struts
        const mainWing = new THREE.Mesh(
            markShared(new THREE.BoxGeometry(2.55, 0.22, 15.6)),
            orangeWingMat
        );
        mainWing.position.set(1.45, 0.88, 0.0);
        this.planeGroup.add(mainWing);

        // Rounded wingtips
        for (const zTip of [-7.8, 7.8]) {
            const tip = new THREE.Mesh(
                markShared(new THREE.CylinderGeometry(1.26, 1.26, 0.20, 16)),
                crimsonMat
            );
            tip.position.set(1.45, 0.88, zTip);
            this.planeGroup.add(tip);
        }

        // Bellanca wide airfoil-shaped diagonal lift struts on both sides
        for (const zSign of [-1, 1]) {
            const strut = new THREE.Mesh(
                markShared(new THREE.BoxGeometry(0.62, 0.09, 4.45)),
                orangeWingMat
            );
            strut.position.set(1.35, 0.05, zSign * 2.55);
            strut.rotation.x = zSign * 0.36;
            this.planeGroup.add(strut);
        }

        // 1D. Fixed Landing Gear Struts & Teardrop Wheel Spats (Pant Fairings)
        for (const zSign of [-1, 1]) {
            const leg = new THREE.Mesh(
                markShared(new THREE.BoxGeometry(0.16, 1.45, 0.12)),
                crimsonMat
            );
            leg.position.set(2.05, -1.15, zSign * 1.15);
            leg.rotation.x = -zSign * 0.32;
            this.planeGroup.add(leg);

            const spat = new THREE.Mesh(
                markShared(new THREE.SphereGeometry(0.46, 14, 12)),
                crimsonMat
            );
            spat.scale.set(2.15, 0.88, 0.62);
            spat.position.set(2.05, -1.82, zSign * 1.38);
            this.planeGroup.add(spat);

            const tire = new THREE.Mesh(
                markShared(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 16)),
                darkMetalMat
            );
            tire.rotation.x = Math.PI * 0.5;
            tire.position.set(2.05, -1.96, zSign * 1.38);
            this.planeGroup.add(tire);
        }

        // 1E. Empennage (Vertical Fin, Rudder & Horizontal Stabilizer)
        const hStab = new THREE.Mesh(
            markShared(new THREE.BoxGeometry(1.45, 0.12, 4.8)),
            orangeWingMat
        );
        hStab.position.set(-5.55, 0.35, 0.0);
        this.planeGroup.add(hStab);

        const vFin = new THREE.Mesh(
            markShared(new THREE.BoxGeometry(1.65, 1.95, 0.14)),
            crimsonMat
        );
        vFin.position.set(-5.65, 1.15, 0.0);
        vFin.rotation.z = -0.18;
        this.planeGroup.add(vFin);

        // =====================================================================
        // 2. TOW HARNESS LINES & WAVING AERIAL BANNER ("WELCOME TO CHELAN COUNTY")
        // =====================================================================
        // Upper & lower V-bridle tow cables connecting Miss Veedol's tail (-6.2 -> +16.3) to the banner lead pole (+9.5)
        for (const yBridle of [2.5, -2.5]) {
            const dx = 16.3 - 9.5;
            const dy = 0.2 - yBridle;
            const cableLen = Math.hypot(dx, dy);
            const cable = new THREE.Mesh(
                markShared(new THREE.BoxGeometry(cableLen, 0.07, 0.07)),
                towCableMat
            );
            cable.position.set(9.5 + dx * 0.5, yBridle + dy * 0.5, 0.0);
            cable.rotation.z = Math.atan2(dy, dx);
            this.carryRig.add(cable);
        }

        // Vertical weighted lead spreader bar at the front edge of the banner (x = +9.5)
        const spreaderBar = new THREE.Mesh(
            markShared(new THREE.CylinderGeometry(0.11, 0.11, 10.6, 10)),
            cowlingSilverMat
        );
        spreaderBar.position.set(9.5, 0.0, 0.0);
        this.carryRig.add(spreaderBar);

        // Subdivided waving cloth banner mesh (38m wide x 10.2m tall, centered at x = -9.5, spanning x = -28.5 .. +9.5)
        const bannerW = 38.0;
        const bannerH = 10.2;
        const segsX = 36;
        const segsY = 8;
        this.bannerGeo = markShared(new THREE.PlaneGeometry(bannerW, bannerH, segsX, segsY));
        const posAttr = this.bannerGeo.attributes.position;
        this._bannerBasePositions = new Float32Array(posAttr.array.length);
        this._bannerBasePositions.set(posAttr.array);

        this.bannerMat = this._buildTowBannerMaterial();
        this.bannerMesh = new THREE.Mesh(this.bannerGeo, this.bannerMat);
        this.bannerMesh.position.set(-9.5, 0.0, 0.0);
        this.bannerMesh.frustumCulled = false;
        this.bannerMesh.renderOrder = 9;
        this.carryRig.add(this.bannerMesh);

        return root;
    }

    _buildFuselageLiveryMaterial() {
        let tex = null;
        if (typeof document !== 'undefined') {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#b91c1c';
            ctx.fillRect(0, 0, 512, 128);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 5;
            ctx.strokeRect(8, 8, 496, 112);

            ctx.fillStyle = '#fef3c7';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '900 44px Georgia, "Times New Roman", serif';
            ctx.fillText('MISS VEEDOL', 256, 52);
            ctx.fillStyle = '#fbbf24';
            ctx.font = '800 26px "Segoe UI", system-ui, sans-serif';
            ctx.fillText('NR796W  •  1931', 256, 96);

            tex = new THREE.CanvasTexture(canvas);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.userData = { sharedAsset: true };
        }
        return this._registerMaterial(
            new THREE.MeshBasicMaterial({
                map: tex,
                side: THREE.DoubleSide
            }),
            1.0
        );
    }

    _buildTowBannerMaterial() {
        let tex = null;
        if (typeof document !== 'undefined') {
            const W = 2048;
            const H = 512;
            const canvas = document.createElement('canvas');
            canvas.width = W;
            canvas.height = H;
            const ctx = canvas.getContext('2d');

            // Warm vintage canvas-cream banner cloth with subtle fabric weave gradient
            const bgGrad = ctx.createLinearGradient(0, 0, W, H);
            bgGrad.addColorStop(0.0, '#fffbeb');
            bgGrad.addColorStop(0.5, '#fef3c7');
            bgGrad.addColorStop(1.0, '#fde68a');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, W, H);

            // Bold crimson top & bottom stitched border hems + inner gold pinstripe
            ctx.fillStyle = '#b91c1c';
            ctx.fillRect(0, 0, W, 28);
            ctx.fillRect(0, H - 28, W, 28);
            ctx.fillRect(W - 28, 0, 28, H);

            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 6;
            ctx.strokeRect(42, 42, W - 84, H - 84);

            // Row 1: "WELCOME TO"
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if ('letterSpacing' in ctx) {
                ctx.letterSpacing = '14px';
            }
            ctx.fillStyle = '#1e293b';
            ctx.font = '800 84px "Segoe UI", system-ui, -apple-system, sans-serif';
            ctx.fillText('WELCOME TO', W * 0.52, 152);

            // Row 2: "CHELAN COUNTY"
            if ('letterSpacing' in ctx) {
                ctx.letterSpacing = '6px';
            }
            ctx.lineWidth = 10;
            ctx.strokeStyle = '#ffffff';
            ctx.font = '900 164px Georgia, "Times New Roman", serif';
            ctx.strokeText('CHELAN COUNTY', W * 0.52, 336);
            ctx.fillStyle = '#991b1b';
            ctx.fillText('CHELAN COUNTY', W * 0.52, 336);

            tex = new THREE.CanvasTexture(canvas);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 8;
            tex.userData = { sharedAsset: true };
        }
        return this._registerMaterial(
            new THREE.MeshBasicMaterial({
                map: tex,
                side: THREE.DoubleSide,
                depthWrite: false
            }),
            0.98
        );
    }

    /**
     * Positions Miss Veedol and her towed banner ahead of the Bald Eagle's climb corridor.
     */
    placeForEagleCorridor({ cx, cz, dirX, dirZ, perpX, perpZ, exitLat = 0 }) {
        const alongDist = 294.0;
        const centerY = 125.0;
        const wx = cx + dirX * alongDist + perpX * exitLat;
        const wz = cz + dirZ * alongDist + perpZ * exitLat;

        this.group.position.set(wx, centerY, wz);
        this.group.rotation.set(0, Math.atan2(-dirX, -dirZ), 0);
        this.group.scale.setScalar(1.0);

        this.setReveal(0.0, null, 1.0, 0.0, 0.0, 0.0);
    }

    /**
     * Updates Miss Veedol's cruise path, propeller spin, and sinusoidal tow-banner flutter.
     */
    setReveal(reveal, liveFogColor = null, popScale = 1.0, _popFlash = 0.0, _progress = 0.0, dt = 0.016) {
        const clamped = THREE.MathUtils.clamp(reveal, 0.0, 1.0);
        this.revealFactor = clamped;

        if (liveFogColor && liveFogColor.isColor) {
            this._fogColor.copy(liveFogColor);
        } else if (this.scene?.fog?.color) {
            this._fogColor.copy(this.scene.fog.color);
        }

        if (clamped <= 0.002) {
            this.group.visible = false;
            this.elapsedTime = 0.0;
            return;
        }

        this.elapsedTime += Math.max(0, dt);
        this.group.visible = true;
        this.group.scale.setScalar(popScale);

        const t = this.elapsedTime;

        // Update material opacities
        for (let i = 0; i < this._materials.length; i++) {
            const m = this._materials[i];
            const baseOp = m.userData?.baseOpacity ?? 1.0;
            m.opacity = THREE.MathUtils.clamp(clamped * baseOp, 0.0, 1.0);
        }

        // Smooth forward cruise across the sky (from x = -18m to +26m as the eagle climbs past) + gentle wing rock
        const cruiseX = -18.0 + Math.min(t * 5.2, 44.0);
        const bobY = Math.sin(t * 1.8) * 0.45;
        this.carryRig.position.set(cruiseX, bobY, 0.0);
        this.planeGroup.rotation.x = Math.sin(t * 1.4) * 0.045;
        this.planeGroup.rotation.z = 0.02 + Math.cos(t * 1.9) * 0.02;

        // Spin the 2-blade propeller rapidly
        if (this.propellerGroup) {
            this.propellerGroup.rotation.x = (t * 38.0) % (Math.PI * 2.0);
        }

        // Animate traveling aerodynamic cloth wave along the towed banner (pinned at lead edge u = 0, fluttering toward tail u = 1)
        if (this.bannerGeo && this._bannerBasePositions) {
            const posAttr = this.bannerGeo.attributes.position;
            const base = this._bannerBasePositions;
            const halfW = 19.0;
            for (let i = 0; i < posAttr.count; i++) {
                const bx = base[i * 3];
                const by = base[i * 3 + 1];
                // u = 0 at lead spreader pole (+19m), u = 1 at trailing banner tail (-19m)
                const u = THREE.MathUtils.clamp((halfW - bx) / (halfW * 2.0), 0.0, 1.0);
                const flutterAmp = Math.pow(u, 1.15) * 1.45;
                const waveZ =
                    Math.sin(u * 9.5 - t * 8.5) * flutterAmp +
                    Math.cos(u * 16.0 - t * 13.0 + by * 0.25) * (flutterAmp * 0.28);
                const waveY = Math.cos(u * 7.0 - t * 6.5) * (u * 0.32);
                posAttr.setXYZ(i, bx, by + waveY, waveZ);
            }
            posAttr.needsUpdate = true;
        }
    }

    hide() {
        this.setReveal(0.0, null, 1.0, 0.0, 0.0, 0.0);
    }
}
