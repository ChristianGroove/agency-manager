export interface RestoMenuCategory {
    id: string;
    organization_id: string;
    name: string;
    slug: string;
    icon?: string;
    order_index: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface RestoMenuModifierOption {
    id: string; // uuid
    name: string;
    price_modifier: number;
    is_active: boolean;
}

export interface RestoMenuModifierGroup {
    id: string; // uuid
    organization_id: string;
    name: string; // e.g. "Termino de carne", "Tamaño"
    required: boolean;
    min_selections: number;
    max_selections: number;
    options: RestoMenuModifierOption[];
    created_at: string;
    updated_at: string;
}

export interface RestoMenuItemMetadata {
    ingredients?: string[];
    allergens?: string[];
    is_vegan?: boolean;
    is_vegetarian?: boolean;
    is_gluten_free?: boolean;
    is_spicy?: boolean;
    spicy_level?: number; // 0-3
    preparation_time_mins?: number;
    calories?: number;
    alcohol_abv?: number; // For bars/gastrobars
    promotional_price?: number;
    promo_badge?: string; // e.g. "2x1 Jueves"
    promo_schedule?: {
        start_time: string; // "17:00"
        end_time: string; // "20:00"
        days: number[]; // 0=Sun, 1=Mon, etc.
    };
    available_days?: number[]; // Array of allowed days (0=Sun, 1=Mon... 6=Sat)
}

export interface RestoMenuItem {
    id: string;
    organization_id: string;
    category_id: string;
    name: string;
    description?: string;
    image_url?: string;
    base_price: number;
    is_available: boolean;
    is_visible: boolean;
    is_active?: boolean;
    type: 'food' | 'beverage' | 'combo' | 'other';
    metadata: RestoMenuItemMetadata;
    created_at: string;
    updated_at: string;
    deleted_at?: string;

    // Joined relationship (useful for UI)
    category?: RestoMenuCategory;
    modifiers?: RestoMenuModifierGroup[]; // Fetched via resto_item_modifier_groups
}
