import { ReactElement } from "react"
import useContent from "../hooks/useContent"
import { Card } from "./Card";
import DisplayContent from "./DisplayContent";
import axios from "axios";
import { BACKEND_URL } from "../config";

interface ItemProps {
    icon: ReactElement,
    title: string
}

export default function SidebarItem({ icon, title }: ItemProps) {

    async function filterContent() {
        const response = await axios.post(`${BACKEND_URL}/api/v1/contentByType`, {
            type: title.toLowerCase()
        }, {
            headers: {
                "Authorization": localStorage.getItem("token")
            }
        });

        const contents = response.data.contents;
        console.log(contents);

        <DisplayContent contents={contents} />
    }


    return (
        <div className="flex items-center gap-4 py-2 px-5 text-gray-400 font-medium cursor-pointer hover:bg-blue-200 hover:text-blue-100">
            {icon}
            <div className="tracking-wider" onClick={filterContent}>
                {title}
            </div>
        </div>
    )
}
