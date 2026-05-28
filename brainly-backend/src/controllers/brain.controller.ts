import { Request, Response } from "express";
import { ContentModel, LinkModel, UserModel } from "../db";
import { HttpError } from "../middleware/errorHandler";
import {
  ShareContentInput,
  ShareContentLinkInput,
} from "../validators/content.validator";
import { randomHash } from "../utils";

export const toggleShare = async (
  req: Request<{}, {}, ShareContentInput>,
  res: Response,
) => {
  const { share } = req.body;
  const userId = req.userId;

  if (!share) {
    await LinkModel.deleteOne({ userId });
    res.status(200).json({ message: "Share link removed" });
    return;
  }

  const existing = await LinkModel.findOne({ userId });
  if (existing) {
    res.status(200).json({ link: existing.hash });
    return;
  }

  const created = await LinkModel.create({
    hash: randomHash(10),
    userId,
  });

  res.status(201).json({ link: created.hash });
};

export const getSharedBrain = async (
  req: Request<ShareContentLinkInput>,
  res: Response,
) => {
  const { shareLink } = req.params;

  const link = await LinkModel.findOne({ hash: shareLink });
  if (!link) {
    throw new HttpError(404, "Invalid share link");
  }

  const [user, contents] = await Promise.all([
    UserModel.findById(link.userId).select("username"),
    ContentModel.find({ userId: link.userId }),
  ]);

  if (!user) {
    throw new HttpError(404, "Owner not found");
  }

  res.status(200).json({
    username: user.username,
    contents,
  });
};
