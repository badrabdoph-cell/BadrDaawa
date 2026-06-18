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
    description?: string;
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
  customSlug?: string;
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
  heroVideoUrl?: string;
  gallery: string[];
  musicUrl?: string;
  musicEnabled?: boolean;
  musicSource?: MusicSource;
  musicLibraryTrackId?: string;
  manageToken?: string;
  manageTokenExpiresAt?: string;
  texts?: InvitationTexts;
  photographer?: {
    enabled: boolean;
    name: string;
    description?: string;
    logoUrl?: string;
    instagramUrl: string;
    facebookUrl: string;
    whatsappUrl?: string;
  };
  checkInEnabled?: boolean;
  isActive: boolean;
  disabledAt?: string;
  disabledReason?: string;
  disabledBy?: string;
  trialDays?: number;
  trialEndsAt?: string;
  views: number;
  customerId: string;
  deletedAt?: string;
};

export type MusicSource = "default" | "library" | "upload" | "video" | "url";

export type InvitationTexts = {
  groomNameEn?: string;
  brideNameEn?: string;
  openingText?: string;
  inviteMessage?: string;
  inviteMessageSecondary?: string;
  rsvpQuestion?: string;
  rsvpDeclinedMessage?: string;
  rsvpConfirmedSuccessMessage?: string;
  rsvpDeclinedSuccessMessage?: string;
  heroVideoUrl?: string;
  galleryStories?: GalleryStoryItem[];
  story?: CoupleStoryItem[];
};

export type GalleryStoryItem = {
  title?: string;
  description?: string;
};

export type CoupleStoryItem = {
  id?: string;
  title: string;
  description: string;
  imageUrl?: string;
  date?: string;
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

export type MessageTemplateKind = "whatsapp" | "welcome" | "reminder";

export type MessageTemplate = {
  id: string;
  kind: MessageTemplateKind;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type InternalNoteEntityType = "order" | "invitation" | "customer";

export type InternalNote = {
  id: string;
  entityType: InternalNoteEntityType;
  entityId: string;
  body: string;
  authorLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminFavoriteEntityType = "order" | "invitation" | "customer";

export type AdminFavorite = {
  id: string;
  entityType: AdminFavoriteEntityType;
  entityId: string;
  label: string;
  href: string;
  createdAt: string;
  note?: string;
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

export type GuestBookStatus = "pending" | "approved" | "rejected";
export type GuestBookMode = "disabled" | "auto" | "moderated";

export type CoupleMessagesSettings = {
  invitationCode: string;
  mode: GuestBookMode;
  updatedAt?: string;
};

export type GuestBookMessage = {
  id: string;
  invitationCode: string;
  name: string;
  message: string;
  status: GuestBookStatus;
  createdAt: string;
  reviewedAt?: string;
};

export type InvitationCheckIn = {
  id: string;
  invitationCode: string;
  visitorKey: string;
  createdAt: string;
  userAgent?: string;
};

export type WeddingLiveEvent = {
  id: string;
  time: string;
  title: string;
  description?: string;
};

export type WeddingLiveModeConfig = {
  invitationCode: string;
  enabled: boolean;
  announcement?: string;
  events: WeddingLiveEvent[];
  updatedAt: string;
  updatedBy?: "admin" | "client";
};

export type OrderRequest = {
  id: string;
  orderNumber?: string;
  dedupeKey?: string;
  groomName: string;
  brideName: string;
  phone: string;
  weddingDate: string;
  weddingTime?: string;
  venue: string;
  mapUrl?: string;
  notes?: string;
  imageUrls?: string[];
  musicEnabled?: boolean;
  musicChoice?: "default" | "library" | "upload" | "video" | "url";
  musicUrl?: string;
  musicLibraryTrackId?: string;
  texts?: InvitationTexts;
  photographer?: {
    enabled: boolean;
    name: string;
    description?: string;
    logoUrl?: string;
    instagramUrl: string;
    facebookUrl: string;
    whatsappUrl?: string;
  };
  rejectionReason?: string;
  publishedInvitationCode?: string;
  manageToken?: string;
  manageTokenExpiresAt?: string;
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
