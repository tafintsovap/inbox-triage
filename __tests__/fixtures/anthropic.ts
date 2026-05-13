interface MockAnthropicResponse {
  content: Array<{ type: 'text'; text: string }>
}

export function makeTextResponse(text: string): MockAnthropicResponse {
  return { content: [{ type: 'text', text }] }
}

export function makeClassifierResponse(
  results: Array<{ id: string; category: string; reasoning: string }>
): MockAnthropicResponse {
  return makeTextResponse(JSON.stringify(results))
}
