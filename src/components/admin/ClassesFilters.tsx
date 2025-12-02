import { useState } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ClassesFilters() {
  const [date, setDate] = useState<Date>();
  const ctl =
    "h-11 w-full rounded-3xl border border-white/60 bg-white/60 px-4 text-sm text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(13,95,229,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-white/40";

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 sm:col-span-3">
        <DatePicker date={date} setDate={setDate} placeholder="mm/dd/yyyy" />
      </div>
      <div className="col-span-12 sm:col-span-3">
        <Select defaultValue="all">
          <SelectTrigger>
            <SelectValue placeholder="All Days" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Days</SelectItem>
            <SelectItem value="mon">Monday</SelectItem>
            <SelectItem value="tue">Tuesday</SelectItem>
            <SelectItem value="wed">Wednesday</SelectItem>
            <SelectItem value="thu">Thursday</SelectItem>
            <SelectItem value="fri">Friday</SelectItem>
            <SelectItem value="sat">Saturday</SelectItem>
            <SelectItem value="sun">Sunday</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-12 sm:col-span-3">
        <input className={ctl} placeholder="Filter Title" />
      </div>
      <div className="col-span-12 sm:col-span-2">
        <input className={ctl} placeholder="Filter Code" />
      </div>
      <div className="col-span-12 sm:col-span-1 flex sm:justify-end">
        <button className="h-11 w-full rounded-3xl border border-white/60 bg-white/60 px-4 text-sm font-medium text-[var(--muted-foreground)] shadow-[0_12px_30px_-28px_rgba(15,23,42,0.5)] hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(13,95,229,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-white/40 sm:w-auto">
          Reload
        </button>
      </div>
    </div>
  );
}