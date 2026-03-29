/**
 * ErrorBoundary.tsx - Composant de capture d'erreurs React.
 * 
 * Intercepte les erreurs JavaScript dans l'arbre des composants enfants,
 * affiche un écran d'erreur convivial et permet de réessayer l'action.
 * Empêche les crashes complets de l'application.
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error | undefined;
}

/**
 * Composant interne qui utilise le thème car il doit être un composant classe
 * pour implémenter getDerivedStateFromError et componentDidCatch.
 */
function ErrorBoundaryContent({ children, fallback }: Props) {
  const { theme } = useTheme();

  return (
    <ErrorBoundaryInner theme={theme} fallback={fallback}>
      {children}
    </ErrorBoundaryInner>
  );
}

class ErrorBoundaryInner extends Component<Props & { theme: any }, State> {
  constructor(props: Props & { theme: any }) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // @ts-ignore - TypeScript exige override mais cette version ne le supporte pas
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    
    // TODO: Envoyer l'erreur à un service de monitoring comme Sentry
    // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    const { theme } = this.props;
    
    if (this.state.hasError) {
      // Fallback personnalisé si fourni
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Écran d'erreur par défaut
      return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={styles.content}>
            <Ionicons 
              name="warning-outline" 
              size={64} 
              color={theme.error || '#ff6b6b'} 
              style={styles.icon}
            />
            <Text style={[styles.title, { color: theme.text }]}>
              Oups ! Une erreur est survenue
            </Text>
            <Text style={[styles.message, { color: theme.textSecondary }]}>
              L'application a rencontré un problème inattendu. 
              Vous pouvez réessayer ou redémarrer l'application.
            </Text>
            
            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={[styles.errorTitle, { color: theme.error }]}>
                  Détails de l'erreur (mode dev) :
                </Text>
                <Text style={[styles.errorText, { color: theme.textSecondary }]}>
                  {this.state.error.toString()}
                </Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: theme.primary }]}
              onPress={this.handleRetry}
            >
              <Text style={[styles.retryText, { color: theme.buttonPrimaryText }]}>
                Réessayer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  errorDetails: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundaryContent;
