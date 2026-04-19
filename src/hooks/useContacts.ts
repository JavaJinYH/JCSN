import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import { sortByFrequency } from '@/lib/frequency';
import type { Contact } from '@/lib/types';

interface UseContactsOptions {
  contactType?: string;
  sortByFreq?: boolean;
}

export function useContacts(options: UseContactsOptions = {}) {
  const { contactType, sortByFreq = true } = options;
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const where: any = {};
      if (contactType) {
        where.contactType = contactType;
      }

      const data = await db.contact.findMany({
        where,
        orderBy: { name: 'asc' },
      });
      setContacts(sortByFreq ? sortByFrequency(data, 'contact') : data);
    } catch (error) {
      console.error('[useContacts] 加载联系人失败:', error);
    } finally {
      setLoading(false);
    }
  }, [contactType, sortByFreq]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  return { contacts, loading, refresh: loadContacts };
}
