import * as THREE from 'three';
import { createBuilding401Materials } from './Building401Materials.js';
import { buildBuilding401Structure } from './Building401Structure.js';
import { buildBuilding401GroundsAndSidewalks } from './Building401GroundsAndSidewalks.js';

/**
 * Photo-Realistic 5-Story Reconstruction of Building 401 (`regional-jail-east` — Law & Justice / Regional Justice Center, 401 Washington St)
 *
 * Modeled directly from reference photographs:
 * - f17b4121.jpg, f0a3a41e.jpg, 109ba9fd.jpg (Washington St running-bond reddish-brown brick sidewall,
 *   twin narrow security ribbon window bands, 5th-floor continuous dark clerestory & light-grey precast concrete fascia,
 *   NW cylindrical concrete stair/mechanical tower, and east precast connectors to Building 350)
 * - 7871898b.jpg, e4286399.jpg, 7099590c.jpg, 785542cb.jpg (Overhead views of Washington St sidewalk configuration:
 *   sallyport chain-link gate & brick cheek wall, dark basalt gravel bed with yellow-green utility box,
 *   tan-slatted chain-link fence compound with bright teal-green generator, white-curbed utility bay with olive transformer,
 *   red fire hydrant & silver switchboard, two-tone red-brick paver inner promenade & outer concrete sidewalk,
 *   3 concrete benches, directory sign, 6 black bollards, blue USPS mailbox, and twin-bar crosswalks)
 * - 358e2515.jpg, 4fd0b292.jpg, c71d2af9.jpg (Aerial views of bright white roof deck, East square penthouse with stairs,
 *   long central raised roof monitor, West D-shaped security grille recreation deck, 8-fan chiller unit,
 *   South sidewall arched detention window groups, 2-story SW addition wing, 1-story Square Corner Evidence Room
 *   with fenced roof deck & center exhaust fan, two separate East precast connector bridges, and South curved lawn)
 */
export function buildPhotoRealisticBuilding401(
    foundry,
    group,
    building,
    shape,
    wallMat,
    trimMat,
    terrainY = -0.53,
    getTerrainHeightFn = null
) {
    const arch = new THREE.Group();
    arch.name = 'Building401_PhotoRealistic';

    // Exact street-aligned orthogonal frame matching West Wing (413–415 Washington) & Building 350 (Courthouse):
    // +Z points outward toward Washington St, +X points East toward Douglas St & Building 350
    const cosT = 0.80425;
    const sinT = -0.59429;
    arch.rotation.y = Math.atan2(sinT, cosT);

    const cx = building.center[0]; // -4.22
    const cz = building.center[1]; // -38.74

    const yGrade = (lx, lz) => {
        if (!getTerrainHeightFn) return 0.0;
        const wx = cx + lx * cosT + lz * sinT;
        const wz = cz - lx * sinT + lz * cosT;
        return getTerrainHeightFn(wx, wz) - terrainY;
    };

    const mats = createBuilding401Materials(foundry);

    // 1. 5-Story Brick & Precast Structure, NW Cylindrical Tower, 2-Story SW Wing,
    //    1-Story Square Corner Evidence Room, Dual East Precast Connectors & White Rooftop Equipment
    buildBuilding401Structure(arch, building, mats, yGrade);

    // 2. Washington St Two-Tone Sidewalk Configuration, Utility Compounds, Twin-Bar Crosswalks & South Lawn Grounds
    buildBuilding401GroundsAndSidewalks(arch, mats, yGrade);

    group.add(arch);
}
