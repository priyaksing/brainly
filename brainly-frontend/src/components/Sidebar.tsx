import { useNavigate } from "react-router-dom";
import Logo from "../icons/Logo";
import TwitterIcon from "../icons/TwitterIcon";
import YoutubeIcon from "../icons/YoutubeIcon";
import Button from "./Button";
import SidebarItem from "./SidebarItem";
import type { ContentType } from "../types";

interface SidebarProps {
  activeFilter: ContentType | null;
  onFilterChange: (filter: ContentType | null) => void;
}

export default function Sidebar({ activeFilter, onFilterChange }: SidebarProps) {
  const navigate = useNavigate();

  function onLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <div className="h-screen top-0 left-0 fixed w-72 border-r border-white-100/40 bg-white-100/80 backdrop-blur">
      <div className="flex flex-col h-screen justify-between">
        <div>
          <div className="flex items-center ml-4 mt-4 gap-4 text-2xl tracking-wide font-extrabold">
            <span className="text-blue-500">
              <Logo />
            </span>
            <span className="bg-gradient-to-r from-sky-500 to-indigo-900 text-transparent bg-clip-text">Brainly</span>
          </div>
          <div className="mx-6 mt-10 flex flex-col gap-1">
            <SidebarItem
              icon={<span className="w-5" />}
              title="All"
              active={activeFilter === null}
              onClick={() => onFilterChange(null)}
            />
            <SidebarItem
              icon={<YoutubeIcon />}
              title="Youtube"
              active={activeFilter === "youtube"}
              onClick={() => onFilterChange("youtube")}
            />
            <SidebarItem
              icon={<TwitterIcon />}
              title="Twitter"
              active={activeFilter === "twitter"}
              onClick={() => onFilterChange("twitter")}
            />
          </div>
        </div>
        <div className="flex justify-center p-5">
          <Button variant="tertiary" text="Logout" fullWidth onClick={onLogout} />
        </div>
      </div>
    </div>
  );
}
