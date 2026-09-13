DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin','operator','viewer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE remote_session_kind AS ENUM ('ssh','webfig'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE remote_session_status AS ENUM ('pending','active','ended','failed','expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL, name text NOT NULL, password_hash text NOT NULL,
 role user_role NOT NULL DEFAULT 'viewer', active boolean NOT NULL DEFAULT true, deleted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_uidx ON users (lower(email));

CREATE TABLE IF NOT EXISTS auth_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token_hash text NOT NULL, ip_address text, user_agent text, expires_at timestamptz NOT NULL, revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS auth_sessions_token_hash_uidx ON auth_sessions(token_hash);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_idx ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL, ip_address text NOT NULL,
 successful boolean NOT NULL DEFAULT false, attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_email_ip_time_idx ON login_attempts(email, ip_address, attempted_at DESC);

CREATE TABLE IF NOT EXISTS companies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legal_name text NOT NULL, trade_name text NOT NULL, tax_id text,
 contract_active boolean NOT NULL DEFAULT true, active boolean NOT NULL DEFAULT true, notes text, deleted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS companies_tax_id_uidx ON companies(tax_id) WHERE tax_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS companies_trade_name_idx ON companies(trade_name);

CREATE TABLE IF NOT EXISTS devices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
 name text NOT NULL, identifier text NOT NULL, sstp_ip text NOT NULL, sstp_user text NOT NULL,
 ssh_port integer NOT NULL DEFAULT 22333 CHECK (ssh_port BETWEEN 1 AND 65535), webfig_port integer NOT NULL DEFAULT 1080 CHECK (webfig_port BETWEEN 1 AND 65535),
 ssh_user text NOT NULL DEFAULT 'c3.remote', credential_ciphertext text, credential_nonce text, credential_tag text,
 pending_credential_ciphertext text, pending_credential_nonce text, pending_credential_tag text,
 active boolean NOT NULL DEFAULT true, notes text, deleted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS devices_identifier_uidx ON devices(identifier);
CREATE UNIQUE INDEX IF NOT EXISTS devices_sstp_ip_uidx ON devices(sstp_ip);
CREATE INDEX IF NOT EXISTS devices_company_idx ON devices(company_id);

CREATE TABLE IF NOT EXISTS remote_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT, device_id uuid NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
 kind remote_session_kind NOT NULL, status remote_session_status NOT NULL DEFAULT 'pending', started_at timestamptz NOT NULL DEFAULT now(),
 ended_at timestamptz, duration_seconds integer, end_reason text
);
CREATE INDEX IF NOT EXISTS remote_sessions_device_idx ON remote_sessions(device_id);
CREATE INDEX IF NOT EXISTS remote_sessions_user_idx ON remote_sessions(user_id);
CREATE INDEX IF NOT EXISTS remote_sessions_status_idx ON remote_sessions(status);

CREATE TABLE IF NOT EXISTS diagnostic_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 device_id uuid NOT NULL REFERENCES devices(id) ON DELETE RESTRICT, operation text NOT NULL, parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL, duration_ms integer, result_summary jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS diagnostic_runs_device_time_idx ON diagnostic_runs(device_id, created_at DESC);

CREATE TABLE IF NOT EXISTS device_status_checks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
 network_reachable boolean, ssh_reachable boolean, webfig_reachable boolean, latency_ms integer,
 checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS device_status_checks_device_time_idx ON device_status_checks(device_id, checked_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 company_id uuid REFERENCES companies(id) ON DELETE SET NULL, device_id uuid REFERENCES devices(id) ON DELETE SET NULL,
 action text NOT NULL, outcome text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, ip_address text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_action_time_idx ON audit_events(action, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_actor_time_idx ON audit_events(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_company_time_idx ON audit_events(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_device_time_idx ON audit_events(device_id, created_at DESC);
