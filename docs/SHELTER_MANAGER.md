# PAWGUARD Admin Portal — Shelter Manager Role Documentation

**Document:** `SHELTER_MANAGER.md`  
**Portal:** PAWGUARD Admin Portal  
**Role:** Shelter Manager  
**Purpose:** Complete role, access, workflow, module, and dashboard reference

---

## 1. About the Shelter Manager Role

The **Shelter Manager** is responsible for managing the day-to-day operations of an assigned PAWGUARD shelter.

The role focuses on shelter capacity, animals/dogs under shelter care, shelter staff and volunteers, intake and movement, medical coordination, adoptions, foster coordination, and operational records.

The Shelter Manager is an operational management role. It is not a system-wide administrative role.

### Primary Responsibilities

- Monitor shelter operations.
- Manage shelter dogs/animals under the shelter's responsibility.
- Process and track animal intake.
- Monitor shelter capacity.
- Manage animal movement within the shelter.
- Coordinate medical requests and veterinary care.
- Coordinate volunteers and shelter work where supported.
- Manage foster-care coordination where supported.
- Manage adoption-related shelter activities.
- Track animal status and history.
- Monitor shelter operational activity.
- Review notifications relevant to shelter operations.
- Maintain accurate shelter records.

---

# 2. Shelter Manager Access

The Shelter Manager should have access to shelter operational modules required to manage the assigned shelter.

| Module | Access |
|---|---|
| Dashboard | View shelter operational overview |
| Shelter Management | Manage assigned shelter operations |
| Shelter Dogs / Animals | View and manage shelter animals |
| Intake / Animal Entry | Process permitted animal intake |
| Animal Movement | Manage permitted shelter movements |
| Medical Requests | Create/review/track medical requests |
| Adoptions | Manage shelter-side adoption workflow |
| Foster Care | Coordinate foster activities where supported |
| Volunteers | Coordinate shelter volunteers where permitted |
| Notifications | View shelter-related notifications |
| Reports | View shelter operational reports |
| User Management | Restricted |
| Roles & Permissions | No |
| System Configuration | No |
| Organization-wide administration | No |

The backend authorization model is the source of truth. The frontend must not expose operations that the authenticated Shelter Manager is not authorized to perform.

---

# 3. Shelter Manager Dashboard

The Shelter Manager Dashboard provides the operational overview of the assigned shelter.

### Dashboard information may include

- Shelter capacity.
- Current animals/dogs in shelter.
- Available capacity.
- New/intake animals.
- Animals requiring medical attention.
- Pending medical requests.
- Adoption pipeline.
- Foster activity.
- Volunteer activity.
- Recent shelter operations.
- Important notifications.

### Dashboard Actions

The manager should be able to navigate quickly to:

- Shelter animals.
- Intake.
- Medical requests.
- Adoptions.
- Foster care.
- Volunteer coordination.
- Shelter reports.
- Relevant notifications.

---

# 4. Shelter Management Module

The Shelter Management module is the central operational module for the Shelter Manager.

## What the manager can do

Where supported by existing backend APIs:

- View assigned shelter information.
- Review shelter capacity.
- Review operational status.
- View shelter details.
- Monitor occupancy.
- Review shelter activity.
- Manage permitted shelter operational information.
- Coordinate shelter resources.

### Shelter Information

The shelter record may contain:

- Shelter ID.
- Shelter name.
- Address/location.
- Contact information.
- Capacity.
- Current occupancy.
- Available capacity.
- Operational status.
- Shelter-related records.

The backend remains the source of truth for all shelter values.

---

# 5. Shelter Dogs / Animals Module

This module manages animals currently associated with the shelter.

## What the manager can do

- View shelter animals.
- Search animals.
- Filter by status.
- Open animal profiles.
- Review animal information.
- Review intake information.
- Review medical information where permitted.
- Review adoption status.
- Review foster status.
- Review animal history.
- Update permitted shelter-side information.

### Animal Profile

The profile may include:

- Animal ID.
- Name.
- Species.
- Breed.
- Age.
- Sex.
- Identification information.
- Current shelter.
- Animal status.
- Intake date.
- Medical status.
- Adoption status.
- Foster status.
- Notes.
- History.

The manager should use the existing backend animal identity and must not create duplicate animal records when an existing record already exists.

---

# 6. Animal Intake Workflow

Animal intake records the entry of an animal into shelter care.

### Typical workflow

```text
Animal Referred / Rescued
        ↓
Shelter Receives Animal
        ↓
Review / Identify Animal
        ↓
Create or Link Existing Animal Record
        ↓
Record Intake Information
        ↓
Assign Shelter
        ↓
Update Shelter Status
        ↓
Animal Becomes Part of Shelter Roster
```

### Intake information may include

- Animal identity.
- Source/rescue reference.
- Intake date/time.
- Shelter location.
- Condition.
- Notes.
- Medical requirements.
- Initial status.

The exact fields and transitions must follow the backend API.

---

# 7. Shelter Capacity Management

The Shelter Manager monitors whether the shelter has enough available capacity.

### Capacity monitoring

The dashboard may show:

- Total capacity.
- Current occupancy.
- Available spaces.
- Capacity utilization.
- Animals awaiting placement.

Capacity figures must come from real backend data.

The frontend must not use hard-coded or mock occupancy values.

---

# 8. Animal Movement

Animal movement tracks changes in where an animal is being cared for.

Possible movement scenarios include:

- Rescue to shelter.
- Shelter to foster care.
- Shelter to adoption.
- Shelter to medical care.
- Shelter-to-shelter transfer where supported.

### Movement principle

```text
Current Animal Location
        ↓
Movement Requested
        ↓
Destination Confirmed
        ↓
Backend Validates Movement
        ↓
Animal Location Updated
        ↓
Shelter Records Refreshed
```

The manager should only perform movements supported and authorized by the backend.

---

# 9. Medical Requests

The Shelter Manager may need to request veterinary/medical support for animals under shelter care.

## What the manager can do

Where supported:

- Identify animals requiring medical attention.
- Create a medical/vet request.
- Review existing medical requests.
- Track request status.
- Review veterinarian responses.
- Coordinate care.
- Review medical-related notes.

### Medical Request Workflow

```text
Animal Requires Medical Attention
        ↓
Shelter Manager Reviews Condition
        ↓
Medical Request Created
        ↓
Veterinary Team Receives Request
        ↓
Vet Reviews Request
        ↓
Treatment / Recommendation
        ↓
Shelter Coordinates Care
        ↓
Medical Record Updated
```

The manager should use the existing medical request workflow and backend endpoints.

---

# 10. Adoption Module

The Shelter Manager may participate in the shelter-side adoption lifecycle.

## Possible operations

- View animals available for adoption.
- Review adoption applications.
- Review applicant information where authorized.
- Track adoption status.
- Coordinate shelter-side approval steps.
- Prepare animal for adoption.
- Record permitted adoption outcomes.

### Adoption Workflow

```text
Animal Becomes Adoption Eligible
        ↓
Animal Listed / Available
        ↓
Adoption Application
        ↓
Application Review
        ↓
Shelter Processing
        ↓
Approval / Rejection
        ↓
Adoption Completion
        ↓
Animal Status Updated
```

The exact approval and status transitions must follow backend rules.

---

# 11. Foster Care Module

The Shelter Manager may coordinate foster placement for animals requiring temporary home care.

## What the manager can do

Where supported:

- View foster candidates.
- Review foster availability.
- Match animals with available foster placements.
- Track foster assignments.
- Review foster status.
- Coordinate return/transfer.
- Monitor foster activity.

### Foster Workflow

```text
Animal Requires Foster Care
        ↓
Foster Requirement Identified
        ↓
Suitable Foster Placement Found
        ↓
Assignment / Handover
        ↓
Foster Care Active
        ↓
Follow-up / Monitoring
        ↓
Return / Adoption / Other Placement
```

---

# 12. Volunteer Coordination

Shelter operations may depend on volunteers.

The Shelter Manager can coordinate shelter volunteer activity where permitted.

### Possible operations

- View volunteers associated with the shelter.
- Review volunteer availability.
- View assigned work/shifts.
- Coordinate shelter tasks.
- Review attendance/activity where supported.
- Coordinate work requirements.

The manager should not have unrestricted access to the platform-wide volunteer administration system unless explicitly authorized.

---

# 13. Shelter Notifications

Notifications help the manager respond to operational events.

Examples include:

- New animal intake.
- Medical request updates.
- Adoption updates.
- Foster placement changes.
- Volunteer updates.
- Capacity-related alerts.
- Animal status changes.
- Shelter operational notifications.

Notifications should be based on actual backend events.

---

# 14. Shelter Reports

The Shelter Manager may review operational reports for the assigned shelter.

Useful information can include:

- Animal population.
- Intake activity.
- Adoption activity.
- Foster activity.
- Medical requests.
- Shelter capacity.
- Volunteer activity.
- Animal movement.
- Completed shelter operations.

Reports must use live backend data and must respect the manager's scope of access.

---

# 15. Complete Shelter Manager Workflow

## Phase 1 — Shelter Operations

1. Manager signs into the Shelter Manager dashboard.
2. Reviews shelter occupancy and current workload.
3. Reviews pending operational tasks.
4. Checks notifications.

## Phase 2 — Animal Intake

1. Animal arrives or is transferred to the shelter.
2. Manager reviews the animal record.
3. Links to an existing animal record where applicable.
4. Records intake information.
5. Assigns/updates shelter placement.
6. Animal appears in the shelter roster.

## Phase 3 — Animal Care

1. Manager monitors animal status.
2. Identifies medical or care requirements.
3. Creates medical requests where necessary.
4. Coordinates veterinary care.
5. Updates permitted shelter records.

## Phase 4 — Placement

1. Animal becomes eligible for foster/adoption/transfer.
2. Manager reviews available placement options.
3. Coordinates foster or adoption workflow.
4. Records permitted movement/status changes.

## Phase 5 — Operational Management

1. Manager coordinates volunteers and shelter work where permitted.
2. Reviews shelter capacity.
3. Reviews animal movement.
4. Monitors pending requests.
5. Reviews reports and activity.

## Phase 6 — Completion / History

1. Completed operations are recorded.
2. Animal status and location remain synchronized.
3. Shelter records reflect current state.
4. Historical activity remains available according to backend permissions.

---

# 16. Role Boundaries

The Shelter Manager is responsible for **assigned shelter operations**.

The role should NOT have unrestricted access to:

- User Management.
- Role creation.
- Permission management.
- System configuration.
- Organization-wide administration.
- Other shelters outside the authorized scope unless backend permissions explicitly allow it.

### Key distinction

**Super Admin:** Platform-wide administration.

**Shelter Manager:** Shelter-level operational management.

---

# 17. Backend and Data Rules

The Shelter Manager frontend must follow these rules:

1. Use existing PAWGUARD backend APIs.
2. Do not create mock shelter data.
3. Do not fabricate animal records.
4. Do not create duplicate animal identities.
5. Do not invent API endpoints.
6. Respect backend authorization.
7. Respect backend validation.
8. Use backend IDs for shelters, animals, requests, and related records.
9. Display actual backend statuses.
10. Refresh affected data after status-changing operations.
11. Keep dashboard counts synchronized with backend data.
12. Do not expose organization-wide data outside the manager's authorization scope.

---

# 18. Module-to-Workflow Summary

| Module | Main Purpose |
|---|---|
| Dashboard | Shelter operational overview |
| Shelter Management | Manage assigned shelter operations |
| Shelter Dogs / Animals | Manage animals under shelter care |
| Intake | Record animal entry |
| Animal Movement | Track shelter/foster/adoption/transfer movement |
| Medical Requests | Coordinate veterinary care |
| Adoptions | Manage shelter-side adoption workflow |
| Foster Care | Coordinate foster placement |
| Volunteers | Coordinate shelter volunteer activity |
| Notifications | Track important shelter events |
| Reports | Review shelter operations |

---

# 19. Dashboard Conclusion

The **Shelter Manager Dashboard** is the operational control center for an assigned PAWGUARD shelter.

Its responsibility is to keep the shelter's:

- Animals,
- Capacity,
- Intake,
- Medical care,
- Foster placements,
- Adoptions,
- Volunteer activity,
- Movements, and
- Operational history

organized and synchronized with the backend.

The overall operational flow is:

```text
Receive / Intake
      ↓
Register / Link Animal
      ↓
Shelter Care
      ↓
Medical / Foster / Adoption Processing
      ↓
Movement / Placement
      ↓
Completion
      ↓
Historical Record
```

The dashboard should provide the Shelter Manager with everything needed to run the assigned shelter without duplicating Super Admin or platform-wide administrative responsibilities.

---

# 20. Final Role Summary

**Shelter Manager = Shelter Operations Management Role**

The Shelter Manager is responsible for:

- Managing assigned shelter operations.
- Monitoring shelter capacity.
- Managing shelter animal records.
- Processing animal intake.
- Tracking animal movement.
- Coordinating medical requests.
- Coordinating foster care.
- Managing shelter-side adoption activities.
- Coordinating shelter volunteers where permitted.
- Reviewing shelter notifications.
- Reviewing operational reports.
- Maintaining accurate shelter activity records.

The role does **not** have unrestricted access to:

- User Management.
- Roles & Permissions.
- System Configuration.
- Platform-wide administration.
- Unauthorized shelters or records.

---

**Document Status:** Role documentation reference  
**Authorization source of truth:** PAWGUARD backend  
**Data policy:** Existing backend APIs and real records only; no mock/fake operational data.
