import axios from "axios";
import { DeleteIcon } from "../icons/DeleteIcon";
import { ShareIcon } from "../icons/ShareIcon";
import { BACKEND_URL } from "../config";

export interface CardProps {
    index: any,
    type: "youtube" | "twitter",
    link: string,
    title: String
}

export function Card({ index, type, title, link }: CardProps) {

    async function deleteContent() {

        await axios.delete(`${BACKEND_URL}/api/v1/content`, {
            data: {
                contentId: index
            },
            headers: {
                "Authorization": localStorage.getItem("token")
            }
        })
        alert("Deleted");

    }

    return <div>
        <div className="p-4 max-w-72 bg-white-100 rounded-md min-h-48 min-w-72 border border-gray-200 hover:border-blue-200 hover:shadow-xl hover:shadow-violet-400">
            <div className="flex justify-between">
                <div className="flex items-center">
                    {title}
                </div>
                <div className="flex items-center">
                    <div className="pr-2 text-gray-400">
                        <a href={link} target="_blank">
                            <ShareIcon />
                        </a>
                    </div>
                    <div className="text-gray-400 hover:text-red-500" onClick={deleteContent}>
                        <DeleteIcon />
                    </div>
                </div>
            </div>

            <div className="pt-4">
                {type === "youtube" &&
                    <iframe className="w-full"
                        src={link.replace("watch?v=", "embed/")}
                        title="YouTube video player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen></iframe>
                }

                {type === "twitter" &&
                    <blockquote className="twitter-tweet">
                        <a href={link.replace("x", "twitter")}></a>
                    </blockquote>
                }
            </div>

        </div>
    </div >
}