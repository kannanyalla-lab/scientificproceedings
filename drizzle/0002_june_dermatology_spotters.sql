ALTER TABLE "issues" ADD COLUMN "derm_spotter_contributors" text;--> statement-breakpoint
ALTER TABLE "spotter_cases" ADD COLUMN "category" text DEFAULT 'Radiology' NOT NULL;--> statement-breakpoint
ALTER TABLE "spotter_cases" ADD COLUMN "options" jsonb DEFAULT '[]'::jsonb NOT NULL;