-- enable foreign‑key enforcement
PRAGMA foreign_keys = ON;

-- Client table
CREATE TABLE IF NOT EXISTS Client (
  clientID      INTEGER   PRIMARY KEY AUTOINCREMENT,
  firstName     TEXT      NOT NULL,
  lastName      TEXT      NOT NULL,
  dob           DATE      ,
  gender        TEXT      ,
  email         TEXT      ,
  phone         TEXT      ,
  address       TEXT      ,
  insurance     TEXT      ,
  clientSince   DATE      NOT NULL DEFAULT (CURRENT_DATE)
);

-- History table
CREATE TABLE IF NOT EXISTS History (
  noteID        INTEGER   PRIMARY KEY AUTOINCREMENT,
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
