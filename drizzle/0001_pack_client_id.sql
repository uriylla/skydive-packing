ALTER TABLE "packs" ADD COLUMN "client_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "packs_client_id_key" ON "packs" USING btree ("client_id");