import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/dist/style.css";
import "./ModernDatePicker.css";

export default function ModernDatePicker({
  value,
  onChange,
  minDate = new Date(),
  placeholder = "Select travel date",
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const displayValue = value ? format(value, "dd MMM yyyy") : "";

  return (
    <div className="modernDatePicker" ref={wrapRef}>
      <button
        type="button"
        className={`modernDatePickerTrigger ${open ? "isOpen" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={`modernDatePickerText ${value ? "hasValue" : ""}`}>
          {displayValue || placeholder}
        </span>

        <span className="modernDatePickerIcon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="4" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="modernDatePickerPopover">
          <DayPicker
            mode="single"
            selected={value}
            onSelect={(date) => {
              if (!date) return;
              onChange(date);
              setOpen(false);
            }}
            disabled={{ before: minDate }}
            defaultMonth={value || minDate}
            showOutsideDays
            fixedWeeks
            className="ontripDayPicker"
          />
        </div>
      )}
    </div>
  );
}