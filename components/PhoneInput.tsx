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
  required?: boolean;
  autoComplete?: string;
};

export function PhoneInput({
  value,
  onChange,
  error,
  placeholder,
  id,
  required,
  autoComplete,
}: PhoneInputProps) {
  const [country, setCountry] = useState<CountryData>(DEFAULT_COUNTRY);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [rawInput, setRawInput] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [flipUp, setFlipUp] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
    function handleClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open) {
      setSearchQuery("");
      requestAnimationFrame(() => {
        searchRef.current?.focus();
        checkFlip();
      });
    }
  }, [open]);

  function checkFlip() {
    if (!containerRef.current || !listRef.current) return;
    const inputRect = containerRef.current.getBoundingClientRect();
    const listHeight = listRef.current.scrollHeight;
    const spaceBelow = window.innerHeight - inputRect.bottom;
    const spaceAbove = inputRect.top;
    setFlipUp(listHeight > spaceBelow && spaceAbove > spaceBelow);
  }

  function openDropdown() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setOpen(true);
  }

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
    setSearchQuery("");
    setOpen(false);
    if (rawInput) {
      onChange(formatToE164(rawInput, c.code));
    }
    requestAnimationFrame(() => phoneInputRef.current?.focus());
  }

  const filteredCountries = ARAB_COUNTRIES.filter(
    (c) =>
      !searchQuery ||
      c.name.includes(searchQuery) ||
      c.dialCode.includes(searchQuery) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const displayPlaceholder = placeholder || getPhonePlaceholder(country.code);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div className="phone-input-group" role="group" aria-label="رقم الهاتف">
        <button
          type="button"
          className="phone-input-country"
          onClick={openDropdown}
          title={country.name}
        >
          <span>{country.flag}</span>
          <span className="phone-input-dialcode">+{country.dialCode}</span>
          <svg
            className="phone-input-arrow"
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            style={{
              transition: "transform 180ms ease",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
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
          ref={phoneInputRef}
          id={id}
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

      {open && (
        <div
          ref={listRef}
          className={`phone-country-list${flipUp ? " flip-up" : ""}`}
          role="listbox"
        >
          <div className="phone-country-search-wrap">
            <input
              ref={searchRef}
              className="phone-country-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="ابحث عن دولة..."
              dir="auto"
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  const items = listRef.current?.querySelectorAll(
                    ".phone-country-item",
                  );
                  (items?.[0] as HTMLElement)?.focus();
                }
                if (event.key === "Escape") setOpen(false);
              }}
            />
          </div>
          <div className="phone-country-items">
            {filteredCountries.length === 0 ? (
              <div className="phone-country-empty">لا توجد نتائج</div>
            ) : (
              filteredCountries.map((c) => (
                <button
                  type="button"
                  key={c.code}
                  role="option"
                  aria-selected={c.code === country.code}
                  className={`phone-country-item${c.code === country.code ? " active" : ""}`}
                  onClick={() => selectCountry(c)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      const next = event.currentTarget
                        .nextElementSibling as HTMLElement | null;
                      next?.focus();
                    }
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      const prev = event.currentTarget
                        .previousElementSibling as HTMLElement | null;
                      prev?.focus();
                    }
                    if (event.key === "Escape") setOpen(false);
                  }}
                >
                  <span className="phone-country-item-flag">{c.flag}</span>
                  <span className="phone-country-item-name">{c.name}</span>
                  <span className="phone-country-item-dial">
                    +{c.dialCode}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
