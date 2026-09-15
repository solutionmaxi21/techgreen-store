import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi } from '../services/apiService';
import { toast } from 'sonner';
import i18n from '../i18n/config';

/**
 * Hook to fetch all products with filters
 * @param {object} filters 
 */
export const useProducts = (filters = {}) => {
    return useQuery({
        queryKey: ['products', filters],
        queryFn: () => productApi.getAll(filters),
        keepPreviousData: true, // Useful for pagination
    });
};

/**
 * Hook to fetch a single product by ID
 * @param {string|number} id 
 */
export const useProduct = (id) => {
    return useQuery({
        queryKey: ['product', id],
        queryFn: () => productApi.getById(id),
        enabled: !!id, // Only fetch if ID is present
    });
};

/**
 * Hook for product mutations (create, update, delete)
 * Handles automatic cache invalidation
 */
export const useProductMutations = () => {
    const queryClient = useQueryClient();

    // Create Product
    const createProduct = useMutation({
        mutationFn: (data) => productApi.create(data),
        onSuccess: () => {
            toast.success(i18n.t('products.toasts.created'));
            queryClient.invalidateQueries(['products']);
        },
        onError: (error) => {
            toast.error(`Failed to create product: ${error.message}`);
        }
    });

    // Update Product
    const updateProduct = useMutation({
        mutationFn: ({ id, data }) => productApi.update(id, data),
        onSuccess: (data, variables) => {
            toast.success(i18n.t('products.toasts.updated'));
            // Invalidate list and specific product
            queryClient.invalidateQueries(['products']);
            queryClient.invalidateQueries(['product', variables.id]);
        },
        onError: (error) => {
            toast.error(`Failed to update product: ${error.message}`);
        }
    });

    // Delete Product (Soft)
    const deleteProduct = useMutation({
        mutationFn: (id) => productApi.delete(id),
        onSuccess: () => {
            toast.success(i18n.t('products.toasts.trashed'));
            queryClient.invalidateQueries(['products']);
        },
        onError: (error) => {
            toast.error(`Failed to delete product: ${error.message}`);
        }
    });

    return {
        createProduct,
        updateProduct,
        deleteProduct
    };
};
