# NexusEngine LOD Showcase

Interactive WebGL2 laboratory for comparing a high-resolution recursive tree mesh, a reduced mesh, and three Gaussian capture LOD tiers across a large instanced forest.

## Features

- Fixed-aspect resizable game viewport
- Free-flight camera
- High- and low-resolution fractal mesh trees
- Gaussian High, Medium, and Low representations
- Automatic distance-based LOD selection
- Manual LOD forcing
- Up to 100,000 generated trees
- View-cone and distance culling
- Live FPS, visible-instance, Gaussian, triangle, resolution, and rebatch statistics
- Fully standalone browser application with no runtime dependencies

## Controls

- Click the viewport to capture the mouse
- `WASD` to fly
- `Q` / `E` to move down / up
- Hold `Shift` to boost
- Mouse wheel to change field of view
- `R` to reset the camera

## Deployment

Every push to `main` deploys the repository root through GitHub Pages using `.github/workflows/pages.yml`.

Live site: `https://luminarylabs-agents.github.io/NexusEngine-LOD-Showcase/`
