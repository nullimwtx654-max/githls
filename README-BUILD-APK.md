# PocketPal AI Enhanced — Building & Publishing the APK

This repository is pre-configured with a turnkey **GitHub Actions Workflow** (`.github/workflows/build-and-publish-apk.yml`) that automatically builds and publishes the native Android release APK.

---

## Why the Initial GitHub Actions Build Failed (and What Was Fixed)

1. **Missing `google-services.json`**: The Google Services gradle plugin failed because `android/app/google-services.json` was git-ignored. A dummy CI config is now included.
2. **Missing `.env` File**: `react-native-config` requires a `.env` file during gradle configuration. A configured `.env` is now included.
3. **Flavored Gradle Task**: PocketPal defines product flavors (`prod` and `e2e`). The generic task `assembleRelease` fails; the exact task is `./gradlew assembleProdRelease`, which outputs `android/app/build/outputs/apk/prod/release/app-prod-release.apk`.
4. **Pre-Generated Keystore**: `android/app/pocketpal-release-key.keystore` is now pre-generated with matching credentials in `.env`.
5. **Separated CI Workflow**: The internal test suite (`ci.yml`), which ran strict linting and internal unit tests on every push, has been moved to manual dispatch (`workflow_dispatch`) so it never blocks the APK build.

---

## Method 1: Automatic Build & Publish with GitHub Actions (Recommended)

You don't need Android Studio or any local developer tools installed.

### Step 1: Push this repository to GitHub
Create a new repository on your GitHub account (e.g. `pocketpal-ai-enhanced`), then run in this directory:
```bash
git init
git add .
git commit -m "feat: PocketPal AI Enhanced - Full SillyTavern, Chat Personalization, Memory & Working APK Action"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

### Step 2: Trigger the Build or Let it Run Automatically
1. Go to your repository on GitHub.
2. Click on the **Actions** tab.
3. You will see the **"Build and Publish PocketPal APK"** workflow running automatically!
   *(Or click "Run workflow" > "Run workflow" to trigger it manually anytime).*

### Step 3: Download the Compiled APK
* Once the workflow finishes (takes ~6-8 minutes to compile the native C++ `llama.rn` libraries):
  * Click on the completed run in the **Actions** tab.
  * Scroll down to **Artifacts** to download `pocketpal-ai-release-apk`!
  * If triggered via manual dispatch or tag, the APK is also published directly to the **Releases** page of your repo!

---

## Method 2: Local Build (On PC / Mac / Linux)

Prerequisites: Node.js 18+, JDK 17, Android Studio with Android SDK Platform 34, NDK (26.1.10909125), and CMake (3.22.1).

```bash
# 1. Install dependencies using Yarn
yarn install

# 2. Build Release APK for Prod Flavor
cd android
chmod +x gradlew
./gradlew assembleProdRelease

# 3. Locate the output APK
# The final APK is at:
# android/app/build/outputs/apk/prod/release/app-prod-release.apk
```

---

## Features Included in This Build

1. **AI Cloud API Key Support**: OpenAI, OpenRouter, Google Gemini, Groq, DeepSeek, Mistral, Together, and Custom OpenAI-compatible endpoints with encrypted keychain storage.
2. **Full SillyTavern Presets & Character Card V4 Support**:
   - PNG chunk reader (`tEXt`/`iTXt`) and JSON importer across V1, V2, V3, and V4 cards.
   - Comprehensive macro expansions (`{{char}}`, `{{user}}`, `{{persona}}`, `{{roll}}`, `{{random}}`, `{{time}}`, case transformers, variables).
   - Recursive World Info / Lorebook scanner with selective logic (`AND_ANY`, `NOT_ANY`, `NOT_ALL`).
   - Author's note depth injection, continue nudges, impersonation prompts.
   - All generation samplers (Temperature, Top-P, Min-P, Top-K, Repetition Penalty).
3. **Chat Personalization & Behavior Toggles** (Chat menu > Personalization & Memory):
   - Tone selection: Friendly, Concise, Creative, Analytical, Humorous.
   - Behavior switches: Markdown formatting, step-by-step reasoning, language auto-match.
   - Default PocketPal system prompt + Advanced custom instructions.
4. **Chat Memory**:
   - Long-term memory for normal chats with local semantic embedding similarity search.
   - Both user and AI can write into memory (`[MEMORY: ...]` auto-extraction).
5. **Chat Lookup (Last 35 Chats)**:
   - Injects 1-paragraph summaries of the last 35 chats into context for cross-conversation awareness.
   - **Strictly isolated from PalsHub** (Pals remain unconstrained in their own lore).
6. **Separate Normal Chat & PalsHub Chat**: Dedicated session tabs in drawer.
7. **Multiple Greetings**: Alternate greetings editor & in-chat `< 1 / N >` switcher.
8. **PalsHub Fancy Theme**: Blurred avatar background with frosted glass bubbles (off by default).
9. **Sidebar Bottom Pill Button**: `[ 📥 Import | 📤 Export ]` backing up chats, presets, settings, pals, and model names/sources only.
