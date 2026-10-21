
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from "@react-email/components";

function formatMoney(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  return String(value);
}

export function WithdrawalRequestEmail({
  interviewerName,
  interviewerEmail,
  credits,
  platformFee,
  netAmount,
  paymentMethod,
  paymentDetail,
  reviewUrl,
}) {
  const safeReviewUrl =
    typeof reviewUrl === "string" &&
    /^https?:\/\//i.test(reviewUrl)
      ? reviewUrl
      : null;

  return (
    <Html>
      <Head />
      <Preview>
        A new PrepIQ interviewer withdrawal request needs review.
      </Preview>

      <Body
        style={{
          backgroundColor: "#f3f4f6",
          fontFamily: "Arial, Helvetica, sans-serif",
          padding: "32px 16px",
          margin: 0,
        }}
      >
        <Container
          style={{
            maxWidth: "480px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "28px",
          }}
        >
          <Text
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#111827",
              margin: "0 0 6px",
            }}
          >
            PrepIQ
          </Text>

          <Text
            style={{
              fontSize: "11px",
              color: "#92400e",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              margin: "0 0 24px",
            }}
          >
            Interviewer withdrawal request
          </Text>

          <Text
            style={{
              fontSize: "14px",
              lineHeight: "22px",
              color: "#374151",
              margin: "0 0 8px",
            }}
          >
            A withdrawal request has been submitted by{" "}
            <strong>{formatValue(interviewerName)}</strong>.
          </Text>

          <Text
            style={{
              fontSize: "13px",
              lineHeight: "20px",
              color: "#6b7280",
              margin: "0 0 20px",
              overflowWrap: "anywhere",
            }}
          >
            Interviewer email: {formatValue(interviewerEmail)}
          </Text>

          <Hr style={{ borderColor: "#e5e7eb" }} />

          <Section style={{ padding: "12px 0" }}>
            <Text style={rowStyle}>
              Credits requested:{" "}
              <strong style={valueStyle}>{formatValue(credits)}</strong>
            </Text>

            <Text style={rowStyle}>
              Platform fee:{" "}
              <strong style={valueStyle}>
                {formatMoney(platformFee)}
              </strong>
            </Text>

            <Text style={rowStyle}>
              Net payout:{" "}
              <strong
                style={{
                  ...valueStyle,
                  color: "#b45309",
                  fontSize: "16px",
                }}
              >
                {formatMoney(netAmount)}
              </strong>
            </Text>

            <Text style={rowStyle}>
              Payment method:{" "}
              <strong style={valueStyle}>
                {formatValue(paymentMethod)}
              </strong>
            </Text>

            <Text style={rowStyle}>
              Payment details:{" "}
              <strong style={valueStyle}>
                {formatValue(paymentDetail)}
              </strong>
            </Text>
          </Section>

          <Hr style={{ borderColor: "#e5e7eb" }} />

          {safeReviewUrl ? (
            <Section style={{ textAlign: "center", paddingTop: "20px" }}>
              <Button
                href={safeReviewUrl}
                style={{
                  backgroundColor: "#f59e0b",
                  color: "#111827",
                  fontSize: "14px",
                  fontWeight: "700",
                  padding: "13px 24px",
                  borderRadius: "8px",
                  textDecoration: "none",
                }}
              >
                Review withdrawal
              </Button>
            </Section>
          ) : (
            <Text style={rowStyle}>
              No valid review URL was supplied. Open the PrepIQ admin
              dashboard to review this request.
            </Text>
          )}

          <Text
            style={{
              fontSize: "11px",
              lineHeight: "18px",
              color: "#9ca3af",
              margin: "24px 0 0",
            }}
          >
            This is an automated notification from PrepIQ. Verify the
            request and payment details in the authenticated admin
            dashboard before approving a payout.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const rowStyle = {
  fontSize: "13px",
  lineHeight: "21px",
  color: "#6b7280",
  margin: "0 0 12px",
  overflowWrap: "anywhere",
};

const valueStyle = {
  color: "#111827",
  fontWeight: "600",
};
