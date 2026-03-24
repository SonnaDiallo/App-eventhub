/**
 * EventNavigator.tsx - Sous-navigateur dédié aux écrans d'événements.
 * 
 * Stack secondaire prévu pour regrouper les écrans liés à la gestion
 * d'événements. Actuellement, contient uniquement CreateEvent.
 * Extensible pour ajouter d'autres écrans événementiels.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CreateEventScreen from '../screens/Events/CreateEventScreen';

export type EventStackParamList = {
  CreateEvent: undefined;
};

const Stack = createNativeStackNavigator<EventStackParamList>();

const EventNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
    </Stack.Navigator>
  );
};

export default EventNavigator;