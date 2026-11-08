class InfiniteRecursion {
    public static void recursiveCall(int n) {
        recursiveCall(n + 1);
    }

    public static void main(String[] args) {
        recursiveCall(1);
    }
}
