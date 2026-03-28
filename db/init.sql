-- Trigger functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Survey responses uses custom trigger (only sets updated_at on UPDATE, not on INSERT)
CREATE OR REPLACE FUNCTION update_survey_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'NO_ROLE'
    CHECK (role IN ('NO_ROLE', 'VIEWER', 'EDITOR', 'ADMIN')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auth requests table
CREATE TABLE auth_requests (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_role VARCHAR(50) NOT NULL
    CHECK (requested_role IN ('NO_ROLE', 'VIEWER', 'EDITOR', 'ADMIN')),
  request_message TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auth_requests_user_id ON auth_requests(user_id);
CREATE INDEX idx_auth_requests_status ON auth_requests(status);
CREATE TRIGGER auth_requests_updated_at BEFORE UPDATE ON auth_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Schedules table (rrule column removed)
CREATE TABLE schedules (
  id SERIAL PRIMARY KEY,
  url_id CHAR(8) UNIQUE NOT NULL,
  summary VARCHAR(255) NOT NULL,
  dtstart TIMESTAMP NOT NULL,
  dtend TIMESTAMP NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  location VARCHAR(255),
  description TEXT,
  attendees TEXT,
  song TEXT,
  recording TEXT,
  dtstamp TIMESTAMP NOT NULL,
  updated_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schedules_url_id ON schedules(url_id);
CREATE INDEX idx_schedules_dtstart ON schedules(dtstart);
CREATE TRIGGER schedules_updated_at BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Surveys table
-- response_options: JSON array of {option: string, isAttending: boolean}
CREATE TABLE surveys (
  id SERIAL PRIMARY KEY,
  url_id CHAR(8) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  belonging_list TEXT,
  response_options JSONB,
  enable_freetext BOOLEAN DEFAULT TRUE,
  deadline_at TIMESTAMP,
  created_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_surveys_url_id ON surveys(url_id);
CREATE TRIGGER surveys_updated_at BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Survey details table
CREATE TABLE survey_details (
  id SERIAL PRIMARY KEY,
  survey_id INT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  schedule_id INT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  mandatory BOOLEAN DEFAULT FALSE,
  UNIQUE(survey_id, schedule_id)
);

CREATE INDEX idx_survey_details_survey_id ON survey_details(survey_id);

-- Survey responses table
-- updated_at: 初回登録時はNULL、更新時のみ日時を設定
CREATE TABLE survey_responses (
  id SERIAL PRIMARY KEY,
  survey_detail_id INT NOT NULL REFERENCES survey_details(id) ON DELETE CASCADE,
  user_name VARCHAR(100) NOT NULL,
  belonging VARCHAR(50),
  response_option VARCHAR(50),
  free_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(survey_detail_id, user_name)
);

CREATE INDEX idx_survey_responses_survey_detail_id ON survey_responses(survey_detail_id);
CREATE INDEX idx_survey_responses_user_name ON survey_responses(user_name);
CREATE TRIGGER survey_responses_updated_at BEFORE UPDATE ON survey_responses
  FOR EACH ROW EXECUTE FUNCTION update_survey_responses_updated_at();

-- Session table (for Spring Session JDBC)
CREATE TABLE SPRING_SESSION (
  PRIMARY_ID CHAR(36) NOT NULL PRIMARY KEY,
  SESSION_ID CHAR(36) NOT NULL,
  CREATION_TIME BIGINT NOT NULL,
  LAST_ACCESS_TIME BIGINT NOT NULL,
  MAX_INACTIVE_INTERVAL INT NOT NULL,
  EXPIRY_TIME BIGINT NOT NULL,
  PRINCIPAL_NAME VARCHAR(100)
);

CREATE INDEX SPRING_SESSION_IX1 ON SPRING_SESSION (SESSION_ID);
CREATE INDEX SPRING_SESSION_IX2 ON SPRING_SESSION (EXPIRY_TIME);

CREATE TABLE SPRING_SESSION_ATTRIBUTES (
  SESSION_PRIMARY_ID CHAR(36) NOT NULL,
  ATTRIBUTE_NAME VARCHAR(200) NOT NULL,
  ATTRIBUTE_BYTES BYTEA NOT NULL,
  CONSTRAINT SPRING_SESSION_ATTRIBUTES_PK PRIMARY KEY (SESSION_PRIMARY_ID, ATTRIBUTE_NAME),
  CONSTRAINT SPRING_SESSION_ATTRIBUTES_FK FOREIGN KEY (SESSION_PRIMARY_ID) REFERENCES SPRING_SESSION(PRIMARY_ID) ON DELETE CASCADE
);
