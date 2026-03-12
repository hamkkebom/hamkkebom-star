"use client";

import { useState } from "react";
import { format, differenceInDays } from "date-fns";
import { ko } from "date-fns/locale";
import type { DateRange as DayPickerDateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export type DateRange = { from: Date; to: Date };

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DayPickerDateRange | undefined>({
    from: dateRange.from,
    to: dateRange.to,
  });

  const handleSelect = (range: DayPickerDateRange | undefined) => {
    setSelected(range);
    if (range?.from && range?.to) {
      if (differenceInDays(range.to, range.from) > 365) {
        toast.error("최대 365일 범위까지 선택할 수 있습니다.");
        return;
      }
      onDateRangeChange({ from: range.from, to: range.to });
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/50 px-4 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors h-auto"
        >
          <CalendarIcon className="w-4 h-4 text-slate-500" />
          <span>
            {format(dateRange.from, "yyyy.MM.dd", { locale: ko })}
            {" ~ "}
            {format(dateRange.to, "yyyy.MM.dd", { locale: ko })}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-muted dark:bg-slate-900/90 border border-slate-200/50 dark:border-slate-700/50 shadow-2xl rounded-2xl overflow-hidden"
        align="end"
      >
        <Calendar
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={2}
          disabled={{ after: new Date() }}
          locale={ko}
        />
      </PopoverContent>
    </Popover>
  );
}
