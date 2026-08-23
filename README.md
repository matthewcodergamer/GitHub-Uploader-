# Crain GitHub Uploader — React v16 (GitHub Pages fixed)

This is the React/Vite version of Crain.

## Why the previous GitHub Pages upload showed a black screen

A Vite React repository is **source code**, not the final static site. The source `index.html` loads `src/main.jsx`, which must be compiled by Vite before GitHub Pages can serve it as an application.

The previous project also used an absolute `/src/main.jsx` URL. On a project site such as:

`https://matthewcodergamer.github.io/GitHub-Uploader-/`

that points to the wrong domain-root path. This fixed project uses a relative source path for development and deploys the compiled `dist/` directory with GitHub Actions.

## Deploy to GitHub Pages

1. Upload **the contents of this folder** to the root of `matthewcodergamer/GitHub-Uploader-`.
2. Keep `.github/workflows/deploy-pages.yml` in the repository.
3. GitHub → repository **Settings** → **Pages**.
4. Under **Build and deployment**, set **Source** to **GitHub Actions**.
5. Open the **Actions** tab and wait for **Deploy Crain React to GitHub Pages** to finish successfully.
6. Open:

   `https://matthewcodergamer.github.io/GitHub-Uploader-/`

Do **not** use `https://matthewcodergamer.github.io/` unless this app is stored in a repository named `matthewcodergamer.github.io`.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Vite writes the deployable site to `dist/`.

## Black-screen protection added

- Visible boot fallback if React never starts.
- App-level React error boundary.
- Liquid Glass is loaded lazily and falls back to CSS if the package cannot initialize.
- GitHub Pages workflow builds `dist/` and uploads **only** the compiled site.
- Project-site base path is explicitly `/GitHub-Uploader-/` in GitHub Actions.
- Removed npm dependency caching from the workflow because the source zip does not ship a lockfile.

## Liquid Glass

The project still uses `@samasante/liquid-glass`. The app does not depend on that package successfully initializing to remain usable: if it fails on a browser, Crain displays the same controls with a CSS glass fallback.
