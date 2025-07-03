import type { Rocket } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export const useRockets = () => {
  return useQuery<Rocket[]>({
    queryKey: ["rockets"],
    queryFn: async () => {
      const response = await fetch("https://api.spacexdata.com/v4/rockets");
      if (!response.ok) throw new Error("Failed to fetch rockets");
      return response.json();
    },
  });
};
