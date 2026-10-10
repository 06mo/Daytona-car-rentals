---
name: design-with-evidence
description: Design and review UI, customer journeys, and frontend changes using existing conventions, selective references, explicit interaction states, and rendered-screen evidence.
---

# Design with evidence

Start with the customer's task, the current friction, and the requested scope.
If the launcher starts elsewhere, locate the actual project checkout and read
its `AGENTS.md` before working; a temporary session directory is not the project.
In a review-only task, inspect and report; do not implement recommendations.

1. Read the project's design guide and relevant components/styles. Identify
   approved decisions separately from proposals and implementation details.
   Preserve existing work and reuse approved patterns for routine changes.
2. If a genuinely new pattern needs research, inspect two or three relevant
   references. Use [the catalog](references/catalog.md) as a starting point,
   not a mandatory browsing tour. Record exact URL, date, pattern, adaptation,
   rationale and access/evidence limits. A gallery example is inspiration, not
   proof of accessibility or task success. Never bypass access controls,
   purchase subscriptions, bulk-download galleries, or copy proprietary assets.
3. Briefly explain what to adapt and why it helps the customer's task. Define
   loading, empty, success, error, disabled and recovery states, including what
   persists, what is merely selected, what the server has saved, and what the
   next action does. Mark non-applicable states with a reason.
4. When implementation is authorized, use existing components and actual design
   tokens. Keep primary actions clear; do not add duplicate controls or require
   unnecessary repeated entry. Preserve data, authentication and business rules.
5. Open rendered desktop and mobile screens, inspect them visually, and exercise
   the interaction. Use [the review checklist](references/review-checklist.md).
   Inspect 320px, 390px and 1440px widths for responsive web tasks. Test keyboard
   operation and realistic failure/recovery, not only the happy path. A screenshot
   file existing, DOM assertions, or passing tests alone is not visual inspection.
6. Report concrete observations with state, viewport, reproduction and evidence.
   Separate measured defects, design suggestions and untested areas. Do not call
   simulated camera input hardware verification or local tests hosted validation.
   Record a short reusable lesson in the project's design lessons file: context,
   evidence, implication, decision status. Do not promote an agent suggestion to
   an owner-approved rule without approval.

Keep the skill portable. Locate the current project's guide through its
instructions; do not apply Daytona branding or rental rules to unrelated projects.
