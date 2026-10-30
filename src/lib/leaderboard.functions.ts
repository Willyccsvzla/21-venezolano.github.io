import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

export type LeaderboardEntry = {
  rank: number;
  nick: string;
  wins: number;
  games: number;
  chipsWon: number;
  isYou: boolean;
};

export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<LeaderboardEntry[]> => {
    const sql = await getSql();
    const rows = await sql<{
      rank: number; user_id: string; nick: string; wins: number; games: number; chips_won: number;
    }>`
      with totals as (
        select user_id, max(nick) as nick,
          count(*)::int as games,
          count(*) filter (where won)::int as wins,
          coalesce(sum(payout), 0)::int as chips_won,
          max(recorded_at) as last_at
        from game_results group by user_id
      ), ranked as (
        select row_number() over (order by wins desc, chips_won desc, last_at asc, nick asc)::int as rank,
          user_id, nick, wins, games, chips_won
        from totals
      )
      select rank, user_id, nick, wins, games, chips_won from ranked order by rank limit 50
    `;
    return rows.map((row) => ({
      rank: Number(row.rank),
      nick: row.nick,
      wins: Number(row.wins),
      games: Number(row.games),
      chipsWon: Number(row.chips_won),
      isYou: row.user_id === context.userId,
    }));
  });
