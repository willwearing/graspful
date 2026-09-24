import { describe, expect, it } from 'bun:test';
import { cliAuthConfirmationCode } from '../cli-auth';

describe('cliAuthConfirmationCode', () => {
  it('is stable for a token and formatted XXXX-XXXX', async () => {
    const code = await cliAuthConfirmationCode('token-a');
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(await cliAuthConfirmationCode('token-a')).toBe(code);
  });

  it('differs between tokens', async () => {
    expect(await cliAuthConfirmationCode('token-a')).not.toBe(await cliAuthConfirmationCode('token-b'));
  });
});
