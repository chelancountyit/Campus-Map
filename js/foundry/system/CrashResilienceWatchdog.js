import * as THREE from 'three';

const RESTART_COOLDOWN_KEY = 'chelan_vram_restart_ts_v1';
const RESTORE_STATE_KEY = 'chelan_vram_restore_state_v1';
const RESTART_COOLDOWN_MS = 90_000; // Minimum 90s between auto-restarts (prevents reload loops)
const RESTORE_MAX_AGE_MS = 180_000; // Restore saved camera/UI state if reload occurred within 3 minutes

const TEXTURE_PROP_NAMES = [
    'map',
    'bumpMap',
    'normalMap',
    'roughnessMap',
    'metalnessMap',
    'aoMap',
    'emissiveMap',
    'alphaMap',
    'envMap',
    'lightMap'
];

/**
 * Disposes all non-shared geometries, materials, and textures inside a transient `THREE.Object3D` subtree.
 * Any geometry, material, or texture tagged with `userData.sharedAsset === true` is preserved.
 */
export function disposeTransientObject3D(root) {
    if (!root) return;
    root.traverse((obj) => {
        if (obj.geometry && !obj.geometry.userData?.sharedAsset) {
            try {
                obj.geometry.dispose();
            } catch (_) {}
        }
        if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (let i = 0; i < mats.length; i++) {
                const mat = mats[i];
                if (!mat || mat.userData?.sharedAsset) continue;
                for (let t = 0; t < TEXTURE_PROP_NAMES.length; t++) {
                    const tex = mat[TEXTURE_PROP_NAMES[t]];
                    if (tex && !tex.userData?.sharedAsset && typeof tex.dispose === 'function') {
                        try {
                            tex.dispose();
                        } catch (_) {}
                    }
                }
                try {
                    mat.dispose();
                } catch (_) {}
            }
        }
    });
}

/**
 * CrashResilienceWatchdog
 *
 * Provides 5 layers of runtime stability & GPU memory protection:
 * 1. Real-time WebGL VRAM & JS Heap estimation (`estimateGpuVramMB`).
 * 2. Two-stage VRAM governor: soft cache purge at 80% threshold, state-preserving auto-restart at 100%.
 * 3. WebGL context loss (`webglcontextlost`) & restore (`webglcontextrestored`) recovery + 8s fallback reload.
 * 4. Camera `NaN` / `Infinity` / runaway-bounds pose sanitizer.
 * 5. Adaptive frame-budget governor (steps down DPR & flag normal updates under sustained heavy load).
 */
export class CrashResilienceWatchdog {
    constructor(app, options = {}) {
        this.app = app;

        const urlLimit = this._parseUrlVramLimitMB();
        this.configuredVramLimitMB = urlLimit || options.vramLimitMB || 512;
        this.effectiveVramLimitMB = this.configuredVramLimitMB;
        this.softPurgeRatio = options.softPurgeRatio || 0.80;
        this.checkIntervalSec = options.checkIntervalSec || 5.0;

        this.baselineCalibrated = false;
        this.baselineVramMB = 0;
        this.lastCheckElapsed = 0;
        this.lastTelemetry = null;
        this.contextLost = false;
        this._contextLostTimer = null;
        this._restarting = false;

        // Frame-budget governor state
        this.emaFrameMs = 16.6;
        this.slowFrameStreak = 0;
        this.lowPowerThrottle = false;
        this.frameCounter = 0;

        // Last known finite camera pose for NaN/Infinity recovery
        this._lastSafeCamPos = new THREE.Vector3(115, 95, 145);
        this._lastSafeTarget = new THREE.Vector3(8, 6, 18);

        // Rate-limited subsystem error tracker
        this._errorCounts = new Map();

        this._installGlobalErrorGuards();
    }

    _parseUrlVramLimitMB() {
        try {
            if (typeof window === 'undefined' || !window.location?.search) return null;
            const params = new URLSearchParams(window.location.search);
            const raw = Number(params.get('vramLimitMB'));
            if (Number.isFinite(raw) && raw >= 128 && raw <= 4096) {
                return raw;
            }
        } catch (_) {}
        return null;
    }

    /**
     * Updates the VRAM auto-restart threshold in MB at runtime.
     */
    setVramLimitMB(limitMB) {
        const clamped = Math.max(128, Math.min(4096, Number(limitMB) || 512));
        this.configuredVramLimitMB = clamped;
        this.effectiveVramLimitMB = this.baselineCalibrated
            ? Math.max(clamped, Math.ceil(this.baselineVramMB + 96))
            : clamped;
        return this.effectiveVramLimitMB;
    }

    _installGlobalErrorGuards() {
        if (typeof window === 'undefined') return;

        window.addEventListener('error', (event) => {
            this._logSubsystemError('window.error', event?.error || event?.message);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this._logSubsystemError('unhandledrejection', event?.reason);
        });
    }

    _logSubsystemError(tag, err) {
        const count = (this._errorCounts.get(tag) || 0) + 1;
        this._errorCounts.set(tag, count);
        if (count <= 5) {
            console.warn(`[CrashResilienceWatchdog] Isolated error in ${tag} (#${count}):`, err);
        }
    }

    /**
     * Executes a non-critical per-frame callback safely so an exception never kills `_animate()`.
     */
    runIsolated(tag, fn) {
        try {
            fn();
            return true;
        } catch (err) {
            this._logSubsystemError(tag, err);
            return false;
        }
    }

    /**
     * Attaches `webglcontextlost` and `webglcontextrestored` handlers to the WebGL canvas.
     */
    bindRenderer(renderer) {
        if (!renderer || !renderer.domElement || renderer.domElement._watchdogBound) return;
        const canvas = renderer.domElement;
        canvas._watchdogBound = true;

        canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            this.contextLost = true;
            if (this.app.animationFrameId !== null) {
                cancelAnimationFrame(this.app.animationFrameId);
                this.app.animationFrameId = null;
            }
            this._showStatusBanner('⚠️ Display driver reset detected — recovering 3D view...');
            console.warn('[CrashResilienceWatchdog] WebGL context lost; awaiting restore...');

            clearTimeout(this._contextLostTimer);
            this._contextLostTimer = setTimeout(() => {
                if (this.contextLost) {
                    this.triggerGracefulRestart('webgl-context-unrecovered');
                }
            }, 8000);
        }, false);

        canvas.addEventListener('webglcontextrestored', () => {
            clearTimeout(this._contextLostTimer);
            this.contextLost = false;
            try {
                if (this.app.renderer) {
                    this.app.renderer.shadowMap.needsUpdate = true;
                }
                if (this.app.scene) {
                    this.app.scene.traverse((obj) => {
                        if (obj.isMesh && obj.material) {
                            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                            mats.forEach((m) => { if (m) m.needsUpdate = true; });
                        }
                    });
                }
            } catch (_) {}
            this._hideStatusBanner();
            this.app.lastFrameTime = 0;
            this.app._animate();
            console.info('[CrashResilienceWatchdog] WebGL context restored successfully.');
        }, false);
    }

    /**
     * Sanitizes `camera.position` and `controls.target` before `controls.update()` so a `NaN`,
     * `Infinity`, or coincident camera/target vector can never corrupt the projection matrix.
     */
    sanitizeCameraPose(camera, controls) {
        if (!camera || !controls) return;

        const p = camera.position;
        const t = controls.target;
        const posValid = Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z) &&
            Math.abs(p.x) < 4800 && Math.abs(p.y) < 4800 && Math.abs(p.z) < 4800;
        const tgtValid = Number.isFinite(t.x) && Number.isFinite(t.y) && Number.isFinite(t.z) &&
            Math.abs(t.x) < 4800 && Math.abs(t.y) < 4800 && Math.abs(t.z) < 4800;

        if (!posValid || !tgtValid) {
            camera.position.copy(this._lastSafeCamPos);
            controls.target.copy(this._lastSafeTarget);
            this.app.cameraAnim = null;
            this._logSubsystemError('camera-nan-recovery', 'Reset non-finite or out-of-bounds camera pose');
            return;
        }

        if (p.distanceToSquared(t) < 1e-4) {
            p.y += 1.0;
        }

        this._lastSafeCamPos.copy(p);
        this._lastSafeTarget.copy(t);
    }

    /**
     * Estimates active GPU VRAM usage (MB) across geometries, textures, shadow/post-FX render targets,
     * orphaned WebGL buffers reported by `renderer.info.memory`, and Chromium JS heap usage.
     */
    estimateGpuVramMB() {
        const renderer = this.app?.renderer;
        const scene = this.app?.scene;
        if (!renderer || !scene) return null;

        const seenGeometries = new Set();
        const seenTextures = new Set();
        let geometryBytes = 0;
        let textureBytes = 0;

        const addTextureBytes = (tex) => {
            if (!tex || seenTextures.has(tex.uuid)) return;
            seenTextures.add(tex.uuid);
            const img = tex.image || tex.source?.data;
            const w = Number(img?.width || img?.videoWidth || tex.width || 0);
            const h = Number(img?.height || img?.videoHeight || tex.height || 0);
            if (w > 0 && h > 0) {
                const mipFactor = tex.generateMipmaps !== false ? 1.333 : 1.0;
                textureBytes += w * h * 4 * mipFactor;
            } else {
                textureBytes += 256 * 1024;
            }
        };

        scene.traverse((obj) => {
            const geo = obj.geometry;
            if (geo && !seenGeometries.has(geo.uuid)) {
                seenGeometries.add(geo.uuid);
                const attrs = geo.attributes;
                if (attrs) {
                    const keys = Object.keys(attrs);
                    for (let i = 0; i < keys.length; i++) {
                        const arr = attrs[keys[i]]?.array;
                        if (arr && arr.byteLength) geometryBytes += arr.byteLength;
                    }
                }
                if (geo.index?.array?.byteLength) {
                    geometryBytes += geo.index.array.byteLength;
                }
            }

            if (obj.material) {
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                for (let m = 0; m < mats.length; m++) {
                    const mat = mats[m];
                    if (!mat) continue;
                    for (let k = 0; k < TEXTURE_PROP_NAMES.length; k++) {
                        const tex = mat[TEXTURE_PROP_NAMES[k]];
                        if (tex) addTextureBytes(tex);
                    }
                }
            }

            // Directional / Spot light shadow maps
            if (obj.isLight && obj.shadow?.map) {
                const sm = obj.shadow;
                const sw = sm.mapSize?.width || 2048;
                const sh = sm.mapSize?.height || 2048;
                textureBytes += sw * sh * 4;
            }
        });

        if (scene.environment) addTextureBytes(scene.environment);
        if (scene.background && scene.background.isTexture) addTextureBytes(scene.background);

        // Account for orphaned GPU buffers/textures tracked by WebGLRenderer but no longer in `scene`
        const gpuGeoCount = renderer.info?.memory?.geometries || 0;
        const gpuTexCount = renderer.info?.memory?.textures || 0;
        const orphanGeoCount = Math.max(0, gpuGeoCount - seenGeometries.size);
        const orphanTexCount = Math.max(0, gpuTexCount - seenTextures.size);

        const avgGeoBytes = seenGeometries.size > 0
            ? Math.max(16 * 1024, geometryBytes / seenGeometries.size)
            : 48 * 1024;
        const avgTexBytes = seenTextures.size > 0
            ? Math.max(256 * 1024, textureBytes / seenTextures.size)
            : 1024 * 1024;

        const orphanBytes = orphanGeoCount * avgGeoBytes + orphanTexCount * avgTexBytes;

        // Screen framebuffer + post-processing / Luma render target overhead
        const dpr = renderer.getPixelRatio ? renderer.getPixelRatio() : 1;
        const fbW = Math.max(1, (window.innerWidth || 1280) * dpr);
        const fbH = Math.max(1, (window.innerHeight || 720) * dpr);
        const framebufferBytes = fbW * fbH * 16; // Color + Depth/Stencil + MSAA / composer buffers

        const geometryMB = Number((geometryBytes / (1024 * 1024)).toFixed(2));
        const textureMB = Number((textureBytes / (1024 * 1024)).toFixed(2));
        const orphanMB = Number((orphanBytes / (1024 * 1024)).toFixed(2));
        const framebufferMB = Number((framebufferBytes / (1024 * 1024)).toFixed(2));
        const totalEstimatedVramMB = Number((geometryMB + textureMB + orphanMB + framebufferMB).toFixed(2));

        let jsHeapUsedMB = null;
        let jsHeapLimitMB = null;
        if (typeof performance !== 'undefined' && performance.memory) {
            jsHeapUsedMB = Number((performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1));
            jsHeapLimitMB = Number((performance.memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(1));
        }

        const usageRatio = Number((totalEstimatedVramMB / Math.max(1, this.effectiveVramLimitMB)).toFixed(3));

        const telemetry = {
            totalEstimatedVramMB,
            geometryMB,
            textureMB,
            orphanMB,
            framebufferMB,
            gpuGeometryCount: gpuGeoCount,
            gpuTextureCount: gpuTexCount,
            orphanGeoCount,
            orphanTexCount,
            jsHeapUsedMB,
            jsHeapLimitMB,
            vramLimitMB: this.effectiveVramLimitMB,
            usageRatio
        };
        this.lastTelemetry = telemetry;
        return telemetry;
    }

    /**
     * Records baseline GPU VRAM right after campus buildings & initial assets finish loading.
     */
    calibrateBaseline() {
        const snap = this.estimateGpuVramMB();
        if (!snap) return;
        this.baselineVramMB = snap.totalEstimatedVramMB;
        this.baselineCalibrated = true;
        // Ensure effective limit always leaves at least 140 MB of headroom above initial scene footprint
        // unless the caller explicitly passed `?vramLimitMB=...` in the URL
        if (!this._parseUrlVramLimitMB()) {
            this.effectiveVramLimitMB = Math.max(
                this.configuredVramLimitMB,
                Math.ceil(this.baselineVramMB + 140)
            );
        } else {
            this.effectiveVramLimitMB = this.configuredVramLimitMB;
        }
        snap.vramLimitMB = this.effectiveVramLimitMB;
        snap.usageRatio = Number((snap.totalEstimatedVramMB / this.effectiveVramLimitMB).toFixed(3));
    }

    /**
     * Reclaims transient GPU & render-list memory when VRAM crosses the 80% soft threshold.
     */
    performSoftVramPurge() {
        try {
            if (this.app.geeseFoundry && typeof this.app.geeseFoundry.purgeBackgroundFlights === 'function') {
                this.app.geeseFoundry.purgeBackgroundFlights();
            }
            if (this.app.renderer?.renderLists) {
                this.app.renderer.renderLists.dispose();
            }
            if (this.app.buildingWorkerPool && this.app.buildingWorkerPool.pendingJobs.size === 0) {
                // Terminate idle procedural Web Workers if any were spun up earlier
                this.app.buildingWorkerPool.terminateIdleWorkers?.();
            }
        } catch (_) {}
    }

    /**
     * Per-frame tick called from `ChelanCampus3DApp._animate()`.
     */
    tick(rawFrameDeltaMs, elapsedSec) {
        this.frameCounter++;

        // 1. Adaptive Frame-Budget Governor
        if (rawFrameDeltaMs > 0 && rawFrameDeltaMs < 500) {
            this.emaFrameMs = this.emaFrameMs * 0.92 + rawFrameDeltaMs * 0.08;
            if (this.emaFrameMs > 52.0) {
                this.slowFrameStreak++;
                if (this.slowFrameStreak > 90 && !this.lowPowerThrottle) {
                    this.lowPowerThrottle = true;
                    if (this.app.renderer && !this.app.kioskMode) {
                        this.app.renderer.setPixelRatio(1.0);
                        this.app.renderer.setSize(window.innerWidth, window.innerHeight);
                    }
                    console.info('[CrashResilienceWatchdog] Adaptive governor enabled under heavy load.');
                }
            } else if (this.emaFrameMs < 26.0) {
                this.slowFrameStreak = 0;
            }
        }

        // 2. Periodic GPU VRAM & Heap Audit (every 5 seconds)
        if (elapsedSec - this.lastCheckElapsed < this.checkIntervalSec) return;
        this.lastCheckElapsed = elapsedSec;

        const stats = this.estimateGpuVramMB();
        if (!stats) return;

        const heapCritical = stats.jsHeapUsedMB !== null &&
            stats.jsHeapLimitMB !== null &&
            stats.jsHeapLimitMB > 256 &&
            (stats.jsHeapUsedMB / stats.jsHeapLimitMB) >= 0.86;

        const runawayGeometryLeak = stats.gpuGeometryCount > 3600 || stats.gpuTextureCount > 480;

        if (stats.totalEstimatedVramMB >= this.effectiveVramLimitMB || heapCritical || runawayGeometryLeak) {
            // Try a soft purge first and re-measure immediately before restarting
            this.performSoftVramPurge();
            const postPurge = this.estimateGpuVramMB();
            const stillOverVram = postPurge && postPurge.totalEstimatedVramMB >= this.effectiveVramLimitMB;
            if (stillOverVram || heapCritical || runawayGeometryLeak) {
                const reason = stillOverVram
                    ? `vram-threshold (${postPurge.totalEstimatedVramMB} MB >= ${this.effectiveVramLimitMB} MB)`
                    : heapCritical
                    ? `js-heap-threshold (${stats.jsHeapUsedMB} MB / ${stats.jsHeapLimitMB} MB)`
                    : `gpu-handle-threshold (geos=${stats.gpuGeometryCount}, tex=${stats.gpuTextureCount})`;
                this.triggerGracefulRestart(reason);
            }
        } else if (stats.usageRatio >= this.softPurgeRatio) {
            this.performSoftVramPurge();
        }
    }

    /**
     * Saves camera & UI state to `sessionStorage`, releases WebGL hardware resources immediately,
     * and reloads the page cleanly (guarded by a 90-second cooldown so it can never reload-loop).
     */
    triggerGracefulRestart(reason = 'vram-threshold', { bypassCooldown = false } = {}) {
        if (this._restarting || typeof window === 'undefined') return false;

        try {
            const now = Date.now();
            const lastRestart = Number(sessionStorage.getItem(RESTART_COOLDOWN_KEY) || 0);
            if (!bypassCooldown && lastRestart > 0 && (now - lastRestart) < RESTART_COOLDOWN_MS) {
                console.warn(`[CrashResilienceWatchdog] Suppressed auto-restart (${reason}) due to 90s cooldown guard.`);
                return false;
            }
            sessionStorage.setItem(RESTART_COOLDOWN_KEY, String(now));
            this._saveSessionState();
        } catch (_) {}

        this._restarting = true;
        console.warn(`[CrashResilienceWatchdog] Triggering graceful state-preserving auto-restart: ${reason}`);
        this._showStatusBanner('♻️ Optimizing GPU memory — seamlessly refreshing campus view...');

        if (this.app.animationFrameId !== null) {
            cancelAnimationFrame(this.app.animationFrameId);
            this.app.animationFrameId = null;
        }

        // Proactively release WebGL context & GPU VRAM before reloading
        try {
            if (this.app.buildingWorkerPool?.terminateIdleWorkers) {
                this.app.buildingWorkerPool.terminateIdleWorkers();
            }
            if (this.app.renderer) {
                this.app.renderer.dispose();
                this.app.renderer.forceContextLoss?.();
            }
        } catch (_) {}

        setTimeout(() => {
            window.location.reload();
        }, 350);

        return true;
    }

    _saveSessionState() {
        const app = this.app;
        if (!app || !app.camera || !app.controls) return;

        // If currently following a migratory bird, preserve the user's pre-bird camera position!
        const camPos = (app.followBirdViewActive && app._savedPreBirdCamPos)
            ? app._savedPreBirdCamPos
            : app.camera.position;
        const camTgt = (app.followBirdViewActive && app._savedPreBirdTarget)
            ? app._savedPreBirdTarget
            : app.controls.target;

        const payload = {
            savedAt: Date.now(),
            camPos: [Number(camPos.x.toFixed(3)), Number(camPos.y.toFixed(3)), Number(camPos.z.toFixed(3))],
            camTgt: [Number(camTgt.x.toFixed(3)), Number(camTgt.y.toFixed(3)), Number(camTgt.z.toFixed(3))],
            selectedBuildingId: app.selectedBuilding?.id || null,
            activeFloorFilter: app.activeFloorFilter ?? null,
            currentHour: app.currentHour,
            realTimeSunEnabled: Boolean(app.realTimeSunEnabled),
            kioskMode: Boolean(app.kioskMode),
            kioskBeatIndex: app.kioskBeatIndex || 0,
            darkMapEnabled: Boolean(app.darkMapEnabled),
            topoActive: Boolean(app.topoActive),
            parcelsVisible: Boolean(app.parcelsVisible),
            fogEnabled: app.fogEnabled !== false
        };
        sessionStorage.setItem(RESTORE_STATE_KEY, JSON.stringify(payload));
    }

    /**
     * Restores camera position, target, selected building, floor filter, and environment toggles
     * if this page load was triggered by an automatic VRAM / context-loss restart.
     */
    restoreSavedSessionState() {
        try {
            const raw = sessionStorage.getItem(RESTORE_STATE_KEY);
            if (!raw) return false;
            sessionStorage.removeItem(RESTORE_STATE_KEY);

            const data = JSON.parse(raw);
            if (!data || !data.savedAt || (Date.now() - data.savedAt) > RESTORE_MAX_AGE_MS) {
                return false;
            }

            const app = this.app;
            if (Array.isArray(data.camPos) && data.camPos.length === 3 &&
                Array.isArray(data.camTgt) && data.camTgt.length === 3) {
                app.cameraAnim = null;
                app.camera.position.set(data.camPos[0], data.camPos[1], data.camPos[2]);
                app.controls.target.set(data.camTgt[0], data.camTgt[1], data.camTgt[2]);
                app.controls.update();
                this._lastSafeCamPos.copy(app.camera.position);
                this._lastSafeTarget.copy(app.controls.target);
            }

            if (data.kioskMode && typeof app.setKioskMode === 'function') {
                app.setKioskMode(true, {
                    fromUserGesture: false,
                    silent: true,
                    startBeatIndex: data.kioskBeatIndex || 0
                });
                console.info('[CrashResilienceWatchdog] Restored 65-inch TV Kiosk Showcase Mode after auto-restart.');
                return true;
            }

            if (data.realTimeSunEnabled && typeof app.setRealTimeSunEnabled === 'function') {
                app.setRealTimeSunEnabled(true, { silent: true });
            } else if (typeof data.currentHour === 'number' && Number.isFinite(data.currentHour)) {
                app.currentHour = data.currentHour;
                app._syncEnvironmentTheme?.();
            }

            if (data.selectedBuildingId && typeof app.selectBuilding === 'function') {
                app.selectBuilding(data.selectedBuildingId, false);
                if (data.activeFloorFilter !== null && typeof app.setBuildingFloorFilter === 'function') {
                    app.setBuildingFloorFilter(data.activeFloorFilter, false);
                }
            }

            console.info('[CrashResilienceWatchdog] Restored camera & campus session state after auto-restart.');
            return true;
        } catch (_) {
            return false;
        }
    }

    _showStatusBanner(text) {
        if (typeof document === 'undefined') return;
        let el = document.getElementById('watchdog-status-banner');
        if (!el) {
            el = document.createElement('div');
            el.id = 'watchdog-status-banner';
            el.setAttribute('role', 'status');
            el.setAttribute('aria-live', 'polite');
            el.style.cssText = [
                'position:fixed',
                'bottom:18px',
                'left:50%',
                'transform:translateX(-50%)',
                'z-index:9999',
                'background:rgba(15, 23, 42, 0.92)',
                'color:#f8fafc',
                'padding:8px 16px',
                'border-radius:999px',
                'font:600 13px/1.3 system-ui, -apple-system, sans-serif',
                'box-shadow:0 6px 20px rgba(0,0,0,0.35)',
                'border:1px solid rgba(148, 163, 184, 0.35)',
                'pointer-events:none'
            ].join(';');
            document.body.appendChild(el);
        }
        el.textContent = text;
        el.style.display = 'block';
    }

    _hideStatusBanner() {
        if (typeof document === 'undefined') return;
        const el = document.getElementById('watchdog-status-banner');
        if (el) el.style.display = 'none';
    }
}
