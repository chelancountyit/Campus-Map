import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

/**
 * bake-buildings-glb.mjs — Automated Headless Browser .GLB Baker
 *
 * Boots the Chelan County 3D Campus app in headless Chrome/Edge (`?bakeGlb=1`),
 * runs the full procedural architecture + 2D HTML5 Canvas texture synthesis +
 * BufferGeometry batching for all 8 campus buildings and the Downtown Wenatchee
 * context batch, and writes standard Khronos glTF 2.0 `.glb` binary files into
 * `./assets/models/buildings/*.glb`.
 */

const ROOT_DIR = process.cwd();
const OUT_DIR = path.join(ROOT_DIR, 'assets', 'models', 'buildings');
const IS_VERIFY = process.argv.includes('--verify');
const IS_FORCE = process.argv.includes('--force');
const ONLY_ARG = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).trim();
const ONLY_SET = ONLY_ARG
    ? new Set(ONLY_ARG.split(',').map((s) => s.trim()).filter(Boolean))
    : null;
fs.mkdirSync(OUT_DIR, { recursive: true });

const MIME_MAP = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.json': 'application/json; charset=utf-8',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json'
};

function findBrowserExecutable() {
    const candidates = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error('Could not find Chrome or Edge executable for headless .GLB baking.');
}

const manifestFilePath = path.join(OUT_DIR, 'manifest.json');
let existingManifestBuildings = {};
if (fs.existsSync(manifestFilePath)) {
    try {
        existingManifestBuildings = JSON.parse(fs.readFileSync(manifestFilePath, 'utf8'))?.buildings || {};
    } catch (_) {}
}

const bakedManifest = {
    version: 1,
    bakedAt: new Date().toISOString(),
    buildings: { ...existingManifestBuildings }
};

let browserProc = null;

const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, 'http://127.0.0.1');

    if (req.method === 'POST' && parsedUrl.pathname === '/__bake_glb__') {
        const rawName = parsedUrl.searchParams.get('name') || 'building';
        const safeName = rawName.replace(/[^a-zA-Z0-9_-]/g, '');
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
            const buf = Buffer.concat(chunks);
            const outPath = path.join(OUT_DIR, `${safeName}.glb`);
            const alreadyExists = fs.existsSync(outPath);
            if (alreadyExists && !IS_FORCE && (!ONLY_SET || !ONLY_SET.has(safeName))) {
                console.log(`  ⏭ Protected existing ${safeName}.glb (use --only=${safeName} or --force to overwrite)`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, skipped: true, file: `${safeName}.glb` }));
                return;
            }
            fs.writeFileSync(outPath, buf);
            const kb = (buf.byteLength / 1024).toFixed(1);
            bakedManifest.buildings[safeName] = {
                file: `${safeName}.glb`,
                bytes: buf.byteLength,
                kb: Number(kb)
            };
            console.log(`  ✓ Baked ${safeName}.glb (${kb} KB)`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, file: `${safeName}.glb`, bytes: buf.byteLength }));
        });
        return;
    }

    if (req.method === 'POST' && parsedUrl.pathname === '/__bake_done__') {
        const manifestPath = path.join(OUT_DIR, 'manifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify(bakedManifest, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));

        console.log(`\n🎉 Successfully baked ${Object.keys(bakedManifest.buildings).length} .GLB models to assets/models/buildings/`);
        setTimeout(() => {
            if (browserProc) {
                try {
                    browserProc.kill();
                } catch (_) {}
            }
            server.close(() => process.exit(0));
        }, 150);
        return;
    }

    if (req.method === 'POST' && parsedUrl.pathname === '/__bake_error__') {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
            console.error('\n❌ Browser Runtime Error:', Buffer.concat(chunks).toString('utf8'));
            res.writeHead(200);
            res.end('ok');
            setTimeout(() => {
                if (browserProc) {
                    try { browserProc.kill(); } catch (_) {}
                }
                server.close(() => process.exit(1));
            }, 100);
        });
        return;
    }

    if (req.method === 'POST' && parsedUrl.pathname === '/__verify_done__') {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
            const report = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            console.log('\n✅ Runtime .GLB Fast-Loader Verification Report:', report);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
            setTimeout(() => {
                if (browserProc) {
                    try {
                        browserProc.kill();
                    } catch (_) {}
                }
                server.close(() => process.exit(0));
            }, 150);
        });
        return;
    }

    let reqPath = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;
    const filePath = path.join(ROOT_DIR, reqPath);
    if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        if (reqPath === '/index.html' && !IS_VERIFY) {
            let html = data.toString('utf8');
            const errHook = `<script>
                window.addEventListener('error', (e) => {
                    fetch('/__bake_error__', { method: 'POST', body: String(e.error?.stack || e.message || e) });
                });
                window.addEventListener('unhandledrejection', (e) => {
                    fetch('/__bake_error__', { method: 'POST', body: String(e.reason?.stack || e.reason || e) });
                });
                const _ce = console.error.bind(console);
                console.error = (...args) => {
                    fetch('/__bake_error__', { method: 'POST', body: args.map((a) => (a && a.stack) ? a.stack : String(a)).join(' ') });
                    _ce(...args);
                };
            </script>`;
            html = html.replace('<head>', '<head>' + errHook);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
            return;
        }
        if (IS_VERIFY && reqPath === '/index.html') {
            let html = data.toString('utf8');
            const verifyScript = `<script>
                window.__verifyErrors = [];
                window.addEventListener('error', (e) => window.__verifyErrors.push(String(e.message || e)));
                window.addEventListener('unhandledrejection', (e) => window.__verifyErrors.push(String(e.reason || e)));
                const _origErr = console.error.bind(console);
                console.error = (...args) => {
                    window.__verifyErrors.push(args.map((a) => String(a)).join(' '));
                    _origErr(...args);
                };
                const _iv = setInterval(() => {
                    const app = window.chelanCampusApp;
                    if (app && app.campusBuildingMeshes && app.campusBuildingMeshes.size === 8 && app.contextGroup && app.floorCutawayFoundry && app.geeseFoundry && app._syncTreePlanterUI) {
                        clearInterval(_iv);
                        try {
                            const perBuildingMs = {};
                            for (const [id, entry] of app.campusBuildingMeshes.entries()) {
                                perBuildingMs[id] = entry.group?.userData?.workerStats?.workerBuildMs;
                            }

                            const fogHex = app.scene?.fog?.color?.getHexString?.() || null;
                            const outerUniformHex = app.groundFoundry?.outerTileFogColorUniform?.value?.getHexString?.() || null;
                            const carto = app.groundFoundry?.cartographyFoundry;

                            // Exercise Parcel Boundaries & Topographic Contours + WebGL render
                            app.groundFoundry.setParcelBoundariesVisible(true);
                            app.groundFoundry.contourLinesMesh.visible = true;
                            app.contextGroup.visible = true;
                            app.renderer.render(app.scene, app.camera);

                            // Exercise Interactive Floor Cutaway on Courthouse 350 (Floor 1 Assessor + Floor 2 Treasurer/Auditor) & Building 401
                            const hideOnCutawayPerBuilding = {};
                            for (const [id, entry] of app.campusBuildingMeshes.entries()) {
                                let taggedCount = 0;
                                entry.group.traverse((o) => {
                                    if (o.userData?.hideOnCutaway) taggedCount++;
                                });
                                hideOnCutawayPerBuilding[id] = taggedCount;
                            }

                            app.selectBuilding('courthouse-350', false);
                            app.setBuildingFloorFilter(3, false, 'auditor-elections-f3-orondo');
                            app.renderer.render(app.scene, app.camera);
                            const f3Zones = app.floorCutawayFoundry.rootGroup.children
                                .filter((c) => c.userData?.isDepartmentZone)
                                .map((c) => c.userData.zoneId);

                            app.setBuildingFloorFilter(4, false, 'district-court-judges-f4-middle');
                            app.renderer.render(app.scene, app.camera);
                            const f4Zones = app.floorCutawayFoundry.rootGroup.children
                                .filter((c) => c.userData?.isDepartmentZone)
                                .map((c) => c.userData.zoneId);

                            app.setBuildingFloorFilter(5, false, 'county-clerk-f5-full');
                            app.renderer.render(app.scene, app.camera);
                            const f5Zones = app.floorCutawayFoundry.rootGroup.children
                                .filter((c) => c.userData?.isDepartmentZone)
                                .map((c) => c.userData.zoneId);

                            app.setBuildingFloorFilter(2, false, 'assessor-f2-orondo');
                            app.renderer.render(app.scene, app.camera);
                            const f2Zones = app.floorCutawayFoundry.rootGroup.children
                                .filter((c) => c.userData?.isDepartmentZone)
                                .map((c) => c.userData.zoneId);
                            const activeDeptZoneAfterAssessorClick = app.activeDepartmentZone;

                            app.setBuildingFloorFilter(2, false, 'treasurer-f2-park-vestibule');
                            app.renderer.render(app.scene, app.camera);
                            const courthouseClippedCount = app.floorCutawayFoundry._clippedMeshes.length;
                            let cutawayRemainingTextureMaps = 0;
                            for (const rec of app.floorCutawayFoundry._clippedMeshes) {
                                const mList = Array.isArray(rec.mesh.material) ? rec.mesh.material : [rec.mesh.material];
                                for (const m of mList) {
                                    if (m && (m.map || m.bumpMap || m.normalMap || m.roughnessMap || m.emissiveMap)) {
                                        cutawayRemainingTextureMaps++;
                                    }
                                }
                            }
                            const courthouseHiddenWindowCoverCount = app.floorCutawayFoundry._hiddenObjects.length;
                            const hasFloorDividerLines = app.floorCutawayFoundry.rootGroup.children.some(
                                (c) =>
                                    c.name === 'CutawayStructuralBayGrid' ||
                                    c.name === 'CutawayCorridorAndCoreLines' ||
                                    c.name?.startsWith('CutawayDepartmentZoneBorder_')
                            );
                            let leakedVisibleTaggedOn350 = 0;
                            app.campusBuildingMeshes.get('courthouse-350').group.traverse((o) => {
                                if (o.userData?.hideOnCutaway && o.visible) leakedVisibleTaggedOn350++;
                            });
                            const courthouseFloorPills = document.querySelectorAll('#detail-floor-pills .floor-pill-btn').length;

                            app.selectBuilding('regional-jail-east', false);
                            const jailZonesByFloor = {};
                            for (const fl of [1, 2, 3, 4, 5]) {
                                app.setBuildingFloorFilter(fl, false);
                                app.renderer.render(app.scene, app.camera);
                                jailZonesByFloor[fl] = app.floorCutawayFoundry.rootGroup.children
                                    .filter((c) => c.userData?.isDepartmentZone)
                                    .map((c) => c.userData.zoneId);
                            }
                            app.setBuildingFloorFilter(1, false, 'sheriff-401-f1');
                            app.renderer.render(app.scene, app.camera);
                            const jailClippedCount = app.floorCutawayFoundry._clippedMeshes.length;
                            const jailHiddenWindowCoverCount = app.floorCutawayFoundry._hiddenObjects.length;

                            app.selectBuilding('regional-jail-west', false);
                            const westWingZonesByFloor = {};
                            for (const fl of [1, 2]) {
                                app.setBuildingFloorFilter(fl, false);
                                app.renderer.render(app.scene, app.camera);
                                westWingZonesByFloor[fl] = app.floorCutawayFoundry.rootGroup.children
                                    .filter((c) => c.userData?.isDepartmentZone)
                                    .map((c) => c.userData.zoneId);
                            }

                            app.selectBuilding('building-411-412', false);
                            app.setBuildingFloorFilter(1, false, 'rjc-411-front');
                            app.renderer.render(app.scene, app.camera);
                            const b411Zones = app.floorCutawayFoundry.rootGroup.children
                                .filter((c) => c.userData?.isDepartmentZone)
                                .map((c) => c.userData.zoneId);
                            const hasDividerLinesOn411 = app.floorCutawayFoundry.rootGroup.children.some(
                                (c) =>
                                    c.name === 'CutawayStructuralBayGrid' ||
                                    c.name === 'CutawayCorridorAndCoreLines' ||
                                    c.name?.startsWith('CutawayDepartmentZoneBorder_')
                            );
                            let remainingTexMapsOn411 = 0;
                            for (const rec of app.floorCutawayFoundry._clippedMeshes) {
                                const mList = Array.isArray(rec.mesh.material) ? rec.mesh.material : [rec.mesh.material];
                                for (const m of mList) {
                                    if (m && (m.map || m.bumpMap || m.normalMap || m.roughnessMap || m.emissiveMap)) {
                                        remainingTexMapsOn411++;
                                    }
                                }
                            }
                            if (
                                jailZonesByFloor[1]?.[0] !== 'sheriff-401-f1' ||
                                jailZonesByFloor[2]?.[0] !== 'rjc-401-f2' ||
                                jailZonesByFloor[3]?.[0] !== 'rjc-401-f3' ||
                                jailZonesByFloor[4]?.[0] !== 'rjc-401-f4' ||
                                jailZonesByFloor[5]?.[0] !== 'superior-court-401-f5' ||
                                westWingZonesByFloor[1]?.[0] !== 'rjc-west-f1' ||
                                westWingZonesByFloor[2]?.[0] !== 'rjc-west-f2' ||
                                b411Zones.length !== 2 ||
                                !b411Zones.includes('rjc-411-front') ||
                                !b411Zones.includes('natres-411-rear') ||
                                hasDividerLinesOn411 ||
                                remainingTexMapsOn411 !== 0
                            ) {
                                window.__verifyErrors.push(
                                    'RJC / Sheriff / Natural Resources cutaway verification failed: ' +
                                    JSON.stringify({ jailZonesByFloor, westWingZonesByFloor, b411Zones, hasDividerLinesOn411, remainingTexMapsOn411 })
                                );
                            }

                            // Verify Building 400 3-floor cutaway zones & concise directory labels
                            app.selectBuilding('building-400', false);
                            const b400DeptLabels = Array.from(document.querySelectorAll('#detail-departments .dept-row strong')).map((el) => el.textContent.trim());
                            const b400ZonesByFloor = {};
                            let remainingTexMapsOn400 = 0;
                            let hrAlleyLocalLz = 999;
                            let f2OrderedByLz = [];
                            for (const fl of [1, 2, 3]) {
                                app.setBuildingFloorFilter(fl, false);
                                app.renderer.render(app.scene, app.camera);
                                const zMeshes = app.floorCutawayFoundry.rootGroup.children.filter((c) => c.userData?.isDepartmentZone);
                                b400ZonesByFloor[fl] = zMeshes.map((c) => c.userData.zoneId);
                                for (const rec of app.floorCutawayFoundry._clippedMeshes) {
                                    const mList = Array.isArray(rec.mesh.material) ? rec.mesh.material : [rec.mesh.material];
                                    for (const m of mList) {
                                        if (m && (m.map || m.bumpMap || m.normalMap || m.roughnessMap || m.emissiveMap)) {
                                            remainingTexMapsOn400++;
                                        }
                                    }
                                }
                                if (fl === 2) {
                                    const labels = app.floorCutawayFoundry.rootGroup.children
                                        .filter((c) => c.name?.startsWith('CutawayDepartmentZoneLabel_'))
                                        .map((c) => ({
                                            name: c.name,
                                            lz: (c.position.x - (-36.91)) * 0.811612 + (c.position.z - 5.92) * 0.584197
                                        }))
                                        .sort((a, b) => a.lz - b.lz);
                                    f2OrderedByLz = labels.map((l) => l.name);
                                }
                                if (fl === 3) {
                                    const hrLabel = app.floorCutawayFoundry.rootGroup.children.find(
                                        (c) => c.name === 'CutawayDepartmentZoneLabel_hr-400-f3'
                                    );
                                    if (hrLabel) {
                                        hrAlleyLocalLz = Number(((hrLabel.position.x - (-36.91)) * 0.811612 + (hrLabel.position.z - 5.92) * 0.584197).toFixed(2));
                                    }
                                }
                            }
                            if (
                                b400ZonesByFloor[1]?.length !== 3 ||
                                !b400ZonesByFloor[1].includes('econ-400-f1') ||
                                !b400ZonesByFloor[1].includes('public-records-400-f1') ||
                                !b400ZonesByFloor[1].includes('fire-prev-400-f1') ||
                                b400ZonesByFloor[2]?.length !== 3 ||
                                f2OrderedByLz[0] !== 'CutawayDepartmentZoneLabel_commissioners-400-f2' ||
                                f2OrderedByLz[1] !== 'CutawayDepartmentZoneLabel_chambers-400-f2' ||
                                f2OrderedByLz[2] !== 'CutawayDepartmentZoneLabel_commissioners-400-f2' ||
                                b400ZonesByFloor[3]?.length !== 1 ||
                                b400ZonesByFloor[3][0] !== 'hr-400-f3' ||
                                hrAlleyLocalLz > -8.0 ||
                                remainingTexMapsOn400 !== 0 ||
                                b400DeptLabels.length !== 6
                            ) {
                                window.__verifyErrors.push(
                                    'Building 400 cutaway verification failed: ' +
                                    JSON.stringify({ b400ZonesByFloor, f2OrderedByLz, hrAlleyLocalLz, remainingTexMapsOn400, b400DeptLabels })
                                );
                            }

                            app.clearSelection();
                            app.renderer.render(app.scene, app.camera);
                            let unRestoredTaggedOn350 = 0;
                            app.campusBuildingMeshes.get('courthouse-350').group.traverse((o) => {
                                if (o.userData?.hideOnCutaway && !o.visible) unRestoredTaggedOn350++;
                            });

                            let ctxMeshCount = 0;
                            app.contextGroup.traverse((o) => { if (o.isMesh) ctxMeshCount++; });

                            // Exercise Bald Eagle 30s Campus Soar: auto-switch to Bird View + save & restore exact camera pose
                            app.setMigratoryBirdView(false, false, false);
                            app.cameraAnim = null;
                            app.camera.position.set(42.5, 78.25, -55.5);
                            app.controls.target.set(-12.25, 4.5, 15.75);

                            const firstProbeEagle = app.geeseFoundry.spawnBaldEagleSoar('welcome-drone-swarm');
                            const firstSpawnPos = firstProbeEagle.group.position.clone();
                            app.setMigratoryBirdView(false, false, false);
                            app.cameraAnim = null;
                            app.camera.position.set(42.5, 78.25, -55.5);
                            app.controls.target.set(-12.25, 4.5, 15.75);

                            const eagleFlight = app.geeseFoundry.spawnBaldEagleSoar('welcome-text');
                            const secondSpawnPos = eagleFlight.group.position.clone();
                            const randomSpawnDistDiffMeters = Math.round(firstSpawnPos.distanceTo(secondSpawnPos));
                            const autoEnteredBirdView = app.followBirdViewActive === true;
                            const eagleDurationSec = Number(eagleFlight.totalDist.toFixed(1));
                            const isHighResEagle = Boolean(eagleFlight.birds[0]?.isHighResEagle);
                            const horizonStartDistMeters = Math.round(
                                Math.hypot(eagleFlight.group.position.x - 8.0, eagleFlight.group.position.z - 16.0)
                            );
                            app.renderer.render(app.scene, app.camera);

                            // Advance to 30% (approaching campus) to measure slow approach speed
                            const approachSteps = Math.round((eagleFlight.totalDist * 0.30) / 0.1);
                            for (let step = 0; step < approachSteps; step++) {
                                app.geeseFoundry.update(0.1, false);
                            }
                            const posBeforeApproachSample = eagleFlight.group.position.clone();
                            app.geeseFoundry.update(0.1, false);
                            const approachSpeedMps = Number((eagleFlight.group.position.distanceTo(posBeforeApproachSample) / 0.1).toFixed(2));

                            // Advance to campus pass (~66% of duration) to verify ~300 ft flyover & regular chase framing
                            const midSteps = Math.round((eagleFlight.totalDist * 0.66) / 0.1) - approachSteps - 1;
                            for (let step = 0; step < midSteps; step++) {
                                app.geeseFoundry.update(0.1, false);
                            }
                            app._updateMigratoryBirdViewCamera(0.016, true);
                            app.camera.lookAt(app.controls.target);
                            app.camera.updateMatrixWorld(true);
                            app.renderer.render(app.scene, app.camera);
                            const midSoarAltitudeFeet = Math.round(eagleFlight.group.position.y / 0.3048);
                            const eagleWingspanMeters = Number((eagleFlight.birds[0].mesh.scale.x * 4.05).toFixed(2));
                            const camToEagleDist = app.camera.position.distanceTo(eagleFlight.group.position);
                            const frustumWidthAtEagle = 2.0 * camToEagleDist * Math.tan((app.camera.fov * Math.PI) / 360.0) * app.camera.aspect;
                            const eagleScreenWidthPercent = Number(((eagleWingspanMeters / frustumWidthAtEagle) * 100).toFixed(1));
                            const eagleNdc = eagleFlight.group.position.clone().project(app.camera);
                            const eagleNdcY = Number(eagleNdc.y.toFixed(2));
                            const eagleHeading = eagleFlight.group.rotation.y;
                            const dxRear = eagleFlight.group.position.x - app.camera.position.x;
                            const dzRear = eagleFlight.group.position.z - app.camera.position.z;
                            const dHoriz = Math.hypot(dxRear, dzRear) || 1;
                            const rearChaseAlignment = Number(((dxRear * Math.sin(eagleHeading) + dzRear * Math.cos(eagleHeading)) / dHoriz).toFixed(3));
                            const billboardRevealAtMid = Number((app.geeseFoundry.welcomeBillboard?.revealFactor ?? -1).toFixed(3));
                            const billboardVisibleAtMid = Boolean(app.geeseFoundry.welcomeBillboard?.group?.visible);

                            // Advance to 90% (after passing campus, soaring higher) to verify faster fly-away + Welcome Billboard fog-emergence
                            const totalDoneBeforeFast = approachSteps + 1 + midSteps;
                            const fastSteps = Math.round((eagleFlight.totalDist * 0.90) / 0.1) - totalDoneBeforeFast;
                            for (let step = 0; step < fastSteps; step++) {
                                app.geeseFoundry.update(0.1, false);
                            }
                            const posBeforeFastSample = eagleFlight.group.position.clone();
                            app.geeseFoundry.update(0.1, false);
                            const passSpeedMps = Number((eagleFlight.group.position.distanceTo(posBeforeFastSample) / 0.1).toFixed(2));
                            app._updateMigratoryBirdViewCamera(0.016, true);
                            app.camera.lookAt(app.controls.target);
                            app.camera.updateMatrixWorld(true);
                            app.renderer.render(app.scene, app.camera);
                            const highSoarAltitudeFeet = Math.round(eagleFlight.group.position.y / 0.3048);
                            const billboardRevealAtHighSoar = Number((app.geeseFoundry.welcomeBillboard?.revealFactor ?? 0).toFixed(3));
                            const billboardVisibleAtHighSoar = Boolean(app.geeseFoundry.welcomeBillboard?.group?.visible);
                            const billboardNdc = app.geeseFoundry.welcomeBillboard
                                ? app.geeseFoundry.welcomeBillboard.group.position.clone().project(app.camera)
                                : { x: 99, y: 99, z: 99 };
                            const billboardNdcX = Number(billboardNdc.x.toFixed(2));
                            const billboardNdcY = Number(billboardNdc.y.toFixed(2));

                            // Complete remaining steps past 100%
                            const finishSteps = Math.ceil(eagleFlight.totalDist / 0.1) - totalDoneBeforeFast - fastSteps - 1 + 4;
                            for (let step = 0; step < finishSteps; step++) {
                                app.geeseFoundry.update(0.1, false);
                            }
                            const billboardHiddenAfterEnd = Boolean(
                                app.geeseFoundry.welcomeBillboard &&
                                !app.geeseFoundry.welcomeBillboard.group.visible &&
                                app.geeseFoundry.welcomeBillboard.revealFactor === 0
                            );
                            const bannerMeshCount = app.geeseFoundry.welcomeBillboard?.group?.children?.length || 0;
                            const bannerMeshObj = app.geeseFoundry.welcomeBillboard?.group?.children?.[0];
                            const bannerVertCount = bannerMeshObj?.geometry?.attributes?.position?.count || 0;
                            const bannerCanvas = app.geeseFoundry.welcomeBillboard?._signTexture?.image;
                            let bannerIsPureTransparentText = false;
                            if (bannerCanvas && typeof bannerCanvas.getContext === 'function') {
                                const bCtx = bannerCanvas.getContext('2d');
                                const bgSample1 = bCtx.getImageData(120, 60, 1, 1).data[3];
                                const bgSample2 = bCtx.getImageData(1024, 585, 1, 1).data[3];
                                bannerIsPureTransparentText = bgSample1 === 0 && bgSample2 === 0;
                            }
                            if (
                                bannerMeshCount !== 1 ||
                                bannerVertCount !== 4 ||
                                !bannerIsPureTransparentText ||
                                billboardRevealAtMid !== 0 ||
                                billboardVisibleAtMid ||
                                !billboardVisibleAtHighSoar ||
                                billboardRevealAtHighSoar < 0.98 ||
                                highSoarAltitudeFeet < 360 ||
                                !billboardHiddenAfterEnd
                            ) {
                                window.__verifyErrors.push(
                                    'Welcome Text pop verification failed (meshes=' + bannerMeshCount + ', verts=' + bannerVertCount + ', pureText=' + bannerIsPureTransparentText + ', mid=' + billboardRevealAtMid + ', high=' + billboardRevealAtHighSoar + ' @ ' + highSoarAltitudeFeet + 'ft, hiddenEnd=' + billboardHiddenAfterEnd + ')'
                                );
                            }
                            const autoExitedOnComplete = app.followBirdViewActive === false;
                            const restoredCamMatch = Boolean(
                                app.cameraAnim &&
                                Math.hypot(
                                    app.cameraAnim.endPos.x - 42.5,
                                    app.cameraAnim.endPos.y - 78.25,
                                    app.cameraAnim.endPos.z - (-55.5)
                                ) < 0.01 &&
                                Math.hypot(
                                    app.cameraAnim.endTarget.x - (-12.25),
                                    app.cameraAnim.endTarget.y - 4.5,
                                    app.cameraAnim.endTarget.z - 15.75
                                ) < 0.01
                            );

                            // Exercise Alternative Eagle Ending #1: Drone Swarm ("WELCOME TO CHELAN COUNTY")
                            const eagleEndingsCount = app.geeseFoundry.eagleEndings?.length || 0;
                            const droneFlight = app.geeseFoundry.spawnBaldEagleSoar('welcome-drone-swarm');
                            const droneStepDt = 0.25;
                            const droneMidSteps = Math.round((droneFlight.totalDist * 0.66) / droneStepDt);
                            for (let step = 0; step < droneMidSteps; step++) {
                                app.geeseFoundry.update(droneStepDt, false);
                            }
                            const droneVisibleAtMid = Boolean(app.geeseFoundry.welcomeDroneSwarm?.group?.visible);
                            const droneHighSteps = Math.round((droneFlight.totalDist * 0.90) / droneStepDt) - droneMidSteps;
                            for (let step = 0; step < droneHighSteps; step++) {
                                app.geeseFoundry.update(droneStepDt, false);
                            }
                            app._updateMigratoryBirdViewCamera(0.016, true);
                            app.camera.lookAt(app.controls.target);
                            app.camera.updateMatrixWorld(true);
                            app.renderer.render(app.scene, app.camera);
                            const droneSwarmCount = app.geeseFoundry.welcomeDroneSwarm?.droneCount || 0;
                            const droneVisibleAtHighSoar = Boolean(app.geeseFoundry.welcomeDroneSwarm?.group?.visible);
                            const droneRevealAtHighSoar = Number((app.geeseFoundry.welcomeDroneSwarm?.revealFactor ?? 0).toFixed(3));
                            const droneSeparationAtHighSoar = Number((app.geeseFoundry.welcomeDroneSwarm?.separationFactor ?? 0).toFixed(3));
                            const droneFinishSteps = Math.ceil(droneFlight.totalDist / droneStepDt) - droneMidSteps - droneHighSteps + 4;
                            for (let step = 0; step < droneFinishSteps; step++) {
                                app.geeseFoundry.update(droneStepDt, false);
                            }
                            const droneHiddenAfterEnd = Boolean(
                                app.geeseFoundry.welcomeDroneSwarm &&
                                !app.geeseFoundry.welcomeDroneSwarm.group.visible &&
                                app.geeseFoundry.welcomeDroneSwarm.revealFactor === 0
                            );
                            if (
                                eagleEndingsCount < 3 ||
                                droneSwarmCount < 300 ||
                                droneVisibleAtMid ||
                                !droneVisibleAtHighSoar ||
                                droneRevealAtHighSoar < 0.98 ||
                                droneSeparationAtHighSoar < 0.08 ||
                                droneSeparationAtHighSoar > 0.55 ||
                                !droneHiddenAfterEnd
                            ) {
                                window.__verifyErrors.push(
                                    'Alternative Drone Swarm Eagle Ending verification failed (endings=' + eagleEndingsCount + ', drones=' + droneSwarmCount + ', midVis=' + droneVisibleAtMid + ', highVis=' + droneVisibleAtHighSoar + ', reveal=' + droneRevealAtHighSoar + ', sep=' + droneSeparationAtHighSoar + ', hiddenEnd=' + droneHiddenAfterEnd + ')'
                                );
                            }

                            // Exercise Alternative Eagle Ending #2: Miss Veedol pulling "WELCOME TO CHELAN COUNTY" tow banner
                            const veedolFlight = app.geeseFoundry.spawnBaldEagleSoar('welcome-miss-veedol');
                            const veedolMidSteps = Math.round((veedolFlight.totalDist * 0.66) / droneStepDt);
                            for (let step = 0; step < veedolMidSteps; step++) {
                                app.geeseFoundry.update(droneStepDt, false);
                            }
                            const veedolVisibleAtMid = Boolean(app.geeseFoundry.welcomeMissVeedol?.group?.visible);
                            const veedolHighSteps = Math.round((veedolFlight.totalDist * 0.90) / droneStepDt) - veedolMidSteps;
                            for (let step = 0; step < veedolHighSteps; step++) {
                                app.geeseFoundry.update(droneStepDt, false);
                            }
                            app._updateMigratoryBirdViewCamera(0.016, true);
                            app.camera.lookAt(app.controls.target);
                            app.camera.updateMatrixWorld(true);
                            app.renderer.render(app.scene, app.camera);
                            const veedolVisibleAtHighSoar = Boolean(app.geeseFoundry.welcomeMissVeedol?.group?.visible);
                            const veedolRevealAtHighSoar = Number((app.geeseFoundry.welcomeMissVeedol?.revealFactor ?? 0).toFixed(3));
                            const veedolFinishSteps = Math.ceil(veedolFlight.totalDist / droneStepDt) - veedolMidSteps - veedolHighSteps + 4;
                            for (let step = 0; step < veedolFinishSteps; step++) {
                                app.geeseFoundry.update(droneStepDt, false);
                            }
                            const veedolHiddenAfterEnd = Boolean(
                                app.geeseFoundry.welcomeMissVeedol &&
                                !app.geeseFoundry.welcomeMissVeedol.group.visible &&
                                app.geeseFoundry.welcomeMissVeedol.revealFactor === 0
                            );
                            if (
                                veedolVisibleAtMid ||
                                !veedolVisibleAtHighSoar ||
                                veedolRevealAtHighSoar < 0.98 ||
                                !veedolHiddenAfterEnd
                            ) {
                                window.__verifyErrors.push(
                                    'Alternative Miss Veedol Eagle Ending verification failed (midVis=' + veedolVisibleAtMid + ', highVis=' + veedolVisibleAtHighSoar + ', reveal=' + veedolRevealAtHighSoar + ', hiddenEnd=' + veedolHiddenAfterEnd + ')'
                                );
                            }

                            // Exercise CrashResilienceWatchdog: GPU buffer leak check (10 spawned/disposed flocks), NaN camera guard & VRAM session restore
                            app.geeseFoundry.purgeBackgroundFlights();
                            app.renderer.render(app.scene, app.camera);
                            const geosBefore = app.renderer.info.memory.geometries;
                            for (let b = 0; b < 10; b++) {
                                const f = app.geeseFoundry.spawnGeeseVFlock(false);
                                app.renderer.render(app.scene, app.camera);
                                app.geeseFoundry._disposeFlightGroup(f.group);
                                const idx = app.geeseFoundry.activeFlights.indexOf(f);
                                if (idx !== -1) app.geeseFoundry.activeFlights.splice(idx, 1);
                            }
                            const geosAfter = app.renderer.info.memory.geometries;
                            const leakedGeoBuffersAfter10Flocks = geosAfter - geosBefore;

                            // Test NaN camera pose sanitizer
                            app.cameraAnim = null;
                            app.camera.position.set(88.0, 64.0, 92.0);
                            app.controls.target.set(6.0, 5.0, 14.0);
                            app.watchdog.sanitizeCameraPose(app.camera, app.controls);
                            app.camera.position.set(NaN, Infinity, -Infinity);
                            app.watchdog.sanitizeCameraPose(app.camera, app.controls);
                            const nanCameraRecovered = Number.isFinite(app.camera.position.x) && Math.abs(app.camera.position.x - 88.0) < 0.01;

                            // Test VRAM telemetry & auto-restart session state save/restore
                            app.watchdog.calibrateBaseline();
                            const vramStats = app.watchdog.estimateGpuVramMB();
                            app.watchdog._saveSessionState();
                            app.camera.position.set(0, 200, 0);
                            const sessionRestoredOk = app.watchdog.restoreSavedSessionState() && Math.abs(app.camera.position.x - 88.0) < 0.01;

                            // Verify all 22 Tree Planter species (including Ash + 5 campus reference species)
                            const speciesBtns = Array.from(document.querySelectorAll('#tree-species-grid .tree-species-btn'));
                            const speciesIdsInDom = speciesBtns.map((b) => b.dataset.type);
                            const newSpeciesIds = ['ash', 'columnar_poplar', 'street_sapling', 'arborvitae', 'arborvitae_clump', 'cone_bush'];
                            const newSpeciesMetrics = {};
                            const savedPlantedSnapshot = app.treePlanter.plantedTrees.slice();
                            for (const spId of speciesIdsInDom) {
                                app.treePlanter.setPreviewSpec(spId, 1.0);
                                app.treePlanter.updatePreviewPosition(12.0, 14.0, true);
                                const rec = app.treePlanter.plantTreeAt(10.0, 10.0, spId, 1.0);
                                const mesh = app.treePlanter.treeMeshes.get(rec.id);
                                if (newSpeciesIds.includes(spId) && mesh) {
                                    let minY = Infinity, maxY = -Infinity, maxXZ = 0, meshChildCount = 0;
                                    mesh.traverse((c) => {
                                        if (c.isMesh && c.geometry) {
                                            meshChildCount++;
                                            c.geometry.computeBoundingBox();
                                            const bb = c.geometry.boundingBox;
                                            if (bb) {
                                                if (bb.min.y < minY) minY = bb.min.y;
                                                if (bb.max.y > maxY) maxY = bb.max.y;
                                                const r = Math.max(Math.abs(bb.min.x), Math.abs(bb.max.x), Math.abs(bb.min.z), Math.abs(bb.max.z));
                                                if (r > maxXZ) maxXZ = r;
                                            }
                                        }
                                    });
                                    newSpeciesMetrics[spId] = {
                                        meshChildCount,
                                        heightMeters: Number((maxY - Math.min(0, minY)).toFixed(2)),
                                        widthMeters: Number((maxXZ * 2).toFixed(2))
                                    };
                                }
                            }
                            app.renderer.render(app.scene, app.camera);
                            app.treePlanter.updatePreviewPosition(0, 0, false);
                            app.treePlanter.setTreesFromList(savedPlantedSnapshot, true);

                            // Exercise Real-Time Sun Lighting toggle, NOAA solar math & manual slider override
                            const rtCheckEl = document.getElementById('toggle-realtime-sun');
                            const rtTopBtnEl = document.getElementById('btn-realtime-sun-top');
                            const timeSliderEl = document.getElementById('time-slider');
                            const timeDisplayEl = document.getElementById('time-display');
                            app.setRealTimeSunEnabled(true);
                            app.renderer.render(app.scene, app.camera);
                            const rtEnabledOk = Boolean(
                                app.realTimeSunEnabled &&
                                rtCheckEl && rtCheckEl.checked &&
                                rtTopBtnEl && rtTopBtnEl.getAttribute('aria-pressed') === 'true' &&
                                Number.isFinite(app.sunLight.position.x) &&
                                Number.isFinite(app.sunLight.position.y) &&
                                Number.isFinite(app.sunLight.position.z) &&
                                timeDisplayEl && timeDisplayEl.textContent.length > 0
                            );
                            // Verify summer noon vs winter midnight NOAA solar elevation in Wenatchee
                            const summerNoonSolar = app._computeWenatcheeSolarState(new Date('2026-06-21T20:00:00Z'));
                            const winterMidnightSolar = app._computeWenatcheeSolarState(new Date('2026-12-21T08:00:00Z'));
                            const solarMathOk = Boolean(
                                summerNoonSolar.elevationDeg > 60 &&
                                summerNoonSolar.compassAzimuthDeg > 150 &&
                                summerNoonSolar.compassAzimuthDeg < 210 &&
                                winterMidnightSolar.elevationDeg < -50
                            );
                            // Manual slider input should cleanly turn off real-time sun lock
                            if (timeSliderEl) {
                                timeSliderEl.value = '14.5';
                                timeSliderEl.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                            const manualOverrideDisabledRt = Boolean(
                                !app.realTimeSunEnabled &&
                                rtCheckEl && !rtCheckEl.checked &&
                                rtTopBtnEl && rtTopBtnEl.getAttribute('aria-pressed') === 'false'
                            );
                            if (!rtEnabledOk || !solarMathOk || !manualOverrideDisabledRt) {
                                window.__verifyErrors.push(
                                    'Real-time sun lighting verification failed: ' +
                                    JSON.stringify({ rtEnabledOk, solarMathOk, manualOverrideDisabledRt, summerNoonSolar, winterMidnightSolar })
                                );
                            }

                            // Exercise 65-inch Hands-Free TV Kiosk Mode (playlist beats, HUD, cutaway, eagle soar & exit)
                            app.setKioskMode(true, { silent: true });
                            const kioskHeaderEl = document.getElementById('tv-kiosk-header');
                            const kioskStageBarEl = document.getElementById('tv-kiosk-stage-bar');
                            const kioskTimeEl = document.getElementById('tv-kiosk-time');
                            const kioskPlaylistLen = Array.isArray(app.kioskPlaylist) ? app.kioskPlaylist.length : 0;
                            const kioskHasAllBeatTypes = Boolean(
                                app.kioskPlaylist &&
                                app.kioskPlaylist.some((b) => b.type === 'campus-orbit') &&
                                app.kioskPlaylist.some((b) => b.type === 'building-overview') &&
                                app.kioskPlaylist.some((b) => b.type === 'building-floor') &&
                                app.kioskPlaylist.some((b) => b.type === 'eagle-flyover')
                            );
                            const kioskEnteredOk = Boolean(
                                app.kioskMode &&
                                app.gpuAccelerated === true &&
                                app._getOptimalPixelRatio(true) >= 1.0 &&
                                document.body.classList.contains('tv-kiosk-mode') &&
                                app.controls && app.controls.enabled === false &&
                                app.realTimeSunEnabled === true &&
                                kioskHeaderEl && !kioskHeaderEl.classList.contains('hidden') &&
                                kioskStageBarEl && !kioskStageBarEl.classList.contains('hidden') &&
                                kioskTimeEl && kioskTimeEl.textContent.length > 0 &&
                                kioskPlaylistLen >= 20 &&
                                kioskHasAllBeatTypes
                            );

                            // Step through building-overview, building-floor cutaway, and eagle-flyover beats
                            const detailCardEl = document.getElementById('building-detail-card');
                            const kioskStageTitleEl = document.getElementById('tv-kiosk-stage-title');
                            const overviewIdx = app.kioskPlaylist.findIndex((b) => b.type === 'building-overview');
                            let kioskMinimalHudOk = false;
                            if (overviewIdx >= 0) {
                                app._enterKioskBeat(overviewIdx);
                                app._updateKioskTour(1.2);
                                app.renderer.render(app.scene, app.camera);
                                kioskMinimalHudOk = Boolean(
                                    detailCardEl &&
                                    window.getComputedStyle(detailCardEl).display === 'none' &&
                                    kioskStageTitleEl &&
                                    kioskStageTitleEl.textContent.trim().length > 0 &&
                                    app.campusBuildingMeshes.size === 8 &&
                                    Array.from(app.campusBuildingMeshes.values()).every(
                                        (entry) => entry.label && entry.label.element && entry.label.element.querySelector('.sr-only') && !entry.label.element.querySelector('.label-elev')
                                    )
                                );
                            }
                            const floorIdx = app.kioskPlaylist.findIndex((b) => b.type === 'building-floor');
                            let kioskCutawayBeatOk = false;
                            if (floorIdx >= 0) {
                                app._enterKioskBeat(floorIdx);
                                app._updateKioskTour(1.5);
                                app.renderer.render(app.scene, app.camera);
                                kioskCutawayBeatOk = Boolean(
                                    app.selectedBuilding &&
                                    app.activeFloorFilter !== null &&
                                    app.floorCutawayFoundry._clippedMeshes.length > 0 &&
                                    detailCardEl &&
                                    window.getComputedStyle(detailCardEl).display === 'none' &&
                                    Number.isFinite(app.camera.position.x) &&
                                    Number.isFinite(app.camera.position.y) &&
                                    Number.isFinite(app.camera.position.z)
                                );
                            }
                            // Verify ultra-slow cinematic Kiosk spin rate (< 0.85 deg/s) and textured cut-floor slab + zones
                            let kioskMaxDegPerSec = 0;
                            for (const kb of (app.kioskPlaylist || [])) {
                                if (typeof kb.startAngle === 'number' && typeof kb.endAngle === 'number' && kb.duration > 0) {
                                    const dps = (Math.abs(kb.endAngle - kb.startAngle) * 180 / Math.PI) / kb.duration;
                                    if (dps > kioskMaxDegPerSec) kioskMaxDegPerSec = Number(dps.toFixed(2));
                                }
                            }
                            if (kioskMaxDegPerSec <= 0 || kioskMaxDegPerSec > 0.85) {
                                window.__verifyErrors.push('Kiosk spin rate out of slow cinematic bounds: ' + kioskMaxDegPerSec + ' deg/s');
                            }

                            let cutawayFloorTexturesOk = false;
                            const floorBeat2Idx = app.kioskPlaylist.findIndex((b) => b.type === 'building-floor' && b.floor === 2);
                            const checkFloorIdx = floorBeat2Idx >= 0 ? floorBeat2Idx : floorIdx;
                            if (checkFloorIdx >= 0) {
                                app._enterKioskBeat(checkFloorIdx);
                                app._updateKioskTour(1.5);
                                app.renderer.render(app.scene, app.camera);
                                const slabObj = app.floorCutawayFoundry.rootGroup.children.find((c) => c.name === 'CutawayFloorPlateSlab');
                                const pocheObj = app.floorCutawayFoundry.rootGroup.children.find((c) => c.name === 'CutawayWallPocheRing');
                                const zoneObjs = app.floorCutawayFoundry.rootGroup.children.filter((c) => c.userData?.isDepartmentZone);
                                cutawayFloorTexturesOk = Boolean(
                                    slabObj && slabObj.material?.map && slabObj.material?.bumpMap && slabObj.geometry?.attributes?.uv &&
                                    pocheObj && pocheObj.material?.map && pocheObj.geometry?.attributes?.uv &&
                                    zoneObjs.length > 0 &&
                                    zoneObjs.every((z) => z.material?.map && z.material?.bumpMap && z.geometry?.attributes?.uv)
                                );
                                if (!cutawayFloorTexturesOk) {
                                    window.__verifyErrors.push('Cutaway floor slab or department zones missing PBR floor textures');
                                }
                            }

                            const eagleIdx = app.kioskPlaylist.findIndex((b) => b.type === 'eagle-flyover');
                            let kioskEagleBeatOk = false;
                            if (eagleIdx >= 0) {
                                app._enterKioskBeat(eagleIdx);
                                app._updateKioskTour(0.5);
                                app.renderer.render(app.scene, app.camera);
                                kioskEagleBeatOk = Boolean(app.followBirdViewActive && app._activeEagleFlight);
                            }

                            app.setKioskMode(false, { silent: true });
                            if (app.geeseFoundry && typeof app.geeseFoundry.purgeBackgroundFlights === 'function') {
                                app.geeseFoundry.purgeBackgroundFlights();
                            }
                            const kioskExitedOk = Boolean(
                                !app.kioskMode &&
                                !document.body.classList.contains('tv-kiosk-mode') &&
                                app.controls && app.controls.enabled === true &&
                                kioskHeaderEl && kioskHeaderEl.classList.contains('hidden') &&
                                kioskStageBarEl && kioskStageBarEl.classList.contains('hidden')
                            );

                            // Verify Building 316 open roof court (no solid brown roof lid above open court at lx=+4.5, lz=+20.0)
                            let bldg316OpenRoofOk = false;
                            const bldg316Entry = app.campusBuildingMeshes.get('building-316');
                            const bldg316Grp = bldg316Entry && bldg316Entry.group;
                            if (bldg316Grp) {
                                bldg316Grp.updateMatrixWorld(true);
                                const sin316 = 0.59621006;
                                const cos316 = -0.80282848;
                                const lxTest = 4.5;
                                const lzTest = 20.0;
                                const wxTest = bldg316Grp.position.x + lxTest * cos316 + lzTest * sin316;
                                const wzTest = bldg316Grp.position.z - lxTest * sin316 + lzTest * cos316;
                                const vOrigin = app.camera.position.clone().set(wxTest, bldg316Grp.position.y + 25.0, wzTest);
                                const vDown = app.camera.position.clone().set(0, -1, 0);
                                app.raycaster.set(vOrigin, vDown);
                                const hits = app.raycaster.intersectObject(bldg316Grp, true);
                                if (hits.length > 0) {
                                    const topLocalY = hits[0].point.y - bldg316Grp.position.y;
                                    bldg316OpenRoofOk = topLocalY > 9.8 && topLocalY < 11.2;
                                }
                            }

                            if (!kioskEnteredOk || !kioskMinimalHudOk || !kioskCutawayBeatOk || !kioskEagleBeatOk || !kioskExitedOk || !bldg316OpenRoofOk) {
                                window.__verifyErrors.push(
                                    'TV Kiosk / Building 316 verification failed: ' +
                                    JSON.stringify({ kioskEnteredOk, kioskMinimalHudOk, kioskPlaylistLen, kioskHasAllBeatTypes, kioskCutawayBeatOk, kioskEagleBeatOk, kioskExitedOk, bldg316OpenRoofOk })
                                );
                            }

                            // Verify Default Visual Modes (HDR, High Definition 4K, Dark Map)
                            const hdrDefaultOk = Boolean(
                                app.hdrPopEnabled === true &&
                                document.getElementById('toggle-luma-pbr')?.checked === true &&
                                app.scene.environment
                            );
                            const hdDefaultOk = Boolean(
                                app.gpuAccelerated === true &&
                                document.getElementById('toggle-gpu')?.checked === true &&
                                app.sunLight?.shadow?.mapSize?.x === 4096
                            );
                            const darkMapDefaultOk = Boolean(
                                app.darkMapEnabled === true &&
                                document.getElementById('toggle-dark-map')?.checked === true &&
                                app.groundFoundry.mapDarkness >= 0.70
                            );
                            if (!hdrDefaultOk || !hdDefaultOk || !darkMapDefaultOk) {
                                window.__verifyErrors.push(
                                    'Default visual settings verification failed: ' +
                                    JSON.stringify({ hdrDefaultOk, hdDefaultOk, darkMapDefaultOk })
                                );
                            }

                            // Verify Behind-400 Terraced Flat Concrete Parking Bays, Retaining Walls #1 & #2, and Concrete Rear Alley
                            const toWorld401 = (px, pz) => [
                                -4.22 + px * 0.80425 - pz * 0.59429,
                                -38.74 + px * 0.59429 + pz * 0.80425
                            ];
                            const sampleBayRange = (lzVal) => {
                                const ys = [];
                                for (const lxVal of [-14.0, -5.0, 4.0, 13.0, 19.5]) {
                                    const [wx, wz] = toWorld401(lxVal, lzVal);
                                    ys.push(app.groundFoundry.getTerrainHeight(wx, wz));
                                }
                                return { minY: Math.min(...ys), maxY: Math.max(...ys), span: Math.max(...ys) - Math.min(...ys) };
                            };
                            const lowerBayStats = sampleBayRange(78.5);
                            const upperBayStats = sampleBayRange(89.8);
                            const [embWx, embWz] = toWorld401(4.0, 99.0);
                            const uphillEmbY = app.groundFoundry.getTerrainHeight(embWx, embWz);
                            const b400TerraceGradingOk = Boolean(
                                lowerBayStats.span < 0.005 &&
                                upperBayStats.span < 0.005 &&
                                upperBayStats.minY > lowerBayStats.maxY + 0.75 &&
                                uphillEmbY > upperBayStats.maxY + 0.65
                            );

                            let b400ConcreteGeometryOk = false;
                            const rjcCorridorEntry = app.campusBuildingMeshes.get('regional-jail-east');
                            if (rjcCorridorEntry && rjcCorridorEntry.group) {
                                rjcCorridorEntry.group.updateMatrixWorld(true);
                                const raycast401 = (px, pz) => {
                                    const [wx, wz] = toWorld401(px, pz);
                                    const orig = app.camera.position.clone().set(wx, 40.0, wz);
                                    const dir = app.camera.position.clone().set(0, -1, 0);
                                    app.raycaster.set(orig, dir);
                                    const hits = app.raycaster.intersectObject(rjcCorridorEntry.group, true);
                                    return hits.length > 0 ? hits[0].point.y : null;
                                };
                                const hitLowerBay = raycast401(3.0, 78.5);
                                const hitUpperBay = raycast401(3.0, 89.8);
                                const hitWall1 = raycast401(3.0, 82.40);
                                const hitWall2 = raycast401(3.0, 97.25);
                                const hitRearAlley = raycast401(-19.10, 125.0);
                                b400ConcreteGeometryOk = Boolean(
                                    hitLowerBay !== null &&
                                    hitUpperBay !== null &&
                                    hitWall1 !== null &&
                                    hitWall2 !== null &&
                                    hitRearAlley !== null &&
                                    hitUpperBay > hitLowerBay + 0.70 &&
                                    hitWall1 > hitUpperBay + 0.15 &&
                                    hitWall2 > hitUpperBay + 0.80
                                );
                            }
                            if (!b400TerraceGradingOk || !b400ConcreteGeometryOk) {
                                window.__verifyErrors.push(
                                    'Behind-400 concrete parking / retaining walls verification failed: ' +
                                    JSON.stringify({ b400TerraceGradingOk, b400ConcreteGeometryOk, lowerBayStats, upperBayStats, uphillEmbY })
                                );
                            }

                            fetch('/__verify_done__', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    errors: window.__verifyErrors,
                                    silverFogSceneHex: fogHex,
                                    silverFogShaderHex: outerUniformHex,
                                    localClippingEnabled: app.renderer.localClippingEnabled,
                                    glbLoadedCount: app.buildingWorkerPool.glbLoadedCount,
                                    spawnedWorkers: app.buildingWorkerPool.workerCount,
                                    campusBuildingsCount: app.campusBuildingMeshes.size,
                                    contextBatchMeshCount: ctxMeshCount,
                                    hasOffCampusStreets: Boolean(carto?.streetsGroup),
                                    hasOffCampusParkingLots: Boolean(carto?.parkingGroup),
                                    streetTypographyDecals: carto?.streetTypographyGroup?.children?.length || 0,
                                    parcelBoundaryChildren: carto?.parcelGroup?.children?.length || 0,
                                    contourChildren: carto?.contourGroup?.children?.length || 0,
                                    courthouseFloorPills,
                                    courthouseClippedCount,
                                    cutawayRemainingTextureMaps,
                                    hasFloorDividerLines,
                                    courthouseHiddenWindowCoverCount,
                                    leakedVisibleTaggedOn350,
                                    unRestoredTaggedOn350,
                                    activeDeptZoneAfterAssessorClick,
                                    courthouseF2Zones: f2Zones,
                                    courthouseF3Zones: f3Zones,
                                    courthouseF4Zones: f4Zones,
                                    courthouseF5Zones: f5Zones,
                                    hideOnCutawayPerBuilding,
                                    jailClippedCount,
                                    jailHiddenWindowCoverCount,
                                    restoredAfterClear: app.floorCutawayFoundry._clippedMeshes.length === 0 && app.floorCutawayFoundry._hiddenObjects.length === 0,
                                    rjcCutawayVerification: {
                                        jailZonesByFloor,
                                        westWingZonesByFloor,
                                        b411Zones,
                                        hasDividerLinesOn411,
                                        remainingTexMapsOn411
                                    },
                                    eagleVerification: {
                                        isHighResEagle,
                                        eagleDurationSec,
                                        randomSpawnDistDiffMeters,
                                        horizonStartDistMeters,
                                        midSoarAltitudeFeet,
                                        highSoarAltitudeFeet,
                                        approachSpeedMps,
                                        passSpeedMps,
                                        eagleWingspanMeters,
                                        eagleScreenWidthPercent,
                                        eagleNdcY,
                                        rearChaseAlignment,
                                        billboardRevealAtMid,
                                        billboardVisibleAtMid,
                                        billboardRevealAtHighSoar,
                                        billboardVisibleAtHighSoar,
                                        billboardNdcX,
                                        billboardNdcY,
                                        billboardHiddenAfterEnd,
                                        eagleEndingsCount,
                                        droneSwarmCount,
                                        droneVisibleAtMid,
                                        droneVisibleAtHighSoar,
                                        droneRevealAtHighSoar,
                                        droneSeparationAtHighSoar,
                                        droneHiddenAfterEnd,
                                        veedolVisibleAtMid,
                                        veedolVisibleAtHighSoar,
                                        veedolRevealAtHighSoar,
                                        veedolHiddenAfterEnd,
                                        autoEnteredBirdView,
                                        autoExitedOnComplete,
                                        restoredCamMatch
                                    },
                                    watchdogVerification: {
                                        leakedGeoBuffersAfter10Flocks,
                                        nanCameraRecovered,
                                        sessionRestoredOk,
                                        estimatedVramMB: vramStats?.totalEstimatedVramMB,
                                        vramLimitMB: vramStats?.vramLimitMB
                                    },
                                    kioskVerification: {
                                        kioskEnteredOk,
                                        kioskPlaylistLen,
                                        kioskHasAllBeatTypes,
                                        kioskCutawayBeatOk,
                                        kioskMaxDegPerSec,
                                        cutawayFloorTexturesOk,
                                        kioskEagleBeatOk,
                                        kioskExitedOk
                                    },
                                    treeVerification: {
                                        totalSpeciesCount: speciesIdsInDom.length,
                                        allNewSpeciesPresent: newSpeciesIds.every((id) => speciesIdsInDom.includes(id)),
                                        newSpeciesMetrics
                                    },
                                    gymAccessRoadVerification: (() => {
                                        const toW = (lx, lz) => [-4.22 + lx * 0.80425 - lz * 0.59429, -38.74 + lx * 0.59429 + lz * 0.80425];
                                        const hAt = (lx, lz) => {
                                            const [wx, wz] = toW(lx, lz);
                                            return Number(app.groundFoundry.getTerrainHeight(wx, wz).toFixed(3));
                                        };
                                        const typoCount = carto?.streetTypographyGroup?.children?.length || 0;
                                        const glbCacheVersion = app.buildingWorkerPool?.glbCacheVersion || '';
                                        const b401Group = app.campusBuildingMeshes.get('regional-jail-east')?.group;
                                        const b300Group = app.campusBuildingMeshes.get('building-300')?.group;
                                        const b316Group = app.campusBuildingMeshes.get('building-316')?.group;
                                        const lowerGymAutoLevelY = hAt(75, 110);
                                        const accessRoadDouglasY = hAt(42, 131);
                                        const accessRoadJunctionY = hAt(79.36, 129.42);
                                        const accessRoadOrondoY = hAt(120, 119.55);
                                        const accessRoadRearAlleyY = hAt(80.2, 155);
                                        const lowerSwLawnSlantMidY = hAt(108, 112);

                                        // Verify terrain mesh vertices are depressed cleanly below yGrade along the Access Road & Concrete Parking
                                        const roadSamples = [
                                            [58.0, 130.25],
                                            [79.36, 129.42],
                                            [85.65, 120.92],
                                            [105.0, 119.82],
                                            [80.8, 155.0]
                                        ];
                                        const terrainMeshDepressedUnderRoad = roadSamples.every(([lx, lz]) => {
                                            const [wx, wz] = toW(lx, lz);
                                            const gradeH = app.groundFoundry.getTerrainHeight(wx, wz);
                                            const meshH = app.groundFoundry._getTerrainMeshVertexHeight(wx, wz);
                                            return meshH < gradeH - 0.05;
                                        });

                                        // Verify continuous downward slant from Douglas -> Junction -> Orondo, uphill Rear Alley, and flat lower Gym auto-level
                                        const slantValid =
                                            accessRoadDouglasY > accessRoadJunctionY &&
                                            accessRoadJunctionY > accessRoadOrondoY &&
                                            accessRoadRearAlleyY > accessRoadJunctionY &&
                                            Math.abs(lowerGymAutoLevelY - app.groundFoundry.getBuildingRoadHeight('building-316')) < 0.05 &&
                                            lowerSwLawnSlantMidY > lowerGymAutoLevelY + 0.5;
                                        if (!slantValid) {
                                            window.__verifyErrors.push('Invalid Gym Access Road slant or lower auto-level elevation profile');
                                        }
                                        if (!terrainMeshDepressedUnderRoad) {
                                            window.__verifyErrors.push('Terrain mesh is not depressed beneath Gym Access Road (overlap risk)');
                                        }
                                        if (typoCount !== 7) {
                                            window.__verifyErrors.push('Expected 7 street typography decals (no ACCESS ROAD markings), got ' + typoCount);
                                        }
                                        if (glbCacheVersion !== '246') {
                                            window.__verifyErrors.push('Expected glbCacheVersion 246, got ' + glbCacheVersion);
                                        }

                                        // Verify Building 400 parking slab is on the scene ground layer (NOT inside building-411-412.glb),
                                        // uses the exact same brushed concrete material & texture as B400ConcreteParking_LowerBay,
                                        // and connects seamlessly (zero vertical step, zero protruding wall bar) across lx411 = 23.62 and lz401 = 74.40
                                        const b411Group = app.campusBuildingMeshes.get('building-411-412')?.group;
                                        const b400GroundParking = app.groundGroup?.getObjectByName('Building400ConcreteParkingGround');
                                        let b400ParkingMatchesNewConcrete = false;
                                        let b411MaxLx = -Infinity;
                                        let maxSeamStepX = 0;
                                        let maxSeamStepZ = 0;
                                        if (b411Group && b401Group && b400GroundParking) {
                                            b411Group.updateMatrixWorld(true);
                                            b401Group.updateMatrixWorld(true);
                                            b400GroundParking.updateMatrixWorld(true);
                                            b411Group.traverse((o) => {
                                                const pos = o.geometry?.attributes?.position;
                                                if (!pos) return;
                                                for (let i = 0; i < pos.count; i++) {
                                                    const lx = pos.getX(i) * 0.80801 + pos.getZ(i) * 0.58917;
                                                    if (lx > b411MaxLx) b411MaxLx = lx;
                                                }
                                            });
                                            const rayHit = (grp, wx, wz) => {
                                                const orig = app.camera.position.clone().set(wx, 40.0, wz);
                                                const dir = app.camera.position.clone().set(0, -1, 0);
                                                app.raycaster.set(orig, dir);
                                                const hits = app.raycaster.intersectObject(grp, true);
                                                return hits.length > 0 ? hits[0] : null;
                                            };
                                            const rayHitMat = (grp, px, pz) => {
                                                const [wx, wz] = toW(px, pz);
                                                const h = rayHit(grp, wx, wz);
                                                return h ? h.object?.material : null;
                                            };
                                            const newConcreteMat = rayHitMat(b401Group, 4.0, 78.5);
                                            const b400LotMat = rayHitMat(b400GroundParking, 6.0, 66.5);
                                            const b411HitOn400Lot = rayHitMat(b411Group, 6.0, 66.5);
                                            const b400AlleyMat = rayHitMat(b411Group, -19.0, 66.5);

                                            // Check seam continuity across lx411 = 23.62 (between b411Group and b400GroundParking)
                                            for (const lz411 of [-1.0, 2.5, 6.0, 9.5]) {
                                                const toW411 = (lx, lz) => [
                                                    -73.89 + lx * 0.80801 - lz * 0.58917,
                                                    -11.51 + lx * 0.58917 + lz * 0.80801
                                                ];
                                                const [wxL, wzL] = toW411(23.58, lz411);
                                                const [wxR, wzR] = toW411(23.66, lz411);
                                                const hL = rayHit(b411Group, wxL, wzL);
                                                const hR = rayHit(b400GroundParking, wxR, wzR);
                                                if (hL && hR) {
                                                    const diff = Math.abs(hL.point.y - hR.point.y);
                                                    if (diff > maxSeamStepX) maxSeamStepX = Number(diff.toFixed(4));
                                                } else {
                                                    maxSeamStepX = 999;
                                                }
                                            }
                                            // Check seam continuity across lz401 = 74.40 (between b400GroundParking/b411Group and b401Group)
                                            for (const lx401 of [-19.0, -10.0, 0.0, 10.0, 20.0]) {
                                                const [wxA, wzA] = toW(lx401, 74.36);
                                                const [wxB, wzB] = toW(lx401, 74.44);
                                                const hA = lx401 < -16.5 ? rayHit(b411Group, wxA, wzA) : rayHit(b400GroundParking, wxA, wzA);
                                                const hB = rayHit(b401Group, wxB, wzB);
                                                if (hA && hB) {
                                                    const diff = Math.abs(hA.point.y - hB.point.y);
                                                    if (diff > maxSeamStepZ) maxSeamStepZ = Number(diff.toFixed(4));
                                                } else {
                                                    maxSeamStepZ = 999;
                                                }
                                            }

                                            b400ParkingMatchesNewConcrete = Boolean(
                                                b411MaxLx <= 24.0 &&
                                                !b411HitOn400Lot &&
                                                maxSeamStepX <= 0.015 &&
                                                maxSeamStepZ <= 0.015 &&
                                                newConcreteMat?.map &&
                                                b400LotMat?.map &&
                                                b400AlleyMat?.map &&
                                                b400LotMat.color?.getHexString() === newConcreteMat.color?.getHexString() &&
                                                b400AlleyMat.color?.getHexString() === newConcreteMat.color?.getHexString()
                                            );
                                        }
                                        if (!b400ParkingMatchesNewConcrete) {
                                            window.__verifyErrors.push('Building 400 parking concrete seam continuity or 411 GLB separation check failed (b411MaxLx=' + b411MaxLx.toFixed(2) + ', maxSeamStepX=' + maxSeamStepX + ', maxSeamStepZ=' + maxSeamStepZ + ')');
                                        }

                                        // Verify Douglas St & Behind-400 auto-graded terrain: zero curb cliff, smooth longitudinal grade, and depressed terrain mesh
                                        let maxDougCurbStep = 0;
                                        let maxDougLongSlope = 0;
                                        let douglasTerrainMeshClear = true;
                                        for (let pz = 44; pz <= 102; pz += 1.0) {
                                            const [wxL, wzL] = toW(24.60, pz);
                                            const [wxR, wzR] = toW(24.66, pz);
                                            const step = Math.abs(
                                                app.groundFoundry.getTerrainHeight(wxR, wzR) -
                                                app.groundFoundry.getTerrainHeight(wxL, wzL)
                                            );
                                            if (step > maxDougCurbStep) maxDougCurbStep = Number(step.toFixed(4));
                                            if (pz < 96) {
                                                const [wx0, wz0] = toW(26.5, pz);
                                                const [wx1, wz1] = toW(26.5, pz + 1.0);
                                                const slope = Math.abs(
                                                    app.groundFoundry.getTerrainHeight(wx1, wz1) -
                                                    app.groundFoundry.getTerrainHeight(wx0, wz0)
                                                );
                                                if (slope > maxDougLongSlope) maxDougLongSlope = Number(slope.toFixed(4));
                                            }
                                            for (const px of [23.2, 26.0, 31.5, 36.5]) {
                                                if (px < 24.6 && pz < 60) continue;
                                                const [wxM, wzM] = toW(px, pz);
                                                const th = app.groundFoundry.getTerrainHeight(wxM, wzM);
                                                const mh = app.groundFoundry._getTerrainMeshVertexHeight(wxM, wzM);
                                                if (!(mh < th - 0.05)) douglasTerrainMeshClear = false;
                                            }
                                        }
                                        if (maxDougCurbStep > 0.025) {
                                            window.__verifyErrors.push('Douglas St curb-to-roadway terrain cliff detected: ' + maxDougCurbStep + 'm');
                                        }
                                        if (maxDougLongSlope > 0.22) {
                                            window.__verifyErrors.push('Douglas St steep longitudinal terrain step detected: ' + maxDougLongSlope + 'm/m');
                                        }
                                        if (!douglasTerrainMeshClear) {
                                            window.__verifyErrors.push('Terrain mesh is not depressed beneath Douglas St roadway/sidewalk');
                                        }

                                        // Verify Kiosk camera transitions are snappy (<= 1.8s) while orbit spin remains slow
                                        const kioskPlaylist = app._buildKioskPlaylist ? app._buildKioskPlaylist() : [];
                                        let maxKioskTransDur = 0;
                                        kioskPlaylist.forEach((b) => {
                                            if ((b.transitionDuration || 0) > maxKioskTransDur) {
                                                maxKioskTransDur = b.transitionDuration;
                                            }
                                        });
                                        if (maxKioskTransDur > 1.8) {
                                            window.__verifyErrors.push('Kiosk transitionDuration too long: ' + maxKioskTransDur + 's');
                                        }

                                        // Verify S. Okanogan & Orondo acute corner roadway at (148.2, -4.65) has zero protruding planter/shrubs
                                        const [okCheckX, okCheckZ] = toW(148.2, -4.65);
                                        let okanoganCornerMaxAboveGrade = 0;
                                        if (b401Group) {
                                            b401Group.updateMatrixWorld(true);
                                            b401Group.traverse((obj) => {
                                                if (!obj.isMesh || !obj.geometry?.attributes?.position) return;
                                                const posAttr = obj.geometry.attributes.position;
                                                const e = obj.matrixWorld.elements;
                                                for (let vi = 0; vi < posAttr.count; vi++) {
                                                    const vx = posAttr.getX(vi), vy = posAttr.getY(vi), vz = posAttr.getZ(vi);
                                                    const wx = e[0] * vx + e[4] * vy + e[8] * vz + e[12];
                                                    const wy = e[1] * vx + e[5] * vy + e[9] * vz + e[13];
                                                    const wz = e[2] * vx + e[6] * vy + e[10] * vz + e[14];
                                                    if (Math.hypot(wx - okCheckX, wz - okCheckZ) <= 2.4) {
                                                        const above = wy - app.groundFoundry.getTerrainHeight(wx, wz);
                                                        if (above > okanoganCornerMaxAboveGrade) {
                                                            okanoganCornerMaxAboveGrade = Number(above.toFixed(3));
                                                        }
                                                    }
                                                }
                                            });
                                        }
                                        if (okanoganCornerMaxAboveGrade > 0.16) {
                                            window.__verifyErrors.push('Protruding geometry on S. Okanogan corner roadway: +' + okanoganCornerMaxAboveGrade + 'm');
                                        }
                                        return {
                                            slantValid,
                                            terrainMeshDepressedUnderRoad,
                                            douglasTerrainMeshClear,
                                            b400ParkingMatchesNewConcrete,
                                            maxDougCurbStep,
                                            maxDougLongSlope,
                                            maxKioskTransDur,
                                            glbCacheVersion,
                                            okanoganCornerMaxAboveGrade,
                                            streetTypographyDecals: typoCount,
                                            b401MeshChildren: b401Group?.children?.length || 0,
                                            b300MeshChildren: b300Group?.children?.length || 0,
                                            b316MeshChildren: b316Group?.children?.length || 0,
                                            lowerGymAutoLevelY,
                                            accessRoadDouglasY,
                                            accessRoadJunctionY,
                                            accessRoadOrondoY,
                                            accessRoadRearAlleyY,
                                            lowerSwLawnSlantMidY
                                        };
                                    })(),
                                    perBuildingLoadMs: perBuildingMs
                                })
                            });
                        } catch (verifyErr) {
                            fetch('/__verify_done__', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ errors: [...window.__verifyErrors, String(verifyErr?.stack || verifyErr)] })
                            });
                        }
                    }
                }, 100);
            </script></body>`;
            html = html.replace('</body>', verifyScript);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
            return;
        }
        res.writeHead(200, { 'Content-Type': MIME_MAP[ext] || 'application/octet-stream' });
        res.end(data);
    });
});

const tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chelan-glb-headless-'));
const cleanupTempProfile = () => {
    try {
        fs.rmSync(tempProfileDir, { recursive: true, force: true });
    } catch (_) {}
};
process.on('exit', cleanupTempProfile);

server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    const onlyQuery = ONLY_ARG ? `&only=${encodeURIComponent(ONLY_ARG)}` : '';
    const targetUrl = IS_VERIFY
        ? `http://127.0.0.1:${port}/index.html`
        : `http://127.0.0.1:${port}/index.html?bakeGlb=1${onlyQuery}`;
    const browserExe = findBrowserExecutable();
    console.log(
        IS_VERIFY
            ? `Verifying runtime .GLB fast-loader via ${path.basename(browserExe)} at ${targetUrl} ...`
            : `Starting headless .GLB bake via ${path.basename(browserExe)} at ${targetUrl} ...`
    );

    browserProc = spawn(
        browserExe,
        [
            '--headless=new',
            `--user-data-dir=${tempProfileDir}`,
            '--disable-gpu-sandbox',
            '--enable-webgl',
            '--ignore-gpu-blocklist',
            '--use-angle=d3d11',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--no-first-run',
            '--no-default-browser-check',
            targetUrl
        ],
        { stdio: 'ignore' }
    );

    setTimeout(() => {
        console.error('Timed out waiting for headless browser .GLB bake.');
        if (browserProc) {
            try {
                browserProc.kill();
            } catch (_) {}
        }
        process.exit(1);
    }, 120000);
});
