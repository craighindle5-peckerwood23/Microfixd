# Firestore Security Specification

This specification details the Attribute-Based Access Control (ABAC) and Zero-Trust validation criteria designed to protect our multi-system operational cockpit in Firestore.

## 1. Data Invariants
1. **Strict Ownership Isolation**: No user can read, list, create, update, or delete records belonging to another user.
2. **Path Integrity Match**: For subcollections like `/users/{userId}/favorites/{id}` and `/users/{userId}/audit_logs/{id}`, the `{userId}` in the path must exactly match the authenticated user's UID (`request.auth.uid`).
3. **Audit Log Immutability**: Audit logs are read-and-create only. Updates and deletions are strictly forbidden (`allow update, delete: if false;`).
4. **Strict Temporal Integrity**: `createdAt` timestamps must be validated against `request.time` (no client-side spoofing).
5. **Length and Pattern Guardrails**: All string payloads must respect their corresponding `.size()` constraints to prevent Denial-of-Wallet payload flooding.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following rogue payloads represent attempts to compromise system integrity and must be rejected by Firestore rules:

1. **Spoofed User Registration**: Attempting to create a user profile under `/users/attacker_uid` using a different authenticated UID (`request.auth.uid = victim_uid`).
2. **Cross-User Favorite Insertion**: Attempting to inject a favorite item into `/users/victim_uid/favorites/fav_123`.
3. **Email Spoofing in Registry**: Attempting to write a user profile with an invalid email format.
4. **Rogue Field Injection (Shadow Update)**: Attempting to update a favorite with a shadow/ghost field `isAdmin: true` or `isVerified: true`.
5. **VRAM Poisoning (Length Exploit)**: Attempting to create an Audit Log with an action containing a massive 1MB string.
6. **Timeline Hijacking (Future Timestamp)**: Attempting to specify `createdAt` in the future instead of using `request.time`.
7. **Rogue Favorite Deletion**: Authenticated user trying to delete a favorite belonging to another user.
8. **Audit Log Mutation (Immutability Violation)**: Attempting to update or rewrite an existing audit log entry.
9. **Audit Log Deletion**: Attempting to delete a telemetry audit log entry.
10. **ID Poisoning Attack**: Attempting to create a favorite with a document ID containing special exploit characters like `../../hack`.
11. **Blanket Query Scraping**: Attempting to perform a list query on all favorites without restricting the query to the authenticated user's ID.
12. **Type Coercion Exploit**: Attempting to save a favorite where `externalId` is a boolean or number instead of a string.

---

## 3. Test Cases Draft (`firestore.rules.test.ts`)

A conceptual test runner layout utilizing `@firebase/rules-unit-testing` is outlined below to reject these payloads:

```typescript
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

// Test runner verifying that all "Dirty Dozen" payloads return PERMISSION_DENIED.
// Ensures mathematically secure isolation.
```
