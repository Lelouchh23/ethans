-- =============================================
-- LOGIN ATTEMPTS TABLE
-- Tracks failed login attempts per username (unique)
-- Gets cleared on successful login
-- =============================================

-- Drop if exists (for clean install)
DROP TABLE IF EXISTS login_attempts;

CREATE TABLE login_attempts (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    attempt_count INTEGER DEFAULT 1,
    last_attempt_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment
COMMENT ON TABLE login_attempts IS 'Tracks failed login attempts per username for brute force protection';

-- =============================================
-- ACCOUNT LOCKOUT TABLE  
-- Stores locked users who need admin approval
-- =============================================

-- Drop if exists (for clean install)
DROP TABLE IF EXISTS account_lockout;

CREATE TABLE account_lockout (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    lockout_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment
COMMENT ON TABLE account_lockout IS 'Stores users locked out due to too many failed login attempts';

-- =============================================
-- DISABLE ROW LEVEL SECURITY (allow API access)
-- =============================================
ALTER TABLE login_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE account_lockout DISABLE ROW LEVEL SECURITY;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================
GRANT ALL ON login_attempts TO anon;
GRANT ALL ON login_attempts TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE login_attempts_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE login_attempts_id_seq TO authenticated;

GRANT ALL ON account_lockout TO anon;
GRANT ALL ON account_lockout TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE account_lockout_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE account_lockout_id_seq TO authenticated;
