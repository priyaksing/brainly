import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { CrossIcon } from "../icons/CrossIcon";
import { CONTENT_TYPES, type ContentType } from "../types";
import { api, getErrorMessage } from "../lib/api";
import Button from "./Button";
import { Input } from "./Input";

interface AddContentModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
}

export default function AddContentModal({ open, onClose, onCreated }: AddContentModalProps) {
  const [type, setType] = useState<ContentType>("youtube");
  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);

  async function postContent() {
    const title = titleRef.current?.value?.trim();
    const link = linkRef.current?.value?.trim();

    if (!title || !link) {
      toast.error("Title and link are required");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/v1/content", { title, link, type });
      toast.success("Content added");
      if (titleRef.current) titleRef.current.value = "";
      if (linkRef.current) linkRef.current.value = "";
      setType("youtube");
      await onCreated?.();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to add content"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div>
      <div className="w-screen h-screen bg-slate-500 opacity-60 fixed top-0 left-0 z-40" />
      <div className="w-screen h-screen top-0 left-0 fixed flex justify-center items-center z-50">
        <div className="bg-white-100 p-4 rounded shadow-2xl min-w-80">
          <div className="flex pb-2 justify-end">
            <button onClick={onClose} aria-label="Close">
              <CrossIcon />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <Input reference={titleRef} placeholder="Title" />
            <Input reference={linkRef} placeholder="Link (https://...)" />
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {CONTENT_TYPES.map((t) => (
                <Button
                  key={t}
                  text={t.charAt(0).toUpperCase() + t.slice(1)}
                  variant={type === t ? "primary" : "secondary"}
                  onClick={() => setType(t)}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-center pt-2">
            <Button onClick={postContent} variant="primary" text={submitting ? "Adding..." : "Submit"} />
          </div>
        </div>
      </div>
    </div>
  );
}
