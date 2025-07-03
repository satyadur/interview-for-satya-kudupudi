import type { Launchpad } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export const useLaunchpads = () => {
  return useQuery<Launchpad[]>({
    queryKey: ["launchpads"],
    queryFn: async () => {
      const response = await fetch("https://api.spacexdata.com/v4/launchpads");
      if (!response.ok) throw new Error("Failed to fetch launchpads");
      return response.json();
    },
  });
};
