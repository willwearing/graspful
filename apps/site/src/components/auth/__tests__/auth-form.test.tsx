import { renderToString } from 'react-dom/server';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from '../auth-form';

const mocks = vi.hoisted(() => ({ signUp: vi.fn(), resend: vi.fn(), signIn: vi.fn(), push: vi.fn(), provision: vi.fn() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: mocks.push, refresh: vi.fn() }) }));
vi.mock('@/lib/supabase/client', () => ({ hasSupabaseBrowserEnv: () => true, createSupabaseBrowserClient: () => ({ auth: { signInWithPassword: mocks.signIn, signUp: mocks.signUp, resend: mocks.resend } }) }));
vi.mock('@/lib/api-client', () => ({ apiClientFetch: mocks.provision }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('site authentication hydration', () => {
  it('disables server-rendered controls until event handlers are attached', () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(<AuthForm mode="sign-in" />);
    expect(container.querySelector<HTMLInputElement>('#email')?.disabled).toBe(true);
    expect(container.querySelector<HTMLInputElement>('#password')?.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
  });

  it('keeps typed credentials and submits after hydration', async () => {
    mocks.signIn.mockResolvedValue({ data: { session: { access_token: 'local-test-token' } }, error: null });
    mocks.provision.mockResolvedValue({});
    render(<AuthForm mode="sign-in" />);
    const email = screen.getByLabelText('Email');
    await waitFor(() => expect(email).toBeEnabled());
    fireEvent.change(email, { target: { value: 'learner@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledWith({ email: 'learner@example.test', password: 'password123' }));
    expect(mocks.push).toHaveBeenCalledWith('/creator');
  });
});


describe('site signup confirmation', () => {
  it.each([undefined, { id: 'obfuscated-user', identities: [] }])('offers recovery without claiming delivery for new and existing users (%j)', async (user) => {
    mocks.signUp.mockResolvedValue({ data: { session: null, user }, error: null });
    render(<AuthForm mode="sign-up" />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'learner@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    await screen.findByText('Check your email', { exact: true });
    expect(screen.queryByText(/We sent a confirmation link/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reset password' })).toHaveAttribute('href', '/forgot-password?email=learner%40example.test');
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/sign-in?email=learner%40example.test&redirect=%2Fcreator');
    mocks.resend.mockResolvedValueOnce({ error: new Error('Email rate limit exceeded') });
    fireEvent.click(screen.getByRole('button', { name: 'Resend confirmation link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email rate limit exceeded');
    expect(screen.getByRole('button', { name: 'Resend confirmation link' })).toBeEnabled();
    mocks.resend.mockResolvedValueOnce({ error: null });
    fireEvent.click(screen.getByRole('button', { name: 'Resend confirmation link' }));
    expect(await screen.findByRole('status')).toHaveTextContent('a new link has been requested');
    expect(mocks.resend).toHaveBeenLastCalledWith({
      type: 'signup', email: 'learner@example.test',
      options: { emailRedirectTo: 'http://localhost:3000/auth/callback?redirect=%2Fcreator' },
    });
    expect(screen.getByRole('button', { name: /Wait 60 seconds/ })).toBeDisabled();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.provision).not.toHaveBeenCalled();
  });
});


it.each(['forgot', 'reset'])('keeps %s password controls disabled until hydration', async (mode) => {
  const { default: Page } = mode === 'forgot'
    ? await import('@/app/(auth)/forgot-password/page')
    : await import('@/app/(auth)/reset-password/page');
  const container = document.createElement('div');
  container.innerHTML = renderToString(<Page />);
  for (const input of container.querySelectorAll<HTMLInputElement>('input')) expect(input.disabled).toBe(true);
  expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
});
