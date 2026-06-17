import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarSubscribeLink from './CalendarSubscribeLink';

describe('CalendarSubscribeLink', () => {
  it('購読方法のリンクは開く前は表示されない', () => {
    render(<CalendarSubscribeLink />);

    expect(screen.queryByRole('link', { name: /各アプリでの購読方法を見る/ })).not.toBeInTheDocument();
  });

  it('ボタンを開くと about の購読方法へのリンクを表示する', async () => {
    const user = userEvent.setup();
    render(<CalendarSubscribeLink />);

    await user.click(screen.getByRole('button', { name: 'カレンダーを購読' }));

    const link = screen.getByRole('link', { name: /各アプリでの購読方法を見る/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/about#calendar-subscription');
  });
});
