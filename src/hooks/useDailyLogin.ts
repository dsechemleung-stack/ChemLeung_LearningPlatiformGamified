import { useCallback, useState } from 'react';
import { callChemCityGetDailyLoginBonus } from '../lib/chemcity/cloudFunctions';

interface DailyLoginState {
  diamonds: number;
  coins: number;
  streak: number;
  showModal: boolean;
  checked: boolean;
}

export function useDailyLogin() {
  const [state, setState] = useState<DailyLoginState>({
    diamonds: 0,
    coins: 0,
    streak: 0,
    showModal: false,
    checked: false,
  });

  const checkDailyLogin = useCallback(async () => {
    if (state.checked) return;

    try {
      const result = await callChemCityGetDailyLoginBonus();
      const alreadyClaimed = Boolean((result as any)?.alreadyClaimed);
      if (alreadyClaimed) {
        setState((s) => ({ ...s, checked: true }));
        return;
      }

      setState({
        diamonds: Number((result as any)?.diamonds || 0),
        coins: Number((result as any)?.coins || 0),
        streak: Number((result as any)?.streak || 0),
        showModal: true,
        checked: true,
      });
    } catch {
      setState((s) => ({ ...s, checked: true }));
    }
  }, [state.checked]);

  const dismissDailyLogin = useCallback(() => {
    setState((s) => ({ ...s, showModal: false }));
  }, []);

  return {
    dailyLoginState: state,
    checkDailyLogin,
    dismissDailyLogin,
  };
}
