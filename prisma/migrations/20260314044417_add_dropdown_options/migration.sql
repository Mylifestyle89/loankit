-- CreateTable
CREATE TABLE "dropdown_options" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "field_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "dropdown_options_field_key_idx" ON "dropdown_options"("field_key");

-- CreateIndex
CREATE UNIQUE INDEX "dropdown_options_field_key_label_key" ON "dropdown_options"("field_key", "label");
