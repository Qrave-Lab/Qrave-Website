"use client";

import { useEffect, useState } from 'react';
import { Check, Loader2, ArrowUpRight, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

/*
 * Design concept: the form is a kitchen order ticket.
 * Qrave sends guest orders to the kitchen as tickets, so a demo request
 * arrives the same way: a paper ticket with a perforation, a printed time,
 * and fields filled in like a guest check (underline only).
 * The ticket is the one expressive element; everything around it is quiet.
 */

const points = [
  {
    title: 'Same-Day Setup',
    body: 'Get your digital QR menus and POS live in under 24 hours with zero hardware friction.',
  },
  {
    title: '99.9% Reliable Uptime',
    body: 'Built on enterprise cloud infrastructure to handle peak weekend dinner rushes effortlessly.',
  },
  {
    title: '24/7 Dedicated Support',
    body: 'Direct phone & WhatsApp support whenever your kitchen or floor staff needs assistance.',
  },
];

const PAGE_BG = '#FAF9F6';

/** Sawtooth tear-off edge, drawn in the paper colour. */
const tearEdge: React.CSSProperties = {
  height: 10,
  backgroundImage:
    'linear-gradient(135deg, #fff 5px, transparent 0), linear-gradient(225deg, #fff 5px, transparent 0)',
  backgroundSize: '10px 10px',
  backgroundRepeat: 'repeat-x',
  backgroundPosition: 'left top',
};

const lineInput =
  'w-full border-0 border-b bg-transparent px-0 py-2 text-lg text-slate-950 placeholder:text-slate-300 transition-colors focus:outline-none focus:border-b-2 focus:pb-[7px]';

interface FieldProps {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  children: (props: { id: string; className: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => React.ReactNode;
}

const Field = ({ id, label, optional, error, children }: FieldProps) => (
  <div>
    <label htmlFor={id} className="block text-sm text-slate-600">
      {label}
      {optional && <span className="ml-1.5 text-slate-400">(optional)</span>}
    </label>
    {children({
      id,
      className: `${lineInput} ${
        error
          ? 'border-rose-600 focus:border-rose-600'
          : 'border-slate-300 hover:border-slate-500 focus:border-[#fe5c13]'
      }`,
      'aria-invalid': !!error,
      'aria-describedby': error ? `${id}-error` : undefined,
    })}
    {error && (
      <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-rose-700">
        {error}
      </p>
    )}
  </div>
);

const formatNow = () => {
  const d = new Date();
  const day = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day}, ${time}`;
};

const DemoForm = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [printedAt, setPrintedAt] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    restaurantName: '',
    website: '',
  });

  // Printed time is client-only so server and client markup never disagree.
  useEffect(() => {
    setPrintedAt(formatNow());
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Please fill out your full name.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Please fill out your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Please fill out your phone number.';
    } else if (formData.phone.trim().length < 7) {
      newErrors.phone = 'Please enter a valid phone number.';
    }

    if (!formData.restaurantName.trim()) {
      newErrors.restaurantName = 'Please fill out your restaurant name.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!validateForm()) {
      toast.error('Please complete all required fields.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, source: typeof window !== 'undefined' ? window.location.pathname : '' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Something went wrong. Please try again.');
      }

      setIsSubmitted(true);
      setErrors({});
      setFormData({ name: '', phone: '', email: '', city: '', restaurantName: '', website: '' });
      toast.success('Callback request submitted successfully!');
    } catch (err: any) {
      // Never pretend the lead was captured: keep the form filled so they can retry.
      const message = err?.message || 'Something went wrong. Please try again.';
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fieldName = e.target.name;
    setFormData({
      ...formData,
      [fieldName]: e.target.value,
    });

    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: '' }));
    }
  };

  return (
    <section id="demo" className="bg-[#FAF9F6] text-slate-900 py-24 lg:py-32 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-14 lg:gap-8 items-start">
        {/* Left: pitch */}
        <div className="lg:col-span-5 flex flex-col lg:self-stretch">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-[-0.03em] leading-[1.1] text-slate-950 text-balance">
            Book a demo
          </h2>
          <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-[44ch]">
            Book a personalized walkthrough with our specialists and discover how Qrave boosts order speeds and table turnover.
          </p>

          <ul className="mt-10 space-y-6">
            {points.map((p) => (
              <li key={p.title} className="flex items-start gap-3">
                <Check className="mt-1 h-4 w-4 shrink-0 text-[#fe5c13]" strokeWidth={2.5} aria-hidden />
                <div>
                  <h3 className="text-base font-semibold text-slate-950">{p.title}</h3>
                  <p className="mt-1 text-[15px] text-slate-600 leading-relaxed max-w-[46ch]">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>

          <dl className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 lg:mt-auto">
            <div>
              <dt className="text-sm text-slate-500">Direct line</dt>
              <dd className="mt-1">
                <a
                  href="tel:+919876543210"
                  className="group inline-flex items-center gap-1 font-medium text-slate-950 hover:text-[#c2410c] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fe5c13] rounded-sm"
                >
                  +91 98765 43210
                  <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Email support</dt>
              <dd className="mt-1">
                <a
                  href="mailto:support@qravetech.in"
                  className="group inline-flex items-center gap-1 font-medium text-slate-950 hover:text-[#c2410c] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fe5c13] rounded-sm"
                >
                  support@qravetech.in
                  <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                </a>
              </dd>
            </div>
          </dl>
        </div>

        {/* Right: the ticket */}
        <div className="lg:col-span-7 lg:pl-10 xl:pl-16">
          <div className="max-w-xl mx-auto lg:mx-0 [filter:drop-shadow(0_1px_1px_rgba(15,17,23,0.06))_drop-shadow(0_18px_28px_rgba(15,17,23,0.08))]">
            <div className="relative overflow-hidden rounded-t-xl bg-white">
              {/* Ticket header */}
              <div className="flex items-baseline justify-between gap-4 px-6 sm:px-9 pt-7 pb-6 font-mono text-sm text-slate-600">
                <span className="font-medium text-slate-950">Callback request</span>
                <time className="tabular-nums" suppressHydrationWarning>
                  {printedAt || ' '}
                </time>
              </div>

              {/* Perforation with notches */}
              <div className="relative h-0 border-t-2 border-dashed border-slate-300" aria-hidden>
                <span
                  className="absolute -left-3 -top-3 h-6 w-6 rounded-full"
                  style={{ backgroundColor: PAGE_BG }}
                />
                <span
                  className="absolute -right-3 -top-3 h-6 w-6 rounded-full"
                  style={{ backgroundColor: PAGE_BG }}
                />
              </div>

              {isSubmitted ? (
                <div role="status" className="px-6 sm:px-9 py-12">
                  <p className="demo-stamp inline-block rounded-md border-2 border-emerald-700 px-4 py-1.5 font-mono text-lg font-medium text-emerald-700">
                    Received
                  </p>
                  <h3 className="mt-7 text-2xl font-semibold tracking-[-0.02em] text-slate-950">
                    We&rsquo;ve got your request
                  </h3>
                  <p className="mt-3 text-base text-slate-600 leading-relaxed max-w-[40ch]">
                    Thank you for reaching out. A Qrave specialist will get in touch with you shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSubmitted(false)}
                    className="mt-8 text-[15px] font-semibold text-slate-950 underline underline-offset-4 decoration-slate-300 hover:decoration-[#fe5c13] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fe5c13] rounded-sm"
                  >
                    Submit another request
                  </button>
                </div>
              ) : (
                <form noValidate onSubmit={handleSubmit} className="relative grid gap-7 px-6 sm:px-9 pt-8 pb-9">
                  <Field id="demo-name" label="Full name" error={errors.name}>
                    {(p) => (
                      <input {...p} type="text" name="name" autoComplete="name" value={formData.name} onChange={handleChange} />
                    )}
                  </Field>

                  <div className="grid gap-7 sm:grid-cols-2 sm:gap-6">
                    <Field id="demo-email" label="Email address" error={errors.email}>
                      {(p) => (
                        <input
                          {...p}
                          type="email"
                          name="email"
                          autoComplete="email"
                          placeholder="name@restaurant.com"
                          value={formData.email}
                          onChange={handleChange}
                        />
                      )}
                    </Field>
                    <Field id="demo-phone" label="Phone number" error={errors.phone}>
                      {(p) => (
                        <input
                          {...p}
                          type="tel"
                          name="phone"
                          autoComplete="tel"
                          placeholder="+91"
                          value={formData.phone}
                          onChange={handleChange}
                        />
                      )}
                    </Field>
                  </div>

                  <div className="grid gap-7 sm:grid-cols-2 sm:gap-6">
                    <Field id="demo-restaurant" label="Restaurant name" error={errors.restaurantName}>
                      {(p) => (
                        <input
                          {...p}
                          type="text"
                          name="restaurantName"
                          autoComplete="organization"
                          value={formData.restaurantName}
                          onChange={handleChange}
                        />
                      )}
                    </Field>
                    <Field id="demo-city" label="City" optional>
                      {(p) => (
                        <input
                          {...p}
                          type="text"
                          name="city"
                          autoComplete="address-level2"
                          placeholder="Mumbai"
                          value={formData.city}
                          onChange={handleChange}
                        />
                      )}
                    </Field>
                  </div>

                  {/* Honeypot: hidden from people, filled by bots */}
                  <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                    <label>
                      Website
                      <input type="text" name="website" tabIndex={-1} autoComplete="off" value={formData.website} onChange={handleChange} />
                    </label>
                  </div>

                  {errorMsg && (
                    <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                      {errorMsg}
                    </p>
                  )}

                  <div className="flex flex-col gap-4">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#fe5c13] px-6 py-4 text-base font-semibold text-slate-950 transition-colors hover:bg-[#ff7433] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          Sending&hellip;
                        </>
                      ) : (
                        <>
                          Request a callback
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </>
                      )}
                    </button>

                    <p className="text-sm text-slate-500 text-center">
                      By submitting, you agree to our{' '}
                      <Link href="/privacy" className="font-medium text-slate-800 underline underline-offset-2 hover:text-[#c2410c]">
                        Privacy Policy
                      </Link>{' '}
                      and{' '}
                      <Link href="/terms" className="font-medium text-slate-800 underline underline-offset-2 hover:text-[#c2410c]">
                        Terms of Service
                      </Link>
                      .
                    </p>
                  </div>
                </form>
              )}
            </div>

            {/* Torn paper edge */}
            <div aria-hidden style={tearEdge} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default DemoForm;
