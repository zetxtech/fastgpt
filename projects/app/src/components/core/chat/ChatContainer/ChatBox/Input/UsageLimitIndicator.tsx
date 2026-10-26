import { Box, Flex } from '@chakra-ui/react';
import MyIcon from '@fastgpt/web/components/common/Icon';
import MyTooltip from '@fastgpt/web/components/common/MyTooltip';
import { useClientTranslation } from '@fastgpt/web/i18n/useClientTranslation';
import { getMemberUsageLimitSummary } from '@fastgpt/global/support/user/team/utils';
import UsageLimitTooltipContent from '@/components/support/user/team/UsageLimitTooltipContent';
import { useUserStore } from '@/web/support/user/useUserStore';
import { useSelfUsageLimit } from '@/web/support/user/team/useSelfUsageLimit';

/**
 * Chat input usage indicator: icon + remaining points, with details on hover.
 */
const UsageLimitIndicator = () => {
  const { t } = useClientTranslation('account_team');
  const { userInfo } = useUserStore();
  const { data } = useSelfUsageLimit();

  if (!userInfo || !data) return null;

  const { remaining, rate, unlimited, blocked } = getMemberUsageLimitSummary(data);
  const remainingText = unlimited
    ? t('common:Unlimited')
    : blocked
      ? t('account_team:usage_limit_blocked')
      : String(remaining);
  const danger = blocked || rate >= 80;

  return (
    <MyTooltip placement={'top'} label={<UsageLimitTooltipContent data={data} />}>
      <Flex
        alignItems={'center'}
        gap={1}
        h={9}
        px={2}
        borderRadius={'sm'}
        cursor={'default'}
        color={danger ? 'red.500' : 'myGray.500'}
      >
        <MyIcon name={'support/usage/usageRecordLight'} w={'16px'} h={'16px'} />
        <Box fontSize={'sm'} whiteSpace={'nowrap'}>
          {remainingText}
        </Box>
      </Flex>
    </MyTooltip>
  );
};

export default UsageLimitIndicator;