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
| `bookingFlow.searchMatch.understoodHeading` | "נראה שהבנו את הבעיה" |
| `bookingFlow.searchMatch.youWrote` | "כתבת: '{query}'" |
| `bookingFlow.searchMatch.matchingProfessionLabel` | "המקצוע המתאים:" |
| `bookingFlow.searchMatch.chooseServiceHeading` | "בחר את השירות המתאים ביותר לדעתך" |
| `bookingFlow.searchMatch.noMatchOption` | "אין התאמה" |
| `bookingFlow.searchMatch.priceRange` | "טווח מחיר עבור עבודה זו: {min}–{max} ₪" |
| `bookingFlow.searchMatch.priceAfterInspection` | "טווח מחיר עבור עבודה זו: מחיר לאחר אבחון" |
| `bookingFlow.searchMatch.next` | "הבא" |
| `bookingFlow.searchMatch.nextStepComingSoon` | "השלב הבא בזרימה יתווסף מיד אחרי מסך ה-Figma הבא" |
| `bookingFlow.scheduling.heading` | "בחר מועד הגעה" |
| `bookingFlow.scheduling.subheading` | "בששת הימים הקרובים, לא כולל ימי שבת" |
| `bookingFlow.scheduling.timeHeading` | "בחירת שעה" |
| `bookingFlow.scheduling.next` | "הבא" |
| `bookingFlow.noMatch.heading` | "אין לנו כרגע בעלי מקצוע בתחום זה" |
| `bookingFlow.noMatch.subtext` | "נשמח לעזור לך בתחומים שבהם יש לנו אנשי מקצוע זמינים" |
| `bookingFlow.noMatch.backHome` | "חזרה לדף הבית" |
| `bookingFlow.noPriceYet.heading` | "עדיין לא מוגדר עבור שירות זה טווח מחיר במערכת." |
| `bookingFlow.noPriceYet.subtext` | "נוכל למצוא עבורך איש מקצוע בקטגוריה זו, אך הערכת המחיר תינתן לאחר הגעתו." |
| `bookingFlow.noPriceYet.continueOrder` | "המשך לביצוע ההזמנה" |

Service / category labels inside this flow come from the database (or AI match results bound to catalog rows), not from this deck.
