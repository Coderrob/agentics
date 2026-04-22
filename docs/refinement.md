# Refinement Process

1. Compile and execute workflow via GitHub AW CLI
2. Capture run id and download artifacts into `refinements/{run_id}`
3. Extract `prompt.txt`, `conversation.txt`, `usage.json`
4. Analyze conversation for redundant reasoning and excessive tool calls
5. Generate actionable TODO tasks with technical specs and validation criteria
