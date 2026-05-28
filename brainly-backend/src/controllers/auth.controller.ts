import { Request, Response } from "express";
import { SigninInput, SignupInput } from "../validators/auth.validator";
import { UserModel } from "../db";
import { HttpError } from "../middleware/errorHandler";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

const BCRYPT_ROUNDS = 10;

export const signup = async (
  req: Request<{}, {}, SignupInput>,
  res: Response,
) => {
  const { username, password } = req.body;

  const existing = await UserModel.findOne({ username });
  if (existing) {
    throw new HttpError(409, "Username already exists");
  }

  const hashedpassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await UserModel.create({ username, password: hashedpassword });

  res.status(201).json({ message: "Signed up" });
};

export const signin = async (
  req: Request<{}, {}, SigninInput>,
  res: Response,
) => {
  const { username, password } = req.body;

  const user = await UserModel.findOne({ username });
  if (!user) {
    throw new HttpError(401, "Invalid Credentials");
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new HttpError(401, "Invalid Credentials");
  }

  const token = jwt.sign({ id: user._id }, env.JWT_SECRET, { expiresIn: "7d" });
  res.status(200).json({ token });
};
