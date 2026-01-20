/**
 * HolidAIButler - Message Bubble Component
 * Chat message display with Mediterranean styling
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Types
import { ChatMessage, MessageType, POIRecommendation } from '../../types/chat';
import { Colors } from '../../theme/Colors';

// Utils
import { formatMessageTime } from '../../utils/dateUtils';

interface MessageBubbleProps {
  message: ChatMessage;
  onSuggestionPress?: (suggestion: string) => void;
  onRecommendationPress?: (poi: POIRecommendation) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onSuggestionPress,
  onRecommendationPress,
}) => {
  const isUser = message.type === MessageType.USER;
  const isAI = message.type === MessageType.AI;

  const renderSuggestions = () => {
    if (!message.metadata?.suggestions) return null;

    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Suggested questions:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {message.metadata.suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionChip}
              onPress={() => onSuggestionPress?.(suggestion)}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderRecommendations = () => {
    if (!message.metadata?.recommendations) return null;

    return (
      <View style={styles.recommendationsContainer}>
        <Text style={styles.recommendationsTitle}>🌊 Recommendations for you:</Text>
        {message.metadata.recommendations.map((rec, index) => (
          <TouchableOpacity
            key={index}
            style={styles.recommendationCard}
            onPress={() => onRecommendationPress?.(rec)}
          >
            <View style={styles.recommendationHeader}>
              <Text style={styles.recommendationName}>{rec.name}</Text>
              <View style={styles.ratingContainer}>
                <Icon name="star" size={16} color={Colors.secondary} />
                <Text style={styles.ratingText}>{rec.rating}</Text>
              </View>
            </View>
            <Text style={styles.recommendationCategory}>{rec.category}</Text>
            <Text style={styles.recommendationDescription} numberOfLines={2}>
              {rec.description}
            </Text>
            <View style={styles.recommendationFooter}>
              <Text style={styles.priceCategory}>{rec.priceCategory}</Text>
              <Text style={styles.distanceText}>{rec.distance}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderMetadata = () => {
    if (!message.metadata) return null;

    return (
      <View style={styles.metadataContainer}>
        {message.metadata.isError && (
          <View style={styles.errorBadge}>
            <Icon name="error-outline" size={12} color={Colors.error} />
            <Text style={styles.errorText}>Limited connectivity</Text>
          </View>
        )}
        {message.metadata.fallbackMode && (
          <View style={styles.offlineBadge}>
            <Icon name="offline-bolt" size={12} color={Colors.warning} />
            <Text style={styles.offlineText}>Offline mode</Text>
          </View>
        )}
        {message.metadata.confidence && (
          <Text style={styles.confidenceText}>
            Confidence: {Math.round(message.metadata.confidence * 100)}%
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {/* AI Icon for AI messages */}
        {isAI && (
          <View style={styles.aiIconContainer}>
            <Icon name="explore" size={20} color={Colors.primary} />
          </View>
        )}

        {/* Message Text */}
        <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
          {message.text}
        </Text>

        {/* Timestamp */}
        <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.aiTimestamp]}>
          {formatMessageTime(message.timestamp)}
        </Text>

        {/* Metadata */}
        {renderMetadata()}

        {/* Suggestions */}
        {renderSuggestions()}

        {/* Recommendations */}
        {renderRecommendations()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  aiContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: 15,
    borderRadius: 20,
    position: 'relative',
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 5,
  },
  aiBubble: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  aiIconContainer: {
    position: 'absolute',
    top: -10,
    left: 15,
    backgroundColor: Colors.white,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: Colors.white,
  },
  aiText: {
    color: Colors.darkGray,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 8,
  },
  userTimestamp: {
    color: Colors.white,
    opacity: 0.8,
    textAlign: 'right',
  },
  aiTimestamp: {
    color: Colors.gray,
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 11,
    color: Colors.error,
    marginLeft: 4,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineText: {
    fontSize: 11,
    color: Colors.warning,
    marginLeft: 4,
  },
  confidenceText: {
    fontSize: 11,
    color: Colors.gray,
  },
  suggestionsContainer: {
    marginTop: 15,
  },
  suggestionsTitle: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 8,
    fontWeight: '600',
  },
  suggestionChip: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  recommendationsContainer: {
    marginTop: 15,
  },
  recommendationsTitle: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 10,
    fontWeight: '600',
  },
  recommendationCard: {
    backgroundColor: Colors.lightGray,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recommendationName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.darkGray,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: Colors.darkGray,
    marginLeft: 4,
    fontWeight: '600',
  },
  recommendationCategory: {
    fontSize: 12,
    color: Colors.primary,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 14,
    color: Colors.gray,
    lineHeight: 18,
    marginBottom: 8,
  },
  recommendationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceCategory: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '700',
  },
  distanceText: {
    fontSize: 12,
    color: Colors.gray,
  },
});

export default MessageBubble;