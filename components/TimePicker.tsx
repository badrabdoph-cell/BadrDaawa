"use client";

import { Clock } from "lucide-react";

const timeOptions = [
  "12:00 مساءً",
  "01:00 مساءً",
  "02:00 مساءً",
  "03:00 مساءً",
  "04:00 مساءً",
  "05:00 مساءً",
  "06:00 مساءً",
  "07:00 مساءً",
  "08:00 مساءً",
  "09:00 مساءً",
  "10:00 مساءً",
  "11:00 مساءً",
];

export function TimePicker({
  value,
  onChange,
  id,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`field ${className || ""}`}>
      {label ? (
        <label htmlFor={id}>
          <Clock size={16} />
          {label}
        </label>
      ) : null}
      <select
        id={id}
        value={timeOptions.includes(value) ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          اختر وقت الحفل
        </option>
        {timeOptions.map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
    </div>
  );
}
