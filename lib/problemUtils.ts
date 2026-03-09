import type { WeakSpot } from '../types';

export function extractOperationAndPattern(
  question: string,
  maxNumber = 20
): { operation: '+' | '-' | '*'; pattern: string } {
  let operation: '+' | '-' | '*' = '+';
  if (question.includes('×') || question.includes('*')) operation = '*';
  else if (question.includes('-')) operation = '-';
  else if (question.includes('+')) operation = '+';

  let pattern = 'basic';
  if (question.includes('?')) pattern = 'missing_number';
  else if ((question.match(/[\+\-\*×]/g)?.length ?? 0) >= 2) pattern = 'trio';
  else if (maxNumber > 50) pattern = 'large_numbers';

  return { operation, pattern };
}
