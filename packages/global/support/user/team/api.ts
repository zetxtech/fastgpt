import { z } from 'zod';
import { MemberUsageLimitModeEnum } from './type';

export const MemberUsageLimitBodySchema = z.object({
  tmbId: z.string(),
  mode: z.enum([MemberUsageLimitModeEnum.total, MemberUsageLimitModeEnum.monthly]),
  totalLimit: z.number().int().min(0).nullable().optional(),
  monthlyLimit: z.number().int().min(0).nullable().optional(),
  dailyLimit: z.number().int().min(0).nullable().optional(),
  enabled: z.boolean()
});

export const MemberUsageLimitListQuerySchema = z.object({
  searchKey: z.string().optional()
});

export type MemberUsageLimitListQuery = z.infer<typeof MemberUsageLimitListQuerySchema>;