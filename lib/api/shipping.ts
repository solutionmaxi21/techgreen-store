// Shipping API service

import { api } from './client'

export interface Wilaya {
  id: number
  name: string
}

export interface Commune {
  id: number
  name: string
  wilaya_id: number
  is_deliverable: boolean
}

export interface StopDesk {
  center_id: number
  name: string
  address: string
  wilaya_id: number
  commune_id: number
  commune_name: string
}

export interface ShippingEstimate {
  totalShippingCost: number
  deliveryTime: number
  baseFee: number
  overweightFee: number
  codFee: number
  insuranceFee: number
  communeName: string
  wilayaName: string
  deliveryType: string
  selectedWarehouse?: string
}

export interface ShippingEstimateRequest {
  communeId: number
  isStopDesk: boolean
  items: Array<{
    product_id: number
    variant_id?: number
    quantity: number
    weight: number
    length: number
    width: number
    height: number
    hasInsurance: boolean
    declaredValue: number
  }>
}

export const shippingApi = {
  // Get all wilayas
  async getWilayas(): Promise<{ data?: Wilaya[]; error?: string }> {
    const response = await api.get<{ success: boolean; data: Wilaya[] }>('/shipping/wilayas')
    if (response.error) {
      return { error: response.error.message }
    }
    const result = response.data
    return { data: result?.data || [] }
  },

  // Get communes for a wilaya
  async getCommunes(wilayaId: number, isDeliverable = true): Promise<{ data?: Commune[]; error?: string }> {
    const response = await api.get<{ success: boolean; data: Commune[] }>(
      `/shipping/communes?wilayaId=${wilayaId}&isDeliverable=${isDeliverable}`
    )
    if (response.error) {
      return { error: response.error.message }
    }
    return { data: response.data?.data || [] }
  },

  // Get stop desk centers for a wilaya
  async getStopDesks(wilayaId: number): Promise<{ data?: StopDesk[]; error?: string }> {
    const response = await api.get<{ success: boolean; data: StopDesk[] }>(
      `/shipping/centers?wilayaId=${wilayaId}`
    )
    if (response.error) {
      return { error: response.error.message }
    }
    return { data: response.data?.data || [] }
  },

  // Calculate shipping estimate
  async getEstimate(request: ShippingEstimateRequest): Promise<{ data?: ShippingEstimate; error?: string }> {
    const response = await api.post<{ success: boolean; data: ShippingEstimate }>(
      '/orders/shipping-estimate',
      request
    )
    if (response.error) {
      return { error: response.error.message }
    }
    return { data: response.data?.data }
  },
}
