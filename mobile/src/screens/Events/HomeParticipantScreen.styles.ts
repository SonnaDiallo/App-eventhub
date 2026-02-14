import { StyleSheet, Platform } from 'react-native';
import type { ThemeColors } from '../../theme/theme';

export const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  
  scrollContent: {
    paddingBottom: 22,
  },

  // Header
  header: {
    backgroundColor: theme.header,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerTitle: {
    color: theme.text,
    fontWeight: '900',
    fontSize: 20,
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero Section
  heroSection: {
    backgroundColor: theme.header,
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    position: 'relative',
    overflow: 'hidden',
  },

  heroGradientTop: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: theme.primary,
    opacity: 0.1,
  },

  heroGradientBottom: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: theme.primary,
    opacity: 0.1,
  },

  heroTitle: {
    color: theme.text,
    fontWeight: '900',
    fontSize: 32,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },

  heroTitleHighlight: {
    color: theme.primary,
    fontWeight: '900',
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 16,
  },

  heroSubtitle: {
    color: theme.textMuted,
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 24,
    textAlign: 'center',
  },

  // Sort Menu
  sortMenu: {
    marginTop: 12,
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
  },

  sortMenuTitle: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 12,
  },

  sortMenuOptions: {
  },

  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },

  sortOptionActive: {
    backgroundColor: `${theme.primary}20`,
  },

  sortOptionText: {
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 10,
  },

  sortOptionTextActive: {
    color: theme.primary,
    fontWeight: '700',
  },

  // Featured Event
  featuredSection: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },

  featuredBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  featuredBadge: {
    backgroundColor: theme.primary,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },

  featuredBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  categoryBadge: {
    backgroundColor: theme.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },

  categoryBadgeText: {
    color: theme.text,
    fontWeight: '600',
    fontSize: 12,
  },

  featuredCard: {
    backgroundColor: theme.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },

  featuredImage: {
    width: '100%',
    height: 240,
  },

  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },

  featuredTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 24,
    marginBottom: 8,
  },

  featuredDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },

  featuredInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  featuredInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  featuredInfoText: {
    color: '#FFFFFF',
    fontSize: 13,
  },

  featuredActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  featuredButton: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },

  featuredButtonText: {
    color: theme.buttonPrimaryText,
    fontWeight: '700',
    fontSize: 15,
  },

  featuredPrice: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 20,
  },

  // Events Grid
  eventsSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  sectionTitle: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 18,
  },

  eventsGrid: {
  },

  eventGridRow: {
    flexDirection: 'row',
  },

  eventCardWrapper: {
    flex: 1,
  },

  // Loading & Empty States
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },

  loadingText: {
    color: theme.textMuted,
    marginTop: 16,
    fontSize: 14,
  },

  // FAB (Floating Action Button) pour créer un événement
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
