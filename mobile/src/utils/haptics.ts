import ReactNativeHapticFeedback, {HapticFeedbackTypes} from 'react-native-haptic-feedback';

function fire(type: HapticFeedbackTypes | 'impactLight' | 'notificationSuccess' | 'notificationWarning' | 'notificationError') {
  try {
    ReactNativeHapticFeedback.trigger(type);
  } catch {
    // Haptics are a nicety; never let them break a flow.
  }
}

export const haptics = {
  tap: () => fire('impactLight'),
  success: () => fire('notificationSuccess'),
  warning: () => fire('notificationWarning'),
  error: () => fire('notificationError'),
};
