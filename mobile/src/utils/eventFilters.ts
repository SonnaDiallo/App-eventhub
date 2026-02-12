import type { EventData } from '../navigation/AuthNavigator';

export type SortOption = 'date' | 'price-asc' | 'price-desc' | 'title';

export const filterEvents = (
  events: EventData[],
  searchQuery: string,
  selectedCategory: string | null
): EventData[] => {
  let result = events;
  
  if (selectedCategory) {
    result = result.filter((e) => e.category === selectedCategory);
  }
  
  const q = searchQuery.trim().toLowerCase();
  if (q) {
    result = result.filter((e) => {
      return (
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.organizer.toLowerCase().includes(q)
      );
    });
  }
  
  return result;
};

export const sortEvents = (events: EventData[], sortBy: SortOption): EventData[] => {
  const sorted = [...events];
  
  switch (sortBy) {
    case 'date':
      sorted.sort((a, b) => {
        const eventA = a as EventData & { _startDate?: Date };
        const eventB = b as EventData & { _startDate?: Date };
        const dateA = eventA._startDate ? eventA._startDate.getTime() : (a.date ? new Date(a.date).getTime() : Infinity);
        const dateB = eventB._startDate ? eventB._startDate.getTime() : (b.date ? new Date(b.date).getTime() : Infinity);
        return dateA - dateB;
      });
      break;
    case 'price-asc':
      sorted.sort((a, b) => {
        const priceA = a.isFree ? 0 : a.price;
        const priceB = b.isFree ? 0 : b.price;
        return priceA - priceB;
      });
      break;
    case 'price-desc':
      sorted.sort((a, b) => {
        const priceA = a.isFree ? Infinity : a.price;
        const priceB = b.isFree ? Infinity : b.price;
        return priceB - priceA;
      });
      break;
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }
  
  return sorted;
};
