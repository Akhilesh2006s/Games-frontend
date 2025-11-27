/**
 * Get display name for a user, preferring studentName over username
 * @param {Object} user - User object with studentName and/or username
 * @param {string} fallback - Fallback name if neither is available
 * @returns {string}
 */
export const getDisplayName = (user, fallback = 'Player') => {
  if (!user) return fallback;
  return user.studentName || user.username || fallback;
};

