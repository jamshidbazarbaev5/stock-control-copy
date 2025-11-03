import { createResourceApiHooks } from '../helpers/createResourceApi';
import { useMutation } from '@tanstack/react-query';
import api from './api';

// Types
export interface User {
  id?: number;
  name: string;
  phone_number: string;
  role: string;
  password?: string;
  is_active: boolean;
  is_mobile_user: boolean;
  can_view_quantity?: boolean;
  store_write?: number | null;
}

// API endpoints
const USER_URL = 'users/';

// Create user API hooks using the factory function
export const {
  useGetResources: useGetUsers,
  useGetResource: useGetUser,
  useCreateResource: useCreateUser,
  useUpdateResource: useUpdateUser,
  useDeleteResource: useDeleteUser,
} = createResourceApiHooks<User>(USER_URL, 'users');

// Custom hook for updating current user profile
export const useUpdateCurrentUser = () => {
  return useMutation({
    mutationFn: async (data: Partial<User>) => {
      const response = await api.patch<User>('users/me/', data);
      return response.data;
    }
  });
};
