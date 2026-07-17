import "server-only";

import { prisma } from "@/lib/prisma";

export interface LeaderboardRow {
  rank: number;
  name: string;
  gamesPlayed: number;
  gamesWon: number;
  totalPoints: number;
}

/** Top signed-in players by lifetime points (empty on any error / no DB). */
export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  try {
    const rows = await prisma.leaderboardStat.findMany({
      orderBy: { totalPoints: "desc" },
      take: 50,
    });
    return rows.map(
      (
        r: { displayName: string; gamesPlayed: number; gamesWon: number; totalPoints: number },
        i: number,
      ) => ({
        rank: i + 1,
        name: r.displayName,
        gamesPlayed: r.gamesPlayed,
        gamesWon: r.gamesWon,
        totalPoints: r.totalPoints,
      }),
    );
  } catch {
    return [];
  }
}
