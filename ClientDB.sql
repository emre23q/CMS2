-- enable foreign‑key enforcement
PRAGMA foreign_keys = ON;

-- Client table
CREATE TABLE IF NOT EXISTS Client (
  clientID      INTEGER   PRIMARY KEY,
  firstName     TEXT      NOT NULL,
  lastName      TEXT      NOT NULL,
  dob           DATE      NOT NULL,
  gender        TEXT      NOT NULL,
  email         TEXT      NOT NULL,
  phone         TEXT      NOT NULL,
  address       TEXT      NOT NULL,
  insurance     TEXT      NOT NULL,
  clientSince   DATE      NOT NULL DEFAULT (CURRENT_DATE)
);

-- History table
CREATE TABLE IF NOT EXISTS History (
  noteID        INTEGER   PRIMARY KEY,
  clientID      INTEGER   NOT NULL
                         REFERENCES Client(clientID)
                         ON DELETE CASCADE,
  createdOn     DATETIME  NOT NULL DEFAULT (datetime('now')),
  noteType      TEXT      NOT NULL,
  content       TEXT      NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_history_clientID ON History(clientID);
CREATE INDEX IF NOT EXISTS idx_history_createdOn ON History(createdOn);
