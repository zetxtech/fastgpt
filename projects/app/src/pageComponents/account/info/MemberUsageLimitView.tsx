import { Box, Flex, Grid } from '@chakra-ui/react';
import QuestionTip from '@fastgpt/web/components/common/MyTooltip/QuestionTip';
import { useRequest } from '@fastgpt/web/hooks/useRequest';
import { useClientTranslation } from '@fastgpt/web/i18n/useClientTranslation';
import { getSelfUsageLimit } from '@/web/support/user/team/api';
import { getUsageLimitSummary, type UsageLimitDimension } from '@fastgpt/global/support/user/team/utils';
import { MemberUsageLimitModeEnum } from '@fastgpt/global/support/user/team/type';

const MemberUsageLimitView = () => {
  const { t } = useClientTranslation('account_team');
  const { data: limitInfo } = useRequest(() => getSelfUsageLimit(), {
    manual: false,
    loadingDelay: 100
  });

  if (!limitInfo) return null;

  const { mode, enabled } = limitInfo;
  const isTotalMode = mode === MemberUsageLimitModeEnum.total;
  // Monthly mode tracks two caps, so each is rendered as its own group.
  const blocks: { key: UsageLimitDimension; label: string }[] = isTotalMode
    ? [{ key: 'total', label: t('account_team:usage_limit_limit') }]
    : [
        { key: 'monthly', label: t('account_team:usage_limit_monthly') },
        { key: 'daily', label: t('account_team:usage_limit_daily') }
      ];

  const statLabelStyles = {
    fontSize: 'xs',
    color: 'myGray.500',
    lineHeight: 1.4
  };

  const statValueStyles = {
    mt: 1,
    fontSize: 'lg',
    fontWeight: 'semibold',
    lineHeight: 1.2
  };

  return (
    <Box
      mt={6}
      px={[4, 5]}
      py={[4, 5]}
      bg={'white'}
      borderWidth={'1px'}
      borderColor={'borderColor.low'}
      borderRadius={'md'}
    >
      <Flex alignItems={'center'} gap={1.5} minW={0}>
        <Box fontSize={'md'} fontWeight={'bold'} color={'myGray.900'} flexShrink={0}>
          {t('account_team:usage_limit_member_usage')}
        </Box>
        <QuestionTip label={t('account_team:usage_limit_self_tip')} />
        <Box
          px={2}
          py={0.5}
          borderRadius={'sm'}
          bg={'primary.50'}
          color={'primary.600'}
          fontSize={'xs'}
          flexShrink={0}
        >
          {isTotalMode
            ? t('account_team:usage_limit_mode_tag_total')
            : t('account_team:usage_limit_mode_tag_monthly')}
        </Box>
        {!enabled && (
          <Box
            px={2}
            py={0.5}
            borderRadius={'sm'}
            bg={'myGray.100'}
            color={'myGray.500'}
            fontSize={'xs'}
            flexShrink={0}
          >
            {t('account_team:usage_limit_not_set')}
          </Box>
        )}
      </Flex>

      {blocks.map((block, index) => {
        const { current, limit, remaining, rate, unlimited, blocked } = getUsageLimitSummary(
          limitInfo,
          block.key
        );
        const limitText = unlimited ? t('common:Unlimited') : String(limit);
        const remainingText = unlimited
          ? t('common:Unlimited')
          : blocked
            ? t('account_team:usage_limit_blocked')
            : String(remaining);
        const barColor =
          blocked || rate >= 80 ? 'red.500' : rate >= 50 ? 'yellow.500' : 'primary.500';

        return (
          <Box
            key={block.key}
            mt={5}
            {...(index > 0 ? { pt: 5, borderTop: '1px solid', borderColor: 'myGray.100' } : {})}
          >
            <Grid templateColumns={'repeat(3, minmax(0, 1fr))'} gap={3}>
              <Box>
                <Box {...statLabelStyles}>{block.label}</Box>
                <Box {...statValueStyles} color={'myGray.900'}>
                  {limitText}
                </Box>
              </Box>
              <Box>
                <Box {...statLabelStyles}>{t('account_team:usage_limit_current_usage')}</Box>
                <Box {...statValueStyles} color={'myGray.900'}>
                  {current}
                </Box>
              </Box>
              <Box>
                <Box {...statLabelStyles}>{t('account_team:usage_limit_remaining')}</Box>
                <Box
                  {...statValueStyles}
                  color={unlimited ? 'myGray.900' : rate >= 80 ? 'red.500' : 'primary.600'}
                >
                  {remainingText}
                </Box>
              </Box>
            </Grid>

            {/* A progress bar without a limit carries no ratio, so it is only rendered when a limit exists. */}
            {!unlimited && (
              <Box mt={3} h={2} w={'100%'} bg={'myGray.150'} borderRadius={'full'} overflow={'hidden'}>
                <Box
                  h={'100%'}
                  w={`${rate}%`}
                  borderRadius={'full'}
                  transition={'width 0.3s'}
                  bg={barColor}
                />
              </Box>
            )}

            {(blocked || rate >= 80) && (
              <Box mt={2} fontSize={'xs'} color={'red.500'} fontWeight={'medium'}>
                {blocked
                  ? t('account_team:usage_limit_blocked_tip')
                  : t('account_team:usage_limit_nearly_reached')}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default MemberUsageLimitView;