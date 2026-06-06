export type Language = "ar" | "en";

export type TemplateStyle = "royal" | "noir" | "ivory" | "mobile";

export type TemplateDefinition = {
  id: string;
  slug: string;
  name: string;
  arabicName: string;
  category: string;
  style: TemplateStyle;
  concept: string;
  opening: string;
  layout: string;
  typography: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    ink: string;
    surface: string;
  };
  previewImage: string;
  accentImage: string;
  enabled: boolean;
  score: number;
};

export type Invitation = {
  id: string;
  code: string;
  templateSlug: string;
  language: Language;
  groomName: string;
  brideName: string;
  weddingDate: string;
  weddingTime: string;
  venue: string;
  city: string;
  mapUrl: string;
  heroPhoto: string;
  gallery: string[];
  musicUrl?: string;
  isActive: boolean;
  views: number;
  customerId: string;
};

export type GuestRsvp = {
  id: string;
  invitationCode: string;
  name: string;
  phone: string;
  attendees: number;
  status: "confirmed" | "declined";
  note?: string;
  createdAt: string;
};

export type OrderRequest = {
  id: string;
  groomName: string;
  brideName: string;
  phone: string;
  weddingDate: string;
  venue: string;
  notes?: string;
  templateSlug: string;
  language: Language;
  status: "new" | "accepted" | "rejected" | "converted";
  createdAt: string;
};
