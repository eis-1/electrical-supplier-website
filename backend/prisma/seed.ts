import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin users with different roles
  const seedPassword =
    process.env.SEED_ADMIN_PASSWORD ||
    (process.env.NODE_ENV === 'production' ? '' : 'admin123');

  if (!seedPassword) {
    throw new Error(
      'SEED_ADMIN_PASSWORD is required when running seed in production. Refusing to seed a default password.',
    );
  }

  const hashedPassword = await bcrypt.hash(seedPassword, 10);

  const superadmin = await prisma.admin.upsert({
    where: { email: 'superadmin@electricalsupplier.com' },
    update: {},
    create: {
      email: 'superadmin@electricalsupplier.com',
      password: hashedPassword,
      name: 'Super Administrator',
      role: 'superadmin',
      isActive: true,
    },
  });

  const admin = await prisma.admin.upsert({
    where: { email: 'admin@electricalsupplier.com' },
    update: {},
    create: {
      email: 'admin@electricalsupplier.com',
      password: hashedPassword,
      name: 'Content Administrator',
      role: 'admin',
      isActive: true,
    },
  });

  const editor = await prisma.admin.upsert({
    where: { email: 'editor@electricalsupplier.com' },
    update: {},
    create: {
      email: 'editor@electricalsupplier.com',
      password: hashedPassword,
      name: 'Content Editor',
      role: 'editor',
      isActive: true,
    },
  });

  const viewer = await prisma.admin.upsert({
    where: { email: 'viewer@electricalsupplier.com' },
    update: {},
    create: {
      email: 'viewer@electricalsupplier.com',
      password: hashedPassword,
      name: 'Content Viewer',
      role: 'viewer',
      isActive: true,
    },
  });

  console.log('✓ Admin users created:');
  console.log('  - Superadmin:', superadmin.email);
  console.log('  - Admin:', admin.email);
  console.log('  - Editor:', editor.email);
  console.log('  - Viewer:', viewer.email);
  console.log('ℹ️  Seed password is set via SEED_ADMIN_PASSWORD (development may default to a simple password).');

  // Create categories
  const categories = [
    {
      name: 'Cables & Wires',
      slug: 'cables-wires',
      description: 'All types of electrical cables and wires',
      displayOrder: 1,
    },
    {
      name: 'Switches & Sockets',
      slug: 'switches-sockets',
      description: 'Modular switches, sockets, and accessories',
      displayOrder: 2,
    },
    {
      name: 'Circuit Breakers',
      slug: 'circuit-breakers',
      description: 'MCB, MCCB, RCCB, and other protection devices',
      displayOrder: 3,
    },
    {
      name: 'Lighting Solutions',
      slug: 'lighting-solutions',
      description: 'LED lights, fixtures, and accessories',
      displayOrder: 4,
    },
    {
      name: 'Distribution Boards',
      slug: 'distribution-boards',
      description: 'DB boxes, enclosures, and panels',
      displayOrder: 5,
    },
    {
      name: 'Industrial Controls',
      slug: 'industrial-controls',
      description: 'Contactors, relays, timers, and control gear',
      displayOrder: 6,
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  console.log(`✓ ${categories.length} categories created`);

  // Create brands
  const brands = [
    {
      name: 'Siemens',
      slug: 'siemens',
      description: 'German engineering excellence in electrical products',
      isAuthorized: true,
      displayOrder: 1,
    },
    {
      name: 'Schneider Electric',
      slug: 'schneider-electric',
      description: 'Global specialist in energy management',
      isAuthorized: true,
      displayOrder: 2,
    },
    {
      name: 'ABB',
      slug: 'abb',
      description: 'Leading technology company in electrification and automation',
      isAuthorized: true,
      displayOrder: 3,
    },
    {
      name: 'Legrand',
      slug: 'legrand',
      description: 'Global specialist in electrical and digital infrastructure',
      isAuthorized: true,
      displayOrder: 4,
    },
    {
      name: 'Havells',
      slug: 'havells',
      description: 'Leading electrical equipment company',
      isAuthorized: true,
      displayOrder: 5,
    },
    {
      name: 'Polycab',
      slug: 'polycab',
      description: 'Trusted name in wires and cables',
      isAuthorized: true,
      displayOrder: 6,
    },
  ];

  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {},
      create: brand,
    });
  }

  console.log(`✓ ${brands.length} brands created`);

  // Get created categories and brands for products
  const cablesCategory = await prisma.category.findUnique({ where: { slug: 'cables-wires' } });
  const switchesCategory = await prisma.category.findUnique({ where: { slug: 'switches-sockets' } });
  const breakersCategory = await prisma.category.findUnique({ where: { slug: 'circuit-breakers' } });
  const lightingCategory = await prisma.category.findUnique({ where: { slug: 'lighting-solutions' } });
  const dbCategory = await prisma.category.findUnique({ where: { slug: 'distribution-boards' } });
  const controlsCategory = await prisma.category.findUnique({ where: { slug: 'industrial-controls' } });

  const siemens = await prisma.brand.findUnique({ where: { slug: 'siemens' } });
  const schneider = await prisma.brand.findUnique({ where: { slug: 'schneider-electric' } });
  const abb = await prisma.brand.findUnique({ where: { slug: 'abb' } });
  const legrand = await prisma.brand.findUnique({ where: { slug: 'legrand' } });
  const havells = await prisma.brand.findUnique({ where: { slug: 'havells' } });
  const polycab = await prisma.brand.findUnique({ where: { slug: 'polycab' } });

  // Create products
  const products = [
    // Cables & Wires (8 products)
    {
      name: 'PVC Insulated Copper Wire',
      slug: 'pvc-insulated-copper-wire-1-5-sqmm',
      model: 'FR-1.5',
      categoryId: cablesCategory?.id,
      brandId: polycab?.id,
      description: 'Flame retardant PVC insulated copper conductor wire for domestic and commercial wiring',
      keyFeatures: 'ISI marked, 1100V grade, 99.97% pure copper, flame retardant',
      isFeatured: true,
      specs: [
        { specKey: 'Size', specValue: '1.5 sq mm' },
        { specKey: 'Voltage Rating', specValue: '1100V' },
        { specKey: 'Conductor Material', specValue: 'Electrolytic Grade Copper' },
        { specKey: 'Insulation', specValue: 'PVC FR' },
        { specKey: 'Standard', specValue: 'IS 694:2010' },
      ],
    },
    {
      name: 'Armoured Power Cable',
      slug: 'armoured-power-cable-3-5-core',
      model: 'LT-XLPE-3C',
      categoryId: cablesCategory?.id,
      brandId: polycab?.id,
      description: 'XLPE insulated, steel wire armoured power cable for underground and outdoor installations',
      keyFeatures: 'Weather resistant, UV protected, high tensile strength',
      isFeatured: false,
      specs: [
        { specKey: 'Size', specValue: '3.5 Core x 10 sq mm' },
        { specKey: 'Voltage Rating', specValue: '1.1 kV' },
        { specKey: 'Insulation', specValue: 'XLPE' },
        { specKey: 'Armour', specValue: 'Galvanized Steel Wire' },
        { specKey: 'Standard', specValue: 'IS 1554 Part 1' },
      ],
    },
    {
      name: 'Flexible Copper Cable',
      slug: 'flexible-copper-cable-multicore',
      model: 'FC-4C-2.5',
      categoryId: cablesCategory?.id,
      brandId: havells?.id,
      description: 'Multi-core flexible copper cable ideal for machinery and panel wiring',
      keyFeatures: 'High flexibility, abrasion resistant, oil resistant',
      isFeatured: false,
      specs: [
        { specKey: 'Cores', specValue: '4 Core' },
        { specKey: 'Size', specValue: '2.5 sq mm each' },
        { specKey: 'Voltage', specValue: '650/1000V' },
        { specKey: 'Stranding', specValue: 'Class 5 (Flexible)' },
      ],
    },

    // Switches & Sockets (6 products)
    {
      name: 'Modular Switch 1 Way',
      slug: 'modular-switch-1-way-white',
      model: 'ZEN-W-16A',
      categoryId: switchesCategory?.id,
      brandId: legrand?.id,
      description: 'Premium modular switch with sleek design, suitable for modern homes and offices',
      keyFeatures: 'ISI marked, 16A rating, polycarbonate body, elegant white finish',
      isFeatured: true,
      specs: [
        { specKey: 'Rating', specValue: '16A, 240V' },
        { specKey: 'Type', specValue: '1 Way' },
        { specKey: 'Material', specValue: 'Polycarbonate' },
        { specKey: 'Color', specValue: 'White' },
        { specKey: 'Standard', specValue: 'IS 3854' },
      ],
    },
    {
      name: '3-Pin Socket with Shutter',
      slug: '3-pin-socket-universal-shutter',
      model: 'MYRIUS-16A-S',
      categoryId: switchesCategory?.id,
      brandId: havells?.id,
      description: 'Universal 3-pin socket with child safety shutter mechanism',
      keyFeatures: 'Child safe, universal pin configuration, brass terminals',
      isFeatured: false,
      specs: [
        { specKey: 'Rating', specValue: '16A, 240V' },
        { specKey: 'Pin Type', specValue: 'Universal 5/6A + 16A' },
        { specKey: 'Shutter', specValue: 'Yes' },
        { specKey: 'Terminals', specValue: 'Nickel Plated Brass' },
      ],
    },
    {
      name: 'Dimmer Switch 400W',
      slug: 'dimmer-switch-rotary-400w',
      model: 'DIM-400R',
      categoryId: switchesCategory?.id,
      brandId: legrand?.id,
      description: 'Rotary dimmer switch for controlling light intensity',
      keyFeatures: 'Smooth dimming, 400W capacity, LED compatible',
      isFeatured: false,
      specs: [
        { specKey: 'Load Capacity', specValue: '400W' },
        { specKey: 'Type', specValue: 'Rotary' },
        { specKey: 'Compatible', specValue: 'Incandescent, Halogen, Dimmable LED' },
      ],
    },

    // Circuit Breakers (8 products)
    {
      name: 'Miniature Circuit Breaker (MCB)',
      slug: 'mcb-32a-c-curve-single-pole',
      model: '5SL6132-7',
      categoryId: breakersCategory?.id,
      brandId: siemens?.id,
      description: 'Single pole MCB with 32A rating, C-curve characteristic for domestic protection',
      keyFeatures: 'High breaking capacity 10kA, compact design, quick installation',
      isFeatured: true,
      specs: [
        { specKey: 'Poles', specValue: 'Single Pole (1P)' },
        { specKey: 'Current Rating', specValue: '32A' },
        { specKey: 'Curve Type', specValue: 'C (Magnetic 5-10 In)' },
        { specKey: 'Breaking Capacity', specValue: '10 kA' },
        { specKey: 'Standard', specValue: 'IS/IEC 60898-1' },
      ],
    },
    {
      name: 'Residual Current Circuit Breaker (RCCB)',
      slug: 'rccb-4-pole-40a-30ma',
      model: 'Easy9-RCCB-40A',
      categoryId: breakersCategory?.id,
      brandId: schneider?.id,
      description: '4-pole RCCB providing protection against earth leakage and electric shock',
      keyFeatures: '30mA sensitivity, AC type, wide operating temperature range',
      isFeatured: true,
      specs: [
        { specKey: 'Poles', specValue: '4 Pole' },
        { specKey: 'Rated Current', specValue: '40A' },
        { specKey: 'Sensitivity', specValue: '30 mA' },
        { specKey: 'Type', specValue: 'AC' },
        { specKey: 'Standard', specValue: 'IEC 61008-1' },
      ],
    },
    {
      name: 'Moulded Case Circuit Breaker (MCCB)',
      slug: 'mccb-3-pole-100a-adjustable',
      model: 'S203-C100',
      categoryId: breakersCategory?.id,
      brandId: abb?.id,
      description: 'Industrial grade MCCB with thermal-magnetic trip, adjustable overload protection',
      keyFeatures: '100A frame, 36kA breaking capacity, adjustable trip settings',
      isFeatured: false,
      specs: [
        { specKey: 'Poles', specValue: '3 Pole' },
        { specKey: 'Frame Rating', specValue: '100A' },
        { specKey: 'Breaking Capacity', specValue: '36 kA at 415V' },
        { specKey: 'Trip Type', specValue: 'Thermal-Magnetic' },
      ],
    },

    // Lighting Solutions (6 products)
    {
      name: 'LED Bulb 9W Cool White',
      slug: 'led-bulb-9w-cool-white-b22',
      model: 'LEDARE-9W-CW',
      categoryId: lightingCategory?.id,
      brandId: havells?.id,
      description: 'Energy efficient 9W LED bulb with B22 base, 900 lumens output',
      keyFeatures: 'Energy saving, 50000 hrs lifespan, instant start, no flicker',
      isFeatured: true,
      specs: [
        { specKey: 'Wattage', specValue: '9W' },
        { specKey: 'Lumens', specValue: '900 lm' },
        { specKey: 'Color Temperature', specValue: '6500K (Cool White)' },
        { specKey: 'Base Type', specValue: 'B22' },
        { specKey: 'Lifespan', specValue: '50,000 hours' },
      ],
    },
    {
      name: 'LED Tube Light 18W',
      slug: 'led-tube-light-18w-4ft',
      model: 'T8-18W-4F',
      categoryId: lightingCategory?.id,
      brandId: siemens?.id,
      description: '4 feet LED tube light for commercial and industrial applications',
      keyFeatures: 'High efficacy 120 lm/W, flicker-free, direct replacement for fluorescent tubes',
      isFeatured: false,
      specs: [
        { specKey: 'Length', specValue: '4 Feet (1200mm)' },
        { specKey: 'Wattage', specValue: '18W' },
        { specKey: 'Lumens', specValue: '2160 lm' },
        { specKey: 'Type', specValue: 'T8 Retrofit' },
      ],
    },
    {
      name: 'LED Downlight 12W Round',
      slug: 'led-downlight-12w-round-recessed',
      model: 'DL-12W-RD',
      categoryId: lightingCategory?.id,
      brandId: legrand?.id,
      description: 'Slim recessed LED downlight with aluminum heat sink',
      keyFeatures: 'Cut-out 150mm, IP44 rated, dimmable option available',
      isFeatured: false,
      specs: [
        { specKey: 'Wattage', specValue: '12W' },
        { specKey: 'Cut-out Size', specValue: '150mm' },
        { specKey: 'IP Rating', specValue: 'IP44' },
        { specKey: 'Beam Angle', specValue: '120°' },
      ],
    },

    // Distribution Boards (4 products)
    {
      name: 'Distribution Board 12 Way',
      slug: 'distribution-board-12-way-metal',
      model: 'DB-12W-MCB',
      categoryId: dbCategory?.id,
      brandId: schneider?.id,
      description: 'Metal distribution board for 12 single pole MCBs with incoming terminal block',
      keyFeatures: 'Powder coated steel, DIN rail mounting, IP43 enclosure',
      isFeatured: true,
      specs: [
        { specKey: 'Type', specValue: 'Surface Mount' },
        { specKey: 'Capacity', specValue: '12 Way (Single Pole MCB)' },
        { specKey: 'Material', specValue: 'CRCA Steel' },
        { specKey: 'IP Rating', specValue: 'IP43' },
      ],
    },
    {
      name: 'Plastic Enclosure 8 Way',
      slug: 'plastic-enclosure-8-way-mcb-box',
      model: 'PE-8W-TPN',
      categoryId: dbCategory?.id,
      brandId: legrand?.id,
      description: 'Compact plastic MCB enclosure for domestic installations',
      keyFeatures: 'Flame retardant plastic, transparent door, wall mountable',
      isFeatured: false,
      specs: [
        { specKey: 'Capacity', specValue: '8 Way' },
        { specKey: 'Material', specValue: 'Polycarbonate (Flame Retardant)' },
        { specKey: 'Door', specValue: 'Transparent with Lock' },
      ],
    },

    // Industrial Controls (6 products)
    {
      name: 'Contactor 3 Pole 32A',
      slug: 'contactor-3-pole-32a-ac3',
      model: '3RT2026-1A',
      categoryId: controlsCategory?.id,
      brandId: siemens?.id,
      description: 'Industrial contactor for motor control and switching applications',
      keyFeatures: '32A AC3 rating, 24V AC coil, auxiliary contacts available',
      isFeatured: true,
      specs: [
        { specKey: 'Poles', specValue: '3 Pole + 1 NO' },
        { specKey: 'AC3 Rating', specValue: '32A at 400V' },
        { specKey: 'Coil Voltage', specValue: '24V AC' },
        { specKey: 'Mechanical Life', specValue: '10 million operations' },
      ],
    },
    {
      name: 'Timer Relay ON Delay',
      slug: 'timer-relay-on-delay-0-30sec',
      model: 'RE7TL11BU',
      categoryId: controlsCategory?.id,
      brandId: schneider?.id,
      description: 'Multi-function time delay relay with adjustable ON delay',
      keyFeatures: 'Multiple timing functions, LED indication, DIN rail mount',
      isFeatured: false,
      specs: [
        { specKey: 'Timing Range', specValue: '0.1s - 30s' },
        { specKey: 'Functions', specValue: 'ON Delay, OFF Delay, Interval' },
        { specKey: 'Supply Voltage', specValue: '24-240V AC/DC' },
        { specKey: 'Contact Rating', specValue: '5A' },
      ],
    },
    {
      name: 'Thermal Overload Relay',
      slug: 'thermal-overload-relay-adjustable',
      model: 'TA25DU-12',
      categoryId: controlsCategory?.id,
      brandId: abb?.id,
      description: 'Thermal overload relay for motor protection against overload conditions',
      keyFeatures: 'Adjustable trip current, manual/auto reset, phase failure sensitive',
      isFeatured: false,
      specs: [
        { specKey: 'Setting Range', specValue: '9-12A' },
        { specKey: 'Trip Class', specValue: 'Class 10' },
        { specKey: 'Reset', specValue: 'Manual & Auto' },
        { specKey: 'Ambient Compensation', specValue: 'Yes' },
      ],
    },
  ];

  let productCount = 0;
  for (const productData of products) {
    const { specs, ...productInfo } = productData;

    await prisma.product.upsert({
      where: { slug: productInfo.slug },
      update: {},
      create: {
        ...productInfo,
        specs: specs ? {
          create: specs.map((spec, index) => ({
            ...spec,
            displayOrder: index + 1,
          })),
        } : undefined,
      },
    });
    productCount++;
  }

  console.log(`✓ ${productCount} products created with specifications`);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
