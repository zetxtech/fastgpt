import type { ApiRequestProps, ApiResponseType } from '@fastgpt/next/type';
import { NextAPI } from '@/service/middleware/entry';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { ManagePermissionVal } from '@fastgpt/global/support/permission/constant';
import { MongoMemberUsageLimit } from '@fastgpt/service/support/user/team/memberUsageLimitSchema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { MongoUsage } from '@fastgpt/service/support/wallet/usage/schema';
import { TeamMemberStatusEnum } from '@fastgpt/global/support/user/team/constant';
import type { MemberUsageLimitItemType } from '@fastgpt/global/support/user/team/type';
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
  const { teamId } = await authUserPer({ req, authToken: true, per: ManagePermissionVal });
  const searchKey = (req.query?.searchKey as string) || '';

  const members = await MongoTeamMember.find({
    teamId,
    status: { $ne: TeamMemberStatusEnum.leave }
  }).lean();

  const limits = await MongoMemberUsageLimit.find({ teamId }).lean();

  const limitMap = new Map(limits.map((l) => [String(l.tmbId), l]));

  const items: MemberUsageLimitItemType[] = await Promise.all(
    members.map(async (member) => {
      const tmbId = String(member._id);
      const limit = limitMap.get(tmbId);
      const usage = await getUsageStats(tmbId);

      return {
        tmbId,
        memberName: member.name,
        avatar: member.avatar,
        mode: (limit?.mode as MemberUsageLimitModeEnum) || MemberUsageLimitModeEnum.total,
        totalLimit: limit?.totalLimit ?? null,
        monthlyLimit: limit?.monthlyLimit ?? null,
        dailyLimit: limit?.dailyLimit ?? null,
        enabled: !!limit?.enabled,
        usage
      };
    })
  );

  const filtered = searchKey
    ? items.filter(
        (item) => item.memberName?.toLowerCase().includes(searchKey.toLowerCase())
      )
    : items;

  return jsonRes(res, { data: filtered });
}

export default NextAPI(handler);