# PAWGUARD Admin Portal --- Super Admin Role Documentation

**Document:** `SUPER_ADMIN.md`\
**Portal:** PAWGUARD Admin Portal\
**Role:** Super Admin\
**Purpose:** Complete role, access, workflow, module, and dashboard
reference

------------------------------------------------------------------------

## 1. About the Super Admin Role

The **Super Admin** is the highest-level administrative role in the
PAWGUARD Admin Portal.

The Super Admin is responsible for controlling the overall
administration of the PAWGUARD platform, managing users and roles,
overseeing operational modules, monitoring workflows, and maintaining
system-level configuration.

The Super Admin has system-wide administrative access and is the only
role that should have access to **Settings / Centre Settings**.

### Primary Responsibilities

The Super Admin can:

-   Access the complete Admin Portal.
-   Monitor the overall organization and operational activity.
-   Manage user accounts and personnel.
-   Manage roles and permissions.
-   Manage volunteer applications and volunteer profiles.
-   Manage rescue operations and rescue workflows.
-   Manage dogs and shelter-related records.
-   Oversee adoption and foster-care operations.
-   Oversee veterinary-related administration where the portal exposes
    those modules.
-   Review operational schedules, attendance, activity, and reports.
-   Manage notifications available to administrators.
-   Access system-level Settings / Centre Settings.
-   Control access to administrative functionality through role and
    permission management.

### Super Admin Access Level

  Access Area                        Super Admin
  ---------------------------------- --------------------------------
  Dashboard                          Full
  User Management                    Full
  Roles & Permissions                Full
  Rescue Management                  Full
  Rescue Requests                    Full
  Rescue Dispatch                    Full
  Dog Management                     Full
  Shelter Management                 Full
  Shelter Dogs                       Full
  Adoptions                          Full
  Foster Care                        Full
  Volunteer Management               Full
  Reports / Analytics                Full where available
  Notifications                      Full administrative visibility
  Settings / Centre Settings         Full
  Role / Permission Administration   Full

> The backend remains the source of truth for authorization and business
> rules. The frontend must not invent permissions or bypass backend
> restrictions.

------------------------------------------------------------------------

# 2. Super Admin Dashboard

The Super Admin Dashboard is the central administrative overview of
PAWGUARD.

Its purpose is to give the Super Admin a high-level view of platform
activity and provide navigation into operational modules.

## Dashboard Responsibilities

The dashboard should allow the Super Admin to:

1.  Review important operational statistics.
2.  Identify pending work requiring administrative action.
3.  Navigate to major management modules.
4.  Monitor operational activity.
5.  Review alerts and notifications.
6.  Access administrative configuration.
7.  Move from summary information into the relevant detailed module.

## Dashboard Sections

Depending on the current implementation, dashboard information may
include:

-   User and personnel information.
-   Rescue activity.
-   Volunteer activity.
-   Shelter and dog activity.
-   Adoption activity.
-   Foster-care activity.
-   Scheduling information.
-   Attendance / activity information.
-   Notifications.
-   Reports and operational statistics.

### Dashboard Principle

Dashboard cards and statistics must represent **real backend data**.

The Super Admin dashboard must not use:

-   Fake records.
-   Hard-coded operational counts.
-   Mock users.
-   Invented API responses.

If a backend endpoint fails, the UI should display an appropriate
empty/error state instead of silently presenting fabricated data.

------------------------------------------------------------------------

# 3. User Management

## Purpose

User Management is used to manage administrative and operational
personnel who have accounts in the PAWGUARD system.

## Super Admin Can

-   View registered users.
-   Search users.
-   Filter users.
-   View user details.
-   Review assigned roles.
-   Review account status.
-   Review verification information where available.
-   Review MFA information where available.
-   Manage user access according to backend-supported functionality.
-   Assign or update roles where permitted by the backend.

## Typical User Information

The user directory can contain:

-   User ID.
-   Full name.
-   Email address.
-   Phone number.
-   Assigned role.
-   Account status.
-   Verification state.
-   MFA state.
-   Created date.

## Workflow

``` text
User Account
    ↓
Super Admin Reviews User
    ↓
Assign / Review Role
    ↓
Backend Authorization Applies
    ↓
User Receives Appropriate Portal Access
```

------------------------------------------------------------------------

# 4. Roles & Permissions

## Purpose

Roles & Permissions controls which administrative capabilities are
available to different PAWGUARD users.

## Super Admin Responsibilities

The Super Admin can:

-   View available roles.
-   Review role permissions.
-   Manage role assignments where supported.
-   Control access to administrative functionality.
-   Ensure users receive only the permissions appropriate to their role.

## Important Rule

Role-based access must be enforced at both:

1.  Frontend navigation / UI level.
2.  Backend authorization level.

Hiding a menu item alone is not sufficient security.

## Settings Restriction

**Settings / Centre Settings must be available only to Super Admin.**

Other roles must not:

-   See the Settings navigation item.
-   Access Settings through a direct URL.
-   Receive unauthorized Settings controls.

------------------------------------------------------------------------

# 5. Rescue Management

## Purpose

Rescue Management oversees the rescue operation lifecycle.

The Super Admin can monitor and administer the complete rescue process.

## Main Responsibilities

-   Review rescue operations.
-   Review rescue-related records.
-   Monitor rescue progress.
-   Manage rescue operational information.
-   Navigate to rescue requests and dispatch workflows.

## Rescue Lifecycle

``` text
Rescue Need / Request
        ↓
Rescue Request Created
        ↓
Coordinator Review
        ↓
Agent / Rescuer Assignment
        ↓
Rescue Dispatch
        ↓
Rescue Execution
        ↓
Dog Registration
        ↓
Veterinary Examination / Clearance
        ↓
Shelter Placement
        ↓
Adoption / Foster
```

The Super Admin can oversee this lifecycle across the relevant modules.

------------------------------------------------------------------------

# 6. Rescue Requests

## Purpose

Rescue Requests contains incoming rescue requests that require review
and operational handling.

## Super Admin Can

-   View rescue requests.
-   Review request details.
-   Monitor request status.
-   Review location and requester information.
-   Follow the request through the operational lifecycle.
-   Navigate to dispatch when assignment is required.

## Workflow

``` text
Request Received
    ↓
Review Request
    ↓
Validate Details
    ↓
Assign / Dispatch
    ↓
Rescue Operation
    ↓
Complete / Update Status
```

All status changes must use existing backend-supported operations.

------------------------------------------------------------------------

# 7. Rescue Dispatch

## Purpose

Rescue Dispatch is used to coordinate the actual rescue operation after
a request has been reviewed.

## Super Admin Can

-   View dispatch information.
-   Review assigned rescue personnel.
-   Monitor dispatch status.
-   Track rescue execution.
-   Review operational progress.

## Workflow

``` text
Approved Rescue Request
        ↓
Rescue Personnel Assigned
        ↓
Dispatch Created
        ↓
Rescue Team Executes Operation
        ↓
Operation Updated
        ↓
Rescue Completed
```

------------------------------------------------------------------------

# 8. Dog Management

## Purpose

Dog Management maintains dog-related records after rescue and during the
animal lifecycle.

## Super Admin Can

-   View dog records.
-   Search and filter dogs.
-   Open dog details.
-   Review identification information.
-   Review operational status.
-   Review shelter/adoption/foster relationships where available.
-   Monitor the dog lifecycle.

## Dog Lifecycle

``` text
Rescue
  ↓
Dog Registered
  ↓
Veterinary Examination
  ↓
Medical / Vaccination Processing
  ↓
Shelter Placement
  ↓
Adoption or Foster
```

The exact transitions must follow backend-supported business rules.

------------------------------------------------------------------------

# 9. Shelter Management

## Purpose

Shelter Management handles shelter/facility administration.

## Super Admin Can

-   View shelter/facility information.
-   Review facility availability.
-   Manage shelter-related operational information where supported.
-   Monitor shelter capacity and placement operations.

## Shelter Workflow

``` text
Dog Rescued
    ↓
Dog Cleared / Processed
    ↓
Shelter Placement
    ↓
Shelter Monitoring
    ↓
Adoption / Foster
```

------------------------------------------------------------------------

# 10. Shelter Dogs

## Purpose

Shelter Dogs provides the operational view of dogs currently associated
with shelters.

## Super Admin Can

-   View shelter dogs.
-   Search and filter records.
-   Review dog profiles.
-   Review placement information.
-   Monitor dog status.
-   Follow dogs toward adoption or foster workflows.

------------------------------------------------------------------------

# 11. Adoption Management

## Purpose

Adoption management handles the process of making eligible dogs
available for adoption and managing adoption activity.

## Super Admin Can

-   Review adoption records.
-   Monitor adoption applications/processes.
-   Review adoption-related dog information.
-   Monitor application status.
-   Oversee the adoption lifecycle.

## Adoption Workflow

``` text
Dog Eligible for Adoption
        ↓
Adoption Listing / Availability
        ↓
Adoption Application
        ↓
Application Review
        ↓
Approval / Rejection
        ↓
Adoption Completion
        ↓
Dog Lifecycle Updated
```

Only backend-supported status transitions should be used.

------------------------------------------------------------------------

# 12. Foster Care

## Purpose

Foster Care manages temporary placement of dogs with foster caregivers.

## Super Admin Can

-   Review foster records.
-   Review foster placements.
-   Monitor foster status.
-   Review caregiver-related information.
-   Monitor the foster lifecycle.

## Foster Workflow

``` text
Dog Eligible for Foster
        ↓
Foster Application / Request
        ↓
Review
        ↓
Approval
        ↓
Foster Assignment
        ↓
Foster Care Period
        ↓
Completion / Return / Next Placement
```

------------------------------------------------------------------------

# 13. Volunteer Management

## Purpose

Volunteer Management manages the volunteer lifecycle from application
through active service.

## Complete Volunteer Lifecycle

``` text
Volunteer Applies
       ↓
Application Received
       ↓
Admin / Coordinator Reviews
       ↓
Approve / Reject
       ↓
Onboarding / Background Check
       ↓
Volunteer Activated
       ↓
Role / Work Assignment
       ↓
Shift Assignment
       ↓
Attendance
       ↓
Hours / Activity Tracking
       ↓
Service Summary
       ↓
Certificate
```

## Volunteer Status Model

The backend currently supports the following volunteer statuses:

``` text
applied
onboarded
active
inactive
```

The public-facing status mapping is:

  Backend Status   Public Status
  ---------------- ---------------------
  `applied`        `PENDING`
  `onboarded`      `APPROVED`
  `active`         `APPROVED / ACTIVE`
  `inactive`       `INACTIVE`

### Background Check / Onboarding Rule

Activation is allowed only after the backend considers the background
check completed.

The onboarding operation currently uses:

``` json
{
  "status": "onboarded",
  "background_check_completed": true
}
```

Activation then uses:

``` json
{
  "status": "active"
}
```

### Volunteer Application Deduplication

The same applicant must not be created as a new volunteer application
repeatedly.

If an existing volunteer/profile record exists, the system should show
the existing application/profile and its current status rather than
creating a duplicate record.

------------------------------------------------------------------------

# 14. Volunteer Applications

## Purpose

Volunteer Applications is the entry point for reviewing people who have
applied to volunteer.

## Super Admin Can

-   View pending applications.
-   Open applicant details.
-   Review preferred role.
-   Review skills.
-   Review availability.
-   Review contact information.
-   Review application date.
-   Approve/onboard the applicant.
-   Reject the application using backend-supported behavior.

## Application Review Workflow

``` text
Application Submitted
        ↓
Application Appears in Admin Portal
        ↓
Super Admin Reviews Details
        ↓
Approve / Reject
        ↓
If Approved:
Onboarding / Background Check
        ↓
Activate
        ↓
Assign Work / Shift
```

------------------------------------------------------------------------

# 15. Volunteer Work Assignment

After a volunteer has reached an eligible status, the Super Admin can
assign work using the existing volunteer workflow.

## Assignment Information

The assignment interface can contain:

-   Volunteer.
-   Assignment title.
-   Description / work instructions.
-   Work location.
-   Date.
-   Start time.
-   End time.
-   Priority.
-   Status.

## Assignment Workflow

``` text
Eligible Volunteer
       ↓
Assign Work
       ↓
Create Shift / Work Record
       ↓
Assign Volunteer
       ↓
Volunteer Sees Assignment
       ↓
Volunteer Performs Work
       ↓
Attendance Recorded
       ↓
Hours / Activity Updated
```

The implementation should reuse existing backend APIs rather than
creating a separate mock assignment system.

------------------------------------------------------------------------

# 16. Volunteer Shift Management

## Purpose

Shift Management schedules volunteer work.

## Super Admin Can

-   Create shifts.
-   Set date/time.
-   Define capacity.
-   Define location.
-   Assign volunteers.
-   Review shift attendance.
-   Monitor shift status.

## Shift Workflow

``` text
Create Shift
    ↓
Set Date / Time / Location / Capacity
    ↓
Assign Volunteer
    ↓
Volunteer Receives Assignment
    ↓
Check-In
    ↓
Work
    ↓
Check-Out
    ↓
Hours Recorded
```

------------------------------------------------------------------------

# 17. Volunteer Attendance

## Purpose

Attendance records volunteer participation in scheduled work.

## Super Admin Can

-   View attendance.
-   Process check-in where supported.
-   Process check-out where supported.
-   Review attendance status.
-   Review calculated hours.

## Attendance Workflow

``` text
Scheduled Shift
      ↓
Volunteer Arrives
      ↓
Check-In
      ↓
Volunteer Works
      ↓
Check-Out
      ↓
Attendance Completed
      ↓
Hours Added to Service Record
```

------------------------------------------------------------------------

# 18. Volunteer Activity & Service History

## Purpose

This provides the Super Admin with a historical view of volunteer
contribution.

## Information Can Include

-   Completed assignments.
-   Completed shifts.
-   Total service hours.
-   Attendance history.
-   Service summary.
-   Volunteer status history where available.

This information is useful for operational monitoring and service
recognition.

------------------------------------------------------------------------

# 19. Volunteer Certificates

## Purpose

Certificates provide verified recognition of volunteer service where
supported by the backend.

## Super Admin Can

-   View volunteer service summary.
-   Review completed service information.
-   Access/download a certificate where the backend provides one.

Certificate information should be based on the verified service record.

------------------------------------------------------------------------

# 20. Scheduling & Reports

## Purpose

Scheduling and reporting provide administrative visibility into
operational work.

## Super Admin Can

-   Review scheduled work.
-   Review operational schedules.
-   Review attendance/activity information.
-   Export reports where supported.
-   Use reporting information to monitor organization performance.

Reports must use real backend data.

------------------------------------------------------------------------

# 21. Notifications

## Purpose

Notifications provide administrative visibility into events that require
attention.

Examples of notification categories may include:

-   New applications.
-   Operational updates.
-   Pending administrative work.
-   Rescue updates.
-   Volunteer updates.
-   Other backend-generated administrative notifications.

The Super Admin should be able to review notifications available to the
role.

------------------------------------------------------------------------

# 22. Settings / Centre Settings

## Purpose

Settings are system-level administrative configuration.

## Access Rule

**Only Super Admin should have access to Settings / Centre Settings.**

Settings must not be available to:

-   Volunteer Coordinator.
-   Rescue Coordinator.
-   Rescue Agent.
-   Veterinarian.
-   Shelter Manager.
-   Adoption Coordinator.
-   Foster Coordinator.
-   Other non-Super-Admin roles.

## Security Requirement

Access must be restricted through both:

-   Navigation visibility.
-   Direct-route authorization.

A user must not gain Settings access simply by manually entering the
Settings URL.

------------------------------------------------------------------------

# 23. Super Admin End-to-End Operational Workflow

The Super Admin's overall workflow can be represented as:

``` text
LOGIN
  ↓
SUPER ADMIN DASHBOARD
  ↓
Review Notifications / Operational Summary
  ↓
Choose Required Management Area
  │
  ├── User Management
  │      ↓
  │   Manage Users / Roles / Access
  │
  ├── Roles & Permissions
  │      ↓
  │   Manage Role Access
  │
  ├── Rescue Management
  │      ↓
  │   Requests → Dispatch → Rescue
  │
  ├── Dog Management
  │      ↓
  │   Dog Registration → Medical → Shelter
  │
  ├── Shelter Management
  │      ↓
  │   Facility / Shelter Dogs
  │
  ├── Adoption
  │      ↓
  │   Applications → Review → Completion
  │
  ├── Foster Care
  │      ↓
  │   Applications → Approval → Placement
  │
  ├── Volunteer Management
  │      ↓
  │   Application → Onboarding → Activation
  │      ↓
  │   Work / Shift Assignment
  │      ↓
  │   Attendance → Hours → Activity
  │
  ├── Reports / Schedules
  │      ↓
  │   Operational Monitoring
  │
  └── Settings
         ↓
      System Administration
```

------------------------------------------------------------------------

# 24. Super Admin Permission Summary

  ------------------------------------------------------------------------------------------------------------
  Module             View          Create              Update         Approve / Process    Assign    Reports
  --------------- ---------- ------------------- ------------------- ------------------- ---------- ----------
  Dashboard          Yes             ---                 ---                 ---            ---        Yes

  User Management    Yes            Yes\*               Yes\*               Yes\*          Yes\*       ---

  Roles &            Yes            Yes\*               Yes\*               Yes\*          Yes\*       ---
  Permissions                                                                                       

  Rescue             Yes            Yes\*               Yes\*               Yes\*          Yes\*      Yes\*
  Management                                                                                        

  Rescue Requests    Yes            Yes\*               Yes\*               Yes\*          Yes\*       ---

  Rescue Dispatch    Yes            Yes\*               Yes\*               Yes\*          Yes\*       ---

  Dog Management     Yes            Yes\*               Yes\*               Yes\*           ---       Yes\*

  Shelter            Yes            Yes\*               Yes\*               Yes\*          Yes\*      Yes\*
  Management                                                                                        

  Shelter Dogs       Yes            Yes\*               Yes\*               Yes\*           ---        ---

  Adoptions          Yes            Yes\*               Yes\*               Yes\*          Yes\*      Yes\*

  Foster Care        Yes            Yes\*               Yes\*               Yes\*          Yes\*      Yes\*

  Volunteers         Yes            Yes\*               Yes\*               Yes\*          Yes\*      Yes\*

  Scheduling /       Yes            Yes\*               Yes\*               Yes\*          Yes\*       Yes
  Reports                                                                                           

  Notifications      Yes      Backend-dependent   Backend-dependent   Backend-dependent     ---        ---

  Settings /         Yes            Yes\*               Yes\*               Yes\*           ---        ---
  Centre Settings                                                                                   
  ------------------------------------------------------------------------------------------------------------

`*` = only where the corresponding backend API and business rule support
the operation.

------------------------------------------------------------------------

# 25. Data Integrity & Authorization Rules

The Super Admin interface must follow these rules:

1.  Backend APIs are the source of truth.
2.  Do not create mock data.
3.  Do not invent API endpoints.
4.  Do not invent backend status values.
5.  Do not bypass backend validation.
6.  Do not duplicate existing modules unnecessarily.
7.  Do not expose another role's restricted functionality.
8.  Do not expose Settings to non-Super-Admin roles.
9.  Do not create duplicate volunteer applications.
10. Public status must remain synchronized with the backend volunteer
    lifecycle.
11. UI actions must reflect the actual current backend status.
12. Failed backend requests must show meaningful error states.

------------------------------------------------------------------------

# 26. Super Admin Dashboard Conclusion

The **Super Admin Dashboard is the central control point of the PAWGUARD
Admin Portal**.

Its purpose is not simply to display statistics. It provides the Super
Admin with complete administrative visibility and access to the
organization's operational workflows.

The Super Admin can move from high-level monitoring into detailed
operational management:

``` text
Dashboard
   ↓
Users & Access
   ↓
Rescue Operations
   ↓
Dog & Shelter Operations
   ↓
Adoption & Foster Operations
   ↓
Volunteer Operations
   ↓
Scheduling & Attendance
   ↓
Reports & Activity
   ↓
System Settings
```

The most important responsibility of the Super Admin is maintaining the
consistency of the complete PAWGUARD lifecycle while ensuring that each
user receives only the access appropriate to their role.

For volunteer operations specifically:

``` text
Application
   ↓
Review
   ↓
Onboarding / Background Check
   ↓
Activation
   ↓
Work Assignment
   ↓
Shift Assignment
   ↓
Attendance
   ↓
Service Hours
   ↓
Activity History
   ↓
Certificate
```

The Super Admin therefore provides the highest level of administrative
oversight across PAWGUARD while remaining governed by the backend's
actual APIs, permissions, validation rules, and business logic.
