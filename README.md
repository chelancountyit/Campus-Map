# Chelan County Campus — Interactive 3D Map & Asset Foundry

Interactive 3D space of the **Chelan County Government Campus** in downtown Wenatchee, WA (`350 Orondo Ave`, `400 Douglas St`, `300–415 Washington St`, and `310 Douglas St`), powered by **Three.js** with local vendor bundles, real OpenStreetMap building footprints & street network, and a real-time **3D Wall & Tree Foundry**.

## Key Features

- **Real-World 3D Campus Footprints & Street Grid**:
  - **Chelan County Courthouse** (`350 Orondo Ave` — 5 floors: Treasurer, Assessor, Auditor, Elections, District Court, Superior Court Clerk)
  - **County Administration Building** (`400 Douglas St` — 3 floors: Board of County Commissioners Chambers, HR, IT/GIS, Facilities)
  - **Law & Justice Building** (`401 Washington St` — 5 floors: Sheriff's Office, Emergency Management, Prosecuting Attorney, Superior Court)
  - **Chelan County Regional Justice Center (East & West Wings)** (`401–405 Washington St`)
  - **Community Development, Public Works & Juvenile Justice Center** (`316 & 300 Washington St`)
  - **Natural Resources & Washington St Campus Annex** (`410–415 Washington St`)
  - **WSU Extension & Campus North Annex** (`400 Washington St`)
  - **Wenatchee Public Library (NCW Libraries)** (`310 Douglas St`)
- **3D Building Wall Foundry (`js/foundry/WallFoundry.js`)**:
  - Combines local PBR masonry maps (`assets/textures/walls/`) with procedural architectural synthesis (running-bond brick, limestone plinths/cornices, precast concrete panels, security slit windows, curtain-wall glazing, normal/bump relief, and dynamic day/night interior window illumination).
  - Building 401's precast concrete is calibrated against the campus photo survey, with warmer concrete, finer aggregate relief, visible panel reveals, and a matte roughness map.
- **3D Tree & Foliage Foundry (`js/foundry/TreeFoundry.js`)**:
  - Multi-species procedural trees (`Ponderosa Pine`, `Bigleaf Maple`, `Ornamental Blossom Pear`, `Manicured Campus Shrub`) with bark PBR textures (`assets/textures/trees/`), live wind canopy animation, seasonal foliage switching (`Summer`, `Wenatchee Autumn`, `Apple Blossom Spring`, `Winter`), and interactive click-to-plant mode.
- **Full Local Three.js Bundle (`vendor/three/`)**:
  - Includes `three.module.js`, `three.core.js`, and all 37 `three/addons/` JSM directories (`controls`, `renderers`, `objects`, `environments`, `loaders`, `postprocessing`, `shaders`, `csm`, etc.) for zero-bundler execution in IIS or any static server.

## Development

- Run `npm run build` after changing source files in `js/` to regenerate the browser bundle.
- Run `npm start` to serve the map locally at `http://localhost:3080`.
