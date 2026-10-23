-- Museum Artifact Lifecycle and Exhibition Tracking System
-- Schema, sample data, and views for DBMS project

CREATE DATABASE IF NOT EXISTS museum_lifecycle;
USE museum_lifecycle;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS EXHIBITION_ARTIFACT;
DROP TABLE IF EXISTS CONSERVATION_RECORD;
DROP TABLE IF EXISTS INSURANCE_POLICY;
DROP TABLE IF EXISTS LOAN;
DROP TABLE IF EXISTS EXHIBITION;
DROP TABLE IF EXISTS ARTIFACT;
DROP TABLE IF EXISTS CATEGORY;
DROP TABLE IF EXISTS LOCATION;
DROP TABLE IF EXISTS INSTITUTION;
DROP TABLE IF EXISTS STAFF;
DROP TABLE IF EXISTS APP_USER;
DROP VIEW IF EXISTS vw_artifact_details;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

CREATE TABLE CATEGORY (
  category_id   INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE LOCATION (
  location_id   INT AUTO_INCREMENT PRIMARY KEY,
  location_name VARCHAR(100) NOT NULL UNIQUE,
  location_type VARCHAR(50)  NOT NULL DEFAULT 'Storage'
);

CREATE TABLE STAFF (
  staff_id INT AUTO_INCREMENT PRIMARY KEY,
  name     VARCHAR(100) NOT NULL,
  role     VARCHAR(50)  NOT NULL,
  email    VARCHAR(120) UNIQUE
);

CREATE TABLE INSTITUTION (
  institution_id INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(150) NOT NULL,
  country        VARCHAR(80),
  contact_email  VARCHAR(120)
);

CREATE TABLE ARTIFACT (
  artifact_id    INT AUTO_INCREMENT PRIMARY KEY,
  title          VARCHAR(200) NOT NULL,
  period         VARCHAR(100),
  material       VARCHAR(100),
  current_status ENUM('In Storage','On Display','On Loan','Under Conservation','Retired')
                 NOT NULL DEFAULT 'In Storage',
  category_id    INT NOT NULL,
  location_id    INT NOT NULL,
  acquisition_date DATE,
  CONSTRAINT fk_artifact_category FOREIGN KEY (category_id) REFERENCES CATEGORY(category_id),
  CONSTRAINT fk_artifact_location FOREIGN KEY (location_id) REFERENCES LOCATION(location_id)
);

CREATE TABLE EXHIBITION (
  exhibition_id INT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  curator_id    INT NOT NULL,
  gallery_id    INT,
  CONSTRAINT fk_exhibition_curator FOREIGN KEY (curator_id) REFERENCES STAFF(staff_id),
  CONSTRAINT fk_exhibition_gallery FOREIGN KEY (gallery_id) REFERENCES LOCATION(location_id),
  CONSTRAINT chk_exhibition_dates CHECK (end_date >= start_date)
);

CREATE TABLE EXHIBITION_ARTIFACT (
  exhibition_id   INT NOT NULL,
  artifact_id     INT NOT NULL,
  display_position INT NOT NULL DEFAULT 1,
  PRIMARY KEY (exhibition_id, artifact_id),
  CONSTRAINT fk_ea_exhibition FOREIGN KEY (exhibition_id) REFERENCES EXHIBITION(exhibition_id) ON DELETE CASCADE,
  CONSTRAINT fk_ea_artifact   FOREIGN KEY (artifact_id)   REFERENCES ARTIFACT(artifact_id)
);

CREATE TABLE LOAN (
  loan_id        INT AUTO_INCREMENT PRIMARY KEY,
  artifact_id    INT NOT NULL,
  institution_id INT NOT NULL,
  loan_type      ENUM('Outgoing','Incoming') NOT NULL,
  start_date     DATE NOT NULL,
  due_date       DATE NOT NULL,
  return_date    DATE NULL,
  status         ENUM('Active','Returned','Overdue','Cancelled') NOT NULL DEFAULT 'Active',
  CONSTRAINT fk_loan_artifact    FOREIGN KEY (artifact_id)    REFERENCES ARTIFACT(artifact_id),
  CONSTRAINT fk_loan_institution FOREIGN KEY (institution_id) REFERENCES INSTITUTION(institution_id)
);

CREATE TABLE CONSERVATION_RECORD (
  record_id        INT AUTO_INCREMENT PRIMARY KEY,
  artifact_id      INT NOT NULL,
  staff_id         INT NOT NULL,
  condition_before VARCHAR(200) NOT NULL,
  treatment_done   VARCHAR(300) NOT NULL,
  condition_after  VARCHAR(200),
  start_date       DATE NOT NULL,
  end_date         DATE,
  cost             DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  CONSTRAINT fk_cons_artifact FOREIGN KEY (artifact_id) REFERENCES ARTIFACT(artifact_id),
  CONSTRAINT fk_cons_staff    FOREIGN KEY (staff_id)    REFERENCES STAFF(staff_id)
);

CREATE TABLE INSURANCE_POLICY (
  policy_id     INT AUTO_INCREMENT PRIMARY KEY,
  artifact_id   INT NOT NULL,
  insurer_name  VARCHAR(150) NOT NULL,
  policy_number VARCHAR(80)  NOT NULL UNIQUE,
  insured_value DECIMAL(14,2) NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  CONSTRAINT fk_ins_artifact FOREIGN KEY (artifact_id) REFERENCES ARTIFACT(artifact_id),
  CONSTRAINT chk_ins_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_ins_value CHECK (insured_value >= 0)
);

-- App login table (plain credentials for course demo)
CREATE TABLE APP_USER (
  user_id  INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50)  NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role     VARCHAR(30)  NOT NULL DEFAULT 'admin'
);

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW vw_artifact_details AS
SELECT
  a.artifact_id,
  a.title,
  a.period,
  a.material,
  a.current_status,
  c.category_name,
  l.location_name,
  a.acquisition_date
FROM ARTIFACT a
JOIN CATEGORY c ON a.category_id = c.category_id
JOIN LOCATION l ON a.location_id = l.location_id;

-- ---------------------------------------------------------------------------
-- Sample data
-- ---------------------------------------------------------------------------

INSERT INTO CATEGORY (category_name) VALUES
  ('Sculpture'),
  ('Painting'),
  ('Manuscript'),
  ('Ceramic'),
  ('Textile');

INSERT INTO LOCATION (location_name, location_type) VALUES
  ('Vault A', 'Storage'),
  ('Vault B', 'Storage'),
  ('Main Gallery', 'Gallery'),
  ('East Wing', 'Gallery'),
  ('Conservation Lab', 'Lab');

INSERT INTO STAFF (name, role, email) VALUES
  ('Aisha Rahman', 'Curator', 'aisha.rahman@museum.edu'),
  ('Ben Carter', 'Conservator', 'ben.carter@museum.edu'),
  ('Chen Wei', 'Curator', 'chen.wei@museum.edu'),
  ('Diana Lopez', 'Registrar', 'diana.lopez@museum.edu'),
  ('Omar Hassan', 'Conservator', 'omar.hassan@museum.edu');

INSERT INTO INSTITUTION (name, country, contact_email) VALUES
  ('National Heritage Museum', 'India', 'loans@nhm.example'),
  ('British Museum', 'UK', 'loans@bm.example'),
  ('Louvre', 'France', 'loans@louvre.example'),
  ('Tokyo National Museum', 'Japan', 'loans@tnm.example');

INSERT INTO ARTIFACT (title, period, material, current_status, category_id, location_id, acquisition_date) VALUES
  ('Bronze Chola Nataraja', '11th century', 'Bronze', 'On Display', 1, 3, '1998-04-12'),
  ('Mughal Miniature Hunt Scene', '17th century', 'Pigment on paper', 'In Storage', 2, 1, '2001-09-03'),
  ('Palm-leaf Astronomy Treatise', '15th century', 'Palm leaf', 'In Storage', 3, 1, '1995-01-20'),
  ('Blue-and-White Dish', 'Ming Dynasty', 'Porcelain', 'On Loan', 4, 2, '2005-06-15'),
  ('Kashmiri Pashmina Shawl', '19th century', 'Wool', 'Under Conservation', 5, 5, '2010-11-08'),
  ('Gandhara Bodhisattva Bust', '2nd century', 'Schist', 'On Display', 1, 4, '1988-03-22'),
  ('Rajasthani Court Portrait', '18th century', 'Opaque watercolor', 'In Storage', 2, 2, '2012-07-19'),
  ('Temple Inscription Fragment', '12th century', 'Granite', 'In Storage', 1, 1, '1990-05-01'),
  ('Persian Calligraphy Panel', '16th century', 'Ink on paper', 'On Display', 3, 3, '2008-02-14'),
  ('Terracotta Horse', 'Indus Valley', 'Terracotta', 'Retired', 4, 2, '1975-12-30');

INSERT INTO EXHIBITION (title, start_date, end_date, curator_id, gallery_id) VALUES
  ('Sacred Forms', DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 60 DAY), 1, 3),
  ('Manuscripts of Knowledge', DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 90 DAY), 3, 4),
  ('Ceramic Crossroads', '2024-01-01', '2024-06-30', 1, 3),
  ('Textile Traditions', DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 120 DAY), 3, 4);

INSERT INTO EXHIBITION_ARTIFACT (exhibition_id, artifact_id, display_position) VALUES
  (1, 1, 1),
  (1, 6, 2),
  (1, 9, 3),
  (2, 3, 1),
  (2, 9, 2),
  (3, 4, 1),
  (3, 10, 2);

INSERT INTO LOAN (artifact_id, institution_id, loan_type, start_date, due_date, return_date, status) VALUES
  (4, 2, 'Outgoing', DATE_SUB(CURRENT_DATE, INTERVAL 90 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY), NULL, 'Overdue'),
  (2, 1, 'Outgoing', DATE_SUB(CURRENT_DATE, INTERVAL 20 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 40 DAY), NULL, 'Active'),
  (7, 3, 'Incoming', DATE_SUB(CURRENT_DATE, INTERVAL 5 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 25 DAY), NULL, 'Active'),
  (8, 4, 'Outgoing', '2023-01-01', '2023-06-01', '2023-05-28', 'Returned');

INSERT INTO CONSERVATION_RECORD (artifact_id, staff_id, condition_before, treatment_done, condition_after, start_date, end_date, cost) VALUES
  (5, 2, 'Faded dyes, loose fringe', 'Stabilized weave, color consolidation', 'Stable for display', DATE_SUB(CURRENT_DATE, INTERVAL 14 DAY), NULL, 4500.00),
  (1, 5, 'Surface corrosion', 'Gentle cleaning and wax coating', 'Stable', '2024-03-01', '2024-03-20', 2200.50),
  (6, 2, 'Hairline crack on shoulder', 'Filled and retouched', 'Structurally sound', '2023-11-10', '2023-12-05', 7800.00),
  (3, 5, 'Insect damage on edges', 'Deacidification and leaf repair', 'Archival stable', '2022-08-01', '2022-09-15', 3100.00),
  (9, 2, 'Foxing stains', 'Surface cleaning', 'Improved legibility', '2025-01-05', '2025-01-18', 950.00);

INSERT INTO INSURANCE_POLICY (artifact_id, insurer_name, policy_number, insured_value, start_date, end_date) VALUES
  (1, 'Heritage Cover Ltd', 'HC-1001', 250000.00, '2025-01-01', '2026-12-31'),
  (2, 'Heritage Cover Ltd', 'HC-1002', 85000.00, '2025-01-01', '2026-12-31'),
  (4, 'Global Art Assure', 'GAA-2201', 120000.00, '2025-01-01', '2026-12-31'),
  (5, 'Global Art Assure', 'GAA-2202', 45000.00, '2025-01-01', '2026-12-31'),
  (6, 'Museum Mutual', 'MM-501', 310000.00, '2025-01-01', '2026-12-31'),
  (9, 'Museum Mutual', 'MM-502', 175000.00, '2025-01-01', '2026-12-31');

INSERT INTO APP_USER (username, password, full_name, role) VALUES
  ('admin', 'admin123', 'System Administrator', 'admin'),
  ('curator', 'curator123', 'Aisha Rahman', 'curator'),
  ('staff', 'staff123', 'Diana Lopez', 'staff'),
  ('user1', 'user123', 'Staff Member One', 'staff');

INSERT INTO STAFF (name, role, email) VALUES
  ('Staff Member One', 'Staff', 'user1@museum.edu');
