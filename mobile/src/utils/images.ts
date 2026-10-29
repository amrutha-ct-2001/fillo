/**
 * Photos are already quality-limited by image-picker (0.6–0.8).
 * Extra native compression was dropped to avoid Nitro Modules build issues.
 */
export async function compressPhoto(uri: string): Promise<string> {
  return uri;
}
