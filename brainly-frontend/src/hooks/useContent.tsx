import { useCallback, useEffect, useState } from "react";
import { api, getErrorMessage } from "../lib/api";
import type { Content } from "../types";

interface UseContentResult {
  contents: Content[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export default function useContent(): UseContentResult {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ contents: Content[] }>("/api/v1/content");
      setContents(response.data.contents ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load contents"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  return { contents, loading, error, refetch: fetchContents };
}
