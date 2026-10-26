import type { ApiRequestProps, ApiResponseType } from '@fastgpt/next/type';
import { NextAPI } from '@/service/middleware/entry';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { MongoMemberUsageLimit } from '@fastgpt/service/support/user/team/memberUsageLimitSchema';
import { MongoUsage } from '@fastgpt/service/support/wallet/usage/schema';
import { MemberUsageLimitModeEnum } from '@fastgpt/global/support/user/team/type';
import { jsonRes } from '@fastgpt/service/common/response';
import { Types } from 'mongoose';

const getUsageStats = async (tmbId: string) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tmbObjectId = new Types.ObjectId(tmbId);

  const sumPoints = async (match: Record<string, any>) => {
    const result = await MongoUsage.aggregate([
      { $match: { ...match, tmbId: tmbObjectId } },
      { $group: { _id: null, total: { $sum: '$totalPoints' } } }
    ]);
    return result[0]?.total || 0;
  };

  const [total, monthly, daily] = await Promise.all([
    sumPoints({ totalPoints: { $gt: 0 } }),
    sumPoints({ time: { $gte: monthStart }, totalPoints: { $gt: 0 } }),
    sumPoints({ time: { $gte: dayStart }, totalPoints: { $gt: 0 } })
  ]);

  return { total, monthly, daily };
};

async function handler(req: ApiRequestProps, res: ApiResponseType<any>) {
  const { teamId, tmbId } = await authCert({ req, authToken: true });

  const limit = await MongoMemberUsageLimit.findOne({ teamId, tmbId });
  // Usage is always returned so the client can show consumed points even when no limit is set.
  const usage = await getUsageStats(tmbId);

  return jsonRes(res, {
    data: {
      enabled: !!(limit && limit.enabled),
      mode: limit?.mode || MemberUsageLimitModeEnum.total,
      totalLimit: limit?.totalLimit ?? null,
      monthlyLimit: limit?.monthlyLimit ?? null,
      dailyLimit: limit?.dailyLimit ?? null,
      usage
    }
  });
}

export default NextAPI(handler);