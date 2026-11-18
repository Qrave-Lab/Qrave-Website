"use client";

/*
 * Drop-in replacement for a native <select>.
 *
 * Accepts the same props and <option> children, and calls onChange with an
 * event-like object whose target.value is a string, so existing handlers such
 * as `onChange={(e) => setX(e.target.value)}` keep working unchanged.
 * The list is rendered in a portal so it is never clipped by scroll containers.
 */

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

type Opt = { value: string; label: React.ReactNode; text: string; disabled?: boolean; hidden?: boolean };

type SelectChangeEvent = {
  target: { value: string; name?: string };
  currentTarget: { value: string; name?: string };
  preventDefault: () => void;
  stopPropagation: () => void;
};

export interface SelectProps {
  value?: string | number | readonly string[] | null;
  defaultValue?: string | number;
  onChange?: (e: SelectChangeEvent) => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  title?: string;
  placeholder?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  [key: `data-${string}`]: unknown;
}

function textOf(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children);
  return "";
}

function collectOptions(children: React.ReactNode, out: Opt[] = []): Opt[] {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as {
      value?: string | number;
      children?: React.ReactNode;
      disabled?: boolean;
      hidden?: boolean;
    };
    if (child.type === React.Fragment || child.type === "optgroup") {
      collectOptions(props.children, out);
      return;
    }
    if (child.type === "option") {
      const text = textOf(props.children);
      out.push({
        value: props.value === undefined ? text : String(props.value),
        label: props.children,
        text,
        disabled: props.disabled,
        hidden: props.hidden,
      });
    }
  });
  return out;
}

// Classes that only make sense on a native select; the trigger replaces them.
const DROP = /^(appearance-none|cursor-pointer|pr-(7|8|9|10|11|12|14)|bg-no-repeat|bg-\[url.*\]|bg-\[right.*\]|bg-\[length.*\])$/;

export function Select({
  value,
  defaultValue,
  onChange,
  children,
  className = "",
  style,
  disabled,
  id,
  name,
  title,
  placeholder,
  ...rest
}: SelectProps) {
  const options = collectOptions(children);
  const visible = options.filter((o) => !o.hidden);
  const controlled = value !== undefined && value !== null;
  const [inner, setInner] = useState<string>(
    defaultValue !== undefined ? String(defaultValue) : options[0]?.value ?? "",
  );
  const current = controlled ? String(value) : inner;
  // A hidden option (e.g. "Choose…") is a prompt, so show it as a placeholder.
  const match = options.find((o) => o.value === current);
  const selected = match && !match.hidden ? match : undefined;
  const promptText = match?.hidden ? match.text : undefined;

  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const width = Math.max(r.width, 180);
    const left = Math.min(r.left, window.innerWidth - width - 8);
    if (below < 240 && above > below) {
      setPos({ left, width, bottom: window.innerHeight - r.top + 6, maxH: Math.min(320, above) });
    } else {
      setPos({ left, width, top: r.bottom + 6, maxH: Math.min(320, below) });
    }
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const i = visible.findIndex((o) => o.value === current);
    setCursor(i < 0 ? 0 : i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onMove = () => place();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const item = listRef.current.querySelector<HTMLElement>(`[data-idx="${cursor}"]`);
    item?.scrollIntoView({ block: "nearest" });
  }, [cursor, open]);

  const commit = (v: string) => {
    setOpen(false);
    btnRef.current?.focus();
    if (v === current) return;
    if (!controlled) setInner(v);
    const target = { value: v, name };
    onChange?.({ target, currentTarget: target, preventDefault() {}, stopPropagation() {} });
  };

  const step = (dir: 1 | -1) => {
    setCursor((c) => {
      let n = c;
      for (let i = 0; i < visible.length; i++) {
        n = (n + dir + visible.length) % visible.length;
        if (!visible[n]?.disabled) return n;
      }
      return c;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      step(-1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const o = visible[cursor];
      if (o && !o.disabled) commit(o.value);
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (e.key.length === 1) {
      const k = e.key.toLowerCase();
      const i = visible.findIndex((o, idx) => idx > cursor && o.text.toLowerCase().startsWith(k));
      const j = i >= 0 ? i : visible.findIndex((o) => o.text.toLowerCase().startsWith(k));
      if (j >= 0) setCursor(j);
    }
  };

  const triggerClass = className
    .split(/\s+/)
    .filter((c) => c && !DROP.test(c))
    .join(" ");

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        id={id}
        title={title}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={rest["aria-label"]}
        aria-labelledby={rest["aria-labelledby"]}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        style={style}
        className={`qr-select inline-flex items-center justify-between gap-2 text-left ${triggerClass} ${open ? "qr-select--open" : ""}`}
      >
        <span className={`min-w-0 truncate ${selected ? "" : "text-slate-400"}`}>
          {selected ? selected.label : promptText || placeholder || "Select"}
        </span>
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {name && <input type="hidden" name={name} value={current} />}
      {open && pos &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="qr-ui qr-select-list fixed z-[1000] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_-16px_rgba(15,17,23,0.35)]"
            style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH }}
          >
            {visible.length === 0 && (
              <li className="px-3 py-3 text-[13px] text-slate-400">No options</li>
            )}
            {visible.map((o, i) => {
              const isSel = o.value === current;
              return (
                <li
                  key={`${o.value}-${i}`}
                  data-idx={i}
                  role="option"
                  aria-selected={isSel}
                  aria-disabled={o.disabled}
                  onMouseEnter={() => !o.disabled && setCursor(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => !o.disabled && commit(o.value)}
                  className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-[14px] ${
                    o.disabled
                      ? "cursor-not-allowed text-slate-300"
                      : `cursor-pointer ${i === cursor ? "bg-slate-50" : ""} ${isSel ? "font-semibold text-slate-900" : "text-slate-700"}`
                  }`}
                >
                  <span className="min-w-0 truncate">{o.label}</span>
                  {isSel && <Check className="h-4 w-4 shrink-0 text-[#fe5c13]" strokeWidth={2.5} />}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}

export default Select;
