/**
 * HolidAIButler - Redux Store Configuration
 * State management for Mediterranean AI Travel Platform
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTransform } from 'redux-persist';

// Reducers
import authSlice from './slices/authSlice';
import chatSlice from './slices/chatSlice';
import userSlice from './slices/userSlice';
import poiSlice from './slices/poiSlice';
import networkSlice from './slices/networkSlice';
import preferencesSlice from './slices/preferencesSlice';
import analyticsSlice from './slices/analyticsSlice';

// Types
export interface RootState {
  auth: ReturnType<typeof authSlice.reducer>;
  chat: ReturnType<typeof chatSlice.reducer>;
  user: ReturnType<typeof userSlice.reducer>;
  poi: ReturnType<typeof poiSlice.reducer>;
  network: ReturnType<typeof networkSlice.reducer>;
  preferences: ReturnType<typeof preferencesSlice.reducer>;
  analytics: ReturnType<typeof analyticsSlice.reducer>;
}

// Transform to handle sensitive data encryption
const encryptTransform = createTransform(
  // Transform state before persisting
  (inboundState: any) => {
    // Don't encrypt in development
    if (__DEV__) return inboundState;
    
    // In production, you'd encrypt sensitive data here
    return inboundState;
  },
  // Transform state on rehydrate
  (outboundState: any) => {
    // Decrypt if needed
    return outboundState;
  },
  // Only apply to auth reducer
  { whitelist: ['auth'] }
);

// Persist configuration
const persistConfig = {
  key: 'holidaibutler',
  storage: AsyncStorage,
  version: 1,
  transforms: [encryptTransform],
  whitelist: [
    'auth',       // Persist authentication state
    'user',       // Persist user profile
    'preferences', // Persist user preferences
    'chat',       // Persist chat history (limited)
  ],
  blacklist: [
    'network',    // Don't persist network status
    'analytics',  // Don't persist analytics data
  ],
};

// Chat persist config (limited history)
const chatPersistConfig = {
  key: 'chat',
  storage: AsyncStorage,
  transforms: [
    createTransform(
      // Transform chat before persisting - keep only last 50 messages
      (inboundState: any) => ({
        ...inboundState,
        messages: inboundState.messages.slice(-50),
      }),
      // No transform on rehydrate
      (outboundState: any) => outboundState,
    ),
  ],
};

// Root reducer
const rootReducer = combineReducers({
  auth: authSlice.reducer,
  chat: persistReducer(chatPersistConfig, chatSlice.reducer),
  user: userSlice.reducer,
  poi: poiSlice.reducer,
  network: networkSlice.reducer,
  preferences: preferencesSlice.reducer,
  analytics: analyticsSlice.reducer,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Store configuration
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
          'persist/FLUSH',
        ],
        ignoredPaths: ['register'],
      },
      immutableCheck: {
        warnAfter: 128,
      },
    }).concat([
      // Add custom middleware here if needed
    ]),
  devTools: __DEV__, // Enable Redux DevTools in development only
});

// Persistor
export const persistor = persistStore(store);

// Type exports
export type AppDispatch = typeof store.dispatch;
export type AppGetState = typeof store.getState;

// Action creators for common operations
export const resetStore = () => ({
  type: 'RESET_STORE',
});

export const clearUserData = () => ({
  type: 'CLEAR_USER_DATA',
});

// Store enhancer for development
if (__DEV__) {
  // Add development helpers
  (store as any).__persistor = persistor;
  
  // Log store actions in development
  store.subscribe(() => {
    const state = store.getState();
    // You can add development logging here
  });
}

// Export hooks for TypeScript
export type { RootState } from './types';

export default store;