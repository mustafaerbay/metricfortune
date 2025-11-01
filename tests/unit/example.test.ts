import { describe, it, expect } from 'vitest';

describe('Example Unit Test', () => {
  it('should pass basic arithmetic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should validate TypeScript types', () => {
    const user: { id: string; email: string } = {
      id: '123',
      email: 'test@example.com',
    };
    expect(user.email).toContain('@');
  });
});
