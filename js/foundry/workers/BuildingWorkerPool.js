import { optimizeBuildingGroup, reconstructBuildingGroupFromWorker } from './BuildingMeshOptimizer.js';
import { fetchBuildingGroupFromGlb } from '../glb/BuildingGlbCodec.js';

/**
 * BuildingWorkerPool — Pre-Baked .GLB Fast-Loader + 10-Worker Procedural Fallback Pool
 *
 * 1. Fast-Path (.GLB): When served over HTTP/HTTPS at default terrain (1.0x exaggeration,
 *    no bulldozer edits), loads pre-baked binary glTF 2.0 models (`./assets/models/buildings/<id>.glb`)
 *    directly into WebGL with zero procedural CPU or Worker startup overhead.
 * 2. Procedural Worker Fallback: Lazily spins up dedicated Web Worker threads whenever
 *    dynamic terrain re-grading (Bulldozer / Exaggeration) or live Wall Foundry edits occur,
 *    or if a `.glb` asset is not yet baked on disk.
 */
export class BuildingWorkerPool {
    constructor(wallFoundry, groundFoundry, workerScriptUrl = './js/building-worker-bundle.js?v=246') {
        this.wallFoundry = wallFoundry;
        this.groundFoundry = groundFoundry;
        this.workerScriptUrl = workerScriptUrl;
        this.glbBaseUrl = './assets/models/buildings';
        this.glbCacheVersion = '246';
        this.useGlbFastPath = true;
        this.glbLoadedCount = 0;

        this.workers = [];
        this.pendingJobs = new Map();
        this.nextJobId = 1;
        this.nextWorkerIdx = 0;
        this.workersSupported = this._detectWorkerSupport();
        this.initialized = false;
        this.warmWorkers = 0;

        // Only pre-warm Web Workers immediately if running on file:// where fetch(.glb) is unavailable
        if (!this._isHttpProtocol()) {
            this.prewarm(10);
        }
    }

    _isHttpProtocol() {
        return Boolean(
            typeof window !== 'undefined' &&
            window.location &&
            (window.location.protocol === 'http:' || window.location.protocol === 'https:')
        );
    }

    _canUseGlbFastPath(forceProcedural = false) {
        if (forceProcedural || !this.useGlbFastPath || !this._isHttpProtocol()) {
            return false;
        }
        const exag = this.groundFoundry?.exaggeration ?? 1.0;
        if (Math.abs(exag - 1.0) > 1e-4) {
            return false;
        }
        const bulldozedCount = this.groundFoundry?.bulldozedCells?.size || 0;
        if (bulldozedCount > 0) {
            return false;
        }
        return true;
    }

    _detectWorkerSupport() {
        try {
            if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
                return false;
            }
            // Test that OffscreenCanvas supports a 2D context in this browser
            const testCanvas = new OffscreenCanvas(4, 4);
            const ctx = testCanvas.getContext('2d');
            return Boolean(ctx && typeof testCanvas.transferToImageBitmap === 'function');
        } catch (_) {
            return false;
        }
    }

    get workerCount() {
        return this.workers.length;
    }

    get maxWorkers() {
        return this.workers.length || 10;
    }

    prewarm(targetCount = 10) {
        return this._ensurePool(targetCount);
    }

    _ensurePool(targetCount = 10) {
        if (!this.workersSupported) return false;
        if (this.initialized && this.workers.length >= targetCount) return true;

        const hwCores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 8;
        // Allocate at least 9-10 workers (8 campus buildings + 1 context buildings batch + 1 interactive worker)
        const poolSize = Math.max(9, Math.min(Math.max(targetCount, hwCores + 2), 12));

        try {
            while (this.workers.length < poolSize) {
                const idx = this.workers.length;
                const worker = new Worker(this.workerScriptUrl);
                worker.onmessage = (e) => this._handleWorkerMessage(e.data);
                worker.onerror = (err) => this._handleWorkerError(idx, err);
                worker.postMessage({ type: 'PREWARM', workerIndex: idx });
                this.workers.push(worker);
            }
            this.initialized = true;
            if (this.groundFoundry?.terrainData) {
                this.syncEnvironmentState();
            }
            return true;
        } catch (err) {
            console.warn('BuildingWorkerPool: Worker initialization unavailable, using main-thread optimizer fallback.', err);
            this.workersSupported = false;
            this.workers = [];
            return false;
        }
    }

    _getSerializableState() {
        return {
            terrainData: this.groundFoundry?.terrainData || null,
            exaggeration: this.groundFoundry?.exaggeration ?? 1.0,
            bulldozedEntries: this.groundFoundry?.bulldozedCells
                ? Array.from(this.groundFoundry.bulldozedCells.entries())
                : [],
            customConfig: this.wallFoundry?.customConfig || null
        };
    }

    /**
     * Broadcasts current terrain elevation grid, exaggeration, bulldozer cells, and wall foundry settings
     * to all active building workers.
     */
    syncEnvironmentState() {
        if (!this.initialized || this.workers.length === 0) return;
        const state = this._getSerializableState();
        this.workers.forEach((worker, idx) => {
            try {
                worker.postMessage({
                    type: 'INIT_STATE',
                    workerIndex: idx,
                    state
                });
            } catch (_) {}
        });
    }

    _handleWorkerMessage(msg) {
        if (!msg) return;
        if (msg.type === 'WORKER_WARM') {
            this.warmWorkers++;
            return;
        }
        if (!msg.jobId) return;
        const job = this.pendingJobs.get(msg.jobId);
        if (!job) return;
        this.pendingJobs.delete(msg.jobId);

        if (msg.type === 'CONTEXT_BUILT' && msg.payload) {
            try {
                const group = reconstructBuildingGroupFromWorker(
                    msg.payload,
                    null,
                    this.wallFoundry
                );
                group.name = 'ContextBuildingsGroup';
                job.resolve(group);
            } catch (err) {
                console.warn('Worker context reconstruction fallback:', err);
                job.resolve(this._buildContextFallbackOnMainThread(job.contextBuildings));
            }
            return;
        }

        if (msg.type === 'CONTEXT_ERROR') {
            job.resolve(this._buildContextFallbackOnMainThread(job.contextBuildings));
            return;
        }

        if (msg.type === 'BUILDING_BUILT' && msg.payload) {
            try {
                const group = reconstructBuildingGroupFromWorker(
                    msg.payload,
                    job.building,
                    this.wallFoundry
                );
                job.resolve(group);
            } catch (err) {
                console.warn(`Worker reconstruction fallback for ${job.building.id}:`, err);
                job.resolve(this._buildFallbackOnMainThread(job.building, job.terrainY));
            }
        } else {
            console.warn(`Worker error for ${job.building?.id}:`, msg.error);
            job.resolve(this._buildFallbackOnMainThread(job.building, job.terrainY));
        }
    }

    _handleWorkerError(workerIdx, err) {
        console.warn(`Building worker #${workerIdx} encountered an error, resolving pending jobs via fallback:`, err);
        for (const [jobId, job] of this.pendingJobs.entries()) {
            if (job.workerIdx === workerIdx) {
                this.pendingJobs.delete(jobId);
                if (job.isContextJob) {
                    job.resolve(this._buildContextFallbackOnMainThread(job.contextBuildings));
                } else {
                    job.resolve(this._buildFallbackOnMainThread(job.building, job.terrainY));
                }
            }
        }
    }

    _buildContextFallbackOnMainThread(contextBuildings) {
        return this.wallFoundry.buildContextBuildingsBatch(
            contextBuildings || [],
            (x, z) => this.groundFoundry.getTerrainHeight(x, z)
        );
    }

    _buildFallbackOnMainThread(building, terrainY) {
        const bldgGroup = this.wallFoundry.buildCampusBuildingMesh(
            building,
            terrainY,
            (x, z) => this.groundFoundry.getTerrainHeight(x, z)
        );
        if (!bldgGroup.userData?.workerStats) {
            optimizeBuildingGroup(bldgGroup, building);
        }
        return bldgGroup;
    }

    /**
     * Builds the Downtown Wenatchee Context Buildings batch (loads pre-baked `.glb` first, with Worker fallback).
     */
    async buildContextBuildingsAsync(contextBuildings, includeState = false) {
        if (this._canUseGlbFastPath(includeState)) {
            try {
                const glbUrl = `${this.glbBaseUrl}/context-buildings.glb?v=${this.glbCacheVersion}`;
                const group = await fetchBuildingGroupFromGlb(glbUrl, null, this.wallFoundry);
                group.name = 'ContextBuildingsGroup';
                this.glbLoadedCount++;
                return group;
            } catch (_) {
                // Fall through to Web Worker procedural build if .glb is not yet baked
            }
        }

        if (!this._ensurePool(10)) {
            return this._buildContextFallbackOnMainThread(contextBuildings);
        }

        return new Promise((resolve) => {
            const jobId = this.nextJobId++;
            // Prefer Worker #8 (dedicated context worker) so Workers #0..#7 stay 1:1 with the 8 campus buildings
            const workerIdx = (this.workers.length > 8 ? 8 : (this.nextWorkerIdx++ % this.workers.length));

            this.pendingJobs.set(jobId, {
                jobId,
                workerIdx,
                isContextJob: true,
                contextBuildings,
                resolve
            });

            const worker = this.workers[workerIdx];
            try {
                worker.postMessage({
                    type: 'BUILD_CONTEXT_BATCH',
                    jobId,
                    contextBuildings,
                    state: includeState ? this._getSerializableState() : undefined
                });
            } catch (_) {
                this.pendingJobs.delete(jobId);
                resolve(this._buildContextFallbackOnMainThread(contextBuildings));
            }
        });
    }

    /**
     * Builds a single campus building (loads pre-baked `.glb` first when eligible, with Worker fallback).
     */
    async buildBuildingAsync(building, terrainY, includeState = false, preferredWorkerIdx = null) {
        if (this._canUseGlbFastPath(includeState)) {
            try {
                const glbUrl = `${this.glbBaseUrl}/${building.id}.glb?v=${this.glbCacheVersion}`;
                const group = await fetchBuildingGroupFromGlb(glbUrl, building, this.wallFoundry);
                if (terrainY !== undefined && Number.isFinite(terrainY)) {
                    group.position.set(building.center[0], terrainY, building.center[1]);
                }
                this.glbLoadedCount++;
                return group;
            } catch (_) {
                // Fall through to Web Worker procedural build if .glb is not yet baked
            }
        }

        if (!this._ensurePool(10)) {
            return this._buildFallbackOnMainThread(building, terrainY);
        }

        return new Promise((resolve) => {
            const jobId = this.nextJobId++;
            const workerIdx = preferredWorkerIdx !== null
                ? (preferredWorkerIdx % this.workers.length)
                : (this.nextWorkerIdx++ % this.workers.length);

            this.pendingJobs.set(jobId, {
                jobId,
                workerIdx,
                building,
                terrainY,
                resolve
            });

            const worker = this.workers[workerIdx];
            try {
                worker.postMessage({
                    type: 'BUILD_BUILDING',
                    jobId,
                    building,
                    terrainY,
                    state: includeState ? this._getSerializableState() : undefined
                });
            } catch (_) {
                this.pendingJobs.delete(jobId);
                resolve(this._buildFallbackOnMainThread(building, terrainY));
            }
        });
    }

    /**
     * Loads all campus buildings concurrently (via pre-baked `.glb` binary fast-path when at default
     * terrain, or across 1:1 parallel Web Workers when dynamically re-grading).
     */
    async buildAllBuildingsParallel(buildings, getTerrainYFn, onBuildingReady) {
        const total = buildings.length;
        const useGlb = this._canUseGlbFastPath(false);

        if (!useGlb) {
            if (!this._ensurePool(total + 2)) {
                for (let i = 0; i < total; i++) {
                    const bldg = buildings[i];
                    const ty = getTerrainYFn(bldg);
                    const group = this._buildFallbackOnMainThread(bldg, ty);
                    if (onBuildingReady) {
                        await onBuildingReady(bldg, group, i + 1, total);
                    }
                }
                return;
            }
            // Sync latest terrain & foundry state once to all workers before parallel dispatch
            this.syncEnvironmentState();
        }

        // Heavy-First priority weights so the heaviest architectural complexes dispatch first
        const priorityWeights = {
            'courthouse-350': 100,
            'regional-jail-east': 95,
            'regional-jail-west': 90,
            'building-400': 80,
            'building-316': 70,
            'building-300': 60,
            'building-411-412': 50,
            'building-428': 40
        };
        const heavyFirstBuildings = [...buildings].sort(
            (a, b) => (priorityWeights[b.id] || 10) - (priorityWeights[a.id] || 10)
        );

        let completedCount = 0;
        const tasks = heavyFirstBuildings.map((bldg, idx) => {
            const ty = getTerrainYFn(bldg);
            return this.buildBuildingAsync(bldg, ty, false, idx).then(async (group) => {
                completedCount++;
                if (onBuildingReady) {
                    await onBuildingReady(bldg, group, completedCount, total);
                }
                return group;
            });
        });

        await Promise.all(tasks);
    }

    /**
     * Terminates idle procedural Web Workers when no background jobs are running so worker heaps
     * can be reclaimed immediately during low-memory soft purges or graceful restarts.
     */
    terminateIdleWorkers() {
        if (this.pendingJobs.size > 0 || this.workers.length === 0) return;
        for (let i = 0; i < this.workers.length; i++) {
            try {
                this.workers[i].terminate();
            } catch (_) {}
        }
        this.workers = [];
        this.initialized = false;
        this.warmWorkers = 0;
    }
}
