# Hướng dẫn sử dụng ClaudeKit (Engineer Kit)

ClaudeKit biến Claude Code thành một hệ thống multi-agent có tổ chức, với hooks tự động, 14 agent chuyên biệt, 80+ skills, và workflow rõ ràng.

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Skills (Slash Commands)](#2-skills-slash-commands)
3. [Agents](#3-agents)
4. [Hooks](#4-hooks)
5. [Coding Level](#5-coding-level)
6. [Cấu hình (.ck.json)](#6-cấu-hình)
7. [Workflow chính](#7-workflow-chính)
8. [Plan & Report](#8-plan--report)
9. [Environment Variables](#9-environment-variables)
10. [Tips & Best Practices](#10-tips--best-practices)

---

## 1. Tổng quan

ClaudeKit Engineer Kit cung cấp:

- **80+ Skills** — Các lệnh `/command` để thực hiện tác vụ cụ thể
- **14 Agents** — Các agent chuyên biệt (planner, developer, tester, reviewer...)
- **12 Hooks** — Tự động hóa tại các lifecycle events
- **6 Coding Levels** — Điều chỉnh mức độ giải thích (từ ELI5 đến God mode)
- **Plan System** — Quản lý kế hoạch triển khai có cấu trúc
- **Team Coordination** — Điều phối nhiều agent song song

---

## 2. Skills (Slash Commands)

Gõ `/tên-skill` trong Claude Code để kích hoạt. Dưới đây là các skill quan trọng nhất:

### 2.1. Skills bắt buộc (Mandatory)

| Lệnh | Mô tả |
|-------|--------|
| `/cook` | **BẮT BUỘC** trước khi implement bất kỳ feature/plan/fix nào |
| `/fix` | **BẮT BUỘC** trước khi sửa bất kỳ bug/error nào |

### 2.2. Planning & Research

| Lệnh | Mô tả |
|-------|--------|
| `/plan` | Lập kế hoạch triển khai chi tiết với phases |
| `/plan --fast` | Lập kế hoạch nhanh, ít chi tiết hơn |
| `/plan --hard` | Lập kế hoạch kỹ lưỡng, nhiều phân tích |
| `/research [topic]` | Nghiên cứu sâu về công nghệ/giải pháp (hỗ trợ Gemini) |
| `/brainstorm [topic]` | Brainstorm ý tưởng với phân tích trade-offs |
| `/ask [question]` | Tư vấn kỹ thuật & kiến trúc chuyên sâu |
| `/sequential-thinking` | Phân tích từng bước với khả năng revision |

### 2.3. Development

| Lệnh | Mô tả |
|-------|--------|
| `/code-review` | Review chất lượng code (security, performance, edge cases) |
| `/simplify` | Tối ưu & đơn giản hóa code đã viết |
| `/test` | Viết & chạy tests (unit, integration, e2e) |
| `/debug` | Debug có hệ thống với root cause analysis |
| `/scout` | Khám phá codebase nhanh với parallel agents |
| `/preview [path]` | Xem file/directory hoặc tạo diagram giải thích |
| `/preview --explain` | Giải thích code bằng diagram |
| `/preview --diagram` | Tạo diagram cho kiến trúc hệ thống |

### 2.4. Git Operations

| Lệnh | Mô tả |
|-------|--------|
| `/git cm` | Commit với conventional commit format |
| `/git cp` | Tạo Pull Request |
| `/git pr` | Quản lý Pull Request |
| `/git merge` | Merge operations |
| `/worktree` | Tạo git worktree isolated cho development song song |

### 2.5. Documentation

| Lệnh | Mô tả |
|-------|--------|
| `/docs` | Phân tích codebase & quản lý documentation |
| `/docs-seeker [library]` | Tìm documentation mới nhất của library/framework |
| `/journal` | Ghi journal entry (failures, lessons learned) |
| `/watzup` | Review changes & tổng kết session |

### 2.6. Project Management

| Lệnh | Mô tả |
|-------|--------|
| `/project-management` | Theo dõi tiến độ, tạo reports |
| `/plans-kanban` | Xem dashboard plans với progress tracking |
| `/kanban` | Board quản lý tasks |
| `/team` | Điều phối Agent Teams cho collaboration song song |

### 2.7. Document Processing

| Lệnh | Mô tả |
|-------|--------|
| `/docx` | Tạo/chỉnh sửa file Word (.docx) |
| `/pdf` | Xử lý PDF, trích xuất text/table |
| `/pptx` | Tạo/chỉnh sửa PowerPoint (.pptx) |
| `/xlsx` | Xử lý spreadsheet (.xlsx, .csv) |

### 2.8. Frontend & Design

| Lệnh | Mô tả |
|-------|--------|
| `/frontend-design` | Tạo UI từ designs/screenshots |
| `/frontend-development` | React/TypeScript với modern patterns |
| `/ui-styling` | shadcn/ui + Tailwind CSS components |
| `/ui-ux-pro-max` | Thiết kế UI/UX chuyên sâu (50 styles, 21 palettes) |
| `/web-design-guidelines` | Review compliance với Web Interface Guidelines |
| `/threejs` | Ứng dụng 3D với Three.js/WebGL |

### 2.9. Backend & Infrastructure

| Lệnh | Mô tả |
|-------|--------|
| `/backend-development` | Node.js/Python/Go frameworks |
| `/databases` | MongoDB/PostgreSQL operations |
| `/devops` | Docker, Cloudflare, GCP, Kubernetes |
| `/payment-integration` | Stripe, Paddle, SePay (VietQR) |

### 2.10. AI & Automation

| Lệnh | Mô tả |
|-------|--------|
| `/ai-multimodal` | Vision/audio/video analysis với Gemini |
| `/ai-artist` | Tạo hình ảnh AI |
| `/agent-browser` | Browser automation |
| `/chrome-devtools` | Puppeteer automation |
| `/mcp-management` | Quản lý MCP servers |
| `/mcp-builder` | Xây dựng MCP servers |

### 2.11. Utility

| Lệnh | Mô tả |
|-------|--------|
| `/coding-level [0-5]` | Đặt mức độ giải thích code |
| `/context-engineering` | Tối ưu context/token usage |
| `/find-skills` | Tìm & cài skill mới |
| `/skill-creator` | Tạo skill tùy chỉnh |
| `/bootstrap` | Khởi tạo project mới |
| `/repomix` | Đóng gói repo thành file AI-friendly |
| `/ck-help` | Hướng dẫn sử dụng ClaudeKit |
| `/problem-solving` | Kỹ thuật giải quyết vấn đề có hệ thống |

---

## 3. Agents

Agents là các subprocesses chuyên biệt được Claude Code tự động sử dụng khi cần. Bạn không gọi trực tiếp — chúng được kích hoạt qua workflow hoặc skills.

### 3.1. Bảng tổng hợp Agents

| Agent | Vai trò | Model |
|-------|---------|-------|
| **planner** | Lập kế hoạch triển khai với phases chi tiết | Opus |
| **fullstack-developer** | Implement code (backend + frontend) song song | Sonnet |
| **code-simplifier** | Tối ưu & đơn giản hóa code | Opus |
| **tester** | Viết & chạy tests, coverage analysis | — |
| **code-reviewer** | Review quality, security, performance | — |
| **debugger** | Debug với root cause analysis | Sonnet |
| **researcher** | Nghiên cứu công nghệ & giải pháp | — |
| **brainstormer** | Brainstorm kiến trúc & trade-off analysis | — |
| **git-manager** | Git operations (commit, push, PR) | Haiku |
| **docs-manager** | Quản lý documentation | Haiku |
| **project-manager** | Theo dõi tiến độ, coordination | Haiku |
| **ui-ux-designer** | Thiết kế UI/UX | — |
| **journal-writer** | Ghi chép failures & lessons learned | Haiku |
| **mcp-manager** | Quản lý MCP server operations | Haiku |

### 3.2. Chuỗi Agent điển hình

```
Planner → Developer → Simplifier → Tester → Code Reviewer → Git Manager
```

1. **Planner** tạo plan chi tiết
2. **Developer** implement theo plan (có thể chạy song song nhiều developer)
3. **Simplifier** tối ưu code đã viết
4. **Tester** viết & chạy tests
5. **Code Reviewer** review chất lượng cuối cùng
6. **Git Manager** commit & push

### 3.3. File Ownership (Team Mode)

Khi nhiều agent chạy song song, mỗi agent sở hữu các file riêng biệt — **không được phép edit file của agent khác**. Nếu xung đột xảy ra, sẽ escalate lên lead agent.

---

## 4. Hooks

Hooks là các script tự động chạy tại các thời điểm cụ thể trong lifecycle của session.

### 4.1. Lifecycle Hooks

| Thời điểm | Hook | Chức năng |
|------------|------|-----------|
| **SessionStart** | `session-init` | Inject thông tin môi trường (datetime, OS, resources) |
| **SubagentStart** | `subagent-init` | Cấu hình context cho subagent |
| | `team-context-inject` | Inject thông tin team coordination |
| **SubagentStop** | `cook-after-plan-reminder` | Nhắc chạy `/cook` sau khi plan xong |
| **UserPromptSubmit** | `dev-rules-reminder` | Nhắc tuân thủ development rules |
| | `usage-context-awareness` | Theo dõi CPU/RAM, cảnh báo tài nguyên |
| **PreToolUse** | `descriptive-name` | Kiểm tra tên file mới có ý nghĩa |
| | `scout-block` | Chặn scout truy cập ngoài phạm vi |
| | `privacy-block` | Chặn truy cập file nhạy cảm (.env, credentials) |
| **PostToolUse** | `post-edit-simplify-reminder` | Nhắc chạy `/simplify` sau edit |
| **TaskCompleted** | `task-completed-handler` | Xử lý khi task hoàn thành |
| **TeammateIdle** | `teammate-idle-handler` | Phát hiện teammate không hoạt động |

### 4.2. Cách hooks hoạt động

- Hooks chạy **tự động** — bạn không cần can thiệp
- `privacy-block` sẽ **chặn** Claude đọc `.env`, credentials, secrets
- `dev-rules-reminder` đảm bảo mọi response tuân thủ development rules
- `usage-context-awareness` cảnh báo nếu hệ thống sắp hết RAM/CPU

---

## 5. Coding Level

Hệ thống 6 cấp độ điều chỉnh cách Claude giao tiếp:

| Level | Tên | Đối tượng | Phong cách |
|-------|-----|-----------|------------|
| **0** | ELI5 | Người mới hoàn toàn | Giải thích bằng ví dụ thực tế, spell out mọi acronym |
| **1** | Junior | Junior developer | Giải thích chi tiết, có code examples |
| **2** | Mid | Mid-level developer | Giải thích vừa phải, focus vào patterns |
| **3** | Senior | Senior developer | Ngắn gọn, focus vào decisions & trade-offs |
| **4** | Lead | Tech lead | Terse, focus vào architecture |
| **5** | God | 15+ năm kinh nghiệm | Code only, zero explanation trừ khi hỏi |

**Cách đặt:**
```
/coding-level 3
```

**Hoặc cấu hình trong `.claude/.ck.json`:**
```json
{
  "codingLevel": 3
}
```

Đặt `-1` để auto-detect dựa trên ngữ cảnh.

---

## 6. Cấu hình

File cấu hình chính: `.claude/.ck.json`

### 6.1. Các setting quan trọng

```json
{
  "codingLevel": -1,        // -1 = auto, 0-5 = manual
  "statusline": "minimal",  // Hiển thị status line
  "privacyBlock": true,     // Chặn đọc file nhạy cảm

  "docs": {
    "maxLoc": 800            // Giới hạn dòng cho doc files
  },

  "plan": {
    "namingFormat": "{date}-{issue}-{slug}",
    "dateFormat": "YYMMDD-HHmm",
    "reportsDir": "reports",
    "validation": {
      "mode": "prompt",      // "prompt" = hỏi xác nhận
      "minQuestions": 3,
      "maxQuestions": 8
    }
  },

  "paths": {
    "docs": "docs",          // Thư mục documentation
    "plans": "plans"         // Thư mục plans
  },

  "locale": {
    "thinkingLanguage": null,   // null = English
    "responseLanguage": null    // null = English
  },

  "gemini": {
    "model": "gemini-3-flash-preview"  // Model cho research skills
  },

  "skills": {
    "research": {
      "useGemini": true       // Dùng Gemini cho research
    }
  }
}
```

### 6.2. Locale (Ngôn ngữ)

Để Claude suy nghĩ và trả lời bằng tiếng Việt:
```json
{
  "locale": {
    "thinkingLanguage": "vi",
    "responseLanguage": "vi"
  }
}
```

---

## 7. Workflow chính

### 7.1. Implement feature mới

```
Bước 1: /plan [mô tả feature]
  → Planner tạo plan chi tiết với phases

Bước 2: /cook
  → Kích hoạt implementation theo plan
  → Developer agents thực thi

Bước 3: /simplify
  → Tối ưu code đã viết

Bước 4: /test
  → Viết & chạy tests

Bước 5: /code-review
  → Review chất lượng cuối cùng

Bước 6: /git cm
  → Commit với conventional commit
```

### 7.2. Fix bug

```
Bước 1: /fix [mô tả bug]
  → Debugger phân tích root cause

Bước 2: /test
  → Validate fix với tests

Bước 3: /git cm
  → Commit fix
```

### 7.3. Research trước khi code

```
Bước 1: /research [topic]
  → Nghiên cứu giải pháp

Bước 2: /brainstorm [options]
  → So sánh các phương án

Bước 3: /plan
  → Lập kế hoạch triển khai
```

### 7.4. Kết thúc session

```
/watzup
  → Review tất cả changes trong session
  → Tổng kết công việc đã làm
```

---

## 8. Plan & Report

### 8.1. Cấu trúc thư mục

```
project/
├── plans/
│   ├── 260305-1047-feature-name/    ← Thư mục plan
│   │   ├── plan.md                   ← Plan overview
│   │   ├── phase-1-backend.md        ← Chi tiết phase 1
│   │   ├── phase-2-frontend.md       ← Chi tiết phase 2
│   │   └── ...
│   └── reports/
│       ├── explore-260305-1047-codebase.md    ← Report khám phá
│       ├── tester-260305-1050-unit-tests.md   ← Report test
│       └── ...
└── docs/
    ├── project-overview-pdr.md
    ├── system-architecture.md
    ├── code-standards.md
    └── development-roadmap.md
```

### 8.2. Plan file format

```markdown
---
title: Feature Name
description: Brief description
status: draft | in-progress | completed
priority: high | medium | low
effort: S | M | L | XL
branch: feature/branch-name
tags: [frontend, api]
---

## Context
...

## Requirements
...

## Architecture
...

## Implementation Phases
...

## Success Criteria
...
```

### 8.3. Report naming convention

```
{type}-{YYMMDD}-{HHmm}-{slug}.md

Ví dụ:
  explore-260305-1047-codebase-analysis.md
  tester-260305-1100-unit-test-results.md
  debugger-260305-1430-api-error-investigation.md
```

---

## 9. Environment Variables

File: `.claude/.env`

### 9.1. Thứ tự ưu tiên (cao → thấp)

1. `process.env` (runtime)
2. `.claude/skills/<skill>/.env` (skill-specific)
3. `.claude/skills/.env` (shared across skills)
4. `.claude/.env` (global defaults)

### 9.2. Các biến quan trọng

| Biến | Mô tả | Cách lấy |
|------|--------|----------|
| `GEMINI_API_KEY` | API key cho Google Gemini (research, vision) | [aistudio.google.com](https://aistudio.google.com) |
| `CLAUDEKIT_API_KEY` | ClaudeKit services (VidCap, ReviewWeb) | [claudekit.cc/api-keys](https://claudekit.cc/api-keys) |
| `CONTEXT7_API_KEY` | Context7 integration | [context7.com](https://context7.com) |
| `DISCORD_WEBHOOK_URL` | Notifications qua Discord | Discord Server Settings → Webhooks |
| `TELEGRAM_BOT_TOKEN` | Notifications qua Telegram | @BotFather trên Telegram |
| `TELEGRAM_CHAT_ID` | Chat ID cho Telegram | Telegram API |

### 9.3. Debug env

```bash
python ~/.claude/scripts/resolve_env.py --show-hierarchy
```

---

## 10. Tips & Best Practices

### 10.1. Tiết kiệm token

- Dùng `/scout` thay vì tự tìm file thủ công
- Dùng `/docs-seeker [library]` thay vì search web cho documentation
- Đặt `codingLevel: 5` nếu không cần giải thích chi tiết
- Dùng `/context-engineering` khi context window gần đầy

### 10.2. Chất lượng code

- Luôn chạy `/simplify` sau khi implement xong
- Luôn chạy `/test` trước khi commit
- Dùng `/code-review` cho code quan trọng
- Follow YAGNI - KISS - DRY principles

### 10.3. Git workflow

- Dùng `/git cm` để commit với conventional format tự động
- Dùng `/git cp` để tạo PR với description tự động
- Dùng `/worktree` khi cần develop song song trên branch khác

### 10.4. Khi bị stuck

- `/debug [vấn đề]` — Debug có hệ thống
- `/ask [câu hỏi]` — Hỏi tư vấn kỹ thuật
- `/sequential-thinking` — Phân tích từng bước
- `/problem-solving` — Áp dụng framework giải quyết vấn đề

### 10.5. Khám phá thêm

- `/ck-help` — Xem hướng dẫn ClaudeKit trong Claude Code
- `/find-skills` — Tìm skills mới cho tác vụ chưa biết
- `/skill-creator` — Tạo skill tùy chỉnh cho workflow riêng

---

> **Ghi chú:** Tài liệu này dựa trên ClaudeKit Engineer Kit đã cài đặt tại project. Một số skills có thể yêu cầu cấu hình thêm (API keys, dependencies). Chạy `/ck-help` để xem thông tin mới nhất.
