import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
    {
        username: { type: String, unique: true, required: true, trim: true },
        password: { type: String, required: true },
    },
    { timestamps: true }
);

const tagSchema = new Schema(
    {
        title: { type: String, unique: true, required: true, trim: true },
    },
    { timestamps: true }
);

export const CONTENT_TYPES = ["image", "video", "article", "link", "youtube", "twitter"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

const contentSchema = new Schema(
    {
        link: { type: String, required: true },
        title: { type: String, required: true, trim: true },
        type: { type: String, enum: CONTENT_TYPES, required: true },
        tags: [{ type: mongoose.Types.ObjectId, ref: "Tag" }],
        userId: { type: mongoose.Types.ObjectId, ref: "User", required: true, index: true },
    },
    { timestamps: true }
);

const linkSchema = new Schema(
    {
        hash: { type: String, required: true, unique: true },
        userId: { type: mongoose.Types.ObjectId, ref: "User", required: true, unique: true },
    },
    { timestamps: true }
);

export const UserModel = mongoose.model("User", userSchema);
export const TagModel = mongoose.model("Tag", tagSchema);
export const ContentModel = mongoose.model("Content", contentSchema);
export const LinkModel = mongoose.model("Link", linkSchema);