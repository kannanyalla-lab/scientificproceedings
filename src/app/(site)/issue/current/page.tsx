import { redirect } from "next/navigation";
import { getCurrentIssue } from "@/lib/queries";

export default async function CurrentIssue() {
  const issue = await getCurrentIssue();
  redirect(issue ? `/issue/${issue.slug}` : "/issues");
}
