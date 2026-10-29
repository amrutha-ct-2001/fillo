module.exports = {
  preset: '@react-native/jest-preset',
  // The preset only transforms react-native packages; react-native-toast-message ships untranspiled JS.
  transformIgnorePatterns: ['node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-toast-message)/)'],
};
