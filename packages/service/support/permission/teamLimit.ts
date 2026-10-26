import { getTeamPlanStatus, getTeamStandPlan, teamPoint } from '../../support/wallet/sub/utils';
import { MongoApp } from '../../core/app/schema';
import { MongoDataset } from '../../core/dataset/schema';
import { DatasetTypeEnum } from '@fastgpt/global/core/dataset/constants';
import { TeamErrEnum } from '@fastgpt/global/common/error/code/team';
import { SystemErrEnum } from '@fastgpt/global/common/error/code/system';
import { AppTypeEnum, ToolTypeList, AppFolderTypeList } from '@fastgpt/global/core/app/constants';
import { MongoTeamMember } from '../user/team/teamMemberSchema';
import { MongoMemberUsageLimit } from '../user/team/memberUsageLimitSchema';
import { MongoUsage } from '../wallet/usage/schema';
import { TeamMemberStatusEnum } from '@fastgpt/global/support/user/team/constant';
import { getVectorCountByTeamId } from '../../common/vectorDB/controller';
import { serviceEnv } from '../../env';
import { Types } from 'mongoose';

export const checkTeamAIPoints = async (teamId: string) => {
  if (!global.subPlans?.standard) return;

  const { totalPoints, usedPoints } = await teamPoint.getTeamPoints({ teamId });

  if (usedPoints !== null && totalPoints !== null && usedPoints >= totalPoints) {
    return Promise.reject(TeamErrEnum.aiPointsNotEnough);
  }

  return {
    totalPoints,
    usedPoints
  };
};

type UsageStats = {
  total: number;
  monthly: number;
  daily: number;
};

const getMemberUsageStats = async (tmbId: string): Promise<UsageStats> => {
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

export const checkMemberUsageLimit = async ({
  teamId,
  tmbId
}: {
  teamId: string;
  tmbId: string;
}) => {
  const limit = await MongoMemberUsageLimit.findOne({ teamId, tmbId });

  if (!limit || !limit.enabled) return;

  const usage = await getMemberUsageStats(tmbId);

  const exceedMessage = (label: string, used: number, max: number) =>
    new Error(
      `您已达到成员${label}用量限额（${used}/${max}），如需继续使用请联系管理员`
    );

  /**
   * null 为无限额，不校验；0 表示禁用，任何用量都已超出；正数为额度上限。
   */
  const isExceeded = (used: number, max?: number | null) => max !== undefined && max !== null && used >= max;

  if (limit.mode === 'total') {
    if (isExceeded(usage.total, limit.totalLimit)) {
      return Promise.reject(exceedMessage('', usage.total, limit.totalLimit ?? 0));
    }
  } else {
    if (isExceeded(usage.monthly, limit.monthlyLimit)) {
      return Promise.reject(exceedMessage('月度', usage.monthly, limit.monthlyLimit ?? 0));
    }
    if (isExceeded(usage.daily, limit.dailyLimit)) {
      return Promise.reject(exceedMessage('今日', usage.daily, limit.dailyLimit ?? 0));
    }
  }
};

export const getMemberUsageLimitInfo = async ({
  teamId,
  tmbId
}: {
  teamId: string;
  tmbId: string;
}) => {
  const limit = await MongoMemberUsageLimit.findOne({ teamId, tmbId });
  if (!limit || !limit.enabled) return;

  const usage = await getMemberUsageStats(tmbId);

  return {
    mode: limit.mode,
    totalLimit: limit.totalLimit ?? null,
    monthlyLimit: limit.monthlyLimit ?? null,
    dailyLimit: limit.dailyLimit ?? null,
    usage
  };
};

export const checkTeamMemberLimit = async (teamId: string, newCount: number) => {
  const [{ standard }, memberCount] = await Promise.all([
    getTeamStandPlan({
      teamId
    }),
    MongoTeamMember.countDocuments({
      teamId,
      status: { $ne: TeamMemberStatusEnum.leave }
    })
  ]);

  if (standard?.maxTeamMember && newCount + memberCount > standard.maxTeamMember) {
    return Promise.reject(TeamErrEnum.teamOverSize);
  }
};

export const checkTeamDatasetFolderLimit = async ({
  teamId,
  amount = 1
}: {
  teamId: string;
  amount?: number;
}) => {
  const folderCount = await MongoDataset.countDocuments({
    teamId,
    type: DatasetTypeEnum.folder
  });
  if (folderCount + amount > serviceEnv.DATASET_FOLDER_MAX_AMOUNT) {
    return Promise.reject(TeamErrEnum.datasetFolderAmountNotEnough);
  }
};

export const checkTeamAppTypeLimit = async ({
  teamId,
  appCheckType,
  amount = 1
}: {
  teamId: string;
  appCheckType: 'app' | 'tool' | 'folder';
  amount?: number;
}) => {
  if (appCheckType === 'app') {
    const [{ standard }, appCount] = await Promise.all([
      getTeamStandPlan({ teamId }),
      MongoApp.countDocuments({
        teamId,
        type: {
          $in: [AppTypeEnum.chatAgent, AppTypeEnum.simple, AppTypeEnum.workflow]
        }
      })
    ]);

    if (standard?.maxAppAmount && appCount + amount > standard.maxAppAmount) {
      return Promise.reject(TeamErrEnum.appAmountNotEnough);
    }

    // System check
    if (global?.licenseData?.maxApps && typeof global?.licenseData?.maxApps === 'number') {
      const totalApps = await MongoApp.countDocuments({
        type: {
          $in: [AppTypeEnum.simple, AppTypeEnum.workflow]
        }
      });
      if (totalApps > global.licenseData.maxApps) {
        return Promise.reject(SystemErrEnum.licenseAppAmountLimit);
      }
    }
  } else if (appCheckType === 'tool') {
    const toolCount = await MongoApp.countDocuments({
      teamId,
      type: {
        $in: ToolTypeList
      }
    });
    const maxToolAmount = 1000;
    if (toolCount + amount > maxToolAmount) {
      return Promise.reject(TeamErrEnum.pluginAmountNotEnough);
    }
  } else if (appCheckType === 'folder') {
    const folderCount = await MongoApp.countDocuments({
      teamId,
      type: {
        $in: AppFolderTypeList
      }
    });
    const maxAppFolderAmount = serviceEnv.APP_FOLDER_MAX_AMOUNT;
    if (folderCount + amount > maxAppFolderAmount) {
      return Promise.reject(TeamErrEnum.appFolderAmountNotEnough);
    }
  }
};

export const checkDatasetIndexLimit = async ({
  teamId,
  insertLen = 0
}: {
  teamId: string;
  insertLen?: number;
}) => {
  const [{ standard, totalPoints, usedPoints, datasetMaxSize }, usedDatasetIndexSize] =
    await Promise.all([getTeamPlanStatus({ teamId }), getVectorCountByTeamId(teamId)]);

  if (!standard) return;

  if (datasetMaxSize !== null && usedDatasetIndexSize + insertLen >= datasetMaxSize) {
    return Promise.reject(TeamErrEnum.datasetSizeNotEnough);
  }

  if (usedPoints !== null && totalPoints !== null && usedPoints >= totalPoints) {
    return Promise.reject(TeamErrEnum.aiPointsNotEnough);
  }
  return;
};

export const checkTeamDatasetLimit = async (teamId: string) => {
  const [{ standard }, datasetCount] = await Promise.all([
    getTeamStandPlan({ teamId }),
    MongoDataset.countDocuments({
      teamId,
      type: { $ne: DatasetTypeEnum.folder }
    })
  ]);

  // User check
  if (standard?.maxDatasetAmount && datasetCount >= standard.maxDatasetAmount) {
    return Promise.reject(TeamErrEnum.datasetAmountNotEnough);
  }

  // System check
  if (global?.licenseData?.maxDatasets && typeof global?.licenseData?.maxDatasets === 'number') {
    const totalDatasets = await MongoDataset.countDocuments({
      type: { $ne: DatasetTypeEnum.folder }
    });
    if (totalDatasets >= global.licenseData.maxDatasets) {
      return Promise.reject(SystemErrEnum.licenseDatasetAmountLimit);
    }
  }
};

export const checkTeamDatasetSyncPermission = async (teamId: string) => {
  const { standard } = await getTeamStandPlan({
    teamId
  });

  if (standard && !standard?.websiteSyncPerDataset) {
    return Promise.reject(TeamErrEnum.websiteSyncNotEnough);
  }
};

export const checkTeamSandboxPermission = async (teamId: string) => {
  if (!global.subPlans?.standard) return;

  const { standard } = await getTeamStandPlan({
    teamId
  });

  if (standard && !standard?.enableSandbox) {
    return Promise.reject(TeamErrEnum.sandboxNotSupport);
  }
};
