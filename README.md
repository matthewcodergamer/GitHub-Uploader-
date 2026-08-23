# Crain GitHub Uploader v16 — React

React/Vite migration of the v15 single-file Crain uploader.

## Preserved uploader behavior

- Folder-aware importing: real relative paths win.
- Same filenames in different folders stay separate.
- Exact complete destination-path collisions are the only duplicate conflict.
- Background auto-arrange for known Crain project files.
- `.gitignore` and `.nojekyll` support files when appropriate.
- Editable `Import from → GitHub path` review.
- iOS/Safari first-picker reliability fallback (`input`, `change`, focus, pageshow, visibility retries).
- GitHub account/repository browsing.
- Direct GitHub Git Data API push with safe fast-forward retry protection.
- Empty repository initialization.
- Saved repository/token preference in localStorage.
- Light/dark mode.
- Phone portrait, iPhone landscape, tablet, laptop, and desktop layouts.

## Liquid Glass

The two intentional glass surfaces use the real React package:

```bash
npm i @samasante/liquid-glass
```

`src/components/LiquidGlass.jsx` contains the subtle optics tuning. Foreground labels and icons remain normal React content so they stay crisp.

## Crain icon

The v15 blue iOS-style folder silhouette is preserved. v16 adds a white document and a blue document visibly entering the folder, so the icon communicates **files → folder/repository** instead of showing a folder by itself.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The deployable static site is generated in `dist/`.

## GitHub Pages

A Pages workflow is included at `.github/workflows/deploy-pages.yml`.

1. Push this project to a GitHub repository.
2. In **Settings → Pages**, choose **GitHub Actions** as the source.
3. Push to `main` or run the workflow manually.

Vite uses `base: './'`, so the same build works on a GitHub Pages project subpath or a custom domain.

## GitHub token

Crain performs uploads in the browser. Use a fine-grained personal access token limited to the repository you intend to update, with **Contents: Read and write**. If you upload workflow files, grant the workflow permission GitHub requires.
