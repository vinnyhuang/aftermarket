import { procedure, router } from '../../server/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

const INITIAL_BANKROLL = 300;

export const gameRouter = router({
  createUserGame: procedure
    .input(z.object({
      userId: z.string(),
      gameId: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.prisma.userGame.create({
          data: {
            userId: input.userId,
            gameId: input.gameId,
            bankroll: INITIAL_BANKROLL
          }
        });
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Failed to create user game'
        });
      }
    }),

  getUserGame: procedure
    .input(z.object({
      userId: z.string(),
      gameId: z.string()
    }))
    .query(async ({ input, ctx }) => {
      const userGame = await ctx.prisma.userGame.findUnique({
        where: {
          userId_gameId: {
            userId: input.userId,
            gameId: input.gameId
          }
        }
      });

      if (!userGame) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User game not found'
        });
      }

      return userGame;
    }),

  buyPosition: procedure
    .input(z.object({
      userGameId: z.string(),
      team: z.string(),
      buyAmount: z.number(),
      buyPrice: z.number()
    }))
    .mutation(async ({ input, ctx }) => {
      return await ctx.prisma.userGamePosition.create({
        data: {
          userGameId: input.userGameId,
          team: input.team,
          buyAmount: input.buyAmount,
          buyPrice: input.buyPrice,
          buyTime: new Date()
        }
      });
    }),

  sellPosition: procedure
    .input(z.object({
      positionId: z.string(),
      sellAmount: z.number(),
      sellPrice: z.number()
    }))
    .mutation(async ({ input, ctx }) => {
      return await ctx.prisma.userGamePosition.update({
        where: { id: input.positionId },
        data: {
          sellAmount: input.sellAmount,
          sellPrice: input.sellPrice,
          sellTime: new Date()
        }
      });
    }),

  getPositions: procedure
    .input(z.object({
      userGameId: z.string()
    }))
    .query(async ({ input, ctx }) => {
      return await ctx.prisma.userGamePosition.findMany({
        where: {
          userGameId: input.userGameId
        },
        orderBy: {
          buyTime: 'asc'
        }
      });
    })
});
