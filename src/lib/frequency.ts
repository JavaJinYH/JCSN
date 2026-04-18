const FREQ_PREFIX = 'freq-';

interface FreqStats {
  [key: string]: number;
}

export function recordFrequency(type: string, id: string): void {
  try {
    const key = `${FREQ_PREFIX}${type}`;
    const stats = getAllStats(key) as FreqStats;
    const itemKey = `${type}-${id}`;
    stats[itemKey] = (stats[itemKey] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(stats));
  } catch (e) {
    console.error(`[Frequency] 记录失败 (${type}/${id}):`, e);
  }
}

export function getFrequency(type: string, id: string): number {
  try {
    const key = `${FREQ_PREFIX}${type}`;
    const stats = getAllStats(key) as FreqStats;
    const itemKey = `${type}-${id}`;
    return stats[itemKey] || 0;
  } catch (e) {
    return 0;
  }
}

function getAllStats(key: string): Record<string, number> {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
}

export interface SortableItem<T> {
  item: T;
  id: string;
  frequency: number;
}

export function sortByFrequency<T extends { id: string }>(
  items: T[],
  type: string,
  limit?: number
): T[] {
  const stats = getAllStats(`${FREQ_PREFIX}${type}`) as FreqStats;

  const itemsWithFreq = items.map(item => ({
    item,
    id: item.id,
    frequency: stats[`${type}-${item.id}`] || 0,
  }));

  itemsWithFreq.sort((a, b) => b.frequency - a.frequency);

  const sorted = itemsWithFreq.map(i => i.item);
  return limit ? sorted.slice(0, limit) : sorted;
}

export function getTopItems<T extends { id: string }>(
  items: T[],
  type: string,
  limit: number
): T[] {
  return sortByFrequency(items, type, limit);
}

export function resetFrequency(type?: string): void {
  try {
    if (type) {
      localStorage.removeItem(`${FREQ_PREFIX}${type}`);
    } else {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(FREQ_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  } catch (e) {
    console.error('[Frequency] 重置失败:', e);
  }
}

export function getAllFrequency(type: string): Record<string, number> {
  return getAllStats(`${FREQ_PREFIX}${type}`) as FreqStats;
}
