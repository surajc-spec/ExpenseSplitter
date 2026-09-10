const calculateEqualSplit = (totalAmount, splits) => {
    const numberOfUsers = splits.length;

    const baseAmount = Math.floor(
        totalAmount / numberOfUsers
    );

    const remainder = totalAmount % numberOfUsers;

    return splits.map((split, index) => ({
        userId: split.userId,
        amount: baseAmount + (index < remainder ? 1 : 0)
    }));
};

module.exports = calculateEqualSplit;