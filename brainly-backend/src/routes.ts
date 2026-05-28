import { Router } from "express";
import { signup, signin } from "./controllers/auth.controller";
import { createContent, getContents, getContentsByType, deleteContent } from "./controllers/content.controller";
import { toggleShare, getSharedBrain } from "./controllers/brain.controller";
import { liveness, readiness } from "./controllers/health.controller";
import { authMiddleware } from "./middleware/auth";
import { validate } from "./middleware/validate";
import { authLimiter } from "./middleware/rateLimiter";
import { asyncHandler } from "./utils/asyncHandler";
import { signupSchema, signinSchema } from "./validators/auth.validator";
import {
  createContentSchema,
  findContentSchema,
  deleteContentSchema,
  shareContentSchema,
  shareContentLinkSchema,
} from "./validators/content.validator";

const API = "/api/v1";
const router = Router();

router.get("/healthz", liveness);
router.get("/readyz", readiness);

router.post(`${API}/signup`, authLimiter, validate(signupSchema), asyncHandler(signup));
router.post(`${API}/signin`, authLimiter, validate(signinSchema), asyncHandler(signin));

router.post(`${API}/content`, authMiddleware, validate(createContentSchema), asyncHandler(createContent));
router.get(`${API}/content`, authMiddleware, asyncHandler(getContents));
router.post(`${API}/contentByType`, authMiddleware, validate(findContentSchema), asyncHandler(getContentsByType));
router.delete(`${API}/content`, authMiddleware, validate(deleteContentSchema), asyncHandler(deleteContent));

router.post(`${API}/brain/share`, authMiddleware, validate(shareContentSchema), asyncHandler(toggleShare));
router.get(`${API}/brain/:shareLink`, validate(shareContentLinkSchema, "params"), asyncHandler(getSharedBrain));

export default router;
