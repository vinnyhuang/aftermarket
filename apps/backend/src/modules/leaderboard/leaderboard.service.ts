import { PrismaClient } from '@prisma/client';
import { WebSocketService } from '../websocket/websocket.service';
import { LeaderboardEntry } from './leaderboard.types';

export class LeaderboardService {
  constructor(
    private prisma: PrismaClient,
    private wsService: WebSocketService
  ) {}

  async calculateAndBroadcastLeaderboard(gameId: string, currentHomePrice: number, currentAwayPrice: number) {
    const userGames = await this.prisma.userGame.findMany({
      where: { gameId },
      include: {
        user: {
          select: {
            username: true
          }
        },
        userGamePositions: true
      }
    });

    // Only include users who have made trades
    const activeUserGames = userGames.filter(userGame => userGame.userGamePositions.length > 0);

    const leaderboard: LeaderboardEntry[] = await Promise.all(
      activeUserGames.map(async (userGame) => {
        // Start with initial bankroll
        let totalValue = Number(userGame.bankroll);

        // Calculate value for each position
        for (const position of userGame.userGamePositions) {
          // Subtract initial buy amount
          totalValue -= Number(position.buyAmount);

          if (position.sellAmount && position.sellPrice) {
            // Add completed trade value
            totalValue += Number(position.sellAmount);
          } else {
            // Calculate current value of active position
            const currentPrice = position.team === 'home' ? currentHomePrice : currentAwayPrice;
            const currentValue = Number(position.buyAmount) * currentPrice / Number(position.buyPrice);
            totalValue += currentValue;
          }
        }

        return {
          userId: userGame.userId,
          username: userGame.user.username,
          bankroll: Number(totalValue.toFixed(2))
        };
      })
    );

    // Sort by bankroll in descending order and take top 10
    const top10Leaderboard = leaderboard
      .sort((a, b) => b.bankroll - a.bankroll)
      .slice(0, 10);

    // Broadcast the leaderboard
    this.wsService.broadcastLeaderboard(top10Leaderboard);
  }
}
