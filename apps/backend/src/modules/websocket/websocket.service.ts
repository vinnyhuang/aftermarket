import { prisma } from '../../server/context';
import { SocketStream } from '@fastify/websocket';
import { TimeOdds } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { LeaderboardEntry } from '../leaderboard/leaderboard.types';

export class WebSocketService {
  private connections: Set<SocketStream> = new Set();

  constructor(private fastify: FastifyInstance) {
    this.setupWebSocket();
  }

  private async setupWebSocket() {
    this.fastify.get('/ws', { websocket: true }, async (connection) => {
      this.connections.add(connection);

      connection.socket.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'ping') {
            connection.socket.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (error) {
          console.error('Error handling websocket message:', error);
        }
      });
      
      // Get active game and its odds history
      const activeGame = await prisma.game.findFirst({
        where: { active: true }
      });

      if (activeGame) {
        const oddsHistory = await prisma.timeOdds.findMany({
          where: {
            gameId: activeGame.id
          },
          orderBy: {
            time: 'asc'
          }
        });

        // Send initial odds history
        connection.socket.send(JSON.stringify({
          type: 'odds_history',
          data: oddsHistory
        }));

        if (activeGame.currentLeaderboard) {
          connection.socket.send(JSON.stringify({
            type: 'leaderboard_update',
            data: JSON.parse(activeGame.currentLeaderboard)
          }));
        }
      }

      connection.socket.on('close', () => {
        this.connections.delete(connection);
      });
    });
  }

  public broadcastOddsHistory(oddsHistory: Array<TimeOdds>) {
    const message = JSON.stringify({
      type: 'odds_history',
      data: oddsHistory
    });

    this.connections.forEach((connection) => {
      connection.socket.send(message);
    });
  }

  public broadcastLeaderboard(leaderboard: Array<LeaderboardEntry>) {
    const message = JSON.stringify({
      type: 'leaderboard_update',
      data: leaderboard
    });

    this.connections.forEach((connection) => {
      connection.socket.send(message);
    });
  }

  public broadcastGameEnd() {
    const message = JSON.stringify({
      type: 'game_end'
    });

    this.connections.forEach((connection) => {
      connection.socket.send(message);
    });
  }
}