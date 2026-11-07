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
        this.currentHour = 14.0;
        this.darkMapEnabled = false;
        this.mapDarkness = 0.68;
        this.topoActive = false;

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
            0.8,
            5500
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

        // Bulldozer 1m x 1m Square Cursor Highlight
        this.bulldozerActive = false;
        this.bulldozerGroup = new THREE.Group();
        this.bulldozerGroup.name = 'Bulldozer1mCursor';
        this.bulldozerGroup.visible = false;
        const bBoxGeo = new THREE.BoxGeometry(1.0, 0.3048, 1.0);
        const bFillMat = new THREE.MeshBasicMaterial({
            color: '#f59e0b',
            transparent: true,
            opacity: 0.35,
            depthTest: false
        });
        const bEdgesGeo = new THREE.EdgesGeometry(bBoxGeo);
        const bLineMat = new THREE.LineBasicMaterial({
            color: '#fde047',
            depthTest: false
        });
        const bFillMesh = new THREE.Mesh(bBoxGeo, bFillMat);
        bFillMesh.position.y = -0.3048 * 0.5;
        const bWireMesh = new THREE.LineSegments(bEdgesGeo, bLineMat);
        bWireMesh.position.y = -0.3048 * 0.5;
        this.bulldozerGroup.add(bFillMesh, bWireMesh);
        this.scene.add(this.bulldozerGroup);

        this.setTimeOfDay(14.0);
    }

    setTimeOfDay(hourFloat) {
        this.currentHour = hourFloat;
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

        if (this.topoActive || (this.darkMapEnabled && this.mapDarkness >= 0.25)) {
            this.scene.background.set('#0b1120');
            this.scene.fog.color.set('#0b1120');
            if (this.sky) this.sky.visible = false;
            this.renderer.toneMappingExposure = 1.02;
        } else {
            if (this.sky) this.sky.visible = this.gpuAccelerated;
            if (nightFactor > 0.5) {
                this.scene.background.set('#0f172a');
                this.scene.fog.color.set('#0f172a');
                this.renderer.toneMappingExposure = 0.82;
            } else if (elevationDeg < 15) {
                this.scene.background.set('#f3c69f');
                this.scene.fog.color.set('#f3c69f');
                this.renderer.toneMappingExposure = 0.98;
            } else {
                this.scene.background.set('#cce0f5');
                this.scene.fog.color.set('#dce7f2');
                this.renderer.toneMappingExposure = 1.05;
            }
        }

        this.wallFoundry.updateFoundrySettings({ nightFactor });
        this.groundFoundry.setNightLighting(nightFactor);
    }

    _syncEnvironmentTheme() {
        const activeDarkness = this.darkMapEnabled ? this.mapDarkness : 0.0;
        this.groundFoundry.setGroundTheme({
            darkness: activeDarkness,
            topoActive: this.topoActive
        });
        this.setTimeOfDay(this.currentHour || 14.0);

        const darkCheck = document.getElementById('toggle-dark-map');
        if (darkCheck) darkCheck.checked = this.darkMapEnabled || this.topoActive;
        const quickDarkBtn = document.getElementById('btn-quick-dark-map');
        if (quickDarkBtn) quickDarkBtn.classList.toggle('active', this.darkMapEnabled || this.topoActive);
        const darkSlider = document.getElementById('foundry-map-darken');
        const darkVal = document.getElementById('foundry-map-darken-val');
        const shownPct = Math.round(
            (this.topoActive ? Math.max(activeDarkness, 0.76) : activeDarkness) * 100
        );
        if (darkSlider) darkSlider.value = String(shownPct);
        if (darkVal) darkVal.textContent = `${shownPct}%`;
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
            this.sky.visible = this.gpuAccelerated && !this.topoActive && !(this.darkMapEnabled && this.mapDarkness >= 0.25);
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
            this.topoActive = contourToggle.checked;
            this.groundFoundry.contourLinesMesh.visible = contourToggle.checked;
        }
        this._syncEnvironmentTheme();

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

        const darkMapCheck = document.getElementById('toggle-dark-map');
        if (darkMapCheck) {
            darkMapCheck.addEventListener('change', (e) => {
                this.darkMapEnabled = e.target.checked;
                if (this.darkMapEnabled && this.mapDarkness < 0.15) {
                    this.mapDarkness = 0.68;
                }
                this._syncEnvironmentTheme();
            });
        }

        const quickDarkBtn = document.getElementById('btn-quick-dark-map');
        if (quickDarkBtn) {
            quickDarkBtn.addEventListener('click', () => {
                this.darkMapEnabled = !this.darkMapEnabled;
                if (this.darkMapEnabled && this.mapDarkness < 0.15) {
                    this.mapDarkness = 0.68;
                }
                this._syncEnvironmentTheme();
            });
        }

        const darkSlider = document.getElementById('foundry-map-darken');
        if (darkSlider) {
            darkSlider.addEventListener('input', (e) => {
                const pct = parseFloat(e.target.value) || 0;
                this.mapDarkness = pct / 100;
                this.darkMapEnabled = pct > 0;
                this._syncEnvironmentTheme();
            });
        }

        const contourCheck = document.getElementById('toggle-contours');
        if (contourCheck) {
            contourCheck.addEventListener('change', (e) => {
                this.topoActive = e.target.checked;
                if (this.groundFoundry.contourLinesMesh) {
                    this.groundFoundry.contourLinesMesh.visible = this.topoActive;
                }
                this._syncEnvironmentTheme();
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

        this.clearSelection();
        const optBtn = document.getElementById('btn-toggle-options');
        if (optBtn) {
            optBtn.addEventListener('click', () => {
                const hidden = document.body.classList.toggle('options-hidden');
                optBtn.textContent = hidden ? '⚙️ Options' : '✕ Hide Options';
            });
        }

        // Bulldozer Tool UI Controls (1m x 1m square lowered by 1 foot per click/drag)
        const bulldozeBtn = document.getElementById('btn-bulldozer-tool');
        const undoBtn = document.getElementById('btn-bulldozer-undo');
        const clearBtn = document.getElementById('btn-bulldozer-clear');
        const readoutEl = document.getElementById('bulldozer-readout');

        const syncBulldozerButtons = () => {
            const hasEdits = this.groundFoundry.bulldozedCells && this.groundFoundry.bulldozedCells.size > 0;
            if (undoBtn) undoBtn.classList.toggle('hidden', !this.bulldozerActive && !hasEdits);
            if (clearBtn) clearBtn.classList.toggle('hidden', !this.bulldozerActive && !hasEdits);
            if (readoutEl) readoutEl.classList.toggle('hidden', !this.bulldozerActive);
        };
        this._syncBulldozerButtons = syncBulldozerButtons;

        if (bulldozeBtn) {
            bulldozeBtn.addEventListener('click', () => {
                this.bulldozerActive = !this.bulldozerActive;
                bulldozeBtn.classList.toggle('active', this.bulldozerActive);
                this.controls.enableRotate = !this.bulldozerActive;
                this.renderer.domElement.style.cursor = this.bulldozerActive ? 'crosshair' : 'default';
                if (!this.bulldozerActive) {
                    this.bulldozerGroup.visible = false;
                }
                syncBulldozerButtons();
            });
        }
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                if (this.groundFoundry.undoBulldoze()) {
                    this._refreshBulldozeDependents();
                    syncBulldozerButtons();
                }
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (this.groundFoundry.clearAllBulldoze()) {
                    this._refreshBulldozeDependents();
                    syncBulldozerButtons();
                }
            });
        }
        syncBulldozerButtons();
    }

    _refreshBulldozeDependents() {
        // Re-spawn Building 316 so its terrain-contoured Douglas St grass & sidewalk follow any bulldozed terrain
        const b316 = CAMPUS_DATA.campusBuildings.find((b) => b.code === '316' || b.id === 'building-316');
        if (b316) {
            this._spawnCampusBuilding(b316);
        }
        this.renderer.shadowMap.needsUpdate = true;
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
        let isBulldozeDragging = false;
        let lastBulldozedCellKey = null;
        const readoutEl = document.getElementById('bulldozer-readout');

        const raycastTerrainPoint = (clientX, clientY) => {
            const targetMesh = this.groundFoundry.innerTerrainMesh;
            if (!targetMesh) return null;
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            this.raycaster.setFromCamera(this.pointer, this.camera);
            const hits = this.raycaster.intersectObject(targetMesh, false);
            return hits.length > 0 ? hits[0].point : null;
        };

        const applyBulldozeAtPoint = (pt, shiftKey = false) => {
            const ix = Math.floor(pt.x);
            const iz = Math.floor(pt.z);
            const cellKey = `${ix},${iz}`;
            if (isBulldozeDragging && cellKey === lastBulldozedCellKey) return;
            lastBulldozedCellKey = cellKey;

            const deltaSteps = shiftKey ? -1 : 1; // 1 foot down per step (Shift+Click raises 1 foot)
            const res = this.groundFoundry.bulldoze1mSquare(pt.x, pt.z, deltaSteps);
            const newY = this.groundFoundry.getTerrainHeight(ix + 0.5, iz + 0.5);
            this.bulldozerGroup.position.set(ix + 0.5, newY + 0.02, iz + 0.5);
            this.bulldozerGroup.visible = true;
            if (readoutEl) {
                readoutEl.textContent = `1m×1m [${ix}, ${iz}] • Lowered -${res.feetLowered} ft (${(res.feetLowered * 0.3048).toFixed(2)}m)`;
            }
            if (this._syncBulldozerButtons) this._syncBulldozerButtons();
        };

        this.renderer.domElement.addEventListener('pointermove', (e) => {
            if (!this.bulldozerActive) return;
            const pt = raycastTerrainPoint(e.clientX, e.clientY);
            if (!pt) {
                this.bulldozerGroup.visible = false;
                return;
            }
            const ix = Math.floor(pt.x);
            const iz = Math.floor(pt.z);
            const cy = this.groundFoundry.getTerrainHeight(ix + 0.5, iz + 0.5);
            this.bulldozerGroup.position.set(ix + 0.5, cy + 0.02, iz + 0.5);
            this.bulldozerGroup.visible = true;

            if (isBulldozeDragging && (e.buttons & 1)) {
                applyBulldozeAtPoint(pt, e.shiftKey);
            } else if (readoutEl) {
                const curSteps = this.groundFoundry.bulldozedCells.get(`${ix},${iz}`) || 0;
                readoutEl.textContent = `1m×1m [${ix}, ${iz}] • Current: -${curSteps} ft (Click: -1 ft | Shift+Click: +1 ft)`;
            }
        });

        this.renderer.domElement.addEventListener('pointerdown', (e) => {
            pointerDownPos = { x: e.clientX, y: e.clientY };
            if (this.bulldozerActive && e.button === 0) {
                const pt = raycastTerrainPoint(e.clientX, e.clientY);
                if (pt) {
                    isBulldozeDragging = true;
                    lastBulldozedCellKey = null;
                    applyBulldozeAtPoint(pt, e.shiftKey);
                }
            }
        });

        window.addEventListener('pointerup', () => {
            if (isBulldozeDragging) {
                isBulldozeDragging = false;
                lastBulldozedCellKey = null;
                this._refreshBulldozeDependents();
            }
        });

        this.renderer.domElement.addEventListener('pointerup', (e) => {
            if (this.bulldozerActive) return;
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
