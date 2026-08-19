# PAWGUARD Admin Portal — Rescue Agent Role Documentation

**Document:** `RESCUE_AGENT.md`  
**Portal:** PAWGUARD Admin Portal  
**Role:** Rescue Agent  
**Purpose:** Complete role, access, workflow, module, and dashboard reference

---

## 1. About the Rescue Agent Role

The **Rescue Agent** is a field-operational role responsible for carrying out assigned rescue activities.

Unlike the Rescue Coordinator, who manages and coordinates rescue operations, the Rescue Agent primarily works on the **assigned field tasks** and updates the operational progress of those tasks through the PAWGUARD system.

The Rescue Agent works from assignments created or coordinated through the rescue workflow.

### Primary Responsibilities

- View assigned rescue requests/operations.
- Review rescue details.
- View rescue location and animal information.
- Review instructions and operational notes.
- Accept or process assigned rescue work where supported.
- Update rescue progress/status where permitted.
- Carry out field rescue activities.
- Record relevant rescue activity.
- Complete assigned rescue operations.
- Provide completion information.
- Coordinate with the Rescue Coordinator when an operational issue occurs.
- Maintain accurate field activity records.

---

# 2. Rescue Agent Access

The Rescue Agent should have access only to functionality required to perform assigned rescue work.

| Module | Access |
|---|---|
| Dashboard | View personal rescue workload and assigned operations |
| My Rescue Requests / Assignments | View assigned rescue work |
| Rescue Details | View assigned case details |
| Rescue Operations | Update assigned operation where permitted |
| Rescue Dispatch Information | View dispatch details |
| Location / Contact Information | View information required for the assigned rescue |
| Activity / History | View own rescue activity |
| Notifications | View operational notifications |
| Reports | Restricted to relevant personal/operational information |
| User Management | No |
| Roles & Permissions | No |
| Rescue Administration | No unrestricted access |
| System Configuration | No |

The backend remains the source of truth for authorization. The frontend must not expose actions that the authenticated Rescue Agent is not authorized to perform.

---

# 3. Rescue Agent Dashboard

The Rescue Agent Dashboard is the agent's operational workspace.

It should focus on **what the agent needs to do**, rather than organization-wide rescue administration.

### Dashboard information

Where supported by the backend, the dashboard can show:

- Assigned rescue operations.
- Pending assignments.
- Active/in-progress rescues.
- Completed rescues.
- Today's assigned work.
- Upcoming rescue activities.
- Recent activity.
- Important notifications.

### Dashboard Actions

The agent should be able to quickly access:

- Assigned rescue details.
- Active rescue operation.
- Location/contact information.
- Rescue instructions.
- Operation status updates.
- Completion information.

---

# 4. Assigned Rescue Work Module

This is the primary module for the Rescue Agent.

The agent should see rescue work specifically assigned to them.

## What the agent can do

- View assigned rescue operations.
- Search/filter assigned work where supported.
- Open rescue details.
- Review animal information.
- Review requester information.
- Review rescue location.
- Review contact details.
- Review urgency/priority.
- Review operational instructions.
- View assignment status.
- Update permitted operation status.
- Complete assigned work.

The agent must not modify information outside their assigned operational responsibilities.

---

# 5. Rescue Details

Opening an assigned rescue should provide all information required for the field operation.

### Details may include

- Rescue/request ID.
- Requester name.
- Requester contact information.
- Rescue location.
- Animal details.
- Rescue reason.
- Priority/urgency.
- Assignment information.
- Current rescue status.
- Coordinator information where supported.
- Operational notes.
- Dispatch information.
- Relevant timestamps.
- Completion information.

The agent should use this information to perform the assigned rescue safely and correctly.

---

# 6. Rescue Operation Workflow

The normal Rescue Agent workflow is:

```text
Rescue Request
      ↓
Coordinator Reviews Request
      ↓
Rescue Operation Assigned
      ↓
Rescue Agent Receives Assignment
      ↓
Agent Reviews Details
      ↓
Agent Responds / Starts Operation
      ↓
Rescue In Progress
      ↓
Agent Performs Field Rescue
      ↓
Agent Records Required Updates
      ↓
Rescue Completed
      ↓
Completion Details Recorded
      ↓
Coordinator / System Receives Updated Status
```

The exact status names and transitions must follow the existing backend implementation.

---

# 7. Assignment Acceptance / Response

Where the existing backend supports an acceptance or response action, the Rescue Agent should process the assignment through that existing API.

### Possible sequence

```text
Assigned
   ↓
Review Assignment
   ↓
Accept / Respond
   ↓
In Progress
```

If the backend does not provide a separate acceptance state, the UI must not invent one. The agent should use the existing backend status workflow.

---

# 8. Rescue Location and Contact Information

The agent needs access to operational information required to reach and perform the rescue.

This may include:

- Rescue location.
- Address.
- Location notes.
- Requester contact.
- Emergency contact information where supported.
- Rescue instructions.
- Animal information.

Sensitive information should only be displayed when permitted by the backend authorization model and required for the assigned operation.

---

# 9. Rescue Activity / Status Updates

During an active rescue, the agent may be permitted to update operational status.

Examples of backend-supported operational states may include:

- Assigned.
- Dispatched.
- In Progress.
- Completed.
- Cancelled/closed where supported.

The frontend must use the actual backend status values and must not create fake status values.

### Status update principle

```text
Backend Status
      ↓
Agent sees current status
      ↓
Agent performs permitted action
      ↓
Backend validates transition
      ↓
Updated status returned
      ↓
Dashboard refreshes
```

---

# 10. Completing a Rescue

After completing the field operation, the Rescue Agent should record the information supported by the backend.

Possible completion information includes:

- Completion status.
- Completion date/time.
- Rescue notes.
- Operational outcome.
- Handover information where supported.
- Other backend-defined completion fields.

The agent should not fabricate animal records, rescue records, or completion information.

---

# 11. Shelter / Animal Handover

Some rescue operations may require the rescued animal to be transferred to a shelter or another approved destination.

Where the existing workflow supports this, the Rescue Agent may participate in the handover.

### Handover workflow

```text
Rescue Completed
      ↓
Animal Ready for Handover
      ↓
Destination Confirmed
      ↓
Animal Transferred
      ↓
Handover Recorded
      ↓
Rescue Case Updated
```

The Rescue Agent should only perform handover actions exposed by the backend for their role.

The agent should not independently create or modify organization-wide shelter records unless explicitly authorized.

---

# 12. Notifications

Notifications keep the Rescue Agent informed about operational changes.

Possible notifications include:

- New rescue assignment.
- Assignment update.
- Dispatch update.
- Coordinator message/update.
- Priority change.
- Location/instruction change.
- Rescue status change.
- Handover requirement.
- Completion confirmation.

The agent should review notifications regularly because they may contain changes to an active assignment.

---

# 13. Rescue History

The Rescue Agent may have access to their own completed rescue activity.

### History may include

- Rescue ID.
- Rescue date.
- Location.
- Animal information.
- Operation status.
- Completion status.
- Completion time.
- Activity notes.

History is useful for reviewing previous field activity and operational performance.

Access should remain limited according to backend permissions.

---

# 14. Reports

The Rescue Agent is not an administrative reporting role.

Where reports are available, they should focus on information relevant to the agent, such as:

- Assigned rescues.
- Completed rescues.
- Current workload.
- Personal activity history.

The agent should not have unrestricted access to organization-wide administrative reports unless explicitly permitted by the backend.

---

# 15. Communication With Rescue Coordinator

The Rescue Coordinator is responsible for overall rescue coordination.

The Rescue Agent should escalate operational issues to the coordinator when required.

Examples:

- Cannot reach the rescue location.
- Location information is incorrect.
- Animal condition differs from the request.
- Additional assistance is required.
- Assignment cannot be completed.
- Handover destination changes.
- Safety or operational issue occurs.

The system should use existing notification/communication functionality where available rather than introducing a separate communication mechanism.

---

# 16. Complete Rescue Agent Workflow

## Phase 1 — Assignment

1. Rescue request is reviewed by the Rescue Coordinator.
2. Rescue operation is assigned to the Rescue Agent.
3. Agent receives the assignment.

## Phase 2 — Preparation

1. Agent opens the assignment.
2. Reviews animal information.
3. Reviews requester information.
4. Reviews rescue location.
5. Reviews priority and instructions.
6. Confirms the information required for the operation.

## Phase 3 — Field Operation

1. Agent proceeds with the rescue.
2. Agent starts the operation where supported.
3. Agent performs the assigned rescue.
4. Agent updates permitted operational statuses.
5. Agent records required information.

## Phase 4 — Completion

1. Rescue is completed.
2. Agent records completion information.
3. Animal handover is completed where required.
4. Completion status is submitted.
5. Coordinator/system receives the updated operation status.

## Phase 5 — History

1. Completed rescue becomes part of the rescue history.
2. Agent can review completed activity where permitted.

---

# 17. Rescue Agent vs Rescue Coordinator

| Responsibility | Rescue Coordinator | Rescue Agent |
|---|---|---|
| Review incoming requests | Yes | Limited/no |
| Prioritize rescue requests | Yes | No |
| Assign rescue personnel | Yes, where permitted | No |
| View assigned rescue | Yes | Yes |
| Perform field rescue | Coordinate | Yes |
| Update assigned operation | Yes | Yes, where permitted |
| Monitor all rescue operations | Yes | No |
| Complete assigned rescue | Yes/coordinate | Yes |
| Manage rescue personnel | Yes | No |
| Organization-wide reports | Where permitted | No |
| User management | No | No |
| Roles & permissions | No | No |
| System configuration | No | No |

The key distinction is:

**Rescue Coordinator = coordinates the operation.**

**Rescue Agent = executes the assigned field operation.**

---

# 18. Backend and Data Rules

The Rescue Agent frontend must follow these rules:

1. Use existing PAWGUARD backend APIs.
2. Do not create mock rescue data.
3. Do not fabricate assignments.
4. Do not invent API endpoints.
5. Respect backend authorization.
6. Respect backend validation.
7. Use backend rescue/request IDs.
8. Use backend animal IDs where available.
9. Display actual backend status values.
10. Do not allow an agent to edit records outside their authorization.
11. Refresh assignment data after status-changing actions.
12. Keep the dashboard synchronized with backend state.

---

# 19. Module-to-Workflow Summary

| Module | Purpose |
|---|---|
| Dashboard | Personal rescue workload overview |
| Assigned Rescues | View field assignments |
| Rescue Details | Review complete assigned case |
| Rescue Operations | Perform/update assigned rescue |
| Dispatch Information | View operational dispatch details |
| Notifications | Receive assignment and operation updates |
| Rescue History | Review completed activity |
| Reports | View permitted personal/operational information |

---

# 20. Dashboard Conclusion

The **Rescue Agent Dashboard** is the field execution workspace for PAWGUARD rescue operations.

Its primary purpose is:

```text
Receive Assignment
       ↓
Review Details
       ↓
Respond
       ↓
Perform Rescue
       ↓
Update Progress
       ↓
Complete Rescue
       ↓
Record Outcome
       ↓
Handover if Required
       ↓
Maintain Activity History
```

The dashboard should remain focused and operational. It should not duplicate the Rescue Coordinator's management functions or the Super Admin's administrative functions.

---

# 21. Final Role Summary

**Rescue Agent = Field Rescue Execution Role**

The Rescue Agent is responsible for:

- Receiving assigned rescue work.
- Reviewing rescue details.
- Accessing required location/contact information.
- Performing assigned field rescues.
- Updating permitted operational statuses.
- Recording rescue completion.
- Supporting animal handover where applicable.
- Maintaining accurate activity history.
- Escalating operational issues to the Rescue Coordinator.

The role does **not** have unrestricted access to:

- User Management.
- Role & Permission Management.
- Organization-wide rescue administration.
- System configuration.
- Unassigned rescue cases.
- Administrative controls.

---

**Document Status:** Role documentation reference  
**Authorization source of truth:** PAWGUARD backend  
**Data policy:** Existing backend APIs and real records only; no mock/fake operational data.
