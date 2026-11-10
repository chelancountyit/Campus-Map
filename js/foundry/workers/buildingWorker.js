/**
 * buildingWorker.js — Dedicated Per-Building 3D Construction & Mesh-Batching Web Worker
 *
 * Runs each Chelan County campus building's full procedural architecture, grading,
 * 2D OffscreenCanvas texture synthesis, and BufferGeometry merging on a background
 * CPU thread, then transfers zero-copy TypedArray buffers & ImageBitmaps to the main thread.
 */

// 1. Install OffscreenCanvas DOM shim for worker environment before foundry initialization
if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
        createElement(tag) {
            if (String(tag).toLowerCase() === 'canvas' && typeof OffscreenCanvas !== 'undefined') {
                return new OffscreenCanvas(256, 256);
            }
            return { style: {} };
        },
        getElementById() {
            return null;
        }
    };
}
if (typeof globalThis.window === 'undefined') {
    globalThis.window = {
        location: { protocol: 'file:' },
        devicePixelRatio: 1
    };
}
if (typeof globalThis.localStorage === 'undefined') {
    globalThis.localStorage = {
        getItem() { return null; },
        setItem() {}
    };
}

import { WallFoundry } from '../WallFoundry.js';
import { CampusGroundFoundry } from '../CampusGroundFoundry.js';
import { optimizeBuildingGroup, serializeBuildingGroupForWorker } from './BuildingMeshOptimizer.js';

let workerGroundFoundry = null;
let workerWallFoundry = null;

function ensureFoundries() {
    if (!workerGroundFoundry) {
        workerGroundFoundry = new CampusGroundFoundry(null);
    }
    if (!workerWallFoundry) {
        workerWallFoundry = new WallFoundry(null);
    }
}

function syncWorkerState(state = {}) {
    ensureFoundries();
    if (state.terrainData !== undefined) {
        workerGroundFoundry.terrainData = state.terrainData;
    }
    if (state.exaggeration !== undefined) {
        workerGroundFoundry.exaggeration = state.exaggeration;
    }
    if (Array.isArray(state.bulldozedEntries)) {
        workerGroundFoundry.bulldozedCells = new Map(state.bulldozedEntries);
    }
    if (state.customConfig) {
        workerWallFoundry.updateFoundrySettings(state.customConfig);
    }
}

// Eagerly pre-instantiate foundries as soon as the worker thread boots
ensureFoundries();

globalThis.onmessage = (event) => {
    const msg = event.data;
    if (!msg || !msg.type) return;

    if (msg.type === 'PREWARM') {
        ensureFoundries();
        globalThis.postMessage({ type: 'WORKER_WARM', workerIndex: msg.workerIndex });
        return;
    }

    if (msg.type === 'INIT_STATE') {
        syncWorkerState(msg.state);
        globalThis.postMessage({ type: 'STATE_READY', workerIndex: msg.workerIndex });
        return;
    }

    if (msg.type === 'BUILD_CONTEXT_BATCH') {
        const t0 = performance.now();
        try {
            if (msg.state) {
                syncWorkerState(msg.state);
            } else {
                ensureFoundries();
            }
            const contextGroup = workerWallFoundry.buildContextBuildingsBatch(
                msg.contextBuildings || [],
                (x, z) => workerGroundFoundry.getTerrainHeight(x, z)
            );
            const { payload, transferList } = serializeBuildingGroupForWorker(contextGroup);
            const elapsedMs = Math.round((performance.now() - t0) * 10) / 10;
            payload.workerStats = {
                rawMeshCount: (msg.contextBuildings || []).length,
                optimizedMeshCount: payload.meshes?.length || 2,
                workerTimeMs: elapsedMs
            };
            globalThis.postMessage(
                {
                    type: 'CONTEXT_BUILT',
                    jobId: msg.jobId,
                    payload
                },
                transferList
            );
        } catch (err) {
            globalThis.postMessage({
                type: 'CONTEXT_ERROR',
                jobId: msg.jobId,
                error: err && err.message ? err.message : String(err)
            });
        }
        return;
    }

    if (msg.type === 'BUILD_BUILDING') {
        const t0 = performance.now();
        try {
            if (msg.state) {
                syncWorkerState(msg.state);
            } else {
                ensureFoundries();
            }

            const building = msg.building;
            const splitRoadY = workerGroundFoundry.getBuildingRoadHeight(building.id);
            const terrainY = msg.terrainY !== undefined
                ? msg.terrainY
                : (splitRoadY !== null
                    ? splitRoadY
                    : workerGroundFoundry.getTerrainHeight(building.center[0], building.center[1]));

            const rawGroup = workerWallFoundry.buildCampusBuildingMesh(
                building,
                terrainY,
                (x, z) => workerGroundFoundry.getTerrainHeight(x, z)
            );

            // Optimize & merge static sub-meshes inside the worker if not already optimized
            if (!rawGroup.userData?.workerStats) {
                optimizeBuildingGroup(rawGroup, building);
            }

            const { payload, transferList } = serializeBuildingGroupForWorker(rawGroup);
            const elapsedMs = Math.round((performance.now() - t0) * 10) / 10;
            if (payload.workerStats) {
                payload.workerStats.workerTimeMs = elapsedMs;
            }

            globalThis.postMessage(
                {
                    type: 'BUILDING_BUILT',
                    jobId: msg.jobId,
                    buildingId: building.id,
                    payload
                },
                transferList
            );
        } catch (err) {
            globalThis.postMessage({
                type: 'BUILDING_ERROR',
                jobId: msg.jobId,
                buildingId: msg.building?.id,
                error: err && err.message ? err.message : String(err)
            });
        }
    }
};
