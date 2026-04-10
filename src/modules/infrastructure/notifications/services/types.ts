
export type EmailBlockType = 'header' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'footer' | 'video' | 'social';

export interface EmailBlockStyle {
    paddingTop?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
    borderRadius?: number;
    border?: string; // e.g. "1px solid #ccc"
}

export interface EmailBlock {
    id: string; // Unique ID for DND
    type: EmailBlockType;
    content: any; // Flexible props based on type
    style?: EmailBlockStyle;
}

// --- CONTENT DEFINITIONS ---

export interface ContentHeader {
    text: string;
    logoUrl?: string; // If present, overrides text
    level: 1 | 2 | 3;
}

export interface ContentText {
    html: string; // InnerHTML or Markdown
}

export interface ContentButton {
    text: string;
    url: string;
    variant: 'primary' | 'secondary' | 'outline';
}

export interface ContentImage {
    url: string;
    alt: string;
    width?: string;
    height?: string;
    fill?: boolean; // object-fit cover logic
}

export interface ContentVideo {
    thumbnailUrl: string;
    videoUrl: string; // Link to play
    title?: string;
}

export interface ContentSocial {
    networks: { platform: 'instagram' | 'facebook' | 'linkedin' | 'website'; url: string }[]
}

// --- SCHEMA & VALIDATION ---
export const DEFAULT_BLOCKS: EmailBlock[] = [
    {
        id: 'header-1',
        type: 'header',
        content: { text: 'Bienvenido a Pixy', level: 1 },
        style: { textAlign: 'center', paddingTop: 20, paddingBottom: 20 }
    },
    {
        id: 'text-1',
        type: 'text',
        content: { html: 'Este es un texto de ejemplo. Puedes editarlo o arrastrar nuevos bloques.' },
        style: { textColor: '#333333', fontSize: 16 }
    }
];
