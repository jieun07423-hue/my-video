-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('pending', 'active', 'inactive', 'dissolved', 'pending_renewal');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('new', 'synced', 'verified');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('super_admin', 'admin', 'viewer');

-- CreateEnum
CREATE TYPE "AdCampaignStatus" AS ENUM ('pending', 'generating', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "AdCopyQuality" AS ENUM ('high', 'medium', 'low');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" "AdminRole" NOT NULL DEFAULT 'admin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "bizes_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "road_name_address" TEXT,
    "lot_number_address" TEXT,
    "phone" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "business_code" TEXT,
    "business_name" TEXT,
    "inds_lcls_cd" TEXT,
    "inds_lcls_nm" TEXT,
    "inds_mcls_cd" TEXT,
    "inds_mcls_nm" TEXT,
    "inds_scls_cd" TEXT,
    "inds_scls_nm" TEXT,
    "status" "BusinessStatus" NOT NULL DEFAULT 'pending',
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_synced_at" TIMESTAMP(3),
    "data_source" TEXT,
    "external_id" TEXT,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_states" (
    "id" TEXT NOT NULL,
    "data_source" TEXT NOT NULL,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_business_id" TEXT,
    "sync_status" TEXT NOT NULL DEFAULT 'idle',
    "error_message" TEXT,
    "sync_count" INTEGER NOT NULL DEFAULT 0,
    "total_synced" INTEGER NOT NULL DEFAULT 0,
    "new_records_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previous_data" JSONB,
    "new_data" JSONB,
    "changed_by" TEXT,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_campaigns" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "industry" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "target" TEXT,
    "goal" TEXT,
    "strengths" TEXT,
    "keywords" TEXT[],
    "tone" TEXT,
    "status" "AdCampaignStatus" NOT NULL DEFAULT 'pending',
    "total_copies" INTEGER NOT NULL DEFAULT 0,
    "selected_count" INTEGER NOT NULL DEFAULT 0,
    "telegram_chat_id" TEXT,
    "telegram_message_id" TEXT,
    "blog_posted" BOOLEAN NOT NULL DEFAULT false,
    "blog_post_url" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_copies" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "quality" "AdCopyQuality",
    "is_selected" BOOLEAN NOT NULL DEFAULT false,
    "filter_stage" TEXT,
    "char_count" INTEGER,
    "has_cta" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_copies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seoul_permits" (
    "id" TEXT NOT NULL,
    "manage_no" TEXT NOT NULL,
    "bplc_nm" TEXT NOT NULL,
    "bp_nm" TEXT,
    "bizcnd" TEXT,
    "locplcd" TEXT,
    "rdn_whladdr" TEXT,
    "site_tel" TEXT,
    "apv_perm_ymd" TEXT,
    "apv_cancel_ymd" TEXT,
    "trd_state_gbn" TEXT,
    "trd_state_nm" TEXT,
    "dtl_state_gbn" TEXT,
    "dtl_state_nm" TEXT,
    "dcby_ymd" TEXT,
    "site_post_no" TEXT,
    "x_coord" DECIMAL(15,6),
    "y_coord" DECIMAL(15,6),
    "service_code" TEXT NOT NULL DEFAULT 'LOCALDATA_031001',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seoul_permits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_bizes_id_key" ON "businesses"("bizes_id");

-- CreateIndex
CREATE INDEX "businesses_recordStatus_created_at_idx" ON "businesses"("recordStatus", "created_at" DESC);

-- CreateIndex
CREATE INDEX "businesses_status_created_at_idx" ON "businesses"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "businesses_name_idx" ON "businesses"("name");

-- CreateIndex
CREATE INDEX "businesses_business_code_idx" ON "businesses"("business_code");

-- CreateIndex
CREATE INDEX "businesses_created_at_idx" ON "businesses"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "sync_states_data_source_key" ON "sync_states"("data_source");

-- CreateIndex
CREATE INDEX "audit_logs_business_id_created_at_idx" ON "audit_logs"("business_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ad_campaigns_status_created_at_idx" ON "ad_campaigns"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ad_campaigns_user_id_created_at_idx" ON "ad_campaigns"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ad_copies_campaign_id_rank_idx" ON "ad_copies"("campaign_id", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "seoul_permits_manage_no_key" ON "seoul_permits"("manage_no");

-- CreateIndex
CREATE INDEX "seoul_permits_service_code_trd_state_nm_idx" ON "seoul_permits"("service_code", "trd_state_nm");

-- CreateIndex
CREATE INDEX "seoul_permits_bplc_nm_idx" ON "seoul_permits"("bplc_nm");

-- CreateIndex
CREATE INDEX "seoul_permits_created_at_idx" ON "seoul_permits"("created_at" DESC);

-- CreateIndex
CREATE INDEX "notes_business_id_deleted_at_idx" ON "notes"("business_id", "deleted_at");

-- CreateIndex
CREATE INDEX "notes_deleted_at_idx" ON "notes"("deleted_at");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_copies" ADD CONSTRAINT "ad_copies_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
