import { useRef } from "react";
import toast from "react-hot-toast";
import { DeleteIcon } from "../icons/DeleteIcon";
import { ShareIcon } from "../icons/ShareIcon";
import { api, getErrorMessage } from "../lib/api";
import type { ContentType } from "../types";

export interface CardProps {
  index: string;
  type: ContentType;
  link: string;
  title: string;
  readOnly?: boolean;
  onChanged?: () => Promise<void> | void;
}

function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.endsWith("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      const shortsMatch = u.pathname.match(/^\/shorts\/([^/]+)/);
      if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    }
    return null;
  } catch {
    return null;
  }
}

export function Card({ index, type, title, link, readOnly, onChanged }: CardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  function handleVideoEnter() {
    videoRef.current?.play().catch(() => {});
  }
  function handleVideoLeave() {
    videoRef.current?.pause();
  }

  async function deleteContent() {
    try {
      await api.delete("/api/v1/content", { data: { contentId: index } });
      toast.success("Deleted");
      await onChanged?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete"));
    }
  }

  return (
    <div className="p-4 rounded-md bg-white-100/40 backdrop-blur border border-gray-200 hover:border-blue-200 hover:shadow-xl hover:shadow-violet-400 break-inside-avoid mb-3">
      <div className="flex justify-between">
        <div className="flex items-center font-medium">{title}</div>
        <div className="flex items-center">
          <div className="pr-2 text-gray-400 hover:text-blue-400">
            <a href={link} target="_blank" rel="noreferrer" aria-label="Open link">
              <ShareIcon />
            </a>
          </div>
          {!readOnly && (
            <button onClick={deleteContent} className="text-gray-400 hover:text-red-500" aria-label="Delete">
              <DeleteIcon />
            </button>
          )}
        </div>
      </div>

      <div className="pt-4">
        {type === "youtube" &&
          (() => {
            const embed = youtubeEmbedUrl(link);
            return embed ? (
              <iframe
                className="w-full aspect-video"
                src={embed}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <a className="text-blue-600 underline break-all" href={link} target="_blank" rel="noreferrer">
                {link}
              </a>
            );
          })()}

        {type === "image" && <img src={link} alt={title} className="w-full rounded" loading="lazy" />}

        {type === "video" && (
          <video
            ref={videoRef}
            src={link}
            controls
            muted
            loop
            playsInline
            onMouseEnter={handleVideoEnter}
            onMouseLeave={handleVideoLeave}
            className="w-full rounded"
          />
        )}

        {(type === "twitter" || type === "article" || type === "link") && (
          <a href={link} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline break-all">
            {link}
          </a>
        )}
      </div>
    </div>
  );
}
