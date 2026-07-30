/**
 * Predefined 24 distinct pastel colors for timetable schedule slots.
 */
export const PASTEL_COLORS: string[] = [
  '#fca5a5', // 1. Soft Red
  '#fdba74', // 2. Soft Apricot
  '#fde047', // 3. Pastel Yellow
  '#bef264', // 4. Lime Pastel
  '#86efac', // 5. Mint Green
  '#6ee7b7', // 6. Emerald Pastel
  '#99f6e4', // 7. Soft Turquoise
  '#7dd3fc', // 8. Sky Blue
  '#93c5fd', // 9. Soft Blue
  '#a5b4fc', // 10. Periwinkle
  '#c084fc', // 11. Soft Purple
  '#e879f9', // 12. Orchid Pastel
  '#f472b6', // 13. Bubblegum Pink
  '#fb7185', // 14. Soft Rose
  '#fed7aa', // 15. Peach
  '#fef08a', // 16. Lemon
  '#bbf7d0', // 17. Pale Green
  '#bae6fd', // 18. Baby Blue
  '#ddd6fe', // 19. Light Lavender
  '#fbcfe8', // 20. Light Pink
  '#fecdd3', // 21. Soft Coral
  '#a7f3d0', // 22. Seafoam
  '#bfdbfe', // 23. Ice Blue
  '#e9d5ff', // 24. Lilac
];

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

/**
 * Returns a pastel color from the 24-color palette.
 * If allSchedules is provided, ensures adjacent schedules sorted by startTime never share the same color.
 */
export const getScheduleColor = (
  scheduleId: string,
  allSchedules?: { id: string; startTime: string; dayId?: string }[]
): string => {
  if (!allSchedules || allSchedules.length <= 1) {
    const idx = hashString(scheduleId) % PASTEL_COLORS.length;
    return PASTEL_COLORS[idx];
  }

  const target = allSchedules.find(s => s.id === scheduleId);
  if (!target) {
    const idx = hashString(scheduleId) % PASTEL_COLORS.length;
    return PASTEL_COLORS[idx];
  }

  // Filter schedules belonging to the same day and sort by startTime
  const sameDaySchedules = allSchedules
    .filter(s => !target.dayId || !s.dayId || s.dayId === target.dayId)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const assignedIndices: Record<string, number> = {};
  let prevIndex = -1;

  for (const s of sameDaySchedules) {
    let idx = hashString(s.id) % PASTEL_COLORS.length;
    // If color matches adjacent schedule, shift index
    if (idx === prevIndex) {
      idx = (idx + 7) % PASTEL_COLORS.length;
    }
    assignedIndices[s.id] = idx;
    prevIndex = idx;
  }

  const targetIndex = assignedIndices[scheduleId];
  if (targetIndex !== undefined) {
    return PASTEL_COLORS[targetIndex];
  }

  return PASTEL_COLORS[hashString(scheduleId) % PASTEL_COLORS.length];
};
