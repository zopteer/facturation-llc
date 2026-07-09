'use client';
import { useEffect, useState } from 'react';
import { createBrowserSupabase } from './supabase/client';

export function useOrg() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.from('memberships').select('org_id').limit(1).single()
      .then(({ data }) => {
        setOrgId(data?.org_id ?? null);
        setLoading(false);
      });
  }, []);

  return { orgId, loading };
}
