import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Sky } from 'three/addons/objects/Sky.js';

import { CAMPUS_DATA } from '../data/campus-data.js';
import { WallFoundry } from './foundry/WallFoundry.js';
import { CampusGroundFoundry } from './foundry/CampusGroundFoundry.js';
import { TreePlanterFoundry, TREE_SPECIES_CATALOG } from './foundry/TreePlanterFoundry.js';
import { AdaAccessibilityFoundry, ADA_CAMPUS_FEATURES, BUILDING_ADA_SUMMARY } from './foundry/AdaAccessibilityFoundry.js';
import { LumaRealismFoundry } from './foundry/LumaRealismFoundry.js';
import { WenatcheeBackdropFoundry } from './foundry/WenatcheeBackdropFoundry.js';
import { BuildingWorkerPool } from './foundry/workers/BuildingWorkerPool.js';
import { exportBuildingGroupToGlbBuffer, downloadGlbBuffer } from './foundry/glb/BuildingGlbCodec.js';
import { upgradeObjectGrassWithLumaTexture } from './foundry/materials/GrassMaterial.js';
import { MigratingGeeseFoundry } from './foundry/MigratingGeeseFoundry.js';
import { FloorCutawayFoundry } from './foundry/FloorCutawayFoundry.js';
import { CrashResilienceWatchdog } from './foundry/system/CrashResilienceWatchdog.js';

const FRAME_INTERVAL_MS = 1000 / 60;

class ChelanCampus3DApp {
    constructor() {
        this.container = document.getElementById('viewport-container');
        this.clock = new THREE.Clock();
        this.textureLoader = new THREE.TextureLoader();
        this.animationFrameId = null;
        this.lastFrameTime = 0;
        this.watchdog = new CrashResilienceWatchdog(this, { vramLimitMB: 512 });

        this.wallFoundry = new WallFoundry(this.textureLoader);
        this.groundFoundry = new CampusGroundFoundry(this.textureLoader);
        this.buildingWorkerPool = new BuildingWorkerPool(this.wallFoundry, this.groundFoundry);
        this.isGlbBakeMode = Boolean(
            typeof window !== 'undefined' &&
            window.location &&
            window.location.search.includes('bakeGlb=1')
        );
        if (this.isGlbBakeMode) {
            this.buildingWorkerPool.useGlbFastPath = false;
            this.buildingWorkerPool.workersSupported = false;
        }

        this.campusBuildingMeshes = new Map();
        this.selectableMeshes = [];
        this.animatedFlags = [];
        this.labelObjects = [];
        this.selectedBuilding = null;
        this.hoveredBuilding = null;

        this.cameraAnim = null;
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();

        this.gpuAccelerated = true;
        this.hdrPopEnabled = true;
        this.hdrEnvIntensity = 0.65;
        this.currentHour = 14.5;
        this.realTimeSunEnabled = false;
        this.currentSolarOverride = null;
        this._realTimeSunTimer = null;
        this._onRealTimeVisibilityChange = () => {
            if (this.realTimeSunEnabled && typeof document !== 'undefined' && !document.hidden) {
                this._applyRealTimeSunNow();
            }
        };
        this.darkMapEnabled = true;
        this.mapDarkness = 0.76;
        this.drawTerrainOnly = false;
        this.topoActive = false;
        this.parcelsVisible = false;
        this.fogEnabled = true;
        this.activeFloorFilter = null;
        this.activeDepartmentZone = null;
        this.floorCutawayEnabled = true;
        this.reducedMotion = Boolean(
            typeof window !== 'undefined' &&
            window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        );
        this.adaPanelOpen = false;
        this.adaMarkersVisible = true;
        this.adaCategoryFilter = 'all';
        this.selectedAdaFeatureId = null;

        const searchParams =
            typeof window !== 'undefined' && window.location
                ? new URLSearchParams(window.location.search)
                : null;
        const rawKioskParam = searchParams
            ? String(searchParams.get('kiosk') || searchParams.get('tv') || '').toLowerCase()
            : '';
        this.initialKioskRequested = rawKioskParam === '1' || rawKioskParam === 'true';
        this.kioskMode = false;
        this.kioskPlaylist = [];
        this.kioskBeatIndex = 0;
        this.kioskBeatElapsed = 0;
        this._kioskWakeLock = null;
        this._kioskSavedState = null;
        this._kioskTransitionStartPos = new THREE.Vector3(115, 95, 145);
        this._kioskTransitionStartTarget = new THREE.Vector3(8, 6, 18);

        this._bootAsync();
    }

    _updateLoadingModal(pct, stepTitle, stepDetail = '') {
        if (!this._bootStartTime) this._bootStartTime = performance.now();
        const fillEl = document.getElementById('loading-progress-fill');
        const pctEl = document.getElementById('loading-progress-pct');
        const stepEl = document.getElementById('loading-step-title');
        const detailEl = document.getElementById('loading-step-detail');
        const elapsedEl = document.getElementById('loading-elapsed-time');
        const badgeEl = document.getElementById('loading-worker-badge');
        const clamped = Math.max(0, Math.min(100, Math.round(pct)));
        if (fillEl) fillEl.style.width = `${clamped}%`;
        if (pctEl) pctEl.textContent = `${clamped}%`;
        if (stepEl && stepTitle) stepEl.textContent = stepTitle;
        if (detailEl && stepDetail !== undefined) detailEl.textContent = stepDetail;
        if (elapsedEl) {
            const sec = ((performance.now() - this._bootStartTime) / 1000).toFixed(2);
            elapsedEl.textContent = `${sec}s`;
        }
        if (badgeEl && this.buildingWorkerPool) {
            badgeEl.textContent = this.buildingWorkerPool._canUseGlbFastPath()
                ? '📦 Pre-Baked .GLB Fast-Loader'
                : `⚡ ${this.buildingWorkerPool.maxWorkers} Parallel Workers`;
        }
    }

    _setWorkerPillStatus(workerId, state, statusText) {
        const pill = document.querySelector(
            `.worker-pill[data-worker-id="${workerId}"], .loading-worker-pill[data-worker-id="${workerId}"]`
        );
        if (!pill) return;
        pill.classList.remove('running', 'done');
        if (state) pill.classList.add(state);
        const stateEl = pill.querySelector('.wp-time, .worker-pill-state');
        if (stateEl && statusText) stateEl.textContent = statusText;
    }

    _hideLoadingModal() {
        const modal = document.getElementById('campus-loading-modal');
        if (!modal) return;
        modal.classList.add('loaded');
        setTimeout(() => {
            if (modal.parentNode) modal.style.display = 'none';
        }, 380);
    }

    _yieldFrame() {
        return new Promise((resolve) => {
            requestAnimationFrame(() => resolve());
        });
    }

    async _bootAsync() {
        const bootWatchdogTimer = setTimeout(() => {
            this._hideLoadingModal();
        }, 20000);

        try {
            this._updateLoadingModal(8, 'Initializing 3D Viewport & Sky...', 'Setting up WebGL renderer, camera & Wenatchee foothills backdrop');
            await this._yieldFrame();

            this._initScene();
            this._initSkyAndLights();
            this.floorCutawayFoundry = new FloorCutawayFoundry(
                this.scene,
                (x, z) => this.groundFoundry.getTerrainHeight(x, z)
            );

            this._updateLoadingModal(18, 'Generating USGS 3DEP Terrain...', 'Building 3D elevation mesh, streets, sidewalks & parking lots');
            await this._yieldFrame();

            await this._buildCampusWorldAsync();

            this._updateLoadingModal(88, 'Loading ADA Wayfinding & Photorealism...', 'Initializing 3D accessibility markers & Luma splat studio');
            await this._yieldFrame();

            this.lumaFoundry = new LumaRealismFoundry(
                this.scene,
                this.renderer,
                (x, z) => this.groundFoundry.getTerrainHeight(x, z)
            );
            this.lumaPanelOpen = false;
            this.adaFoundry = new AdaAccessibilityFoundry(
                this.scene,
                (x, z) => this.groundFoundry.getTerrainHeight(x, z),
                (feat) => this.focusAdaFeature(feat)
            );
            this.treePlanter = new TreePlanterFoundry(
                this.scene,
                (x, z) => this.groundFoundry.getTerrainHeight(x, z)
            );
            this.treePlanterActive = false;
            this.geeseFoundry = new MigratingGeeseFoundry(this.scene, {
                camera: this.camera,
                treePlanter: this.treePlanter,
                campusGroup: this.campusGroup,
                campusBuildings: CAMPUS_DATA.campusBuildings,
                getTerrainHeightFn: (x, z) => this.groundFoundry.getTerrainHeight(x, z),
                getBuildingRoadHeightFn: (id) => this.groundFoundry.getBuildingRoadHeight(id),
                onEagleSpawn: (flight) => this._handleBaldEagleSpawn(flight),
                onEagleSoarEnd: (flight) => this._handleBaldEagleSoarEnd(flight)
            });

            this._updateLoadingModal(94, 'Planting Campus Trees & Binding Controls...', 'Loading campus tree catalog & interactive UI panels');
            await this._yieldFrame();

            this.treePlanter.loadInitialTrees()
                .then(() => {
                    if (this._syncTreePlanterUI) this._syncTreePlanterUI();
                    if (this.geeseFoundry) this.geeseFoundry.refreshCampusPerches();
                    if (this.renderer) this.renderer.shadowMap.needsUpdate = true;
                })
                .catch((err) => {
                    console.warn('TreePlanter load warning:', err);
                });
            this._initUI();
            this._syncEnvironmentTheme();
            this.setGpuAcceleration(this.gpuAccelerated);
            this._bindEvents();
            const restoredSession = this.watchdog.restoreSavedSessionState();
            if (!restoredSession && this.initialKioskRequested && !this.isGlbBakeMode) {
                this.setKioskMode(true, { fromUserGesture: false, silent: true });
            }
            this._animate();

            this._updateLoadingModal(100, 'Campus Map Ready!', 'Welcome to the Chelan County 3D Campus');
            await this._yieldFrame();
            this._hideLoadingModal();

            setTimeout(() => {
                this.watchdog.calibrateBaseline();
                this._syncVramReadoutUI?.();
            }, 1200);

            if (this.isGlbBakeMode) {
                await this._runAutomatedGlbBakeIfRequested();
            }
        } catch (err) {
            console.error('Error during campus boot:', err);
            this._hideLoadingModal();
        } finally {
            clearTimeout(bootWatchdogTimer);
        }
    }

    announceToScreenReader(message) {
        const el = document.getElementById('sr-announcer');
        if (!el || !message) return;
        el.textContent = '';
        setTimeout(() => {
            el.textContent = message;
        }, 30);
    }

    _syncLabelRendererVisibility() {
        const labelsToggle = document.getElementById('toggle-labels');
        const showStandardLabels = Boolean(labelsToggle && labelsToggle.checked);
        const showAdaLabels = Boolean(this.adaFoundry && this.adaFoundry.active);
        this.labelObjects.forEach((obj) => {
            if (obj.element) {
                obj.element.style.display = showStandardLabels ? '' : 'none';
            }
        });
        if (this.labelRenderer && this.labelRenderer.domElement) {
            this.labelRenderer.domElement.style.display = (showStandardLabels || showAdaLabels) ? 'block' : 'none';
        }
    }

    _getOptimalPixelRatio(highQualityActive = false) {
        const rawDpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
        const vpW = Math.max(1, (typeof window !== 'undefined' && window.innerWidth) || 1920);
        // Native 4K UHD (3840x2160) WebGL framebuffer resolution for 65" 4K TV Kiosk & High-Quality mode
        const maxFbWidth = 3840;
        if (this.kioskMode) {
            const kioskDpr = Math.min(2.0, Math.max(rawDpr, maxFbWidth / vpW));
            if (vpW * kioskDpr > maxFbWidth) {
                return Math.max(1.0, maxFbWidth / vpW);
            }
            return kioskDpr;
        }
        const isHq = highQualityActive || this.gpuAccelerated || this.hdrPopEnabled;
        const maxDpr = isHq ? 2.0 : 1.5;
        const cappedDpr = Math.min(rawDpr, maxDpr);
        if (vpW * cappedDpr > maxFbWidth) {
            return Math.max(1.0, maxFbWidth / vpW);
        }
        return cappedDpr;
    }

    _initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#cce0f5');
        // Architectural silver fog starts along the 500-foot (152.40m) perimeter feather so the campus core remains 100% crisp while outer tiles dissolve into silver fog
        this.scene.fog = new THREE.Fog('#c4c9d2', 240, 1280);

        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.8,
            5500
        );
        // Default to the full campus overview (Reset View)
        this.camera.position.set(115, 95, 145);

        try {
            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                powerPreference: 'high-performance'
            });
        } catch (primaryErr) {
            console.warn('Primary WebGLRenderer fallback to safe defaults:', primaryErr);
            this.renderer = new THREE.WebGLRenderer({
                antialias: false,
                powerPreference: 'default'
            });
        }
        this.renderer.debug.checkShaderErrors = false;
        this.renderer.localClippingEnabled = true;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(this._getOptimalPixelRatio(this.gpuAccelerated || this.hdrPopEnabled));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.shadowMap.autoUpdate = false;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.08;
        this.container.appendChild(this.renderer.domElement);
        this.watchdog.bindRenderer(this.renderer);

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
        this.controls.target.set(8, 6, 18);
        this.controls.update();
    }

    _initSkyAndLights() {
        this.sky = new Sky();
        this.sky.scale.setScalar(8000);
        this.scene.add(this.sky);

        // 360° Wenatchee Foothills, Saddle Rock, Basalt Cliffs & Cascade Horizon Panorama + Dark Showcase Dome
        this.backdropFoundry = new WenatcheeBackdropFoundry(this.scene);
        this.backdropTheme = this.darkMapEnabled ? 'dark-showcase' : 'foothills-day'; // 'foothills-day' | 'golden-hour' | 'dark-showcase'

        this.hemiLight = new THREE.HemisphereLight('#ebf4ff', '#8a7f70', 0.88);
        this.hemiLight.position.set(0, 150, 0);
        this.scene.add(this.hemiLight);

        this.sunLight = new THREE.DirectionalLight('#fff5e0', 2.65);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.set(2048, 2048);
        this.sunLight.shadow.camera.near = 10;
        this.sunLight.shadow.camera.far = 520;
        const d = 160;
        this.sunLight.shadow.camera.left = -d;
        this.sunLight.shadow.camera.right = d;
        this.sunLight.shadow.camera.top = d;
        this.sunLight.shadow.camera.bottom = -d;
        this.sunLight.shadow.bias = -0.0004;
        this.sunLight.shadow.normalBias = 0.018;
        this.sunLight.shadow.radius = 1.35;
        this.scene.add(this.sunLight);

        // Opposing Columbia Valley Sky Fill Light so shaded building facades, curbs, and benches retain crisp 3D depth
        this.fillLight = new THREE.DirectionalLight('#bfd9ff', 0.58);
        this.fillLight.position.set(-140, 95, -120);
        this.fillLight.castShadow = false;
        this.scene.add(this.fillLight);

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

    _formatHourFloat(hourFloat) {
        const totalMins = ((Math.round(hourFloat * 60) % 1440) + 1440) % 1440;
        const hrs = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        const utcRef = new Date(Date.UTC(2026, 0, 1, hrs, mins, 0));
        return utcRef.toLocaleTimeString('en-US', {
            timeZone: 'UTC',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    _computeWenatcheeSolarState(date = new Date()) {
        // Chelan County Campus origin in Wenatchee, WA (America/Los_Angeles)
        const lat = 47.42215;
        const lon = -120.31565;
        const timeZone = 'America/Los_Angeles';

        const formattedTime = date.toLocaleTimeString('en-US', {
            timeZone,
            hour: 'numeric',
            minute: '2-digit'
        });

        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23'
        }).formatToParts(date);
        let localHr = 12;
        let localMin = 0;
        let localSec = 0;
        for (const p of parts) {
            if (p.type === 'hour') localHr = Number(p.value) || 0;
            else if (p.type === 'minute') localMin = Number(p.value) || 0;
            else if (p.type === 'second') localSec = Number(p.value) || 0;
        }
        const hourFloat = (localHr % 24) + localMin / 60 + localSec / 3600;

        // NOAA Astronomical Solar Position for Wenatchee, WA
        const jd = date.getTime() / 86400000 + 2440587.5;
        const jc = (jd - 2451545.0) / 36525.0;
        const l0 = (((280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360) + 360) % 360;
        const mDeg = 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
        const ecc = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);

        const mRad = THREE.MathUtils.degToRad(mDeg);
        const sunEqCenter =
            Math.sin(mRad) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) +
            Math.sin(2 * mRad) * (0.019993 - 0.000101 * jc) +
            Math.sin(3 * mRad) * 0.000289;
        const sunTrueLong = l0 + sunEqCenter;
        const omega = 125.04 - 1934.136 * jc;
        const omegaRad = THREE.MathUtils.degToRad(omega);
        const appLong = sunTrueLong - 0.00569 - 0.00478 * Math.sin(omegaRad);

        const obliq0 = 23 + (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60;
        const obliqCorr = obliq0 + 0.00256 * Math.cos(omegaRad);
        const obliqRad = THREE.MathUtils.degToRad(obliqCorr);
        const declRad = Math.asin(Math.sin(obliqRad) * Math.sin(THREE.MathUtils.degToRad(appLong)));

        const varY = Math.pow(Math.tan(obliqRad * 0.5), 2);
        const l0Rad = THREE.MathUtils.degToRad(l0);
        const eqTimeMins =
            4 *
            THREE.MathUtils.radToDeg(
                varY * Math.sin(2 * l0Rad) -
                    2 * ecc * Math.sin(mRad) +
                    4 * ecc * varY * Math.sin(mRad) * Math.cos(2 * l0Rad) -
                    0.5 * varY * varY * Math.sin(4 * l0Rad) -
                    1.25 * ecc * ecc * Math.sin(2 * mRad)
            );

        const utcMins = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
        const trueSolarMins = (((utcMins + eqTimeMins + 4 * lon) % 1440) + 1440) % 1440;
        const hourAngleDeg = trueSolarMins / 4 - 180;
        const haRad = THREE.MathUtils.degToRad(hourAngleDeg);
        const latRad = THREE.MathUtils.degToRad(lat);

        const cosZenith = THREE.MathUtils.clamp(
            Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(haRad),
            -1,
            1
        );
        const elevationDeg = 90 - THREE.MathUtils.radToDeg(Math.acos(cosZenith));

        const compassAzimuthRad =
            Math.atan2(
                Math.sin(haRad),
                Math.cos(haRad) * Math.sin(latRad) - Math.tan(declRad) * Math.cos(latRad)
            ) + Math.PI;
        const compassAzimuthDeg = ((THREE.MathUtils.radToDeg(compassAzimuthRad) % 360) + 360) % 360;
        // Scene axes: +X = East, +Z = South, -X = West, -Z = North
        const azimuthDeg = 180 - compassAzimuthDeg;

        return {
            hourFloat,
            formattedTime,
            elevationDeg,
            azimuthDeg,
            compassAzimuthDeg
        };
    }

    _applyRealTimeSunNow(date = new Date()) {
        const state = this._computeWenatcheeSolarState(date);
        this.currentSolarOverride = {
            elevationDeg: state.elevationDeg,
            azimuthDeg: state.azimuthDeg,
            compassAzimuthDeg: state.compassAzimuthDeg
        };
        const timeSlider = document.getElementById('time-slider');
        const timeDisplay = document.getElementById('time-display');
        const timeWrap = document.getElementById('time-control-wrap');
        if (timeSlider) {
            timeSlider.value = String(Number(state.hourFloat.toFixed(2)));
        }
        if (timeDisplay) {
            timeDisplay.textContent = state.formattedTime;
        }
        if (timeWrap) {
            const tip = `Live Wenatchee Sun (${state.formattedTime} PT • Alt ${state.elevationDeg.toFixed(1)}°)`;
            timeWrap.setAttribute('data-tooltip', tip);
            timeWrap.setAttribute('title', tip);
        }
        this.setTimeOfDay(state.hourFloat, this.currentSolarOverride);
        if (this.kioskMode) {
            this._syncKioskClockUI(date, state);
        }
        return state;
    }

    setRealTimeSunEnabled(enabled = true, { silent = false, skipRestore = false } = {}) {
        this.realTimeSunEnabled = Boolean(enabled);
        if (this._realTimeSunTimer) {
            clearInterval(this._realTimeSunTimer);
            this._realTimeSunTimer = null;
        }
        if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this._onRealTimeVisibilityChange);
        }

        const rtCheck = document.getElementById('toggle-realtime-sun');
        if (rtCheck) rtCheck.checked = this.realTimeSunEnabled;
        const rtTopBtn = document.getElementById('btn-realtime-sun-top');
        if (rtTopBtn) {
            rtTopBtn.classList.toggle('active', this.realTimeSunEnabled);
            rtTopBtn.setAttribute('aria-pressed', String(this.realTimeSunEnabled));
        }
        const timeWrap = document.getElementById('time-control-wrap');
        if (timeWrap) {
            timeWrap.classList.toggle('live-sun-active', this.realTimeSunEnabled);
        }

        if (this.realTimeSunEnabled) {
            const state = this._applyRealTimeSunNow();
            this._realTimeSunTimer = setInterval(() => {
                this._applyRealTimeSunNow();
            }, 30000);
            if (typeof document !== 'undefined') {
                document.addEventListener('visibilitychange', this._onRealTimeVisibilityChange);
            }
            if (!silent) {
                this.announceToScreenReader(
                    `Real-time Wenatchee sun lighting enabled at ${state.formattedTime}`
                );
            }
        } else {
            this.currentSolarOverride = null;
            if (timeWrap) {
                timeWrap.setAttribute('data-tooltip', 'Sun & Time of Day');
                timeWrap.setAttribute('title', 'Sun Position & Time of Day');
            }
            if (!skipRestore) {
                const snapped = Math.round((this.currentHour ?? 14.5) * 4) / 4;
                const timeSlider = document.getElementById('time-slider');
                const timeDisplay = document.getElementById('time-display');
                if (timeSlider) timeSlider.value = String(snapped);
                if (timeDisplay) timeDisplay.textContent = this._formatHourFloat(snapped);
                this.setTimeOfDay(snapped, null);
            }
            if (!silent) {
                this.announceToScreenReader('Real-time sun lighting disabled; manual time slider active');
            }
        }
    }

    setTimeOfDay(hourFloat, solarOverride = null) {
        this.currentHour = hourFloat;
        const activeSolar = solarOverride || (this.realTimeSunEnabled ? this.currentSolarOverride : null);
        let elevationDeg;
        let azimuthDeg;
        if (activeSolar && Number.isFinite(activeSolar.elevationDeg) && Number.isFinite(activeSolar.azimuthDeg)) {
            elevationDeg = activeSolar.elevationDeg;
            azimuthDeg = activeSolar.azimuthDeg;
        } else {
            const normalized = (hourFloat - 6) / 16;
            elevationDeg = Math.sin(normalized * Math.PI) * 58 - 6;
            azimuthDeg = -75 + normalized * 190;
        }

        const sunGlyph = elevationDeg < -4 ? '🌙' : elevationDeg < 12 ? '🌅' : '☀️';
        const timeBadge = document.getElementById('time-icon-badge');
        if (timeBadge) timeBadge.textContent = sunGlyph;
        const topIcon = document.querySelector('#btn-realtime-sun-top .realtime-top-icon');
        if (topIcon) topIcon.textContent = this.realTimeSunEnabled ? sunGlyph : '☀️';

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
        if (this.fillLight) {
            this.fillLight.position.set(-sunPos.x * 160, Math.max(65, sunPos.y * 120), -sunPos.z * 160);
        }
        this.renderer.shadowMap.needsUpdate = true;

        const nightFactor = THREE.MathUtils.clamp(1 - (elevationDeg + 4) / 22, 0, 1);
        const effectiveNight = nightFactor;

        if (this.hdrPopEnabled) {
            // Balanced high-contrast Key-to-Fill architectural lighting ratio for HDR Luma Pop
            this.sunLight.color.set(elevationDeg < 16 ? '#ffd296' : '#fff2dc');
            this.hemiLight.color.set('#b8d4fc');
            this.hemiLight.groundColor.set('#5c5346');
            this.sunLight.intensity = Math.max(0.18, (1 - nightFactor * 0.92) * 2.72);
            this.hemiLight.intensity = Math.max(0.18, (1 - nightFactor * 0.72) * 0.68);
            if (this.fillLight) {
                this.fillLight.color.set('#a8ccff');
                this.fillLight.intensity = Math.max(0.10, (1 - nightFactor * 0.80) * 0.46);
            }
        } else {
            this.sunLight.color.set(elevationDeg < 16 ? '#ffd8a6' : '#fff5e0');
            this.hemiLight.color.set('#ebf4ff');
            this.hemiLight.groundColor.set('#8a7f70');
            // When 4K + IBL is active, trim ambient hemisphere fill slightly to balance the added IBL irradiance
            const iblActive = this.gpuAccelerated;
            this.sunLight.intensity = Math.max(0.16, (1 - nightFactor * 0.90) * (iblActive ? 2.62 : 2.68));
            this.hemiLight.intensity = Math.max(0.22, (1 - nightFactor * 0.68) * (iblActive ? 0.76 : 0.88));
            if (this.fillLight) {
                this.fillLight.color.set(elevationDeg < 16 ? '#c7d2fe' : '#bfd9ff');
                this.fillLight.intensity = Math.max(0.12, (1 - nightFactor * 0.75) * (iblActive ? 0.50 : 0.58));
            }
        }

        const darkShowcaseActive = this.topoActive || (this.darkMapEnabled && this.mapDarkness >= 0.45);
        const highQualityActive = this.gpuAccelerated || this.hdrPopEnabled;
        const expOffset = highQualityActive ? -0.04 : 0.0;

        let activeFogHex = '#c4c9d2';
        if (darkShowcaseActive) {
            activeFogHex = '#0d1729';
            this.scene.background.set('#070d19');
            this.scene.fog.color.set(activeFogHex);
            if (this.sky) this.sky.visible = false;
            this.renderer.toneMappingExposure = 1.04 + expOffset;
        } else {
            if (this.sky) this.sky.visible = true;
            if (nightFactor > 0.5) {
                activeFogHex = '#111d33';
                this.scene.background.set('#0b1324');
                this.scene.fog.color.set(activeFogHex);
                this.renderer.toneMappingExposure = 0.90 + expOffset;
            } else if (elevationDeg < 15) {
                activeFogHex = '#c49b86';
                this.scene.background.set('#2b213a');
                this.scene.fog.color.set(activeFogHex);
                this.renderer.toneMappingExposure = 1.03 + expOffset;
            } else {
                activeFogHex = '#c4c9d2';
                this.scene.background.set('#2c5d9e');
                this.scene.fog.color.set(activeFogHex);
                this.renderer.toneMappingExposure = 1.06 + expOffset;
            }
        }

        if (this.backdropFoundry) {
            this.backdropFoundry.updateAtmosphere({
                elevationDeg,
                nightFactor: effectiveNight,
                darkShowcase: darkShowcaseActive,
                sunPos
            });
        }

        this.wallFoundry.updateFoundrySettings({ nightFactor: effectiveNight });
        this.groundFoundry.setNightLighting(effectiveNight);
        if (this.groundFoundry.setOuterTileFogColor) {
            this.groundFoundry.setOuterTileFogColor(activeFogHex);
        }
        if (this.groundFoundry.setOuterTileFogEnabled) {
            this.groundFoundry.setOuterTileFogEnabled(this.fogEnabled !== false);
        }
        if (this.scene.fog) {
            this.scene.fog.near = this.fogEnabled !== false ? 240 : 100000;
            this.scene.fog.far = this.fogEnabled !== false ? 1280 : 200000;
        }
        this._updateBuildingNightLights(effectiveNight);
    }

    setFogEnabled(enabled = true) {
        this.fogEnabled = Boolean(enabled);
        if (this.scene && this.scene.fog) {
            this.scene.fog.near = this.fogEnabled ? 240 : 100000;
            this.scene.fog.far = this.fogEnabled ? 1280 : 200000;
        }
        if (this.groundFoundry && this.groundFoundry.setOuterTileFogEnabled) {
            this.groundFoundry.setOuterTileFogEnabled(this.fogEnabled);
        }
        const fogCheck = document.getElementById('toggle-fog');
        if (fogCheck) fogCheck.checked = this.fogEnabled;
        const fogTopBtn = document.getElementById('btn-fog-toggle-top');
        if (fogTopBtn) {
            fogTopBtn.classList.toggle('active', this.fogEnabled);
            fogTopBtn.setAttribute('aria-pressed', String(this.fogEnabled));
            const lbl = fogTopBtn.querySelector('.bird-trigger-label');
            if (lbl) lbl.textContent = this.fogEnabled ? 'Fog' : 'No Fog';
        }
        this.announceToScreenReader(this.fogEnabled ? 'Outer perimeter fog enabled' : 'Outer perimeter fog hidden');
    }

    _updateBuildingNightLights(effectiveNight) {
        if (!this.campusGroup) return;
        const seenMats = new Set();

        this.campusGroup.traverse((obj) => {
            if (obj.isLight && obj.userData?.isEntranceNightLight) {
                const maxInt = obj.userData.maxIntensity ?? 2.2;
                obj.intensity = effectiveNight * maxInt;
                obj.visible = effectiveNight > 0.02;
                return;
            }
            if (!obj.isMesh || !obj.material) return;
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (const mat of mats) {
                if (!mat || seenMats.has(mat)) continue;
                seenMats.add(mat);

                if (mat.userData?.isNightLitGlass) {
                    if (mat.emissive && mat.userData.nightEmissiveHex) {
                        mat.emissive.set(mat.userData.nightEmissiveHex);
                    }
                    mat.emissiveIntensity = effectiveNight * (mat.userData.maxEmissive ?? 1.55);
                    continue;
                }

                if (mat.userData?.isNightLitLantern) {
                    if (mat.emissive && mat.userData.nightEmissiveHex) {
                        mat.emissive.set(mat.userData.nightEmissiveHex);
                    }
                    const baseE = mat.userData.baseEmissive ?? 0.35;
                    const maxE = mat.userData.maxEmissive ?? 2.6;
                    mat.emissiveIntensity = baseE + effectiveNight * (maxE - baseE);
                    continue;
                }

                // Auto-detect 3D window & glass door panes across all custom campus buildings (300, 316, 400, 411/412, 428)
                if (
                    mat.isMeshStandardMaterial &&
                    mat.roughness <= 0.36 &&
                    !mat.emissiveMap &&
                    mat.color &&
                    mat.color.b > mat.color.r * 1.08 &&
                    mat.color.b < 0.72
                ) {
                    mat.emissive.set('#ffd58a');
                    mat.emissiveIntensity = effectiveNight * 1.35;
                }
            }
        });
    }

    _syncEnvironmentTheme() {
        const activeDarkness = this.darkMapEnabled ? this.mapDarkness : 0.0;
        this.groundFoundry.setGroundTheme({
            darkness: activeDarkness,
            topoActive: this.topoActive,
            drawTerrainOnly: this.drawTerrainOnly,
            hdrPop: this.hdrPopEnabled
        });
        this.setTimeOfDay(this.currentHour || 14.0);

        const darkCheck = document.getElementById('toggle-dark-map');
        if (darkCheck) darkCheck.checked = this.darkMapEnabled;
        const drawTerrainCheck = document.getElementById('toggle-draw-terrain');
        if (drawTerrainCheck) drawTerrainCheck.checked = this.drawTerrainOnly;
        const darkSlider = document.getElementById('foundry-map-darken');
        const darkVal = document.getElementById('foundry-map-darken-val');
        const shownPct = Math.round(activeDarkness * 100);
        if (darkSlider) darkSlider.value = String(shownPct);
        if (darkVal) darkVal.textContent = `${shownPct}%`;
    }

    /**
     * Activates all 4 HDR Luma Pop enhancements simultaneously:
     * 1. Outdoor Sky/Sun PMREM Environment Map & selective glass/metal specular boost
     * 2. Half-float EffectComposer with selective UnrealBloomPass + AgX/ACES tone mapping
     * 3. High-contrast 6:1 key-to-fill solar lighting + 2048x2048 PCFSoftShadowMap architectural shadows
     * 4. Ground-plane & flat roof luminance anchoring so buildings pop without washout
     */
    setHdrPopMode(enabled) {
        this.hdrPopEnabled = Boolean(enabled);
        const pbrCheck = document.getElementById('toggle-luma-pbr');
        if (pbrCheck) pbrCheck.checked = this.hdrPopEnabled;

        const highQualityActive = this.gpuAccelerated || this.hdrPopEnabled;
        if (this.lumaFoundry) {
            this.lumaFoundry.bloomEnabled = false;
            this.lumaFoundry.setPbrRealism(
                highQualityActive,
                this.hdrPopEnabled ? this.hdrEnvIntensity : 0.55
            );
        }

        const targetPixelRatio = this._getOptimalPixelRatio(highQualityActive);
        this.renderer.setPixelRatio(targetPixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (this.lumaFoundry) {
            this.lumaFoundry.setSize(window.innerWidth, window.innerHeight, targetPixelRatio);
        }

        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        if (this.sunLight) {
            this.sunLight.castShadow = true;
            const mapDim = highQualityActive ? 4096 : 2048;
            this.sunLight.shadow.bias = highQualityActive ? -0.00025 : -0.0004;
            this.sunLight.shadow.normalBias = highQualityActive ? 0.012 : 0.018;
            this.sunLight.shadow.radius = highQualityActive ? 1.05 : 1.35;
            if (this.sunLight.shadow.mapSize.x !== mapDim) {
                this.sunLight.shadow.mapSize.set(mapDim, mapDim);
                if (this.sunLight.shadow.map) {
                    this.sunLight.shadow.map.dispose();
                    this.sunLight.shadow.map = null;
                }
            }
        }
        this.renderer.shadowMap.needsUpdate = true;

        this._syncEnvironmentTheme();
    }

    setGpuAcceleration(enabled) {
        this.gpuAccelerated = Boolean(enabled);
        const gpuToggle = document.getElementById('toggle-gpu');
        if (gpuToggle) gpuToggle.checked = this.gpuAccelerated;
        try {
            localStorage.setItem('chelan_gpu_accel_v2', String(this.gpuAccelerated));
        } catch (_) {}

        const highQualityActive = this.gpuAccelerated || this.hdrPopEnabled;
        const targetPixelRatio = this._getOptimalPixelRatio(highQualityActive);

        // 1. High-DPI Pixel Ratio & CSS Hardware Layer Compositing
        this.renderer.setPixelRatio(targetPixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (this.lumaFoundry) {
            this.lumaFoundry.bloomEnabled = false;
            this.lumaFoundry.setSize(window.innerWidth, window.innerHeight, targetPixelRatio);
            this.lumaFoundry.setPbrRealism(
                highQualityActive,
                this.hdrPopEnabled ? this.hdrEnvIntensity : 0.55
            );
        }
        const canvas = this.renderer.domElement;
        canvas.style.willChange = highQualityActive ? 'transform' : 'auto';
        canvas.style.transform = highQualityActive ? 'translateZ(0)' : 'none';

        // 2. Hardware Shadow Map (2048x2048 soft shadows in Default Mode; 4096x4096 ultra-crisp in High-Quality Mode)
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        if (this.sunLight) {
            this.sunLight.castShadow = true;
            const mapDim = highQualityActive ? 4096 : 2048;
            this.sunLight.shadow.bias = highQualityActive ? -0.00025 : -0.0004;
            this.sunLight.shadow.normalBias = highQualityActive ? 0.012 : 0.018;
            this.sunLight.shadow.radius = highQualityActive ? 1.05 : 1.35;
            if (this.sunLight.shadow.mapSize.x !== mapDim) {
                this.sunLight.shadow.mapSize.set(mapDim, mapDim);
                if (this.sunLight.shadow.map) {
                    this.sunLight.shadow.map.dispose();
                    this.sunLight.shadow.map = null;
                }
            }
        }
        if (this.sky) {
            this.sky.visible = !this.topoActive;
        }

        // 3. Hardware Anisotropic Texture Filtering & Material Shader Refresh
        const maxAniso = highQualityActive
            ? this.renderer.capabilities.getMaxAnisotropy()
            : Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
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

        this.setTimeOfDay(this.currentHour || 14.5);
        this.renderer.shadowMap.needsUpdate = true;
    }

    _buildCampusWorld() {
        if (this.floorCutawayFoundry) {
            this.floorCutawayFoundry.clear();
        }
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
        this.animatedFlags = [];
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
        const parcelToggle = document.getElementById('toggle-parcels');
        if (parcelToggle && this.groundFoundry.setParcelBoundariesVisible) {
            this.parcelsVisible = parcelToggle.checked;
            this.groundFoundry.setParcelBoundariesVisible(this.parcelsVisible);
        }
        this._syncEnvironmentTheme();

        this.renderer.shadowMap.needsUpdate = true;
    }

    async _buildCampusWorldAsync() {
        this.campusBuildingMeshes.clear();
        this.selectableMeshes = [];
        this.animatedFlags = [];
        this.labelObjects = [];
        this.streetLabelObjects = [];

        // 1. 3D USGS 3DEP Terrain, Foothills, Contours & Draped Streets/Parking
        this.groundGroup = this.groundFoundry.buildEnvironment(this.scene, CAMPUS_DATA);
        await this._yieldFrame();

        // 2. Core Chelan County Campus Buildings built concurrently across per-building Web Workers
        this.campusGroup = new THREE.Group();
        this.campusGroup.name = 'CampusBuildingsGroup';
        this.scene.add(this.campusGroup);

        const sortedBldgs = [...CAMPUS_DATA.campusBuildings].sort(
            (a, b) => (a.sortOrder || 99) - (b.sortOrder || 99)
        );

        const getBuildingTerrainY = (bldg) => {
            const splitRoadY = this.groundFoundry.getBuildingRoadHeight(bldg.id);
            return splitRoadY !== null
                ? splitRoadY
                : this.groundFoundry.getTerrainHeight(bldg.center[0], bldg.center[1]);
        };

        const isGlbFast = this.buildingWorkerPool._canUseGlbFastPath();
        this._updateLoadingModal(
            24,
            isGlbFast
                ? 'Loading Pre-Baked .GLB Campus Models...'
                : `Dispatching ${this.buildingWorkerPool.maxWorkers} Parallel Web Workers...`,
            isGlbFast
                ? `Streaming ${sortedBldgs.length} binary glTF 2.0 campus buildings + ${CAMPUS_DATA.contextBuildings.length} context blocks`
                : `Building ${sortedBldgs.length} campus structures + ${CAMPUS_DATA.contextBuildings.length} context blocks concurrently`
        );
        for (const b of sortedBldgs) {
            this._setWorkerPillStatus(b.id, 'running', isGlbFast ? '.glb' : 'building');
        }
        this._setWorkerPillStatus('context-batch', 'running', isGlbFast ? '.glb' : 'batching');
        await this._yieldFrame();

        // 2 & 3. Load all 8 campus buildings AND the Downtown Wenatchee context batch concurrently!
        const campusBuildingsPromise = this.buildingWorkerPool.buildAllBuildingsParallel(
            sortedBldgs,
            getBuildingTerrainY,
            async (bldg, bldgGroup, completedCount, totalCount) => {
                const splitRoadY = this.groundFoundry.getBuildingRoadHeight(bldg.id);
                this._attachCampusBuildingGroup(bldg, bldgGroup, splitRoadY);
                const stats = bldgGroup.userData?.workerStats;
                const isFromGlb = Boolean(bldgGroup.userData?.loadedFromGlb || stats?.source === 'glb');
                const msVal = stats?.workerBuildMs ?? stats?.workerTimeMs;
                const msText = msVal !== undefined
                    ? (isFromGlb ? `GLB ${msVal}ms` : `${msVal}ms`)
                    : (isFromGlb ? 'GLB' : 'done');
                this._setWorkerPillStatus(bldg.id, 'done', msText);

                const statSuffix = stats
                    ? ` [${isFromGlb ? '.GLB Binary' : `${stats.rawMeshCount} → ${stats.optimizedMeshCount} draw calls`} in ${msVal || 0}ms]`
                    : '';
                const pct = 26 + Math.round((completedCount / totalCount) * 58);
                this._updateLoadingModal(
                    pct,
                    `${isFromGlb ? 'Loaded .GLB' : 'Worker Completed'} Building ${bldg.code}...`,
                    `${bldg.name || bldg.shortName} (${completedCount} of ${totalCount})${statSuffix}`
                );
            }
        );

        const contextBuildingsPromise = this.buildingWorkerPool
            .buildContextBuildingsAsync(CAMPUS_DATA.contextBuildings)
            .then((ctxGroup) => {
                this.contextGroup = ctxGroup;
                const ctxStats = ctxGroup.userData?.workerStats;
                const isFromGlb = Boolean(ctxGroup.userData?.loadedFromGlb || ctxStats?.source === 'glb');
                const msVal = ctxStats?.workerBuildMs ?? ctxStats?.workerTimeMs;
                this._setWorkerPillStatus(
                    'context-batch',
                    'done',
                    msVal !== undefined ? (isFromGlb ? `GLB ${msVal}ms` : `${msVal}ms`) : 'done'
                );
                const ctxToggle = document.getElementById('toggle-context');
                this.contextGroup.visible = ctxToggle ? ctxToggle.checked : false;
                this.scene.add(this.contextGroup);
            })
            .catch(() => {
                // Fallback to synchronous context build if worker fails
                this.contextGroup = this.wallFoundry.buildContextBuildingsBatch(
                    CAMPUS_DATA.contextBuildings,
                    (x, z) => this.groundFoundry.getTerrainHeight(x, z)
                );
                this._setWorkerPillStatus('context-batch', 'done', 'done');
                const ctxToggle = document.getElementById('toggle-context');
                this.contextGroup.visible = ctxToggle ? ctxToggle.checked : false;
                this.scene.add(this.contextGroup);
            });

        await Promise.all([campusBuildingsPromise, contextBuildingsPromise]);

        // 4. Street Name Floating Markers on 3D Terrain
        this._createStreetLabels();

        const contourToggle = document.getElementById('toggle-contours');
        if (contourToggle && this.groundFoundry.contourLinesMesh) {
            this.topoActive = contourToggle.checked;
            this.groundFoundry.contourLinesMesh.visible = contourToggle.checked;
        }
        const parcelToggle = document.getElementById('toggle-parcels');
        if (parcelToggle && this.groundFoundry.setParcelBoundariesVisible) {
            this.parcelsVisible = parcelToggle.checked;
            this.groundFoundry.setParcelBoundariesVisible(this.parcelsVisible);
        }
        this._syncEnvironmentTheme();

        this.renderer.shadowMap.needsUpdate = true;
    }

    _attachCampusBuildingGroup(bldg, bldgGroup, splitRoadY) {
        if (this.campusBuildingMeshes.has(bldg.id)) {
            const old = this.campusBuildingMeshes.get(bldg.id);
            this.campusGroup.remove(old.group);
            if (old.label) old.group.remove(old.label);
            this.selectableMeshes = this.selectableMeshes.filter((m) => m.userData.building?.id !== bldg.id);
            this.animatedFlags = this.animatedFlags.filter((f) => f.buildingId !== bldg.id);
        }

        // Upgrade all grass lawns on this building group with the Luma-grade photorealistic grass blade texture & bump map
        upgradeObjectGrassWithLumaTexture(bldgGroup, this.textureLoader);

        bldgGroup.traverse((child) => {
            if (child.isMesh && child.userData.isSelectableBuilding) {
                child.userData.building = bldg;
                this.selectableMeshes.push(child);
            }
            if (child.isMesh && child.userData.isAnimatedFlag) {
                const geo = child.geometry;
                const pos = geo?.attributes?.position;
                const uv = geo?.attributes?.uv;
                if (pos) {
                    const count = pos.count;
                    const baseY = new Float32Array(count);
                    const flagH = child.userData.flagHeight || 1.0;
                    for (let i = 0; i < count; i++) {
                        baseY[i] = uv ? (uv.getY(i) - 0.5) * flagH : pos.getY(i);
                    }
                    this.animatedFlags.push({
                        buildingId: bldg.id,
                        mesh: child,
                        baseY
                    });
                }
            }
        });

        const shortTitle = this._getConciseBuildingTitle(bldg);
        const labelEl = document.createElement('div');
        labelEl.className = `campus-3d-label ${this.selectedBuilding?.id === bldg.id ? 'selected' : ''}`;
        labelEl.setAttribute('role', 'button');
        labelEl.setAttribute('tabindex', '0');
        labelEl.setAttribute('aria-label', `${bldg.code} ${bldg.name}`);
        labelEl.innerHTML = `
            <span class="label-code">${bldg.code}</span>
            <span class="label-title"><span class="sr-only">${bldg.name}</span><span aria-hidden="true">${shortTitle}</span></span>
        `;
        labelEl.style.pointerEvents = 'auto';
        const labelsToggle = document.getElementById('toggle-labels');
        labelEl.style.display = (labelsToggle && labelsToggle.checked) ? '' : 'none';
        labelEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectBuilding(bldg.id, true);
        });
        labelEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                this.selectBuilding(bldg.id, true);
            }
        });

        const labelObj = new CSS2DObject(labelEl);
        const topAboveDatum = bldg.id === 'building-300' || bldg.code === '300'
            ? 8.2
            : (bldg.id === 'building-428' || bldg.code === '428'
                ? 5.2
                : (splitRoadY !== null
                    ? ((bldg.floors || 3) - 1) * 4.2
                    : (bldg.height || 14)));
        labelObj.position.set(0, topAboveDatum + 5.0, 0);
        bldgGroup.add(labelObj);
        this.labelObjects.push(labelObj);

        this.campusGroup.add(bldgGroup);
        this.campusBuildingMeshes.set(bldg.id, { group: bldgGroup, label: labelObj, data: bldg });
        this.renderer.shadowMap.needsUpdate = true;
    }

    async _spawnCampusBuildingAsync(bldg) {
        const splitRoadY = this.groundFoundry.getBuildingRoadHeight(bldg.id);
        const ty = splitRoadY !== null
            ? splitRoadY
            : this.groundFoundry.getTerrainHeight(bldg.center[0], bldg.center[1]);
        const bldgGroup = await this.buildingWorkerPool.buildBuildingAsync(bldg, ty, true);
        this._attachCampusBuildingGroup(bldg, bldgGroup, splitRoadY);
    }

    _spawnCampusBuilding(bldg) {
        const splitRoadY = this.groundFoundry.getBuildingRoadHeight(bldg.id);
        const ty = splitRoadY !== null
            ? splitRoadY
            : this.groundFoundry.getTerrainHeight(bldg.center[0], bldg.center[1]);
        const bldgGroup = this.wallFoundry.buildCampusBuildingMesh(
            bldg,
            ty,
            (x, z) => this.groundFoundry.getTerrainHeight(x, z)
        );
        this._attachCampusBuildingGroup(bldg, bldgGroup, splitRoadY);
    }

    async exportBuildingToGlb(buildingId = null, triggerDownload = true) {
        const targetId = buildingId || this.selectedBuilding?.id || 'courthouse-350';
        if (targetId === 'context-buildings' && this.contextGroup) {
            const glbBuf = await exportBuildingGroupToGlbBuffer(this.contextGroup, null);
            if (triggerDownload) {
                downloadGlbBuffer(glbBuf, 'context-buildings.glb');
            }
            return glbBuf;
        }

        const entry = this.campusBuildingMeshes.get(targetId);
        if (!entry || !entry.group) {
            return null;
        }
        const glbBuf = await exportBuildingGroupToGlbBuffer(entry.group, entry.data);
        if (triggerDownload) {
            downloadGlbBuffer(glbBuf, `${targetId}.glb`);
            this.announceToScreenReader(`Exported ${entry.data?.shortName || targetId} as ${targetId}.glb`);
        }
        return glbBuf;
    }

    async exportAllBuildingsToGlb({ triggerDownload = true, postToServer = false, onlyIds = null } = {}) {
        const filterSet =
            Array.isArray(onlyIds) && onlyIds.length > 0
                ? new Set(onlyIds.map((s) => String(s).trim()).filter(Boolean))
                : null;
        const results = {};
        for (const [bldgId, entry] of this.campusBuildingMeshes.entries()) {
            if (filterSet && !filterSet.has(bldgId)) continue;
            const buf = await exportBuildingGroupToGlbBuffer(entry.group, entry.data);
            results[bldgId] = buf;
            if (postToServer) {
                await fetch(`/__bake_glb__?name=${encodeURIComponent(bldgId)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    body: buf
                });
            } else if (triggerDownload) {
                downloadGlbBuffer(buf, `${bldgId}.glb`);
                await new Promise((r) => setTimeout(r, 180));
            }
        }
        if (this.contextGroup && (!filterSet || filterSet.has('context-buildings'))) {
            const ctxBuf = await exportBuildingGroupToGlbBuffer(this.contextGroup, null);
            results['context-buildings'] = ctxBuf;
            if (postToServer) {
                await fetch('/__bake_glb__?name=context-buildings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    body: ctxBuf
                });
            } else if (triggerDownload) {
                downloadGlbBuffer(ctxBuf, 'context-buildings.glb');
            }
        }
        return results;
    }

    async _runAutomatedGlbBakeIfRequested() {
        try {
            const onlyParam = new URLSearchParams(window.location.search).get('only') || '';
            const onlyIds = onlyParam
                ? onlyParam.split(',').map((s) => s.trim()).filter(Boolean)
                : null;
            await this.exportAllBuildingsToGlb({ triggerDownload: false, postToServer: true, onlyIds });
            await fetch('/__bake_done__', { method: 'POST' });
        } catch (err) {
            console.error('Automated GLB bake error:', err);
        }
    }

    _getConciseBuildingTitle(bldg) {
        if (!bldg) return '';
        const byId = {
            'courthouse-350': 'Courthouse',
            'building-316': 'DCD & Public Works',
            'building-400': 'Administration',
            'building-300': 'Juvenile Justice',
            'building-411-412': 'RJC & Nat. Resources',
            'regional-jail-east': 'Law & Justice',
            'regional-jail-west': 'RJC West Wing',
            'building-428': 'Campus Annex'
        };
        if (byId[bldg.id]) return byId[bldg.id];
        return (bldg.shortName || bldg.name || bldg.code || '')
            .replace(/^Chelan County\s+/i, '')
            .replace(/\s*\([^)]*\)\s*/g, '')
            .trim();
    }

    _getConciseDepartmentName(dept) {
        if (!dept) return '';
        const byZone = {
            'assessor-f2-orondo': 'Assessor',
            'treasurer-f2-park-vestibule': 'Treasurer',
            'auditor-f2-quarter': 'Auditor • Licensing',
            'auditor-elections-f3-orondo': 'Auditor • Elections',
            'prosecutor-child-support-f3-vestibule': 'Prosecutor',
            'courtroom-2-f4-orondo': 'Courtroom 2',
            'district-court-judges-f4-middle': 'District Court',
            'courtroom-1-f4-vestibule': 'Courtroom 1',
            'county-clerk-f5-full': 'Clerk',
            'sheriff-401-f1': 'Sheriff',
            'rjc-401-f1': 'RJC',
            'prosecutor-401-f5': 'Prosecutor',
            'law-library-401-f5': 'Law Library',
            'superior-courtroom-1-401-f5': 'Courtroom 1',
            'superior-courtroom-2-401-f5': 'Courtroom 2',
            'superior-hearing-room-401-f5': 'Hearing Room',
            'jury-checkin-401-f5': 'Jury Check-in',
            'rjc-401-f2': 'RJC',
            'rjc-401-f3': 'RJC',
            'rjc-401-f4': 'RJC',
            'superior-court-401-f5': 'Superior Court',
            'rjc-west-f1': 'RJC',
            'rjc-west-f2': 'RJC',
            'rjc-411-front': 'RJC',
            'natres-411-rear': 'Natural Resources',
            'econ-400-f1': 'Economic Services',
            'public-records-400-f1': 'Public Records',
            'fire-prev-400-f1': 'Fire Prevention',
            'commissioners-400-f2': 'Commissioners',
            'chambers-400-f2': 'Chambers',
            'hr-400-f3': 'Human Resources'
        };
        if (dept.zoneId && byZone[dept.zoneId]) return byZone[dept.zoneId];

        const raw = String(dept.name || '');
        if (/Basement Operations/i.test(raw)) return 'Operations';
        if (/Economic Services/i.test(raw)) return 'Economic Services';
        if (/Public Records/i.test(raw)) return 'Public Records';
        if (/Fire Prevention/i.test(raw)) return 'Fire Prevention';
        if (/Commissioners Chambers/i.test(raw)) return 'Chambers';
        if (/Community Development/i.test(raw)) return 'Community Dev';
        if (/Public Works/i.test(raw)) return 'Public Works';
        if (/Facilities Maintenance/i.test(raw)) return 'Facilities';
        if (/Board of County Commissioners/i.test(raw)) return 'Commissioners';
        if (/Human Resources/i.test(raw)) return 'Human Resources';
        if (/Information Technology/i.test(raw)) return 'IT & GIS';
        if (/Juvenile Justice Center/i.test(raw)) return 'Juvenile Justice';
        if (/Juvenile Probation/i.test(raw)) return 'Juvenile Probation';
        if (/Campus Annex/i.test(raw)) return 'Campus Annex';

        return raw
            .replace(/^Chelan County\s+/i, '')
            .replace(/^County\s+/i, '')
            .replace(/\s+Department.*$/i, '')
            .replace(/\s*\([^)]*\)\s*/g, '')
            .trim();
    }

    _createStreetLabels() {
        const streetMarkers = [
            { name: 'Orondo Ave', x: 96, z: 48 },
            { name: 'Washington St', x: -32, z: -22 },
            { name: 'Douglas St', x: -24, z: 38 },
            { name: 'S. Chelan Ave', x: 185, z: -85 }
        ];
        const labelsToggle = document.getElementById('toggle-labels');
        streetMarkers.forEach((st) => {
            const el = document.createElement('div');
            el.className = 'street-3d-label';
            el.textContent = st.name;
            el.style.display = (labelsToggle && labelsToggle.checked) ? '' : 'none';
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
        const toolsTrigger = document.getElementById('btn-open-tools');
        const toolsPanel = document.getElementById('map-tools-panel');
        const setToolsPanelOpen = (open, restoreFocus = false) => {
            if (!toolsTrigger || !toolsPanel) return;
            toolsPanel.classList.toggle('hidden', !open);
            toolsTrigger.setAttribute('aria-expanded', String(open));
            toolsTrigger.setAttribute('aria-label', open ? 'Close campus tools' : 'Open campus tools');
            if (restoreFocus) toolsTrigger.focus();
        };

        const sidebarDir = document.getElementById('sidebar-directory');
        const toggleDirBtn = document.getElementById('btn-toggle-directory');
        const syncDirectoryCollapseUI = () => {
            if (!sidebarDir || !toggleDirBtn) return;
            const isCollapsed = sidebarDir.classList.contains('collapsed');
            toggleDirBtn.textContent = isCollapsed ? '▾' : '▴';
            toggleDirBtn.setAttribute('aria-expanded', String(!isCollapsed));
            toggleDirBtn.setAttribute('title', isCollapsed ? 'Expand Campus Directory' : 'Minimize Campus Directory');
        };
        if (toggleDirBtn && sidebarDir) {
            syncDirectoryCollapseUI();
            toggleDirBtn.addEventListener('click', () => {
                sidebarDir.classList.toggle('collapsed');
                syncDirectoryCollapseUI();
            });
        }

        const searchInput = document.getElementById('campus-search');
        searchInput.addEventListener('input', (e) => {
            const q = e.target.value.trim();
            if (q && sidebarDir && sidebarDir.classList.contains('collapsed')) {
                sidebarDir.classList.remove('collapsed');
                syncDirectoryCollapseUI();
            }
            this._renderBuildingDirectory(q);
        });

        const skipLink = document.getElementById('skip-to-directory');
        if (skipLink) {
            skipLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (document.body.classList.contains('options-hidden')) {
                    document.body.classList.remove('options-hidden');
                    setToolsPanelOpen(false);
                }
                searchInput.focus();
            });
        }

        document.getElementById('btn-reset-cam').addEventListener('click', () => {
            if (this.followBirdViewActive) this.setMigratoryBirdView(false, false, false);
            this.flyToPosition(new THREE.Vector3(115, 95, 145), new THREE.Vector3(8, 6, 18));
            this.announceToScreenReader('Camera reset to campus overview');
        });
        document.getElementById('btn-top-cam').addEventListener('click', () => {
            if (this.followBirdViewActive) this.setMigratoryBirdView(false, false, false);
            this.flyToPosition(new THREE.Vector3(8, 255, 22), new THREE.Vector3(8, 0, 18));
            this.announceToScreenReader('Top-down aerial camera view');
        });

        const kioskTopBtn = document.getElementById('btn-kiosk-top');
        const birdTopBtn = document.getElementById('btn-bird-view-top');
        const spawnEagleTopBtn = document.getElementById('btn-spawn-eagle-top');
        const birdCamBtn = document.getElementById('btn-bird-cam');
        const birdEagleBtn = document.getElementById('btn-bird-eagle');
        const birdNextBtn = document.getElementById('btn-bird-next');
        const birdExitBtn = document.getElementById('btn-bird-exit');

        if (kioskTopBtn) {
            kioskTopBtn.addEventListener('click', () => {
                this.setKioskMode(!this.kioskMode, { fromUserGesture: true });
            });
        }

        if (birdTopBtn) {
            birdTopBtn.addEventListener('click', () => {
                this.setMigratoryBirdView(!this.followBirdViewActive);
            });
        }
        if (spawnEagleTopBtn) {
            spawnEagleTopBtn.addEventListener('click', () => {
                if (this.geeseFoundry) {
                    this.geeseFoundry.spawnBaldEagleSoar();
                }
            });
        }
        if (birdCamBtn) {
            birdCamBtn.addEventListener('click', () => {
                this.setMigratoryBirdView(!this.followBirdViewActive);
            });
        }
        if (birdEagleBtn) {
            birdEagleBtn.addEventListener('click', () => {
                if (this.geeseFoundry) {
                    this.geeseFoundry.spawnBaldEagleSoar();
                }
            });
        }
        if (birdNextBtn) {
            birdNextBtn.addEventListener('click', () => {
                this.setMigratoryBirdView(true, true);
            });
        }
        if (birdExitBtn) {
            birdExitBtn.addEventListener('click', () => {
                this.setMigratoryBirdView(false);
            });
        }

        const vramReadoutEl = document.getElementById('vram-watchdog-readout');
        const vramLimitSelect = document.getElementById('vram-limit-select');
        this._syncVramReadoutUI = () => {
            if (!vramReadoutEl || !this.watchdog) return;
            const snap = this.watchdog.lastTelemetry || this.watchdog.estimateGpuVramMB();
            if (!snap) return;
            vramReadoutEl.textContent = `♻️ VRAM: ${Math.round(snap.totalEstimatedVramMB)} / ${snap.vramLimitMB} MB`;
        };
        if (vramLimitSelect && this.watchdog) {
            vramLimitSelect.addEventListener('change', (e) => {
                const chosenMB = Number(e.target.value) || 512;
                try { localStorage.setItem('chelan_vram_limit_mb', String(chosenMB)); } catch (_) {}
                this.watchdog.setVramLimitMB(chosenMB);
                this._syncVramReadoutUI();
            });
            try {
                const savedLimit = Number(localStorage.getItem('chelan_vram_limit_mb'));
                if (savedLimit >= 256 && savedLimit <= 2048) {
                    vramLimitSelect.value = String(savedLimit);
                    this.watchdog.setVramLimitMB(savedLimit);
                }
            } catch (_) {}
        }
        this._syncVramReadoutUI();

        document.getElementById('toggle-context').addEventListener('change', (e) => {
            this.contextGroup.visible = e.target.checked;
        });
        document.getElementById('toggle-labels').addEventListener('change', () => {
            this._syncLabelRendererVisibility();
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
                if (this.darkMapEnabled && this.mapDarkness < 0.45) {
                    this.mapDarkness = 0.76;
                }
                this._syncEnvironmentTheme();
            });
        }

        const drawTerrainCheck = document.getElementById('toggle-draw-terrain');
        if (drawTerrainCheck) {
            drawTerrainCheck.addEventListener('change', (e) => {
                this.drawTerrainOnly = e.target.checked;
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
                this.announceToScreenReader(
                    this.topoActive
                        ? 'High-precision 0.5m and 2.5m topographic contours enabled'
                        : 'Topographic contours hidden'
                );
            });
        }

        const parcelCheck = document.getElementById('toggle-parcels');
        if (parcelCheck) {
            parcelCheck.checked = this.parcelsVisible;
            parcelCheck.addEventListener('change', (e) => {
                this.parcelsVisible = e.target.checked;
                if (this.groundFoundry.setParcelBoundariesVisible) {
                    this.groundFoundry.setParcelBoundariesVisible(this.parcelsVisible);
                }
                this.announceToScreenReader(
                    this.parcelsVisible
                        ? 'Campus parcel and right-of-way survey boundaries enabled'
                        : 'Parcel boundaries hidden'
                );
            });
        }

        const gpuToggle = document.getElementById('toggle-gpu');
        if (gpuToggle) {
            gpuToggle.checked = this.gpuAccelerated;
            gpuToggle.addEventListener('change', (e) => {
                this.setGpuAcceleration(e.target.checked);
            });
        }

        const fogToggle = document.getElementById('toggle-fog');
        if (fogToggle) {
            fogToggle.checked = this.fogEnabled;
            fogToggle.addEventListener('change', (e) => {
                this.setFogEnabled(e.target.checked);
            });
        }
        const fogTopBtn = document.getElementById('btn-fog-toggle-top');
        if (fogTopBtn) {
            fogTopBtn.addEventListener('click', () => {
                this.setFogEnabled(!this.fogEnabled);
            });
        }

        const timeSlider = document.getElementById('time-slider');
        const timeDisplay = document.getElementById('time-display');
        const rtSunCheck = document.getElementById('toggle-realtime-sun');
        const rtSunTopBtn = document.getElementById('btn-realtime-sun-top');
        if (rtSunCheck) {
            rtSunCheck.checked = this.realTimeSunEnabled;
            rtSunCheck.addEventListener('change', (e) => {
                this.setRealTimeSunEnabled(e.target.checked);
            });
        }
        if (rtSunTopBtn) {
            rtSunTopBtn.addEventListener('click', () => {
                this.setRealTimeSunEnabled(!this.realTimeSunEnabled);
            });
        }
        timeSlider.addEventListener('input', (e) => {
            if (this.realTimeSunEnabled) {
                this.setRealTimeSunEnabled(false, { silent: true, skipRestore: true });
            }
            const val = parseFloat(e.target.value);
            timeDisplay.textContent = this._formatHourFloat(val);
            this.setTimeOfDay(val);
        });

        const foundryToggleBtn = document.getElementById('btn-toggle-foundry');
        const foundryDrawer = document.getElementById('foundry-drawer');
        if (foundryToggleBtn && foundryDrawer) {
            foundryToggleBtn.addEventListener('click', () => {
                const isCollapsed = foundryDrawer.classList.toggle('collapsed');
                foundryToggleBtn.textContent = isCollapsed ? '▾' : '▴';
                foundryToggleBtn.setAttribute('aria-expanded', String(!isCollapsed));
            });
        }

        const wallStyleSelect = document.getElementById('foundry-wall-style');
        const wallColorInput = document.getElementById('foundry-wall-color');
        const trimColorInput = document.getElementById('foundry-trim-color');

        const applyWallCustomization = () => {
            if (!this.selectedBuilding) return;
            const prevFloor = this.activeFloorFilter;
            const prevZone = this.activeDepartmentZone;
            if (this.floorCutawayFoundry) this.floorCutawayFoundry.clear();
            this.selectedBuilding.wallStyle = wallStyleSelect.value;
            this.selectedBuilding.color = wallColorInput.value;
            this.selectedBuilding.trimColor = trimColorInput.value;
            this._spawnCampusBuilding(this.selectedBuilding);
            if (prevFloor !== null) {
                this.setBuildingFloorFilter(prevFloor, false, prevZone);
            }
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

        const exportSelGlbBtn = document.getElementById('btn-export-selected-glb');
        if (exportSelGlbBtn) {
            exportSelGlbBtn.addEventListener('click', () => {
                const id = this.selectedBuilding?.id || 'courthouse-350';
                this.exportBuildingToGlb(id, true);
            });
        }

        const exportAllGlbBtn = document.getElementById('btn-export-all-glb');
        if (exportAllGlbBtn) {
            exportAllGlbBtn.addEventListener('click', () => {
                this.exportAllBuildingsToGlb({ triggerDownload: true, postToServer: false });
            });
        }

        const cutawayBtn = document.getElementById('btn-floor-cutaway');
        if (cutawayBtn) {
            cutawayBtn.classList.toggle('active', this.floorCutawayEnabled);
            cutawayBtn.setAttribute('aria-pressed', String(this.floorCutawayEnabled));
            cutawayBtn.addEventListener('click', () => {
                this.floorCutawayEnabled = !this.floorCutawayEnabled;
                cutawayBtn.classList.toggle('active', this.floorCutawayEnabled);
                cutawayBtn.setAttribute('aria-pressed', String(this.floorCutawayEnabled));
                if (this.selectedBuilding && this.activeFloorFilter !== null) {
                    this.setBuildingFloorFilter(this.activeFloorFilter, false, this.activeDepartmentZone);
                }
                this.announceToScreenReader(
                    this.floorCutawayEnabled
                        ? '3D floor section cutaway enabled'
                        : '3D floor section cutaway disabled: showing exterior floor highlight only'
                );
            });
        }

        document.getElementById('close-detail-btn').addEventListener('click', () => {
            this.clearSelection();
        });

        this.clearSelection();
        const optBtn = document.getElementById('btn-toggle-options');
        const closeToolsBtn = document.getElementById('btn-close-tools');
        const backdropBtn = document.getElementById('btn-backdrop-theme');
        if (toolsTrigger && toolsPanel) {
            toolsTrigger.addEventListener('click', () => {
                if (document.body.classList.contains('options-hidden')) {
                    document.body.classList.remove('options-hidden');
                }
                setToolsPanelOpen(toolsPanel.classList.contains('hidden'));
            });
            document.addEventListener('pointerdown', (event) => {
                if (
                    !toolsPanel.classList.contains('hidden') &&
                    !toolsPanel.contains(event.target) &&
                    !toolsTrigger.contains(event.target)
                ) {
                    setToolsPanelOpen(false);
                }
            });
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && !toolsPanel.classList.contains('hidden')) {
                    setToolsPanelOpen(false, true);
                }
            });
        }
        if (closeToolsBtn) {
            closeToolsBtn.addEventListener('click', () => setToolsPanelOpen(false, true));
        }
        ['btn-luma-tool', 'btn-ada-tool', 'btn-tree-planter-tool'].forEach((id) => {
            const toolButton = document.getElementById(id);
            if (toolButton) {
                toolButton.addEventListener('click', () => setToolsPanelOpen(false));
            }
        });
        if (backdropBtn) {
            const themes = [
                {
                    id: 'foothills-day',
                    icon: '🏔️',
                    label: 'Backdrop: Wenatchee Foothills & Saddle Rock (Day) • Click for Golden Hour Sunset',
                    hour: 14.0,
                    darkMap: false
                },
                {
                    id: 'golden-hour',
                    icon: '🌅',
                    label: 'Backdrop: Golden Hour Sunset over Saddle Rock (5:45 PM) • Click for Dark Showcase',
                    hour: 19.75,
                    darkMap: false
                },
                {
                    id: 'dark-showcase',
                    icon: '🌌',
                    label: 'Backdrop: Dark Digital-Twin Showcase & Starfield • Click for Wenatchee Foothills Day',
                    hour: 14.0,
                    darkMap: true
                }
            ];
            let themeIdx = this.darkMapEnabled ? 2 : 0;
            if (this.darkMapEnabled) {
                const initTheme = themes[themeIdx];
                const backdropIcon = backdropBtn.querySelector('[aria-hidden="true"]');
                if (backdropIcon) backdropIcon.textContent = initTheme.icon;
                backdropBtn.setAttribute('data-tooltip', initTheme.label);
                backdropBtn.setAttribute('title', initTheme.label);
                backdropBtn.classList.add('active');
            }
            backdropBtn.addEventListener('click', () => {
                if (this.realTimeSunEnabled) {
                    this.setRealTimeSunEnabled(false, { silent: true, skipRestore: true });
                }
                themeIdx = (themeIdx + 1) % themes.length;
                const t = themes[themeIdx];
                this.backdropTheme = t.id;
                const backdropIcon = backdropBtn.querySelector('[aria-hidden="true"]');
                if (backdropIcon) backdropIcon.textContent = t.icon;
                backdropBtn.setAttribute('data-tooltip', t.label);
                backdropBtn.setAttribute('title', t.label);
                backdropBtn.classList.toggle('active', t.id !== 'foothills-day');

                this.darkMapEnabled = t.darkMap;
                this.currentHour = t.hour;
                const timeSlider = document.getElementById('time-slider');
                const timeDisplay = document.getElementById('time-display');
                if (timeSlider) timeSlider.value = String(t.hour);
                if (timeDisplay) {
                    timeDisplay.textContent = t.id === 'golden-hour' ? '5:45 PM' : '2:00 PM';
                }
                this._syncEnvironmentTheme();
                this.announceToScreenReader(t.label);
            });
        }
        if (optBtn) {
            optBtn.addEventListener('click', () => {
                document.body.classList.add('options-hidden');
                setToolsPanelOpen(false);
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

        // 12-Species Interactive Tree Planter UI & JSON Save/Reload
        const treePlanterBtn = document.getElementById('btn-tree-planter-tool');
        const treePanel = document.getElementById('tree-planter-panel');
        const closeTreeBtn = document.getElementById('btn-close-tree-planter');
        const speciesGrid = document.getElementById('tree-species-grid');
        const treeScaleSlider = document.getElementById('tree-scale-slider');
        const treeScaleVal = document.getElementById('tree-scale-val');
        const treeCountBadge = document.getElementById('tree-count-badge');
        const treeReadout = document.getElementById('tree-planter-readout');
        const treeSaveBtn = document.getElementById('btn-tree-save-json');
        const treeLoadBtn = document.getElementById('btn-tree-load-json');
        const treeUndoBtn = document.getElementById('btn-tree-undo');
        const treeClearBtn = document.getElementById('btn-tree-clear');
        const treeFileInput = document.getElementById('tree-json-file-input');

        const syncTreePlanterUI = () => {
            if (treePlanterBtn) treePlanterBtn.classList.toggle('active', this.treePlanterActive);
            if (treePanel) treePanel.classList.toggle('hidden', !this.treePlanterActive);
            if (treeCountBadge && this.treePlanter) {
                treeCountBadge.textContent = String(this.treePlanter.plantedTrees.length);
            }
            if (speciesGrid && this.treePlanter) {
                speciesGrid.querySelectorAll('.tree-species-btn').forEach((btn) => {
                    btn.classList.toggle('active', btn.dataset.type === this.treePlanter.selectedType);
                });
            }
            if (!this.treePlanterActive && this.treePlanter) {
                this.treePlanter.updatePreviewPosition(0, 0, false);
            }
        };
        this._syncTreePlanterUI = syncTreePlanterUI;

        if (speciesGrid && this.treePlanter) {
            speciesGrid.innerHTML = '';
            TREE_SPECIES_CATALOG.forEach((sp) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `tree-species-btn ${sp.id === this.treePlanter.selectedType ? 'active' : ''}`;
                btn.dataset.type = sp.id;
                btn.innerHTML = `
                    <span class="tree-swatch" style="background: ${sp.color}; border-color: ${sp.trunkColor};"></span>
                    <span>${sp.name}</span>
                `;
                btn.addEventListener('click', () => {
                    this.treePlanter.setPreviewSpec(sp.id, this.treePlanter.selectedScale);
                    syncTreePlanterUI();
                    if (treeReadout) {
                        treeReadout.textContent = `Selected: ${sp.name} (${this.treePlanter.selectedScale.toFixed(1)}×) • Click terrain to plant`;
                    }
                });
                speciesGrid.appendChild(btn);
            });
        }

        const toggleTreePlanter = (forceState) => {
            this.treePlanterActive = typeof forceState === 'boolean' ? forceState : !this.treePlanterActive;
            if (this.treePlanterActive && this.bulldozerActive) {
                this.bulldozerActive = false;
                if (bulldozeBtn) bulldozeBtn.classList.remove('active');
                this.controls.enableRotate = true;
                this.bulldozerGroup.visible = false;
                syncBulldozerButtons();
            }
            this.renderer.domElement.style.cursor = this.treePlanterActive ? 'crosshair' : 'default';
            syncTreePlanterUI();
        };

        if (treePlanterBtn) {
            treePlanterBtn.addEventListener('click', () => toggleTreePlanter());
        }
        if (closeTreeBtn) {
            closeTreeBtn.addEventListener('click', () => toggleTreePlanter(false));
        }
        if (treeScaleSlider && this.treePlanter) {
            treeScaleSlider.addEventListener('input', (e) => {
                const s = parseFloat(e.target.value);
                if (treeScaleVal) treeScaleVal.textContent = `${s.toFixed(1)}×`;
                this.treePlanter.setPreviewSpec(this.treePlanter.selectedType, s);
            });
        }
        if (treeSaveBtn && this.treePlanter) {
            treeSaveBtn.addEventListener('click', async () => {
                const ok = await this.treePlanter.exportToJsonFile();
                if (ok && treeReadout) {
                    treeReadout.textContent = `Saved ${this.treePlanter.plantedTrees.length} trees to planted-trees.json`;
                }
            });
        }
        if (treeLoadBtn && treeFileInput) {
            treeLoadBtn.addEventListener('click', () => treeFileInput.click());
            treeFileInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const parsed = JSON.parse(String(reader.result));
                        const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.trees) ? parsed.trees : []);
                        this.treePlanter.setTreesFromList(list, true);
                        syncTreePlanterUI();
                        this.renderer.shadowMap.needsUpdate = true;
                        if (treeReadout) {
                            treeReadout.textContent = `Loaded ${this.treePlanter.plantedTrees.length} trees from ${file.name}`;
                        }
                    } catch (_) {
                        if (treeReadout) treeReadout.textContent = 'Invalid JSON file format';
                    }
                };
                reader.readAsText(file);
                treeFileInput.value = '';
            });
        }
        if (treeUndoBtn && this.treePlanter) {
            treeUndoBtn.addEventListener('click', () => {
                const rem = this.treePlanter.undoLastTree();
                syncTreePlanterUI();
                this.renderer.shadowMap.needsUpdate = true;
                if (rem && treeReadout) {
                    treeReadout.textContent = `Removed ${rem.type} at [${rem.x}, ${rem.z}]`;
                }
            });
        }
        if (treeClearBtn && this.treePlanter) {
            treeClearBtn.addEventListener('click', () => {
                this.treePlanter.clearAllTrees(true);
                syncTreePlanterUI();
                this.renderer.shadowMap.needsUpdate = true;
                if (treeReadout) {
                    treeReadout.textContent = 'Cleared all planted trees';
                }
            });
        }
        syncTreePlanterUI();
        this._initAdaUI();
        this._initLumaUI();
    }

    _initLumaUI() {
        const lumaBtn = document.getElementById('btn-luma-tool');
        const lumaPanel = document.getElementById('luma-panel');
        const closeLumaBtn = document.getElementById('btn-close-luma-panel');
        const pbrCheck = document.getElementById('toggle-luma-pbr');
        const fgCheck = document.getElementById('toggle-luma-foreground');
        const probeCheck = document.getElementById('toggle-luma-probe');
        const hideMeshCheck = document.getElementById('toggle-luma-hide-mesh');
        const presetSelect = document.getElementById('luma-preset-select');
        const sourceInput = document.getElementById('luma-source-input');
        const scaleSlider = document.getElementById('luma-scale-slider');
        const scaleVal = document.getElementById('luma-scale-val');
        const ySlider = document.getElementById('luma-y-slider');
        const yVal = document.getElementById('luma-y-val');
        const statusReadout = document.getElementById('luma-status-readout');
        const spawnBtn = document.getElementById('btn-luma-spawn');
        const clearBtn = document.getElementById('btn-luma-clear');

        const setStatus = (msg) => {
            if (statusReadout) statusReadout.textContent = msg;
            this.announceToScreenReader(msg);
        };

        const toggleLumaPanel = (forceState) => {
            this.lumaPanelOpen = typeof forceState === 'boolean' ? forceState : !this.lumaPanelOpen;
            if (lumaBtn) {
                lumaBtn.classList.toggle('active', this.lumaPanelOpen);
                lumaBtn.setAttribute('aria-pressed', String(this.lumaPanelOpen));
            }
            if (lumaPanel) {
                lumaPanel.classList.toggle('hidden', !this.lumaPanelOpen);
            }
        };
        this.toggleLumaPanel = toggleLumaPanel;

        if (lumaBtn) {
            lumaBtn.addEventListener('click', () => toggleLumaPanel());
        }
        if (closeLumaBtn) {
            closeLumaBtn.addEventListener('click', () => toggleLumaPanel(false));
        }

        if (pbrCheck && this.lumaFoundry) {
            pbrCheck.checked = this.hdrPopEnabled;
            pbrCheck.addEventListener('change', (e) => {
                this.setHdrPopMode(e.target.checked);
                setStatus(
                    e.target.checked
                        ? 'HDR Luma Pop active: Sky/Sun PMREM IBL + Selective Bloom + 6:1 Solar Contrast + Crisp Shadows'
                        : 'HDR Environment Reflections & Bloom disabled'
                );
            });
            if (this.hdrPopEnabled) {
                this.setHdrPopMode(true);
            }
        }

        const bloomSlider = document.getElementById('luma-bloom-slider');
        const bloomVal = document.getElementById('luma-bloom-val');
        if (bloomSlider && this.lumaFoundry) {
            bloomSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value) || 0;
                if (bloomVal) bloomVal.textContent = `${Math.round(val * 100)}%`;
                this.lumaFoundry.setBloomStrength(val);
            });
        }

        if (presetSelect && sourceInput) {
            presetSelect.addEventListener('change', (e) => {
                if (e.target.value !== 'custom') {
                    sourceInput.value = e.target.value;
                } else {
                    sourceInput.focus();
                    sourceInput.select();
                }
            });
        }

        const getTargetKey = () => (this.selectedBuilding ? this.selectedBuilding.id : 'campus-showcase');

        if (fgCheck && this.lumaFoundry) {
            fgCheck.addEventListener('change', (e) => {
                this.lumaFoundry.foregroundOnly = e.target.checked;
                this.lumaFoundry.updateActiveSplat(getTargetKey(), { foregroundOnly: e.target.checked });
            });
        }

        if (probeCheck && this.lumaFoundry) {
            probeCheck.addEventListener('change', (e) => {
                this.lumaFoundry.useSplatAsEnvProbe = e.target.checked;
            });
        }

        if (hideMeshCheck) {
            hideMeshCheck.addEventListener('change', (e) => {
                if (this.selectedBuilding) {
                    const entry = this.campusBuildingMeshes.get(this.selectedBuilding.id);
                    if (entry && entry.group) {
                        entry.group.visible = !e.target.checked;
                    }
                }
            });
        }

        if (scaleSlider && this.lumaFoundry) {
            scaleSlider.addEventListener('input', (e) => {
                const s = parseFloat(e.target.value) || 4.5;
                if (scaleVal) scaleVal.textContent = `${s.toFixed(1)}×`;
                this.lumaFoundry.updateActiveSplat(getTargetKey(), { scale: s });
            });
        }

        if (ySlider && this.lumaFoundry) {
            ySlider.addEventListener('input', (e) => {
                const yOff = parseFloat(e.target.value) || 0;
                if (yVal) yVal.textContent = `${yOff >= 0 ? '+' : ''}${yOff.toFixed(1)}m`;
                this.lumaFoundry.updateActiveSplat(getTargetKey(), { yOffset: yOff });
            });
        }

        if (spawnBtn && this.lumaFoundry) {
            spawnBtn.addEventListener('click', () => {
                const targetBldg = this.selectedBuilding;
                const targetKey = getTargetKey();
                const x = targetBldg ? targetBldg.center[0] : -24.8;
                const z = targetBldg ? targetBldg.center[1] : 22.8;
                const scale = scaleSlider ? parseFloat(scaleSlider.value) || 4.5 : 4.5;
                const yOffset = ySlider ? parseFloat(ySlider.value) || 1.6 : 1.6;
                const fgOnly = fgCheck ? fgCheck.checked : true;
                const useProbe = probeCheck ? probeCheck.checked : true;

                // Note: Luma recommends disabling WebGL MSAA overhead during heavy splat rendering handled automatically by LumaSplatsThree
                const rec = this.lumaFoundry.spawnLumaSplat({
                    targetKey,
                    sourceUrl: sourceInput ? sourceInput.value : '',
                    x,
                    z,
                    yOffset,
                    scale,
                    foregroundOnly: fgOnly,
                    particleReveal: true,
                    useAsEnvProbe: useProbe,
                    onStatus: setStatus
                });

                if (rec) {
                    if (hideMeshCheck && hideMeshCheck.checked && targetBldg) {
                        const entry = this.campusBuildingMeshes.get(targetBldg.id);
                        if (entry && entry.group) entry.group.visible = false;
                    }
                    const ty = this.groundFoundry.getTerrainHeight(x, z);
                    this.flyToPosition(
                        new THREE.Vector3(x + 12, ty + 6.5, z + 14),
                        new THREE.Vector3(x, ty + yOffset, z)
                    );
                }
            });
        }

        if (clearBtn && this.lumaFoundry) {
            clearBtn.addEventListener('click', () => {
                this.lumaFoundry.clearAllSplats();
                this.campusBuildingMeshes.forEach((entry) => {
                    if (entry.group) entry.group.visible = true;
                });
                setStatus('Removed active Luma 3D Gaussian Splats and restored procedural meshes');
            });
        }
    }

    _initAdaUI() {
        const adaBtn = document.getElementById('btn-ada-tool');
        const adaPanel = document.getElementById('ada-panel');
        const closeAdaBtn = document.getElementById('btn-close-ada-panel');
        const markersCheck = document.getElementById('toggle-ada-3d-markers');
        const contrastCheck = document.getElementById('toggle-ada-high-contrast');
        const motionCheck = document.getElementById('toggle-ada-reduced-motion');
        const filterBtns = document.querySelectorAll('.ada-filter-btn');

        if (motionCheck) {
            motionCheck.checked = this.reducedMotion;
            motionCheck.addEventListener('change', (e) => {
                this.reducedMotion = e.target.checked;
                this.announceToScreenReader(
                    this.reducedMotion ? 'Reduced motion enabled: instant camera transitions' : 'Smooth camera transitions enabled'
                );
            });
        }

        if (contrastCheck) {
            contrastCheck.addEventListener('change', (e) => {
                document.body.classList.toggle('high-contrast-ui', e.target.checked);
                this.announceToScreenReader(
                    e.target.checked ? 'High-contrast UI mode enabled' : 'Standard contrast mode restored'
                );
            });
        }

        if (markersCheck) {
            markersCheck.checked = this.adaMarkersVisible;
            markersCheck.addEventListener('change', (e) => {
                this.adaMarkersVisible = e.target.checked;
                if (this.adaFoundry) {
                    this.adaFoundry.setVisible(this.adaPanelOpen && this.adaMarkersVisible);
                    this._syncLabelRendererVisibility();
                }
            });
        }

        filterBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                this.adaCategoryFilter = btn.dataset.filter || 'all';
                filterBtns.forEach((b) => {
                    const active = b === btn;
                    b.classList.toggle('active', active);
                    b.setAttribute('aria-selected', String(active));
                });
                this._renderAdaFeatureList();
            });
        });

        const toggleAdaPanel = (forceState) => {
            this.adaPanelOpen = typeof forceState === 'boolean' ? forceState : !this.adaPanelOpen;
            if (adaBtn) {
                adaBtn.classList.toggle('active', this.adaPanelOpen);
                adaBtn.setAttribute('aria-pressed', String(this.adaPanelOpen));
            }
            if (adaPanel) {
                adaPanel.classList.toggle('hidden', !this.adaPanelOpen);
            }
            if (this.adaFoundry) {
                this.adaFoundry.setVisible(this.adaPanelOpen && this.adaMarkersVisible);
                this._syncLabelRendererVisibility();
            }
            this.announceToScreenReader(
                this.adaPanelOpen
                    ? 'ADA Accessibility panel and 3D campus accessible entrances, ramps, and parking layer opened'
                    : 'ADA Accessibility panel closed'
            );
        };
        this.toggleAdaPanel = toggleAdaPanel;

        if (adaBtn) {
            adaBtn.addEventListener('click', () => toggleAdaPanel());
        }
        if (closeAdaBtn) {
            closeAdaBtn.addEventListener('click', () => toggleAdaPanel(false));
        }

        this._renderAdaFeatureList();
    }

    _renderAdaFeatureList() {
        const listEl = document.getElementById('ada-feature-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        const filtered = ADA_CAMPUS_FEATURES.filter(
            (f) => this.adaCategoryFilter === 'all' || f.category === this.adaCategoryFilter
        );

        filtered.forEach((feat) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `ada-feature-item ${this.selectedAdaFeatureId === feat.id ? 'active' : ''}`;
            btn.setAttribute('role', 'listitem');
            btn.innerHTML = `
                <div class="ada-item-top">
                    <span class="ada-item-badge">${feat.badge}</span>
                    <span class="ada-item-bldg">Bldg ${feat.buildingCode}</span>
                </div>
                <div class="ada-item-title">${feat.title}</div>
                <div class="ada-item-specs">${feat.location} • ${feat.specs}</div>
            `;
            btn.addEventListener('click', () => this.focusAdaFeature(feat));
            listEl.appendChild(btn);
        });
    }

    focusAdaFeature(feat) {
        if (!feat) return;
        this.selectedAdaFeatureId = feat.id;
        this._renderAdaFeatureList();

        if (feat.buildingId) {
            this.selectBuilding(feat.buildingId, false);
        }

        const ty = this.groundFoundry.getTerrainHeight(feat.x, feat.z);
        const target = new THREE.Vector3(feat.x, ty + 1.4, feat.z);
        const [ox, oy, oz] = feat.camOffset || [14, 7, 15];
        const camPos = new THREE.Vector3(feat.x + ox, ty + oy, feat.z + oz);
        this.flyToPosition(camPos, target);
        this.announceToScreenReader(`${feat.title}. ${feat.location}. ${feat.specs}`);
    }

    _refreshBulldozeDependents() {
        if (this.groundFoundry.rebuildCartography) {
            this.groundFoundry.rebuildCartography();
        }
        // Re-spawn Building 316 via worker so its terrain-contoured Douglas St grass & sidewalk follow any bulldozed terrain
        const b316 = CAMPUS_DATA.campusBuildings.find((b) => b.code === '316' || b.id === 'building-316');
        if (b316) {
            this._spawnCampusBuildingAsync(b316);
        }
        if (this.treePlanter) {
            this.treePlanter.refreshTreeElevations();
        }
        if (this.adaFoundry) {
            this.adaFoundry.buildLayer();
            this.adaFoundry.setVisible(this.adaPanelOpen && this.adaMarkersVisible);
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

            const shortTitle = this._getConciseBuildingTitle(bldg);
            const shortAddress = (bldg.address || '').split(',')[0].trim();
            const card = document.createElement('div');
            card.className = `bldg-list-item ${this.selectedBuilding?.id === bldg.id ? 'active' : ''}`;
            card.dataset.id = bldg.id;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `${bldg.code} ${bldg.name}, ${shortAddress}`);
            card.innerHTML = `
                <div class="bldg-item-header">
                    <span class="bldg-badge" style="background:${bldg.color}">${bldg.code}</span>
                    <div class="bldg-item-titles">
                        <h4><span class="sr-only">${bldg.name}</span><span aria-hidden="true">${shortTitle}</span></h4>
                        <p><span class="sr-only">${bldg.address}</span><span aria-hidden="true">${shortAddress}</span></p>
                    </div>
                </div>
            `;
            card.addEventListener('click', () => this.selectBuilding(bldg.id, true));
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectBuilding(bldg.id, true);
                }
            });
            listEl.appendChild(card);
        });
    }

    selectBuilding(buildingId, flyTo = true) {
        const entry = this.campusBuildingMeshes.get(buildingId);
        if (!entry) return;

        const bldg = entry.data;
        const switchedBuilding = this.selectedBuilding?.id !== bldg.id;
        this.selectedBuilding = bldg;
        if (switchedBuilding) {
            this.activeFloorFilter = null;
            this.activeDepartmentZone = null;
            if (this.floorCutawayFoundry) {
                this.floorCutawayFoundry.clear();
            }
        }
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

        const shortTitle = this._getConciseBuildingTitle(bldg);
        const shortAddress = (bldg.address || '').split(',')[0].trim();
        const detailPanel = document.getElementById('building-detail-card');
        if (detailPanel) {
            detailPanel.classList.remove('hidden');
        }
        const detailCodeEl = document.getElementById('detail-code');
        if (detailCodeEl) {
            detailCodeEl.textContent = bldg.code;
            detailCodeEl.style.background = bldg.color;
        }
        const detailNameEl = document.getElementById('detail-name');
        if (detailNameEl) {
            detailNameEl.innerHTML = `<span class="sr-only">${bldg.name}</span><span aria-hidden="true">${shortTitle}</span>`;
        }
        const detailAddrEl = document.getElementById('detail-address');
        if (detailAddrEl) {
            detailAddrEl.textContent = bldg.phone ? `${shortAddress} • ${bldg.phone}` : shortAddress;
        }
        const summaryEl = document.getElementById('detail-summary');
        if (summaryEl) {
            summaryEl.textContent = bldg.summary || '';
            summaryEl.classList.add('hidden');
        }
        const adaBox = document.getElementById('detail-ada-box');
        const adaInfo = BUILDING_ADA_SUMMARY[bldg.id];
        if (adaBox) {
            adaBox.classList.add('hidden');
            adaBox.style.display = 'none';
        }

        const floorPillsEl = document.getElementById('detail-floor-pills');
        const bands = this.floorCutawayFoundry
            ? this.floorCutawayFoundry.getBuildingFloorBands(bldg, entry.group, ty)
            : [];
        if (floorPillsEl) {
            floorPillsEl.innerHTML = '';
            const allBtn = document.createElement('button');
            allBtn.type = 'button';
            allBtn.className = `floor-pill-btn ${this.activeFloorFilter === null ? 'active' : ''}`;
            allBtn.dataset.floor = 'all';
            allBtn.setAttribute('role', 'tab');
            allBtn.setAttribute('aria-selected', String(this.activeFloorFilter === null));
            allBtn.title = 'Show all floors';
            allBtn.textContent = 'All';
            allBtn.addEventListener('click', () => this.setBuildingFloorFilter(null, false));
            floorPillsEl.appendChild(allBtn);

            bands.forEach((band) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                const isAct = this.activeFloorFilter === band.floor;
                btn.className = `floor-pill-btn ${isAct ? 'active' : ''}`;
                btn.dataset.floor = String(band.floor);
                btn.setAttribute('role', 'tab');
                btn.setAttribute('aria-selected', String(isAct));
                btn.title = band.title;
                btn.textContent = band.shortLabel;
                btn.addEventListener('click', () => this.setBuildingFloorFilter(band.floor, true));
                floorPillsEl.appendChild(btn);
            });
        }

        const deptContainer = document.getElementById('detail-departments');
        if (deptContainer) {
            deptContainer.innerHTML = '';
            (bldg.departments || []).forEach((d) => {
                const deptFloor = this.floorCutawayFoundry
                    ? this.floorCutawayFoundry.parseDepartmentFloor(d, bldg)
                    : 1;
                const deptZoneId = d.zoneId || '';
                const isDeptActive =
                    this.activeFloorFilter === deptFloor &&
                    (this.activeDepartmentZone ? this.activeDepartmentZone === deptZoneId : true);
                const shortDept = this._getConciseDepartmentName(d);
                const shortFloorTag = deptZoneId === 'rjc-411-front'
                    ? '410'
                    : deptZoneId === 'natres-411-rear'
                        ? '411/412'
                        : `F${deptFloor}`;

                const row = document.createElement('div');
                row.className = `dept-row ${d.parentZoneId ? 'dept-subrow' : ''} ${isDeptActive ? 'active' : ''}`;
                row.dataset.floor = String(deptFloor);
                row.dataset.zoneId = deptZoneId;
                if (d.parentZoneId) row.dataset.parentZoneId = d.parentZoneId;
                row.setAttribute('role', 'button');
                row.setAttribute('tabindex', '0');
                row.setAttribute('aria-label', `${d.name}, ${d.level}, ${d.phone}`);
                row.innerHTML = `
                    <div class="dept-floor-pill" aria-hidden="true">${shortFloorTag}</div>
                    <div class="dept-info">
                        <span class="sr-only">${d.name} — ${d.suite} • ${d.phone}</span>
                        <strong aria-hidden="true">${shortDept}</strong>
                    </div>
                `;
                const onActivate = () => {
                    const sameSelection =
                        this.activeFloorFilter === deptFloor &&
                        (this.activeDepartmentZone || '') === deptZoneId;
                    const nextFloor = sameSelection ? null : deptFloor;
                    const nextZone = nextFloor !== null ? (deptZoneId || null) : null;
                    this.setBuildingFloorFilter(nextFloor, nextFloor !== null, nextZone);
                };
                row.addEventListener('click', onActivate);
                row.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onActivate();
                    }
                });
                deptContainer.appendChild(row);
            });
        }

        if (this.activeFloorFilter !== null) {
            this.setBuildingFloorFilter(this.activeFloorFilter, false, this.activeDepartmentZone);
        } else {
            this.renderer.shadowMap.needsUpdate = true;
        }

        const targetNameEl = document.getElementById('foundry-target-name');
        if (targetNameEl) targetNameEl.textContent = shortTitle;
        document.getElementById('foundry-wall-style').value = bldg.wallStyle;
        document.getElementById('foundry-wall-color').value = bldg.color;
        document.getElementById('foundry-trim-color').value = bldg.trimColor;

        this.announceToScreenReader(
            `Selected ${bldg.name}, ${bldg.address}. ${adaInfo ? adaInfo.status + '. ' + adaInfo.entrance : ''}`
        );

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

    setBuildingFloorFilter(floorNumOrNull = null, focusCamera = false, zoneId = null) {
        if (!this.selectedBuilding || !this.floorCutawayFoundry) return;
        const entry = this.campusBuildingMeshes.get(this.selectedBuilding.id);
        if (!entry || !entry.group) return;

        this.activeFloorFilter = floorNumOrNull === null ? null : Number(floorNumOrNull);
        this.activeDepartmentZone = this.activeFloorFilter === null ? null : (zoneId || null);
        this.selectionRing.visible = !(this.activeFloorFilter !== null && this.floorCutawayEnabled);

        const splitRoadY = this.groundFoundry.getBuildingRoadHeight(this.selectedBuilding.id);
        const ty = splitRoadY !== null
            ? splitRoadY
            : this.groundFoundry.getTerrainHeight(this.selectedBuilding.center[0], this.selectedBuilding.center[1]);

        const activeBand = this.floorCutawayFoundry.setActiveFloor(
            this.selectedBuilding,
            entry.group,
            ty,
            this.activeFloorFilter,
            this.floorCutawayEnabled,
            this.activeDepartmentZone
        );

        document.querySelectorAll('#detail-floor-pills .floor-pill-btn').forEach((btn) => {
            const isMatch =
                this.activeFloorFilter === null
                    ? btn.dataset.floor === 'all'
                    : Number(btn.dataset.floor) === this.activeFloorFilter;
            btn.classList.toggle('active', isMatch);
            btn.setAttribute('aria-selected', String(isMatch));
        });

        document.querySelectorAll('#detail-departments .dept-row').forEach((row) => {
            const isMatch =
                this.activeFloorFilter !== null &&
                (this.activeDepartmentZone
                    ? row.dataset.zoneId === this.activeDepartmentZone
                    : Number(row.dataset.floor) === this.activeFloorFilter);
            row.classList.toggle('active', isMatch);
        });

        this.renderer.shadowMap.needsUpdate = true;

        if (activeBand) {
            this.announceToScreenReader(
                `Inspecting ${this.selectedBuilding.shortName} ${activeBand.title}${this.floorCutawayEnabled ? ' with 3D floor-plate cutaway' : ''}`
            );
            if (focusCamera) {
                const midY = (activeBand.minY + activeBand.maxY) * 0.5;
                const target = new THREE.Vector3(
                    this.selectedBuilding.center[0],
                    Math.max(ty + 1.0, midY),
                    this.selectedBuilding.center[1]
                );
                const camPos = new THREE.Vector3(
                    this.selectedBuilding.center[0] + 36,
                    Math.max(ty + 30, midY + 28),
                    this.selectedBuilding.center[1] + 40
                );
                this.flyToPosition(camPos, target);
            }
        } else {
            this.announceToScreenReader(`Showing all floors of ${this.selectedBuilding.shortName}`);
        }
    }

    clearSelection() {
        this.activeFloorFilter = null;
        this.activeDepartmentZone = null;
        if (this.floorCutawayFoundry) {
            this.floorCutawayFoundry.clear();
            this.renderer.shadowMap.needsUpdate = true;
        }
        this.selectedBuilding = null;
        this.selectionRing.visible = false;
        document.getElementById('building-detail-card').classList.add('hidden');
        document.querySelectorAll('.bldg-list-item').forEach((el) => el.classList.remove('active'));
        document.querySelectorAll('.campus-3d-label').forEach((el) => el.classList.remove('selected'));
    }

    flyToPosition(camPos, targetPos) {
        if (this.followBirdViewActive) {
            this.setMigratoryBirdView(false, false, false);
        }
        if (this.reducedMotion) {
            this.cameraAnim = null;
            this.camera.position.copy(camPos);
            this.controls.target.copy(targetPos);
            this.controls.update();
            return;
        }
        this.cameraAnim = {
            startPos: this.camera.position.clone(),
            endPos: camPos.clone(),
            startTarget: this.controls.target.clone(),
            endTarget: targetPos.clone(),
            progress: 0
        };
    }

    /**
     * Automatically triggered on ALL Bald Eagle spawns:
     * Saves the user's current camera position & orbit target (if not already in Bird View)
     * and switches automatically into Bird's-Eye View to follow the 30-second campus soar.
     */
    _handleBaldEagleSpawn(flight) {
        this._activeEagleFlight = flight;
        this._lastEagleHudSec = -1;

        if (!this.followBirdViewActive) {
            this._savedPreBirdCamPos = this.cameraAnim
                ? this.cameraAnim.endPos.clone()
                : this.camera.position.clone();
            this._savedPreBirdTarget = this.cameraAnim
                ? this.cameraAnim.endTarget.clone()
                : this.controls.target.clone();
            this.setMigratoryBirdView(true, false);
        } else {
            // Already in Bird View: keep original _savedPreBirdCamPos/_savedPreBirdTarget intact
            // and smoothly transition onto the newly spawned Bald Eagle
            this._birdCamSnapNextFrame = false;
        }
    }

    /**
     * Automatically triggered when the Bald Eagle campus pass-by concludes:
     * Exits Bird's-Eye View and smoothly flies back to the saved pre-soar camera position & target.
     */
    _handleBaldEagleSoarEnd(flight) {
        if (this._activeEagleFlight === flight) {
            this._activeEagleFlight = null;
        }
        if (this.followBirdViewActive && (!this._lastFollowedFlightRef || this._lastFollowedFlightRef === flight)) {
            this.setMigratoryBirdView(false, false, !this.kioskMode);
            if (!this.kioskMode) {
                this.announceToScreenReader('Bald Eagle campus soar complete; returning to previous camera view');
            }
        }
    }

    async _acquireKioskWakeLock() {
        try {
            if (typeof navigator !== 'undefined' && navigator.wakeLock && typeof navigator.wakeLock.request === 'function') {
                this._kioskWakeLock = await navigator.wakeLock.request('screen');
            }
        } catch (_) {}
    }

    async _releaseKioskWakeLock() {
        try {
            if (this._kioskWakeLock) {
                await this._kioskWakeLock.release();
                this._kioskWakeLock = null;
            }
        } catch (_) {
            this._kioskWakeLock = null;
        }
    }

    _syncKioskClockUI(date = new Date(), solarState = null) {
        const timeEl = document.getElementById('tv-kiosk-time');
        const dateEl = document.getElementById('tv-kiosk-date');
        if (!timeEl && !dateEl) return;

        const state = solarState || this._computeWenatcheeSolarState(date);
        if (timeEl) {
            timeEl.textContent = state.formattedTime;
        }
        if (dateEl) {
            const glyph = state.elevationDeg < -4 ? '🌙' : state.elevationDeg < 12 ? '🌅' : '☀️';
            dateEl.textContent = glyph;
        }
    }

    _setKioskLabelsMode(mode = 'all') {
        if (!this.labelRenderer || !this.labelRenderer.domElement) return;
        if (mode === 'none') {
            this.labelObjects.forEach((obj) => {
                if (obj.element) obj.element.style.display = 'none';
            });
            this.labelRenderer.domElement.style.display = 'none';
            return;
        }
        const selLabel = this.selectedBuilding
            ? this.campusBuildingMeshes.get(this.selectedBuilding.id)?.label
            : null;
        this.labelObjects.forEach((obj) => {
            if (!obj.element) return;
            if (mode === 'selected') {
                const isStreet = this.streetLabelObjects?.includes(obj);
                obj.element.style.display = (obj === selLabel || isStreet) ? '' : 'none';
            } else {
                obj.element.style.display = '';
            }
        });
        this.labelRenderer.domElement.style.display = 'block';
    }

    _buildKioskPlaylist() {
        const sortedBldgs = [...CAMPUS_DATA.campusBuildings].sort(
            (a, b) => (a.sortOrder || 99) - (b.sortOrder || 99)
        );
        const totalBldgs = sortedBldgs.length;
        const halfSplit = Math.ceil(totalBldgs / 2);
        const playlist = [];
        let macroCount = 0;

        const addBuildingsSlice = (slice, startIndexOffset) => {
            slice.forEach((bldg, idx) => {
                const bldgNum = startIndexOffset + idx + 1;
                const macroIdx = macroCount++;
                const entry = this.campusBuildingMeshes.get(bldg.id);
                const splitRoadY = this.groundFoundry.getBuildingRoadHeight(bldg.id);
                const ty = splitRoadY !== null
                    ? splitRoadY
                    : this.groundFoundry.getTerrainHeight(bldg.center[0], bldg.center[1]);
                const bands = (entry && this.floorCutawayFoundry)
                    ? this.floorCutawayFoundry.getBuildingFloorBands(bldg, entry.group, ty)
                    : [];

                // Ultra-slow cinematic exterior architectural showcase beat (~0.37°/sec, aligned with floor cutaway orientation)
                const anchorAngle = THREE.MathUtils.clamp(0.66 + (bldg.center[0] - 8) * 0.0016, 0.50, 0.82);
                const floorArc = 0.055;
                playlist.push({
                    type: 'building-overview',
                    macroIdx,
                    buildingId: bldg.id,
                    bldgNum,
                    totalBldgs,
                    duration: 11.5,
                    transitionDuration: 1.55,
                    startAngle: anchorAngle - 0.075,
                    endAngle: anchorAngle,
                    radius: Math.max(58, (bldg.height || 12) * 2.5 + 36),
                    heightOffset: Math.max(28, (bldg.height || 12) * 1.35 + 14),
                    baseTy: ty
                });

                // Continuous, ultra-slow floor-by-floor 3D cutaway beats (~0.35°/sec monotonic glide, zero back-and-forth whip)
                bands.forEach((band, fIdx) => {
                    playlist.push({
                        type: 'building-floor',
                        macroIdx,
                        buildingId: bldg.id,
                        bldgNum,
                        totalBldgs,
                        floor: band.floor,
                        bandTitle: band.title,
                        bandMinY: band.minY,
                        bandMaxY: band.maxY,
                        duration: 9.0,
                        transitionDuration: fIdx === 0 ? 1.35 : 1.05,
                        startAngle: anchorAngle + fIdx * floorArc,
                        endAngle: anchorAngle + (fIdx + 1) * floorArc,
                        radius: 46,
                        baseTy: ty
                    });
                });
            });
        };

        // 1. Opening Panoramic Campus Aerial Sweep (Ultra-slow ~0.67°/sec cinematic drone drift)
        playlist.push({
            type: 'campus-orbit',
            macroIdx: macroCount++,
            duration: 24.0,
            transitionDuration: 1.65,
            startAngle: 0.52,
            endAngle: 0.24,
            radius: 176,
            camY: 88,
            target: [12, 6, 10],
            kicker: 'Campus',
            title: 'Chelan County Campus',
            desc: ''
        });

        // 2. Guided Tour of First 4 Campus Buildings & 3D Floor Cutaways
        addBuildingsSlice(sortedBldgs.slice(0, halfSplit), 0);

        // 3. Mid-Loop High-Resolution Bald Eagle ~300 ft Campus Flyover + Welcome Banner
        playlist.push({
            type: 'eagle-flyover',
            macroIdx: macroCount++,
            duration: 55.0,
            kicker: 'Flyover',
            title: 'Bald Eagle Soar',
            desc: ''
        });

        // 4. Complementary Panoramic Campus Aerial Sweep (Ultra-slow ~0.68°/sec cinematic drone drift)
        playlist.push({
            type: 'campus-orbit',
            macroIdx: macroCount++,
            duration: 22.0,
            transitionDuration: 1.65,
            startAngle: 0.88,
            endAngle: 0.62,
            radius: 182,
            camY: 92,
            target: [16, 6, -4],
            kicker: 'Campus',
            title: 'Downtown Civic Core',
            desc: ''
        });

        // 5. Guided Tour of Remaining 4 Campus Buildings & 3D Floor Cutaways
        addBuildingsSlice(sortedBldgs.slice(halfSplit), halfSplit);

        // 6. Closing Bald Eagle ~300 ft Campus Flyover + Welcome Banner
        playlist.push({
            type: 'eagle-flyover',
            macroIdx: macroCount++,
            duration: 55.0,
            kicker: 'Flyover',
            title: 'Bald Eagle Soar',
            desc: ''
        });

        this.kioskMacroTotal = macroCount;
        const dotsWrap = document.getElementById('tv-kiosk-step-dots');
        if (dotsWrap) {
            dotsWrap.innerHTML = '';
            for (let i = 0; i < macroCount; i++) {
                const dot = document.createElement('span');
                dot.className = 'tv-kiosk-dot';
                dot.dataset.macroIdx = String(i);
                dotsWrap.appendChild(dot);
            }
        }

        return playlist;
    }

    _updateKioskStageBanner(kicker, title, desc, activeMacroIdx) {
        const kickerEl = document.getElementById('tv-kiosk-kicker');
        const titleEl = document.getElementById('tv-kiosk-stage-title');
        const descEl = document.getElementById('tv-kiosk-stage-desc');
        if (kickerEl) kickerEl.textContent = kicker || 'Campus';
        if (titleEl) titleEl.textContent = title || 'Chelan County Campus';
        if (descEl) descEl.textContent = desc || '';
        document.querySelectorAll('#tv-kiosk-step-dots .tv-kiosk-dot').forEach((d) => {
            d.classList.toggle('active', Number(d.dataset.macroIdx) === activeMacroIdx);
        });
    }

    _enterKioskBeat(index = 0) {
        if (!this.kioskPlaylist || this.kioskPlaylist.length === 0) {
            this.kioskPlaylist = this._buildKioskPlaylist();
        }
        if (this.kioskPlaylist.length === 0) return;

        const len = this.kioskPlaylist.length;
        this.kioskBeatIndex = ((index % len) + len) % len;
        this.kioskBeatElapsed = 0;
        this.cameraAnim = null;
        this._kioskTransitionStartPos.copy(this.camera.position);
        this._kioskTransitionStartTarget.copy(this.controls.target);

        const fillEl = document.getElementById('tv-kiosk-progress-fill');
        if (fillEl) fillEl.style.width = '0%';

        const beat = this.kioskPlaylist[this.kioskBeatIndex];

        if (beat.type === 'campus-orbit') {
            if (this.followBirdViewActive) {
                this.setMigratoryBirdView(false, false, false);
            }
            this.clearSelection();
            this._setKioskLabelsMode('all');
            this._updateKioskStageBanner(beat.kicker, beat.title, '', beat.macroIdx);
            return;
        }

        if (beat.type === 'building-overview') {
            if (this.followBirdViewActive) {
                this.setMigratoryBirdView(false, false, false);
            }
            this.selectBuilding(beat.buildingId, false);
            this.setBuildingFloorFilter(null, false, null);
            this._setKioskLabelsMode('selected');

            const bldg = this.selectedBuilding;
            this._updateKioskStageBanner(
                bldg?.code || String(beat.bldgNum),
                this._getConciseBuildingTitle(bldg) || beat.buildingId,
                '',
                beat.macroIdx
            );
            return;
        }

        if (beat.type === 'building-floor') {
            if (this.followBirdViewActive) {
                this.setMigratoryBirdView(false, false, false);
            }
            if (!this.selectedBuilding || this.selectedBuilding.id !== beat.buildingId) {
                this.selectBuilding(beat.buildingId, false);
            }
            this.floorCutawayEnabled = true;
            this.setBuildingFloorFilter(beat.floor, false, null);
            this._setKioskLabelsMode('none');

            const bldg = this.selectedBuilding;
            const seenDepts = new Set();
            const floorDepts = [];
            (bldg?.departments || []).forEach((d) => {
                const f = this.floorCutawayFoundry
                    ? this.floorCutawayFoundry.parseDepartmentFloor(d, bldg)
                    : 1;
                if (f === beat.floor) {
                    const shortDept = this._getConciseDepartmentName(d);
                    if (shortDept && !seenDepts.has(shortDept)) {
                        seenDepts.add(shortDept);
                        floorDepts.push(shortDept);
                    }
                }
            });
            const conciseFloorTitle = floorDepts.length > 0
                ? floorDepts.join(' • ')
                : (this._getConciseBuildingTitle(bldg) || beat.bandTitle);

            this._updateKioskStageBanner(
                `${bldg?.code || ''} • F${beat.floor}`,
                conciseFloorTitle,
                '',
                beat.macroIdx
            );
            return;
        }

        if (beat.type === 'eagle-flyover') {
            this.clearSelection();
            this._setKioskLabelsMode('all');
            if (this.geeseFoundry) {
                this.geeseFoundry.spawnBaldEagleSoar();
            }
            this._updateKioskStageBanner(beat.kicker, beat.title, '', beat.macroIdx);
        }
    }

    _updateKioskTour(dt) {
        if (!this.kioskMode || !this.kioskPlaylist || this.kioskPlaylist.length === 0) return;

        const beat = this.kioskPlaylist[this.kioskBeatIndex];
        if (!beat) return;

        this.kioskBeatElapsed += dt;
        const fillEl = document.getElementById('tv-kiosk-progress-fill');

        if (beat.type === 'eagle-flyover') {
            const flight = this._activeEagleFlight;
            const pct = (flight && flight.totalDist > 0)
                ? Math.min(100, (flight.progress / flight.totalDist) * 100)
                : Math.min(100, (this.kioskBeatElapsed / beat.duration) * 100);
            if (fillEl) fillEl.style.width = `${pct.toFixed(1)}%`;

            if (flight && flight.group) {
                const titleEl = document.getElementById('tv-kiosk-stage-title');
                if (titleEl) {
                    titleEl.textContent = flight.group.position.y >= 104
                        ? (flight.endingId === 'welcome-drone-swarm'
                            ? 'Welcome to Chelan County • Drone Formation'
                            : flight.endingId === 'welcome-miss-veedol'
                                ? 'Welcome to Chelan County • Miss Veedol'
                                : 'Welcome to Chelan County')
                        : 'Bald Eagle Soar';
                }
            }

            if (
                (this.kioskBeatElapsed > 1.5 && (!this._activeEagleFlight || !this.followBirdViewActive)) ||
                this.kioskBeatElapsed >= beat.duration
            ) {
                this._enterKioskBeat(this.kioskBeatIndex + 1);
            }
            return;
        }

        const u = Math.min(1.0, this.kioskBeatElapsed / Math.max(0.1, beat.duration));
        if (fillEl) fillEl.style.width = `${(u * 100).toFixed(1)}%`;

        let desiredPos;
        let desiredTarget;

        if (beat.type === 'campus-orbit') {
            const easedU = THREE.MathUtils.lerp(u, 0.5 - 0.5 * Math.cos(Math.PI * u), 0.35);
            const angle = THREE.MathUtils.lerp(beat.startAngle, beat.endAngle, easedU);
            const tx = beat.target[0];
            const ty = beat.target[1];
            const tz = beat.target[2];
            desiredTarget = new THREE.Vector3(tx, ty, tz);
            desiredPos = new THREE.Vector3(
                tx + Math.sin(angle) * beat.radius,
                beat.camY,
                tz + Math.cos(angle) * beat.radius
            );
        } else if (beat.type === 'building-overview' || beat.type === 'building-floor') {
            const bldg = this.campusBuildingMeshes.get(beat.buildingId)?.data;
            const cx = bldg ? bldg.center[0] : 0;
            const cz = bldg ? bldg.center[1] : 0;
            const orbitU = beat.type === 'building-overview'
                ? THREE.MathUtils.lerp(u, 0.5 - 0.5 * Math.cos(Math.PI * u), 0.25)
                : u;
            const angle = THREE.MathUtils.lerp(beat.startAngle, beat.endAngle, orbitU);

            let focusY;
            let camY;
            if (beat.type === 'building-floor') {
                const midY = (beat.bandMinY + beat.bandMaxY) * 0.5;
                focusY = Math.max(beat.baseTy + 1.0, midY);
                camY = Math.max(beat.baseTy + 28, midY + 26);
            } else {
                focusY = beat.baseTy + (bldg ? bldg.height * 0.42 : 6);
                camY = beat.baseTy + beat.heightOffset;
            }

            desiredPos = new THREE.Vector3(
                cx + Math.sin(angle) * beat.radius,
                camY,
                cz + Math.cos(angle) * beat.radius
            );
            desiredTarget = new THREE.Vector3(cx, focusY, cz);
        }

        if (desiredPos && desiredTarget) {
            if (this.reducedMotion) {
                this.camera.position.copy(desiredPos);
                this.controls.target.copy(desiredTarget);
            } else {
                const transDur = beat.transitionDuration || 1.5;
                const blend = THREE.MathUtils.smootherstep(this.kioskBeatElapsed, 0, transDur);
                this.camera.position.lerpVectors(this._kioskTransitionStartPos, desiredPos, blend);
                this.controls.target.lerpVectors(this._kioskTransitionStartTarget, desiredTarget, blend);
            }
        }

        if (this.kioskBeatElapsed >= beat.duration) {
            this._enterKioskBeat(this.kioskBeatIndex + 1);
        }
    }

    setKioskMode(enabled = true, { fromUserGesture = false, silent = false, startBeatIndex = 0 } = {}) {
        const nextState = Boolean(enabled);
        if (nextState === this.kioskMode) return;

        this.kioskMode = nextState;
        document.body.classList.toggle('tv-kiosk-mode', this.kioskMode);

        const kioskTopBtn = document.getElementById('btn-kiosk-top');
        if (kioskTopBtn) {
            kioskTopBtn.classList.toggle('active', this.kioskMode);
            kioskTopBtn.setAttribute('aria-pressed', String(this.kioskMode));
        }

        const kioskHeader = document.getElementById('tv-kiosk-header');
        const kioskStageBar = document.getElementById('tv-kiosk-stage-bar');
        if (kioskHeader) kioskHeader.classList.toggle('hidden', !this.kioskMode);
        if (kioskStageBar) kioskStageBar.classList.toggle('hidden', !this.kioskMode);

        if (this.kioskMode) {
            const labelsToggle = document.getElementById('toggle-labels');
            this._kioskSavedState = {
                realTimeSunEnabled: this.realTimeSunEnabled,
                currentHour: this.currentHour,
                labelsChecked: Boolean(labelsToggle && labelsToggle.checked),
                floorCutawayEnabled: this.floorCutawayEnabled,
                gpuAccelerated: this.gpuAccelerated
            };

            // Close any open authoring/tool panels and disable interactive camera controls
            document.getElementById('map-tools-panel')?.classList.add('hidden');
            if (this.adaPanelOpen && this.toggleAdaPanel) this.toggleAdaPanel(false);
            if (this.lumaPanelOpen && this.toggleLumaPanel) this.toggleLumaPanel(false);
            if (this.treePlanterActive) {
                document.getElementById('btn-close-tree-planter')?.click();
            }
            if (this.bulldozerActive) {
                this.bulldozerActive = false;
                this.bulldozerGroup.visible = false;
            }
            if (this.controls) {
                this.controls.enabled = false;
            }

            // Enable full 4K UHD (3840x2160) WebGL resolution, 4096x4096 shadow maps, and max anisotropic filtering
            if (!this.gpuAccelerated) {
                this.setGpuAcceleration(true);
            } else {
                const pr = this._getOptimalPixelRatio(true);
                this.renderer.setPixelRatio(pr);
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                if (this.lumaFoundry) {
                    this.lumaFoundry.setSize(window.innerWidth, window.innerHeight, pr);
                }
            }

            // Enable Real-Time Wenatchee Sun Lighting & live clock header
            this.setRealTimeSunEnabled(true, { silent: true });
            this._syncKioskClockUI();
            this._acquireKioskWakeLock();

            if (fromUserGesture && typeof document !== 'undefined' && !document.fullscreenElement) {
                document.documentElement.requestFullscreen?.().catch(() => {});
            }

            this.kioskPlaylist = this._buildKioskPlaylist();
            this._enterKioskBeat(startBeatIndex || 0);

            if (!silent) {
                this.announceToScreenReader('65-inch 4K TV Kiosk Showcase Mode enabled');
            }
        } else {
            if (this.followBirdViewActive) {
                this.setMigratoryBirdView(false, false, false);
            }
            if (this.controls) {
                this.controls.enabled = true;
            }
            this._releaseKioskWakeLock();

            if (typeof document !== 'undefined' && document.fullscreenElement) {
                document.exitFullscreen?.().catch(() => {});
            }

            const saved = this._kioskSavedState;
            this._kioskSavedState = null;
            if (saved) {
                this.floorCutawayEnabled = saved.floorCutawayEnabled;
                const labelsToggle = document.getElementById('toggle-labels');
                if (labelsToggle) labelsToggle.checked = saved.labelsChecked;
                if (saved.gpuAccelerated !== undefined && saved.gpuAccelerated !== this.gpuAccelerated) {
                    this.setGpuAcceleration(saved.gpuAccelerated);
                }
                if (!saved.realTimeSunEnabled) {
                    this.currentHour = saved.currentHour;
                    this.setRealTimeSunEnabled(false, { silent: true });
                }
            }

            const hq = this.gpuAccelerated || this.hdrPopEnabled;
            const pr = this._getOptimalPixelRatio(hq);
            this.renderer.setPixelRatio(pr);
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            if (this.lumaFoundry) {
                this.lumaFoundry.setSize(window.innerWidth, window.innerHeight, pr);
            }

            this.clearSelection();
            this._syncLabelRendererVisibility();
            this.flyToPosition(new THREE.Vector3(115, 95, 145), new THREE.Vector3(8, 6, 18));

            if (!silent) {
                this.announceToScreenReader('Exited TV Kiosk Showcase Mode');
            }
        }
    }

    /**
     * Toggles or cycles the "Follow Migratory Bird View" aerial chase camera.
     * @param {boolean} active - Whether bird chase view should be active.
     * @param {boolean} forceNext - If true, spawns & switches to the next migratory bird species immediately.
     * @param {boolean} restoreCameraOnExit - If true when exiting, flies back to the saved pre-bird camera pose.
     */
    setMigratoryBirdView(active, forceNext = false, restoreCameraOnExit = true) {
        const birdTopBtn = document.getElementById('btn-bird-view-top');
        const birdCamBtn = document.getElementById('btn-bird-cam');
        const hudEl = document.getElementById('bird-view-hud');

        if (!active) {
            const wasActive = this.followBirdViewActive;
            this.followBirdViewActive = false;
            this._lastFollowedFlightRef = null;
            this._activeEagleFlight = null;

            if (birdTopBtn) {
                birdTopBtn.classList.remove('active');
                birdTopBtn.setAttribute('aria-pressed', 'false');
            }
            if (birdCamBtn) {
                birdCamBtn.classList.remove('active');
                birdCamBtn.setAttribute('aria-pressed', 'false');
            }
            if (hudEl) {
                hudEl.classList.add('hidden');
            }
            if (this.scene && this.scene.fog && this.fogEnabled !== false) {
                this.scene.fog.near = 240;
            }

            if (wasActive && restoreCameraOnExit) {
                const restorePos = this._savedPreBirdCamPos
                    ? this._savedPreBirdCamPos.clone()
                    : new THREE.Vector3(115, 95, 145);
                const restoreTarget = this._savedPreBirdTarget
                    ? this._savedPreBirdTarget.clone()
                    : new THREE.Vector3(8, 6, 18);
                this.flyToPosition(restorePos, restoreTarget);
                this.announceToScreenReader('Exited Migratory Bird View');
            }
            return;
        }

        if (!this.followBirdViewActive) {
            this._savedPreBirdCamPos = this.cameraAnim
                ? this.cameraAnim.endPos.clone()
                : this.camera.position.clone();
            this._savedPreBirdTarget = this.cameraAnim
                ? this.cameraAnim.endTarget.clone()
                : this.controls.target.clone();
        }

        this.followBirdViewActive = true;
        this.cameraAnim = null;
        this._birdCamSnapNextFrame = true;

        if (this.geeseFoundry) {
            this.geeseFoundry.ensureFollowedFlight(forceNext);
        }

        if (birdTopBtn) {
            birdTopBtn.classList.add('active');
            birdTopBtn.setAttribute('aria-pressed', 'true');
        }
        if (birdCamBtn) {
            birdCamBtn.classList.add('active');
            birdCamBtn.setAttribute('aria-pressed', 'true');
        }
        if (hudEl) {
            hudEl.classList.remove('hidden');
        }

        this._updateMigratoryBirdViewCamera(0.016, true);
    }

    _updateMigratoryBirdViewCamera(dt, immediateSnap = false) {
        if (!this.followBirdViewActive || !this.geeseFoundry) return;

        const pose = this.geeseFoundry.getFollowedFlightPose();
        if (!pose) return;

        const formatCountdown = (seconds) => {
            const s = Math.max(1, Math.ceil(seconds));
            const mins = Math.floor(s / 60);
            const rem = s % 60;
            return mins > 0 ? `${mins}:${String(rem).padStart(2, '0')}` : `${rem}s`;
        };

        // Update HUD pill if the followed flight changed (e.g. cycled or auto-transitioned to next bird)
        if (this._lastFollowedFlightRef !== pose.flight) {
            this._lastFollowedFlightRef = pose.flight;
            this._birdCamSnapNextFrame = true;
            this._lastEagleHudSec = -1;

            const iconEl = document.getElementById('bird-view-icon');
            const labelEl = document.getElementById('bird-view-species-label');
            const fullLabel = pose.isOrbitalEagleSoar && pose.remainingSeconds !== null
                ? `${pose.label} • ~300 ft Flyover (${formatCountdown(pose.remainingSeconds)})`
                : pose.type === 'flock'
                ? `${pose.label} (${pose.birdCount} ${pose.unit || 'Birds'})`
                : pose.label;
            if (iconEl) iconEl.textContent = pose.icon;
            if (labelEl) labelEl.textContent = fullLabel;
            this.announceToScreenReader(`Following Migratory Bird View: ${fullLabel}`);
        } else if (pose.isOrbitalEagleSoar && pose.remainingSeconds !== null) {
            const secLeft = Math.max(1, Math.ceil(pose.remainingSeconds));
            if (secLeft !== this._lastEagleHudSec) {
                this._lastEagleHudSec = secLeft;
                const labelEl = document.getElementById('bird-view-species-label');
                if (labelEl) {
                    const altFt = Math.round(pose.position.y / 0.3048 / 10) * 10;
                    const endingTag =
                        pose.endingId === 'welcome-drone-swarm'
                            ? ' • Drone Show'
                            : pose.endingId === 'welcome-miss-veedol'
                                ? ' • Miss Veedol'
                                : '';
                    const phaseTag = pose.position.y >= 95.0 ? `~${altFt} ft High Soar${endingTag}` : '~300 ft Flyover';
                    labelEl.textContent = `${pose.label} • ${phaseTag} (${formatCountdown(secLeft)})`;
                }
            }
        }

        const fwdX = Math.sin(pose.heading);
        const fwdZ = Math.cos(pose.heading);

        let desiredCamPos;
        let desiredTarget;

        if (pose.isOrbitalEagleSoar) {
            // Keep campus crisp from ~300 ft (91.4m) while keeping silver horizon mist beyond 340m
            if (this.scene && this.scene.fog && this.fogEnabled !== false) {
                this.scene.fog.near = 340;
            }

            // Behind-the-bird Bird's-Eye View chase camera that pitches smoothly toward the sky horizon as the eagle soars higher
            const climbBlend = THREE.MathUtils.smootherstep(pose.position.y, 93.0, 122.0);
            const trailDist = 11.5;
            const heightOffset = THREE.MathUtils.lerp(4.2, 2.8, climbBlend);
            const lookAheadDist = 26.0;
            const lookDownDrop = THREE.MathUtils.lerp(14.8, 3.2, climbBlend);

            const rightX = Math.cos(pose.heading);
            const rightZ = -Math.sin(pose.heading);
            const bankLateral = (pose.bank || 0) * 2.2;

            desiredCamPos = new THREE.Vector3(
                pose.position.x - fwdX * trailDist + rightX * bankLateral,
                pose.position.y + heightOffset,
                pose.position.z - fwdZ * trailDist + rightZ * bankLateral
            );

            desiredTarget = new THREE.Vector3(
                pose.position.x + fwdX * lookAheadDist,
                pose.position.y - lookDownDrop,
                pose.position.z + fwdZ * lookAheadDist
            );
        } else {
            if (this.scene && this.scene.fog && this.fogEnabled !== false) {
                this.scene.fog.near = 240;
            }

            // Standard chase camera behind & slightly above waterfowl flocks / lower-altitude birds
            const isFlock = pose.type === 'flock';
            const trailDist = isFlock ? 18.5 : 7.8;
            const heightOffset = isFlock ? 4.8 : 2.3;
            const lookAheadDist = isFlock ? 24.0 : 26.0;
            const lookDownDrop = isFlock ? 6.8 : 8.4;

            const rightX = Math.cos(pose.heading);
            const rightZ = -Math.sin(pose.heading);
            const bankLateral = (pose.bank || 0) * 2.2;

            desiredCamPos = new THREE.Vector3(
                pose.position.x - fwdX * trailDist + rightX * bankLateral,
                pose.position.y + heightOffset,
                pose.position.z - fwdZ * trailDist + rightZ * bankLateral
            );

            desiredTarget = new THREE.Vector3(
                pose.position.x + fwdX * lookAheadDist,
                pose.position.y - lookDownDrop,
                pose.position.z + fwdZ * lookAheadDist
            );
        }

        if (immediateSnap || this._birdCamSnapNextFrame || this.reducedMotion) {
            this._birdCamSnapNextFrame = false;
            this.camera.position.copy(desiredCamPos);
            this.controls.target.copy(desiredTarget);
        } else {
            const alpha = Math.min(1.0, dt * 7.5);
            this.camera.position.lerp(desiredCamPos, alpha);
            this.controls.target.lerp(desiredTarget, alpha);
        }
        if (pose.isOrbitalEagleSoar) {
            this.camera.lookAt(this.controls.target);
            this.camera.updateMatrixWorld();
        }
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

            if (this.kioskMode) {
                this._acquireKioskWakeLock();
                this._syncKioskClockUI();
            }
            this.lastFrameTime = 0;
            this._animate();
        });

        window.addEventListener('contextmenu', (e) => {
            if (this.kioskMode) {
                e.preventDefault();
            }
        });

        window.addEventListener('resize', () => {
            const hq = this.gpuAccelerated || this.hdrPopEnabled;
            const pr = this._getOptimalPixelRatio(hq);
            this.renderer.setPixelRatio(pr);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
            if (this.lumaFoundry) {
                this.lumaFoundry.setSize(
                    window.innerWidth,
                    window.innerHeight,
                    pr
                );
            }
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
            if (this.kioskMode) return;
            if (this.treePlanterActive && this.treePlanter) {
                const pt = raycastTerrainPoint(e.clientX, e.clientY);
                const treeReadout = document.getElementById('tree-planter-readout');
                if (!pt) {
                    this.treePlanter.updatePreviewPosition(0, 0, false);
                    return;
                }
                this.treePlanter.updatePreviewPosition(pt.x, pt.z, true);
                if (treeReadout) {
                    treeReadout.textContent = `${this.treePlanter.selectedType.toUpperCase()} • [x: ${pt.x.toFixed(2)}, z: ${pt.z.toFixed(2)}] (Click: Plant | Shift+Click: Remove)`;
                }
                return;
            }
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
            if (this.kioskMode) return;
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
            if (this.kioskMode || this.bulldozerActive) return;
            const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
            if (moveDist > 6) return;

            if (this.treePlanterActive && this.treePlanter && e.button === 0) {
                const pt = raycastTerrainPoint(e.clientX, e.clientY);
                if (pt) {
                    const treeReadout = document.getElementById('tree-planter-readout');
                    if (e.shiftKey) {
                        const rem = this.treePlanter.removeNearestTreeAt(pt.x, pt.z, 5.0);
                        if (treeReadout) {
                            treeReadout.textContent = rem
                                ? `Removed ${rem.type} at [${rem.x}, ${rem.z}]`
                                : `No planted tree within 5m of [${pt.x.toFixed(1)}, ${pt.z.toFixed(1)}]`;
                        }
                    } else {
                        const rec = this.treePlanter.plantTreeAt(pt.x, pt.z);
                        if (treeReadout) {
                            treeReadout.textContent = `Planted ${rec.type} at [x: ${rec.x}, z: ${rec.z}]`;
                        }
                    }
                    if (this._syncTreePlanterUI) this._syncTreePlanterUI();
                    this.renderer.shadowMap.needsUpdate = true;
                }
                return;
            }

            const rect = this.renderer.domElement.getBoundingClientRect();
            this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.pointer, this.camera);

            if (this.adaFoundry && this.adaFoundry.active && this.adaFoundry.markerMeshes.length > 0) {
                const adaHits = this.raycaster.intersectObjects(this.adaFoundry.markerMeshes, false);
                if (adaHits.length > 0 && adaHits[0].object.userData?.adaFeature) {
                    this.focusAdaFeature(adaHits[0].object.userData.adaFeature);
                    return;
                }
            }

            const hits = this.raycaster.intersectObjects(this.selectableMeshes, false);
            if (hits.length > 0) {
                const hitBldg = hits[0].object.userData.building;
                if (hitBldg) {
                    this.selectBuilding(hitBldg.id, true);
                }
            }
        });

        // Keyboard Accessibility & 3D Map Navigation (WCAG 2.1.1 Keyboard)
        window.addEventListener('keydown', (e) => {
            if (this.kioskMode) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.setKioskMode(false);
                }
                return;
            }
            const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'select' || tag === 'textarea') {
                if (e.key === 'Escape') {
                    e.target.blur();
                }
                return;
            }

            if (e.key === 'Escape') {
                if (this.followBirdViewActive) {
                    this.setMigratoryBirdView(false);
                    return;
                }
                if (this.adaPanelOpen && this.toggleAdaPanel) {
                    this.toggleAdaPanel(false);
                }
                if (this.treePlanterActive) {
                    const closeTreeBtn = document.getElementById('btn-close-tree-planter');
                    if (closeTreeBtn) closeTreeBtn.click();
                }
                this.clearSelection();
                this.announceToScreenReader('Closed active panels and cleared building selection');
                return;
            }

            if ((e.key === 'a' || e.key === 'A') && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                if (this.toggleAdaPanel) this.toggleAdaPanel();
                return;
            }

            if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                this.flyToPosition(new THREE.Vector3(115, 95, 145), new THREE.Vector3(8, 6, 18));
                this.announceToScreenReader('Camera reset to campus overview');
                return;
            }

            // Number keys 1-7 select Campus Buildings directly
            if (/^[1-7]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const sortedBldgs = [...CAMPUS_DATA.campusBuildings].sort(
                    (a, b) => (a.sortOrder || 99) - (b.sortOrder || 99)
                );
                const idx = parseInt(e.key, 10) - 1;
                if (sortedBldgs[idx]) {
                    e.preventDefault();
                    this.selectBuilding(sortedBldgs[idx].id, true);
                }
                return;
            }

            // Arrow keys pan (or Shift+Arrow keys orbit) and +/- zoom when not inside a scrollable button list
            const isMapOrBody = e.target === document.body || e.target === this.container;
            if (!isMapOrBody) return;

            const panStep = 6.0;
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                this.cameraAnim = null;
                const forward = new THREE.Vector3();
                this.camera.getWorldDirection(forward);
                forward.y = 0;
                if (forward.lengthSq() < 1e-4) forward.set(0, 0, -1);
                forward.normalize();
                const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

                if (e.shiftKey) {
                    const offset = this.camera.position.clone().sub(this.controls.target);
                    const sph = new THREE.Spherical().setFromVector3(offset);
                    if (e.key === 'ArrowLeft') sph.theta -= 0.08;
                    if (e.key === 'ArrowRight') sph.theta += 0.08;
                    if (e.key === 'ArrowUp') sph.phi = Math.max(0.15, sph.phi - 0.06);
                    if (e.key === 'ArrowDown') sph.phi = Math.min(Math.PI * 0.48, sph.phi + 0.06);
                    offset.setFromSpherical(sph);
                    this.camera.position.copy(this.controls.target).add(offset);
                } else {
                    const delta = new THREE.Vector3();
                    if (e.key === 'ArrowUp') delta.addScaledVector(forward, panStep);
                    if (e.key === 'ArrowDown') delta.addScaledVector(forward, -panStep);
                    if (e.key === 'ArrowRight') delta.addScaledVector(right, panStep);
                    if (e.key === 'ArrowLeft') delta.addScaledVector(right, -panStep);
                    this.camera.position.add(delta);
                    this.controls.target.add(delta);
                }
                this.controls.update();
            } else if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_') {
                e.preventDefault();
                this.cameraAnim = null;
                const zoomScale = (e.key === '+' || e.key === '=') ? 0.86 : 1.16;
                const offset = this.camera.position.clone().sub(this.controls.target);
                const newLen = THREE.MathUtils.clamp(offset.length() * zoomScale, this.controls.minDistance, this.controls.maxDistance);
                offset.setLength(newLen);
                this.camera.position.copy(this.controls.target).add(offset);
                this.controls.update();
            }
        });
    }

    _animate(timestamp = 0) {
        if (document.hidden || this.watchdog?.contextLost) {
            this.animationFrameId = null;
            return;
        }

        this.animationFrameId = requestAnimationFrame((nextTimestamp) => this._animate(nextTimestamp));
        const rawDeltaMs = this.lastFrameTime > 0 ? (timestamp - this.lastFrameTime) : 16.6;
        if (timestamp - this.lastFrameTime < FRAME_INTERVAL_MS) return;
        const dt = this.lastFrameTime > 0 ? Math.min(0.1, rawDeltaMs * 0.001) : 0.016;
        this.lastFrameTime = timestamp;

        const elapsed = this.clock.getElapsedTime();

        if (this.watchdog) {
            this.watchdog.tick(rawDeltaMs, elapsed);
            if (this._syncVramReadoutUI && (this.watchdog.frameCounter % 180 === 0)) {
                this._syncVramReadoutUI();
            }
        }

        if (this.geeseFoundry) {
            this.watchdog.runIsolated('geeseFoundry.update', () => {
                this.geeseFoundry.update(dt, this.reducedMotion);
            });
        }

        if (this.kioskMode) {
            this.watchdog.runIsolated('_updateKioskTour', () => {
                this._updateKioskTour(dt);
            });
        }

        if (this.followBirdViewActive) {
            this.watchdog.runIsolated('_updateMigratoryBirdViewCamera', () => {
                this._updateMigratoryBirdViewCamera(dt, false);
            });
        }

        if (this.backdropFoundry) {
            this.watchdog.runIsolated('backdropFoundry.update', () => {
                this.backdropFoundry.update(dt, this.reducedMotion);
            });
        }

        if (this.cameraAnim) {
            this.cameraAnim.progress += 0.045;
            const t = Math.min(1, this.cameraAnim.progress);
            const ease = 1 - Math.pow(1 - t, 3);
            this.camera.position.lerpVectors(this.cameraAnim.startPos, this.cameraAnim.endPos, ease);
            this.controls.target.lerpVectors(this.cameraAnim.startTarget, this.cameraAnim.endTarget, ease);
            if (t >= 1) this.cameraAnim = null;
        }

        if (this.selectionRing && this.selectionRing.visible) {
            const s = 1 + Math.sin(elapsed * 3.2) * 0.04;
            this.selectionRing.scale.set(s, s, 1);
        }

        if (this.floorCutawayFoundry) {
            this.floorCutawayFoundry.updateAnimation(elapsed, this.reducedMotion);
        }

        if (this.adaFoundry) {
            this.watchdog.runIsolated('adaFoundry.updateAnimation', () => {
                this.adaFoundry.updateAnimation(elapsed);
            });
        }

        if (!this.reducedMotion && this.animatedFlags && this.animatedFlags.length > 0) {
            this.watchdog.runIsolated('_updateAnimatedFlags', () => {
                this._updateAnimatedFlags(elapsed);
            });
        }

        if (!this.reducedMotion && this.treePlanterFoundry) {
            this.watchdog.runIsolated('treePlanterFoundry.updateWind', () => {
                this.treePlanterFoundry.updateWind(elapsed);
            });
        }

        this.watchdog.sanitizeCameraPose(this.camera, this.controls);
        this.controls.update();

        let renderedOk = false;
        if (this.lumaFoundry) {
            try {
                this.lumaFoundry.render(this.camera);
                renderedOk = true;
            } catch (lumaErr) {
                this.watchdog._logSubsystemError('lumaFoundry.render', lumaErr);
                this.lumaFoundry = null;
            }
        }
        if (!renderedOk && this.renderer) {
            this.renderer.render(this.scene, this.camera);
        }
        if (this.labelRenderer) {
            this.labelRenderer.render(this.scene, this.camera);
        }
    }

    _updateAnimatedFlags(elapsed) {
        for (let f = 0; f < this.animatedFlags.length; f++) {
            const entry = this.animatedFlags[f];
            const mesh = entry.mesh;
            if (!mesh || !mesh.visible) continue;

            const geo = mesh.geometry;
            const pos = geo?.attributes?.position;
            if (!pos) continue;

            const ud = mesh.userData;
            const flagW = ud.flagWidth || 2.35;
            const flagH = ud.flagHeight || 1.32;
            const hoistSide = ud.hoistSide || -1;
            const phase = ud.phaseOffset || 0;
            const droop = ud.droop !== undefined ? ud.droop : -0.05;
            const ampZ = ud.ampZ !== undefined ? ud.ampZ : 0.14;
            const ampY = ud.ampY !== undefined ? ud.ampY : 0.03;
            const baseY = entry.baseY;

            // Gentle gust modulation so wind speed and billow depth feel organic
            const gust = 0.85 + 0.25 * Math.sin(elapsed * 0.9 + phase * 0.7);
            const t1 = elapsed * 3.8 + phase;
            const t2 = elapsed * 6.9 + phase * 1.4;
            const t3 = elapsed * 10.5 + phase * 2.1;

            const count = pos.count;
            for (let i = 0; i < count; i++) {
                const x = pos.getX(i);
                const y0 = baseY ? baseY[i] : pos.getY(i);

                // Normalized distance from flagpole hoist (0 = pinned at pole, 1 = free fly edge)
                const rawU = hoistSide < 0
                    ? (x + flagW * 0.5) / flagW
                    : (flagW * 0.5 - x) / flagW;
                const u = Math.max(0, Math.min(1, rawU));
                const v = y0 / flagH; // -0.5 to +0.5

                // Smooth envelope pinned at the pole (u = 0) and growing toward the fly end
                const env = Math.pow(u, 1.15) * gust;

                // Primary traveling billow + secondary diagonal cross-wave + high-frequency edge flutter
                const primary = Math.sin(u * 6.2 - t1);
                const secondary = Math.sin(u * 12.5 - t2 + v * 2.4) * 0.36;
                const flutter = Math.cos(u * 21.0 - t3 - v * 3.6) * 0.14 * u;

                const z = (primary + secondary + flutter) * ampZ * env;
                const y = y0 + droop * Math.pow(u, 1.3) + Math.sin(u * 8.4 - t1 * 1.15 + v * 1.8) * ampY * env;

                pos.setY(i, y);
                pos.setZ(i, z);
            }

            pos.needsUpdate = true;
            if (!this.watchdog?.lowPowerThrottle || (this.watchdog.frameCounter % 2 === 0)) {
                geo.computeVertexNormals();
            }
        }
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
