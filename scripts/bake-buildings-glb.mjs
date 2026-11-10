import http from 'node:http';
import fs from 'node:fs';
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

const bakedManifest = {
    version: 1,
    bakedAt: new Date().toISOString(),
    buildings: {}
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
        if (IS_VERIFY && reqPath === '/index.html') {
            let html = data.toString('utf8');
            const verifyScript = `<script>
                const _iv = setInterval(() => {
                    const app = window.chelanCampusApp;
                    if (app && app.campusBuildingMeshes && app.campusBuildingMeshes.size === 8 && app.contextGroup) {
                        clearInterval(_iv);
                        const perBuildingMs = {};
                        for (const [id, entry] of app.campusBuildingMeshes.entries()) {
                            perBuildingMs[id] = entry.group?.userData?.workerStats?.workerBuildMs;
                        }
                        fetch('/__verify_done__', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                glbLoadedCount: app.buildingWorkerPool.glbLoadedCount,
                                spawnedWorkers: app.buildingWorkerPool.workerCount,
                                campusBuildingsCount: app.campusBuildingMeshes.size,
                                selectableMeshesCount: app.selectableMeshes.length,
                                animatedFlagsCount: app.animatedFlags.length,
                                perBuildingLoadMs: perBuildingMs
                            })
                        });
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

server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    const targetUrl = IS_VERIFY
        ? `http://127.0.0.1:${port}/index.html`
        : `http://127.0.0.1:${port}/index.html?bakeGlb=1`;
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
            '--disable-gpu-sandbox',
            '--enable-webgl',
            '--ignore-gpu-blocklist',
            '--use-angle=d3d11',
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
    }, 60000);
});
