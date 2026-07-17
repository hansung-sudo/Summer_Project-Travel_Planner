/**
 * Generates a deterministic neo-brutalist pastel color based on the schedule's ID.
 * This guarantees the color remains consistent across renders while giving
 * each slot a distinct, colorful appearance.
 */
export const getScheduleColor = (scheduleId: string): string => {
  const COLORS = [
    '#fca5a5', // Soft Red
    '#fed7aa', // Orange
    '#fef08a', // Yellow
    '#bbf7d0', // Soft Green
    '#99f6e4', // Teal
    '#bae6fd', // Sky Blue
    '#93c5fd', // Soft Blue
    '#c7d2fe', // Indigo
    '#ddd6fe', // Lavender/Purple
    '#fbcfe8', // Soft Pink
    '#fecdd3', // Soft Rose
    '#a7f3d0', // Emerald
  ];

  let hash = 0;
  for (let i = 0; i < scheduleId.length; i++) {
    hash = scheduleId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index];
};
