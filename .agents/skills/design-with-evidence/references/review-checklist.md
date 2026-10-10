# Lightweight design review

Use for the affected interaction, not as a compulsory full-site audit. Record
Pass / Finding / Not tested plus evidence; automated checks supplement observation.

- Customer task: can the customer identify the next action and understand the
  current status? Is selection distinguished from persistence and approval?
- Controls: one clear primary action per task; no redundant inputs, conflicting
  actions, unnecessary re-entry, or unexplained read-only/disabled controls.
- Hierarchy: consistent existing components, tokens, type scale and spacing.
  Inspect actual screenshots and rendered states, including long/empty content.
- Accessibility: keyboard access and meaningful focus after navigation/removal;
  visible, unobscured focus; associated labels, accessible names and error/status
  announcements. Do not encode status only in color. Check actual contrast,
  target spacing, text resizing and reduced-motion behavior.
- Responsive task completion: 320×844, 390×844 and 1440×900; no harmful horizontal
  overflow, squeezed comparisons or hidden primary actions. Check the full task,
  not just the initial viewport. Desktop/mobile screenshots must actually be opened.
- States: loading, empty, success, error, disabled and recovery. Test failed
  uploads/replacements, expired sessions, changed inputs/quotes and navigation.
  Check what survives and whether retry can create duplicates. Use synthetic data.
- Wording: accurately describe requests, approvals, pricing and availability;
  no fabricated delivery, extraction, verification, payment or confirmation.
- Evidence: distinguish source inspection, browser observation, measured tests,
  device simulation, physical-device checks and hosted verification. A usability
  recommendation is not a proven user outcome without user research.

## Accessibility basis

Use [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/):
1.4.3 text contrast (4.5:1 normal, 3:1 large); 1.4.10 reflow; 1.4.11 non-text
contrast; 2.1.1 keyboard; 2.4.3 focus order; 2.4.7 focus visible; 2.4.11 focus not
obscured; 2.5.8 target size; 3.3.1 errors; 3.3.2 labels; 3.3.7 redundant entry;
4.1.2 name/role/value; 4.1.3 status messages. Check the criteria's exceptions,
not a simplified blanket assertion. Respect reduced-motion preferences; 2.3.3
Animation from Interactions is AAA, not an AA requirement.

[WAI form notifications](https://www.w3.org/WAI/tutorials/forms/notifications/)
provides implementation guidance for errors, linked descriptions and live regions.
Inspected 2026-10-10. Inspiration galleries do not establish compliance.
