-- CreateTable
CREATE TABLE "generation_tasks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT,
    "node_id" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt" TEXT,
    "config" JSONB,
    "input_file_url" TEXT,
    "input_file_url_2" TEXT,
    "result_url" TEXT,
    "result_text" TEXT,
    "error" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "external_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generation_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "generation_tasks_user_id_idx" ON "generation_tasks"("user_id");

-- CreateIndex
CREATE INDEX "generation_tasks_project_id_idx" ON "generation_tasks"("project_id");

-- CreateIndex
CREATE INDEX "generation_tasks_status_idx" ON "generation_tasks"("status");
