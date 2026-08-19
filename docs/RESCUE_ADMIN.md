# PAWGUARD Admin Portal --- Rescue Admin Role Documentation

**Document:** `RESCUE_ADMIN.md`\
**Portal:** PAWGUARD Admin Portal\
**Role:** Rescue Admin\
**Purpose:** Complete role, access, workflow, module, and dashboard
reference

------------------------------------------------------------------------

## 1. About the Rescue Admin Role

The **Rescue Admin** is an operational administrative role responsible
for managing and monitoring the rescue side of PAWGUARD.

The role focuses on the rescue workflow from receiving rescue requests
through review, coordination, dispatch, and completion of rescue
operations.

The Rescue Admin works within the rescue-related modules of the PAWGUARD
Admin Portal and uses the existing backend workflows and permissions.

### Primary Responsibilities

The Rescue Admin is responsible for:

-   Monitoring rescue activity.
-   Reviewing incoming rescue requests.
-   Reviewing rescue request details.
-   Processing rescue requests according to the available workflow.
-   Coordinating rescue operations.
-   Managing rescue dispatch information.
-   Assigning rescue personnel where supported.
-   Monitoring rescue status and progress.
-   Reviewing completed rescue operations.
-   Ensuring rescue records remain up to date.
-   Following the rescued animal into the next operational stage where
    the existing workflow provides that connection.

### Access Principle

The Rescue Admin should receive access to the rescue-related
functionality required for the role.

The role should **not automatically receive Super Admin-only system
administration capabilities** such as:

-   Global role and permission administration.
-   Centre/System Settings.
-   Unrelated financial administration.
-   Other restricted administrative modules.

Backend authorization remains the source of truth.

------------------------------------------------------------------------

# 2. Rescue Admin Dashboard

The Rescue Admin Dashboard is the operational starting point for rescue
management.

Its purpose is to provide a quick overview of rescue work and allow the
Rescue Admin to move directly into pending and active rescue operations.

## Dashboard Responsibilities

The dashboard should help the Rescue Admin:

1.  See the current rescue workload.
2.  Identify requests requiring attention.
3.  Review active rescue operations.
4.  Access dispatch-related work.
5.  Monitor rescue progress.
6.  Review completed operations.
7.  Navigate to detailed rescue records.

### Dashboard Data Rule

All dashboard counts and records must come from the existing backend
APIs.

The dashboard must not use:

-   Fake rescue requests.
-   Hard-coded rescue counts.
-   Mock rescue agents.
-   Invented statuses.
-   Fabricated dispatch records.

When an API fails, the UI should show an appropriate loading, empty, or
error state.

------------------------------------------------------------------------

# 3. Rescue Management

## Purpose

Rescue Management is the main operational module for managing rescue
activities.

It provides the Rescue Admin with the central view of rescue operations
and their current status.

## What Can Be Done

Where supported by the existing backend, the Rescue Admin can:

-   View rescue operations.
-   Search rescue records.
-   Filter rescue records.
-   Open rescue details.
-   Review rescue request information.
-   Review location information.
-   Review requester information.
-   Review rescue personnel information.
-   Monitor rescue status.
-   Update rescue information through supported actions.
-   Follow the rescue operation through completion.

------------------------------------------------------------------------

# 4. Rescue Request Management

## Purpose

Rescue Requests contains incoming requests for animal rescue assistance.

This is the beginning of the rescue operational workflow.

## Request Information

A rescue request may contain information such as:

-   Requester details.
-   Contact information.
-   Rescue location.
-   Animal-related information.
-   Request description.
-   Request date/time.
-   Current request status.
-   Other backend-supported rescue information.

## Rescue Admin Workflow

``` text
Rescue Request Received
        ↓
Rescue Admin Reviews Request
        ↓
Review Request Details
        ↓
Validate / Process Request
        ↓
Prepare Rescue Operation
        ↓
Dispatch / Assign Rescue Personnel
        ↓
Rescue Operation
        ↓
Update Completion
```

The exact status transitions must follow the backend implementation.

------------------------------------------------------------------------

# 5. Rescue Request Review

## Purpose

The review process allows the Rescue Admin to understand the rescue
situation before an operational response is created.

## Review Steps

The Rescue Admin should review:

1.  Who submitted the request.
2.  Where the rescue is required.
3.  What animal/rescue situation was reported.
4.  The urgency or priority information available.
5.  Current request status.
6.  Any additional notes supplied through the backend.

## Review Outcome

Depending on the existing backend workflow, the Rescue Admin may:

-   Continue the request toward dispatch.
-   Update supported request information.
-   Assign/coordinate rescue personnel.
-   Complete the appropriate status transition.
-   Leave the request pending when further action is required.

The UI must not introduce unsupported backend states.

------------------------------------------------------------------------

# 6. Rescue Dispatch

## Purpose

Rescue Dispatch manages the operational response to an
approved/processable rescue request.

## What Can Be Done

Where supported by the backend, the Rescue Admin can:

-   Review dispatch records.
-   Create or process dispatch information.
-   Assign rescue personnel.
-   Review assigned personnel.
-   Review dispatch location.
-   Monitor dispatch status.
-   Track rescue progress.
-   Update dispatch information.
-   Complete the dispatch workflow.

## Dispatch Workflow

``` text
Rescue Request
      ↓
Request Reviewed
      ↓
Rescue Operation Prepared
      ↓
Personnel Assigned
      ↓
Dispatch Created
      ↓
Rescue Team Dispatched
      ↓
Rescue Performed
      ↓
Operation Updated
      ↓
Rescue Completed
```

------------------------------------------------------------------------

# 7. Rescue Personnel / Agent Coordination

## Purpose

The Rescue Admin coordinates the people responsible for executing rescue
operations.

The exact available actions depend on the backend APIs and permissions.

## Possible Operational Actions

Where supported:

-   View available rescue personnel.
-   Review personnel information.
-   Assign personnel to a rescue.
-   Review active assignments.
-   Monitor assignment status.
-   Reassign when the backend supports reassignment.
-   Review completed rescue work.

The Rescue Admin should only assign personnel who are eligible according
to backend rules.

------------------------------------------------------------------------

# 8. Rescue Operation Tracking

## Purpose

Once a rescue has been dispatched, the Rescue Admin monitors its
progress.

## Information to Monitor

-   Rescue request.
-   Assigned personnel.
-   Rescue location.
-   Dispatch information.
-   Current status.
-   Operational notes.
-   Completion information.

## Tracking Workflow

``` text
Pending Request
      ↓
Reviewed
      ↓
Dispatched
      ↓
In Progress
      ↓
Completed
```

The exact status names must match the backend implementation.

------------------------------------------------------------------------

# 9. Rescue Completion

## Purpose

The Rescue Admin completes the operational rescue record after the
rescue has been performed.

## Completion Activities

Where supported, the Rescue Admin can:

-   Review the rescue result.
-   Confirm completion.
-   Update supported completion information.
-   Review rescued animal information.
-   Ensure the rescue record is stored correctly.
-   Follow the animal into the next available PAWGUARD workflow.

------------------------------------------------------------------------

# 10. Dog / Animal Handover

After a rescue operation is completed, the rescued animal may enter
another operational workflow.

The Rescue Admin should ensure the rescue information is correctly
recorded so downstream teams can continue the animal's lifecycle.

Typical operational progression:

``` text
Rescue Request
      ↓
Rescue Dispatch
      ↓
Animal Rescued
      ↓
Animal Record
      ↓
Veterinary / Medical Processing
      ↓
Shelter Placement
      ↓
Adoption / Foster
```

This document does not redefine the veterinary, shelter, adoption, or
foster workflows. Those remain the responsibility of their respective
modules and roles.

------------------------------------------------------------------------

# 11. Rescue Records

## Purpose

Rescue records provide the historical operational record of rescue
activity.

## Rescue Admin Can Review

Where exposed by the existing portal:

-   Request details.
-   Rescue location.
-   Assigned personnel.
-   Dispatch information.
-   Rescue status.
-   Operational notes.
-   Completion information.
-   Related animal information.

Records should remain connected to the original backend entities rather
than creating duplicate local records.

------------------------------------------------------------------------

# 12. Search and Filtering

The Rescue Admin should be able to use the existing search/filter
controls available in the rescue modules.

Typical filtering may include:

-   Rescue status.
-   Request status.
-   Location.
-   Date.
-   Assigned personnel.
-   Other backend-supported filters.

Filtering is intended to help the Rescue Admin quickly identify:

-   New requests.
-   Pending work.
-   Active rescues.
-   Completed rescues.

------------------------------------------------------------------------

# 13. Notifications

The Rescue Admin may receive notifications generated by the existing
backend for rescue-related activity.

Relevant notifications can include:

-   New rescue requests.
-   Request updates.
-   Dispatch updates.
-   Assignment changes.
-   Rescue completion updates.
-   Other rescue-related events supported by the system.

Notifications should be based on actual backend events.

------------------------------------------------------------------------

# 14. Reports / Operational Monitoring

Where the current Rescue Admin portal exposes reporting functionality,
it can be used to review rescue operations.

Useful operational information includes:

-   Number of rescue requests.
-   Pending requests.
-   Active rescues.
-   Completed rescues.
-   Rescue activity by period.
-   Personnel activity where supported.

Reports must use actual backend data.

------------------------------------------------------------------------

# 15. Rescue Admin End-to-End Workflow

The complete Rescue Admin workflow is:

``` text
LOGIN
  ↓
RESCUE ADMIN DASHBOARD
  ↓
Review Rescue Activity
  ↓
Open Rescue Requests
  ↓
Review Request
  ↓
Process Request
  ↓
Prepare Rescue Operation
  ↓
Assign / Coordinate Rescue Personnel
  ↓
Create / Process Dispatch
  ↓
Monitor Rescue
  ↓
Complete Rescue
  ↓
Verify Rescue Record
  ↓
Animal Continues to Next PAWGUARD Workflow
```

------------------------------------------------------------------------

# 16. Rescue Request to Completion Workflow

``` text
┌─────────────────────────┐
│ Rescue Request Received │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ Rescue Admin Review     │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ Validate / Process      │
│ Request                 │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ Rescue Operation        │
│ Prepared                │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ Personnel / Agent       │
│ Assignment              │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ Rescue Dispatch         │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ Rescue In Progress      │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ Rescue Completed        │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│ Animal Lifecycle        │
│ Continues                │
└─────────────────────────┘
```

------------------------------------------------------------------------

# 17. Access Summary

  Area                                          Rescue Admin
  ------------------------------- -----------------------------------------
  Rescue Dashboard                            Full role access
  Rescue Management                           Full role access
  Rescue Requests                             Full role access
  Rescue Dispatch                             Full role access
  Rescue Personnel Coordination         Backend/permission dependent
  Rescue Tracking                             Full role access
  Rescue Completion                     Backend/permission dependent
  Rescue Reports                               Where available
  Notifications                                Rescue-related
  User Management                  Restricted / not primary responsibility
  Roles & Permissions                                No
  Centre/System Settings                             No
  Financial Administration             No unless separately permitted
  Volunteer Administration             No unless separately permitted
  Adoption Administration              No unless separately permitted
  Foster Administration                No unless separately permitted

> "Full role access" means the complete set of actions exposed to and
> authorized for the Rescue Admin by the existing backend. It does not
> mean bypassing backend permissions.

------------------------------------------------------------------------

# 18. Authorization and Data Rules

The Rescue Admin implementation must follow these rules:

1.  Backend authorization is the source of truth.
2.  Do not invent rescue APIs.
3.  Do not invent rescue statuses.
4.  Do not use mock rescue records.
5.  Do not hard-code operational counts.
6.  Do not bypass backend validation.
7.  Do not expose Super Admin-only Settings.
8.  Do not grant role-management permissions through frontend-only
    changes.
9.  Keep rescue requests and dispatch records connected to their backend
    IDs.
10. Preserve the existing rescue workflow rather than creating duplicate
    modules.
11. Show clear loading, empty, and error states.
12. Keep downstream animal information synchronized with backend
    records.

------------------------------------------------------------------------

# 19. Difference Between Rescue Admin and Super Admin

  Responsibility                   Super Admin      Rescue Admin
  ------------------------------- ------------- ---------------------
  System-wide administration           Yes               No
  User administration                  Yes         No / restricted
  Role & permission management         Yes               No
  Centre/System Settings               Yes               No
  Rescue Requests                      Yes               Yes
  Rescue Management                    Yes               Yes
  Rescue Dispatch                      Yes               Yes
  Rescue Operations                    Yes               Yes
  Rescue Personnel Coordination        Yes       Yes where permitted
  Volunteer Management                 Yes         No / restricted
  Adoption                             Yes         No / restricted
  Foster Care                          Yes         No / restricted

The key distinction is that the **Super Admin manages the entire
PAWGUARD platform**, while the **Rescue Admin concentrates on rescue
operations**.

------------------------------------------------------------------------

# 20. Dashboard Conclusion

The **Rescue Admin Dashboard is the operational control point for
PAWGUARD rescue activities**.

Its main responsibility is to ensure that rescue requests are reviewed,
coordinated, dispatched, tracked, and completed correctly.

The complete role workflow is:

``` text
Dashboard
   ↓
Rescue Requests
   ↓
Request Review
   ↓
Rescue Coordination
   ↓
Personnel Assignment
   ↓
Rescue Dispatch
   ↓
Rescue Tracking
   ↓
Rescue Completion
   ↓
Animal Lifecycle Handover
```

The Rescue Admin should have enough access to manage the complete rescue
workflow but should not receive unrelated system-administration
privileges.

The role therefore sits between the platform-wide authority of the Super
Admin and the operational execution performed by rescue personnel, while
relying on the existing PAWGUARD backend for authorization, validation,
status transitions, and data integrity.
