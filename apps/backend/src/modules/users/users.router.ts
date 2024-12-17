import { z } from 'zod';
import { adminProcedure, procedure, router, noAuthProcedure } from '../../server/trpc';
import { TRPCError } from '@trpc/server';
import { compare, hash } from 'bcryptjs';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export const usersRouter = router({
  createUser: noAuthProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      username: z.string().min(3),
      name: z.string().min(2),
      referralType: z.string(),
      referralName: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const hashedPassword = await hash(input.password, 10);
        
        const user = await ctx.prisma.user.create({
          data: {
            ...input,
            password: hashedPassword,
            role: 'user'
          },
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            referralType: true,
            referralName: true
          }
        });

        return user;
      } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Email or username already exists'
          });
        }
        throw error;
      }
    }),

  getCurrentUser: procedure
    .query(async ({ ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user?.id },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          referralType: true,
          referralName: true
        }
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      return user;
    }),

  updateProfile: procedure
    .input(z.object({
      username: z.string().optional(),
      name: z.string().optional(),
      email: z.string().email().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const updatedUser = await ctx.prisma.user.update({
          where: { id: ctx.user?.id },
          data: input,
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            referralType: true,
            referralName: true
          }
        });

        return updatedUser;
      } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Email or username already exists'
          });
        }
        throw error;
      }
    }),

  changePassword: procedure
    .input(z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8)
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user?.id }
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }

      const isValid = await compare(input.currentPassword, user.password);
      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Current password is incorrect'
        });
      }

      const hashedPassword = await hash(input.newPassword, 10);
      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });

      return { success: true };
    }),

  getAllUsers: adminProcedure
    .query(async ({ ctx }) => {
      const users = await ctx.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          referralType: true,
          referralName: true
        }
      });

      return users;
    }),

  updateUserRole: adminProcedure
    .input(z.object({
      userId: z.string(),
      role: z.enum(['user', 'admin'])
    }))
    .mutation(async ({ input, ctx }) => {
      const updatedUser = await ctx.prisma.user.update({
        where: { id: input.userId },
        data: { role: input.role },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          referralType: true,
          referralName: true
        }
      });

      return updatedUser;
    })
});
