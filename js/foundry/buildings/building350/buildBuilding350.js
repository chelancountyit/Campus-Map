import * as THREE from 'three';
import { createBuilding350Materials } from './Building350Materials.js';
import { buildBuilding350Structure } from './Building350Structure.js';
import { buildBuilding350FrontFascia } from './Building350FrontFascia.js';
import { buildBuilding350Grounds } from './Building350Grounds.js';

/**
 * Photo-Realistic 5-Story Reconstruction of Building 350 (Chelan County Courthouse, 350 Orondo Ave)
 * - Floor 1 (Basement: y = -4.50m .. +0.38m): Smooth light-gray granite water-table plinth
 * - Floor 2 (Washington St Road Level: y = +0.38m .. +4.10m): Rusticated channeled light-gray granite ashlar base
 * - Floors 3, 4, 5 (Upper Courtroom & Clerk Levels: y = +4.65m .. +18.30m): Golden-ochre tapestry brick with
 *   6 giant cream terra-cotta paneled pilasters, Corinthian capitals, 3 two-story arched courtroom windows with
 *   verdigris copper spandrels & patinated iron balcony grilles, 5th-floor recessed brick frieze panels & outer windows,
 *   classical dentil + scrolled modillion bracket cornice, and carved "COUNTY BUILDING" entrance portal facing Orondo Ave (+Z).
 */
export function buildPhotoRealisticBuilding350(
    foundry,
    group,
    building,
    shape,
    wallMat,
    trimMat,
    terrainY = 0,
    getTerrainHeightFn = null
) {
    const arch = new THREE.Group();
    arch.name = 'Building350PhotoRealisticGroup';
    // Exact local orientation of Building 350:
    // +Z points outward from the Orondo Ave Front Facade (uZ = [0.80439, 0.59410], angle = 0.93465 rad)
    // +X points to the right when facing the Orondo Ave Front Facade (toward Courthouse Park & 3 flagpoles)
    // -X points to the left when facing the Orondo Ave Front Facade (toward Washington St)
    arch.rotation.y = Math.atan2(0.80439, 0.59410);

    const mats = createBuilding350Materials();

    // 1. 5-Story Core Massing, Washington St & Park Side Facades, and Bright White Elastomeric Roof
    buildBuilding350Structure(arch, building, mats);

    // 2. Orondo Ave (+Z) 5-Bay Classical Front Fascia & Front Pavilion Side Returns
    buildBuilding350FrontFascia(arch, mats);

    // 3. Orondo Ave Front Grounds, Monumental 2-Flight Stairs, Pedestal Lanterns, Flagpole Plaza,
    //    Horizontal-Ribbed Concrete Monument Wall, 3 Flagpoles, Fieldstone Wall, Sidewalks & Trees
    buildBuilding350Grounds(arch, mats, terrainY, getTerrainHeightFn);

    group.add(arch);
}

