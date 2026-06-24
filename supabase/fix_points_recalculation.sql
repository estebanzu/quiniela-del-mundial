-- ==========================================
-- FIX: Recalculate ALL prediction points from scratch
-- Processes matches chronologically, one at a time,
-- with explicit streak calculation per user.
-- Run this in the Supabase SQL Editor.
-- ==========================================

-- Step 1: Disable the trigger so our manual updates don't re-fire it
ALTER TABLE public.matches DISABLE TRIGGER trigger_update_prediction_points;

-- Step 2: Reset ALL prediction points to 0
UPDATE public.predictions SET points = 0;

-- Step 3: Recalculate sequentially (match by match, user by user)
DO $$
DECLARE
  m_rec   RECORD;  -- current match being processed
  p_rec   RECORD;  -- current prediction being scored
  prev    RECORD;  -- for streak iteration
  base_pts INT;
  streak   INT;
  final_pts INT;
BEGIN
  FOR m_rec IN
    SELECT id, home_score, away_score, match_date
    FROM public.matches
    WHERE status = 'finished'
      AND home_score IS NOT NULL
      AND away_score IS NOT NULL
    ORDER BY match_date ASC, id ASC
  LOOP
    -- For each prediction on this match
    FOR p_rec IN
      SELECT id, user_id, predicted_home, predicted_away
      FROM public.predictions
      WHERE match_id = m_rec.id
    LOOP
      -- 1) Calculate base points (same rules as original)
      IF m_rec.home_score = p_rec.predicted_home
         AND m_rec.away_score = p_rec.predicted_away THEN
        base_pts := 5;  -- exact score
      ELSIF SIGN(m_rec.home_score - m_rec.away_score)
            = SIGN(p_rec.predicted_home - p_rec.predicted_away) THEN
        IF m_rec.home_score = m_rec.away_score THEN
          base_pts := 1;  -- correct draw
        ELSE
          base_pts := 3;  -- correct winner
        END IF;
      ELSE
        base_pts := 0;
      END IF;

      -- 2) Calculate streak (consecutive scoring predictions before this match)
      IF base_pts > 0 THEN
        streak := 0;
        FOR prev IN
          SELECT pp.points
          FROM public.predictions pp
          INNER JOIN public.matches mm ON mm.id = pp.match_id
          WHERE pp.user_id = p_rec.user_id
            AND mm.status = 'finished'
            AND mm.match_date < m_rec.match_date
          ORDER BY mm.match_date DESC, mm.id DESC
        LOOP
          IF prev.points > 0 THEN
            streak := streak + 1;
          ELSE
            EXIT;
          END IF;
        END LOOP;

        -- 3) Apply x1.5 multiplier if streak >= 3
        IF streak >= 3 THEN
          final_pts := CEIL(base_pts * 1.5);
        ELSE
          final_pts := base_pts;
        END IF;
      ELSE
        final_pts := 0;
      END IF;

      -- 4) Persist
      UPDATE public.predictions
      SET points = final_pts
      WHERE id = p_rec.id;

    END LOOP;  -- predictions
  END LOOP;    -- matches
END;
$$;

-- Step 4: Re-enable the trigger for future match updates
ALTER TABLE public.matches ENABLE TRIGGER trigger_update_prediction_points;

-- Step 5: Verify — leaderboard with trivia points
SELECT
  split_part(u.email, '@', 1) AS username,
  COALESCE(pred_pts, 0) AS prediction_points,
  COALESCE(trivia_pts, 0) AS trivia_points,
  (COALESCE(pred_pts, 0) + COALESCE(trivia_pts, 0))::bigint AS total_points
FROM auth.users u
LEFT JOIN (
  SELECT user_id, SUM(points)::bigint AS pred_pts
  FROM public.predictions
  GROUP BY user_id
) p ON u.id = p.user_id
LEFT JOIN (
  SELECT user_id, SUM(points)::bigint AS trivia_pts
  FROM public.trivia_answers
  GROUP BY user_id
) t ON u.id = t.user_id
WHERE u.email LIKE '%@quiniela.local'
  AND u.email != 'admin@quiniela.local'
ORDER BY total_points DESC;
