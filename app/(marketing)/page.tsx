import type { Metadata } from 'next';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/app/_lib/seo';
import Navbar from './_sections/Navbar';
import Hero from './_sections/Hero';
import TrustedBy from './_sections/TrustedBy';
import SmartFeatures from './_sections/SmartFeatures';
// import AppMarketplace from './_sections/AppMarketplace';
// import OutletTypes from './_sections/OutletTypes';
import DemoForm from './_sections/DemoForm';
import Footer from './_sections/Footer';
import GsapReveal from './_components/GsapReveal';

export const metadata: Metadata = {
    title: { absolute: SITE_TITLE },
    description: SITE_DESCRIPTION,
    alternates: { canonical: '/' },
};

const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
        { '@type': 'Organization', name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/favicon.ico` },
        {
            '@type': 'SoftwareApplication',
            name: SITE_NAME,
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description: SITE_DESCRIPTION,
            url: SITE_URL,
        },
    ],
};

export default function Home() {
    return (
        <div className="min-h-screen bg-white overflow-x-clip">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
            />
            <Navbar />
            <main>
                <Hero />
                <GsapReveal delay={0.05} direction="up">
                    <TrustedBy />
                </GsapReveal>
                <GsapReveal delay={0.1} direction="up">
                    <SmartFeatures />
                </GsapReveal>
                {/* Ecosystem add-ons section hidden for now
                <GsapReveal delay={0.1} direction="up">
                    <AppMarketplace />
                </GsapReveal>
                */}
                {/* Outlet types section hidden for now
                <GsapReveal delay={0.1} direction="up">
                    <OutletTypes />
                </GsapReveal>
                */}
                <GsapReveal delay={0.1} direction="up">
                    <DemoForm />
                </GsapReveal>
            </main>
            <Footer />
        </div>
    );
}
