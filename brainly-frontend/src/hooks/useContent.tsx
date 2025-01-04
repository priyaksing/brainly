import axios from "axios";
import { useEffect, useState } from "react";
import { BACKEND_URL } from "../config";


export default function useContent() {

    const [content, setContent] = useState([]);

    async function getContent() {
        const response = await axios.get(`${BACKEND_URL}/api/v1/content`, {
            headers: {
                "Authorization": localStorage.getItem("token")
            }
        })
        setContent(response.data.contents);
    }

    useEffect(() => {

        getContent();
        let interval = setInterval(() => {
            getContent();
        }, 1 * 1000)

        return () => {
            clearInterval(interval);
        }

    }, [content.length]);

    return content
}
