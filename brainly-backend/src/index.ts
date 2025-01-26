import express from "express";
import mongoose, { mongo } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { z } from "zod";
// import { JWT_SECRET, DB_CONNECTION } from "./config";
import cors from "cors";


let app = express();
app.use(express.json());
app.use(cors());

import { UserModel, TagModel, ContentModel, LinkModel } from "./db";
import { middleware } from "./middleware";
import { randomHash } from "./utils";

// Connection to DB
async function main() {
    mongoose.connect(process.env.DB_CONNECTION as unknown as string);
    app.listen(3000, () => {
        console.log("Listening on 3000");
    });
}
main().catch((err) => console.log(err));



// Route handlers
app.post("/api/v1/signup", async (req, res) => {

    try {
        const { username, password } = req.body;

        const validate = z.object({
            username: z.string().min(3).max(10),
            password: z.string()
                .min(8, { message: "Must have atleast 8 characters" })
                .max(20, { message: "Allowed 20 characters at maximum" })
                .refine((pwd) => /[A-Z]/.test(pwd), { message: "Must have atleast 1 uppercase letter" })
                .refine((pwd) => /[a-z]/.test(pwd), { message: "Must have atleast 1 lowercase letter" })
                .refine((pwd) => /[0-9]/.test(pwd), { message: "Must have atleast 1 numeric letter" })
                .refine((pwd) => /[!@#$%^&*]/.test(pwd), { message: "Must have atleast 1 special character" })
        })

        const user = {
            username,
            password
        }

        const isValidate = validate.safeParse(user);

        if (isValidate.success) {
            const hashedPassword = await bcrypt.hash(password, 5);

            const existing = await UserModel.findOne({
                username: username
            })

            if (existing) {
                res.status(403).json({
                    message: "Username already exists",
                    existing
                })
            } else {

                await UserModel.create({
                    username,
                    password: hashedPassword
                })

                res.status(200).json({
                    message: "Signed up"
                })

            }
        } else {

            res.status(411).json({
                message: "Please enter valid inputs"
            })
        }
    } catch (err) {

        res.status(500).json({
            message: "Internal Server Error",
            err
        })
    }
})

app.post("/api/v1/signin", async (req, res) => {

    try {
        const { username, password } = req.body;
        const foundUser = await UserModel.findOne({
            username: username
        })

        if (foundUser) {
            const hash = foundUser.password;
            // @ts-ignore
            const passwordMatch = await bcrypt.compare(password, hash)

            if (passwordMatch) {

                const token = jwt.sign({
                    id: foundUser._id
                }, process.env.JWT_SECRET as unknown as string);

                res.status(200).json({
                    token
                })
            } else {
                res.status(403).json({
                    message: "Wrong password",
                    password,
                    passwordMatch,
                    foundUser
                })
            }
        } else {
            res.status(403).json({
                message: "Wrong username"
            })
        }
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error",
            error
        })
    }
})

app.post("/api/v1/content", middleware, async (req, res) => {

    const { link, title, type } = req.body;
    // @ts-ignore
    const userId = req.userId

    await ContentModel.create({
        link,
        title,
        type,
        tags: [],
        userId
    })

    res.status(200).json({
        message: "Content added!"
    })
})

app.get("/api/v1/content", middleware, async (req, res) => {

    try {
        //@ts-ignore
        const userId = req.userId;

        const contents = await ContentModel.find({
            userId: userId
        }).populate("userId", "username")

        res.status(200).json({
            message: "Contents fetched!",
            success: true,
            contents
        })

    } catch (err) {
        res.status(404).json({
            message: "Unable to fetch contents",
            success: false
        })
    }
})

app.post("/api/v1/contentByType", middleware, async (req, res) => {

    try {
        //@ts-ignore
        const userId = req.userId;
        const { type } = req.body;

        const contents = await ContentModel.find({
            userId: userId,
            type
        })

        res.status(200).json({
            message: "Content fetched!",
            contents
        })
    }
    catch (err) {
        res.status(404).json({
            err
        })
    }
})

app.delete("/api/v1/content", middleware, async (req, res) => {

    //@ts-ignore
    const userId = req.userId;
    const { contentId } = req.body;

    console.log(contentId);
    console.log(req);


    await ContentModel.deleteOne({
        _id: contentId,
        userId: userId
    })

    res.status(200).json({
        message: "Content deleted"
    })
})

app.post("/api/v1/brain/share", middleware, async (req, res) => {

    const { share } = req.body;
    //@ts-ignore
    const userId = req.userId;

    if (share) {
        let existingLink = await LinkModel.findOne({
            userId
        })

        if (existingLink) {
            res.json({
                link: existingLink.hash
            })

            return;
        }

        const shareLink = await LinkModel.create({
            hash: randomHash(10),
            userId
        })

        res.status(200).json({
            message: "Link created",
            link: shareLink.hash
        })
    } else {
        await LinkModel.deleteOne({
            userId
        })

        res.json({
            message: "Link deleted"
        })
    }
})

app.get("/api/v1/brain/:shareLink", async (req, res) => {

    const { shareLink } = req.params;

    const linkFound = await LinkModel.findOne({
        hash: shareLink
    })

    console.log(linkFound);


    if (!linkFound) {
        res.status(400).json({
            message: "Incorrect Link"
        })
    }

    const contents = await ContentModel.find({
        userId: linkFound?.userId
    })

    const user = await UserModel.findOne({
        _id: linkFound?.userId
    })

    console.log(contents, user);

    res.status(200).json({
        message: "Fetched",
        username: user?.username,
        contents
    })

})


