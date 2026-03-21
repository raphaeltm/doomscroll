import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BroadcastPlayer } from './BroadcastPlayer';

vi.mock('../store', () => ({
  useStore: vi.fn(),
}));

import { useStore } from '../store';
const mockUseStore = vi.mocked(useStore);

describe('BroadcastPlayer', () => {
  it('renders nothing when no simulation', () => {
    mockUseStore.mockReturnValue({ simulation: null } as ReturnType<typeof useStore>);
    const { container } = render(<BroadcastPlayer />);
    expect(container.innerHTML).toBe('');
  });

  it('shows spinner when overview is generating', () => {
    mockUseStore.mockReturnValue({
      simulation: { overviewGenerating: true },
    } as ReturnType<typeof useStore>);
    render(<BroadcastPlayer />);
    expect(screen.getByText('Producing broadcast overview...')).toBeTruthy();
  });

  it('shows error when overview fails', () => {
    mockUseStore.mockReturnValue({
      simulation: { overviewError: 'Network error' },
    } as ReturnType<typeof useStore>);
    render(<BroadcastPlayer />);
    expect(screen.getByText(/Network error/)).toBeTruthy();
  });

  it('renders video player when finalVideoUrl exists', () => {
    mockUseStore.mockReturnValue({
      simulation: {
        finalVideoUrl: 'https://example.com/video.mp4',
        finalAudioUrl: 'https://example.com/audio.mp3',
        newsScript: 'Breaking news!',
      },
    } as ReturnType<typeof useStore>);
    render(<BroadcastPlayer />);
    expect(screen.getByText('Broadcast Overview')).toBeTruthy();
    expect(screen.getByText('Breaking news!')).toBeTruthy();
  });
});
