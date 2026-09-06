# Notification System PRD (MVP)

## 1. Core Principles

- Only meaningful notifications (no spam)
- Single active in-app banner
- Critical events backed by SMS
- Clear mapping between state → message → action
- Consistent UI: text is always same color, only icon reflects meaning

### Notification Sources
Notifications can be triggered from multiple sources:
- System-generated triggers (e.g., automatic reminders such as “30 minutes before arrival”)
- Customer actions (e.g., job creation)
- Professional actions (e.g., job acceptance, delay updates, cancellations)

---

### Notification Priority Model

Each notification is assigned a priority level:

- `normal` → Stored in Notifications screen only
- `urgent` → Displayed as in-app banner
- `critical` → Displayed as banner + triggers SMS

This priority is stored in the database and drives all UI and delivery behavior.

---

### Urgent Notifications Definition

An “urgent notification” is any event that requires immediate user awareness or impacts an active job in real time, but does NOT require interrupting the user outside the app.

#### Urgent notifications include:
- Real-time job status changes (e.g., “on_the_way”, “arrived”, “in_progress”, “completed”)
- Non-critical delays or updates
- Time-sensitive system reminders (e.g., 30 minutes before arrival)

#### Behavior:
- Displayed as a top banner on all screens
- Pushes content down
- Only one banner can be active at a time
- Auto-dismiss after a defined duration or on click
- Persisted in Notifications screen

---

### Critical Notifications Definition

A “critical notification” is any event that requires immediate user attention and may require action, even if the user is not currently inside the app.

#### Critical notifications include:
- Job cancellation (by customer or professional)
- Significant delay or issue requiring attention
- Professional did not start the job
- Any event requiring user decision or awareness outside the app

#### Behavior:
- Displayed as a top banner (same as urgent)
- Triggers SMS delivery
- Persisted in Notifications screen

---

### Non-Urgent Notifications Definition

Non-urgent notifications do not require immediate attention.

#### Examples:
- Job creation confirmation
- Professional accepted the job
- General updates

#### Behavior:
- Not displayed as banner
- Stored only in Notifications screen

---

### Persistence Rule

- All notifications (normal, urgent, critical) are persisted in the Notifications screen
- The banner is a temporary surface, not a storage mechanism

---

### Database Implementation (Supabase)

Notifications are stored in the `job_updates` table.

Each record includes:

- `type` (event type)
- `data` (JSON payload)
- `priority` (enum: 'normal' | 'urgent' | 'critical')

Example:

insert into job_updates (
  job_id,
  type,
  data,
  priority
)
values (
  'job_id',
  'delay',
  '{"message": "הטכנאי מאחר ב-20 דקות"}',
  'critical'
);

---

## 2. Channels

### In-App
Notifications are delivered in two ways:
- Top Banner (Urgent only)
  - Appears on ALL screens
  - Pushes content down
  - Only ONE banner at a time
- Notifications Screen (All notifications)
  - Stores full history
  - Includes critical, urgent and non-urgent notifications

### SMS (Critical Only)
Used only for high-impact events that require immediate attention:
- Delay approval required
- Job cancellation
- Professional did not start job

---

## 3. Banner Behavior

- New notification replaces previous banner
- If requires action → stays until resolved
- If informational → disappears when no longer relevant
- Clicking → navigates to Job Full Screen (Orders tab active)

---

## 4. Visual System (FINAL)

### Text
- All notification text is SAME color (default text color)

### Icons (only element with color)

| Color | Meaning |
|------|--------|
| 🟢 Green | success (event completed) |
| 🔵 Blue | live status |
| 🟠 Orange | reminder / upcoming |
| 🔴 Red | problem / cancellation |
| ⚪ Gray | informational / system / profile |

---

## 5. Customer Notifications

Copy for every notification below lives in `copy-deck.md` (section "Notification System" → "Customer Notifications"), addressed by key. This document defines only when/why each one fires.

### 5.1 Professional Assigned
Icon: user-check (Blue)  
Copy key: `notification.customer.professionalAssigned`  
Channel: In-app  
Expiry: until opened / 30 min  

---

### 5.2 Pre-Arrival Reminder (1.5h before)
Icon: clock (Orange)  
Copy key: `notification.customer.preArrivalReminder`  

---

### 5.3 Professional On The Way
Icon: navigation (Blue)  
Copy key: `notification.customer.professionalOnTheWay`  
Expiry: until arrival  

---

### 5.4 Delay (Under 30 min)
Icon: clock (Orange)  
Copy key: `notification.customer.delayUnder30`  

---

### 5.5 Delay (Over 30 min – Requires Approval)
Icon: alert-circle (Orange)  

Copy key: `notification.customer.delayOver30.message`

Options:
✔ Copy key: `notification.customer.delayOver30.optionApprove`
❌ Copy key: `notification.customer.delayOver30.optionReject`

Supporting note copy key: `notification.customer.delayOver30.supportingNote`

Channel:
- In-app
- SMS  

Expiry: 15 minutes  

---

### 5.6 Arrival
Icon: check-circle (Green)  
Copy key: `notification.customer.arrival`  

---

### 5.7 Job Summary
Icon: document (Green)  
Copy key: `notification.customer.jobSummary`  

---

### 5.8 Rescheduled Job
Icon: calendar (Orange)  
Copy key: `notification.customer.rescheduledJob`  

---

### 5.9 Job Cancelled
Icon: x-circle (Red)  
Copy key: `notification.customer.jobCancelled`  

---

### 5.10 System / Info Notifications
Icon: info-circle (Gray)  

Copy keys: `notification.customer.systemInfo.missingProfileDetails`, `notification.customer.systemInfo.temporaryError`, `notification.customer.systemInfo.detailsUpdated`

No urgency  

---

### 5.11 "Now" Job Request Sent (immediate, T+0)
Applies only to immediate ("Now") jobs - see `project-prd.md` Section 5. Sent the moment the customer submits the "Now" request.

Icon: send (Blue)  
Copy key: `notification.customer.now.requestSent`  
Priority: urgent (banner, no SMS)  

---

### 5.12 "Now" Job Search In Progress (~7 min checkpoint)
Applies only to immediate ("Now") jobs - see `project-prd.md` Section 5.

Icon: clock (Orange)  
Copy key: `notification.customer.now.searchCheckpoint`  
Priority: urgent (banner, no SMS)  

---

### 5.13 "Now" Job Search Expired (15 min, no match)
Applies only to immediate ("Now") jobs - see `project-prd.md` Section 5.

Icon: alert-circle (Orange)  
Copy key: `notification.customer.now.searchExpired.message`  

Options:
- Copy key: `notification.customer.now.searchExpired.optionRetry`
- Copy key: `notification.customer.now.searchExpired.optionSchedule`

Priority: urgent (banner, no SMS)  
No blocking behavior  

---

### 5.14 Scheduled Job Request Sent (T+0)
Applies only to jobs with a specific future date/time - see `project-prd.md` Section 5, "Scheduled Job Matching." Sent the moment the customer submits the request (parallel to 5.11, but without the "Now" flow's urgency framing - this is confirming receipt of a request for a chosen time, not an immediate one).

Icon: send (Blue)  
Copy key: `notification.customer.scheduled.requestSent`  
Priority: normal (banner, no SMS)  

---

### 5.15 Scheduled Job Search Checkpoint (~30 min, far tier only)
Applies only to the far tier of scheduled-job matching (scheduled start 2+ hours from submission) - see `project-prd.md` Section 5, "Scheduled Job Matching." The near-term tier has no separate checkpoint entry here since its 7-minute checkpoint is identical to 5.12 and reuses that same copy key.

Icon: clock (Orange)  
Copy key: `notification.customer.scheduled.searchCheckpoint`  
Priority: normal (banner, no SMS)  

---

### 5.16 Scheduled Job Search Expired (no match by the applicable tier's deadline)
Applies only to jobs with a specific future date/time - see `project-prd.md` Section 5, "Scheduled Job Matching." Fires at 15 minutes (near-term tier) or 1 hour (far tier, MVP-only number), whichever tier applied to that request.

Icon: alert-circle (Orange)  
Copy key: `notification.customer.scheduled.searchExpired.message`  

Options:
- Copy key: `notification.customer.scheduled.searchExpired.optionRetry`
- Copy key: `notification.customer.scheduled.searchExpired.optionSchedule`

Priority: normal (banner, no SMS)  
No blocking behavior  

---

## 6. Professional Notifications

Copy for every notification below lives in `copy-deck.md` (section "Notification System" → "Professional Notifications"), addressed by key. This document defines only when/why each one fires.

### 6.1 Reminder to Start
Icon: clock (Orange)  
Copy key: `notification.professional.reminderToStart`  
Channel: In-app + SMS  

---

### 6.2 Did Not Start On Time
Icon: alert (Red)  
Copy key: `notification.professional.didNotStartOnTime`  
Channel: In-app + SMS  

---

### 6.3 Delay Pending Approval
Icon: clock (Orange)  
Copy key: `notification.professional.delayPendingApproval`  

---

### 6.4 Reminder to Mark Arrival
Icon: location (Orange)  
Copy key: `notification.professional.reminderToMarkArrival`  

---

### 6.5 Reminder to Send Summary
Icon: document (Orange)  
Copy key: `notification.professional.reminderToSendSummary`  

---

### 6.6 Commission Payment Required
Icon: wallet (Red)  
Copy key: `notification.professional.commissionPaymentRequired`  
Channel: In-app + SMS  
Blocking: YES  

---

### 6.7 System / Profile Issues
Icon: info-circle (Gray)

Copy keys: `notification.professional.systemInfo.missingProfileDetails`, `notification.professional.systemInfo.updateAccountDetails`, `notification.professional.systemInfo.temporaryError`

---

## 7. Auto Behaviors

- Delay not approved → cancel after 15 min
- Commission not paid → block actions
- Professional not started → notify customer

---

## 8. Reminder Rules

- Only ONE reminder per event
- No repeated notifications

---

## 9. Notifications Screen

Sections:
1. Requires Action  
2. Updates  
3. History  

- Red dot indicator for unread
- Cleared when entering screen

**Clarification (confirmed 2026-08-02):** "unread" here means *new notifications arrived since the user's last visit to the Notifications screen* — a single screen-level signal, NOT an aggregate of each individual notification's own read/opened state. The badge clears simply by opening the Notifications screen (e.g. comparing the latest notification's timestamp against a per-user "last visited Notifications screen" timestamp), regardless of whether the user actually opens/interacts with any specific notification inside. Do not implement this as a per-notification `is_read` flag rolled up into a count/boolean - that's a different (and more complex) mechanism than what's intended here.

---

## 10. Active Job Priority

If job is active:
- All notifications relate to it
- Navigation always goes to that job

---

## 11. Read / Unread Visual State

- Unread / not-yet-opened notification: entire text renders in **Bold** weight.
- Read / opened notification (still visible because it requires unresolved action, per Section 3): entire text renders in **Regular** weight.
- Press/tap feedback (background darkens per the app's global interaction system) is independent of this - only actually opening the notification changes its weight, not the press itself.

---

All logic, structure, and system behavior are defined in English.
Actual Hebrew copy lives in `copy-deck.md`, addressed by key (see Section 5/6 above) - not embedded in this document.