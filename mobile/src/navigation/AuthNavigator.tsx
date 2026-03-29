/**
 * AuthNavigator.tsx - Navigateur principal de l'application (Stack Navigator).
 * 
 * Contient TOUTES les routes de l'app dans un seul stack :
 * - Auth : Welcome, Login, Register, ForgotPassword
 * - Participant : HomeParticipant, MyTickets, Favorites, TrendingEvents
 * - Événements : EventDetails, CreateEvent, Participants, AddReview, Payment
 * - Organisateur : OrganizerDashboard, ScanTicket, ParticipantsOverview
 * - Social : Friends, ChatList, ChatRoom
 * - Profil : Profile, OrganizerProfile, Settings, EditProfile, ChangePassword
 * - Admin : AdminHome, AdminDashboard, AdminUsers, AdminEvents, AdminReviews
 * 
 * Exporte aussi les types EventData et AuthStackParamList pour le typage
 * de la navigation dans toute l'app.
 */

import React from 'react';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useTheme } from '../theme/ThemeContext';

import LoginScreen from '../screens/Auth/LoginScreen';

import RegisterScreen from '../screens/Auth/RegisterScreen';

import WelcomeScreen from '../screens/Auth/WelcomeScreen';

import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';

import CreateEventScreen from '../screens/Events/CreateEventScreen';

import EventDetailsScreen from '../screens/Events/EventDetailsScreen';

import ParticipantsScreen from '../screens/Events/ParticipantsScreen';

import HomeParticipantScreen from '../screens/Events/HomeParticipantScreen';

import MyTicketsScreen from '../screens/Events/MyTicketsScreen';

import OrganizerDashboardScreen from '../screens/Organizer/OrganizerDashboardScreen';

import ScanTicketScreen from '../screens/Organizer/ScanTicketScreen';

import SettingsScreen from '../screens/Settings/SettingsScreen';

import EditProfileScreen from '../screens/Settings/EditProfileScreen';
import ChangePasswordScreen from '../screens/Settings/ChangePasswordScreen';

import ProfileScreen from '../screens/Profile/ProfileScreen';

import OrganizerProfileScreen from '../screens/Profile/OrganizerProfileScreen';

import FavoritesScreen from '../screens/Events/FavoritesScreen';

import ParticipantsOverviewScreen from '../screens/Organizer/ParticipantsOverviewScreen';

import FriendsScreen from '../screens/Friends/FriendsScreen';

import ChatListScreen from '../screens/Chat/ChatListScreen';

import ChatRoomScreen from '../screens/Chat/ChatRoomScreen';

import { AddReviewScreen } from '../screens/Events/AddReviewScreen';

import { PaymentScreen } from '../screens/Payment/PaymentScreen';

import TrendingEventsScreen from '../screens/Events/TrendingEventsScreen';

import AdminHomeScreen from '../screens/Admin/AdminHomeScreen';

import AdminDashboardScreen from '../screens/Admin/AdminDashboardScreen';

import AdminUsersScreen from '../screens/Admin/AdminUsersScreen';

import AdminEventsScreen from '../screens/Admin/AdminEventsScreen';
import AdminReviewsScreen from '../screens/Admin/AdminReviewsScreen';
import MapScreen from '../screens/Events/MapScreen';



/** Structure des données d'un événement partagée dans toute l'app via la navigation */
export type EventData = {

  id: string;

  title: string;

  coverImage: string;

  date?: string;

  time?: string;

  startDate?: string;

  endDate?: string;

  location: string;

  address?: string;

  organizer?: string;

  organizerId?: string;

  organizerName?: string;

  description: string;

  price?: number;

  isFree: boolean;

  category?: string | null;

  capacity?: number;

  participantsCount?: number;

  createdAt?: any;

  isExternal?: boolean;

  externalLink?: string;

  source?: string;

};



/** Typage de toutes les routes et leurs paramètres pour React Navigation */
export type AuthStackParamList = {

  Welcome: undefined;

  Login: undefined;

  Register: undefined;

  ForgotPassword: undefined;

  HomeParticipant: undefined;

  MyTickets: undefined;

  OrganizerDashboard: undefined;

  ScanTicket: undefined;

  CreateEvent: undefined;

  EventDetails: { event?: EventData } | undefined;

  Participants: { eventId: string };

  Settings: undefined;

  EditProfile: undefined;

  ChangePassword: undefined;

  Profile: undefined;

  Favorites: undefined;

  ParticipantsOverview: { eventId: string; eventTitle?: string };

  Friends: { openTab?: 'requests' } | undefined;

  ChatList: undefined;

  ChatRoom: { userId: string; userName: string };

  AddReview: { eventId: string; eventTitle: string };

  Payment: { eventId: string; eventTitle: string; amount: number; ticketId: string };

  TrendingEvents: undefined;

  AdminHome: undefined;

  AdminDashboard: undefined;

  AdminUsers: undefined;

  AdminEvents: undefined;
  AdminReviews: undefined;

  Map: undefined;

};



const Stack = createNativeStackNavigator<AuthStackParamList>();



const AuthNavigator: React.FC = () => {

  const { theme } = useTheme();

  return (

    <Stack.Navigator 

      initialRouteName="Welcome"

      screenOptions={{

        headerStyle: {

          backgroundColor: theme.header,

        },

        headerTintColor: theme.text,

        headerTitleStyle: {

          fontWeight: '600',

        },

        contentStyle: { backgroundColor: theme.background },

      }}

    >

      <Stack.Screen

        name="Welcome"

        component={WelcomeScreen}

        options={{ headerShown: false }}

      />

      <Stack.Screen

        name="Login"

        component={LoginScreen}

        options={{ title: 'Connexion' }}

      />

      <Stack.Screen

        name="Register"

        component={RegisterScreen}

        options={{ title: 'Inscription' }}

      />

      <Stack.Screen

        name="ForgotPassword"

        component={ForgotPasswordScreen}

        options={{ title: 'Mot de passe oublié' }}

      />

      <Stack.Screen

        name="HomeParticipant"

        component={HomeParticipantScreen}

        options={{ headerShown: false }}

      />

      <Stack.Screen

        name="MyTickets"

        component={MyTicketsScreen}

        options={{ headerShown: false }}

      />

      <Stack.Screen

        name="OrganizerDashboard"

        component={OrganizerDashboardScreen}

        options={{ headerShown: false }}

      />

      <Stack.Screen

        name="ScanTicket"

        component={ScanTicketScreen}

        options={{ headerShown: false }}

      />

      <Stack.Screen

        name="CreateEvent"

        component={CreateEventScreen}

        options={{ headerShown: false }}

      />

      <Stack.Screen

        name="EventDetails"

        component={EventDetailsScreen}

        options={{ headerShown: false }}

      />

      <Stack.Screen

        name="Participants"

        component={ParticipantsScreen}

        options={{ title: 'Participants' }}

      />

      <Stack.Screen

        name="Settings"

        component={SettingsScreen}

        options={{ headerShown: false }}

      />

      <Stack.Screen

        name="EditProfile"

        component={EditProfileScreen}

        options={{ headerShown: false }}

      />

      <Stack.Screen

        name="ChangePassword"

        component={ChangePasswordScreen}

        options={{ headerShown: false }}

      />

      <Stack.Screen

        name="Profile"

        component={ProfileScreen}

        options={{ headerShown: false }}

      />

      <Stack.Screen

        name="Favorites"

        component={FavoritesScreen}

        options={{ headerShown: false }}

      />

      <Stack.Screen

        name="ParticipantsOverview"

        component={ParticipantsOverviewScreen}

        options={{ headerShown: false }}

      />

      <Stack.Screen

        name="Friends"

        component={FriendsScreen}

        options={{ title: 'Mes amis' }}

      />

      <Stack.Screen

        name="ChatList"

        component={ChatListScreen}

        options={{ title: 'Messages' }}

      />

      <Stack.Screen

        name="ChatRoom"

        component={ChatRoomScreen}

        options={({ route }) => ({ title: (route.params as { userName?: string })?.userName || 'Chat' })}

      />

      <Stack.Screen

        name="AddReview"

        component={AddReviewScreen}

        options={{ headerShown: false }}

      />

      <Stack.Screen

        name="Payment"

        component={PaymentScreen}

        options={{ headerShown: false }}

      />

      <Stack.Screen

        name="TrendingEvents"

        component={TrendingEventsScreen}

        options={{ headerShown: false }}

      />

      <Stack.Screen

        name="AdminHome"

        component={AdminHomeScreen}

        options={{ title: 'Espace admin' }}

      />

      <Stack.Screen

        name="AdminDashboard"

        component={AdminDashboardScreen}

        options={{ title: 'Tableau de bord' }}

      />

      <Stack.Screen

        name="AdminUsers"

        component={AdminUsersScreen}

        options={{ title: 'Utilisateurs' }}

      />

      <Stack.Screen

        name="AdminEvents"

        component={AdminEventsScreen}

        options={{ title: 'Événements' }}

      />

      <Stack.Screen

        name="AdminReviews"

        component={AdminReviewsScreen}

        options={{ title: 'Avis' }}

      />

      <Stack.Screen

        name="Map"

        component={MapScreen}

        options={{ headerShown: false }}

      />

    </Stack.Navigator>

  );

};

export default AuthNavigator;