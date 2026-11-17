import { describe, expect, it } from "vitest";
import { findBatchByNumber, isBatchNumberTaken, nextAvailableBatchNumber, type ProductionBatch } from "@/features/connect/domain";

const batches: ProductionBatch[] = [
  { id: "b1", productId: "p1", batchNumber: "BATCH-01", status: "Draft" },
  { id: "b2", productId: "p2", batchNumber: "DEMO-NEW", status: "Draft" },
];
describe("global batch number uniqueness", () => {
  it("blocks the same number on another product", () => {
    expect(findBatchByNumber(batches, "DEMO-NEW")?.productId).toBe("p2");
  });
  it("blocks the same number on the same product", () => {
    expect(findBatchByNumber(batches, "BATCH-01")?.id).toBe("b1");
  });
  it("ignores case and surrounding spaces", () => {
    expect(isBatchNumberTaken(batches, "  batch-01 ")).toBe(true);
  });
  it("allows a new number", () => {
    expect(isBatchNumberTaken(batches, "BATCH-02")).toBe(false);
  });
  it("gives new products a free default batch", () => {
    expect(nextAvailableBatchNumber(batches, "DEMO-NEW")).toBe("DEMO-NEW-1");
  });
});
