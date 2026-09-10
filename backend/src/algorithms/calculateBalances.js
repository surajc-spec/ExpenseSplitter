const calculateBalances = (expenses) => {
    const balances = new Map();

    for (const expense of expenses) {
        const paidBy = expense.paid_by;

        // What the payer paid
        const paidAmount = BigInt(expense.total_amount);

        balances.set(
            paidBy,
            (balances.get(paidBy) || 0n) + paidAmount
        );

        // What each person owes
        for (const split of expense.splits) {
            const owedAmount = BigInt(split.amount);

            balances.set(
                split.user_id,
                (balances.get(split.user_id) || 0n) - owedAmount
            );
        }
    }

    return Array.from(balances.entries()).map(
        ([userId, balance]) => ({
            user_id: userId,
            balance: balance.toString()
        })
    );
};

module.exports = calculateBalances;