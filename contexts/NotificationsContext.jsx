import { createContext, useContext } from "react";
import { useNotificationsFacade } from "../hooks/notifications/useNotificationsFacade";

// PULLBACK NOTE: NotificationsContext is now a thin compatibility boundary.
// Owns: provider requirement for legacy consumers.
// Does NOT own: query orchestration, selection/filter UI state, or mock data shaping.

const NotificationsContext = createContext(undefined);

export function NotificationsProvider({ children }) {
  const value = useNotificationsFacade();
  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider",
    );
  }
  return context;
}

export default NotificationsContext;
