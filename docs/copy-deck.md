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
| `bookingFlow.jobCreated.subtext` | "נעדכן אותך כשבעל מקצוע יאשר את ההזמנה" |
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
| `bookingFlow.chooseAddress.continueLabel` | "המשך לביצוע ההזמנה" (added 2026-08-25 - the list view's own `BookingStepFooter` "next" action, committing whichever row is staged via `onChooseExisting`; see "Select-then-confirm list" in `component-library.md`'s `ChooseAddressStep` entry) |
| `bookingFlow.chooseAddress.backLabel` | "חזור" (added 2026-08-25, via `BookingStepFooter`'s new `previousLabel` override - the edit view's "discard and return to the list" action, distinct from `shared.previous`/"הקודם" since it doesn't step back through the sheet's own history) |
| `bookingFlow.chooseAddress.newHeading` | "כתובת חדשה" |
| `bookingFlow.chooseAddress.newSubheading` | "למי שאתה מזמין עבורו, אם שונה ממך" |
| `bookingFlow.chooseAddress.saveNewAddress` | "שמור כתובת" |
| `bookingFlow.chooseAddress.contactNameLabel` | "איש קשר בכתובת (אופציונלי)" |
| `bookingFlow.chooseAddress.contactPhoneLabel` | "טלפון איש קשר (אופציונלי)" |
| `bookingFlow.chooseAddress.otherContactLimitReached` | "אפשר לשמור עד {max} כתובות עבור אנשים אחרים." (`{max}` → `MAX_OTHER_CONTACT_ADDRESSES`, currently 2; shown inline in `ChooseAddressStep`'s "add new" and "edit" views when a new/filled-in contact phone would exceed the cap - see `supabase/sql/address_book.sql`'s "Other-contact cap" note, added 2026-08-23, count reduced 2026-08-24) |
| `bookingFlow.chooseAddress.totalAddressLimitReached` | "אפשר לשמור עד {max} כתובות בסך הכל." (`{max}` → `MAX_TOTAL_ADDRESSES`, currently 5; added 2026-08-24, shown inline in `ChooseAddressStep`'s "add new" view once the account's saved-address count would exceed this separate flat cap - see `supabase/sql/address_book.sql`'s "Total address cap" note) |
| `bookingFlow.chooseAddress.editLinkLabel` | "ערוך" (added 2026-08-24, replacing the earlier `editAriaLabel` on a pencil-icon button - `ChooseAddressStep`'s per-row edit action is now a plain text link styled exactly like `OrderRecap`'s `confirm.changeAddress`, so it needs a visible label, not an aria-only one) |
| `bookingFlow.chooseAddress.editHeading` | "עריכת כתובת" (added 2026-08-24, `ChooseAddressStep`'s edit view - reached via the "ערוך" link, not by tapping the row itself) |
| `bookingFlow.chooseAddress.editSubheading` | "אפשר לעדכן מספר בית, דירה או קוד כניסה. אפשר גם להוסיף שם או טלפון של איש קשר אם עדיין לא הוגדרו – אך לא להחליף איש קשר קיים. לשינוי רחוב או עיר יש להוסיף כתובת חדשה." (reworded 2026-08-25 - contact name/phone are now independently fillable, not an all-or-nothing pair, so the copy names both explicitly instead of one collective "איש קשר") |
| `bookingFlow.chooseAddress.updateAddress` | "עדכן כתובת" (reverted 2026-08-25 to its original text, after `continueLabel` above took over the "המשך לביצוע ההזמנה" wording it had briefly borrowed - the edit view's footer is a `"חזור"`/`"עדכן כתובת"` `BookingStepFooter` pair again, both returning to the list view rather than to `ConfirmStep`) |
| `bookingFlow.chooseAddress.deleteAriaLabel` | "מחק כתובת" (added 2026-08-25 - `aria-label` on the per-row `Trash2` icon button, which has no visible text of its own) |
| `bookingFlow.chooseAddress.deleteConfirmLabel` | "מחק" (added 2026-08-25 - red inline confirmation text shown in place of the trash icon once tapped) |
| `bookingFlow.chooseAddress.deleteCancelLabel` | "ביטול" (added 2026-08-25 - dismisses the inline delete confirmation without deleting) |
| `bookingFlow.chooseAddress.deleteError` | "לא ניתן היה למחוק את הכתובת. נסה שוב." (added 2026-08-25 - generic fallback shown inline if `delete_address` fails, e.g. the defense-in-depth "can't delete your only address" check) |

`OrderRecap` has no internal heading of its own (confirmed 2026-08-20, redesigned after Figma node 8483:6420) - the screen it's rendered on already has one. Its date/time line reuses an existing key (`homeScreen.activeJobCard.dateToday` / `dateFormat`), but its price line does **not** reuse `bookingFlow.searchMatch.priceRange` - that key's full sentence is right for `SearchMatchStep` (picking between price-ranged options) but reads as clutter next to an already-labeled service name in a compact recap card, hence the dedicated short key above (the priced case doesn't need a copy key at all - it's just `"₪ {min}-{max}"`, the same plain format `ActiveJobCard` already uses for its own price line). Category/service labels themselves come from the database (or AI match results bound to catalog rows), not from this deck.

**Product decision, confirmed 2026-08-21:** for the "no_price_yet" population (category matched, no priced catalog service - see `bookingFlow.priceAfterInspectionShort` above), the recap keeps showing `"מחיר לאחר אבחון"` rather than leaving the price cell blank. Reasoning: every other order in this exact card shows *something* in that cell, so an empty gap there reads as broken/incomplete right when the customer is doing their final check before committing - not as a deliberate "price truly doesn't apply" signal. The customer already saw the fuller explanation once, on `SearchMatchStep`'s `priceAfterInspection` message; repeating the short form here is a reminder of something already agreed to (same role as the date/time/address lines, which are also just reminders), not new information, and it directly answers the one question a blank cell would raise ("was this priced or not - did something go wrong?").
