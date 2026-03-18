export interface ShopeeConfig {
  partnerId: number
  partnerKey: string
  shopId: number
  accessToken: string
  baseUrl?: string
}

export interface ShopeeRequestParams {
  method?: 'GET' | 'POST'
  path: string
  body?: Record<string, unknown>
  query?: Record<string, string | number>
}

// ---- Auth ----
export interface RefreshTokenRequest {
  refresh_token: string
  shop_id: number
  partner_id: number
}

export interface RefreshTokenResponse {
  access_token: string
  refresh_token: string
  expire_in: number
  error: string
  message: string
}

// ---- Products ----
export interface GetItemListRequest {
  offset: number
  page_size: number
  item_status?: 'NORMAL' | 'BANNED' | 'DELETED' | 'UNLIST'
}

export interface ShopeeItem {
  item_id: number
  item_status: string
  update_time: number
}

export interface GetItemListResponse {
  error: string
  message: string
  response: {
    item: ShopeeItem[]
    total_count: number
    has_next_page: boolean
    next_offset: number
  }
}

export interface ItemBaseInfo {
  item_id: number
  item_name: string
  item_sku: string
  item_status: string
  price_info: Array<{
    current_price: number
    original_price: number
    currency: string
  }>
  stock_info_v2: {
    summary_info: {
      total_reserved_stock: number
      total_available_stock: number
    }
  }
}

export interface GetItemBaseInfoResponse {
  error: string
  message: string
  response: {
    item_list: ItemBaseInfo[]
  }
}

// ---- Discounts ----
export interface AddDiscountRequest {
  discount_name: string
  start_time: number
  end_time: number
}

export interface AddDiscountResponse {
  error: string
  message: string
  response: {
    discount_id: number
  }
}

export interface DiscountItem {
  item_id: number
  item_promotion_price: number
  purchase_limit: number
}

export interface AddDiscountItemRequest {
  discount_id: number
  item_list: DiscountItem[]
}

export interface AddDiscountItemResponse {
  error: string
  message: string
  response: {
    discount_id: number
    count: number
    error_list: Array<{
      item_id: number
      error_msg: string
    }>
  }
}

export interface UpdateDiscountItemRequest {
  discount_id: number
  item_list: DiscountItem[]
}

export interface DeleteDiscountRequest {
  discount_id: number
}

export interface DiscountListItem {
  discount_id: number
  discount_name: string
  start_time: number
  end_time: number
  status: string
}

export interface GetDiscountListRequest {
  discount_status: 'upcoming' | 'ongoing' | 'expired' | 'all'
  page_no: number
  page_size: number
}

export interface GetDiscountListResponse {
  error: string
  message: string
  response: {
    discount_list: DiscountListItem[]
    more: boolean
  }
}
