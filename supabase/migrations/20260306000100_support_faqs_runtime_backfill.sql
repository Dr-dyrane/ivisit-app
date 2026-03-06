-- Runtime backfill for already-deployed databases:
-- support_faqs data seeding was integrated into 0005_ops_content for baseline schema,
-- but environments that already ran 20260219000500 need a forward migration to receive rows.

WITH faq_defaults AS (
    SELECT *
    FROM (VALUES
        (
            'How do I update my medical profile?',
            'Go to the ''More'' tab and select ''Medical Profile''. You can update your blood type, allergies, and chronic conditions there. Changes are saved immediately and synced with emergency responders.',
            'Account',
            1
        ),
        (
            'What happens when I press SOS?',
            'When you activate SOS, we immediately alert nearby ambulances and your emergency contacts. Your location and medical profile are shared securely with responders to ensure the fastest possible care.',
            'Emergency',
            2
        ),
        (
            'Who can see my medical data?',
            'Your data is private by default. We only share your critical medical info (blood type, allergies) with verified emergency responders during an active SOS request. You can manage these permissions in Settings > Privacy.',
            'Privacy',
            3
        ),
        (
            'Do you accept my insurance?',
            'iVisit partners with major insurance providers. You can add your insurance details in the ''Insurance'' section under the ''More'' tab. We''ll automatically check eligibility for ambulance rides and hospital visits.',
            'Billing',
            4
        ),
        (
            'How do I reset my password?',
            'If you''re logged out, tap ''Forgot Password'' on the login screen. If you''re logged in, go to Settings > Account Security to change your password.',
            'Account',
            5
        )
    ) AS t(question, answer, category, rank)
),
updated_rows AS (
    UPDATE public.support_faqs f
    SET
        answer = d.answer,
        category = d.category,
        rank = d.rank
    FROM faq_defaults d
    WHERE lower(trim(f.question)) = lower(trim(d.question))
    RETURNING f.id
)
INSERT INTO public.support_faqs (question, answer, category, rank)
SELECT
    d.question,
    d.answer,
    d.category,
    d.rank
FROM faq_defaults d
WHERE NOT EXISTS (
    SELECT 1
    FROM public.support_faqs f
    WHERE lower(trim(f.question)) = lower(trim(d.question))
);
