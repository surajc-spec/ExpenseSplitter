const calculateExactSplit = (totalAmount, splits) => {
    let splitTotal = 0;

    for (const split of splits) {
        if (!Number.isSafeInteger(split.amount) || split.amount < 0) {
            throw new Error(
                "Each split amount must be a non-negative integer in paise"
            );
        }

        splitTotal += split.amount;
    }

    if (splitTotal !== totalAmount) {
        throw new Error(
            "Sum of split amounts must equal total amount"
        );
    }

    return splits.map(split => ({
        userId: split.userId,
        amount: split.amount
    }));
};

module.exports = calculateExactSplit;