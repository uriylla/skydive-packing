CREATE TYPE "public"."parachute_kind" AS ENUM('tandem', 'normal');--> statement-breakpoint
ALTER TABLE "parachutes" ADD COLUMN "kind" "parachute_kind" DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "packs" ALTER COLUMN "parachute_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "packs" ADD COLUMN "external_label" text;--> statement-breakpoint
-- Existing packs: copy the type from their parachute (all "normal" right after this migration).
ALTER TABLE "packs" ADD COLUMN "kind" "parachute_kind" DEFAULT 'normal' NOT NULL;--> statement-breakpoint
UPDATE "packs" SET "kind" = "parachutes"."kind" FROM "parachutes" WHERE "parachutes"."id" = "packs"."parachute_id";--> statement-breakpoint
ALTER TABLE "packs" ALTER COLUMN "kind" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "packs" ADD CONSTRAINT "packs_parachute_or_external" CHECK (("packs"."parachute_id" is null) <> ("packs"."external_label" is null));
