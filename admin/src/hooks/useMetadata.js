import { useQuery } from '@tanstack/react-query';
import { metadataApi } from '../services/apiService';

export const useCategories = () => {
    return useQuery({
        queryKey: ['categories'],
        queryFn: metadataApi.getCategories,
        staleTime: 1000 * 60 * 60, // 1 hour (Categories change rarely)
    });
};

export const useBrands = () => {
    return useQuery({
        queryKey: ['brands'],
        queryFn: metadataApi.getBrands,
        staleTime: 1000 * 60 * 60, // 1 hour
    });
};
