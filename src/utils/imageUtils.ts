import * as RNFS from '@dr.pogodin/react-native-fs';

/**
 * Utility functions for downloading and managing pal thumbnail images
 */

const PAL_IMAGES_DIR = `${RNFS.DocumentDirectoryPath}/pal-images`;

/**
 * Check if a thumbnail URL is a local filename (not a remote URL)
 */
export const isLocalThumbnailPath = (thumbnailUrl: string): boolean => {
  return (
    !thumbnailUrl.startsWith('http://') &&
    !thumbnailUrl.startsWith('https://') &&
    !thumbnailUrl.startsWith('data:')
  );
};

/**
 * Check if a thumbnail URL is a remote HTTP/HTTPS URL
 */
export const isRemoteThumbnailUrl = (thumbnailUrl: string): boolean => {
  return (
    thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://')
  );
};

/**
 * Convert a thumbnail filename or path to a full URI suitable for React Native <Image source={{uri}} />
 * Handles remote http(s)://, data:image/*, file://, absolute /data/... paths, and relative filenames.
 */
export const getFullThumbnailUri = (filename: string): string => {
  if (!filename) {
    return '';
  }
  const trimmed = filename.trim();
  if (
    isRemoteThumbnailUrl(trimmed) ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://') ||
    trimmed.startsWith('asset:/')
  ) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return `file://${trimmed}`;
  }

  // Convert relative filename to full file:// URI
  const fullPath = `${PAL_IMAGES_DIR}/${trimmed}`;
  return `file://${fullPath}`;
};

/**
 * Get the absolute file system path from a thumbnail filename (for RNFS file operations)
 * @param filename - Filename like "palId_thumbnail.jpg"
 * @returns Absolute file system path
 */
export const getAbsoluteThumbnailPath = (filename: string): string => {
  if (!filename) {
    return '';
  }
  const trimmed = filename.trim();
  if (trimmed.startsWith('file://')) {
    return trimmed.replace(/^file:\/\//, '');
  }
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  return `${PAL_IMAGES_DIR}/${trimmed}`;
};

/**
 * Ensure the pal images directory exists
 */
const ensurePalImagesDirectory = async (): Promise<void> => {
  try {
    const exists = await RNFS.exists(PAL_IMAGES_DIR);
    if (!exists) {
      await RNFS.mkdir(PAL_IMAGES_DIR);
      console.log('Created pal images directory:', PAL_IMAGES_DIR);
    }
  } catch (error) {
    console.error('Failed to create pal images directory:', error);
    throw error;
  }
};

/**
 * Extract file extension from URL, default to jpg if not found
 */
const getFileExtension = (url: string): string => {
  const urlParts = url.split('.');
  return urlParts.length > 1 ? urlParts.pop()?.split('?')[0] || 'jpg' : 'jpg';
};

/**
 * Generate thumbnail filename for a pal
 */
const generateThumbnailFilename = (
  palId: string,
  originalUrl: string,
): string => {
  const extension = getFileExtension(originalUrl);
  return `${palId}_thumbnail.${extension}`;
};

/**
 * Generate the absolute file path for a pal thumbnail (for file operations)
 */
const getAbsoluteThumbnailPathForPal = (
  palId: string,
  originalUrl: string,
): string => {
  const filename = generateThumbnailFilename(palId, originalUrl);
  return `${PAL_IMAGES_DIR}/${filename}`;
};

/**
 * Download a thumbnail image from a URL and save it locally
 * @param palId - The ID of the pal
 * @param imageUrl - The remote URL of the image
 * @returns Promise<string> - The filename of the downloaded image (for storage)
 */
export const downloadPalThumbnail = async (
  palId: string,
  imageUrl: string,
): Promise<string> => {
  try {
    await ensurePalImagesDirectory();

    const filename = generateThumbnailFilename(palId, imageUrl);
    const absolutePath = getAbsoluteThumbnailPathForPal(palId, imageUrl);

    const exists = await RNFS.exists(absolutePath);
    if (exists) {
      return filename;
    }

    const downloadResult = await RNFS.downloadFile({
      fromUrl: imageUrl,
      toFile: absolutePath,
      background: false,
      discretionary: false,
      progressInterval: 1000,
    }).promise;

    if (downloadResult.statusCode === 200) {
      return filename;
    } else {
      throw new Error(
        `Download failed with status: ${downloadResult.statusCode}`,
      );
    }
  } catch (error) {
    console.error('Failed to download pal thumbnail:', error);
    throw error;
  }
};

/**
 * Delete a local thumbnail image
 * @param filename - The thumbnail filename like "palId_thumbnail.jpg"
 */
export const deletePalThumbnail = async (filename: string): Promise<void> => {
  try {
    const absolutePath = getAbsoluteThumbnailPath(filename);
    const exists = await RNFS.exists(absolutePath);
    if (exists) {
      await RNFS.unlink(absolutePath);
    }
  } catch (error) {
    console.error('Failed to delete local thumbnail:', error);
  }
};

/**
 * Check if a local thumbnail exists
 * @param filename - The thumbnail filename like "palId_thumbnail.jpg"
 * @returns Promise<boolean> - Whether the file exists
 */
export const localThumbnailExists = async (
  filename: string,
): Promise<boolean> => {
  try {
    const absolutePath = getAbsoluteThumbnailPath(filename);
    return await RNFS.exists(absolutePath);
  } catch (error) {
    console.error('Failed to check if local thumbnail exists:', error);
    return false;
  }
};

/**
 * Get the local thumbnail filename for a pal if it exists
 * @param palId - The ID of the pal
 * @param originalUrl - The original remote URL (used to determine file extension)
 * @returns Promise<string | null> - The filename if it exists, null otherwise
 */
export const getLocalThumbnailPath = async (
  palId: string,
  originalUrl: string,
): Promise<string | null> => {
  try {
    const filename = generateThumbnailFilename(palId, originalUrl);
    const exists = await localThumbnailExists(filename);
    return exists ? filename : null;
  } catch (error) {
    console.error('Failed to get local thumbnail path:', error);
    return null;
  }
};

/**
 * Clean up all orphaned thumbnail images (images without corresponding pals)
 * @param activePalIds - Array of currently active pal IDs
 */
export const cleanupOrphanedThumbnails = async (
  activePalIds: string[],
): Promise<void> => {
  try {
    const exists = await RNFS.exists(PAL_IMAGES_DIR);
    if (!exists) {
      return;
    }

    const files = await RNFS.readDir(PAL_IMAGES_DIR);
    const activeIdSet = new Set(activePalIds);

    for (const file of files) {
      if (file.isFile() && file.name.includes('_thumbnail.')) {
        const palId = file.name.split('_thumbnail.')[0];
        if (!activeIdSet.has(palId)) {
          await RNFS.unlink(file.path);
        }
      }
    }
  } catch (error) {
    console.error('Failed to cleanup orphaned thumbnails:', error);
  }
};
