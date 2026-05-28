import { Request, Response } from "express";
import {
  CreateContentInput,
  DeleteContentInput,
  FindContentInput,
} from "../validators/content.validator";
import { ContentModel } from "../db";
import { HttpError } from "../middleware/errorHandler";

export const createContent = async (
  req: Request<{}, {}, CreateContentInput>,
  res: Response,
) => {
  const { link, title, type } = req.body;
  const userId = req.userId;

  const content = await ContentModel.create({
    link,
    title,
    type,
    tags: [],
    userId,
  });

  res.status(201).json({ message: "Content added", content });
};

export const getContents = async (req: Request, res: Response) => {
  const userId = req.userId;
  const contents = await ContentModel.find({ userId }).populate(
    "userId",
    "username",
  );
  res.status(200).json({ success: true, contents });
};

export const getContentsByType = async (
  req: Request<{}, {}, FindContentInput>,
  res: Response,
) => {
  const { type } = req.body;
  const userId = req.userId;

  const contents = await ContentModel.find({ userId, type });
  res.status(200).json({ contents });
};

export const deleteContent = async (
  req: Request<{}, {}, DeleteContentInput>,
  res: Response,
) => {
  const { contentId } = req.body;
  const userId = req.userId;

  const result = await ContentModel.deleteOne({ _id: contentId, userId });
  if (result.deletedCount === 0) {
    throw new HttpError(404, "Content not found");
  }

  res.status(200).json({ message: "Content deleted" });
};
