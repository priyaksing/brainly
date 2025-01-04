import axios from "axios"
import { useParams } from "react-router-dom"
import { BACKEND_URL } from "../config";
import { useEffect, useState } from "react";
import { Card } from "../components/Card";

export default function SharePage() {

    const { shareUrl } = useParams();
    const [content, setContent] = useState([]);
    const [user, setUser] = useState("");

    async function getBrain() {

        const fetchBrain = await axios.get(`${BACKEND_URL}/api/v1/brain/${shareUrl}`);
        setUser(fetchBrain.data.username);
        setContent(fetchBrain.data.contents);
    }

    useEffect(() => {

        getBrain();

    }, [shareUrl]);

    return (
        <div className="bg-blue-200 min-h-screen">
            <h1 className="p-4 text-center text-3xl font-extrabold tracking-wide uppercase text-blue-100">
                Welcome to <span className="bg-gradient-to-r from-sky-500 to-indigo-900 text-transparent bg-clip-text">{user}</span>'s Brainly!
            </h1>
            <div className="p-20">
                <div className="flex flex-wrap gap-10 p-4">
                    {content.map((item) =>
                        <Card index={item['_id']} type={item['type']} title={item['title']} link={item['link']} />
                    )}
                </div>
            </div>
        </div>
    )
}
