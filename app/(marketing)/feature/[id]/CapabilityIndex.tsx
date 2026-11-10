"use client";

import { useEffect, useState } from "react";

interface Item {
    id: string;
    title: string;
}

/** Links to each capability; marks the one currently being read. */
export default function CapabilityIndex({ items }: { items: Item[] }) {
    const [active, setActive] = useState(items[0]?.id ?? "");

    useEffect(() => {
        const els = items
            .map((i) => document.getElementById(i.id))
            .filter((el): el is HTMLElement => !!el);
        if (!els.length) return;

        let frame = 0;
        const update = () => {
            frame = 0;
            // The last capability whose top has passed the reading line wins.
            const line = window.innerHeight * 0.35;
            let current = els[0].id;
            for (const el of els) {
                if (el.getBoundingClientRect().top <= line) current = el.id;
            }
            setActive((prev) => (prev === current ? prev : current));
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };

        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, [items]);

    return (
        <ul className="mt-8 space-y-1">
            {items.map((item) => {
                const isActive = item.id === active;
                return (
                    <li key={item.id}>
                        <a
                            href={`#${item.id}`}
                            aria-current={isActive ? "true" : undefined}
                            className={`flex items-center gap-3 rounded-sm py-1.5 text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fe5c13] ${
                                isActive
                                    ? "font-semibold text-slate-950"
                                    : "font-medium text-slate-500 hover:text-slate-950"
                            }`}
                        >
                            <span
                                aria-hidden
                                className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                                    isActive ? "bg-[#fe5c13]" : "bg-transparent"
                                }`}
                            />
                            {item.title}
                        </a>
                    </li>
                );
            })}
        </ul>
    );
}
