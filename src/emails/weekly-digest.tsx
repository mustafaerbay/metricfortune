import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export interface DigestRecommendation {
  id: string;
  title: string;
  summary: string;
  impactLevel: "HIGH" | "MEDIUM" | "LOW";
  dashboardUrl: string;
}

export interface WeeklyDigestEmailProps {
  userName: string;
  businessName: string;
  recommendations: DigestRecommendation[];
  conversionTrend: { thisWeek: number; lastWeek: number; change: number } | null;
  implementationWins: { title: string; improvement: string }[];
  unsubscribeUrl: string;
}

const IMPACT_COLORS: Record<string, string> = {
  HIGH: "#dc2626",
  MEDIUM: "#d97706",
  LOW: "#16a34a",
};

export const WeeklyDigestEmail = ({
  userName,
  businessName,
  recommendations,
  conversionTrend,
  implementationWins,
  unsubscribeUrl,
}: WeeklyDigestEmailProps) => {
  const trendArrow =
    conversionTrend && conversionTrend.change >= 0 ? "↑" : "↓";
  const trendColor =
    conversionTrend && conversionTrend.change >= 0 ? "#16a34a" : "#dc2626";

  return (
    <Html>
      <Head />
      <Preview>Your weekly MetricFortune optimization digest</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={brandName}>MetricFortune</Heading>
            <Text style={headerSubtitle}>Weekly Optimization Digest</Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>
              Hi {userName}, here are this week&apos;s optimization opportunities for{" "}
              <strong>{businessName}</strong>.
            </Text>

            {/* Section 2: Top Recommendations */}
            <Heading style={sectionHeading}>
              Top Recommendations This Week
            </Heading>

            {recommendations.map((rec) => (
              <Section key={rec.id} style={recCard}>
                <Section style={recHeader}>
                  <Text style={recImpactBadge(rec.impactLevel)}>
                    {rec.impactLevel} IMPACT
                  </Text>
                  <Text style={recTitle}>{rec.title}</Text>
                  <Text style={recSummary}>{rec.summary}</Text>
                </Section>
                <Section style={buttonContainer}>
                  <Button style={button} href={rec.dashboardUrl}>
                    View Details
                  </Button>
                </Section>
              </Section>
            ))}

            <Hr style={divider} />

            {/* Section 3: Quick Stats */}
            {conversionTrend !== null && (
              <>
                <Heading style={sectionHeading}>Quick Stats</Heading>
                <Section style={statsCard}>
                  <Text style={statsLabel}>Conversion Rate</Text>
                  <Text style={statsTrend(trendColor)}>
                    {trendArrow}{" "}
                    {Math.abs(conversionTrend.change).toFixed(1)}% week-over-week
                  </Text>
                  <Text style={statsDetail}>
                    This week: {conversionTrend.thisWeek.toFixed(2)}% &nbsp;|&nbsp; Last week:{" "}
                    {conversionTrend.lastWeek.toFixed(2)}%
                  </Text>
                </Section>
                <Hr style={divider} />
              </>
            )}

            {/* Section 4: Implementation Wins (conditional) */}
            {implementationWins.length > 0 && (
              <>
                <Heading style={sectionHeading}>Implementation Wins</Heading>
                <Text style={sectionIntro}>
                  Great work! Here&apos;s what&apos;s been working:
                </Text>
                {implementationWins.map((win, idx) => (
                  <Section key={idx} style={winCard}>
                    <Text style={winTitle}>{win.title}</Text>
                    <Text style={winImprovement}>{win.improvement} improvement</Text>
                  </Section>
                ))}
                <Hr style={divider} />
              </>
            )}
          </Section>

          {/* Section 5: Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You&apos;re receiving this because you have weekly digest emails enabled.
            </Text>
            <Text style={footerText}>
              <Link href={unsubscribeUrl} style={unsubscribeLink}>
                Unsubscribe
              </Link>{" "}
              &nbsp;|&nbsp; Manage preferences in your{" "}
              <Link
                href={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/dashboard/settings`}
                style={unsubscribeLink}
              >
                dashboard settings
              </Link>
            </Text>
            <Text style={footerCompliance}>
              MetricFortune &bull; In compliance with CAN-SPAM and GDPR.
              You may unsubscribe at any time.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default WeeklyDigestEmail;

// Styles (inline only — React Email requirement)
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "600px",
  paddingBottom: "48px",
};

const header = {
  backgroundColor: "#7c3aed",
  padding: "32px 40px",
  textAlign: "center" as const,
};

const brandName = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0 0 4px",
  padding: "0",
};

const headerSubtitle = {
  color: "#e9d5ff",
  fontSize: "16px",
  margin: "0",
};

const content = {
  padding: "32px 40px 0",
};

const greeting = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  marginBottom: "24px",
};

const sectionHeading = {
  color: "#111",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "0 0 16px",
  padding: "0",
};

const sectionIntro = {
  color: "#555",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 12px",
};

const recCard = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  marginBottom: "16px",
  padding: "20px",
};

const recHeader = {
  marginBottom: "12px",
};

const recImpactBadge = (impactLevel: string) => ({
  display: "inline-block" as const,
  backgroundColor: IMPACT_COLORS[impactLevel] ?? "#6b7280",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: "bold",
  borderRadius: "4px",
  padding: "2px 8px",
  margin: "0 0 8px",
  letterSpacing: "0.5px",
});

const recTitle = {
  color: "#111",
  fontSize: "17px",
  fontWeight: "bold",
  lineHeight: "24px",
  margin: "0 0 8px",
};

const recSummary = {
  color: "#555",
  fontSize: "15px",
  lineHeight: "22px",
  margin: "0",
};

const buttonContainer = {
  marginTop: "16px",
};

const button = {
  backgroundColor: "#7c3aed",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block" as const,
  padding: "14px 24px",
  minHeight: "44px",
};

const divider = {
  borderColor: "#e5e7eb",
  margin: "28px 0",
};

const statsCard = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "8px",
};

const statsLabel = {
  color: "#6b7280",
  fontSize: "13px",
  fontWeight: "bold",
  letterSpacing: "0.5px",
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
};

const statsTrend = (color: string) => ({
  color,
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 4px",
});

const statsDetail = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "0",
};

const winCard = {
  border: "1px solid #d1fae5",
  backgroundColor: "#f0fdf4",
  borderRadius: "6px",
  padding: "14px 16px",
  marginBottom: "10px",
};

const winTitle = {
  color: "#111",
  fontSize: "15px",
  fontWeight: "bold",
  margin: "0 0 4px",
};

const winImprovement = {
  color: "#16a34a",
  fontSize: "14px",
  fontWeight: "bold",
  margin: "0",
};

const footer = {
  padding: "24px 40px",
  borderTop: "1px solid #e5e7eb",
};

const footerText = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 8px",
  textAlign: "center" as const,
};

const unsubscribeLink = {
  color: "#7c3aed",
  textDecoration: "underline",
};

const footerCompliance = {
  color: "#9ca3af",
  fontSize: "11px",
  lineHeight: "16px",
  margin: "12px 0 0",
  textAlign: "center" as const,
};
