import type React from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import type { PriceType } from '@fastgpt/global/core/ai/model.schema';
import { getRuntimeResolvedPriceTiers } from '@fastgpt/global/core/ai/pricing';
import MyTooltip from '@fastgpt/web/components/common/MyTooltip';
import { useSystem } from '@fastgpt/web/hooks/useSystem';
import { PriceDetail } from './PriceTiersLabel';

const summarizeTierPrice = (
  tiers: ReturnType<typeof getRuntimeResolvedPriceTiers>,
  key: 'inputPrice' | 'outputPrice'
) => {
  const prices = tiers.map((tier) => tier[key] ?? 0);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? String(min) : `${min}~${max}`;
};

/** Compact one-line price, rendered under the model name on touch devices. */
export const ModelPriceInline = ({ model, unitLabel }: { model: PriceType; unitLabel: string }) => {
  const { t } = useTranslation();
  const tiers = getRuntimeResolvedPriceTiers(model);
  if (tiers.length === 0) return null;

  return (
    <Flex
      mt={1}
      alignItems={'center'}
      flexWrap={'wrap'}
      columnGap={2}
      rowGap={0.5}
      fontSize={'xs'}
      lineHeight={1.5}
      color={'myGray.500'}
    >
      {/* `b`, not `span`: the selector wrappers force `span { display: block }`, which would
          break each value onto its own line. */}
      <Box whiteSpace={'nowrap'}>
        {t('common:Input')}{' '}
        <Box as={'b'} fontWeight={'semibold'} color={'myGray.700'}>
          {summarizeTierPrice(tiers, 'inputPrice')}
        </Box>
      </Box>
      <Box whiteSpace={'nowrap'}>
        {t('common:Output')}{' '}
        <Box as={'b'} fontWeight={'semibold'} color={'myGray.700'}>
          {summarizeTierPrice(tiers, 'outputPrice')}
        </Box>
      </Box>
      <Box whiteSpace={'nowrap'}>{unitLabel}</Box>
    </Flex>
  );
};

/**
 * Desktop: floats the price panel beside the hovered row, so the option list keeps its width.
 * Touch devices have no hover, so the caller renders `ModelPriceInline` under the model name instead.
 */
const ModelPriceTooltip = ({
  model,
  unitLabel,
  children
}: {
  model: PriceType;
  unitLabel: string;
  children: React.ReactElement;
}) => {
  const { isPc } = useSystem();

  const tiers = getRuntimeResolvedPriceTiers(model);
  if (!isPc || tiers.length === 0) return children;

  return (
    <MyTooltip
      placement={'right-start'}
      offset={[0, 24]}
      // Anchor to the whole row instead of an inline wrapper, so the panel clears the list.
      shouldWrapChildren={false}
      // The option list is a scroll container, so the default flip/preventOverflow modifiers
      // would keep the panel inside the list instead of floating beside it.
      modifiers={[
        { name: 'flip', enabled: false },
        { name: 'preventOverflow', enabled: false }
      ]}
      label={<PriceDetail config={model} unitLabel={unitLabel} />}
    >
      {children}
    </MyTooltip>
  );
};

export default ModelPriceTooltip;
