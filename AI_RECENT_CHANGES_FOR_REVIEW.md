# JEDDSpace AI Assistant Review Summary

This note summarizes the recent AI-related changes so another ChatGPT session can review the current state quickly.

## What Has Been Done
- Connected the app to a local Ollama endpoint through `web/src/services/aiService.js`.
- Added an AI assistant page at `web/src/pages/aiAssistantPage.jsx`.
- Confirmed the current AI page works as a simple prompt-and-response flow.

## Current AI Architecture
- `aiService.js` sends prompts to Ollama using `POST /api/generate`.
- `AiAssistantPage.jsx` currently holds a single prompt textarea, a send button, a loading flag, and one response string.
- The router does not yet expose a dedicated `/ai` route in `web/src/routes/AppRoutes.jsx`.
- `web/src/components/chatInput.jsx` exists but is still empty.
- There is no reusable AI component tree yet under `web/src/components/ai/`.

## Recommended Next Structure
- `web/src/pages/AiAssistantPage.jsx`
- `web/src/components/ai/ChatWindow.jsx`
- `web/src/components/ai/ChatMessage.jsx`
- `web/src/components/ai/ChatInput.jsx`
- `web/src/components/ai/SuggestedPrompts.jsx`
- `web/src/services/aiPromptBuilder.js`
- `web/src/services/aiSummaryService.js`

## Behavioral Direction
- Replace the single-response model with a message list using `messages` state.
- Build prompts from real JEDDSpace data before sending to Ollama.
- Prefer readable context text over raw JSON.
- Add quick-action prompts for common HR tasks.
- Add summarization flows that can write to `ai_summarization`.

## Data Sources To Use
- Employees from `employeeService.getFieldWorkers()`.
- Jobs from `jobService.getAll()`.
- Leave data from `leaveform` queries or a future leave service helper.
- Contracts from `contractService.getAllContracts()`.
- Notifications from `notificationService.getNotifications()`.

## Key Review Questions
- Should the AI assistant remain a single page with subcomponents, or become a more general assistant layout?
- Which queries should be supported first: availability, job summaries, leave summaries, contract summaries, or notification summaries?
- Should prompt building be intent-based so only the needed tables are fetched per question?
- Should summaries be stored automatically in `ai_summarization`, or only on user request?

## Current Assessment
- The foundation is in place, but the assistant is still generic.
- The next step is to turn it into a JEDDSpace-specific assistant that can reason over HR and operations data.
- The most important improvements are prompt building, message-based UI, and summary storage.
