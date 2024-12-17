import { authRouter } from '../modules/auth/auth.router';
import { adminRouter } from '../modules/admin/admin.router';
import { usersRouter } from '../modules/users/users.router';
import { gameRouter } from '../modules/game/game.router';
import { router } from './trpc';

export const appRouter = router({
  auth: authRouter,
  admin: adminRouter,
  users: usersRouter,
  game: gameRouter
});

export type AppRouter = typeof appRouter;
