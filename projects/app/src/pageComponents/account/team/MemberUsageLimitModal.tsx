import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Input,
  ModalBody,
  ModalFooter,
  Switch,
  VStack
} from '@chakra-ui/react';
import MyModal from '@fastgpt/web/components/common/MyModal';
import MySelect from '@fastgpt/web/components/common/MySelect';
import MyTooltip from '@fastgpt/web/components/common/MyTooltip';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { useRequest } from '@fastgpt/web/hooks/useRequest';
import { useToast } from '@fastgpt/web/hooks/useToast';
import { useClientTranslation } from '@fastgpt/web/i18n/useClientTranslation';
import { useState } from 'react';
import { setMemberUsageLimit } from '@/web/support/user/team/api';
import type { MemberUsageLimitItemType } from '@fastgpt/global/support/user/team/type';
import { MemberUsageLimitModeEnum } from '@fastgpt/global/support/user/team/type';

type Props = {
  member: MemberUsageLimitItemType;
  onClose: () => void;
  onSuccess: () => void;
};

/** null = unlimited, 0 = blocked, > 0 = the spending cap. */
type LimitState = { unlimited: boolean; value: string };

const toLimitState = (value: number | null | undefined): LimitState =>
  value === null || value === undefined ? { unlimited: true, value: '' } : { unlimited: false, value: String(value) };

const toApiValue = (state: LimitState) => (state.unlimited ? null : Number(state.value || 0));

const LimitField = ({
  label,
  placeholder,
  unlimitedLabel,
  tipLabel,
  state,
  onChange
}: {
  label: string;
  placeholder: string;
  unlimitedLabel: string;
  tipLabel: string;
  state: LimitState;
  onChange: (state: LimitState) => void;
}) => (
  <FormControl>
    <Flex align="center" justify="space-between" gap={2}>
      <FormLabel mb={0}>{label}</FormLabel>
      <HStack spacing={2}>
        <Box fontSize={'sm'} color={'myGray.500'}>
          {unlimitedLabel}
        </Box>
        <Switch
          isChecked={state.unlimited}
          onChange={(e) => onChange({ ...state, unlimited: e.target.checked })}
        />
        <MyTooltip label={tipLabel}>
          <MyIcon name={'help'} w={'16px'} color={'myGray.400'} />
        </MyTooltip>
      </HStack>
    </Flex>
    {!state.unlimited && (
      <Input
        mt={2}
        type="number"
        min={0}
        placeholder={placeholder}
        value={state.value}
        onChange={(e) => onChange({ ...state, value: e.target.value })}
      />
    )}
  </FormControl>
);

const MemberUsageLimitModal = ({ member, onClose, onSuccess }: Props) => {
  const { t } = useClientTranslation('account_team');
  const { toast } = useToast();

  const [enabled, setEnabled] = useState(member.enabled);
  const [mode, setMode] = useState<string>(member.mode || MemberUsageLimitModeEnum.total);
  const [total, setTotal] = useState<LimitState>(toLimitState(member.totalLimit));
  const [monthly, setMonthly] = useState<LimitState>(toLimitState(member.monthlyLimit));
  const [daily, setDaily] = useState<LimitState>(toLimitState(member.dailyLimit));

  const save = useRequest(
    () =>
      setMemberUsageLimit({
        tmbId: member.tmbId,
        mode: mode as MemberUsageLimitModeEnum,
        totalLimit: toApiValue(total),
        monthlyLimit: toApiValue(monthly),
        dailyLimit: toApiValue(daily),
        enabled
      }),
    {
      onSuccess() {
        toast({ status: 'success', title: t('common:Success') });
        onSuccess();
        onClose();
      },
      errorToast: t('common:save_failed')
    }
  );

  const onSave = () => {
    // An empty value must not silently fall back to 0, which blocks the member entirely.
    const activeFields = mode === MemberUsageLimitModeEnum.total ? [total] : [monthly, daily];
    if (enabled && activeFields.some((item) => !item.unlimited && !item.value.trim())) {
      toast({ status: 'warning', title: t('account_team:usage_limit_value_required') });
      return;
    }
    return save.runAsync();
  };

  const modeOptions = [
    { label: t('account_team:usage_limit_total_mode'), value: MemberUsageLimitModeEnum.total },
    { label: t('account_team:usage_limit_monthly_mode'), value: MemberUsageLimitModeEnum.monthly }
  ];

  return (
    <MyModal
      title={`${t('account_team:usage_limit_set')} - ${member.memberName}`}
      onClose={onClose}
      w={'500px'}
    >
      <ModalBody>
        <VStack spacing={4} align="stretch">
          <Flex align="center" justify="space-between">
            <Box>{t('account_team:usage_limit_enable')}</Box>
            <Switch isChecked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          </Flex>

          <FormControl>
            <FormLabel>{t('account_team:usage_limit_mode')}</FormLabel>
            <MySelect list={modeOptions} value={mode} onChange={setMode} />
          </FormControl>

          {mode === MemberUsageLimitModeEnum.total ? (
            <LimitField
              label={t('account_team:usage_limit_total')}
              placeholder={t('account_team:usage_limit_total_placeholder')}
              unlimitedLabel={t('account_team:usage_limit_unlimited')}
              tipLabel={t('account_team:usage_limit_value_tip')}
              state={total}
              onChange={setTotal}
            />
          ) : (
            <>
              <LimitField
                label={t('account_team:usage_limit_monthly')}
                placeholder={t('account_team:usage_limit_monthly_placeholder')}
                unlimitedLabel={t('account_team:usage_limit_unlimited')}
                tipLabel={t('account_team:usage_limit_value_tip')}
                state={monthly}
                onChange={setMonthly}
              />
              <LimitField
                label={t('account_team:usage_limit_daily')}
                placeholder={t('account_team:usage_limit_daily_placeholder')}
                unlimitedLabel={t('account_team:usage_limit_unlimited')}
                tipLabel={t('account_team:usage_limit_value_tip')}
                state={daily}
                onChange={setDaily}
              />
            </>
          )}

          <Box fontSize="sm" color="myGray.500" bg="myGray.50" p={3} borderRadius="md">
            <Box fontWeight="bold" mb={1}>
              {t('account_team:usage_limit_current_usage')}
            </Box>
            <Box>
              {t('account_team:usage_limit_total')}: {member.usage.total}
            </Box>
            <Box>
              {t('account_team:usage_limit_monthly')}: {member.usage.monthly}
            </Box>
            <Box>
              {t('account_team:usage_limit_daily')}: {member.usage.daily}
            </Box>
          </Box>
        </VStack>
      </ModalBody>
      <ModalFooter>
        <HStack>
          <Button variant="whiteBase" onClick={onClose}>
            {t('common:Close')}
          </Button>
          <Button isLoading={save.loading} onClick={onSave}>
            {t('common:Save')}
          </Button>
        </HStack>
      </ModalFooter>
    </MyModal>
  );
};

export default MemberUsageLimitModal;