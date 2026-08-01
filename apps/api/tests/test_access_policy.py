import unittest

from app.domain.users import UserRole
from app.main import _can_access_owner_email, _can_create_client, _resolve_record_access_policy


class AccessPolicyTests(unittest.TestCase):
    def test_admin_policy_remains_admin(self) -> None:
        user = {"email": "admin@omega.local", "role": UserRole.ADMIN.value}
        self.assertEqual(_resolve_record_access_policy(user), "admin")
        self.assertTrue(_can_create_client(user))
        self.assertTrue(_can_access_owner_email(user, "someone@omega.local"))

    def test_manager_policy_has_global_access(self) -> None:
        user = {"email": "manager@omega.local", "role": UserRole.MANAGER.value}
        self.assertEqual(_resolve_record_access_policy(user), "global")
        self.assertTrue(_can_create_client(user))
        self.assertTrue(_can_access_owner_email(user, "someone@omega.local"))

    def test_staff_policy_is_own_access_only(self) -> None:
        user = {"email": "staff@omega.local", "role": UserRole.STAFF.value}
        self.assertEqual(_resolve_record_access_policy(user), "own")
        self.assertTrue(_can_create_client(user))
        self.assertTrue(_can_access_owner_email(user, "staff@omega.local"))
        self.assertFalse(_can_access_owner_email(user, "other@omega.local"))
