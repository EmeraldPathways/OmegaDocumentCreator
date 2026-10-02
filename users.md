# User Access Matrix

Last updated: 2026-10-02

## Global client access

All existing staff users except `andrew@omegafinancial.ie` are now managers. Managers can see and edit all client records, workflows, uploaded files, and generated documents:

- `aideen@omegafinancial.ie`
- `aimee@omegafinancial.ie`
- `alison@omegafinancial.ie`
- `declan@omegafinancial.ie`
- `info@omegafinancial.ie`
- `john@omegafinancial.ie`
- `sophie@omegafinancial.ie`
- `tadhg@omegafinancial.ie`

Manager access is global for client data but does not grant admin-only system functions.

## Andrew exception

`andrew@omegafinancial.ie` remains unchanged and is currently an administrator. Andrew has system-wide access, including admin/system functions.

## Confirmed implementation

The Docker deployment applied migration `0008_promote_staff_except_andrew.sql`, which promoted all existing `staff` users to `manager` except Andrew. The manager role provides global client, workflow, file, and document access.
