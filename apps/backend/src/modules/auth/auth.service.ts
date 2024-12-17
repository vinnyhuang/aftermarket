import { User } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { SignInDto, SignUpDto } from './auth.dtos';
import { sign } from 'jsonwebtoken';
import { authConfig } from '../../configs/auth.config';
import { hash, compare } from 'bcryptjs';
import { Context } from '../../server/context';

type UserResponse = Omit<User, 'password'>;
type SignUpResult = UserResponse & { accessToken: string };

export const signUp = async (
  input: SignUpDto,
  ctx: Context
): Promise<UserResponse> => {
  const bcryptHash = await hash(input.password, 10);

  const user = await ctx.prisma.user.create({
    data: {
      email: input.email,
      password: bcryptHash,
      role: 'user',
      username: input.username,
      name: input.name,
      referralType: input.referralType,
      referralName: input.referralName
    },
  });
  
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    role: user.role,
    username: user.username,
    name: user.name,
    referralType: user.referralType,
    referralName: user.referralName
  };
};

export const signIn = async (
  input: SignInDto,
  ctx: Context
): Promise<SignUpResult> => {
  const user = await ctx.prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  const error = new TRPCError({
    message: 'Incorrect email or password',
    code: 'UNAUTHORIZED',
  });

  if (!user) {
    throw error;
  }

  const result = await compare(input.password, user.password);

  if (!result) {
    throw error;
  }

  const token = sign(
    {
      id: user.id,
      role: user.role,
    },
    authConfig.secretKey,
    { expiresIn: authConfig.jwtExpiresIn }
  );

  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    role: user.role,
    username: user.username,
    name: user.name,
    referralType: user.referralType,
    referralName: user.referralName,
    accessToken: token,
  };
};
