import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * TreeFoundry — High-Performance Procedural 3D Tree, Foliage & Campus Landscape Generator
 * Merges per-tree trunk/limb geometry and canopy puffs for minimal draw calls and 60 FPS wind sway.
 */
export class TreeFoundry {
    constructor(textureLoader = new THREE.TextureLoader()) {
        this.loader = textureLoader;
        this.animatedTrees = [];
        this.foliageMaterials = {};
        this.season = 'summer';
        this.windStrength = 1.0;

        this._initMaterials();
    }

    _initMaterials() {
        const barkTextures = this._createProceduralBarkTextures();

        this.barkMaterial = new THREE.MeshLambertMaterial({
            name: 'FoundryBark',
            map: barkTextures.map,
            color: new THREE.Color('#6e503b')
        });

        this.foliageMaterials = {
            pine: new THREE.MeshLambertMaterial({ color: '#1f4f32', flatShading: true }),
            maplePrimary: new THREE.MeshLambertMaterial({ color: '#34743f', flatShading: true }),
            mapleSecondary: new THREE.MeshLambertMaterial({ color: '#488e49', flatShading: true }),
            ornamental: new THREE.MeshLambertMaterial({ color: '#5a9e52', flatShading: true }),
            shrub: new THREE.MeshLambertMaterial({ color: '#2c6438', flatShading: true })
        };
    }

    _createProceduralBarkTextures() {
        const diff = document.createElement('canvas');
        diff.width = 64;
        diff.height = 128;
        const dCtx = diff.getContext('2d');

        dCtx.fillStyle = '#5c402c';
        dCtx.fillRect(0, 0, 64, 128);

        for (let i = 0; i < 90; i++) {
            const x = Math.random() * 64;
            const y = Math.random() * 128;
            const h = 10 + Math.random() * 25;
            dCtx.fillStyle = i % 2 === 0 ? '#4a3221' : '#70513a';
            dCtx.fillRect(x, y, 2, h);
        }

        const map = new THREE.CanvasTexture(diff);
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.colorSpace = THREE.SRGBColorSpace;
        return { map };
    }

    setSeason(season = 'summer') {
        this.season = season;
        const palettes = {
            summer: {
                pine: '#1f4f32',
                maplePrimary: '#34743f',
                mapleSecondary: '#488e49',
                ornamental: '#5a9e52',
                shrub: '#2c6438'
            },
            autumn: {
                pine: '#214d30',
                maplePrimary: '#d96b27',
                mapleSecondary: '#e89c31',
                ornamental: '#c43c29',
                shrub: '#426b36'
            },
            spring: {
                pine: '#255c3a',
                maplePrimary: '#52a447',
                mapleSecondary: '#74bd57',
                ornamental: '#f2b6c6',
                shrub: '#397a44'
            },
            winter: {
                pine: '#2d5944',
                maplePrimary: '#7d8c85',
                mapleSecondary: '#9fb0a8',
                ornamental: '#b8c7c2',
                shrub: '#3d5c47'
            }
        };

        const p = palettes[season] || palettes.summer;
        this.foliageMaterials.pine.color.set(p.pine);
        this.foliageMaterials.maplePrimary.color.set(p.maplePrimary);
        this.foliageMaterials.mapleSecondary.color.set(p.mapleSecondary);
        this.foliageMaterials.ornamental.color.set(p.ornamental);
        this.foliageMaterials.shrub.color.set(p.shrub);
    }

    createTree(species = 'bigleaf-maple', scale = 1.0, seed = Math.random() * 100) {
        const treeGroup = new THREE.Group();
        treeGroup.userData = { isTree: true, species, scale, seed };

        let crownMesh;

        if (species === 'ponderosa-pine') {
            const trunkH = 5.2;
            const trunkGeo = new THREE.CylinderGeometry(0.22, 0.48, trunkH, 7);
            trunkGeo.translate(0, trunkH * 0.5, 0);
            const trunk = new THREE.Mesh(trunkGeo, this.barkMaterial);
            treeGroup.add(trunk);

            const boughGeos = [];
            const tiers = 5;
            for (let i = 0; i < tiers; i++) {
                const tRatio = i / (tiers - 1);
                const radius = 2.9 * (1 - tRatio * 0.62);
                const coneH = 2.8 * (1 - tRatio * 0.3);
                const coneGeo = new THREE.ConeGeometry(radius, coneH, 8);
                coneGeo.rotateY((i * 1.1) + seed);
                coneGeo.translate(0, 3.0 + i * 1.55, 0);
                boughGeos.push(coneGeo);
            }
            crownMesh = new THREE.Mesh(mergeGeometries(boughGeos, false), this.foliageMaterials.pine);
            crownMesh.castShadow = true;
        } else if (species === 'ornamental-pear') {
            const trunkH = 2.8;
            const trunkGeo = new THREE.CylinderGeometry(0.16, 0.30, trunkH, 6);
            trunkGeo.translate(0, trunkH * 0.5, 0);
            treeGroup.add(new THREE.Mesh(trunkGeo, this.barkMaterial));

            const crownGeos = [];
            const mainCrownGeo = new THREE.DodecahedronGeometry(2.1, 1);
            mainCrownGeo.scale(0.95, 1.25, 0.95);
            mainCrownGeo.translate(0, 4.3, 0);
            crownGeos.push(mainCrownGeo);

            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2 + seed;
                const subGeo = new THREE.DodecahedronGeometry(1.25, 0);
                subGeo.translate(Math.cos(angle) * 1.1, 3.8 + (i % 2) * 0.6, Math.sin(angle) * 1.1);
                crownGeos.push(subGeo);
            }
            crownMesh = new THREE.Mesh(mergeGeometries(crownGeos, false), this.foliageMaterials.ornamental);
            crownMesh.castShadow = true;
        } else if (species === 'campus-shrub') {
            const moundGeo = new THREE.DodecahedronGeometry(0.95, 0);
            moundGeo.scale(1.3, 0.72, 1.15);
            moundGeo.translate(0, 0.55, 0);
            crownMesh = new THREE.Mesh(moundGeo, this.foliageMaterials.shrub);
        } else {
            const trunkH = 3.4;
            const trunkGeo = new THREE.CylinderGeometry(0.26, 0.45, trunkH, 7);
            trunkGeo.translate(0, trunkH * 0.5, 0);
            treeGroup.add(new THREE.Mesh(trunkGeo, this.barkMaterial));

            const puffOffsets = [
                [0, 5.4, 0, 2.45],
                [1.55, 4.5, 0.9, 1.75],
                [-1.5, 4.6, 0.85, 1.8],
                [0.2, 4.4, -1.65, 1.75],
                [-0.9, 5.2, -1.1, 1.6],
                [1.1, 5.3, -0.9, 1.55]
            ];
            const puffGeos = puffOffsets.map(([ox, oy, oz, rad]) => {
                const g = new THREE.IcosahedronGeometry(rad, 1);
                g.translate(ox, oy, oz);
                return g;
            });
            crownMesh = new THREE.Mesh(mergeGeometries(puffGeos, false), this.foliageMaterials.maplePrimary);
            crownMesh.castShadow = true;
        }

        treeGroup.add(crownMesh);
        treeGroup.scale.setScalar(scale);
        treeGroup.rotation.y = (seed % (Math.PI * 2));

        this.animatedTrees.push({
            crown: crownMesh,
            phase: seed,
            factor: species === 'campus-shrub' ? 0.35 : 1.0
        });

        return treeGroup;
    }

    populateCampusLandscaping(parentGroup, campusBuildings = []) {
        const treeGroup = new THREE.Group();
        treeGroup.name = 'CampusTrees';

        const curatedPlacements = [
            { x: 35, z: -18, species: 'ponderosa-pine', scale: 1.25 },
            { x: 46, z: -24, species: 'bigleaf-maple', scale: 1.15 },
            { x: 64, z: -14, species: 'ponderosa-pine', scale: 1.3 },
            { x: 78, z: -2, species: 'bigleaf-maple', scale: 1.1 },
            { x: 88, z: 12, species: 'ornamental-pear', scale: 1.0 },
            { x: 76, z: 38, species: 'ponderosa-pine', scale: 1.2 },
            { x: 54, z: 42, species: 'bigleaf-maple', scale: 1.15 },
            { x: 30, z: 24, species: 'ornamental-pear', scale: 1.05 },
            { x: 22, z: 6, species: 'bigleaf-maple', scale: 1.2 },

            { x: 14, z: 16, species: 'ornamental-pear', scale: 1.0 },
            { x: 6, z: 12, species: 'campus-shrub', scale: 1.1 },
            { x: 10, z: 8, species: 'campus-shrub', scale: 0.95 },
            { x: -10, z: 22, species: 'bigleaf-maple', scale: 1.1 },
            { x: -22, z: 32, species: 'ornamental-pear', scale: 1.0 },
            { x: -24, z: 46, species: 'ponderosa-pine', scale: 1.18 },
            { x: 16, z: 48, species: 'bigleaf-maple', scale: 1.05 },

            { x: -55, z: 12, species: 'ornamental-pear', scale: 0.95 },
            { x: -48, z: -20, species: 'bigleaf-maple', scale: 1.08 },
            { x: -28, z: -22, species: 'ornamental-pear', scale: 1.0 },
            { x: 24, z: -28, species: 'ponderosa-pine', scale: 1.22 },
            { x: 38, z: -38, species: 'bigleaf-maple', scale: 1.1 },

            { x: -10, z: 72, species: 'ponderosa-pine', scale: 1.15 },
            { x: -28, z: 85, species: 'bigleaf-maple', scale: 1.1 },
            { x: 18, z: 118, species: 'ponderosa-pine', scale: 1.25 },
            { x: 46, z: 104, species: 'bigleaf-maple', scale: 1.12 },
            { x: 62, z: 84, species: 'ornamental-pear', scale: 1.05 },
            { x: 52, z: 58, species: 'ornamental-pear', scale: 1.0 },

            { x: -85, z: 6, species: 'bigleaf-maple', scale: 1.1 },
            { x: -102, z: -8, species: 'ponderosa-pine', scale: 1.2 },
            { x: -64, z: -32, species: 'ornamental-pear', scale: 0.95 },

            { x: 42, z: -112, species: 'bigleaf-maple', scale: 1.22 },
            { x: 55, z: -106, species: 'ornamental-pear', scale: 1.05 },
            { x: 36, z: -128, species: 'ponderosa-pine', scale: 1.25 },
            { x: 96, z: -135, species: 'bigleaf-maple', scale: 1.15 },

            { x: -42, z: -108, species: 'ponderosa-pine', scale: 1.15 },
            { x: -78, z: -112, species: 'bigleaf-maple', scale: 1.1 }
        ];

        for (let i = -4; i <= 5; i++) {
            curatedPlacements.push({
                x: 68 + i * 18,
                z: 78 - i * 24,
                species: i % 2 === 0 ? 'ornamental-pear' : 'bigleaf-maple',
                scale: 0.92 + (Math.abs(i) % 3) * 0.08
            });
            curatedPlacements.push({
                x: -60 + i * 22,
                z: -38 + i * 14,
                species: i % 3 === 0 ? 'ponderosa-pine' : 'ornamental-pear',
                scale: 0.9 + (Math.abs(i) % 2) * 0.12
            });
        }

        curatedPlacements.forEach((item, idx) => {
            const tooClose = campusBuildings.some((b) => {
                const dx = item.x - b.center[0];
                const dz = item.z - b.center[1];
                return Math.hypot(dx, dz) < 16;
            });
            if (!tooClose || idx < 36) {
                const tree = this.createTree(item.species, item.scale, idx * 3.71);
                tree.position.set(item.x, 0, item.z);
                treeGroup.add(tree);
            }
        });

        parentGroup.add(treeGroup);
        return treeGroup;
    }

    updateWind(elapsedTime) {
        if (this.windStrength <= 0.01) return;
        const amp = 0.02 * this.windStrength;
        for (let i = 0; i < this.animatedTrees.length; i++) {
            const item = this.animatedTrees[i];
            const t = elapsedTime * 1.5 + item.phase;
            item.crown.rotation.z = Math.sin(t) * amp * item.factor;
        }
    }
}
