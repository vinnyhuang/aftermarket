import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';
import { FastifyPluginAsync } from 'fastify';
import { WebSocketService } from '../../modules/websocket/websocket.service';
import { GameMonitor } from '../../modules/game/game.monitor';

declare module 'fastify' {
  interface FastifyInstance {
    wsService: WebSocketService;
  }
}

const websocketPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(websocket);

  const wsService = new WebSocketService(fastify);

  // Initialize game monitor with the WebSocket service
  new GameMonitor(wsService);

  // Add wsService to fastify instance
  fastify.decorate('wsService', wsService);
};

export default fp(websocketPlugin, {
  name: 'websocket-plugin'
});