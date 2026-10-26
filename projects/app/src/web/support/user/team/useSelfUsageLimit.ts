import { useRequest } from '@fastgpt/web/hooks/useRequest';
import { getSelfUsageLimit } from './api';
import { useUserStore } from '@/web/support/user/useUserStore';

/**
 * Current member's usage limit. Only requests when a user is signed in, so share pages
 * (no session) never trigger an auth failure that would clear the token.
 */
export const useSelfUsageLimit = () => {
  const { userInfo } = useUserStore();

  return useRequest(() => getSelfUsageLimit(), {
    manual: false,
    ready: !!userInfo,
    errorToast: '',
    refreshDeps: [userInfo?.team?.tmbId]
  });
};