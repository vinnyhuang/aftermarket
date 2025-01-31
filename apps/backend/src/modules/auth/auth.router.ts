import { noAuthProcedure, router } from '../../server/trpc';
import { signInCredentialsSchema, userCredentialsSchema } from './auth.dtos';
import { signIn, signUp } from './auth.service';

export const authRouter = router({
  signUp: noAuthProcedure
    .input(userCredentialsSchema)
    .mutation(async ({ input, ctx }) => signUp(input, ctx)),

  signIn: noAuthProcedure
    .input(signInCredentialsSchema)
    .mutation(async ({ input, ctx }) => signIn(input, ctx)),
});
