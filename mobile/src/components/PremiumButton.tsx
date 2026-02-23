import React from 'react';
import { TouchableOpacity, Text, Animated, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface PremiumButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  size = 'medium',
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const sizeStyles = {
    small: { paddingVertical: 10, paddingHorizontal: 16, fontSize: 13 },
    medium: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 15 },
    large: { paddingVertical: 18, paddingHorizontal: 32, fontSize: 17 },
  };

  const currentSize = sizeStyles[size];

  if (variant === 'primary') {
    return (
      <Animated.View 
        style={{ 
          transform: [{ scale: scaleAnim }],
          width: fullWidth ? '100%' : 'auto',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          activeOpacity={0.9}
          style={{
            borderRadius: 20,
            overflow: 'hidden',
            shadowColor: '#6366F1',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingVertical: currentSize.paddingVertical,
              paddingHorizontal: currentSize.paddingHorizontal,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                {icon && (
                  <Ionicons 
                    name={icon} 
                    size={currentSize.fontSize + 4} 
                    color="#FFFFFF" 
                    style={{ marginRight: 8 }} 
                  />
                )}
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: currentSize.fontSize,
                    fontWeight: '700',
                  }}
                >
                  {title}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (variant === 'outline') {
    return (
      <Animated.View 
        style={{ 
          transform: [{ scale: scaleAnim }],
          width: fullWidth ? '100%' : 'auto',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          activeOpacity={0.9}
          style={{
            borderRadius: 20,
            borderWidth: 2,
            borderColor: '#6366F1',
            paddingVertical: currentSize.paddingVertical,
            paddingHorizontal: currentSize.paddingHorizontal,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(99, 102, 241, 0.05)',
          }}
        >
          {loading ? (
            <ActivityIndicator color="#6366F1" size="small" />
          ) : (
            <>
              {icon && (
                <Ionicons 
                  name={icon} 
                  size={currentSize.fontSize + 4} 
                  color="#6366F1" 
                  style={{ marginRight: 8 }} 
                />
              )}
              <Text
                style={{
                  color: '#6366F1',
                  fontSize: currentSize.fontSize,
                  fontWeight: '700',
                }}
              >
                {title}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      style={{ 
        transform: [{ scale: scaleAnim }],
        width: fullWidth ? '100%' : 'auto',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
        style={{
          borderRadius: 20,
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F3F4F6',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#6B7280" size="small" />
        ) : (
          <>
            {icon && (
              <Ionicons 
                name={icon} 
                size={currentSize.fontSize + 4} 
                color="#6B7280" 
                style={{ marginRight: 8 }} 
              />
            )}
            <Text
              style={{
                color: '#374151',
                fontSize: currentSize.fontSize,
                fontWeight: '600',
              }}
            >
              {title}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};
