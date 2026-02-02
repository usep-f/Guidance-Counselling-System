# Backend Integration Guide: Guidance System

This document provides a comprehensive overview of the front-end JavaScript files to assist the backend team in integrating Firebase services.

---

## 1. Core JavaScript Files & Functionalities

### `admin.js`
- **Purpose**: Powers the Admin Dashboard.
- **Key Features**:
  - **Analytics**: Calculates KPIs and renders charts for emotions and triggers.
  - **Filtering**: Real-time search and filter logic for student concerns.
  - **Management**: Student directory and appointment handling (Accept/Deny/Complete).
- **Hard-coded Data**:
  - `demo`: Array of student concerns.
  - `enrolledUsers`: Array of student profiles.
  - `appointments`: List of pending/completed appointments.
- **Integration Steps**: Replace mock arrays with Firestore `onSnapshot` listeners to the respective collections (`concerns`, `students`, `appointments`).

### `auth-backend.js`
- **Purpose**: Service layer for Firebase Auth and Firestore.
- **Key Features**:
  - Wrappers for login, registration, and logout.
  - Custom Claims check (`isAdminUser`) for role-based access.
  - Firestore profile persistence for students.
- **Integration Status**: Partially integrated. Requires setting up custom claims for admin users.

### `script.js`
- **Purpose**: Controls the Auth Modals on the landing page.
- **Key Features**:
  - Toggles between Login/Register views.
  - Enforces role matching (e.g., prevents a student from logging in via the Admin portal).
- **Integration Steps**: Ensure the role-matching logic correctly triggers the `logout` function if a mismatch occurs.

### `site-auth-ui.js`
- **Purpose**: Global UI synchronization for auth states.
- **Key Features**:
  - Navbar updates (Login button vs. User Profile).
  - Protected route redirection via `data-requires-auth="true"`.
- **Integration Steps**: Ensure any new sensitive links have the `data-requires-auth` attribute.

### `student-dashboard.js`
- **Purpose**: Powers the Student Dashboard and Booking System.
- **Key Features**:
  - **Booking Stepper**: 4-step appointment request flow.
  - **Availability Calendar**: Month-view calendar with selectable time slots.
  - **Profile Sync**: Loads and saves student data to Firestore.
- **Hard-coded Data**:
  - `availability`: Static object containing dates and time slots.
  - `appointments`: Mock pending appointments for the student.
- **Integration Steps**: Connect the inquiry form to a `messages` collection and the booking calendar to a dynamic `availability` collection.

---

## 2. Suggested Firestore Data Model

### `students` (Collection)
- **ID**: `auth.uid`
- **Fields**: `name`, `studentNo`, `gradeLevel`, `program`, `contact`, `email`, `updatedAt`

### `appointments` (Collection)
- **ID**: Auto-generated
- **Fields**: `studentId`, `reason`, `mode`, `date`, `time`, `status` ("Pending", "Accepted", "Completed"), `notes`, `emotions[]`, `triggers[]`

### `availability` (Collection)
- **ID**: `YYYY-MM-DD`
- **Fields**: `slots` (Array of time strings)

### `inquiries` (Collection)
- **ID**: Auto-generated
- **Fields**: `studentId`, `message`, `timestamp`, `status`

---

## 3. Specialized Guide: Dynamic Booking Integration

To move the `student-dashboard.js` calendar from hard-coded to dynamic:

1. **Firestore Query**: In `renderCalendar`, fetch documents from the `availability` collection where the ID matches the dates in the current month view.
2. **State Management**: Replace the `availability` object with a state variable populated by the Firestore query.
3. **Booking Action**: On `submit`, add a record to the `appointments` collection. If slots are limited, implement a transaction to remove the selected time from the `availability` document.
