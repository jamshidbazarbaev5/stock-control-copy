export const formatDate = (date: Date | string): string => {
  const dateObject = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // This forces 24-hour format
    timeZone: 'UTC'  // This ensures we display the time in UTC
  }).format(dateObject);
}