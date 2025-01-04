import { useRef, useState } from "react";
import { CrossIcon } from "../icons/CrossIcon";
import Button from "./Button";
import { Input } from "./Input";
import { BACKEND_URL } from "../config";
import axios from "axios";


export default function AddContentModal({ open, onClose }) {

    const [type, setType] = useState("youtube");
    const titleRef = useRef<HTMLInputElement>();
    const linkRef = useRef<HTMLInputElement>();

    enum ContentType {
        Youtube = "youtube",
        Twitter = "twitter"
    }

    async function postContent() {

        const title = titleRef.current?.value;
        const link = linkRef.current?.value;

        await axios.post(`${BACKEND_URL}/api/v1/content`, {
            title,
            link,
            type
        }, {
            headers: {
                "Authorization": localStorage.getItem("token")
            }
        })

        alert("Content added!");
        onClose();
    }

    return (
        <div>
            {open && <div>
                <div className="w-screen h-screen bg-slate-500 opacity-60 fixed top-0 left-0 flex justify-center">
                    {/* div element to make the bg shaded */}
                </div>
                <div className="w-screen h-screen top-0 left-0 fixed flex justify-center">
                    <div className="flex flex-col justify-center">
                        <span className="bg-white-100 p-4 rounded ">
                            <div className="flex justify-end">
                                <div onClick={onClose}>
                                    <CrossIcon />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <Input reference={titleRef} placeholder={"Title"} />
                                <Input reference={linkRef} placeholder={"Link"} />
                                <div className="flex justify-center gap-4">
                                    <Button text="Youtube" variant={type == "youtube" ? "primary" : "secondary"} onClick={() => setType(ContentType.Youtube)} />
                                    <Button text="Twitter" variant={type == "twitter" ? "primary" : "secondary"} onClick={() => setType(ContentType.Twitter)} />
                                </div>
                            </div>
                            <div className="flex justify-center ">
                                <Button onClick={postContent} variant="primary" text="Submit" />
                            </div>
                        </span>
                    </div>
                </div>
            </div>
            }
        </div >
    )
}

