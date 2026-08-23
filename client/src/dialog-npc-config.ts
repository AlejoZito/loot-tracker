import { defineAssets } from './dialog-npc-temp';

export const npcAssets = defineAssets({
  baseUrl: '/dialog-npc-assets',
  frames: {
    idle: 'idle.png',
    closed: 'closed.png',
    talking: ['open.png', 'open-2.png'],
    emotes: {
      flex: 'flex.png',
      judgmental: 'judgmental.png',
      thinking: 'thinking.png',
      wink: 'wink.png',
    },
  },
});
