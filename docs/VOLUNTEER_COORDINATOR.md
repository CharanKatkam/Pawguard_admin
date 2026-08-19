# PAWGUARD ADMIN PORTAL — VOLUNTEER COORDINATOR ROLE

## 1. About the Role

The **Volunteer Coordinator** manages the operational volunteer lifecycle in PAWGUARD.

The role is responsible for reviewing volunteer applications, onboarding approved applicants, managing volunteer participation, assigning work and shifts, and tracking volunteer activity.

The Volunteer Coordinator is the primary operational role for coordinating volunteers after they apply.

### Primary Responsibilities

- Review incoming volunteer applications.
- Review applicant information, skills, availability, and application details.
- Approve/onboard eligible applicants.
- Complete the required background-check/onboarding step.
- Activate volunteers after the backend activation requirements are satisfied.
- Deactivate or reactivate volunteers when authorized.
- Manage volunteer work assignments.
- Create and manage volunteer shifts.
- Assign volunteers to shifts.
- Track attendance.
- Track volunteer hours and activity.
- View volunteer service summaries.
- Access service certificates where supported by the backend.

---

# 2. RBAC Permissions

The backend role mapping provides the Volunteer Coordinator with:

```text
volunteer:create
volunteer:read
volunteer:update
volunteer:schedule
dashboard:volunteer
```

## Permission Meaning

| Permission | Purpose |
|---|---|
| `volunteer:create` | Create volunteer-related records where supported |
| `volunteer:read` | View volunteer profiles, applications, and volunteer information |
| `volunteer:update` | Update volunteer records and lifecycle information |
| `volunteer:schedule` | Manage volunteer schedules/shifts |
| `dashboard:volunteer` | Access the Volunteer Coordinator dashboard |

The frontend must use the backend permission system as the final authority.

---

# 3. Complete Volunteer Lifecycle

The operational workflow is:

```text
Volunteer Applies
        ↓
Application Received
        ↓
Coordinator Reviews Application
        ↓
Approve / Reject
        ↓
Approved Applicant
        ↓
Onboarding / Background Check
        ↓
ONBOARDED
        ↓
Activate
        ↓
ACTIVE
        ↓
Assign Work / Schedule Shift
        ↓
Volunteer Performs Work
        ↓
Attendance Check-in
        ↓
Attendance Check-out
        ↓
Hours / Activity Recorded
        ↓
Service History
        ↓
Certificate where supported
```

## Important Backend Rule

The backend requires the background check to be completed before a volunteer can become `active`.

Therefore:

```text
APPLIED
  ↓
ONBOARDED + background_check_completed = true
  ↓
ACTIVE
```

The UI must not bypass this backend rule.

---

# 4. Volunteer Application Management

## Purpose

The Applications area is where the coordinator receives and reviews volunteer applications.

### Application Information

The coordinator should be able to view available backend information such as:

- Applicant name
- Email
- Phone
- Emergency contact
- Skills
- Availability
- Application date
- Applied/preferred information where actually supported
- Current volunteer status
- Background-check status

## Application Status

The backend volunteer lifecycle currently supports:

```text
applied
onboarded
active
inactive
```

The frontend must not invent a backend status that does not exist.

If the backend does not provide a dedicated `rejected` status, rejection must follow the existing backend-supported mechanism rather than creating a fake enum value.

---

# 5. Application Review Workflow

### Step 1 — Receive Application

A volunteer submits an application through the existing public volunteer workflow.

The coordinator sees the application in the Admin Portal.

### Step 2 — Open Application

The application row should be clickable and open a details view/modal.

The details view should show actual backend data.

### Step 3 — Review

The coordinator checks:

- Applicant information
- Skills
- Availability
- Emergency contact
- Relevant volunteer information
- Current status

### Step 4 — Approve / Onboard

If the applicant is suitable, the coordinator performs the onboarding action.

The backend lifecycle should transition to:

```text
status = onboarded
background_check_completed = true
```

only when the required onboarding/background-check process has actually been completed.

### Step 5 — Activate

After the background check is completed, the coordinator can activate the volunteer.

```text
status = active
```

### Step 6 — Assign Work

Once eligible, the volunteer can receive work assignments or shifts.

---

# 6. Volunteer Profile Management

The Volunteer Management/Roster area should provide a complete view of volunteer records.

### Profile Information

Where supplied by the backend:

- Name
- Email
- Phone
- Emergency contact
- Skills
- Availability
- Volunteer status
- Background-check status
- Background-check notes
- Application date
- Service history
- Shift history
- Attendance information

### Statuses

The coordinator should be able to work with:

```text
APPLIED
ONBOARDED
ACTIVE
INACTIVE
```

The UI actions must depend on the current lifecycle state.

---

# 7. Role / Work Assignment

After a volunteer is approved/onboarded and eligible for work, the coordinator can assign work.

## Assign Work

The assignment interface should allow the coordinator to provide fields supported by the existing backend architecture.

Possible information includes:

- Volunteer
- Assignment title
- Description / instructions
- Location
- Date
- Start time
- End time
- Priority
- Status

Do not add fields to API requests unless they are supported by the backend schema.

---

# 8. Shift Management

The coordinator is responsible for scheduling volunteer shifts.

The backend-supported volunteer workflow includes:

```text
GET /api/v1/volunteers/shifts
POST /api/v1/volunteers/shifts
POST /api/v1/volunteers/shifts/{shift_id}/join
```

## Create Shift

A shift can contain backend-supported information such as:

- Shift title/details
- Date
- Start time
- End time
- Location
- Capacity
- Status

## Assign Volunteer

The coordinator can assign a volunteer to a shift using the existing shift assignment endpoint.

The volunteer should then be able to see the relevant assignment through the connected public volunteer experience where supported.

---

# 9. Attendance Management

Volunteer attendance is part of the coordinator's operational workflow.

The existing backend provides:

```text
GET /api/v1/volunteers/shifts/{shift_id}/attendance

POST /api/v1/volunteers/attendance/{id}/check-in

POST /api/v1/volunteers/attendance/{id}/check-out
```

## Check-in

Record the volunteer's start of participation for the shift.

## Check-out

Record the end of participation.

## Attendance Information

Where returned by the backend, display:

- Volunteer
- Shift
- Check-in time
- Check-out time
- Attendance status
- Hours

---

# 10. Volunteer Hours

Volunteer service hours should be derived from actual backend attendance/service records.

The coordinator should not manually fabricate totals.

The service summary endpoint is:

```text
GET /api/v1/volunteers/{profile_id}/service-summary
```

The service summary may provide information such as:

- Total service hours
- Completed shifts
- Enrolled shifts
- Other backend-supported service statistics

---

# 11. Volunteer Activity

The coordinator should be able to review volunteer activity based on actual backend data.

### Activity Can Include

- Completed assignments
- Completed shifts
- Attendance
- Total service hours
- Service history

Only data returned by the backend should be displayed.

---

# 12. Certificates

Where supported by the backend, the coordinator can access a volunteer's service certificate.

Existing endpoint:

```text
GET /api/v1/volunteers/{profile_id}/certificate
```

Certificate availability should depend on the backend response.

The frontend must not create fake certificates or claim a certificate exists when the backend does not provide one.

---

# 13. Volunteer Coordinator Dashboard

The dashboard should provide an operational overview of the volunteer program.

## Recommended Sections

### Applications

Show real application information from the backend.

Useful states:

- Pending/applied applications
- Onboarded volunteers
- Active volunteers
- Inactive volunteers

Do not display hard-coded counts.

### Volunteer Roster

Show actual volunteer records.

Useful columns:

- Volunteer
- Contact
- Status
- Skills
- Availability
- Background-check state
- Actions

### Work / Assignments

Show actual assignments or scheduled volunteer work where the backend provides the required data.

### Shifts

Show:

- Upcoming shifts
- Assigned volunteers
- Shift status
- Capacity where supported

### Attendance

Show actual attendance records.

### Hours / Activity

Show service statistics derived from backend data.

---

# 14. Role-Based Actions

The actions should change according to the volunteer's lifecycle.

## APPLIED

Recommended actions:

```text
View Details
Onboard / Approve
Reject (only through an existing supported backend workflow)
```

## ONBOARDED

Recommended actions:

```text
View Details
Activate
Assign Work
Schedule Shift
```

Activation must only succeed when the backend confirms that the background check has been completed.

## ACTIVE

Recommended actions:

```text
View Details
Assign Work
Schedule Shift
View Attendance
View Service Summary
Certificate (when available)
Deactivate
```

## INACTIVE

Recommended actions:

```text
View Details
Reactivate
```

Reactivate must still respect the backend's business rules.

---

# 15. Application Deduplication

A critical business requirement is preventing duplicate applications for the same user.

The coordinator dashboard should not create a new volunteer application when the same user already has an existing volunteer record.

The correct behavior is:

```text
User Applies
      ↓
Volunteer Record Exists
      ↓
Admin/Coordinator Sees Existing Record
      ↓
Show Current Status
      ↓
Continue Existing Lifecycle
```

Do not create another volunteer profile simply because the user submits the application again.

The backend remains the source of truth for identity and existing volunteer records.

---

# 16. Public Website Synchronization

The volunteer lifecycle must remain consistent between the Admin Portal and public Volunteer Dashboard.

Conceptually:

| Backend State | Public Meaning |
|---|---|
| `applied` | `PENDING` |
| `onboarded` | `APPROVED` / onboarding completed |
| `active` | `ACTIVE` |
| `inactive` | `INACTIVE` |

The exact public representation must follow the existing public application's implementation and backend response.

The Admin Portal must not maintain an independent fake volunteer status.

---

# 17. Important Business Rules

### Background Check

A volunteer cannot be activated until the background check is completed.

```text
background_check_completed = true
```

must be satisfied before activation.

### Backend Validation

The frontend must send only fields accepted by the current backend OpenAPI schema.

### No Mock Data

Do not create fake:

- Volunteers
- Applications
- Assignments
- Shifts
- Attendance
- Hours
- Certificates
- Dashboard statistics

### Backend as Source of Truth

The backend determines:

- Identity
- Status
- Permissions
- Background-check state
- Volunteer records
- Shift records
- Attendance
- Service history

---

# 18. Error Handling

The dashboard must display backend validation failures clearly.

For example, if activation is attempted before the background check:

```text
Volunteer cannot be activated until the background check is completed.
```

The UI should not silently convert the failure into a successful status.

Other API failures should display the actual meaningful backend error whenever available.

---

# 19. Security and RBAC

The Volunteer Coordinator should only receive volunteer actions allowed by its permissions.

The frontend may hide unauthorized actions for usability, but backend authorization remains mandatory.

A user must not gain additional access merely by manipulating frontend state.

The relevant permissions are:

```text
volunteer:create
volunteer:read
volunteer:update
volunteer:schedule
dashboard:volunteer
```

---

# 20. Complete Role Journey

```text
LOGIN
  ↓
Volunteer Coordinator Dashboard
  ↓
Review Applications
  ↓
Open Applicant Details
  ↓
Approve / Onboard
  ↓
Complete Background Check
  ↓
Activate Volunteer
  ↓
Volunteer Becomes ACTIVE
  ↓
Assign Work
  ↓
Create / Assign Shift
  ↓
Volunteer Performs Shift
  ↓
Check-in
  ↓
Work / Shift
  ↓
Check-out
  ↓
Attendance Recorded
  ↓
Service Hours Updated
  ↓
Review Activity / History
  ↓
Certificate when supported
```

---

# 21. Module Summary

| Module | Coordinator Capability |
|---|---|
| Applications | Review and process volunteer applications |
| Volunteer Management | View and update volunteer lifecycle |
| Onboarding | Complete onboarding/background-check stage |
| Activation | Activate eligible volunteers |
| Assignments | Assign work to eligible volunteers |
| Shifts | Create and schedule shifts |
| Attendance | Track check-in/check-out |
| Hours | Review service hours |
| Activity | Review completed work and service history |
| Certificates | Access certificates where supported |
| Dashboard | Monitor volunteer operations |

---

# 22. Dashboard Conclusion

The **Volunteer Coordinator** is the operational owner of the PAWGUARD volunteer lifecycle.

The dashboard should provide one continuous workflow instead of disconnected modules:

```text
APPLICATION
    ↓
REVIEW
    ↓
ONBOARD / BACKGROUND CHECK
    ↓
ACTIVATE
    ↓
ASSIGN WORK
    ↓
SCHEDULE SHIFT
    ↓
ATTENDANCE
    ↓
SERVICE HOURS
    ↓
ACTIVITY / HISTORY
    ↓
CERTIFICATE
```

The most important rule is that **activation is not the same as onboarding**.

`onboarded` represents completion of the onboarding/background-check stage required by the backend. Only after that requirement is satisfied should the volunteer move to `active`.

The Volunteer Coordinator dashboard should therefore remain tightly connected to the backend volunteer lifecycle, use real API data, respect RBAC, prevent duplicate applications, and keep the public volunteer experience synchronized with the authoritative backend state.
