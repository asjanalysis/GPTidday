// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../App';

afterEach(() => {
  cleanup();
  document.body.className = '';
});

describe('ABSURD.TV application shell', () => {
  it('renders the complete landing page and local artwork', () => {
    const { container } = render(<App/>);

    expect(screen.getByRole('heading', { name: /your brain.*needs.*less.*context/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /the weird feed/i })).toBeTruthy();
    expect(screen.getAllByRole('article')).toHaveLength(9);

    const artwork = container.querySelector<HTMLImageElement>('.thumbnail img');
    expect(artwork?.src.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('filters the feed and opens a playable dialog', () => {
    render(<App/>);

    fireEvent.change(screen.getByRole('textbox', { name: /search videos/i }), {
      target: { value: 'pigeon' },
    });

    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(1);
    expect(within(cards[0]).getByRole('heading', { name: /pigeon gives/i })).toBeTruthy();

    fireEvent.click(within(cards[0]).getByRole('button', { name: /watch pigeon gives/i }));
    expect(screen.getByRole('dialog', { name: /pigeon gives/i })).toBeTruthy();
    expect(document.body.classList.contains('modal-open')).toBe(true);
  });
});
