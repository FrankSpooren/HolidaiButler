/**
 * HolidAIButler - React Native App Entry Point
 * Mediterranean AI Travel Platform Mobile Application
 */

import React, { useEffect } from 'react';
import { StatusBar, LogBox, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import SplashScreen from 'react-native-splash-screen';
import NetInfo from '@react-native-community/netinfo';
import { enableScreens } from 'react-native-screens';
import { gestureHandlerRootHOC } from 'react-native-gesture-handler';

// Redux Store
import { store, persistor } from './src/store/store';

// Navigation
import MainNavigator from './src/navigation/MainNavigator';

// Services
import { initializeServices } from './src/services/ServiceManager';
import AnalyticsService from './src/services/AnalyticsService';
import NotificationService from './src/services/NotificationService';
import LocationService from './src/services/LocationService';

// Components
import LoadingScreen from './src/screens/LoadingScreen';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import NetworkStatus from './src/components/common/NetworkStatus';

// Utils
import { setupInterceptors } from './src/services/ApiClient';
import { Colors } from './src/theme/Colors';

// Enable react-native-screens
enableScreens();

// Ignore specific warnings for production
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
  'ReactNativeFiberHostComponent',
  'Require cycle:',
]);

const App: React.FC = () => {
  useEffect(() => {
    initializeApp();
    
    // Monitor app state changes
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        AnalyticsService.track('app_foregrounded');
      } else if (nextAppState === 'background') {
        AnalyticsService.track('app_backgrounded');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize core services
      await initializeServices();
      
      // Setup API interceptors
      setupInterceptors(store);
      
      // Initialize analytics
      await AnalyticsService.initialize();
      
      // Initialize notifications
      await NotificationService.initialize();
      
      // Request location permissions
      await LocationService.requestPermissions();
      
      // Monitor network connectivity
      const unsubscribe = NetInfo.addEventListener(state => {
        store.dispatch({
          type: 'network/statusChanged',
          payload: {
            isConnected: state.isConnected,
            type: state.type,
            isInternetReachable: state.isInternetReachable,
          },
        });
      });

      // Track app initialization
      AnalyticsService.track('app_initialized', {
        platform: 'react-native',
        timestamp: new Date().toISOString(),
      });

      // Hide splash screen
      setTimeout(() => {
        SplashScreen.hide();
      }, 1000);

    } catch (error) {
      console.error('App initialization failed:', error);
      AnalyticsService.track('app_initialization_failed', {
        error: error.message,
      });
    }
  };

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate loading={<LoadingScreen />} persistor={persistor}>
          <NavigationContainer
            onStateChange={(state) => {
              // Track navigation events
              AnalyticsService.track('navigation_changed', {
                routeName: getCurrentRouteName(state),
              });
            }}
          >
            <StatusBar
              barStyle="light-content"
              backgroundColor={Colors.primary}
              translucent={false}
            />
            
            <NetworkStatus />
            
            <MainNavigator />
          </NavigationContainer>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
};

// Helper function to get current route name
const getCurrentRouteName = (navigationState: any): string | undefined => {
  if (!navigationState || !navigationState.routes) {
    return undefined;
  }

  const route = navigationState.routes[navigationState.index];
  
  if (route.state) {
    return getCurrentRouteName(route.state);
  }
  
  return route.name;
};

export default gestureHandlerRootHOC(App);