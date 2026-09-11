const settleDebts = require("../src/algorithms/settleDebts");

describe("settleDebts", () => {

     
    // 1. ONE DEBTOR + ONE CREDITOR
     

    test("should settle one debtor and one creditor", () => {

        const balances = [
            { user_id: "A", balance: "1000" },
            { user_id: "B", balance: "-1000" }
        ];

        const result = settleDebts(balances);

        expect(result).toEqual([
            {
                from: "B",
                to: "A",
                amount: "1000"
            }
        ]);
    });


     
    // 2. ZERO BALANCES
     

    test("should return empty array when everyone has zero balance", () => {

        const balances = [
            { user_id: "A", balance: "0" },
            { user_id: "B", balance: "0" }
        ];

        const result = settleDebts(balances);

        expect(result).toEqual([]);
    });


     
    // 3. MULTIPLE DEBTORS + CREDITORS
     

    test("should handle multiple debtors and creditors", () => {

        const balances = [
            { user_id: "A", balance: "1000" },
            { user_id: "B", balance: "2000" },
            { user_id: "C", balance: "-500" },
            { user_id: "D", balance: "-1500" },
            { user_id: "E", balance: "-1000" }
        ];

        const result = settleDebts(balances);

        expect(result).toEqual([
            {
                from: "D",
                to: "B",
                amount: "1500"
            },
            {
                from: "E",
                to: "A",
                amount: "1000"
            },
            {
                from: "C",
                to: "B",
                amount: "500"
            }
        ]);
    });


     
    // 4. UNEVEN SETTLEMENT
     

    test("should handle uneven settlement amounts", () => {

        const balances = [
            { user_id: "A", balance: "1000" },
            { user_id: "B", balance: "500" },
            { user_id: "C", balance: "-700" },
            { user_id: "D", balance: "-800" }
        ];

        const result = settleDebts(balances);

        expect(result).toEqual([
            {
                from: "D",
                to: "A",
                amount: "800"
            },
            {
                from: "C",
                to: "B",
                amount: "500"
            },
            {
                from: "C",
                to: "A",
                amount: "200"
            }
        ]);
    });


     
    // 5. UNBALANCED INPUT
     

    test("should reject unbalanced balances", () => {

        const balances = [
            { user_id: "A", balance: "1000" },
            { user_id: "B", balance: "-500" }
        ];

        expect(() => settleDebts(balances))
            .toThrow("Balances must sum to zero");
    });

});