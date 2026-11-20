CREATE TABLE "articles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"issue_id" bigint,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"article_type" text DEFAULT 'Original Research' NOT NULL,
	"authors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"affiliations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"corresponding_author" text,
	"corresponding_email" text,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"abstract" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"body_html" text,
	"refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"image_url" text,
	"pdf_url" text,
	"page_start" text,
	"page_end" text,
	"doi" text,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"volume" integer NOT NULL,
	"number" integer NOT NULL,
	"month" text NOT NULL,
	"year" integer NOT NULL,
	"cover_url" text,
	"description" text,
	"spotter_contributors" text,
	"scramble_contributors" text,
	"is_current" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "issues_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "pharma_updates" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"issue_id" bigint,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"body_html" text,
	"image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pharma_updates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "scramble_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"issue_id" bigint,
	"specialty" text NOT NULL,
	"clue" text NOT NULL,
	"scrambled" text NOT NULL,
	"answer" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spotter_cases" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"issue_id" bigint,
	"case_no" integer DEFAULT 1 NOT NULL,
	"image_url" text,
	"question" text NOT NULL,
	"diagnosis" text NOT NULL,
	"findings" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"affiliation" text,
	"title" text NOT NULL,
	"article_type" text,
	"abstract" text,
	"file_url" text,
	"file_name" text,
	"status" text DEFAULT 'Received' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharma_updates" ADD CONSTRAINT "pharma_updates_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scramble_items" ADD CONSTRAINT "scramble_items_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spotter_cases" ADD CONSTRAINT "spotter_cases_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_articles_issue" ON "articles" USING btree ("issue_id","sort_order");