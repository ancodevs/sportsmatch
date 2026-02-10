import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
      }}
    >
      {/* Tab de Match */}
      <Tabs.Screen
        name="match"
        options={{
          title: 'Match',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="football" size={size} color={color} />
          ),
        }}
      />

      {/* Tab de Teams */}
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Teams',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />

      {/* Tab de Ranking */}
      <Tabs.Screen
        name="ranking"
        options={{
          title: 'Ranking',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy" size={size} color={color} />
          ),
        }}
      />

      {/* Tab de Perfil */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />

      {/* Pantalla de Settings - Oculta del tab bar */}
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // Oculta del tab bar, solo accesible desde perfil
        }}
      />
    </Tabs>
  );
}
