import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'search-outline',
  title,
  message,
  actionLabel,
  onAction,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 60,
      }}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Ionicons name={icon as any} size={36} color={theme.textMuted} />
      </View>
      
      <Text
        style={{
          color: theme.text,
          fontSize: 20,
          fontWeight: '700',
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      
      <Text
        style={{
          color: theme.textMuted,
          fontSize: 14,
          textAlign: 'center',
          lineHeight: 20,
          marginBottom: 24,
        }}
      >
        {message}
      </Text>

      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={{
            backgroundColor: theme.primary,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              color: theme.buttonPrimaryText,
              fontWeight: '600',
              fontSize: 14,
            }}
          >
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
