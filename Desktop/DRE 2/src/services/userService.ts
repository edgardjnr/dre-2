import { supabase } from '../lib/supabaseClient';
import { AuthError, User } from '@supabase/supabase-js';

export interface UserRegistrationData {
  email: string;
  password: string;
  fullName: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  updated_at?: string;
}

export interface AuthResponse {
  user: User | null;
  error: AuthError | null;
}

/**
 * Service for handling user registration and profile management
 */
export class UserService {
  /**
   * Register a new user with email and password
   */
  static async registerUser(userData: UserRegistrationData): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.fullName,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      return {
        user: data.user,
        error: error,
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        user: null,
        error: error as AuthError,
      };
    }
  }

  /**
   * Get user profile information
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Profile fetch error:', error);
      return null;
    }
  }

  /**
   * Update user profile information
   */
  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user profile:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Profile update error:', error);
      return false;
    }
  }

  /**
   * Sign in user with email and password
   */
  static async signInUser(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return {
        user: data.user,
        error: error,
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        user: null,
        error: error as AuthError,
      };
    }
  }

  /**
   * Sign out the current user
   */
  static async signOutUser(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: error as AuthError };
    }
  }

  /**
   * Check if a user is authenticated
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error getting current user:', error);
        return null;
      }

      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }
}