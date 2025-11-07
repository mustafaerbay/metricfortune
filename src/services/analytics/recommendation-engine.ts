/**
 * Recommendation Generation Engine
 *
 * Rule-based recommendation engine that maps detected patterns to specific,
 * actionable recommendations with prioritization and peer success data.
 *
 * This is a pure business logic service with no Next.js dependencies.
 */

import { prisma } from '@/lib/prisma';
import { PatternType, PatternData } from '@/types/pattern';
import {
  RecommendationData,
  RecommendationWithScore,
  RecommendationRule,
  RecommendationGenerationOptions,
  RecommendationGenerationResult,
  PeerSuccessStats,
  ImpactLevel,
  ConfidenceLevel,
  CONVERSION_VALUE_WEIGHTS,
  mapConfidenceLevel,
  mapImpactLevel,
  calculateImpactScore,
  formatPeerSuccessData,
} from '@/types/recommendation';

/**
 * Recommendation rules mapping patterns to actionable recommendations
 * Organized by pattern type with context-specific matching
 */
const RECOMMENDATION_RULES: RecommendationRule[] = [
  // ABANDONMENT PATTERN RULES
  {
    patternType: PatternType.ABANDONMENT,
    contextMatcher: (metadata) => metadata?.stage?.toLowerCase().includes('shipping'),
    titleTemplate: 'Show shipping costs earlier in checkout',
    problemTemplate: '{{dropOffRate}}% of customers abandon during shipping step',
    actionSteps: [
      'Display estimated shipping cost on product page',
      'Add shipping calculator before checkout',
      'Show free shipping threshold in cart',
    ],
    expectedImpactTemplate: 'Reduce shipping page abandonment by 15-25%',
    conversionValue: 'HIGH',
  },
  {
    patternType: PatternType.ABANDONMENT,
    contextMatcher: (metadata) => metadata?.stage?.toLowerCase().includes('payment'),
    titleTemplate: 'Simplify payment process',
    problemTemplate: '{{dropOffRate}}% of customers abandon during payment step',
    actionSteps: [
      'Add more trusted payment badges near form',
      'Reduce required payment form fields',
      'Enable express checkout options (Apple Pay, Google Pay)',
    ],
    expectedImpactTemplate: 'Reduce payment abandonment by 10-20%',
    conversionValue: 'HIGH',
  },
  {
    patternType: PatternType.ABANDONMENT,
    contextMatcher: (metadata) => metadata?.stage?.toLowerCase().includes('product'),
    titleTemplate: 'Improve product page content',
    problemTemplate:
      '{{dropOffRate}}% of visitors leave product pages without adding to cart',
    actionSteps: [
      'Add more product images (minimum 5 angles)',
      'Enhance product descriptions with key benefits',
      'Add customer reviews and ratings prominently',
    ],
    expectedImpactTemplate: 'Increase add-to-cart rate by 8-15%',
    conversionValue: 'HIGH',
  },
  {
    patternType: PatternType.ABANDONMENT,
    contextMatcher: (metadata) => metadata?.stage?.toLowerCase().includes('cart'),
    titleTemplate: 'Optimize shopping cart experience',
    problemTemplate: '{{dropOffRate}}% of customers abandon their cart',
    actionSteps: [
      'Add urgency indicators (low stock, time-limited offers)',
      'Display clear savings summary',
      'Show free shipping threshold progress',
    ],
    expectedImpactTemplate: 'Reduce cart abandonment by 10-18%',
    conversionValue: 'HIGH',
  },

  // HESITATION PATTERN RULES
  {
    patternType: PatternType.HESITATION,
    contextMatcher: (metadata) => metadata?.field?.toLowerCase().includes('address'),
    titleTemplate: 'Add address autocomplete functionality',
    problemTemplate:
      '{{reEntryRate}}% of users re-enter address information {{avgReEntries}} times',
    actionSteps: [
      'Implement Google Places address autocomplete',
      "Add clear format examples (e.g., '123 Main St')",
      'Show real-time validation feedback',
    ],
    expectedImpactTemplate: 'Reduce form completion time by 30-40%',
    conversionValue: 'MEDIUM',
  },
  {
    patternType: PatternType.HESITATION,
    contextMatcher: (metadata) => {
      const field = metadata?.field?.toLowerCase() || '';
      return field.includes('card') || field.includes('credit');
    },
    titleTemplate: 'Improve payment field clarity',
    problemTemplate: '{{reEntryRate}}% of users struggle with payment field entry',
    actionSteps: [
      "Add input format hints (e.g., 'XXXX XXXX XXXX XXXX')",
      'Make security badge more visible near card field',
      'Enable card type auto-detection with icons',
    ],
    expectedImpactTemplate: 'Reduce payment form errors by 20-30%',
    conversionValue: 'MEDIUM',
  },
  {
    patternType: PatternType.HESITATION,
    contextMatcher: (metadata) => metadata?.field?.toLowerCase().includes('email'),
    titleTemplate: 'Optimize email input experience',
    problemTemplate: '{{reEntryRate}}% of users re-enter email address',
    actionSteps: [
      'Add inline validation with clear error messages',
      "Clarify why email is needed (e.g., 'For order confirmation')",
      'Enable email autofill hints',
    ],
    expectedImpactTemplate: 'Reduce email field errors by 15-25%',
    conversionValue: 'MEDIUM',
  },
  {
    patternType: PatternType.HESITATION,
    contextMatcher: (metadata) => metadata?.field?.toLowerCase().includes('phone'),
    titleTemplate: 'Simplify phone number entry',
    problemTemplate: '{{reEntryRate}}% of users re-enter phone number',
    actionSteps: [
      'Add phone format auto-formatting',
      "Show clear format example (e.g., '(555) 123-4567')",
      'Make phone field optional if not critical',
    ],
    expectedImpactTemplate: 'Reduce form abandonment by 8-12%',
    conversionValue: 'MEDIUM',
  },

  // LOW_ENGAGEMENT PATTERN RULES
  {
    patternType: PatternType.LOW_ENGAGEMENT,
    contextMatcher: (metadata) => metadata?.page?.includes('/product'),
    titleTemplate: 'Enhance product page engagement',
    problemTemplate:
      'Product page engagement {{engagementGap}}% below site average ({{timeOnPage}}s vs {{siteAverage}}s)',
    actionSteps: [
      'Add customer reviews and Q&A section',
      'Include video demos or 360° product views',
      'Add size guides and detailed specifications',
    ],
    expectedImpactTemplate: 'Increase time-on-page by 20-30%',
    conversionValue: 'LOW_MEDIUM',
  },
  {
    patternType: PatternType.LOW_ENGAGEMENT,
    contextMatcher: (metadata) => {
      const page = metadata?.page || '';
      return page.includes('/category') || page.includes('/collection');
    },
    titleTemplate: 'Improve category browsing experience',
    problemTemplate: 'Category page engagement {{engagementGap}}% below site average',
    actionSteps: [
      'Enhance filtering and sorting options',
      'Add product comparison feature',
      'Display better product preview images',
    ],
    expectedImpactTemplate: 'Increase product discovery by 15-20%',
    conversionValue: 'LOW_MEDIUM',
  },
  {
    patternType: PatternType.LOW_ENGAGEMENT,
    contextMatcher: (metadata) => metadata?.page?.includes('/cart'),
    titleTemplate: 'Make cart more engaging',
    problemTemplate: 'Cart page time-on-page {{engagementGap}}% below expected',
    actionSteps: [
      'Add related products or frequently bought together',
      'Show clear savings and discount summaries',
      'Add urgency indicators (limited stock, trending items)',
    ],
    expectedImpactTemplate: 'Increase cart engagement by 10-15%',
    conversionValue: 'MEDIUM',
  },

  // FALLBACK RULES (when no specific match)
  {
    patternType: PatternType.ABANDONMENT,
    contextMatcher: () => true, // Matches all ABANDONMENT patterns
    titleTemplate: 'Reduce checkout abandonment',
    problemTemplate: '{{dropOffRate}}% of customers abandon during checkout',
    actionSteps: [
      'Simplify checkout process and reduce steps',
      'Add trust signals and security badges',
      'Offer guest checkout option',
    ],
    expectedImpactTemplate: 'Reduce abandonment by 10-15%',
    conversionValue: 'HIGH',
  },
  {
    patternType: PatternType.HESITATION,
    contextMatcher: () => true, // Matches all HESITATION patterns
    titleTemplate: 'Improve form field usability',
    problemTemplate: '{{reEntryRate}}% of users struggle with form field entry',
    actionSteps: [
      'Add clear field labels and format examples',
      'Implement inline validation with helpful messages',
      'Enable autofill and autocomplete where possible',
    ],
    expectedImpactTemplate: 'Reduce form errors by 15-20%',
    conversionValue: 'MEDIUM',
  },
  {
    patternType: PatternType.LOW_ENGAGEMENT,
    contextMatcher: () => true, // Matches all LOW_ENGAGEMENT patterns
    titleTemplate: 'Increase page engagement',
    problemTemplate: 'Page engagement {{engagementGap}}% below site average',
    actionSteps: [
      'Improve content quality and visual appeal',
      'Add interactive elements (reviews, videos, comparisons)',
      'Optimize page loading speed',
    ],
    expectedImpactTemplate: 'Increase engagement by 10-20%',
    conversionValue: 'LOW_MEDIUM',
  },
];

/**
 * Interpolates template strings with actual values from pattern metadata
 */
function interpolateTemplate(template: string, metadata: any): string {
  let result = template;

  // Replace all {{variable}} placeholders
  const matches = template.match(/\{\{(\w+)\}\}/g);
  if (!matches) return result;

  matches.forEach((match) => {
    const key = match.replace(/\{\{|\}\}/g, '');
    const value = metadata?.[key];

    if (value !== undefined && value !== null) {
      // Format numbers as integers for display
      const formattedValue = typeof value === 'number' ? Math.round(value) : value;
      result = result.replace(match, String(formattedValue));
    } else {
      // Keep placeholder if value not found
      result = result.replace(match, '[data unavailable]');
    }
  });

  return result;
}

/**
 * Finds the best matching rule for a pattern
 * Tries specific rules first, falls back to general rules
 */
function findMatchingRule(pattern: PatternData): RecommendationRule | null {
  // Get all rules for this pattern type
  const rulesForType = RECOMMENDATION_RULES.filter(
    (rule) => rule.patternType === pattern.patternType
  );

  // Try specific rules first (not fallback rules)
  for (let i = 0; i < rulesForType.length - 1; i++) {
    const rule = rulesForType[i];
    if (rule.contextMatcher(pattern.metadata)) {
      return rule;
    }
  }

  // Fall back to general rule (last rule for each type)
  return rulesForType[rulesForType.length - 1] || null;
}

/**
 * Generates a single recommendation from a pattern using rule-based mapping
 */
function generateRecommendationFromPattern(
  pattern: PatternData,
  businessId: string
): RecommendationWithScore | null {
  const rule = findMatchingRule(pattern);
  if (!rule) {
    console.warn(`No matching rule found for pattern type: ${pattern.patternType}`);
    return null;
  }

  // Interpolate templates with pattern metadata
  const title = interpolateTemplate(rule.titleTemplate, pattern.metadata);
  const problemStatement = interpolateTemplate(rule.problemTemplate, pattern.metadata);
  const expectedImpact = interpolateTemplate(
    rule.expectedImpactTemplate,
    pattern.metadata
  );

  // Map confidence and impact levels
  const confidenceLevel = mapConfidenceLevel(pattern.confidenceScore);
  const impactLevel = mapImpactLevel(pattern.severity);

  // Calculate impact score for prioritization
  const impactScore = calculateImpactScore(pattern.severity, rule.conversionValue);

  return {
    businessId,
    siteId: pattern.siteId,
    title,
    problemStatement,
    actionSteps: [...rule.actionSteps], // Clone array
    expectedImpact,
    confidenceLevel,
    impactLevel,
    peerSuccessData: null, // Will be populated later if available
    impactScore,
  };
}

/**
 * Queries peer success statistics for similar recommendations
 * Returns aggregated data from businesses in the same peer group
 */
async function queryPeerSuccessData(
  businessId: string,
  recommendationTitle: string
): Promise<PeerSuccessStats | null> {
  try {
    // Get business with peer group
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        peerGroup: {
          select: {
            businessIds: true,
          },
        },
      },
    });

    if (!business?.peerGroup?.businessIds || business.peerGroup.businessIds.length <= 1) {
      return null; // No peer group or only one business in group
    }

    // Query recommendations with similar titles in peer group
    // Use fuzzy matching on title (same recommendation type)
    const peerRecommendations = await prisma.recommendation.findMany({
      where: {
        businessId: {
          in: business.peerGroup.businessIds.filter((id) => id !== businessId),
        },
        title: {
          contains: recommendationTitle.split(' ').slice(0, 3).join(' '), // First 3 words
        },
        status: 'IMPLEMENTED',
        implementedAt: {
          not: null,
        },
      },
    });

    if (peerRecommendations.length === 0) {
      return null;
    }

    // For MVP, assume positive impact (no actual impact tracking yet)
    // Story 2.6 will implement actual impact tracking
    const successRate = 0.75; // 75% success rate assumption
    const averageImprovement = 18; // 18% average improvement assumption

    return {
      similarBusinessCount: business.peerGroup.businessIds.length - 1,
      implementationCount: peerRecommendations.length,
      successRate,
      averageImprovementPercent: averageImprovement,
    };
  } catch (error) {
    console.error('Error querying peer success data:', error);
    return null;
  }
}

/**
 * Generates recommendations for a business based on detected patterns
 *
 * @param options - Configuration including siteId, businessId, and filters
 * @returns Array of prioritized recommendations (top 3-5)
 */
export async function generateRecommendations(
  options: RecommendationGenerationOptions
): Promise<RecommendationData[]> {
  const {
    siteId,
    businessId,
    analysisWindowDays = 7,
    minSeverity = 0.3,
    maxRecommendations = 5,
    includePeerData = true,
  } = options;

  console.time(`generateRecommendations-${businessId}`);

  try {
    // Query patterns from last N days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - analysisWindowDays);

    const patterns = await prisma.pattern.findMany({
      where: {
        siteId,
        detectedAt: {
          gte: cutoffDate,
        },
        severity: {
          gte: minSeverity,
        },
      },
      orderBy: {
        severity: 'desc',
      },
    });

    console.log(`Found ${patterns.length} patterns for site ${siteId}`);

    if (patterns.length === 0) {
      console.log(`No patterns detected for business ${businessId}`);
      return [];
    }

    // Convert patterns to recommendations with scores
    const recommendationsWithScores: RecommendationWithScore[] = [];

    for (const pattern of patterns) {
      const recommendation = generateRecommendationFromPattern(
        {
          siteId: pattern.siteId,
          patternType: pattern.patternType as PatternType,
          description: pattern.description,
          severity: pattern.severity,
          sessionCount: pattern.sessionCount,
          confidenceScore: pattern.confidenceScore,
          metadata: pattern.metadata as any,
        },
        businessId
      );

      if (recommendation) {
        recommendationsWithScores.push(recommendation);
      }
    }

    // Sort by impact score descending
    recommendationsWithScores.sort((a, b) => b.impactScore - a.impactScore);

    // Take top N recommendations
    const topRecommendations = recommendationsWithScores.slice(0, maxRecommendations);

    // Query peer success data for top recommendations if enabled
    if (includePeerData) {
      for (const recommendation of topRecommendations) {
        const peerStats = await queryPeerSuccessData(businessId, recommendation.title);
        recommendation.peerSuccessData = formatPeerSuccessData(peerStats);
      }
    }

    // Remove impactScore before returning (internal field)
    const finalRecommendations: RecommendationData[] = topRecommendations.map(
      ({ impactScore, ...recommendation }) => recommendation
    );

    console.log(
      `Generated ${finalRecommendations.length} recommendations for business ${businessId}`
    );
    console.timeEnd(`generateRecommendations-${businessId}`);

    return finalRecommendations;
  } catch (error) {
    console.error('Error generating recommendations:', error);
    console.timeEnd(`generateRecommendations-${businessId}`);
    throw error;
  }
}

/**
 * Stores recommendations in the database
 * Uses bulk insert with duplicate handling
 *
 * @param recommendations - Array of recommendations to store
 * @returns Storage result with created count and errors
 */
export async function storeRecommendations(
  recommendations: RecommendationData[]
): Promise<{ created: number; errors: string[] }> {
  if (recommendations.length === 0) {
    return { created: 0, errors: [] };
  }

  console.time(`storeRecommendations-${recommendations[0].businessId}`);

  const errors: string[] = [];
  let created = 0;

  try {
    // Create recommendations using createMany (bulk insert)
    const result = await prisma.recommendation.createMany({
      data: recommendations.map((rec) => ({
        businessId: rec.businessId,
        title: rec.title,
        problemStatement: rec.problemStatement,
        actionSteps: rec.actionSteps,
        expectedImpact: rec.expectedImpact,
        confidenceLevel: rec.confidenceLevel,
        impactLevel: rec.impactLevel,
        status: 'NEW',
        peerSuccessData: rec.peerSuccessData,
      })),
      skipDuplicates: true, // Skip if duplicate title exists for business
    });

    created = result.count;

    console.log(`Stored ${created} recommendations in database`);
    console.timeEnd(`storeRecommendations-${recommendations[0].businessId}`);

    return { created, errors };
  } catch (error) {
    console.error('Error storing recommendations:', error);
    console.timeEnd(`storeRecommendations-${recommendations[0].businessId}`);

    errors.push(
      error instanceof Error ? error.message : 'Unknown error during storage'
    );

    return { created, errors };
  }
}

/**
 * Main entry point: generates and stores recommendations for a business
 * Combines generation and storage in a single operation
 *
 * @param options - Generation options
 * @returns Complete result with metrics
 */
export async function generateAndStoreRecommendations(
  options: RecommendationGenerationOptions
): Promise<RecommendationGenerationResult> {
  const startTime = Date.now();
  const { siteId, businessId } = options;

  try {
    // Generate recommendations
    const recommendations = await generateRecommendations(options);

    // Store recommendations
    const storageResult = await storeRecommendations(recommendations);

    const executionTimeMs = Date.now() - startTime;

    return {
      businessId,
      siteId,
      recommendationsGenerated: recommendations.length,
      recommendationsStored: storageResult.created,
      patternsProcessed: recommendations.length, // Each recommendation comes from one pattern
      executionTimeMs,
      errors: storageResult.errors,
      timestamp: new Date(),
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    return {
      businessId,
      siteId,
      recommendationsGenerated: 0,
      recommendationsStored: 0,
      patternsProcessed: 0,
      executionTimeMs,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      timestamp: new Date(),
    };
  }
}
