import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Users Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(255) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "name" character varying(100) NOT NULL,
        "role" character varying(20) NOT NULL DEFAULT 'user',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    // 2. URLs Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "urls" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid,
        "original_url" text NOT NULL,
        "short_code" character varying(30) NOT NULL,
        "domain" character varying(100),
        "tags" text,
        "title" character varying(255),
        "favicon" text,
        "is_custom_alias" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "clicks_count" integer NOT NULL DEFAULT 0,
        "max_clicks" integer,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "password_hash" character varying(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_urls_short_code" UNIQUE ("short_code"),
        CONSTRAINT "PK_urls_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_urls_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_urls_short_code" ON "urls" ("short_code")
    `);

    // 3. Refresh Tokens Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" text NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "is_revoked" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_hash" ON "refresh_tokens" ("token_hash")
    `);

    // 4. Clicks Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "clicks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "url_id" uuid NOT NULL,
        "ip_hash" character varying(64),
        "device_type" character varying(50) NOT NULL DEFAULT 'desktop',
        "browser" character varying(50) NOT NULL DEFAULT 'Chrome',
        "os" character varying(50) NOT NULL DEFAULT 'Unknown',
        "referrer" character varying(255) NOT NULL DEFAULT 'Direct',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_clicks_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_clicks_url_id" FOREIGN KEY ("url_id") REFERENCES "urls"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_clicks_url_id" ON "clicks" ("url_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_clicks_created_at" ON "clicks" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "clicks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "urls"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}

