import {View} from 'react-native';
import React, {useMemo} from 'react';

import {marked} from 'marked';
import {RenderHTMLSource} from 'react-native-render-html';
import {HtmlPreviewBubble} from '../HtmlPreviewBubble';

marked.use({});

interface MarkdownViewProps {
  markdownText: string;
  maxMessageWidth: number;
  selectable?: boolean;
}

const isEmptyContent = (content: string): boolean => {
  return !content || content.trim() === '';
};

/**
 * Preprocesses complex roleplay / status / HTML constructs before `marked()` parsing:
 * 1. Extracts full WebView-grade `<style>...</style>` + HTML/SVG/Canvas blocks when present so
 *    complex CSS animations, gradients, SVG graphics, and interactive widgets render via `HtmlPreviewBubble`.
 * 2. Converts `[Status: ...]` or `[HP: ... | ...]` RPG HUD blocks into `<status>` cards if not already wrapped.
 */
function preprocessComplexMarkdown(raw: string): {
  markdownPart: string;
  webViewHtmlBlocks: string[];
} {
  if (!raw) {
    return {markdownPart: '', webViewHtmlBlocks: []};
  }

  const webViewHtmlBlocks: string[] = [];
  let text = raw;

  // 1. Check if the entire message is a full HTML document or contains <style> + complex DOM
  if (
    /^<!doctype\s+html/i.test(text.trim()) ||
    /^<html[\s>]/i.test(text.trim()) ||
    (/<style[\s>][\s\S]*?<\/style>/i.test(text) &&
      /<(div|section|table|svg|canvas)[\s>]/i.test(text))
  ) {
    webViewHtmlBlocks.push(text.trim());
    // Strip the <style> block from the inline RenderHTML pass so raw CSS text is never printed
    text = text.replace(/<style[\s>][\s\S]*?<\/style>/gi, '');
  }

  // 2. Extract standalone <svg>...</svg> graphics into WebView preview blocks if they use gradients/filters
  text = text.replace(/<svg[\s>][\s\S]*?<\/svg>/gi, match => {
    webViewHtmlBlocks.push(match);
    return '';
  });

  // 3. Auto-upgrade bracketed RPG HUD lines like `[HP: 100/100 | Location: Neo-Tokyo]` into `<status>` cards
  text = text.replace(
    /^\[((?:HP|Health|MP|Mana|Stamina|Affection|Mood|Location|Time|Status)\s*:[^\]]+\|[^\]]+)\]$/gim,
    '<status><strong>📊 Status</strong> — $1</status>',
  );

  return {markdownPart: text, webViewHtmlBlocks};
}

export const MarkdownView: React.FC<MarkdownViewProps> = React.memo(
  ({markdownText, maxMessageWidth}) => {
    const {markdownPart, webViewHtmlBlocks} = useMemo(
      () => preprocessComplexMarkdown(markdownText),
      [markdownText],
    );

    const htmlContent = useMemo(
      () => (markdownPart.trim() ? (marked(markdownPart) as string) : ''),
      [markdownPart],
    );
    const source = useMemo(() => ({html: htmlContent}), [htmlContent]);

    return (
      <View testID="markdown-content" style={{maxWidth: maxMessageWidth}}>
        {!isEmptyContent(markdownPart) && (
          <RenderHTMLSource source={source} contentWidth={maxMessageWidth} />
        )}
        {webViewHtmlBlocks.map((htmlBlock, idx) => (
          <View key={`complex-html-${idx}`} style={{marginTop: 6}}>
            <HtmlPreviewBubble
              html={htmlBlock}
              title="Interactive HTML / CSS / SVG Render"
            />
          </View>
        ))}
      </View>
    );
  },
  (prevProps, nextProps) =>
    prevProps.markdownText === nextProps.markdownText &&
    prevProps.maxMessageWidth === nextProps.maxMessageWidth &&
    prevProps.selectable === nextProps.selectable,
);
