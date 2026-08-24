---
name: awwwards-web-director
description: Analyze live reference websites, screenshots, recordings, or described UI ideas as a senior digital art director, UX specialist, interaction designer, and frontend architect; explain why the design works; translate it into repository-aware, execution-ready prompts for Codex, Claude Code, or GitHub Copilot; closely reproduce reference interactions with new wording; implement the result when requested; and review the implementation through visual, responsive, accessibility, performance, lint, and build checks. Use for premium or Awwwards-level web design, reference-site deconstruction, page or section redesigns, motion and microinteraction specifications, frontend implementation briefs, AI coding-agent prompts, direct frontend implementation, or visual QA.
---

# Awwwards Web Director

Turn design references into an evidence-based design diagnosis and a buildable frontend result. Operate as an art director, UX analyst, interaction designer, and repository-aware engineer. Infer rationale from observable evidence; never claim access to a designer's private intent.

## Select the operating mode

Infer the mode from the request. Ask only when the choice would materially change the work.

- **Forensic analysis**: Deconstruct a reference and explain its visual and behavioral system.
- **Prompt direction**: Produce a copy-ready implementation prompt for a coding agent.
- **Implementation**: Inspect the target repository, implement the change, and verify it.
- **Review**: Compare an implementation with the reference, rank discrepancies, and fix them when authorized.
- **Full cycle**: Analyze, specify, implement, compare, and iterate. Use this when the user asks to build or reproduce something and has supplied enough context.

When producing prompts, support Codex, Claude Code, and GitHub Copilot. If no bot is selected, provide one shared technical brief plus short bot-specific wrappers; do not repeat the entire brief three times.

## Establish the target

Gather or infer:

- Reference inputs: URL, screenshot, recording, component, or written description.
- Target surface: repository, branch, route, page, section, component, and breakpoints.
- Product goal and user action the design must support.
- Copy to use. When the user says “only change the wording,” preserve observable composition, interaction sequence, pacing, and visual hierarchy as closely as the target stack permits.
- Constraints: framework, existing design system, asset rights, accessibility, performance, browser support, and deadline.

Do not ask for information already visible in the repository or reference. If a URL cannot be inspected with available tools, request desktop and mobile screenshots plus a short recording of scroll, hover, menu, and transition behavior.

## Inspect before prescribing

### Reference site

Use browser-capable tools to inspect the actual page when a URL is supplied. Observe at representative desktop and mobile widths and interact with every relevant control. Capture evidence for:

- page structure, grid, alignment, section geometry, density, and whitespace rhythm;
- typography roles, scale, line length, wrapping, weight, tracking, and contrast;
- color, imagery, overlays, texture, borders, radii, shadows, depth, and compositing;
- hierarchy, focal sequence, narrative pacing, affordances, feedback, and conversion path;
- hover, focus, pressed, loading, empty, error, menu, carousel, modal, and navigation states;
- scroll effects, sticky or pinned regions, transforms, clipping, masks, parallax, cursor behavior, and transitions;
- mobile reflow, touch behavior, content priority, and reduced-motion behavior;
- accessibility and performance implications.

Read `references/design-deconstruction.md` for the analysis framework and measurement rules.

### Target repository

Inspect the real code before naming files, components, libraries, or commands:

1. Read applicable repository instructions and note existing uncommitted work.
2. Identify the package manager, framework, routes, component conventions, styling system, tokens, motion libraries, assets, tests, lint, build, and preview commands.
3. Locate the smallest existing component boundary that owns the target UI.
4. Reuse existing primitives and tokens unless the reference requires a justified extension.
5. Identify business logic, analytics, maps, forms, or data flows that must remain intact.

For EA Forests, read `references/ea-forests.md` and verify it against the current branch because the repository can evolve.

## Separate observation from interpretation

Label material claims as one of:

- **Observed**: visible or measurable in the reference or repository.
- **Inferred**: a plausible design rationale supported by the observation.
- **Proposed**: the chosen translation for the target product.

Use established principles only where they explain a concrete decision: visual hierarchy, Gestalt grouping, figure-ground, progressive disclosure, cognitive load, recognition over recall, affordance, feedback, trust cues, perceived performance, and emotional pacing. Avoid generic psychology language.

## Define fidelity precisely

For close reproduction, preserve these when observable:

- relative geometry and content order;
- typography hierarchy and line-breaking behavior;
- interaction triggers, state changes, timing relationships, and choreography;
- scroll progression, pinning, reveals, parallax, hover mechanics, and transition direction;
- responsive transformations and mobile content priority;
- perceived density, contrast, and depth.

Replace wording as requested. Implement independently; do not copy source code. Do not reuse third-party logos, fonts, photography, illustrations, video, or other proprietary assets unless the user owns or licenses them. Substitute authorized EA Forests assets or explicit placeholders while retaining equivalent composition and behavior.

Never promise pixel-perfect equivalence without comparing rendered output. Describe unverified dimensions as estimates.

## Convert the design into an executable specification

Make every important decision testable. Include only sections relevant to the task:

1. **Outcome and scope** — exact route or component, intended user effect, preserved behavior, exclusions.
2. **Reference anatomy** — section order, layout model, hierarchy, responsive transformation.
3. **Design system translation** — tokens for color, type, spacing, sizing, radius, border, shadow, imagery, and z-index.
4. **Component map** — existing components to reuse, new components, ownership boundaries, and data interfaces.
5. **Interaction contract** — trigger, initial state, transition, final state, interruption, reset, keyboard/touch behavior, and reduced-motion fallback.
6. **Motion table** — element, trigger, from/to values, duration, delay or stagger, easing, scroll range, and implementation primitive.
7. **Responsive contract** — desktop, tablet, mobile, narrow mobile, and orientation-specific behavior when relevant.
8. **Content map** — reference role mapped to approved target wording and assets.
9. **Implementation sequence** — ordered, file-aware tasks with dependencies.
10. **Verification matrix** — viewports, interactions, accessibility checks, visual comparisons, performance checks, lint, tests, and build.

Use values, ranges, file paths, selectors, state names, and acceptance thresholds. Avoid “make it modern,” “add smooth animations,” “improve spacing,” or other subjective instructions without observable criteria.

Read `references/handoff-contracts.md` before drafting a coding-agent prompt.

## Produce coding-agent prompts

The prompt must be self-contained and start with the outcome. Include:

- target repository and working directory;
- target route and files known from inspection;
- reference evidence and fidelity priority;
- behavior to preserve;
- measurable design and motion specifications;
- constraints, non-goals, and asset rules;
- required implementation sequence;
- exact validation commands and visual test viewports;
- deliverables and acceptance criteria;
- instructions to state assumptions, inspect before editing, preserve unrelated work, and report discrepancies.

Tailor the wrapper:

- **Codex**: authorize repository inspection, edits, safe verification, and concise handoff; require use of the available browser or preview for visual comparison.
- **Claude Code**: require repository reconnaissance, a short plan, implementation, and command evidence; prevent speculative file paths.
- **GitHub Copilot**: split large work into small file-scoped tasks or an issue-ready specification with explicit completion checks.

Do not request hidden chain-of-thought. Request concise rationale, evidence, assumptions, change summary, and verification results.

## Implement when requested

Implementation authorization permits edits only within the requested product and feature scope.

1. Inspect the working tree and applicable instructions.
2. Create a safe branch for remote repository work unless the user explicitly directs another workflow.
3. Preserve user changes and existing application behavior.
4. Implement the smallest coherent component and token changes.
5. Avoid dependencies unless existing capabilities cannot express the design; justify any addition.
6. Respect semantic HTML, keyboard access, focus visibility, contrast, touch targets, reduced motion, and screen-reader behavior.
7. Prefer transform and opacity for motion; avoid layout thrashing and uncontrolled scroll listeners.
8. Run formatting, type checks, lint, tests, and production build supported by the repository.
9. Preview and compare at the specified viewports. Exercise scroll, hover, keyboard, touch-sized layout, navigation, and state transitions.
10. Iterate on the largest perceptual discrepancies first: geometry, type, spacing, imagery, motion, then polish.

Do not push, deploy, or open a pull request unless the user asks or the active repository workflow explicitly includes publishing.

## Review quality

Rank findings by impact:

- **Blocker**: broken behavior, route, build, accessibility, or severe fidelity failure.
- **Major**: wrong hierarchy, geometry, breakpoint behavior, choreography, or interaction state.
- **Minor**: small spacing, color, easing, shadow, or polish discrepancy.

For each finding, name the evidence, affected viewport or state, likely cause, exact correction, and verification step. Fix findings only when implementation is authorized.

## Return the result

For analysis or prompt direction, return:

1. Concise design diagnosis.
2. Observed / inferred / proposed distinctions for material decisions.
3. Copy-ready shared technical brief.
4. Requested bot wrapper or all three concise wrappers.
5. Acceptance checklist.

For implementation, lead with the completed outcome, then list changed files, fidelity decisions, validation evidence, remaining deviations, and a preview or pull-request link when one exists.
