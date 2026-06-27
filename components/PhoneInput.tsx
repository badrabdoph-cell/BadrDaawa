"use client";

import { useEffect, useRef, useState } from "react";
import {
  ARAB_COUNTRIES,
  DEFAULT_COUNTRY,
  type CountryData,
  formatToE164,
  parseE164,
  getPhonePlaceholder,
} from "@/lib/phone-utils";

type PhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
  autoComplete?: string;
};

export function PhoneInput({
  value,
  onChange,
  error,
  placeholder,
  id,
  name,
  required,
  autoComplete,
}: PhoneInputProps) {
  const [country, setCountry] = useState<CountryData>(DEFAULT_COUNTRY);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [rawInput, setRawInput] = useState("");
  const [initialized, setInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && !initialized) {
      if (value.startsWith("+")) {
        const { national, country: parsedCountry } = parseE164(value);
        if (parsedCountry) setCountry(parsedCountry);
        setRawInput(national ? national.replace(/[^\d]/g, "") : "");
      } else {
        setRawInput(value.replace(/[^\d]/g, ""));
      }
      setInitialized(true);
    }
  }, [value, initialized]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInputChange(input: string) {
    const digits = input.replace(/[^\d]/g, "");
    let truncated: string;
    if (country.code === "EG") {
      const maxLen = digits.startsWith("1") && !digits.startsWith("01") ? 10 : 11;
      truncated = digits.slice(0, maxLen);
    } else {
      truncated = digits.slice(0, 15);
    }
    setRawInput(truncated);
    onChange(truncated ? formatToE164(truncated, country.code) : "");
  }

  function handleBlur() {
    if (rawInput) {
      onChange(formatToE164(rawInput, country.code));
    }
  }

  function selectCountry(c: CountryData) {
    setCountry(c);
    setDropdownOpen(false);
    if (rawInput) {
      onChange(formatToE164(rawInput, c.code));
    }
  }

  const displayPlaceholder = placeholder || getPhonePlaceholder(country.code);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div className="phone-input-group" role="group" aria-label="رقم الهاتف">
        <button
          type="button"
          className="phone-input-country"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          title={country.name}
        >
          <span className="phone-input-flag">{country.flag}</span>
          <span className="phone-input-dialcode">+{country.dialCode}</span>
          <svg
            className="phone-input-arrow"
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
          >
            <path
              d="M1 1L5 5L9 1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete={autoComplete || "tel"}
          required={required}
          className="phone-input-field"
          value={rawInput}
          onChange={(event) => handleInputChange(event.target.value)}
          onBlur={handleBlur}
          placeholder={displayPlaceholder}
          dir="ltr"
          aria-invalid={error ? true : undefined}
          aria-describedby={error && id ? `${id}-error` : undefined}
        />
      </div>

      {dropdownOpen && (
        <div className="phone-input-dropdown">
          {ARAB_COUNTRIES.map((c) => (
            <button
              type="button"
              key={c.code}
              className={`phone-input-dropdown-item${c.code === country.code ? " active" : ""}`}
              onClick={() => selectCountry(c)}
            >
              <span className="phone-input-flag">{c.flag}</span>
              <span className="phone-input-name">{c.name}</span>
              <span className="phone-input-dialcode-option">+{c.dialCode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
