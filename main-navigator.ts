/**
 * HolidAIButler - Main Navigator
 * Mediterranean AI Travel Platform Navigation Structure
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Screens
import SplashScreen from '../screens/SplashScreen';
import AuthScreen from '../screens/auth/AuthScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import MapScreen from '../screens/map/MapScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import BookingsScreen from '../screens/bookings/BookingsScreen';
import POIDetailsScreen from '../screens/poi/POIDetailsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

// Types
import { RootStackParamList, TabParamList } from '../types/navigation';
import { RootState } from '../store/store';

// Theme
import { Colors } from '../theme/Colors';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Chat':
              iconName = 'chat';
              break;
            case 'Map':
              iconName = 'map';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.lightGray,
          paddingTop: 5,
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: Colors.white,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={ChatScreen}
        options={{
          title: 'HolidAIButler',
          headerLeft: () => (
            <Icon 
              name="explore" 
              size={24} 
              color={Colors.white} 
              style={{ marginLeft: 15 }} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{
          title: 'AI Assistant',
        }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{
          title: 'Explore Costa Blanca',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'My Profile',
        }}
      />
    </Tab.Navigator>
  );
};

const MainNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  if (isLoading) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen 
            name="POIDetails" 
            component={POIDetailsScreen}
            options={{
              headerShown: true,
              title: 'Location Details',
              headerStyle: { backgroundColor: Colors.primary },
              headerTintColor: Colors.white,
            }}
          />
          <Stack.Screen 
            name="Bookings" 
            component={BookingsScreen}
            options={{
              headerShown: true,
              title: 'My Bookings',
              headerStyle: { backgroundColor: Colors.primary },
              headerTintColor: Colors.white,
            }}
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen}
            options={{
              headerShown: true,
              title: 'Settings',
              headerStyle: { backgroundColor: Colors.primary },
              headerTintColor: Colors.white,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default MainNavigator;