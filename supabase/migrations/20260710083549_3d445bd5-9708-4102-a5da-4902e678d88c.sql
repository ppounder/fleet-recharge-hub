
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.vehicle_belongs_to_customer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.vehicle_customer_is_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_fleet_id() TO authenticated;
