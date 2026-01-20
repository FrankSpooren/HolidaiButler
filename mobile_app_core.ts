/**
 * HolidAIButler - Main App Component
 * Mediterranean AI Travel Platform Mobile App
 */

import React, { useEffect } from 'react';
import { StatusBar, Alert, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import NetInfo from '@react-native-community/netinfo';
import SplashScreen from 'react-native-splash-screen';

// Store
import { store, persistor } from './src/store/store';

// Navigation
import MainNavigator from './src/navigation/MainNavigator';

// Components
import LoadingScreen from './src/components/common/LoadingScreen';
import OfflineNotice from './src/components/common/OfflineNotice';

// Services
import { initializeServices } from './src/services/AppInitialization';
import AnalyticsService from './src/services/AnalyticsService';
import NotificationService from './src/services/NotificationService';

// Utils
import { setupInterceptors } from './src/utils/apiClient';
import { logError } from './src/utils/errorLogger';

// Theme
import { Colors } from './src/theme/Colors';

const App: React.FC = () => {
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize core services
      await initializeServices();
      
      // Setup API interceptors
      setupInterceptors();
      
      // Initialize analytics
      await AnalyticsService.initialize();
      
      // Setup notifications
      await NotificationService.initialize();
      
      // Monitor network status
      setupNetworkMonitoring();
      
      // Hide splash screen
      SplashScreen.hide();
      
    } catch (error) {
      logError('App initialization failed', error);
      Alert.alert(
        'Initialization Error',
        'Failed to initialize the app. Please restart.',
        [{ text: 'OK' }]
      );
    }
  };

  const setupNetworkMonitoring = () => {
    NetInfo.addEventListener(state => {
      AnalyticsService.trackEvent('network_status_change', {
        isConnected: state.isConnected,
        type: state.type,
      });
    });
  };

  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <NavigationContainer>
          <StatusBar 
            barStyle="light-content" 
            backgroundColor={Colors.primary}
          />
          <MainNavigator />
          <OfflineNotice />
        </NavigationContainer>
      </PersistGate>
    </Provider>
  );
};

export default App;

---

// package.json for React Native App

{
  "name": "holidaibutler-mobile",
  "version": "1.0.0",
  "description": "HolidAIButler - Mediterranean AI Travel Platform Mobile App",
  "private": true,
  "scripts": {
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "start": "react-native start",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint . --ext .js,.jsx,.ts,.tsx --fix",
    "clean": "cd android && ./gradlew clean && cd ../ios && xcodebuild clean",
    "build:android": "cd android && ./gradlew assembleRelease",
    "build:ios": "cd ios && xcodebuild -workspace HolidaiButler.xcworkspace -scheme HolidaiButler -configuration Release archive",
    "bundle:android": "react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle",
    "bundle:ios": "react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios/main.jsbundle",
    "postinstall": "cd ios && pod install"
  },
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.72.6",
    "@react-navigation/native": "^6.1.7",
    "@react-navigation/stack": "^6.3.17",
    "@react-navigation/bottom-tabs": "^6.5.8",
    "react-native-screens": "^3.25.0",
    "react-native-safe-area-context": "^4.7.2",
    "react-native-gesture-handler": "^2.12.1",
    "@react-native-async-storage/async-storage": "^1.19.3",
    "react-native-vector-icons": "^10.0.0",
    "react-native-svg": "^13.14.0",
    "@react-native-community/netinfo": "^9.4.1",
    "react-native-maps": "^1.7.1",
    "react-native-geolocation-service": "^5.3.1",
    "react-native-permissions": "^3.9.3",
    "react-native-device-info": "^10.11.0",
    "@reduxjs/toolkit": "^1.9.5",
    "react-redux": "^8.1.2",
    "redux-persist": "^6.0.0",
    "react-native-keychain": "^8.1.2",
    "react-native-encrypted-storage": "^4.0.3",
    "react-native-background-job": "^2.2.1",
    "react-native-push-notification": "^8.1.1",
    "axios": "^1.5.0",
    "react-query": "^3.39.3",
    "react-native-voice": "^3.2.4",
    "react-native-camera": "^4.2.1",
    "react-native-offline": "^6.0.0",
    "react-native-sqlite-storage": "^6.0.1",
    "react-native-reanimated": "^3.5.4",
    "react-native-splash-screen": "^3.3.0",
    "react-native-orientation-locker": "^1.5.0",
    "@react-native-community/datetimepicker": "^7.6.1",
    "react-native-modal": "^13.0.1",
    "react-native-image-picker": "^5.6.0",
    "react-native-share": "^9.4.1"
  },
  "devDependencies": {
    "@babel/core": "^7.22.9",
    "@babel/preset-env": "^7.22.9",
    "@babel/runtime": "^7.22.6",
    "@react-native/eslint-config": "^0.72.2",
    "@react-native/metro-config": "^0.72.11",
    "@tsconfig/react-native": "^3.0.2",
    "@types/react": "^18.2.6",
    "@types/react-test-renderer": "^18.0.0",
    "babel-jest": "^29.6.2",
    "eslint": "^8.47.0",
    "jest": "^29.6.2",
    "metro-react-native-babel-preset": "0.76.8",
    "prettier": "^3.0.0",
    "react-test-renderer": "18.2.0",
    "typescript": "^5.1.6",
    "@types/react-native-vector-icons": "^6.4.14",
    "@testing-library/react-native": "^12.2.2",
    "@testing-library/jest-native": "^5.4.2"
  },
  "resolutions": {
    "@types/react": "^18.2.6"
  },
  "jest": {
    "preset": "react-native",
    "moduleFileExtensions": [
      "ts",
      "tsx",
      "js",
      "jsx",
      "json",
      "node"
    ],
    "setupFilesAfterEnv": [
      "@testing-library/jest-native/extend-expect"
    ],
    "transformIgnorePatterns": [
      "node_modules/(?!(react-native|@react-native|react-native-vector-icons)/)"
    ]
  }
}

---

// ChatScreen.tsx - Main Chat Interface

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';

// Components
import MessageBubble from '../../components/chat/MessageBubble';
import ChatInput from '../../components/chat/ChatInput';
import TypingIndicator from '../../components/chat/TypingIndicator';
import WelcomeMessage from '../../components/chat/WelcomeMessage';
import LoadingScreen from '../../components/common/LoadingScreen';

// Redux
import { RootState } from '../../store/store';
import { sendMessage, loadConversation } from '../../store/slices/chatSlice';

// Services
import AnalyticsService from '../../services/AnalyticsService';
import LocationService from '../../services/LocationService';

// Types
import { ChatMessage, MessageType } from '../../types/chat';

// Theme
import { Colors } from '../../theme/Colors';

const ChatScreen: React.FC = () => {
  const dispatch = useDispatch();
  const flatListRef = useRef<FlatList>(null);
  
  const { 
    messages, 
    isLoading, 
    isConnected,
    conversationId 
  } = useSelector((state: RootState) => state.chat);
  
  const { user } = useSelector((state: RootState) => state.auth);

  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    try {
      // Load existing conversation if available
      if (conversationId) {
        dispatch(loadConversation(conversationId));
      }
      
      // Get user location for context
      await LocationService.getCurrentLocation();
      
      // Track screen view
      AnalyticsService.trackScreenView('chat_screen');
      
    } catch (error) {
      console.error('Failed to initialize chat:', error);
    }
  };

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    try {
      setIsTyping(true);
      
      // Get current location for context
      const location = await LocationService.getCurrentLocation();
      
      // Dispatch message to Redux store
      dispatch(sendMessage({
        text: messageText,
        context: {
          location,
          preferences: user?.preferences,
          timestamp: new Date(),
        },
      }));

      // Track analytics
      AnalyticsService.trackEvent('message_sent', {
        messageLength: messageText.length,
        hasLocation: !!location,
        isConnected,
      });

    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert(
        'Message Failed',
        'Unable to send message. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleRecommendationPress = (recommendation: any) => {
    // Navigate to POI details
    AnalyticsService.trackEvent('recommendation_clicked', {
      poiId: recommendation.id,
      poiName: recommendation.name,
      category: recommendation.category,
    });
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <MessageBubble
      message={item}
      onSuggestionPress={handleSuggestionPress}
      onRecommendationPress={handleRecommendationPress}
    />
  );

  const renderEmptyState = () => (
    <WelcomeMessage userName={user?.profile?.firstName} />
  );

  if (isLoading && messages.length === 0) {
    return <LoadingScreen message="Initializing your Mediterranean AI companion..." />;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        onContentSizeChange={scrollToBottom}
      />
      
      {isTyping && <TypingIndicator />}
      
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={!isConnected}
        placeholder={
          isConnected 
            ? "Ask me about Costa Blanca..." 
            : "Offline - limited functionality"
        }
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  messagesContainer: {
    paddingVertical: 20,
    flexGrow: 1,
  },
});

export default ChatScreen;