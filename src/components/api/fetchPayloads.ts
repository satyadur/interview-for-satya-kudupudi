import type { Payload } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export const usePayloads = () => {
  return useQuery<Payload[]>({
    queryKey: ["payloads"],
    queryFn: async () => {
      const response = await fetch("https://api.spacexdata.com/v4/payloads");
      if (!response.ok) throw new Error("Failed to fetch payloads");
      return response.json();
    },
  });
};
