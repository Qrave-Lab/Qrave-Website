import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import { FEATURE_SLUGS } from '../../_lib/featureSlugs';
import { featureData } from '../../_data/features';
import Navbar from '../../_sections/Navbar';
import Footer from '../../_sections/Footer';
import CapabilityIndex from './CapabilityIndex';

const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fe5c13] rounded-sm';

export function generateStaticParams() {
    return FEATURE_SLUGS.map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const feature = featureData[id];
    if (!feature) return { title: 'Feature not found', robots: { index: false } };
    const description = String(feature.subtext).slice(0, 160).replace(/\s+\S*$/, '…');
    return {
        title: feature.title,
        description,
        alternates: { canonical: `/feature/${id}` },
        openGraph: { type: 'article', url: `/feature/${id}`, title: feature.title, description },
        twitter: { card: 'summary_large_image', title: feature.title, description },
    };
}

const FeatureDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const feature = id ? featureData[id] : null;
    if (!feature) notFound();

    const capabilities = feature.subFeatures.map((sf) => ({ ...sf, id: slugify(sf.title) }));

    // Next three features after this one, wrapping around.
    const at = FEATURE_SLUGS.indexOf(id as (typeof FEATURE_SLUGS)[number]);
    const related = [1, 2, 3].map((n) => FEATURE_SLUGS[(at + n) % FEATURE_SLUGS.length]);

    return (
        <div className="min-h-screen bg-[#FAF9F6] text-slate-900 overflow-x-clip selection:bg-[#fe5c13]/25">
            <Navbar />

            <main className="pt-28 lg:pt-36">
                {/* Hero: the headline is the memorable element */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 lg:pb-24">
                    <Link
                        href="/#features"
                        className={`feature-rise inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950 transition-colors mb-10 lg:mb-14 ${focusRing}`}
                    >
                        <ArrowLeft className="w-4 h-4" aria-hidden />
                        All features
                    </Link>

                    <h1
                        className="feature-rise text-5xl sm:text-6xl lg:text-7xl xl:text-[5.5rem] font-semibold text-slate-950 tracking-[-0.035em] leading-[1.04] text-balance max-w-5xl"
                        style={{ animationDelay: '60ms' }}
                    >
                        {feature.title}
                    </h1>

                    <div
                        className="feature-rise mt-10 lg:mt-14 grid lg:grid-cols-12 gap-8 lg:gap-8 items-start"
                        style={{ animationDelay: '150ms' }}
                    >
                        <p className="lg:col-span-6 text-lg lg:text-xl text-slate-600 leading-relaxed max-w-[62ch]">
                            {feature.subtext}
                        </p>

                        <div className="lg:col-span-5 lg:col-start-8 flex flex-col sm:flex-row gap-3 lg:justify-end">
                            <a
                                href="/#demo"
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#fe5c13] px-6 py-3.5 text-[15px] font-semibold text-slate-950 transition-colors hover:bg-[#ff7433] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                            >
                                Book a demo
                                <ArrowRight className="w-4 h-4" aria-hidden />
                            </a>
                            <Link
                                href="/#features"
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-slate-300 px-6 py-3.5 text-[15px] font-semibold text-slate-900 transition-colors hover:border-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                            >
                                Explore all features
                            </Link>
                        </div>
                    </div>

                    {/* Capabilities at a glance */}
                    <nav
                        aria-label="Capabilities"
                        className="feature-rise mt-14 lg:mt-20"
                        style={{ animationDelay: '240ms' }}
                    >
                        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 border-t border-slate-300">
                            {capabilities.map((c) => (
                                <li key={c.id} className="border-b border-slate-200 sm:border-b-0">
                                    <a
                                        href={`#${c.id}`}
                                        className={`group flex items-center justify-between gap-4 py-5 sm:pr-8 text-base font-medium text-slate-900 hover:text-[#c2410c] transition-colors ${focusRing}`}
                                    >
                                        {c.title}
                                        <ArrowDown
                                            className="w-4 h-4 shrink-0 text-slate-400 transition-transform group-hover:translate-y-0.5 group-hover:text-[#c2410c]"
                                            aria-hidden
                                        />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </section>

                {/* Capabilities */}
                <section className="border-t border-slate-200 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 grid lg:grid-cols-12 gap-10 lg:gap-8">
                        <div className="lg:col-span-4">
                            <div className="lg:sticky lg:top-32">
                                <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] text-slate-950 text-balance">
                                    What it does for your outlet
                                </h2>
                                <div className="hidden lg:block">
                                    <CapabilityIndex items={capabilities.map(({ id, title }) => ({ id, title }))} />
                                </div>
                            </div>
                        </div>

                        <ul className="lg:col-span-8 divide-y divide-slate-200 border-y border-slate-200">
                            {capabilities.map((sf) => (
                                <li key={sf.id} id={sf.id} className="scroll-mt-28 py-10 lg:py-14">
                                    <h3 className="text-2xl lg:text-3xl font-semibold tracking-[-0.02em] text-slate-950 text-balance">
                                        {sf.title}
                                    </h3>
                                    <p className="mt-4 text-base lg:text-lg text-slate-600 leading-relaxed max-w-[62ch]">
                                        {sf.description}
                                    </p>

                                    {sf.stat && (
                                        <p className="mt-6 flex items-baseline gap-3">
                                            <span className="text-3xl lg:text-4xl font-semibold tracking-[-0.025em] text-[#fe5c13] tabular-nums whitespace-nowrap">
                                                {sf.stat.value}
                                            </span>
                                            <span className="text-[15px] text-slate-600">{sf.stat.label}</span>
                                        </p>
                                    )}

                                    <ul className="mt-6 grid gap-2.5">
                                        {sf.benefits.map((b) => (
                                            <li key={b} className="flex items-start gap-3 text-[15px] text-slate-800">
                                                <Check className="w-4 h-4 mt-[3px] shrink-0 text-[#fe5c13]" strokeWidth={2.5} aria-hidden />
                                                <span>{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* More features */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24">
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.025em] text-slate-950 mb-8">
                        More from Qrave
                    </h2>
                    <ul className="grid sm:grid-cols-3 gap-x-8 gap-y-2">
                        {related.map((slug) => (
                            <li key={slug}>
                                <Link
                                    href={`/feature/${slug}`}
                                    className={`group flex h-full items-start justify-between gap-4 border-t border-slate-300 pt-5 pb-4 hover:border-slate-950 transition-colors ${focusRing}`}
                                >
                                    <span className="text-lg font-semibold text-slate-950 leading-snug text-balance">
                                        {featureData[slug].title}
                                    </span>
                                    <ArrowUpRight
                                        className="w-5 h-5 shrink-0 mt-0.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-950"
                                        aria-hidden
                                    />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default FeatureDetailPage;
