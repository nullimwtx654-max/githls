# VoxelCraft Ultra 3.2 — Android APK & CI/CD Pipeline

A 3D voxel sandbox game engine for Android featuring edge-to-edge display cutout notch support, gestural navigation insets, and infinite procedural terrain.

## 🚀 How to Build Your APK on GitHub in 2 Steps

### Step 1: Push All Files to Your GitHub Repository
```bash
git add .
git commit -m "Update VoxelCraft Ultra with rock-solid Gradle 8.4 CI/CD workflow"
git push origin main
```
*(If you are using a different branch like `master`, the workflow will trigger automatically on any branch).*

---

### Step 2: Download Your APK

#### Option A: Direct from GitHub Actions Tab (Immediate Download)
1. Go to your repository on GitHub.
2. Click the **Actions** tab at the top.
3. Click on the active/completed workflow run: **Build Android APK**.
4. Scroll to the bottom under **Artifacts**.
5. Click **VoxelCraft-Ultra-APKs** to download the zip containing both Debug and Release APKs!

#### Option B: From GitHub Releases
1. Navigate to the **Releases** section on the right side of your repository.
2. Download `app-release.apk` directly to your phone.
3. Install and play!

---

### ❓ Troubleshooting GitHub Actions:
- **"Workflows aren't being run on this repository"**: If you just created the repo, GitHub requires enabling Actions. Go to the **Actions** tab and click **"I understand my workflows, go ahead and enable them"**.
- **Run Workflow Manually**: Go to **Actions > Build Android APK** in the left sidebar, click **Run workflow**, and select the branch.
