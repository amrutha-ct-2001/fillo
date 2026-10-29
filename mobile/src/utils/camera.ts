import {Alert, Linking, PermissionsAndroid, Platform} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type CameraOptions,
  type ImageLibraryOptions,
  type ImagePickerResponse,
} from 'react-native-image-picker';

type CameraOpts = Partial<CameraOptions>;
type LibraryOpts = Partial<ImageLibraryOptions>;

async function ensureCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const granted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.CAMERA,
  );
  if (granted) {
    return true;
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    {
      title: 'Camera permission',
      message:
        'Fillo needs the camera to photograph number plates and payment screens.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function ensureGalleryPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const api = typeof Platform.Version === 'number' ? Platform.Version : 0;
  if (api >= 33) {
    const perm = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
    if (!perm) {
      return true;
    }
    const granted = await PermissionsAndroid.check(perm);
    if (granted) {
      return true;
    }
    const result = await PermissionsAndroid.request(perm, {
      title: 'Photos permission',
      message: 'Fillo needs access to photos when you pick from the gallery.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

function showPickerError(res: ImagePickerResponse) {
  if (res.didCancel) {
    return;
  }
  if (res.errorCode === 'permission') {
    Alert.alert(
      'Permission needed',
      'Camera access was denied. Enable it in system settings to take photos.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Open settings', onPress: () => Linking.openSettings()},
      ],
    );
    return;
  }
  if (res.errorCode === 'camera_unavailable') {
    Alert.alert(
      'Camera unavailable',
      'No camera found on this device. Use Gallery, or type the plate manually.',
    );
    return;
  }
  if (res.errorMessage || res.errorCode) {
    Alert.alert(
      'Could not open camera',
      res.errorMessage || String(res.errorCode),
    );
  }
}

export async function takePhoto(options: CameraOpts = {}): Promise<string | null> {
  const allowed = await ensureCameraPermission();
  if (!allowed) {
    Alert.alert(
      'Permission needed',
      'Camera access is required to photograph plates and payments.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Open settings', onPress: () => Linking.openSettings()},
      ],
    );
    return null;
  }

  const res = await launchCamera({
    cameraType: 'back',
    quality: 0.8,
    saveToPhotos: false,
    ...options,
    mediaType: options.mediaType ?? 'photo',
  });

  if (res.didCancel) {
    return null;
  }
  if (res.errorCode || !res.assets?.[0]?.uri) {
    showPickerError(res);
    return null;
  }
  return res.assets[0].uri;
}

export async function pickPhoto(options: LibraryOpts = {}): Promise<string | null> {
  const allowed = await ensureGalleryPermission();
  if (!allowed) {
    Alert.alert(
      'Permission needed',
      'Photo library access was denied. Enable it in settings, or use the camera.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Open settings', onPress: () => Linking.openSettings()},
      ],
    );
    return null;
  }

  const res = await launchImageLibrary({
    quality: 0.8,
    ...options,
    mediaType: options.mediaType ?? 'photo',
  });

  if (res.didCancel) {
    return null;
  }
  if (res.errorCode || !res.assets?.[0]?.uri) {
    showPickerError(res);
    return null;
  }
  return res.assets[0].uri;
}
