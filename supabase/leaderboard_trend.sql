-- ==========================================
-- LEADERBOARD TREND (RANK CHANGES)
-- Run this in the Supabase SQL Editor
-- ==========================================

-- 1. Drop the old function (necessary because return columns count/type is changing)
DROP FUNCTION IF EXISTS public.get_leaderboard();

-- 2. Create the updated function with rank_change calculation
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE(username text, total_points bigint, predictions_count bigint, rank_change bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  curr_phase int;
BEGIN
  -- Determine current active phase based on first pending match
  SELECT 
    CASE 
      WHEN min(id) IS NULL THEN 6
      WHEN min(id) <= 72 THEN 1
      WHEN min(id) <= 88 THEN 2
      WHEN min(id) <= 96 THEN 3
      WHEN min(id) <= 100 THEN 4
      WHEN min(id) <= 102 THEN 5
      ELSE 6
    END INTO curr_phase
  FROM public.matches
  WHERE status != 'finished';

  IF curr_phase IS NULL THEN
    curr_phase := 6;
  END IF;

  RETURN QUERY
  WITH cl AS (
    SELECT
      u.id AS user_id,
      split_part(u.email, '@', 1)::text AS uname,
      (
        coalesce(sum(CASE 
          WHEN curr_phase = 1 AND p.match_id >= 1 AND p.match_id <= 72 THEN p.points
          WHEN curr_phase = 2 AND p.match_id >= 73 AND p.match_id <= 88 THEN p.points
          WHEN curr_phase = 3 AND p.match_id >= 89 AND p.match_id <= 96 THEN p.points
          WHEN curr_phase = 4 AND p.match_id >= 97 AND p.match_id <= 100 THEN p.points
          WHEN curr_phase = 5 AND p.match_id >= 101 AND p.match_id <= 102 THEN p.points
          WHEN curr_phase = 6 AND p.match_id >= 103 AND p.match_id <= 104 THEN p.points
          ELSE 0
        END), 0) + coalesce(t.trivia_pts, 0)
      )::bigint AS pts,
      sum(CASE 
        WHEN curr_phase = 1 AND p.match_id >= 1 AND p.match_id <= 72 THEN 1
        WHEN curr_phase = 2 AND p.match_id >= 73 AND p.match_id <= 88 THEN 1
        WHEN curr_phase = 3 AND p.match_id >= 89 AND p.match_id <= 96 THEN 1
        WHEN curr_phase = 4 AND p.match_id >= 97 AND p.match_id <= 100 THEN 1
        WHEN curr_phase = 5 AND p.match_id >= 101 AND p.match_id <= 102 THEN 1
        WHEN curr_phase = 6 AND p.match_id >= 103 AND p.match_id <= 104 THEN 1
        ELSE 0
      END)::bigint AS preds_count,
      row_number() OVER (
        ORDER BY 
          (coalesce(sum(CASE 
            WHEN curr_phase = 1 AND p.match_id >= 1 AND p.match_id <= 72 THEN p.points
            WHEN curr_phase = 2 AND p.match_id >= 73 AND p.match_id <= 88 THEN p.points
            WHEN curr_phase = 3 AND p.match_id >= 89 AND p.match_id <= 96 THEN p.points
            WHEN curr_phase = 4 AND p.match_id >= 97 AND p.match_id <= 100 THEN p.points
            WHEN curr_phase = 5 AND p.match_id >= 101 AND p.match_id <= 102 THEN p.points
            WHEN curr_phase = 6 AND p.match_id >= 103 AND p.match_id <= 104 THEN p.points
            ELSE 0
          END), 0) + coalesce(t.trivia_pts, 0)) DESC,
          sum(CASE 
            WHEN curr_phase = 1 AND p.match_id >= 1 AND p.match_id <= 72 THEN 1
            WHEN curr_phase = 2 AND p.match_id >= 73 AND p.match_id <= 88 THEN 1
            WHEN curr_phase = 3 AND p.match_id >= 89 AND p.match_id <= 96 THEN 1
            WHEN curr_phase = 4 AND p.match_id >= 97 AND p.match_id <= 100 THEN 1
            WHEN curr_phase = 5 AND p.match_id >= 101 AND p.match_id <= 102 THEN 1
            WHEN curr_phase = 6 AND p.match_id >= 103 AND p.match_id <= 104 THEN 1
            ELSE 0
          END) DESC,
          u.email ASC
      ) AS rank
    FROM auth.users u
    LEFT JOIN public.predictions p ON u.id = p.user_id
    LEFT JOIN (
      SELECT 
        ta.user_id,
        sum(ta.points)::bigint AS trivia_pts
      FROM public.trivia_answers ta
      INNER JOIN public.trivia_questions tq ON ta.question_id = tq.id
      WHERE 
        (curr_phase = 1 AND tq.trivia_date <= '2026-06-27') OR
        (curr_phase = 2 AND tq.trivia_date >= '2026-06-28' AND tq.trivia_date <= '2026-07-03') OR
        (curr_phase = 3 AND tq.trivia_date >= '2026-07-04' AND tq.trivia_date <= '2026-07-07') OR
        (curr_phase = 4 AND tq.trivia_date >= '2026-07-08' AND tq.trivia_date <= '2026-07-12') OR
        (curr_phase = 5 AND tq.trivia_date >= '2026-07-13' AND tq.trivia_date <= '2026-07-15') OR
        (curr_phase = 6 AND tq.trivia_date >= '2026-07-16')
      GROUP BY ta.user_id
    ) t ON u.id = t.user_id
    WHERE u.email LIKE '%@quiniela.local' AND u.email != 'admin@quiniela.local'
    GROUP BY u.id, u.email, t.trivia_pts
  ),
  yl AS (
    SELECT
      u.id AS user_id,
      row_number() OVER (
        ORDER BY 
          (coalesce(sum(CASE 
            WHEN curr_phase = 1 AND p.match_id >= 1 AND p.match_id <= 72 THEN p.points
            WHEN curr_phase = 2 AND p.match_id >= 73 AND p.match_id <= 88 THEN p.points
            WHEN curr_phase = 3 AND p.match_id >= 89 AND p.match_id <= 96 THEN p.points
            WHEN curr_phase = 4 AND p.match_id >= 97 AND p.match_id <= 100 THEN p.points
            WHEN curr_phase = 5 AND p.match_id >= 101 AND p.match_id <= 102 THEN p.points
            WHEN curr_phase = 6 AND p.match_id >= 103 AND p.match_id <= 104 THEN p.points
            ELSE 0
          END), 0) + coalesce(t.trivia_pts, 0)) DESC,
          sum(CASE 
            WHEN curr_phase = 1 AND p.match_id >= 1 AND p.match_id <= 72 THEN 1
            WHEN curr_phase = 2 AND p.match_id >= 73 AND p.match_id <= 88 THEN 1
            WHEN curr_phase = 3 AND p.match_id >= 89 AND p.match_id <= 96 THEN 1
            WHEN curr_phase = 4 AND p.match_id >= 97 AND p.match_id <= 100 THEN 1
            WHEN curr_phase = 5 AND p.match_id >= 101 AND p.match_id <= 102 THEN 1
            WHEN curr_phase = 6 AND p.match_id >= 103 AND p.match_id <= 104 THEN 1
            ELSE 0
          END) DESC,
          u.email ASC
      ) AS rank
    FROM auth.users u
    LEFT JOIN public.predictions p ON u.id = p.user_id AND p.match_id IN (
      SELECT id FROM public.matches m WHERE m.match_date < (now() at time zone 'America/Costa_Rica')::date
    )
    LEFT JOIN (
      SELECT 
        ta.user_id,
        sum(ta.points)::bigint AS trivia_pts
      FROM public.trivia_answers ta
      INNER JOIN public.trivia_questions tq ON ta.question_id = tq.id
      WHERE 
        tq.trivia_date < (now() at time zone 'America/Costa_Rica')::date AND (
          (curr_phase = 1 AND tq.trivia_date <= '2026-06-27') OR
          (curr_phase = 2 AND tq.trivia_date >= '2026-06-28' AND tq.trivia_date <= '2026-07-03') OR
          (curr_phase = 3 AND tq.trivia_date >= '2026-07-04' AND tq.trivia_date <= '2026-07-07') OR
          (curr_phase = 4 AND tq.trivia_date >= '2026-07-08' AND tq.trivia_date <= '2026-07-12') OR
          (curr_phase = 5 AND tq.trivia_date >= '2026-07-13' AND tq.trivia_date <= '2026-07-15') OR
          (curr_phase = 6 AND tq.trivia_date >= '2026-07-16')
        )
      GROUP BY ta.user_id
    ) t ON u.id = t.user_id
    WHERE u.email LIKE '%@quiniela.local' AND u.email != 'admin@quiniela.local'
    GROUP BY u.id, u.email, t.trivia_pts
  )
  SELECT
    cl.uname AS username,
    cl.pts AS total_points,
    cl.preds_count AS predictions_count,
    (coalesce(yl.rank, cl.rank)::bigint - cl.rank::bigint) AS rank_change
  FROM cl
  LEFT JOIN yl ON cl.user_id = yl.user_id
  ORDER BY cl.rank;
END;
$$;
