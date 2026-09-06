# EA Forests

EA Forests is a forestry intelligence and decision-support MVP for East African forestry investments and operations. The product combines analytical models, market context, asset data, and evidence-based assumptions to support site selection, commercial viability screening, and market opportunity review.

## What this repository contains

- Frontend: Vite + React + TypeScript app in [vite-version](vite-version)
- Backend: FastAPI service in [backend](backend)
- Shared contracts and package metadata in [packages](packages)
- Project docs and release notes in [docs](docs)

The [EO observation architecture](docs/architecture/eo-observation-architecture.md)
defines the canonical design and implementation sequence for extending Earth Engine
monitoring into asset evidence and field verification. It is an architecture
specification; the EO feature has not been implemented.

## Core product intent

This repository is not a generic template. It is a functional MVP for:

- exploring forestry market and asset data
- running the live forestry model workflows
- understanding assumptions and evidence behind model outputs
- reviewing commercially relevant market opportunities
- presenting a truthful, production-minded product shell without fake checkout or template-era surfaces

## Current status

The app deliberately keeps real forestry analytics and model pages active while marking preview-only dashboard surfaces and deferred functionality clearly. It does not present fictional investor portfolio activity as live data.

## Local development

### Frontend

```bash
cd vite-version
pnpm install
pnpm dev
```

### Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Set the frontend API target when required:

```bash
VITE_API_URL=http://127.0.0.1:8000
```

## Environment notes

- Configure permissioned origins for CORS in the backend with `ALLOWED_ORIGINS`.
- Keep Earth Engine credentials and project configuration in your local environment when using EE-backed data sources.
- Do not treat the current marketplace or auth surfaces as production checkout or account-management flows unless real backend integrations are added.

## Important

This repository is intended for release closure, operational truthfulness, and deployable MVP hosting once environment variables and credentials are supplied. It is not a full stochastic-control research implementation and it does not add speculative product features beyond the validated forestry use cases in the app.
