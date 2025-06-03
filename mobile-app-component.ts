/**
 * HolidAIButler - Main App Component
 * Mediterranean AI Travel Platform
 */

import React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

// Store Configuration
import { store, persistor } from './store/store';

// Navigation
import MainNavigator from './navigation/MainNavigator';
import SplashScreen from './screens/SplashScreen';

// Services
import NetworkManager from './services/NetworkManager';
import OfflineManager from './services/offline/OfflineManager';
import LocationService from './services/location/LocationService';

// Theme
import { ThemeProvider } from './theme/ThemeProvider';

// Types
import { RootStackParamList } from './types/navigation';

const Stack = createStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  React.useEffect(() => {
    // Initialize services
    NetworkManager.initialize();
    OfflineManager.initialize();
    LocationService.initialize();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={<SplashScreen />} persistor={persistor}>
        <SafeAreaProvider>
          <ThemeProvider>
            <NavigationContainer>
              <StatusBar 
                barStyle="light-content" 
                backgroundColor="#5E8B7E" 
                translucent 
              />
              <MainNavigator />
            </NavigationContainer>
          </ThemeProvider>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;