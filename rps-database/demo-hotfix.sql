ALTER TABLE questions
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

UPDATE questions
SET order_index = 0
WHERE order_index IS NULL;

CREATE TABLE IF NOT EXISTS campaign_participants (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    participation_token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    invitation_sent_at TIMESTAMP NULL,
    reminder_sent_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (campaign_id, employee_id)
);

INSERT INTO campaign_participants (
    campaign_id,
    employee_id,
    participation_token,
    status,
    invitation_sent_at,
    reminder_sent_at,
    completed_at
)
SELECT
    c.id AS campaign_id,
    e.id AS employee_id,
    COALESCE(NULLIF(e.survey_token, ''), CONCAT('campaign-', c.id, '-employee-', e.id)) AS participation_token,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM responses r
            JOIN questions q ON q.id = r.question_id
            WHERE r.employee_id = e.id
              AND q.campaign_id = c.id
        ) THEN 'completed'
        ELSE 'pending'
    END AS status,
    CURRENT_TIMESTAMP AS invitation_sent_at,
    NULL AS reminder_sent_at,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM responses r
            JOIN questions q ON q.id = r.question_id
            WHERE r.employee_id = e.id
              AND q.campaign_id = c.id
        ) THEN CURRENT_TIMESTAMP
        ELSE NULL
    END AS completed_at
FROM campaigns c
JOIN employees e ON e.company_id = c.company_id
WHERE NOT EXISTS (
    SELECT 1
    FROM campaign_participants cp
    WHERE cp.campaign_id = c.id
      AND cp.employee_id = e.id
);
