import { z } from "zod";

export const signupSchema = z.object({
  username: z.string().min(3).max(10),
  password: z
    .string()
    .min(8, { message: "Must have at least 8 characters" })
    .max(20, { message: "Allowed 20 characters at maximum" })
    .refine((pwd) => /[A-Z]/.test(pwd), { message: "Must have at least 1 uppercase letter" })
    .refine((pwd) => /[a-z]/.test(pwd), { message: "Must have at least 1 lowercase letter" })
    .refine((pwd) => /[0-9]/.test(pwd), { message: "Must have at least 1 number" })
    .refine((pwd) => /[!@#$%^&*]/.test(pwd), { message: "Must have at least 1 special character" }),
});

export const signinSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
