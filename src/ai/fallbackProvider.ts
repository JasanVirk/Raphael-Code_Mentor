import { AiProvider } from './aiProvider';
import { TutorRequest, TutorResponse } from './schema';

export class FallbackProvider implements AiProvider {
    public readonly providerName = 'OfflineFallbackProvider';

    public async explain(request: TutorRequest): Promise<TutorResponse> {
        return this.generateFallback(request);
    }

    public generateFallback(request: TutorRequest): TutorResponse {
        const msg = (request.diagnostic.message || '').toLowerCase();
        const exType = request.diagnostic.exceptionType || '';
        const line = request.diagnostic.line;
        const level = Math.min(Math.max(1, request.hintLevel), 3);

        // 1. Division by zero / ArithmeticException
        if (exType.includes('ArithmeticException') || msg.includes('/ by zero')) {
            return {
                errorSummary: 'Division by zero',
                whatHappened: 'The program attempted to divide an integer by zero at runtime.',
                why: 'Integer division in Java is undefined when the divisor is zero.',
                location: { line, note: `Division operation on line ${line}.` },
                concept: {
                    name: 'ArithmeticException',
                    explanation: 'Java throws an ArithmeticException when an exceptional arithmetic condition, such as division by zero, occurs.',
                },
                hint: this.getHintForDivisionByZero(level),
                example: 'if (denominator != 0) { int result = numerator / denominator; }',
                learningQuestion: 'What condition should be checked before performing integer division?',
                nextHintAvailable: level < 3,
            };
        }

        // 2. NullPointerException
        if (exType.includes('NullPointerException') || msg.includes('nullpointerexception') || msg.includes('is null')) {
            return {
                errorSummary: 'Null pointer dereference',
                whatHappened: 'The program attempted to invoke a method or access a field on a null reference.',
                why: 'A reference variable evaluated to null instead of pointing to an instantiated object in memory.',
                location: { line, note: `Object accessed on line ${line} is null.` },
                concept: {
                    name: 'NullPointerException',
                    explanation: 'In Java, an object variable holds null until instantiated with new or assigned an existing object. Invoking members on null causes a crash.',
                },
                hint: this.getHintForNullPointer(level),
                example: 'String text = ""; // initialized instead of null',
                learningQuestion: 'Where was this variable initialized, and could it be null before reaching this line?',
                nextHintAvailable: level < 3,
            };
        }

        // 3. ArrayIndexOutOfBoundsException
        if (exType.includes('ArrayIndexOutOfBoundsException') || msg.includes('out of bounds')) {
            return {
                errorSummary: 'Array index out of bounds',
                whatHappened: 'The program attempted to access an array with an invalid index.',
                why: 'Java arrays are 0-indexed; valid indices range from 0 to array.length - 1.',
                location: { line, note: `Array index lookup on line ${line}.` },
                concept: {
                    name: 'ArrayIndexOutOfBoundsException',
                    explanation: 'Accessing an element at an index negative or greater than or equal to the array size throws an exception.',
                },
                hint: this.getHintForArrayIndex(level),
                example: 'for (int i = 0; i < array.length; i++) { ... }',
                learningQuestion: 'What is the highest valid index for an array of size N in Java?',
                nextHintAvailable: level < 3,
            };
        }

        // 4. ClassCastException
        if (exType.includes('ClassCastException') || msg.includes('cannot be cast')) {
            return {
                errorSummary: 'Invalid type cast',
                whatHappened: 'The code attempted to cast an object to a subclass of which it is not an instance.',
                why: 'The runtime type of the object is incompatible with the target type.',
                location: { line, note: `Type cast expression on line ${line}.` },
                concept: {
                    name: 'ClassCastException',
                    explanation: 'Java requires type safety. You cannot cast an object to an unrelated type or incompatible subtype.',
                },
                hint: this.getHintForClassCast(level),
                example: 'if (obj instanceof String) { String s = (String) obj; }',
                learningQuestion: 'How can you verify an object’s actual type before casting it?',
                nextHintAvailable: level < 3,
            };
        }

        // 5. StackOverflowError / Infinite recursion
        if (exType.includes('StackOverflowError') || msg.includes('stackoverflowerror')) {
            return {
                errorSummary: 'Stack overflow (infinite recursion)',
                whatHappened: 'The program exceeded the call stack limit due to repetitive method calls.',
                why: 'A recursive method called itself continuously without meeting a base termination condition.',
                location: { line, note: `Recursive method invocation around line ${line}.` },
                concept: {
                    name: 'StackOverflowError',
                    explanation: 'Each method invocation allocates a stack frame. Without a valid base case, the stack memory is exhausted.',
                },
                hint: this.getHintForRecursion(level),
                example: 'if (n <= 1) return 1; // base case',
                learningQuestion: 'What is the base case in your method that stops the recursion?',
                nextHintAvailable: level < 3,
            };
        }

        // 6. Execution timeout / Infinite loop
        if (exType.includes('TimeoutException') || msg.includes('timed out')) {
            return {
                errorSummary: 'Execution timed out (possible infinite loop)',
                whatHappened: 'The program took longer than 10 seconds to finish executing.',
                why: 'A while or for loop condition may never evaluate to false, causing an infinite loop.',
                location: { line, note: `Check loop statements starting at or near line ${line}.` },
                concept: {
                    name: 'Loop Termination',
                    explanation: 'Every loop must advance its state toward a condition that eventually terminates.',
                },
                hint: this.getHintForTimeout(level),
                example: 'while (counter < max) { counter++; }',
                learningQuestion: 'Does the loop counter or condition change during each iteration?',
                nextHintAvailable: level < 3,
            };
        }

        // 7. Compiler: ';' expected
        if (msg.includes("';' expected") || msg.includes('semicolon')) {
            return {
                errorSummary: 'Missing semicolon',
                whatHappened: "The Java compiler expected a semicolon ';' at the end of the statement.",
                why: 'In Java, statements must terminate with a semicolon.',
                location: { line, note: `End of statement near line ${line}.` },
                concept: {
                    name: 'Statement Syntax',
                    explanation: 'Java statements (variable declarations, assignments, method invocations) must end with a semicolon.',
                },
                hint: this.getHintForSemicolon(level, line),
                example: 'int score = 100;',
                learningQuestion: 'Did you terminate the statement on line ' + line + ' with a semicolon?',
                nextHintAvailable: level < 3,
            };
        }

        // 8. Compiler: cannot find symbol
        if (msg.includes('cannot find symbol') || msg.includes('undefined')) {
            return {
                errorSummary: 'Cannot find symbol',
                whatHappened: 'The compiler does not recognize a variable, method, or class name.',
                why: 'The symbol was not declared in the current scope, was misspelled, or is missing an import.',
                location: { line, note: `Unrecognized symbol on line ${line}.` },
                concept: {
                    name: 'Scope and Declarations',
                    explanation: 'Identifiers in Java must be declared and visible within scope before they can be referenced.',
                },
                hint: this.getHintForCannotFindSymbol(level),
                example: 'int count = 5; System.out.println(count);',
                learningQuestion: 'Check the spelling and capitalization of the symbol. Has it been declared above this line?',
                nextHintAvailable: level < 3,
            };
        }

        // 9. Compiler: incompatible types
        if (msg.includes('incompatible types') || msg.includes('cannot be converted')) {
            return {
                errorSummary: 'Incompatible types',
                whatHappened: 'The code attempts to assign a value of one type to a variable of a different, incompatible type.',
                why: 'Java is strongly typed and prevents automatic conversion between non-assignable types.',
                location: { line, note: `Type assignment on line ${line}.` },
                concept: {
                    name: 'Type Compatibility',
                    explanation: 'Values assigned to variables or passed to methods must match the declared parameter/variable type.',
                },
                hint: this.getHintForIncompatibleTypes(level),
                example: 'int number = Integer.parseInt("42"); // parse string to int',
                learningQuestion: 'What type is the expression producing, and what type does the target variable expect?',
                nextHintAvailable: level < 3,
            };
        }

        // 10. Compiler: missing return statement
        if (msg.includes('missing return statement') || msg.includes('must return a result')) {
            return {
                errorSummary: 'Missing return statement',
                whatHappened: 'A method declared with a non-void return type does not return a value on all execution branches.',
                why: 'Every possible execution path in a non-void method must end with a return statement.',
                location: { line, note: `End of method at line ${line}.` },
                concept: {
                    name: 'Method Return Types',
                    explanation: 'Methods with a return type (such as int or String) must guarantee that a value is returned in every path.',
                },
                hint: this.getHintForMissingReturn(level),
                example: 'return result;',
                learningQuestion: 'Are there any if/else branches where a return statement might be skipped?',
                nextHintAvailable: level < 3,
            };
        }

        // Generic Fallback
        return {
            errorSummary: request.diagnostic.message || 'Java Diagnostic',
            whatHappened: `The Java tool detected an issue on line ${line}: ${request.diagnostic.message}`,
            why: 'The code does not meet Java compile-time or runtime requirements.',
            location: { line, note: `Check line ${line}.` },
            concept: {
                name: request.diagnostic.kind === 'compile' ? 'Java Compiler Rule' : 'Java Runtime Condition',
                explanation: request.diagnostic.message,
            },
            hint: level === 1
                ? `Examine line ${line} carefully.`
                : level === 2
                ? `Check the variables and syntax used around line ${line}.`
                : `Ensure all tokens, types, and logic at line ${line} conform to Java rules.`,
            example: undefined,
            learningQuestion: `How can you adjust the code at line ${line} to satisfy this requirement?`,
            nextHintAvailable: level < 3,
        };
    }

    private getHintForDivisionByZero(level: number): string {
        switch (level) {
            case 1:
                return 'Think about what value is stored in the denominator right before division.';
            case 2:
                return 'Check the divisor variable to see if it can evaluate to zero before the division runs.';
            case 3:
                return 'Add an if-check before the division to ensure the denominator is not zero, or provide a default value.';
            default:
                return 'Do not divide by zero.';
        }
    }

    private getHintForNullPointer(level: number): string {
        switch (level) {
            case 1:
                return 'A variable you are using has not been given an actual object value.';
            case 2:
                return 'Look at the object reference before the dot operator (.) on this line. Is it null?';
            case 3:
                return 'Initialize the variable before using it (e.g. using new or assigning a non-null instance), or check if (var != null).';
            default:
                return 'Ensure objects are initialized before calling methods on them.';
        }
    }

    private getHintForArrayIndex(level: number): string {
        switch (level) {
            case 1:
                return 'Remember that in Java, array indices start at 0, not 1.';
            case 2:
                return 'Check the index value you are using and compare it against the array length.';
            case 3:
                return 'Valid indices are between 0 and array.length - 1. Make sure your index does not reach or exceed array.length.';
            default:
                return 'Keep array indices within valid bounds.';
        }
    }

    private getHintForClassCast(level: number): string {
        switch (level) {
            case 1:
                return 'The type in parentheses does not match what the object actually is.';
            case 2:
                return 'Verify the actual runtime class of the object before casting it.';
            case 3:
                return 'Use the instanceof operator to confirm compatibility before performing an explicit cast.';
            default:
                return 'Only cast objects to compatible types.';
        }
    }

    private getHintForRecursion(level: number): string {
        switch (level) {
            case 1:
                return 'Consider when this recursive method should stop calling itself.';
            case 2:
                return 'Check whether your base condition is reached, or if the parameter is correctly moving closer to the base case.';
            case 3:
                return 'Ensure your base case returns a value before the recursive step, and verify the arguments decrease or increase properly.';
            default:
                return 'Add a reachable base case.';
        }
    }

    private getHintForTimeout(level: number): string {
        switch (level) {
            case 1:
                return 'The program is stuck in a loop that never ends.';
            case 2:
                return 'Look at your loop condition and check which variable controls it.';
            case 3:
                return 'Verify that the loop variable updates on every single iteration so the condition eventually becomes false.';
            default:
                return 'Ensure loop conditions terminate.';
        }
    }

    private getHintForSemicolon(level: number, line: number): string {
        switch (level) {
            case 1:
                return 'Every statement in Java must end with a specific punctuation mark.';
            case 2:
                return `Look closely at the end of line ${line} (or the line right above it).`;
            case 3:
                return `Add a semicolon ';' at the end of the statement on line ${line}.`;
            default:
                return "Add ';' at the end of the statement.";
        }
    }

    private getHintForCannotFindSymbol(level: number): string {
        switch (level) {
            case 1:
                return 'The compiler does not recognize the name you wrote.';
            case 2:
                return 'Check for typos or case-sensitivity differences (e.g. System vs system).';
            case 3:
                return 'Declare the variable with its type, or import the required class at the top of the file.';
            default:
                return 'Declare or import the symbol.';
        }
    }

    private getHintForIncompatibleTypes(level: number): string {
        switch (level) {
            case 1:
                return 'The type on the right-hand side does not match what the variable on the left expects.';
            case 2:
                return 'Check whether you are assigning a String to a number, or a double to an int.';
            case 3:
                return 'Convert the value (e.g., using Integer.parseInt or explicit casting) or change the variable type.';
            default:
                return 'Match variable types correctly.';
        }
    }

    private getHintForMissingReturn(level: number): string {
        switch (level) {
            case 1:
                return 'This method promised to return a value, but might finish without returning anything.';
            case 2:
                return 'Check the method header for its return type, and make sure every branch returns a value.';
            case 3:
                return 'Add a return statement at the end of the method or inside all conditional branches.';
            default:
                return 'Add a return statement.';
        }
    }
}

export const fallbackProvider = new FallbackProvider();
