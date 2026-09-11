 
// MAX HEAP
 

class MaxHeap {

    constructor() {
        this.heap = [];
    }

     
    // GET INDEXES
     

    parent(index) {
        return Math.floor((index - 1) / 2);
    }

    leftChild(index) {
        return 2 * index + 1;
    }

    rightChild(index) {
        return 2 * index + 2;
    }


     
    // INSERT ELEMENT
     

    push(value) {

        this.heap.push(value);

        let index = this.heap.length - 1;

        // Bubble up
        while (index > 0) {

            const parentIndex = this.parent(index);

            if (
                this.heap[parentIndex].amount >=
                this.heap[index].amount
            ) {
                break;
            }

            [
                this.heap[parentIndex],
                this.heap[index]
            ] = [
                this.heap[index],
                this.heap[parentIndex]
            ];

            index = parentIndex;
        }
    }


     
    // REMOVE LARGEST ELEMENT
     

    pop() {

        if (this.heap.length === 0) {
            return null;
        }

        // Only one element
        if (this.heap.length === 1) {
            return this.heap.pop();
        }

        const max = this.heap[0];

        // Move last element to root
        this.heap[0] = this.heap.pop();

        let index = 0;

        // Bubble down
        while (true) {

            const left = this.leftChild(index);
            const right = this.rightChild(index);

            let largest = index;

            if (
                left < this.heap.length &&
                this.heap[left].amount >
                this.heap[largest].amount
            ) {
                largest = left;
            }

            if (
                right < this.heap.length &&
                this.heap[right].amount >
                this.heap[largest].amount
            ) {
                largest = right;
            }

            // Heap property is satisfied
            if (largest === index) {
                break;
            }

            [
                this.heap[index],
                this.heap[largest]
            ] = [
                this.heap[largest],
                this.heap[index]
            ];

            index = largest;
        }

        return max;
    }


     
    // CHECK IF HEAP IS EMPTY
     

    isEmpty() {
        return this.heap.length === 0;
    }
}


 
// DEBT SETTLEMENT
 

const settleDebts = (balances) => {

    const creditors = new MaxHeap();
    const debtors = new MaxHeap();

    let totalBalance = 0n;


     
    // 1. SEPARATE CREDITORS AND DEBTORS
     

    for (const balance of balances) {

        const amount = BigInt(balance.balance);

        // Keep track of total balance
        totalBalance += amount;

        if (amount > 0n) {

            // Positive balance:
            // User should receive money

            creditors.push({
                userId: balance.user_id,
                amount: amount
            });

        } else if (amount < 0n) {

            // Negative balance:
            // User owes money

            debtors.push({
                userId: balance.user_id,
                amount: -amount
            });
        }
    }


     
    // 2. VALIDATE TOTAL BALANCE
     

    if (totalBalance !== 0n) {
        throw new Error(
            "Balances must sum to zero"
        );
    }


     
    // 3. CREATE SETTLEMENT TRANSACTIONS
     

    const settlements = [];


    while (
        !debtors.isEmpty() &&
        !creditors.isEmpty()
    ) {

        // Get largest debtor
        const debtor = debtors.pop();

        // Get largest creditor
        const creditor = creditors.pop();


         
        // 4. CALCULATE SETTLEMENT AMOUNT
         

        const amount =
            debtor.amount < creditor.amount
                ? debtor.amount
                : creditor.amount;


         
        // 5. CREATE SETTLEMENT
         

        settlements.push({
            from: debtor.userId,
            to: creditor.userId,
            amount: amount.toString()
        });


         
        // 6. UPDATE REMAINING AMOUNTS
         

        debtor.amount -= amount;
        creditor.amount -= amount;


         
        // 7. PUT REMAINING AMOUNTS BACK
         

        if (debtor.amount > 0n) {
            debtors.push(debtor);
        }

        if (creditor.amount > 0n) {
            creditors.push(creditor);
        }
    }


     
    // 8. RETURN SETTLEMENTS
     

    return settlements;
};


module.exports = settleDebts;