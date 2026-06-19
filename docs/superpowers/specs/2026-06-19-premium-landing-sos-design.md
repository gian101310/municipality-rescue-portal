# Premium Landing Page and SOS Demo Design

## Goal

Upgrade the public landing page so the product feels like a premium municipal emergency response platform, while adding a non-operational floating SOS demo button that gives visitors a quick taste of the resident emergency flow.

This feature is a design and presentation feature only. The landing-page SOS demo must not submit incidents, bypass login, or create emergency records.

## Scope

Included:
- Premium landing page refresh.
- Floating 3D-style SOS demo button.
- Click-triggered short alert sound for the SOS demo.
- Demo panel showing a fake emergency routing sequence.
- Complete footer with professional product, legal, and contact areas.
- Admin notification sound foundation with a header-level mute toggle.

Excluded:
- Anonymous emergency submission.
- Real incident creation from the landing page.
- New database tables.
- Real-time push notification delivery changes.
- Paid media, video production, or external 3D asset pipelines.

## User Experience

### Landing Page

The first viewport should immediately communicate that this is a serious LGU/MDRRMO/CDRRMO-grade platform. It should feel operational rather than decorative:
- Strong hero headline for municipal emergency response.
- Supporting copy focused on verified residents, GPS reports, dispatch visibility, and location-locked deployments.
- A visual command-center preview that hints at live incidents, responder availability, and map routing.
- Clear calls to action for resident registration and staff login.

The page should move from emergency value proposition into proof and product sections:
- Resident emergency workflow.
- Admin command center workflow.
- Coverage-lock and municipality deployment story.
- Trust/security section.
- Complete footer.

### Floating SOS Demo

The SOS button should sit fixed near the lower-right corner on desktop and above the mobile safe area on phones. It should look tactile and premium:
- Circular red 3D button.
- Gloss highlight.
- Inner shadow and deep outer shadow.
- Soft pulse ring.
- Press-down animation on click.
- Small label such as "Try SOS demo".

When clicked:
1. Play a short alert chirp using Web Audio.
2. Open a compact demo panel above the button.
3. Show a fake routing sequence:
   - "SOS demo activated"
   - "GPS location simulated"
   - "Alert routed to command center"
   - "Responder notification queued"
4. Include a clear label that it is a demo preview.
5. Offer links to "Register as Resident" and "Staff Login".

The demo should reset gracefully when closed. It should not scare users into thinking a real emergency report was filed.

## Sound Design

The landing SOS sound must be click-triggered only. Browsers block autoplay, and surprise alarm sounds would feel unprofessional.

Recommended sound:
- 120-180 ms initial beep.
- 80 ms pause.
- 140-200 ms softer confirmation tone.
- Low volume by default.
- No siren loop.

Implementation should use the browser Web Audio API rather than adding an audio file. If Web Audio is unavailable, the interaction should still work silently.

## Admin Notification Sound

Add a small notification sound preference for the admin panel:
- Header-level sound toggle near notifications.
- Preference stored in localStorage.
- Short dispatch-style ping for meaningful admin notifications.
- Muted by default or easy to mute.

Initial implementation can provide the reusable sound utility and toggle. It does not need to introduce new real-time behavior. Existing polling or future realtime events can call the utility when new incident counts increase.

## Components

Recommended components:
- `LandingSosDemo`: floating button, click sound, demo panel, fake step sequence.
- `PremiumFooter`: complete footer for public landing page.
- `AdminSoundToggle`: admin header sound preference.
- `notification-sound.ts`: small Web Audio helpers for SOS chirp and admin ping.

Keep the landing page code readable by extracting repeated feature sections into arrays and small presentational blocks.

## Visual Direction

Premium but restrained:
- Dark emergency operations palette with red, blue, slate, and small amber accents.
- Avoid a one-color red-only page.
- Use real map/command-center inspired surfaces, not generic marketing cards everywhere.
- Use compact, credible copy.
- Keep border radius at 8px or less for cards and interface panels.
- Use lucide icons for interface actions.
- Avoid decorative blobs, orbs, and generic gradient-only hero art.

The hero should keep a real emergency/rescue image background or a command-center visual treatment, with enough contrast for accessibility.

## Footer Content

Footer sections:
- Product: Resident Reporting, Command Center, Live Map, Verification, Reports.
- Platform: Municipality Coverage, Staff Roles, Audit Logs, QR Posters.
- Resources: Privacy, Terms, Data Protection, Emergency Use Notice.
- Contact: Support email placeholder, emergency hotline notice, deployment inquiry.

Footer legal notice:
"This portal supports local emergency coordination and does not replace national emergency numbers. For life-threatening emergencies, call 911 immediately."

## Accessibility

- SOS demo button needs an accessible name.
- Demo panel needs clear text that this is a demo.
- Sound must not be the only feedback.
- Respect reduced-motion preference by reducing pulse and step animations.
- Buttons and links must be keyboard reachable.

## Testing

Manual verification:
- Landing page desktop and mobile layout.
- SOS demo opens, closes, and never navigates unexpectedly.
- Sound plays only after user click.
- No console errors if Web Audio is blocked.
- Footer links render and wrap cleanly on mobile.
- Admin sound toggle persists across refresh.

Automated checks:
- Production build.
- Existing unit tests.
- Add a small helper test if sound preference or demo sequence state is extracted into pure utilities.

## Acceptance Criteria

- Landing page feels premium and complete, not like a placeholder.
- Floating SOS demo is visible, polished, and clearly non-operational.
- Clicking SOS plays a short sound and opens a demo sequence.
- Admin panel has a notification sound preference entry point.
- Footer is complete and professional.
- No anonymous emergency reports are created.
- Production build passes.
