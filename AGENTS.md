# 3D-Agent

A client-only, static web demo (`RPS-creation`) for manually creating and positioning RPS
(Reference Point System) points on a 3D automotive part. Built with Three.js (loaded from the
jsDelivr CDN). There is no backend, database, build step, package manager, or test/lint tooling.

## Cursor Cloud specific instructions

### Services
- Only one thing needs to run: a static HTTP server that serves the repo root so the demo file
  `RPS-creation` can be opened at `http://localhost:8080/RPS-creation`.
- Three.js and `OrbitControls` load at runtime from `https://cdn.jsdelivr.net/npm/three@0.170.0/...`
  via an import map, so the browser needs outbound network access to jsdelivr.net. If the page is
  a black screen with a spinning cube loader, the CDN fetch is likely blocked/slow.

### Running the demo (non-obvious gotcha)
- The demo file is `RPS-creation` with **no `.html` extension**. Plain `python3 -m http.server`
  serves it as `application/octet-stream`, so the browser **downloads** it instead of rendering.
- Serve it with a `text/html` content-type override. A ready-made helper is used during setup:
  `python3 /tmp/rps_server.py 8080 /workspace` (subclasses `SimpleHTTPRequestHandler` to force
  `text/html` for `RPS-creation`), then open `http://localhost:8080/RPS-creation`.
- Alternatively, serve a copy/symlink that has a `.html` extension, or use any static server that
  lets you set the content type. Do not rename the tracked repo file.

### Lint / test / build
- None exist. There is no lint config, test suite, or build step. "Running" the app == serving the
  static file and opening it in a WebGL-capable browser.

### Hello-world sanity check
Create an RPS point (`+ 创建 RPS 点`), click the 3D model to place it, then `确认坐标`; the right
panel progress should update to `1/1 个点已确定坐标`.
