# Public market release

Branch: `release/public-market`

## Vercel

- Project: `ea-forests-public`
- Project root: repository root
- Framework: Vite
- Install: `pnpm install --frozen-lockfile`
- Build: `pnpm --dir vite-version build`
- Output: `vite-version/dist`

The checked-in `vercel.json` supplies these settings and the SPA fallback.

## Public configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_PUBLIC_SITE_URL` | Recommended | Canonical public origin for metadata. Use the final custom domain when attached. |
| `VITE_GTM_ID` | No | Enables Google Tag Manager. |
| `VITE_API_URL` | Required for model execution | Public FastAPI base URL ending in `/api`. Omit until a public backend exists. |
| `VITE_BASENAME` | No | Only needed when hosted below a URL subpath. |

Every `VITE_*` value is embedded in the browser bundle and must be treated as public. Secrets, database URLs, Earth Engine credentials, and `CANONICAL_API_TOKEN` must never be configured in this frontend project.

## Public SSMT layer

The sector map exposes SSMT as an opt-in layer. The public catalog contains only species represented in the planting-material catalog and defaults to Eucalyptus grandis / Very suitable, so no SSMT files are downloaded during initial page load.

Generate the public catalog from the full processed SSMT directory with:

```powershell
python vite-version/scripts/optimize-basic-ssmt.py `
	--input-dir <full-basic-ssmt-directory> `
	--output-dir vite-version/public/data/basic-ssmt `
	--species-file vite-version/src/app/shop/data/planting-images.json
```

The optimizer repairs invalid geometries and dissolves adjacent polygons only within identical country, species, and suitability chunks. It must not merge across those attributes.

## Route boundary

The public router allowlists the landing page, market/shop pages and products, and approved model pages. All other paths resolve to the public 404 component and their lazy modules are absent from the release route graph.