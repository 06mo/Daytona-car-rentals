# Design lessons

Keep entries short and evidence-specific. A proposal here is not an approved
requirement. Record date, task/state/viewport, observation, evidence, implication
and decision status. Do not accumulate generic rules or customer data.

## 2026-10-10 — upload state language

Owner-approved decision: distinguish selected, uploaded, reviewed and approved.
Source: the document-card request and implementation `59207bc`,
`components/customer/DocumentUpload.tsx`. A replacement can be selected while a
saved image already exists; error recovery must preserve and clearly identify
that saved version. Local synthetic browser evidence:
`/projects/daytona-handoff/document-cards/`. A passing upload test does not by
itself establish that a renter understands the status or next action.

## 2026-10-10 — fresh-session review of document cards

Status: independently observed; proposals below are **not owner-approved changes**.
A fresh Codex session loaded this project's AGENTS, skill, checklist and design
guide, then opened rendered screenshots and exercised synthetic draft uploads
at 320, 390 and 1440px. Evidence:
`/projects/daytona-handoff/design-workflow/fresh-review/independent-review.md`.

- Saved-state Upload image and Replace invoke the same chooser; the expiration
  field is read-only but looks editable. Proposal: clarify the state-dependent
  action and field affordance in a separately authorized refinement. Passing
  upload/retry tests did not establish that these controls were understandable.
- At 320px, progress markers visibly compress; a 200% root-font-size stress
  check produced date/header clipping. The latter is a simulated text-size
  condition, not a browser-native zoom or WCAG certification. Keep viewport
  and stress conditions attached to the finding rather than generalizing it.
- The saved image survived an oversized replacement rejection; removing the
  pending selection restored the saved image and upload-control focus. Preserve
  that recovery behavior even if labels/layout are later refined.

No application edits were made in this evaluation. Physical camera behavior,
assistive technology and hosted execution remain untested in this review.

## Native document picker — owner-approved refinement, 2026-10-10

The owner reports iPhone's standard picker already offers Photo Library, Take
Photo and Choose File. Prefer those native choices over a second camera button
and capture-specific input. This is an approved interaction decision, not proof
that every phone image format is supported. JPEG/PNG limits remain unchanged.

Use one selection action per state, with a separate explicit save for a selected
image. Present saved expiration metadata as text. Constrain native date inputs
and their grid ancestors with minimum widths and border-box sizing, rather than
clipping overflow or reducing text size. Scoped card spacing must also override
the existing booking form paragraph margins. Browser/physical-device evidence
is recorded separately in the native-picker handoff.

## Quote recovery — owner-requested refinement, 2026-10-10

Local baseline evidence reproduced loss of a still-valid quote on same-trip
history and reload; normal uploads alone retained it. A missing client quote
is not evidence that the server quote expired. Recover in the customer's current
step, keep trip/document context, explain errors, and require explicit acceptance
of a server-validated total. Do not treat a refreshed price as submission.

Rendered 200% root-text checks exposed three independent constraints: stepper
labels needed reflow, sticky-header height changed, and the reused price-summary
style made renter addresses `nowrap`. Measure the actual header for focus;
let text and flex/grid children wrap rather than clipping or shrinking type.
This is browser text-size stress evidence, not physical-device certification.

A delayed-upload regression also exposed a redundant intake autosave advancing
its document revision. Compare the saved and current intake before enabling
uploads, avoid no-op saves, and preserve strict server revision checks. Tests
must deliberately delay responses; the happy path alone hid this race.

## Shared intake sizing (2026-10-10)

Owner-reported iPhone overflow affected Date of birth and License expiration,
not only document cards. The shared intake retained native appearance while
document dates had WebKit sizing resets. Local Chromium/Linux WebKit did not
reproduce the reported native overflow; they did reproduce cramped actions.
Normalize the shared date controls and zero-minimum grid tracks, then measure
every ancestor content boundary with populated dates at 100%/200% text.
Owner-requested action hierarchy: primary Continue to review above secondary
Save draft and Back. Do not interpret an uploaded screenshot as live UI.
This evidence does not establish physical iOS Safari correctness.
