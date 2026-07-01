import { ReactElement } from "react";

interface ItemProps {
  icon: ReactElement;
  title: string;
  active?: boolean;
  onClick?: () => void;
}

export default function SidebarItem({ icon, title, active, onClick }: ItemProps) {
  return (
    <div
      onClick={onClick}
      className={
        "flex items-center gap-4 py-2 px-5 font-medium cursor-pointer rounded-md " +
        (active
          ? "bg-blue-500 text-blue-100"
          : "text-gray-400 hover:bg-blue-200 hover:text-blue-100")
      }
    >
      {icon}
      <div className="tracking-wider">{title}</div>
    </div>
  );
}
