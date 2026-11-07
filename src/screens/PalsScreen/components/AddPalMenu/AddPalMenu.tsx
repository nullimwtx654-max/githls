import React, {useState, useContext} from 'react';
import {View, TouchableOpacity, Alert, Modal, Pressable, StyleSheet} from 'react-native';
import {Text, IconButton} from 'react-native-paper';
import {observer} from 'mobx-react-lite';

import {PlusIcon} from '../../../../assets/icons';
import {useTheme} from '../../../../hooks';
import {L10nContext} from '../../../../utils';
import {pickAndParseCharacterCard} from '../../../../utils/characterCardParser';
import {palStore} from '../../../../store';
import {createStyles} from './styles';

interface AddPalMenuProps {
  iconColor: string;
  iconSize: number;
  onCreatePal: (type: 'assistant' | 'roleplay' | 'video') => void;
}

export const AddPalMenu: React.FC<AddPalMenuProps> = observer(
  ({iconColor, iconSize, onCreatePal}) => {
    const theme = useTheme();
    const styles = createStyles(theme);
    const l10n = useContext(L10nContext);
    const [modalVisible, setModalVisible] = useState(false);

    const openMenu = () => setModalVisible(true);
    const closeMenu = () => setModalVisible(false);

    const handleCreateAssistant = () => {
      closeMenu();
      onCreatePal('assistant');
    };

    const handleCreateRoleplay = () => {
      closeMenu();
      onCreatePal('roleplay');
    };

    const handleCreateVideo = () => {
      closeMenu();
      onCreatePal('video');
    };

    const handleImportCard = async () => {
      closeMenu();
      try {
        const cardPal = await pickAndParseCharacterCard();
        if (cardPal) {
          await palStore.createPal(cardPal as any);
          Alert.alert(
            'Imported Character Card',
            `Successfully imported "${cardPal.name}".`,
          );
        }
      } catch (error: any) {
        Alert.alert(
          'Card Import Error',
          error?.message || 'Failed to import character card.',
        );
      }
    };

    return (
      <>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openMenu}
          testID="bottom-action-add">
          <View style={styles.iconContainer}>
            <PlusIcon stroke={iconColor} width={iconSize} height={iconSize} />
          </View>
          <Text style={styles.actionLabel}>{l10n.palsScreen.addPal}</Text>
        </TouchableOpacity>

        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeMenu}>
          <Pressable style={modalStyles.overlay} onPress={closeMenu}>
            <Pressable
              style={[
                modalStyles.sheetContainer,
                {backgroundColor: theme.colors.surface},
              ]}
              onPress={e => e.stopPropagation()}>
              <View style={modalStyles.headerRow}>
                <Text variant="titleMedium" style={{fontWeight: '700', color: theme.colors.onSurface}}>
                  {l10n.palsScreen.addPal}
                </Text>
                <IconButton icon="close" size={20} onPress={closeMenu} />
              </View>

              <TouchableOpacity
                style={[modalStyles.menuOption, {borderBottomColor: theme.colors.outlineVariant}]}
                onPress={handleCreateAssistant}>
                <IconButton icon="account" size={22} iconColor={theme.colors.primary} />
                <View style={{flex: 1}}>
                  <Text style={[modalStyles.optionTitle, {color: theme.colors.onSurface}]}>
                    {l10n.palsScreen.assistant}
                  </Text>
                  <Text style={[modalStyles.optionSub, {color: theme.colors.onSurfaceVariant}]}>
                    General knowledge and task assistant
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[modalStyles.menuOption, {borderBottomColor: theme.colors.outlineVariant}]}
                onPress={handleCreateRoleplay}>
                <IconButton icon="drama-masks" size={22} iconColor={theme.colors.primary} />
                <View style={{flex: 1}}>
                  <Text style={[modalStyles.optionTitle, {color: theme.colors.onSurface}]}>
                    {l10n.palsScreen.roleplay}
                  </Text>
                  <Text style={[modalStyles.optionSub, {color: theme.colors.onSurfaceVariant}]}>
                    Interactive character with personality and scenario
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[modalStyles.menuOption, {borderBottomColor: theme.colors.outlineVariant}]}
                onPress={handleCreateVideo}>
                <IconButton icon="video" size={22} iconColor={theme.colors.primary} />
                <View style={{flex: 1}}>
                  <Text style={[modalStyles.optionTitle, {color: theme.colors.onSurface}]}>
                    {l10n.palsScreen.video}
                  </Text>
                  <Text style={[modalStyles.optionSub, {color: theme.colors.onSurfaceVariant}]}>
                    Real-time video vision analysis pal
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={modalStyles.menuOption}
                onPress={handleImportCard}>
                <IconButton icon="account-arrow-down-outline" size={22} iconColor={theme.colors.primary} />
                <View style={{flex: 1}}>
                  <Text style={[modalStyles.optionTitle, {color: theme.colors.primary, fontWeight: '700'}]}>
                    Import Character Card (V1–V4 PNG/JSON)
                  </Text>
                  <Text style={[modalStyles.optionSub, {color: theme.colors.onSurfaceVariant}]}>
                    Load SillyTavern / Character Card V1-V4 from storage
                  </Text>
                </View>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </>
    );
  },
);

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
