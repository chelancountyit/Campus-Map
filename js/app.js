import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Sky } from 'three/addons/objects/Sky.js';

import { CAMPUS_DATA } from '../data/campus-data.js';
import { WallFoundry } from './foundry/WallFoundry.js';
import { CampusGroundFoundry } from './foundry/CampusGroundFoundry.js';

const FRAME_INTERVAL_MS = 1000 / 60;

class ChelanCampus3DApp {
    constructor() {
        this.container = document.getElementById('viewport-container');
        this.clock = new THREE.Clock();
        this.textureLoader = new THREE.TextureLoader();
        this.animationFrameId = null;
        this.lastFrameTime = 0;

        this.wallFoundry = new WallFoundry(this.textureLoader);
        this.groundFoundry = new CampusGroundFoundry(this.textureLoader);

        this.campusBuildingMeshes = new Map();
        this.selectableMeshes = [];
        this.labelObjects = [];
        this.selectedBuilding = null;
        this.hoveredBuilding = null;

        this.cameraAnim = null;
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();

        const savedGpu = localStorage.getItem('chelan_gpu_accel');
        this.gpuAccelerated = savedGpu !== null ? savedGpu === 'true' : true;

        this._initScene();
        this._initSkyAndLights();
        this._buildCampusWorld();
        this._initUI();
        this.setGpuAcceleration(this.gpuAccelerated);
        this._bindEvents();
        this._animate();
    }

    _initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#cce0f5');
        this.scene.fog = new THREE.FogExp2('#dce7f2', 0.00055);

        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.25,
            15000
        );
        // Start zoomed-in on Building 400's front portico & left/front stairs so details are immediately visible
        this.camera.position.set(-14.5, 29.8, 39.5);

        this.renderer = new THREE.WebGLRenderer({
            antialias: this.gpuAccelerated,
            powerPreference: this.gpuAccelerated ? 'high-performance' : 'low-power'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(this.gpuAccelerated ? Math.min(window.devicePixelRatio, 2.0) : 0.85);
        this.renderer.shadowMap.enabled = this.gpuAccelerated;
        this.renderer.shadowMap.type = this.gpuAccelerated ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
        this.renderer.shadowMap.autoUpdate = false;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        this.container.appendChild(this.renderer.domElement);

        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0';
        this.labelRenderer.domElement.style.left = '0';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        this.labelRenderer.domElement.style.display = 'none';
        this.container.appendChild(this.labelRenderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.maxPolarAngle = Math.PI * 0.492;
        this.controls.minDistance = 2.5;
        this.controls.maxDistance = 950;
        this.controls.target.set(-24.8, 25.2, 22.8);
    }

    _initSkyAndLights() {
        this.sky = new Sky();
        this.sky.scale.setScalar(8000);
        this.scene.add(this.sky);

        this.hemiLight = new THREE.HemisphereLight('#e8f2ff', '#7d7568', 0.85);
        this.hemiLight.position.set(0, 150, 0);
        this.scene.add(this.hemiLight);

        this.sunLight = new THREE.DirectionalLight('#fff6e5', 2.4);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.set(1024, 1024);
        this.sunLight.shadow.camera.near = 10;
        this.sunLight.shadow.camera.far = 550;
        const d = 185;
        this.sunLight.shadow.camera.left = -d;
        this.sunLight.shadow.camera.right = d;
        this.sunLight.shadow.camera.top = d;
        this.sunLight.shadow.camera.bottom = -d;
        this.sunLight.shadow.bias = -0.0008;
        this.scene.add(this.sunLight);

        // Selection Highlight Ring
        const ringGeo = new THREE.RingGeometry(18, 21, 48);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
            color: '#38bdf8',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
            depthTest: false
        });
        this.selectionRing = new THREE.Mesh(ringGeo, ringMat);
        this.selectionRing.position.y = 0.28;
        this.selectionRing.visible = false;
        this.scene.add(this.selectionRing);

        this.setTimeOfDay(14.0);
    }

    setTimeOfDay(hourFloat) {
        const normalized = (hourFloat - 6) / 16;
        const elevationDeg = Math.sin(normalized * Math.PI) * 58 - 6;
        const azimuthDeg = -75 + normalized * 190;

        const phi = THREE.MathUtils.degToRad(90 - Math.max(-4, elevationDeg));
        const theta = THREE.MathUtils.degToRad(azimuthDeg);
        const sunPos = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

        const uniforms = this.sky.material.uniforms;
        uniforms['turbidity'].value = elevationDeg < 12 ? 8.5 : 3.5;
        uniforms['rayleigh'].value = elevationDeg < 12 ? 2.8 : 1.4;
        uniforms['mieCoefficient'].value = 0.005;
        uniforms['mieDirectionalG'].value = 0.8;
        if (uniforms['cloudCoverage']) uniforms['cloudCoverage'].value = 0.0;
        uniforms['sunPosition'].value.copy(sunPos);

        this.sunLight.position.copy(sunPos).multiplyScalar(220);
        this.renderer.shadowMap.needsUpdate = true;

        const nightFactor = THREE.MathUtils.clamp(1 - (elevationDeg + 4) / 22, 0, 1);
        this.sunLight.intensity = Math.max(0.12, (1 - nightFactor * 0.92) * 2.5);
        this.hemiLight.intensity = Math.max(0.22, (1 - nightFactor * 0.7) * 0.9);

        if (nightFactor > 0.5) {
            this.scene.fog.color.set('#0f172a');
            this.renderer.toneMappingExposure = 0.82;
        } else if (elevationDeg < 15) {
            this.scene.fog.color.set('#f3c69f');
            this.renderer.toneMappingExposure = 0.98;
        } else {
            this.scene.fog.color.set('#dce7f2');
            this.renderer.toneMappingExposure = 1.05;
        }

        this.wallFoundry.updateFoundrySettings({ nightFactor });
        this.groundFoundry.setNightLighting(nightFactor);
    }

    setGpuAcceleration(enabled) {
        this.gpuAccelerated = Boolean(enabled);
        try {
            localStorage.setItem('chelan_gpu_accel', String(this.gpuAccelerated));
        } catch (_) {}

        // 1. High-DPI Pixel Ratio & CSS Hardware Layer Compositing
        this.renderer.setPixelRatio(this.gpuAccelerated ? Math.min(window.devicePixelRatio, 2.0) : 0.85);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        const canvas = this.renderer.domElement;
        canvas.style.willChange = this.gpuAccelerated ? 'transform' : 'auto';
        canvas.style.transform = this.gpuAccelerated ? 'translateZ(0)' : 'none';

        // 2. Hardware Shadow Map & Atmospheric Sky Shader
        this.renderer.shadowMap.enabled = this.gpuAccelerated;
        this.renderer.shadowMap.type = this.gpuAccelerated ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
        if (this.sunLight) {
            this.sunLight.castShadow = this.gpuAccelerated;
            const mapDim = this.gpuAccelerated ? 2048 : 512;
            if (this.sunLight.shadow.mapSize.x !== mapDim) {
                this.sunLight.shadow.mapSize.set(mapDim, mapDim);
                if (this.sunLight.shadow.map) {
                    this.sunLight.shadow.map.dispose();
                    this.sunLight.shadow.map = null;
                }
            }
        }
        if (this.sky) {
            this.sky.visible = this.gpuAccelerated;
        }

        // 3. Hardware Anisotropic Texture Filtering & Material Shader Refresh
        const maxAniso = this.gpuAccelerated ? this.renderer.capabilities.getMaxAnisotropy() : 1;
        this.scene.traverse((obj) => {
            if (!obj.isMesh || !obj.material) return;
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((mat) => {
                if (!mat) return;
                ['map', 'bumpMap', 'normalMap', 'roughnessMap'].forEach((texKey) => {
                    if (mat[texKey]) {
                        mat[texKey].anisotropy = maxAniso;
                        mat[texKey].needsUpdate = true;
                    }
                });
                mat.needsUpdate = true;
            });
        });

        this.renderer.shadowMap.needsUpdate = true;
    }

    _buildCampusWorld() {
        if (this.groundGroup) {
            this.scene.remove(this.groundGroup);
        }
        if (this.campusGroup) {
            this.campusBuildingMeshes.forEach((entry) => {
                if (entry.label) entry.group.remove(entry.label);
            });
            this.scene.remove(this.campusGroup);
        }
        if (this.contextGroup) {
            this.scene.remove(this.contextGroup);
        }
        if (this.streetLabelObjects) {
            this.streetLabelObjects.forEach((o) => this.scene.remove(o));
        }

        this.campusBuildingMeshes.clear();
        this.selectableMeshes = [];
        this.labelObjects = [];
        this.streetLabelObjects = [];

        // 1. 3D USGS 3DEP Terrain, Foothills, Contours & Draped Streets/Parking
        this.groundGroup = this.groundFoundry.buildEnvironment(this.scene, CAMPUS_DATA);

        // 2. Core Chelan County Campus Buildings placed on exact 3D terrain elevation
        this.campusGroup = new THREE.Group();
        this.campusGroup.name = 'CampusBuildingsGroup';
        this.scene.add(this.campusGroup);

        const sortedBldgs = [...CAMPUS_DATA.campusBuildings].sort(
            (a, b) => (a.sortOrder || 99) - (b.sortOrder || 99)
        );

        sortedBldgs.forEach((bldg) => {
            this._spawnCampusBuilding(bldg);
        });

        // 3. Surrounding Downtown Wenatchee Context Buildings placed on 3D terrain (hidden by default)
        this.contextGroup = this.wallFoundry.buildContextBuildingsBatch(
            CAMPUS_DATA.contextBuildings,
            (x, z) => this.groundFoundry.getTerrainHeight(x, z)
        );
        const ctxToggle = document.getElementById('toggle-context');
        this.contextGroup.visible = ctxToggle ? ctxToggle.checked : false;
        this.scene.add(this.contextGroup);

        // 4. Street Name Floating Markers on 3D Terrain
        this._createStreetLabels();

        const contourToggle = document.getElementById('toggle-contours');
        if (contourToggle && this.groundFoundry.contourLinesMesh) {
            this.groundFoundry.contourLinesMesh.visible = contourToggle.checked;
        }

        this.renderer.shadowMap.needsUpdate = true;
    }

    _spawnCampusBuilding(bldg) {
        if (this.campusBuildingMeshes.has(bldg.id)) {
            const old = this.campusBuildingMeshes.get(bldg.id);
            this.campusGroup.remove(old.group);
            if (old.label) old.group.remove(old.label);
            this.selectableMeshes = this.selectableMeshes.filter((m) => m.userData.building?.id !== bldg.id);
        }

        const splitRoadY = this.groundFoundry.getBuildingRoadHeight(bldg.id);
        const ty = splitRoadY !== null
            ? splitRoadY
            : this.groundFoundry.getTerrainHeight(bldg.center[0], bldg.center[1]);
        const bldgGroup = this.wallFoundry.buildCampusBuildingMesh(
            bldg,
            ty,
            (x, z) => this.groundFoundry.getTerrainHeight(x, z)
        );
        bldgGroup.traverse((child) => {
            if (child.isMesh && child.userData.isSelectableBuilding) {
                this.selectableMeshes.push(child);
            }
        });

        const labelEl = document.createElement('div');
        labelEl.className = `campus-3d-label ${this.selectedBuilding?.id === bldg.id ? 'selected' : ''}`;
        labelEl.innerHTML = `
            <span class="label-code">${bldg.code}</span>
            <span class="label-title">${bldg.shortName}</span>
            <span class="label-elev">${bldg.elevationFeet || 730} ft</span>
        `;
        labelEl.style.pointerEvents = 'auto';
        labelEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectBuilding(bldg.id, true);
        });

        const labelObj = new CSS2DObject(labelEl);
        const topAboveDatum = bldg.id === 'building-300' || bldg.code === '300'
            ? 8.2
            : (splitRoadY !== null
                ? ((bldg.floors || 3) - 1) * 4.2
                : (bldg.height || 14));
        labelObj.position.set(0, topAboveDatum + 5.0, 0);
        bldgGroup.add(labelObj);
        this.labelObjects.push(labelObj);

        this.campusGroup.add(bldgGroup);
        this.campusBuildingMeshes.set(bldg.id, { group: bldgGroup, label: labelObj, data: bldg });
        this.renderer.shadowMap.needsUpdate = true;
    }

    _createStreetLabels() {
        const streetMarkers = [
            { name: 'ORONDO AVE (728 ft)', x: 96, z: 48 },
            { name: 'WASHINGTON ST (733 ft)', x: -32, z: -22 },
            { name: 'DOUGLAS ST (737 ft)', x: -24, z: 38 },
            { name: 'S. CHELAN AVE (695 ft)', x: 185, z: -85 }
        ];
        streetMarkers.forEach((st) => {
            const el = document.createElement('div');
            el.className = 'street-3d-label';
            el.textContent = st.name;
            const obj = new CSS2DObject(el);
            const ty = this.groundFoundry.getTerrainHeight(st.x, st.z);
            obj.position.set(st.x, ty + 1.8, st.z);
            this.scene.add(obj);
            this.labelObjects.push(obj);
            this.streetLabelObjects.push(obj);
        });
    }

    _initUI() {
        this._renderBuildingDirectory('');

        const searchInput = document.getElementById('campus-search');
        searchInput.addEventListener('input', (e) => {
            this._renderBuildingDirectory(e.target.value.trim());
        });

        document.getElementById('btn-reset-cam').addEventListener('click', () => {
            this.flyToPosition(new THREE.Vector3(115, 95, 145), new THREE.Vector3(8, 6, 18));
        });
        document.getElementById('btn-top-cam').addEventListener('click', () => {
            this.flyToPosition(new THREE.Vector3(8, 255, 22), new THREE.Vector3(8, 0, 18));
        });

        document.getElementById('toggle-context').addEventListener('change', (e) => {
            this.contextGroup.visible = e.target.checked;
        });
        document.getElementById('toggle-labels').addEventListener('change', (e) => {
            this.labelRenderer.domElement.style.display = e.target.checked ? 'block' : 'none';
        });

        const satToggle = document.getElementById('toggle-satellite');
        if (satToggle) {
            satToggle.addEventListener('change', (e) => {
                this.groundFoundry.setMapStyle(e.target.checked ? 'satellite' : 'roadmap');
            });
        }

        const contourCheck = document.getElementById('toggle-contours');
        if (contourCheck) {
            contourCheck.addEventListener('change', (e) => {
                if (this.groundFoundry.contourLinesMesh) {
                    this.groundFoundry.contourLinesMesh.visible = e.target.checked;
                }
            });
        }

        const gpuToggle = document.getElementById('toggle-gpu');
        if (gpuToggle) {
            gpuToggle.checked = this.gpuAccelerated;
            gpuToggle.addEventListener('change', (e) => {
                this.setGpuAcceleration(e.target.checked);
            });
        }

        const timeSlider = document.getElementById('time-slider');
        const timeDisplay = document.getElementById('time-display');
        timeSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            const hrs = Math.floor(val);
            const mins = Math.round((val - hrs) * 60);
            const ampm = hrs >= 12 ? 'PM' : 'AM';
            const hr12 = hrs > 12 ? hrs - 12 : (hrs === 0 ? 12 : hrs);
            timeDisplay.textContent = `${hr12}:${mins.toString().padStart(2, '0')} ${ampm}`;
            this.setTimeOfDay(val);
        });

        document.getElementById('btn-toggle-foundry').addEventListener('click', () => {
            document.getElementById('foundry-drawer').classList.toggle('collapsed');
        });

        const wallStyleSelect = document.getElementById('foundry-wall-style');
        const wallColorInput = document.getElementById('foundry-wall-color');
        const trimColorInput = document.getElementById('foundry-trim-color');

        const applyWallCustomization = () => {
            if (!this.selectedBuilding) return;
            this.selectedBuilding.wallStyle = wallStyleSelect.value;
            this.selectedBuilding.color = wallColorInput.value;
            this.selectedBuilding.trimColor = trimColorInput.value;
            this._spawnCampusBuilding(this.selectedBuilding);
        };

        wallStyleSelect.addEventListener('change', applyWallCustomization);
        wallColorInput.addEventListener('input', applyWallCustomization);
        trimColorInput.addEventListener('input', applyWallCustomization);

        document.getElementById('foundry-mortar-depth').addEventListener('input', (e) => {
            this.wallFoundry.updateFoundrySettings({ mortarDepth: parseFloat(e.target.value) });
        });
        document.getElementById('foundry-window-glow').addEventListener('input', (e) => {
            this.wallFoundry.updateFoundrySettings({ windowGlow: parseFloat(e.target.value) });
        });

        const exagSlider = document.getElementById('foundry-terrain-exag');
        const exagVal = document.getElementById('foundry-terrain-exag-val');
        if (exagSlider) {
            exagSlider.addEventListener('change', (e) => {
                const v = parseFloat(e.target.value);
                if (exagVal) exagVal.textContent = `${v.toFixed(1)}×`;
                this.groundFoundry.exaggeration = v;
                this._buildCampusWorld();
                if (this.selectedBuilding) {
                    this.selectBuilding(this.selectedBuilding.id, false);
                }
            });
            exagSlider.addEventListener('input', (e) => {
                const v = parseFloat(e.target.value);
                if (exagVal) exagVal.textContent = `${v.toFixed(1)}×`;
            });
        }

        document.getElementById('close-detail-btn').addEventListener('click', () => {
            this.clearSelection();
        });

        this.selectBuilding('courthouse-350', false);
    }

    _renderBuildingDirectory(query) {
        const listEl = document.getElementById('building-list');
        listEl.innerHTML = '';
        const q = query.toLowerCase();

        const sortedBldgs = [...CAMPUS_DATA.campusBuildings].sort(
            (a, b) => (a.sortOrder || 99) - (b.sortOrder || 99)
        );

        sortedBldgs.forEach((bldg) => {
            const matchBldg =
                bldg.name.toLowerCase().includes(q) ||
                bldg.address.toLowerCase().includes(q) ||
                bldg.code.toLowerCase().includes(q);
            const matchingDepts = (bldg.departments || []).filter(
                (d) => d.name.toLowerCase().includes(q) || d.suite.toLowerCase().includes(q)
            );

            if (!matchBldg && matchingDepts.length === 0) return;

            const card = document.createElement('div');
            card.className = `bldg-list-item ${this.selectedBuilding?.id === bldg.id ? 'active' : ''}`;
            card.dataset.id = bldg.id;
            card.innerHTML = `
                <div class="bldg-item-header">
                    <span class="bldg-badge" style="background:${bldg.color}">${bldg.code}</span>
                    <div class="bldg-item-titles">
                        <h4>${bldg.name}</h4>
                        <p>${bldg.address}</p>
                    </div>
                </div>
                <div class="bldg-item-meta">
                    <span>⛰️ ${bldg.elevationFeet || 730} ft (${bldg.elevationMeters || 223}m)</span>
                    <span>•</span>
                    <span>${bldg.floors} Floors</span>
                    <span>•</span>
                    <span>${(bldg.departments || []).length} Depts</span>
                </div>
            `;
            card.addEventListener('click', () => this.selectBuilding(bldg.id, true));
            listEl.appendChild(card);
        });
    }

    selectBuilding(buildingId, flyTo = true) {
        const entry = this.campusBuildingMeshes.get(buildingId);
        if (!entry) return;

        const bldg = entry.data;
        this.selectedBuilding = bldg;
        const splitRoadY = this.groundFoundry.getBuildingRoadHeight(bldg.id);
        const ty = splitRoadY !== null
            ? splitRoadY
            : this.groundFoundry.getTerrainHeight(bldg.center[0], bldg.center[1]);

        document.querySelectorAll('.bldg-list-item').forEach((el) => {
            el.classList.toggle('active', el.dataset.id === buildingId);
        });
        document.querySelectorAll('.campus-3d-label').forEach((el) => {
            el.classList.remove('selected');
        });
        if (entry.label?.element) {
            entry.label.element.classList.add('selected');
        }

        this.selectionRing.position.set(bldg.center[0], ty + 0.45, bldg.center[1]);
        this.selectionRing.visible = true;

        const detailPanel = document.getElementById('building-detail-card');
        detailPanel.classList.remove('hidden');
        document.getElementById('detail-code').textContent = bldg.code;
        document.getElementById('detail-code').style.background = bldg.color;
        document.getElementById('detail-name').textContent = bldg.name;
        document.getElementById('detail-address').textContent = bldg.address;
        document.getElementById('detail-summary').textContent = bldg.summary;
        document.getElementById('detail-floors').textContent = `${bldg.floors} Stories (${bldg.height}m)`;
        document.getElementById('detail-year').textContent = `${bldg.elevationFeet || 730} ft (${bldg.elevationMeters || 223}m ASL)`;
        document.getElementById('detail-hours').textContent = bldg.hours;
        document.getElementById('detail-phone').textContent = bldg.phone;

        const deptContainer = document.getElementById('detail-departments');
        deptContainer.innerHTML = (bldg.departments || [])
            .map(
                (d) => `
                <div class="dept-row">
                    <div class="dept-floor-pill">${d.level}</div>
                    <div class="dept-info">
                        <strong>${d.name}</strong>
                        <span>${d.suite} • ${d.phone}</span>
                    </div>
                </div>
            `
            )
            .join('');

        document.getElementById('foundry-target-name').textContent = bldg.shortName;
        document.getElementById('foundry-wall-style').value = bldg.wallStyle;
        document.getElementById('foundry-wall-color').value = bldg.color;
        document.getElementById('foundry-trim-color').value = bldg.trimColor;

        if (flyTo) {
            if (buildingId === 'building-400') {
                // Close-up front-left perspective of Building 400's portico, left-side blue-gray stairs, stone bench & plaza
                const target = new THREE.Vector3(-24.8, ty + 2.2, 22.8);
                const camPos = new THREE.Vector3(-14.5, ty + 6.8, 39.5);
                this.flyToPosition(camPos, target);
            } else {
                const target = new THREE.Vector3(bldg.center[0], ty + bldg.height * 0.45, bldg.center[1]);
                const offset = new THREE.Vector3(58, 48, 68);
                this.flyToPosition(target.clone().add(offset), target);
            }
        }
    }

    clearSelection() {
        this.selectedBuilding = null;
        this.selectionRing.visible = false;
        document.getElementById('building-detail-card').classList.add('hidden');
        document.querySelectorAll('.bldg-list-item').forEach((el) => el.classList.remove('active'));
        document.querySelectorAll('.campus-3d-label').forEach((el) => el.classList.remove('selected'));
    }

    flyToPosition(camPos, targetPos) {
        this.cameraAnim = {
            startPos: this.camera.position.clone(),
            endPos: camPos.clone(),
            startTarget: this.controls.target.clone(),
            endTarget: targetPos.clone(),
            progress: 0
        };
    }

    _bindEvents() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.animationFrameId !== null) {
                    cancelAnimationFrame(this.animationFrameId);
                    this.animationFrameId = null;
                }
                return;
            }

            this.lastFrameTime = 0;
            this._animate();
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        });

        let pointerDownPos = { x: 0, y: 0 };
        this.renderer.domElement.addEventListener('pointerdown', (e) => {
            pointerDownPos = { x: e.clientX, y: e.clientY };
        });

        this.renderer.domElement.addEventListener('pointerup', (e) => {
            const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
            if (moveDist > 6) return;

            const rect = this.renderer.domElement.getBoundingClientRect();
            this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.pointer, this.camera);

            const hits = this.raycaster.intersectObjects(this.selectableMeshes, false);
            if (hits.length > 0) {
                const hitBldg = hits[0].object.userData.building;
                if (hitBldg) {
                    this.selectBuilding(hitBldg.id, true);
                }
            }
        });
    }

    _animate(timestamp = 0) {
        if (document.hidden) {
            this.animationFrameId = null;
            return;
        }

        this.animationFrameId = requestAnimationFrame((nextTimestamp) => this._animate(nextTimestamp));
        if (timestamp - this.lastFrameTime < FRAME_INTERVAL_MS) return;
        this.lastFrameTime = timestamp;

        const elapsed = this.clock.getElapsedTime();

        if (this.cameraAnim) {
            this.cameraAnim.progress += 0.045;
            const t = Math.min(1, this.cameraAnim.progress);
            const ease = 1 - Math.pow(1 - t, 3);
            this.camera.position.lerpVectors(this.cameraAnim.startPos, this.cameraAnim.endPos, ease);
            this.controls.target.lerpVectors(this.cameraAnim.startTarget, this.cameraAnim.endTarget, ease);
            if (t >= 1) this.cameraAnim = null;
        }

        if (this.selectionRing.visible) {
            const s = 1 + Math.sin(elapsed * 3.2) * 0.04;
            this.selectionRing.scale.set(s, s, 1);
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }
}

const bootCampusApp = () => {
    if (!window.chelanCampusApp) {
        window.chelanCampusApp = new ChelanCampus3DApp();
    }
};

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', bootCampusApp);
} else {
    bootCampusApp();
}
