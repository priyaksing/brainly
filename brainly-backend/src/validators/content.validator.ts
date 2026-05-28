import { z } from "zod";
import { CONTENT_TYPES } from "../db";

export const createContentSchema = z.object({
  link: z.string().url("Link must be valid URL"),
  title: z.string().min(1).max(200),
  type: z.enum(CONTENT_TYPES),
});
export const findContentSchema = z.object({
  type: z.enum(CONTENT_TYPES),
});
export const deleteContentSchema = z.object({
  contentId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid contentId"),
});
export const shareContentSchema = z.object({
  share: z.boolean(),
});
export const shareContentLinkSchema = z.object({
  shareLink: z.string().min(1).max(64),
});

export type CreateContentInput = z.infer<typeof createContentSchema>;
export type FindContentInput = z.infer<typeof findContentSchema>;
export type DeleteContentInput = z.infer<typeof deleteContentSchema>;
export type ShareContentInput = z.infer<typeof shareContentSchema>;
export type ShareContentLinkInput = z.infer<typeof shareContentLinkSchema>;
