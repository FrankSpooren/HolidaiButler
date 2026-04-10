/**
 * HolidaiButler - Chat Screen
 * Main AI conversation interface for Mediterranean travel assistance
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useMutation, useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNetInfo } from '@react-native-community/netinfo';

// Components
import MessageBubble from '../../components/chat/MessageBubble';
import TypingIndicator from '../../components/chat/TypingIndicator';
import VoiceInputButton from '../../components/chat/VoiceInputButton';
import OfflineIndicator from '../../components/common/OfflineIndicator';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Services
import ChatService from '../../services/ChatService';
import LocationService from '../../services/LocationService';
import AnalyticsService from '../../services/AnalyticsService';

// Store
import { RootState } from '../../store/store';
import { addMessage, setTyping, clearChat } from '../../store/slices/chatSlice';

// Types
import { ChatMessage, MessageType } from '../../types/chat';
import { POIRecommendation } from '../../types/poi';

// Theme
import { Colors } from '../../theme/Colors';

// Utils
import { showToast } from '../../utils/toast';

const { height: screenHeight } = Dimensions.get('window');

const ChatScreen: React.FC = () => {
  const dispatch = useDispatch();
  const netInfo = useNetInfo();
  
  const { messages, isTyping, currentConversationId } = useSelector(
    (state: RootState) => state.chat
  );
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [inputText, setInputText] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ChatService.sendMessage,
    onSuccess: (response) => {
      const aiMessage: ChatMessage = {
        id: response.data.message.id,
        type: MessageType.AI,
        text: response.data.message.text,
        timestamp: new Date(response.data.message.timestamp),
        metadata: {
          recommendations: response.data.recommendations,
          suggestions: response.data.suggestions,
          confidence: response.data.message.metadata?.confidence,
          isError: response.data.message.metadata?.isError,
          fallbackMode: response.data.message.metadata?.fallbackMode,
        },
      };
      
      dispatch(addMessage(aiMessage));
      dispatch(setTyping(false));
      
      // Track successful interaction
      AnalyticsService.track('ai_response_received', {
        conversationId: response.data.conversationId,
        confidence: aiMessage.metadata?.confidence,
        hasRecommendations: response.data.recommendations?.length > 0,
        fallbackMode: aiMessage.metadata?.fallbackMode,
      });
    },
    onError: (error) => {
      dispatch(setTyping(false));
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: MessageType.AI,
        text: "I'm having trouble connecting right now. Let me try to help with what I have locally available.",
        timestamp: new Date(),
        metadata: {
          isError: true,
          fallbackMode: true,
        },
      };
      
      dispatch(addMessage(errorMessage));
      
      AnalyticsService.track('ai_response_error', {
        error: error.message,
      });
      
      showToast('Connection issue - using offline mode', 'warning');
    },
  });

  // Load conversation history
  const { data: conversationHistory, isLoading } = useQuery({
    queryKey: ['conversation', currentConversationId],
    queryFn: () => ChatService.getConversation(currentConversationId),
    enabled: !!currentConversationId,
  });

  useEffect(() => {
    if (conversationHistory?.data.conversation) {
      // Load previous messages if conversation exists
      const previousMessages = conversationHistory.data.conversation.messages.map(
        (msg: any) => ({
          id: msg._id,
          type: msg.role === 'user' ? MessageType.USER : MessageType.AI,
          text: msg.content,
          timestamp: new Date(msg.timestamp),
          metadata: msg.metadata,
        })
      );
      
      // You would dispatch these to your store
      // dispatch(setMessages(previousMessages));
    }
  }, [conversationHistory]);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || sendMessageMutation.isLoading) return;

    const messageText = inputText.trim();
    setInputText('');

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: MessageType.USER,
      text: messageText,
      timestamp: new Date(),
    };
    
    dispatch(addMessage(userMessage));
    dispatch(setTyping(true));

    // Track user message
    AnalyticsService.track('user_message_sent', {
      messageLength: messageText.length,
      hasLocation: !!user?.location,
      isOnline: netInfo.isConnected,
    });

    try {
      // Get current location for context
      const location = await LocationService.getCurrentPosition();
      
      // Send to API
      await sendMessageMutation.mutateAsync({
        message: messageText,
        conversationId: currentConversationId,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
        } : undefined,
        context: {
          userPreferences: user?.preferences,
          timeOfDay: new Date().getHours(),
        },
      });
      
    } catch (error) {
      console.error('Send message error:', error);
    }
  }, [inputText, sendMessageMutation, currentConversationId, user, netInfo]);

  const handleSuggestionPress = useCallback((suggestion: string) => {
    setInputText(suggestion);
  }, []);

  const handleRecommendationPress = useCallback((poi: POIRecommendation) => {
    // Navigate to POI details or show more info
    AnalyticsService.track('recommendation_tapped', {
      poiId: poi.id,
      poiName: poi.name,
      category: poi.category,
    });
    
    // You would navigate to POI details screen here
    showToast(`Opening ${poi.name}...`);
  }, []);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => (
    <MessageBubble
      message={item}
      onSuggestionPress={handleSuggestionPress}
      onRecommendationPress={handleRecommendationPress}
    />
  ), [handleSuggestionPress, handleRecommendationPress]);

  const renderHeader = () => (
    <View style={styles.welcomeContainer}>
      {/* Mediterranean Logo */}
      <View style={styles.logoContainer}>
        <Icon name="explore" size={40} color={Colors.primary} />
      </View>
      
      <Text style={styles.welcomeTitle}>
        Hola! I'm your Mediterranean AI travel assistant 🧭
      </Text>
      <Text style={styles.welcomeSubtitle}>
        Ask me about Costa Blanca - beaches, restaurants, activities, and authentic local experiences!
      </Text>
      
      {/* Quick suggestion chips */}
      <View style={styles.quickSuggestions}>
        {[
          "Best beaches near me",
          "Authentic Spanish restaurants", 
          "Cultural attractions",
          "Weather today"
        ].map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestionChip}
            onPress={() => handleSuggestionPress(suggestion)}
          >
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Offline indicator */}
      {!netInfo.isConnected && <OfflineIndicator />}
      
      {/* Messages list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        ListHeaderComponent={messages.length === 0 ? renderHeader : null}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        onLayout={() => flatListRef.current?.scrollToEnd()}
        showsVerticalScrollIndicator={false}
      />

      {/* Typing indicator */}
      {isTyping && <TypingIndicator />}

      {/* Input area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about Costa Blanca..."
            placeholderTextColor={Colors.gray}
            multiline
            maxLength={1000}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          
          <VoiceInputButton
            isListening={isVoiceMode}
            onStartListening={() => setIsVoiceMode(true)}
            onStopListening={() => setIsVoiceMode(false)}
            onVoiceResult={(text) => {
              setInputText(text);
              setIsVoiceMode(false);
            }}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sendMessageMutation.isLoading) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sendMessageMutation.isLoading}
          >
            {sendMessageMutation.isLoading ? (
              <LoadingSpinner size="small" color={Colors.white} />
            ) : (
              <Icon name="send" size={24} color={Colors.white} />
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
    backgroundColor: Colors.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.gray,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingBottom: 20,
  },
  welcomeContainer: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  quickSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
  },
  suggestionText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: Colors.white,
    color: Colors.darkGray,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.gray,
    opacity: 0.5,
  },
});

export default ChatScreen;