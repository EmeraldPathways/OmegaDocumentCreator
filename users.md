# User Access Matrix

Last updated: 2026-07-30

This file records the user-access rules provided so far.

## Full access

These users can see and edit all clients, files, and documents:

- `info@omegafinancial.ie`
- `john@omegafinancial.ie`
- `aideen@omegafinancial.ie`

## System-wide access

This user can access everything:

- `andrew@omegafinancial.ie`

This includes every area of the app, including admin/system functions.

## Own records only

These users can see and edit their own files:

- `sophie@omegafinancial.ie`
- `declan@omegafinancial.ie`
- `tadhg@omegafinancial.ie`

This includes:

- uploaded files created by or assigned to them
- generated documents created by or assigned to them
- client records created by or assigned to them
- workflow records created by or assigned to them

## All client files

This user can see and edit all client files:

- `aimee@omegafinancial.ie`

This includes:

- all uploaded client files
- all generated documents
- all client records
- all workflow records

## John-only delegated access

This user can see and edit all `john@omegafinancial.ie` files:

- `alison@omegafinancial.ie`

This includes all records associated with `john@omegafinancial.ie`, including:

- uploaded files
- generated documents
- client records
- workflow records

## Confirmed implementation notes

These rules are now confirmed:

1. `andrew@omegafinancial.ie` has access to every area of the app.
2. `sophie@omegafinancial.ie`, `declan@omegafinancial.ie`, and `tadhg@omegafinancial.ie` can access their own uploaded files, generated documents, clients, and workflow records.
3. `aimee@omegafinancial.ie` can access all uploaded files, generated documents, clients, and workflow records.
4. `alison@omegafinancial.ie` can access all uploaded files, generated documents, clients, and workflow records associated with `john@omegafinancial.ie`.
