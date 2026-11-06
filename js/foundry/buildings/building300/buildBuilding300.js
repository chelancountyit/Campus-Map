import { createBuilding300Context } from './Building300Materials.js';
import { buildBuilding300MainWingAndPavilion } from './Building300MainWingAndPavilion.js';
import { buildBuilding300GroundsAndGrading } from './Building300GroundsAndGrading.js';
import { buildBuilding300DetentionAndGym } from './Building300DetentionAndGym.js';

export function buildPhotoRealisticBuilding300(foundry, group, building, shape, wallMat, trimMat) {
    const ctx = createBuilding300Context(foundry, group, building, shape);
    buildBuilding300MainWingAndPavilion(ctx);
    buildBuilding300GroundsAndGrading(ctx);
    buildBuilding300DetentionAndGym(ctx);
}