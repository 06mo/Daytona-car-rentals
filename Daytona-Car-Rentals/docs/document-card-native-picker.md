# Native document picker refinement

The shared step-2/My trips cards use one JPEG/PNG file input, without `capture`
or a separate camera control. Empty cards offer **Upload image**; selected or
saved cards offer **Replace image** and removal. A selected image is explicitly
not uploaded; **Save image** performs the existing private upload and **Retry
save** retries a failure. Saved expiration metadata is labeled text; a selected
replacement has an editable date input. No new endpoint, provider or migration.

Card-local sizing constrains the native date control and grid children with
zero minimum widths, border-box sizing and equal horizontal insets. Compact
spacing overrides the older booking-form paragraph margins. Fixed horizontal
padding and calendar-icon dimensions leave room for enlarged date text. No
text-size reduction or overflow clipping is used to hide date overflow.

All prior JPEG/PNG, 2 MB/16 MP, synthetic Preview consent, ownership, reuse,
retention and replacement-failure rules remain on their existing paths. No claim
is made that HEIC/HEIF or every phone camera output is supported.

## Local checks

Use existing loopback-only fixture credentials; never run against hosted data:

```sh
CHROMIUM_BIN=/usr/bin/chromium npx playwright test drafts.spec.ts portal.spec.ts
CHROMIUM_BIN=/usr/bin/chromium npx playwright test --config=playwright.documents.config.ts
npm run test:drafts
npm run typecheck
npm run build
```

The focused config runs Chromium and installed Playwright WebKit at 320, 390 and
1440px, normal and 200% root font size. It checks control/card boundaries and
equal date insets, single picker/action, saved metadata, keyboard picker access
and cancelling selection. Root-font enlargement is a stress check, not native
browser zoom or physical Safari certification.

Evidence and before/after gallery live outside Git:
`/projects/daytona-handoff/document-card-native-picker/`.
Before images preserve the prior `59207bc` Chromium captures. After images use
synthetic documents; the unrelated fixed header/skip link is hidden for card
crops only. Full-page journey captures are in `regressions/`. See `handoff.md`
there for final results and browser versions. The real-phone attachments were
not present in the agent's received message; the owner's written findings
provided the requested scope. Physical iPhone verification remains with owner.
