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

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  handler: () => void,
) {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [ref, handler]);
}

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [rawInput, setRawInput] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetAnimatedIn, setSheetAnimatedIn] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const sheetSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useClickOutside(containerRef, () => {
    if (!isMobile) setDropdownOpen(false);
  });

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
    if (dropdownOpen && searchRef.current) {
      searchRef.current.focus();
      setSearchQuery("");
    }
  }, [dropdownOpen]);

  useEffect(() => {
    if (sheetVisible) {
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => setSheetAnimatedIn(true));
      requestAnimationFrame(() => sheetSearchRef.current?.focus());
    } else {
      document.body.style.overflow = "";
      setSheetAnimatedIn(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetVisible]);

  function openCountryPicker() {
    if (isMobile) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setSearchQuery("");
      setSheetVisible(true);
    } else {
      setSearchQuery("");
      setDropdownOpen(true);
    }
  }

  function closeSheet() {
    setSheetAnimatedIn(false);
    setTimeout(() => {
      setSheetVisible(false);
      requestAnimationFrame(() => phoneInputRef.current?.focus());
    }, 220);
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
    if (rawInput) {
      onChange(formatToE164(rawInput, c.code));
    }
    if (isMobile) {
      closeSheet();
    } else {
      setDropdownOpen(false);
    }
  }

  const filteredCountries = ARAB_COUNTRIES.filter(
    (c) =>
      !searchQuery ||
      c.name.includes(searchQuery) ||
      c.dialCode.includes(searchQuery) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const displayPlaceholder = placeholder || getPhonePlaceholder(country.code);

  const listContent = (
    <div className="phone-dropdown-list-inner">
      {filteredCountries.length === 0 ? (
        <div className="phone-dropdown-empty">لا توجد نتائج</div>
      ) : (
        filteredCountries.map((c) => (
          <button
            type="button"
            key={c.code}
            role="option"
            aria-selected={c.code === country.code}
            className={`phone-dropdown-item${c.code === country.code ? " active" : ""}`}
            onClick={() => selectCountry(c)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setDropdownOpen(false);
            }}
          >
            <span className="phone-dropdown-flag">{c.flag}</span>
            <span className="phone-dropdown-name">{c.name}</span>
            <span className="phone-dropdown-dial">+{c.dialCode}</span>
          </button>
        ))
      )}
    </div>
  );

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div className="phone-input-group" role="group" aria-label="رقم الهاتف">
        <button
          type="button"
          className="phone-input-country"
          onClick={openCountryPicker}
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
            style={{
              transition: "transform 180ms ease",
              transform:
                dropdownOpen || sheetVisible ? "rotate(180deg)" : "rotate(0deg)",
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

      {/* Desktop dropdown */}
      {!isMobile && dropdownOpen && (
        <div className="phone-input-dropdown" role="listbox">
          <div className="phone-input-search-wrap">
            <input
              ref={searchRef}
              className="phone-input-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="ابحث عن دولة..."
              dir="auto"
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  const items = containerRef.current?.querySelectorAll(
                    ".phone-dropdown-item",
                  );
                  (items?.[0] as HTMLElement)?.focus();
                }
              }}
            />
          </div>
          <div className="phone-dropdown-list scrollable">{listContent}</div>
        </div>
      )}

      {/* Mobile bottom sheet */}
      {isMobile && sheetVisible && (
        <div className="phone-sheet-overlay" onClick={closeSheet}>
          <div
            className={`phone-sheet-panel${sheetAnimatedIn ? " is-open" : ""}`}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="اختر الدولة"
          >
            <div className="phone-sheet-header">
              <button
                type="button"
                className="phone-sheet-close"
                onClick={closeSheet}
                aria-label="إغلاق"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <span className="phone-sheet-title">اختر الدولة</span>
            </div>

            <div className="phone-input-search-wrap sheet-search">
              <input
                ref={sheetSearchRef}
                className="phone-input-search"
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="ابحث عن دولة..."
                dir="auto"
              />
            </div>

            <div className="phone-dropdown-list scrollable sheet-list">
              {listContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
