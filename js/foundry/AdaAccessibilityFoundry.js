import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

/**
 * Physical Campus ADA Accessibility Features Catalog (ADA Title II / 2010 ADA Standards)
 * Maps accessible building entrances, van-accessible parking stalls, wheelchair ramps (<= 1:12 slope),
 * curb cuts, and multi-floor public elevators across the Chelan County Government Campus.
 */
export const ADA_CAMPUS_FEATURES = [
    {
        id: 'ada-400-main-entry',
        buildingId: 'building-400',
        buildingCode: '400',
        category: 'entrance',
        badge: '♿ Entry + 🛗 Elevator',
        title: '400 Douglas — Level 2 Barrier-Free Plaza Entry & Elevator',
        location: 'SE Plaza Corner (Douglas St & Washington St)',
        specs: 'Zero-step entry at Floor 2 road grade • Power-assist double doors • Public elevator serves Floors 1–3',
        x: -24.8,
        z: 14.5,
        camOffset: [13.5, 6.5, 16.5],
        routeFrom: [-33.5, 19.5]
    },
    {
        id: 'ada-400-rear-parking',
        buildingId: 'building-400',
        buildingCode: '400',
        category: 'parking',
        badge: '♿ Van Parking + Level 1 Entry',
        title: '400 Douglas — Rear Alley Van-Accessible Stalls & Walk-Out Entry',
        location: 'NW Rear Concrete Lot off Douglas St Alley',
        specs: '2 Van-accessible stalls with 8 ft access aisle • Direct level walk-out entry to Floor 1 & elevator lobby',
        x: -46.8,
        z: -5.2,
        camOffset: [-15.0, 7.5, -14.0],
        routeFrom: [-51.5, -8.5]
    },
    {
        id: 'ada-316-main-entry',
        buildingId: 'building-316',
        buildingCode: '316',
        category: 'entrance',
        badge: '♿ Main Entry + 🛗 Elevator',
        title: '316 Washington — Level 2 Accessible Entry & Public Elevator',
        location: 'SW Front Plaza on Washington St',
        specs: 'Flush concrete sidewalk transition • Automatic entry door • Elevator access to Floors 1–4 (Permits & Public Works)',
        x: -1.8,
        z: 35.8,
        camOffset: [-14.0, 6.8, -14.5],
        routeFrom: [5.5, 29.5]
    },
    {
        id: 'ada-316-douglas-parking',
        buildingId: 'building-316',
        buildingCode: '316',
        category: 'parking',
        badge: '♿ ADA Parking & Curb Ramp',
        title: '316 Washington — Douglas St Rear Lot ADA Stalls',
        location: 'North Rear Concrete Parking Lot (Behind 316 / Gym)',
        specs: 'Designated ADA stalls on graded concrete apron (< 2% cross-slope) with barrier-free sidewalk path',
        x: -11.5,
        z: 55.2,
        camOffset: [-14.5, 7.2, 14.5],
        routeFrom: [-6.5, 51.0]
    },
    {
        id: 'ada-300-turnout-bay',
        buildingId: 'building-300',
        buildingCode: '300',
        category: 'parking',
        badge: '♿ Turnout Bay & Curb Ramp',
        title: '300 Washington — Recessed Parallel Disabled Parking Turnout Bay',
        location: 'Washington St Front Sidewalk Turnout (Juvenile Justice)',
        specs: 'Recessed street-level ADA drop-off & parallel parking bay with tactile curb ramp & level plaza walk',
        x: 11.2,
        z: 52.4,
        camOffset: [-13.5, 6.5, -15.0],
        routeFrom: [19.8, 61.5]
    },
    {
        id: 'ada-300-main-entry',
        buildingId: 'building-300',
        buildingCode: '300',
        category: 'entrance',
        badge: '♿ Level Pavilion Entry',
        title: '300 Washington — Juvenile Justice Barrier-Free Main Entrance',
        location: 'Front Brick Pavilion & Circular Plaza',
        specs: 'Single-story level threshold • Wide security vestibule & accessible public courtroom/probation counter',
        x: 19.8,
        z: 61.5,
        camOffset: [-14.0, 6.5, -15.5],
        routeFrom: null
    },
    {
        id: 'ada-350-wash-entry',
        buildingId: 'courthouse-350',
        buildingCode: '350',
        category: 'entrance',
        badge: '♿ Level 2 Entry + 🛗 Elevator',
        title: '350 Courthouse — Washington St Road-Level Accessible Entry',
        location: 'West Facade along Washington St (Floor 2 Level)',
        specs: 'Bypasses historic Orondo Ave front stairs • Enters directly at Floor 2 road grade with elevator to Floors 1–5',
        x: 44.5,
        z: 2.2,
        camOffset: [-16.0, 7.5, -14.0],
        routeFrom: [37.5, -3.5]
    },
    {
        id: 'ada-411-412-parking',
        buildingId: 'building-411-412',
        buildingCode: '411/412',
        category: 'parking',
        badge: '♿ Van Stall + Access Aisle',
        title: '410/412 Washington — Van-Accessible Concrete Parking Stall',
        location: '412 Front Concrete Parking Platform',
        specs: 'Dedicated van stall with yellow hashed access aisle, ISA pavement stencil, and reserved ADA signage',
        x: -76.5,
        z: -15.8,
        camOffset: [12.0, 6.5, -15.5],
        routeFrom: [-72.5, -11.5]
    },
    {
        id: 'ada-411-412-entries',
        buildingId: 'building-411-412',
        buildingCode: '411/412',
        category: 'ramp',
        badge: '♿ Covered Canopy Walk',
        title: '410 / 411 / 412 Washington — Single-Story Accessible Entrances',
        location: '412 Covered Porch Walkway & 411 Alley Entrance',
        specs: 'Continuous covered concrete walkway along 412 WSU Extension & graded concrete approach to 411 Natural Resources',
        x: -82.0,
        z: -8.5,
        camOffset: [11.5, 5.8, -14.5],
        routeFrom: null
    },
    {
        id: 'ada-401-wash-street-parking',
        buildingId: 'regional-jail-east',
        buildingCode: '401',
        category: 'parking',
        badge: '♿ Asphalt Parallel Stall',
        title: '401 Washington — On-Street Asphalt ADA Parallel Parking Stall',
        location: 'Washington St SE Parallel Parking Lane (North of Speed Table)',
        specs: 'On-street asphalt parallel ADA stall with white ISA wheelchair pavement stencil, rear hashed buffer & curbside ADA sign',
        x: 20.7,
        z: 12.3,
        camOffset: [-12.5, 6.5, -13.5],
        routeFrom: [-18.5, -41.5]
    },
    {
        id: 'ada-401-westwing',
        buildingId: 'regional-jail-west',
        buildingCode: '401 / CCRJ',
        category: 'entrance',
        badge: '♿ Graded Sidewalk Entry',
        title: '401 & 413–415 Washington — Law & Justice / CCRJ Accessible Entries',
        location: 'Washington St Sidewalk Grade (Floor 2 East / Floor 1 West)',
        specs: 'Road-level public lobby entry on Washington St • Public elevator access to Sheriff, Prosecutor & Superior Court',
        x: -18.5,
        z: -41.5,
        camOffset: [-14.0, 7.5, 16.0],
        routeFrom: [-28.0, -48.5]
    },
    {
        id: 'ada-428-ramp',
        buildingId: 'building-428',
        buildingCode: '428',
        category: 'ramp',
        badge: '♿ 1:12 Wheelchair Ramp',
        title: '428 Orondo Ave — Front ADA Wheelchair Ramp & Handrails',
        location: 'Front Porch of 428 Orondo Campus Annex',
        specs: 'Dedicated concrete ADA ramp (<= 1:12 slope) with dual-height white tubular metal handrails & 5×5 ft level landing',
        x: -8.2,
        z: 153.2,
        camOffset: [13.5, 5.5, 13.5],
        routeFrom: [-4.5, 156.5]
    }
];

export const BUILDING_ADA_SUMMARY = {
    'courthouse-350': {
        status: 'ADA Accessible via Washington St (Floor 2)',
        entrance: 'West Washington St road-level entrance bypasses the historic Orondo Ave front stairs.',
        parking: 'Designated ADA stalls in the Courthouse North Lot & along Washington St.',
        elevator: 'Public elevator serves all 5 floors (Floor 1 Basement Treasurer to Floor 5 Superior Court Clerk).'
    },
    'building-316': {
        status: 'Full Barrier-Free Plaza & Elevator Access',
        entrance: 'Flush level concrete plaza entrance on Washington St (Floor 2 level).',
        parking: 'ADA stalls in the rear Douglas St concrete lot & Washington St turnout bay.',
        elevator: 'Central public elevator serves Floors 1–4 (Community Development & Public Works).'
    },
    'building-400': {
        status: 'Dual-Level Accessible Entrances (Floors 1 & 2)',
        entrance: 'Zero-step main portico entry at Douglas & Washington St (Floor 2) + rear walk-out entry (Floor 1).',
        parking: 'Van-accessible stalls in the rear Douglas St alley lot & adjacent 411/400 concrete apron.',
        elevator: 'Public elevator serves all 3 floors (Facilities, BOCC, HR & IT).'
    },
    'building-300': {
        status: 'Single-Story Level Facility + ADA Turnout Bay',
        entrance: 'Barrier-free circular concrete plaza & main pavilion entrance on Washington St.',
        parking: 'Recessed parallel disabled parking turnout bay with tactile curb ramp directly in front on Washington St.',
        elevator: 'Single-story main public wing (no stairs required for Juvenile Court or Probation).'
    },
    'building-411-412': {
        status: 'Single-Story Complex with Van-Accessible Stall',
        entrance: 'Covered level porch walkway for 412 (WSU Extension), ramped/stepped entry for 410, and graded concrete entry for 411.',
        parking: 'Reserved van-accessible stall with yellow hashed access aisle in front 412 concrete lot.',
        elevator: 'All public offices (410, 411, 412) are on the ground floor.'
    },
    'regional-jail-east': {
        status: 'Road-Level Entry & Multi-Floor Elevator',
        entrance: 'Floor 2 main public entrance sits flush with Washington St sidewalk grade.',
        parking: 'Accessible spaces along Washington St & visitor parking lot.',
        elevator: 'Public security elevators serve Floors 1–5 (Sheriff, Prosecutor & Superior Court).'
    },
    'regional-jail-west': {
        status: 'Graded Sidewalk Perimeter Access',
        entrance: 'Floor 1 intake & public vestibule graded directly to the Washington St sidewalk.',
        parking: 'Adjacent Washington St accessible drop-off & visitor stalls.',
        elevator: 'Ground-level public intake & visitation.'
    },
    'building-428': {
        status: 'Dedicated Front ADA Wheelchair Ramp',
        entrance: 'Concrete 1:12 wheelchair ramp with dual-rail handrails leads from the Orondo Ave walk to the front porch door.',
        parking: 'Adjacent county parking lot off Orondo Ave with level sidewalk connection.',
        elevator: 'Single-story annex (all services on main level).'
    }
};

export class AdaAccessibilityFoundry {
    constructor(scene, getTerrainHeightFn, onSelectFeature) {
        this.scene = scene;
        this.getTerrainHeight = getTerrainHeightFn;
        this.onSelectFeature = onSelectFeature;
        this.active = false;
        this.group = new THREE.Group();
        this.group.name = 'AdaAccessibilityLayerGroup';
        this.group.visible = false;
        this.scene.add(this.group);

        this.labelObjects = [];
        this.markerMeshes = [];
        this.pulseRings = [];
        this._isaTexture = this._createIsaSymbolTexture();
        this.buildLayer();
    }

    _createIsaSymbolTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // ADA Blue rounded background with crisp white border
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(128, 128, 116, 0, Math.PI * 2);
        ctx.fill();

        ctx.lineWidth = 12;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Crisp white International Symbol of Access
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 138px "Segoe UI Symbol", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♿', 128, 134);

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    buildLayer() {
        // Clear any existing children
        this.labelObjects.forEach((obj) => {
            if (obj.parent) obj.parent.remove(obj);
        });
        this.labelObjects = [];
        this.markerMeshes = [];
        this.pulseRings = [];
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }

        const poleMat = new THREE.MeshStandardMaterial({
            color: '#0284c7',
            roughness: 0.3,
            metalness: 0.2,
            emissive: '#0369a1',
            emissiveIntensity: 0.35
        });

        const discMat = new THREE.MeshBasicMaterial({
            map: this._isaTexture,
            side: THREE.DoubleSide,
            transparent: true
        });

        const routeMat = new THREE.MeshBasicMaterial({
            color: '#38bdf8',
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
            depthTest: false
        });

        ADA_CAMPUS_FEATURES.forEach((feat) => {
            const ty = this.getTerrainHeight ? this.getTerrainHeight(feat.x, feat.z) : 0;
            const nodeGroup = new THREE.Group();
            nodeGroup.position.set(feat.x, ty, feat.z);
            nodeGroup.userData = { adaFeature: feat };

            // 1. Ground ISA Stencil Pad
            const padGeo = new THREE.CircleGeometry(1.65, 32);
            padGeo.rotateX(-Math.PI / 2);
            const padMesh = new THREE.Mesh(padGeo, discMat);
            padMesh.position.y = 0.18;
            padMesh.userData = { adaFeature: feat };
            nodeGroup.add(padMesh);
            this.markerMeshes.push(padMesh);

            // 2. Animated Pulse Ring around the ADA pad
            const ringGeo = new THREE.RingGeometry(1.85, 2.35, 32);
            ringGeo.rotateX(-Math.PI / 2);
            const ringMat = new THREE.MeshBasicMaterial({
                color: feat.category === 'parking' ? '#fbbf24' : '#38bdf8',
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.78,
                depthTest: false
            });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.position.y = 0.22;
            nodeGroup.add(ringMesh);
            this.pulseRings.push(ringMesh);

            // 3. Vertical Beacon Pillar
            const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 3.2, 12), poleMat);
            pillar.position.y = 1.6;
            pillar.userData = { adaFeature: feat };
            nodeGroup.add(pillar);
            this.markerMeshes.push(pillar);

            // 4. Interactive CSS2D Floating Badge (Keyboard & Mouse Accessible)
            const badgeEl = document.createElement('button');
            badgeEl.type = 'button';
            badgeEl.className = `ada-3d-badge ada-cat-${feat.category}`;
            badgeEl.setAttribute('aria-label', `${feat.title} (${feat.location}). Click to inspect.`);
            badgeEl.innerHTML = `
                <span class="ada-badge-code">${feat.buildingCode}</span>
                <span class="ada-badge-text">${feat.badge}</span>
            `;
            badgeEl.style.pointerEvents = 'auto';
            badgeEl.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.onSelectFeature) this.onSelectFeature(feat);
            });

            const labelObj = new CSS2DObject(badgeEl);
            labelObj.position.set(0, 3.6, 0);
            nodeGroup.add(labelObj);
            this.labelObjects.push(labelObj);

            this.group.add(nodeGroup);

            // 5. Accessible Route Path Segment (if routeFrom is specified)
            if (Array.isArray(feat.routeFrom) && feat.routeFrom.length === 2) {
                const [rx, rz] = feat.routeFrom;
                const dist = Math.hypot(feat.x - rx, feat.z - rz);
                const steps = Math.max(4, Math.ceil(dist / 1.5));
                for (let i = 0; i < steps; i++) {
                    if (i % 2 === 1) continue; // High-contrast dashed barrier-free path
                    const t0 = i / steps;
                    const t1 = Math.min(1, (i + 0.7) / steps);
                    const x0 = THREE.MathUtils.lerp(rx, feat.x, t0);
                    const z0 = THREE.MathUtils.lerp(rz, feat.z, t0);
                    const x1 = THREE.MathUtils.lerp(rx, feat.x, t1);
                    const z1 = THREE.MathUtils.lerp(rz, feat.z, t1);
                    const mx = 0.5 * (x0 + x1);
                    const mz = 0.5 * (z0 + z1);
                    const my = (this.getTerrainHeight ? this.getTerrainHeight(mx, mz) : 0) + 0.20;
                    const segLen = Math.hypot(x1 - x0, z1 - z0);
                    const dashGeo = new THREE.PlaneGeometry(0.55, segLen);
                    dashGeo.rotateX(-Math.PI / 2);
                    const dashMesh = new THREE.Mesh(dashGeo, routeMat);
                    dashMesh.position.set(mx, my, mz);
                    dashMesh.rotation.y = Math.atan2(x1 - x0, z1 - z0);
                    this.group.add(dashMesh);
                }
            }
        });
    }

    setVisible(visible) {
        this.active = Boolean(visible);
        this.group.visible = this.active;
        this.labelObjects.forEach((obj) => {
            if (obj.element) {
                obj.element.style.display = this.active ? 'inline-flex' : 'none';
            }
        });
    }

    updateAnimation(elapsed) {
        if (!this.active) return;
        const s = 1 + Math.sin(elapsed * 3.0) * 0.12;
        this.pulseRings.forEach((ring) => {
            ring.scale.set(s, s, 1);
        });
    }
}

