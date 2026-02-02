-- CreateIndex
CREATE INDEX "products_createdAt_idx" ON "products"("createdAt");

-- CreateIndex
CREATE INDEX "products_categoryId_isActive_idx" ON "products"("categoryId", "isActive");

-- CreateIndex
CREATE INDEX "products_brandId_isActive_idx" ON "products"("brandId", "isActive");

-- CreateIndex
CREATE INDEX "quote_requests_status_createdAt_idx" ON "quote_requests"("status", "createdAt");
