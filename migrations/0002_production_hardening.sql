CREATE INDEX IF NOT EXISTS users_active_role_idx ON users(active, role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS companies_active_idx ON companies(active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS devices_active_idx ON devices(active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS device_status_checks_checked_at_idx ON device_status_checks(checked_at DESC);
DELETE FROM auth_sessions WHERE expires_at < now() - interval '7 days';
DELETE FROM login_attempts WHERE attempted_at < now() - interval '30 days';
