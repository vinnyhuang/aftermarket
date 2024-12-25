import { Game, TimeOdds } from '@prisma/client';
import { prisma } from '../../server/context';
import { getOddsForGame, getGameScore } from '../odds/odds.service';
import { WebSocketService } from '../websocket/websocket.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';

const MONITOR_INTERVAL = 60000;
const POLL_INTERVAL = 15000;

const calculateTeamPrice = (
  currentWinProb: number | null,
  pregameWinProb: number | null
): number => {
  if (!currentWinProb || !pregameWinProb) return 0;
  return (Number(currentWinProb) / Number(pregameWinProb)) * 100;
};

export class GameMonitor {
  private wsService: WebSocketService;
  private pollInterval: NodeJS.Timeout | null = null;
  private oddsHistory: Array<TimeOdds> = [];
  private leaderboardService: LeaderboardService;

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
    this.leaderboardService = new LeaderboardService(prisma, wsService);
    this.startMonitoring();
  }

  private async startMonitoring() {
    const checkAndStartPolling = async () => {
      const activeGame = await prisma.game.findFirst({
        where: { active: true }
      });
  
      if (!activeGame) {
        this.stopPolling();
        return;
      }
  
      const now = new Date();
      const gameTime = new Date(activeGame.commenceTime);
  
      if (now >= gameTime && !activeGame.ended) {
        this.startPolling(activeGame);
        // Pull all TimeOdds for active game and set oddsHistory
        this.oddsHistory = await prisma.timeOdds.findMany({
          where: {
            gameId: activeGame.id
          },
          orderBy: {
            time: 'asc'
          }
        });
      } else {
        this.stopPolling();
      }
    };
  
    // Run immediately
    await checkAndStartPolling();
    
    // Then set up interval
    setInterval(checkAndStartPolling, MONITOR_INTERVAL);
  }

  private async startPolling(game: Game) {
    if (this.pollInterval) return;

    // Define polling function
    const pollOdds = async () => {
      // First check if game is completed
      const score = await getGameScore(game);
      if (score?.completed) {
        const winningTeam = score.homeScore > score.awayScore ? 'home' : 'away';
        await this.handleGameEnd(game, winningTeam);
        this.stopPolling();
        return;
      }

      const odds = await getOddsForGame(game);
      let timeOdds;
      if (odds) {
        // Save to database
        timeOdds = await prisma.timeOdds.create({
          data: {
            gameId: game.id,
            time: new Date().toISOString(),
            ...odds
          }
        });
  
        this.oddsHistory.push(timeOdds);
      } else {
        timeOdds = this.oddsHistory[this.oddsHistory.length - 1];
      }

      // Broadcast odds history
      this.wsService.broadcastOddsHistory(this.oddsHistory);

      // Calculate current prices
      const homePrice = calculateTeamPrice(
        Number(timeOdds.homeWinProb),
        Number(game.pregameHomeWinProb)
      );
      const awayPrice = calculateTeamPrice(
        Number(timeOdds.awayWinProb),
        Number(game.pregameAwayWinProb)
      );

      // Update leaderboard (async)
      this.leaderboardService.calculateAndBroadcastLeaderboard(
        game.id,
        homePrice,
        awayPrice
      );
    };

    // Execute immediately
    await pollOdds();

    // Then set up interval
    this.pollInterval = setInterval(pollOdds, POLL_INTERVAL);
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      this.oddsHistory = [];
    }
  }

  private async handleGameEnd(game: Game, winningTeam: 'home' | 'away') {
    // Get all active positions
    const activePositions = await prisma.userGamePosition.findMany({
      where: {
        userGame: { gameId: game.id },
        sellAmount: null,
        sellPrice: null
      }
    });

    // Process each position
    for (const position of activePositions) {
      const sellPrice = position.team === winningTeam 
        ? Number(position.team === 'home' ? game.pregameHomePayout : game.pregameAwayPayout) / 100
        : 0;

      const sellAmount = Number(position.buyAmount) * sellPrice / Number(position.buyPrice);

      await prisma.userGamePosition.update({
        where: { id: position.id },
        data: {
          sellAmount,
          sellPrice,
          sellTime: new Date()
        }
      });
    }

    // Add final TimeOdds record with winning team at max payout and losing team at 0
    await prisma.timeOdds.create({
      data: {
        gameId: game.id,
        time: new Date(),
        homeWinProb: winningTeam === 'home' ? 100 : 0,
        awayWinProb: winningTeam === 'away' ? 100 : 0,
        homePrice: winningTeam === 'home' ? Number(game.pregameHomePayout) : 0,
        awayPrice: winningTeam === 'away' ? Number(game.pregameAwayPayout) : 0
      }
    });

    // Get full odds history and broadcast one final time
    const finalOddsHistory = await prisma.timeOdds.findMany({
      where: { gameId: game.id },
      orderBy: { time: 'asc' }
    });
    this.wsService.broadcastOddsHistory(finalOddsHistory);

    // Mark game as ended
    await prisma.game.update({
      where: { id: game.id },
      data: { ended: true }
    });

    // Broadcast final leaderboard
    await this.leaderboardService.calculateAndBroadcastLeaderboard(
      game.id,
      winningTeam === 'home' ? Number(game.pregameHomePayout) / 100 : 0,
      winningTeam === 'away' ? Number(game.pregameAwayPayout) / 100 : 0
    );

    // Broadcast game end event
    this.wsService.broadcastGameEnd();
  }
}