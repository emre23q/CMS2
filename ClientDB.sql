-- enable foreign‑key enforcement
PRAGMA foreign_keys = ON;

-- your “Client” table
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

-- your “History” table
CREATE TABLE IF NOT EXISTS History (
  noteID        INTEGER   PRIMARY KEY,
  clientID      INTEGER   NOT NULL
                         REFERENCES Client(clientID)
                         ON DELETE CASCADE,
  createdOn     DATE      NOT NULL
                     DEFAULT (CURRENT_DATE),
  createdOnEpoch INTEGER  NOT NULL,
  noteType      TEXT      NOT NULL,
  content       TEXT      NOT NULL

);


-- Index for efficient lookup of attachments by note
CREATE INDEX IF NOT EXISTS idx_history_clientID ON History(clientID);
CREATE INDEX IF NOT EXISTS idx_history_createdOnEpoch ON History(createdOnEpoch);
CREATE INDEX IF NOT EXISTS idx_history_createdOnDate ON History(createdOn);
