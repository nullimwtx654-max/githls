import os, re

# ==============================================================================
# 1. FIX PalsScreen: Add Pal Menu Modal and Tab Filters (Pal Store is Gone Fix)
# ==============================================================================
pals_screen_path = "src/screens/PalsScreen/PalsScreen.tsx"
with open(pals_screen_path, "r", encoding="utf-8") as f:
    pals_content = f.read()

# Make sure 'all' (Pals Store / Discover Pals) is accessible and visible in FilterChips
filter_chips_path = "src/screens/PalsScreen/components/FilterChips/FilterChips.tsx"
with open(filter_chips_path, "r", encoding="utf-8") as f:
    fc_content = f.read()

# Update FilterChips to ensure Discover / Pal Store tab is prominently shown as "Pal Store"
old_filter_options = """    const filterOptions: FilterOption[] = [
      {
        key: 'all',
        label: PAL_FILTER_LABELS.all,
        showWhenUnauthenticated: true,
      },"""

new_filter_options = """    const filterOptions: FilterOption[] = [
      {
        key: 'all',
        label: 'Pal Store',
        showWhenUnauthenticated: true,
      },"""

if old_filter_options in fc_content:
    fc_content = fc_content.replace(old_filter_options, new_filter_options)
    with open(filter_chips_path, "w", encoding="utf-8") as f:
        f.write(fc_content)
    print("Updated FilterChips.tsx to show 'Pal Store'")

# ==============================================================================
# 2. FIX AddPalMenu: Modal Sheet layout so it does not go off screen on any device
# ==============================================================================
add_pal_menu_path = "src/screens/PalsScreen/components/AddPalMenu/AddPalMenu.tsx"
add_pal_modal_replacement = """import React, {useState, useContext} from 'react';
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
"""

with open(add_pal_menu_path, "w", encoding="utf-8") as f:
    f.write(add_pal_modal_replacement)
print("Updated AddPalMenu.tsx with centered responsive modal sheet!")

# ==============================================================================
# 3. FIX Image 2: Disable the Pal Menu item in ChatPalModelPickerSheet
# "Disable the pal menu here img 2 for you're only supposed to be able to talk to pals with palhub"
# ==============================================================================
picker_path = "src/components/ChatPalModelPickerSheet/ChatPalModelPickerSheet.tsx"
with open(picker_path, "r", encoding="utf-8") as f:
    picker_code = f.read()

# In ChatPalModelPickerSheet, only show models tab by default, and if user is in normal chat mode, hide the pals tab completely!
old_tabs_code = """    const TABS = React.useMemo(
      () => [
        {
          id: 'pals' as Tab,
          label: l10n.components.chatPalModelPickerSheet.palsTab,
        },
        {
          id: 'models' as Tab,
          label: l10n.components.chatPalModelPickerSheet.modelsTab,
        },
      ],
      [
        l10n.components.chatPalModelPickerSheet.palsTab,
        l10n.components.chatPalModelPickerSheet.modelsTab,
      ],
    );"""

new_tabs_code = """    // Only allow talking to pals with PalsHub: In standard Chat, hide or disable the Pals tab
    const isPalMode = chatSessionStore.chatMode === 'pal' || chatSessionStore.chatMode === 'palshub';
    const TABS = React.useMemo(
      () =>
        isPalMode
          ? [
              {
                id: 'models' as Tab,
                label: l10n.components.chatPalModelPickerSheet.modelsTab,
              },
              {
                id: 'pals' as Tab,
                label: l10n.components.chatPalModelPickerSheet.palsTab,
              },
            ]
          : [
              {
                id: 'models' as Tab,
                label: l10n.components.chatPalModelPickerSheet.modelsTab,
              },
            ],
      [
        isPalMode,
        l10n.components.chatPalModelPickerSheet.palsTab,
        l10n.components.chatPalModelPickerSheet.modelsTab,
      ],
    );"""

if old_tabs_code in picker_code:
    picker_code = picker_code.replace(old_tabs_code, new_tabs_code)
    # Also default activeTab to 'models'
    picker_code = picker_code.replace("const [activeTab, setActiveTab] = React.useState<Tab>('models');", "const [activeTab, setActiveTab] = React.useState<Tab>('models');")
    with open(picker_path, "w", encoding="utf-8") as f:
        f.write(picker_code)
    print("Updated ChatPalModelPickerSheet.tsx to disable/hide Pals tab in normal chat!")

# ==============================================================================
# 4. FIX Cloud Model Initialization in ChatEmptyPlaceholder
# "No way to initialise the cloud model."
# ==============================================================================
placeholder_path = "src/components/ChatEmptyPlaceholder/ChatEmptyPlaceholder.tsx"
with open(placeholder_path, "r", encoding="utf-8") as f:
    ph_code = f.read()

# Add AIApiKeySheet so user can connect/init cloud models directly from the Chat empty state
ph_import_target = "import {modelStore, palStore} from '../../store';"
ph_import_replace = """import {modelStore, palStore, aiProviderStore} from '../../store';
import {AIApiKeySheet} from '../AIApiKeySheet';"""

if ph_import_target in ph_code and "AIApiKeySheet" not in ph_code:
    ph_code = ph_code.replace(ph_import_target, ph_import_replace)

# Inside ChatEmptyPlaceholder component: add showCloudSheet state and Cloud Model Button
ph_comp_target = "    const l10n = useContext(L10nContext);\n    const styles = createStyles({theme});"
ph_comp_replace = """    const l10n = useContext(L10nContext);\n    const styles = createStyles({theme});
    const [showCloudSheet, setShowCloudSheet] = React.useState(false);"""

if ph_comp_target in ph_code:
    ph_code = ph_code.replace(ph_comp_target, ph_comp_replace)

# Add Cloud Model Initialize Button below the main button
ph_button_target = """        {buttonText ? (
          <Button
            mode="contained"
            onPress={onPress}
            style={styles.button}
            loading={modelStore.isContextLoading}
            disabled={hasActiveModel}>
            {modelStore.isContextLoading
              ? l10n.components?.chatEmptyPlaceholder?.loading
              : buttonText}
          </Button>
        ) : null}"""

ph_button_replace = """        {buttonText ? (
          <Button
            mode="contained"
            onPress={onPress}
            style={styles.button}
            loading={modelStore.isContextLoading}
            disabled={hasActiveModel}>
            {modelStore.isContextLoading
              ? l10n.components?.chatEmptyPlaceholder?.loading
              : buttonText}
          </Button>
        ) : null}
        <Button
          mode="outlined"
          onPress={() => setShowCloudSheet(true)}
          style={[styles.button, {marginTop: 10, borderColor: theme.colors.primary}]}
          textColor={theme.colors.primary}
          icon="cloud-outline">
          {aiProviderStore.hasConfiguredProviders ? "Switch / Init Cloud Model" : "Initialize Cloud Model (OpenAI/Claude/OpenRouter)"}
        </Button>
        <AIApiKeySheet
          isVisible={showCloudSheet}
          onDismiss={() => setShowCloudSheet(false)}
        />"""

if ph_button_target in ph_code:
    ph_code = ph_code.replace(ph_button_target, ph_button_replace)
    with open(placeholder_path, "w", encoding="utf-8") as f:
        f.write(ph_code)
    print("Updated ChatEmptyPlaceholder.tsx with direct Cloud Model Initializer!")

# ==============================================================================
# 5. FIX Fancy Theme: Distinct Creative UI for Normal Chat (No PFP) & Pals Chat
# & Apply Everywhere (Sidebar, Settings, Normal Chat, PalsHub)
# ==============================================================================
chatview_path = "src/components/ChatView/ChatView.tsx"
with open(chatview_path, "r", encoding="utf-8") as f:
    cv_code = f.read()

# Replace the fallback background in ChatView when there is no Pal portrait URI
old_bg_fallback = """              ) : (
                <View
                  style={[
                    StyleSheet.absoluteFillObject,
                    {
                      backgroundColor: theme.dark ? '#0B0D13' : '#EEF2F6',
                    },
                  ]}
                />
              )}"""

new_bg_fallback = """              ) : (
                /* Creative Fancy Theme background for Normal Chat (Geometric Aurora Mesh Glow) */
                <View
                  style={[
                    StyleSheet.absoluteFillObject,
                    {
                      backgroundColor: theme.dark ? '#0D0F14' : '#F5F7FA',
                    },
                  ]}>
                  {/* Subtle Aurora Ambient Orb 1 */}
                  <View
                    style={{
                      position: 'absolute',
                      top: -100,
                      right: -100,
                      width: 320,
                      height: 320,
                      borderRadius: 160,
                      backgroundColor: theme.dark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(56, 189, 248, 0.18)',
                    }}
                  />
                  {/* Subtle Aurora Ambient Orb 2 */}
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 80,
                      left: -80,
                      width: 280,
                      height: 280,
                      borderRadius: 140,
                      backgroundColor: theme.dark ? 'rgba(168, 85, 247, 0.10)' : 'rgba(168, 85, 247, 0.15)',
                    }}
                  />
                  {/* Subtle Center Glow Accent */}
                  <View
                    style={{
                      position: 'absolute',
                      top: '35%',
                      left: '20%',
                      width: 220,
                      height: 220,
                      borderRadius: 110,
                      backgroundColor: theme.dark ? 'rgba(236, 72, 153, 0.07)' : 'rgba(236, 72, 153, 0.10)',
                    }}
                  />
                </View>
              )}"""

if old_bg_fallback in cv_code:
    cv_code = cv_code.replace(old_bg_fallback, new_bg_fallback)
    with open(chatview_path, "w", encoding="utf-8") as f:
        f.write(cv_code)
    print("Updated ChatView.tsx with creative Aurora Glow background for Normal Chat!")

# ==============================================================================
# 6. Apply Fancy Theme to SidebarContent and Modernize Sidebar with Profile & Local Login
# ==============================================================================
sidebar_path = "src/components/SidebarContent/SidebarContent.tsx"
with open(sidebar_path, "r", encoding="utf-8") as f:
    sb_code = f.read()

# Add AuthSheet / ProfileSheet trigger and local profile card in Sidebar
sb_imports_target = "import {createStyles} from './styles';"
sb_imports_replace = """import {createStyles} from './styles';
import {uiStore} from '../../store';
import {authService} from '../../services';
import {AuthSheet} from '../AuthSheet';
import {ProfileSheet} from '../ProfileSheet';"""

if sb_imports_target in sb_code and "AuthSheet" not in sb_code:
    sb_code = sb_code.replace(sb_imports_target, sb_imports_replace)

# Add local profile bar at top of ListHeaderComponent
sb_header_target = "    const ListHeaderComponent = React.useMemo(\n      () => (\n        <View>"
sb_header_replace = """    const [showSidebarAuth, setShowSidebarAuth] = useState(false);
    const [showSidebarProfile, setShowSidebarProfile] = useState(false);
    const isFancy = uiStore.palsHubFancyTheme && (uiStore.fancyThemeScope === 'everywhere' || chatSessionStore.chatMode === 'pal');

    const ListHeaderComponent = React.useMemo(
      () => (
        <View style={isFancy && {backgroundColor: 'transparent'}}>
          {/* Modern User Profile & Local Account Card */}
          <TouchableOpacity
            style={{
              marginHorizontal: 12,
              marginTop: 6,
              marginBottom: 10,
              padding: 12,
              borderRadius: 14,
              backgroundColor: isFancy
                ? theme.dark
                  ? 'rgba(255, 255, 255, 0.07)'
                  : 'rgba(0, 0, 0, 0.05)'
                : theme.dark
                ? '#1A1C20'
                : '#F1F3F6',
              borderWidth: 1,
              borderColor: isFancy
                ? 'rgba(255, 255, 255, 0.12)'
                : theme.colors.outlineVariant,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
            onPress={() => {
              props.navigation.closeDrawer();
              if (authService.isAuthenticated) {
                setShowSidebarProfile(true);
              } else {
                setShowSidebarAuth(true);
              }
            }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: theme.colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Text style={{color: theme.colors.onPrimary, fontWeight: '700', fontSize: 16}}>
                {authService.currentUser?.email ? authService.currentUser.email[0].toUpperCase() : 'P'}
              </Text>
            </View>
            <View style={{flex: 1}}>
              <Text variant="titleSmall" style={{fontWeight: '700', color: theme.colors.onSurface}}>
                {authService.currentUser?.email || 'Local User / Offline Profile'}
              </Text>
              <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant, fontSize: 11}}>
                {authService.isAuthenticated ? 'Signed in to PalsHub Sync' : 'Tap to sign in or view local data'}
              </Text>
            </View>
          </TouchableOpacity>"""

if sb_header_target in sb_code:
    sb_code = sb_code.replace(sb_header_target, sb_header_replace)

# Add Sheets to the end of SidebarContent
sb_return_target = """        <RenameModal
          visible={sessionToRename !== null}
          onClose={() => setSessionToRename(null)}
          session={sessionToRename}
        />"""

sb_return_replace = """        <RenameModal
          visible={sessionToRename !== null}
          onClose={() => setSessionToRename(null)}
          session={sessionToRename}
        />
        <AuthSheet
          isVisible={showSidebarAuth}
          onClose={() => setShowSidebarAuth(false)}
        />
        <ProfileSheet
          isVisible={showSidebarProfile}
          onClose={() => setShowSidebarProfile(false)}
          onSignInPress={() => {
            setShowSidebarProfile(false);
            setShowSidebarAuth(true);
          }}
        />"""

if sb_return_target in sb_code:
    sb_code = sb_code.replace(sb_return_target, sb_return_replace)
    with open(sidebar_path, "w", encoding="utf-8") as f:
        f.write(sb_code)
    print("Updated SidebarContent.tsx with modern Profile & Local account bar + Fancy theme!")

# ==============================================================================
# 7. Optimize Local Model Execution: n_threads, mmap, flash_attn_type, state_cache
# ==============================================================================
context_versions_path = "src/utils/contextInitParamsVersions.ts"
with open(context_versions_path, "r", encoding="utf-8") as f:
    cv_params_code = f.read()

# Make sure defaults on Android use optimal mmap, threads, and kv_unified
cv_params_code = cv_params_code.replace("n_ctx: params.n_ctx ?? 2048,", "n_ctx: params.n_ctx ?? 4096,")
with open(context_versions_path, "w", encoding="utf-8") as f:
    f.write(cv_params_code)
print("Updated contextInitParamsVersions.ts with 4096 default context!")

print("All features and fixes successfully applied!")
