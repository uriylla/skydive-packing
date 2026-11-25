CREATE TYPE "public"."parachute_status" AS ENUM('active', 'maintenance', 'out_of_service');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('packer', 'supervisor');--> statement-breakpoint
CREATE TABLE "operating_days" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "operating_days_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"date" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "packs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"packer_id" integer NOT NULL,
	"parachute_id" integer NOT NULL,
	"day_id" integer NOT NULL,
	"packed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"voided" boolean DEFAULT false NOT NULL,
	"voided_reason" text,
	"voided_by_id" integer,
	"voided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parachutes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "parachutes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"number" text NOT NULL,
	"model" text,
	"serial_number" text,
	"owner" text,
	"status" "parachute_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"retired" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'packer' NOT NULL,
	"pin_hash" text,
	"username" text,
	"password_hash" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "packs" ADD CONSTRAINT "packs_packer_id_users_id_fk" FOREIGN KEY ("packer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packs" ADD CONSTRAINT "packs_parachute_id_parachutes_id_fk" FOREIGN KEY ("parachute_id") REFERENCES "public"."parachutes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packs" ADD CONSTRAINT "packs_day_id_operating_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."operating_days"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packs" ADD CONSTRAINT "packs_voided_by_id_users_id_fk" FOREIGN KEY ("voided_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "operating_days_date_key" ON "operating_days" USING btree ("date");--> statement-breakpoint
CREATE INDEX "packs_day_idx" ON "packs" USING btree ("day_id","packed_at");--> statement-breakpoint
CREATE INDEX "packs_parachute_idx" ON "packs" USING btree ("parachute_id","packed_at");--> statement-breakpoint
CREATE INDEX "packs_packer_idx" ON "packs" USING btree ("packer_id","packed_at");--> statement-breakpoint
CREATE INDEX "packs_packed_at_idx" ON "packs" USING btree ("packed_at" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "parachutes_number_key" ON "parachutes" USING btree ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_key" ON "users" USING btree ("username");