# Order Model

---

# Document Scope

This document defines the business model of an Order.

It does not define:

- UI
- User flows
- Screen layouts
- Bottom Sheets
- Database implementation
- API contracts

Those concepts are documented elsewhere.

This document defines only the business structure of an Order.

---

## Purpose

This document defines the business structure of an Order.

It is intentionally independent from:

- UI
- Screens
- Bottom Sheets
- Components
- Database implementation

Its purpose is to describe the Order as the central business object of the platform.

This document evolves together with the product.

Only document decisions that have been confirmed.

Never speculate.

---

# Core Principle

Everything in the application revolves around a single Order.

Customers create Orders.

Professionals receive Orders.

Notifications reference Orders.

Payments belong to Orders.

Statuses belong to Orders.

Support handles Orders.

Analytics measure Orders.

The Order is the primary business entity of the system.

---

# Order Lifecycle

Every Order progresses through predefined business states.

Initial lifecycle:

Draft

↓

Searching Professional

(the job has been broadcast to eligible professionals in the matching category; see `project-prd.md` Section 5 for matching behavior, including the "Now" job deadline)

↓

Pending Approval

(a professional has accepted; brief transitional state before the assignment is finalized. This does not require any action or approval from the customer - the name refers to the professional's acceptance, not a customer decision)

↓

Confirmed

↓

Professional On The Way

↓

Professional Arrived

↓

Work In Progress

↓

Completed

Possible alternative states:

Cancelled

Rescheduled

Waiting for Customer

Waiting for Professional

Incomplete Work

Future states may be added only after product decisions.

---

# Order Sections

An Order is composed of logical information groups.

Current groups:

## Service Information

Describes what service the customer needs.

---

## Scheduling

Stores all date and time related information.

---

## Location

Stores where the service will be performed.

---

## Customer Information

Information provided by the customer.

---

## Professional Information

Information related to the assigned professional.

---

## Attachments

Images and files related to the Order.

May include:

- Customer images
- Professional work images

---

## Pricing

Price estimation.

Final price.

Payment information.

---

## Status

Current business status.

Status history.

Future timestamps.

---

# Data Ownership

Each section has an owner.

| Section | Created By | May Update |
|----------|------------|------------|
| Service Information | Customer | Customer (until confirmation) |
| Scheduling | Customer | Customer (until confirmation) |
| Location | Customer | Customer |
| Customer Information | Customer | Customer |
| Professional Information | System | System |
| Attachments (Customer) | Customer | Customer |
| Attachments (Professional) | Professional | Professional |
| Pricing | Professional / System | Professional / System |
| Status | System | System |

---

# Relationship With Booking Flow

The Booking Flow determines:

- which information is requested
- in what order

The Order Model does not define UI.

It only defines the business object that receives the collected information.

---

# Relationship With Bottom Sheets

Bottom Sheets collect Order information.

Each Bottom Sheet must define:

- what information is collected
- which Order section it belongs to

Every question presented to the customer must eventually update the current Order Draft.

---

# Order Draft

Before an Order is created, the application maintains an Order Draft.

The Order Draft is progressively updated after every completed booking step.

Only after all required information has been collected is the Draft converted into a real Order.

The exact fields of the Draft are intentionally not documented yet.

They will be introduced gradually as booking screens are implemented.

---

# Documentation Rules

Do not document fields before they exist.

Do not invent database columns.

Do not infer API structures.

Only document confirmed business concepts.

As new booking steps are implemented, update this document accordingly.

This document should evolve together with the product.