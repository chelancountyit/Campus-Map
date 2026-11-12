import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT_DIR, 'assets', 'models', 'birds');
const OUT_FILE = path.join(OUT_DIR, 'bald-eagle-hd.glb');

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
    throw new Error('Could not find Chrome or Edge executable to bake bald-eagle-hd.glb');
}

// Bundle a tiny inline browser entry that builds the high-res Bald Eagle rig with the USFWS texture and exports GLB
const entryCode = `
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { loadEagleReferenceImage, buildHighResBaldEagleRig } from './js/foundry/birds/BaldEagleHighRes.js';

(async () => {
    try {
        const img = await loadEagleReferenceImage('./assets/textures/birds/bald_eagle_usfws_hd.jpg');
        const rig = buildHighResBaldEagleRig(img);
        let triCount = 0;
        let meshCount = 0;
        rig.mesh.traverse((o) => {
            if (o.isMesh && o.geometry) {
                meshCount++;
                const idx = o.geometry.getIndex();
                triCount += idx ? idx.count / 3 : o.geometry.getAttribute('position').count / 3;
            }
        });

        const exporter = new GLTFExporter();
        exporter.parse(
            rig.mesh,
            async (glbBuffer) => {
                await fetch('/__save_eagle_glb__', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'X-Triangles': String(Math.round(triCount)),
                        'X-Meshes': String(meshCount),
                        'X-Photo-Sampled': String(Boolean(img))
                    },
                    body: glbBuffer
                });
            },
            (err) => {
                fetch('/__err__', { method: 'POST', body: String(err?.stack || err) });
            },
            { binary: true }
        );
    } catch (e) {
        fetch('/__err__', { method: 'POST', body: String(e?.stack || e) });
    }
})();
`;

const bundleResult = await esbuild.build({
    stdin: {
        contents: entryCode,
        resolveDir: ROOT_DIR,
        sourcefile: 'bake-eagle-entry.js'
    },
    bundle: true,
    format: 'iife',
    write: false
});
const bundleJs = bundleResult.outputFiles[0].text;

fs.mkdirSync(OUT_DIR, { recursive: true });
let browserProc = null;

const server = http.createServer((req, res) => {
    const u = req.url.split('?')[0];
    if (req.method === 'POST' && u === '/__save_eagle_glb__') {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
            const buf = Buffer.concat(chunks);
            fs.writeFileSync(OUT_FILE, buf);
            console.log(
                `✅ Baked high-resolution Bald Eagle GLB -> ${OUT_FILE} (${(buf.length / 1024).toFixed(1)} KB, ` +
                `${req.headers['x-triangles']} triangles across ${req.headers['x-meshes']} parts, USFWS photo sampled: ${req.headers['x-photo-sampled']})`
            );
            res.writeHead(200);
            res.end('ok');
            setTimeout(() => {
                try { browserProc?.kill(); } catch (_) {}
                server.close(() => process.exit(0));
            }, 120);
        });
        return;
    }
    if (req.method === 'POST' && u === '/__err__') {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
            console.error('❌ Eagle GLB bake failed:', Buffer.concat(chunks).toString('utf8'));
            res.writeHead(200);
            res.end('err');
            setTimeout(() => {
                try { browserProc?.kill(); } catch (_) {}
                server.close(() => process.exit(1));
            }, 120);
        });
        return;
    }
    if (u === '/' || u === '/bake.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html><html><body><script>${bundleJs}</script></body></html>`);
        return;
    }
    const filePath = path.join(ROOT_DIR, u);
    if (!filePath.startsWith(ROOT_DIR) || !fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.png' ? 'image/png' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(fs.readFileSync(filePath));
});

server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    const browserBin = findBrowserExecutable();
    browserProc = spawn(browserBin, [
        '--headless=new',
        '--disable-gpu-sandbox',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--no-first-run',
        '--no-default-browser-check',
        `http://127.0.0.1:${port}/bake.html`
    ], { stdio: 'ignore' });
});
