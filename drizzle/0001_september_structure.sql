ALTER TABLE "articles" ADD COLUMN "notes_html" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "pharma_contributors" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "highlights" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "editorial_board" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "pdf_url" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "page_images" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "page_offset" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pharma_updates" ADD COLUMN "refs" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "spotter_cases" ADD COLUMN "images" jsonb DEFAULT '[]'::jsonb NOT NULL;