import React, {useMemo, useState} from 'react';
import {View, Text as RNText, TouchableOpacity} from 'react-native';
import {
  HTMLElementModel,
  HTMLContentModel,
  TNodeChildrenRenderer,
  isDomElement,
} from 'react-native-render-html';
import type {
  TNode,
  CustomBlockRenderer,
  CustomTagRendererRecord,
  HTMLElementModelRecord,
} from 'react-native-render-html';
// import type {Element} from '@native-html/transient-render-engine';
type Element = any;

import {useTheme} from '../../hooks';
import {createTableStyles} from './tableStyles';
import {ScrollView} from 'react-native-gesture-handler';

/**
 * Custom HTML Element Models for Complex Roleplay & Technical Rendering:
 * - Tables (`table`, `thead`, `tbody`, `tr`, `th`, `td`)
 * - Interactive Collapsible Blocks (`details`, `summary`)
 * - RPG Stat & Progress Bars (`progress`, `meter`)
 * - Roleplay HUD & Card Containers (`status`, `hud`, `panel`, `statbox`)
 */
export const tableHTMLElementModels: HTMLElementModelRecord = {
  table: HTMLElementModel.fromCustomModel({
    tagName: 'table',
    contentModel: HTMLContentModel.block,
  }),
  thead: HTMLElementModel.fromCustomModel({
    tagName: 'thead',
    contentModel: HTMLContentModel.block,
  }),
  tbody: HTMLElementModel.fromCustomModel({
    tagName: 'tbody',
    contentModel: HTMLContentModel.block,
  }),
  tr: HTMLElementModel.fromCustomModel({
    tagName: 'tr',
    contentModel: HTMLContentModel.block,
  }),
  th: HTMLElementModel.fromCustomModel({
    tagName: 'th',
    contentModel: HTMLContentModel.block,
  }),
  td: HTMLElementModel.fromCustomModel({
    tagName: 'td',
    contentModel: HTMLContentModel.block,
  }),
  details: HTMLElementModel.fromCustomModel({
    tagName: 'details',
    contentModel: HTMLContentModel.block,
  }),
  summary: HTMLElementModel.fromCustomModel({
    tagName: 'summary',
    contentModel: HTMLContentModel.block,
  }),
  progress: HTMLElementModel.fromCustomModel({
    tagName: 'progress',
    contentModel: HTMLContentModel.block,
  }),
  meter: HTMLElementModel.fromCustomModel({
    tagName: 'meter',
    contentModel: HTMLContentModel.block,
  }),
  status: HTMLElementModel.fromCustomModel({
    tagName: 'status',
    contentModel: HTMLContentModel.block,
  }),
  hud: HTMLElementModel.fromCustomModel({
    tagName: 'hud',
    contentModel: HTMLContentModel.block,
  }),
  panel: HTMLElementModel.fromCustomModel({
    tagName: 'panel',
    contentModel: HTMLContentModel.block,
  }),
};

// ---- DOM helpers ----

function getDomChildrenByTag(
  domNode: Element,
  ...tagNames: string[]
): Element[] {
  return (domNode.children || []).filter(
    (child): child is Element =>
      isDomElement(child) && tagNames.includes(child.tagName),
  );
}

function getTableRows(tableDOM: Element): {row: Element; isHeader: boolean}[] {
  const rows: {row: Element; isHeader: boolean}[] = [];
  for (const child of tableDOM.children) {
    if (!isDomElement(child)) {
      continue;
    }
    if (child.tagName === 'thead') {
      for (const tr of getDomChildrenByTag(child, 'tr')) {
        rows.push({row: tr, isHeader: true});
      }
    } else if (child.tagName === 'tbody') {
      for (const tr of getDomChildrenByTag(child, 'tr')) {
        rows.push({row: tr, isHeader: false});
      }
    } else if (child.tagName === 'tr') {
      rows.push({row: child, isHeader: false});
    }
  }
  return rows;
}

function findTNodeForDomElement(
  parentTNode: TNode,
  domElement: Element,
): TNode | undefined {
  for (const child of parentTNode.children) {
    if (child.domNode === domElement) {
      return child;
    }
  }
  for (const child of parentTNode.children) {
    if (child.children.length > 0) {
      const found = findTNodeForDomElement(child, domElement);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

// ---- Table renderer ----

const TableRenderer: CustomBlockRenderer = ({tnode}) => {
  const theme = useTheme();
  const styles = useMemo(() => createTableStyles(theme), [theme]);

  const tableDOM = tnode.domNode as Element | null;
  if (!tableDOM) {
    return null;
  }

  const rows = getTableRows(tableDOM);

  return (
    <View style={styles.tableOuter}>
      <ScrollView horizontal nestedScrollEnabled>
        <View style={styles.tableInner}>
          {rows.map(({row, isHeader}, rowIndex) => {
            const cells = getDomChildrenByTag(row, 'td', 'th');
            return (
              <View
                key={rowIndex}
                style={[
                  styles.row,
                  isHeader && styles.headerRow,
                  rowIndex === rows.length - 1 && styles.lastRow,
                ]}>
                {cells.map((cell, cellIndex) => {
                  const cellTNode = findTNodeForDomElement(tnode, cell);
                  const isHeaderCell = isHeader || cell.tagName === 'th';
                  const align = cell.attribs?.align;
                  return (
                    <View
                      key={cellIndex}
                      style={[
                        styles.cell,
                        isHeaderCell && styles.headerCell,
                        cellIndex < cells.length - 1 && styles.cellBorderRight,
                        align === 'center' && styles.alignCenter,
                        align === 'right' && styles.alignRight,
                        align === 'left' && styles.alignLeft,
                      ]}>
                      {cellTNode ? (
                        <TNodeChildrenRenderer tnode={cellTNode} />
                      ) : (
                        <RNText>{''}</RNText>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

// ---- Interactive <details><summary> Collapsible Accordion Renderer ----

const DetailsRenderer: CustomBlockRenderer = ({tnode}) => {
  const theme = useTheme();
  const domNode = tnode.domNode as Element | null;
  const initiallyOpen = Boolean(
    domNode?.attribs && 'open' in domNode.attribs,
  );
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  const summaryChild = tnode.children.find(c => c.tagName === 'summary');
  const bodyChildren = tnode.children.filter(c => c.tagName !== 'summary');

  return (
    <View
      style={{
        marginVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.dark
          ? 'rgba(255, 255, 255, 0.14)'
          : 'rgba(15, 23, 42, 0.12)',
        backgroundColor: theme.dark
          ? 'rgba(15, 23, 42, 0.48)'
          : 'rgba(241, 245, 249, 0.85)',
        overflow: 'hidden',
      }}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => setIsOpen(prev => !prev)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 9,
          backgroundColor: theme.dark
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(15, 23, 42, 0.04)',
        }}>
        <RNText
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: theme.colors.primary,
            marginRight: 8,
          }}>
          {isOpen ? '▼' : '▶'}
        </RNText>
        <View style={{flex: 1}}>
          {summaryChild ? (
            <TNodeChildrenRenderer tnode={summaryChild} />
          ) : (
            <RNText
              style={{
                fontSize: 13.5,
                fontWeight: '700',
                color: theme.colors.onSurface,
              }}>
              Details / Status
            </RNText>
          )}
        </View>
      </TouchableOpacity>
      {isOpen && (
        <View style={{paddingHorizontal: 12, paddingVertical: 10}}>
          {bodyChildren.map((child, idx) => (
            <TNodeChildrenRenderer key={idx} tnode={child} />
          ))}
        </View>
      )}
    </View>
  );
};

// ---- RPG <progress> and <meter> Visual Bar Renderer ----

const ProgressRenderer: CustomBlockRenderer = ({tnode}) => {
  const theme = useTheme();
  const domNode = tnode.domNode as Element | null;
  const rawVal = parseFloat(domNode?.attribs?.value ?? '50');
  const rawMax = parseFloat(domNode?.attribs?.max ?? '100');
  const label = domNode?.attribs?.label || domNode?.attribs?.title || '';
  const pct = Math.max(
    0,
    Math.min(100, rawMax > 0 ? (rawVal / rawMax) * 100 : rawVal),
  );

  return (
    <View style={{marginVertical: 5}}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 3,
        }}>
        {label ? (
          <RNText
            style={{
              fontSize: 11.5,
              fontWeight: '700',
              color: theme.colors.onSurface,
            }}>
            {label}
          </RNText>
        ) : null}
        <RNText
          style={{
            fontSize: 11,
            fontWeight: '600',
            color: theme.colors.onSurfaceVariant,
          }}>
          {Math.round(rawVal)} / {Math.round(rawMax)} ({Math.round(pct)}%)
        </RNText>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: theme.dark
            ? 'rgba(255, 255, 255, 0.14)'
            : 'rgba(15, 23, 42, 0.12)',
          overflow: 'hidden',
        }}>
        <View
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 4,
            backgroundColor: theme.colors.primary,
          }}
        />
      </View>
    </View>
  );
};

// ---- Roleplay <status> / <hud> / <panel> Card Renderer ----

const StatusHudRenderer: CustomBlockRenderer = ({tnode}) => {
  const theme = useTheme();
  return (
    <View
      style={{
        marginVertical: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderLeftWidth: 3.5,
        borderColor: theme.dark
          ? 'rgba(255, 255, 255, 0.16)'
          : 'rgba(15, 23, 42, 0.14)',
        borderLeftColor: theme.colors.primary,
        backgroundColor: theme.dark
          ? 'rgba(15, 23, 42, 0.55)'
          : 'rgba(248, 250, 252, 0.92)',
      }}>
      <TNodeChildrenRenderer tnode={tnode} />
    </View>
  );
};

export const tableRenderers: CustomTagRendererRecord = {
  table: TableRenderer,
  details: DetailsRenderer,
  progress: ProgressRenderer,
  meter: ProgressRenderer,
  status: StatusHudRenderer,
  hud: StatusHudRenderer,
  panel: StatusHudRenderer,
};
