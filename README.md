# neelresume

Portfolio site: [neelvadlamudi.github.io/neelresume](https://neelvadlamudi.github.io/neelresume/)

Plain HTML and CSS, served by GitHub Pages. The type is [Inter](https://github.com/rsms/inter), self-hosted, under the SIL Open Font License (`fonts/OFL-Inter.txt`).

## Run it locally

```
python3 -m http.server 4173
```

Then open http://127.0.0.1:4173.

## Checks

```
npm ci
npx playwright install --with-deps chromium
npm run check
```

GitHub Actions runs HTML validation, CSS lint, the link checker, axe, Lighthouse, and Playwright on every pull request and push. The Pages deploy job runs only after those checks pass on `main`.

Publishing through that job needs the repository Pages source set to GitHub Actions. Until then, GitHub still publishes the `main` branch directly.

### Responsive regression coverage

`npm run test:e2e` includes the shared device matrix in `tests/support/device-matrix.cjs`:
phones, folded and open foldables, dual-screen hinges, tablet orientations,
laptops, wide desktops, zoom-equivalent reflow and emulated notch insets.
The matrix checks overflow, full-size controls, unclipped copy and initial
visibility, plus card alignment, image fit and header collisions.

Dual-screen devices use one uninterrupted reading pane rather than splitting
text or controls across the physical hinge. Short viewports scroll naturally.
The matrix uses browser emulation; it is not a claim of physical-device testing.
