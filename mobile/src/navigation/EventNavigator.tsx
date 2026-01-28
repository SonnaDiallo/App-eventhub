// mobile/src/navigation/EventNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CreateEventScreen from '../screens/Events/CreateEventScreen';

export type EventStackParamList = {
  CreateEvent: undefined;
  // Nous ajouterons d'autres écrans d'événements ici plus tard
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