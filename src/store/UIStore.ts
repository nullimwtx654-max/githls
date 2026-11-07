import {Appearance} from 'react-native';

import {makePersistable} from 'mobx-persist-store';
import {makeAutoObservable, runInAction} from 'mobx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  l10n,
  supportedLanguages as localesSupportedLanguages,
  type AvailableLanguage,
} from '../locales';
import {ErrorState} from '../utils/errors';
import type {ContextBudgetBreakdown} from '../utils/contextManagerEngine';
import {
  INITIAL_ONBOARDING_STATE,
  type OnboardingState,
  type OnboardingStep,
  type TopicKey,
} from './onboarding/types';

export type FancyThemeScope = 'palshub_only' | 'everywhere';
export type FancyThemeAccentTint =
  | 'monochrome'
  | 'pal_accent'
  | 'obsidian'
  | 'frost_blue'
  | 'rose_quartz'
  | 'violet_silk'
  | 'emerald_mist'
  | 'amber_gold';

export class UIStore {
  static readonly GROUP_KEYS = {
    READY_TO_USE: 'ready_to_use',
    AVAILABLE_TO_DOWNLOAD: 'available_to_download',
  } as const;

  pageStates = {
    modelsScreen: {
      filters: [] as string[],
      expandedGroups: {
        [UIStore.GROUP_KEYS.READY_TO_USE]: true,
      },
    },
  };

  // This is a flag to auto-navigate to the chat page after loading a model
  autoNavigatetoChat = true;

  //colorScheme = useColorScheme();
  colorScheme: 'light' | 'dark' =
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';

  // Current selected language (default to English)
  _language: AvailableLanguage = 'en';

  // List of supported languages (derived from locales registry)
  get supportedLanguages(): readonly AvailableLanguage[] {
    return localesSupportedLanguages;
  }

  displayMemUsage = false;

  iOSBackgroundDownloading = true;

  // ============================================================================
  // FANCY THEME CUSTOMIZATION SUITE (Disabled by default; Original Theme stays clean)
  // ============================================================================
  palsHubFancyTheme: boolean = false;
  /** Whether Fancy Theme applies only in PalsHub/Character chats or everywhere (including Normal Chat) */
  fancyThemeScope: FancyThemeScope = 'everywhere';
  /** Background image blur radius (0 - 30 px) */
  palsHubFancyBlurRadius: number = 8;
  /** Background dim/contrast overlay opacity (0.0 - 0.85) */
  palsHubFancyBgDim: number = 0.42;
  /** Background artwork vibrancy / opacity (0.20 - 1.00) */
  palsHubFancySaturation: number = 0.72;
  /** Header & Composer frosted glass opacity (0.15 - 0.95) */
  palsHubFancyGlassOpacity: number = 0.72;
  /** Message bubble background opacity (0.10 - 0.98) */
  palsHubFancyMsgBgOpacity: number = 0.74;
  /** Message text font size in px (11 - 22 px) — Slightly larger 16.5px default in Fancy Theme */
  palsHubFancyMsgSize: number = 16.5;
  /** Message line-height multiplier (1.15 - 1.85) */
  palsHubFancyLineHeightMultiplier: number = 1.48;
  /** Message bubble corner radius (4 - 28 px) */
  palsHubFancyBubbleRadius: number = 18;
  /** Frosted glass border opacity on bubbles (0.0 - 0.60) */
  palsHubFancyBorderOpacity: number = 0.16;
  /** Horizontal padding inside message bubbles (8 - 24 px) */
  palsHubFancyBubblePadding: number = 15;
  /** Maximum message bubble width percentage (70 - 100 %) */
  palsHubFancyChatWidth: number = 92;
  /** Subtle ambient shadow/glow intensity on bubbles (0.0 - 0.80) */
  palsHubFancyGlowIntensity: number = 0.15;
  /** Frosted glass color tint preset */
  palsHubFancyAccentTint: FancyThemeAccentTint = 'monochrome';
  /** Translucent frosted header bar */
  palsHubFancyHeaderTranslucent: boolean = true;
  /** Translucent frosted input composer bar */
  palsHubFancyComposerTranslucent: boolean = true;
  /** Show character avatars next to chat messages */
  palsHubFancyShowAvatars: boolean = true;

  // ============================================================================
  // CUSTOM CSS ENGINE (SillyTavern / Tavo compatible CSS rules)
  // ============================================================================
  customCssEnabled: boolean = false;
  customCss: string = '';

  // ============================================================================
  // SMART CONTEXT MANAGEMENT ENGINE (Default 64k = 65,536 tokens)
  // ============================================================================
  contextWindowLimit: number = 65536;
  reservedOutputTokens: number = 1024;
  lastContextBreakdown: ContextBudgetBreakdown | null = null;

  benchmarkShareDialog = {
    shouldShow: true,
  };

  // Warning state for chat-related warnings (like multimodal warnings)
  chatWarning: ErrorState | null = null;

  // Models for which the tool-compatibility banner has already been shown.
  // Persisted so each model warns at most once per device.
  toolCompatWarnedModels: string[] = [];

  // Onboarding flow gating: persisted; default false on a fresh install.
  // Once flipped true, the OnboardingStack never re-mounts in this app
  // lifetime.
  hasCompletedOnboarding: boolean = false;

  // Frozen at onboarding completion; consumed by future Homepage
  // pal-suggestion surfaces. Never re-edited after the single write in
  // `completeOnboarding`.
  onboardingTopicsSnapshot: TopicKey[] = [];

  // Per-session, in-memory only. Reset on completion. Not persisted.
  onboardingState: OnboardingState = {...INITIAL_ONBOARDING_STATE};

  // Per-modelId dismissal of the download banner. Per-session — once the
  // download completes, the entry can be cleared so a fresh ready-to-load
  // state isn't pre-dismissed.
  dismissedDownloadIds: string[] = [];

  /**
   * Determines whether the Fancy Theme should be active for the current screen/session
   */
  isFancyActive(hasActivePal: boolean): boolean {
    if (!this.palsHubFancyTheme) {
      return false;
    }
    return this.fancyThemeScope === 'everywhere' || hasActivePal;
  }

  hasWarnedToolCompat(modelId: string): boolean {
    return this.toolCompatWarnedModels.includes(modelId);
  }

  markToolCompatWarned(modelId: string) {
    runInAction(() => {
      if (!this.toolCompatWarnedModels.includes(modelId)) {
        this.toolCompatWarnedModels.push(modelId);
      }
    });
  }

  showError(message: string) {
    console.error(message);
  }

  setChatWarning(warning: ErrorState | null) {
    runInAction(() => {
      this.chatWarning = warning;
    });
  }

  clearChatWarning() {
    runInAction(() => {
      this.chatWarning = null;
    });
  }

  constructor() {
    makeAutoObservable(this);
    makePersistable(this, {
      name: 'UIStore',
      properties: [
        'pageStates',
        'colorScheme',
        'autoNavigatetoChat',
        'displayMemUsage',
        'benchmarkShareDialog',
        '_language',
        'toolCompatWarnedModels',
        'hasCompletedOnboarding',
        'onboardingTopicsSnapshot',
        'palsHubFancyTheme',
        'fancyThemeScope',
        'palsHubFancyBlurRadius',
        'palsHubFancyBgDim',
        'palsHubFancySaturation',
        'palsHubFancyGlassOpacity',
        'palsHubFancyMsgBgOpacity',
        'palsHubFancyMsgSize',
        'palsHubFancyLineHeightMultiplier',
        'palsHubFancyBubbleRadius',
        'palsHubFancyBorderOpacity',
        'palsHubFancyBubblePadding',
        'palsHubFancyChatWidth',
        'palsHubFancyGlowIntensity',
        'palsHubFancyAccentTint',
        'palsHubFancyHeaderTranslucent',
        'palsHubFancyComposerTranslucent',
        'palsHubFancyShowAvatars',
        'customCssEnabled',
        'customCss',
        'contextWindowLimit',
        'reservedOutputTokens',
      ],
      storage: AsyncStorage,
    });

    this.iOSBackgroundDownloading = true;
  }

  setContextWindowLimit(limit: number) {
    runInAction(() => {
      this.contextWindowLimit = Math.max(2048, Math.min(262144, limit));
    });
  }

  setReservedOutputTokens(tokens: number) {
    runInAction(() => {
      this.reservedOutputTokens = Math.max(128, Math.min(32768, tokens));
    });
  }

  setLastContextBreakdown(breakdown: ContextBudgetBreakdown | null) {
    runInAction(() => {
      this.lastContextBreakdown = breakdown;
    });
  }

  setPalsHubFancyTheme(enabled: boolean) {
    runInAction(() => {
      this.palsHubFancyTheme = enabled;
    });
  }

  setFancyThemeScope(scope: FancyThemeScope) {
    runInAction(() => {
      this.fancyThemeScope = scope;
    });
  }

  setPalsHubFancyBlurRadius(radius: number) {
    runInAction(() => {
      this.palsHubFancyBlurRadius = Math.max(0, Math.min(30, radius));
    });
  }

  setPalsHubFancyBgDim(dim: number) {
    runInAction(() => {
      this.palsHubFancyBgDim = Math.max(0, Math.min(0.85, dim));
    });
  }

  setPalsHubFancySaturation(sat: number) {
    runInAction(() => {
      this.palsHubFancySaturation = Math.max(0.2, Math.min(1.0, sat));
    });
  }

  setPalsHubFancyGlassOpacity(opacity: number) {
    runInAction(() => {
      this.palsHubFancyGlassOpacity = Math.max(0.15, Math.min(0.95, opacity));
    });
  }

  setPalsHubFancyMsgBgOpacity(opacity: number) {
    runInAction(() => {
      this.palsHubFancyMsgBgOpacity = Math.max(0.1, Math.min(0.98, opacity));
    });
  }

  setPalsHubFancyMsgSize(size: number) {
    runInAction(() => {
      this.palsHubFancyMsgSize = Math.max(11, Math.min(22, size));
    });
  }

  setPalsHubFancyLineHeightMultiplier(mult: number) {
    runInAction(() => {
      this.palsHubFancyLineHeightMultiplier = Math.max(
        1.15,
        Math.min(1.85, mult),
      );
    });
  }

  setPalsHubFancyBubbleRadius(radius: number) {
    runInAction(() => {
      this.palsHubFancyBubbleRadius = Math.max(4, Math.min(28, radius));
    });
  }

  setPalsHubFancyBorderOpacity(opacity: number) {
    runInAction(() => {
      this.palsHubFancyBorderOpacity = Math.max(0, Math.min(0.6, opacity));
    });
  }

  setPalsHubFancyBubblePadding(padding: number) {
    runInAction(() => {
      this.palsHubFancyBubblePadding = Math.max(8, Math.min(24, padding));
    });
  }

  setPalsHubFancyChatWidth(widthPct: number) {
    runInAction(() => {
      this.palsHubFancyChatWidth = Math.max(70, Math.min(100, widthPct));
    });
  }

  setPalsHubFancyGlowIntensity(glow: number) {
    runInAction(() => {
      this.palsHubFancyGlowIntensity = Math.max(0, Math.min(0.8, glow));
    });
  }

  setPalsHubFancyAccentTint(tint: FancyThemeAccentTint) {
    runInAction(() => {
      this.palsHubFancyAccentTint = tint;
    });
  }

  setPalsHubFancyHeaderTranslucent(val: boolean) {
    runInAction(() => {
      this.palsHubFancyHeaderTranslucent = val;
    });
  }

  setPalsHubFancyComposerTranslucent(val: boolean) {
    runInAction(() => {
      this.palsHubFancyComposerTranslucent = val;
    });
  }

  setPalsHubFancyShowAvatars(val: boolean) {
    runInAction(() => {
      this.palsHubFancyShowAvatars = val;
    });
  }

  resetFancyThemeDefaults() {
    runInAction(() => {
      this.fancyThemeScope = 'everywhere';
      this.palsHubFancyBlurRadius = 8;
      this.palsHubFancyBgDim = 0.42;
      this.palsHubFancySaturation = 0.72;
      this.palsHubFancyGlassOpacity = 0.72;
      this.palsHubFancyMsgBgOpacity = 0.74;
      this.palsHubFancyMsgSize = 16.5;
      this.palsHubFancyLineHeightMultiplier = 1.48;
      this.palsHubFancyBubbleRadius = 18;
      this.palsHubFancyBorderOpacity = 0.16;
      this.palsHubFancyBubblePadding = 15;
      this.palsHubFancyChatWidth = 92;
      this.palsHubFancyGlowIntensity = 0.15;
      this.palsHubFancyAccentTint = 'monochrome';
      this.palsHubFancyHeaderTranslucent = true;
      this.palsHubFancyComposerTranslucent = true;
      this.palsHubFancyShowAvatars = true;
    });
  }

  setCustomCssEnabled(enabled: boolean) {
    runInAction(() => {
      this.customCssEnabled = enabled;
    });
  }

  setCustomCss(css: string) {
    runInAction(() => {
      this.customCss = css;
    });
  }

  setValue<T extends keyof typeof this.pageStates>(
    page: T,
    key: keyof (typeof this.pageStates)[T],
    value: any,
  ) {
    runInAction(() => {
      if (this.pageStates[page]) {
        this.pageStates[page][key] = value;
      } else {
        console.error(`Page '${page}' does not exist in pageStates`);
      }
    });
  }

  setColorScheme(colorScheme: 'light' | 'dark') {
    runInAction(() => {
      this.colorScheme = colorScheme;
    });
  }

  setLanguage(language: AvailableLanguage) {
    runInAction(() => {
      this._language = language;
    });
  }
  get language() {
    return this._language in l10n ? this._language : 'en';
  }

  get l10n() {
    return l10n[this.language];
  }

  setAutoNavigateToChat(value: boolean) {
    runInAction(() => {
      this.autoNavigatetoChat = value;
    });
  }

  setDisplayMemUsage(value: boolean) {
    runInAction(() => {
      this.displayMemUsage = value;
    });
  }

  setiOSBackgroundDownloading(value: boolean) {
    runInAction(() => {
      this.iOSBackgroundDownloading = value;
    });
  }

  setBenchmarkShareDialogPreference(shouldShow: boolean) {
    runInAction(() => {
      this.benchmarkShareDialog.shouldShow = shouldShow;
    });
  }

  setOnboardingStep(step: OnboardingStep) {
    runInAction(() => {
      this.onboardingState.currentStep = step;
    });
  }

  setOnboardingTopic(key: TopicKey | null) {
    runInAction(() => {
      this.onboardingState.selectedTopic = key;
    });
  }

  setOnboardingModelId(modelId: string | null) {
    runInAction(() => {
      this.onboardingState.selectedModelId = modelId;
    });
  }

  completeOnboarding({
    topic,
    modelId: _modelId,
  }: {
    topic: TopicKey | null;
    modelId: string | null;
  }) {
    runInAction(() => {
      this.hasCompletedOnboarding = true;
      this.onboardingTopicsSnapshot = topic === null ? [] : [topic];
      this.onboardingState = {...INITIAL_ONBOARDING_STATE};
    });
  }

  resetOnboarding() {
    runInAction(() => {
      this.hasCompletedOnboarding = false;
      this.onboardingTopicsSnapshot = [];
      this.onboardingState = {...INITIAL_ONBOARDING_STATE};
    });
  }

  replayOnboarding() {
    runInAction(() => {
      this.hasCompletedOnboarding = false;
      this.onboardingState = {...INITIAL_ONBOARDING_STATE};
    });
  }

  isDownloadBannerDismissed(modelId: string): boolean {
    return this.dismissedDownloadIds.includes(modelId);
  }

  dismissDownloadBanner(modelId: string) {
    runInAction(() => {
      if (!this.dismissedDownloadIds.includes(modelId)) {
        this.dismissedDownloadIds.push(modelId);
      }
    });
  }

  clearDownloadBannerDismissal(modelId: string) {
    runInAction(() => {
      this.dismissedDownloadIds = this.dismissedDownloadIds.filter(
        id => id !== modelId,
      );
    });
  }
}

export const uiStore = new UIStore();
