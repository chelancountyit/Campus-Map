import { optimizeBuildingGroup, reconstructBuildingGroupFromWorker } from './BuildingMeshOptimizer.js';

/**
 * BuildingWorkerPool — Manages 10 Parallel Per-Building & Context Web Workers
 *
 * Pre-warms 10 dedicated Web Worker threads at application boot (T=0ms) so every
 * Chelan County campus building (350, 401, CCRJ-W, 400, 316, 300, 411/412, 428)
 * plus the Downtown Wenatchee Context Buildings batch run 100% concurrently across
 * dedicated background threads without cold-start delay.
 */
export class BuildingWorkerPool {
    constructor(wallFoundry, groundFoundry, workerScriptUrl = './js/building-worker-bundle.js?v=215') {
        this.wallFoundry = wallFoundry;
        this.groundFoundry = groundFoundry;
        this.workerScriptUrl = workerScriptUrl;
        this.workers = [];
        this.pendingJobs = new Map();
        this.nextJobId = 1;
        this.nextWorkerIdx = 0;
        this.workersSupported = this._detectWorkerSupport();
        this.initialized = false;
        this.warmWorkers = 0;

        // Pre-warm the worker pool immediately at T=0ms while the main thread sets up WebGL & terrain
        this.prewarm(10);
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
     * Builds the Downtown Wenatchee Context Buildings batch in a dedicated background Web Worker.
     */
    buildContextBuildingsAsync(contextBuildings, includeState = false) {
        if (!this._ensurePool(10)) {
            return Promise.resolve(this._buildContextFallbackOnMainThread(contextBuildings));
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
     * Builds a single campus building in a dedicated Web Worker (with automatic fallback).
     */
    buildBuildingAsync(building, terrainY, includeState = false, preferredWorkerIdx = null) {
        if (!this._ensurePool(10)) {
            return Promise.resolve(this._buildFallbackOnMainThread(building, terrainY));
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
     * Builds all campus buildings concurrently across dedicated 1:1 Web Workers using
     * Heavy-First (Longest Processing Time first) scheduling so the most detailed complexes
     * (350 Courthouse, 401 Law & Justice, CCRJ-W, 400 Admin) begin at T=0us.
     */
    async buildAllBuildingsParallel(buildings, getTerrainYFn, onBuildingReady) {
        const total = buildings.length;
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

        // Heavy-First priority weights so the heaviest procedural models dispatch first
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
}
