"use client";

import { forwardRef, useCallback, useRef } from "react";

type SimpleDateInputProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  required?: boolean;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-describedby"?: string;
  "aria-label"?: string;
};

export const SimpleDateInput = forwardRef<HTMLInputElement, SimpleDateInputProps>(function SimpleDateInput(
  { value, onChange, id, name, required, ...rest },
  forwardedRef,
) {
  const inputProps = {
    "aria-invalid": rest["aria-invalid"],
    "aria-describedby": rest["aria-describedby"],
    "aria-label": rest["aria-label"],
  };
  const internalRef = useRef<HTMLInputElement>(null);

  const setRef = useCallback(
    (el: HTMLInputElement | null) => {
      (internalRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      if (typeof forwardedRef === "function") {
        forwardedRef(el);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      }
    },
    [forwardedRef],
  );

  const openPicker = useCallback(() => {
    if (internalRef.current?.showPicker) {
      internalRef.current.showPicker();
    } else {
      internalRef.current?.focus();
    }
  }, []);

  const displayText = value
    ? new Date(value + "T00:00:00").toLocaleDateString("ar-EG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <span
      onClick={openPicker}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        cursor: "pointer",
        width: "100%",
        height: "100%",
      }}
    >
      <input
        ref={setRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        id={id}
        name={name}
        required={required}
        tabIndex={0}
        {...inputProps}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          cursor: "pointer",
          border: 0,
          padding: 0,
          zIndex: 1,
          fontSize: 16,
        }}
      />
      <span
        style={{
          color: value ? "inherit" : "#999",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {displayText || "يوم / شهر / سنة"}
      </span>
    </span>
  );
});
