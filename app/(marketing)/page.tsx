import Navbar from './_sections/Navbar';
import Hero from './_sections/Hero';
import TrustedBy from './_sections/TrustedBy';
import SmartFeatures from './_sections/SmartFeatures';
import Pricing from './_sections/Pricing';
import AppMarketplace from './_sections/AppMarketplace';
import OutletTypes from './_sections/OutletTypes';
import AboutUs from './_sections/AboutUs';
import CtaBanner from './_sections/CtaBanner';
import DemoForm from './_sections/DemoForm';
import Footer from './_sections/Footer';

export default function Home() {
    return (
        <div className="min-h-screen bg-white overflow-x-hidden">
            <Navbar />
            <main>
                <Hero />
                <TrustedBy />
                <SmartFeatures />
                <Pricing />
                <AppMarketplace />
                <OutletTypes />
                <AboutUs />
                <CtaBanner />
                <DemoForm />
            </main>
            <Footer />
        </div>
    );
}

