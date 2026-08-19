# PAWGUARD Admin Portal — Rescue Coordinator Role Documentation

**Document:** `RESCUE_COORDINATOR.md`  
**Portal:** PAWGUARD Admin Portal  
**Role:** Rescue Coordinator  
**Purpose:** Complete role, access, workflow, module, and dashboard reference

---

## 1. About the Rescue Coordinator Role

The **Rescue Coordinator** is responsible for coordinating rescue operations from the point a rescue request is received through assignment, dispatch, field progress, completion, and operational follow-up.

The role works between rescue requests, rescue personnel/agents, shelter operations, and administrative records.

The Rescue Coordinator focuses on **operational coordination** rather than organization-wide administration.

### Primary Responsibilities

- Review incoming rescue requests.
- Check request details and rescue requirements.
- Prioritize rescue cases.
- Coordinate rescue personnel/agents.
- Assign or dispatch rescue teams where permitted.
- Track rescue operation progress.
- Monitor pending and active rescue operations.
- Coordinate animal pickup/handover.
- Update operational status.
- Record completion information.
- Track rescue history and activity.
- Coordinate with shelter operations when a rescued animal needs shelter placement.
- Keep rescue information accurate and up to date.

---

## 2. Rescue Coordinator Access

The Rescue Coordinator should have access only to modules and actions required for rescue operations.

### Typical Access

| Module | Access |
|---|---|
| Dashboard | View operational rescue overview |
| Rescue Management | View/manage rescue operations |
| Rescue Requests | Review and process requests |
| Rescue Dispatch | Coordinate/dispatch rescue operations |
| Rescue Agents/Personnel | View and coordinate available personnel |
| Shelter-related handover | Coordinate where supported |
| Notifications | View operational notifications |
| Reports | View rescue operational reports |
| User Management | Restricted / not organization-wide administration |
| Roles & Permissions | No |
| System Configuration | No |

The backend remains the source of truth for authorization. The UI must not expose actions that the authenticated Rescue Coordinator is not permitted to perform.

---

# 3. Rescue Coordinator Dashboard

The dashboard provides a real-time operational overview of rescue activity.

### Dashboard should show

- Total rescue requests.
- Pending rescue requests.
- Requests requiring review.
- Assigned rescue operations.
- Active/in-progress rescues.
- Completed rescues.
- Cancelled/closed rescues where supported.
- Available rescue personnel/agents where supported.
- Rescue workload.
- Recent rescue activity.
- Important notifications.

### Dashboard Actions

The coordinator should be able to quickly navigate to:

- Pending rescue requests.
- Active rescue operations.
- Dispatch/assignment workflow.
- Rescue operation details.
- Completed rescue records.
- Relevant notifications/reports.

---

# 4. Rescue Requests Module

The Rescue Requests module is the starting point for rescue coordination.

## What the coordinator can do

- View incoming rescue requests.
- Search rescue requests.
- Filter requests by status.
- Open request details.
- Review location and contact information.
- Review animal information.
- Review rescue reason/description.
- Review urgency/priority where supported.
- Check request history.
- Process requests according to backend permissions.

### Request Information

A request may contain:

- Request ID.
- Requester information.
- Contact information.
- Rescue location.
- Animal details.
- Rescue description.
- Date/time submitted.
- Priority/urgency.
- Current status.
- Assignment/dispatch information.
- Notes/history.

---

# 5. Rescue Request Review Workflow

The coordinator follows this operational sequence:

```text
Rescue Request Submitted
        ↓
Coordinator Receives Request
        ↓
Review Request Details
        ↓
Check Location / Animal / Urgency
        ↓
Determine Operational Requirement
        ↓
Assign / Dispatch Rescue Personnel
        ↓
Rescue Operation Starts
        ↓
Track Progress
        ↓
Rescue Completed
        ↓
Update Completion Details
        ↓
Handover / Shelter Coordination if Required
        ↓
Close / Complete Operation
```

The exact status transitions must follow the existing backend API and validation rules.

---

# 6. Rescue Management Module

Rescue Management provides the coordinator with the operational view of rescue cases.

## What can be done

- View rescue cases.
- Search rescue records.
- Filter by operational status.
- Open rescue details.
- Review assigned personnel.
- Review rescue location.
- Track progress.
- Update permitted operational information.
- View completed rescue history.

### Rescue Detail View

The detail view should provide relevant backend data such as:

- Rescue/request ID.
- Requester.
- Contact details.
- Animal details.
- Location.
- Rescue reason.
- Priority.
- Current status.
- Assigned personnel.
- Dispatch information.
- Operational timestamps.
- Notes.
- Completion information.

---

# 7. Rescue Dispatch Module

Rescue Dispatch is used to coordinate field response.

## Coordinator responsibilities

- Identify suitable rescue personnel.
- Assign a rescue operation where permitted.
- Provide the required rescue location/details.
- Track dispatch status.
- Monitor active operations.
- Update dispatch information when permitted.
- Coordinate reassignment where supported.

### Dispatch Workflow

```text
Request Reviewed
      ↓
Rescue Personnel Identified
      ↓
Operation Assigned
      ↓
Dispatch Initiated
      ↓
Personnel Responds
      ↓
Rescue In Progress
      ↓
Rescue Completed
```

No fake assignment or dispatch record should be created in the frontend. All dispatch data must use existing backend APIs.

---

# 8. Rescue Personnel / Agent Coordination

The Rescue Coordinator may need to coordinate with rescue agents/personnel.

## Possible operations

- View available personnel.
- View personnel status.
- Review assigned operations.
- Select suitable personnel.
- Assign rescue cases where permitted.
- Monitor active assignments.
- Review personnel activity.

### Assignment considerations

Where supported by the backend, assignment should consider:

- Availability.
- Current workload.
- Location.
- Rescue requirements.
- Operational priority.
- Existing assignment status.

---

# 9. Rescue Operation Tracking

Once a rescue is assigned, the coordinator tracks its progress.

### Operational tracking

- Assigned.
- Dispatched.
- In progress.
- Completed.
- Cancelled/closed where supported.

The coordinator should be able to identify cases that are:

- Waiting for assignment.
- Waiting for dispatch.
- Currently active.
- Completed.
- Requiring follow-up.

---

# 10. Animal Handover / Shelter Coordination

After a rescue, the animal may need to be transferred to an appropriate shelter or care workflow.

The Rescue Coordinator coordinates the handover where the existing system supports it.

### Handover information may include

- Rescued animal.
- Rescue case.
- Pickup location.
- Destination shelter.
- Handover status.
- Date/time.
- Responsible personnel.
- Notes.

The coordinator should not create a separate animal identity if the backend already provides an existing animal/dog record.

---

# 11. Notifications

Notifications help the coordinator identify operational events requiring attention.

Examples include:

- New rescue request.
- High-priority request.
- Assignment/dispatch update.
- Rescue status change.
- Personnel update.
- Handover requirement.
- Completion update.

The coordinator should use notifications as an operational aid while treating the relevant backend record as the source of truth.

---

# 12. Reports and Operational Monitoring

Where reporting functionality is available, the Rescue Coordinator can review rescue operations.

Useful operational metrics include:

- Total requests.
- Pending requests.
- Active rescues.
- Completed rescues.
- Rescue workload.
- Response/operation activity.
- Personnel assignments.
- Completed rescue history.

Reports should use real backend data only.

---

# 13. Complete Rescue Coordinator Workflow

### Phase 1 — Request Intake

1. Rescue request is submitted.
2. Request becomes available to the rescue operations team.
3. Coordinator opens the request.
4. Coordinator reviews all available information.

### Phase 2 — Assessment

1. Verify rescue location.
2. Review animal information.
3. Review urgency/priority.
4. Determine operational requirements.
5. Identify appropriate personnel.

### Phase 3 — Assignment / Dispatch

1. Select available rescue personnel.
2. Assign the operation using the existing backend workflow.
3. Confirm dispatch details.
4. Monitor the operation.

### Phase 4 — Rescue Execution

1. Personnel responds to the location.
2. Rescue operation progresses.
3. Coordinator monitors status.
4. Coordinator handles operational updates where permitted.

### Phase 5 — Completion

1. Rescue is completed.
2. Completion information is recorded.
3. Animal handover/shelter coordination is completed if required.
4. Rescue record is closed according to backend workflow.
5. Completed activity becomes part of rescue history.

---

# 14. Role Boundaries

The Rescue Coordinator is an operational role.

### The coordinator should NOT have unrestricted access to:

- User account administration.
- Organization-wide role creation.
- Permission configuration.
- System configuration.
- Super Admin functions.
- Security administration.

Those capabilities belong to higher-level administrative roles according to the application's authorization model.

---

# 15. Backend and Data Rules

The Rescue Coordinator frontend must follow these principles:

1. Use existing backend APIs.
2. Do not create mock rescue records.
3. Do not fabricate rescue statuses.
4. Do not invent API endpoints.
5. Respect backend authorization.
6. Respect backend validation.
7. Display backend status values accurately.
8. Use backend IDs for requests, animals, personnel, and operations.
9. Refresh data after important status-changing actions.
10. Keep dashboard counts synchronized with backend data.

---

# 16. Module-to-Workflow Summary

| Module | Main Purpose |
|---|---|
| Dashboard | Rescue operational overview |
| Rescue Requests | Review incoming cases |
| Rescue Management | Manage and track rescue cases |
| Rescue Dispatch | Coordinate field response |
| Rescue Personnel | Coordinate available rescue staff/agents |
| Shelter/Handover | Coordinate post-rescue placement |
| Notifications | Surface operational events |
| Reports | Review rescue activity |

---

# 17. Dashboard Conclusion

The **Rescue Coordinator Dashboard** is the operational control center for rescue activities.

Its complete responsibility is:

```text
Receive
  ↓
Review
  ↓
Assess
  ↓
Assign
  ↓
Dispatch
  ↓
Track
  ↓
Complete
  ↓
Handover
  ↓
Record History
```

The coordinator should be able to move a rescue case through its complete operational lifecycle using the existing PAWGUARD backend workflow while remaining within the permissions assigned to the Rescue Coordinator role.

The dashboard should provide a clear operational view without duplicating Super Admin responsibilities.

---

## 18. Final Role Summary

**Rescue Coordinator = Rescue Operations Coordinator**

The role is responsible for:

- Rescue request review.
- Rescue prioritization.
- Rescue assignment.
- Rescue dispatch coordination.
- Field operation tracking.
- Personnel coordination.
- Rescue completion.
- Animal handover coordination.
- Rescue history and activity tracking.

The role is **not** responsible for unrestricted platform administration, role/permission management, or system configuration.

---

**Document Status:** Role documentation reference  
**Source of truth for authorization:** PAWGUARD backend  
**Data policy:** Use existing backend data and APIs only; no mock/fake operational records.
