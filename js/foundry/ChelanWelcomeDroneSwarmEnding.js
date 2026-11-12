import * as THREE from 'three';

/**
 * ChelanWelcomeDroneSwarmEnding
 *
 * Alternative Bald Eagle flyover ending (`welcome-drone-swarm`):
 * A synchronized fleet of luminous quadcopter drones spells
 * "WELCOME TO" / "CHELAN COUNTY" in huge outlined (stroke-only, no fill) 3D aerial
 * typography ahead of the Bald Eagle, and once the camera begins to see the formation,
 * the drones hold the crisp stroke outline briefly before gracefully separating and
 * dispersing outward across the sky as the eagle and chase camera soar right through them.
 *
 * Zero runtime GPU buffer churn: all geometries, materials, and InstancedMeshes
 * are allocated once and updated in-place via instance matrices & colors.
 */
export class ChelanWelcomeDroneSwarmEnding {
    constructor(scene) {
        this.scene = scene;
        this.id = 'welcome-drone-swarm';
        this.label = 'Welcome to Chelan County — Drone Light Show';
        this.revealFactor = 0.0;
        this.formationFactor = 0.0;
        this.separationFactor = 0.0;
        this.elapsedTime = 0.0;

        this._dummy = new THREE.Object3D();
        this._propDummy = new THREE.Object3D();
        this._tmpColor = new THREE.Color();
        this._fogColor = new THREE.Color('#0d1729');

        this.drones = this._sampleTextDroneTargets();
        this.droneCount = this.drones.length;

        this.group = this._buildInstancedSwarmGroup();
        this.group.visible = false;
        this.scene.add(this.group);
    }

    /**
     * Rasterizes "WELCOME TO" and "CHELAN COUNTY" onto an offscreen canvas using
     * pure font outlines (`strokeText` only, NO fill) and extracts larger 3D drone
     * target coordinates, separation vectors, and LED colors.
     */
    _sampleTextDroneTargets() {
        const drones = [];
        if (typeof document === 'undefined') return drones;

        const W = 680;
        const H = 220;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = '#ffffff';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Row 1: "WELCOME TO" — stroke outline only (no fill!)
        if ('letterSpacing' in ctx) {
            ctx.letterSpacing = '6px';
        }
        ctx.lineWidth = 2.6;
        ctx.font = '800 44px "Segoe UI", system-ui, -apple-system, sans-serif';
        ctx.strokeText('WELCOME TO', W * 0.5, 56);

        // Row 2: "CHELAN COUNTY" — bigger stroke outline only (no fill!)
        if ('letterSpacing' in ctx) {
            ctx.letterSpacing = '4px';
        }
        ctx.lineWidth = 3.0;
        ctx.font = '900 72px "Segoe UI", system-ui, -apple-system, sans-serif';
        ctx.strokeText('CHELAN COUNTY', W * 0.5, 150);

        const imgData = ctx.getImageData(0, 0, W, H).data;
        const spanW = 86.0; // Bigger 86m wide sky formation
        const spanH = 28.5; // Bigger 28.5m tall sky formation

        // Sample on a 2px step along the hollow font strokes (~1,200-1,800 drones)
        const stepX = 2;
        const stepY = 2;
        let idx = 0;

        for (let py = 0; py < H; py += stepY) {
            for (let px = 0; px < W; px += stepX) {
                const alpha = imgData[(py * W + px) * 4 + 3];
                if (alpha < 110) continue;

                const u = px / (W - 1) - 0.5;
                const v = 0.5 - py / (H - 1);
                const tx = u * spanW;
                const ty = v * spanH;
                const isTopRow = py < 96;

                // Deterministic pseudo-random scatter & phase per drone
                const s1 = Math.sin(idx * 12.9898 + 78.233) * 43758.5453;
                const s2 = Math.sin(idx * 39.3467 + 11.135) * 24634.6345;
                const s3 = Math.sin(idx * 73.1562 + 51.719) * 19583.2417;
                const r1 = s1 - Math.floor(s1);
                const r2 = s2 - Math.floor(s2);
                const r3 = s3 - Math.floor(s3);

                // Slow, graceful 3D disengagement targets so the eagle and chase camera fly right past the drones while they are still slowly disengaging from the title
                const radialDirX = u >= 0 ? 1 : -1;
                const radialAng = Math.atan2(v * 1.35, u + radialDirX * 0.08) + (r1 - 0.5) * 0.85;
                const sepDist = 10.0 + r2 * 22.0;
                const sx = tx + Math.cos(radialAng) * sepDist + (r3 - 0.5) * 7.5;
                const sy = ty + Math.sin(radialAng) * (sepDist * 0.68) + (r1 - 0.38) * 9.5;
                const sz = (r2 - 0.48) * 28.0;

                // Subtle 3D layered depth when locked in stroke outline formation
                const tz = (r3 - 0.5) * 0.55;

                // Base LED color: icy sky-cyan/white for "WELCOME TO", warm gold-amber for "CHELAN COUNTY"
                const baseColor = new THREE.Color();
                if (isTopRow) {
                    baseColor.setHSL(0.53 + (r1 - 0.5) * 0.04, 0.92, 0.80 + r2 * 0.16);
                } else {
                    const gradT = THREE.MathUtils.clamp((py - 105) / 76, 0, 1);
                    baseColor.setHSL(
                        THREE.MathUtils.lerp(0.14, 0.09, gradT),
                        0.96,
                        THREE.MathUtils.lerp(0.86, 0.64, gradT)
                    );
                }

                drones.push({
                    tx,
                    ty,
                    tz,
                    sx,
                    sy,
                    sz,
                    sepDelay: r1 * 0.36, // Staggered per-drone breakaway timing for slow organic title disengagement
                    phase: r1 * Math.PI * 2.0,
                    bobSpeed: 2.1 + r2 * 1.4,
                    baseColor,
                    isTopRow
                });
                idx++;
            }
        }

        return drones;
    }

    _buildInstancedSwarmGroup() {
        const root = new THREE.Group();
        root.name = 'WelcomeToChelanCountyDroneSwarm';

        const count = Math.max(1, this.droneCount);

        // 1. Quadcopter Drone Frame (central carbon-fiber body pod + 4 diagonal X-arms & motor pods)
        const frameGeo = this._buildQuadcopterFrameGeometry();
        this._frameMat = new THREE.MeshStandardMaterial({
            color: '#1e293b',
            emissive: '#0f172a',
            emissiveIntensity: 0.45,
            roughness: 0.38,
            metalness: 0.72,
            transparent: true,
            opacity: 0.0,
            fog: false
        });
        this._frameMat.userData = { sharedAsset: true };

        this.frameMesh = new THREE.InstancedMesh(frameGeo, this._frameMat, count);
        this.frameMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.frameMesh.frustumCulled = false;
        this.frameMesh.renderOrder = 8;
        root.add(this.frameMesh);

        // 2. High-Intensity Show Beacon LED Core + 4 Under-Motor Strobe Orbs per Drone
        const beaconGeo = this._buildDroneBeaconGeometry();
        this._beaconMat = new THREE.MeshBasicMaterial({
            color: '#ffffff',
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            fog: false
        });
        this._beaconMat.userData = { sharedAsset: true };

        this.beaconMesh = new THREE.InstancedMesh(beaconGeo, this._beaconMat, count);
        this.beaconMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.beaconMesh.frustumCulled = false;
        this.beaconMesh.renderOrder = 9;
        root.add(this.beaconMesh);

        // 3. Spinning Quad-Rotor Propellers Blur Discs (4 discs spinning in sync above the 4 arm tips)
        const propGeo = this._buildQuadPropellerDiscsGeometry();
        this._propMat = new THREE.MeshBasicMaterial({
            color: '#bae6fd',
            transparent: true,
            opacity: 0.0,
            side: THREE.DoubleSide,
            depthWrite: false,
            fog: false
        });
        this._propMat.userData = { sharedAsset: true };

        this.propMesh = new THREE.InstancedMesh(propGeo, this._propMat, count);
        this.propMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.propMesh.frustumCulled = false;
        this.propMesh.renderOrder = 9;
        root.add(this.propMesh);

        // Initialize instance colors and default positions
        for (let i = 0; i < count; i++) {
            const d = this.drones[i];
            if (!d) continue;
            this._dummy.position.set(d.tx, d.ty, d.tz);
            this._dummy.rotation.set(0, 0, 0);
            this._dummy.scale.setScalar(1.0);
            this._dummy.updateMatrix();
            this.frameMesh.setMatrixAt(i, this._dummy.matrix);
            this.beaconMesh.setMatrixAt(i, this._dummy.matrix);
            this.propMesh.setMatrixAt(i, this._dummy.matrix);
            this.beaconMesh.setColorAt(i, d.baseColor);
        }
        this.frameMesh.instanceMatrix.needsUpdate = true;
        this.beaconMesh.instanceMatrix.needsUpdate = true;
        this.propMesh.instanceMatrix.needsUpdate = true;
        if (this.beaconMesh.instanceColor) {
            this.beaconMesh.instanceColor.needsUpdate = true;
        }

        return root;
    }

    /**
     * Builds a single merged BufferGeometry for a quadcopter frame:
     * central fuselage pod + 4 diagonal carbon-fiber arms + 4 motor housings.
     */
    _buildQuadcopterFrameGeometry() {
        const positions = [];
        const normals = [];

        const pushBox = (cx, cy, cz, sx, sy, sz, rotY = 0) => {
            const g = new THREE.BoxGeometry(sx, sy, sz);
            if (rotY !== 0) g.rotateY(rotY);
            g.translate(cx, cy, cz);
            const pos = g.attributes.position;
            const norm = g.attributes.normal;
            const idx = g.index;
            for (let i = 0; i < idx.count; i++) {
                const vi = idx.getX(i);
                positions.push(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
                normals.push(norm.getX(vi), norm.getY(vi), norm.getZ(vi));
            }
            g.dispose();
        };

        // Central avionics fuselage pod
        pushBox(0, 0, 0, 0.22, 0.085, 0.28, 0);
        // Two crossed diagonal X-arms (arm span ~0.58m)
        pushBox(0, 0.01, 0, 0.62, 0.032, 0.045, Math.PI * 0.25);
        pushBox(0, 0.01, 0, 0.62, 0.032, 0.045, -Math.PI * 0.25);
        // Four motor pods at the X-arm tips
        const armTip = 0.215;
        for (const [mx, mz] of [
            [armTip, armTip],
            [-armTip, armTip],
            [armTip, -armTip],
            [-armTip, -armTip]
        ]) {
            pushBox(mx, 0.032, mz, 0.068, 0.055, 0.068, 0);
        }

        const merged = new THREE.BufferGeometry();
        merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        merged.userData = { sharedAsset: true };
        return merged;
    }

    /**
     * Builds the luminous show-light core + 4 under-arm LED points for each quadcopter drone.
     */
    _buildDroneBeaconGeometry() {
        const positions = [];
        const pushOcta = (cx, cy, cz, r) => {
            const g = new THREE.OctahedronGeometry(r, 1);
            g.translate(cx, cy, cz);
            const pos = g.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
            }
            g.dispose();
        };

        // Central high-intensity show beacon dome
        pushOcta(0, 0, 0, 0.165);
        // 4 navigation LEDs under the 4 rotor pods
        const armTip = 0.215;
        for (const [mx, mz] of [
            [armTip, armTip],
            [-armTip, armTip],
            [armTip, -armTip],
            [-armTip, -armTip]
        ]) {
            pushOcta(mx, -0.015, mz, 0.042);
        }

        const merged = new THREE.BufferGeometry();
        merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        merged.computeVertexNormals();
        merged.userData = { sharedAsset: true };
        return merged;
    }

    /**
     * Builds 4 spinning rotor-blade crossbars at the 4 motor tips.
     */
    _buildQuadPropellerDiscsGeometry() {
        const positions = [];
        const pushBlade = (cx, cy, cz, len, wid, rotY) => {
            const g = new THREE.PlaneGeometry(len, wid);
            g.rotateX(-Math.PI * 0.5);
            g.rotateY(rotY);
            g.translate(cx, cy, cz);
            const pos = g.attributes.position;
            const idx = g.index;
            for (let i = 0; i < idx.count; i++) {
                const vi = idx.getX(i);
                positions.push(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
            }
            g.dispose();
        };

        const armTip = 0.215;
        for (const [mx, mz] of [
            [armTip, armTip],
            [-armTip, armTip],
            [armTip, -armTip],
            [-armTip, -armTip]
        ]) {
            pushBlade(mx, 0.068, mz, 0.22, 0.034, 0.35);
            pushBlade(mx, 0.068, mz, 0.22, 0.034, 0.35 + Math.PI * 0.5);
        }

        const merged = new THREE.BufferGeometry();
        merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        merged.userData = { sharedAsset: true };
        return merged;
    }

    /**
     * Positions the drone swarm corridor directly on the Bald Eagle's high-altitude climb path
     * (`along = 176m`, `y = 122.5m`, while the eagle climbs to `along = 250m`, `y = 135m`)
     * so the eagle and chase camera fly right through and pass the drones while they are
     * slowly disengaging from the spelled title.
     */
    placeForEagleCorridor({ cx, cz, dirX, dirZ, perpX, perpZ, exitLat = 0 }) {
        const alongDist = 176.0;
        const centerY = 122.5;
        const wx = cx + dirX * alongDist + perpX * exitLat;
        const wz = cz + dirZ * alongDist + perpZ * exitLat;

        this.group.position.set(wx, centerY, wz);
        this.group.rotation.set(0, Math.atan2(-dirX, -dirZ), 0);
        this.group.scale.setScalar(1.0);

        this.setReveal(0.0, null, 1.0, 0.0, 0.0, 0.0);
    }

    /**
     * Updates the drone swarm stroke formation, separation once seen by the camera,
     * hover bobbing, propeller spin, and show-light shimmer.
     * @param {number} reveal - Overall visibility envelope (0..1)
     * @param {THREE.Color|null} liveFogColor - Current scene fog color
     * @param {number} popScale - Group scale multiplier
     * @param {number} popFlash - Arrival flash boost (0..1)
     * @param {number} separationProgress - Separation progress from stroke words outward as camera sees & approaches (0..1)
     * @param {number} dt - Frame delta time in seconds
     */
    setReveal(reveal, liveFogColor = null, popScale = 1.0, popFlash = 0.0, separationProgress = 0.0, dt = 0.016) {
        const clamped = THREE.MathUtils.clamp(reveal, 0.0, 1.0);
        this.revealFactor = clamped;
        this.separationFactor = THREE.MathUtils.clamp(separationProgress, 0.0, 1.0);
        this.formationFactor = Number((1.0 - this.separationFactor).toFixed(4));
        this.elapsedTime += Math.max(0, dt);

        if (liveFogColor && liveFogColor.isColor) {
            this._fogColor.copy(liveFogColor);
        } else if (this.scene?.fog?.color) {
            this._fogColor.copy(this.scene.fog.color);
        }

        if (clamped <= 0.002) {
            this.group.visible = false;
            return;
        }

        this.group.visible = true;
        this.group.scale.setScalar(popScale);

        const sepGlobal = this.separationFactor;
        const t = this.elapsedTime;
        const flashBoost = THREE.MathUtils.clamp(popFlash, 0.0, 1.0) * 0.45;

        this._frameMat.opacity = THREE.MathUtils.clamp(clamped * 0.96, 0.0, 1.0);
        this._beaconMat.opacity = THREE.MathUtils.clamp(clamped, 0.0, 1.0);
        this._propMat.opacity = THREE.MathUtils.clamp(clamped * 0.68, 0.0, 0.85);

        for (let i = 0; i < this.droneCount; i++) {
            const d = this.drones[i];
            // Each drone starts in the crisp stroke-only text formation and separates outward once the camera sees it
            const localSep = THREE.MathUtils.clamp((sepGlobal - d.sepDelay) / (1.0 - d.sepDelay), 0.0, 1.0);
            const easedSep = localSep * localSep * (3.0 - 2.0 * localSep);

            const hoverBobY = Math.sin(t * d.bobSpeed + d.phase) * (0.08 + easedSep * 0.36);
            const hoverSwayX = Math.cos(t * (d.bobSpeed * 0.75) + d.phase) * (0.04 + easedSep * 0.28);
            const hoverSwayZ = Math.sin(t * (d.bobSpeed * 0.82) - d.phase) * (0.06 + easedSep * 0.32);

            const px = THREE.MathUtils.lerp(d.tx, d.sx, easedSep) + hoverSwayX;
            const py = THREE.MathUtils.lerp(d.ty, d.sy, easedSep) + hoverBobY;
            const pz = THREE.MathUtils.lerp(d.tz, d.sz, easedSep) + hoverSwayZ;

            // Subtle quadcopter banking tilt as each drone peels away from the stroke outline
            const bankZ = Math.sin(t * 2.8 + d.phase) * (0.04 + easedSep * 0.28);
            const pitchX = Math.cos(t * 2.4 + d.phase) * (0.03 + easedSep * 0.24);

            this._dummy.position.set(px, py, pz);
            this._dummy.rotation.set(pitchX, 0, bankZ);
            this._dummy.scale.setScalar(1.0 + flashBoost * 0.22);
            this._dummy.updateMatrix();

            this.frameMesh.setMatrixAt(i, this._dummy.matrix);
            this.beaconMesh.setMatrixAt(i, this._dummy.matrix);

            // Spin propellers rapidly on each drone
            this._propDummy.position.set(px, py, pz);
            this._propDummy.rotation.set(pitchX, (t * 28.0 + d.phase) % (Math.PI * 2.0), bankZ);
            this._propDummy.scale.setScalar(1.0);
            this._propDummy.updateMatrix();
            this.propMesh.setMatrixAt(i, this._propDummy.matrix);

            // Shimmering LED wave across the spelled stroke letters
            const wave = 0.5 + 0.5 * Math.sin(t * 3.6 - d.tx * 0.14 + d.phase * 0.3);
            this._tmpColor.copy(d.baseColor);
            if (flashBoost > 0.01 || wave > 0.72) {
                this._tmpColor.lerp(
                    new THREE.Color('#ffffff'),
                    Math.min(0.65, flashBoost + (wave - 0.72) * 0.85)
                );
            }
            this.beaconMesh.setColorAt(i, this._tmpColor);
        }

        this.frameMesh.instanceMatrix.needsUpdate = true;
        this.beaconMesh.instanceMatrix.needsUpdate = true;
        this.propMesh.instanceMatrix.needsUpdate = true;
        if (this.beaconMesh.instanceColor) {
            this.beaconMesh.instanceColor.needsUpdate = true;
        }
    }

    hide() {
        this.setReveal(0.0, null, 1.0, 0.0, 0.0, 0.0);
    }
}
