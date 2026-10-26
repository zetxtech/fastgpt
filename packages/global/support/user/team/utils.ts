import { MemberUsageLimitModeEnum, type MemberUsageLimitSelfType } from './type';

export type MemberUsageLimitSummary = {
  /** Consumed points under the active mode. */
  current: number;
  /** Configured cap: null = unlimited, 0 = blocked, > 0 = the cap. */
  limit: number | null;
  /** Points still available: null = unlimited, 0 = blocked. */
  remaining: number | null;
  /** Consumed percentage, 0-100. */
  rate: number;
  unlimited: boolean;
  /** True when the cap is 0, meaning the member is not allowed to use at all. */
  blocked: boolean;
};

export type UsageLimitDimension = 'total' | 'monthly' | 'daily';

const LIMIT_KEY: Record<UsageLimitDimension, 'totalLimit' | 'monthlyLimit' | 'dailyLimit'> = {
  total: 'totalLimit',
  monthly: 'monthlyLimit',
  daily: 'dailyLimit'
};

/** Summary of one dimension. `monthly` mode tracks both the monthly and the daily cap. */
export const getUsageLimitSummary = (
  data: Pick<MemberUsageLimitSelfType, 'totalLimit' | 'monthlyLimit' | 'dailyLimit' | 'usage'>,
  dimension: UsageLimitDimension
): MemberUsageLimitSummary => {
  const current = data.usage[dimension];
  const limit = data[LIMIT_KEY[dimension]] ?? null;

  if (limit === null) {
    return { current, limit: null, remaining: null, rate: 0, unlimited: true, blocked: false };
  }

  return {
    current,
    limit,
    remaining: Math.max(0, limit - current),
    rate: limit > 0 ? Math.min(100, (current / limit) * 100) : 100,
    unlimited: false,
    blocked: limit === 0
  };
};

/** Summary of the dimension selected by the member's mode. */
export const getMemberUsageLimitSummary = (
  data: Pick<MemberUsageLimitSelfType, 'mode' | 'totalLimit' | 'monthlyLimit' | 'dailyLimit' | 'usage'>
): MemberUsageLimitSummary =>
  getUsageLimitSummary(
    data,
    data.mode === MemberUsageLimitModeEnum.total ? 'total' : 'monthly'
  );