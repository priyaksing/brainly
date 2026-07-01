// Must match the CONTENT_TYPES const in brainly-backend/src/db.ts
export const CONTENT_TYPES = ["image", "video", "article", "link", "youtube", "twitter"] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export interface Content {
  _id: string;
  title: string;
  link: string;
  type: ContentType;
  tags?: string[];
  userId?: string | { _id: string; username: string };
  createdAt?: string;
  updatedAt?: string;
}
