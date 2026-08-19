# PAWGUARD ADMIN PORTAL — FOSTER FAMILY ROLE

## 1. About the Role

The **Foster Family** role represents a registered foster caregiver/family who provides temporary care for companion animals through PAWGUARD.

The role is focused on viewing foster-related information and managing the foster family's participation in the foster-care workflow.

### Primary Responsibilities

- View foster-care information available to the foster family.
- View assigned or active foster placements.
- Review foster placement details.
- Follow the foster-care process after a placement is assigned.
- View relevant foster status and history.
- Coordinate with the PAWGUARD team through the available foster workflow.

### Role Access

According to the RBAC mapping, the Foster Family role has:

- `foster:read`
- `dashboard:foster`

The role is therefore primarily a **read/view role**. It does not independently create, approve, update, or delete foster records unless an additional permission is explicitly granted.

---

## 2. Foster Family Complete Workflow

### Step 1 — Foster Family Registration / Availability

The foster family becomes available to participate in the foster program through the existing PAWGUARD process.

The administrative/coordinator side manages the operational foster workflow.

### Step 2 — Foster Family Profile

The foster family can view the information associated with their foster participation, subject to the data exposed by the backend.

Typical information may include:

- Foster profile information
- Foster status
- Placement information
- Animal being fostered
- Placement dates
- Relevant foster-care information

### Step 3 — Placement Assignment

A foster placement is created/managed by the authorized PAWGUARD foster staff.

Once the foster family has an assigned placement, the foster family should be able to view the placement through the foster dashboard.

### Step 4 — Active Foster Placement

The foster family views active placement information, including the animal and relevant placement details.

The dashboard should clearly distinguish active/current placements from historical information where supported.

### Step 5 — Placement Completion

When the placement is completed or otherwise updated by an authorized coordinator/admin, the foster family should see the resulting status through the available foster information.

### Step 6 — Foster History

Completed or previous foster placements can be presented as history when supported by the backend.

---

# 3. Foster Dashboard

The Foster Family dashboard should provide a simple view of the foster family's current foster-care involvement.

## Dashboard Purpose

The dashboard should answer:

1. Do I currently have a foster placement?
2. What animal is assigned to me?
3. What is the placement status?
4. What placement information do I need to know?
5. What previous foster activity is available?

## Recommended Dashboard Sections

### Foster Overview

Show available foster summary information.

Examples:

- Active placements
- Current foster status
- Placement information

Only display values that are actually provided by backend APIs.

### Current Placement

Show the currently active foster placement where available.

Possible information:

- Companion/pet name
- Placement status
- Start date
- Expected/end date
- Relevant notes
- Other backend-supported placement details

### Foster History

Show previous foster placements when supported.

Possible information:

- Animal
- Placement status
- Start date
- End date
- Completion information

---

# 4. Foster Module Explanation

## 4.1 Foster Profile

The foster profile represents the foster family's participation in the PAWGUARD foster program.

### What the Foster Family Can Do

- View foster profile information.
- View current foster status.
- View information exposed by the backend.

### Access

`foster:read`

---

## 4.2 Foster Placements

Foster placements connect a foster family with an animal requiring temporary care.

### What the Foster Family Can Do

- View assigned foster placements.
- View active placement information.
- View placement status.
- View placement details supported by the backend.

### Access

`foster:read`

### Important Boundary

The Foster Family role does not have:

- `foster:create`
- `foster:update`
- `foster:approve`

Therefore the foster family should not be presented with administrative buttons for creating, editing, or approving placements.

---

## 4.3 Foster History

Where supported by the backend, the foster family can review previous foster placements and activity.

### What Can Be Viewed

- Previous placements
- Placement status
- Relevant dates
- Foster-care history

### Access

`foster:read`

---

# 5. Actions the Foster Family Should NOT See

Because the role only has `foster:read` and `dashboard:foster`, the interface should not expose administrative actions such as:

- Create foster placement
- Approve foster placement
- Edit another foster family's record
- Delete foster records
- Assign animals to foster families
- Manage foster coordinator records

Those actions belong to authorized administrative/coordinator roles with the corresponding permissions.

---

# 6. RBAC Permission Mapping

| Permission | Purpose |
|---|---|
| `foster:read` | View foster information and placements |
| `dashboard:foster` | Access the Foster dashboard |

### Permissions Not Included by Default

| Permission | Default Access |
|---|---|
| `foster:create` | No |
| `foster:update` | No |
| `foster:approve` | No |
| `foster:delete` | No |

The UI must follow the actual permissions returned by the backend rather than assuming access from the role name alone.

---

# 7. Role-to-Workflow Relationship

The Foster Family is the **care recipient/participant side** of the foster workflow.

A simplified workflow is:

```text
Foster Program
      ↓
Foster Family Available
      ↓
Authorized Staff Manage Placement
      ↓
Foster Placement Assigned
      ↓
Foster Family Views Placement
      ↓
Active Foster Care
      ↓
Placement Completed / Updated
      ↓
Foster History
```

The Foster Family should not be responsible for the administrative assignment process.

---

# 8. Admin Portal Considerations

When a Super Admin or authorized coordinator views a Foster Family user/profile, the profile actions should be role-aware.

Relevant information may include:

- Foster family identity
- Contact information
- Foster status
- Active placement
- Foster history
- Available foster information

Do not show unrelated actions such as:

- Finance management
- Inventory management
- Rescue management
- Medical management
- Adoption approval
- Volunteer management

unless the user has an explicitly assigned permission that authorizes them.

---

# 9. Data and Backend Rules

The Foster Family module must use the existing backend as the source of truth.

Do not:

- Create mock foster placements.
- Invent foster statuses.
- Invent placement records.
- Hard-code fake counts.
- Display actions that the backend does not authorize.
- Duplicate foster functionality in another module.

If the backend returns no foster placement data, the UI should display an appropriate empty state instead of fabricated information.

Example:

> No active foster placements found.

---

# 10. Access Control Rules

The frontend should use the existing RBAC system for access decisions.

Conceptually:

```text
User logs in
      ↓
Backend returns role/permissions
      ↓
RBAC resolves permissions
      ↓
dashboard:foster
      ↓
Foster Dashboard accessible
      ↓
foster:read
      ↓
Foster information/placements visible
```

A user must not receive write access merely because they can open the Foster dashboard.

---

# 11. Error and Empty States

The Foster Family dashboard should properly handle:

### No Placement

Display:

> No active foster placements found.

### Loading

Display a clear loading state while foster information is retrieved.

### Backend Error

Display a meaningful error message and allow retry where appropriate.

### Unauthorized

If the backend denies access, do not expose restricted foster information.

---

# 12. Security and Privacy

Foster information may contain personal and animal-care information.

The portal should:

- Show only authorized information.
- Respect backend permissions.
- Avoid exposing another foster family's private information.
- Avoid allowing client-side permission bypass.
- Treat backend authorization as the final authority.

---

# 13. Complete Foster Family User Journey

```text
LOGIN
  ↓
Foster Dashboard
  ↓
View Foster Status
  ↓
View Active Placement
  ↓
View Animal / Placement Details
  ↓
Participate in Foster Care
  ↓
Placement Updated / Completed
  ↓
View Updated Status / History
```

---

# 14. Dashboard Conclusion

The **Foster Family** role is a focused, read-oriented role within PAWGUARD.

Its primary purpose is to allow foster families to access their foster-care information and assigned placements without exposing administrative capabilities.

The two core RBAC permissions are:

```text
foster:read
dashboard:foster
```

Therefore, the Foster Family dashboard should remain simple and role-specific:

- Foster overview
- Current placement
- Placement details
- Foster history where supported
- Relevant status information

Administrative foster operations such as creating, approving, assigning, or modifying placements should remain with authorized PAWGUARD staff.

The final implementation should always follow the live backend API and RBAC permission model as the source of truth.
