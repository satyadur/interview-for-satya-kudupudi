import type { Launch } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export const useLaunches = () => {
  return useQuery<Launch[]>({
    queryKey: ["launches"],
    queryFn: async () => {
      const response = await fetch("https://api.spacexdata.com/v5/launches/");
      if (!response.ok) throw new Error("Failed to fetch launches");
      return response.json();
    },
  });
};
