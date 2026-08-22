import Navbar from './_sections/Navbar';
import Hero from './_sections/Hero';
import TrustedBy from './_sections/TrustedBy';
import SmartFeatures from './_sections/SmartFeatures';
import AppMarketplace from './_sections/AppMarketplace';
import OutletTypes from './_sections/OutletTypes';
import CtaBanner from './_sections/CtaBanner';
import DemoForm from './_sections/DemoForm';
import Footer from './_sections/Footer';
import GsapReveal from './_components/GsapReveal';

export default function Home() {
    return (
        <div className="min-h-screen bg-white overflow-x-hidden">
            <Navbar />
            <main>
                <Hero />
                <GsapReveal delay={0.05} direction="up">
                    <TrustedBy />
                </GsapReveal>
                <GsapReveal delay={0.1} direction="up">
                    <SmartFeatures />
                </GsapReveal>
                <GsapReveal delay={0.1} direction="up">
                    <AppMarketplace />
                </GsapReveal>
                <GsapReveal delay={0.1} direction="up">
                    <OutletTypes />
                </GsapReveal>
                <GsapReveal delay={0.1} direction="up">
                    <CtaBanner />
                </GsapReveal>
                <GsapReveal delay={0.1} direction="up">
                    <DemoForm />
                </GsapReveal>
            </main>
            <Footer />
        </div>
    );
}
