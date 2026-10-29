import React, {useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {NavigationContainer, DefaultTheme, useNavigationContainerRef} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator, type BottomTabBarProps} from '@react-navigation/bottom-tabs';


import {LoginScreen} from '../screens/auth/LoginScreen';
import {StaffLoginScreen} from '../screens/auth/StaffLoginScreen';
import {StaffHomeScreen} from '../screens/staff/StaffHomeScreen';
import {ScanPlateScreen} from '../screens/staff/ScanPlateScreen';
import {FindCustomerScreen} from '../screens/staff/FindCustomerScreen';
import {FillScreen} from '../screens/staff/FillScreen';
import {ProofCameraScreen} from '../screens/staff/ProofCameraScreen';
import {FillSuccessScreen} from '../screens/staff/FillSuccessScreen';
import {StaffCustomerHistoryScreen} from '../screens/staff/StaffCustomerHistoryScreen';
import {CustomerHomeScreen} from '../screens/customer/CustomerHomeScreen';
import {CustomerVehiclesScreen} from '../screens/customer/CustomerVehiclesScreen';
import {CustomerHistoryScreen} from '../screens/customer/CustomerHistoryScreen';
import {CustomerProfileScreen} from '../screens/customer/CustomerProfileScreen';
import {AdminDashboardScreen} from '../screens/admin/AdminDashboardScreen';
import {AdminCustomersScreen} from '../screens/admin/AdminCustomersScreen';
import {AdminCustomerDetailScreen} from '../screens/admin/AdminCustomerDetailScreen';
import {AdminStaffFormScreen} from '../screens/admin/AdminStaffFormScreen';
import {AdminStaffScreen} from '../screens/admin/AdminStaffScreen';
import {AdminSettingsScreen} from '../screens/admin/AdminSettingsScreen';
import {AdminRewardsScreen} from '../screens/admin/AdminRewardsScreen';
import {AdminRewardFormScreen} from '../screens/admin/AdminRewardFormScreen';
import {AdminStationsScreen} from '../screens/admin/AdminStationsScreen';
import {AdminStationFormScreen} from '../screens/admin/AdminStationFormScreen';
import {CustomerRewardsScreen} from '../screens/customer/CustomerRewardsScreen';
import {VerifyVoucherScreen} from '../screens/staff/VerifyVoucherScreen';
import {FilloLogo} from '../components/FilloLogo';
import {Icon, IconName} from '../components/Icon';
import {useAuthStore} from '../store/auth';
import {OfflineGate} from '../ui/OfflineScreen';
import {TabBar} from '../ui/TabBar';
import {lightPalette as palette, space} from '../theme/tokens';
import type {
  AdminTabParamList,
  AuthStackParamList,
  CustomerTabParamList,
  RootStackParamList,
  StaffStackParamList,
  AdminCustomersStackParamList,
  AdminStaffStackParamList,
  AdminRewardsStackParamList,
  AdminSettingsStackParamList,
} from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const StaffStack = createNativeStackNavigator<StaffStackParamList>();
const CustomersStack = createNativeStackNavigator<AdminCustomersStackParamList>();
const AdminStaffStack = createNativeStackNavigator<AdminStaffStackParamList>();
const RewardsStack = createNativeStackNavigator<AdminRewardsStackParamList>();
const SettingsStack = createNativeStackNavigator<AdminSettingsStackParamList>();
const CustomerTabs = createBottomTabNavigator<CustomerTabParamList>();
const AdminTabs = createBottomTabNavigator<AdminTabParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.bg,
    card: palette.surface,
    text: palette.textPrimary,
    border: palette.border,
    primary: palette.ink,
  },
};

/** The highlight pill is drawn by TabBar, so the icon is just the glyph. */
function TabBarIcon({name, focused}: {name: IconName; focused: boolean}) {
  return <Icon name={name} size={24} color={focused ? palette.ink : palette.textSecondary} />;
}

const renderTabBar = (props: BottomTabBarProps) => <TabBar {...props} />;

function useTabScreenOptions() {
  return {headerShown: false};
}

function AuthNavigator() {
  const authEntry = useAuthStore(s => s.authEntry);
  return (
    <AuthStack.Navigator
      key={authEntry}
      initialRouteName={authEntry}
      screenOptions={{headerShown: false}}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="StaffLogin" component={StaffLoginScreen} />
    </AuthStack.Navigator>
  );
}

function StaffNavigator() {
  return (
    <StaffStack.Navigator screenOptions={{headerShown: false, animation: 'fade_from_bottom'}}>
      <StaffStack.Screen name="StaffHome" component={StaffHomeScreen} />
      <StaffStack.Screen name="ScanPlate" component={ScanPlateScreen} />
      <StaffStack.Screen name="FindCustomer" component={FindCustomerScreen} />
      <StaffStack.Screen name="Fill" component={FillScreen} />
      <StaffStack.Screen name="ProofCamera" component={ProofCameraScreen} />
      <StaffStack.Screen
        name="FillSuccess"
        component={FillSuccessScreen}
        options={{gestureEnabled: false}}
      />
      <StaffStack.Screen
        name="CustomerHistory"
        component={StaffCustomerHistoryScreen}
      />
      <StaffStack.Screen name="VerifyVoucher" component={VerifyVoucherScreen} />
    </StaffStack.Navigator>
  );
}

function CustomerNavigator() {
  const tabScreenOptions = useTabScreenOptions();
  return (
    <CustomerTabs.Navigator screenOptions={tabScreenOptions} tabBar={renderTabBar}>
      <CustomerTabs.Screen
        name="Home"
        component={CustomerHomeScreen}
        options={{
          title: 'Points',
          tabBarIcon: ({focused}) => <TabBarIcon name="points" focused={focused} />,
        }}
      />
      <CustomerTabs.Screen
        name="Rewards"
        component={CustomerRewardsScreen}
        options={{
          tabBarIcon: ({focused}) => <TabBarIcon name="stars" focused={focused} />,
        }}
      />
      <CustomerTabs.Screen
        name="Vehicles"
        component={CustomerVehiclesScreen}
        options={{
          tabBarIcon: ({focused}) => <TabBarIcon name="vehicle" focused={focused} />,
        }}
      />
      <CustomerTabs.Screen
        name="History"
        component={CustomerHistoryScreen}
        options={{
          tabBarIcon: ({focused}) => <TabBarIcon name="history" focused={focused} />,
        }}
      />
      <CustomerTabs.Screen
        name="Profile"
        component={CustomerProfileScreen}
        options={{
          tabBarIcon: ({focused}) => <TabBarIcon name="profile" focused={focused} />,
        }}
      />
    </CustomerTabs.Navigator>
  );
}

// Real stacks, so hardware back and swipe-back move from detail to list.
function AdminCustomersNavigator() {
  return (
    <CustomersStack.Navigator screenOptions={{headerShown: false}}>
      <CustomersStack.Screen name="CustomersList" component={AdminCustomersScreen} />
      <CustomersStack.Screen name="CustomerDetail" component={AdminCustomerDetailScreen} />
    </CustomersStack.Navigator>
  );
}

function AdminStaffNavigator() {
  return (
    <AdminStaffStack.Navigator screenOptions={{headerShown: false}}>
      <AdminStaffStack.Screen name="StaffList" component={AdminStaffScreen} />
      <AdminStaffStack.Screen name="StaffForm" component={AdminStaffFormScreen} />
    </AdminStaffStack.Navigator>
  );
}

function AdminRewardsNavigator() {
  return (
    <RewardsStack.Navigator screenOptions={{headerShown: false}}>
      <RewardsStack.Screen name="RewardsList" component={AdminRewardsScreen} />
      <RewardsStack.Screen name="RewardForm" component={AdminRewardFormScreen} />
    </RewardsStack.Navigator>
  );
}

function AdminSettingsNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={{headerShown: false}}>
      <SettingsStack.Screen name="SettingsHome" component={AdminSettingsScreen} />
      <SettingsStack.Screen name="Stations" component={AdminStationsScreen} />
      <SettingsStack.Screen name="StationForm" component={AdminStationFormScreen} />
    </SettingsStack.Navigator>
  );
}

function AdminNavigator() {
  const tabScreenOptions = useTabScreenOptions();
  return (
    <AdminTabs.Navigator screenOptions={tabScreenOptions} tabBar={renderTabBar}>
      <AdminTabs.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarIcon: ({focused}) => <TabBarIcon name="dashboard" focused={focused} />,
        }}
      />
      <AdminTabs.Screen
        name="Customers"
        component={AdminCustomersNavigator}
        options={{
          tabBarIcon: ({focused}) => <TabBarIcon name="customers" focused={focused} />,
        }}
      />
      <AdminTabs.Screen
        name="Staff"
        component={AdminStaffNavigator}
        options={{
          tabBarIcon: ({focused}) => <TabBarIcon name="staff" focused={focused} />,
        }}
      />
      <AdminTabs.Screen
        name="Rewards"
        component={AdminRewardsNavigator}
        options={{
          tabBarIcon: ({focused}) => <TabBarIcon name="stars" focused={focused} />,
        }}
      />
      <AdminTabs.Screen
        name="Settings"
        component={AdminSettingsNavigator}
        options={{
          tabBarIcon: ({focused}) => <TabBarIcon name="settings" focused={focused} />,
        }}
      />
    </AdminTabs.Navigator>
  );
}

export function RootNavigator() {
  const hydrated = useAuthStore(s => s.hydrated);
  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);
  // The screen on show, so the offline cover can leave staff alone mid-fill.
  const navRef = useNavigationContainerRef<RootStackParamList>();
  const [screen, setScreen] = useState<string | undefined>();
  // The current route can be any nested screen (StaffHome, Fill, ...), not only a root one.
  const trackScreen = () => setScreen((navRef.getCurrentRoute() as {name: string} | undefined)?.name);

  if (!hydrated) {
    return (
      <View style={styles.splash} accessibilityLabel="Loading Fillo">
        <FilloLogo height={64} />
        <ActivityIndicator color={palette.ink} />
      </View>
    );
  }

  const authed = !!(token && user);

  return (
    <>
      <NavigationContainer ref={navRef} theme={navTheme} onReady={trackScreen} onStateChange={trackScreen}>
        <RootStack.Navigator screenOptions={{headerShown: false}}>
          {!authed ? (
            <RootStack.Screen name="Auth" component={AuthNavigator} />
          ) : user.role === 'ADMIN' ? (
            <RootStack.Screen name="Admin" component={AdminNavigator} />
          ) : user.role === 'STAFF' ? (
            <RootStack.Screen name="Staff" component={StaffNavigator} />
          ) : (
            <RootStack.Screen name="Customer" component={CustomerNavigator} />
          )}
        </RootStack.Navigator>
      </NavigationContainer>
      <OfflineGate role={user?.role} screen={screen} />
    </>
  );
}

const styles = StyleSheet.create({
  splash: {flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center', gap: space.xl},
});
