# PAWGUARD Admin Portal — Veterinarian Role Documentation

**Document:** `VETERINARIAN.md`  
**Portal:** PAWGUARD Admin Portal  
**Role:** Veterinarian  
**Purpose:** Complete role, access, workflow, module, and dashboard reference

---

## 1. About the Veterinarian Role

The **Veterinarian** is responsible for the medical and veterinary care workflow for animals managed by PAWGUARD.

The role is focused on:

- Reviewing medical cases.
- Creating medical records.
- Updating medical information.
- Recording treatment and clinical decisions.
- Managing medical clearance.
- Reviewing shelter-related medical requests.
- Maintaining animal medical history.
- Supporting adoption and shelter workflows through medical information.
- Managing veterinarian-related appointments where supported.
- Uploading medical documents/records where supported.
- Monitoring veterinary work through the medical dashboard.

The Veterinarian is a **medical operations role**, not a system administration role.

---

# 2. Veterinarian Access

According to the current RBAC mapping, the Veterinarian has access to:

| Permission / Module | Access |
|---|---|
| `medical:create` | Create medical records/cases |
| `medical:read` | View medical information |
| `medical:update` | Update medical information |
| `medical:clearance` | Process medical clearance |
| `shelter:read` | View shelter information relevant to medical work |
| `adoption:read` | View adoption information relevant to medical decisions |
| `inventory:read` | View inventory information where required |
| `dashboard:medical` | Access Veterinarian/Medical Dashboard |
| `companion_pet:read` | View companion-pet information |
| `companion_pet:update` | Update permitted companion-pet information |
| `companion_pet:medical_upload` | Upload medical information/documents |
| `vet_clinic:read` | View veterinary clinic information |
| `appointment:read` | View appointments |
| `appointment:manage` | Manage permitted veterinary appointments |

The backend authorization system is the source of truth for all access.

---

# 3. Veterinarian Dashboard

The Veterinarian Dashboard is the medical command center for veterinary operations.

### Dashboard should provide

- Pending medical cases.
- Active medical cases.
- Cases requiring attention.
- Medical requests from shelters.
- Upcoming appointments.
- Animals requiring follow-up.
- Medical clearance work.
- Recent medical activity.
- Medical history access.
- Relevant clinic information.

### Dashboard navigation

The Veterinarian should be able to quickly access:

- Medical Cases.
- Animal Medical Records.
- Medical Requests.
- Appointments.
- Medical Clearance.
- Companion Pets.
- Veterinary Clinic.
- Relevant shelter information.
- Medical activity/history.

Dashboard counts and records must come from live backend data.

---

# 4. Medical Cases Module

The Medical Cases module is the primary working area for the Veterinarian.

## What the Veterinarian can do

Where supported by the backend:

- View medical cases.
- Search medical cases.
- Filter cases.
- Open a medical case.
- Review animal information.
- Review previous medical history.
- Create medical records.
- Update medical records.
- Record treatment information.
- Record clinical notes.
- Record follow-up information.
- Track case status.
- Complete/clear cases where permitted.

### Medical Case Information

A case may contain:

- Case ID.
- Animal/pet ID.
- Animal information.
- Request source.
- Medical complaint/reason.
- Clinical observations.
- Diagnosis.
- Treatment.
- Medication information.
- Medical notes.
- Follow-up requirements.
- Status.
- Created date.
- Updated date.
- Veterinarian information.

Only fields supported by the backend should be displayed or submitted.

---

# 5. Medical Request Workflow

Shelters may request veterinary assistance for animals requiring medical attention.

### Complete workflow

```text
Animal Requires Medical Attention
        ↓
Shelter Creates Medical Request
        ↓
Veterinarian Receives Request
        ↓
Veterinarian Reviews Animal & Request
        ↓
Medical Assessment
        ↓
Diagnosis / Treatment Plan
        ↓
Medical Record Updated
        ↓
Follow-up if Required
        ↓
Medical Case Completed / Cleared
```

### Veterinarian responsibilities

1. Review incoming medical requests.
2. Open the associated animal record.
3. Review existing medical history.
4. Assess the medical issue.
5. Record findings.
6. Provide treatment/recommendations.
7. Update the medical case.
8. Request follow-up when necessary.
9. Complete medical clearance when criteria are satisfied.

---

# 6. Animal Medical Records

The Veterinarian must be able to access the animal's medical history where authorized.

### Medical history may include

- Previous medical cases.
- Diagnoses.
- Treatments.
- Vaccinations.
- Medical notes.
- Medical documents.
- Follow-up records.
- Clearance information.
- Relevant veterinary appointments.

### Medical record principle

The medical record should be treated as the authoritative clinical history available through PAWGUARD.

Do not create duplicate animal identities or duplicate medical histories.

---

# 7. Medical Record Creation

The Veterinarian can create a medical record for an animal when supported by the backend workflow.

### Typical workflow

```text
Select Animal
    ↓
Review Existing Medical History
    ↓
Create Medical Case/Record
    ↓
Enter Clinical Information
    ↓
Save
    ↓
Record Appears in Medical History
```

The frontend must send only fields accepted by the backend API schema.

---

# 8. Medical Record Updates

The Veterinarian can update permitted medical information.

Possible information includes:

- Diagnosis.
- Treatment.
- Clinical notes.
- Follow-up requirements.
- Medical status.
- Clearance information.
- Medical documents.

Every update should:

1. Use the existing backend record ID.
2. Follow backend validation.
3. Preserve existing information that is not being changed.
4. Refresh the UI after a successful update.
5. Display backend validation errors clearly.

---

# 9. Medical Clearance

Medical clearance is an important Veterinarian responsibility.

## Purpose

Medical clearance confirms that an animal has satisfied the medical requirements for a relevant downstream workflow where the backend supports such a transition.

### Example workflow

```text
Animal Under Medical Care
        ↓
Treatment / Assessment
        ↓
Follow-up
        ↓
Veterinarian Determines Eligibility
        ↓
Medical Clearance
        ↓
Animal Can Continue Relevant Workflow
```

Clearance may be relevant to:

- Adoption.
- Foster placement.
- Shelter transfer.
- Other operational placement workflows.

The Veterinarian should only issue clearance through the backend-supported medical clearance operation.

---

# 10. Companion Pet Module

The current RBAC mapping gives the Veterinarian:

- `companion_pet:read`
- `companion_pet:update`
- `companion_pet:medical_upload`

### What this means

The Veterinarian can:

- View companion-pet information.
- Update permitted pet information.
- Upload medical information/documents where supported.

The Veterinarian should not receive unrestricted administrative access to companion-pet records beyond these permissions.

---

# 11. Medical Document Uploads

Where the backend supports `companion_pet:medical_upload`, the Veterinarian can attach medical documentation.

Possible documents include:

- Medical reports.
- Test results.
- Treatment records.
- Clinical documents.
- Other supported medical files.

### Upload workflow

```text
Open Animal / Pet Record
        ↓
Open Medical Information
        ↓
Select Medical Document
        ↓
Upload
        ↓
Backend Validates & Stores
        ↓
Document Appears in Medical History
```

The UI should not fabricate successful uploads. The backend response must confirm success.

---

# 12. Veterinary Appointments

The Veterinarian has:

- `appointment:read`
- `appointment:manage`

### Appointment responsibilities

Where supported:

- View veterinary appointments.
- Review appointment details.
- Manage permitted appointment operations.
- Coordinate veterinary schedules.
- Review appointment status.
- Associate appointments with the relevant medical workflow.

### Appointment workflow

```text
Appointment Requested
        ↓
Veterinarian Reviews Appointment
        ↓
Appointment Managed / Scheduled
        ↓
Veterinary Consultation
        ↓
Medical Record Updated
        ↓
Appointment Completed
```

Exact status transitions must follow backend APIs.

---

# 13. Veterinary Clinic Module

The Veterinarian has `vet_clinic:read`.

This allows the role to view relevant veterinary clinic information.

Possible information:

- Clinic details.
- Clinic identity.
- Location.
- Contact information.
- Available services.
- Relevant veterinary operational information.

The Veterinarian should not be given clinic administration permissions unless separately authorized.

---

# 14. Shelter Information

The Veterinarian has `shelter:read`.

This allows the Veterinarian to view shelter information needed for medical work.

Examples:

- Shelter identity.
- Shelter location.
- Animals associated with the shelter where authorized.
- Medical requests originating from the shelter.
- Relevant shelter operational context.

The Veterinarian does not have Shelter Manager permissions such as shelter operational management unless separately granted.

---

# 15. Adoption Support

The Veterinarian has `adoption:read`.

This is primarily for viewing adoption information that may be relevant to medical decisions.

Examples:

- Animal adoption status.
- Relevant adoption records.
- Medical eligibility context.
- Placement information.

The Veterinarian should not approve or administer adoption applications unless a separate permission grants that capability.

### Medical + Adoption relationship

```text
Animal
  ↓
Medical Assessment
  ↓
Medical Clearance
  ↓
Adoption Process Can Continue
```

---

# 16. Inventory Access

The Veterinarian has `inventory:read`.

This is read-only access for medical/operational awareness.

The Veterinarian may need to view:

- Relevant medical supplies.
- Inventory availability.
- Required resources.

The Veterinarian should not create, update, delete, or manage inventory unless separately authorized.

---

# 17. Medical Workflow — End to End

## Step 1 — Request

A shelter or authorized source identifies an animal requiring medical attention.

## Step 2 — Medical Request

A medical request is created through the existing backend workflow.

## Step 3 — Veterinarian Review

The Veterinarian opens the request and reviews:

- Animal information.
- Existing medical history.
- Request reason.
- Relevant notes.

## Step 4 — Assessment

The Veterinarian performs the medical assessment and records findings.

## Step 5 — Treatment

Treatment/recommendations are recorded in the medical workflow.

## Step 6 — Follow-up

If additional treatment or monitoring is needed, the Veterinarian records the required follow-up.

## Step 7 — Clearance

When medically appropriate and supported by the backend, the Veterinarian completes medical clearance.

## Step 8 — Downstream Workflow

The animal can continue through relevant adoption, foster, shelter, transfer, or other operational processes according to backend rules.

---

# 18. Role Boundaries

The Veterinarian is a **medical specialist role**.

### Veterinarian can

- Manage permitted medical cases.
- View medical history.
- Update medical records.
- Create medical records.
- Perform medical clearance.
- Upload permitted medical documents.
- Manage permitted veterinary appointments.
- Read relevant shelter information.
- Read relevant adoption information.
- Read relevant inventory information.
- View veterinary clinic information.

### Veterinarian cannot automatically

- Manage users.
- Manage roles.
- Change permissions.
- Manage system configuration.
- Manage shelter operations.
- Manage inventory.
- Approve adoption applications.
- Manage finance.
- Manage rescue operations.
- Manage organization-wide administration.

Any additional capability must come from an explicit backend permission.

---

# 19. RBAC Permission Summary

Current role mapping:

```text
veterinarian
├── medical:create
├── medical:read
├── medical:update
├── medical:clearance
├── shelter:read
├── adoption:read
├── inventory:read
├── dashboard:medical
├── companion_pet:read
├── companion_pet:update
├── companion_pet:medical_upload
├── vet_clinic:read
├── appointment:read
└── appointment:manage
```

This permission set defines the Veterinarian's operational boundary.

---

# 20. Data and Backend Rules

The Veterinarian frontend must:

1. Use existing PAWGUARD backend APIs.
2. Never introduce fake medical data.
3. Never create duplicate animal identities.
4. Never invent medical cases.
5. Use backend IDs.
6. Follow backend validation.
7. Respect medical permissions.
8. Display actual backend statuses.
9. Refresh data after successful medical updates.
10. Display backend errors clearly.
11. Avoid exposing unauthorized records.
12. Use the backend as the source of truth.

---

# 21. Module-to-Workflow Summary

| Module | Purpose |
|---|---|
| Medical Dashboard | Medical operational overview |
| Medical Cases | Create and manage medical cases |
| Medical Records | Maintain animal medical history |
| Medical Requests | Receive and process medical requests |
| Medical Clearance | Complete permitted medical clearance |
| Companion Pets | View/update permitted pet information |
| Medical Uploads | Upload permitted medical documents |
| Appointments | View/manage veterinary appointments |
| Vet Clinic | View clinic information |
| Shelter | Read relevant shelter information |
| Adoption | Read adoption information |
| Inventory | Read relevant inventory information |

---

# 22. Dashboard Conclusion

The **Veterinarian Dashboard** is the medical control center for PAWGUARD.

Its primary purpose is to ensure that animals receive appropriate veterinary assessment, treatment, follow-up, documentation, and medical clearance.

The overall medical workflow is:

```text
Medical Request
      ↓
Veterinarian Review
      ↓
Animal Medical History
      ↓
Assessment
      ↓
Diagnosis / Treatment
      ↓
Follow-up
      ↓
Medical Clearance
      ↓
Adoption / Foster / Shelter / Transfer Workflow
```

The Veterinarian should have enough access to perform medical responsibilities effectively while remaining separated from administrative, financial, shelter-management, rescue, and RBAC responsibilities.

---

# 23. Final Role Summary

**Veterinarian = Medical Operations Role**

The Veterinarian is responsible for:

- Medical case management.
- Animal medical records.
- Medical assessments.
- Treatment information.
- Medical follow-up.
- Medical clearance.
- Medical document uploads.
- Veterinary appointments.
- Relevant shelter coordination.
- Adoption medical support.
- Relevant inventory visibility.
- Veterinary clinic visibility.

The role is governed by the backend RBAC permissions:

`medical:create`, `medical:read`, `medical:update`, `medical:clearance`, `shelter:read`, `adoption:read`, `inventory:read`, `dashboard:medical`, `companion_pet:read`, `companion_pet:update`, `companion_pet:medical_upload`, `vet_clinic:read`, `appointment:read`, and `appointment:manage`.

---

**Document Status:** Role documentation reference  
**Authorization source of truth:** PAWGUARD backend  
**Data policy:** Existing backend APIs and real records only; no mock/fake operational data.
