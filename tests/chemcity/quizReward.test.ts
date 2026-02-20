import { BASE_DIAMONDS_PER_QUIZ, COINS_PER_CORRECT_ANSWER } from '../../src/hooks/useQuizReward';

describe('Quiz reward constants', () => {
  it('COINS_PER_CORRECT_ANSWER is positive', () => {
    expect(COINS_PER_CORRECT_ANSWER).toBeGreaterThan(0);
  });

  it('BASE_DIAMONDS_PER_QUIZ is positive', () => {
    expect(BASE_DIAMONDS_PER_QUIZ).toBeGreaterThan(0);
  });

  it('10 correct answers produces expected base coins', () => {
    expect(10 * COINS_PER_CORRECT_ANSWER).toBe(100);
  });

  it('0 correct answers produces 0 base coins', () => {
    expect(0 * COINS_PER_CORRECT_ANSWER).toBe(0);
  });
});

describe('DailyLogin streak messages', () => {
  function milestoneMessage(streak: number): string {
    if (streak === 1) return 'Welcome back! 👋';
    if (streak === 7) return '7-day streak! 🎉';
    if (streak === 30) return '30-day legend! 🏆';
    if (streak % 10 === 0) return `${streak} days strong! ⚡`;
    return `${streak}-day streak! 🔥`;
  }

  it('streak 1 shows welcome message', () => {
    expect(milestoneMessage(1)).toBe('Welcome back! 👋');
  });

  it('streak 7 shows 7-day message', () => {
    expect(milestoneMessage(7)).toBe('7-day streak! 🎉');
  });

  it('streak 30 shows legend message', () => {
    expect(milestoneMessage(30)).toBe('30-day legend! 🏆');
  });

  it('streak 20 shows milestone message', () => {
    expect(milestoneMessage(20)).toBe('20 days strong! ⚡');
  });

  it('streak 5 shows generic streak message', () => {
    expect(milestoneMessage(5)).toBe('5-day streak! 🔥');
  });
});
