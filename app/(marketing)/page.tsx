import Navbar from './_sections/Navbar';
import Hero from './_sections/Hero';
import TrustedBy from './_sections/TrustedBy';
import SmartFeatures from './_sections/SmartFeatures';
import AppMarketplace from './_sections/AppMarketplace';
import OutletTypes from './_sections/OutletTypes';
import AboutUs from './_sections/AboutUs';
import CtaBanner from './_sections/CtaBanner';
import DemoForm from './_sections/DemoForm';
import Footer from './_sections/Footer';
import ScrollReveal from './_components/ScrollReveal';

export default function Home() {
    return (
        <div className="min-h-screen bg-white overflow-x-hidden">
            <Navbar />
            <main>
                <ScrollReveal delayMs={40} yOffset={20}>
                    <Hero />
                </ScrollReveal>
                <ScrollReveal delayMs={60}>
                    <TrustedBy />
                </ScrollReveal>
                <ScrollReveal delayMs={80}>
                    <SmartFeatures />
                </ScrollReveal>
                <ScrollReveal delayMs={120}>
                    <AppMarketplace />
                </ScrollReveal>
                <ScrollReveal delayMs={140}>
                    <OutletTypes />
                </ScrollReveal>
                <ScrollReveal delayMs={160}>
                    <AboutUs />
                </ScrollReveal>
                <ScrollReveal delayMs={180}>
                    <CtaBanner />
                </ScrollReveal>
                <ScrollReveal delayMs={200}>
                    <DemoForm />
                </ScrollReveal>
            </main>
            <Footer />
        </div>
    );
}

