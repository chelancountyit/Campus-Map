import { createBuilding316Context } from './Building316Materials.js';
import { buildBuilding316Structure } from './Building316Structure.js';
import { buildBuilding316GroundsAndSidewalks } from './Building316GroundsAndSidewalks.js';

export function buildPhotoRealisticBuilding316(foundry, group, building, shape, wallMat, trimMat, terrainY = 0, getTerrainHeightFn = null) {
    const ctx = createBuilding316Context(foundry, group, building, shape, terrainY, getTerrainHeightFn);
    buildBuilding316Structure(ctx);
    buildBuilding316GroundsAndSidewalks(ctx);
}