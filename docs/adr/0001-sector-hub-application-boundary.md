# ADR 0001: Sector Hub application boundary

Status: accepted for implementation  
Date: 2026-08-14

## Decision

Build the public Sector Hub in 'apps/sector-hub' as a Next.js application. Keep the existing 'vite-version' application responsible for tools, accounts, dashboards, models and marketplace pages.

Shared code is initially limited to framework-neutral contracts and brand tokens. The hub refers to tools and commerce through validated links; it does not import marketplace entities into editorial content.

## Consequences

- Public content can ship server-rendered metadata, structured data and sitemaps independently.
- Existing model and marketplace behavior remains untouched.
- Two deployments and cross-surface analytics require explicit environment configuration.
- The domain/canonical decision must be completed before migrating the Vite editorial prototype URLs.

## Rollback

Because the implementation is additive, removing the hub workspace package leaves the Vite application operational. No existing route is redirected until launch parity is approved.
