-- Add penalty shootout columns to matches table
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS home_penalty int;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS away_penalty int;

-- Update update_prediction_points function to handle penalty shootouts
CREATE OR REPLACE FUNCTION public.update_prediction_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_pts int := 0;
  actual_winner int := 0; -- 1 for home, 2 for away, 0 for draw
  pred_winner int := 0;   -- 1 for home, 2 for away, 0 for draw
  final_pts int := 0;
  pred_rec record;
  prev_rec record;
  streak int := 0;
BEGIN
  IF (new.status = 'finished') AND 
     (old.status IS DISTINCT FROM 'finished' OR 
      old.home_score IS DISTINCT FROM new.home_score OR 
      old.away_score IS DISTINCT FROM new.away_score OR
      old.home_penalty IS DISTINCT FROM new.home_penalty OR
      old.away_penalty IS DISTINCT FROM new.away_penalty) THEN
    
    FOR pred_rec IN SELECT * FROM public.predictions WHERE match_id = new.id LOOP
      -- Determine actual winner (regular time + penalty shootout)
      IF new.home_score > new.away_score THEN
        actual_winner := 1;
      ELSIF new.away_score > new.home_score THEN
        actual_winner := 2;
      ELSIF new.home_penalty IS NOT NULL AND new.away_penalty IS NOT NULL THEN
        IF new.home_penalty > new.away_penalty THEN
          actual_winner := 1;
        ELSIF new.away_penalty > new.home_penalty THEN
          actual_winner := 2;
        ELSE
          actual_winner := 0;
        END IF;
      ELSE
        actual_winner := 0;
      END IF;

      -- Determine predicted winner
      IF pred_rec.predicted_home > pred_rec.predicted_away THEN
        pred_winner := 1;
      ELSIF pred_rec.predicted_away > pred_rec.predicted_home THEN
        pred_winner := 2;
      ELSE
        pred_winner := 0;
      END IF;

      -- Calculate base points
      IF new.home_score = pred_rec.predicted_home AND new.away_score = pred_rec.predicted_away THEN
        -- Exact score in regular/extra time: 5 points
        base_pts := 5;
      ELSIF new.home_score = new.away_score AND pred_rec.predicted_home = pred_rec.predicted_away THEN
        -- Predicted draw, and it was a draw in regular time (but not exact score): 1 point
        base_pts := 1;
      ELSIF actual_winner <> 0 AND pred_winner = actual_winner THEN
        -- Correctly predicted the winner (either in regular time or via penalty shootout): 3 points
        base_pts := 3;
      ELSE
        base_pts := 0;
      END IF;

      -- Apply streak multipliers
      IF base_pts > 0 THEN
        streak := 0;
        FOR prev_rec IN
          SELECT p.points
          FROM public.predictions p
          INNER JOIN public.matches m ON m.id = p.match_id
          WHERE p.user_id = pred_rec.user_id
            AND m.status = 'finished'
            AND m.match_date < new.match_date
          ORDER BY m.match_date DESC
        LOOP
          IF prev_rec.points > 0 THEN
            streak := streak + 1;
          ELSE
            EXIT;
          END IF;
        END LOOP;

        -- Apply x1.5 multiplier if streak >= 3 consecutive wins before this match
        IF streak >= 3 THEN
          final_pts := ceil(base_pts * 1.5);
        ELSE
          final_pts := base_pts;
        END IF;
      ELSE
        final_pts := 0;
      END IF;

      UPDATE public.predictions SET points = final_pts WHERE id = pred_rec.id;
    END LOOP;

  ELSIF (new.status = 'pending' AND old.status = 'finished') THEN
    UPDATE public.predictions p
    SET points = 0
    WHERE p.match_id = new.id;
  END IF;

  RETURN new;
END;
$$;
