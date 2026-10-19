# Copy Deck (App Content)

## Purpose

This document is the single source of truth for every piece of user-facing text in the app.

It does not define when/why a piece of text appears - that stays in the owning PRD (see `ai-engineering-workflow.md` documentation ownership rules). This document defines only the exact wording, addressed by a stable **key**.

Owning PRDs reference a key (e.g. "Copy key: `notification.customer.now.requestSent`") instead of embedding the literal text. This avoids the same text drifting out of sync across multiple documents, and gives every string a stable name that the eventual code implementation (an i18n/strings file, using these same keys) can reference directly.

## Key Naming Convention

Dot-namespaced, lowerCamelCase segments: `<domain>.<subdomain>.<specific>`

Examples: `notification.customer.now.requestSent`, `homeScreen.searchBar.placeholder`, `bookingFlow.step1.categoryQuestion`.

## How This Grows

Whenever a new screen/flow is implemented and you provide the exact copy, a new section is added below (mirroring the owning PRD), each string gets a key here, and the owning PRD is updated to reference the key instead of embedding the text.

## Table of Contents

- [Shared / Global](#shared--global-source-frontend-architecturemd-project-prdmd)
- [Job Status Labels](#job-status-labels-source-order-modelmd-order-lifecycle)
- [Notification System](#notification-system-source-notification_system_prdmd)
  - [Customer Notifications](#customer-notifications)
  - [Professional Notifications](#professional-notifications)
- [Home Screen](#home-screen-source-home-screen-prdmd)
- [Client Booking Flow](#client-booking-flow-source-client-booking-flow-prdmd)
- [Orders Screen](#orders-screen-source-project-prdmd-6)
- [Job Details Screen](#job-details-screen-source-project-prdmd-6)
- [Login (standalone)](#login-standalone-source-project-prdmd-6)
- [Notifications Screen (scaffold)](#notifications-screen-scaffold-source-project-prdmd-3)
- [Profile Screen (scaffold)](#profile-screen-scaffold-source-project-prdmd-3)

---

## Shared / Global (source: `frontend-architecture.md`, `project-prd.md`)

Appears across every screen, not scoped to one PRD.

| Key | Text |
|---|---|
| `shared.bottomNav.home` | "בית" |
| `shared.bottomNav.orders` | "הזמנות" |
| `shared.bottomNav.notifications` | "התראות" |
| `shared.bottomNav.profile` | "פרופיל" |
| `shared.appMeta.title` | "DoorHub" |
| `shared.appMeta.description` | "הזמנת בעלי מקצוע לשירותי בית" |
| `shared.rotateDevice.message` | "לחוויה הטובה ביותר, אנא סובבו את המכשיר בחזרה למצב לאורך" |
| `shared.combobox.noResults` | "אין תוצאות" (shown in the `Combobox` primitive's option list when a search query matches nothing - see `component-library.md`) |
| `shared.accountPrompt.existingCustomerLoginLink` | "יש לך הזמנה קיימת? התחברי" (**DRAFT - pending exact wording**, moved 2026-09-29 from `ordersScreen.existingOrderLoginLink` into this shared namespace once `NotificationsScreen`/`ProfileScreen` needed the identical link - see `AccountLoginPrompt` in `component-library.md`. Text unchanged by the move) |

---

## Job Status Labels (source: `order-model.md` Order Lifecycle)

Used wherever a job status badge appears (currently Active Job Card on the Home Screen; also applies to the future Orders screen - see `src/lib/jobStatus.ts`).

**Confirmed** (taken directly from a Screen PRD / Figma):

| Key | Text |
|---|---|
| `jobStatus.onTheWay` | "בדרך אלייך" |
| `jobStatus.arrived` | "הגיע" |

**Placeholder** (reasonable microcopy, not yet confirmed against a PRD/Figma - safe to change):

| Key | Text |
|---|---|
| `jobStatus.draft` | "טיוטה" |
| `jobStatus.searchingProfessional` | "מחפש בעל מקצוע" |
| `jobStatus.pendingApproval` | "ממתין לאישור" |
| `jobStatus.confirmed` | "מאושר" |
| `jobStatus.inProgress` | "בביצוע" |
| `jobStatus.completed` | "הושלם" |
| `jobStatus.cancelled` | "בוטל" |
| `jobStatus.rescheduled` | "נקבע מועד חדש" |
| `jobStatus.waitingForCustomer` | "ממתין ללקוח" |
| `jobStatus.waitingForProfessional` | "ממתין לבעל מקצוע" |
| `jobStatus.incompleteWork` | "עבודה לא הושלמה" |

---

## Notification System (source: `notification_system_prd.md`)

### Customer Notifications

| Key | Text |
|---|---|
| `notification.customer.professionalAssigned` | "נמצא בעל מקצוע להזמנה שלך" |
| `notification.customer.preArrivalReminder` | "בעל המקצוע צפוי לצאת אליך בעוד כשעה וחצי" |
| `notification.customer.professionalOnTheWay` | "בעל המקצוע בדרך אליך" |
| `notification.customer.delayUnder30` | "בעל המקצוע מתעכב בכ־X דקות" |
| `notification.customer.delayOver30.message` | "בעל המקצוע מתעכב בכ־X דקות מעבר לטווח שנקבע. האם זה מתאים לך?" |
| `notification.customer.delayOver30.optionApprove` | "כן, מאשר" |
| `notification.customer.delayOver30.optionReject` | "לא, לא מתאים" |
| `notification.customer.delayOver30.supportingNote` | "אם לא תאשר תוך 15 דקות ההזמנה תתבטל" |
| `notification.customer.arrival` | "בעל המקצוע הגיע ליעד" |
| `notification.customer.jobSummary` | "העבודה הושלמה – סיכום מוכן לצפייה" |
| `notification.customer.rescheduledJob` | "נקבע מועד חדש להשלמת העבודה" |
| `notification.customer.jobCancelled` | "העבודה בוטלה" |
| `notification.customer.systemInfo.missingProfileDetails` | "חסרים פרטים בפרופיל" |
| `notification.customer.systemInfo.temporaryError` | "אירעה תקלה זמנית במערכת" |
| `notification.customer.systemInfo.detailsUpdated` | "הפרטים עודכנו בהצלחה" |
| `notification.customer.now.requestSent` | "הבקשה הדחופה שלך נשלחה לבעלי מקצוע באזור. תוך רבע שעה נדע אם נמצא בעל מקצוע שיגיע אליך עד שעה מעכשיו" |
| `notification.customer.now.searchCheckpoint` | "עדיין מחפשים בעל מקצוע זמין" |
| `notification.customer.now.searchExpired.message` | "לא מצאנו בעל מקצוע זמין כרגע" |
| `notification.customer.now.searchExpired.optionRetry` | "נסה שוב" |
| `notification.customer.now.searchExpired.optionSchedule` | "קבע למועד אחר" |
| `notification.customer.scheduled.requestSent` | "ההזמנה שלך למועד שנבחר נשלחה לבעלי מקצוע באזור" (parallel to `now.requestSent`, no urgency framing - see `project-prd.md` §5 "Scheduled Job Matching") |
| `notification.customer.scheduled.searchCheckpoint` | "עדיין מחפשים בעל מקצוע פנוי למועד שבחרת" (far tier only, ~30 min - see `notification_system_prd.md` 5.15; near-term tier reuses `now.searchCheckpoint` at ~7 min) |
| `notification.customer.scheduled.searchExpired.message` | "לא מצאנו בעל מקצוע פנוי למועד שבחרת" (fires at 15 min or 1h depending on tier - see `notification_system_prd.md` 5.16) |
| `notification.customer.scheduled.searchExpired.optionRetry` | "נסה שוב" (same wording as `now.searchExpired.optionRetry`, duplicated rather than shared - copy.json has no cross-reference mechanism) |
| `notification.customer.scheduled.searchExpired.optionSchedule` | "קבע למועד אחר" (same wording as `now.searchExpired.optionSchedule`, duplicated rather than shared) |

### Professional Notifications

| Key | Text |
|---|---|
| `notification.professional.reminderToStart` | "הגיע הזמן לצאת לדרך להזמנה הקרובה" |
| `notification.professional.didNotStartOnTime` | "טרם יצאת לדרך להזמנה הקרובה" |
| `notification.professional.delayPendingApproval` | "ממתין לאישור הלקוח לעיכוב" |
| `notification.professional.reminderToMarkArrival` | "נא לעדכן הגעה ליעד" |
| `notification.professional.reminderToSendSummary` | "נא לשלוח סיכום עבודה" |
| `notification.professional.commissionPaymentRequired` | "יש להשלים תשלום עמלה כדי להמשיך" |
| `notification.professional.systemInfo.missingProfileDetails` | "חסרים פרטים בפרופיל" |
| `notification.professional.systemInfo.updateAccountDetails` | "יש לעדכן פרטי חשבון" |
| `notification.professional.systemInfo.temporaryError` | "אירעה תקלה זמנית" |

---

## Home Screen (source: `home-screen-prd.md`)

| Key | Text |
|---|---|
| `homeScreen.searchBar.placeholder` | "איזו תקלה יש לך בבית היום?" |
| `homeScreen.searchBar.searchButtonAriaLabel` | "חיפוש" (accessibility label, not visible text) |
| `homeScreen.timePills.urgentNow` | "דחוף עכשיו" |
| `homeScreen.timePills.scheduleLater` | "לקבוע למועד אחר" |
| `homeScreen.popularServices.heading` | "בחר עבודה נפוצה" |
| `homeScreen.popularServices.showMore` | "הצג עוד עבודות" |
| `homeScreen.popularServices.showLess` | "הצג פחות" |
| `homeScreen.activeJobCard.dateToday` | "היום" |
| `homeScreen.activeJobCard.dateFormat` | "יום {dayLetter}, {dd}.{mm}" (template - `{dayLetter}` comes from `dayLetters` below) |
| `homeScreen.activeJobCard.dayLetters` | "א׳ / ב׳ / ג׳ / ד׳ / ה׳ / ו׳ / ש׳" (Sunday → Saturday, matches `Date.getDay()`) |

Category and service labels shown on this screen (category cards, service pills) are **not** here - they come from the database (`categories.label`, `services.name`), not static copy.

---

## Client Booking Flow (source: `client-booking-flow-prd.md`)

| Key | Text |
|---|---|
| `bookingFlow.closeAriaLabel` | "סגור" |
| `bookingFlow.previous` | "הקודם" |
| `bookingFlow.submitOrder` | "שלח הזמנה" (shared - the terminal-screen button label, replacing "הבא" on whichever screen is last in a given user's path: Attachments, Authentication, or New User Details - see `client-booking-flow-prd.md` "Submission") |
| `bookingFlow.searchMatch.understoodHeading` | "נראה שהבנו את הבעיה" |
| `bookingFlow.searchMatch.youWrote` | "כתבת: '{query}'" |
| `bookingFlow.searchMatch.matchingProfessionLabel` | "המקצוע המתאים:" |
| `bookingFlow.searchMatch.chooseServiceHeading` | "בחר את השירות המתאים ביותר לדעתך" |
| `bookingFlow.searchMatch.noMatchOption` | "אין התאמה" |
| `bookingFlow.searchMatch.priceRange` | "טווח מחיר עבור עבודה זו: {min}–{max} ₪" |
| `bookingFlow.searchMatch.priceAfterInspection` | "טווח מחיר עבור עבודה זו: מחיר לאחר אבחון" |
| `bookingFlow.searchMatch.next` | "הבא" |
| `bookingFlow.urgentNow.heading` | "זו הזמנה דחופה לעכשיו" (top block of `CategoryStep`, shown only for the "דחוף עכשיו" Time Pill entry - added 2026-09-06, see `client-booking-flow-prd.md` §3 "Entry Point Mapping," Flow 2) |
| `bookingFlow.urgentNow.subtext` | "ננסה לתאם לך בעל מקצוע בהקדם. תוך רבע שעה נדע אם נמצא בעל מקצוע שיגיע אליך עד שעה מעכשיו" (reuses the existing "Now" SLA numbers/wording tail from `notification.customer.now.requestSent`, adapted to pre-submission tense - confirmed 2026-09-06 rather than inventing separate numbers for this screen) |
| `bookingFlow.categorySelect.heading` | "איזה איש מקצוע אתה צריך?" (`CategoryStep` - Step 1 for the Time Pill entry, Flow 2) |
| `bookingFlow.categorySelect.next` | "הבא" |
| `bookingFlow.categoryService.selectedProfessionLabel` | "המקצוע הנבחר:" (confirmed 2026-09-06 - distinct from `searchMatch.matchingProfessionLabel` ("המקצוע המתאים:"), which stays as-is for the AI-search path where the category really is inferred; here it was chosen directly on `CategoryStep`, so "נבחר" (chosen) rather than "מתאים" (matching)) |
| `bookingFlow.categoryService.heading` | "מה צריך לתקן או להתקין?" (`CategoryServiceStep` - Step 2 for the Time Pill entry, services within the Step 1-picked category) |
| `bookingFlow.categoryService.otherOption` | "אחר / לא מוצא את מה שאני מחפש" (reworked 2026-09-06 - selecting it turns the pill into a `NoteField` for a free-text description, not an immediate jump to a message screen; see the three keys below and `BookingFlowSheet`'s `handleCategoryOtherNext`) |
| `bookingFlow.categoryService.otherPlaceholder` | "תאר מה צריך לתקן או להתקין..." (added 2026-09-06 - the "אחר" field's `NoteField` placeholder, parallel to `attachments.notePlaceholder`) |
| `bookingFlow.categoryService.otherEditAriaLabel` | "עריכת התיאור" (added 2026-09-06) |
| `bookingFlow.categoryService.otherDeleteAriaLabel` | "מחיקת התיאור" (added 2026-09-06) |
| `bookingFlow.categoryService.requestedServiceHeading` | "השירות שביקשת" (added 2026-09-06 - `SearchMatchStep`'s `headingOverride.heading` when reached from the "אחר" field's AI classification, replacing `searchMatch.understoodHeading`; the text below it is the raw typed description itself, not `searchMatch.youWrote`'s "כתבת: '...'" wrapper - the customer already knows what they typed, no need to quote it back with a verb) |
| `bookingFlow.categoryService.differentProfessionHeading` | "המקצוע המתאים על פי מה שתיארת:" (added 2026-09-06 - `SearchMatchStep`'s `professionLabelOverride`, shown instead of `searchMatch.matchingProfessionLabel` only when the AI's classification of the "אחר" text lands on a *different* category than the one already picked on `CategoryStep`; when it lands on the *same* category, the whole profession block is skipped entirely - see `BookingFlowSheet`'s `matchedCategoryDiffersFromSelection`) |
| `bookingFlow.categoryService.next` | "הבא" |
| `bookingFlow.serviceConfirm.selectedServiceLabel` | "השירות הנבחר:" (added 2026-09-07 - `ServiceConfirmStep`'s heading for the Service Pill entry, Flow 4; distinct from both `categoryService.selectedProfessionLabel` and `searchMatch.matchingProfessionLabel` since this labels the *service*, not the profession - the service is the thing directly chosen in this flow, via tapping a Home Screen service pill) |
| `bookingFlow.serviceConfirm.next` | "הבא" |
| `bookingFlow.scheduling.heading` | "בחר מועד הגעה" |
| `bookingFlow.scheduling.subheading` | "בששת הימים הקרובים, לא כולל ימי שבת" |
| `bookingFlow.scheduling.timeHeading` | "בחירת שעה" |
| `bookingFlow.scheduling.next` | "הבא" |
| `bookingFlow.noMatch.heading` | "אין לנו כרגע בעלי מקצוע בתחום זה" |
| `bookingFlow.noMatch.subtext` | "נשמח לעזור לך בתחומים שבהם יש לנו אנשי מקצוע זמינים" |
| `bookingFlow.noMatch.backHome` | "חזרה לדף הבית" |
| `bookingFlow.noServiceMatch.heading` | "לא מצאנו התאמה לבעיה שתיארת" (shown when the user explicitly picks the **"אין התאמה"** pill on `SearchMatchStep` - distinct from `noMatch` above, which is for when the matcher itself couldn't identify any category at all. Reuses `noMatch.backHome` as its CTA rather than duplicating that text.) |
| `bookingFlow.noServiceMatch.subtext` | "אפשר לנסות לתאר את הבעיה שוב במילים אחרות כדי שנוכל למצוא את השירות המתאים." |
| `bookingFlow.noPriceYet.heading` | "זיהינו שזו עבודה בתחום {category}, אך טווח המחיר לשירות הזה עדיין לא מוגדר במערכת" (the `{category}` template surfaces the identified category on this screen itself - previously only shown on `SearchMatchStep`, which this outcome skips entirely, so the category the AI/keyword matcher identified was never actually shown to the user before this screen) |
| `bookingFlow.noPriceYet.subtext` | "נוכל למצוא עבורך איש מקצוע בקטגוריה זו, אך הערכת המחיר תינתן לאחר הגעתו." |
| `bookingFlow.noPriceYet.continueOrder` | "המשך לביצוע ההזמנה" |
| `bookingFlow.noSlotsForDate.heading` | "אי אפשר לתאם הגעה להיום" |
| `bookingFlow.noSlotsForDate.subtext` | "ניתן לתאם הגעה עד שעה לפני המועד המבוקש, והשעה המאוחרת ביותר להגעה היא 18:00 בימי חול ו-14:00 בימי שישי. נשמח למצוא לך מועד מתאים ביום אחר." |
| `bookingFlow.noSlotsForDate.chooseAnotherDay` | "בחר יום אחר" |
| `bookingFlow.jobCreated.heading` | "ההזמנה נשלחה בהצלחה!" (shown after Submission - see client-booking-flow-prd.md "Submission": "Flow ends; user sees Job Created confirmation") |
| `bookingFlow.jobCreated.subtextNearTerm` | "נעדכן אותך תוך רבע שעה אם בעל מקצוע אישר את ההזמנה" (chosen when the scheduled start is less than 2 hours from submission - see `project-prd.md` §5 "Scheduled Job Matching," near-term tier; replaces the single, deadline-less `jobCreated.subtext` confirmed 2026-09-06) |
| `bookingFlow.jobCreated.subtextScheduled` | "נעדכן אותך תוך שעה אם בעל מקצוע אישר את ההזמנה" (chosen when the scheduled start is 2+ hours from submission, including multi-day - far tier, 1h deadline is MVP-only per `project-prd.md`) |
| `bookingFlow.jobCreated.closeAction` | "לדף הבית" |
| `bookingFlow.submitFailed.heading` | "לא הצלחנו לשלוח את ההזמנה" (the `submit_booking` RPC call itself failed - distinct from an OTP/verification error, which stays inline on `AuthenticationStep`) |
| `bookingFlow.submitFailed.subtext` | "אירעה תקלה, נסה שוב בעוד רגע" |
| `bookingFlow.submitFailed.retryAction` | "נסה שוב" |
| `bookingFlow.attachments.heading` | "רוצה לדייק את ההזמנה?" |
| `bookingFlow.attachments.subheading` | "הוסף תמונות או הערות כדי שבעל המקצוע יגיע מוכן (לא חובה)" |
| `bookingFlow.attachments.addNoteButton` | "הוסף הערה" |
| `bookingFlow.attachments.notePlaceholder` | "כתוב הערה לבעל המקצוע..." |
| `bookingFlow.attachments.noteEditAriaLabel` | "עריכת הערה" (accessibility label, not visible text) |
| `bookingFlow.attachments.noteDeleteAriaLabel` | "מחיקת הערה" (accessibility label, not visible text) |
| `bookingFlow.attachments.addPhotosButton` | "הוסף תמונות" |
| `bookingFlow.attachments.photoDeleteAriaLabel` | "מחיקת תמונה" (accessibility label, not visible text) |
| `bookingFlow.attachments.maxPhotosReached` | "ניתן להוסיף עד 3 תמונות" |
| `bookingFlow.attachments.next` | "הבא" |
| `bookingFlow.authentication.heading` | "בוא נאמת את המספר שלך" |
| `bookingFlow.authentication.subheading` | "כדי שנוכל לעדכן אותך על ההזמנה ובעל המקצוע יוכל ליצור איתך קשר" |
| `bookingFlow.authentication.phoneLabel` | "מספר טלפון" |
| `bookingFlow.authentication.phonePlaceholder` | "050-1234567" |
| `bookingFlow.authentication.sendCodeButton` | "שלח קוד" |
| `bookingFlow.authentication.codeLabel` | "קוד אימות" |
| `bookingFlow.authentication.codePlaceholder` | "הקוד שקיבלת ב-SMS" |
| `bookingFlow.authentication.verifyButton` | "אמת" |
| `bookingFlow.authentication.resendCooldown` | "אפשר לשלוח קוד חדש בעוד {seconds} שניות" |
| `bookingFlow.authentication.resendButton` | "שלח קוד מחדש" |
| `bookingFlow.authentication.errorInvalidPhone` | "מספר טלפון לא תקין" |
| `bookingFlow.authentication.errorSendFailed` | "לא הצלחנו לשלוח את הקוד, נסה שוב" |
| `bookingFlow.authentication.errorInvalidCode` | "קוד שגוי, נסה שוב" |
| `bookingFlow.authentication.errorExpiredCode` | "הקוד פג תוקף, שלח קוד חדש" |
| `bookingFlow.newUserDetails.heading` | "רק עוד כמה פרטים" |
| `bookingFlow.newUserDetails.subheading` | "כדי שבעל המקצוע יידע להגיע אלייך" |
| `bookingFlow.newUserDetails.firstNameLabel` | "שם פרטי" |
| `bookingFlow.newUserDetails.lastNameLabel` | "שם משפחה" |
| `bookingFlow.newUserDetails.cityLabel` | "עיר" |
| `bookingFlow.newUserDetails.cityPlaceholder` | "בחר עיר" |
| `bookingFlow.newUserDetails.streetLabel` | "רחוב" |
| `bookingFlow.newUserDetails.streetPlaceholder` | "בחר רחוב" (city/street are now a restricted dropdown/autocomplete pair backed by `src/lib/addresses.ts`, not free text - see `client-booking-flow-prd.md` Step 6) |
| `bookingFlow.newUserDetails.streetSearchHint` | "הקלידו כדי לחפש רחוב" (shown in the street `Combobox`'s option list until the user types at least one character - avoids rendering all ~700+ streets at once, see `component-library.md`) |
| `bookingFlow.newUserDetails.buildingNumberLabel` | "מספר בית" |
| `bookingFlow.newUserDetails.apartmentLabel` | "דירה (אופציונלי)" |
| `bookingFlow.newUserDetails.entranceCodeLabel` | "קוד כניסה (אופציונלי)" |
| `bookingFlow.newUserDetails.next` | "הבא" (this screen is never terminal - it advances to `ConfirmStep`, see `client-booking-flow-prd.md` Step 6) |
| `bookingFlow.confirm.heading` | "הכל מוכן!" (the single dedicated review-and-submit screen every path ends on, regardless of population - see `client-booking-flow-prd.md` "Submission") |
| `bookingFlow.confirm.subheading` | "בדוק שהפרטים נכונים ושלח את ההזמנה" |
| `bookingFlow.confirm.apartmentLine` | "דירה {apartment}" (only appended to `OrderRecap`'s address line when an apartment was entered) |
| `bookingFlow.confirm.entranceCodeLine` | "קוד כניסה {code}" (only appended when an entrance code was entered) |
| `bookingFlow.confirm.changeAddress` | "שנה כתובת" (link next to `OrderRecap`'s address line for a returning profile - opens `ChooseAddressStep`; added 2026-08-23, see `supabase/sql/address_book.sql`) |
| `bookingFlow.orderRecap.notesIncludedLabel` | "צורפה הערה" |
| `bookingFlow.orderRecap.photosCountLabel` | "{count} תמונות מצורפות" |
| `bookingFlow.orderRecap.priceAfterInspectionShort` | "מחיר לאחר אבחון" (deliberately shorter than `bookingFlow.searchMatch.priceAfterInspection` - no "טווח מחיר עבור עבודה זו:" prefix, since `OrderRecap`'s price cell is a bare value next to the service label, not a labeled sentence - see `component-library.md`) |
| `bookingFlow.orderRecap.contactLabel` | "איש קשר בכתובת" (only shown when the selected/new address has a `contact_name`/`contact_phone` - who to actually expect/call there, when it isn't the account holder) |
| `bookingFlow.chooseAddress.heading` | "לאיזו כתובת לשלוח את ההזמנה?" |
| `bookingFlow.chooseAddress.subheading` | "בחר כתובת שמורה, או הוסף כתובת חדשה" |
| `bookingFlow.chooseAddress.addNewLabel` | "הוסף כתובת חדשה" |
| `bookingFlow.chooseAddress.next` | "הבא" (added 2026-08-25 as `continueLabel`/"המשך לביצוע ההזמנה" - the list view's own `BookingStepFooter` "next" action, committing whichever row is staged via `onChooseExisting`; renamed and reworded 2026-09-04 back to the plain "הבא" every other step's forward button uses, after the longer custom wording was observed wrapping to two lines on a narrow phone - see "Select-then-confirm list" in `component-library.md`'s `ChooseAddressStep` entry) |
| `bookingFlow.chooseAddress.backLabel` | "חזור" (added 2026-08-25, via `BookingStepFooter`'s new `previousLabel` override - the edit view's "discard and return to the list" action, distinct from `shared.previous`/"הקודם" since it doesn't step back through the sheet's own history) |
| `bookingFlow.chooseAddress.newHeading` | "כתובת חדשה" |
| `bookingFlow.chooseAddress.newSubheading` | "למי שאתה מזמין עבורו, אם שונה ממך" |
| `bookingFlow.chooseAddress.saveNewAddress` | "שמור כתובת" |
| `bookingFlow.chooseAddress.contactNameLabel` | "איש קשר בכתובת (אופציונלי)" |
| `bookingFlow.chooseAddress.contactPhoneLabel` | "טלפון איש קשר (אופציונלי)" |
| `bookingFlow.chooseAddress.contactFieldsHintFirstTime` | "מולאו מראש עם הפרטים שלך - אפשר לשנות אותם אם הכתובת הזו עבור מישהו אחר." (added 2026-08-28, shown once below the contact fields on the account's first-ever additional address, under the ordinary `contactNameLabel`/`contactPhoneLabel` above - a short-lived plain "שם"/"נייד" label variant (`contactNameLabelFirstTime`/`contactPhoneLabelFirstTime`) existed 2026-08-28 through 2026-09-01 and was reverted; only the pre-fill behavior this hint explains stayed) |
| `bookingFlow.chooseAddress.otherContactLimitReached` | "אפשר לשמור עד {max} כתובות עבור אנשים אחרים." (`{max}` → `MAX_OTHER_CONTACT_ADDRESSES`, currently 2; shown inline in `ChooseAddressStep`'s "add new" and "edit" views when a new/filled-in contact phone would exceed the cap - see `supabase/sql/address_book.sql`'s "Other-contact cap" note, added 2026-08-23, count reduced 2026-08-24) |
| `bookingFlow.chooseAddress.totalAddressLimitReached` | "אפשר לשמור עד {max} כתובות בסך הכל. לשינוי המכסה יש לפנות לשירות הלקוחות." (`{max}` → `MAX_TOTAL_ADDRESSES`, currently 3, reduced from 5 on 2026-08-28; added 2026-08-24, shown inline in `ChooseAddressStep`'s "add new" view once the account's saved-address count would exceed this separate flat cap - see `supabase/sql/address_book.sql`'s "Total address cap" note. The customer-service line was added 2026-08-28 to cover the delete-then-recreate edge case: soft-deleted addresses still count cumulatively - see `fetchAddressUsageCounts` - so a customer who deletes and tries to add a differently-detailed replacement can hit this cap with no self-service way past it) |
| `bookingFlow.chooseAddress.editLinkLabel` | "ערוך" (added 2026-08-24 as a visible text-link label, replacing an even earlier aria-only pencil-icon button; reverted back to an icon-only `Pencil` button 2026-09-04 against Figma node `8549:6612` - this key now serves as that button's `aria-label` only, not visible text) |
| `bookingFlow.chooseAddress.editHeading` | "עריכת כתובת" (added 2026-08-24, `ChooseAddressStep`'s edit view - reached via the "ערוך" link, not by tapping the row itself) |
| `bookingFlow.chooseAddress.editSubheading` | "אפשר לערוך כל שדה כל עוד לא נשלחה הזמנה כשהוא ממולא. אחרי השליחה אי אפשר לשנות אותו. קוד כניסה לבניין אפשר לעדכן תמיד." (reworded 2026-09-03 - building number and apartment joined the same "editable until submitted while filled" rule as city/street/contact; entrance code is now the only field that stays editable after a job; see `update_address` in `address_book.sql`) |
| `bookingFlow.chooseAddress.updateAddress` | "עדכן כתובת" (reverted 2026-08-25 to its original text, after the list view's `next` key above took over the "המשך לביצוע ההזמנה" wording it had briefly borrowed (since reworded again, see `next` above) - the edit view's footer is a `"חזור"`/`"עדכן כתובת"` `BookingStepFooter` pair again, both returning to the list view rather than to `ConfirmStep`. Persists immediately via `update_address` as of 2026-09-01 - see "Address Book" in `client-booking-flow-prd.md`) |
| `bookingFlow.chooseAddress.addAddressError` | "לא הצלחנו לשמור את הכתובת. נסה שוב." (added 2026-09-01 - `add_address`'s generic failure fallback, shown inline in the "new" view; the specific cap messages above pre-empt this for the two known failure reasons) |
| `bookingFlow.chooseAddress.updateAddressError` | "לא הצלחנו לעדכן את הכתובת. נסה שוב." (added 2026-09-01, same idea as `addAddressError` but for `update_address`, shown inline in the edit view) |

`OrderRecap` has no internal heading of its own (confirmed 2026-08-20, redesigned after Figma node 8483:6420) - the screen it's rendered on already has one. Its date/time line reuses an existing key (`homeScreen.activeJobCard.dateToday` / `dateFormat`), but its price line does **not** reuse `bookingFlow.searchMatch.priceRange` - that key's full sentence is right for `SearchMatchStep` (picking between price-ranged options) but reads as clutter next to an already-labeled service name in a compact recap card, hence the dedicated short key above (the priced case doesn't need a copy key at all - it's just `"₪ {min}-{max}"`, the same plain format `ActiveJobCard` already uses for its own price line). Category/service labels themselves come from the database (or AI match results bound to catalog rows), not from this deck.

---

## Orders Screen (source: `project-prd.md` §6)

Implemented 2026-09-08 (dummy data, Figma node 8057:6297 - see `component-library.md`'s `OrderCard` entry). Section headings above each card bucket, plus a couple of bucket-specific status-pill overrides where the generic `Job Status Labels` wording above didn't fit the Figma text exactly.

| Key | Text |
|---|---|
| `ordersScreen.upcomingHeading` | "הזמנות מאושרות בהמתנה לביצוע" |
| `ordersScreen.upcomingStatusLabel` | "אושרה - ממתינה לביצוע" (covers `confirmed`/`pending_approval`/`rescheduled`; fuller phrasing than the generic `jobStatus.confirmed` = "מאושר") |
| `ordersScreen.pendingHeading` | "מחפשים בעל מקצוע עבורך" (changed 2026-09-09 from "הזמנות ממתינות לאישור בעל מקצוע" - warmer/more personal tone, deliberately worded differently than `pendingStatusLabel` below rather than just repeating it) |
| `ordersScreen.pendingStatusLabel` | "בחיפוש בעל מקצוע" (covers `searchingProfessional` - no professional assigned yet; changed 2026-09-08 from "ממתינה לאישור" - the customer preferred the phrasing they saw on a real `searching_professional` job's status pill via the generic `jobStatus.searchingProfessional` map, close to which this now reads) |
| `ordersScreen.historyHeading` | "היסטוריה (עד 5 הזמנות אחרונות)" (changed 2026-09-29 from "היסטוריה (3-5 הזמנות אחרונות)" - the actual cap (`HISTORY_LIMIT` in `orders.ts`) has always been a fixed `5`, never a 3-5 range; the ambiguous "3-5" wording was customer-facing copy that never matched the real implementation. "עד" ("up to") also correctly covers customers with fewer than 5 past jobs.) |
| `ordersScreen.historyCompletedStatusLabel` | "הושלמה" (covers `completed`; gender-corrected from the generic `jobStatus.completed` = "הושלם") |
| `ordersScreen.emptyMessage` | "אין הזמנות להצגה כרגע" (**DRAFT - pending exact wording**, added 2026-09-28. Shown when all 4 buckets are empty - deliberately doesn't assert "you have no orders," since that could be false for a returning customer with real history who just has no session on this device - see `OrdersScreen`'s doc comment) |

Paired with `shared.accountPrompt.existingCustomerLoginLink` (see "Shared / Global" above) via the shared `AccountLoginPrompt` component - opens `LoginSheet`, standalone phone verification for the returning-customer-on-a-new-device case, decoupled from placing a new order. That link's copy key moved out of this section on 2026-09-29 (was `ordersScreen.existingOrderLoginLink`) once `NotificationsScreen`/`ProfileScreen` needed the identical prompt - see "Notifications Screen (scaffold)" / "Profile Screen (scaffold)" below.

The top "active now" card (in-flight statuses: `onTheWay`/`arrived`/`inProgress`/`waitingForCustomer`/`waitingForProfessional`) and the history bucket's `cancelled`/`incompleteWork` cards reuse the generic `Job Status Labels` map unchanged - only the 3 statuses above needed Orders-screen-specific wording. **Deliberately no heading above the "active now" card** (confirmed 2026-09-09) - its top position, exclusive blue-filled `StatusBar` (every other pill on this screen is white/outlined), and second-person-active phrasing ("בדרך אלייך") already distinguish it from the 3 headed buckets below without needing one; adding a heading would make it feel like just another list bucket instead of the one singular "happening right now" card.

**Product decision, confirmed 2026-08-21:** for the "no_price_yet" population (category matched, no priced catalog service - see `bookingFlow.priceAfterInspectionShort` above), the recap keeps showing `"מחיר לאחר אבחון"` rather than leaving the price cell blank. Reasoning: every other order in this exact card shows *something* in that cell, so an empty gap there reads as broken/incomplete right when the customer is doing their final check before committing - not as a deliberate "price truly doesn't apply" signal. The customer already saw the fuller explanation once, on `SearchMatchStep`'s `priceAfterInspection` message; repeating the short form here is a reminder of something already agreed to (same role as the date/time/address lines, which are also just reminders), not new information, and it directly answers the one question a blank cell would raise ("was this priced or not - did something go wrong?").

## Job Details Screen (source: `project-prd.md` §6)

Implemented 2026-09-28 (Figma node 9220:6130 - see `component-library.md`'s `JobDetailsScreen` entry). Reached from both the Home Screen's Active Job Card and any `OrdersScreen` card.

| Key | Text |
|---|---|
| `jobDetailsScreen.yourNoteButton` | "ההערה שלך" |
| `jobDetailsScreen.reportProblemButton` | "נתקלת בבעיה?" |
| `jobDetailsScreen.notFound` | "ההזמנה לא נמצאה" |
| `jobDetailsScreen.viewPhotoAriaLabel` | "הצג את התמונה בגודל מלא" (added 2026-09-28 - `aria-label` on each attached-photo thumbnail button, which opens it full-size in `ImageLightbox`; see `component-library.md`) |
| `jobDetailsScreen.callProfessionalAriaLabel` | "התקשר לבעל המקצוע" (added 2026-09-29 - `aria-label` on the circular `tel:` call link shown once a professional is assigned with a real phone and the appointment is within 2 hours; see `component-library.md`) |
| `jobDetailsScreen.callSupportButton` | "חייג לשירות לקוחות" (added 2026-10-01 - replaces `reportProblemButton` above once the job is inside the 2-hour customer-cancellation cutoff; see `docs/cancellation-and-rescheduling.md`'s "Customer-Side Cancellation UI" and `component-library.md`'s `ReportProblemSheet` entry) |
| `jobDetailsScreen.callSupportAriaLabel` | "התקשר לשירות הלקוחות" (added 2026-10-01 - `aria-label` on that same direct-dial `tel:` link) |
| `jobDetailsScreen.reportProblem.chooseHeading` | "מה תרצה לעשות?" (added 2026-10-01 - `ReportProblemSheet`'s first screen title, shown more than 2 hours before `scheduled_time` or while `searching_professional`) |
| `jobDetailsScreen.reportProblem.cancelOption` | "לבטל הזמנה" |
| `jobDetailsScreen.reportProblem.contactSupportOption` | "ליצור קשר עם שירות הלקוחות" |
| `jobDetailsScreen.reportProblem.next` | "הבא" |
| `jobDetailsScreen.reportProblem.previous` | "הקודם" |
| `jobDetailsScreen.reportProblem.closeAction` | "סגור" (the contact-support screen's forward action - there's nothing further to advance to, so this just dismisses the Sheet) |
| `jobDetailsScreen.reportProblem.cancelConfirmHeading` | "לבטל את ההזמנה?" |
| `jobDetailsScreen.reportProblem.cancelConfirmWarning` | "לאחר הביטול לא ניתן לשחזר את ההזמנה." |
| `jobDetailsScreen.reportProblem.cancelConfirmAction` | "בטל את ההזמנה" |
| `jobDetailsScreen.reportProblem.cancelError` | "לא הצלחנו לבטל את ההזמנה. נסה שוב." |
| `jobDetailsScreen.reportProblem.contactSupportHeading` | "שירות הלקוחות" |

## Login (standalone) (source: `project-prd.md` §6)

`LoginSheet` (added 2026-09-28) - standalone phone verification, decoupled from the Booking Flow, for a returning customer who has real order history but no session on the current device/browser (see `OrdersScreen`'s doc comment for the gap this closes). Overrides `AuthenticationStep`'s own booking-specific heading/subheading; every other string on that screen (phone/code labels, placeholders, error messages, button labels) is reused as-is from `bookingFlow.authentication.*` above - unchanged regardless of context.

| Key | Text |
|---|---|
| `login.heading` | "בוא נאמת את המספר שלך" (**DRAFT - pending exact wording**, reused as-is from `bookingFlow.authentication.heading` - generic enough to fit both contexts) |
| `login.subheading` | "כדי שנוכל להציג את ההזמנות הקיימות שלך במכשיר הזה" (**DRAFT - pending exact wording**, added 2026-09-28 - distinct from `bookingFlow.authentication.subheading`, which talks about the order being placed right now) |

## Notifications Screen (scaffold) (source: `project-prd.md` §3)

`/notifications` opened as a bare scaffold 2026-09-29 (see `NotificationsScreen`'s doc comment) - not the real screen (`notification_system_prd.md` §9 owns that copy separately, once built). Only exists so the tab isn't a dead link and so its "logged out vs. genuinely no notifications" ambiguity - the same shape as `OrdersScreen`'s - gets the same shared prompt from day one.

| Key | Text |
|---|---|
| `notificationsScreen.emptyMessage` | "אין התראות להצגה כרגע" (**DRAFT - pending exact wording**, added 2026-09-29 - same neutral-about-session pattern as `ordersScreen.emptyMessage`, paired with `shared.accountPrompt.existingCustomerLoginLink` via `AccountLoginPrompt`) |
| `notificationsScreen.comingSoonMessage` | "מסך ההתראות בבנייה" (**SCAFFOLD placeholder, not final copy** - shown only when a session exists; the real Notifications content replaces this entirely once that screen is built) |

## Profile Screen (scaffold) (source: `project-prd.md` §3)

`/profile` opened as a bare scaffold 2026-09-29 (see `ProfileScreen`'s doc comment) - `project-prd.md` has never specified this screen's real content (only its `BottomNavigation` tab/href existed before now). Same reasoning as the Notifications scaffold above: exists so the tab isn't a dead link and so the login prompt is consistent across every account-dependent screen.

| Key | Text |
|---|---|
| `profileScreen.emptyMessage` | "התחברי כדי לראות את הפרופיל שלך" (**DRAFT - pending exact wording**, added 2026-09-29 - unlike Orders/Notifications, a brand-new guest was never expected to have a profile at all, so this can be more direct than "neutral about which case is true") |
| `profileScreen.comingSoonMessage` | "מסך הפרופיל בבנייה" (**SCAFFOLD placeholder, not final copy** - shown only when a session exists; the real Profile content replaces this entirely once that screen is built) |
