import { useNavigate } from "react-router-dom";
import Logo from "../icons/Logo";
import TwitterIcon from "../icons/TwitterIcon";
import YoutubeIcon from "../icons/YoutubeIcon";
import Button from "./Button";
import SidebarItem from "./SidebarItem";


export default function Sidebar() {

    const navigate = useNavigate();

    function onLogout() {
        localStorage.removeItem("token");
        navigate("/login");
    }

    return (
        <div className="h-screen top-0 left-0 fixed w-72 border-r-2 border-blue-200/80 bg-white-100">
            <div className="flex flex-col h-screen justify-between">
                <div className="">
                    <div className="flex items-center ml-4 mt-4 gap-4 text-2xl tracking-wide font-medium">
                        <span className="text-blue-500"><Logo /></span>
                        <span className="text-gray-500">Brainly</span>
                    </div>
                    <div className="mx-6 mt-10">
                        <SidebarItem icon={<YoutubeIcon />} title="Youtube" />
                        <SidebarItem icon={<TwitterIcon />} title="Twitter" />
                    </div>
                </div>
                <div className="flex justify-center p-5">
                    <Button variant="tertiary" text="Logout" fullWidth={true} onClick={onLogout} />
                </div>
            </div>
        </div >
    )
}
