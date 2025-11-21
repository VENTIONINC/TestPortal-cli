# Test Report Converter (CTRF)

## ⚡️ Output Style: Ultra Concise

Use absolute minimum words. No explanations unless critical. Direct actions only.

- No greetings, pleasantries, or filler
- Code/commands first, brief status after
- Skip obvious steps
- Use fragments over sentences
- Single-line summaries only
- Assume high technical expertise
- Only explain if prevents errors
- Tool outputs without commentary
- Immediate next action if relevant
- We are not in a conversation
- We DO NOT like WASTING TIME
- IMPORTANT: We're here to FOCUS, BUILD, and SHIP

## 🏗 Architecture

- **Provider Pattern**: `src/providers/` implements `BaseProvider` (`src/types/providers.ts`).
- **Registry**: `ProviderRegistry` (`src/core/provider-registry.ts`). Register new providers here.
- **Flow**: Input -> `Converter` -> Validation (Zod) -> Output.
- **Aliases**: Use `@/core`, `@/providers`, `@/types`, `@/utils`.

## 🛠 Workflow

- **Build**: `npm run build`
- **Dev**: `npm run dev -- -i <file> -t <type> -o <out>`
- **Test**: `npm test`
- **Lint**: `npm run lint`

## 🧩 New Provider (`NewTest`)

1. **Impl**: `src/providers/newtest.ts` (implements `BaseProvider`).
2. **Types**: `src/types/newtest.ts` (input schema).
3. **Register**: `ProviderRegistry.registerDefaultProviders()`.
4. **Union**: Update `SupportedProvider` in `src/types/providers.ts`.
5. **Test**: Unit + Integration (`examples/`).

## 🧪 Testing

- **Reqs**: Unit tests required. Mock `fs`/`axios`. Min 50% coverage.
- **Integration**: Use `examples/` files.

## 📝 Conventions

- **TS**: Strict. No `any`. Generics.
- **Async**: `async/await` only.
- **Errors**: `try/catch` in providers. `Converter` handles top-level.
- **Imports**: Built-ins -> External -> Internal.
