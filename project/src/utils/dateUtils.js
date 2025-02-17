// Convert epoch timestamp to readable format
export const formatEpochTime = (epochTime) => {
  return new Date(epochTime * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};


// Get epoch timestamp for start of day
export const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
};