import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../lib/auth.jsx';

/* The signed-in user's own `profiles` row (RLS: auth.uid() = id, so this can
   only ever return their own). React Query fits well here — unlike the
   session itself, this is a plain fetch-and-cache, and the mutation below
   invalidates it so a semester change is reflected everywhere immediately. */
export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email, semester')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    // The signup trigger that creates this row can lag a beat behind the
    // client receiving its session; a couple of quick retries covers that.
    retry: 3,
    retryDelay: 400,
    staleTime: 60_000,
  });
}

export function useSetSemester() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (semester) => {
      const { error } = await supabase.from('profiles').update({ semester }).eq('id', user.id);
      if (error) throw error;
      return semester;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', user?.id] }),
  });
}
