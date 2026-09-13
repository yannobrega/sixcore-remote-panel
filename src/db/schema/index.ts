import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "operator", "viewer"]);
export const remoteSessionKind = pgEnum("remote_session_kind", ["ssh", "webfig"]);
export const remoteSessionStatus = pgEnum("remote_session_status", ["pending", "active", "ended", "failed", "expired"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("viewer"),
  active: boolean("active").notNull().default(true),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  ...timestamps
}, (t) => [uniqueIndex("users_email_uidx").on(t.email)]);

export const authSessions = pgTable("auth_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [uniqueIndex("auth_sessions_token_hash_uidx").on(t.tokenHash), index("auth_sessions_user_idx").on(t.userId), index("auth_sessions_expires_idx").on(t.expiresAt)]);

export const loginAttempts = pgTable("login_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  ipAddress: text("ip_address").notNull(),
  successful: boolean("successful").notNull().default(false),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("login_attempts_email_ip_time_idx").on(t.email, t.ipAddress, t.attemptedAt)]);

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  legalName: text("legal_name").notNull(),
  tradeName: text("trade_name").notNull(),
  taxId: text("tax_id"),
  contractActive: boolean("contract_active").notNull().default(true),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  ...timestamps
}, (t) => [uniqueIndex("companies_tax_id_uidx").on(t.taxId), index("companies_trade_name_idx").on(t.tradeName)]);

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  identifier: text("identifier").notNull(),
  sstpIp: text("sstp_ip").notNull(),
  sstpUser: text("sstp_user").notNull(),
  sshPort: integer("ssh_port").notNull().default(22333),
  webfigPort: integer("webfig_port").notNull().default(1080),
  sshUser: text("ssh_user").notNull().default("c3.remote"),
  credentialCiphertext: text("credential_ciphertext"),
  credentialNonce: text("credential_nonce"),
  credentialTag: text("credential_tag"),
  pendingCredentialCiphertext: text("pending_credential_ciphertext"),
  pendingCredentialNonce: text("pending_credential_nonce"),
  pendingCredentialTag: text("pending_credential_tag"),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  ...timestamps
}, (t) => [uniqueIndex("devices_identifier_uidx").on(t.identifier), uniqueIndex("devices_sstp_ip_uidx").on(t.sstpIp), index("devices_company_idx").on(t.companyId)]);

export const remoteSessions = pgTable("remote_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "restrict" }),
  deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "restrict" }),
  kind: remoteSessionKind("kind").notNull(),
  status: remoteSessionStatus("status").notNull().default("pending"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
  endReason: text("end_reason")
}, (t) => [index("remote_sessions_device_idx").on(t.deviceId), index("remote_sessions_user_idx").on(t.userId), index("remote_sessions_status_idx").on(t.status)]);

export const diagnosticRuns = pgTable("diagnostic_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "restrict" }),
  operation: text("operation").notNull(),
  parameters: jsonb("parameters").notNull().default({}),
  status: text("status").notNull(),
  durationMs: integer("duration_ms"),
  resultSummary: jsonb("result_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("diagnostic_runs_device_time_idx").on(t.deviceId, t.createdAt)]);

export const deviceStatusChecks = pgTable("device_status_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
  networkReachable: boolean("network_reachable"),
  sshReachable: boolean("ssh_reachable"),
  webfigReachable: boolean("webfig_reachable"),
  latencyMs: integer("latency_ms"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("device_status_checks_device_time_idx").on(t.deviceId, t.checkedAt)]);

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  deviceId: uuid("device_id").references(() => devices.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  outcome: text("outcome").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("audit_events_action_time_idx").on(t.action, t.createdAt), index("audit_events_actor_time_idx").on(t.actorUserId, t.createdAt), index("audit_events_company_time_idx").on(t.companyId, t.createdAt), index("audit_events_device_time_idx").on(t.deviceId, t.createdAt)]);
