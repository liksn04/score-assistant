# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
  tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## UI Feedback Policy

### Toast Notification Policy

This project uses a centralized toast system in `src/context/ToastContext.tsx`.

#### 이번 반영(8727f5c) 기준

- `심사(심사위원)` 화면에서 잦고 즉시 반영되는 액션은 성공 토스트를 억제했습니다.
- 실패/차단 케이스는 기존처럼 토스트로 알립니다.

현재 정책 적용 위치: `src/hooks/useJudgeActions.ts`

#### 성공 토스트를 표시하지 않는 액션

- 점수 저장
  - 단순 총점(`updateSimpleScore`)
  - 세부 항목 점수(`updateDetailScore`)
- 코멘트 저장/삭제 (`addComment`, `deleteComment`)
- 스트라이크 표시 변경 (`updateItemStrikes`)
- 곡명 저장 (`updateSongTitle`)
- 팀 삭제 (`deleteCandidate`)
- 완료 상태 토글 (`toggleCompletion`)
- 팀 등록 (`addCandidate`)

#### 성공 토스트를 그대로 유지하는 액션

- 오디션 생성/설정/이름 변경/확정/복원 등 관리자·설정 화면 흐름
  - 예: `src/App.tsx`, `src/components/admin/*`
- 사용자 입력 유효성 실패 (중복, 범위 초과, 필수 값 누락)
- 네트워크/영속화 실패 등 에러

#### 구현 방식

- `runMutation` 헬퍼는 `MutationFeedbackMode`를 받아 토스트 동작을 제어합니다.
- 기본 모드는 `silent`로 동작해 불필요한 성공 토스트를 막고,
- 필요할 때만 `toast` 모드를 사용해 시작/성공/실패 피드백을 표시합니다.

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
