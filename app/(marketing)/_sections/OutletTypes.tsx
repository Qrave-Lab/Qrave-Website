const OutletTypes = () => {
  const outlets = [
    { name: 'Food courts & canteens', image: '/landing/outlet-foodcourt.png' },
    { name: 'Cafe', image: '/landing/outlet-cafe.png' },
    { name: 'Fine dine', image: '/landing/outlet-finedine.png' },
    { name: 'Bar & brewery', image: '/landing/outlet-bar.png' },
    { name: 'Pizzeria', image: '/landing/outlet-pizzeria.png' },
    { name: 'QSR', image: '/landing/outlet-qsr.png' },
    { name: 'Desserts', image: '/landing/outlet-desserts.png' },
    { name: 'Large chains', image: '/landing/outlet-largechains.png' },
    { name: 'Bakery', image: '/landing/outlet-bakery.png' },
    { name: 'Cloud kitchens', image: '/landing/outlet-cloudkitchen.png' },
  ];

  return (
    <section className="py-24 lg:py-32 bg-white relative overflow-hidden">
      <div className="section-padding max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 lg:mb-24">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[#1F2127] tracking-tight mb-6 sm:mb-8 leading-[1.1]">
            Engineered for Every
            <br />
            <span className="text-[#FFC529]">Culinary Concept</span>
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-500 font-medium max-w-3xl mx-auto">
            From intimate 20-seat cafés to bustling multi-location restaurants, Qrave's modular architecture adapts perfectly to your unique operational flow.
          </p>
        </div>

        {/* Outlet Types Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          {outlets.map((outlet) => (
            <a
              key={outlet.name}
              href={`#${outlet.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}`}
              className="group relative overflow-hidden rounded-2xl aspect-[4/3] border border-gray-100 shadow-sm hover:shadow-md hover:border-[#FFC529]/50 transition-shadow duration-200"
            >
              <div className="absolute inset-0 bg-gray-100" />
              <img
                src={outlet.image}
                alt={outlet.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1F2127]/90 via-[#1F2127]/30 to-transparent" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-5">
                <h3 className="text-white font-bold text-sm sm:text-base lg:text-lg group-hover:text-[#FFC529] transition-colors duration-200">
                  {outlet.name}
                </h3>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OutletTypes;
