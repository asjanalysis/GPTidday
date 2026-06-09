// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AppErrorBoundary } from '../components/AppErrorBoundary';

function BrokenView(): never {
  throw new Error('render failed');
}

it('shows a recovery interface instead of a blank page after an unexpected render error', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const { getByRole, getByText } = render(<AppErrorBoundary><BrokenView/></AppErrorBoundary>);

  expect(getByRole('alert')).toBeTruthy();
  expect(getByText('Conditions could not be displayed.')).toBeTruthy();
  expect(getByRole('button', { name: /clear cache and reload/i })).toBeTruthy();
  consoleError.mockRestore();
});
