import mongoose, { Schema } from "mongoose";


const userSchema = new Schema({
    username: { type: String, unique: true, require: true },
    password: { type: String, require: true }
})

const tagSchema = new Schema({
    title: { type: String, unique: true, require: true }
})

const contents = ['image', 'video', 'article', 'link', 'youtube', 'twitter'];

const contentSchema = new Schema({
    link: { type: String, require: true },
    title: { type: String, require: true },
    type: { type: String, enum: contents, require: true },
    tags: [{ type: mongoose.Types.ObjectId, ref: 'Tag' }],
    userId: { type: mongoose.Types.ObjectId, ref: 'User', require: true }
})

const linkSchema = new Schema({
    hash: { type: String, require: true },
    userId: { type: mongoose.Types.ObjectId, ref: 'User', require: true, unique: true }
})

export const UserModel = mongoose.model("User", userSchema);
export const TagModel = mongoose.model("Tag", tagSchema);
export const ContentModel = mongoose.model("Content", contentSchema);
export const LinkModel = mongoose.model("Link", linkSchema);
