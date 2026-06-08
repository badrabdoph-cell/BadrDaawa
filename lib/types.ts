export type Language = "ar" | "en";

export type TemplateStyle = "featured" | "royal" | "noir" | "ivory" | "mobile" | "boho" | "garden" | "cinematic" | "glass" | "minimal" | "neon" | "vintage" | "ocean" | "artdeco" | "magazine" | "custom";

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
  musicUrl?: string;
  photographer?: {
    enabled: boolean;
    name: string;
    logoUrl?: string;
    instagramUrl: string;
    facebookUrl: string;
    whatsappUrl?: string;
  };
  customHtml?: string;
  isCustom?: boolean;
  enabled: boolean;
  score: number;
};

export type Invitation = {
  id: string;
  code: string;
  templateSlug: string;
  status?: "draft" | "active" | "paused" | "archived";
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
  musicEnabled?: boolean;
  musicSource?: MusicSource;
  musicLibraryTrackId?: string;
  texts?: InvitationTexts;
  photographer?: {
    enabled: boolean;
    name: string;
    logoUrl?: string;
    instagramUrl: string;
    facebookUrl: string;
    whatsappUrl?: string;
  };
  isActive: boolean;
  views: number;
  customerId: string;
  deletedAt?: string;
};

export type MusicSource = "default" | "library" | "upload" | "url";

export type InvitationTexts = {
  groomNameEn?: string;
  brideNameEn?: string;
  inviteMessage?: string;
  inviteMessageSecondary?: string;
  rsvpQuestion?: string;
  rsvpDeclinedMessage?: string;
};

export type ContentPresetKind = "opening" | "welcome" | "rsvp";

export type ContentPreset = {
  id: string;
  kind: ContentPresetKind;
  title: string;
  content: string;
  secondaryContent?: string;
  createdAt: string;
  updatedAt: string;
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
  orderNumber?: string;
  dedupeKey?: string;
  groomName: string;
  brideName: string;
  phone: string;
  weddingDate: string;
  venue: string;
  mapUrl?: string;
  notes?: string;
  imageUrls?: string[];
  musicEnabled?: boolean;
  musicChoice?: "default" | "library" | "upload" | "url";
  musicUrl?: string;
  musicLibraryTrackId?: string;
  texts?: InvitationTexts;
  photographer?: {
    enabled: boolean;
    name: string;
    logoUrl?: string;
    instagramUrl: string;
    facebookUrl: string;
    whatsappUrl?: string;
  };
  rejectionReason?: string;
  publishedInvitationCode?: string;
  templateSlug: string;
  language: Language;
  status: "new" | "reviewing" | "edited" | "published" | "rejected" | "accepted" | "converted";
  submittedAt?: string;
  createdAt: string;
  deletedAt?: string;
};

export type ClientMessage = {
  id: string;
  invitationCode: string;
  title: string;
  body: string;
  sender: "admin";
  createdAt: string;
  readAt?: string;
};
