import { useQuery } from '@tanstack/react-query';
import { businessRepository } from '@/app/lib/repositories/business.repository';
import type { SearchOptions } from '@/app/lib/repositories/business.repository';

export function useBusinesses(options: SearchOptions = {}) {
  return useQuery({
    queryKey: ['businesses', options],
    queryFn: () => businessRepository.search(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useBusinessStats() {
  return useQuery({
    queryKey: ['business-stats'],
    queryFn: () => businessRepository.getStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useBusinessById(id: string) {
  return useQuery({
    queryKey: ['business', id],
    queryFn: () => businessRepository.getById(id),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!id,
  });
}

export function useDistinctBusinessCodes() {
  return useQuery({
    queryKey: ['business-codes'],
    queryFn: () => businessRepository.getDistinctBusinessCodes(),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}
