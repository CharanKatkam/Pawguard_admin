# PAWGUARD ADMIN PORTAL — ADOPTION COORDINATOR

## 1. About the Role

The **Adoption Coordinator** manages the adoption lifecycle for animals that are available for adoption. This role coordinates applications, reviews adoption requests, processes approvals, and ensures that adoption records remain accurate.

The role is focused on **adoption operations** and does not have unrestricted access to administration, rescue operations, finance, medical management, or system RBAC.

### Primary Access

- Adoption applications
- Adoption processing
- Adoption approval
- Adoption locking/finalization
- Shelter read access
- Medical read access
- Adoption dashboard

### RBAC Permissions

The backend role mapping provides:

- `adoption:read`
- `adoption:process`
- `adoption:approve`
- `adoption:lock`
- `shelter:read`
- `medical:read`
- `dashboard:adoption`

---

## 2. Role Purpose

The Adoption Coordinator ensures that:

1. Animals available for adoption can be reviewed.
2. Adoption applications are received and tracked.
3. Applicant information is reviewed.
4. Applications are processed according to the available workflow.
5. Suitable applications are approved.
6. Finalized adoption records are protected from unintended changes.
7. Shelter and medical information can be consulted when making adoption decisions.
8. Adoption activity is reflected correctly in the dashboard.

---

# 3. Complete Adoption Workflow

## Step 1 — Animal Becomes Available

An animal is made available for adoption through the appropriate shelter/rescue workflow.

The Adoption Coordinator can access relevant shelter information using:

`Shelter → Read`

The coordinator can review available animal information before processing an application.

---

## Step 2 — Adoption Application Received

An adoption application enters the adoption workflow.

The coordinator reviews:

- Applicant information
- Animal information
- Application status
- Relevant adoption details
- Available shelter information
- Relevant medical information

The coordinator should not create duplicate adoption records when an existing application already exists.

---

## Step 3 — Review Application

The coordinator opens the adoption application and evaluates the available information.

Relevant information may include:

- Applicant details
- Animal selected
- Application status
- Application history
- Shelter information
- Medical information relevant to adoption

The coordinator uses the available adoption processing permissions to move the application through the workflow.

---

## Step 4 — Process Application

Permission:

`adoption:process`

Processing means handling the application through the supported adoption workflow.

Depending on the backend-supported workflow, this may include:

- Updating application status
- Reviewing application information
- Processing the application
- Moving the application toward approval

Only supported backend operations should be exposed in the Admin Portal.

---

## Step 5 — Approve Application

Permission:

`adoption:approve`

When the application satisfies the required adoption conditions, the Adoption Coordinator can approve it.

Approval should update the adoption record through the existing backend API.

The frontend must not invent additional adoption states that are not supported by the backend.

---

## Step 6 — Lock / Finalize Adoption

Permission:

`adoption:lock`

Once an adoption reaches the appropriate final stage, the coordinator can lock the adoption record.

Locking protects the finalized adoption workflow from inappropriate further modification.

---

## Step 7 — Post-Adoption Tracking

After finalization, the Adoption Coordinator can continue reviewing adoption records according to the available read permissions.

The coordinator should be able to distinguish:

- Applications still being processed
- Approved applications
- Finalized/locked adoption records

The exact statuses must come from the backend API rather than frontend-created mock states.

---

# 4. Adoption Dashboard

The Adoption Coordinator Dashboard is the primary workspace for this role.

## Dashboard Responsibilities

The dashboard should provide an operational view of:

- Adoption applications
- Application processing
- Approved adoptions
- Adoption activity
- Animals relevant to adoption
- Adoption workflow status

Dashboard values must come from live backend data.

### Important Rule

If there are no adoption records, applications, or other backend data, the dashboard should show a genuine empty state such as:

> No adoption applications available.

It must not display fake numbers such as:

- 0 generated from hardcoded statistics
- Mock application counts
- Fake approved adoption counts
- Fake animal records

Zero is valid when the backend actually returns zero records.

---

# 5. Adoption Module

## Purpose

The Adoption module is the main operational module for managing adoption applications.

### What the Coordinator Can Do

### View Applications

Permission:

`adoption:read`

The coordinator can view adoption records available through the backend.

Information may include:

- Application ID
- Applicant
- Animal
- Application status
- Dates
- Adoption information

### Process Applications

Permission:

`adoption:process`

The coordinator can process applications through supported backend operations.

### Approve Applications

Permission:

`adoption:approve`

The coordinator can approve applications when the workflow permits approval.

### Lock Applications

Permission:

`adoption:lock`

The coordinator can finalize/lock adoption records where supported.

---

# 6. Shelter Module

Permission:

`shelter:read`

The Adoption Coordinator has **read-only shelter access**.

This allows the coordinator to obtain information needed for adoption operations.

### What Can Be Viewed

Depending on backend availability:

- Shelter information
- Animals in shelter
- Animal availability
- Kennel/facility information
- Relevant shelter records

### What Cannot Be Assumed

The Adoption Coordinator should not automatically receive:

- Shelter updates
- Kennel management
- Shelter transfers
- Shelter creation/deletion

Those operations belong to roles with the corresponding shelter permissions.

---

# 7. Medical Module

Permission:

`medical:read`

The Adoption Coordinator has medical **read access**.

This is important because adoption decisions may require awareness of an animal's medical information.

### What Can Be Viewed

Where supported by the backend:

- Medical records
- Medical case information
- Relevant medical status
- Medical history

### Role Boundary

The Adoption Coordinator does not have medical creation/update/clearance permissions merely because they can read medical information.

Medical operations remain with authorized veterinary/medical roles.

---

# 8. Dashboard Access

Permission:

`dashboard:adoption`

The Adoption Coordinator can access the adoption dashboard.

The dashboard should be focused on adoption-related operational information rather than unrelated system administration.

---

# 9. Role-Based Access Summary

| Module | Access |
|---|---|
| Adoption | Read |
| Adoption Processing | Process |
| Adoption Approval | Approve |
| Adoption Finalization | Lock |
| Shelter | Read |
| Medical | Read |
| Adoption Dashboard | Full dashboard access |
| Rescue Administration | No direct access unless separately granted |
| Finance | No direct access unless separately granted |
| Inventory Management | No direct access unless separately granted |
| Volunteer Management | No direct access unless separately granted |
| System RBAC | No |
| User Administration | No |
| Super Admin Functions | No |

---

# 10. Complete User Journey

```text
Animal available for adoption
        ↓
Adoption application received
        ↓
Adoption Coordinator views application
        ↓
Review applicant + animal information
        ↓
Review relevant shelter information
        ↓
Review relevant medical information
        ↓
Process application
        ↓
Approve application
        ↓
Finalize / lock adoption
        ↓
Adoption record retained for tracking
```

---

# 11. Permission-to-Action Mapping

| Permission | Action |
|---|---|
| `adoption:read` | View adoption records |
| `adoption:process` | Process adoption applications |
| `adoption:approve` | Approve adoption applications |
| `adoption:lock` | Lock/finalize adoption |
| `shelter:read` | View shelter information |
| `medical:read` | View medical information |
| `dashboard:adoption` | Access adoption dashboard |

---

# 12. Access Control Rules

The Admin Portal must follow backend RBAC as the source of truth.

### Do

- Show only actions allowed by the user's effective permissions.
- Respect role permissions.
- Respect direct user permission overrides.
- Use backend authorization for final enforcement.
- Hide unavailable actions from the UI.
- Display backend errors clearly.
- Use real adoption data.

### Do Not

- Give Adoption Coordinator Super Admin access.
- Add fake adoption records.
- Add fake dashboard statistics.
- Allow medical editing without the required medical permission.
- Allow shelter modification without the required shelter permission.
- Hardcode approval/locking behavior that conflicts with backend rules.
- Invent unsupported backend statuses or APIs.

---

# 13. Empty-State Behavior

When the backend returns no adoption applications:

```text
No adoption applications available.
```

When there are no approved adoptions:

```text
No approved adoptions available.
```

When there is no adoption activity:

```text
No adoption activity available.
```

Empty states should reflect actual backend data.

---

# 14. Error Handling

If an operation is rejected by the backend, the Admin Portal should display the actual backend reason.

Example:

```json
{
  "detail": "Missing required permission: adoption:approve"
}
```

The UI should not report a successful approval when the backend rejected the request.

---

# 15. Backend as Source of Truth

The Adoption Coordinator frontend must use the existing backend APIs and existing Admin Portal architecture.

The frontend must not:

- Create mock applications
- Simulate approvals
- Fake adoption counts
- Create unsupported endpoints
- Invent permission codes
- Invent adoption statuses

The backend determines:

- Available records
- Valid statuses
- Allowed operations
- Authorization
- Final adoption state

---

# 16. Dashboard Conclusion

The **Adoption Coordinator** is responsible for managing the adoption workflow from application review through processing, approval, and finalization.

The role has focused access:

- Adoption management
- Adoption processing
- Adoption approval
- Adoption locking
- Shelter read access
- Medical read access
- Adoption dashboard access

The role should provide a clean operational workspace where the coordinator can review real adoption applications, make authorized decisions, and finalize adoption records without exposing unrelated administrative functionality.

The **backend RBAC system remains the final authority** for every adoption action.
