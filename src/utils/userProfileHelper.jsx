import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { STORE_ITEMS } from './storeItems';

// Icon mapping from storeItems
const iconMap = {
  flask_blue: '🧪', atom_green: '⚛️', molecule: '🔬', fire: '🔥',
  lightning: '⚡', crystal: '💎', explosion: '💥', star: '⭐',
  crown: '👑', trophy: '🏆'
};

/**
 * Get user profile data including profile icon and theme
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User profile data with icon info
 */
export async function getUserProfileData(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return {
        displayName: 'Anonymous',
        profileIcon: '🧪',
        profileColor: '#2563eb',
        profilePicId: 'flask_blue'
      };
    }
    
    const userData = userDoc.data();
    const equipped = userData.equipped || {};
    const profilePicId = equipped.profilePic || 'flask_blue';
    const profileColor = userData.profileColor || '#2563eb';
    
    return {
      displayName: userData.displayName || 'Anonymous',
      profileIcon: iconMap[profilePicId] || '🧪',
      profileColor: profileColor,
      profilePicId: profilePicId
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return {
      displayName: 'Anonymous',
      profileIcon: '🧪',
      profileColor: '#2563eb',
      profilePicId: 'flask_blue'
    };
  }
}

/**
 * Get profile icon component for rendering
 * @param {Object} profileData - User profile data
 * @param {string} size - Size class ('small', 'medium', 'large')
 * @returns {JSX.Element} Profile icon component
 */
export function getProfileIcon(profileData, size = 'medium') {
  const sizeClasses = {
    small: 'w-6 h-6 text-xs',
    medium: 'w-8 h-8 text-sm',
    large: 'w-12 h-12 text-lg'
  };
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center shadow-md font-bold`}
      style={{ background: `linear-gradient(135deg, ${profileData.profileColor}, ${profileData.profileColor}dd)` }}
    >
      {profileData.profileIcon}
    </div>
  );
}
