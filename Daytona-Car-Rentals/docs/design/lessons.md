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
