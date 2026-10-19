import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { getPayoutPageData } from "@/actions/payout";
import PayoutReviewClient from "./_components/PayoutReviewClient";

export const instant = false;

export default async function PayoutPage({ params }) {
  await connection();
  const { id } = await params;
  const data = await getPayoutPageData(id);
  if (data.error?.startsWith("Sign in")) redirect("/sign-in");
  if (data.error?.includes("interviewers")) redirect("/dashboard");
  if (data.error) notFound();
  return <PayoutReviewClient data={data} />;
}
