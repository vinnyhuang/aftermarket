import { z } from 'zod';

export const signInCredentialsSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
    })
    .email(),
  password: z.string()
});

export const userCredentialsSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
    })
    .email(),
  password: z.string(),
  username: z.string(),
  name: z.string(),
  referralType: z.string(),
  referralName: z.string()
});

export type SignInDto = z.TypeOf<typeof signInCredentialsSchema>;
export type SignUpDto = z.TypeOf<typeof userCredentialsSchema>;
