# AGENTS.md

## Purpose
This repository uses GitHub Copilot Agents (and other AI assistants) to generate, refactor, and maintain code.  
All code contributions **must include or update unit tests** to ensure reliability and maintainability.

---

## Agent Guidelines

### 1. Unit Test Requirements
- **Every new feature, function, or method** must include corresponding **unit tests**.
- **Bug fixes** must include regression tests that fail before the fix and pass after it.
- When modifying existing logic, update related tests accordingly.
- All tests must:
  - Be **automated** and runnable via the project's testing framework.
  - Include **assertions** for all expected behaviors and edge cases.
  - Maintain a minimum **80% coverage threshold**, unless otherwise documented.

### 2. Test Frameworks
- **Primary Framework:**  `go test` (Go) / `vitest` (JavaScript)  
  *(Choose the one relevant to your tech stack; adjust as needed.)*
- For the Go backend:
  - Place tests in `_test.go` files.
  - Use `testing` package conventions.
  - Ensure tests run with `go test ./...`.
- For the React frontend:
  - Use `jest` and `react-testing-library`.
  - Snapshot tests are acceptable for simple components but should include logic coverage.

### 3. File & Directory Conventions
- Tests should be placed in the same directory as the code they test, or in a `/tests` subdirectory.
- Use clear naming:
  - Go: `filename_test.go`
  - React: `ComponentName.test.tsx`
- Each test suite should have descriptive test names using the format:

### 4. Agent Behavior
When generating or modifying code:
1. **Create or update unit tests** automatically.
2. **Explain** the test strategy in code comments (optional but encouraged).
3. **Verify** tests compile and follow naming conventions.
4. **Avoid** generating tests that only check trivial things (e.g., “should be defined”).
5. **Run or simulate** tests to ensure validity before committing (if possible).

Before completing a task, the agent must confirm:

1. Tests were created or updated.
2. Tests cover edge cases and failure modes.
3. Tests are syntactically valid and runnable.
4. Test files follow naming and structure conventions.
5. Code passes all tests before marking the task complete.
