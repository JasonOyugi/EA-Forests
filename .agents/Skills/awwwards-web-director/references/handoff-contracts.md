# Coding-agent handoff contracts

Use the minimum sufficient structure. The shared brief contains all product and technical facts; a bot wrapper changes operating behavior without duplicating the brief.

## Shared technical brief

```markdown
# Outcome
[One exact, testable frontend outcome]

## Repository context
- Repository: [OWNER/REPO or local path]
- Working directory: [PATH]
- Target branch/base: [BRANCH]
- Stack confirmed from repository: [STACK]
- Target route and component ownership: [ROUTE / FILES]

## Reference and fidelity
- Reference: [URL / SCREENSHOTS / RECORDING]
- Reproduce closely: [LAYOUT / TYPOGRAPHY / INTERACTIONS / MOTION]
- Replace: [COPY]
- Preserve from target: [BUSINESS LOGIC / DATA / ANALYTICS / ACCESSIBILITY]
- Asset rule: use only authorized project assets or explicit placeholders.

## Observed design contract
[Measured structure, hierarchy, states, responsive transformations]

## Implementation specification
### Components and files
[Existing reuse, new components, paths, interfaces]

### Design tokens
[Type, color, spacing, sizing, radii, border, shadow, z-index]

### Interaction and motion
[Trigger, from/to, timing, easing, stagger, scroll range, interruption, reset]

### Responsive behavior
[Behavior by viewport, not just breakpoint names]

### Accessibility and performance
[Semantic, keyboard, focus, contrast, motion fallback, budgets]

## Execution sequence
1. Inspect the named files and confirm assumptions.
2. Implement in dependency order.
3. Run repository checks.
4. Preview and compare at specified viewports and states.
5. Correct discrepancies before reporting completion.

## Required verification
- Commands: [FORMAT / TYPECHECK / LINT / TEST / BUILD]
- Viewports: [WIDTH × HEIGHT]
- Interactions: [LIST]
- Visual comparison: [REFERENCE STATES]

## Deliverables
- Working implementation or patch.
- Concise changed-file summary.
- Command and visual verification evidence.
- Remaining deviations and why they remain.

## Acceptance criteria
- [Observable fidelity criterion]
- [Responsive criterion]
- [Interaction criterion]
- [Accessibility criterion]
- [Performance/build criterion]

## Guardrails
- Preserve unrelated user changes.
- Do not invent file paths or APIs; inspect first.
- Do not copy source code or unlicensed assets from the reference.
- State material assumptions and blockers; otherwise proceed autonomously.
```

## Codex wrapper

```markdown
Execute the shared brief in the repository. Inspect applicable instructions and the working tree before editing. Use available preview/browser tools for screenshot and interaction comparison. Implement, run safe checks, iterate on discrepancies, and lead the handoff with the completed outcome and evidence. Do not push, deploy, or open a pull request unless explicitly requested.
```

## Claude Code wrapper

```markdown
Execute the shared brief. First perform focused repository reconnaissance and return a short file-aware plan, then continue directly unless a material ambiguity blocks implementation. Do not speculate about files or APIs. Preserve unrelated changes, implement in small coherent edits, run the specified commands, visually compare the result, and report evidence plus remaining deviations.
```

## GitHub Copilot wrapper

```markdown
Treat the shared brief as the source of truth. Break implementation into small, file-scoped tasks with prerequisites and completion checks. For each task, name the files to inspect before editing, the exact behavior to add, and the verification required. Keep generated code consistent with repository conventions and do not mark the work complete until the acceptance criteria pass.
```

## Review prompt

```markdown
Compare the current implementation against the supplied reference at every specified viewport and interaction state. Report Blocker, Major, and Minor discrepancies. Each finding must include evidence, affected viewport/state, likely cause, exact file-aware correction, and verification step. If editing is authorized, fix findings in impact order and rerun all checks.
```

