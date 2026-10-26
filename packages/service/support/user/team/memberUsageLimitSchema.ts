import { defineIndex, connectionMongo, getMongoModel } from '../../../common/mongo';
const { Schema } = connectionMongo;
import { MemberUsageLimitCollectionName } from '@fastgpt/global/support/user/team/constant';
import { TeamMemberCollectionName } from '@fastgpt/global/support/user/team/constant';
import type { MemberUsageLimitSchema as MemberUsageLimitDocType } from '@fastgpt/global/support/user/team/type';

const MemberUsageLimitSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: TeamMemberCollectionName,
    required: true
  },
  tmbId: {
    type: Schema.Types.ObjectId,
    ref: TeamMemberCollectionName,
    required: true
  },
  mode: {
    type: String,
    enum: ['total', 'monthly'],
    default: 'total'
  },
  // null = unlimited, 0 = blocked, > 0 = the spending cap.
  totalLimit: {
    type: Number,
    default: null
  },
  monthlyLimit: {
    type: Number,
    default: null
  },
  dailyLimit: {
    type: Number,
    default: null
  },
  enabled: {
    type: Number,
    default: 1
  },
  createTime: {
    type: Date,
    default: () => new Date()
  },
  updateTime: {
    type: Date,
    default: () => new Date()
  }
});

defineIndex(MemberUsageLimitSchema, { key: { teamId: 1, tmbId: 1 }, options: { unique: true } });
defineIndex(MemberUsageLimitSchema, { key: { teamId: 1 } });

export const MongoMemberUsageLimit = getMongoModel<MemberUsageLimitDocType>(
  MemberUsageLimitCollectionName,
  MemberUsageLimitSchema
);