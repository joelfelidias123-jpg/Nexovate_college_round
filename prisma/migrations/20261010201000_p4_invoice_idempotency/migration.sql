CREATE TABLE "P4InvoiceIdempotency" (
    "idempotencyKey" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "P4InvoiceIdempotency_pkey" PRIMARY KEY ("idempotencyKey")
);
