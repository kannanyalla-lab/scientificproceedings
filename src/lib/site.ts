export const JOURNAL = "KIMSHEALTH Scientific Proceedings";
export const JOURNAL_ABBR = "KIMSHEALTH Sci Proc";
export const TAGLINE = "A Clinical and Scientific Research Journal";
export const PUBLISHER = "KIMSHEALTH, Trivandrum, Kerala, India";
export const LOGO_URL = "https://ksp.healthcaremarktech.in/public/uploads/logo.png";
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");

export const ARTICLE_TYPES = [
  "Editorial",
  "Review Article",
  "Original Research",
  "Case Series",
  "Case Report",
  "Images in Medicine",
  "Short Communication",
  "Letter to the Editor",
] as const;

export const SUBMISSION_STATUSES = ["Received", "Under review", "Revision requested", "Accepted", "Rejected", "Published"];

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
