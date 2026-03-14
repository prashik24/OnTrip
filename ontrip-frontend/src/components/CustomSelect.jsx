import { useEffect, useMemo, useRef, useState } from "react";
import "./CustomSelect.css";

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select option",
  className = "",
  disabled = false,
  name,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selected = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value));
  }, [options, value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false);
      }
    }

    function handleEscape(e) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleSelect(nextValue) {
    onChange?.({
      target: {
        name,
        value: nextValue,
      },
    });
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className={`customSelect ${open ? "open" : ""} ${disabled ? "disabled" : ""} ${className}`}
    >
      <button
        type="button"
        className="customSelectTrigger"
        onClick={() => !disabled && setOpen((s) => !s)}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
      >
        <span className={`customSelectValue ${selected ? "" : "placeholder"}`}>
          {selected ? selected.label : placeholder}
        </span>

        <span className="customSelectArrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M7 10L12 15L17 10"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open && (
        <div className="customSelectMenu" role="listbox">
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);

            return (
              <button
                key={String(opt.value)}
                type="button"
                className={`customSelectOption ${isSelected ? "selected" : ""}`}
                onClick={() => handleSelect(opt.value)}
                role="option"
                aria-selected={isSelected}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}