# AGENT.md

## Purpose

This document defines the engineering standards, architecture, development workflow, and coding conventions for the PawGuard Admin Portal.

All contributors and AI coding assistants must follow these guidelines to ensure consistent, maintainable, scalable, and production-ready code.

---

## Project

**Name:** PawGuard Admin Portal

**Type:** Enterprise React Admin Portal

**Tech Stack:** React 19, Vite, TypeScript, Tailwind CSS

**Architecture:** Component-Based Modular Architecture

---

## Objectives

- Maintain a scalable and modular codebase.
- Promote reusable components and shared utilities.
- Ensure consistent coding standards.
- Deliver secure, performant, and accessible features.
- Generate production-ready code that aligns with the existing architecture.

---
# Project Overview

## Introduction

PawGuard Admin Portal is an enterprise web application designed to streamline and manage the complete lifecycle of dog rescue operations. It provides authorized users with a centralized platform to manage rescue requests, dog records, medical treatments, shelter operations, adoptions, foster care, volunteers, inventory, donations, reports, and system administration.

The application is intended for internal organizational use and is accessible only to authenticated users with appropriate role-based permissions.

---

## Vision

To build a scalable, secure, and user-friendly management platform that simplifies animal welfare operations, improves collaboration among teams, and enables efficient decision-making through centralized data management.

---

## Key Features

- Secure Authentication
- Role-Based Access Control (RBAC)
- Interactive Dashboard
- Rescue Management
- Dog Management
- Medical Records
- Shelter Management
- Adoption Management
- Foster Care Management
- Volunteer Management
- Inventory Management
- Donation & Finance Management
- Reports & Analytics
- User & Role Management
- System Settings

---

## Project Goals

- Build a scalable and maintainable application.
- Improve operational efficiency through digital workflows.
- Ensure data accuracy and consistency.
- Provide secure access based on user roles.
- Deliver a responsive and accessible user experience.
- Support future feature expansion with a modular architecture.

---

## Target Users

The application is designed for:

- Super Administrator
- Organization Administrator
- Rescue Coordinator
- Rescue Agent
- Veterinarian
- Shelter Manager
- Adoption Coordinator
- Foster Coordinator
- Volunteer Coordinator
- Inventory Manager
- Finance Officer
- Operations Manager

Each role has access only to the modules and actions permitted by the system's Role-Based Access Control (RBAC) policy.

---
# Technology Stack

## Frontend

| Technology | Purpose |
|------------|---------|
| React 19 | Component-based UI development |
| TypeScript | Static type checking |
| Vite | Fast development server and build tool |
| React Router | Client-side routing |
| Axios | HTTP client for API communication |
| React Hook Form | Form state management |
| Zod | Form validation |
| Tailwind CSS | Utility-first styling |
| Lucide React | Icon library |

---

## Development Tools

| Tool | Purpose |
|------|---------|
| Node.js | JavaScript runtime |
| npm | Package management |
| Git | Version control |
| GitHub | Source code repository |
| VS Code | Development environment |
| ESLint | Code quality and linting |
| Prettier | Code formatting |

---

## Project Structure

The application follows a modular architecture where each feature is organized into its own directory. Shared components, hooks, utilities, services, and types are centralized to maximize code reuse and maintainability.

Key architectural principles include:

- Feature-based organization
- Reusable UI components
- Separation of concerns
- Type-safe development
- API-driven architecture
- Responsive design
- Scalable folder structure

---

## Browser Support

The application should support the latest stable versions of:

- Google Chrome
- Microsoft Edge
- Mozilla Firefox
- Safari

---

## Coding Principles

Development should follow these principles:

- Write clean and readable code.
- Prefer reusable components over duplication.
- Maintain strict TypeScript typing.
- Keep components focused on a single responsibility.
- Separate UI, business logic, and API communication.
- Follow consistent naming conventions.
- Optimize for maintainability and scalability.
- Write production-ready code at all times.

---
# Project Architecture

## Architecture Overview

PawGuard Admin Portal follows a feature-based modular architecture built with React and TypeScript. Each module is organized independently while sharing common components, services, hooks, utilities, and types.

The architecture is designed to support scalability, maintainability, and code reusability.

---

## Architectural Principles

- Modular feature organization
- Component-based UI development
- Separation of concerns
- Reusable shared resources
- Type-safe development
- API-driven data flow
- Responsive and accessible interfaces
- Scalable project structure

---

## High-Level Architecture

```
User
   │
   ▼
React Application
   │
   ├── Pages
   │
   ├── Components
   │
   ├── Hooks
   │
   ├── Services
   │
   ├── Utilities
   │
   └── API Layer
            │
            ▼
      Backend REST API
            │
            ▼
         Database
```

---

## Application Layers

### Presentation Layer

Responsible for rendering the user interface.

Includes:

- Pages
- Layouts
- Components
- Forms
- Tables
- Modals

---

### Business Logic Layer

Responsible for application behavior.

Includes:

- Custom Hooks
- Validation
- State Management
- Helper Functions

---

### Data Layer

Responsible for communication with backend services.

Includes:

- API Services
- HTTP Client
- Request Helpers
- Response Mapping

---

## Design Principles

Every feature should:

- Have a single responsibility.
- Be easy to understand and maintain.
- Reuse existing components whenever possible.
- Avoid unnecessary dependencies.
- Keep business logic separate from UI.
- Minimize code duplication.
- Follow consistent project conventions.

---

## Module Independence

Each business module should remain independent and self-contained.

A module may include:

- Pages
- Components
- Hooks
- Services
- Types
- Validation
- Constants

Modules should communicate through shared services or APIs rather than directly depending on each other.

---

## Shared Resources

Common functionality should be centralized to encourage reuse.

Shared resources include:

- UI Components
- Layouts
- Hooks
- Utilities
- API Client
- Constants
- Types
- Assets

Avoid duplicating shared functionality inside individual modules.

---
# Folder Structure & Directory Guidelines

## Project Structure

```text
src/
├── assets/
├── components/
├── constants/
├── features/
├── hooks/
├── layouts/
├── pages/
├── routes/
├── services/
├── store/
├── styles/
├── types/
├── utils/
├── App.tsx
├── main.tsx
└── vite-env.d.ts
```

---

## Directory Responsibilities

### assets/

Stores static resources used throughout the application.

Examples:

- Images
- Icons
- Fonts
- SVGs
- Illustrations

---

### components/

Contains reusable UI components shared across multiple features.

Examples:

- Buttons
- Cards
- Inputs
- Tables
- Modals
- Forms
- Loaders
- Badges

Components should remain generic and reusable.

---

### constants/

Stores application-wide constants.

Examples:

- API endpoints
- Route names
- Role definitions
- Status values
- Application configuration

Avoid hardcoding repeated values throughout the project.

---

### features/

Contains business-specific modules.

Example:

```text
features/
├── authentication/
├── dashboard/
├── rescue/
├── dogs/
├── medical/
├── shelter/
├── adoption/
├── foster/
├── volunteers/
├── inventory/
├── donations/
├── reports/
├── users/
└── settings/
```

Each feature should manage its own components, pages, hooks, services, types, and validation logic whenever possible.

---

### hooks/

Contains reusable custom React hooks.

Examples:

- useAuth
- usePagination
- useDebounce
- useApi
- useLocalStorage

Hooks should encapsulate reusable logic and avoid rendering UI.

---

### layouts/

Contains application layouts.

Examples:

- DashboardLayout
- AuthLayout

Layouts define page structure but should not contain business logic.

---

### pages/

Contains top-level route components.

Each page should:

- Compose reusable components
- Handle page-level logic
- Avoid excessive business logic

---

### routes/

Defines application routing.

Responsibilities include:

- Route configuration
- Protected routes
- Role-based access
- Navigation structure

---

### services/

Handles communication with backend APIs.

Responsibilities:

- API requests
- Response mapping
- Error handling
- Data fetching

UI components should never make direct HTTP requests.

---

### store/

Contains global state management if required.

Examples:

- Authentication state
- User profile
- Theme settings
- Shared application state

Keep global state minimal.

---

### styles/

Stores global styling resources.

Examples:

- Global styles
- Theme variables
- Utility classes

Prefer Tailwind CSS utilities over custom CSS where appropriate.

---

### types/

Contains shared TypeScript definitions.

Examples:

- Interfaces
- Enums
- API response types
- Shared models

Avoid duplicate type definitions.

---

### utils/

Contains reusable utility functions.

Examples:

- Date formatting
- Validation helpers
- String utilities
- Number formatting
- Common helper functions

Utility functions should remain pure and independent of React.

---

## Folder Guidelines

- Organize code by feature whenever possible.
- Keep related files together.
- Prefer reusable components over duplication.
- Use shared folders only for functionality reused across multiple features.
- Maintain consistent naming conventions.
- Avoid deeply nested folder structures.
- Remove unused files and components regularly.

---
# Coding Standards & Naming Conventions

## General Principles

All code should be:

- Clean and readable
- Modular and reusable
- Type-safe
- Consistent with the existing project structure
- Easy to maintain and extend
- Production-ready

Avoid unnecessary complexity and duplicate logic.

---

# TypeScript Standards

- Enable strict TypeScript mode.
- Avoid using `any`; prefer explicit types or `unknown` when necessary.
- Define shared interfaces and types in the `types/` directory.
- Use enums only when they improve readability.
- Keep type definitions reusable and centralized.

---

# React Standards

- Use functional components exclusively.
- Prefer hooks over class components.
- Keep components focused on a single responsibility.
- Extract reusable logic into custom hooks.
- Avoid deeply nested component hierarchies.
- Keep components small and composable.

---

# Component Guidelines

Components should:

- Accept only the required props.
- Be reusable across multiple modules.
- Remain independent of business-specific logic whenever possible.
- Handle only presentation logic.

Business logic should reside in hooks or services.

---

# Naming Conventions

## Components

Use PascalCase.

```text
UserCard.tsx
DogProfile.tsx
RescueTable.tsx
```

---

## Pages

Use PascalCase.

```text
Dashboard.tsx
DogDetails.tsx
VolunteerList.tsx
```

---

## Hooks

Prefix custom hooks with `use`.

```text
useAuth.ts
usePagination.ts
useApi.ts
```

---

## Services

Use descriptive camelCase names ending with `Service`.

```text
dogService.ts
adoptionService.ts
inventoryService.ts
```

---

## Utility Files

Use camelCase.

```text
dateFormatter.ts
stringHelpers.ts
validation.ts
```

---

## Types

Use PascalCase.

```text
Dog.ts
User.ts
MedicalRecord.ts
```

---

## Constants

Use UPPER_SNAKE_CASE.

```ts
MAX_FILE_SIZE
DEFAULT_PAGE_SIZE
API_TIMEOUT
```

---

# File Organization

Each file should have a single responsibility.

Recommended order:

1. Imports
2. Types
3. Constants
4. Component or Function
5. Helper Functions
6. Export

---

# Import Order

Organize imports in the following order:

1. External libraries
2. Internal modules
3. Components
4. Hooks
5. Services
6. Utilities
7. Types
8. Styles

Separate each group with a blank line.

---

# Styling Guidelines

- Use Tailwind CSS for styling.
- Prefer utility classes over custom CSS.
- Keep styling consistent across the application.
- Avoid inline styles unless absolutely necessary.
- Reuse existing design patterns.

---

# Code Quality

Before submitting code, ensure:

- No unused imports.
- No unused variables.
- No duplicate logic.
- No commented-out code.
- No console statements in production.
- Consistent formatting using Prettier.
- No ESLint warnings or errors.

---

# Documentation

Write self-explanatory code.

Use comments only when:

- Explaining complex business logic.
- Clarifying non-obvious implementations.
- Documenting public utility functions.

Avoid obvious or redundant comments.

---

# Best Practices

- Prefer composition over duplication.
- Keep functions small and focused.
- Reuse shared components and utilities.
- Validate inputs before processing.
- Handle errors gracefully.
- Keep business logic separate from UI.
- Follow existing project conventions before introducing new patterns.

---
# Development Workflow & AI Development Rules

## Development Workflow

Follow this workflow for every new feature, enhancement, or bug fix.

1. Understand the requirement.
2. Identify the affected module(s).
3. Reuse existing components whenever possible.
4. Implement the feature following project standards.
5. Validate user inputs.
6. Handle loading, success, and error states.
7. Test functionality before completion.
8. Ensure code passes linting and formatting checks.

---

# AI Development Rules

AI assistants should always:

- Follow the existing project architecture.
- Reuse shared components, hooks, and utilities.
- Generate production-ready code.
- Keep implementations simple and maintainable.
- Preserve existing functionality unless instructed otherwise.
- Minimize code duplication.
- Maintain TypeScript type safety.
- Follow established naming conventions.
- Respect role-based access requirements.

---

# Before Writing Code

Always verify:

- Does a similar component already exist?
- Can an existing hook or utility be reused?
- Is the functionality already implemented elsewhere?
- Is this change consistent with the current architecture?

Avoid creating duplicate components or utilities.

---

# Creating New Features

When implementing a new feature:

- Keep related files within the appropriate feature directory.
- Reuse shared UI components.
- Place business logic in hooks or services.
- Centralize API communication within services.
- Define reusable types and interfaces.
- Validate all user inputs.
- Handle API failures gracefully.

---

# Modifying Existing Features

When updating existing functionality:

- Make the smallest necessary change.
- Preserve backward compatibility.
- Avoid unnecessary refactoring.
- Update related types if required.
- Verify that dependent features continue to function correctly.

---

# Code Generation Guidelines

Generated code should be:

- Modular
- Readable
- Reusable
- Type-safe
- Responsive
- Accessible
- Easy to test
- Easy to maintain

Avoid overly complex implementations.

---

# API Integration

All API communication should:

- Be implemented through service files.
- Use centralized HTTP utilities.
- Handle request failures gracefully.
- Return typed responses.
- Avoid direct API calls inside UI components.

---

# Error Handling

Every feature should:

- Validate inputs before submission.
- Display meaningful error messages.
- Prevent application crashes.
- Recover gracefully from API failures.

Never expose internal errors to end users.

---

# Performance Guidelines

Prefer:

- Lazy loading for large pages.
- Memoization only when beneficial.
- Efficient rendering.
- Reusable components.
- Optimized API requests.

Avoid premature optimization.

---

# Pull Request Checklist

Before considering a task complete, verify:

- Feature works as expected.
- No TypeScript errors.
- No ESLint warnings.
- Code is formatted.
- No unused imports or variables.
- Existing functionality is unaffected.
- New code follows project standards.

---

# AI Restrictions

AI assistants should NOT:

- Introduce new libraries without approval.
- Change the project architecture.
- Rename files unnecessarily.
- Duplicate existing functionality.
- Bypass validation or permission checks.
- Commit secrets, credentials, or sensitive information.
- Generate placeholder implementations unless explicitly requested.

---
# Folder-Level Development Standards

## Feature Module Structure

Each business module should follow a consistent structure to ensure scalability and maintainability.

Example:

```text
features/
└── dogs/
    ├── components/
    ├── hooks/
    ├── pages/
    ├── services/
    ├── types/
    ├── validation/
    ├── constants/
    ├── utils/
    └── index.ts
```

Only create folders that are required by the feature. Avoid empty or unnecessary directories.

---

# Components

Components should:

- Be reusable and modular.
- Focus on presentation only.
- Accept typed props.
- Avoid direct API calls.
- Avoid embedding business logic.

Examples:

```text
DogCard.tsx
DogTable.tsx
MedicalTimeline.tsx
AdoptionForm.tsx
```

---

# Pages

Pages represent route-level components.

Responsibilities:

- Compose reusable components.
- Manage page-level state.
- Trigger API requests through services or hooks.
- Coordinate user interactions.

Avoid placing reusable UI directly inside pages.

---

# Hooks

Custom hooks should encapsulate reusable logic.

Examples:

```text
useDogs.ts
useRescues.ts
usePagination.ts
useMedicalRecords.ts
```

Hooks may handle:

- Data fetching
- State management
- Filtering
- Pagination
- Form logic

Do not render UI inside hooks.

---

# Services

Service files are responsible for backend communication.

Responsibilities:

- API requests
- Response handling
- Error propagation
- Data transformation (if required)

Components must never communicate with APIs directly.

Example:

```ts
dogService.ts
rescueService.ts
volunteerService.ts
```

---

# Types

Store all reusable TypeScript definitions inside the feature.

Examples:

```text
Dog.ts
Rescue.ts
Volunteer.ts
MedicalRecord.ts
```

Avoid duplicate interfaces across modules.

Shared types should be placed in the global `types/` directory.

---

# Validation

Validation logic should remain separate from UI components.

Examples:

- Form schemas
- Input validation
- Business rule validation

Use centralized validation libraries where applicable.

---

# Constants

Store feature-specific constants.

Examples:

- Status values
- Labels
- Default filters
- Configuration values

Avoid hardcoded strings throughout the application.

---

# Utilities

Utility functions should be:

- Pure
- Reusable
- Independent of React

Examples:

- Date formatting
- Data transformation
- Helper functions
- Calculations

---

# Barrel Exports

Use `index.ts` files to simplify imports.

Example:

```ts
export * from "./components";
export * from "./hooks";
export * from "./services";
```

Avoid unnecessary deep import paths.

---

# Module Independence

Each feature should be self-contained.

A feature may depend on:

- Shared Components
- Shared Hooks
- Shared Utilities
- Shared Types
- Shared Services

Features should not directly depend on each other.

---

# General Guidelines

Every module should:

- Follow the project folder structure.
- Reuse shared resources whenever possible.
- Keep responsibilities clearly separated.
- Avoid duplicate code.
- Keep files focused on a single purpose.
- Maintain consistent naming conventions.
- Be easy to understand, test, and extend.

---
# Authentication & Authorization Standards

## Overview

PawGuard Admin Portal is accessible only to authenticated users. Every protected resource must verify user identity and permissions before allowing access.

Authentication and authorization should be implemented consistently across the application.

---

# Authentication

The application should provide:

- Secure Login
- Logout
- Session Management
- Password Reset (if applicable)
- Token Validation
- Automatic Session Expiration

Unauthenticated users must be redirected to the login page.

---

# Authorization

Access to features is controlled using Role-Based Access Control (RBAC).

Each authenticated user is assigned one or more roles that determine:

- Accessible modules
- Available pages
- Allowed actions
- API permissions

The UI should only display actions that the current user is authorized to perform.

---

# Protected Routes

All authenticated pages must be protected.

Protected routes should:

- Verify user authentication.
- Validate user permissions.
- Redirect unauthorized users appropriately.
- Prevent direct URL access to restricted pages.

---

# User Session

A user session should:

- Start after successful authentication.
- Persist during active usage.
- Expire after logout or token expiration.
- Be restored when valid authentication data exists.

Invalid or expired sessions should require the user to sign in again.

---

# Token Management

Authentication tokens should:

- Be securely stored.
- Be included in authenticated API requests.
- Be validated before accessing protected resources.
- Be removed immediately during logout.

Sensitive authentication information must never be exposed in the user interface.

---

# Permission Checks

Permission checks should be enforced at:

- Route level
- Page level
- Component level
- Action level
- API level

Both frontend and backend should validate permissions independently.

---

# Login Flow

Typical authentication flow:

1. User submits credentials.
2. Credentials are validated.
3. Authentication token is issued.
4. User information is loaded.
5. User permissions are initialized.
6. User is redirected to the appropriate dashboard.

---

# Logout Flow

Logout should:

- Clear authentication data.
- Remove stored tokens.
- Reset application state.
- Redirect to the login page.

---

# Security Guidelines

Authentication should:

- Never expose sensitive user information.
- Never log passwords or tokens.
- Prevent unauthorized access.
- Handle invalid sessions gracefully.
- Protect restricted routes from direct access.

---

# Development Guidelines

When implementing authentication:

- Reuse existing authentication services.
- Avoid duplicating authentication logic.
- Centralize permission checks.
- Keep authentication independent from business modules.
- Follow the project's security standards.

---
# API Integration Standards

## Overview

All communication between the frontend and backend must be performed through centralized service files. UI components should never make direct HTTP requests.

The application follows a service-based architecture to ensure consistency, maintainability, and scalability.

---

# API Architecture

```
UI Components
      │
      ▼
Custom Hooks (Optional)
      │
      ▼
Service Layer
      │
      ▼
HTTP Client
      │
      ▼
REST API
```

---

# Service Layer

Each feature should have its own service file.

Example:

```text
services/
├── authService.ts
├── rescueService.ts
├── dogService.ts
├── medicalService.ts
├── shelterService.ts
├── adoptionService.ts
├── volunteerService.ts
├── inventoryService.ts
└── userService.ts
```

Responsibilities:

- Send API requests
- Process responses
- Handle request errors
- Return typed data

---

# HTTP Client

Use a single shared HTTP client for all API communication.

The HTTP client should be responsible for:

- Base URL configuration
- Authentication headers
- Request interceptors
- Response interceptors
- Global error handling
- Timeout configuration

Do not create multiple HTTP client instances unless required.

---

# Request Guidelines

All requests should:

- Use typed request models.
- Validate required data before sending.
- Include authentication when required.
- Avoid duplicate API calls.
- Handle request cancellation where appropriate.

---

# Response Handling

All responses should:

- Use TypeScript interfaces.
- Validate response data before use.
- Handle empty responses safely.
- Return consistent data structures.

Avoid passing raw API responses directly to UI components.

---

# Error Handling

Every API request should handle:

- Network failures
- Unauthorized access
- Forbidden requests
- Validation errors
- Server errors
- Unexpected responses

Display user-friendly messages without exposing internal system details.

---

# Loading States

Every asynchronous request should provide:

- Loading indicator
- Success state
- Error state

Never leave users without feedback during long-running operations.

---

# Pagination

For list-based endpoints:

- Use server-side pagination whenever available.
- Support page number and page size.
- Preserve filters during navigation.
- Handle empty result sets gracefully.

---

# Filtering & Search

Search and filter parameters should:

- Be sent as query parameters.
- Support pagination.
- Preserve user selections.
- Reset pagination when filters change.

---

# Sorting

Sorting should:

- Support ascending and descending order.
- Be applied through API parameters when available.
- Remain consistent across all modules.

---

# File Uploads

For file uploads:

- Validate file type.
- Validate file size.
- Show upload progress when applicable.
- Handle upload failures gracefully.

Do not upload unsupported file formats.

---

# API Security

Never:

- Hardcode API URLs.
- Store secrets in source code.
- Expose authentication tokens.
- Log sensitive request or response data.

Use environment variables for configuration.

---

# Development Guidelines

When integrating APIs:

- Reuse existing service functions whenever possible.
- Keep business logic out of UI components.
- Return strongly typed data.
- Maintain consistent error handling.
- Follow existing endpoint naming conventions.

---
# UI/UX Standards

## Overview

The PawGuard Admin Portal should provide a clean, modern, responsive, and accessible user experience. All interfaces should maintain visual consistency across modules and follow the established design system.

---

# Design Principles

The interface should be:

- Simple
- Consistent
- Responsive
- Accessible
- User-friendly
- Performance-focused

Users should be able to complete tasks with minimal clicks and clear visual feedback.

---

# Layout

The application layout should include:

- Header
- Sidebar Navigation
- Main Content Area
- Breadcrumbs (where applicable)
- Footer (optional)

Navigation should remain consistent throughout the application.

---

# Responsive Design

The application should support:

- Desktop
- Laptop
- Tablet
- Mobile

Use responsive layouts and flexible components to ensure usability across different screen sizes.

---

# Forms

Forms should:

- Clearly label all fields.
- Indicate required fields.
- Validate user input before submission.
- Display inline validation messages.
- Prevent duplicate submissions.
- Provide success or error feedback.

Use reusable form components wherever possible.

---

# Tables

Tables should support:

- Pagination
- Sorting
- Search
- Filtering
- Row selection (when applicable)
- Responsive layout

Keep table actions consistent across all modules.

---

# Buttons

Button styles should clearly indicate their purpose.

Primary Actions

- Save
- Create
- Submit
- Continue

Secondary Actions

- Cancel
- Back
- Close

Danger Actions

- Delete
- Remove
- Archive

Use consistent button styling throughout the application.

---

# Modals

Use modals for:

- Confirmation dialogs
- Create/Edit forms
- Quick details
- Warnings

Avoid placing large workflows inside modals.

---

# Notifications

Provide feedback for important actions.

Notification types:

- Success
- Error
- Warning
- Information

Messages should be concise, meaningful, and user-friendly.

---

# Loading States

Every asynchronous operation should display an appropriate loading indicator.

Examples:

- Skeleton loaders
- Loading spinners
- Disabled action buttons
- Progress indicators

Never leave users without visual feedback while data is loading.

---

# Empty States

When no data is available:

- Display a meaningful message.
- Explain why no data is shown.
- Provide a primary action if applicable.

Example:

"No records found."

---

# Error States

Handle errors gracefully.

Provide:

- Clear error messages
- Retry option (where applicable)
- Guidance for resolving common issues

Do not expose internal system errors or technical details to users.

---

# Icons

Use a single icon library consistently throughout the application.

Icons should:

- Improve usability
- Represent actions clearly
- Remain visually consistent

Avoid decorative icons that do not add value.

---

# Accessibility

The application should:

- Support keyboard navigation.
- Use semantic HTML.
- Maintain sufficient color contrast.
- Provide accessible labels for form controls.
- Ensure interactive elements are focusable.

Accessibility should be considered during development rather than added later.

---

# UI Consistency

Maintain consistency in:

- Colors
- Typography
- Spacing
- Button styles
- Form layouts
- Table designs
- Icons
- Navigation patterns

Avoid introducing new UI patterns when existing components satisfy the requirement.

---

# Development Guidelines

When creating UI:

- Reuse existing components whenever possible.
- Keep layouts clean and uncluttered.
- Prioritize readability and usability.
- Ensure responsiveness across supported devices.
- Follow the project's design system consistently.

---
# Business Module Standards

## Overview

Every business module in the application should follow a consistent structure, development approach, and user experience. This ensures maintainability, scalability, and a predictable architecture across the project.

---

# Available Modules

The application includes the following business modules:

- Dashboard
- Rescue Management
- Dog Management
- Medical Management
- Shelter Management
- Adoption Management
- Foster Care Management
- Volunteer Management
- Inventory Management
- Donation & Finance
- Reports & Analytics
- User & Role Management
- Settings

Each module should follow the standards defined in this document.

---

# Standard Module Structure

Each module should contain only the folders required for its functionality.

Example:

```text
feature/
├── components/
├── pages/
├── hooks/
├── services/
├── types/
├── validation/
├── utils/
└── index.ts
```

---

# Module Responsibilities

Each business module should:

- Manage a single business domain.
- Remain independent from other modules.
- Reuse shared components and utilities.
- Follow the project's folder structure.
- Use centralized API services.
- Maintain consistent UI behavior.

---

# Common Capabilities

Modules may include:

- Dashboard
- List View
- Detail View
- Create
- Edit
- Delete
- Search
- Filter
- Sorting
- Pagination
- Import / Export
- Status Management

Only implement the capabilities required for that module.

---

# Data Management

Each module should:

- Retrieve data through service files.
- Validate user input before submission.
- Handle API responses safely.
- Display loading indicators during requests.
- Show meaningful empty and error states.

Refer to the **API Integration Standards** and **UI/UX Standards** sections for implementation guidelines.

---

# Permissions

Access to modules and actions must follow the project's Role-Based Access Control (RBAC) implementation.

Permission validation should be enforced at both the frontend and backend.

Do not implement custom permission logic inside individual modules.

---

# Validation

Validation rules should:

- Prevent invalid data submission.
- Provide clear error messages.
- Be implemented using centralized validation logic.
- Remain independent of UI components.

---

# Audit & Activity Tracking

Modules should support audit logging where required by business requirements.

Typical events include:

- Create
- Update
- Delete
- Status Change

Audit implementation should follow the project's backend standards.

---

# Reusability

Before creating a new component, hook, utility, or service:

- Check whether an existing implementation can be reused.
- Extend existing functionality when appropriate.
- Avoid duplicating business logic.

---

# Development Checklist

Before completing work on any module, verify:

- Folder structure follows project standards.
- TypeScript types are defined.
- API integration uses service files.
- Validation is implemented.
- UI follows design standards.
- Permissions are respected.
- No duplicate code has been introduced.
- Code passes linting and formatting checks.

---
# Security Standards

## Overview

Security is a fundamental requirement for the PawGuard Admin Portal. All features must be designed and implemented with security best practices to protect users, application data, and system resources.

---

# Authentication Security

Authentication should:

- Require valid user credentials.
- Restrict access to authenticated users only.
- Validate user sessions before granting access.
- Redirect unauthenticated users to the login page.
- Terminate invalid or expired sessions securely.

---

# Authorization

All protected resources must enforce Role-Based Access Control (RBAC).

Permissions should be verified for:

- Routes
- Pages
- Components
- User Actions
- API Requests

The frontend should hide unauthorized actions, while the backend must enforce permission validation.

---

# Data Protection

Sensitive information should never be:

- Hardcoded in the source code.
- Logged in the browser console.
- Exposed through error messages.
- Stored in public files.

Only display information required for the current user's role.

---

# Input Validation

Validate all user input before processing.

Validation should include:

- Required fields
- Data types
- Length restrictions
- File size limits
- Allowed file formats

Never trust client-side validation alone.

---

# API Security

All API communication should:

- Use authenticated requests where required.
- Validate responses before use.
- Handle authorization failures gracefully.
- Avoid exposing internal server details.

---

# Environment Variables

Store configuration values using environment variables.

Examples include:

- API Base URL
- Authentication Keys
- Third-party Service Keys
- Environment-specific Configuration

Do not commit sensitive values to version control.

---

# File Upload Security

When handling file uploads:

- Validate supported file types.
- Enforce maximum file size limits.
- Reject invalid or corrupted files.
- Display clear validation messages.

---

# Error Handling

Display user-friendly error messages.

Do not expose:

- Stack traces
- Database errors
- Server implementation details
- Internal API responses

Log technical details only where appropriate for debugging.

---

# Secure Development Practices

Developers should:

- Reuse existing authentication and authorization mechanisms.
- Follow secure coding practices.
- Avoid introducing unnecessary dependencies.
- Remove unused code and libraries.
- Review security implications before implementing new features.

---

# Security Checklist

Before completing any feature, verify:

- Authentication is enforced.
- Authorization is validated.
- Inputs are validated.
- Sensitive data is protected.
- Environment variables are used correctly.
- Error messages do not expose internal information.
- No secrets are committed to the repository.

---
# Testing Standards

## Overview

Every feature should be tested before it is considered complete. Testing helps ensure reliability, maintainability, and a consistent user experience.

Testing should be performed throughout development, not only before deployment.

---

# Testing Types

The project should include:

- Unit Testing
- Integration Testing
- Functional Testing
- Manual Testing
- Regression Testing

Select the appropriate testing approach based on the complexity of the feature.

---

# Unit Testing

Unit tests should verify:

- Utility functions
- Custom hooks
- Validation logic
- Helper functions
- Business logic

Each unit test should focus on a single behavior.

---

# Integration Testing

Integration tests should verify:

- API integration
- Form submission
- Navigation
- Authentication flow
- Role-based access
- Data loading

Ensure multiple components work together as expected.

---

# Manual Testing

Before completing a feature, verify:

- UI renders correctly.
- Forms behave as expected.
- Validation messages appear correctly.
- Loading indicators display properly.
- Empty states are handled.
- Error messages are user-friendly.
- Responsive layout works across supported devices.

---

# API Testing

Verify that:

- Requests are sent correctly.
- Responses are handled properly.
- Errors are managed gracefully.
- Authentication is enforced.
- Permissions are respected.

---

# Browser Testing

Verify compatibility with supported browsers:

- Google Chrome
- Microsoft Edge
- Mozilla Firefox
- Safari

---

# Responsive Testing

Verify layouts on:

- Desktop
- Laptop
- Tablet
- Mobile

Ensure components adapt correctly to different screen sizes.

---

# Accessibility Testing

Confirm that:

- Keyboard navigation works.
- Form fields have labels.
- Interactive elements are accessible.
- Color contrast is sufficient.
- Focus indicators are visible.

---

# Bug Verification

Before marking a bug as resolved:

- Confirm the issue is fixed.
- Verify related functionality.
- Ensure no new issues were introduced.
- Test affected user flows.

---

# Pre-Release Checklist

Before merging or deploying code, verify:

- Feature works as expected.
- No TypeScript errors.
- No ESLint warnings.
- Code is formatted.
- No unused imports or variables.
- API integration is working.
- Validation is complete.
- Responsive design is verified.
- Existing functionality remains unaffected.

---

# Quality Standards

Every completed feature should be:

- Functional
- Stable
- Secure
- Responsive
- Accessible
- Maintainable
- Production-ready

Do not merge incomplete, untested, or experimental code into the main development branch.

---
# Git Workflow & Version Control

## Overview

Git is used for version control and collaboration. All changes should be tracked through meaningful commits and organized using a consistent branching strategy.

---

# Branch Strategy

Recommended branches:

- `main` – Production-ready code
- `develop` – Active development
- `feature/<feature-name>` – New features
- `bugfix/<issue-name>` – Bug fixes
- `hotfix/<issue-name>` – Critical production fixes
- `release/<version>` – Release preparation

Examples:

```text
feature/rescue-management
feature/dog-profile
bugfix/login-validation
hotfix/api-timeout
```

---

# Commit Message Convention

Write clear and meaningful commit messages.

Format:

```text
<type>: <short description>
```

Common commit types:

```text
feat: Add volunteer management page
fix: Resolve login validation issue
refactor: Simplify dashboard layout
style: Improve button spacing
docs: Update AGENT documentation
test: Add API integration tests
chore: Update project dependencies
```

Avoid generic messages such as:

```text
update
changes
fixed
work done
final
```

---

# Pull Requests

Before creating a Pull Request:

- Ensure the feature is complete.
- Resolve merge conflicts.
- Verify linting passes.
- Verify TypeScript compilation succeeds.
- Remove debugging code.
- Update documentation if necessary.

Provide a clear summary of the changes included.

---

# Code Review

During code review, verify:

- Code follows project standards.
- Logic is correct.
- Naming conventions are followed.
- Existing functionality is unaffected.
- Components are reusable.
- No duplicate logic has been introduced.
- Security considerations have been addressed.

---

# Merging

Before merging:

- Pull the latest changes.
- Resolve conflicts carefully.
- Test affected functionality.
- Ensure CI checks (if available) pass.

Merge only stable and tested code into shared branches.

---

# Version Control Best Practices

- Commit small, focused changes.
- Commit frequently during development.
- Keep branches up to date.
- Delete merged feature branches.
- Avoid committing generated files unless required.
- Do not commit sensitive information.

---

# Files That Should Not Be Committed

Do not commit:

- Environment files containing secrets
- API keys or credentials
- Temporary files
- Build artifacts
- IDE-specific configuration (unless shared by the team)
- Log files

Use `.gitignore` to exclude unnecessary files.

---

# Development Checklist

Before pushing code:

- Code builds successfully.
- No TypeScript errors.
- No ESLint warnings.
- Code is formatted.
- Tests pass (if applicable).
- Documentation is updated if required.
- Commit message follows project conventions.

---

# Collaboration Guidelines

When working in a team:

- Keep changes focused on a single task.
- Communicate breaking changes early.
- Respect existing code conventions.
- Review code before requesting a merge.
- Resolve conflicts carefully without overwriting teammates' work.

---
# Deployment Guidelines

## Overview

The PawGuard Admin Portal should be deployed using a consistent, secure, and repeatable deployment process. Every deployment must be tested and verified before being released to end users.

---

# Deployment Environments

The project may use the following environments:

- Development
- Testing
- Staging
- Production

Each environment should maintain its own configuration and environment variables.

---

# Environment Configuration

Application configuration should be managed using environment variables.

Examples include:

- API Base URL
- Authentication Configuration
- Application Environment
- Third-Party Service Configuration

Do not hardcode environment-specific values in the source code.

---

# Build Process

Before deployment, verify:

- Dependencies are installed.
- Environment variables are configured.
- TypeScript compilation succeeds.
- Linting passes without errors.
- The production build completes successfully.

---

# Deployment Checklist

Before deploying:

- Application builds successfully.
- No TypeScript errors.
- No ESLint warnings.
- Environment variables are configured.
- API endpoints are verified.
- Authentication is working.
- Role-based permissions are validated.
- Critical workflows are tested.

---

# Post-Deployment Verification

After deployment, verify:

- Application loads successfully.
- Login functionality works.
- Dashboard displays correctly.
- API connectivity is functioning.
- Navigation works as expected.
- Forms submit successfully.
- No console errors are present.
- Responsive layout is maintained.

---

# Rollback Strategy

If a deployment introduces critical issues:

- Roll back to the last stable version.
- Verify application stability.
- Investigate the root cause.
- Apply fixes before redeployment.

---

# Monitoring

After deployment, monitor:

- Application availability
- API response status
- Authentication failures
- Client-side errors
- Performance metrics

Address critical issues as soon as possible.

---

# Deployment Best Practices

- Deploy only tested code.
- Keep deployment steps consistent.
- Protect production configuration.
- Maintain version history.
- Document significant deployment changes.
- Verify application health after every release.

---
# AI Operational Rules

## Overview

This document serves as the primary instruction set for AI coding assistants contributing to the PawGuard Admin Portal. Every generated solution must align with the project's architecture, coding standards, and development practices.

---

# Primary Responsibilities

AI assistants should:

- Generate production-ready code.
- Follow the existing project architecture.
- Reuse existing components and utilities.
- Maintain code consistency.
- Preserve backward compatibility.
- Produce clean, readable, and maintainable implementations.

---

# Before Generating Code

Always verify:

- Does similar functionality already exist?
- Can an existing component be reused?
- Can an existing hook or service be extended?
- Does the change follow the current project structure?

Avoid creating duplicate implementations.

---

# Code Generation Rules

Generated code must:

- Follow TypeScript best practices.
- Use functional React components.
- Keep components modular.
- Maintain strict type safety.
- Separate UI, business logic, and API communication.
- Follow the project's naming conventions.
- Be fully responsive.
- Be accessible where applicable.

---

# Reusability

Always prefer:

- Shared components
- Shared hooks
- Shared utilities
- Shared types
- Shared services

Create new resources only when no suitable implementation exists.

---

# File Creation

Create new files only when they improve maintainability.

Avoid:

- Unnecessary wrappers
- Duplicate utilities
- Duplicate components
- Redundant folders

---

# API Integration

All backend communication must:

- Use the centralized service layer.
- Return typed responses.
- Handle loading and error states.
- Avoid direct API calls inside components.

---

# Error Handling

Every generated feature should:

- Validate inputs.
- Handle API failures gracefully.
- Display user-friendly messages.
- Prevent unexpected application crashes.

Never expose sensitive implementation details.

---

# Performance

Prefer:

- Efficient rendering
- Lazy loading where appropriate
- Reusable components
- Optimized API requests

Avoid unnecessary re-renders and excessive computations.

---

# Code Quality

Generated code should:

- Compile without errors.
- Pass ESLint validation.
- Follow Prettier formatting.
- Remove unused imports.
- Remove unused variables.
- Avoid commented-out code.

---

# Security

Never:

- Hardcode secrets.
- Expose authentication tokens.
- Bypass authorization checks.
- Disable validation.
- Introduce insecure coding practices.

Always follow the project's security standards.

---

# Refactoring

When refactoring:

- Preserve existing functionality.
- Avoid unnecessary architectural changes.
- Improve readability without changing behavior.
- Minimize breaking changes.

---

# Documentation

When introducing new functionality:

- Use meaningful names.
- Keep code self-explanatory.
- Add comments only for complex business logic.
- Update documentation when required.

---

# Restrictions

AI assistants must NOT:

- Introduce new libraries without approval.
- Rename files unnecessarily.
- Change folder structures without justification.
- Duplicate business logic.
- Remove existing functionality unless instructed.
- Generate placeholder or incomplete implementations.

---

# Completion Checklist

Before considering any task complete, ensure:

- Requirements are satisfied.
- Code follows project standards.
- No duplicate logic exists.
- TypeScript types are defined.
- API integration is complete.
- Validation is implemented.
- Errors are handled gracefully.
- Code is formatted.
- No linting issues remain.
- Existing functionality is preserved.

---
# Appendix

## Naming Convention Reference

| Item | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `DogCard.tsx` |
| Pages | PascalCase | `Dashboard.tsx` |
| Hooks | camelCase with `use` prefix | `useAuth.ts` |
| Services | camelCase | `dogService.ts` |
| Utilities | camelCase | `dateFormatter.ts` |
| Types | PascalCase | `Dog.ts` |
| Interfaces | PascalCase | `DogProfile` |
| Enums | PascalCase | `UserRole` |
| Constants | UPPER_SNAKE_CASE | `API_TIMEOUT` |
| Variables | camelCase | `dogList` |
| Functions | camelCase | `fetchDogs()` |

---

# Folder Reference

```text
src/
├── assets/
├── components/
├── constants/
├── features/
├── hooks/
├── layouts/
├── pages/
├── routes/
├── services/
├── store/
├── styles/
├── types/
└── utils/
```

---

# Recommended File Organization

```text
Feature/
├── components/
├── hooks/
├── pages/
├── services/
├── types/
├── validation/
├── utils/
└── index.ts
```

---

# Code Quality Checklist

Before submitting code, verify:

- Project builds successfully.
- No TypeScript errors.
- No ESLint warnings.
- Code is formatted with Prettier.
- No unused imports or variables.
- Shared components are reused where applicable.
- API calls use the service layer.
- Validation is implemented.
- Error handling is complete.
- Responsive behavior is verified.

---

# Quick Development Principles

Always:

- Keep code simple.
- Prefer reusable solutions.
- Follow the existing architecture.
- Write modular components.
- Maintain type safety.
- Keep business logic separate from UI.
- Use centralized services.
- Follow project naming conventions.

Never:

- Duplicate existing functionality.
- Hardcode configuration values.
- Bypass authentication or authorization.
- Commit secrets or credentials.
- Introduce unnecessary dependencies.
- Modify unrelated code.

---

# Document Maintenance

Update this document whenever there are significant changes to:

- Project architecture
- Folder structure
- Technology stack
- Development workflow
- Coding standards
- Security practices
- Deployment process

Review the document periodically to ensure it remains accurate and aligned with the current project implementation.

---
