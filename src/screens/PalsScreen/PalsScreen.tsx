import React, {useState, useEffect, useCallback, useContext, useMemo} from 'react';
import {
  View,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  StyleSheet,
  TextInput as RNTextInput,
  useWindowDimensions,
} from 'react-native';
import {Button, Text} from 'react-native-paper';
import {observer} from 'mobx-react-lite';

import {
  PlusIcon,
  DownloadSmIcon,
  PalIcon,
  SettingsIcon,
  SearchIcon,
} from '../../assets/icons';

import {useTheme} from '../../hooks';
import {createStyles} from './styles';
import {handlePalByType} from '../../utils/pal-type-guards';
import {L10nContext} from '../../utils';
import {chunkIntoRows, computePalGridLayout} from './palGridLayout';
import {myPals, saveToMyPals} from './myPals';

import type {PalGridItem} from './palGridLayout';

// Components
import {
  BottomActionBar,
  BottomActionType,
  CompactAuthBar,
  ExpandableSearch,
  FilterChips,
  FilterType,
  PalGridRow,
  ProfileSheet,
} from './components';

import {SectionDivider} from '../../components/PalsSheets/SectionDivider';

// Unified pal sheet component
import {PalSheet} from '../../components/PalsSheets';
import {AuthSheet, PalDetailSheet} from '../../components/PalsHub';
import {SillyTavernPresetSheet, GroupChatSheet} from '../../components';

// Pal template factories & card importers
import {
  createNewAssistantPal,
  createNewRoleplayPal,
  createNewVideoPal,
  preparePalForEditing,
} from '../../utils/pal-templates';
import {pickAndParseCharacterCard} from '../../utils/characterCardParser';
import {importAllPocketPalData, pickJsonFile} from '../../utils/importUtils';

// Services and stores
import {authService, syncService} from '../../services';
import {palStore, purchaseStore, Pal} from '../../store';
import {hasVideoCapability} from '../../utils/pal-capabilities';

import type {PalsHubPal} from '../../types/palshub';

/**
 * Extracts all explicit and metadata-inferred tags from a Pal or PalsHubPal
 */
function extractPalMetadataAndTags(item: Pal | PalsHubPal): {
  tags: string[];
  searchableBlob: string;
} {
  const anyPal = item as any;
  const cardData =
    anyPal.characterCard?.data ||
    anyPal.greeting?.characterCard?.data ||
    {};

  const rawTags = new Set<string>();

  if (Array.isArray(anyPal.tags)) {
    for (const t of anyPal.tags) {
      if (typeof t === 'string' && t.trim()) {
        rawTags.add(t.trim());
      } else if (t && typeof t.name === 'string') {
        rawTags.add(t.name.trim());
      }
    }
  }
  if (Array.isArray(cardData.tags)) {
    for (const t of cardData.tags) {
      if (typeof t === 'string' && t.trim()) {
        rawTags.add(t.trim());
      }
    }
  }
  if (Array.isArray(anyPal.categories)) {
    for (const c of anyPal.categories) {
      if (typeof c === 'string' && c.trim()) {
        rawTags.add(c.trim());
      } else if (c && typeof c.name === 'string') {
        rawTags.add(c.name.trim());
      }
    }
  }

  // Structural metadata badges
  const loreEntries = cardData.character_book?.entries;
  if (Array.isArray(loreEntries) && loreEntries.length > 0) {
    rawTags.add('Lorebook');
  }
  const altGreetings =
    cardData.alternate_greetings ||
    anyPal.alternateGreetings ||
    anyPal.greeting?.alternateGreetings;
  if (Array.isArray(altGreetings) && altGreetings.length > 0) {
    rawTags.add('Multi-Greeting');
  }
  if (anyPal.characterCard || anyPal.greeting?.characterCard) {
    rawTags.add('Card V4');
  }

  const combinedText = [
    anyPal.name || '',
    anyPal.description || '',
    anyPal.systemPrompt || '',
    cardData.description || '',
    cardData.personality || '',
    cardData.scenario || '',
    cardData.first_mes || '',
    anyPal.greeting?.text || '',
    cardData.creator || '',
    cardData.creator_notes || '',
    cardData.character_version || '',
    Array.isArray(loreEntries)
      ? loreEntries
          .map((e: any) => `${(e.keys || []).join(' ')} ${e.content || ''}`)
          .join(' ')
      : '',
  ]
    .join(' ')
    .toLowerCase();

  // Semantic category inference from Character Card metadata
  if (/roman(ce|tic)|affection|partner|love|dating|flirt/i.test(combinedText)) {
    rawTags.add('Romance');
  }
  if (/fantasy|magic|dragon|kingdom|elf|sword|dungeon/i.test(combinedText)) {
    rawTags.add('Fantasy');
  }
  if (/cyber|sci-fi|space|android|future|neon|ai\b/i.test(combinedText)) {
    rawTags.add('Sci-Fi');
  }
  if (/modern|career|city|office|college|walk|cafe|apartment/i.test(combinedText)) {
    rawTags.add('Modern');
  }
  if (/\{\{char\}\}|\{\{user\}\}|roleplay|scenario/i.test(combinedText)) {
    rawTags.add('Roleplay');
  }

  const tags = Array.from(rawTags);
  const searchableBlob = `${combinedText} ${tags.join(' ').toLowerCase()}`;
  return {tags, searchableBlob};
}

const SectionGrid: React.FC<{
  section: {title: string; data: PalGridItem[]};
  columns: number;
  cardWidth: number;
  onPalPress: (pal: PalGridItem) => void;
  onUpdatePress: (palshubId: string) => void;
}> = ({section, columns, cardWidth, onPalPress, onUpdatePress}) => (
  <View>
    {section.title ? <SectionDivider label={section.title} /> : null}
    {chunkIntoRows(section.data, columns).map(row => (
      <PalGridRow
        key={row.key}
        row={row}
        cardWidth={cardWidth}
        onPalPress={onPalPress}
        onUpdatePress={onUpdatePress}
      />
    ))}
  </View>
);

export const PalsScreen: React.FC = observer(() => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const l10n = useContext(L10nContext);
  const {width: windowWidth} = useWindowDimensions();

  // Navigation state
  const [activeAction, setActiveAction] = useState<BottomActionType>('search');
  const [activeFilter, setActiveFilter] = useState<FilterType>('my-pals');

  // Deep Character Metadata & Tag Categorization Search state
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchResults, setSearchResults] = useState<PalsHubPal[]>([]);
  const [metadataQuery, setMetadataQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [showTagBrowser, setShowTagBrowser] = useState(false);

  // Sheet states
  const [showProfile, setShowProfile] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showPalDetail, setShowPalDetail] = useState(false);
  const [selectedPal, setSelectedPal] = useState<PalsHubPal | null>(null);
  const [showPresetSheet, setShowPresetSheet] = useState(false);
  const [showGroupChatSheet, setShowGroupChatSheet] = useState(false);

  // Unified pal sheet state
  const [showPalSheet, setShowPalSheet] = useState(false);
  const [currentPal, setCurrentPal] = useState<Partial<Pal> | null>(null);

  // Loading state
  const [refreshing, setRefreshing] = useState(false);

  // Auth bar state
  const [showAuthBar, setShowAuthBar] = useState(true);

  useEffect(() => {
    const runInitialSetup = async () => {
      try {
        if (authService.isAuthenticated) {
          const needsSync = await syncService.needsSync();
          if (needsSync) {
            await syncService.syncAll();
          }
        }
      } catch (error) {
        console.error('Error during initial setup:', error);
      }
    };

    runInitialSetup();
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePal = (type: 'assistant' | 'roleplay' | 'video') => {
    let newPal: Partial<Pal>;

    switch (type) {
      case 'assistant':
        newPal = createNewAssistantPal();
        break;
      case 'roleplay':
        newPal = createNewRoleplayPal();
        break;
      case 'video':
        newPal = createNewVideoPal();
        break;
      default:
        newPal = createNewAssistantPal();
    }

    setCurrentPal(newPal);
    setShowPalSheet(true);
  };

  const handleImportV4CharacterCard = async () => {
    try {
      const parsedPalData = await pickAndParseCharacterCard();
      if (!parsedPalData) {
        return;
      }
      const created = await saveToMyPals(parsedPalData);
      setActiveFilter('my-pals');
      Alert.alert(
        'Character Card Imported',
        `Saved "${created.name}" to My Pals with ${
          (created.greeting?.alternateGreetings?.length || 0) + 1
        } greeting(s)${
          created.characterCard?.data?.character_book?.entries?.length
            ? ` and ${created.characterCard.data.character_book.entries.length} Lorebook entries`
            : ''
        }.`,
      );
    } catch (err: any) {
      Alert.alert(
        'Card Import Error',
        err?.message || 'Failed to parse PNG/JSON character card.',
      );
    }
  };

  const handleImportTavoExport = async () => {
    try {
      const fileUri = await pickJsonFile();
      if (!fileUri) {
        return;
      }
      const res = await importAllPocketPalData(fileUri);
      setActiveFilter('my-pals');
      Alert.alert(
        'Tavo (.tbk) / Unified Import Complete',
        `Saved ${res.pals} characters to My Pals, plus ${res.chats} chats, ${res.apiProviders} API providers, and ${res.presets} presets.`,
      );
    } catch (err: any) {
      Alert.alert(
        'Tavo Import Error',
        err?.message || 'Failed to import Tavo export file.',
      );
    }
  };

  const loadData = async () => {
    try {
      await palStore.searchPalsHubPals({sortBy: 'newest', limit: 20});
      if (authService.isAuthenticated) {
        await Promise.all([
          palStore.loadUserLibrary(),
          palStore.loadUserCreatedPals(),
        ]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleActionPress = (action: BottomActionType) => {
    setActiveAction(action);

    switch (action) {
      case 'search':
        setShowTagBrowser(prev => !prev);
        break;
      case 'profile':
        if (authService.isAuthenticated) {
          setShowProfile(true);
        } else {
          setShowAuth(true);
        }
        break;
    }
  };

  const handlePalPress = (pal: PalsHubPal | Pal) => {
    handlePalByType(pal, {
      onLocalPal: localPal => {
        handleEditPal(localPal);
      },
      onPalsHubPal: palsHubPal => {
        setSelectedPal(palsHubPal);
        setShowPalDetail(true);
      },
    });
  };

  const handleUpdatePress = (palshubId: string) => {
    const pal =
      palStore.cachedPalsHubPals.find(hubPal => hubPal.id === palshubId) ??
      purchaseStore.recordFor(palshubId)?.pendingUpdate?.pal;
    if (pal) {
      setSelectedPal(pal);
      setShowPalDetail(true);
    }
  };

  const handleEditPal = (pal: Pal) => {
    const preparedPal = preparePalForEditing(pal);
    setCurrentPal(preparedPal);
    setShowPalSheet(true);
  };

  const ownedPals = () =>
    myPals(
      palStore.getLocalPals(),
      palStore.getDownloadedPalsHubPals(),
      authService.isAuthenticated ? palStore.userLibrary : [],
      authService.isAuthenticated ? palStore.userCreatedPals : [],
      palStore.cachedPalsHubPals,
      Object.values(purchaseStore.records),
    );

  const getBaseData = (): (PalsHubPal | Pal)[] => {
    if (isSearchExpanded && searchResults.length > 0) {
      return searchResults;
    }

    const localPals = palStore.getLocalPals();
    const downloadedPals = palStore.getDownloadedPalsHubPals();
    const hubPals = palStore.cachedPalsHubPals;

    switch (activeFilter) {
      case 'my-pals': {
        const {installed, purchased, library} = ownedPals();
        return [...installed, ...purchased, ...library];
      }
      case 'local':
        return [...localPals, ...downloadedPals];
      case 'video':
        return [
          ...localPals.filter(p => hasVideoCapability(p)),
          ...downloadedPals.filter(p => hasVideoCapability(p)),
          ...hubPals.filter(p =>
            p.categories?.some(c => c.name.toLowerCase().includes('video')),
          ),
        ];
      case 'free':
        return [...localPals, ...hubPals.filter(p => p.price_cents === 0)];
      case 'premium':
        return hubPals.filter(p => p.price_cents > 0);
      case 'all':
      default: {
        const {installed, purchased, library} = ownedPals();
        return [...installed, ...purchased, ...library, ...hubPals];
      }
    }
  };

  const baseData = getBaseData();

  // Compute all discovered tags + counts across all characters
  const discoveredTagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of baseData) {
      const {tags} = extractPalMetadataAndTags(item);
      for (const t of tags) {
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [baseData]);

  // Apply Deep Character Card Metadata Query & Tag Categorization Filter
  const applyMetadataAndTagFilter = useCallback(
    (list: (PalsHubPal | Pal)[]) => {
      const q = metadataQuery.trim().toLowerCase();
      return list.filter(item => {
        const {tags, searchableBlob} = extractPalMetadataAndTags(item);
        if (
          selectedTag !== 'ALL' &&
          !tags.some(t => t.toLowerCase() === selectedTag.toLowerCase())
        ) {
          return false;
        }
        if (q && !searchableBlob.includes(q)) {
          return false;
        }
        return true;
      });
    },
    [metadataQuery, selectedTag],
  );

  const filteredData = applyMetadataAndTagFilter(baseData);

  const getSectionedData = (): Array<{
    title: string;
    data: (PalsHubPal | Pal)[];
  }> => {
    if (
      (isSearchExpanded && searchResults.length > 0) ||
      metadataQuery.trim().length > 0 ||
      selectedTag !== 'ALL'
    ) {
      return [
        {
          title:
            selectedTag !== 'ALL'
              ? `Categorized by #${selectedTag} (${filteredData.length})`
              : metadataQuery.trim()
              ? `Metadata Search Results (${filteredData.length})`
              : '',
          data: filteredData,
        },
      ];
    }

    const hubPals = palStore.cachedPalsHubPals;

    switch (activeFilter) {
      case 'all':
      case 'my-pals': {
        const sections: Array<{title: string; data: (PalsHubPal | Pal)[]}> = [];
        const {installed, purchased, library} = ownedPals();

        if (installed.length + purchased.length > 0) {
          sections.push({
            title: l10n.palsScreen.sectionTitles.myPalsLocal,
            data: [...installed, ...purchased],
          });
        }
        if (library.length > 0) {
          sections.push({
            title: l10n.palsScreen.sectionTitles.myLibrary,
            data: library,
          });
        }
        if (activeFilter === 'all' && hubPals.length > 0) {
          sections.push({
            title: l10n.palsScreen.sectionTitles.discoverPals,
            data: hubPals,
          });
        }

        return sections;
      }
      default:
        return [{title: '', data: filteredData}];
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <PlusIcon stroke={theme.colors.onSurfaceVariant} width={48} height={48} />
      <Text style={styles.emptyStateText}>
        {metadataQuery.trim() || selectedTag !== 'ALL'
          ? `No Characters matched "${metadataQuery || `#${selectedTag}`}".\nTap "All Tags" to clear filters.`
          : activeFilter === 'local' || activeFilter === 'my-pals'
          ? 'No Pals yet.\nCreate your first Pal or import a V1–V4 Character Card (PNG/JSON) or Tavo (.tbk) export!'
          : 'No Pals found.\nTry adjusting your filters or search.'}
      </Text>
    </View>
  );

  const restoreRow =
    purchaseStore.availability === 'ready' ? (
      <Button
        testID="restore-purchases-row"
        mode="text"
        onPress={() => purchaseStore.restore()}
        loading={purchaseStore.isRestoring}
        disabled={purchaseStore.isRestoring}
        style={styles.restoreRow}>
        {l10n.palsScreen.purchase.restorePurchases}
      </Button>
    ) : undefined;

  const {columns, cardWidth} = computePalGridLayout(windowWidth);
  const rows = chunkIntoRows(filteredData, columns);
  const sectionedData = getSectionedData();
  const shouldUseSections =
    (activeFilter === 'all' || activeFilter === 'my-pals') &&
    sectionedData.length > 1;

  const quickBarChipStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.dark ? '#141416' : '#F2F3F5',
  };

  return (
    <View style={styles.container}>
      {!authService.isAuthenticated && showAuthBar && (
        <CompactAuthBar
          isAuthenticated={authService.isAuthenticated}
          onSignInPress={() => setShowAuth(true)}
          onProfilePress={() => setShowProfile(true)}
          onDismiss={() => setShowAuthBar(false)}
        />
      )}

      <ExpandableSearch
        isExpanded={isSearchExpanded}
        onToggle={() => setIsSearchExpanded(!isSearchExpanded)}
        onSearchResults={setSearchResults}
      />

      {/* Deep Character Metadata Search & Tag Categorization Browser */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 6,
          paddingBottom: 4,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 12,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.border,
            backgroundColor: theme.dark ? '#141417' : '#F4F5F7',
            paddingHorizontal: 12,
            height: 38,
          }}>
          <SearchIcon
            width={16}
            height={16}
            stroke={theme.colors.onSurfaceVariant}
          />
          <RNTextInput
            value={metadataQuery}
            onChangeText={setMetadataQuery}
            placeholder="Search metadata: name, personality, scenario, lorebook, #tags..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            style={{
              flex: 1,
              marginLeft: 8,
              fontSize: 13,
              color: theme.colors.onSurface,
              paddingVertical: 0,
            }}
            testID="character-metadata-search-input"
          />
          {(metadataQuery.length > 0 || selectedTag !== 'ALL') && (
            <TouchableOpacity
              onPress={() => {
                setMetadataQuery('');
                setSelectedTag('ALL');
              }}>
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: '700',
                  color: theme.colors.primary,
                }}>
                Reset
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Horizontal Tag Categorization Pill Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: 6,
            paddingVertical: 8,
          }}>
          <TouchableOpacity
            onPress={() => setSelectedTag('ALL')}
            style={{
              paddingHorizontal: 11,
              paddingVertical: 5,
              borderRadius: 14,
              backgroundColor:
                selectedTag === 'ALL'
                  ? theme.colors.primary
                  : theme.dark
                  ? '#1A1A1E'
                  : '#EAECEF',
            }}>
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: '700',
                color:
                  selectedTag === 'ALL'
                    ? theme.colors.onPrimary
                    : theme.colors.onSurface,
              }}>
              All Tags ({baseData.length})
            </Text>
          </TouchableOpacity>

          {discoveredTagCounts.map(([tag, count]) => {
            const active = selectedTag.toLowerCase() === tag.toLowerCase();
            return (
              <TouchableOpacity
                key={tag}
                onPress={() => setSelectedTag(active ? 'ALL' : tag)}
                style={{
                  paddingHorizontal: 11,
                  paddingVertical: 5,
                  borderRadius: 14,
                  backgroundColor: active
                    ? theme.colors.primary
                    : theme.dark
                    ? '#1A1A1E'
                    : '#EAECEF',
                }}>
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: active ? '700' : '600',
                    color: active
                      ? theme.colors.onPrimary
                      : theme.colors.onSurface,
                  }}>
                  #{tag} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FilterChips
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        isAuthenticated={authService.isAuthenticated}
      />

      {/* PalsHub Quick Action Toolbar: V4 Card Import, Group Chat, Tavo (.tbk) Import, ST Presets */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          paddingHorizontal: 16,
          paddingBottom: 8,
        }}>
        <TouchableOpacity
          style={quickBarChipStyle}
          onPress={handleImportV4CharacterCard}
          testID="import-v4-card-btn">
          <PlusIcon width={14} height={14} stroke={theme.colors.onSurface} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: theme.colors.onSurface,
            }}>
            Import Card (PNG/JSON)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={quickBarChipStyle}
          onPress={() => setShowGroupChatSheet(true)}
          testID="open-group-chat-btn">
          <PalIcon width={14} height={14} stroke={theme.colors.onSurface} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: theme.colors.onSurface,
            }}>
            Group Chat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={quickBarChipStyle}
          onPress={handleImportTavoExport}
          testID="import-tavo-btn">
          <DownloadSmIcon
            width={14}
            height={14}
            stroke={theme.colors.onSurface}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: theme.colors.onSurface,
            }}>
            Tavo (.tbk) Import
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={quickBarChipStyle}
          onPress={() => setShowPresetSheet(true)}
          testID="open-st-presets-btn">
          <SettingsIcon
            width={14}
            height={14}
            stroke={theme.colors.onSurface}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: theme.colors.onSurface,
            }}>
            ST Presets & Regex
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {shouldUseSections ? (
        <ScrollView
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}>
          {sectionedData.length === 0
            ? renderEmptyState()
            : sectionedData.map((section, index) => (
                <SectionGrid
                  key={`section-${index}`}
                  section={section}
                  columns={columns}
                  cardWidth={cardWidth}
                  onPalPress={handlePalPress}
                  onUpdatePress={handleUpdatePress}
                />
              ))}
          {restoreRow}
        </ScrollView>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={row => row.key}
          renderItem={({item}) => (
            <PalGridRow
              row={item}
              cardWidth={cardWidth}
              onPalPress={handlePalPress}
              onUpdatePress={handleUpdatePress}
            />
          )}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={restoreRow}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          testID="pals-flat-list"
        />
      )}

      <BottomActionBar
        activeAction={activeAction}
        onActionPress={handleActionPress}
        onCreatePal={handleCreatePal}
        isAuthenticated={authService.isAuthenticated}
      />

      {showProfile && (
        <ProfileSheet
          isVisible={showProfile}
          onClose={() => setShowProfile(false)}
          onSignInPress={() => setShowAuth(true)}
        />
      )}

      {showAuth && (
        <AuthSheet
          isVisible={showAuth}
          onClose={() => {
            setShowAuth(false);
            if (!authService.isAuthenticated) {
              purchaseStore.cancelLinkRequest();
            }
          }}
        />
      )}

      {selectedPal && (
        <PalDetailSheet
          isVisible={showPalDetail}
          pal={selectedPal}
          onSignInPress={() => setShowAuth(true)}
          onClose={() => {
            setShowPalDetail(false);
            setSelectedPal(null);
          }}
        />
      )}

      {showPalSheet && currentPal && (
        <PalSheet
          isVisible={showPalSheet}
          onClose={() => {
            setShowPalSheet(false);
            setCurrentPal(null);
          }}
          pal={currentPal}
        />
      )}

      <SillyTavernPresetSheet
        isVisible={showPresetSheet}
        onDismiss={() => setShowPresetSheet(false)}
      />

      <GroupChatSheet
        isVisible={showGroupChatSheet}
        onDismiss={() => setShowGroupChatSheet(false)}
      />
    </View>
  );
});

export default PalsScreen;
