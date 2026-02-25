import Link from 'next/link';

const Footer = () => {
  const legalLinks = [
    { name: 'Privacy Policy', href: '/#privacy' },
    { name: 'Terms of Service', href: '/#terms' },
    { name: 'Cookie Policy', href: '/#cookies' },
    { name: 'Refund Policy', href: '/#refund' },
    { name: 'FAQ', href: '/#faq' },
    { name: 'Contact', href: '/#contact' },
  ];

  return (
    <footer className="bg-[#1F2127] text-white py-8 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">

          {/* Left: Logo */}
          <div className="flex justify-center md:justify-start flex-1">
            <Link href="/" className="inline-block hover:opacity-90 transition-opacity">
              <span className="text-xl font-black tracking-[0.1em] border-b-2 border-transparent pb-1">
                QR<span className="text-[#FFC529]">A</span>VE
              </span>
            </Link>
          </div>

          {/* Center: Copyright */}
          <div className="flex justify-center flex-1">
            <p className="text-xs font-medium text-gray-500 tracking-wide text-center">
              © {new Date().getFullYear()} QRave. All rights reserved.
            </p>
          </div>

          {/* Right: Links */}
          <div className="flex justify-center md:justify-end gap-4 lg:gap-6 flex-wrap lg:flex-nowrap flex-1">
            {legalLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-xs font-medium text-gray-400 hover:text-[#FFC529] transition-colors whitespace-nowrap"
              >
                {link.name}
              </Link>
            ))}
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
