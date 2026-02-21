import { z } from "zod";

export const gradeFormSchema = z.object({
  name: z.string().trim().min(1, "등급 이름을 입력해주세요."),
  baseRate: z.number().positive("단가는 0보다 커야 합니다."),
  color: z.string().min(1, "색상을 선택해주세요."),
});

export const createGradeSchema = gradeFormSchema.extend({
  sortOrder: z.number().int().optional(),
});

export const updateGradeSchema = gradeFormSchema.partial();

export const reorderGradesSchema = z.array(
  z.object({
    id: z.string().min(1, "등급 ID는 필수입니다."),
    sortOrder: z.number().int("순서는 정수여야 합니다."),
  })
);

export const assignGradeSchema = z.object({
  gradeId: z.string().nullable(),
});

export type GradeFormInput = z.infer<typeof gradeFormSchema>;
export type CreateGradeInput = z.infer<typeof createGradeSchema>;
export type UpdateGradeInput = z.infer<typeof updateGradeSchema>;
export type ReorderGradesInput = z.infer<typeof reorderGradesSchema>;
export type AssignGradeInput = z.infer<typeof assignGradeSchema>;
