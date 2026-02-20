import { useCallback, useState } from 'react';
import type { QuizRewardRequest, QuizRewardResult } from '../lib/chemcity/types';
import { callChemCityQuizReward } from '../lib/chemcity/cloudFunctions';

export const COINS_PER_CORRECT_ANSWER = 10;
export const BASE_DIAMONDS_PER_QUIZ = 5;

interface State {
  result: QuizRewardResult | null;
  correctAnswers: number;
  totalQuestions: number;
  isAwarding: boolean;
  error: string | null;
}

export function useQuizReward() {
  const [state, setState] = useState<State>({
    result: null,
    correctAnswers: 0,
    totalQuestions: 0,
    isAwarding: false,
    error: null,
  });

  const triggerQuizReward = useCallback(async (params: {
    topicId?: string;
    correctAnswers: number;
    totalQuestions: number;
    baseCoins?: number;
    baseDiamonds?: number;
  }) => {
    setState((s) => ({ ...s, isAwarding: true, error: null, result: null }));

    const request: QuizRewardRequest = {
      baseCoins: params.baseCoins ?? params.correctAnswers * COINS_PER_CORRECT_ANSWER,
      baseDiamonds: params.baseDiamonds ?? BASE_DIAMONDS_PER_QUIZ,
      topicId: params.topicId,
      correctAnswers: params.correctAnswers,
      totalQuestions: params.totalQuestions,
    };

    try {
      const result = await callChemCityQuizReward(request);
      setState({
        result,
        correctAnswers: params.correctAnswers,
        totalQuestions: params.totalQuestions,
        isAwarding: false,
        error: null,
      });
    } catch (err: any) {
      setState((s) => ({
        ...s,
        isAwarding: false,
        error: err?.message ?? 'Failed to award quiz reward',
      }));
    }
  }, []);

  const clearReward = useCallback(() => {
    setState({
      result: null,
      correctAnswers: 0,
      totalQuestions: 0,
      isAwarding: false,
      error: null,
    });
  }, []);

  return {
    triggerQuizReward,
    rewardResult: state.result,
    correctAnswers: state.correctAnswers,
    totalQuestions: state.totalQuestions,
    isAwarding: state.isAwarding,
    error: state.error,
    clearReward,
  };
}
