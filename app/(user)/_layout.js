// user/_layout.js
import React from 'react';
import { Stack } from 'expo-router';

export default function UserLayout() {
  return (
    <Stack>
      {/* Tabs */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* <Stack.Screen name="(stacks)" options={{ headerShown: false }} /> */}
    </Stack>
  );
}
``
