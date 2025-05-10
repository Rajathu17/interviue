/**
 * Utility functions for the Interviuzilla application
 */

/**
 * Returns a random interview cover image URL
 * @returns {string} The URL of a random interview cover image
 */
export function getRandomInterviewCover() {
  // Using placeholder image URLs for now - these would be replaced with actual cover images
  const coverImages = [
    "https://placehold.co/600x400/4f46e5/ffffff?text=Technical+Interview",
    "https://placehold.co/600x400/6366f1/ffffff?text=Behavioral+Interview",
    "https://placehold.co/600x400/8b5cf6/ffffff?text=Job+Interview",
    "https://placehold.co/600x400/a855f7/ffffff?text=Career+Questions",
    "https://placehold.co/600x400/ec4899/ffffff?text=Professional+Interview"
  ];
  
  return coverImages[Math.floor(Math.random() * coverImages.length)];
}

/**
 * Formats a date string into a readable format
 * @param {string} dateStr - The date string to format
 * @returns {string} The formatted date string
 */
export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
} 