CREATE TABLE "player_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_devices_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "player_saves" (
	"player_id" uuid PRIMARY KEY NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"content_version" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"score_key" text NOT NULL,
	"season_id" text DEFAULT 'global' NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player_devices" ADD CONSTRAINT "player_devices_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_saves" ADD CONSTRAINT "player_saves_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_scores" ADD CONSTRAINT "player_scores_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "player_devices_player_id_idx" ON "player_devices" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "player_devices_token_hash_idx" ON "player_devices" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "player_saves_content_version_idx" ON "player_saves" USING btree ("content_version");--> statement-breakpoint
CREATE INDEX "player_scores_player_id_idx" ON "player_scores" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "player_scores_leaderboard_idx" ON "player_scores" USING btree ("score_key","season_id","value");--> statement-breakpoint
CREATE UNIQUE INDEX "player_scores_player_key_season_unique" ON "player_scores" USING btree ("player_id","score_key","season_id");