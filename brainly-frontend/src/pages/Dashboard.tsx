import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import AddContentModal from "../components/AddContentModal";
import Button from "../components/Button";
import DisplayContent from "../components/DisplayContent";
import Sidebar from "../components/Sidebar";
import { PlusIcon } from "../icons/PlusIcon";
import { ShareIcon } from "../icons/ShareIcon";
import useContent from "../hooks/useContent";
import { api, getErrorMessage } from "../lib/api";
import type { ContentType } from "../types";

export default function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ContentType | null>(null);
  const { contents, loading, error, refetch } = useContent();

  const filteredContents = useMemo(
    () => (activeFilter ? contents.filter((c) => c.type === activeFilter) : contents),
    [contents, activeFilter]
  );

  async function toggleShare(share: boolean) {
    try {
      const response = await api.post<{ link?: string; message?: string }>(
        "/api/v1/brain/share",
        { share }
      );

      if (share) {
        const hash = response.data.link;
        if (!hash) {
          toast.error("No link returned from server");
          return;
        }
        const url = `${window.location.origin}/brain/${hash}`;
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied to clipboard");
        setSharing(true);
      } else {
        toast.success("Sharing stopped");
        setSharing(false);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update share state"));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-300">
      <Sidebar activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      <div className="min-h-screen p-4 ml-72">
        <AddContentModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={refetch}
        />

        <div className="flex justify-end gap-4">
          <Button
            variant="primary"
            text="Add Content"
            startIcon={<PlusIcon />}
            onClick={() => setModalOpen(true)}
          />
          <Button
            variant={sharing ? "tertiary" : "secondary"}
            text={sharing ? "Stop Sharing" : "Share Brain"}
            startIcon={<ShareIcon />}
            onClick={() => toggleShare(!sharing)}
          />
        </div>

        <div className="pt-4">
          {loading && contents.length === 0 && (
            <p className="text-center text-gray-500">Loading...</p>
          )}
          {error && (
            <p className="text-center text-red-500">{error}</p>
          )}
          {!loading && !error && contents.length === 0 && (
            <p className="text-center text-gray-500">
              No content yet. Click "Add Content" to start.
            </p>
          )}
          {!loading && !error && contents.length > 0 && filteredContents.length === 0 && (
            <p className="text-center text-gray-500">
              No content matches this filter.
            </p>
          )}
          <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-3">
            <DisplayContent contents={filteredContents} onChanged={refetch} />
          </div>
        </div>
      </div>
    </div>
  );
}
