import AddContentModal from "../components/AddContentModal"
import Button from "../components/Button"
import { PlusIcon } from "../icons/PlusIcon"
import { ShareIcon } from "../icons/ShareIcon"
import Sidebar from "../components/Sidebar"
import useContent from "../hooks/useContent"
import axios from "axios"
import { BACKEND_URL } from "../config"
import DisplayContent from "../components/DisplayContent"
import { useState } from "react"


function Dashboard() {

    const [modalOpen, setModalOpen] = useState(false);
    const contents = useContent();

    /**
     * onClose and onClick: custom function sent as an argument to components, to set 'modalOpen' as true/false
     */

    async function shareBrain() {

        const response = await axios.post(`${BACKEND_URL}/api/v1/brain/share`, {
            share: true
        }, {
            headers: {
                "Authorization": localStorage.getItem("token")
            }
        })

        const shareUrl = response.data.link;
        const hostname = window.location.origin;    // Get the hostname of the frontend

        navigator.clipboard.writeText(`${hostname}/brain/${shareUrl}`);     // Copied the final URL to clipboard
        alert("Copied URL to clipboard: " + `${hostname}/brain/${shareUrl}`);
    }

    return (
        <div className="bg-blue-200">
            <Sidebar />
            <div className="min-h-screen p-4 ml-72">

                <AddContentModal open={modalOpen} onClose={() => {
                    setModalOpen(false);
                }} />

                <div className="flex justify-end gap-4">
                    <Button variant="primary" text="Add Content" startIcon={<PlusIcon />} onClick={() => setModalOpen(true)}></Button>
                    <Button variant="secondary" text="Share Brain" startIcon={<ShareIcon />} onClick={shareBrain}></Button>
                </div>

                <div className="flex flex-wrap gap-3 pt-4">
                    <DisplayContent contents={contents} />
                </div>

            </div>
        </div>
    )
}

export default Dashboard
