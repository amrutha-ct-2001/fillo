import {Alert} from 'react-native';

import type {IconName} from '../components/Icon';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Marks the confirm button as destructive (red). */
  destructive?: boolean;
  /** Shown above the title in the in-app dialog. */
  icon?: IconName;
};

type Presenter = (options: ConfirmOptions) => Promise<boolean>;

let presenter: Presenter | null = null;

/** ConfirmHost registers itself here so confirm() can show the in-app dialog. */
export function setConfirmPresenter(p: Presenter | null) {
  presenter = p;
}

/** `await confirm({...})` resolves true only if the person taps the confirm button. */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  if (presenter) {
    return presenter(options);
  }
  // No host mounted (e.g. tests): fall back to the system alert.
  const {title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive} = options;
  return new Promise(resolve => {
    Alert.alert(
      title,
      message,
      [
        {text: cancelLabel, style: 'cancel', onPress: () => resolve(false)},
        {text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true)},
      ],
      {cancelable: true, onDismiss: () => resolve(false)},
    );
  });
}
