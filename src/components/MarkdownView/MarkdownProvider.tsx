import React, {useMemo} from 'react';
import {observer} from 'mobx-react';

import {
  RenderHTMLConfigProvider,
  TRenderEngineProvider,
  defaultSystemFonts,
} from 'react-native-render-html';

import {useTheme} from '../../hooks';
import {chatSessionStore, uiStore} from '../../store';

import {CodeRenderer} from './CodeRenderer';
import {createTagsStyles} from './styles';
import {tableHTMLElementModels, tableRenderers} from './TableRenderers';

const SYSTEM_FONTS = defaultSystemFonts;
const DEFAULT_TEXT_PROPS = {
  selectable: false,
  userSelect: 'none' as const,
};

const renderers = {
  code: (props: any) => <CodeRenderer {...props} />,
  ...tableRenderers,
};

export const MarkdownProvider: React.FC<React.PropsWithChildren> = observer(
  ({children}) => {
    const theme = useTheme();
    const hasActivePal = Boolean(
      chatSessionStore.activePalId || chatSessionStore.isGroupChat,
    );
    const fancyActive = uiStore.isFancyActive(hasActivePal);
    const fancyFontSize = uiStore.palsHubFancyMsgSize;
    const fancyLineHeightMultiplier = uiStore.palsHubFancyLineHeightMultiplier;
    const customCss = uiStore.customCssEnabled ? uiStore.customCss : '';

    const tagsStyles = useMemo(
      () =>
        createTagsStyles(theme, {
          fancyActive,
          fancyFontSize,
          fancyLineHeightMultiplier,
          customCss,
        }),
      [
        theme,
        fancyActive,
        fancyFontSize,
        fancyLineHeightMultiplier,
        customCss,
      ],
    );

    return (
      <TRenderEngineProvider
        tagsStyles={tagsStyles}
        customHTMLElementModels={tableHTMLElementModels}
        systemFonts={SYSTEM_FONTS}>
        <RenderHTMLConfigProvider
          defaultTextProps={DEFAULT_TEXT_PROPS}
          renderers={renderers}>
          {children}
        </RenderHTMLConfigProvider>
      </TRenderEngineProvider>
    );
  },
);
