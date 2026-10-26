import type { ApiRequestProps, ApiResponseType } from '@fastgpt/next/type';
import { NextAPI } from '@/service/middleware/entry';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { ManagePermissionVal } from '@fastgpt/global/support/permission/constant';
import { MongoMemberUsageLimit } from '@fastgpt/service/support/user/team/memberUsageLimitSchema';
import { MemberUsageLimitBodySchema } from '@fastgpt/global/support/user/team/api';
import { jsonRes } from '@fastgpt/service/common/response';

async function handler(req: ApiRequestProps, res: ApiResponseType<any>) {
  const body = MemberUsageLimitBodySchema.parse(req.body);
  const { teamId } = await authUserPer({ req, authToken: true, per: ManagePermissionVal });

  // null = unlimited, 0 = blocked, > 0 = the spending cap.
  const { tmbId, mode, totalLimit = null, monthlyLimit = null, dailyLimit = null, enabled } = body;

  await MongoMemberUsageLimit.updateOne(
    { teamId, tmbId },
    {
      $set: {
        teamId,
        tmbId,
        mode,
        totalLimit,
        monthlyLimit,
        dailyLimit,
        enabled: enabled ? 1 : 0,
        updateTime: new Date()
      }
    },
    { upsert: true }
  );

  return jsonRes(res, { data: { success: true } });
}

export default NextAPI(handler);