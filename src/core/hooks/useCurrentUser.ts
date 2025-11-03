import { useAuth } from "../context/AuthContext";

export interface CurrentUser {
  id: number;
  name: string;
  phone_number: string;
  role: string;
  can_view_quantity: boolean;
  is_superuser: boolean;
  has_active_shift: boolean;
  is_mobile_user: boolean;
  store_read?: {
    id: number;
    name: string;
    address: string;
    phone_number: string;
    budget: string;
    created_at: string;
    is_main: boolean;
    parent_store: number | null;
    owner: number;
  };
}

/**
 * Hook to get the current user data from the auth context
 * This is a wrapper around the auth context to maintain backward compatibility
 * with existing code that uses useCurrentUser()
 */
export function useCurrentUser() {
  const { currentUser, isLoading } = useAuth();

  // Return in the same format as the original useQuery hook
  return {
    data: currentUser,
    isLoading,
    isError: false,
    error: null,
    isSuccess: !isLoading && currentUser !== null,
  };
}
