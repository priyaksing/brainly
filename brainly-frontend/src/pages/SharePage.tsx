import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import DisplayContent from "../components/DisplayContent";
import { api, getErrorMessage } from "../lib/api";
import type { Content } from "../types";

export default function SharePage() {
  const { shareUrl } = useParams();
  const [contents, setContents] = useState<Content[]>([]);
  const [username, setUsername] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareUrl) return;
    let cancelled = false;

    async function loadContent() {
      setLoading(true);
      setNotFound(false);
      setError(null);
      try {
        const response = await api.get<{ username: string; contents: Content[] }>(`/api/v1/brain/${shareUrl}`);
        if (cancelled) return;
        setUsername(response.data.username ?? "");
        setContents(response.data.contents ?? []);
      } catch (err) {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError(getErrorMessage(err, "Failed to load shared brain"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadContent();

    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  if (loading) {
    return (
      <div className="bg-blue-200 min-h-screen flex justify-center items-center">
        <p className="text-gray-600">Loading shared brain...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="bg-blue-200 min-h-screen flex flex-col justify-center items-center">
        <h1 className="text-2xl font-bold text-gray-700">Link not found</h1>
        <p className="text-gray-600 pt-2">This share link doesn't exist or has been removed.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-blue-200 min-h-screen flex justify-center items-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-blue-200 min-h-screen">
      <h1 className="p-4 text-center text-3xl font-extrabold tracking-wide uppercase text-blue-100">
        Welcome to{" "}
        <span className="bg-gradient-to-r from-sky-500 to-indigo-900 text-transparent bg-clip-text">{username}</span>
        's Brainly!
      </h1>
      <div className="px-20 pb-20">
        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-3">
          <DisplayContent contents={contents} readOnly />
        </div>
      </div>
    </div>
  );
}
