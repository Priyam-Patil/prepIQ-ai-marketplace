
"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

const useFetch = (cb) => {
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fn = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);

      try {
        const response = await cb(...args);

        // Handle server actions that return { success, error }
        if (response?.success === false) {
          const message =
            response.error || "Something went wrong.";

          setError(message);
          toast.error(message);
          return response;
        }

        setData(response);
        return response;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.";

        setError(message);
        toast.error(message);

        return {
          success: false,
          error: message,
        };
      } finally {
        setLoading(false);
      }
    },
    [cb]
  );

  return {
    data,
    loading,
    error,
    fn,
    setData,
  };
};

export default useFetch;
