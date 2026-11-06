import re

# 1. Update .github/workflows/build-apk.yml
with open(".github/workflows/build-apk.yml", "r", encoding="utf-8") as f:
    wf = f.read()

# Replace the build step with a clean, standard gradle command
old_build_step = """      - name: Build Android Prod Release APK (Single-Variant arm64-v8a Fast Build)
        working-directory: android
        run: |
          yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses >/dev/null 2>&1 || true
          sed -i 's/\\r$//' gradlew || true
          chmod +x gradlew || true
          ./gradlew assembleProdRelease \\
            -PreactNativeArchitectures=arm64-v8a \\
            -PrnllamaBuildFromSource=true \\
            -PrnllamaVariants=rnllama \\
            --no-daemon --stacktrace"""

new_build_step = """      - name: Build Android Prod Release APK (Single-Variant arm64-v8a Fast Build)
        working-directory: android
        run: |
          yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses >/dev/null 2>&1 || true
          sed -i 's/\\r$//' gradlew || true
          chmod +x gradlew || true
          ./gradlew assembleProdRelease \\
            -PreactNativeArchitectures=arm64-v8a \\
            -PrnllamaVariants=rnllama \\
            --stacktrace"""

if old_build_step in wf:
    wf = wf.replace(old_build_step, new_build_step)
    print("Replaced old_build_step in build-apk.yml")
else:
    # Try more flexible regex replacement
    wf = re.sub(
        r"- name: Build Android Prod Release APK.*?\./gradlew assembleProdRelease.*?(?=- name: Prepare APK Output)",
        """- name: Build Android Prod Release APK (Single-Variant arm64-v8a Fast Build)
        working-directory: android
        run: |
          yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses >/dev/null 2>&1 || true
          sed -i 's/\\r$//' gradlew || true
          chmod +x gradlew || true
          ./gradlew assembleProdRelease \\
            -PreactNativeArchitectures=arm64-v8a \\
            -PrnllamaVariants=rnllama \\
            --stacktrace
""",
        wf,
        flags=re.DOTALL
    )
    print("Applied regex replacement for build step in build-apk.yml")

with open(".github/workflows/build-apk.yml", "w", encoding="utf-8") as f:
    f.write(wf)

# Also update .github/workflows/ci.yml to match
ci_wf = wf.replace("name: Build PocketPal APK\n\non:\n  push:\n    branches: [ '**' ]\n  workflow_dispatch:", "name: CI Pipeline (APK Build)\n\non:\n  workflow_dispatch:")
with open(".github/workflows/ci.yml", "w", encoding="utf-8") as f:
    f.write(ci_wf)

print("Updated build-apk.yml and ci.yml successfully.")
