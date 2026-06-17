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
BEGIN
  RETURN QUERY
  WITH cl AS (
    SELECT
      u.id AS user_id,
      split_part(u.email, '@', 1)::text AS uname,
      (coalesce(sum(p.points), 0) + coalesce(t.trivia_pts, 0))::bigint AS pts,
      count(p.id)::bigint AS preds_count,
      row_number() OVER (
        ORDER BY (coalesce(sum(p.points), 0) + coalesce(t.trivia_pts, 0)) DESC, count(p.id) DESC, u.email ASC
      ) AS rank
    FROM auth.users u
    LEFT JOIN public.predictions p ON u.id = p.user_id
    LEFT JOIN (
      SELECT user_id, sum(points)::bigint AS trivia_pts
      FROM public.trivia_answers
      GROUP BY user_id
    ) t ON u.id = t.user_id
    WHERE u.email LIKE '%@quiniela.local' AND u.email != 'admin@quiniela.local'
    GROUP BY u.id, u.email, t.trivia_pts
  ),
  yl AS (
    SELECT
      u.id AS user_id,
      row_number() OVER (
        ORDER BY (coalesce(sum(p.points), 0) + coalesce(t.trivia_pts, 0)) DESC, count(p.id) DESC, u.email ASC
      ) AS rank
    FROM auth.users u
    LEFT JOIN public.predictions p ON u.id = p.user_id AND p.match_id IN (
      SELECT id FROM public.matches m WHERE m.match_date < (now() at time zone 'America/Costa_Rica')::date
    )
    LEFT JOIN (
      SELECT user_id, sum(points)::bigint AS trivia_pts
      FROM public.trivia_answers ta
      INNER JOIN public.trivia_questions tq ON ta.question_id = tq.id
      WHERE tq.trivia_date < (now() at time zone 'America/Costa_Rica')::date
      GROUP BY user_id
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
