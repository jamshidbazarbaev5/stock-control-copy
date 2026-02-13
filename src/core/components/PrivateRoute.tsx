import { Navigate, useLocation } from "react-router-dom";
import { useRef } from "react";
import { useAuth } from "../context/AuthContext";

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function  PrivateRoute({ children, allowedRoles }: PrivateRouteProps) {
  const { currentUser, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();
  const componentId = useRef(Math.random().toString(36).substring(7));

  const hasAccess = (routeRoles: string[]) => {
    if (!currentUser) return false;
    // Check for superuser first
    if (currentUser.is_superuser) return true;
    // Then check for administrator role
    if (currentUser.role === "Администратор") return true;
    if (currentUser.role === "Продавец") {
      const accessibleRoutes = [
        "/sales",
        "/clients",
        "/debts",
        "/dashboard",
        "/create-sale",
        "/edit-sale/:id",
        "/create-stock",
        "/create-client",
        "/edit-client/:id",
        "/clients/:id/history",
        "/debts/:id",
        "/debts/:id/history",
        "/profile",
        "/product-stock-balance",
        "/pos",
        "/pos-fullscreen",
        "/expense",
        "/income",
          "/create-expense",
        "/income/:id",
          "/dashboard",
        "/debts/:id/payments",
        "/shifts",
        "/product-stock-balance",
        "/close-shift/active",
        "/shifts/:id/edit",
      ];
      // Convert route patterns to regex patterns
      const matchRoute = (pattern: string, path: string) => {
        const regexPattern = pattern.replace(/:\w+/g, "[^/]+");
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(path);
      };

      return accessibleRoutes.some((route) =>
        matchRoute(route, location.pathname),
      );
    }
    return routeRoles.includes(currentUser.role);
  };

  console.log(
    `[PrivateRoute-${componentId.current}] Path: ${location.pathname}, Roles: ${JSON.stringify(allowedRoles)}, Loading: ${isLoading}, User: ${currentUser ? currentUser.name : "null"}, Authenticated: ${isAuthenticated}`,
  );

  // Show loading screen while auth state is being determined
  if (isLoading) {
    console.log(
      `[PrivateRoute-${componentId.current}] Showing loading screen, auth is loading`,
    );
    return <div>Loading...</div>;
  }

  // Not authenticated, redirect to login
  if (!isAuthenticated || !currentUser) {
    console.log(
      `[PrivateRoute-${componentId.current}] Not authenticated, redirecting to login`,
    );
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if route requires specific roles and if user has required role
  if (allowedRoles && !hasAccess(allowedRoles)) {
    console.log(
      `[PrivateRoute-${componentId.current}] User role '${currentUser?.role}' not in allowed roles ${JSON.stringify(allowedRoles)}`,
    );

    // If user's role is not in the allowed roles, redirect to a default page
    // For sellers, redirect based on mobile/desktop preference
    if (currentUser?.role === "Продавец") {
      if (currentUser.is_mobile_user) {
        return <Navigate to="/create-sale" replace />;
      } else {
        return <Navigate to="/pos" replace />;
      }
    }

    // For other unauthorized roles, redirect to unauthorized page
    return <Navigate to="/unauthorized" replace />;
  }

  console.log(
    `[PrivateRoute-${componentId.current}] Rendering children for user ${currentUser.name} with role ${currentUser.role}`,
  );
  return <>{children}</>;
}
