import type { Assets } from '../domain/assets';

export function preloadAssets(assets: Assets): void {
  [
    `${assets.baseUrl}/${assets.frames.idle}`,
    ...assets.frames.talking.map((f) => `${assets.baseUrl}/${f}`),
    ...Object.values(assets.frames.emotes).map((f) => `${assets.baseUrl}/${f}`),
  ].forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}
