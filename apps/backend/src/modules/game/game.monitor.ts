import { Game, TimeOdds } from '@prisma/client';
import { prisma } from '../../server/context';
import { getOddsForGame } from '../odds/odds.service';
import { WebSocketService } from '../websocket/websocket.service';

const MONITOR_INTERVAL = 60000;
const POLL_INTERVAL = 15000;
const GAME_DURATION = 4 * 60 * 60 * 1000;

export class GameMonitor {
  private wsService: WebSocketService;
  private pollInterval: NodeJS.Timeout | null = null;
  private oddsHistory: Array<TimeOdds> = [];

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
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
      const fourHoursLater = new Date(gameTime.getTime() + GAME_DURATION);
  
      if (now >= gameTime && now <= fourHoursLater) {
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
      const odds = await getOddsForGame(game);
      if (!odds) return;

      // Save to database
      const timeOdds = await prisma.timeOdds.create({
        data: {
          gameId: game.id,
          time: new Date().toISOString(),
          ...odds
        }
      });

      this.oddsHistory.push(timeOdds);

      // Broadcast to clients
      this.wsService.broadcastOddsHistory(this.oddsHistory);
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
}