"use client";

import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Calendar as CalenderIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FadeLoader } from "react-spinners";
import { Button } from "@/components/ui/button";
import { format, subWeeks, subMonths, subYears } from "date-fns";
import type { Launch, TableLaunch } from "@/lib/types";
import { useLaunches } from "./api/fetchLaunches";
import { useLaunchpads } from "./api/fetchLaunchpads";
import { useRockets } from "./api/fetchRockets";
import { usePayloads } from "./api/fetchPayloads";
import { CustomRangeCalendar } from "./CustomRangeCalendar";
import { truncateText } from "@/lib/utils";

type DateRangeCustom = {
  from?: Date;
  to?: Date;
};
// Date formatter for '24 March 2006 at 22:30' format
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    })
      .format(date)
      .replace(",", " at");
  } catch {
    return dateString;
  }
};

// Date formatter for calendar display (e.g., '01 Jan 2025')
const formatCalendarDate = (date: Date): string => {
  return format(date, "dd MMM yyyy");
};

// Table columns definition
const columns: ColumnDef<TableLaunch>[] = [
  { accessorKey: "id", header: "No", size: 50 },
  { accessorKey: "launched", header: "Launched (UTC)", size: 150 },
  { accessorKey: "location", header: "Location", size: 150 },
  { accessorKey: "mission", header: "Mission", size: 150 },
  { accessorKey: "orbit", header: "Orbit", size: 100 },
  {
    accessorKey: "status",
    header: "Launch Status",
    size: 120,
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const statusStyles: { [key: string]: string } = {
        Failed: "bg-[#FDE2E1] text-red-800",
        Success: "bg-[#DEF7EC] text-green-800",
        Upcoming: "bg-[#FEF3C7] text-yellow-800",
      };
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}
        >
          {status}
        </span>
      );
    },
  },
  { accessorKey: "rocket", header: "Rocket", size: 150 },
];

const Process = () => {
  // State for dialog and filters
  const [selectedLaunch, setSelectedLaunch] = useState<Launch | null>(null);
  const [timeframe, setTimeframe] = useState<string | null>(null);
  const [launchType, setLaunchType] = useState<string>("all");
  const [isTimeframeDialogOpen, setIsTimeframeDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeCustom>({
    from: undefined,
    to: undefined,
  });

  // Fetch data with TanStack Query
  const {
    data: launches,
    isLoading: isLaunchesLoading,
    error: launchesError,
  } = useLaunches();
  const {
    data: launchpads,
    isLoading: isLaunchpadsLoading,
    error: launchpadsError,
  } = useLaunchpads();
  const {
    data: rockets,
    isLoading: isRocketsLoading,
    error: rocketsError,
  } = useRockets();
  const {
    data: payloads,
    isLoading: isPayloadsLoading,
    error: payloadsError,
  } = usePayloads();

  // Predefined timeframes
  const timeframes = [
    { label: "Past Week", value: "past-week" },
    { label: "Past Month", value: "past-month" },
    { label: "Past 3 Months", value: "past-3-months" },
    { label: "Past 6 Months", value: "past-6-months" },
    { label: "Past Year", value: "past-year" },
    { label: "Past 2 Years", value: "past-2-years" },
  ];

  // Calculate timeframe display label
  const timeframeLabel = useMemo(() => {
    if (dateRange.from && dateRange.to) {
      return `${formatCalendarDate(dateRange.from)} - ${formatCalendarDate(
        dateRange.to
      )}`;
    }
    const selected = timeframes.find((tf) => tf.value === timeframe);
    return selected ? selected.label : "Select Timeframe";
  }, [timeframe, dateRange]);

  // Filter and map API data to table data
  const tableData: TableLaunch[] = useMemo(() => {
    if (!launches || !launchpads || !rockets || !payloads) return [];

    let filteredData = launches;

    // Apply timeframe filter
    const now = new Date("2025-07-03T18:01:00+05:30"); // Updated IST time
    if (timeframe || dateRange.from) {
      let startDate: Date;
      if (dateRange.from) {
        startDate = dateRange.from;
        filteredData = filteredData.filter((launch) => {
          const launchDate = new Date(launch.date_utc);
          return launchDate >= startDate && launchDate <= (dateRange.to || now);
        });
      } else {
        switch (timeframe) {
          case "past-week":
            startDate = subWeeks(now, 1);
            break;
          case "past-month":
            startDate = subMonths(now, 1);
            break;
          case "past-3-months":
            startDate = subMonths(now, 3);
            break;
          case "past-6-months":
            startDate = subMonths(now, 6);
            break;
          case "past-year":
            startDate = subYears(now, 1);
            break;
          case "past-2-years":
            startDate = subYears(now, 2);
            break;
          default:
            startDate = new Date(0);
        }
        filteredData = filteredData.filter((launch) => {
          const launchDate = new Date(launch.date_utc);
          return launchDate >= startDate && launchDate <= now;
        });
      }
    }

    // Apply launch type filter
    filteredData = filteredData.filter((launch) => {
      const status = launch.upcoming
        ? "Upcoming"
        : launch.success === true
        ? "Success"
        : "Failed";
      return launchType === "all" || status.toLowerCase() === launchType;
    });

    // Map to table data
    return filteredData.map((launch) => {
      const launchpad = launchpads.find((lp) => lp.id === launch.launchpad);
      const rocket = rockets.find((r) => r.id === launch.rocket);
      const payload = launch.payloads[0]
        ? payloads.find((p) => p.id === launch.payloads[0])
        : null;

      return {
        id: launch.flight_number,
        launched: formatDate(launch.date_utc),
        location: launchpad ? launchpad.full_name : "Unknown",
        mission: launch.name,
        orbit: payload ? payload.orbit || "Unknown" : "Unknown",
        status: launch.upcoming
          ? "Upcoming"
          : launch.success === true
          ? "Success"
          : "Failed",
        rocket: rocket ? rocket.name : "Unknown",
        rocket_type: rocket ? rocket.type : "Unknown",
        company: rocket ? rocket.company : "Unknown",
        country: rocket ? rocket.country : "Unknown", // Added country
        rawData: launch,
      };
    });
  }, [
    launches,
    launchpads,
    rockets,
    payloads,
    timeframe,
    launchType,
    dateRange,
  ]);

  // Table setup
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 12;
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { pagination: { pageIndex, pageSize } },
    onPaginationChange: (updater) => {
      const newState =
        typeof updater === "function"
          ? updater({ pageIndex, pageSize })
          : updater;
      setPageIndex(newState.pageIndex);
    },
  });

  const totalPages = Math.ceil(tableData.length / pageSize);

  // Combine loading and error states
  const isLoading =
    isLaunchesLoading ||
    isLaunchpadsLoading ||
    isRocketsLoading ||
    isPayloadsLoading;
  const error =
    launchesError || launchpadsError || rocketsError || payloadsError;

  return (
    <div className="max-w-7xl mx-auto mt-16 px-4 sm:px-6 lg:px-8 py-8">
      {/* Select Dropdowns */}
      <div className="flex justify-between items-center mb-6">
        <Button
          onClick={() => setIsTimeframeDialogOpen(true)}
          className="w-[180px] border-none cursor-pointer bg-white text-[#4B5563] hover:bg-gray-200"
          data-testid="timeframe-button"
        >
          <CalenderIcon /> {timeframeLabel} <ChevronDown />
        </Button>
        <Select
          onValueChange={(value) =>
            setLaunchType(value === "clear" ? "all" : value)
          }
          value={launchType}
          data-testid="launch-type-select"
        >
          <SelectTrigger className="w-[180px] border-none cursor-pointer">
            <SelectValue placeholder="Select launch type" />
          </SelectTrigger>
          <SelectContent className="bg-white border-none cursor-pointer">
            <SelectItem value="all">All Launches</SelectItem>
            <SelectItem value="upcoming">Upcoming Launches</SelectItem>
            <SelectItem value="success">Successful Launches</SelectItem>
            <SelectItem value="failed">Failed Launches</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Timeframe Dialog */}
      <Dialog
        open={isTimeframeDialogOpen}
        onOpenChange={(open) => {
          setIsTimeframeDialogOpen(open);
          if (!open && !timeframe) {
            setDateRange({ from: undefined, to: undefined });
          }
        }}
        data-testid="timeframe-dialog"
      >
        <DialogContent className="sm:max-w-fit border-none bg-white">
          <DialogHeader className="sr-only">
            <DialogTitle className="text-[#1F2937] text-lg font-semibold">
              Select Timeframe
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-4">
            {/* Left Side: Predefined Timeframes */}
            <div className="w-32 space-y-2 flex flex-col items-start">
              {timeframes.map((tf) => (
                <Button
                  key={tf.value}
                  variant="ghost"
                  className="w-full cursor-pointer justify-start text-left text-[#1F2937] hover:bg-gray-100 px-4 py-2"
                  onClick={() => {
                    setTimeframe(tf.value);
                    setDateRange({ from: undefined, to: undefined });
                    setIsTimeframeDialogOpen(false);
                  }}
                  data-testid={`timeframe-option-${tf.value}`}
                >
                  {tf.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                className="w-full cursor-pointer justify-start text-left text-[#1F2937] hover:bg-gray-100 px-4 py-2"
                onClick={() => {
                  setTimeframe(null);
                  setDateRange({ from: undefined, to: undefined });
                  setIsTimeframeDialogOpen(false);
                }}
                data-testid="timeframe-option-clear"
              >
                Clear
              </Button>
            </div>
            {/* Right Side: Custom Calendar */}
            <div
              className="w-full p-4 border-l border-[#1F2937]"
              data-testid="calendar-container"
            >
              <div className="flex flex-col gap-3">
                <CustomRangeCalendar
                  selectedRange={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    setTimeframe(null);
                  }}
                />
                  <div className="w-full flex justify-end items-end">
            <Button
              className="bg-[#60A5FA] text-white hover:bg-[#3B82F6]"
              onClick={() => {
                if (dateRange.from) {
                  setIsTimeframeDialogOpen(false);
                }
              }}
              disabled={!dateRange.from}
              data-testid="apply-date-range"
            >
              Apply
            </Button>
          </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error State */}
      {error && (
        <div
          className="text-center text-red-600 py-8"
          data-testid="error-message"
        >
          <p>Error: {error.message}</p>
          <Button
            className="mt-4 px-4 py-2 bg-[#60A5FA] text-white hover:bg-[#3B82F6]"
            onClick={() => {
              window.location.reload();
            }}
            data-testid="retry-button"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      <div
        className="overflow-x-auto rounded-sm shadow-[0px_1px_3px_0px_#0000001A]"
        data-testid="launches-table"
      >
        <table className="w-full border-collapse">
          <thead className="bg-[#F4F5F7] text-[#4B5563] sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-sm font-medium hover:bg-gray-100 transition-colors"
                    style={{ width: header.column.columnDef.size }}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-8"
                  data-testid="loading"
                >
                  <div className="flex justify-center items-center h-64">
                    <FadeLoader color="#E4E4E7" />
                  </div>
                </td>
              </tr>
            ) : !error && tableData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center text-[#4B5563] py-8"
                  data-testid="no-results"
                >
                  No results found for the specified filter
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedLaunch(row.original.rawData)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 text-sm text-[#4B5563] whitespace-nowrap"
                      style={{ width: cell.column.columnDef.size }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
        <style>
          {`
            .overflow-x-auto::-webkit-scrollbar {
              display: none;
            }
            .overflow-x-auto {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}
        </style>
      </div>

      {/* Pagination */}
      {!isLoading && !error && tableData.length > 0 && (
        <div className="flex justify-end mt-4">
          <div className="flex">
            <button
              className="border border-[#E4E4E7] px-3 py-1 text-[#4B5563] flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              className="border border-[#E4E4E7] cursor-pointer px-3 py-1 text-[#4B5563] hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={() => setPageIndex(0)}
              disabled={pageIndex === 0}
            >
              1
            </button>
            <button
              className="border border-[#E4E4E7] cursor-pointer px-3 py-1 text-[#4B5563] hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={() => setPageIndex(1)}
              disabled={pageIndex === 1 || totalPages < 2}
            >
              2
            </button>
            <div className="border border-[#E4E4E7] px-3 py-1 text-[#4B5563] flex items-center justify-center">
              ...
            </div>
            <button
              className="border border-[#E4E4E7] cursor-pointer px-3 py-1 text-[#4B5563] hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={() => setPageIndex(totalPages - 1)}
              disabled={pageIndex === totalPages - 1 || totalPages < 2}
            >
              {totalPages}
            </button>
            <button
              className="space-x-1 border border-[#E4E4E7] px-3 py-1 text-[#4B5563] flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Launch Details Dialog */}
      <Dialog
        open={!!selectedLaunch}
        onOpenChange={() => setSelectedLaunch(null)}
        data-testid="launch-dialog"
      >
        <DialogContent className="sm:max-w-[600px] border-none bg-white">
          <DialogHeader className="sr-only">
            <DialogTitle className="text-[#1F2937] text-lg font-semibold">
              Launch Details
            </DialogTitle>
          </DialogHeader>
          {selectedLaunch && (
            <div className="space-y-6 text-[#1F2937]">
              <div className="flex items-center gap-4">
                <img
                  src={
                    selectedLaunch.links.patch.small || ""
                  }
                  alt="Patch"
                  className="h-20 w-20 object-contain rounded-sm"
                />
                <div className="space-y-2">
                  <div className="flex gap-3 justify-center items-center">
                    <h3 className="text-lg font-medium">
                      {selectedLaunch.name}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedLaunch.upcoming
                          ? "bg-[#FEF3C7] text-yellow-800"
                          : selectedLaunch.success
                          ? "bg-[#DEF7EC] text-green-800"
                          : "bg-[#FDE2E1] text-red-800"
                      }`}
                    >
                      {selectedLaunch.upcoming
                        ? "Upcoming"
                        : selectedLaunch.success
                        ? "Success"
                        : "Failed"}
                    </span>
                  </div>
                  <p
                    className="text-xs text-[#374151]"
                    data-testid="rocket-name"
                  >
                    {rockets?.find((r) => r.id === selectedLaunch.rocket)
                      ?.name || "Unknown"}
                  </p>
                  <div className="flex gap-4" data-testid="links">
                    {selectedLaunch.links.article && (
                      <a
                        href={selectedLaunch.links.article}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[#60A5FA] hover:underline"
                        data-testid="nasa-link"
                      >
                        <img
                          src="/assets/nasa.png"
                          alt="NASA"
                          className="h-5 w-5 object-contain"
                        />
                      </a>
                    )}
                    {selectedLaunch.links.wikipedia && (
                      <a
                        href={selectedLaunch.links.wikipedia}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[#60A5FA] hover:underline"
                        data-testid="wikipedia-link"
                      >
                        <img
                          src="/assets/wiki.png"
                          alt="Wikipedia"
                          className="h-5 w-5 object-contain"
                        />
                      </a>
                    )}
                    {selectedLaunch.links.webcast && (
                      <a
                        href={selectedLaunch.links.webcast}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[#60A5FA] hover:underline"
                        data-testid="youtube-link"
                      >
                        <img
                          src="/assets/you.png"
                          alt="YouTube"
                          className="h-5 w-5 object-contain"
                        />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-light">
                  {truncateText(selectedLaunch.details)}{" "}
                  {selectedLaunch.links.wikipedia && (
                    <a
                      href={selectedLaunch.links.wikipedia}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#60A5FA] hover:underline"
                      data-testid="wikipedia-link-description"
                    >
                      Wikipedia
                    </a>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {[
                  {
                    label: "Flight Number",
                    value: selectedLaunch.flight_number,
                  },
                  { label: "Mission Name", value: selectedLaunch.name },
                  {
                    label: "Rocket Type",
                    value:
                      rockets?.find((r) => r.id === selectedLaunch.rocket)
                        ?.type || "Unknown",
                  },
                  {
                    label: "Rocket Name",
                    value:
                      rockets?.find((r) => r.id === selectedLaunch.rocket)
                        ?.name || "Unknown",
                  },
                  {
                    label: "Manufacturer",
                    value:
                      rockets?.find((r) => r.id === selectedLaunch.rocket)
                        ?.company || "Unknown",
                  },
                  {
                    label: "Nationality",
                    value:
                      rockets?.find((r) => r.id === selectedLaunch.rocket)
                        ?.country || "Unknown", // Updated to use rocket.country
                  },
                  {
                    label: "Launch Date",
                    value: formatDate(selectedLaunch.date_utc),
                  },
                  {
                    label: "Payload Type",
                    value:
                      payloads?.find((p) => p.id === selectedLaunch.payloads[0])
                        ?.type || "Unknown",
                  },
                  {
                    label: "Orbit",
                    value:
                      payloads?.find((p) => p.id === selectedLaunch.payloads[0])
                        ?.orbit || "Unknown",
                  },
                  {
                    label: "Launch Site",
                    value:
                      launchpads?.find(
                        (lp) => lp.id === selectedLaunch.launchpad
                      )?.full_name || "Unknown",
                  },
                ].map((item, index, array) => (
                  <div
                    key={item.label}
                    className={`text-sm font-light flex pb-2 ${
                      index < array.length - 1
                        ? "border-b border-[#E4E4E7]"
                        : ""
                    }`}
                  >
                    <span className="font-light w-xs">{item.label}:</span>{" "}
                    {item.value}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Process;
