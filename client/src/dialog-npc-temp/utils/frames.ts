import type { Assets } from '../domain/assets';

export function idleUrl(assets: Assets): string {
  return `${assets.baseUrl}/${assets.frames.idle}`;
}

export function randomTalkingUrl(assets: Assets): string {
  const pool = assets.frames.talking;
  return `${assets.baseUrl}/${pool[Math.floor(Math.random() * pool.length)]}`;
}

export function closedUrl(assets: Assets): string {
  return assets.frames.closed
    ? `${assets.baseUrl}/${assets.frames.closed}`
    : idleUrl(assets);
}

export function emoteUrl(assets: Assets, tag: string): string | null {
  const file = assets.frames.emotes[tag];
  return file ? `${assets.baseUrl}/${file}` : null;
}
