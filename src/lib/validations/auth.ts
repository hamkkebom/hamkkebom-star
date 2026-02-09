import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요."),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다."),
});

export const signupSchema = z
  .object({
    name: z.string().min(2, "한문이름은 2자 이상이어야 합니다."),
    chineseName: z.string().min(2, "한글이름은 2자 이상이어야 합니다."),
    email: z.string().email("올바른 이메일을 입력해주세요."),
    phone: z.string().optional(),
    password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다."),
    confirmPassword: z.string().min(6, "비밀번호 확인을 입력해주세요."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "비밀번호가 일치하지 않습니다.",
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요."),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다."),
    confirmPassword: z.string().min(6, "비밀번호 확인을 입력해주세요."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "비밀번호가 일치하지 않습니다.",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
