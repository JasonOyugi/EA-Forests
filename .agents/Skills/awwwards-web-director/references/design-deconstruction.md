# Design deconstruction framework

Use this framework for live pages, screenshots, and recordings. Report only dimensions that can be measured or clearly estimated. Distinguish observation from inference.

## Contents

- Context and intent
- Composition and geometry
- Visual hierarchy
- Typography
- Color, surface, and image treatment
- Interaction anatomy
- Psychology and UX rationale
- Responsive behavior
- Accessibility and performance
- Fidelity comparison order

## 1. Context and intent

- Identify page type, likely audience, primary job, primary action, and emotional register.
- Trace the intended attention path from entry to action.
- Record what the design deliberately emphasizes, delays, or hides.

## 2. Composition and geometry

Measure or estimate:

- viewport and container widths;
- column count, gutters, outer margins, alignment anchors, and maximum line lengths;
- section heights, vertical rhythm, whitespace ratios, overlap, and negative space;
- aspect ratios, crop behavior, focal points, and object-fit rules;
- layering, stacking contexts, clipping, masks, and sticky or pinned boundaries.

Describe the layout mechanism most likely to reproduce it: grid, flex, normal flow, absolute composition, sticky panels, container queries, or a combination.

## 3. Visual hierarchy

Map each element's role: orientation, headline, proof, explanation, action, navigation, or decoration. Explain hierarchy through observable variables:

- size and scale contrast;
- weight, color, position, isolation, and repetition;
- entry timing and motion emphasis;
- reading order and section pacing.

Use Gestalt principles only when tied to evidence: proximity, similarity, common region, continuation, closure, symmetry, or figure-ground.

## 4. Typography

Record:

- family classification and likely fallback rather than guessing an exact font;
- display, heading, body, label, caption, and numeric roles;
- approximate size, weight, line height, tracking, case, measure, and wrap behavior;
- fluid scaling behavior and breakpoint changes;
- whether typography supplies character, authority, intimacy, restraint, or urgency.

Prefer an existing licensed project font. If the reference font is not authorized, specify an available metric and character match.

## 5. Color, surface, and image treatment

Identify functional roles rather than isolated hex values:

- canvas, surface, elevated surface, text, muted text, accent, border, focus, and status;
- contrast structure and how color directs action;
- gradients, noise, blend modes, tints, glows, shadows, and depth cues;
- image grade, crop, saturation, temperature, contrast, and overlays;
- light and dark behavior when present.

## 6. Interaction anatomy

For every material interaction, record:

| Field | Required detail |
|---|---|
| Element | Stable component or role name |
| Trigger | Load, hover, focus, press, scroll, drag, route change, timer |
| Initial state | Position, scale, opacity, clip, color, blur, visibility |
| Transition | Ordered state changes and concurrency |
| Final state | Exact visual and semantic result |
| Timing | Duration, delay, stagger, scroll range |
| Easing | Named curve or cubic-bezier estimate |
| Interrupt | Reverse, cancel, snap, queue, or continue |
| Input | Pointer, keyboard, touch, wheel, reduced motion |
| Reset | Mouse leave, blur, scroll back, route exit, completion |

Differentiate continuous scroll-linked motion from threshold-triggered animation. Note pinning, scrub, velocity response, and nested scroll risks.

## 7. Psychology and UX rationale

Infer only what the evidence supports:

- **Attentional control**: contrast, isolation, motion onset, directional cues.
- **Cognitive load**: chunking, progressive disclosure, familiar patterns, reduced choices.
- **Trust**: legibility, restraint, evidence, consistency, feedback, transparency.
- **Agency**: clear affordances, reversible actions, progress, predictable navigation.
- **Emotional pacing**: tension and release, density changes, silence, surprise, reward.
- **Perceived performance**: immediate feedback, skeletons, staged content, optimistic transitions.

Phrase conclusions as “This likely works because…” and cite the observed feature. Do not invent test results, conversion claims, or the original designer's intentions.

## 8. Responsive behavior

Compare at least:

- 1440 × 900 desktop;
- 1024 × 768 tablet or small laptop;
- 390 × 844 modern mobile;
- 360 × 800 narrow mobile.

Record changes in order, grid, typography, crop, visibility, interaction modality, sticky behavior, touch targets, and motion complexity. Do not treat mobile as a uniformly scaled desktop.

## 9. Accessibility and performance

Check semantic order, keyboard path, visible focus, contrast, target size, announcements, reduced motion, zoom, content reflow, autoplay, and seizure risk. Identify expensive blur, filters, large media, layout-bound animation, scroll listeners, and overdraw.

## 10. Fidelity comparison order

Compare rendered output in this order:

1. Page geometry and section heights.
2. Typography and line breaks.
3. Spacing and alignment.
4. Image crop and surface treatment.
5. Interaction sequence and motion timing.
6. Color, borders, shadows, and micro-polish.

Fix the first failing layer before polishing later layers.
