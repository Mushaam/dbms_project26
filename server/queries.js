/**
 * Q1–Q20 project SQL queries (verbatim named strings).
 * Use parameterized placeholders (?) for user inputs.
 */

const queries = {
  Q1: {
    title: 'Artifacts in storage',
    sql: `SELECT artifact_id, title, period, current_status FROM ARTIFACT WHERE current_status = 'In Storage'`
  },
  Q2: {
    title: 'Catalogue sorted',
    sql: `SELECT artifact_id, title, material FROM ARTIFACT ORDER BY title ASC`
  },
  Q3: {
    title: 'Count by category',
    sql: `SELECT c.category_name, COUNT(a.artifact_id) AS artifact_count FROM CATEGORY c LEFT JOIN ARTIFACT a ON a.category_id = c.category_id GROUP BY c.category_id, c.category_name ORDER BY artifact_count DESC`
  },
  Q4: {
    title: 'Categories with >= 2 artifacts',
    sql: `SELECT c.category_name, COUNT(a.artifact_id) AS artifact_count FROM CATEGORY c JOIN ARTIFACT a ON a.category_id = c.category_id GROUP BY c.category_id, c.category_name HAVING COUNT(a.artifact_id) >= 2`
  },
  Q5: {
    title: 'Insured summary',
    sql: `SELECT MIN(insured_value) AS minimum_value, MAX(insured_value) AS maximum_value, AVG(insured_value) AS average_value, SUM(insured_value) AS total_insured_value FROM INSURANCE_POLICY`
  },
  Q6: {
    title: 'Readable catalogue',
    sql: `SELECT a.artifact_id, a.title, c.category_name, l.location_name, a.current_status FROM ARTIFACT a JOIN CATEGORY c ON a.category_id = c.category_id JOIN LOCATION l ON a.location_id = l.location_id ORDER BY a.artifact_id`
  },
  Q7: {
    title: 'Exhibition items & curators',
    sql: `SELECT e.title AS exhibition_title, a.title AS artifact_title, ea.display_position, s.name AS curator_name FROM EXHIBITION e JOIN EXHIBITION_ARTIFACT ea ON e.exhibition_id = ea.exhibition_id JOIN ARTIFACT a ON ea.artifact_id = a.artifact_id JOIN STAFF s ON e.curator_id = s.staff_id ORDER BY e.title, ea.display_position`
  },
  Q8: {
    title: 'Insured above average',
    sql: `SELECT a.artifact_id, a.title FROM ARTIFACT a WHERE a.artifact_id IN (SELECT ip.artifact_id FROM INSURANCE_POLICY ip WHERE ip.insured_value > (SELECT AVG(insured_value) FROM INSURANCE_POLICY))`
  },
  Q9: {
    title: 'Conservation history',
    sql: `SELECT artifact_id, title FROM ARTIFACT WHERE artifact_id IN (SELECT artifact_id FROM CONSERVATION_RECORD)`
  },
  Q10: {
    title: 'Overdue outgoing loans',
    sql: `SELECT lo.loan_id, a.title, i.name AS institution_name, lo.due_date, lo.status FROM LOAN lo JOIN ARTIFACT a ON lo.artifact_id = a.artifact_id JOIN INSTITUTION i ON lo.institution_id = i.institution_id WHERE lo.loan_type = 'Outgoing' AND lo.return_date IS NULL AND lo.due_date < CURRENT_DATE`
  },
  Q11: {
    title: 'Conservation review',
    sql: `SELECT a.title AS artifact_title, cr.condition_before, cr.treatment_done, cr.condition_after, cr.start_date, cr.end_date, s.name AS conservator FROM CONSERVATION_RECORD cr JOIN ARTIFACT a ON cr.artifact_id = a.artifact_id JOIN STAFF s ON cr.staff_id = s.staff_id ORDER BY cr.start_date DESC`
  },
  Q12: {
    title: 'View read',
    sql: `SELECT * FROM vw_artifact_details ORDER BY title`
  },
  Q13: {
    title: 'Workload by staff',
    sql: `SELECT s.staff_id, s.name, COUNT(cr.record_id) AS treatments_handled FROM STAFF s LEFT JOIN CONSERVATION_RECORD cr ON s.staff_id = cr.staff_id GROUP BY s.staff_id, s.name ORDER BY treatments_handled DESC, s.name`
  },
  Q14: {
    title: 'Exhibitions active today',
    sql: `SELECT exhibition_id, title, start_date, end_date FROM EXHIBITION WHERE CURRENT_DATE BETWEEN start_date AND end_date ORDER BY start_date`
  },
  Q15: {
    title: 'Unassigned artifacts',
    sql: `SELECT a.artifact_id, a.title FROM ARTIFACT a WHERE NOT EXISTS (SELECT 1 FROM EXHIBITION_ARTIFACT ea WHERE ea.artifact_id = a.artifact_id)`
  },
  Q16: {
    title: 'Insured above threshold',
    sql: `SELECT title FROM ARTIFACT WHERE artifact_id IN (SELECT artifact_id FROM INSURANCE_POLICY WHERE insured_value > ?)`,
    params: ['threshold']
  },
  Q17: {
    title: 'Conservation cost per artifact',
    sql: `SELECT artifact_id, SUM(cost) AS total_cost FROM CONSERVATION_RECORD GROUP BY artifact_id`
  },
  Q18: {
    title: 'Overdue loans by status',
    sql: `SELECT a.title, i.name, lo.due_date FROM LOAN lo JOIN ARTIFACT a ON lo.artifact_id = a.artifact_id JOIN INSTITUTION i ON lo.institution_id = i.institution_id WHERE lo.status = 'Overdue'`
  },
  Q19: {
    title: 'Exhibition list',
    sql: `SELECT e.title AS exhibition, a.title AS artifact FROM EXHIBITION e JOIN EXHIBITION_ARTIFACT ea ON e.exhibition_id = ea.exhibition_id JOIN ARTIFACT a ON ea.artifact_id = a.artifact_id ORDER BY e.title, a.title`
  },
  Q20: {
    title: 'Status breakdown',
    sql: `SELECT current_status, COUNT(*) AS artifact_count FROM ARTIFACT GROUP BY current_status`
  }
};

module.exports = queries;
