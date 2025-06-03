/**
 * HolidAIButler - Chat Screen
 * AI-powered Mediterranean travel chat interface
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Components
import MessageBubble from '../components/chat/MessageBubble';
import TypingIndicator from '../components/chat/TypingIndicator';
import WeatherWidget from '../components/weather/WeatherWidget';
import OfflineIndicator from '../components/common/OfflineIndicator';

// Services
import AIService from '../services/ai/AIService';
import LocationService from '../services/location/LocationService';

// Store
import { RootState, AppDispatch } from '../store/store';
import { addMessage, setTyping } from '../store/slices/chatSlice';

// Types
import { ChatMessage, MessageType } from '../types/chat';
import { Colors } from '../theme/Colors';

// Utils
import { generateMessageId } from '../utils/helpers';

const ChatScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  // State
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redux State
  const { messages, isTyping } = useSelector((state: RootState) => state.chat);
  const { isOnline } = useSelector((state: RootState) => state.network);
  const { currentLocation } = useSelector((state: RootState) => state.location);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Send welcome message if no messages exist
    if (messages.length === 0) {
      sendWelcomeMessage();
    }
  }, []);

  const sendWelcomeMessage = () => {
    const welcomeMessage: ChatMessage = {
      id: generateMessageId(),
      text: `¡Hola! 🌊 I'm your personal AI travel compass for Costa Blanca! I can help you discover authentic Mediterranean experiences, from hidden beach gems to local culinary treasures. What brings you to our beautiful coast today?`,
      type: MessageType.AI,
      timestamp: new Date(),
      metadata: {
        isWelcome: true,
        suggestions: [
          'Best beaches in Alicante',
          'Authentic paella restaurants',
          'Cultural attractions',
          'Hidden local gems',
        ],
      },
    };

    dispatch(addMessage(welcomeMessage));
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      text: inputText.trim(),
      type: MessageType.USER,
      timestamp: new Date(),
    };

    // Add user message to chat
    dispatch(addMessage(userMessage));
    setInputText('');
    setIsLoading(true);
    dispatch(setTyping(true));

    try {
      // Get user context for AI
      const userContext = {
        location: currentLocation,
        preferences: user?.preferences,
        isOnline,
        timestamp: new Date(),
      };

      // Get AI response
      const aiResponse = await AIService.generateResponse(
        inputText.trim(),
        messages,
        userContext
      );

      const aiMessage: ChatMessage = {
        id: generateMessageId(),
        text: aiResponse.text,
        type: MessageType.AI,
        timestamp: new Date(),
        metadata: {
          recommendations: aiResponse.recommendations,
          confidence: aiResponse.confidence,
          model: aiResponse.model,
        },
      };

      dispatch(addMessage(aiMessage));
    } catch (error) {
      console.error('Failed to get AI response:', error);
      
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        text: `I'm having trouble connecting right now, but I can still help with what I know about Costa Blanca! ${isOnline ? 'Please try again in a moment.' : 'I\'m using my offline knowledge to assist you.'}`,
        type: MessageType.AI,
        timestamp: new Date(),
        metadata: {
          isError: true,
          fallbackMode: !isOnline,
        },
      };

      dispatch(addMessage(errorMessage));
    } finally {
      setIsLoading(false);
      dispatch(setTyping(false));
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setInputText(suggestion);
    handleSendMessage();
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <MessageBubble 
      message={item} 
      onSuggestionPress={handleSuggestionPress}
      onRecommendationPress={(poi) => {
        // Navigate to POI details
        console.log('Navigate to POI:', poi);
      }}
    />
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {!isOnline && <OfflineIndicator />}
      <WeatherWidget />
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeTitle}>🧭 HolidAIButler</Text>
        <Text style={styles.welcomeSubtitle}>Je persoonlijke AI-reiscompas</Text>
        <Text style={styles.welcomeDescription}>
          Discover authentic Mediterranean experiences in Costa Blanca
        </Text>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      {isTyping && <TypingIndicator />}
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about Costa Blanca experiences..."
            placeholderTextColor={Colors.gray}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Icon name="send" size={20} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    padding: 20,
    backgroundColor: Colors.primary,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: 5,
  },
  welcomeSubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.secondary,
    marginBottom: 10,
  },
  welcomeDescription: {
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 22,
  },
  messagesList: {
    paddingBottom: 20,
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  inputContainer: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.lightGray,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 5,
    minHeight: 50,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.darkGray,
    maxHeight: 100,
    paddingVertical: 10,
    paddingRight: 10,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.gray,
  },
});

export default ChatScreen;