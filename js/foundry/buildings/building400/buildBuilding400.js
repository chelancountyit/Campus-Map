import { createBuilding400Context } from './Building400Materials.js';
import { buildBuilding400Structure } from './Building400Structure.js';
import { buildBuilding400GroundsAndSidewalks } from './Building400GroundsAndSidewalks.js';

export function buildPhotoRealisticBuilding400(foundry, group, building, shape, wallMat, trimMat, terrainY = 0, getTerrainHeightFn = null) {
    const ctx = createBuilding400Context(foundry, group, building, trimMat, terrainY, getTerrainHeightFn);
    buildBuilding400Structure(ctx);
    buildBuilding400GroundsAndSidewalks(ctx);
}