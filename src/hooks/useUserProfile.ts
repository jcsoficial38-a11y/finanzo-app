import { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types/finance';
import {
  getStoredUserProfile,
  saveStoredUserProfile,
  calculateInitials,
  PROFILE_UPDATE_EVENT,
  DEFAULT_USER_PROFILE,
} from '../utils/userProfileManager';
import { subscribeToAuth } from '../services/firebase';

export interface UseUserProfileReturn {
  profile: UserProfile;
  name: string;
  initials: string;
  avatarUrl: string;
  avatarColor: string;
  login: string;
  bio: string;
  updateProfile: (updates: Partial<UserProfile>) => void;
  refreshProfile: () => void;
}

/**
 * Centralized hook for sharing the user's profile state (real name, initials, and avatar URL)
 * across the entire application, synchronizing instantly with localStorage and components.
 */
export function useUserProfile(initialFallback?: UserProfile): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const stored = getStoredUserProfile();
    if (initialFallback && stored.name === DEFAULT_USER_PROFILE.name && initialFallback.name !== DEFAULT_USER_PROFILE.name) {
      return initialFallback;
    }
    return stored;
  });

  const refreshProfile = useCallback(() => {
    const fresh = getStoredUserProfile();
    setProfile(fresh);
  }, []);

  // 1. Listen for immediate in-app profile update events
  useEffect(() => {
    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<UserProfile>;
      if (customEvent.detail) {
        setProfile(customEvent.detail);
      } else {
        refreshProfile();
      }
    };

    window.addEventListener(PROFILE_UPDATE_EVENT, handleProfileUpdate);
    return () => {
      window.removeEventListener(PROFILE_UPDATE_EVENT, handleProfileUpdate);
    };
  }, [refreshProfile]);

  // 2. Listen for external tab localStorage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'finanzo_user_profile_v1' ||
        e.key === 'user_profile' ||
        e.key === 'userProfile' ||
        e.key === 'finanzo_user_name' ||
        e.key === 'finanzo_user_avatar'
      ) {
        refreshProfile();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshProfile]);

  // 3. Listen for Firebase Auth user (e.g. Google Login photo and name)
  useEffect(() => {
    const unsubscribe = subscribeToAuth((authUser) => {
      if (authUser) {
        setProfile((prev) => {
          // If current local profile still has generic default, upgrade with Google profile
          const isGeneric =
            !prev.name ||
            prev.name.trim().toLowerCase() === 'usuário' ||
            prev.name.trim().toLowerCase() === 'usuario';

          const hasPhoto = Boolean(prev.avatarUrl);

          if (isGeneric || !hasPhoto) {
            const upgraded: UserProfile = {
              ...prev,
              name: isGeneric && authUser.displayName ? authUser.displayName : prev.name || 'JC',
              avatarUrl: prev.avatarUrl || authUser.photoURL || '',
              login: prev.login === '@usuario' && authUser.email ? `@${authUser.email.split('@')[0]}` : prev.login,
            };
            saveStoredUserProfile(upgraded);
            return upgraded;
          }
          return prev;
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Update profile handler
  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      setProfile((prev) => {
        const next: UserProfile = {
          ...prev,
          ...updates,
        };
        saveStoredUserProfile(next);
        return next;
      });
    },
    []
  );

  const initials = calculateInitials(profile.name);

  return {
    profile,
    name: profile.name,
    initials,
    avatarUrl: profile.avatarUrl || '',
    avatarColor: profile.avatarColor || '#7dd3fc',
    login: profile.login || '@jc',
    bio: profile.bio || '',
    updateProfile,
    refreshProfile,
  };
}
