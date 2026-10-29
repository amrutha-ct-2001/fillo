import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {QueryClientProvider} from '@tanstack/react-query';

import {queryClient} from './src/api/queryClient';
import {RootNavigator} from './src/navigation/RootNavigator';
import {useAuthStore} from './src/store/auth';
import {lightPalette} from './src/theme/tokens';
import {ConfirmHost, toastConfig} from './src/ui';

function Bootstrap({children}: {children: React.ReactNode}) {
  const hydrate = useAuthStore(s => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  return <>{children}</>;
}

function App() {
  return (
    <GestureHandlerRootView style={{flex: 1, backgroundColor: lightPalette.bg}}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Bootstrap>
            <StatusBar barStyle="dark-content" />
            <RootNavigator />
            <ConfirmHost />
            <Toast config={toastConfig} topOffset={48} />
          </Bootstrap>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
