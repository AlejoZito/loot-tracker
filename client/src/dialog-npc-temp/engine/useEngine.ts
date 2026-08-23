import { useEffect, useRef, useState } from 'react';
import type { Assets } from '../domain/assets';
import { DEFAULT_ANIMATION } from '../domain/config';
import type { AnimationConfig } from '../domain/config';
import { parseSegments } from '../utils/parseSegments';
import { idleUrl, closedUrl, randomTalkingUrl, emoteUrl } from '../utils/frames';

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

interface UseEngineCallbacks {
  onStart?: () => void;
  onWord: (word: string) => void;
  onDone: () => void;
  pauseRef?: React.MutableRefObject<boolean>;
}

export function useEngine(
  text: string | null,
  assets: Assets,
  { onStart, onWord, onDone, pauseRef }: UseEngineCallbacks,
  animation: AnimationConfig = DEFAULT_ANIMATION,
): { frameUrl: string; isTalking: boolean } {
  const [frameUrl, setFrameUrl] = useState(() => idleUrl(assets));
  const [isTalking, setIsTalking] = useState(false);

  const epochRef = useRef(0);
  const onStartRef = useRef(onStart);
  const onWordRef = useRef(onWord);
  const onDoneRef = useRef(onDone);
  onStartRef.current = onStart;
  onWordRef.current = onWord;
  onDoneRef.current = onDone;

  const assetsRef = useRef(assets);
  assetsRef.current = assets;

  const animationRef = useRef(animation);
  animationRef.current = animation;

  // Prevents the isTalking effect from overwriting the frame during an emote pause
  const isEmotingRef = useRef(false);
  // Ref mirror of isTalking — updated synchronously in run() before setIsTalking(),
  // so the interval callback can bail out immediately without waiting for effect cleanup.
  const isTalkingActiveRef = useRef(false);

  // Mouth flap — alternates open talking frame ↔ closed while speaking; idle when silent
  useEffect(() => {
    if (!isTalking) {
      if (!isEmotingRef.current) setFrameUrl(idleUrl(assetsRef.current));
      return;
    }
    setFrameUrl(closedUrl(assetsRef.current));
    let open = false;
    const id = setInterval(() => {
      if (!isTalkingActiveRef.current) return;
      open = !open;
      setFrameUrl(
        open ? randomTalkingUrl(assetsRef.current) : closedUrl(assetsRef.current),
      );
    }, animationRef.current.mouthFlapSpeedMs);
    return () => clearInterval(id);
  }, [isTalking]);

  useEffect(() => {
    if (!text) {
      setIsTalking(false);
      setFrameUrl(idleUrl(assetsRef.current));
      return;
    }

    const epoch = ++epochRef.current;

    async function run() {
      onStartRef.current?.();
      isTalkingActiveRef.current = true;
      setIsTalking(true);

      for (const seg of parseSegments(text!)) {
        if (epochRef.current !== epoch) return;

        if (seg.type === 'emote') {
          isEmotingRef.current = true;
          isTalkingActiveRef.current = false;
          setIsTalking(false);
          setFrameUrl(emoteUrl(assetsRef.current, seg.tag) ?? idleUrl(assetsRef.current));
          await sleep(animationRef.current.emotePauseMs);
          if (epochRef.current !== epoch) return;
          isEmotingRef.current = false;
          isTalkingActiveRef.current = true;
          setIsTalking(true);
        } else {
          for (const word of seg.content.trim().split(/\s+/).filter(Boolean)) {
            if (epochRef.current !== epoch) return;
            while (pauseRef?.current) {
              await sleep(animationRef.current.typewriterSpeedMs);
              if (epochRef.current !== epoch) return;
            }
            onWordRef.current(word);
            await sleep(animationRef.current.typewriterSpeedMs * word.length);
          }
        }
      }

      if (epochRef.current !== epoch) return;
      isTalkingActiveRef.current = false;
      setIsTalking(false);
      setFrameUrl(idleUrl(assetsRef.current));
      onDoneRef.current();
    }

    run();
    return () => { epochRef.current++; };
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  return { frameUrl, isTalking };
}
