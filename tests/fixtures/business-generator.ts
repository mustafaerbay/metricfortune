/**
 * Business Generator for Test Data
 * Generates realistic business profiles with variety for testing
 */

import { nanoid } from 'nanoid';

export interface GeneratedBusiness {
  userId: string;
  user: {
    email: string;
    passwordHash: string;
    emailVerified: boolean;
  };
  business: {
    name: string;
    industry: string;
    revenueRange: string;
    productTypes: string[];
    platform: string;
    siteId: string;
  };
}

// Industry categories with representative business names
const INDUSTRIES = [
  {
    name: 'fashion',
    businesses: ['StyleHub Fashion', 'Trendy Threads Co', 'Urban Apparel Store'],
    productTypes: ['clothing', 'accessories', 'shoes'],
  },
  {
    name: 'electronics',
    businesses: ['TechGear Pro', 'Digital Gadgets Hub', 'ElectroMart'],
    productTypes: ['computers', 'smartphones', 'accessories'],
  },
  {
    name: 'home-goods',
    businesses: ['Cozy Home Decor', 'Modern Living Store', 'HomeStyle Essentials'],
    productTypes: ['furniture', 'decor', 'kitchen'],
  },
  {
    name: 'beauty',
    businesses: ['Beauty Bliss', 'Natural Glow Co', 'Glamour Cosmetics'],
    productTypes: ['skincare', 'makeup', 'haircare'],
  },
  {
    name: 'sports',
    businesses: ['Active Gear Pro', 'FitLife Equipment', 'Sports Haven'],
    productTypes: ['equipment', 'apparel', 'accessories'],
  },
];

// Revenue ranges (aligned with business profile options)
const REVENUE_RANGES = [
  '500K-1M',
  '1M-5M',
  '5M-10M',
  '10M-50M',
];

// E-commerce platforms
const PLATFORMS = [
  'Shopify',
  'WooCommerce',
  'Other',
];

/**
 * Generate a single realistic business profile
 */
export function generateBusiness(options?: {
  industry?: string;
  revenueRange?: string;
  platform?: string;
  siteIdPrefix?: string;
}): GeneratedBusiness {
  // Select or use provided industry
  const industryData = options?.industry
    ? INDUSTRIES.find((i) => i.name === options.industry) || INDUSTRIES[0]
    : INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)];

  const businessName =
    industryData.businesses[
      Math.floor(Math.random() * industryData.businesses.length)
    ];

  // Select 1-3 product types from the industry
  const numProductTypes = Math.floor(Math.random() * 3) + 1;
  const productTypes = industryData.productTypes
    .sort(() => Math.random() - 0.5)
    .slice(0, numProductTypes);

  const revenueRange =
    options?.revenueRange ||
    REVENUE_RANGES[Math.floor(Math.random() * REVENUE_RANGES.length)];

  const platform =
    options?.platform ||
    PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];

  const userId = `test_user_${nanoid(10)}`;
  const siteId = options?.siteIdPrefix
    ? `${options.siteIdPrefix}_${nanoid(10)}`
    : `test_site_${nanoid(10)}`;

  return {
    userId,
    user: {
      email: `${businessName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      passwordHash: '$2a$10$dummyHashForTestingPurposesOnly1234567890', // Dummy bcrypt hash
      emailVerified: true,
    },
    business: {
      name: businessName,
      industry: industryData.name,
      revenueRange,
      productTypes,
      platform,
      siteId,
    },
  };
}

/**
 * Generate multiple businesses with variety
 */
export function generateBusinesses(count: number = 10): GeneratedBusiness[] {
  const businesses: GeneratedBusiness[] = [];

  // Ensure variety across industries
  for (let i = 0; i < count; i++) {
    const industryIndex = i % INDUSTRIES.length;
    const revenueIndex = Math.floor(i / INDUSTRIES.length) % REVENUE_RANGES.length;
    const platformIndex = i % PLATFORMS.length;

    businesses.push(
      generateBusiness({
        industry: INDUSTRIES[industryIndex].name,
        revenueRange: REVENUE_RANGES[revenueIndex],
        platform: PLATFORMS[platformIndex],
        siteIdPrefix: `test${i + 1}`,
      })
    );
  }

  return businesses;
}

/**
 * Generate a specific business profile for testing specific scenarios
 */
export function generateSpecificBusiness(
  industry: string,
  revenueRange: string,
  platform: string,
  name?: string
): GeneratedBusiness {
  const business = generateBusiness({ industry, revenueRange, platform });

  if (name) {
    business.business.name = name;
    business.user.email = `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`;
  }

  return business;
}

/**
 * Get all available industries
 */
export function getAvailableIndustries(): string[] {
  return INDUSTRIES.map((i) => i.name);
}

/**
 * Get all available revenue ranges
 */
export function getAvailableRevenueRanges(): string[] {
  return REVENUE_RANGES;
}

/**
 * Get all available platforms
 */
export function getAvailablePlatforms(): string[] {
  return PLATFORMS;
}
