import React, {useContext} from 'react';
import {View} from 'react-native';
import {observer} from 'mobx-react';
import {Text} from 'react-native-paper';

import {styles} from './styles';
import {chatSessionStore, modelStore} from '../../store';
import {L10nContext} from '../../utils';

export const ChatHeaderTitle: React.FC = observer(() => {
  const l10n = useContext(L10nContext);
  const activeSessionId = chatSessionStore.activeSessionId;
  const activeSession = chatSessionStore.sessions.find(
    session => session.id === activeSessionId,
  );
  const activeModel = modelStore.activeModel;
  const isGroup = chatSessionStore.isGroupChat;
  const groupNames = chatSessionStore.activeGroupPals.map(p => p.name).join(', ');

  return (
    <View style={styles.container}>
      <Text numberOfLines={1} variant="titleSmall">
        {activeSession?.title || l10n.components.chatHeaderTitle.defaultTitle}
      </Text>
      <Text numberOfLines={1} variant="bodySmall">
        {isGroup
          ? `Group (${chatSessionStore.activeGroupPals.length}): ${groupNames}`
          : activeModel?.name || ''}
      </Text>
    </View>
  );
});
