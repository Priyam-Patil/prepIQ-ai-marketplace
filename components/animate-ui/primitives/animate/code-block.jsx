'use client';;
import * as React from 'react';

import { useIsInView } from '@/hooks/use-is-in-view';

function CodeBlock({
  ref,
  code,
  lang,
  theme = 'light',

  themes = {
    light: 'github-light',
    dark: 'github-dark',
  },

  writing = false,
  duration = 5000,
  delay = 0,
  onDone,
  onWrite,
  scrollContainerRef,
  inView = false,
  inViewOnce = true,
  inViewMargin = '0px',
  ...props
}) {
  const { ref: localRef, isInView } = useIsInView(
    ref,
    {
      inView,
      inViewOnce,
      inViewMargin,
    },
  );

  const [typing, setTyping] = React.useState({ source: code, text: '' });
  const [highlightedCode, setHighlightedCode] = React.useState('');
  const [completedCode, setCompletedCode] = React.useState(null);
  const visibleCode = typing.source === code ? typing.text : '';
  const renderedCode = writing ? visibleCode : code;
  const isDone = !writing || !code.length || completedCode === code;

  React.useEffect(() => {
    if (!renderedCode.length || !isInView) return;

    const loadHighlightedCode = async () => {
      try {
        const { codeToHtml } = await import('shiki');

        const highlighted = await codeToHtml(renderedCode, {
          lang,
          themes,
          defaultColor: theme,
        });

        setHighlightedCode(highlighted);
      } catch (e) {
        console.error(`Language "${lang}" could not be loaded.`, e);
      }
    };

    loadHighlightedCode();
  }, [lang, themes, isInView, renderedCode, theme]);

  React.useEffect(() => {
    if (!writing) {
      onDone?.();
      onWrite?.({ index: code.length, length: code.length, done: true });
      return;
    }

    if (!isInView) return;

    if (!code.length) {
      onDone?.();
      onWrite?.({ index: 0, length: 0, done: true });
      return;
    }

    const characters = Array.from(code);
    let index = 0;
    const totalDuration = duration;
    const interval = totalDuration / characters.length;
    let intervalId;

    const timeout = setTimeout(() => {
      setTyping({ source: code, text: '' });
      setCompletedCode(null);

      intervalId = setInterval(() => {
        if (index < characters.length) {
          index += 1;
          const nextChar = characters.slice(0, index).join('');
          setTyping({ source: code, text: nextChar });
          onWrite?.({
            index,
            length: characters.length,
            done: false,
          });
          localRef.current?.scrollTo({
            top: localRef.current?.scrollHeight,
            behavior: 'smooth',
          });
        } else {
          clearInterval(intervalId);
          setCompletedCode(code);
          onDone?.();
          onWrite?.({
            index: characters.length,
            length: characters.length,
            done: true,
          });
        }
      }, interval);
    }, delay);

    return () => {
      clearTimeout(timeout);
      clearInterval(intervalId);
    };
  }, [code, duration, delay, isInView, writing, onDone, onWrite, localRef]);

  React.useEffect(() => {
    if (!writing || !isInView) return;
    const el =
      scrollContainerRef?.current ??
      (localRef.current?.parentElement) ??
      (localRef.current);

    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth',
      });
    });
  }, [highlightedCode, writing, isInView, scrollContainerRef, localRef]);

  return (
    <div
      ref={localRef}
      data-slot="code-block"
      data-writing={writing}
      data-done={isDone}
      dangerouslySetInnerHTML={{ __html: highlightedCode }}
      {...props}
    />
  );
}

export { CodeBlock };
