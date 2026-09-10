    const calculatePercentageSplit = (totalAmount, splits) => {
    let percentageTotal = 0;

    for (const split of splits) {
        if (
            typeof split.percentage !== "number" ||
            !Number.isFinite(split.percentage) ||
            split.percentage < 0 ||
            split.percentage > 100
        ) {
            throw new Error(
                "Each percentage must be a number between 0 and 100"
            );
        }

        percentageTotal += split.percentage;
    }

    if (Math.abs(percentageTotal - 100) > 0.0001) {
        throw new Error(
            "Sum of percentages must equal 100"
        );
    }

    const calculatedSplits = splits.map(split => ({
        userId: split.userId,
        amount: Math.floor(
            totalAmount * split.percentage / 100
        )
    }));

    // Distribute any remaining paise caused by rounding
    const calculatedTotal = calculatedSplits.reduce(
        (sum, split) => sum + split.amount,
        0
    );

    let remainder = totalAmount - calculatedTotal;

    for (let i = 0; i < calculatedSplits.length && remainder > 0; i++) {
        calculatedSplits[i].amount += 1;
        remainder--;
    }

    return calculatedSplits;
};

module.exports = calculatePercentageSplit;