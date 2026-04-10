/**
 * HolidaiButler - Chat Screen
 * Main AI conversation interface
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Components
import MessageBubble from '../../components/chat/MessageBubble';
import TypingIndicator from '../../components/chat/TypingIndicator';
import OfflineIndicator from '../../components/common/OfflineIndicator';

// Redux
import { RootState } from '../../store/store';
import { sendMessage, loadChatHistory } from '../../store/slices/chatSlice';

// Types
import { ChatMessage, MessageType } from '../../types/chat';

// Theme
import { Colors } from '../../theme/Colors';

// Utils
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

const ChatScreen: React.FC = () => {
  const dispatch = useDispatch();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [inputText, setInputText] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  
  const { 
    messages, 
    isLoading, 
    isTyping,
    error 
  } = useSelector((state: RootState) => state.chat);
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    // Load chat history on mount
    dispatch(loadChatHistory());
  }, [dispatch]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsComposing(false);

    try {
      // Create user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        text: messageText,
        type: MessageType.USER,
        timestamp: new Date(),
        userId: user?.id,
      };

      // Send to Redux
      dispatch(sendMessage({
        message: messageText,
        context: {
          location: user?.location,
          preferences: user?.preferences,
          isOnline,
        },
      }));

    } catch (error) {
      Alert.alert(
        'Message Failed',
        'Unable to send message. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setInputText(suggestion);
  };

  const renderWelcomeMessage = () => {
    if (messages.length > 0) return null;

    return (
      <View style={styles.welcomeContainer}>
        <View style={styles.logoContainer}>
          <Icon name="explore" size={60} color={Colors.primary} />
        </View>
        <Text style={styles.welcomeTitle}>
          ¡Hola! I'm your HolidAI Butler 🧭
        </Text>
        <Text style={styles.welcomeSubtitle}>
          Your personal AI travel compass for Costa Blanca
        </Text>
        <Text style={styles.welcomeDescription}>
          Ask me about restaurants, beaches, activities, or anything about your Mediterranean holiday!
        </Text>
        
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Try asking:</Text>
          {[
            "What's the best beach near Alicante?",
            "Find me authentic Spanish restaurants",
            "What can I do on a rainy day?",
            "Plan a romantic evening in Benidorm"
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
  };

  const renderMessages = () => {
    return messages.map((message) => (
      <MessageBubble
        key={message.id}
        message={message}
        onSuggestionPress={handleSuggestionPress}
        onRecommendationPress={(poi) => {
          // Navigate to POI details
          console.log('Navigate to POI:', poi.id);
        }}
      />
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      {!isOnline && <OfflineIndicator />}
      
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {renderWelcomeMessage()}
          {renderMessages()}
          {isTyping && <TypingIndicator />}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask me about Costa Blanca..."
              placeholderTextColor={Colors.gray}
              multiline
              maxLength={500}
              onFocus={() => setIsComposing(true)}
              onBlur={() => setIsComposing(false)}
              editable={!isLoading}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <Icon name="hourglass-empty" size={24} color={Colors.white} />
              ) : (
                <Icon name="send" size={24} color={Colors.white} />
              )}
            </TouchableOpacity>
          </View>
          
          {/* Voice Input Button */}
          <TouchableOpacity
            style={styles.voiceButton}
            onPress={() => {
              // TODO: Implement voice input
              Alert.alert('Voice Input', 'Voice input coming soon!');
            }}
          >
            <Icon name="mic" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingBottom: 20,
  },
  welcomeContainer: {
    padding: 30,
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  welcomeDescription: {
    fontSize: 16,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  suggestionsContainer: {
    width: '100%',
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkGray,
    marginBottom: 15,
    textAlign: 'center',
  },
  suggestionChip: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputContainer: {
    padding: 20,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
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
    marginRight: 10,
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
  },
  voiceButton: {
    alignSelf: 'center',
    padding: 8,
  },
  errorContainer: {
    backgroundColor: Colors.errorLight,
    padding: 10,
    margin: 10,
    borderRadius: 8,
  },
  errorText: {
    color: Colors.error,
    textAlign: 'center',
    fontSize: 14,
  },
});

export default ChatScreen;