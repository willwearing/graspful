import { renderToString } from 'react-dom/server';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from '../auth-form';

const mocks = vi.hoisted(() => ({ signIn: vi.fn(), push: vi.fn(), provision: vi.fn() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: mocks.push, refresh: vi.fn() }) }));
vi.mock('@/lib/supabase/client', () => ({ hasSupabaseBrowserEnv: () => true, createSupabaseBrowserClient: () => ({ auth: { signInWithPassword: mocks.signIn } }) }));
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
