const calculateEqualSplit = require("../src/algorithms/equalSplit");
const calculateExactSplit = require("../src/algorithms/exactSplit");
const calculatePercentageSplit = require("../src/algorithms/percentageSplit");
const calculateBalances = require("../src/algorithms/calculateBalances");
const settleDebts = require("../src/algorithms/settleDebts");

describe("Algorithm Unit Tests", () => {
      
    // 1. EQUAL SPLIT ALGORITHM
      
    describe("equalSplit", () => {
        test("should split evenly among users when divisible without remainder", () => {
            const splits = [{ userId: "u1" }, { userId: "u2" }, { userId: "u3" }];
            const result = calculateEqualSplit(30000, splits); // ₹300.00 = 30000 paise

            expect(result).toEqual([
                { userId: "u1", amount: 10000 },
                { userId: "u2", amount: 10000 },
                { userId: "u3", amount: 10000 }
            ]);
            expect(result.reduce((sum, s) => sum + s.amount, 0)).toBe(30000);
        });

        test("should handle single user split", () => {
            const splits = [{ userId: "u1" }];
            const result = calculateEqualSplit(10050, splits);

            expect(result).toEqual([{ userId: "u1", amount: 10050 }]);
        });

        test("should distribute remainder paise to initial users when not perfectly divisible", () => {
            // ₹100.00 = 10000 paise divided by 3 users
            // 10000 / 3 = 3333 base, remainder 1
            const splits = [{ userId: "u1" }, { userId: "u2" }, { userId: "u3" }];
            const result = calculateEqualSplit(10000, splits);

            expect(result).toEqual([
                { userId: "u1", amount: 3334 },
                { userId: "u2", amount: 3333 },
                { userId: "u3", amount: 3333 }
            ]);
            expect(result.reduce((sum, s) => sum + s.amount, 0)).toBe(10000);
        });

        test("should correctly distribute multi-paise remainders", () => {
            // 10000 / 7 = 1428 base, remainder 4
            const splits = [
                { userId: "u1" }, { userId: "u2" }, { userId: "u3" },
                { userId: "u4" }, { userId: "u5" }, { userId: "u6" }, { userId: "u7" }
            ];
            const result = calculateEqualSplit(10000, splits);

            expect(result.slice(0, 4).every(s => s.amount === 1429)).toBe(true);
            expect(result.slice(4).every(s => s.amount === 1428)).toBe(true);
            expect(result.reduce((sum, s) => sum + s.amount, 0)).toBe(10000);
        });

        test("should handle total amount of zero", () => {
            const splits = [{ userId: "u1" }, { userId: "u2" }];
            const result = calculateEqualSplit(0, splits);

            expect(result).toEqual([
                { userId: "u1", amount: 0 },
                { userId: "u2", amount: 0 }
            ]);
        });
    });

      
    // 2. EXACT SPLIT ALGORITHM
      
    describe("exactSplit", () => {
        test("should accept valid exact splits whose sum equals total amount", () => {
            const splits = [
                { userId: "u1", amount: 6000 },
                { userId: "u2", amount: 4000 }
            ];
            const result = calculateExactSplit(10000, splits);

            expect(result).toEqual([
                { userId: "u1", amount: 6000 },
                { userId: "u2", amount: 4000 }
            ]);
        });

        test("should throw error if split sum does not match total amount", () => {
            const splits = [
                { userId: "u1", amount: 5000 },
                { userId: "u2", amount: 4000 }
            ];

            expect(() => calculateExactSplit(10000, splits)).toThrow(
                "Sum of split amounts must equal total amount"
            );
        });

        test("should throw error if any split amount is negative or not a safe integer", () => {
            const invalidSplits1 = [
                { userId: "u1", amount: -1000 },
                { userId: "u2", amount: 11000 }
            ];
            expect(() => calculateExactSplit(10000, invalidSplits1)).toThrow(
                "Each split amount must be a non-negative integer in paise"
            );

            const invalidSplits2 = [
                { userId: "u1", amount: 5000.5 },
                { userId: "u2", amount: 4999.5 }
            ];
            expect(() => calculateExactSplit(10000, invalidSplits2)).toThrow(
                "Each split amount must be a non-negative integer in paise"
            );
        });
    });

      
    // 3. PERCENTAGE SPLIT ALGORITHM
      
    describe("percentageSplit", () => {
        test("should calculate splits based on valid percentage allocation", () => {
            const splits = [
                { userId: "u1", percentage: 50 },
                { userId: "u2", percentage: 30 },
                { userId: "u3", percentage: 20 }
            ];
            const result = calculatePercentageSplit(10000, splits);

            expect(result).toEqual([
                { userId: "u1", amount: 5000 },
                { userId: "u2", amount: 3000 },
                { userId: "u3", amount: 2000 }
            ]);
            expect(result.reduce((sum, s) => sum + s.amount, 0)).toBe(10000);
        });

        test("should throw error if percentage sum does not equal 100", () => {
            const splits = [
                { userId: "u1", percentage: 50 },
                { userId: "u2", percentage: 40 }
            ];

            expect(() => calculatePercentageSplit(10000, splits)).toThrow(
                "Sum of percentages must equal 100"
            );
        });

        test("should throw error for out-of-bounds or non-finite percentage values", () => {
            const invalidSplits = [
                { userId: "u1", percentage: -10 },
                { userId: "u2", percentage: 110 }
            ];

            expect(() => calculatePercentageSplit(10000, invalidSplits)).toThrow(
                "Each percentage must be a number between 0 and 100"
            );
        });

        test("should adjust remainder paise caused by percentage rounding", () => {
            const splits = [
                { userId: "u1", percentage: 33.3333 },
                { userId: "u2", percentage: 33.3333 },
                { userId: "u3", percentage: 33.3334 }
            ];
            const result = calculatePercentageSplit(10000, splits);

            expect(result.reduce((sum, s) => sum + s.amount, 0)).toBe(10000);
        });
    });

      
    // 4. CALCULATE BALANCES
      
    describe("calculateBalances", () => {
        test("should calculate correct net balances for a single expense", () => {
            const expenses = [
                {
                    id: "exp1",
                    total_amount: "10000",
                    paid_by: "u1",
                    splits: [
                        { user_id: "u1", amount: "5000" },
                        { user_id: "u2", amount: "5000" }
                    ]
                }
            ];

            const balances = calculateBalances(expenses);

            expect(balances).toEqual([
                { user_id: "u1", balance: "5000" },  // +10000 paid - 5000 share = +5000
                { user_id: "u2", balance: "-5000" }  // 0 paid - 5000 share = -5000
            ]);
        });

        test("should calculate correct net balances across multiple expenses", () => {
            const expenses = [
                {
                    id: "exp1",
                    total_amount: "10000",
                    paid_by: "u1",
                    splits: [
                        { user_id: "u1", amount: "5000" },
                        { user_id: "u2", amount: "5000" }
                    ]
                },
                {
                    id: "exp2",
                    total_amount: "6000",
                    paid_by: "u2",
                    splits: [
                        { user_id: "u1", amount: "3000" },
                        { user_id: "u2", amount: "3000" }
                    ]
                }
            ];

            const balances = calculateBalances(expenses);

            // u1: +10000 paid - 5000 share (exp1) - 3000 share (exp2) = +2000
            // u2: +6000 paid - 5000 share (exp1) - 3000 share (exp2) = -2000
            const u1Bal = balances.find(b => b.user_id === "u1");
            const u2Bal = balances.find(b => b.user_id === "u2");

            expect(u1Bal.balance).toBe("2000");
            expect(u2Bal.balance).toBe("-2000");
        });
    });

   
    // 5. SETTLE DEBTS ALGORITHM (MAXHEAP & GREEDY SETTLEMENT)
  
    describe("settleDebts", () => {
        test("should simplify debts between single debtor and single creditor", () => {
            const balances = [
                { user_id: "u1", balance: "5000" },
                { user_id: "u2", balance: "-5000" }
            ];

            const settlements = settleDebts(balances);

            expect(settlements).toEqual([
                { from: "u2", to: "u1", amount: "5000" }
            ]);
        });

        test("should minimize transactions across multiple debtors and creditors", () => {
            const balances = [
                { user_id: "u1", balance: "10000" }, // +100
                { user_id: "u2", balance: "5000" },  // +50
                { user_id: "u3", balance: "-7000" }, // -70
                { user_id: "u4", balance: "-8000" }  // -80
            ];

            const settlements = settleDebts(balances);

            // Total settled amount must be 15000 paise (₹150)
            const totalSettled = settlements.reduce((sum, s) => sum + BigInt(s.amount), 0n);
            expect(totalSettled).toBe(15000n);
            expect(settlements.length).toBeLessThanOrEqual(3);
        });

        test("should throw error if balances do not sum to zero", () => {
            const invalidBalances = [
                { user_id: "u1", balance: "5000" },
                { user_id: "u2", balance: "-3000" }
            ];

            expect(() => settleDebts(invalidBalances)).toThrow(
                "Balances must sum to zero"
            );
        });

        test("should return empty array if all balances are zero", () => {
            const balances = [
                { user_id: "u1", balance: "0" },
                { user_id: "u2", balance: "0" }
            ];

            const settlements = settleDebts(balances);
            expect(settlements).toEqual([]);
        });
    });
});
