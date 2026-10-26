import { Box, Flex } from '@chakra-ui/react';
import { useClientTranslation } from '@fastgpt/web/i18n/useClientTranslation';
import {
  getUsageLimitSummary,
  type UsageLimitDimension
} from '@fastgpt/global/support/user/team/utils';
import {
  MemberUsageLimitModeEnum,
  type MemberUsageLimitSelfType
} from '@fastgpt/global/support/user/team/type';

const UsageLimitTooltipContent = ({ data }: { data: MemberUsageLimitSelfType }) => {
  const { t } = useClientTranslation('account_team');

  const isTotalMode = data.mode === MemberUsageLimitModeEnum.total;
  const blocks: { key: UsageLimitDimension; label: string }[] = isTotalMode
    ? [{ key: 'total', label: t('account_team:usage_limit_limit') }]
    : [
        { key: 'monthly', label: t('account_team:usage_limit_monthly') },
        { key: 'daily', label: t('account_team:usage_limit_daily') }
      ];

  return (
    <Flex direction={'column'} gap={2} minW={'208px'}>
      <Flex alignItems={'center'} justifyContent={'space-between'} gap={3}>
        <Box fontSize={'12px'} fontWeight={'medium'} color={'myGray.600'}>
          {t('account_team:usage_limit_member_usage')}
        </Box>
        <Box
          px={1.5}
          py={0.5}
          borderRadius={'sm'}
          bg={'myGray.100'}
          color={'myGray.500'}
          fontSize={'11px'}
          flexShrink={0}
        >
          {isTotalMode
            ? t('account_team:usage_limit_mode_tag_total')
            : t('account_team:usage_limit_mode_tag_monthly')}
        </Box>
      </Flex>

      {blocks.map((block, index) => {
        const { current, limit, remaining, rate, unlimited, blocked } = getUsageLimitSummary(
          data,
          block.key
        );
        const limitText = unlimited ? t('common:Unlimited') : String(limit);
        const remainingText = unlimited
          ? t('common:Unlimited')
          : blocked
            ? t('account_team:usage_limit_blocked')
            : String(remaining);

        return (
          <Flex
            key={block.key}
            direction={'column'}
            gap={1}
            {...(index > 0 ? { pt: 2, borderTop: '1px solid', borderColor: 'myGray.100' } : {})}
          >
            <Flex alignItems={'center'} justifyContent={'space-between'} gap={3} fontSize={'12px'}>
              <Box color={'myGray.500'}>{block.label}</Box>
              <Box fontWeight={'semibold'} color={'myGray.800'} whiteSpace={'nowrap'}>
                {limitText}
              </Box>
            </Flex>
            <Flex
              alignItems={'center'}
              justifyContent={'space-between'}
              gap={3}
              fontSize={'12px'}
              color={'myGray.500'}
            >
              <Box whiteSpace={'nowrap'}>
                {t('account_team:usage_limit_current_usage')}{' '}
                <Box as={'b'} color={'myGray.700'}>
                  {current}
                </Box>
              </Box>
              <Box whiteSpace={'nowrap'}>
                {t('account_team:usage_limit_remaining')}{' '}
                <Box
                  as={'b'}
                  color={
                    unlimited ? 'myGray.700' : blocked || rate >= 80 ? 'red.500' : 'primary.600'
                  }
                >
                  {remainingText}
                </Box>
              </Box>
            </Flex>
          </Flex>
        );
      })}
    </Flex>
  );
};

export default UsageLimitTooltipContent;
